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
// inforssFeed
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------

/* globals inforssDebug, inforssTraceIn, inforssTraceOut */
Components.utils.import("chrome://inforss/content/inforssDebug.jsm");

const INFORSS_FREQUENCY = 60000;
const INFORSS_FLASH_ICON = 100;
const INFORSS_FETCH_TIMEOUT = 10000;

/* exported inforssFeed */
function inforssFeed(feedXML, manager, menuItem)
{
  var self = new inforssInformation(feedXML, manager, menuItem);
  self.fetchTimeout = null;
  self.url = null;
  self.xmlHttpRequest = null;
  self.callback = null;
  self.headlines = new Array();
  self.candidateHeadlines = null;
  self.displayedHeadlines = null;
  self.scheduleTimeout = null;
  self.insync = false;
  self.timerSync = null;
  self.flashingIconTimeout = null;
  self.mainIcon = null;
  self.flashingDirection = -0.5;
  self.selectedFeed = null;
  self.lastRefresh = null;
  self.reload = false;

//-------------------------------------------------------------------------------------------------------------
  self.getFeeds = function()
  {
    return new Array(this);
  };

//-------------------------------------------------------------------------------------------------------------
  self.activate = function()
  {
    inforssTraceIn(this);
    try
    {
//dump("activate: " + this.getUrl() + "\n");
      if (this.active == false)
      {
        this.active = true;
        this.selectedFeed = this.manager.getSelectedInfo(false);
        if ((this.headlines == null) || (this.headlines.length == 0))
        {
          this.synchronizeWithOther();
        }
        else
        {
          this.manager.publishFeed(this);
          this.fetchFeed();
        }
      }
//dump("fin activate: " + this.getUrl() + "\n");
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  };

//-------------------------------------------------------------------------------------------------------------
  self.synchronizeWithOther = function()
  {
    inforssTraceIn(this);
    try
    {
      this.insync = true;
      this.clearSyncTimer();
      var observerService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
      observerService.notifyObservers(null, "sync", this.getUrl());
      this.syncTimer = inforssSetTimer(this,"syncTimeout",1000);
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  };

//-------------------------------------------------------------------------------------------------------------
  self.syncTimeout = function()
  {
    inforssTraceIn(this);
    try
    {
      this.syncTimer = null;
      this.insync = false;
      this.manager.publishFeed(this);
      this.fetchFeed();
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  };

//-------------------------------------------------------------------------------------------------------------
  self.clearSyncTimer = function()
  {
    inforssTraceIn(this);
    try
    {
      if (this.syncTimer != null)
      {
        inforssClearTimer(this.syncTimer);
      }
      this.syncTimer = null;
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  };

//-------------------------------------------------------------------------------------------------------------
  self.getXmlHeadlines = function()
  {
    inforssTraceIn(this);
    var xml = null;
    try
    {
      xml = "<headlines url=\"" + this.getUrl() + "\">\n";
      if ((this.headlines != null) && (this.headlines.length > 0))
      {
        for (var i = 0; i < this.headlines.length; i++)
        {
          xml += this.headlines[i].getXmlHeadlines();
        }
      }
      xml += "</headlines>";
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
    return xml;
  };

//-------------------------------------------------------------------------------------------------------------
  self.synchronize = function(objDoc)
  {
    inforssTraceIn(this);
    try
    {
      if (this.insync == true)
      {
        this.insync = false;
        this.clearSyncTimer();
        if (objDoc != null)
        {
          var headlines = objDoc.getElementsByTagName("headline");
          for (var i = 0; i < headlines.length; i++)
          {
            var head = new inforssHeadline(new Date(headlines[i].getAttribute("receivedDate")),
                                           new Date(headlines[i].getAttribute("pubDate")),
                                           headlines[i].getAttribute("title"),
                                           headlines[i].getAttribute("guid"),
                                           headlines[i].getAttribute("link"),
                                           headlines[i].getAttribute("description"),
                                           headlines[i].getAttribute("url"),
                                           headlines[i].getAttribute("home"),
                                           headlines[i].getAttribute("category"),
                                           headlines[i].getAttribute("enclosureUrl"),
                                           headlines[i].getAttribute("enclosureType"),
                                           headlines[i].getAttribute("enclosureSize"),
                                           this);
            head.viewed = (headlines[i].getAttribute("viewed") == "true");
            head.banned = (headlines[i].getAttribute("banned") == "true");
            this.headlines.push(head);
          }
        }
        this.manager.publishFeed(this);
        this.fetchFeed();
      }
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  };

//-------------------------------------------------------------------------------------------------------------
  self.passivate = function()
  {
    inforssTraceIn(this);
    try
    {
//dump("Passivate: " + this.getUrl() + "\n");
      if (this.active == true)
      {
//dump("Passivate: " + ((this.displayedHeadlines == null)? null : this.displayedHeadlines.length) + "\n");
        this.manager.unpublishFeed(this);
      }
      this.active = false;
      this.clearFetchTimeout();
      this.abortRequest();
      this.clearScheduleTimeout();
      this.stopFlashingIcon();
      this.selectedFeed = null;
//dump("fin Passivate: " + this.feedXML + "\n");
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  };

//-------------------------------------------------------------------------------------------------------------
  self.fetchFeed = function()
  {
    inforssTraceIn(this);
    try
    {
      if (this.isBusy() == false)
      {
        this.handleFetchTimeout();
      }
      {
//dump("fetch " + this.feedXML + "\n");
//dump("fetch " + this.feedXML.getAttribute("url") + "\n");

        var refetch = false;
        if (this.isActive() == true)
        {
//dump("demarre plan: " + this.feedXML + "\n");
          refetch = this.startSchedule();
        }

        if ((this.getFeedActivity() == true) && (this.isBrowserOffLine() == false))
        {
//dump("in getFeedActivity\n");
          if ((this.manager.cycleGroup == null) && (this.manager.getSelectedInfo(false).getUrl() == this.getUrl()))
          {
            this.manager.updateMenuIcon(this);
          }
//        if ((this.headlines != null) && (this.headlines.length > 0))
//        {
//          this.manager.signalReadEnd(this);
//        }
          this.changeMainIcon();
          if ((inforssXMLRepository.isFlashingIcon() == true) && (refetch == true))
          {
            this.startFlashingIconTimeout();
          }
	    }

        this.clearFetchTimeout();
//dump("step 1\n");

        if ((this.getFeedActivity() == true) && (this.isBrowserOffLine() == false) &&
            (refetch == true))
        {
          this.reload = true;
          var url = this.feedXML.getAttribute("url");
          var user = this.feedXML.getAttribute("user");
          var password = inforssXMLRepository.readPassword(url, user); //this.feedXML.getAttribute("password");
//alert("Pass=" + password);
//dump("encoding=" + this.getEncoding() + "\n");
          if (((this.getEncoding() == null) || (this.getEncoding() == "")) && (this.getType() != "nntp"))
          {
//dump("step 2\n");

            this.fetchTimeout = inforssSetTimer(this, "handleFetchTimeout1", INFORSS_FETCH_TIMEOUT);
//dump("step 3\n");
//dump("  new=" + this.fetchTimeout + "\n");
            if (this.xmlHttpRequest != null)
            {
//dump("delete  xmlHttpRequest\n");
              this.xmlHttpRequest.caller = null;
              this.xmlHttpRequest.onload = null;
              this.xmlHttpRequest.onerror = null;
              delete this.xmlHttpRequest;
            }
            this.xmlHttpRequest = new XMLHttpRequest();
            this.xmlHttpRequest.onload = this.readFeed;
            this.xmlHttpRequest.caller = this;
//dump("step 4: " + this + "\n");
            this.xmlHttpRequest.onerror = this.errorRequest;
//    gInforssCallbackFunction = this.readFeed;
//    this.xmlHttpRequest.onreadystatechange = processReqChange;
            this.xmlHttpRequest.open("GET", url, true, user, password);
//dump("step 5\n");
//      xmlHttpRequest.setRequestHeader('Accept','application/rss+xml')
//      xmlHttpRequest.setRequestHeader('Cache-Control','no-cache')
//      xmlHttpRequest.setRequestHeader("Content-Length","0");
//            this.xmlHttpRequest.setRequestHeader("If-Modified-Since", "Wed, 2 Aug 2006 23:30:00 GMT");
            if (this.getType() != "html")
            {
              this.xmlHttpRequest.overrideMimeType("application/xml");
            }
//dump("step 6\n");
            this.xmlHttpRequest.send(null);
          }
          else
          {
            if ((this.getType() != "nntp"))
            {
              var ioService  = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
              var uri = ioService.newURI(url, null , null);
              this.xmlHttpRequest = new inforssFTPDownload();
//dump("avant\n");
              this.xmlHttpRequest.start(uri, this, this.fetchHtmlCallback, this.fetchHtmlCallback);
            }
            else
            {
//dump("read nntp\n");
              this.readFeed();
            }
          }
          url = null;
          user = null;
          password = null;
	    }
//dump("fin fetch\n");
      }
    }
    catch(e)
    {
      this.stopFlashingIcon();
      this.reload = false;
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  };

//-------------------------------------------------------------------------------------------------------------
  self.clearFetchTimeout = function()
  {
    inforssTraceIn(this);
    try
    {
   	  if (this.fetchTimeout != null)
      {
        window.clearTimeout(this.fetchTimeout);
        inforssClearTimer(this.fetchTimeout);
        this.fetchTimeout = null;
      }
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  };

//-------------------------------------------------------------------------------------------------------------
  self.clearFlashingIconTimeout = function()
  {
//dump("clearFlashingIconTimeout\n");
    inforssTraceIn(this);
    try
    {
   	  if (this.flashingIconTimeout != null)
      {
        window.clearTimeout(this.flashingIconTimeout);
        inforssClearTimer(this.flashingIconTimeout);
        this.flashingIconTimeout = null;
      }
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  };

//-------------------------------------------------------------------------------------------------------------
  self.stopFlashingIcon = function()
  {
//dump("stopFlashingIconTimeout\n");
    inforssTraceIn(this);
    try
    {
      var timeout = this.flashingIconTimeout;
   	  this.clearFlashingIconTimeout();
   	  if (timeout != null)
   	  {
        this.setMainIconOpacity(1);
      }
      this.resetMainIcon();
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  };

//-------------------------------------------------------------------------------------------------------------
  self.abortRequest = function()
  {
//dump("abortRequest\n");
    inforssTraceIn(this);
    try
    {
      if (this.xmlHttpRequest != null)
      {
//dump("abortRequest 1\n");
        this.xmlHttpRequest.abort();
        this.xmlHttpRequest.caller = null;
        this.xmlHttpRequest.onload = null;
        this.xmlHttpRequest.onerror = null;
        delete this.xmlHttpRequest;
        this.xmlHttpRequest = null;
      }
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  };

//-------------------------------------------------------------------------------------------------------------
  self.errorRequest = function()
  {
    inforssTraceIn(this);
//dump("errorRequest\n");
//    this.caller.manager.signalReadEnd(this.caller);
    this.caller.handleFetchTimeout1();
    inforssTraceOut(this);
  };

//-------------------------------------------------------------------------------------------------------------
  self.readFeed = function()
  {
    inforssTraceIn(this);
    try
    {
//dump("read feed " + this + "\n");
//dump("read feed " + this.caller + "\n");
//dump("read feed " + this.caller.feedXML + "\n");
//dump("read feed " + this.caller.feedXML.getAttribute("url") + "\n");
//dump("read feed " + this.responseText.length + "\n");
	  this.caller.lastRefresh = new Date();
	  this.caller.clearFetchTimeout();
//dump("status=" + this.status + "\n");
	  var objDoc = this.responseXML;
//var toto = this.channel.QueryInterface(Components.interfaces.nsIHttpChannel);
//inforssInspect(toto);    // responseStatus
      if (objDoc != null)
      {
        var home = this.caller.feedXML.getAttribute("link");
        var url = this.caller.feedXML.getAttribute("url");

        var items = objDoc.getElementsByTagName(this.caller.itemAttribute);
        var re = new RegExp ('\n', 'gi') ;
        var receivedDate = new Date();
//dump("read nbItem=" + items.length + "\n");
        window.setTimeout(this.caller.readFeed1, 0, items.length - 1, items, receivedDate, home, url, re, this.caller);
        delete objDoc;
        items = null;
        re = null;
        receivedDate = null;
      }
      objDoc = null;
//dump("step 1\n");
      this.caller.xmlHttpRequest.onload = null;
      this.caller.xmlHttpRequest.onerror = null;
//dump("step 2\n");
      var feed = this.caller;
      this.caller.xmlHttpRequest.caller = null;
      delete feed.xmlHttpRequest;
//dump("step 3\n");
      feed.xmlHttpRequest = null;
//dump("step 4\n");
    }
    catch(e)
    {
//dump("error\n");
      this.caller.stopFlashingIcon();
      inforssDebug(e, this);
      this.reload = false;
    }
    inforssTraceOut(this);
  };

//-------------------------------------------------------------------------------------------------------------
  self.readFeed1 = function(i, items, receivedDate, home, url, re, caller)
  {
    inforssTraceIn(caller);
//dump("i=" + i + "\n");
    try
    {
      if (i >= 0)
      {
//dump("avant label\n");
        var label = inforssFeed.getNodeValue(items[i].getElementsByTagName(caller.titleAttribute));
        if (label != null)
        {
//dump("read label=" + label + "\n");
          label = inforssFeed.htmlFormatConvert(label).replace(re, ' ');
        }
        var guid = caller.getLink(items[i].getElementsByTagName(caller.alternateLinkAttribute));
//dump("read guid=" + guid + "\n");

        var link = caller.getLink(items[i].getElementsByTagName(caller.linkAttribute));
        if ((link == null) || (link == ""))
        {
          link = caller.getLink(items[i].getElementsByTagName(caller.alternateLinkAttribute));
        }
//dump("link=" + link + "\n");
//dump("avant description : " + caller.itemDescriptionAttribute + "\n");

        var description = null;
        if (caller.itemDescriptionAttribute.indexOf("|") == -1)
        {
          description = inforssFeed.getNodeValue(items[i].getElementsByTagName(caller.itemDescriptionAttribute));
//dump("brute.length=" + items[i].getElementsByTagName(caller.itemDescriptionAttribute).length + "\n");
//dump("brute=" + items[i].getElementsByTagName(caller.itemDescriptionAttribute)[0].firstChild.nodeValue + "\n");
//dump("brute=" + items[i].getElementsByTagName(caller.itemDescriptionAttribute)[0].firstChild.nextSibling.nodeValue + "\n");
//dump("des0=" + description + "\n");
        }
        else
        {
//alert("1");
           var pos = caller.itemDescriptionAttribute.indexOf("|");
           var des1 = caller.itemDescriptionAttribute.substring(0, pos);
           description = inforssFeed.getNodeValue(items[i].getElementsByTagName(des1));
           if (description == null)
           {
             des1 = caller.itemDescriptionAttribute.substring(pos + 1);
//alert("2 " + des1);
             description = inforssFeed.getNodeValue(items[i].getElementsByTagName(des1));
//alert(description.length);
           }
        }
//var ser = new XMLSerializer();
//dump(ser.serializeToString(items[i]) + "\n");
//inforssInspect((items[i].getElementsByTagName(caller.itemDescriptionAttribute))[0].firstChild.nextSibling);
//dump("des1=" + description + "\n");
        if (description != null)
        {
          description = inforssFeed.htmlFormatConvert(description).replace(re, ' ');
          description = inforssFeed.removeScript(description);
//dump("des1.1=" + description + "\n");
//dump("read description=" + description + "\n");
        }
        var category = inforssFeed.getNodeValue(items[i].getElementsByTagName("category"));
        var pubDate = caller.getPubDate(items[i]);

        var enclosure = items[i].getElementsByTagName("enclosure");
        var enclosureUrl = null;
        var enclosureType = null;
        var enclosureSize = null;
        if (enclosure.length > 0)
        {
          enclosureUrl = enclosure[0].getAttribute("url");
          enclosureType = enclosure[0].getAttribute("type");
          enclosureSize = enclosure[0].getAttribute("length");
        }
        else
        {
          if ((link != null) && (link.indexOf(".mp3") != -1))
          {
            enclosureUrl = link;
            enclosureType = "audio/mp3";
          }
        }

        if ((caller.findHeadline(url, label, guid, link) == null) && (label != null))
        {
//dump("add addHeadline: label=" + label + " guid=" + guid + " link=" + link + "\n");
          caller.addHeadline(receivedDate, pubDate, label, guid, link, description, url, home, category, enclosureUrl, enclosureType, enclosureSize);
        }
        else
        {
//dump("read NO addHeadline\n");
        }
        label = null;
        link = null;
        description = null;
        category = null;
        pubDate = null;
        enclosure = null;
        enclosureUrl = null;
        enclosureType = null;
        enclosureSize = null;
      }
      i--;
      if (i >= 0)
      {
        window.setTimeout(caller.readFeed1, eval(inforssXMLRepository.getTimeSlice()), i, items, receivedDate, home, url, re, caller);
      }
      else
      {
        window.setTimeout(caller.readFeed2, eval(inforssXMLRepository.getTimeSlice()), 0, items, home, url, re, caller);
      }
    }
    catch(e)
    {
//    alert("i=" + i + " len=" + items.length );
      caller.stopFlashingIcon();
      caller.reload = false;
      inforssDebug(e, caller);
    }
    inforssTraceOut(caller);
  };

//-------------------------------------------------------------------------------------------------------------
  self.readFeed2 = function(i, items, home, url, re, caller)
  {
    inforssTraceIn(caller);
    try
    {
//dump("read length=" + caller.headlines.length + "\n");
      if (i < caller.headlines.length)
      {
        if (caller.headlines[i].url == url)
        {
          var find = false;
          var j = 0;
          var label = null;
          var guid = null;
//dump("cherche " + caller.headlines[i].title + "\n");
          while ((j < items.length) && (find == false))
          {
            label = inforssFeed.getNodeValue(items[j].getElementsByTagName(caller.titleAttribute));
            if (label != null)
            {
              label = inforssFeed.htmlFormatConvert(label).replace(re, ' ');
            }
            guid = caller.getLink(items[j].getElementsByTagName(caller.alternateLinkAttribute));
//dump("evalue " + caller.headlines[i].title + " / " + label + "\n");
            if ((guid != null) && (caller.headlines[i].guid != null))
            {
              if (caller.headlines[i].guid == guid)
              {
                find = true;
              }
              else
              {
                j++;
              }
            }
            else
            {
              if (label == caller.headlines[i].title)
              {
                find = true;
              }
              else
              {
                j++;
              }
            }
          }
//dump("trouve : " + find + "\n");
          if (find == false)
          {
//dump("supprime \n");
            caller.removeHeadline(i);
            i--;
          }
          label = null;
          guid = null;
        }
      }
      i++;
      if (i < caller.headlines.length)
      {
        window.setTimeout(caller.readFeed2, eval(inforssXMLRepository.getTimeSlice()), i, items, home, url, re, caller);
      }
      else
      {
        delete items;
//        caller.limitSizeHeadline();
        caller.manager.signalReadEnd(caller);
        caller.xmlHttpRequest = null;
        caller.stopFlashingIcon();
        caller.reload = false;
      }
//dump("fin read: " + caller.headlines.length + "\n");
    }
    catch(e)
    {
      inforssDebug(e, caller);
      caller.stopFlashingIcon();
      caller.reload = false;
    }
    inforssTraceOut(caller);
  };

//-------------------------------------------------------------------------------------------------------------
  self.handleFetchTimeout = function()
  {
    inforssTraceIn(this);
    try
    {
//dump("handleFetchTimeout: " + this.getUrl() + "\n");
      this.abortRequest();
	  this.clearFetchTimeout();
      this.stopFlashingIcon();
      this.reload = false;
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  };

//-------------------------------------------------------------------------------------------------------------
  self.handleFetchTimeout1 = function()
  {
    inforssTraceIn(this);
    try
    {
//dump("handleFetchTimeout1: " + this.getUrl() + "\n");
      this.manager.signalReadEnd(this);
	  this.handleFetchTimeout();
	  this.reload = false;
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  };

//-------------------------------------------------------------------------------------------------------------
  self.isBusy = function()
  {
    return (this.xmlHttpRequest != null);
  };

//-------------------------------------------------------------------------------------------------------------
  self.addHeadline = function(receivedDate, pubDate, label, guid, link, description, url, home, category, enclosureUrl, enclosureType, enclosureSize)
  {
    inforssTraceIn(this);
    const reg1 = new RegExp("^[a-zA-Z]*[,]*[ ]*([0-9]{1,2}) ([a-zA-Z]{3}) ([0-9]{4}) ([0-9]{2}):([0-9]{2}):([0-9]{2})", "ig");
    const reg2 = new RegExp("^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2})(.*)", "ig");
    const reg3 = new RegExp(":([0-9]{2})([\-\+])([0-9]{2}):([0-9]{2})");
    const reg4 = new RegExp(":([0-9]{2})Z");
    const reg5 = new RegExp("([\-\+])([0-9]{2}):([0-9]{2})");
    var res = null;
//dump("add headline=" + label + "\n");
    try
    {
//      var reg1 = new RegExp("^[a-zA-Z]*[,]*[ ]*([0-9]{1,2}) ([a-zA-Z]{3}) ([0-9]{4}) ([0-9]{2}):([0-9]{2}):([0-9]{2})", "ig");
      if (pubDate == null)
      {
        pubDate = receivedDate;
//dump("##### 1 pubDate=" + pubDate + "\n");
      }
      else
      {
        if (reg1.exec(pubDate) != null)
        {
          pubDate = new Date(pubDate);
//dump("##### 2 pubDate=" + pubDate + "\n");
        }
        else
        {
//          var reg2 = new RegExp("^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2})(.*)", "ig");
          res = reg2.exec(pubDate);
          if (res != null)
          {
            var year = res[1];
            var month = res[2];
            var day = res[3];
            var hour = res[4];
            var min = res[5];
            var remain = res[6];
            var ghour = 0;
            var gmin = 0;
            var sec = 0;
            var sign = "+";
//            var reg3 = new RegExp(":([0-9]{2})([\-\+])([0-9]{2}):([0-9]{2})");
            res = reg3.exec(remain);
            if (res != null)
            {
              sec = res[1];
              sign = res[2];
              ghour = res[3];
              gmin = res[4];
            }
            else
            {
//              var reg4 = new RegExp(":([0-9]{2})Z");
              res = reg4.exec(remain);
              if (res != null)
              {
                sec = res[1];
              }
              else
              {
//                var reg5 = new RegExp("([\-\+])([0-9]{2}):([0-9]{2})");
                res = reg5.exec(remain);
                if (res != null)
                {
                  sign = res[1];
                  ghour = res[2];
                  gmin = res[3];
                }
//                reg5 = null;
              }
//              reg4 = null;
            }
//            reg3 = null;
            var utc = Date.UTC(year, month-1, day, hour, min, sec);
            if (sign == "+")
            {
              pubDate = new Date(utc - ghour * 3600000 - gmin * 60000);
//dump("##### 3 pubDate=" + pubDate + "\n");
            }
            else
            {
              pubDate = new Date(utc + ghour * 3600000 + gmin * 60000);
//dump("##### 4 pubDate=" + pubDate + "\n");
            }
            year = null;
            month = null;
            day = null;
            hour = null;
            min = null;
            remain = null;
            ghour = null;
            gmin = null;
            sec = null;
            sign = null;
          }
          else
          {
            pubDate = receivedDate;
//dump("##### 5 pubDate=" + pubDate + "\n");
          }
//          reg2 = null;
        }
      }
//      reg1 = null;
      this.headlines.unshift(new inforssHeadline(receivedDate, pubDate, label, guid, link, description, url, home, category, enclosureUrl, enclosureType, enclosureSize, this));
//dump("fin add headline=" + label + "\n");
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  };

//-------------------------------------------------------------------------------------------------------------
  self.removeHeadline = function(i)
  {
    inforssTraceIn(this);
    try
    {
      this.headlines[i].resetHbox();
      delete this.headlines[i];
      this.headlines.splice(i,1);
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  };

//-------------------------------------------------------------------------------------------------------------
  self.limitSizeHeadline = function()
  {
    inforssTraceIn(this);
    try
    {
//    if (this.headlines.length > 30)
//    {
//      this.headlines.splice(30);
//    }
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  };

//-------------------------------------------------------------------------------------------------------------
  self.findHeadline = function(url, label, guid, link)
  {
//dump("find - url =" + url + " label=" + label + " guid=" + guid + "\n");
    inforssTraceIn(this);
    try
    {
      var find = false;
      var i = 0;
      while ((i< this.headlines.length) && (find == false))
      {
        if (this.headlines[i].url == url) // && (this.headlines[i].link == link))
        {
//dump("findHeadline : this.headlines[" + i + "].guid=" + this.headlines[i].guid + "\n");
          if ((guid != null) && (this.headlines[i].guid != null))
          {
            if (this.headlines[i].guid == guid)
            {
              find = true;
            }
            else
            {
              i++;
            }
          }
          else
          {
            if (this.headlines[i].title == label)
            {
	      find = true;
	    }
            else
            {
              i++;
            }
          }
        }
        else
        {
          i++;
        }
      }
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
//dump("findHeadline=" + find + " type=" + type + "\n");
    return (find == false)? null : this.headlines[i];
  };

//-------------------------------------------------------------------------------------------------------------
  self.startSchedule = function()
  {
    inforssTraceIn(this);
    var refetch = false;
    try
    {
      var delay = this.feedXML.getAttribute("refresh");
//dump("delay=" + delay + "\n");
      var refresh = delay * INFORSS_FREQUENCY;
      if (this.lastRefresh == null)
      {
        refetch = true;
      }
      else
      {
        var date = new Date().getTime();
        if ((date - this.lastRefresh.getTime()) < (refresh - 5000))
        {
          refresh = (date - this.lastRefresh.getTime());
        }
        else
        {
          refetch = true;
        }
      }
//dump("date=" + new Date() + "\n");
//dump("last=" + this.lastRefresh + "\n");
//dump("refresh=" + refresh + "\n");
//dump("refetch=" + refetch + "\n");
      this.clearScheduleTimeout();
      this.scheduleTimeout = inforssSetTimer(this, "fetchFeed", refresh);
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
    return refetch;
  };

//-------------------------------------------------------------------------------------------------------------
  self.startFlashingIconTimeout = function()
  {
//dump("startFlashingIconTimeout\n");
    inforssTraceIn(this);
    try
    {
      this.clearFlashingIconTimeout();
      this.flashingIconTimeout = inforssSetTimer(this, "flashIcon", INFORSS_FLASH_ICON);
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  };

//-------------------------------------------------------------------------------------------------------------
  self.stopSchedule = function()
  {
    inforssTraceIn(this);
    try
    {
      this.clearScheduleTimeout();
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  };

//-------------------------------------------------------------------------------------------------------------
  self.clearScheduleTimeout = function()
  {
    inforssTraceIn(this);
    try
    {
      if (this.scheduleTimeout != null)
      {
        window.clearTimeout(this.scheduleTimeout);
        inforssClearTimer(this.scheduleTimeout);
        this.scheduleTimeout = null;
      }
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  };

//-------------------------------------------------------------------------------------------------------------
  self.resetCandidateHeadlines = function()
  {
    if (this.candidateHeadlines != null)
    {
	  delete this.candidateHeadlines;
    }
    this.candidateHeadlines = new Array();
  };

//-------------------------------------------------------------------------------------------------------------
  self.pushCandidateHeadline = function(headline)
  {
    this.candidateHeadlines.push(headline);
  };

//-------------------------------------------------------------------------------------------------------------
  self.getCandidateHeadlines = function()
  {
    return this.candidateHeadlines;
  };

//-------------------------------------------------------------------------------------------------------------
  self.getDisplayedHeadlines = function()
  {
    return this.displayedHeadlines;
  };

//-------------------------------------------------------------------------------------------------------------
  self.setDisplayedHeadlines = function(list)
  {
    if (this.displayedHeadlines != null)
    {
	  delete this.displayedHeadlines;
    }
    this.displayedHeadlines = list;
  };

//-------------------------------------------------------------------------------------------------------------
  self.setViewed = function(title, link)
  {
    inforssTraceIn(this);
    try
    {
      var find = false;
      var i = 0;
      while ((i < this.displayedHeadlines.length) && (find == false))
      {
        if ((this.displayedHeadlines[i].link == link) && (this.displayedHeadlines[i].title.indexOf(title) == 0))
        {
          find = true;
          this.displayedHeadlines[i].setViewed();
          this.manager.signalReadEnd(this);
        }
        else
        {
          i++;
        }
      }
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
    return find;
  };

//-------------------------------------------------------------------------------------------------------------
  self.setBanned = function(title, link)
  {
    inforssTraceIn(this);
//dump("debut setBanned\n");
    try
    {
      var find = false;
      var i = 0;
      while ((i < this.displayedHeadlines.length) && (find == false))
      {
        if ((this.displayedHeadlines[i].link == link) && (this.displayedHeadlines[i].title.indexOf(title) == 0))
        {
          find = true;
          this.displayedHeadlines[i].setBanned();
          this.manager.signalReadEnd(this);
//dump("trouve banned\n");
        }
        else
        {
          i++;
        }
      }
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
//dump("fin setBanned\n");
    return find;
  };

//-------------------------------------------------------------------------------------------------------------
  self.setBannedAll = function()
  {
    inforssTraceIn(this);
    try
    {
      for (var i = 0; i < this.headlines.length; i++)
      {
        this.headlines[i].setBanned();
      }
      this.manager.signalReadEnd(this);
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  };

//-------------------------------------------------------------------------------------------------------------
  self.viewAll = function()
  {
    inforssTraceIn(this);
    try
    {
      for (var i = 0; i < this.displayedHeadlines.length; i++)
      {
        this.manager.openTab(this.displayedHeadlines[i].getLink());
        this.displayedHeadlines[i].setViewed();
      }
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  };

//-------------------------------------------------------------------------------------------------------------
  self.resetHbox = function()
  {
    inforssTraceIn(this);
    try
    {
      for (var i = 0; i < this.headlines.length; i++)
      {
        this.headlines[i].resetHbox();
      }
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  };

//-------------------------------------------------------------------------------------------------------------
  self.flashIcon = function()
  {
//dump("flashIcon:" + this.flashingDirection + "\n");
    inforssTraceIn(this);
    try
    {
      if (this.mainIcon == null)
      {
        var subElement = document.getAnonymousNodes(document.getElementById('inforss-icon'));
        this.mainIcon = subElement[0];
        subElement = null;
      }
      var opacity = this.mainIcon.style.MozOpacity;
      if ((opacity == null) || (opacity == ""))
      {
        opacity = 1;
        this.flashingDirection = -0.5;
      }
      opacity = eval(opacity) + this.flashingDirection;
      if ((opacity < 0) || (opacity > 1))
      {
        this.flashingDirection = -this.flashingDirection;
        opacity = eval(opacity) + this.flashingDirection;
      }
      this.setMainIconOpacity(opacity);
      this.startFlashingIconTimeout();
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  };

//-------------------------------------------------------------------------------------------------------------
  self.setMainIconOpacity = function(opacity)
  {
//dump("setMainIconOpacity=" + opacity + "\n");
    inforssTraceIn(this);
    try
    {
      if (this.mainIcon == null)
      {
        var subElement = document.getAnonymousNodes(document.getElementById('inforss-icon'));
        this.mainIcon = subElement[0];
        delete subElement;
        subElement = null;
      }
      this.mainIcon.style.MozOpacity = opacity;
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  };

//-------------------------------------------------------------------------------------------------------------
  self.changeMainIcon = function()
  {
//dump("changeMainIcon=" + opacity + "\n");
    inforssTraceIn(this);
    try
    {
      if (this.mainIcon == null)
      {
        var subElement = document.getAnonymousNodes(document.getElementById('inforss-icon'));
        this.mainIcon = subElement[0];
        delete subElement;
        subElement = null;
      }
	  if ((this.selectedFeed != null) && (this.selectedFeed.getType() == "group") && (inforssXMLRepository.isSynchronizeIcon() == true))
	  {
	    this.mainIcon.setAttribute("src", this.getIcon());
      }
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  };

//-------------------------------------------------------------------------------------------------------------
  self.resetMainIcon = function()
  {
//dump("changeMainIcon=" + opacity + "\n");
    inforssTraceIn(this);
    try
    {
      if (this.mainIcon == null)
      {
        var subElement = document.getAnonymousNodes(document.getElementById('inforss-icon'));
        this.mainIcon = subElement[0];
        delete subElement;
        subElement = null;
      }
	  if ((this.selectedFeed != null) && (this.selectedFeed.getType() == "group") && (inforssXMLRepository.isSynchronizeIcon() == true))
	  {
	    this.mainIcon.setAttribute("src", this.selectedFeed.getIcon());
      }
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  };

//-------------------------------------------------------------------------------------------------------------
  self.getNbUnread = function()
  {
    inforssTraceIn(this);
    var returnValue = 0;
    try
    {
      if (this.displayedHeadlines != null)
      {
        for (var i = 0; i < this.displayedHeadlines.length; i++)
        {
          if ((this.displayedHeadlines[i].viewed == false) &&
              (this.displayedHeadlines[i].banned == false))
          {
            returnValue++;
          }
        }
      }
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
    return returnValue;
  };

//-------------------------------------------------------------------------------------------------------------
  self.getNbNew = function()
  {
    inforssTraceIn(this);
    var returnValue = 0;
    try
    {
      if (this.displayedHeadlines != null)
      {
        for (var i = 0; i < this.displayedHeadlines.length; i++)
        {
          if (this.displayedHeadlines[i].isNew() == true)
          {
            returnValue++;
          }
        }
      }
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
    return returnValue;
  };

//-------------------------------------------------------------------------------------------------------------
  self.getNbHeadlines = function()
  {
    inforssTraceIn(this);
    var returnValue = 0;
    try
    {
      if (this.headlines != null)
      {
        returnValue = this.headlines.length;
      }
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
    return returnValue;
  };


//-------------------------------------------------------------------------------------------------------------
  self.manualRefresh = function()
  {
    inforssTraceIn(this);
    try
    {
      this.clearFetchTimeout();
      this.abortRequest();
      this.clearScheduleTimeout();
      this.stopFlashingIcon();
      this.lastRefresh = null;
      this.fetchFeed();
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  };


  return self;
}

//-------------------------------------------------------------------------------------------------------------
inforssFeed.getNodeValue = function(obj)
{
  var returnValue = null;
  if ((obj == null) || (obj.length == 0) || (obj[0].firstChild == null))
  {
    returnValue = null;
  }
  else
  {
//dump("-->" + obj[0].firstChild.nodeValue + "\n");
    if (obj[0].firstChild.nextSibling != null)
    {
//dump("aaaa1\n");
      var ser = new XMLSerializer();
      var str = ser.serializeToString(obj[0].firstChild);
//dump("aaaa2\n");
      str = str.replace(/<[ ]*div[^>]*>/gi,"");
//dump("aaaa3\n");
      str = str.replace(/<[ ]*img[^>]*>/gi,"");
//dump("aaaa4\n");
      str = str.replace(/<[ ]*p[^>]*>/gi,"");
      str = str.replace(/<[ ]*script[^>]*>/gi,"");
      str = str.replace(/<[ ]*span[^>]*>/gi,"");
      str = str.replace(/<[ ]*iframe[^>]*>/gi,"");
      str = str.replace(/<[ ]*object[^>]*>/gi,"");
      str = str.replace(/<[ ]*font[^>]*>/gi,"");
      str = str.replace(/<[ ]*strong[^>]*>/gi,"");
      returnValue = str;
      delete ser;
      ser = null;
/*
//dump("aaaa\n");
      if (obj[0].firstChild.nextSibling.nodeValue != null)
      {
//dump("bbbb " + (obj[0].firstChild.nextSibling.nodeValue.indexOf("<div") == 0) + "\n");
        returnValue = ((obj[0].firstChild.nextSibling.nodeValue.indexOf("<div") == 0) || (obj[0].firstChild.nextSibling.nodeValue.indexOf("<p") == 0))? obj[0].firstChild.nodeValue : obj[0].firstChild.nextSibling.nodeValue;
      }
      else
      {
//dump("cccc\n");
//dump("getNodeValue=" + returnValue + "\n");
        var ser = new XMLSerializer();
//     dump(ser.serializeToString(obj[0].firstChild.nextSibling) + "\n");
//  inforssInspect(obj[0].firstChild.nextSibling, null, false);
        returnValue = ser.serializeToString(obj[0].firstChild.nextSibling);
        delete ser;
        ser = null;
      }
*/
    }
    else
    {
//dump("dddd\n");
      returnValue = obj[0].firstChild.nodeValue;
    }
  }
//dump("ReturnValue=" + returnValue + "\n");
  return returnValue;
}

//-------------------------------------------------------------------------------------------------------------
inforssFeed.htmlFormatConvert = function(str, keep, mimeTypeFrom, mimeTypeTo)
{
//alert("des2=" + str);
  var formatConverter = Components.classes["@mozilla.org/widget/htmlformatconverter;1"].createInstance(Components.interfaces.nsIFormatConverter);
  var convertedString = null;
  if (keep == null) keep = true;
  if (mimeTypeFrom == null) mimeTypeFrom = "text/html";
  if (mimeTypeTo == null) mimeTypeTo = "text/unicode";
  if (str != null)
  {
    var fromString = Components.classes["@mozilla.org/supports-string;1"].createInstance(Components.interfaces.nsISupportsString);
    if (keep == true)
    {
      str = str.replace(/</gi,"__LT__");
      str = str.replace(/>/gi,"__GT__");
    }
    fromString.data = str;
    var toString = { value: null };

    try
    {
      formatConverter.convert(mimeTypeFrom, fromString, fromString.toString().length, mimeTypeTo, toString, {});
	  if (toString.value)
	  {
	    toString = toString.value.QueryInterface(Components.interfaces.nsISupportsString);
	    convertedString = toString.toString();
	    if (keep == true)
	    {
          convertedString = convertedString.replace(/__LT__/gi,"<");
          convertedString = convertedString.replace(/__GT__/gi,">");
        }
	  }
	  else
	  {
	    convertedString = str;
//alert("des4=" + convertedString);
	  }
    }
    catch(e)
    {
      convertedString = str;
    }
  }
  formatConverter = null;
  if (fromString != null) delete fromString;
  fromString = null;
  str = null;
  if (toString != null) delete toString;
  toString = null;
  return convertedString;
}

//-------------------------------------------------------------------------------------------------------------
inforssFeed.removeScript = function(description)
{
//dump("**** description avant=" + description + "\n");
//  var tmp = description.match(/(.*)\<(?:SCRIPT|script)[^<]*\<\/(?:SCRIPT|script)\>(.*)/gm);
  var index1 = description.indexOf("<SCRIPT");
  if (index1 == -1)
  {
    index1 = description.indexOf("<script");
  }
  var index2 = description.indexOf("</SCRIPT>");
  if (index2 == -1)
  {
    index2 = description.indexOf("</script>");
  }

//alert(tmp);
  while ((index1 != -1) && (index2 != -1))
  {
//dump("**** tmp[1]=" + tmp[1] + "\n");
//dump("**** tmp[2]=" + tmp[2] + "\n");

    description = description.substring(0,index1) + description.substring(index2 + 9);
    index1 = description.indexOf("<SCRIPT");
    if (index1 == -1)
    {
      index1 = description.indexOf("<script");
    }
    index2 = description.indexOf("</SCRIPT>");
    if (index2 == -1)
    {
      index2 = description.indexOf("</script>");
    }
  }
//dump("**** description apres=" + description + "\n");
  return description;
}



