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
// inforss_Mediator
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------

/* jshint globalstrict: true */
/* eslint-disable strict */
"use strict";

/* eslint-disable array-bracket-newline */
/* exported EXPORTED_SYMBOLS */
const EXPORTED_SYMBOLS = [
  "Mediator", /* exported Mediator */
];
/* eslint-enable array-bracket-newline */

const { debug } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Debug.jsm",
  {}
);

const { confirm } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Prompt.jsm",
  {}
);

const { Feed_Manager } = Components.utils.import(
  "chrome://inforss/content/feed_handlers/inforss_Feed_Manager.jsm",
  {}
);

const { Headline_Bar } = Components.utils.import(
  "chrome://inforss/content/toolbar/inforss_Headline_Bar.jsm",
  {}
);

const { Headline_Display } = Components.utils.import(
  "chrome://inforss/content/toolbar/inforss_Headline_Display.jsm",
  {}
);

//const { console } =
//  Components.utils.import("resource://gre/modules/Console.jsm", {});

const ObserverService = Components.classes[
  "@mozilla.org/observer-service;1"].getService(
  Components.interfaces.nsIObserverService);

/** Mediator allows communication between the feed manager and the display.
 * @class
 *
 * it also exists as a singleton used in inforss and the option window, which
 * last gets hold of it by poking around in the parent window properties.
 *
 * The observer method allows for communication between multiple windows,
 * most obviously for keeping the headline bar in sync.
 *
 * @param {object} document - the window document
 * @param {XML_Repository} config - inforss configuration
 */
function Mediator(document, config)
{
  this._config = config;
  this._feed_manager = new Feed_Manager(this, config);
  this._headline_bar = new Headline_Bar(this, config, document);
  //FIXME headline display should be part of headline bar but currently
  //we're rather intermingled. All the button handlers below should be part
  //of headline bar. open link should be part of me.
  this._headline_display = new Headline_Display(this, config, document);

  //All these methods allow us to take an event on one window and propogate
  //to all windows (meaning clicking viewed/banned etc on one will work on
  //all).
  this._methods = {
    "inforss.reload": () =>
    {
      this._init();
    },

    "inforss.remove_feeds": data =>
    {
      if (data != "")
      {
        for (let url of data.split("|"))
        {
          this._feed_manager.deleteRss(url);
        }
      }
      this._init();
    },

    "inforss.remove_all_feeds": () =>
    {
      this._feed_manager.deleteAllRss();
      this._init();
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

    "inforss.start_headline_dump": data =>
    {
      this._feed_manager.sync(data);
    },

    "inforss.send_headline_data": data =>
    {
      this._feed_manager.syncBack(data);
    },

    "inforss.set_headline_banned": data =>
    {
      //Encoded as length of title + / + title + url
      //eg 12/abcdefghijklmhttps://wibble.com
      const lend = data.indexOf("/");
      if (lend == -1)
      {
        debug("bad message", data);
        return;
      }
      const len = parseInt(data.substr(0, lend), 10);
      const title = data.substr(lend + 1, len);
      const link = data.substr(len + lend + 1);
      this._headline_bar.setBanned(title, link);
    },

    "inforss.set_headline_viewed": data =>
    {
      //Encoded as length of title + / + title + url
      //eg 12/abcdefghijklmhttps://wibble.com
      const lend = data.indexOf("/");
      if (lend == -1)
      {
        debug("bad message", data);
        return;
      }
      const len = parseInt(data.substr(0, lend), 10);
      const title = data.substr(lend + 1, len);
      const link = data.substr(len + lend + 1);
      this._headline_bar.setViewed(title, link);
    },
  };

  this._register();
}

Mediator.prototype = {

  /** Load latest configuration and initialise everything */
  _init()
  {
    try
    {
      this._config.read_configuration();

      this._headline_bar.init();

      //Register all the feeds. We need to do this before we call the
      //feed manager init otherwise it's likely to get confused.
      //FIXME Probably a bug?
      for (let item of this._config.get_all())
      {
        this._register_feed(item);
      }

      this._feed_manager.init();
      this._headline_display.init();
    }
    catch (e)
    {
      debug(e, this);
    }
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
        debug("Unknown mediator event", subject, topic, data);
      }
    }
    catch (e)
    {
      debug(e);
    }
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
      const selectedInfo = this._feed_manager.get_selected_feed();
      if (selectedInfo == null || url != selectedInfo.getUrl())
      {
        this._feed_manager.setSelected(url);
        return true;
      }
    }
    catch (e)
    {
      debug(e, this);
    }
    return false;
  },

  //----------------------------------------------------------------------------
  get_selected_feed()
  {
    return this._feed_manager.get_selected_feed();
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

  /** Show the currently selected feed in the main icon
   *
   * Replace the icon with that of the currently selected feed.
   * This also remembers the currently selected feed for later. For reasons
   * that aren't currently clear
   *
   * @param {Feed} feed - currently selected feed
   */
  show_selected_feed(feed)
  {
    this._headline_bar.show_selected_feed(feed);
  },

  /** Show that there is data is being fetched for a feed
   *
   * @param {Feed} feed - feed being processed
   */
  show_feed_activity(feed)
  {
    this._headline_bar.show_feed_activity(feed);
  },

  /** Show that there is no data is being fetched for a feed */
  show_no_feed_activity()
  {
    this._headline_bar.show_no_feed_activity();
  },

  /** clears the currently selected feed and removes any activity */
  clear_selected_feed()
  {
    this._headline_bar.clear_selected_feed();
    this.resetDisplay();
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
    if (confirm("readall"))
    {
      this._headline_bar.readAll();
    }
  },

  //----------------------------------------------------------------------------
  //From feed manager. Probably should contain the code here.
  open_link(url)
  {
    try
    {
      this._headline_display.open_link(url);
    }
    catch (err)
    {
      debug(err, this);
    }
  },

  //----------------------------------------------------------------------------
  //button handler
  viewAll()
  {
    if (confirm("viewall"))
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
    //this._feed_manager.manualRefresh();
    //It looks from the name like it was intended to perform a dump of the feed
    //info from this window to other windows, but it actually did a manual
    //refresh (which was commented out anyway)
  },

  //----------------------------------------------------------------------------
  //button handler
  toggleHideOld()
  {
    this._config.hide_old_headlines = ! this._config.hide_old_headlines;
    this._config.save();
    this._headline_bar.refreshBar();
  },

  //----------------------------------------------------------------------------
  //button handler
  toggleHideViewed()
  {
    this._config.hide_viewed_headlines = ! this._config.hide_viewed_headlines;
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

  //----------------------------------------------------------------------------
  /** Register a feed
   * Registers a feed in the main menu and adds to the feed manager
   *
   * @param {object} rss configuration of feed to register
   */
  _register_feed(rss)
  {
    const menu_item = this._headline_bar._menu_button.add_feed_to_menu(rss);
    this._feed_manager.addFeed(rss, menu_item);
  }
};
