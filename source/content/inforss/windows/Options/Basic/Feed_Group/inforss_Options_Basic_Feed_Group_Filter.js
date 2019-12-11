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
// inforss_Options_Basic_Feed_Group_Filter.js
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------

/* exported inforss_Options_Basic_Feed_Group_Filter */

/* eslint-disable array-bracket-newline */
/* exported EXPORTED_SYMBOLS */
//const EXPORTED_SYMBOLS = [
//  "Filter", /* exported Filter */
//];
/* eslint-enable array-bracket-newline */

/* eslint-disable strict */

//This is all indicative of brokenness

var inforss = inforss || {};

Components.utils.import("chrome://inforss/content/modules/inforss_Utils.jsm",
                        inforss);

Components.utils.import("chrome://inforss/content/modules/inforss_Prompt.jsm",
                        inforss);

Components.utils.import("chrome://inforss/content/modules/inforss_Version.jsm",
                        inforss);

/** Contains the code for the 'Basic' tab in the option screen
 *
 * @param {XMLDocument} document - the options window this._document
 * @param {Config} config - current configuration
 */
function inforss_Options_Basic_Feed_Group_Filter(document, config)
{
  this._document = document;
  this._config = config;

  {
    const numbers = this._document.createElement("menupopup");
    //FIXME this (rss.filter.number.1) is used in reset filter and i'm not sure
    //what it does
    numbers.setAttribute("id", "rss.filter.number.1");

    const menu99 = this._document.getElementById("rss.filter.number");
    const headline_numbers = this._document.getElementById("rss.filter.hlnumber");
    menu99.appendChild(numbers);
    for (let number = 0; number < 100; number += 1)
    {
      menu99.appendItem(number, number);
      if (number < 51)
      {
        headline_numbers.appendItem(number, number);
      }
    }
  }

  this._filter_list = document.getElementById("inforss.filter.vbox");
  /*
  this._listeners = inforss.add_event_listeners(
    this,
    this._document,
    [ "make.current", "command", this._make_current ],
    [ "remove", "command", this._remove_feed ]
  );
  */
}

inforss_Options_Basic_Feed_Group_Filter.prototype = {

  /** Config has been loaded */
  config_loaded()
  {
  },

  /** Validate contents of tab
   *
   * ignored @param {RSS} current_feed - config of currently selected feed
   *
   * @returns {boolean} true if no invalid filters (i.e. empty text fields)
   */
  validate(/*current_feed*/)
  {
    for (const filter of this._filter_list.childNodes)
    {
      if (filter.childNodes[0].checked &&
          filter.childNodes[1].selectedIndex <= 2 && //Headline, Body, Category
          filter.childNodes[2].firstChild.childNodes[1].value == "")
      {
        //FIXME have another string for this - filter canot have blank text
        inforss.alert(inforss.get_string("pref.mandatory"));
        return false;
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
    //Remove all the filters
    this._config.feed_clear_filters(feed_config);

    //And add in the selected filters. Note that there is always one filter in
    //a group. This isn't really necessary but it's easier for the UI so you
    //can enable or disable even a single filter easily.
    for (const filter of this._filter_list.childNodes)
    {
      const deck = filter.childNodes[2];
      //What is stored here is messy
      //active: true/false
      //type: headline, body, category: include/exclude, string
      const string_match = deck.childNodes[0];
      //      published date, received date, read date:
      //          less than/more than/equals,
      //          0-99
      //          seconds, minutes, hours, days, weeks, months, years
      const time_match = deck.childNodes[1];
      //      headline #: less than/more than/equals 0-50
      const head_match = deck.childNodes[2];
      //FIXME It'd be more sensible to abstract the filter calculation and
      //make lots of little filter classes each with own comparison.
      //Which could then drive the UI dynamically.
      this._config.feed_add_filter(feed_config, {
        active: filter.childNodes[0].checked,
        type: filter.childNodes[1].selectedIndex,
        include: string_match.childNodes[0].selectedIndex, //include/exclude
        text: string_match.childNodes[1].value, //text
        compare: time_match.childNodes[0].selectedIndex, //<, >, =
        elapse: time_match.childNodes[1].selectedIndex, //0-99
        unit: time_match.childNodes[2].selectedIndex, //s---y
        hlcompare: head_match.childNodes[0].selectedIndex, //<, >, =
        nb: head_match.childNodes[1].selectedIndex //0-50
      });
    }
  },

  /** Clean up nicely on window close */
  dispose()
  {
//    inforss.remove_event_listeners(this._listeners);
  },

};