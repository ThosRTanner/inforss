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
/* globals inforssDebug, inforssTraceIn, inforssTraceOut */
Components.utils.import("chrome://inforss/content/modules/inforssDebug.jsm");

/* globals PriorityQueue */
Components.utils.import("chrome://inforss/content/modules/PriorityQueue.jsm");

/* globals inforssInformation, inforssXMLRepository, inforssSave */

/* exported inforssGroupedFeed */

//Min slack between two feeds with same refresh time
const INFORSS_GROUP_SLACK = 30 * 1000;

function inforssGroupedFeed(feedXML, manager, menuItem)
{
  inforssInformation.call(this, feedXML, manager, menuItem);
  this.feed_list = [];
  this.old_feed_list = [];
  this.priority_queue = new PriorityQueue();
  this.indexForPlayList = 0;
}

inforssGroupedFeed.prototype = Object.create(inforssInformation.prototype);
inforssGroupedFeed.prototype.constructor = inforssGroupedFeed;

Object.assign(inforssGroupedFeed.prototype, {

  //----------------------------------------------------------------------------
  reset()
  {
    this.old_feed_list = this.feed_list;
    this.feed_list = [];
    inforssInformation.prototype.reset.call(this);
  },

  //----------------------------------------------------------------------------
  activate_after(timeout)
  {
    return window.setTimeout(this.activate.bind(this), timeout);
  },

  //----------------------------------------------------------------------------
  //AFAICS there is no difference between a playlist and a normal group
  activate()
  {
    inforssTraceIn(this);
    try
    {
/**/console.log("group activate", this)
      if (this.active)
      {
        return;
      }
      this.populate_play_list();
      for (let old_feed of this.old_feed_list)
      {
        let found = false;
        for (let new_feed of this.feed_list)
        {
          if (old_feed.getUrl() == new_feed.getUrl)
          {
            found = true;
            break;
          }
        }
        if (! found)
        {
          old_feed.deactivate();
        }
      }
      this.old_feed_list = [];
      //It is not clear what the **!"£ this is doing.
      if (this.isPlayList())
      {
        this.indexForPlayList = 0;
      }
      if (this.getFeedActivity())
      {
        if (((inforssXMLRepository.headline_bar_cycle_feeds &&
              inforssXMLRepository.headline_bar_cycle_in_group) ||
             this.isPlayList()) &&
            this.feed_list.length > 0)
        {
          this.feed_list[0].activate_after(0);
        }
        else
        {
          this.priority_queue.clear();
          let now = new Date().getTime() + 10; //Why 10??

          for (let feed of this.feed_list)
          {
            feed.next_refresh = new Date(now);
            this.priority_queue.push(feed, feed.next_refresh);
            feed.activate();
            //why 30s intervals? and why 10ms?
            now += INFORSS_GROUP_SLACK;
          }
        }
      }
      this.active = true;
      /**/console.log("activated group", this);
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    finally
    {
      inforssTraceOut(this);
    }
  },

  //----------------------------------------------------------------------------
  //called from feed manager to determine when to fetch the next feed.
  get_next_refresh()
  {
    return this.priority_queue.length == 0 ? null : this.priority_queue.top[1];
  },

  //----------------------------------------------------------------------------
  //Called from manager to fetch the feed information
  fetchFeed()
  {
    //FIXME At least the browser offline test should be part of the manager
    if (!this.getFeedActivity())
    {
      return;
    }

    //Pop the current feed and reschedule with new time. Then get the next
    //feed and work out that.
    const item = this.priority_queue.pop();
    const now = new Date().getTime();
    const feed = item[0];
    const delay = parseInt(feed.feedXML.getAttribute("refresh"), 10);
    let next_refresh = new Date(now + delay * 60 * 1000); /* minutes to ms */
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
    inforssTraceIn(this);
    try
    {
      this.active = false;
      this.priority_queue.clear();
      for (let feed of this.feed_list)
      {
        feed.deactivate();
      }
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  },

  //----------------------------------------------------------------------------
  getCyclingDelay()
  {
    inforssTraceIn(this);
    var returnValue = 0;
    try
    {
      let playLists = this.feedXML.getElementsByTagName("playLists");
      if (playLists.length > 0 &&
          playLists[0].childNodes.length > this.indexForPlayList)
      {
        returnValue = parseInt(playLists[0].childNodes[this.indexForPlayList].getAttribute("delay"), 10);
      }
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
    return returnValue;
  },


  //----------------------------------------------------------------------------
  manualRefresh()
  {
    inforssTraceIn(this);
    try
    {
      if (inforssXMLRepository.headline_bar_cycle_feeds &&
          inforssXMLRepository.headline_bar_cycle_in_group &&
          this.feed_list.length > 0)
      {
        this.feed_list[0].refresh_after(0);
      }
      else
      {
        //FIXME Massively broken. See the normal initialisation
        let i = 0;
        for (let feed of this.feed_list)
        {
          feed.refresh_after(10 + 30000 * i);
          i++;
        }
      }
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  },

  //----------------------------------------------------------------------------
  populate_play_list()
  {
    inforssTraceIn(this);
    try
    {
      this.feed_list = [];
      if (this.isPlayList())
      {
        let playLists = this.feedXML.getElementsByTagName("playLists");
        if (playLists.length > 0)
        {
          for (let playList of playLists[0].childNodes)
          {
            let info = this.manager.locateFeed(playList.getAttribute("url")).info;
            if (info != null)
            {
              this.feed_list.push(info);
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
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  },

  //----------------------------------------------------------------------------
  removeRss(url)
  {
    inforssTraceIn(this);
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
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  },

  //----------------------------------------------------------------------------
  containsFeed(url)
  {
    inforssTraceIn(this);
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
      inforssDebug(e, this);
    }
    finally
    {
      inforssTraceOut(this);
    }
    return false;
  },

  //----------------------------------------------------------------------------
  addNewFeed(url)
  {
    inforssTraceIn(this);
    try
    {
      var group = document.createElement("GROUP");
      group.setAttribute("url", url);
      this.feedXML.appendChild(group);
      inforssSave();
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
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  },

  //----------------------------------------------------------------------------
  getNbNew()
  {
    inforssTraceIn(this);
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
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
    return returnValue;
  },

  //----------------------------------------------------------------------------
  getNbUnread()
  {
    inforssTraceIn(this);
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
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
    return returnValue;
  },

  //----------------------------------------------------------------------------
  getNbHeadlines()
  {
    inforssTraceIn(this);
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
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
    return returnValue;
  }

});
