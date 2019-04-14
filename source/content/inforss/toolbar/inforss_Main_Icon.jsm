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
// inforss_Main_Icon
// Author : Tom Tanner 2018
//------------------------------------------------------------------------------
/* jshint globalstrict: true */
/* eslint-disable strict */
"use strict";

/* eslint-disable array-bracket-newline */
/* exported EXPORTED_SYMBOLS */
const EXPORTED_SYMBOLS = [
  "Main_Icon", /* exported Main_Icon */
];
/* eslint-enable array-bracket-newline */

const { clearTimeout, setTimeout } = Components.utils.import(
  "resource://gre/modules/Timer.jsm",
  {}
);

const { /*MIME_feed_type, */ MIME_feed_url } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Constants.jsm",
  {}
);

const { debug } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Debug.jsm",
  {}
);

const { alert } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Prompt.jsm",
  {}
);

const {
  format_as_hh_mm_ss,
  open_option_window,
  option_window_displayed,
  replace_without_children
} = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Utils.jsm",
  {}
);

const { get_string } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Version.jsm",
  {}
);

const { Main_Menu } = Components.utils.import(
  "chrome://inforss/content/toolbar/inforss_Main_Menu.jsm",
  {});

const mediator = {};
Components.utils.import(
  "chrome://inforss/content/mediator/inforss_Mediator_API.jsm",
  mediator);

const { console } =
  Components.utils.import("resource://gre/modules/Console.jsm", {});

/* globals URL */
Components.utils.importGlobalProperties(['URL']);

//Flashing interval in milliseconds
const FLASH_DURATION = 100;
//Fade increment. Make sure this a negative power of 2.
const FADE_RATE = -0.5;

/** Class which controls the main popup menu on the headline bar
 *
 * @class
 *
 * @param {Feed_Manager} feed_manager - fetches feed headlines
 * @param {Config} config - main configuration
 * @param {Object} document - the main DOM document
 */
function Main_Icon(feed_manager, config, document)
{
  this._feed_manager = feed_manager;
  this._config = config;
  this._document = document;

  this._main_menu = new Main_Menu(feed_manager, config, document, this);

  this._icon_tooltip = document.getElementById("inforss.popup.mainicon");

  this._tooltip_enabled = true;

  //Set up handlers
  this._show_tooltip = this.__show_tooltip.bind(this);
  this._icon_tooltip.addEventListener("popupshowing", this._show_tooltip);

  //Get the icon so we can flash it or change it
  this._icon = document.getElementById('inforss-icon');
  this._icon_pic = null;

  this._on_drag_over = this.__on_drag_over.bind(this);
  this._icon.addEventListener("dragover", this._on_drag_over);
  this._on_mouse_down = this.__on_mouse_down.bind(this);
  this._icon.addEventListener("mousedown", this._on_mouse_down);

  this._on_drop = this.__on_drop.bind(this);
  this._icon.addEventListener("drop", this._on_drop);

  //Timeout ID for activity flasher
  this._flash_timeout = null;
  this._opacity_change = FADE_RATE;

  //No feed selected
  this._selected_feed = null;

  //Promise processor
  this._new_feed_request = null;
}

Main_Icon.prototype = {

  /** reinitialise after config load */
  init()
  {
    //the call to position the bar in the headline bar initialisation can
    //change what getAnonymousNodes returns, so pick up the icon element here.
    this._icon_pic = this._document.getAnonymousNodes(this._icon)[0];
    //Set the scaling so it matches what is in the scrolling bar
    //Note: This may be wrong in linux and macos-x
    this._icon_pic.style.paddingTop = "2px";
    this._icon_pic.style.paddingBottom = "1px";
    this._icon_pic.style.paddingLeft = "1px";
    this._icon_pic.style.paddingRight = "2px";
    this._icon_pic.style.maxWidth = "19px";
    this._icon_pic.style.maxHeight = "19px";
    this._icon_pic.style.minWidth = "19px";
    this._icon_pic.style.minHeight = "19px";
    this.show_no_feed_activity();
    this._main_menu.init();
  },

  /** clean up event handlers on window close etc */
  dispose()
  {
    this._main_menu.dispose();
    this._icon_tooltip.removeEventListener("popupshowing", this._show_tooltip);
    this._icon.removeEventListener("dragover", this._on_drag_over);
    this._icon.removeEventListener("mousedown", this._on_mouse_down);
    this._icon.removeEventListener("drop", this._on_drop);
    if (this._new_feed_request != null)
    {
      console.log("Aborting new feed request", this._new_feed_request);
      this._new_feed_request.abort();
    }
  },

  /** disable the tooltip display. Used by main menu handler */
  disable_tooltip_display()
  {
    this._tooltip_enabled = false;
  },

  /** enable the tooltip display. Used by main menu handler */
  enable_tooltip_display()
  {
    this._tooltip_enabled = true;
  },

  /** Handle a drag over the main icon, allowing feed-urls to be added by (e.g.)
   * dragging and dropping the RSS feed icon from the web page.
   *
   * Due to the somewhat arcane nature of the way things work, we also get drag
   * events from the menu we pop up from here, so we check if we're dragging
   * onto the right place.
   *
   * @param {DragEvent} event - the drag event
   */
  __on_drag_over(event)
  {
    try
    {
      if (option_window_displayed() ||
          this._new_feed_request != null ||
          event.target.id != "inforss-icon" ||
          event.dataTransfer.types.includes(MIME_feed_url))
      {
        return;
      }
      //TODO support text/uri-list?
      if (event.dataTransfer.types.includes('text/plain'))
      {
        event.dataTransfer.dropEffect = "copy";
        event.preventDefault();
      }
    }
    catch (err)
    {
      debug(err);
    }
  },

  /** Handle a click on the main icon. We're only interested in right clicks,
   * which cause the option window to be opened
   *
   * @param {MouseDownEvent} event - click info
   */
  __on_mouse_down(event)
  {
    try
    {
      if (event.button == 2 && event.target.localName == "statusbarpanel")
      {
        open_option_window();
      }
    }
    catch (err)
    {
      debug(err);
    }
  },

  /** Handle dropping a URL onto the main icon
   *
   * @param {DropEvent} event - the drop event
   */
  __on_drop(event)
  {
    try
    {
      let url = event.dataTransfer.getData('text/plain');
      if (url.includes("\n"))
      {
        url = url.substring(0, url.indexOf("\n"));
      }
      //Moderately horrible construction which basically sees if the URL is
      //one I can deal with.
      //FIXME This check is made in clipboard handing. And if we implemented
      //news fetch protocol we'd want to add news: in both places. So abstract
      //the check.
      url = new URL(url);
      if (url.protocol != "http:" &&
          url.protocol != "https:" &&
          url.protocol != "file:")
      {
        throw new Error(get_string("malformedUrl"));
      }
      this._feed_manager.add_feed_from_url(url.href);
    }
    catch (err)
    {
      alert(err.message);
      console.log(err);
    }
    finally
    {
      event.stopPropagation();
    }
  },

  /** Showing tooltip on main menu icon. this just consists of a summary of
   * the current feed state
   *
   * @param {PopupEvent} event - event to handle
   */
  __show_tooltip(event)
  {
    if (! this._tooltip_enabled)
    {
      event.preventDefault();
      return;
    }

    try
    {
      const rows = replace_without_children(
        this._icon_tooltip.firstChild.childNodes[1]
      );
      if (this._selected_feed == null)
      {
        //This shouldn't happen unless you've deleted all your feeds
        const label = this._document.createElement("label");
        label.setAttribute("value", "No info");
        const row = this._document.createElement("row");
        row.appendChild(label);
        rows.appendChild(row);
      }
      else
      {
        const add_row = (desc, value) =>
        {
          const row = this._document.createElement("row");
          let label = this._document.createElement("label");
          label.setAttribute("value", get_string(desc) + " : ");
          label.style.width = "70px";
          row.appendChild(label);
          label = this._document.createElement("label");
          label.setAttribute("value", value);
          label.style.color = "blue";
          row.appendChild(label);
          rows.appendChild(row);
        };

        const feed = this._selected_feed;

        add_row("title", feed.getTitle());

        if (feed.getType() != "group")
        {
          add_row("url", feed.getUrl());
          add_row("link", feed.getLinkAddress());
          add_row("feed.lastrefresh",
                  feed.lastRefresh == null ?
                    "" :
                    format_as_hh_mm_ss(feed.lastRefresh));

          add_row("feed.nextrefresh",
                  feed.next_refresh == null ?
                    "" :
                    format_as_hh_mm_ss(feed.next_refresh));
        }

        add_row("report.nbheadlines", feed.getNbHeadlines());
        add_row("report.nbunreadheadlines", feed.getNbUnread());
        add_row("report.nbnewheadlines", feed.getNbNew());
      }
    }
    catch (err)
    {
      debug(err);
    }
  },

  /** Add a feed to the main popup menu and returns the added item
   *
   * @param {Element} rss - the feed definition
   *
   * @returns {Element} menu item
   */
  add_feed_to_menu(rss)
  {
    return this._main_menu.add_feed_to_menu(rss);
  },

  /** Sets the currently selected feed
   *
   * Remembers the feed and updates the menu icon to the feed icon if
   * required.
   *
   * @param {Feed} feed - selected feed
   */
  show_selected_feed(feed)
  {
    this._selected_feed = feed;
    if (this._config.icon_shows_current_feed)
    {
      this._set_icon(feed.getIcon());
    }
    else
    {
      this._set_icon("chrome://inforss/skin/inforss.png");
    }
  },

  /** Show that there is data is being fetched for a feed
   *
   * Updates the menu icon to the feed icon if required.
   * Starts flashing the menu icon if required.
   *
   * @param {Feed} feed - selected feed
   */
  show_feed_activity(feed)
  {
    if (this._config.icon_shows_current_feed)
    {
      this._set_icon(feed.getIcon());
    }
    if (this._config.icon_flashes_on_activity)
    {
      this._start_flash_timeout();
    }
  },

  /** Show that there is no data is being fetched for a feed
   *
   * Stops any flashing and reselects the appropriate main icon.
   *
   */
  show_no_feed_activity()
  {
    if (this._flash_timeout != null)
    {
      this._clear_flash_timeout();
      this._flash_timeout = null;
      this._set_icon_opacity(1);
    }
    if (this._selected_feed != null)
    {
      this._set_icon(this._selected_feed.getIcon());
    }
  },

  /** clears the currently selected feed and removes any activity */
  clear_selected_feed()
  {
    this._selected_feed = null;
    this.show_no_feed_activity();
  },

  /** Start flashing the main icon
   *
   * Delete any current timeout
   */
  _start_flash_timeout()
  {
    this._clear_flash_timeout();
    this._flash_timeout = setTimeout(this._flash.bind(this), FLASH_DURATION);
  },

  /** Remove any flash timer */
  _clear_flash_timeout()
  {
    clearTimeout(this._flash_timeout);
  },

  /** Actually flash the icon.
   *
   * This is done be making this more and more transparent until it is
   * completely invisible and then reversing the process.
   */
  _flash()
  {
    try
    {
      let opacity = this._icon_pic.style.opacity;
      if (opacity == "")
      {
        opacity = 1;
        this._opacity_change = FADE_RATE;
      }
      else
      {
        opacity = parseInt(opacity, 10) + this._opacity_change;
        if (opacity < 0 || opacity > 1)
        {
          this._opacity_change = -this._opacity_change;
          opacity += this._opacity_change;
        }
      }
      this._set_icon_opacity(opacity);
      this._start_flash_timeout();
    }
    catch (err)
    {
      debug(err);
    }
  },

  /** Set the main icon opacity during flashing
   *
   * @param {int} opacity - to which to set main icon
   */
  _set_icon_opacity(opacity)
  {
    this._icon_pic.style.opacity = opacity;
  },

  /** Set the main icon - scaled to 16 * 16
   *
   * @param {string} icon - url for icon to display
   */
  _set_icon(icon)
  {
    this._icon_pic.setAttribute("src", icon);
  }
};
