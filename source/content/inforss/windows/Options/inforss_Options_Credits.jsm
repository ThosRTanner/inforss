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
// inforss_Options_Credits
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------

/* jshint globalstrict: true */
/* eslint-disable strict */
"use strict";

/* eslint-disable array-bracket-newline */
/* exported EXPORTED_SYMBOLS */
const EXPORTED_SYMBOLS = [
  "Credits", /* exported Credits */
];
/* eslint-enable array-bracket-newline */

const { add_event_listeners, remove_event_listeners } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Utils.jsm",
  {}
);

const { get_contributors, get_translators } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Version.jsm",
  {}
);

//const { console } =
//  Components.utils.import("resource://gre/modules/Console.jsm", {});

/* eslint-disable no-empty-function */

/** Class for the credits screen. On startup it populates the credits fields
 *
 * @param {XMLDocument} document - the options window document
 * @param {Config} _config - current configuration
 * @param {Options} options - main options window for some common code
 */
function Credits(document, _config, options)
{
  //Populate the fields in the 'credits' window. We only need to this once
  //
  //A note: These things have a name and a URL but I don't know how to
  //populate the URL, and fortunately it's currently blank so I can generally
  //ignore it.
  //NB Justoffs entry should use a url.

  let contributors = get_contributors().join(", ");
  contributors = contributors.replace(/&/g, "&amp;");
  contributors = contributors.replace(/</g, "&lt;");
  contributors = contributors.replace(/>/g, "&gt;");

  document.getElementById("about.contributors").innerHTML =
    contributors + document.getElementById("about.contributors").innerHTML;

  //Translators are more tricky. In install.rdf they'r listed as
  //name (language). We want them as Language (name, name, name)

  const languages = {};
  for (const translator of get_translators())
  {
    const stuff = translator.name.split(" (");
    const language = stuff[1].replace(")", "");
    if (! (language in languages))
    {
      languages[language] = [];
    }
    languages[language].push(stuff[0]);
  }

  const translators = [];
  for (const language1 of Object.keys(languages).sort())
  {
    translators.push(
      language1 + " (" + languages[language1].sort().join(", ") + ")");
  }

  document.getElementById("about.translators").innerHTML =
    translators.join(", ");

  this._options = options;

  this._listeners = add_event_listeners(
    this,
    document,
    [ "credit.translations", "click", this._on_click_translations ],
    [ "credit.paypal", "click", this._on_click_paypal ]
  );
}

Credits.prototype = {

  /** Config has been loaded */
  config_loaded()
  {
  },

  /** Validate contents of tab
   *
   * @returns {boolean} true always
   */
  validate()
  {
    return true;
  },

  /** Update configuration from tab */
  update()
  {
  },

  /** Clean up nicely on window close */
  dispose()
  {
    remove_event_listeners(this._listeners);
  },

  /** Translations link has been clicked
   *
   * @param {MouseEvent} _event - click event
   */
  _on_click_translations(_event)
  {
    this._options.open_url(
      "https://github.com/ThosRTanner/inforss/wiki/Translations"
    );
  },

  /** Paypal image has been clicked
   *
   * @param {MouseEvent} _event - click event
   */
  _on_click_paypal(_event)
  {
    this._options.open_url(
      [
        "https://www.paypal.com/cgi-bin/webscr?cmd=_xclick",
        "business=didier@ernotte.com",
        "item_name=InfoRSS%20extension",
        "no_note=1",
        "currency_code=CAD"
      ].join("&amp;")
    );
  },

};
