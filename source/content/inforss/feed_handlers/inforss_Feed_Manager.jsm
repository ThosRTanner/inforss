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
//------------------------------------------------------------------------------
// inforss_Feed_Manager
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------
/* jshint globalstrict: true */
/* eslint-disable strict */
"use strict";

/* eslint-disable array-bracket-newline */
/* exported EXPORTED_SYMBOLS */
const EXPORTED_SYMBOLS = [
  "Feed_Manager", /* exported Feed_Manager */
];
/* eslint-enable array-bracket-newline */

const { debug, log_exception } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Debug.jsm", {}
);

const { Feed_Page } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Feed_Page.jsm", {}
);

const { Headline_Cache } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Headline_Cache.jsm", {}
);

const { alert } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Prompt.jsm", {}
);

const { Sleeper } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Sleeper.jsm", {}
);

const { get_string } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Version.jsm", {}
);

const { Added_New_Feed_Dialogue } = Components.utils.import(
  "chrome://inforss/content/windows/inforss_Added_New_Feed_Dialogue.jsm", {}
);

const feed_handlers = {};

Components.utils.import(
  "chrome://inforss/content/feed_handlers/inforss_factory.jsm", feed_handlers
);

const mediator = {};

Components.utils.import(
  "chrome://inforss/content/mediator/inforss_Mediator_API.jsm", mediator
);

const { console } = Components.utils.import(
  "resource://gre/modules/Console.jsm", {}
);

const DOMParser = Components.Constructor("@mozilla.org/xmlextras/domparser;1",
                                         "nsIDOMParser");

const Browser_Prefs = Components.classes[
  "@mozilla.org/preferences-service;1"].getService(
  Components.interfaces.nsIPrefService).getBranch("browser.");

//Import all the types of feeds I want to manage. This has to be done somewhere
//so that the classes get registered.
Components.utils.import(
  "chrome://inforss/content/feed_handlers/inforss_Atom_Feed.jsm", {}
);

Components.utils.import(
  "chrome://inforss/content/feed_handlers/inforss_Grouped_Feed.jsm", {}
);

Components.utils.import(
  "chrome://inforss/content/feed_handlers/inforss_HTML_Feed.jsm", {}
);

Components.utils.import(
  "chrome://inforss/content/feed_handlers/inforss_NNTP_Feed.jsm", {}
);

Components.utils.import(
  "chrome://inforss/content/feed_handlers/inforss_RSS_Feed.jsm", {}
);

/** Check if browser is configured to work offline.
 *
 * if the browser is in offline mode, we go through the motions but don't
 * actually fetch any data.
 *
 * @returns {boolean} True if browser is in offline mode.
 */
function browser_is_offline()
{
  return Browser_Prefs.prefHasUserValue("offline") &&
         Browser_Prefs.getBoolPref("offline");
}

/** Feed manager deals with cycling between feeds and storing headlines.
 *
 * @class
 *
 * @param {Document} document - The window document.
 * @param {Config} config - Extension configuration.
 * @param {Mediator} mediator_ - For communication between classes.
 */
function Feed_Manager(document, config, mediator_)
{
  this._document = document;
  this._config = config;
  this._mediator = mediator_;
  this._headline_cache = new Headline_Cache(config);
  this._fetch_timer = new Sleeper();
  this._cycle_timer = new Sleeper();
  this._feed_list = [];
  this._selected_feed = null;
  this._new_feed_requests = new Set();

  Object.seal(this);
}

Feed_Manager.prototype = {

  //-------------------------------------------------------------------------------------------------------------
  config_changed()
  {
    this._headline_cache.init();

    const new_feed = this._find_selected_feed();
    if (new_feed != this._selected_feed)
    {
      this._set_selected(new_feed);
    }
  },

  /** Stop fetching feeds. */
  dispose()
  {
    this._headline_cache.dispose();
    this._fetch_timer.abort();
    this._cycle_timer.abort();
    for (const feed of this._feed_list)
    {
      feed.dispose();
    }
    for (const request of this._new_feed_requests)
    {
      request.abort();
    }
  },

  /** This continually fetches the headlines from current feed. */
  async _schedule_fetch()
  {
    try
    {
      this._fetch_timer.abort();
      await this._fetch_timer.sleep(0);
      for (;;)
      {
        const feed = this._selected_feed;
        if (! browser_is_offline())
        {
          this._mediator.show_selected_feed(feed);
          feed.fetchFeed();
        }

        const expected = feed.get_next_refresh();
        if (expected == null)
        {
          console.warn("Empty group", feed);
          return;
        }
        const now = new Date();
        let next = expected - now;
        if (next < 0)
        {
          console.warn("fetchfeed overdue", expected, now, next, feed);
          next = 0;
        }
        //eslint-disable-next-line no-await-in-loop
        await this._fetch_timer.sleep(next);
      }
    }
    catch (err)
    {
      log_exception(err);
    }
  },

  /** Cycling timer. When this times out we select the next group/feed. */
  async _schedule_cycle()
  {
    try
    {
      this._cycle_timer.abort();
      for (;;)
      {
        //eslint-disable-next-line no-await-in-loop
        await this._cycle_timer.sleep(
          this._config.headline_bar_cycle_interval * 60 * 1000
        );
        //It is actually possible to triger this if you have a tooltip showing
        //at the point when the feed is cycled (quite easy if you halt scrolling
        //when mouse is over headline, AND you have a fairly short cycle time)
        while (this._mediator.isActiveTooltip())
        {
          //eslint-disable-next-line no-await-in-loop
          await this._cycle_timer.sleep(1000);
        }
        this._select_next_feed(1);
      }
    }
    catch (err)
    {
      log_exception(err);
    }
  },

//-------------------------------------------------------------------------------------------------------------
  //FIXME WTF does all this stuff do?
  //it seems to be getting the currently stored headlines and then populating
  //the thing with said currently stored headlines.
  sync(url)
  {
    const info = this.find_feed(url);
    if (info !== undefined && ! info.insync && info.headlines.length > 0 &&
        ! info.reload)
    {
      mediator.send_headline_data(info.headlines_as_xml);
    }
  },

  //-------------------------------------------------------------------------------------------------------------
  syncBack(data)
  {
    const objDOMParser = new DOMParser();
    const objDoc = objDOMParser.parseFromString(data, "text/xml");

    const url = objDoc.firstChild.getAttribute("url");
    const info = this.find_feed(url);

    if (info !== undefined && info.insync)
    {
      info.synchronize(objDoc);
    }
  },

  /** Called during initialisation to find the configured selected feed.
   *
   * If there is no configured selected feed this returns the first feed
   * found. I am not sure if this is a good idea.
   *
   * @returns {object} Current feed.
   */
  _find_selected_feed()
  {
    let res = this._feed_list.find(feed => feed.isSelected());
    //FIXME Why do we force it to return first one if nothing is selected?
    if (res === undefined && this._feed_list.length > 0)
    {
      res = this._feed_list[0];
      res.select();
    }
    return res;
  },
  //-------------------------------------------------------------------------------------------------------------
  get_selected_feed()
  {
    return this._selected_feed;
  },

  //-------------------------------------------------------------------------------------------------------------
  signalReadEnd(feed)
  {
    this._headline_cache.flush();
    this._mediator.updateBar(feed);
  },

  //-------------------------------------------------------------------------------------------------------------
  _passivate_old_selected()
  {
    this._fetch_timer.abort();
    var selectedInfo = this._selected_feed;
    if (selectedInfo != null)
    {
      selectedInfo.unselect();
      selectedInfo.deactivate();
    }
  },

  //-------------------------------------------------------------------------------------------------------------
  addFeed(feedXML, menuItem)
  {
    const old_feed = this.find_feed(feedXML.getAttribute("url"));
    if (old_feed === undefined)
    {
      const info = feed_handlers.factory.create(
        feedXML,
        {
          config: this._config,
          manager: this,
          mediator: this._mediator,
          menu_entry: menuItem
        }
      );
      this._feed_list.push(info);
    }
    else
    {
      old_feed.update_config(feedXML, menuItem);
    }
  },

  /** Find a feed handler given a url.
   *
   * @param {string} url - URL of feed.
   *
   * @returns {Feed} - Feed object (or undefined if can't be found).
   *
   */
  find_feed(url)
  {
    return this._feed_list.find(feed => feed.getUrl() == url);
  },

  /** Find a feed handler given a url.
   *
   * @warning this will likely go horribly wrong if the feed can't be found.
   *
   * @param {string} url - Url of feed.
   *
   * @returns {object} Object containing feed information and index of feed
   *                   in _feed_list.
   *
   */
  _locate_feed(url)
  {
    const idx = this._feed_list.findIndex(feed => feed.getUrl() == url);
    return { info: this._feed_list[idx], index: idx };
  },

  /** Select a new feed, kick off timers.
   *
   * @param {string} url - URL of feed.
   */
  setSelected(url)
  {
    this._set_selected(this.find_feed(url));
  },

  /** Select a new feed and kick off timers.
   *
   * @param {Feed} feed - Feed to select.
   */
  _set_selected(feed)
  {
    if (this._config.headline_bar_enabled)
    {
      this._mark_feed_selected(feed);
      if (this._config.headline_bar_cycle_feeds)
      {
        this._schedule_cycle();
      }
      else
      {
        this._cycle_timer.abort();
      }
    }
  },

  /** Delete all the feeds.
   *
   * Result of a config clear on ftp config reload.
   */
  delete_all_feeds()
  {
    while (this._feed_list.length != 0)
    {
      this.delete_feed(this._feed_list[0].getUrl());
    }
  },

  /** Delete a feed from feed manager list.
   *
   * Called after configuration has changed to remove a feed.
   *
   * @param {string} url - URL of feed to delete.
   */
  delete_feed(url)
  {
    //If we are removing the current feed, select another one
    const deleted_selected = this._selected_feed != null &&
                             this._selected_feed.getUrl() == url;

    const deletedInfo = this._locate_feed(url);
    if (deletedInfo.info == undefined)
    {
      //Happens if you create a feed in the options window and then delete it
      return;
    }
    this._feed_list.splice(deletedInfo.index, 1);
    //Remove feed from any grouped feeds as well.
    for (const feed of this._feed_list)
    {
      feed.remove_feed(url);
    }
    deletedInfo.info.remove();
    if (deleted_selected)
    {
      this._selected_feed = null;
      this._mediator.clear_selected_feed();
      if (this._feed_list.length > 0)
      {
        this._mark_feed_selected(this._feed_list[0]);
      }
      else
      {
        this._mediator.resetDisplay(); //headline_display
      }
    }
  },

  //-------------------------------------------------------------------------------------------------------------
  goHome()
  {
    var selectedInfo = this._selected_feed;
    if ((selectedInfo != null) && (selectedInfo.getType() != "group"))
    {
      this._mediator.open_link(selectedInfo.getLinkAddress());
    }
  },

  /** Display the next feed on the headline bar. */
  select_next_feed()
  {
    this._select_next_feed(1);
  },

  /** Display the previous feed on the headline bar. */
  select_previous_feed()
  {
    this._select_next_feed(-1);
  },

  /** Cycle through feeds on the headline bar.
   *
   * @param {number} direction - Direction to cycle. +1 or -1.
   *
   * @warning This cycles through feeds in more or less the order they were
   *          created.
   */
  _select_next_feed(direction)
  {
    const feed = this._selected_feed;
    if (this._selected_feed.isPlayList() &&
        ! this._config.headline_bar_cycle_feeds)
    {
      //If this is a playlist, just select the next element in the playlist
      feed.playlist_cycle(direction);
    }
    else if (this._config.headline_bar_cycle_feeds &&
             this._config.headline_bar_cycle_in_group &&
             feed.getType() == "group")
    {
      //If we're cycling in a group, let the group deal with things.
      feed.feed_cycle(direction);
    }
    else
    {
      const next = feed.find_next_feed(this._feed_list,
                                       this._locate_feed(feed.getUrl()).index,
                                       direction);
      //FIXME Optimisation needed if we cycle right back to the same one?
      this._mark_feed_selected(this._feed_list[next]);
    }
  },

  //-------------------------------------------------------------------------------------------------------------
  createNewRDFEntry(url, title, receivedDate, feedUrl)
  {
    this._headline_cache.createNewRDFEntry(url, title, receivedDate, feedUrl);
  },

  //-------------------------------------------------------------------------------------------------------------
  exists(url, title, checkHistory, feedUrl)
  {
    return this._headline_cache.exists(url, title, checkHistory, feedUrl);
  },

  //-------------------------------------------------------------------------------------------------------------
  getAttribute(url, title, attribute)
  {
    return this._headline_cache.getAttribute(url, title, attribute);
  },

  //-------------------------------------------------------------------------------------------------------------
  setAttribute(url, title, attribute, value)
  {
    return this._headline_cache.setAttribute(url, title, attribute, value);
  },

  //-------------------------------------------------------------------------------------------------------------
  reload_headline_cache()
  {
    this._headline_cache.init();
  },

  //-------------------------------------------------------------------------------------------------------------
  purge_headline_cache()
  {
    this._headline_cache.purge();
  },

  //-------------------------------------------------------------------------------------------------------------
  clear_headline_cache()
  {
    this._headline_cache.clear();
  },

  //-------------------------------------------------------------------------------------------------------------
  manualRefresh()
  {
    var selectedInfo = this._selected_feed;
    if (selectedInfo != null)
    {
      selectedInfo.manualRefresh();
    }
  },

  /** Add a new feed and pop up an optional selection window.
   *
   * @param {string} url - URL of feed to add.
   */
  add_feed_from_url(url)
  {
    if (this._config.get_item_from_url(url) != null)
    {
      alert(get_string("duplicate"));
      return;
    }

    //FIXME Feed page gets username and password - should be here.
    const request = new Feed_Page(url, { fetch_icon: true });
    this._new_feed_requests.add(request);
    request.fetch().then(
      () =>
      {
        try
        {
          const elem = this._config.add_item(request.title,
                                             request.description,
                                             url,
                                             request.link,
                                             request.user,
                                             request.password,
                                             request.type,
                                             request.icon);

          this._config.save();

          mediator.reload();

          //This complains I'm using new for side effects but, that's exactly
          //what I want to do here
          /* jshint ignore:start */
          //eslint-disable-next-line no-new
          new Added_New_Feed_Dialogue(this._document, this._config, elem, this);
          /* jshint ignore:end */
        }
        catch (err)
        {
          debug(err);
        }
      }
    ).catch(
      err =>
      {
        if (! ('event' in err) || err.event.type != "abort")
        {
          alert(err.message);
          console.log(err);
        }
      }
    ).then( //i.e. finally
      () =>
      {
        this._new_feed_requests.delete(request);
      }
    );
  },

  /** Mark feed selected.
   *
   * @param {Feed} feed - Feed information.
   */
  _mark_feed_selected(feed)
  {
    this._passivate_old_selected();
    this._selected_feed = feed;
    feed.select();
    feed.activate();
    this._schedule_fetch();
    if (feed.getType() == "group")
    {
      this._mediator.show_selected_feed(feed);
    }
  }
};
