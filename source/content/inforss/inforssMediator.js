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
// inforssMediator
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------
/* globals inforssDebug, inforssTraceIn, inforssTraceOut */
Components.utils.import("chrome://inforss/content/modules/inforssDebug.jsm");

/* global gInforssRssBundle */
/* global inforssFeedManager */
/* global inforssHeadlineBar */
/* global inforssHeadlineDisplay */
/* global inforssXMLRepository, inforssSave */

//FIXME get rid of all the 2 phase initialisation

function inforssMediator()
{
  this.feedManager = new inforssFeedManager(this);
  this.headlineBar = new inforssHeadlineBar(this);
  this.headlineDisplay = new inforssHeadlineDisplay(this, document.getElementById("inforss.newsbox1"));
  return this;
}

inforssMediator.prototype = {
  feedManager: null,
  headlineBar: null,
  headlineDisplay: null,

  //----------------------------------------------------------------------------
  init: function()
  {
    inforssTraceIn(this);
    try
    {
      this.feedManager.init();
      this.headlineDisplay.init();
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  },

  //----------------------------------------------------------------------------
  //FIXME We need this because we need it but why on earth do we need it in the
  //first place?
  reinit_after: function(timeout)
  {
      window.setTimeout(this.init.bind(this), timeout);
  },

  //----------------------------------------------------------------------------
  updateBar: function(feed)
  {
    this.headlineBar.updateBar(feed);
  },

  //----------------------------------------------------------------------------
  updateDisplay: function(feed, headlines)
  {
    this.headlineDisplay.updateDisplay(feed, headlines);
  },

  //----------------------------------------------------------------------------
  changeSelected: function()
  {
    this.headlineBar.reset();
    this.feedManager.changeSelected();
  },

  //----------------------------------------------------------------------------
  refreshBar: function()
  {
    this.headlineBar.refreshBar();
  },

  //----------------------------------------------------------------------------
  setSelected: function(url)
  {
    var changed = false;
    try
    {
      var selectedInfo = this.feedManager.getSelectedInfo(false);
      if ((selectedInfo == null) || (url != selectedInfo.getUrl()))
      {
        var info = this.feedManager.locateFeed(url).info;
        if (info.getType() != "group")
        {
          this.feedManager.cycleGroup = null;
        }
        this.feedManager.setSelected(url);
        changed = true;
      }
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    return changed;
  },

  //----------------------------------------------------------------------------
  addFeed: function(feedXML, menuItem)
  {
    this.feedManager.addFeed(feedXML, menuItem);
  },

  //----------------------------------------------------------------------------
  getSelectedInfo: function(findDefault)
  {
    return this.feedManager.getSelectedInfo(findDefault);
  },

  //----------------------------------------------------------------------------
  resetDisplay: function()
  {
    this.headlineDisplay.resetDisplay();
  },

  //----------------------------------------------------------------------------
  resetHeadlines: function()
  {
    this.headlineBar.resetHeadlines();
  },

  //----------------------------------------------------------------------------
  deleteRss: function(url)
  {
    try
    {
      this.feedManager.deleteRss(url);
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
  },

  //----------------------------------------------------------------------------
  deleteAllRss: function()
  {
    try
    {
      this.feedManager.deleteAllRss();
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
  },

  //----------------------------------------------------------------------------
  resizedWindow: function()
  {
    this.headlineDisplay.resizedWindow();
  },

  //----------------------------------------------------------------------------
  publishFeed: function(feed)
  {
    this.headlineBar.publishFeed(feed);
  },

  //----------------------------------------------------------------------------
  unpublishFeed: function(feed)
  {
    this.headlineBar.unpublishFeed(feed);
  },

  //----------------------------------------------------------------------------
  getLastDisplayedHeadline: function()
  {
    return this.headlineBar.getLastDisplayedHeadline();
  },

  //----------------------------------------------------------------------------
  removeDisplay: function(feed)
  {
    this.headlineDisplay.removeDisplay(feed);
  },

  //----------------------------------------------------------------------------
  updateMenuIcon: function(feed)
  {
    this.headlineDisplay.updateMenuIcon(feed);
  },

  //----------------------------------------------------------------------------
  clickRSS: function(event, link)
  {
    this.headlineDisplay.clickRSS(event, link);
  },

  //----------------------------------------------------------------------------
  setViewed: function(title, link)
  {
    this.headlineBar.setViewed(title, link);
  },

  //----------------------------------------------------------------------------
  setBanned: function(title, link)
  {
    this.headlineBar.setBanned(title, link);
  },

  //----------------------------------------------------------------------------
  sync: function(url)
  {
    this.feedManager.sync(url);
  },

  //----------------------------------------------------------------------------
  syncBack: function(data)
  {
    this.feedManager.syncBack(data);
  },

  //----------------------------------------------------------------------------
  ack: function(url)
  {
    this.feedManager.ack(url);
  },

  //----------------------------------------------------------------------------
  setPopup: function(url, flag)
  {
    this.feedManager.setPopup(url, flag);
  },

  //----------------------------------------------------------------------------
  locateFeed: function(url)
  {
    return this.feedManager.locateFeed(url);
  },

  //----------------------------------------------------------------------------
  getCycleGroup: function()
  {
    return this.feedManager.getCycleGroup();
  },

  //----------------------------------------------------------------------------
  setScroll: function(flag)
  {
    this.headlineDisplay.setScroll(flag);
  },

  //----------------------------------------------------------------------------
  checkScroll: function()
  {
    this.headlineDisplay.checkScroll();
  },

  //----------------------------------------------------------------------------
  checkStartScrolling: function()
  {
    this.headlineDisplay.checkStartScrolling();
  },

  //----------------------------------------------------------------------------
  setActiveTooltip: function()
  {
    this.headlineDisplay.setActiveTooltip();
  },

  //----------------------------------------------------------------------------
  resetActiveTooltip: function()
  {
    this.headlineDisplay.resetActiveTooltip();
  },

  //----------------------------------------------------------------------------
  isActiveTooltip: function()
  {
    return this.headlineDisplay.isActiveTooltip();
  },

  //----------------------------------------------------------------------------
  readAll: function()
  {
    if (confirm(gInforssRssBundle.getString("inforss.readall")))
    {
      this.headlineBar.readAll();
    }
  },

  //----------------------------------------------------------------------------
  clearEmptyFeedMarker: function()
  {
    if (inforssXMLRepository.headline_bar_cycle_feeds())
    {
      this.feedManager.clearEmptyFeedMarker();
    }
  },

  //----------------------------------------------------------------------------
  openTab: function(url)
  {
    inforssTraceIn(this);
    try
    {
      this.headlineDisplay.openTab(url);
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  },


  //----------------------------------------------------------------------------
  viewAll: function()
  {
    if (confirm(gInforssRssBundle.getString("inforss.viewall")))
    {
      this.headlineBar.viewAll();
    }
  },

  //----------------------------------------------------------------------------
  switchScroll: function()
  {
    this.headlineDisplay.switchScroll();
  },

  //----------------------------------------------------------------------------
  quickFilter: function()
  {
    this.headlineDisplay.quickFilter();
  },

  //----------------------------------------------------------------------------
  switchShuffle: function()
  {
    inforssXMLRepository.switchShuffle();
    this.headlineDisplay.updateCmdIcon();
  },

  //----------------------------------------------------------------------------
  switchPause: function()
  {
    this.headlineDisplay.switchPause();
  },

  //----------------------------------------------------------------------------
  switchDirection: function()
  {
    this.headlineDisplay.switchDirection();
  },

  //----------------------------------------------------------------------------
  newRDF: function()
  {
    this.feedManager.newRDF();
  },

  //----------------------------------------------------------------------------
  goHome: function()
  {
    this.feedManager.goHome();
  },

  //----------------------------------------------------------------------------
  purgeRdf: function()
  {
    this.feedManager.purgeRdf();
  },

  //----------------------------------------------------------------------------
  clearRdf: function()
  {
    this.feedManager.clearRdf();
  },

  //----------------------------------------------------------------------------
  manualRefresh: function()
  {
    this.feedManager.manualRefresh();
  },

  //----------------------------------------------------------------------------
  manualSynchronize: function()
  {
    //FIXME What's this for then?
    //    this.feedManager.manualRefresh();
  },

  //----------------------------------------------------------------------------
  hideOld: function()
  {
    inforssXMLRepository.setHideOld((inforssXMLRepository.hide_old_headlines()) ? "false" : "true");
    inforssSave();
    this.headlineBar.refreshBar();
  },

  //----------------------------------------------------------------------------
  hideViewed: function()
  {
    inforssXMLRepository.setHideViewed((inforssXMLRepository.hide_viewed_headlines()) ? "false" : "true");
    inforssSave();
    this.headlineBar.refreshBar();
  },

  //----------------------------------------------------------------------------
  handleMouseScroll: function(direction)
  {
    this.headlineDisplay.handleMouseScroll(direction);
  },

  //----------------------------------------------------------------------------
  nextFeed: function(direction)
  {
    try
    {
      var info = this.feedManager.getSelectedInfo(false);
      if ((info.getType() == "group") &&
        (((inforssXMLRepository.headline_bar_cycle_feeds()) &&
          (inforssXMLRepository.headline_bar_cycle_in_group())) || (info.isPlayList())) &&
        (info.feed_list != null) &&
        (info.feed_list.length > 0))
      {
        info = info.feed_list[0];
      }
      info.getNextGroupOrFeed(direction);
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
  },

};
