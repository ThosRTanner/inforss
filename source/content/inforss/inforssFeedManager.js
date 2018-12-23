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
Components.utils.import("chrome://inforss/content/modules/inforss_Debug.jsm",
                        inforss);

Components.utils.import(
  "chrome://inforss/content/modules/inforss_Headline_Cache.jsm",
  inforss);

inforss.feed_handlers = inforss.feed_handlers || {};

Components.utils.import(
  "chrome://inforss/content/feed_handlers/inforss_factory.jsm",
  inforss.feed_handlers);

inforss.mediator = inforss.mediator || {};
Components.utils.import(
  "chrome://inforss/content/modules/inforss_Mediator_API.jsm",
  inforss.mediator);


var gPrefs = Components.classes[
  "@mozilla.org/preferences-service;1"].getService(
  Components.interfaces.nsIPrefService).getBranch(null);

/* globals inforssRead, inforssAddItemToMenu, inforssRelocateBar */
//FIXME get rid of all the 2 phase initialisation
//FIXME get rid of all the global function calls

function inforssFeedManager(mediator, config)
{
  this._mediator = mediator;
  this._config = config;
  this._headline_cache = new inforss.Headline_Cache(config);
  this._schedule_timeout = null;
  this._cycle_timeout = null;
  this._feed_list = [];
  this._selected_info = null;
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
      for (let item of this._config.get_all())
      {
        inforssAddItemToMenu(item);
      }
      inforssRelocateBar(); //And should this be somewhere else?
      /* down to here */
      this._headline_cache.init();
      var oldSelected = this._selected_info;
      this._selected_info = null;
      for (let feed of this._feed_list)
      {
        feed.reset();
      }

      window.clearTimeout(this._schedule_timeout);
      window.clearTimeout(this._cycle_timeout);

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
        if (this._config.headline_bar_enabled)
        {
          selectedInfo.activate();
          this.schedule_fetch(0);
          if (this._config.headline_bar_cycle_feeds)
          {
            this.schedule_cycle();
          }
          if (selectedInfo.getType() == "group")
          {
            this._mediator.updateMenuIcon(selectedInfo);
          }
        }
        else
        {
          selectedInfo.deactivate();
        }
      }
      this._mediator.refreshBar();
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
    window.clearTimeout(this._schedule_timeout);
    this._schedule_timeout = window.setTimeout(this.fetch_feed.bind(this), timeout);
  },

  //Cycling timer. When this times out we select the next group/feed
  schedule_cycle : function()
  {
    window.clearTimeout(this._cycle_timeout);
    this._cycle_timeout = window.setTimeout(
      this.cycle_feed.bind(this),
      this._config.headline_bar_cycle_interval * 60 * 1000);
  },

  //----------------------------------------------------------------------------
  fetch_feed : function()
  {
    const item = this._selected_info;
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
    if (this._mediator.isActiveTooltip())
    {
      this._cycle_timeout = window.setTimeout(this.cycle_feed.bind(this), 1000);
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
  //FIXME WTF does all this stuff do?
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
        inforss.mediator.send_headline_data(info.getXmlHeadlines());
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
      if (this._selected_info == null)
      {
        var info = null;
        var find = false;
        var i = 0;
        while ((i < this._feed_list.length) && (find == false))
        {
          if (this._feed_list[i].isSelected())
          {
            find = true;
            info = this._feed_list[i];
            info.select();
            //dump("getSelectedInfo=" + info.getUrl() + "\n");
          }
          else
          {
            i++;
          }
        }
        if ((find == false) && (this._feed_list.length > 0) && (findDefault))
        {
          info = this._feed_list[0];
          info.select();
        }
        this._selected_info = info;
      }
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    inforss.traceOut(this);
    return this._selected_info;
  },

  //-------------------------------------------------------------------------------------------------------------
  signalReadEnd: function(feed)
  {
    this._headline_cache.flush();
    this._mediator.updateBar(feed);
  },

  //-------------------------------------------------------------------------------------------------------------
  passivateOldSelected: function()
  {
    try
    {
      window.clearTimeout(this._schedule_timeout);
      var selectedInfo = this.getSelectedInfo(false);
      if (selectedInfo != null)
      {
        selectedInfo.unselect();
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
        const info = inforss.feed_handlers.factory.create(feedXML,
                                                          this,
                                                          menuItem,
                                                          this._config);
        this._feed_list.push(info);
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
      while ((i < this._feed_list.length) && (find == false))
      {
        if (this._feed_list[i].getUrl() == url)
        {
          find = true;
          info = this._feed_list[i];
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
      if (this._config.headline_bar_enabled)
      {
        this.passivateOldSelected();
        var info = this.locateFeed(url).info;
        this._selected_info = info;
        //FIXME This code is same as init.
        info.select();
        info.activate();
        this.schedule_fetch(0);
        if (this._config.headline_bar_cycle_feeds)
        {
          this.schedule_cycle();
        }
        if (info.getType() == "group")
        {
          this._mediator.updateMenuIcon(info);
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
  open_link: function(url)
  {
    inforss.traceIn(this);
    try
    {
      this._mediator.open_link(url);
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
      for (var i = 0; i < this._feed_list.length; i++)
      {
        urls.push(this._feed_list[i].getUrl());
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
      this._feed_list.splice(deletedInfo.index, 1);
      for (var i = 0; i < this._feed_list.length; i++)
      {
        this._feed_list[i].removeRss(url);
      }
      var selectedInfo = this.getSelectedInfo(true);
      var deleteSelected = (selectedInfo.getUrl() == url);
      deletedInfo.info.remove();
      if (selectedInfo != null)
      {
        if (deleteSelected)
        {
          this._selected_info = null;
          if (this._feed_list.length > 0)
          {
            //FIXME Why not just call myself?
            this._mediator.setSelected(this._feed_list[0].getUrl());
          }
          else
          {
            this._mediator.resetDisplay();
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
    this._mediator.publishFeed(feed);
  },

  //-------------------------------------------------------------------------------------------------------------
  unpublishFeed: function(feed)
  {
    this._mediator.unpublishFeed(feed);
  },

  //-------------------------------------------------------------------------------------------------------------
  updateMenuIcon: function(feed)
  {
    this._mediator.updateMenuIcon(feed);
  },

  //-------------------------------------------------------------------------------------------------------------
  goHome: function()
  {
    var selectedInfo = this.getSelectedInfo(false);
    if ((selectedInfo != null) && (selectedInfo.getType() != "group"))
    {
      this._mediator.open_link(selectedInfo.getLinkAddress());
    }
  },

  //-------------------------------------------------------------------------------------------------------------
  getNextGroupOrFeed: function(direction)
  {
    const info = this._selected_info;
    try
    {

      if (this._selected_info.isPlayList() &&
          !this._config.headline_bar_cycle_feeds)
      {
        //If this is a playlist, just select the next element in the playlist
        info.playlist_cycle(direction);
        return;
      }
      else if (this._config.headline_bar_cycle_feeds &&
               this._config.headline_bar_cycle_in_group &&
               info.getType() == "group")
      {
        //If we're cycling in a group, let the group deal with things.
        info.feed_cycle(direction);
        return;
      }

      const i = info.find_next_feed(
          this._feed_list,
          this.locateFeed(info.getUrl()).index,
          direction);

      //FIXME Optimisation needed it we cycle right back to the same one?
      this.setSelected(this._feed_list[i].getUrl());
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
      this._headline_cache.createNewRDFEntry(url, title, receivedDate, feedUrl);
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
  },

  //-------------------------------------------------------------------------------------------------------------
  exists: function(url, title, checkHistory, feedUrl)
  {
    return this._headline_cache.exists(url, title, checkHistory, feedUrl);
  },

  //-------------------------------------------------------------------------------------------------------------
  getAttribute: function(url, title, attribute)
  {
    return this._headline_cache.getAttribute(url, title, attribute);
  },

  //-------------------------------------------------------------------------------------------------------------
  setAttribute: function(url, title, attribute, value)
  {
    return this._headline_cache.setAttribute(url, title, attribute, value);
  },

  //-------------------------------------------------------------------------------------------------------------
  reload_headline_cache: function()
  {
    this._headline_cache.init();
  },

  //-------------------------------------------------------------------------------------------------------------
  purge_headline_cache: function()
  {
    this._headline_cache.purge();
  },

  //-------------------------------------------------------------------------------------------------------------
  clear_headline_cache: function()
  {
    this._headline_cache.clear();
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
