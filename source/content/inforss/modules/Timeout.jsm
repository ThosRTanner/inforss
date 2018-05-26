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
// timeout
// Author : Tom Tanner 2018
// Inforss extension
//------------------------------------------------------------------------------
//This provides timeouts without referencing any global window object

/* jshint globalstrict: true */
"use strict";

/* exported EXPORTED_SYMBOLS */
var EXPORTED_SYMBOLS = [
    "setTimeout", /* exported setTimeout */
    "clearTimeout", /* exported clearTimeout */
];


let timeoutId = 0;
const timeouts = {};

const worker = new Worker("chrome://inforss/content/workers/timeout.js");

worker.addEventListener("message", event =>
  {
    const id = event.data;
    if (id in timeouts)
    {
      const func = timeouts[id].func;
      const args = timeouts[id].args;
      func.apply(null, args);
      delete timeouts[id];
    }
  }
);

function setTimeout(func, delay)
{
  timeoutId += 1;
  timeouts[timeoutId] = {
    func: func,
    args: Array.prototype.slice.call(arguments, 2)
  };
  worker.postMessage({ command: "setTimeout",
                       id: timeoutId,
                       delay: delay || 0});
  return timeoutId;
}

function clearTimeout(id)
{
  if (id in timeouts)
  {
    worker.postMessage({ command: "clearTimeout", id: id });
    delete timeouts[id];
  }
}
