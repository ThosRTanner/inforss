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
// inforss_Feed_Parser
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------

/* jshint globalstrict: true */
/* eslint-disable strict */
"use strict";

/* eslint-disable array-bracket-newline */
/* exported EXPORTED_SYMBOLS */
const EXPORTED_SYMBOLS = [
  "Feed_Parser_Promise", /* exported Feed_Parser_Promise */
  "Feed_Parser", /* exported Feed_Parser */
];
/* eslint-enable array-bracket-newline */

const { INFORSS_DEFAULT_FETCH_TIMEOUT } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Constants.jsm",
  {});

const { debug } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Debug.jsm",
  {});

const {
  alert,
  get_username_and_password
} = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Prompt.jsm",
  {});

const { read_password } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Utils.jsm",
  {});

const { get_string } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Version.jsm",
  {});

const { console } =
  Components.utils.import("resource://gre/modules/Console.jsm", {});

const DOMParser = Components.Constructor("@mozilla.org/xmlextras/domparser;1",
                                         "nsIDOMParser");

const Priv_XMLHttpRequest = Components.Constructor(
  "@mozilla.org/xmlextras/xmlhttprequest;1",
  "nsIXMLHttpRequest");

/* globals URL */
Components.utils.importGlobalProperties(['URL']);

//FIXME The classes in here need a good renaming and possibly the file should
//be split into two (1 per class)

//------------------------------------------------------------------------------
function getNodeValue(obj)
{
  return obj.length == 0 || obj[0] == null || obj[0].firstChild == null ?
    "" :
    obj[0].firstChild.nodeValue;
}

//------------------------------------------------------------------------------
function getHref(obj)
{
  //FIXME Wouldn't this be better coded as doc.querySelector(rel == alternate
  //&& type == link) on the whole objdoc?
  for (let elem of obj)
  {
    if (elem.getAttribute("rel") == "alternate")
    {
      return elem.getAttribute("href");
    }
  }
  return null;
}

//------------------------------------------------------------------------------
function Feed_Parser()
{
  this.title = null;
  this.description = null;
  this.link = null;
  this.headlines = [];
  this.type = null;
  this.icon = undefined;
}

Feed_Parser.prototype = {

  /** Add headline to list of headlines
   *
   * @param {string} title - article title
   * @param {string} description - article description
   * @param {string} link - url of article
   * @param {string} category - category of article
   */
  _add_headline(title, description, link, category)
  {
    this.headlines.push({ title, description, link, category });
  },

  /** wrapper round parse2 which eats all exceptions
   *
   * @param {XmlHttpRequest} xmlhttprequest - result of fetching feed page
   */
  parse(xmlHttpRequest)
  {
    try
    {
      //Note: Channel is a mozilla extension
      const url = xmlHttpRequest.channel.originalURI.asciiSpec;

      //Note: I've only seen this called when you have 'display as submenu'
      //selected. Also it is iffy as it replicates code from inforssFeedxxx
      if (xmlHttpRequest.status >= 400)
      {
        alert(xmlHttpRequest.statusText + ": " + url);
        return;
      }

      this.parse2(xmlHttpRequest);
    }
    catch (err)
    {
      console.log("Error processing", xmlHttpRequest, err);
      alert("error processing: " + err);
    }
  },

  //FIXME This function does the same as the factory in inforss.Single_Feed but
  //not as well (and should use the factory) and in inforss.js. This should hand
  //off to the individual feeds
  /** Parses a feed page into feed details and headlines
   *
   * @param {XmlHttpRequest} xmlhttprequest - result of fetching feed page
   */
  parse2(xmlHttpRequest)
  {
    //Note: Channel is a mozilla extension
    const url = xmlHttpRequest.channel.originalURI.asciiSpec;
    let string = xmlHttpRequest.responseText;

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

    const objDOMParser = new DOMParser();
    const objDoc = objDOMParser.parseFromString(string, "text/xml");

    const atom_feed = objDoc.documentElement.nodeName == "feed";
    this.type = atom_feed ? "atom" : "rss";
    const str_description = atom_feed ? "tagline" : "entry";
    const str_item = atom_feed ? "entry" : "item";

    this.link = atom_feed ?
      getHref(objDoc.getElementsByTagName("link")) :
      getNodeValue(objDoc.getElementsByTagName("link"));
    this.description =
      getNodeValue(objDoc.getElementsByTagName(str_description));
    this.title = getNodeValue(objDoc.getElementsByTagName("title"));

    for (let item of objDoc.getElementsByTagName(str_item))
    {
      let link = item.getElementsByTagName("link");
      if (link.length == 0)
      {
        link = ""; //???
      }
      else
      {
        link = atom_feed ? getHref(link) : getNodeValue(link);
        link = (new URL(link, xmlHttpRequest.channel.name)).href;
      }

      this._add_headline(
        getNodeValue(item.getElementsByTagName("title")),
        getNodeValue(item.getElementsByTagName(str_description)),
        link,
        getNodeValue(item.getElementsByTagName("category"))
      );
    }
  },

  /** returns the current list of in-use categories for this feed
   *
   * @returns {Array} array of category strings
   */
  get categories()
  {
    const categories = new Set();
    //FIXME surely I can do this with map or similar
    for (let headline of this.headlines)
    {
      if (headline.category != "")
      {
        categories.add(headline.category);
      }
    }
    return Array.from(categories).sort();
  }
};

/** This class extends error so I can write a simpler catcher */
class Parser_Error extends Error
{
  /** constructor
   *
   * @param {Event} event - event or null
   * @param {string} url - url being fetched
   */
  constructor(event, url)
  {
    super(get_string("feed.issue") + "\n" + url);
    this.event = event;
    this.url = url;
    this.type = this.constructor.name;
  }
}

/** Got an invalid status back */
class Invalid_Status_Error extends Error
{
  /** constructor
   *
   * @param {Event} event - event
   * @param {string} url - url being fetched
   * @param {Object} params - whatever error expects
   */
  constructor(event, url)
  {
    super(event.target.statusText + "\n" + url);
    this.event = event;
    this.url = url;
    this.type = this.constructor.name;
  }
}

/** Use this to get feed page information
 *
 * @param {string} url - url to fetch
 * @param {Object} options - zero or more of
 *                           user - user id. if undef, will prompt
 *                           fetch_icon - set to true to fetch icon
 *
 * If the user isn't specified and it's an https request, then an exception is
 * thrown.
 */
function Feed_Parser_Promise(url, options = {})
{
  this._url = url;
  this._user = options.user;
  this._fetch_icon = options.fetch_icon;
  this._password = null;
  this._request = null;
  this._feed = null;
  if (this._user === undefined)
  {
    if (this._url.startsWith("https://"))
    {
      const res = get_username_and_password(
        get_string("account") + " " + this._url);
      if (res == null)
      {
        //FIXME Should use get_string
        throw new Error('User cancelled');
      }
      this._user = res.user;
      this._password = res.password;
    }
  }
  else if (this._user != null)
  {
    this._password = read_password(this._url, this._user);
  }
}

Feed_Parser_Promise.prototype =
{

  /** Starts the fetch.
   *
   * @returns {Promise} A promise to return a Feed_Parser object, or null if the
   *                    user cancelled password request.
   */
  fetch()
  {
    return new Promise(this._fetch_feed.bind(this));
  },

  /** Abort outstanding request */
  abort()
  {
    if (this._request != null)
    {
      this._request.abort();
      this._request = null;
    }
  },

  /** promise wrapper for fetching feed page
   *
   * @param {Function} resolve - function that gets called on success
   * @param {Function} reject - function that gets called on failure
   */
  _fetch_feed(resolve, reject)
  {
    this._resolve = resolve;
    this._reject = reject;

    const xhr = new Priv_XMLHttpRequest();
    xhr.open("GET", this._url, true, this._user, this._password);
    xhr.timeout = INFORSS_DEFAULT_FETCH_TIMEOUT;
    xhr.onload = this._process.bind(this);
    xhr.onerror = this._error.bind(this);
    xhr.ontimeout = this._error.bind(this);
    xhr.onabort = this._error.bind(this);
    xhr.send();
    this._request = xhr;
  },

  /** Generic error handler. This currently passes the event direct to the
   * reject handler to make sense of it
   *
   * @param {ProgressEvent} event - what went wrong
   */
  _error(event)
  {
    this._request = null;
    this._reject(new Parser_Error(event, this._url));
  },

  /** Called when 'succesfully' loaded. This will reject if the status isn't
   * sane, or there's some other sort of issue
   *
   * @param {ProgressEvent} event - the data
   */
  _process(event)
  {
    this._request = null;

    if (200 <= event.target.status && event.target.status < 300)
    {
      try
      {
        //FIXME should pass the target to the constructor
        this._feed = new Feed_Parser();
        this._feed.parse2(event.target);
      }
      catch (err)
      {
        this._reject(err);
        return;
      }

      if (! this._fetch_icon)
      {
        this._resolve(this._feed);
        return;
      }

      const xhr = new Priv_XMLHttpRequest();
      xhr.open("GET", this._feed.link, true, this._user, this._password);
      xhr.timeout = INFORSS_DEFAULT_FETCH_TIMEOUT;
      xhr.onload = this._fetch_default_icon.bind(this);
      xhr.onerror = this._no_default_icon.bind(this);
      xhr.ontimeout = this._no_default_icon.bind(this);
      xhr.onabort = this._error.bind(this);
      xhr.send();
      this._request = xhr;
    }
    else
    {
      this._reject(new Invalid_Status_Error(event, this._url));
    }
  },

  /** Fetch the default icon for the feeds home page
   *
   * @param {ProgressEvent} event - result of fetching home page
   */
  _fetch_default_icon(event)
  {
    try
    {
      this._request = null;
      if (200 <= event.target.status && event.target.status < 300)
      {
        //Shouldn't be necessary but it doesn't appear that setting
        //responsetype = "document" works.
        const parser = new DOMParser();
        const doc = parser.parseFromString(event.target.responseText,
                                           "text/html");

        //Now find the favicon. A note. There's nothing that actually says
        //which icon you should chose if there's the choice of multiple ones, so
        //I take the last, unless there's an explicit 16x16 one.
        //See https://en.wikipedia.org/wiki/Favicon
        //or  https://www.w3.org/2005/10/howto-favicon
        //or  https://sympli.io/blog/2017/02/15/
        //  heres-everything-you-need-to-know-about-favicons-in-2017/
        let favicon = "/favicon.ico";
        for (let node of doc.head.getElementsByTagName("link"))
        {
          //There is at least one website that uses 'SHORTCUT ICON'
          const rel = node.getAttribute("rel").toLowerCase();
          if (rel == "icon" || rel == "shortcut icon")
          {
            favicon = node.getAttribute("href");
            if (node.hasAttributes("sizes") &&
                node.getAttribute("sizes") == "16x16")
            {
              break;
            }
          }
        }
        const url = new URL(favicon, this._feed.link);
        favicon = url.href;
        //Now we see if it actually exists and isn't null, because null ones are
        //just evil.
        const xhr = new Priv_XMLHttpRequest();
        xhr.open("GET", favicon, true, this._user, this._password);
        xhr.timeout = INFORSS_DEFAULT_FETCH_TIMEOUT;
        xhr.onload = this._found_default_icon.bind(this);
        xhr.onerror = this._no_default_icon.bind(this);
        xhr.ontimeout = this._no_default_icon.bind(this);
        xhr.onabort = this._error.bind(this);
        xhr.send();
        this._request = xhr;
      }
      else
      {
        console.log("Error " + event.target.statusText, event);
        this._resolve(this._feed);
      }
    }
    catch (err)
    {
      //Threw an exception - log it and pretend nothing happened
      debug(err);
      this._resolve(this._feed);
    }
  },

  /** Process default icon for home page.
   *
   * Validates the icon exists and is reasonably sensible. Resolve the
   * outstanding promise.
   *
   * @param {ProgressEvent} event - xmlhttprequest completion
   */
  _found_default_icon(event)
  {
    this._request = null;
    if (200 <= event.target.status && event.target.status < 300)
    {
      //Extra check that the icon is a sensible size. Some websites send an
      //empty icon  at least one returns a short error message.
      //Also we don't put this in the same check because it messes up the yoda
      //checks
      if (event.target.responseText.length >= 32)
      {
        this._feed.icon = event.target.channel.originalURI.asciiSpec;
      }
    }
    this._resolve(this._feed);
  },

  /** No default icon for the feeds home page
   *
   * Resolve the promise but leave the icon as default.
   *
   */
  _no_default_icon(/*event*/)
  {
    this._request = null;
    this._resolve(this._feed);
  },

};
