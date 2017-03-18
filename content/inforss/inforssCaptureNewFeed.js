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
// inforssCaptureNewFeed
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------
/* globals inforssDebug, inforssTraceIn, inforssTraceOut */
Components.utils.import("chrome://inforss/content/modules/inforssDebug.jsm");

var openerValue = window.arguments[0];
//FIXME This is a completely different gInforRssBundle to the one everywhere else,
//it just points to the same thing
var gInforssRssBundle = null;

//------------------------------------------------------------------------------
function init()
{
  inforssTraceIn();
  try
  {
    document.getElementById("url").focus();
    document.getElementById("type").value = document.getElementById("type").selectedItem.getAttribute("value");
    document.getElementById("title").disabled = true;
    document.getElementById("rss-select-search").value = document.getElementById("rss-select-search").selectedItem.getAttribute("value");
    checkUrl();
    checkSearch(true);
    checkTwitter(true);
    gInforssRssBundle = document.getElementById("bundle_inforss");

  }
  catch (e)
  {
    inforssDebug(e);
  }
  inforssTraceOut();
}


//-----------------------------------------------------------------------------------------------------
function accept()
{
  inforssTraceIn();
  var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
  var returnValue = true;

  try
  {
    var title = document.getElementById("title").value;
    var url = document.getElementById("url").value;
    var keyword = document.getElementById("keyword").value;
    var user = document.getElementById("user").value;
    var password = document.getElementById("password").value;
    var type = document.getElementById("type").value;
    if ((url == null) || (url == ""))
    {
      returnValue = false;
    }
    else
    {
      if ((type == "search") && ((keyword == "") || (keyword == null)))
      {
        returnValue = false;
      }
      else
      {
        if ((url.indexOf("http://") == -1) &&
          (url.indexOf("https://") == -1) &&
          (url.indexOf("news://") == -1))
        {
          returnValue = false;
        }
        else
        {
          if ((url.indexOf("https://") == 0) &&
            ((user == "") || (user == null) ||
              (password == "") || (password == null)))
          {
            returnValue = false;
          }
          else
          {
            if (((type != "rss") && (type != "twitter")) &&
              ((title == "") || (title == null)))
            {
              returnValue = false;
            }
            else
            {
              if (((user != null) && (user != "") && ((password == null) || (password == ""))) ||
                ((password != null) && (password != "") && ((user == null) || (user == ""))))
              {
                returnValue = false;
              }
            }
          }
        }
      }
    }
    if (returnValue == false)
    {
      promptService.alert(window, document.getElementById("bundle_inforss").getString("inforss.new.mandatory.titlebox"),
        document.getElementById("bundle_inforss").getString("inforss.new.mandatory.msg"));
    }
    else
    {
      openerValue.title = title;
      //alert("dialog," + title);
      openerValue.url = url;
      openerValue.user = user;
      openerValue.password = password;
      openerValue.keyword = keyword;
      //alert("new pass=" + password);
      openerValue.valid = true;
      openerValue.type = type;
      //      alert(document.getElementById("type").value);
    }
  }
  catch (e)
  {
    inforssDebug(e);
  }
  inforssTraceOut();
  return returnValue;
}

//-----------------------------------------------------------------------------------------------------
function clickNntp()
{
  inforssTraceIn();
  try
  {
    document.getElementById("title").disabled = false;
    document.getElementById("url").disabled = false;
    var url = document.getElementById('url').value;
    if ((url != null) && (url != ""))
    {
      if (url.indexOf("news://") != 0)
      {
        document.getElementById('url').value = 'news://news.acme.com/netscape.mozilla.dev.xul'
        document.getElementById("url").focus();
        checkUrl();
      }
    }
    document.getElementById("user").disabled = false;
    document.getElementById("password").disabled = false;
    checkSearch(true);
    checkTwitter(true);
  }
  catch (e)
  {
    inforssDebug(e);
  }
  inforssTraceOut();
}

//-----------------------------------------------------------------------------------------------------
function clickRss(flag)
{
  inforssTraceIn();
  try
  {
    document.getElementById("title").disabled = flag;
    document.getElementById("url").disabled = false;
    if (flag)
    {
      document.getElementById("title").value = "";
    }
    var url = document.getElementById('url').value;
    if ((url != null) && (url != ""))
    {
      if (url.indexOf("http") != 0)
      {
        document.getElementById('url').value = 'http://www.'
        document.getElementById("url").focus();
        checkUrl();
      }
    }
    checkSearch(true);
    checkTwitter(true);
  }
  catch (e)
  {
    inforssDebug(e);
  }
  inforssTraceOut();
}

//-----------------------------------------------------------------------------------------------------
function clickSearch()
{
  inforssTraceIn();
  try
  {
    document.getElementById("title").disabled = false;
    document.getElementById("url").disabled = true;
    var url = null;
    var keyword = document.getElementById("keyword").value;
    var search = document.getElementById('rss-select-search').value;
    switch (search)
    {
      case "technorati":
        {
          url = "http://www.technorati.com/search/";
          //        openerValue.regexp = '<li id="[^"]*">[\\n\\r\\s]*<h3>[\\n\\r\\s]*<a href="([^"]*)">([^<]*)</a>[\\n\\r\\s]*</h2>[\\u0001-\\uffff]*?<blockquote[^>]*>([\\u0001-\\uFFFF]*?)</blockquote';
          //        openerValue.regexp = '<li class="hentry"[^>]*>[\\u0001-\\uffff]*?<img[^>]*>[\\u0001-\\uffff]*?<a href="([^"]*)"[^>]*>([^<]*)</a></h2>[\\u0001-\\uffff]*?<blockquote[^>]*>([\\u0001-\\uFFFF]*?)</blockquote';
          openerValue.regexp = '<li>[\\u0001-\\uffff]*?<h3><a[\\u0001-\\uffff]*?class="offsite"[\\u0001-\\uffff]*?href="([^"]*)"[^>]*>([^<]*)</a></h3><br />[\\u0001-\\uffff]*?</a><br />[\\s]*([^^]*?)</li>';
          openerValue.regexpTitle = "$2";
          openerValue.regexpDescription = "$3";
          openerValue.regexpLink = "$1"
          openerValue.regexpStartAfter = null;
          openerValue.htmlDirection = "asc";
          openerValue.htmlTest = "true";
          break;
        }
      case "blogger":
        {
          url = "http://search.blogger.com/?ui=blg&num=20&q=";
          openerValue.regexp = '<a[\\s\\S]*?href="([^"]*)"[\\s\\S]*?id="p-[^"]*"[\\s\\S]*?>([\\s\\S]*?)</a>[\\s\\S]*?<font size=-1>([\\s\\S]*?)</font>';
          openerValue.regexpTitle = "$2";
          openerValue.regexpDescription = "$3";
          openerValue.regexpLink = "$1"
          openerValue.regexpStartAfter = null;
          openerValue.htmlDirection = "asc";
          openerValue.htmlTest = "true";
          break;
        }
      case "bloglines":
        {
          url = "http://www.bloglines.com/search?ql=en&s=f&pop=l&news=m&f=10&q=";
          openerValue.regexp = '<div class=.match. [\\u0001-\\uffff]*?<a href="([^"]*)"[\\u0001-\\uffff]*?>([\\u0001-\\uffff]*?)</a>[\\u0001-\\uffff]*?<div class=.shorty.>([\\u0001-\\uffff]*?)</div>';
          openerValue.regexpTitle = "$2";
          openerValue.regexpDescription = "$3";
          openerValue.regexpLink = "$1"
          openerValue.regexpStartAfter = null;
          openerValue.htmlDirection = "asc";
          openerValue.htmlTest = "true";
          break;
        }
      case "blogSearchEngine":
        {
          url = "http://www.blogsearchengine.com/search.php?tab=blog&q=";
          openerValue.regexp = '<span class=t>[\\u0001-\\uffff]*?<a href="([^"]*)"[^>]*>([\\u0001-\\uffff]*?)</a>[\\u0001-\\uffff]*?<table[\\u0001-\\uffff]*?<tr[\\u0001-\\uffff]*?<td[^>]*>([\\u0001-\\uffff]*?)</td';
          openerValue.regexpTitle = "$2";
          openerValue.regexpDescription = "$3";
          openerValue.regexpLink = "$1"
          openerValue.regexpStartAfter = null;
          openerValue.htmlDirection = "asc";
          openerValue.htmlTest = "true";
          break;
        }
      case "ask":
        {
          url = "http://www.ask.com/blogsearch?t=a&qsrc=28&o=0&q=";
          openerValue.regexp = '<a class=.L4. href="([^"]*)"[\\u0001-\\uffff]*?>([\\u0001-\\uffff]*?)</a>[\\u0001-\\uffff]*?<div>[\\n\\r\\s\\t]*<div>[\\n\\r\\s\\t]*<span[^>]*>([\\u0001-\\uffff]*?)</span>';
          openerValue.regexpTitle = "$2";
          openerValue.regexpDescription = "$3";
          openerValue.regexpLink = "$1"
          openerValue.regexpStartAfter = "viewlink";
          openerValue.htmlDirection = "asc";
          openerValue.htmlTest = "true";
          break;
        }
      case "delicious":
        {
          url = "http://del.icio.us/search/?all=";
          openerValue.regexp = '<li class=.post.[\\s\\S]*?<a href="([^"]*)"[^>]*>([^<]*)';
          openerValue.regexpTitle = "$2";
          openerValue.regexpDescription = "$2";
          openerValue.regexpLink = "$1"
          openerValue.regexpStartAfter = null;
          openerValue.htmlDirection = "asc";
          openerValue.htmlTest = "true";
          break;
        }
    }
    url += window.escape(keyword);
    document.getElementById('url').value = url;
    checkUrl();
    checkSearch(false);
    checkTwitter(true);
  }
  catch (e)
  {
    inforssDebug(e);
  }
  inforssTraceOut();
}

//-----------------------------------------------------------------------------------------------------
function clickTwitter()
{
  inforssTraceIn();
  try
  {
    document.getElementById("user").disabled = true;
    document.getElementById("password").disabled = false;
    document.getElementById("title").disabled = true;
    document.getElementById("title").value = "";
    document.getElementById("url").disabled = true;
    var keyword = document.getElementById("account").value;
    var type = document.getElementById('rss-select-twit').value;
    var url = null;
    switch (type)
    {
      case "keyword":
        {
          url = "http://search.twitter.com/search.atom?q=";
          url += window.escape(keyword);
          document.getElementById("user").disabled = true;
          document.getElementById("password").disabled = true;
          document.getElementById("user").value = "";
          document.getElementById("password").value = "";
          document.getElementById("inforss.twitter.label").value = gInforssRssBundle.getString("inforss.new.for");
          break;
        }
      case "byid":
        {
          url = "http://twitter.com/statuses/user_timeline.rss?id=";
          url += window.escape(keyword);
          document.getElementById("user").disabled = true;
          document.getElementById("password").disabled = true;
          document.getElementById("user").value = "";
          document.getElementById("password").value = "";
          document.getElementById("inforss.twitter.label").value = gInforssRssBundle.getString("inforss.new.twitter.id");
          break;
        }
      case "myTwitter":
        {
          url = "http://api.twitter.com/1/statuses/home_timeline.rss";
          document.getElementById("user").disabled = true;
          document.getElementById("password").disabled = false;
          document.getElementById("user").value = keyword;
          document.getElementById("inforss.twitter.label").value = gInforssRssBundle.getString("inforss.new.twitter.account");
          break;
        }
    }
    //    document.getElementById('url').value = 'http://twitter.com/statuses/home_timeline.rss'
    document.getElementById('url').value = url;
    checkSearch(true);
    checkTwitter(false);
  }
  catch (e)
  {
    inforssDebug(e);
  }
  inforssTraceOut();
}

//-----------------------------------------------------------------------------------------------------
function checkUrl()
{
  inforssTraceIn();
  try
  {
    /*
        var url = document.getElementById("url").value;
        if ((url != null) && ((url.indexOf("https://") == 0) || (url.indexOf("news://") == 0))
        {
          document.getElementById("user").disabled = false;
          document.getElementById("password").disabled = false;
        }
        else
        {
          document.getElementById("user").disabled = true;
          document.getElementById("password").disabled = true;
          document.getElementById("user").value = "";
          document.getElementById("password").value = "";
        }
    */
    document.getElementById("user").disabled = false;
    document.getElementById("password").disabled = false;
  }
  catch (e)
  {
    inforssDebug(e);
  }
  inforssTraceOut();
}

//-----------------------------------------------------------------------------------------------------
function checkSearch(flag)
{
  inforssTraceIn();
  try
  {
    document.getElementById("rss-select-search").disabled = flag;
    document.getElementById("keyword").disabled = flag;
    if (flag)
    {
      document.getElementById("keyword").value = "";
    }
  }
  catch (e)
  {
    inforssDebug(e);
  }
  inforssTraceOut();
}

//-----------------------------------------------------------------------------------------------------
function checkTwitter(flag)
{
  inforssTraceIn();
  try
  {
    document.getElementById("account").disabled = flag;
    if (flag)
    {
      document.getElementById("account").value = "";
    }
  }
  catch (e)
  {
    inforssDebug(e);
  }
  inforssTraceOut();
}
