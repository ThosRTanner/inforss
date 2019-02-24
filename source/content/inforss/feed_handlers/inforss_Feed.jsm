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
// inforss_Feed
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------

/* jshint globalstrict: true */
/* eslint-disable strict */
"use strict";

/** This module provides the base information for feed handlers.
 * It wraps up the manager and the configuration
 */

/* eslint-disable array-bracket-newline */
/* exported EXPORTED_SYMBOLS */
const EXPORTED_SYMBOLS = [
  "Feed", /* exported Feed */
];
/* eslint-enable array-bracket-newline */

const { debug } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Debug.jsm",
  {}
);

/** Create a feed object.
 *
 * @class
 *
 * This is very very basic object containing mostly configuration and a little
 * state.
 *
 * @param {Element} feedXML - parsed xml tree for feed config
 * @param {Feed_Manager} manager - instance of manager controlling feed
 * @param {Element} menuItem - menu item for this feed. Why???
 * @param {Mediator} mediator - mediator object to communicate with display
 * @param {Config} config - extension configuration
 */
function Feed(feedXML, manager, menuItem, mediator, config)
{
  this.active = false;
  this.disposed = false;
  this.feedXML = feedXML;
  this.manager = manager;
  this.menuItem = menuItem;
  this.mediator = mediator;
  this.config = config;
  this.lastRefresh = null;
  this.next_refresh = null;
  this.publishing_enabled = true; //Set if this is currently part of a playlist
}

Object.assign(Feed.prototype, {

  /** Dispose of feed
   *
   * this adds a disposed marker and clears the active flag.
   * sub classes can check for disposed and abandon any processing
   */
  dispose()
  {
    this.active = false;
    this.disposed = true;
  },

  //----------------------------------------------------------------------------
  isSelected()
  {
    return this.feedXML.getAttribute("selected") == "true";
  },

  //----------------------------------------------------------------------------
  select()
  {
    try
    {
      this.feedXML.setAttribute("selected", "true");
      if (this.menuItem != null) //FIXME can it ever be null?
      {
        this.menuItem.setAttribute("checked", "true");
      }
    }
    catch (err)
    {
      debug(err);
    }
  },

  //----------------------------------------------------------------------------
  unselect()
  {
    try
    {
      this.feedXML.setAttribute("selected", "false");
      if (this.menuItem != null)
      {
        this.menuItem.setAttribute("checked", "false");
      }
    }
    catch (err)
    {
      debug(err);
    }
  },

  //----------------------------------------------------------------------------
  isActive()
  {
    return this.active;
  },

  //----------------------------------------------------------------------------
  isPlayList()
  {
    return this.feedXML.getAttribute("playlist") == "true";
  },

  //----------------------------------------------------------------------------
  getUrl()
  {
    return this.feedXML.getAttribute("url");
  },

  //----------------------------------------------------------------------------
  getNbItem()
  {
    return this.feedXML.getAttribute("nbItem");
  },

  //----------------------------------------------------------------------------
  getLengthItem()
  {
    return this.feedXML.getAttribute("lengthItem");
  },

  //----------------------------------------------------------------------------
  getSavePodcastLocation()
  {
    return this.feedXML.getAttribute("savePodcastLocation");
  },

  //----------------------------------------------------------------------------
  getEncoding()
  {
    return this.feedXML.getAttribute("encoding");
  },

  //----------------------------------------------------------------------------
  removeRss(/*url*/)
  {
    //Overridden by inforss_Grouped_Feed
  },

  //----------------------------------------------------------------------------
  getType()
  {
    return this.feedXML.getAttribute("type");
  },

  //----------------------------------------------------------------------------
  getTitle()
  {
    return this.feedXML.getAttribute("title");
  },

  //----------------------------------------------------------------------------
  getIcon()
  {
    return this.feedXML.getAttribute("icon");
  },

  //----------------------------------------------------------------------------
  getLinkAddress()
  {
    return this.feedXML.getAttribute("link");
  },

  //----------------------------------------------------------------------------
  getFilter()
  {
    return this.feedXML.getAttribute("filter");
  },

  //----------------------------------------------------------------------------
  getFeedActivity()
  {
    return this.feedXML.getAttribute("activity") == "true";
  },

  //----------------------------------------------------------------------------
  getBrowserHistory()
  {
    return this.feedXML.getAttribute("browserHistory") == "true";
  },

  //----------------------------------------------------------------------------
  getFilters()
  {
    return this.feedXML.getElementsByTagName("FILTER");
  },

  //----------------------------------------------------------------------------
  getFilterPolicy()
  {
    return this.feedXML.getAttribute("filterPolicy");
  },

  //----------------------------------------------------------------------------
  getUser()
  {
    return this.feedXML.getAttribute("user");
  },

  //----------------------------------------------------------------------------
  reset()
  {
    this.active = false;
  },

  //----------------------------------------------------------------------------
  remove()
  {
    try
    {
      if (this.menuItem != null)
      {
        this.menuItem.remove();
      }

      //This should probably have been done before (i.e. should have been
      //removed from the configuration, otherwise we can get groups being
      //messed up.
      this.feedXML.remove();

      this.deactivate();
      this.menuItem = null;
      this.feedXML = null;
    }
    catch (err)
    {
      debug(err);
    }
  },

  //----------------------------------------------------------------------------
  createNewRDFEntry(url, title, receivedDate)
  {
    try
    {
      this.manager.createNewRDFEntry(url, title, receivedDate, this.getUrl());
    }
    catch (err)
    {
      debug(err);
    }
  },

  //----------------------------------------------------------------------------
  exists(url, title, checkHistory)
  {
    return this.manager.exists(url, title, checkHistory, this.getUrl());
  },

  //----------------------------------------------------------------------------
  getAttribute(url, title, attribute)
  {
    return this.manager.getAttribute(url, title, attribute);
  },

  //----------------------------------------------------------------------------
  setAttribute(url, title, attribute, value)
  {
    return this.manager.setAttribute(url, title, attribute, value);
  },

  /** Find the next feed to display when doing next/previous button or cycling.
   *
   * Takes into account feeds being disabled (annoyingly known as
   * getFeedActivity)
   * If there are no feeds enabled, this will return the selected input
   *
   * @param {Array} feeds - array of feeds to step through
   * @param {integer} pos - position in array of currently selected feed
   *                        (or -1 if no selection)
   * @param {integer} direction - step direction (+1 or -1)
   *
   * @returns {integer} the index in the feed array of the next feed
   */
  find_next_feed(feeds, pos, direction)
  {
    return this._find_next_feed(this.getType(), feeds, pos, direction);
  },

  /** Private version of above, used by grouped feed cycling
   *
   * @param {string} type - if null, doest check type. if not null, then it is
   *                 used to ensure that either both or neither the new and
   *                 currently selected items are a group.
   *                 null is needed because this is called from a group when
   *                 cycling the group list/playlist and the type against the
   *                 current feed isn't applicable.
   * @param {Array} feeds - array of feeds to step through
   * @param {integer} pos - position in array of currently selected feed
   *                        (or -1 if no selection)
   * @param {integer} direction - step direction (+1 or -1)
   *
   * @returns {integer} the index in the feed array of the next feed
   */
  _find_next_feed(type, feeds, pos, direction)
  {
    const length = feeds.length;
    let i = 0;
    let counter = 0;
    let posn = pos;
    //This (min(10, length)) is a very questionable interpretation of random
    const count =
      pos == -1 || this.config.headline_bar_cycle_type == "next" ?
        1 :
        Math.floor(Math.random() * Math.min(10, length)) + 1;
    while (i < count && counter < length)
    {
      ++counter;
      posn = (length + posn + direction) % length;
      if (type != null &&
          (feeds[posn].getType() == "group") != (type == "group"))
      {
        continue;
      }
      if (! feeds[posn].getFeedActivity())
      {
        continue;
      }
      pos = posn;
      ++i;
    }
    return pos;
  }
});
