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
// inforss_Main_Menu
// Author : Tom Tanner 2018
//------------------------------------------------------------------------------
/* jshint globalstrict: true */
/* eslint-disable strict */
"use strict";

/* eslint-disable array-bracket-newline */
/* exported EXPORTED_SYMBOLS */
const EXPORTED_SYMBOLS = [
  "Main_Menu", /* exported Main_Menu */
];
/* eslint-enable array-bracket-newline */

const {
  INFORSS_MAX_SUBMENU,
  MIME_feed_type,
  MIME_feed_url
} = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Constants.jsm",
  {}
);

const { debug } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Debug.jsm",
  {}
);

const { Feed_Parser_Promise } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Feed_Parser.jsm",
  {});

const { alert } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Prompt.jsm",
  {}
);

const {
  htmlFormatConvert,
  option_window_displayed,
  remove_all_children
} = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Utils.jsm",
  {}
);

const { get_string } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Version.jsm",
  {}
);

const { Trash_Icon } = Components.utils.import(
  "chrome://inforss/content/toolbar/inforss_Trash_Icon.jsm",
  {}
);

const mediator = {};
Components.utils.import(
  "chrome://inforss/content/mediator/inforss_Mediator_API.jsm",
  mediator);

const { clearTimeout, setTimeout } = Components.utils.import(
  "resource://gre/modules/Timer.jsm",
  {}
);


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

const { console } =
  Components.utils.import("resource://gre/modules/Console.jsm", {});

/** This creates/maintains/removes the main menu when clicking on main icon
 *
 * @class
 *
 * @param {Feed_Manager} feed_manager - fetches feed headlines
 * @param {Config} config - extension configuration
 * @param {document} document - the DOM
 * @param {Main_Icon} main_icon - the main icon (so we can enable/disable
 *                                tooltips)
 */
function Main_Menu(feed_manager, config, document, main_icon)
{
  this._feed_manager = feed_manager;
  this._config = config;
  this._document = document;
  this._main_icon = main_icon;

  this._menu = document.getElementById("inforss-menupopup");
  //Set up handlers
  this._menu_showing = this.__menu_showing.bind(this);
  this._menu.addEventListener("popupshowing", this._menu_showing);
  this._menu_hiding = this.__menu_hiding.bind(this);
  this._menu.addEventListener("popuphiding", this._menu_hiding);

  this._on_drag_over = this.__on_drag_over.bind(this);

  this._submenu_timeout = null;
  this._submenu_request = null;

  this._trash = new Trash_Icon(config, document);
}

//FIXME somehow when we reset the menu we don't get clipboard and other info
Main_Menu.prototype = {

  /** reinitialise after config load */
  init()
  {
    this._clear_menu();
  },

  /** Clean up on shutdown, deregister any event handlers */
  dispose()
  {
    this._clear_menu();
    this._trash.dispose();
    this._menu.removeEventListener("popupshowing", this._menu_showing);
    this._menu.removeEventListener("popuphiding", this._menu_hiding);
    if (this._submenu_request != null)
    {
      console.log("Aborting menu fetch", this._submenu_request);
      this._submenu_request.abort();
    }
    clearTimeout(this._submenu_timeout);
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
      const next = child.nextSibling;
      child.remove();
      child = next;
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
        const next = child.nextSibling;
        child.remove();
        child = next;
      }
    }
  },

  /** Handle popupshowing event.
   *
   * Disables tooltip popup and shows menu
   *
   * @param {PopupEvent} event - event to handle
   */
  __menu_showing(event)
  {
    this._main_icon.disable_tooltip_display();
    try
    {
      if (event.button != 0 || event.ctrlKey)
      {
        //Ignore if not a left click
        event.preventDefault();
        return;
      }

      this._trash.disable();

      this._clear_added_menu_items();
      if (event.target == this._menu)
      {
        this._reset_submenus();
      }

      //Add in the optional items
      let nb = this._add_page_feeds();

      //If there's a feed (or at least a URL) in the clipboard, add that
      nb = this._add_clipboard(nb);

      //Add livemarks
      this._add_livemarks(nb);
    }
    catch (err)
    {
      debug(err);
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
        //FIXME getAnyTransferData throws an exception if there's nothing in the
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
    this._main_icon.enable_tooltip_display();
  },

  /** Handle drag start on menu element
   *
   * @param {Feed} feed - feed configuration
   * @param {DragEvent} event - drag start
   */
  _on_drag_start(feed, event)
  {
    const target = event.target;
    const data = event.dataTransfer;
    const url = feed.getAttribute("url");
    if (target.hasAttribute("image"))
    {
      //This isn't a submenu popout, so add the feed url and the type
      data.setData(MIME_feed_url, url);
      data.setData(MIME_feed_type, feed.getAttribute("inforsstype"));
    }
    data.setData("text/uri-list", url);
    data.setData("text/unicode", url);
    //Once we drag things, kill off any submenu display processing in flight.
    this._submenu_popup_hiding();
  },

  /** Handle drag of menu element
   *
   * @param {DragEvent} event - drag
   */
  __on_drag_over(event)
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

  /** Handle drop of menu element into a menu element
   *
   * @param {Feed} feed - feed which is being dropped
   * @param {DragEvent} event - drop onto menu
   */
  _on_drop(feed, event)
  {
    const source_url = event.dataTransfer.getData(MIME_feed_url);
    const source_rss = this._config.get_item_from_url(source_url);
    if (source_rss != null)
    {
      const info = this._feed_manager.find_feed(feed.getAttribute("url"));
      if (info !== undefined && ! info.containsFeed(source_url))
      {
        info.addNewFeed(source_url);
        mediator.reload();
      }
    }
    event.stopPropagation();
  },

  /** Resets submenu entries for all menu entries
   *
   * We do this so the user gets a clean submenu each time we pop up the main
   * menu (so that they get the latest headlines).
   *
   */
  _reset_submenus()
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
        const menupopup = child.firstChild;
        if (menupopup != null)
        {
          remove_all_children(menupopup);
          this._add_no_data(menupopup);
        }
      }
    }
  },

  /** Add an empty submenu to a menu.
   *
   * This is then replaced with a real submenu of pages after 30 seconds.
   *
   * Note: As a function because it's used twice in inforss.js. It may be
   * unnecessary to do so here
   *
   * @param {Element} popup - Menu to which to add this
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
   * @param {string} url - url of the feed
   * @param {string} title - title of the feed
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
    menuItem.setAttribute("data", url); //FIXME remove
    menuItem.setAttribute("tooltiptext", url);

    //Disable if option window is displayed (we cant use the disabled property
    //here)
    menuItem.setAttribute("disabled",
                          option_window_displayed() ? "true" : "false");

    //These event listeners are removed because all the children of the menu are
    //remove()d when the menu is cleaned up
    /* eslint-disable mozilla/balanced-listeners */
    menuItem.addEventListener("command",
                              this._on_extra_command.bind(this, url));
    //FIXME shouldn't need this once we get rid of generic parent intercept
    menuItem.addEventListener("mouseup", event => event.stopPropagation());
    /* eslint-enable mozilla/balanced-listeners */

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
   * @returns {Elemet} menu item before which to insert
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

  /** Add a feed to the main popup menu and returns the added item
   *
   * @param {Element} rss - the feed definition
   *
   * @returns {Element} menu item
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
      //menuItem.setAttribute("autocheck", false);       //ony if radio button

      menuItem.setAttribute("label", rss.getAttribute("title"));

      menuItem.setAttribute("checked", "false");
      if (rss.getAttribute("description") != "")
      {
        menuItem.setAttribute("tooltiptext", rss.getAttribute("description"));
      }
      menuItem.setAttribute("tooltip", null);
      menuItem.setAttribute("image", rss.getAttribute("icon"));
      menuItem.setAttribute("validate", "never"); //reload from cache if poss
      menuItem.setAttribute("id", "inforss.menuitem-" + item_num);

      menuItem.setAttribute("class", typeObject + "-iconic");
      if (rss.getAttribute("activity") == "false")
      {
        menuItem.setAttribute("disabled", "true");
      }

      //These event listeners are removed because all the children of the menu
      //are remove()d when the menu is cleaned up
      /* eslint-disable mozilla/balanced-listeners */

      if (rss.getAttribute("type") == "group")
      {
        //Allow as drop target
        menuItem.addEventListener("dragover", this._on_drag_over);
        menuItem.addEventListener("drop", this._on_drop.bind(this, rss));
      }

      //add event listeners for command and mouseup events
      menuItem.addEventListener("command", this._on_command.bind(this, rss));
      menuItem.addEventListener("mouseup", this._on_mouse_up.bind(this, rss));

      //FIXME Remove URL once i've cleaned up all the other listeners
      //can do this with bind as (as mentioned above) the menu gets destroyed
      //on cleanup
      menuItem.setAttribute("url", rss.getAttribute("url"));

      menuItem.addEventListener("dragstart",
                                this._on_drag_start.bind(this, rss));

      if (has_submenu)
      {
        const menupopup = this._document.createElement("menupopup");

        //If we need to make the event handler below remove the showing event,
        //remove this one and restore the one in _reset_submenus.
        menupopup.addEventListener(
          "popupshowing",
          this._submenu_popup_showing.bind(this, rss)
        );

        menupopup.addEventListener("popuphiding",
                                   this._submenu_popup_hiding.bind(this));

        menuItem.appendChild(menupopup);
      }

      /* eslint-enable mozilla/balanced-listeners */

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

  /** Handle the popup of a submenu. This starts a 3 second timer and
   *  then displays the submenu
   *
   * @param {Element} feed - feed for submenu
   * @param {PopupEvent} event - popup showing event
   */
  _submenu_popup_showing(feed, event)
  {
    clearTimeout(this._submenu_timeout);
    this._submenu_timeout = setTimeout(this._submenu_fetch.bind(this),
                                       3000,
                                       feed,
                                       event.target);
  },

  /** Fetch the feed headlines for displaying as a submenu
   *
   * @param {Element} feed - feed for submenu
   * @param {MenuPopup} popup - the menu target that triggered this
   */
  _submenu_fetch(feed, popup)
  {
    //Sadly you can't use replace_without_children here - it appears the
    //browser has got hold of the element and doesn't spot we've replaced it
    //with another one. so we have to change this element in place.
    remove_all_children(popup);

    if (this._submenu_request != null)
    {
      console.log("Aborting menu fetch", this._submenu_request);
      this._submenu_request.abort();
    }

    const url = feed.getAttribute("url");
    this._submenu_request = new Feed_Parser_Promise(
      url,
      { user: feed.getAttribute("user") }
    );

    this._submenu_request.start().then(
      fm => this._submenu_process(fm, popup)
    ).catch(
      err =>
      {
        const event = err[0];
        if (err.length == 1)
        {
          console.log(event);
          /**/console.log(event.type)
          if (event.type != "abort")
          {
            alert(get_string("feed.issue") + "\n" + url);
          }
        }
        else
        {
          console.log(event, err[1]);
          if (event !== null)
          {
            alert(err[1].message + "\n" + url);
          }
        }
        this._submenu_request = null;
      }
    );
  },

  /** Process XML response into a submenu
   *
   * @param {Feed_Parser} fm - parsed xml/atom feed
   * @param {MenuPopup} popup - original menu
   */
  _submenu_process(fm, popup)
  {
    try
    {
      this._submenu_request = null;
      const max = Math.min(INFORSS_MAX_SUBMENU, fm.headlines.length);
      for (let i = 0; i < max; i++)
      {
        const headline = fm.headlines[i];
        const elem = this._document.createElement("menuitem");
        let title = htmlFormatConvert(headline.title);
        if (title != null)
        {
          const re = new RegExp('\n', 'gi');
          title = title.replace(re, ' ');
        }
        elem.setAttribute("label", title);
        elem.setAttribute("tooltiptext",
                          htmlFormatConvert(headline.description));

        //The menu will get destroyed anyway
        /* eslint-disable mozilla/balanced-listeners */
        elem.addEventListener(
          "command",
          this._open_headline_page.bind(this, headline.link)
        );
        //FIXME Shouldn't need this once we get rid of generic parent
        elem.addEventListener("mouseup", event => event.stopPropagation());
        /* eslint-enable mozilla/balanced-listeners */

        popup.appendChild(elem);
      }
    }
    catch (err)
    {
      debug(err);
    }
  },

  /** And this is where we eventually get to when someone clicks on the menu
   *
   * @param {string} url - the ursl to open
   * @param {CommandEvent} event - the event
   */
  _open_headline_page(url, event)
  {
    /**/console.log("open headline", url, event)
    this._document.defaultView.gBrowser.addTab(url);
    event.stopPropagation();     //FIXME do we need this?
  },

  /** Handle the hiding of a submenu. This clears any ongoing requests
   *
   * unused param {PopupHidingEvent} event - popup hiding event
   */
  _submenu_popup_hiding(/*event*/)
  {
    clearTimeout(this._submenu_timeout);
    if (this._submenu_request != null)
    {
      console.log("Aborting menu fetch", this._submenu_request);
      this._submenu_request.abort();
    }
  },

  /** Handle click/enter on a menu entry.
   * Open the option window on ctrl-enter otherwise select the feed.
   *
   * @param {string} feed - the feed in the menu
   * @param {MouseEvent} event - mouse up event
   */
  _on_command(feed, event)
  {
    //select feed (enter) or open option window (ctrl-enter)
    /**/console.log("command", feed, event)
    if (event.ctrlKey)
    {
      this._open_option_window(feed);
    }
    else
    {
      this._select(feed);
    }
    //FIXME shouldn't be needed once we get rid of generic parent intercept
    event.stopPropagation();
  },

  /** Handle click on a menu entry.
   * Open the option window on right click, ignore all others.
   *
   * @param {string} feed - the feed in the menu
   * @param {MouseEvent} event - mouse up event
   */
  _on_mouse_up(feed, event)
  {
    /**/console.log("mouse up", feed, event)
    if (event.button == 2)
    {
      this._open_option_window(feed);
    }
    else
    {
      //For reasons best known to mozilla, you don't get a 'command' event
      //if this has submenus, so you have to rely on the mouse click.
      // eslint-disable-next-line no-lonely-if
      if (event.target.nodeName == "menu")
      {
        this._select(feed);
        event.target.parentNode.hidePopup();
      }
    }
    //FIXME shouldn't be needed once we get rid of generic parent intercept
    event.stopPropagation();
  },

  /** Select a new feed, only if the option window isn't open
   *
   * @param {Element} feed - feed information
   */
  _select(feed)
  {
    if (option_window_displayed())
    {
      //I have a settings window open already
      alert(get_string("option.dialogue.open"));
    }
    else
    {
      const current_feed = this._feed_manager.get_selected_feed();
      if (current_feed != feed)
      {
        //FIXME Yes this does not look lovely.
        this._feed_manager.setSelected(feed.getAttribute("url"));
        this._config.save();
      }
    }
  },

  /** Handle click/enter on a menu entry
   *
   * @param {string} url - the url from clipboard/page/...
   * @param {XULCommandEvent} event - command event
   */
  _on_extra_command(url, event)
  {
    //only care about enter.
    /**/console.log("extra command", url, event)
    if (! event.ctrlKey)
    {
      //Non feed. This is a feed to add.
      //this is more or less the same as the main icon's on_drop event handler
      //modularise and use that.
      /**/console.log("adding feed", url)
      //add_feed(url);
    }
    //FIXME shouldn't be needed once we get rid of generic parent intercept
    event.stopPropagation();
  },

  /** Open the option window with the indicated feed selected if possible.
   *
   * @param {Element} feed - feed to select
   */
  _open_option_window(feed)
  {
    if (option_window_displayed())
    {
      //I have a settings window open already
      alert(get_string("option.dialogue.open"));
    }
    else
    {
      this._document.defaultView.openDialog(
        "chrome://inforss/content/inforssOption.xul",
        "_blank",
        "chrome,centerscreen,resizable=yes,dialog=no",
        feed
      );
    }
  },
};
