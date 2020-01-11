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
  Advanced__Repository__populate();
  Advanced__Synchronisation__populate();
  Advanced__Report__populate();
}

/* exported update_advanced_tab */
function update_advanced_tab()
{
  // Advanced tab
  // Advanced__Repository__update(); //nothing here to update
  Advanced__Synchronisation__update();
  //Advanced__Report__update(); //nothing here to update
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
    //selectRSS2();
    xthis.feed_changed(rss.getAttribute("url"));
  }
  catch (e)
  {
    inforss.debug(e);
  }
}