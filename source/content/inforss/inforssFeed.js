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
/* globals inforssInformation */

//If this was a module it'd have it's own one.
/* globals ObserverService */
//const ObserverService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);

const INFORSS_FREQUENCY = 60000;
const INFORSS_FLASH_ICON = 100;
const INFORSS_FETCH_TIMEOUT = 10000;

const NL_MATCHER = new RegExp('\n', 'g');

/* exported inforssFeed */
function inforssFeed(feedXML, manager, menuItem)
{
  inforssInformation.call(this, feedXML, manager, menuItem);
  this.callback = null;
  this.candidateHeadlines = [];
  this.displayedHeadlines = [];
  this.error = false;
  this.flashingDirection = -0.5;
  this.flashingIconTimeout = null;
  this.headlines = [];
  this.insync = false;
  this.lastRefresh = null;
  this.mainIcon = null;
  this.page_etag = null;
  this.page_last_modified = null;
  this.reload = false;
  this.scheduleTimeout = null;
  this.selectedFeed = null;
  this.syncTimer = null;
  this.url = null;
  this.xmlHttpRequest = null;
}

inforssFeed.prototype = Object.create(inforssInformation.prototype);
inforssFeed.prototype.constructor = inforssFeed;

Object.assign(inforssFeed.prototype, {

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
        //clearing the (finished with) request way too early.
        /**/console.log("why/how did we get here?", new Error(), this)
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
        if (inforssXMLRepository.icon_flashes_on_activity() && refetch)
        {
          this.startFlashingIconTimeout();
        }
      }

      if (this.getFeedActivity() && !this.isBrowserOffLine() && refetch)
      {
        this.reload = true;
        this.start_fetch();
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
  //Non- xmlHttpRequest based feeds should override this.
  start_fetch()
  {
    const request = new XMLHttpRequest();
    request.timeout = INFORSS_FETCH_TIMEOUT;
    request.onload = this.readFeed.bind(this);
    request.onerror = this.errorRequest.bind(this);
    request.ontimeout = this.errorRequest.bind(this);
    const url = this.feedXML.getAttribute("url");
    const user = this.feedXML.getAttribute("user");
    const password = inforssXMLRepository.readPassword(url, user);
    request.open("GET", url, true, user, password);
    if (this.page_etag != null)
    {
      request.setRequestHeader("If-None-Match", this.page_etag);
    }
    if (this.page_last_modified != null)
    {
      request.setRequestHeader("If-Modified-Since", this.page_last_modified);
    }
    request.responseType = "text";
    request.send();
    this.xmlHttpRequest = request;
  },

  //----------------------------------------------------------------------------
  clearFlashingIconTimeout()
  {
    window.clearTimeout(this.flashingIconTimeout);
    this.flashingIconTimeout = null; //Just for debugging.
  },

  //----------------------------------------------------------------------------
  stopFlashingIcon()
  {
    inforssTraceIn(this);
    try
    {
      this.clearFlashingIconTimeout();
      this.setMainIconOpacity(1);
      this.resetMainIcon();
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  },

  //----------------------------------------------------------------------------
  //Non- xmlHttpRequest based feeds should override this.
  //FIXME nntp feed definitely and possibly others
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
  //Some sort of error occured (generally server not found)
  errorRequest(/*evt*/)
  {
    inforssTraceIn(this);
    try
    {
      //Sadly this event loses the original url
      console.log("[infoRSS]: Error fetching " + this.feedXML.getAttribute("url"));
      this.error = true;
      this.end_processing();
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  },

  //----------------------------------------------------------------------------
  //Processing is finished, stop flashing, kick the main code
  end_processing()
  {
    this.xmlHttpRequest = null;
    this.stopFlashingIcon();
    this.reload = false;
    this.manager.signalReadEnd(this);
  },

  //----------------------------------------------------------------------------
  readFeed(evt)
  {
    inforssTraceIn(this);
    const url = this.feedXML.getAttribute("url");
    const request = evt.target;
    try
    {
      this.lastRefresh = new Date();

      //In theory we should always forget xmlHttpRequest here, but it's used to
      //indicate we are busy. This is questionable in terms of aborting and one
      //or two other things we do.

      if (request.status >= 400)
      {
        throw request.statusText;
      }

      if (request.status == 304)
      {
        //Not changed since last time, so no need to reprocess all the entries.
        /**/console.log("...." + url + " unmodified")
        this.end_processing();
        return;
      }

      //Remember when we were last modified
      this.page_last_modified = request.getResponseHeader("Last-Modified");
      this.page_etag = request.getResponseHeader("ETag");

      //this.process_feed_data(
      this.read_feed_data(request)
      //)
      ;
    }
    catch (e)
    {
      console.log("[infoRSS]: " + e + " fetching " + url);
      this.error = true;
      this.end_processing();
    }
    inforssTraceOut(this);
  },

  //----------------------------------------------------------------------------
  //Any feed which can use xmlhttprequest should override this to process the
  //response, after it has been checked for errors/caching.
  //It returns an array of items to process
  read_feed_data(request)
  {
    const url = this.feedXML.getAttribute("url");

    //Some feeds (gagh) don't mark themselves as XML which means we need
    //to parse them manually (one at least marks it as html). Not that this
    //matters. technically, but logging it for reference.
    {
      const type = request.getResponseHeader('content-type');
      if (! type.includes("xml"))
      {
        console.log("[infoRss]: Overriding " + url + " type " + type);
      }
    }
    const doc = new DOMParser().parseFromString(request.response, "text/xml");
    if (doc.documentElement.nodeName == "parsererror")
    {
      throw "Received invalid xml";
    }
    this.error = false;
    //return doc.getElementsByTagName(this.itemAttribute);
    this.process_feed_data(doc.getElementsByTagName(this.itemAttribute));
  },

  //----------------------------------------------------------------------------
  //an item has an element with the following children
  //
  process_feed_data(items)
  {
    const home = this.feedXML.getAttribute("link");
    const url = this.feedXML.getAttribute("url");
    //FIXME Replace with a sequence of promises
    window.setTimeout(this.readFeed1.bind(this),
                      0,
                      items.length - 1,
                      items,
                      this.lastRefresh,
                      home,
                      url);
  },

  //----------------------------------------------------------------------------
  readFeed1(i, items, receivedDate, home, url)
  {
    inforssTraceIn(this);
    try
    {
      if (i >= 0)
      {
        const item = items[i];
        let label = this.get_title(item);

        //FIXME does this achieve anything useful?
        //(the NLs might, the conversion, not so much)
        label = inforssFeed.htmlFormatConvert(label).replace(NL_MATCHER, ' ');

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
          description = inforssFeed.htmlFormatConvert(description).replace(NL_MATCHER, ' ');
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
        window.setTimeout(this.readFeed1.bind(this), inforssXMLRepository.headline_processing_backoff(), i, items, receivedDate, home, url);
      }
      else
      {
        window.setTimeout(this.readFeed2.bind(this), inforssXMLRepository.headline_processing_backoff(), 0, items, home, url);
      }
    }
    catch (e)
    {
      inforssDebug(e, this);
      this.end_processing();
    }
    inforssTraceOut(this);
  },

  //-------------------------------------------------------------------------------------------------------------
  readFeed2(i, items, home, url)
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
          while ((j < items.length) && (find == false))
          {
            let label = this.get_title(items[j]);
            if (label != "")
            {
              label = inforssFeed.htmlFormatConvert(label).replace(NL_MATCHER, ' ');
            }
            let guid = this.get_guid(items[j]);
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
        }
      }
      i++;
      if (i < this.headlines.length)
      {
        window.setTimeout(this.readFeed2.bind(this), inforssXMLRepository.headline_processing_backoff(), i, items, home, url);
      }
      else
      {
        this.end_processing();
      }
    }
    catch (e)
    {
      inforssDebug(e, this);
      this.end_processing();
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
    var res = null;
    try
    {
      if (pubDate == null)
      {
        pubDate = receivedDate;
      }
      else
      {
        //FIXME Oh, come on. Dates are in RFC format. This appears to be
        //specific to HTML feeds which can be sort of guesswork (and possibly
        //nntp ones).
        const reg1 = new RegExp("^[a-zA-Z]*[,]*[ ]*([0-9]{1,2}) ([a-zA-Z]{3}) ([0-9]{4}) ([0-9]{2}):([0-9]{2}):([0-9]{2})", "ig");
        const reg2 = new RegExp("^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2})(.*)", "ig");
        const reg3 = new RegExp(":([0-9]{2})([\-\+])([0-9]{2}):([0-9]{2})");
        const reg4 = new RegExp(":([0-9]{2})Z");
        const reg5 = new RegExp("([\-\+])([0-9]{2}):([0-9]{2})");
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
        if (date - this.lastRefresh.getTime() < refresh - 5000)
        {
          refresh = date - this.lastRefresh.getTime();
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
    this.candidateHeadlines = [];
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
  clearDisplayedHeadlines()
  {
    this.displayedHeadlines = [];
  },

  //----------------------------------------------------------------------------
  updateDisplayedHeadlines()
  {
    this.displayedHeadlines = this.candidateHeadlines;
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
        //Seems vaguely wrong anyway. What happens if you have two headlines,
        //one of which starts with the other? (nntp feeds especially)
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
        headline.resetHbox();
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
      var opacity = this.mainIcon.style.opacity;
      if (opacity == null || opacity == "")
      {
        opacity = 1;
        this.flashingDirection = -0.5;
      }
      opacity = eval(opacity) + this.flashingDirection;
      if (opacity < 0 || opacity > 1)
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
      this.mainIcon.style.opacity = opacity;
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
      if (this.selectedFeed != null &&
          this.selectedFeed.getType() == "group" &&
          inforssXMLRepository.icon_shows_current_feed())
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
      if (this.selectedFeed != null &&
          this.selectedFeed.getType() == "group" &&
          inforssXMLRepository.icon_shows_current_feed())
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
      for (let headline of this.displayedHeadlines)
      {
        if (!headline.viewed && !headline.banned)
        {
          returnValue++;
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
      for (let headline of this.displayedHeadlines)
      {
        if (headline.isNew())
        {
          returnValue++;
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

});

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
