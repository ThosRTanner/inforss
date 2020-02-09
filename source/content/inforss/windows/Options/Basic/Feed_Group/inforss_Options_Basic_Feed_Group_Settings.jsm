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
// inforss_Options_Basic_Feed_Group_Settings
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------
/* jshint globalstrict: true */
/* eslint-disable strict */
"use strict";

/* eslint-disable array-bracket-newline */
/* exported EXPORTED_SYMBOLS */
const EXPORTED_SYMBOLS = [
  "Settings", /* exported Settings */
];
/* eslint-enable array-bracket-newline */

const mediator = Components.utils.import(
  "chrome://inforss/content/mediator/inforss_Mediator_API.jsm",
  {}
);

const { alert } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Prompt.jsm",
  {}
);

const {
  add_event_listeners,
  set_node_disabled_state
} = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Utils.jsm",
  {}
);

const { get_string } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Version.jsm",
  {}
);

const { Base } = Components.utils.import(
  "chrome://inforss/content/windows/Options/inforss_Options_Base.jsm",
  {}
);

const { console } = Components.utils.import(
  "resource://gre/modules/Console.jsm",
  {}
);

const File_Picker = Components.Constructor("@mozilla.org/filepicker;1",
                                           "nsIFilePicker",
                                           "init");

const LocalFile = Components.Constructor("@mozilla.org/file/local;1",
                                         "nsILocalFile",
                                         "initWithPath");

/** Contains the code for the 'Basic' tab in the option screen
 *
 * @param {XMLDocument} document - the options window this._document
 * @param {Options} options - main options window for some common code
 */
function Settings(document, options)
{
  Base.call(this, document, options);

  this._save_podcast_toggle = document.getElementById("savePodcastLocation2");
  this._save_podcast_location = document.getElementById("savePodcastLocation3");

  this._listeners = add_event_listeners(
    this,
    document,
    [ document.getElementById("nbItem"), "command", this._toggle_slider ],
    [ document.getElementById("lengthItem"), "command", this._toggle_slider ],
    [ "refresh", "command", this._toggle_slider ],
    [ "purgehistory", "command", this._purge_history ],
    [ this._save_podcast_toggle, "command", this._toggle_podcast ],
    [ "feed-group.settings.podcast.browse", "command", this._browse_location ]
  );
}

Settings.prototype = Object.create(Base.prototype);
Settings.prototype.constructor = Settings;

Object.assign(Settings.prototype, {

  /** Display settings for current feed
   *
   * @param {RSS} feed - config of currently selected feed
   */
  display(feed)
  {
    if (feed.getAttribute("type") == "group")
    {
      //Groups don't have settings.
      this._disable_tab();
      this._document.getElementById("nbItem").selectedIndex = 0;
      this._document.getElementById("nbItem1").value = 1;
      this._document.getElementById("lengthItem").selectedIndex = 0;
      this._document.getElementById("lengthItem1").value = 5;
      this._document.getElementById("inforss.refresh").selectedIndex = 0;
      this._document.getElementById("inforss.refresh1").value = 1;
      this._document.getElementById("purgeHistory").value = 1;
      this._save_podcast_toggle.selectedIndex = 1;
      this._save_podcast_location.value = "";
      return;
    }

    this._enable_tab();

    const magic99 = (tag, deflt) =>
    {
      const val = feed.getAttribute(tag);
      if (val == "9999")
      {
        this._document.getElementById(tag).selectedIndex = 0;
        this._document.getElementById(tag + "1").value = deflt;
        this._document.getElementById(tag + "1").disabled = true;
      }
      else
      {
        this._document.getElementById(tag).selectedIndex = 1;
        this._document.getElementById(tag + "1").value = val;
        this._document.getElementById(tag + "1").disabled = false;
      }
    };

    magic99("nbItem", 1);
    magic99("lengthItem", 5);

    {
      const tag = "inforss.refresh";
      const refresh = feed.getAttribute("refresh");
      if (refresh == 60 * 24)
      {
        this._document.getElementById(tag).selectedIndex = 0;
        this._document.getElementById(tag + "1").value = 1;
        this._document.getElementById(tag + "1").disabled = true;
      }
      else if (refresh == 60)
      {
        this._document.getElementById(tag).selectedIndex = 1;
        this._document.getElementById(tag + "1").value = refresh;
        this._document.getElementById(tag + "1").disabled = true;
      }
      else
      {
        this._document.getElementById(tag).selectedIndex = 2;
        this._document.getElementById(tag + "1").value = refresh;
        this._document.getElementById(tag + "1").disabled = false;
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
      this._save_podcast_location.value = savePodcastLocation;
      if (savePodcastLocation == "")
      {
        this._save_podcast_toggle.selectedIndex = 1;
        this._disable_podcast_location();
      }
      else
      {
        this._save_podcast_toggle.selectedIndex = 0;
        this._enable_podcast_location();
      }
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
    if (this._save_podcast_toggle.selectedIndex != 0)
    {
      return true;
    }

    if (this._save_podcast_location.value == "")
    {
      alert(get_string("podcast.mandatory"));
      return false;
    }

    try
    {
      const dir = new LocalFile(this._save_podcast_location.value);
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
    alert(get_string("podcast.location.notfound"));
    return false;
  },

  /** Update configuration from tab
   *
   * @param {RSS} feed - current feed config
   */
  update(feed)
  {
    if (feed.getAttribute("type") == "group")
    {
      return;
    }

    const magic99 = tag =>
    {
      feed.setAttribute(
        tag,
        this._document.getElementById(tag).selectedIndex == 0 ?
          "9999" :
          this._document.getElementById(tag + "1").value
      );
    };

    magic99("nbItem");
    magic99("lengthItem");

    const refresh1 =
      this._document.getElementById("inforss.refresh").selectedIndex;
    feed.setAttribute(
      "refresh",
      refresh1 == 0 ?
        60 * 24 :
        refresh1 == 1 ?
          60 :
          this._document.getElementById("inforss.refresh1").value
    );

    feed.setAttribute("purgeHistory",
                      this._document.getElementById("purgeHistory").value);

    const toggle = tag =>
    {
      feed.setAttribute(tag,
                        this._document.getElementById(tag).selectedIndex == 0);
    };

    toggle("playPodcast");
    toggle("browserHistory");

    feed.setAttribute(
      "savePodcastLocation",
      this._save_podcast_toggle.selectedIndex == 1 ?
        "" :
        this._save_podcast_location.value
    );
  },

  /** Disable the tab. groups don't have individual settings */
  _disable_tab()
  {
    const node = this._document.getElementById("inforss.feed-group.settings");
    set_node_disabled_state(node, true);
  },

  /** Enable the tab. groups don't have individual settings */
  _enable_tab()
  {
    const node = this._document.getElementById("inforss.feed-group.settings");
    set_node_disabled_state(node, false);
  },

  /** Enable/disable slider
   *
   * @param {XULCommandEvent} event - command event on radio group
   */
  _toggle_slider(event)
  {
    const target = event.currentTarget;
    this._document.getElementById(target.id + "1").disabled =
      target.selectedIndex != target._radioChildren.length - 1;
  },

  /** Purge history button
   *
   * ignored @param {XULCommandEvent} event - command event on button
   */
  _purge_history(/*event*/)
  {
    mediator.purge_headline_cache();
  },

  /** Disable the podcast location text box */
  _disable_podcast_location()
  {
    const node =
      this._document.getElementById("inforss.feed-group.settings.podcast");
    set_node_disabled_state(node, true);
  },

  /** Enable the podcast location text box */
  _enable_podcast_location()
  {
    const node =
      this._document.getElementById("inforss.feed-group.settings.podcast");
    set_node_disabled_state(node, false);
  },

  /** Toggle podcast save
   *
   * ignored @param {XULCommandEvent} event - command event on radio group
   */
  _toggle_podcast(/*event*/)
  {
    if (this._save_podcast_toggle.selectedIndex == 0)
    {
      this._enable_podcast_location();
    }
    else
    {
      this._disable_podcast_location();
    }
  },

  /** Browse button
   *
   * ignored @param {XULCommandEvent} event - command event on button
   */
  _browse_location(/*event*/)
  {
    const picker = new File_Picker(
      this._document.defaultView,
      get_string("podcast.location"),
      Components.interfaces.nsIFilePicker.modeGetFolder
    );
    if (this._save_podcast_location.value != "")
    {
      picker.displayDirectory =
        new LocalFile(this._save_podcast_location.value);
    }
    const response = picker.show();
    if (response == picker.returnOK || response == picker.returnReplace)
    {
      const dirPath = picker.file.path;
      this._save_podcast_location.value = dirPath;
      this._save_podcast_toggle.selectedIndex = 0;
      this._enable_podcast_location();
    }
  },

});
