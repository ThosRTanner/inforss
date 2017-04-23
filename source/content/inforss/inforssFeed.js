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

/* globals inforssXMLRepository, inforssHeadline */
/* globals inforssInformation, inforssFTPDownload */

//If this was a module it'd have it's own one.
/* globals ObserverService */
//const ObserverService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);

const INFORSS_FREQUENCY = 60000;
const INFORSS_FLASH_ICON = 100;
const INFORSS_FETCH_TIMEOUT = 10000;

/* exported inforssFeed */
function inforssFeed(feedXML, manager, menuItem)
{
  inforssInformation.call(this, feedXML, manager, menuItem);
  this.callback = null;
  this.candidateHeadlines = null;
  this.displayedHeadlines = null;
  this.error = false;
  this.flashingDirection = -0.5;
  this.flashingIconTimeout = null;
  this.headlines = new Array();
  this.insync = false;
  this.lastRefresh = null;
  this.mainIcon = null;
  this.reload = false;
  this.scheduleTimeout = null;
  this.selectedFeed = null;
  this.syncTimer = null;
  this.url = null;
  this.xmlHttpRequest = null;
}

inforssFeed.prototype = Object.create(inforssInformation.prototype);
inforssFeed.prototype.constructor = inforssFeed;

inforssFeed.prototype = {

  //----------------------------------------------------------------------------
  activate_after(timeout)
  {
    return window.setTimeout(this.activate.bind(this), timeout);
  },

  //----------------------------------------------------------------------------
  activate()
  {
    inforssTraceIn(this);
    try
    {
      if (!this.active)
      {
        this.active = true;
        this.selectedFeed = this.manager.getSelectedInfo(false);
        if (this.headlines.length == 0)
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
  },

  //----------------------------------------------------------------------------
  synchronizeWithOther()
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
  },

  //----------------------------------------------------------------------------
  syncTimeout()
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
  },

  //----------------------------------------------------------------------------
  clearSyncTimer()
  {
    window.clearTimeout(this.syncTimer);
    this.syncTimer = null;
  },

  //----------------------------------------------------------------------------
  getXmlHeadlines()
  {
    inforssTraceIn(this);
    try
    {
      let xml = "<headlines url=\"" + this.getUrl() + "\">\n";
      for (let headline of this.headlines)
      {
        xml += headline;
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
  },

  //----------------------------------------------------------------------------
  synchronize(objDoc)
  {
    inforssTraceIn(this);
    try
    {
      if (this.insync)
      {
        this.insync = false;
        this.clearSyncTimer();
        for (let headline of objDoc.getElementsByTagName("headline"))
        {
          let head = new inforssHeadline(
            new Date(headline.getAttribute("receivedDate")),
            new Date(headline.getAttribute("pubDate")),
            headline.getAttribute("title"),
            headline.getAttribute("guid"),
            headline.getAttribute("link"),
            headline.getAttribute("description"),
            headline.getAttribute("url"),
            headline.getAttribute("home"),
            headline.getAttribute("category"),
            headline.getAttribute("enclosureUrl"),
            headline.getAttribute("enclosureType"),
            headline.getAttribute("enclosureSize"),
            this);
          head.viewed = headline.getAttribute("viewed") == "true";
          head.banned = headline.getAttribute("banned") == "true";
          this.headlines.push(head);
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
  },

  //----------------------------------------------------------------------------
  deactivate()
  {
    inforssTraceIn(this);
    try
    {
      if (this.active)
      {
        this.manager.unpublishFeed(this);
      }
      this.active = false;
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
  },

  //----------------------------------------------------------------------------
  fetchFeed()
  {
    inforssTraceIn(this);
    try
    {
      if (this.isBusy())
      {
        //FIXME: How can we end up here and is this the correct response?
        //Note: This might be attempting to detect we are still processing the
        //headline objects in the timeout chain. in which case we are probably
        //clearing the (finished with) request way to early.
        /**/console.log("why did we get here?", this)
        this.abortRequest();
        this.stopFlashingIcon();
        this.reload = false;
      }

      let refetch = this.isActive() && this.startSchedule();

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

      if (this.getFeedActivity() && !this.isBrowserOffLine() && refetch)
      {
        this.reload = true;
        let url = this.feedXML.getAttribute("url");
        let user = this.feedXML.getAttribute("user");
        let password = inforssXMLRepository.readPassword(url, user);
        //FIXME this is note how we do inheritance
        if (this.getType() == "nntp")
        {
          this.readFeed();
        }
        //FIXME This test seems wrong. Why if we have a specific encoding to we
        //want to go via the ftp thing?
        else if (this.getEncoding() == null || this.getEncoding() == "")
        {
          this.xmlHttpRequest = new XMLHttpRequest();
          this.xmlHttpRequest.timeout = INFORSS_FETCH_TIMEOUT;
          this.xmlHttpRequest.onload = this.readFeed.bind(this);
          this.xmlHttpRequest.onerror = this.errorRequest.bind(this);
          this.xmlHttpRequest.ontimeout = this.errorRequest.bind(this);
          //FIXME Make this set the cache things so we can get back if we
          //got info from cache, because if so we don't have to process.
          this.xmlHttpRequest.open("GET", url, true, user, password);
          this.xmlHttpRequest.send();
        }
        else
        {
          /**/console.log("ftp?", this);
          //FIXME xmlhttprequest can support ftp so why are we doing this?
          //this appears to be a normal html request with an 'odd' encoding
          //e.g. http://www.chinanews.com which uses gbk encoding.
          //question is - why do we need to treat it differently?
          var ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
          var uri = ioService.newURI(url, null, null);
          //Because this is clearly an xmlHttpRequest....
          this.xmlHttpRequest = new inforssFTPDownload();
          this.xmlHttpRequest.start(uri, this, this.fetchHtmlCallback, this.fetchHtmlCallback);
        }
      }
    }
    catch (e)
    {
      inforssDebug(e, this);
      this.abortRequest();
      this.stopFlashingIcon();
      this.reload = false;
    }
    inforssTraceOut(this);
  },

  //----------------------------------------------------------------------------
  clearFlashingIconTimeout()
  {
    window.clearTimeout(this.flashingIconTimeout);
    this.flashingIconTimeout = null;
  },

  //----------------------------------------------------------------------------
  stopFlashingIcon()
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
  },

  //----------------------------------------------------------------------------
  abortRequest()
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
  },

  //----------------------------------------------------------------------------
  errorRequest(evt)
  {
    inforssTraceIn(this);
    /**/console.log("XML Error?", evt)
    try
    {
      this.xmlHttpRequest = null;
      this.error = true;
      this.manager.signalReadEnd(this);
      this.stopFlashingIcon();
      this.reload = false;
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  },

  //----------------------------------------------------------------------------
  readFeed(evt)
  {
    inforssTraceIn(this);
    try
    {
      //In theory we should forget xmlHttpRequest here, but it's used to indicate
      //we are busy.
      this.lastRefresh = new Date();
      if (evt.target.status >= 400)
      {
        this.error = true;
        throw new Error(evt.target.statusText + " fetching " +
                        evt.target.channel.originalURI.asciiSpec);
      }
      this.error = false;
      var objDoc = evt.target.responseXML;
      if (objDoc != null)
      {
        let home = this.feedXML.getAttribute("link");
        let url = this.feedXML.getAttribute("url");

        let items = objDoc.getElementsByTagName(this.itemAttribute);
        let re = new RegExp('\n', 'gi');
        let receivedDate = new Date();
        //FIXME Replace with a sequence of promises
        window.setTimeout(this.readFeed1.bind(this), 0, items.length - 1, items, receivedDate, home, url, re);
      }
    }
    catch (e)
    {
      this.xmlHttpRequest = null;
      this.stopFlashingIcon();
      inforssDebug(e, this);
      this.reload = false;
    }
    inforssTraceOut(this);
  },

  //----------------------------------------------------------------------------
  readFeed1(i, items, receivedDate, home, url, re)
  {
    inforssTraceIn(this);
    try
    {
      if (i >= 0)
      {
        const item = items[i];
        let label = inforssFeed.getNodeValue(item.getElementsByTagName(this.titleAttribute));
        if (label == null)
        {
          label = "";
        }
        else
        {
          label = inforssFeed.htmlFormatConvert(label).replace(re, ' ');
        }
        const link = this.get_link(item);
        let description = null;
        if (this.itemDescriptionAttribute.indexOf("|") == -1)
        {
          description = inforssFeed.getNodeValue(item.getElementsByTagName(this.itemDescriptionAttribute));
        }
        else
        {
          const pos = this.itemDescriptionAttribute.indexOf("|");
          let des1 = this.itemDescriptionAttribute.substring(0, pos);
          description = inforssFeed.getNodeValue(item.getElementsByTagName(des1));
          if (description == null)
          {
            des1 = this.itemDescriptionAttribute.substring(pos + 1);
            description = inforssFeed.getNodeValue(item.getElementsByTagName(des1));
          }
        }
        if (description != null)
        {
          description = inforssFeed.htmlFormatConvert(description).replace(re, ' ');
          description = this.removeScript(description);
        }
        const category = inforssFeed.getNodeValue(item.getElementsByTagName("category"));
        const pubDate = this.getPubDate(item);

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

        let guid = this.get_guid(item);
        if (guid == null || guid == "")
        {
          guid = link;
        }
        if (this.findHeadline(url, label, guid) == null)
        {
          this.addHeadline(receivedDate, pubDate, label, guid, link, description, url, home, category, enclosureUrl, enclosureType, enclosureSize);
        }
      }
      i--;
      if (i >= 0)
      {
        window.setTimeout(this.readFeed1.bind(this), inforssXMLRepository.getTimeSlice(), i, items, receivedDate, home, url, re);
      }
      else
      {
        window.setTimeout(this.readFeed2.bind(this), inforssXMLRepository.getTimeSlice(), 0, items, home, url, re);
      }
    }
    catch (e)
    {
      this.xmlHttpRequest = null;
      this.stopFlashingIcon();
      this.reload = false;
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  },

  //-------------------------------------------------------------------------------------------------------------
  readFeed2(i, items, home, url, re)
  {
    inforssTraceIn(this);
    try
    {
      if (i < this.headlines.length)
      {
        if (this.headlines[i].url == url)
        {
          var find = false;
          var j = 0;
          var label = null;
          var guid = null;
          while ((j < items.length) && (find == false))
          {
            label = inforssFeed.getNodeValue(items[j].getElementsByTagName(this.titleAttribute));
            if (label != null)
            {
              label = inforssFeed.htmlFormatConvert(label).replace(re, ' ');
            }
            guid = this.get_guid(items[j]);
            if ((guid != null) && (this.headlines[i].guid != null))
            {
              if (this.headlines[i].guid == guid)
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
              if (label == this.headlines[i].title)
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
            this.removeHeadline(i);
            i--;
          }
          label = null;
          guid = null;
        }
      }
      i++;
      if (i < this.headlines.length)
      {
        window.setTimeout(this.readFeed2.bind(this), inforssXMLRepository.getTimeSlice(), i, items, home, url, re);
      }
      else
      {
        this.xmlHttpRequest = null;
        this.manager.signalReadEnd(this);
        this.stopFlashingIcon();
        this.reload = false;
      }
    }
    catch (e)
    {
      inforssDebug(e, this);
      this.xmlHttpRequest = null;
      this.stopFlashingIcon();
      this.reload = false;
    }
    inforssTraceOut(this);
  },

  //----------------------------------------------------------------------------
  isBusy()
  {
    return this.xmlHttpRequest != null;
  },

  //----------------------------------------------------------------------------
  addHeadline(receivedDate, pubDate, label, guid, link, description, url, home, category, enclosureUrl, enclosureType, enclosureSize)
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
  },

  //----------------------------------------------------------------------------
  removeHeadline(i)
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
  },

  //----------------------------------------------------------------------------
  limitSizeHeadline()
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
  },

  //----------------------------------------------------------------------------
  findHeadline(url, label, guid)
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
  },

  //----------------------------------------------------------------------------
  startSchedule()
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
  },

  //----------------------------------------------------------------------------
  startFlashingIconTimeout()
  {
    this.clearFlashingIconTimeout();
    this.flashingIconTimeout = window.setTimeout(this.flashIcon.bind(this), INFORSS_FLASH_ICON);
  },

  //----------------------------------------------------------------------------
  clearScheduleTimeout()
  {
    window.clearTimeout(this.scheduleTimeout);
    this.scheduleTimeout = null;
  },

  //----------------------------------------------------------------------------
  resetCandidateHeadlines()
  {
    this.candidateHeadlines = new Array();
  },

  //----------------------------------------------------------------------------
  pushCandidateHeadline(headline)
  {
    this.candidateHeadlines.push(headline);
  },

  //----------------------------------------------------------------------------
  getCandidateHeadlines()
  {
    return this.candidateHeadlines;
  },

  //----------------------------------------------------------------------------
  getDisplayedHeadlines()
  {
    return this.displayedHeadlines;
  },

  //----------------------------------------------------------------------------
  setDisplayedHeadlines(list)
  {
    this.displayedHeadlines = list;
  },

  //----------------------------------------------------------------------------
  setViewed(title, link)
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
  },

  //----------------------------------------------------------------------------
  viewAll()
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
  },

  //----------------------------------------------------------------------------
  setBanned(title, link)
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
  },

  //----------------------------------------------------------------------------
  setBannedAll()
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
  },

  //----------------------------------------------------------------------------
  resetHbox()
  {
    inforssTraceIn(this);
    try
    {
      for (let headline of this.headlines)
      {
        headline[i].resetHbox();
      }
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  },

  //----------------------------------------------------------------------------
  flashIcon()
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
  },

  //----------------------------------------------------------------------------
  setMainIconOpacity(opacity)
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
  },

  //----------------------------------------------------------------------------
  changeMainIcon()
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
  },

  //----------------------------------------------------------------------------
  resetMainIcon()
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
  },

  //----------------------------------------------------------------------------
  getNbUnread()
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
  },

  //----------------------------------------------------------------------------
  getNbNew()
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
  },

  //----------------------------------------------------------------------------
  getNbHeadlines()
  {
    return this.headlines.length;
  },

  //----------------------------------------------------------------------------
  refresh_after(timeout)
  {
    return window.setTimeout(this.manualRefresh.bind(this), timeout);
  },

  //----------------------------------------------------------------------------
  manualRefresh()
  {
    inforssTraceIn(this);
    try
    {
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
  },

  //----------------------------------------------------------------------------
  removeScript(description)
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
      description = description.substring(0, index1) +
                    description.substring(index2 + 9);
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
  }

};

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
