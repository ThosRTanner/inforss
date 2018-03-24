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
// Version
// Author : Tom Tanner 2017
//------------------------------------------------------------------------------
/* jshint globalstrict: true */
"use strict";

//Version is probably a bad name...

/* exported EXPORTED_SYMBOLS */
var EXPORTED_SYMBOLS = [
    "get_version", /* exported get_version */
    "get_resource_file(", /* exported get_resource_file */
    "get_name", /* exported get_name */
    "get_profile_dir", /* exported get_profile_dir */
    "get_profile_file", /* exported get_profile_file */
    "get_string", /* exported get_string */
];

const DirectoryService = Components.classes[
  "@mozilla.org/file/directory_service;1"].getService(
  Components.interfaces.nsIProperties);

const ProfileDir = DirectoryService.get("ProfD", Components.interfaces.nsIFile);

const PreferenceService = Components.classes[
  "@mozilla.org/preferences-service;1"].getService(
  Components.interfaces.nsIPrefService);

const Prefs = PreferenceService.getBranch("inforss.");

const StringBundleService = Components.classes[
  "@mozilla.org/intl/stringbundle;1"].getService(
  Components.interfaces.nsIStringBundleService);

const Bundle = StringBundleService.createBundle(
  "chrome://inforss/locale/inforss.properties");

//Module global variables
let addon = null;

/* globals AddonManager */
Components.utils.import("resource://gre/modules/AddonManager.jsm");

//On startup, get information about myself
//Sadly it's not possible to get your own version from the addons manager - you
//have to specify your own ID
//On the fortunate side it looks like the callback returns immediately.
AddonManager.getAddonByID("inforss-reloaded@addons.palemoon.org", my_addon =>
{
  addon = my_addon;

  let new_version = false;
  if (Prefs.prefHasUserValue("installed.version"))
  {
    let version = Prefs.getCharPref("installed.version");
    if (version < addon.version)
    {
      new_version = true;
    }
  }
  else
  {
    new_version = true;
  }
  if (new_version)
  {
    Prefs.setCharPref("installed.version", addon.version);
  }
});

//------------------------------------------------------------------------------
//Get current version
function get_version()
{
  return addon.version;
}

//------------------------------------------------------------------------------
//Get a resource file installed with the addon (usually defaults)
function get_resource_file(path)
{
  return addon.getResourceURI(path).QueryInterface(Components.interfaces.nsIFileURL).file;
}

//------------------------------------------------------------------------------
//Get the (localised) name of the addon
function get_name()
{
    return addon.name;
}

//FIXME These 2 should come from the addon manager
//------------------------------------------------------------------------------
//Get the directory with profile specific files
function get_profile_dir()
{
  return ProfileDir.clone();
}

//------------------------------------------------------------------------------
//Get a profile specific file
function get_profile_file(file)
{
  let locn = get_profile_dir();
  locn.append(file);
  return locn;
}

//------------------------------------------------------------------------------
//Get a (localised) string
//pass in the string. This automatically adds "inforss." to the front.
function get_string(name)
{
  return Bundle.GetStringFromName("inforss." + name);
}
