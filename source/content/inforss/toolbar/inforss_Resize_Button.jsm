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
// inforss_Resize_Button
// Author : Tom Tanner 2018
//------------------------------------------------------------------------------
/* jshint globalstrict: true */
/* eslint-disable strict */
"use strict";

/* eslint-disable array-bracket-newline */
/* exported EXPORTED_SYMBOLS */
const EXPORTED_SYMBOLS = [
  "Resize_Button", /* exported Resize_Button */
];
/* eslint-enable array-bracket-newline */

//const { console } =
//  Components.utils.import("resource://gre/modules/Console.jsm", {});

/** Class which controls the resize button
 * @class
 *
 * @param {Config} config - main configuration
 * @param {Headline_Display} headline_display - headline scrolling
 * @param {Object} document - the main DOM document
 * @param {Object} box - the entire box
 */
function Resize_Button(config, headline_display, document, box)
{
  this._config = config;
  this._headline_display = headline_display;
  this._box = box;

  this._resizer_position = 0;
  this._bar_width = 0;
  this._can_resize = false;

  const resizer = document.getElementById("inforss.resizer");
  this._resizer_mouse_up = this.__resizer_mouse_up.bind(this);
  resizer.addEventListener("mouseup", this._resizer_mouse_up);
  this._resizer_mouse_down = this.__resizer_mouse_down.bind(this);
  resizer.addEventListener("mousedown", this._resizer_mouse_down);

  //FIXME REFACTOR THIS!
  let addon_bar = document.getElementById("addon-bar");
  if (addon_bar == null ||
      addon_bar.getAttribute("toolbarname") != "Status Bar")
  {
    addon_bar = document.getElementById("status4evar-status-bar");
    if (addon_bar == null)
    {
      addon_bar = document.getElementById("inforss-addon-bar");
    }
  }

  this._mouse_move = this.__mouse_move.bind(this);
  addon_bar.addEventListener("mousemove", this._mouse_move);
}

Resize_Button.prototype = {

  //FIXME why do we need this. It'd mean we'd started dragging then clicked on
  //the enable scrolling button
  /** Disables the resizing ability. */
  disable_resize()
  {
    this._can_resize = false;
  },

  /** Mouse up (release) on resizer icon
   *
   * Fixes the size, and checks whether or not to scroll
   *
   * ignored param {MouseEvent} event - Mouse up event
   */
  __resizer_mouse_up(/*event*/)
  {
    this._config.save();
    this._can_resize = false;
    this._headline_display.checkStartScrolling();
    //FIXME remove the onmousemove handler here?
  },

  /** Mouse down on resizer icon
   *
   * This starts the resize of the display area on the status bar.
   *
   * @param {MouseEvent} event - Mouse down event
   */
  //Mouse pressed over resizer button.
  //enable resizing
  __resizer_mouse_down(event)
  {
    this._resizer_position = event.clientX;
    this._bar_width = parseInt(this._box.width, 10);
    this._can_resize = true;
    //FIXME add the onmousemove handler here?
  },

  //FIXME what about mouseout or mouseleave to stop . can we also constrain
  // the mouse not to leave? (see the experimental PointerLock api)
  /** Mouse move anywhere on the status bar
   *
   * This is called whenever the mouse moves over anywhere the status bar.
   * If we come in with the button unclicked, pretend we had an up.
   *
   * @param {MouseEvent} event - Mouse move event
   */
  __mouse_move(event)
  {
    if (this._can_resize &&
        this._config.headline_bar_location == this._config.in_status_bar)
    {
      //jshint bitwise: false
      //eslint-disable-next-line no-bitwise
      if ((event.buttons & 1) == 0)
      //jshint bitwise: true
      {
        //What probably happened is we drifted off the bar and released the
        //mouse. In that case we dont receive a raised click, so deal with it
        //now
        this.__resizer_mouse_up(event);
      }
      else
      {
        const width =
          this._bar_width - (event.clientX - this._resizer_position);
        if (width > 10)
        {
          this._config.status_bar_scrolling_area = width;
          this._headline_display.resizedWindow();
        }
      }
    }
  }
};
