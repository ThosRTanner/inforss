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
Components.utils.import("chrome://inforss/content/inforssDebug.jsm");

var gPrefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch(null);

function inforssInformation(feedXML, manager, menuItem)
{
  this.selected = false;
  this.active = false;
  this.feedXML = feedXML;
  this.manager = manager;
  this.menuItem = menuItem;
  this.cyclingTimer = null;
  this.acknowledgeDate = null;
  this.popup = false;

//-------------------------------------------------------------------------------------------------------------
  this.isSelected = function()
  {
    return (this.feedXML.getAttribute("selected") == "true");
  };

//-------------------------------------------------------------------------------------------------------------
  this.select = function()
  {
//dump("select=" + this.getUrl() + "\n");
//dump("type=" + this.getType() + "\n");
//dump("playList=" + this.isPlayList() + "\n");
    inforssTraceIn(this);
    try
    {
      this.feedXML.setAttribute("selected", "true");
      if (this.menuItem != null)
      {
        this.menuItem.setAttribute("checked", "true");
      }
      this.clearCyclingTimer();
      if ((inforssXMLRepository.isCycling() == true) || ((this.getType() == "group") && (this.isPlayList() == true)) ||
         ((this.getType() != "group") && (this.manager.cycleGroup != null) && (this.manager.cycleGroup.isPlayList() == true)))
      {
//dump("cycle ok\n");
        if ((this.getType() == "group") &&
            (this.infoList == null))
        {
//dump("populateInfoList ok\n");
          this.populateInfoList();
        }
        if ((this.getType() == "group") &&
            (((inforssXMLRepository.isCycling() == true) &&
            (inforssXMLRepository.isCycleWithinGroup() == true)) || (this.isPlayList() == true)) &&
            (this.infoList != null) &&
            (this.infoList.length > 0))
        {
//dump("loop01 ok\n");
          if (this.isPlayList() == true)
          {
//dump("timer playlist=" + (eval(this.getCyclingDelay()) * 60000) + "   " + new Date() + "\n");
            this.cyclingTimer = inforssSetTimer(this.infoList[0], "getNextGroupOrFeed", eval(this.getCyclingDelay()) * 60000);
          }
          else
          {
//dump("timer groupCycle=" + (eval(inforssXMLRepository.getCyclingDelay()) * 60000) + "   " + new Date() + "\n");
            this.cyclingTimer = inforssSetTimer(this.infoList[0], "getNextGroupOrFeed", eval(inforssXMLRepository.getCyclingDelay()) * 60000);
          }
          this.manager.setCycleGroup(this);
        }
        else
        {
          if ((this.manager.cycleGroup != null) && (this.manager.cycleGroup.isPlayList() == true))
          {
//dump("timer playlist=" + (eval(this.manager.cycleGroup.getCyclingDelay()) * 60000) + "   " + new Date() + "\n");
            this.cyclingTimer = inforssSetTimer(this, "getNextGroupOrFeed", eval(this.manager.cycleGroup.getCyclingDelay()) * 60000);
          }
          else
          {
//dump("timer groupCycle=" + (eval(inforssXMLRepository.getCyclingDelay()) * 60000) + "   " + new Date() + "\n");
            this.cyclingTimer = inforssSetTimer(this, "getNextGroupOrFeed", eval(inforssXMLRepository.getCyclingDelay()) * 60000);
          }
          if ((inforssXMLRepository.isCycling() == false) ||
              (inforssXMLRepository.isCycleWithinGroup() == false))
          {
//dump("setCycleGroup(null)\n");
//            this.manager.setCycleGroup(null);
          }
        }
      }
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  };

//-------------------------------------------------------------------------------------------------------------
  this.unselect = function()
  {
    inforssTraceIn(this);
    try
    {
      this.feedXML.setAttribute("selected","false");
      if (this.menuItem != null)
      {
        this.menuItem.setAttribute("checked","false");
      }
      this.clearCyclingTimer();
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  };

//-------------------------------------------------------------------------------------------------------------
  this.clearCyclingTimer = function()
  {
    inforssTraceIn(this);
    if (this.cyclingTimer != null)
    {
// dump("clearCyclingTimer cyclingTimer=" + this.cyclingTimer + "\n");
      inforssClearTimer(this.cyclingTimer);
      window.clearTimeout(this.cyclingTimer);
      this.cyclingTimer = null;
    }
    inforssTraceOut(this);
  };

//-------------------------------------------------------------------------------------------------------------
  this.getNextGroupOrFeed = function(direction)
  {
    inforssTraceIn(this);
//dump("inforssInformation::getNextGroupOrFeed" + "   " + new Date() + "\n");
    this.clearCyclingTimer();
    if (direction == null)
    {
      direction = 1;
    }
    this.manager.getNextGroupOrFeed(this, direction);
    inforssTraceOut(this);
  };

//-------------------------------------------------------------------------------------------------------------
  this.isActive = function()
  {
    return this.active;
  };

//-------------------------------------------------------------------------------------------------------------
  this.isPlayList = function()
  {
    return (this.feedXML.getAttribute("playlist") == "true");
  };

//-------------------------------------------------------------------------------------------------------------
  this.getUrl = function()
  {
    return this.feedXML.getAttribute("url");
  };

//-------------------------------------------------------------------------------------------------------------
  this.getNbItem = function()
  {
    return this.feedXML.getAttribute("nbItem");
  };

//-------------------------------------------------------------------------------------------------------------
  this.getLengthItem = function()
  {
    return this.feedXML.getAttribute("lengthItem");
  };

//-------------------------------------------------------------------------------------------------------------
  this.getSavePodcastLocation = function()
  {
    return this.feedXML.getAttribute("savePodcastLocation");
  };

//-------------------------------------------------------------------------------------------------------------
  this.getEncoding = function()
  {
    return this.feedXML.getAttribute("encoding");
  };

//-------------------------------------------------------------------------------------------------------------
  this.removeRss = function(url)
  {

  };

//-------------------------------------------------------------------------------------------------------------
  this.getType = function()
  {
    return this.feedXML.getAttribute("type");
  };

//-------------------------------------------------------------------------------------------------------------
  this.getTitle = function()
  {
    return this.feedXML.getAttribute("title");
  };

//-------------------------------------------------------------------------------------------------------------
  this.getIcon = function()
  {
    return this.feedXML.getAttribute("icon");
  };

//-------------------------------------------------------------------------------------------------------------
  this.getLinkAddress = function()
  {
    return this.feedXML.getAttribute("link");
  };

//-------------------------------------------------------------------------------------------------------------
  this.getFilter = function()
  {
    return this.feedXML.getAttribute("filter");
  };

//-------------------------------------------------------------------------------------------------------------
  this.getFeedActivity = function()
  {
    return (this.feedXML.getAttribute("activity") == "true");
  };

//-------------------------------------------------------------------------------------------------------------
  this.getBrowserHistory = function()
  {
    return (this.feedXML.getAttribute("browserHistory") == "true");
  };

//-------------------------------------------------------------------------------------------------------------
  this.getFilters = function()
  {
    return this.feedXML.getElementsByTagName("FILTER");
  };

//-------------------------------------------------------------------------------------------------------------
  this.getFilterPolicy = function()
  {
    return this.feedXML.getAttribute("filterPolicy");
  };

//-------------------------------------------------------------------------------------------------------------
  this.reset = function()
  {

  };

//-------------------------------------------------------------------------------------------------------------
  this.remove = function()
  {
 // dump("remove 1 feedXML=" + this.feedXML + "\n");
    try
    {
      if (this.menuItem != null)
      {
        this.menuItem.parentNode.removeChild(this.menuItem);
      }
 // dump("remove 2 feedXML=" + this.feedXML.parentNode + "\n");
      this.feedXML.parentNode.removeChild(this.feedXML);
      this.passivate();
      this.menuItem = null;
      this.feedXML = null;
 // dump("remove 3 feedXML=" + this.feedXML + "\n");
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
  };

//-------------------------------------------------------------------------------------------------------------
  this.createNewRDFEntry = function(url, title, receivedDate)
  {
    try
    {
      this.manager.createNewRDFEntry(url, title, receivedDate, this.getUrl());
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
  };

//-------------------------------------------------------------------------------------------------------------
  this.exists = function(url, title, checkHistory)
  {
    return this.manager.exists(url, title, checkHistory, this.getUrl());
  };

//-------------------------------------------------------------------------------------------------------------
  this.getAttribute = function(url, title, attribute)
  {
    return this.manager.getAttribute(url, title, attribute);
  };

//-------------------------------------------------------------------------------------------------------------
  this.setAttribute = function(url, title, attribute, value)
  {
    return this.manager.setAttribute(url, title, attribute, value);
  };

//-------------------------------------------------------------------------------------------------------------
  this.setAcknowledgeDate = function(date)
  {
    this.acknowledgeDate = date;
    this.feedXML.setAttribute("acknowledgeDate", date);
  };

//-------------------------------------------------------------------------------------------------------------
  this.getAcknowledgeDate = function()
  {
    if (this.acknowledgeDate == null)
    {
      if (this.feedXML.hasAttribute("acknowledgeDate") == true)
      {
        this.acknowledgeDate = new Date(this.feedXML.getAttribute("acknowledgeDate"));
      }
    }
    return this.acknowledgeDate;
  };

//-------------------------------------------------------------------------------------------------------------
  this.getPopup = function()
  {
    return this.popup;
  };

//-------------------------------------------------------------------------------------------------------------
  this.setPopup = function(flag)
  {
    this.popup = flag;
  };

//-------------------------------------------------------------------------------------------------------------
  this.isBrowserOffLine = function()
  {
    var returnValue = false;

    if (gPrefs != null && gPrefs.prefHasUserValue("browser.offline"))
    {
      returnValue = gPrefs.getBoolPref("browser.offline");
    }
    return returnValue;
  };
}

//-------------------------------------------------------------------------------------------------------------
inforssInformation.createInfoFactory = function(feedXML, manager, menuItem)
{
  var info = null;
  switch(feedXML.getAttribute("type"))
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
  return info
};
