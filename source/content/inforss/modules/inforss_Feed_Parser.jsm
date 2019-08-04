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
  "Feed_Parser", /* exported Feed_Parser */
];
/* eslint-enable array-bracket-newline */

const { alert } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Prompt.jsm",
  {});

const { console } =
  Components.utils.import("resource://gre/modules/Console.jsm", {});

const DOMParser = Components.Constructor("@mozilla.org/xmlextras/domparser;1",
                                         "nsIDOMParser");

/* globals URL */
Components.utils.importGlobalProperties(['URL']);

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
  //FIXME I'm not sure if this is correct.
  for (const elem of obj)
  {
    const attr = elem.getAttribute("rel");
    if (attr == "self" || attr == "alternate")
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

    //This should probably only be links at the top level for atom feeds.
    this.link = atom_feed ?
      getHref(objDoc.getElementsByTagName("link")) :
      getNodeValue(objDoc.getElementsByTagName("link"));
    this.description =
      getNodeValue(objDoc.getElementsByTagName(str_description));
    this.title = getNodeValue(objDoc.getElementsByTagName("title"));

    for (const item of objDoc.getElementsByTagName(str_item))
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
    for (const headline of this.headlines)
    {
      if (headline.category != "")
      {
        categories.add(headline.category);
      }
    }
    return Array.from(categories).sort();
  }
};
