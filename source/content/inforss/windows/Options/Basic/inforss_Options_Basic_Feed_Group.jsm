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
// inforss_Options_Basic_Feed_Group
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------
/* jshint globalstrict: true */
/* eslint-disable strict */
"use strict";

/* eslint-disable array-bracket-newline */
/* exported EXPORTED_SYMBOLS */
const EXPORTED_SYMBOLS = [
  "Feed_Group", /* exported Feed_Group */
];
/* eslint-enable array-bracket-newline */

const { debug } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Debug.jsm",
  {}
);

const { Feed_Page } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Feed_Page.jsm",
  {}
);

const { NNTP_Handler } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_NNTP_Handler.jsm",
  {}
);

const { alert, confirm, prompt } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Prompt.jsm",
  {}
);

const {
  add_event_listeners,
  complete_assign,
  event_binder,
  set_node_disabled_state
} = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Utils.jsm",
  {}
);

const { get_string } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Version.jsm",
  {}
);

const { Capture_New_Feed_Dialogue } = Components.utils.import(
  "chrome://inforss/content/windows/inforss_Capture_New_Feed_Dialogue.jsm",
  {}
);

const { Parse_HTML_Dialogue } = Components.utils.import(
  "chrome://inforss/content/windows/inforss_Parse_HTML_Dialogue.jsm",
  {}
);

const { Filter } = Components.utils.import(
  "chrome://inforss/content/windows/Options/Basic/Feed_Group/" +
    "inforss_Options_Basic_Feed_Group_Filter.jsm",
  {}
);

const { General } = Components.utils.import(
  "chrome://inforss/content/windows/Options/Basic/Feed_Group/" +
    "inforss_Options_Basic_Feed_Group_General.jsm",
  {}
);

const { Settings } = Components.utils.import(
  "chrome://inforss/content/windows/Options/Basic/Feed_Group/" +
    "inforss_Options_Basic_Feed_Group_Settings.jsm",
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

const Priv_XMLHttpRequest = Components.Constructor(
  "@mozilla.org/xmlextras/xmlhttprequest;1",
  "nsIXMLHttpRequest");


/** Contains the code for the 'Basic' tab in the option screen
 *
 * @param {XMLDocument} document - the options window this._document
 * @param {Config} config - current configuration
 * @param {Options} options - base options screen class
 */
function Feed_Group(document, config, options)
{
  Base.call(this, document, config, options);

  //FIXME Just pass the URL ffs
  this._initial_selection = "arguments" in document.defaultView ?
    document.defaultView.arguments[0].getAttribute("url") :
    null;

  this._select_menu = document.getElementById("rss-select-menu");
  this._make_current_button = document.getElementById("inforss.make.current");
  this._remove_button = document.getElementById("inforss.remove");
  this._previous_button = document.getElementById("inforss.previous.rss");
  this._next_button = document.getElementById("inforss.next.rss");

  this._new_feed_button = document.getElementById("inforss.new.feed");

  this._listeners = add_event_listeners(
    this,
    document,
    [ this._select_menu, "command", this._select_feed ],
    [ this._previous_button, "click", this._select_previous ],
    [ this._next_button, "click", this._select_next ],
    [ this._make_current_button, "command", this._make_current ],
    [ this._remove_button, "command", this._remove_feed ],
    [ "new.feed", "command", this._new_feed ],
    [ "new.group", "command", this._new_group ]
  );

  this._tabs = [
    new General(document, config, options),
    new Filter(document, config, options),
    new Settings(document, config, options)
  ];
  //Do in this order to allow validate to throw back to the right tab
  this._general = this._tabs[0];
  this._request = null;
  this._displayed_feed = null;
}

const Super = Base.prototype;
Feed_Group.prototype = Object.create(Super);
Feed_Group.prototype.constructor = Feed_Group;

complete_assign(Feed_Group.prototype, {

  /** Config has been loaded
   *
   * @param {Config} config - new config
   */
  config_loaded(config)
  {
    Super.config_loaded.call(this, config);

    //Now we build the feed selection menu

    const menu = this._select_menu;
    menu.removeAllItems();

    {
      const select_folder = this._document.createElement("menupopup");
      select_folder.setAttribute("id", "rss-select-folder");
      this._menu_popup = select_folder;
      menu.appendChild(select_folder);
    }

    //Create the menu from the sorted list of feeds
    let idx = 0;
    let found = false;

    const feeds = Array.from(this._config.get_all()).sort(
      (first, second) =>
        first.getAttribute("title").toLowerCase() >
          second.getAttribute("title").toLowerCase());

    for (const feed of feeds)
    {
      this._add_feed(feed);

      if (! found)
      {
        if (this._initial_selection === null)
        {
          if (feed.getAttribute("selected") == "true")
          {
            menu.selectedIndex = idx;
            found = true;
          }
        }
        else if (this._initial_selection === feed.getAttribute("url"))
        {
          menu.selectedIndex = idx;
          found = true;
        }
      }

      idx += 1;
    }

    if (feeds.length == 0)
    {
      this._show_no_feed();
    }
    else
    {
      if (! found)
      {
        menu.selectedIndex = 0;
      }
      this._redisplay_selected_feed();
    }

    //The first time we reload the config, we'll use what the user selected.
    //Any subsequent time, all bets are off
    this._initial_selection = null;
  },

  /** Validate contents of tab
   *
   * @returns {boolean} true if all is OK
   */
  validate()
  {
    if (this._displayed_feed != null)
    {
      let index = 0;
      for (const tab of this._tabs)
      {
        if (! tab.validate(this._displayed_feed))
        {
          this._document.getElementById("inforss.gefise").selectedIndex = index;
          this._select_menu.selectedItem = this._old_item;
          return false;
        }
        index += 1;
      }
    }
    return true;
  },

  /** Update configuration from tab */
  update()
  {
    if (this._displayed_feed != null)
    {
      Super.update.call(this, this._displayed_feed);
      //because changing the URL of a feed is a sensible thing to do...
      this._old_item.setAttribute("url",
                                  this._displayed_feed.getAttribute("url"));
    }
  },

  /** Clean up nicely on window close */
  dispose()
  {
    if (this._request != null)
    {
      this._request.abort();
      this._request = null;
    }
    Super.dispose.call(this);
  },

  /** New feed has been added
   *
   * @param {RSS} feed_config - config of added feed
   */
  add_feed(feed_config)
  {
    this._add_feed(feed_config);
    Super.add_feed.call(this, feed_config);
  },

  /** Deal with feed selection from popup menu
   *
   * ignored @param {XULCommandEvent} event - menu selection event
   */
  _select_feed(/*event*/)
  {
    if (this.validate())
    {
      this._show_selected_feed();
    }
  },

  /** 'select next' button - selects next feed (alpha order of title)
   *
   * @param {MouseEvent} event - button click event
   */
  _select_next(event)
  {
    if (! event.target.disabled && this.validate())
    {
      this._select_menu.selectedIndex += 1;
      this._show_selected_feed();
    }
  },

  /** 'select previous' button - selects previous feed (alpha order of title)
   *
   * @param {MouseEvent} event - button click event
   */
  _select_previous(event)
  {
    if (! event.target.disabled && this.validate())
    {
      this._select_menu.selectedIndex -= 1;
      this._show_selected_feed();
    }
  },

  /** Show the selected feed */
  _show_selected_feed()
  {
    if (this._displayed_feed != null)
    {
      this.update();
    }
    this._redisplay_selected_feed();
  },

  /** Configuration has been changed for specified feed. Update display
   *
   * @param {string} url - url of feed being changed
   */
  redisplay_feed(url)
  {
    if (this._select_menu.selectedItem.getAttribute("url") == url)
    {
      this._redisplay_selected_feed();
    }
  },

  /** Display the current feed
   *
   * This is mainly to allow the feed to be redisplayed after something from
   * the advanced menu has changed things.
   *
   */
  _redisplay_selected_feed()
  {
    const url = this._select_menu.selectedItem.getAttribute("url");

    this._displayed_feed = this._config.get_item_from_url(url);

    this._enable_tab();

    if (this._displayed_feed.getAttribute("selected") == "true")
    {
      this._make_current_button.disabled = true;
      this._document.getElementById(
        "inforss.feed-group.details").style.backgroundColor =
          "rgb(192,255,192)";
    }
    else
    {
      this._make_current_button.disabled = false;
      this._document.getElementById(
        "inforss.feed-group.details").style.backgroundColor = "inherit";
    }

    this._remove_button.disabled = false;

    //This should be kicked off after we've fetched any filter information
    //maybe
    //FIXME call base? we don't have a display in there.
    for (const tab of this._tabs)
    {
      tab.display(this._displayed_feed);
    }

    //Set up the next and previous buttons
    const which = this._select_menu.selectedIndex;

    if (which == 0)
    {
      this._previous_button.disabled = true;
      this._previous_button.childNodes[0].hidden = true;
    }
    else
    {
      this._previous_button.disabled = false;
      this._previous_button.childNodes[0].hidden = false;
    }

    if (which == this._menu_popup.childNodes.length - 1)
    {
      this._next_button.disabled = true;
      this._next_button.childNodes[0].hidden = true;
    }
    else
    {
      this._next_button.disabled = false;
      this._next_button.childNodes[0].hidden = false;
    }

    //Save this because it's currently allowed to change the url from the option
    //screen. Like this is a good idea...
    this._old_item = this._select_menu.selectedItem;
  },

  /** 'new feed' button - creates a new feed
   *
   * ignored @param {XULCommandEvent} event - button click event
   */
  _new_feed(/*event*/)
  {
    if (! this.validate())
    {
      return;
    }

    const response = new Capture_New_Feed_Dialogue(
      this._document.defaultView).results();

    if (! response.valid)
    {
      return;
    }

    const type = response.type;
    if (this._feed_exists(response.url))
    {
      alert(get_string(
        type == "nntp" ? "nntp.alreadyexists" : "rss.alreadyexists"
      ));
      return;
    }

    switch (type)
    {
      default:
        throw new Error("Unexpected feed type " + type);

      case "html":
        this._new_html_feed(response);
        break;

      case "nntp":
        this._new_nntp_feed(response);
        break;

      case "rss":
        this._new_rss_feed(response);
        break;
    }
  },

  /** Create an html (page scraping) feed
   *
   * Note that most of the work is done in the dialogue, we just fetch the
   * page here to make sure it exists
   *
   * @param {Object} response - user input from screen
   */
  _new_html_feed(response)
  {
    if (this._request != null)
    {
      this._request.abort();
      this._request = null;
    }

    const request = new Priv_XMLHttpRequest();
    request.open("GET", response.url, true, response.user, response.password);
    request.timeout = 10000;
    request.ontimeout = event_binder(this._html_timeout, this);
    request.onerror = event_binder(this._html_timeout, this);
    request.onload = event_binder(this._add_html_feed, this, response);
    request.send();
    this._new_feed_button.disabled = true;
    this._request = request;
  },

  /** Timeout or error on fetching HTML page
   *
   * ignored @param {ProgressEvent} event - error
   */
  _html_timeout(/*event*/)
  {
    this._request = null;
    this._new_feed_button.disabled = false;
    alert(get_string("feed.issue"));
  },

  /** Add an nntp feed after succesfully checking we can access it.
   *
   * @param {Object} response - user input from screen
   * @param {ProgressEvent} event - result of http request
   */
  _add_html_feed(response, event)
  {
    try
    {
      this._request = null;

      if (event.target.status != 200)
      {
        alert(get_string("feed.issue"));
        return;
      }

      const result = new Parse_HTML_Dialogue(
        this._document.defaultView,
        {
          url: response.url,
          user: response.user,
          password: response.password
        }
      ).results();
      if (! result.valid)
      {
        return;
      }

      const rss = this._config.add_item(response.title,
                                        null, //description
                                        response.url,
                                        null, //link
                                        response.user,
                                        response.password,
                                        "html",
                                        result.favicon);

      for (const attr in result)
      {
        if (attr != "valid" && attr != "favicon")
        {
          rss.setAttribute(attr, result[attr]);
        }
      }

      this._add_and_select_feed(rss);
    }
    catch (err)
    {
      debug(err);
    }
    finally
    {
      this._new_feed_button.disabled = false;
    }
  },

  /** Create an nntp (news) feed
   *
   * @param {Object} response - user input from screen
   */
  _new_nntp_feed(response)
  {
    try
    {
      const nntp = new NNTP_Handler(response.url,
                                    response.user,
                                    response.password);
      this._new_feed_button.disabled = true;
      nntp.open().then(
        () => this._add_nntp_feed(response, nntp.host, nntp.group)
      ).catch(
        //This blocks which is not ideal.
        status => alert(get_string(status))
      ).then( //finally
        () =>
        {
          this._new_feed_button.disabled = false;
          nntp.close();
        }
      );
    }
    catch (err)
    {
      console.log(err);
      alert(get_string("nntp.malformedurl"));
    }
  },

  /** Add an nntp feed after succesfully checking we can access it.
   *
   * @param {Object} response - user input from screen
   * @param {string} url - url of feed
   * @param {string} group - news group
   */
  _add_nntp_feed(response, url, group)
  {
    //FIXME I shouldn't need a try/catch here.
    try
    {
      const domain = url.substring(url.indexOf("."));
      const rss = this._config.add_item(response.title,
                                        group,
                                        response.url,
                                        "http://www" + domain,
                                        response.user,
                                        response.password,
                                        "nntp",
                                        "chrome://inforss/skin/nntp.png");

      this._add_and_select_feed(rss);
    }
    catch (err)
    {
      debug(err);
    }
  },

  /** Create an RSS / Atom feed
   *
   * @param {Object} response - user input from screen
   */
  _new_rss_feed(response)
  {
    if (this._request != null)
    {
      this._request.abort();
      this._request = null;
    }

    this._request = new Feed_Page(
      response.url,
      { user: response.user, password: response.password, fetch_icon: true }
    );
    this._new_feed_button.disabled = true;
    this._request.fetch().then(
      () => this._add_rss_feed(this._request)
    ).catch(
      err =>
      {
        console.log(err);
        alert(get_string("feed.issue"));
      }
    ).then( //finally
      () =>
      {
        this._request = null;
        this._new_feed_button.disabled = false;
      }
    );
  },

  /** Add an rss feed after succesfully checking we can access it.
   *
   * @param {Feed_Page} request - feed info
   */
  _add_rss_feed(request)
  {
    const rss = this._config.add_item(request.title,
                                      request.description,
                                      request.url,
                                      request.link,
                                      request.user,
                                      request.password,
                                      request.type,
                                      request.icon);

    this._add_and_select_feed(rss);
  },

  /** Add new feed to popup menu and select it
   *
   * @param {RSS} feed - feed to add. Currently this goes to the end of the menu
   */
  _add_and_select_feed(feed)
  {
    this._options.add_feed(feed);

    this._select_menu.selectedIndex = this._menu_popup.childNodes.length - 1;

    this._show_selected_feed();
  },

  /** Adds new feed to menus
   *
   * @param {RSS} feed - feed to add
   */
  _add_feed(feed)
  {
    const element = this._select_menu.appendItem(feed.getAttribute("title"));
    element.setAttribute("class", "menuitem-iconic");
    element.setAttribute("image", feed.getAttribute("icon"));

    //These two lines are dodgy as adding user detail to dom element
    element.setAttribute("url", feed.getAttribute("url"));
    if (feed.hasAttribute("user"))
    {
      element.setAttribute("user", feed.getAttribute("user"));
    }
  },

  /** 'new group' button - creates a new group
   *
   * ignored @param {XULCommandEvent} event - button click event
   */
  _new_group(/*event*/)
  {
    if (! this.validate())
    {
      return;
    }

    const name = prompt("group.newgroup", "");
    if (name == null || name == "")
    {
      return;
    }

    if (this._feed_exists(name))
    {
      alert(get_string("group.alreadyexists"));
      return;
    }

    const rss = this._config.add_group(name);

    this._add_and_select_feed(rss);
  },

  /** 'make current' button - sets currently display feed as the current
   * feed
   *
   * ignored @param {XULCommandEvent} event - button activated event
   */
  _make_current(/*event*/)
  {
    for (const item of this._config.get_all())
    {
      item.setAttribute("selected", item == this._displayed_feed);
    }
    this._make_current_button.disabled = true;
    this._options.new_current_feed();
    //on linux at least if you have the current feed shown, the page displays
    //in green when you are showing the default feed
    //Doesn't seem to work in windows.
    //FIXME also this string occurs twice
    this._document.getElementById(
      "inforss.feed-group.details").style.backgroundColor = "rgb(192,255,192)";
  },

  /** 'remove feed' button - removes displayed feed
   *
   * ignored @param {XULCommandEvent} event - button activated event
   */
  _remove_feed(/*event*/)
  {
    {
      //Check they actually mean to do this...
      const key = this._displayed_feed.getAttribute("type") == "group" ?
        "group.removeconfirm" :
        "rss.removeconfirm";

      if (! confirm(key))
      {
        return;
      }
    }

    const menu = this._select_menu;
    menu.selectedItem.remove();

    const url = this._displayed_feed.getAttribute("url");
    this._config.remove_feed(url);
    this._options.remove_feed(url);

    this._displayed_feed = null;

    if (this._menu_popup.childNodes.length == 0)
    {
      this._show_no_feed();
    }
    else
    {
      //Select first feed.
      menu.selectedIndex = 0;
      this._show_selected_feed();
    }
  },

  /** Check if we already have a feed for specified url
   *
   * @param {string} url - feed url to checked
   *
   * @returns {boolean} true if the feed is configured, false otherwise
   */
  _feed_exists(url)
  {
    return this._config.get_item_from_url(url) != null;
  },

  /** No feed is selected. Cry */
  _show_no_feed()
  {
    //No feeds to display
    this._displayed_feed = null;
    this._make_current_button.disabled = true;
    this._remove_button.disabled = true;
    this._disable_tab();
    this._next_button.childNodes[0].hidden = true;
    this._previous_button.childNodes[0].hidden = true;
  },

  /** Disable the whole feed/group tab */
  _disable_tab()
  {
    //this arguably works better than hiding, but should disable the activity
    //info, check and uncheck all and stop the browser window in general tab
    //Also perhaps should clear the fields out but that might be OK to leave.
    const node = this._document.getElementById("inforss.feed-group.details");
    set_node_disabled_state(node, true);
  },

  /** Enable/disable the whole feed/group tab */
  _enable_tab()
  {
    //this arguably works better than hiding, but should disable the activity
    //info, check and uncheck all and stop the browser window in general tab
    //Also perhaps should clear the fields out but that might be OK to leave.
    const node = this._document.getElementById("inforss.feed-group.details");
    set_node_disabled_state(node, false);
  },

});
