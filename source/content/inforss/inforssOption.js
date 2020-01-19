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
/* globals Advanced__Report__populate */

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

const WindowMediator = Components.classes[
  "@mozilla.org/appshell/window-mediator;1"].getService(
  Components.interfaces.nsIWindowMediator);

//I seriously don't think I should need this and it's a bug in palemoon 28
//See Issue #192
const inforssPriv_XMLHttpRequest = Components.Constructor(
  "@mozilla.org/xmlextras/xmlhttprequest;1",
  "nsIXMLHttpRequest");

let inforss_deleted_feeds = [];

//Le constructor - inherit from base?
function inforss_Options()
{
  //this._deleted_feeds = [];
}

inforss.complete_assign(inforss_Options.prototype, {

  /** Opens a url in a new tab
   *
   * @param {string} url - url to open
   */
  open_url(url)
  {
    openURL(url);
  },

  /** get information about feed.
   *
   * @param {RSS} feed - the feed
   *
   * @returns {Object} stuff
   */
  get_feed_info(feed)
  {
    return get_feed_info(feed);
  },

  /** Called when what? */
  update_report()
  {
    Advanced__Report__populate();
  },

  /** Called when the 'current feed' is changed */
  new_current_feed()
  {
    options_tabs[1].new_current_feed();
  },

  /** Called when a feed is added.
   *
   * @param {RSS} feed - feed configuration
   */
  add_feed(feed)
  {
    for (const tab of options_tabs)
    {
      tab.add_feed(feed);
    }

    //Remove this from the removed urls just in case
    inforss_deleted_feeds = inforss_deleted_feeds.filter(
      item => item != feed.getAttribute("url")
    );
  },

  /** Called when a feed is removed.
   *
   * @param {string} url - url of feed being removed
   */
  remove_feed(url)
  {
    for (const tab of options_tabs)
    {
      tab.remove_feed(url);
    }
    inforss_deleted_feeds.push(url);
  },

  /** Called when a feed configuration is changed from the advanced menu
   *
   * @param {string} url - feed changed
   */
  feed_changed(url)
  {
    //feed config has been changed - update display if necessary
    options_tabs[0].redisplay_feed(url);
  },

  /** Called when the repository is nuked. This affects both the main browser
   * and the option window
   */
  reset_repository()
  {
    inforssXMLRepository.reset_xml_to_default();
    inforss.mediator.remove_all_feeds();
    load_and_display_configuration();
  },

});

//Kludge for pretending this is a class
const xthis = new inforss_Options();

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
//from loading opml file. this is a nasty mess.
function redisplay_configuration()
{
  try
  {
    inforss_deleted_feeds = [];

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
  try
  {
    if (! _apply())
    {
      return false;
    }
    var acceptButton = document.getElementById('inforssOption').getButton("accept");
    acceptButton.setAttribute("disabled", "true");
    //FIXME I think I have the exit conditions wrong. I don't think this should
    //be necessary
    dispose();
    return true;
  }
  catch (e)
  {
    inforss.debug(e);
  }
  return false;
}

//-----------------------------------------------------------------------------------------------------
//this is called from accept above and from the apply button via addeventListener
function _apply()
{
  try
  {
    if (! validDialog())
    {
      return false;
    }
    storeValue();
    inforssXMLRepository.save();
    inforss.mediator.remove_feeds(inforss_deleted_feeds);
    inforss_deleted_feeds = [];
    return true;
  }
  catch (e)
  {
    inforss.debug(e);
  }
  return false;
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
function storeValue()
{
  for (const tab of options_tabs)
  {
    tab.update();
  }

  update_advanced_tab();
}

//-----------------------------------------------------------------------------------------------------
function validDialog()
{
  let index = 0;
  for (const tab of options_tabs)
  {
    if (! tab.validate())
    {
      document.getElementById("inforss.option.tab").selectedIndex = index;
      return false;
    }
    index += 1;
  }

  return true;
}


//---------------------------------------------------------------------------------------
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
