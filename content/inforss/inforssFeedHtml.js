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


function inforssFeedHtml(feedXML, manager, menuItem)
{
  var self = new inforssFeed(feedXML, manager, menuItem);

  //-----------------------------------------------------------------------------------------------------
  self.fetchHtmlCallback = function(step, status, feed, callback)
  {
    inforssTraceIn();
    var returnValue = true;
    try
    {
      if (step == "send")
      {
        //      alert("send");
      }
      else
      {
        var str = feed.xmlHttpRequest.data;
        var uConv = Components.classes['@mozilla.org/intl/utf8converterservice;1'].createInstance(Components.interfaces.nsIUTF8ConverterService);
        var str = uConv.convertStringToUTF8(str, feed.getEncoding(), false);
        //      var unicodeConverter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
        //      unicodeConverter.charset = feed.getEncoding();
        //      str = unicodeConverter.ConvertToUnicode( str ) + unicodeConverter.Finish();
        feed.xmlHttpRequest = null;
        //dump("str utf-8=" + str.length + "\n");
        feed.readFeed1(str);
      }
    }
    catch (e)
    {
      inforssDebug(e);
    }
  };

  //-------------------------------------------------------------------------------------------------------------
  self.readFeed = function()
  {
    inforssTraceIn(this);
    try
    {
      //      var uConv = Components.classes['@mozilla.org/intl/utf8converterservice;1'].createInstance(Components.interfaces.nsIUTF8ConverterService);
      //      var str = uConv.convertStringToUTF8(this.responseText, "UTF-8", false);
      this.caller.readFeed1(this.responseText);
    }
    catch (e)
    {
      inforssDebug(e);
    }
  };

  //-------------------------------------------------------------------------------------------------------------
  self.readFeed1 = function(str)
  {
    inforssTraceIn(this);
    try
    {
      //dump("read feed " + this + "\n");
      //dump("read feed " + this.caller + "\n");
      //dump("read feed " + this.caller.feedXML + "\n");
      //dump("read html feed " + this.feedXML.getAttribute("url") + "\n");
      this.lastRefresh = new Date();
      this.clearFetchTimeout();

      var home = this.feedXML.getAttribute("link");
      var url = this.feedXML.getAttribute("url");

      var receivedDate = new Date();
      //dump("re=" + this.feedXML.getAttribute("regexp") + "\n");
      var re = new RegExp(this.feedXML.getAttribute("regexp"), "gi");

      //      re = new RegExp("\"NewsRoomLinks\"><b>([^<]*)<.*[\s]", "gi");

      var reNl = new RegExp('\n', 'gi');
      re.multiline = true;


      if ((this.feedXML.getAttribute("regexpStartAfter") != null) &&
        (this.feedXML.getAttribute("regexpStartAfter").length > 0))
      {
        var startRE = new RegExp(this.feedXML.getAttribute("regexpStartAfter"), "gi");
        var startRes = startRE.exec(str);
        if (startRes != null)
        {
          var index = str.indexOf(startRes);
          str = str.substring(index + startRes.length);
        }
      }
      if ((this.feedXML.getAttribute("regexpStopBefore") != null) &&
        (this.feedXML.getAttribute("regexpStopBefore").length > 0))
      {
        var stopRE = new RegExp(this.feedXML.getAttribute("regexpStopBefore"), "gi");
        var stopRes = stopRE.exec(str);
        if (stopRes != null)
        {
          var index = str.indexOf(stopRes);
          str = str.substring(0, index);
        }
      }
      //dump("str.length=" + str.length + "\n");
      var res = re.exec(str);
      //dump("res=" + res + "\n");
      var headline = null;
      var article = null;
      var publisheddate = null;
      var category = null;
      var link = null;
      var tempResult = new Array();
      while (res != null)
      {
        try
        {
          headline = this.regExp(this.feedXML.getAttribute("regexpTitle"), res, tempResult);
          //dump("headline=" + headline + "\n");
          if ((this.feedXML.getAttribute("regexpDescription") != null) &&
            (this.feedXML.getAttribute("regexpDescription").length > 0))
          {
            article = this.regExp(this.feedXML.getAttribute("regexpDescription"), res, tempResult);
          }
          else
          {
            article = null;
          }
          if ((this.feedXML.getAttribute("regexpPubDate") != null) &&
            (this.feedXML.getAttribute("regexpPubDate").length > 0))
          {
            publisheddate = this.regExp(this.feedXML.getAttribute("regexpPubDate"), res, tempResult);
          }
          else
          {
            publisheddate = null;
          }
          link = this.regExp(this.feedXML.getAttribute("regexpLink"), res, tempResult);
          //dump("link=" + link + "\n");
          if ((this.feedXML.getAttribute("regexpCategory") != null) &&
            (this.feedXML.getAttribute("regexpCategory").length > 0))
          {
            publisheddate = this.regExp(this.feedXML.getAttribute("regexpCategory"), res, tempResult);
          }
          else
          {
            publisheddate = null;
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
        {};
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
  };

  //-------------------------------------------------------------------------------------------------------------
  self.readFeed2 = function(i, tempResult, url, home, receivedDate, caller)
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
  };

  //-------------------------------------------------------------------------------------------------------------
  self.readFeed3 = function(i, tempResult, url, caller)
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
          //alert("trouve : " + find);
          if (find == false)
          {
            //dump("remove headline\n");
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
  };

  //-------------------------------------------------------------------------------------------------------------
  self.regExp = function(str, res, list)
  {
    inforssTraceIn(this);
    var returnValue = null;
    try
    {
      const localRegExp1 = new RegExp("\\$([0-9])", "gi");
      localRegExp1.multiline = true;
      const localRegExp2 = new RegExp("\\$\\#", "gi");
      localRegExp2.multiline = true;
      const localRegExp3 = new RegExp('\"', 'gi');
      localRegExp3.multiline = true;
      const localRegExp4 = new RegExp('\'', 'gi');
      localRegExp4.multiline = true;
      const localRegExp5 = new RegExp('\n', 'gi');
      localRegExp5.multiline = true;
      const localRegExp6 = new RegExp('\r', 'gi');
      localRegExp6.multiline = true;

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
  };

  //-------------------------------------------------------------------------------------------------------------
  self.transform = function(str)
  {
    //dump("debut transform\n");
    inforssTraceIn(this);
    try
    {
      if (str != null)
      {
        //dump("trans1 str=" + str + "\n");
        /*        str = str.replace(/&amp;/gi,"&");
                str = str.replace(/&eacute;/gi,"e");
                str = str.replace(/&egrave;/gi,"e");
                str = str.replace(/&agrave;/gi,"a");
                str = str.replace(/&ccedil;/gi,"c");
                str = str.replace(/&gt;/gi,">");
                str = str.replace(/&lt;/gi,"<");
        */
        str = inforssFeed.htmlFormatConvert(str);
        //dump("trans2 str=" + str + "\n");
      }
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
    return str;
  };

  return self;
}
