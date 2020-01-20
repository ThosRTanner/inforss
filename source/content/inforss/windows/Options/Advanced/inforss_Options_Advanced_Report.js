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
// inforss_Options_Advanced_Report
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------

/* exported inforss_Options_Advanced_Report */

/* eslint-disable array-bracket-newline */
/* exported EXPORTED_SYMBOLS */
//const EXPORTED_SYMBOLS = [
//  "Filter", /* exported Filter */
//];
/* eslint-enable array-bracket-newline */

//Switch off a lot of eslint warnings for now
/* eslint-disable strict, no-empty-function */

//This is all indicative of brokenness

/* eslint-disable-next-line no-use-before-define, no-var */
var inforss = inforss || {}; //jshint ignore:line

Components.utils.import("chrome://inforss/content/modules/inforss_Utils.jsm",
                        inforss);

Components.utils.import("chrome://inforss/content/modules/inforss_Prompt.jsm",
                        inforss);

Components.utils.import("chrome://inforss/content/modules/inforss_Version.jsm",
                        inforss);

Components.utils.import(
  "chrome://inforss/content/windows/Options/" +
    "inforss_Options_Base.jsm",
  inforss
);

/** Contains the code for the 'Basic' tab in the option screen
 *
 * @param {XMLDocument} this._document - the options window this._document
 * @param {Config} config - current configuration
 * @param {Options} options - main options window control
 */
function inforss_Options_Advanced_Report(document, config, options)
{
  inforss.Base.call(this, document, config, options);

  this._tree = document.getElementById("inforss-tree-report");

  this._listeners = inforss.add_event_listeners(
    this,
    document,
    [ "report.refresh", "click", this.update_report ],
    [ "tree3", "click", this._toggle_activation ]
  );
}

inforss_Options_Advanced_Report.prototype = Object.create(inforss.Base.prototype);
inforss_Options_Advanced_Report.prototype.constructor = inforss_Options_Advanced_Report;

Object.assign(inforss_Options_Advanced_Report.prototype, {

  /** Config has been loaded */
  config_loaded()
  {
    this.update_report();
  },

  //FIXME needs to be called when group is ticked from main general
  //FIXME add feed and remove feed should be implemented and call update_report
  //change to members of group should call update_report
  //check if config changes require this to be called
  /** set the toggle state for a feed
   *
   * @param {string} url - url of feed
   */
  feed_active_state_changed(url)
  {
    const feed = this._config.get_item_from_url(url);
    const state = feed.getAttribute("activity") == "true" ? "on" : "off";
    this._set_feed_active_state(url, state, this._tree);
  },

  /** Utility for feed_active_state_changed that recurses down the tree
   *
   * @param {string} url - url of feed
   * @param {string} state - state of feed (on/off)
   * @param {Object} tree - tree to examine
   */
  _set_feed_active_state(url, state, tree)
  {
    for (const item of tree.childNodes)
    {
      if (item.childElementCount != 0)
      {
        if (item.firstElementChild.getAttribute("url") == url)
        {
          item.firstChild.children[1].setAttribute("properties", state);
        }
        if (item.hasAttribute("container"))
        {
          this._set_feed_active_state(url, state, item.childNodes[1]);
        }
      }
    }
  },

  //FIXME Check where this is called from.
  /** Redisplays the status tree
   *
   * @param {MouseEvent} _event - mouse click event (optional)
   */
  update_report(_event)
  {
    //const tree = inforss.replace_without_children(this._tree);
    const tree = this._tree;
    inforss.remove_all_children(tree);

    //FIXME We need to calculate this because adding and deleting feeds appears
    //to have no effect. This is wrong.
    this._num_feeds = 0;

    //First we display an entry for each (non group) feed
    for (const feed of this._config.get_feeds())
    {
      this._add_tree_item(tree, feed, true);
      this._num_feeds += 1;
    }

    //Now we do each group
    let seperator = null;
    for (const group of this._config.get_groups())
    {
      //this is disturbing...
      const original = this._options.find_feed(group.getAttribute("url"));
      if (original === undefined)
      {
        continue;
      }

      if (seperator == null)
      {
        seperator = this._document.createElement("treeseparator");
        tree.appendChild(seperator);
      }

      const treeitem = this._add_tree_item(tree,
                                           group,
                                           false,
                                           seperator.nextSibling);
      treeitem.setAttribute("container", "true");
      treeitem.setAttribute("open", "false");
      //This one vvvv
      //treerow.setAttribute("properties", "group");
      //doesn't seem to be used.
      const treechildren = this._document.createElement("treechildren");
      treeitem.appendChild(treechildren);
      for (const item of group.getElementsByTagName("GROUP"))
      {
        const feed = this._config.get_item_from_url(item.getAttribute("url"));
        if (feed != null)
        {
          this._add_tree_item(treechildren, feed, false);
        }
      }
    }
  },

  /** Adds a row for a feed
   *
   * @param {Object} tree - tree section to which to add
   * @param {RSS} feed - feed to add
   * @param {boolean} show_in_group - true if you want to show if feed is in a
   *                                  group
   * @param {Object} sibling - where to insert in the tree if defined.
   */
  _add_tree_item(tree, feed, show_in_group, sibling)
  {
    const obj = this._options.get_feed_info(feed);
    const treeitem = this._document.createElement("treeitem");
    treeitem.setAttribute("title", feed.getAttribute("title"));
    const treerow = this._document.createElement("treerow");
    //FIXME user defined attribute in the DOM
    treerow.setAttribute("url", feed.getAttribute("url"));
    treerow.appendChild(this._new_cell(obj.icon, "icon", "image"));
    treerow.appendChild(this._new_cell("", obj.enabled ? "on" : "off"));
    treerow.appendChild(this._new_cell(feed.getAttribute("title")));
    treerow.appendChild(this._new_cell("", obj.status));
    treerow.appendChild(this._new_cell(obj.last_refresh));
    treerow.appendChild(this._new_cell(obj.next_refresh));
    treerow.appendChild(this._new_cell(obj.headlines));
    treerow.appendChild(this._new_cell(obj.unread_headlines));
    treerow.appendChild(this._new_cell(obj.new_headlines));
    //Not very localised...
    treerow.appendChild(
      this._new_cell(show_in_group ? (obj.in_group ? "Y" : "N") : "")
    );
    treeitem.appendChild(treerow);
    const title = treeitem.getAttribute("title").toLowerCase();
    let child = sibling === undefined ? tree.firstChild : sibling;
    while (child != null && title > child.getAttribute("title").toLowerCase())
    {
      child = child.nextSibling;
    }
    tree.insertBefore(treeitem, child);
    return treeitem;
  },

  /** Creates a cell to add to a tree row
   *
   * @param {string} str - label or image
   * @param {string} prop - property value or undefined
   * @param {string} type - icon (for images) or undefined (strings)
   *
   * @returns {Object} tree cell
   */
  _new_cell(str, prop, type)
  {
    const treecell = this._document.createElement("treecell");
    if (type == "image")
    {
      treecell.setAttribute("src", str);
    }
    else
    {
      treecell.setAttribute("label", str);
    }
    if (prop !== undefined)
    {
      treecell.setAttribute("properties", prop);
    }
    return treecell;
  },

  /** Handle click on the tree object
   *
   * This is more or less the same as the one in Feed_Groups/General tab, but
   * it has the range check, a different index, and slightly different behaviour
   * at the end as the feed has to be determined
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
    if (col.value == null || col.value.index != 1 || type.value != "image")
    {
      return;
    }
    //Account for the separator line.
    if (row.value > this._num_feeds)
    {
      row.value -= 1;
    }
    //Get the cell from the tree
    const tree_row = tree.getElementsByTagName("treerow").item(row.value);
    const cell = tree_row.childNodes[col.value.index];
    const url = cell.parentNode.getAttribute("url");
    const feed = this._config.get_item_from_url(url);
    feed.setAttribute("activity", cell.getAttribute("properties") == "off");
    this._options.feed_changed(url);
    this.feed_active_state_changed(url);
  },

});
