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
// inforssXMLRepository
// Author : Didier Ernotte 2005
// Inforss extension
//----------------------------------------------------------------------------

/*jshint browser: true, devel: true */
/*eslint-env browser */

var inforss = inforss || {};
Components.utils.import("chrome://inforss/content/modules/inforss_Debug.jsm",
                        inforss);

Components.utils.import("chrome://inforss/content/modules/inforss_Version.jsm",
                        inforss);

//These should be in another module. Or at least not exported */
/* exported LocalFile */
const LocalFile = Components.Constructor("@mozilla.org/file/local;1",
  "nsILocalFile",
  "initWithPath");

/* exported FileInputStream */
const FileInputStream = Components.Constructor(
  "@mozilla.org/network/file-input-stream;1",
  "nsIFileInputStream",
  "init");

/* exported ScriptableInputStream */
const ScriptableInputStream = Components.Constructor(
  "@mozilla.org/scriptableinputstream;1",
  "nsIScriptableInputStream",
  "init");

  //FIXME This is a service
/* exported UTF8Converter */
const UTF8Converter = Components.Constructor(
  "@mozilla.org/intl/utf8converterservice;1",
  "nsIUTF8ConverterService");

/* exported FileOutputStream */
const FileOutputStream = Components.Constructor(
  "@mozilla.org/network/file-output-stream;1",
  "nsIFileOutputStream",
  "init");

const LoginManager = Components.classes[
  "@mozilla.org/login-manager;1"].getService(
  Components.interfaces.nsILoginManager);
const LoginInfo = Components.Constructor(
  "@mozilla.org/login-manager/loginInfo;1",
  Components.interfaces.nsILoginInfo,
  "init");

//FIXME Turn this into a module,
//Note that inforssOption should have its own instance which is then copied
//once we do an apply. Jury is out on whether OPML import/export should work on
//the global/local instance...

//Clearly we have to get rid of this tho
/* global inforssFindIcon */

//To make this a module, will need to construct DOMParser
//https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIDOMParser

/* exported MODE_APPEND */
const MODE_APPEND = 0;
/* exported MODE_REPLACE */
const MODE_REPLACE = 1;

const INFORSS_REPOSITORY = "inforss.xml";

/* exported INFORSS_DEFAULT_ICO */
const INFORSS_DEFAULT_ICO = "chrome://inforss/skin/default.ico";

var RSSList = null;

//----------------------------------------------------------------------------
const opml_attributes = [
  "activity",
  "browserHistory",
  "filter",
  "filterCaseSensitive",
  "filterPolicy",
  "group",
  "groupAssociated",
  "htmlDirection",
  "htmlTest",
  "icon",
  "lengthItem",
  "nbItem",
  "playPodcast",
  "refresh",
  "regexp",
  "regexpCategory",
  "regexpDescription",
  "regexpLink",
  "regexpPubDate",
  "regexpStartAfter",
  "regexpStopBefore",
  "regexpTitle",
  "selected",
  "title",
  "type",
  "user"
];

const INFORSS_BACKUP = "inforss_xml.backup";

//use XML_Repository.<name> = xxxx for static properties/functions

function XML_Repository()
{
  return this;
}

//Getters and setters, partly at least because it would be nightmarish to
//convert otherwise

//FIXME Should we have validaty checks here (bool true/false, number in range),
//rather than in the UI?

const _inforssxml_props = {
  //----------------------------------------------------------------------------
  //Debug settings (warning: also accessed via about:config)
  //----------------------------------------------------------------------------

  //Display debug messages in a popup
  debug_display_popup: { type: "boolean", attr: "debug" },

  //----------------------------------------------------------------------------
  //Display debug messages on the status bar
  debug_to_status_bar: { type: "boolean", attr:  "statusbar" },

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
  feeds_default_max_headline_length: {
    type: "number", attr: "defaultLenghtItem" },

  //Default refresh time (time between polls)
  feeds_default_refresh_time: { type: "number", attr: "refresh" },

  //Default number of days to retain a headline in the RDF file
  feeds_default_history_purge_days: {
    type: "number", attr: "defaultPurgeHistory" },

  //Default state for playing podcast
  feed_defaults_play_podcast: { type: "boolean", attr: "defaultPlayPodcast" },

  //Default switch for whether or not to use browser history to determine if
  //headline has been read
  feed_defaults_use_browser_history: {
    type: "boolean", attr: "defaultBrowserHistory" },

  //Default icon for a group
  feeds_defaults_group_icon: { type: "string", attr: "defaultGroupIcon" },

  //Default location to which to save podcasts (if empty, they don't get saved)
  feeds_default_podcast_location: {
    type: "string", attr: "savePodcastLocation" },

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
  headline_bar_show_mark_all_as_read_button: {
    type: "boolean", attr: "readAllIcon" },

  //Show button to switch to previous feed
  //FIXME Does this make sense when not cycling?
  headline_bar_show_previous_feed_button: {
    type: "boolean", attr: "previousIcon" },

  //Show button to toggle scrolling
  headline_bar_show_pause_toggle: { type: "boolean", attr: "pauseIcon" },

  //Show button to switch to next feed
  //FIXME Does this make sense when not cycling?
  headline_bar_show_next_feed_button: { type: "boolean", attr: "nextIcon" },

  //Show button to view all headlines
  headline_bar_show_view_all_button: { type: "boolean", attr: "viewAllIcon" },

  //Show button to perform manual refresh
  //FIXME Whatever that is
  headline_bar_show_manual_refresh_button: {
    type: "boolean", attr: "refreshIcon" },

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
  headline_bar_show_direction_toggle: {
    type: "boolean", attr: "directionIcon" },

  //Show button to toggle scrolling on/off (this completely enables/disables)
  headline_bar_show_scrolling_toggle: {
    type: "boolean", attr: "scrollingIcon" },

  //Show button to perform manual synchronisation
  //FIXME Which is what?
  headline_bar_show_manual_synchronisation_button:
    { type: "boolean", attr: "synchronizationIcon" },

  //Show button to configure quick filter
  headline_bar_show_quick_filter_button: {
    type: "boolean", attr: "filterIcon" },

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
  recent_headline_background_colour: {
    type: "string", attr: "backgroundColour" },

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

};

//In next version would use the Object.entries here
for (let prop of Object.keys(_inforssxml_props))
{
  const type = _inforssxml_props[prop].type;
  const attr = _inforssxml_props[prop].attr;

  if (type == "boolean")
  {
    Object.defineProperty(XML_Repository.prototype, prop, {
      get: function()
      {
        return RSSList.firstChild.getAttribute(attr) == "true";
      },

      set: function(state)
      {
        RSSList.firstChild.setAttribute(attr, state ? "true" : "false");
      }
    });
  }
  else if (type == "number")
  {
    Object.defineProperty(XML_Repository.prototype, prop, {
      get: function()
      {
        return parseInt(RSSList.firstChild.getAttribute(attr), 10);
      },

      set: function(val)
      {
        RSSList.firstChild.setAttribute(attr, val);
      }
    });
  }
  else if (type == "string")
  {
    Object.defineProperty(XML_Repository.prototype, prop, {
      get: function()
      {
        return RSSList.firstChild.getAttribute(attr);
      },

      set: function(val)
      {
        RSSList.firstChild.setAttribute(attr, val);
      }
    });
  }
}

// This is an assign function that copies full descriptors (ripped off from MDN)
function inforsscompleteAssign(target, ...sources)
{
  sources.forEach(source => {
    let descriptors = Object.keys(source).reduce((descriptors, key) => {
      descriptors[key] = Object.getOwnPropertyDescriptor(source, key);
      return descriptors;
    }, {});
    // by default, Object.assign copies enumerable Symbols too
    Object.getOwnPropertySymbols(source).forEach(sym => {
      let descriptor = Object.getOwnPropertyDescriptor(source, sym);
      if (descriptor.enumerable) {
        descriptors[sym] = descriptor;
      }
    });
    Object.defineProperties(target, descriptors);
  });
  return target;
}

//A note: I can't use Object.assign here as it has getters/setters
//JS2017 has Object.getOwnPropertyDescriptors() and I could do
//XML_Repository.prototype = Object.create(
//  XML_Repository.prototype,
//  Object.getOwnPropertyDescriptors({...}));
//I think

inforsscompleteAssign(XML_Repository.prototype, {
  //--------------- Should be read only properties ------------------------

  //----------------------------------------------------------------------------
  //FIXME THis is only used in one place and I'm not sure if it should be used
  //there at all.
  is_valid()
  {
    return RSSList != null;
  },

  //----------------------------------------------------------------------------
  // Get all the feeds / groups we have configured
  // Returns a dynamic NodeList
  get_all()
  {
    return RSSList.getElementsByTagName("RSS");
  },

  // Gets the configured groups
  // Returns a static NodeList
  get_groups()
  {
    return RSSList.querySelectorAll("RSS[type=group]");
  },

  // Gets the configured feeds
  // Returns a static NodeList
  get_feeds()
  {
    return RSSList.querySelectorAll("RSS:not([type=group])");
  },

  //Get the full name of the configuration file.
  get_filepath()
  {
    return inforss.get_profile_file(INFORSS_REPOSITORY);
  },

  //------------------ to here

  /** Get the default feed icon
   *
   * @returns {string} The default feed icon
   */
  get Default_Feed_Icon()
  {
    return INFORSS_DEFAULT_ICO;
  },

  //----------------------------------------------------------------------------
  //style of tooltip on headline, can be "description", "title", "allInfo" or
  //"article" (which most of code treats as default)
  //FIXME Replace this with appropriate properties. (see below)
  get headline_tooltip_style()
  {
    return RSSList.firstChild.getAttribute("tooltip");
  },

  set headline_tooltip_style(val)
  {
    RSSList.firstChild.setAttribute("tooltip", val);
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
    return parseInt(RSSList.firstChild.getAttribute("clickHeadline"), 10);
  },

  set headline_action_on_click(val)
  {
    RSSList.firstChild.setAttribute("clickHeadline", val);
  },

  //----------------------------------------------------------------------------
  //Get the location of the headline bar.
  get in_status_bar() { return 0; },
  get at_top() { return 1; },
  get at_bottom() { return 2; },

  get headline_bar_location()
  {
    return RSSList.firstChild.getAttribute("separateLine") == "false" ?
              this.in_status_bar :
           RSSList.firstChild.getAttribute("linePosition") == "top" ?
              this.at_top:
              this.at_bottom;
  },

  set headline_bar_location(loc)
  {
    switch (loc)
    {
      case this.in_status_bar:
        RSSList.firstChild.setAttribute("separateLine", "false");
        break;

      case this.at_top:
        RSSList.firstChild.setAttribute("separateLine", "true");
        RSSList.firstChild.setAttribute("linePosition", "top");
        break;

      case this.at_bottom:
        RSSList.firstChild.setAttribute("separateLine", "true");
        RSSList.firstChild.setAttribute("linePosition", "bottom");
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
    const type = RSSList.firstChild.getAttribute("mouseWheelScroll");
    return type == "pixel" ? this.By_Pixel :
           type == "pixels" ? this.By_Pixels : this.By_Headline;
  },

  set headline_bar_mousewheel_scroll(scroll)
  {
    RSSList.firstChild.setAttribute("mouseWheelScroll", (() =>
    {
      switch (scroll)
      {
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
    return parseInt(RSSList.firstChild.getAttribute("scrolling"), 10);
  },

  set headline_bar_scroll_style(style)
  {
    RSSList.firstChild.setAttribute("scrolling", style);
  },

  //----------------------------------------------------------------------------
  //Get the scrolling direction (rtl/ltr)
  //FIXME Should be disabled on option screen when not appropriate
  //FIXME Shouldn't be raw ascii
  get headline_bar_scrolling_direction()
  {
    return RSSList.firstChild.getAttribute("scrollingdirection");
  },

  set headline_bar_scrolling_direction(dir)
  {
    RSSList.firstChild.setAttribute("scrollingdirection", dir);
  },

  //----------------------------------------------------------------------------
  //Get what to display on the next cycling, either "next" or "random"
  //FIXME Shouldn't be enabled if not cycling
  //FIXME Replace this with appropriate properties (or boolean)
  get headline_bar_cycle_type()
  {
    return RSSList.firstChild.getAttribute("nextFeed");
  },

  set headline_bar_cycle_type(type)
  {
    RSSList.firstChild.setAttribute("nextFeed", type);
  },

  //----------------------------------------------------------------------------
  //Weight of font. This can be 'bolder' or 'normal'
  //FIXME store like this in config, making this a straight string attribute
  get recent_headline_font_weight()
  {
    return RSSList.firstChild.getAttribute("bold") == "true" ? "bolder" : "normal";
  },

  set recent_headline_font_weight(val)
  {
    RSSList.firstChild.setAttribute("bold", val == "bolder");
  },

  //----------------------------------------------------------------------------
  //Style of font. This can be 'italic' or 'normal' (i.e. roman)
  //FIXME store like this in config, making this a straight string attribute
  get recent_headline_font_style()
  {
    return RSSList.firstChild.getAttribute("italic") == "true" ? "italic" : "normal";
  },

  set recent_headline_font_style(val)
  {
    RSSList.firstChild.setAttribute("italic", val == "italic");
  },

  //----------------------------------------------------------------------------
  //Sorting style for main menu. May be asc, des or off.
  get menu_sorting_style()
  {
    return RSSList.firstChild.getAttribute("sortedMenu");
  },

  set menu_sorting_style(val)
  {
    RSSList.firstChild.setAttribute("sortedMenu", val);
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
    RSSList.firstChild.setAttribute("scrolling",
      this.headline_bar_scroll_style == this.Static_Display ? "1" : "0");
    this.save();
  },

  //----------------------------------------------------------------------------
  setQuickFilter(active, filter)
  {
    RSSList.firstChild.setAttribute("quickFilterActif", active);
    RSSList.firstChild.setAttribute("quickFilter", filter);
    this.save();
  },

  //----------------------------------------------------------------------------
  getQuickFilter()
  {
    return RSSList.firstChild.getAttribute("quickFilter");
  },

  //----------------------------------------------------------------------------
  isQuickFilterActif()
  {
    return RSSList.firstChild.getAttribute("quickFilterActif") == "true";
  },

  //----------------------------------------------------------------------------
  switchShuffle()
  {
    if (RSSList.firstChild.getAttribute("nextFeed") == "next")
    {
      RSSList.firstChild.setAttribute("nextFeed", "random");
    }
    else
    {
      RSSList.firstChild.setAttribute("nextFeed", "next");
    }
    this.save();
  },

  //----------------------------------------------------------------------------
  switchDirection()
  {
    if (RSSList.firstChild.getAttribute("scrollingdirection") == "rtl")
    {
      RSSList.firstChild.setAttribute("scrollingdirection", "ltr");
    }
    else
    {
      RSSList.firstChild.setAttribute("scrollingdirection", "rtl");
    }
    this.save();
  },

  //----------------------------------------------------------------------------
  //FIXME Why does this live in prefs and not in the xml (or why doesn't more
  //live here?)
  //FIXME We calculate this branch 3 times in here.
  getServerInfo()
  {
    var prefs = Components.classes[
      "@mozilla.org/preferences-service;1"].getService(
      Components.interfaces.nsIPrefService).getBranch("inforss.");
    var serverInfo = null;
    if (prefs.prefHasUserValue("repository.user") == false)
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
      var user = prefs.getCharPref("repository.user");
      var password = null;
      var server = prefs.getCharPref("repository.server");
      var protocol = prefs.getCharPref("repository.protocol");
      var autosync = null;
      if (prefs.prefHasUserValue("repository.autosync") == false)
      {
        autosync = false;
      }
      else
      {
        autosync = prefs.getBoolPref("repository.autosync");
      }
      if ((user.length > 0) && (server.length > 0))
      {
        password = this.readPassword(protocol + server, user);
      }
      serverInfo = {
        protocol: protocol,
        server: server,
        directory: prefs.getCharPref("repository.directory"),
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
    var prefs = Components.classes[
      "@mozilla.org/preferences-service;1"].getService(
      Components.interfaces.nsIPrefService).getBranch("inforss.");
    prefs.setCharPref("repository.protocol", protocol);
    prefs.setCharPref("repository.server", server);
    prefs.setCharPref("repository.directory", directory);
    prefs.setCharPref("repository.user", user);
    prefs.setBoolPref("repository.autosync", autosync);
    if ((user != "") && (password != ""))
    {
      this.storePassword(protocol + server, user, password);
    }
  },


  //----------------------------------------------------------------------------
  //FIXME I don't think any of these password functions have anything to do
  //with this class
  storePassword(url, user, password)
  {
    var loginInfo = new LoginInfo(url,
                                  'User Registration',
                                  null,
                                  user,
                                  password,
                                  "",
                                  "");
    try
    {
      LoginManager.removeLogin(loginInfo);
    }
    catch (e)
    {}
    LoginManager.addLogin(loginInfo);
  },


  //----------------------------------------------------------------------------
  readPassword(url, user)
  {
    try
    {
      // Find users for the given parameters
      let logins = LoginManager.findLogins({}, url, 'User Registration', null);
      // Find user from returned array of nsILoginInfo objects
      for (let login of logins)
      {
        if (login.username == user)
        {
          return login.password;
        }
      }
    }
    catch (ex)
    {}
    return "";
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
        feed.removeChild(child);
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
    const child = RSSList.createElement("GROUP");
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
    let playLists = RSSList.createElement("playLists");
    for (let item of playlist)
    {
      const play = RSSList.createElement("playList");
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
    const filt = RSSList.createElement("FILTER");
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
    return RSSList.querySelector('RSS[url="' + url + '"]');
  },

  //----------------------------------------------------------------------------
  save()
  {
    this._save(RSSList);
  },

  //----------------------------------------------------------------------------
  _save(list)
  {
    try
    {
      //FIXME should make this atomic write to new/delete/rename
      let file = this.get_filepath();
      let outputStream = new FileOutputStream(file, -1, -1, 0);
      new XMLSerializer().serializeToStream(list, outputStream, "UTF-8");
      outputStream.close();
      //FIXME also add this to the inforssXML reader
      let prefs = Components.classes[
        "@mozilla.org/preferences-service;1"].getService(
        Components.interfaces.nsIPrefService).getBranch("inforss.");
      prefs.setBoolPref("debug.alert",
                        list.firstChild.getAttribute("debug") == "true");
      prefs.setBoolPref("debug.log",
                        list.firstChild.getAttribute("log") == "true");
      prefs.setBoolPref("debug.statusbar",
                        list.firstChild.getAttribute("statusbar") == "true");
    }
    catch (e)
    {
      inforss.debug(e);
    }
  },

  add_group(name)
  {
    return this.add_item(name, name, name, null, null, null, "group");
  },

  //----------------------------------------------------------------------------
  add_item(title, description, url, link, user, password, type)
  {
    inforss.traceIn();
    try
    {
      if (RSSList == null)
      {
        RSSList = new DOMParser().parseFromString('<LIST-RSS/>', 'text/xml');
/**/console.log("created empty rss", RSSList)
      }
      return this._new_item(RSSList,
                            title,
                            description,
                            url,
                            link,
                            user,
                            password,
                            type);
    }
    catch (e)
    {
      inforss.debug(e);
      return null;
    }
    finally
    {
      inforss.traceOut();
    }
  },

  //----------------------------------------------------------------------------
  //FIXME maybe should pass the icon?
  _new_item(list, title, description, url, link, user, password, type)
  {
    inforss.traceIn();
    try
    {
      //FIXME This needs to use/match the default item array for when updating
      //to a new version.
      let elem = list.createElement("RSS");
      elem.setAttribute("url", url);
      elem.setAttribute("title", title);
      elem.setAttribute("description",
                        description == null || description == "" ?
                          title : description);
      elem.setAttribute("type", type);
      if (type == "group")
      {
        elem.setAttribute("icon", this.feeds_defaults_group_icon);
        elem.setAttribute("playlist", "false");
        elem.setAttribute("filterPolicy", "0");
      }
      else
      {
        elem.setAttribute("link", link == null || link == "" ? url : link);
        if (user != null && user != "")
        {
          elem.setAttribute("user", user);
          this.storePassword(url, user, password);
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
        elem.setAttribute("icon", INFORSS_DEFAULT_ICO);
        elem.setAttribute("refresh", this.feeds_default_refresh_time);
      }
      elem.setAttribute("selected", "false");
      elem.setAttribute("activity", "true");
      elem.setAttribute("filter", "all");
      elem.setAttribute("filterCaseSensitive", "true");
      elem.setAttribute("groupAssociated", "false"); //for a group?
      elem.setAttribute("group", type == "group"); //this is insane
      elem.setAttribute("encoding", "");

      list.firstChild.appendChild(elem);
      return elem;
    }
    catch (e)
    {
      inforss.debug(e);
      return null;
    }
    finally
    {
      inforss.traceOut();
    }
  },

  //FIXME Move this back to OPML code
  export_to_OPML(filePath, progress)
  {
    //FIXME Should do an atomic write (to a temp file and then rename)
    //Might be better to just generate a string and let the client resolve where
    //to put it.
    let opmlFile = new LocalFile(filePath);
    let stream = new FileOutputStream(opmlFile, -1, -1, 0);
    let sequence = Promise.resolve(1);
    //FIXME Should just create the opml document then stream it, but need an
    //async stream to get the feedback.
    let opml = new DOMParser().parseFromString("<opml/>", "text/xml");
    let str = '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<opml version="1.0">\n' +
      '  <head>\n' +
      '    <title>InfoRSS Data</title>\n' +
      '  </head>\n' +
      '  <body>\n';
    stream.write(str, str.length);
    let serializer = new XMLSerializer();
    let items = RSSList.querySelectorAll("RSS:not([type=group])");
    for (let iteml of items)
    {
      let item = iteml; //Hack - according to JS6 this is unnecessary
      sequence = sequence.then(i =>
      {
        let outline = opml.createElement("outline");
        outline.setAttribute("xmlHome", item.getAttribute("link"));
        outline.setAttribute("xmlUrl", item.getAttribute("url"));

        for (let attribute of opml_attributes)
        {
          outline.setAttribute(attribute, item.getAttribute(attribute));
        }

        serializer.serializeToStream(outline, stream, "UTF-8");
        stream.write("\n", "\n".length);
        progress(i, items.length);
        //Give the javascript machine a chance to display the progress bar.
        return new Promise(function(resolve /*, reject*/ )
        {
          setTimeout(i => resolve(i + 1), 0, i);
        });
      });
    }
    sequence = sequence.then(function()
    {
      str = '  </body>\n' + '</opml>';
      stream.write(str, str.length);
      stream.close();
    });
    return sequence;
  },

  //----------------------------------------------------------------------------

  backup()
  {
    try
    {
      let file = this.get_filepath();
      if (file.exists())
      {
        let backup = inforss.get_profile_file(INFORSS_BACKUP);
        if (backup.exists())
        {
          backup.remove(true);
        }
        file.copyTo(null, INFORSS_BACKUP);
      }
    }
    catch (e)
    {
      inforss.debug(e);
    }
  },

  //----------------------------------------------------------------------------
  //FIXME Move this back to OPML code?
  import_from_OPML(text, mode, progress)
  {
    let domFile = new DOMParser().parseFromString(text, "text/xml");
    if (domFile.documentElement.nodeName != "opml")
    {
      return null;
    }

    let list = RSSList.cloneNode(mode == MODE_APPEND);

    let sequence = Promise.resolve(
    {
      count: 1,
      list: list
    });
    let items = domFile.querySelectorAll("outline[type=rss], outline[xmlUrl]");
    for (let iteml of items)
    {
      let item = iteml; //Hack for non compliant browser
      sequence = sequence.then(where =>
      {
        let link = item.hasAttribute("xmlHome") ? item.getAttribute("xmlHome") :
          item.hasAttribute("htmlUrl") ? item.getAttribute("htmlUrl") :
          null;
        let rss = this._new_item(where.list,
          item.getAttribute("title"),
          item.getAttribute("text"),
          item.getAttribute("xmlUrl"),
          link,
          //Not entirely clear to me why we
          //export username to OPML
          null,
          null,
          item.getAttribute("type"));

        for (let attribute of opml_attributes)
        {
          if (item.hasAttribute(attribute))
          {
            rss.setAttribute(attribute, item.getAttribute(attribute));
          }
        }

        if (!rss.hasAttribute("icon") || rss.getAttribute("icon") == "")
        {
          //FIXME - findicon should in fact be async, would need a module for it
          //The mozilla api is useless. The following works, but only sometimes,
          //and seems to require having the page visited in the right way:
          /*
                  const Cc = Components.classes;
                  const Ci = Components.interfaces;

                  const IO = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
                  let link = rss.getAttribute('link');
                  console.log(link);
                  let url = IO.newURI(link, null, null);

                  const FaviconService = Cc["@mozilla.org/browser/favicon-service;1"].getService(Ci.nsIFaviconService);
                  const asyncFavicons = FaviconService.QueryInterface(Ci.mozIAsyncFavicons);

                  asyncFavicons.getFaviconDataForPage(url, function(aURI, aDataLen, aData, aMimeType) {
                    console.log(1080, aURI.asciiSpec, aDataLen, aData, aMimeType);
                  });

                  asyncFavicons.getFaviconURLForPage(url, function(aURI, aDataLen, aData, aMimeType) {
                    console.log(1084, aURI.asciiSpec, aDataLen, aData, aMimeType);
                  });

                  if (link.startsWith('http:'))
                  {
                    link = link.slice(0, 4) + 's' + link.slice(4);
                    console.log(link);
                    url = IO.newURI(link, null, null);
                    asyncFavicons.getFaviconDataForPage(url, function(aURI, aDataLen, aData, aMimeType) {
                      console.log(1080, aURI.asciiSpec, aDataLen, aData, aMimeType);
                    });
                  }
          */
          rss.setAttribute("icon", inforssFindIcon(rss));
        }

        //Possibly want to do tsomething like this, though this would lose all
        //the custom settings above. Also if we did this we wouldn't need to add
        //them to the list.
        //var observerService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
        //observerService.notifyObservers(null, "addFeed", rss.getAttribute("url"));

        progress(where.count, items.length);
        //Give the javascript machine a chance to display the progress bar.
        return new Promise(function(resolve /*, reject*/ )
        {
          setTimeout(where =>
          {
            where.count = where.count + 1;
            resolve(where);
          }, 0, where);
        });
      });
    }
    sequence = sequence.then(where =>
    {
      this.backup();
      //FIXME. Do not update the list it just causes grief
      /**/console.log("suppressed setting to ", where);
      inforss.debug(new Error());
      //RSSList = where.list;
      return new Promise(resolve => resolve(where.list.firstChild.childNodes.length));
    });
    return sequence;
  },

  //----------------------------------------------------------------------------
  //FIXME once this is all in its own class, this should be in the "constructor"
  //need to be a bit careful about alerting the error if it's possible to keep
  //the error handling outside of here.
  read_configuration()
  {
    let file = this.get_filepath();
    if (!file.exists() || file.fileSize == 0)
    {
      this.reset_xml_to_default();
    }
    let is = new FileInputStream(file, -1, -1, 0);
    let sis = new ScriptableInputStream(is);
    let data = sis.read(-1);
    sis.close();
    is.close();
    this.load_from_string(data);
  },

  //load configuration from xml string.
  //FIXME Should this take a stream instead?
  //FIXME Why would you convert utf-8 to utf-8?
  load_from_string(data)
  {
    let uConv = new UTF8Converter();
    data = uConv.convertStringToUTF8(data, "UTF-8", false);
    let new_list = new DOMParser().parseFromString(data, "text/xml");
    this._adjust_repository(new_list);
    RSSList = new_list;
  },

  //write configuration to xml string.
  //FIXME Should this take a stream instead?
  to_string()
  {
    return new XMLSerializer().serializeToString(RSSList);
  },

  //----------------------------------------------------------------------------
  _convert_4_to_5(list)
  {
    let config = list.firstChild;
    let rename_attribute = function(old_name, new_name)
    {
      if (config.hasAttribute(old_name))
      {
        if (!config.hasAttribute(new_name))
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
    for (let item of list.getElementsByTagName("RSS"))
    {
      if (item.hasAttribute("password"))
      {
        if (item.getAttribute("password") != "")
        {
          inforssXMLRepository.storePassword(item.getAttribute("url"),
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
    let config = list.firstChild;
    let rename_attribute = function(old_name, new_name)
    {
      if (config.hasAttribute(old_name))
      {
        if (!config.hasAttribute(new_name))
        {
          config.setAttribute(new_name, config.getAttribute(old_name));
        }
        config.removeAttribute(old_name);
      }
    };
    rename_attribute("DefaultPurgeHistory", "defaultPurgeHistory");
    rename_attribute("shuffleicon", "shuffleIcon");

    let items = list.getElementsByTagName("RSS");
    for (let item of items)
    {
      if (item.hasAttribute("user") &&
          (item.getAttribute("user") == "" ||
           item.getAttribute("user") == "null"))
      {
        item.removeAttribute("user");
      }
      if (item.getAttribute("type") == "html" &&
          !item.hasAttribute("htmlDirection"))
      {
        item.setAttribute("htmlDirection", "asc");
      }
      if (!item.hasAttribute("browserHistory"))
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
        item.setAttribute("icon", INFORSS_DEFAULT_ICO);
      }
    }

    this._set_defaults(list);
  },

  _convert_6_to_7(list)
  {
    let config = list.firstChild;
    config.removeAttribute("mouseEvent");
    config.removeAttribute("net");
  },

  _convert_7_to_8(list)
  {
    let config = list.firstChild;
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
      else if (!isNaN(fontSize))
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
    for (let item of list.getElementsByTagName("RSS"))
    {
      item.removeAttribute("acknowledgeDate");
    }
  },

  //----------------------------------------------------------------------------
  _adjust_repository(list)
  {
    let config = list.firstChild;
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

    //FIXME shouldn't have irrelevant stuff in groups

    //FIXME this should be done properly when saving and then it becomes part of
    //a normal convert.
    {
      let items = list.getElementsByTagName("RSS");
      for (let item of items)
      {
        item.setAttribute("groupAssociated", "false");
      }
      for (let group of items)
      {
        if (group.getAttribute("type") == "group")
        {
          for (let feed of group.getElementsByTagName("GROUP"))
          {
            let url = feed.getAttribute("url");
            for (let item of items)
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
    if (config.getAttribute("version") != "9")
    {
      config.setAttribute("version", 9);
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
      quickFilterActif: false,
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
      synchronizationIcon: false,
      synchronizeIcon: false,
      timeslice: 90,
      tooltip: "description",
      viewAllIcon: true,
    };

    let config = list.firstChild;
    for (let attrib in defaults)
    {
      if (!defaults.hasOwnProperty(attrib))
      {
        continue;
      }
      if (!config.hasAttribute(attrib))
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
      icon: INFORSS_DEFAULT_ICO,
      lengthItem: config.getAttribute("defaultLenghtItem"),
      nbItem: config.getAttribute("defaultNbItem"),
      playPodcast: config.getAttribute("defaultPlayPodcast"),
      purgeHistory: config.getAttribute("defaultPurgeHistory"),
      refresh: config.getAttribute("refresh"),
      savePodcastLocation: config.getAttribute("savePodcastLocation"),
      selected: false,
      type: "rss",
    };
    for (let item of list.getElementsByTagName("RSS"))
    {
      for (let attrib in feed_defaults)
      {
        if (!feed_defaults.hasOwnProperty(attrib))
        {
          continue;
        }
        if (!item.hasAttribute(attrib))
        {
          item.setAttribute(attrib, feed_defaults[attrib]);
        }
      }
    }
  },

  //----------------------------------------------------------------------------

  reset_xml_to_default()
  {
    //Back up the current file if it exists so recovery may be attempted
    {
      let file = this.get_filepath();
      if (file.exists())
      {
        const INFORSS_INERROR = "inforss_xml.inerror";
        let dest = inforss.get_profile_file(INFORSS_INERROR);
        if (dest.exists())
        {
          dest.remove(false);
        }
        file.renameTo(inforss.get_profile_dir(), INFORSS_INERROR);
      }
    }

    //Copy the default setup.
    let source = inforss.get_resource_file("inforss.default");
    if (source.exists())
    {
      source.copyTo(inforss.get_profile_dir(), INFORSS_REPOSITORY);
    }
  },

});

Object.preventExtensions(XML_Repository);

//----------------------------------------------------------------------------
/* exported getCurrentRSS */
//FIXME Should be a method of the above
//FIXME Use document.querySelector
function getCurrentRSS()
{
  inforss.traceIn();
  try
  {
    for (let item of inforssXMLRepository.get_all())
    {
      if (item.getAttribute("selected") == "true")
      {
    ///**/console.log(RSSList.querySelector('RSS[selected="true"]'), item)
        return item;
      }
    }
  }
  finally
  {
    inforss.traceOut();
  }
    ///**/console.log(RSSList.querySelector('RSS[selected="true"]'), null)
  return null;
}

/* exported inforssXMLRepository */
var inforssXMLRepository = new XML_Repository();
Object.preventExtensions(inforssXMLRepository);
