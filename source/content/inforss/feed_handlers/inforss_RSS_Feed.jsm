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
// inforss_RSS_Feed
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------
/* jshint globalstrict: true */
/* eslint-disable strict */
"use strict";

/* eslint-disable array-bracket-newline */
/* exported EXPORTED_SYMBOLS */
const EXPORTED_SYMBOLS = [
  "RSS_Feed", /* exported RSS_Feed */
];
/* eslint-enable array-bracket-newline */

const { Single_Feed } = Components.utils.import(
  "chrome://inforss/content/feed_handlers/inforss_Single_Feed.jsm",
  {}
);

const { console } =
  Components.utils.import("resource://gre/modules/Console.jsm", {});

/** A feed which uses the RSS spec
 *
 * @class
 * @extends Single_Feed
 *
 * @param {Object} feedXML - dom parsed xml config
 * @param {Array} args - arguments
 * either (normal usage)
 * param {Manager} manager - current feed manager
 * param {Object} menuItem - item in main menu for this feed. Really?
 * param {Mediator} mediator - for communicating with headline bar
 * param {Config} config - extension configuration
 * or (creating a feed object for configuration / menu display)
 * param {URI} url - feeds xml page
 * param {XMLDocument} doc - extension configuration
 */
function RSS_Feed(feedXML, ...args)
{
  if (args.length == 2)
  {
    const doc = args[1];
    feedXML.setAttribute("url", args[0]);
    this.link = this.get_query_value(doc.querySelectorAll("channel >|link"));
    feedXML.setAttribute("link", this.link);
    this.title = this.get_query_value(doc.querySelectorAll("channel >title"));
    this.description =
      this.get_query_value(doc.querySelectorAll("channel >description"));
    Single_Feed.call(this, feedXML, null, null, null, null);
  }
  else
  {
    Single_Feed.call(this, feedXML, ...args);
  }
}

RSS_Feed.prototype = Object.create(Single_Feed.prototype);
RSS_Feed.prototype.constructor = RSS_Feed;

Object.assign(RSS_Feed.prototype, {

  get_guid_impl(item)
  {
    return this.get_text_value(item, "guid");
  },

  get_title(item)
  {
    return this.get_text_value(item, "title");
  },

  get_link_impl(item)
  {
    //If we have a permanent link, use that for preference, as I think some
    //feeds are a touch unhelpful
    const elems = item.getElementsByTagName("guid");
    if (elems.length != 0 &&
        (! elems[0].hasAttribute("isPermaLink") ||
         elems[0].getAttribute("isPermalink") == "true"))
    {
      let guid = elems[0].textContent;
      if (guid != "")
      {
        const linke = item.getElementsByTagName("link");
        //Hunters of salamanstra is very very broken. I am not sure why I bother
        //with this except it makes it clear they're broken and not me.
        if (linke.length != 0 && linke[0].textContent != guid)
        {
          console.log("link '" + linke[0].textContent + "' and guid '" + guid +
                        "' are different", item);
        }
        if (guid.startsWith("hhttp:") || guid.startsWith(">http:"))
        {
          console.log("guid '" + guid + "' is malformed", item);
          guid = guid.substring(1);
        }
        return guid;
      }
    }

    return this.get_text_value(item, "link");
  },

  /** Get the publication date of item
   *
   * @param {Object} item - An element from an atom feed
   *
   * @returns {string} date of publication or null
   */
  get_pubdate_impl(item)
  {
    //Note: The official name is pubDate. There are feeds that get this wrong.
    //curvy uses pubdate. Not sure where the other ones come from.
    for (const tag of ["pubDate", "pubdate", "date", "dc:date"])
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

  get_description(item)
  {
    return this.get_text_value(item, "description");
  },

  /** Read headlines for this feed
   *
   * @param {XmlHttpRequest} request - resolved request
   * @param {string} string - decoded string from request
   *
   * @returns {HTMLCollection} headlines
   */
  read_headlines(request, string)
  {
    return this.get_headlines(this.read_xml_feed(request, string));
  },

  /** Get headlines for this feed
   *
   * @param {Document} doc - parsed xml
   *
   * @returns {HTMLCollection} headlines
   */
  get_headlines(doc)
  {
    return doc.getElementsByTagName("item");
  }

});

const feed_handlers = {};

Components.utils.import(
  "chrome://inforss/content/feed_handlers/inforss_factory.jsm",
  feed_handlers);

feed_handlers.factory.register("rss", RSS_Feed);
