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

const {
  complete_assign,
  event_binder,
  htmlFormatConvert,
  read_password
} = Components.utils.import(
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

const { clearTimeout, setTimeout } = Components.utils.import(
  "resource://gre/modules/Timer.jsm",
  {}
);

const DOMParser = Components.Constructor("@mozilla.org/xmlextras/domparser;1",
                                         "nsIDOMParser");

const XMLSerializer = Components.Constructor(
  "@mozilla.org/xmlextras/xmlserializer;1",
  "nsIDOMSerializer");

/* globals URL, TextDecoder */
Components.utils.importGlobalProperties([ 'URL', 'TextDecoder' ]);

const Priv_XMLHttpRequest = Components.Constructor(
  "@mozilla.org/xmlextras/xmlhttprequest;1",
  "nsIXMLHttpRequest");

const INFORSS_MINUTES_TO_MS = 60 * 1000;
//FIXME This should be configurable per feed
const INFORSS_FETCH_TIMEOUT = 10 * 1000;

const NL_MATCHER = new RegExp('\n', 'g');

/** Parses the response from an XmlHttpRequest, returning a document
 *
 * @param {XmlHttpRequest} request - fulfilled request
 * @param {string} string - why do we pass this?
 * @param {string} url - request source
 *
 * @returns {Document} parsed xml data
 */
function parse_xml_data(request, string, url)
{
  {
    const pos = string.indexOf("<?xml");
    //Some places return a 404 page with a 200 status for reasons best known
    //to themselves.
    //Other sites get taken over and return a 'for sale' page.
    if (pos == -1)
    {
      throw new Error("Received something that wasn't xml");
    }
    //Some sites have rubbish before the <?xml
    if (pos > 0)
    {
      string = string.substring(pos);
      console.log("Stripping rubbish at start of " + url);
    }
  }
  {
    //TMI comic has unencoded strange character
    const pos1 = string.indexOf("\x0c");
    if (pos1 > 0)
    {
      string = string.substring(0, pos1) + string.substring(pos1 + 1);
      console.log("Stripping rubbish character from " + url);
    }
  }

  //Some feeds don't mark themselves as XML which means we need
  //to parse them manually (one at least marks it as html). Not that this
  //matters. technically, but logging it for reference.
  {
    const type = request.getResponseHeader('content-type');
    if (! type.includes("xml"))
    {
      console.log("Overriding " + url + " type " + type);
    }
  }

  const doc = new DOMParser().parseFromString(string, "text/xml");
  if (doc.documentElement.nodeName == "parsererror")
  {
    throw new Error("Received invalid xml");
  }
  return doc;
}

/** Decode response from an xmlHttpRequest
 *
 * @param {XmlHttpRequest} request - completed request
 * @param {string} encoding - (optional) encoding to use, or null
 *
 * @returns {string} translated string
 */
function decode_response(request, encoding = null)
{
  //Work out the format of the supplied text
  let type = 'utf8';

  if (encoding == null)
  {
    const content_type = request.getResponseHeader('Content-Type');
    if (content_type != null)
    {
      const types = content_type.toLowerCase().split(/\s*; \s*/);
      for (const keypair of types)
      {
        if (keypair.startsWith('charset='))
        {
          type = keypair.substr(8).replace(/['"]/g, '');
          break;
        }
      }
    }
  }
  else
  {
    type = encoding;
  }

  //Convert to selected encoding
  const data = new DataView(request.response);
  const decoder = new TextDecoder(type);
  return decoder.decode(data);
}

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
  this._displayed_headlines = [];
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

complete_assign(Single_Feed.prototype, {

  /** clean shutdown */
  dispose()
  {
    Feed.prototype.dispose.call(this);
    this.abortRequest();
    this.stopFlashingIcon();
    this._clear_sync_timer();
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
  //Get the enclosure details of the headline.
  get_enclosure_info(item)
  {
    if (! ('enclosure_url' in item))
    {
      const { enclosure_url, enclosure_type, enclosure_size } =
        this.get_enclosure_impl(item);
      item.enclosure_url = enclosure_url;
      item.enclosure_type = enclosure_type;
      item.enclosure_size = enclosure_size;
      if (enclosure_url == null)
      {
        const link = this.get_link(item);
        if (link != null && link.endsWith(".mp3"))
        {
          item.enclosure_url = link;
          item.enclosure_type = "audio/mp3";
        }
      }
    }
    return {
      enclosure_url: item.enclosure_url,
      enclosure_type: item.enclosure_type,
      enclosure_size: item.enclosure_size
    };
  },

  // Default implementation of code to get enclosure.
  get_enclosure_impl(item)
  {
    const enclosure = item.getElementsByTagName("enclosure");
    if (enclosure.length > 0)
    {
      return {
        enclosure_url: enclosure[0].getAttribute("url"),
        enclosure_type: enclosure[0].hasAttribute("type") ?
          enclosure[0].getAttribute("type") :
          "image",
        enclosure_size: enclosure[0].getAttribute("length")
      };
    }
    return this.get_null_enclosure_impl();
  },

  // Null implementation of above
  get_null_enclosure_impl()
  {
    return {
      enclosure_url: null,
      enclosure_type: null,
      enclosure_size: null
    };
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

  /** Get the result of a query as text
   *
   * @static
   *
   * @param {NodeList} results - hopefully single value
   *
   * @returns {string} text
   */
  get_query_value(results)
  {
    return results.length == 0 ? null : results[0].textContent;
  },

  //----------------------------------------------------------------------------
  activate(publishing_enabled = true)
  {
    if (this.active)
    {
      return;
    }
    this.publishing_enabled = publishing_enabled;
    if (this.headlines.length == 0)
    {
      this._synchronise_with_other();
    }
    else
    {
      this._publish_feed();
    }
    this.active = true;
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
  _synchronise_with_other()
  {
    this.insync = true;
    this._clear_sync_timer();
    mediator.start_headline_dump(this.getUrl());
    this._sync_timer = setTimeout(event_binder(this._sync_timeout, this), 1000);
  },

  //----------------------------------------------------------------------------
  _sync_timeout()
  {
    this.insync = false;
    this._publish_feed();
  },

  //----------------------------------------------------------------------------
  _clear_sync_timer()
  {
    clearTimeout(this._sync_timer);
  },

  /** Get all the headlines as an xml string
   *
   * @returns {string} Headlines formatted as an xml document
   */
  get headlines_as_xml()
  {
    const doc = (new DOMParser()).parseFromString('<dummy/>', 'text/xml');
    doc.removeChild(doc.documentElement);
    const headlines = doc.createElement("headlines");
    headlines.setAttribute("url", this.getUrl());
    doc.appendChild(headlines);
    for (const headline of this.headlines)
    {
      headlines.appendChild(headline.as_node(doc));
    }
    const ser = new XMLSerializer();
    return ser.serializeToString(doc);
  },

  //----------------------------------------------------------------------------
  synchronize(objDoc)
  {
    if (this.insync)
    {
      this.insync = false;
      this._clear_sync_timer();
      for (const headline of objDoc.getElementsByTagName("headline"))
      {
        //FIXME This is questionable as it doesn't actually copy all the
        //attributes to the new headline and scrolling doesn't start
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
  },

  //----------------------------------------------------------------------------
  deactivate()
  {
    if (this.active)
    {
      this.manager.unpublishFeed(this);
    }
    this.active = false;
    this.insync = false;
    this._clear_sync_timer();
    this.abortRequest();
    this.stopFlashingIcon();
    this.publishing_enabled = true; //This seems a little odd
  },

  //----------------------------------------------------------------------------
  fetchFeed()
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
    request.onload = event_binder(this.readFeed, this);
    request.onerror = event_binder(this.errorRequest, this);
    request.ontimeout = event_binder(this.errorRequest, this);
    //we don't intercept aborts because they're driven by us.
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
    this.mediator.show_no_feed_activity();
  },

  //----------------------------------------------------------------------------
  //Non- xmlHttpRequest based feeds should override this.
  //FIXME nntp feed definitely and possibly others
  abortRequest()
  {
    if (this._xml_http_request != null)
    {
      this._xml_http_request.abort();
      this._xml_http_request = null;
    }
  },

  //----------------------------------------------------------------------------
  //Some sort of error occured (generally server not found)
  errorRequest(evt)
  {
    //Sadly this event loses the original url
    console.log("Error fetching " + this.getUrl(), evt);
    if (! this.disposed)
    {
      this.error = true;
      this.end_processing();
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

    let type = null;

    if (this.feedXML.hasAttribute("encoding") &&
        this.feedXML.getAttribute("encoding") != "")
    {
      type = this.feedXML.getAttribute("encoding");
    }

    try
    {
      //FIXME As you can see further down the code, process_headlines keeps
      //calling overriden methods with an 'item'. It'd be more OO to make
      //each item know how to return the correct value.
      this.process_headlines(
        this.read_headlines(request, decode_response(request, type))
      );
    }
    catch (err)
    {
      //decode_response can throw
      console.log("Error reading feed", url, err);
      this.error = true;
      this.end_processing();
    }
  },

  //----------------------------------------------------------------------------
  //For xml based feeds, this parses the xml and returns it
  read_xml_feed(request, string)
  {
    return parse_xml_data(request, string, this.getUrl());
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
    this._read_timeout = setTimeout(event_binder(this._read_feed_1, this),
                                    0,
                                    items.length - 1,
                                    items,
                                    this.lastRefresh,
                                    home,
                                    url);
  },

  //----------------------------------------------------------------------------
  _read_feed_1(i, items, receivedDate, home, url)
  {
    if (i >= 0)
    {
      const item = items[i];
      const guid = this.get_guid(item);
      if (this.find_headline(guid) === undefined)
      {
        let headline = this.get_title(item);

        //FIXME does this achieve anything useful?
        //(the NLs might, the conversion, not so much)
        headline = htmlFormatConvert(headline).replace(NL_MATCHER, ' ');

        const link = this.get_link(item);

        let description = this.get_description(item);
        if (description != null)
        {
          description = htmlFormatConvert(description).replace(NL_MATCHER, ' ');
          description = this._remove_script(description);
        }

        const category = this.get_category(item);

        const pubDate = this.get_pubdate(item);

        const { enclosure_url, enclosure_type, enclosure_size } =
          this.get_enclosure_info(item);

        this.headlines.unshift(
          new Headline(receivedDate, pubDate, headline, guid, link,
                       description, url, home, category,
                       enclosure_url, enclosure_type, enclosure_size,
                       this, this.config));
      }
    }
    i -= 1;
    if (i >= 0)
    {
      this._read_timeout = setTimeout(event_binder(this._read_feed_1, this),
                                      this.config.headline_processing_backoff,
                                      i,
                                      items,
                                      receivedDate,
                                      home,
                                      url);
    }
    else
    {
      this._read_timeout = setTimeout(event_binder(this._read_feed_2, this),
                                      this.config.headline_processing_backoff,
                                      0,
                                      items,
                                      home,
                                      url);
    }
  },

  //----------------------------------------------------------------------------
  //This appears to discard entries from the 'headlines' array which aren't in
  //the items array (i.e. no longer on the feed page). Note that this is
  //horribly inefficient as most of the headlines it's just put in.
  //FIXME why would one do that? should probably be an option if you leave your
  //browser up for a long while.
  _read_feed_2(i, items, home, url)
  {
    if (i < this.headlines.length && url.startsWith("http"))
    {
      let found = false;
      for (const item of items)
      {
        if (this.get_guid(item) == this.headlines[i].guid)
        {
          found = true;
          break;
        }
      }
      if (!found)
      {
        this._remove_headline(i);
        i -= 1;
      }
    }
    i += 1;
    if (i < this.headlines.length)
    {
      this._read_timeout = setTimeout(event_binder(this._read_feed_2, this),
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
  },

  //----------------------------------------------------------------------------
  isBusy()
  {
    return this._xml_http_request != null;
  },

  //----------------------------------------------------------------------------
  _remove_headline(i)
  {
    this.headlines[i].resetHbox();
    this.headlines.splice(i, 1);
  },

  /** Find headline by guid
   *
   * @param {string} guid
   *
   * @returns {Headline} headline with specified guid or undefined
   */
  find_headline(guid)
  {
    return this.headlines.find(headline => headline.guid == guid);
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
    return this._displayed_headlines;
  },

  //----------------------------------------------------------------------------
  clearDisplayedHeadlines()
  {
    this._displayed_headlines = [];
  },

  //----------------------------------------------------------------------------
  updateDisplayedHeadlines()
  {
    this._displayed_headlines = this._candidate_headlines;
  },

  /** Purge all old headlines (i.e. those in the displayed list that aren't in
   * the candidate list)
   */
  purge_old_headlines()
  {
    const new_list = this._candidate_headlines;
    this._displayed_headlines = this._displayed_headlines.filter(
      old_headline =>
      {
        const match = new_list.find(headline => headline.matches(old_headline));
        const found = match !== undefined;
        if (! found)
        {
          old_headline.resetHbox();
        }
        return found;
      });
  },

  /** Get the last displayed headline
   *
   * @returns {Headline} the last displayed headline, or undefined if there are
                         no displayed headlines
   */
  get last_displayed_headline()
  {
    return this._displayed_headlines[this._displayed_headlines.length - 1];
  },

  /** Set a headline as viewed
   *
   * @param {string} title - headline title
   * @param {string} link - url of headline
   *
   * @returns {boolean} true if the headline was found
   */
  setViewed(title, link)
  {
    //FIXME We shouldn't need the title. The URL should be enough
    //FIXME Why is it necessary to return a value. headline bar uses it to
    //speed up processing but why can't it find out itself in a better way?
    for (const headline of this._displayed_headlines)
    {
      if (headline.link == link && headline.title == title)
      {
        headline.setViewed();
        //FIXME I am at a loss as to why this should be necessary.
        this.manager.signalReadEnd(this);
        return true;
      }
    }
    return false;
  },

  /** Opens the webpage for all headlines in this feed */
  viewAll()
  {
    //Use slice, as set_headline_viewed can alter _displayed_headlines
    for (const headline of this._displayed_headlines.slice(0))
    {
      this.mediator.open_link(headline.getLink());
      mediator.set_headline_viewed(headline.title, headline.link);
    }
  },

  /** Set a headline as banned (can never be seen again)
   *
   * @param {string} title - headline title
   * @param {string} link - url of headline
   *
   * @returns {boolean} true if the headline was found
   */
  setBanned(title, link)
  {
    //FIXME We shouldn't need the title. The URL should be enough
    //FIXME Why is it necessary to return a value. headline bar uses it to
    //speed up processing but why can't it find out itself in a better way?
    for (const headline of this._displayed_headlines)
    {
      if (headline.link == link && headline.title == title)
      {
        headline.setBanned();
        //FIXME I am at a loss as to why this should be necessary.
        this.manager.signalReadEnd(this);
        return true;
      }
    }
    return false;
  },

  //----------------------------------------------------------------------------
  //AFAICS This doesn't actually mark them banned. It marks them *read*.
  //Or 'mark all as read' doesn't do what it claims to.
  setBannedAll()
  {
    //Use slice, as set_headline_banned can alter _displayed_headlines
    for (const headline of this._displayed_headlines.slice(0))
    {
      mediator.set_headline_banned(headline.title, headline.link);
    }
  },

  /** Get the number of unread headlines in this feed
   *
   * @returns {integer} number of unread headlines for this feed
   */
  get num_unread_headlines()
  {
    return this._displayed_headlines.reduce(
      (total, headline) => total + (headline.viewed || headline.banned ? 0 : 1),
      0
    );
  },

  /** Get the number of new headlines in this feed
   *
   * @returns {integer} number of new headlines for this feed
   */
  get num_new_headlines()
  {
    return this._displayed_headlines.reduce(
      (total, headline) => total + (headline.isNew() ? 1 : 0),
      0
    );
  },

  /** Get the number of headlines in this feed
   *
   * @note This is total number of all headlines, not just the displayed ones.
   *
   * @returns {integer} number of headlines in this feed
   */
  get num_headlines()
  {
    return this.headlines.length;
  },

  //----------------------------------------------------------------------------
  manualRefresh()
  {
    this.abortRequest();
    this.stopFlashingIcon();
    this.lastRefresh = null;
    this._page_etag = null;
    this._page_last_modified = null;
  },

  //----------------------------------------------------------------------------
  //FIXME This is used to remove script bits in the description. This was
  //considered a vulnerability (and given a CVE number). There should be a
  //better way of doing this. This is to do with popping up the description in
  //a tooltip (I think) though that'd mean the tooltip can execute javascript
  //rather than displaying the text. I need to document this further.
  //Also this is a static method.
  _remove_script(description)
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

Single_Feed.parse_xml_data = parse_xml_data;
Single_Feed.decode_response = decode_response;
