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
// inforss_Added_New_Feed_Dialogue
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------

/* jshint globalstrict: true */
/* eslint-disable strict */
"use strict";

/* eslint-disable array-bracket-newline */
/* exported EXPORTED_SYMBOLS */
const EXPORTED_SYMBOLS = [
  "Added_New_Feed_Dialogue", /* exported Added_New_Feed_Dialogue */
];
/* eslint-enable array-bracket-newline */

//const { console } =
//  Components.utils.import("resource://gre/modules/Console.jsm", {});

/** Brings up a dialogue when adding a new feed allowing the user to select it
 * as the current feed
 *
 * @param {Document} document - the current world
 * @param {Object} feed - new feed configuration
 * @param {Feed_Manager} feed_manager - owner of me.
 */
function Added_New_Feed_Dialogue(document, feed, feed_manager)
{
  this._feed_manager = feed_manager;
  this._feed = feed;
  this._dialogue = document.defaultView.open(
    "chrome://inforss/content/windows/inforss_Added_New_Feed_Dialogue.xul",
    "_blank",
    "chrome,centerscreen,resizable=yes,dialog=no"
  );

  this._on_load = this.__on_load.bind(this);
  this._dialogue.addEventListener("load", this._on_load);
}

Added_New_Feed_Dialogue.prototype = {

  /** Window loaded. Fill in any necessary details
   *
   * @param {LoadEvent} event - window loading event
   */
  __on_load(event)
  {
    this._dialogue.removeEventListener("load", this._on_window_load);

    this._on_dialog_accept = this.__on_dialogue_accept.bind(this);
    this._dialogue.addEventListener("dialogaccept", this._on_dialog_accept);

    this._on_unload = this.__on_unload.bind(this);
    this._dialogue.addEventListener("unload", this._on_unload);

    const rss = this._feed;
    const document = event.target;
    for (let tag of ["title", "url", "link", "description"])
    {
      let val = rss.getAttribute(tag);
      if (val.length > 70)
      {
        val = val.substr(0, 67) + "...";
      }
      document.getElementById("inforss.add.new." + tag).value = val;
    }

    document.getElementById("inforss.add.new.icon").src =
      rss.getAttribute("icon");

    const current = this._feed_manager.get_selected_feed().feedXML;
    if (current != null)
    {
      document.getElementById("inforss.add.current.title").value =
        current.getAttribute("title");
      document.getElementById("inforss.add.current.icon").src =
        current.getAttribute("icon");
    }
  },

  /** Handle OK button
   *
   * ignored param {DialogAcceptEvent} event
   */
  __on_dialogue_accept(/*event*/)
  {
    this._feed_manager.setSelected(this._feed.getAttribute("url"));
  },

  /** Window closing. Remove all event listeners
   *
   * ignored param {UnloadEvent} event
   */
  __on_unload()
  {
    this._dialogue.removeEventListener("dialogaccept", this._on_dialog_accept);
    this._dialogue.removeEventListener("unload", this._on_unload);
  }
};
