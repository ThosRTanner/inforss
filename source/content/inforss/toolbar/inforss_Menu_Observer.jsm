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
// inforss_Menu_Observer
// Author : Tom Tanner 2018
//------------------------------------------------------------------------------
/* jshint globalstrict: true */
/* eslint-disable strict */
"use strict";

/* eslint-disable array-bracket-newline */
/* exported EXPORTED_SYMBOLS */
const EXPORTED_SYMBOLS = [
  "Menu_Observer", /* exported Menu_Observer */
];
/* eslint-enable array-bracket-newline */

const { MIME_feed_type, MIME_feed_url } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Constants.jsm",
  {}
);

const { option_window_displayed } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Utils.jsm",
  {}
);

const mediator = {};
Components.utils.import(
  "chrome://inforss/content/mediator/inforss_Mediator_API.jsm",
  mediator);

//const { console } =
//  Components.utils.import("resource://gre/modules/Console.jsm", {});

/** menu observer class. Just for clicks on the feed menu
 *
 * @class
 *
 * @param {Mediator} mediator_ - mediator between the worlds
 * @param {Config} config - extension configuration
 * @param {document} document - the DOM
 */
function Menu_Observer(mediator_, config, document)
{
  this._mediator = mediator_;
  this._config = config;

  this.on_drag_start = this._on_drag_start.bind(this);
  this.on_drag_over = this._on_drag_over.bind(this);
  this.on_drop = this._on_drop.bind(this);

  this._on_drag_over_trash = this.__on_drag_over_trash.bind(this);
  this._on_drop_on_trash = this.__on_drop_on_trash.bind(this);

  this._trash = document.getElementById("inforss.menu.trash");
  this._trash.addEventListener("dragover", this._on_drag_over_trash);
  this._trash.addEventListener("drop", this._on_drop_on_trash);
}

Menu_Observer.prototype = {

  /** Clean up on shutdown, deregister any event handlers */
  dispose()
  {
    this._trash.removeEventListener("dragover", this._on_drag_over_trash);
    this._trash.removeEventListener("drop", this._on_drop_on_trash);
  },

  /** Handle drag start on menu element
   *
   * @param {DragEvent} event - drag start
   */
  _on_drag_start(event)
  {
    const target = event.target;
    const data = event.dataTransfer;
    const url = target.getAttribute("url");
    if (target.hasAttribute("image"))
    {
      //This isn't a submenu popout, so add the feed url and the type
      data.setData(MIME_feed_url, url);
      data.setData(MIME_feed_type, target.getAttribute("inforsstype"));
    }
    data.setData("text/uri-list", url);
    data.setData("text/unicode", url);
  },

  /** Handle drag of menu element
   *
   * @param {DragEvent} event - drag
   */
  _on_drag_over(event)
  {
    if (event.dataTransfer.types.includes(MIME_feed_type) &&
        ! option_window_displayed())
    {
      //It's a feed/group
      if (event.dataTransfer.getData(MIME_feed_type) != "group")
      {
        //It's not a group. Allow it to be moved/copied
        event.dataTransfer.dropEffect =
          this._config.menu_show_feeds_from_groups ? "copy" : "move";
        event.preventDefault();
      }
    }
  },

  /** Handle drop of menu element
   *
   * @param {DragEvent} event - drop onto headline bar (?)
   */
  _on_drop(event)
  {
    const source_url = event.dataTransfer.getData(MIME_feed_url);
    const source_rss = this._config.get_item_from_url(source_url);
    const dest_url = event.target.getAttribute("url");
    const dest_rss = this._config.get_item_from_url(dest_url);
    if (source_rss != null && dest_rss != null)
    {
      const info = this._mediator.locateFeed(dest_url).info;
      if (! info.containsFeed(source_url))
      {
        info.addNewFeed(source_url);
        mediator.reload();
      }
    }
    event.stopPropagation();
  },

  /** Handle a drag over the trash icon on the popup menu
   *
   * @param {DragEvent} event - the event
   */
  __on_drag_over_trash(event)
  {
    if (event.dataTransfer.types.includes(MIME_feed_url) &&
        ! option_window_displayed())
    {
      event.dataTransfer.dropEffect = "move";
      event.preventDefault();
    }
  },

  /** Handle a drop on the trash icon on the popup menu - delete the feeds
   *
   * @param {DragEvent} event - the event
   */
  __on_drop_on_trash(event)
  {
    const feeds = event.dataTransfer.getData('text/uri-list').split('\r\n');
    for (let feed of feeds)
    {
      this._config.remove_feed(feed);
    }
    this._config.save();
    mediator.remove_feeds(feeds);
    event.stopPropagation();
  }

};
