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
// inforss_Options_Basic
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

//This is all indicative of brokenness
/* eslint-disable strict */
/* eslint-disable-next-line no-use-before-define, no-var */
var inforss = inforss || {}; // jshint ignore:line

Components.utils.import("chrome://inforss/content/modules/inforss_Utils.jsm",
                        inforss);

inforss.basic = {};

Components.utils.import(
  "chrome://inforss/content/windows/Options/Basic/" +
    "inforss_Options_Basic_General.jsm",
  inforss.basic
);

Components.utils.import(
  "chrome://inforss/content/windows/Options/Basic/" +
    "inforss_Options_Basic_Headlines_Area.jsm",
  inforss.basic
);

Components.utils.import(
  "chrome://inforss/content/windows/Options/Basic/" +
    "inforss_Options_Basic_Headlines_Style.jsm",
  inforss.basic
);

/** Contains the code for the 'Basic' tab in the option screen
 *
 * @param {XMLDocument} document - the options window this._document
 * @param {Config} config - current configuration
 * @param {Options} options - main options window for some common code
 */
function inforss_Options_Basic(document, config, options)
{
  this._document = document;
  //this._config = config;
  this._tabs = [];
  /* globals inforss_Options_Basic_Feed_Group */
  this._tabs.push(new inforss_Options_Basic_Feed_Group(document, config, options));
  this._tabs.push(new inforss.basic.General(document, config));
  this._tabs.push(new inforss.basic.Headlines_Area(document, config));
  this._tabs.push(new inforss.basic.Headlines_Style(document, config));
}

inforss.complete_assign(inforss_Options_Basic.prototype, {

  /** Config has been loaded */
  config_loaded()
  {
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
    let index = 0;
    for (const tab of this._tabs)
    {
      if (! tab.validate())
      {
        this._document.getElementById("inforss.listbox1").selectedIndex = index;
        this._document.getElementById("inforssTabpanelsBasic").selectedIndex = index;
        return false;
      }
      index += 1;
    }
    return true;
  },

  /** Update configuration from tab */
  update()
  {
    for (const tab of this._tabs)
    {
      tab.update();
    }
  },

  /** Clean up nicely on window close */
  dispose()
  {
    for (const tab of this._tabs)
    {
      tab.dispose();
    }
  },

  /** Returns the list of deleted feeds
   *
   * @returns {Array<string>} urls of deleted feeds
   */
  get deleted_feeds()
  {
    return this._tabs[0].deleted_feeds;
  },

  /** Clear the list of deleted feeds */
  clear_deleted_feeds()
  {
    this._tabs[0].clear_deleted_feeds();
  },


});
