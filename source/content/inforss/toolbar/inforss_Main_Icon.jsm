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

const inforss = {};

Components.utils.import("chrome://inforss/content/modules/inforss_Debug.jsm",
                        inforss);
Components.utils.import("chrome://inforss/content/modules/inforss_Utils.jsm",
                        inforss);
Components.utils.import("chrome://inforss/content/modules/inforss_Version.jsm",
                        inforss);

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

///* globals console */
//Components.utils.import("resource://gre/modules/Console.jsm");

/** Class which controls the main popup menu on the headline bar
 *
 * @param {XML_Repository} config - main configuration
 * @param {Headline_Display} headline_display - headline scrolling
 * @param {inforssFeedHandler} feed_manager - umm
 * @param {object} document - the main DOM document
 *
 * @returns {Main_Icon} this
 */
function Main_Icon(config, headline_display, feed_manager, document)
{
  this._config = config;
  this._headline_display = headline_display;
  this._feed_manager = feed_manager;
  this._document = document;
  this._menu = document.getElementById("inforss-menupopup");
  this._icon = document.getElementById("inforss.popup.mainicon");

  this._tooltip_enabled = true;

  //Set up handlers
  this._menu_showing = this.__menu_showing.bind(this);
  this._menu.addEventListener("popupshowing", this._menu_showing);
  this._menu_hiding = this.__menu_hiding.bind(this);
  this._menu.addEventListener("popuphiding", this._menu_hiding);

  this._show_tooltip = this.__show_tooltip.bind(this);
  this._icon.addEventListener("popupshowing", this._show_tooltip);

  return this;
}

Main_Icon.prototype = {

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
          inforss.option_window_displayed() ? "true" : "false"
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
      inforss.debug(e);
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
        inforss.debug(err);
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
    if (!this._tooltip_enabled)
    {
      event.preventDefault();
      return;
    }

    try
    {
      const tooltip = this._icon;
      const rows = inforss.replace_without_children(
        tooltip.firstChild.childNodes[1]
      );
      if (tooltip.hasAttribute("inforssUrl"))
      {
        const info = this._feed_manager.locateFeed(
          tooltip.getAttribute("inforssUrl")
        );
        //Is this really possible? If so shouldn't we do the same 'else'?
        if (info != null)
        {
          const add_row = (desc, value) =>
          {
            const row = this._document.createElement("row");
            let label = this._document.createElement("label");
            label.setAttribute("value", inforss.get_string(desc) + " : ");
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
                      inforss.format_as_hh_mm_ss(info.info.lastRefresh));

            add_row("feed.nextrefresh",
                    info.info.next_refresh == null ?
                      "" :
                      inforss.format_as_hh_mm_ss(info.info.next_refresh));
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
      inforss.debug(e);
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
            menupopup = inforss.replace_without_children(menupopup);
            this._add_no_data(menupopup);
          }
        }
      }
    }
    catch (e)
    {
      inforss.debug(e);
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
    item.setAttribute("label", inforss.get_string("noData"));
    popup.appendChild(item);
  },

  /** Remove all the clipboard/livemark entries in the menu */
  _clear_added_menu_items()
  {
    try
    {
      const menupopup = this._menu;
      const separators = menupopup.getElementsByTagName("menuseparator");
      if (separators.length > 1)
      {
        //Remove all the added items and the added separator. Note that
        //separators is a live list so I have to remember the end as the first
        //deletion will change the value of separators.
        let child = separators[0];
        const end = separators[1];
        while (child != end)
        {
          const nextChild = child.nextSibling;
          menupopup.removeChild(child);
          child = nextChild;
        }
      }
    }
    catch (e)
    {
      inforss.debug(e);
    }
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
    let labelStr = inforss.get_string("menuadd") + " " + title;
    if (url != title)
    {
      labelStr += " (" + url + ")";
    }
    menuItem.setAttribute("label", labelStr);
    menuItem.setAttribute("data", url);
    menuItem.setAttribute("tooltiptext", url);

    //Disable if option window is displayed
    menuItem.setAttribute("disabled",
                          inforss.option_window_displayed() ? "true" : "false");

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

};
