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

const { complete_assign } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Utils.jsm",
  {}
);

const { Filter } = Components.utils.import(
  "chrome://inforss/content/feed_handlers/inforss_Filter.jsm",
  {}
);

//const { console } =
//  Components.utils.import("resource://gre/modules/Console.jsm", {});

/** Create a feed object.
 *
 * @class
 *
 * This is very very basic object containing mostly configuration and a little
 * state.
 *
 * @param {Element} feedXML - parsed xml tree for feed config
 * @param {Feed_Manager} manager - instance of manager controlling feed
 * @param {Element} _menu_entry - menuitem element for this feed. Why???
 * @param {Mediator} mediator - mediator object to communicate with display
 * @param {Config} config - extension configuration
 */
function Feed(feedXML, manager, _menu_entry, mediator, config)
{
  this.active = false;
  this.disposed = false;
  this._update_xml(feedXML);
  this.manager = manager;
  this._menu_entry = _menu_entry;
  this.mediator = mediator;
  this.config = config;
  this.lastRefresh = null;
  this.next_refresh = null;
  this.publishing_enabled = true; //Set if this is currently part of a playlist
}

complete_assign(Feed.prototype, {

  /** Dispose of feed
   *
   * this adds a disposed marker and clears the active flag.
   * sub classes can check for disposed and abandon any processing
   */
  dispose()
  {
    this.active = false;
    //FIXME I don't see why this is necessary. The dispose method of the
    //superclass should cancel any requests
    this.disposed = true;

    //FIXME I don't see why we do this 'remove' stuff here.
    this._menu_entry.remove();
  },

  /** Config has been reloaded
   *
   * @param {Element} feed_xml - xml config
   * @param {Element} menu_item - menuitem object
   */
  update_config(feed_xml, menu_item)
  {
    this._update_xml(feed_xml);
    //FIXME should the old one be removed from its parent with
    //this._menu_entry.remove()?
    this._menu_entry = menu_item;
  },

  /** Set up the feedXML and anything that is built from it.
   *
   * Updates with new xml configuration, setting any interesting stuff
   *
   * @param {Element} config - new feed configuration
   */
  _update_xml(config)
  {
    this.feedXML = config;
    this._filters = [];
    const case_sensitive = config.getAttribute("filterCaseSensitive") == "true";
    for (const filter of config.getElementsByTagName("FILTER"))
    {
      this._filters.push(new Filter(filter, case_sensitive));
    }
    //FIXME We only support all/any, why not make it a boolean?
    this._filter_match_all = config.getAttribute("filter") == "all";
  },

  /** See if headline matches filters
   *
   * @param {Headline} headline - headline to match
   * @param {integer} index - the headline number
   *
   * @returns {boolean} true if headline matches filters
   */
  matches_filter(headline, index)
  {
    const match_all = this._filter_match_all;
    let filter_found = false;
    for (const filter of this._filters)
    {
      if (filter.active)
      {
        filter_found = true;

        const match = filter.match(headline, index);
        //If we're matching all and we've found a false match, or vice-versa,
        //return the result now as we have no need to check the rest.
        if (match_all ? ! match : match)
        {
          return match;
        }
      }
    }
    //If we have no filters, we always match. Otherwise we've run through here
    //and everything matched or nothing matched, so return that.
    return filter_found ? match_all : true;
  },

  //----------------------------------------------------------------------------
  isSelected()
  {
    return this.feedXML.getAttribute("selected") == "true";
  },

  //----------------------------------------------------------------------------
  select()
  {
    this.feedXML.setAttribute("selected", "true");
    this._menu_entry.setAttribute("checked", "true");
  },

  //----------------------------------------------------------------------------
  unselect()
  {
    this.feedXML.setAttribute("selected", "false");
    this._menu_entry.setAttribute("checked", "false");
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

  /** Remove a feed from a group
   *
   * This does nothing for normal feeds, but grouped feeds should override it
   * and allow the specified url to be removed from the group
   *
   * unused @param {string} url - url of feed to be removed
   */
  remove_feed(/*url*/)
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

  /** Remove this feed
   *
   * Cleans up all references to the feed
   */
  remove()
  {
    this.deactivate();

    //FIXME I don't see why we do this removal stuff
    this._menu_entry.remove();

    //FIXME These nullifcations aren't actually necessary but leaving them in
    //for now so we can get errors if someone accesses the feed after remove.
    this._menu_entry = null;
    this.feedXML = null;
    this._filters = null;
  },

  //----------------------------------------------------------------------------
  createNewRDFEntry(url, title, receivedDate)
  {
    this.manager.createNewRDFEntry(url, title, receivedDate, this.getUrl());
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
    let idx = 0;
    let counter = 0;
    let posn = pos;
    //This (min(10, length)) is a very questionable interpretation of random
    const count =
      pos == -1 || this.config.headline_bar_cycle_type == "next" ?
        1 :
        Math.floor(Math.random() * Math.min(10, length)) + 1;
    while (idx < count && counter < length)
    {
      counter += 1;
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
      idx += 1;
    }
    return pos;
  }
});
