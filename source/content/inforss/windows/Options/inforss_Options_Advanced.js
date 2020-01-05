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
// inforss_Options_Advanced
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------

/* exported inforss_Options_Advanced */

/* eslint-disable array-bracket-newline */
/* exported EXPORTED_SYMBOLS */
//const EXPORTED_SYMBOLS = [
//  "Advanced", /* exported Advanced */
//];
/* eslint-enable array-bracket-newline */

/* eslint-disable strict, no-empty-function */

/** Class for advanced tabe, which mediates between the tabs it controls
 *
 * @param {XMLDocument} document - the options window document
 * @param {Config} config - current configuration
 * @param {Options} options - main options window for some common code
 */
function inforss_Options_Advanced(document, config, options)
{
  this._document = document;
  this._tabs = [
    /* jshint -W055 */
    /* eslint-disable new-cap */
    /* global inforss_Options_Advanced_Default_Values */
    new inforss_Options_Advanced_Default_Values(document, config, options),
    /* global inforss_Options_Advanced_Main_Menu */
    new inforss_Options_Advanced_Main_Menu(document, config, options),
    /* global inforss_Options_Advanced_Repository */
    new inforss_Options_Advanced_Repository(document, config, options),
    /* global inforss_Options_Advanced_Synchronisation */
    new inforss_Options_Advanced_Synchronisation(document, config, options),
    /* global inforss_Options_Advanced_Report */
    new inforss_Options_Advanced_Report(document, config, options),
    /* global inforss_Options_Advanced_Debug */
    new inforss_Options_Advanced_Debug(document, config, options),
    /* eslint-enable new-cap */
    /* jshint +W055 */
  ];
}

inforss_Options_Advanced.prototype = {

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
        this._document.getElementById("inforss.listbox2").selectedIndex = index;
        this._document.getElementById("inforssTabpanelsAdvance").selectedIndex =
          index;
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

};
