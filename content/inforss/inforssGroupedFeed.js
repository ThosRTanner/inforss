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


function inforssGroupedFeed(feedXML, manager, menuItem)
{
  var self = new inforssInformation(feedXML, manager, menuItem);
  self.infoList = null;
  self.oldInfoList = null;
  self.timerList = null;
  self.indexForPlayList = 0;

//-------------------------------------------------------------------------------------------------------------
  self.getFeeds = function()
  {
    inforssTraceIn(this);
    try
    {
      var feedList = new Array();
      for (var i=0; i<this.infoList.length; i++)
      {
        feedList = feedList.concat(this.infoList[i].getFeeds());
      }
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
    return feedList;
  };

//-------------------------------------------------------------------------------------------------------------
  self.reset = function()
  {
    this.oldInfoList = this.infoList;
    this.infoList = null;
//dump("Reset!! " + this.getUrl() + "\n");
  };

//-------------------------------------------------------------------------------------------------------------
  self.activate = function()
  {
//alert("active group");
    inforssTraceIn(this);
    try
    {
	  this.active = true;
      if (this.infoList == null)
      {
        this.populateInfoList();
        if (this.oldInfoList != null)
        {
          for (var i=0; i < this.oldInfoList.length; i++)
          {
            var find = false;
            var j = 0;
            while ((j < this.infoList.length) && (find == false))
            {
              if (this.infoList[j].getUrl() == this.oldInfoList[i].getUrl())
              {
                find = true;
              }
              else
              {
                j++;
              }
            }
            if (find == false)
            {
              this.oldInfoList[i].passivate();
            }
          }
          this.oldInfoList = null;
        }
      }
      if (this.infoList != null)
      {
        if (this.isPlayList() == true)
        {
          this.indexForPlayList = 0;
        }
        if (this.getFeedActivity() == true)
        {
          if ((((inforssXMLRepository.isCycling() == true) &&
              (inforssXMLRepository.isCycleWithinGroup() == true)) || (this.isPlayList() == true)) &&
              (this.infoList.length > 0))
          {
            inforssSetTimer(this.infoList[0], "activate", 0);
          }
          else
          {
		    this.deleteTimerList();
		    this.timerList = new Array();
            for (var i=0; i<this.infoList.length; i++)
            {
              this.timerList.push(inforssSetTimer(this.infoList[i], "activate", 10 + 30000 * i));
            }
          }
        }
      }
// dump("fin activate group\n");
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  };

//-------------------------------------------------------------------------------------------------------------
  self.passivate = function()
  {
//alert("passivate group");
    inforssTraceIn(this);
    try
    {
	  this.active = false;
      if (this.infoList != null)
      {
        this.deleteTimerList();
        for (var i=0; i<this.infoList.length; i++)
        {
          this.infoList[i].passivate();
        }
      }
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  };

//-------------------------------------------------------------------------------------------------------------
  self.getCyclingDelay = function()
  {
//alert("getCyclingDelay");
    inforssTraceIn(this);
    var returnValue = 0;
    try
    {
	  var playLists = this.feedXML.getElementsByTagName("playLists");
	  if ((playLists.length > 0) && (playLists[0].childNodes.length > this.indexForPlayList))
	  {
	    returnValue = playLists[0].childNodes[this.indexForPlayList].getAttribute("delay");
//dump("delay for " + playLists[0].childNodes[this.indexForPlayList].getAttribute("url") + "=" + returnValue + "\n");
	  }
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
    return returnValue;
  };


//-------------------------------------------------------------------------------------------------------------
  self.deleteTimerList = function()
  {
    inforssTraceIn(this);
    try
    {
	  if (this.timerList != null)
	  {
        for (var i=0; i<this.timerList.length; i++)
        {
		  try
		  {
		    window.clearTimeout(this.timerList[i]);
	      }
	      catch(ex)
	      {}
          inforssClearTimer(this.timerList[i]);
        }
        delete this.timerList;
        this.timerList = null;
	  }
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  };

//-------------------------------------------------------------------------------------------------------------
  self.manualRefresh = function()
  {
    inforssTraceIn(this);
    try
    {
      if (this.infoList != null)
      {
        if ((inforssXMLRepository.isCycling() == true) &&
            (inforssXMLRepository.isCycleWithinGroup() == true) &&
            (this.infoList.length > 0))
        {
          inforssSetTimer(this.infoList[0], "manualRefresh", 0);
        }
        else
        {
          for (var i=0; i<this.infoList.length; i++)
          {
            inforssSetTimer(this.infoList[i], "manualRefresh", 10 + 30000 * i);
          }
        }
      }
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  };

//-------------------------------------------------------------------------------------------------------------
  self.populateInfoList = function()
  {
    inforssTraceIn(this);
    try
    {
      if (this.infoList == null)
      {
        this.infoList = new Array();
        if (this.isPlayList() == false)
        {
          var list = this.feedXML.getElementsByTagName("GROUP");
          if (list.length > 0)
          {
            for (var i=0; i < list.length; i++)
            {
              var info = this.manager.locateFeed(list[i].getAttribute("url")).info;
              if (info != null)
              {
                this.infoList.push(info);
              }
            }
          }
        }
        else
        {
          var playLists = this.feedXML.getElementsByTagName("playLists");
          if (playLists.length > 0)
          {
            var playList = null;
            for (var i=0; i < playLists[0].childNodes.length; i++)
            {
              var playList = playLists[0].childNodes[i];
              var info = this.manager.locateFeed(playList.getAttribute("url")).info;
              if (info != null)
              {
                this.infoList.push(info);
              }
            }
          }
        }
      }
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  };

//-------------------------------------------------------------------------------------------------------------
  self.removeRss = function(url)
  {
    inforssTraceIn(this);
    try
    {
      var find = false;
      var j = 0;
      while ((this.infoList != null) && (j < this.infoList.length) && (find == false))
      {
        if (this.infoList[j].getUrl() == url)
        {
          find = true;
          this.infoList.splice(j,1);
        }
        else
        {
          j++;
        }
      }
      var list = this.feedXML.getElementsByTagName("GROUP");
      if (list != null)
      {
        find = false;
        var i = 0;
        while ((i < list.length) && (find == false))
        {
          if (list[i].getAttribute("url") == url)
          {
            find = true;
            this.feedXML.removeChild(list[i]);
          }
          else
          {
            i++;
          }
        }
      }
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
   };

//-------------------------------------------------------------------------------------------------------------
  self.containsFeed = function(url)
  {
    inforssTraceIn(this);
    var find = false;
    try
    {
      var j = 0;
      while ((this.infoList != null) && (j < this.infoList.length) && (find == false))
      {
        if (this.infoList[j].getUrl() == url)
        {
          find = true;
        }
        else
        {
          j++;
        }
      }
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
    return find;
  }

//-------------------------------------------------------------------------------------------------------------
  self.addNewFeed = function(url)
  {
    inforssTraceIn(this);
    try
    {
      var group = document.createElement("GROUP");
      group.setAttribute("url",url);
      feedXML.appendChild(group);
      inforssSave();
      var info = this.manager.locateFeed(url).info;
      if (info != null)
      {
        if (this.infoList == null)
        {
          this.infoList = new Array();
        }
        this.infoList.push(info);
        if (this.isSelected() == true)
        {
          info.activate();
        }
      }
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  }

//-------------------------------------------------------------------------------------------------------------
  self.getNbNew = function()
  {
    inforssTraceIn(this);
    var returnValue = 0;
    try
    {
      if (this.infoList != null)
      {
        for (var i = 0; i < this.infoList.length; i++)
        {
          returnValue += this.infoList[i].getNbNew();
        }
      }
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
    return returnValue;
  };

//-------------------------------------------------------------------------------------------------------------
  self.getNbUnread = function()
  {
    inforssTraceIn(this);
    var returnValue = 0;
    try
    {
      if (this.infoList != null)
      {
        for (var i = 0; i < this.infoList.length; i++)
        {
          returnValue += this.infoList[i].getNbUnread();
        }
      }
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
    return returnValue;
  };

//-------------------------------------------------------------------------------------------------------------
  self.getNbHeadlines = function()
  {
    inforssTraceIn(this);
    var returnValue = 0;
    try
    {
      if (this.infoList != null)
      {
        for (var i = 0; i < this.infoList.length; i++)
        {
          returnValue += this.infoList[i].getNbHeadlines();
        }
      }
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
    return returnValue;
  };

  return self;
}
