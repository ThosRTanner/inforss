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
// inforssGroupFeed
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------
var inforss = inforss || {};
Components.utils.import("chrome://inforss/content/modules/inforss_Debug.jsm",
                        inforss);

Components.utils.import(
  "chrome://inforss/content/modules/inforss_Priority_Queue.jsm",
  inforss);

inforss.feed_handlers = inforss.feed_handlers || {};

Components.utils.import(
  "chrome://inforss/content/feed_handlers/inforss_factory.jsm",
  inforss.feed_handlers);

Components.utils.import(
  "chrome://inforss/content/feed_handlers/inforss_Information.jsm",
  inforss.feed_handlers);

//* globals INFORSS_FETCH_TIMEOUT */
//Min slack between two feeds with same refresh time
const INFORSS_GROUP_SLACK = 15000; //INFORSS_FETCH_TIMEOUT * 1.5;

/** This object allows us to pass our own feed list to find_next_feed */
function inforssPlaylistItem(delay, feed)
{
  this.delay = delay;
  this.feed = feed;
}

Object.assign(inforssPlaylistItem.prototype, {

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

inforss.feed_handlers.factory.register("group", inforssGroupedFeed);

function inforssGroupedFeed(feedXML, manager, menuItem, config)
{
  inforss.feed_handlers.Information.call(this, feedXML, manager, menuItem, config);
  this.feed_list = [];
  this.old_feed_list = [];
  this.feed_index = -1;
  this.priority_queue = new inforss.Priority_Queue();
  this.playlist = [];
  this.playlist_index = -1;
  this.playlist_timer = null;
}

inforssGroupedFeed.prototype = Object.create(inforss.feed_handlers.Information.prototype);
inforssGroupedFeed.prototype.constructor = inforssGroupedFeed;

Object.assign(inforssGroupedFeed.prototype, {

  //----------------------------------------------------------------------------
  reset()
  {
    this.old_feed_list = this.feed_list;
    this.feed_list = [];
    window.clearTimeout(this.playlist_timer);
    inforss.feed_handlers.Information.prototype.reset.call(this);
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
    inforss.traceIn(this);
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
          now += INFORSS_GROUP_SLACK;
        }
        feed.activate(!this.isPlayList() && !this.cycling_feeds_in_group());
      }

      if (this.cycling_feeds_in_group())
      {
        this.playlist_timer = window.setTimeout(this.playlist_cycle.bind(this), 0, 1);
      }
      else if (this.isPlayList())
      {
        this.playlist_timer = window.setTimeout(this.playlist_cycle.bind(this), 0, 1);
      }
      this.active = true;
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    finally
    {
      inforss.traceOut(this);
    }
  },

  //----------------------------------------------------------------------------
  /** called from feed manager to determine when to fetch the next feed. */
  get_next_refresh()
  {
    return this.priority_queue.length == 0 ? null : this.priority_queue.top[1];
  },

  //----------------------------------------------------------------------------
  /** Called from manager to fetch the feed information
   * This pops the current feed off the priority queue and pushes it back on
   * with an appropriate new time.
   */
  fetchFeed()
  {
    //FIXME At least the browser offline test should be part of the manager
    if (!this.getFeedActivity())
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
        next_refresh = new Date(f.next_refresh.getTime() + INFORSS_GROUP_SLACK);
      }
    }
    feed.next_refresh = next_refresh;
    this.priority_queue.push(feed, feed.next_refresh);
    feed.fetchFeed();
  },

  //----------------------------------------------------------------------------
  deactivate()
  {
    inforss.traceIn(this);
    try
    {
      this.active = false;
      window.clearTimeout(this.playlist_timer);
      for (let feed of this.feed_list)
      {
        feed.deactivate();
      }
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    inforss.traceOut(this);
  },

  //----------------------------------------------------------------------------
  manualRefresh()
  {
    inforss.traceIn(this);
    try
    {
      for (let feed of this.feed_list)
      {
        feed.manualRefresh();
      }
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    inforss.traceOut(this);
  },

  //----------------------------------------------------------------------------
  populate_play_list()
  {
    inforss.traceIn(this);
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
              if (!this.feed_list.includes(info))
              {
                this.feed_list.push(info);
              }
              const delay = parseInt(playList.getAttribute("delay"), 10) * 60 * 1000;
              this.playlist.push(new inforssPlaylistItem(delay, info));
            }
          }
        }
      }
      else
      {
        var list = this.feedXML.getElementsByTagName("GROUP");
        for (let feed of list)
        {
          let info = this.manager.locateFeed(feed.getAttribute("url")).info;
          if (info != null)
          {
            this.feed_list.push(info);
          }
        }
      }
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    inforss.traceOut(this);
  },

  //----------------------------------------------------------------------------
  removeRss(url)
  {
    inforss.traceIn(this);
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
    catch (e)
    {
      inforss.debug(e, this);
    }
    inforss.traceOut(this);
  },

  //----------------------------------------------------------------------------
  containsFeed(url)
  {
    inforss.traceIn(this);
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
    catch (e)
    {
      inforss.debug(e, this);
    }
    finally
    {
      inforss.traceOut(this);
    }
    return false;
  },

  //----------------------------------------------------------------------------
  addNewFeed(url)
  {
    inforss.traceIn(this);
    try
    {
      var group = document.createElement("GROUP");
      group.setAttribute("url", url);
      this.feedXML.appendChild(group);
      this.config.save();
      var info = this.manager.locateFeed(url).info;
      if (info != null)
      {
        this.feed_list.push(info);
        if (this.isSelected())
        {
          info.activate();
        }
      }
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    inforss.traceOut(this);
  },

  //----------------------------------------------------------------------------
  getNbNew()
  {
    inforss.traceIn(this);
    var returnValue = 0;
    try
    {
      for (let feed of this.feed_list)
      {
        returnValue += feed.getNbNew();
      }
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    inforss.traceOut(this);
    return returnValue;
  },

  //----------------------------------------------------------------------------
  getNbUnread()
  {
    inforss.traceIn(this);
    var returnValue = 0;
    try
    {
      for (let feed of this.feed_list)
      {
        returnValue += feed.getNbUnread();
      }
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    inforss.traceOut(this);
    return returnValue;
  },

  //----------------------------------------------------------------------------
  getNbHeadlines()
  {
    inforss.traceIn(this);
    var returnValue = 0;
    try
    {
      for (let feed of this.feed_list)
      {
        returnValue += feed.getNbHeadlines();
      }
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    inforss.traceOut(this);
    return returnValue;
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
    window.clearTimeout(this.playlist_timer);
    this.playlist_timer =
      window.setTimeout(this.playlist_cycle.bind(this), delay, direction);
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
