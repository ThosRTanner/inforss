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
// inforss_Information
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
var EXPORTED_SYMBOLS = [
  "Information", /* exported Information */
];
/* eslint-enable array-bracket-newline */

const { debug } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Debug.jsm",
  {}
);

function Information(feedXML, manager, menuItem, mediator, config)
{
  this.active = false;
  this.feedXML = feedXML;
  this.manager = manager;
  this.menuItem = menuItem;
  this.mediator = mediator;
  this.config = config;
  this.lastRefresh = null;
  this.next_refresh = null;
  this.publishing_enabled = true; //Set if this is currently part of a playlist
}

Object.assign(Information.prototype, {

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
      debug(err, this);
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
      debug(err, this);
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
    //Overridden by inforssGroupedFeed
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
        this.menuItem.parentNode.removeChild(this.menuItem);
      }
      this.feedXML.parentNode.removeChild(this.feedXML);
      this.deactivate();
      this.menuItem = null;
      this.feedXML = null;
    }
    catch (err)
    {
      debug(err, this);
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
      debug(err, this);
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
   * Takes into account feeds being disabled (annoyingly known as getFeedActivity)
   * If there are no feeds enabled, this will return the selected input
   *
   * feeds - array of feeds to step through
   * pos - position in array of currently selected feed (or -1 if no selection)
   * direction - step direction (+1 or -1)
   */
  find_next_feed(feeds, pos, direction)
  {
    return this._find_next_feed(this.getType(), feeds, pos, direction);
  },

  /** Private version of above, used by grouped feed cycling
   * type - if null, doest check type. if not null, then it is used to ensure
   *        that either both or neither the new and currently selected items are
   *        a group.
   *        null is needed because this is called from a group when cycling the
   *        group list/playlist and the type against the current feed isn't
   *        applicable.
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
