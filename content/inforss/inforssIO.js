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
// inforssIO
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------
/* globals inforssDebug, inforssTraceIn, inforssTraceOut */
Components.utils.import("chrome://inforss/content/inforssDebug.jsm");

/* globals inforssXMLRepository, inforssSave, inforssNotifier */
/* globals inforssAddItemToMenu, inforssRelocateBar, inforssRDFRepository */
/* globals setImportProgressionBar */

var INFORSS_VERSION = "3";
/* exported RSSList */
var RSSList = null;
/* exported INFORSS_REPOSITORY */
const INFORSS_REPOSITORY = "inforss.xml";
const INFORSS_INERROR = "inforss_xml.inerror";
const INFORSS_DEFAULT_REPOSITORY = "inforss.default";
/* exported INFORSS_GUID */
const INFORSS_GUID = "f65bf62a-5ffc-4317-9612-38907a779583";
/* exported INFORSS_DEFAULT_ICO */
const INFORSS_DEFAULT_ICO = "chrome://inforss/skin/default.ico";
const INFORSS_NULL_URL = "http://inforss.mozdev.org";
var gInforssFTPDownload = null;

//-------------------------------------------------------------------------------------------------------------
/* exported inforssRead */
function inforssRead(withMenu, relocateFlag)
{
  try
  {
    RSSList = inforssGetRepositoryAsDom();
    if (RSSList != null)
    {
      var items = RSSList.getElementsByTagName("RSS");
      inforssAdjustRepository();
      if (withMenu)
      {
        for (var i = 0; i < items.length; i++)
        {
          inforssAddItemToMenu(items[i], false); // saveFlag)
        }
        if (relocateFlag)
        {
          inforssRelocateBar();
        }
      }
    }
  }
  catch (e)
  {
    alert(document.getElementById("bundle_inforss").getString("inforss.repo.error") + "\n" + e);
  }
}

//-------------------------------------------------------------------------------------------------------------
function inforssGetRepositoryAsDom(source)
{
  var repository = null;
  try
  {
    var str = inforssGetRepositoryAsString(source);
    if (str != null)
    {
      repository = new DOMParser().parseFromString(str, "text/xml");
    }
  }
  catch (e)
  {
    alert(document.getElementById("bundle_inforss").getString("inforss.repo.error") + "\n" + e);
  }
  return repository;
}

//-------------------------------------------------------------------------------------------------------------
function inforssGetRepositoryAsString(source)
{
  var outputStr = null;
  try
  {
    var file = inforssGetFile(INFORSS_VERSION, source);

    if ((file != null) && (file.exists()))
    {
      var is = Components.classes["@mozilla.org/network/file-input-stream;1"].createInstance(Components.interfaces.nsIFileInputStream);
      is.init(file, 0x01, 0x04, null);
      var sis = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance(Components.interfaces.nsIScriptableInputStream);
      sis.init(is);
      var output = sis.read(-1);
      is.close();
      sis.close();
      if (output.length > 0)
      {
        var uConv = Components.classes['@mozilla.org/intl/utf8converterservice;1'].createInstance(Components.interfaces.nsIUTF8ConverterService);
        outputStr = uConv.convertStringToUTF8(output, "UTF-8", false);
      }
    }
  }
  catch (e)
  {
    alert(document.getElementById("bundle_inforss").getString("inforss.repo.error") + "\n" + e);
  }
  return outputStr;
}

//-------------------------------------------------------------------------------------------------------------
function inforssRestoreRepository()
{
  try
  {
    var file = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).get("ProfD", Components.interfaces.nsIFile);
    file.append(INFORSS_REPOSITORY);
    if (file.exists())
    {
      file = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).get("ProfD", Components.interfaces.nsIFile);
      var dest = file.clone();
      dest.append(INFORSS_INERROR);
      if (dest.exists())
      {
        dest.remove(false);
      }
      dest = file.clone();
      file.append(INFORSS_REPOSITORY);
      file.copyTo(dest, INFORSS_INERROR);
      file.remove(false);
    }

    file = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).get("ProfD", Components.interfaces.nsIFile);
    var source = file.clone();
    source.append("extensions");
    source.append("{" + INFORSS_GUID + "}");
    source.append(INFORSS_DEFAULT_REPOSITORY);
    if (source.exists())
    {
      source.copyTo(file, INFORSS_REPOSITORY);
    }
  }
  catch (e)
  {
    alert(document.getElementById("bundle_inforss").getString("inforss.repo.error") + "\n" + e);
  }
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
      inforssSave();
    }
  }
  catch (e)
  {
    inforssDebug(e);
  }
}

//-------------------------------------------------------------------------------------------------------------
function inforssGetFile(version, source)
{
  var file = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).get("ProfD", Components.interfaces.nsIFile);
  file.append(INFORSS_REPOSITORY);

  if (file.exists() == false)
  {
    inforssRestoreRepository();
    file = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).get("ProfD", Components.interfaces.nsIFile);
    file.append(INFORSS_REPOSITORY);
  }
  if (file.exists())
  {
    var is = Components.classes["@mozilla.org/network/file-input-stream;1"].createInstance(Components.interfaces.nsIFileInputStream);
    is.init(file, 0x01, 0x04, null);
    var sis = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance(Components.interfaces.nsIScriptableInputStream);
    sis.init(is);
    var output = sis.read(-1);
    sis.close();
    is.close();
    if (output.length > 0)
    {
      var repository = new DOMParser().parseFromString(output, "text/xml");
      if (repository.firstChild.getAttribute("version") < version)
      {
        alert(document.getElementById("bundle_inforss").getString("inforss.wrongVersionXmlFile"));
        inforssRestoreRepository();
        file = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).get("ProfD", Components.interfaces.nsIFile);
        file.append(INFORSS_REPOSITORY);
      }
      delete repository;
    }
    else
    {
      inforssRestoreRepository();
      file = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).get("ProfD", Components.interfaces.nsIFile);
      file.append(INFORSS_REPOSITORY);
    }
  }
  return file;
}

//-------------------------------------------------------------------------------------------------------------
function inforssFindIcon(rss)
{
  try
  {
    //Get the web page
    var url = rss.getAttribute("link");
    var xmlHttpRequest = new XMLHttpRequest();
    xmlHttpRequest.open("GET", url, false, rss.getAttribute("user"), inforssXMLRepository.readPassword(url, rss.getAttribute("user")));
    xmlHttpRequest.send();
    //Now read the HTML into a doc object
    var doc = document.implementation.createHTMLDocument("");
    doc.documentElement.innerHTML = xmlHttpRequest.responseText;
    //Now find the favicon. Per what spec I can find, it is the last specified
    //<link rel="xxx"> and if there isn't any of those, use favicon.ico in the
    //root of the site.
    var favicon = "/favicon.ico";
    for (var node of doc.head.getElementsByTagName("link"))
    {
      //There is at least one website that uses 'SHORTCUT ICON'
      var rel = node.getAttribute("rel").toLowerCase();
      if (rel == "icon" || rel == "shortcut icon")
      {
        favicon = node.getAttribute("href");
      }
    }
    //Now make the full URL. If it starts with '/', it's relative to the site.
    //If it starts with (.*:)// it's a url. I assume you fill in the missing
    //protocol with however you got the page.
    url = xmlHttpRequest.responseURL;
    if (favicon.startsWith("//"))
    {
      favicon = url.split(":")[0] + ':' + favicon;
    }
    if (! favicon.includes("://"))
    {
      if (favicon.startsWith("/"))
      {
        var arr = url.split("/");
        favicon = arr[0] + "//" + arr[2] + favicon;
      }
      else
      {
        favicon = url + (url.endsWith("/") ? "" : "/") + favicon;
      }
    }
    //Now we see if it actually exists and isn't null, because null ones are
    //just evil.
    xmlHttpRequest = new XMLHttpRequest();
    xmlHttpRequest.open("GET", favicon, false, rss.getAttribute("user"), inforssXMLRepository.readPassword(url, rss.getAttribute("user")));
    xmlHttpRequest.send();
    if (xmlHttpRequest.status != 404 && xmlHttpRequest.responseText.length != 0)
    {
      return favicon;
    }
  }
  catch (e)
  {
    inforssDebug(e);
  }
  return INFORSS_DEFAULT_ICO;
}

//------------------------------------------------------------------------------
/* exported inforssSave */
function inforssSave()
{
    inforssXMLRepository.save();
}

//-------------------------------------------------------------------------------------------------------------
/* exported inforssCopyRemoteToLocal */
function inforssCopyRemoteToLocal(protocol, server, directory, user, password, ftpDownloadCallback)
{
  if (directory.match(/^\/.*/) == null)
  {
    directory = "/" + directory;
  }
  if (directory.match(/^.*\/$/) == null)
  {
    directory = directory + "/";
  }
  var ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
  var path = protocol + user + ":" + password + "@" + server + directory;
  var uri = ioService.newURI(path + "inforss.xml", "UTF-8", null);
  gInforssFTPDownload = new inforssFTPDownload();

  if (typeof setImportProgressionBar != "undefined")
  {
    setImportProgressionBar(20);
  }
  gInforssFTPDownload.start(uri, path, inforssCopyRemoteToLocalCallback, ftpDownloadCallback);
}

//-----------------------------------------------------------------------------------------------------
function inforssCopyRemoteToLocalCallback(step, status, path, callbackOriginal)
{
  inforssTraceIn();
  try
  {
    if (step == "send")
    {
      callbackOriginal(step, status);
      if (typeof setImportProgressionBar != "undefined")
      {
        setImportProgressionBar(40);
      }
    }
    else
    {
      if (typeof setImportProgressionBar != "undefined")
      {
        setImportProgressionBar(50);
      }
      if (status != 0)
      {
        alert(document.getElementById("bundle_inforss").getString("inforss.remote.error") + " : " + status);
        callbackOriginal(step, status);
      }
      else
      {
        var str = gInforssFTPDownload.data;

        if (str.length > 0)
        {
          var uConv = Components.classes['@mozilla.org/intl/utf8converterservice;1'].createInstance(Components.interfaces.nsIUTF8ConverterService);
          str = uConv.convertStringToUTF8(str, "UTF-8", false);
        }
        RSSList = new DOMParser().parseFromString(str, "text/xml");
        inforssSave();
        var ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
        var uri = ioService.newURI(path + "inforss.rdf", "UTF-8", null);
        if (typeof setImportProgressionBar != "undefined")
        {
          setImportProgressionBar(50);
        }
        gInforssFTPDownload.start(uri, path, inforssCopyRemoteToLocal1Callback, callbackOriginal);
      }
    }
  }
  catch (e)
  {
    inforssDebug(e);
    callbackOriginal(-1, null);
  }
  inforssTraceOut();
}

//-----------------------------------------------------------------------------------------------------
function inforssCopyRemoteToLocal1Callback(step, status, path, callbackOriginal)
{
  inforssTraceIn();
  try
  {
    if (typeof setImportProgressionBar != "undefined")
    {
      setImportProgressionBar(60);
    }
    if (step != "send")
    {
      if (status != 0)
      {
        alert(document.getElementById("bundle_inforss").getString("inforss.remote.error") + " : " + status);
      }
      else
      {
        if (typeof setImportProgressionBar != "undefined")
        {
          setImportProgressionBar(70);
        }
        var str = gInforssFTPDownload.data;

        if (str.length > 0)
        {
          var uConv = Components.classes['@mozilla.org/intl/utf8converterservice;1'].createInstance(Components.interfaces.nsIUTF8ConverterService);
          str = uConv.convertStringToUTF8(str, "UTF-8", false);
        }
        inforssRDFRepository.saveRDFFromString(str);
        var notifier = new inforssNotifier();
        notifier.notify("chrome://global/skin/icons/alert-exclam.png",
          document.getElementById("bundle_inforss").getString("inforss.synchronization"),
          document.getElementById("bundle_inforss").getString("inforss.remote.success"),
          INFORSS_NULL_URL);
      }
      callbackOriginal(step, status);
      gInforssFTPDownload = null;
    }
  }
  catch (e)
  {
    inforssDebug(e);
  }
  inforssTraceOut();
}

//-------------------------------------------------------------------------------------------------------------
/* exported inforssCopyLocalToRemote */
function inforssCopyLocalToRemote(protocol, server, directory, user, password, ftpUploadCallback, asyncFlag)
{
  inforssTraceIn();
  try
  {
    var str = new XMLSerializer().serializeToString(RSSList);
    var contentType = "application/octet-stream";
    contentType = "text/xml; charset=UTF-8";

    if (directory.match(/^\/.*/) == null)
    {
      directory = "/" + directory;
    }
    if (directory.match(/^.*\/$/) == null)
    {
      directory = directory + "/";
    }
    var ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
    var path = protocol + user + ":" + password + "@" + server + directory;
    var uri = ioService.newURI(path + "inforss.xml", "UTF-8", null);
    if (typeof setImportProgressionBar != "undefined")
    {
      setImportProgressionBar(40);
    }
    inforssFTPUpload.start(str, uri, contentType, path, inforssCopyLocalToRemoteCallback, ftpUploadCallback, asyncFlag);
  }
  catch (e)
  {
    inforssDebug(e);
  }
  inforssTraceOut();
}

//-----------------------------------------------------------------------------------------------------
function inforssCopyLocalToRemoteCallback(step, status, path, callbackOriginal, asyncFlag)
{
  inforssTraceIn();
  try
  {
    if (step == "send")
    {
      if (typeof setImportProgressionBar != "undefined")
      {
        setImportProgressionBar(60);
      }
      if (callbackOriginal != null)
      {
        callbackOriginal(step, status);
      }
    }
    else
    {
      if (status != 0)
      {
        alert(document.getElementById("bundle_inforss").getString("inforss.remote.error") + " : " + status);
        if (callbackOriginal != null)
        {
          callbackOriginal(step, status);
        }
      }
      else
      {
        var str = inforssRDFRepository.getRDFAsString();
        var contentType = "application/octet-stream";
        contentType = "text/xml; charset=UTF-8";

        var ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
        var uri = ioService.newURI(path + "inforss.rdf", "UTF-8", null);
        inforssFTPUpload.start(str, uri, contentType, path, inforssCopyLocalToRemote1Callback, callbackOriginal, asyncFlag);
      }
    }
  }
  catch (e)
  {
    inforssDebug(e);
    if (callbackOriginal != null)
    {
      callbackOriginal(-1, null);
    }
  }
  inforssTraceOut();
}

//-----------------------------------------------------------------------------------------------------
function inforssCopyLocalToRemote1Callback(step, status, path, callbackOriginal, asyncFlag)
{
  inforssTraceIn();
  try
  {
    if (step != "send")
    {
      if (typeof setImportProgressionBar != "undefined")
      {
        setImportProgressionBar(80);
      }
      if (asyncFlag)
      {
        if (status != 0)
        {
          alert(document.getElementById("bundle_inforss").getString("inforss.remote.error") + " : " + status);
        }
        else
        {
          var notifier = new inforssNotifier();
          notifier.notify("chrome://global/skin/icons/alert-exclam.png",
            document.getElementById("bundle_inforss").getString("inforss.synchronization"),
            document.getElementById("bundle_inforss").getString("inforss.remote.success"),
            "http://inforss.mozdev.org");
        }
      }
      if (callbackOriginal != null)
      {
        callbackOriginal(step, status);
      }
    }
  }
  catch (e)
  {
    inforssDebug(e);
  }
  inforssTraceOut();
}

//-------------------------------------------------------------------------------------------------------------
var inforssFTPUpload = {
  _channel: null,
  _callback: null,
  _callbackOriginal: null,
  _data: "",
  _scheme: "",
  _errorData: "",
  _path: null,
  _inputStream: null,
  _asyncFlag: null,

  start: function(text, url, contentType, path, callback, callbackOriginal, asyncFlag)
  {
    var returnValue = false;
    try
    {
      this._asyncFlag = asyncFlag;
      this._callback = callback;
      this._callbackOriginal = callbackOriginal;
      this._path = path;
      this._scheme = url.scheme;
      var ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
      //      this._channel = ioService.newChannelFromURI(url).QueryInterface(Components.interfaces.nsIUploadChannel);
      var channel = ioService.newChannelFromURI(url).QueryInterface(Components.interfaces.nsIUploadChannel);
      this._inputStream = Components.classes["@mozilla.org/io/string-input-stream;1"].createInstance(Components.interfaces.nsIStringInputStream);

      var unicodeConverter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
      unicodeConverter.charset = "UTF-8";
      text = unicodeConverter.ConvertFromUnicode(text) + unicodeConverter.Finish();

      this._inputStream.setData(text, -1);
      channel.setUploadStream(this._inputStream, contentType, -1);
      if (asyncFlag)
      {
        channel.asyncOpen(this, null);
        this._callback("send", null, null, callbackOriginal, asyncFlag);
      }
      else
      {
        channel.open();
        this._inputStream.close();
        this._callback("done", 0, path, callbackOriginal, asyncFlag);
      }
      this._data = text;
      returnValue = true;
    }
    catch (e)
    {
      inforssDebug(e);
    }
    return returnValue;
  },

  cancel: function() {},

  onDataAvailable: function(channel, ctxt, input, sourceOffset, count)
  {
    const sis = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance(Components.interfaces.nsIScriptableInputStream);
    sis.init(input);
    this._errorData += sis.read(count);
    this._inputStream.close();
  },

  onStartRequest: function(channel, ctxt) {},

  onStopRequest: function(channel, ctxt, status)
  {
    try
    {
      if (this._scheme != "ftp")
      {
        var res = 0;
        try
        {
          res = channel.QueryInterface(Components.interfaces.nsIHttpChannel).responseStatus;
        }
        catch (e)
        {}
        if ((res == 200) || (res == 201) || (res == 204))
        {
          status = 0;
        }
        /*
          200:OK
          201:Created
          204:No Content
          This is an uploading channel, no need to "GET" the file contents.
        */
        if (this._errorData)
        {
          status = res;
        }

        if ((this._errorData) && (res == 200))
        {
          inforssDebug(this._errorData);
        }
      }
      delete channel;
      this._inputStream.close();
      this._data = null;
      if (this._callback != null)
      {
        this._callback("done", status, this._path, this._callbackOriginal, this._asyncFlag);
      }
    }
    catch (e)
    {
      inforssDebug(e);
    }
  }
};

//-------------------------------------------------------------------------------------------------------------
function inforssFTPDownload()
{
  return this;
}

inforssFTPDownload.prototype = {
  _channel: null,
  streamLoader: null,
  data: null,
  length: null,

  _path: null,
  _callback: null,
  _startTime: 0,
  _endTime: 0,
  _callbackOriginal: null,

  start: function(url, path, callback, callbackOriginal)
  {
    this._callback = callback;
    this._callbackOriginal = callbackOriginal;
    this._path = path;
    var returnValue = true;
    try
    {
      var appInfo = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo);
      var isOnBranch = appInfo.platformVersion.indexOf("1.8") == 0;
      var ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
      this.streamLoader = Components.classes["@mozilla.org/network/stream-loader;1"].createInstance(Components.interfaces.nsIStreamLoader);
      this._channel = ioService.newChannelFromURI(url);
      if (isOnBranch)
      {
        this.streamLoader.init(this._channel, this, null);
      }
      else
      {
        this.streamLoader.init(this);
        this._channel.asyncOpen(this.streamLoader, this._channel);
      }
      this._startTime = new Date().getTime();
      this._callback("send", null, path, callbackOriginal);
      if (typeof setImportProgressionBar != "undefined")
      {
        setImportProgressionBar(30);
      }
    }
    catch (e)
    {
      inforssDebug(e);
      returnValue = false;
    }
    return returnValue;
  },

  cancel: function()
  {
    if (this._channel)
    {
      this._channel.cancel(0x804b0002);
    }
  },

  onStreamComplete: function(loader, ctxt, status, resultLength, result)
  {
    this.data = "";
    this._endTime = new Date().getTime();
    if (status == 0)
    {
      this.length = resultLength;
      if (typeof(result) == "string")
      {
        this.data = result;
      }
      else
      {
        while (result.length > (256 * 192))
        {
          this.data += String.fromCharCode.apply(this, result.splice(0, 256 * 192));
        }
        this.data += String.fromCharCode.apply(this, result);
      }
    }

    if (this._callback != null)
    {
      this._callback("done", status, this._path, this._callbackOriginal);
    }
  },

};
