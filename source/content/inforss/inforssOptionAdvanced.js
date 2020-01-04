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
// inforssOptionAdvanced
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------
//Contains the code for the 'Advanced' tab in the option screen

/*jshint browser: true, devel: true */
/*eslint-env browser */

//FIXME Should contain all the code for the 'repository' tab buttons
//FIXME Should contain the code for the 'apply select to' button

var inforss = inforss || {};

Components.utils.import("chrome://inforss/content/modules/inforss_Utils.jsm",
                        inforss);

Components.utils.import("chrome://inforss/content/modules/inforss_Config.jsm",
                        inforss);

Components.utils.import(
  "chrome://inforss/content/modules/inforss_Headline_Cache.jsm",
  inforss);

//From inforssOption */
/* global inforssXMLRepository */
/* global gInforssMediator */
/* global selectRSS2 */
/* global get_feed_info */

//FIXME Number of feeds. Get it from repository
var gInforssNbFeed = 0;

//------------------------------------------------------------------------------
//
// Advanced tab
//
//------------------------------------------------------------------------------

/* exported populate_advanced_tab */
function populate_advanced_tab()
{
  // Advanced tab
  Advanced__Default_Values__populate();
  Advanced__Repository__populate();
  Advanced__Synchronisation__populate();
  Advanced__Report__populate();
  Advanced__Debug__populate();
}

/* exported update_advanced_tab */
function update_advanced_tab()
{
  // Advanced tab
  Advanced__Default_Values__update();
  // Advanced__Repository__update(); //nothing here to update
  Advanced__Synchronisation__update();
  //Advanced__Report__update(); //nothing here to update
  Advanced__Debug__update();
}

function Advanced__Default_Values__populate()
{
  // Number of news headlines
  //FIXME: Shouldn't use arbitrary numbers for control
  //FIXME: Should grey out the value?
  {
    const nbitem = inforssXMLRepository.feeds_default_max_num_headlines;
    if (nbitem == 9999)
    {
      document.getElementById("defaultnbitem").selectedIndex = 0;
    }
    else
    {
      document.getElementById("defaultnbitem").selectedIndex = 1;
      document.getElementById("defaultnbitem1").value = nbitem;
    }
  }

  // Characters per headline
  //FIXME: Shouldn't use arbitrary numbers for control
  //FIXME: Should grey out the value?
  {
    const lengthitem = inforssXMLRepository.feeds_default_max_headline_length;
    if (lengthitem == "9999")
    {
      document.getElementById("defaultlengthitem").selectedIndex = 0;
    }
    else
    {
      document.getElementById("defaultlengthitem").selectedIndex = 1;
      document.getElementById('defaultlengthitem1').value = lengthitem;
    }
  }

  // Refresh time
  //FIXME: Shouldn't use arbitrary numbers for control
  //FIXME: Should grey out the value?
  {
    const refresh = inforssXMLRepository.feeds_default_refresh_time;
    if (refresh == 60 * 24)
    {
      document.getElementById("inforss.defaultrefresh").selectedIndex = 0;
      //FIXME Urgggh
      document.getElementById("defaultrefresh1").value = 1;
    }
    else if (refresh == 60)
    {
      document.getElementById("inforss.defaultrefresh").selectedIndex = 1;
      //This is wrong as the slider should be greyed out and valueless
      document.getElementById("defaultrefresh1").value = refresh;
    }
    else
    {
      document.getElementById("inforss.defaultrefresh").selectedIndex = 2;
      document.getElementById("defaultrefresh1").value = refresh;
    }
  }

  // Purge local history
  document.getElementById("defaultPurgeHistory").value =
    inforssXMLRepository.feeds_default_history_purge_days;

  // Play podcast
  document.getElementById("defaultPlayPodcast").selectedIndex =
    inforssXMLRepository.feed_defaults_play_podcast ? 0 : 1;

  // Use history
  document.getElementById("defaultBrowserHistory").selectedIndex =
    inforssXMLRepository.feed_defaults_use_browser_history ? 0 : 1;

  // Default icon for groups
  {
    const defaultGroupIcon = inforssXMLRepository.feeds_defaults_group_icon;
    document.getElementById("defaultGroupIcon").value = defaultGroupIcon;
    document.getElementById("inforss.defaultgroup.icon").src = defaultGroupIcon;
  }

  // Save podcast
  {
    const savePodcastLocation = inforssXMLRepository.feeds_default_podcast_location;
    if (savePodcastLocation == "")
    {
      document.getElementById("savePodcastLocation").selectedIndex = 1;
      document.getElementById("savePodcastLocation1").value = "";
    }
    else
    {
      document.getElementById("savePodcastLocation").selectedIndex = 0;
      document.getElementById("savePodcastLocation1").value = savePodcastLocation;
    }
  }

  Advanced__Default_Values__populate2();
  Advanced__Default_Values__populate3();
}

function Advanced__Default_Values__populate2()
{
  inforss.remove_all_children(document.getElementById("inforss-apply-list"));
  for (const feed of inforssXMLRepository.get_all())
  {
    add_feed_to_apply_list(feed);
  }
}

function Advanced__Default_Values__populate3()
{
  // Current feed name
  const theCurrentFeed = inforssXMLRepository.selected_feed;
  if (theCurrentFeed != null)
  {
    document.getElementById("inforss.current.feed").setAttribute(
      "value",
      theCurrentFeed.getAttribute("title")
    );
    document.getElementById("inforss.current.feed").setAttribute(
      "tooltiptext",
      theCurrentFeed.getAttribute("description")
    );
  }
}

function Advanced__Default_Values__update()
{
  //# of news
  inforssXMLRepository.feeds_default_max_num_headlines =
    document.getElementById('defaultnbitem').selectedIndex == 0 ?
      9999 :
      document.getElementById('defaultnbitem1').value;

  //# of chars
  inforssXMLRepository.feeds_default_max_headline_length =
    document.getElementById('defaultlengthitem').selectedIndex == 0 ?
      9999 :
      document.getElementById('defaultlengthitem1').value;

  //Refresh time
  {
    const refresh = document.getElementById('inforss.defaultrefresh').selectedIndex;
    inforssXMLRepository.feeds_default_refresh_time =
      refresh == 0 ? 60 * 24 :
      refresh == 1 ? 60 : document.getElementById('defaultrefresh1').value;
  }

  //purge local history after
  inforssXMLRepository.feeds_default_history_purge_days =
    document.getElementById("defaultPurgeHistory").value;

  //play podcast
  inforssXMLRepository.feed_defaults_play_podcast =
    document.getElementById('defaultPlayPodcast').selectedIndex == 0;

  //use applications history data
  inforssXMLRepository.feed_defaults_use_browser_history =
    document.getElementById('defaultBrowserHistory').selectedIndex == 0;

  //icon for groups
  inforssXMLRepository.feeds_defaults_group_icon =
    document.getElementById("defaultGroupIcon").value;

  //Default podcast location
  inforssXMLRepository.feeds_default_podcast_location =
    document.getElementById('savePodcastLocation').selectedIndex == 0 ?
      document.getElementById('savePodcastLocation1').value : "";

}

//------------------------------------------------------------------------------
//This is the 'apply selected to' button in the advanced/default values page
/* exported changeDefaultValue */
function changeDefaultValue()
{
  try
  {
    const applyto = document.getElementById("inforss.applyto").selectedIndex;
    switch (applyto)
    {
      default:
        console.log("Unexpected type " + applyto);
        break;

      case 0: // apply to all
        for (const item of inforssXMLRepository.get_all())
        {
          if (item.getAttribute("type") != "group")
          {
            changeDefaultValue1(item);
          }
        }
        inforss.alert(inforss.get_string("feed.changed"));
        break;

      case 1: // the current feed
        var theCurrentFeed = inforssXMLRepository.selected_feed;
        if (theCurrentFeed === null)
        {
          inforss.alert(inforss.get_string("rss.selectfirst"));
        }
        else if (theCurrentFeed.getAttribute("type") == "group")
        {
          if (inforss.confirm("apply.group"))
          {
            for (const item of theCurrentFeed.getElementsByTagName("GROUP"))
            {
              changeDefaultValue1(inforssXMLRepository.get_item_from_url(item.getAttribute("url")));
            }
            inforss.alert(inforss.get_string("feed.changed"));
          }
        }
        else
        {
          changeDefaultValue1(theCurrentFeed);
          inforss.alert(inforss.get_string("feed.changed"));
        }
        break;

      case 2: // apply to the selected feed
      {
        const selectedItems =
          document.getElementById("inforss-apply-list").selectedItems;
        if (selectedItems.length == 0)
        {
          inforss.alert(inforss.get_string("rss.selectfirst"));
        }
        else
        {
          for (const item of selectedItems)
          {
            changeDefaultValue1(inforssXMLRepository.get_item_from_url(item.getAttribute("url")));
          }
          inforss.alert(inforss.get_string("feed.changed"));
        }
        break;
      }
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function changeDefaultValue1(rss)
{
  if (document.getElementById("inforss.checkbox.defaultnbitem").checked)
  {
    rss.setAttribute(
      "nbItem",
      document.getElementById('defaultnbitem').selectedIndex == 0 ?
        "9999" :
        document.getElementById('defaultnbitem1').value);
  }

  if (document.getElementById("inforss.checkbox.defaultlengthitem").checked)
  {
    rss.setAttribute(
      "lengthItem",
      document.getElementById('defaultlengthitem').selectedIndex == 0 ?
        "9999" :
        document.getElementById('defaultlengthitem1').value);
  }

  if (document.getElementById("inforss.checkbox.defaultrefresh1").checked)
  {
    var refresh1 = document.getElementById('inforss.defaultrefresh').selectedIndex;
    rss.setAttribute("refresh",
                     refresh1 == 0 ? 60 * 24 :
                     refresh1 == 1 ? 60 :
                      document.getElementById('defaultrefresh1').value);
  }

  if (document.getElementById("inforss.checkbox.defaultPlayPodcast").checked)
  {
    rss.setAttribute(
      "playPodcast",
      document.getElementById('defaultPlayPodcast').selectedIndex == 0);
  }

  if (document.getElementById("inforss.checkbox.defaultPurgeHistory").checked)
  {
    rss.setAttribute("purgeHistory",
                     document.getElementById('defaultPurgeHistory').value);
  }

  if (document.getElementById("inforss.checkbox.defaultBrowserHistory").checked)
  {
    rss.setAttribute(
      "browserHistory",
      document.getElementById('defaultBrowserHistory').selectedIndex == 0);
  }

  if (document.getElementById("inforss.checkbox.defaultGroupIcon").checked &&
      rss.getAttribute("type") == "group")
  {
    rss.setAttribute("icon", document.getElementById('defaultGroupIcon').value);
  }

  if (document.getElementById("inforss.checkbox.defaultSavePodcast").checked)
  {
    rss.setAttribute(
      "savePodcastLocation",
      document.getElementById('savePodcastLocation').selectedIndex == 1 ?
        "" : document.getElementById('savePodcastLocation1').value);
  }

  if (document.getElementById("rss-select-menu").selectedItem.getAttribute("url") == rss.getAttribute("url"))
  {
    //FIXME basically updates the display but we should do that when we pop back
    //to the tab
    selectRSS2();
  }
}

function Advanced__Repository__populate()
{
  if (document.getElementById("inforss.location3").childNodes.length == 0)
  {
    let linetext = document.createTextNode(inforss.Config.get_filepath().path);
    document.getElementById("inforss.location3").appendChild(linetext);
    linetext = document.createTextNode(inforss.Headline_Cache.get_filepath().path);
    document.getElementById("inforss.location4").appendChild(linetext);
  }
}

function Advanced__Synchronisation__populate()
{
  const serverInfo = inforssXMLRepository.getServerInfo();
  document.getElementById('inforss.repo.urltype').value = serverInfo.protocol;
  document.getElementById('ftpServer').value = serverInfo.server;
  document.getElementById('repoDirectory').value = serverInfo.directory;
  document.getElementById('repoLogin').value = serverInfo.user;
  document.getElementById('repoPassword').value = serverInfo.password;
  document.getElementById('repoAutoSync').selectedIndex = serverInfo.autosync ? 0 : 1;
}

function Advanced__Synchronisation__update()
{
  inforssXMLRepository.setServerInfo(
    document.getElementById('inforss.repo.urltype').value,
    document.getElementById('ftpServer').value,
    document.getElementById('repoDirectory').value,
    document.getElementById('repoLogin').value,
    document.getElementById('repoPassword').value,
    document.getElementById('repoAutoSync').selectedIndex == 0
  );
}

//------------------------------------------------------------------------------
//Update the report screen on the advanced page
function Advanced__Report__populate()
{
  const tree = inforss.replace_without_children(document.getElementById("inforss-tree-report"));

  //FIXME We need to calculate this??
  gInforssNbFeed = 0;

  //First we display an entry for each (non group) feed
  for (const feed of inforssXMLRepository.get_feeds())
  {
    if (add_tree_item(tree, feed, true) != null)
    {
      gInforssNbFeed += 1;
    }
  }

  //Now we do each group
  let treeseparator = null;
  for (const group of inforssXMLRepository.get_groups())
  {
    const originalFeed = gInforssMediator.find_feed(group.getAttribute("url"));
    if (originalFeed !== undefined)
    {
      if (treeseparator == null)
      {
        treeseparator = document.createElement("treeseparator");
        tree.appendChild(treeseparator);
      }
      const treeitem = document.createElement("treeitem");
      treeitem.setAttribute("title", group.getAttribute("title"));
      const treerow = document.createElement("treerow");
      treeitem.appendChild(treerow);
      treeitem.setAttribute("container", "true");
      treeitem.setAttribute("open", "false");
      treerow.setAttribute("properties", "group");
      treerow.setAttribute("url", group.getAttribute("url"));
      treerow.appendChild(newCell(group.getAttribute("icon"), "icon", "image"));
      treerow.appendChild(newCell("", group.getAttribute("activity") == "true" ? "on" : "off"));
      treerow.appendChild(newCell(group.getAttribute("title")));
      treerow.appendChild(newCell("", originalFeed.active ? "active" : "inactive"));
      treerow.appendChild(newCell(""));
      treerow.appendChild(newCell(""));
      treerow.appendChild(newCell(originalFeed.num_headlines));
      treerow.appendChild(newCell(originalFeed.num_unread_headlines));
      treerow.appendChild(newCell(""));

      let child = treeseparator.nextSibling;
      while (child != null &&
             treeitem.getAttribute("title").toLowerCase() > child.getAttribute("title").toLowerCase())
      {
        child = child.nextSibling;
      }
      tree.insertBefore(treeitem, child);

      const treechildren = document.createElement("treechildren");
      treeitem.appendChild(treechildren);
      for (const item of group.getElementsByTagName("GROUP"))
      {
        let feed = inforssXMLRepository.get_item_from_url(item.getAttribute("url"));
        if (feed != null)
        {
          add_tree_item(treechildren, feed, false);
        }
      }
    }
  }
}

function Advanced__Debug__populate()
{
  //This is sort of dubious as this gets populated both in about:config and
  //stored in the xml.
  document.getElementById("debug").selectedIndex =
    inforssXMLRepository.debug_display_popup ? 0 : 1;
  document.getElementById("statusbar").selectedIndex =
    inforssXMLRepository.debug_to_status_bar ? 0 : 1;
  document.getElementById("log").selectedIndex =
    inforssXMLRepository.debug_to_browser_log ? 0 : 1;
}

function Advanced__Debug__update()
{
  inforssXMLRepository.debug_display_popup =
    document.getElementById('debug').selectedIndex == 0;
  inforssXMLRepository.debug_to_status_bar =
    document.getElementById('statusbar').selectedIndex == 0;
  inforssXMLRepository.debug_to_browser_log =
    document.getElementById('log').selectedIndex == 0;
}

/* exported add_feed_to_apply_list */
function add_feed_to_apply_list(feed)
{
  const listitem = document.createElement("listitem");
  listitem.setAttribute("label", feed.getAttribute("title"));
  listitem.setAttribute("url", feed.getAttribute("url"));
  listitem.setAttribute("class", "listitem-iconic");
  listitem.setAttribute("image", feed.getAttribute("icon"));
  listitem.style.maxHeight = "18px";

  //Insert into list in alphabetical order
  const listbox = document.getElementById("inforss-apply-list");
  const title = feed.getAttribute("title").toLowerCase();
  for (const item of listbox.childNodes)
  {
    if (title <= item.getAttribute("label").toLowerCase())
    {
      listbox.insertBefore(listitem, item);
      return;
    }
  }
  listbox.insertBefore(listitem, null);
}

//------------------------------------------------------------------------------
//Adds a feed entry to a tree view
function add_tree_item(tree, feed, show_in_group)
{
  const obj = get_feed_info(feed);
  const treeitem = document.createElement("treeitem");
  treeitem.setAttribute("title", feed.getAttribute("title"));
  const treerow = document.createElement("treerow");
  treerow.setAttribute("url", feed.getAttribute("url"));
  treeitem.appendChild(treerow);
  treerow.appendChild(newCell(obj.icon, "icon", "image"));
  treerow.appendChild(newCell("", obj.enabled ? "on" : "off"));
  treerow.appendChild(newCell(feed.getAttribute("title")));
  treerow.appendChild(newCell("", obj.status));
  treerow.appendChild(newCell(obj.last_refresh));
  treerow.appendChild(newCell(obj.next_refresh));
  treerow.appendChild(newCell(obj.headlines));
  treerow.appendChild(newCell(obj.unread_headlines));
  treerow.appendChild(newCell(obj.new_headlines));
  //Not very localised...
  treerow.appendChild(newCell(show_in_group ? (obj.in_group ? "Y" : "N") : ""));
  const title = treeitem.getAttribute("title").toLowerCase();
  let child = tree.firstChild;
  while (child != null && title > child.getAttribute("title").toLowerCase())
  {
    child = child.nextSibling;
  }
  tree.insertBefore(treeitem, child);
  return treeitem;
}

//------------------------------------------------------------------------------
//Create a new treelist cell
function newCell(str, prop, type)
{
  let treecell = document.createElement("treecell");
  if (type == "image")
  {
    treecell.setAttribute("src", str);
  }
  else
  {
    treecell.setAttribute("label", str);
  }
  treecell.style.textAlign = "center";
  treecell.setAttribute("properties",
                        "centered" + (prop === undefined ? "" : " " + prop));
  return treecell;
}

//-----------------------------------------------------------------------------------------------------
// Advanced / report (for all feeds/groups)
/* exported selectFeedReport */
//more or less clone of _toggle_activation in feed_grou_general apart from
//1) the test against number of feeds
//2) the column index
//3) the selectRSS2 at the end.
function selectFeedReport(tree, event)
{
  var row = {},
    colID = {},
    type = {};
  try
  {
    tree.treeBoxObject.getCellAt(event.clientX, event.clientY, row, colID, type);
    if (colID.value == null)
    {
      return;
    }

    // 0 for feed, 1 for advance/report
    if (colID.value.index != 1 || type.value != "image")
    {
      return;
    }

    //not meaninful for basic feed/group. not entirely sure why it's needed
    //for advanced menu
    if (row.value >= gInforssNbFeed)
    {
      row.value -= 1;
    }

    row = tree.getElementsByTagName("treerow").item(row.value);
    const cell = row.childNodes[colID.value.index];

    cell.setAttribute("properties", (cell.getAttribute("properties").indexOf("on") != -1) ? "off" : "on");
    var rss = inforssXMLRepository.get_item_from_url(cell.parentNode.getAttribute("url"));
    rss.setAttribute("activity", (rss.getAttribute("activity") == "true") ? "false" : "true");
    selectRSS2();
  }
  catch (e)
  {
    inforss.debug(e);
  }
}