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
 *   Tom Tanner
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
// inforssOption
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------

/*jshint browser: true, devel: true */
/*eslint-env browser */

var inforss = inforss || {};

Components.utils.import("chrome://inforss/content/modules/inforss_Backup.jsm",
                        inforss);

Components.utils.import("chrome://inforss/content/modules/inforss_Config.jsm",
                        inforss);

Components.utils.import("chrome://inforss/content/modules/inforss_Debug.jsm",
                        inforss);

Components.utils.import("chrome://inforss/content/modules/inforss_Prompt.jsm",
                        inforss);

Components.utils.import("chrome://inforss/content/modules/inforss_Utils.jsm",
                        inforss);

Components.utils.import("chrome://inforss/content/modules/inforss_Version.jsm",
                        inforss);

inforss.mediator = {};
Components.utils.import(
  "chrome://inforss/content/mediator/inforss_Mediator_API.jsm",
  inforss.mediator
);

Components.utils.import(
  "chrome://inforss/content/windows/Options/inforss_Options_Basic.jsm",
  inforss
);

Components.utils.import(
  "chrome://inforss/content/windows/Options/inforss_Options_Credits.jsm",
  inforss
);

Components.utils.import(
  "chrome://inforss/content/windows/Options/inforss_Options_Help.jsm",
  inforss
);

//From inforssOptionAdvanced */
/* globals populate_advanced_tab, update_advanced_tab */

/* exported LocalFile */
const LocalFile = Components.Constructor("@mozilla.org/file/local;1",
                                         "nsILocalFile",
                                         "initWithPath");

/* exported inforssXMLRepository */
var inforssXMLRepository = new inforss.Config();
Object.preventExtensions(inforssXMLRepository);

//Shared with inforssOptionAdvanced
/* exported gInforssMediator */
var gInforssMediator = null;

const options_tabs = [];

//FIXME By rights this is part of the configuration vvv
const INFORSS_DEFAULT_GROUP_ICON = "chrome://inforss/skin/group.png";

const WindowMediator = Components.classes[
  "@mozilla.org/appshell/window-mediator;1"].getService(
  Components.interfaces.nsIWindowMediator);

//I seriously don't think I should need this and it's a bug in palemoon 28
//See Issue #192
const inforssPriv_XMLHttpRequest = Components.Constructor(
  "@mozilla.org/xmlextras/xmlhttprequest;1",
  "nsIXMLHttpRequest");

//Kludge for pretending this is a class
const xthis = {};
xthis.open_url = openURL;
xthis.get_feed_info = get_feed_info;

//------------------------------------------------------------------------------
/* exported init */
function init()
{
  try
  {
    const enumerator = WindowMediator.getEnumerator(null);
    while (enumerator.hasMoreElements())
    {
      const win = enumerator.getNext();
      if (win.gInforssMediator != null)
      {
        gInforssMediator = win.gInforssMediator;
        break;
      }
    }

    //Populate the font menu.
    //Note: Whilst arguably we should respond to font add/removal events and
    //display the current font list whenever clicked, the old code didn't,
    //and I still think this is the best place to deal with this.
    //this API is almost completely undocumented.
    const FontService = Components.classes[
      "@mozilla.org/gfx/fontenumerator;1"].getService(
      Components.interfaces.nsIFontEnumerator);

    const font_menu = document.getElementById("fresh-font");

    for (const font of FontService.EnumerateAllFonts({ value: null }))
    {
      const element = font_menu.appendItem(font, font);
      element.style.fontFamily = font;
    }

    options_tabs.push(new inforss.Basic(document, inforssXMLRepository, xthis));
    options_tabs.push(new inforss_Options_Advanced(document, inforssXMLRepository, xthis));
    options_tabs.push(new inforss.Credits(document, inforssXMLRepository, xthis));
    options_tabs.push(new inforss.Help(document, inforssXMLRepository, xthis));

    load_and_display_configuration();
  }
  catch (err)
  {
    inforss.debug(err);
  }
}

function load_and_display_configuration()
{
  inforssXMLRepository.read_configuration();
  redisplay_configuration();
}

//------------------------------------------------------------------------------
/* exports redisplay_configuration */
function redisplay_configuration()
{
  try
  {
    for (const tab of options_tabs)
    {
      tab.config_loaded();
    }

    populate_advanced_tab();

    //not entirely sure what this bit of code is doing. It appears to be using
    //the apply button not existing to create the apply button.
    if (document.getElementById("inforss.apply") == null)
    {
      var cancel = document.getElementById('inforssOption').getButton("cancel");
      var apply = document.getElementById('inforssOption').getButton("extra1");
      apply.parentNode.removeChild(apply);
      apply.label = inforss.get_string("apply");
      apply.setAttribute("label", apply.label);
      apply.setAttribute("accesskey", "");
      apply.setAttribute("id", "inforss.apply");
      apply.addEventListener("click", _apply);
      cancel.parentNode.insertBefore(apply, cancel);
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
/* exported accept */
function accept()
{
  var returnValue = false;
  try
  {
    returnValue = _apply();
    if (returnValue)
    {
      returnValue = false;
      var acceptButton = document.getElementById('inforssOption').getButton("accept");
      acceptButton.setAttribute("disabled", "true");
      //FIXME Why the heck do we set a timer for this?
      window.setTimeout(closeOptionDialog, 2300);
    }
  }
  catch (e)
  {
    inforss.debug(e);
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
    if (returnValue)
    {
      inforssXMLRepository.save();
      inforss.mediator.remove_feeds(options_tabs[0].deleted_feeds);
      options_tabs[0].clear_deleted_feeds();
      returnValue = true;
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
  return returnValue;
}

//-----------------------------------------------------------------------------------------------------
/* exported dispose */
function dispose()
{
  for (const tab of options_tabs)
  {
    tab.dispose();
  }
}

//-----------------------------------------------------------------------------------------------------
//basically returns the value from validDialog, which seems odd
function storeValue()
{
  try
  {
    if (! validDialog())
    {
      return false;
    }

    for (const tab of options_tabs)
    {
      tab.update();
    }

    update_advanced_tab();
    return true;
  }
  catch (e)
  {
    inforss.debug(e);
  }
  return false;
}

//-----------------------------------------------------------------------------------------------------
function validDialog()
{
  var returnValue = true;
  try
  {
    for (const tab of options_tabs)
    {
      if (! tab.validate())
      {
        return false;
      }
    }

    //belongs in advance tab
    //FIXME Remove all the nulls man
    if (returnValue)
    {
      //advanced/default values
      if ((document.getElementById('defaultGroupIcon').value == null) ||
        (document.getElementById('defaultGroupIcon').value == ""))
      {
        returnValue = false;
        inforss.alert(inforss.get_string("icongroup.mandatory"));
      }
    }

    if (returnValue)
    {
      //advance/synchronisation
      if (document.getElementById('repoAutoSync').selectedIndex == 0 &&
          ! checkServerInfoValue())
      {
        returnValue = false;
        document.getElementById('inforss.option.tab').selectedIndex = 1;
        document.getElementById('inforss.listbox2').selectedIndex = 3;
        document.getElementById('inforssTabpanelsAdvance').selectedIndex = 3;
      }
    }

    if (returnValue)
    {
      //advanced/default values
      if (document.getElementById('savePodcastLocation').selectedIndex == 0)
      {
        if ((document.getElementById('savePodcastLocation1').value == null) ||
          (document.getElementById('savePodcastLocation1').value == ""))
        {
          returnValue = false;
          inforss.alert(inforss.get_string("podcast.mandatory"));
        }
        else
        {
          try
          {
            let dir = new LocalFile(
              document.getElementById('savePodcastLocation1').value);
            if (!dir.exists() || !dir.isDirectory())
            {
              returnValue = false;
            }
          }
          catch (ex)
          {
            returnValue = false;
          }
          if (! returnValue)
          {
            inforss.alert(inforss.get_string("podcast.location.notfound"));
          }
        }
        if (! returnValue)
        {
          document.getElementById('inforss.option.tab').selectedIndex = 1;
          document.getElementById('inforss.listbox2').selectedIndex = 0;
          document.getElementById('inforssTabpanelsAdvance').selectedIndex = 0;
        }
      }
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }

  return returnValue;
}

//-----------------------------------------------------------------------------------------------------
//shared with inforssOptionAdvanced - called after running change default values
//effectively allows you to change default values without worrying about current
//settings. Which is a bit questionable. But see comments/ticket elsewhere about
//validation in general.
/* exported selectRSS2 */
function selectRSS2()
{
  try
  {
    options_tabs[0]._tabs[0]._show_selected_feed2();
  }
  catch (e)
  {
    inforss.debug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
/* exported resetRepository */
function resetRepository()
{
  if (inforss.confirm("reset.repository"))
  {
    inforssXMLRepository.reset_xml_to_default();
    inforss.mediator.remove_all_feeds();
    load_and_display_configuration();
  }
}

//-----------------------------------------------------------------------------------------------------
/* exported clear_headline_cache */
function clear_headline_cache()
{
  if (inforss.confirm("reset.rdf"))
  {
    inforss.mediator.clear_headline_cache();
  }
}

//------------------------------------------------------------------------------
/* exported exportLivemark */
//This will create a bookmark folder called "InfoRSS Feeds". Any previous
//content of this folder will be nuked.
function exportLivemark()
{
  //Create a bookmark
  try
  {
    const folder_name = "InfoRSS Feeds";
    const BookmarkService = Components.classes[
      "@mozilla.org/browser/nav-bookmarks-service;1"].getService(
      Components.interfaces.nsINavBookmarksService);
    //I should find if this exists and use that already. This creates multiple
    //folders with the same name.
    const folder = BookmarkService.createFolder(
      BookmarkService.bookmarksMenuFolder,
      folder_name,
      BookmarkService.DEFAULT_INDEX);
    const LivemarkService = Components.classes[
      "@mozilla.org/browser/livemark-service;2"].getService(
      Components.interfaces.mozIAsyncLivemarks);

    document.getElementById("exportLivemarkProgressBar").value = 0;
    document.getElementById("inforss.livemarkDeck").selectedIndex = 1;

    const max = inforssXMLRepository.get_all().length;
    let sequence = Promise.resolve(1);
    for (const feed_ of inforssXMLRepository.get_all())
    {
      const feed = feed_; //I don't think this should be required with es6
      if (feed.getAttribute("type") == "rss" || feed.getAttribute("type") == "atom")
      {
        sequence = sequence.then(function(i)
        {
          return LivemarkService.addLivemark({
            title: feed.getAttribute("title"),
            feedURI: inforss.make_URI(feed.getAttribute("url")),
            siteURI: inforss.make_URI(feed.getAttribute("link")),
            parentId: folder,
            index: BookmarkService.DEFAULT_INDEX
          }).then(function()
          {
            document.getElementById("exportLivemarkProgressBar").value = i * 100 / max;
            return new Promise((resolve /*, reject*/ ) =>
            {
              setTimeout(i => resolve(i + 1), 0, i);
            });
          });
        });
      }
    }

    sequence.then(function()
    {
      document.getElementById("exportLivemarkProgressBar").value = 100;
      inforss.alert(inforss.get_string("export.livemark"));
    }).catch(function(e)
    {
      inforss.alert(e);
    }).then(function()
    {
      document.getElementById("inforss.livemarkDeck").selectedIndex = 0;
    });
  }
  catch (e)
  {
    inforss.debug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
/* exported exportBrowser */
function exportBrowser()
{
  try
  {
    var topMostBrowser = getTopMostBrowser();
    if (topMostBrowser != null)
    {
      const file = inforss.Config.get_filepath();
      if (file.exists())
      {
        topMostBrowser.addTab("file:///" + file.path);
      }
    }
  }
  catch (e)
  {
    inforss.debug(e);
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
function closeOptionDialog()
{
  document.getElementById("inforssOption").cancelDialog();
}

//-----------------------------------------------------------------------------------------------------
/* exported resetDefaultIconGroup */
function resetDefaultIconGroup()
{
  try
  {
    document.getElementById('defaultGroupIcon').value = INFORSS_DEFAULT_GROUP_ICON;
    document.getElementById('inforss.defaultgroup.icon').src = document.getElementById('defaultGroupIcon').value;
  }
  catch (e)
  {
    inforss.debug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
/* exported setDefaultIconGroup */
function setDefaultIconGroup()
{
  try
  {
    document.getElementById('inforss.defaultgroup.icon').src = document.getElementById('defaultGroupIcon').value;
  }
  catch (e)
  {
    inforss.debug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
/* exported copyLocalToRemote */
function copyLocalToRemote()
{
  try
  {
    if (checkServerInfoValue())
    {
      defineVisibilityButton("true", "upload");
      inforss.send_to_server(
        {
          protocol: document.getElementById('inforss.repo.urltype').value,
          server: document.getElementById('ftpServer').value,
          directory: document.getElementById('repoDirectory').value,
          user: document.getElementById('repoLogin').value,
          password: document.getElementById('repoPassword').value
        },
        true,
        ftpUploadCallback,
        inforsssetExportProgressionBar
      );
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
/* exported copyRemoteToLocal */
function copyRemoteToLocal()
{
  try
  {
    if (checkServerInfoValue())
    {
      defineVisibilityButton("true", "download");
      inforss.load_from_server(
        { protocol: document.getElementById('inforss.repo.urltype').value,
          server: document.getElementById('ftpServer').value,
          directory: document.getElementById('repoDirectory').value,
          user: document.getElementById('repoLogin').value,
          password: document.getElementById('repoPassword').value
        },
        ftpDownloadCallback,
        inforsssetImportProgressionBar
      );
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function checkServerInfoValue()
{
  var returnValue = true;
  try
  {
    //FIXME NO NULLS!
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
      inforss.alert(inforss.get_string("serverinfo.mandatory"));
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
  return returnValue;
}

//-----------------------------------------------------------------------------------------------------
function ftpUploadCallback(/*status*/)
{
  try
  {
    inforsssetExportProgressionBar(100);
    defineVisibilityButton("false", "upload");
  }
  catch (e)
  {
    inforss.debug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function ftpDownloadCallback(/* status*/)
{
  try
  {
    inforsssetImportProgressionBar(100);
    defineVisibilityButton("false", "download");

    load_and_display_configuration();

    inforss.mediator.remove_all_feeds();
    inforss.mediator.reload_headline_cache();
  }
  catch (e)
  {
    inforss.debug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function defineVisibilityButton(flag, action)
{
  try
  {
    var accept = document.getElementById('inforssOption').getButton("accept");
    accept.setAttribute("disabled", flag);
    var apply = document.getElementById('inforss.apply');
    apply.setAttribute("disabled", flag);
    if (action == "download")
    {
      document.getElementById("inforss.deck.importfromremote").selectedIndex = (flag == "true") ? 1 : 0;
      inforsssetImportProgressionBar(0);
    }
    else
    {
      document.getElementById("inforss.deck.exporttoremote").selectedIndex = (flag == "true") ? 1 : 0;
      inforsssetExportProgressionBar(0);
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function inforsssetImportProgressionBar(value)
{
  try
  {
    if (document.getElementById("inforss.repo.synchronize.importfromremote.importProgressBar") != null)
    {
      document.getElementById("inforss.repo.synchronize.importfromremote.importProgressBar").value = value;
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function inforsssetExportProgressionBar(value)
{
  try
  {
    if (document.getElementById("inforss.repo.synchronize.exporttoremote.exportProgressBar") != null)
    {
      document.getElementById("inforss.repo.synchronize.exporttoremote.exportProgressBar").value = value;
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
/* exported purgeNow */
function purgeNow()
{
  inforss.mediator.purge_headline_cache();
}

//-----------------------------------------------------------------------------------------------------
/* exported openURL */
//FIXME There are three slightly different versions of this
function openURL(url)
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

//-----------------------------------------------------------------------------------------------------
function testCreateTab()
{
  var returnValue = true;
  if (window.opener.getBrowser().browsers.length == 1)
  {
    if ((window.opener.getBrowser().currentURI == null) ||
        ((window.opener.getBrowser().currentURI.spec == "") &&
         (window.opener.getBrowser().selectedBrowser.webProgress.isLoadingDocument)) ||
        (window.opener.getBrowser().currentURI.spec == "about:blank"))
    {
      returnValue = false;
    }
  }
  return returnValue;
}

//-----------------------------------------------------------------------------------------------------
/* exported locateExportEnclosure */
function locateExportEnclosure(suf1, suf2)
{
  var dirPath = null;
  try
  {
    var dirPicker = Components.classes["@mozilla.org/filepicker;1"].createInstance(Components.interfaces.nsIFilePicker);
    dirPicker.init(window, inforss.get_string("podcast.location"), dirPicker.modeGetFolder);

    var response = dirPicker.show();
    if ((response == dirPicker.returnOK) || (response == dirPicker.returnReplace))
    {
      dirPath = dirPicker.file.path;
      document.getElementById("savePodcastLocation" + suf2).value = dirPath;
      document.getElementById("savePodcastLocation" + suf1).selectedIndex = 0;
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
}


//-----------------------------------------------------------------------------------------------------
/* exported locateRepository */
function locateRepository()
{
  try
  {
    var dir = inforss.get_profile_dir();
    const localFile = new LocalFile(dir.path);
    var filePicker = Components.classes["@mozilla.org/filepicker;1"].createInstance(Components.interfaces.nsIFilePicker);
    filePicker.appendFilters(Components.interfaces.nsIFilePicker.filterXML);
    filePicker.appendFilter("", "*.rdf");
    filePicker.init(window, "", Components.interfaces.nsIFilePicker.modeOpen);
    filePicker.displayDirectory = localFile;
    filePicker.defaultString = null;
    filePicker.appendFilters(filePicker.filterAll);

    /*var response =*/
    filePicker.show();
  }
  catch (e)
  {
    inforss.debug(e);
  }
}

//-------------------------------------------------------------------------------------------------------------
/* exported inforssFindIcon */
function inforssFindIcon(rss)
{
  try
  {
    //Get the web page
    var url = rss.getAttribute("link");
    const user = rss.getAttribute("user");
    const password = inforss.read_password(url, user);
    var xmlHttpRequest = new inforssPriv_XMLHttpRequest();
    xmlHttpRequest.open("GET", url, false, user, password);
    xmlHttpRequest.send();
    //Now read the HTML into a doc object
    var doc = document.implementation.createHTMLDocument("");
    doc.documentElement.innerHTML = xmlHttpRequest.responseText;
    //See https://en.wikipedia.org/wiki/Favicon
    //https://www.w3.org/2005/10/howto-favicon
    //https://sympli.io/blog/2017/02/15/heres-everything-you-need-to-know-about-favicons-in-2017/
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
    //possibly try the URL class for this? (new URL(favicon, url))
    //Now make the full URL. If it starts with '/', it's relative to the site.
    //If it starts with (.*:)// it's a url. I assume you fill in the missing
    //protocol with however you got the page.
    url = xmlHttpRequest.responseURL;
    if (favicon.startsWith("//"))
    {
      favicon = url.split(":")[0] + ':' + favicon;
    }
    if (!favicon.includes("://"))
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
    xmlHttpRequest = new inforssPriv_XMLHttpRequest();
    xmlHttpRequest.open("GET", favicon, false, user, password);
    xmlHttpRequest.send();
    if (xmlHttpRequest.status != 404 && xmlHttpRequest.responseText.length != 0)
    {
      return favicon;
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
  return inforssXMLRepository.Default_Feed_Icon;
}

//------------------------------------------------------------------------------
//This creates an object containing feed information to display in the options
//window in various places
/* exported get_feed_info */
function get_feed_info(feed)
{
  const obj = {
    icon: feed.getAttribute("icon"),
    enabled: feed.getAttribute("activity") == "true",
    status: "inactive",
    last_refresh: "",
    headlines: "",
    unread_headlines: "",
    new_headlines: "",
    next_refresh: "",
    in_group: false
  };

  const originalFeed = gInforssMediator.find_feed(feed.getAttribute("url"));
  if (originalFeed === undefined)
  {
    return obj;
  }

  const is_active = originalFeed.active &&
                    (feed.getAttribute("type") == "group" ||
                     originalFeed.lastRefresh != null);
  obj.status = originalFeed.error ? "error" :
               is_active ? "active" :
               "inactive";
  if (is_active)
  {
    if (originalFeed.lastRefresh !== null)
    {
      obj.last_refresh = inforss.format_as_hh_mm_ss(originalFeed.lastRefresh);
    }
    obj.headlines = originalFeed.num_headlines;
    obj.unread_headlines = originalFeed.num_unread_headlines;
    obj.new_headlines = originalFeed.num_new_headlines;
  }
  if (originalFeed.active &&
      feed.getAttribute("activity") == "true" &&
      originalFeed.next_refresh != null)
  {
    obj.next_refresh = inforss.format_as_hh_mm_ss(originalFeed.next_refresh);
  }
  obj.in_group = originalFeed.feedXML.getAttribute("groupAssociated") == "true";

  return obj;
}

//------------------------------------------------------------------------------
window.addEventListener(
  "load",
  () =>
  {
    document.title += ' ' + inforss.get_version();
  }
);
