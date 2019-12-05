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
// inforss_Options_Basic.js
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------

/* exported inforss_Options_Basic_Feed_Group */

/* eslint-disable array-bracket-newline */
/* exported EXPORTED_SYMBOLS */
//const EXPORTED_SYMBOLS = [
//  "inforss_Options_Basic_Feed_Group", /* exported inforss_Options_Basic_Feed_Group */
//];
/* eslint-enable array-bracket-newline */

/* eslint-disable strict, no-empty-function */

//This is all indicative of brokenness

/* globals currentRSS:true, gNbRss:true, gRemovedUrls, selectRSS */

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
  this._bfg_listeners = inforss.add_event_listeners(
    this,
    this._document,
    [ "make.current", "click", this._make_current ],
    [ "remove", "click", this._remove_feed ]
  );

  //feed group popup
  //feed group arrows
  //new feed button
  //new group button

  //->> general tab
  //->> filter tab
  //->> settings tab
  this._tabs = [];
}

inforss_Options_Basic_Feed_Group.prototype = {

  /** Config has been loaded */
  config_loaded()
  {
    //FIXME This is wrong.
    const selected_feed = this._Basic__Feed_Group__General__config_loaded();
    this._Basic__Feed_Group__Filter__config_loaded();
    this._Basic__Feed_Group__Settings__config_loaded();
    //FIXME This should be called elsewhere I think and then go through
    //'display' functions throughout
    if (selected_feed != null)
    {
      selectRSS1(selected_feed.getAttribute("url"), selected_feed.getAttribute("user"));
    }

    for (const tab of this._tabs)
    {
      tab.config_loaded();
    }
  },

  /** Validate contents of tab
   *
   * @returns {boolean} true as there's nothing here to validate
   */
  validate()
  {
    for (const tab of this._tabs)
    {
      if (! tab.validate())
      {
        return false;
      }
    }
    return true;
  },

  /** Update configuration from tab */
  update()
  {
    for (const tab of this._tabs)
    {
      tab.update();
    }
  },

  /** Clean up nicely on window close */
  dispose()
  {
    for (const tab of this._tabs)
    {
      tab.dispose();
    }
    inforss.remove_event_listeners(this._bfg_listeners);
  },

  /** 'make current' button - sets currently display feed as the current
   * feed
   *
   * ignored @param {MouseEvent} event - button click event
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
      //also this occurs twice
      this._document.getElementById("inforss.make.current.background"
        ).style.backgroundColor = "#c0ffc0"; //"rgb(192,255,192)";
    }
  },

  /** 'remove feed' button - removes displayed feed
   *
   * ignored @param {MouseEvent} event - button click event
   */
  _remove_feed(/*event*/)
  {
    if (currentRSS == null)
    {
      inforss.alert(inforss.get_string("group.selectfirst"));
      return;
    }

    {
      const key = currentRSS.getAttribute("type") == "group" ?
        "group.removeconfirm" :
        "rss.removeconfirm";

      if (! inforss.confirm(key))
      {
        return;
      }
    }

    const menu = this._document.getElementById("rss-select-menu");
    menu.selectedItem.remove();

    const url = currentRSS.getAttribute("url");
    gRemovedUrls.push(url);
    this._config.remove_feed(url);

    //FIXME WTF does this do?
    //Firstly, it belongs in the 'general' tab.
    //OK, it's removing this feed (by title) from the list of feeds that can
    //be added to groups. This is broken as it is possible to have 2 feeds with
    //the same name. Added to issues.
    if (currentRSS.getAttribute("type") != "group")
    {
      const listbox = this._document.getElementById("group-list-rss");
      for (let listitem = listbox.firstChild.nextSibling; //skip listcols node
           listitem != null;
           listitem = listitem.nextSibling)
      {
        const label = listitem.childNodes[1];
        if (label.getAttribute("value") == currentRSS.getAttribute("title"))
        {
          listbox.removeChild(listitem);
          break;
        }
      }
    }

    currentRSS = null;
    gNbRss -= 1; //??? Remove this, is list.childNodes.length
    const list = this._document.getElementById("rss-select-folder");
    if (list.childNodes.length != 0)
    {
      //Select first feed.
      menu.selectedIndex = 0;
      selectRSS(list.firstChild);
    }
  },

  /** 'new group' button - creates a new group
   *
   * @param {MouseEvent} event - button click event
   */
  _new_group(event)
  {
/**/console.log(event)
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

    //FIXME I think this is the same for all types (nearly)
    //Add to the popup menu
    const element =
      this._document.getElementById("rss-select-menu").appendItem(name,
                                                                  "newgroup");
    element.setAttribute("class", "menuitem-iconic");
    element.setAttribute("image", rss.getAttribute("icon"));
    element.setAttribute("url", name);

    //And select it.
    this._document.getElementById("rss-select-menu").selectedIndex = gNbRss;
    gNbRss += 1;
    selectRSS(element);

    this._document.getElementById("inforss.group.treecell1").parentNode.setAttribute("url", rss.getAttribute("url"));
    this._document.getElementById("inforss.group.treecell1").setAttribute("properties", "on");
    this._document.getElementById("inforss.group.treecell2").setAttribute("properties", "inactive");
    this._document.getElementById("inforss.group.treecell3").setAttribute("label", "");
    this._document.getElementById("inforss.group.treecell4").setAttribute("label", "");
    this._document.getElementById("inforss.group.treecell5").setAttribute("label", "");
  },

  _feed_exists(url)
  {
    return this._config.get_item_from_url(url) != null;
  },

//----------------------------------------------------------------------------------

  //Build the popup menu
  _Basic__Feed_Group__General__config_loaded()
  {
    //It appears that because xul has already got its fingers on this, we can't
    //dynamically replace
    //This is the list of feeds in a group displayed when a group is selectd
    {
      let list2 = this._document.getElementById("group-list-rss");
      let listcols = list2.firstChild;
      inforss.remove_all_children(list2);
      list2.appendChild(listcols);
    }

    //If we don't do this here, it seems to screw stuff up for the 1st group.
    for (const feed of this._config.get_feeds())
    {
      add_feed_to_group_list(feed);
    }

    //Now we build the selection menu under basic: feed/group

    const menu = this._document.getElementById("rss-select-menu");
    menu.removeAllItems();

    {
      const selectFolder = this._document.createElement("menupopup");
      selectFolder.setAttribute("id", "rss-select-folder");
      menu.appendChild(selectFolder);
    }

    var selected_feed = null;

    //Create the menu from the sorted list of feeds
    let i = 0;
    const feeds = Array.from(this._config.get_all()).sort((a, b) =>
      a.getAttribute("title").toLowerCase() > b.getAttribute("title").toLowerCase());

    for (const feed of feeds)
    {
      const element = menu.appendItem(feed.getAttribute("title"), "rss_" + i);

      element.setAttribute("class", "menuitem-iconic");
      element.setAttribute("image", feed.getAttribute("icon"));

      element.setAttribute("url", feed.getAttribute("url"));

      if (feed.hasAttribute("user"))
      {
        element.setAttribute("user", feed.getAttribute("user"));
      }

      if ('arguments' in window)
      {
        if (feed.getAttribute("url") == window.arguments[0].getAttribute("url"))
        {
          selected_feed = element;
          menu.selectedIndex = i;
        }
      }
      else
      {
        if (feed.getAttribute("selected") == "true")
        {
          selected_feed = element;
          menu.selectedIndex = i;
        }
      }
      i += 1;
    }
    return selected_feed;
  },

  _Basic__Feed_Group__Filter__config_loaded()
  {
    //This shouldn't be necessary - if this was split up into classes, we would
    //do this bit in the constructor of the class
    //The __config_loaded function is called whenever config gets reloaded
    this._document.getElementById("rss.filter.number").removeAllItems();
    //this._document.getElementById("rss.filter.hlNumber").removeAllItems();
    //FIXME this (rss.filter.number.1) is used in reset filter and i'm not sure
    //what it does
    const numbers = this._document.createElement("menupopup");
    numbers.setAttribute("id", "rss.filter.number.1");
    const menu99 = this._document.getElementById("rss.filter.number");
    const headline_numbers = this._document.getElementById("rss.filter.hlnumber");
    menu99.appendChild(numbers);
    for (let number = 0; number < 100; number += 1)
    {
      menu99.appendItem(number, number);
      if (number < 51)
      {
        headline_numbers.appendItem(number, number);
      }
    }
  },

  _Basic__Feed_Group__Settings__config_loaded()
  {
  },


//----------------------------------------------------------------------------------

};
