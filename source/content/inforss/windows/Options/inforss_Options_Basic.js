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

/* exported inforss_Options_Basic */

/* eslint-disable array-bracket-newline */
/* exported EXPORTED_SYMBOLS */
//const EXPORTED_SYMBOLS = [
//  "inforss_Options_Basic", /* exported inforss_Options_Basic */
//];
/* eslint-enable array-bracket-newline */

/* eslint-disable strict, no-empty-function */

//FIXME New Feed, New Group  make current buttons and remove all belong in
// basic/feed-group
//as well as the general, filter and settings subtabs (all from feed/group)
//also needs breaking up into each sub tab

//FIXME Gerriv this
/* globals currentRSS */

var inforss = inforss || {};

Components.utils.import("chrome://inforss/content/modules/inforss_Utils.jsm",
                        inforss);

inforss.basic = {};

Components.utils.import(
  "chrome://inforss/content/windows/Options/Basic/" +
    "inforss_Options_Basic_General.jsm",
  inforss.basic
);

Components.utils.import(
  "chrome://inforss/content/windows/Options/Basic/" +
    "inforss_Options_Basic_Headlines_Area.jsm",
  inforss.basic
);

Components.utils.import(
  "chrome://inforss/content/windows/Options/Basic/" +
    "inforss_Options_Basic_Headlines_Style.jsm",
  inforss.basic
);

/** Contains the code for the 'Basic' tab in the option screen
 *
 * @param {XMLDocument} document - the options window this._document
 * @param {Config} config - current configuration
 */
function inforss_Options_Basic(document, config)
{
  this._document = document;
  this._config = config;
  this._tabs = [];
  /* globals inforss_Options_Basic_Feed_Group */
  this._tabs.push(new inforss_Options_Basic_Feed_Group(document, config));
  /* globals inforss_Options_Basic_Headlines_Area */
  this._tabs.push(new inforss.basic.General(document, config));
  /* globals inforss_Options_Basic_Headlines_Area */
  this._tabs.push(new inforss.basic.Headlines_Area(document, config));
  /* globals inforss_Options_Basic_Headlines_Style */
  this._tabs.push(new inforss.basic.Headlines_Style(document, config));
}

inforss_Options_Basic.prototype = {

  /** Config has been loaded */
  config_loaded()
  {
    for (const tab of this._tabs)
    {
      tab.config_loaded();
    }
  },

  /** Validate contents of tab
   *
   * @returns {boolean} true if all tabs validate
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
  },
};

//------------------------------------------------------------------------------
// Adds a feed to the 'feed in group' list
/* exported add_feed_to_group_list */
function add_feed_to_group_list(feed)
{
  const listitem = this._document.createElement("listitem");

  {
    const listcell = this._document.createElement("listcell");
    listcell.setAttribute("type", "checkbox");
    //Why do we need to do this at all? it's a check box..
    listcell.addEventListener(
      "click",
      event =>
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
      },
      false);
    listitem.appendChild(listcell);
  }

  {
    //why can't javascript let me make this const
    const listcell = this._document.createElement("listcell");
    listcell.setAttribute("class", "listcell-iconic");
    listcell.setAttribute("image", feed.getAttribute("icon"));
    listcell.setAttribute("value", feed.getAttribute("title"));
    listcell.setAttribute("label", feed.getAttribute("title"));
    listcell.setAttribute("url", feed.getAttribute("url"));
    listitem.appendChild(listcell);
  }

  listitem.setAttribute("allowevents", "true");

  //Insert into list in alphabetical order
  const listbox = this._document.getElementById("group-list-rss");
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
