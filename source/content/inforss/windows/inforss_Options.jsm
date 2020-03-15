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
// inforss_Options
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------
/* jshint globalstrict: true */
/* eslint-disable strict */
"use strict";

/* eslint-disable array-bracket-newline */
/* exported EXPORTED_SYMBOLS */
const EXPORTED_SYMBOLS = [
  "Options", /* exported Options */
];
/* eslint-enable array-bracket-newline */

const { Config } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Config.jsm",
  {}
);

const {
  add_event_listeners,
  complete_assign,
  format_as_hh_mm_ss
} = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Utils.jsm",
  {}
);

const { get_version } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Version.jsm",
  {}
);

const mediator = {};
Components.utils.import(
  "chrome://inforss/content/mediator/inforss_Mediator_API.jsm",
  mediator
);

const { Basic } = Components.utils.import(
  "chrome://inforss/content/windows/Options/inforss_Options_Basic.jsm",
  {}
);

const { Advanced } = Components.utils.import(
  "chrome://inforss/content/windows/Options/inforss_Options_Advanced.jsm",
  {}
);

const { Credits } = Components.utils.import(
  "chrome://inforss/content/windows/Options/inforss_Options_Credits.jsm",
  {}
);

const { Help } = Components.utils.import(
  "chrome://inforss/content/windows/Options/inforss_Options_Help.jsm",
  {}
);

const { Base } = Components.utils.import(
  "chrome://inforss/content/windows/Options/inforss_Options_Base.jsm",
  {}
);

/** Main option window screen
 *
 * @param {xulDocument} document - options window
 * @param {Mediator} mediator_ - mediator from main window
 */
function Options(document, mediator_)
{
  Base.call(this, document, this);
  this._mediator = mediator_;

  this._tabs.push(new Basic(document, this));
  this._tabs.push(new Advanced(document, this));
  this._tabs.push(new Credits(document, this));
  this._tabs.push(new Help(document, this));

  this._selected_index = 0;
  this._tab_box = document.getElementById("inforss.option.tab");

  const config = new Config();
  Object.preventExtensions(config);

  this._config = config;
  this.read_configuration();

  const me = document.getElementById('inforssOption');
  this._event_listeners = add_event_listeners(
    this,
    document,
    [ me, "dialogaccept", this._accept ],
    [ me, "dialogcancel", this.dispose ],
    [ me.getButton("extra1"), "click", this._apply ],
    [ "tab.basic", "click", this._validate_and_switch ],
    [ "tab.advanced", "click", this._validate_and_switch ],
    [ "tab.credits", "click", this._validate_and_switch ],
    [ "tab.help", "click", this._validate_and_switch ],
  );

  document.title += ' ' + get_version();
}

const Super = Base.prototype;
Options.prototype = Object.create(Super);
Options.prototype.constructor = Options;

complete_assign(Options.prototype, {

  /** load the current configuration */
  read_configuration()
  {
    this._deleted_feeds = [];
    this._all_feeds_deleted = false;
    this._config.read_configuration();
    this.config_loaded(this._config);
  },

  /** Called when activate button is clicked on feed report */
  update_report()
  {
    this._tabs[1].update_report();
  },

  /** Validate tabs
   *
   * @returns {boolean} true if all tabs are valid
   */
  validate()
  {
    let index = 0;
    for (const tab of this._tabs)
    {
      if (! tab.validate())
      {
        this._document.getElementById("inforss.option.tab").selectedIndex =
          index;
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
    this._deleted_feeds = this._deleted_feeds.filter(
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
    this._deleted_feeds.push(url);
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
    const opener = this._document.defaultView.opener;
    //I suspect this is always available
    if (opener.getBrowser)
    {
      //If we only have 1 tab open and it's not actually doing anything,
      //use it. Otherwise open a new tab.
      const browser = opener.getBrowser();
      if (browser.browsers.length == 1 &&
          (browser.currentURI == null ||
           browser.currentURI.spec == "about:blank" ||
           //eslint-disable-next-line no-extra-parens
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

    const originalFeed = this._mediator.find_feed(feed.getAttribute("url"));
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
        obj.last_refresh = format_as_hh_mm_ss(originalFeed.lastRefresh);
      }
      obj.headlines = originalFeed.num_headlines;
      obj.unread_headlines = originalFeed.num_unread_headlines;
      obj.new_headlines = originalFeed.num_new_headlines;
    }
    if (originalFeed.active &&
        feed.getAttribute("activity") == "true" &&
        originalFeed.next_refresh != null)
    {
      obj.next_refresh = format_as_hh_mm_ss(originalFeed.next_refresh);
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
    this._all_feeds_deleted = true;
    this.config_loaded(config);
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
    const window = this._document.getElementById("inforssOption");
    window.getButton("accept").setAttribute("disabled", flag);
    window.getButton("extra1").setAttribute("disabled", flag);
  },

  /** OK button clicked
   *
   * @param {DialogAccept} event - accepted event
   */
  _accept(event)
  {
    if (this._apply(event))
    {
      //All OK, clean up
      this.dispose();
    }
    else
    {
      //Ooops
      event.preventDefault();
    }
  },

  /** Apply button clicked
   *
   * @param {MouseEvent} _event - click event
   *
   * @returns {boolean} true if validation was ok and changes were applied.
   */
  _apply(_event)
  {
    if (! this.validate())
    {
      return false;
    }

    this.update();

    this._config.save();
    if (this._all_feeds_deleted)
    {
      mediator.remove_all_feeds();
    }
    else
    {
      mediator.remove_feeds(this._deleted_feeds);
    }
    this._deleted_feeds = [];
    this._all_feeds_deleted = false;
    return true;
  },

  /** New tab selected - valid and switch tab
   *
   * @param {MouseEvent} _event - click event.
   */
  _validate_and_switch(_event)
  {
    if (this._tabs[this._selected_index].validate())
    {
      this._selected_index = this._tab_box.selectedIndex;
      this._tabs[this._selected_index].select();
    }
    else
    {
      this._tab_box.selectedIndex = this._selected_index;
    }
  },

});
