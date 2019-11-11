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
 *   Tom Tanner <didier@ernotte.com>.
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
// inforss_Filter
// Author : Tom Tanner, 2019
// Inforss extension
//------------------------------------------------------------------------------

/* jshint globalstrict: true */
/* eslint-disable strict */
"use strict";

/* eslint-disable array-bracket-newline */
/* exported EXPORTED_SYMBOLS */
const EXPORTED_SYMBOLS = [
  "Filter", /* exported Filter */
];
/* eslint-enable array-bracket-newline */

const Compare_Less = 0;
const Compare_Greater = 1;
const Compare_Same = 2;

const Type_Headline_Regex = 0;
const Type_Description_Regex = 1;
const Type_Category_Regex = 2;
const Type_Date_Published = 3;
const Type_Date_Received = 4;
const Type_Date_Read = 5;
const Type_Headline_Number = 6;

const Time_Unit_Second = 0;
const Time_Unit_Minute = 1;
const Time_Unit_Hour = 2;
const Time_Unit_Day = 3;
const Time_Unit_Week = 4;
const Time_Unit_Month = 5;
const Time_Unit_Year = 6;

const { console } =
  Components.utils.import("resource://gre/modules/Console.jsm", {});

/** This class wraps up the concept of a headline filter
 *
 * @param {Element} filter - filter configuration
 * @param {boolean} case_sensitive - true if matches are to be case sensitive
 *
 */
function Filter(filter, case_sensitive)
{
  this._active = filter.getAttribute("active") == "true";

  this._type = parseInt(filter.getAttribute("type"), 10);

  this._regex = new RegExp(filter.getAttribute("text"),
                           case_sensitive ? '' : 'i');
  //FIXME Why not true/false?
  this._regex_matches = filter.getAttribute("include") == "0";

  this._date_compare_mode = parseInt(filter.getAttribute("compare"), 10);
  this._date_elapse = parseInt(filter.getAttribute("elapse"), 10);
  this._date_unit = parseInt(filter.getAttribute("unit"), 10);

  this._headline_compare_mode = parseInt(filter.getAttribute("hlcompare"), 10);
  this._headline_number = parseInt(filter.getAttribute("nb"), 10);
}

// This is an assign function that copies full descriptors (ripped off from MDN)
/* eslint-disable require-jsdoc, no-shadow */
function complete_assign(target, ...sources)
{
  sources.forEach(
    source =>
    {
      const descriptors = Object.keys(source).reduce(
        (descriptors, key) =>
        {
          descriptors[key] = Object.getOwnPropertyDescriptor(source, key);
          return descriptors;
        },
        {}
      );
      // by default, Object.assign copies enumerable Symbols too
      Object.getOwnPropertySymbols(source).forEach(
        sym =>
        {
          const descriptor = Object.getOwnPropertyDescriptor(source, sym);
          if (descriptor.enumerable)
          {
            descriptors[sym] = descriptor;
          }
        }
      );
      Object.defineProperties(target, descriptors);
    }
  );
  return target;
}
/* eslint-enable require-jsdoc, no-shadow */

//A note: I can't use Object.assign here as it has getters/setters
//JS2017 has Object.getOwnPropertyDescriptors() and I could do
//Config.prototype = Object.create(
//  Config.prototype,
//  Object.getOwnPropertyDescriptors({...}));
//I think

complete_assign(Filter.prototype, {

  /** Get the active state
   *
   * @returns {boolean} true if filter is enabledPlugin
   */
  get active()
  {
    return this._active;
  },

  /** Matches headline against filter
   *
   * @param {Headline} headline - to match
   * @param {integer} index - of headline in feed.
   *
   * @returns {boolean} true if the headline matches the filter.
   */
  match(headline, index)
  {
    switch (this._type)
    {
      default:
        console.log("Unexpected filter type", this);

        /* falls through */
      case Type_Headline_Regex:
        return this._check_text_filter(headline.title);

      case Type_Description_Regex:
        return this._check_text_filter(headline.description);

      case Type_Category_Regex:
        return this._check_text_filter(headline.category);

      case Type_Date_Published:
        return this._check_date_filter(headline.publishedDate);

      case Type_Date_Received:
        return this._check_date_filter(headline.receivedDate);

      case Type_Date_Read:
        return headline.readDate == null ||
               this._check_date_filter(headline.readDate);

      case Type_Headline_Number:
        return this._check_headline_filter(index);
    }
  },

  /** Check if the headlines index matches the filter
   *
   * @param {integer} index - of headline
   *
   * @returns {boolean} true if matches filter
   */
  _check_headline_filter(index)
  {
    switch (this._headline_compare_mode)
    {
      default:
        console.log("Unexpected filter comparison mode", this);

        /* falls through */
      case Compare_Less:
        return index + 1 < this._headline_number;

      case Compare_Greater:
        return index + 1 > this._headline_number;

      case Compare_Same:
        return index + 1 == this._headline_number;
    }
  },

  /** See if headline matches text filter
   *
   * @param {string} text - text to check against filter
   *
   * @returns {boolean} true if headline matches filter
   */
  _check_text_filter(text)
  {
    /* eslint-disable indent */
    return this._regex_matches ? this._regex.test(text) :
                                 ! this._regex.test(text);
    /* eslint-enable indent */
  },

  /** See if headline matches date filter
   *
   * @param {Date} date - date to check against filter
   *
   * @returns {boolean} true if headline matches filter
   */
  _check_date_filter(date)
  {
    const age = new Date() - date;
    const delta = this._get_delta(0);

    switch (this._date_compare_mode)
    {
      default:
        console.log("Unexpected date comparison", this);

        /* falls through */
      case Compare_Less:
        return age < delta;

      case Compare_Greater:
        return age >= delta;

      case Compare_Same:
        return delta <= age && age < this._get_delta(1);
    }
  },

  /** get the time delta in milliseconds
   *
   * @param {integer} offset - extra offset from elpased time.
   *
   * @returns {integer} milliseconds
   */
  _get_delta(offset)
  {
    const elapse = this._date_elapse + offset;
    switch (this._date_unit)
    {
      default:
        console.log("Unexpected filter unit", this);

        /* falls through */
      case Time_Unit_Second:
        return elapse * 1000;

      case Time_Unit_Minute:
        return elapse * 60 * 1000;

      case Time_Unit_Hour:
        return elapse * 3600 * 1000;

      case Time_Unit_Day:
        return elapse * 24 * 3600 * 1000;

      case Time_Unit_Week:
        return elapse * 7 * 24 * 3600 * 1000;

      case Time_Unit_Month:
        return elapse * 30 * 24 * 3600 * 1000;

      case Time_Unit_Year:
        return elapse * 365 * 24 * 3600 * 1000;
    }
  },

});
