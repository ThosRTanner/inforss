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
// inforssInformation
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------
/* globals inforssDebug, inforssTraceIn, inforssTraceOut */
Components.utils.import("chrome://inforss/content/modules/inforssDebug.jsm");

/* globals inforssFeedRss, inforssFeedAtom, inforssGroupedFeed */
/* globals inforssFeedHtml, inforssFeedNntp */

function inforssInformation(feedXML, manager, menuItem)
{
  //unused ? this.selected = false;
  //FIXME although probably it should be a property which wraps feedXML
  this.active = false;
  this.feedXML = feedXML;
  this.manager = manager;
  this.menuItem = menuItem;
  this.acknowledgeDate = null;
  this.popup = false;
  this.lastRefresh = null;
  this.next_refresh = null;
  this.publishing_enabled = true; //Set if this is currently part of a playlist
}

inforssInformation.prototype = Object.create(inforssInformation.prototype);
inforssInformation.prototype.constructor = inforssInformation;

Object.assign(inforssInformation.prototype, {

  //----------------------------------------------------------------------------
  isSelected()
  {
    return this.feedXML.getAttribute("selected") == "true";
  },

  //----------------------------------------------------------------------------
  select()
  {
    inforssTraceIn(this);
    try
    {
      this.feedXML.setAttribute("selected", "true");
      if (this.menuItem != null) //FIXME can it ever be null?
      {
        this.menuItem.setAttribute("checked", "true");
      }
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  },

  //----------------------------------------------------------------------------
  unselect()
  {
    inforssTraceIn(this);
    try
    {
      this.feedXML.setAttribute("selected", "false");
      if (this.menuItem != null)
      {
        this.menuItem.setAttribute("checked", "false");
      }
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  },

  //----------------------------------------------------------------------------
  isActive()
  {
    return this.active;
  },

  //----------------------------------------------------------------------------
  isPlayList()
  {
    return this.feedXML.getAttribute("playlist") == "true";
  },

  //----------------------------------------------------------------------------
  getUrl()
  {
    return this.feedXML.getAttribute("url");
  },

  //----------------------------------------------------------------------------
  getNbItem()
  {
    return this.feedXML.getAttribute("nbItem");
  },

  //----------------------------------------------------------------------------
  getLengthItem()
  {
    return this.feedXML.getAttribute("lengthItem");
  },

  //----------------------------------------------------------------------------
  getSavePodcastLocation()
  {
    return this.feedXML.getAttribute("savePodcastLocation");
  },

  //----------------------------------------------------------------------------
  getEncoding()
  {
    return this.feedXML.getAttribute("encoding");
  },

  //----------------------------------------------------------------------------
  removeRss(/*url*/)
  {
    //Overridden by inforssGroupedFeed
  },

  //----------------------------------------------------------------------------
  getType()
  {
    return this.feedXML.getAttribute("type");
  },

  //----------------------------------------------------------------------------
  getTitle()
  {
    return this.feedXML.getAttribute("title");
  },

  //----------------------------------------------------------------------------
  getIcon()
  {
    return this.feedXML.getAttribute("icon");
  },

  //----------------------------------------------------------------------------
  getLinkAddress()
  {
    return this.feedXML.getAttribute("link");
  },

  //----------------------------------------------------------------------------
  getFilter()
  {
    return this.feedXML.getAttribute("filter");
  },

  //----------------------------------------------------------------------------
  getFeedActivity()
  {
    return this.feedXML.getAttribute("activity") == "true";
  },

  //----------------------------------------------------------------------------
  getBrowserHistory()
  {
    return this.feedXML.getAttribute("browserHistory") == "true";
  },

  //----------------------------------------------------------------------------
  getFilters()
  {
    return this.feedXML.getElementsByTagName("FILTER");
  },

  //----------------------------------------------------------------------------
  getFilterPolicy()
  {
    return this.feedXML.getAttribute("filterPolicy");
  },

  //----------------------------------------------------------------------------
  reset()
  {
    this.active = false;
  },

  //----------------------------------------------------------------------------
  remove()
  {
    try
    {
      if (this.menuItem != null)
      {
        this.menuItem.parentNode.removeChild(this.menuItem);
      }
      this.feedXML.parentNode.removeChild(this.feedXML);
      this.deactivate();
      this.menuItem = null;
      this.feedXML = null;
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
  },

  //----------------------------------------------------------------------------
  createNewRDFEntry(url, title, receivedDate)
  {
    try
    {
      this.manager.createNewRDFEntry(url, title, receivedDate, this.getUrl());
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
  },

  //----------------------------------------------------------------------------
  exists(url, title, checkHistory)
  {
    return this.manager.exists(url, title, checkHistory, this.getUrl());
  },

  //----------------------------------------------------------------------------
  getAttribute(url, title, attribute)
  {
    return this.manager.getAttribute(url, title, attribute);
  },

  //----------------------------------------------------------------------------
  setAttribute(url, title, attribute, value)
  {
    return this.manager.setAttribute(url, title, attribute, value);
  },

  //----------------------------------------------------------------------------
  setAcknowledgeDate(date)
  {
    this.acknowledgeDate = date;
    this.feedXML.setAttribute("acknowledgeDate", date);
  },

  //----------------------------------------------------------------------------
  getAcknowledgeDate()
  {
    if (this.acknowledgeDate == null)
    {
      if (this.feedXML.hasAttribute("acknowledgeDate"))
      {
        this.acknowledgeDate = new Date(this.feedXML.getAttribute("acknowledgeDate"));
      }
    }
    return this.acknowledgeDate;
  },

  //----------------------------------------------------------------------------
  getPopup()
  {
    return this.popup;
  },

  //----------------------------------------------------------------------------
  setPopup(flag)
  {
    this.popup = flag;
  }
});

//------------------------------------------------------------------------------
inforssInformation.createInfoFactory = function(feedXML, manager, menuItem)
{
  var info = null;
  switch (feedXML.getAttribute("type"))
  {
    case "rss":
      {
        info = new inforssFeedRss(feedXML, manager, menuItem);
        break;
      }
    case "atom":
      {
        info = new inforssFeedAtom(feedXML, manager, menuItem);
        break;
      }
    case "group":
      {
        info = new inforssGroupedFeed(feedXML, manager, menuItem);
        break;
      }
    case "html":
      {
        info = new inforssFeedHtml(feedXML, manager, menuItem);
        break;
      }
    case "nntp":
      {
        info = new inforssFeedNntp(feedXML, manager, menuItem);
        break;
      }
    default:
      {
        break;
      }
  }
  return info;
};
