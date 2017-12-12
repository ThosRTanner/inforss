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
// inforssFeedManager
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------
/* globals inforssDebug, inforssTraceIn, inforssTraceOut */
Components.utils.import("chrome://inforss/content/modules/inforssDebug.jsm");

/* globals inforssRDFRepository, inforssXMLRepository */
//FIXME get rid of all the 2 phase initialisation

function inforssFeedManager(mediator)
{
  this.mediator = mediator;
  this.rdfRepository = new inforssRDFRepository();
  return this;
}

inforssFeedManager.prototype = {
  feed_list: new Array(),
  mediator: null,
  selectedInfo: null,
  rdfRepository: null,
  cycleGroup: null,
  emptyFeedMarker: null,
  direction: null,

  //-------------------------------------------------------------------------------------------------------------
  init: function()
  {
    inforssTraceIn(this);
/**/console.log("init", this)
    try
    {
      /* This feels uncomfy here */
      inforssRead();
      for (let item of inforssXMLRepository.get_all())
      {
        inforssAddItemToMenu(item);
      }
      inforssRelocateBar(); //And should this be somewhere else?
      /* down to here */
      //Among other things, I think the global mediator should pass the inforssXmlRepository
      //to all of these.
      this.rdfRepository.init();
      var oldSelected = this.selectedInfo;
      this.selectedInfo = null;
      for (let feed of this.feed_list)
      {
        feed.reset();
      }
      var selectedInfo = this.getSelectedInfo(true);
      if (selectedInfo != null)
      {
        if ((oldSelected != null) && (oldSelected.getUrl() != selectedInfo.getUrl()))
        {
          oldSelected.deactivate();
        }
        //See line 316
        //inforssHeadlineDisplay.apply_recent_headline_style(selectedInfo.menuItem, false);
        //        selectedInfo.reset();
        if (inforssXMLRepository.headline_bar_enabled())
        {
          selectedInfo.activate();
          if (selectedInfo.getType() == "group")
          {
            this.mediator.updateMenuIcon(selectedInfo);
          }
        }
        else
        {
          selectedInfo.deactivate();
        }
      }
      this.mediator.refreshBar();
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  },


  //-------------------------------------------------------------------------------------------------------------
  //WTF does all this stuff do?
  //it seems to be getting the currently stored headlines and then populating
  //the thing with said currently stored headlines.
  sync: function(url)
  {
    inforssTraceIn(this);
    try
    {
      var info = this.locateFeed(url).info;
      if (info != null && info.insync == false && info.headlines.length > 0 &&
          info.reload == false)
      {
        var data = info.getXmlHeadlines();
        var observerService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
        observerService.notifyObservers(null, "syncBack", data);
      }
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  },

  //-------------------------------------------------------------------------------------------------------------
  syncBack: function(data)
  {
    inforssTraceIn(this);
    try
    {
      var objDOMParser = new DOMParser();
      var objDoc = objDOMParser.parseFromString(data, "text/xml");

      var url = objDoc.firstChild.getAttribute("url");
      var info = this.locateFeed(url).info;

      if ((info != null) && (info.insync))
      {
        info.synchronize(objDoc);
      }
      delete objDoc;
      delete objDOMParser;
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  },

  //-------------------------------------------------------------------------------------------------------------
  //FIXME Do we really need findDefault? How many places need to either have
  //or not have a default? Also this blanky sets it...
  getSelectedInfo: function(findDefault)
  {
    inforssTraceIn(this);
    try
    {
      if (this.selectedInfo == null)
      {
        var info = null;
        var find = false;
        var i = 0;
        while ((i < this.feed_list.length) && (find == false))
        {
          if (this.feed_list[i].isSelected())
          {
            find = true;
            info = this.feed_list[i];
            info.select();
            //dump("getSelectedInfo=" + info.getUrl() + "\n");
          }
          else
          {
            i++;
          }
        }
        if ((find == false) && (this.feed_list.length > 0) && (findDefault))
        {
          //alert("getSelectedInfo find == false");
          info = this.feed_list[0];
          info.select();
        }
        this.selectedInfo = info;
      }
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
    return this.selectedInfo;
  },

  //-------------------------------------------------------------------------------------------------------------
  signalReadEnd: function(feed)
  {
    this.rdfRepository.flush();
    this.mediator.updateBar(feed);
  },

  //-------------------------------------------------------------------------------------------------------------
  passivateOldSelected: function()
  {
    try
    {
      var selectedInfo = this.getSelectedInfo(false);
      if (selectedInfo != null)
      {
        selectedInfo.unselect();
        //see 311
        //inforssHeadlineDisplay.apply_default_headline_style(selectedInfo.menuItem, false);
        selectedInfo.deactivate();
      }
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
  },

  //-------------------------------------------------------------------------------------------------------------
  addFeed: function(feedXML, menuItem)
  {
    inforssTraceIn(this);
    try
    {
      var oldFeed = this.locateFeed(feedXML.getAttribute("url")).info;
      if (oldFeed == null)
      {
        var info = inforssInformation.createInfoFactory(feedXML, this, menuItem);
        this.feed_list.push(info);
      }
      else
      {
        oldFeed.feedXML = feedXML;
        oldFeed.menuItem = menuItem;
      }
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  },

  //-------------------------------------------------------------------------------------------------------------
  locateFeed: function(url)
  {
    inforssTraceIn(this);
    try
    {
      var find = false;
      var info = null;
      var i = 0;
      while ((i < this.feed_list.length) && (find == false))
      {
        if (this.feed_list[i].getUrl() == url)
        {
          find = true;
          info = this.feed_list[i];
        }
        else
        {
          i++;
        }
      }
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
    return {
      info: info,
      index: i
    };
  },

  //-------------------------------------------------------------------------------------------------------------
  setSelected: function(url)
  {
    inforssTraceIn(this);
    try
    {
      if (inforssXMLRepository.headline_bar_enabled())
      {
        this.passivateOldSelected();
        var info = this.locateFeed(url).info;
        this.selectedInfo = info;
        //apparently this is trying to set the colour of the currently selected
        //feed to the default headline colour. Unfortunately (a) it doesn't
        //change back the original and (b) it's a bit useless if your headlines
        //are default text and default background.
        //inforssHeadlineDisplay.apply_recent_headline_style(info.menuItem, false);
        info.select();
        info.activate_after(0);
        if (info.getType() == "group")
        {
          this.mediator.updateMenuIcon(info);
        }
      }
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  },

  //-------------------------------------------------------------------------------------------------------------
  ack: function(url)
  {
    inforssTraceIn(this);
    try
    {
      var info = this.locateFeed(url).info;
      info.setAcknowledgeDate(new Date());
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  },

  //-------------------------------------------------------------------------------------------------------------
  setPopup: function(url, flag)
  {
    inforssTraceIn(this);
    try
    {
      var info = this.locateFeed(url).info;
      info.setPopup(flag);
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  },

  //-------------------------------------------------------------------------------------------------------------
  openTab: function(url)
  {
    inforssTraceIn(this);
    try
    {
      this.mediator.openTab(url);
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  },

  //-------------------------------------------------------------------------------------------------------------
  deleteAllRss: function()
  {
    inforssTraceIn(this);
    try
    {
      var urls = new Array();
      for (var i = 0; i < this.feed_list.length; i++)
      {
        urls.push(this.feed_list[i].getUrl());
      }
      for (var i = 0; i < urls.length; i++)
      {
        this.deleteRss(urls[i]);
      }
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  },

  //-------------------------------------------------------------------------------------------------------------
  deleteRss: function(url)
  {
    inforssTraceIn(this);
    try
    {
      var deletedInfo = this.locateFeed(url);
      this.feed_list.splice(deletedInfo.index, 1);
      if (this.feed_list != null)
      {
        for (var i = 0; i < this.feed_list.length; i++)
        {
          this.feed_list[i].removeRss(url);
        }
      }
      var selectedInfo = this.getSelectedInfo(true);
      var deleteSelected = (selectedInfo.getUrl() == url);
      deletedInfo.info.remove();
      if (selectedInfo != null)
      {
        if (deleteSelected)
        {
          this.selectedInfo = null;
          if (this.feed_list.length > 0)
          {
            this.mediator.setSelected(this.feed_list[0].getUrl());
          }
          else
          {
            this.mediator.resetHeadlines();
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

  //-------------------------------------------------------------------------------------------------------------
  /* unused ???
  getActiveFeed: function()
  {
    inforssTraceIn(this);
    try
    {
      var list = new Array();
      for (var i = 0; i < this.feed_list.length; i++)
      {
        if (this.feed_list[i].isActiveFeed())
        {
          list.push(this.feed_list[i]);
        }
      }
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
    return list;
  },
  */

  //-------------------------------------------------------------------------------------------------------------
  publishFeed: function(feed)
  {
    this.mediator.publishFeed(feed);
  },

  //-------------------------------------------------------------------------------------------------------------
  unpublishFeed: function(feed)
  {
    this.mediator.unpublishFeed(feed);
  },

  //-------------------------------------------------------------------------------------------------------------
  updateMenuIcon: function(feed)
  {
    this.mediator.updateMenuIcon(feed);
  },

  //-------------------------------------------------------------------------------------------------------------
  clearEmptyFeedMarker: function()
  {
    this.emptyFeedMarker = null;
  },

  //-------------------------------------------------------------------------------------------------------------
  getCycleGroup: function()
  {
    return this.cycleGroup;
  },

  //-------------------------------------------------------------------------------------------------------------
  goHome: function()
  {
    var selectedInfo = this.getSelectedInfo(false);
    if ((selectedInfo != null) && (selectedInfo.getType() != "group"))
    {
      this.mediator.openTab(selectedInfo.getLinkAddress());
    }
  },

  //-------------------------------------------------------------------------------------------------------------
  getNextGroupOrFeed1: function(info, direction)
  {
    //FIXME doesn't this just end up pointing at 'this'?
    this.mediator.feedManager.getNextGroupOrFeed(info, direction);
  },

  //-------------------------------------------------------------------------------------------------------------
  getNextGroupOrFeed: function(info, direction)
  {
    //dump("inforssFeedManager::getNextGroupOrFeed" + "   " + new Date() + "\n");
    //dump("Direction=" + direction + "\n");
    //dump("info.getType()=" + info.getType() + "\n");
/**/console.log("getNextGroupOrFeed", this, info, direction)
    try
    {
      if (this.mediator.isActiveTooltip())
      {
        //dump("inforssFeedManager::getNextGroupOrFeed : cycle delayed\n");
        window.setTimeout(this.getNextGroupOrFeed1.bind(this), 1000, info, direction);
        return;
      }

      //dump("inforssFeedManager::getNextGroupOrFeed : cycle nodelayed\n");
      //alert(this);
      var find = false;
      var findNext = false;
      var i = 0;
      var count = inforssXMLRepository.headline_bar_cycle_type == "next" ? 1 : Math.round(Math.random() * 10) + 1;

      var informationList = null;
      if (this.cycleGroup != null)
      {
        informationList = this.cycleGroup.feed_list;
        if (informationList == null)
        {
          informationList = this.feed_list;
        }
      }
      else
      {
        informationList = this.feed_list;
      }

      //dump("informationList.length=" + informationList.length + "\n");
      if (direction == 999)
      {
        if (this.emptyFeedMarker == null)
        {
          //dump("je set " + info.getUrl() + "\n");

          this.emptyFeedMarker = info.getUrl();
        }
        else
        {
          //dump("test de " + info.getUrl() + "\n");
          if (this.emptyFeedMarker == info.getUrl())
          {
            findNext = true;
            this.emptyFeedMarker = null;
            info.select();
            //dump("on a fait un tour\n");
          }
        }
        direction = (this.direction == null) ? 1 : this.direction;
        var selectedInfo = this.getSelectedInfo(false);
        if (selectedInfo != null && selectedInfo.getType() == "group" &&
          inforssXMLRepository.headline_bar_cycle_feeds &&
          !inforssXMLRepository.headline_bar_cycle_in_group &&
          !selectedInfo.isPlayList())
        {
          findNext = true;
        }
      }
      else
      {
        this.direction = direction;
      }

      while ((i < informationList.length) && (findNext == false))
      {
        if (find == false)
        {
          if ((informationList[i].getUrl() == info.getUrl()) && (informationList[i].getType() == info.getType()))
          {
            find = true;
            i += direction;
            if (i == informationList.length)
            {
              i = 0;
            }
            else
            {
              if (i == -1)
              {
                i = informationList.length - 1;
              }
            }
          }
          else
          {
            i++;
          }
        }
        else
        {
          if (((info.getType() == "group") && (informationList[i].getType() == "group") && (informationList[i].getFeedActivity())) ||
            ((info.getType() != "group") && (informationList[i].getType() != "group") && (informationList[i].getFeedActivity())))
          {
            count--;
            if (count == 0)
            {
              findNext = true;
              if ((this.emptyFeedMarker == null) || (this.emptyFeedMarker != informationList[i].getUrl()))
              {
                //dump("info.getType()=" + info.getType() + "\n");
                //dump("indexForPlayList =" + i + "\n");
                if (this.cycleGroup != null)
                {
                  this.cycleGroup.indexForPlayList = i;
                }
                this.setSelected(informationList[i].getUrl());
                //dump("j'essaye " + informationList[i].getUrl() + "\n");
              }
              else
              {
                //dump("on a fait le tour je m'arrete et j'attent le cycle suivant\n");
                this.emptyFeedMarker = null;
                info.select();
              }
            }
            else
            {
              i += direction;
              if (i == informationList.length)
              {
                i = 0;
              }
              else
              {
                if (i == -1)
                {
                  i = informationList.length - 1;
                }
              }
            }
          }
          else
          {
            i += direction;
            if (i == informationList.length)
            {
              i = 0;
            }
            else
            {
              if (i == -1)
              {
                i = informationList.length - 1;
              }
            }
          }
        }
      }
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    //dump("fin getNextGroupOrFeed\n");
  },

  //-------------------------------------------------------------------------------------------------------------
  createNewRDFEntry: function(url, title, receivedDate, feedUrl)
  {
    try
    {
      this.rdfRepository.createNewRDFEntry(url, title, receivedDate, feedUrl);
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
  },

  //-------------------------------------------------------------------------------------------------------------
  exists: function(url, title, checkHistory, feedUrl)
  {
    return this.rdfRepository.exists(url, title, checkHistory, feedUrl);
  },

  //-------------------------------------------------------------------------------------------------------------
  getAttribute: function(url, title, attribute)
  {
    return this.rdfRepository.getAttribute(url, title, attribute);
  },

  //-------------------------------------------------------------------------------------------------------------
  setAttribute: function(url, title, attribute, value)
  {
    return this.rdfRepository.setAttribute(url, title, attribute, value);
  },

  //-------------------------------------------------------------------------------------------------------------
  setCycleGroup: function(group)
  {
    this.cycleGroup = group;
  },

  //-------------------------------------------------------------------------------------------------------------
  newRDF: function()
  {
    this.rdfRepository.init();
  },

  //-------------------------------------------------------------------------------------------------------------
  purgeRdf: function()
  {
    this.rdfRepository.purged = false;
    this.rdfRepository.purge();
  },

  //-------------------------------------------------------------------------------------------------------------
  clearRdf: function()
  {
    this.rdfRepository.clearRdf();
  },

  //-------------------------------------------------------------------------------------------------------------
  manualRefresh: function()
  {
    inforssTraceIn(this);
    try
    {
      var selectedInfo = this.getSelectedInfo(false);
      if (selectedInfo != null)
      {
        selectedInfo.manualRefresh();
      }
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
  },

};
