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

/*exported inforssFeedRss */
function inforssFeedRss(feedXML, manager, menuItem)
{
  inforssFeed.call(this, feedXML, manager, menuItem);
  this.itemAttribute = "item";
  this.itemDescriptionAttribute = "description";
}

inforssFeedRss.prototype = Object.create(inforssFeed.prototype);
inforssFeedRss.prototype.constructor = inforssFeedRss;

Object.assign(inforssFeedRss.prototype, {

  get_guid(item)
  {
    const elems = item.getElementsByTagName("guid");
    return elems.length == 0 ? null : elems[0].textContent;
  },

  get_title(item)
  {
    const elems = item.getElementsByTagName("title");
    return elems.length == 0 ? null : elems[0].textContent;
  },

  get_link(item)
  {
    //If we have a permanent link instead of a feed user that for preference,
    //as I think some feeds are broken
    let elems = item.getElementsByTagName("guid");
    if (elems.length != 0 &&
        (! elems[0].hasAttribute("isPermaLink") ||
         elems[0].getAttribute("isPermalink") == "true"))
    {
      if (elems[0].textContent == "")
      {
        console.log("[infoRSS]: Explicit empty guid", item);
      }
      else
      {
        let linke = item.getElementsByTagName("link");
        if (linke.length != 0 && linke[0].textContent != elems[0].textContent)
        {
          //Logging for now in case I care
          console.log("[infoRSS]: link '" + linke[0].textContent + "' and guid '" +
                      elems[0].textContent + "' are different", item);
          //One place where I have noticed an issue:
          //link "http://salamanstra.keenspot.com/d/20161223.html"
          //guid "http://salamanstra.keenspot.com/d/20161223.html "
        }
        return elems[0].textContent;
      }
    }

    elems = item.getElementsByTagName("link");
    return elems.length == 0 ? null : elems[0].textContent;
  },

  getPubDate(obj)
  {
    //FIXME Make this into a querySelector
    var pubDate = inforssFeed.getNodeValue(obj.getElementsByTagName("pubDate"));
    if (pubDate == null)
    {
      pubDate = inforssFeed.getNodeValue(obj.getElementsByTagName("date"));
      if (pubDate == null)
      {
        pubDate = inforssFeed.getNodeValue(obj.getElementsByTagName("dc:date"));
      }
    }
    return pubDate;
  }
});
