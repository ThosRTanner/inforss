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
// inforssOptionBasic
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------
//Contains the code for the 'Basic' tab in the option screen

//FIXME New Feed, New Group and make current buttons all belong here
//as well as the general, filter and settings subtabs (all from feed/group)

/*jshint browser: true, devel: true */
/*eslint-env browser */

var inforss = inforss || {};

Components.utils.import("chrome://inforss/content/modules/inforss_Utils.jsm",
                        inforss);

/* globals inforssXMLRepository */

//shared with inforssOption
/* globals selectRSS1, currentRSS */

/* exported populate_basic_tab */
function populate_basic_tab()
{
  Basic__Feed_Group__populate();
}

/* exported update_basic_tab */
function update_basic_tab()
{
  //Basic__Feed_Group__General_update(); //there is stuff to update here, somehow
}

//Basic Feed_Group
function Basic__Feed_Group__populate()
{
  const selected_feed = Basic__Feed_Group__General__populate();
  Basic__Feed_Group__Filter__populate();
  //Basic__Feed_Group__Settings__populate();
  //FIXME This should be called elsewhere I think and then go through
  //'display' functions throughout
  if (selected_feed != null)
  {
    selectRSS1(selected_feed.getAttribute("url"), selected_feed.getAttribute("user"));
  }
}

//Build the popup menu
function Basic__Feed_Group__General__populate()
{
  //It appears that because xul has already got its fingers on this, we can't
  //dynamically replace
  //This is the list of feeds in a group displayed when a group is selectd
  {
    let list2 = document.getElementById("group-list-rss");
    let listcols = list2.firstChild;
    inforss.remove_all_children(list2);
    list2.appendChild(listcols);
  }

  //If we don't do this here, it seems to screw stuff up for the 1st group.
  for (const feed of inforssXMLRepository.get_feeds())
  {
    add_feed_to_group_list(feed);
  }

  //Now we build the selection menu under basic: feed/group

  const menu = document.getElementById("rss-select-menu");
  menu.removeAllItems();

  {
    const selectFolder = document.createElement("menupopup");
    selectFolder.setAttribute("id", "rss-select-folder");
    menu.appendChild(selectFolder);
  }

  var selected_feed = null;

  //Create the menu from the sorted list of feeds
  let i = 0;
  const feeds = Array.from(inforssXMLRepository.get_all()).sort((a, b) =>
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
}

function Basic__Feed_Group__Filter__populate()
{
  //This shouldn't be necessary - if this was split up into classes, we would
  //do this bit in the constructor of the class
  //The __populate function is called whenever config gets reloaded
  document.getElementById("rss.filter.number").removeAllItems();
  //document.getElementById("rss.filter.hlNumber").removeAllItems();
  //FIXME this (rss.filter.number.1) is used in reset filter and i'm not sure
  //what it does
  const numbers = document.createElement("menupopup");
  numbers.setAttribute("id", "rss.filter.number.1");
  const menu99 = document.getElementById("rss.filter.number");
  const headline_numbers = document.getElementById("rss.filter.hlnumber");
  menu99.appendChild(numbers);
  for (let number = 0; number < 100; number += 1)
  {
    menu99.appendItem(number, number);
    if (number < 51)
    {
      headline_numbers.appendItem(number, number);
    }
  }
}

/*
function Basic__Feed_Group__Settings__populate()
{
}
*/

//Basic__Feed_Group_update()
//------------------------------------------------------------------------------
// Adds a feed to the 'feed in group' list
/* exported add_feed_to_group_list */
function add_feed_to_group_list(feed)
{
  const listitem = document.createElement("listitem");

  {
    let listcell = document.createElement("listcell");
    listcell.setAttribute("type", "checkbox");
    //Why do we need to do this at all? it's a check box..
    listcell.addEventListener("click", function(event)
      {
        const lc = event.currentTarget;
        if (lc.getAttribute("checked") == "false")
        {
          lc.setAttribute("checked", "true");
        }
        else
        {
          lc.setAttribute("checked", "false");
        }
      }, false);
    listitem.appendChild(listcell);
  }

  {
    //why can't javascript let me make this const
    let listcell = document.createElement("listcell");
    listcell.setAttribute("class", "listcell-iconic");
    listcell.setAttribute("image", feed.getAttribute("icon"));
    listcell.setAttribute("value", feed.getAttribute("title"));
    listcell.setAttribute("label", feed.getAttribute("title"));
    listcell.setAttribute("url", feed.getAttribute("url"));
    listitem.appendChild(listcell);
  }

  listitem.setAttribute("allowevents", "true");

  //Insert into list in alphabetical order
  const listbox = document.getElementById("group-list-rss");
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
}