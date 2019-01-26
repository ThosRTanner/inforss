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

const { debug } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Debug.jsm",
  {}
);

const { clearTimeout, setTimeout } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Timeout.jsm",
  {}
);

const {
  format_as_hh_mm_ss,
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

const { Menu_Observer } = Components.utils.import(
  "chrome://inforss/content/toolbar/inforss_Menu_Observer.jsm",
  {});

const AnnotationService = Components.classes[
  "@mozilla.org/browser/annotation-service;1"].getService(
  Components.interfaces.nsIAnnotationService);

const BookmarkService = Components.classes[
  "@mozilla.org/browser/nav-bookmarks-service;1"].getService(
  Components.interfaces.nsINavBookmarksService);

const Clipboard_Service = Components.classes[
  "@mozilla.org/widget/clipboard;1"].getService(
  Components.interfaces.nsIClipboard);

const Transferable = Components.Constructor(
  "@mozilla.org/widget/transferable;1",
  Components.interfaces.nsITransferable);

//const { console } =
//  Components.utils.import("resource://gre/modules/Console.jsm", {});

//Flashing interval in milliseconds
const FLASH_DURATION = 100;
//Fade increment. Make sure this a negative power of 2.
const FADE_RATE = -0.5;

/** Class which controls the main popup menu on the headline bar
 * @class
 *
 * @param {Mediator} mediator_ - communication between headline bar parts
 * @param {XML_Repository} config - main configuration
 * @param {object} document - the main DOM document
 */
function Main_Icon(mediator_, config, document)
{
  this._config = config;
  this._mediator = mediator_;
  this._document = document;

  this._menu_observer = new Menu_Observer(mediator_, config);

  this._menu = document.getElementById("inforss-menupopup");
  this._icon_tooltip = document.getElementById("inforss.popup.mainicon");

  this._tooltip_enabled = true;

  //Set up handlers
  this._menu_showing = this.__menu_showing.bind(this);
  this._menu.addEventListener("popupshowing", this._menu_showing);
  this._menu_hiding = this.__menu_hiding.bind(this);
  this._menu.addEventListener("popuphiding", this._menu_hiding);

  this._show_tooltip = this.__show_tooltip.bind(this);
  this._icon_tooltip.addEventListener("popupshowing", this._show_tooltip);

  this._selected_feed = null;

  //Get the icon so we can flash it or change it
  this._icon = document.getElementById('inforss-icon');
  this._icon_pic = null;

  //Timeout ID for activity flasher
  this._flash_timeout = null;
  this._opacity_change = FADE_RATE;
}

Main_Icon.prototype = {

  /** reinitialise after config load */
  init()
  {
    //the call to position the bar in the headline bar initialisation can
    //change what getAnonymousNodes returns, so pick up the icon element here.
    this._icon_pic = this._document.getAnonymousNodes(this._icon)[0];
    this.show_no_feed_activity();
    this._clear_menu();
  },

  /** Remove all entries from the popup menu apart from the trash and
   *  separator items
   */
  _clear_menu()
  {
    //Clear non feed items so we get only 1 separator
    this._clear_added_menu_items();
    //Then remove everything after it.
    let child = this._menu.getElementsByTagName("menuseparator")[0].nextSibling;
    while (child != null)
    {
      const nextChild = child.nextSibling;
      this._menu.removeChild(child);
      child = nextChild;
    }
  },

  /** Remove all the non feed related items from the popup menu */
  _clear_added_menu_items()
  {
    const separators = this._menu.getElementsByTagName("menuseparator");
    if (separators.length > 1)
    {
      //Remove all the added items and the added separator. Note that separators
      //is a live list so I have to remember the end as the first deletion will
      //change the value of separators.
      let child = separators[0];
      const end = separators[1];
      while (child != end)
      {
        const nextChild = child.nextSibling;
        this._menu.removeChild(child);
        child = nextChild;
      }
    }
  },

  /** Handle popupshowing event
   * Disables tooltip popup and shows menu
   *
   * @param {PopupEvent} event - event to handle
   */
  __menu_showing(event)
  {
    this._tooltip_enabled = false;
    try
    {
      if (event.button != 0 || event.ctrlKey)
      {
        //Ignore if not a left click
        event.preventDefault();
        return;
      }

      //Set the trash icon state.
      {
        const trash = this._menu.childNodes[0];
        trash.setAttribute(
          "disabled",
          option_window_displayed() ? "true" : "false"
        );
      }
      this._clear_added_menu_items();
      if (event.target == this._menu)
      {
        this._create_submenus();
      }

      //Add in the optional items
      let nb = this._add_page_feeds();

      //If there's a feed (or at least a URL) in the clipboard, add that
      nb = this._add_clipboard(nb);

      //Add livemarks
      this._add_livemarks(nb);
    }
    catch (e)
    {
      debug(e);
    }
  },

  /** Adds any feeds found on the page
   *
   * This relies on a completely undocumented property (feeds) of the current
   * page.
   *
   * @returns {integer} number of added entries
   */
  _add_page_feeds()
  {
    let entries = 0;
    if (this._config.menu_includes_page_feeds)
    {
      const browser = this._document.defaultView.gBrowser.selectedBrowser;
      if ('feeds' in browser && browser.feeds != null)
      {
        //Sadly the feeds array seems to end up with dupes, so make it a set.
        for (let feed of new Set(browser.feeds))
        {
          if (this._add_menu_item(entries, feed.href, feed.title))
          {
            ++entries;
          }
        }
      }
    }
    return entries;
  },

  /** Adds the clipboard contents if a URL
   *
   * @param {integer} entries - number of entries in the menu
   *
   * @returns {integer} new number of entries
   */
  _add_clipboard(entries)
  {
    if (this._config.menu_includes_clipboard)
    {
      //FIXME Badly written (shouldn't need try/catch)
      const xferable = new Transferable();
      xferable.addDataFlavor("text/unicode");
      try
      {
        Clipboard_Service.getData(
          xferable,
          Components.interfaces.nsIClipboard.kGlobalClipboard
        );

        let data = {};
        xferable.getAnyTransferData({}, data, {});
        data = data.value.QueryInterface(
          Components.interfaces.nsISupportsString).data;
        if (data != null &&
            (data.startsWith("http://") ||
             data.startsWith("file://") ||
             data.startsWith("https://")) &&
            data.length < 60)
        {
          if (this._add_menu_item(entries, data, data))
          {
            ++entries;
          }
        }
      }
      catch (err)
      {
        //getAnyTransferData throws an exception if there's nothing in the
        //clipboard. Need to find a better way of checking that.
        //debug(err);
      }
    }
    return entries;
  },

  /** Adds any livemearks to the main popup
   *
   * @param {integer} entries - number of entries in the menu
   */
  _add_livemarks(entries)
  {
    if (this._config.menu_includes_livemarks)
    {
      const tag = "livemark/feedURI";
      for (let mark of AnnotationService.getItemsWithAnnotation(tag))
      {
        const url = AnnotationService.getItemAnnotation(mark, tag);
        const title = BookmarkService.getItemTitle(mark);
        if (this._add_menu_item(entries, url, title))
        {
          ++entries;
        }
      }
    }
  },

  /** Handle popup hiding event. Allow tooltip popup
   *
   * ignored param {PopupEvent} event - event to handle
   */
  __menu_hiding(/*event*/)
  {
    this._tooltip_enabled = true;
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
      const tooltip = this._icon_tooltip;
      const rows = replace_without_children(
        tooltip.firstChild.childNodes[1]
      );
      if (tooltip.hasAttribute("inforssUrl"))
      {
        const info = this._mediator.locateFeed(
          tooltip.getAttribute("inforssUrl")
        );
        //Is this really possible? If so shouldn't we do the same 'else'?
        if (info != null)
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

          add_row("title", info.info.getTitle());

          if (info.info.getType() != "group")
          {
            add_row("url", info.info.getUrl());
            add_row("link", info.info.getLinkAddress());
            add_row("feed.lastrefresh",
                    info.info.lastRefresh == null ?
                      "" :
                      format_as_hh_mm_ss(info.info.lastRefresh));

            add_row("feed.nextrefresh",
                    info.info.next_refresh == null ?
                      "" :
                      format_as_hh_mm_ss(info.info.next_refresh));
          }

          add_row("report.nbheadlines", info.info.getNbHeadlines());
          add_row("report.nbunreadheadlines", info.info.getNbUnread());
          add_row("report.nbnewheadlines", info.info.getNbNew());
        }
      }
      else
      {
        //This shouldn't happen unless you've deleted all your feeds
        const label = this._document.createElement("label");
        label.setAttribute("value", "No info");
        const row = this._document.createElement("row");
        row.appendChild(label);
        rows.appendChild(row);
      }
    }
    catch (e)
    {
      debug(e);
    }
  },

  /** Adds submenu entries for all menu entries
   *
   * FIXME why not add them at the time of creating the entry?
   */
  _create_submenus()
  {
    try
    {
      for (let child of this._menu.childNodes)
      {
        const elements = this._document.getAnonymousNodes(child);
        //elements can be null rather than an empty list, which isn't good
        if (elements != null && elements.length > 0)
        {
          const element = elements[0].firstChild;
          if (element != null && element.localName == "image")
          {
            //This seems messy. Why twice?
            element.setAttribute("maxwidth", "16");
            element.setAttribute("maxheight", "16");
            element.setAttribute("minwidth", "16");
            element.setAttribute("minheight", "16");
            element.style.maxWidth = "16px";
            element.style.maxHeight = "16px";
            element.style.minWidth = "16px";
            element.style.minHeight = "16px";
          }
        }
        if (child.nodeName == "menu")
        {
          let menupopup = child.firstChild;
          if (menupopup != null)
          {
            //FIXME use addEventListener
            if (menupopup.getAttribute("type") == "rss" ||
                menupopup.getAttribute("type") == "atom")
            {
              const id = menupopup.getAttribute("id");
              const index = id.indexOf("-");
              menupopup.setAttribute(
                "onpopupshowing",
                "return inforssSubMenu(" + id.substring(index + 1) + ");"
              );
            }
            else
            {
              menupopup.setAttribute("onpopupshowing", "return false");
            }
            menupopup = replace_without_children(menupopup);
            this._add_no_data(menupopup);
          }
        }
      }
    }
    catch (e)
    {
      debug(e);
    }
  },

  /** Add an empty submenu to a menu.
   *
   * This is then replaced with a real submenu of pages after 30 seconds.
   *
   * Note: As a function because it's used twice in inforss.js
   *
   * @param {object} popup - Menu to which to add this
   */
  _add_no_data(popup)
  {
    const item = this._document.createElement("menuitem");
    item.setAttribute("label", get_string("noData"));
    popup.appendChild(item);
  },

  /** Add an item to the menu
   *
   * @param {integer} nb - the number of the entry in the menu
   * @param {string} url of the feed
   * @param {string} title of the feed
   *
   * @returns {boolean} true if item was added to menu
   */
  _add_menu_item(nb, url, title)
  {
    if (this._config.get_item_from_url(url) != null)
    {
      return false;
    }

    const menuItem = this._document.createElement("menuitem");
    let labelStr = get_string("menuadd") + " " + title;
    if (url != title)
    {
      labelStr += " (" + url + ")";
    }
    menuItem.setAttribute("label", labelStr);
    menuItem.setAttribute("data", url);
    menuItem.setAttribute("tooltiptext", url);

    //Disable if option window is displayed
    menuItem.setAttribute("disabled",
                          option_window_displayed() ? "true" : "false");

    const menupopup = this._menu;

    //Arrange as follows
    //trash
    //separator
    //addons
    //separator
    //feeds
    const separators = menupopup.getElementsByTagName("menuseparator");
    const separator = separators.item(separators.length - 1);
    if (separators.length == 1)
    {
      menupopup.insertBefore(this._document.createElement("menuseparator"),
                             separator);
    }
    menupopup.insertBefore(menuItem, separator);

    return true;
  },

  /** locate the place to insert an entry in the menu
   *
   * @param {string} title - title of current entry
   *
   * @returns {object} menu item before which to insert
   */
  _find_insertion_point(title)
  {
    //Ignore case when sorting.
    title = title.toLowerCase();

    //FIXME Can we iterate over child nodes backwards?
    let obj = this._menu.childNodes[this._menu.childNodes.length - 1];
    while (obj != null)
    {
      /* eslint-disable no-extra-parens */
      if (obj.nodeName == "menuseparator" ||
          (this._config.menu_sorting_style == "asc" &&
           title > obj.getAttribute("label").toLowerCase()) ||
          (this._config.menu_sorting_style == "des" &&
           title < obj.getAttribute("label").toLowerCase()))
      /* eslint-enable no-extra-parens */
      {
        return obj.nextSibling;
      }
      obj = obj.previousSibling;
    }
    //Insert at the start in this case
    return null;
  },

  //FIXME - is that the correct type?
  /** Add a feed to the main popup menu and returns the added item
   *
   * @param {object} rss - the feed definition
   *
   * @returns {object} menu item
   */
  add_feed_to_menu(rss)
  {
    let menuItem = null;
    if (rss.getAttribute("groupAssociated") == "false" ||
        this._config.menu_show_feeds_from_groups)
    {
      const has_submenu = this._config.menu_show_headlines_in_submenu &&
        (rss.getAttribute("type") == "rss" ||
         rss.getAttribute("type") == "atom");

      const typeObject = has_submenu ? "menu" : "menuitem";

      const menu = this._menu;
      const item_num = menu.childElementCount;

      menuItem = this._document.createElement(typeObject);

      //This is moderately strange. it does what you expect if you
      //display submenus, but then it doesn't indicate the currently
      //selected feed. If however, you don't display as submenus, then
      //you don't get icons but you do get a selected one.
      //if you make this a radio button it completely removes the icons,
      //unless they have submenus
      //menuItem.setAttribute("type", "radio");
      menuItem.setAttribute("label", rss.getAttribute("title"));
      menuItem.setAttribute("value", rss.getAttribute("title"));

      //Is this necessary?
      //menuItem.setAttribute("data", rss.getAttribute("url"));
      menuItem.setAttribute("url", rss.getAttribute("url"));
      menuItem.setAttribute("checked", false);
      menuItem.setAttribute("autocheck", false);
      if (rss.getAttribute("description") != "")
      {
        menuItem.setAttribute("tooltiptext", rss.getAttribute("description"));
      }
      menuItem.setAttribute("tooltip", null);
      menuItem.setAttribute("image", rss.getAttribute("icon"));
      menuItem.setAttribute("validate", "never");
      menuItem.setAttribute("id", "inforss.menuitem-" + item_num);
      menuItem.setAttribute("inforsstype", rss.getAttribute("type"));

      menuItem.setAttribute("class", typeObject + "-iconic");
      if (rss.getAttribute("activity") == "false")
      {
        menuItem.setAttribute("disabled", "true");
      }

      if (rss.getAttribute("type") == "group")
      {
        //Allow as drop target
        menuItem.addEventListener("dragover",
                                  this._menu_observer.on_drag_over);
        menuItem.addEventListener("drop",
                                  this._menu_observer.on_drop);
      }

      menuItem.addEventListener("dragstart",
                                this._menu_observer.on_drag_start);

      if (has_submenu)
      {
        const menupopup = this._document.createElement("menupopup");
        menupopup.setAttribute("type", rss.getAttribute("type"));
        //FIXME Seriously. use addEventListener
        menupopup.setAttribute("onpopupshowing",
                               "return inforssSubMenu(" + item_num + ");");
        menupopup.setAttribute("onpopuphiding", "return inforssSubMenu2();");
        //?
        menupopup.setAttribute("id", "inforss.menupopup-" + item_num);

        const item = this._document.createElement("menuitem");
        item.setAttribute("label", get_string("noData"));
        menupopup.appendChild(item);

        menuItem.appendChild(menupopup);
      }

      if (this._config.menu_sorting_style == "no")
      {
        menu.appendChild(menuItem);
      }
      else
      {
        const indexItem = this._find_insertion_point(rss.getAttribute("title"));
        menu.insertBefore(menuItem, indexItem);
      }
    }
    return menuItem;
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
      this._icon.setAttribute("src", feed.getIcon());

      //Force to 16x16 in case the favicon is huge. This seems an odd way
      //of doing it, but writing to the icon seems to fail.
      this._icon_pic.setAttribute("maxwidth", "16");
      this._icon_pic.setAttribute("maxheight", "16");
      this._icon_pic.setAttribute("minwidth", "16");
      this._icon_pic.setAttribute("minheight", "16");

      this._icon_pic.style.maxWidth = "16px";
      this._icon_pic.style.maxHeight = "16px";
      this._icon_pic.style.minWidth = "16px";
      this._icon_pic.style.minHeight = "16px";
    }
    else
    {
      this._icon.setAttribute("src", "chrome://inforss/skin/inforss.png");
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
      this._icon_pic.setAttribute("src", feed.getIcon());
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
      this._icon_pic.setAttribute("src", this._selected_feed.getIcon());
    }
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
        opacity += this._opacity_change;
        if (opacity < 0 || opacity > 1)
        {
          this._opacity_change = -this._opacity_change;
          opacity += this._opacity_change;
        }
      }
      this._set_icon_opacity(opacity);
      this._start_flash_timeout();
    }
    catch (e)
    {
      debug(e, this);
    }
  },

  /** Set the main icon opacity during flashing
   *
   * @param {int} opacity to which to set main icon
   */
  _set_icon_opacity(opacity)
  {
    this._icon_pic.style.opacity = opacity;
  },

};
