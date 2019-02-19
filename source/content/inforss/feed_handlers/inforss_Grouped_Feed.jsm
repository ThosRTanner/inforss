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
// inforss_Grouped_Feed
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------

/* jshint globalstrict: true */
/* eslint-disable strict */
"use strict";

/* eslint-disable array-bracket-newline */
/* exported EXPORTED_SYMBOLS */
const EXPORTED_SYMBOLS = [
  "Grouped_Feed", /* exported Grouped_Feed */
];
/* eslint-enable array-bracket-newline */

const { debug } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Debug.jsm",
  {}
);

const { Priority_Queue } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Priority_Queue.jsm",
  {}
);

const { clearTimeout, setTimeout } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Timeout.jsm",
  {}
);

const { Feed } = Components.utils.import(
  "chrome://inforss/content/feed_handlers/inforss_Feed.jsm",
  {}
);

//const { console } =
//  Components.utils.import("resource://gre/modules/Console.jsm", {});

//Min slack between two feeds with same refresh time
//Should be large enough for any timeouts you expect
//FIXME Should be configurable per group.
const GROUP_SLACK = 15 * 1000;

/** This object allows us to pass our own feed list to find_next_feed */
function Playlist_Item(delay, feed)
{
  this.delay = delay;
  this.feed = feed;
}

Object.assign(Playlist_Item.prototype, {

  /** Wrap the embedded feed function */
  getType()
  {
    return this.feed.getType();
  },

  /** Wrap the embedded feed function */
  getFeedActivity()
  {
    return this.feed.getFeedActivity();
  }
});


/** A feed which consists of a group of other feeds
 *
 * @class
 * @extends Feed
 *
 * @param {Object} feedXML - dom parsed xml config
 * @param {Manager} manager - current feed manager
 * @param {Object} menuItem - item in main menu for this feed. Really?
 * @param {Mediator} mediator - for communicating with headline bar
 * @param {Config} config - extension configuration
 */
function Grouped_Feed(feedXML, manager, menuItem, mediator, config)
{
  Feed.call(this, feedXML, manager, menuItem, mediator, config);
  this.feed_list = [];
  this.old_feed_list = [];
  this.feed_index = -1;
  this.priority_queue = new Priority_Queue();
  this.playlist = [];
  this.playlist_index = -1;
  this.playlist_timer = null;
}

Grouped_Feed.prototype = Object.create(Feed.prototype);
Grouped_Feed.prototype.constructor = Grouped_Feed;

Object.assign(Grouped_Feed.prototype, {

  //----------------------------------------------------------------------------
  reset()
  {
    this.old_feed_list = this.feed_list;
    this.feed_list = [];
    clearTimeout(this.playlist_timer);
    //FIXME use 'super'
    Feed.prototype.reset.call(this);
  },

  //----------------------------------------------------------------------------
  /** Hacky function to return if we are cycling.
   * Really this should be in inforssXMLRepository but that needs rework
   */
  cycling_feeds_in_group()
  {
    return this.config.headline_bar_cycle_feeds &&
           this.config.headline_bar_cycle_in_group;
  },

  //----------------------------------------------------------------------------
  activate()
  {
    try
    {
      if (this.active)
      {
        return;
      }
      this.populate_play_list();
      for (let old_feed of this.old_feed_list)
      {
        if (this.feed_list.findIndex(feed => old_feed.getUrl() == feed.getUrl()) == -1)
        {
          old_feed.deactivate();
          this.priority_queue.remove(old_feed);
        }
      }
      this.old_feed_list = [];

      let now = new Date().getTime() + 10; //Why 10??

      for (let feed of this.feed_list)
      {
        if (! this.priority_queue.contains(feed))
        {
          feed.next_refresh = new Date(now);
          this.priority_queue.push(feed, feed.next_refresh);
          now += GROUP_SLACK;
        }
        feed.activate(! this.isPlayList() && ! this.cycling_feeds_in_group());
      }

      if (this.cycling_feeds_in_group())
      {
        this.playlist_timer = setTimeout(this.playlist_cycle.bind(this), 0, 1);
      }
      else if (this.isPlayList())
      {
        this.playlist_timer = setTimeout(this.playlist_cycle.bind(this), 0, 1);
      }
      this.active = true;
    }
    catch (err)
    {
      debug(err, this);
    }
  },

  /** Get time at which to fetch the next feed
   *
   * @returns {Date} next time to run (null if nothing to do)
   */
  get_next_refresh()
  {
    return this.priority_queue.length == 0 ? null : this.priority_queue.top[1];
  },

  /** Process the next feed
   *
   * This pops the current feed off the priority queue and pushes it back on
   * with an appropriate new time.
   */
  fetchFeed()
  {
    //FIXME At least the browser offline test should be part of the manager
    if (! this.getFeedActivity())
    {
      return;
    }

    if (this.priority_queue.length == 0)
    {
      return;
    }

    //Pop the current feed and reschedule with new time. Then get the next
    //feed and work out that.
    const item = this.priority_queue.pop();
    const now = new Date().getTime();
    const feed = item[0];
    const delay = parseInt(feed.feedXML.getAttribute("refresh"), 10);
    let next_refresh = new Date(now + delay * 60 * 1000); // minutes to ms
    //Ensure that all things with the same refresh time get processed sequentially.
    //This is because if you have enough things in your group, there may be more
    //than can fit in the requested time given the slack. Note that this isn't
    //100% as if there are feeds with different cycles they will eventually get
    //the same refresh time.
    for (let f of this.feed_list)
    {
      if (feed.feedXML.getAttribute("refresh") != f.feedXML.getAttribute("refresh"))
      {
        continue;
      }
      if (next_refresh <= f.next_refresh)
      {
        next_refresh = new Date(f.next_refresh.getTime() + GROUP_SLACK);
      }
    }
    feed.next_refresh = next_refresh;
    this.priority_queue.push(feed, feed.next_refresh);

    feed.fetchFeed();
  },

  //----------------------------------------------------------------------------
  deactivate()
  {
    try
    {
      this.active = false;
      clearTimeout(this.playlist_timer);
      for (let feed of this.feed_list)
      {
        feed.deactivate();
      }
    }
    catch (err)
    {
      debug(err, this);
    }
  },

  //----------------------------------------------------------------------------
  manualRefresh()
  {
    try
    {
      for (let feed of this.feed_list)
      {
        feed.manualRefresh();
      }
    }
    catch (err)
    {
      debug(err, this);
    }
  },

  //----------------------------------------------------------------------------
  populate_play_list()
  {
    try
    {
      this.feed_list = [];
      this.feed_index = -1;
      if (this.isPlayList())
      {
        this.playlist = [];
        this.playlist_index = -1;
        //FIXME This just looks nasty.
        let playLists = this.feedXML.getElementsByTagName("playLists");
        if (playLists.length > 0)
        {
          for (let playList of playLists[0].childNodes)
          {
            let info = this.manager.locateFeed(playList.getAttribute("url")).info;
            if (info != null)
            {
              if (! this.feed_list.includes(info))
              {
                this.feed_list.push(info);
              }
              const delay = parseInt(playList.getAttribute("delay"), 10) * 60 * 1000;
              this.playlist.push(new Playlist_Item(delay, info));
            }
          }
        }
      }
      else
      {
        const list = this.feedXML.getElementsByTagName("GROUP");
        for (let feed of list)
        {
          const info = this.manager.locateFeed(feed.getAttribute("url")).info;
          if (info != null)
          {
            this.feed_list.push(info);
          }
        }
      }
    }
    catch (err)
    {
      debug(err, this);
    }
  },

  //----------------------------------------------------------------------------
  removeRss(url)
  {
    try
    {
      let idx = 0;
      for (let feed of this.feed_list)
      {
        if (feed.getUrl() == url)
        {
          this.feed_list.splice(idx, 1);
          break;
        }
        idx++;
      }
      for (let item of this.feedXML.getElementsByTagName("GROUP"))
      {
        if (item.getAttribute("url") == url)
        {
          this.feedXML.removeChild(item);
          break;
        }
      }
    }
    catch (err)
    {
      debug(err, this);
    }
  },

  //----------------------------------------------------------------------------
  containsFeed(url)
  {
    try
    {
      for (let feed of this.feed_list)
      {
        if (feed.getUrl() == url)
        {
          return true;
        }
      }
    }
    catch (err)
    {
      debug(err, this);
    }
    return false;
  },

  //----------------------------------------------------------------------------
  addNewFeed(url)
  {
    try
    {
      //FIXME This (up to the save) needs to be done via XMLRepository
      const group = this.feedXML.ownerDocument.createElement("GROUP");
      group.setAttribute("url", url);
      this.feedXML.appendChild(group);
      this.config.save();
      const info = this.manager.locateFeed(url).info;
      if (info != null)
      {
        this.feed_list.push(info);
        if (this.isSelected())
        {
          info.activate();
        }
      }
    }
    catch (err)
    {
      debug(err, this);
    }
  },

  /** Get the number of new (as per configured) headlines
   *
   * @returns {Integer} Total number of new headlines in all feeds in group
   */
  getNbNew()
  {
    return this.feed_list.reduce(
      (accumulator, feed) => accumulator + feed.getNbNew(),
      0
    );
  },

  /** Get the number of unread headlines
   *
   * @returns {Integer} Total number of unread headlines in all feeds in group
   */
  getNbUnread()
  {
    return this.feed_list.reduce(
      (accumulator, feed) => accumulator + feed.getNbUnread(),
      0
    );
  },

  /** Get the number of headlines
   *
   * @returns {Integer} Total number of headlines in all feeds in group
   */
  getNbHeadlines()
  {
    return this.feed_list.reduce(
      (accumulator, feed) => accumulator + feed.getNbHeadlines(),
      0
    );
  },

  //----------------------------------------------------------------------------
  /** Select the next feed in the group (when cycling in groups) */
  feed_cycle(direction)
  {
    this.feed_index = this.cycle_from_list(direction,
                                           this.feed_list,
                                           this.feed_index,
                                           false);
  },

  //----------------------------------------------------------------------------
  /** Cycle through a playlist and kick off the next fetch */
  playlist_cycle(direction)
  {
    this.playlist_index = this.cycle_from_list(direction,
                                               this.playlist,
                                               this.playlist_index,
                                               true);
    const delay = this.playlist_index == -1 ?
      60 * 1000 : //1 minute delay if nothing is activated.
      this.playlist[this.playlist_index].delay;
    clearTimeout(this.playlist_timer);
    this.playlist_timer =
      setTimeout(this.playlist_cycle.bind(this), delay, direction);
  },

  //----------------------------------------------------------------------------
  /** Find the next feed to publish */
  cycle_from_list(direction, list, index, playlist)
  {
    //Unpublish the current feed and then select the new one
    if (index != -1)
    {
      this.manager.unpublishFeed(playlist ? list[index].feed : list[index]);
    }

    //Now find the next activated feed. If there is none we'll faff around till
    //there is one.
    const length = list.length;
    if (length == 0)
    {
      return -1;
    }

    const pos = this._find_next_feed(null, list, index, direction);

    if (pos != -1)
    {
      const current = list[pos];
      if (current.getFeedActivity())
      {
        this.manager.publishFeed(playlist ? current.feed : current);
      }
    }
    return pos;
  }

});

const feed_handlers = {};

Components.utils.import(
  "chrome://inforss/content/feed_handlers/inforss_factory.jsm",
  feed_handlers);

feed_handlers.factory.register("group", Grouped_Feed);
