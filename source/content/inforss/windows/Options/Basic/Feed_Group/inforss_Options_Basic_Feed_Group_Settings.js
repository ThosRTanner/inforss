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
// inforss_Options_Basic_Feed_Group_Settings.js
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------

/* exported inforss_Options_Basic_Feed_Group_Settings */

/* eslint-disable array-bracket-newline */
/* exported EXPORTED_SYMBOLS */
//const EXPORTED_SYMBOLS = [
//  "Settings", /* exported Settings */
//];
/* eslint-enable array-bracket-newline */

//Switch off a lot of eslint warnings for now
/* eslint-disable strict, no-empty-function */

//This is all indicative of brokenness
/* globals LocalFile */

/* eslint-disable-next-line no-use-before-define, no-var */
var inforss = inforss || {}; // jslint ignore:line

Components.utils.import("chrome://inforss/content/modules/inforss_Utils.jsm",
                        inforss);

Components.utils.import("chrome://inforss/content/modules/inforss_Prompt.jsm",
                        inforss);

/** Contains the code for the 'Basic' tab in the option screen
 *
 * @param {XMLDocument} document - the options window this._document
 * @param {Config} config - current configuration
 */
function inforss_Options_Basic_Feed_Group_Settings(document, config)
{
  this._document = document;
  this._config = config;

  /*
  purge now button
  browse button
  unconstrained/constrained number of headlines
  unconstrained/constrained length of headlines
  refresh time
  save podcast
  bunch of settings
  this._listeners = inforss.add_event_listeners(
    this,
    this._document,
    [ "make.current", "command", this._make_current ],
    [ "remove", "command", this._remove_feed ]
  );
*/
}

inforss_Options_Basic_Feed_Group_Settings.prototype = {

  /** Config has been loaded */
  config_loaded()
  {
    //FIXME Sh*tloads of settings
  },

  /** Display settings for current feed
   *
   * @param {RSS} feed - config of currently selected feed
   */
  display(feed)
  {
    if (feed.getAttribute("type") == "group")
    {
      //Groups don't have settings.
      this._enable_tab(false);
      this._document.getElementById("nbItem").selectedIndex = 0;
      this._document.getElementById("nbItem1").value = 1;
      this._document.getElementById("lengthItem").selectedIndex = 0;
      this._document.getElementById('lengthItem1').value = 5;
      this._document.getElementById("inforss.refresh").selectedIndex = 0;
      this._document.getElementById("refresh1").value = 1;
      this._document.getElementById("purgeHistory").value = 1;
      this._document.getElementById("savePodcastLocation2").selectedIndex = 1;
      /** browse button apparently still enabled */
      return;
    }

    this._enable_tab(true);

    const magic99 = (tag, deflt) =>
    {
      const val = feed.getAttribute(tag);
      if (val == "9999")
      {
        this._document.getElementById(tag).selectedIndex = 0;
        this._document.getElementById(tag + "1").value = deflt;
      }
      else
      {
        this._document.getElementById(tag).selectedIndex = 1;
        this._document.getElementById(tag + "1").value = val;
      }
    };

    magic99("nbItem", 1);
    magic99("lengthItem", 5);

    {
      const refresh = feed.getAttribute("refresh");
      if (refresh == 60 * 24)
      {
        this._document.getElementById("inforss.refresh").selectedIndex = 0;
        this._document.getElementById("refresh1").value = 1;
      }
      else
      {
        this._document.getElementById("refresh1").value = refresh;
        this._document.getElementById("inforss.refresh").selectedIndex =
          refresh == 60 ? 1 : 2;
      }
    }

    this._document.getElementById("purgeHistory").value =
      feed.getAttribute("purgeHistory");

    const toggle = name =>
    {
      this._document.getElementById(name).selectedIndex =
        feed.getAttribute(name) == "true" ? 0 : 1;
    };

    toggle("playPodcast");
    toggle("browserHistory");

    {
      const savePodcastLocation = feed.getAttribute("savePodcastLocation");
      this._document.getElementById("savePodcastLocation2").selectedIndex =
        savePodcastLocation == "" ? 1 : 0;
      this._document.getElementById("savePodcastLocation3").value =
        savePodcastLocation;
    }
  },

  /** Validate contents of tab
   *
   * ignored @param {RSS} feed - config of currently selected feed
   *
   * @returns {boolean} true if all OK
   */
  validate(/*feed*/)
  {
    if (this._document.getElementById('savePodcastLocation2').selectedIndex != 0)
    {
      return true;
    }

    if (this._document.getElementById('savePodcastLocation3').value == "")
    {
      inforss.alert(inforss.get_string("podcast.mandatory"));
      return false;
    }

    try
    {
      const dir = new LocalFile(
        this._document.getElementById('savePodcastLocation3').value);
      if (dir.exists() && dir.isDirectory())
      {
        return true;
      }
    }
    catch (ex)
    {
      //Log this for now in case it's interesting.
      console.log(ex);
    }
    inforss.alert(inforss.get_string("podcast.location.notfound"));
    return false;
  },

  /** Update configuration from tab
   *
   * @param {RSS} feed - current feed config
   */
  update(feed)
  {
    //FIXME Sh*tloads of settings
  },

  /** Clean up nicely on window close */
  dispose()
  {
    //inforss.remove_event_listeners(this._listeners);
  },

  _enable_tab(flag)
  {
    const node = this._document.getElementById("inforss.feed-group.settings");
    inforss.enable_node(node, flag);
  },

};
