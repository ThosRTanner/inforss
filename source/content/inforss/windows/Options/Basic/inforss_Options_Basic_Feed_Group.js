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
// inforss_Options_Basic_Feed_Group.js
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------

/* exported inforss_Options_Basic_Feed_Group */

/* eslint-disable array-bracket-newline */
/* exported EXPORTED_SYMBOLS */
//const EXPORTED_SYMBOLS = [
//  "Feed_Group", /* exported Feed_Group */
//];
/* eslint-enable array-bracket-newline */

/* eslint-disable strict, no-empty-function */

//This is all indicative of brokenness

/* globals currentRSS:true, gNbRss:true, gRemovedUrls, selectRSS1 */
/* globals gTimeout, refreshCount:true */

var inforss = inforss || {};

Components.utils.import("chrome://inforss/content/modules/inforss_Utils.jsm",
                        inforss);

Components.utils.import("chrome://inforss/content/modules/inforss_Prompt.jsm",
                        inforss);

/** Contains the code for the 'Basic' tab in the option screen
 *
 * @param {XMLDocument} document - the options window this._document
 * @param {Config} config - current configuration
 */
function inforss_Options_Basic_Feed_Group(document, config)
{
  this._document = document;
  this._config = config;

  //FIXME Just pass the URL ffs
  this._initial_selection = "arguments" in document.defaultView ?
    document.defaultView.arguments[0].getAttribute("url") :
    null;

  this._select_menu = document.getElementById("rss-select-menu");
  this._make_current_button = document.getElementById("inforss.make.current");
  this._remove_button = document.getElementById("inforss.remove");

  this._listeners = inforss.add_event_listeners(
    this,
    this._document,
    [ this._select_menu, "command", this._select_feed ],
    [ "previous.rss", "click", this._select_previous ],
    [ "next.rss", "click", this._select_next ],
    [ this._make_current_button, "command", this._make_current ],
    [ this._remove_button, "command", this._remove_feed ],
    [ "new.feed", "command", this._new_feed ],
    [ "new.group", "command", this._new_group ]
  );

  //Do in this order to allow validate to throw back to the right tab
  this._general = new inforss_Options_Basic_Feed_Group_General(document, config);
  this._tabs = [
    this._general,
    new inforss_Options_Basic_Feed_Group_Filter(document, config),
    new inforss_Options_Basic_Feed_Group_Settings(document, config)
  ];

  this._request = null;
}

inforss_Options_Basic_Feed_Group.prototype = {

  /** Config has been loaded */
  config_loaded()
  {
    for (const tab of this._tabs)
    {
      tab.config_loaded();
    }
    this._update_buttons();

    //Now we build the feed selection menu

    const menu = this._select_menu;
    menu.removeAllItems();

    {
      const selectFolder = this._document.createElement("menupopup");
      selectFolder.setAttribute("id", "rss-select-folder");
      menu.appendChild(selectFolder);
    }

    //Create the menu from the sorted list of feeds
    let idx = 0;
    const feeds = Array.from(this._config.get_all()).sort(
      (first, second) =>
        first.getAttribute("title").toLowerCase() >
          second.getAttribute("title").toLowerCase());

    for (const feed of feeds)
    {
      this._add_feed(feed);

      if (this._initial_selection === null)
      {
        if (feed.getAttribute("selected") == "true")
        {
          menu.selectedIndex = idx;
        }
      }
      else
      {
        //eslint-disable-next-line no-lonely-if
        if (feed.getAttribute("url") == this._initial_selection)
        {
          menu.selectedIndex = idx;
        }
      }
      idx += 1;
    }

    if (feeds.length != 0)
    {
      this._show_selected_feed();
    }
  },

  /** Validate contents of tab
   *
   * @returns {boolean} true if all is OK
   */
  validate()
  {
    if (currentRSS != null)
    {
      let index = 0;
      for (const tab of this._tabs)
      {
        if (! tab.validate(currentRSS))
        {
          this._document.getElementById("inforss.gefise").selectedIndex = index;
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
    //FIXME Really?
    if (currentRSS != null)
    {
      for (const tab of this._tabs)
      {
        tab.update(currentRSS);
      }
    }
  },

  /** Clean up nicely on window close */
  dispose()
  {
    for (const tab of this._tabs)
    {
      tab.dispose();
    }
    inforss.remove_event_listeners(this._listeners);
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
    const feed = this._select_menu.selectedItem;
    selectRSS1(feed.getAttribute("url"));
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

    const response = new inforss.Capture_New_Feed_Dialogue(
      this._document.defaultView).results();

    if (! response.valid)
    {
      return;
    }

    const type = response.type;
    if (this._feed_exists(response.url))
    {
      inforss.alert(inforss.get_string(
        type == "nntp" ? "nntp.alreadyexists" : "rss.alreadyexists"
      ));
      return;
    }

    switch (type)
    {
      default:
        throw new Error("Unexpected feed type " + type);

      case "html":
        this._new_rss_feed(response);
        break;

      case "nntp":
        this._new_nntp_feed(response);
        break;

      case "rss":
        this._new_rss_feed(response);
        break;
    }
  },


        /*
      case "html":
        {

          if (gRssXmlHttpRequest != null)
          {
            gRssXmlHttpRequest.abort();
          }

          gRssXmlHttpRequest = new inforssPriv_XMLHttpRequest();
          gRssXmlHttpRequest.open("GET", url, true, user, password);
          //FIXME This should NOT set fields in the request object
          gRssXmlHttpRequest.url = url;
          gRssXmlHttpRequest.user = user;
          gRssXmlHttpRequest.title = title;
          gRssXmlHttpRequest.password = password;
          gRssXmlHttpRequest.timeout = 10000;
          gRssXmlHttpRequest.ontimeout = rssTimeout;
          gRssXmlHttpRequest.onerror = rssTimeout;
          this._document.getElementById("inforss.new.feed").disabled = true;
          gRssXmlHttpRequest.feedType = type;
          gRssXmlHttpRequest.onload = processHtml;
          gRssXmlHttpRequest.send();
        }
        break;
        */

  /** Create an nntp (news feed)
   *
   * @param {Object} response - user input from screen
   */
  _new_nntp_feed(response)
  {
    try
    {
      const nntp = new inforss.NNTP_Handler(response.url,
                                            response.user,
                                            response.password);
      this._document.getElementById("inforss.new.feed").disabled = true;
      nntp.open().then(
        () => this._add_nntp_feed(response, nntp.host, nntp.group)
      ).catch(
        //This blocks which is not ideal.
        status => inforss.alert(inforss.get_string(status))
      ).then( //finally
        () =>
        {
          this._document.getElementById("inforss.new.feed").disabled = false;
          nntp.close();
        }
      );
    }
    catch (err)
    {
      console.log(err);
      inforss.alert(inforss.get_string("nntp.malformedurl"));
    }
  },

  /** Add an nntp feed after succesfully checking we can access it.
   *
   * @param {Object} response - user input from screen
   * @param {string} url - url of feed
   * @param {string} group - nntp group
   */
  _add_nntp_feed(response, url, group)
  {
    //FIXME I shouldn't need a try/catch here.
    try
    {
      const domain = url.substring(url.indexOf("."));
      const rss = this._config.add_item(
        response.title,
        group,
        response.url,
        "http://www" + domain,
        response.user,
        response.password,
        "nntp",
        "chrome://inforss/skin/nntp.png");


      this._add_and_select_feed(rss);

      //FIXME Repeated in processRss and processHTML almost identical
      //FIXME Why is this doing 'group'?
      this._document.getElementById("inforss.group.treecell1").parentNode.setAttribute("url", rss.getAttribute("url"));
      this._document.getElementById("inforss.group.treecell1").setAttribute("properties", "on");
      this._document.getElementById("inforss.group.treecell2").setAttribute("properties", "inactive");
      this._document.getElementById("inforss.group.treecell3").setAttribute("label", "");
      this._document.getElementById("inforss.group.treecell4").setAttribute("label", "");
      this._document.getElementById("inforss.group.treecell5").setAttribute("label", "");
    }
    catch (err)
    {
      inforss.debug(err);
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
    }

    this._request = new inforss.Feed_Page(
      response.url,
      { user: response.user, password: response.password, fetch_icon: true }
    );
    this._document.getElementById("inforss.new.feed").disabled = true;
    this._request.fetch().then(
      () => this._add_rss_feed(this._request)
    ).catch(
      err =>
      {
        console.log(err)
        inforss.alert(inforss.get_string("feed.issue"));
      }
    ).then( //finally
      () =>
      {
        this._request = null;
        this._document.getElementById("inforss.new.feed").disabled = false;
      }
    );
  },

  /** Add an rss feed after succesfully checking we can access it.
   *
   * @param {Feed_Page} response - feed info
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

    //FIXME mega repeated stuff
    this._document.getElementById("inforss.feed.row1").setAttribute("selected", "false");
    this._document.getElementById("inforss.feed.row1").setAttribute("url", rss.getAttribute("url"));
    this._document.getElementById("inforss.feed.treecell1").setAttribute("properties", (rss.getAttribute("activity") == "true") ? "on" : "off");
    this._document.getElementById("inforss.feed.treecell2").setAttribute("properties", "inactive");
    this._document.getElementById("inforss.feed.treecell3").setAttribute("label", "");
    this._document.getElementById("inforss.feed.treecell4").setAttribute("label", "");
    this._document.getElementById("inforss.feed.treecell5").setAttribute("label", "");
    this._document.getElementById("inforss.feed.treecell6").setAttribute("label", "");
    this._document.getElementById("inforss.feed.treecell7").setAttribute("label", "");
    this._document.getElementById("inforss.feed.treecell8").setAttribute("label", "N");
  },

  /** Add new feed to popup menu and select it
   *
   * @param {RSS} feed - feed to add. Currently this goes to the end of the menu
   */
  _add_and_select_feed(feed)
  {
    this._add_feed(feed);

    this._document.getElementById("rss-select-menu").selectedIndex = gNbRss;
    gNbRss += 1;

    this._show_selected_feed();

    //FIXME comes fro advanced menu so needs to go via parent
    //FIXME Should be in _add_feed
    add_feed_to_apply_list(feed);
  },

  /** Adds new feed to menus
   *
   * @param {RSS} feed - feed to add
   */
  _add_feed(feed)
  {
    //The 2nd param to appenditem appears to be somewhat random in the case of
    //the existing code
    const element = this._select_menu.appendItem(feed.getAttribute("title")/*,
                                                 feed.getAttribute("type")*/);
    element.setAttribute("class", "menuitem-iconic");
    element.setAttribute("image", feed.getAttribute("icon"));

    //These two lines are dodgy as adding user detail to dom element
    element.setAttribute("url", feed.getAttribute("url"));
    if (feed.hasAttribute("user"))
    {
      element.setAttribute("user", feed.getAttribute("user"));
    }

    if (feed.getAttribute("type") != "group")
    {
      this._general.add_feed(feed);
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

    const name = inforss.prompt("group.newgroup", "");
    if (name == null || name == "")
    {
      return;
    }

    if (this._feed_exists(name))
    {
      inforss.alert(inforss.get_string("group.alreadyexists"));
      return;
    }

    const rss = this._config.add_group(name);
    this._update_buttons();

    //FIXME I think this is the same for all types (nearly)
    //Add to the popup menu
    this._add_and_select_feed(rss);

    //FIXME Repeated in processRss and processHTML almost identical
    //FIXME Why do we need to do this? Shouldn't selectrss handle it?
    this._document.getElementById("inforss.group.treecell1").parentNode.setAttribute("url", rss.getAttribute("url"));
    this._document.getElementById("inforss.group.treecell1").setAttribute("properties", "on");
    this._document.getElementById("inforss.group.treecell2").setAttribute("properties", "inactive");
    this._document.getElementById("inforss.group.treecell3").setAttribute("label", "");
    this._document.getElementById("inforss.group.treecell4").setAttribute("label", "");
    this._document.getElementById("inforss.group.treecell5").setAttribute("label", "");
  },

  /** 'make current' button - sets currently display feed as the current
   * feed
   *
   * ignored @param {XULCommandEvent} event - button activated event
   */
  _make_current(/*event*/)
  {
    //Why doesn't this set currentRSS (which is a global)
    for (const item of this._config.get_all())
    {
      item.setAttribute("selected", item == currentRSS);
    }
    if (currentRSS != null)
    {
      this._document.getElementById("inforss.make.current").disabled = true;

      //on linux at least if you have the current feed shown, the page displays
      //in green when you are showing the default feed
      //Doesn't seem to work in windows.
      //FIXME also this string occurs twice
      this._document.getElementById(
        "inforss.feed-group.details").style.backgroundColor =
        "rgb(192,255,192)";
    }
  },

  /** 'remove feed' button - removes displayed feed
   *
   * ignored @param {XULCommandEvent} event - button activated event
   */
  _remove_feed(/*event*/)
  {
    //FIXME I don't believe this can happen any more because the button will
    //be disabled. In which case DELETE THE STRING
    /*
    if (currentRSS == null)
    {
      inforss.alert(inforss.get_string("group.selectfirst"));
      return;
    }
*/

    {
      const key = currentRSS.getAttribute("type") == "group" ?
        "group.removeconfirm" :
        "rss.removeconfirm";

      if (! inforss.confirm(key))
      {
        return;
      }
    }

    //Stop updating the display.
    window.clearTimeout(gTimeout);
    refreshCount = 0;

    const menu = this._select_menu;
    menu.selectedItem.remove();

    const url = currentRSS.getAttribute("url");
    gRemovedUrls.push(url);
    this._config.remove_feed(url);
    this._update_buttons();

    this._general.remove_feed(currentRSS);
    //FIXME - also needs to be removed from the list in advanced/defaultvalues

    currentRSS = null;
    gNbRss -= 1; //??? Remove this, is list.childNodes.length
    const list = this._document.getElementById("rss-select-folder");
    if (list.childNodes.length != 0)
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

  /** Update the display of feeds and the make current/delete appropriateley */
  _update_buttons()
  {
    if (this._config.get_all().length == 0)
    {
      //No feeds to display
      this._document.getElementById("inforss.feed-group.details").hidden = true;
      this._document.getElementById("inforss.feed-group.empty").hidden = false;
      this._make_current_button.disabled = true;
      this._remove_button.disabled = true;
    }
    else
    {
      //Some feeds
      this._document.getElementById("inforss.feed-group.details").hidden = false;
      this._document.getElementById("inforss.feed-group.empty").hidden = true;
      this._make_current_button.disabled = false;
      this._remove_button.disabled = false;
    }
  },
};