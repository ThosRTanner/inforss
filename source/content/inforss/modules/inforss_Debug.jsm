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
// inforss_Debug
// Author : Didier Ernotte 2005
//------------------------------------------------------------------------------

/* jshint globalstrict: true */
/* eslint-disable strict */
"use strict";

//Why does jslint require me to specify this? Also I should likely get rid
//of trace functions completely

/* eslint-disable array-bracket-newline */
/* exported EXPORTED_SYMBOLS */
const EXPORTED_SYMBOLS = [
  "debug", /* exported debug */
];
/* eslint-enable array-bracket-newline */

const { console } = Components.utils.import(
  "resource://gre/modules/Console.jsm",
  {}
);

const { alert } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Prompt.jsm",
  {}
);

const prefs = Components.classes[
  "@mozilla.org/preferences-service;1"].getService(
  Components.interfaces.nsIPrefService).getBranch("inforss.debug.");

const WindowMediator = Components.classes[
  "@mozilla.org/appshell/window-mediator;1"].getService(
  Components.interfaces.nsIWindowMediator);

/** put exception information to console, box or headline bar
 *
 * @param {Exception} except - the thrown exception generally, though anything
 *                             printable will work
 *
 */
function debug(except, obj)
{
  try
  {
    const meth = (new Error()).stack.split('\n')[1];

    if (prefs.getBoolPref("alert"))
    {
      alert(meth + " : " + except);
    }

    if (prefs.getBoolPref("log"))
    {
      console.log("Exception in " + meth, except);
    }

    if (prefs.getBoolPref("statusbar"))
    {
      const win = WindowMediator.getMostRecentWindow(null).document;
      if (win.getElementById("statusbar-display") != null)
      {
        win.getElementById("statusbar-display").label = meth + " : " + except;
      }
    }
  }
  catch (err)
  {
    console.log("InfoRSS Debug generated exception", err, "for", except, obj);
  }
}
