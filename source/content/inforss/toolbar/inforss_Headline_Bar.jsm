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
// inforss_Headline_Bar
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------

/* eslint-disable strict */
/* jshint globalstrict: true */
"use strict";

/* eslint-disable array-bracket-newline */
/* exported EXPORTED_SYMBOLS */
const EXPORTED_SYMBOLS = [
  "Headline_Bar", /* exported Headline_Bar */
];
/* eslint-enable array-bracket-newline */

const { debug, traceIn, traceOut } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Debug.jsm",
  {}
);

const { Main_Icon } = Components.utils.import(
  "chrome://inforss/content/toolbar/inforss_Main_Icon.jsm",
  {}
);


const Inforss_Prefs = Components.classes[
  "@mozilla.org/preferences-service;1"].getService(
  Components.interfaces.nsIPrefService).getBranch('inforss.');

//FIXME A lot of the functions in here should be called via AddEventHandler

const { console } =
  Components.utils.import("resource://gre/modules/Console.jsm", {});

/** Create a headline bar.
 *
 * @class
 *
 * Mainly deals with button events on the headline and selecting which headlines
 * to display based on filters.
 *
 * @param {Mediator} mediator - mediates between parts of the toolbar area
 * @param {Config} config - configuration
 * @param {Object} document - global document object
 */
function Headline_Bar(mediator, config, document)
{
  this._mediator = mediator;
  this._config = config;
  this._document = document;
  this._observed_feeds = [];
  this._selected_feed = null;

  this._menu_button = new Main_Icon(mediator, config, document);

  this._show_hide_old_headlines_tooltip =
    this.__show_hide_old_headlines_tooltip.bind(this);
  document.getElementById("inforss.hideold.tooltip").addEventListener(
    "popupshowing",
    this._show_hide_old_headlines_tooltip
  );

  //FIXME REFACTOR THIS!
  let addon_bar_name = "addon-bar";
  let addon_bar = document.getElementById(addon_bar_name);
  if (addon_bar == null ||
      addon_bar.getAttribute("toolbarname") != "Status Bar")
  {
    addon_bar_name = "status4evar-status-bar";
    addon_bar = document.getElementById(addon_bar_name);
  }

  this._has_addon_bar = addon_bar != null;
/**/console.log(addon_bar)

  this._addon_bar_name = this._has_addon_bar ? addon_bar_name :
                                               "inforss-addon-bar";
  this._addon_bar = document.getElementById(this._addon_bar_name);

  this._spring = this._document.getElementById("inforss.toolbar.spring");

}

Headline_Bar.prototype = {

  /** Reinitialise the headline bar
   *
   * This puts it in the right place on the display
   */
  init()
  {
    try
    {
      this._position_bar();

      //This function was never called so I'm not sure what this does and where
      //it got replaced.
      //for (let feed of this._observed_feeds)
      //{
      //  feed.resetHbox();
      //}
      this._menu_button.init();
    }
    catch (err)
    {
      debug(err, this);
    }
  },

  /** Get the id used for the selected configuration
   *
   * @returns {string} An id. Duh.
   */
  _get_desired_id()
  {
    switch (this._config.headline_bar_location)
    {
      case this._config.in_status_bar:
        return this._addon_bar_name;

      case this._config.at_top:
        return "inforss-bar-top";

      default:
      case this._config.at_bottom:
        return "inforss-bar-bottom";
    }
  },

  /** Update the visibility of the various possible headline locations
   *
   * @param {Object} headlines - dom element for the panel
   * @param {boolean} in_toolbar - true if in top/bottom toolbar
   */
  _update_panel(headlines, in_toolbar)
  {
    this._document.getElementById("inforss.resizer").collapsed = in_toolbar;
    const statuspanelNews = this._document.getElementById("inforss-hbox");
    statuspanelNews.flex = in_toolbar ? "1" : "0";
    statuspanelNews.firstChild.flex = in_toolbar ? "1" : "0";
    headlines.flex = in_toolbar ? "1" : "0";
  },

  /** Move the headline bar to the correct place
   *
   * The headline bar can be in 3 places:
   * top: Implemented as a toolbar
   * bottom: implemented as an hbox which is tacked onto the status bar
   * status bar: added into the status bar
   */
  _position_bar()
  {
    const desired_container = this._get_desired_id();

    const headlines = this._document.getElementById("inforss.headlines");
    const container = headlines.parentNode;

    if (desired_container == container.id)
    {
      //changing to the same place. Do nothing.
      return;
    }

    if (container.id == "inforss-bar-top")
    {
      //Changing the location. If we were at the top remember whether or not the
      //toolbar was hidden.
      Inforss_Prefs.setBoolPref("toolbar.collapsed", container.collapsed);
    }

    if (this._config.headline_bar_location == this._config.in_status_bar)
    {
      //Headlines in the status bar
      this._update_panel(headlines, false);

      container.remove();

      this._addon_bar.insertBefore(this._spring,
                                   this._addon_bar.lastElementChild);
      this._addon_bar.insertBefore(headlines, this._addon_bar.lastElementChild);
    }
    else
    {
      //Headlines in a tool bar
      this._update_panel(headlines, true);
      if (container.id == this._addon_bar_name)
      {
        // was in the status bar
        headlines.remove();
        this._spring.remove();
      }
      else
      {
        // was in a tool bar
        container.remove();
      }

      //Why do we keep recreating the tool bar?
      if (this._config.headline_bar_location == this._config.at_top)
      {
        //note this and the next statusbar should be const but jshint version
        //on codacy complains
        //headlines at the top
        let statusbar = this._document.createElement("toolbar");
        //There is not a lot of documentation on what persist does. In theory it
        //should cause the collapsed attribute to be persisted on restart, but
        //we're recreating the toolbar every time we go through here.
        statusbar.persist = "collapsed";
        statusbar.collapsed = Inforss_Prefs.getBoolPref("toolbar.collapsed");
        statusbar.setAttribute("toolbarname", "InfoRSS");
        statusbar.id = "inforss-bar-top";
        statusbar.appendChild(headlines);
        const toolbox = this._document.getElementById("navigator-toolbox");
        toolbox.appendChild(statusbar);
      }
      else
      {
        //headlines at the bottom
        //FIXME It'd be nice if this could somehow appear in toolbar menu
        let statusbar = this._document.createElement("hbox");
        statusbar.id = "inforss-bar-bottom";
        statusbar.appendChild(headlines);
        let toolbar = this._addon_bar;
/**/console.log(toolbar)
        toolbar.parentNode.insertBefore(statusbar, toolbar);
      }
    }
  },

  //-------------------------------------------------------------------------------------------------------------
  updateBar(feed)
  {
    //FIXME Sort of odd. Is there an 'if feed in observed' sort of thing?
    for (let observed of this._observed_feeds)
    {
      if (observed.getUrl() == feed.getUrl())
      {
        this.updateHeadlines(feed);
        this._mediator.updateDisplay(feed);
        return;
      }
    }
  },

//-------------------------------------------------------------------------------------------------------------
  updateHeadlines(feed)
  {
    traceIn(this);
    try
    {
      let num = 0;
      let shown = 0;
      const max = feed.getNbItem();
      feed.resetCandidateHeadlines();
      for (let headline of feed.headlines)
      {
        //FIXME filterHeadline name doesn't match sense of result.
        if (!(this._config.hide_old_headlines && ! headline.isNew()) &&
            !(this._config.hide_viewed_headlines && headline.viewed) &&
            ! headline.banned &&
            this.filterHeadline(feed, headline, 0, num)
           )
        {
          feed.pushCandidateHeadline(headline);
          shown++;
          if (shown == max)
          {
            break;
          }
        }
        ++num;
      }
    }
    catch (e)
    {
      debug(e, this);
    }
    traceOut(this);
  },

  //-------------------------------------------------------------------------------------------------------------
  filterHeadline(feed, headline, type, index)
  {
    traceIn(this);
    try
    {
      var selectedInfo = this._mediator.get_selected_feed();
      var items = null;
      var anyall = null;
      var result = null;
      //FIXME will break if selectedInfo is null.
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
      debug(e, this);
    }
    traceOut(this);
    return result;
  },

  //-------------------------------------------------------------------------------------------------------------
  getDelta(filter, elapse)
  {
    traceIn(this);
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
    traceOut(this);
    return delta;
  },

  //-------------------------------------------------------------------------------------------------------------
  refreshBar()
  {
    traceIn(this);
    try
    {
      this._mediator.resetDisplay();

      for (let feed of this._observed_feeds)
      {
        this.resetHBoxSize(feed);
        this.updateBar(feed);
      }
    }
    catch (e)
    {
      debug(e, this);
    }
    traceOut(this);
  },

  //-------------------------------------------------------------------------------------------------------------
  getLastDisplayedHeadline()
  {
    traceIn(this);
    var returnValue = null;
    try
    {
      var i = this._observed_feeds.length - 1;
      var find = false;
      while ((i >= 0) && (find == false))
      {
        if (this._observed_feeds[i].displayedHeadlines.length > 0)
        {
          find = true;
          returnValue = this._observed_feeds[i].displayedHeadlines[this._observed_feeds[i].displayedHeadlines.length - 1];
        }
        else
        {
          i--;
        }
      }
    }
    catch (e)
    {
      debug(e, this);
    }
    traceOut(this);
    return returnValue;
  },

  //-------------------------------------------------------------------------------------------------------------
  resetHBoxSize(feed) // in fact resize hbox, reset label and icon and tooltip
  {
    traceIn(this);
    try
    {
      var hbox = null;
      for (var i = 0; i < feed.displayedHeadlines.length; i++)
      {
        if (feed.displayedHeadlines[i].hbox != null)
        {
          hbox = feed.displayedHeadlines[i].hbox;
          hbox.setAttribute("flex", "0");
          if (this._config.headline_shows_feed_icon && hbox.firstChild.nodeName != "vbox")
          {
            var vbox = this._document.createElement("vbox");
            var spacer = this._document.createElement("spacer");
            vbox.appendChild(spacer);
            spacer.setAttribute("flex", "1");
            var image = this._document.createElement("image");
            vbox.appendChild(image);
            image.setAttribute("src", feed.getIcon());
            image.setAttribute("maxwidth", "16");
            image.setAttribute("maxheight", "16");
            image.style.maxWidth = "16px";
            image.style.maxHeight = "16px";
            spacer = this._document.createElement("spacer");
            vbox.appendChild(spacer);
            spacer.setAttribute("flex", "1");
            hbox.insertBefore(vbox, hbox.firstChild);
          }
          else
          {
            if (!this._config.headline_shows_feed_icon && hbox.firstChild.nodeName == "vbox")
            {
              hbox.removeChild(hbox.firstChild);
            }
            else
            {
              if (this._config.headline_shows_feed_icon && hbox.firstChild.nodeName == "vbox")
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

          if (this._config.headline_shows_enclosure_icon &&
              vboxEnclosure == null &&
              feed.displayedHeadlines[i].enclosureType != null)
          {
            var vbox = this._document.createElement("vbox");
            if (vboxBanned == null)
            {
              hbox.appendChild(vbox);
            }
            else
            {
              hbox.insertBefore(vbox, vboxBanned);
            }
            var spacer = this._document.createElement("spacer");
            vbox.appendChild(spacer);
            spacer.setAttribute("flex", "1");
            var image = this._document.createElement("image");
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
            spacer = this._document.createElement("spacer");
            vbox.appendChild(spacer);
            spacer.setAttribute("flex", "1");
          }
          else
          {
            if (!this._config.headline_shows_enclosure_icon && vboxEnclosure != null)
            {
              hbox.removeChild(vboxEnclosure);
            }
          }

          if (this._config.headline_shows_ban_icon && vboxBanned == null)
          {
            var vbox = this._document.createElement("vbox");
            hbox.appendChild(vbox);
            var spacer = this._document.createElement("spacer");
            vbox.appendChild(spacer);
            spacer.setAttribute("flex", "1");
            var image = this._document.createElement("image");
            vbox.appendChild(image);
            image.setAttribute("src", "chrome://inforss/skin/closetab.png");
            image.setAttribute("inforss", "true");
            spacer = this._document.createElement("spacer");
            vbox.appendChild(spacer);
            spacer.setAttribute("flex", "1");
          }
          else
          {
            if (!this._config.headline_shows_ban_icon && vboxBanned != null)
            {
              hbox.removeChild(vboxBanned);
            }
          }

          //Seems to duplicate what is in Headline.resetHbox()
          var labelItem = hbox.getElementsByTagName("label")[0];
          if (labelItem.hasAttribute("tooltip"))
          {
            var tooltip = this._document.getElementById(labelItem.getAttribute("tooltip"));
            tooltip.parentNode.removeChild(tooltip);
            labelItem.removeAttribute("tooltip");
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
      debug(e, this);
    }
    traceOut(this);
  },


  //-------------------------------------------------------------------------------------------------------------
  publishFeed(feed)
  {
    traceIn(this);
    try
    {
      if (this.locateObservedFeed(feed) == -1)
      {
        this._observed_feeds.push(feed);
        this.updateBar(feed);
      }
    }
    catch (e)
    {
      debug(e, this);
    }
    traceOut(this);
  },

  //-------------------------------------------------------------------------------------------------------------
  unpublishFeed(feed)
  {
    traceIn(this);
    try
    {
      var index = this.locateObservedFeed(feed);
      if (index != -1)
      {
        this._mediator.removeDisplay(feed);
        this._observed_feeds.splice(index, 1);
      }
    }
    catch (e)
    {
      debug(e, this);
    }
    traceOut(this);
  },

  //-------------------------------------------------------------------------------------------------------------
  locateObservedFeed(feed)
  {
    traceIn(this);
    var find = false;
    try
    {
      var i = 0;
      while ((i < this._observed_feeds.length) && (find == false))
      {
        if (this._observed_feeds[i].getUrl() == feed.getUrl())
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
      debug(e, this);
    }
    traceOut(this);
    return ((find) ? i : -1);
  },

  //-------------------------------------------------------------------------------------------------------------
  setViewed(title, link)
  {
    traceIn(this);
    try
    {
      for (let feed of this._observed_feeds)
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
      debug(e, this);
    }
    traceOut(this);
  },

  //-------------------------------------------------------------------------------------------------------------
  setBanned(title, link)
  {
    traceIn(this);
    try
    {
      for (let feed of this._observed_feeds)
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
      debug(e, this);
    }
    traceOut(this);
  },

  //-------------------------------------------------------------------------------------------------------------
  //button handler
  readAll()
  {
    traceIn(this);
    try
    {
      for (let feed of this._observed_feeds)
      {
        feed.setBannedAll();
        this.updateBar(feed);
      }
    }
    catch (e)
    {
      debug(e, this);
    }
    traceOut(this);
  },

  //-------------------------------------------------------------------------------------------------------------
  //button handler
  viewAll()
  {
    traceIn(this);
    try
    {
      for (let feed of this._observed_feeds)
      {
        feed.viewAll();
        this.updateBar(feed);
      }
    }
    catch (e)
    {
      debug(e, this);
    }
    traceOut(this);
  },

  /** Called when the hide old headlines button tooltip is shown
   *
   * Updates the label to show the number of new headlines
   * FIXME Even though the text says 'old'
   *
   * FIXME We shouldn't have a hard coded xul entry for this.
   *
   * @param {PopupShowing} event - tooltip about to be shown
   */
  __show_hide_old_headlines_tooltip(event)
  {
    const feed = this._selected_feed;
    if (feed != null)
    {
      const label = event.target.firstChild;
      const value = label.getAttribute("value");
      const index = value.indexOf("(");
      //FIXME Why bother with the (..) if you're sticking it at the end?
      label.setAttribute(
        "value",
        value.substring(0, index) + "(" + feed.getNbNew() + ")"
      );
    }
  },

  /** Show the feed currently being processed
   *
   * Remembers feed for the configurable button tooltips and updates
   * the main icon.
   *
   * @param {Feed} feed - feed just selected
   */
  show_selected_feed(feed)
  {
    //FIXME this is seriously bad.
    this._document.getElementById("inforss.popup.mainicon").setAttribute("inforssUrl", feed.feedXML.getAttribute("url"));
    //(note this is accessed from inforss main code :-( )
    this._selected_feed = feed;
    this._menu_button.show_selected_feed(feed);
  },

  /** Show that there is data is being fetched for a feed
   *
   * Just hands off to the menu button
   *
   * @param {Feed} feed - feed with activity
   */
  show_feed_activity(feed)
  {
    this._menu_button.show_feed_activity(feed);
  },

  /** Show that there is no data is being fetched for a feed */
  show_no_feed_activity()
  {
    this._menu_button.show_no_feed_activity();
  },

  /** clears the currently selected feed and removes any activity */
  clear_selected_feed()
  {
    //FIXME this is seriously bad.
    this._document.getElementById("inforss.popup.mainicon").removeAttribute("inforssUrl");
    this._selected_feed = null;
    this._menu_button.clear_selected_feed();
  },

};
