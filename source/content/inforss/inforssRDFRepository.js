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
// inforssRDFRepository
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------
/* globals inforssDebug */ //also inforssTraceIn, inforssTraceOut */
Components.utils.import("chrome://inforss/content/modules/inforssDebug.jsm");

/* globals inforssGetResourceFile */
Components.utils.import("chrome://inforss/content/modules/inforssVersion.jsm");

///* globals replace_without_children, remove_all_children, make_URI */
/* globals make_URI */
Components.utils.import("chrome://inforss/content/modules/inforssUtils.jsm");

/* globals inforssXMLRepository, inforssGetItemFromUrl */
/* global FileInputStream, FileOutputStream */
/* global ScriptableInputStream */
/* global UTF8Converter */

const INFORSS_RDF_REPOSITORY = "inforss.rdf";
const INFORSS_DEFAULT_RDF_REPOSITORY = "inforss_rdf.default";

/* exported IoService */
const IoService = Components.classes[
  "@mozilla.org/network/io-service;1"].getService(
  Components.interfaces.nsIIOService);

/* exported HistoryService */
const HistoryService = Components.classes[
  "@mozilla.org/browser/nav-history-service;1"].getService(
  Components.interfaces.nsINavHistoryService);

  const RdfService = Components.classes[
  "@mozilla.org/rdf/rdf-service;1"].getService(
  Components.interfaces.nsIRDFService);


function inforssRDFRepository()
{
  this.datasource = null;
  this.purged = false;
  this.flushFlag = false;
  return this;
}

inforssRDFRepository.prototype = {
  datasource: null,

  //-------------------------------------------------------------------------------------------------------------
  init: function()
  {
    try
    {
      const file = inforssRDFRepository.get_filepath();
      if (! file.exists())
      {
        this.restoreRDFRepository();
      }

      var uri = IoService.newFileURI(file);

      var rdfs = Components.classes["@mozilla.org/rdf/rdf-service;1"].getService(Components.interfaces.nsIRDFService);

      this.datasource = rdfs.GetDataSourceBlocking(uri.spec);
      //FIXME Does this line actually do anything useful?
      this.datasource.QueryInterface(Components.interfaces.nsIRDFRemoteDataSource);
      this.purge_after(10000);
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
  },
 //-------------------------------------------------------------------------------------------------------------
  exists: function(url, title, checkHistory, feedUrl)
  {
    let find = false;
    let findLocalHistory = false;
    try
    {
      let subject = RdfService.GetResource(inforssFeed.htmlFormatConvert(url) + "#" + escape(title));
      let predicate = RdfService.GetResource("http://inforss.mozdev.org/rdf/inforss/receivedDate");
      if (this.datasource.hasArcOut(subject, predicate))
      {
        find = true; //this.datasource.GetTarget(subject, predicate, true);
      }

      if (url.indexOf("http") == 0 && checkHistory)
      {
        const query = HistoryService.getNewQuery();
        query.uri = make_URI(url);
        const result = HistoryService.executeQuery(query, HistoryService.getNewQueryOptions());
        result.root.containerOpen = true;
        if (result.root.childCount != 0)
        {
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
      inforssDebug(e, this);
    }
    return find || findLocalHistory;
  },

  //-------------------------------------------------------------------------------------------------------------
  createNewRDFEntry: function(url, title, receivedDate, feedUrl)
  {
    try
    {
      //dump("assert : " + inforssFeed.htmlFormatConvert(url) + "#" + escape(title) + " " + receivedDate + "\n");
      var subject = RdfService.GetResource(inforssFeed.htmlFormatConvert(url) + "#" + escape(title));
      var predicate = RdfService.GetResource("http://inforss.mozdev.org/rdf/inforss/receivedDate");
      var date = RdfService.GetLiteral(receivedDate);
      var status = this.datasource.Assert(subject, predicate, date, true);
      //dump("Status1=" + status + "\n");
      predicate = RdfService.GetResource("http://inforss.mozdev.org/rdf/inforss/readDate");
      date = RdfService.GetLiteral("");
      status = this.datasource.Assert(subject, predicate, date, true);
      //dump("Status2=" + status + "\n");
      predicate = RdfService.GetResource("http://inforss.mozdev.org/rdf/inforss/viewed");
      var viewed = RdfService.GetLiteral("false");
      status = this.datasource.Assert(subject, predicate, viewed, true);
      //dump("Status3=" + status + "\n");
      predicate = RdfService.GetResource("http://inforss.mozdev.org/rdf/inforss/banned");
      var banned = RdfService.GetLiteral("false");
      status = this.datasource.Assert(subject, predicate, banned, true);
      //dump("Status4=" + status + "\n");
      predicate = RdfService.GetResource("http://inforss.mozdev.org/rdf/inforss/savedPodcast");
      var saved = RdfService.GetLiteral("false");
      status = this.datasource.Assert(subject, predicate, saved, true);
      //dump("Status5=" + status + "\n");
      predicate = RdfService.GetResource("http://inforss.mozdev.org/rdf/inforss/feedUrl");
      var feedUrlLitteral = RdfService.GetLiteral(feedUrl);
      status = this.datasource.Assert(subject, predicate, feedUrlLitteral, true);
      this.flushFlag = true;
      //      this.datasource.Flush();
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    //dump("fin assert " + inforssFeed.htmlFormatConvert(url) + " " + title + "\n");
  },

  //----------------------------------------------------------------------------
  flush_after: function(time)
  {
    window.setTimeout(this.flush.bind(this), time);
  },
  //-------------------------------------------------------------------------------------------------------------
  flush: function()
  {
    try
    {
      if (this.flushFlag)
      {
        this.datasource.Flush();
        this.flushFlag = false;
      }
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
  },

  //-------------------------------------------------------------------------------------------------------------
  getAttribute: function(url, title, attribute)
  {
    //dump("getAttribute\n");
    var value = null;
    try
    {
      var subject = RdfService.GetResource(inforssFeed.htmlFormatConvert(url) + "#" + escape(title));
      var predicate = RdfService.GetResource("http://inforss.mozdev.org/rdf/inforss/" + attribute);
      if (this.datasource.hasArcOut(subject, predicate))
      {
        value = this.datasource.GetTarget(subject, predicate, true).QueryInterface(Components.interfaces.nsIRDFLiteral).Value;
      }
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    //dump("fin getAttribute " + value + " " + inforssFeed.htmlFormatConvert(url) + " " + title + " " + attribute + "\n");
    return value;
  },

  //-------------------------------------------------------------------------------------------------------------
  setAttribute: function(url, title, attribute, value)
  {
    //dump("setAttribute : " + inforssFeed.htmlFormatConvert(url) + " " + title + " " + attribute + " " + value + "\n");
    try
    {
      var subject = RdfService.GetResource(inforssFeed.htmlFormatConvert(url) + "#" + escape(title));
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
      this.datasource.Flush();
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    //dump("fin setAttribute " + inforssFeed.htmlFormatConvert(url) + " " + title + " " + attribute + " " + value + "\n");
  },


  //-------------------------------------------------------------------------------------------------------------
  restoreRDFRepository: function()
  {
    try
    {
      //dump("restoreRDFRepository\n");
      //      netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect");
      let file = inforssRDFRepository.get_filepath();
      if (file.exists())
      {
        file.remove(false);
        //dump("remove\n");
      }
      file = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).get("ProfD", Components.interfaces.nsIFile);
      let source = inforssGetResourceFile(INFORSS_DEFAULT_RDF_REPOSITORY);
      if (source.exists())
      {
        source.copyTo(file, INFORSS_RDF_REPOSITORY);
        //dump("copy\n");
      }
      else
      {
        //    	  alert("error");
      }
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    //dump("fin restoreRDFRepository\n");
  },

  //-------------------------------------------------------------------------------------------------------------
  clearRdf: function()
  {
    try
    {
      //dump("clearRdf\n");
      this.restoreRDFRepository();
      this.init();
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    //dump("fin clearRdf\n");
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
      if (this.purged == false)
      {
        this.purged = true;
        //dump("purge\n");
        var subjects = this.datasource.GetAllResources();
        var subject = null;
        var defaultDelta = inforssXMLRepository.feeds_default_history_purge_days() * 24 * 60 * 60 * 1000;
        var delta = null;
        var today = new Date();
        var receivedDate = null;
        var value = null;
        var predicate = null;
        var receivedDatePredicate = RdfService.GetResource("http://inforss.mozdev.org/rdf/inforss/receivedDate");
        var feedUrlPredicate = RdfService.GetResource("http://inforss.mozdev.org/rdf/inforss/feedUrl");
        var url = null;
        var index = null;
        var rss = null;
        while (subjects.hasMoreElements())
        {
          subject = subjects.getNext();
          if (this.datasource.hasArcOut(subject, feedUrlPredicate))
          {
            url = this.datasource.GetTarget(subject, feedUrlPredicate, true).QueryInterface(Components.interfaces.nsIRDFLiteral).Value;

            if (url != null)
            {
              rss = inforssGetItemFromUrl(url);
              if (rss != null)
              {
                delta = eval(rss.getAttribute("purgeHistory")) * 24 * 60 * 60 * 1000;
              }
              else
              {
                delta = defaultDelta;
              }
            }
            else
            {
              delta = defaultDelta;
            }
          }
          else
          {
            delta = defaultDelta;
          }
          //          inforssInspect(subject);
          //dump("Url=" + url + " " + delta + "\n");
          if (this.datasource.hasArcOut(subject, receivedDatePredicate))
          {
            receivedDate = new Date(this.datasource.GetTarget(subject, receivedDatePredicate, true).QueryInterface(Components.interfaces.nsIRDFLiteral).Value);
            if ((today - receivedDate) > delta)
            {
              var targets = this.datasource.ArcLabelsOut(subject);
              while (targets.hasMoreElements())
              {
                predicate = targets.getNext();
                value = this.datasource.GetTarget(subject, predicate, true);
                this.datasource.Unassert(subject, predicate, value);
              }
            }
          }
        }
        this.flushFlag = true;
        this.flush_after(Math.round(Math.random() * 10) * 1000);

        //        this.datasource.Flush();
      }
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    //dump("fin purge\n");
  },

};

//Static functions to do reading/writing the file. Not really ideal (well,
//the JS syntax isn't), not sure why we don't have an instance of this class for
//the options screen

inforssRDFRepository.get_filepath = function()
{
  const file = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).get("ProfD", Components.interfaces.nsIFile);
  file.append(INFORSS_RDF_REPOSITORY);
  return file;
};

//-------------------------------------------------------------------------------------------------------------
inforssRDFRepository.getRDFAsString = function()
{
  var outputStr = null;
  try
  {
    const file = inforssRDFRepository.get_filepath();
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
    inforssDebug(e);
  }
  return outputStr;
};

//-------------------------------------------------------------------------------------------------------------
inforssRDFRepository.saveRDFFromString = function(str)
{
  try
  {
    const file = inforssRDFRepository.get_filepath();
    const outputStream = new FileOutputStream(file, -1, -1, 0);
    outputStream.write(str, str.length);
    outputStream.close();
  }
  catch (e)
  {
    inforssDebug(e);
  }
};
