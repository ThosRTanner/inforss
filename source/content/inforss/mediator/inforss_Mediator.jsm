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

const { Context_Menu } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Context_Menu.jsm", {}
);

const { debug } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Debug.jsm", {}
);

const { alert } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Prompt.jsm", {}
);

const {
  browser_is_seamonkey,
  option_window_displayed,
  should_reuse_current_tab
} = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Utils.jsm", {}
);

const { get_string } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Version.jsm", {}
);

const { Feed_Manager } = Components.utils.import(
  "chrome://inforss/content/feed_handlers/inforss_Feed_Manager.jsm", {}
);

const { Headline_Bar } = Components.utils.import(
  "chrome://inforss/content/toolbar/inforss_Headline_Bar.jsm", {}
);

const { Headline_Display } = Components.utils.import(
  "chrome://inforss/content/toolbar/inforss_Headline_Display.jsm", {}
);

const { console } = Components.utils.import(
  "resource://gre/modules/Console.jsm", {}
);

const Browser_Tab_Prefs = Components.classes[
  "@mozilla.org/preferences-service;1"].getService(
  Components.interfaces.nsIPrefService).getBranch("browser.tabs.");

const ObserverService = Components.classes[
  "@mozilla.org/observer-service;1"].getService(
  Components.interfaces.nsIObserverService);

/** Function to return the location of the status bar, if there is one.
 *
 * @param {Document} document - The current window.
 *
 * @returns {Node} The status bar to use.
 */
function get_statusbar_node(document)
{
  //If we have status-4-evar installed, use that. It's an addon but it seems
  //to be installed in palemoon by default for some reason
  let addon_bar = document.getElementById("status4evar-status-bar");
  if (addon_bar != null)
  {
    return addon_bar;
  }
  //Seamonkey has it's own addon bar which is like it used to be in firefox
  if (browser_is_seamonkey())
  {
    return document.getElementById("status-bar");
  }
  addon_bar = document.getElementById("addon-bar");
  if (addon_bar?.getAttribute("toolbarname") === "Status Bar")
  {
    return addon_bar;
  }
  //Note: If you omit the above check for toolbarname in Waterfox, you get
  //a headline bar you can move around in customise but can't resize.
  return null;
}

/** Mediator allows communication between the feed manager and the display.
 *
 * @class
 *
 * it also exists as a singleton used in inforss and the option window, which
 * last gets hold of it by poking around in the parent window properties.
 *
 * The observer method allows for communication between multiple windows,
 * most obviously for keeping the headline bar in sync.
 *
 * @param {Document} document - The window document.
 * @param {Config} config - Configuration.
 */
function Mediator(document, config)
{
  this._config = config;
  this._document = document;

  this._feed_manager = new Feed_Manager(document, config, this);

  //Find out which addon bar we're using (if any) (this should belong in
  //headline_bar constructor)
  const addon_bar = get_statusbar_node(document) ??
          document.getElementById("inforss-addon-bar");

  this._headline_bar = new Headline_Bar(this,
                                        config,
                                        document,
                                        addon_bar,
                                        this._feed_manager);

  //FIXME headline display should be part of headline bar but currently
  //we're rather intermingled. All the button handlers below should be part
  //of headline bar. open link should be part of me.
  this._headline_display = new Headline_Display(this,
                                                config,
                                                document,
                                                addon_bar,
                                                this._feed_manager);

  this._context_menu = new Context_Menu(this, document);

  //All these methods allow us to take an event on one window and propogate
  //to all windows (meaning clicking viewed/banned etc on one will work on
  //all).
  this._methods = {
    "inforss.reload": () =>
    {
      this._load_config();
    },

    "inforss.remove_feeds": data =>
    {
      if (data != "")
      {
        for (const url of data.split("|"))
        {
          this._feed_manager.delete_feed(url);
        }
      }
      this._load_config();
    },

    "inforss.remove_all_feeds": () =>
    {
      this._feed_manager.delete_all_feeds();
      this._load_config();
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
        console.log("bad message", data);
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
        console.log("bad message", data);
        return;
      }
      const len = parseInt(data.substr(0, lend), 10);
      const title = data.substr(lend + 1, len);
      const link = data.substr(len + lend + 1);
      this._headline_bar.setViewed(title, link);
    },
  };

  this._register();
  this._load_config();
}

Mediator.prototype = {

  /** Load latest configuration and initialise everything. */
  _load_config()
  {
    this._config.read_configuration();

    this._headline_bar.config_changed();

    //Register all the feeds. We need to do this before we call the
    //feed manager config_changed otherwise it's likely to get confused.
    //FIXME Does this belong here? Or in the headline bar config_changed? or
    //even the feed manager one? Note the headline bar knows about the feed
    //manager, but not vice versa.
    for (const rss of this._config.get_all())
    {
      const menu_item = this._headline_bar._menu_button.add_feed_to_menu(rss);
      this._feed_manager.addFeed(rss, menu_item);
    }

    this._feed_manager.config_changed();
    this._headline_display.config_changed();
    this._headline_bar.refreshBar();
  },

  /** Clean up event handlers on shutdown. */
  dispose()
  {
    this._deregister();
    this._context_menu.dispose();
    this._headline_display.dispose();
    this._headline_bar.dispose();
    this._feed_manager.dispose();
  },

  /** Registers with observer service. */
  _register()
  {
    for (const method in this._methods)
    {
      ObserverService.addObserver(this, method, false);
    }
  },

  /** Deregisters from observer service on shutdown. */
  _deregister()
  {
    for (const method in this._methods)
    {
      ObserverService.removeObserver(this, method);
    }
  },

  /** API for observer service.
   *
   * @param {nsISupports} subject - As defined in nsIObserverService.
   * @param {string} topic - As defined in nsIObserverService.
   * @param {string} data - As defined in nsIObserverService.
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
        console.warn("Unknown mediator event", subject, topic, data);
      }
    }
    catch (err)
    {
      debug(err);
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
  //called from feedmanager and headline bar
  resetDisplay()
  {
    this._headline_display.resetDisplay();
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
    return this._headline_bar.last_displayed_headline;
  },

  //----------------------------------------------------------------------------
  //only from headline bar
  removeDisplay(feed)
  {
    this._headline_display.removeDisplay(feed);
  },

  /** Show the currently selected feed in the main icon.
   *
   * Replace the icon with that of the currently selected feed.
   * This also remembers the currently selected feed for later. For reasons
   * that aren't currently clear
   *
   * @param {Feed} feed - Currently selected feed.
   */
  show_selected_feed(feed)
  {
    this._headline_bar.show_selected_feed(feed);
  },

  /** Show that there is data is being fetched for a feed.
   *
   * @param {Feed} feed - Feed being processed.
   */
  show_feed_activity(feed)
  {
    this._headline_bar.show_feed_activity(feed);
  },

  /** Show that there is no data is being fetched for a feed. */
  show_no_feed_activity()
  {
    this._headline_bar.show_no_feed_activity();
  },

  /** Clears the currently selected feed and removes any activity. */
  clear_selected_feed()
  {
    this._headline_bar.clear_selected_feed();
    this.resetDisplay();
  },

  /** Find the specified feed. Note that this is ONLY used from the options
   * window. There should be a better way of doing this.
   *
   * @param {string} url - URL of feed.
   *
   * @returns {Feed} - Feed object (or undefined if can't be found).
   */
  find_feed(url)
  {
    return this._feed_manager.find_feed(url);
  },

  //----------------------------------------------------------------------------
  //FIXME from feed mananger but I don't quite see the use of this function
  isActiveTooltip()
  {
    return this._headline_display.isActiveTooltip();
  },

  /** Open headline in browser.
   *
   * @param {string} url - URL to open.
   */
  open_link(url)
  {
    let behaviour = this._config.headline_action_on_click;

    if (behaviour == this._config.New_Default_Tab)
    {
      behaviour = Browser_Tab_Prefs.getBoolPref("loadInBackground") ?
        this._config.New_Background_Tab :
        this._config.New_Foreground_Tab;
    }

    const window = this._document.defaultView;
    switch (behaviour)
    {
      default:
        debug(new Error("Unknown behaviour: " + behaviour));
        break;

      case this._config.New_Background_Tab:
        if (should_reuse_current_tab(window))
        {
          window.gBrowser.loadURI(url);
        }
        else
        {
          window.gBrowser.addTab(url);
        }
        break;

      case this._config.New_Foreground_Tab: // in tab, foreground
        if (should_reuse_current_tab(window))
        {
          window.gBrowser.loadURI(url);
        }
        else
        {
          window.gBrowser.selectedTab = window.gBrowser.addTab(url);
        }
        break;

      case this._config.New_Window:
        window.open(url, "_blank");
        break;

      case this._config.Current_Tab:
        window.gBrowser.loadURI(url);
        break;
    }
  },

  /** Add a feed given a url. This checks option window is open first.
   *
   * @param {string} url - URL of feed to add.
   */
  add_feed_from_url(url)
  {
    //Move to feed manager code?
    if (option_window_displayed())
    {
      alert(get_string("option.dialogue.open"));
      return;
    }
    this._feed_manager.add_feed_from_url(url);
  }

};
