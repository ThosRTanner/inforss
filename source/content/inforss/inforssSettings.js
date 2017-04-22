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
// inforssSettings
// Author : Didier Ernotte 2005
// Inforss extension
//-------------------------------------------------------------------------------------------------------------
/* globals inforssDebug, inforssTraceIn, inforssTraceOut */
Components.utils.import("chrome://inforss/content/modules/inforssDebug.jsm");
Components.utils.import("chrome://inforss/content/modules/inforssPrompt.jsm");

var itemMenu = null;
var gRssTimeout = null;
var gRssXmlHttpRequest = null;
var gInforssMediator = null;

//-----------------------------------------------------------------------------------------------------
function init()
{
  try
  {
    itemMenu = window.arguments[0];
    var rss = window.opener.inforssGetItemFromUrl(itemMenu.getAttribute("url"));

    var windowManager = Components.classes[
      "@mozilla.org/appshell/window-mediator;1"].getService();
    var windowManagerInterface = windowManager.QueryInterface(Components.interfaces
      .nsIWindowMediator);
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

    var items = window.opener.RSSList.getElementsByTagName("RSS");
    for (var i = 0; i < items.length; i++)
    {
      if (items[i].getAttribute("type") != "group")
      {
        addRssToVbox(items[i]);
      }
    }

    switch (rss.getAttribute("type"))
    {
      case "rss":
      case "atom":
      case "html":
      case "nntp":
        {
          document.getElementById("inforss.rsstype").selectedIndex = 0;
          var nbitem = rss.getAttribute("nbItem");
          document.getElementById("nbitem").selectedIndex = (nbitem == "9999") ?
          0 : 1;
          if (nbitem != "9999")
          {
            document.getElementById("nbitem1").value = nbitem;
          }
          var lengthitem = rss.getAttribute("lengthItem");
          document.getElementById("lengthitem").selectedIndex = (lengthitem ==
            "9999") ? 0 : 1;
          if (lengthitem != "9999")
          {
            document.getElementById('lengthitem1').value = lengthitem;
          }
          var refresh = rss.getAttribute("refresh");
          if (refresh == 60 * 24)
          {
            document.getElementById("inforss.refresh").selectedIndex = 0;
            document.getElementById("refresh1").value = 1;
          }
          else
          {
            document.getElementById("refresh1").value = refresh;
            document.getElementById("inforss.refresh").selectedIndex = (refresh ==
              60) ? 1 : 2;
          }
          var url = rss.getAttribute("url");
          document.getElementById('prefTitle').value = rss.getAttribute("title");
          document.getElementById('prefUrl').value = rss.getAttribute("url");
          document.getElementById('prefLink').value = rss.getAttribute("link");
          document.getElementById('inforss.homeLink').setAttribute("link", rss.getAttribute(
            "link"));
          document.getElementById('prefDescription').value = rss.getAttribute(
            "description");
          document.getElementById("inforss.rss.icon").src = rss.getAttribute(
            "icon");
          document.getElementById("iconurl").value = rss.getAttribute("icon");
          document.getElementById("inforss.rss.fetch").style.visibility = (rss.getAttribute(
            "type") == "html") ? "visible" : "hidden";
          document.getElementById('inforss.filter.forgroup').setAttribute(
            "collapsed", "true");
          var playPodcast = rss.getAttribute("playPodcast");
          document.getElementById("playPodcast").selectedIndex = (playPodcast ==
            "true") ? 0 : 1;
          var savePodcastLocation = rss.getAttribute("savePodcastLocation");
          document.getElementById("savePodcastLocation2").selectedIndex = (
            savePodcastLocation == "") ? 1 : 0;
          document.getElementById("savePodcastLocation3").value =
          savePodcastLocation;
          var browserHistory = rss.getAttribute("browserHistory");
          document.getElementById("browserHistory").selectedIndex = (
            browserHistory == "true") ? 0 : 1;
          var filterCaseSensitive = rss.getAttribute("filterCaseSensitive");
          document.getElementById("filterCaseSensitive").selectedIndex = (
            filterCaseSensitive == "true") ? 0 : 1;

          var originalFeed = gInforssMediator.locateFeed(url);
          if (originalFeed != null)
          {
            originalFeed = originalFeed.info;
            if (originalFeed != null)
            {
              document.getElementById("inforss.feed.row1").setAttribute(
                "selected", "false");
              document.getElementById("inforss.feed.row1").setAttribute("url",
                rss.getAttribute("url"));
              document.getElementById("inforss.feed.treecell1").setAttribute(
                "properties", (rss.getAttribute("activity") == "true") ? "on" :
                "off");
              document.getElementById("inforss.feed.treecell2").setAttribute(
                "properties", (originalFeed.active) ? "active" :
                "unactive");
              document.getElementById("inforss.feed.treecell3").setAttribute(
                "label", ((originalFeed.lastRefresh == null) ? "" :
                  getStringDate(originalFeed.lastRefresh)));
              document.getElementById("inforss.feed.treecell4").setAttribute(
                "label", (((originalFeed.lastRefresh == null) || (
                  originalFeed.active == false) || (rss.getAttribute(
                  "activity") == "false")) ? "" : getStringDate(new Date(
                  eval(originalFeed.lastRefresh.getTime() + originalFeed.feedXML
                    .getAttribute("refresh") * 60000)))));
              document.getElementById("inforss.feed.treecell5").setAttribute(
                "label", ((originalFeed.lastRefresh == null) ? "" :
                  originalFeed.getNbHeadlines()));
              document.getElementById("inforss.feed.treecell6").setAttribute(
                "label", ((originalFeed.lastRefresh == null) ? "" :
                  originalFeed.getNbUnread()));
              document.getElementById("inforss.feed.treecell7").setAttribute(
                "label", ((originalFeed.lastRefresh == null) ? "" :
                  originalFeed.getNbNew()));
              document.getElementById("inforss.feed.treecell8").setAttribute(
                "label", ((originalFeed.feedXML.getAttribute(
                  "groupAssociated") == "true") ? "Y" : "N"));
            }
          }
          break;
        }
      case "group":
        {
          document.getElementById("inforss.rsstype").selectedIndex = 1;
          document.getElementById("groupName").value = rss.getAttribute("url");
          document.getElementById("inforss.filter.policy").selectedIndex = rss.getAttribute(
            "filterPolicy");
          document.getElementById("inforss.group.icon").src = rss.getAttribute(
            "icon");
          document.getElementById("iconurlgroup").value = rss.getAttribute(
            "icon");
          document.getElementById('inforss.filter.forgroup').setAttribute(
            "collapsed", "false");
          var filterCaseSensitive = rss.getAttribute("filterCaseSensitive");
          document.getElementById("filterCaseSensitive").selectedIndex = (
            filterCaseSensitive == "true") ? 0 : 1;
          setGroupCheckBox(rss);
          var originalFeed = gInforssMediator.locateFeed(rss.getAttribute("url"));
          if (originalFeed != null)
          {
            originalFeed = originalFeed.info;
            if (originalFeed != null)
            {
              document.getElementById("inforss.group.treecell1").parentNode.setAttribute(
                "url", rss.getAttribute("url"));
              document.getElementById("inforss.group.treecell1").setAttribute(
                "properties", (rss.getAttribute("activity") == "true") ? "on" :
                "off");
              document.getElementById("inforss.group.treecell2").setAttribute(
                "properties", (originalFeed.active) ? "active" :
                "unactive");
              document.getElementById("inforss.group.treecell3").setAttribute(
                "label", originalFeed.getNbHeadlines());
              document.getElementById("inforss.group.treecell4").setAttribute(
                "label", originalFeed.getNbUnread());
              document.getElementById("inforss.group.treecell5").setAttribute(
                "label", originalFeed.getNbNew());
            }
          }
          break;
        }
    }
    var cancel = document.getElementById('inforssSettings').getButton("cancel");
    var but = cancel.cloneNode(true);
    but.label = document.getElementById("bundle_inforss").getString(
      "inforss.apply");
    but.setAttribute("accesskey", "");
    but.addEventListener("click", function()
    {
      return apply();
    }, false);
    cancel.parentNode.insertBefore(but, cancel);

    for (var i = 0; i < 100; i++)
    {
      document.getElementById("rss.filter.number").appendItem(i, i);
      if (i < 51)
      {
        document.getElementById("rss.filter.hlnumber").appendItem(i, i);
      }
    }

    if ((rss.getAttribute("type") == "rss") || (rss.getAttribute("type") ==
        "atom"))
    {
      gRssTimeout = window.setTimeout("rssCategoryTimeout()", 5000);
      gRssXmlHttpRequest = new XMLHttpRequest();
      gRssXmlHttpRequest.open("GET", url, true, rss.getAttribute("user"),
        inforssXMLRepository.readPassword(url, rss.getAttribute("user")));
      gRssXmlHttpRequest.onload = processCategories;
      gRssXmlHttpRequest.onerror = rssCategoryTimeout;
      gRssXmlHttpRequest.setRequestHeader("User-Agent", "Mozilla/5.0");
      gRssXmlHttpRequest.overrideMimeType("application/xml");
      gRssXmlHttpRequest.send(null);
    }
    else
    {
      initListCategories(null);
    }
  }
  catch (e)
  {
    inforssDebug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function getStringDate(time)
{
  var returnValue = null;
  try
  {

    var hour = time.getHours();
    if (hour < 10)
    {
      hour = "0" + hour;
    }
    var minute = time.getMinutes();
    if (minute < 10)
    {
      minute = "0" + minute;
    }
    var second = time.getSeconds();
    if (second < 10)
    {
      second = "0" + second;
    }
    returnValue = hour + ":" + minute + ":" + second;
  }
  catch (e)
  {
    inforssDebug(e);
  }
  return returnValue;
}

//-----------------------------------------------------------------------------------------------------
function checkAll(obj)
{
  try
  {
    var flag = (obj.getAttribute("checked") == "true") ? "false" : "true";
    var vbox = document.getElementById("group-list-rss");
    var hbox = null;
    var checkbox = null;
    for (var i = 0; i < vbox.childNodes.length; i++)
    {
      hbox = vbox.childNodes[i];
      checkbox = hbox.childNodes[0];
      checkbox.setAttribute("checked", flag);
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
    var vbox = document.getElementById("group-list-rss");
    var hbox = null;
    var checkbox = null;
    var label = null;
    for (var i = 0; i < vbox.childNodes.length; i++)
    {
      hbox = vbox.childNodes[i];
      checkbox = hbox.childNodes[0];
      label = hbox.childNodes[2];
      var selectedList = (rss == null) ? null : rss.getElementsByTagName(
        "GROUP");
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
      checkbox.setAttribute("checked", (find) ? "true" : "false");
    }
  }
  catch (e)
  {
    inforssDebug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function initFilter(rss)
{
  try
  {
    if (rss != null)
    {
      var items = rss.getElementsByTagName("FILTER");
      var vbox = document.getElementById("inforss.filter.vbox");
      var hbox = vbox.childNodes[3]; // first filter
      for (var i = 0; i < items.length; i++)
      {
        var checkbox = hbox.childNodes[0];
        var type = hbox.childNodes[1];
        var deck = hbox.childNodes[2];

        checkbox.setAttribute("checked", items[i].getAttribute("active"));
        type.selectedIndex = items[i].getAttribute("type");
        deck.selectedIndex = (type.selectedIndex <= 2) ? 0 : ((type.selectedIndex <=
          5) ? 1 : 2);
        deck.childNodes[0].childNodes[0].selectedIndex = items[i].getAttribute(
          "include");
        deck.childNodes[0].childNodes[1].value = items[i].getAttribute("text");
        deck.childNodes[1].childNodes[0].selectedIndex = items[i].getAttribute(
          "compare");
        deck.childNodes[1].childNodes[1].selectedIndex = items[i].getAttribute(
          "elapse");
        deck.childNodes[1].childNodes[2].selectedIndex = items[i].getAttribute(
          "unit");
        deck.childNodes[2].childNodes[0].selectedIndex = items[i].getAttribute(
          "hlcompare");
        deck.childNodes[2].childNodes[1].selectedIndex = items[i].getAttribute(
          "nb");
        if (checkbox.getAttribute("checked") == "false")
        {
          changeStatusFilter1(hbox, "true");
        }
        if (i != (items.length - 1))
        {
          hbox = addFilter(checkbox);
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
function addFilter(obj)
{
  var hbox = null;
  try
  {
    hbox = obj.parentNode.cloneNode(true);
    obj.parentNode.parentNode.appendChild(hbox);
    hbox.childNodes[0].setAttribute("checked", "true");
    hbox.childNodes[2].childNodes[0].childNodes[1].value = ""; //text
    changeStatusFilter1(hbox, "false");
  }
  catch (e)
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
    if (obj.parentNode.parentNode.childNodes.length == 2)
    {
      alert(document.getElementById("bundle_inforss").getString(
        "inforss.remove.last"));
    }
    else
    {
      obj.parentNode.parentNode.removeChild(obj.parentNode);
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
  var list = document.getElementById("group-list-rss");
  var title = rss.getAttribute("title").toLowerCase();
  var count = (list.firstChild == null) ? 0 : list.childNodes.length;

  var hbox = document.createElement("hbox");
  var j = 0;
  var find = false;
  var label = null;

  while ((j < count) && (find == false))
  {
    label = list.childNodes[j].childNodes[2];
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
    list.appendChild(hbox);
  }
  else
  {
    list.insertBefore(hbox, list.childNodes[j]);
  }

  var checkbox = document.createElement("checkbox");
  hbox.appendChild(checkbox);
  var image = document.createElement("image");
  image.setAttribute("src", rss.getAttribute("icon"));
  image.setAttribute("maxheight", "16");
  image.setAttribute("maxwidth", "16");
  image.style.maxHeight = "16px";
  image.style.maxWidth = "16px";
  hbox.appendChild(image);
  var label = document.createElement("label");
  label.setAttribute("value", rss.getAttribute("title"));
  label.setAttribute("url", rss.getAttribute("url"));
  hbox.appendChild(label);
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
  catch (e)
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
      listCategory.push(document.getElementById("bundle_inforss").getString(
        "inforss.nocategory"));
    }
    var vbox = document.getElementById("inforss.filter.vbox");
    var hbox = vbox.childNodes[3]; // first filter
    var menu = hbox.childNodes[2].childNodes[0].childNodes[1]; //text
    for (var i = 0; i < listCategory.length; i++)
    {
      var newElem = document.createElement("menuitem");
      newElem.setAttribute("label", listCategory[i]);
      menu.firstChild.appendChild(newElem);
    }
    var rss = window.opener.inforssGetItemFromUrl(itemMenu.getAttribute("url"));
    initFilter(rss);
  }
  catch (e)
  {
    inforssDebug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function rssCategoryTimeout()
{
  try
  {
    initListCategories();
    gRssTimeout = null;
    if (gRssXmlHttpRequest != null)
    {
      gRssXmlHttpRequest.abort();
      gRssXmlHttpRequest = null;
    }
  }
  catch (e)
  {
    inforssDebug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function savePref()
{
  var returnValue = false;
  try
  {
    returnValue = apply();
    if (returnValue)
    {
      returnValue = false;
      var acceptButton = document.getElementById('inforssSettings').getButton(
        "accept");
      acceptButton.setAttribute("disabled", "true");
      window.setTimeout(closePrefDialog, 2300);
    }
  }
  catch (e)
  {
    inforssDebug(e);
  }
  return returnValue;
}


//-----------------------------------------------------------------------------------------------------
function apply()
{
  var returnValue = false;
  try
  {
    if (validDialog())
    {
      var rss = window.opener.inforssGetItemFromUrl(itemMenu.getAttribute("url"));
      switch (rss.getAttribute("type"))
      {
        case "rss":
        case "atom":
        case "html":
        case "nntp":
          {
            rss.setAttribute("nbItem", (document.getElementById('nbitem').selectedIndex ==
              0) ? "9999" : document.getElementById('nbitem1').value);
            rss.setAttribute("lengthItem", (document.getElementById(
              'lengthitem').selectedIndex == 0) ? "9999" : document.getElementById(
              'lengthitem1').value);
            rss.setAttribute("title", document.getElementById('prefTitle').value);
            rss.setAttribute("url", document.getElementById('prefUrl').value);
            rss.setAttribute("link", document.getElementById('prefLink').value);
            rss.setAttribute("description", document.getElementById(
              'prefDescription').value);
            var refresh1 = document.getElementById('inforss.refresh').selectedIndex;
            rss.setAttribute("refresh", (refresh1 == 0) ? 60 * 24 : (refresh1 ==
              1) ? 60 : document.getElementById('refresh1').value);
            rss.setAttribute("filter", ((document.getElementById(
              "inforss.filter.anyall").selectedIndex == 0) ? "all" : "any"));
            rss.setAttribute("icon", document.getElementById('iconurl').value);
            itemMenu.setAttribute("url", document.getElementById("prefUrl").value);
            itemMenu.setAttribute("label", document.getElementById("prefTitle")
              .value);
            itemMenu.setAttribute("data", document.getElementById("prefUrl").value);
            rss.setAttribute("playPodcast", (document.getElementById(
              'playPodcast').selectedIndex == 0) ? "true" : "false");
            rss.setAttribute("savePodcastLocation", (document.getElementById(
              'savePodcastLocation2').selectedIndex == 1) ? "" : document.getElementById(
              'savePodcastLocation3').value);
            rss.setAttribute("browserHistory", (document.getElementById(
              'browserHistory').selectedIndex == 0) ? "true" : "false");
            rss.setAttribute("filterCaseSensitive", (document.getElementById(
              'filterCaseSensitive').selectedIndex == 0) ? "true" : "false");
            break;
          }
        case "group":
          {
            rss.setAttribute("url", document.getElementById('groupName').value);
            rss.setAttribute("title", document.getElementById('groupName').value);
            rss.setAttribute("description", document.getElementById('groupName')
              .value);
            rss.setAttribute("filterPolicy", document.getElementById(
              "inforss.filter.policy").selectedIndex);
            rss.setAttribute("icon", document.getElementById('iconurlgroup').value);
            itemMenu.setAttribute("url", document.getElementById("groupName").value);
            itemMenu.setAttribute("label", document.getElementById("groupName")
              .value);
            itemMenu.setAttribute("data", document.getElementById("groupName").value);
            rss.setAttribute("filterCaseSensitive", (document.getElementById(
              'filterCaseSensitive').selectedIndex == 0) ? "true" : "false");
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
            // dump("storeValue group\n");
            var vbox = document.getElementById("group-list-rss");
            var hbox = null;
            var checkbox = null;
            var label = null;
            for (var i = 0; i < vbox.childNodes.length; i++)
            {
              hbox = vbox.childNodes[i];
              checkbox = hbox.childNodes[0];
              label = hbox.childNodes[2];
              // dump("storeValue label=" + label.getAttribute("value") + "\n");
              if (checkbox.getAttribute("checked") == "true")
              {
                // dump("storeValue checked\n");
                var child = document.createElement("GROUP");
                child.setAttribute("url", label.getAttribute("url"));
                rss.appendChild(child);
              }
            }
            break;
          }
      }
      var child = rss.firstChild;
      var next = null;
      while (child != null)
      {
        //dump("storeValue loop filter " + child.nodeName + "\n");
        next = child.nextSibling;
        if (child.nodeName.indexOf("FILTER") != -1)
        {
          rss.removeChild(child);
          //dump("remove filter\n");
        }
        child = next;
      }
      var vbox = document.getElementById("inforss.filter.vbox");
      var hbox = vbox.childNodes[3]; // first filter
      while (hbox != null)
      {
        var checkbox = hbox.childNodes[0];
        var type = hbox.childNodes[1];
        var deck = hbox.childNodes[2];
        var filter = document.createElement("FILTER");
        filter.setAttribute("active", ((checkbox.getAttribute("checked") ==
          "true") ? "true" : "false"));
        filter.setAttribute("type", type.selectedIndex);
        filter.setAttribute("include", deck.childNodes[0].childNodes[0].selectedIndex);
        filter.setAttribute("text", deck.childNodes[0].childNodes[1].value);
        filter.setAttribute("compare", deck.childNodes[1].childNodes[0].selectedIndex);
        filter.setAttribute("elapse", deck.childNodes[1].childNodes[1].selectedIndex);
        filter.setAttribute("unit", deck.childNodes[1].childNodes[2].selectedIndex);
        filter.setAttribute("hlcompare", deck.childNodes[2].childNodes[0].selectedIndex);
        filter.setAttribute("nb", deck.childNodes[2].childNodes[1].selectedIndex);
        rss.appendChild(filter);
        hbox = hbox.nextSibling;
      }
      window.opener.inforssSave();
      if (rss.getAttribute("selected") == "true")
      {
        window.opener.document.getElementById('inforss-icon').setAttribute(
          "tooltiptext", rss.getAttribute("description") + " (" + rss.getAttribute(
            "url") + ")");
      }
      var observerService = Components.classes[
        "@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
      observerService.notifyObservers(null, "reload", null);
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
function validDialog()
{
  var returnValue = true;
  try
  {
    var rss = window.opener.inforssGetItemFromUrl(itemMenu.getAttribute("url"));
    switch (rss.getAttribute("type"))
    {
      case "rss":
      case "atom":
      case "html":
      case "nntp":
        {
          if ((document.getElementById('prefTitle').value == null) ||
            (document.getElementById('prefTitle').value == "") ||
            (document.getElementById('prefUrl').value == null) ||
            (document.getElementById('prefUrl').value == "") ||
            (document.getElementById('prefLink').value == null) ||
            (document.getElementById('prefLink').value == "") ||
            (document.getElementById('prefDescription').value == null) ||
            (document.getElementById('prefDescription').value == "") ||
            (document.getElementById('iconurl').value == null) ||
            (document.getElementById('iconurl').value == ""))
          {
            returnValue = false;
            alert(document.getElementById("bundle_inforss").getString(
              "inforss.pref.mandatory"));
          }
          if ((rss.getAttribute("type") == "html") && (returnValue))
          {
            if ((rss.getAttribute("regexp") == null) || (rss.getAttribute(
                "regexp") == ""))
            {
              returnValue = false;
              alert(document.getElementById("bundle_inforss").getString(
                "inforss.html.mandatory"));
            }
            else
            {
              if ((rss.getAttribute("htmlTest") == null) || (rss.getAttribute(
                  "htmlTest") == "") || (rss.getAttribute("htmlTest") ==
                  "false"))
              {
                returnValue = false;
                alert(document.getElementById("bundle_inforss").getString(
                  "inforss.html.test"));
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
            alert(document.getElementById("bundle_inforss").getString(
              "inforss.pref.mandatory"));
          }
          break;
        }
    }
    if (returnValue)
    {
      var vbox = document.getElementById("inforss.filter.vbox");
      var child = vbox.firstChild.nextSibling;
      while ((child != null) && (returnValue))
      {
        var checkbox = child.childNodes[0];
        var type = child.childNodes[1];
        var deck = child.childNodes[2];
        if ((checkbox.getAttribute("checked") == "true") && (type.selectedIndex <=
            2)) // headline/body/category
        {
          var text = deck.firstChild.childNodes[1];
          if ((text.value == "") || (text.value == null))
          {
            alert(document.getElementById("bundle_inforss").getString(
              "inforss.pref.mandatory"));
            returnValue = false;
          }
        }
        child = child.nextSibling;
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
function changeStatusFilter(button)
{
  var hbox = button.parentNode;
  var status = (button.getAttribute("checked") == "true") ? "true" : "false";
  changeStatusFilter1(hbox, status);
}

//-----------------------------------------------------------------------------------------------------
function changeStatusFilter1(hbox, status)
{
  hbox.childNodes[1].setAttribute("disabled", status); //type
  hbox.childNodes[2].setAttribute("disabled", status); //deck
  hbox.childNodes[2].childNodes[0].childNodes[0].setAttribute("disabled",
    status); //include/exclude
  if (status == "true")
  {
    hbox.childNodes[2].childNodes[0].childNodes[1].setAttribute("disabled",
      status); //text
  }
  else
  {
    if (hbox.childNodes[2].childNodes[0].childNodes[1].hasAttribute("disabled"))
    {
      hbox.childNodes[2].childNodes[0].childNodes[1].removeAttribute("disabled");
    }
  }
  hbox.childNodes[2].childNodes[1].childNodes[0].setAttribute("disabled",
    status); //more/less
  hbox.childNodes[2].childNodes[1].childNodes[1].setAttribute("disabled",
    status); //1-100
  hbox.childNodes[2].childNodes[1].childNodes[2].setAttribute("disabled",
    status); //sec, min,...
  hbox.childNodes[2].childNodes[2].childNodes[0].setAttribute("disabled",
    status); //more/less
  hbox.childNodes[2].childNodes[2].childNodes[1].setAttribute("disabled",
    status); //1-50
}

//-----------------------------------------------------------------------------------------------------
function changeFilterType(obj)
{
  obj.nextSibling.selectedIndex = ((obj.selectedIndex <= 2) ? 0 : ((obj.selectedIndex <=
    5) ? 1 : 2));
}

//-----------------------------------------------------------------------------------------------------
function closePrefDialog()
{
  inforssTraceIn();
  document.getElementById("inforssSettings").cancelDialog();
  inforssTraceOut();
}


//-----------------------------------------------------------------------------------------------------
function parseHtml()
{
  try
  {
    var currentRSS = window.opener.inforssGetItemFromUrl(itemMenu.getAttribute(
      "url"));
    window.openDialog("chrome://inforss/content/inforssParseHtml.xul", "_blank",
      "chrome,centerscreen,resizable=yes, dialog=yes", currentRSS.getAttribute(
        "url"), currentRSS.getAttribute("user"),
      currentRSS.getAttribute("regexp"), currentRSS.getAttribute(
        "regexpTitle"),
      currentRSS.getAttribute("regexpDescription"), currentRSS.getAttribute(
        "regexpPubDate"),
      currentRSS.getAttribute("regexpLink"), currentRSS.getAttribute(
        "regexpCategory"),
      currentRSS.getAttribute("regexpStartAfter"), currentRSS.getAttribute(
        "regexpStopBefore"),
      currentRSS.getAttribute("htmlDirection"), currentRSS.getAttribute(
        "encoding"),
      currentRSS.getAttribute("htmlTest"));
  }
  catch (e)
  {
    inforssDebug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function setHtmlFeed(url, regexp, headline, article, pubdate, link, category,
  startafter, stopbefore, direction, encoding, htmlTest)
{
  inforssTraceIn();
  try
  {
    var currentRSS = window.opener.inforssGetItemFromUrl(itemMenu.getAttribute(
      "url"));
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
    document.getElementById('prefUrl').value = url;
  }
  catch (e)
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
    var currentRSS = window.opener.inforssGetItemFromUrl(itemMenu.getAttribute(
      "url"));
    document.getElementById('iconurl').value = inforssFindIcon(currentRSS);
    document.getElementById('inforss.rss.icon').src = document.getElementById(
      'iconurl').value;
  }
  catch (e)
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
    document.getElementById('iconurlgroup').value = inforssXMLRepository.getDefaultGroupIcon();
    document.getElementById('inforss.group.icon').src = document.getElementById(
      'iconurlgroup').value;
  }
  catch (e)
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
    document.getElementById('inforss.rss.icon').src = document.getElementById(
      'iconurl').value;
  }
  catch (e)
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
    document.getElementById('inforss.group.icon').src = document.getElementById(
      'iconurlgroup').value;
  }
  catch (e)
  {
    inforssDebug(e);
  }
  inforssTraceOut();
}

//-----------------------------------------------------------------------------------------------------
function openURL(url)
{
  if (navigator.vendor == "Thunderbird")
  {
    window.openDialog("chrome://inforss/content/inforssBrowser.xul", "_blank",
      "chrome,centerscreen,resizable=yes, dialog=no", url);
  }
  else
  {
    if (window.opener.getBrowser)
    {
      if (testCreateTab())
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
      ((window.opener.getBrowser().currentURI.spec == "") && (window.opener.getBrowser()
        .selectedBrowser.webProgress.isLoadingDocument)) ||
      (window.opener.getBrowser().currentURI.spec == "about:blank"))
    {
      returnValue = false;
    }
  }
  return returnValue;
}

//-----------------------------------------------------------------------------------------------------
function selectFeedReport(tree, event)
{
  var row = {},
    colID = {},
    type = {};

  try
  {
    tree.treeBoxObject.getCellAt(event.clientX, event.clientY, row, colID, type);
    if (colID.value != null)
    {
      if (typeof(colID.value) == "object") //patch for firefox 1.1
      {
        colID.value = colID.value.id;
      }
      if ((colID.value.indexOf(".report.activity") != -1) && (type.value ==
          "image"))
      {
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
        cell.setAttribute("properties", (cell.getAttribute("properties").indexOf(
          "on") != -1) ? "off" : "on");
        var rss = inforssGetItemFromUrl(cell.parentNode.getAttribute("url"));
        //alert(cell.parentNode.getAttribute("url"));
        rss.setAttribute("activity", (rss.getAttribute("activity") == "true") ?
          "false" : "true");
        /*        if (tree.getAttribute("id") != "inforss.tree3")
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
        */
      }
    }
  }
  catch (e)
  {
    inforssDebug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function inforssGetItemFromUrl(url)
{
  var items = window.opener.RSSList.getElementsByTagName("RSS");
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
  return (find) ? items[i] : null;
}

//-----------------------------------------------------------------------------------------------------
function viewAllViewSelected(flag)
{
  try
  {
    var vbox = document.getElementById("group-list-rss");
    var hbox = null;
    var checkbox = null;
    for (var i = 0; i < vbox.childNodes.length; i++)
    {
      hbox = vbox.childNodes[i];
      if (flag)
      {
        hbox.setAttribute("collapsed", "false");
      }
      else
      {
        checkbox = hbox.childNodes[0];
        if (checkbox.getAttribute("checked") == "true")
        {
          hbox.setAttribute("collapsed", "false");
        }
        else
        {
          hbox.setAttribute("collapsed", "true");
        }
      }
    }
  }
  catch (e)
  {
    inforssDebug(e);
  }
}
