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

//-----------------------------------------------------------------------------------------------------
function getNodeValue(obj)
{
  return obj.length == 0 || obj[0] == null || obj[0].firstChild == null ?
    "" :
    obj[0].firstChild.nodeValue;
}

//-----------------------------------------------------------------------------------------------------
function getHref(obj)
{
  //FIXME Wouldn't this be better coded as doc.querySelector(rel == alternate && type == link) on the whole objdoc?
  for (let elem of obj)
  {
    if (elem.getAttribute("rel") == "alternate")
    {
      return elem.getAttribute("href");
    }
  }
  return null;
}

//-----------------------------------------------------------------------------------------------------
function Headline(title, description, link, category)
{
  this.title = title;
  this.description = description;
  this.link = link;
  this.category = category;
}

//-----------------------------------------------------------------------------------------------------
function Feed_Parser()
{
  this.title = null;
  this.description = null;
  this.link = null;
  this.headlines = [];
  this.type = null;
}

Feed_Parser.prototype = {

  //-----------------------------------------------------------------------------------------------------
  _add_headline(title, description, link, category)
  {
    this.headlines.push(new Headline(title, description, link, category));
  },

  //-----------------------------------------------------------------------------------------------------
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
    catch (e)
    {
      console.log("Error processing", xmlHttpRequest, e);
      alert("error processing: " + e);
    }
  },

  //FIXME This function does the same as the factory in inforss.Single_Feed but
  //not as well (and should use the factory) and in inforss.js. This should hand
  //off to the individual feeds
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

  //----------------------------------------------------------------------------
  getListOfCategories()
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

/** Return a promise to a feed page.
 *
 * errors if there's any html error
 *
 * @param {string} url - url to fetch
 * @param {string} user - user id. if undef, will prompt
 *
 * @returns {Promise} A promise. Null if user cancelled password request.
 */
function Feed_Parser_Promise(url, user)
{
  this._url = url;
  this._user = user;
  this._password = null;
  this._request = null;
}

Feed_Parser_Promise.prototype =
{

  /** Starts the fetch.
   *
   * @returns {Promise} promise
   */
  start()
  {
    if (this._user === undefined)
    {
      if (this._url.startsWith("https://"))
      {
        const res = get_username_and_password(
          get_string("account") + " " + this._url);
        if (res == null)
        {
          return Promise.reject([null, new Error('User cancelled')]);
        }
        this._password = res.password;
      }
    }
    else if (this._user != null)
    {
      this._password = read_password(this._url, this._user);
    }

    return new Promise(this.__promise.bind(this));
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

  /** promise handler
   *
   * @param {Function} resolve - function that gets called on success
   * @param {Function} reject - function that gets called on failure
   */
  __promise(resolve, reject)
  {
    this._resolve = resolve;
    this._reject = reject;

    const xhr = new Priv_XMLHttpRequest();
    xhr.open("GET", this._url, true, this._user, this._password);
    xhr.timeout = 5000;
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
    this._reject([event]);
  },

  /** Called when 'succesfully' loaded. This will reject if the status isn't
   * sane, or there's some other sort of issue
   *
   * @param {ProgressEvent} event - the data
   */
  _process(event)
  {
    this._request = null;
    if (event.target.status >= 200 && event.target.status < 300)
    {
      try
      {
        const fm = new Feed_Parser();
        fm.parse2(event.target);
        this._resolve(fm);
      }
      catch (err)
      {
        this._reject([event, err]);
      }
    }
    else
    {
      this._reject([event, new Error(event.target.statusText)]);
    }
  },

};
