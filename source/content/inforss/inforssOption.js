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

Components.utils.import(
  "chrome://inforss/content/windows/Options/inforss_Options_Base.jsm",
  inforss
);

/* exported LocalFile */
const LocalFile = Components.Constructor("@mozilla.org/file/local;1",
                                         "nsILocalFile",
                                         "initWithPath");

/* exported inforssXMLRepository */
var inforssXMLRepository = new inforss.Config();
Object.preventExtensions(inforssXMLRepository);

var gInforssMediator = null;

const WindowMediator = Components.classes[
  "@mozilla.org/appshell/window-mediator;1"].getService(
  Components.interfaces.nsIWindowMediator);

let inforss_deleted_feeds = [];
let inforss_all_feeds_deleted = false;

//Le constructor - inherit from base?
//FIXME remove config param everywhere
function inforss_Options(document, config/*, options*/)
{
  inforss.Base.call(this, document, config, this);
  //this._deleted_feeds = [];
  this._tabs.push(new inforss.Basic(document, config, this));
  this._tabs.push(new inforss_Options_Advanced(document, config, this));
  this._tabs.push(new inforss.Credits(document, config, this));
  this._tabs.push(new inforss.Help(document, config, this));
}

const Super = inforss.Base.prototype;
inforss_Options.prototype = Object.create(Super);
inforss_Options.prototype.constructor = inforss_Options;

inforss.complete_assign(inforss_Options.prototype, {

  /** Called when activate button is clicked on feed report */
  update_report()
  {
    this._tabs[1].update_report();
  },

  validate()
  {
    let index = 0;
    for (const tab of this._tabs)
    {
      if (! tab.validate())
      {
        document.getElementById("inforss.option.tab").selectedIndex = index;
        return false;
      }
      index += 1;
    }

    return true;
  },

  /** Called when the 'current feed' is changed */
  new_current_feed()
  {
    this._tabs[1].new_current_feed();
  },

  /** Called when a feed is added.
   *
   * @param {RSS} feed - feed configuration
   */
  add_feed(feed)
  {
    Super.add_feed.call(this, feed);

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
    Super.remove_feed.call(this, url);
    inforss_deleted_feeds.push(url);
  },

  /** Update the toggle state for a feed
   *
   * @param {RSS} feed - feed that has changed
   */
  feed_active_state_changed(feed)
  {
    Super.feed_active_state_changed.call(this, feed);
  },

  /** Called when a feed configuration is changed from the advanced menu
   *
   * @param {string} url - feed changed
   */
  feed_changed(url)
  {
    //feed config has been changed - update display if necessary
    this._tabs[0].redisplay_feed(url);
  },

  /** Opens a url in a new tab
   *
   * @param {string} url - url to open
   */
  open_url(url)
  {
    const opener = window.opener;
    //I suspect this is always available
    if (opener.getBrowser)
    {
      //If we only have 1 tab open and it's not actually doing anything,
      //use it. Otherwise open a new tab.
      const browser = opener.getBrowser();
      if (browser.browsers.length == 1 &&
          (browser.currentURI == null ||
           browser.currentURI.spec == "about:blank" ||
           (browser.currentURI.spec == "" &&
            browser.selectedBrowser.webProgress.isLoadingDocument)))
      {
        browser.loadURI(url);
      }
      else
      {
        browser.selectedTab = browser.addTab(url);
      }
    }
    else
    {
      opener.open(url);
    }
  },

  /** get information about feed to display in the 'status' line or in the
   * report tab
   *
   * @param {RSS} feed - the feed
   *
   * @returns {Object} stuff
   */
  get_feed_info(feed)
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
      in_group: feed.getAttribute("groupAssociated") == "true"
    };

    const originalFeed = gInforssMediator.find_feed(feed.getAttribute("url"));
    if (originalFeed === undefined)
    {
      return obj;
    }

    const is_active = originalFeed.active &&
                      (feed.getAttribute("type") == "group" ||
                       originalFeed.lastRefresh != null);
    /* eslint-disable indent */
    obj.status = originalFeed.error ? "error" :
                 is_active ? "active" :
                 "inactive";
    /* eslint-enable indent */
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

    return obj;
  },

  /** Called when configuration has been replaced so we have no idea of what
   * feeds might or might not have been deleted.
   *
   * @param {Config} config - new configuration
   */
  reload_configuration(config)
  {
    //FIXME get rid of the try catch when button processed properly
    try
    {
      inforss_all_feeds_deleted = true;
      inforssXMLRepository = config;
      this.config_loaded(config);
    }
    catch (e)
    {
      inforss.debug(e);
      console.log(e);
    }
  },

  /** Finds details of feed in browser window
   *
   * @returns {RSS} feed config
   */
  find_feed(url)
  {
    return gInforssMediator.find_feed(url);
  },

});

//Kludge for pretending this is a class
/* exported inforss_options_this */
var inforss_options_this;

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

    inforss_options_this = new inforss_Options(document, inforssXMLRepository);

    const apply = document.getElementById('inforssOption').getButton("extra1");
    apply.addEventListener("click", _apply);

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
  inforss_options_this.config_loaded(inforssXMLRepository);
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
    if (! inforss_options_this.validate())
    {
      return false;
    }

    inforss_options_this.update();

    inforssXMLRepository.save();
    if (inforss_all_feeds_deleted)
    {
      inforss.mediator.remove_all_feeds();
    }
    else
    {
      inforss.mediator.remove_feeds(inforss_deleted_feeds);
    }
    inforss_deleted_feeds = [];
    inforss_all_feeds_deleted = false;
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
  inforss_options_this.dispose();
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
    var apply = document.getElementById('inforssOption').getButton("extra1");
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


//------------------------------------------------------------------------------
window.addEventListener(
  "load",
  () =>
  {
    document.title += ' ' + inforss.get_version();
  }
);
