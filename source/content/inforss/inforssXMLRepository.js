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
  show_activity()
  {
    return RSSList.firstChild.getAttribute("switch") == "true";
  },

  //----------------------------------------------------------------------------
  //Hide headlines once they've been views
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
  //Hides headlines where the target link is in the browser history.
  //**PROBABLY** not sure if that is entirely true.
  hide_headlines_if_in_history()
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
  //"full" (which most of code treats as default)
  headline_tooltip_style()
  {
    return RSSList.firstChild.getAttribute("tooltip");
  },

  //----------------------------------------------------------------------------
  //When clicking on a headline, article loads in
  //0 - new tab
  //1 - new background tab
  //2 - new foreground tab
  //3 - new window
  //4 - current tab
  headline_on_click()
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
  //FIXME Replace these two with one function returning 3 values
  //Headlines_At_Top, Headlines_At_Bottom, Headlines_In_Statusbar
  getSeparateLine()
  {
    return RSSList.firstChild.getAttribute("separateLine");
  },

  //----------------------------------------------------------------------------
  getLinePosition()
  {
    return RSSList.firstChild.getAttribute("linePosition");
  },

  //----------------------------------------------------------------------------
  getMouseWheelScroll()
  {
    return RSSList.firstChild.getAttribute("mouseWheelScroll");
  },

  //----------------------------------------------------------------------------
  getScrollingIncrement()
  {
    return eval(RSSList.firstChild.getAttribute("scrollingIncrement"));
  },

  //----------------------------------------------------------------------------
  getScrollingArea()
  {
    return RSSList.firstChild.getAttribute("scrollingArea");
  },

  //----------------------------------------------------------------------------
  setScrollingArea(width)
  {
    RSSList.firstChild.setAttribute("scrollingArea", width);
  },

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

  //FIXME I think these group ones are dead
  //----------------------------------------------------------------------------
  getGroupLengthItem()
  {
    return RSSList.firstChild.getAttribute("groupLenghtItem");
  },

  //----------------------------------------------------------------------------
  getGroupNbItem()
  {
    return RSSList.firstChild.getAttribute("groupNbItem");
  },

  //----------------------------------------------------------------------------
  getGroupRefresh()
  {
    return RSSList.firstChild.getAttribute("groupRefresh");
  },
  ///------------------------

  //----------------------------------------------------------------------------
  getFontSize()
  {
    return RSSList.firstChild.getAttribute("fontSize");
  },

  //----------------------------------------------------------------------------
  getNextFeed()
  {
    return RSSList.firstChild.getAttribute("nextFeed");
  },

  //----------------------------------------------------------------------------
  getScrollingSpeed()
  {
    return (30 - eval(RSSList.firstChild.getAttribute("scrollingspeed"))) * 10;
  },

  //----------------------------------------------------------------------------
  getFilterHeadlines(rss)
  {
    return rss.getAttribute("filterHeadlines");
  },

  //----------------------------------------------------------------------------
  isFavicon()
  {
    return RSSList.firstChild.getAttribute("favicon") == "true";
  },

  //----------------------------------------------------------------------------
  getRed()
  {
    return RSSList.firstChild.getAttribute("red");
  },

  //----------------------------------------------------------------------------
  getGreen()
  {
    return RSSList.firstChild.getAttribute("green");
  },

  //----------------------------------------------------------------------------
  getBlue()
  {
    return RSSList.firstChild.getAttribute("blue");
  },

  //----------------------------------------------------------------------------
  getDelay()
  {
    return RSSList.firstChild.getAttribute("delay");
  },

  //----------------------------------------------------------------------------
  getCyclingDelay()
  {
    return parseInt(RSSList.firstChild.getAttribute("cyclingDelay"), 10);
  },

  //----------------------------------------------------------------------------
  isCycling()
  {
    return RSSList.firstChild.getAttribute("cycling") == "true";
  },

  //----------------------------------------------------------------------------
  isCycleWithinGroup()
  {
    return RSSList.firstChild.getAttribute("cycleWithinGroup") == "true";
  },

  //----------------------------------------------------------------------------
  getFont()
  {
    return (RSSList.firstChild.getAttribute("font") == "auto") ? "inherit" : RSSList.firstChild.getAttribute("font");
  },

  //----------------------------------------------------------------------------
  getBold()
  {
    return RSSList.firstChild.getAttribute("bold") == "true" ? "bolder" : "normal";
  },

  //----------------------------------------------------------------------------
  getItalic()
  {
    return RSSList.firstChild.getAttribute("italic") == "true" ? "italic" : "normal";
  },

  //----------------------------------------------------------------------------
  isScrolling()
  {
    return RSSList.firstChild.getAttribute("scrolling") == "1" ||
      RSSList.firstChild.getAttribute("scrolling") == "2";
  },

  //----------------------------------------------------------------------------
  isFadeIn()
  {
    return RSSList.firstChild.getAttribute("scrolling") == "2";
  },

  //----------------------------------------------------------------------------
  toggleScrolling()
  {
    RSSList.firstChild.setAttribute("scrolling", this.isScrolling() ? "0" : "1");
    this.save();
  },

  //----------------------------------------------------------------------------
  isStopScrolling()
  {
    return RSSList.firstChild.getAttribute("stopscrolling") == "true";
  },

  //----------------------------------------------------------------------------
  getCollapseBar()
  {
    return RSSList.firstChild.getAttribute("collapseBar") == "true";
  },

  //----------------------------------------------------------------------------
  getForegroundColor()
  {
    return RSSList.firstChild.getAttribute("foregroundColor");
  },

  //----------------------------------------------------------------------------
  getDefaultForegroundColor()
  {
    return RSSList.firstChild.getAttribute("defaultForegroundColor");
  },

  //----------------------------------------------------------------------------
  getScrollingDirection()
  {
    return RSSList.firstChild.getAttribute("scrollingdirection");
  },

  //----------------------------------------------------------------------------
  isReadAllIcon()
  {
    return RSSList.firstChild.getAttribute("readAllIcon") == "true";
  },

  //----------------------------------------------------------------------------
  isViewAllIcon()
  {
    return RSSList.firstChild.getAttribute("viewAllIcon") == "true";
  },

  //----------------------------------------------------------------------------
  isShuffleIcon()
  {
    return RSSList.firstChild.getAttribute("shuffleIcon") == "true";
  },

  //----------------------------------------------------------------------------
  isDirectionIcon()
  {
    return RSSList.firstChild.getAttribute("directionIcon") == "true";
  },

  //----------------------------------------------------------------------------
  isScrollingIcon()
  {
    return RSSList.firstChild.getAttribute("scrollingIcon") == "true";
  },

  //----------------------------------------------------------------------------
  isPreviousIcon()
  {
    return RSSList.firstChild.getAttribute("previousIcon") == "true";
  },

  //----------------------------------------------------------------------------
  isPauseIcon()
  {
    return RSSList.firstChild.getAttribute("pauseIcon") == "true";
  },

  //----------------------------------------------------------------------------
  isNextIcon()
  {
    return RSSList.firstChild.getAttribute("nextIcon") == "true";
  },

  //----------------------------------------------------------------------------
  isRefreshIcon()
  {
    return RSSList.firstChild.getAttribute("refreshIcon") == "true";
  },

  //----------------------------------------------------------------------------
  isHideOldIcon()
  {
    return RSSList.firstChild.getAttribute("hideOldIcon") == "true";
  },

  //----------------------------------------------------------------------------
  isHideViewedIcon()
  {
    return RSSList.firstChild.getAttribute("hideViewedIcon") == "true";
  },

  //----------------------------------------------------------------------------
  isSynchronizationIcon()
  {
    return RSSList.firstChild.getAttribute("synchronizationIcon") == "true";
  },

  //----------------------------------------------------------------------------
  isHomeIcon()
  {
    return RSSList.firstChild.getAttribute("homeIcon") == "true";
  },

  //----------------------------------------------------------------------------
  isFilterIcon()
  {
    return RSSList.firstChild.getAttribute("filterIcon") == "true";
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
  isDisplayEnclosure()
  {
    return RSSList.firstChild.getAttribute("displayEnclosure") == "true";
  },

  //----------------------------------------------------------------------------
  isDisplayBanned()
  {
    return RSSList.firstChild.getAttribute("displayBanned") == "true";
  },

  //----------------------------------------------------------------------------
  isPlayList()
  {
    return RSSList.firstChild.getAttribute("playlist") == "true";
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
  add_item(title, description, url, link, user, password, feedFlag)
  {
    inforssTraceIn();
    try
    {
      if (RSSList == null)
      {
        RSSList = new DOMParser().parseFromString('<LIST-RSS/>', 'text/xml');
        /**/console.log("created empty rss", RSSList);
      }
      let elem = this._new_item(RSSList, title, description, url, link, user, password, feedFlag);
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

  //----------------------------------------------------------------------------
  _new_item(list, title, description, url, link, user, password, type)
  {
    inforssTraceIn();
    try
    {
      let elem = list.createElement("RSS");
      elem.setAttribute("url", url);
      elem.setAttribute("title", title);
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
      elem.setAttribute("link", link == null || link == "" ? url : link);
      elem.setAttribute("description",
                        description == null || description == "" ? title : description);
      elem.setAttribute("icon", "");
      elem.setAttribute("refresh", this.feeds_default_refresh_time());
      elem.setAttribute("activity", "true");
      if (user != null && user != "")
      {
        elem.setAttribute("user", user);
        this.storePassword(url, user, password);
      }
      elem.setAttribute("filter", "all");
      elem.setAttribute("type", type);
      elem.setAttribute("groupAssociated", "false");
      elem.setAttribute("group", "false");

      //FIXME Doesn't set filterPolicy and encoding.
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

    if (config.getAttribute("version") != "6")
    {
      config.setAttribute("version", 6);
      this.backup();
      this._save(list);
    }

  },

  //----------------------------------------------------------------------------

  _set_defaults(list)
  {
    //Add in missing defaults
    const defaults = {
      red: 127,
      green: 192,
      blue: 255,
      delay: 15,
      refresh: 2,
      "switch": true,
      groupNbItem: 3,
      groupLenghtItem: 25,
      groupRefresh: 2,
      separateLine: false,
      scrolling: 1,
      submenu: false,
      group: false,
      linePosition: "bottom",
      debug: false,
      log: false,
      statusbar: false,
      net: false,
      bold: true,
      italic: true,
      currentfeed: true,
      livemark: true,
      clipboard: true,
      scrollingspeed: 19,
      font: "auto",
      foregroundColor: "auto",
      defaultForegroundColor: "default",
      favicon: true,
      scrollingArea: 500,
      hideViewed: false,
      tooltip: "description",
      clickHeadline: 0,
      hideOld: false,
      sortedMenu: "asc",
      hideHistory: true,
      includeAssociated: true,
      cycling: false,
      cyclingDelay: 5,
      nextFeed: "next",
      defaultPurgeHistory: 3,
      fontSize: "auto",
      stopscrolling: true,
      cycleWithinGroup: false,
      defaultGroupIcon: "chrome://inforss/skin/group.png",
      scrollingdirection: "rtl",
      readAllIcon: true,
      viewAllIcon: true,
      shuffleIcon: true,
      directionIcon: true,
      scrollingIcon: true,
      previousIcon: true,
      pauseIcon: true,
      nextIcon: true,
      synchronizeIcon: false,
      refreshIcon: false,
      hideOldIcon: false,
      hideViewedIcon: false,
      homeIcon: true,
      filterIcon: true,
      popupMessage: true,
      playSound: true,
      flashingIcon: true,
      defaultPlayPodcast: true,
      displayEnclosure: true,
      displayBanned: true,
      savePodcastLocation: "",
      defaultBrowserHistory: true,
      collapseBar: false,
      scrollingIncrement: 2,
      quickFilter: "",
      quickFilterActif: false,
      timeslice: 90,
      mouseWheelScroll: "pixel",
      defaultNbItem: 9999,
      defaultLenghtItem: 25,
      synchronizationIcon: false,
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
      group: false,
      selected: false,
      nbItem: config.getAttribute("defaultNbItem"),
      lengthItem: config.getAttribute("defaultLenghtItem"),
      playPodcast: config.getAttribute("defaultPlayPodcast"),
      savePodcastLocation: config.getAttribute("savePodcastLocation"),
      purgeHistory: config.getAttribute("defaultPurgeHistory"),
      browserHistory: config.getAttribute("defaultBrowserHistory"),
      filterCaseSensitive: true,
      refresh: config.getAttribute("refresh"),
      activity: true,
      filter: "all",
      type: "rss",
      filterPolicy: 0,
      encoding: "",
      icon: INFORSS_DEFAULT_ICO,
      description: "",
      groupAssociated: false
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
