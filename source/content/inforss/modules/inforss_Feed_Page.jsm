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

const { Single_Feed } = Components.utils.import(
  "chrome://inforss/content/feed_handlers/inforss_Single_Feed.jsm",
  {});

const { Page_Favicon } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Page_Favicon.jsm",
  {}
);

const { get_username_and_password } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Prompt.jsm",
  {}
);

const { get_string } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Version.jsm",
  {}
);

const { XML_Request } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_XML_Request.jsm",
  {}
);

const feed_handlers = {};

Components.utils.import(
  "chrome://inforss/content/feed_handlers/inforss_factory.jsm",
  feed_handlers);

//const { console } =
//  Components.utils.import("resource://gre/modules/Console.jsm", {});

/** Use this to get feed page information.
 *
 * @class
 *
 * @param {string} url - URL to fetch.
 * @param {object} options - Optional params.
 * @param {Config} options.config - Extension configuration.
 * @param {string} options.feed - Set to a feed xml config to use that config,
 *                                rather than work it out from the fetched page.
 * @param {string} options.fetch_icon - Set to true to fetch icon.
 * @param {string} options.user - User id.
 * @param {string} options.password - If unset, will fetch from password store.
 * @param {string} options.refresh_feed - Set to true if refreshing feed config.
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
  this._config = options.config;
  this._fetch_icon = options.fetch_icon;
  this._feed_config = options.feed_config;
  this._refresh_feed = options.refresh_feed;
  this._icon = undefined;
  this._request = null;
  //FIXME This test shouldn't be here. It should be in the one place that
  //needs this (creating a feed from main window)
  if (this._user === undefined)
  {
    if (this._url.startsWith("https://"))
    {
      const res = get_username_and_password(
        get_string("account") + " " + this._url);
      if (res == null)
      {
        //FIXME Should use get_string
        throw new Error("User cancelled");
      }
      this._user = res.user;
      this._password = res.password;
    }
    else
    {
      this._user = null;
    }
  }
}

Feed_Page.prototype =
{

  /** Starts the fetch.
   *
   * @returns {inforss_Feed} Feed information
   */
  async fetch()
  {
    this._request = new XML_Request(
      {
        url: this._url,
        user: this._user,
        password: this._password,
        headers: { "If-Modified-Since": null },
        responseType: "arraybuffer"
      }
    );

    try
    {
      const request = await this._request.fetch();
      this._original_request = this._request;
      const response = Single_Feed.decode_response(request);

      if (this._feed_config === undefined || this._refresh_feed)
      {
        //Creating a new feed or refreshing an existing one
        const objDoc = Single_Feed.parse_xml_data(request, response, this._url);
        this._type = objDoc.documentElement.nodeName == "feed" ?
          "atom" :
          "rss";

        const feedXML = objDoc.createElement("rss");
        feedXML.setAttribute("type", this._type);

        this._feed = feed_handlers.factory.create(
          feedXML, { config: this._config, doc: objDoc, url: this._url });
      }
      else
      {
        this._type = this._feed_config.getAttribute("type");
        this._feed = feed_handlers.factory.create(
          this._feed_config, { config: this._config, url: this._url }
        );
      }

      const feed = this._feed;

      this._headlines = [];
      for (const headline of feed.read_headlines(request, response))
      {
        this._headlines.push(
          {
            //FIXME maybe we should just return the headline? not the rest of
            //the stuff
            headline,
            title: feed.get_title(headline),
            description: feed.get_description(headline),
            link: feed.get_link(headline),
            category: feed.get_category(headline)
          }
        );
      }

      if (this._fetch_icon)
      {
        this._request = new Page_Favicon(this._feed.link,
                                         this._user,
                                         this._password);
        const icon = await this._request.fetch();
        this._icon = icon;
        this._feed.icon = icon;
      }
    }
    finally
    {
      this._request = null;
    }

    return this._feed;
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
   * FIXME Should we actually store/return this?
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

  /** Returns whether or not the fetched URL was due to a temporary redirect.
   *
   * @returns {boolean} true if temporary redirect encountered.
   */
  get had_temporary_redirect()
  {
    return this._original_request.had_temporary_redirect;
  },

  /** Returns redirected url
   *
   * @returns {string} URL after only permanent redirects applied
   */
  get resolved_url()
  {
    return this._original_request.resolved_url;
  },

  /** Returns URL that was eventually fetch
   *
   * @returns {string} URL after all redirects applied
   */
  get response_url()
  {
    return this._original_request.response_url;
  }
};
