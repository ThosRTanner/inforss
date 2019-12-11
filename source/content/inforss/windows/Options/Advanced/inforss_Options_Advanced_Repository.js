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
// inforss_Options_Advanced_Repository.js
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------

/* exported inforss_Options_Advanced_Repository */

/* eslint-disable array-bracket-newline */
/* exported EXPORTED_SYMBOLS */
//const EXPORTED_SYMBOLS = [
//  "Filter", /* exported Filter */
//];
/* eslint-enable array-bracket-newline */

//Switch off a lot of eslint warnings for now
/* eslint-disable strict, no-empty-function */

//This is all indicative of brokenness

/* eslint-disable-next-line no-use-before-define, no-var */
var inforss = inforss || {}; // jshint ignore:line

Components.utils.import("chrome://inforss/content/modules/inforss_Utils.jsm",
                        inforss);

Components.utils.import("chrome://inforss/content/modules/inforss_Prompt.jsm",
                        inforss);

Components.utils.import("chrome://inforss/content/modules/inforss_Version.jsm",
                        inforss);

/** Contains the code for the 'Basic' tab in the option screen
 *
 * @param {XMLDocument} document - the options window this._document
 * @param {Config} config - current configuration
 */
function inforss_Options_Advanced_Repository(document, config)
{
  this._document = document;
  this._config = config;

  /*
  this._listeners = inforss.add_event_listeners(
    this,
    this._document,
    [ "make.current", "command", this._make_current ],
    [ "remove", "command", this._remove_feed ]
  );
  */
}

inforss_Options_Advanced_Repository.prototype = {

  /** Config has been loaded */
  config_loaded()
  {
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
  },

  /** Clean up nicely on window close */
  dispose()
  {
    //inforss.remove_event_listeners(this._listeners);
  },

};
