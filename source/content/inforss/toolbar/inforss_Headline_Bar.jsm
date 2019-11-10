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

const { debug } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Debug.jsm",
  {}
);

const { confirm } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Prompt.jsm",
  {}
);

const { add_event_listeners, remove_event_listeners } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Utils.jsm",
  {}
);

const { Main_Icon } = Components.utils.import(
  "chrome://inforss/content/toolbar/inforss_Main_Icon.jsm",
  {}
);

const { console } =
  Components.utils.import("resource://gre/modules/Console.jsm", {});

const Inforss_Prefs = Components.classes[
  "@mozilla.org/preferences-service;1"].getService(
  Components.interfaces.nsIPrefService).getBranch('inforss.');

/** Create a headline bar.
 *
 * @class
 *
 * Mainly deals with button events on the headline and selecting which headlines
 * to display based on filters.
 *
 * @param {Mediator} mediator - mediates between parts of the toolbar area
 * @param {Config} config - configuration
 * @param {Object} document - global document object
 * @param {Element} addon_bar - whichever addon bar we are using
 * @param {Feed_Manager} feed_manager - the manager of displayed feeds &c
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

  /* eslint-disable array-bracket-spacing, array-bracket-newline */
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
  /* eslint-enable array-bracket-spacing, array-bracket-newline */
}

Headline_Bar.prototype = {

  /** Reinitialise the headline bar
   *
   * This puts it in the right place on the display
   */
  config_changed()
  {
    this._position_bar();
    this._menu_button.config_changed();
  },

  /** dispose of resources - remove event handlers and so on */
  dispose()
  {
    remove_event_listeners(this._listeners);
  },

  /** Get the id used for the selected configuration
   *
   * @returns {string} An id. Duh.
   */
  _get_desired_id()
  {
    switch (this._config.headline_bar_location)
    {
      case this._config.in_status_bar:
        return this._has_addon_bar ?
          this._addon_bar_name :
          "inforss-bar-bottom";

      case this._config.at_top:
        return "inforss-bar-top";

      default:
      case this._config.at_bottom:
        return "inforss-bar-bottom";
    }
  },

  /** Update the visibility of the various possible headline locations
   *
   * @param {Object} headlines - dom element for the panel
   * @param {boolean} in_toolbar - true if in top/bottom toolbar
   */
  _update_panel(headlines, in_toolbar)
  {
    this._document.getElementById("inforss.resizer").collapsed = in_toolbar;
    const statuspanelNews = this._document.getElementById("inforss-hbox");
    statuspanelNews.flex = in_toolbar ? "1" : "0";
    statuspanelNews.firstChild.flex = in_toolbar ? "1" : "0";
    headlines.flex = in_toolbar ? "1" : "0";
  },

  /** Move the headline bar to the correct place
   *
   * The headline bar can be in 3 places:
   * top: Implemented as a toolbar
   * bottom: implemented as an hbox which is tacked onto the status bar
   * status bar: added into the status bar
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

    if (this._config.headline_bar_location == this._config.in_status_bar &&
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
      if (this._config.headline_bar_location == this._config.at_top)
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
        statusbar.appendChild(headlines);
        const toolbox = this._document.getElementById("navigator-toolbox");
        toolbox.appendChild(statusbar);
      }
      else
      {
        //headlines at the bottom
        //FIXME It'd be nice if this could somehow appear in toolbar menu
        const statusbar = this._document.createElement("hbox");
        statusbar.id = "inforss-bar-bottom";
        statusbar.appendChild(headlines);
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

  /** update bar for a feed by updating the headlines then kicking the display
   *
   * @param {Feed} feed - feed with headlines to update
   *
   * @warning Do not call this unless you know feed is in _observed_feeds
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

  /** Update the displayed headlines for the feed
   *
   * This is where the configured filters are applied to the headlines
   *
   * @param {Feed} feed - feed with headlines to put on the headline bar
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

  /** See if a headline is filtered
   *
   * This deals with the fact that a headline may be from a grouped feed, and
   * therefore have more than one set of filters to match against.
   *
   * @param {Headline} headline - headline to checked
   * @param {integer} num - the number of the headline
   *
   * @returns {boolean} true if headline passes through filters
   */
  _headline_passes_filters(headline, num)
  {
    const selected_feed = this._feed_manager.get_selected_feed();
    let feed = headline.feed;
    if (selected_feed.getType() == "group")
    {
      const policy = selected_feed.getFilterPolicy();
      switch (policy)
      {
        default:
          console.log("Unexpected filter policy", policy, selected_feed);

          /* falls through */
        case "0":
          break;

        case "1": //Use group
          feed = selected_feed;
          break;

        case "2":
          if (! this._match_headline(selected_feed, headline, num))
          {
            return false;
          }
          break;
      }
    }
    return this._match_headline(feed, headline, num);
  },

  /** See if headline matches text filter
   *
   * @static
   *
   * @param {Feed} feed - feed with filter we are using
   * @param {Object} filter - filter.
   * @param {string} text - text to check against filter
   *
   * @returns {boolean} true if headline matches filter
   */
  _check_text_filter(feed, filter, text)
  {
    const regex = new RegExp(filter.getAttribute("text"),
                             feed.getFilterCaseSensitive() ? '' : 'i');
    return filter.getAttribute("include") == "0" ? regex.test(text) :
                                                   ! regex.test(text);
  },

  /** See if headline matches date filter
   *
   * @static
   *
   * @param {Element} filter - filter.
   * @param {Date} date - date to check against filter
   *
   * @returns {boolean} true if headline matches filter
   */
  _check_date_filter(filter, date)
  {
    const age = new Date() - date;
    const delta = this._get_delta(filter, 0);

    const compare = filter.getAttribute("compare");
    switch (compare)
    {
      default:
        console.log("Unexpected date comparison", compare, filter);

        /* falls through */
      case "0":
        return age < delta;

      case "1":
        return age >= delta;

      case "2":
        return delta <= age && age < this._get_delta(filter, 1);
    }
  },

  /** See if headline matches feed filters
   *
   * Note that the feed may be a group feed, not the actual feed of the
   * headline, so we pass bother
   *
   * @param {Feed} feed - feed containing filters
   * @param {Headline} headline - headline to match
   * @param {integer} index - the headline number
   *
   * @returns {boolean} true if headline matches filters
   */
  _match_headline(feed, headline, index)
  {
    const anyall = feed.getFilterMatchStyle();
    let result = anyall == "all";
    let filter_found = false;
    for (const filter of feed.getFilters())
    {
      if (filter.getAttribute("active") == "true")
      {
        let match = false;
        filter_found = true;
        switch (filter.getAttribute("type"))
        {
          default:
            console.log("Unexpected filter policy", filter);

            /* falls through */
          case "0": //headline
            match = this._check_text_filter(feed, filter, headline.title);
            break;

          case "1": //article
            match = this._check_text_filter(feed, filter, headline.description);
            break;

          case "2": //category
            match = this._check_text_filter(feed, filter, headline.category);
            break;

          case "3": //published
            match = this._check_date_filter(filter, headline.publishedDate);
            break;

          case "4": //received
            match = this._check_date_filter(filter, headline.receivedDate);
            break;

          case "5": //read
            if (headline.readDate == null)
            {
              match = true;
            }
            else
            {
              match = this._check_date_filter(filter, headline.readDate);
            }
            break;

          case "6": // headline #
            if (filter.getAttribute("hlcompare") == "0") // less than
            {
              match = index + 1 < eval(filter.getAttribute("nb"));
            }
            else
            {
              if (filter.getAttribute("hlcompare") == "1") // more than
              {
                match = index + 1 > eval(filter.getAttribute("nb");
              }
              else //equals
              {
                match = eval(filter.getAttribute("nb")) == index + 1;
              }
            }
            break;
        }

        if (anyall == "all")
        {
          result = result && match;
        }
        else
        {
          result = result || match;
        }
      }
    }
    return filter_found ? result : true;
  },

  /** get the time delta in milliseconds
   *
   * @param {Object} filter - filter
   * @param {integer} offset - extra offset from elpased time.
   *
   * @returns {integer} milliseconds
   */
  _get_delta(filter, offset)
  {
    const elapse = parseInt(filter.getAttribute("elapse"), 10) + offset;
    const unit = filter.getAttribute("unit");
    switch (unit)
    {
      default:
        console.log("Unexpected filter unit", filter, unit);

        /* falls through */
      case "0": //second
        return elapse * 1000;

      case "1": //minute
        return elapse * 60 * 1000;

      case "2": //hour
        return elapse * 3600 * 1000;

      case "3": //day
        return elapse * 24 * 3600 * 1000;

      case "4": //week
        return elapse * 7 * 24 * 3600 * 1000;

      case "5": //month
        return elapse * 30 * 24 * 3600 * 1000;

      case "6": //year
        return elapse * 365 * 24 * 3600 * 1000;
    }
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

  //-------------------------------------------------------------------------------------------------------------
  getLastDisplayedHeadline()
  {
    var returnValue = null;
    try
    {
      var i = this._observed_feeds.length - 1;
      var find = false;
      while ((i >= 0) && (find == false))
      {
        if (this._observed_feeds[i].displayedHeadlines.length > 0)
        {
          find = true;
          returnValue = this._observed_feeds[i].displayedHeadlines[this._observed_feeds[i].displayedHeadlines.length - 1];
        }
        else
        {
          i--;
        }
      }
    }
    catch (e)
    {
      debug(e);
    }
    return returnValue;
  },

  //-------------------------------------------------------------------------------------------------------------
  publishFeed(feed)
  {
    try
    {
      if (this.locateObservedFeed(feed) == -1)
      {
        this._observed_feeds.push(feed);
        this._update_bar(feed);
      }
    }
    catch (e)
    {
      debug(e);
    }
  },

  //-------------------------------------------------------------------------------------------------------------
  unpublishFeed(feed)
  {
    try
    {
      var index = this.locateObservedFeed(feed);
      if (index != -1)
      {
        this._mediator.removeDisplay(feed); //headline_display
        this._observed_feeds.splice(index, 1);
      }
    }
    catch (e)
    {
      debug(e);
    }
  },

  //-------------------------------------------------------------------------------------------------------------
  locateObservedFeed(feed)
  {
    var find = false;
    try
    {
      var i = 0;
      while ((i < this._observed_feeds.length) && (find == false))
      {
        if (this._observed_feeds[i].getUrl() == feed.getUrl())
        {
          find = true;
        }
        else
        {
          i++;
        }
      }
    }
    catch (e)
    {
      debug(e);
    }
    return ((find) ? i : -1);
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

  /** 'mark all read' button clicked
   *
   * ignored @param {MouseEvent} event - click event
   */
  _mark_all_read(/*event*/)
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

  /** 'previous' button clicked
   *
   * ignored @param {MouseEvent} event - click event
   */
  _select_previous_feed(/*event*/)
  {
    this._feed_manager.select_previous_feed();
  },

  /** 'next' button clicked
   *
   * ignored @param {MouseEvent} event - click event
   */
  _select_next_feed(/*event*/)
  {
    this._feed_manager.select_next_feed();
  },

  /** 'view all headlines' button clicked
   *
   * ignored @param {MouseEvent} event - click event
   */
  _view_all_headlines(/*event*/)
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

  /** manually refresh current feed headlines
   *
   * ignored @param {MouseEvent} event - click event
   */
  _manual_refresh(/*event*/)
  {
    this._feed_manager.manualRefresh();
  },

  /** toggle hiding of old headlines
   *
   * ignored @param {MouseEvent} event - click event
   */
  _toggle_hide_old_headlines(/*event*/)
  {
    this._config.hide_old_headlines = ! this._config.hide_old_headlines;
    this._config.save();
    this.refreshBar();
  },

  /** toggle hiding of viewed headlines
   *
   * ignored @param {MouseEvent} event - click event
   */
  _toggle_hide_viewed_headlines(/*event*/)
  {
    this._config.hide_viewed_headlines = ! this._config.hide_viewed_headlines;
    this._config.save();
    this.refreshBar();
  },

  /** shows the feed home page
   *
   * ignored @param {MouseEvent} event - click event
   */
  _show_feed_home_page(/*feed*/)
  {
    this._feed_manager.goHome();
  },

  //FIXME This shows the number of new headlines even though the text says
  //'old headlines'
  /** Called when the hide old headlines button tooltip is shown
   *
   * Updates the label to show the number of new headlines
   *
   * @param {PopupShowing} event - tooltip about to be shown
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
        value.substring(0, index) + "(" + feed.getNbNew() + ")"
      );
    }
  },

  /** Show the feed currently being processed
   *
   * Remembers feed for the configurable button tooltips and updates
   * the main icon.
   *
   * @param {Feed} feed - feed just selected
   */
  show_selected_feed(feed)
  {
    this._selected_feed = feed;
    this._menu_button.show_selected_feed(feed);
  },

  /** Show that there is data is being fetched for a feed
   *
   * Just hands off to the menu button
   *
   * @param {Feed} feed - feed with activity
   */
  show_feed_activity(feed)
  {
    this._menu_button.show_feed_activity(feed);
  },

  /** Show that there is no data is being fetched for a feed */
  show_no_feed_activity()
  {
    this._menu_button.show_no_feed_activity();
  },

  /** clears the currently selected feed and removes any activity */
  clear_selected_feed()
  {
    this._selected_feed = null;
    this._menu_button.clear_selected_feed();
  },

};
