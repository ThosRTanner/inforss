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
// inforss_Trash_Icon
// Author : Tom Tanner 2019
//------------------------------------------------------------------------------
/* jshint globalstrict: true */
/* eslint-disable strict */
"use strict";

/* eslint-disable array-bracket-newline */
/* exported EXPORTED_SYMBOLS */
const EXPORTED_SYMBOLS = [
  "Trash_Icon", /* exported Trash_Icon */
];
/* eslint-enable array-bracket-newline */

const { MIME_feed_url } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Constants.jsm",
  {}
);

const { alert } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Prompt.jsm",
  {}
);

const {
  add_event_listeners,
  option_window_displayed,
  remove_event_listeners
} = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Utils.jsm",
  {}
);

const { get_string } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Version.jsm",
  {}
);

const mediator = {};
Components.utils.import(
  "chrome://inforss/content/mediator/inforss_Mediator_API.jsm",
  mediator);

/** This deals with events on the trash icon
 *
 * @class
 *
 * @param {Config} config - extension configuration
 * @param {document} document - the DOM
 */
function Trash_Icon(config, document)
{
  this._config = config;
  this._document = document;

  this._trash = document.getElementById("inforss.menu.trash");

  /* eslint-disable array-bracket-spacing, array-bracket-newline */
  this._listeners = add_event_listeners(
    this,
    null,
    [ this._trash, "command", this._on_command ],
    [ this._trash, "dragover", this._on_drag_over ],
    [ this._trash, "drop", this._on_drop ],
    [ this._trash, "mouseup", this._on_mouse_up]
  );
  /* eslint-enable array-bracket-spacing, array-bracket-newline */
}

Trash_Icon.prototype = {

  /** Mark trash icon as disabled */
  disable()
  {
    this._trash.disabled = option_window_displayed();
  },

  /** Clean up on shutdown, deregister any event handlers */
  dispose()
  {
    remove_event_listeners(this._listeners);
  },

  /** Command event opens the option window if ctrl key is down
   *
   * @param {XULCommandEvent} event - the event
   */
  _on_command(event)
  {
    if (event.ctrlKey)
    {
      this._open_option_window();
    }
  },

  /** Handle a drag over the trash icon on the popup menu
   *
   * @param {DragEvent} event - the event
   */
  _on_drag_over(event)
  {
    if (event.dataTransfer.types.includes(MIME_feed_url) &&
        ! option_window_displayed())
    {
      event.dataTransfer.dropEffect = "move";
      event.preventDefault();
    }
  },

  /** Handle a drop on the trash icon on the popup menu - delete the feeds
   *
   * @param {DragEvent} event - the event
   */
  _on_drop(event)
  {
    const feeds = event.dataTransfer.getData('text/uri-list').split('\r\n');
    for (let feed of feeds)
    {
      this._config.remove_feed(feed);
    }
    this._config.save();
    mediator.remove_feeds(feeds);
    event.stopPropagation();
  },

  /** Mouse up event opens the option window on right click
   *
   * @param {MouseEvent} event - mouse up event
   */
  _on_mouse_up(event)
  {
    if (event.button == 2)
    {
      this._open_option_window();
    }
  },

  /** Open the option window if it isn't already */
  _open_option_window()
  {
    if (option_window_displayed())
    {
      //I have a settings window open already
      alert(get_string("option.dialogue.open"));
    }
    else
    {
      this._document.defaultView.openDialog(
        "chrome://inforss/content/inforssOption.xul",
        "_blank",
        "chrome,centerscreen,resizable=yes,dialog=no"
      );
    }
  },

};
