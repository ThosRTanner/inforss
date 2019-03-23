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

const { debug } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Debug.jsm",
  {}
);

const { clearTimeout, setTimeout } = Components.utils.import(
  "resource://gre/modules/Timer.jsm",
  {}
);

const { Headline_Cache } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Headline_Cache.jsm",
  {}
);

const feed_handlers = {};

Components.utils.import(
  "chrome://inforss/content/feed_handlers/inforss_factory.jsm",
  feed_handlers);

const mediator = {};

Components.utils.import(
  "chrome://inforss/content/mediator/inforss_Mediator_API.jsm",
  mediator);

const { console } =
  Components.utils.import("resource://gre/modules/Console.jsm", {});

const DOMParser = Components.Constructor("@mozilla.org/xmlextras/domparser;1",
                                         "nsIDOMParser");

const Browser_Prefs = Components.classes[
  "@mozilla.org/preferences-service;1"].getService(
  Components.interfaces.nsIPrefService).getBranch("browser.");

//Import all the types of feeds I want to manage. This has to be done somewhere
//so that the classes get registered.
Components.utils.import(
  "chrome://inforss/content/feed_handlers/inforss_Atom_Feed.jsm",
  {}
);

Components.utils.import(
  "chrome://inforss/content/feed_handlers/inforss_Grouped_Feed.jsm",
  {}
);

Components.utils.import(
  "chrome://inforss/content/feed_handlers/inforss_HTML_Feed.jsm",
  {}
);

Components.utils.import(
  "chrome://inforss/content/feed_handlers/inforss_NNTP_Feed.jsm",
  {}
);

Components.utils.import(
  "chrome://inforss/content/feed_handlers/inforss_RSS_Feed.jsm",
  {}
);

/** Check if browser is configured to work offline
 *
 * if the browser is in offline mode, we go through the motions but don't
 * actually fetch any data
 *
 * @returns {Boolean} true if browser is in offline mode
 */
function browser_is_offline()
{
  return Browser_Prefs.prefHasUserValue("offline") &&
         Browser_Prefs.getBoolPref("offline");
}

/** Feed manager deals with cycling between feeds and storing headlines
 *
 * @class
 *
 * @param {Mediator} mediator_ - for communication between classes
 * @param {Config} config - extension configuration
 */
function Feed_Manager(mediator_, config)
{
  this._mediator = mediator_;
  this._config = config;
  this._headline_cache = new Headline_Cache(config);
  this._schedule_timeout = null;
  this._cycle_timeout = null;
  this._feed_list = [];
  this._selected_feed = null;
}

Feed_Manager.prototype = {

  //-------------------------------------------------------------------------------------------------------------
  init()
  {
    try
    {
      this._headline_cache.init();
      const old_feed = this._selected_feed;
      this._selected_feed = null;

      clearTimeout(this._schedule_timeout);
      clearTimeout(this._cycle_timeout);
      for (let feed of this._feed_list)
      {
        feed.reset();
      }

      const new_feed = this._find_selected_feed();
      this._selected_feed = new_feed;
      if (new_feed != null)
      {
        if (old_feed != null && old_feed.getUrl() != new_feed.getUrl())
        {
          old_feed.deactivate();
        }
        //FIXME This is pretty much identical to setSelected
        //why both?
        if (this._config.headline_bar_enabled)
        {
          new_feed.activate();
          this.schedule_fetch(0);
          if (this._config.headline_bar_cycle_feeds)
          {
            this.schedule_cycle();
          }
        }
        else
        {
          new_feed.deactivate();
        }
      }
      this._mediator.refreshBar();
    }
    catch (e)
    {
      debug(e);
    }
  },

  /** called when shutting down
   *
   * Stop fetching feeds
   *
   */
  dispose()
  {
    this._headline_cache.dispose();
    clearTimeout(this._schedule_timeout);
    clearTimeout(this._cycle_timeout);
    for (let feed of this._feed_list)
    {
      feed.dispose();
    }
  },

  //Start the next fetch as soon as we've finished here.
  //Clear any existing fetch.
  schedule_fetch(timeout)
  {
    clearTimeout(this._schedule_timeout);
    this._schedule_timeout = setTimeout(this.fetch_feed.bind(this), timeout);
  },

  //Cycling timer. When this times out we select the next group/feed
  schedule_cycle()
  {
    clearTimeout(this._cycle_timeout);
    this._cycle_timeout = setTimeout(
      this.cycle_feed.bind(this),
      this._config.headline_bar_cycle_interval * 60 * 1000);
  },

  //----------------------------------------------------------------------------
  fetch_feed()
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
/**/console.log("Empty group", feed)
      return;
    }
    const now = new Date();
    let next = expected - now;
    if (next < 0)
    {
/**/console.log("fetchfeed overdue", expected, now, next, feed)
      next = 0;
    }
    this.schedule_fetch(next);
  },

  //cycle to the next feed or group
  cycle_feed()
  {
    //FIXME Does this do anything useful? This used to be in getNextGroupOrFeed but
    //I don't see you could have a tooltip active whilst pressing a button.
    if (this._mediator.isActiveTooltip())
    {
      this._cycle_timeout = setTimeout(this.cycle_feed.bind(this), 1000);
      return;
    }
    this.getNextGroupOrFeed(1);
    this.schedule_cycle();
  },

//-------------------------------------------------------------------------------------------------------------
  //FIXME WTF does all this stuff do?
  //it seems to be getting the currently stored headlines and then populating
  //the thing with said currently stored headlines.
  sync(url)
  {
    try
    {
      const info = this.find_feed(url);
      if (info !== undefined && ! info.insync && info.headlines.length > 0 &&
          ! info.reload)
      {
        mediator.send_headline_data(info.getXmlHeadlines());
      }
    }
    catch (err)
    {
      debug(err);
    }
  },

  //-------------------------------------------------------------------------------------------------------------
  syncBack(data)
  {
    try
    {
      const objDOMParser = new DOMParser();
      const objDoc = objDOMParser.parseFromString(data, "text/xml");

      const url = objDoc.firstChild.getAttribute("url");
      const info = this.find_feed(url);

      if (info !== undefined && info.insync)
      {
        info.synchronize(objDoc);
      }
    }
    catch (err)
    {
      debug(err);
    }
  },

  /** Called during initialisation to find the configured selected feed
   *
   * If there is no configured selected feed this returns the first feed
   * found. I am not sure if this is a good idea.
   *
   * @returns {Object} current feed
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
  passivateOldSelected()
  {
    try
    {
      clearTimeout(this._schedule_timeout);
      var selectedInfo = this._selected_feed;
      if (selectedInfo != null)
      {
        selectedInfo.unselect();
        selectedInfo.deactivate();
      }
    }
    catch (e)
    {
      debug(e);
    }
  },

  //-------------------------------------------------------------------------------------------------------------
  addFeed(feedXML, menuItem)
  {
    try
    {
      var oldFeed = this.find_feed(feedXML.getAttribute("url"));
      if (oldFeed === undefined)
      {
        const info = feed_handlers.factory.create(feedXML,
                                                  this,
                                                  menuItem,
                                                  this._mediator,
                                                  this._config);
        this._feed_list.push(info);
      }
      else
      {
        oldFeed.feedXML = feedXML;
        oldFeed.menuItem = menuItem;
      }
    }
    catch (err)
    {
      debug(err);
    }
  },

  /** find  a feed handler given a url
   *
   * @param {string} url - url of feed
   *
   * @returns {inforss_Feed} - feed object (or undefined if can't be found)
   *
   */
  find_feed(url)
  {
    return this._feed_list.find(feed => feed.getUrl() == url);
  },

  //-------------------------------------------------------------------------------------------------------------
  locateFeed(url)
  {
    try
    {
      var find = false;
      var info = null;
      var i = 0;
      while ((i < this._feed_list.length) && (find == false))
      {
        if (this._feed_list[i].getUrl() == url)
        {
          find = true;
          info = this._feed_list[i];
        }
        else
        {
          i++;
        }
      }
    }
    catch (e)
    {
      debug(e);
    }
    return {
      info: info,
      index: i
    };
  },

  //-------------------------------------------------------------------------------------------------------------
  //FIXME The only two (but see query about why we have identical code) places
  //we call this we have a feed and we get the url from it just so we can call
  //locateFeed again here (apart from the one called from the mediator).
  setSelected(url)
  {
    try
    {
      if (this._config.headline_bar_enabled)
      {
        this.passivateOldSelected();
        var info = this.locateFeed(url).info;
        this._selected_feed = info;
        //FIXME This code is same as init.
        info.select();
        info.activate();
        this.schedule_fetch(0);
        if (this._config.headline_bar_cycle_feeds)
        {
          this.schedule_cycle();
        }
        if (info.getType() == "group")
        {
          this._mediator.show_selected_feed(info);
        }
      }
    }
    catch (e)
    {
      debug(e);
    }
  },

  //-------------------------------------------------------------------------------------------------------------
  open_link: function(url)
  {
    try
    {
      this._mediator.open_link(url);
    }
    catch (e)
    {
      debug(e);
    }
  },

  //-------------------------------------------------------------------------------------------------------------
  deleteAllRss()
  {
    try
    {
      var urls = [];
      for (var i = 0; i < this._feed_list.length; i++)
      {
        urls.push(this._feed_list[i].getUrl());
      }
      for (var i = 0; i < urls.length; i++)
      {
        this.deleteRss(urls[i]);
      }
    }
    catch (e)
    {
      debug(e);
    }
  },

  //-------------------------------------------------------------------------------------------------------------
  deleteRss(url)
  {
    try
    {
      //If we are removing the current feed, select another one
      const deleted_selected = this._selected_feed != null &&
                               this._selected_feed.getUrl() == url;

      const deletedInfo = this.locateFeed(url);
      this._feed_list.splice(deletedInfo.index, 1);
      for (let feed of this._feed_list)
      {
        feed.removeRss(url);
      }
      deletedInfo.info.remove();
      if (deleted_selected)
      {
        this._selected_feed = null;
        this._mediator.clear_selected_feed();
        if (this._feed_list.length > 0)
        {
          this.setSelected(this._feed_list[0].getUrl());
        }
        else
        {
          this._mediator.resetDisplay(); //headline_display
        }
      }
    }
    catch (e)
    {
      debug(e);
    }
  },

  //-------------------------------------------------------------------------------------------------------------
  publishFeed(feed)
  {
    this._mediator.publishFeed(feed);
  },

  //-------------------------------------------------------------------------------------------------------------
  unpublishFeed(feed)
  {
    this._mediator.unpublishFeed(feed);
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

  //-------------------------------------------------------------------------------------------------------------
  getNextGroupOrFeed(direction)
  {
    try
    {
      const feed = this._selected_feed;
      if (this._selected_feed.isPlayList() &&
          !this._config.headline_bar_cycle_feeds)
      {
        //If this is a playlist, just select the next element in the playlist
        feed.playlist_cycle(direction);
        return;
      }
      else if (this._config.headline_bar_cycle_feeds &&
               this._config.headline_bar_cycle_in_group &&
               feed.getType() == "group")
      {
        //If we're cycling in a group, let the group deal with things.
        feed.feed_cycle(direction);
        return;
      }

      const i = feed.find_next_feed(
          this._feed_list,
          this.locateFeed(feed.getUrl()).index,
          direction);

      //FIXME Optimisation needed if we cycle right back to the same one?
      this.setSelected(this._feed_list[i].getUrl());
    }
    catch (e)
    {
      debug(e);
    }
  },

  //-------------------------------------------------------------------------------------------------------------
  createNewRDFEntry(url, title, receivedDate, feedUrl)
  {
    try
    {
      this._headline_cache.createNewRDFEntry(url, title, receivedDate, feedUrl);
    }
    catch (e)
    {
      debug(e);
    }
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
    try
    {
      var selectedInfo = this._selected_feed;
      if (selectedInfo != null)
      {
        selectedInfo.manualRefresh();
      }
    }
    catch (e)
    {
      debug(e);
    }
  },

};
