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

/*jshint browser: true, devel: true */
/*eslint-env browser */

var inforss = inforss || {};
Components.utils.import("chrome://inforss/content/modules/inforss_Debug.jsm",
                        inforss);

Components.utils.import(
  "chrome://inforss/content/feed_handlers/inforss_Feed_Manager.jsm",
  inforss);

Components.utils.import(
  "chrome://inforss/content/toolbar/inforss_Headline_Bar.jsm",
  inforss);

Components.utils.import(
  "chrome://inforss/content/toolbar/inforss_Headline_Display.jsm",
  inforss);

//A LOT hacky. Hopefully this will be a module soon
/* eslint strict: "off" */

/* globals inforssClearPopupMenu */
/* globals inforssAddNewFeed */
/* globals inforssRead */
/* globals inforssAddItemToMenu */

const ObserverService = Components.classes[
  "@mozilla.org/observer-service;1"].getService(
  Components.interfaces.nsIObserverService);

//FIXME get rid of all the 2 phase initialisation

/** This class contains the single feed manager, headline bar and headline
 * display objects, and allows them to communicate with one another.
 *
 * it also exists as a singleton used in inforss and the option window, which
 * last gets hold of it by poking around in the parent window properties.
 *
 * The observer method allows for communication between multiple windows,
 * most obviously for keeping the headline bar in sync.
 *
 * @param {object} config - inforss configuration
 */
function inforssMediator(config)
{
  this._config = config;
  this._feed_manager = new inforss.Feed_Manager(this, config);
  this._headline_bar = new inforss.Headline_Bar(this, config, document);
  //FIXME headline display should be part of headline bar but currently
  //we're rather intermingled. All the button handlers below should be part
  //of headline bar. open link should be part of me.
  this._headline_display = new inforss.Headline_Display(this, config, document);

  //All these methods allow us to take an event on one window and propogate
  //to all windows (meaning clicking viewed/banned etc on one will work on
  //all).
  this._methods = {
    "inforss.add_new_feed": (data) =>
    {
      inforssAddNewFeed({ inforssUrl: data });
    },

    "inforss.reload": () =>
    {
      this._reload();
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
      this._reload();
    },

    "inforss.remove_all_feeds": () =>
    {
      this._feed_manager.deleteAllRss();
      this._reload();
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
    },

    "inforss.start_headline_dump": (data) =>
    {
      this._feed_manager.sync(data);
    },

    "inforss.send_headline_data": (data) =>
    {
      this._feed_manager.syncBack(data);
    },

    "inforss.set_headline_banned": (data) =>
    {
      //Encoded as length of title + / + title + url
      //eg 12/abcdefghijklmhttps://wibble.com
      const lend = data.indexOf("/");
      if (lend == -1)
      {
        inforss.debug("bad message", data);
        return;
      }
      const len = parseInt(data.substr(0, lend), 10);
      const title = data.substr(lend + 1, len);
      const link = data.substr(len + lend + 1);
      this._headline_bar.setBanned(title, link);
    },

    "inforss.set_headline_viewed": (data) =>
    {
      //Encoded as length of title + / + title + url
      //eg 12/abcdefghijklmhttps://wibble.com
      const lend = data.indexOf("/");
      if (lend == -1)
      {
        inforss.debug("bad message", data);
        return;
      }
      const len = parseInt(data.substr(0, lend), 10);
      const title = data.substr(lend + 1, len);
      const link = data.substr(len + lend + 1);
      this._headline_bar.setViewed(title, link);
    },

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
      inforssRead();

      /* This feels uncomfy here */
      for (let item of this._config.get_all())
      {
        inforssAddItemToMenu(item);
      }
      /* down to here */

      this._headline_bar.init();
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
  _reload()
  {
    inforssClearPopupMenu();
    this._reinit_after(0);
  },

  //----------------------------------------------------------------------------
  updateBar(feed)
  {
    this._headline_bar.updateBar(feed);
  },

  //----------------------------------------------------------------------------
  //only called from headline bar
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
  //FIXME this is used from inforssAddItemToMenu which is a global pita
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
  //called from feedmanager and headline bar
  resetDisplay()
  {
    this._headline_display.resetDisplay();
  },

  //----------------------------------------------------------------------------
  //from inforss and resize button (which is a child of headline display)
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
  //only from headline bar
  removeDisplay(feed)
  {
    this._headline_display.removeDisplay(feed);
  },

  //----------------------------------------------------------------------------
  //FIXME this function should be in headline bar as the popup isn't part of the
  //headline display
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
  //FIXME from feed mananger but I don't quite see the use of this function
  isActiveTooltip()
  {
    return this._headline_display.isActiveTooltip();
  },

  //----------------------------------------------------------------------------
  readAll()
  {
    if (inforss.confirm("readall"))
    {
      this._headline_bar.readAll();
    }
  },

  //----------------------------------------------------------------------------
  //From feed manager. Probably should contain the code here.
  open_link(url)
  {
    inforss.traceIn(this);
    try
    {
      this._headline_display.open_link(url);
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
    if (inforss.confirm("viewall"))
    {
      this._headline_bar.viewAll();
    }
  },

  //----------------------------------------------------------------------------
  //button handler
  switchScroll()
  {
    this._headline_display.switchScroll();
  },

  //----------------------------------------------------------------------------
  //button handler
  quickFilter()
  {
    this._headline_display.quickFilter();
  },

  //----------------------------------------------------------------------------
  //button handler
  switchShuffle()
  {
    //FIXME This should be done as a function in headlineDisplay
    this._config.switchShuffle();
    this._headline_display.updateCmdIcon();
  },

  //----------------------------------------------------------------------------
  //button handler
  switchPause()
  {
    this._headline_display.switchPause();
  },

  //----------------------------------------------------------------------------
  //button handler
  switchDirection()
  {
    this._headline_display.switchDirection();
  },

  //----------------------------------------------------------------------------
  //button handler
  goHome()
  {
    this._feed_manager.goHome();
  },

  //----------------------------------------------------------------------------
  //button handler
  manualRefresh()
  {
    this._feed_manager.manualRefresh();
  },

  //----------------------------------------------------------------------------
  //button handler
  manualSynchronize()
  {
    //FIXME What's this for then?
    //    this._feed_manager.manualRefresh();
  },

  //----------------------------------------------------------------------------
  //button handler
  toggleHideOld()
  {
    this._config.hide_old_headlines = !this._config.hide_old_headlines;
    this._config.save();
    this._headline_bar.refreshBar();
  },

  //----------------------------------------------------------------------------
  //button handler
  toggleHideViewed()
  {
    this._config.hide_viewed_headlines = !this._config.hide_viewed_headlines;
    this._config.save();
    this._headline_bar.refreshBar();
  },

  //----------------------------------------------------------------------------
  //button handler
  //This is called from the 'next' and 'previous' buttons as
  //gInfoRssMediator.nextFeed(-1 (prev) or 1(next))
  nextFeed(direction)
  {
    this._feed_manager.getNextGroupOrFeed(direction);
  },

};
