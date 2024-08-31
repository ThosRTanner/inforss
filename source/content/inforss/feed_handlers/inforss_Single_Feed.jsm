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

const { log_exception } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Debug.jsm", {}
);

const {
  complete_assign,
  event_binder,
  htmlFormatConvert,
  make_URI
} = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Utils.jsm", {}
);

const { Feed } = Components.utils.import(
  "chrome://inforss/content/feed_handlers/inforss_Feed.jsm", {}
);

const { Headline } = Components.utils.import(
  "chrome://inforss/content/ticker/inforss_Headline.jsm", {}
);

const { Sleeper } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Sleeper.jsm", {}
);

const { XML_Request } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_XML_Request.jsm", {}
);

const mediator = {};
Components.utils.import(
  "chrome://inforss/content/mediator/inforss_Mediator_API.jsm", mediator
);

const { console } = Components.utils.import(
  "resource://gre/modules/Console.jsm", {}
);

const { clearTimeout, setTimeout } = Components.utils.import(
  "resource://gre/modules/Timer.jsm", {}
);

const DOMParser = Components.Constructor("@mozilla.org/xmlextras/domparser;1",
                                         "nsIDOMParser");

const XMLSerializer = Components.Constructor(
  "@mozilla.org/xmlextras/xmlserializer;1",
  "nsIDOMSerializer");

/* globals URL, TextDecoder */
Components.utils.importGlobalProperties([ "URL", "TextDecoder" ]);

const { Downloads } = Components.utils.import(
  "resource://gre/modules/Downloads.jsm", {}
);

const LocalFile = Components.Constructor("@mozilla.org/file/local;1",
                                         "nsILocalFile",
                                         "initWithPath");

const INFORSS_MINUTES_TO_MS = 60 * 1000;

const NL_MATCHER = new RegExp("\n", "g");

//FIXME Maybe make this a separate class of which there should be only one.
//That way it at least has a chance of shutting itself down cleanly, not to
//mention ensuring we don't start downloading multiple podcasts at once.

/** This maintains a queue of podcasts to download. */
const podcast_array = [];
const download_timer = new Sleeper();

/** Process the next podcast. */
async function download_next_podcast()
{
  try
  {
    while (podcast_array.length !== 0)
    {
      //eslint-disable-next-line no-await-in-loop
      await download_timer.sleep(2000);
      const headline = podcast_array.shift();
      try
      {
        console.info("Saving prodcast " + headline.enclosureUrl);
        const uri = make_URI(headline.enclosureUrl);
        const url = uri.QueryInterface(Components.interfaces.nsIURL);
        const file = new LocalFile(headline.feed.getSavePodcastLocation());
        file.append(url.fileName);
        //eslint-disable-next-line no-await-in-loop
        await Downloads.fetch(uri, file);
        console.info("Saved prodcast " + headline.enclosureUrl);
        headline.feed.setAttribute(
          headline.link, headline.title, "savedPodcast", "true"
        );
      }
      catch (err)
      {
        console.error("Failed to save prodcast " + headline.enclosureUrl, err);
      }
    }
  }
  catch (err)
  {
    log_exception(err);
  }
}

/** Queue next podcast.
 *
 * @param {Headline} headline - Headline defining podcast.
 */
function queue_podcast_download(headline)
{
  podcast_array.push(headline);
  if (podcast_array.length === 1)
  {
    download_next_podcast();
  }
}

/** Fetched document wasn't valid XML. */
class Invalid_XML extends Error
{
  /**  Creates a new instance.
   *
   * @param {string} url - URL being fetched.
   * @param {object} args - Everything else.
   */
  constructor(url, ...args)
  {
    super("Received something that wasn't xml from " + url, ...args);
    this.url = url;
    this.name = this.constructor.name;
  }
}

/** Parses the response from an XMLHttpRequest, returning a document.
 *
 * @param {XMLHttpRequest} request - Fulfilled request.
 * @param {string} string - Why do we pass this?
 * @param {string} url - Request source.
 *
 * @throws
 *
 * @returns {Document} Parsed xml data.
 */
function parse_xml_data(request, string, url)
{
  //The consistency of the XML returned by various feeds isn't eactly great.
  //You can't really rely on anything, except that if the page parses, it's
  //probably XML...

  //So lets see if it contains xml?, feed or rss tags in which case we are
  //probably onto a good thing.
  //I'd just check for xml but Rachel by the bay doesn't have that, yay.

  {
    const tag = string.match(/<(?:\?xml|feed|rss)[ >]/);

    if (tag === null)
    {
      throw new Invalid_XML(url);
    }

    if (! tag[0].startsWith("<?xml"))
    {
      console.info("No <?xml> tag found in " + url + ", but found " + tag[0]);
    }

    //Some sites have rubbish before the <?xml so strip that out.
    const pos = tag.index;
    if (pos > 0)
    {
      string = string.substring(pos);
      console.info("Stripping rubbish at start of " + url);
    }
  }

  //TMI comic has unencoded strange character
  {
    const pos = string.indexOf("\x0c");
    if (pos > 0)
    {
      string = string.substring(0, pos) + string.substring(pos + 1);
      console.info("Stripping rubbish character from " + url);
    }
  }

  //Joy of tech has an unencoded & in one of the titles
  string = string.replaceAll("Worthy of Trust & Confidence?",
                             "Worthy of Trust &amp; Confidence?");


  //Some feeds don't mark themselves as XML which means we need
  //to parse them manually (one at least marks it as html). Not that this
  //matters, technically, but logging it for reference.
  {
    const type = request.getResponseHeader("content-type");
    if (! type.includes("xml"))
    {
      console.info("Overriding " + url + " type " + type);
    }
  }

  const doc = new DOMParser().parseFromString(string, "text/xml");
  if (doc.documentElement.nodeName == "parsererror")
  {
    throw new Invalid_XML(url);
  }
  return doc;
}

/** Decode response from an XMLHttpRequest.
 *
 * @param {XMLHttpRequest} request - Completed request.
 * @param {string} encoding - Optional encoding to use.
 *
 * @returns {string} Translated string.
 */
function decode_response(request, encoding = null)
{
  //Work out the format of the supplied text
  let type = "utf8";

  if (encoding == null)
  {
    const content_type = request.getResponseHeader("Content-Type");
    if (content_type != null)
    {
      const types = content_type.toLowerCase().split(/\s*; \s*/);
      for (const keypair of types)
      {
        if (keypair.startsWith("charset="))
        {
          type = keypair.substr(8).replace(/['"]/g, "");
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

/** Base class for all feeds.
 *
 * @class
 * @extends Feed
 *
 * @param {RSS} feedXML - Dom parsed xml config.
 * @param {object} options - Useful information handed to super.
 */
function Single_Feed(feedXML, options)
{
  Feed.call(this, feedXML, options);
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

  Object.seal(this);
}

const Super = Feed.prototype;
Single_Feed.prototype = Object.create(Super);
Single_Feed.prototype.constructor = Single_Feed;

complete_assign(Single_Feed.prototype, {

  /** Clean shutdown. */
  dispose()
  {
    Super.dispose.call(this);
    this.abortRequest();
    this.stopFlashingIcon();
    this._clear_sync_timer();
    clearTimeout(this._read_timeout);
  },

  /** Produce entry in console log with feed, url, and anything else.
   *
   * @param {Array} args - Arguments to log.
   */
  _log_info(...args)
  {
    console.info(this.getTitle() + " (" + this.getUrl() + ")", ...args);
  },

  //FIXME This'd maybe make a lot more sense if each 'item' was actually an
  //instance of a class which had appropriate getters.
  /** Generate a fake guid for when the feed hasn't supplied one.
   *
   * We use title *and* link on the basis that some feeds aren't very original
   * with their titles. We don't use the pubdate because in theory you can
   * republish the same story but with a different date (though in that case why
   * you'd not be supplying a guid is beyond me).
   *
   * @param {object} item - A headline object.
   *
   * @returns {string} Hopefully a globally unique ID.
   */
  get_guid(item)
  {
    if (! ("guid" in item))
    {
      let guid = this.get_guid_impl(item);
      if (guid == null || guid == "")
      {
        if (guid == "")
        {
          this._log_info("Explicit empty guid in ", item);
        }
        //FIXME This should likely be replaced with
        //link + '#' + encoded title
        guid = this.get_title(item) + "::" + this.get_link(item);
      }
      item.guid = guid;
    }
    return item.guid;
  },

  /** Get the target of the item. If there isn't one, use the home page.
   *
   * @param {object} item - A headline object.
   *
   * @returns {URL} Target link.
   */
  get_link(item)
  {
    if (! ("link" in item))
    {
      const href = this.get_link_impl(item);
      //It's not entirely clear with relative addresses what you are relative
      //to, so guessing this.
      const feed = this.getLinkAddress();
      if (href == null || href == "")
      {
        this._log_info("Null link found in", item);
        item.link = feed;
      }
      else if (feed == null)
      {
        this._log_info("Null link feed found in feed", item, href);
        item.link = href;
      }
      else
      {
        item.link = (new URL(href, feed)).href;
      }
    }
    return item.link;
  },

  /** Get the publication date of the item.
   *
   * @param {object} item - A headline object.
   *
   * @returns {Date} Date of publication, or null.
   */
  get_pubdate(item)
  {
    if (! ("pubdate" in item))
    {
      let pubDate = this.get_pubdate_impl(item);
      if (pubDate != null)
      {
        let res = new Date(pubDate);
        if (isNaN(res))
        {
          this._log_info("Invalid date " + pubDate + " found in", item);
          res = null;
        }
        pubDate = res;
      }
      item.pubdate = pubDate;
    }
    return item.pubdate;
  },

  /** Get the description of the item.
   *
   * This will remove any script tags so that the description can be safely
   * displayed in a tooltip.
   *
   * @warning Do NOT overide this method. Override the impl method.
   *
   * @param {object} item - A headline object.
   *
   * @returns {string} Sanitised description.
   */
  get_description(item)
  {
    let description = this.get_description_impl(item);
    if (description != null)
    {
      description = htmlFormatConvert(description).replace(NL_MATCHER, " ");
      description = this._remove_script(description);
    }
    return description;
  },

  /** Get the enclosure details of the item.
   *
   * @warning Do NOT overide this method. Override the impl method below.
   *
   * @param {object} item - Item in which we are interested.
   *
   * @returns {object} Enclosure information.
   */
  get_enclosure_info(item)
  {
    if (! ("enclosure_url" in item))
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

  /** Default implementation of code to get enclosure information.
   *
   * Feeds should override this method if necessary.
   *
   * @param {object} item - Item to check for enclosure.
   *
   * @returns {object} Enclosure details.
   */
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

  /** Return a null enclosure object.
   *
   * @returns {object} Enclosure object with all attributes nulled.
   */
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

  /** Get the result of a query as text.
   *
   * FIXME This is static so why is it here?
   *
   * @param {NodeList} results - Hopefully single value.
   *
   * @returns {string} Textual results, or null.
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
      this._mediator.publishFeed(this);
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

  /** Get all the headlines as an xml string.
   *
   * @returns {string} Headlines formatted as an xml document.
   */
  get headlines_as_xml()
  {
    const doc = (new DOMParser()).parseFromString("<dummy/>", "text/xml");
    doc.removeChild(doc.documentElement);
    const headlines = doc.createElement("headlines");
    headlines.setAttribute("url", this.getUrl());
    doc.append(headlines);
    for (const headline of this.headlines)
    {
      headlines.append(headline.as_node(doc));
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
        //FIXME This is questionable as scrolling doesn't start. Also, this
        //relies on knowing the internals of headlines, so it should probably
        //belong to the Headline class.
        let viewed_date = headline.getAttribute("_viewed_date");
        if (viewed_date !== null)
        {
          viewed_date = new Date(viewed_date);
        }
        const head = new Headline(
          new Date(headline.getAttribute("receivedDate")),
          new Date(headline.getAttribute("pubDate")),
          headline.getAttribute("_title"),
          headline.getAttribute("_guid"),
          headline.getAttribute("_link"),
          headline.getAttribute("description"),
          headline.getAttribute("category"),
          headline.getAttribute("enclosureUrl"),
          headline.getAttribute("enclosureType"),
          headline.getAttribute("enclosureSize"),
          viewed_date,
          headline.getAttribute("_banned"),
          this,
          this.config);
        this.headlines.push(head);
      }
      this._publish_feed();
    }
  },

  //----------------------------------------------------------------------------
  deactivate()
  {
    Super.deactivate.call(this);
    this._mediator.unpublishFeed(this);
    this.insync = false;
    this._clear_sync_timer();
    this.abortRequest();
    this.stopFlashingIcon();
    this.publishing_enabled = true; //This seems a little odd
  },

  //----------------------------------------------------------------------------
  fetchFeed()
  {
    if (! this.getFeedActivity())
    {
      return;
    }

    if (this._xml_http_request != null)
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
    if (! this.active)
    {
/**/console.log("feed " + this.getUrl() + " not active", new Error(), this);
      return;
    }

    //We do this anyway because if we're not in a group, we'll just end up
    //overwriting the icon with the same icon.
    this._mediator.show_feed_activity(this);

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
      //I have seen this when the 'activity' tick box was cleared in the options
      //window and the feed was selected as the current feed.
      //That's the only way of getting into that state and it's a bug.
/**/console.log("last refresh not set", this);
      return new Date();
    }
    const delay = this.feedXML.getAttribute("refresh");
    const refresh = delay * INFORSS_MINUTES_TO_MS;
    const next = new Date(this.lastRefresh.getTime() + refresh);
    this.next_refresh = next;
    return next;
  },

  /** Start processing headlines.
   *
   * This starts off the fetch of the headlines, then kicks off a chain of
   * async timeouts to process each headline.
   *
   * Non- xmlHttpRequest based feeds should override this.
   */
  async start_fetch()
  {
    const url = this.getUrl();
    //let aborted = false; //Pending the finally at the end.
    try
    {
      const options = {
        user: this.getUser(),
        headers: { },
        responseType: "arraybuffer"
      };
      if (this._page_last_modified != null)
      {
        options.headers["If-Modified-Since"] = this._page_last_modified;
      }
      if (this._page_etag != null)
      {
        options.headers["If-None-Match"] = this._page_etag;
      }

      this._xml_http_request = new XML_Request(url, options);
      const response = await this._xml_http_request.fetch();

      //In theory we should always forget xmlHttpRequest here, but it's used to
      //indicate we are busy. This is questionable in terms of aborting and one
      //or two other things we do.

      if (response.status == 304)
      {
        //Not changed since last time, so no need to reprocess all the entries.
        this.error = false;
        this._log_info("... unmodified");
        this.end_processing();
        return;
      }

      //Remember when we were last modified
      this._page_last_modified = response.getResponseHeader("Last-Modified");
      this._page_etag = response.getResponseHeader("ETag");

      let type = null;

      if (this.feedXML.hasAttribute("encoding") &&
          this.feedXML.getAttribute("encoding") != "")
      {
        type = this.feedXML.getAttribute("encoding");
      }

      //FIXME As you can see further down the code, process_headlines keeps
      //calling overriden methods with an 'item'. It'd be more OO to make
      //each item know how to return the correct value.
      this.process_headlines(
        this.read_headlines(response, decode_response(response, type))
      );

      //FIXME The above should be an await but process_headlines involves lots
      //of timeouts which aren't done as async. Then we could tidy up in the
      //finally block (currently commented out).
      //We also need to address the nntp code because that calls end_processing
    }
    catch (err)
    {
      if ("url" in err)
      {
        //One of my fetch aborts. Stack trace isn't terribly helpful.
        console.warn(this.getTitle(), err.message);
      }
      else
      {
        //Something whacky happened.
        //FIXME Should this be debug()?
        console.error(err);
      }
      if (err.name !== "Fetch_Abort")
      {
        if (! this.disposed)
        {
          this.error = true;
          this.end_processing();
        }
      }
    }

    /* To be added later once we clean up all feeds to be async.
    finally
    {
      if (! aborted)
      {
        this.end_processing();
        this._xml_http_request = null;
      }
    }
    */
  },

  //----------------------------------------------------------------------------
  stopFlashingIcon()
  {
    this._mediator.show_no_feed_activity();
  },

  //FIXME nntp feed definitely and possibly others need to provide an override
  /** Abort the current request .
   *
   * Non-xmlhtttprequest feeds should override this.
   */
  abortRequest()
  {
    if (this._xml_http_request != null)
    {
      this._xml_http_request.abort();
      this._xml_http_request = null;
    }
  },

  //----------------------------------------------------------------------------
  //Processing is finished, stop flashing, kick the main code
  end_processing()
  {
    this._xml_http_request = null;
    this.stopFlashingIcon();
    this.reload = false;
    this._manager.signalReadEnd(this);
  },

  //----------------------------------------------------------------------------
  //For xml based feeds, this parses the xml and returns it
  read_xml_feed(request, string)
  {
    return parse_xml_data(request, string, this.getUrl());
  },

  /** Process each headline in the feed.
   *
   * @param {Array} headlines - headlines to process
   */
  process_headlines(headlines)
  {
    this.error = false;
    const url = this.getUrl();
    //FIXME Replace with a sequence of promises
    this._read_timeout = setTimeout(event_binder(this._read_feed_1, this),
                                    0,
                                    headlines.length - 1,
                                    headlines,
                                    this.lastRefresh,
                                    url);
  },

  /** Convert one read headline to a headline object.
   *
   * @param {object} item - A headline extracted from feed xml.
   * @param {Date} received_date - When the headline was received.
   * @param {boolean} remember_headlines - If true, then check against our
   *                  headline database to see if we've already received it.
   * @param {string} save_podcast_location - If not blank, podcasts will be
   *                 saved to the specified location.
   *
   * @returns {Headline} A beautiful headline object...
   */
  get_headline(
    item, received_date, remember_headlines = false, save_podcast_location = ""
  )
  {
    let title = htmlFormatConvert(this.get_title(item)).replace(
      NL_MATCHER, " ");
    if (title == "")
    {
      title = "(no title)";
    }

    const link = this.get_link(item);

    const { enclosure_url, enclosure_type, enclosure_size } =
      this.get_enclosure_info(item);

    let banned = false;
    let viewed_date = null;
    if (remember_headlines)
    {
      if (this.exists(link, title, this.getBrowserHistory()))
      {
        //Get dates and status from cache
        const oldReceivedDate = this.getAttribute(link, title, "receivedDate");
        if (oldReceivedDate != null)
        {
          received_date = new Date(oldReceivedDate);
        }

        const oldReadDate = this.getAttribute(link, title, "readDate");
        //RDF doesn't support null, so you get an empty string instead.
        if (oldReadDate != null && oldReadDate != "")
        {
          viewed_date = new Date(oldReadDate);
        }

        const oldBanned = this.getAttribute(link, title, "banned");
        if (oldBanned != null)
        {
          banned = oldBanned == "true";
        }
      }
      else
      {
        this.createNewRDFEntry(link, title, received_date);
      }
    }

    const headline = new Headline(
      received_date,
      this.get_pubdate(item) ?? received_date,
      title,
      this.get_guid(item),
      link,
      this.get_description(item),
      this.get_category(item),
      enclosure_url,
      enclosure_type,
      enclosure_size,
      banned,
      viewed_date,
      this,
      this.config
    );

    //Download podcast if we haven't already.
    //FIXME why can the URL be null-or-blank. Similar question for the
    //attribute.
    if (save_podcast_location != "" &&
        enclosure_url != null &&
        enclosure_url != "" &&
        (this.getAttribute(link, title, "savedPodcast") == null ||
         this.getAttribute(link, title, "savedPodcast") == "false"))
    {
      queue_podcast_download(headline);
    }

    return headline;
  },

  //----------------------------------------------------------------------------
  _read_feed_1(i, items, receivedDate, url)
  {
    if (i >= 0)
    {
      const item = items[i];
      const guid = this.get_guid(item);
      if (this.find_headline(guid) === undefined)
      {
        const headline = this.get_headline(
          item, receivedDate, this.config.remember_headlines,
          this.getSavePodcastLocation()
        );
        this.headlines.unshift(headline);
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
                                      url);
    }
    else
    {
      this._read_timeout = setTimeout(event_binder(this._read_feed_2, this),
                                      this.config.headline_processing_backoff,
                                      0,
                                      items,
                                      url);
    }
  },

  //----------------------------------------------------------------------------
  //This appears to discard entries from the 'headlines' array which aren't in
  //the items array (i.e. no longer on the feed page). Note that this is
  //horribly inefficient as most of the headlines it's just put in.
  //FIXME why would one do that? should probably be an option if you leave your
  //browser up for a long while.
  _read_feed_2(i, items, url)
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
      if (! found)
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
                                      url);
    }
    else
    {
      this.end_processing();
    }
  },

  //----------------------------------------------------------------------------
  _remove_headline(i)
  {
    this.headlines[i].reset_hbox();
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
          old_headline.reset_hbox();
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

  /** Set a headline as viewed.
   *
   * @param {string} title - Headline title.
   * @param {string} link - Url of headline.
   *
   * @returns {boolean} True if the headline was found.
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
        this.setAttribute(link, title, "viewed", "true");
        this.setAttribute(link, title, "readDate", headline.set_viewed());
        //FIXME I am at a loss as to why this should be necessary.
        this._manager.signalReadEnd(this);
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
      this._mediator.open_link(headline.link);
      mediator.set_headline_viewed(headline.title, headline.link);
    }
  },

  /** Set a headline as banned (can never be seen again).
   *
   * @param {string} title - Headline title.
   * @param {string} link - URL of headline.
   *
   * @returns {boolean} True if the headline was found.
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
        headline.set_banned();
        this.setAttribute(link, title, "banned", "true");
        //FIXME I am at a loss as to why this should be necessary.
        this._manager.signalReadEnd(this);
        return true;
      }
    }
    return false;
  },

  //----------------------------------------------------------------------------
  //FIXME This doesn't actually mark them banned. It marks them *read*.
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
   * @returns {number} number of unread headlines for this feed
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
   * @returns {number} number of new headlines for this feed
   */
  get num_new_headlines()
  {
    return this._displayed_headlines.reduce(
      (total, headline) => total + (headline.isNew() ? 1 : 0),
      0
    );
  },

  /** Get the number of headlines in this feed.
   *
   * @note This is total number of all headlines, not just the displayed ones.
   *
   * @returns {number} The number of headlines in this feed.
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
    let index1 = description.indexOf("<SCRIPT");
    if (index1 == -1)
    {
      index1 = description.indexOf("<script");
    }
    let index2 = description.indexOf("</SCRIPT>");
    if (index2 == -1)
    {
      index2 = description.indexOf("</script>");
    }

    while (index1 != -1 && index2 != -1)
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
