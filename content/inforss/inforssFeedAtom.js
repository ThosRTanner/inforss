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
// inforssFeedAtom
// Author : Didier Ernotte 2005
// Inforss extension
//-------------------------------------------------------------------------------------------------------------
function inforssFeedAtom(feedXML, manager, menuItem)
{
  var self = new inforssFeed(feedXML, manager, menuItem);
  self.descriptionAttribute = "title";
  self.itemAttribute = "entry";
  self.linkAttribute = "link"
  self.alternateLinkAttribute = "link";
  self.titleAttribute = "title";
  self.itemDescriptionAttribute = "summary|content";

  self.parse = function()
  {
    return new Array(this);
  };

  self.getLink = function(obj)
  {
    var returnValue = null;
    if ((obj != null) || (obj.length != 0))
    {
      var find = false;
      var i = 0;
      while ((i < obj.length) && (find == false))
      {
        if (obj[i].getAttribute("href") != null)
        {
          if (obj[i].getAttribute("type") == null)
          {
            find = true;
          }
          else
          {
            if ((obj[i].getAttribute("type") == "text/html") ||
              (obj[i].getAttribute("type") == "application/xhtml+xml"))
            {
              find = true;
            }
            else
            {
              i++;
            }
          }
        }
        else
        {
          i++;
        }
      }
      if (find)
      {
        returnValue = obj[i].getAttribute("href")
      }
    }
    return returnValue;
  };

  self.getPubDate = function(obj)
  {
    var pubDate = inforssFeed.getNodeValue(obj.getElementsByTagName("modified"));
    if (pubDate == null)
    {
      pubDate = inforssFeed.getNodeValue(obj.getElementsByTagName("issued"));
      if (pubDate == null)
      {
        pubDate = inforssFeed.getNodeValue(obj.getElementsByTagName("created"));
      }
    }
    return pubDate;
  }

  return self;
}
