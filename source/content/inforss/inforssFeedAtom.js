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
// inforssFeedAtom
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------

var inforss = inforss || {};

inforss.feed_handlers = inforss.feed_handlers || {};

Components.utils.import(
  "chrome://inforss/content/feed_handlers/inforss_factory.jsm",
  inforss.feed_handlers);

inforss.feed_handlers.factory.register("atom", inforssFeedAtom);

/* globals inforssFeed */
function inforssFeedAtom(feedXML, manager, menuItem, config)
{
  inforssFeed.call(this, feedXML, manager, menuItem, config);
}

inforssFeedAtom.prototype = Object.create(inforssFeed.prototype);
inforssFeedAtom.prototype.constructor = inforssFeedAtom;

Object.assign(inforssFeedAtom.prototype, {

  get_guid_impl(item)
  {
    return this.get_text_value(item, "id");
  },

  get_title(item)
  {
    return this.get_text_value(item, "title");
  },

  get_link_impl(item)
  {
    //FIXME Make this into a querySelector
    for (let entry of item.getElementsByTagName("link"))
    {
      if (entry.hasAttribute("href") &&
          (! entry.hasAttribute("rel") || entry.getAttribute("rel") == "alternate"))
      {
        if (! entry.hasAttribute("type") ||
            entry.getAttribute("type") == "text/html" ||
            entry.getAttribute("type") == "application/xhtml+xml")
        {
          return entry.getAttribute("href");
        }
      }
    }
    return null;
  },

  get_pubdate_impl(item)
  {
    //FIXME Make this into a querySelector then use .textcontent
    let pubDate = inforssFeed.getNodeValue(item.getElementsByTagName("modified"));
    if (pubDate == null)
    {
      pubDate = inforssFeed.getNodeValue(item.getElementsByTagName("issued"));
      if (pubDate == null)
      {
        pubDate = inforssFeed.getNodeValue(item.getElementsByTagName("created"));
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
    //FIXME Use querySelector
    let descr = inforssFeed.getNodeValue(item.getElementsByTagName("summary"));
    if (descr == null)
    {
      descr = inforssFeed.getNodeValue(item.getElementsByTagName("content"));
    }
    return descr;
  },

  read_headlines(request, string)
  {
    const doc = this.read_xml_feed(request, string);
    return doc.getElementsByTagName("entry");
  }

});
