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

/* exported inforss_Options_Basic_General */

/* eslint-disable array-bracket-newline */
/* exported EXPORTED_SYMBOLS */
//const EXPORTED_SYMBOLS = [
//  "inforss_Options_Basic_General", /* exported inforss_Options_Basic_General */
//];
/* eslint-enable array-bracket-newline */

/* eslint-disable strict, no-empty-function */

var inforss = inforss || {};

Components.utils.import("chrome://inforss/content/modules/inforss_Utils.jsm",
                        inforss);

/** Contains the code for the 'Basic' tab in the option screen
 *
 * @param {XMLDocument} document - the options window this._document
 * @param {Config} config - current configuration
 */
function inforss_Options_Basic_General(document, config)
{
  this._document = document;
  this._config = config;
}

inforss_Options_Basic_General.prototype = {

  /** Config has been loaded */
  config_loaded()
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

  /** Validate contents of tab
   *
   * @returns {boolean} true as there's nothing here to validate
   */
  validate()
  {
    return true;
  },

  /** Update configuration from tab */
  update()
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
      this._document.getElementById('tooltip').selectedIndex == 0 ?
        "description" :
        this._document.getElementById('tooltip').selectedIndex == 1 ?
          "title" :
          this._document.getElementById('tooltip').selectedIndex == 2 ?
            "allInfo" : "article";

    //display full article
    this._config.headline_action_on_click =
      this._document.getElementById("clickHeadline").selectedIndex;

    //cpu utilisation timeslice
    this._config.headline_processing_backoff =
      this._document.getElementById("timeslice").value;
  },

  /** Clean up nicely on window close */
  dispose()
  {
  },

};
