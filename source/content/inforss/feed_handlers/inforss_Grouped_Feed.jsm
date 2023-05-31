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

const { log_exception } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Debug.jsm", {}
);

const { Priority_Queue } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Priority_Queue.jsm", {}
);

const { Sleeper } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Sleeper.jsm", {}
);

const { complete_assign } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Utils.jsm", {}
);

const { Feed } = Components.utils.import(
  "chrome://inforss/content/feed_handlers/inforss_Feed.jsm", {}
);

const { console } = Components.utils.import(
  "resource://gre/modules/Console.jsm", {}
);

//Min slack between two feeds with same refresh time
//Should be large enough for any timeouts you expect
//FIXME Should be configurable per group.
const GROUP_SLACK = 15 * 1000;

/** This object allows us to pass our own feed list to find_next_feed.
 *
 * @param {number} delay - Delay value for feed.
 * @param {Feed} feed - Feed object.
 */
function Playlist_Item(delay, feed)
{
  this.delay = delay;
  this.feed = feed;

  Object.seal(this);
}

Object.assign(Playlist_Item.prototype, {

  /** Wrap the embedded feed function.
   *
   * @returns {string} Feed type.
   */
  getType()
  {
    return this.feed.getType();
  },

  /** Wrap the embedded feed function.
   *
   * @returns {boolean} True if feed is 'active'.
   */
  getFeedActivity()
  {
    return this.feed.getFeedActivity();
  }
});


/** A feed which consists of a group of other feeds.
 *
 * @class
 * @extends Feed
 *
 * @param {Document} feedXML - Dom parsed xml config.
 * @param {object} options - Passed to super class constructor.
 */
function Grouped_Feed(feedXML, options)
{
  Feed.call(this, feedXML, options);
  this._feed_list = [];
  this._feed_index = -1;
  this._priority_queue = new Priority_Queue();
  this._playlist = [];
  this._playlist_index = -1;
  this._playlist_timer = new Sleeper();

  Object.seal(this);
}

const Super = Feed.prototype;
Grouped_Feed.prototype = Object.create(Super);
Grouped_Feed.prototype.constructor = Grouped_Feed;

complete_assign(Grouped_Feed.prototype, {

  /** Clean shutdown. */
  dispose()
  {
    this._playlist_timer.abort();
    Super.dispose.call(this);
  },

  /** See if headline matches filters.
   *
   * @param {Headline} headline - Headline to match.
   * @param {number} index - The headline number.
   *
   * @returns {boolean} True if headline matches filters.
   */
  matches_filter(headline, index)
  {
    const policy = this.getFilterPolicy();
    switch (policy)
    {
      default:
        console.log("Unexpected filter policy", policy, this);

        /* falls through */
      case "0": //Use the headlines feed
        break;

      case "1": //Use group
        return Super.matches_filter.call(this, headline, index);

      case "2": //Use both
        if (! Super.matches_filter.call(this, headline, index))
        {
          return false;
        }
        break;
    }
    return headline.feed.matches_filter(headline, index);
  },

  /** Hacky function to return if we are cycling.
   * Really this should be in inforssConfig but that needs rework.
   *
   * @returns {boolean} True if we are cycling in the group.
   */
  cycling_feeds_in_group()
  {
    return this.config.headline_bar_cycle_feeds &&
           this.config.headline_bar_cycle_in_group;
  },

  /** Activate the feed.
   *
   * This will build the feed list containing all the feeds an the group, and
   * a play list if the group is a playlist.
   *
   * It'll also add any new feeds to a priority queue so that they pop off
   * in a scheduled order.
   */
  activate()
  {
    this._populate_play_list();

    let now = new Date().getTime() + 10; //Why 10??

    for (const feed of this._feed_list)
    {
      if (! this._priority_queue.contains(feed))
      {
        feed.next_refresh = new Date(now);
        this._priority_queue.push(feed, feed.next_refresh);
        now += GROUP_SLACK;
      }
      feed.activate(! this.isPlayList() && ! this.cycling_feeds_in_group());
    }

    if (this.cycling_feeds_in_group() || this.isPlayList())
    {
      this.playlist_cycle(1);
    }
    this.active = true;
  },

  /** Get time at which to fetch the next feed.
   *
   * @returns {Date} Next time to run (null if nothing to do).
   */
  get_next_refresh()
  {
    return this._priority_queue.length == 0 ?
      null :
      this._priority_queue.top[1];
  },

  /** Process the next feed.
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

    if (this._priority_queue.length == 0)
    {
      return;
    }

    //Pop the current feed and reschedule with new time. Then get the next
    //feed and work out that.
    const item = this._priority_queue.pop();
    const now = new Date().getTime();
    const feed = item[0];
    const delay = feed.refresh_time;
    let next_refresh = new Date(now + delay * 60 * 1000); // minutes to ms
    //Ensure that all things with the same refresh time get processed
    //sequentially.
    //This is because if you have enough things in your group, there may be more
    //than can fit in the requested time given the slack. Note that this isn't
    //100% as if there are feeds with different cycles they will eventually get
    //the same refresh time.
    for (const f2 of this._feed_list)
    {
      if (delay == f2.refresh_time && next_refresh <= f2.next_refresh)
      {
        next_refresh = new Date(f2.next_refresh.getTime() + GROUP_SLACK);
      }
    }
    feed.next_refresh = next_refresh;
    this._priority_queue.push(feed, feed.next_refresh);

    feed.fetchFeed();
  },

  //----------------------------------------------------------------------------
  deactivate()
  {
    Super.deactivate.call(this);
    this._playlist_timer.abort();
    for (const feed of this._feed_list)
    {
      feed.deactivate();
    }
  },

  //----------------------------------------------------------------------------
  manualRefresh()
  {
    for (const feed of this._feed_list)
    {
      feed.manualRefresh();
    }
  },

  /** Populates the list of feeds to cycle through, as both a list of feeds,
   * and, optionally, a timed playlist.
   */
  _populate_play_list()
  {
    this._feed_list = [];
    this._feed_index = -1;
    if (this.isPlayList())
    {
      this._playlist = [];
      this._playlist_index = -1;
      for (const item of this.feedXML.getElementsByTagName("playList"))
      {
        const feed = this._manager.find_feed(item.getAttribute("url"));
        if (feed !== undefined)
        {
          if (! this._feed_list.includes(feed))
          {
            this._feed_list.push(feed);
          }
          const delay =
            parseInt(item.getAttribute("delay"), 10) * 60 * 1000;
          this._playlist.push(new Playlist_Item(delay, feed));
        }
      }
    }
    else
    {
      const list = this.feedXML.getElementsByTagName("GROUP");
      for (const item of list)
      {
        const feed = this._manager.find_feed(item.getAttribute("url"));
        if (feed !== undefined)
        {
          this._feed_list.push(feed);
        }
      }
    }
  },

  /** Removes a feed from our list of feeds.
   *
   * @warning This relies very much on the order things happen, and that they
   * happen in sequence (no async callbacks!):
   *
   * Firstly, the feed is removed.
   * Then the current feed is deactivated.
   * Then the (possibly new) current feed is activated.
   * The feed list is built from scratch on reactivation.
   *
   * Because the priority queue is not rebuilt, in order to minimise annoying
   * reschedules just because a feed has been added or removed, we have to
   * update the priority queue here.
   *
   * @param {Feed} feed - Feed to remove.
   */
  remove_feed(feed)
  {
    //Remove the from the priority queue as we never rebuild that.
    this._priority_queue.remove(feed);
  },

  /** Find out if group contians feed with specified url.
   *
   * @param {string} url - URL to check.
   *
   * @returns {boolean} True if group contains specified feed.
   */
  contains_feed(url)
  {
    return this._feed_list.findIndex(feed => feed.getUrl() == url) != -1;
  },

  //----------------------------------------------------------------------------
  addNewFeed(url)
  {
    //FIXME This (up to the save) needs to be done via inforssConfig
    const group = this.feedXML.ownerDocument.createElement("GROUP");
    group.setAttribute("url", url);
    this.feedXML.append(group);
    this.config.save();
    const info = this._manager.find_feed(url);
    if (info !== undefined)
    {
      this._feed_list.push(info);
      if (this.isSelected())
      {
        info.activate();
      }
    }
  },

  /** Get the number of new (as per configured) headlines.
   *
   * @returns {number} Total number of new headlines in all feeds in group.
   */
  get num_new_headlines()
  {
    return this._feed_list.reduce(
      (accumulator, feed) => accumulator + feed.num_new_headlines,
      0
    );
  },

  /** Get the number of unread headlines.
   *
   * @returns {number} Total number of unread headlines in all feeds in group.
   */
  get num_unread_headlines()
  {
    return this._feed_list.reduce(
      (accumulator, feed) => accumulator + feed.num_unread_headlines,
      0
    );
  },

  /** Get the number of headlines.
   *
   * @returns {number} Total number of headlines in all feeds in group.
   */
  get num_headlines()
  {
    return this._feed_list.reduce(
      (accumulator, feed) => accumulator + feed.num_headlines,
      0
    );
  },

  /** Select the next feed in the group (when cycling in groups).
   *
   * @param {number} direction - 1 to cycle forwards, -1 to cycle backwards.
   */
  feed_cycle(direction)
  {
    this._feed_index = this.cycle_from_list(direction,
                                            this._feed_list,
                                            this._feed_index,
                                            false);
  },

  /** Cycle through a playlist and kick off the next fetch.
   *
   * Note that this can be hit in the middle of a loop, if next/previous feed
   * toolbar button is clicked, so we have to store the current playlist in
   * the class somewhere. Arguably it might be better to have this whole thing
   * as a separate class as the sleep(0) should only be used when starting.
   *
   * @param {number} direction - 1 to cycle forwards, -1 to cycle backwards.
   */
  async playlist_cycle(direction)
  {
    try
    {
      this._playlist_timer.abort();
      await this._playlist_timer.sleep(0);
      for (;;)
      {
        this._playlist_index = this.cycle_from_list(direction,
                                                    this._playlist,
                                                    this._playlist_index,
                                                    true);
        const delay = this._playlist_index == -1 ?
          60 * 1000 : //1 minute delay if nothing is activated.
          this._playlist[this._playlist_index].delay;
        //eslint-disable-next-line no-await-in-loop
        await this._playlist_timer.sleep(delay);
      }
    }
    catch (err)
    {
      log_exception(err);
    }
  },

  //----------------------------------------------------------------------------
  /** Find the next feed to publish, and publish it.
   *
   * The current feed will be unpublished.
   *
   * @param {number} direction - 1 to cycle forwards, -1 to cycle backwards.
   * @param {Array} list - List of feeds.
   * @param {number} index - Index of current feed, or -1 if none selected.
   * @param {boolean} playlist - True if group is a playlist.
   *
   * @returns {number} Index of the newly published feed.
   */
  cycle_from_list(direction, list, index, playlist)
  {
    //Unpublish the current feed and then select the new one
    if (index != -1)
    {
      this._mediator.unpublishFeed(playlist ? list[index].feed : list[index]);
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
        this._mediator.publishFeed(playlist ? current.feed : current);
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
