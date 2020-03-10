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

const { Downloads } = Components.utils.import(
  "resource://gre/modules/Downloads.jsm",
  {}
);

const { complete_assign, event_binder, make_URI } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Utils.jsm",
  {}
);

const { setTimeout } = Components.utils.import(
  "resource://gre/modules/Timer.jsm",
  {}
);

const { console } = Components.utils.import(
  "resource://gre/modules/Console.jsm",
  {}
);

const LocalFile = Components.Constructor("@mozilla.org/file/local;1",
                                         "nsILocalFile",
                                         "initWithPath");

/** This maintains a queue of podcasts to download. */
const podcastArray = [];
let downloadTimeout = null;

function download_next_podcast()
{
  if (podcastArray.length != 0)
  {
    const headline = podcastArray.shift();
    downloadTimeout = setTimeout(event_binder(headline.save_podcast, headline),
                                 2000);
  }
  else
  {
    downloadTimeout = null;
  }
}

/** This object contains the contents of a displayed headline
 * @class
 * It sadly has a lot of content..
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
  feed,
  config)
{
  //FIXME I don't think this is possible any more but need to check nntp code
  if (link == null || link == "")
  {
    console.log("null link, using home page " + home);
    link = home;
  }
  //FIXME I don't think this is possible though need to check nntp code
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
  this.url = url;
  this.home = home;
  this.category = category;
  this.enclosureUrl = enclosureUrl;
  this.enclosureType = enclosureType;
  this.enclosureSize = enclosureSize;
  this._feed = feed;
  this.config = config;

  this.readDate = null;
  this._hbox = null;
  this._tooltip = null;
  this.viewed = false;
  this.banned = false;
  this.podcast = null;

  if (this.config.remember_headlines)
  {
    if (feed.exists(link, title, feed.getBrowserHistory()))
    {
      //Get dates and status from cache
      const oldReceivedDate = feed.getAttribute(link, title, "receivedDate");
      if (oldReceivedDate != null)
      {
        this.receivedDate = new Date(oldReceivedDate);
      }

      const oldReadDate = feed.getAttribute(link, title, "readDate");
      //FIXME Why check against ""?
      if (oldReadDate != null && oldReadDate != "")
      {
        this.readDate = new Date(oldReadDate);
      }

      const oldViewed = feed.getAttribute(link, title, "viewed");
      if (oldViewed != null)
      {
        this.viewed = oldViewed == "true";
      }

      const oldBanned = feed.getAttribute(link, title, "banned");
      if (oldBanned != null)
      {
        this.banned = oldBanned == "true";
      }
    }
    else
    {
      feed.createNewRDFEntry(link, title, receivedDate);
    }

    //Download podcast if we haven't already.
    //FIXME why can the URL be null-or-blank
    if (enclosureUrl != null && enclosureUrl != "" && enclosureType != null &&
        (feed.getAttribute(link, title, "savedPodcast") == null ||
         feed.getAttribute(link, title, "savedPodcast") == "false") &&
        feed.getSavePodcastLocation() != "")
    {
      podcastArray.push(this);
      if (downloadTimeout == null)
      {
        download_next_podcast();
      }
    }
  }
}

complete_assign(Headline.prototype, {

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

  /** get current tooltip for this headline
   *
   * @returns {tooltip} current tooltip for this headline
   */
  get tooltip()
  {
    return this._tooltip;
  },

  /** set tooltip and removes old tooltip from dom
   *
   * @param {tooltip} tooltip - new tooltip for headline
   */
  set tooltip(tooltip)
  {
    if (this._tooltip != null)
    {
      this._tooltip.remove();
    }
    this._tooltip = tooltip;
  },

  /** get current feed for this headline
   *
   * @returns {Feed} current tooltip for this headline
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
    this.hbox = null;
    this.tooltip = null;
  },

  //----------------------------------------------------------------------------
  //Save podcast. This is kicked off on a timeout and done one at a time.
  save_podcast()
  {
    console.log("Saving prodcast " + this.enclosureUrl);
    const uri = make_URI(this.enclosureUrl);
    const url = uri.QueryInterface(Components.interfaces.nsIURL);
    const file = new LocalFile(this._feed.getSavePodcastLocation());
    file.append(url.fileName);
    Downloads.fetch(uri, file).then(() => this.podcast_saved())
                              .catch(err => this.podcast_not_saved(err))
                              .then(() => download_next_podcast());
  },

  //----------------------------------------------------------------------------
  //podcast was saved. log it and go to the next one
  podcast_saved()
  {
    console.log("Saved prodcast " + this.enclosureUrl);
    this._feed.setAttribute(this.link, this.title, "savedPodcast", "true");
  },

  //----------------------------------------------------------------------------
  //podcast was not saved. log the fact and go to the next one
  podcast_not_saved(err)
  {
    console.log("Failed to save prodcast " + this.enclosureUrl, err);
  },

  //-------------------------------------------------------------------------------------------------------------
  setViewed()
  {
    this.viewed = true;
    this.readDate = new Date();
    this._feed.setAttribute(this.link, this.title, "viewed", "true");
    this._feed.setAttribute(this.link, this.title, "readDate", this.readDate);
  },

  //-------------------------------------------------------------------------------------------------------------
  setBanned()
  {
    this.banned = true;
    this._feed.setAttribute(this.link, this.title, "banned", "true");
  },

  //-------------------------------------------------------------------------------------------------------------
  isNew()
  {
    return new Date() - this.receivedDate <
            this.config.recent_headline_max_age * 60000;
  },

  //-------------------------------------------------------------------------------------------------------------
  matches(target)
  {
    //FIXME Does the check of the link make sense?
    return this.link == target.link && this.guid == target.guid;
  },

  /** Add headline to xml document
   *
   * @param {XMLDocument} doc - Document in which to create node
   *
   * @returns {Node} new node containing headline details
   */
  as_node(doc)
  {
    const headline = doc.createElement("headline");
    for (const attrib of Object.keys(this))
    {
      if (typeof this[attrib] != "function" &&
          typeof this[attrib] != "object" &&
          this[attrib] !== null)
      {
        headline.setAttribute(attrib, this[attrib]);
      }
    }
    return headline;
  },

});
