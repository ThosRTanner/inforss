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
var inforss = inforss || {};
Components.utils.import("chrome://inforss/content/modules/inforss_Debug.jsm",
                        inforss);

/* global inforssFeedManager */
/* global inforssHeadlineBar */
/* global inforssHeadlineDisplay */
/* global inforssXMLRepository */
/* global inforssClearPopupMenu */
/* global inforssAddNewFeed */
/* global ObserverService */
//const ObserverService = Components.classes[
//  "@mozilla.org/observer-service;1"].getService(
//  Components.interfaces.nsIObserverService);


//FIXME get rid of all the 2 phase initialisation

//It is not at all clear why this needs to use the observer service.
//There's only one client to each message.

/** This class appears to exist for several purposes
 *
 * a singleton which contains a bunch of single instances
 * It's heavily used from inforss.js and to perform button functions from the
 * xul overlay
 * It provides a sort of async way of dealing with certain events, which may
 * or may not be necessary
 */

function inforssMediator()
{
  this.feedManager = new inforssFeedManager(this);
  this.headlineBar = new inforssHeadlineBar(this);
  this.headlineDisplay = new inforssHeadlineDisplay(
    this,
    document.getElementById("inforss.newsbox1")
  );
  this._register();
  //fIXME why???
  this._reinit_after(1200);
  return this;
}

inforssMediator.prototype = {

  //----------------------------------------------------------------------------
  _init()
  {
    inforss.traceIn(this);
    try
    {
      this.feedManager.init();
      this.headlineDisplay.init();
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    inforss.traceOut(this);
  },

  //----------------------------------------------------------------------------
  //FIXME We need this because we need it but why on earth do we need it in the
  //first place?
  _reinit_after(timeout)
  {
      window.setTimeout(this._init.bind(this), timeout);
  },

  /** Registers with observer service */
  _register()
  {
    ObserverService.addObserver(this, "inforss.reload", false);
    ObserverService.addObserver(this, "inforss.set_banned", false);
    ObserverService.addObserver(this, "inforss.set_viewed", false);
    ObserverService.addObserver(this, "sync", false);
    ObserverService.addObserver(this, "syncBack", false);
    ObserverService.addObserver(this, "reload_headline_cache", false);
    ObserverService.addObserver(this, "purge_headline_cache", false);
    ObserverService.addObserver(this, "clear_headline_cache", false);
    ObserverService.addObserver(this, "inforss.reset", false);
    ObserverService.addObserver(this, "addNewFeed", false);
  },

  /** Deregisters from observer service on shutdown */
  deregister()
  {
    ObserverService.removeObserver(this, "inforss.reload");
    ObserverService.removeObserver(this, "inforss.set_banned");
    ObserverService.removeObserver(this, "inforss.set_viewed");
    ObserverService.removeObserver(this, "sync");
    ObserverService.removeObserver(this, "syncBack");
    ObserverService.removeObserver(this, "reload_headline_cache");
    ObserverService.removeObserver(this, "purge_headline_cache");
    ObserverService.removeObserver(this, "clear_headline_cache");
    ObserverService.removeObserver(this, "inforss.reset");
    ObserverService.removeObserver(this, "addNewFeed");
  },

  /** API for observer service
   *
   * @param {nsISupports} subject
   * @param {string} topic
   * @param {wstring} data
   */
  observe(subject, topic, data)
  {
    try
    {
      switch (topic)
      {
        case "inforss.reload":
          for (let url of data.split("|"))
          {
            this.deleteRss(url);
          }
          inforssClearPopupMenu();
          this._reinit_after(0);
          break;

        case "inforss.reset":
          this._deleteAllRss();
          inforssClearPopupMenu();
          this._reinit_after(0);
          break;

        case "inforss.set_viewed":
          {
            //FIXME This could be seriously bad if someone put __SEP__ in the
            //title.
            let index = data.indexOf("__SEP__");
            let title = data.substring(0, index);
            let link = data.substring(index + 7);
            this.headlineBar.setViewed(title, link);
          }
          break;

        case "inforss.set_banned":
          {
            //FIXME This could be seriously bad if someone put __SEP__ in the
            //title.
            let index = data.indexOf("__SEP__");
            let title = data.substring(0, index);
            let link = data.substring(index + 7);
            this.headlineBar.setBanned(title, link);
          }
          break;

        case "sync":
          this._sync(data);
          break;

        case "syncBack":
          this._syncBack(data);
          break;

        case "reload_headline_cache":
          this._reload_headline_cache();
          break;

        case "purge_headline_cache":
          this._purge_headline_cache();
          break;

        case "clear_headline_cache":
          this._clear_headline_cache();
          break;

        case "addNewFeed":
          inforssAddNewFeed({inforssUrl: data});
          break;

        default:
          inforss.debug("Unknown mediator event", subject, topic, data);
      }
    }
    catch (e)
    {
      inforss.debug(e);
    }
  },

  //----------------------------------------------------------------------------
  updateBar(feed)
  {
    this.headlineBar.updateBar(feed);
  },

  //----------------------------------------------------------------------------
  updateDisplay(feed)
  {
    this.headlineDisplay.updateDisplay(feed);
  },

  //----------------------------------------------------------------------------
  refreshBar()
  {
    this.headlineBar.refreshBar();
  },

  //----------------------------------------------------------------------------
  setSelected(url)
  {
    var changed = false;
    try
    {
      var selectedInfo = this.feedManager.getSelectedInfo(false);
      if (selectedInfo == null || url != selectedInfo.getUrl())
      {
        this.feedManager.setSelected(url);
        changed = true;
      }
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    return changed;
  },

  //----------------------------------------------------------------------------
  addFeed(feedXML, menuItem)
  {
    this.feedManager.addFeed(feedXML, menuItem);
  },

  //----------------------------------------------------------------------------
  getSelectedInfo(findDefault)
  {
    return this.feedManager.getSelectedInfo(findDefault);
  },

  //----------------------------------------------------------------------------
  resetDisplay()
  {
    this.headlineDisplay.resetDisplay();
  },

  //----------------------------------------------------------------------------
  resetHeadlines()
  {
    this.headlineBar.resetHeadlines();
  },

  //----------------------------------------------------------------------------
  deleteRss(url)
  {
    try
    {
      this.feedManager.deleteRss(url);
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
  },

  //----------------------------------------------------------------------------
  _deleteAllRss()
  {
    try
    {
      this.feedManager.deleteAllRss();
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
  },

  //----------------------------------------------------------------------------
  resizedWindow()
  {
    this.headlineDisplay.resizedWindow();
  },

  //----------------------------------------------------------------------------
  publishFeed(feed)
  {
    this.headlineBar.publishFeed(feed);
  },

  //----------------------------------------------------------------------------
  unpublishFeed(feed)
  {
    this.headlineBar.unpublishFeed(feed);
  },

  //----------------------------------------------------------------------------
  getLastDisplayedHeadline()
  {
    return this.headlineBar.getLastDisplayedHeadline();
  },

  //----------------------------------------------------------------------------
  removeDisplay(feed)
  {
    this.headlineDisplay.removeDisplay(feed);
  },

  //----------------------------------------------------------------------------
  updateMenuIcon(feed)
  {
    this.headlineDisplay.updateMenuIcon(feed);
  },

  //----------------------------------------------------------------------------
  clickRSS(event, link)
  {
    this.headlineDisplay.clickRSS(event, link);
  },

  //----------------------------------------------------------------------------
  _sync(url)
  {
    this.feedManager.sync(url);
  },

  //----------------------------------------------------------------------------
  _syncBack(data)
  {
    this.feedManager.syncBack(data);
  },

  //----------------------------------------------------------------------------
  locateFeed(url)
  {
    return this.feedManager.locateFeed(url);
  },

  //----------------------------------------------------------------------------
  setScroll(flag)
  {
    this.headlineDisplay.setScroll(flag);
  },

  //----------------------------------------------------------------------------
  checkStartScrolling()
  {
    this.headlineDisplay.checkStartScrolling();
  },

  //----------------------------------------------------------------------------
  setActiveTooltip()
  {
    this.headlineDisplay.setActiveTooltip();
  },

  //----------------------------------------------------------------------------
  resetActiveTooltip()
  {
    this.headlineDisplay.resetActiveTooltip();
  },

  //----------------------------------------------------------------------------
  isActiveTooltip()
  {
    return this.headlineDisplay.isActiveTooltip();
  },

  //----------------------------------------------------------------------------
  readAll()
  {
    if (inforss.confirm(inforss.get_string("readall")))
    {
      this.headlineBar.readAll();
    }
  },

  //----------------------------------------------------------------------------
  openTab(url)
  {
    inforss.traceIn(this);
    try
    {
      this.headlineDisplay.openTab(url);
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    inforss.traceOut(this);
  },


  //----------------------------------------------------------------------------
  viewAll()
  {
    if (inforss.confirm(inforss.get_string("viewall")))
    {
      this.headlineBar.viewAll();
    }
  },

  //----------------------------------------------------------------------------
  switchScroll()
  {
    this.headlineDisplay.switchScroll();
  },

  //----------------------------------------------------------------------------
  quickFilter()
  {
    this.headlineDisplay.quickFilter();
  },

  //----------------------------------------------------------------------------
  switchShuffle()
  {
    //FIXME This should be done as a function in headlineDisplay
    inforssXMLRepository.switchShuffle();
    this.headlineDisplay.updateCmdIcon();
  },

  //----------------------------------------------------------------------------
  switchPause()
  {
    this.headlineDisplay.switchPause();
  },

  //----------------------------------------------------------------------------
  switchDirection()
  {
    this.headlineDisplay.switchDirection();
  },

  //----------------------------------------------------------------------------
  _reload_headline_cache()
  {
    this.feedManager.reload_headline_cache();
  },

  //----------------------------------------------------------------------------
  goHome()
  {
    this.feedManager.goHome();
  },

  //----------------------------------------------------------------------------
  _purge_headline_cache()
  {
    this.feedManager.purge_headline_cache();
  },

  //----------------------------------------------------------------------------
  _clear_headline_cache()
  {
    this.feedManager.clear_headline_cache();
  },

  //----------------------------------------------------------------------------
  manualRefresh()
  {
    this.feedManager.manualRefresh();
  },

  //----------------------------------------------------------------------------
  manualSynchronize()
  {
    //FIXME What's this for then?
    //    this.feedManager.manualRefresh();
  },

  //----------------------------------------------------------------------------
  toggleHideOld()
  {
    inforssXMLRepository.hide_old_headlines =
      ! inforssXMLRepository.hide_old_headlines;
    inforssXMLRepository.save();
    this.headlineBar.refreshBar();
  },

  //----------------------------------------------------------------------------
  toggleHideViewed()
  {
    inforssXMLRepository.hide_viewed_headlines =
      ! inforssXMLRepository.hide_viewed_headlines;
    inforssXMLRepository.save();
    this.headlineBar.refreshBar();
  },

  //----------------------------------------------------------------------------
  handleMouseScroll(direction)
  {
    this.headlineDisplay.handleMouseScroll(direction);
  },

  //----------------------------------------------------------------------------
  //This is called from the 'next' and 'previous' buttons as
  //gInfoRssMediator.nextFeed(-1 (prev) or 1(next))
  nextFeed(direction)
  {
    this.feedManager.getNextGroupOrFeed(direction);
  },

};

//static methods

/** Reload (seriously?)
 *
 * Deletes the supplied feeds and reinitialises
 *
 * @param urls - array of feed urls
 */
inforssMediator.reload = function(deleted_feeds = [])
{
  ObserverService.notifyObservers(null,
                                  "inforss.reload",
                                  deleted_feeds.join("|"));
};

/** Configuration was reset */
inforssMediator.configuration_reset = function()
{
  ObserverService.notifyObservers(null, "inforss.reset", null);
};

/** Set a headline as viewed
 *
 * @param {string} title - title of headline
 * @param {string} link - url of headline
 */
inforssMediator.set_viewed = function(title, link)
{
  ObserverService.notifyObservers(null,
                                  "inforss.set_viewed",
                                  title + "__SEP__" + link);
};

/** Set a headline as banned
 *
 * @param {string} title - title of headline
 * @param {string} link - url of headline
 */
inforssMediator.set_banned = function(title, link)
{
  ObserverService.notifyObservers(null,
                                  "inforss.set_banned",
                                  title + "__SEP__" + link);
};

