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
/* globals inforssDebug, inforssTraceIn, inforssTraceOut */
Components.utils.import("chrome://inforss/content/modules/inforssDebug.jsm");

/* globals inforssGetResourceFile */
Components.utils.import("chrome://inforss/content/modules/inforssVersion.jsm");

//These should be in another module. Or at least not exported */
/* exported LocalFile */
const LocalFile = Components.Constructor("@mozilla.org/file/local;1",
  "nsILocalFile",
  "initWithPath");

/* exported FileInputStream */
const FileInputStream = Components.Constructor("@mozilla.org/network/file-input-stream;1",
  "nsIFileInputStream",
  "init");

/* exported ScriptableInputStream */
const ScriptableInputStream = Components.Constructor("@mozilla.org/scriptableinputstream;1",
  "nsIScriptableInputStream",
  "init");

  //FIXME This is a service
/* exported UTF8Converter */
const UTF8Converter = Components.Constructor("@mozilla.org/intl/utf8converterservice;1",
  "nsIUTF8ConverterService");

/* exported FileOutputStream */
const FileOutputStream = Components.Constructor("@mozilla.org/network/file-output-stream;1",
  "nsIFileOutputStream",
  "init");

const Properties = Components.classes["@mozilla.org/file/directory_service;1"]
                 .getService(Components.interfaces.nsIProperties);
const profile_dir = Properties.get("ProfD", Components.interfaces.nsIFile);

const LoginManager = Components.classes["@mozilla.org/login-manager;1"].getService(Components.interfaces.nsILoginManager);
const LoginInfo = Components.Constructor("@mozilla.org/login-manager/loginInfo;1", Components.interfaces.nsILoginInfo, "init");

//FIXME Turn this into a module, once we have all access to RSSList in here
//Note that inforssOption should have its own instance which is then copied
//once we do an apply. Jury is out on whether OPML import/export should work on
//the global/local instance...

/* global inforssFindIcon */

//To make this a module, will need to construct DOMParser
//https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsIDOMParser

/* exported MODE_APPEND */
const MODE_APPEND = 0;
/* exported MODE_REPLACE */
const MODE_REPLACE = 1;

//FIXME Should be hooked off profile_dir. The main problem is the rename below
const INFORSS_REPOSITORY = "inforss.xml";

/* exported INFORSS_DEFAULT_ICO */
const INFORSS_DEFAULT_ICO = "chrome://inforss/skin/default.ico";

/* exported RSSList */
var RSSList = null;

//----------------------------------------------------------------------------
const opml_attributes = [
  "acknowledgeDate",
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

XML_Repository.prototype = {
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
    const path = profile_dir.clone();
    path.append(INFORSS_REPOSITORY);
    return path;
  },

  //----------------------------------------------------------------------------
  //Debug settings (warning: also accessed via about:config)
  //----------------------------------------------------------------------------

  //----------------------------------------------------------------------------
  //Display debug messages in a popup
  debug_display_popup()
  {
    return RSSList.firstChild.getAttribute("debug") == "true";
  },

  //----------------------------------------------------------------------------
  //Display debug messages on the status bar
  debug_to_status_bar()
  {
    return RSSList.firstChild.getAttribute("statusbar") == "true";
  },

  //----------------------------------------------------------------------------
  //Display debug messages in the browser log
  debug_to_browser_log()
  {
    return RSSList.firstChild.getAttribute("log") == "true";
  },

  //----------------------------------------------------------------------------
  //Default values.
  //Note that these are given to the feed at the time the feed is created. If
  //you change the default, you'll only change feeds created in the future.
  //----------------------------------------------------------------------------

  //----------------------------------------------------------------------------
  //Default number of headlines to show
  //FIXME Using 9999 for 'unconstrained' is dubious style
  feeds_default_max_num_headlines()
  {
    return parseInt(RSSList.firstChild.getAttribute("defaultNbItem"), 10);
  },

  //----------------------------------------------------------------------------
  //Default max headline length to show (longer headlines will be truncated)
  //FIXME Using 9999 for 'unconstrained' is dubious style
  feeds_default_max_headline_length()
  {
    return parseInt(RSSList.firstChild.getAttribute("defaultLenghtItem"), 10);
  },

  //----------------------------------------------------------------------------
  //Default refresh time (time between polls)
  feeds_default_refresh_time()
  {
    return parseInt(RSSList.firstChild.getAttribute("refresh"), 10);
  },

  //----------------------------------------------------------------------------
  //Default number of days to retain a headline in the RDF file
  feeds_default_history_purge_days()
  {
    return parseInt(RSSList.firstChild.getAttribute("defaultPurgeHistory"), 10);
  },

  //----------------------------------------------------------------------------
  //Default state for playing podcast
  feed_defaults_play_podcast()
  {
    return RSSList.firstChild.getAttribute("defaultPlayPodcast") == "true";
  },

  //----------------------------------------------------------------------------
  //Default switch for whether or not to use browser history to determine if
  //headline has been read
  feed_defaults_use_browser_history()
  {
    return RSSList.firstChild.getAttribute("defaultBrowserHistory") == "true";
  },

  //----------------------------------------------------------------------------
  //Default icon for a group
  feeds_default_group_icon()
  {
    return RSSList.firstChild.getAttribute("defaultGroupIcon");
  },

  //----------------------------------------------------------------------------
  //Default location to which to save podcasts (if empty, they don't get saved)
  feeds_default_podcast_location()
  {
    return RSSList.firstChild.getAttribute("savePodcastLocation");
  },

  //----------------------------------------------------------------------------
  //Main menu should include an 'add' entry for each feed found on the current page
  menu_includes_page_feeds()
  {
    return RSSList.firstChild.getAttribute("currentfeed") == "true";
  },

  //----------------------------------------------------------------------------
  //Main menu should include an 'add' entry for all livemarks
  menu_includes_livemarks()
  {
    return RSSList.firstChild.getAttribute("livemark") == "true";
  },

  //----------------------------------------------------------------------------
  //Main menu should include an 'add' entry for the current clipboard contents
  //(if it looks something like a feed at any rate)
  menu_includes_clipboard()
  {
    return RSSList.firstChild.getAttribute("clipboard") == "true";
  },

  //----------------------------------------------------------------------------
  //Sorting style for main menu. May be asc, des or off.
  menu_sorting_style()
  {
    return RSSList.firstChild.getAttribute("sortedMenu");
  },

  //----------------------------------------------------------------------------
  //Main menu should show feeds that are part of a group. If this is off, it wont
  //show feeds that are in a group (or groups).
  menu_show_feeds_from_groups()
  {
    return RSSList.firstChild.getAttribute("includeAssociated") == "true";
  },

  //----------------------------------------------------------------------------
  //If on, each feed will have a submenu showing the "latest" (i.e. first in the
  //XML) 20 headlines.
  menu_show_headlines_in_submenu()
  {
    return RSSList.firstChild.getAttribute("submenu") == "true";
  },

  //----------------------------------------------------------------------------
  //main icon should show the icon for the current feed (rather than the globe)
  icon_shows_current_feed()
  {
    return RSSList.firstChild.getAttribute("synchronizeIcon") == "true";
  },

  //----------------------------------------------------------------------------
  //main icon should flash when there is activity (i.e. it reads a feed xml).
  icon_flashes_on_activity()
  {
    return RSSList.firstChild.getAttribute("flashingIcon") == "true";
  },

  //----------------------------------------------------------------------------
  //Shows or collapses the ticker display completely. This only really makes
  //sense if you have the display in the status bar.
  headline_bar_enabled()
  {
    return RSSList.firstChild.getAttribute("switch") == "true";
  },

  //----------------------------------------------------------------------------
  //Hide headlines once they've been viewed
  hide_viewed_headlines()
  {
    return RSSList.firstChild.getAttribute("hideViewed") == "true";
  },

  //----------------------------------------------------------------------------
  //Hide headlines that are considered 'old' (i.e. have been displayed for
  //a period of time, but not read)
  hide_old_headlines()
  {
    return RSSList.firstChild.getAttribute("hideOld") == "true";
  },

  //----------------------------------------------------------------------------
  //Remember displayed headlines and state
  remember_headlines()
  {
    return RSSList.firstChild.getAttribute("hideHistory") == "true";
  },

  //----------------------------------------------------------------------------
  //Show a toast (on my windows 10 it appears at the bottom right) on a new
  //headline
  show_toast_on_new_headline()
  {
    return RSSList.firstChild.getAttribute("popupMessage") == "true";
  },

  //----------------------------------------------------------------------------
  //Plays a sound ('beep' on linux, 'Notify' on windows) on a new headline
  play_sound_on_new_headline()
  {
    return RSSList.firstChild.getAttribute("playSound") == "true";
  },

  //----------------------------------------------------------------------------
  //style of tooltip on headline, can be "description", "title", "allInfo" or
  //"article" (which most of code treats as default)
  //FIXME Replace this with appropriate properties. (see below)
  headline_tooltip_style()
  {
    return RSSList.firstChild.getAttribute("tooltip");
  },

  //----------------------------------------------------------------------------
  //When clicking on a headline, article loads in
  get new_default_tab() { return 0; },
  get new_background_tab() { return 1; },
  get new_foreground_tab() { return 2; },
  get new_window() { return 3; },
  get current_tab() { return 4; },

  headline_action_on_click()
  {
    return parseInt(RSSList.firstChild.getAttribute("clickHeadline"), 10);
  },

  //----------------------------------------------------------------------------
  //This is pretty much completely the opposite of a timeslice. It returns the
  //delay between processing individual headlines (in milliseconds)
  headline_processing_backoff()
  {
    return parseInt(RSSList.firstChild.getAttribute("timeslice"), 10);
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
  //If the headline bar is collapsed, it only uses enough of the status bar to
  //display necessary headlines.
  //FIXME should be grayed out if not using the status bar
  get headline_bar_collapsed()
  {
    return RSSList.firstChild.getAttribute("collapseBar") == "true";
  },

  set headline_bar_collapsed(state)
  {
    RSSList.firstChild.setAttribute("collapseBar", state ? "true" : "false");
  },

  //----------------------------------------------------------------------------
  //How much the mouse wheel will scroll.
  //'pixel' scrolls by the scrolling increment
  //'pixels' appears to scroll 10 'pixels' at a time.
  get by_pixel() { return 0; },
  get by_pixels() { return 1; },
  get by_headline() { return 2; },

  get headline_bar_mousewheel_scroll()
  {
    const type = RSSList.firstChild.getAttribute("mouseWheelScroll");
    return type == "pixel" ? this.by_pixel :
           type == "pixels" ? this.by_pixels : this.by_headline;
  },

  set headline_bar_mousewheel_scroll(scroll)
  {
    RSSList.firstChild.setAttribute("mouseWheelScroll", (() =>
    {
      switch (scroll)
      {
        case this.by_pixel:
          return "pixel";

        case this.by_pixels:
          return "pixels";

        case this.by_headline:
          return "headline";
      }
    })());
  },
  //----------------------------------------------------------------------------
  //Indicate how headlines appear/disappear
  //For fade, instead of scrolling, one headline is displayed, and it fades
  //into the next one. Useful for status bar.
  get static_display() { return 0; },
  get scrolling_display() { return 1; },
  get fade_into_next() { return 2; },

  get headline_bar_scroll_style()
  {
    return parseInt(RSSList.firstChild.getAttribute("scrolling"), 10);
  },

  set headline_bar_scroll_style(style)
  {
    RSSList.firstChild.setAttribute("scrolling", style);
  },

  //----------------------------------------------------------------------------
  //Scrolling speed / fade rate from 1 (slow) to 30 (fast)
  //Not meaningful for static
  //FIXME Should be disabled on option screen when not appropriate
  //FIXME Description should change?
  get headline_bar_scroll_speed()
  {
    return parseInt(RSSList.firstChild.getAttribute("scrollingspeed"), 10);
  },

  set headline_bar_scroll_speed(speed)
  {
    RSSList.firstChild.setAttribute("scrollingspeed", speed);
  },

  //----------------------------------------------------------------------------
  //The number of pixels a headline is scrolled by, from 1 to 3.
  //Only meaningful for scrolling, not static or fade
  //FIXME Should be disabled on option screen when not appropriate
  get headline_bar_scroll_increment()
  {
    return parseInt(RSSList.firstChild.getAttribute("scrollingIncrement"), 10);
  },

  set headline_bar_scroll_increment(increment)
  {
    RSSList.firstChild.setAttribute("scrollingIncrement", increment);
  },

  //----------------------------------------------------------------------------
  //Stop scrolling when mouse is over headline. I presume this stops fading as
  //well.
  //FIXME Should be disabled on option screen when not appropriate
  get headline_bar_stop_on_mouseover()
  {
    return RSSList.firstChild.getAttribute("stopscrolling") == "true";
  },

  set headline_bar_stop_on_mouseover(state)
  {
    RSSList.firstChild.setAttribute("stopscrolling", state ? "true" : "false");
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
  //Cycle between feeds on the headline bar
  //FIXME If not enabled, the left/right icons shouldn't appear in the headline
  //bar
  get headline_bar_cycle_feeds()
  {
    return RSSList.firstChild.getAttribute("cycling") == "true";
  },

  set headline_bar_cycle_feeds(state)
  {
    RSSList.firstChild.setAttribute("cycling", state ? "true" : "false");
  },

  //----------------------------------------------------------------------------
  //Interval between cycling feeds (in minutes)
  //FIXME Shouldn't be enabled if not cycling
  get headline_bar_cycle_interval()
  {
    return parseInt(RSSList.firstChild.getAttribute("cyclingDelay"), 10);
  },

  set headline_bar_cycle_interval(interval)
  {
    RSSList.firstChild.setAttribute("cyclingDelay", interval);
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
  //Cycle feeds in group when set
  //FIXME Shouldn't be enabled if not cycling
  get headline_bar_cycle_in_group()
  {
    return RSSList.firstChild.getAttribute("cycleWithinGroup") == "true";
  },

  set headline_bar_cycle_in_group(state)
  {
    RSSList.firstChild.setAttribute("cycleWithinGroup", state ? "true" : "false");
  },

  //----------------------------------------------------------------------------
  //Show button to mark all headlines as read
  get headline_bar_show_mark_all_as_read_button()
  {
    return RSSList.firstChild.getAttribute("readAllIcon") == "true";
  },

  set headline_bar_show_mark_all_as_read_button(state)
  {
    RSSList.firstChild.setAttribute("readAllIcon", state ? "true" : "false");
  },

  //----------------------------------------------------------------------------
  //Show button to switch to previous feed
  //FIXME Does this make sense when not cycling?
  get headline_bar_show_previous_feed_button()
  {
    return RSSList.firstChild.getAttribute("previousIcon") == "true";
  },

  set headline_bar_show_previous_feed_button(state)
  {
      RSSList.firstChild.setAttribute("previousIcon", state ? "true" : "false");
  },

  //----------------------------------------------------------------------------
  //Show button to toggle scrolling
  get headline_bar_show_pause_toggle()
  {
    return RSSList.firstChild.getAttribute("pauseIcon") == "true";
  },

  set headline_bar_show_pause_toggle(state)
  {
    RSSList.firstChild.setAttribute("pauseIcon", state ? "true" : "false");
  },

  //----------------------------------------------------------------------------
  //Show button to switch to next feed
  //FIXME Does this make sense when not cycling?
  get headline_bar_show_next_feed_button()
  {
    return RSSList.firstChild.getAttribute("nextIcon") == "true";
  },

  set headline_bar_show_next_feed_button(state)
  {
    RSSList.firstChild.setAttribute("nextIcon", state ? "true" : "false");
  },

  //----------------------------------------------------------------------------
  //Show button to view all headlines
  get headline_bar_show_view_all_button()
  {
    return RSSList.firstChild.getAttribute("viewAllIcon") == "true";
  },

  set headline_bar_show_view_all_button(state)
  {
    RSSList.firstChild.setAttribute("viewAllIcon", state ? "true" : "false");
  },

  //----------------------------------------------------------------------------
  //Show button to perform manual refresh
  //FIXME Whatever that is
  get headline_bar_show_manual_refresh_button()
  {
    return RSSList.firstChild.getAttribute("refreshIcon") == "true";
  },

  set headline_bar_show_manual_refresh_button(state)
  {
    RSSList.firstChild.setAttribute("refreshIcon", state ? "true" : "false");
  },

  //----------------------------------------------------------------------------
  //Show button to toggle display of old (not clicked for a while) headlines
  //FIXME How old exactly is old?
  get headline_bar_show_hide_old_headlines_toggle()
  {
    return RSSList.firstChild.getAttribute("hideOldIcon") == "true";
  },

  set headline_bar_show_hide_old_headlines_toggle(state)
  {
    RSSList.firstChild.setAttribute("hideOldIcon", state ? "true" : "false");
  },

  //----------------------------------------------------------------------------
  //Show button to toggle display of viewed headlines
  get headline_bar_show_hide_viewed_headlines_toggle()
  {
    return RSSList.firstChild.getAttribute("hideViewedIcon") == "true";
  },

  set headline_bar_show_hide_viewed_headlines_toggle(state)
  {
    RSSList.firstChild.setAttribute("hideViewedIcon", state ? "true" : "false");
  },

  //----------------------------------------------------------------------------
  //Show button to toggle shuffling of headlines
  //FIXME Should this only be enabled when cycling is on?
  get headline_bar_show_shuffle_toggle()
  {
    return RSSList.firstChild.getAttribute("shuffleIcon") == "true";
  },

  set headline_bar_show_shuffle_toggle(state)
  {
    RSSList.firstChild.setAttribute("shuffleIcon", state ? "true" : "false");
  },

  //----------------------------------------------------------------------------
  //Show button to toggle scrolling direction
  //FIXME Only if scrolling enabled? (though not you can enable scrolling from
  //the headline bar)
  get headline_bar_show_direction_toggle()
  {
    return RSSList.firstChild.getAttribute("directionIcon") == "true";
  },

  set headline_bar_show_direction_toggle(state)
  {
    RSSList.firstChild.setAttribute("directionIcon", state ? "true" : "false");
  },

  //----------------------------------------------------------------------------
  //Show button to toggle scrolling on/off (this completely enables/disables)
  get headline_bar_show_scrolling_toggle()
  {
    return RSSList.firstChild.getAttribute("scrollingIcon") == "true";
  },

  set headline_bar_show_scrolling_toggle(state)
  {
    RSSList.firstChild.setAttribute("scrollingIcon", state ? "true" : "false");
  },

  //----------------------------------------------------------------------------
  //Show button to perform manual synchronisation
  //FIXME Which is what?
  get headline_bar_show_manual_synchronisation_button()
  {
    return RSSList.firstChild.getAttribute("synchronizationIcon") == "true";
  },

  set headline_bar_show_manual_synchronisation_button(state)
  {
    RSSList.firstChild.setAttribute("synchronizationIcon", state ? "true" : "false");
  },

  //----------------------------------------------------------------------------
  //Show button to configure quick filter
  get headline_bar_show_quick_filter_button()
  {
    return RSSList.firstChild.getAttribute("filterIcon") == "true";
  },

  set headline_bar_show_quick_filter_button(state)
  {
    RSSList.firstChild.setAttribute("filterIcon", state ? "true" : "false");
  },

  //----------------------------------------------------------------------------
  //Show button to open feed home page
  //FIXME Doesn't make sense for certain types of feed
  get headline_bar_show_home_button()
  {
    return RSSList.firstChild.getAttribute("homeIcon") == "true";
  },

  set headline_bar_show_home_button(state)
  {
    RSSList.firstChild.setAttribute("homeIcon", state ? "true" : "false");
  },

  //----------------------------------------------------------------------------
  //Display the feeds icon with each headline
  headline_shows_feed_icon()
  {
    return RSSList.firstChild.getAttribute("favicon") == "true";
  },

  //----------------------------------------------------------------------------
  //Display podcast enclosers with each headline
  headline_shows_enclosure_icon()
  {
    return RSSList.firstChild.getAttribute("displayEnclosure") == "true";
  },

  //----------------------------------------------------------------------------
  //Display ban icon (which is probably mark as read) with each headline
  headline_shows_ban_icon()
  {
    return RSSList.firstChild.getAttribute("displayBanned") == "true";
  },

  //----------------------------------------------------------------------------
  //Font family in which to display headlines.
  //'inherit' or a font/family name.
  headline_font_family()
  {
    return RSSList.firstChild.getAttribute("font");
  },

  //----------------------------------------------------------------------------
  //Font size in which to display headlines
  //'inherit' or something else that CSS supports
  headline_font_size()
  {
    return RSSList.firstChild.getAttribute("fontSize");
  },

  //----------------------------------------------------------------------------
  //Text colour for headlines
  //This can be 'default', or an HTML colour value (hex, rgb)
  //FIXME replace with mode and value. Also should 'default' be 'inherit'?
  headline_text_colour()
  {
    return RSSList.firstChild.getAttribute("defaultForegroundColor");
  },

  //----------------------------------------------------------------------------
  //Returns how many seconds a hedline remains as 'recent'
  recent_headline_max_age()
  {
    return parseInt(RSSList.firstChild.getAttribute("delay"), 10);
  },

  //----------------------------------------------------------------------------
  //Text colour for recent headlines
  //This can be 'auto', 'sameas' or a colour value. Note that the code is
  //somewhat obscure (and duplicated) if you have this set to auto and have a
  //non-default background.
  recent_headline_text_colour()
  {
    return RSSList.firstChild.getAttribute("foregroundColor");
  },

  //----------------------------------------------------------------------------
  //Weight of font. This can be 'bolder' or 'normal'
  recent_headline_font_weight()
  {
    return RSSList.firstChild.getAttribute("bold") == "true" ? "bolder" : "normal";
  },

  //----------------------------------------------------------------------------
  //Style of font. This can be 'italic' or 'normal' (i.e. roman)
  recent_headline_font_style()
  {
    return RSSList.firstChild.getAttribute("italic") == "true" ? "italic" : "normal";
  },

  //----------------------------------------------------------------------------
  //Return the background colour for headlines.
  //This can be 'inherit' or a hex number
  recent_headline_background_colour()
  {
    return RSSList.firstChild.getAttribute("backgroundColour");
  },

  //----------------------------------------------------------------------------
  //The width of the headline area in the status bar
  get scrolling_area()
  {
    return parseInt(RSSList.firstChild.getAttribute("scrollingArea"), 10);
  },

  //----------------------------------------------------------------------------
  set scrolling_area(width)
  {
    RSSList.firstChild.setAttribute("scrollingArea", width);
  },

  ////////////
  //----------------------------------------------------------------------------
  setHideViewed(value)
  {
    RSSList.firstChild.setAttribute("hideViewed", value);
  },

  //----------------------------------------------------------------------------
  setHideOld(value)
  {
    RSSList.firstChild.setAttribute("hideOld", value);
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
      this.headline_bar_scroll_style == this.static_display ? "1" : "0");
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
  //FIXME Why does this live in prefs and not in the xml (or why doesn't more live here?)
  getServerInfo()
  {
    var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("inforss.");
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
      this.setServerInfo(serverInfo.protocol, serverInfo.server, serverInfo.directory, serverInfo.user, serverInfo.password, serverInfo.autosync);
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
    var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("inforss.");
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
    var loginInfo = new LoginInfo(url, 'User Registration', null, user, password, "", "");
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
      let prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("inforss.");
      prefs.setBoolPref("debug.alert", list.firstChild.getAttribute("debug") == "true");
      prefs.setBoolPref("debug.log", list.firstChild.getAttribute("log") == "true");
      prefs.setBoolPref("debug.statusbar", list.firstChild.getAttribute("statusbar") == "true");
    }
    catch (e)
    {
      inforssDebug(e);
    }
  },

  //----------------------------------------------------------------------------
  add_item(title, description, url, link, user, password, type)
  {
    inforssTraceIn();
    try
    {
      if (RSSList == null)
      {
        RSSList = new DOMParser().parseFromString('<LIST-RSS/>', 'text/xml');
        /**/console.log("created empty rss", RSSList);
      }
      return this._new_item(RSSList, title, description, url, link, user, password, type);
    }
    catch (e)
    {
      inforssDebug(e);
      return null;
    }
    finally
    {
      inforssTraceOut();
    }
  },

  //----------------------------------------------------------------------------
  //FIXME maybe should pass the icon?
  _new_item(list, title, description, url, link, user, password, type)
  {
    inforssTraceIn();
    try
    {
      let elem = list.createElement("RSS");
      elem.setAttribute("url", url);
      elem.setAttribute("title", title);
      elem.setAttribute("link", link == null || link == "" ? url : link);
      elem.setAttribute("description",
                        description == null || description == "" ? title : description);
      if (user != null && user != "")
      {
        elem.setAttribute("user", user);
        this.storePassword(url, user, password);
      }
      elem.setAttribute("type", type);
      //FIXME These also need to be updated in feeds_default array for when
      //updating to new version.
      elem.setAttribute("selected", "false");
      elem.setAttribute("nbItem", this.feeds_default_max_num_headlines());
      elem.setAttribute("lengthItem", this.feeds_default_max_headline_length());
      elem.setAttribute("playPodcast",
                        this.feed_defaults_play_podcast() ? "true" : "false");
      elem.setAttribute("savePodcastLocation",
                        this.feeds_default_podcast_location());
      elem.setAttribute("purgeHistory", this.feeds_default_history_purge_days());
      elem.setAttribute("browserHistory",
                        this.feed_defaults_use_browser_history() ? "true" : "false");
      elem.setAttribute("filterCaseSensitive", "true");
      elem.setAttribute("icon", INFORSS_DEFAULT_ICO);
      elem.setAttribute("refresh", this.feeds_default_refresh_time());
      elem.setAttribute("activity", "true");
      elem.setAttribute("filter", "all");
      elem.setAttribute("groupAssociated", "false");
      elem.setAttribute("group", "false");
      elem.setAttribute("filterPolicy", "0");
      elem.setAttribute("encoding", "");

      list.firstChild.appendChild(elem);
      return elem;
    }
    catch (e)
    {
      inforssDebug(e);
      return null;
    }
    finally
    {
      inforssTraceOut();
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
        let backup = profile_dir.clone();
        backup.append(INFORSS_BACKUP);
        if (backup.exists())
        {
          backup.remove(true);
        }
        file.copyTo(null, INFORSS_BACKUP);
      }
    }
    catch (e)
    {
      inforssDebug(e);
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
      /**/
      console.log("suppressed setting to ", where);
      /**/
      inforssDebug(new Error());
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
        (item.getAttribute("user") == "" || item.getAttribute("user") == "null"))
      {
        item.removeAttribute("user");
      }
      if (item.getAttribute("type") == "html" && !item.hasAttribute("htmlDirection"))
      {
        item.setAttribute("htmlDirection", "asc");
      }
      if (!item.hasAttribute("browserHistory"))
      {
        item.setAttribute("browserHistory", "true");
        if (item.getAttribute("url").indexOf("https://gmail.google.com/gmail/feed/atom") == 0 ||
          item.getAttribute("url").indexOf(".ebay.") != -1)
        {
          item.setAttribute("browserHistory", "false");
        }
      }
      if (item.getAttribute("type") == "group" && !item.hasAttribute("playlist"))
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
              if (item.getAttribute("type") != "group" && item.getAttribute("url") == url)
              {
                item.setAttribute("groupAssociated", "true");
                break;
              }
            }
          }
        }
      }
    }

    //NOTNOTENOTE Check this before release.
    //It should be set to what is up above
    if (config.getAttribute("version") != "7")
    {
      config.setAttribute("version", 7);
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
        let dest = profile_dir.clone();
        dest.append(INFORSS_INERROR);
        if (dest.exists())
        {
          dest.remove(false);
        }
        file.renameTo(profile_dir, INFORSS_INERROR);
      }
    }

    //Copy the default setup.
    let source = inforssGetResourceFile("inforss.default");
    if (source.exists())
    {
      source.copyTo(profile_dir, INFORSS_REPOSITORY);
    }
  },

};


//----------------------------------------------------------------------------
/* exported inforssGetItemFromUrl */
//FIXME Should be a method of the above
//FIXME replace with document.querySelector(RSS[url=url]) (i think)
function inforssGetItemFromUrl(url)
{
  inforssTraceIn();
  try
  {
    for (let item of inforssXMLRepository.get_all())
    {
      if (item.getAttribute("url") == url)
      {
        return item;
      }
    }
  }
  finally
  {
    inforssTraceOut();
  }
  return null;
}

//----------------------------------------------------------------------------
/* exported getCurrentRSS */
//FIXME Should be a method of the above
//FIXME Use document.querySelector
function getCurrentRSS()
{
  inforssTraceIn();
  try
  {
    for (let item of inforssXMLRepository.get_all())
    {
      if (item.getAttribute("selected") == "true")
      {
        return item;
      }
    }
  }
  finally
  {
    inforssTraceOut();
  }
  return null;
}

/* exported inforssXMLRepository */
var inforssXMLRepository = new XML_Repository();
