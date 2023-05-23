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
// inforss_Sleeper
// Author : Tom Tanner 2023
//------------------------------------------------------------------------------
/* jshint globalstrict: true */
/* eslint-disable strict */
"use strict";

//This module provides assorted utilities

/* exported EXPORTED_SYMBOLS */
/* eslint-disable array-bracket-newline */
const EXPORTED_SYMBOLS = [
  "Sleeper" /* exported Sleeper */
];
/* eslint-enable array-bracket-newline */

const { clearTimeout, setTimeout } = Components.utils.import(
  "resource://gre/modules/Timer.jsm",
  {}
);

/** Error raised when a sleep is cancelled. */
class Sleep_Cancelled_Error extends Error
{
  /** Creates a new instance.
   *
   * @param {number} duration - Initial duration of timer.
   * @param {string} elapsed - Time elapsed before cancellation.
   * @param {object} args - Everything else.
   */
  constructor(duration, elapsed, ...args)
  {
    super("Sleep of " + duration + "ms cancelled after " + elapsed + " ms",
          ...args);
    this.duration = duration;
    this.elapsed = elapsed;
    this.name = this.constructor.name;
  }
}

/** Class which provides a sleep which can be aborted.
 *
 * The general idea is you can await the sleep and it will return as normal
 * after the timeout, or an exception will be thrown if the timeout was
 * cancelled.
 *
 * @warning Do not use this to run 2 sleeps at once. It won't work.
 *
 * @class
 *
 */
function Sleeper()
{
  this._cancel = null;
  Object.seal(this);
}

Sleeper.prototype = {

  /** Sleep for the specified duration.
   *
   * @param {number} duration - Time to sleep, in milliseconds.
   *
   * @throws
   *
   * @returns {Promise} A Promise object which will be resolved after the
   *                    specified duration.
   */
  sleep(duration)
  {
    if (this.sleeping)
    {
      throw new Error("sleep() already running");
    }

    return new Promise(
      (resolve, reject) =>
      {
        const started = new Date();
        const timer = setTimeout(
          () =>
          {
            this._cancel = null;
            resolve();
          },
          duration);
        this._cancel = () =>
        {
          clearTimeout(timer);
          this._cancel = null;
          reject(new Sleep_Cancelled_Error(duration, new Date() - started));
        };
      }
    );
  },

  /** Abort current sleep.
   *
   * This causes a running sleep to be rejected.
   */
  abort()
  {
    if (this.sleeping)
    {
      this._cancel();
    }
  },

  /** Check if a sleep is currently in progress.
   *
   * @returns {boolean} True if currently sleeping.
   */
  get sleeping()
  {
    return this._cancel != null;
  }
};

