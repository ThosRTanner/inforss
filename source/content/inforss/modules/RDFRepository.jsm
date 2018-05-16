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
// RDFRepository
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------

/* jshint globalstrict: true */
"use strict";

/* exported EXPORTED_SYMBOLS */
var EXPORTED_SYMBOLS = [
    "RDFRepository", /* exported RDFRepository */
];

var inforss = inforss || {};
Components.utils.import("chrome://inforss/content/modules/Debug.jsm", inforss);

Components.utils.import("chrome://inforss/content/modules/Version.jsm", inforss);

Components.utils.import("chrome://inforss/content/modules/Utils.jsm", inforss);

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

const WindowMediator = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);

const window = WindowMediator.getMostRecentWindow(null);

/////////////FIXME
//This seems generally excessive. The rdf 'about' is meant to be an href and the
//# part is for identifying a sub document. But if we pass in the guid then
// shouldn't it be sufficiently unique?
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
    console.log("encoding", e)
  }
  return str2;
}

function create_rdf_subject(url, title)
{
  //See fixme above. The title actually isn't munged correctly anyway.
  return url + '#' + titleConv(title);
}

function RDFRepository(config)
{
  this.inforss_configuration = config;
  this.datasource = null;
  this.purged = false;
  this.flush_timeout = null;
  return this;
}

RDFRepository.prototype = {
  //-------------------------------------------------------------------------------------------------------------
  init: function()
  {
    try
    {
      const file = RDFRepository.get_filepath();
      if (! file.exists())
      {
        this.restoreRDFRepository();
      }

      var uri = IoService.newFileURI(file);
      this.datasource = RdfService.GetDataSourceBlocking(uri.spec);

      //This is required to set up the datasource...
      this.datasource.QueryInterface(Components.interfaces.nsIRDFRemoteDataSource);

      this.purge_after(10000);
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
  },
 //-------------------------------------------------------------------------------------------------------------
  exists: function(url, title, checkHistory, feedUrl)
  {
    let find = false;
    let findLocalHistory = false;
    try
    {
      //See if we have in our local cache
      let subject = RdfService.GetResource(create_rdf_subject(url, title));
      const predicate =
        RdfService.GetResource("http://inforss.mozdev.org/rdf/inforss/receivedDate");
      if (this.datasource.hasArcOut(subject, predicate))
      {
        //We do
        find = true;
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
  createNewRDFEntry: function(url, title, receivedDate, feedUrl)
  {
    try
    {
      var subject = RdfService.GetResource(create_rdf_subject(url, title));
      var predicate = RdfService.GetResource("http://inforss.mozdev.org/rdf/inforss/receivedDate");
      var date = RdfService.GetLiteral(receivedDate);
      var status = this.datasource.Assert(subject, predicate, date, true);

      predicate = RdfService.GetResource("http://inforss.mozdev.org/rdf/inforss/readDate");
      date = RdfService.GetLiteral("");
      status = this.datasource.Assert(subject, predicate, date, true);

      predicate = RdfService.GetResource("http://inforss.mozdev.org/rdf/inforss/viewed");
      var viewed = RdfService.GetLiteral("false");
      status = this.datasource.Assert(subject, predicate, viewed, true);

      predicate = RdfService.GetResource("http://inforss.mozdev.org/rdf/inforss/banned");
      var banned = RdfService.GetLiteral("false");
      status = this.datasource.Assert(subject, predicate, banned, true);

      predicate = RdfService.GetResource("http://inforss.mozdev.org/rdf/inforss/savedPodcast");
      var saved = RdfService.GetLiteral("false");
      status = this.datasource.Assert(subject, predicate, saved, true);

      predicate = RdfService.GetResource("http://inforss.mozdev.org/rdf/inforss/feedUrl");
      var feedUrlLitteral = RdfService.GetLiteral(feedUrl);
      status = this.datasource.Assert(subject, predicate, feedUrlLitteral, true);

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
  flush: function()
  {
    if (this.flush_timeout == null)
    {
      this.flush_timeout = window.setTimeout(this.real_flush.bind(this), 1000);
    }
  },

  //----------------------------------------------------------------------------
  //The actual flush
  real_flush: function()
  {
    this.flush_timeout = null;
    try
    {
      this.datasource.Flush();
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
  },

  //-------------------------------------------------------------------------------------------------------------
  getAttribute: function(url, title, attribute)
  {
    var value = null;
    try
    {
      var subject = RdfService.GetResource(create_rdf_subject(url, title));
      var predicate = RdfService.GetResource("http://inforss.mozdev.org/rdf/inforss/" + attribute);
      if (this.datasource.hasArcOut(subject, predicate))
      {
        value = this.datasource.GetTarget(subject, predicate, true).QueryInterface(Components.interfaces.nsIRDFLiteral).Value;
      }
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    return value;
  },

  //-------------------------------------------------------------------------------------------------------------
  setAttribute: function(url, title, attribute, value)
  {
    try
    {
      var subject = RdfService.GetResource(create_rdf_subject(url, title));
      var predicate = RdfService.GetResource("http://inforss.mozdev.org/rdf/inforss/" + attribute);
      var newValue = RdfService.GetLiteral(value);
      if (this.datasource.hasArcOut(subject, predicate))
      {
        var oldValue = this.datasource.GetTarget(subject, predicate, true);
        this.datasource.Change(subject, predicate, oldValue, newValue);
      }
      else
      {
        this.datasource.Assert(subject, predicate, newValue, true);
      }
      this.flush();
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
  },
  //-------------------------------------------------------------------------------------------------------------
  restoreRDFRepository: function()
  {
    try
    {
      let file = RDFRepository.get_filepath();
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
      inforss.debug(e, this);
    }
  },

  //-------------------------------------------------------------------------------------------------------------
  clearRdf: function()
  {
    try
    {
      this.restoreRDFRepository();
      this.init();
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
  },


  //----------------------------------------------------------------------------
  purge_after: function(time)
  {
    window.setTimeout(this.purge.bind(this), time);
  },

  //-------------------------------------------------------------------------------------------------------------
  purge: function()
  {
    try
    {
      if (!this.purged)
      {
        this.purged = true;

        const defaultDelta =
          this.inforss_configuration.feeds_default_history_purge_days *
          24 * 60 * 60 * 1000;
        const today = new Date();
        const feedUrlPredicate = RdfService.GetResource(
          "http://inforss.mozdev.org/rdf/inforss/feedUrl");
        const receivedDatePredicate = RdfService.GetResource(
          "http://inforss.mozdev.org/rdf/inforss/receivedDate");
        const subjects = this.datasource.GetAllResources();
        while (subjects.hasMoreElements())
        {
          let delta = defaultDelta;
          const subject = subjects.getNext();
          if (this.datasource.hasArcOut(subject, feedUrlPredicate))
          {
            const url = this.datasource.GetTarget(subject, feedUrlPredicate, true).QueryInterface(Components.interfaces.nsIRDFLiteral).Value;

            if (url != null)
            {
              const rss = this.inforss_configuration.get_item_from_url(url);
              if (rss != null)
              {
                delta = parseInt(rss.getAttribute("purgeHistory"), 10) * 24 * 60 * 60 * 1000;
              }
            }
          }

          if (this.datasource.hasArcOut(subject, receivedDatePredicate))
          {
            const receivedDate = new Date(
              this.datasource.GetTarget(
                subject, receivedDatePredicate, true).QueryInterface(
                Components.interfaces.nsIRDFLiteral).Value);
            if ((today - receivedDate) > delta)
            {
              const targets = this.datasource.ArcLabelsOut(subject);
              while (targets.hasMoreElements())
              {
                const predicate = targets.getNext();
                const value = this.datasource.GetTarget(subject, predicate, true);
                this.datasource.Unassert(subject, predicate, value);
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

};

//Static functions to do reading/writing the file. Not really ideal (well,
//the JS syntax isn't), not sure why we don't have an instance of this class for
//the options screen

RDFRepository.get_filepath = function()
{
  return inforss.get_profile_file(INFORSS_RDF_REPOSITORY);
};

//-------------------------------------------------------------------------------------------------------------
RDFRepository.getRDFAsString = function()
{
  var outputStr = null;
  try
  {
    const file = RDFRepository.get_filepath();
    if (! file.exists())
    {
      this.restoreRDFRepository();
    }

    let is = new FileInputStream(file, -1, -1, 0);
    let sis = new ScriptableInputStream(is);
    let output = sis.read(-1);
    sis.close();
    is.close();
    if (output.length > 0)
    {
      //FIXME Why would you convert utf-8 to utf-8?
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

//-------------------------------------------------------------------------------------------------------------
RDFRepository.saveRDFFromString = function(str)
{
  try
  {
    const file = RDFRepository.get_filepath();
    const outputStream = new FileOutputStream(file, -1, -1, 0);
    outputStream.write(str, str.length);
    outputStream.close();
  }
  catch (e)
  {
    inforss.debug(e);
  }
};
