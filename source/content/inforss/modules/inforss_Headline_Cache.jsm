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
/* eslint-disable strict */
"use strict";

/* eslint-disable array-bracket-newline */
/* exported EXPORTED_SYMBOLS */
const EXPORTED_SYMBOLS = [
  "Headline_Cache", /* exported Headline_Cache */
];
/* eslint-enable array-bracket-newline */

const { debug } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Debug.jsm",
  {}
);

const { event_binder, make_URI } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Utils.jsm",
  {}
);

const {
  get_profile_dir,
  get_profile_file,
  get_resource_file
} = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Version.jsm",
  {}
);

const IoService = Components.classes[
  "@mozilla.org/network/io-service;1"].getService(
  Components.interfaces.nsIIOService);

const HistoryService = Components.classes[
  "@mozilla.org/browser/nav-history-service;1"].getService(
  Components.interfaces.nsINavHistoryService);

const RdfService = Components.classes[
  "@mozilla.org/rdf/rdf-service;1"].getService(
  Components.interfaces.nsIRDFService);

const { clearTimeout, setTimeout } = Components.utils.import(
  "resource://gre/modules/Timer.jsm",
  {}
);

const INFORSS_RDF_REPOSITORY = "inforss.rdf";
const INFORSS_DEFAULT_RDF_REPOSITORY = "inforss_rdf.default";

const rdf_base_url = "http://inforss.mozdev.org/rdf/inforss/";

function get_filepath()
{
  return get_profile_file(INFORSS_RDF_REPOSITORY);
}

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
    debug(e);
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
  const file = get_filepath();
  if (file.exists())
  {
    file.remove(false);
  }
  const source = get_resource_file(INFORSS_DEFAULT_RDF_REPOSITORY);
  if (source.exists())
  {
    source.copyTo(get_profile_dir(), INFORSS_RDF_REPOSITORY);
  }
}

/** Cache for read or banned state of headlines
 *
 * @class
 *
 * @param {Config} config - configuration of extension
 */
function Headline_Cache(config)
{
  this._config = config;
  this._datasource = null;
  this._flush_timeout = null;
  this._purge_timeout = null;
}

Object.assign(Headline_Cache.prototype, {
  //-------------------------------------------------------------------------------------------------------------
  init()
  {
    try
    {
      const file = get_filepath();
      if (! file.exists())
      {
        reset_repository();
      }

      var uri = IoService.newFileURI(file);
      this._datasource = RdfService.GetDataSourceBlocking(uri.spec);

      //This is required to set up the datasource...
      this._datasource.QueryInterface(Components.interfaces.nsIRDFRemoteDataSource);

      this._purge_timeout = setTimeout(event_binder(this.purge, this),
                                       10 * 1000);
    }
    catch (err)
    {
      debug(err);
    }
  },

  /** called on any shutdown
   *
   * do any pending flush
   */
  dispose()
  {
    if (this._flush_timeout != null)
    {
      clearTimeout(this._flush_timeout);
      clearTimeout(this._purge_timeout);
      this._flush();
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
        query.uri = make_URI(url);
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
    catch (err)
    {
      debug(err);
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
      debug(e);
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
      this._flush_timeout = setTimeout(event_binder(this._flush, this), 1000);
    }
  },

  //----------------------------------------------------------------------------
  //The actual flush
  _flush()
  {
    this._flush_timeout = null;
    this._datasource.Flush();
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
      debug(e);
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
      debug(e);
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
      debug(e);
    }
  },


  //----------------------------------------------------------------------------
  //Purges old headlines from the RDF file
  purge()
  {
    clearTimeout(this._purge_timeout);
    this._purge_timeout = null;

    const defaultDelta =
      this._config.feeds_default_history_purge_days *
      24 * 60 * 60 * 1000;
    const today = new Date();
    const feedUrlPredicate = RdfService.GetResource(rdf_base_url + "feedUrl");
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
      if (! this._datasource.hasArcOut(subject, pred))
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
  },

});

Headline_Cache.get_filepath = get_filepath;
