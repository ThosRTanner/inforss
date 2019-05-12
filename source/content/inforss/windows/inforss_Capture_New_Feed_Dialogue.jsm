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
// inforss_Capture_New_Feed_Dialogue
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------

/* jshint globalstrict: true */
/* eslint-disable strict */
"use strict";

/* eslint-disable array-bracket-newline */
/* exported EXPORTED_SYMBOLS */
const EXPORTED_SYMBOLS = [
  "Capture_New_Feed_Dialogue", /* exported Capture_New_Feed_Dialogue */
];
/* eslint-enable array-bracket-newline */

const {
  add_event_listeners,
  event_binder,
  remove_event_listeners
} = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Utils.jsm",
  {}
);

const { alert } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Prompt.jsm",
  {}
);

const { get_string } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Version.jsm",
  {}
);

//const { console } =
//  Components.utils.import("resource://gre/modules/Console.jsm", {});

/** Brings up a dialogue for user to connect to a new feed
 *
 * @param {ChromeWindow} window - the current world
 */
function Capture_New_Feed_Dialogue(window)
{
  /* This'd be much nicer but it's not possible to turn a window into a dialog
     window

  this._dialogue = window.openDialog(
    "chrome://inforss/content/windows/inforss_Capture_New_Feed_Dialogue.xul",
    "_blank",
    "modal,centerscreen,resizable=yes, dialog=yes",
    this.returnValue);

  // eslint-disable array-bracket-spacing, array-bracket-newline
  this._listeners = add_event_listeners(
    this,
    null,
    [ this._dialogue, "load", this._on_load ]
  );
  // eslint-enable array-bracket-spacing, array-bracket-newline

  */
  this._result = { valid: false };

  window.openDialog(
    "chrome://inforss/content/windows/inforss_Capture_New_Feed_Dialogue.xul",
    "_blank",
    "modal,centerscreen,resizable=yes, dialog=yes",
    event_binder(this._on_load, this)
  );
}


Capture_New_Feed_Dialogue.prototype = {

  /** Captures the results of the dialogue
   *
   * @returns {Object} magic stuff
   */
  results()
  {
    return this._result;
  },

  /** Window loaded. Fill in any necessary details
   *
   * @param {LoadEvent} event - window loading event
   * @param {ChromeWindow} dialog - the window
   */
  _on_load(event, dialog)
  {
    /* Cant remove this as it doesn't get set up
    remove_event_listeners(this._listeners);
    */

    const document = event.target;
    this._document = document;

    //Because window is modal, I have to do it like this. I could use
    //document.ownerGlobal but this feels nicer.
    this._dialogue = dialog;

    /* eslint-disable array-bracket-spacing, array-bracket-newline */
    this._listeners = add_event_listeners(
      this,
      document,
      [ this._dialogue, "dialogaccept", this._on_dialogue_accept ],
      [ this._dialogue, "unload", this._on_unload ],
      [ "new.rss", "click", this._select_rss ],
      [ "new.html", "click", this._select_html ],
      [ "new.nntp", "click", this._select_nntp ]
    );
    /* eslint-enable array-bracket-spacing, array-bracket-newline */

    document.getElementById("inforss-new-url").focus();

    const type = document.getElementById("inforss-new-type");
    type.value = type.selectedItem.getAttribute("value");
    document.getElementById("inforss-new-title").disabled = true;
  },

  /** Check the user input
   *
   * @returns {boolean} true if ok, else false
   */
  _check()
  {
    const url = this._document.getElementById("inforss-new-url").value;
    if (! url.startsWith("http://") &&
        ! url.startsWith("https://") &&
        ! url.startsWith("news://"))
    {
      return false;
    }

    const type = this._document.getElementById("inforss-new-type").value;

    const title = this._document.getElementById("inforss-new-title").value;

    //Not entirely sure why rss feeds don't need a title.
    if (type != "rss" && title == "")
    {
      return false;
    }

    const user = this._document.getElementById("inforss-new-user").value;
    const password =
      this._document.getElementById("inforss-new-password").value;

    //Sanity check: if they've supplied a password, they should have supplied
    //username as well.
    if (password != "" && user == "")
    {
      return false;
    }

    this._result.title = title;
    this._result.url = url;
    this._result.user = user;
    this._result.password = password;
    this._result.type = type;

    this._result.valid = true;

    return true;
  },

  /** Handle OK button
   *
   * ignored @param {DialogAcceptEvent} event
   */
  _on_dialogue_accept(event)
  {
    const ok = this._check();
    if (! ok)
    {
      event.preventDefault();
      //FIXME Seriously?
      //The message sucks. Should be one for each failure above.
      alert(get_string("new.mandatory.msg"), "new.mandatory.titlebox");
    }
  },

  /** Window closing. Remove all event listeners
   *
   * ignored @param {UnloadEvent} event
   */
  _on_unload(/*event*/)
  {
    remove_event_listeners(this._listeners);
  },

  /** Click on 'rss' radio button
   *
   * ignored @param {MouseEvent} event - click event
   */
  _select_rss(/*event*/)
  {
    this._document.getElementById("inforss-new-title").disabled = true;
    this._document.getElementById("inforss-new-title").value = "";
    this._enable_url_entry();
  },

  /** Click on 'html' radio button
   *
   * ignored @param {MouseEvent} event - click event
   */
  _select_html(/*event*/)
  {
    this._document.getElementById("inforss-new-title").disabled = false;
    this._enable_url_entry();
  },

  /** Set up for html or rss selection */
  _enable_url_entry()
  {
    this._document.getElementById("inforss-new-url").disabled = false;
    const url = this._document.getElementById('inforss-new-url').value;
    //This is sort of strange. If it's blank it leaves it blank,
    //otherwise if it doesn't start with http it sets it to www.
    if (url != "" && ! url.startsWith("http"))
    {
      this._document.getElementById('inforss-new-url').value = 'http://www.';
      this._document.getElementById("inforss-new-url").focus();
    }
  },

  /** Click on 'nntp' radio button
   *
   * ignored @param {MouseEvent} event - click event
   */
  _select_nntp(/*event*/)
  {
    this._document.getElementById("inforss-new-title").disabled = false;
    this._document.getElementById("inforss-new-url").disabled = false;
    const url = this._document.getElementById('inforss-new-url').value;
    if (url != "" && ! url.startsWith("news://"))
    {
      this._document.getElementById('inforss-new-url').value =
        'news://news.acme.com/netscape.mozilla.dev.xul';
      this._document.getElementById("inforss-new-url").focus();
    }
  },
};
