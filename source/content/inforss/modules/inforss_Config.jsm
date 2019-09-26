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
//----------------------------------------------------------------------------
// inforss_Config
// Author : Didier Ernotte 2005
// Inforss extension
//----------------------------------------------------------------------------
/* jshint globalstrict: true */
/* eslint-disable strict */
"use strict";

/* eslint-disable array-bracket-newline */
/* exported EXPORTED_SYMBOLS */
const EXPORTED_SYMBOLS = [
  "Config", /* exported Config */
];
/* eslint-enable array-bracket-newline */

const { debug } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Debug.jsm",
  {}
);

const { alert } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Prompt.jsm",
  {}
);

const {
  remove_all_children,
  read_password,
  store_password
} = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Utils.jsm",
  {}
);

const {
  get_profile_dir,
  get_profile_file,
  get_resource_file,
  get_string
} = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Version.jsm",
  {}
);

const FileInputStream = Components.Constructor(
  "@mozilla.org/network/file-input-stream;1",
  "nsIFileInputStream",
  "init");

const ScriptableInputStream = Components.Constructor(
  "@mozilla.org/scriptableinputstream;1",
  "nsIScriptableInputStream",
  "init");

//FIXME This is a service
const UTF8Converter = Components.Constructor(
  "@mozilla.org/intl/utf8converterservice;1",
  "nsIUTF8ConverterService");

const FileOutputStream = Components.Constructor(
  "@mozilla.org/network/file-output-stream;1",
  "nsIFileOutputStream",
  "init");

const DOMParser = Components.Constructor("@mozilla.org/xmlextras/domparser;1",
                                         "nsIDOMParser");

const XMLSerializer = Components.Constructor(
  "@mozilla.org/xmlextras/xmlserializer;1",
  "nsIDOMSerializer");

const Inforss_Prefs = Components.classes[
  "@mozilla.org/preferences-service;1"].getService(
  Components.interfaces.nsIPrefService).getBranch("inforss.");

const INFORSS_REPOSITORY = "inforss.xml";

//const { console } = Components.utils.import(
//  "resource://gre/modules/Console.jsm",
//  {}
//);

const INFORSS_DEFAULT_ICON = "chrome://inforss/skin/default.ico";

const INFORSS_BACKUP = "inforss_xml.backup";

/** Get the full name of the configuration file.
 *
 * @returns {string} path to configuration file
 */
function get_filepath()
{
  return get_profile_file(INFORSS_REPOSITORY);
}

/** Configuration object
 *
 * @class
 */
function Config()
{
  this.RSSList = null;
}

//Getters and setters, partly at least because it would be nightmarish to
//convert otherwise

//FIXME Should we have validity checks here (bool true/false, number in range),
//rather than in the UI?

const _props = {
  //----------------------------------------------------------------------------
  //Debug settings (warning: also accessed via about:config)
  //----------------------------------------------------------------------------

  //Display debug messages in a popup
  debug_display_popup: { type: "boolean", attr: "debug" },

  //----------------------------------------------------------------------------
  //Display debug messages on the status bar
  debug_to_status_bar: { type: "boolean", attr: "statusbar" },

  //----------------------------------------------------------------------------
  //Display debug messages in the browser log
  debug_to_browser_log: { type: "boolean", attr: "log" },

  //----------------------------------------------------------------------------
  //Default values.
  //Note that these are given to the feed at the time the feed is created. If
  //you change the default, you'll only change feeds created in the future.
  //----------------------------------------------------------------------------

  //Default number of headlines to show
  //FIXME Using 9999 for 'unconstrained' is dubious style
  feeds_default_max_num_headlines: { type: "number", attr: "defaultNbItem" },

  //Default max headline length to show (longer headlines will be truncated)
  //FIXME Using 9999 for 'unconstrained' is dubious style
  feeds_default_max_headline_length:
    { type: "number", attr: "defaultLenghtItem" },

  //Default refresh time (time between polls)
  feeds_default_refresh_time: { type: "number", attr: "refresh" },

  //Default number of days to retain a headline in the RDF file
  feeds_default_history_purge_days:
    { type: "number", attr: "defaultPurgeHistory" },

  //Default state for playing podcast
  feed_defaults_play_podcast: { type: "boolean", attr: "defaultPlayPodcast" },

  //Default switch for whether or not to use browser history to determine if
  //headline has been read
  feed_defaults_use_browser_history:
    { type: "boolean", attr: "defaultBrowserHistory" },

  //Default icon for a group
  feeds_defaults_group_icon: { type: "string", attr: "defaultGroupIcon" },

  //Default location to which to save podcasts (if empty, they don't get saved)
  feeds_default_podcast_location:
    { type: "string", attr: "savePodcastLocation" },

  //----------------------------------------------------------------------------

  //If the headline bar is collapsed, it only uses enough of the status bar to
  //display necessary headlines.
  //FIXME should be grayed out if not using the status bar
  headline_bar_collapsed: { type: "boolean", attr: "collapseBar" },

  //Stop scrolling when mouse is over headline. I presume this stops fading as
  //well.
  //FIXME Should be disabled on option screen when not appropriate
  headline_bar_stop_on_mouseover: { type: "boolean", attr: "stopscrolling" },

  //Cycle between feeds on the headline bar
  //FIXME If not enabled, the left/right icons shouldn't appear in the headline
  //bar
  headline_bar_cycle_feeds: { type: "boolean", attr: "cycling" },

  //Cycle feeds in group when set
  //FIXME Shouldn't be enabled if not cycling
  headline_bar_cycle_in_group: { type: "boolean", attr: "cycleWithinGroup" },

  //Interval between cycling feeds (in minutes)
  //FIXME Shouldn't be enabled if not cycling
  headline_bar_cycle_interval: { type: "number", attr: "cyclingDelay" },

  //Shows or collapses the ticker display completely. This only really makes
  //sense if you have the display in the status bar.
  headline_bar_enabled: { type: "boolean", attr: "switch" },

  //Scrolling speed / fade rate from 1 (slow) to 30 (fast)
  //Not meaningful for static
  //FIXME Should be disabled on option screen when not appropriate
  //FIXME Description should change?
  headline_bar_scroll_speed: { type: "number", attr: "scrollingspeed" },

  //The number of pixels a headline is scrolled by (1 to 3)
  //Only meaningful for scrolling, not static or fade
  //FIXME Should be disabled on option screen when not appropriate
  headline_bar_scroll_increment: { type: "number", attr: "scrollingIncrement" },

  //Show button to mark all headlines as read
  headline_bar_show_mark_all_as_read_button:
    { type: "boolean", attr: "readAllIcon" },

  //Show button to switch to previous feed
  //FIXME Does this make sense when not cycling?
  headline_bar_show_previous_feed_button:
    { type: "boolean", attr: "previousIcon" },

  //Show button to toggle scrolling
  headline_bar_show_pause_toggle: { type: "boolean", attr: "pauseIcon" },

  //Show button to switch to next feed
  //FIXME Does this make sense when not cycling?
  headline_bar_show_next_feed_button: { type: "boolean", attr: "nextIcon" },

  //Show button to view all headlines
  headline_bar_show_view_all_button: { type: "boolean", attr: "viewAllIcon" },

  //Show button to perform manual refresh
  //FIXME Whatever that is
  headline_bar_show_manual_refresh_button:
    { type: "boolean", attr: "refreshIcon" },

  //Show button to toggle display of old (not clicked for a while) headlines
  //FIXME How old exactly is old?
  headline_bar_show_hide_old_headlines_toggle:
    { type: "boolean", attr: "hideOldIcon" },

  //Show button to toggle display of viewed headlines
  headline_bar_show_hide_viewed_headlines_toggle:
    { type: "boolean", attr: "hideViewedIcon" },

  //Show button to toggle shuffling of headlines
  //FIXME Should this only be enabled when cycling is on?
  headline_bar_show_shuffle_toggle: { type: "boolean", attr: "shuffleIcon" },

  //Show button to toggle scrolling direction
  //FIXME Only if scrolling enabled? (though not you can enable scrolling from
  //the headline bar)
  headline_bar_show_direction_toggle:
    { type: "boolean", attr: "directionIcon" },

  //Show button to toggle scrolling on/off (this completely enables/disables)
  headline_bar_show_scrolling_toggle:
    { type: "boolean", attr: "scrollingIcon" },

  //Show button to configure quick filter
  headline_bar_show_quick_filter_button:
    { type: "boolean", attr: "filterIcon" },

  //Show button to open feed home page
  //FIXME Doesn't make sense for certain types of feed
  headline_bar_show_home_button: { type: "boolean", attr: "homeIcon" },

  //Font family in which to display headlines.
  //'inherit' or a font/family name (i.e. anything that CSS supports)
  headline_font_family: { type: "string", attr: "font" },

  //Font size in which to display headlines.
  //'inherit' or anything else that CSS supports
  headline_font_size: { type: "string", attr: "fontSize" },

  //This is pretty much completely the opposite of a timeslice. It returns the
  //delay between processing individual headlines (in milliseconds)
  headline_processing_backoff: { type: "number", attr: "timeslice" },

  //Display the feeds icon with each headline
  headline_shows_feed_icon: { type: "boolean", attr: "favicon" },

  //Display podcast icon (if applicable) with each headline
  headline_shows_enclosure_icon: { type: "boolean", attr: "displayEnclosure" },

  //Display ban icon (which is probably mark as read) with each headline
  headline_shows_ban_icon: { type: "boolean", attr: "displayBanned" },

  //Text colour for headlines
  //This can be 'default', or an HTML colour value (hex, rgb)
  //FIXME 'default' should be 'inherit' (esp as code patches it to achieve
  //this), then this would be any valid css colour
  headline_text_colour: { type: "string", attr: "defaultForegroundColor" },

  //Hide headlines once they've been viewed
  hide_viewed_headlines: { type: "boolean", attr: "hideViewed" },

  //Hide headlines that are considered 'old' (i.e. have been displayed for
  //a period of time, but not read)
  hide_old_headlines: { type: "boolean", attr: "hideOld" },

  //main icon should show the icon for the current feed (rather than the globe)
  icon_shows_current_feed: { type: "boolean", attr: "synchronizeIcon" },

  //main icon should flash when there is activity (i.e. it reads a feed xml).
  icon_flashes_on_activity: { type: "boolean", attr: "flashingIcon" },

  //Main menu should include an 'add' entry for each feed on the current page
  menu_includes_page_feeds: { type: "boolean", attr: "currentfeed" },

  //Main menu should include an 'add' entry for all livemarks
  menu_includes_livemarks: { type: "boolean", attr: "livemark" },

  //Main menu should include an 'add' entry for the current clipboard contents
  //(if it looks something like a feed at any rate)
  menu_includes_clipboard: { type: "boolean", attr: "clipboard" },

  //Main menu should show feeds that are part of a group. If this is off, it
  //won't show feeds that are in a group (or groups).
  menu_show_feeds_from_groups: { type: "boolean", attr: "includeAssociated" },

  //If on, each feed will have a submenu showing the "latest" (i.e. first in the
  //XML) 20 headlines.
  menu_show_headlines_in_submenu: { type: "boolean", attr: "submenu" },

  //Plays a sound ('beep' on linux, 'Notify' on windows) on a new headline
  play_sound_on_new_headline: { type: "boolean", attr: "playSound" },

  //Background colour for headlines.
  //This can be 'inherit' or a hex number (valid CSS)
  recent_headline_background_colour:
    { type: "string", attr: "backgroundColour" },

  //Returns how many seconds a hedline remains as 'recent'
  recent_headline_max_age: { type: "number", attr: "delay" },

  //Text colour for recent headlines
  //This can be 'auto', 'sameas' or a colour value. Note that the code is
  //somewhat obscure (and duplicated) if you have this set to auto and have a
  //non-default background.
  recent_headline_text_colour: { type: "string", attr: "foregroundColor" },

  //Remember displayed headlines and state
  remember_headlines: { type: "boolean", attr: "hideHistory" },

  //Show a toast (on my windows 10 it appears at the bottom right) on a new
  //headline
  show_toast_on_new_headline: { type: "boolean", attr: "popupMessage" },

  //The width of the headline area in the status bar
  status_bar_scrolling_area: { type: "number", attr: "scrollingArea" },

  //Quick filter text
  quick_filter_text: { type: "string", attr: "quickFilter" },

  //Quick filter enabled
  quick_filter_active: { type: "boolean", attr: "quickFilterActive" },

};

//In next version would use the Object.entries here
for (const prop of Object.keys(_props))
{
  const type = _props[prop].type;
  const attr = _props[prop].attr;

  if (type == "boolean")
  {
    Object.defineProperty(Config.prototype, prop, {
      get()
      {
        return this.RSSList.firstChild.getAttribute(attr) == "true";
      },

      set(state)
      {
        this.RSSList.firstChild.setAttribute(attr, state ? "true" : "false");
      }
    });
  }
  else if (type == "number")
  {
    Object.defineProperty(Config.prototype, prop, {
      get()
      {
        return parseInt(this.RSSList.firstChild.getAttribute(attr), 10);
      },

      set(val)
      {
        this.RSSList.firstChild.setAttribute(attr, val);
      }
    });
  }
  else if (type == "string")
  {
    Object.defineProperty(Config.prototype, prop, {
      get()
      {
        return this.RSSList.firstChild.getAttribute(attr);
      },

      set(val)
      {
        this.RSSList.firstChild.setAttribute(attr, val);
      }
    });
  }
}

// This is an assign function that copies full descriptors (ripped off from MDN)
function complete_assign(target, ...sources)
{
  sources.forEach(
    source =>
    {
      const descriptors = Object.keys(source).reduce(
        (descriptors, key) =>
        {
          descriptors[key] = Object.getOwnPropertyDescriptor(source, key);
          return descriptors;
        },
        {}
      );
      // by default, Object.assign copies enumerable Symbols too
      Object.getOwnPropertySymbols(source).forEach(
        sym =>
        {
          const descriptor = Object.getOwnPropertyDescriptor(source, sym);
          if (descriptor.enumerable)
          {
            descriptors[sym] = descriptor;
          }
        }
      );
      Object.defineProperties(target, descriptors);
    }
  );
  return target;
}

//A note: I can't use Object.assign here as it has getters/setters
//JS2017 has Object.getOwnPropertyDescriptors() and I could do
//Config.prototype = Object.create(
//  Config.prototype,
//  Object.getOwnPropertyDescriptors({...}));
//I think

complete_assign(Config.prototype, {
  //FIXME --------------- Should be read only properties -----------------------

  //----------------------------------------------------------------------------
  //FIXME This is only used in one place and I'm not sure if it should be used
  //there at all.
  is_valid()
  {
    return this.RSSList != null;
  },

  //----------------------------------------------------------------------------
  // Get all the feeds / groups we have configured
  // Returns a dynamic NodeList
  get_all()
  {
    return this.RSSList.getElementsByTagName("RSS");
  },

  // Gets the configured groups
  // Returns a static NodeList
  get_groups()
  {
    return this.RSSList.querySelectorAll("RSS[type=group]");
  },

  // Gets the configured feeds
  // Returns a static NodeList
  get_feeds()
  {
    return this.RSSList.querySelectorAll("RSS:not([type=group])");
  },

  //------------------ to here

  /** clone the current object
   *
   * creates a new document which is a complete clone of the current one
   *
   * @returns {Config} a clone of this
   */
  clone()
  {
    const config = new Config();
    config.RSSList = this.RSSList.cloneNode(true);
    return config;
  },

  /** Clear all the feeds
   *
   * Mainly for use by opml import
   */
  clear_feeds()
  {
    const feeds = this.RSSList.childNodes[0];
    remove_all_children(feeds);
  },

  /** Get the default feed icon
   *
   * @returns {string} The default feed icon
   */
  get Default_Feed_Icon()
  {
    return INFORSS_DEFAULT_ICON;
  },

  //----------------------------------------------------------------------------
  //style of tooltip on headline, can be "description", "title", "allInfo" or
  //"article" (which most of code treats as default)
  //FIXME Replace this with appropriate properties. (see below)
  get headline_tooltip_style()
  {
    return this.RSSList.firstChild.getAttribute("tooltip");
  },

  set headline_tooltip_style(val)
  {
    this.RSSList.firstChild.setAttribute("tooltip", val);
  },

  //----------------------------------------------------------------------------
  //When clicking on a headline, article loads in
  get New_Default_Tab() { return 0; },
  get New_Background_Tab() { return 1; },
  get New_Foreground_Tab() { return 2; },
  get New_Window() { return 3; },
  get Current_Tab() { return 4; },

  get headline_action_on_click()
  {
    return parseInt(this.RSSList.firstChild.getAttribute("clickHeadline"), 10);
  },

  set headline_action_on_click(val)
  {
    this.RSSList.firstChild.setAttribute("clickHeadline", val);
  },

  //----------------------------------------------------------------------------
  //Get the location of the headline bar.
  get in_status_bar() { return 0; },
  get at_top() { return 1; },
  get at_bottom() { return 2; },

  get headline_bar_location()
  {
    return this.RSSList.firstChild.getAttribute("separateLine") == "false" ?
              this.in_status_bar :
           this.RSSList.firstChild.getAttribute("linePosition") == "top" ?
              this.at_top:
              this.at_bottom;
  },

  set headline_bar_location(loc)
  {
    switch (loc)
    {
      default:
      case this.in_status_bar:
        this.RSSList.firstChild.setAttribute("separateLine", "false");
        break;

      case this.at_top:
        this.RSSList.firstChild.setAttribute("separateLine", "true");
        this.RSSList.firstChild.setAttribute("linePosition", "top");
        break;

      case this.at_bottom:
        this.RSSList.firstChild.setAttribute("separateLine", "true");
        this.RSSList.firstChild.setAttribute("linePosition", "bottom");
        break;
    }
  },

  //----------------------------------------------------------------------------
  //How much the mouse wheel will scroll.
  //'pixel' scrolls by the scrolling increment
  //'pixels' appears to scroll 10 'pixels' at a time.
  get By_Pixel() { return 0; },
  get By_Pixels() { return 1; },
  get By_Headline() { return 2; },

  get headline_bar_mousewheel_scroll()
  {
    const type = this.RSSList.firstChild.getAttribute("mouseWheelScroll");
    return type == "pixel" ? this.By_Pixel :
           type == "pixels" ? this.By_Pixels : this.By_Headline;
  },

  set headline_bar_mousewheel_scroll(scroll)
  {
    this.RSSList.firstChild.setAttribute("mouseWheelScroll", (() =>
    {
      switch (scroll)
      {
        default:
        case this.By_Pixel:
          return "pixel";

        case this.By_Pixels:
          return "pixels";

        case this.By_Headline:
          return "headline";
      }
    })());
  },

  //----------------------------------------------------------------------------
  //Indicate how headlines appear/disappear
  //For fade, instead of scrolling, one headline is displayed, and it fades
  //into the next one. Useful for status bar.
  get Static_Display() { return 0; },
  get Scrolling_Display() { return 1; },
  get Fade_Into_Next() { return 2; },

  get headline_bar_scroll_style()
  {
    return parseInt(this.RSSList.firstChild.getAttribute("scrolling"), 10);
  },

  set headline_bar_scroll_style(style)
  {
    this.RSSList.firstChild.setAttribute("scrolling", style);
  },

  //----------------------------------------------------------------------------
  //Get the scrolling direction (rtl/ltr)
  //FIXME Should be disabled on option screen when not appropriate
  //FIXME Shouldn't be raw ascii
  get headline_bar_scrolling_direction()
  {
    return this.RSSList.firstChild.getAttribute("scrollingdirection");
  },

  set headline_bar_scrolling_direction(dir)
  {
    this.RSSList.firstChild.setAttribute("scrollingdirection", dir);
  },

  //----------------------------------------------------------------------------
  //Get what to display on the next cycling, either "next" or "random"
  //FIXME Shouldn't be enabled if not cycling
  //FIXME Replace this with appropriate properties (or boolean)
  get headline_bar_cycle_type()
  {
    return this.RSSList.firstChild.getAttribute("nextFeed");
  },

  set headline_bar_cycle_type(type)
  {
    this.RSSList.firstChild.setAttribute("nextFeed", type);
  },

  //----------------------------------------------------------------------------
  //Weight of font. This can be 'bolder' or 'normal'
  //FIXME store like this in config, making this a straight string attribute
  get recent_headline_font_weight()
  {
    return this.RSSList.firstChild.getAttribute("bold") == "true" ? "bolder" : "normal";
  },

  set recent_headline_font_weight(val)
  {
    this.RSSList.firstChild.setAttribute("bold", val == "bolder");
  },

  //----------------------------------------------------------------------------
  //Style of font. This can be 'italic' or 'normal' (i.e. roman)
  //FIXME store like this in config, making this a straight string attribute
  get recent_headline_font_style()
  {
    return this.RSSList.firstChild.getAttribute("italic") == "true" ? "italic" : "normal";
  },

  set recent_headline_font_style(val)
  {
    this.RSSList.firstChild.setAttribute("italic", val == "italic");
  },

  //----------------------------------------------------------------------------
  //Sorting style for main menu. May be asc, des or off.
  get menu_sorting_style()
  {
    return this.RSSList.firstChild.getAttribute("sortedMenu");
  },

  set menu_sorting_style(val)
  {
    this.RSSList.firstChild.setAttribute("sortedMenu", val);
  },

  //----------------------------------------------------------------------------
  getFilterHeadlines(rss)
  {
    return rss.getAttribute("filterHeadlines");
  },

  //----------------------------------------------------------------------------
  //FIXME This is broken in so far as it doesn't account for 'fade in'
  toggleScrolling()
  {
    this.RSSList.firstChild.setAttribute("scrolling",
      this.headline_bar_scroll_style == this.Static_Display ? "1" : "0");
    this.save();
  },

  //----------------------------------------------------------------------------
  //FIXME This shouldn't be here. The client should do this and the save
  switchShuffle()
  {
    if (this.RSSList.firstChild.getAttribute("nextFeed") == "next")
    {
      this.RSSList.firstChild.setAttribute("nextFeed", "random");
    }
    else
    {
      this.RSSList.firstChild.setAttribute("nextFeed", "next");
    }
    this.save();
  },

  //----------------------------------------------------------------------------
  //FIXME This shouldn't be here. The client should do this and the save
  switchDirection()
  {
    if (this.RSSList.firstChild.getAttribute("scrollingdirection") == "rtl")
    {
      this.RSSList.firstChild.setAttribute("scrollingdirection", "ltr");
    }
    else
    {
      this.RSSList.firstChild.setAttribute("scrollingdirection", "rtl");
    }
    this.save();
  },

  //----------------------------------------------------------------------------
  //FIXME Why does this live in prefs and not in the xml (or why doesn't more
  //live here?)
  //FIXME We calculate this branch 3 times in here.
  getServerInfo()
  {
    var serverInfo = null;
    if (Inforss_Prefs.prefHasUserValue("repository.user") == false)
    {
      serverInfo = {
        protocol: "ftp://",
        server: "",
        directory: "",
        user: "",
        password: "",
        autosync: false
      };
      this.setServerInfo(serverInfo.protocol,
                         serverInfo.server,
                         serverInfo.directory,
                         serverInfo.user,
                         serverInfo.password,
                         serverInfo.autosync);
    }
    else
    {
      var user = Inforss_Prefs.getCharPref("repository.user");
      var password = null;
      var server = Inforss_Prefs.getCharPref("repository.server");
      var protocol = Inforss_Prefs.getCharPref("repository.protocol");
      var autosync = null;
      if (Inforss_Prefs.prefHasUserValue("repository.autosync") == false)
      {
        autosync = false;
      }
      else
      {
        autosync = Inforss_Prefs.getBoolPref("repository.autosync");
      }
      if ((user.length > 0) && (server.length > 0))
      {
        password = read_password(protocol + server, user);
      }
      serverInfo = {
        protocol: protocol,
        server: server,
        directory: Inforss_Prefs.getCharPref("repository.directory"),
        user: user,
        password: (password == null) ? "" : password,
        autosync: autosync
      };
    }
    return serverInfo;
  },

  //----------------------------------------------------------------------------
  setServerInfo(protocol, server, directory, user, password, autosync)
  {
    Inforss_Prefs.setCharPref("repository.protocol", protocol);
    Inforss_Prefs.setCharPref("repository.server", server);
    Inforss_Prefs.setCharPref("repository.directory", directory);
    Inforss_Prefs.setCharPref("repository.user", user);
    Inforss_Prefs.setBoolPref("repository.autosync", autosync);
    if ((user != "") && (password != ""))
    {
      store_password(protocol + server, user, password);
    }
  },

  //++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
  //This set of functions is sucky. These should be operations on the feed
  //objects themselves

  //----------------------------------------------------------------------------
  //utility function to remove all properties of a certain type
  _feed_clear_property_list(feed, type)
  {
    let child = feed.firstChild;
    while (child != null)
    {
      const next = child.nextSibling;
      if (child.nodeName == type)
      {
        //feed.removeChild(child);
        child.remove();
      }
      child = next;
    }
  },

  //----------------------------------------------------------------------------
  //Clear all the group entries in a feed
  feed_group_clear_groups(feed)
  {
    this._feed_clear_property_list(feed, "GROUP");
  },

  //Add a new group entry (url)
  feed_group_add(feed, url)
  {
    const child = this.RSSList.createElement("GROUP");
    child.setAttribute("url", url);
    feed.appendChild(child);
  },

  //Clear the playlist from a grouped feed
  feed_group_clear_playlist(feed)
  {
    const playList = feed.getElementsByTagName("playLists");
    if (playList.length != 0)
    {
      feed.removeChild(playList[0]);
    }
  },

  //Add a playlist to a feed (note: there can be only one)
  //playlist is an array of objects, each with a url and a delay property
  feed_group_set_playlist(feed, playlist)
  {
    this.feed_group_clear_playlist(feed);
    const playLists = this.RSSList.createElement("playLists");
    for (const item of playlist)
    {
      const play = this.RSSList.createElement("playList");
      play.setAttribute("url", item.url);
      play.setAttribute("delay", item.delay);
      playLists.appendChild(play);
    }
    feed.appendChild(playLists);
  },

  //Clear the filters from a grouped feed
  feed_clear_filters(feed)
  {
    this._feed_clear_property_list(feed, "FILTER");
  },

  //Add a filter to a feed.
  //Passed a feed and an object whih happens to be all the contents of a filter.
  //Obviously coode be done better (filter should be a class or something
  feed_add_filter(feed, filter)
  {
    const filt = this.RSSList.createElement("FILTER");
    filt.setAttribute("active", filter.active);
    filt.setAttribute("type", filter.type);
    filt.setAttribute("include", filter.include);
    filt.setAttribute("text", filter.text);
    filt.setAttribute("compare", filter.compare);
    filt.setAttribute("elapse", filter.elapse);
    filt.setAttribute("unit", filter.unit);
    filt.setAttribute("hlcompare", filter.hlcompare);
    filt.setAttribute("nb", filter.nb);
    feed.appendChild(filt);
  },

  //++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

  get_item_from_url(url)
  {
    return this.RSSList.querySelector('RSS[url="' + url + '"]');
  },

  //----------------------------------------------------------------------------
  save()
  {
    this._save(this.RSSList);
  },

  //----------------------------------------------------------------------------
  _save(list)
  {
    try
    {
      //FIXME should make this atomic write to new/delete/rename
      const file = get_filepath();
      const outputStream = new FileOutputStream(file, -1, -1, 0);
      new XMLSerializer().serializeToStream(list, outputStream, "UTF-8");
      outputStream.close();
      //FIXME also add this to the inforssXML reader
      Inforss_Prefs.setBoolPref(
        "debug.alert",
        list.firstChild.getAttribute("debug") == "true"
      );
      Inforss_Prefs.setBoolPref(
        "debug.log",
        list.firstChild.getAttribute("log") == "true"
      );
      Inforss_Prefs.setBoolPref(
        "debug.statusbar",
        list.firstChild.getAttribute("statusbar") == "true"
      );
    }
    catch (err)
    {
      debug(err);
    }
  },

  add_group(name)
  {
    return this.add_item(name,
                         name,
                         name,
                         null,
                         null,
                         null,
                         "group",
                         this.feeds_defaults_group_icon);
  },

  //----------------------------------------------------------------------------
  //FIXME icon should not be defaulted
  add_item(title,
           description,
           url,
           link,
           user,
           password,
           type,
           icon = INFORSS_DEFAULT_ICON)
  {
    try
    {
      //FIXME This needs to use/match the default item array for when updating
      //to a new version.
      const elem = this.RSSList.createElement("RSS");
      elem.setAttribute("url", url);
      elem.setAttribute("title", title);
      elem.setAttribute(
        "description",
        description == null || description == "" ? title : description
      );
      elem.setAttribute("type", type);
      if (type == "group")
      {
        elem.setAttribute("playlist", "false");
        elem.setAttribute("filterPolicy", "0");
      }
      else
      {
        elem.setAttribute("link", link == null || link == "" ? url : link);
        if (user != null && user != "")
        {
          elem.setAttribute("user", user);
          store_password(url, user, password);
        }
        elem.setAttribute("nbItem", this.feeds_default_max_num_headlines);
        elem.setAttribute("lengthItem", this.feeds_default_max_headline_length);
        elem.setAttribute("playPodcast", this.feed_defaults_play_podcast);
        elem.setAttribute("savePodcastLocation",
                          this.feeds_default_podcast_location);
        elem.setAttribute("purgeHistory",
                          this.feeds_default_history_purge_days);
        elem.setAttribute("browserHistory",
                          this.feed_defaults_use_browser_history);
        elem.setAttribute("refresh", this.feeds_default_refresh_time);
      }
      elem.setAttribute("icon", icon);
      elem.setAttribute("selected", "false");
      elem.setAttribute("activity", "true");
      elem.setAttribute("filter", "all");
      elem.setAttribute("filterCaseSensitive", "true");
      elem.setAttribute("groupAssociated", "false"); //for a group?
      elem.setAttribute("group", type == "group"); //this is insane
      elem.setAttribute("encoding", "");

      this.RSSList.firstChild.appendChild(elem);
      return elem;
    }
    catch (err)
    {
      debug(err);
    }
    return null;
  },

  /** remove a feed from the configuration
   *
   * @param {string} url - url of feed
   */
  remove_feed(url)
  {
    const feed = this.get_item_from_url(url);
    if (feed == null)
    {
      return;
    }
    //currentRSS.parentNode.removeChild(currentRSS);
    feed.remove();
    if (feed.getAttribute("type") != "group")
    {
      for (const group of this.get_groups())
      {
        for (const child of group.getElementsByTagName("GROUP"))
        {
          if (child.getAttribute("url") == url)
          {
            child.remove();
            break;
          }
        }
      }
    }
  },

  //----------------------------------------------------------------------------

  backup()
  {
    try
    {
      const file = get_filepath();
      if (file.exists())
      {
        const backup = get_profile_file(INFORSS_BACKUP);
        if (backup.exists())
        {
          backup.remove(true);
        }
        file.copyTo(null, INFORSS_BACKUP);
      }
    }
    catch (err)
    {
      debug(err);
    }
  },

  //----------------------------------------------------------------------------
  //Arguably this isn't very good style but the only two places that do this
  //do the same alert then carry on.
  read_configuration()
  {
    try
    {
      const file = get_filepath();
      if (! file.exists() || file.fileSize == 0)
      {
        this.reset_xml_to_default();
      }

      const is = new FileInputStream(file, -1, -1, 0);
      const sis = new ScriptableInputStream(is);
      let data = sis.read(-1);
      sis.close();
      is.close();

      data = new UTF8Converter().convertStringToUTF8(data, "UTF-8", false);

      //I have no idea how this gets into or got into here but it really stuffs
      //things up.
      data = data.split(
        'xmlns="http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul"'
      ).join('');

      const new_list = new DOMParser().parseFromString(data, "text/xml");

      if (new_list.documentElement.nodeName == "parsererror")
      {
        throw "Cannot parse XML";
      }

      this._adjust_repository(new_list);
      this.RSSList = new_list;
    }
    catch (err)
    {
      alert(get_string("repo.error") + "\n" + err);
    }
  },

  //----------------------------------------------------------------------------
  _convert_4_to_5(list)
  {
    const config = list.firstChild;
    let rename_attribute = function(old_name, new_name)
    {
      if (config.hasAttribute(old_name))
      {
        if (! config.hasAttribute(new_name))
        {
          config.setAttribute(new_name, config.getAttribute(old_name));
        }
        config.removeAttribute(old_name);
      }
    };
    if (config.getAttribute("switch") == "on")
    {
      config.setAttribute("switch", "true");
    }
    if (config.getAttribute("scrolling") == "true")
    {
      config.setAttribute("scrolling", "1");
    }
    else if (config.getAttribute("scrolling") == "false")
    {
      config.setAttribute("scrolling", "0");
    }
    rename_attribute("purgeHistory", "defaultPurgeHistory");
    for (const item of list.getElementsByTagName("RSS"))
    {
      if (item.hasAttribute("password"))
      {
        if (item.getAttribute("password") != "")
        {
          store_password(item.getAttribute("url"),
                         item.getAttribute("user"),
                         item.getAttribute("password"));
        }
        item.removeAttribute("password");
      }
    }
  },

  //----------------------------------------------------------------------------
  _convert_5_to_6(list)
  {
    const config = list.firstChild;
    let rename_attribute = function(old_name, new_name)
    {
      if (config.hasAttribute(old_name))
      {
        if (! config.hasAttribute(new_name))
        {
          config.setAttribute(new_name, config.getAttribute(old_name));
        }
        config.removeAttribute(old_name);
      }
    };
    rename_attribute("DefaultPurgeHistory", "defaultPurgeHistory");
    rename_attribute("shuffleicon", "shuffleIcon");

    const items = list.getElementsByTagName("RSS");
    for (const item of items)
    {
      if (item.hasAttribute("user") &&
          (item.getAttribute("user") == "" ||
           item.getAttribute("user") == "null"))
      {
        item.removeAttribute("user");
      }
      if (item.getAttribute("type") == "html" &&
          ! item.hasAttribute("htmlDirection"))
      {
        item.setAttribute("htmlDirection", "asc");
      }
      if (! item.hasAttribute("browserHistory"))
      {
        item.setAttribute("browserHistory", "true");
        if (item.getAttribute("url").indexOf(
              "https://gmail.google.com/gmail/feed/atom") == 0 ||
            item.getAttribute("url").indexOf(".ebay.") != -1)
        {
          item.setAttribute("browserHistory", "false");
        }
      }
      if (item.getAttribute("type") == "group" &&
          !item.hasAttribute("playlist"))
      {
        item.setAttribute("playlist", "false");
      }
      if (item.hasAttribute("icon") && item.getAttribute("icon") == "")
      {
        item.setAttribute("icon", INFORSS_DEFAULT_ICON);
      }
    }

    this._set_defaults(list);
  },

  _convert_6_to_7(list)
  {
    const config = list.firstChild;
    config.removeAttribute("mouseEvent");
    config.removeAttribute("net");
  },

  _convert_7_to_8(list)
  {
    const config = list.firstChild;
    config.removeAttribute("groupNbItem");
    config.removeAttribute("groupLenghtItem");
    config.removeAttribute("groupRefresh");
    config.removeAttribute("false"); //Embarassing result of fix to strange code

    if (config.getAttribute("font") == "auto")
    {
      config.setAttribute("font", "inherit");
    }

    {
      const fontSize = config.getAttribute("fontSize");
      if (fontSize == "auto")
      {
        config.setAttribute("fontSize", "inherit");
      }
      else if (! isNaN(fontSize))
      {
        config.setAttribute("fontSize", fontSize + "pt");
      }
    }

    //If defaultForegroundColor is "sameas", we need to swap that and
    //foregroundColor
    if (config.getAttribute("defaultForegroundColor") == "sameas")
    {
      let colour = config.getAttribute("foregroundColor");
      if (colour == "auto")
      {
        colour = "default";
      }
      config.setAttribute("defaultForegroundColor", colour);
      config.setAttribute("foregroundColor", "sameas");
    }

    //Convert the 3 r/g/b to one single background colour.
    //A note: This is questionable in a sense, but css takes html colours and
    //html doesn't take css colour specs.
    if (config.hasAttribute("red"))
    {
      const red = Number(config.getAttribute("red"));
      if (red == "-1")
      {
        config.setAttribute("backgroundColour", "inherit");
      }
      else
      {
        const green = Number(config.getAttribute("green"));
        const blue = Number(config.getAttribute("blue"));
        config.setAttribute(
          "backgroundColour",
          '#' + ("000000" + ((red * 256 + green) * 256 + blue).toString(16)).substr(-6));
      }
      config.removeAttribute("red");
      config.removeAttribute("green");
      config.removeAttribute("blue");
    }

  },

  _convert_8_to_9(list)
  {
    for (const item of list.getElementsByTagName("RSS"))
    {
      item.removeAttribute("acknowledgeDate");
    }
  },

  _convert_9_to_10(list)
  {
    const config = list.firstChild;
    let rename_attribute = function(old_name, new_name)
    {
      if (config.hasAttribute(old_name))
      {
        if (! config.hasAttribute(new_name))
        {
          config.setAttribute(new_name, config.getAttribute(old_name));
        }
        config.removeAttribute(old_name);
      }
    };
    config.removeAttribute("synchronizationIcon");
    rename_attribute("isQuickFilterActive", "isQuickFilterActive");
  },

  //----------------------------------------------------------------------------
  _adjust_repository(list)
  {
    const config = list.firstChild;
    if (config.getAttribute("version") <= "4")
    {
      this._convert_4_to_5(list);
    }
    if (config.getAttribute("version") <= "5")
    {
      this._convert_5_to_6(list);
    }
    if (config.getAttribute("version") <= "6")
    {
      this._convert_6_to_7(list);
    }
    if (config.getAttribute("version") <= "7")
    {
      this._convert_7_to_8(list);
    }
    if (config.getAttribute("version") <= "8")
    {
      this._convert_8_to_9(list);
    }
    if (config.getAttribute("version") <= "9")
    {
      this._convert_9_to_10(list);
    }

    //FIXME shouldn't have irrelevant stuff in groups

    //FIXME this should be done properly when saving and then it becomes part of
    //a normal convert.
    {
      const items = list.getElementsByTagName("RSS");
      for (const item of items)
      {
        item.setAttribute("groupAssociated", "false");
      }
      for (const group of items)
      {
        if (group.getAttribute("type") == "group")
        {
          for (const feed of group.getElementsByTagName("GROUP"))
          {
            const url = feed.getAttribute("url");
            for (const item of items)
            {
              if (item.getAttribute("type") != "group" &&
                  item.getAttribute("url") == url)
              {
                item.setAttribute("groupAssociated", "true");
                break;
              }
            }
          }
        }
      }
    }

    //NOTENOTENOTE Check this before release.
    //It should be set to what is up above
    if (config.getAttribute("version") != "10")
    {
      config.setAttribute("version", 10);
      this.backup();
      this._save(list);
    }
  },

  //----------------------------------------------------------------------------

  _set_defaults(list)
  {
    //Add in missing defaults
    const defaults = {
      backgroundColour: "#7fc0ff",
      bold: true,
      clickHeadline: 0,
      clipboard: true,
      collapseBar: false,
      currentfeed: true,
      cycleWithinGroup: false,
      cycling: false,
      cyclingDelay: 5,
      debug: false,
      defaultBrowserHistory: true,
      defaultForegroundColor: "default",
      defaultGroupIcon: "chrome://inforss/skin/group.png",
      defaultLenghtItem: 25,
      defaultNbItem: 9999,
      defaultPlayPodcast: true,
      defaultPurgeHistory: 3,
      delay: 15,
      directionIcon: true,
      displayBanned: true,
      displayEnclosure: true,
      favicon: true,
      filterIcon: true,
      flashingIcon: true,
      font: "inherit",
      fontSize: "inherit",
      foregroundColor: "auto",
      group: false,
      hideHistory: true,
      hideOld: false,
      hideOldIcon: false,
      hideViewed: false,
      hideViewedIcon: false,
      homeIcon: true,
      includeAssociated: true,
      italic: true,
      linePosition: "bottom",
      livemark: true,
      log: false,
      mouseWheelScroll: "pixel",
      nextFeed: "next",
      nextIcon: true,
      pauseIcon: true,
      playSound: true,
      popupMessage: true,
      previousIcon: true,
      quickFilter: "",
      quickFilterActive: false,
      readAllIcon: true,
      refresh: 2,
      refreshIcon: false,
      savePodcastLocation: "",
      scrolling: 1,
      scrollingArea: 500,
      scrollingIcon: true,
      scrollingIncrement: 2,
      scrollingdirection: "rtl",
      scrollingspeed: 19,
      separateLine: false,
      shuffleIcon: true,
      sortedMenu: "asc",
      statusbar: false,
      stopscrolling: true,
      submenu: false,
      "switch": true,
      synchronizeIcon: false,
      timeslice: 90,
      tooltip: "description",
      viewAllIcon: true,
    };

    const config = list.firstChild;
    for (const attrib in defaults)
    {
      if (! defaults.hasOwnProperty(attrib))
      {
        continue;
      }
      if (! config.hasAttribute(attrib))
      {
        config.setAttribute(attrib, defaults[attrib]);
      }
    }

    //Now for the rss items
    //FIXME see also add_item and anywhere that creates a new item.
    const feed_defaults = {
      activity: true,
      browserHistory: config.getAttribute("defaultBrowserHistory"),
      description: "",
      encoding: "",
      filter: "all",
      filterCaseSensitive: true,
      filterPolicy: 0,
      group: false,
      groupAssociated: false,
      icon: INFORSS_DEFAULT_ICON,
      lengthItem: config.getAttribute("defaultLenghtItem"),
      nbItem: config.getAttribute("defaultNbItem"),
      playPodcast: config.getAttribute("defaultPlayPodcast"),
      purgeHistory: config.getAttribute("defaultPurgeHistory"),
      refresh: config.getAttribute("refresh"),
      savePodcastLocation: config.getAttribute("savePodcastLocation"),
      selected: false,
      type: "rss",
    };
    for (const item of list.getElementsByTagName("RSS"))
    {
      for (const attrib in feed_defaults)
      {
        if (! feed_defaults.hasOwnProperty(attrib))
        {
          continue;
        }
        if (! item.hasAttribute(attrib))
        {
          item.setAttribute(attrib, feed_defaults[attrib]);
        }
      }
    }
  },

  //----------------------------------------------------------------------------
  //FIXME Godawful name
  //FIXME should be static
  reset_xml_to_default()
  {
    //Back up the current file if it exists so recovery may be attempted
    {
      const file = get_filepath();
      if (file.exists())
      {
        const INFORSS_INERROR = "inforss_xml.inerror";
        const dest = get_profile_file(INFORSS_INERROR);
        if (dest.exists())
        {
          dest.remove(false);
        }
        file.renameTo(get_profile_dir(), INFORSS_INERROR);
      }
    }

    //Copy the default setup.
    const source = get_resource_file("inforss.default");
    if (source.exists())
    {
      source.copyTo(get_profile_dir(), INFORSS_REPOSITORY);
    }
  },

});

Config.get_filepath = get_filepath;

Object.preventExtensions(Config);
