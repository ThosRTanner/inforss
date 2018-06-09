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
// inforssFeedRss
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------

/* global inforssFeed */

var inforss = inforss || {};

inforss.feed_handlers = {};

Components.utils.import("chrome://inforss/content/feed_handlers/factory.jsm", inforss.feed_handlers);

inforss.feed_handlers.factory.register("rss", inforssFeedRss);

function inforssFeedRss(feedXML, manager, menuItem)
{
  inforssFeed.call(this, feedXML, manager, menuItem);
  return this;
}

inforssFeedRss.prototype = Object.create(inforssFeed.prototype);
inforssFeedRss.prototype.constructor = inforssFeedRss;

Object.assign(inforssFeedRss.prototype, {

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

  get_pubdate_impl(item)
  {
    //FIXME Make this into a querySelector
    var pubDate = inforssFeed.getNodeValue(item.getElementsByTagName("pubDate"));
    if (pubDate == null)
    {
      pubDate = inforssFeed.getNodeValue(item.getElementsByTagName("date"));
      if (pubDate == null)
      {
        pubDate = inforssFeed.getNodeValue(item.getElementsByTagName("dc:date"));
      }
    }
    return pubDate;
  },

  getCategory(item)
  {
    return this.get_text_value(item, "category");
  },

  getDescription(item)
  {
    return this.get_text_value(item, "description");
  },

  read_headlines(request, string)
  {
    const doc = this.read_xml_feed(request, string);
    return doc.getElementsByTagName("item");
  }

});
