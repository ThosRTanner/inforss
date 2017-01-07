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
var gInforssCallbackFunction = null;
var gInforssUrl = null;
var gInforssRssBundle = null;
var gInforssXMLHttpRequest = null;
const INFORSS_COMPLETED = 4;
const INFORSS_MAX_SUBMENU = 25;
const INFORSS_VERSION_NUMBER = "1.4.1";
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
var gInforssPreventTooltip = false;
var gInforssCounter = 0;
var gInforssSpacerEnd = null;
var gInforssNewbox1 = null;
var gInforssResizeTimeout = null;

//if (navigator.vendor == "Linspire Inc.")
//{
//  window.setTimeout(inforssStartExtension, 4000);
//}
//-------------------------------------------------------------------------------------------------------------
function inforssStartExtension()
{
//dump("start\n");
  try
  {
//dump("start 0\n");
//if (window.opener != null) inforssInspect(window.opener);
//alert(window.opener + " / " + window.arguments + " / " + (window.arguments == "") + " / " + (window.arguments != null));
    if ((window.arguments != null) || (window.opener != null))
    {
//dump("start 1=" + window.arguments[0] + "\n");
      inforssCheckVersion();
      checkContentHandler();
//      installProtocol();
      var inforssObserverService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
      inforssObserverService.addObserver(InforssObserver,"reload",false);
      inforssObserverService.addObserver(InforssObserver,"banned",false);
      inforssObserverService.addObserver(InforssObserver,"viewed",false);
      inforssObserverService.addObserver(InforssObserver,"sync",false);
      inforssObserverService.addObserver(InforssObserver,"syncBack",false);
      inforssObserverService.addObserver(InforssObserver,"ack",false);
      inforssObserverService.addObserver(InforssObserver,"popup",false);
      inforssObserverService.addObserver(InforssObserver,"newRDF",false);
      inforssObserverService.addObserver(InforssObserver,"purgeRdf",false);
      inforssObserverService.addObserver(InforssObserver,"clearRdf",false);
      inforssObserverService.addObserver(InforssObserver,"rssChanged",false);
      inforssObserverService.addObserver(InforssObserver,"addFeed",false);
      var serverInfo = inforssXMLRepository.getServerInfo();
      var lb = document.getElementById("livemark-button");
      if (lb != null)
      {
        lb.addEventListener("popupshowing", inforssAddItemToLivemarkMenu, false);
      }
      var box = document.getElementById("inforss.newsbox1");
      if (box != null)
      {
//dump("an event handler has been set for the mouse wheel\n");
        box.addEventListener("DOMMouseScroll", inforssMouseScroll, false);
      }

      if ((inforssGetNbWindow() == 1) && (serverInfo.autosync == true) && (navigator.userAgent.indexOf("Thunderbird") == -1) && (navigator.userAgent.indexOf("Linspire Inc.") == -1))
      {
//dump("start 2 didier\n");
        inforssCopyRemoteToLocal(serverInfo.protocol, serverInfo.server, serverInfo.directory, serverInfo.user, serverInfo.password, inforssStartExtension1);
//dump("start 3\n");
//        inforssStartExtension1();
      }
      else
      {
//dump("start 3\n");
        inforssStartExtension1();
      }
    }
    else
    {
//dump("start 4\n");
      if (document.getElementById("inforss.headlines") != null)
      {
        document.getElementById("inforss.headlines").setAttribute("collapsed","true");
//dump("start 5\n");
      }
    }
//    var statusbar = document.getElementById("status-bar");
//    statusbar.addEventListener("DOMAttrModified", function(event) { dump('coucou ' + event.attrName + ' ' + event.prevValue + ' ' + event.newValue + '\n') }, false);
//    statusbar.addEventListener("onoverflow", function(event) { alert('coucou onoverflow') }, false);
//    statusbar.addEventListener("onunderflow", function(event) { alert('coucou onunderflow') }, false);
  }
  catch(e)
  {
//    alert(e);
  	dump(e + "\n");
  }
}

//-------------------------------------------------------------------------------------------------------------
function checkContentHandler()
{
  try
  {
/*
    netscape.security.PrivilegeManager.enablePrivilege("UniversalBrowserRead");
    var wccr = Components.classes["@mozilla.org/embeddor.implemented/web-content-handler-registrar;1"].getService(Components.interfaces.nsIWebContentConverterService);
    var handlers = wccr.getContentHandlers("application/vnd.mozilla.maybe.feed", {});
    if (handlers.length == 0)
      return;

    for (var i = 0; i < handlers.length; ++i) {
      dump(handlers[i].name + "\n");
      dump(handlers[i].uri + "\n");
    }
    if (wccr.getWebContentHandlerByURI("application/vnd.mozilla.maybe.feed", "feed://%s") == null)
    {
      wccr.registerContentHandler("application/vnd.mozilla.maybe.feed", "feed://%s", "InfoRSS", document.contentWindow);
    }
*/
    var ps = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
    var i = 0;
    var found = false;
    var typeBranch = null;
    while (found == false) 
    {
      typeBranch = ps.getBranch("browser.contentHandlers.types." + i + ".");
      try 
      {
        found = (typeBranch.getCharPref("title") == "InfoRSS")
        ++i;
      }
      catch (e) {
        // No more handlers
        break;
      }
    }
//    if (found == false)
    {
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
/*
    var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("browser.contentHandlers.types.");
    prefs.setCharPref("3.title", "InfoRSS");
    prefs.setCharPref("3.uri", "feed://%s");
    prefs.setCharPref("3.type", "application/vnd.mozilla.maybe.feed");
*/
  }
  catch(e)
  {
    alert(e);
  }
}

function testCall()
{
  dump("testCall\n");
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
        element.setAttribute("label",gInforssRssBundle.getString("inforss.menuadd1"));
        menupopup.appendChild(element);
        menupopup = document.createElement("menupopup");
        element.appendChild(menupopup);
        menupopup.addEventListener("popupshowing", function(event) {event.cancelBubble = true;event.stopPropagation();event.preventBubble(); return true;}, false);
//           menupopup.setAttribute("onpopupshowing","return inforssSubMenu(" + items.length + ");");
//           menupopup.setAttribute("onpopuphiding","return inforssSubMenu2();");
        var markinfo = null;
	    for (var i = 0; i < livemarkLinks.length; i++)
	    {
	      markinfo = livemarkLinks[i];
          if ((markinfo.type == "application/rss+xml") || (markinfo.type == "application/xml") || 
              (markinfo.type == "application/atom+xml") || (markinfo.type == "text/xml"))
	      {
            element = document.createElement("menuitem");
            element.setAttribute("label",gInforssRssBundle.getString("inforss.menuadd") + " " + markinfo.title + "(" + markinfo.href + ")");
            element.setAttribute("tooltiptext",markinfo.href);
            element.setAttribute("data",markinfo.href);
            menupopup.appendChild(element);
            element.addEventListener("command", inforssLivemarkCommand, false);
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

//-------------------------------------------------------------------------------------------------------------
function inforssLivemarkCommand(event)
{
  try
  {
    rssSwitchAll(event.target.parentNode, event.target.getAttribute("data"), event.target.getAttribute("label"), null)
    event.cancelBubble = true;
    event.stopPropagation();
    event.preventBubble();
  }
  catch(e)
  {
    inforssDebug(e);
  }
}


//-------------------------------------------------------------------------------------------------------------
function inforssStartExtension1(step, status)
{
//dump("inforssStartExtension1\n");
  try
  {
    if ((step == null) || (step != "send"))
    {
	  if (document.getElementById("inforss.headlines") != null) // only if the page is loaded
	  {
        if (gInforssMediator == null)
        {
//dump("inforssStartExtension1 step2\n");
          gInforssRssBundle = document.getElementById("bundle_inforss");
          gInforssMediator = new inforssMediator();
//          gInforssMediator.init();
          inforssSetTimer(gInforssMediator, "init", 1200);
          if (document.getElementById("contentAreaContextMenu") != null)
          {
            document.getElementById("contentAreaContextMenu").addEventListener("popupshowing", onAddNewFeedPopup,false);
          }
          else
          {
            if (document.getElementById("messagePaneContext") != null)
            {
              document.getElementById("messagePaneContext").addEventListener("popupshowing", onAddNewFeedPopup,false);
            }
            else
            {
              if (document.getElementById("msgComposeContext") != null)
              {
                document.getElementById("msgComposeContext").addEventListener("popupshowing",onAddNewFeedPopup,false);
              }
            }
          }
        }
      }
    }
    else
    {
//      alert(step + " " + status);
    }
  }
  catch(e)
  {
    alert(e);
  }
}


//-------------------------------------------------------------------------------------------------------------
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
        prefs.setBoolPref("toolbar.collapsed", ((bartop.getAttribute("collapsed") == null)? false : (bartop.getAttribute("collapsed") == "true")));
//dump("collapsed=" + ((bartop.getAttribute("collapsed") == null)? false : bartop.getAttribute("collapsed")) + "\n");
      }
      var inforssObserverService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
      inforssObserverService.removeObserver(InforssObserver,"reload");
      inforssObserverService.removeObserver(InforssObserver,"banned");
      inforssObserverService.removeObserver(InforssObserver,"viewed");
      inforssObserverService.removeObserver(InforssObserver,"sync");
      inforssObserverService.removeObserver(InforssObserver,"syncBack");
      inforssObserverService.removeObserver(InforssObserver,"ack");
      inforssObserverService.removeObserver(InforssObserver,"popup");
      inforssObserverService.removeObserver(InforssObserver,"newRDF");
      inforssObserverService.removeObserver(InforssObserver,"purgeRdf");
      inforssObserverService.removeObserver(InforssObserver,"clearRdf");
      inforssObserverService.removeObserver(InforssObserver,"rssChanged");
      inforssObserverService.removeObserver(InforssObserver,"addFeed");
      var serverInfo = inforssXMLRepository.getServerInfo();
      if ((inforssGetNbWindow() == 0) && (serverInfo.autosync == true) && (navigator.vendor != "Thunderbird")  && (navigator.vendor != "Linspire Inc."))
      {
        inforssCopyLocalToRemote(serverInfo.protocol, serverInfo.server, serverInfo.directory, serverInfo.user, serverInfo.password, inforssStopExtension1, false);
//      window.openDialog("chrome://inforss/content/inforssAlert.xul","_blank","chrome,centerscreen,resizable=yes, dialog=no", "wait until finish");
      }
    }
  }
  catch(e)
  {
    inforssDebug(e);
  }
}

//-------------------------------------------------------------------------------------------------------------
function inforssStopExtension1(step, status)
{
  try
  {
//    dump("apres push " + step + " " + status + "\n");
  }
  catch(e)
  {
    inforssDebug(e);
  }
}

//-------------------------------------------------------------------------------------------------------------
function inforssGetNbWindow()
{
  var returnValue = 0;
  try
  {
    var windowManager = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService();
    var windowManagerInterface = windowManager.QueryInterface( Components.interfaces.nsIWindowMediator);
    var enumerator = windowManagerInterface.getEnumerator(null);
    while (enumerator.hasMoreElements())
    {
      returnValue++;
      enumerator.getNext();
    }
  }
  catch(e)
  {
    inforssDebug(e);
  }
//dump("inforssGetNbWindow=" + returnValue + "\n");
  return returnValue;
}


//-------------------------------------------------------------------------------------------------------------
var InforssObserver =
{
  observe : function(subject, topic, data)
  {
    manageRSSChanged(subject, topic, data);
  }
};


//-------------------------------------------------------------------------------------------------------------
function inforssGetRss(url, callback, user, password)
{
  inforssTraceIn();
//alert("getRss=" + url + "\n");
//dump("getRss: " + url + " / " + callback + "\n");
//dump("getRss=" + url);
    try
    {
      netscape.security.PrivilegeManager.enablePrivilege("UniversalBrowserRead");
      if (gInforssXMLHttpRequest != null)
      {
//alert("abort");
        gInforssXMLHttpRequest.abort();
      }

//dump("  old=" + gInforssTimeout);
	  if (gInforssTimeout != null)
	  {
//alert("clearTimeout");
	    window.clearTimeout(gInforssTimeout);
	    gInforssTimeout = null;
	  }
	  gInforssTimeout = window.setTimeout("inforssHandleTimeout('" + url + "')", 10000);
//dump("  new=" + gInforssTimeout + "\n");
      gInforssUrl = url;
      gInforssXMLHttpRequest = new XMLHttpRequest();
//      gInforssXMLHttpRequest.onload = eval(callback);
//      gInforssXMLHttpRequest.onerror = inforssErrorMacNews;
      gInforssXMLHttpRequest.callback = callback;
      gInforssXMLHttpRequest.user = user;
      gInforssXMLHttpRequest.password = password;
      gInforssXMLHttpRequest.onreadystatechange = inforssProcessReqChange;
      gInforssXMLHttpRequest.open("GET", url, true, user, password);
//      gInforssXMLHttpRequest.setRequestHeader('Accept','application/rss+xml')
//      gInforssXMLHttpRequest.setRequestHeader('Cache-Control','no-cache')
//      gInforssXMLHttpRequest.setRequestHeader("Content-Length","0");
	  gInforssXMLHttpRequest.setRequestHeader("User-Agent", "Mozilla/5.0");
	  gInforssXMLHttpRequest.overrideMimeType("application/xml");
	  gInforssXMLHttpRequest.send(null);
//alert("send");
    }
    catch(e)
    {
//alert(e);
      inforssDebug(e + "/" + url + "/" + callback);
    }
  inforssTraceOut();
}


//-------------------------------------------------------------------------------------------------------------
function inforssHandleTimeout(url)
{
  inforssTraceIn();
//alert("handleTimeout=" + url + " timeout=" + gInforssTimeout + "\n");
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
//dump("processReqChange=" + gInforssUrl + "\n");
//alert("processReqChange:" + gInforssXMLHttpRequest.readyState + "/" + gInforssXMLHttpRequest.status);
    // only if req shows "loaded"
  try
  {
//dump("gInforssXMLHttpRequest.readyState =" + gInforssXMLHttpRequest.readyState + "\n");
    if (gInforssXMLHttpRequest.readyState == INFORSS_COMPLETED)
    {
//dump("gInforssXMLHttpRequest.status =" + gInforssXMLHttpRequest.status + "\n");
        // only if "OK"
        if ((gInforssXMLHttpRequest.status == 200) ||
            (gInforssXMLHttpRequest.status == 201) ||
            (gInforssXMLHttpRequest.status == 202))
        {
//inforssAlert("ReqChange:" + gInforssUrl + "/" + gInforssCounter + "/" + gInforssCallbackFunction);
//gInforssCounter++;
          if (gInforssTimeout != null)
          {
//dump("processReqChange clearTimeout=" + gInforssTimeout + "\n");
            window.clearTimeout(gInforssTimeout);
            gInforssTimeout = null;
          }
          eval(gInforssXMLHttpRequest.callback + "()");
        }
        else
        {
          if (gInforssXMLHttpRequest.status == 302)
          {
//dump("Redirect=" + gInforssXMLHttpRequest.getResponseHeader("Location") + "\n");     
            var url = gInforssXMLHttpRequest.getResponseHeader("Location");    
            if (url != null)
            {
              inforssGetRss(url, gInforssXMLHttpRequest.callback, gInforssXMLHttpRequest.user, gInforssXMLHttpRequest.password);
            }
          }
          else
          {
            inforssDebug("processReqChange" , "There was a problem retrieving the XML data:\n" + gInforssXMLHttpRequest.statusText + "/" + gInforssXMLHttpRequest.status + "\nUrl=" + gInforssUrl);
          }
        }
    }
  }
  catch(e)
  {
    inforssDebug(e);
  }
  inforssTraceOut();
}

//-------------------------------------------------------------------------------------------------------------
function inforssErrorMacNews()
{
  inforssTraceIn();
    inforssDebug("errorMacNews", "There was a problem retrieving the XML data:\n" + gInforssXMLHttpRequest.status + "/" + gInforssXMLHttpRequest.statusText + "\n" + gInforssUrl);
//    alert(gInforssXMLHttpRequest.responseText);
    delete gInforssXMLHttpRequest;
    gInforssXMLHttpRequest = null;
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
  catch(e)
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
  catch(e)
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

      if ((subElement != null) && (subElement.length > 0) && (subElement[0] != null) && (subElement[0].firstChild != null) && (subElement[0].firstChild.localName =="image"))
      {
        subElement[0].firstChild.setAttribute("maxwidth","16");
        subElement[0].firstChild.setAttribute("maxheight","16");
        subElement[0].firstChild.setAttribute("minwidth","16");
        subElement[0].firstChild.setAttribute("minheight","16");


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
            menupopup.setAttribute("onpopupshowing","return inforssSubMenu(" + id.substring(index+1) + ");");
          }
          else
          {
            menupopup.setAttribute("onpopupshowing","return false");
          }
          inforssResetPopup(menupopup);
          inforssAddNoData(menupopup);
        }
      }
      child = child.nextSibling;
    }
  }
  catch(e)
  {
    inforssDebug(e);
  }
  inforssTraceOut();
}

//-------------------------------------------------------------------------------------------------------------
function rssFillPopup(obj, event)
{
  inforssTraceIn();
  try
  {
//inforssAlert("rssFillPopup" + "/" + (gInforssCounter++) + "/" + event.target.getAttribute("id"));
//dump(navigator.userAgent + " " + event.button + " " + event.ctrlKey + "\n");
    var returnValue = true;
    var leftButton = inforssXMLRepository.getMouseEvent();
/*
    if ((navigator.userAgent.indexOf("rv:1.8.0.2") == -1) && (navigator.userAgent.indexOf("rv:1.8.0.3") == -1) &&
        (navigator.userAgent.indexOf("rv:1.8.0.4") == -1) && (navigator.userAgent.indexOf("rv:1.8.0.5") == -1) &&
        (navigator.userAgent.indexOf("rv:1.8.0.6") == -1) && (navigator.userAgent.indexOf("rv:1.8.0.7") == -1) &&
        (navigator.userAgent.indexOf("rv:1.8.0.8") == -1) && (navigator.userAgent.indexOf("rv:1.8.0.9") == -1) &&
        (navigator.userAgent.indexOf("rv:1.8.1") == -1))
    {
        leftButton = ((navigator.userAgent.indexOf("Firefox/1.0+") == -1) &&
                      (navigator.userAgent.indexOf("Firefox/1.4") == -1) &&
                      (navigator.userAgent.indexOf("Firefox/1.5") == -1) &&
                      (navigator.userAgent.indexOf("Thunderbird/1.5") == -1) &&
                      (navigator.userAgent.indexOf("SeaMonkey") == -1) &&
                      (navigator.userAgent.indexOf("rv:1.9") == -1) &&
                      (navigator.userAgent.indexOf("rv:2.0") == -1) &&
                      (navigator.userAgent.indexOf("rv:5.") == -1) &&
                      (navigator.userAgent.indexOf("rv:1.8") == -1)) ? 0 : 65535;
    }
*/
//dump("leftButton=" + leftButton + "\n");
    if ((event.button == leftButton) && (event.ctrlKey == false)) // left button
    {
//dump("rssFillPopup\n");
      clearAddRSSPopupMenu();
      if (event.target.getAttribute("id") == "inforss-menupopup")
      {
        inforssResetSubMenu();
      }
      var menupopup = document.getElementById("inforss-menupopup");
      var nb = 0;
      try
      {
        if (gBrowser == null)
        {
        }
      }
      catch(e)
      {
        gBrowser = null;
      }
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

          var flavour = { };
          var data    = { };
          var length  = { };
          xferable.getAnyTransferData(flavour, data, length);
          var items, name, url;
          data = data.value.QueryInterface(Components.interfaces.nsISupportsString).data;
          if ((data != null) && ((data.indexOf("http://") == 0) ||
                                 (data.indexOf("file://") == 0) ||
                                 (data.indexOf("https://") == 0))
                             && (data.length < 60))
          {
            inforssAddaAddSubMenu(nb, data, data);
            nb++;
          }
        }
        catch(e)
        {
        }
      }
    // Bookmarks use rdf's
	//var rdf = Components.classes["@mozilla.org/rdf/rdf-service;1"].getService(Components.interfaces.nsIRDFService);
	// Get the built in datasource
	//var bookmarks = Components.classes["@mozilla.org/rdf/datasource;1?name=bookmarks"].getService(Components.interfaces.nsIRDFDataSource);

    // The RDF component utilities
    //var RDFC = Components.classes['@mozilla.org/rdf/container-utils;1'].getService(Components.interfaces.nsIRDFContainerUtils);

	// Wrap Url Predicate
	//var urlPredicateResource = rdf.GetResource("http://home.netscape.com/NC-rdf#URL");
	// Wrap Url Literal
	//var urlTargetLiteral = rdf.GetLiteral('https://gmail.google.com/');
	// Get source returns the resource
	//var urlSubjectResource = bookmarks.GetSource(urlPredicateResource, urlTargetLiteral, true);
	//if(urlSubjectResource)
	//{
		//alert('Founded: ' + urlSubjectResource);
		// Wrap Name Predicate - case sensitive
		//var titlePredicate = rdf.GetResource("http://home.netscape.com/NC-rdf#Name");
		// Get target from subject and predicate
		//var titleTargetLiteral = bookmarks.GetTarget(urlSubjectResource, titlePredicate, true);
		// Want literal not resource
		//if (titleTargetLiteral instanceof Components.interfaces.nsIRDFLiteral)
		//{
			// Display the title
			//alert(titleTargetLiteral.Value);
		//}
	//}
	//else
	//{
		//alert('Not found');
	//}
//dump("Hello\n");
      if ((inforssXMLRepository.isLivemark() == true) && (gBrowser != null))
      {
	    var RDF = Components.classes["@mozilla.org/rdf/rdf-service;1"].getService(Components.interfaces.nsIRDFService);
        inforssWalk(RDF.GetResource("NC:BookmarksRoot"), nb);
      }
    }
    else
    {
      returnValue = false;
      if ((event.button == 2) || (event.ctrlKey == true))
      {
//        window.openDialog("chrome://inforss/content/inforssOption.xul","_blank","chrome,centerscreen,resizable=yes, dialog=yes");
      }
    }
  }
  catch(e)
  {
    inforssDebug(e);
  }
  inforssTraceOut();

  return returnValue;
}

//-------------------------------------------------------------------------------------------------------------
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
  catch(e)
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
    var windowManagerInterface = windowManager.QueryInterface( Components.interfaces.nsIWindowMediator);
    var enumerator = windowManagerInterface.getEnumerator("inforssOption");
    while (enumerator.hasMoreElements())
    {
      nb++;
      enumerator.getNext();
    }
    if (nb == 0)
    {
      window.openDialog("chrome://inforss/content/inforssOption.xul","_blank","chrome,centerscreen,resizable=yes,dialog=no");
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
  var baseTitle = data;
  var labelStr = gInforssRssBundle.getString("inforss.menuadd") + " " + labelStr;
  menuItem.setAttribute("label", labelStr);
  menuItem.setAttribute("data", data);
  menuItem.setAttribute("tooltiptext", data);
  if (separators.length == 1)
  {
    menupopup.insertBefore(document.createElement("menuseparator"),separator);
  }
  menupopup.insertBefore(menuItem, separator);
  inforssTraceOut();
}

//-------------------------------------------------------------------------------------------------------------
function inforssWalk(node, nb)
{
//dump("inforssWalk\n");
  inforssTraceIn();
  try
  {
    var RDFC = Components.classes['@mozilla.org/rdf/container-utils;1'].getService(Components.interfaces.nsIRDFContainerUtils);
	var RDF = Components.classes["@mozilla.org/rdf/rdf-service;1"].getService(Components.interfaces.nsIRDFService);

    // The bookmarks service
    var Bookmarks = Components.classes['@mozilla.org/browser/bookmarks-service;1'];
    if (Bookmarks != null) Bookmarks = Bookmarks.getService(Components.interfaces.nsIRDFDataSource);


    var kNC_Name = RDF.GetResource("http://home.netscape.com/NC-rdf#Name");
    var kNC_URL  = RDF.GetResource("http://home.netscape.com/NC-rdf#URL");
    var kNC_FEEDURL  = RDF.GetResource("http://home.netscape.com/NC-rdf#FeedURL");
    if ((Bookmarks != null) && (RDFC.IsContainer(Bookmarks, node)))
    {
//dump("it's a folder\n");
      // It's a folder
      var name = Bookmarks.GetTarget(node, kNC_Name, true);
      var url = Bookmarks.GetTarget(node, kNC_URL, true);
      var feedurl = Bookmarks.GetTarget(node, kNC_FEEDURL, true);
//if (name != null)
//  dump("folder title = " + name.QueryInterface(Components.interfaces.nsIRDFLiteral).Value + "\n");
//if (url != null)
//  dump("folder url = " + url.QueryInterface(Components.interfaces.nsIRDFLiteral).Value + "\n");
      if ((name != null) && (feedurl != null))
      {
// dump("ok name and feedurl != null\n");
        target = Bookmarks.GetTarget(node, RDF.GetResource("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"), true);
        if (target != null)
        {
          type = target.QueryInterface(Components.interfaces.nsIRDFResource).Value;
//            dump("folder feedurl = " + feedurl.QueryInterface(Components.interfaces.nsIRDFLiteral).Value + "\n");
//            dump("type = " + type + "\n");
          if (type == "http://home.netscape.com/NC-rdf#Livemark")
          {
//            dump("folder title = " + name.QueryInterface(Components.interfaces.nsIRDFLiteral).Value + "\n");
//            dump("folder url = " + url.QueryInterface(Components.interfaces.nsIRDFLiteral).Value + "\n");
//            dump("folder feedurl = " + feedurl.QueryInterface(Components.interfaces.nsIRDFLiteral).Value + "\n");
//            dump("type = " + type + "\n");
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
    else
    {
      // It's just a bookmark.
      //var target = Bookmarks.GetTarget(node, kNC_URL, true);
      //if (target != null)
      //  dump("url = " + target.QueryInterface(Components.interfaces.nsIRDFLiteral).Value + "\n");
      //target = Bookmarks.GetTarget(node, kNC_Name, true);
      //if (target != null)
      //  dump("title = " + target.QueryInterface(Components.interfaces.nsIRDFLiteral).Value + "\n");
      //target = Bookmarks.GetTarget(node, RDF.GetResource("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"), true);
      //if (target != null)
      //  dump("type = " + target.QueryInterface(Components.interfaces.nsIRDFResource).Value + "\n");
//        dump("type = " + Bookmarks.GetTarget(node, RDF.GetResource("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"), true).QueryInterface(Components.interfaces.nsIRDFLiteral).Value + "\n");
    }
  }
  catch(e)
  {
    inforssDebug(e);
  }
  inforssTraceOut();
}


//-------------------------------------------------------------------------------------------------------------
function rssSwitchAll(popup, url, label, target)
{
  inforssTraceIn();
//inforssAlert("rssSwitchAll");
//alert(url + "/" + label);
  var items = popup.getElementsByTagName(inforssXMLRepository.getSubMenuType());
//  var j = 0;
  if (label.indexOf(gInforssRssBundle.getString("inforss.menuadd") + " ") == 0)  // if the user clicked on the "Add ..." button
  {
//dump("url=" + url + "\n");

  	if (inforssGetItemFromUrl(url) != null)  // already exists
    {
      alert(gInforssRssBundle.getString("inforss.duplicate"));
    }
    else
    {
      if (gInforssXMLHttpRequest == null)
      {
        getInfoFromUrl(url);   // search for the general information of the feed: title, ...
      }
    }
  }
  else
  {
//alert("step 01");
  	var changed = true;
    if ((target == null) || ((target.getAttribute("data") == url) && (target.getAttribute("label") == label)))
    {
      changed = gInforssMediator.setSelected(url);
    }
    if ((changed == true) || (inforssXMLRepository.isActive() == true))
    {
      document.getElementById('newsbar1').label=null;
      document.getElementById('newsbar1').style.visibility="hidden";
    }
//alert("step 02");
    inforssSave();
//alert("step 03");
  }
  inforssTraceOut();
}

//-------------------------------------------------------------------------------------------------------------
var infoRSSObserver =
{
  getSupportedFlavours : function ()
  {
    var flavours = new FlavourSet();
    flavours.appendFlavour("text/unicode");
    return flavours;
  },
  onDragOver: function (evt,flavour,session)
  {
//    session.canDrag=true;
//  inforssAlert("drag=" + evt.target.localName + " x=" + evt.clientX + "-" + gInforssX + "=" + (evt.clientX - gInforssX));
    if(evt.target.localName == "menuitem")
    {
      //inforssInspect(evt.target.parentNode);
      //document.getElementById("statusbar-display").label=evt.clientX;
    }
  },
  onDragStart: function (evt , transferData, action)
  {
//  gInforssX = evt.clientX;
//  inforssAlert("start=" + evt.target.localName);
    evt.preventBubble();
    if(evt.target.localName == "menuitem")
    {
      //inforssInspect(evt.target.parentNode);
      //document.getElementById("statusbar-display").label=evt.clientX;
    }
    //inforssInspect(ect.currentTarget);
    //inforssInspect(transferData);
    //inforssInspect(action);
    //evt.target.canDrag=true;
    var htmlText="<strong>infoRSS</strong>";
    var plainText="infoRSS";

    transferData.data=new TransferData();
    transferData.data.addDataForFlavour("text/html",htmlText);
    transferData.data.addDataForFlavour("text/unicode",evt.target.getAttribute("data"));
//alert("coucou1");
  },
  onDragExit: function (evt, session)
  {
//  inforssAlert("exit=" + evt.clientX);
    //alert("drag exit");
  },
  onDrop: function (evt, dropdata, session)
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
          if (((url.indexOf("file://") == -1) && (url.indexOf("http://") == -1)  && (url.indexOf("https://") == -1)  && (url.indexOf("news://") == -1)))
          {
            evt.cancelBubble = true;
            evt.stopPropagation();
            evt.preventBubble();
            window.openDialog("chrome://inforss/content/inforssAlert.xul","_blank","chrome,centerscreen,resizable=yes, dialog=no", gInforssRssBundle.getString("inforss.malformedUrl"));
          }
          else
          {
            if (inforssGetItemFromUrl(url) != null)
            {
              window.openDialog("chrome://inforss/content/inforssAlert.xul","_blank","chrome,centerscreen,resizable=yes, dialog=no", gInforssRssBundle.getString("inforss.duplicate"));
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
                  observerService.notifyObservers(null,"reload",null);
                }
              }
            }
          }
        }
      }
    }
    catch(e)
    {
    alert(e);
    }
    evt.cancelBubble = true;
    evt.stopPropagation();
  }
};

//-------------------------------------------------------------------------------------------------------------
var infoRSSTrashObserver =
{
  getSupportedFlavours : function ()
  {
//alert("11");
    var flavours = new FlavourSet();
    flavours.appendFlavour("text/unicode");
    return flavours;
  },
  onDragOver: function (evt, flavour, session)
  {
//inforssInspect(flavour);
    session.canDrag = true;

  },
  onDragStart: function (evt , transferData, action)
  {
//alert("33");

    var htmlText="<strong>Cabbage</strong>";
    var plainText="Cabbage";

    transferData.data=new TransferData();
    transferData.data.addDataForFlavour("text/html",htmlText);
    transferData.data.addDataForFlavour("text/unicode",plainText);
  },
  onDragExit: function (evt, session)
  {
//alert("44");

  },
  onDrop: function (evt, dropdata, session)
  {
//alert("55");
    gInforssMediator.deleteRss(dropdata.data);
  }
};

//-------------------------------------------------------------------------------------------------------------
var infoRSSBarObserver =
{
  getSupportedFlavours : function ()
  {
    var flavours = new FlavourSet();
    flavours.appendFlavour("text/unicode");
    return flavours;
  },
  onDragOver: function (evt,flavour,session)
  {
  },
  onDragStart: function (evt , transferData, action)
  {
//  gInforssX = evt.clientX;
//  inforssAlert("start=" + evt.target.localName);
    evt.preventBubble();
    if(evt.target.localName == "menuitem")
    {
      //inforssInspect(evt.target.parentNode);
      //document.getElementById("statusbar-display").label=evt.clientX;
    }
    //inforssInspect(ect.currentTarget);
    //inforssInspect(transferData);
    //inforssInspect(action);
    //evt.target.canDrag=true;
    var htmlText="<strong>infoRSS</strong>";
    var plainText="infoRSS";

    transferData.data=new TransferData();
    transferData.data.addDataForFlavour("text/html",htmlText);
    transferData.data.addDataForFlavour("text/unicode",evt.target.getAttribute("data"));
//alert("coucou");
  },
  onDragExit: function (evt, session)
  {
  },
  onDrop: function (evt, dropdata, session)
  { 
    evt.cancelBubble = true;
    evt.stopPropagation();
    evt.preventBubble();
    document.getElementById("inforss-menupopup").hidePopup();
    var url = dropdata.data;
    var rss = inforssGetItemFromUrl(url);
    var selectedInfo = gInforssMediator.getSelectedInfo(true);
    if ((selectedInfo != null) && (selectedInfo.getType() == "group") &&
        (rss != null) && (rss.getAttribute("type") != "group") &&
        (selectedInfo.containsFeed(url) == false))
    {
//      if (confirm(gInforssRssBundle.getString("inforss.confirm.addtogroup") + selectedInfo.getUrl() + ")") == true)
      {
        selectedInfo.addNewFeed(url);
      }
    }
    else
    {
      window.openDialog("chrome://inforss/content/inforssAlert.xul","_blank","chrome,centerscreen,resizable=yes, dialog=no", gInforssRssBundle.getString("inforss.notagroup"));
    }
  /*
    if (evt.target.nodeName == "statusbarpanel")
    {
      var url = dropdata.data;
      if (url.indexOf("\n") != -1)
      {
        url = url.substring(0, url.indexOf("\n"));
      }
      if (url != "")
      {
        if (((url.indexOf("file://") == -1) && (url.indexOf("http://") == -1)  && (url.indexOf("https://") == -1)))
        {
          evt.cancelBubble = true;
          evt.stopPropagation();
          evt.preventBubble();
          window.openDialog("chrome://inforss/content/inforssAlert.xul","_blank","chrome,centerscreen,resizable=yes, dialog=no", document.getElementById("bundle_inforss").getString("inforss.malformedUrl"));
        }
        else
        {
          if (inforssGetItemFromUrl(url) != null)
          {
            window.openDialog("chrome://inforss/content/inforssAlert.xul","_blank","chrome,centerscreen,resizable=yes, dialog=no", document.getElementById("bundle_inforss").getString("inforss.duplicate"));
          }
          else
          {
            getInfoFromUrl(url);
          }
        }
      }
      inforssSave();
    }
    */
    evt.cancelBubble = true;
    evt.stopPropagation();
  }
};

//-------------------------------------------------------------------------------------------------------------
function inforssAddItemToRSSList(title, description, url, link, user, password, feedFlag)
{
  inforssTraceIn();
//alert("start inforssAddItemToRSSList");
  var elem = null;
  try
  {
      if (RSSList == null)
      {
        RSSList = document.createElement("LIST-RSS");
      }
      elem = RSSList.createElement("RSS");
//alert(RSSList.firstChild.childNodes.length);
      elem.setAttribute("url",url);
      elem.setAttribute("title",title);
      elem.setAttribute("selected","false");
      elem.setAttribute("nbItem", inforssXMLRepository.getDefaultNbItem());
      elem.setAttribute("lengthItem", inforssXMLRepository.getDefaultLengthItem());
      elem.setAttribute("playPodcast", inforssXMLRepository.getDefaultPlayPodcast());
      elem.setAttribute("savePodcastLocation", inforssXMLRepository.getSavePodcastLocation());
      elem.setAttribute("purgeHistory", inforssXMLRepository.getDefaultPurgeHistory());
      elem.setAttribute("browserHistory", inforssXMLRepository.getDefaultBrowserHistory());
      elem.setAttribute("filterCaseSensitive","true");
      elem.setAttribute("link",link);
      elem.setAttribute("description",((description == null) || (description == ""))? title : description);
      elem.setAttribute("icon","");
      elem.setAttribute("refresh",inforssXMLRepository.getDefaultRefresh());
      elem.setAttribute("user",user);
      elem.setAttribute("activity","true");
      if ((user != null) && (user != ""))
      {
        inforssXMLRepository.storePassword(url, user, password);
      }
      elem.setAttribute("filter","all");
      elem.setAttribute("type", ((feedFlag == true)? "atom" : "rss"));
      RSSList.firstChild.appendChild(elem);
  }
  catch(e)
  { 
//alert(e);
    inforssDebug("addItemToRSSList" , e)
  }
//alert(RSSList.firstChild.childNodes.length);
  inforssTraceOut();
  return elem;
}


//-------------------------------------------------------------------------------------------------------------
function inforssLocateMenuItem(title)
{
  inforssTraceIn();
  try
  {
    var item = null;
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
  catch(e)
  {
    inforssDebug("addItemToRSSList" , e)
  }
  inforssTraceOut();
  return item;
}

//-------------------------------------------------------------------------------------------------------------
function inforssAddItemToMenu(rss, flagAlert, preSelected, saveFlag)
{
  inforssTraceIn();
//alert("start inforssAddItemToMenu");
  var menuItem = null;
  try
  {
     if (document.getElementById("inforss-menupopup") != null)
     {
       if ((rss.getAttribute("groupAssociated") == "false") || (inforssXMLRepository.isIncludeAssociated() == true))
       {
         var typeObject = inforssXMLRepository.getSubMenuType();
         var items = document.getElementById("inforss-menupopup").getElementsByTagName(typeObject);
         if (preSelected == true)
         {
           for (var i=0; i<items.length; i++)
           {
             items[i].setAttribute("checked", false);
           }
         }
         menuItem = document.createElement(typeObject);

         menuItem.setAttribute("type", "radio");
         menuItem.setAttribute("label", rss.getAttribute("title"));
//alert("title=" + rss.getAttribute("title") + "\n");
         menuItem.setAttribute("value", rss.getAttribute("title"));


         menuItem.setAttribute("data", rss.getAttribute("url"));
         menuItem.setAttribute("url", rss.getAttribute("url"));
         menuItem.setAttribute("checked", preSelected);
         menuItem.setAttribute("autocheck", false);
         if ((rss.getAttribute("description") != null) && (rss.getAttribute("description") != ""))
         {
           menuItem.setAttribute("tooltiptext",rss.getAttribute("description"));
         }
         menuItem.setAttribute("tooltip", null);
         menuItem.setAttribute("image",rss.getAttribute("icon"));
         menuItem.setAttribute("validate", "never");
         menuItem.setAttribute("id","inforss.menuitem-" + items.length);
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
             menupopup.setAttribute("onpopupshowing","return inforssSubMenu(" + items.length + ");");
           }
           else
           {
             menupopup.setAttribute("onpopupshowing","return false");
           }
           menupopup.setAttribute("onpopuphiding","return inforssSubMenu2();");
           menupopup.setAttribute("id","inforss.menupopup-" + items.length);
//           menupopup.addEventListener("command", function() { mouseup(this, event); return true;}, false);
//           menupopup.setAttribute("disabled","true");
           inforssAddNoData(menupopup);
           menuItem.appendChild(menupopup);
//           menupopup.addEventListener("command", function() { alert('didier'); event.preventBubble(); return false;}, false);
//           menupopup.addEventListener("mouseup", function() { alert('ernotte'); event.preventBubble(); return false;}, false);
         }

         if (inforssXMLRepository.getSortedMenu() != "no")
         {
           var indexItem = inforssLocateMenuItem(rss.getAttribute("title"));
           document.getElementById("inforss-menupopup").insertBefore(menuItem, indexItem);
//dump("indexItem=" + indexItem + "\n");
         }
         else
         {
           document.getElementById("inforss-menupopup").appendChild(menuItem);
         }
         if (preSelected == true)
         {
           document.getElementById("inforss-menupopup").selectedItem = menuItem;
         }
//if (rss.getAttribute("type") == "group")
//{
//dump("addItemToMenu GROUP " + rss.getAttribute("url") + " " + rss.getElementsByTagName("GROUP").length + "\n");
//}
       }
//alert("addFeed");
       gInforssMediator.addFeed(rss, menuItem, saveFlag);
       if (flagAlert == true)
       {
         window.openDialog("chrome://inforss/content/inforssAdd.xul","_blank","chrome,centerscreen,resizable=yes, dialog=no", document.getElementById("inforss-menupopup"), rss);
       }
     }
  }
  catch(e)
  { 
//alert(e);
    inforssDebug(e)
  }
  inforssTraceOut();
  return menuItem;
}



//-------------------------------------------------------------------------------------------------------------
function inforssSubMenu(index)
{
  inforssTraceIn();
//inforssAlert("toto:" + index);
  popup = document.getElementById("inforss.menupopup-" + index);
  inforssSubMenu2();
  if (inforssXMLRepository.getSubMenu() == "true")
  {
     gInforssCurrentMenuHandle = window.setTimeout("inforssSubMenu1(" + index + ")", 3000);
     return true;
  }
  else
  {
    return false;
  }
  inforssTraceOut();
}

//-------------------------------------------------------------------------------------------------------------
function inforssSubMenu1(index)
{
  inforssTraceIn();
  try
  {
//inforssAlert("toto1:" + index);
    gInforssCurrentMenuHandle = null;
    popup = document.getElementById("inforss.menupopup-" + index);
    item = document.getElementById("inforss.menuitem-" + index);
    url = item.getAttribute("url");
    var rss = inforssGetItemFromUrl(url);
//inforssAlert("toto1:" + url);
    popup.setAttribute("onpopupshowing",null);
    inforssResetPopup(popup);
    var xmlHttpRequest = new XMLHttpRequest();
    xmlHttpRequest.open("GET", url, false, rss.getAttribute("user"), inforssXMLRepository.readPassword(url, rss.getAttribute("user")));
	xmlHttpRequest.setRequestHeader("User-Agent", "Mozilla/5.0");
	xmlHttpRequest.overrideMimeType("application/xml");
	xmlHttpRequest.send(null);

    var fm = new FeedManager();
    fm.parse(xmlHttpRequest);
//inforssAlert("len=" + fm.rssFeeds.length);
    var max = INFORSS_MAX_SUBMENU;
    max = Math.min(max, fm.rssFeeds.length);
    for (var i=0; i<max; i++)
    {
      var newElem = document.createElement("menuitem");
      var newTitle = inforssFeed.htmlFormatConvert(fm.rssFeeds[i].title);
      var re = new RegExp ('\n', 'gi') ;
      if (newTitle != null)
      {
        newTitle = newTitle.replace(re, ' ');
      }
      newElem.setAttribute("label", newTitle);
      newElem.setAttribute("url", fm.rssFeeds[i].link);
      newElem.setAttribute("tooltiptext", inforssFeed.htmlFormatConvert(fm.rssFeeds[i].description));
      popup.appendChild(newElem);
      newElem.addEventListener("command", function(event) { event.preventBubble(); event.cancelBubble = true; event.stopPropagation(); return true;}, false);
//           newElem.addEventListener("mouseup", function(event) { alert('ernotte'); event.preventBubble(); event.cancelBubble = true; event.stopPropagation(); return true;}, false);
    }
  }
  catch(e)
  {
//    alert("toto1: " + e)
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
//inforssAlert("toto3" + "/" + (gInforssCounter++));
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
  catch(e)
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
// gBrowser.addTab("http://www.mozdev.org");

function openNewTabInForeground(href, linkNode, event, securityCheck, postData)
{

  var loadInBackground = true;

  // Check if load in BG is on and set it off to focus to the added tab.
  if (this.getPref("browser.tabs.loadInBackground"))
  {
    this.setPref("browser.tabs.loadInBackground", false);
    loadInBackground = false;
  }

  openNewTabWith(href, linkNode, event, securityCheck, postData);

  // Did we just change the preference? if yes restore to it.
  if (!loadInBackground)
  {
    this.setPref("browser.tabs.loadInBackground", true);
  }
}


//-------------------------------------------------------------------------------------------------------------
function getInfoFromUrl(url)
{
  inforssTraceIn();
//inforssAlert("getInfoFromUrl:" + url);
  gInforssUser = null;
  gInforssPassword = null;
  var getFlag = true;
  if (url.indexOf("https://") == 0)
  {
    var windowManager = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService();
    var windowManagerInterface = windowManager.QueryInterface( Components.interfaces.nsIWindowMediator);
    var topWindow = windowManagerInterface.getMostRecentWindow("navigator:browser");

    var gUser = { value: gInforssUser };
    var gPassword = { value: gInforssPassword };
    var dialog = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].createInstance(Components.interfaces.nsIPromptService);
    getFlag = dialog.promptUsernameAndPassword(topWindow, null , gInforssRssBundle.getString("inforss.account") + " " + url , gUser  , gPassword  , null , { value: true });
    gInforssUser = gUser.value;
    gInforssPassword = gPassword.value;
  }
  if (getFlag == true)
  {
//alert("avant");
    inforssGetRss(url, "inforssPopulateMenuItem", gInforssUser, gInforssPassword);
//alert("apres");
  }
//alert("end getInfoFromUrl");
  inforssTraceOut();
}

//-------------------------------------------------------------------------------------------------------------
function inforssPopulateMenuItem()
{
  inforssTraceIn();
  try
  {
//dump("Status=" + gInforssXMLHttpRequest.status + "\n");
    var objDOMParser = new DOMParser();
//dump(gInforssXMLHttpRequest.responseText + "\n");
    var objDoc = objDOMParser.parseFromString(gInforssXMLHttpRequest.responseText, "text/xml");
//dump("step1" + "\n");
    var str_description = null;
    var str_title = null;
    var str_link = null;
    var feed_flag = false;
    var validFormat = false;
//dump("step2" + "\n");

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
//dump("step3: " + format + "\n");

    var titles = objDoc.getElementsByTagName(str_title);
    var links = objDoc.getElementsByTagName(str_link);
    var descriptions = objDoc.getElementsByTagName(str_description);
    if ((descriptions.length == 0) && (format == "feed"))
    {
      descriptions = objDoc.getElementsByTagName("title");
    }
//dump("step4" + "\n");
//dump(format + " " + descriptions.length + " " + links.length + " " + titles.length + "\n");

    if ((descriptions.length > 0) && (links.length > 0) && (titles.length > 0))
    {
//dump("step5" + "\n");
    	var elem = inforssAddItemToRSSList(getNodeValue(titles), getNodeValue(descriptions), gInforssUrl, (feed_flag == true)? getHref(links) : getNodeValue(links), gInforssUser, gInforssPassword, feed_flag);
        delete gInforssXMLHttpRequest;
        var urlIcon = inforssFindIcon(elem);
        if (urlIcon != null)
        {
          elem.setAttribute("icon",urlIcon);
        }
    	inforssAddItemToMenu(elem, true, false, true);
    }
    else
    {
	  alert(gInforssRssBundle.getString("inforss.feed.issue"));
	}

    delete xmlStr;
    delete objDOMParser;
    delete objDoc;
  }
  catch(e)
  {
    inforssDebug(e);
  }
  gInforssXMLHttpRequest = null;
  inforssTraceOut();
}

//  gIeViewBundle = document.getElementById("bundle_ieview");
//gIeViewBundle.getString("ieview.cantFindExplorer");



//-------------------------------------------------------------------------------------------------------------
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
        window.openDialog("chrome://inforss/content/inforssSettings.xul","_blank","chrome,centerscreen,resizable=yes, dialog=no", event.target);
      }
    }
  }
  inforssTraceOut();
}

//-------------------------------------------------------------------------------------------------------------
function inforssGetItemFromUrl(url)
{
  inforssTraceIn();
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
  return (find == true)? items[i] : null;
}

//-------------------------------------------------------------------------------------------------------------
function getCurrentRSS()
{
  inforssTraceIn();
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
  return (find == true)? items[i] : null;
}

//-----------------------------------------------------------------------------------------------------
function manageRSSChanged(subject, topic, data)
{
  inforssTraceIn();
  try
  {
    if (gInforssMediator != null)
    {
      switch(topic)
      {
        case "reload":
        {
//dump("reload\n");
          if (data != null)
          {
            var urls = data.split("|");
            for (i = 0; i < (urls.length - 1); i++)
            {
              gInforssMediator.deleteRss(urls[i], false);
            }
          }
          delete RSSList;
          inforssClearPopupMenu();
          window.setTimeout("gInforssMediator.init()",0);
          break;
        }
        case "rssChanged":
        {
          gInforssMediator.deleteAllRss();
          delete RSSList;
          inforssClearPopupMenu();
          window.setTimeout("gInforssMediator.init()",0);
          break;
        }
        case "viewed":
        {
          var index = data.indexOf("__SEP__");
          var title = data.substring(0,index);
          var link = data.substring(index + 7);
          gInforssMediator.setViewed(title , link);
          break;
        }
        case "banned":
        {
          var index = data.indexOf("__SEP__");
          var title = data.substring(0,index);
          var link = data.substring(index + 7);
          gInforssMediator.setBanned(title , link);
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
          var url = data.substring(0,index);
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
//dump("AddFeed: " + data + "\n");
//alert(data);
          inforssAddNewFeed({inforssUrl: data});
          break;
        }
      }
    }
  }
  catch(e)
  {
    inforssDebug(e);
  }
  inforssTraceOut();
}

//-----------------------------------------------------------------------------------------------------
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
  catch(e)
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
  catch(e)
  {
    inforssDebug(e);
  }
  inforssTraceOut();
}

//-----------------------------------------------------------------------------------------------------
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
      prefs.setBoolPref("toolbar.collapsed", ((container.getAttribute("collapsed") == null)? false : (container.getAttribute("collapsed") == "true")));
	}
	
	if (inforssXMLRepository.getSeparateLine() == "false")  // in the status bar
    {
//dump("inforssRelocateBar step 1\n");
	  document.getElementById("inforss.resizer").setAttribute("collapsed","false");
      if (container.getAttribute("id") != "addon-bar")
	  {
//dump("inforssRelocateBar step 2\n");
	    container.parentNode.removeChild(container);
	    document.getElementById("addon-bar").appendChild(headlines);
	    statuspanelNews.setAttribute("flex","0");
	    statuspanelNews.firstChild.setAttribute("flex","0");
	    headlines.setAttribute("flex","0");
        var box = document.getElementById("inforss.newsbox1");
        if (box != null)
        {
//dump("an event handler has been set for the mouse wheel\n");
          box.addEventListener("DOMMouseScroll", inforssMouseScroll, false);
        }
//dump("inforssRelocateBar step 3\n");
	  }
	}
	else
	{
	  document.getElementById("inforss.resizer").setAttribute("collapsed","true");
      if (inforssXMLRepository.getLinePosition() == "top")
	  {
	    if (container.getAttribute("id") != "inforss-bar-top")
		{
		  if (container.getAttribute("id") == "inforss-bar-bottom")
		  {  // was in the bottom bar
			container.parentNode.removeChild(container);
		  }
		  else
		  { // was in the status bar
		    headlines.parentNode.removeChild(headlines);
		  }
//		  var statusbar = document.createElement("hbox");
		  var statusbar = document.createElement("toolbar");
		  statusbar.setAttribute("persist" , "collapsed");
		  statusbar.setAttribute("id","inforss-bar-top");
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
//dump("colla=" + colla + "\n");
		  statusbar.setAttribute("collapsed", colla);
//alert(statusbar.getAttribute("collapsed") + "/" + statusbar.getAttribute("hidden"));
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
//		  toolbox.parentNode.insertBefore(statusbar, toolbox.nextSibling);
          statusbar.setAttribute("toolbarname", "InfoRSS");
		  statuspanelNews.setAttribute("flex","1");
		  statuspanelNews.firstChild.setAttribute("flex","1");
		  headlines.setAttribute("flex","1");
          var box = document.getElementById("inforss.newsbox1");
          if (box != null)
          {
//dump("an event handler has been set for the mouse wheel\n");
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
		  statusbar.setAttribute("id","inforss-bar-bottom");
		  statusbar.appendChild(headlines);
		  var toolbar = document.getElementById("addon-bar");
		  toolbar.parentNode.insertBefore(statusbar, toolbar);
		  statuspanelNews.setAttribute("flex","1");
		  statuspanelNews.firstChild.setAttribute("flex","1");
		  headlines.setAttribute("flex","1");
          var box = document.getElementById("inforss.newsbox1");
          if (box != null)
          {
//dump("an event handler has been set for the mouse wheel\n");
            box.addEventListener("DOMMouseScroll", inforssMouseScroll, false);
          }
		}
	  }
	}
  }
  catch(e)
  {
    inforssDebug(e);
  }
  inforssTraceOut();
}

//-----------------------------------------------------------------------------------------------------
function inforssDeleteTree(obj)
{
  inforssTraceIn();
//alert("deletetree\n");
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
function inforssResizeHeadlines(event)
{
dump("resize " + event.clientX + "\n");
  try
  {
    if (gInforssCanResize == true)
    {
dump("event type=" + event.type + "\n");
dump("event which=" + event.which + "\n");
      {
        var delta = event.clientX - gInforssX;
        var hbox = document.getElementById('inforss.newsbox1');
        if ((inforssXMLRepository.getSeparateLine() == "false"))
        {
          if ((hbox.getAttribute("width") != null) && (hbox.getAttribute("width") != ""))
          {
            var width = hbox.getAttribute("width");
dump("old width=" + width + "\n");
            var oldWidth = width
            var oldX = hbox.boxObject.screenX;
            width = eval(gInforssWidth) - delta;
dump("new width=" + width + "   event.clientX=" + event.clientX + "    gInforssX=" + gInforssX + "\n");
            if (width > 10)
            {
//              hbox.setAttribute("width", width);
//              hbox.style.width = width + "px";
/*              var newX = hbox.boxObject.screenX;
              if (newX == oldX)
              {
                var find = false;
                width--;
                while ((width > 0) && (find == false))
                {
                  hbox.setAttribute("width", width);
                  hbox.style.width = width + "px";
                  newX = hbox.boxObject.screenX;
                  if (newX == oldX)
                  {
                    width--;
                  }
                  else
                  {
                    find = true;
                  }
                }
                width++;
                hbox.setAttribute("width",width);
                hbox.style.width = width + "px";

//dump("pas bouge\n");
              }
              else
              {
//              gInforssX = event.clientX;
              }
*/              inforssXMLRepository.setScrollingArea(width);
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
function inforssRunnable(obj, func)
{
  this.obj = obj;
  this.func = func;
  this.Run = function()
  {
    try
    {
//alert("coucou "  + "\n");
      var obj = this.obj;
      var func = this.func;
//      eval("obj." + this.func + "()");
//	netscape.security.PrivilegeManager.enablePrivilege("UniversalFileRead CapabilityPreferencesAccess UniversalPreferencesWrite UniversalPreferencesRead UniversalXPConnect UniversalBrowserRead UniversalBrowserWrite");
//	var consoleService = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
//	consoleService.logStringMessage("coucou\n");
	}
    catch(e)
    {
      dump(e);
    }
  };
}
//-----------------------------------------------------------------------------------------------------
function inforssSetTimer(obj, func, timer)
{
//inforssInspect(navigator, null, false);
//dump("setTimer: " + gInforssTimerList.length + " " + gInforssTimerCounter + "\n");
//for (var i = 0; i < gInforssTimerList.length; i++)
//{
//  dump("    " + gInforssTimerList[i].date + " " + gInforssTimerList[i].timerId + " " + gInforssTimerList[i].func + "\n");
//}
  try
  {
//    var timerObject = { obj : obj, func : func, timerId : inforssGetNewTimerId() , handle : null, date : new Date()};
//    gInforssTimerList.push(timerObject);
//    timerObject.handle = window.setTimeout("inforssHandleTimer(" + timerObject.timerId + ",'" + func + "')", timer);
//dump("fin setTimer " + timerObject.timerId + "\n");
  }
  catch(e)
  {
    inforssDebug(e);
  }
//  return timerObject.handle;
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
//  const thread1 = Components.classes["@mozilla.org/thread;1"].getService(Components.interfaces.nsIThread);
//dump("debut handleTimer: " + timerId + "\n");
  try
  {
/*    var find = false;
    var i = 0;
    while ((i < gInforssTimerList.length) && (find == false))
    {
//dump("avant premier\n");
      if (gInforssTimerList[i].timerId == timerId)
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
//dump("avant deuxieme " + i + " " + gInforssTimerList.length + " " + gInforssTimerList[i] + "\n");
      var func = gInforssTimerList[i].func;
      var obj = gInforssTimerList[i].obj;
//dump("apres deuxieme " + i + " " + gInforssTimerList.length + " " + gInforssTimerList[i] + "\n");
      gInforssTimerList[i].obj = null;
      gInforssTimerList[i].func = null;
      delete gInforssTimerList[i];
      gInforssTimerList.splice(i,1);
//if (func != func1)
//{
//alert("pas bonne fonction" + func + " " + func1);
//}

// lancement du process
//       thread.init(thread, 0,
//     thread1.init(new inforssRunnable(obj, func), 0,
//                 Components.interfaces.nsIThread.PRIORITY_NORMAL,
//                  Components.interfaces.nsIThread.SCOPE_GLOBAL,
//                  Components.interfaces.nsIThread.STATE_JOINABLE);
//      thread1.join();
*/      eval("obj." + func + "()");
//    }
//    else
//    {
//      dump("pas trouve func=" + func1 + "\n");
//    }
  }
  catch(e)
  {
    inforssDebug(e);
  }
//dump("fin handleTimer\n");
}


//-----------------------------------------------------------------------------------------------------
function inforssClearTimer(handle)
{
//dump("debut handleTimer: " + timerId + "\n");
/*  try
  {
    var find = false;
    var i = 0;
    while ((i < gInforssTimerList.length) && (find == false))
    {
      if (gInforssTimerList[i].handle == handle)
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
	  gInforssTimerList[i].obj = null;
	  delete gInforssTimerList[i];
      gInforssTimerList.splice(i,1);
    }
  }
  catch(e)
  {
    inforssDebug(e);
  }*/
//dump("fin handleTimer\n");
}

//-----------------------------------------------------------------------------------------------------
function inforssAddNewFeed(menuItem)
{
//alert("inforssAddNewFeed\n");
  try
  {
    var url = menuItem.inforssUrl;
//alert(url);
    if (inforssGetItemFromUrl(url) != null)  // already exists
    {
      alert(gInforssRssBundle.getString("inforss.duplicate"));
    }
    else
    {
      if (gInforssXMLHttpRequest == null)
      {
//alert("go");
        getInfoFromUrl(url);   // search for the general information of the feed: title, ...
      }
    }
  }
  catch(e)
  {
    inforssDebug(e);
  }
//dump("fin inforssAddNewFeed\n");
}

//-----------------------------------------------------------------------------------------------------
function onAddNewFeedPopup()
{
//dump("onAddNewFeedPopup\n");
  try
  {
    var selectedText = inforssGetMenuSelectedText();
    if (selectedText != null)
    {
      var index = selectedText.indexOf(" ");
      if (index != -1)
      {
        selectedText = selectedText.substring(0,index);
      }
    }
    var menuItem = document.getElementById("inforss.popup.addfeed");
    if (menuItem != null)
    {
      if ((selectedText.indexOf("http://") != -1) || (selectedText.indexOf("https://") != -1))
      {
        menuItem.setAttribute("collapsed","false");
        menuItem.inforssUrl = selectedText;
      }
      else
      {
        menuItem.setAttribute("collapsed","true");
      }
    }
  }
  catch(e)
  {
    inforssDebug(e);
  }
//dump("fin onAddNewFeedPopup\n");
}

//-----------------------------------------------------------------------------------------------------
function inforssGetMenuSelectedText(concationationChar)
{
//dump("dictionarySearchGetSelectedText()");

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
//dump("inforssMouseScroll event.detail=" + event.detail + "\n");
    gInforssMediator.handleMouseScroll(event.detail);
  }
  catch(e)
  {
    inforssDebug(e);
  }
}
//-----------------------------------------------------------------------------------------------------
function inforssCheckVersion()
{
  try
  {
    var display = false;
    var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("inforss.");
    if (prefs.prefHasUserValue("installed.version") == true)
    {
      var version = prefs.getCharPref("installed.version").replace(/0.9./,"0.09.").replace(/0.8./,"0.08.");
      if (version < INFORSS_VERSION_NUMBER)
      {
        display = true;
      }
    }
    else
    {
      display = true;
    }
    if (display == true)
    {
      window.openDialog("chrome://inforss/content/inforssWelcome.xul","_blank","chrome,centerscreen,resizable=yes, dialog=no", "Welcome");
      prefs.setCharPref("installed.version", INFORSS_VERSION_NUMBER);
    }
  }
  catch(e)
  {
//    inforssDebug(e);
  }
}




