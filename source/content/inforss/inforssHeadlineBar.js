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
// inforssHeadlineBar
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------
/* globals inforss */
Components.utils.import("chrome://inforss/content/modules/inforssDebug.jsm");

/* globals inforssXMLRepository */

//FIXME get rid of all the 2 phase initialisation

function inforssHeadlineBar(mediator)
{
  this.mediator = mediator;
  this.observedFeeds = new Array();
  return this;
}

//-------------------------------------------------------------------------------------------------------------
inforssHeadlineBar.prototype = {
  headlines: new Array(),

  //-------------------------------------------------------------------------------------------------------------
  init: function()
  {
    inforss.traceIn(this);
    try
    {
      for (let feed of this.observedFeeds)
      {
        feed.resetHbox();
      }
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    inforss.traceOut(this);
  },

  //-------------------------------------------------------------------------------------------------------------
  resetHeadlines: function()
  {
    inforss.traceIn(this);
    this.headlines = new Array();
    this.mediator.resetDisplay();
    inforss.traceOut(this);
  },

  //-------------------------------------------------------------------------------------------------------------
  updateBar: function(feed)
  {
    //FIXME Sort of odd. Is there an 'if feed in observed' sort of thing?
    for (let observed of this.observedFeeds)
    {
      if (observed.getUrl() == feed.getUrl())
      {
        this.updateHeadlines(feed);
        this.mediator.updateDisplay(feed);
        return;
      }
    }
  },

//-------------------------------------------------------------------------------------------------------------
  updateHeadlines: function(feed)
  {
    inforss.traceIn(this);
    try
    {
      let num = 0;
      let shown = 0;
      const max = feed.getNbItem();
      feed.resetCandidateHeadlines();
      for (let headline of feed.headlines)
      {
        if (!inforssXMLRepository.hide_old_headlines() || headline.isNew())
        {
          if (!inforssXMLRepository.hide_viewed_headlines() || !headline.viewed)
          {
            if (!headline.banned && this.filterHeadline(feed, headline, 0, num))
            {
              feed.pushCandidateHeadline(headline);
              shown++;
              if (shown == max)
              {
                break;
              }
            }
          }
        }
      }
      ++num;
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    inforss.traceOut(this);
  },

  //-------------------------------------------------------------------------------------------------------------
  filterHeadline: function(feed, headline, type, index)
  {
    inforss.traceIn(this);
    try
    {
      var selectedInfo = this.mediator.getSelectedInfo(false);
      var items = null;
      var anyall = null;
      var result = null;
      if (selectedInfo.getType() == "group")
      {
        switch (selectedInfo.getFilterPolicy())
        {
          default: //Not possible...
          case "0": //feed
            {
              items = feed.getFilters();
              anyall = feed.getFilter();
              break;
            }
          case "1": //group
            {
              items = selectedInfo.getFilters();
              anyall = selectedInfo.getFilter();
              break;
            }
          case "2": //both
            {
              if (type == 1)
              {
                items = feed.getFilters();
                anyall = feed.getFilter();
              }
              else
              {
                if (type == 2)
                {
                  items = selectedInfo.getFilters();
                  anyall = selectedInfo.getFilter();
                }
                else
                {
                  result = this.filterHeadline(feed, headline, 1, index) &&
                           this.filterHeadline(feed, headline, 2, index);
                }
              }
              break;
            }
        }
      }
      else
      {
        items = feed.getFilters();
        anyall = feed.getFilter();
      }
      if (result == null)
      {
        result = (anyall == "all") ? true : false;
        var nb = 0;
        //  dump("first result=" + result + " " + headline.title + "\n");
        var currentDate = new Date();
        var text = null;
        var compareText = null;
        for (var i = 0; i < items.length; i++)
        {
          var temp = null;
          if (items[i].getAttribute("active") == "true")
          {
            nb++;
            switch (items[i].getAttribute("type"))
            {
              case "0": //headline
                {
                  text = (feed.feedXML.getAttribute("filterCaseSensitive") == "true") ? items[i].getAttribute("text") : items[i].getAttribute("text").toLowerCase();
                  compareText = (feed.feedXML.getAttribute("filterCaseSensitive") == "true") ? headline.title : headline.title.toLowerCase();
                  if (items[i].getAttribute("include") == 0) // include
                  {
                    temp = (new RegExp(text).exec(compareText) != null);
                  }
                  else
                  {
                    temp = (new RegExp(text).exec(compareText) == null);
                  }
                  //   dump("temp=" + temp + "\n");
                  break;
                }
              case "1": //article
                {
                  text = (feed.feedXML.getAttribute("filterCaseSensitive") == "true") ? items[i].getAttribute("text") : items[i].getAttribute("text").toLowerCase();
                  compareText = (feed.feedXML.getAttribute("filterCaseSensitive") == "true") ? headline.description : headline.description.toLowerCase();
                  if (items[i].getAttribute("include") == 0) // include
                  {
                    temp = (new RegExp(text).exec(compareText) != null);
                  }
                  else
                  {
                    temp = (new RegExp(text).exec(compareText) == null);
                  }
                  break;
                }
              case "2": //category
                {
                  text = (feed.feedXML.getAttribute("filterCaseSensitive") == "true") ? items[i].getAttribute("text") : items[i].getAttribute("text").toLowerCase();
                  compareText = (feed.feedXML.getAttribute("filterCaseSensitive") == "true") ? headline.category : headline.category.toLowerCase();
                  if (items[i].getAttribute("include") == 0) // include
                  {
                    temp = (new RegExp(text).exec(compareText) != null);
                  }
                  else
                  {
                    temp = (new RegExp(text).exec(compareText) == null);
                  }
                  break;
                }
              case "3": //published
                {
                  var delta = this.getDelta(items[i], items[i].getAttribute("elapse"));
                  if (items[i].getAttribute("compare") == 0) // less than
                  {
                    temp = ((currentDate - headline.publishedDate) < delta);
                  }
                  else
                  {
                    if (items[i].getAttribute("compare") == 1) // more than
                    {
                      temp = ((currentDate - headline.publishedDate) >= delta);
                      //dump("temp date=" + temp + " " + currentDate + " " + headline.publishedDate + "\n");
                      //dump("temp date=" + temp + " " + (currentDate - headline.publishedDate) + " " + delta + "\n");
                    }
                    else //equals
                    {
                      var delta1 = this.getDelta(items[i], (eval(items[i].getAttribute("elapse")) + 1));
                      temp = (((currentDate - headline.publishedDate) >= delta) &&
                        ((currentDate - headline.publishedDate) < delta1));
                    }
                  }
                  break;
                }
              case "4": //received
                {
                  var delta = this.getDelta(items[i], items[i].getAttribute("elapse"));
                  if (items[i].getAttribute("compare") == 0) // less than
                  {
                    temp = ((currentDate - headline.receivedDate) < delta);
                  }
                  else
                  {
                    if (items[i].getAttribute("compare") == 1) // more than
                    {
                      temp = ((currentDate - headline.receivedDate) >= delta);
                    }
                    else //equals
                    {
                      var delta1 = this.getDelta(items[i], (eval(items[i].getAttribute("elapse")) + 1));
                      temp = (((currentDate - headline.receivedDate) >= delta) &&
                        ((currentDate - headline.receivedDate) < delta1));
                    }
                  }
                  break;
                }
              case "5": //read
                {
                  var delta = this.getDelta(items[i], items[i].getAttribute("elapse"));
                  if (headline.readDate == null)
                  {
                    temp = true;
                  }
                  else
                  {
                    if (items[i].getAttribute("compare") == 0) // less than
                    {
                      temp = ((currentDate - headline.readDate) < delta);
                    }
                    else
                    {
                      if (items[i].getAttribute("compare") == 1) // more than
                      {
                        temp = ((currentDate - headline.readDate) >= delta);
                      }
                      else //equals
                      {
                        var delta1 = this.getDelta(items[i], (eval(items[i].getAttribute("elapse")) + 1));
                        temp = (((currentDate - headline.readDate) >= delta) &&
                          ((currentDate - headline.readDate) < delta1));
                      }
                    }
                  }
                  break;
                }
              case "6": // headline #
                {
                  if (items[i].getAttribute("hlcompare") == 0) // less than
                  {
                    temp = ((index + 1) < eval(items[i].getAttribute("nb")));
                  }
                  else
                  {
                    if (items[i].getAttribute("hlcompare") == 1) // more than
                    {
                      temp = ((index + 1) > eval(items[i].getAttribute("nb")));
                    }
                    else //equals
                    {
                      temp = (eval(items[i].getAttribute("nb")) == (index + 1));
                    }
                  }
                  break;
                }
            }

            if (anyall == "all")
            {
              result = result && temp;
            }
            else
            {
              result = result || temp;
            }
          }
        }
        if (nb == 0)
        {
          result = true;
        }
      }
      //dump("next last result=" + result + " " + headline.title + "\n");
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    inforss.traceOut(this);
    return result;
  },

  //-------------------------------------------------------------------------------------------------------------
  getDelta: function(filter, elapse)
  {
    inforss.traceIn(this);
    //dump("getDelta unit=" + filter.getAttribute("unit") + " " + elapse + "\n");
    var delta = 0;
    switch (filter.getAttribute("unit"))
    {
      case "0": //second
        {
          delta = eval(elapse) * 1000;
          break;
        }
      case "1": //minute
        {
          delta = eval(elapse) * 60 * 1000;
          break;
        }
      case "2": //hour
        {
          delta = eval(elapse) * 3600 * 1000;
          break;
        }
      case "3": //day
        {
          delta = eval(elapse) * 24 * 3600 * 1000;
          break;
        }
      case "4": //week
        {
          delta = eval(elapse) * 7 * 24 * 3600 * 1000;
          break;
        }
      case "5": //month
        {
          delta = eval(elapse) * 30 * 24 * 3600 * 1000;
          break;
        }
      case "6": //year
        {
          delta = eval(elapse) * 365 * 24 * 3600 * 1000;
          break;
        }
    }
    inforss.traceOut(this);
    return delta;
  },

  //-------------------------------------------------------------------------------------------------------------
  reset: function()
  {
    this.headlines = new Array();
  },

  //-------------------------------------------------------------------------------------------------------------
  refreshBar: function()
  {
    inforss.traceIn(this);
    try
    {
      this.mediator.resetDisplay();

      for (let feed of this.observedFeeds)
      {
        this.resetHBoxSize(feed);
        this.updateBar(feed);
      }
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    inforss.traceOut(this);
  },

  //-------------------------------------------------------------------------------------------------------------
  getLastDisplayedHeadline: function()
  {
    inforss.traceIn(this);
    var returnValue = null;
    try
    {
      var i = this.observedFeeds.length - 1;
      var find = false;
      while ((i >= 0) && (find == false))
      {
        if (this.observedFeeds[i].displayedHeadlines.length > 0)
        {
          find = true;
          returnValue = this.observedFeeds[i].displayedHeadlines[this.observedFeeds[i].displayedHeadlines.length - 1];
        }
        else
        {
          i--;
        }
      }
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    inforss.traceOut(this);
    return returnValue;
  },

  //-------------------------------------------------------------------------------------------------------------
  resetHBoxSize: function(feed) // in fact resize hbox, reset label and icon and tooltip
  {
    inforss.traceIn(this);
    try
    {
      var hbox = null;
      for (var i = 0; i < feed.displayedHeadlines.length; i++)
      {
        if (feed.displayedHeadlines[i].hbox != null)
        {
          hbox = feed.displayedHeadlines[i].hbox;
          hbox.setAttribute("flex", "0");
          if (inforssXMLRepository.headline_shows_feed_icon() && hbox.firstChild.nodeName != "vbox")
          {
            var vbox = document.createElement("vbox");
            var spacer = document.createElement("spacer");
            vbox.appendChild(spacer);
            spacer.setAttribute("flex", "1");
            var image = document.createElement("image");
            vbox.appendChild(image);
            image.setAttribute("src", feed.getIcon());
            image.setAttribute("maxwidth", "16");
            image.setAttribute("maxheight", "16");
            image.style.maxWidth = "16px";
            image.style.maxHeight = "16px";
            spacer = document.createElement("spacer");
            vbox.appendChild(spacer);
            spacer.setAttribute("flex", "1");
            hbox.insertBefore(vbox, hbox.firstChild);
          }
          else
          {
            if (!inforssXMLRepository.headline_shows_feed_icon() && hbox.firstChild.nodeName == "vbox")
            {
              hbox.removeChild(hbox.firstChild);
            }
            else
            {
              if (inforssXMLRepository.headline_shows_feed_icon() && hbox.firstChild.nodeName == "vbox")
              {
                hbox.firstChild.childNodes[1].setAttribute("src", feed.getIcon());
                //dump(feed.getIcon() + "\n");
              }
            }
          }
          var imgs = hbox.getElementsByTagName("image");
          var vboxBanned = null;
          var vboxEnclosure = null;
          for (var j = 0; j < imgs.length; j++)
          {
            if (imgs[j].getAttribute("src").indexOf("closetab") != -1)
            {
              vboxBanned = imgs[j].parentNode;
            }
            else
            {
              if ((imgs[j].getAttribute("src").indexOf("speaker") != -1) ||
                (imgs[j].getAttribute("src").indexOf("image") != -1) ||
                (imgs[j].getAttribute("src").indexOf("movie") != -1))
              {
                vboxEnclosure = imgs[j].parentNode;
              }
            }
          }

          if (inforssXMLRepository.headline_shows_enclosure_icon() &&
              vboxEnclosure == null &&
              feed.displayedHeadlines[i].enclosureType != null)
          {
            var vbox = document.createElement("vbox");
            if (vboxBanned == null)
            {
              hbox.appendChild(vbox);
            }
            else
            {
              hbox.insertBefore(vbox, vboxBanned);
            }
            var spacer = document.createElement("spacer");
            vbox.appendChild(spacer);
            spacer.setAttribute("flex", "1");
            var image = document.createElement("image");
            vbox.appendChild(image);
            if (feed.displayedHeadlines[i].enclosureType.indexOf("audio/") != -1)
            {
              image.setAttribute("src", "chrome://inforss/skin/speaker.png");
            }
            else
            {
              if (feed.displayedHeadlines[i].enclosureType.indexOf("image/") != -1)
              {
                image.setAttribute("src", "chrome://inforss/skin/image.png");
              }
              else
              {
                if (feed.displayedHeadlines[i].enclosureType.indexOf("video/") != -1)
                {
                  image.setAttribute("src", "chrome://inforss/skin/movie.png");
                }
              }
            }
            image.setAttribute("inforss", "true");
            image.setAttribute("tooltiptext", feed.displayedHeadlines[i].enclosureUrl);
            spacer = document.createElement("spacer");
            vbox.appendChild(spacer);
            spacer.setAttribute("flex", "1");
          }
          else
          {
            if (!inforssXMLRepository.headline_shows_enclosure_icon() && vboxEnclosure != null)
            {
              hbox.removeChild(vboxEnclosure);
            }
          }

          if (inforssXMLRepository.headline_shows_ban_icon() && vboxBanned == null)
          {
            var vbox = document.createElement("vbox");
            hbox.appendChild(vbox);
            var spacer = document.createElement("spacer");
            vbox.appendChild(spacer);
            spacer.setAttribute("flex", "1");
            var image = document.createElement("image");
            vbox.appendChild(image);
            image.setAttribute("src", "chrome://inforss/skin/closetab.png");
            image.setAttribute("inforss", "true");
            spacer = document.createElement("spacer");
            vbox.appendChild(spacer);
            spacer.setAttribute("flex", "1");
          }
          else
          {
            if (!inforssXMLRepository.headline_shows_ban_icon() && vboxBanned != null)
            {
              hbox.removeChild(vboxBanned);
            }
          }

          var labelItem = hbox.getElementsByTagName("label")[0];
          if (labelItem.hasAttribute("tooltip"))
          {
            var tooltip = document.getElementById(labelItem.getAttribute("tooltip"));
            tooltip.parentNode.removeChild(tooltip);
            labelItem.removeAttribute("tooltip");
            //FIXME: doesn't seem much point in this
            //tooltip.removeAttribute("id");
          }
          var label = labelItem.getAttribute("title");
          if (label.length > feed.getLengthItem())
          {
            label = label.substring(0, feed.getLengthItem());
          }
          labelItem.setAttribute("value", label);
          if (hbox.hasAttribute("originalWidth"))
          {
            var width = hbox.getAttribute("originalWidth");
            hbox.setAttribute("maxwidth", width);
            hbox.style.minWidth = width + "px";
            hbox.style.maxWidth = width + "px";
            hbox.style.width = width + "px";
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


  //-------------------------------------------------------------------------------------------------------------
  publishFeed: function(feed)
  {
    inforss.traceIn(this);
    try
    {
      if (this.locateObservedFeed(feed) == -1)
      {
        this.observedFeeds.push(feed);
        this.updateBar(feed);
      }
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    inforss.traceOut(this);
  },

  //-------------------------------------------------------------------------------------------------------------
  unpublishFeed: function(feed)
  {
    inforss.traceIn(this);
    try
    {
      var index = this.locateObservedFeed(feed);
      if (index != -1)
      {
        this.mediator.removeDisplay(feed);
        this.observedFeeds.splice(index, 1);
      }
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    inforss.traceOut(this);
  },

  //-------------------------------------------------------------------------------------------------------------
  locateObservedFeed: function(feed)
  {
    inforss.traceIn(this);
    var find = false;
    try
    {
      var i = 0;
      while ((i < this.observedFeeds.length) && (find == false))
      {
        if (this.observedFeeds[i].getUrl() == feed.getUrl())
        {
          find = true;
        }
        else
        {
          i++;
        }
      }
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    inforss.traceOut(this);
    return ((find) ? i : -1);
  },

  //-------------------------------------------------------------------------------------------------------------
  setViewed: function(title, link)
  {
    inforss.traceIn(this);
    try
    {
      for (let feed of this.observedFeeds)
      {
        //FIXME Seriously?
        if (feed.setViewed(title, link))
        {
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

  //-------------------------------------------------------------------------------------------------------------
  setBanned: function(title, link)
  {
    inforss.traceIn(this);
    try
    {
      for (let feed of this.observedFeeds)
      {
        //FIXME Seriously?
        if (feed.setBanned(title, link))
        {
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

  //-------------------------------------------------------------------------------------------------------------
  readAll: function()
  {
    inforss.traceIn(this);
    try
    {
      for (let feed of this.observedFeeds)
      {
        feed.setBannedAll();
      }
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    inforss.traceOut(this);
  },

  //-------------------------------------------------------------------------------------------------------------
  viewAll: function()
  {
    inforss.traceIn(this);
    try
    {
      for (let feed of this.observedFeeds)
      {
        feed.viewAll();
        this.updateBar(feed);
      }
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    inforss.traceOut(this);
  },

};
