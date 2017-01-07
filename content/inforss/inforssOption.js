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
// inforssOption
// Author : Didier Ernotte 2005
// Inforss extension
//-------------------------------------------------------------------------------------------------------------
var itemMenu = null;
var currentRSS = null;
var currentItem = null;
var currentGroup = null;
var gRssTimeout = null;
var gRssXmlHttpRequest = null;
var gNbRss = 0;
var gNbGroup = 0;
var gNbHtml = 0;
var gOldRssIndex = 0;
var gInit = false;
var gPreviousStatus = null;
var gNextStatus = null;
var gRemovedUrl = null;
var gInforssOption = "inforss";
var gInforssMediator = null;
var gInforssNbFeed = null;
var theCurrentFeed = null;
var makeCurrentInvoked = false;
var applyScale = false;
var refreshCount = 0;
var canvasPosX = 0;
var canvasPosY = 0;
const INFORSS_DEFAULT_GROUP_ICON = "chrome://inforss/skin/group.png";

//-----------------------------------------------------------------------------------------------------
 function init(withRead)
 {
   inforssTraceIn();
   try
   {
     var windowManager = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService();
     var windowManagerInterface = windowManager.QueryInterface( Components.interfaces.nsIWindowMediator);
     var enumerator = windowManagerInterface.getEnumerator(null);
     var win = null;
     var find = false;
     while ((enumerator.hasMoreElements()) && (find == false))
     {
       win = enumerator.getNext();
       if (win.gInforssMediator != null)
       {
		 find = true;
		 gInforssMediator = win.gInforssMediator;
	   }
     }

     if ((withRead == null) || (withRead == true))
     {
       inforssRead(false, false);
     }
     var nbitem = RSSList.firstChild.getAttribute("defaultNbItem");
     document.getElementById("defaultnbitem").selectedIndex = (nbitem == "9999")? 0 : 1;
     if (nbitem != "9999")
     {
       document.getElementById("defaultnbitem1").value = nbitem;
     }
     var lengthitem = RSSList.firstChild.getAttribute("defaultLenghtItem");
     document.getElementById("defaultlengthitem").selectedIndex = (lengthitem == "9999")? 0 : 1;
     if (lengthitem != "9999")
     {
       document.getElementById('defaultlengthitem1').value = lengthitem;
     }
     var refresh = RSSList.firstChild.getAttribute("refresh");
     document.getElementById("defaultrefresh1").value = refresh;

     if (refresh == 60*24)
     {
       document.getElementById("inforss.defaultrefresh").selectedIndex = 0;
       document.getElementById("defaultrefresh1").value = 1;
     }
     else
     {
       document.getElementById("defaultrefresh1").value = refresh;
       document.getElementById("inforss.defaultrefresh").selectedIndex = (refresh == 60)? 1 : 2;
     }


     var defaultBrowserHistory = RSSList.firstChild.getAttribute("defaultBrowserHistory");
     document.getElementById("defaultBrowserHistory").selectedIndex = (defaultBrowserHistory == "true")? 0 : 1;
     var red = RSSList.firstChild.getAttribute("red");
     var green = RSSList.firstChild.getAttribute("green");
     var blue = RSSList.firstChild.getAttribute("blue");
     var delay = RSSList.firstChild.getAttribute("delay");
     document.getElementById("backgroundColor").selectedIndex = (red == "-1")? 0 : 1;
     document.getElementById("red1").value = (red == "-1")? 0 : red;
     document.getElementById("green1").value = (green == "-1")? 0 : green;
     document.getElementById("blue1").value = (blue == "-1")? 0 : blue;
     document.getElementById("delay1").value = delay;
     var activity = RSSList.firstChild.getAttribute("switch");
     document.getElementById("activity").selectedIndex = (activity == "true")? 0 : 1;
     var submenu = RSSList.firstChild.getAttribute("submenu");
     document.getElementById("submenu").selectedIndex = (submenu == "true")? 0 : 1;
     var scrolling = RSSList.firstChild.getAttribute("scrolling");
     document.getElementById("scrolling").selectedIndex = scrolling;
     var separateLine = RSSList.firstChild.getAttribute("separateLine");
     var linePosition = RSSList.firstChild.getAttribute("linePosition");
     document.getElementById("linePosition").selectedIndex = (separateLine == "false")? 0 : ((linePosition == "top")? 1 : 2);
     var debug = RSSList.firstChild.getAttribute("debug");
     document.getElementById("debug").selectedIndex = (debug == "true")? 0 : 1;
     var statusbar = RSSList.firstChild.getAttribute("statusbar");
     document.getElementById("statusbar").selectedIndex = (statusbar == "true")? 0 : 1;
     var log = RSSList.firstChild.getAttribute("log");
     document.getElementById("log").selectedIndex = (log == "true")? 0 : 1;
     var net = RSSList.firstChild.getAttribute("net");
     document.getElementById("net").selectedIndex = (net == "true")? 0 : 1;
     var bold = RSSList.firstChild.getAttribute("bold");
     document.getElementById("inforss.bold").setAttribute("checked", bold);
     var italic = RSSList.firstChild.getAttribute("italic");
     document.getElementById("inforss.italic").setAttribute("checked", italic);
     var currentfeed = RSSList.firstChild.getAttribute("currentfeed");
     document.getElementById("currentfeed").selectedIndex = (currentfeed == "true")? 0 : 1;
     var livemark = RSSList.firstChild.getAttribute("livemark");
     document.getElementById("livemark").selectedIndex = (livemark == "true")? 0 : 1;
     var clipboard = RSSList.firstChild.getAttribute("clipboard");
     document.getElementById("clipboard").selectedIndex = (clipboard == "true")? 0 : 1;
     var scrollingspeed = RSSList.firstChild.getAttribute("scrollingspeed");
     document.getElementById("scrollingspeed1").value = scrollingspeed;
     var scrollingIncrement = RSSList.firstChild.getAttribute("scrollingIncrement");
     document.getElementById("scrollingIncrement1").value = scrollingIncrement;
     var favicon = RSSList.firstChild.getAttribute("favicon");
     document.getElementById("favicon").selectedIndex = (favicon == "true")? 0 : 1;
     var foregroundColor = RSSList.firstChild.getAttribute("foregroundColor");
     document.getElementById("foregroundColor").selectedIndex = (foregroundColor == "auto")? 0 : 1;
     document.getElementById("manualColor").color = (foregroundColor == "auto")? "white" : foregroundColor;
     var defaultForegroundColor = RSSList.firstChild.getAttribute("defaultForegroundColor");
     document.getElementById("defaultForegroundColor").selectedIndex = (defaultForegroundColor == "default")? 0 : (defaultForegroundColor == "sameas")? 1 : 2;
     document.getElementById("defaultManualColor").color = (defaultForegroundColor == "default")? "white" : (defaultForegroundColor == "sameas")? foregroundColor : defaultForegroundColor;
     var hideViewed = RSSList.firstChild.getAttribute("hideViewed");
     document.getElementById("hideViewed").selectedIndex = (hideViewed == "true")? 0 : 1;
     var clickHeadline = RSSList.firstChild.getAttribute("clickHeadline");
     document.getElementById("clickHeadline").selectedIndex = eval(clickHeadline);
     var tooltip = RSSList.firstChild.getAttribute("tooltip");
     document.getElementById("tooltip").selectedIndex = (tooltip == "description")? 0 : (tooltip == "title")? 1 : (tooltip == "allInfo")? 2 : 3;
     var hideOld = RSSList.firstChild.getAttribute("hideOld");
     document.getElementById("hideOld").selectedIndex = (hideOld == "true")? 0 : 1;
     var sortedMenu = RSSList.firstChild.getAttribute("sortedMenu");
     document.getElementById("sortedMenu").selectedIndex = (sortedMenu == "no")? 0 : ((sortedMenu == "asc")? 1 : 2);
     var hideHistory = RSSList.firstChild.getAttribute("hideHistory");
     document.getElementById("hideHistory").selectedIndex = (hideHistory == "true")? 0 : 1;
     var includeAssociated = RSSList.firstChild.getAttribute("includeAssociated");
     document.getElementById("includeAssociated").selectedIndex = (includeAssociated == "true")? 0 : 1;
     var cycling = RSSList.firstChild.getAttribute("cycling");
     document.getElementById("cycling").selectedIndex = (cycling == "true")? 0 : 1;
     var cyclingDelay = RSSList.firstChild.getAttribute("cyclingDelay");
     document.getElementById("cyclingDelay1").value = cyclingDelay;
     var nextFeed = RSSList.firstChild.getAttribute("nextFeed");
     document.getElementById("nextFeed").selectedIndex = (nextFeed == "next")? 0 : 1;
     var timeslice = RSSList.firstChild.getAttribute("timeslice");
     document.getElementById("timeslice").value = timeslice;
     var fontSize = RSSList.firstChild.getAttribute("fontSize");
     document.getElementById("fontSize").selectedIndex = (fontSize == "auto")? 0 : 1;
     if (fontSize != "auto")
     {
       document.getElementById("fontSize1").value = fontSize;
     }
     var stopscrolling = RSSList.firstChild.getAttribute("stopscrolling");
     document.getElementById("stopscrolling").selectedIndex = (stopscrolling == "true")? 0 : 1;
     var defaultGroupIcon = RSSList.firstChild.getAttribute("defaultGroupIcon");
     document.getElementById("defaultGroupIcon").value = defaultGroupIcon;
     document.getElementById("inforss.defaultgroup.icon").src = defaultGroupIcon;
     var cycleWithinGroup = RSSList.firstChild.getAttribute("cycleWithinGroup");
     document.getElementById("cycleWithinGroup").selectedIndex = (cycleWithinGroup == "true")? 0 : 1;
     var scrollingdirection = RSSList.firstChild.getAttribute("scrollingdirection");
     document.getElementById("scrollingdirection").selectedIndex = (scrollingdirection == "rtl")? 0 : 1;
     var synchronizeIcon = RSSList.firstChild.getAttribute("synchronizeIcon");
     document.getElementById("synchronizeIcon").selectedIndex = (synchronizeIcon == "true")? 0 : 1;
     var flashingIcon = RSSList.firstChild.getAttribute("flashingIcon");
     document.getElementById("flashingIcon").selectedIndex = (flashingIcon == "true")? 0 : 1;
     var mouseEvent = RSSList.firstChild.getAttribute("mouseEvent");
     document.getElementById("mouseEvent").selectedIndex = (mouseEvent == "0")? 0 : 1;
     var popupMessage = RSSList.firstChild.getAttribute("popupMessage");
     document.getElementById("popupMessage").selectedIndex = (popupMessage == "true")? 0 : 1;
     var playSound = RSSList.firstChild.getAttribute("playSound");
     document.getElementById("playSound").selectedIndex = (playSound == "true")? 0 : 1;
     var defaultPlayPodcast = RSSList.firstChild.getAttribute("defaultPlayPodcast");
     document.getElementById("defaultPlayPodcast").selectedIndex = (defaultPlayPodcast == "true")? 0 : 1;
     var defaultPurgeHistory = RSSList.firstChild.getAttribute("defaultPurgeHistory");
     document.getElementById("defaultPurgeHistory").value = defaultPurgeHistory;
     var displayEnclosure = RSSList.firstChild.getAttribute("displayEnclosure");
     document.getElementById("displayEnclosure").selectedIndex = (displayEnclosure == "true")? 0 : 1;
     var displayBanned = RSSList.firstChild.getAttribute("displayBanned");
     document.getElementById("displayBanned").selectedIndex = (displayBanned == "true")? 0 : 1;
     var savePodcastLocation = RSSList.firstChild.getAttribute("savePodcastLocation");
     if ((savePodcastLocation == null) || (savePodcastLocation == ""))
     {
       document.getElementById("savePodcastLocation").selectedIndex = 1;
       document.getElementById("savePodcastLocation1").value = "";
     }
     else
     {
       document.getElementById("savePodcastLocation").selectedIndex = 0;
       document.getElementById("savePodcastLocation1").value = savePodcastLocation;
     }
     var collapseBar = RSSList.firstChild.getAttribute("collapseBar");
     document.getElementById("collapseBar").selectedIndex = (collapseBar == "true")? 0 : 1;
     var mouseWheelScroll = RSSList.firstChild.getAttribute("mouseWheelScroll");
     document.getElementById("mouseWheelScroll").selectedIndex = (mouseWheelScroll == "pixel")? 0 : (mouseWheelScroll == "pixels")? 1 : 2;

     var serverInfo = inforssXMLRepository.getServerInfo();
     document.getElementById('inforss.repo.urltype').value = serverInfo.protocol;
     document.getElementById('ftpServer').value = serverInfo.server;
     document.getElementById('repoDirectory').value = serverInfo.directory;
     document.getElementById('repoLogin').value = serverInfo.user;
     document.getElementById('repoPassword').value = serverInfo.password;
     document.getElementById('repoAutoSync').selectedIndex = (serverInfo.autosync == true)? 0 : 1;

     document.getElementById("readAllIcon").setAttribute("checked", RSSList.firstChild.getAttribute("readAllIcon"));
     document.getElementById("viewAllIcon").setAttribute("checked", RSSList.firstChild.getAttribute("viewAllIcon"));
     document.getElementById("shuffleIcon").setAttribute("checked", RSSList.firstChild.getAttribute("shuffleIcon"));
     document.getElementById("directionIcon").setAttribute("checked", RSSList.firstChild.getAttribute("directionIcon"));
     document.getElementById("scrollingIcon").setAttribute("checked", RSSList.firstChild.getAttribute("scrollingIcon"));
     document.getElementById("previousIcon").setAttribute("checked", RSSList.firstChild.getAttribute("previousIcon"));
     document.getElementById("pauseIcon").setAttribute("checked", RSSList.firstChild.getAttribute("pauseIcon"));
     document.getElementById("nextIcon").setAttribute("checked", RSSList.firstChild.getAttribute("nextIcon"));
     document.getElementById("refreshIcon").setAttribute("checked", RSSList.firstChild.getAttribute("refreshIcon"));
     document.getElementById("hideOldIcon").setAttribute("checked", RSSList.firstChild.getAttribute("hideOldIcon"));
     document.getElementById("hideViewedIcon").setAttribute("checked", RSSList.firstChild.getAttribute("hideViewedIcon"));
     document.getElementById("synchronizationIcon").setAttribute("checked", RSSList.firstChild.getAttribute("synchronizationIcon"));
     document.getElementById("homeIcon").setAttribute("checked", RSSList.firstChild.getAttribute("homeIcon"));
     document.getElementById("filterIcon").setAttribute("checked", RSSList.firstChild.getAttribute("filterIcon"));

//inforssInspectDump(navigator, null, false);
     if ((navigator.vendor == "Thunderbird") || (navigator.vendor == "Linspire Inc."))
     {
       document.getElementById("inforss.repo.synchronize.exporttoremote").setAttribute("collapsed", "true");
       document.getElementById("inforss.repo.synchronize.importfromremote").setAttribute("collapsed", "true");
       document.getElementById("repoAutoSync").setAttribute("disabled","true");
       document.getElementById("repoAutoSyncOn").setAttribute("disabled","true");
       document.getElementById("repoAutoSyncOff").setAttribute("disabled","true");
       document.getElementById("inforss.tab.synchro").setAttribute("disabled","true");
     }
     changeColor();

     var items = RSSList.getElementsByTagName("RSS");
     document.getElementById("rss-select-menu").removeAllItems();
     var selectFolder = document.createElement("menupopup");
     selectFolder.setAttribute("id","rss-select-folder");
     document.getElementById("rss-select-menu").appendChild(selectFolder);
     var element = null;
     var selectedUrl = null;
     var pos = -1;
     var selectedIndex = -1;
     var menu = document.getElementById("rss-select-menu");
     var menupopup = menu.firstChild;
     var tree = document.getElementById("inforss.tree.report");

     while (tree.firstChild != null)
     {
   	   tree.removeChild(tree.firstChild);
     }
     var list2 = document.getElementById("group-list-rss");
     var listcols = list2.firstChild;
     while (list2.firstChild != null)
     {
   	   list2.removeChild(list2.firstChild);
     }
     list2.appendChild(listcols);

     for (var i=0; i < items.length; i++)
     {
/*         element = document.createElement("menuitem");

         element.setAttribute("label", items[i].getAttribute("title"));

         element.setAttribute("value", items[i].getAttribute("title"));


         element.setAttribute("tooltiptext",items[i].getAttribute("description"));
         element.setAttribute("image",items[i].getAttribute("icon"));
         element.setAttribute("validate", "never");
         element.setAttribute("id","rss-" + i);

         element.setAttribute("class", "menuitem-iconic");
*/
       var find = false;
       var j = 0;
       var menuItem = null;
       var count = (menupopup == null)? 0 : menupopup.childNodes.length;
       var title = items[i].getAttribute("title").toLowerCase();
       while ((j < count) && (find == false))
       {
         menuItem = menupopup.childNodes[j];
         if (title <= menuItem.getAttribute("label").toLowerCase())
         {
           find = true;
         }
         else
         {
           j++;
         }
       }
       if (find == false)
       {
         element = menu.appendItem(items[i].getAttribute("title"), "rss_" + i);
//         menupopup.appendChild(element);
       }
       else
       {
         element = menu.insertItemAt(j, items[i].getAttribute("title"), "rss_" + i);
//         menupopup.insertBefore(element, menuItem);
         if (pos != -1)
         {
           if (j <= pos)
           {
             pos++;
           }
         }
       }

       element.setAttribute("class","menuitem-iconic");
       element.setAttribute("image",items[i].getAttribute("icon"));
       if (items[i].getAttribute("type") != "group")
       {
         addRssToVbox(items[i]);
       }
       gNbRss++;
       element.setAttribute("url", items[i].getAttribute("url"));
       element.setAttribute("user", items[i].getAttribute("user"));
//       element.setAttribute("password", items[i].getAttribute("password"));
       if ((pos == -1) && (items[i].getAttribute("selected") == "true"))
       {
         selectedIndex = i;
         if (find == false)
         {
           pos = i;
         }
         else
         {
           pos = j;
         }
       }
     }

     updateReport();
     theCurrentFeed = gInforssMediator.getSelectedInfo(true);
     document.getElementById("inforss.current.feed").setAttribute("value", theCurrentFeed.getTitle());
     document.getElementById("inforss.current.feed").setAttribute("tooltiptext", theCurrentFeed.getTitle());

//alert(pos);
     if ((pos == -1) && (items.length > 0))
     {
       selectedIndex = 0;
       var count = (menupopup == null)? 0 : menupopup.childNodes.length;
       var title = items[0].getAttribute("title").toLowerCase();
       var j = 0;
       var find = false;
       var menuItem = null;
       while ((j < count) && (find == false))
       {
         menuItem = menupopup.childNodes[j];
         if (title == menuItem.getAttribute("label").toLowerCase())
         {
           find = true;
         }
         else
         {
           j++;
         }
       }
       pos = j;
       items[0].setAttribute("selected", "true");
     }
     if (pos != -1)
     {
       menu.selectedIndex = pos;
       selectRSS1(items[selectedIndex].getAttribute("url"), items[selectedIndex].getAttribute("user"));
     }

     if (gNbRss > 0)
     {
       document.getElementById("inforss.next.rss").setAttribute("disabled",false);
     }
     
     
     if (document.getElementById("inforss.apply") == null)
     {
       var file = file=Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).get("ProfD", Components.interfaces.nsIFile);
       file.append(INFORSS_REPOSITORY);
       var linetext = document.createTextNode(file.path);
       document.getElementById("inforss.location3").appendChild(linetext);
       file = file=Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).get("ProfD", Components.interfaces.nsIFile);
       file.append(INFORSS_RDF_REPOSITORY);
       linetext = document.createTextNode(file.path);
       document.getElementById("inforss.location4").appendChild(linetext);

       var cancel = document.getElementById('inforssOption').getButton("cancel");
//       var but = cancel.cloneNode(true);
       var apply = document.getElementById('inforssOption').getButton("extra1");
       apply.parentNode.removeChild(apply);
       apply.label=document.getElementById("bundle_inforss").getString("inforss.apply");
       apply.setAttribute("label",apply.label);
       apply.setAttribute("accesskey","");
       apply.setAttribute("id","inforss.apply");
       apply.addEventListener("click", function () { return _apply() }, false);
       cancel.parentNode.insertBefore(apply, cancel);

       var fontService = Components.classes["@mozilla.org/gfx/fontenumerator;1"].getService(Components.interfaces.nsIFontEnumerator);

       var count = { value: null };
       var arr = { value: null };
       var fonts = fontService.EnumerateAllFonts(count);
       var font = null;
       var str = null;
       for (var i = 0; i<fonts.length; i++)
       {
         var element = document.getElementById("fresh-font").appendItem(fonts[i], fonts[i]);
         element.style.fontFamily = fonts[i];
         if (RSSList.firstChild.getAttribute("font") == fonts[i])
         {
           document.getElementById("fresh-font").selectedIndex = (i + 1);
         }
       }
       if (RSSList.firstChild.getAttribute("font") == "auto")
       {
         document.getElementById("fresh-font").selectedIndex = 0;
       }
       changeColor();
       
       document.getElementById("rss.filter.number").removeAllItems();
       selectFolder = document.createElement("menupopup");
       selectFolder.setAttribute("id","rss.filter.number.1");
       document.getElementById("rss.filter.number").appendChild(selectFolder);
       for (var i=0; i<100; i++)
       {
         document.getElementById("rss.filter.number").appendItem(i, i);
         if (i < 51)
         {
           document.getElementById("rss.filter.hlnumber").appendItem(i, i);
         }
       }
//       document.getElementById("inforss.rss.fetch").style.visibility = "hidden";
     }
//     else
//     {
//       element = document.getElementById("select-folder").firstChild;
//       document.getElementById("select-menu").selectedItem = element;
//       selectRSS1(element.getAttribute("url"));
//     }
   }
   catch (e)
   {
     inforssDebug(e);
   }
  inforssTraceOut();
}

//-----------------------------------------------------------------------------------------------------
function updateReport()
{
  try
  {
     var items = RSSList.getElementsByTagName("RSS");
     var tree = document.getElementById("inforss.tree.report");
     while (tree.firstChild != null)
     {
   	   tree.removeChild(tree.firstChild);
     }
     
     gInforssNbFeed = 0;

     for (var i=0; i < items.length; i++)
     {
       var originalFeed = gInforssMediator.locateFeed(items[i].getAttribute("url"));
       if ((originalFeed != null) && (originalFeed.info != null))
       {
         originalFeed = originalFeed.info;
         if (items[i].getAttribute("type") != "group")
         {
		   gInforssNbFeed++;
           var treeitem = document.createElement("treeitem");
           treeitem.setAttribute("title", items[i].getAttribute("title"));
           var treerow = document.createElement("treerow");
           treerow.setAttribute("url", items[i].getAttribute("url"));
           treeitem.appendChild(treerow);
           addCell(items[i].getAttribute("icon"), treerow, "icon", "image");
           addCell("", treerow, (items[i].getAttribute("activity") == "true")? "on" : "off");
      	   addCell(items[i].getAttribute("title"), treerow, null);
    	   addCell("", treerow, (originalFeed.active == true)? "active" : "unactive");
    	   addCell(((originalFeed.lastRefresh == null)? "" : inforssGetStringDate(originalFeed.lastRefresh)), treerow, null);
    	   addCell(((originalFeed.lastRefresh == null) || (originalFeed.active == false) || (items[i].getAttribute("activity") == "false"))? "" : inforssGetStringDate(new Date(eval(originalFeed.lastRefresh.getTime() + originalFeed.feedXML.getAttribute("refresh") * 60000))), treerow, null);
    	   addCell((originalFeed.lastRefresh == null)? "" : originalFeed.getNbHeadlines(), treerow, null);
    	   addCell((originalFeed.lastRefresh == null)? "" : originalFeed.getNbUnread(), treerow, null);
    	   addCell((originalFeed.lastRefresh == null)? "" : originalFeed.getNbNew(), treerow, null);
    	   addCell(((originalFeed.feedXML.getAttribute("groupAssociated") == "true")? "Y" : "N"), treerow, null);
           var find = false;
           var child = tree.firstChild;
           while ((child != null) && (find == false))
           {
			 if (treeitem.getAttribute("title").toLowerCase() > child.getAttribute("title").toLowerCase())
			 {
			   child = child.nextSibling;
		     }
		     else
		     {
			   find = true;
			 }
		   }
		   if (find == false)
		   {
             tree.appendChild(treeitem);
	       }
           else
           {
			 tree.insertBefore(treeitem, child);
		   }
         }
	   }
	 }
	 var first = true;
	 var treeseparator = null;
     for (var i=0; i < items.length; i++)
     {
       var originalFeed = gInforssMediator.locateFeed(items[i].getAttribute("url"));
       if ((originalFeed != null) && (originalFeed.info))
       {
         originalFeed = originalFeed.info;
         if (items[i].getAttribute("type") == "group")
         {
		   if (first == true)
		   {
		     first = false;
             treeseparator = document.createElement("treeseparator");
             tree.appendChild(treeseparator);
		   }
           var treeitem = document.createElement("treeitem");
           treeitem.setAttribute("title", items[i].getAttribute("title"));
           var treerow = document.createElement("treerow");
           treeitem.appendChild(treerow);
		   treeitem.setAttribute("container","true");
		   treeitem.setAttribute("open","false");
		   treerow.setAttribute("properties","group");
           treerow.setAttribute("url", items[i].getAttribute("url"));
      	   addCell(items[i].getAttribute("icon"), treerow, "icon", "image");
      	   addCell("", treerow, (items[i].getAttribute("activity") == "true")? "on" : "off");
      	   addCell(items[i].getAttribute("title"), treerow, null);
    	   addCell("", treerow, (originalFeed.active == true)? "active" : "unactive");
      	   addCell("", treerow, null);
      	   addCell("", treerow, null);
    	   addCell(originalFeed.getNbHeadlines(), treerow, null);
    	   addCell(originalFeed.getNbUnread(), treerow, null);
      	   addCell("", treerow, null);

           var find = false;
           var child = treeseparator.nextSibling;
           while ((child != null) && (find == false))
           {
			 if (treeitem.getAttribute("title").toLowerCase() > child.getAttribute("title").toLowerCase())
			 {
			   child = child.nextSibling;
		     }
		     else
		     {
			   find = true;
			 }
		   }
		   if (find == false)
		   {
             tree.appendChild(treeitem);
	       }
           else
           {
			 tree.insertBefore(treeitem, child);
		   }

      	   var treechildren = document.createElement("treechildren");
      	   treeitem.appendChild(treechildren);
      	   var selectedList = items[i].getElementsByTagName("GROUP");
//alert("length=" + selectedList.length + "\n");
		   for (var j = 0; j < selectedList.length; j++)
		   {
//alert(selectedList[j].getAttribute("url"));
    	     originalFeed = gInforssMediator.locateFeed(selectedList[j].getAttribute("url"));
    	     if (originalFeed != null)
    	     {
//inforssInspect(originalFeed);
    	       originalFeed = originalFeed.info;
      	       treeitem = document.createElement("treeitem");
               treeitem.setAttribute("title", originalFeed.feedXML.getAttribute("title"));
		       treerow = document.createElement("treerow");
		       treeitem.appendChild(treerow);
		       treerow.setAttribute("properties","rss");
               treerow.setAttribute("url", selectedList[j].getAttribute("url"));
//dump("url=" + selectedList[j].getAttribute("url") + "\n");
               var rss1 = inforssGetItemFromUrl(selectedList[j].getAttribute("url"));
      	       addCell(originalFeed.feedXML.getAttribute("icon"), treerow, "icon", "image");
      	       addCell("", treerow, (rss1.getAttribute("activity") == "true")? "on" : "off");
      	       addCell(originalFeed.feedXML.getAttribute("title"), treerow, null);
    	       addCell("", treerow, (originalFeed.active == true)? "active" : "unactive");
    	       addCell(((originalFeed.lastRefresh == null)? "" : inforssGetStringDate(originalFeed.lastRefresh)), treerow, null);
    	       addCell(((originalFeed.lastRefresh == null) || (originalFeed.active == false) || (rss1.getAttribute("activity") == "false"))? "" : inforssGetStringDate(new Date(eval(originalFeed.lastRefresh.getTime() + originalFeed.feedXML.getAttribute("refresh") * 60000))), treerow, null);
    	       addCell((originalFeed.lastRefresh == null)? "" : originalFeed.getNbHeadlines(), treerow, null);
    	       addCell((originalFeed.lastRefresh == null)? "" : originalFeed.getNbUnread(), treerow, null);
    	       addCell("", treerow, null);

               var find = false;
               var child = treechildren.firstChild;
               while ((child != null) && (find == false))
               {
			     if (treeitem.getAttribute("title").toLowerCase() > child.getAttribute("title").toLowerCase())
			     {
			       child = child.nextSibling;
		         }
		         else
		         {
			       find = true;
			     }
		       }
		       if (find == false)
		       {
		         treechildren.appendChild(treeitem);
	           }
               else
               {
			     treechildren.insertBefore(treeitem, child);
		       }
		     }
		   }
	     }
       }
     }
  }
  catch (e)
  {
    inforssDebug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function addRssToVbox(rss)
{
  var listbox = document.getElementById("group-list-rss");
  var title = rss.getAttribute("title").toLowerCase();
  var count = listbox.childNodes.length;

  var listitem = document.createElement("listitem");
//  listitem.setAttribute("value", rss.getAttribute("title"));
//  listitem.setAttribute("url", rss.getAttribute("url"));
//  listitem.setAttribute("flex","1");
  var listcell = document.createElement("listcell");
//  listitem.setAttribute("flex", "1");
  listcell.setAttribute("type", "checkbox");
//  listcell.setAttribute("flex", "0");

  listcell.addEventListener("click", function(event) { var lc = event.currentTarget; if (lc.getAttribute("checked") == "false") { lc.setAttribute("checked", "true") } else { lc.setAttribute("checked", "false"); }}, false);
//  listcell.style.maxWidth = "18px";
//  listcell.style.borderStyle = "solid";
//  listcell.style.borderWidth="1px";
  listitem.appendChild(listcell);
  
  listcell = document.createElement("listcell");
  listcell.setAttribute("class", "listcell-iconic");
  listcell.setAttribute("image", rss.getAttribute("icon"));
//  listcell.setAttribute("image", "chrome://inforss/skin/inforss.png");
  listcell.setAttribute("value", rss.getAttribute("title"));
  listcell.setAttribute("label", rss.getAttribute("title"));
  listcell.setAttribute("url", rss.getAttribute("url"));
//  listcell.style.borderStyle = "solid";
//  listcell.style.borderWidth="1px";
//  listcell.setAttribute("flex", "1");
  listitem.appendChild(listcell);
  window.setTimeout(resizeImage, (1000 + 10 * count), listcell, rss.getAttribute("icon"));
  
  listitem.setAttribute("allowevents", "true");
 
 
  var j = 1;
  var find = false;
  var label = null;

  while ((j < count) && (find == false))
  {
    label = listbox.childNodes[j].childNodes[1];
    if (title <= label.getAttribute("value").toLowerCase())
    {
      find = true;
    }
    else
    {
      j++;
    }
  }
  if (find == false)
  {
    listbox.appendChild(listitem);
  }
  else
  {
    listbox.insertBefore(listitem, listbox.childNodes[j]);
  }

/*
  var checkbox = document.createElement("checkbox");
  hbox.appendChild(checkbox);
  var image = document.createElement("image");
  image.setAttribute("src", rss.getAttribute("icon"));
  image.setAttribute("maxheight", "16");
  image.setAttribute("maxwidth", "16");
  image.style.maxWidth = "16px";
  image.style.maxHeight = "16px";
  hbox.appendChild(image);
  var label = document.createElement("label");
  label.setAttribute("value", rss.getAttribute("title"));
  label.setAttribute("url", rss.getAttribute("url"));
  hbox.appendChild(label);
*/
  
  list = document.getElementById("inforss.apply.list");
  var count = (list.firstChild == null)? 0 : list.childNodes.length;

  var listitem = document.createElement("listitem");
  listitem.setAttribute("label",rss.getAttribute("title"));
  listitem.setAttribute("url",rss.getAttribute("url"));
  listitem.setAttribute("class","listitem-iconic");
  listitem.setAttribute("image",rss.getAttribute("icon"));
  listitem.style.maxHeight = "18px";
  var j = 0;
  var find = false;
  var label = null;

  while ((j < count) && (find == false))
  {
    label = list.childNodes[j];
    if (title <= label.getAttribute("label").toLowerCase())
    {
      find = true;
    }
    else
    {
      j++;
    }
  }
  if (find == false)
  {
    list.appendChild(listitem);
  }
  else
  {
    list.insertBefore(listitem, list.childNodes[j]);
  }

  window.setTimeout(resizeImage, (1000 + 10 * count), listitem, rss.getAttribute("icon"));
/*  var subElement = document.getAnonymousNodes(listitem);
  var i = 0;
  while ((i < 20) && (subElement == null))
  {
	subElement = document.getAnonymousNodes(listitem);
	i++;
  }
  if (subElement != null)
  {
    var subElement1 = document.getAnonymousNodes(subElement[0]);
    if (subElement1 != null)
    {
      subElement1[0].style.maxWidth = "16px";
      subElement1[0].style.maxHeight = "16px";
    }
  }
  else alert(rss.getAttribute("title"));*/
}


//-----------------------------------------------------------------------------------------------------
function resizeImage(listitem, url)
{
  var subElement = document.getAnonymousNodes(listitem);
  var i = 0;
  while ((i < 20) && (subElement == null))
  {
	subElement = document.getAnonymousNodes(listitem);
	i++;
  }
  if (subElement != null)
  {
//alert(subElement[0].nodeName);
//alert(subElement[0].nodeName);
//inforssInspect(subElement[0]);
    var subElement1 = document.getAnonymousNodes(subElement[0]);
    if (subElement1 != null)
    {
//dump("nodeName=" + subElement1[0].nodeName + "\n");
//dump("url=" + url + "\n");
      subElement1[0].style.maxWidth = "16px";
      subElement1[0].style.width = "16px";
      subElement1[0].style.maxHeight = "16px";
      subElement1[0].style.height = "16px";
      subElement1[0].setAttribute("width", "16");
      subElement1[0].setAttribute("height", "16");
//      listitem.setAttribute("image", url);
    }
    else
    {
      if (subElement[0].nodeName == "xul:image")
      { 
        subElement[0].style.maxWidth = "16px";
        subElement[0].style.width = "16px";
        subElement[0].style.maxHeight = "16px";
        subElement[0].style.height = "16px";
        subElement[0].setAttribute("width", "16");
        subElement[0].setAttribute("height", "16");
      }
    }
  }
  else alert(rss.getAttribute("title"));
}

//-----------------------------------------------------------------------------------------------------
function checkRssList()
{
  var popup = document.getElementById("rss-select-folder");
  var menuItem = popup.firstChild;
  while (menuItem != null)
  {
    var subElement = document.getAnonymousNodes(menuItem);

    if ((subElement != null) && (subElement.length > 0) && (subElement[0] != null) && (subElement[0].firstChild != null) && (subElement[0].firstChild.localName =="image"))
    {
//		alert(subElement[0].firstChild.getAttribute("class"));
      subElement[0].firstChild.setAttribute("maxwidth","16");
      subElement[0].firstChild.setAttribute("maxheight","16");
      subElement[0].firstChild.setAttribute("minwidth","16");
      subElement[0].firstChild.setAttribute("minheight","16");

      subElement[0].firstChild.style.maxWidth = "16px";
      subElement[0].firstChild.style.maxHeight = "16px";
      subElement[0].firstChild.style.minWidth = "16px";
      subElement[0].firstChild.style.minHeight = "16px";

      subElement[0].firstChild.setAttribute("collapsed","false");
      subElement[0].firstChild.style.visibility = "visible";
    }
    menuItem = menuItem.nextSibling;
  }

  return true;
}

//-----------------------------------------------------------------------------------------------------
function manageSlider(id, offset)
{
  document.getElementById(id + "1").value = eval(document.getElementById(id).getAttribute('curpos')) + offset;
  changeColor();
}

//-----------------------------------------------------------------------------------------------------
function changeColor(arg)
{
  var rouge = document.getElementById('red1').value;
  var vert = document.getElementById('green1').value;
  var bleu = document.getElementById('blue1').value;
  var sample = document.getElementById("sample1");
  
  if (document.getElementById('backgroundColor').selectedIndex == 0)
  {
    sample.style.backgroundColor = "inherit";
  }
  else
  {
    sample.style.backgroundColor="rgb(" + rouge + "," + vert + "," + bleu + ")";
  }
  var foregroundColor = (document.getElementById('foregroundColor').selectedIndex == 0)? "auto" : document.getElementById('manualColor').color;
  if (foregroundColor == "auto")
  {
    if (document.getElementById('backgroundColor').selectedIndex == 0)
    {
      sample.style.color = "inherit";
    }
    else
    {
      sample.style.color = ((eval(rouge)  + eval(vert) + eval(bleu)) < (3 * 85))? "white" : "black";
    }
  }
  else
  {
    sample.style.color = foregroundColor;
  }
  if (document.getElementById("fontSize").selectedIndex == 0)
  {
    document.getElementById("sample").style.fontSize = "inherit";
  }
  else
  {
    document.getElementById("sample").style.fontSize = document.getElementById("fontSize1").value + "pt";
  }

  var font = document.getElementById("fresh-font").value;
  if ((font == null) || (font == "") || (font == "auto"))
  {
    font = "inherit";
  }
  document.getElementById("sample").style.fontFamily = font;
//alert(document.getElementById("fresh-font").value);
  sample.style.fontWeight = (document.getElementById("inforss.bold").getAttribute("checked") == "true")? "bolder" : "inherit";
  sample.style.fontStyle = (document.getElementById("inforss.italic").getAttribute("checked") == "true")? "italic" : "inherit";

  sample = document.getElementById("sample2");

  var defaultColor = inforssXMLRepository.getDefaultForegroundColor();
  if (document.getElementById("defaultForegroundColor").selectedIndex == 0)
  {
    sample.style.color = "black";
  }
  else
  {
    if (document.getElementById("defaultForegroundColor").selectedIndex == 1)
    {
      if (foregroundColor == "auto")
      {
        if (document.getElementById('backgroundColor').selectedIndex == 0)
        {
          sample.style.color = "inherit";
        }
        else
        {
          sample.style.color = ((eval(rouge)  + eval(vert) + eval(bleu)) < (3 * 85))? "white" : "black";
        }
      }
      else
      {
        sample.style.color = foregroundColor;
      }
    }
    else
    {
      sample.style.color = document.getElementById('defaultManualColor').color;
    }
  }
  if (document.getElementById("favicon").selectedIndex == 0)
  {
    document.getElementById("sample.favicon1").setAttribute("collapsed", "false");
    document.getElementById("sample.favicon2").setAttribute("collapsed", "false");
    document.getElementById("sample.favicon3").setAttribute("collapsed", "false");
    document.getElementById("sample.favicon4").setAttribute("collapsed", "false");
  }
  else
  {
    document.getElementById("sample.favicon1").setAttribute("collapsed", "true");
    document.getElementById("sample.favicon2").setAttribute("collapsed", "true");
    document.getElementById("sample.favicon3").setAttribute("collapsed", "true");
    document.getElementById("sample.favicon4").setAttribute("collapsed", "true");
  }

  if (document.getElementById("displayEnclosure").selectedIndex == 0)
  {
    document.getElementById("sample.enclosure1").setAttribute("collapsed", "false");
    document.getElementById("sample.enclosure2").setAttribute("collapsed", "false");
    document.getElementById("sample.enclosure3").setAttribute("collapsed", "false");
    document.getElementById("sample.enclosure4").setAttribute("collapsed", "false");
  }
  else
  {
    document.getElementById("sample.enclosure1").setAttribute("collapsed", "true");
    document.getElementById("sample.enclosure2").setAttribute("collapsed", "true");
    document.getElementById("sample.enclosure3").setAttribute("collapsed", "true");
    document.getElementById("sample.enclosure4").setAttribute("collapsed", "true");
  }

  if (document.getElementById("displayBanned").selectedIndex == 0)
  {
    document.getElementById("sample.banned1").setAttribute("collapsed", "false");
    document.getElementById("sample.banned2").setAttribute("collapsed", "false");
    document.getElementById("sample.banned3").setAttribute("collapsed", "false");
    document.getElementById("sample.banned4").setAttribute("collapsed", "false");
  }
  else
  {
    document.getElementById("sample.banned1").setAttribute("collapsed", "true");
    document.getElementById("sample.banned2").setAttribute("collapsed", "true");
    document.getElementById("sample.banned3").setAttribute("collapsed", "true");
    document.getElementById("sample.banned4").setAttribute("collapsed", "true");
  }
}

//-----------------------------------------------------------------------------------------------------
function accept()
{
  var returnValue = false;
  try
  {
    returnValue = _apply();
    if (returnValue == true)
    {
      returnValue = false;
      var acceptButton = document.getElementById('inforssOption').getButton("accept");
      acceptButton.setAttribute("disabled","true");
      window.setTimeout(closeOptionDialog,2300);
    }
  }
  catch (e)
  {
    inforssDebug(e);
  }
  return returnValue;
}

//-----------------------------------------------------------------------------------------------------
function _apply()
{
  var returnValue = false;
  try
  {
    returnValue = storeValue();
    if (returnValue == true)
    {
      inforssSave();
      var observerService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
//      if (makeCurrentInvoked == false)
//      {
        observerService.notifyObservers(null,"reload", gRemovedUrl);
//      }
//      else
//      {
//        observerService.notifyObservers(null,"rssChanged", "");
//      }
//      makeCurrentInvoked = false;
      returnValue = true;
    }
  }
  catch (e)
  {
    inforssDebug(e);
  }
  return returnValue;
}

//-----------------------------------------------------------------------------------------------------
function storeValue()
{
  var returnValue = false;
  try
  {
     if (validDialog() == true)
     {
       if (currentRSS != null)
       {
         var rss = currentRSS;
         switch (rss.getAttribute("type"))
         {
           case "rss":
           case "atom":
           case "html":
           case "nntp":
           {
             rss.setAttribute("nbItem", (document.getElementById('nbitem').selectedIndex == 0)? "9999" : document.getElementById('nbitem1').value);
             rss.setAttribute("lengthItem", (document.getElementById('lengthitem').selectedIndex == 0)? "9999" : document.getElementById('lengthitem1').value);
             rss.setAttribute("title", document.getElementById('optionTitle').value);
             if (rss.getAttribute("url") != document.getElementById('optionUrl').value)
             {
               updateGroup(rss.getAttribute("url"), document.getElementById('optionUrl').value);
               updateReport();
             }
             rss.setAttribute("url", document.getElementById('optionUrl').value);
             rss.setAttribute("link", document.getElementById('optionLink').value);
             rss.setAttribute("description", document.getElementById('optionDescription').value);
             var refresh1 = document.getElementById('inforss.refresh').selectedIndex;
             rss.setAttribute("refresh", (refresh1 == 0)? 60*24 : (refresh1 == 1)? 60 : document.getElementById('refresh1').value);
             rss.setAttribute("filter", ((document.getElementById("inforss.filter.anyall").selectedIndex == 0)? "all" : "any"));
             rss.setAttribute("icon", document.getElementById('iconurl').value);
             rss.setAttribute("playPodcast", (document.getElementById('playPodcast').selectedIndex == 0)? "true" : "false");
	         rss.setAttribute("savePodcastLocation", (document.getElementById('savePodcastLocation2').selectedIndex == 1)? "" : document.getElementById('savePodcastLocation3').value);
             rss.setAttribute("browserHistory", (document.getElementById('browserHistory').selectedIndex == 0)? "true" : "false");
             rss.setAttribute("filterCaseSensitive", (document.getElementById('filterCaseSensitive').selectedIndex == 0)? "true" : "false");
             rss.setAttribute("purgeHistory", document.getElementById('purgeHistory').value);
//             rss.setAttribute("activity", "true");
             break;
           }
           case "group":
           {
             rss.setAttribute("url", document.getElementById('groupName').value);
             rss.setAttribute("title", document.getElementById('groupName').value);
             rss.setAttribute("description", document.getElementById('groupName').value);
             rss.setAttribute("filterPolicy", document.getElementById("inforss.filter.policy").selectedIndex);
             rss.setAttribute("icon", document.getElementById('iconurlgroup').value);
             rss.setAttribute("filterCaseSensitive", (document.getElementById('filterCaseSensitive').selectedIndex == 0)? "true" : "false");
             rss.setAttribute("filter", ((document.getElementById("inforss.filter.anyall").selectedIndex == 0)? "all" : "any"));
             rss.setAttribute("playlist", (document.getElementById('playlistoption').selectedIndex == 0)? "true" : "false");
//             rss.setAttribute("activity", "true");
             var child = rss.firstChild;
             var next = null;
             while (child != null)
             {
               next = child.nextSibling;
               if (child.nodeName.indexOf("GROUP") != -1)
               {
                 rss.removeChild(child);
               }
               child = next;
             }
//alert("storeValue group\n");
             var listbox = document.getElementById("group-list-rss");
             var listitem = null;
             var checkbox = null;
             var label = null;
             for (var i = 1; i < listbox.childNodes.length; i++)
             {
               listitem = listbox.childNodes[i];
               checkbox = listitem.childNodes[0];
               label = listitem.childNodes[1];
//alert("storeValue label=" + label.getAttribute("value") + "\n");
               if (checkbox.getAttribute("checked") == "true")
               {
// dump("storeValue checked\n");
                 var child = rss.parentNode.parentNode.createElement("GROUP");
                 child.setAttribute("url",label.getAttribute("url"));
                 rss.appendChild(child);
               }
             }
             var playLists = rss.getElementsByTagName("playLists");
             if (playLists.length != 0)
             {
               rss.removeChild(playLists[0]);
             }
             if (document.getElementById('playlistoption').selectedIndex == 0) // playlist == true
             {
               playLists = document.createElement("playLists");
               rss.appendChild(playLists);
               listbox = document.getElementById("group-playlist");
               var richListItem = null;
               var playList = null;
               for (var i=0; i < listbox.childNodes.length; i++)
               {
                 richListItem = listbox.childNodes[i];
                 playList = document.createElement("playList");
                 playLists.appendChild(playList);
                 playList.setAttribute("url", richListItem.getAttribute("url"));
                 playList.setAttribute("delay", richListItem.firstChild.firstChild.value);
//alert(playList.getAttribute("url"));
//alert(playList.getAttribute("delay"));
               }
             }
             break;
           }
         }
         var child = rss.firstChild;
         var next = null;
         while (child != null)
         {
//alert("storeValue loop filter " + child.nodeName + "\n");
           next = child.nextSibling;
           if (child.nodeName.indexOf("FILTER") != -1)
           {
             rss.removeChild(child);
//alert("remove filter\n");
           }
           child = next;
         }
//alert(rss.getAttribute("url"));
         var vbox = document.getElementById("inforss.filter.vbox");
         var hbox = vbox.childNodes[3]; // first filter
         while (hbox != null)
         {
           var checkbox = hbox.childNodes[0];
           var type = hbox.childNodes[1];
           var deck = hbox.childNodes[2];
           var filter = rss.parentNode.parentNode.createElement("FILTER");
           filter.setAttribute("active", ((checkbox.getAttribute("checked") == "true")? "true" : "false"));
           filter.setAttribute("type", type.selectedIndex);
           filter.setAttribute("include", deck.childNodes[0].childNodes[0].selectedIndex);
           filter.setAttribute("text", deck.childNodes[0].childNodes[1].value);
           filter.setAttribute("compare", deck.childNodes[1].childNodes[0].selectedIndex);
           filter.setAttribute("elapse", deck.childNodes[1].childNodes[1].selectedIndex);
           filter.setAttribute("unit", deck.childNodes[1].childNodes[2].selectedIndex);
           filter.setAttribute("hlcompare", deck.childNodes[2].childNodes[0].selectedIndex);
           filter.setAttribute("nb", deck.childNodes[2].childNodes[1].selectedIndex);
//alert(rss.parentNode.parentNode);
           rss.appendChild(filter);
           hbox = hbox.nextSibling;
         }
       }

       RSSList.firstChild.setAttribute("defaultNbItem", (document.getElementById('defaultnbitem').selectedIndex == 0)? "9999" : document.getElementById('defaultnbitem1').value);
       RSSList.firstChild.setAttribute("defaultLenghtItem", (document.getElementById('defaultlengthitem').selectedIndex == 0)? "9999" : document.getElementById('defaultlengthitem1').value);
       var refresh1 = document.getElementById('inforss.defaultrefresh').selectedIndex;
       RSSList.firstChild.setAttribute("refresh", (refresh1 == 0)? 60*24 : (refresh1 == 1)? 60 : document.getElementById('defaultrefresh1').value);
       RSSList.firstChild.setAttribute("defaultBrowserHistory", (document.getElementById('defaultBrowserHistory').selectedIndex == 0)? "true" : "false");
       if (document.getElementById("backgroundColor").selectedIndex == 0)
       {
         RSSList.firstChild.setAttribute("red", "-1");
         RSSList.firstChild.setAttribute("green", "-1");
         RSSList.firstChild.setAttribute("blue", "-1");
       }
       else
       {
         RSSList.firstChild.setAttribute("red", document.getElementById("red1").value);
         RSSList.firstChild.setAttribute("green", document.getElementById("green1").value);
         RSSList.firstChild.setAttribute("blue", document.getElementById("blue1").value);
       }
       RSSList.firstChild.setAttribute("delay", document.getElementById("delay1").value);
       RSSList.firstChild.setAttribute("switch", (document.getElementById('activity').selectedIndex == 0)? "true" : "false");
       RSSList.firstChild.setAttribute("submenu", (document.getElementById('submenu').selectedIndex == 0)? "true" : "false");
       RSSList.firstChild.setAttribute("scrolling", document.getElementById('scrolling').selectedIndex);
       RSSList.firstChild.setAttribute("separateLine", (document.getElementById('linePosition').selectedIndex == 0)? "false" : "true");
       RSSList.firstChild.setAttribute("linePosition", (document.getElementById('linePosition').selectedIndex == 1)? "top" : "bottom");
       RSSList.firstChild.setAttribute("debug", (document.getElementById('debug').selectedIndex == 0)? "true" : "bottom");
       RSSList.firstChild.setAttribute("log", (document.getElementById('log').selectedIndex == 0)? "true" : "bottom");
       RSSList.firstChild.setAttribute("statusbar", (document.getElementById('statusbar').selectedIndex == 0)? "true" : "bottom");
       RSSList.firstChild.setAttribute("net", (document.getElementById('net').selectedIndex == 0)? "true" : "bottom");
       RSSList.firstChild.setAttribute("bold", (document.getElementById('inforss.bold').getAttribute("checked") == "true")? "true" : "false");
       RSSList.firstChild.setAttribute("italic", (document.getElementById('inforss.italic').getAttribute("checked") == "true")? "true" : "false");
       RSSList.firstChild.setAttribute("currentfeed", (document.getElementById('currentfeed').selectedIndex == 0)? "true" : "false");
       RSSList.firstChild.setAttribute("livemark", (document.getElementById('livemark').selectedIndex == 0)? "true" : "false");
       RSSList.firstChild.setAttribute("clipboard", (document.getElementById('clipboard').selectedIndex == 0)? "true" : "false");
       RSSList.firstChild.setAttribute("scrollingspeed", document.getElementById("scrollingspeed1").value);
       RSSList.firstChild.setAttribute("scrollingIncrement", document.getElementById("scrollingIncrement1").value);
       RSSList.firstChild.setAttribute("font", document.getElementById("fresh-font").value);
       RSSList.firstChild.setAttribute("favicon", (document.getElementById('favicon').selectedIndex == 0)? "true" : "false");
       RSSList.firstChild.setAttribute("foregroundColor", (document.getElementById('foregroundColor').selectedIndex == 0)? "auto" : document.getElementById('manualColor').color);
       RSSList.firstChild.setAttribute("defaultForegroundColor", (document.getElementById('defaultForegroundColor').selectedIndex == 0)? "default" : (document.getElementById('defaultForegroundColor').selectedIndex == 1)? "sameas" : document.getElementById('defaultManualColor').color);
       RSSList.firstChild.setAttribute("hideViewed", (document.getElementById('hideViewed').selectedIndex == 0)? "true" : "false");
       RSSList.firstChild.setAttribute("tooltip", (document.getElementById('tooltip').selectedIndex == 0)? "description" : (document.getElementById('tooltip').selectedIndex == 1)? "title" : (document.getElementById('tooltip').selectedIndex == 2)? "allInfo" : "article" );
       RSSList.firstChild.setAttribute("clickHeadline", document.getElementById('clickHeadline').selectedIndex);
       RSSList.firstChild.setAttribute("hideOld", (document.getElementById('hideOld').selectedIndex == 0)? "true" : "false");
       RSSList.firstChild.setAttribute("sortedMenu", (document.getElementById('sortedMenu').selectedIndex == 0)? "no" : ((document.getElementById('sortedMenu').selectedIndex == 1)? "asc" : "des"));
       RSSList.firstChild.setAttribute("hideHistory", (document.getElementById('hideHistory').selectedIndex == 0)? "true" : "false");
       RSSList.firstChild.setAttribute("includeAssociated", (document.getElementById('includeAssociated').selectedIndex == 0)? "true" : "false");
       RSSList.firstChild.setAttribute("cycling", (document.getElementById('cycling').selectedIndex == 0)? "true" : "false");
       RSSList.firstChild.setAttribute("cyclingDelay", document.getElementById("cyclingDelay1").value);
       RSSList.firstChild.setAttribute("nextFeed", (document.getElementById('nextFeed').selectedIndex == 0)? "next" : "random");
       RSSList.firstChild.setAttribute("defaultPurgeHistory", document.getElementById("defaultPurgeHistory").value);
       RSSList.firstChild.setAttribute("timeslice", document.getElementById("timeslice").value);
       RSSList.firstChild.setAttribute("fontSize", (document.getElementById('fontSize').selectedIndex == 0)? "auto" : document.getElementById('fontSize1').value);
       RSSList.firstChild.setAttribute("stopscrolling", (document.getElementById('stopscrolling').selectedIndex == 0)? "true" : "false");
       RSSList.firstChild.setAttribute("defaultGroupIcon", document.getElementById("defaultGroupIcon").value);
       RSSList.firstChild.setAttribute("cycleWithinGroup", (document.getElementById('cycleWithinGroup').selectedIndex == 0)? "true" : "false");
       RSSList.firstChild.setAttribute("scrollingdirection", (document.getElementById('scrollingdirection').selectedIndex == 0)? "rtl" : "ltr");
       RSSList.firstChild.setAttribute("synchronizeIcon", (document.getElementById('synchronizeIcon').selectedIndex == 0)? "true" : "false");
       RSSList.firstChild.setAttribute("flashingIcon", (document.getElementById('flashingIcon').selectedIndex == 0)? "true" : "false");
       RSSList.firstChild.setAttribute("mouseEvent", (document.getElementById('mouseEvent').selectedIndex == 0)? "0" : "-1");
       RSSList.firstChild.setAttribute("popupMessage", (document.getElementById('popupMessage').selectedIndex == 0)? "true" : "false");
       RSSList.firstChild.setAttribute("playSound", (document.getElementById('playSound').selectedIndex == 0)? "true" : "false");
       RSSList.firstChild.setAttribute("defaultPlayPodcast", (document.getElementById('defaultPlayPodcast').selectedIndex == 0)? "true" : "false");
       RSSList.firstChild.setAttribute("displayEnclosure", (document.getElementById('displayEnclosure').selectedIndex == 0)? "true" : "false");
       RSSList.firstChild.setAttribute("displayBanned", (document.getElementById('displayBanned').selectedIndex == 0)? "true" : "false");
       RSSList.firstChild.setAttribute("savePodcastLocation", (document.getElementById('savePodcastLocation').selectedIndex == 0)? document.getElementById('savePodcastLocation1').value : "");
       RSSList.firstChild.setAttribute("collapseBar", (document.getElementById('collapseBar').selectedIndex == 0)? "true" : "false");
       RSSList.firstChild.setAttribute("mouseWheelScroll", (document.getElementById('mouseWheelScroll').selectedIndex == 0)? "pixel" : (document.getElementById('mouseWheelScroll').selectedIndex == 1)? "pixels" : "headline");

       RSSList.firstChild.setAttribute("readAllIcon", (document.getElementById("readAllIcon").getAttribute("checked") == "true")? "true" : "false");
       RSSList.firstChild.setAttribute("viewAllIcon", (document.getElementById("viewAllIcon").getAttribute("checked") == "true")? "true" : "false");
       RSSList.firstChild.setAttribute("shuffleIcon", (document.getElementById("shuffleIcon").getAttribute("checked") == "true")? "true" : "false");
       RSSList.firstChild.setAttribute("directionIcon", (document.getElementById("directionIcon").getAttribute("checked") == "true")? "true" : "false");
       RSSList.firstChild.setAttribute("scrollingIcon", (document.getElementById("scrollingIcon").getAttribute("checked") == "true")? "true" : "false");
       RSSList.firstChild.setAttribute("previousIcon", (document.getElementById("previousIcon").getAttribute("checked") == "true")? "true" : "false");
       RSSList.firstChild.setAttribute("pauseIcon", (document.getElementById("pauseIcon").getAttribute("checked") == "true")? "true" : "false");
       RSSList.firstChild.setAttribute("nextIcon", (document.getElementById("nextIcon").getAttribute("checked") == "true")? "true" : "false");
       RSSList.firstChild.setAttribute("refreshIcon", (document.getElementById("refreshIcon").getAttribute("checked") == "true")? "true" : "false");
       RSSList.firstChild.setAttribute("hideOldIcon", (document.getElementById("hideOldIcon").getAttribute("checked") == "true")? "true" : "false");
       RSSList.firstChild.setAttribute("hideViewedIcon", (document.getElementById("hideViewedIcon").getAttribute("checked") == "true")? "true" : "false");
       RSSList.firstChild.setAttribute("synchronizationIcon", (document.getElementById("synchronizationIcon").getAttribute("checked") == "true")? "true" : "false");
       RSSList.firstChild.setAttribute("homeIcon", (document.getElementById("homeIcon").getAttribute("checked") == "true")? "true" : "false");
       RSSList.firstChild.setAttribute("filterIcon", (document.getElementById("filterIcon").getAttribute("checked") == "true")? "true" : "false");


       inforssXMLRepository.setServerInfo(document.getElementById('inforss.repo.urltype').value,
                                          document.getElementById('ftpServer').value,
                                          document.getElementById('repoDirectory').value,
                                          document.getElementById('repoLogin').value,
                                          document.getElementById('repoPassword').value,
                                          (document.getElementById('repoAutoSync').selectedIndex == 0)? true : false
                                          );

       returnValue = true;
     }
   }
   catch (e)
   {
     inforssDebug(e);
   }
   return returnValue;
}

//-----------------------------------------------------------------------------------------------------
function updateGroup(oldUrl, newUrl)
{
  try
  {
    var items = RSSList.getElementsByTagName("RSS");
    for (var i=0; i < items.length; i++)
    {
      if (items[i].getAttribute("type") == "group")
      {
      	var groupList = items[i].getElementsByTagName("GROUP");
//alert("length=" + selectedList.length + "\n");
	    for (var j = 0; j < groupList.length; j++)
	    {
          if (groupList[j].getAttribute("url") == oldUrl)
          {
//alert("modif:" + oldUrl + " " + newUrl);
            groupList[j].setAttribute("url", newUrl);
          }
        }
      }
    }
  }
  catch (e)
  {
    inforssDebug(e);
  }
}
//-----------------------------------------------------------------------------------------------------
function resetSettingDisabled(flag)
{
   var radio = document.getElementById('nbitem');
   radio.setAttribute("disabled", flag);
   radio.childNodes[0].setAttribute("disabled", flag);
   radio.childNodes[1].setAttribute("disabled", flag);
   var slider = document.getElementById('nbitem1');
   slider.disabled = flag;
   
   radio = document.getElementById('lengthitem');
   radio.setAttribute("disabled", flag);
   radio.childNodes[0].setAttribute("disabled", flag);
   radio.childNodes[1].setAttribute("disabled", flag);
   slider = document.getElementById('lengthitem1');
   slider.disabled = flag;
   
   radio = document.getElementById('inforss.refresh');
   radio.setAttribute("disabled", flag);
   radio.childNodes[0].setAttribute("disabled", flag);
   radio.childNodes[1].setAttribute("disabled", flag);
   radio.childNodes[2].setAttribute("disabled", flag);
   slider = document.getElementById('refresh1');
   slider.disabled = flag;
   
   slider = document.getElementById('purgeHistory');
   slider.disabled = flag;
   var button = document.getElementById('purgeHistory.button');
   button.disabled = flag;
   
   radio = document.getElementById('playPodcast');
   radio.setAttribute("disabled", flag);
   radio.childNodes[0].setAttribute("disabled", flag);
   radio.childNodes[1].setAttribute("disabled", flag);
   
   radio = document.getElementById('savePodcastLocation2');
   radio.setAttribute("disabled", flag);
   radio.childNodes[0].setAttribute("disabled", flag);
   radio.childNodes[1].setAttribute("disabled", flag);
   radio.nextSibling.childNodes[1].setAttribute("disabled", flag);
   var textbox = document.getElementById('savePodcastLocation3');
   textbox.disabled = flag;
   textbox.nextSibling.setAttribute("disabled", flag);
   
   radio = document.getElementById('browserHistory');
   radio.setAttribute("disabled", flag);
   radio.childNodes[0].setAttribute("disabled", flag);
   radio.childNodes[1].setAttribute("disabled", flag);  
}

//-----------------------------------------------------------------------------------------------------
function validDialog()
{
  var returnValue = true;
  try
  {
    if (currentRSS != null)
    {
      switch (currentRSS.getAttribute("type"))
      {
        case "rss":
        case "atom":
        case "html":
        case "html":
        {
          if ((document.getElementById('optionTitle').value == null) ||
              (document.getElementById('optionTitle').value == "") ||
              (document.getElementById('optionUrl').value == null) ||
              (document.getElementById('optionUrl').value == "") ||
              (document.getElementById('optionLink').value == null) ||
              (document.getElementById('optionLink').value == "") ||
              (document.getElementById('optionDescription').value == null) ||
              (document.getElementById('optionDescription').value == "") ||
              (document.getElementById('iconurl').value == null) ||
              (document.getElementById('iconurl').value == ""))
          {
            returnValue = false;
            alert(document.getElementById("bundle_inforss").getString("inforss.pref.mandatory"));
          }
          if ((currentRSS.getAttribute("type") == "html") && (returnValue == true))
          {
            if ((currentRSS.getAttribute("regexp") == null) || (currentRSS.getAttribute("regexp") == ""))
            {
              returnValue = false;
              alert(document.getElementById("bundle_inforss").getString("inforss.html.mandatory"));
            }
            else
            {
              if ((currentRSS.getAttribute("htmlTest") == null) || (currentRSS.getAttribute("htmlTest") == "") || (currentRSS.getAttribute("htmlTest") == "false"))
              {
                returnValue = false;
                alert(document.getElementById("bundle_inforss").getString("inforss.html.test"));
              }
            }
          }
          break;
        }
        case "group":
        {
          if ((document.getElementById("groupName").value == null) ||
              (document.getElementById("groupName").value == "") ||
              (document.getElementById('iconurlgroup').value == null) ||
              (document.getElementById('iconurlgroup').value == ""))
          {
            returnValue = false;
            alert(document.getElementById("bundle_inforss").getString("inforss.pref.mandatory"));
          }
          else
          {
            if (document.getElementById('playlistoption').selectedIndex == 0) // playlist = true
            {
              var listbox = document.getElementById("group-playlist");
              var richListItem = listbox.firstChild;
              while ((richListItem != null) && (returnValue == true))
              {
                if ((richListItem.firstChild.firstChild.value == null) ||
                    (richListItem.firstChild.firstChild.value == ""))
                {
                  returnValue = false;
                  alert(document.getElementById("bundle_inforss").getString("inforss.delay.mandatory"));
                }
                else
                {
                  richListItem = richListItem.nextSibling;
                }
              }
            }
          }
          break;
        }
      }
      if (returnValue == true)
      {
        var vbox = document.getElementById("inforss.filter.vbox");
        var child = vbox.childNodes[3]; // first filter
        while ((child != null) && (returnValue == true))
        {
          var checkbox = child.childNodes[0];
          var type = child.childNodes[1];
          var deck = child.childNodes[2];
          if ((checkbox.getAttribute("checked") == "true") && (type.selectedIndex <= 2)) // headline/body/category
          {
            var text = deck.firstChild.childNodes[1];
            if ((text.value == "") || (text.value == null))
            {
              alert(document.getElementById("bundle_inforss").getString("inforss.pref.mandatory"));
              returnValue = false
            }
          }
          child = child.nextSibling;
        }
      }
    }
    if (returnValue == true)
    {
      if ((document.getElementById('defaultGroupIcon').value == null) ||
          (document.getElementById('defaultGroupIcon').value == ""))
      {
        returnValue = false;
        alert(document.getElementById("bundle_inforss").getString("inforss.icongroup.mandatory"));
      }
    }

    if (returnValue == true)
    {
      if ((document.getElementById('repoAutoSync').selectedIndex == 0) &&
          (checkServerInfoValue() == false))
      {
        returnValue = false;
        document.getElementById('inforss.option.tab').selectedIndex = 1;
        document.getElementById('inforss.listbox2').selectedIndex = 4;
        document.getElementById('inforssTabpanelsAdvance').selectedIndex=3
      }
    }

    if (returnValue == true)
    {
      if (document.getElementById('savePodcastLocation').selectedIndex == 0)
      {
		if ((document.getElementById('savePodcastLocation1').value == null) ||
		    (document.getElementById('savePodcastLocation1').value == ""))
        {
		  returnValue = false;
          alert(document.getElementById("bundle_inforss").getString("inforss.podcast.mandatory"));
	    }
	    else
	    {
		  try
		  {
	        var dir = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
            dir.initWithPath(document.getElementById('savePodcastLocation1').value);
            if ((dir.exists() == false) || (dir.isDirectory() == false))
            {
		      returnValue = false;
		    }
		  }
		  catch(ex)
		  {
		    returnValue = false;
		  }
		  if (returnValue == false)
		  {
            alert(document.getElementById("bundle_inforss").getString("inforss.podcast.location.notfound"));
		  }
		}
		if (returnValue == false)
		{
          document.getElementById('inforss.option.tab').selectedIndex = 1;
          document.getElementById('inforss.listbox2').selectedIndex = 0;
          document.getElementById('inforssTabpanelsAdvance').selectedIndex = 0
        }
      }
    }

    if (returnValue == true)
    {
      if (document.getElementById('savePodcastLocation2').selectedIndex == 0)
      {
		if ((document.getElementById('savePodcastLocation3').value == null) ||
		    (document.getElementById('savePodcastLocation3').value == ""))
        {
		  returnValue = false;
          alert(document.getElementById("bundle_inforss").getString("inforss.podcast.mandatory"));
	    }
	    else
	    {
		  try
		  {
	        var dir = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
            dir.initWithPath(document.getElementById('savePodcastLocation3').value);
            if ((dir.exists() == false) || (dir.isDirectory() == false))
            {
		      returnValue = false;
		    }
		  }
		  catch(ex)
		  {
		    returnValue = false;
		  }
		  if (returnValue == false)
		  {
            alert(document.getElementById("bundle_inforss").getString("inforss.podcast.location.notfound"));
		  }
		}
		if (returnValue == false)
		{
          document.getElementById('inforss.option.tab').selectedIndex = 0;
          document.getElementById('inforss.listbox1').selectedIndex = 0;
          document.getElementById('inforssTabpanelsBasic').selectedIndex = 3;
          document.getElementById('inforss.gefise').selectedIndex = 2;
        }
      }
    }

  }
  catch (e)
  {
    inforssDebug(e);
  }
  return returnValue;
}

//-----------------------------------------------------------------------------------------------------
function _remove()
{
  try
  {
    if (currentRSS == null)
    {
      alert(document.getElementById("bundle_inforss").getString("inforss.group.selectfirst"));
    }
    else
    {
      var menuItem = document.getElementById("rss-select-menu").selectedItem;
      var key = null;
      if (currentRSS.getAttribute("type") == "group")
      {
        key = "inforss.group.removeconfirm";
      }
      else
      {
        key = "inforss.rss.removeconfirm";
      }
      if (confirm(document.getElementById("bundle_inforss").getString(key)))
      {
        gRemovedUrl = ((gRemovedUrl == null)? "" : gRemovedUrl) + currentRSS.getAttribute("url") + "|";
        var parent = menuItem.parentNode;
        menuItem.parentNode.removeChild(menuItem);
        currentRSS.parentNode.removeChild(currentRSS);
        if (currentRSS.getAttribute("type") != "group")
        {
          var listbox = document.getElementById("group-list-rss");
          var listitem = listbox.firstChild.nextSibling;
          var checkbox = null;
          var nextHbox = null;
          var label = null;
          while (listitem != null)
          {
            checkbox = listitem.childNodes[0];
            label = listitem.childNodes[1];
            nextHbox = listitem.nextSibling;
            if (label.getAttribute("value") == currentRSS.getAttribute("title"))
            {
              listbox.removeChild(listitem);
            }
            listitem = nextHbox;
          }
          var items = RSSList.getElementsByTagName("RSS");
          for (var i = 0; i < items.length ; i++)
          {
            if (items[i].getAttribute("type") == "group")
            {
              var groups = items[i].getElementsByTagName("GROUP");
              var j = 0;
              var find = false;
              while ((j < groups.length) && (find == false))
              {
                if (groups[j].getAttribute("url") == currentRSS.getAttribute("url"))
                {
                  items[i].removeChild(groups[j]);
                  find = true;
                }
                else
                {
                  j++;
                }
              }
            }
          }
        }
        gNbRss--;
        if (gNbRss > 0)
        {
          currentRSS = null;
          parent.parentNode.selectedIndex = 0;
          selectRSS(parent.firstChild);
        }
        else
        {
          currentRSS = null;
        }
      }
    }
  }
  catch (e)
  {
    inforssDebug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function newGroup()
{
  try
  {
     var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
     var name1 = { value: document.getElementById("bundle_inforss").getString("inforss.group.defaultname")};
     var valid  = promptService.prompt(window,document.getElementById("bundle_inforss").getString("inforss.group.newgroup"),
                          document.getElementById("bundle_inforss").getString("inforss.group.newgroup"),
                          name1, null, {value: null});
    var name = name1.value;
    if ((valid == true) && (name != null) && (name != ""))
    {
      if (nameAlreadyExists(name) == true)
      {
        alert(document.getElementById("bundle_inforss").getString("inforss.group.alreadyexists"));
      }
      else
      {
        var rss = RSSList.createElement("RSS");
        rss.setAttribute("url",name);
        rss.setAttribute("title",name);
        rss.setAttribute("description",name);
        rss.setAttribute("type","group");
        rss.setAttribute("icon","chrome://inforss/skin/group.png");
        rss.setAttribute("filterPolicy","0");
        rss.setAttribute("selected","false");
        rss.setAttribute("filterCaseSensitive","true");
        rss.setAttribute("activity", "true");
        rss.setAttribute("playlist", "false");
        RSSList.firstChild.appendChild(rss);
        var element = document.getElementById("rss-select-menu").appendItem(name, "newgroup");
        element.setAttribute("class","menuitem-iconic");
        element.setAttribute("image",rss.getAttribute("icon"));
        element.setAttribute("url", name);
        document.getElementById("rss-select-menu").selectedIndex = gNbRss;
        gNbRss++;
        selectRSS(element);

      	document.getElementById("inforss.group.treecell1").parentNode.setAttribute("url", rss.getAttribute("url"));
        document.getElementById("inforss.group.treecell1").setAttribute("properties", "on");
        document.getElementById("inforss.group.treecell2").setAttribute("properties", "unactive");
        document.getElementById("inforss.group.treecell3").setAttribute("label", "");
        document.getElementById("inforss.group.treecell4").setAttribute("label", "");
        document.getElementById("inforss.group.treecell5").setAttribute("label", "");

      }
    }
  }
  catch (e)
  {
    inforssDebug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function newRss(type)
{
  try
  {
    var returnValue = {title:null, type:null, search:null, 
                       keyword:null, url:null, user:null, 
                       password:null, valid:false, regexp:null,
                       regexpTitle:null,
                       regexpDescription:null,
                       regexpLink:null,
                       regexpStartAfter:null,
                       htmlDirection:null,
                       htmlTest:null };
    window.openDialog("chrome://inforss/content/inforssCaptureNewFeed.xul","_blank","modal,centerscreen,resizable=yes, dialog=yes", returnValue);
    var type = returnValue.type;
    if (returnValue.valid == true)
    { 
      switch (type)
      { 
        case "rss":
        case "html":
        case "search":
        case "twitter":	
        {
          var url = returnValue.url;
          if (nameAlreadyExists(url) == true)
          {
            alert(document.getElementById("bundle_inforss").getString("inforss.rss.alreadyexists"));
          }
          else
          {
            var title = returnValue.title;
            var user = returnValue.user;
            var password = returnValue.password;
            if (gRssTimeout != null)
            {
              window.clearTimeout(gRssTimeout);
              gRssTimeout = null;
            }
            if (gRssXmlHttpRequest != null)
            {
              gRssXmlHttpRequest.abort();
            }
            gRssTimeout = window.setTimeout("rssTimeout()", 10000);
            gRssXmlHttpRequest = new XMLHttpRequest();
            gRssXmlHttpRequest.open("GET", url, true, user, password);
            gRssXmlHttpRequest.url = url;
            gRssXmlHttpRequest.user = user;
            gRssXmlHttpRequest.title = title;
            gRssXmlHttpRequest.password = password;
//alert("foo pass=" + password);
            gRssXmlHttpRequest.setRequestHeader("User-Agent", "Mozilla/5.0");
            document.getElementById("inforss.new.feed").setAttribute("disabled","true");
            if ((type == "rss") || (type == "twitter")) // rss
            {
              gRssXmlHttpRequest.onload = processRss;
              gRssXmlHttpRequest.onerror = rssTimeout;
              gRssXmlHttpRequest.overrideMimeType("application/xml");
            }
            else 
            {
              gRssXmlHttpRequest.feedType = type;
              gRssXmlHttpRequest.onload = processHtml;
              gRssXmlHttpRequest.onerror = rssTimeout;
              if (type == "search")
              {
                gRssXmlHttpRequest.regexp = returnValue.regexp;
                gRssXmlHttpRequest.regexpTitle = returnValue.regexpTitle;
                gRssXmlHttpRequest.regexpDescription = returnValue.regexpDescription;
                gRssXmlHttpRequest.regexpLink = returnValue.regexpLink;
                gRssXmlHttpRequest.regexpStartAfter = returnValue.regexpStartAfter;
                gRssXmlHttpRequest.htmlDirection = returnValue.htmlDirection;             
                gRssXmlHttpRequest.htmlTest = returnValue.htmlTest;
              }
            }
            gRssXmlHttpRequest.send(null);
          }
          break;
        }
        case "nntp":
        {
          newNntp(returnValue);
          break;
        }
      }
    }
  }
  catch (e)
  {
    inforssDebug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function newNntp(type)
{
  try
  {
    var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
//    var url1 = { value: "news://news."};
//    var passwdChkbox = { value: false };
//    var user = { value: "" };
//    var passwd = { value: "" };
//    var valid  = promptService.prompt(window, document.getElementById("bundle_inforss").getString("inforss.new.nntp"),
//                          document.getElementById("bundle_inforss").getString("inforss.add.nntp"),
//                          url1, document.getElementById("bundle_inforss").getString("inforss.add.nntp.password"), passwdChkbox);
//    var url = url1.value;
//    if ((valid == true) && (url != null) && (url != ""))
//    {
//      var error = false;
//      if (passwdChkbox.value == true)
//      {
//        getFlag = promptService.promptUsernameAndPassword(window, null , document.getElementById("bundle_inforss").getString("inforss.account") + " " + url , user  , passwd  , null , { value: false });
//        if ((user.value == null) || (user.value == "") || (passwd.value == null) || (passwd.value == ""))
//        {
//          alert(document.getElementById("bundle_inforss").getString("inforss.nntp.usermandatory"));
//          error = true;
//        }
//      }
//      if (error == false)
//      {
        if (nameAlreadyExists(type.url) == true)
        {
          alert(document.getElementById("bundle_inforss").getString("inforss.nntp.alreadyexists"));
        }
        else
        {
          var test = testValidNntpUrl(type.url, type.user, type.password);
          if (test.valid == false)
          {
            alert(document.getElementById("bundle_inforss").getString("inforss.nntp.malformedurl"));
          }
          else
          {
            var rss = RSSList.createElement("RSS");
            rss.setAttribute("url", type.url);
            var mainWebSite = test.url.substring(test.url.indexOf("."));
            var index = mainWebSite.indexOf(":");
            if (index != -1)
            {
              mainWebSite = mainWebSite.substring(0, index);
            }
            rss.setAttribute("link", "http://www" + mainWebSite);
            rss.setAttribute("title", type.title);
            rss.setAttribute("description", test.group);
            rss.setAttribute("type","nntp");
            rss.setAttribute("icon","chrome://inforss/skin/nntp.png");
            rss.setAttribute("filterPolicy","0");
            rss.setAttribute("selected","false");
            rss.setAttribute("filterCaseSensitive","true");
            rss.setAttribute("activity", "true");

            rss.setAttribute("filterPolicy","0");

            rss.setAttribute("nbItem", RSSList.firstChild.getAttribute("defaultNbItem"));
            rss.setAttribute("lengthItem", RSSList.firstChild.getAttribute("defaultLenghtItem"));
            rss.setAttribute("playPodcast", RSSList.firstChild.getAttribute("defaultPlayPodcast"));
            rss.setAttribute("purgeHistory", RSSList.firstChild.getAttribute("defaultPurgeHistory"));
            rss.setAttribute("savePodcastLocation", RSSList.firstChild.getAttribute("savePodcastLocation"));
            rss.setAttribute("browserHistory", RSSList.firstChild.getAttribute("defaultBrowserHistory"));
            rss.setAttribute("refresh",RSSList.firstChild.getAttribute("refresh"));
            rss.setAttribute("user", type.user);
            if ((type.user != null) && (type.user != ""))
            {
              inforssXMLRepository.storePassword(type.url, type.user, type.password);
            }

            rss.setAttribute("filter","all");
            rss.setAttribute("filterCaseSensitive","true");
            rss.setAttribute("encoding", "");


            RSSList.firstChild.appendChild(rss);
            var element = document.getElementById("rss-select-menu").appendItem(test.group, "nntp");
            element.setAttribute("class","menuitem-iconic");
            element.setAttribute("image",rss.getAttribute("icon"));
            element.setAttribute("url", type.url);
            document.getElementById("rss-select-menu").selectedIndex = gNbRss;
            gNbRss++;
            selectRSS(element);

            document.getElementById("inforss.group.treecell1").parentNode.setAttribute("url", rss.getAttribute("url"));
            document.getElementById("inforss.group.treecell1").setAttribute("properties", "on");
            document.getElementById("inforss.group.treecell2").setAttribute("properties", "unactive");
            document.getElementById("inforss.group.treecell3").setAttribute("label", "");
            document.getElementById("inforss.group.treecell4").setAttribute("label", "");
            document.getElementById("inforss.group.treecell5").setAttribute("label", ""); 
          }
        }
//      }
//    }
  }
  catch (e)
  {
    inforssDebug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function testValidNntpUrl(url, user, passwd)
{
  var returnValue = {valid: false};
  try
  {
//alert(url);
    if ((url.indexOf("news://") == 0) && (url.lastIndexOf("/") > 7))
    {
      var newsHost = url.substring(7, url.lastIndexOf("/"));
      var group = url.substring(url.lastIndexOf("/") + 1);

      var dataListener = 
      {
        onStartRequest: function(request, context){ },
        onStopRequest: function(request, context, status){ instream.close(); },
        onDataAvailable: function(request, context, inputStream, offset, count)
        {
          var data = scriptablestream.read(count);
          pump = Components.classes["@mozilla.org/network/input-stream-pump;1"].createInstance(Components.interfaces.nsIInputStreamPump);
          pump.init(instream, -1, -1, 0, 0, false);
          var res = data.split(" ");
// dump("res=" + res[0] + "\n");
          if (res.length > 0)
          {
            switch (res[0])
            {
              case "200": // WELCOME
              {
                if ((user != null) && (user != ""))
                {
                  var outputData = "AUTHINFO USER " + user + "\r\n";
                }
                else
                {
                  var outputData = "GROUP " + group + "\r\n";
                }
                outstream.write(outputData, outputData.length);
                pump.asyncRead(dataListener, null);
                break;
              }
              case "381": // USER
              {
                var outputData = "AUTHINFO PASS " + passwd + "\r\n";
                outstream.write(outputData, outputData.length);
                pump.asyncRead(dataListener, null);                  
                break;
              }
              case "281": // PASS
              {
                var outputData = "GROUP " + group + "\r\n";
                outstream.write(outputData, outputData.length);
                pump.asyncRead(dataListener, null);                  
                break;
              }
              case "211": // GROUP
              {
                instream.close();
                break;
              }
              case "411": // BAD GROUP
              {
                alert(document.getElementById("bundle_inforss").getString("inforss.nntp.badgroup"));
                instream.close();
                break;
              }
              default: // default
              {
                alert(document.getElementById("bundle_inforss").getString("inforss.nntp.error"));
                instream.close();
              }
            }
          }
          else
          {
            alert(document.getElementById("bundle_inforss").getString("inforss.nntp.error"));
            instream.close();
          }
        }
      };
      var transportService = Components.classes["@mozilla.org/network/socket-transport-service;1"].getService(Components.interfaces.nsISocketTransportService);
      var index = newsHost.indexOf(":");
      var newsUrl = newsHost;
      var port = 119;
      if (index != -1)
      {
        newsUrl = newsHost.substring(0, index);
        port = newsHost.substring(index + 1);
      }
      var transport = transportService.createTransport(null, 0, newsUrl, port, null);
      transport.setTimeout(0, 3000);
      var outstream = transport.openOutputStream(0,0,0);
      var instream = transport.openInputStream(0,0,0);
      var scriptablestream = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance(Components.interfaces.nsIScriptableInputStream);
      scriptablestream.init(instream);
      var pump = Components.classes["@mozilla.org/network/input-stream-pump;1"].createInstance(Components.interfaces.nsIInputStreamPump);
      pump.init(instream, -1, -1, 0, 0, false);
      pump.asyncRead(dataListener, null);    
     
      returnValue = {valid: true, url: newsHost, group: group};
    }
  }
  catch (e)
  {
    inforssDebug(e);
  }
  return returnValue;
}

//-----------------------------------------------------------------------------------------------------
function nameAlreadyExists(url)
{
  var find = false;
  try
  {
    var list = RSSList.getElementsByTagName("RSS");
    var i = 0;
    if (list != null)
    {
      while ((i < list.length) && (find == false))
      {
        if (list[i].getAttribute("url") == url)
        {
          find = true;
        }
        else
        {
          i++;
        }
      }
    }
  }
  catch (e)
  {
    inforssDebug(e);
  }
  return find;
}


//-----------------------------------------------------------------------------------------------------
function selectRSS(menuitem)
{
  try
  {
//    document.getElementById("categoryDeck").selectedIndex = 1;
    if ((currentRSS == null) || (validDialog() == true))
    {
//      window.setTimeout("selectRSS1('" + menuitem.getAttribute("url") + "','" + menuitem.getAttribute("user") + "')", 0);
      selectRSS1(menuitem.getAttribute("url"), menuitem.getAttribute("user"));
      gOldRssIndex = document.getElementById("rss-select-menu").selectedIndex;
    }
    else
    {
      document.getElementById("rss-select-menu").selectedIndex = gOldRssIndex;
    }
  }
  catch (e)
  {
    inforssDebug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function getNext()
{
  try
  {
    if (validDialog() == true)
    {
      if (document.getElementById("rss-select-menu").selectedIndex != gNbRss - 1)
      {
        document.getElementById("rss-select-menu").selectedIndex = document.getElementById("rss-select-menu").selectedIndex + 1;
        selectRSS(document.getElementById("rss-select-menu").selectedItem);
      }
    }
  }
  catch (e)
  {
    inforssDebug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function getPrevious()
{
  try
  {
    if (validDialog() == true)
    {
      if (document.getElementById("rss-select-menu").selectedIndex > 0)
      {
        document.getElementById("rss-select-menu").selectedIndex = document.getElementById("rss-select-menu").selectedIndex - 1;
        selectRSS(document.getElementById("rss-select-menu").selectedItem);
      }
    }
  }
  catch (e)
  {
    inforssDebug(e);
  }
}


//-----------------------------------------------------------------------------------------------------
function setGroupCheckBox(rss)
{
  try
  {
    var listbox = document.getElementById("group-list-rss");
    var listitem = null;
    var checkbox = null;
    var label = null;
    var flag = document.getElementById("viewAllViewSelected").selectedIndex;
    for (var i=1; i < listbox.childNodes.length; i++)
    {
      listitem = listbox.childNodes[i];
      checkbox = listitem.childNodes[0];
      label = listitem.childNodes[1];
      var selectedList = (rss == null)? null : rss.getElementsByTagName("GROUP");
      var find = false;
      var j = 0;
      if (selectedList != null)
      {
        while ((j < selectedList.length) && (find == false))
        {
          if (selectedList[j].getAttribute("url") == label.getAttribute("url"))
          {
            find = true;
          }
          else
          {
            j++;
          }
        }
      }
      checkbox.setAttribute("checked", (find == true)? "true" : "false");
      if (flag == 0)
      {
		listitem.setAttribute("collapsed", "false");
	  }
	  else
	  {
		if (find == true)
		{
		  listitem.setAttribute("collapsed", "false");
		}
		else
		{
		  listitem.setAttribute("collapsed", "true");
		}
	  }
    }
  }
  catch(e)
  {
    inforssDebug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function checkAll(obj)
{
  try
  {
    var flag = (obj.getAttribute("checked") == "true")? "false" : "true";
    var listbox = document.getElementById("group-list-rss");
    var listitem = null;
    var checkbox = null;
    var label = null;
    for (var i=1; i < listbox.childNodes.length; i++)
    {
      listitem = listbox.childNodes[i];
      checkbox = listitem.childNodes[0];
      checkbox.setAttribute("checked", flag);
    }
  }
  catch(e)
  {
    inforssDebug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function selectRSS1(url, user)
{
  try
  {
//dump("selectRSS1 start " + url + "\n");
    var password = inforssXMLRepository.readPassword(url, user);
    document.getElementById("inforss.previous.rss").setAttribute("disabled","true");
    document.getElementById("inforss.next.rss").setAttribute("disabled","true");
    document.getElementById("inforss.new.feed").setAttribute("disabled","true");
    if (gRssTimeout != null)
    {
      window.clearTimeout(gRssTimeout);
      gRssTimeout = null;
    }
    if (gRssXmlHttpRequest != null)
    {
      gRssXmlHttpRequest.abort();
    }

    if (currentRSS != null)
    {
      storeValue();
    }
    var rss = inforssGetItemFromUrl(url);
    selectRSS2(rss);
    
    currentRSS = rss;
    document.getElementById("inforss.filter.anyall").selectedIndex = (rss.getAttribute("filter") == "all")? 0 : 1;


    resetFilter();

    if ((rss.getAttribute("type") == "rss") || (rss.getAttribute("type") == "atom"))
    {
      gRssTimeout = window.setTimeout("rssCategoryTimeout()", 5000);
      gRssXmlHttpRequest = new XMLHttpRequest();
      gRssXmlHttpRequest.open("GET", url, true, user, password);
      gRssXmlHttpRequest.onload = processCategories;
      gRssXmlHttpRequest.onerror = rssCategoryTimeout;
      gRssXmlHttpRequest.setRequestHeader("User-Agent", "Mozilla/5.0");
      gRssXmlHttpRequest.overrideMimeType("application/xml");
      gRssXmlHttpRequest.send(null);
    }
    else
    {
      initListCategories(null)
    }
    
    document.getElementById("inforss.make.current").setAttribute("disabled", rss.getAttribute("selected") == "true");
    document.getElementById("inforss.make.current.background").style.backgroundColor = (rss.getAttribute("selected") == "true")? "rgb(192,255,192)" : "inherit";

  }
  catch(e)
  {
    inforssDebug(e);
  }
//dump("selectRSS1 end " + url + "\n");
//  document.getElementById("categoryDeck").selectedIndex = 0;
}

//-----------------------------------------------------------------------------------------------------
function selectRSS2(rss)
{
  try
  {
//dump("selectRSS1 start " + url + "\n");
    var url = rss.getAttribute("url");
    switch (rss.getAttribute("type"))
    {
      case "rss":
      case "atom":
      case "html":
      case "nntp":
      case "twitter":  
      {
//        netscape.security.PrivilegeManager.enablePrivilege("UniversalBrowserRead");
        var br = document.getElementById("inforss.canvas.browser");
        br.setAttribute("collapsed", "false");

        br.docShell.allowAuth = false;  
        br.docShell.allowImages = false;  
        br.docShell.allowJavascript = false;  
        br.docShell.allowMetaRedirects = false;  
        br.docShell.allowPlugins = false;  
        br.docShell.allowSubframes = false;
        
        if (rss.getAttribute("link").toLowerCase().indexOf("http") == 0)
        {
          br.setAttribute("src", rss.getAttribute("link"));
        }
        
        document.getElementById("inforss.rsstype").selectedIndex = 0;
        document.getElementById('optionTitle').value = rss.getAttribute("title");
        document.getElementById('optionUrl').value = rss.getAttribute("url");
        document.getElementById('optionLink').value = rss.getAttribute("link");
        document.getElementById('inforss.homeLink').setAttribute("link", rss.getAttribute("link"));
        document.getElementById('optionDescription').value = rss.getAttribute("description");
        document.getElementById('inforss.filter.forgroup').setAttribute("collapsed","true");
        document.getElementById('playListTabPanel').setAttribute("collapsed", "true");
        
        var canvas = document.getElementById("inforss.canvas");
        canvas.setAttribute("link", rss.getAttribute("link"));
        try
        {
          var ctx = canvas.getContext("2d");
          if (applyScale == false)
          {
            ctx.scale(0.5, 0.3);
            applyScale = true;
          }
          ctx.clearRect(0, 0, 133, 100);
          ctx.drawWindow(br.contentWindow, 0, 0, 800, 600, "rgb(255,255,255)");
          refreshCount = 0;
          window.setTimeout(updateCanvas, 2000);
        }
        catch(e1) {}
        
        var nbitem = rss.getAttribute("nbItem");
        document.getElementById("nbitem").selectedIndex = (nbitem == "9999")? 0 : 1;
        if (nbitem != "9999")
        {
          document.getElementById("nbitem1").value = nbitem;
        }
        var lengthitem = rss.getAttribute("lengthItem");
        document.getElementById("lengthitem").selectedIndex = (lengthitem == "9999")? 0 : 1;
        if (lengthitem != "9999")
        {
          document.getElementById('lengthitem1').value = lengthitem;
        }
        var refresh = rss.getAttribute("refresh");
        if (refresh == 60*24)
        {
          document.getElementById("inforss.refresh").selectedIndex = 0;
          document.getElementById("refresh1").value = 1;
        }
        else
        {
          document.getElementById("refresh1").value = refresh;
          document.getElementById("inforss.refresh").selectedIndex = (refresh == 60)? 1 : 2;
        }
        document.getElementById("inforss.rss.icon").src = rss.getAttribute("icon");
        document.getElementById("iconurl").value = rss.getAttribute("icon");
        document.getElementById("inforss.rss.fetch").style.visibility = (rss.getAttribute("type") == "html")? "visible" : "hidden";
        var playPodcast = rss.getAttribute("playPodcast");
        document.getElementById("playPodcast").selectedIndex = (playPodcast == "true")? 0 : 1;
        var savePodcastLocation = rss.getAttribute("savePodcastLocation");
        document.getElementById("savePodcastLocation2").selectedIndex = (savePodcastLocation == "")? 1 : 0;
        document.getElementById("savePodcastLocation3").value = savePodcastLocation;
        var browserHistory = rss.getAttribute("browserHistory");
        document.getElementById("browserHistory").selectedIndex = (browserHistory == "true")? 0 : 1;
        var filterCaseSensitive = rss.getAttribute("filterCaseSensitive");
        document.getElementById("filterCaseSensitive").selectedIndex = (filterCaseSensitive == "true")? 0 : 1;
        document.getElementById("purgeHistory").value = rss.getAttribute("purgeHistory"); 

/*        var tree = document.getElementById("inforss.tree.feed");
        while (tree.firstChild != null)
        {
    	  tree.removeChild(tree.firstChild);
    	}
    	var treeitem = document.createElement("treeitem");
    	tree.appendChild(treeitem);
    	var treerow = document.createElement("treerow");
    	treeitem.appendChild(treerow);
*/    	var originalFeed = gInforssMediator.locateFeed(url);
    	if (originalFeed != null)
    	{
    	  originalFeed = originalFeed.info;
    	  if (originalFeed != null)
    	  {
    	    document.getElementById("inforss.feed.row1").setAttribute("selected","false");
    	    document.getElementById("inforss.feed.row1").setAttribute("url",rss.getAttribute("url"));
      	    document.getElementById("inforss.feed.treecell1").setAttribute("properties",(rss.getAttribute("activity") == "true")? "on" : "off");
    	    document.getElementById("inforss.feed.treecell2").setAttribute("properties", (originalFeed.active == true)? "active" : "unactive");
    	    document.getElementById("inforss.feed.treecell3").setAttribute("label", ((originalFeed.lastRefresh == null)? "" : inforssGetStringDate(originalFeed.lastRefresh)));
    	    document.getElementById("inforss.feed.treecell4").setAttribute("label", (((originalFeed.lastRefresh == null) || (originalFeed.active == false) || (rss.getAttribute("activity") == "false"))? "" : inforssGetStringDate(new Date(eval(originalFeed.lastRefresh.getTime() + originalFeed.feedXML.getAttribute("refresh") * 60000)))));
    	    document.getElementById("inforss.feed.treecell5").setAttribute("label", ((originalFeed.lastRefresh == null)? "" : originalFeed.getNbHeadlines()));
    	    document.getElementById("inforss.feed.treecell6").setAttribute("label", ((originalFeed.lastRefresh == null)? "" : originalFeed.getNbUnread()));
    	    document.getElementById("inforss.feed.treecell7").setAttribute("label", ((originalFeed.lastRefresh == null)? "" : originalFeed.getNbNew()));
    	    document.getElementById("inforss.feed.treecell8").setAttribute("label", ((originalFeed.feedXML.getAttribute("groupAssociated") == "true")? "Y" : "N"));
	      }
        }
        resetSettingDisabled(false);
        break;
      }
      case "group":
      {
        document.getElementById("inforss.rsstype").selectedIndex = 1;
        document.getElementById("groupName").value = rss.getAttribute("url");
        document.getElementById("inforss.filter.policy").selectedIndex = rss.getAttribute("filterPolicy");
        document.getElementById("inforss.group.icon").src = rss.getAttribute("icon");
        document.getElementById("iconurlgroup").value = rss.getAttribute("icon");
        document.getElementById('inforss.filter.forgroup').setAttribute("collapsed","false");
        var filterCaseSensitive = rss.getAttribute("filterCaseSensitive");
        document.getElementById("filterCaseSensitive").selectedIndex = (browserHistory == "true")? 0 : 1;
        var playlist = rss.getAttribute("playlist");
        document.getElementById("playlistoption").selectedIndex = (playlist == "true")? 0 : 1;
        var listbox = document.getElementById("group-playlist");
        while (listbox.firstChild != null)
        {
          listbox.removeChild(listbox.firstChild);
        }
        if (playlist == "true")
        {
          document.getElementById('playListTabPanel').setAttribute("collapsed", "false");
          var playLists = rss.getElementsByTagName("playLists");
          if (playLists.length != 0)
          {
            var platList = null;
            var rss1 = null;
            for (var i=0; i<playLists[0].childNodes.length; i++)
            {
              playList = playLists[0].childNodes[i];
              rss1 = inforssGetItemFromUrl(playList.getAttribute("url"));
              if (rss1 != null)
              {
                addToPlayList1(playList.getAttribute("delay"),
                               rss1.getAttribute("icon"),
                               rss1.getAttribute("title"),
                               playList.getAttribute("url"));
              }
            }
          }
        }
        else
        {
          document.getElementById('playListTabPanel').setAttribute("collapsed", "true");
        }
        setGroupCheckBox(rss);
    	var originalFeed = gInforssMediator.locateFeed(url);
    	if (originalFeed != null)
    	{
    	  originalFeed = originalFeed.info;
    	  if (originalFeed != null)
    	  {
      	    document.getElementById("inforss.group.treecell1").parentNode.setAttribute("url", rss.getAttribute("url"));
      	    document.getElementById("inforss.group.treecell1").setAttribute("properties",(rss.getAttribute("activity") == "true")? "on" : "off");
    	    document.getElementById("inforss.group.treecell2").setAttribute("properties", (originalFeed.active == true)? "active" : "unactive");
    	    document.getElementById("inforss.group.treecell3").setAttribute("label", originalFeed.getNbHeadlines());
    	    document.getElementById("inforss.group.treecell4").setAttribute("label", originalFeed.getNbUnread());
    	    document.getElementById("inforss.group.treecell5").setAttribute("label", originalFeed.getNbNew());
		  }
        }
        if (document.getElementById("inforss.checkall").hasAttribute("checked") == true)
        {
          document.getElementById("inforss.checkall").removeAttribute("checked");
        }
        document.getElementById("nbitem").selectedIndex =  0;
        document.getElementById("nbitem1").value = 1;
        document.getElementById("lengthitem").selectedIndex =  0;
        document.getElementById('lengthitem1').value = 5;
        document.getElementById("inforss.refresh").selectedIndex = 0;
        document.getElementById("refresh1").value = 1;
        document.getElementById("purgeHistory").value = 1;
        document.getElementById("savePodcastLocation2").selectedIndex = 1;
        resetSettingDisabled(true);
        break;
      }
    }
  }
  catch(e)
  {
    inforssDebug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function selectFeedReport(tree, event)
{
  var row = {}, colID = {}, type = {};

  try
  {
    tree.treeBoxObject.getCellAt(event.clientX, event.clientY, row, colID, type);
    if (colID.value != null)
    {
      if (typeof(colID.value) == "object")  //patch for firefox 1.1
      {
        colID.value = colID.value.id;
      }
      if ((colID.value.indexOf(".report.activity") != -1) && (type.value == "image"))
      {
    	    if (row.value >= gInforssNbFeed)
	    {
	      row.value--;
	    }
        var row = tree.getElementsByTagName("treerow").item(row.value);
        var cell = row.firstChild;
        var treecols = tree.getElementsByTagName("treecols").item(0);
        var cell1 = treecols.firstChild;
//    var i = 0;
//    alert(cell1.getAttribute("id"));
        while (cell1.getAttribute("id").indexOf(".report.activity") == -1)
        {
	      cell1 = cell1.nextSibling;
	      if (cell1.nodeName != "splitter")
	      {
	        cell = cell.nextSibling;
          }
//	  i++;
//      alert(cell1.getAttribute("id"));
	    }
//	alert(i);
        cell.setAttribute("properties",(cell.getAttribute("properties").indexOf("on") != -1)? "off" : "on");
        var rss = inforssGetItemFromUrl(cell.parentNode.getAttribute("url"));
//alert(cell.parentNode.getAttribute("url"));
        rss.setAttribute("activity", (rss.getAttribute("activity") == "true")? "false" : "true");
        if (tree.getAttribute("id") != "inforss.tree3")
        {
	  	  updateReport();
	    }
	    else
	    {
	      if (rss.getAttribute("url") == currentRSS.getAttribute("url"))
	      {
	        if (rss.getAttribute("type") != "group")
	        {
      	      document.getElementById("inforss.feed.treecell1").setAttribute("properties", (rss.getAttribute("activity") == "true")? "on" : "off");
      	    }
      	    else
      	    {
      	      document.getElementById("inforss.group.treecell1").setAttribute("properties", (rss.getAttribute("activity") == "true")? "on" : "off");
      	    }
	      }
	    }
	  }
    }
  }
  catch(e)
  {
    inforssDebug(e);
  }
}


//-----------------------------------------------------------------------------------------------------
function addCell(str, parent, prop, type)
{
  try
  {
    var treecell = document.createElement("treecell");
    if (type == "image")
    {
      treecell.setAttribute("src", str);
	}
	else
	{
      treecell.setAttribute("label", str);
    }
    treecell.style.textAlign = "center";
    treecell.setAttribute("properties","centered" + ((prop == null)? "" : " " +  prop));
    parent.appendChild(treecell);
  }
  catch(e)
  {
    inforssDebug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function resetFilter()
{
    var vbox = document.getElementById("inforss.filter.vbox");
    var hbox = vbox.childNodes[3].nextSibling; // second filter
    while (hbox != null)
    {
      var next = hbox.nextSibling;
      hbox.parentNode.removeChild(hbox);
      hbox = next;
    }
    var hbox = vbox.childNodes[3]; // first filter
    changeStatusFilter1(hbox, "false");

    hbox.childNodes[0].setAttribute("checked","false"); // checkbox
    hbox.childNodes[1].selectedIndex = 0; //type
    hbox.childNodes[2].selectedIndex = 0; //deck
    hbox.childNodes[2].childNodes[0].childNodes[0].selectedIndex = 0; //include/exclude
    hbox.childNodes[2].childNodes[0].childNodes[1].removeAllItems(); //text
    var selectFolder = document.createElement("menupopup");
    selectFolder.setAttribute("id","rss.filter.number.1");
    hbox.childNodes[2].childNodes[0].childNodes[1].appendChild(selectFolder);
    hbox.childNodes[2].childNodes[0].childNodes[1].value = ""; //text
    hbox.childNodes[2].childNodes[1].childNodes[0].selectedIndex = 0; //more/less
    hbox.childNodes[2].childNodes[1].childNodes[1].selectedIndex = 0; //1-100
    hbox.childNodes[2].childNodes[1].childNodes[2].selectedIndex = 0; //sec, min,...
    hbox.childNodes[2].childNodes[2].childNodes[0].selectedIndex = 0; //more/less
    hbox.childNodes[2].childNodes[2].childNodes[1].selectedIndex = 0; //1-50
}

//-----------------------------------------------------------------------------------------------------
function processCategories()
{
  try
  {
    window.clearTimeout(gRssTimeout);
    gRssTimeout = null;

    var fm = new FeedManager();
    fm.parse(gRssXmlHttpRequest);
    gRssXmlHttpRequest = null;
    initListCategories(fm.getListOfCategories());
  }
  catch(e)
  {
    inforssDebug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function makeCurrent()
{
  try
  {
    var items = RSSList.getElementsByTagName("RSS");
    for (var i = 0; i < items.length ; i++)
    {
      if (items[i].getAttribute("url") == currentRSS.getAttribute("url"))
      {
        items[i].setAttribute("selected", "true");
      }
      else
      {
        items[i].setAttribute("selected", "false");
      }
    }
    if (currentRSS != null)
    {
      document.getElementById("inforss.make.current").setAttribute("disabled", "true");
      document.getElementById("inforss.make.current.background").style.backgroundColor = "rgb(192,255,192)";
    }
    makeCurrentInvoked = true;
  }
  catch(e)
  {
    inforssDebug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function parseHtml()
{
  try
  {
    window.openDialog("chrome://inforss/content/inforssParseHtml.xul","_blank","chrome,centerscreen,resizable=yes, dialog=yes", currentRSS.getAttribute("url"), currentRSS.getAttribute("user"),
                      currentRSS.getAttribute("regexp"), currentRSS.getAttribute("regexpTitle"),
                      currentRSS.getAttribute("regexpDescription"), currentRSS.getAttribute("regexpPubDate"),
                      currentRSS.getAttribute("regexpLink"), currentRSS.getAttribute("regexpCategory"),
                      currentRSS.getAttribute("regexpStartAfter"), currentRSS.getAttribute("regexpStopBefore"),
                      currentRSS.getAttribute("htmlDirection"), currentRSS.getAttribute("encoding"),
                      currentRSS.getAttribute("htmlTest"));
  }
  catch(e)
  {
    inforssDebug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function processRss()
{
  try
  {
    window.clearTimeout(gRssTimeout);
    gRssTimeout = null;

    var fm = new FeedManager();
    fm.parse(gRssXmlHttpRequest);
    var rss = RSSList.createElement("RSS");
    rss.setAttribute("title",fm.title);
    rss.setAttribute("description",fm.description);
    rss.setAttribute("url", gRssXmlHttpRequest.url);
    rss.setAttribute("link",fm.link);
    rss.setAttribute("type",fm.type);
    rss.setAttribute("icon", inforssFindIcon(rss));

    rss.setAttribute("filterPolicy","0");

    rss.setAttribute("selected","false");
    rss.setAttribute("nbItem", RSSList.firstChild.getAttribute("defaultNbItem"));
    rss.setAttribute("lengthItem", RSSList.firstChild.getAttribute("defaultLenghtItem"));
    rss.setAttribute("playPodcast", RSSList.firstChild.getAttribute("defaultPlayPodcast"));
    rss.setAttribute("purgeHistory", RSSList.firstChild.getAttribute("defaultPurgeHistory"));
    rss.setAttribute("savePodcastLocation", RSSList.firstChild.getAttribute("savePodcastLocation"));
    rss.setAttribute("browserHistory", RSSList.firstChild.getAttribute("defaultBrowserHistory"));
    rss.setAttribute("refresh",RSSList.firstChild.getAttribute("refresh"));
    rss.setAttribute("user",gRssXmlHttpRequest.user);
    if ((gRssXmlHttpRequest.password != null) && (gRssXmlHttpRequest.password != ""))
    {
    	inforssXMLRepository.storePassword(gRssXmlHttpRequest.url, gRssXmlHttpRequest.user, gRssXmlHttpRequest.password);
    }
//    rss.setAttribute("password", gRssXmlHttpRequest.password);
    rss.setAttribute("filter","all");
    rss.setAttribute("filterCaseSensitive","true");
    rss.setAttribute("activity", "true");
    rss.setAttribute("encoding", "");

    RSSList.firstChild.appendChild(rss);
    var element = document.getElementById("rss-select-menu").appendItem(fm.title, "newrss");
    element.setAttribute("class","menuitem-iconic");
    element.setAttribute("image",rss.getAttribute("icon"));
    element.setAttribute("url", gRssXmlHttpRequest.url);
    document.getElementById("rss-select-menu").selectedIndex = gNbRss;
    gNbRss++;
    gRssXmlHttpRequest = null;
    addRssToVbox(rss);
    selectRSS(element);
    document.getElementById("inforss.new.feed").setAttribute("disabled","false");


    document.getElementById("inforss.feed.row1").setAttribute("selected","false");
    document.getElementById("inforss.feed.row1").setAttribute("url",rss.getAttribute("url"));
    document.getElementById("inforss.feed.treecell1").setAttribute("properties",(rss.getAttribute("activity") == "true")? "on" : "off");
    document.getElementById("inforss.feed.treecell2").setAttribute("properties", "unactive");
    document.getElementById("inforss.feed.treecell3").setAttribute("label", "" );
    document.getElementById("inforss.feed.treecell4").setAttribute("label", "" );
    document.getElementById("inforss.feed.treecell5").setAttribute("label", "" );
    document.getElementById("inforss.feed.treecell6").setAttribute("label", "" );
    document.getElementById("inforss.feed.treecell7").setAttribute("label", "" );
    document.getElementById("inforss.feed.treecell8").setAttribute("label", "N");

  }
  catch(e)
  {
    inforssDebug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function processHtml()
{
  try
  {
    window.clearTimeout(gRssTimeout);
    gRssTimeout = null;
    if ((gRssXmlHttpRequest.readyState == 4) && (gRssXmlHttpRequest.status == 200))
    {
      var rss = RSSList.createElement("RSS");
      rss.setAttribute("title", gRssXmlHttpRequest.title);
      rss.setAttribute("description", gRssXmlHttpRequest.title);
      rss.setAttribute("url", gRssXmlHttpRequest.url);
      rss.setAttribute("link", gRssXmlHttpRequest.url);
      rss.setAttribute("type","html");
      rss.setAttribute("icon", inforssFindIcon(rss));
      if (gRssXmlHttpRequest.feedType == "search")
      {
         rss.setAttribute("regexp", gRssXmlHttpRequest.regexp);
         rss.setAttribute("regexpTitle", gRssXmlHttpRequest.regexpTitle);
         rss.setAttribute("regexpDescription", gRssXmlHttpRequest.regexpDescription);
         rss.setAttribute("regexpLink", gRssXmlHttpRequest.regexpLink);
         rss.setAttribute("regexpStartAfter", gRssXmlHttpRequest.regexpStartAfter);
         rss.setAttribute("htmlDirection", gRssXmlHttpRequest.htmlDirection);        
         rss.setAttribute("htmlTest", gRssXmlHttpRequest.htmlTest);        
      }
      rss.setAttribute("filterPolicy","0");

      rss.setAttribute("selected","false");
      rss.setAttribute("nbItem", RSSList.firstChild.getAttribute("defaultNbItem"));
      rss.setAttribute("lengthItem", RSSList.firstChild.getAttribute("defaultLenghtItem"));
      rss.setAttribute("playPodcast", RSSList.firstChild.getAttribute("defaultPlayPodcast"));
      rss.setAttribute("purgeHistory", RSSList.firstChild.getAttribute("defaultPurgeHistory"));
      rss.setAttribute("savePodcastLocation", RSSList.firstChild.getAttribute("savePodcastLocation"));
      rss.setAttribute("browserHistory", RSSList.firstChild.getAttribute("defaultBrowserHistory"));
      rss.setAttribute("refresh",RSSList.firstChild.getAttribute("refresh"));
      rss.setAttribute("user",gRssXmlHttpRequest.user);
      rss.setAttribute("filter","all");
      rss.setAttribute("filterCaseSensitive","true");
      rss.setAttribute("activity", "true");
      rss.setAttribute("encoding", "");

      RSSList.firstChild.appendChild(rss);
      var element = document.getElementById("rss-select-menu").appendItem(gRssXmlHttpRequest.title, "newrss");
      element.setAttribute("class","menuitem-iconic");
      element.setAttribute("image",rss.getAttribute("icon"));
      element.setAttribute("url", gRssXmlHttpRequest.url);
      document.getElementById("rss-select-menu").selectedIndex = gNbRss;
      gNbRss++;
      gRssXmlHttpRequest = null;
      addRssToVbox(rss);
      selectRSS(element);
    }
    else
    {
      alert(document.getElementById("bundle_inforss").getString("inforss.feed.issue"));
    }
    document.getElementById("inforss.new.feed").setAttribute("disabled","false");


    document.getElementById("inforss.feed.row1").setAttribute("selected","false");
    document.getElementById("inforss.feed.row1").setAttribute("url",rss.getAttribute("url"));
    document.getElementById("inforss.feed.treecell1").setAttribute("properties",(rss.getAttribute("activity") == "true")? "on" : "off");
    document.getElementById("inforss.feed.treecell2").setAttribute("properties", "unactive");
    document.getElementById("inforss.feed.treecell3").setAttribute("label", "" );
    document.getElementById("inforss.feed.treecell4").setAttribute("label", "" );
    document.getElementById("inforss.feed.treecell5").setAttribute("label", "" );
    document.getElementById("inforss.feed.treecell6").setAttribute("label", "" );
    document.getElementById("inforss.feed.treecell7").setAttribute("label", "" );
    document.getElementById("inforss.feed.treecell8").setAttribute("label", "N");

  }
  catch(e)
  {
    inforssDebug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function initListCategories(listCategory)
{
  try
  {
    if (listCategory == null)
    {
      listCategory = new Array();
    }
    if (listCategory.length == 0)
    {
      listCategory.push(document.getElementById("bundle_inforss").getString("inforss.nocategory"));
    }
    var vbox = document.getElementById("inforss.filter.vbox");
    var hbox = vbox.childNodes[3]; // first filter
    var menu = hbox.childNodes[2].childNodes[0].childNodes[1]; //text
    for (var i=0; i<listCategory.length; i++)
    {
      var newElem = document.createElement("menuitem");
      newElem.setAttribute("label", listCategory[i]);
	  menu.firstChild.appendChild(newElem);
    }
    initFilter();
  }
  catch(e)
  {
    inforssDebug(e);
  }
}


//-----------------------------------------------------------------------------------------------------
function initFilter()
{
  try
  {
    if (currentRSS != null)
    {
      var items = currentRSS.getElementsByTagName("FILTER");
      var vbox = document.getElementById("inforss.filter.vbox");
      var hbox = vbox.childNodes[3]; // first filter
      for (var i = 0; i < items.length; i++)
      {
        var checkbox = hbox.childNodes[0];
        var type = hbox.childNodes[1];
        var deck = hbox.childNodes[2];

        checkbox.setAttribute("checked", items[i].getAttribute("active"));
        type.selectedIndex = items[i].getAttribute("type");
        deck.selectedIndex = (type.selectedIndex <= 2)? 0 : ((type.selectedIndex <= 5)? 1 : 2);
        deck.childNodes[0].childNodes[0].selectedIndex = items[i].getAttribute("include");
        deck.childNodes[0].childNodes[1].value = items[i].getAttribute("text");
        deck.childNodes[1].childNodes[0].selectedIndex = items[i].getAttribute("compare");
        deck.childNodes[1].childNodes[1].selectedIndex = items[i].getAttribute("elapse");
        deck.childNodes[1].childNodes[2].selectedIndex = items[i].getAttribute("unit");
        deck.childNodes[2].childNodes[0].selectedIndex = items[i].getAttribute("hlcompare");
        deck.childNodes[2].childNodes[1].selectedIndex = items[i].getAttribute("nb");
        if (checkbox.getAttribute("checked") == "false")
        {
          changeStatusFilter1(hbox, "true");
        }
        if (i != (items.length - 1))
        {
          hbox = addFilter(checkbox);
        }
      }
      var max = gNbRss - 1;
      if (document.getElementById("rss-select-menu").selectedIndex == 0)
      {
        document.getElementById("inforss.previous.rss").setAttribute("disabled", true);
      }
      else
      {
        document.getElementById("inforss.previous.rss").setAttribute("disabled", false);
      }
      if (document.getElementById("rss-select-menu").selectedIndex == max)
      {
        document.getElementById("inforss.next.rss").setAttribute("disabled", true);
      }
      else
      {
        document.getElementById("inforss.next.rss").setAttribute("disabled", false);
      }
      document.getElementById("inforss.new.feed").setAttribute("disabled","false");
    }
  }
  catch(e)
  {
    inforssDebug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function rssCategoryTimeout()
{
  try
  {
    initListCategories(null);
    gRssTimeout = null;
    if (gRssXmlHttpRequest != null)
    {
      gRssXmlHttpRequest.abort();
      gRssXmlHttpRequest = null;
    }
  }
  catch(e)
  {
    inforssDebug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function rssTimeout()
{
  try
  {
    if (gRssTimeout != null)
    {
      try
      {
        window.clearTimeout(gRssTimeout);
        gRssTimeout = null;
      }
      catch(e)
      {
      }
    }
    if (gRssXmlHttpRequest != null)
    {
      gRssXmlHttpRequest.abort();
      gRssXmlHttpRequest = null;
    }
    document.getElementById("inforss.new.feed").setAttribute("disabled","false");
    alert(document.getElementById("bundle_inforss").getString("inforss.feed.issue"));
  }
  catch(e)
  {
    inforssDebug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function inforssGetItemFromUrl(url)
{
  var items = RSSList.getElementsByTagName("RSS");
  var find = false;
  var i = 0;
  while ((i < items.length) && (find == false))
  {
    if (items[i].getAttribute("url") == url)
    {
      find = true;
    }
    else
    {
      i++;
    }
  }
  return (find == true)? items[i] : null;
}

//-----------------------------------------------------------------------------------------------------
function resetRepository()
{
  if (confirm(document.getElementById("bundle_inforss").getString("inforss.reset.repository")))
  {
    inforssRestoreRepository();
    var observerService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
    observerService.notifyObservers(null,"rssChanged","total");
    init();
  }
}

//-----------------------------------------------------------------------------------------------------
function sendEventToMainWindow()
{
  var observerService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
  observerService.notifyObservers(null,"rssChanged","total");
}


//-----------------------------------------------------------------------------------------------------
function clearRdf()
{
  if (confirm(document.getElementById("bundle_inforss").getString("inforss.reset.rdf")))
  {
    var observerService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
    observerService.notifyObservers(null,"clearRdf","");
  }
}

//-----------------------------------------------------------------------------------------------------
function exportLivemark()
{
  try
  {
    kRDFRSCIID       = Components.interfaces.nsIRDFResource;
    kRDFLITIID       = Components.interfaces.nsIRDFLiteral;
    RDF              = Components.classes["@mozilla.org/rdf/rdf-service;1"].getService(Components.interfaces.nsIRDFService);
    RDFC             = Components.classes["@mozilla.org/rdf/container;1"].createInstance(Components.interfaces.nsIRDFContainer);

    BMDS  = RDF.GetDataSource("rdf:bookmarks");
    BMSVC = BMDS.QueryInterface(Components.interfaces.nsIBookmarksService);
//    BookmarkTransaction.prototype.RDFC = RDFC;
//    BookmarkTransaction.prototype.BMDS = BMDS;

    RDFCU            = Components.classes["@mozilla.org/rdf/container-utils;1"].getService(Components.interfaces.nsIRDFContainerUtils);

    var urlPredicateResource = RDF.GetResource("http://home.netscape.com/NC-rdf#Name");
    var urlTargetLiteral = RDF.GetLiteral("InfoRSS Feeds");
    var mainFolder = BMDS.GetSource(urlPredicateResource, urlTargetLiteral, true);
    if ( mainFolder != null)
    {
      RDFC.Init(BMDS, RDF.GetResource("NC:BookmarksRoot"));
      RDFC.RemoveElement(mainFolder, false);
    }
    var new_folder = BMSVC.createFolderInContainer("InfoRSS Feeds", RDF.GetResource("NC:BookmarksRoot"), null);
    var predicateType = RDF.GetResource("http://www.w3.org/1999/02/22-rdf-syntax-ns#type");
    var predicateFeedURL = RDF.GetResource("http://home.netscape.com/NC-rdf#FeedURL");
    var predicateURL = RDF.GetResource("http://home.netscape.com/NC-rdf#URL");
    var predicateDescription = RDF.GetResource("http://home.netscape.com/NC-rdf#Description");
    var predicateName = RDF.GetResource("http://home.netscape.com/NC-rdf#Name");

    var items = RSSList.getElementsByTagName("RSS");
    for (var i=0; i < items.length; i++)
    {
      if ((items[i].getAttribute("type") == "rss") || (items[i].getAttribute("type") == "atom"))
      {
        var feed = BMSVC.createFolderInContainer(items[i].getAttribute("title"), new_folder, null);

        var newValue = RDF.GetResource("http://home.netscape.com/NC-rdf#Livemark");
        BMDS.Change(feed, predicateType, {}, newValue);

        newValue = RDF.GetLiteral(items[i].getAttribute("title"));
        BMDS.Change(feed, predicateName, {}, newValue);

        newValue = RDF.GetLiteral(items[i].getAttribute("link"));
        BMDS.Change(feed, predicateURL, {}, newValue);

        newValue = RDF.GetLiteral(items[i].getAttribute("url"));
        BMDS.Change(feed, predicateFeedURL, {}, newValue);

        newValue = RDF.GetLiteral(items[i].getAttribute("description"));
        BMDS.Change(feed, predicateDescription, {}, newValue);
      }
    }
    alert(document.getElementById("bundle_inforss").getString("inforss.export.livemark"));
  }
  catch(e)
  {
    inforssDebug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function exportBrowser()
{
  try
  {
    var topMostBrowser = getTopMostBrowser();
    if (topMostBrowser != null)
    {
//      netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect");
      var file = file=Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).get("ProfD", Components.interfaces.nsIFile);
      file.append(INFORSS_REPOSITORY);
      if ( file.exists() == true )
      {
        topMostBrowser.addTab("file:///" + file.path);
      }
    }
  }
  catch(e)
  {
    inforssDebug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function getTopMostBrowser()
{
	var topMostBrowser = null;
	var windowManager = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator);
	var topMostWindow = windowManager.getMostRecentWindow("navigator:browser");
	if (topMostWindow)
	{
	  topMostBrowser = topMostWindow.document.getElementById('content');
	}
	return topMostBrowser;
}

//-----------------------------------------------------------------------------------------------------
function changeFilterType(obj)
{
  obj.nextSibling.selectedIndex = ((obj.selectedIndex <= 2)? 0 : ((obj.selectedIndex <= 5)? 1 : 2));
}

//-----------------------------------------------------------------------------------------------------
function addFilter(obj)
{
  var hbox = null;
  try
  {
    if (currentRSS == null)
    {
      alert(document.getElementById("bundle_inforss").getString("inforss.rss.selectfirst"));
    }
    else
    {
      hbox = obj.parentNode.cloneNode(true);
      obj.parentNode.parentNode.appendChild(hbox);
      hbox.childNodes[0].setAttribute("checked","true");
      hbox.childNodes[2].childNodes[0].childNodes[1].value = ""; //text
      changeStatusFilter1(hbox, "false");
    }
  }
  catch(e)
  {
    inforssDebug(e);
  }
  return hbox;
}

//-----------------------------------------------------------------------------------------------------
function removeFilter(obj)
{
  try
  {
    if (currentRSS == null)
    {
      alert(document.getElementById("bundle_inforss").getString("inforss.rss.selectfirst"));
    }
    else
    {
      if (obj.parentNode.parentNode.childNodes.length == 4)
      {
        alert(document.getElementById("bundle_inforss").getString("inforss.remove.last"));
      }
      else
      {
        obj.parentNode.parentNode.removeChild(obj.parentNode);
      }
    }
  }
  catch(e)
  {
    inforssDebug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function changeStatusFilter(button)
{
  var hbox = button.parentNode;
  var status = (button.getAttribute("checked") == "true")? "true" : "false";
  changeStatusFilter1(hbox, status);
}

//-----------------------------------------------------------------------------------------------------
function changeStatusFilter1(hbox, status)
{
  hbox.childNodes[1].setAttribute("disabled", status); //type
  hbox.childNodes[2].setAttribute("disabled", status); //deck
  hbox.childNodes[2].childNodes[0].childNodes[0].setAttribute("disabled", status); //include/exclude
  if (status == "true")
  {
    hbox.childNodes[2].childNodes[0].childNodes[1].setAttribute("disabled", status); //text
  }
  else
  {
    if (hbox.childNodes[2].childNodes[0].childNodes[1].hasAttribute("disabled"))
    {
      hbox.childNodes[2].childNodes[0].childNodes[1].removeAttribute("disabled");
    }
  }
  hbox.childNodes[2].childNodes[1].childNodes[0].setAttribute("disabled", status); //more/less
  hbox.childNodes[2].childNodes[1].childNodes[1].setAttribute("disabled", status); //1-100
  hbox.childNodes[2].childNodes[1].childNodes[2].setAttribute("disabled", status); //sec, min,...
  hbox.childNodes[2].childNodes[2].childNodes[0].setAttribute("disabled", status); //more/less
  hbox.childNodes[2].childNodes[2].childNodes[1].setAttribute("disabled", status); //1-50
}

//-----------------------------------------------------------------------------------------------------
function closeOptionDialog()
{
  inforssTraceIn();
  document.getElementById("inforssOption").cancelDialog();
  inforssTraceOut();
}

//-----------------------------------------------------------------------------------------------------
function setHtmlFeed(url, regexp, headline, article, pubdate, link, category, startafter, stopbefore, direction, encoding, htmlTest)
{
  inforssTraceIn();
  try
  {
    currentRSS.setAttribute("url", url);
    currentRSS.setAttribute("regexp", regexp);
    currentRSS.setAttribute("regexpTitle", headline);
    currentRSS.setAttribute("regexpDescription", article);
    currentRSS.setAttribute("regexpPubDate", pubdate);
    currentRSS.setAttribute("regexpLink", link);
    currentRSS.setAttribute("regexpCategory", category);
    currentRSS.setAttribute("regexpStartAfter", startafter);
    currentRSS.setAttribute("regexpStopBefore", stopbefore);
    currentRSS.setAttribute("htmlDirection", direction);
    currentRSS.setAttribute("encoding", encoding);
    currentRSS.setAttribute("htmlTest", htmlTest);
    document.getElementById('optionUrl').value = url;
  }
  catch(e)
  {
    inforssDebug(e);
  }
  inforssTraceOut();
}

//-----------------------------------------------------------------------------------------------------
function resetIcon()
{
  inforssTraceIn();
  try
  {
    if (currentRSS != null)
    {
      document.getElementById('iconurl').value = inforssFindIcon(currentRSS);
      document.getElementById('inforss.rss.icon').src = document.getElementById('iconurl').value;
    }
  }
  catch(e)
  {
    inforssDebug(e);
  }
  inforssTraceOut();
}

//-----------------------------------------------------------------------------------------------------
function resetIconGroup()
{
  inforssTraceIn();
  try
  {
    if (currentRSS != null)
    {
      document.getElementById('iconurlgroup').value = inforssXMLRepository.getDefaultGroupIcon();
      document.getElementById('inforss.group.icon').src = document.getElementById('iconurlgroup').value;
    }
  }
  catch(e)
  {
    inforssDebug(e);
  }
  inforssTraceOut();
}

//-----------------------------------------------------------------------------------------------------
function resetDefaultIconGroup()
{
  inforssTraceIn();
  try
  {
    document.getElementById('defaultGroupIcon').value = INFORSS_DEFAULT_GROUP_ICON;
    document.getElementById('inforss.defaultgroup.icon').src = document.getElementById('defaultGroupIcon').value;
  }
  catch(e)
  {
    inforssDebug(e);
  }
  inforssTraceOut();
}

//-----------------------------------------------------------------------------------------------------
function setIcon()
{
  inforssTraceIn();
  try
  {
    document.getElementById('inforss.rss.icon').src = document.getElementById('iconurl').value;
  }
  catch(e)
  {
    inforssDebug(e);
  }
  inforssTraceOut();
}

//-----------------------------------------------------------------------------------------------------
function updateCanvas()
{
//dump("updateCanvas\n");
  inforssTraceIn();
  try
  {
    var br = document.getElementById("inforss.canvas.browser");
        
    var canvas = document.getElementById("inforss.canvas");
    var ctx = canvas.getContext("2d");
    ctx.drawWindow(br.contentWindow, 0, 0, 800, 600, "rgb(255,255,255)");
    refreshCount++;
    if (refreshCount != 5)
    {
      window.setTimeout(updateCanvas, 2000);
    }
    else
    {
      br.setAttribute("collapsed", "true");
    }
  }
  catch(e)
  {
    inforssDebug(e);
  }
  inforssTraceOut();
}

//-----------------------------------------------------------------------------------------------------
function canvasOver(event)
{
//dump("canvasOver\n");
  inforssTraceIn();
  try
  {
    var canvas1 = document.getElementById("inforss.canvas");
    var canvas = document.getElementById("inforss.magnify.canvas");
    var newx = eval(event.clientX - canvas1.offsetLeft) + 12;
    var newy = eval(event.clientY - canvas1.offsetTop) + 18;
//dump("1=" + newx + "\n");
//dump("2=" + parseInt(canvas1.style.width) + "\n");
//dump("3=" + parseInt(canvas.getAttribute("width")) + "\n");
    if (newx > (parseInt(canvas1.style.width) - parseInt(canvas.getAttribute("width")) - 2))
    {
      newx = parseInt(canvas1.style.width) - parseInt(canvas.getAttribute("width")) - 2;
    }
    if (newy > (parseInt(canvas1.style.height) - parseInt(canvas.getAttribute("height")) -5))
    {
      newy = parseInt(canvas1.style.height) - parseInt(canvas.getAttribute("height")) - 5;
    }
    document.getElementById("inforss.magnify").setAttribute("left", newx + "px");
    document.getElementById("inforss.magnify").setAttribute("top", newy + "px");
    document.getElementById("inforss.magnify").style.left = newx + "px";
    document.getElementById("inforss.magnify").style.top = newy + "px";
    try
    {
      var ctx = canvas.getContext("2d");
      var br = document.getElementById("inforss.canvas.browser");
      ctx.drawWindow(br.contentWindow, 0, 0, 800, 600, "rgb(255,255,255)");
      document.getElementById("inforss.magnify").style.visibility = "visible";
    }
    catch(e1) {}
  }
  catch(e)
  {
    inforssDebug(e);
  }
  inforssTraceOut();
}

//-----------------------------------------------------------------------------------------------------
function canvasOut()
{
//dump("canvasOut\n");
  inforssTraceIn();
  try
  {
    document.getElementById("inforss.magnify").style.visibility = "hidden";
  }
  catch(e)
  {
    inforssDebug(e);
  }
  inforssTraceOut();
}

//-----------------------------------------------------------------------------------------------------
function canvasMove(event)
{
//dump("canvasMove\n");
  inforssTraceIn();
  try
  {
    var br = document.getElementById("inforss.canvas.browser");

        
    var canvas = document.getElementById("inforss.magnify.canvas");
    var canvas1 = document.getElementById("inforss.canvas");
    var newx1 = eval(event.clientX - canvas1.offsetLeft);
    var newy1 = eval(event.clientY - canvas1.offsetTop);
    var newx = newx1 + 12;
    var newy = newy1 + 18;
    if (newx > (parseInt(canvas1.style.width) - parseInt(canvas.getAttribute("width")) - 2))
    {
      newx = parseInt(canvas1.style.width) - parseInt(canvas.getAttribute("width")) - 2;
    }
    if (newy > (parseInt(canvas1.style.height) - parseInt(canvas.getAttribute("height")) -5))
    {
      newy = parseInt(canvas1.style.height) - parseInt(canvas.getAttribute("height")) - 5;
    }
    try
    {
      var ctx = canvas.getContext("2d");
//dump("left=" + (newx + 20) + "\n");
      document.getElementById("inforss.magnify").setAttribute("left", newx + "px");
      document.getElementById("inforss.magnify").setAttribute("top", newy + "px");
      document.getElementById("inforss.magnify").style.left = newx + "px";
      document.getElementById("inforss.magnify").style.top = newy + "px";
      ctx.save();
      ctx.translate(-((newx1 * 4.5) - 15), -((newy1 * 5.0) - 15));
      ctx.drawWindow(br.contentWindow, 0, 0, 800, 600, "rgb(255,255,255)");
      ctx.restore();
    }
    catch(e1) {}
  }
  catch(e)
  {
    inforssDebug(e);
  }
  inforssTraceOut();
}
	
//-----------------------------------------------------------------------------------------------------
function setIconGroup()
{
  inforssTraceIn();
  try
  {
    document.getElementById('inforss.group.icon').src = document.getElementById('iconurlgroup').value;
  }
  catch(e)
  {
    inforssDebug(e);
  }
  inforssTraceOut();
}

//-----------------------------------------------------------------------------------------------------
function setDefaultIconGroup()
{
  inforssTraceIn();
  try
  {
    document.getElementById('inforss.defaultgroup.icon').src = document.getElementById('defaultGroupIcon').value;
  }
  catch(e)
  {
    inforssDebug(e);
  }
  inforssTraceOut();
}

//-----------------------------------------------------------------------------------------------------
function copyLocalToRemote()
{
  inforssTraceIn();
  try
  {
    if (checkServerInfoValue() == true)
    {
      var protocol = document.getElementById('inforss.repo.urltype').value;
      var server = document.getElementById('ftpServer').value;
      var directory = document.getElementById('repoDirectory').value;
      var user = document.getElementById('repoLogin').value;
      var password = document.getElementById('repoPassword').value;
      setImportProgressionBar(20);
      window.setTimeout(inforssCopyLocalToRemote, 100, protocol, server, directory, user, password, ftpUploadCallback, true);
    }
  }
  catch(e)
  {
    inforssDebug(e);
  }
  inforssTraceOut();
}

//-----------------------------------------------------------------------------------------------------
function copyRemoteToLocal()
{
  inforssTraceIn();
  try
  {
    if (checkServerInfoValue() == true)
    {
      var protocol = document.getElementById('inforss.repo.urltype').value;
      var server = document.getElementById('ftpServer').value;
      var directory = document.getElementById('repoDirectory').value;
      var user = document.getElementById('repoLogin').value;
      var password = document.getElementById('repoPassword').value;
      setImportProgressionBar(10);
      window.setTimeout(inforssCopyRemoteToLocal, 100, protocol, server, directory, user, password, ftpDownloadCallback);
    }
  }
  catch(e)
  {
    inforssDebug(e);
  }
  inforssTraceOut();
}

//-----------------------------------------------------------------------------------------------------
function checkServerInfoValue()
{
  inforssTraceIn();
  var returnValue = true;
  try
  {
    if ((document.getElementById('ftpServer').value == null) ||
        (document.getElementById('ftpServer').value == "") ||
        (document.getElementById('repoDirectory').value == null) ||
        (document.getElementById('repoDirectory').value == "") ||
        (document.getElementById('repoLogin').value == null) ||
        (document.getElementById('repoLogin').value == "") ||
        (document.getElementById('repoPassword').value == null) ||
        (document.getElementById('repoPassword').value == ""))
    {
      returnValue = false;
      alert(document.getElementById("bundle_inforss").getString("inforss.serverinfo.mandatory"));
    }
  }
  catch(e)
  {
    inforssDebug(e);
  }
  inforssTraceOut();
  return returnValue;
}

//-----------------------------------------------------------------------------------------------------
function ftpUploadCallback(step, status)
{
  inforssTraceIn();
  var returnValue = true;
  try
  {
    if (step == "send")
    {
      defineVisibilityButton("true", "upload");
    }
    else
    {
      setImportProgressionBar(100);
      defineVisibilityButton("false", "upload");
    }
  }
  catch(e)
  {
    inforssDebug(e);
  }
  inforssTraceOut();
}

//-----------------------------------------------------------------------------------------------------
function ftpDownloadCallback(step, status)
{
  inforssTraceIn();
  var returnValue = true;
  try
  {
    if (step == "send")
    {
      defineVisibilityButton("true", "download");
    }
    else
    {
      setImportProgressionBar(80);
      defineVisibilityButton("false", "download");
      init(false);
      var observerService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
      observerService.notifyObservers(null, "newRDF", null);
      observerService = null;
      setImportProgressionBar(100);
    }
  }
  catch(e)
  {
    inforssDebug(e);
  }
  inforssTraceOut();
}

//-----------------------------------------------------------------------------------------------------
function defineVisibilityButton(flag, action)
{
  inforssTraceIn();
  try
  {
      var accept = document.getElementById('inforssOption').getButton("accept");
      accept.setAttribute("disabled", flag);
      var apply = document.getElementById('inforss.apply');
      apply.setAttribute("disabled", flag);
      if (action == "download")
      {
        document.getElementById("inforss.deck.importfromremote").selectedIndex = (flag == "true")? 1 : 0;
      }
      else
      {
        document.getElementById("inforss.deck.exporttoremote").selectedIndex = (flag == "true")? 1 : 0;
      }
      setImportProgressionBar(0);
  }
  catch(e)
  {
    inforssDebug(e);
  }
  inforssTraceOut();
}

//-----------------------------------------------------------------------------------------------------
function setImportProgressionBar(value)
{
  inforssTraceIn();
  try
  {
    if (document.getElementById("inforss.repo.synchronize.importfromremote.importProgressBar") != null)
    {
      document.getElementById("inforss.repo.synchronize.importfromremote.importProgressBar").value = value;
    }
    if (document.getElementById("inforss.repo.synchronize.exporttoremote.exportProgressBar") != null)
    {
      document.getElementById("inforss.repo.synchronize.exporttoremote.exportProgressBar").value = value;
    }
  }
  catch(e)
  {
    inforssDebug(e);
  }
  inforssTraceOut();
}

//-----------------------------------------------------------------------------------------------------
function purgeNow()
{
  inforssTraceIn();
  try
  {
    var observerService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
    observerService.notifyObservers(null,"purgeRdf",null);
    observerService = null;
  }
  catch(e)
  {
    inforssDebug(e);
  }
  inforssTraceOut();
}

//-----------------------------------------------------------------------------------------------------
function openURL(url)
{
  if ((navigator.vendor == "Thunderbird") || (navigator.vendor == "Linspire Inc."))
  {
    window.openDialog("chrome://inforss/content/inforssBrowser.xul","_blank","chrome,centerscreen,resizable=yes, dialog=no", url);
  }
  else
  {
    if (window.opener.getBrowser)
    {
	  if (testCreateTab() == true)
	  {
        var newTab = window.opener.getBrowser().addTab(url);
        window.opener.getBrowser().selectedTab = newTab;
      }
      else
      {
        window.opener.getBrowser().loadURI(url);
	  }
    }
    else
    {
      window.opener.open(url);
    }
  }
}

//-----------------------------------------------------------------------------------------------------
function testCreateTab()
{
    var returnValue = true;
    if (window.opener.getBrowser().browsers.length == 1)
    {
      if ((window.opener.getBrowser().currentURI == null) ||
          ((window.opener.getBrowser().currentURI.spec == "") && (window.opener.getBrowser().selectedBrowser.webProgress.isLoadingDocument == true)) ||
          (window.opener.getBrowser().currentURI.spec == "about:blank"))
      {
        returnValue = false;
      }
    }
    return returnValue;
}

//-----------------------------------------------------------------------------------------------------
function locateExportEnclosure(suf1, suf2)
{
  var dirPath = null;
  try
  {
    var dirPicker = Components.classes["@mozilla.org/filepicker;1"].createInstance(Components.interfaces.nsIFilePicker);
    dirPicker.init(window, document.getElementById("bundle_inforss").getString("inforss.podcast.location"), dirPicker.modeGetFolder);
//    dirPicker.defaultString = OPML_FILENAME;
//    dirPicker.appendFilter("", "*.rdf");
//    dirPicker.appendFilters(Components.interfaces.nsIFilePicker.filterXML);
//    filePicker.appendFilters(Components.interfaces.nsIFilePicker.filterAll);

    var response = dirPicker.show();
    if ((response == dirPicker.returnOK) || (response == dirPicker.returnReplace))
    {
	  dirPath = dirPicker.file.path;
      document.getElementById("savePodcastLocation" + suf2).value = dirPath;
      document.getElementById("savePodcastLocation" + suf1).selectedIndex = 0;
    }
  }
  catch(e)
  {
    inforssDebug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function viewAllViewSelected(flag)
{
  try
  {
    var listbox = document.getElementById("group-list-rss");
    var listitem = null;
    var checkbox = null;
    for (var i=1; i < listbox.childNodes.length; i++)
    {
      listitem = listbox.childNodes[i];
      if (flag == true)
      {
		listitem.setAttribute("collapsed", "false");
	  }
	  else
	  {
        checkbox = listitem.childNodes[0];
        if (checkbox.getAttribute("checked") == "true")
        {
		  listitem.setAttribute("collapsed", "false");
		}
		else
		{
		  listitem.setAttribute("collapsed", "true");
		}
	  }
    }
  }
  catch(e)
  {
    inforssDebug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function addToPlayList()
{
  try
  {
    var listbox = document.getElementById("group-list-rss");
//alert("step1");
    if (listbox.selectedItem != null)
    {
//alert("step2");
      if (listbox.selectedItem.childNodes[0].getAttribute("checked") == "false")
      {
        listbox.selectedItem.childNodes[0].setAttribute("checked", "true");
      }
      addToPlayList1("5",
                     listbox.selectedItem.childNodes[1].getAttribute("image"),
                     listbox.selectedItem.childNodes[1].getAttribute("label"),
                     listbox.selectedItem.childNodes[1].getAttribute("url"));
//alert("step4");
    }
  }
  catch(e)
  {
    inforssDebug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function addToPlayList1(value, image, label, url)
{
//alert("value=" + value);
//alert("image=" + image);
//alert("label=" + label);
//alert("url=" + url);
  try
  {
      var richlistitem = document.createElement("richlistitem");
      var hbox = document.createElement("hbox");
      var input = document.createElement("textbox");
      input.setAttribute("value", value);
      input.style.maxWidth = "30px";
//      input.style.minHeight = "20px";
//      input.style.height = "35px";
//      richlistitem.style.minHeight = "35px";
//      richlistitem.style.height = "35px";
//      hbox.style.minHeight = "35px";
//      hbox.style.height = "35px";
      hbox.appendChild(input);
      var vbox = document.createElement("vbox");
      var spacer = document.createElement("spacer");
      spacer.setAttribute("flex", "1");
      vbox.appendChild(spacer);
      var image1 = document.createElement("image");
      image1.setAttribute("src", image);
      image1.style.maxWidth = "16px";
      image1.style.maxHeight = "16px";
      vbox.appendChild(image1);
      spacer = document.createElement("spacer");
      spacer.setAttribute("flex", "1");
      vbox.appendChild(spacer);
      hbox.appendChild(vbox);
      
      vbox = document.createElement("vbox");
      var spacer = document.createElement("spacer");
      spacer.setAttribute("flex", "1");
      vbox.appendChild(spacer);
      var label1 = document.createElement("label");
      label1.setAttribute("value", label);
      vbox.appendChild(label1);
      spacer = document.createElement("spacer");
      spacer.setAttribute("flex", "1");
      vbox.appendChild(spacer);
      hbox.appendChild(vbox);
      richlistitem.appendChild(hbox);
      richlistitem.setAttribute("value", value);
      richlistitem.setAttribute("label", label);
      richlistitem.setAttribute("url", url);
//alert("step3");

      document.getElementById("group-playlist").appendChild(richlistitem);
//alert("step4");
  }
  catch(e)
  {
    inforssDebug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function removeFromPlayList()
{
  try
  {
    var listbox = document.getElementById("group-playlist");
//alert("step1");
    if (listbox.selectedItem != null)
    {
//alert("step2");
      listbox.removeChild(listbox.selectedItem);
    }
  }
  catch(e)
  {
    inforssDebug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function moveUpInPlayList()
{
  try
  {
    var listbox = document.getElementById("group-playlist");
//alert("step1");
    var richListitem = listbox.selectedItem
    if ((richListitem != null) && (richListitem.previousSibling != null))
    {
//alert("step2");
      var oldValue = richListitem.childNodes[0].childNodes[0].value;
      var previous = richListitem.previousSibling;
      listbox.removeChild(listbox.selectedItem);
      listbox.insertBefore(richListitem, previous);
      richListitem.childNodes[0].childNodes[0].setAttribute("value", oldValue);
    }
  }
  catch(e)
  {
    inforssDebug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function moveDownInPlayList()
{
  try
  {
    var listbox = document.getElementById("group-playlist");
//alert("step1");
    var richListitem = listbox.selectedItem
    if ((richListitem != null) && (richListitem.nextSibling != null))
    {
//alert("step2");
      var oldValue = richListitem.childNodes[0].childNodes[0].value;
      var next = richListitem.nextSibling.nextSibling;
      listbox.removeChild(listbox.selectedItem);
      if (next != null)
      {
        listbox.insertBefore(richListitem, next);
      }
      else
      {
        listbox.appendChild(richListitem);
      }
      richListitem.childNodes[0].childNodes[0].setAttribute("value", oldValue);
    }
  }
  catch(e)
  {
    inforssDebug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function changeDefaultValue()
{
  try
  {
    var applyto = document.getElementById("inforss.applyto").selectedIndex;
    switch (applyto)
    {
      case 0: // apply to all
      {
        var items = RSSList.getElementsByTagName("RSS");
        for (var i=0; i < items.length; i++)
        {
	      changeDefaultValue1(items[i].getAttribute("url"));
	    }
        alert(document.getElementById("bundle_inforss").getString("inforss.feed.changed"));

		break;
	  }

	  case 1: // the current feed
	  {
		if (theCurrentFeed.getType() == "group")
		{
		  if (confirm(document.getElementById("bundle_inforss").getString("inforss.apply.group")) == true)
		  {
            var feedList = theCurrentFeed.feedXML.getElementsByTagName("GROUP");
            for (var j = 0; j < feedList.length; j++)
            {
	          changeDefaultValue1(feedList[j].getAttribute("url"));
            }
            alert(document.getElementById("bundle_inforss").getString("inforss.feed.changed"));
          }
		}
		else
		{
	      changeDefaultValue1(currentRSS.getAttribute("url"));
          alert(document.getElementById("bundle_inforss").getString("inforss.feed.changed"));
		}
		break;
	  }

	  case 2: // apply to the selected feed
	  {
		var selectedItems = document.getElementById("inforss.apply.list").selectedItems;
		if (selectedItems.length == 0)
		{
		  alert(document.getElementById("bundle_inforss").getString("inforss.rss.selectfirst"));
		}
		else
		{
		  var listitem = null;
	      for (var j = 0; j < selectedItems.length; j++)
	      {
			changeDefaultValue1(selectedItems[j].getAttribute("url"));
		  }
          alert(document.getElementById("bundle_inforss").getString("inforss.feed.changed"));
		}
		break;
	  }

	  default:
	  {
	  }
	}
  }
  catch(e)
  {
    inforssDebug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function changeDefaultValue1(url)
{
  try
  {
    var rss = inforssGetItemFromUrl(url);

    var checkbox = document.getElementById("inforss.checkbox.defaultnbitem");
    if (checkbox.getAttribute("checked") == "true")
    {
	  rss.setAttribute("nbItem", (document.getElementById('defaultnbitem').selectedIndex == 0)? "9999" : document.getElementById('defaultnbitem1').value);
    }

    checkbox = document.getElementById("inforss.checkbox.defaultlengthitem");
    if (checkbox.getAttribute("checked") == "true")
    {
	  rss.setAttribute("lengthItem", (document.getElementById('defaultlengthitem').selectedIndex == 0)? "9999" : document.getElementById('defaultlengthitem1').value);
    }

    checkbox = document.getElementById("inforss.checkbox.defaultrefresh1");
    if (checkbox.getAttribute("checked") == "true")
    {
      var refresh1 = document.getElementById('inforss.defaultrefresh').selectedIndex;
      rss.setAttribute("refresh", (refresh1 == 0)? 60*24 : (refresh1 == 1)? 60 : document.getElementById('defaultrefresh1').value);
    }

    checkbox = document.getElementById("inforss.checkbox.defaultPlayPodcast");
    if (checkbox.getAttribute("checked") == "true")
    {
	  rss.setAttribute("playPodcast", (document.getElementById('defaultPlayPodcast').selectedIndex == 0)? "true" : "false");
    }

    checkbox = document.getElementById("inforss.checkbox.defaultPurgeHistory");
    if (checkbox.getAttribute("checked") == "true")
    {
	  rss.setAttribute("purgeHistory", (document.getElementById('defaultPurgeHistory').value));
    }

    checkbox = document.getElementById("inforss.checkbox.defaultBrowserHistory");
    if (checkbox.getAttribute("checked") == "true")
    {
	  rss.setAttribute("browserHistory", (document.getElementById('defaultBrowserHistory').selectedIndex == 0)? "true" : "false");
    }

    checkbox = document.getElementById("inforss.checkbox.defaultGroupIcon");
    if ((checkbox.getAttribute("checked") == "true") && (rss.getAttribute("type") == "group"))
    {
	  rss.setAttribute("icon", document.getElementById('defaultGroupIcon').value);
    }
    
    checkbox = document.getElementById("inforss.checkbox.defaultSavePodcast");
    if (checkbox.getAttribute("checked") == "true")
    {
	  rss.setAttribute("savePodcastLocation", (document.getElementById('savePodcastLocation').selectedIndex == 1)? "" : document.getElementById('savePodcastLocation1').value);
    }

    if (document.getElementById("rss-select-menu").selectedItem.getAttribute("url") == url)
    {
      selectRSS2(rss);
    }
  }
  catch(e)
  {
    inforssDebug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function locateRepository(ext)
{
  try
  {
    var dir = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties).get("ProfD", Components.interfaces.nsIFile);
//  dir.append(INFORSS_REPOSITORY);
    var localFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
    localFile.initWithPath(dir.path );
    var filePicker = Components.classes["@mozilla.org/filepicker;1"].createInstance(Components.interfaces.nsIFilePicker);
    filePicker.appendFilter("", "*.rdf");
    filePicker.appendFilters(Components.interfaces.nsIFilePicker.filterXML);
//    filePicker.displayDirectory = dir;
//dump("locate=" + dir.path + "\n");
//dump("isDir=" + dir.isDirectory() + "\n");
    filePicker.init(window, "", Components.interfaces.nsIFilePicker.modeOpen);
    filePicker.displayDirectory = localFile;
    filePicker.defaultString = null;
    filePicker.appendFilters(filePicker.filterAll);

    var response = filePicker.show();
  }
  catch(e)
  {
    inforssDebug(e);
  }
}

// http://www.rsscache.com/Section/Stats/more/767.aspx
