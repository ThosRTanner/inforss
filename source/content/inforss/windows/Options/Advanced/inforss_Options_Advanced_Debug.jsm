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
// inforss_Options_Advanced_Debug
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------
/* jshint globalstrict: true */
/* eslint-disable strict */
"use strict";

/* eslint-disable array-bracket-newline */
/* exported EXPORTED_SYMBOLS */
const EXPORTED_SYMBOLS = [
  "Debug", /* exported Debug */
];
/* eslint-enable array-bracket-newline */

const { Base } = Components.utils.import(
  "chrome://inforss/content/windows/Options/" +
    "inforss_Options_Base.jsm",
    {}
);

/** Contains the code for the 'Basic' tab in the option screen
 *
 * @param {XMLDocument} document - the options window this._document
 * @param {Config} config - current configuration
 * @param {Options} options - main options window control
 */
function Debug(document, config, options)
{
  Base.call(this, document, config, options);
}

Debug.prototype = Object.create(Base.prototype);
Debug.prototype.constructor = Debug;

Object.assign(Debug.prototype, {

  /** Config has been loaded */
  config_loaded()
  {
    //This is sort of dubious as this gets populated both in about:config and
    //stored in the xml.
    this._document.getElementById("debug").selectedIndex =
      this._config.debug_display_popup ? 0 : 1;
    this._document.getElementById("statusbar").selectedIndex =
      this._config.debug_to_status_bar ? 0 : 1;
    this._document.getElementById("log").selectedIndex =
      this._config.debug_to_browser_log ? 0 : 1;
  },

  /** Update configuration from tab */
  update()
  {
    this._config.debug_display_popup =
      this._document.getElementById('debug').selectedIndex == 0;
    this._config.debug_to_status_bar =
      this._document.getElementById('statusbar').selectedIndex == 0;
    this._config.debug_to_browser_log =
      this._document.getElementById('log').selectedIndex == 0;
  },

});
