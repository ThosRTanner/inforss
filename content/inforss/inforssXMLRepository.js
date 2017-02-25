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
Components.utils.import("chrome://inforss/content/modules/inforssDebug.jsm");

/* globals inforssCheckVersion, inforssGetVersion, inforssGetResourceFile */
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

const ScriptableInputStream = Components.Constructor("@mozilla.org/scriptableinputstream;1",
                                                     "nsIScriptableInputStream",
                                                     "init");

const UTF8Converter = Components.Constructor("@mozilla.org/intl/utf8converterservice;1",
                                             "nsIUTF8ConverterService");

const FileOutputStream = Components.Constructor("@mozilla.org/network/file-output-stream;1",
                                                "nsIFileOutputStream",
                                                "init");

const Properties = Components.Constructor("@mozilla.org/file/directory_service;1",
                                          "nsIProperties");

const profile_dir = new Properties().get("ProfD", Components.interfaces.nsIFile);

//FIXME Turn this into a module, once we have all access to RSSList in here
//Please also note everywhere refers to this via inforssxmlRepository. which
//makes this into an embarassing messy singleton.
//sadly 'class' isn't yet supported in palemoon

/* global RSSList: true */
/* global inforssFindIcon */

//Shouldn't be exported and should be hooked off profile_dir
/* exported INFORSS_REPOSITORY */
const INFORSS_REPOSITORY = "inforss.xml";

/* exported MODE_APPEND */
const MODE_APPEND = 0;
/* exported MODE_REPLACE */
const MODE_REPLACE = 1;

//------------------------------------------------------------------------------
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
//------------------------------------------------------------------------------
is_valid()
{
  return RSSList != null;
},

//------------------------------------------------------------------------------
getTimeSlice()
{
  return RSSList.firstChild.getAttribute("timeslice");
},

//------------------------------------------------------------------------------
//FIXME Replace these two with one function returning 3 values
//Headlines_At_Top, Headlines_At_Bottom, Headlines_In_Statusbar
getSeparateLine()
{
  return RSSList.firstChild.getAttribute("separateLine");
},

//------------------------------------------------------------------------------
getLinePosition()
{
  return RSSList.firstChild.getAttribute("linePosition");
},

//------------------------------------------------------------------------------
getMouseEvent()
{
  return eval(RSSList.firstChild.getAttribute("mouseEvent"));
},

//------------------------------------------------------------------------------
getMouseWheelScroll()
{
  return RSSList.firstChild.getAttribute("mouseWheelScroll");
},

//------------------------------------------------------------------------------
getDefaultPlayPodcast()
{
  return RSSList.firstChild.getAttribute("defaultPlayPodcast");
},

//------------------------------------------------------------------------------
getSavePodcastLocation()
{
  return RSSList.firstChild.getAttribute("savePodcastLocation");
},

//------------------------------------------------------------------------------
getDefaultBrowserHistory()
{
  return RSSList.firstChild.getAttribute("defaultBrowserHistory");
},

//------------------------------------------------------------------------------
getDefaultNbItem()
{
  return RSSList.firstChild.getAttribute("defaultNbItem");
},

//------------------------------------------------------------------------------
getDefaultLengthItem()
{
  return RSSList.firstChild.getAttribute("defaultLenghtItem");
},

//------------------------------------------------------------------------------
getDefaultRefresh()
{
  return RSSList.firstChild.getAttribute("refresh");
},

//------------------------------------------------------------------------------
getScrollingIncrement()
{
  return eval(RSSList.firstChild.getAttribute("scrollingIncrement"));
},

//------------------------------------------------------------------------------
getScrollingArea()
{
  return RSSList.firstChild.getAttribute("scrollingArea");
},

//------------------------------------------------------------------------------
setScrollingArea(width)
{
  RSSList.firstChild.setAttribute("scrollingArea", width);
},

//------------------------------------------------------------------------------
isHideViewed()
{
  return (RSSList.firstChild.getAttribute("hideViewed") == "true");
},

//------------------------------------------------------------------------------
setHideViewed(value)
{
  RSSList.firstChild.setAttribute("hideViewed", value);
},

//------------------------------------------------------------------------------
isHideOld()
{
  return (RSSList.firstChild.getAttribute("hideOld") == "true");
},

//------------------------------------------------------------------------------
setHideOld(value)
{
  RSSList.firstChild.setAttribute("hideOld", value);
},

//------------------------------------------------------------------------------
isHideHistory()
{
  return (RSSList.firstChild.getAttribute("hideHistory") == "true");
},

//------------------------------------------------------------------------------
isIncludeAssociated()
{
  return (RSSList.firstChild.getAttribute("includeAssociated") == "true");
},

//------------------------------------------------------------------------------
getGroupLengthItem()
{
  return RSSList.firstChild.getAttribute("groupLenghtItem");
},

//------------------------------------------------------------------------------
getGroupNbItem()
{
  return RSSList.firstChild.getAttribute("groupNbItem");
},

//------------------------------------------------------------------------------
getGroupRefresh()
{
  return RSSList.firstChild.getAttribute("groupRefresh");
},

//------------------------------------------------------------------------------
getSubMenu()
{
  return RSSList.firstChild.getAttribute("submenu");
},

//------------------------------------------------------------------------------
getDefaultPurgeHistory()
{
  return RSSList.firstChild.getAttribute("defaultPurgeHistory");
},

//------------------------------------------------------------------------------
getFontSize()
{
  return RSSList.firstChild.getAttribute("fontSize");
},

//------------------------------------------------------------------------------
getNextFeed()
{
  return RSSList.firstChild.getAttribute("nextFeed");
},

//------------------------------------------------------------------------------
getScrollingSpeed()
{
  return (30 - eval(RSSList.firstChild.getAttribute("scrollingspeed"))) * 10;
},

//------------------------------------------------------------------------------
getFilterHeadlines(rss)
{
  return rss.getAttribute("filterHeadlines");
},

//------------------------------------------------------------------------------
isFavicon()
{
  return (RSSList.firstChild.getAttribute("favicon") == "true");
},

//------------------------------------------------------------------------------
getRed()
{
  return RSSList.firstChild.getAttribute("red");
},

//------------------------------------------------------------------------------
getGreen()
{
  return RSSList.firstChild.getAttribute("green");
},

//------------------------------------------------------------------------------
getBlue()
{
  return RSSList.firstChild.getAttribute("blue");
},

//------------------------------------------------------------------------------
getDelay()
{
  return RSSList.firstChild.getAttribute("delay");
},

//------------------------------------------------------------------------------
getCyclingDelay()
{
  return RSSList.firstChild.getAttribute("cyclingDelay");
},

//------------------------------------------------------------------------------
isCycling()
{
  return (RSSList.firstChild.getAttribute("cycling") == "true");
},

//------------------------------------------------------------------------------
isCycleWithinGroup()
{
  return (RSSList.firstChild.getAttribute("cycleWithinGroup") == "true");
},

//------------------------------------------------------------------------------
getTooltip()
{
  return RSSList.firstChild.getAttribute("tooltip");
},

//------------------------------------------------------------------------------
getClickHeadline()
{
  return RSSList.firstChild.getAttribute("clickHeadline");
},

//------------------------------------------------------------------------------
getFont()
{
  return (RSSList.firstChild.getAttribute("font") == "auto") ? "inherit" : RSSList.firstChild.getAttribute("font");
},

//------------------------------------------------------------------------------
isActive()
{
  return (RSSList.firstChild.getAttribute("switch") == "true");
},

//------------------------------------------------------------------------------
getBold()
{
  return (RSSList.firstChild.getAttribute("bold") == "true") ? "bolder" : "normal";
},

//------------------------------------------------------------------------------
getItalic()
{
  return (RSSList.firstChild.getAttribute("italic") == "true") ? "italic" : "normal";
},

//------------------------------------------------------------------------------
isScrolling()
{
  return ((RSSList.firstChild.getAttribute("scrolling") == "1") ||
    (RSSList.firstChild.getAttribute("scrolling") == "2"));
},

//------------------------------------------------------------------------------
isFadeIn()
{
  return (RSSList.firstChild.getAttribute("scrolling") == "2");
},

//------------------------------------------------------------------------------
toggleScrolling()
{
  RSSList.firstChild.setAttribute("scrolling", this.isScrolling() ? "0" : "1");
  this.save();
},

//------------------------------------------------------------------------------
isStopScrolling()
{
  return RSSList.firstChild.getAttribute("stopscrolling") == "true";
},

//------------------------------------------------------------------------------
isCurrentFeed()
{
  return RSSList.firstChild.getAttribute("currentfeed") == "true";
},

//------------------------------------------------------------------------------
isLivemark()
{
  return RSSList.firstChild.getAttribute("livemark") == "true";
},

//------------------------------------------------------------------------------
isClipboard()
{
  return RSSList.firstChild.getAttribute("clipboard") == "true";
},

//------------------------------------------------------------------------------
getSortedMenu()
{
  return RSSList.firstChild.getAttribute("sortedMenu");
},

//------------------------------------------------------------------------------
getCollapseBar()
{
  return RSSList.firstChild.getAttribute("collapseBar") == "true";
},

//------------------------------------------------------------------------------
getForegroundColor()
{
  return RSSList.firstChild.getAttribute("foregroundColor");
},

//------------------------------------------------------------------------------
getDefaultForegroundColor()
{
  return RSSList.firstChild.getAttribute("defaultForegroundColor");
},

//------------------------------------------------------------------------------
getSubMenuType()
{
  return (this.getSubMenu() == "true") ? "menu" : "menuitem";
},

//------------------------------------------------------------------------------
getDefaultGroupIcon()
{
  return RSSList.firstChild.getAttribute("defaultGroupIcon");
},

//------------------------------------------------------------------------------
getScrollingDirection()
{
  return RSSList.firstChild.getAttribute("scrollingdirection");
},

//------------------------------------------------------------------------------
isReadAllIcon()
{
  return RSSList.firstChild.getAttribute("readAllIcon") == "true";
},

//------------------------------------------------------------------------------
isViewAllIcon()
{
  return RSSList.firstChild.getAttribute("viewAllIcon") == "true";
},

//------------------------------------------------------------------------------
isShuffleIcon()
{
  return RSSList.firstChild.getAttribute("shuffleIcon") == "true";
},

//------------------------------------------------------------------------------
isDirectionIcon()
{
  return RSSList.firstChild.getAttribute("directionIcon") == "true";
},

//------------------------------------------------------------------------------
isScrollingIcon()
{
  return RSSList.firstChild.getAttribute("scrollingIcon") == "true";
},

//------------------------------------------------------------------------------
isPreviousIcon()
{
  return RSSList.firstChild.getAttribute("previousIcon") == "true";
},

//------------------------------------------------------------------------------
isPauseIcon()
{
  return RSSList.firstChild.getAttribute("pauseIcon") == "true";
},

//------------------------------------------------------------------------------
isNextIcon()
{
  return RSSList.firstChild.getAttribute("nextIcon") == "true";
},

//------------------------------------------------------------------------------
isRefreshIcon()
{
  return RSSList.firstChild.getAttribute("refreshIcon") == "true";
},

//------------------------------------------------------------------------------
isHideOldIcon()
{
  return RSSList.firstChild.getAttribute("hideOldIcon") == "true";
},

//------------------------------------------------------------------------------
isHideViewedIcon()
{
  return RSSList.firstChild.getAttribute("hideViewedIcon") == "true";
},

//------------------------------------------------------------------------------
isSynchronizationIcon()
{
  return RSSList.firstChild.getAttribute("synchronizationIcon") == "true";
},

//------------------------------------------------------------------------------
isSynchronizeIcon()
{
  return RSSList.firstChild.getAttribute("synchronizeIcon") == "true";
},

//------------------------------------------------------------------------------
isFlashingIcon()
{
  return RSSList.firstChild.getAttribute("flashingIcon") == "true";
},

//------------------------------------------------------------------------------
isHomeIcon()
{
  return RSSList.firstChild.getAttribute("homeIcon") == "true";
},

//------------------------------------------------------------------------------
isFilterIcon()
{
  return RSSList.firstChild.getAttribute("filterIcon") == "true";
},

//------------------------------------------------------------------------------
setQuickFilter(active, filter)
{
  RSSList.firstChild.setAttribute("quickFilterActif", active);
  RSSList.firstChild.setAttribute("quickFilter", filter);
  this.save();
},

//------------------------------------------------------------------------------
getQuickFilter()
{
  return RSSList.firstChild.getAttribute("quickFilter");
},

//------------------------------------------------------------------------------
isQuickFilterActif()
{
  return RSSList.firstChild.getAttribute("quickFilterActif") == "true";
},

//------------------------------------------------------------------------------
isPopupMessage()
{
  return RSSList.firstChild.getAttribute("popupMessage") == "true";
},

//------------------------------------------------------------------------------
isPlaySound()
{
  return RSSList.firstChild.getAttribute("playSound") == "true";
},

//------------------------------------------------------------------------------
isDisplayEnclosure()
{
  return RSSList.firstChild.getAttribute("displayEnclosure") == "true";
},

//------------------------------------------------------------------------------
isDisplayBanned()
{
  return RSSList.firstChild.getAttribute("displayBanned") == "true";
},

//------------------------------------------------------------------------------
isPlayList()
{
  return RSSList.firstChild.getAttribute("playlist") == "true";
},

//------------------------------------------------------------------------------
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

//------------------------------------------------------------------------------
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

//------------------------------------------------------------------------------
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

//------------------------------------------------------------------------------
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


//------------------------------------------------------------------------------
//FIXME I don't think any of these passowrd functions have anything to do with this class
//FIXME passwordManager is way dead.
storePassword(url, user, password)
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
},


//------------------------------------------------------------------------------
readPassword(url, user)
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
},

//------------------------------------------------------------------------------
save()
{
  try
  {
    var file = profile_dir.clone();
    file.append(INFORSS_REPOSITORY);
    let outputStream = new FileOutputStream(file, -1, -1, 0);
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
},

//------------------------------------------------------------------------------
add_item(title, description, url, link, user, password, feedFlag)
{
  inforssTraceIn();
  try
  {
    if (RSSList == null)
    {
      RSSList = document.createElement("LIST-RSS");
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

//------------------------------------------------------------------------------
_new_item(list, title, description, url, link, user, password, type)
{
  inforssTraceIn();
  try
  {
    let elem = list.createElement("RSS");
    elem.setAttribute("url", url);
    elem.setAttribute("title", title);
    elem.setAttribute("selected", "false");
    elem.setAttribute("nbItem", this.getDefaultNbItem());
    elem.setAttribute("lengthItem", this.getDefaultLengthItem());
    elem.setAttribute("playPodcast", this.getDefaultPlayPodcast());
    elem.setAttribute("savePodcastLocation", this.getSavePodcastLocation());
    elem.setAttribute("purgeHistory", this.getDefaultPurgeHistory());
    elem.setAttribute("browserHistory", this.getDefaultBrowserHistory());
    elem.setAttribute("filterCaseSensitive", "true");
    elem.setAttribute("link", link == null || link == "" ? url : link);
    elem.setAttribute("description", description == null || description == "" ? title : description);
    elem.setAttribute("icon", "");
    elem.setAttribute("refresh", this.getDefaultRefresh());
    elem.setAttribute("activity", "true");
    if (user != null && user != "")
    {
      elem.setAttribute("user", user);
      this.storePassword(url, user, password);
    }
    elem.setAttribute("filter", "all");
    elem.setAttribute("type", type);
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

export_to_OPML(filePath, progress)
{
  //FIXME Should do an atomic write (to a temp file and then rename)
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
    let item = iteml; //Hack - according to JS6 this is unnecessary
    sequence = sequence.then(i =>
    {
      let outline = document.createElement("outline");
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
      return new Promise(function(resolve/*, reject*/)
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

//------------------------------------------------------------------------------

backup()
{
  try
  {
    let file = profile_dir.clone();
    file.append(INFORSS_REPOSITORY);
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

//------------------------------------------------------------------------------

import_from_OPML(text, mode, progress)
{
  let domFile = new DOMParser().parseFromString(text, "text/xml");
  if (domFile.documentElement.nodeName != "opml")
  {
    return null;
  }

  let list = RSSList.cloneNode(true);
  if (mode == MODE_REPLACE)
  {
    let node = list.firstChild;
    while (node.firstChild != null)
    {
      node.removeChild(node.firstChild);
    }
  }

  let sequence = Promise.resolve({ count: 1, list: list });
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
      return new Promise(function(resolve/*, reject*/)
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
    /**/console.log("suppressed setting to ". where);
    //RSSList = where.list;
    return new Promise(resolve => resolve(where.list.firstChild.childNodes.length));
  });
  return sequence;
},

//------------------------------------------------------------------------------
//FIXME once this is all in its own class, this should be in the "constructor"
//need to be a bit careful about alerting the error if it's possible to keep
//the error handling outside of here.
//Note that also this is a bit crappy because there is no upgrade from pre v3
//configurations but we treat the user to a proper message. This means we need
//to detail why we failed.
read_configuration()
{
  let str = inforssGetRepositoryAsString();
  RSSList = new DOMParser().parseFromString(str, "text/xml");
  inforssAdjustRepository();
}

};

//-------------------------------------------------------------------------------------------------------------

function inforssGetRepositoryAsString()
{
  var outputStr = null;
  const INFORSS_VERSION = "3";
  var file = inforssGetFile(INFORSS_VERSION);

  if (file.exists())
  {
    let is = new FileInputStream(file, -1, -1, 0);
    let sis = new ScriptableInputStream(is);
    let data = sis.read(-1);
    sis.close();
    is.close();
    let uConv = new UTF8Converter();
    outputStr = uConv.convertStringToUTF8(data, "UTF-8", false);
  }
  return outputStr;
}

//-------------------------------------------------------------------------------------------------------------
function inforssGetFile(version)
{
  let file = profile_dir.clone();
  file.append(INFORSS_REPOSITORY);

  if (!file.exists())
  {
    inforssDefaultRepository();
  }
  if (file.exists())
  {
    let is = new FileInputStream(file, -1, -1, 0);
    let sis = new ScriptableInputStream(is);
    var output = sis.read(-1);
    sis.close();
    is.close();
    if (output.length > 0)
    {
      var repository = new DOMParser().parseFromString(output, "text/xml");
      if (repository.firstChild.getAttribute("version") < version)
      {
        alert(document.getElementById("bundle_inforss").getString("inforss.wrongVersionXmlFile"));
        inforssDefaultRepository();
      }
    }
    else
    {
      inforssDefaultRepository();
    }
  }
  return file;
}


//-------------------------------------------------------------------------------------------------------------
function inforssAdjustRepository()
{
  try
  {
    let items = RSSList.getElementsByTagName("RSS");
    if (RSSList.firstChild.getAttribute("version") == "3")
    {
      RSSList.firstChild.setAttribute("red", 127);
      RSSList.firstChild.setAttribute("green", 192);
      RSSList.firstChild.setAttribute("blue", 255);
      RSSList.firstChild.setAttribute("version", "5");
      RSSList.firstChild.setAttribute("delay", "15");
      RSSList.firstChild.setAttribute("refresh", "2");
      RSSList.firstChild.setAttribute("switch", "true");
      RSSList.firstChild.setAttribute("groupNbItem", "3");
      RSSList.firstChild.setAttribute("groupLenghtItem", "25");
      RSSList.firstChild.setAttribute("groupRefresh", "2");
      RSSList.firstChild.setAttribute("separateLine", "false");
      RSSList.firstChild.setAttribute("linePosition", "bottom");
      RSSList.firstChild.setAttribute("scrolling", "1");
      RSSList.firstChild.setAttribute("submenu", "false");
      RSSList.firstChild.setAttribute("group", "false");
      RSSList.firstChild.setAttribute("debug", "false");
      RSSList.firstChild.setAttribute("log", "false");
      RSSList.firstChild.setAttribute("statusbar", "false");
      RSSList.firstChild.setAttribute("net", "false");
      RSSList.firstChild.setAttribute("bold", "true");
      RSSList.firstChild.setAttribute("italic", "true");
      RSSList.firstChild.setAttribute("currentfeed", "true");
      RSSList.firstChild.setAttribute("livemark", "true");
      RSSList.firstChild.setAttribute("clipboard", "true");
      RSSList.firstChild.setAttribute("scrollingspeed", "19");
      RSSList.firstChild.setAttribute("font", "auto");
      RSSList.firstChild.setAttribute("foregroundColor", "auto");
      RSSList.firstChild.setAttribute("defaultForegroundColor", "default");
      RSSList.firstChild.setAttribute("favicon", "true");
      RSSList.firstChild.setAttribute("scrollingArea", "500");
      RSSList.firstChild.setAttribute("hideViewed", "false");
      RSSList.firstChild.setAttribute("tooltip", "description");
      RSSList.firstChild.setAttribute("clickHeadline", "0");
      RSSList.firstChild.setAttribute("hideOld", "false");
      RSSList.firstChild.setAttribute("sortedMenu", "asc");
      RSSList.firstChild.setAttribute("hideOld", "false");
      RSSList.firstChild.setAttribute("hideHistory", "true");
      RSSList.firstChild.setAttribute("includeAssociated", "true");
      RSSList.firstChild.setAttribute("cycling", "false");
      RSSList.firstChild.setAttribute("cyclingDelay", "5");
      RSSList.firstChild.setAttribute("nextFeed", "next");
      RSSList.firstChild.setAttribute("defaultPurgeHistory", "3");
      RSSList.firstChild.setAttribute("fontSize", "auto");
      RSSList.firstChild.setAttribute("stopscrolling", "true");
      RSSList.firstChild.setAttribute("cycleWithinGroup", "false");
      RSSList.firstChild.setAttribute("defaultGroupIcon", "chrome://inforss/skin/group.png");
      RSSList.firstChild.setAttribute("scrollingdirection", "rtl");
      RSSList.firstChild.setAttribute("readAllIcon", "true");
      RSSList.firstChild.setAttribute("viewAllIcon", "true");
      RSSList.firstChild.setAttribute("shuffleIcon", "true");
      RSSList.firstChild.setAttribute("directionIcon", "true");
      RSSList.firstChild.setAttribute("scrollingIcon", "true");
      RSSList.firstChild.setAttribute("previousIcon", "true");
      RSSList.firstChild.setAttribute("pauseIcon", "true");
      RSSList.firstChild.setAttribute("nextIcon", "true");
      RSSList.firstChild.setAttribute("synchronizeIcon", "false");
      RSSList.firstChild.setAttribute("refreshIcon", "false");
      RSSList.firstChild.setAttribute("hideOldIcon", "false");
      RSSList.firstChild.setAttribute("hideViewedIcon", "false");
      RSSList.firstChild.setAttribute("popupMessage", "false");
      RSSList.firstChild.setAttribute("flashingIcon", "true");
      RSSList.firstChild.setAttribute("homeIcon", "false");
      RSSList.firstChild.setAttribute("filterIcon", "false");
      RSSList.firstChild.setAttribute("defaultPlayPodcast", "true");
      RSSList.firstChild.setAttribute("displayEnclosure", "true");
      RSSList.firstChild.setAttribute("displayBanned", "true");
      RSSList.firstChild.setAttribute("savePodcastLocation", "");
      RSSList.firstChild.setAttribute("defaultBrowserHistory", "true");
      RSSList.firstChild.setAttribute("collapseBar", "false");
      RSSList.firstChild.setAttribute("scrollingIncrement", "2");
      RSSList.firstChild.setAttribute("quickFilter", "");
      RSSList.firstChild.setAttribute("quickFilterActif", "false");
      RSSList.firstChild.setAttribute("timeslice", "90");
      RSSList.firstChild.setAttribute("mouseEvent", "0");
      RSSList.firstChild.setAttribute("mouseWheelScroll", "pixel");

      for (let i = 0; i < items.length; i++)
      {
        items[i].setAttribute("group", "false");
        items[i].setAttribute("filter", "all");
        if (items[i].hasAttribute("nbItem") == false)
        {
          items[i].setAttribute("nbItem", RSSList.firstChild.getAttribute("defaultNbItem"));
        }
        if (items[i].hasAttribute("lengthItem") == false)
        {
          items[i].setAttribute("lengthItem", RSSList.firstChild.getAttribute("defaultLenghtItem"));
        }
        if (items[i].hasAttribute("refresh") == false)
        {
          items[i].setAttribute("refresh", RSSList.firstChild.getAttribute("refresh"));
        }
        if (items[i].hasAttribute("playPodcast") == false)
        {
          items[i].setAttribute("playPodcast", "true");
        }
        if (items[i].hasAttribute("savePodcastLocation") == false)
        {
          items[i].setAttribute("savePodcastLocation", "");
        }
        if (items[i].hasAttribute("browserHistory") == false)
        {
          items[i].setAttribute("browserHistory", "true");
        }
        if (items[i].hasAttribute("filterCaseSensitive") == false)
        {
          items[i].setAttribute("filterCaseSensitive", "true");
        }
        if (items[i].hasAttribute("purgeHistory") == false)
        {
          items[i].setAttribute("purgeHistory", RSSList.firstChild.getAttribute("defaultPurgeHistory"));
        }
        items[i].setAttribute("type", "rss");
        items[i].setAttribute("filterPolicy", "0");
        items[i].setAttribute("encoding", "");
        if ((items[i].getAttribute("type") == "group") && (items[i].hasAttribute("playlist") == false))
        {
          items[i].setAttribute("playlist", "false");
        }
      }
    }
    else
    {
      if (RSSList.firstChild.getAttribute("version") == "4")
      {
        RSSList.firstChild.setAttribute("version", "5");
        RSSList.firstChild.setAttribute("refresh", "2");
        RSSList.firstChild.setAttribute("switch", "true");
        RSSList.firstChild.setAttribute("groupNbItem", "3");
        RSSList.firstChild.setAttribute("groupLenghtItem", "25");
        RSSList.firstChild.setAttribute("groupRefresh", "2");
        RSSList.firstChild.setAttribute("separateLine", "false");
        RSSList.firstChild.setAttribute("linePosition", "bottom");
        RSSList.firstChild.setAttribute("scrolling", "1");
        RSSList.firstChild.setAttribute("submenu", "false");
        RSSList.firstChild.setAttribute("group", "false");
        RSSList.firstChild.setAttribute("debug", "false");
        RSSList.firstChild.setAttribute("log", "false");
        RSSList.firstChild.setAttribute("statusbar", "false");
        RSSList.firstChild.setAttribute("net", "false");
        RSSList.firstChild.setAttribute("bold", "true");
        RSSList.firstChild.setAttribute("italic", "true");
        RSSList.firstChild.setAttribute("currentfeed", "true");
        RSSList.firstChild.setAttribute("livemark", "true");
        RSSList.firstChild.setAttribute("clipboard", "true");
        RSSList.firstChild.setAttribute("scrollingspeed", "19");
        RSSList.firstChild.setAttribute("font", "auto");
        RSSList.firstChild.setAttribute("foregroundColor", "auto");
        RSSList.firstChild.setAttribute("defaultForegroundColor", "default");
        RSSList.firstChild.setAttribute("favicon", "true");
        RSSList.firstChild.setAttribute("scrollingArea", "500");
        RSSList.firstChild.setAttribute("hideViewed", "false");
        RSSList.firstChild.setAttribute("tooltip", "description");
        RSSList.firstChild.setAttribute("clickHeadline", "0");
        RSSList.firstChild.setAttribute("hideOld", "false");
        RSSList.firstChild.setAttribute("sortedMenu", "asc");
        RSSList.firstChild.setAttribute("hideHistory", "true");
        RSSList.firstChild.setAttribute("includeAssociated", "true");
        RSSList.firstChild.setAttribute("cycling", "false");
        RSSList.firstChild.setAttribute("cyclingDelay", "5");
        RSSList.firstChild.setAttribute("nextFeed", "next");
        RSSList.firstChild.setAttribute("defaultPurgeHistory", "3");
        RSSList.firstChild.setAttribute("fontSize", "auto");
        RSSList.firstChild.setAttribute("stopscrolling", "true");
        RSSList.firstChild.setAttribute("cycleWithinGroup", "false");
        RSSList.firstChild.setAttribute("defaultGroupIcon", "chrome://inforss/skin/group.png");
        RSSList.firstChild.setAttribute("scrollingdirection", "rtl");
        RSSList.firstChild.setAttribute("readAllIcon", "true");
        RSSList.firstChild.setAttribute("viewAllIcon", "true");
        RSSList.firstChild.setAttribute("shuffleIcon", "true");
        RSSList.firstChild.setAttribute("directionIcon", "true");
        RSSList.firstChild.setAttribute("scrollingIcon", "true");
        RSSList.firstChild.setAttribute("previousIcon", "true");
        RSSList.firstChild.setAttribute("pauseIcon", "true");
        RSSList.firstChild.setAttribute("nextIcon", "true");
        RSSList.firstChild.setAttribute("synchronizeIcon", "false");
        RSSList.firstChild.setAttribute("refreshIcon", "false");
        RSSList.firstChild.setAttribute("hideOldIcon", "false");
        RSSList.firstChild.setAttribute("hideViewedIcon", "false");
        RSSList.firstChild.setAttribute("popupMessage", "false");
        RSSList.firstChild.setAttribute("flashingIcon", "true");
        RSSList.firstChild.setAttribute("homeIcon", "false");
        RSSList.firstChild.setAttribute("filterIcon", "false");
        RSSList.firstChild.setAttribute("defaultPlayPodcast", "true");
        RSSList.firstChild.setAttribute("displayEnclosure", "true");
        RSSList.firstChild.setAttribute("displayBanned", "true");
        RSSList.firstChild.setAttribute("savePodcastLocation", "");
        RSSList.firstChild.setAttribute("defaultBrowserHistory", "true");
        RSSList.firstChild.setAttribute("collapseBar", "false");
        RSSList.firstChild.setAttribute("scrollingIncrement", "2");
        RSSList.firstChild.setAttribute("quickFilter", "");
        RSSList.firstChild.setAttribute("quickFilterActif", "false");
        RSSList.firstChild.setAttribute("timeslice", "90");
        RSSList.firstChild.setAttribute("mouseEvent", "0");
        RSSList.firstChild.setAttribute("mouseWheelScroll", "pixel");
        for (let i = 0; i < items.length; i++)
        {
          items[i].setAttribute("group", "false");
          items[i].setAttribute("filter", "all");
          if (items[i].hasAttribute("nbItem") == false)
          {
            items[i].setAttribute("nbItem", RSSList.firstChild.getAttribute("defaultNbItem"));
          }
          if (items[i].hasAttribute("lengthItem") == false)
          {
            items[i].setAttribute("lengthItem", RSSList.firstChild.getAttribute("defaultLenghtItem"));
          }
          if (items[i].hasAttribute("refresh") == false)
          {
            items[i].setAttribute("refresh", RSSList.firstChild.getAttribute("refresh"));
          }
          if (items[i].hasAttribute("playPodcast") == false)
          {
            items[i].setAttribute("playPodcast", "true");
          }
          if (items[i].hasAttribute("savePodcastLocation") == false)
          {
            items[i].setAttribute("savePodcastLocation", "");
          }
          if (items[i].hasAttribute("browserHistory") == false)
          {
            items[i].setAttribute("browserHistory", "true");
          }
          if (items[i].hasAttribute("filterCaseSensitive") == false)
          {
            items[i].setAttribute("filterCaseSensitive", "true");
          }
          items[i].setAttribute("type", "rss");
          items[i].setAttribute("filterPolicy", "0");
          items[i].setAttribute("encoding", "");
          if ((items[i].getAttribute("type") == "group") && (items[i].hasAttribute("playlist") == false))
          {
            items[i].setAttribute("playlist", "false");
          }
          if (items[i].hasAttribute("purgeHistory") == false)
          {
            items[i].setAttribute("purgeHistory", RSSList.firstChild.getAttribute("defaultPurgeHistory"));
          }
        }
      }
      else
      {
        if (RSSList.firstChild.hasAttribute("switch") == false)
        {
          RSSList.firstChild.setAttribute("switch", "true");
        }
        if (RSSList.firstChild.getAttribute("switch") == "on")
        {
          RSSList.firstChild.setAttribute("switch", "true");
        }
        if (RSSList.firstChild.hasAttribute("groupNbItem") == false)
        {
          RSSList.firstChild.setAttribute("groupNbItem", "3");
        }
        if (RSSList.firstChild.hasAttribute("groupLenghtItem") == false)
        {
          RSSList.firstChild.setAttribute("groupLenghtItem", "25");
        }
        if (RSSList.firstChild.hasAttribute("groupRefresh") == false)
        {
          RSSList.firstChild.setAttribute("groupRefresh", "2");
        }
        if (RSSList.firstChild.hasAttribute("separateLine") == false)
        {
          RSSList.firstChild.setAttribute("separateLine", "false");
        }
        if (RSSList.firstChild.hasAttribute("scrolling") == false)
        {
          RSSList.firstChild.setAttribute("scrolling", "1");
        }
        else
        {
          if (RSSList.firstChild.getAttribute("scrolling") == "true")
          {
            RSSList.firstChild.setAttribute("scrolling", "1");
          }
          else
          {
            if (RSSList.firstChild.getAttribute("scrolling") == "false")
            {
              RSSList.firstChild.setAttribute("scrolling", "0");
            }
          }
        }
        if (RSSList.firstChild.hasAttribute("submenu") == false)
        {
          RSSList.firstChild.setAttribute("submenu", "false");
        }
        if (RSSList.firstChild.hasAttribute("group") == false)
        {
          RSSList.firstChild.setAttribute("group", "false");
        }
        if (RSSList.firstChild.hasAttribute("linePosition") == false)
        {
          RSSList.firstChild.setAttribute("linePosition", "bottom");
        }
        if (RSSList.firstChild.hasAttribute("debug") == false)
        {
          RSSList.firstChild.setAttribute("debug", "false");
        }
        if (RSSList.firstChild.hasAttribute("log") == false)
        {
          RSSList.firstChild.setAttribute("log", "false");
        }
        if (RSSList.firstChild.hasAttribute("statusbar") == false)
        {
          RSSList.firstChild.setAttribute("statusbar", "false");
        }
        if (RSSList.firstChild.hasAttribute("net") == false)
        {
          RSSList.firstChild.setAttribute("net", "false");
        }
        if (RSSList.firstChild.hasAttribute("bold") == false)
        {
          RSSList.firstChild.setAttribute("bold", "true");
        }
        if (RSSList.firstChild.hasAttribute("italic") == false)
        {
          RSSList.firstChild.setAttribute("italic", "true");
        }
        if (RSSList.firstChild.hasAttribute("currentfeed") == false)
        {
          RSSList.firstChild.setAttribute("currentfeed", "true");
        }
        if (RSSList.firstChild.hasAttribute("livemark") == false)
        {
          RSSList.firstChild.setAttribute("livemark", "true");
        }
        if (RSSList.firstChild.hasAttribute("clipboard") == false)
        {
          RSSList.firstChild.setAttribute("clipboard", "true");
        }
        if (RSSList.firstChild.hasAttribute("scrollingspeed") == false)
        {
          RSSList.firstChild.setAttribute("scrollingspeed", "19");
        }
        if (RSSList.firstChild.hasAttribute("font") == false)
        {
          RSSList.firstChild.setAttribute("font", "auto");
        }
        if (RSSList.firstChild.hasAttribute("foregroundColor") == false)
        {
          RSSList.firstChild.setAttribute("foregroundColor", "auto");
        }
        if (RSSList.firstChild.hasAttribute("defaultForegroundColor") == false)
        {
          RSSList.firstChild.setAttribute("defaultForegroundColor", "default");
        }
        if (RSSList.firstChild.hasAttribute("favicon") == false)
        {
          RSSList.firstChild.setAttribute("favicon", "true");
        }
        if (RSSList.firstChild.hasAttribute("scrollingArea") == false)
        {
          RSSList.firstChild.setAttribute("scrollingArea", "500");
        }
        if (RSSList.firstChild.hasAttribute("hideViewed") == false)
        {
          RSSList.firstChild.setAttribute("hideViewed", "false");
        }
        if (RSSList.firstChild.hasAttribute("tooltip") == false)
        {
          RSSList.firstChild.setAttribute("tooltip", "description");
        }
        if (RSSList.firstChild.hasAttribute("clickHeadline") == false)
        {
          RSSList.firstChild.setAttribute("clickHeadline", "0");
        }
        if (RSSList.firstChild.hasAttribute("hideOld") == false)
        {
          RSSList.firstChild.setAttribute("hideOld", "false");
        }
        if (RSSList.firstChild.hasAttribute("sortedMenu") == false)
        {
          RSSList.firstChild.setAttribute("sortedMenu", "asc");
        }
        if (RSSList.firstChild.hasAttribute("hideHistory") == false)
        {
          RSSList.firstChild.setAttribute("hideHistory", "true");
        }
        if (RSSList.firstChild.hasAttribute("includeAssociated") == false)
        {
          RSSList.firstChild.setAttribute("includeAssociated", "true");
        }
        if (RSSList.firstChild.hasAttribute("cycling") == false)
        {
          RSSList.firstChild.setAttribute("cycling", "false");
        }
        if (RSSList.firstChild.hasAttribute("cyclingDelay") == false)
        {
          RSSList.firstChild.setAttribute("cyclingDelay", "5");
        }
        if (RSSList.firstChild.hasAttribute("nextFeed") == false)
        {
          RSSList.firstChild.setAttribute("nextFeed", "next");
        }
        if (RSSList.firstChild.hasAttribute("defaultPurgeHistory") == false)
        {
          RSSList.firstChild.setAttribute("defaultPurgeHistory", (RSSList.firstChild.hasAttribute("purgeHistory")) ? RSSList.firstChild.getAttribute("purgeHistory") : "3");
        }
        if (RSSList.firstChild.hasAttribute("purgeHistory"))
        {
          RSSList.firstChild.removeAttribute("purgeHistory");
        }
        if (RSSList.firstChild.hasAttribute("fontSize") == false)
        {
          RSSList.firstChild.setAttribute("fontSize", "auto");
        }
        if (RSSList.firstChild.hasAttribute("stopscrolling") == false)
        {
          RSSList.firstChild.setAttribute("stopscrolling", "true");
        }
        if (RSSList.firstChild.hasAttribute("cycleWithinGroup") == false)
        {
          RSSList.firstChild.setAttribute("cycleWithinGroup", "false");
        }
        if (RSSList.firstChild.hasAttribute("defaultGroupIcon") == false)
        {
          RSSList.firstChild.setAttribute("defaultGroupIcon", "chrome://inforss/skin/group.png");
        }
        if (RSSList.firstChild.hasAttribute("scrollingdirection") == false)
        {
          RSSList.firstChild.setAttribute("scrollingdirection", "rtl");
        }
        if (RSSList.firstChild.hasAttribute("readAllIcon") == false)
        {
          RSSList.firstChild.setAttribute("readAllIcon", "true");
        }
        if (RSSList.firstChild.hasAttribute("viewAllIcon") == false)
        {
          RSSList.firstChild.setAttribute("viewAllIcon", "true");
        }
        if (RSSList.firstChild.hasAttribute("shuffleIcon") == false)
        {
          RSSList.firstChild.setAttribute("shuffleIcon", "true");
        }
        if (RSSList.firstChild.hasAttribute("directionIcon") == false)
        {
          RSSList.firstChild.setAttribute("directionIcon", "true");
        }
        if (RSSList.firstChild.hasAttribute("scrollingIcon") == false)
        {
          RSSList.firstChild.setAttribute("scrollingIcon", "true");
        }
        if (RSSList.firstChild.hasAttribute("previousIcon") == false)
        {
          RSSList.firstChild.setAttribute("previousIcon", "true");
        }
        if (RSSList.firstChild.hasAttribute("pauseIcon") == false)
        {
          RSSList.firstChild.setAttribute("pauseIcon", "true");
        }
        if (RSSList.firstChild.hasAttribute("nextIcon") == false)
        {
          RSSList.firstChild.setAttribute("nextIcon", "true");
        }
        if (RSSList.firstChild.hasAttribute("synchronizeIcon") == false)
        {
          RSSList.firstChild.setAttribute("synchronizeIcon", "false");
        }
        if (RSSList.firstChild.hasAttribute("refreshIcon") == false)
        {
          RSSList.firstChild.setAttribute("refreshIcon", "false");
        }
        if (RSSList.firstChild.hasAttribute("hideOldIcon") == false)
        {
          RSSList.firstChild.setAttribute("hideOldIcon", "false");
        }
        if (RSSList.firstChild.hasAttribute("hideViewedIcon") == false)
        {
          RSSList.firstChild.setAttribute("hideViewedIcon", "false");
        }
        if (RSSList.firstChild.hasAttribute("homeIcon") == false)
        {
          RSSList.firstChild.setAttribute("homeIcon", "true");
        }
        if (RSSList.firstChild.hasAttribute("filterIcon") == false)
        {
          RSSList.firstChild.setAttribute("filterIcon", "true");
        }
        if (RSSList.firstChild.hasAttribute("popupMessage") == false)
        {
          RSSList.firstChild.setAttribute("popupMessage", "true");
        }
        if (RSSList.firstChild.hasAttribute("playSound") == false)
        {
          RSSList.firstChild.setAttribute("playSound", "true");
        }
        if (RSSList.firstChild.hasAttribute("flashingIcon") == false)
        {
          RSSList.firstChild.setAttribute("flashingIcon", "true");
        }
        if (RSSList.firstChild.hasAttribute("defaultPlayPodcast") == false)
        {
          RSSList.firstChild.setAttribute("defaultPlayPodcast", "true");
        }
        if (RSSList.firstChild.hasAttribute("displayEnclosure") == false)
        {
          RSSList.firstChild.setAttribute("displayEnclosure", "true");
        }
        if (RSSList.firstChild.hasAttribute("displayBanned") == false)
        {
          RSSList.firstChild.setAttribute("displayBanned", "true");
        }
        if (RSSList.firstChild.hasAttribute("savePodcastLocation") == false)
        {
          RSSList.firstChild.setAttribute("savePodcastLocation", "");
        }
        if (RSSList.firstChild.hasAttribute("defaultBrowserHistory") == false)
        {
          RSSList.firstChild.setAttribute("defaultBrowserHistory", "true");
        }
        if (RSSList.firstChild.hasAttribute("collapseBar") == false)
        {
          RSSList.firstChild.setAttribute("collapseBar", "false");
        }
        if (RSSList.firstChild.hasAttribute("scrollingIncrement") == false)
        {
          RSSList.firstChild.setAttribute("scrollingIncrement", "2");
        }
        if (RSSList.firstChild.hasAttribute("quickFilter") == false)
        {
          RSSList.firstChild.setAttribute("quickFilter", "");
        }
        if (RSSList.firstChild.hasAttribute("quickFilterActif") == false)
        {
          RSSList.firstChild.setAttribute("quickFilterActif", "false");
        }
        if (RSSList.firstChild.hasAttribute("timeslice") == false)
        {
          RSSList.firstChild.setAttribute("timeslice", "90");
        }
        if (RSSList.firstChild.hasAttribute("mouseEvent") == false)
        {
          RSSList.firstChild.setAttribute("mouseEvent", "0");
        }
        if (RSSList.firstChild.hasAttribute("mouseWheelScroll") == false)
        {
          RSSList.firstChild.setAttribute("mouseWheelScroll", "pixel");
        }
        for (let i = 0; i < items.length; i++)
        {
          if (items[i].hasAttribute("group") == false)
          {
            items[i].setAttribute("group", "false");
          }
          if (items[i].hasAttribute("filter") == false)
          {
            items[i].setAttribute("filter", "all");
          }
          if (items[i].hasAttribute("nbItem") == false)
          {
            items[i].setAttribute("nbItem", RSSList.firstChild.getAttribute("defaultNbItem"));
          }
          if (items[i].hasAttribute("lengthItem") == false)
          {
            items[i].setAttribute("lengthItem", RSSList.firstChild.getAttribute("defaultLenghtItem"));
          }
          if (items[i].hasAttribute("refresh") == false)
          {
            items[i].setAttribute("refresh", RSSList.firstChild.getAttribute("refresh"));
          }
          if (items[i].hasAttribute("type") == false)
          {
            items[i].setAttribute("type", "rss");
          }
          if (items[i].hasAttribute("filterPolicy") == false)
          {
            items[i].setAttribute("filterPolicy", "0");
          }
          if ((items[i].getAttribute("type") == "html") && (items[i].hasAttribute("htmlDirection") == false))
          {
            items[i].setAttribute("htmlDirection", "asc");
          }
          if (items[i].hasAttribute("playPodcast") == false)
          {
            items[i].setAttribute("playPodcast", "true");
          }
          if (items[i].hasAttribute("savePodcastLocation") == false)
          {
            items[i].setAttribute("savePodcastLocation", ((RSSList.firstChild.hasAttribute("savePodcastLocation") == false) ? "" : RSSList.firstChild.getAttribute("savePodcastLocation")));
          }
          if (items[i].hasAttribute("browserHistory") == false)
          {
            items[i].setAttribute("browserHistory", "true");
            if ((items[i].getAttribute("url").indexOf("https://gmail.google.com/gmail/feed/atom") == 0) ||
              (items[i].getAttribute("url").indexOf(".ebay.") != -1))
            {
              items[i].setAttribute("browserHistory", "false");
            }
          }
          if (items[i].hasAttribute("filterCaseSensitive") == false)
          {
            items[i].setAttribute("filterCaseSensitive", "true");
          }
          if (items[i].hasAttribute("password"))
          {
            if (items[i].getAttribute("password") != "")
            {
              inforssXMLRepository.storePassword(items[i].getAttribute("url"),
                items[i].getAttribute("user"),
                items[i].getAttribute("password"));
            }
            items[i].removeAttribute("password");
          }
          if (items[i].hasAttribute("activity") == false)
          {
            items[i].setAttribute("activity", "true");
          }
          if (items[i].hasAttribute("encoding") == false)
          {
            items[i].setAttribute("encoding", "");
          }
          if ((items[i].getAttribute("type") == "group") && (items[i].hasAttribute("playlist") == false))
          {
            items[i].setAttribute("playlist", "false");
          }
          if (items[i].hasAttribute("purgeHistory") == false)
          {
            items[i].setAttribute("purgeHistory", RSSList.firstChild.getAttribute("defaultPurgeHistory"));
          }
        }
      }
    }
    var find = false;
    for (let i = 0; i < items.length; i++)
    {
      if ((items[i].getAttribute("icon") == null) || (items[i].getAttribute("icon") == ""))
      {
        let url = inforssFindIcon(items[i]);
        if (url != null)
        {
          items[i].setAttribute("icon", url);
          find = true;
        }
      }
      items[i].setAttribute("groupAssociated", "false");
    }

    for (let i = 0; i < items.length; i++)
    {
      if (items[i].getAttribute("type") == "group")
      {
        var groups = items[i].getElementsByTagName("GROUP");
        if (groups != null)
        {
          for (var j = 0; j < groups.length; j++)
          {
            var k = 0;
            var find1 = false;
            while ((k < items.length) && (find1 == false))
            {
              if ((items[k].getAttribute("type") != "group") && (items[k].getAttribute("url") == groups[j].getAttribute("url")))
              {
                items[k].setAttribute("groupAssociated", "true");
                find1 = true;
              }
              else
              {
                k++;
              }
            }
          }
        }
      }
    }
    if (find)
    {
      inforssXMLRepository.save();
    }
  }
  catch (e)
  {
    inforssDebug(e);
  }
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

//------------------------------------------------------------------------------
/* exported inforssDefaultRepository */
//FIXME put the wrapper in inforssIO to catch the errors?
const INFORSS_DEFAULT_REPOSITORY = "inforss.default";
const INFORSS_INERROR = "inforss_xml.inerror";

function inforssDefaultRepository()
{
  //Back up the current file if it exists so recovery may be attempted
  {
    let file = profile_dir.clone();
    file.append(INFORSS_REPOSITORY);
    if (file.exists())
    {
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
  let source = inforssGetResourceFile(INFORSS_DEFAULT_REPOSITORY);
  if (source.exists())
  {
    source.copyTo(profile_dir, INFORSS_REPOSITORY);
  }
}

/* exported inforssXMLRepository */
var inforssXMLRepository = new XML_Repository();
