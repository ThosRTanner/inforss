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

//Le constructor
function inforss_Options(document, config)
{
  inforss.Base.call(this, document, this);
  this._tabs.push(new inforss.Basic(document, this));
  this._tabs.push(new inforss_Options_Advanced(document, this));
  this._tabs.push(new inforss.Credits(document, this));
  this._tabs.push(new inforss.Help(document, this));
  this._config = config;
  this.read_configuration();
}

const Super = inforss.Base.prototype;
inforss_Options.prototype = Object.create(Super);
inforss_Options.prototype.constructor = inforss_Options;

inforss.complete_assign(inforss_Options.prototype, {

  /** load the current configuration */
  read_configuration()
  {
    inforss_deleted_feeds = [];
    inforss_all_feeds_deleted = false;
    this._config.read_configuration();
    this.config_loaded(this._config);
  },

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
    catch (err)
    {
      inforss.debug(err);
      console.log(err);
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

  /** Disables the apply and ok buttons */
  disable_updates()
  {
    this._set_updates_disabled(true);
  },

  /** Enables the apply and ok buttons */
  enable_updates()
  {
    this._set_updates_disabled(false);
  },

  /** Sets the disabled state of the ok/accept buttons
   *
   * @param {boolean} flag - true to disable buttons, else false
   */
  _set_updates_disabled(flag)
  {
    const window = this._document.getElementById('inforssOption');
    window.getButton("accept").setAttribute("disabled", flag);
    window.getButton("extra1").setAttribute("disabled", flag);
  }

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


    const apply = document.getElementById('inforssOption').getButton("extra1");
    apply.addEventListener("click", _apply);

    inforss_options_this = new inforss_Options(document, inforssXMLRepository);
  }
  catch (err)
  {
    inforss.debug(err);
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

//------------------------------------------------------------------------------
window.addEventListener(
  "load",
  () =>
  {
    document.title += ' ' + inforss.get_version();
  }
);
