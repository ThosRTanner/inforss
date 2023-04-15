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

const { XML_Request } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_XML_Request.jsm",
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
 *
 */
function Page_Favicon(url, user, password)
{
  this._url = url;
  this._user = user;
  this._password = password;
  this._request = null;
}

Page_Favicon.prototype =
{

  /** Starts the fetch.
   *
   * @returns {Object} undefined or the url for the pages favicon.
   */
  async fetch()
  {
    this._request = new XML_Request(
      {
        url: this._url,
        user: this._user,
        password: this._password,
      }
    );
    try
    {
      return await this.fetch_from_page(await this._request.fetch());
    }
    catch (error)
    {
      if (this._request == null)
      {
        throw error;
      }
      console.log(error);
      return undefined;
    }
    finally
    {
      this._request = null;
    }
  },

  /** Fetch the default icon for the feeds home page
   *
   * @param {XMLHttpRequest} target - Resolved XMLHttpRequest
   */
  async fetch_from_page(target)
  {
    try
    {
      const parser = new DOMParser();
      const doc = parser.parseFromString(target.responseText,
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
            console.log("ignoring pixietrixcomix broken icon", node);
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
      this._request = new XML_Request(
        {
          url: url.href,
          user: this._user,
          password: this._password,
        }
      );

      const icon = await this._request.fetch();
      //Extra check that the icon is a sensible size. Some websites send an
      //empty icon and at least one returns a short error message.
      //Also we don't put this in the same check because it messes up the yoda
      //checks
      if (icon.responseText.length < 32)
      {
        console.warn("unlikely icon",
                     icon.response,
                     url);
        return undefined;
      }
      return this._request.resolved_url;
    }
    catch (err)
    {
      if (this._request == null)
      {
        throw err;
      }
      console.log(err);
      return undefined;
    }
    finally
    {
      this._request = null;
    }
  },

  /** Abort outstanding request */
  abort()
  {
    if (this._request != null)
    {
      this._request.abort();
      this._request = null;
    }
  }

};
