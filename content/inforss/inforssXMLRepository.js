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
// inforssXMLRepository
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------

/* globals inforssDebug, inforssTraceIn, inforssTraceOut */
Components.utils.import("chrome://inforss/content/inforssDebug.jsm");

const LocalFile = Components.Constructor("@mozilla.org/file/local;1",
                                          "nsILocalFile",
                                          "initWithPath");

const FileOutputStream = Components.Constructor("@mozilla.org/network/file-output-stream;1",
                                                "nsIFileOutputStream",
                                                "init");


//FIXME Turn this into a module, once we have all access to RSSList in here
//Really we should be passed xml or opml filenames to load (or streams)
//and some other class should be responsible for determining the filename to
//use.
/* global RSSList: true */
/* global INFORSS_REPOSITORY */
//These should be called via inforrssXMLRepository
/* exported inforssSave, inforssAddItemToRSSList */

/* exported inforssXMLRepository */
function inforssXMLRepository()
{
  return this;
}

//------------------------------------------------------------------------------
inforssXMLRepository.is_valid = function()
{
  return RSSList != null;
};

//------------------------------------------------------------------------------
inforssXMLRepository.getTimeSlice = function()
{
  return RSSList.firstChild.getAttribute("timeslice");
};

//------------------------------------------------------------------------------
//FIXME Replace these two with one function returning 3 values
//Headlines_At_Top, Headlines_At_Bottom, Headlines_In_Statusbar
inforssXMLRepository.getSeparateLine = function()
{
  return RSSList.firstChild.getAttribute("separateLine");
};

//------------------------------------------------------------------------------
inforssXMLRepository.getLinePosition = function()
{
  return RSSList.firstChild.getAttribute("linePosition");
};

//------------------------------------------------------------------------------
inforssXMLRepository.getMouseEvent = function()
{
  return eval(RSSList.firstChild.getAttribute("mouseEvent"));
};

//------------------------------------------------------------------------------
inforssXMLRepository.getMouseWheelScroll = function()
{
  return RSSList.firstChild.getAttribute("mouseWheelScroll");
};

//------------------------------------------------------------------------------
inforssXMLRepository.getDefaultPlayPodcast = function()
{
  return RSSList.firstChild.getAttribute("defaultPlayPodcast");
};

//------------------------------------------------------------------------------
inforssXMLRepository.getSavePodcastLocation = function()
{
  return RSSList.firstChild.getAttribute("savePodcastLocation");
};

//------------------------------------------------------------------------------
inforssXMLRepository.getDefaultBrowserHistory = function()
{
  return RSSList.firstChild.getAttribute("defaultBrowserHistory");
};

//------------------------------------------------------------------------------
inforssXMLRepository.getDefaultNbItem = function()
{
  return RSSList.firstChild.getAttribute("defaultNbItem");
};

//------------------------------------------------------------------------------
inforssXMLRepository.getDefaultLengthItem = function()
{
  return RSSList.firstChild.getAttribute("defaultLenghtItem");
};

//------------------------------------------------------------------------------
inforssXMLRepository.getDefaultRefresh = function()
{
  return RSSList.firstChild.getAttribute("refresh");
};

//------------------------------------------------------------------------------
inforssXMLRepository.getScrollingIncrement = function()
{
  return eval(RSSList.firstChild.getAttribute("scrollingIncrement"));
};

//------------------------------------------------------------------------------
inforssXMLRepository.getScrollingArea = function()
{
  return RSSList.firstChild.getAttribute("scrollingArea");
};

//------------------------------------------------------------------------------
inforssXMLRepository.setScrollingArea = function(width)
{
  RSSList.firstChild.setAttribute("scrollingArea", width);
};

//------------------------------------------------------------------------------
inforssXMLRepository.isHideViewed = function()
{
  return (RSSList.firstChild.getAttribute("hideViewed") == "true");
};

//------------------------------------------------------------------------------
inforssXMLRepository.setHideViewed = function(value)
{
  RSSList.firstChild.setAttribute("hideViewed", value);
};

//------------------------------------------------------------------------------
inforssXMLRepository.isHideOld = function()
{
  return (RSSList.firstChild.getAttribute("hideOld") == "true");
};

//------------------------------------------------------------------------------
inforssXMLRepository.setHideOld = function(value)
{
  RSSList.firstChild.setAttribute("hideOld", value);
};

//------------------------------------------------------------------------------
inforssXMLRepository.isHideHistory = function()
{
  return (RSSList.firstChild.getAttribute("hideHistory") == "true");
};

//------------------------------------------------------------------------------
inforssXMLRepository.isIncludeAssociated = function()
{
  return (RSSList.firstChild.getAttribute("includeAssociated") == "true");
};

//------------------------------------------------------------------------------
inforssXMLRepository.getGroupLengthItem = function()
{
  return RSSList.firstChild.getAttribute("groupLenghtItem");
};

//------------------------------------------------------------------------------
inforssXMLRepository.getGroupNbItem = function()
{
  return RSSList.firstChild.getAttribute("groupNbItem");
};

//------------------------------------------------------------------------------
inforssXMLRepository.getGroupRefresh = function()
{
  return RSSList.firstChild.getAttribute("groupRefresh");
};

//------------------------------------------------------------------------------
inforssXMLRepository.getSubMenu = function()
{
  return RSSList.firstChild.getAttribute("submenu");
};

//------------------------------------------------------------------------------
inforssXMLRepository.getDefaultPurgeHistory = function()
{
  return RSSList.firstChild.getAttribute("defaultPurgeHistory");
};

//------------------------------------------------------------------------------
inforssXMLRepository.getFontSize = function()
{
  return RSSList.firstChild.getAttribute("fontSize");
};

//------------------------------------------------------------------------------
inforssXMLRepository.getNextFeed = function()
{
  return RSSList.firstChild.getAttribute("nextFeed");
};

//------------------------------------------------------------------------------
inforssXMLRepository.getScrollingSpeed = function()
{
  return (30 - eval(RSSList.firstChild.getAttribute("scrollingspeed"))) * 10;
};

//------------------------------------------------------------------------------
inforssXMLRepository.getFilterHeadlines = function(rss)
{
  return rss.getAttribute("filterHeadlines");
};

//------------------------------------------------------------------------------
inforssXMLRepository.isFavicon = function()
{
  return (RSSList.firstChild.getAttribute("favicon") == "true");
};

//------------------------------------------------------------------------------
inforssXMLRepository.getRed = function()
{
  return RSSList.firstChild.getAttribute("red");
};

//------------------------------------------------------------------------------
inforssXMLRepository.getGreen = function()
{
  return RSSList.firstChild.getAttribute("green");
};

//------------------------------------------------------------------------------
inforssXMLRepository.getBlue = function()
{
  return RSSList.firstChild.getAttribute("blue");
};

//------------------------------------------------------------------------------
inforssXMLRepository.getDelay = function()
{
  return RSSList.firstChild.getAttribute("delay");
};

//------------------------------------------------------------------------------
inforssXMLRepository.getCyclingDelay = function()
{
  return RSSList.firstChild.getAttribute("cyclingDelay");
};

//------------------------------------------------------------------------------
inforssXMLRepository.isCycling = function()
{
  return (RSSList.firstChild.getAttribute("cycling") == "true");
};

//------------------------------------------------------------------------------
inforssXMLRepository.isCycleWithinGroup = function()
{
  return (RSSList.firstChild.getAttribute("cycleWithinGroup") == "true");
};

//------------------------------------------------------------------------------
inforssXMLRepository.getTooltip = function()
{
  return RSSList.firstChild.getAttribute("tooltip");
};

//------------------------------------------------------------------------------
inforssXMLRepository.getClickHeadline = function()
{
  return RSSList.firstChild.getAttribute("clickHeadline");
};

//------------------------------------------------------------------------------
inforssXMLRepository.getFont = function()
{
  return (RSSList.firstChild.getAttribute("font") == "auto") ? "inherit" : RSSList.firstChild.getAttribute("font");
};

//------------------------------------------------------------------------------
inforssXMLRepository.isActive = function()
{
  return (RSSList.firstChild.getAttribute("switch") == "true");
};

//------------------------------------------------------------------------------
inforssXMLRepository.getBold = function()
{
  return (RSSList.firstChild.getAttribute("bold") == "true") ? "bolder" : "normal";
};

//------------------------------------------------------------------------------
inforssXMLRepository.getItalic = function()
{
  return (RSSList.firstChild.getAttribute("italic") == "true") ? "italic" : "normal";
};

//------------------------------------------------------------------------------
inforssXMLRepository.isScrolling = function()
{
  return ((RSSList.firstChild.getAttribute("scrolling") == "1") ||
    (RSSList.firstChild.getAttribute("scrolling") == "2"));
};

//------------------------------------------------------------------------------
inforssXMLRepository.isFadeIn = function()
{
  return (RSSList.firstChild.getAttribute("scrolling") == "2");
};

//------------------------------------------------------------------------------
inforssXMLRepository.toggleScrolling = function()
{
  RSSList.firstChild.setAttribute("scrolling", inforssXMLRepository.isScrolling() ? "0" : "1");
  inforssSave();
};

//------------------------------------------------------------------------------
inforssXMLRepository.isStopScrolling = function()
{
  return (RSSList.firstChild.getAttribute("stopscrolling") == "true");
};

//------------------------------------------------------------------------------
inforssXMLRepository.isCurrentFeed = function()
{
  return (RSSList.firstChild.getAttribute("currentfeed") == "true");
};

//------------------------------------------------------------------------------
inforssXMLRepository.isLivemark = function()
{
  return (RSSList.firstChild.getAttribute("livemark") == "true");
};

//------------------------------------------------------------------------------
inforssXMLRepository.isClipboard = function()
{
  return (RSSList.firstChild.getAttribute("clipboard") == "true");
};

//------------------------------------------------------------------------------
inforssXMLRepository.getSortedMenu = function()
{
  return (RSSList.firstChild.getAttribute("sortedMenu"));
};

//------------------------------------------------------------------------------
inforssXMLRepository.getCollapseBar = function()
{
  return (RSSList.firstChild.getAttribute("collapseBar") == "true");
};

//------------------------------------------------------------------------------
inforssXMLRepository.getForegroundColor = function()
{
  return RSSList.firstChild.getAttribute("foregroundColor");
};

//------------------------------------------------------------------------------
inforssXMLRepository.getDefaultForegroundColor = function()
{
  return RSSList.firstChild.getAttribute("defaultForegroundColor");
};

//------------------------------------------------------------------------------
inforssXMLRepository.getSubMenuType = function()
{
  return (inforssXMLRepository.getSubMenu() == "true") ? "menu" : "menuitem";
};

//------------------------------------------------------------------------------
inforssXMLRepository.getDefaultGroupIcon = function()
{
  return RSSList.firstChild.getAttribute("defaultGroupIcon");
};

//------------------------------------------------------------------------------
inforssXMLRepository.getScrollingDirection = function()
{
  return RSSList.firstChild.getAttribute("scrollingdirection");
};

//------------------------------------------------------------------------------
inforssXMLRepository.isReadAllIcon = function()
{
  return (RSSList.firstChild.getAttribute("readAllIcon") == "true");
};

//------------------------------------------------------------------------------
inforssXMLRepository.isViewAllIcon = function()
{
  return (RSSList.firstChild.getAttribute("viewAllIcon") == "true");
};

//------------------------------------------------------------------------------
inforssXMLRepository.isShuffleIcon = function()
{
  return (RSSList.firstChild.getAttribute("shuffleIcon") == "true");
};

//------------------------------------------------------------------------------
inforssXMLRepository.isDirectionIcon = function()
{
  return (RSSList.firstChild.getAttribute("directionIcon") == "true");
};

//------------------------------------------------------------------------------
inforssXMLRepository.isScrollingIcon = function()
{
  return (RSSList.firstChild.getAttribute("scrollingIcon") == "true");
};

//------------------------------------------------------------------------------
inforssXMLRepository.isPreviousIcon = function()
{
  return (RSSList.firstChild.getAttribute("previousIcon") == "true");
};

//------------------------------------------------------------------------------
inforssXMLRepository.isPauseIcon = function()
{
  return (RSSList.firstChild.getAttribute("pauseIcon") == "true");
};

//------------------------------------------------------------------------------
inforssXMLRepository.isNextIcon = function()
{
  return (RSSList.firstChild.getAttribute("nextIcon") == "true");
};

//------------------------------------------------------------------------------
inforssXMLRepository.isRefreshIcon = function()
{
  return (RSSList.firstChild.getAttribute("refreshIcon") == "true");
};

//------------------------------------------------------------------------------
inforssXMLRepository.isHideOldIcon = function()
{
  return (RSSList.firstChild.getAttribute("hideOldIcon") == "true");
};

//------------------------------------------------------------------------------
inforssXMLRepository.isHideViewedIcon = function()
{
  return (RSSList.firstChild.getAttribute("hideViewedIcon") == "true");
};

//------------------------------------------------------------------------------
inforssXMLRepository.isSynchronizationIcon = function()
{
  return (RSSList.firstChild.getAttribute("synchronizationIcon") == "true");
};

//------------------------------------------------------------------------------
inforssXMLRepository.isSynchronizeIcon = function()
{
  return (RSSList.firstChild.getAttribute("synchronizeIcon") == "true");
};

//------------------------------------------------------------------------------
inforssXMLRepository.isFlashingIcon = function()
{
  return (RSSList.firstChild.getAttribute("flashingIcon") == "true");
};

//------------------------------------------------------------------------------
inforssXMLRepository.isHomeIcon = function()
{
  return (RSSList.firstChild.getAttribute("homeIcon") == "true");
};

//------------------------------------------------------------------------------
inforssXMLRepository.isFilterIcon = function()
{
  return (RSSList.firstChild.getAttribute("filterIcon") == "true");
};

//------------------------------------------------------------------------------
inforssXMLRepository.setQuickFilter = function(active, filter)
{
  RSSList.firstChild.setAttribute("quickFilterActif", active);
  RSSList.firstChild.setAttribute("quickFilter", filter);
  inforssSave();
};

//------------------------------------------------------------------------------
inforssXMLRepository.getQuickFilter = function()
{
  return (RSSList.firstChild.getAttribute("quickFilter"));
};

//------------------------------------------------------------------------------
inforssXMLRepository.isQuickFilterActif = function()
{
  return (RSSList.firstChild.getAttribute("quickFilterActif") == "true");
};

//------------------------------------------------------------------------------
inforssXMLRepository.isPopupMessage = function()
{
  return (RSSList.firstChild.getAttribute("popupMessage") == "true");
};

//------------------------------------------------------------------------------
inforssXMLRepository.isPlaySound = function()
{
  return (RSSList.firstChild.getAttribute("playSound") == "true");
};

//------------------------------------------------------------------------------
inforssXMLRepository.isDisplayEnclosure = function()
{
  return (RSSList.firstChild.getAttribute("displayEnclosure") == "true");
};

//------------------------------------------------------------------------------
inforssXMLRepository.isDisplayBanned = function()
{
  return (RSSList.firstChild.getAttribute("displayBanned") == "true");
};

//------------------------------------------------------------------------------
inforssXMLRepository.isPlayList = function()
{
  return (RSSList.firstChild.getAttribute("playlist") == "true");
};

//------------------------------------------------------------------------------
inforssXMLRepository.switchShuffle = function()
{
  if (RSSList.firstChild.getAttribute("nextFeed") == "next")
  {
    RSSList.firstChild.setAttribute("nextFeed", "random");
  }
  else
  {
    RSSList.firstChild.setAttribute("nextFeed", "next");
  }
  inforssSave();
};

//------------------------------------------------------------------------------
inforssXMLRepository.switchDirection = function()
{
  if (RSSList.firstChild.getAttribute("scrollingdirection") == "rtl")
  {
    RSSList.firstChild.setAttribute("scrollingdirection", "ltr");
  }
  else
  {
    RSSList.firstChild.setAttribute("scrollingdirection", "rtl");
  }
  inforssSave();
};

//------------------------------------------------------------------------------
//FIXME Why does this live in prefs and not in the xml (or why doesn't more live here?)
inforssXMLRepository.getServerInfo = function()
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
    inforssXMLRepository.setServerInfo(serverInfo.protocol, serverInfo.server, serverInfo.directory, serverInfo.user, serverInfo.password, serverInfo.autosync);
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
};

//------------------------------------------------------------------------------
inforssXMLRepository.setServerInfo = function(protocol, server, directory, user, password, autosync)
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
};


//------------------------------------------------------------------------------
//FIXME I don't think any of these passowrd functions have anything to do with this class
//FIXME passwordManager is way dead.
inforssXMLRepository.storePassword = function(url, user, password)
{
  if ("@mozilla.org/login-manager;1" in Components.classes)
  {
    var loginManager = Components.classes["@mozilla.org/login-manager;1"].getService(Components.interfaces.nsILoginManager);
    var nsLoginInfo = new Components.Constructor("@mozilla.org/login-manager/loginInfo;1", Components.interfaces.nsILoginInfo, "init");
    var loginInfo = new nsLoginInfo(url, 'User Registration', null, user, password, "", "");
    try
    {
      loginManager.removeLogin(loginInfo);
    }
    catch (e)
    {}
    loginManager.addLogin(loginInfo);
  }
  else
  {
    var passwordManager = Components.classes["@mozilla.org/passwordmanager;1"].createInstance(Components.interfaces.nsIPasswordManager);
    try
    {
      passwordManager.removeUser(url, user);
    }
    catch (e)
    {}
    passwordManager.addUser(url, user, password);
  }
};


//------------------------------------------------------------------------------
inforssXMLRepository.readPassword = function(url, user)
{
  var password = {
    value: ""
  };
  if ("@mozilla.org/login-manager;1" in Components.classes)
  {
    try
    {
      let loginManager = Components.classes["@mozilla.org/login-manager;1"].getService(Components.interfaces.nsILoginManager);

      // Find users for the given parameters
      let logins = loginManager.findLogins(
      {}, url, 'User Registration', null);

      // Find user from returned array of nsILoginInfo objects
      for (let i = 0; i < logins.length; i++)
      {
        if (logins[i].username == user)
        {
          password.value = logins[i].password;
          break;
        }
      }
    }
    catch (ex)
    {}
  }
  else
  {
    try
    {
      let passManager = Components.classes["@mozilla.org/passwordmanager;1"].getService(Components.interfaces.nsIPasswordManagerInternal);
      let host = {
        value: ""
      };
      var login = {
        value: ""
      };
      passManager.findPasswordEntry(url, user, "", host, login, password);
    }
    catch (ee)
    {}
  }
  return password.value;
};

//------------------------------------------------------------------------------
//FIXME Should be a method of the above
function inforssSave()
{
  try
  {
    var file = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).get("ProfD", Components.interfaces.nsIFile);
    file.append(INFORSS_REPOSITORY);
    var outputStream = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance(Components.interfaces.nsIFileOutputStream);
    outputStream.init(file, -1, -1, 0);
    if (RSSList != null)
    {
      new XMLSerializer().serializeToStream(RSSList, outputStream, "UTF-8");
    }
    outputStream.close();
    //FIXME also add this to the inforssXML reader
    let prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("inforss.");
    prefs.setBoolPref("debug.alert", RSSList.firstChild.getAttribute("debug") == "true");
    prefs.setBoolPref("debug.log", RSSList.firstChild.getAttribute("log") == "true");
    prefs.setBoolPref("debug.statusbar", RSSList.firstChild.getAttribute("statusbar") == "true");
  }
  catch (e)
  {
    inforssDebug(e);
  }
}

//------------------------------------------------------------------------------
//FIXME Should be a method of the above
function inforssAddItemToRSSList(title, description, url, link, user, password, feedFlag)
{
  inforssTraceIn();
  var elem = null;
  try
  {
    if (RSSList == null)
    {
      RSSList = document.createElement("LIST-RSS");
    }
    elem = RSSList.createElement("RSS");
    elem.setAttribute("url", url);
    elem.setAttribute("title", title);
    elem.setAttribute("selected", "false");
    elem.setAttribute("nbItem", inforssXMLRepository.getDefaultNbItem());
    elem.setAttribute("lengthItem", inforssXMLRepository.getDefaultLengthItem());
    elem.setAttribute("playPodcast", inforssXMLRepository.getDefaultPlayPodcast());
    elem.setAttribute("savePodcastLocation", inforssXMLRepository.getSavePodcastLocation());
    elem.setAttribute("purgeHistory", inforssXMLRepository.getDefaultPurgeHistory());
    elem.setAttribute("browserHistory", inforssXMLRepository.getDefaultBrowserHistory());
    elem.setAttribute("filterCaseSensitive", "true");
    elem.setAttribute("link", link);
    elem.setAttribute("description", (description == null || description == "") ? title : description);
    elem.setAttribute("icon", "");
    elem.setAttribute("refresh", inforssXMLRepository.getDefaultRefresh());
    elem.setAttribute("activity", "true");
    if (user != null && user != "")
    {
      elem.setAttribute("user", user);
      inforssXMLRepository.storePassword(url, user, password);
    }
    elem.setAttribute("filter", "all");
    elem.setAttribute("type", feedFlag ? "atom" : "rss");
    RSSList.firstChild.appendChild(elem);
  }
  catch (e)
  {
    inforssDebug(e);
  }
  inforssTraceOut();
  return elem;
}


//------------------------------------------------------------------------------
/* exported inforssGetItemFromUrl */
//FIXME Should be a method of the above
function inforssGetItemFromUrl(url)
{
  inforssTraceIn();
  try
  {
    for (let item of RSSList.getElementsByTagName("RSS"))
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

//------------------------------------------------------------------------------
/* exported getCurrentRSS */
//FIXME Should be a method of the above
//FIXME This is sufficiently similar to the above that maybe a loop with a
//      closure might be better.
function getCurrentRSS()
{
  inforssTraceIn();
  try
  {
    for (let item of RSSList.getElementsByTagName("RSS"))
    {
      if (item.getAttribute("selected"))
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

//------------------------------------------------------------------------------
inforssXMLRepository.outputAsOPML = function(filePath, progress)
{
  let opmlFile = new LocalFile(filePath);
  let stream = new FileOutputStream(opmlFile, -1, -1, 0);
  let sequence = Promise.resolve(1);
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
      //According to ecmascript 5 I shouldn't need to frag about with this
      //local closure because I use a let not a var
      (function() { let item = iteml;
      //end hack
      sequence = sequence.then(function(i)
      {
        let outline = document.createElement("outline");
        outline.setAttribute("type", item.getAttribute("type"));
        outline.setAttribute("title", item.getAttribute("title"));
        outline.setAttribute("xmlHome", item.getAttribute("link"));
        outline.setAttribute("text", item.getAttribute("description"));
        outline.setAttribute("xmlUrl", item.getAttribute("url"));
        outline.setAttribute("user", item.getAttribute("user"));
        outline.setAttribute("icon", item.getAttribute("icon"));
        outline.setAttribute("selected", item.getAttribute("selected"));
        outline.setAttribute("nbItem", item.getAttribute("nbItem"));
        outline.setAttribute("lengthItem", item.getAttribute("lengthItem"));
        outline.setAttribute("refresh", item.getAttribute("refresh"));
        outline.setAttribute("filter", item.getAttribute("filter"));
        outline.setAttribute("infoType", item.getAttribute("type"));
        outline.setAttribute("filterPolicy", item.getAttribute("filterPolicy"));
        outline.setAttribute("playPodcast", item.getAttribute("playPodcast"));
        outline.setAttribute("browserHistory", item.getAttribute("browserHistory"));
        outline.setAttribute("filterCaseSensitive", item.getAttribute("filterCaseSensitive"));
        outline.setAttribute("activity", item.getAttribute("activity"));
        outline.setAttribute("regexp", item.getAttribute("regexp"));
        outline.setAttribute("regexpTitle", item.getAttribute("regexpTitle"));
        outline.setAttribute("regexpDescription", item.getAttribute("regexpDescription"));
        outline.setAttribute("regexpPubDate", item.getAttribute("regexpPubDate"));
        outline.setAttribute("regexpLink", item.getAttribute("regexpLink"));
        outline.setAttribute("regexpCategory", item.getAttribute("regexpCategory"));
        outline.setAttribute("regexpStartAfter", item.getAttribute("regexpStartAfter"));
        outline.setAttribute("regexpStopBefore", item.getAttribute("regexpStopBefore"));
        outline.setAttribute("htmlDirection", item.getAttribute("htmlDirection"));
        outline.setAttribute("htmlTest", item.getAttribute("htmlTest"));
        outline.setAttribute("group", item.getAttribute("group"));
        outline.setAttribute("groupAssociated", item.getAttribute("groupAssociated"));
        outline.setAttribute("acknowledgeDate", item.getAttribute("acknowledgeDate"));

        serializer.serializeToStream(outline, stream, "UTF-8");
        stream.write("\n", "\n".length);
        progress(i, items.length);
        //Give the javascript machine a chance to display the progress bar.
        return new Promise(function(resolve, reject)
        {
            setTimeout(function(i)
            {
                resolve(i + 1);
            }, 0, i);
        });
      }
    );
    //hack
    }() /*invoke closure immediately*/ );
    //end hack
  }
  sequence.then(function()
  {
    str = '  </body>\n' + '</opml>';
    stream.write(str, str.length);
    stream.close();
  });
  return sequence;
};