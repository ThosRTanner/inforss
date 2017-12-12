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
  this.next_refresh = null;
  this.page_etag = null;
  this.page_last_modified = null;
  this.reload = false;
  this.scheduleTimeout = null;
  this.selectedFeed = null;
  this.syncTimer = null;
  this.xmlHttpRequest = null;
}

inforssFeed.prototype = Object.create(inforssInformation.prototype);
inforssFeed.prototype.constructor = inforssFeed;

Object.assign(inforssFeed.prototype, {

  //FIXME This'd maybe make a lot more sense if each 'item' was actually an
  //instance of a class which had appropriate getters.

  //----------------------------------------------------------------------------
  //Generate a fake guid for when the feed hasn't supplied one. We use title
  //*and* link on the basis that some feeds aren't very original with their
  //titles. We don't use the pubdate because in theory you can republish the
  //same story but with a different date (though in that case why you'd not
  //be supplying a guid is beyond me).
  //Point to consider - the checks for valid guid seem to occur in the context
  //of the url being the same, where the url is the feed url. This seems
  //entirely pointless. FIXME!
  get_guid(item)
  {
    if (!('guid' in item))
    {
      let guid = this.get_guid_impl(item);
      if (guid == null || guid == "")
      {
        if (guid == "")
        {
          console.log("Explicit empty guid in " + this.feedXML.getAttribute("url"),
                      item);
        }
        guid = this.get_title(item) + "::" + this.get_link(item);
      }
      item.guid = guid;
    }
    return item.guid;
  },

  //----------------------------------------------------------------------------
  //Get the target of the headline. If there isn't one, use the home page.
  get_link(item)
  {
    if (!('link' in item))
    {
      const href = this.get_link_impl(item);
      //It's not entirely clear with relative addresses what you are relative to,
      //so guessing this.
      const feed = this.feedXML.getAttribute("link");
      if (href == null || href == "")
      {
        console.log("Null link found in " + this.feedXML.getAttribute("url"),
                    item);
        item.link = feed;
      }
      else
      {
        item.link = (new URL(href, feed)).href;
      }
    }
    return item.link;
  },

  //----------------------------------------------------------------------------
  //Get the publication date of the headline.
  get_pubdate(item)
  {
    if (!('pubdate' in item))
    {
      let pubDate = this.get_pubdate_impl(item);
      if (pubDate != null)
      {
        let res = new Date(pubDate);
        if (isNaN(res))
        {
          console.log("Invalid date " + pubDate + " found in feed " +
                        this.feedXML.getAttribute("url"),
                      item);
          res = null;
        }
        pubDate = res;
      }
      item.pubdate = pubDate;
    }
    return item.pubdate;
  },

  //----------------------------------------------------------------------------
  //Get the text associated with a single element
  //Assumes at most once instance of the key, returns null if the key isn't
  //found
  get_text_value(item, key)
  {
    const elems = item.getElementsByTagName(key);
    return elems.length == 0 ? null : elems[0].textContent;
  },

  //----------------------------------------------------------------------------
  activate_after(timeout)
  {
    return window.setTimeout(this.activate.bind(this), timeout);
  },

  //----------------------------------------------------------------------------
  activate()
  {
/**/console.log("feed activate", this)
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
//          this.fetchFeed();
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
      this.insync = false;
      this.manager.publishFeed(this);
      //this.fetchFeed();
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
        //this.fetchFeed();
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
        //I have managed this by changing the current feed in the options
        //window and then saving.
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
    const user = this.feedXML.hasAttribute("user") ?
      this.feedXML.getAttribute("user") : null;
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

    request.responseType = "arraybuffer";
    request.send();
    this.xmlHttpRequest = request;
  },

  //----------------------------------------------------------------------------
  clearFlashingIconTimeout()
  {
    window.clearTimeout(this.flashingIconTimeout);
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
  errorRequest(evt)
  {
    inforssTraceIn(this);
    try
    {
      //Sadly this event loses the original url
      console.log("Error fetching " + this.feedXML.getAttribute("url"), evt);
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
        console.log("Error " + request.statusText + " (" + request.status + ") fetching " + url);
        this.error = true;
        this.end_processing();
        return;
      }

      if (request.status == 304)
      {
        //Not changed since last time, so no need to reprocess all the entries.
        this.error = false;
        console.log("...." + url + " unmodified")
        this.end_processing();
        return;
      }

      //Remember when we were last modified
      this.page_last_modified = request.getResponseHeader("Last-Modified");
      this.page_etag = request.getResponseHeader("ETag");

      //Work out the format of the supplied text
      let type = 'utf8';

      if (this.feedXML.hasAttribute("encoding") &&
          this.feedXML.getAttribute("encoding") != "")
      {
          type = this.feedXML.getAttribute("encoding");
      }
      else
      {
        const content_type = request.getResponseHeader('Content-Type');
        if (type != null)
        {
          const types = content_type.toLowerCase().split(/\s*; \s*/);
          for (let keypair of types)
          {
            if (keypair.startsWith('charset='))
            {
              type = keypair.substr(8).replace(/['"]/g, '');
              break;
            }
          }
        }
      }

      //Convert to utf8 and process
      const data = new DataView(request.response);
      const decoder = new TextDecoder(type);
      this.process_headlines(this.read_headlines(request, decoder.decode(data)));
    }
    catch (e)
    {
      console.log("Error reading feed", url, e);
      this.error = true;
      this.end_processing();
    }
    inforssTraceOut(this);
  },

  //----------------------------------------------------------------------------
  //For xml based feeds, this parses the xml and returns it
  read_xml_feed(request, string)
  {
    //Some feeds (gagh) don't mark themselves as XML which means we need
    //to parse them manually (one at least marks it as html). Not that this
    //matters. technically, but logging it for reference.
    {
      const type = request.getResponseHeader('content-type');
      if (! type.includes("xml"))
      {
        const url = this.feedXML.getAttribute("url");
        console.log("[infoRss]: Overriding " + url + " type " + type);
      }
    }

    const doc = new DOMParser().parseFromString(string, "text/xml");
    if (doc.documentElement.nodeName == "parsererror")
    {
      throw "Received invalid xml";
    }
    return doc;
  },

  //----------------------------------------------------------------------------
  //Process each headline in the feed.
  //
  process_headlines(items)
  {
    this.error = false;
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
        let headline = this.get_title(item);

        //FIXME does this achieve anything useful?
        //(the NLs might, the conversion, not so much)
        headline = inforssFeed.htmlFormatConvert(headline).replace(NL_MATCHER, ' ');

        const link = this.get_link(item);

        let description = this.getDescription(item);
        if (description != null)
        {
          description = inforssFeed.htmlFormatConvert(description).replace(NL_MATCHER, ' ');
          description = this.removeScript(description);
        }

        const category = this.getCategory(item);

        const pubDate = this.get_pubdate(item);

        //FIXME do this better
        //FIXME Why does it need a try?
        var enclosureUrl = null;
        var enclosureType = null;
        var enclosureSize = null;
        try
        {
          const enclosure = item.getElementsByTagName("enclosure");
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
        }
        catch (e)
        {}

        let guid = this.get_guid(item);
        if (this.findHeadline(url, guid) == null)
        {
          this.addHeadline(receivedDate, pubDate, headline, guid, link,
                           description, url, home, category,
                           enclosureUrl, enclosureType, enclosureSize);
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

  //----------------------------------------------------------------------------
  //This appears to discard entries from the 'headlines' array which aren't in
  //the items array (i.e. no longer on the feed page). Note that this is
  //horribly inefficient as most of the headlines it's just put in.
  //FIXME why would one do that? should probably be an option if you leave your
  //browser up for a long while.
  readFeed2(i, items, home, url)
  {
    inforssTraceIn(this);
    try
    {
      if (i < this.headlines.length)
      {
        if (this.headlines[i].url == url)
        {
          let found = false;
          for (let item of items)
          {
            if (this.get_guid(item) == this.headlines[i].guid)
            {
              found = true;
              break;
            }
          }
          if (!found)
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
  addHeadline(receivedDate, pubDate, headline, guid, link, description,
              url, home, category, enclosureUrl, enclosureType, enclosureSize)
  {
    inforssTraceIn(this);
    try
    {
      this.headlines.unshift(
        new inforssHeadline(receivedDate, pubDate, headline, guid, link,
                            description, url, home, category,
                            enclosureUrl, enclosureType, enclosureSize, this));
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
  findHeadline(url, guid)
  {
    inforssTraceIn(this);
    try
    {
      for (let headline of this.headlines)
      {
        if (headline.url == url && headline.guid == guid)
        {
          return headline;
        }
/**/if (headline.url != url) { console.log(this, headline, url) }
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
  //This should likely be in the base class, then grouped feeds can select the
  //next feed
  startSchedule()
  {
    /*
    inforssTraceIn(this);
    var refetch = false;
    try
    {
      var delay = this.feedXML.getAttribute("refresh");
      var refresh = delay * INFORSS_FREQUENCY;
      if (this.lastRefresh == null)
      {
        //If i've not done a fetch before, do one now
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
console.log("start schedule", this)
      this.scheduleTimeout = window.setTimeout(this.fetchFeed.bind(this), refresh);
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
    return refetch;
    */
    return true;
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
      this.page_etag = null;
      this.page_last_modified = null;
      //this.fetchFeed();
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
  if (obj.length == 0 || obj[0].firstChild == null)
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
