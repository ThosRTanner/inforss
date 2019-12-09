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
// inforss_Options_Basic_Feed_Group_General.js
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------

/* exported inforss_Options_Basic_Feed_Group_General */

/* eslint-disable array-bracket-newline */
/* exported EXPORTED_SYMBOLS */
//const EXPORTED_SYMBOLS = [
//  "General", /* exported General */
//];
/* eslint-enable array-bracket-newline */

/* eslint-disable strict */

//This is all indicative of brokenness
/* globals add_feed_to_group_list */

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
function inforss_Options_Basic_Feed_Group_General(document, config)
{
  this._document = document;
  this._config = config;
  /*
  this._listeners = inforss.add_event_listeners(
    this,
    this._document,
    [ "make.current", "command", this._make_current ],
    [ "remove", "command", this._remove_feed ]
  );
  */
  //icon test & reset to default
  //view all, check/uncheck all, etc
}

inforss.complete_assign(inforss_Options_Basic_Feed_Group_General.prototype, {

  /** Config has been loaded */
  config_loaded()
  {
    //It appears that because xul has already got its fingers on this, we can't
    //dynamically replace
    //This is the list of feeds in a group displayed when a group is selectd
    {
      const list = this._document.getElementById("group-list-rss");
      const listcols = list.firstChild;
      inforss.remove_all_children(list);
      list.appendChild(listcols);
    }

    //If we don't do this here, it seems to screw stuff up for the 1st group.
    for (const feed of this._config.get_feeds())
    {
      add_feed_to_group_list(feed);
    }

  },

  /** Validate contents of tab
   *
   * @param {RSS} current_feed - config of currently selected feed
   *
   * @returns {boolean} true if all is ok
   */
  validate(current_feed)
  {
/**/console.log(current_feed)
    const type = current_feed.getAttribute("type");
    if (type == "group")
    {
      if (this._document.getElementById("groupName").value == "" ||
          this._document.getElementById('iconurlgroup').value == "")
      {
        inforss.alert(inforss.get_string("pref.mandatory"));
        return false;
      }
      if (this._document.getElementById('playlistoption').selectedIndex == 0)
      {
        //We have a playlist.
        for (const item of this._document.getElementById("group-playlist").childNodes)
        {
          if (item.firstChild.firstChild.value == "")
          {
            inforss.alert(inforss.get_string("delay.mandatory"));
            return false;
          }
        }
      }
    }
    else
    {
      if (this._document.getElementById('optionTitle').value == "" ||
          this._document.getElementById('optionUrl').value == "" ||
          this._document.getElementById('optionLink').value == "" ||
          this._document.getElementById('optionDescription').value == "" ||
          this._document.getElementById('iconurl').value == "")
      {
        inforss.alert(inforss.get_string("pref.mandatory"));
        return false;
      }
      //FIXME I don't think this is now necessary as we can't create the feed
      //like this now.
      if (type == "html")
      {
        if (current_feed.getAttribute("regexp") == null ||
            current_feed.getAttribute("regexp") == "")
        {
          inforss.alert(inforss.get_string("html.mandatory"));
          return false;
        }
      }
    }

    return true;
  },

  /** Update configuration from tab
   *
   * @param {RSS} feed_config - current feed config
   */
  update(feed_config)
  {
  },

  /** Clean up nicely on window close */
  dispose()
  {
//    inforss.remove_event_listeners(this._listeners);
  },

  //FIXME is this necessary?
  /** Get the currently selected feeds menu item
   *
   * @returns {menuitem} the currently selected feed item
   */
  get selected_menu_item()
  {
/**/console.log(this._selected_menu_item)
    return this._selected_menu_item;
  },
});
