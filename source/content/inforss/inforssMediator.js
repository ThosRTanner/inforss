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

Components.utils.import(
  "chrome://inforss/content/toolbar/inforss_Menu_Button.jsm",
  inforss);

Components.utils.import(
  "chrome://inforss/content/toolbar/inforss_Headline_Bar.jsm",
  inforss);

//A LOT hacky. Hopefully this will be a module soon
/* eslint strict: "off" */

/* global inforssFeedManager */
/* global inforssHeadlineDisplay */
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
 *
 * @param {object} config - inforss configuration
 */
function inforssMediator(config)
{
  this._config = config;
  this._feed_manager = new inforssFeedManager(this, config);
  this._headline_bar = new inforss.Headline_Bar(this, config, document);
  this._headline_display = new inforssHeadlineDisplay(
    this,
    config,
    document
  );
  //FIXME Should probably live in headlinedisplay class (so the latter can
  //call the former to update the icon)
  this._menu_button = new inforss.Menu_Button(
    config,
    this._headline_display,
    this._feed_manager,
    document);

  this._methods = {
    "inforss.add_new_feed": (data) =>
    {
      inforssAddNewFeed({ inforssUrl: data });
    },

    "inforss.remove_feeds": (data) =>
    {
      if (data != "")
      {
        for (let url of data.split("|"))
        {
          this._feed_manager.deleteRss(url);
        }
      }
      this.reload();
    },

    "inforss.remove_all_feeds": () =>
    {
      this._feed_manager.deleteAllRss();
      this.reload();
    },

    "inforss.clear_headline_cache": () =>
    {
      this._feed_manager.clear_headline_cache();
    },

    "inforss.reload_headline_cache": () =>
    {
      this._feed_manager.reload_headline_cache();
    },

    "inforss.purge_headline_cache": () =>
    {
      this._feed_manager.purge_headline_cache();
    }
  };


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
      this._feed_manager.init();
      this._headline_display.init();
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
    for (let method in this._methods)
    {
      ObserverService.addObserver(this, method, false);
    }
  },

  /** Deregisters from observer service on shutdown */
  deregister()
  {
    for (let method in this._methods)
    {
      ObserverService.removeObserver(this, method);
    }
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
      if (topic in this._methods)
      {
        this._methods[topic](data);
      }
      else
      {
        inforss.debug("Unknown mediator event", subject, topic, data);
      }
    }
    catch (e)
    {
      inforss.debug(e);
    }
  },

  /** Reload
   *
   * Reinitialises headline bar and feed manager
   *
   */
  reload()
  {
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
    this._headline_bar.setViewed(title, link);
  },

  /** Set a headline as banned
   *
   * @param {string} title - title of headline
   * @param {string} link - url of headline
   */
  set_banned(title, link)
  {
    this._headline_bar.setBanned(title, link);
  },

  //----------------------------------------------------------------------------
  updateBar(feed)
  {
    this._headline_bar.updateBar(feed);
  },

  //----------------------------------------------------------------------------
  updateDisplay(feed)
  {
    this._headline_display.updateDisplay(feed);
  },

  //----------------------------------------------------------------------------
  refreshBar()
  {
    this._headline_bar.refreshBar();
  },

  //----------------------------------------------------------------------------
  setSelected(url)
  {
    try
    {
      const selectedInfo = this._feed_manager.getSelectedInfo(false);
      if (selectedInfo == null || url != selectedInfo.getUrl())
      {
        this._feed_manager.setSelected(url);
        return true;
      }
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    return false;
  },

  //----------------------------------------------------------------------------
  addFeed(feedXML, menuItem)
  {
    this._feed_manager.addFeed(feedXML, menuItem);
  },

  //----------------------------------------------------------------------------
  getSelectedInfo(findDefault)
  {
    return this._feed_manager.getSelectedInfo(findDefault);
  },

  //----------------------------------------------------------------------------
  resetDisplay()
  {
    this._headline_display.resetDisplay();
  },

  //----------------------------------------------------------------------------
  deleteRss(url)
  {
    this._feed_manager.deleteRss(url);
  },

  //----------------------------------------------------------------------------
  resizedWindow()
  {
    this._headline_display.resizedWindow();
  },

  //----------------------------------------------------------------------------
  publishFeed(feed)
  {
    this._headline_bar.publishFeed(feed);
  },

  //----------------------------------------------------------------------------
  unpublishFeed(feed)
  {
    this._headline_bar.unpublishFeed(feed);
  },

  //----------------------------------------------------------------------------
  getLastDisplayedHeadline()
  {
    return this._headline_bar.getLastDisplayedHeadline();
  },

  //----------------------------------------------------------------------------
  removeDisplay(feed)
  {
    this._headline_display.removeDisplay(feed);
  },

  //----------------------------------------------------------------------------
  updateMenuIcon(feed)
  {
    this._headline_display.updateMenuIcon(feed);
  },

  //----------------------------------------------------------------------------
  locateFeed(url)
  {
    return this._feed_manager.locateFeed(url);
  },

  //----------------------------------------------------------------------------
  checkStartScrolling()
  {
    this._headline_display.checkStartScrolling();
  },

  //----------------------------------------------------------------------------
  isActiveTooltip()
  {
    return this._headline_display.isActiveTooltip();
  },

  //----------------------------------------------------------------------------
  readAll()
  {
    if (inforss.confirm(inforss.get_string("readall")))
    {
      this._headline_bar.readAll();
    }
  },

  //----------------------------------------------------------------------------
  openTab(url)
  {
    inforss.traceIn(this);
    try
    {
      this._headline_display.openTab(url);
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
      this._headline_bar.viewAll();
    }
  },

  //----------------------------------------------------------------------------
  switchScroll()
  {
    this._headline_display.switchScroll();
  },

  //----------------------------------------------------------------------------
  quickFilter()
  {
    this._headline_display.quickFilter();
  },

  //----------------------------------------------------------------------------
  switchShuffle()
  {
    //FIXME This should be done as a function in headlineDisplay
    this._config.switchShuffle();
    this._headline_display.updateCmdIcon();
  },

  //----------------------------------------------------------------------------
  switchPause()
  {
    this._headline_display.switchPause();
  },

  //----------------------------------------------------------------------------
  switchDirection()
  {
    this._headline_display.switchDirection();
  },

  //----------------------------------------------------------------------------
  goHome()
  {
    this._feed_manager.goHome();
  },

  //----------------------------------------------------------------------------
  manualRefresh()
  {
    this._feed_manager.manualRefresh();
  },

  //----------------------------------------------------------------------------
  manualSynchronize()
  {
    //FIXME What's this for then?
    //    this._feed_manager.manualRefresh();
  },

  //----------------------------------------------------------------------------
  toggleHideOld()
  {
    this._config.hide_old_headlines = !this._config.hide_old_headlines;
    this._config.save();
    this._headline_bar.refreshBar();
  },

  //----------------------------------------------------------------------------
  toggleHideViewed()
  {
    this._config.hide_viewed_headlines = !this._config.hide_viewed_headlines;
    this._config.save();
    this._headline_bar.refreshBar();
  },

  //----------------------------------------------------------------------------
  //This is called from the 'next' and 'previous' buttons as
  //gInfoRssMediator.nextFeed(-1 (prev) or 1(next))
  nextFeed(direction)
  {
    this._feed_manager.getNextGroupOrFeed(direction);
  },

};
