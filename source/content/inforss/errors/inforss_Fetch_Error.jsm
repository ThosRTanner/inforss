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
// inforss_Fetch_Error
// Author : Tom Tanner, 2019
// Inforss extension
//------------------------------------------------------------------------------

/* jshint globalstrict: true */
/* eslint-disable strict */
"use strict";

/* exported EXPORTED_SYMBOLS */
/* eslint-disable array-bracket-newline */
const EXPORTED_SYMBOLS = [
  "new_Fetch_Error" /*exported new_Fetch_Error */
];
/* eslint-disable array-bracket-newline */

/** Failed to fetch url. */
class Fetch_Error extends Error
{
  /** Creates a new instance.
   *
   * @param {Event} event - Event.
   * @param {string} url - URL being fetched.
   * @param {object} args - Everything else.
   */
  constructor(event, url, ...args)
  {
    super("Network error when fetching " + url, ...args);
    this.event = event;
    this.url = url;
    this.name = this.constructor.name;
  }
}

/** Because palemoon won't export classes "because they are syntactic sugar"
 *  (wtg guys), add a function to return a new instance.
 *
 * @param {Event} event - Event.
 * @param {string} url - URL being fetched.
 * @param {object} args - Everything else.
 *
 * @returns {Fetch_Error} New instance.
 */
function new_Fetch_Error(event, url, ...args)
{
  return new Fetch_Error(event, url, ...args);
}
