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
// inforss_Options_Advanced_Default_Values
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------

/* exported inforss_Options_Advanced_Default_Values */

/* eslint-disable array-bracket-newline */
/* exported EXPORTED_SYMBOLS */
//const EXPORTED_SYMBOLS = [
//  "Filter", /* exported Filter */
//];
/* eslint-enable array-bracket-newline */

//Switch off a lot of eslint warnings for now
/* eslint-disable strict, no-empty-function */

//This is all indicative of brokenness
/* globals console, LocalFile */

/* eslint-disable-next-line no-use-before-define, no-var */
var inforss = inforss || {}; //jshint ignore:line

Components.utils.import("chrome://inforss/content/modules/inforss_Utils.jsm",
                        inforss);

Components.utils.import("chrome://inforss/content/modules/inforss_Prompt.jsm",
                        inforss);

Components.utils.import("chrome://inforss/content/modules/inforss_Version.jsm",
                        inforss);

const File_Picker = Components.Constructor("@mozilla.org/filepicker;1",
                                           "nsIFilePicker",
                                           "init");


//const LocalFile = Components.Constructor("@mozilla.org/file/local;1",
//                                         "nsILocalFile",
//                                         "initWithPath");

/** Contains the code for the 'Basic' tab in the option screen
 *
 * @param {XMLDocument} document - the options window this._document
 * @param {Config} config - current configuration
 * @param {Options} options - main options window control
 */
function inforss_Options_Advanced_Default_Values(document, config, options)
{
  this._document = document;
  this._config = config;
  this._options = options;

  this._save_podcast_toggle = document.getElementById("savePodcastLocation");
  this._save_podcast_location = document.getElementById("savePodcastLocation1");
  this._apply_list = document.getElementById("inforss-apply-list");

  this._listeners = inforss.add_event_listeners(
    this,
    document,
    [ "defaultnbitem", "command", this._toggle_slider ],
    [ "defaultlengthitem", "command", this._toggle_slider ],
    [ "defaultrefresh", "command", this._toggle_slider ],
    [ "defval.groupicon.test", "command", this._group_icon_test ],
    [ "defval.groupicon.reset", "command", this._group_icon_reset ],
    [ this._save_podcast_toggle, "command", this._toggle_podcast ],
    [ "defval.podcast.browse", "command", this._browse_location ],
    [ "defval.apply", "click", this._apply_new_defaults ]
  );
}

inforss_Options_Advanced_Default_Values.prototype = {

  /** Config has been loaded */
  config_loaded()
  {
    const magic99 = (tag, val, deflt) =>
    {
      if (val == 9999)
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

    magic99("inforss.defaultnbitem",
            this._config.feeds_default_max_num_headlines,
            1);
    magic99("inforss.defaultlengthitem",
            this._config.feeds_default_max_headline_length,
            5);

    {
      const refresh = this._config.feeds_default_refresh_time;
      const tag = "inforss.defaultrefresh";
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

    // Purge local history
    this._document.getElementById("defaultPurgeHistory").value =
      this._config.feeds_default_history_purge_days;

    // Play podcast
    this._document.getElementById("defaultPlayPodcast").selectedIndex =
      this._config.feed_defaults_play_podcast ? 0 : 1;

    // Use history
    this._document.getElementById("defaultBrowserHistory").selectedIndex =
      this._config.feed_defaults_use_browser_history ? 0 : 1;

    // Default icon for groups
    {
      const icon = this._config.feeds_defaults_group_icon;
      this._document.getElementById("defaultGroupIcon").value = icon;
      this._document.getElementById("inforss.defaultgroup.icon").src = icon;
    }

    // Save podcast
    {
      const location = this._config.feeds_default_podcast_location;
      this._document.getElementById("savePodcastLocation1").value = location;
      if (location == "")
      {
        this._document.getElementById("savePodcastLocation").selectedIndex = 1;
        this._disable_podcast_location();
      }
      else
      {
        this._document.getElementById("savePodcastLocation").selectedIndex = 0;
        this._enable_podcast_location();
      }
    }

    inforss.remove_all_children(this._apply_list);
    for (const feed of this._config.get_all())
    {
      this.add_feed(feed);
    }

    this.current_feed_updated();
  },

  /** Validate contents of tab
   *
   * @returns {boolean} true if no invalid filters (i.e. empty text fields)
   */
  validate()
  {
    if (this._document.getElementById('defaultGroupIcon').value == "")
    {
      inforss.alert(inforss.get_string("icongroup.mandatory"));
      return false;
    }

    if (this._document.getElementById('savePodcastLocation').selectedIndex != 0)
    {
      return true;
    }

    const locn = this._document.getElementById('savePodcastLocation1').value;
    if (locn == "")
    {
      inforss.alert(inforss.get_string("podcast.mandatory"));
      return false;
    }

    try
    {
      const dir = new LocalFile(locn);
      if (dir.exists() && dir.isDirectory())
      {
        return true;
      }
    }
    catch (ex)
    {
      console.log(ex);
    }

    inforss.alert(inforss.get_string("podcast.location.notfound"));
    return false;
  },

  /** Update configuration from tab */
  update()
  {
    const magic99 = tag =>
    { //eslint-disable-line arrow-body-style
      return this._document.getElementById(tag).selectedIndex == 0 ?
        9999 :
        this._document.getElementById(tag + "1").value;
    };

    //# of news
    this._config.feeds_default_max_num_headlines =
      magic99("inforss.defaultnbitem");

    //# of chars
    this._config.feeds_default_max_headline_length =
      magic99("inforss.defaultlengthitem");

    //Refresh time
    {
      const refresh =
        this._document.getElementById("inforss.defaultrefresh").selectedIndex;
      this._config.feeds_default_refresh_time =
        refresh == 0 ? 60 * 24 :
        refresh == 1 ? 60 :
        this._document.getElementById("inforss.defaultrefresh1").value;
    }

    //purge local history after
    this._config.feeds_default_history_purge_days =
      this._document.getElementById("defaultPurgeHistory").value;

    //play podcast
    this._config.feed_defaults_play_podcast =
      this._document.getElementById("defaultPlayPodcast").selectedIndex == 0;

    //use applications history data
    this._config.feed_defaults_use_browser_history =
      this._document.getElementById("defaultBrowserHistory").selectedIndex == 0;

    //icon for groups
    this._config.feeds_defaults_group_icon =
      this._document.getElementById("defaultGroupIcon").value;

    //Default podcast location
    this._config.feeds_default_podcast_location =
      this._document.getElementById("savePodcastLocation").selectedIndex == 0 ?
        this._document.getElementById("savePodcastLocation1").value :
        "";
  },

  /** Clean up nicely on window close */
  dispose()
  {
    inforss.remove_event_listeners(this._listeners);
  },

  /** A new current feed has been selected */
  current_feed_updated()
  {
    const current_feed = this._config.selected_feed;
    if (current_feed != null)
    {
      this._document.getElementById("inforss.current.feed").setAttribute(
        "value",
        current_feed.getAttribute("title")
      );
      this._document.getElementById("inforss.current.feed").setAttribute(
        "tooltiptext",
        current_feed.getAttribute("description")
      );
    }
  },

  /** Adds a feed to the list of feeds to apply changes to
   *
   * @param {RSS} feed - feed config
   */
  add_feed(feed)
  {
    const listitem = this._document.createElement("listitem");
    listitem.setAttribute("label", feed.getAttribute("title"));
    //FIXME custom data in dom
    listitem.setAttribute("url", feed.getAttribute("url"));
    listitem.setAttribute("class", "listitem-iconic");
    listitem.setAttribute("image", feed.getAttribute("icon"));
    listitem.style.maxHeight = "18px";

    //Insert into list in alphabetical order
    const listbox = this._apply_list;
    const title = feed.getAttribute("title").toLowerCase();
    for (const item of listbox.childNodes)
    {
      if (title <= item.getAttribute("label").toLowerCase())
      {
        listbox.insertBefore(listitem, item);
        return;
      }
    }
    listbox.insertBefore(listitem, null);
  },

  /** Removes a feed from the list of feeds to apply changes to
   *
   * @param {string} url - url to remove
   */
  remove_feed(url)
  {
    Array.from(this._apply_list.childNodes).find(
      item => item.getAttribute("url") == url
    ).remove();
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

  /** Test group icon
   *
   * @param {XULCommandEvent} _event - command event on radio group
   */
  _group_icon_test(_event)
  {
    this._document.getElementById("inforss.defaultgroup.icon").src =
      this._document.getElementById("defaultGroupIcon").value;
  },

  /** Reset group icon to default
   *
   * @param {XULCommandEvent} _event - command event on radio group
   */
  _group_icon_reset(_event)
  {
    this._document.getElementById("defaultGroupIcon").value =
      this._config.Default_Group_Icon;
    this._group_icon_test();
  },

  /** Disable the podcast location text box */
  _disable_podcast_location()
  {
    const node =
      this._document.getElementById("inforss.default.settings.podcast");
    inforss.set_node_disabled_state(node, true);
  },

  /** Enable the podcast location text box */
  _enable_podcast_location()
  {
    const node =
      this._document.getElementById("inforss.default.settings.podcast");
    inforss.set_node_disabled_state(node, false);
  },

  /** Toggle podcast save
   *
   * @param {XULCommandEvent} _event - command event on radio group
   */
  _toggle_podcast(_event)
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
      inforss.get_string("podcast.location"),
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

  //FIXME this is somewhat inconsistent about how it behaves for groups.
  //Specifically, if you apply changes to the current feed, and it's a group,
  //you'll get a question about applying changes to all feeds. If you select
  //a group (or groups) you don't get the question.
  /** Apply clicked defaults to selected feed(s)
   *
   * @param {MouseEvent} _event - click event
   */
  _apply_new_defaults(_event)
  {
    if (! this.validate())
    {
      return;
    }

    let feeds = [];

    const applyto =
      this._document.getElementById("inforss.applyto").selectedIndex;

    switch (applyto)
    {
      default:
        console.log("Unexpected type " + applyto);
        return;

      case 0: // apply to all
        feeds = Array.from(this._config.get_all());
        break;

      case 1: // the current feed
      {
        const current_feed = this._config.selected_feed;
        if (current_feed === null)
        {
          inforss.alert(inforss.get_string("rss.selectfirst"));
          return;
        }
        //Give the user the option to also apply changes to all feeds in the
        //group if the current feed is a group
        if (current_feed.getAttribute("type") == "group" &&
            inforss.confirm("apply.group"))
        {
          feeds = Array.from(
            current_feed.getElementsByTagName("GROUP"),
            item => this._config.get_item_from_url(item.getAttribute("url"))
          );
        }
        feeds.push(current_feed);
        break;
      }

      case 2: // apply to the selected feed(s)
      {
        const selectedItems = this._apply_list.selectedItems;
        if (selectedItems.length == 0)
        {
          inforss.alert(inforss.get_string("rss.selectfirst"));
          return;
        }
        feeds = Array.from(
          selectedItems,
          item => this._config.get_item_from_url(item.getAttribute("url"))
        );
        break;
      }
    }

    for (const feed of feeds)
    {
      if (feed.getAttribute("type") == "group")
      {
        this._update_group(feed);
      }
      else
      {
        this._update_feed(feed);
      }
      this._options.feed_changed(feed.getAttribute("url"));
    }

    inforss.alert(inforss.get_string("feed.changed"));
  },

  /** Update the supplied group with the selected items
   *
   * @param {RSS} feed_config - feed configuration for feed to change.
   */
  _update_group(feed_config)
  {
    const doc = this._document;

    if (doc.getElementById("inforss.checkbox.defaultGroupIcon").checked)
    {
      feed_config.setAttribute(
        "icon",
        doc.getElementById("defaultGroupIcon").value
      );
    }
  },

  /** Update the supplied feed with the selected items
   *
   * @param {RSS} feed_config - feed configuration for feed to change.
   */
  _update_feed(feed_config)
  {
    const doc = this._document;

    if (doc.getElementById("inforss.checkbox.defaultnbitem").checked)
    {
      feed_config.setAttribute(
        "nbItem",
        doc.getElementById("inforss.defaultnbitem").selectedIndex == 0 ?
          "9999" :
          doc.getElementById("inforss.defaultnbitem1").value);
    }

    if (doc.getElementById("inforss.checkbox.defaultlengthitem").checked)
    {
      feed_config.setAttribute(
        "lengthItem",
        doc.getElementById("inforss.defaultlengthitem").selectedIndex == 0 ?
          "9999" :
          doc.getElementById("inforss.defaultlengthitem1").value);
    }

    if (doc.getElementById("inforss.checkbox.defaultrefresh1").checked)
    {
      const refresh =
        doc.getElementById("inforss.defaultrefresh").selectedIndex;
      feed_config.setAttribute(
        "refresh",
        refresh == 0 ? 60 * 24 :
        refresh == 1 ? 60 :
        doc.getElementById("inforss.defaultrefresh1").value
      );
    }

    if (doc.getElementById("inforss.checkbox.defaultPlayPodcast").checked)
    {
      feed_config.setAttribute(
        "playPodcast",
        doc.getElementById("defaultPlayPodcast").selectedIndex == 0
      );
    }

    if (doc.getElementById("inforss.checkbox.defaultPurgeHistory").checked)
    {
      feed_config.setAttribute(
        "purgeHistory",
        doc.getElementById("defaultPurgeHistory").value
      );
    }

    if (doc.getElementById("inforss.checkbox.defaultBrowserHistory").checked)
    {
      feed_config.setAttribute(
        "browserHistory",
        doc.getElementById("defaultBrowserHistory").selectedIndex == 0
      );
    }

    if (doc.getElementById("inforss.checkbox.defaultSavePodcast").checked)
    {
      feed_config.setAttribute(
        "savePodcastLocation",
        doc.getElementById("savePodcastLocation").selectedIndex == 1 ?
          "" : doc.getElementById("savePodcastLocation1").value);
    }
  },

};
