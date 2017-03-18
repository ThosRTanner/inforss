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
//-------------------------------------------------------------------------------------------------------------
// inforssFeedRss
// Author : Didier Ernotte 2005
// Inforss extension
//-------------------------------------------------------------------------------------------------------------
function inforssFeedRss(feedXML, manager, menuItem)
{
  var self = new inforssFeed(feedXML, manager, menuItem);
  self.descriptionAttribute = "description";
  self.itemAttribute = "item";
  self.linkAttribute = "link"
  self.alternateLinkAttribute = "guid";
  self.titleAttribute = "title";
  self.itemDescriptionAttribute = "description";

  self.parse = function()
  {
    return new Array(this);
  };

  self.getLink = function(obj)
  {
    return inforssFeed.getNodeValue(obj);
  };

  self.getPubDate = function(obj)
  {
    var pubDate = inforssFeed.getNodeValue(obj.getElementsByTagName("pubDate"));
    if (pubDate == null)
    {
      pubDate = inforssFeed.getNodeValue(obj.getElementsByTagName("date"));
      if (pubDate == null)
      {
        pubDate = inforssFeed.getNodeValue(obj.getElementsByTagName("dc:date"));
      }
    }
    //dump("##### pubdate=" + pubDate + "\n");
    return pubDate;
  }

  return self;
}
