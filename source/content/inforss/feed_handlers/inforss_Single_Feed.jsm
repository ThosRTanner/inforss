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
// inforss_Single_Feed
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------
/* jshint globalstrict: true */
/* eslint-disable strict */
"use strict";

/* eslint-disable array-bracket-newline */
/* exported EXPORTED_SYMBOLS */
const EXPORTED_SYMBOLS = [
  "Single_Feed", /* exported Single_Feed */
];
/* eslint-enable array-bracket-newline */


const { debug } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Debug.jsm",
  {}
);

const { clearTimeout, setTimeout } = Components.utils.import(
  "resource://gre/modules/Timer.jsm",
  {}
);

const { htmlFormatConvert, read_password } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Utils.jsm",
  {}
);

const { Feed } = Components.utils.import(
  "chrome://inforss/content/feed_handlers/inforss_Feed.jsm",
  {}
);

const { Headline } = Components.utils.import(
  "chrome://inforss/content/ticker/inforss_Headline.jsm",
  {}
);

const mediator = {};
Components.utils.import(
  "chrome://inforss/content/mediator/inforss_Mediator_API.jsm",
  mediator
);

const { console } = Components.utils.import(
  "resource://gre/modules/Console.jsm",
  {}
);

const DOMParser = Components.Constructor("@mozilla.org/xmlextras/domparser;1",
                                         "nsIDOMParser");

/* globals URL, TextDecoder */
Components.utils.importGlobalProperties(['URL', 'TextDecoder']);

const Priv_XMLHttpRequest = Components.Constructor(
  "@mozilla.org/xmlextras/xmlhttprequest;1",
  "nsIXMLHttpRequest");

const INFORSS_MINUTES_TO_MS = 60 * 1000;
//FIXME This should be configurable per feed
const INFORSS_FETCH_TIMEOUT = 10 * 1000;

const NL_MATCHER = new RegExp('\n', 'g');

/** Base class for all feeds
 *
 * @class
 * @extends Feed
 *
 * @param {Element} feedXML - dom parsed xml config
 * @param {Manager} manager - current feed manager
 * @param {Element} menuItem - item in main menu for this feed. Really?
 * @param {Mediator} mediator_ - for communicating with headline bar
 * @param {Config} config - extension configuration
 */
function Single_Feed(feedXML, manager, menuItem, mediator_, config)
{
  Feed.call(this, feedXML, manager, menuItem, mediator_, config);
  this._candidate_headlines = [];
  this.displayedHeadlines = [];
  this.headlines = [];
  this.error = false;
  this.insync = false;
  this.reload = false;
  this._page_etag = null;
  this._page_last_modified = null;
  this._sync_timer = null;
  this._xml_http_request = null;
  this._read_timeout = null;
}

Single_Feed.prototype = Object.create(Feed.prototype);
Single_Feed.prototype.constructor = Single_Feed;

Object.assign(Single_Feed.prototype, {

  /** clean shutdown */
  dispose()
  {
    Feed.prototype.dispose.call(this);
    this.abortRequest();
    this.stopFlashingIcon();
    this.clearSyncTimer();
    clearTimeout(this._read_timeout);
  },

  //FIXME This'd maybe make a lot more sense if each 'item' was actually an
  //instance of a class which had appropriate getters.

  //----------------------------------------------------------------------------
  //Generate a fake guid for when the feed hasn't supplied one. We use title
  //*and* link on the basis that some feeds aren't very original with their
  //titles. We don't use the pubdate because in theory you can republish the
  //same story but with a different date (though in that case why you'd not
  //be supplying a guid is beyond me).
  get_guid(item)
  {
    if (!('guid' in item))
    {
      let guid = this.get_guid_impl(item);
      if (guid == null || guid == "")
      {
        if (guid == "")
        {
          console.log("Explicit empty guid in " + this.getUrl(), item);
        }
        //FIXME This should likely be replaced with
        //link + '#' + encoded title
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
      const feed = this.getLinkAddress();
      if (href == null || href == "")
      {
        console.log("Null link found in " + this.getUrl(), item);
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
                        this.getUrl(),
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
  activate(publishing_enabled = true)
  {
    try
    {
      if (this.active)
      {
        return;
      }
      this.publishing_enabled = publishing_enabled;
      if (this.headlines.length == 0)
      {
        this.synchronizeWithOther();
      }
      else
      {
        this._publish_feed();
      }
      this.active = true;
    }
    catch (e)
    {
      debug(e);
    }
  },

  //----------------------------------------------------------------------------
  _publish_feed()
  {
    if (this.publishing_enabled)
    {
      this.manager.publishFeed(this);
    }
  },

  //----------------------------------------------------------------------------
  synchronizeWithOther()
  {
    try
    {
      this.insync = true;
      this.clearSyncTimer();
      mediator.start_headline_dump(this.getUrl());
      this._sync_timer = setTimeout(this.syncTimeout.bind(this), 1000);
    }
    catch (e)
    {
      debug(e);
    }
  },

  //----------------------------------------------------------------------------
  syncTimeout()
  {
    try
    {
      this.insync = false;
      this._publish_feed();
    }
    catch (e)
    {
      debug(e);
    }
  },

  //----------------------------------------------------------------------------
  clearSyncTimer()
  {
    clearTimeout(this._sync_timer);
  },

  //----------------------------------------------------------------------------
  getXmlHeadlines()
  {
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
      debug(e);
    }
    return null;
  },

  //----------------------------------------------------------------------------
  synchronize(objDoc)
  {
    try
    {
      if (this.insync)
      {
        this.insync = false;
        this.clearSyncTimer();
        for (let headline of objDoc.getElementsByTagName("headline"))
        {
          const head = new Headline(
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
            this,
            this.config);
          head.viewed = headline.getAttribute("viewed") == "true";
          head.banned = headline.getAttribute("banned") == "true";
          this.headlines.push(head);
        }
        this._publish_feed();
      }
    }
    catch (e)
    {
      debug(e);
    }
  },

  //----------------------------------------------------------------------------
  deactivate()
  {
    try
    {
      if (this.active)
      {
        this.manager.unpublishFeed(this);
      }
      this.active = false;
      this.abortRequest();
      this.stopFlashingIcon();
      this.publishing_enabled = true; //This seems a little odd
    }
    catch (e)
    {
      debug(e);
    }
  },

  //----------------------------------------------------------------------------
  fetchFeed()
  {
    try
    {
      if (!this.getFeedActivity())
      {
        return;
      }

      if (this.isBusy())
      {
        //FIXME: How can we end up here and is this the correct response?
        //Note: This might be attempting to detect we are still processing the
        //headline objects in the timeout chain. in which case we are probably
        //clearing the (finished with) request way too early.
        //I have managed this by changing the current feed in the options
        //window and then saving
        //and by spamming new windows
/**/console.log("why/how did we get here?", new Error(), this)
        this.abortRequest();
        this.stopFlashingIcon();
        this.reload = false;
      }

      //FIXME Is this test meaningful any more? isn't it always true?
      if (! this.isActive())
      {
/**/console.log("feed not active", new Error(), this)
        return;
      }

      //We do this anyway because if we're not in a group well just end up
      //overwriting the icon with the same icon.
      this.mediator.show_feed_activity(this);

      this.reload = true;
      this.lastRefresh = new Date();
      this.start_fetch();
    }
    catch (e)
    {
      debug(e);
      this.abortRequest();
      this.stopFlashingIcon();
      this.reload = false;
    }
  },

  //----------------------------------------------------------------------------
  get_next_refresh()
  {
    //Needs to return a datetime. So take now + the refresh time
    if (this.lastRefresh == null)
    {
/**/console.log("last refresh not set", this)
      return new Date();
    }
    const delay = this.feedXML.getAttribute("refresh");
    const refresh = delay * INFORSS_MINUTES_TO_MS;
    const next = new Date(this.lastRefresh.getTime() + refresh);
    this.next_refresh = next;
    return next;
  },


  //----------------------------------------------------------------------------
  //Non- xmlHttpRequest based feeds should override this.
  start_fetch()
  {
    const request = new Priv_XMLHttpRequest();
    request.timeout = INFORSS_FETCH_TIMEOUT;
    request.onload = this.readFeed.bind(this);
    request.onerror = this.errorRequest.bind(this);
    request.ontimeout = this.errorRequest.bind(this);
    const url = this.getUrl();
    const user = this.getUser();
    request.open("GET", url, true, user, read_password(url, user));
    if (this._page_etag != null)
    {
      request.setRequestHeader("If-None-Match", this._page_etag);
    }
    if (this._page_last_modified != null)
    {
      request.setRequestHeader("If-Modified-Since", this._page_last_modified);
    }

    request.responseType = "arraybuffer";
    request.send();
    this._xml_http_request = request;
  },

  //----------------------------------------------------------------------------
  stopFlashingIcon()
  {
    try
    {
      this.mediator.show_no_feed_activity();
    }
    catch (e)
    {
      debug(e);
    }
  },

  //----------------------------------------------------------------------------
  //Non- xmlHttpRequest based feeds should override this.
  //FIXME nntp feed definitely and possibly others
  abortRequest()
  {
    try
    {
      if (this._xml_http_request != null)
      {
        this._xml_http_request.abort();
        this._xml_http_request = null;
      }
    }
    catch (e)
    {
      debug(e);
    }
  },

  //----------------------------------------------------------------------------
  //Some sort of error occured (generally server not found)
  errorRequest(evt)
  {
    try
    {
      //Sadly this event loses the original url
      console.log("Error fetching " + this.getUrl(), evt);
      if (! this.dispose)
      {
        this.error = true;
        this.end_processing();
      }
    }
    catch (err)
    {
      debug(err);
    }
  },

  //----------------------------------------------------------------------------
  //Processing is finished, stop flashing, kick the main code
  end_processing()
  {
    this._xml_http_request = null;
    this.stopFlashingIcon();
    this.reload = false;
    this.manager.signalReadEnd(this);
  },

  //----------------------------------------------------------------------------
  readFeed(evt)
  {
    const url = this.getUrl();
    const request = evt.target;
    try
    {
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
      this._page_last_modified = request.getResponseHeader("Last-Modified");
      this._page_etag = request.getResponseHeader("ETag");

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
        if (content_type != null)
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
      //FIXME As you can see further down the code, process_headlines keeps
      //calling overriden methods with an 'item'. It'd be more OO to make
      //each item know how to return the correct value.
      this.process_headlines(this.read_headlines(request, decoder.decode(data)));
    }
    catch (e)
    {
      console.log("Error reading feed", url, e);
      this.error = true;
      this.end_processing();
    }
  },

  //----------------------------------------------------------------------------
  //For xml based feeds, this parses the xml and returns it
  read_xml_feed(request, string)
  {
    {
      const pos = string.indexOf("<?xml");
      //Some places return a 404 page with a 200 status for reasons best known
      //to themselves.
      //Other sites get taken over and return a 'for sale' page.
      if (pos == -1)
      {
        throw "Received something that wasn't xml";
      }
      //Some sites have rubbish before the <?xml
      if (pos > 0)
      {
        string = string.substring(pos);
        console.log("Stripping rubbish at start of " + this.getUrl());
      }
    }
    {
      //TMI comic has unencoded strange character
      const pos1 = string.indexOf("\x0c");
      if (pos1 > 0)
      {
        string = string.substring(0, pos1) + string.substring(pos1 + 1);
        console.log("Stripping rubbish character from " + this.getUrl());
      }
    }

    //Some feeds don't mark themselves as XML which means we need
    //to parse them manually (one at least marks it as html). Not that this
    //matters. technically, but logging it for reference.
    {
      const type = request.getResponseHeader('content-type');
      if (! type.includes("xml"))
      {
        console.log("Overriding " + this.getUrl() + " type " + type);
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
    const home = this.getLinkAddress();
    const url = this.getUrl();
    //FIXME Replace with a sequence of promises
    this._read_timeout = setTimeout(this.readFeed1.bind(this),
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
    try
    {
      if (i >= 0)
      {
        const item = items[i];
        let headline = this.get_title(item);

        //FIXME does this achieve anything useful?
        //(the NLs might, the conversion, not so much)
        headline = htmlFormatConvert(headline).replace(NL_MATCHER, ' ');

        const link = this.get_link(item);

        let description = this.getDescription(item);
        if (description != null)
        {
          description = htmlFormatConvert(description).replace(NL_MATCHER, ' ');
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
        if (this.findHeadline(guid) == null)
        {
          this.addHeadline(receivedDate, pubDate, headline, guid, link,
                           description, url, home, category,
                           enclosureUrl, enclosureType, enclosureSize);
        }
      }
      i--;
      if (i >= 0)
      {
        this._read_timeout = setTimeout(this.readFeed1.bind(this),
                                        this.config.headline_processing_backoff,
                                        i,
                                        items,
                                        receivedDate,
                                        home,
                                        url);
      }
      else
      {
        this._read_timeout = setTimeout(this.readFeed2.bind(this),
                                        this.config.headline_processing_backoff,
                                        0,
                                        items,
                                        home,
                                        url);
      }
    }
    catch (e)
    {
      debug(e);
      this.end_processing();
    }
  },

  //----------------------------------------------------------------------------
  //This appears to discard entries from the 'headlines' array which aren't in
  //the items array (i.e. no longer on the feed page). Note that this is
  //horribly inefficient as most of the headlines it's just put in.
  //FIXME why would one do that? should probably be an option if you leave your
  //browser up for a long while.
  readFeed2(i, items, home, url)
  {
    try
    {
      if (i < this.headlines.length && url.startsWith("http"))
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
      i++;
      if (i < this.headlines.length)
      {
        this._read_timeout = setTimeout(this.readFeed2.bind(this),
                                        this.config.headline_processing_backoff,
                                        i,
                                        items,
                                        home,
                                        url);
      }
      else
      {
        this.end_processing();
      }
    }
    catch (e)
    {
      debug(e);
      this.end_processing();
    }
  },

  //----------------------------------------------------------------------------
  isBusy()
  {
    return this._xml_http_request != null;
  },

  //----------------------------------------------------------------------------
  addHeadline(receivedDate, pubDate, headline, guid, link, description,
              url, home, category, enclosureUrl, enclosureType, enclosureSize)
  {
    try
    {
      this.headlines.unshift(
        new Headline(receivedDate, pubDate, headline, guid, link,
                     description, url, home, category,
                     enclosureUrl, enclosureType, enclosureSize,
                     this, this.config));
    }
    catch (e)
    {
      debug(e);
    }
  },

  //----------------------------------------------------------------------------
  removeHeadline(i)
  {
    try
    {
      this.headlines[i].resetHbox();
      this.headlines.splice(i, 1);
    }
    catch (e)
    {
      debug(e);
    }
  },

  //----------------------------------------------------------------------------
  findHeadline(guid)
  {
    try
    {
      for (let headline of this.headlines)
      {
        if (headline.guid == guid)
        {
          return headline;
        }
      }
    }
    catch (e)
    {
      debug(e);
    }
    return null;
  },

  //----------------------------------------------------------------------------
  resetCandidateHeadlines()
  {
    this._candidate_headlines = [];
  },

  //----------------------------------------------------------------------------
  pushCandidateHeadline(headline)
  {
    this._candidate_headlines.push(headline);
  },

  //----------------------------------------------------------------------------
  getCandidateHeadlines()
  {
    return this._candidate_headlines;
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
    this.displayedHeadlines = this._candidate_headlines;
  },

  //----------------------------------------------------------------------------
  setViewed(title, link)
  {
    try
    {
      // js-hint doesn't seem to like for (const x) much
      for (let headline of this.displayedHeadlines)
      {
        if (headline.link == link && headline.title == title)
        {
          headline.setViewed();
          this.manager.signalReadEnd(this);
          return true;
        }
      }
    }
    catch (e)
    {
      debug(e);
    }
    return false;
  },

  //----------------------------------------------------------------------------
  viewAll()
  {
    try
    {
      //Use slice, as set_headline_viewed can alter displayedHeadlines
      for (let headline of this.displayedHeadlines.slice(0))
      {
        this.manager.open_link(headline.getLink());
        mediator.set_headline_viewed(headline.title,
                                             headline.link);
      }
    }
    catch (e)
    {
      debug(e);
    }
  },

  //----------------------------------------------------------------------------
  setBanned(title, link)
  {
    try
    {
      for (let headline of this.displayedHeadlines)
      {
        if (headline.link == link && headline.title == title)
        {
          headline.setBanned();
          this.manager.signalReadEnd(this);
          return true;
        }
      }
    }
    catch (e)
    {
      debug(e);
    }
    return false;
  },

  //----------------------------------------------------------------------------
  setBannedAll()
  {
    try
    {
      //Use slice, as set_headline_banned can alter displayedHeadlines
      for (let headline of this.displayedHeadlines.slice(0))
      {
        mediator.set_headline_banned(headline.title,
                                             headline.link);
      }
    }
    catch (e)
    {
      debug(e);
    }
  },

  //----------------------------------------------------------------------------
  resetHbox()
  {
    try
    {
      for (let headline of this.headlines)
      {
        headline.resetHbox();
      }
    }
    catch (e)
    {
      debug(e);
    }
  },

  //----------------------------------------------------------------------------
  getNbUnread()
  {
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
      debug(e);
    }
    return returnValue;
  },

  //----------------------------------------------------------------------------
  getNbNew()
  {
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
      debug(e);
    }
    return returnValue;
  },

  //----------------------------------------------------------------------------
  getNbHeadlines()
  {
    return this.headlines.length;
  },

  //----------------------------------------------------------------------------
  manualRefresh()
  {
    try
    {
      this.abortRequest();
      this.stopFlashingIcon();
      this.lastRefresh = null;
      this._page_etag = null;
      this._page_last_modified = null;
    }
    catch (e)
    {
      debug(e);
    }
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
