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
// inforss_Headline_Bar
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------

/* eslint-disable strict */
/* jshint globalstrict: true */
"use strict";

/* eslint-disable array-bracket-newline */
/* exported EXPORTED_SYMBOLS */
const EXPORTED_SYMBOLS = [
  "Headline_Bar", /* exported Headline_Bar */
];
/* eslint-enable array-bracket-newline */

const { confirm } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Prompt.jsm", {}
);

const {
  add_event_listeners,
  remove_event_listeners,
  reverse
} = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Utils.jsm", {}
);

const { Main_Icon } = Components.utils.import(
  "chrome://inforss/content/toolbar/inforss_Main_Icon.jsm", {}
);

const { console } = Components.utils.import(
  "resource://gre/modules/Console.jsm", {}
);

const Inforss_Prefs = Components.classes[
  "@mozilla.org/preferences-service;1"].getService(
  Components.interfaces.nsIPrefService).getBranch("inforss.");

/** Create a headline bar.
 *
 * @class
 *
 * Mainly deals with button events on the headline and selecting which headlines
 * to display based on filters.
 *
 * @param {Mediator} mediator - Mediates between parts of the toolbar area.
 * @param {Config} config - Configuration.
 * @param {Document} document - Global document object.
 * @param {Element} addon_bar - Whichever addon bar we are using.
 * @param {Feed_Manager} feed_manager - The manager of displayed feeds &c.
 */
function Headline_Bar(mediator, config, document, addon_bar, feed_manager)
{
  this._mediator = mediator;
  this._config = config;
  this._document = document;
  this._feed_manager = feed_manager;
  this._observed_feeds = [];
  this._selected_feed = null;

  this._menu_button = new Main_Icon(feed_manager, config, document);

  this._addon_bar = addon_bar;
  this._addon_bar_name = addon_bar.id;
  this._has_addon_bar = addon_bar.id != "inforss-addon-bar";

  //The commented out entries here are handled in the Headline_Display class.
  //This is arguably confusing.
  /* eslint-disable array-bracket-newline */
  this._listeners = add_event_listeners(
    this,
    document,
    [ "hideold.tooltip", "popupshowing", this._show_hide_old_tooltip ],
    [ "icon.readall", "click", this._mark_all_read ],
    [ "icon.previous", "click", this._select_previous_feed ],
    //[ "icon.pause", "click", this._toggle_pause ],
    [ "icon.next", "click", this._select_next_feed ],
    [ "icon.viewall", "click", this._view_all_headlines ],
    [ "icon.refresh", "click", this._manual_refresh ],
    [ "icon.hideold", "click", this._toggle_hide_old_headlines ],
    [ "icon.hideviewed", "click", this._toggle_hide_viewed_headlines ],
    // [ "icon.shuffle", "click", this._switch_shuffle_style ],
    // [ "icon.direction", "click", this._switch_scroll_direction ],
    // [ "icon.scrolling", "click", this._toggle_scrolling ],
    // [ "icon.filter", "click", this._quick_filter ],
    [ "icon.home", "click", this._show_feed_home_page ]
  );
  /* eslint-enable array-bracket-newline */
}

Headline_Bar.prototype = {

  /** Reinitialise the headline bar.
   *
   * This puts it in the right place on the display.
   */
  config_changed()
  {
    this._position_bar();
    this._menu_button.config_changed();
  },

  /** Dispose of resources - remove event handlers and so on. */
  dispose()
  {
    remove_event_listeners(this._listeners);
  },

  /** Get the id used for the selected configuration.
   *
   * @returns {string} An id. Duh.
   */
  _get_desired_id()
  {
    switch (this._config.headline_bar_location)
    {
      case this._config.In_Status_Bar:
        return this._has_addon_bar ?
          this._addon_bar_name :
          "inforss-bar-bottom";

      case this._config.At_Top:
        return "inforss-bar-top";

      default:
      case this._config.At_Bottom:
        return "inforss-bar-bottom";
    }
  },

  /** Update the visibility of the various possible headline locations.
   *
   * @param {Element} headlines - DOM element for the panel.
   * @param {boolean} in_toolbar - True if in top/bottom toolbar.
   */
  _update_panel(headlines, in_toolbar)
  {
    this._document.getElementById("inforss.resizer").collapsed = in_toolbar;
    const statuspanelNews = this._document.getElementById("inforss-hbox");
    statuspanelNews.flex = in_toolbar ? "1" : "0";
    statuspanelNews.firstChild.flex = in_toolbar ? "1" : "0";
    headlines.flex = in_toolbar ? "1" : "0";
  },

  /** Move the headline bar to the correct place.
   *
   * The headline bar can be in 3 places:
   * At_Top: Implemented as a toolbar.
   * At_Bottom: Implemented as an hbox which is tacked onto the status bar.
   * In_Status_Bar: Added into the status bar.
   */
  _position_bar()
  {
    const desired_container = this._get_desired_id();

    const headlines = this._document.getElementById("inforss.headlines");
    const container = headlines.parentNode;

    if (desired_container == container.id)
    {
      //changing to the same place. Do nothing.
      return;
    }

    if (container.id == "inforss-bar-top")
    {
      //Changing the location. If we were at the top remember whether or not the
      //toolbar was hidden.
      Inforss_Prefs.setBoolPref("toolbar.collapsed", container.collapsed);
    }

    if (this._config.headline_bar_location == this._config.In_Status_Bar &&
        this._has_addon_bar)
    {
      //Headlines in the status bar
      this._update_panel(headlines, false);

      container.remove();

      //Insert this *before* the gripper.
      this._addon_bar.insertBefore(headlines, this._addon_bar.lastElementChild);
    }
    else
    {
      //Headlines in a tool bar
      this._update_panel(headlines, true);
      if (container.id == this._addon_bar_name)
      {
        // was in the status bar
        headlines.remove();
      }
      else
      {
        // was in a tool bar
        container.remove();
      }

      //Why do we keep recreating the tool bar?
      if (this._config.headline_bar_location == this._config.At_Top)
      {
        //headlines at the top
        const statusbar = this._document.createElement("toolbar");
        //There is not a lot of documentation on what persist does. In theory it
        //should cause the collapsed attribute to be persisted on restart, but
        //we're recreating the toolbar every time we go through here.
        statusbar.persist = "collapsed";
        statusbar.collapsed = Inforss_Prefs.getBoolPref("toolbar.collapsed");
        statusbar.setAttribute("toolbarname", "InfoRSS");
        statusbar.id = "inforss-bar-top";
        statusbar.append(headlines);
        const toolbox = this._document.getElementById("navigator-toolbox");
        toolbox.append(statusbar);
      }
      else
      {
        //headlines at the bottom
        //FIXME It'd be nice if this could somehow appear in toolbar menu
        const statusbar = this._document.createElement("hbox");
        statusbar.id = "inforss-bar-bottom";
        statusbar.append(headlines);
        const toolbar = this._addon_bar;
        toolbar.parentNode.insertBefore(statusbar, toolbar);
      }
    }
  },

  //-------------------------------------------------------------------------------------------------------------
  //this is called from the feed manager when a read is completed. I think it is
  //possible in that case for the feed not to be in this._observed_feeds
  updateBar(feed)
  {
    //FIXME Sort of odd. Is there an 'if feed in observed' sort of thing?
    for (const observed of this._observed_feeds)
    {
      if (observed.getUrl() == feed.getUrl())
      {
        this._update_bar(feed);
        return;
      }
    }
  },

  /** Update bar for a feed by updating the headlines then kicking the display.
   *
   * @param {Feed} feed - Feed with headlines to update.
   *
   * @warning Do not call this unless you know feed is in _observed_feeds.
   */
  _update_bar(feed)
  {
    this._update_headlines(feed);
    if (feed.isSelected())
    {
      this.show_selected_feed(feed);
    }
    this._mediator.updateDisplay(feed); //headline_display
  },

  /** Update the displayed headlines for the feed.
   *
   * This is where the configured filters are applied to the headlines.
   *
   * @param {Feed} feed - Feed with headlines to put on the headline bar.
   */
  _update_headlines(feed)
  {
    let num = 0;
    let shown = 0;
    const max = feed.getNbItem();
    feed.resetCandidateHeadlines();
    for (const headline of feed.headlines)
    {
      if (! (this._config.hide_old_headlines && ! headline.isNew()) &&
          ! (this._config.hide_viewed_headlines && headline.viewed) &&
          ! headline.banned &&
          this._headline_passes_filters(headline, num))
      {
        feed.pushCandidateHeadline(headline);
        shown += 1;
        if (shown == max)
        {
          break;
        }
      }
      num += 1;
    }
  },

  /** See if a headline is filtered.
   *
   * This redirects to the selected feed rather than this feed, in case the
   * selected feed is a group.
   *
   * @param {Headline} headline - Headline to check.
   * @param {number} num - The number of the headline.
   *
   * @returns {boolean} True if headline passes through filters.
   */
  _headline_passes_filters(headline, num)
  {
    return this._feed_manager.get_selected_feed().matches_filter(headline, num);
  },

  //-------------------------------------------------------------------------------------------------------------
  refreshBar()
  {
    this._mediator.resetDisplay(); //headline_display

    for (const feed of this._observed_feeds)
    {
      this._update_bar(feed);
    }
  },

  /** Get the last headline in the headline bar.
   *
   * @returns {Headline} The last displayed headline.
   */
  get last_displayed_headline()
  {
    for (const feed of reverse(this._observed_feeds))
    {
      const last = feed.last_displayed_headline;
      if (last !== undefined)
      {
        return last;
      }
    }
    return null;
  },

  //-------------------------------------------------------------------------------------------------------------
  publishFeed(feed)
  {
    if (this._locate_observed_feed(feed) == -1)
    {
      this._observed_feeds.push(feed);
      this._update_bar(feed);
    }
  },

  //-------------------------------------------------------------------------------------------------------------
  unpublishFeed(feed)
  {
    var index = this._locate_observed_feed(feed);
    if (index != -1)
    {
      this._mediator.removeDisplay(feed); //headline_display
      this._observed_feeds.splice(index, 1);
    }
  },

  /** Find the specified feed in the list of observed feeds.
   *
   * @param {Feed} feed - Feed to search for.
   *
   * @returns {number} Index into the observed feeds array, or -1 if not found.
   */
  _locate_observed_feed(feed)
  {
    //FIXME Do we seriously need to check the url?
    return this._observed_feeds.findIndex(
      observed_feed => observed_feed.getUrl() == feed.getUrl());
  },

  //-------------------------------------------------------------------------------------------------------------
  setViewed(title, link)
  {
    for (const feed of this._observed_feeds)
    {
      if (feed.setViewed(title, link))
      {
        break;
      }
    }
  },

  //-------------------------------------------------------------------------------------------------------------
  setBanned(title, link)
  {
    for (const feed of this._observed_feeds)
    {
      if (feed.setBanned(title, link))
      {
        break;
      }
    }
  },

  /** 'Mark all read' button clicked.
   *
   * @param {MouseEvent} _event - Mousedown event.
   */
  _mark_all_read(_event)
  {
    if (confirm("readall"))
    {
      for (const feed of this._observed_feeds)
      {
        feed.setBannedAll();
        this._update_bar(feed);
      }
    }
  },

  /** 'Previous' button clicked.
   *
   * @param {MouseEvent} _event - Mousedown event.
   */
  _select_previous_feed(_event)
  {
    this._feed_manager.select_previous_feed();
  },

  /** 'Next' button clicked.
   *
   * @param {MouseEvent} _event - Mousedown event.
   */
  _select_next_feed(_event)
  {
    this._feed_manager.select_next_feed();
  },

  /** 'View all headlines' button clicked.
   *
   * @param {MouseEvent} _event - Mousedown event.
   */
  _view_all_headlines(_event)
  {
    if (confirm("viewall"))
    {
      for (const feed of this._observed_feeds)
      {
        feed.viewAll();
        this._update_bar(feed);
      }
    }
  },

  /** Manually refresh current feed headlines.
   *
   * @param {MouseEvent} _event - Mousedown event.
   */
  _manual_refresh(_event)
  {
    this._feed_manager.manualRefresh();
  },

  /** Toggle hiding of old headlines.
   *
   * @param {MouseEvent} _event - Mousedown event.
   */
  _toggle_hide_old_headlines(_event)
  {
    this._config.hide_old_headlines = ! this._config.hide_old_headlines;
    this._config.save();
    this.refreshBar();
  },

  /** Toggle hiding of viewed headlines.
   *
   * @param {MouseEvent} _event - Mousedown event.
   */
  _toggle_hide_viewed_headlines(_event)
  {
    this._config.hide_viewed_headlines = ! this._config.hide_viewed_headlines;
    this._config.save();
    this.refreshBar();
  },

  /** Shows the feed home page.
   *
   * @param {MouseEvent} _event - Mousedown event.
   */
  _show_feed_home_page(_event)
  {
    this._feed_manager.goHome();
  },

  //FIXME This shows the number of new headlines even though the text says
  //'old headlines'
  /** Called when the hide old headlines button tooltip is shown.
   *
   * Updates the label to show the number of new headlines.
   *
   * @param {PopupEvent} event - Popupshowing event.
   */
  _show_hide_old_tooltip(event)
  {
    const feed = this._selected_feed;
    if (feed != null)
    {
      const label = event.target.firstChild;
      const value = label.getAttribute("value");
      const index = value.indexOf("(");
      //FIXME Why bother with the (..) if you're sticking it at the end?
      label.setAttribute(
        "value",
        value.substring(0, index) + "(" + feed.num_new_headlines + ")"
      );
    }
  },

  /** Show the feed currently being processed.
   *
   * Remembers feed for the configurable button tooltips and updates
   * the main icon.
   *
   * @param {Feed} feed - Feed just selected.
   */
  show_selected_feed(feed)
  {
    this._selected_feed = feed;
    this._menu_button.show_selected_feed(feed);
  },

  /** Show that there is data is being fetched for a feed.
   *
   * Just hands off to the menu button.
   *
   * @param {Feed} feed - Feed with activity.
   */
  show_feed_activity(feed)
  {
    this._menu_button.show_feed_activity(feed);
  },

  /** Show that there is no data is being fetched for a feed. */
  show_no_feed_activity()
  {
    this._menu_button.show_no_feed_activity();
  },

  /** Clears the currently selected feed and removes any activity. */
  clear_selected_feed()
  {
    this._selected_feed = null;
    this._menu_button.clear_selected_feed();
  },

};
