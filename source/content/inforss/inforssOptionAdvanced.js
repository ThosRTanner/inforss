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

//FIXME Should contain all the code for the 'repository' tab buttons
//FIXME Should contain the code for the 'apply select to' button

var inforss = inforss || {};

Components.utils.import("chrome://inforss/content/modules/Utils.jsm", inforss);

/* globals inforssXMLRepository, inforssRDFRepository, inforssGetItemFromUrl */

//From inforssOption */
/* globals theCurrentFeed, gInforssNbFeed: true, gInforssMediator */

//FIXME Remove
/* globals RSSList */

const As_HH_MM_SS = new Intl.DateTimeFormat(
  [],
  { hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false }
);


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
  Advanced__Main_Menu__populate();
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
  Advanced__Main_Menu__update();
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
    const defaultGroupIcon = inforssXMLRepository.feeds_default_group_icon;
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

  // Current feed name. Not sure the tooltip is any help whatsoever.
  document.getElementById("inforss.current.feed").setAttribute(
                                                    "value",
                                                    theCurrentFeed.getTitle());
  document.getElementById("inforss.current.feed").setAttribute(
                                                    "tooltiptext",
                                                    theCurrentFeed.getTitle());

  for (let feed of inforssXMLRepository.get_feeds())
  {
    add_feed_to_apply_list(feed);
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
  inforssXMLRepository.feeds_default_group_icon =
    document.getElementById("defaultGroupIcon").value;

  //Default podcast location
  inforssXMLRepository.feeds_default_podcast_location =
    document.getElementById('savePodcastLocation').selectedIndex == 0 ?
      document.getElementById('savePodcastLocation1').value : "";

}

function Advanced__Main_Menu__populate()
{
  //------------------------Menu box

  //Include feeds from current page
  document.getElementById("currentfeed").selectedIndex =
    inforssXMLRepository.menu_includes_page_feeds ? 0 : 1;

  //Include feeds from bookmarks
  document.getElementById("livemark").selectedIndex =
    inforssXMLRepository.menu_includes_livemarks ? 0 : 1;

  //Include clipboard content
  document.getElementById("clipboard").selectedIndex =
    inforssXMLRepository.menu_includes_clipboard ? 0 : 1;

  //Sorted titles
  {
    const sorting = inforssXMLRepository.menu_sorting_style;
    document.getElementById("sortedMenu").selectedIndex =
      sorting == "no" ? 0 : sorting == "asc" ? 1 : 2;
  }

  //Include feeds which are in groups
  document.getElementById("includeAssociated").selectedIndex =
    inforssXMLRepository.menu_show_feeds_from_groups ? 0 : 1;

  //Display feed headlines in submenu
  document.getElementById("submenu").selectedIndex =
    inforssXMLRepository.menu_show_headlines_in_submenu ? 0 : 1;

  //-------------------------Icon box

  //Show current group/feed in main icon
  document.getElementById("synchronizeIcon").selectedIndex =
    inforssXMLRepository.icon_shows_current_feed ? 0 : 1;

  //Flash icon
  document.getElementById("flashingIcon").selectedIndex =
    inforssXMLRepository.icon_flashes_on_activity ? 0 : 1;

}

function Advanced__Main_Menu__update()
{
  inforssXMLRepository.menu_includes_page_feeds =
    document.getElementById('currentfeed').selectedIndex == 0;

  inforssXMLRepository.menu_includes_livemarks =
    document.getElementById('livemark').selectedIndex == 0;

  inforssXMLRepository.menu_includes_clipboard =
    document.getElementById('clipboard').selectedIndex == 0;

  inforssXMLRepository.menu_sorting_style =
    document.getElementById('sortedMenu').selectedIndex == 0 ? "no" :
    document.getElementById('sortedMenu').selectedIndex == 1 ? "asc" :
                                                               "des";
  inforssXMLRepository.menu_show_feeds_from_groups =
    document.getElementById('includeAssociated').selectedIndex == 0;

  inforssXMLRepository.menu_show_headlines_in_submenu =
    document.getElementById('submenu').selectedIndex == 0;

  inforssXMLRepository.icon_shows_current_feed =
    document.getElementById('synchronizeIcon').selectedIndex == 0;

  inforssXMLRepository.icon_flashes_on_activity =
    document.getElementById('flashingIcon').selectedIndex;
}

function Advanced__Repository__populate()
{
  let linetext = document.createTextNode(inforssXMLRepository.get_filepath().path);
  document.getElementById("inforss.location3").appendChild(linetext);
  linetext = document.createTextNode(inforssRDFRepository.get_filepath().path);
  document.getElementById("inforss.location4").appendChild(linetext);
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
  //Apparently Thunderbird doesn't have the werewithal to do ftp.
  if (navigator.vendor == "Thunderbird")
  {
    document.getElementById("inforss.repo.synchronize.exporttoremote").collapsed = true;
    document.getElementById("inforss.repo.synchronize.importfromremote").collapsed = true;
    document.getElementById("repoAutoSync").disabled = true;
    document.getElementById("repoAutoSyncOn").disabled = true;
    document.getElementById("repoAutoSyncOff").disabled = true;
    document.getElementById("inforss.tab.synchro").disabled = true;
  }
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
  for (let feed of inforssXMLRepository.get_feeds())
  {
    if (add_tree_item(tree, feed, true) != null)
    {
      gInforssNbFeed++;
    }
  }

  //Now we do each group
  let treeseparator = null;
  for (let group of inforssXMLRepository.get_groups())
  {
    let originalFeed = gInforssMediator.locateFeed(group.getAttribute("url"));
    if (originalFeed != null && originalFeed.info)
    {
      if (treeseparator == null)
      {
        treeseparator = document.createElement("treeseparator");
        tree.appendChild(treeseparator);
      }
      originalFeed = originalFeed.info;
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
      treerow.appendChild(newCell(originalFeed.getNbHeadlines()));
      treerow.appendChild(newCell(originalFeed.getNbUnread()));
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
      for (let item of group.getElementsByTagName("GROUP"))
      {
        let feed = inforssGetItemFromUrl(item.getAttribute("url"));
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
      inforssXMLRepository.debug_display_popup() ? 0 : 1;
    document.getElementById("statusbar").selectedIndex =
      inforssXMLRepository.debug_to_status_bar() ? 0 : 1;
    document.getElementById("log").selectedIndex =
      inforssXMLRepository.debug_to_browser_log() ? 0 : 1;
}

function Advanced__Debug__update()
{
      RSSList.firstChild.setAttribute("debug", (document.getElementById('debug').selectedIndex == 0) ? "true" : "false");
      RSSList.firstChild.setAttribute("log", (document.getElementById('log').selectedIndex == 0) ? "true" : "false");
      RSSList.firstChild.setAttribute("statusbar", (document.getElementById('statusbar').selectedIndex == 0) ? "true" : "false");
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
  for (let item of listbox.childNodes)
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
  let obj = get_feed_info(feed);
  if (obj == null)
  {
    return null;
  }
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
                        "centered" + (prop == undefined ? "" : " " + prop));
  return treecell;
}

//------------------------------------------------------------------------------
//This creates an object containing feed information to display in the options
//window in various places
/* exported get_feed_info */
//FIXME probably doesn't need to be exported once we sort the updates out.
function get_feed_info(feed)
{
  let originalFeed = gInforssMediator.locateFeed(feed.getAttribute("url"));
  if (originalFeed == null || originalFeed.info == null)
  {
    return null;
  }
  originalFeed = originalFeed.info;
  const obj = {};
  obj.icon = feed.getAttribute("icon");
  obj.enabled = feed.getAttribute("activity") == "true";
  obj.status = originalFeed.error ? "error" :
               originalFeed.active && originalFeed.lastRefresh != null ? "active" :
               "inactive";
  if (originalFeed.lastRefresh == null)
  {
    obj.last_refresh = "";
    obj.headlines = "";
    obj.unread_headlines = "";
    obj.new_headlines = "";
  }
  else
  {
    obj.last_refresh = As_HH_MM_SS.format(originalFeed.lastRefresh);
    obj.headlines = originalFeed.getNbHeadlines();
    obj.unread_headlines = originalFeed.getNbUnread();
    obj.new_headlines = originalFeed.getNbNew();
  }
  obj.next_refresh = !originalFeed.active ||
                     feed.getAttribute("activity") == "false" ||
                     originalFeed.next_refresh == null ?
                        "" : As_HH_MM_SS.format(originalFeed.next_refresh);
  obj.in_group = originalFeed.feedXML.getAttribute("groupAssociated") == "true";
  return obj;
}

