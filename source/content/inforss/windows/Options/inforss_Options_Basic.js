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
 *   Tom Tanner
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
// inforss_Options_Basic.js
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------

/* exported inforss_Options_Basic */

/* eslint-disable array-bracket-newline */
/* exported EXPORTED_SYMBOLS */
//const EXPORTED_SYMBOLS = [
//  "inforss_Options_Basic", /* exported inforss_Options_Basic */
//];
/* eslint-enable array-bracket-newline */

/* eslint-disable strict, no-empty-function */

//FIXME New Feed, New Group  make current buttons and remove all belong in
// basic/feed-group
//as well as the general, filter and settings subtabs (all from feed/group)
//also needs breaking up into each sub tab

//FIXME Gerriv this
/* globals currentRSS */

var inforss = inforss || {};

Components.utils.import("chrome://inforss/content/modules/inforss_Utils.jsm",
                        inforss);


/** Contains the code for the 'Basic' tab in the option screen
 *
 * @param {XMLDocument} document - the options window this._document
 * @param {Config} config - current configuration
 */
function inforss_Options_Basic(document, config)
{
  this._document = document;
  this._config = config;
  this._tabs = [];
  this._Basic__Feed_Group__construct();
  this._Basic__General__construct();
  this._Basic__Headlines_area__construct();
  /* globals inforss_Options_Basic_Headlines_Style */
  this._tabs.push(new inforss_Options_Basic_Headlines_Style(document, config));
}

inforss_Options_Basic.prototype = {

  /** Config has been loaded */
  config_loaded()
  {
    this._Basic__Feed_Group__config_loaded();
    this._Basic__General__config_loaded();
    this._Basic__Headlines_area__config_loaded();
    for (const tab of this._tabs)
    {
      tab.config_loaded();
    }
  },

  /** Validate contents of tab
   *
   * @returns {boolean} true if all tabs validate
   */
  validate()
  {
    /*
    if (! this._Basic__Feed_Group__validate())
    {
      return false;
    }
    if (! this._Basic__General__validate())
    {
      return false;
    }
    if (! this._Basic__Headlines_area__validate())
    {
      return false;
    }
    */
    for (const tab of this._tabs)
    {
      if (! tab.validate())
      {
        return false;
      }
    }
    return true;
  },

  /** Update configuration from tab */
  update()
  {
    this._Basic__Feed_Group__update(); //there is stuff to update here, somehow
    this._Basic__General__update();
    this._Basic__Headlines_area__update();
    for (const tab of this._tabs)
    {
      tab.update();
    }
  },

  /** Clean up nicely on window close */
  dispose()
  {
    this._Basic__Feed_Group__dispose();
    this._Basic__General__dispose();
    this._Basic__Headlines_area__dispose();
    for (const tab of this._tabs)
    {
      tab.dispose();
    }
  },


  //----------------------------------------------------------------------------
  //Basic Feed_Group tab
  //----------------------------------------------------------------------------
  /** Set up all the button actions */
  _Basic__Feed_Group__construct()
  {
    /* eslint-disable array-bracket-newline */
    this._bfg_listeners = inforss.add_event_listeners(
      this,
      this._document,
      //[ box, "DOMMouseScroll", this._mouse_scroll ], //FIXME use the wheel event?
      //[ box, "mouseover", this._pause_scrolling ],
      //[ box, "mouseout", this._resume_scrolling ],
      //[ box, "dragover", this._on_drag_over ],
      //[ box, "drop", this._on_drop ],
      [ "make.current", "click", this._Basic__Feed_Group__make_current ]
      //[ "icon.shuffle", "click", this._switch_shuffle_style ],
      //[ "icon.direction", "click", this._switch_scroll_direction ],
      //[ "icon.scrolling", "click", this._toggle_scrolling ],
      //[ "icon.filter", "click", this._quick_filter ],
      //[ document.defaultView, "resize", this._resize_window ]
    );
    /* eslint-enable array-bracket-newline */

    //feed group popup
    //feed group arrows
    //new feed button
    //new group button
    //make current button

    //->> general tab
    //->> filter tab
    //->> settings tab
  },

  _Basic__Feed_Group__config_loaded()
  {
    const selected_feed = this._Basic__Feed_Group__General__config_loaded();
    this._Basic__Feed_Group__Filter__config_loaded();
    this._Basic__Feed_Group__Settings__config_loaded();
    //FIXME This should be called elsewhere I think and then go through
    //'display' functions throughout
    if (selected_feed != null)
    {
      //selectRSS1(selected_feed.getAttribute("url"), selected_feed.getAttribute("user"));
    }
  },

  //Build the popup menu
  _Basic__Feed_Group__General__config_loaded()
  {
    //It appears that because xul has already got its fingers on this, we can't
    //dynamically replace
    //This is the list of feeds in a group displayed when a group is selectd
    {
      let list2 = this._document.getElementById("group-list-rss");
      let listcols = list2.firstChild;
      inforss.remove_all_children(list2);
      list2.appendChild(listcols);
    }

    //If we don't do this here, it seems to screw stuff up for the 1st group.
    for (const feed of this._config.get_feeds())
    {
      add_feed_to_group_list(feed);
    }

    //Now we build the selection menu under basic: feed/group

    const menu = this._document.getElementById("rss-select-menu");
    menu.removeAllItems();

    {
      const selectFolder = this._document.createElement("menupopup");
      selectFolder.setAttribute("id", "rss-select-folder");
      menu.appendChild(selectFolder);
    }

    var selected_feed = null;

    //Create the menu from the sorted list of feeds
    let i = 0;
    const feeds = Array.from(this._config.get_all()).sort((a, b) =>
      a.getAttribute("title").toLowerCase() > b.getAttribute("title").toLowerCase());

    for (const feed of feeds)
    {
      const element = menu.appendItem(feed.getAttribute("title"), "rss_" + i);

      element.setAttribute("class", "menuitem-iconic");
      element.setAttribute("image", feed.getAttribute("icon"));

      element.setAttribute("url", feed.getAttribute("url"));

      if (feed.hasAttribute("user"))
      {
        element.setAttribute("user", feed.getAttribute("user"));
      }

      if ('arguments' in window)
      {
        if (feed.getAttribute("url") == window.arguments[0].getAttribute("url"))
        {
          selected_feed = element;
          menu.selectedIndex = i;
        }
      }
      else
      {
        if (feed.getAttribute("selected") == "true")
        {
          selected_feed = element;
          menu.selectedIndex = i;
        }
      }
      i += 1;
    }
    return selected_feed;
  },

  _Basic__Feed_Group__Filter__config_loaded()
  {
    //This shouldn't be necessary - if this was split up into classes, we would
    //do this bit in the constructor of the class
    //The __config_loaded function is called whenever config gets reloaded
    this._document.getElementById("rss.filter.number").removeAllItems();
    //this._document.getElementById("rss.filter.hlNumber").removeAllItems();
    //FIXME this (rss.filter.number.1) is used in reset filter and i'm not sure
    //what it does
    const numbers = this._document.createElement("menupopup");
    numbers.setAttribute("id", "rss.filter.number.1");
    const menu99 = this._document.getElementById("rss.filter.number");
    const headline_numbers = this._document.getElementById("rss.filter.hlnumber");
    menu99.appendChild(numbers);
    for (let number = 0; number < 100; number += 1)
    {
      menu99.appendItem(number, number);
      if (number < 51)
      {
        headline_numbers.appendItem(number, number);
      }
    }
  },

  _Basic__Feed_Group__Settings__config_loaded()
  {
  },

  _Basic__Feed_Group__update()
  {
  },

  _Basic__Feed_Group__dispose()
  {
    inforss.remove_event_listeners(this._bfg_listeners);
  },

  //------------------------------------------------------------------------------
  //This is the code for the 'make current' button in the basic feed/group page
  //Why doesn't this set currentRSS (which is a global)
  _Basic__Feed_Group__make_current(event)
  {
/**/console.log(event)
    for (const item of this._config.get_all())
    {
      item.setAttribute("selected", item == currentRSS);
    }
    if (currentRSS != null)
    {
      this._document.getElementById("inforss.make.current").setAttribute("disabled", "true");
      //wtf is this for?
      this._document.getElementById("inforss.make.current.background").style.backgroundColor = "rgb(192,255,192)";
    }
  },


  //----------------------------------------------------------------------------
  //General tab
  //----------------------------------------------------------------------------

  _Basic__General__construct()
  {
  },

  _Basic__General__config_loaded()
  {
    //----------InfoRSS activity box---------
    this._document.getElementById("activity").selectedIndex =
      this._config.headline_bar_enabled ? 0 : 1;

    //----------General box---------

    //Hide viewed headlines
    this._document.getElementById("hideViewed").selectedIndex =
      this._config.hide_viewed_headlines ? 0 : 1;

    //Hide old headlines
    this._document.getElementById("hideOld").selectedIndex =
      this._config.hide_old_headlines ? 0 : 1;

    //use local history to hide headlines
    this._document.getElementById("hideHistory").selectedIndex =
      this._config.remember_headlines ? 0 : 1;

    //popup message on new headline
    this._document.getElementById("popupMessage").selectedIndex =
      this._config.show_toast_on_new_headline ? 0 : 1;

    //play sound on new headline
    this._document.getElementById("playSound").selectedIndex =
      this._config.play_sound_on_new_headline ? 0 : 1;

    //tooltip on headline
    {
      const tooltip = this._config.headline_tooltip_style;
      this._document.getElementById("tooltip").selectedIndex =
        tooltip == "description" ? 0 :
        tooltip == "title" ? 1 :
        tooltip == "allInfo" ? 2 : 3;
    }

    //display full article
    this._document.getElementById("clickHeadline").selectedIndex =
      this._config.headline_action_on_click;

    //cpu utilisation timeslice
    this._document.getElementById("timeslice").value =
      this._config.headline_processing_backoff;
  },

  _Basic__General__update()
  {
    //----------InfoRSS activity box---------
    this._config.headline_bar_enabled =
      this._document.getElementById("activity").selectedIndex == 0;

    //----------General box---------

    //Hide viewed headlines
    this._config.hide_viewed_headlines =
      this._document.getElementById("hideViewed").selectedIndex == 0;

    //Hide old headlines
    this._config.hide_old_headlines =
      this._document.getElementById("hideOld").selectedIndex == 0;

    //use local history to hide headlines
    this._config.remember_headlines =
      this._document.getElementById("hideHistory").selectedIndex == 0;

    //popup message on new headline
    this._config.show_toast_on_new_headline =
      this._document.getElementById("popupMessage").selectedIndex == 0;

    //play sound on new headline
    this._config.play_sound_on_new_headline =
      this._document.getElementById("playSound").selectedIndex == 0;

    //tooltip on headline
    this._config.headline_tooltip_style =
      this._document.getElementById('tooltip').selectedIndex == 0 ? "description" :
      this._document.getElementById('tooltip').selectedIndex == 1 ? "title" :
      this._document.getElementById('tooltip').selectedIndex == 2 ? "allInfo" : "article";

    //display full article
    this._config.headline_action_on_click =
      this._document.getElementById("clickHeadline").selectedIndex;

    //cpu utilisation timeslice
    this._config.headline_processing_backoff =
      this._document.getElementById("timeslice").value;

  },

  _Basic__General__dispose()
  {
  },

//----------------------------------------------------------------------------
  //Headlines area tab
  //----------------------------------------------------------------------------
  _Basic__Headlines_area__construct()
  {
  },

  _Basic__Headlines_area__config_loaded()
  {
    //----------Headlines Area---------
    //location
    this._document.getElementById("linePosition").selectedIndex =
      this._config.headline_bar_location;
    //collapse if no headline
    this._document.getElementById("collapseBar").selectedIndex =
      this._config.headline_bar_collapsed ? 0 : 1;
    //mousewheel scrolling
    this._document.getElementById("mouseWheelScroll").selectedIndex =
      this._config.headline_bar_mousewheel_scroll;
    //scrolling headlines
    //can be 0 (none), 1 (scroll), 2 (fade)
    this._document.getElementById("scrolling").selectedIndex =
      this._config.headline_bar_scroll_style;
    //  speed
    this._document.getElementById("scrollingspeed1").value =
      this._config.headline_bar_scroll_speed;
    //  increment
    this._document.getElementById("scrollingIncrement1").value =
      this._config.headline_bar_scroll_increment;
    //  stop scrolling when over headline
    this._document.getElementById("stopscrolling").selectedIndex =
      this._config.headline_bar_stop_on_mouseover ? 0 : 1;
    //  direction
    this._document.getElementById("scrollingdirection").selectedIndex =
      this._config.headline_bar_scrolling_direction == "rtl" ? 0 : 1;
    //Cycling feed/group
    this._document.getElementById("cycling").selectedIndex =
      this._config.headline_bar_cycle_feeds ? 0 : 1;
    //  Cycling delay
    this._document.getElementById("cyclingDelay1").value =
      this._config.headline_bar_cycle_interval;
    //  Next feed/group
    this._document.getElementById("nextFeed").selectedIndex =
      this._config.headline_bar_cycle_type == "next" ? 0 : 1;
    //  Cycling within group
    this._document.getElementById("cycleWithinGroup").selectedIndex =
      this._config.headline_bar_cycle_in_group ? 0 : 1;

    //----------Icons in the headline bar---------
    this._document.getElementById("readAllIcon").checked =
      this._config.headline_bar_show_mark_all_as_read_button;
    this._document.getElementById("previousIcon").checked =
      this._config.headline_bar_show_previous_feed_button;
    this._document.getElementById("pauseIcon").checked =
      this._config.headline_bar_show_pause_toggle;
    this._document.getElementById("nextIcon").checked =
      this._config.headline_bar_show_next_feed_button;
    this._document.getElementById("viewAllIcon").checked =
      this._config.headline_bar_show_view_all_button;
    this._document.getElementById("refreshIcon").checked =
      this._config.headline_bar_show_manual_refresh_button;
    this._document.getElementById("hideOldIcon").checked =
      this._config.headline_bar_show_hide_old_headlines_toggle;
    this._document.getElementById("hideViewedIcon").checked =
      this._config.headline_bar_show_hide_viewed_headlines_toggle;
    this._document.getElementById("shuffleIcon").checked =
      this._config.headline_bar_show_shuffle_toggle;
    this._document.getElementById("directionIcon").checked =
      this._config.headline_bar_show_direction_toggle;
    this._document.getElementById("scrollingIcon").checked =
      this._config.headline_bar_show_scrolling_toggle;
    this._document.getElementById("filterIcon").checked =
      this._config.headline_bar_show_quick_filter_button;
    this._document.getElementById("homeIcon").checked =
      this._config.headline_bar_show_home_button;
  },

  _Basic__Headlines_area__update()
  {

    this._config.headline_bar_location =
      this._document.getElementById("linePosition").selectedIndex;
    //collapse if no headline
    this._config.headline_bar_collapsed =
      this._document.getElementById("collapseBar").selectedIndex == 0;
    this._config.headline_bar_mousewheel_scroll =
      this._document.getElementById("mouseWheelScroll").selectedIndex;

    //scrolling section
    this._config.headline_bar_scroll_style =
      this._document.getElementById("scrolling").selectedIndex;
    this._config.headline_bar_scroll_speed =
      this._document.getElementById("scrollingspeed1").value;
    this._config.headline_bar_scroll_increment =
      this._document.getElementById("scrollingIncrement1").value;
    this._config.headline_bar_stop_on_mouseover =
      this._document.getElementById("stopscrolling").selectedIndex == 0;
    //  direction - FIXME This could be done better
    this._config.headline_bar_scrolling_direction =
      this._document.getElementById("scrollingdirection").selectedIndex == 0 ? "rtl" : "ltr";

    //cycling section
    this._config.headline_bar_cycle_feeds =
      this._document.getElementById("cycling").selectedIndex == 0;
    this._config.headline_bar_cycle_interval =
      this._document.getElementById("cyclingDelay1").value;
    this._config.headline_bar_cycle_type =
      this._document.getElementById("nextFeed").selectedIndex == 0 ? "next" : "random";
    this._config.headline_bar_cycle_in_group =
      this._document.getElementById("cycleWithinGroup").selectedIndex == 0;

    //Icons in the headline bar
    this._config.headline_bar_show_mark_all_as_read_button =
      this._document.getElementById("readAllIcon").checked;
    this._config.headline_bar_show_previous_feed_button =
      this._document.getElementById("previousIcon").checked;
    this._config.headline_bar_show_pause_toggle =
      this._document.getElementById("pauseIcon").checked;
    this._config.headline_bar_show_next_feed_button =
      this._document.getElementById("nextIcon").checked;
    this._config.headline_bar_show_view_all_button =
      this._document.getElementById("viewAllIcon").checked;
    this._config.headline_bar_show_manual_refresh_button =
      this._document.getElementById("refreshIcon").checked;
    this._config.headline_bar_show_hide_old_headlines_toggle =
      this._document.getElementById("hideOldIcon").checked;
    this._config.headline_bar_show_hide_viewed_headlines_toggle =
      this._document.getElementById("hideViewedIcon").checked;
    this._config.headline_bar_show_shuffle_toggle =
      this._document.getElementById("shuffleIcon").checked;
    this._config.headline_bar_show_direction_toggle =
      this._document.getElementById("directionIcon").checked;
    this._config.headline_bar_show_scrolling_toggle =
      this._document.getElementById("scrollingIcon").checked;
    this._config.headline_bar_show_quick_filter_button =
      this._document.getElementById("filterIcon").checked;
    this._config.headline_bar_show_home_button =
      this._document.getElementById("homeIcon").checked;
  },

  _Basic__Headlines_area__dispose()
  {
  },

};
//------------------------------------------------------------------------------
// Adds a feed to the 'feed in group' list
/* exported add_feed_to_group_list */
function add_feed_to_group_list(feed)
{
  const listitem = this._document.createElement("listitem");

  {
    const listcell = this._document.createElement("listcell");
    listcell.setAttribute("type", "checkbox");
    //Why do we need to do this at all? it's a check box..
    listcell.addEventListener(
      "click",
      event =>
      {
        const lc = event.currentTarget;
        if (lc.getAttribute("checked") == "false")
        {
          lc.setAttribute("checked", "true");
        }
        else
        {
          lc.setAttribute("checked", "false");
        }
      },
      false);
    listitem.appendChild(listcell);
  }

  {
    //why can't javascript let me make this const
    const listcell = this._document.createElement("listcell");
    listcell.setAttribute("class", "listcell-iconic");
    listcell.setAttribute("image", feed.getAttribute("icon"));
    listcell.setAttribute("value", feed.getAttribute("title"));
    listcell.setAttribute("label", feed.getAttribute("title"));
    listcell.setAttribute("url", feed.getAttribute("url"));
    listitem.appendChild(listcell);
  }

  listitem.setAttribute("allowevents", "true");

  //Insert into list in alphabetical order
  const listbox = this._document.getElementById("group-list-rss");
  const title = feed.getAttribute("title").toLowerCase();
  for (const item of listbox.childNodes)
  {
    if (title <= item.childNodes[1].getAttribute("value").toLowerCase())
    {
      listbox.insertBefore(listitem, item);
      return;
    }
  }
  listbox.insertBefore(listitem, null);
}
