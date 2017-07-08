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

/* globals inforssInformation, inforssXMLRepository */

/* exported inforssGroupedFeed */


function inforssGroupedFeed(feedXML, manager, menuItem)
{
  var self = new inforssInformation(feedXML, manager, menuItem);
  self.feed_list = null;
  self.old_feed_list = null;
  self.timerList = [];
  self.indexForPlayList = 0;

  //----------------------------------------------------------------------------
  self.reset = function()
  {
    this.old_feed_list = this.feed_list;
    this.feed_list = null;
  };

  //----------------------------------------------------------------------------
  self.activate_after = function(timeout)
  {
    return window.setTimeout(this.activate.bind(this), timeout);
  };

  //----------------------------------------------------------------------------
  self.activate = function()
  {
    inforssTraceIn(this);
    try
    {
      this.active = true;
      if (this.feed_list == null)
      {
        this.populate_play_list();
        if (this.old_feed_list != null)
        {
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
          this.old_feed_list = null;
        }
      }
      if (this.feed_list != null)
      {
        if (this.isPlayList())
        {
          this.indexForPlayList = 0;
        }
        if (this.getFeedActivity())
        {
          if (((inforssXMLRepository.headline_bar_cycle_feeds() &&
                inforssXMLRepository.headline_bar_cycle_in_group()) ||
               this.isPlayList()) &&
              this.feed_list.length > 0)
          {
            this.feed_list[0].activate_after(0);
          }
          else
          {
            this.clearTimerList();
            let i = 0;
            for (let feed of this.feed_list)
            {
              this.timerList.push(feed.activate_after(10 + 30000 * i));
              i++;
            }
          }
        }
      }
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  };

  //----------------------------------------------------------------------------
  self.deactivate = function()
  {
    inforssTraceIn(this);
    try
    {
      this.active = false;
      if (this.feed_list != null)
      {
        this.clearTimerList();
        for (let feed of this.feed_list)
        {
          feed.deactivate();
        }
      }
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  };

  //----------------------------------------------------------------------------
  self.getCyclingDelay = function()
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
  };


  //----------------------------------------------------------------------------
  self.clearTimerList = function()
  {
    inforssTraceIn(this);
    try
    {
      for (let timer of this.timerList)
      {
        window.clearTimeout(timer);
      }
      this.timerList = [];
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  };

  //----------------------------------------------------------------------------
  self.manualRefresh = function()
  {
    inforssTraceIn(this);
    try
    {
      if (this.feed_list != null)
      {
        if (inforssXMLRepository.headline_bar_cycle_feeds() &&
            inforssXMLRepository.headline_bar_cycle_in_group() &&
            this.feed_list.length > 0)
        {
          this.feed_list[0].refresh_after(0);
        }
        else
        {
          let i = 0;
          for (let feed of this.feed_list)
          {
            feed.refresh_after(10 + 30000 * i);
            i++;
          }
        }
      }
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  };

  //----------------------------------------------------------------------------
  self.populate_play_list = function()
  {
    inforssTraceIn(this);
    try
    {
      if (this.feed_list == null)
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
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  };

  //----------------------------------------------------------------------------
  self.removeRss = function(url)
  {
    inforssTraceIn(this);
    try
    {
      if (this.feed_list != null)
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
  };

  //----------------------------------------------------------------------------
  self.containsFeed = function(url)
  {
    inforssTraceIn(this);
    try
    {
      if (this.feed_list != null)
      {
        for (let feed of this.feed_list)
        {
          if (feed.getUrl() == url)
          {
            return true;
          }
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
  };

  //----------------------------------------------------------------------------
  self.addNewFeed = function(url)
  {
    inforssTraceIn(this);
    try
    {
      var group = document.createElement("GROUP");
      group.setAttribute("url", url);
      feedXML.appendChild(group);
      inforssSave();
      var info = this.manager.locateFeed(url).info;
      if (info != null)
      {
        if (this.feed_list == null)
        {
          this.feed_list = [];
        }
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
  };

  //----------------------------------------------------------------------------
  self.getNbNew = function()
  {
    inforssTraceIn(this);
    var returnValue = 0;
    try
    {
      if (this.feed_list != null)
      {
        for (let feed of this.feed_list)
        {
          returnValue += feed.getNbNew();
        }
      }
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
    return returnValue;
  };

  //----------------------------------------------------------------------------
  self.getNbUnread = function()
  {
    inforssTraceIn(this);
    var returnValue = 0;
    try
    {
      if (this.feed_list != null)
      {
        for (let feed of this.feed_list)
        {
          returnValue += feed.getNbUnread();
        }
      }
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
    return returnValue;
  };

  //----------------------------------------------------------------------------
  self.getNbHeadlines = function()
  {
    inforssTraceIn(this);
    var returnValue = 0;
    try
    {
      if (this.feed_list != null)
      {
        for (let feed of this.feed_list)
        {
          returnValue += feed.getNbHeadlines();
        }
      }
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
    return returnValue;
  };

  return self;
}
