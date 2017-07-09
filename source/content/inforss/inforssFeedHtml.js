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
// inforssFeedHtml
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------
/* globals inforssDebug, inforssTraceIn, inforssTraceOut */
Components.utils.import("chrome://inforss/content/modules/inforssDebug.jsm");

/* globals inforssFeed */

/* exported inforssFeedHtml */
function inforssFeedHtml(feedXML, manager, menuItem)
{
  inforssFeed.call(this, feedXML, manager, menuItem);
}

inforssFeedHtml.prototype = Object.create(inforssFeed.prototype);
inforssFeedHtml.prototype.constructor = inforssFeedHtml;

Object.assign(inforssFeedHtml.prototype, {

  read_feed_data(request)
  {
    inforssTraceIn(this);
    try
    {
      let str = request.responseText;
      const home = this.feedXML.getAttribute("link");
      const url = this.feedXML.getAttribute("url");

      const receivedDate = new Date();
      //dump("re=" + this.feedXML.getAttribute("regexp") + "\n");
      const re = new RegExp(this.feedXML.getAttribute("regexp"), "gi");

      //      re = new RegExp("\"NewsRoomLinks\"><b>([^<]*)<.*[\s]", "gi");

      //var reNl = new RegExp('\n', 'gi');
      //re.multiline = true;


      //FIXME how could we end up allowing an empty start after regex
      if (this.feedXML.hasAttribute("regexpStartAfter") &&
          this.feedXML.getAttribute("regexpStartAfter").length > 0)
      {
        const startRE = new RegExp(this.feedXML.getAttribute("regexpStartAfter"),
                                   "gi");
        const startRes = startRE.exec(str);
        if (startRes != null)
        {
          str = str.substring(str.indexOf(startRes) + startRes.length);
        }
      }

      //See above
      if (this.feedXML.hasAttribute("regexpStopBefore") &&
          this.feedXML.getAttribute("regexpStopBefore").length > 0)
      {
        const stopRE = new RegExp(this.feedXML.getAttribute("regexpStopBefore"),
                                  "gi");
        const stopRes = stopRE.exec(str);
        if (stopRes != null)
        {
          str = str.substring(0, str.indexOf(stopRes));
        }
      }
      //dump("str.length=" + str.length + "\n");
      let res = re.exec(str);
      //dump("res=" + res + "\n");
      let article = null;
      let publisheddate = null;
      let category = null;
      let link = null;
      let tempResult = new Array();
      while (res != null)
      {
        try
        {
          let headline = this.regExp(this.feedXML.getAttribute("regexpTitle"), res, tempResult);
          //dump("headline=" + headline + "\n");
          if (this.feedXML.hasAttribute("regexpDescription") &&
              this.feedXML.getAttribute("regexpDescription").length > 0)
          {
            article = this.regExp(this.feedXML.getAttribute("regexpDescription"), res, tempResult);
          }
          else
          {
            article = null;
          }
          if (this.feedXML.hasAttribute("regexpPubDate") &&
              this.feedXML.getAttribute("regexpPubDate").length > 0)
          {
            publisheddate = this.parse_date(this.regExp(this.feedXML.getAttribute("regexpPubDate"), res, tempResult));
          }
          else
          {
            publisheddate = null;
          }
          link = this.regExp(this.feedXML.getAttribute("regexpLink"), res, tempResult);
          //dump("link=" + link + "\n");
          if (this.feedXML.getAttribute("regexpCategory") != null &&
              this.feedXML.getAttribute("regexpCategory").length > 0)
          {
            category = this.regExp(this.feedXML.getAttribute("regexpCategory"), res, tempResult);
          }
          else
          {
            category = null;
          }

          headline = this.transform(headline);
          //dump("same headline=" + headline + "\n");
          article = this.transform(article);
          if (this.feedXML.getAttribute("htmlDirection") == "asc")
          {
            tempResult.push(
            {
              headline: headline,
              article: article,
              publisheddate: publisheddate,
              link: link,
              category: category
            });
          }
          else
          {
            tempResult.unshift(
            {
              headline: headline,
              article: article,
              publisheddate: publisheddate,
              link: link,
              category: category
            });
          }
          //dump("article=" + article + "\n");
        }
        catch (ex)
        {}
        res = re.exec(str);
      }
      window.setTimeout(this.readFeed2, 50, tempResult.length - 1, tempResult, url, home, receivedDate, this);
      //dump("read length=" + tempResult.length + "\n");
      //dump("fin read: " + this.headlines.length + "\n");
    }
    catch (e)
    {
      inforssDebug(e, this);
      this.stopFlashingIcon();
    }
    inforssTraceOut(this);
  },

  //-------------------------------------------------------------------------------------------------------------
  readFeed2(i, tempResult, url, home, receivedDate, caller)
  {
    inforssTraceIn(this);
    try
    {
      //dump("i=" + i + "\n");
      var reNl = new RegExp('\n', 'gi');
      if (i >= 0)
      {
        var label = tempResult[i].headline;
        if (label != null)
        {
          //dump("read label=" + label + "\n");
          label = label.replace(reNl, ' ');
        }
        var link = tempResult[i].link;
        var description = tempResult[i].article;
        if (description != null)
        {
          description = description.replace(reNl, ' ');
          //dump("read description=" + description + "\n");
        }
        var category = tempResult[i].category;
        var pubDate = tempResult[i].publisheddate;

        if ((caller.findHeadline(url, label) == null) && (label != null))
        {
          //dump("read addHeadline\n");
          caller.addHeadline(receivedDate, pubDate, label, link, link, description, url, home, category);
        }
      }
      i--;
      if (i >= 0)
      {
        window.setTimeout(caller.readFeed2, 50, i, tempResult, url, home, receivedDate, caller);
      }
      else
      {
        window.setTimeout(caller.readFeed3, 50, 0, tempResult, url, caller);
      }
    }
    catch (e)
    {
      inforssDebug(e, this);
      caller.stopFlashingIcon();
    }
    inforssTraceOut(this);
  },

  //-------------------------------------------------------------------------------------------------------------
  readFeed3(i, tempResult, url, caller)
  {
    inforssTraceIn(this);
    try
    {
      var reNl = new RegExp('\n', 'gi');
      if (i < caller.headlines.length)
      {
        if (caller.headlines[i].url == url)
        {
          var find = false;
          var j = 0;
          // alert("cherche " + this.listDatedTitle[i].title);
          while ((j < tempResult.length) && (find == false))
          {
            var label = tempResult[j].headline;
            if (label != null)
            {
              label = label.replace(reNl, ' ');
            }
            // alert("evalue " + this.listDatedTitle[i].title + "/" + label);
            if (label == caller.headlines[i].title)
            {
              find = true;
            }
            else
            {
              j++;
            }
          }
          if (find == false)
          {
            caller.removeHeadline(i);
            i--;
          }
        }
      }
      i++;
      if (i < caller.headlines.length)
      {
        window.setTimeout(caller.readFeed3, 50, i, tempResult, url, caller);
      }
      else
      {
        caller.limitSizeHeadline();
        caller.manager.signalReadEnd(caller);
        caller.xmlHttpRequest = null;
        caller.stopFlashingIcon();
      }
    }
    catch (e)
    {
      inforssDebug(e, this);
      caller.stopFlashingIcon();
    }
    inforssTraceOut(this);
  },

  //-------------------------------------------------------------------------------------------------------------
  //FIXME The last 2 parms are used due to the evals
  regExp(str, res, list)
  {
    inforssTraceIn(this);
    var returnValue = null;
    try
    {
      const localRegExp1 = new RegExp("\\$([0-9])", "gi");
      const localRegExp2 = new RegExp("\\$\\#", "gi");
      const localRegExp3 = new RegExp('\"', 'gi');
      const localRegExp4 = new RegExp('\'', 'gi');
      const localRegExp5 = new RegExp('\n', 'gi');
      const localRegExp6 = new RegExp('\r', 'gi');

      //URGGGGGGGGGGGGH
      //res and list above are used in these 2 evals...
      returnValue = eval("\"" + str.replace(localRegExp1, "\" + res[$1] + \"") + "\"");
      returnValue = returnValue.replace(localRegExp3, ' ');
      returnValue = returnValue.replace(localRegExp4, ' ');
      returnValue = returnValue.replace(localRegExp5, ' ');
      returnValue = returnValue.replace(localRegExp6, ' ');
      returnValue = eval("\"" + returnValue.replace(localRegExp2, "\" + (list.length + 1) + \"") + "\"");
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
    return returnValue;
  },

  //-------------------------------------------------------------------------------------------------------------
  transform(str)
  {
    inforssTraceIn(this);
    try
    {
      if (str != null)
      {
        str = inforssFeed.htmlFormatConvert(str);
      }
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
    return str;
  },

  //----------------------------------------------------------------------------
  //Attempt to parse a string as a date
  parse_date(pubDate)
  {
    const reg1 = new RegExp("^[a-zA-Z]*[,]*[ ]*([0-9]{1,2}) ([a-zA-Z]{3}) ([0-9]{4}) ([0-9]{2}):([0-9]{2}):([0-9]{2})", "ig");
    if (reg1.exec(pubDate) != null)
    {
      return new Date(pubDate);
    }

    const reg2 = new RegExp("^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2})(.*)", "ig");
    let res = reg2.exec(pubDate);
    if (res == null)
    {
      return null;
    }

    var year = res[1];
    var month = res[2];
    var day = res[3];
    var hour = res[4];
    var min = res[5];
    var remain = res[6];
    var ghour = 0;
    var gmin = 0;
    var sec = 0;
    var sign = "+";
    const reg3 = new RegExp(":([0-9]{2})([\-\+])([0-9]{2}):([0-9]{2})");
    res = reg3.exec(remain);
    if (res != null)
    {
      sec = res[1];
      sign = res[2];
      ghour = res[3];
      gmin = res[4];
    }
    else
    {
      const reg4 = new RegExp(":([0-9]{2})Z");
      res = reg4.exec(remain);
      if (res != null)
      {
        sec = res[1];
      }
      else
      {
        const reg5 = new RegExp("([\-\+])([0-9]{2}):([0-9]{2})");
        res = reg5.exec(remain);
        if (res != null)
        {
          sign = res[1];
          ghour = res[2];
          gmin = res[3];
        }
      }
    }
    var utc = Date.UTC(year, month - 1, day, hour, min, sec);
    if (sign == "+")
    {
      return new Date(utc - ghour * 3600000 - gmin * 60000);
    }
    else
    {
      return new Date(utc + ghour * 3600000 + gmin * 60000);
    }
  }

});
