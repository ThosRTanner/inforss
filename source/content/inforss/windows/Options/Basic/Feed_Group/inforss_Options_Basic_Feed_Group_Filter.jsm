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
// inforss_Options_Basic_Feed_Group_Filter
// Author : Didier Ernotte 2005
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

const { event_binder, replace_without_children } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Utils.jsm",
  {}
);

const { alert } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Prompt.jsm",
  {}
);

const { Feed_Page } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Feed_Page.jsm",
  {}
);

const { get_string } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Version.jsm",
  {}
);

const { Base } = Components.utils.import(
  "chrome://inforss/content/windows/Options/inforss_Options_Base.jsm",
  {}
);

const { console } = Components.utils.import(
  "resource://gre/modules/Console.jsm",
  {}
);

/** Contains the code for the 'Basic' tab in the option screen
 *
 * @param {XMLDocument} document - the options window this._document
 * @param {Options} options - main options window for some common code
 */
function Filter(document, options)
{
  Base.call(this, document, options);

  this._request = null;

  //Populate the vatious number popups
  {
    const numbers = this._document.createElement("menupopup");
    const menu99 = this._document.getElementById("rss.filter.number");
    menu99.appendChild(numbers);

    const headline_nos = this._document.getElementById("rss.filter.hlnumber");
    for (let number = 0; number < 100; number += 1)
    {
      menu99.appendItem(number, number);
      if (number < 51)
      {
        headline_nos.appendItem(number, number);
      }
    }
  }

  this._any_all = document.getElementById("inforss.filter.anyall");
  this._filter_list = document.getElementById("inforss.filter.vbox");
}

const Super = Base.prototype;
Filter.prototype = Object.create(Super);
Filter.prototype.constructor = Filter;

Object.assign(Filter.prototype, {

  /** Display settings for current feed
   *
   * @param {RSS} feed - config of currently selected feed
   */
  display(feed)
  {
    if (feed.getAttribute("type") == "group")
    {
      this._document.getElementById('inforss.filter.forgroup').collapsed =
        false;
      this._document.getElementById("inforss.filter.policy").selectedIndex =
        feed.getAttribute("filterPolicy");
    }
    else
    {
      this._document.getElementById('inforss.filter.forgroup').collapsed = true;
    }

    this._document.getElementById("filterCaseSensitive").selectedIndex =
      feed.getAttribute("filterCaseSensitive") == "true" ? 0 : 1;

    this._any_all.selectedIndex = feed.getAttribute("filter") == "all" ? 0 : 1;

    this._setup_filter_list(feed);
    // Set up with a blank list for now
    this._setup_categories([]);

    //And then fetch the correct values
    switch (feed.getAttribute("type"))
    {
      case "html":
      case "atom":
      case "rss":
        this._fetch_rss_categories(feed);
        break;

      default:
        //no categories that I can fetch
        break;
    }
  },

  /** Set up the filter list
   *
   * @param {RSS} feed - the feed
   */
  _setup_filter_list(feed)
  {
    //Take a copy of the first menu item so we can clone the structure
    const blank_filter = this._filter_list.firstChild;

    //Empty the filter list
    this._filter_list = replace_without_children(this._filter_list);

    const vbox = this._filter_list;

    for (const filter of feed.getElementsByTagName("FILTER"))
    {
      const hbox = blank_filter.cloneNode(true);
      vbox.appendChild(hbox);
      this._add_filter_listeners(hbox);

      const type = hbox.childNodes[1];
      type.selectedIndex = filter.getAttribute("type");

      const deck = hbox.childNodes[2];
      deck.selectedIndex =
        type.selectedIndex <= 2 ? 0 :
        type.selectedIndex <= 5 ? 1 :
        2;

      //headline, body, category filter
      const by_text = deck.childNodes[0];
      by_text.childNodes[0].selectedIndex = filter.getAttribute("include");
      by_text.childNodes[1].value = filter.getAttribute("text");

      //published date, received date, read date
      const by_time = deck.childNodes[1];
      by_time.childNodes[0].selectedIndex = filter.getAttribute("compare");
      by_time.childNodes[1].selectedIndex = filter.getAttribute("elapse");
      by_time.childNodes[2].selectedIndex = filter.getAttribute("unit");

      //headline #
      const by_num = deck.childNodes[2];
      by_num.childNodes[0].selectedIndex = filter.getAttribute("hlcompare");
      by_num.childNodes[1].selectedIndex = filter.getAttribute("nb");

      const checked = filter.getAttribute("active") == "true";
      if (checked)
      {
        this._enable_filter(hbox);
      }
      else
      {
        this._disable_filter(hbox);
      }
    }

    if (vbox.childElementCount == 0)
    {
      //List was empty - add a blank entry (is this possible?)
      const hbox = blank_filter;
      this._filter_list.appendChild(hbox);

      this._disable_filter(hbox);

      hbox.childNodes[1].selectedIndex = 0; //type

      const filter = hbox.childNodes[2];
      filter.selectedIndex = 0; //deck
      filter.childNodes[0].childNodes[0].selectedIndex = 0; //include/exclude
      filter.childNodes[0].childNodes[1].removeAllItems(); //text

      const selectFolder = this._document.createElement("menupopup");
      filter.childNodes[0].childNodes[1].appendChild(selectFolder);
      filter.childNodes[0].childNodes[1].value = ""; //text

      filter.childNodes[1].childNodes[0].selectedIndex = 0; //more/less
      filter.childNodes[1].childNodes[1].selectedIndex = 0; //1-100
      filter.childNodes[1].childNodes[2].selectedIndex = 0; //sec, min,...

      filter.childNodes[2].childNodes[0].selectedIndex = 0; //more/less
      filter.childNodes[2].childNodes[1].selectedIndex = 0; //1-50
    }
  },

  /** Adds the necessary event listeners to a filter row
   *
   * @param {Element} filter - filter row hbox
   */
  _add_filter_listeners(filter)
  {
    //The enable checkbox
    const checkbox = filter.childNodes[0];
    filter.childNodes[0].addEventListener(
      "command",
      event_binder(this._change_filter_state, this, checkbox)
    );

    //Type popup
    const type = filter.childNodes[1];
    type.addEventListener(
      "command",
      event_binder(this._change_filter_type, this, type)
    );

    //The + button
    filter.childNodes[3].childNodes[1].addEventListener(
      "click",
      event_binder(this._add_filter, this, filter)
    );

    //The - button
    filter.childNodes[4].childNodes[1].addEventListener(
      "click",
      event_binder(this._remove_filter, this, filter)
    );
  },

  /** Fetch categories for rss/atom feed
   *
   * @param {RSS} rss - the feed
   */
  _fetch_rss_categories(rss)
  {
    if (this._request != null)
    {
      console.log("Aborting category fetch", this._request);
      this._request.abort();
    }
    const request = new Feed_Page(
      rss.getAttribute("url"),
      { feed_config: rss, user: rss.getAttribute("user") }
    );
    this._request = request;
    request.fetch().then(
      () => this._setup_categories(request.categories)
    ).catch(
      err =>
      {
        console.log("Category fetch error", err);
      }
    ).then( //finally
      () =>
      {
        this._request = null;
      }
    );
  },

  /** Validate contents of tab
   *
   * ignored @param {RSS} feed - config of currently selected feed
   *
   * @returns {boolean} true if no invalid filters (i.e. empty text fields)
   */
  validate(/*feed*/)
  {
    for (const filter of this._filter_list.childNodes)
    {
      if (filter.childNodes[0].checked &&
          filter.childNodes[1].selectedIndex <= 2 && //Headline, Body, Category
          filter.childNodes[2].firstChild.childNodes[1].value == "")
      {
        //FIXME have another string for this - filter canot have blank text
        alert(get_string("pref.mandatory"));
        return false;
      }
    }
    return true;
  },

  /** Update configuration from tab
   *
   * @param {RSS} feed - current feed config
   */
  update(feed)
  {
    if (feed.getAttribute("type") == "group")
    {
      feed.setAttribute(
        "filterPolicy",
        this._document.getElementById("inforss.filter.policy").selectedIndex);
    }

    feed.setAttribute(
      "filter",
      this._any_all.selectedIndex == 0 ? "all" : "any"
    );

    feed.setAttribute(
      "filterCaseSensitive",
      this._document.getElementById('filterCaseSensitive').selectedIndex == 0
    );

    //Remove all the filters
    this._config.feed_clear_filters(feed);

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
      this._config.feed_add_filter(feed, {
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
    if (this._request != null)
    {
      this._request.abort();
      console.log("Aborting category request", this._request);
      this._request = null;
    }
    Super.dispose.call(this);
  },

  /** Event handler for clicking on the filter checkbox
   *
   * @param {Checkbox} checkbox - checkbox in row
   * ignored @param {XULCommandEvent} event - command event
   */
  _change_filter_state(checkbox/*, event*/)
  {
    this._set_filter_disabled_state(checkbox.parentNode, ! checkbox.checked);
  },

  /** Event handler for clicking on the filter type menu
   *
   * @param {MenuList} menu - filter type menu
   * ignored @param {XULCommandEvent} event - command event
   */
  _change_filter_type(menu/*, event*/)
  {
    menu.nextSibling.selectedIndex =
      menu.selectedIndex <= 2 ? 0 :
      menu.selectedIndex <= 5 ? 1 : /* eslint-disable-next-line indent */
                                2;
  },

  /** Event handler for clicking on the filter add button
   *
   * @param {hbox} filter - the filter row
   * @param {MouseEvent} event - click event
   */
  _add_filter(filter, event)
  {
    //ignore if disabled
    if (event.target.disabled)
    {
      return;
    }

    const hbox = filter.cloneNode(true);
    filter.parentNode.appendChild(hbox);
    this._add_filter_listeners(hbox);
    this._enable_filter(hbox);
  },

  /** Event handler for clicking on the filter remove button
   *
   * @param {hbox} filter - the filter row
   * @param {MouseEvent} event - click event
   */
  _remove_filter(filter, event)
  {
    //ignore if disabled
    if (event.target.disabled)
    {
      return;
    }

    if (filter.parentNode.childNodes.length == 1)
    {
      alert(get_string("remove.last"));
    }
    else
    {
      filter.remove();
    }
  },

  /** enable filter row
   *
   * @param {Node} hbox - row to enable
   */
  _enable_filter(hbox)
  {
    this._set_filter_disabled_state(hbox, false);
  },

  /** disable filter row
   *
   * @param {Node} hbox - row to enable
   */
  _disable_filter(hbox)
  {
    this._set_filter_disabled_state(hbox, true);
  },

  /** Set filter row to enabled/disabled
   *
   * Do not call this. It's unreadable
   *
   * @param {Node} hbox - node to setActive
   * @param {boolean} status - true if disable, false if enabled
   */
  _set_filter_disabled_state(hbox, status)
  {
    hbox.childNodes[0].checked = ! status;
    hbox.childNodes[1].disabled = status; //type
    hbox.childNodes[2].disabled = status; //deck
    const filter = hbox.childNodes[2];
    filter.childNodes[0].childNodes[0].disabled = status; //include/exclude
    filter.childNodes[0].childNodes[1].disabled = status; //text
    filter.childNodes[1].childNodes[0].disabled = status; //more/less
    filter.childNodes[1].childNodes[1].disabled = status; //1-100
    filter.childNodes[1].childNodes[2].disabled = status; //sec, min,...
    filter.childNodes[2].childNodes[0].disabled = status; //more/less
    filter.childNodes[2].childNodes[1].disabled = status; //1-50
  },

  /** Set up the category popups in each menu
   *
   * @param {Array<string>} categories - categories to add to the menus
   */
  _setup_categories(categories)
  {
    if (categories.length == 0)
    {
      categories.push(get_string("nocategory"));
    }
    for (const hbox of this._filter_list.childNodes)
    {
      const menu = hbox.childNodes[2].childNodes[0].childNodes[1]; //text

      replace_without_children(menu.firstChild);

      for (const category of categories)
      {
        const newElem = this._document.createElement("menuitem");
        newElem.setAttribute("label", category);
        menu.firstChild.appendChild(newElem);
      }
    }
  },

});
