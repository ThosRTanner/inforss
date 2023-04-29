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
// inforss_Headline
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------

/* jshint globalstrict: true */
/* eslint-disable strict */
"use strict";

/* eslint-disable array-bracket-newline */
/* exported EXPORTED_SYMBOLS */
const EXPORTED_SYMBOLS = [
  "Headline", /* exported Headline */
];
/* eslint-enable array-bracket-newline */

const { complete_assign } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Utils.jsm",
  {}
);

const { console } = Components.utils.import(
  "resource://gre/modules/Console.jsm",
  {}
);

/** This object contains the contents of a displayed headline.
 *
 * @class
 *
 * It sadly has a lot of content, and needs refactoring to hide/expose the
 * correct stuff.
 */
function Headline(
  receivedDate,
  pubDate,
  title,
  guid,
  link,
  description,
  url,
  home,
  category,
  enclosureUrl,
  enclosureType,
  enclosureSize,
  banned,
  readDate,
  feed,
  config)
{
  //FIXME I don't think this is possible any more but need to check nntp code
  //Should probably be done elsewhere anyway.
  if (link == null || link == "")
  {
    console.log("null link, using home page " + home);
    link = home;
  }
  //FIXME Move this to feed handler as it is possible
  if (pubDate == null)
  {
    pubDate = receivedDate;
  }

  this.receivedDate = receivedDate;
  this.publishedDate = pubDate;
  this.title = title;
  this.guid = guid;
  this.link = link;
  this.description = description;
  this._url = url;
  this._home = home;
  this.category = category;
  this.enclosureUrl = enclosureUrl;
  this.enclosureType = enclosureType;
  this.enclosureSize = enclosureSize;
  this._banned = banned;
  this._viewed_date = readDate;
  this._feed = feed;
  this._config = config;

  this._hbox = null;
  /**/this._tooltip = null;
}

complete_assign(Headline.prototype, {

  get url()
  {
    /**/console.log("Getting HL URL", new Error());
    return this._url;
  },

  get home()
  {
    /**/console.log("Getting HL home", new Error());
    return this._home;
  },

  /** get current hbox for this headline
   *
   * @returns {hbox} current hbox for this headline
   */
  get hbox()
  {
    return this._hbox;
  },

  /** set hbox and removes old hbox from dom
   *
   * @param {hbox} hbox - new hbox for headline
   */
  set hbox(hbox)
  {
    if (this._hbox != null)
    {
      this._hbox.remove();
    }
    this._hbox = hbox;
  },

  //FIXME Knock these 2 on the head when refactored.
  /** get current tooltip for this headline
   *
   * @returns {tooltip} current tooltip for this headline
   */
  get tooltip()
  {
    /**/console.log("Getting hl tooltip", new Error())
    return this._tooltip;
  },

  /** set tooltip and removes old tooltip from dom
   *
   * @param {tooltip} tooltip - new tooltip for headline
   */
  set tooltip(tooltip)
  {
    /**/console.log("Setting hl tooltip", new Error())
    if (this._tooltip != null)
    {
      this._tooltip.remove();
    }
    this._tooltip = tooltip;
  },

  /** get current feed for this headline
   *
   * @returns {Feed} The feed from which this headline came.
   */
  get feed()
  {
    return this._feed;
  },

  //----------------------------------------------------------------------------
  getLink()
  {
    return this.link;
  },

  //----------------------------------------------------------------------------
  getTitle()
  {
    return this.title;
  },

  //----------------------------------------------------------------------------
  resetHbox()
  {
    //FIXME does this actually do anything useful as afaics when this is called,
    //it's because we've just sliced something out of the array.
    //in any case neither of those members exist.
    this.hbox = null;
    this.tooltip = null;
  },

  /** Find out if article has been viewed.
   *
   * @returns {boolean} True if article was viewed.
   */
  get viewed()
  {
    return this._viewed_date != null;
  },

  /** Get the date on which the article was viewed.
   *
   * @returns {Date} Date on which article was viewed.
   */
  get readDate()
  {
    return this._viewed_date;
  },

  /** Mark headline as viewed and remember when it was viewed.
   *
   * @returns {Date} Current date (date when viewed).
   */
  set_viewed()
  {
    this._viewed_date = new Date();
    return this._viewed_date;
  },

  /** See if headline is banned forever.
   *
   * @returns {boolean} True if headline is never to be seen again.
   *
   */
  get banned()
  {
    return this._banned;
  },

  /** Ban the headline for ever if not longer. */
  set_banned()
  {
    this._banned = true;
  },

  //-------------------------------------------------------------------------------------------------------------
  isNew()
  {
    return new Date() - this.receivedDate <
            this._config.recent_headline_max_age * 60000;
  },

  //-------------------------------------------------------------------------------------------------------------
  matches(target)
  {
    //FIXME Does the check of the link make sense?
    return this.link == target.link && this.guid == target.guid;
  },

  /** Create a node in the supplied document containing details of headline.
   *
   * @param {Document} doc - Document in which to create node.
   *
   * @returns {Node} New node containing headline details.
   */
  as_node(doc)
  {
    const headline = doc.createElement("headline");
    for (const attrib of Object.keys(this))
    {
      const value = this[attrib];
      if (typeof value != "function" &&
          typeof value != "object" &&
          value !== null)
      {
        headline.setAttribute(attrib, value);
      }
    }
    return headline;
  },

});
