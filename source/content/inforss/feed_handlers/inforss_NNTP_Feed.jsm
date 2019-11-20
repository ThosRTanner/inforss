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
// inforss_NNTP_Feed
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------

/* jshint globalstrict: true */
/* eslint-disable strict */
"use strict";

/* eslint-disable array-bracket-newline */
/* exported EXPORTED_SYMBOLS */
const EXPORTED_SYMBOLS = [
  "NNTP_Feed", /* exported NNTP_Feed */
];
/* eslint-enable array-bracket-newline */

const { debug } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Debug.jsm",
  {}
);

const { htmlFormatConvert, read_password } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Utils.jsm",
  {}
);

const { Single_Feed } = Components.utils.import(
  "chrome://inforss/content/feed_handlers/inforss_Single_Feed.jsm",
  {}
);

const { NNTP_Handler } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_NNTP_Handler.jsm",
  {}
);

const { console } =
  Components.utils.import("resource://gre/modules/Console.jsm", {});

const UnicodeConverter = Components.Constructor(
  "@mozilla.org/intl/scriptableunicodeconverter",
  "nsIScriptableUnicodeConverter");

//-----------------------------------------------------------------------------------------------------
function decodeQuotedPrintableWithCharSet(str, charSet)
{
  var returnValue = null;
  var unicodeConverter = new UnicodeConverter();
  unicodeConverter.charset = charSet;
  try
  {
    var tmp = str.match(/^([^=]*)=(..)(.*)$/);
    var code = new Array(1);
    while (tmp != null)
    {
      if (returnValue == null)
      {
        returnValue = unicodeConverter.ConvertToUnicode(tmp[1]) +
          unicodeConverter.Finish();
      }
      else
      {
        returnValue = returnValue + unicodeConverter.ConvertToUnicode(tmp[1]) +
          unicodeConverter.Finish();
      }
      code[0] = parseInt(tmp[2], 16);
      returnValue = returnValue + unicodeConverter.convertFromByteArray(
        code, code.length);
      str = tmp[3];
      tmp = str.match(/^([^=]*)=(..)(.*)$/);
    }
    returnValue = returnValue + unicodeConverter.ConvertToUnicode(str) +
      unicodeConverter.Finish();
  }
  catch (e)
  {
    debug(e);
  }
  return returnValue;
}

//-----------------------------------------------------------------------------------------------------
function decodeQuotedPrintable(str)
{
  try
  {
    //Headers have to be RFC2045 encoded (and possible the body as well)
    //look for =?<charset>?[BQ]?text?=
    //This is fairly well broken
    var tmp = str.match(/^(.*)=\?([^\?]*)\?Q\?(.*)\?=(.*)$/);
    if (tmp == null || tmp.length != 5)
    {
      return str;
    }
/**/console.log("Found quote printable", str, tmp)
    return tmp[1] +
           decodeQuotedPrintableWithCharSet(tmp[3], tmp[2]) +
           tmp[4];
  }
  catch (e)
  {
    debug(e);
  }
  return null;
}

/** A feed which uses the NNTP news spec
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
function NNTP_Feed(feedXML, manager, menuItem, mediator, config)
{
  Single_Feed.call(this, feedXML, manager, menuItem, mediator, config);
  return this;
}

NNTP_Feed.prototype = Object.create(Single_Feed.prototype);
NNTP_Feed.prototype.constructor = NNTP_Feed;

Object.assign(NNTP_Feed.prototype, {

  get_title(item)
  {
    return item.title;
  },

  get_category(/*item*/)
  {
    return "";
  },

  get_description(item)
  {
    return item.description;
  },

  //starts the nntp fetch - note once it is finished, we should call
  //this.read_headlines with the array of headlines
  start_fetch()
  {
    const url = this.getUrl();
    const user = this.getUser();
    const nntp = new NNTP_Handler(url, user, read_password(url, user));
    nntp.open().then(
      //FIXME I should store the latest article somewhere.
      //Then I could do 'over' from that article, rather than
      //guessing.
      groupinfo => this.read_articles(nntp, groupinfo)
    ).catch(
      e => {
/**/console.log("Error reading feed", url, e)
        this.error = true;
      }
    ).then(
      () =>
      {
        nntp.close();
        this.end_processing();
      }
    );
  },

  read_articles(nntp, group_info)
  {
    const feed_url = "news://" + nntp.host + "/";
    if (group_info.number == 0)
    {
      return;
    }
    //Completely arbitrary limit to articles to fetch.
    const start = group_info.number > 30 ? group_info.hwm - 30 : group_info.lwm;
    const headlines = [];
    const overview = [];
    return nntp.over({ start: start, end: group_info.hwm }).then(
      articles =>
      {
        const promises = [];
        for (const article of articles)
        {
          const headline = {};
          headline.link = feed_url + encodeURIComponent(article[4].slice(1, -1));
          headline.guid = headline.link;
          headline.pubdate = new Date(article[3]);
          article[1] = decodeQuotedPrintable(article[1]);
          headline.title = "(" + nntp.group + ") " + article[1];
          //Sort of crapness: if we don't already have the headline in the feed,
          //go fetch the body.
          if (this.find_headline(headline.guid) !== undefined)
          {
            /**/console.log("have headline for", this.getUrl(), headline.guid)
            continue;
          }
          headlines.push(headline);
          overview.push(article);
          promises.push(nntp.fetch_body(article[4]));
        }
        //Oddly, you can get results in over for which the article no longer exists
        return Promise.all(promises.map(p => p.catch(() => undefined)));
      }).then(
      articles =>
      {
        //Because nntp is serial and the promises are kicked off in the order
        //they are placed in the array, we know that articles[n] corresponds to
        //headlines[n]
        const nheadlines = headlines.map(
          (val, index) =>
          {
            let data = articles[index].join("\n");
            //Should probably decode this as well.
            data = htmlFormatConvert(data, false, "text/plain", "text/html");
            data = data.replace(/^(>>>>.*)$/gm, "<font color='cyan'>$1</font>");
            data = data.replace(/^(> > > >.*)$/gm, "<font color='cyan'>$1</font>");
            data = data.replace(/^(>>>.*)$/gm, "<font color='red'>$1</font>");
            data = data.replace(/^(> > >.*)$/gm, "<font color='red'>$1</font>");
            data = data.replace(/^(>>.*)$/gm, "<font color='green'>$1</font>");
            data = data.replace(/^(> >.*)$/gm, "<font color='green'>$1</font>");
            data = data.replace(/^(>[^>].*)$/gm, "<font color='blue'>$1</font>");
            data = data.replace(/\n/gm, "<br>");
            data =
              "<div style='background-color:#2B60DE; color: white; border-style: solid; border-width:1px; -moz-border-radius: 10px; padding: 6px'><TABLE WIDTH='100%' style='color:white'><TR><TD align='right'><B>From: </B></TD><TD>" +
              overview[index][2] +
              "</TD></TR><TR><TD align='right'><B>Subject: </B></TD><TD>" +
              overview[index][1] +
              "</TD></TR><TR><TD align='right'><B>Date: </B></TD><TD>" +
              overview[index][3] + "</TD></TR></TABLE></div><BR>" +
              data;
            //FIXME This looks wrong as it modifies val.
            const a = val;
            a.description = data;
            return a;
          }).
          filter(a => a.description !== undefined).
          sort((a, b) => a.pubdate - b.pubdate);
        this.process_headlines(nheadlines);
      }
    ).catch(
      err => debug(err)
    );
  }
});

const feed_handlers = {};

Components.utils.import(
  "chrome://inforss/content/feed_handlers/inforss_factory.jsm",
  feed_handlers);

feed_handlers.factory.register("nntp", NNTP_Feed);
