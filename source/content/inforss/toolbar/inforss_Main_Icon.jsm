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

const { /*MIME_feed_type, */ MIME_feed_url } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Constants.jsm", {}
);

const { log_exception } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Debug.jsm", {}
);

const { alert } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Prompt.jsm", {}
);

const { Sleeper } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Sleeper.jsm", {}
);

const {
  add_event_listeners,
  format_as_hh_mm_ss,
  open_option_window,
  option_window_displayed,
  remove_event_listeners,
  replace_without_children
} = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Utils.jsm", {}
);

const { get_string } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Version.jsm", {}
);

const { Main_Menu } = Components.utils.import(
  "chrome://inforss/content/toolbar/inforss_Main_Menu.jsm", {}
);

const mediator = {};
Components.utils.import(
  "chrome://inforss/content/mediator/inforss_Mediator_API.jsm", mediator
);

const { console } = Components.utils.import(
  "resource://gre/modules/Console.jsm", {}
);

/* globals URL */
Components.utils.importGlobalProperties([ "URL" ]);

//Flashing interval in milliseconds
const FLASH_DURATION = 100;
//Fade increment. Make sure this a negative power of 2.
const FADE_RATE = -0.5;

/** Class which controls the main popup menu on the headline bar.
 *
 * @class
 *
 * @param {Feed_Manager} feed_manager - Fetches feed headlines.
 * @param {Config} config - Main configuration.
 * @param {Document} document - The main DOM document.
 */
function Main_Icon(feed_manager, config, document)
{
  this._feed_manager = feed_manager;
  this._config = config;
  this._document = document;

  this._main_menu = new Main_Menu(feed_manager, config, document, this);

  this._icon_tooltip = document.getElementById("inforss.mainicon.tooltip");

  this._tooltip_enabled = true;

  //Get the icon so we can flash it or change it
  this._icon = document.getElementById("inforss-icon");
  this._icon_pic = null;

  //Set up handlers
  /* eslint-disable array-bracket-newline */
  this._listeners = add_event_listeners(
    this,
    null,
    [ this._document.defaultView, "aftercustomization", this._after_customise ],
    [ this._icon_tooltip, "popupshowing", this._show_tooltip ],
    [ this._icon, "dragover", this._on_drag_over ],
    [ this._icon, "mousedown", this._on_mouse_down ],
    [ this._icon, "drop", this._on_drop ]
  );
  /* eslint-enable array-bracket-newline */

  this._flash_timer = new Sleeper();
  this._selected_feed = null;

  Object.seal(this);
}

Main_Icon.prototype = {

  /** Reinitialise after config load. */
  config_changed()
  {
    //the call to position the bar in the headline bar initialisation can
    //change what getAnonymousNodes returns, so pick up the icon element here.
    this._set_icon_pic();
    this.show_no_feed_activity();
    this._main_menu.config_changed();
  },

  /** Clean up event handlers on window close etc. */
  dispose()
  {
    this._clear_flash_timeout();
    this._main_menu.dispose();
    remove_event_listeners(this._listeners);
  },

  /** Disable the tooltip display. Used by main menu handler. */
  disable_tooltip_display()
  {
    this._tooltip_enabled = false;
  },

  /** Enable the tooltip display. Used by main menu handler. */
  enable_tooltip_display()
  {
    this._tooltip_enabled = true;
  },

  /** Handle customisation event.
   *
   * Configuring changes the location of the icon pic, so we need to refind it
   * and update. (NB It's actually starting customisation does that, but I think
   * it looks nicer to leave it till we've finished).
   *
   * @param {aftercustomisation} _event - User has completed customisation.
   */
  _after_customise(_event)
  {
    const old_src = this._icon_pic.getAttribute("src");
    this._set_icon_pic();
    this._icon_pic.src = old_src;
  },

  /** Handle a drag over the main icon, allowing feed-urls to be added by (e.g.)
   * dragging and dropping the RSS feed icon from the web page.
   *
   * Due to the somewhat arcane nature of the way things work, we also get drag
   * events from the menu we pop up from here, so we check if we're dragging
   * onto the right place.
   *
   * @param {DragEvent} event - The drag event.
   */
  _on_drag_over(event)
  {
    if (option_window_displayed() ||
        event.target.id != "inforss-icon" ||
        event.dataTransfer.types.includes(MIME_feed_url))
    {
      return;
    }
    //TODO support text/uri-list?
    if (event.dataTransfer.types.includes("text/plain"))
    {
      event.dataTransfer.dropEffect = "copy";
      event.preventDefault();
    }
  },

  /** Handle a click on the main icon. We're only interested in right clicks,
   * which cause the option window to be opened.
   *
   * @param {MouseEvent} event - Click info.
   */
  _on_mouse_down(event)
  {
    if (event.button == 2 && event.target.localName == "statusbarpanel")
    {
      open_option_window(this._document.defaultView);
    }
  },

  /** Handle dropping a URL onto the main icon.
   *
   * @param {DropEvent} event - The drop event.
   */
  _on_drop(event)
  {
    event.stopPropagation();
    let url = event.dataTransfer.getData("text/plain");
    if (url.includes("\n"))
    {
      url = url.substring(0, url.indexOf("\n"));
    }
    //Moderately horrible construction which basically sees if the URL is
    //one I can deal with.
    try
    {
      url = new URL(url); //This can throw
      //FIXME This check is made in clipboard handing. And if we implemented
      //news fetch protocol we'd want to add news: in both places. So abstract
      //the check.
      if (url.protocol != "http:" &&
          url.protocol != "https:" &&
          url.protocol != "file:")
      {
        throw new Error(get_string("malformedUrl"));
      }
    }
    catch (err)
    {
      console.log(err);
      alert(err.message);
      return;
    }
    this._feed_manager.add_feed_from_url(url.href);
  },

  /** Set up the icon pic details, so the main icon actually displays what
   *  we want it to.
   */
  _set_icon_pic()
  {
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
  },

  /** Showing tooltip on main menu icon. This just consists of a summary of
   * the current feed state.
   *
   * @param {PopupEvent} event - Event to handle.
   */
  _show_tooltip(event)
  {
    if (! this._tooltip_enabled)
    {
      event.preventDefault();
      return;
    }

    const rows = replace_without_children(
      this._icon_tooltip.firstChild.childNodes[1]
    );
    if (this._selected_feed == null)
    {
      //This shouldn't happen unless you've deleted all your feeds
      const label = this._document.createElement("label");
      label.setAttribute("value", "No info");
      const row = this._document.createElement("row");
      row.append(label);
      rows.append(row);
    }
    else
    {
      const add_row = (desc, value) =>
      {
        const row = this._document.createElement("row");
        let label = this._document.createElement("label");
        label.setAttribute("value", get_string(desc) + " : ");
        label.style.width = "70px";
        row.append(label);
        label = this._document.createElement("label");
        label.setAttribute("value", value);
        label.style.color = "blue";
        row.append(label);
        rows.append(row);
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

      add_row("report.nbheadlines", feed.num_headlines);
      add_row("report.nbunreadheadlines", feed.num_unread_headlines);
      add_row("report.nbnewheadlines", feed.num_new_headlines);
    }
  },

  /** Add a feed to the main popup menu and returns the added item.
   *
   * @param {RSS} rss - The feed definition.
   *
   * @returns {menu} Menu item.
   */
  add_feed_to_menu(rss)
  {
    return this._main_menu.add_feed_to_menu(rss);
  },

  /** Sets the currently selected feed.
   *
   * Remembers the feed and updates the menu icon to the feed icon if
   * required.
   *
   * @param {Feed} feed - Selected feed.
   */
  show_selected_feed(feed)
  {
    this._selected_feed = feed;
    this._show_feed_icon(feed);
  },

  /** Show the icon for the supplied feed (if enabled).
   *
   * Depending on configuration, might show the default icon.
   *
   * @param {Feed} feed - Feed for which the icon is to be displayed.
   */
  _show_feed_icon(feed)
  {
    this._set_icon(
      this._config.icon_shows_current_feed && feed !== null ?
        feed.getIcon() : "chrome://inforss/skin/inforss.png"
    );
    this._clear_flash_timeout();
  },

  /** Show that there is data is being fetched for a feed.
   *
   * Updates the menu icon to the feed icon if required.
   * Starts flashing the menu icon if required.
   *
   * @param {Feed} feed - Feed for which the icon should be displayed.
   */
  show_feed_activity(feed)
  {
    this._show_feed_icon(feed);
    if (this._config.icon_flashes_on_activity)
    {
      this._flash_icon();
    }
  },

  /** Show that there is no data is being fetched for a feed.
   *
   * Stops any flashing and reselects the appropriate main icon.
   *
   */
  show_no_feed_activity()
  {
    this._clear_flash_timeout();
    this._show_feed_icon(this._selected_feed);
  },

  /** Clears the currently selected feed and removes any activity. */
  clear_selected_feed()
  {
    this._selected_feed = null;
    this.show_no_feed_activity();
  },

  /** Flashes the main icon.
   *
   * This is done be making this more and more transparent until it is
   * completely invisible and then reversing the process.
   */
  async _flash_icon()
  {
    try
    {
      let opacity = 1;
      let opacity_change = FADE_RATE;
      for (;;)
      {
        //eslint-disable-next-line no-await-in-loop
        await this._flash_timer.sleep(FLASH_DURATION);
        opacity += opacity_change;
        if (opacity < 0 || opacity > 1)
        {
          opacity_change = -opacity_change;
          opacity += opacity_change;
        }
        this._set_icon_opacity(opacity);
      }
    }
    catch (err)
    {
      log_exception(err);
    }
  },

  /** Remove any flash timer. */
  _clear_flash_timeout()
  {
    this._flash_timer.abort();
    this._set_icon_opacity(1);
  },

  /** Set the main icon opacity during flashing.
   *
   * @param {number} opacity - To which to set main icon.
   */
  _set_icon_opacity(opacity)
  {
    this._icon_pic.style.opacity = opacity;
  },

  /** Set the main icon - scaled to 16 * 16.
   *
   * @param {string} icon - URL for icon to display.
   */
  _set_icon(icon)
  {
    this._icon_pic.setAttribute("src", icon);
  }
};
