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
// inforss_Options_Base
// Author : Tom Tanner 2020
// Inforss extension
//------------------------------------------------------------------------------

/* jshint globalstrict: true */
/* eslint-disable strict */
"use strict";

/* eslint-disable array-bracket-newline */
/* exported EXPORTED_SYMBOLS */
const EXPORTED_SYMBOLS = [
  "Base", /* exported Base */
];
/* eslint-enable array-bracket-newline */

const { remove_event_listeners } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Utils.jsm",
  {}
);

//const { console } =
//  Components.utils.import("resource://gre/modules/Console.jsm", {});

/** Base class for all options tabs.
 *
 * This contains a lot of boilerplate code for operations common to all tabs,
 * and propogates common events to each child tab.
 *
 * @param {XMLDocument} document - the options window document
 * @param {Options} options - main options window for some common code
 */
function Base(document, options)
{
  this._document = document;
  this._options = options;
  this._config = null;
  this._listeners = null;
  this._tabs = [];
}

Base.prototype = {

  /** Config has been loaded
   *
   * @param {Config} config - new config
   */
  config_loaded(config)
  {
    this._config = config;
    for (const tab of this._tabs)
    {
      tab.config_loaded(config);
    }
  },

  /** Validate contents of tab
   *
   * @returns {boolean} true if all the child tabs validate.
   */
  validate()
  {
    for (const tab of this._tabs)
    {
      if (! tab.validate())
      {
        return false;
      }
    }
    return true;
  },

  /** Update configuration from tab
   *
   * @param {Array} args - optional arguments just passed on
   */
  update(...args)
  {
    for (const tab of this._tabs)
    {
      tab.update(...args);
    }
  },

  /** Clean up nicely on window close */
  dispose()
  {
    for (const tab of this._tabs)
    {
      tab.dispose();
    }
    if (this._listeners != null)
    {
      remove_event_listeners(this._listeners);
    }
  },

  /** New feed has been added
   *
   * @param {RSS} feed_config - config of added feed
   */
  add_feed(feed_config)
  {
    for (const tab of this._tabs)
    {
      tab.add_feed(feed_config);
    }
  },

  /** Feed has been removed
   *
   * @param {string} url - url of removed feed
   */
  remove_feed(url)
  {
    for (const tab of this._tabs)
    {
      tab.remove_feed(url);
    }
  },

  /** Update the toggle state for a feed
   *
   * @param {RSS} feed - feed that has changed
   */
  feed_active_state_changed(feed)
  {
    for (const tab of this._tabs)
    {
      tab.feed_active_state_changed(feed);
    }
  },

  /** Called when tab is selected
   *
   * This is (currently) just a placeholder as the current/next tab selection
   * depends a lot on where you are in the menu structure.
   */
  select()
  {
    //Placeholder!
    //Should pick the currently selected tab and call select on it.
  },
};
