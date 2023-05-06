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
  MIME_feed_type,
  MIME_feed_url
} = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Constants.jsm",
  {}
);

const { Feed_Page } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Feed_Page.jsm",
  {});

const { alert } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Prompt.jsm",
  {}
);

const {
  add_event_listeners,
  event_binder,
  option_window_displayed,
  remove_all_children,
  remove_event_listeners
} = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Utils.jsm",
  {}
);

const { get_string } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Version.jsm",
  {}
);

const { Tooltip_Controller } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Tooltip_Controller.jsm",
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

//Maximum number of headlines in headline submenu.
const INFORSS_MAX_SUBMENU = 25;

/** This creates/maintains/removes the main menu when clicking on main icon.
 *
 * @class
 *
 * @param {Feed_Manager} feed_manager - Fetches feed headlines.
 * @param {Config} config - Configuration.
 * @param {Document} document - The DOM.
 * @param {Main_Icon} main_icon - The main icon (so we can enable/disable
 *                                tooltips).
 */
function Main_Menu(feed_manager, config, document, main_icon)
{
  this._feed_manager = feed_manager;
  this._config = config;
  this._document = document;
  this._main_icon = main_icon;

  this._tooltip_controller =
    new Tooltip_Controller(config, document, "main-menu");
  this._headlines = [];

  this._menu = document.getElementById("inforss.menupopup");

  /* eslint-disable array-bracket-newline */
  this._listeners = add_event_listeners(
    this,
    document,
    [ this._menu, "popupshowing", this._menu_showing ],
    [ this._menu, "popuphiding", this._menu_hiding ]
  );
  /* eslint-enable array-bracket-newline */

  this._submenu_timeout = null;
  this._submenu_request = null;

  this._trash = new Trash_Icon(config, document);

  Object.seal(this);
}

//FIXME somehow when we reset the menu we don't get clipboard and other info
Main_Menu.prototype = {

  /** Reinitialise after config load. */
  config_changed()
  {
    this._clear_menu();
  },

  /** Clean up on shutdown, deregister any event handlers. */
  dispose()
  {
    this._clear_menu();
    this._trash.dispose();
    remove_event_listeners(this._listeners);
    if (this._submenu_request != null)
    {
      console.log("Aborting menu fetch", this._submenu_request);
      this._submenu_request.abort();
    }
    clearTimeout(this._submenu_timeout);
  },

  /** Remove all entries from the popup menu apart from the trash and
   *  separator items.
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

  /** Remove all the non feed related items from the popup menu. */
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
   * Disables tooltip popup and shows menu.
   *
   * @param {PopupEvent} event - Event to handle.
   */
  _menu_showing(event)
  {
    this._main_icon.disable_tooltip_display();
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
    this._add_page_feeds();

    //If there's a feed (or at least a URL) in the clipboard, add that
    this._add_clipboard();

    this._add_livemarks();
  },

  /** Adds any feeds found on the page.
   *
   * This relies on a completely undocumented property (feeds) of the current
   * page.
   *
   */
  _add_page_feeds()
  {
    if (this._config.menu_includes_page_feeds)
    {
      const browser = this._document.defaultView.gBrowser.selectedBrowser;
      if ("feeds" in browser && browser.feeds != null)
      {
        //Sadly the feeds array seems to end up with dupes, so make it a set.
        for (const feed of new Set(browser.feeds))
        {
          this._add_menu_item(feed.href, feed.title);
        }
      }
    }
  },

  /** Adds the clipboard contents if a URL. */
  _add_clipboard()
  {
    if (this._config.menu_includes_clipboard)
    {
      const flavours = [ "text/unicode" ];
      const got_data = Clipboard_Service.hasDataMatchingFlavors(
        flavours,
        flavours.length,
        Components.interfaces.nsIClipboard.kGlobalClipboard);

      if (got_data)
      {
        const xferable = new Transferable();
        xferable.addDataFlavor(flavours[0]);
        Clipboard_Service.getData(
          xferable,
          Components.interfaces.nsIClipboard.kGlobalClipboard
        );

        let data = {};
        try
        {
          xferable.getAnyTransferData({}, data, {});
          data = data.value.QueryInterface(
            Components.interfaces.nsISupportsString).data;
        }
        catch (err)
        {
          //FIXME This shouldn't happen, but it does. Why?
          console.log(err, xferable, data);
          data = null;
        }
        if (data != null &&
            (data.startsWith("http://") ||
             data.startsWith("file://") ||
             data.startsWith("https://")) &&
            data.length < 60)
        {
          this._add_menu_item(data, data);
        }
      }
    }
  },

  /** Adds any livemearks to the main popup. */
  _add_livemarks()
  {
    if (this._config.menu_includes_livemarks)
    {
      const tag = "livemark/feedURI";
      for (const mark of AnnotationService.getItemsWithAnnotation(tag))
      {
        const url = AnnotationService.getItemAnnotation(mark, tag);
        const title = BookmarkService.getItemTitle(mark);
        this._add_menu_item(url, title);
      }
    }
  },

  /** Handle popup hiding event. Allow tooltip popup.
   *
   * @param {PopupEvent} _event - Event to handle.
   */
  _menu_hiding(_event)
  {
    this._main_icon.enable_tooltip_display();
  },

  /** Handle drag start on menu element.
   *
   * @param {Feed} feed - Feed configuration.
   * @param {DragEvent} event - Drag start event.
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

  /** Handle drag of menu element.
   *
   * @param {DragEvent} event - Drag event.
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

  /** Handle drop of menu element into a menu element.
   *
   * @param {Feed} feed - Feed which is being dropped.
   * @param {DragEvent} event - Drop event.
   */
  _on_drop(feed, event)
  {
    const source_url = event.dataTransfer.getData(MIME_feed_url);
    const source_rss = this._config.get_item_from_url(source_url);
    if (source_rss != null)
    {
      const info = this._feed_manager.find_feed(feed.getAttribute("url"));
      if (info !== undefined && ! info.contains_feed(source_url))
      {
        info.addNewFeed(source_url);
        mediator.reload();
      }
    }
    event.stopPropagation();
  },

  /** Resets submenu entries for all menu entries.
   *
   * We do this so the user gets a clean submenu each time we pop up the main
   * menu (so that they get the latest headlines).
   *
   */
  _reset_submenus()
  {
    for (const headline of this._headlines)
    {
      headline.reset_hbox();
    }
    this._headlines = [];

    for (const child of this._menu.childNodes)
    {
      const elements = this._document.getAnonymousNodes(child);
      //elements can be null rather than an empty list, which isn't good
      if (elements != null && elements.length > 0)
      {
        const element = elements[0].firstChild;
        if (element != null && element.localName == "image")
        {
          element.style.width = "16px";
          element.style.maxWidth = "16px";
          element.style.minWidth = "16px";
          element.style.height = "16px";
          element.style.maxHeight = "16px";
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
   * This is then replaced with a real submenu of pages after 3 seconds.
   *
   * Note: As a function because it's used twice in inforss.js. It may be
   * unnecessary to do so here.
   *
   * @param {menupopup} popup - Menu to which to add this.
   */
  _add_no_data(popup)
  {
    const item = this._document.createElement("menuitem");
    item.setAttribute("label", get_string("noData"));
    popup.append(item);
  },

  /** Add an item to the menu.
   *
   * @param {string} url - URL of the feed.
   * @param {string} title - Title of the feed.
   */
  _add_menu_item(url, title)
  {
    if (this._config.get_item_from_url(url) != null)
    {
      //Already configured so in the menu elswhere
      return;
    }

    const menuItem = this._document.createElement("menuitem");
    let labelStr = get_string("menuadd") + " " + title;
    if (url != title)
    {
      labelStr += " (" + url + ")";
    }
    menuItem.setAttribute("label", labelStr);
    menuItem.setAttribute("tooltiptext", url);

    //Disable if option window is displayed (we cant use the disabled property
    //here)
    menuItem.setAttribute("disabled",
                          option_window_displayed() ? "true" : "false");

    //These event listeners are removed because all the children of the menu are
    //remove()d when the menu is cleaned up
    menuItem.addEventListener("command",
                              event_binder(this._on_extra_command, this, url));

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
  },

  /** Locate the place to insert an entry in the menu.
   *
   * @param {string} title - Title of current entry.
   *
   * @returns {menuitem} Menu item before which to insert.
   */
  _find_insertion_point(title)
  {
    //Ignore case when sorting.
    title = title.toLowerCase();

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

  /** Add a feed to the main popup menu and returns the added item.
   *
   * @param {Element} rss - The feed definition.
   *
   * @returns {menuitem} New menu item.
   */
  add_feed_to_menu(rss)
  {
    let menuItem = null;
    if (rss.getAttribute("groupAssociated") == "false" ||
        this._config.menu_show_feeds_from_groups)
    {
      const has_submenu = this._config.menu_show_headlines_in_submenu &&
        (rss.getAttribute("type") == "atom" ||
         rss.getAttribute("type") == "html" ||
         rss.getAttribute("type") == "rss");

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

      //These event listeners are automatically removed because all the children
      //of the menu are remove()d when the menu is cleaned up

      if (rss.getAttribute("type") == "group")
      {
        //Allow as drop target
        menuItem.addEventListener("dragover",
                                  event_binder(this._on_drag_over, this));
        menuItem.addEventListener("drop",
                                  event_binder(this._on_drop, this, rss));
      }

      menuItem.addEventListener("command",
                                event_binder(this._on_command, this, rss));
      menuItem.addEventListener("mouseup",
                                event_binder(this._on_mouse_up, this, rss));
      menuItem.addEventListener("dragstart",
                                event_binder(this._on_drag_start, this, rss));

      if (has_submenu)
      {
        const menupopup = this._document.createElement("menupopup");

        //If we need to make the event handler below remove the showing event,
        //remove this one and restore the one in _reset_submenus.
        menupopup.addEventListener(
          "popupshowing",
          event_binder(this._submenu_popup_showing, this, rss)
        );

        menupopup.addEventListener(
          "popuphiding",
          event_binder(this._submenu_popup_hiding, this));

        menuItem.append(menupopup);
      }

      if (this._config.menu_sorting_style == "no")
      {
        menu.append(menuItem);
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
   *  then displays the submenu.
   *
   * @param {Element} rss - Feed config for submenu.
   * @param {PopupEvent} event - Popup showing event.
   */
  _submenu_popup_showing(rss, event)
  {
    clearTimeout(this._submenu_timeout);
    this._submenu_timeout = setTimeout(event_binder(this._submenu_fetch, this),
                                       3000,
                                       rss,
                                       event.target);
  },

  /** Fetch the feed headlines for displaying as a submenu.
   *
   * @param {Element} rss - Feed config for submenu.
   * @param {menupopup} popup - The menu target that triggered this.
   */
  _submenu_fetch(rss, popup)
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

    const url = rss.getAttribute("url");
    try
    {
      this._submenu_request = new Feed_Page(
        url,
        {
          config: this._config,
          feed_config: rss,
          user: rss.getAttribute("user")
        }
      );
    }
    catch (err)
    {
      console.log(err);
      alert(err.message);
      return;
    }

    this._submenu_request.fetch().then(
      feed =>
      {
        this._submenu_process(feed, popup);
        this._submenu_request = null;
      }
    ).catch(
      err =>
      {
        //cannot put the null in a finally block because alert closes the menu
        //which causes a certain amount of confusion.
        this._submenu_request = null;
        if (! ("event" in err) || err.event.type != "abort")
        {
          console.log(err);
          alert(err.message);
        }
      }
    );
  },

  /** Process XML response into a submenu.
   *
   * @param {Feed} feed - Feed information.
   * @param {menupopup} popup - Original menu.
   */
  _submenu_process(feed, popup)
  {
    const headlines = this._submenu_request.headlines;
    const max = Math.min(INFORSS_MAX_SUBMENU, headlines.length);
    for (const headline of headlines)
    {
      const hl = feed.get_headline(headline.headline, new Date());
      this._headlines.push(hl);

      const elem = this._document.createElement("menuitem");
      elem.setAttribute("label", hl.title);
      elem.setAttribute("tooltip", this._tooltip_controller.create_tooltip(hl));

      elem.addEventListener(
        "command",
        event_binder(this._open_headline_page, this, hl.link)
      );

      popup.append(elem);
      if (popup.childNodes.length == max)
      {
        break;
      }
    }
  },

  /** This is where we eventually get to when someone clicks on the menu.
   *
   * @param {string} url - The url to open.
   * @param {MouseEvent} event - Intercepted event.
   */
  _open_headline_page(url, event)
  {
    this._document.defaultView.gBrowser.addTab(url);
    event.stopPropagation(); //Otherwise we annoyingly select the feed
  },

  /** Handle the hiding of a submenu.
   *
   * This clears any ongoing requests.
   *
   * @param {PopupEvent} _event - Intercepted event.
   */
  _submenu_popup_hiding(_event)
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
   * @param {string} feed - The feed in the menu.
   * @param {MouseEvent} event - Intercepted event.
   */
  _on_command(feed, event)
  {
    //select feed (enter) or open option window (ctrl-enter)
    if (event.ctrlKey)
    {
      this._open_option_window(feed);
    }
    else
    {
      this._select(feed);
    }
  },

  /** Handle click on a menu entry.
   *
   * Open the option window on right click, ignore all others.
   *
   * @param {string} feed - The feed in the menu.
   * @param {MouseEvent} event - Intercepted event.
   */
  _on_mouse_up(feed, event)
  {
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
  },

  /** Select a new feed.
   *
   * Alerts if option window is open.
   *
   * @param {string} feed - Currently selected feed.
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

  /** Handle click/enter on a menu entry.
   *
   * @param {string} url - The URL from clipboard/page/...
   * @param {XULCommandEvent} event - Intercepted event.
   */
  _on_extra_command(url, event)
  {
    //only care about enter.
    if (! event.ctrlKey)
    {
      this._feed_manager.add_feed_from_url(url);
    }
  },

  /** Open the option window with the indicated feed selected if possible.
   *
   * @param {string} feed - Feed to select.
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
