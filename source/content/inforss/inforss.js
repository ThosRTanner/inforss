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

var inforss = inforss || {};
Components.utils.import("chrome://inforss/content/modules/Debug.jsm", inforss);

Components.utils.import("chrome://inforss/content/modules/Prompt.jsm", inforss);

Components.utils.import("chrome://inforss/content/modules/Utils.jsm", inforss);

Components.utils.import("chrome://inforss/content/modules/Version.jsm", inforss);

/* globals inforssCopyRemoteToLocal, inforssCopyLocalToRemote */
/* globals inforssMediator, inforssFeed */
/* globals inforssFindIcon */
/* globals getNodeValue, getHref */
/* globals FeedManager */

//From inforssXMLRepository
/* globals inforssXMLRepository, inforssSave, getCurrentRSS */

var gInforssUrl = null;
var gInforssXMLHttpRequest = null;
const INFORSS_MAX_SUBMENU = 25;
var gInforssCurrentMenuHandle = null;
/* exported gInforssMediator */
var gInforssMediator = null;
/* exported gInforssPreventTooltip */
var gInforssPreventTooltip = false;
var gInforssResizeTimeout = null;

const MIME_feed_url = "application/x-inforss-feed-url";
const MIME_feed_type = "application/x-inforss-feed-type";

const ObserverService = Components.classes[
  "@mozilla.org/observer-service;1"].getService(
  Components.interfaces.nsIObserverService);

const WindowMediator = Components.classes[
    "@mozilla.org/appshell/window-mediator;1"].getService(
    Components.interfaces.nsIWindowMediator);

const PrefService = Components.classes[
    "@mozilla.org/preferences-service;1"].getService(
    Components.interfaces.nsIPrefService);

const InforssPrefs = PrefService.getBranch('inforss.');

const AnnotationService = Components.classes[
  "@mozilla.org/browser/annotation-service;1"].getService(
  Components.interfaces.nsIAnnotationService);

const BookmarkService = Components.classes[
  "@mozilla.org/browser/nav-bookmarks-service;1"].getService(
  Components.interfaces.nsINavBookmarksService);

//-------------------------------------------------------------------------------------------------------------
/* exported inforssStartExtension */
function inforssStartExtension()
{
  try
  {
    if (window.arguments != null || window.opener != null)
    {
      //At this point we could/should check if the current version is different
      //to the previous version and throw up a web page.
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

      //FIXME shouldn't this be in the xul?
      const box = document.getElementById("inforss.newsbox1");
      box.addEventListener("DOMMouseScroll", inforssMouseScroll, false);

      const serverInfo = inforssXMLRepository.getServerInfo();
      if (inforssGetNbWindow() == 1 && serverInfo.autosync &&
          navigator.vendor != "Thunderbird")
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
    console.log("[InfoRSS] failed to start: ", e);
  }
}

//------------------------------------------------------------------------------
//Register 3 content handlers
//application/vnd.mozilla.maybe.feed
//application/vnd.mozilla.maybe.audio.feed
//application/vnd.mozilla.maybe.video.feed
function checkContentHandler()
{
  try
  {
    const PrefLocalizedString = Components.Constructor(
    "@mozilla.org/pref-localizedstring;1",
    Components.interfaces.nsIPrefLocalizedString);

    const WebContentHandlerRegistrar = Components.classes[
        "@mozilla.org/embeddor.implemented/web-content-handler-registrar;1"
        ].getService(Components.interfaces.nsIWebContentHandlerRegistrar);

    const handlers_branch = "browser.contentHandlers.types.";

    const install_content_handler = function(type, uri, title)
    {
      //Ideally I'd just deregister and then reregister the content handlers,
      //but the deregistration method doesn't seem to work very well, and leaves
      //the prefs lying around (and it doesn't seem to always exist).
      let found = false;
      let handlers = PrefService.getBranch(handlers_branch).getChildList("", {});
      //This unfortunately produces a bunch of strings like 0.title, 5.type,
      //3.uri, in no helpful order. I could sort them but why bother.
      for (let handler of handlers)
      {
        if (! handler.endsWith(".uri"))
        {
          continue;
        }
        handler = handler.split(".")[0];
        const branch = PrefService.getBranch(handlers_branch + handler + ".");
        //TBH I don't know if this is level of paranoia is required.
        if (branch.getPrefType("uri") == PrefService.PREF_STRING &&
            branch.getCharPref("uri") == uri &&
            branch.getPrefType("type") == PrefService.PREF_STRING &&
            branch.getCharPref("type") == type)
        {
          if (found)
          {
            //This is a legacy issue. At one point you could have multiple
            //entries which was definitely confusing and could potentially
            //cause issues.
            branch.deleteBranch("");
          }
          else
          {
            //Change the name to the current name of inforss. This is for
            //people upgrading from v1.4. Note also that these prefs only get
            //read at startup so the name change in options/applications isn't
            //apparent till then.
            let local_title = new PrefLocalizedString();
            local_title.data = title;
            branch.setComplexValue(
                                 "title",
                                 Components.interfaces.nsIPrefLocalizedString,
                                 local_title);
            found = true;
          }
        }
      }
      if (!found)
      {
        try
        {
          WebContentHandlerRegistrar.registerContentHandler(type,
                                                            uri,
                                                            title,
                                                            null);
        }
        catch (e)
        {
          //For reasons that are unclear, registering the video feed registers
          //the handler, but throws an exception before it manages to write the
          //prefs. So write them ourselves.
          console.log("Failed to register " + type, e);
          for (let handler = 0; ++handler; )
          {
            const typeBranch = PrefService.getBranch(handlers_branch + handler + ".");

            if (typeBranch.getPrefType("uri") == PrefService.PREF_INVALID)
            {
              // Yay. This one is free (or at least as best I can tell it's free)
              let local_title = new PrefLocalizedString();
              local_title.data = title;
              typeBranch.setComplexValue(
                                     "title",
                                     Components.interfaces.nsIPrefLocalizedString,
                                     local_title);
              typeBranch.setCharPref("uri", uri);
              typeBranch.setCharPref("type", type);
              return;
            }
          }
        }
      }
    };

    const feeds = [ "", ".audio", ".video" ];
    const feed_base = "application/vnd.mozilla.maybe";
    //WARNING: DO NOT EVER CHANGE THIS!
    const url = "chrome://inforss/content/inforssNewFeed.xul?feed=%s";
    for (let feed of feeds)
    {
      install_content_handler(feed_base + feed + ".feed", url, inforss.get_name());
    }
  }
  catch (e)
  {
    inforss.alert(e);
  }
}

//-------------------------------------------------------------------------------------------------------------
function inforssStartExtension1(step/*, status*/)
{
  try
  {
    if ((step == null) || (step != "send"))
    {
      if (document.getElementById("inforss.headlines") != null) // only if the page is loaded
      {
        if (gInforssMediator == null)
        {
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
    inforss.alert(e);
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
      const bartop = document.getElementById("inforss-bar-top");
      if (bartop != null)
      {
        InforssPrefs.setBoolPref("toolbar.collapsed", bartop.collapsed);
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

      const serverInfo = inforssXMLRepository.getServerInfo();
      if (inforssGetNbWindow() == 0 && serverInfo.autosync &&
          navigator.vendor != "Thunderbird")
      {
        inforssCopyLocalToRemote(serverInfo.protocol, serverInfo.server, serverInfo.directory, serverInfo.user, serverInfo.password, inforssStopExtension1, false);
      }
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
}

//-------------------------------------------------------------------------------------------------------------
function inforssStopExtension1(/*step, status*/)
{}

//-------------------------------------------------------------------------------------------------------------
function inforssGetNbWindow()
{
  //FIXME Not sure what this is used for. Only values that are tested for are
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
    inforss.debug(e);
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

//------------------------------------------------------------------------------
// remove all menuitem in the popup menu except the trash icon and separator
function inforssClearPopupMenu()
{
  inforss.traceIn();
  try
  {
    clear_added_menu_items();
    const menupopup = document.getElementById("inforss-menupopup");
    let child = menupopup.getElementsByTagName("menuseparator")[0].nextSibling;
    while (child != null)
    {
      const nextChild = child.nextSibling;
      menupopup.removeChild(child);
      child = nextChild;
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
  inforss.traceOut();
}


//------------------------------------------------------------------------------
// This clears the 'addons' in the popup menu
function clear_added_menu_items()
{
  inforss.traceIn();
  try
  {
    const menupopup = document.getElementById("inforss-menupopup");
    const separators = menupopup.getElementsByTagName("menuseparator");
    if (separators.length > 1)
    {
      //Remove all the added items and the added separator. Note that separators
      //is a live list so I have to remember the end as the first deletion will
      //change the value of separators.
      let child = separators[0];
      let end = separators[1];
      while (child != end)
      {
          const nextChild = child.nextSibling;
          menupopup.removeChild(child);
          child = nextChild;
      }
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
  inforss.traceOut();
}

//-------------------------------------------------------------------------------------------------------------
function inforssResetSubMenu()
{
  inforss.traceIn();
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
          //FIXME why not addEventListener
          if (menupopup.getAttribute("type") == "rss" ||
              menupopup.getAttribute("type") == "atom")
          {
            let id = menupopup.getAttribute("id");
            let index = id.indexOf("-");
            menupopup.setAttribute("onpopupshowing", "return inforssSubMenu(" + id.substring(index + 1) + ");");
          }
          else
          {
            menupopup.setAttribute("onpopupshowing", "return false");
          }
          menupopup = inforss.replace_without_children(menupopup);
          inforssAddNoData(menupopup);
        }
      }
      child = child.nextSibling;
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
  inforss.traceOut();
}

//------------------------------------------------------------------------------
//Fill in the popup with things that could be turned into feeds
/* exported rssFillPopup */
function rssFillPopup(event)
{
  inforss.traceIn();
  var returnValue = true;
  try
  {
    if (event.button == 0 && !event.ctrlKey)
    {
      // left button
      //Set the trash icon state. Seems to be more visible than effective
      {
        const trash = document.getElementById("inforss-menupopup").childNodes[0];
        trash.setAttribute("disabled", option_window_displayed() ? "true" : "false");
      }
      clear_added_menu_items();
      if (event.target.getAttribute("id") == "inforss-menupopup")
      {
        inforssResetSubMenu();
      }

      let nb = 0;

      //feeds found in the current page
      if (inforssXMLRepository.menu_includes_page_feeds)
      {
        const browser = gBrowser.selectedBrowser;
        //this (feeds) is completely not documented...
        if ('feeds' in browser && browser.feeds != null)
        {
          //Sadly the feeds array seems to end up with dupes, so make it a set.
          for (let feed of new Set(browser.feeds))
          {
            if (inforssXMLRepository.get_item_from_url(feed.href) == null)
            {
              add_addfeed_menu_item(nb, feed.href, feed.title);
              ++nb;
            }
          }
        }
      }

      //If there's a feed (or at least a URL) in the clipboard, add that
      if (inforssXMLRepository.menu_includes_clipboard)
      {
        //FIXME Badly written (try/catch)
        const clipboard = Components.classes["@mozilla.org/widget/clipboard;1"].getService(Components.interfaces.nsIClipboard);
        const Transferable = Components.Constructor(
          "@mozilla.org/widget/transferable;1",
          Components.interfaces.nsITransferable);
        const xferable = new Transferable();
        xferable.addDataFlavor("text/unicode");
        try
        {
          clipboard.getData(xferable,
                            Components.interfaces.nsIClipboard.kGlobalClipboard);

          let data = {};
          xferable.getAnyTransferData({}, data, {});
          data = data.value.QueryInterface(Components.interfaces.nsISupportsString).data;
          if (data != null &&
              (data.startsWith("http://") ||
               data.startsWith("file://") ||
               data.startsWith("https://")) &&
              data.length < 60)
          {
            if (inforssXMLRepository.get_item_from_url(data) == null)
            {
              add_addfeed_menu_item(nb, data, data);
              nb++;
            }
          }
        }
        catch (e)
        {
          inforss.debug(e);
        }
      }

      //Add livemarks
      if (inforssXMLRepository.menu_includes_livemarks)
      {
        for (let mark of AnnotationService.getItemsWithAnnotation("livemark/feedURI"))
        {
          let url = AnnotationService.getItemAnnotation(mark, "livemark/feedURI");
          let title = BookmarkService.getItemTitle(mark);
          if (inforssXMLRepository.get_item_from_url(url) == null)
          {
            add_addfeed_menu_item(nb, url, title);
            ++nb;
          }
        }
      }
    }
    else
    {
      //any other button
      returnValue = false;
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
  inforss.traceOut();

  return returnValue;
}

//-------------------------------------------------------------------------------------------------------------
/* exported inforssDisplayOption */
function inforssDisplayOption(event)
{
  inforss.traceIn();
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
    inforss.debug(e);
  }
  inforss.traceOut();
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

//------------------------------------------------------------------------------
function add_addfeed_menu_item(nb, url, title)
{
  var menuItem = document.createElement("menuitem");
  var labelStr = inforss.get_string("menuadd") + " " + title;
  if (url != title)
  {
    labelStr += " (" + url + ")";
  }
  menuItem.setAttribute("label", labelStr);
  menuItem.setAttribute("data", url);
  menuItem.setAttribute("tooltiptext", url);

  //Disable if option window is displayed
  menuItem.setAttribute("disabled", option_window_displayed() ? "true" : "false");

  const menupopup = document.getElementById("inforss-menupopup");

  //Arrange as follows
  //trash
  //separator
  //addons
  //separator
  //feeds
  const separators = menupopup.getElementsByTagName("menuseparator");
  const separator = separators.item(separators.length - 1);
  if (separators.length == 1)
  {
    menupopup.insertBefore(document.createElement("menuseparator"), separator);
  }
  menupopup.insertBefore(menuItem, separator);
}

//------------------------------------------------------------------------------
function add_feed(url)
{
  if (inforssXMLRepository.get_item_from_url(url) != null) // already exists
  {
    inforss.alert(inforss.get_string("duplicate"));
  }
  //FIXME Check if option window is open
  else
  {
    //FIXME whyyyy?
    if (gInforssXMLHttpRequest == null)
    {
      getInfoFromUrl(url); // search for the general information of the feed: title, ...
    }
  }
}

//------------------------------------------------------------------------------
/* exported select_feed */
//Select a new feed, either by selecting from the menu or when a new feed is
//added
//This is accessed from the 'add' popup if you 'select as current'.
function select_feed(url)
{
  var changed = gInforssMediator.setSelected(url);

  if (changed || inforssXMLRepository.headline_bar_enabled)
  {
    document.getElementById('newsbar1').label = null;
    document.getElementById('newsbar1').style.visibility = "hidden";
  }
  //this seems to be in the wrong place as well. surely you only want to save
  //if you've actually changed something?
  inforssSave();
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
//returns true if option window displayed, when it would be a bad idea to
//update things
function option_window_displayed()
{
  return WindowMediator.getMostRecentWindow("inforssOption") != null;
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
    if (option_window_displayed() ||
        event.target.id != "inforss-icon" ||
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
      inforss.alert(inforss.get_string("malformedUrl"));
      return;
    }
    if (inforssXMLRepository.get_item_from_url(url.href) != null)
    {
      inforss.alert(inforss.get_string("duplicate"));
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
    if (has_data_type(event, MIME_feed_type) && !option_window_displayed())
    {
      //It's a feed/group
      if (event.dataTransfer.getData(MIME_feed_type) != "group")
      {
        //It's not a group. Allow it to be moved/copied
        event.dataTransfer.dropEffect =
          inforssXMLRepository.menu_show_feeds_from_groups ? "copy" : "move";
        event.preventDefault();
      }
    }
  },

  on_drop: function(event)
  {
    const source_url = event.dataTransfer.getData(MIME_feed_url);
    const source_rss = inforssXMLRepository.get_item_from_url(source_url);
    const dest_url = event.target.getAttribute("url");
    const dest_rss = inforssXMLRepository.get_item_from_url(dest_url);
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
    if (has_data_type(event, MIME_feed_url) && !option_window_displayed())
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
    if (selectedInfo == null || selectedInfo.getType() != "group" || option_window_displayed())
    {
      return;
    }
    if (has_data_type(event, MIME_feed_type))
    {
      //It's a feed/group
      if (event.dataTransfer.getData(MIME_feed_type) != "group")
      {
        //It's not a group. Allow it to be moved/copied
        event.dataTransfer.dropEffect =
          inforssXMLRepository.menu_show_feeds_from_groups ? "copy" : "move";
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
  inforss.traceIn();
  var item = null;
  try
  {
    var popup = document.getElementById("inforss-menupopup");
    var obj = popup.childNodes[popup.childNodes.length - 1];
    var stop = false;
    title = title.toLowerCase();
    while ((obj != null) && (stop == false))
    {
      if (obj.nodeName == "menuseparator" ||
          (inforssXMLRepository.menu_sorting_style == "asc" && title > obj.getAttribute("label").toLowerCase()) ||
          (inforssXMLRepository.menu_sorting_style == "des" && title < obj.getAttribute("label").toLowerCase()))
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
    inforss.debug(e);
  }
  inforss.traceOut();
  return item;
}

//-------------------------------------------------------------------------------------------------------------
/* exported inforssAddItemToMenu */
function inforssAddItemToMenu(rss)
{
  inforss.traceIn();
  try
  {
    let menuItem = null;
    if (rss.getAttribute("groupAssociated") == "false" ||
        inforssXMLRepository.menu_show_feeds_from_groups)
    {
      const has_submenu = inforssXMLRepository.menu_show_headlines_in_submenu &&
        (rss.getAttribute("type") == "rss" ||
         rss.getAttribute("type") == "atom");

      const typeObject = has_submenu ? "menu" : "menuitem";

      const menu = document.getElementById("inforss-menupopup");
      const item_num = menu.childElementCount;

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

      //Is this necessary?
      //menuItem.setAttribute("data", rss.getAttribute("url"));
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
      menuItem.setAttribute("id", "inforss.menuitem-" + item_num);
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

      if (has_submenu)
      {
        let menupopup = document.createElement("menupopup");
        menupopup.setAttribute("type", rss.getAttribute("type"));
        //FIXME Seriously. use addEventListener
        menupopup.setAttribute("onpopupshowing",
                               "return inforssSubMenu(" + item_num + ");");
        menupopup.setAttribute("onpopuphiding", "return inforssSubMenu2();");
        //?
        menupopup.setAttribute("id", "inforss.menupopup-" + item_num);
        inforssAddNoData(menupopup);
        menuItem.appendChild(menupopup);
      }

      if (inforssXMLRepository.menu_sorting_style != "no")
      {
        let indexItem = inforssLocateMenuItem(rss.getAttribute("title"));
        menu.insertBefore(menuItem, indexItem);
      }
      else
      {
        menu.appendChild(menuItem);
      }
    }
    //FIXME It is not obvious from the name why this is happening!
    gInforssMediator.addFeed(rss, menuItem);
  }
  catch (e)
  {
    inforss.debug(e);
  }
  inforss.traceOut();
}



//------------------------------------------------------------------------------
/* exported inforssSubMenu */
function inforssSubMenu(index)
{
  inforss.traceIn();
  window.clearTimeout(gInforssCurrentMenuHandle);
  var res;
  if (inforssXMLRepository.menu_show_headlines_in_submenu)
  {
    gInforssCurrentMenuHandle = window.setTimeout(inforssSubMenu1, 3000, index);
    res = true;
  }
  else
  {
    res = false;
  }
  inforss.traceOut();
  return res;
}

//------------------------------------------------------------------------------
//This is the timeout callback from above. ick.
function inforssSubMenu1(index)
{
  inforss.traceIn();
  try
  {
    const popup = document.getElementById("inforss.menupopup-" + index);
    //Need to do this to stop the sub-menu disappearing
    popup.setAttribute("onpopupshowing", null);

    //Sadly you can't use replace_without_children here - it appears the
    //browser has got hold of the element and doesn't spot we've replaced it
    //with another one. so we have to change this element in place.
    inforss.remove_all_children(popup);

    //FIXME the http request should be async
    const item = document.getElementById("inforss.menuitem-" + index);
    const url = item.getAttribute("url");
    const rss = inforssXMLRepository.get_item_from_url(url);
    const xmlHttpRequest = new XMLHttpRequest();
    const user = rss.getAttribute("user");
    xmlHttpRequest.open("GET",
                        url,
                        false,
                        user,
                        inforssXMLRepository.readPassword(url, user));
    xmlHttpRequest.send();

    const fm = new FeedManager();
    fm.parse(xmlHttpRequest);
    let max = Math.min(INFORSS_MAX_SUBMENU, fm.rssFeeds.length);
    for (let i = 0; i < max; i++)
    {
      const newElem = document.createElement("menuitem");
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
      newElem.addEventListener("command", open_headline_page);
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
  inforss.traceOut();
}

//------------------------------------------------------------------------------
function open_headline_page(event)
{
  gBrowser.addTab(event.target.getAttribute("url"));
  event.stopPropagation();
}
//-------------------------------------------------------------------------------------------------------------
//FIXME This is used - someone uses strings to set popup callbacks
function inforssSubMenu2()
{
  inforss.traceIn();
  window.clearTimeout(gInforssCurrentMenuHandle);
  inforss.traceOut();
  return true;
}

//-------------------------------------------------------------------------------------------------------------
function inforssAddNoData(popup)
{
  inforss.traceIn();
  try
  {
    var item = document.createElement("menuitem");
    item.setAttribute("label", inforss.get_string("noData"));
    popup.appendChild(item);
  }
  catch (e)
  {
    inforss.debug(e);
  }
  inforss.traceOut();
}

//-------------------------------------------------------------------------------------------------------------
function getInfoFromUrl(url)
{
  inforss.traceIn();
  let user = null;
  let password = null;
  var getFlag = true;
  if (url.indexOf("https://") == 0)
  {
    const topWindow = WindowMediator.getMostRecentWindow("navigator:browser");

    const gUser = {
      value: null
    };
    var gPassword = {
      value: null
    };
    //FIXME use the popup component
    var dialog = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].createInstance(Components.interfaces.nsIPromptService);
    getFlag = dialog.promptUsernameAndPassword(topWindow, null, inforss.get_string("account") + " " + url, gUser, gPassword, null,
    {
      value: true
    });
    user = gUser.value;
    password = gPassword.value;
  }
  if (getFlag)
  {
    inforssGetRss(url, user, password);
  }
  inforss.traceOut();
}

//-------------------------------------------------------------------------------------------------------------
function inforssGetRss(url, user, password)
{
  inforss.traceIn();
  try
  {
    if (gInforssXMLHttpRequest != null)
    {
      gInforssXMLHttpRequest.abort();
    }
    gInforssUrl = url;
    gInforssXMLHttpRequest = new XMLHttpRequest();
    gInforssXMLHttpRequest.timeout = 10000;
    gInforssXMLHttpRequest.ontimeout = inforssProcessReqChange;
    gInforssXMLHttpRequest.user = user;
    gInforssXMLHttpRequest.password = password;
    gInforssXMLHttpRequest.onload = inforssProcessReqChange;
    gInforssXMLHttpRequest.open("GET", url, true, user, password);
    gInforssXMLHttpRequest.send();
  }
  catch (e)
  {
    inforss.debug(e);
  }
  inforss.traceOut();
}

//-------------------------------------------------------------------------------------------------------------
function inforssProcessReqChange()
{
  inforss.traceIn();
  try
  {
    if (gInforssXMLHttpRequest.status == 200)
    {
      inforssPopulateMenuItem(gInforssXMLHttpRequest, gInforssUrl);
    }
    else
    {
      inforss.debug("There was a problem retrieving the XML data:\n" + gInforssXMLHttpRequest.statusText + "/" + gInforssXMLHttpRequest.status + "\nUrl=" + gInforssUrl);
      inforss.alert(inforss.get_string("feed.issue"));
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
  gInforssXMLHttpRequest = null;
  inforss.traceOut();
}


//-------------------------------------------------------------------------------------------------------------
function inforssPopulateMenuItem(request, url)
{
  inforss.traceIn();
  try
  {
    var objDOMParser = new DOMParser();
    var objDoc = objDOMParser.parseFromString(request.responseText, "text/xml");
    var str_description = null;
    var str_title = null;
    var str_link = null;
    let feed_flag = "rss";

    var format = objDoc.documentElement.nodeName;
    //FIXME More duplex code
    if (format == "feed")
    {
      str_description = "tagline";
      str_title = "title";
      str_link = "link";
      feed_flag = "atom";
      //want a link with rel=self to fetch the actualy page
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

    if (descriptions.length > 0 && links.length > 0 && titles.length > 0)
    {
      var elem = inforssXMLRepository.add_item(
        getNodeValue(titles),
        getNodeValue(descriptions),
        url,
        feed_flag == "atom" ? getHref(links) : getNodeValue(links),
        request.user,
        request.password,
        feed_flag);

      elem.setAttribute("icon", inforssFindIcon(elem));

      inforssAddItemToMenu(elem);
      inforssSave();

      window.openDialog(
        "chrome://inforss/content/inforssAdd.xul",
        "_blank",
        "chrome,centerscreen,resizable=yes, dialog=no",
        elem,
        getCurrentRSS());
    }
    else
    {
      inforss.alert(inforss.get_string("feed.issue"));
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
  inforss.traceOut();
}

//------------------------------------------------------------------------------
//This event happens when you click on the popup menu from the news bar. We
//use it to detect right clicks only, or for left clicks on menu parents,
//(i.e. when we're configured to show a sub menu of headlines), as we get a
//command event from left clicks on non-parent nodes
/* exported inforssMouseUp */
function inforssMouseUp(menu, event)
{
  if (event.button == 2 || event.target.nodeName == "menu")
  {
    item_selected(menu, event.target, event.button == 0);
  }
}

//------------------------------------------------------------------------------
//This event happens when you click on the menu popup
/* exported inforssCommand */
function inforssCommand(menu, event)
{
  item_selected(menu, event.target, !event.ctrlKey);
}

//------------------------------------------------------------------------------
//This event happens when you click on the menu popup
function item_selected(menu, target, left_click)
{
  menu.hidePopup();
  if (left_click)
  {
    if (target.hasAttribute('url'))
    {
      //Clicked on a feed
      if (option_window_displayed())
      {
        //I have a settings window open already
        inforss.alert(inforss.get_string("option.dialogue.open"));
      }
      else
      {
        select_feed(target.getAttribute("url"));
      }
    }
    else if (target.getAttribute('data') != "trash") // not the trash icon
    {
      //Non feed. This is a feed to add.
      add_feed(target.getAttribute('data'));
    }
  }
  else
  {
    //right click (or ctrl-enter for keyboard navigators)
    if (target.hasAttribute("url"))
    {
      //It has a url. Either it's a feed or the parent node is a feed
      if (!target.hasAttribute("id"))
      {
        target = target.parentNode.parentNode;
      }
      if (option_window_displayed())
      {
        //I have a settings window open already
        inforss.alert(inforss.get_string("option.dialogue.open"));
      }
      else
      {
        window.openDialog("chrome://inforss/content/inforssOption.xul",
                          "_blank",
                          "chrome,centerscreen,resizable=yes,dialog=no",
                          target);
      }
    }
    else if (target.getAttribute('data') == "trash")
    {
      //Right click on trash is another way of opening the option window
      if (option_window_displayed())
      {
        //I have a settings window open already
        inforss.alert(inforss.get_string("option.dialogue.open"));
      }
      else
      {
        window.openDialog("chrome://inforss/content/inforssOption.xul",
                          "_blank",
                          "chrome,centerscreen,resizable=yes,dialog=no");
      }
    }
  }
}

//-----------------------------------------------------------------------------------------------------
function manageRSSChanged(subject, topic, data)
{
  inforss.traceIn();
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
    inforss.debug(e);
  }
  inforss.traceOut();
}

//-----------------------------------------------------------------------------------------------------
/* exported inforssResizeWindow1 */
function inforssResizeWindow1(event)
{
  inforss.traceIn();
  try
  {
    window.clearTimeout(gInforssResizeTimeout);
    gInforssResizeTimeout = window.setTimeout(inforssResizeWindow, 1000, event);
  }
  catch (e)
  {
    inforss.debug(e);
  }
  inforss.traceOut();
}

//-----------------------------------------------------------------------------------------------------
function inforssResizeWindow(/*event*/)
{
  inforss.traceIn();
  try
  {
    if (gInforssMediator != null)
    {
      gInforssMediator.resizedWindow();
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
  inforss.traceOut();
}

//-----------------------------------------------------------------------------------------------------
/* exported inforssRelocateBar */
//Though it's only used in one file. Not sure why it should be here.
function inforssRelocateBar()
{
  inforss.traceIn();
  try
  {
    //This method is a little difficult to get your head round.
    //The headline bar can be in 3 places:
    //top: Implemented as a toolbar
    //bottom: implemented as an hbox which is tacked onto the status bar
    //status bar: added to the status bar
    const headlines = document.getElementById("inforss.headlines");
    const container = headlines.parentNode;

    const desired_container = function()
    {
      switch (inforssXMLRepository.headline_bar_location)
      {
        case inforssXMLRepository.in_status_bar:
          return "addon-bar";

        case inforssXMLRepository.at_top:
          return "inforss-bar-top";

        case inforssXMLRepository.at_bottom:
          return "inforss-bar-bottom";
      }
    }();

    if (desired_container == container.id)
    {
      //changing to the same place. Do nothing.
      return;
    }

    if (container.id == "inforss-bar-top")
    {
      //Changing the location. If we were at the top remember whether or not the
      //toolbar was hidden.
      InforssPrefs.setBoolPref("toolbar.collapsed", container.collapsed);
    }

    const update_panel = function(in_toolbar)
    {
      document.getElementById("inforss.resizer").collapsed = in_toolbar;
      document.getElementById("inforss.toolbar.spring").collapsed = in_toolbar;
      const statuspanelNews = document.getElementById("inforss-hbox");
      statuspanelNews.flex = in_toolbar ? "1" : "0";
      statuspanelNews.firstChild.flex = in_toolbar ? "1" : "0";
      headlines.flex = in_toolbar ? "1" : "0";
    };

    if (inforssXMLRepository.headline_bar_location == inforssXMLRepository.in_status_bar)
    {
      //Headlines in the status bar
      update_panel(false);

      container.parentNode.removeChild(container);
      document.getElementById("addon-bar").appendChild(headlines);
    }
    else
    {
      //Headlines in a tool bar
      update_panel(true);
      if (container.id == "addon-bar")
      {
        // was in the status bar
        headlines.parentNode.removeChild(headlines);
      }
      else
      {
        // was in a tool bar
        container.parentNode.removeChild(container);
      }

      //Why do we keep recreating the tool bar?
      if (inforssXMLRepository.headline_bar_location == inforssXMLRepository.at_top)
      {
        //headlines at the top
        let statusbar = document.createElement("toolbar");
        //There is not a lot of documentation on what persist does. In theory it
        //should cause the collapsed attribute to be persisted on restart, but
        //we're recreating the toolbar every time we go through here.
        statusbar.persist = "collapsed";
        statusbar.collapsed = InforssPrefs.getBoolPref("toolbar.collapsed");
        statusbar.setAttribute("toolbarname", "InfoRSS");
        statusbar.id = "inforss-bar-top";
        statusbar.appendChild(headlines);
        var toolbox = document.getElementById("navigator-toolbox");
        if (toolbox == null)
        {
          //This probably means it is thunderbird which probably means this'll
          //never happen.
          toolbox = document.getElementById("addon-bar").previousSibling;
          toolbox.parentNode.insertBefore(statusbar, toolbox);
        }
        else
        {
          toolbox.appendChild(statusbar);
        }
      }
      else
      {
        //headlines at the bottom
        //FIXME It'd be nice if this could somehow appear in toolbar menu
        let statusbar = document.createElement("hbox");
        statusbar.id = "inforss-bar-bottom";
        statusbar.appendChild(headlines);
        let toolbar = document.getElementById("addon-bar");
        toolbar.parentNode.insertBefore(statusbar, toolbar);
      }
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
  inforss.traceOut();
}

//-----------------------------------------------------------------------------------------------------
function inforssAddNewFeed(menuItem)
{
  try
  {
    const url = menuItem.inforssUrl;

    if (inforssXMLRepository.get_item_from_url(url) != null) // already exists
    {
      inforss.alert(inforss.get_string("duplicate"));
      return;
    }

    if (option_window_displayed())
    {
      inforss.alert(inforss.get_string("option.dialogue.open"));
      return;
    }

    //FIXME Is this test *really* necessary?
    if (gInforssXMLHttpRequest == null)
    {
      getInfoFromUrl(url); // search for the general information of the feed: title, ...
    }
  }
  catch (e)
  {
    inforss.debug(e);
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
    inforss.debug(e);
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
    inforss.debug(e);
  }
}
