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
Components.utils.import("chrome://inforss/content/modules/inforssPrompt.jsm");

/* globals replace_without_children, remove_all_children */
Components.utils.import("chrome://inforss/content/modules/inforssUtils.jsm");


/* globals inforssCopyRemoteToLocal, inforssCopyLocalToRemote */
/* globals inforssMediator, inforssFeed */
/* globals inforssFindIcon */
/* globals getNodeValue, getHref */
/* globals FeedManager */

//YECHHH. We have two places that can update this global variable.
//From inforssXMLRepository
/* globals inforssXMLRepository, inforssSave */
/* globals inforssGetItemFromUrl */

var gInforssUrl = null;
/* exported gInforssRssBundle */
var gInforssRssBundle = null;
var gInforssXMLHttpRequest = null;
const INFORSS_COMPLETED = 4;
const INFORSS_MAX_SUBMENU = 25;
var gInforssCurrentMenuHandle = null;
var gInforssUser = null;
var gInforssPassword = null;
/* exported gInforssCanResize */
var gInforssCanResize = false;
var gInforssX = null;
var gInforssTimeout = null;
/* exported gInforssMediator */
var gInforssMediator = null;
var gInforssWidth = null;
/* exported gInforssPreventTooltip */
var gInforssPreventTooltip = false;
var gInforssResizeTimeout = null;

const MIME_feed_url = "application/x-inforss-feed-url";
const MIME_feed_type = "application/x-inforss-feed-type";

const ObserverService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
const WindowMediator = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);

//-------------------------------------------------------------------------------------------------------------
/* exported inforssStartExtension */
function inforssStartExtension()
{
  try
  {
    if ((window.arguments != null) || (window.opener != null))
    {
      Components.utils.import("chrome://inforss/content/modules/inforssVersion.jsm");
      //At this point we could/should check if the current version is different
      //to the previous version (probably should wait for the above to return)
      //and throw up a web page.
      //Or probably make this into a bootstrapped extension which would be much
      //nicer all round.
      checkContentHandler();
      ObserverService.addObserver(InforssObserver, "reload", false);
      ObserverService.addObserver(InforssObserver, "banned", false);
      ObserverService.addObserver(InforssObserver, "viewed", false);
      ObserverService.addObserver(InforssObserver, "sync", false);
      ObserverService.addObserver(InforssObserver, "syncBack", false);
      ObserverService.addObserver(InforssObserver, "ack", false);
      ObserverService.addObserver(InforssObserver, "popup", false);
      ObserverService.addObserver(InforssObserver, "newRDF", false);
      ObserverService.addObserver(InforssObserver, "purgeRdf", false);
      ObserverService.addObserver(InforssObserver, "clearRdf", false);
      ObserverService.addObserver(InforssObserver, "rssChanged", false);
      ObserverService.addObserver(InforssObserver, "addFeed", false);
      var serverInfo = inforssXMLRepository.getServerInfo();
      //FIXME This doesn't exist, which means none of the livemark stuff
      //actually works
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

      if ((inforssGetNbWindow() == 1) && (serverInfo.autosync) && (navigator.userAgent.indexOf("Thunderbird") == -1) && (navigator.userAgent.indexOf("Linspire Inc.") == -1))
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
          //fIXME why???
          gInforssMediator.reinit_after(1200);
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
      ObserverService.removeObserver(InforssObserver, "reload");
      ObserverService.removeObserver(InforssObserver, "banned");
      ObserverService.removeObserver(InforssObserver, "viewed");
      ObserverService.removeObserver(InforssObserver, "sync");
      ObserverService.removeObserver(InforssObserver, "syncBack");
      ObserverService.removeObserver(InforssObserver, "ack");
      ObserverService.removeObserver(InforssObserver, "popup");
      ObserverService.removeObserver(InforssObserver, "newRDF");
      ObserverService.removeObserver(InforssObserver, "purgeRdf");
      ObserverService.removeObserver(InforssObserver, "clearRdf");
      ObserverService.removeObserver(InforssObserver, "rssChanged");
      ObserverService.removeObserver(InforssObserver, "addFeed");
      var serverInfo = inforssXMLRepository.getServerInfo();
      if ((inforssGetNbWindow() == 0) && (serverInfo.autosync) && (navigator.vendor != "Thunderbird") && (navigator.vendor != "Linspire Inc."))
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
{}

//-------------------------------------------------------------------------------------------------------------
function inforssGetNbWindow()
{
  //fixME Not sure what this is used for. Only values that are tested for are
  //0 (shutdown) and 1 (startup) to determine some sort of auto-sync of data
  var returnValue = 0;
  try
  {
    var enumerator = WindowMediator.getEnumerator(null);
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
    gInforssTimeout = window.setTimeout(inforssHandleTimeout, 10000);
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
    inforssDebug(e);
    console.log(url, callback);
  }
  inforssTraceOut();
}


//------------------------------------------------------------------------------
function inforssHandleTimeout()
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
        if (found)
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
          child = nextChild;
        }
        else
        {
          if (found)
          {
            if (child.nodeName == "menuseparator")
            {
              stop = true;
            }
            else
            {
              nextChild = child.nextSibling;
              menupopup.removeChild(child);
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
    //FIXME Why not iterate over children rather than doing nextsibling?
    var child = document.getElementById("inforss-menupopup").firstChild;
    while (child != null)
    {
      var subElement = document.getAnonymousNodes(child);

      if (subElement != null && subElement.length > 0 &&
          subElement[0] != null && subElement[0].firstChild != null &&
          subElement[0].firstChild.localName == "image")
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
        let menupopup = child.firstChild;
        if (menupopup != null)
        {
          let id = menupopup.getAttribute("id");
          let index = id.indexOf("-");
          //FIXME why not addEventListener
          if (menupopup.getAttribute("type") == "rss" ||
              menupopup.getAttribute("type") == "atom")
          {
            menupopup.setAttribute("onpopupshowing", "return inforssSubMenu(" + id.substring(index + 1) + ");");
          }
          else
          {
            menupopup.setAttribute("onpopupshowing", "return false");
          }
          menupopup = replace_without_children(menupopup);
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
        if (inforssXMLRepository.isCurrentFeed())
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

      if (inforssXMLRepository.isClipboard())
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
      if ((inforssXMLRepository.isLivemark()) && (gBrowser != null))
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
    if ((event.button == 2) || (event.ctrlKey))
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
  const option_window = WindowMediator.getMostRecentWindow("inforssOption");
  if (option_window == null)
  {
    window.openDialog("chrome://inforss/content/inforssOption.xul", "_blank", "chrome,centerscreen,resizable=yes,dialog=no");
  }
  else
  {
    option_window.focus();
  }
}

//-------------------------------------------------------------------------------------------------------------
function inforssAddaAddSubMenu(nb, data, label)
{
  inforssTraceIn();
  var menupopup = document.getElementById("inforss-menupopup");
  var separators = menupopup.getElementsByTagName("menuseparator");
  var separator = separators.item(separators.length - 1);
  var menuItem = document.createElement("menuitem");
  var labelStr = gInforssRssBundle.getString("inforss.menuadd") + " " + label;
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
    if ((changed) || (inforssXMLRepository.isActive()))
    {
      document.getElementById('newsbar1').label = null;
      document.getElementById('newsbar1').style.visibility = "hidden";
    }
    inforssSave();
  }
  inforssTraceOut();
}

//------------------------------------------------------------------------------
//Utility function to determine if a drag has the required data type
function has_data_type(event, required_type)
{
  //'Legacy' way.
  if (event.dataTransfer.types instanceof DOMStringList)
  {
    for (let data_type of event.dataTransfer.types)
    {
      if (data_type == required_type)
      {
        return true;
      }
    }
  }
  else
  {
    //New way according to HTML spec.
    return event.dataTransfer.types.includes(required_type);
  }
  return false;
}

//------------------------------------------------------------------------------
//This allows drop onto the inforss icon. Due to the somewhat arcane nature
//of the way things work, we also get drag events from the menu we pop up from
//here, so we check if we're dragging onto the right place.
//Also stop drags from the popup menu onto here, because it's not really very
//helpful.

/* exported icon_observer */
const icon_observer = {
  on_drag_over: function(event)
  {
    if (event.target.id != "inforss-icon" ||
      has_data_type(event, MIME_feed_url))
    {
      return;
    }
    //TODO support text/uri-list?
    if (has_data_type(event, 'text/plain'))
    {
      event.dataTransfer.dropEffect = "copy";
      event.preventDefault();
    }
  },

  //Dropping onto the icon adds the feed (if possible)
  on_drop: function(event)
  {
    let url = event.dataTransfer.getData('text/plain');
    if (url.indexOf("\n") != -1)
    {
      url = url.substring(0, url.indexOf("\n"));
    }
    //Moderately horrible construction which basically sees if the URL is valid
    try
    {
      url = new URL(url);
      if (url.protocol != "file:" && url.protocol != "http:" &&
        url.protocol != "https:" && url.protocol != "news:")
      {
        throw 'bad protocol';
      }
    }
    catch (e)
    {
      alert(gInforssRssBundle.getString("inforss.malformedUrl"));
      return;
    }
    if (inforssGetItemFromUrl(url.href) != null)
    {
      alert(gInforssRssBundle.getString("inforss.duplicate"));
    }
    else
    {
      getInfoFromUrl(url.href);
      inforssSave();
    }
    event.stopPropagation();
  },
};

const menu_observer = {
  on_drag_start: function(event)
  {
    const target = event.target;
    const data = event.dataTransfer;
    const url = target.getAttribute("url");
    if (target.hasAttribute("image"))
    {
      //This isn't a submenu popout, so add the feed url and the type
      data.setData(MIME_feed_url, url);
      data.setData(MIME_feed_type, target.getAttribute("inforsstype"));
    }
    data.setData("text/uri-list", url);
    data.setData("text/unicode", url);
  },

  on_drag_over: function(event)
  {
    if (has_data_type(event, MIME_feed_type))
    {
      //It's a feed/group
      if (event.dataTransfer.getData(MIME_feed_type) != "group")
      {
        //It's not a group. Allow it to be moved/copied
        event.dataTransfer.dropEffect = inforssXMLRepository.isIncludeAssociated() ? "copy" : "move";
        event.preventDefault();
      }
    }
  },

  on_drop: function(event)
  {
    const source_url = event.dataTransfer.getData(MIME_feed_url);
    const source_rss = inforssGetItemFromUrl(source_url);
    const dest_url = event.target.getAttribute("url");
    const dest_rss = inforssGetItemFromUrl(dest_url);
    if (source_rss != null && dest_rss != null)
    {
      const info = gInforssMediator.locateFeed(dest_url).info;
      if (!info.containsFeed(source_url))
      {
        info.addNewFeed(source_url);
        ObserverService.notifyObservers(null, "reload", null);
      }
    }
    event.stopPropagation();
  }
};

//------------------------------------------------------------------------------
/* exported trash_observer */
//This handles drag and drop onto the trash icon on the popup menu
const trash_observer = {
  on_drag_over: function(event)
  {
    if (has_data_type(event, MIME_feed_url))
    {
      event.dataTransfer.dropEffect = "move";
      event.preventDefault();
    }
  },

  on_drop: function(event)
  {
    gInforssMediator.deleteRss(event.dataTransfer.getData('text/uri-list'));
    inforssSave();
    event.stopPropagation();
  }
};

//This handles drag and drop onto the scrolling list on the status bar
//If this is a group, it'll add the currently selected item to the group.
/* exported bar_observer */
const bar_observer = {
  on_drag_over: function(event)
  {
    let selectedInfo = gInforssMediator.getSelectedInfo(true);
    if (selectedInfo == null || selectedInfo.getType() != "group")
    {
      return;
    }
    if (has_data_type(event, MIME_feed_type))
    {
      //It's a feed/group
      if (event.dataTransfer.getData(MIME_feed_type) != "group")
      {
        //It's not a group. Allow it to be moved/copied
        event.dataTransfer.dropEffect = inforssXMLRepository.isIncludeAssociated() ? "copy" : "move";
        event.preventDefault();
      }
    }
  },

  on_drop: function(event)
  {
    document.getElementById("inforss-menupopup").hidePopup();
    let url = event.dataTransfer.getData(MIME_feed_url);
    let selectedInfo = gInforssMediator.getSelectedInfo(true);
    if (!selectedInfo.containsFeed(url))
    {
      selectedInfo.addNewFeed(url);
    }
    event.stopPropagation();
  }
};

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
function inforssAddItemToMenu(rss)
{
  inforssTraceIn();
  try
  {
    if (document.getElementById("inforss-menupopup") != null)
    {
      let menuItem = null;
      if ((rss.getAttribute("groupAssociated") == "false") || (inforssXMLRepository.isIncludeAssociated()))
      {
        let typeObject = inforssXMLRepository.show_headlines_in_sub_menu() &&
          (rss.getAttribute("type") == "rss" ||
            rss.getAttribute("type") == "atom") ?
          "menu" : "menuitem";

        let items = document.getElementById("inforss-menupopup").getElementsByTagName(typeObject);

        menuItem = document.createElement(typeObject);

        //This is moderately strange. it does what you expect if you
        //display submenus, but then it doesn't indicate the currently
        //selected feed. If however, you don't display as submenus, then
        //you don't get icons but you do get a selected one.
        //if you make this a radio button it completely removes the icons,
        //unless they have submenus
        //menuItem.setAttribute("type", "radio");
        menuItem.setAttribute("label", rss.getAttribute("title"));
        menuItem.setAttribute("value", rss.getAttribute("title"));

        menuItem.setAttribute("data", rss.getAttribute("url"));
        menuItem.setAttribute("url", rss.getAttribute("url"));
        menuItem.setAttribute("checked", false);
        menuItem.setAttribute("autocheck", false);
        if (rss.getAttribute("description") != "")
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

        if (rss.getAttribute("type") == "group")
        {
          //Allow as drop target
          menuItem.addEventListener("dragover", menu_observer.on_drag_over);
          menuItem.addEventListener("drop", menu_observer.on_drop);
        }

        menuItem.addEventListener("dragstart", menu_observer.on_drag_start);

        if (typeObject == "menu")
        {
          let menupopup = document.createElement("menupopup");
          menupopup.setAttribute("type", rss.getAttribute("type"));
          //FIXME Seriously. use addEventListener
          menupopup.setAttribute("onpopupshowing", "return inforssSubMenu(" + items.length + ");");
          menupopup.setAttribute("onpopuphiding", "return inforssSubMenu2();");
          //?
          menupopup.setAttribute("id", "inforss.menupopup-" + items.length);
          inforssAddNoData(menupopup);
          menuItem.appendChild(menupopup);
        }

        if (inforssXMLRepository.getSortedMenu() != "no")
        {
          let indexItem = inforssLocateMenuItem(rss.getAttribute("title"));
          document.getElementById("inforss-menupopup").insertBefore(menuItem, indexItem);
        }
        else
        {
          document.getElementById("inforss-menupopup").appendChild(menuItem);
        }
      }
      gInforssMediator.addFeed(rss, menuItem);
    }
  }
  catch (e)
  {
    inforssDebug(e);
  }
  inforssTraceOut();
}



//------------------------------------------------------------------------------
/* exported inforssSubMenu */
function inforssSubMenu(index)
{
  inforssTraceIn();
  inforssSubMenu2();
  var res;
  if (inforssXMLRepository.show_headlines_in_sub_menu())
  {
    gInforssCurrentMenuHandle = window.setTimeout(inforssSubMenu1, 3000, index);
    res = true;
  }
  else
  {
    res = false;
  }
  inforssTraceOut();
  return res;
}

//------------------------------------------------------------------------------
/* exported inforssSubMenu1 */
//This is the timeout callback from above. ick.
function inforssSubMenu1(index)
{
  inforssTraceIn();
  try
  {
    gInforssCurrentMenuHandle = null;

    let popup = document.getElementById("inforss.menupopup-" + index);
    //Need to do this to stop the sub-menu disappearing
    popup.setAttribute("onpopupshowing", null);

    //Sadly you can't use replace_without_children here - it appears the
    //browser has got hold of the element and doesn't spot we've replaced it
    //with another one. so we have to change this element in place.
    remove_all_children(popup);

    let item = document.getElementById("inforss.menuitem-" + index);
    let url = item.getAttribute("url");
    let rss = inforssGetItemFromUrl(url);
    let xmlHttpRequest = new XMLHttpRequest();
    xmlHttpRequest.open("GET", url, false, rss.getAttribute("user"), inforssXMLRepository.readPassword(url, rss.getAttribute("user")));
    xmlHttpRequest.overrideMimeType("application/xml");
    xmlHttpRequest.send(null);

    let fm = new FeedManager();
    fm.parse(xmlHttpRequest);
    let max = Math.min(INFORSS_MAX_SUBMENU, fm.rssFeeds.length);
    for (let i = 0; i < max; i++)
    {
      let newElem = document.createElement("menuitem");
      let newTitle = inforssFeed.htmlFormatConvert(fm.rssFeeds[i].title);
      if (newTitle != null)
      {
        let re = new RegExp('\n', 'gi');
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

//-------------------------------------------------------------------------------------------------------------
function getInfoFromUrl(url)
{
  inforssTraceIn();
  gInforssUser = null;
  gInforssPassword = null;
  var getFlag = true;
  if (url.indexOf("https://") == 0)
  {
    var topWindow = WindowMediator.getMostRecentWindow("navigator:browser");

    var gUser = {
      value: gInforssUser
    };
    var gPassword = {
      value: gInforssPassword
    };
    //FIXME use the popup component
    var dialog = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].createInstance(Components.interfaces.nsIPromptService);
    getFlag = dialog.promptUsernameAndPassword(topWindow, null, gInforssRssBundle.getString("inforss.account") + " " + url, gUser, gPassword, null,
    {
      value: true
    });
    gInforssUser = gUser.value;
    gInforssPassword = gPassword.value;
  }
  if (getFlag)
  {
    inforssGetRss(url, "inforssPopulateMenuItem", gInforssUser, gInforssPassword);
  }
  inforssTraceOut();
}

//-------------------------------------------------------------------------------------------------------------
//This isn't so much exported as a callback evals a string which is set to this
//in inforssGetRss
/* exported inforssPopulateMenuItem */
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
    let feed_flag = "rss";

    var format = objDoc.documentElement.nodeName;
    if (format == "feed")
    {
      str_description = "tagline";
      str_title = "title";
      str_link = "link";
      feed_flag = "atom";
    }
    else if (format == "rdf" || format == "rss")
    {
      str_description = "description";
      str_title = "title";
      str_link = "link";
    }
    //FIXME if we get to the else, what should we be doing?

    var titles = objDoc.getElementsByTagName(str_title);
    var links = objDoc.getElementsByTagName(str_link);
    var descriptions = objDoc.getElementsByTagName(str_description);
    if ((descriptions.length == 0) && (format == "feed"))
    {
      descriptions = objDoc.getElementsByTagName("title");
    }

    if ((descriptions.length > 0) && (links.length > 0) && (titles.length > 0))
    {
      var elem = inforssXMLRepository.add_item(getNodeValue(titles), getNodeValue(descriptions), gInforssUrl, feed_flag == "atom" ? getHref(links) : getNodeValue(links), gInforssUser, gInforssPassword, feed_flag);
      elem.setAttribute("icon", inforssFindIcon(elem));
      inforssAddItemToMenu(elem);
      inforssSave();

      //FIXME Does it really need to pass the whole tree for this?
      window.openDialog("chrome://inforss/content/inforssAdd.xul", "_blank", "chrome,centerscreen,resizable=yes, dialog=no", document.getElementById("inforss-menupopup"), elem);
    }
    else
    {
      alert(gInforssRssBundle.getString("inforss.feed.issue"));
    }
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
  menu.hidePopup();
  if (event.button == 0 && !event.ctrlKey) // left button
  {
    if (event.target.getAttribute('data') != "trash") // not the trash icon
    {
      if (event.target.getAttribute('data') != null &&
          event.target.getAttribute('data') != "")
      {
        rssSwitchAll(menu,
                     event.target.getAttribute('data'),
                     event.target.getAttribute('label'),
                     event.target);
      }
      else
      {
        if (event.target.getAttribute('url') != null &&
            event.target.getAttribute('url') != "")
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
        //See if I have a settings window open already
        const windows = WindowMediator.getEnumerator("inforssSettings");
        while (windows.hasMoreElements())
        {
          const settings_window = windows.getNext();
          if (settings_window.arguments[0].getAttribute("url") == event.target.getAttribute("url"))
          {
            settings_window.focus();
            return;
          }
        }
        window.openDialog("chrome://inforss/content/inforssSettings.xul", "_blank", "chrome,centerscreen,resizable=yes, dialog=no", event.target);
      }
    }
  }
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
                gInforssMediator.deleteRss(urls[i]);
              }
            }
            inforssClearPopupMenu();
            gInforssMediator.reinit_after(0);
            break;
          }
        case "rssChanged":
          {
            gInforssMediator.deleteAllRss();
            inforssClearPopupMenu();
            gInforssMediator.reinit_after(0);
            break;
          }
        case "viewed":
          {
            let index = data.indexOf("__SEP__");
            let title = data.substring(0, index);
            let link = data.substring(index + 7);
            gInforssMediator.setViewed(title, link);
            break;
          }
        case "banned":
          {
            let index = data.indexOf("__SEP__");
            let title = data.substring(0, index);
            let link = data.substring(index + 7);
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
            let index = data.indexOf("__SEP__");
            let url = data.substring(0, index);
            let flag = data.substring(index + 7);
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
    var statuspanelNews = document.getElementById("inforss-hbox");
    var headlines = document.getElementById("inforss.headlines");
    var container = headlines.parentNode;
    if (container.getAttribute("id") == "inforss-bar-top")
    {
      let prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("inforss.");
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
        let box = document.getElementById("inforss.newsbox1");
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
          let statusbar = document.createElement("toolbar");
          statusbar.setAttribute("persist", "collapsed");
          statusbar.setAttribute("id", "inforss-bar-top");
          let prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("inforss.");
          let colla = false;
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
          let box = document.getElementById("inforss.newsbox1");
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
          let statusbar = document.createElement("hbox");
          statusbar.setAttribute("id", "inforss-bar-bottom");
          statusbar.appendChild(headlines);
          let toolbar = document.getElementById("addon-bar");
          toolbar.parentNode.insertBefore(statusbar, toolbar);
          statuspanelNews.setAttribute("flex", "1");
          statuspanelNews.firstChild.setAttribute("flex", "1");
          headlines.setAttribute("flex", "1");
          let box = document.getElementById("inforss.newsbox1");
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

//------------------------------------------------------------------------------
/* exported inforssResizeHeadlines */
function inforssResizeHeadlines(event)
{
  try
  {
    if (gInforssCanResize)
    {
      {
        var delta = event.clientX - gInforssX;
        var hbox = document.getElementById('inforss.newsbox1');
        if ((inforssXMLRepository.getSeparateLine() == "false"))
        {
          if ((hbox.getAttribute("width") != null) && (hbox.getAttribute("width") != ""))
          {
            var width = hbox.getAttribute("width");
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
function inforssGetMenuSelectedText()
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
          let focusedWindow = new XPCNativeWrapper(document.commandDispatcher.focusedWindow, 'document', 'getSelection()');
          selection = focusedWindow.getSelection().toString();
        }
      }
    }
  }
  else
  {
    let focusedWindow = new XPCNativeWrapper(document.commandDispatcher.focusedWindow, 'document', 'getSelection()');
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
