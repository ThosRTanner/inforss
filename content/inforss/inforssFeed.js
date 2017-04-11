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
Components.utils.import("chrome://inforss/content/modules/inforssDebug.jsm");

/* globals inforssXMLRepository, inforssHeadline, ObserverService */
/* globals inforssInformation, inforssFTPDownload */

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
  self.syncTimer = null;
  self.flashingIconTimeout = null;
  self.mainIcon = null;
  self.flashingDirection = -0.5;
  self.selectedFeed = null;
  self.lastRefresh = null;
  self.reload = false;

  //----------------------------------------------------------------------------
  self.activate_after = function(timeout)
  {
    return window.setTimeout(this.activate.bind(this), timeout);
  };

  //----------------------------------------------------------------------------
  self.activate = function()
  {
    inforssTraceIn(this);
    try
    {
      if (!this.active)
      {
        this.active = true;
        this.selectedFeed = this.manager.getSelectedInfo(false);
        if (this.headlines == null || this.headlines.length == 0)
        {
          this.synchronizeWithOther();
        }
        else
        {
          this.manager.publishFeed(this);
          this.fetchFeed();
        }
      }
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  };

  //----------------------------------------------------------------------------
  self.synchronizeWithOther = function()
  {
    inforssTraceIn(this);
    try
    {
      this.insync = true;
      this.clearSyncTimer();
      ObserverService.notifyObservers(null, "sync", this.getUrl());
      this.syncTimer = window.setTimeout(this.syncTimeout.bind(this), 1000);
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  };

  //----------------------------------------------------------------------------
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
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  };

  //----------------------------------------------------------------------------
  self.clearSyncTimer = function()
  {
    window.clearTimeout(this.syncTimer);
    this.syncTimer = null;
  };

  //----------------------------------------------------------------------------
  self.getXmlHeadlines = function()
  {
    inforssTraceIn(this);
    try
    {
      let xml = "<headlines url=\"" + this.getUrl() + "\">\n";
      if (this.headlines != null)
      {
        for (let headline of this.headlines)
        {
          xml += headline;
        }
      }
      xml += "</headlines>";
      return xml;
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    finally
    {
      inforssTraceOut(this);
    }
    return null;
  };

  //----------------------------------------------------------------------------
  self.synchronize = function(objDoc)
  {
    inforssTraceIn(this);
    try
    {
      if (this.insync)
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
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  };

  //----------------------------------------------------------------------------
  self.passivate = function()
  {
    inforssTraceIn(this);
    try
    {
      if (this.active)
      {
        this.manager.unpublishFeed(this);
      }
      this.active = false;
      this.clearFetchTimeout();
      this.abortRequest();
      this.clearScheduleTimeout();
      this.stopFlashingIcon();
      this.selectedFeed = null;
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  };

  //----------------------------------------------------------------------------
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
        let refetch = false;
        if (this.isActive())
        {
          refetch = this.startSchedule();
        }

        if (this.getFeedActivity() && !this.isBrowserOffLine())
        {
          if (this.manager.cycleGroup == null &&
              this.manager.getSelectedInfo(false).getUrl() == this.getUrl())
          {
            this.manager.updateMenuIcon(this);
          }
          this.changeMainIcon();
          if (inforssXMLRepository.isFlashingIcon() && refetch)
          {
            this.startFlashingIconTimeout();
          }
        }

        this.clearFetchTimeout();

        if (this.getFeedActivity() && !this.isBrowserOffLine() && refetch)
        {
          this.reload = true;
          let url = this.feedXML.getAttribute("url");
          let user = this.feedXML.getAttribute("user");
          let password = inforssXMLRepository.readPassword(url, user);
          if ((this.getEncoding() == null || this.getEncoding() == "") &&
              this.getType() != "nntp")
          {
            this.fetchTimeout = window.setTimeout(this.handleFetchTimeout1.bind(this), INFORSS_FETCH_TIMEOUT);
            if (this.xmlHttpRequest != null)
            {
              this.xmlHttpRequest.caller = null;
              this.xmlHttpRequest.onload = null;
              this.xmlHttpRequest.onerror = null;
              delete this.xmlHttpRequest;
            }
            this.xmlHttpRequest = new XMLHttpRequest();
            this.xmlHttpRequest.onload = this.readFeed;
            this.xmlHttpRequest.caller = this;
            this.xmlHttpRequest.onerror = this.errorRequest;
            this.xmlHttpRequest.open("GET", url, true, user, password);
            if (this.getType() != "html")
            {
              this.xmlHttpRequest.overrideMimeType("application/xml");
            }
            this.xmlHttpRequest.send(null);
          }
          else
          {
            if (this.getType() != "nntp")
            {
              var ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
              var uri = ioService.newURI(url, null, null);
              this.xmlHttpRequest = new inforssFTPDownload();
              this.xmlHttpRequest.start(uri, this, this.fetchHtmlCallback, this.fetchHtmlCallback);
            }
            else
            {
              this.readFeed();
            }
          }
        }
      }
    }
    catch (e)
    {
      this.stopFlashingIcon();
      this.reload = false;
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  };

  //----------------------------------------------------------------------------
  self.clearFetchTimeout = function()
  {
    window.clearTimeout(this.fetchTimeout);
    this.fetchTimeout = null;
  };

  //----------------------------------------------------------------------------
  self.clearFlashingIconTimeout = function()
  {
    window.clearTimeout(this.flashingIconTimeout);
    this.flashingIconTimeout = null;
  };

  //----------------------------------------------------------------------------
  self.stopFlashingIcon = function()
  {
    inforssTraceIn(this);
    try
    {
      let timeout = this.flashingIconTimeout;
      this.clearFlashingIconTimeout();
      if (timeout != null)
      {
        this.setMainIconOpacity(1);
      }
      this.resetMainIcon();
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  };

  //----------------------------------------------------------------------------
  self.abortRequest = function()
  {
    inforssTraceIn(this);
    try
    {
      if (this.xmlHttpRequest != null)
      {
        this.xmlHttpRequest.abort();
        this.xmlHttpRequest = null;
      }
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  };

  //----------------------------------------------------------------------------
  self.errorRequest = function()
  {
    inforssTraceIn(this);
    this.caller.handleFetchTimeout1();
    inforssTraceOut(this);
  };

  //----------------------------------------------------------------------------
  self.readFeed = function()
  {
    inforssTraceIn(this);
    try
    {
      this.caller.lastRefresh = new Date();
      this.caller.clearFetchTimeout();
      var objDoc = this.responseXML;
      if (objDoc != null)
      {
        let home = this.caller.feedXML.getAttribute("link");
        let url = this.caller.feedXML.getAttribute("url");

        let items = objDoc.getElementsByTagName(this.caller.itemAttribute);
        let re = new RegExp('\n', 'gi');
        let receivedDate = new Date();
        //FIXME Replace with a sequence of promises
        window.setTimeout(this.caller.readFeed1, 0, items.length - 1, items, receivedDate, home, url, re, this.caller);
      }
      objDoc = null;
      this.caller.xmlHttpRequest.onload = null;
      this.caller.xmlHttpRequest.onerror = null;
      var feed = this.caller;
      this.caller.xmlHttpRequest.caller = null;
      delete feed.xmlHttpRequest;
      feed.xmlHttpRequest = null;
    }
    catch (e)
    {
      this.caller.stopFlashingIcon();
      inforssDebug(e, this);
      this.reload = false;
    }
    inforssTraceOut(this);
  };

  //----------------------------------------------------------------------------
  self.readFeed1 = function(i, items, receivedDate, home, url, re, caller)
  {
    inforssTraceIn(caller);
    try
    {
      if (i >= 0)
      {
        const item = items[i];
        let label = inforssFeed.getNodeValue(item.getElementsByTagName(caller.titleAttribute));
        if (label == null)
        {
          label = "";
        }
        else
        {
          label = inforssFeed.htmlFormatConvert(label).replace(re, ' ');
        }
        const link = caller.get_link(item);
        let description = null;
        if (caller.itemDescriptionAttribute.indexOf("|") == -1)
        {
          description = inforssFeed.getNodeValue(item.getElementsByTagName(caller.itemDescriptionAttribute));
        }
        else
        {
          const pos = caller.itemDescriptionAttribute.indexOf("|");
          let des1 = caller.itemDescriptionAttribute.substring(0, pos);
          description = inforssFeed.getNodeValue(item.getElementsByTagName(des1));
          if (description == null)
          {
            des1 = caller.itemDescriptionAttribute.substring(pos + 1);
            description = inforssFeed.getNodeValue(item.getElementsByTagName(des1));
          }
        }
        if (description != null)
        {
          description = inforssFeed.htmlFormatConvert(description).replace(re, ' ');
          description = inforssFeed.removeScript(description);
        }
        const category = inforssFeed.getNodeValue(item.getElementsByTagName("category"));
        const pubDate = caller.getPubDate(item);

        const enclosure = item.getElementsByTagName("enclosure");
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
          if (link != null && link.indexOf(".mp3") != -1)
          {
            enclosureUrl = link;
            enclosureType = "audio/mp3";
          }
        }

        let guid = caller.get_guid(item);
        if (guid == null || guid == "")
        {
          guid = link;
        }
        if (caller.findHeadline(url, label, guid) == null)
        {
          caller.addHeadline(receivedDate, pubDate, label, guid, link, description, url, home, category, enclosureUrl, enclosureType, enclosureSize);
        }
      }
      i--;
      if (i >= 0)
      {
        window.setTimeout(caller.readFeed1, inforssXMLRepository.getTimeSlice(), i, items, receivedDate, home, url, re, caller);
      }
      else
      {
        window.setTimeout(caller.readFeed2, inforssXMLRepository.getTimeSlice(), 0, items, home, url, re, caller);
      }
    }
    catch (e)
    {
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
      if (i < caller.headlines.length)
      {
        if (caller.headlines[i].url == url)
        {
          var find = false;
          var j = 0;
          var label = null;
          var guid = null;
          while ((j < items.length) && (find == false))
          {
            label = inforssFeed.getNodeValue(items[j].getElementsByTagName(caller.titleAttribute));
            if (label != null)
            {
              label = inforssFeed.htmlFormatConvert(label).replace(re, ' ');
            }
            guid = caller.get_guid(items[j]);
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
          if (find == false)
          {
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
        window.setTimeout(caller.readFeed2, inforssXMLRepository.getTimeSlice(), i, items, home, url, re, caller);
      }
      else
      {
        caller.manager.signalReadEnd(caller);
        caller.xmlHttpRequest = null;
        caller.stopFlashingIcon();
        caller.reload = false;
      }
    }
    catch (e)
    {
      inforssDebug(e, caller);
      caller.stopFlashingIcon();
      caller.reload = false;
    }
    inforssTraceOut(caller);
  };

  //----------------------------------------------------------------------------
  self.handleFetchTimeout = function()
  {
    inforssTraceIn(this);
    try
    {
      this.abortRequest();
      this.clearFetchTimeout();
      this.stopFlashingIcon();
      this.reload = false;
    }
    catch (e)
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
      this.manager.signalReadEnd(this);
      this.handleFetchTimeout();
      this.reload = false;
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  };

  //----------------------------------------------------------------------------
  self.isBusy = function()
  {
    return this.xmlHttpRequest != null;
  };

  //----------------------------------------------------------------------------
  self.addHeadline = function(receivedDate, pubDate, label, guid, link, description, url, home, category, enclosureUrl, enclosureType, enclosureSize)
  {
    inforssTraceIn(this);
    const reg1 = new RegExp("^[a-zA-Z]*[,]*[ ]*([0-9]{1,2}) ([a-zA-Z]{3}) ([0-9]{4}) ([0-9]{2}):([0-9]{2}):([0-9]{2})", "ig");
    const reg2 = new RegExp("^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2})(.*)", "ig");
    const reg3 = new RegExp(":([0-9]{2})([\-\+])([0-9]{2}):([0-9]{2})");
    const reg4 = new RegExp(":([0-9]{2})Z");
    const reg5 = new RegExp("([\-\+])([0-9]{2}):([0-9]{2})");
    var res = null;
    try
    {
      if (pubDate == null)
      {
        pubDate = receivedDate;
      }
      else
      {
        //FIXME Oh, come on. Dates are in RFC format.
        if (reg1.exec(pubDate) != null)
        {
          pubDate = new Date(pubDate);
        }
        else
        {
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
              res = reg4.exec(remain);
              if (res != null)
              {
                sec = res[1];
              }
              else
              {
                res = reg5.exec(remain);
                if (res != null)
                {
                  sign = res[1];
                  ghour = res[2];
                  gmin = res[3];
                }
              }
            }
            var utc = Date.UTC(year, month - 1, day, hour, min, sec);
            if (sign == "+")
            {
              pubDate = new Date(utc - ghour * 3600000 - gmin * 60000);
            }
            else
            {
              pubDate = new Date(utc + ghour * 3600000 + gmin * 60000);
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
          }
        }
      }
      this.headlines.unshift(new inforssHeadline(receivedDate, pubDate, label, guid, link, description, url, home, category, enclosureUrl, enclosureType, enclosureSize, this));
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  };

  //----------------------------------------------------------------------------
  self.removeHeadline = function(i)
  {
    inforssTraceIn(this);
    try
    {
      this.headlines[i].resetHbox();
      delete this.headlines[i];
      this.headlines.splice(i, 1);
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  };

  //----------------------------------------------------------------------------
  self.limitSizeHeadline = function()
  {
    /* FIXME this whole function does nothing but shouldn't it?
       or is that done elsewhere now
    inforssTraceIn(this);
    try
    {
      if (this.headlines.length > 30)
      {
        this.headlines.splice(30);
      }
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
    */
  };

  //----------------------------------------------------------------------------
  self.findHeadline = function(url, label, guid)
  {
    inforssTraceIn(this);
    try
    {
      for (let headline of this.headlines)
      {
        if (headline.url == url)
        {
          if (guid != null && headline.guid != null)
          {
            if (headline.guid == guid)
            {
              return headline;
            }
          }
          else if (headline.title == label)
          {
            return headline;
          }
        }
      }
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    finally
    {
      inforssTraceOut(this);
    }
    return null;
  };

  //----------------------------------------------------------------------------
  self.startSchedule = function()
  {
    inforssTraceIn(this);
    var refetch = false;
    try
    {
      var delay = this.feedXML.getAttribute("refresh");
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
      this.clearScheduleTimeout();
      this.scheduleTimeout = window.setTimeout(this.fetchFeed.bind(this), refresh);
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
    return refetch;
  };

  //----------------------------------------------------------------------------
  self.startFlashingIconTimeout = function()
  {
    this.clearFlashingIconTimeout();
    this.flashingIconTimeout = window.setTimeout(this.flashIcon.bind(this), INFORSS_FLASH_ICON);
  };

  //----------------------------------------------------------------------------
  self.clearScheduleTimeout = function()
  {
    window.clearTimeout(this.scheduleTimeout);
    this.scheduleTimeout = null;
  };

  //----------------------------------------------------------------------------
  self.resetCandidateHeadlines = function()
  {
    this.candidateHeadlines = new Array();
  };

  //----------------------------------------------------------------------------
  self.pushCandidateHeadline = function(headline)
  {
    this.candidateHeadlines.push(headline);
  };

  //----------------------------------------------------------------------------
  self.getCandidateHeadlines = function()
  {
    return this.candidateHeadlines;
  };

  //----------------------------------------------------------------------------
  self.getDisplayedHeadlines = function()
  {
    return this.displayedHeadlines;
  };

  //----------------------------------------------------------------------------
  self.setDisplayedHeadlines = function(list)
  {
    this.displayedHeadlines = list;
  };

  //----------------------------------------------------------------------------
  self.setViewed = function(title, link)
  {
    inforssTraceIn(this);
    try
    {
      // js-hint doesn't seem to like for (const x) much
      for (let headline of this.displayedHeadlines)
      {
        //TODO why indexOf? Why not just see if they are the same?
        if (headline.link == link && headline.title.indexOf(title) == 0)
        {
          headline.setViewed();
          this.manager.signalReadEnd(this);
          return true;
        }
      }
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    finally
    {
      inforssTraceOut(this);
    }
    return false;
  };

  //----------------------------------------------------------------------------
  self.viewAll = function()
  {
    inforssTraceIn(this);
    try
    {
      for (let headline of this.displayedHeadlines)
      {
        this.manager.openTab(headline.getLink());
        headline.setViewed();
      }
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  };

  //----------------------------------------------------------------------------
  self.setBanned = function(title, link)
  {
    inforssTraceIn(this);
    try
    {
      // js-hint doesn't seem to like for (const x) much
      for (let headline of this.displayedHeadlines)
      {
        //TODO why indexOf? Why not just see if they are the same?
        if (headline.link == link && headline.title.indexOf(title) == 0)
        {
          headline.setBanned();
          this.manager.signalReadEnd(this);
          return true;
        }
      }
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    finally
    {
      inforssTraceOut(this);
    }
    return false;
  };

  //----------------------------------------------------------------------------
  self.setBannedAll = function()
  {
    inforssTraceIn(this);
    try
    {
      //TODO why headlines rather than displayed headlines
      for (let headline of this.headlines)
      {
        headline.setBanned();
      }
      this.manager.signalReadEnd(this);
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  };

  //----------------------------------------------------------------------------
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
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  };

  //----------------------------------------------------------------------------
  self.flashIcon = function()
  {
    inforssTraceIn(this);
    try
    {
      if (this.mainIcon == null)
      {
        var subElement = document.getAnonymousNodes(document.getElementById('inforss-icon'));
        this.mainIcon = subElement[0];
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
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  };

  //----------------------------------------------------------------------------
  self.setMainIconOpacity = function(opacity)
  {
    inforssTraceIn(this);
    try
    {
      if (this.mainIcon == null)
      {
        let subElement = document.getAnonymousNodes(document.getElementById('inforss-icon'));
        this.mainIcon = subElement[0];
      }
      this.mainIcon.style.MozOpacity = opacity;
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  };

  //----------------------------------------------------------------------------
  self.changeMainIcon = function()
  {
    inforssTraceIn(this);
    try
    {
      if (this.mainIcon == null)
      {
        var subElement = document.getAnonymousNodes(document.getElementById('inforss-icon'));
        this.mainIcon = subElement[0];
      }
      if ((this.selectedFeed != null) && (this.selectedFeed.getType() == "group") && (inforssXMLRepository.isSynchronizeIcon()))
      {
        this.mainIcon.setAttribute("src", this.getIcon());
      }
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  };

  //----------------------------------------------------------------------------
  self.resetMainIcon = function()
  {
    inforssTraceIn(this);
    try
    {
      if (this.mainIcon == null)
      {
        var subElement = document.getAnonymousNodes(document.getElementById('inforss-icon'));
        this.mainIcon = subElement[0];
      }
      if ((this.selectedFeed != null) && (this.selectedFeed.getType() == "group") && (inforssXMLRepository.isSynchronizeIcon()))
      {
        this.mainIcon.setAttribute("src", this.selectedFeed.getIcon());
      }
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  };

  //----------------------------------------------------------------------------
  self.getNbUnread = function()
  {
    inforssTraceIn(this);
    let returnValue = 0;
    try
    {
      if (this.displayedHeadlines != null)
      {
        for (let headline of this.displayedHeadlines)
        {
          if (!headline.viewed && !headline.banned)
          {
            returnValue++;
          }
        }
      }
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
    return returnValue;
  };

  //----------------------------------------------------------------------------
  self.getNbNew = function()
  {
    inforssTraceIn(this);
    var returnValue = 0;
    try
    {
      if (this.displayedHeadlines != null)
      {
        for (let headline of this.displayedHeadlines)
        {
          if (headline.isNew())
          {
            returnValue++;
          }
        }
      }
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
    return returnValue;
  };

  //----------------------------------------------------------------------------
  self.getNbHeadlines = function()
  {
    return this.headlines == null ? 0 : this.headlines.length;
  };

  //----------------------------------------------------------------------------
  self.refresh_after = function(timeout)
  {
    return window.setTimeout(this.manualRefresh.bind(this), timeout);
  };

  //----------------------------------------------------------------------------
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
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  };


  return self;
}

//------------------------------------------------------------------------------
inforssFeed.getNodeValue = function(obj)
{
  if (obj == null || obj.length == 0 || obj[0].firstChild == null)
  {
    return null;
  }
  if (obj[0].firstChild.nextSibling == null)
  {
    return obj[0].firstChild.nodeValue;
  }
  let ser = new XMLSerializer();
  let str = ser.serializeToString(obj[0].firstChild);
  str = str.replace(/<[ ]*div[^>]*>/gi, "");
  str = str.replace(/<[ ]*img[^>]*>/gi, "");
  str = str.replace(/<[ ]*p[^>]*>/gi, "");
  str = str.replace(/<[ ]*script[^>]*>/gi, "");
  str = str.replace(/<[ ]*span[^>]*>/gi, "");
  str = str.replace(/<[ ]*iframe[^>]*>/gi, "");
  str = str.replace(/<[ ]*object[^>]*>/gi, "");
  str = str.replace(/<[ ]*font[^>]*>/gi, "");
  str = str.replace(/<[ ]*strong[^>]*>/gi, "");
  return str;
};

//------------------------------------------------------------------------------
inforssFeed.htmlFormatConvert = function(str, keep, mimeTypeFrom, mimeTypeTo)
{
  let formatConverter = Components.classes["@mozilla.org/widget/htmlformatconverter;1"].createInstance(Components.interfaces.nsIFormatConverter);
  let convertedString = null;
  if (keep == null)
  {
    keep = true;
  }
  if (mimeTypeFrom == null)
  {
    mimeTypeFrom = "text/html";
  }
  if (mimeTypeTo == null)
  {
    mimeTypeTo = "text/unicode";
  }
  if (str != null)
  {
    let fromString = Components.classes["@mozilla.org/supports-string;1"].createInstance(Components.interfaces.nsISupportsString);
    if (keep)
    {
      str = str.replace(/</gi, "__LT__");
      str = str.replace(/>/gi, "__GT__");
    }
    fromString.data = str;
    let toString = {
      value: null
    };

    try
    {
      formatConverter.convert(mimeTypeFrom, fromString, fromString.toString().length, mimeTypeTo, toString,
      {});
      if (toString.value)
      {
        toString = toString.value.QueryInterface(Components.interfaces.nsISupportsString);
        convertedString = toString.toString();
        if (keep)
        {
          convertedString = convertedString.replace(/__LT__/gi, "<");
          convertedString = convertedString.replace(/__GT__/gi, ">");
        }
      }
      else
      {
        convertedString = str;
      }
    }
    catch (e)
    {
      convertedString = str;
    }
  }
  return convertedString;
};

//------------------------------------------------------------------------------
inforssFeed.removeScript = function(description)
{
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

  while ((index1 != -1) && (index2 != -1))
  {
    description = description.substring(0, index1) + description.substring(index2 + 9);
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
  return description;
};
