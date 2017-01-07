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
//-------------------------------------------------------------------------------------------------------------
// inforssRDFRepository
// Author : Didier Ernotte 2005
// Inforss extension
//-------------------------------------------------------------------------------------------------------------
const INFORSS_RDF_REPOSITORY = "inforss.rdf";
const INFORSS_DEFAULT_RDF_REPOSITORY = "inforss_rdf.default";
const INFORSS_GMAIL_URL = "http://gmail.google.com/gmail";
//const INFORSS_INSTALL_DIR = "infoRSS@inforss.mozdev.org";

function inforssRDFRepository()
{
  this.datasource = null;
  this.purged = false;
  this.flushFlag = false;
  return this;
}

inforssRDFRepository.prototype =
{
  datasource : null,

//-------------------------------------------------------------------------------------------------------------
  init : function()
  {
    try
    {
      var file = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).get("ProfD",Components.interfaces.nsIFile);
      file.append(INFORSS_RDF_REPOSITORY);
      if (file.exists() == false)
      {
        this.restoreRDFRepository();
      }
      file = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).get("ProfD", Components.interfaces.nsIFile);
      file.append(INFORSS_RDF_REPOSITORY);

      var ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
      var uri = ioService.newFileURI(file);

      var rdfs = Components.classes["@mozilla.org/rdf/rdf-service;1"].getService(Components.interfaces.nsIRDFService);

      this.datasource = rdfs.GetDataSourceBlocking(uri.spec);
      this.datasource.QueryInterface(Components.interfaces.nsIRDFRemoteDataSource);
      inforssSetTimer(this, "purge", 10000);
      file = null;
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
  },

//-------------------------------------------------------------------------------------------------------------
  exists : function(url, title, checkHistory, feedUrl)
  {
    var find = false;
    var findLocalHistory = false;
    url = this.convertUrl(url);
    try
    {
//dump("exists\n");
      var rdfService = Components.classes["@mozilla.org/rdf/rdf-service;1"].getService(Components.interfaces.nsIRDFService);
      var subject = rdfService.GetResource(inforssFeed.htmlFormatConvert(url) + "#" + escape(title));
      var predicate = rdfService.GetResource("http://inforss.mozdev.org/rdf/inforss/receivedDate");
      if (this.datasource.hasArcOut(subject, predicate) == true)
      {
        find = true; //this.datasource.GetTarget(subject, predicate, true);
      }
//dump("exists : " + find + " " + inforssFeed.htmlFormatConvert(url) + "#" + escape(title) + "\n");
      try
      {
        var globalHistory = Components.classes["@mozilla.org/browser/global-history;1"].createInstance( Components.interfaces.nsIGlobalHistory );
        if ((url.indexOf("http") == 0) && (checkHistory == true) && (globalHistory.isVisited(url) == true))
        {
          findLocalHistory = true;
          var rdfService = Components.classes["@mozilla.org/rdf/rdf-service;1"].getService(Components.interfaces.nsIRDFService);
          var historyDS = rdfService.GetDataSource("rdf:history");
          var subject = rdfService.GetResource(url);
          var predicate = rdfService.GetResource("http://home.netscape.com/NC-rdf#Date");
          if (historyDS.hasArcOut(subject, predicate) == true)
          {
            var date = new Date(historyDS.GetTarget(subject, predicate, true).QueryInterface(Components.interfaces.nsIRDFDate).Value / 1000);
            if (find == false)
            {
//dump("ajout\n");
              this.createNewRDFEntry(url, title, date, feedUrl);
            }
            if (this.getAttribute(url, title, "viewed") == "false")
            {
              this.setAttribute(url, title, "readDate", date);
              this.setAttribute(url, title, "viewed", "true");
            }
            date = null;
          }
          rdfService = null;
          subject = null;
          predicate = null;
          historyDS = null;
        }
      }
      catch(ex)
      {}
      rdfService = null;
      subject = null;
      predicate = null;
      globalHistory = null;
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
//dump("fin exists " + find + " " + findLocalHistory + " " + (find || findLocalHistory) + " " + inforssFeed.htmlFormatConvert(url) + " " + title + "\n");
    return (find || findLocalHistory);
  },

//-------------------------------------------------------------------------------------------------------------
  createNewRDFEntry : function(url, title, receivedDate, feedUrl)
  {
    try
    {
      url = this.convertUrl(url);
//dump("assert : " + inforssFeed.htmlFormatConvert(url) + "#" + escape(title) + " " + receivedDate + "\n");
      var rdfService = Components.classes["@mozilla.org/rdf/rdf-service;1"].getService(Components.interfaces.nsIRDFService);
      var subject = rdfService.GetResource(inforssFeed.htmlFormatConvert(url) + "#" + escape(title));
      var predicate = rdfService.GetResource("http://inforss.mozdev.org/rdf/inforss/receivedDate");
      var date = rdfService.GetLiteral(receivedDate);
      var status = this.datasource.Assert(subject, predicate, date, true);
//dump("Status1=" + status + "\n");
      predicate = rdfService.GetResource("http://inforss.mozdev.org/rdf/inforss/readDate");
      date = rdfService.GetLiteral("");
      status = this.datasource.Assert(subject, predicate, date, true);
//dump("Status2=" + status + "\n");
      predicate = rdfService.GetResource("http://inforss.mozdev.org/rdf/inforss/viewed");
      var viewed = rdfService.GetLiteral("false");
      status = this.datasource.Assert(subject, predicate, viewed, true);
//dump("Status3=" + status + "\n");
      predicate = rdfService.GetResource("http://inforss.mozdev.org/rdf/inforss/banned");
      var banned = rdfService.GetLiteral("false");
      status = this.datasource.Assert(subject, predicate, banned, true);
//dump("Status4=" + status + "\n");
      predicate = rdfService.GetResource("http://inforss.mozdev.org/rdf/inforss/savedPodcast");
      var saved = rdfService.GetLiteral("false");
      status = this.datasource.Assert(subject, predicate, saved, true);
//dump("Status5=" + status + "\n");
      predicate = rdfService.GetResource("http://inforss.mozdev.org/rdf/inforss/feedUrl");
      var feedUrlLitteral = rdfService.GetLiteral(feedUrl);
      status = this.datasource.Assert(subject, predicate, feedUrlLitteral, true);
      this.flushFlag = true;
//      this.datasource.Flush();
      rdfService = null;
      subject = null;
      predicate = null;
      date = null;
      viewed = null;
      banned = null;
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
//dump("fin assert " + inforssFeed.htmlFormatConvert(url) + " " + title + "\n");
  },


//-------------------------------------------------------------------------------------------------------------
  flush : function()
  {
    try
    {
      if (this.flushFlag == true)
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
  getAttribute : function(url, title, attribute)
  {
//dump("getAttribute\n");
    url = this.convertUrl(url);
    var value = null;
    try
    {
      var rdfService = Components.classes["@mozilla.org/rdf/rdf-service;1"].getService(Components.interfaces.nsIRDFService);
      var subject = rdfService.GetResource(inforssFeed.htmlFormatConvert(url) + "#" + escape(title));
      var predicate = rdfService.GetResource("http://inforss.mozdev.org/rdf/inforss/" + attribute);
      if (this.datasource.hasArcOut(subject, predicate) == true)
      {
        value = this.datasource.GetTarget(subject, predicate, true).QueryInterface(Components.interfaces.nsIRDFLiteral).Value;
      }
      rdfService = null;
      subject = null;
      predicate = null;
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
//dump("fin getAttribute " + value + " " + inforssFeed.htmlFormatConvert(url) + " " + title + " " + attribute + "\n");
    return value;
  },

//-------------------------------------------------------------------------------------------------------------
  setAttribute : function(url, title, attribute, value)
  {
    url = this.convertUrl(url);
//dump("setAttribute : " + inforssFeed.htmlFormatConvert(url) + " " + title + " " + attribute + " " + value + "\n");
    try
    {
      var rdfService = Components.classes["@mozilla.org/rdf/rdf-service;1"].getService(Components.interfaces.nsIRDFService);
      var subject = rdfService.GetResource(inforssFeed.htmlFormatConvert(url) + "#" + escape(title));
      var predicate = rdfService.GetResource("http://inforss.mozdev.org/rdf/inforss/" + attribute);
      var newValue = rdfService.GetLiteral(value);
      if (this.datasource.hasArcOut(subject, predicate) == true)
      {
        var oldValue =this.datasource.GetTarget(subject, predicate, true);
        this.datasource.Change(subject, predicate, oldValue, newValue);
      }
      else
      {
        this.datasource.Assert(subject, predicate, newValue, true);
      }
      this.datasource.Flush();
      rdfService = null;
      subject = null;
      predicate = null;
      newValue = null;
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
//dump("fin setAttribute " + inforssFeed.htmlFormatConvert(url) + " " + title + " " + attribute + " " + value + "\n");
  },


//-------------------------------------------------------------------------------------------------------------
  restoreRDFRepository : function()
  {
    try
    {
//dump("restoreRDFRepository\n");
      netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect");
      var file = file=Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).get("ProfD", Components.interfaces.nsIFile);
      file.append(INFORSS_RDF_REPOSITORY);
      if ( file.exists() == true)
      {
        file.remove(false);
//dump("remove\n");
      }
      file = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).get("ProfD", Components.interfaces.nsIFile);
      var source = file.clone();
      source.append("extensions");
//      source.append("{" + INFORSS_GUID + "}");
      source.append(INFORSS_INSTALL_DIR);
      source.append(INFORSS_DEFAULT_RDF_REPOSITORY);
      if (source.exists() == true)
      {
        if (!source.isWritable())
        {
          source.permissions = 0644;
        }
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
  clearRdf : function()
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

//-------------------------------------------------------------------------------------------------------------
  convertUrl : function(url)
  {
    return ((url == null) || (url == ""))? "http://inforss.mozdev.org/rdf/inforss" : url;
  },

//-------------------------------------------------------------------------------------------------------------
  purge : function()
  {
    try
    {
      if (this.purged == false)
      {
        this.purged = true;
//dump("purge\n");
        var rdfService = Components.classes["@mozilla.org/rdf/rdf-service;1"].getService(Components.interfaces.nsIRDFService);
        var subjects = this.datasource.GetAllResources();
        var subject = null;
        var defaultDelta = eval(inforssXMLRepository.getDefaultPurgeHistory()) * 24 * 60 * 60 * 1000;
        var delta = null;
        var today = new Date();
        var receivedDate = null;
        var value = null;
        var predicate = null;
        var receivedDatePredicate = rdfService.GetResource("http://inforss.mozdev.org/rdf/inforss/receivedDate");
        var feedUrlPredicate = rdfService.GetResource("http://inforss.mozdev.org/rdf/inforss/feedUrl");
        var url = null;
        var index = null;
        var rss = null;
        while (subjects.hasMoreElements())
        {
          subject = subjects.getNext();  
          if (this.datasource.hasArcOut(subject, feedUrlPredicate) == true)
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
                delta = defaultDelta
              }
            }
            else
            {
              delta = defaultDelta
            }
          }
          else
          {
            delta = defaultDelta
          }
//          inforssInspect(subject);
//dump("Url=" + url + " " + delta + "\n");
          if (this.datasource.hasArcOut(subject, receivedDatePredicate) == true)
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
        inforssSetTimer(this, "flush", Math.round(Math.random()*10) * 1000);

//        this.datasource.Flush();
        rdfService = null;
        subjects = null;
        subject = null;
        delta = null;
        today = null;
        receivedDate = null;
        value = null;
        predicate = null;
        receivedDatePredicate = null;
      }
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
//dump("fin purge\n");
  },

}

//-------------------------------------------------------------------------------------------------------------
inforssRDFRepository.getRDFAsString = function()
{
  var outputStr = null;
  try
  {
    var file = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).get("ProfD",Components.interfaces.nsIFile);
    file.append(INFORSS_RDF_REPOSITORY);
    if (file.exists() == false)
    {
      this.restoreRDFRepository();
    }
    file = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).get("ProfD", Components.interfaces.nsIFile);
    file.append(INFORSS_RDF_REPOSITORY);

    var is = Components.classes["@mozilla.org/network/file-input-stream;1"].createInstance( Components.interfaces.nsIFileInputStream );
    is.init(file, 0x01, 00004, null);
    var sis = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance( Components.interfaces.nsIScriptableInputStream );
    sis.init( is );
    var output = sis.read(-1);
    is.close();
    sis.close();
    if (output.length > 0)
    {
      var uConv = Components.classes['@mozilla.org/intl/utf8converterservice;1'].createInstance(Components.interfaces.nsIUTF8ConverterService);
      outputStr = uConv.convertStringToUTF8(output, "UTF-8", false);
    }
    file = null;
    is = null;
    sis = null;
  }
  catch(e)
  {
    inforssDebug(e);
  }
  return outputStr;
}

//-------------------------------------------------------------------------------------------------------------
inforssRDFRepository.saveRDFFromString = function(str)
{
  try
  {
    var file = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).get("ProfD",Components.interfaces.nsIFile);
    file.append(INFORSS_RDF_REPOSITORY);
    var outputStream = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance( Components.interfaces.nsIFileOutputStream );
    if ((file.exists() == true) && (!file.isWritable()))
    {
      file.permissions = 0644;
    }
    outputStream.init( file, 0x04 | 0x08 | 0x20, 420, 0 );
    var result = outputStream.write( str, str.length );
    outputStream.close();

    file = null;
    outputStream = null;
    result = null;
  }
  catch(e)
  {
    inforssDebug(e);
  }
}

