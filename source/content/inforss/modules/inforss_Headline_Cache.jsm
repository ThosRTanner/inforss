/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is infoRSS.
 *
 * The Initial Developer of the Original Code is
 *   Didier Ernotte <didier@ernotte.com>.
 * Portions created by the Initial Developer are Copyright (C) 2004
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Didier Ernotte <didier@ernotte.com>.
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */
//------------------------------------------------------------------------------
// inforss_Headline_Cache
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------

/* jshint globalstrict: true */
"use strict";

/* exported EXPORTED_SYMBOLS */
var EXPORTED_SYMBOLS = [
    "Headline_Cache", /* exported Headline_Cache */
];

const inforss = {};
Components.utils.import("chrome://inforss/content/modules/inforss_Debug.jsm",
                        inforss);

Components.utils.import("chrome://inforss/content/modules/inforss_Version.jsm",
                        inforss);

Components.utils.import("chrome://inforss/content/modules/inforss_Utils.jsm",
                        inforss);

Components.utils.import("chrome://inforss/content/modules/inforss_Timeout.jsm",
                        inforss);

const FileInputStream = Components.Constructor("@mozilla.org/network/file-input-stream;1",
  "nsIFileInputStream",
  "init");

const ScriptableInputStream = Components.Constructor("@mozilla.org/scriptableinputstream;1",
  "nsIScriptableInputStream",
  "init");

const UTF8Converter = Components.Constructor("@mozilla.org/intl/utf8converterservice;1",
  "nsIUTF8ConverterService");

const FileOutputStream = Components.Constructor("@mozilla.org/network/file-output-stream;1",
  "nsIFileOutputStream",
  "init");

const INFORSS_RDF_REPOSITORY = "inforss.rdf";
const INFORSS_DEFAULT_RDF_REPOSITORY = "inforss_rdf.default";

const IoService = Components.classes[
  "@mozilla.org/network/io-service;1"].getService(
  Components.interfaces.nsIIOService);

const HistoryService = Components.classes[
  "@mozilla.org/browser/nav-history-service;1"].getService(
  Components.interfaces.nsINavHistoryService);

const RdfService = Components.classes[
  "@mozilla.org/rdf/rdf-service;1"].getService(
  Components.interfaces.nsIRDFService);

const rdf_base_url = "http://inforss.mozdev.org/rdf/inforss/";

/////////////FIXME
//This seems generally excessive. The rdf 'about' is meant to be an href and the
//# part is for identifying a sub document. But if we pass in the guid then
//shouldn't it be sufficiently unique?
//This means that the feed handler should use the generated guid which
//should use the method here (except it should just properly escape the guid
//if necessary)

function titleConv(title)
{
  let str2 = null;
  try
  {
    //This is what window.escape does.
    const dont_escape =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@*_+-./";
    str2 = "";
    for (let i = 0; i < title.length; ++i)
    {

      const c = title.charCodeAt(i);
      if (c > 256)
      {
        str2 += "%u" + ("000" + c.toString(16).toUpperCase()).slice(-4);
      }
      else
      {
        const c2 = title.charAt(i);
        if (dont_escape.indexOf(c2) == -1)
        {
          str2 += "%" + ("0" + c.toString(16).toUpperCase()).slice(-2);
        }
        else
        {
          str2 += c2;
        }
      }
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
  return str2;
}

function create_rdf_subject(url, title)
{
  //See fixme above. The title actually isn't munged correctly anyway.
  return url + '#' + titleConv(title);
}

// Reset the repository to the null state
function reset_repository()
{
  try
  {
    let file = Headline_Cache.get_filepath();
    if (file.exists())
    {
      file.remove(false);
    }
    let source = inforss.get_resource_file(INFORSS_DEFAULT_RDF_REPOSITORY);
    if (source.exists())
    {
      source.copyTo(inforss.get_profile_dir(), INFORSS_RDF_REPOSITORY);
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
}

function Headline_Cache(config)
{
  this._config = config;
  this._datasource = null;
  this._purged = false;
  this._flush_timeout = null;
  return this;
}

Object.assign(Headline_Cache.prototype, {
  //-------------------------------------------------------------------------------------------------------------
  init()
  {
    try
    {
      const file = Headline_Cache.get_filepath();
      if (! file.exists())
      {
        reset_repository();
      }

      var uri = IoService.newFileURI(file);
      this._datasource = RdfService.GetDataSourceBlocking(uri.spec);

      //This is required to set up the datasource...
      this._datasource.QueryInterface(Components.interfaces.nsIRDFRemoteDataSource);

      this._purge_after(10000);
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
  },
 //-------------------------------------------------------------------------------------------------------------
  exists(url, title, checkHistory, feedUrl)
  {
    let find = false;
    let findLocalHistory = false;
    try
    {
      //See if we have in our local cache
      let subject = RdfService.GetResource(create_rdf_subject(url, title));
      const predicate = RdfService.GetResource(rdf_base_url + "receivedDate");
      if (this._datasource.hasArcOut(subject, predicate))
      {
        //We do
        find = true;
        //update when we last tried to find it. This means the feed is still
        //supplying it.
        this.setAttribute(url, title, "lastSuppliedDate", new Date());
      }

      //Also see if it is in local history
      if (url.indexOf("http") == 0 && checkHistory)
      {
        const query = HistoryService.getNewQuery();
        query.uri = inforss.make_URI(url);
        const result = HistoryService.executeQuery(
          query,
          HistoryService.getNewQueryOptions());
        result.root.containerOpen = true;
        if (result.root.childCount != 0)
        {
          //It is. So store it in our cache
          findLocalHistory = true;
          const date = new Date(result.root.getChild(0).time / 1000);
          if (!find)
          {
            this.createNewRDFEntry(url, title, date, feedUrl);
          }
          if (this.getAttribute(url, title, "viewed") == "false")
          {
            this.setAttribute(url, title, "readDate", date);
            this.setAttribute(url, title, "viewed", "true");
          }
        }
        //Required to do this as it only stops collecting results when GC
        //kicks in.
        result.root.containerOpen = false;
      }
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    return find || findLocalHistory;
  },

  //-------------------------------------------------------------------------------------------------------------
  createNewRDFEntry(url, title, receivedDate, feedUrl)
  {
    try
    {
      const subject = RdfService.GetResource(create_rdf_subject(url, title));

      let predicate = RdfService.GetResource(rdf_base_url + "receivedDate");
      let date = RdfService.GetLiteral(receivedDate);
      let status = this._datasource.Assert(subject, predicate, date, true);

      predicate = RdfService.GetResource(rdf_base_url + "readDate");
      date = RdfService.GetLiteral("");
      status = this._datasource.Assert(subject, predicate, date, true);

      predicate = RdfService.GetResource(rdf_base_url + "viewed");
      let viewed = RdfService.GetLiteral("false");
      status = this._datasource.Assert(subject, predicate, viewed, true);

      predicate = RdfService.GetResource(rdf_base_url + "banned");
      let banned = RdfService.GetLiteral("false");
      status = this._datasource.Assert(subject, predicate, banned, true);

      predicate = RdfService.GetResource(rdf_base_url + "savedPodcast");
      let saved = RdfService.GetLiteral("false");
      status = this._datasource.Assert(subject, predicate, saved, true);

      predicate = RdfService.GetResource(rdf_base_url + "feedUrl");
      let feedUrlLitteral = RdfService.GetLiteral(feedUrl);
      status = this._datasource.Assert(subject, predicate, feedUrlLitteral, true);

      predicate = RdfService.GetResource(rdf_base_url + "lastSuppliedDate");
      date = RdfService.GetLiteral(new Date());
      status = this._datasource.Assert(subject, predicate, date, true);

      this.flush();
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
  },

  //----------------------------------------------------------------------------
  //Flush to disc. Because this can take a long time, we actually run it async
  //after a second
  //FIXME It is not clear why we do this on read ends.
  flush()
  {
    if (this._flush_timeout == null)
    {
      this._flush_timeout =
        inforss.setTimeout(this._real_flush.bind(this), 1000);
    }
  },

  //----------------------------------------------------------------------------
  //The actual flush
  _real_flush()
  {
    this._flush_timeout = null;
    try
    {
      this._datasource.Flush();
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
  },

  //-------------------------------------------------------------------------------------------------------------
  getAttribute(url, title, attribute)
  {
    var value = null;
    try
    {
      var subject = RdfService.GetResource(create_rdf_subject(url, title));
      var predicate = RdfService.GetResource(rdf_base_url + attribute);
      if (this._datasource.hasArcOut(subject, predicate))
      {
        value = this._datasource.GetTarget(subject, predicate, true).
          QueryInterface(Components.interfaces.nsIRDFLiteral).Value;
      }
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    return value;
  },

  //-------------------------------------------------------------------------------------------------------------
  setAttribute(url, title, attribute, value)
  {
    try
    {
      var subject = RdfService.GetResource(create_rdf_subject(url, title));
      var predicate = RdfService.GetResource(rdf_base_url + attribute);
      var newValue = RdfService.GetLiteral(value);
      if (this._datasource.hasArcOut(subject, predicate))
      {
        var oldValue = this._datasource.GetTarget(subject, predicate, true);
        this._datasource.Change(subject, predicate, oldValue, newValue);
      }
      else
      {
        this._datasource.Assert(subject, predicate, newValue, true);
      }
      this.flush();
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
  },
  //-------------------------------------------------------------------------------------------------------------
  clear()
  {
    try
    {
      reset_repository();
      this.init();
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
  },


  //----------------------------------------------------------------------------
  _purge_after(time)
  {
    inforss.setTimeout(this._purge.bind(this), time);
  },

  //----------------------------------------------------------------------------
  //Purges old headlines from the RDF file
  purge()
  {
    this._purged = false;
    this._purge();
  },

  _purge()
  {
    try
    {
      if (!this._purged)
      {
        this._purged = true;

        const defaultDelta =
          this._config.feeds_default_history_purge_days *
          24 * 60 * 60 * 1000;
        const today = new Date();
        const feedUrlPredicate = RdfService.GetResource(
          rdf_base_url + "feedUrl");
        const receivedDatePredicate = RdfService.GetResource(
          rdf_base_url + "receivedDate");
        const lastSuppliedDatePredicate = RdfService.GetResource(
          rdf_base_url + "lastSuppliedDate");

        const subjects = this._datasource.GetAllResources();
        while (subjects.hasMoreElements())
        {
          let delta = defaultDelta;
          const subject = subjects.getNext();
          if (this._datasource.hasArcOut(subject, feedUrlPredicate))
          {
            const url = this._datasource.GetTarget(
              subject, feedUrlPredicate, true).QueryInterface(
              Components.interfaces.nsIRDFLiteral).Value;

            if (url != null)
            {
              const rss = this._config.get_item_from_url(url);
              if (rss != null)
              {
                delta = parseInt(rss.getAttribute("purgeHistory"), 10) *
                  24 * 60 * 60 * 1000;
              }
            }
          }

          //When people upgrade to this version, there may be a number of
          //of entries in here that have no last supplied date. Use the
          //received date instead.
          let pred = lastSuppliedDatePredicate;
          if (!this._datasource.hasArcOut(subject, pred))
          {
            pred = receivedDatePredicate;
          }
          if (this._datasource.hasArcOut(subject, pred))
          {
            const date = new Date(
              this._datasource.GetTarget(
                subject, pred, true).QueryInterface(
                Components.interfaces.nsIRDFLiteral).Value);
            if ((today - date) > delta)
            {
              const targets = this._datasource.ArcLabelsOut(subject);
              while (targets.hasMoreElements())
              {
                const predicate = targets.getNext();
                const value = this._datasource.GetTarget(subject, predicate, true);
                this._datasource.Unassert(subject, predicate, value);
              }
            }
          }
        }
        this.flush();
      }
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
  },

});

//Static functions to do reading/writing the file. Not really ideal (well,
//the JS syntax isn't).

//Allows the options screen to show the path to the file
Headline_Cache.get_filepath = function()
{
  return inforss.get_profile_file(INFORSS_RDF_REPOSITORY);
};

//Return the corrent contents of the local headline cache as a string.
//This allows the option screen / shutdown to dump the RDF repository to an ftp
//server (via inforssIO which contains a lot of junk)
Headline_Cache.getRDFAsString = function()
{
  var outputStr = null;
  try
  {
    const file = Headline_Cache.get_filepath();
    if (! file.exists())
    {
      reset_repository();
    }

    let is = new FileInputStream(file, -1, -1, 0);
    let sis = new ScriptableInputStream(is);
    let output = sis.read(-1);
    sis.close();
    is.close();
    if (output.length > 0)
    {
      let uConv = new UTF8Converter();
      outputStr = uConv.convertStringToUTF8(output, "UTF-8", false);
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
  return outputStr;
};

//Replace the corrent contents of the local headline cache.
//This allows the option screen / shutdown to load the RDF repository from an
//ftp server (via inforssIO which contains a lot of junk)
Headline_Cache.saveRDFFromString = function(str)
{
  try
  {
    const file = Headline_Cache.get_filepath();
    const outputStream = new FileOutputStream(file, -1, -1, 0);
    if (str.length > 0)
    {
      let uConv = new UTF8Converter();
      str = uConv.convertStringToUTF8(str, "UTF-8", false);
    }
    outputStream.write(str, str.length);
    outputStream.close();
  }
  catch (e)
  {
    inforss.debug(e);
  }
};
