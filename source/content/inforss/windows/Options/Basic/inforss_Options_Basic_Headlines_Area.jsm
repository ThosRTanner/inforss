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
// inforss_Options_Basic_Headlines_Area
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------

/* jshint globalstrict: true */
/* eslint-disable strict */
"use strict";

/* eslint-disable array-bracket-newline */
/* exported EXPORTED_SYMBOLS */
const EXPORTED_SYMBOLS = [
  "Headlines_Area", /* exported Headlines_Area */
];
/* eslint-enable array-bracket-newline */

const { Base } = Components.utils.import(
  "chrome://inforss/content/windows/Options/inforss_Options_Base.jsm",
  {}
);

/** Contains the code for the 'Basic' tab in the option screen
 *
 * @param {XMLDocument} document - the options window this._document
 * @param {Config} config - current configuration
 * @param {Options} options - main options window for some common code
 */
function Headlines_Area(document, config, options)
{
  Base.call(this, document, config, options);
}

const Super = Base.prototype;
Headlines_Area.prototype = Object.create(Super);
Headlines_Area.prototype.constructor = Headlines_Area;

Object.assign(Headlines_Area.prototype, {

  /** Config has been loaded
   *
   * @param {Config} config - new config
   */
  config_loaded(config)
  {
    Super.config_loaded.call(this, config);

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

  /** Update configuration from tab */
  update()
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
      this._document.getElementById("scrollingdirection").selectedIndex == 0 ?
        "rtl" : "ltr";

    //cycling section
    this._config.headline_bar_cycle_feeds =
      this._document.getElementById("cycling").selectedIndex == 0;
    this._config.headline_bar_cycle_interval =
      this._document.getElementById("cyclingDelay1").value;
    this._config.headline_bar_cycle_type =
      this._document.getElementById("nextFeed").selectedIndex == 0 ?
        "next" : "random";
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

});
