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
// inforss_Options_Advanced_Main_Menu
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------
/* jshint globalstrict: true */
/* eslint-disable strict */
"use strict";

/* eslint-disable array-bracket-newline */
/* exported EXPORTED_SYMBOLS */
const EXPORTED_SYMBOLS = [
  "Main_Menu", /* exported Main_Menu */
];
/* eslint-enable array-bracket-newline */

/** Contains the code for the 'Basic' tab in the option screen
 *
 * @param {XMLDocument} document - the options window this._document
 * @param {Config} config - current configuration
 */
function Main_Menu(document, config)
{
  this._document = document;
  this._config = config;
}

Main_Menu.prototype = {

  /** Config has been loaded */
  config_loaded()
  {
    //Include feeds from current page
    this._document.getElementById("currentfeed").selectedIndex =
      this._config.menu_includes_page_feeds ? 0 : 1;

    //Include feeds from bookmarks
    this._document.getElementById("livemark").selectedIndex =
      this._config.menu_includes_livemarks ? 0 : 1;

    //Include clipboard content
    this._document.getElementById("clipboard").selectedIndex =
      this._config.menu_includes_clipboard ? 0 : 1;

    //Sorted titles
    {
      const sorting = this._config.menu_sorting_style;
      this._document.getElementById("sortedMenu").selectedIndex =
        sorting == "no" ? 0 : sorting == "asc" ? 1 : 2;
    }

    //Include feeds which are in groups
    this._document.getElementById("includeAssociated").selectedIndex =
      this._config.menu_show_feeds_from_groups ? 0 : 1;

    //Display feed headlines in submenu
    this._document.getElementById("submenu").selectedIndex =
      this._config.menu_show_headlines_in_submenu ? 0 : 1;

    //-------------------------Icon box

    //Show current group/feed in main icon
    this._document.getElementById("synchronizeIcon").selectedIndex =
      this._config.icon_shows_current_feed ? 0 : 1;

    //Flash icon
    this._document.getElementById("flashingIcon").selectedIndex =
      this._config.icon_flashes_on_activity ? 0 : 1;
  },

  /** Validate contents of tab
   *
   * ignored @param {RSS} current_feed - config of currently selected feed
   *
   * @returns {boolean} true if no invalid filters (i.e. empty text fields)
   */
  validate(/*current_feed*/)
  {
    return true;
  },

  /** Update configuration from tab */
  update()
  {
    this._config.menu_includes_page_feeds =
      this._document.getElementById('currentfeed').selectedIndex == 0;

    this._config.menu_includes_livemarks =
      this._document.getElementById('livemark').selectedIndex == 0;

    this._config.menu_includes_clipboard =
      this._document.getElementById('clipboard').selectedIndex == 0;

    this._config.menu_sorting_style =
      /* eslint-disable indent */
      this._document.getElementById('sortedMenu').selectedIndex == 0 ? "no" :
      this._document.getElementById('sortedMenu').selectedIndex == 1 ? "asc" :
                                                                       "des";
      /* eslint-enable indent */

    this._config.menu_show_feeds_from_groups =
      this._document.getElementById('includeAssociated').selectedIndex == 0;

    this._config.menu_show_headlines_in_submenu =
      this._document.getElementById('submenu').selectedIndex == 0;

    this._config.icon_shows_current_feed =
      this._document.getElementById('synchronizeIcon').selectedIndex == 0;

    this._config.icon_flashes_on_activity =
      this._document.getElementById('flashingIcon').selectedIndex == 0;
  },

  /** Clean up nicely on window close */
  dispose()
  {
    //Nothing to do here.
  },

};
