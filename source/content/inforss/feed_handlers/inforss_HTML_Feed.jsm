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

const { debug, traceIn, traceOut } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Debug.jsm",
  {}
);

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
 * @param {inforssXMLRepository} config - extension configuration
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
    return null; //Generate one
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

  getCategory(item)
  {
    return item.category;
  },

  getDescription(item)
  {
    return item.description;
  },

  reset()
  {
    Single_Feed.prototype.reset.call(this);
    //Force reread of pages in case the regex's have been changed.
    this.manualRefresh();
  },

  read_headlines(request, str)
  {
    traceIn(this);
    try
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

      let headlines = new Array();

      const re = new RegExp(this.feedXML.getAttribute("regexp"), "gi");
      let res = re.exec(str);
      while (res != null)
      {
        try
        {
          let title = this.regExp(this.feedXML.getAttribute("regexpTitle"), res, headlines);
          title = this.transform(title);

          let description = null;
          if (this.feedXML.hasAttribute("regexpDescription") &&
              this.feedXML.getAttribute("regexpDescription").length > 0)
          {
            description = this.regExp(this.feedXML.getAttribute("regexpDescription"), res, headlines);
            description = this.transform(description);
          }

          let publisheddate = null;
          if (this.feedXML.hasAttribute("regexpPubDate") &&
              this.feedXML.getAttribute("regexpPubDate").length > 0)
          {
            publisheddate = this.regExp(this.feedXML.getAttribute("regexpPubDate"), res, headlines);
          }

          let link = this.regExp(this.feedXML.getAttribute("regexpLink"), res, headlines);

          let category = null;
          if (this.feedXML.hasAttribute("regexpCategory") &&
              this.feedXML.getAttribute("regexpCategory").length > 0)
          {
            category = this.regExp(this.feedXML.getAttribute("regexpCategory"), res, headlines);
          }

          const headline = {
            title: title,
            description: description,
            publisheddate: publisheddate,
            link_impl: link,
            category: category
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
        catch (ex)
        {}
        res = re.exec(str);
      }
      return headlines;
    }
    finally
    {
      traceOut(this);
    }
  },

  //----------------------------------------------------------------------------
  //Replaces the '$n' or $# in various fields with the matching expression from
  //the decoding regex.
  regExp(str, res, list)
  {
    try
    {
      let val = str.replace(/\$([0-9#])/g, function(match, p1/*, offset, string*/)
        {
          if (p1 == '#')
          {
            return list.length + 1;
          }
          return res[p1];
        });
      //Check if this is necessary as it might be done by other cleanup
      return val.replace(/[\r\n]/g, ' ');
    }
    catch (e)
    {
      debug(e, this);
    }
    return null;
  },

  //-------------------------------------------------------------------------------------------------------------
  transform(str)
  {
    traceIn(this);
    try
    {
      if (str != null)
      {
        str = htmlFormatConvert(str);
      }
    }
    catch (e)
    {
      debug(e, this);
    }
    traceOut(this);
    return str;
  },

});

const feed_handlers = {};

Components.utils.import(
  "chrome://inforss/content/feed_handlers/inforss_factory.jsm",
  feed_handlers);

feed_handlers.factory.register("html", HTML_Feed);
