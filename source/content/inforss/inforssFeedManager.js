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
// inforssFeedManager
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------
var inforss = inforss || {};
Components.utils.import("chrome://inforss/content/modules/Debug.jsm", inforss);

var gPrefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch(null);

/* globals inforssRDFRepository, inforssXMLRepository */
/* globals inforssRead, inforssAddItemToMenu, inforssRelocateBar, inforssInformation */
//FIXME get rid of all the 2 phase initialisation
//FIXME get rid of all the global function calls

function inforssFeedManager(mediator)
{
  this.mediator = mediator;
  this.rdfRepository = new inforssRDFRepository();
  this.schedule_timeout = null;
  this.cycle_timeout = null;
  this.feed_list = [];
  this.selectedInfo = null;
  return this;
}

inforssFeedManager.prototype = {

  //-------------------------------------------------------------------------------------------------------------
  init: function()
  {
    inforss.traceIn(this);
    try
    {
      /* This feels uncomfy here */
      inforssRead();
      for (let item of inforssXMLRepository.get_all())
      {
        inforssAddItemToMenu(item);
      }
      inforssRelocateBar(); //And should this be somewhere else?
      /* down to here */
      //Among other things, I think the global mediator should pass the inforssXmlRepository
      //to all of these.
      this.rdfRepository.init();
      var oldSelected = this.selectedInfo;
      this.selectedInfo = null;
      for (let feed of this.feed_list)
      {
        feed.reset();
      }

      window.clearTimeout(this.schedule_timeout);
      window.clearTimeout(this.cycle_timeout);

      //Possibly the wrong one. Why in any case do we force this arbitrarily to
      //the first feed. If we don't have a selected one, maybe just not have one?
      var selectedInfo = this.getSelectedInfo(true);
      if (selectedInfo != null)
      {
        if (oldSelected != null && oldSelected.getUrl() != selectedInfo.getUrl())
        {
          oldSelected.deactivate();
        }
        //FIXME This is pretty much identical to setSelected
        //why both?
        //See line 316
        //inforssHeadlineDisplay.apply_recent_headline_style(selectedInfo.menuItem, false);
        //        selectedInfo.reset();
        //
        if (inforssXMLRepository.headline_bar_enabled)
        {
          selectedInfo.activate();
          this.schedule_fetch(0);
          if (inforssXMLRepository.headline_bar_cycle_feeds)
          {
            this.schedule_cycle();
          }
          if (selectedInfo.getType() == "group")
          {
            this.mediator.updateMenuIcon(selectedInfo);
          }
        }
        else
        {
          selectedInfo.deactivate();
        }
      }
      this.mediator.refreshBar();
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    inforss.traceOut(this);
  },

  //Start the next fetch as soon as we've finished here.
  //Clear any existing fetch.
  schedule_fetch : function(timeout)
  {
    window.clearTimeout(this.schedule_timeout);
    this.schedule_timeout = window.setTimeout(this.fetch_feed.bind(this), timeout);
  },

  //Cycling timer. When this times out we select the next group/feed
  schedule_cycle : function()
  {
    window.clearTimeout(this.cycle_timeout);
    this.cycle_timeout = window.setTimeout(
      this.cycle_feed.bind(this),
      inforssXMLRepository.headline_bar_cycle_interval * 60 * 1000);
  },

  //----------------------------------------------------------------------------
  fetch_feed : function()
  {
    const item = this.selectedInfo;
    if (!this.isBrowserOffLine())
    {
      item.fetchFeed();
    }

    const expected = item.get_next_refresh();
    if (expected == null)
    {
/**/console.log("Empty group", item)
      return;
    }
    const now = new Date();
    let next = expected - now;
    if (next < 0)
    {
/**/console.log("fetchfeed overdue", expected, now, next, item)
      next = 0;
    }
    this.schedule_fetch(next);
  },

  //cycle to the next feed or group
  cycle_feed : function()
  {
    //FIXME Does this do anything useful? This used to be in getNextGroupOrFeed but
    //I don't see you could have a tooltip active whilst pressing a button.
    if (this.mediator.isActiveTooltip())
    {
      this.cycle_timeout = window.setTimeout(this.cycle_feed.bind(this), 1000);
      return;
    }
    this.getNextGroupOrFeed(1);
    this.schedule_cycle();
  },

  //----------------------------------------------------------------------------
  //returns true if the browser is in offline mode, in which case we go through
  //the motions but don't actually fetch any data
  isBrowserOffLine()
  {
    return gPrefs.prefHasUserValue("browser.offline") &&
           gPrefs.getBoolPref("browser.offline");
  },

//-------------------------------------------------------------------------------------------------------------
  //WTF does all this stuff do?
  //it seems to be getting the currently stored headlines and then populating
  //the thing with said currently stored headlines.
  sync: function(url)
  {
    inforss.traceIn(this);
    try
    {
      var info = this.locateFeed(url).info;
      if (info != null && info.insync == false && info.headlines.length > 0 &&
          info.reload == false)
      {
        var data = info.getXmlHeadlines();
        var observerService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
        observerService.notifyObservers(null, "syncBack", data);
      }
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    inforss.traceOut(this);
  },

  //-------------------------------------------------------------------------------------------------------------
  syncBack: function(data)
  {
    inforss.traceIn(this);
    try
    {
      var objDOMParser = new DOMParser();
      var objDoc = objDOMParser.parseFromString(data, "text/xml");

      var url = objDoc.firstChild.getAttribute("url");
      var info = this.locateFeed(url).info;

      if ((info != null) && (info.insync))
      {
        info.synchronize(objDoc);
      }
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    inforss.traceOut(this);
  },

  //-------------------------------------------------------------------------------------------------------------
  //FIXME Do we really need findDefault? How many places need to either have
  //or not have a default? Also this blanky sets it...
  getSelectedInfo: function(findDefault)
  {
    inforss.traceIn(this);
    try
    {
      if (this.selectedInfo == null)
      {
        var info = null;
        var find = false;
        var i = 0;
        while ((i < this.feed_list.length) && (find == false))
        {
          if (this.feed_list[i].isSelected())
          {
            find = true;
            info = this.feed_list[i];
            info.select();
            //dump("getSelectedInfo=" + info.getUrl() + "\n");
          }
          else
          {
            i++;
          }
        }
        if ((find == false) && (this.feed_list.length > 0) && (findDefault))
        {
          info = this.feed_list[0];
          info.select();
        }
        this.selectedInfo = info;
      }
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    inforss.traceOut(this);
    return this.selectedInfo;
  },

  //-------------------------------------------------------------------------------------------------------------
  signalReadEnd: function(feed)
  {
    this.rdfRepository.flush();
    this.mediator.updateBar(feed);
  },

  //-------------------------------------------------------------------------------------------------------------
  passivateOldSelected: function()
  {
    try
    {
      window.clearTimeout(this.schedule_timeout);
      var selectedInfo = this.getSelectedInfo(false);
      if (selectedInfo != null)
      {
        selectedInfo.unselect();
        //see 311
        //inforssHeadlineDisplay.apply_default_headline_style(selectedInfo.menuItem, false);
        selectedInfo.deactivate();
      }
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
  },

  //-------------------------------------------------------------------------------------------------------------
  addFeed: function(feedXML, menuItem)
  {
    inforss.traceIn(this);
    try
    {
      var oldFeed = this.locateFeed(feedXML.getAttribute("url")).info;
      if (oldFeed == null)
      {
        var info = inforssInformation.createInfoFactory(feedXML, this, menuItem);
        this.feed_list.push(info);
      }
      else
      {
        oldFeed.feedXML = feedXML;
        oldFeed.menuItem = menuItem;
      }
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    inforss.traceOut(this);
  },

  //-------------------------------------------------------------------------------------------------------------
  locateFeed: function(url)
  {
    inforss.traceIn(this);
    try
    {
      var find = false;
      var info = null;
      var i = 0;
      while ((i < this.feed_list.length) && (find == false))
      {
        if (this.feed_list[i].getUrl() == url)
        {
          find = true;
          info = this.feed_list[i];
        }
        else
        {
          i++;
        }
      }
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    inforss.traceOut(this);
    return {
      info: info,
      index: i
    };
  },

  //-------------------------------------------------------------------------------------------------------------
  setSelected: function(url)
  {
    inforss.traceIn(this);
    try
    {
      if (inforssXMLRepository.headline_bar_enabled)
      {
        this.passivateOldSelected();
        var info = this.locateFeed(url).info;
        this.selectedInfo = info;
        //apparently this is trying to set the colour of the currently selected
        //feed to the default headline colour. Unfortunately (a) it doesn't
        //change back the original and (b) it's a bit useless if your headlines
        //are default text and default background.
        //inforssHeadlineDisplay.apply_recent_headline_style(info.menuItem, false);
        //FIXME This code is same as init.
        info.select();
        info.activate();
        this.schedule_fetch(0);
        if (inforssXMLRepository.headline_bar_cycle_feeds)
        {
          this.schedule_cycle();
        }
        if (info.getType() == "group")
        {
          this.mediator.updateMenuIcon(info);
        }
      }
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    inforss.traceOut(this);
  },

  //-------------------------------------------------------------------------------------------------------------
  ack: function(url)
  {
    inforss.traceIn(this);
    try
    {
      var info = this.locateFeed(url).info;
      info.setAcknowledgeDate(new Date());
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    inforss.traceOut(this);
  },

  //-------------------------------------------------------------------------------------------------------------
  setPopup: function(url, flag)
  {
    inforss.traceIn(this);
    try
    {
      var info = this.locateFeed(url).info;
      info.setPopup(flag);
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    inforss.traceOut(this);
  },

  //-------------------------------------------------------------------------------------------------------------
  openTab: function(url)
  {
    inforss.traceIn(this);
    try
    {
      this.mediator.openTab(url);
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    inforss.traceOut(this);
  },

  //-------------------------------------------------------------------------------------------------------------
  deleteAllRss: function()
  {
    inforss.traceIn(this);
    try
    {
      var urls = [];
      for (var i = 0; i < this.feed_list.length; i++)
      {
        urls.push(this.feed_list[i].getUrl());
      }
      for (var i = 0; i < urls.length; i++)
      {
        this.deleteRss(urls[i]);
      }
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    inforss.traceOut(this);
  },

  //-------------------------------------------------------------------------------------------------------------
  deleteRss: function(url)
  {
    inforss.traceIn(this);
    try
    {
      var deletedInfo = this.locateFeed(url);
      this.feed_list.splice(deletedInfo.index, 1);
      for (var i = 0; i < this.feed_list.length; i++)
      {
        this.feed_list[i].removeRss(url);
      }
      var selectedInfo = this.getSelectedInfo(true);
      var deleteSelected = (selectedInfo.getUrl() == url);
      deletedInfo.info.remove();
      if (selectedInfo != null)
      {
        if (deleteSelected)
        {
          this.selectedInfo = null;
          if (this.feed_list.length > 0)
          {
            //FIXME Why not just call myself?
            this.mediator.setSelected(this.feed_list[0].getUrl());
          }
          else
          {
            this.mediator.resetHeadlines();
          }
        }
      }
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    inforss.traceOut(this);
  },

  //-------------------------------------------------------------------------------------------------------------
  publishFeed: function(feed)
  {
    this.mediator.publishFeed(feed);
  },

  //-------------------------------------------------------------------------------------------------------------
  unpublishFeed: function(feed)
  {
    this.mediator.unpublishFeed(feed);
  },

  //-------------------------------------------------------------------------------------------------------------
  updateMenuIcon: function(feed)
  {
    this.mediator.updateMenuIcon(feed);
  },

  //-------------------------------------------------------------------------------------------------------------
  goHome: function()
  {
    var selectedInfo = this.getSelectedInfo(false);
    if ((selectedInfo != null) && (selectedInfo.getType() != "group"))
    {
      this.mediator.openTab(selectedInfo.getLinkAddress());
    }
  },

  //-------------------------------------------------------------------------------------------------------------
  getNextGroupOrFeed: function(direction)
  {
    const info = this.selectedInfo;
    try
    {

      if (this.selectedInfo.isPlayList() &&
          !inforssXMLRepository.headline_bar_cycle_feeds)
      {
        //If this is a playlist, just select the next element in the playlist
        info.playlist_cycle(direction);
        return;
      }
      else if (inforssXMLRepository.headline_bar_cycle_feeds &&
               inforssXMLRepository.headline_bar_cycle_in_group &&
               info.getType() == "group")
      {
        //If we're cycling in a group, let the group deal with things.
        info.feed_cycle(direction);
        return;
      }

      const i = inforssFeedManager.find_next_feed(
        info.getType(),
        this.feed_list,
        this.locateFeed(info.getUrl()).index,
        direction);

      //FIXME Optimisation needed it we cycle right back to the same one?
      this.setSelected(this.feed_list[i].getUrl());
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
  },

  //-------------------------------------------------------------------------------------------------------------
  createNewRDFEntry: function(url, title, receivedDate, feedUrl)
  {
    try
    {
      this.rdfRepository.createNewRDFEntry(url, title, receivedDate, feedUrl);
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
  },

  //-------------------------------------------------------------------------------------------------------------
  exists: function(url, title, checkHistory, feedUrl)
  {
    return this.rdfRepository.exists(url, title, checkHistory, feedUrl);
  },

  //-------------------------------------------------------------------------------------------------------------
  getAttribute: function(url, title, attribute)
  {
    return this.rdfRepository.getAttribute(url, title, attribute);
  },

  //-------------------------------------------------------------------------------------------------------------
  setAttribute: function(url, title, attribute, value)
  {
    return this.rdfRepository.setAttribute(url, title, attribute, value);
  },

  //-------------------------------------------------------------------------------------------------------------
  newRDF: function()
  {
    this.rdfRepository.init();
  },

  //-------------------------------------------------------------------------------------------------------------
  purgeRdf: function()
  {
    this.rdfRepository.purged = false;
    this.rdfRepository.purge();
  },

  //-------------------------------------------------------------------------------------------------------------
  clearRdf: function()
  {
    this.rdfRepository.clearRdf();
  },

  //-------------------------------------------------------------------------------------------------------------
  manualRefresh: function()
  {
    inforss.traceIn(this);
    try
    {
      var selectedInfo = this.getSelectedInfo(false);
      if (selectedInfo != null)
      {
        selectedInfo.manualRefresh();
      }
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    inforss.traceOut(this);
  },

};

//Find the next feed to display when doing next/previous button or cycling.
//Takes into account feeds being disabled (annoyingly known as getFeedActivity)
//If there are no feeds enabled, this will return the selected input
//type - if null, doest check type. if not null, then it is used to ensure that
//       either both or neither the new and currently selected items are a group.
//feeds - array of feeds to step through
//pos - position in array of currently selected feed (or -1 if no selection)
//direction - step direction (+1 or -1)
inforssFeedManager.find_next_feed = function(type, feeds, pos, direction)
{
    const length = feeds.length;
    let i = 0;
    let counter = 0;
    let posn = pos;
    //This (min(10, length)) is a very questionable interpretation of random
    const count =
      pos == -1 || inforssXMLRepository.headline_bar_cycle_type == "next" ?
        1 :
        Math.floor(Math.random() * Math.min(10, length)) + 1;
    while (i < count && counter < length)
    {
      ++counter;
      posn = (length + posn + direction) % length;
      if (type != null &&
          (feeds[posn].getType() == "group") != (type == "group"))
      {
        continue;
      }
      if (!feeds[posn].getFeedActivity())
      {
        continue;
      }
      pos = posn;
      ++i;
    }
  return pos;
};
