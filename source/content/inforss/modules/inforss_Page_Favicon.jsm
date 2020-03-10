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
// inforss_Page_Favicon
// Author : Tom Tanner, 2019
// Inforss extension
//------------------------------------------------------------------------------

/* jshint globalstrict: true */
/* eslint-disable strict */
"use strict";

/* eslint-disable array-bracket-newline */
/* exported EXPORTED_SYMBOLS */
const EXPORTED_SYMBOLS = [
  "Page_Favicon", /* exported Page_Favicon */
];
/* eslint-enable array-bracket-newline */

const { INFORSS_DEFAULT_FETCH_TIMEOUT } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Constants.jsm",
  {}
);

const { debug } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Debug.jsm",
  {}
);

const { read_password } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Utils.jsm",
  {}
);

//I'd import these properly but I have to hack round palemoon maintainers really
//disliking the class construct
const { new_Fetch_Error } = Components.utils.import(
  "chrome://inforss/content/errors/inforss_Fetch_Error.jsm",
  {}
);

const { console } =
  Components.utils.import("resource://gre/modules/Console.jsm", {});

const DOMParser = Components.Constructor("@mozilla.org/xmlextras/domparser;1",
                                         "nsIDOMParser");

const Priv_XMLHttpRequest = Components.Constructor(
  "@mozilla.org/xmlextras/xmlhttprequest;1",
  "nsIXMLHttpRequest");

/* globals URL */
Components.utils.importGlobalProperties([ 'URL' ]);

/** Use this to get the favicon for a page
 *
 * @param {string} url - url to fetch
 * @param {string} user - optional user id
 * @param {string} password - password (if undefined, will fetch)
 * @param {ProgressEvent} event - if supplied, will take the icon from this
 *                                prefetched page.
 *
 */
function Page_Favicon(url, user, password, event)
{
  this._url = url;
  this._user = user;
  this._password = password;
  this._event = event;
  this._request = null;
  if (this._user === undefined)
  {
    this._user = null;
  }
  else if (this._user != null && this._password === undefined)
  {
    this._password = read_password(this._url, this._user);
  }
  this._icon = undefined;
}

Page_Favicon.prototype =
{

  /** Starts the fetch.
   *
   * @returns {Promise} A promise to fill in the icon url.
   */
  fetch()
  {
    return new Promise(this._fetch_icon.bind(this));
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
  _fetch_icon(resolve, reject)
  {
    this._resolve = resolve;
    this._reject = reject;

    if (this._event === undefined)
    {
      const xhr = new Priv_XMLHttpRequest();
      xhr.open("GET", this._url, true, this._user, this._password);
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
      this._fetch_default_icon(this._event);
    }
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
        for (const node of doc.head.getElementsByTagName("link"))
        {
          if (! node.hasAttribute("rel"))
          {
            continue;
          }
          //There is at least one website that uses 'SHORTCUT ICON'
          const rel = node.getAttribute("rel").toLowerCase();
          if (rel == "icon" || rel == "shortcut icon")
          {
            const icon = node.getAttribute("href");
            if (icon == "https://pixietrixcomix.com/")
            {
              //This is fantastically broken
              continue;
            }
            favicon = icon;
            if (node.getAttribute("sizes") == "16x16")
            {
              break;
            }
          }
        }
        //Now we see if it actually exists and isn't null, because null ones are
        //just evil.
        const url = new URL(favicon, this._url);
        const xhr = new Priv_XMLHttpRequest();
        xhr.open("GET", url.href, true, this._user, this._password);
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
        //We don't really care if we can't get the icon.
        console.log("Error " + event.target.statusText, event);
        this._resolve(this._icon);
      }
    }
    catch (err)
    {
      //Threw an exception - log it and pretend nothing happened
      debug(err);
      this._resolve(this._icon);
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
      //empty icon and at least one returns a short error message.
      //Also we don't put this in the same check because it messes up the yoda
      //checks
      if (event.target.responseText.length >= 32)
      {
        this._icon = event.target.channel.originalURI.asciiSpec;
      }
      else
      {
        console.log("unlikely icon",
                    event.target.response,
                    event.target.channel.originalURI.asciiSpec);
      }
    }
    else
    {
      console.log("Error fetching default icon", event);
      debug("Error fetching default icon " + event);
    }
    this._resolve(this._icon);
  },

  /** No default icon for the feeds home page
   *
   * Resolve the promise but leave the icon as default.
   *
   */
  _no_default_icon(/*event*/)
  {
    this._request = null;
    this._resolve(this._icon);
  },

};
