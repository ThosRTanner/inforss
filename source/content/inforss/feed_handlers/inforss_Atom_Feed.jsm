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
// inforss_Atom_Feed
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------

/* jshint globalstrict: true */
/* eslint-disable strict */
"use strict";

/* eslint-disable array-bracket-newline */
/* exported EXPORTED_SYMBOLS */
const EXPORTED_SYMBOLS = [
  "Atom_Feed", /* exported Atom_Feed */
];
/* eslint-enable array-bracket-newline */

const { Single_Feed } = Components.utils.import(
  "chrome://inforss/content/feed_handlers/inforss_Single_Feed.jsm",
  {}
);

//const { console } =
//  Components.utils.import("resource://gre/modules/Console.jsm", {});

/** Get an appropriate one of potentially multiple link entries.
 *
 * @param {HTMLCollection} collection - collection of link objects
 *
 * @returns {string} target of alternate link or null if none found
 */
function get_link(collection)
{
  for (const elem of collection)
  {
    if (! elem.hasAttribute("rel") || elem.getAttribute("rel") == "alternate")
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

/** A feed which uses the Atom rfc.
 *
 * @class
 * @extends Single_Feed
 *
 * @param {object} feedXML - Dom parsed xml config.
 * @param {object} options - Passed to superclass, but we use two.
 * @param {URI} options.url - Feed URL.
 * @param {Document} options.doc - Feed xml.
 *
 * The two special values are used in Feed_Page in order to set up enough of
 * a feed object to be able to process the xml read from a site.
 *
 */
function Atom_Feed(feedXML, options)
{
  if ("url" in options)
  {
    feedXML.setAttribute("url", options.url);
  }
  if ("doc" in options)
  {
    const doc = options.doc;
    const link = doc.querySelectorAll("feed >link");
    //Link is only recommended.
    if (link.length != 0)
    {
      this.link = get_link(link);
      feedXML.setAttribute("link", this.link);
    }
    this.title = this.get_query_value(doc.querySelectorAll("feed >title"));
    this.description =
      this.get_query_value(doc.querySelectorAll("feed >tagline"));
  }
  Single_Feed.call(this, feedXML, options);
}

Atom_Feed.prototype = Object.create(Single_Feed.prototype);
Atom_Feed.prototype.constructor = Atom_Feed;

Object.assign(Atom_Feed.prototype, {

  get_guid_impl(item)
  {
    return this.get_text_value(item, "id");
  },

  get_title(item)
  {
    return this.get_text_value(item, "title");
  },

  /** Get the linked page of item.
   *
   * @param {object} item - An element from an atom feed.
   *
   * @returns {string} Target page url.
   */
  get_link_impl(item)
  {
    return get_link(item.getElementsByTagName("link"));
  },

  /** Get the publication date of item.
   *
   * @param {object} item - An element from an atom feed.
   *
   * @returns {string} Date of publication or null.
   */
  get_pubdate_impl(item)
  {
    //The official tags are published and updated.
    //Apparently there are others.
    //Anyway, use published for preference.
    for (const tag of [
      "published",
      "updated",
      "modified",
      "issued",
      "created"
    ])
    {
      const elements = item.getElementsByTagName(tag);
      if (elements.length != 0)
      {
        return elements[0].textContent;
      }
    }
    return null;
  },

  get_category(item)
  {
    return this.get_text_value(item, "category");
  },

  /** Get the summary of item.
   *
   * This will be the 'summary' field if supplied, otherwise it'll be
   * the content field if that is supplied.
   *
   * @param {object} item - An element from an atom feed.
   *
   * @returns {string} Summary content or null.
   */
  get_description_impl(item)
  {
    //Note: We use this for the tooltip. It is possible for a huge wodge of html
    //to be put in the 'content' data, so we use summary for preference.
    for (const tag of [ "summary", "content" ])
    {
      const elements = item.getElementsByTagName(tag);
      if (elements.length != 0)
      {
        return elements[0].textContent;
      }
    }
    return null;
  },

  /** Read headlines for this feed.
   *
   * @param {XMLHttpRequest} request - Resolved request.
   * @param {string} string - Decoded string from request.
   *
   * @returns {HTMLCollection} Headlines.
   */
  read_headlines(request, string)
  {
    return this._get_headlines(this.read_xml_feed(request, string));
  },

  /** Get headlines for this feed.
   *
   * @param {Document} doc - Parsed xml.
   *
   * @returns {HTMLCollection} The headlines.
   */
  _get_headlines(doc)
  {
    return doc.getElementsByTagName("entry");
  }
});

const feed_handlers = {};

Components.utils.import(
  "chrome://inforss/content/feed_handlers/inforss_factory.jsm",
  feed_handlers);

feed_handlers.factory.register("atom", Atom_Feed);
