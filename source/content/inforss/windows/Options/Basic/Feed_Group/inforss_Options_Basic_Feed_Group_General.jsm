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
 *   Tom Tanner
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
// inforss_Options_Basic_Feed_Group_General
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------
/* jshint globalstrict: true */
/* eslint-disable strict */
"use strict";

/* eslint-disable array-bracket-newline */
/* exported EXPORTED_SYMBOLS */
const EXPORTED_SYMBOLS = [
  "General", /* exported General */
];
/* eslint-enable array-bracket-newline */

const {
  add_event_listeners,
  complete_assign,
  event_binder,
  remove_all_children,
  remove_event_listeners,
  replace_without_children
} = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Utils.jsm",
  {}
);

const { Page_Favicon } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Page_Favicon.jsm",
  {}
);

const { alert } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Prompt.jsm",
  {}
);

const { get_string } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Version.jsm",
  {}
);

const { Parse_HTML_Dialogue } = Components.utils.import(
  "chrome://inforss/content/windows/inforss_Parse_HTML_Dialogue.jsm",
  {}
);

const { Base } = Components.utils.import(
  "chrome://inforss/content/windows/Options/inforss_Options_Base.jsm",
  {}
);

const { console } = Components.utils.import(
  "resource://gre/modules/Console.jsm",
  {}
);

const { clearTimeout, setTimeout } = Components.utils.import(
  "resource://gre/modules/Timer.jsm",
  {}
);

/** Contains the code for the "Basic" tab in the option screen
 *
 * @param {XMLDocument} document - the options window this._document
 * @param {Config} config - current configuration
 * @param {Options} options - the mean options window
 */
function General(document, config, options)
{
  this._document = document;
  this._config = config;
  this._options = options;

  this._icon_request = null;

  this._feeds_for_groups = document.getElementById("group-list-rss");
  this._group_playlist = document.getElementById("group-playlist");
  this._playlist_toggle = document.getElementById("playlistoption");

  this._canvas = this._document.getElementById("inforss.canvas");
  this._canvas_context = this._canvas.getContext("2d");
  this._canvas_context.scale(0.5, 0.3);

  this._canvas_browser = document.getElementById("inforss.canvas.browser");

  const br = this._canvas_browser.docShell;
  br.allowAuth = false;
  br.allowImages = false;
  br.allowJavascript = false;
  br.allowMetaRedirects = false;
  br.allowPlugins = false;
  br.allowSubframes = false;

  this._magnifier = document.getElementById("inforss.magnify");
  this._magnifier_canvas = document.getElementById("inforss.magnify.canvas");

  this._mini_browser_timout = null;
  this._mini_browser_counter = 0;

  this._listeners = add_event_listeners(
    this,
    document,
    //normal feeds
    [ "canvas", "click", this._view_home_page ],
    [ "canvas", "mouseover", this._on_canvas_mouse_over ],
    [ "canvas", "mouseout", this._on_canvas_mouse_out ],
    [ "canvas", "mousemove", this._on_canvas_mouse_move ],
    [ "homeLink", "click", this._view_home_page ],
    [ "set.icon", "command", this._set_icon ],
    [ "reset.icon", "command", this._reset_icon ],
    [ "tree1", "click", this._toggle_activation ],
    [ "rss.fetch", "command", this._html_parser ],
    //group feeds
    [ "group.icon.test", "command", this._test_group_icon ],
    [ "group.icon.reset", "command", this._reset_group_icon ],
    [ this._playlist_toggle, "command", this._on_playlist_toggle ],
    [ "playlist.moveup", "click", this._playlist_move_up ],
    [ "playlist.remove", "click", this._playlist_remove ],
    [ "playlist.add", "click", this._playlist_add ],
    [ "playlist.movedown", "click", this._playlist_move_down ],
    [ "checkall", "command", this._check_all ],
    [ "view.all", "select", this._view_all ],
    [ "tree2", "click", this._toggle_activation ]
  );
}

const Super = Base.prototype;
General.prototype = Object.create(Super);
General.prototype.constructor = General;

complete_assign(General.prototype, {

  /** Config has been loaded */
  config_loaded()
  {
    //It appears that because xul has already got its fingers on this, we can"t
    //dynamically replace
    //This is the list of feeds in a group displayed when a group is selected
    //FIXME This seems wrong here.
    const list = this._feeds_for_groups;
    const listcols = list.firstChild;
    remove_all_children(list);
    list.appendChild(listcols);

    for (const feed of this._config.get_all())
    {
      this.add_feed(feed);
    }
  },

  /** Display settings for current feed
   *
   * @param {RSS} feed - config of currently selected feed
   */
  display(feed)
  {
    //Display stuff
    this._current_feed = feed;
    if (feed.getAttribute("type") == "group")
    {
      this._display_group(feed);
    }
    else
    {
      this._display_feed(feed);
    }
  },

  /** Display settings for current feed when it is a group
   *
   * @param {RSS} feed - config of currently selected feed
   */
  _display_group(feed)
  {
    this._document.getElementById("inforss.rsstype").selectedIndex = 1;
    this._document.getElementById("groupName").value =
      feed.getAttribute("url");

    const icon = feed.getAttribute("icon");
    this._document.getElementById("inforss.group.icon").src = icon;
    this._document.getElementById("iconurlgroup").value = icon;

    const has_playlist = feed.getAttribute("playlist") == "true";
    this._playlist_toggle.selectedIndex = has_playlist ? 0 : 1;
    this._document.getElementById("playListTabPanel").collapsed =
      ! has_playlist;
    if (has_playlist)
    {
      this._group_playlist = replace_without_children(this._group_playlist);
      const playlist = feed.getElementsByTagName("playLists")[0].childNodes;
      for (const item of playlist)
      {
        const played_url = item.getAttribute("url");
        const played_feed = this._config.get_item_from_url(played_url);
        //FIXME this seems a buggy sort of check as it would mean the config
        //hasn't been updated correctly. Note that this would require a check on
        //loading the config if so.
        if (played_feed != null)
        {
          this._add_details_to_playlist(item.getAttribute("delay"),
                                        played_feed.getAttribute("icon"),
                                        played_feed.getAttribute("title"),
                                        played_url);
        }
      }
    }

    this._set_group_checkbox(feed);

    this._populate_tree(feed, "group");

    this._document.getElementById("inforss.checkall").checked = false;
  },

  /** Adds an entry to the playlist
   *
   * @param {string} delay - time in minutes for feed to be displayed
   * @param {string} image - url of feeds favicon
   * @param {string} title - feed title
   * @param {string} url - url of feed
   */
  _add_details_to_playlist(delay, image, title, url)
  {
    const append_spacer = box =>
    {
      const spacer = this._document.createElement("spacer");
      spacer.setAttribute("flex", "1");
      box.appendChild(spacer);
    };

    const hbox = this._document.createElement("hbox");

    {
      const input = this._document.createElement("textbox");
      input.setAttribute("value", delay);
      input.style.maxWidth = "30px";
      hbox.appendChild(input);
    }

    {
      const vbox = this._document.createElement("vbox");

      append_spacer(vbox);

      const image1 = this._document.createElement("image");
      image1.setAttribute("src", image);
      image1.style.maxWidth = "16px";
      image1.style.maxHeight = "16px";
      vbox.appendChild(image1);

      append_spacer(vbox);

      hbox.appendChild(vbox);
    }

    {
      const vbox = this._document.createElement("vbox");
      append_spacer(vbox);
      const label1 = this._document.createElement("label");
      label1.setAttribute("value", title);
      vbox.appendChild(label1);
      append_spacer(vbox);
      hbox.appendChild(vbox);
    }

    const richlistitem = this._document.createElement("richlistitem");
    richlistitem.appendChild(hbox);
    richlistitem.setAttribute("value", delay);
    richlistitem.setAttribute("label", title);
    //FIXME custom attributes in DOM
    richlistitem.setAttribute("url", url);

    this._group_playlist.appendChild(richlistitem);
  },

  /** Display settings for current feed when it is not a group
   *
   * @param {RSS} feed - config of currently selected feed
   */
  _display_feed(feed)
  {
    const feed_home = feed.getAttribute("link");
    this._document.getElementById("inforss.rsstype").selectedIndex = 0;
    this._document.getElementById("optionTitle").value =
      feed.getAttribute("title");
    this._document.getElementById("optionUrl").value = feed.getAttribute("url");
    this._document.getElementById("optionLink").value = feed_home;
    this._document.getElementById("optionDescription").value =
      feed.getAttribute("description");

    this._stop_canvas_updates();
    this._canvas_browser.setAttribute("src", feed_home);

    this._canvas_context.clearRect(0, 0, 133, 100);
    this._update_canvas();

    const icon = feed.getAttribute("icon");
    this._document.getElementById("inforss.rss.icon").src = icon;
    this._document.getElementById("iconurl").value = icon;

    this._document.getElementById("inforss.rss.fetch").hidden =
      feed.getAttribute("type") != "html";

    this._populate_tree(feed);
  },

  /** Populate the tree entry
   *
   * @param {RSS} feed - group or feed
   */
  _populate_tree(feed)
  {
    const obj = this._options.get_feed_info(feed);
    const type = feed.getAttribute("type") == "group" ? "group" : "feed";
    const base = "inforss." + type + ".treecell";
    let pos = 1;
    this._document.getElementById(base + pos).setAttribute(
      "properties",
      obj.enabled ? "on" : "off"
    );
    pos += 1;
    this._document.getElementById(base + pos).setAttribute("properties",
                                                           obj.status);
    pos += 1;
    if (type == "feed")
    {
      this._document.getElementById(base + pos).setAttribute(
        "label",
        obj.last_refresh
      );
      pos += 1;
      this._document.getElementById(base + pos).setAttribute(
        "label",
        obj.next_refresh
      );
      pos += 1;
    }
    this._document.getElementById(base + pos).setAttribute("label",
                                                           obj.headlines);
    pos += 1;
    this._document.getElementById(base + pos).setAttribute(
      "label",
      obj.unread_headlines
    );
    pos += 1;
    this._document.getElementById(base + pos).setAttribute("label",
                                                           obj.new_headlines);
    pos += 1;
    if (type == "feed")
    {
      this._document.getElementById(base + pos).setAttribute(
        "label",
        obj.in_group ? "Y" : "N"
      );
    }
  },

  /** Validate contents of tab
   *
   * @param {RSS} feed - config of currently selected feed
   *
   * @returns {boolean} true if all is ok
   */
  validate(feed)
  {
    return feed.getAttribute("type") == "group" ?
      this._validate_group() :
      this._validate_feed();
  },

  /** Validate contents of tab when feed is group
   *
   * @returns {boolean} true if all is ok
   */
  _validate_group()
  {
    if (this._document.getElementById("groupName").value == "" ||
        this._document.getElementById("iconurlgroup").value == "")
    {
      alert(get_string("pref.mandatory"));
      return false;
    }

    if (this._playlist_toggle.selectedIndex == 0)
    {
      //We have a playlist.
      for (const item of this._group_playlist.childNodes)
      {
        if (item.firstChild.firstChild.value == "")
        {
          alert(get_string("delay.mandatory"));
          return false;
        }
      }
    }

    return true;
  },

  /** Validate contents of tab when feed is not a group
   *
   * @returns {boolean} true if all is ok
   */
  _validate_feed()
  {
    if (this._document.getElementById("optionTitle").value == "" ||
        this._document.getElementById("optionUrl").value == "" ||
        this._document.getElementById("optionLink").value == "" ||
        this._document.getElementById("optionDescription").value == "" ||
        this._document.getElementById("iconurl").value == "")
    {
      alert(get_string("pref.mandatory"));
      return false;
    }

    return true;
  },

  /** Update configuration from tab
   *
   * @param {RSS} feed - current feed config
   */
  update(feed)
  {
    if (feed.getAttribute("type") == "group")
    {
      feed.setAttribute("url",
                        this._document.getElementById("groupName").value);
      feed.setAttribute("title",
                        this._document.getElementById("groupName").value);
      feed.setAttribute("description",
                        this._document.getElementById("groupName").value);
      feed.setAttribute("icon",
                        this._document.getElementById("iconurlgroup").value);
      feed.setAttribute("playlist",
                        this._playlist_toggle.selectedIndex == 0);

      //Remove every feed in the group
      this._config.feed_group_clear_groups(feed);

      //Get all the ticked children in the list and add them to this group
      for (const item of this._feeds_for_groups.childNodes)
      {
        if (item.childNodes[0].getAttribute("checked") == "true")
        {
          this._config.feed_group_add(feed,
                                      item.childNodes[1].getAttribute("url"));
        }
      }

      if (this._playlist_toggle.selectedIndex == 0)
      {
        //And add in each playlist in the box. Note that it is possible
        //to create an empty playlist. Not sure this serves any great
        //purpose, but it is possible.
        const playlist = [];
        for (const item of this._group_playlist.childNodes)
        {
          playlist.push({
            url: item.getAttribute("url"),
            delay: parseInt(item.firstChild.firstChild.value, 10)
          });
        }
        this._config.feed_group_set_playlist(feed, playlist);
      }
      else
      {
        this._config.feed_group_clear_playlist(feed);
      }
    }
    else
    {
      feed.setAttribute("title",
                        this._document.getElementById("optionTitle").value);

      const new_url = this._document.getElementById("optionUrl").value;
      if (feed.getAttribute("url") != new_url)
      {
        this._replace_url_in_groups(feed.getAttribute("url"), new_url);
        this._options.update_report();
      }
      feed.setAttribute("url", new_url);

      feed.setAttribute("link",
                        this._document.getElementById("optionLink").value);
      feed.setAttribute(
        "description",
        this._document.getElementById("optionDescription").value);

      feed.setAttribute("icon", this._document.getElementById("iconurl").value);
    }
  },

  /** This replaces a changed URL in various places
   *
   * @param {string} old_url - the current url
   * @param {string} new_url - the url with which to replace it
   */
  _replace_url_in_groups(old_url, new_url)
  {
    for (const group of this._config.get_groups())
    {
      if (group.getAttribute("type") == "group")
      {
        for (const feed of group.getElementsByTagName("GROUP"))
        {
          //FIXME Do this with selector[tag=Group, url=url]?
          if (feed.getAttribute("url") == old_url)
          {
            feed.setAttribute("url", new_url);
            break;
          }
        }
      }
    }
    for (const item of this._feeds_for_groups.childNodes)
    {
      if (item.childNodes[1].getAttribute("url") == old_url)
      {
        item.childNodes[1].setAttribute("url", new_url);
      }
    }
  },

  /** Clean up nicely on window close */
  dispose()
  {
    this._stop_canvas_updates();
    if (this._icon_request != null)
    {
      this._icon_request.abort();
      this._icon_request = null;
    }
    Super.dispose.call(this);
  },

  /** Adds a feed to the "feed in group" list
   *
   * @param {RSS} feed - feed to add to the list of feeds
   */
  add_feed(feed)
  {
    if (feed.getAttribute("type") == "group")
    {
      return;
    }

    const listitem = this._document.createElement("listitem");

    {
      const listcell = this._document.createElement("listcell");
      //According to the documentation, you're not meant to set the type in
      //a listcell. This possibly explains why we have to add an event listener
      listcell.setAttribute("type", "checkbox");
      listcell.addEventListener(
        "click",
        event =>
        {
          const lc = event.currentTarget;
          lc.setAttribute("checked", lc.getAttribute("checked") == "false");
        });
      listitem.appendChild(listcell);
    }

    {
      const listcell = this._document.createElement("listcell");
      listcell.setAttribute("class", "listcell-iconic");
      listcell.setAttribute("image", feed.getAttribute("icon"));
      listcell.setAttribute("value", feed.getAttribute("title"));
      listcell.setAttribute("label", feed.getAttribute("title"));
      //FIXME user data in dom node (why not put this in "value")
      listcell.setAttribute("url", feed.getAttribute("url"));
      listitem.appendChild(listcell);
    }

    listitem.setAttribute("allowevents", "true");

    //Insert into list in alphabetical order
    const listbox = this._feeds_for_groups;
    const title = feed.getAttribute("title").toLowerCase();
    for (const item of listbox.childNodes)
    {
      if (title <= item.childNodes[1].getAttribute("value").toLowerCase())
      {
        listbox.insertBefore(listitem, item);
        return;
      }
    }
    listbox.insertBefore(listitem, null);
  },

  /** Remove a feed - takes it out of the list of possible feeds for a group
   *
   * @param {string} url - url of feed to remove
   */
  remove_feed(url)
  {
    /* eslint-disable indent */
    for (let listitem =
          this._feeds_for_groups.firstChild.nextSibling; //skip listcols node
         listitem != null;
         listitem = listitem.nextSibling)
    /* eslint-enable indent */
    {
      const label = listitem.childNodes[1];
      if (label.getAttribute("url") == url)
      {
        listitem.remove();
        break;
      }
    }
    this._stop_canvas_updates();
  },

  /** Stops the background update of the mini web page */
  _stop_canvas_updates()
  {
    clearTimeout(this._mini_browser_timeout);
    this._mini_browser_timeout = null;
    this._mini_browser_counter = 0;
  },

  /** Update the mini browser display */
  _update_canvas()
  {
    this._canvas_context.drawWindow(this._canvas_browser.contentWindow,
                                    0, 0, 800, 600, "rgb(255,255,255)");
    this._mini_browser_counter += 1;
    if (this._mini_browser_counter == 5)
    {
      this._stop_canvas_updates();
    }
    else
    {
      this._mini_browser_timeout = setTimeout(
        event_binder(this._update_canvas, this),
        2000
      );
    }
  },

  /** Handle mouse moving into the canvas area by displaying the magnifier
   *
   * @param {MouseEvent} event - mouse over event
   */
  _on_canvas_mouse_over(event)
  {
    const canvas1 = this._canvas;
    const canvas = this._magnifier_canvas;
    const newx = Math.min(event.clientX - canvas1.offsetLeft + 12,
                          parseInt(canvas1.style.width, 10) - canvas.width - 2);
    const newy = Math.min(
      event.clientY - canvas1.offsetTop + 18,
      parseInt(canvas1.style.height, 10) - canvas.height - 5
    );

    this._magnifier.setAttribute("left", newx + "px");
    this._magnifier.setAttribute("top", newy + "px");
    this._magnifier.style.left = newx + "px";
    this._magnifier.style.top = newy + "px";

    const ctx = canvas.getContext("2d");
    const br = this._canvas_browser;
    ctx.drawWindow(br.contentWindow, 0, 0, 800, 600, "rgb(255,255,255)");
    this._magnifier.style.visibility = "visible";
  },

  /** Handle mouse moving over the canvas area by moving the magnified area
   *
   * @param {MouseEvent} event - mouse move event
   */
  _on_canvas_mouse_move(event)
  {
    const canvas = this._magnifier_canvas;
    const canvas1 = this._canvas;
    const newx1 = event.clientX - canvas1.offsetLeft;
    const newx = Math.min(newx1 + 12,
                          parseInt(canvas1.style.width, 10) - canvas.width - 2);

    const newy1 = event.clientY - canvas1.offsetTop;
    const newy = Math.min(
      newy1 + 18,
      parseInt(canvas1.style.height, 10) - canvas.height - 5
    );

    this._magnifier.setAttribute("left", newx + "px");
    this._magnifier.setAttribute("top", newy + "px");
    this._magnifier.style.left = newx + "px";
    this._magnifier.style.top = newy + "px";

    const ctx = canvas.getContext("2d");
    ctx.save();
    //eslint-disable-next-line no-mixed-operators
    ctx.translate(-(newx1 * 4.5 - 15), -(newy1 * 5.0 - 15));
    const br = this._canvas_browser;
    ctx.drawWindow(br.contentWindow, 0, 0, 800, 600, "rgb(255,255,255)");
    ctx.restore();
  },

  /** Handle mouse moving out of the canvas area by hiding the magnifier
   *
   * @param {MouseEvent} _event - mouse over event
   */
  _on_canvas_mouse_out(_event)
  {
    this._magnifier.style.visibility = "hidden";
  },

  /** Home link button pressed
   *
   * @param {MouseEvent} _event - click event
   */
  _view_home_page(_event)
  {
    this._options.open_url(this._current_feed.getAttribute("link"));
  },

  /** "Test Icon" button pressed.
   *
   * @param {XULCommandEvent} _event - command event
   */
  _set_icon(_event)
  {
    this._document.getElementById("inforss.rss.icon").src =
      this._document.getElementById("iconurl").value;
  },

  /** "Reset Icon" button pressed - fetches icon from web page.
   *
   * @param {XULCommandEvent} _event - command event
   */
  _reset_icon(_event)
  {
    if (this._icon_request != null)
    {
      this._icon_request.abort();
    }
    this._icon_request = new Page_Favicon(
      this._current_feed.getAttribute("link"),
      this._current_feed.getAttribute("user")
    );
    this._icon_request.fetch().then(
      icon =>
      {
        this._icon_request = null;
        this._document.getElementById("iconurl").value =
          icon === undefined ? this._config.Default_Feed_Icon : icon;
        this._set_icon();
      }
    ).catch(
      err =>
      {
        //Am not going to do anything if the request fails. It's not safe.
        console.log(err);
        this._icon_request = null;
      }
    );
  },

  /** HTML feed parser button pressed
   *
   * ignored @param {XULCommandEvent} event - command event
   */
  _html_parser(/*event*/)
  {
    const dialog = new Parse_HTML_Dialogue(
      this._document.defaultView,
      {
        url: this._current_feed.getAttribute("url"),
        user: this._current_feed.getAttribute("user"),
        regexp: this._current_feed.getAttribute("regexp"),
        regexpTitle: this._current_feed.getAttribute("regexpTitle"),
        regexpDescription: this._current_feed.getAttribute("regexpDescription"),
        regexpPubDate: this._current_feed.getAttribute("regexpPubDate"),
        regexpLink: this._current_feed.getAttribute("regexpLink"),
        regexpCategory: this._current_feed.getAttribute("regexpCategory"),
        regexpStartAfter: this._current_feed.getAttribute("regexpStartAfter"),
        regexpStopBefore: this._current_feed.getAttribute("regexpStopBefore"),
        htmlDirection: this._current_feed.getAttribute("htmlDirection"),
        encoding: this._current_feed.getAttribute("encoding")
      }
    );
    const results = dialog.results();
    if (results.valid)
    {
      for (const attr in results)
      {
        if (attr != "valid" && attr != "favicon")
        {
          this._current_feed.setAttribute(attr, results[attr]);
        }
      }
    }
  },

  /** Test the group icon
   *
   * ignored @param {XULCommandEvent} event - command event
   */
  _test_group_icon(/*event*/)
  {
    //FIXME really we should do this when the user moves out of the box
    this._document.getElementById("inforss.group.icon").src =
      this._document.getElementById("iconurlgroup").value;
  },

  /** Reset group icon to default
   *
   * ignored @param {XULCommandEvent} event - command event
   */
  _reset_group_icon(/*event*/)
  {
    const icon = this._config.feeds_defaults_group_icon;
    this._document.getElementById("iconurlgroup").value = icon;
    this._document.getElementById("inforss.group.icon").src = icon;
  },

  /** Show/hide playlist panel according to toggle
   *
   * ignored @param {XULCommandEvent} event - command event
   */
  _on_playlist_toggle(/*event*/)
  {
    this._document.getElementById("playListTabPanel").collapsed =
      this._playlist_toggle.selectedIndex == 1;
  },

  /** Move selected item up one position in playlist
   *
   * ignored @param {MouseEvent} event - click event
   */
  _playlist_move_up(/*event*/)
  {
    const selected = this._group_playlist.selectedItem;
    if (selected != null)
    {
      const previous = selected.previousSibling;
      if (previous != null)
      {
        this._group_playlist.insertBefore(selected, previous);
      }
    }
  },

  /** remove selected item from playlist
   *
   * ignored @param {MouseEvent} event - click event
   */
  _playlist_remove(/*event*/)
  {
    const selected = this._group_playlist.selectedItem;
    if (selected != null)
    {
      selected.remove();
    }
  },

  /** Add selected feed to playlist
   *
   * ignored @param {MouseEvent} event - click event
   */
  _playlist_add(/*event*/)
  {
    const selected = this._feeds_for_groups.selectedItem;
    if (selected == null)
    {
      return;
    }
    selected.childNodes[0].setAttribute("checked", true);
    this._add_details_to_playlist(
      "5",
      selected.childNodes[1].getAttribute("image"),
      selected.childNodes[1].getAttribute("label"),
      selected.childNodes[1].getAttribute("url")
    );
  },

  /** Move selected item down playlist
   *
   * ignored @param {MouseEvent} event - click event
   */
  _playlist_move_down(/*event*/)
  {
    const selected = this._group_playlist.selectedItem;
    if (selected != null)
    {
      const next = selected.nextSibling;
      if (next != null)
      {
        this._group_playlist.insertBefore(selected, next.nextSibling);
      }
    }
  },

  /** This updates the displayed group list, taking into account the view all/
      view selected state
   *
   * @param {Function} update - function to return whether or not to show
   *                            an item
   */
  _update_visible_group_list({ update = null } = {})
  {
    const view_all =
      this._document.getElementById("inforss.view.all").selectedIndex == 0;
    //The first item in the collection is a listcol. We don't want to fiddle
    //with that.
    let item = this._feeds_for_groups.firstChild.nextSibling;
    while (item != null)
    {
      if (update != null)
      {
        item.childNodes[0].setAttribute("checked", update(item));
      }
      item.hidden = ! (view_all ||
                       item.childNodes[0].getAttribute("checked") == "true");
      //browser issue - need to redisplay if we've unhidden
      item.parentNode.insertBefore(item, item.nextSibling);
      item = item.nextSibling;
    }
  },

  /** Set up the checkboxes for the displayed feed
   *
   * @param {RSS} feed - configuration of feed
   */
  _set_group_checkbox(feed)
  {
    const groups = Array.from(feed.getElementsByTagName("GROUP"));
    this._update_visible_group_list({
      update: item =>
      {
        const url = item.childNodes[1].getAttribute("url");
        return groups.find(elem => elem.getAttribute("url") == url) !==
          undefined;
      }
    });
  },

  /** Handle click on check all button
   *
   * @param {XULCommandEvent} event - command
   */
  _check_all(event)
  {
    const flag = event.target.getAttribute("checked") == "true";
    this._update_visible_group_list({ update: () => flag });
  },

  /** Handle selection on the show visible/invisible radio group
   *
   * ignored @param {Event} event - select event
   */
  _view_all(/*event*/)
  {
    this._update_visible_group_list();
  },

  /** Handle click on the tree object
   *
   * @param {MouseEvent} event - click event
   */
  _toggle_activation(event)
  {
    const tree = event.currentTarget;
    const row = {};
    const col = {};
    const type = {};
    tree.treeBoxObject.getCellAt(event.clientX, event.clientY, row, col, type);
    if (col.value == null || col.value.index != 0 || type.value != "image")
    {
      return;
    }
    //Get the cell from the tree
    const tree_row = tree.getElementsByTagName("treerow").item(row.value);
    const cell = tree_row.childNodes[col.value.index];

    cell.setAttribute("properties",
                      cell.getAttribute("properties") == "on" ? "off" : "on");

    this._current_feed.setAttribute("activity",
                                    cell.getAttribute("properties") == "on");
    this._options.update_report();
  },

});

