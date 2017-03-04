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
// inforss
// Author : Didier Ernotte 2005
// Inforss extension
//-------------------------------------------------------------------------------------------------------------

/* globals inforssDebug, inforssTraceIn, inforssTraceOut */
Components.utils.import("chrome://inforss/content/modules/inforssDebug.jsm");

Components.utils.import("chrome://inforss/content/modules/inforssPrompt.jsm", this);

/* globals inforssXMLRepository, inforssCopyRemoteToLocal, inforssCopyLocalToRemote */
/* globals inforssMediator, inforssSave, inforssFeed, inforssGetFormat */
/* globals inforssFindIcon */
/* globals getNodeValue, getHref */
/* globals FeedManager */
/* globals gBrowser */

//YECHHH. We have two places that can update this global variable.
/* globals RSSList: true */

var gInforssUrl = null;
var gInforssRssBundle = null;
var gInforssXMLHttpRequest = null;
const INFORSS_COMPLETED = 4;
const INFORSS_MAX_SUBMENU = 25;
var gInforssCurrentMenuHandle = null;
var gInforssUser = null;
var gInforssPassword = null;
var gInforssCanResize = false;
var gInforssX = null;
var gInforssTimeout = null;
var gInforssMediator = null;
var gInforssTimerList = new Array();
var gInforssTimerCounter = 0;
var gInforssWidth = null;
/* exported gInforssPreventTooltip */
var gInforssPreventTooltip = false;
//FIXME this is in the wrong file
var gInforssSpacerEnd = null;
var gInforssResizeTimeout = null;

//-------------------------------------------------------------------------------------------------------------
/* exported inforssStartExtension */
function inforssStartExtension()
{
  try
  {
    if ((window.arguments != null) || (window.opener != null))
    {
      Components.utils.import("chrome://inforss/content/modules/inforssVersion.jsm");
      /* globals inforssCheckVersion */

      Components.utils.import("resource://gre/modules/AddonManager.jsm");
      //Sadly it's not possible to get your own version from the addons manager
      //so you have to use your ID.
      /* globals AddonManager */
      AddonManager.getAddonByID("{f65bf62a-5ffc-4317-9612-38907a779583}",
                                inforssCheckVersion);

      checkContentHandler();
      var inforssObserverService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
      inforssObserverService.addObserver(InforssObserver, "reload", false);
      inforssObserverService.addObserver(InforssObserver, "banned", false);
      inforssObserverService.addObserver(InforssObserver, "viewed", false);
      inforssObserverService.addObserver(InforssObserver, "sync", false);
      inforssObserverService.addObserver(InforssObserver, "syncBack", false);
      inforssObserverService.addObserver(InforssObserver, "ack", false);
      inforssObserverService.addObserver(InforssObserver, "popup", false);
      inforssObserverService.addObserver(InforssObserver, "newRDF", false);
      inforssObserverService.addObserver(InforssObserver, "purgeRdf", false);
      inforssObserverService.addObserver(InforssObserver, "clearRdf", false);
      inforssObserverService.addObserver(InforssObserver, "rssChanged", false);
      inforssObserverService.addObserver(InforssObserver, "addFeed", false);
      var serverInfo = inforssXMLRepository.getServerInfo();
      var lb = document.getElementById("livemark-button");
      if (lb != null)
      {
        lb.addEventListener("popupshowing", inforssAddItemToLivemarkMenu, false);
      }
      var box = document.getElementById("inforss.newsbox1");
      if (box != null)
      {
        box.addEventListener("DOMMouseScroll", inforssMouseScroll, false);
      }

      if ((inforssGetNbWindow() == 1) && (serverInfo.autosync == true) && (navigator.userAgent.indexOf("Thunderbird") == -1) && (navigator.userAgent.indexOf("Linspire Inc.") == -1))
      {
        inforssCopyRemoteToLocal(serverInfo.protocol, serverInfo.server, serverInfo.directory, serverInfo.user, serverInfo.password, inforssStartExtension1);
      }
      else
      {
        inforssStartExtension1();
      }
    }
    else
    {
      if (document.getElementById("inforss.headlines") != null)
      {
        document.getElementById("inforss.headlines").setAttribute("collapsed", "true");
      }
    }
  }
  catch (e)
  {
    //FIXME inforssDebug?
    dump(e + "\n");
  }
}

//-------------------------------------------------------------------------------------------------------------
function checkContentHandler()
{
  try
  {
    var ps = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
    var i = 0;
    var found = false;
    var typeBranch = null;
    //FIXME really?
    while (found == false)
    {
      typeBranch = ps.getBranch("browser.contentHandlers.types." + i + ".");
      try
      {
        found = (typeBranch.getCharPref("title") == "InfoRSS");
        ++i;
      }
      catch (err)
      {
        // No more handlers
        break;
      }
    }
    if (typeBranch)
    {
      typeBranch.setCharPref("type", "application/vnd.mozilla.maybe.feed");
      var pls = Components.classes["@mozilla.org/pref-localizedstring;1"].createInstance(Components.interfaces.nsIPrefLocalizedString);
      pls.data = "chrome://inforss/content/inforssNewFeed.xul?feed=%s";
      typeBranch.setComplexValue("uri", Components.interfaces.nsIPrefLocalizedString, pls);
      pls.data = "InfoRSS";
      typeBranch.setComplexValue("title", Components.interfaces.nsIPrefLocalizedString, pls);
    }
  }
  catch (e)
  {
    alert(e);
  }
}

//-------------------------------------------------------------------------------------------------------------
function inforssAddItemToLivemarkMenu(event)
{
  try
  {
    var menupopup = event.target;
    var element = null;
    if (gBrowser != null && gBrowser.mCurrentBrowser != null && gBrowser.mCurrentBrowser.livemarkLinks != null)
    {
      var livemarkLinks = gBrowser.mCurrentBrowser.livemarkLinks;
      if (livemarkLinks == null)
      {
        livemarkLinks = gBrowser.mCurrentBrowser.feeds;
      }
      if (livemarkLinks.length > 0)
      {
        element = document.createElement("menuseparator");
        menupopup.appendChild(element);
        element = document.createElement("menu");
        element.setAttribute("label", gInforssRssBundle.getString("inforss.menuadd1"));
        menupopup.appendChild(element);
        menupopup = document.createElement("menupopup");
        element.appendChild(menupopup);
        menupopup.addEventListener("popupshowing", function(event)
        {
          event.cancelBubble = true;
          event.stopPropagation();
          return true;
        }, false);
        var markinfo = null;
        for (var i = 0; i < livemarkLinks.length; i++)
        {
          markinfo = livemarkLinks[i];
          if ((markinfo.type == "application/rss+xml") || (markinfo.type == "application/xml") ||
            (markinfo.type == "application/atom+xml") || (markinfo.type == "text/xml"))
          {
            element = document.createElement("menuitem");
            element.setAttribute("label", gInforssRssBundle.getString("inforss.menuadd") + " " + markinfo.title + "(" + markinfo.href + ")");
            element.setAttribute("tooltiptext", markinfo.href);
            element.setAttribute("data", markinfo.href);
            menupopup.appendChild(element);
            element.addEventListener("command", inforssLivemarkCommand, false);
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

//-------------------------------------------------------------------------------------------------------------
function inforssLivemarkCommand(event)
{
  try
  {
    rssSwitchAll(event.target.parentNode, event.target.getAttribute("data"), event.target.getAttribute("label"), null);
    event.cancelBubble = true;
    event.stopPropagation();
  }
  catch (e)
  {
    inforssDebug(e);
  }
}


//-------------------------------------------------------------------------------------------------------------
function inforssStartExtension1(step, status)
{
  try
  {
    if ((step == null) || (step != "send"))
    {
      if (document.getElementById("inforss.headlines") != null) // only if the page is loaded
      {
        if (gInforssMediator == null)
        {
          gInforssRssBundle = document.getElementById("bundle_inforss");
          gInforssMediator = new inforssMediator();
          inforssSetTimer(gInforssMediator, "init", 1200);
          if (document.getElementById("contentAreaContextMenu") != null)
          {
            document.getElementById("contentAreaContextMenu").addEventListener("popupshowing", onAddNewFeedPopup, false);
          }
          else
          {
            if (document.getElementById("messagePaneContext") != null)
            {
              document.getElementById("messagePaneContext").addEventListener("popupshowing", onAddNewFeedPopup, false);
            }
            else
            {
              if (document.getElementById("msgComposeContext") != null)
              {
                document.getElementById("msgComposeContext").addEventListener("popupshowing", onAddNewFeedPopup, false);
              }
            }
          }
        }
      }
    }
  }
  catch (e)
  {
    alert(e);
  }
}


//-------------------------------------------------------------------------------------------------------------
/* exported inforssStopExtension */
function inforssStopExtension()
{
  try
  {
    if (window.arguments != null)
    {
      var bartop = document.getElementById("inforss-bar-top");
      if (bartop != null)
      {
        var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("inforss.");
        prefs.setBoolPref("toolbar.collapsed", ((bartop.getAttribute("collapsed") == null) ? false : (bartop.getAttribute("collapsed") == "true")));
      }
      var inforssObserverService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
      inforssObserverService.removeObserver(InforssObserver, "reload");
      inforssObserverService.removeObserver(InforssObserver, "banned");
      inforssObserverService.removeObserver(InforssObserver, "viewed");
      inforssObserverService.removeObserver(InforssObserver, "sync");
      inforssObserverService.removeObserver(InforssObserver, "syncBack");
      inforssObserverService.removeObserver(InforssObserver, "ack");
      inforssObserverService.removeObserver(InforssObserver, "popup");
      inforssObserverService.removeObserver(InforssObserver, "newRDF");
      inforssObserverService.removeObserver(InforssObserver, "purgeRdf");
      inforssObserverService.removeObserver(InforssObserver, "clearRdf");
      inforssObserverService.removeObserver(InforssObserver, "rssChanged");
      inforssObserverService.removeObserver(InforssObserver, "addFeed");
      var serverInfo = inforssXMLRepository.getServerInfo();
      if ((inforssGetNbWindow() == 0) && (serverInfo.autosync == true) && (navigator.vendor != "Thunderbird") && (navigator.vendor != "Linspire Inc."))
      {
        inforssCopyLocalToRemote(serverInfo.protocol, serverInfo.server, serverInfo.directory, serverInfo.user, serverInfo.password, inforssStopExtension1, false);
      }
    }
  }
  catch (e)
  {
    inforssDebug(e);
  }
}

//-------------------------------------------------------------------------------------------------------------
function inforssStopExtension1(step, status)
{
}

//-------------------------------------------------------------------------------------------------------------
function inforssGetNbWindow()
{
  var returnValue = 0;
  try
  {
    var windowManager = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService();
    var windowManagerInterface = windowManager.QueryInterface(Components.interfaces.nsIWindowMediator);
    var enumerator = windowManagerInterface.getEnumerator(null);
    //FIXME No better way of counting these?
    while (enumerator.hasMoreElements())
    {
      returnValue++;
      enumerator.getNext();
    }
  }
  catch (e)
  {
    inforssDebug(e);
  }
  return returnValue;
}


//-------------------------------------------------------------------------------------------------------------
var InforssObserver = {
  observe: function(subject, topic, data)
  {
    manageRSSChanged(subject, topic, data);
  }
};


//-------------------------------------------------------------------------------------------------------------
function inforssGetRss(url, callback, user, password)
{
  inforssTraceIn();
  try
  {
    if (gInforssXMLHttpRequest != null)
    {
      gInforssXMLHttpRequest.abort();
    }

    if (gInforssTimeout != null)
    {
      window.clearTimeout(gInforssTimeout);
      gInforssTimeout = null;
    }
    gInforssTimeout = window.setTimeout("inforssHandleTimeout('" + url + "')", 10000);
    gInforssUrl = url;
    gInforssXMLHttpRequest = new XMLHttpRequest();
    gInforssXMLHttpRequest.callback = callback;
    gInforssXMLHttpRequest.user = user;
    gInforssXMLHttpRequest.password = password;
    gInforssXMLHttpRequest.onreadystatechange = inforssProcessReqChange;
    gInforssXMLHttpRequest.open("GET", url, true, user, password);
    gInforssXMLHttpRequest.overrideMimeType("application/xml");
    gInforssXMLHttpRequest.send(null);
  }
  catch (e)
  {
    inforssDebug(e + "/" + url + "/" + callback);
  }
  inforssTraceOut();
}


//-------------------------------------------------------------------------------------------------------------
/* exported inforssHandleTimeout */
function inforssHandleTimeout(url)
{
  inforssTraceIn();
  if (gInforssXMLHttpRequest != null)
  {
    gInforssXMLHttpRequest.abort();
    gInforssXMLHttpRequest = null;
  }
  gInforssTimeout = null;
  inforssTraceOut();
}

//-------------------------------------------------------------------------------------------------------------
function inforssProcessReqChange()
{
  inforssTraceIn();
  try
  {
    if (gInforssXMLHttpRequest.readyState == INFORSS_COMPLETED)
    {
      if ((gInforssXMLHttpRequest.status == 200) ||
        (gInforssXMLHttpRequest.status == 201) ||
        (gInforssXMLHttpRequest.status == 202))
      {
        if (gInforssTimeout != null)
        {
          window.clearTimeout(gInforssTimeout);
          gInforssTimeout = null;
        }
        eval(gInforssXMLHttpRequest.callback + "()");
      }
      else
      {
        if (gInforssXMLHttpRequest.status == 302)
        {
          var url = gInforssXMLHttpRequest.getResponseHeader("Location");
          if (url != null)
          {
            inforssGetRss(url, gInforssXMLHttpRequest.callback, gInforssXMLHttpRequest.user, gInforssXMLHttpRequest.password);
          }
        }
        else
        {
          inforssDebug("processReqChange", "There was a problem retrieving the XML data:\n" + gInforssXMLHttpRequest.statusText + "/" + gInforssXMLHttpRequest.status + "\nUrl=" + gInforssUrl);
        }
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
// remove all menuitem in the popup menu except the trash icon
function inforssClearPopupMenu()
{
  inforssTraceIn();
  try
  {
    clearAddRSSPopupMenu();
    var menupopup = document.getElementById("inforss-menupopup");
    var found = false;
    var i = 0;
    var child = menupopup.firstChild;
    var nextChild = null;
    while (child != null)
    {
      i++;
      if ((found == false) && (child.nodeName == "menuseparator"))
      {
        found = true;
        child = child.nextSibling;
      }
      else
      {
        if (found == true)
        {
          nextChild = child.nextSibling;
          menupopup.removeChild(child);
          child = nextChild;
        }
        else
        {
          child = child.nextSibling;
        }
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
// remove what in between the first two menuseparator after trash and before feed (Add RSS, Add ...)
function clearAddRSSPopupMenu()
{
  inforssTraceIn();
  try
  {
    var menupopup = document.getElementById("inforss-menupopup");
    if (document.getElementById("inforss-menupopup").getElementsByTagName("menuseparator").length > 1)
    {
      var found = false;
      var stop = false;
      var i = 0;
      var child = menupopup.firstChild;
      var nextChild = null;
      while ((child != null) && (stop == false))
      {
        i++;
        if ((found == false) && (child.nodeName == "menuseparator"))
        {
          found = true;
          nextChild = child.nextSibling;
          menupopup.removeChild(child);
          delete child;
          child = nextChild;
        }
        else
        {
          if (found == true)
          {
            if (child.nodeName == "menuseparator")
            {
              stop = true;
            }
            else
            {
              nextChild = child.nextSibling;
              menupopup.removeChild(child);
              delete child;
              child = nextChild;
            }
          }
          else
          {
            child = child.nextSibling;
          }
        }
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
function inforssResetSubMenu()
{
  inforssTraceIn();
  try
  {
    var menupopup = document.getElementById("inforss-menupopup");
    var child = menupopup.firstChild;
    while (child != null)
    {
      var subElement = document.getAnonymousNodes(child);

      if ((subElement != null) && (subElement.length > 0) && (subElement[0] != null) && (subElement[0].firstChild != null) && (subElement[0].firstChild.localName == "image"))
      {
        subElement[0].firstChild.setAttribute("maxwidth", "16");
        subElement[0].firstChild.setAttribute("maxheight", "16");
        subElement[0].firstChild.setAttribute("minwidth", "16");
        subElement[0].firstChild.setAttribute("minheight", "16");


        subElement[0].firstChild.style.maxWidth = "16px";
        subElement[0].firstChild.style.maxHeight = "16px";
        subElement[0].firstChild.style.minWidth = "16px";
        subElement[0].firstChild.style.minHeight = "16px";

      }
      if (child.nodeName == "menu")
      {
        var menupopup = child.firstChild;
        if (menupopup != null)
        {
          var id = menupopup.getAttribute("id");
          var index = id.indexOf("-");
          if ((menupopup.getAttribute("type") == "rss") || (menupopup.getAttribute("type") == "atom"))
          {
            menupopup.setAttribute("onpopupshowing", "return inforssSubMenu(" + id.substring(index + 1) + ");");
          }
          else
          {
            menupopup.setAttribute("onpopupshowing", "return false");
          }
          inforssResetPopup(menupopup);
          inforssAddNoData(menupopup);
        }
      }
      child = child.nextSibling;
    }
  }
  catch (e)
  {
    inforssDebug(e);
  }
  inforssTraceOut();
}

//-------------------------------------------------------------------------------------------------------------
/* exported rssFillPopup */
function rssFillPopup(obj, event)
{
  inforssTraceIn();
  var returnValue = true;
  try
  {
    var leftButton = inforssXMLRepository.getMouseEvent();
    if ((event.button == leftButton) && (event.ctrlKey == false)) // left button
    {
      clearAddRSSPopupMenu();
      if (event.target.getAttribute("id") == "inforss-menupopup")
      {
        inforssResetSubMenu();
      }
      //var menupopup = document.getElementById("inforss-menupopup");
      var nb = 0;
      if (gBrowser != null && gBrowser.mCurrentBrowser != null &&
        ((gBrowser.mCurrentBrowser.livemarkLinks != null) || (gBrowser.mCurrentBrowser.feeds != null)))
      {
        if (inforssXMLRepository.isCurrentFeed() == true)
        {
          var livemarkLinks = gBrowser.mCurrentBrowser.livemarkLinks;
          if (livemarkLinks == null)
          {
            livemarkLinks = gBrowser.mCurrentBrowser.feeds;
          }
          for (var i = 0; i < livemarkLinks.length; i++)
          {
            var markinfo = livemarkLinks[i];

            if ((markinfo.type == "application/rss+xml") || (markinfo.type == "application/xml") ||
              (markinfo.type == "application/atom+xml") || (markinfo.type == "text/xml"))
            {
              var baseTitle = markinfo.title + " (" + markinfo.href + ")";
              inforssAddaAddSubMenu(nb, markinfo.href, baseTitle);
              nb++;
            }
          }
        }
      }

      if (inforssXMLRepository.isClipboard() == true)
      {
        var clipboard = Components.classes["@mozilla.org/widget/clipboard;1"].getService(Components.interfaces.nsIClipboard);
        var xferable = Components.classes["@mozilla.org/widget/transferable;1"].createInstance(Components.interfaces.nsITransferable);
        xferable.addDataFlavor("text/unicode");
        try
        {
          clipboard.getData(xferable, Components.interfaces.nsIClipboard.kGlobalClipboard);

          var flavour = {};
          var data = {};
          var length = {};
          xferable.getAnyTransferData(flavour, data, length);
          data = data.value.QueryInterface(Components.interfaces.nsISupportsString).data;
          if ((data != null) && ((data.indexOf("http://") == 0) ||
              (data.indexOf("file://") == 0) ||
              (data.indexOf("https://") == 0)) &&
            (data.length < 60))
          {
            inforssAddaAddSubMenu(nb, data, data);
            nb++;
          }
        }
        catch (e)
        {}
      }
      if ((inforssXMLRepository.isLivemark() == true) && (gBrowser != null))
      {
        var RDF = Components.classes["@mozilla.org/rdf/rdf-service;1"].getService(Components.interfaces.nsIRDFService);
        inforssWalk(RDF.GetResource("NC:BookmarksRoot"), nb);
      }
    }
    else
    {
      returnValue = false;
    }
  }
  catch (e)
  {
    inforssDebug(e);
  }
  inforssTraceOut();

  return returnValue;
}

//-------------------------------------------------------------------------------------------------------------
/* exported inforssDisplayOption */
function inforssDisplayOption(event)
{
  inforssTraceIn();
  try
  {
    if ((event.button == 2) || (event.ctrlKey == true))
    {
      if (event.target.localName == "statusbarpanel")
      {
        inforssDisplayOption1();
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
function inforssDisplayOption1()
{
  var nb = 0;
  var windowManager = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService();
  var windowManagerInterface = windowManager.QueryInterface(Components.interfaces.nsIWindowMediator);
  var enumerator = windowManagerInterface.getEnumerator("inforssOption");
  //FIXME Wouldn't it be easier to just check if it doesn't have more elements?
  while (enumerator.hasMoreElements())
  {
    nb++;
    enumerator.getNext();
  }
  if (nb == 0)
  {
    window.openDialog("chrome://inforss/content/inforssOption.xul", "_blank", "chrome,centerscreen,resizable=yes,dialog=no");
  }
}

//-------------------------------------------------------------------------------------------------------------
function inforssAddaAddSubMenu(nb, data, labelStr)
{
  inforssTraceIn();
  var menupopup = document.getElementById("inforss-menupopup");
  var separators = menupopup.getElementsByTagName("menuseparator");
  var separator = separators.item(separators.length - 1);
  var menuItem = document.createElement("menuitem");
  //var baseTitle = data;
  var labelStr = gInforssRssBundle.getString("inforss.menuadd") + " " + labelStr;
  menuItem.setAttribute("label", labelStr);
  menuItem.setAttribute("data", data);
  menuItem.setAttribute("tooltiptext", data);
  if (separators.length == 1)
  {
    menupopup.insertBefore(document.createElement("menuseparator"), separator);
  }
  menupopup.insertBefore(menuItem, separator);
  inforssTraceOut();
}

//-------------------------------------------------------------------------------------------------------------
function inforssWalk(node, nb)
{
  inforssTraceIn();
  try
  {
    var RDFC = Components.classes['@mozilla.org/rdf/container-utils;1'].getService(Components.interfaces.nsIRDFContainerUtils);
    var RDF = Components.classes["@mozilla.org/rdf/rdf-service;1"].getService(Components.interfaces.nsIRDFService);

    // The bookmarks service
    var Bookmarks = Components.classes['@mozilla.org/browser/bookmarks-service;1'];
    if (Bookmarks != null)
    {
        Bookmarks = Bookmarks.getService(Components.interfaces.nsIRDFDataSource);
    }


    var kNC_Name = RDF.GetResource("http://home.netscape.com/NC-rdf#Name");
    //var kNC_URL = RDF.GetResource("http://home.netscape.com/NC-rdf#URL");
    var kNC_FEEDURL = RDF.GetResource("http://home.netscape.com/NC-rdf#FeedURL");
    if ((Bookmarks != null) && (RDFC.IsContainer(Bookmarks, node)))
    {
      // It's a folder
      var name = Bookmarks.GetTarget(node, kNC_Name, true);
      //var url = Bookmarks.GetTarget(node, kNC_URL, true);
      var feedurl = Bookmarks.GetTarget(node, kNC_FEEDURL, true);
      if ((name != null) && (feedurl != null))
      {
        var target = Bookmarks.GetTarget(node, RDF.GetResource("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"), true);
        if (target != null)
        {
          var type = target.QueryInterface(Components.interfaces.nsIRDFResource).Value;
          if (type == "http://home.netscape.com/NC-rdf#Livemark")
          {
            inforssAddaAddSubMenu(nb, feedurl.QueryInterface(Components.interfaces.nsIRDFLiteral).Value, name.QueryInterface(Components.interfaces.nsIRDFLiteral).Value);
            nb++;
          }
        }
      }

      if (name.QueryInterface(Components.interfaces.nsIRDFLiteral).Value != "InfoRSS Feeds")
      {
        var container = Components.classes['@mozilla.org/rdf/container;1'].createInstance(Components.interfaces.nsIRDFContainer);

        container.Init(Bookmarks, node);

        var contents = container.GetElements();
        while (contents.hasMoreElements())
        {
          var child = contents.getNext().QueryInterface(Components.interfaces.nsIRDFResource);

          // recur!
          inforssWalk(child, nb);
        }
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
function rssSwitchAll(popup, url, label, target)
{
  inforssTraceIn();
  //var items = popup.getElementsByTagName(inforssXMLRepository.getSubMenuType());
  if (label.indexOf(gInforssRssBundle.getString("inforss.menuadd") + " ") == 0) // if the user clicked on the "Add ..." button
  {
    if (inforssGetItemFromUrl(url) != null) // already exists
    {
      alert(gInforssRssBundle.getString("inforss.duplicate"));
    }
    else
    {
      if (gInforssXMLHttpRequest == null)
      {
        getInfoFromUrl(url); // search for the general information of the feed: title, ...
      }
    }
  }
  else
  {
    var changed = true;
    if ((target == null) || ((target.getAttribute("data") == url) && (target.getAttribute("label") == label)))
    {
      changed = gInforssMediator.setSelected(url);
    }
    if ((changed == true) || (inforssXMLRepository.isActive() == true))
    {
      document.getElementById('newsbar1').label = null;
      document.getElementById('newsbar1').style.visibility = "hidden";
    }
    inforssSave();
  }
  inforssTraceOut();
}

//-------------------------------------------------------------------------------------------------------------
var infoRSSObserver = {
  getSupportedFlavours: function()
  {
    var flavours = new FlavourSet();
    flavours.appendFlavour("text/unicode");
    return flavours;
  },
  onDragOver: function(evt, flavour, session)
  {
  },
  onDragStart: function(evt, transferData, action)
  {
    evt.stopPropagation();
    var htmlText = "<strong>infoRSS</strong>";

    transferData.data = new TransferData();
    transferData.data.addDataForFlavour("text/html", htmlText);
    transferData.data.addDataForFlavour("text/unicode", evt.target.getAttribute("data"));
  },
  onDragExit: function(evt, session)
  {
  },
  onDrop: function(evt, dropdata, session)
  {
    try
    {
      if (evt.target.nodeName == "statusbarpanel")
      {
        var url = dropdata.data;
        if (url.indexOf("\n") != -1)
        {
          url = url.substring(0, url.indexOf("\n"));
        }
        if (url != "")
        {
          if (((url.indexOf("file://") == -1) && (url.indexOf("http://") == -1) && (url.indexOf("https://") == -1) && (url.indexOf("news://") == -1)))
          {
            evt.cancelBubble = true;
            evt.stopPropagation();
            window.openDialog("chrome://inforss/content/inforssAlert.xul", "_blank", "chrome,centerscreen,resizable=yes, dialog=no", gInforssRssBundle.getString("inforss.malformedUrl"));
          }
          else
          {
            if (inforssGetItemFromUrl(url) != null)
            {
              window.openDialog("chrome://inforss/content/inforssAlert.xul", "_blank", "chrome,centerscreen,resizable=yes, dialog=no", gInforssRssBundle.getString("inforss.duplicate"));
            }
            else
            {
              getInfoFromUrl(url);
            }
          }
        }
        inforssSave();
      }
      else
      {
        if ((evt.target.nodeName == "menuitem") || (evt.target.nodeName == "menu"))
        {
          var url = dropdata.data;
          if ((url != "") && (url != null))
          {
            var rssOrig = inforssGetItemFromUrl(url);
            if ((rssOrig != null) && (rssOrig.getAttribute("type") != "group"))
            {
              var rssDest = inforssGetItemFromUrl(evt.target.getAttribute("url"));
              if ((rssDest != null) && (rssDest.getAttribute("type") == "group"))
              {
                var info = gInforssMediator.locateFeed(evt.target.getAttribute("url")).info;
                if ((info != null) && (info.containsFeed(url) == false))
                {
                  info.addNewFeed(url);
                  var observerService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
                  observerService.notifyObservers(null, "reload", null);
                }
              }
            }
          }
        }
      }
    }
    catch (e)
    {
      alert(e);
    }
    evt.cancelBubble = true;
    evt.stopPropagation();
  }
};

//-------------------------------------------------------------------------------------------------------------
var infoRSSTrashObserver = {
  getSupportedFlavours: function()
  {
    var flavours = new FlavourSet();
    flavours.appendFlavour("text/unicode");
    return flavours;
  },
  onDragOver: function(evt, flavour, session)
  {
    session.canDrag = true;

  },
  onDragStart: function(evt, transferData, action)
  {
    var htmlText = "<strong>Cabbage</strong>";
    var plainText = "Cabbage";

    transferData.data = new TransferData();
    transferData.data.addDataForFlavour("text/html", htmlText);
    transferData.data.addDataForFlavour("text/unicode", plainText);
  },
  onDragExit: function(evt, session)
  {
  },
  onDrop: function(evt, dropdata, session)
  {
    gInforssMediator.deleteRss(dropdata.data);
  }
};

//-------------------------------------------------------------------------------------------------------------
var infoRSSBarObserver = {
  getSupportedFlavours: function()
  {
    var flavours = new FlavourSet();
    flavours.appendFlavour("text/unicode");
    return flavours;
  },
  onDragOver: function(evt, flavour, session) {},
  onDragStart: function(evt, transferData, action)
  {
    evt.stopPropagation();
    var htmlText = "<strong>infoRSS</strong>";
    var plainText = "infoRSS";

    transferData.data = new TransferData();
    transferData.data.addDataForFlavour("text/html", htmlText);
    transferData.data.addDataForFlavour("text/unicode", evt.target.getAttribute("data"));
  },
  onDragExit: function(evt, session) {},
  onDrop: function(evt, dropdata, session)
  {
    evt.cancelBubble = true;
    evt.stopPropagation();
    document.getElementById("inforss-menupopup").hidePopup();
    var url = dropdata.data;
    var rss = inforssGetItemFromUrl(url);
    var selectedInfo = gInforssMediator.getSelectedInfo(true);
    if ((selectedInfo != null) && (selectedInfo.getType() == "group") &&
      (rss != null) && (rss.getAttribute("type") != "group") &&
      (selectedInfo.containsFeed(url) == false))
    {
      {
        selectedInfo.addNewFeed(url);
      }
    }
    else
    {
      window.openDialog("chrome://inforss/content/inforssAlert.xul", "_blank", "chrome,centerscreen,resizable=yes, dialog=no", gInforssRssBundle.getString("inforss.notagroup"));
    }
    evt.cancelBubble = true;
    evt.stopPropagation();
  }
};

//-------------------------------------------------------------------------------------------------------------
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
    elem.setAttribute("description", ((description == null) || (description == "")) ? title : description);
    elem.setAttribute("icon", "");
    elem.setAttribute("refresh", inforssXMLRepository.getDefaultRefresh());
    elem.setAttribute("activity", "true");
    if ((user != null) && (user != ""))
    {
      elem.setAttribute("user", user);
      inforssXMLRepository.storePassword(url, user, password);
    }
    elem.setAttribute("filter", "all");
    elem.setAttribute("type", ((feedFlag == true) ? "atom" : "rss"));
    RSSList.firstChild.appendChild(elem);
  }
  catch (e)
  {
    inforssDebug(e);
  }
  inforssTraceOut();
  return elem;
}


//-------------------------------------------------------------------------------------------------------------
function inforssLocateMenuItem(title)
{
  inforssTraceIn();
  var item = null;
  try
  {
    var popup = document.getElementById("inforss-menupopup");
    var obj = popup.childNodes[popup.childNodes.length - 1];
    var stop = false;
    title = title.toLowerCase();
    while ((obj != null) && (stop == false))
    {
      if ((obj.nodeName == "menuseparator") ||
        ((inforssXMLRepository.getSortedMenu() == "asc") && (title > obj.getAttribute("label").toLowerCase())) ||
        ((inforssXMLRepository.getSortedMenu() == "des") && (title < obj.getAttribute("label").toLowerCase())))
      {
        stop = true;
        item = obj.nextSibling;
      }
      else
      {
        obj = obj.previousSibling;
      }
    }
  }
  catch (e)
  {
    inforssDebug(e);
  }
  inforssTraceOut();
  return item;
}

//-------------------------------------------------------------------------------------------------------------
/* exported inforssAddItemToMenu */
function inforssAddItemToMenu(rss, saveFlag)
{
  inforssTraceIn();
  try
  {
    if (document.getElementById("inforss-menupopup") != null)
    {
      if ((rss.getAttribute("groupAssociated") == "false") || (inforssXMLRepository.isIncludeAssociated() == true))
      {
        var typeObject = inforssXMLRepository.getSubMenuType();
        var items = document.getElementById("inforss-menupopup").getElementsByTagName(typeObject);

        var menuItem = document.createElement(typeObject);

        menuItem.setAttribute("type", "radio");
        menuItem.setAttribute("label", rss.getAttribute("title"));
        menuItem.setAttribute("value", rss.getAttribute("title"));

        menuItem.setAttribute("data", rss.getAttribute("url"));
        menuItem.setAttribute("url", rss.getAttribute("url"));
        menuItem.setAttribute("checked", false);
        menuItem.setAttribute("autocheck", false);
        if ((rss.getAttribute("description") != null) && (rss.getAttribute("description") != ""))
        {
          menuItem.setAttribute("tooltiptext", rss.getAttribute("description"));
        }
        menuItem.setAttribute("tooltip", null);
        menuItem.setAttribute("image", rss.getAttribute("icon"));
        menuItem.setAttribute("validate", "never");
        menuItem.setAttribute("id", "inforss.menuitem-" + items.length);
        menuItem.setAttribute("inforsstype", rss.getAttribute("type"));

        menuItem.setAttribute("class", typeObject + "-iconic");
        if (rss.getAttribute("activity") == "false")
        {
          menuItem.setAttribute("disabled", "true");
        }

        if ((inforssXMLRepository.getSubMenu() == "true") && ((rss.getAttribute("type") == "rss") || (rss.getAttribute("type") == "atom") || (rss.getAttribute("type") == "group") || (rss.getAttribute("type") == "html")))
        {
          var menupopup = document.createElement("menupopup");
          menupopup.setAttribute("type", rss.getAttribute("type"));
          if ((rss.getAttribute("type") == "rss") || (rss.getAttribute("type") == "atom"))
          {
            menupopup.setAttribute("onpopupshowing", "return inforssSubMenu(" + items.length + ");");
          }
          else
          {
            menupopup.setAttribute("onpopupshowing", "return false");
          }
          menupopup.setAttribute("onpopuphiding", "return inforssSubMenu2();");
          menupopup.setAttribute("id", "inforss.menupopup-" + items.length);
          inforssAddNoData(menupopup);
          menuItem.appendChild(menupopup);
        }

        if (inforssXMLRepository.getSortedMenu() != "no")
        {
          var indexItem = inforssLocateMenuItem(rss.getAttribute("title"));
          document.getElementById("inforss-menupopup").insertBefore(menuItem, indexItem);
        }
        else
        {
          document.getElementById("inforss-menupopup").appendChild(menuItem);
        }
      }
      gInforssMediator.addFeed(rss, menuItem, saveFlag);
    }
  }
  catch (e)
  {
    inforssDebug(e);
  }
  inforssTraceOut();
}



//-------------------------------------------------------------------------------------------------------------
function inforssSubMenu(index)
{
  inforssTraceIn();
  var popup = document.getElementById("inforss.menupopup-" + index);
  inforssSubMenu2();
  var res;
  if (inforssXMLRepository.getSubMenu() == "true")
  {
    gInforssCurrentMenuHandle = window.setTimeout("inforssSubMenu1(" + index + ")", 3000);
    res = true;
  }
  else
  {
    res = false;
  }
  inforssTraceOut();
  return res;
}

//-------------------------------------------------------------------------------------------------------------
function inforssSubMenu1(index)
{
  inforssTraceIn();
  try
  {
    gInforssCurrentMenuHandle = null;
    var popup = document.getElementById("inforss.menupopup-" + index);
    var item = document.getElementById("inforss.menuitem-" + index);
    var url = item.getAttribute("url");
    var rss = inforssGetItemFromUrl(url);
    popup.setAttribute("onpopupshowing", null);
    inforssResetPopup(popup);
    var xmlHttpRequest = new XMLHttpRequest();
    xmlHttpRequest.open("GET", url, false, rss.getAttribute("user"), inforssXMLRepository.readPassword(url, rss.getAttribute("user")));
    xmlHttpRequest.overrideMimeType("application/xml");
    xmlHttpRequest.send(null);

    var fm = new FeedManager();
    fm.parse(xmlHttpRequest);
    var max = INFORSS_MAX_SUBMENU;
    max = Math.min(max, fm.rssFeeds.length);
    for (var i = 0; i < max; i++)
    {
      var newElem = document.createElement("menuitem");
      var newTitle = inforssFeed.htmlFormatConvert(fm.rssFeeds[i].title);
      var re = new RegExp('\n', 'gi');
      if (newTitle != null)
      {
        newTitle = newTitle.replace(re, ' ');
      }
      newElem.setAttribute("label", newTitle);
      newElem.setAttribute("url", fm.rssFeeds[i].link);
      newElem.setAttribute("tooltiptext", inforssFeed.htmlFormatConvert(fm.rssFeeds[i].description));
      popup.appendChild(newElem);
      newElem.addEventListener("command", function(event)
      {
        event.cancelBubble = true;
        event.stopPropagation();
        return true;
      }, false);
    }
  }
  catch (e)
  {
    inforssDebug(e);
  }
  inforssTraceOut();
}

//-------------------------------------------------------------------------------------------------------------
function inforssSubMenu2()
{
  inforssTraceIn();
  if (gInforssCurrentMenuHandle != null)
  {
    window.clearTimeout(gInforssCurrentMenuHandle);
  }
  gInforssCurrentMenuHandle = null;
  inforssTraceOut();
  return true;
}

//-------------------------------------------------------------------------------------------------------------
function inforssSubMenu3()
{
  return true;
}

//-------------------------------------------------------------------------------------------------------------
function inforssAddNoData(popup)
{
  inforssTraceIn();
  try
  {
    var item = document.createElement("menuitem");
    item.setAttribute("label", gInforssRssBundle.getString("inforss.noData"));
    popup.appendChild(item);
  }
  catch (e)
  {
    inforssDebug(e);
  }
  inforssTraceOut();
}

//-------------------------------------------------------------------------------------------------------------
function inforssResetPopup(popup)
{
  inforssTraceIn();
  var child = null;
  while (popup.firstChild != null)
  {
    child = popup.firstChild;
    popup.removeChild(popup.firstChild);
    delete child;
  }
  inforssTraceOut();
}

//-------------------------------------------------------------------------------------------------------------

//-------------------------------------------------------------------------------------------------------------
function getInfoFromUrl(url)
{
  inforssTraceIn();
  gInforssUser = null;
  gInforssPassword = null;
  var getFlag = true;
  if (url.indexOf("https://") == 0)
  {
    var windowManager = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService();
    var windowManagerInterface = windowManager.QueryInterface(Components.interfaces.nsIWindowMediator);
    var topWindow = windowManagerInterface.getMostRecentWindow("navigator:browser");

    var gUser = {
      value: gInforssUser
    };
    var gPassword = {
      value: gInforssPassword
    };
    var dialog = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].createInstance(Components.interfaces.nsIPromptService);
    getFlag = dialog.promptUsernameAndPassword(topWindow, null, gInforssRssBundle.getString("inforss.account") + " " + url, gUser, gPassword, null,
    {
      value: true
    });
    gInforssUser = gUser.value;
    gInforssPassword = gPassword.value;
  }
  if (getFlag == true)
  {
    inforssGetRss(url, "inforssPopulateMenuItem", gInforssUser, gInforssPassword);
  }
  inforssTraceOut();
}

//-------------------------------------------------------------------------------------------------------------
//This isn't so much exported as a callback evals a string which is set to this
//in inforssGetRss
function inforssPopulateMenuItem()
{
  inforssTraceIn();
  try
  {
    var objDOMParser = new DOMParser();
    var objDoc = objDOMParser.parseFromString(gInforssXMLHttpRequest.responseText, "text/xml");
    var str_description = null;
    var str_title = null;
    var str_link = null;
    var feed_flag = false;
    var validFormat = false;

    var format = inforssGetFormat(objDoc);
    if (format == "feed")
    {
      str_description = "tagline";
      str_title = "title";
      str_link = "link";
      feed_flag = true;
      validFormat = true;
    }
    else
    {
      if ((format == "rdf") || (format == "rss"))
      {
        str_description = "description";
        str_title = "title";
        str_link = "link";
        validFormat = true;
      }
    }

    var titles = objDoc.getElementsByTagName(str_title);
    var links = objDoc.getElementsByTagName(str_link);
    var descriptions = objDoc.getElementsByTagName(str_description);
    if ((descriptions.length == 0) && (format == "feed"))
    {
      descriptions = objDoc.getElementsByTagName("title");
    }

    if ((descriptions.length > 0) && (links.length > 0) && (titles.length > 0))
    {
      var elem = inforssAddItemToRSSList(getNodeValue(titles), getNodeValue(descriptions), gInforssUrl, (feed_flag == true) ? getHref(links) : getNodeValue(links), gInforssUser, gInforssPassword, feed_flag);
      delete gInforssXMLHttpRequest;
      var urlIcon = inforssFindIcon(elem);
      if (urlIcon != null)
      {
        elem.setAttribute("icon", urlIcon);
      }
      inforssAddItemToMenu(elem, true);
      window.openDialog("chrome://inforss/content/inforssAdd.xul", "_blank", "chrome,centerscreen,resizable=yes, dialog=no", document.getElementById("inforss-menupopup"), elem);
    }
    else
    {
      alert(gInforssRssBundle.getString("inforss.feed.issue"));
    }

    delete xmlStr;
    delete objDOMParser;
    delete objDoc;
  }
  catch (e)
  {
    inforssDebug(e);
  }
  gInforssXMLHttpRequest = null;
  inforssTraceOut();
}

//-------------------------------------------------------------------------------------------------------------
/* exported inforssMouseUp */
function inforssMouseUp(menu, event)
{
  inforssTraceIn();
  menu.hidePopup();
  if ((event.button == 0) && (event.ctrlKey == false)) // left button
  {
    if (event.target.getAttribute('data') != "trash") // not the trash icon
    {
      if ((event.target.getAttribute('data') != null) && (event.target.getAttribute('data') != ""))
      {
        rssSwitchAll(menu, event.target.getAttribute('data'), event.target.getAttribute('label'), event.target);
      }
      else
      {
        if ((event.target.getAttribute('url') != null) && (event.target.getAttribute('url') != ""))
        {
          gBrowser.addTab(event.target.getAttribute('url'));
        }
      }
    }
  }
  else // right button
  {
    if (event.target.getAttribute('label').indexOf(gInforssRssBundle.getString("inforss.menuadd") + " ") != 0) // not a Add... item
    {
      if (event.type == "mouseup")
      {
        window.openDialog("chrome://inforss/content/inforssSettings.xul", "_blank", "chrome,centerscreen,resizable=yes, dialog=no", event.target);
      }
    }
  }
  inforssTraceOut();
}

//-------------------------------------------------------------------------------------------------------------
function inforssGetItemFromUrl(url)
{
  inforssTraceIn();
  //FIXME Seriously?
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
  inforssTraceOut();
  return (find == true) ? items[i] : null;
}

//-------------------------------------------------------------------------------------------------------------
/* exported getCurrentRSS */
//only used in one file so might be moveable
function getCurrentRSS()
{
  inforssTraceIn();
  //Nearly the same as above
  var items = RSSList.getElementsByTagName("RSS");
  var find = false;
  var i = 0;
  while ((i < items.length) && (find == false))
  {
    if (items[i].getAttribute("selected") == "true")
    {
      find = true;
    }
    else
    {
      i++;
    }
  }
  inforssTraceOut();
  return (find == true) ? items[i] : null;
}

//-----------------------------------------------------------------------------------------------------
function manageRSSChanged(subject, topic, data)
{
  inforssTraceIn();
  try
  {
    if (gInforssMediator != null)
    {
      switch (topic)
      {
        case "reload":
          {
            if (data != null)
            {
              var urls = data.split("|");
              for (var i = 0; i < (urls.length - 1); i++)
              {
                gInforssMediator.deleteRss(urls[i], false);
              }
            }
            delete RSSList;
            inforssClearPopupMenu();
            window.setTimeout("gInforssMediator.init()", 0);
            break;
          }
        case "rssChanged":
          {
            gInforssMediator.deleteAllRss();
            delete RSSList;
            inforssClearPopupMenu();
            window.setTimeout("gInforssMediator.init()", 0);
            break;
          }
        case "viewed":
          {
            var index = data.indexOf("__SEP__");
            var title = data.substring(0, index);
            var link = data.substring(index + 7);
            gInforssMediator.setViewed(title, link);
            break;
          }
        case "banned":
          {
            var index = data.indexOf("__SEP__");
            var title = data.substring(0, index);
            var link = data.substring(index + 7);
            gInforssMediator.setBanned(title, link);
            break;
          }
        case "sync":
          {
            gInforssMediator.sync(data);
            break;
          }
        case "syncBack":
          {
            gInforssMediator.syncBack(data);
            break;
          }
        case "ack":
          {
            gInforssMediator.ack(data);
            break;
          }
        case "popup":
          {
            var index = data.indexOf("__SEP__");
            var url = data.substring(0, index);
            var flag = data.substring(index + 7);
            gInforssMediator.setPopup(url, (flag == "true"));
            break;
          }
        case "newRDF":
          {
            gInforssMediator.newRDF();
            break;
          }
        case "purgeRdf":
          {
            gInforssMediator.purgeRdf();
            break;
          }
        case "clearRdf":
          {
            gInforssMediator.clearRdf();
            break;
          }
        case "addFeed":
          {
            inforssAddNewFeed(
            {
              inforssUrl: data
            });
            break;
          }
      }
    }
  }
  catch (e)
  {
    inforssDebug(e);
  }
  inforssTraceOut();
}

//-----------------------------------------------------------------------------------------------------
/* exported inforssResizeWindow1 */
//Not sure why as it's only used in one place, in another file
function inforssResizeWindow1(event)
{
  inforssTraceIn();
  try
  {
    if (gInforssResizeTimeout != null)
    {
      window.clearTimeout(gInforssResizeTimeout);
    }
    gInforssResizeTimeout = window.setTimeout(inforssResizeWindow, 1000, event);
  }
  catch (e)
  {
    inforssDebug(e);
  }
  inforssTraceOut();
}

//-----------------------------------------------------------------------------------------------------
function inforssResizeWindow(event)
{
  inforssTraceIn();
  try
  {
    gInforssResizeTimeout = null;
    if (gInforssMediator != null)
    {
      gInforssMediator.resizedWindow();
    }
  }
  catch (e)
  {
    inforssDebug(e);
  }
  inforssTraceOut();
}

//-----------------------------------------------------------------------------------------------------
/* exported inforssRelocateBar */
//Though it's only used in one file. Not sure why it should be here.
function inforssRelocateBar()
{
  inforssTraceIn();
  try
  {
    var statuspanelIcon = document.getElementById("inforss-icon");
    var statuspanelNews = document.getElementById("inforss-hbox");
    var headlines = document.getElementById("inforss.headlines");
    var container = headlines.parentNode;
    if (container.getAttribute("id") == "inforss-bar-top")
    {
      var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("inforss.");
      prefs.setBoolPref("toolbar.collapsed", ((container.getAttribute("collapsed") == null) ? false : (container.getAttribute("collapsed") == "true")));
    }

    if (inforssXMLRepository.getSeparateLine() == "false") // in the status bar
    {
      document.getElementById("inforss.resizer").setAttribute("collapsed", "false");
      if (container.getAttribute("id") != "addon-bar")
      {
        container.parentNode.removeChild(container);
        document.getElementById("addon-bar").appendChild(headlines);
        statuspanelNews.setAttribute("flex", "0");
        statuspanelNews.firstChild.setAttribute("flex", "0");
        headlines.setAttribute("flex", "0");
        var box = document.getElementById("inforss.newsbox1");
        if (box != null)
        {
          box.addEventListener("DOMMouseScroll", inforssMouseScroll, false);
        }
      }
    }
    else
    {
      document.getElementById("inforss.resizer").setAttribute("collapsed", "true");
      if (inforssXMLRepository.getLinePosition() == "top")
      {
        if (container.getAttribute("id") != "inforss-bar-top")
        {
          if (container.getAttribute("id") == "inforss-bar-bottom")
          { // was in the bottom bar
            container.parentNode.removeChild(container);
          }
          else
          { // was in the status bar
            headlines.parentNode.removeChild(headlines);
          }
          var statusbar = document.createElement("toolbar");
          statusbar.setAttribute("persist", "collapsed");
          statusbar.setAttribute("id", "inforss-bar-top");
          var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("inforss.");
          var colla = false;
          if (prefs.prefHasUserValue("toolbar.collapsed") == false)
          {
            colla = false;
          }
          else
          {
            colla = prefs.getBoolPref("toolbar.collapsed");
          }
          statusbar.setAttribute("collapsed", colla);
          statusbar.appendChild(headlines);
          var toolbox = document.getElementById("navigator-toolbox");
          if (toolbox == null)
          {
            toolbox = document.getElementById("addon-bar").previousSibling;
            toolbox.parentNode.insertBefore(statusbar, toolbox);
          }
          else
          {
            toolbox.appendChild(statusbar);
          }
          statusbar.setAttribute("toolbarname", "InfoRSS");
          statuspanelNews.setAttribute("flex", "1");
          statuspanelNews.firstChild.setAttribute("flex", "1");
          headlines.setAttribute("flex", "1");
          var box = document.getElementById("inforss.newsbox1");
          if (box != null)
          {
            box.addEventListener("DOMMouseScroll", inforssMouseScroll, false);
          }
        }
      }
      else
      {
        if (container.getAttribute("id") != "inforss-bar-bottom")
        {
          if (container.getAttribute("id") == "inforss-bar-top")
          { // was in the top bar
            container.parentNode.removeChild(container);
          }
          else
          { // was in the status bar
            headlines.parentNode.removeChild(headlines);
          }
          var statusbar = document.createElement("hbox");
          statusbar.setAttribute("id", "inforss-bar-bottom");
          statusbar.appendChild(headlines);
          var toolbar = document.getElementById("addon-bar");
          toolbar.parentNode.insertBefore(statusbar, toolbar);
          statuspanelNews.setAttribute("flex", "1");
          statuspanelNews.firstChild.setAttribute("flex", "1");
          headlines.setAttribute("flex", "1");
          var box = document.getElementById("inforss.newsbox1");
          if (box != null)
          {
            box.addEventListener("DOMMouseScroll", inforssMouseScroll, false);
          }
        }
      }
    }
  }
  catch (e)
  {
    inforssDebug(e);
  }
  inforssTraceOut();
}

//-----------------------------------------------------------------------------------------------------
function inforssDeleteTree(obj)
{
  inforssTraceIn();
  while (obj.firstChild != null)
  {
    obj.removeChild(obj.firstChild);
  }
  inforssTraceOut();
}

//-----------------------------------------------------------------------------------------------------
function inforssEraseNews()
{
  inforssTraceIn();
  inforssDeleteTree(document.getElementById('inforss.newsbox1'));
  inforssTraceOut();
}

//-----------------------------------------------------------------------------------------------------
/* exported inforssResizeHeadlines */
function inforssResizeHeadlines(event)
{
  try
  {
    if (gInforssCanResize == true)
    {
      {
        var delta = event.clientX - gInforssX;
        var hbox = document.getElementById('inforss.newsbox1');
        if ((inforssXMLRepository.getSeparateLine() == "false"))
        {
          if ((hbox.getAttribute("width") != null) && (hbox.getAttribute("width") != ""))
          {
            var width = hbox.getAttribute("width");
            var oldWidth = width;
            var oldX = hbox.boxObject.screenX;
            width = eval(gInforssWidth) - delta;
            if (width > 10)
            {
              inforssXMLRepository.setScrollingArea(width);
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
function inforssSetTimer(obj, func, timer)
{
  return window.setTimeout(inforssHandleTimer, timer, obj, func);
}

//-----------------------------------------------------------------------------------------------------
function inforssGetNewTimerId()
{
  gInforssTimerCounter++;
  if (gInforssTimerCounter > 400)
  {
    gInforssTimerCounter = 0;
  }
  var find = false;
  var i = 0;
  while ((i < gInforssTimerList.length) && (find == false))
  {
    if (gInforssTimerList[i].timerId == gInforssTimerCounter)
    {
      find = true;
    }
    else
    {
      i++;
    }
  }
  if (find == true)
  {
    gInforssTimerCounter = inforssGetNewTimerId();
  }
  return gInforssTimerCounter;
}

//-----------------------------------------------------------------------------------------------------
function inforssHandleTimer(obj, func)
{
  try
  {
    eval("obj." + func + "()");
  }
  catch (e)
  {
    inforssDebug(e);
  }
}


//-----------------------------------------------------------------------------------------------------
//FIXME Does bugger all so remove it
function inforssClearTimer(handle)
{
}

//-----------------------------------------------------------------------------------------------------
function inforssAddNewFeed(menuItem)
{
  try
  {
    var url = menuItem.inforssUrl;
    if (inforssGetItemFromUrl(url) != null) // already exists
    {
      alert(gInforssRssBundle.getString("inforss.duplicate"));
    }
    else
    {
      if (gInforssXMLHttpRequest == null)
      {
        getInfoFromUrl(url); // search for the general information of the feed: title, ...
      }
    }
  }
  catch (e)
  {
    inforssDebug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function onAddNewFeedPopup()
{
  try
  {
    var selectedText = inforssGetMenuSelectedText();
    if (selectedText != null)
    {
      var index = selectedText.indexOf(" ");
      if (index != -1)
      {
        selectedText = selectedText.substring(0, index);
      }
    }
    var menuItem = document.getElementById("inforss.popup.addfeed");
    if (menuItem != null)
    {
      if ((selectedText.indexOf("http://") != -1) || (selectedText.indexOf("https://") != -1))
      {
        menuItem.setAttribute("collapsed", "false");
        menuItem.inforssUrl = selectedText;
      }
      else
      {
        menuItem.setAttribute("collapsed", "true");
      }
    }
  }
  catch (e)
  {
    inforssDebug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function inforssGetMenuSelectedText(concationationChar)
{
  var node = document.popupNode;
  var selection = "";
  var nodeLocalName = "";
  if ((node != null) && (node.localName != null))
  {
    nodeLocalName = node.localName.toUpperCase();
    if ((nodeLocalName == "TEXTAREA") || (nodeLocalName == "INPUT" && node.type == "text"))
    {
      selection = node.value.substring(node.selectionStart, node.selectionEnd);
    }
    else
    {
      if (nodeLocalName == "A")
      {
        selection = node.href;
      }
      else
      {
        if (nodeLocalName == "IMG")
        {
          if ((node.parentNode != null) && (node.parentNode.nodeName == "A"))
          {
            selection = node.parentNode.href;
          }
        }
        else
        {
          var focusedWindow = new XPCNativeWrapper(document.commandDispatcher.focusedWindow, 'document', 'getSelection()');
          selection = focusedWindow.getSelection().toString();
        }
      }
    }
  }
  else
  {
    var focusedWindow = new XPCNativeWrapper(document.commandDispatcher.focusedWindow, 'document', 'getSelection()');
    selection = focusedWindow.getSelection().toString();
  }

  // Limit length to 150 to optimize performance. Longer does not make sense
  if (selection.length >= 150)
  {
    selection = selection.substring(0, 149);
  }
  selection = selection.replace(/(\n|\r|\t)+/g, " ");
  // Strip spaces at start and end.
  selection = selection.replace(/(^\s+)|(\s+$)/g, "");

  return selection;
}


//-----------------------------------------------------------------------------------------------------
function inforssMouseScroll(event)
{
  try
  {
    gInforssMediator.handleMouseScroll(event.detail);
  }
  catch (e)
  {
    inforssDebug(e);
  }
}
