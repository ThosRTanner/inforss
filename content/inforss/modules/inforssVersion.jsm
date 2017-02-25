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
"use strict";

/* exported EXPORTED_SYMBOLS */
var EXPORTED_SYMBOLS = [
    "inforssGetVersion", /* exported inforssGetVersion */
    "inforssGetResourceFile" /* exported inforssGetResourceFile */
];

//Module global variables
let addon_info = null;
const prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("inforss.");

/* globals AddonManager */
Components.utils.import("resource://gre/modules/AddonManager.jsm");

//Sadly it's not possible to get your own version from the addons manager - you
//have to specify your own ID

AddonManager.getAddonByID("{f65bf62a-5ffc-4317-9612-38907a779583}", addon =>
{
  addon_info = addon;

  let display = false;
  if (prefs.prefHasUserValue("installed.version"))
  {
    let version = prefs.getCharPref("installed.version");
    if (version < addon.version)
    {
      display = true;
    }
  }
  else
  {
    display = true;
  }
  if (display)
  {
    prefs.setCharPref("installed.version", addon.version);
  }
});

function inforssGetVersion()
{
  return addon_info.version;
}

function inforssGetResourceFile(path)
{
  return addon_info.getResourceURI(path).QueryInterface(Components.interfaces.nsIFileURL).file;
}