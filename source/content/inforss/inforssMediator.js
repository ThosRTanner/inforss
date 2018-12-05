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

//A LOT hacky. Hopefully this will be a module soon
/* eslint strict: "off" */

/* global inforssFeedManager */
/* global inforssHeadlineBar */
/* global inforssHeadlineDisplay */
/* global inforssXMLRepository */
/* global inforssClearPopupMenu */
/* global inforssAddNewFeed */

const ObserverService = Components.classes[
  "@mozilla.org/observer-service;1"].getService(
  Components.interfaces.nsIObserverService);

//FIXME get rid of all the 2 phase initialisation

//FIXME Not terribly happy about using the observer service for the addFeed
//window.
//It is not at all clear why this needs to use the observer service.
//There's only one client to each message.

/** This class contains the single feed manager, headline bar and headline
 * display objects, and allows them to communicate with one another.
 *
 * it also exists as a singleton used in inforss and the option window, which
 * last gets hold of it by poking around in the parent window properties.
 *
 * The observer method allows for the addfeed popup to communicate.
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
    ObserverService.addObserver(this, "addNewFeed", false);
  },

  /** Deregisters from observer service on shutdown */
  deregister()
  {
    ObserverService.removeObserver(this, "addNewFeed");
  },

  /** API for observer service
   *
   * @param {nsISupports} subject - as defined in nsIObserverService
   * @param {string} topic - as defined in nsIObserverService
   * @param {wstring} data - as defined in nsIObserverService
   */
  observe(subject, topic, data)
  {
    try
    {
      switch (topic)
      {
        case "inforss.addNewFeed":
          inforssAddNewFeed({ inforssUrl: data });
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

  /** Reload (seriously?)
   *
   * Deletes the supplied feeds and reinitialises headline bar and feed manager
   *
   * @param deleted_feeds - array of feed urls to delete
   */
  reload(deleted_feeds = [])
  {
    for (let url of deleted_feeds)
    {
      this.deleteRss(url);
    }
    inforssClearPopupMenu();
    this._reinit_after(0);
  },

  /** Configuration was reset */
  configuration_reset()
  {
    this.feedManager.deleteAllRss();
    inforssClearPopupMenu();
    this._reinit_after(0);
  },

  /** Set a headline as viewed
   *
   * @param {string} title - title of headline
   * @param {string} link - url of headline
   */
  set_viewed(title, link)
  {
    this.headlineBar.setViewed(title, link);
  },

  /** Set a headline as banned
   *
   * @param {string} title - title of headline
   * @param {string} link - url of headline
   */
  set_banned(title, link)
  {
    this.headlineBar.setBanned(title, link);
  },

  /** Reload headline cache from disk */
  reload_headline_cache()
  {
    this.feedManager.reload_headline_cache();
  },

  /** Clear headline cache */
  clear_headline_cache()
  {
    this.feedManager.clear_headline_cache();
  },

  /** Purge old headlines from the headline cache */
  purge_headline_cache()
  {
    this.feedManager.purge_headline_cache();
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
  goHome()
  {
    this.feedManager.goHome();
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
