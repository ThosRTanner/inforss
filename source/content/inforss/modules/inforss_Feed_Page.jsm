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
// inforss_Feed_Page
// Author : Tom Tanner, 2019
// Inforss extension
//------------------------------------------------------------------------------

/* jshint globalstrict: true */
/* eslint-disable strict */
"use strict";

/* eslint-disable array-bracket-newline */
/* exported EXPORTED_SYMBOLS */
const EXPORTED_SYMBOLS = [
  "Feed_Page", /* exported Feed_Page */
];
/* eslint-enable array-bracket-newline */

const { INFORSS_DEFAULT_FETCH_TIMEOUT } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Constants.jsm",
  {}
);

const { Single_Feed } = Components.utils.import(
  "chrome://inforss/content/feed_handlers/inforss_Single_Feed.jsm",
  {});

const { debug } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Debug.jsm",
  {}
);

const { Page_Favicon } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Page_Favicon.jsm",
  {}
);

const { get_username_and_password } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Prompt.jsm",
  {}
);

const { read_password } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Utils.jsm",
  {}
);

const { get_string } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Version.jsm",
  {}
);

//I'd import these properly but I have to hack round palemoon maintainers really
//disliking the class construct
const { new_Fetch_Error } = Components.utils.import(
  "chrome://inforss/content/errors/inforss_Fetch_Error.jsm",
  {}
);

const { new_Invalid_Status_Error } = Components.utils.import(
  "chrome://inforss/content/errors/inforss_Invalid_Status_Error.jsm",
  {}
);

const feed_handlers = {};

Components.utils.import(
  "chrome://inforss/content/feed_handlers/inforss_factory.jsm",
  feed_handlers);

//const { console } =
//  Components.utils.import("resource://gre/modules/Console.jsm", {});

const Priv_XMLHttpRequest = Components.Constructor(
  "@mozilla.org/xmlextras/xmlhttprequest;1",
  "nsIXMLHttpRequest");

/** Use this to get feed page information
 *
 * @param {string} url - url to fetch
 * @param {Object} options - optional params
 * @param {string} options.user - user id.
 * @param {string} options.password - if unset, will fetch from password store
 * @param {string} options.feed - set to a feed xml config to use that config,
 *                                rather than work it out from the fetched page
 * @param {string} options.fetch_icon - set to true to fetch icon
 *
 * If the url is an https url and the user id isn't, given a prompt box is
 * generated to get the user name and password. If you escape from this, an
 * exception will be thrown.
 */
function Feed_Page(url, options = {})
{
  this._url = url;
  this._user = options.user;
  this._password = options.password;
  this._fetch_icon = options.fetch_icon;
  this._feed_config = options.feed;
  this._request = null;
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
    else
    {
      this._user = null;
    }
  }
  else if (this._user != null && this._password === undefined)
  {
    this._password = read_password(this._url, this._user);
  }
}

Feed_Page.prototype =
{

  /** Starts the fetch.
   *
   * @returns {Promise} A promise to fill in details of this feed.
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
    xhr.responseType = "arraybuffer";
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
    this._reject(new_Fetch_Error(event, this._url));
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
        const request = event.target;

        this._icon = undefined;

        const response = Single_Feed.decode_response(request);

        //Note: Channel is a mozilla extension
        const url = request.channel.originalURI.asciiSpec;

        if (this._feed_config === undefined)
        {
          const objDoc = Single_Feed.parse_xml_data(request, response, url);

          this._type = objDoc.documentElement.nodeName == "feed" ?
            "atom" :
            "rss";

          const feedXML = objDoc.createElement("rss");
          feedXML.setAttribute("type", this._type);

          this._feed = feed_handlers.factory.create(feedXML, url, objDoc);
        }
        else
        {
          this._type = this._feed_config.getAttribute("type");
          this._feed = feed_handlers.factory.create(this._feed_config, url);
        }

        const feed = this._feed;

        this._headlines = [];
        for (const headline of feed.read_headlines(request, response))
        {
          this._headlines.push(
            {
              title: feed.get_title(headline),
              description: feed.get_description(headline),
              link: feed.get_link(headline),
              category: feed.get_category(headline)
            }
          );
        }
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

      this._request = new Page_Favicon(this._feed.link,
                                       this._user,
                                       this._password);
      this._request.fetch().then(
        icon =>
        {
          this._icon = icon;
          this._feed.icon = icon;
          this._request = null;
          this._resolve(this._feed);
        }
      ).catch(
        err =>
        {
          //Threw an exception - log it and pretend nothing happened
          debug(err);
          this._request = null;
          this._resolve(this._feed);
        }
      );
    }
    else
    {
      this._reject(new_Invalid_Status_Error(event, this._url));
    }
  },

  /** returns the current list of in-use categories for this feed
   *
   * @returns {Array} sorted array of category strings
   */
  get categories()
  {
    return Array.from(
      new Set(
        this._headlines.map(headline => headline.category).
          filter(category => category != null))).sort();
  },

  /** returns the feed description
   *
   * @returns {string} feed description
   */
  get description()
  {
    return this._feed.description;
  },

  /** returns the current list of headlines for this feed
   *
   * @returns {Array} array of headlines in which they are returned by the feed
   */
  get headlines()
  {
    return this._headlines;
  },

  /** returns the current favicon for this website
   *
   * @returns {string} url of favicon, or undefined if none found
   */
  get icon()
  {
    return this._icon;
  },

  /** Gets the page the feed is linked to
   *
   * @returns {string} url of feed 'home' page
   */
  get link()
  {
    return this._feed.link;
  },

  /** returns the password if applicable
   *
   * @returns {string} password used to log in or null
   */
  get password()
  {
    return this._password;
  },

  /** returns the feed title
   *
   * @returns {string} feed title
   */
  get title()
  {
    return this._feed.title;
  },

  /** returns the feed type
   *
   * @returns {string} feed type (rss or atom)
   */
  get type()
  {
    return this._type;
  },

  /** returns the url of the feed
   *
   * @returns {string} url
   */
  get url()
  {
    return this._url;
  },

  /** returns the user name if applicable
   *
   * @returns {string} username supplied to log in or null
   */
  get user()
  {
    return this._user;
  },

};
