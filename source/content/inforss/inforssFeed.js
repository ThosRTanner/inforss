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

/*jshint browser: true, devel: true */
/*eslint-env browser */

var inforss = inforss || {};
Components.utils.import("chrome://inforss/content/modules/inforss_Debug.jsm",
                        inforss);
Components.utils.import("chrome://inforss/content/modules/inforss_Utils.jsm",
                        inforss);

inforss.feed_handlers = inforss.feed_handlers || {};
Components.utils.import(
  "chrome://inforss/content/feed_handlers/inforss_Information.jsm",
  inforss.feed_handlers);

Components.utils.import("chrome://inforss/content/ticker/inforss_Headline.jsm",
                        inforss);

inforss.mediator = inforss.mediator || {};
Components.utils.import(
  "chrome://inforss/content/mediator/inforss_Mediator_API.jsm",
  inforss.mediator);

//To be added to make into module
//const { console } =
//  Components.utils.import("resource://gre/modules/Console.jsm", {});

//If this was a module it'd have it's own one.
/* globals privXMLHttpRequest */
//const privXMLHttpRequest = Components.Constructor(
//  "@mozilla.org/xmlextras/xmlhttprequest;1",
//  "nsIXMLHttpRequest");

const INFORSS_MINUTES_TO_MS = 60 * 1000;
const INFORSS_FLASH_DURATION = 100;
/* exported INFORSS_FETCH_TIMEOUT */
const INFORSS_FETCH_TIMEOUT = 10 * 1000;

const NL_MATCHER = new RegExp('\n', 'g');

/* exported inforssFeed */
function inforssFeed(feedXML, manager, menuItem, mediator, config)
{
  inforss.feed_handlers.Information.call(this,
                                         feedXML,
                                         manager,
                                         menuItem,
                                         mediator,
                                         config);
  this.callback = null;
  this.candidateHeadlines = [];
  this.displayedHeadlines = [];
  this.error = false;
  this.flashingDirection = -0.5;
  this.flashingIconTimeout = null;
  this.headlines = [];
  this.insync = false;
  this.mainIcon = null;
  this.page_etag = null;
  this.page_last_modified = null;
  this.reload = false;
  this.selectedFeed = null;
  this.syncTimer = null;
  this.xmlHttpRequest = null;
}

inforssFeed.prototype = Object.create(
  inforss.feed_handlers.Information.prototype
);
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
    inforss.traceIn(this);
    try
    {
      if (this.active)
      {
        return;
      }
      this.publishing_enabled = publishing_enabled;
      this.selectedFeed = this.manager.get_selected_feed();
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
      inforss.debug(e, this);
    }
    finally
    {
      inforss.traceOut(this);
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
    inforss.traceIn(this);
    try
    {
      this.insync = true;
      this.clearSyncTimer();
      inforss.mediator.start_headline_dump(this.getUrl());
      this.syncTimer = window.setTimeout(this.syncTimeout.bind(this), 1000);
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    inforss.traceOut(this);
  },

  //----------------------------------------------------------------------------
  syncTimeout()
  {
    inforss.traceIn(this);
    try
    {
      this.insync = false;
      this._publish_feed();
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    inforss.traceOut(this);
  },

  //----------------------------------------------------------------------------
  clearSyncTimer()
  {
    window.clearTimeout(this.syncTimer);
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
      inforss.debug(e, this);
    }
    return null;
  },

  //----------------------------------------------------------------------------
  synchronize(objDoc)
  {
    inforss.traceIn(this);
    try
    {
      if (this.insync)
      {
        this.insync = false;
        this.clearSyncTimer();
        for (let headline of objDoc.getElementsByTagName("headline"))
        {
          let head = new inforss.Headline(
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
            this.
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
      inforss.debug(e, this);
    }
    inforss.traceOut(this);
  },

  //----------------------------------------------------------------------------
  deactivate()
  {
    inforss.traceIn(this);
    try
    {
      if (this.active)
      {
        this.manager.unpublishFeed(this);
      }
      this.active = false;
      this.abortRequest();
      this.stopFlashingIcon();
      this.selectedFeed = null;
      this.publishing_enabled = true; //This seems a little odd
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    inforss.traceOut(this);
  },

  //----------------------------------------------------------------------------
  fetchFeed()
  {
    inforss.traceIn(this);
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
        //window and then saving.
/**/console.log("why/how did we get here?", new Error(), this)
        this.abortRequest();
        this.stopFlashingIcon();
        this.reload = false;
      }

      //We do this anyway because if we're not in a group well just end up
      //overwriting the icon with the same icon.
      this.mediator.show_grouped_feed(this);

      //FIXME Is this test meaningful any more? isn't it always true?
      if (this.isActive())
      {
        if (this.config.icon_flashes_on_activity)
        {
          this.startFlashingIconTimeout();
        }
        this.reload = true;
        this.lastRefresh = new Date();
        this.start_fetch();
      }
    }
    catch (e)
    {
      inforss.debug(e, this);
      this.abortRequest();
      this.stopFlashingIcon();
      this.reload = false;
    }
    finally
    {
      inforss.traceOut(this);
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
    const request = new privXMLHttpRequest();
    request.timeout = INFORSS_FETCH_TIMEOUT;
    request.onload = this.readFeed.bind(this);
    request.onerror = this.errorRequest.bind(this);
    request.ontimeout = this.errorRequest.bind(this);
    const url = this.getUrl();
    const user = this.getUser();
    const password = this.config.readPassword(url, user);
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
    inforss.traceIn(this);
    try
    {
      this.clearFlashingIconTimeout();
      this.setMainIconOpacity(1);
      this.resetMainIcon();
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    inforss.traceOut(this);
  },

  //----------------------------------------------------------------------------
  //Non- xmlHttpRequest based feeds should override this.
  //FIXME nntp feed definitely and possibly others
  abortRequest()
  {
    inforss.traceIn(this);
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
      inforss.debug(e, this);
    }
    inforss.traceOut(this);
  },

  //----------------------------------------------------------------------------
  //Some sort of error occured (generally server not found)
  errorRequest(evt)
  {
    inforss.traceIn(this);
    try
    {
      //Sadly this event loses the original url
      console.log("Error fetching " + this.getUrl(), evt);
      this.error = true;
      this.end_processing();
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    inforss.traceOut(this);
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
    inforss.traceIn(this);
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
    inforss.traceOut(this);
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
    inforss.traceIn(this);
    try
    {
      if (i >= 0)
      {
        const item = items[i];
        let headline = this.get_title(item);

        //FIXME does this achieve anything useful?
        //(the NLs might, the conversion, not so much)
        headline = inforss.htmlFormatConvert(headline).replace(NL_MATCHER, ' ');

        const link = this.get_link(item);

        let description = this.getDescription(item);
        if (description != null)
        {
          description = inforss.htmlFormatConvert(description).replace(NL_MATCHER, ' ');
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
        window.setTimeout(this.readFeed1.bind(this), this.config.headline_processing_backoff, i, items, receivedDate, home, url);
      }
      else
      {
        window.setTimeout(this.readFeed2.bind(this), this.config.headline_processing_backoff, 0, items, home, url);
      }
    }
    catch (e)
    {
      inforss.debug(e, this);
      this.end_processing();
    }
    inforss.traceOut(this);
  },

  //----------------------------------------------------------------------------
  //This appears to discard entries from the 'headlines' array which aren't in
  //the items array (i.e. no longer on the feed page). Note that this is
  //horribly inefficient as most of the headlines it's just put in.
  //FIXME why would one do that? should probably be an option if you leave your
  //browser up for a long while.
  readFeed2(i, items, home, url)
  {
    inforss.traceIn(this);
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
        window.setTimeout(this.readFeed2.bind(this), this.config.headline_processing_backoff, i, items, home, url);
      }
      else
      {
        this.end_processing();
      }
    }
    catch (e)
    {
      inforss.debug(e, this);
      this.end_processing();
    }
    inforss.traceOut(this);
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
    inforss.traceIn(this);
    try
    {
      this.headlines.unshift(
        new inforss.Headline(receivedDate, pubDate, headline, guid, link,
                            description, url, home, category,
                            enclosureUrl, enclosureType, enclosureSize,
                            this, this.config));
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    inforss.traceOut(this);
  },

  //----------------------------------------------------------------------------
  removeHeadline(i)
  {
    inforss.traceIn(this);
    try
    {
      this.headlines[i].resetHbox();
      this.headlines.splice(i, 1);
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    inforss.traceOut(this);
  },

  //----------------------------------------------------------------------------
  findHeadline(guid)
  {
    inforss.traceIn(this);
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
      inforss.debug(e, this);
    }
    finally
    {
      inforss.traceOut(this);
    }
    return null;
  },

  //----------------------------------------------------------------------------
  startFlashingIconTimeout()
  {
    this.clearFlashingIconTimeout();
    this.flashingIconTimeout = window.setTimeout(this.flashIcon.bind(this),
                                                 INFORSS_FLASH_DURATION);
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
    inforss.traceIn(this);
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
      inforss.debug(e, this);
    }
    finally
    {
      inforss.traceOut(this);
    }
    return false;
  },

  //----------------------------------------------------------------------------
  viewAll()
  {
    inforss.traceIn(this);
    try
    {
      //Use slice, as set_headline_viewed can alter displayedHeadlines
      for (let headline of this.displayedHeadlines.slice(0))
      {
        this.manager.open_link(headline.getLink());
        inforss.mediator.set_headline_viewed(headline.title,
                                             headline.link);
      }
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    inforss.traceOut(this);
  },

  //----------------------------------------------------------------------------
  setBanned(title, link)
  {
    inforss.traceIn(this);
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
      inforss.debug(e, this);
    }
    finally
    {
      inforss.traceOut(this);
    }
    return false;
  },

  //----------------------------------------------------------------------------
  setBannedAll()
  {
    inforss.traceIn(this);
    try
    {
      //Use slice, as set_headline_banned can alter displayedHeadlines
      for (let headline of this.displayedHeadlines.slice(0))
      {
        inforss.mediator.set_headline_banned(headline.title,
                                             headline.link);
      }
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    inforss.traceOut(this);
  },

  //----------------------------------------------------------------------------
  resetHbox()
  {
    inforss.traceIn(this);
    try
    {
      for (let headline of this.headlines)
      {
        headline.resetHbox();
      }
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    inforss.traceOut(this);
  },

  //----------------------------------------------------------------------------
  flashIcon()
  {
    inforss.traceIn(this);
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
      inforss.debug(e, this);
    }
    inforss.traceOut(this);
  },

  //----------------------------------------------------------------------------
  setMainIconOpacity(opacity)
  {
    inforss.traceIn(this);
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
      inforss.debug(e, this);
    }
    inforss.traceOut(this);
  },

  //----------------------------------------------------------------------------
  //FIXME this is horrible. We keep checking what the current feed type is.
  //Must be a better way.
  resetMainIcon()
  {
    inforss.traceIn(this);
    try
    {
      if (this.selectedFeed != null &&
          this.selectedFeed.getType() == "group" &&
          this.config.icon_shows_current_feed)
      {
        if (this.mainIcon == null)
        {
          //FIXME Seriously? Why not do this on construction of the object?
          var subElement = document.getAnonymousNodes(document.getElementById('inforss-icon'));
          this.mainIcon = subElement[0];
        }
        this.mainIcon.setAttribute("src", this.selectedFeed.getIcon());
      }
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    inforss.traceOut(this);
  },

  //----------------------------------------------------------------------------
  getNbUnread()
  {
    inforss.traceIn(this);
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
      inforss.debug(e, this);
    }
    inforss.traceOut(this);
    return returnValue;
  },

  //----------------------------------------------------------------------------
  getNbNew()
  {
    inforss.traceIn(this);
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
      inforss.debug(e, this);
    }
    inforss.traceOut(this);
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
    inforss.traceIn(this);
    try
    {
      this.abortRequest();
      this.stopFlashingIcon();
      this.lastRefresh = null;
      this.page_etag = null;
      this.page_last_modified = null;
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    inforss.traceOut(this);
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
