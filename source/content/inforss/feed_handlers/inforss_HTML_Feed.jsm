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
// HTML_Feed
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------

/* jshint globalstrict: true */
/* eslint-disable strict */
"use strict";

/* eslint-disable array-bracket-newline */
/* exported EXPORTED_SYMBOLS */
const EXPORTED_SYMBOLS = [
  "HTML_Feed", /* exported HTML_Feed */
];
/* eslint-enable array-bracket-newline */

const { htmlFormatConvert } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Utils.jsm",
  {}
);

const { Single_Feed } = Components.utils.import(
  "chrome://inforss/content/feed_handlers/inforss_Single_Feed.jsm",
  {}
);

/** A feed which scrapes HTML pages
 *
 * @class
 * @extends Single_Feed
 *
 * @param {Object} feedXML - dom parsed xml config
 * @param {Manager} manager - current feed manager
 * @param {Object} menuItem - item in main menu for this feed. Really?
 * @param {Mediator} mediator - for communicating with headline bar
 * @param {Config} config - extension configuration
 */
function HTML_Feed(feedXML, manager, menuItem, mediator, config)
{
  Single_Feed.call(this, feedXML, manager, menuItem, mediator, config);
}

//FIXME I'd like to use 'super' in here (and groupedfeed) but everything gets
//dumped into the global namespace, so i can't till this becomes a module.
HTML_Feed.prototype = Object.create(Single_Feed.prototype);
HTML_Feed.prototype.constructor = HTML_Feed;

Object.assign(HTML_Feed.prototype, {

  get_guid_impl(/*item*/)
  {
    return null; //FIXME Generate one
  },

  get_title(item)
  {
    return item.title;
  },

  get_link_impl(item)
  {
    return item.link_impl;
  },

  get_pubdate_impl(item)
  {
    return item.publisheddate;
  },

  get_category(item)
  {
    return item.category;
  },

  get_description_impl(item)
  {
    return item.description;
  },

  get_enclosure_impl(/*item*/)
  {
    return this.get_null_enclosure_impl();
  },

  reset()
  {
    Single_Feed.prototype.reset.call(this);
    //Force reread of pages in case the regex's have been changed.
    this.manualRefresh();
  },

  read_headlines(request, str)
  {
    if (this.feedXML.hasAttribute("regexpStartAfter") &&
        this.feedXML.getAttribute("regexpStartAfter").length > 0)
    {
      const startRE = new RegExp(this.feedXML.getAttribute("regexpStartAfter"),
                                 "i");
      const startRes = startRE.exec(str);
      if (startRes != null)
      {
        str = str.substring(str.indexOf(startRes) + startRes.length);
      }
    }

    if (this.feedXML.hasAttribute("regexpStopBefore") &&
        this.feedXML.getAttribute("regexpStopBefore").length > 0)
    {
      const stopRE = new RegExp(this.feedXML.getAttribute("regexpStopBefore"),
                                "i");
      const stopRes = stopRE.exec(str);
      if (stopRes != null)
      {
        str = str.substring(0, str.indexOf(stopRes));
      }
    }

    const headlines = [];

    const re = new RegExp(this.feedXML.getAttribute("regexp"), "gi");
    //eslint-disable-next-line no-sequences
    for (let res; res = re.exec(str), res != null;)
    {
      const headline = {
        title: this._match_and_replace_fields("Title", res, headlines),
        description: this._match_and_replace_fields("Description",
                                                    res,
                                                    headlines),
        publisheddate: this._match_and_replace_fields("PubDate",
                                                      res,
                                                      headlines),
        link_impl: this._match_and_replace_fields("Link", res, headlines),
        category: this._match_and_replace_fields("Category", res, headlines)
      };

      if (this.feedXML.getAttribute("htmlDirection") == "asc")
      {
        headlines.push(headline);
      }
      else
      {
        headlines.unshift(headline);
      }
    }
    return headlines;
  },

  /** Replace the '$n' or $# in various fields with the matching expression from
   * the decoding regex.
   *
   * @param {string} attr - configuration attributes
   * @param {Array<string>} res - matched string from html input
   * @param {Array<string>} headlines - current headline array for interpreting
   *                                    $#
   *
   * @returns {string} moderately confused about this given the parameters
   */
  _match_and_replace_fields(attr, res, headlines)
  {
    attr = "regexp" + attr;
    if (! this.feedXML.hasAttribute(attr) ||
        this.feedXML.getAttribute(attr).length == 0)
    {
      return null;
    }
    const val = this.feedXML.getAttribute(attr).replace(
      /\$([0-9#])/g,
      //eslint-disable-next-line no-confusing-arrow
      (match, p1/*, off, s*/) => p1 == '#' ? headlines.length + 1 : res[p1]
    );
    //Check if removal of newlines is necessary as it might be done by other
    //cleanup
    return htmlFormatConvert(val.replace(/[\r\n]/g, ' '));
  },

});

const feed_handlers = {};

Components.utils.import(
  "chrome://inforss/content/feed_handlers/inforss_factory.jsm",
  feed_handlers);

feed_handlers.factory.register("html", HTML_Feed);
