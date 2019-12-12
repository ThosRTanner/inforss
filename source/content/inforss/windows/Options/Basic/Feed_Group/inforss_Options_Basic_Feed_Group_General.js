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

//Switch off a lot of eslint warnings for now
/* eslint-disable strict, no-empty-function */

//This is all indicative of brokenness

/* eslint-disable-next-line no-use-before-define, no-var */
var inforss = inforss || {}; // jshint ignore:line

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
    //This is the list of feeds in a group displayed when a group is selected
    {
      const list = this._document.getElementById("group-list-rss");
      const listcols = list.firstChild;
      inforss.remove_all_children(list);
      list.appendChild(listcols);
    }
  },

  /** Display settings for current feed
   *
   * @param {RSS} feed - config of currently selected feed
   */
  display(feed)
  {
  },

  /** Validate contents of tab
   *
   * @param {RSS} feed - config of currently selected feed
   *
   * @returns {boolean} true if all is ok
   */
  validate(feed)
  {
    const type = feed.getAttribute("type");
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
      //eslint-disable-next-line no-lonely-if
      if (this._document.getElementById('optionTitle').value == "" ||
          this._document.getElementById('optionUrl').value == "" ||
          this._document.getElementById('optionLink').value == "" ||
          this._document.getElementById('optionDescription').value == "" ||
          this._document.getElementById('iconurl').value == "")
      {
        inforss.alert(inforss.get_string("pref.mandatory"));
        return false;
      }
    }

    return true;
  },

  /** Update configuration from tab
   *
   * ignored @param {RSS} feed - current feed config
   */
  update(/*feed*/)
  {
  },

  /** Clean up nicely on window close */
  dispose()
  {
    //inforss.remove_event_listeners(this._listeners);
  },


  /** Adds a feed to the 'feed in group' list
   *
   * @param {RSS} feed - feed to add to the list of feeds
   */
  add_feed(feed)
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
          lc.setAttribute("checked", lc.getAttribute("checked") == "false");
        },
        false);
      listitem.appendChild(listcell);
    }

    {
      const listcell = this._document.createElement("listcell");
      listcell.setAttribute("class", "listcell-iconic");
      listcell.setAttribute("image", feed.getAttribute("icon"));
      listcell.setAttribute("value", feed.getAttribute("title"));
      listcell.setAttribute("label", feed.getAttribute("title"));
      //FIXME user data in dom node
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
  },

  /** Remove a feed - takes it out of the list of possible feeds for a group
   *
   * @param {RSS} feed - feed to remove
   */
  remove_feed(feed)
  {
    //FIXME This is broken. We should be removing by URL or we should guarantee
    //unique titles
    const title = feed.getAttribute("title");
    const listbox = this._document.getElementById("group-list-rss");
    for (let listitem = listbox.firstChild.nextSibling; //skip listcols node
         listitem != null;
         listitem = listitem.nextSibling)
    {
      const label = listitem.childNodes[1];
      if (label.getAttribute("value") == title)
      {
        listbox.removeChild(listitem);
        break;
      }
    }
  },

});

