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
  "chrome://inforss/content/modules/inforss_Prompt.jsm", {}
);

const {
  complete_assign,
  remove_all_children,
  read_password,
  store_password
} = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Utils.jsm", {}
);

const {
  get_profile_dir,
  get_profile_file,
  get_resource_file,
  get_string
} = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Version.jsm", {}
);

const FileInputStream = Components.Constructor(
  "@mozilla.org/network/file-input-stream;1",
  "nsIFileInputStream",
  "init"
);

const ScriptableInputStream = Components.Constructor(
  "@mozilla.org/scriptableinputstream;1",
  "nsIScriptableInputStream",
  "init"
);

//FIXME This is a service
const UTF8Converter = Components.Constructor(
  "@mozilla.org/intl/utf8converterservice;1",
  "nsIUTF8ConverterService"
);

const FileOutputStream = Components.Constructor(
  "@mozilla.org/network/file-output-stream;1",
  "nsIFileOutputStream",
  "init"
);

const DOMParser = Components.Constructor("@mozilla.org/xmlextras/domparser;1",
                                         "nsIDOMParser");

const XMLSerializer = Components.Constructor(
  "@mozilla.org/xmlextras/xmlserializer;1",
  "nsIDOMSerializer"
);

const Inforss_Prefs = Components.classes[
  "@mozilla.org/preferences-service;1"].getService(
  Components.interfaces.nsIPrefService).getBranch("inforss.");

const { console } = Components.utils.import(
  "resource://gre/modules/Console.jsm", {}
);

const INFORSS_REPOSITORY = "inforss.xml";

const INFORSS_DEFAULT_ICON = "chrome://inforss/skin/default.ico";

const INFORSS_DEFAULT_GROUP_ICON = "chrome://inforss/skin/group.png";

const INFORSS_BACKUP = "inforss_xml.backup";

/** Get the full name of the configuration file.
 *
 * @returns {string} Path to configuration file.
 */
function get_filepath()
{
  return get_profile_file(INFORSS_REPOSITORY);
}

/** Configuration object.
 *
 * @class
 */
function Config()
{
  this._config = null;
  Object.seal(this);
}

/** This consists of settings for getters and setters for configuration
 * properties, as the majority of them can be done with boilerplate code.
 *
 * It also makes most of them a lot easier to write and updated.
 *
 * This object is a dictionary mapping configuration properties to
 * an xml attribute and type.
 *
 * Each entry in the dictionary is a dictionary contain at least the keys
 * "attr" and "type".
 *
 * "attr" is the name of the attribute in the xml file used to store the
 * configuration. It is worth noticing that all the attributes are stored in
 * the first element of the configuration, the rest of the configuration is a
 * list of feed objects.
 *
 * "type" describes the type of data stored in the attribute, and is one of
 * the following.
 *
 * "boolean": The setter expects to have a boolean passed.
 *            The getter will convert "true" and "false" strings to booleans.
 *
 * "number": Needs work!
 *           The setter expects (but does not check for) an integer to be
 *           passed.
 *           The getter will convert the string to an integer without much
 *           checking!
 *
 * "number_list": Has an extra attribute:
 *         list: [ "Property", ... ]
 *         The setter will take a value between 0 and the number of objects in
 *         the list, and store that number in the xml. It is an error to pass
 *         a value outside the range.
 *         The getter will return the appropriate number. If the number in the
 *         XML is not valid, zero will be returned.
 *         Each property name in the list will create a read-only property
 *         with the appropriate value.
 *
 *         For example, consider this:
 *         list: [ "Eggs", "Beans", "Chips" ]
 *
 *         This will cause he config class to have properties Eggs,  with the
 *         value 0, Beans with the value 1, and Chips with the value 2.
 *
 * "string": Needs work?
 *           The setter stores the supplied string as is.
 *           The getter returns the string.
 *
 * "string_list": Has an extra attribute:
 *         list: [ { value: "value", property: "Property" }, ... ]
 *         The setter will take a value between 0 and the number of objects in
 *         the list, and store the appropriate "value" string in the xml. It is
 *         an error to pass a value outside the range.
 *         The getter will convert the string to the appropriate number. If the
 *         string is not valid, zero will be returned.
 *         Each property name in the list will create a read-only property
 *         with the appropriate value.
 *
 *         For example, consider this:
 *         list: [
 *            { value: "secret", property: "Secret" },
 *            { value: "sauce", property: "Hot_Sauce" },
 *            { value: "bangers", property: "Sausages" },
 *         ]
 *
 *         A getter will be set up, and if the appropriate xml attribute is
 *         set to "secret", it will return 0, "sauce", will return 1, and
 *         "bangers" will return 2.
 *
 *         The setter will go the other way (if you pass 0, it'll store
 *         "secret", etc. If you pass something that isn't an integer or
 *         outside the range 0-2, it'll throw an exception.
 *
 *         Additionally, the config class will have properties Secret, with the
 *         value 0, Hot_Sauce with the value 1, and Sausages with the value 2.
 *
 */

//FIXME We should have validity checks here (bool true/false, number in range),
//as well as the UI

const _props = {
  //----------------------------------------------------------------------------
  //Debug settings (warning: also accessed via about:config)
  //----------------------------------------------------------------------------

  //Display debug messages in a popup
  debug_display_popup: { attr: "debug", type: "boolean" },

  //----------------------------------------------------------------------------
  //Display debug messages on the status bar
  debug_to_status_bar: { attr: "statusbar", type: "boolean" },

  //----------------------------------------------------------------------------
  //Display debug messages in the browser log
  debug_to_browser_log: { attr: "log", type: "boolean" },

  //----------------------------------------------------------------------------
  //Default values.
  //Note that these are given to the feed at the time the feed is created. If
  //you change the default, you'll only change feeds created in the future.
  //----------------------------------------------------------------------------

  //Default number of headlines to show
  //FIXME Using 9999 for 'unconstrained' is dubious style
  feeds_default_max_num_headlines: { attr: "defaultNbItem", type: "number" },

  //Default max headline length to show (longer headlines will be truncated)
  //FIXME Using 9999 for 'unconstrained' is dubious style
  feeds_default_max_headline_length:
    { attr: "defaultLenghtItem", type: "number" },

  //Default refresh time (time between polls)
  feeds_default_refresh_time: { attr: "refresh", type: "number" },

  //Default number of days to retain a headline in the RDF file
  feeds_default_history_purge_days:
    { attr: "defaultPurgeHistory", type: "number" },

  //Default state for playing podcast
  feed_defaults_play_podcast: { attr: "defaultPlayPodcast", type: "boolean" },

  //Default switch for whether or not to use browser history to determine if
  //headline has been read
  feed_defaults_use_browser_history:
    { attr: "defaultBrowserHistory", type: "boolean" },

  //Default icon for a group
  feeds_defaults_group_icon: { attr: "defaultGroupIcon", type: "string" },

  //Default location to which to save podcasts (if empty, they don't get saved)
  feeds_default_podcast_location:
    { attr: "savePodcastLocation", type: "string" },

  //When clicking on a headline, article loads in
  headline_action_on_click: {
    attr: "clickHeadline",
    type: "number_list",
    list: [
      "New_Default_Tab", // i.e. Browser pref for click on link
      "New_Background_Tab",
      "New_Foreground_Tab",
      "New_Window",
      "Current_Tab"
    ]
  },

  //If the headline bar is collapsed, it only uses enough of the status bar to
  //display necessary headlines.
  //FIXME should be grayed out if not using the status bar
  headline_bar_collapsed: { attr: "collapseBar", type: "boolean" },

  //Stop scrolling when mouse is over headline. I presume this stops fading as
  //well.
  //FIXME Should be disabled on option screen when not appropriate
  headline_bar_stop_on_mouseover: { attr: "stopscrolling", type: "boolean" },

  //Cycle between feeds on the headline bar
  //FIXME If not enabled, the left/right icons shouldn't appear in the headline
  //bar
  headline_bar_cycle_feeds: { attr: "cycling", type: "boolean" },

  //Cycle feeds in group when set
  //FIXME Shouldn't be enabled if not cycling
  headline_bar_cycle_in_group: { attr: "cycleWithinGroup", type: "boolean" },

  //Interval between cycling feeds (in minutes)
  //FIXME Shouldn't be enabled if not cycling
  headline_bar_cycle_interval: { attr: "cyclingDelay", type: "number" },

  //Shows or collapses the ticker display completely. This only really makes
  //sense if you have the display in the status bar.
  headline_bar_enabled: { attr: "switch", type: "boolean" },

  //Amount of scrolling the mouse wheel performs.
  headline_bar_mousewheel_scroll: {
    attr: "mouseWheelScroll",
    type: "string_list",
    list: [
      { value: "pixel", property: "By_Pixel" },
      { value: "pixels", property: "By_Pixels" },
      { value: "headline", property: "By_Headline" }
    ],
  },

  //Scrolling speed / fade rate from 1 (slow) to 30 (fast)
  //Not meaningful for static
  //FIXME Should be disabled on option screen when not appropriate
  //FIXME Description should change?
  headline_bar_scroll_speed: { attr: "scrollingspeed", type: "number" },

  //The number of pixels a headline is scrolled by (1 to 3)
  //Only meaningful for scrolling, not static or fade
  //FIXME Should be disabled on option screen when not appropriate
  headline_bar_scroll_increment: { attr: "scrollingIncrement", type: "number" },

  //Indicate how headlines appear/disappear
  //For fade, instead of scrolling, one headline is displayed, and it fades
  //into the next one. Useful for status bar.
  headline_bar_scroll_style: {
    attr: "scrolling",
    type: "number_list",
    list: [ "Static_Display", "Scrolling_Display", "Fade_Into_Next" ]
  },

  //Show button to mark all headlines as read
  headline_bar_show_mark_all_as_read_button:
    { attr: "readAllIcon", type: "boolean" },

  //Show button to switch to previous feed
  //FIXME Does this make sense when not cycling?
  headline_bar_show_previous_feed_button:
    { attr: "previousIcon", type: "boolean" },

  //Show button to toggle scrolling
  headline_bar_show_pause_toggle: { attr: "pauseIcon", type: "boolean" },

  //Show button to switch to next feed
  //FIXME Does this make sense when not cycling?
  headline_bar_show_next_feed_button: { attr: "nextIcon", type: "boolean" },

  //Show button to view all headlines
  headline_bar_show_view_all_button: { attr: "viewAllIcon", type: "boolean" },

  //Show button to perform manual refresh
  //FIXME Whatever that is
  headline_bar_show_manual_refresh_button:
    { attr: "refreshIcon", type: "boolean" },

  //Show button to toggle display of old (not clicked for a while) headlines
  //FIXME How old exactly is old?
  headline_bar_show_hide_old_headlines_toggle:
    { attr: "hideOldIcon", type: "boolean" },

  //Show button to toggle display of viewed headlines
  headline_bar_show_hide_viewed_headlines_toggle:
    { attr: "hideViewedIcon", type: "boolean" },

  //Show button to toggle shuffling of headlines
  //FIXME Should this only be enabled when cycling is on?
  headline_bar_show_shuffle_toggle: { attr: "shuffleIcon", type: "boolean" },

  //Show button to toggle scrolling direction
  //FIXME Only if scrolling enabled? (though not you can enable scrolling from
  //the headline bar)
  headline_bar_show_direction_toggle:
    { attr: "directionIcon", type: "boolean" },

  //Show button to toggle scrolling on/off (this completely enables/disables)
  headline_bar_show_scrolling_toggle:
    { attr: "scrollingIcon", type: "boolean" },

  //Show button to configure quick filter
  headline_bar_show_quick_filter_button:
    { attr: "filterIcon", type: "boolean" },

  //Show button to open feed home page
  //FIXME Doesn't make sense for certain types of feed
  headline_bar_show_home_button: { attr: "homeIcon", type: "boolean" },

  //Font family in which to display headlines.
  //'inherit' or a font/family name (i.e. anything that CSS supports)
  headline_font_family: { attr: "font", type: "string" },

  //Font size in which to display headlines.
  //'inherit' or anything else that CSS supports
  headline_font_size: { attr: "fontSize", type: "string" },

  //This is pretty much completely the opposite of a timeslice. It returns the
  //delay between processing individual headlines (in milliseconds)
  headline_processing_backoff: { attr: "timeslice", type: "number" },

  //Display the feeds icon with each headline
  headline_shows_feed_icon: { attr: "favicon", type: "boolean" },

  //Display podcast icon (if applicable) with each headline
  headline_shows_enclosure_icon: { attr: "displayEnclosure", type: "boolean" },

  //Display ban icon (which is probably mark as read) with each headline
  headline_shows_ban_icon: { attr: "displayBanned", type: "boolean" },

  //Text colour for headlines
  //This can be 'default', or an HTML colour value (hex, rgb)
  //FIXME 'default' should be 'inherit' (esp as code patches it to achieve
  //this), then this would be any valid css colour
  headline_text_colour: { attr: "defaultForegroundColor", type: "string" },

  //What to display in the tooltip for a headline
  headline_tooltip_style: {
    attr: "tooltip",
    type: "string_list",
    list: [
      { value: "description", property: "Show_Description" },
      { value: "title", property: "Show_Full_Title" },
      { value: "allInfo", property: "Show_All_Info" },
      { value: "article", property: "Show_Article" }
    ]
  },

  //Hide headlines once they've been viewed
  hide_viewed_headlines: { attr: "hideViewed", type: "boolean" },

  //Hide headlines that are considered 'old' (i.e. have been displayed for
  //a period of time, but not read)
  hide_old_headlines: { attr: "hideOld", type: "boolean" },

  //main icon should show the icon for the current feed (rather than the globe)
  icon_shows_current_feed: { attr: "synchronizeIcon", type: "boolean" },

  //main icon should flash when there is activity (i.e. it reads a feed xml).
  icon_flashes_on_activity: { attr: "flashingIcon", type: "boolean" },

  //Main menu should include an 'add' entry for each feed on the current page
  menu_includes_page_feeds: { attr: "currentfeed", type: "boolean" },

  //Main menu should include an 'add' entry for all livemarks
  menu_includes_livemarks: { attr: "livemark", type: "boolean" },

  //Main menu should include an 'add' entry for the current clipboard contents
  //(if it looks something like a feed at any rate)
  menu_includes_clipboard: { attr: "clipboard", type: "boolean" },

  //Main menu should show feeds that are part of a group. If this is off, it
  //won't show feeds that are in a group (or groups).
  menu_show_feeds_from_groups: { attr: "includeAssociated", type: "boolean" },

  //If on, each feed will have a submenu showing the "latest" (i.e. first in the
  //XML) 20 headlines.
  menu_show_headlines_in_submenu: { attr: "submenu", type: "boolean" },

  //Plays a sound ('beep' on linux, 'Notify' on windows) on a new headline
  play_sound_on_new_headline: { attr: "playSound", type: "boolean" },

  //Background colour for headlines.
  //This can be 'inherit' or a hex number (valid CSS)
  recent_headline_background_colour:
    { attr: "backgroundColour", type: "string" },

  //Returns how many seconds a hedline remains as 'recent'
  recent_headline_max_age: { attr: "delay", type: "number" },

  //Text colour for recent headlines
  //This can be 'auto', 'sameas' or a colour value. Note that the code is
  //somewhat obscure (and duplicated) if you have this set to auto and have a
  //non-default background.
  recent_headline_text_colour: { attr: "foregroundColor", type: "string" },

  //Remember displayed headlines and state
  remember_headlines: { attr: "hideHistory", type: "boolean" },

  //Show a toast (on my windows 10 it appears at the bottom right) on a new
  //headline
  show_toast_on_new_headline: { attr: "popupMessage", type: "boolean" },

  //The width of the headline area in the status bar
  status_bar_scrolling_area: { attr: "scrollingArea", type: "number" },

  //Quick filter text
  quick_filter_text: { attr: "quickFilter", type: "string" },

  //Quick filter enabled
  quick_filter_active: { attr: "quickFilterActive", type: "boolean" },

};

for (const [ prop, entry ] of Object.entries(_props))
{
  const type = entry.type;
  const attr = entry.attr;

  switch (type)
  {
    default:
      throw new Error(`unexpected type ${type} for property ${prop}`);

    case "boolean":
      Object.defineProperty(Config.prototype, prop, {

        /** Generic boolean getter.
         *
         * @returns {boolean} The state of what hopefully is an on/off switch.
         */
        get()
        {
          const res = this._config.firstChild.getAttribute(attr);
          if (res !== "true" && res !== "false")
          {
            console.error(`Expected boolean for ${prop}, got ${res}`);
          }
          return this._config.firstChild.getAttribute(attr) === "true";
        },

        /** Generic boolean setter.
         *
         * @param {boolean} state - The new state of the property.
         *
         * @throws
         */
        set(state)
        {
          if (state !== true && state !== false)
          {
            throw new Error(`Expected boolean for ${prop}, got ${state}`);
          }
          this._config.firstChild.setAttribute(attr, state ? "true" : "false");
        }
      });
      break;

    //FIXME Add a range checked version.
    case "number":
      Object.defineProperty(Config.prototype, prop, {

        /** Generic numeric (integer) getter.
         *
         * @returns {number} Integer stored in property.
         */
        get()
        {
          const val = Number(this._config.firstChild.getAttribute(attr));
          if (! Number.isInteger(val))
          {
            console.error(`Invalid value for ${attr}: ${val}`);
            return 0;
          }
          return val;
        },

        /** Generic number setter.
         *
         * @param {number} val - Number to be stored in the property.
         *                       Currently we support strings as well.
         *
         * @throws
         */
        set(val)
        {
          if (! Number.isInteger(Number(val)))
          {
            throw new Error(`Invalid value for ${attr}: ${val}`);
          }
          this._config.firstChild.setAttribute(attr, val);
        }
      });
      break;

    case "number_list":
    {
      const list = _props[prop].list;
      Object.defineProperty(Config.prototype, prop, {

        /** Generic numeric (integer) getter.
         *
         * @returns {number} Integer stored in property.
         */
        get()
        {
          const val = Number(this._config.firstChild.getAttribute(attr));
          if (! Number.isInteger(val) || val < 0 || val >= list.length)
          {
            console.error(`Invalid value for ${attr}: ${val}`);
            return 0;
          }
          return val;
        },

        /** Generic number setter.
         *
         * @param {number} val - Number to be stored in the property.
         *
         * @throws
         */
        set(val)
        {
          if (! Number.isInteger(val) || val < 0 || val >= list.length)
          {
            throw new Error(`Invalid value for ${attr}: ${val}`);
          }
          this._config.firstChild.setAttribute(attr, val);
        }
      });

      for (let value = 0; value < list.length; value += 1)
      {
        Object.defineProperty(Config.prototype, list[value], {

          /** The value of this property is the counter.
           *
           * @returns {number} Appropriate number.
           */
          get() /* jshint ignore:line  */ //-W083. Bug in jshint?
          {
            return value;
          }
        });
      }

      break;
    }

    case "string":
      Object.defineProperty(Config.prototype, prop, {

        /** Generic string getter.
         *
         * @returns {string} Whatever is stored in the property.
         */
        get()
        {
          return this._config.firstChild.getAttribute(attr);
        },

        /** Generic string setter.
         *
         * @param {string} val - Stored in the property.
         */
        set(val)
        {
          this._config.firstChild.setAttribute(attr, val);
        }
      });
      break;

    case "string_list":
    {
      const list = _props[prop].list;
      const values = list.map(elemt => elemt.value);
      const properties = list.map(elemt => elemt.property);

      Object.defineProperty(Config.prototype, prop, {

        /** Given a list, gets the offset in the list.
         *
         * Ideally this and the next could be removed by updating the config
         * and converting the strings in there to numbers.
         *
         * @returns {number} Offset in list.
         */
        get()
        {
          const val = this._config.firstChild.getAttribute(attr);
          const res = values.indexOf(val);
          if (res == -1)
          {
            console.error(`Invalid value for ${attr}: ${val}`);
            return 0;
          }
          return res;
        },

        /** Store value which is one of a list.
         *
         * @param {string} val - Stored in the property.
         *
         * @throws
         */
        set(val)
        {
          if (! Number.isInteger(val) || val < 0 || val >= values.length)
          {
            throw new Error(`Invalid value for ${attr}: ${val}`);
          }
          this._config.firstChild.setAttribute(attr, values[val]);
        }
      });

      for (let value = 0; value < properties.length; value += 1)
      {
        Object.defineProperty(Config.prototype, properties[value], {

          /** The value of this property is the counter.
           *
           * @returns {number} Appropriate number.
           */
          get() /* jshint ignore:line  */ //-W083. Bug in jshint?
          {
            return value;
          }
        });
      }

      break;
    }
  }
}

complete_assign(Config.prototype, {

  //FIXME --------------- Should be read only properties -----------------------

  //----------------------------------------------------------------------------
  // Get all the feeds / groups we have configured
  // Returns a dynamic NodeList
  get_all()
  {
    return this._config.getElementsByTagName("RSS");
  },

  // Gets the configured groups
  // Returns a static NodeList
  get_groups()
  {
    return this._config.querySelectorAll("RSS[type=group]");
  },

  // Gets the configured feeds
  // Returns a static NodeList
  get_feeds()
  {
    return this._config.querySelectorAll("RSS:not([type=group])");
  },

  //------------------ to here

  /** Get the currently selected feed.
   *
   * @returns {RSS} Rhe currently selected feed (or null).
   */
  get selected_feed()
  {
    return this._config.querySelector('RSS[selected="true"]');
  },

  /** Clone the current configuration.
   *
   * Creates a new document which is a complete clone of the current one.
   *
   * @returns {Config} A clone of this.
   */
  clone()
  {
    const config = new Config();
    config.RSSList = this._config.cloneNode(true);
    return config;
  },

  /** Clear all the feeds.
   *
   * Mainly for use by opml import.
   */
  clear_feeds()
  {
    const feeds = this._config.childNodes[0];
    remove_all_children(feeds);
  },

  /** Get the default feed icon.
   *
   * @returns {string} The default feed icon.
   */
  get Default_Feed_Icon()
  {
    return INFORSS_DEFAULT_ICON;
  },

  /** Get the default group icon.
   *
   * @returns {string} The default group icon.
   */
  get Default_Group_Icon()
  {
    return INFORSS_DEFAULT_GROUP_ICON;
  },

  //FIXME Convert this to one pref?
  get In_Status_Bar() { return 0; }, //eslint-disable-line
  get At_Top() { return 1; }, //eslint-disable-line
  get At_Bottom() { return 2; }, //eslint-disable-line

  /** Get where the headline bar is placed.
   *
   * May be one of:
   * - In_Status_Bar - In the status bar.
   * - At_Top - in a toolbar at the top of the screen.
   * - At Bottom - in a toolbar at the bottom of the screen.
   *
   * @returns {number} - Location of the headline bar.
   */
  get headline_bar_location()
  {
    return this._config.firstChild.getAttribute("separateLine") == "false" ?
      this.In_Status_Bar :
      this._config.firstChild.getAttribute("linePosition") == "top" ?
        this.At_Top :
        this.At_Bottom;
  },

  /** Set the location of the headline bar.
   *
   * @param {number} loc - Location of headline bar.
   *
   * @throws
   */
  set headline_bar_location(loc)
  {
    switch (loc)
    {
      default:
        throw Error("Invalid headline bar location");

      case this.In_Status_Bar:
        this._config.firstChild.setAttribute("separateLine", "false");
        break;

      case this.At_Top:
        this._config.firstChild.setAttribute("separateLine", "true");
        this._config.firstChild.setAttribute("linePosition", "top");
        break;

      case this.At_Bottom:
        this._config.firstChild.setAttribute("separateLine", "true");
        this._config.firstChild.setAttribute("linePosition", "bottom");
        break;
    }
  },

  //----------------------------------------------------------------------------
  //Get the scrolling direction (rtl/ltr)
  //FIXME Should be disabled on option screen when not appropriate
  //FIXME Shouldn't be raw ascii
  get headline_bar_scrolling_direction()
  {
    return this._config.firstChild.getAttribute("scrollingdirection");
  },

  set headline_bar_scrolling_direction(dir)
  {
    this._config.firstChild.setAttribute("scrollingdirection", dir);
  },

  //----------------------------------------------------------------------------
  //Get what to display on the next cycling, either "next" or "random"
  //FIXME Shouldn't be enabled if not cycling
  //FIXME Replace this with appropriate properties (or boolean)
  get headline_bar_cycle_type()
  {
    return this._config.firstChild.getAttribute("nextFeed");
  },

  set headline_bar_cycle_type(type)
  {
    this._config.firstChild.setAttribute("nextFeed", type);
  },

  //----------------------------------------------------------------------------
  //Weight of font. This can be 'bolder' or 'normal'
  //FIXME store like this in config, making this a straight string attribute
  get recent_headline_font_weight()
  {
    return this._config.firstChild.getAttribute("bold") == "true" ? "bolder" : "normal";
  },

  set recent_headline_font_weight(val)
  {
    this._config.firstChild.setAttribute("bold", val == "bolder");
  },

  //----------------------------------------------------------------------------
  //Style of font. This can be 'italic' or 'normal' (i.e. roman)
  //FIXME store like this in config, making this a straight string attribute
  get recent_headline_font_style()
  {
    return this._config.firstChild.getAttribute("italic") == "true" ? "italic" : "normal";
  },

  set recent_headline_font_style(val)
  {
    this._config.firstChild.setAttribute("italic", val == "italic");
  },

  //----------------------------------------------------------------------------
  //Sorting style for main menu. May be asc, des or off.
  //FIXME Validate and type
  get menu_sorting_style()
  {
    return this._config.firstChild.getAttribute("sortedMenu");
  },

  set menu_sorting_style(val)
  {
    this._config.firstChild.setAttribute("sortedMenu", val);
  },

  //----------------------------------------------------------------------------
  //FIXME Validate and type?
  getFilterHeadlines(rss)
  {
    return rss.getAttribute("filterHeadlines");
  },

  /** Get all the groups containing the specified feed.
   *
   * @param {RSS} rss - The feed.
   *
   * @returns {NodeList} The groups.
   */
  get_groups_containing(rss)
  {
    return this._config.querySelectorAll(
      `GROUP[url="${rss.getAttribute("url")}"`
    );
  },

  //----------------------------------------------------------------------------
  //FIXME This shouldn't be here. The client should do this and the save
  toggleScrolling()
  {
    if (this._headline_bar_scroll_style === this.Fade_Into_Next)
    {
      return;
    }
    this.headline_bar_scroll_style =
      this.headline_bar_scroll_style === this.Static_Display ?
        this.Scrolling_Display : this.Static_Display;
    this.save();
  },

  //----------------------------------------------------------------------------
  //FIXME This shouldn't be here. The client should do this and the save
  switchShuffle()
  {
    this.headline_bar_cycle_type =
      this.headline_bar_cycle_type === "next" ? "random" : "next";
    this.save();
  },

  //----------------------------------------------------------------------------
  //FIXME This shouldn't be here. The client should do this and the save
  switchDirection()
  {
    this.headline_bar_scrolling_direction =
      this.headline_bar_scrolling_direction === "rtl" ? "ltr" : "rtl";
    this.save();
  },

  //----------------------------------------------------------------------------
  //FIXME Why does this live in prefs and not in the xml (or why doesn't more
  //live here?)
  getServerInfo()
  {
    if (! Inforss_Prefs.prefHasUserValue("repository.user"))
    {
      //Nothing set up. Write a blank one, then carry on
      this.setServerInfo("ftp://", "", "", "", "", false);
    }
    const user = Inforss_Prefs.getCharPref("repository.user");
    const server = Inforss_Prefs.getCharPref("repository.server");
    const protocol = Inforss_Prefs.getCharPref("repository.protocol");
    const autosync = Inforss_Prefs.prefHasUserValue("repository.autosync") ?
      Inforss_Prefs.getBoolPref("repository.autosync") :
      false;
    let password = null;
    if (user.length != 0 && server.length != 0)
    {
      password = read_password(protocol + server, user);
    }
    return {
      protocol: protocol,
      server: server,
      directory: Inforss_Prefs.getCharPref("repository.directory"),
      user: user,
      password: (password == null) ? "" : password,
      autosync: autosync
    };
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
    const child = this._config.createElement("GROUP");
    child.setAttribute("url", url);
    feed.append(child);
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
    const playLists = this._config.createElement("playLists");
    for (const item of playlist)
    {
      const play = this._config.createElement("playList");
      play.setAttribute("url", item.url);
      play.setAttribute("delay", item.delay);
      playLists.append(play);
    }
    feed.append(playLists);
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
    const filt = this._config.createElement("FILTER");
    filt.setAttribute("active", filter.active);
    filt.setAttribute("type", filter.type);
    filt.setAttribute("include", filter.include);
    filt.setAttribute("text", filter.text);
    filt.setAttribute("compare", filter.compare);
    filt.setAttribute("elapse", filter.elapse);
    filt.setAttribute("unit", filter.unit);
    filt.setAttribute("hlcompare", filter.hlcompare);
    filt.setAttribute("nb", filter.nb);
    feed.append(filt);
  },

  //++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

  get_item_from_url(url)
  {
    return this._config.querySelector('RSS[url="' + url + '"]');
  },

  //----------------------------------------------------------------------------
  save()
  {
    this._save(this._config);
  },

  //----------------------------------------------------------------------------
  _save(list)
  {
    //FIXME should make this atomic write to new/delete/rename
    const file = get_filepath();
    const outputStream = new FileOutputStream(file, -1, -1, 0);
    new XMLSerializer().serializeToStream(list, outputStream, "UTF-8");
    outputStream.close();
    //FIXME also add this to the inforssXML reader
    Inforss_Prefs.setBoolPref("debug.alert",
                              list.firstChild.getAttribute("debug") == "true");
    Inforss_Prefs.setBoolPref("debug.log",
                              list.firstChild.getAttribute("log") == "true");
    Inforss_Prefs.setBoolPref(
      "debug.statusbar",
      list.firstChild.getAttribute("statusbar") == "true"
    );
  },

  //----------------------------------------------------------------------------
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
    //FIXME This needs to use/match the default item array for when updating
    //to a new version.
    const elem = this._config.createElement("RSS");
    elem.setAttribute("url", url);
    elem.setAttribute("title", title);
    elem.setAttribute(
      "description",
      description == null || description == "" ? title : description
    );
    elem.setAttribute("type", type);
    if (type === "group")
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
      if (type === "html")
      {
        elem.setAttribute("encoding", "");
      }
    }
    elem.setAttribute("icon", icon);
    elem.setAttribute("selected", "false");
    elem.setAttribute("activity", "true");
    elem.setAttribute("filter", "all");
    elem.setAttribute("filterCaseSensitive", "true");

    this._config.firstChild.append(elem);
    return elem;
  },

  /** Remove a feed from the configuration.
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
        for (const child of group.getElementsByTagName("playList"))
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
  //Arguably this isn't very good style but the only two places that do this
  //do the same alert then carry on.
  read_configuration()
  {
    try
    {
      const file = get_filepath();
      if (! file.exists() || file.fileSize == 0)
      {
        const source = get_resource_file("inforss.default");
        if (source.exists())
        {
          source.copyTo(get_profile_dir(), INFORSS_REPOSITORY);
        }
      }
      this.read_configuration_from_file(file, true);
    }
    catch (err)
    {
      alert(get_string("repo.error") + "\n" + err);
    }
  },

  /** Reads the configuration from specified file.
   *
   * @param {string} file - Filename to read.
   * @param {boolean} backup - If true, backs up config if out of date.
   */
  read_configuration_from_file(file, backup = false)
  {
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
    ).join("");

    const new_list = new DOMParser().parseFromString(data, "text/xml");

    if (new_list.documentElement.nodeName == "parsererror")
    {
      //FIXME Throw custom error.
      throw new Error("Cannot parse XML");
    }

    this._adjust_repository(new_list, backup);
    this._config = new_list;
  },

  /** Convert from version 4 to 5.
   *
   * Removes redundant attributes.
   * Stores password in password store.
   * Sanitises some values.
   *
   * @param {RSSList} list - Configuration.
   */
  _convert_4_to_5(list)
  {
    const config = list.firstChild;
    function rename_attribute(old_name, new_name)
    {
      if (config.hasAttribute(old_name))
      {
        if (! config.hasAttribute(new_name))
        {
          config.setAttribute(new_name, config.getAttribute(old_name));
        }
        config.removeAttribute(old_name);
      }
    }
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

  /** Convert from version 5 to 6.
   *
   * Removes redundant attributes.
   * Improves some attribute names.
   * Adds in some missing attributes (occasionally rather strangely).
   *
   * @param {RSSList} list - Configuration.
   */
  _convert_5_to_6(list)
  {
    const config = list.firstChild;
    function rename_attribute(old_name, new_name)
    {
      if (config.hasAttribute(old_name))
      {
        if (! config.hasAttribute(new_name))
        {
          config.setAttribute(new_name, config.getAttribute(old_name));
        }
        config.removeAttribute(old_name);
      }
    }
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
        if (item.getAttribute("url").startsWith(
              "https://gmail.google.com/gmail/feed/atom") ||
            item.getAttribute("url").includes(".ebay."))
        {
          item.setAttribute("browserHistory", "false");
        }
      }
      if (item.getAttribute("type") == "group" &&
          ! item.hasAttribute("playlist"))
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

  /** This (overenthusiastically) fixes some missing attributes.
   *
   * It is only called from the 5 to 6 conversion.
   *
   * @param {RSSList} list - List of feeds.
   */
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
      switch: true,
      synchronizeIcon: false,
      timeslice: 90,
      tooltip: "description",
      viewAllIcon: true,
    };

    const config = list.firstChild;
    for (const attrib of Object.keys(defaults))
    {
      if (! config.hasAttribute(attrib))
      {
        config.setAttribute(attrib, defaults[attrib]);
      }
    }

    //Now for the rss items
    const feed_defaults = {
      activity: true,
      browserHistory: config.getAttribute("defaultBrowserHistory"),
      description: "",
      encoding: "", //only for html?
      filter: "all",
      filterCaseSensitive: true,
      filterPolicy: 0,
      icon: INFORSS_DEFAULT_ICON, //err. different for group
      lengthItem: config.getAttribute("defaultLenghtItem"),
      nbItem: config.getAttribute("defaultNbItem"),
      playPodcast: config.getAttribute("defaultPlayPodcast"),
      purgeHistory: config.getAttribute("defaultPurgeHistory"),
      refresh: config.getAttribute("refresh"),
      savePodcastLocation: config.getAttribute("savePodcastLocation"),
      selected: false,
      type: "rss", //check first
    };

    for (const item of list.getElementsByTagName("RSS"))
    {
      for (const attrib of Object.keys(feed_defaults))
      {
        if (! item.hasAttribute(attrib))
        {
          item.setAttribute(attrib, feed_defaults[attrib]);
        }
      }
    }
  },

  /** Convert from version 6 to 7.
   *
   * Removes redundant attributes.
   *
   * @param {RSSList} list - Configuration.
   */
  _convert_6_to_7(list)
  {
    const config = list.firstChild;
    config.removeAttribute("mouseEvent");
    config.removeAttribute("net");
  },

  /** Convert from version 7 to 8.
   *
   * Removes redundant attributes.
   * Improves some attribute names.
   * Rationalise some settings to improve how headlines can be displayed.
   *
   * @param {RSSList} list - Configuration.
   */
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
          "#" + ("000000" +
              ((red * 256 + green) * 256 + blue).toString(16)
          ).substr(-6)
        );
      }
      config.removeAttribute("red");
      config.removeAttribute("green");
      config.removeAttribute("blue");
    }
  },

  /** Convert from version 8 to 9.
   *
   * Removes redundant attribute.
   *
   * @param {RSSList} list - configuration
   */
  _convert_8_to_9(list)
  {
    for (const item of list.getElementsByTagName("RSS"))
    {
      item.removeAttribute("acknowledgeDate");
    }
  },

  /** Convert from version 9 to 10.
   *
   * Removes redundant attribute.
   *
   * @param {RSSList} list - Configuration.
   */
  _convert_9_to_10(list)
  {
    const config = list.firstChild;
    config.removeAttribute("synchronizationIcon");
  },

  /** Convert from version 10 to 11.
   *
   * Removes redundant attributes.
   * Improves some attribute names.
   *
   * @param {RSSList} list - Configuration.
   */
  _convert_10_to_11(list)
  {
    const config = list.firstChild;
    function rename_attribute(old_name, new_name)
    {
      if (config.hasAttribute(old_name))
      {
        if (! config.hasAttribute(new_name))
        {
          config.setAttribute(new_name, config.getAttribute(old_name));
        }
        config.removeAttribute(old_name);
      }
    }
    for (const item of list.getElementsByTagName("RSS"))
    {
      item.removeAttribute("htmlTest");
    }
    rename_attribute("quickFilterActif", "quickFilterActive");
  },

  /** Convert from version 11 to 12.
   *
   * This removes a bunch of attributes that are incorrectly set by the
   * 5 to 6 conversion.
   *
   * @param {RSSList} list - Configuration.
   */
  _convert_11_to_12(list)
  {
    const not_for_group = [
      "browserHistory",
      "lengthItem",
      "link",
      "user",
      "password",
      "nbItem",
      "playPodcast",
      "purgeHistory",
      "refresh",
      "savePodcastLocation"
    ];

    const only_for_group = [ "filterPolicy" ];

    for (const item of list.getElementsByTagName("RSS"))
    {
      if (item.getAttribute("type") === "group")
      {
        //Remove attributes not relevant to groups
        for (const attrib of not_for_group)
        {
          item.removeAttribute(attrib);
        }
      }
      else
      {
        //Remove attributes only relevant to groups
        for (const attrib of only_for_group)
        {
          item.removeAttribute(attrib);
        }
      }

      if (item.getAttribute("type") !== "html")
      {
        item.removeAttribute("encoding");
      }

      for (const attrib of [ "group", "groupAssociated" ])
      {
        item.removeAttribute(attrib);
      }
    }
  },

  /** Update the config from an older version.
   *
   * @param {RSSList} list - More or less the same as this object.
   * @param {boolean} backup - If true and the config is an old version,
   *                           then back it up.
   */
  _adjust_repository(list, backup)
  {
    const Config_Version = 12;
    const config = list.firstChild;
    for (let version = 4; version < Config_Version; version += 1)
    {
      if (parseInt(config.getAttribute("version"), 10) <= version)
      {
        const method = `_convert_${version}_to_${version + 1}`;
        this[method](list);
      }
    }

    if (config.getAttribute("version") != Config_Version.toString())
    {
      //NOTENOTENOTE Check this before release.
      //It should be set to what is up above
      config.setAttribute("version", 11/* Config_Version */);
      if (backup)
      {
        this._backup();
        this._save(list);
      }
    }
  },

  /** Back up the configuration after a version change */
  _backup()
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

});

Config.get_filepath = get_filepath;
