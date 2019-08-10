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

const { Single_Feed } = Components.utils.import(
  "chrome://inforss/content/feed_handlers/inforss_Single_Feed.jsm",
  {});

const feed_handlers = {};

Components.utils.import(
  "chrome://inforss/content/feed_handlers/inforss_factory.jsm",
  feed_handlers);

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

/** Get an appropriate one of potentially multiple link entries.
 *
 * @param {HTMLCollection} obj - collection of link objects
 *
 * @returns {string} target of alternate link or null if none found
 */
function getHref(obj)
{
  for (const elem of obj)
  {
    if (! elem.hasAttribute("rel") || elem.getAttribute("reL") == "alternate")
    {
      if (! elem.hasAttribute("type") ||
          elem.getAttribute("type") == "text/html" ||
          elem.getAttribute("type") == "application/xhtml+xml")
      {
        return elem.getAttribute("href");
      }
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
   * @param {XmlHttpRequest} xmlHttpRequest - result of fetching feed page
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
   * @param {XmlHttpRequest} request - result of fetching feed page
   */
  parse2(request)
  {
    //Note: Channel is a mozilla extension
    const url = request.channel.originalURI.asciiSpec;
    const response = Single_Feed.decode_response(request);

    const objDoc = Single_Feed.parse_xml_data(request, response, url);

    //FIXME Put this stuff in the feed handler
    const atom_feed = objDoc.documentElement.nodeName == "feed";
    this.type = atom_feed ? "atom" : "rss";

    const feed_root = atom_feed ? 'feed' : 'channel';
    const str_description = atom_feed ? "tagline" : "entry";
    this.link = atom_feed ?
      getHref(objDoc.querySelectorAll("feed >link")) :
      getNodeValue(objDoc.querySelectorAll("channel >link"));

    this.description =
      getNodeValue(objDoc.querySelectorAll(feed_root + " >" + str_description));
    this.title = getNodeValue(objDoc.querySelectorAll(feed_root + " >title"));

    const feedXML = objDoc.createElement("rss");
    feedXML.setAttribute("type", this.type);
    feedXML.setAttribute("url", url);
    feedXML.setAttribute("link", this.link);
    const feed = feed_handlers.factory.create(feedXML, null, null, null, null);
console.log(feed)
    for (const headline of feed.get_headlines(objDoc))
    {
      this._add_headline(
        feed.get_title(headline),
        feed.get_description(headline),
        feed.get_link(headline),
        feed.get_category(headline)
      );
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
        this.headlines.map(headline => headline.category).
          filter(category => category != null))).sort();
  }
};
