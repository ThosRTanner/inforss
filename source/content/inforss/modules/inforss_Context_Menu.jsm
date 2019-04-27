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
// inforss_Context_Menu
// Author : Tom Tanner, 2019
// Inforss extension
//------------------------------------------------------------------------------

/* jshint globalstrict: true */
/* eslint-disable strict */
"use strict";

/* eslint-disable array-bracket-newline */
/* exported EXPORTED_SYMBOLS */
const EXPORTED_SYMBOLS = [
  "Context_Menu", /* exported Context_Menu */
];
/* eslint-enable array-bracket-newline */

const {
  add_event_listeners,
  remove_event_listeners
} = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Utils.jsm",
  {}
);

//const { console } =
//  Components.utils.import("resource://gre/modules/Console.jsm", {});

/** Context menu handler.
 *
 * @class
 *
 * If you right click and the text selection can be reasonably interpreted asin
 * a url, adds 'add feed' to context menu
 *
 * @param {Mediator} mediator - the global mediator
 * @param {Document} document - current window document
 */
function Context_Menu(mediator, document)
{
  this._mediator = mediator;
  this._document = document;
  this._added_popup = document.getElementById("inforss.popup.addfeed");
  /* eslint-disable array-bracket-spacing, array-bracket-newline */
  this._listeners = add_event_listeners(
    this,
    null,
    [ document.getElementById("contentAreaContextMenu"),
      "popupshowing",
      this._on_popup_showing ],
    [ this._added_popup, "command", this._on_command ]
  );
  /* eslint-enable array-bracket-spacing, array-bracket-newline */
  this._url = null;
}

Context_Menu.prototype =
{

  /** Clean up on shutdown */
  dispose()
  {
    remove_event_listeners(this._listeners);
  },

  /** Context menu popped up. Determine if it's over a url and hide or reveal
   * our entry
   *
   * @param {PopupShowingEvent} event - command event
   */
  _on_popup_showing(event)
  {
    const node = event.target.triggerNode;

    //The documentation is somewhat unclear here, but I am fairly sure that
    //the triggerNode is actually an Element. It has been in the pages I've
    //looked at anyway.

    let selection = "";
    const local_name = node.localName;
    if (local_name == "textarea" ||
        //eslint-disable-next-line no-extra-parens
        (local_name == "input" && node.type == "text"))
    {
      selection = node.value.substring(node.selectionStart,
                                       node.selectionEnd);
    }
    else if (local_name == "a")
    {
      selection = node.href;
    }
    else if (local_name == "img" && node.parentNode.nodeName == "A")
    {
      selection = node.parentNode.href;
    }
    else
    {
      const focusedWindow = this._document.commandDispatcher.focusedWindow;
      selection = focusedWindow.getSelection().toString();
    }

    // Limit length to 150 to optimize performance. Longer does not make sense
    if (selection.length >= 150)
    {
      selection = selection.substring(0, 149);
    }

    //Clean up white space
    selection = selection.replace(/(\n|\r|\t)+/g, " ");

    //Strip off leading white space
    selection = selection.replace(/^\s+/g, "");

    //And now remove anything after the 1st space
    {
      const index = selection.indexOf(" ");
      if (index != -1)
      {
        selection = selection.substring(0, index);
      }
    }

    //FIXME Should include news:// and nntp://
    if (selection.startsWith("http://") || selection.startsWith("https://"))
    {
      this._added_popup.hidden = false;
      this._url = selection;
    }
    else
    {
      this._added_popup.hidden = true;
    }
  },

  /** Clicked on our added menu entry
   *
   * unused param {CommandEvent} event - command event
   */
  _on_command(/*event*/)
  {
    this._mediator.add_feed_from_url(this._url);
  }
};
