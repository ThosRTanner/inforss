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

/*jshint browser: true, devel: true */
/*eslint-env browser */

var inforss = inforss || {};

Components.utils.import("chrome://inforss/content/modules/inforss_Config.jsm",
                        inforss);

Components.utils.import(
  "chrome://inforss/content/modules/inforss_Constants.jsm",
  inforss
);

Components.utils.import("chrome://inforss/content/modules/inforss_Debug.jsm",
                        inforss);

Components.utils.import("chrome://inforss/content/modules/inforss_Prompt.jsm",
                        inforss);

Components.utils.import("chrome://inforss/content/modules/inforss_Utils.jsm",
                        inforss);

Components.utils.import("chrome://inforss/content/modules/inforss_Version.jsm",
                        inforss);

inforss.mediator = inforss.mediator || {};
Components.utils.import(
  "chrome://inforss/content/mediator/inforss_Mediator_API.jsm",
  inforss.mediator);
Components.utils.import(
  "chrome://inforss/content/mediator/inforss_Mediator.jsm",
  inforss.mediator);

/* globals inforssCopyRemoteToLocal, inforssCopyLocalToRemote */
/* globals inforssFindIcon */

const {
  Feed_Parser,
  Feed_Parser_Promise
} = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Feed_Parser.jsm",
  {});

/* exported inforssXMLRepository */
var inforssXMLRepository;

var gInforssUrl = null;
var gInforssXMLHttpRequest = null;
/* exported gInforssMediator */
var gInforssMediator = null;
var gInforssResizeTimeout = null;

const WindowMediator = Components.classes[
  "@mozilla.org/appshell/window-mediator;1"].getService(
  Components.interfaces.nsIWindowMediator);

const PrefService = Components.classes[
  "@mozilla.org/preferences-service;1"].getService(
  Components.interfaces.nsIPrefService);

const InforssPrefs = PrefService.getBranch('inforss.');

//I seriously don't think I should need this and it's a bug in palemoon 28
//See Issue #192
/* exported Priv_XMLHttpRequest */
const Priv_XMLHttpRequest = Components.Constructor(
  "@mozilla.org/xmlextras/xmlhttprequest;1",
  "nsIXMLHttpRequest");

//-------------------------------------------------------------------------------------------------------------
function inforssStartExtension()
{
  window.removeEventListener("load", inforssStartExtension);

  //At this point we could/should check if the current version is different
  //to the previous version and throw up a web page.
  inforss.initialise_extension(
    () =>
    {
      try
      {
        checkContentHandler();

        inforssXMLRepository = new inforss.Config();
        Object.preventExtensions(inforssXMLRepository);

        //Load config from ftp server if required
        const serverInfo = inforssXMLRepository.getServerInfo();
        if (inforssGetNbWindow() == 1 && serverInfo.autosync)
        {
          inforssCopyRemoteToLocal(serverInfo.protocol,
                                   serverInfo.server,
                                   serverInfo.directory,
                                   serverInfo.user,
                                   serverInfo.password,
                                   inforssStartExtension2);
        }
        else
        {
          inforssStartExtension1();
        }
      }
      catch (e)
      {
        //FIXME inforss_Debug?
        console.log("[InfoRSS] failed to start: ", e);
      }
    }
  );
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
      Components.interfaces.nsIPrefLocalizedString
    );

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
        if (branch.getPrefType("uri") == branch.PREF_STRING &&
            branch.getCharPref("uri") == uri &&
            branch.getPrefType("type") == branch.PREF_STRING &&
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
            branch.setComplexValue("title",
                                   Components.interfaces.nsIPrefLocalizedString,
                                   local_title);
            found = true;
          }
        }
      }
      if (! found)
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

            if (typeBranch.getPrefType("uri") == typeBranch.PREF_INVALID)
            {
              // Yay. This one is free (or at least as best I can tell it is)
              let local_title = new PrefLocalizedString();
              local_title.data = title;
              typeBranch.setComplexValue(
                "title",
                Components.interfaces.nsIPrefLocalizedString,
                local_title
              );
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
      install_content_handler(feed_base + feed + ".feed",
                              url,
                              inforss.get_name());
    }
  }
  catch (e)
  {
    inforss.alert(e);
  }
}

//-------------------------------------------------------------------------------------------------------------
function inforssStartExtension2(step/*, status */)
{
  //FIXME all these tests seem hardly necessary. Probably something to do
  //with inforssCopyRemoteToLocal
  if (step != "send" && gInforssMediator == null)
  {
    inforssStartExtension1();
  }
}

function inforssStartExtension1()
{
  try
  {
    gInforssMediator = new inforss.mediator.Mediator(document,
                                                     inforssXMLRepository);

    //This used to have a 1.2 second delay but it seems pretty useless.
    inforss.mediator.reload();

    //Add in event listeners

    window.addEventListener("unload", inforssStopExtension);

    //FIXME This (resizing) rightly belongs to the headline bar code
    window.addEventListener("resize", inforssResizeWindow1);

    document.getElementById("contentAreaContextMenu").addEventListener(
      "popupshowing",
      inforssAddNewFeedPopup
    );

  }
  catch (e)
  {
    inforss.alert(e);
  }
}


//-------------------------------------------------------------------------------------------------------------
function inforssStopExtension()
{
  try
  {
    window.removeEventListener("unload", inforssStopExtension);
    window.removeEventListener("resize", inforssResizeWindow1);

    document.getElementById("contentAreaContextMenu").removeEventListener(
      "popupshowing",
      inforssAddNewFeedPopup
    );

    const bartop = document.getElementById("inforss-bar-top");
    if (bartop != null)
    {
      InforssPrefs.setBoolPref("toolbar.collapsed", bartop.collapsed);
    }

    gInforssMediator.dispose();

    const serverInfo = inforssXMLRepository.getServerInfo();
    if (inforssGetNbWindow() == 0 && serverInfo.autosync)
    {
      inforssCopyLocalToRemote(serverInfo.protocol,
                               serverInfo.server,
                               serverInfo.directory,
                               serverInfo.user,
                               serverInfo.password,
                               inforssStopExtension1,
                               false);
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
/* exported inforssDisplayOption1 */
function inforssDisplayOption1()
{
  try
  {
    inforss.open_option_window();
  }
  catch (err)
  {
    inforss.debug(err);
  }
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
      // search for the general information of the feed: title, ...
      getInfoFromUrl(url);
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
  inforssXMLRepository.save();
}

//-------------------------------------------------------------------------------------------------------------
function getInfoFromUrl(url)
{
  let res = { user: "", password: "" };
  if (url.startsWith("https://"))
  {
    res = inforss.get_username_and_password(
      inforss.get_string("account") + " " + url);
  }
  if (res != null)
  {
    inforssGetRss(url, res.user, res.password);
  }
}

//-------------------------------------------------------------------------------------------------------------
//FIXME This is manky code. It needs cleaning up and not to use a global
//also it seems to be a duplicate more or less of the headline submenu code
function inforssGetRss(url, user, password)
{
  try
  {
    if (gInforssXMLHttpRequest != null)
    {
      gInforssXMLHttpRequest.abort();
    }
    gInforssUrl = url;
    gInforssXMLHttpRequest = new Priv_XMLHttpRequest();
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
}

//-------------------------------------------------------------------------------------------------------------
function inforssProcessReqChange()
{
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
}

//----------------------------------------------------------------------------
//FIXME maybe should be a method of inforssXMLRepository using
//document.querySelector
function getCurrentRSS()
{
  for (let item of inforssXMLRepository.get_all())
  {
    if (item.getAttribute("selected") == "true")
    {
  ///**/console.log(RSSList.querySelector('RSS[selected="true"]'), item)
      return item;
    }
  }
  ///**/console.log(RSSList.querySelector('RSS[selected="true"]'), null)
  return null;
}


//-------------------------------------------------------------------------------------------------------------
function inforssPopulateMenuItem(request, url)
{
  try
  {
    const fm = new Feed_Parser();
    fm.parse(request);
    if (fm.description != null && fm.title != null && fm.link != null)
    {
      const elem = inforssXMLRepository.add_item(fm.title,
                                                 fm.description,
                                                 url,
                                                 fm.link,
                                                 request.user,
                                                 request.password,
                                                 fm.type);

      elem.setAttribute("icon", inforssFindIcon(elem));

      inforssXMLRepository.save();

      inforss.mediator.reload();

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
      if (inforss.option_window_displayed())
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
      if (inforss.option_window_displayed())
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
      if (inforss.option_window_displayed())
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
function inforssResizeWindow1(event)
{
  try
  {
    window.clearTimeout(gInforssResizeTimeout);
    gInforssResizeTimeout = window.setTimeout(inforssResizeWindow, 1000, event);
  }
  catch (e)
  {
    inforss.debug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function inforssResizeWindow(/*event*/)
{
  try
  {
    gInforssMediator.resizedWindow();
  }
  catch (err)
  {
    inforss.debug(err);
  }
}

//-----------------------------------------------------------------------------------------------------
/* exported inforssAddNewFeed */
//Called from the add feed window (where the RSS icon in the address bar ends
//up) and the overlay window when right clicking over a link.
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

    if (inforss.option_window_displayed())
    {
      inforss.alert(inforss.get_string("option.dialogue.open"));
      return;
    }

    //FIXME Is this test *really* necessary?
    if (gInforssXMLHttpRequest == null)
    {
      // search for the general information of the feed: title, ...
      getInfoFromUrl(url);
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function inforssAddNewFeedPopup(/*event*/)
{
  //Called on being about to show the context menu. This enables/disables
  //the 'add link to inforss' entry in the context menu
  //In theory there should be an event.target.triggerNode which containsFeed
  //the selected text. Doesn't seem to exist though hence use of
  //document.popNode in inforssGetMenuSelectedText
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
    //FIXME Should include news:// and nntp://
    if (selectedText.indexOf("http://") == -1 &&
        selectedText.indexOf("https://") == -1)
    {
      menuItem.hidden = true;
    }
    else
    {
      menuItem.hidden = false;
      menuItem.inforssUrl = selectedText;
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
  const node = document.popupNode;
  var selection = "";
  //FIXME This seems overly paranoid and results in duplicate code.
  if (node != null && node.localName != null)
  {
    const nodeLocalName = node.localName.toUpperCase();
    if (nodeLocalName == "TEXTAREA" ||
        (nodeLocalName == "INPUT" && node.type == "text"))
    {
      selection = node.value.substring(node.selectionStart, node.selectionEnd);
    }
    else if (nodeLocalName == "A")
    {
      selection = node.href;
    }
    else if (nodeLocalName == "IMG")
    {
      if (node.parentNode != null && node.parentNode.nodeName == "A")
      {
        selection = node.parentNode.href;
      }
    }
    else
    {
      let focusedWindow = new XPCNativeWrapper(
        document.commandDispatcher.focusedWindow,
        'document',
        'getSelection()'
      );
      selection = focusedWindow.getSelection().toString();
    }
  }
  else
  {
    let focusedWindow = new XPCNativeWrapper(
      document.commandDispatcher.focusedWindow,
      'document',
      'getSelection()');
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

window.addEventListener("load", inforssStartExtension);
