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

/* eslint-disable strict */

/* eslint-disable-next-line no-use-before-define, no-var */
var inforss = inforss || {}; // jshint ignore:line

Components.utils.import(
  "chrome://inforss/content/windows/Options/" +
    "inforss_Options_Base.jsm",
  inforss
);

const opts_advanced = {};

/*const { Debug } = */Components.utils.import(
  "chrome://inforss/content/windows/Options/Advanced/" +
    "inforss_Options_Advanced_Debug.jsm",
  opts_advanced
);

/*const { Default_Values } = */Components.utils.import(
  "chrome://inforss/content/windows/Options/Advanced/" +
    "inforss_Options_Advanced_Default_Values.jsm",
  opts_advanced
);

/*const { Main_Menu } = */Components.utils.import(
  "chrome://inforss/content/windows/Options/Advanced/" +
    "inforss_Options_Advanced_Main_Menu.jsm",
  opts_advanced
);

/*const { Report } = */Components.utils.import(
  "chrome://inforss/content/windows/Options/Advanced/" +
    "inforss_Options_Advanced_Report.jsm",
  opts_advanced
);

/*

const { Repository } = Components.utils.import(
  "chrome://inforss/content/windows/Options/Advanced/" +
    "inforss_Options_Advanced_Repository.jsm",
  {}
);
*/


/*const { Synchronisation } = */Components.utils.import(
  "chrome://inforss/content/windows/Options/Advanced/" +
    "inforss_Options_Advanced_Synchronisation.jsm",
  opts_advanced
);

/** Class for advanced tabe, which mediates between the tabs it controls
 *
 * @param {XMLDocument} document - the options window document
 * @param {Options} options - main options window for some common code
 */
function inforss_Options_Advanced(document, options)
{
  inforss.Base.call(this, document, options);

  this._tabs = [
    new opts_advanced.Default_Values(document, options),
    new opts_advanced.Main_Menu(document, options),
    /* jshint -W055 */
    /* eslint-disable new-cap */
    /* global inforss_Options_Advanced_Repository */
    new inforss_Options_Advanced_Repository(document, options),
    /* eslint-enable new-cap */
    /* jshint +W055 */
    new opts_advanced.Synchronisation(document, options),
    new opts_advanced.Report(document, options),
    new opts_advanced.Debug(document, options),
  ];
}

inforss_Options_Advanced.prototype = Object.create(inforss.Base.prototype);
inforss_Options_Advanced.prototype.constructor = inforss_Options_Advanced;

Object.assign(inforss_Options_Advanced.prototype, {

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

  /** New current feed has been selected */
  new_current_feed()
  {
    this._tabs[0].new_current_feed();
  },

  /** Called when activate button is clicked on feed report */
  update_report()
  {
    this._tabs[4].update_report();
  },

});
