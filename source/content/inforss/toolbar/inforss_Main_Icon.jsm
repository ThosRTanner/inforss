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

inforss.mediator = {};
Components.utils.import(
  "chrome://inforss/content/modules/inforss_Mediator_API.jsm",
  inforss.mediator);

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

const MIME_feed_url = "application/x-inforss-feed-url";
const MIME_feed_type = "application/x-inforss-feed-type";

/** Determine if a drag has the required data type
 *
 * may need to be put into utils
 *
 * @param {Event} event - drag/drop event to checked
 * @param {string} required type - required mime type
 *
 * @returns {boolean} true if we're dragging the required sort of data
 */
function has_data_type(event, required_type)
{
  if (event.dataTransfer.types instanceof DOMStringList)
  {
    //'Legacy' way.
    for (let data_type of event.dataTransfer.types)
    {
      if (data_type == required_type)
      {
        return true;
      }
    }
    return false;
  }
  //New way according to HTML spec.
  return event.dataTransfer.types.includes(required_type);
}

/** menu observer class. Just for clicks on the feed menu
 *
 * @param {inforssMediator} mediator between the worlds
 * @param {inforssXMLRepository} config of extension
 *
 * @returns {Menu_Observer} this
 */
function Menu_Observer(mediator, config)
{
  this._mediator = mediator;
  this._config = config;

  this.on_drag_start = this._on_drag_start.bind(this);
  this.on_drag_over = this._on_drag_over.bind(this);
  this.on_drop = this._on_drop.bind(this);

  return this;
}

Menu_Observer.prototype = {

  /** Handle drag start on menu element
   *
   * @param {DragEvent} event to handle
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
   * @param {DragEvent} event to handle
   */
  _on_drag_over(event)
  {
    if (has_data_type(event, MIME_feed_type) &&
        ! inforss.option_window_displayed())
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
   * @param {DragEvent} event to handle
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
        inforss.mediator.reload();
      }
    }
    event.stopPropagation();
  }
};


/** Class which controls the main popup menu on the headline bar
 *
 * @param {inforssMediator} mediator - communication between headline bar parts
 * @param {inforssXMLRepository} config - main configuration
 * @param {object} document - the main DOM document
 *
 * @returns {Main_Icon} this
 */
function Main_Icon(mediator, config, document)
{
  this._config = config;
  this._mediator = mediator;
  this._document = document;

  this._menu_observer = new Menu_Observer(mediator, config);

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

  /** reinitialise after config load */
  init()
  {
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
    if (! this._tooltip_enabled)
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
      if (obj.nodeName == "menuseparator" ||
          (this._config.menu_sorting_style == "asc" &&
           title > obj.getAttribute("label").toLowerCase()) ||
          (this._config.menu_sorting_style == "des" &&
           title < obj.getAttribute("label").toLowerCase()))
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
        item.setAttribute("label", inforss.get_string("noData"));
        menupopup.appendChild(item);

        menuItem.appendChild(menupopup);
      }

      if (this._config.menu_sorting_style != "no")
      {
        const indexItem = this._find_insertion_point(rss.getAttribute("title"));
        menu.insertBefore(menuItem, indexItem);
      }
      else
      {
        menu.appendChild(menuItem);
      }
    }
    return menuItem;
  },

};
