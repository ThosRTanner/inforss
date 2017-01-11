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
//-------------------------------------------------------------------------------------------------------------
// inforssXMLRepository
// Author : Didier Ernotte 2005
// Inforss extension
//-------------------------------------------------------------------------------------------------------------
/* exported inforssXMLRepository */
function inforssXMLRepository()
{
  return this;
}

//-------------------------------------------------------------------------------------------------------------
inforssXMLRepository.getTimeSlice = function()
{
  return RSSList.firstChild.getAttribute("timeslice");
}

//-------------------------------------------------------------------------------------------------------------
inforssXMLRepository.getSeparateLine = function()
{
  return RSSList.firstChild.getAttribute("separateLine");
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.getLinePosition = function()
{
  return RSSList.firstChild.getAttribute("linePosition");
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.getMouseEvent = function()
{
  return eval(RSSList.firstChild.getAttribute("mouseEvent"));
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.getMouseWheelScroll = function()
{
  return RSSList.firstChild.getAttribute("mouseWheelScroll");
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.getDefaultPlayPodcast = function()
{
  return RSSList.firstChild.getAttribute("defaultPlayPodcast");
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.getSavePodcastLocation = function()
{
  return RSSList.firstChild.getAttribute("savePodcastLocation");
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.getDefaultBrowserHistory = function()
{
  return RSSList.firstChild.getAttribute("defaultBrowserHistory");
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.getDefaultNbItem = function()
{
  return RSSList.firstChild.getAttribute("defaultNbItem");
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.getDefaultLengthItem = function()
{
  return RSSList.firstChild.getAttribute("defaultLenghtItem");
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.getDefaultRefresh = function()
{
  return RSSList.firstChild.getAttribute("refresh");
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.getScrollingIncrement = function()
{
  return eval(RSSList.firstChild.getAttribute("scrollingIncrement"));
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.getScrollingArea = function()
{
  return RSSList.firstChild.getAttribute("scrollingArea");
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.setScrollingArea = function(width)
{
  RSSList.firstChild.setAttribute("scrollingArea", width);
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.isHideViewed = function()
{
  return (RSSList.firstChild.getAttribute("hideViewed") == "true");
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.setHideViewed = function(value)
{
  RSSList.firstChild.setAttribute("hideViewed", value);
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.isHideOld = function()
{
  return (RSSList.firstChild.getAttribute("hideOld") == "true");
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.setHideOld = function(value)
{
  RSSList.firstChild.setAttribute("hideOld", value);
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.isHideHistory = function()
{
  return (RSSList.firstChild.getAttribute("hideHistory") == "true");
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.isIncludeAssociated = function()
{
  return (RSSList.firstChild.getAttribute("includeAssociated") == "true");
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.getGroupLengthItem = function()
{
  return RSSList.firstChild.getAttribute("groupLenghtItem");
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.getGroupNbItem = function()
{
  return RSSList.firstChild.getAttribute("groupNbItem");
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.getGroupRefresh = function()
{
  return RSSList.firstChild.getAttribute("groupRefresh");
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.getSubMenu = function()
{
  return RSSList.firstChild.getAttribute("submenu");
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.getDefaultPurgeHistory = function()
{
  return RSSList.firstChild.getAttribute("defaultPurgeHistory");
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.getFontSize = function()
{
  return RSSList.firstChild.getAttribute("fontSize");
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.getNextFeed = function()
{
  return RSSList.firstChild.getAttribute("nextFeed");
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.getScrollingSpeed = function()
{
  return (30 - eval(RSSList.firstChild.getAttribute("scrollingspeed"))) * 10;
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.getFilterHeadlines = function(rss)
{
  return rss.getAttribute("filterHeadlines");
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.isFavicon = function()
{
  return (RSSList.firstChild.getAttribute("favicon") == "true");
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.getRed = function()
{
  return RSSList.firstChild.getAttribute("red");
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.getGreen = function()
{
  return RSSList.firstChild.getAttribute("green");
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.getBlue = function()
{
  return RSSList.firstChild.getAttribute("blue");
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.getDelay = function()
{
  return RSSList.firstChild.getAttribute("delay");
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.getCyclingDelay = function()
{
  return RSSList.firstChild.getAttribute("cyclingDelay");
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.isCycling = function()
{
  return (RSSList.firstChild.getAttribute("cycling") == "true");
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.isCycleWithinGroup = function()
{
  return (RSSList.firstChild.getAttribute("cycleWithinGroup") == "true");
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.getTooltip = function()
{
  return RSSList.firstChild.getAttribute("tooltip");
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.getClickHeadline = function()
{
  return RSSList.firstChild.getAttribute("clickHeadline");
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.getFont = function()
{
  return (RSSList.firstChild.getAttribute("font") == "auto")? "inherit" : RSSList.firstChild.getAttribute("font");
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.isActive = function()
{
  return (RSSList.firstChild.getAttribute("switch") == "true");
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.getBold = function()
{
  return (RSSList.firstChild.getAttribute("bold") == "true")? "bolder" : "normal";
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.getItalic = function()
{
  return (RSSList.firstChild.getAttribute("italic") == "true")? "italic" : "normal";
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.isScrolling = function()
{
//dump("scrolling=" + RSSList.firstChild.getAttribute("scrolling") + "\n");
  return ((RSSList.firstChild.getAttribute("scrolling") == "1") ||
          (RSSList.firstChild.getAttribute("scrolling") == "2"));
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.isFadeIn = function()
{
  return (RSSList.firstChild.getAttribute("scrolling") == "2");
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.isStopScrolling = function()
{
  return (RSSList.firstChild.getAttribute("stopscrolling") == "true");
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.isCurrentFeed = function()
{
  return (RSSList.firstChild.getAttribute("currentfeed") == "true");
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.isLivemark = function()
{
  return (RSSList.firstChild.getAttribute("livemark") == "true");
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.isClipboard = function()
{
  return (RSSList.firstChild.getAttribute("clipboard") == "true");
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.getSortedMenu = function()
{
  return (RSSList.firstChild.getAttribute("sortedMenu"));
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.getCollapseBar = function()
{
  return (RSSList.firstChild.getAttribute("collapseBar") == "true");
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.getForegroundColor = function()
{
  return RSSList.firstChild.getAttribute("foregroundColor");
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.getDefaultForegroundColor = function()
{
  return RSSList.firstChild.getAttribute("defaultForegroundColor");
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.getSubMenuType = function()
{
  return (inforssXMLRepository.getSubMenu() == "true")? "menu" : "menuitem";
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.getDefaultGroupIcon = function()
{
  return RSSList.firstChild.getAttribute("defaultGroupIcon");
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.getScrollingDirection = function()
{
  return RSSList.firstChild.getAttribute("scrollingdirection");
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.isReadAllIcon = function()
{
  return (RSSList.firstChild.getAttribute("readAllIcon") == "true");
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.isViewAllIcon = function()
{
  return (RSSList.firstChild.getAttribute("viewAllIcon") == "true");
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.isShuffleIcon = function()
{
  return (RSSList.firstChild.getAttribute("shuffleIcon") == "true");
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.isDirectionIcon = function()
{
  return (RSSList.firstChild.getAttribute("directionIcon") == "true");
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.isScrollingIcon = function()
{
  return (RSSList.firstChild.getAttribute("scrollingIcon") == "true");
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.isPreviousIcon = function()
{
  return (RSSList.firstChild.getAttribute("previousIcon") == "true");
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.isPauseIcon = function()
{
  return (RSSList.firstChild.getAttribute("pauseIcon") == "true");
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.isNextIcon = function()
{
  return (RSSList.firstChild.getAttribute("nextIcon") == "true");
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.isRefreshIcon = function()
{
  return (RSSList.firstChild.getAttribute("refreshIcon") == "true");
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.isHideOldIcon = function()
{
  return (RSSList.firstChild.getAttribute("hideOldIcon") == "true");
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.isHideViewedIcon = function()
{
  return (RSSList.firstChild.getAttribute("hideViewedIcon") == "true");
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.isSynchronizationIcon = function()
{
  return (RSSList.firstChild.getAttribute("synchronizationIcon") == "true");
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.isSynchronizeIcon = function()
{
  return (RSSList.firstChild.getAttribute("synchronizeIcon") == "true");
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.isFlashingIcon = function()
{
  return (RSSList.firstChild.getAttribute("flashingIcon") == "true");
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.isHomeIcon = function()
{
  return (RSSList.firstChild.getAttribute("homeIcon") == "true");
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.isFilterIcon = function()
{
  return (RSSList.firstChild.getAttribute("filterIcon") == "true");
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.getQuickFilter = function()
{
  return (RSSList.firstChild.getAttribute("quickFilter"));
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.isQuickFilterActif = function()
{
  return (RSSList.firstChild.getAttribute("quickFilterActif") == "true");
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.isPopupMessage = function()
{
  return (RSSList.firstChild.getAttribute("popupMessage") == "true");
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.isPlaySound = function()
{
  return (RSSList.firstChild.getAttribute("playSound") == "true");
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.isDisplayEnclosure = function()
{
  return (RSSList.firstChild.getAttribute("displayEnclosure") == "true");
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.isDisplayBanned = function()
{
  return (RSSList.firstChild.getAttribute("displayBanned") == "true");
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.isPlayList = function()
{
  return (RSSList.firstChild.getAttribute("playlist") == "true");
}

//-----------------------------------------------------------------------------------------------------
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
}

//-----------------------------------------------------------------------------------------------------
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
}

//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.getServerInfo = function()
{
  var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("inforss.");
  var serverInfo = null;
  if (prefs.prefHasUserValue("repository.user") == false)
  {
    serverInfo = { protocol : "ftp://", server : "", directory : "", user : "", password : "", autosync : false};
    inforssXMLRepository.setServerInfo( serverInfo.protocol, serverInfo.server, serverInfo.directory, serverInfo.user, serverInfo.password, serverInfo.autosync);
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
    serverInfo = { protocol : protocol,
                   server : server,
                   directory : prefs.getCharPref("repository.directory"),
                   user : user,
                   password : (password == null)? "" : password,
                   autosync : autosync
                 };
  }
  return serverInfo;
}

//-----------------------------------------------------------------------------------------------------
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
}


//-----------------------------------------------------------------------------------------------------
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
        catch(e)
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
      catch(e)
      {}
      passwordManager.addUser(url, user, password);
    }
}


//-----------------------------------------------------------------------------------------------------
inforssXMLRepository.readPassword = function(url, user)
{
  var password = { value : ""};
  var host = { value : ""};
  var login = { value : ""};
//dump("avant\n");
//dump("apres\n");
  if ("@mozilla.org/login-manager;1" in Components.classes)
  {
    try 
    {
      var loginManager = Components.classes["@mozilla.org/login-manager;1"].getService(Components.interfaces.nsILoginManager);
	  
   // Find users for the given parameters
      var logins = loginManager.findLogins({}, url, 'User Registration', null);
      
   // Find user from returned array of nsILoginInfo objects
      for (var i = 0; i < logins.length; i++) 
      {
        if (logins[i].username == user) 
        {
          password.value = logins[i].password;
          break;
        }
      }
    }
    catch(ex) { }
  }
  else
  {
    try
    {
      var passManager = Components.classes["@mozilla.org/passwordmanager;1"].getService(Components.interfaces.nsIPasswordManagerInternal);
      passManager.findPasswordEntry(url, user, "", host, login, password);
    }
    catch(ee) { }
  }
//dump("password for " + url + ":" + user + " = " + password.value + "\n")
  return password.value;
}



