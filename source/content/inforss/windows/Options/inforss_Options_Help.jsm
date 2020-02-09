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
// inforss_Options_Help
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------

/* jshint globalstrict: true */
/* eslint-disable strict */
"use strict";

/* eslint-disable array-bracket-newline */
/* exported EXPORTED_SYMBOLS */
const EXPORTED_SYMBOLS = [
  "Help", /* exported Help */
];
/* eslint-enable array-bracket-newline */

const { add_event_listeners } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Utils.jsm",
  {}
);

const { Base } = Components.utils.import(
  "chrome://inforss/content/windows/Options/inforss_Options_Base.jsm",
  {}
);

//const { console } =
//  Components.utils.import("resource://gre/modules/Console.jsm", {});

/** Class for the help screen.
 *
 * @param {XMLDocument} document - the options window document
 * @param {Options} options - main options window for some common code
 */
function Help(document, options)
{
  Base.call(this, document, options);

  this._listeners = add_event_listeners(
    this,
    document,
    [ "help.homepage", "click", this._on_link_clicked ],
    [ "help.wiki", "click", this._on_link_clicked ],
    [ "help.faq", "click", this._on_link_clicked ],
    [ "help.mozdev.homepage", "click", this._on_link_clicked ],
    [ "help.mozdev.faq", "click", this._on_link_clicked ],
    [ "help.mozdev.notes", "click", this._on_link_clicked ],
    [ "help.mozdev.screenshots", "click", this._on_link_clicked ],
    [ "help.mozdev.mailinglist", "click", this._on_link_clicked ]
  );
}

Help.prototype = Object.create(Base.prototype);
Help.prototype.constructor = Help;

Object.assign(Help.prototype, {

  /** This is called when any of the links on the help page is clicked.
   *
   * @param {MouseEvent} event - mouse click event
   */
  _on_link_clicked(event)
  {
    this._options.open_url(event.target.value);
  },

});
