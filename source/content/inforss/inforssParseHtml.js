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
// inforssParseHtml
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------
/* globals inforssDebug, inforssTraceIn, inforssTraceOut */
Components.utils.import("chrome://inforss/content/modules/inforssDebug.jsm");

/* globals replace_without_children, make_URI */
Components.utils.import("chrome://inforss/content/modules/inforssUtils.jsm");

Components.utils.import("chrome://inforss/content/modules/inforssPrompt.jsm");

/* global inforssXMLRepository, inforssFTPDownload, inforssFeedHtml */
var gRssXmlHttpRequest = null;
var gRssTimeout = null;
var gUser = null;
var gUrl = null;
var gPassword = null;
var gTest = false;
var gOldRegExpr = null;
var gEncoding = null;
var gDownload = null;
//------------------------------------------------------------------------------
/* exported init */
function init()
{
  try
  {
    gUrl = window.arguments[0];
    gUser = window.arguments[1];
    gPassword = inforssXMLRepository.readPassword(gUrl, gUser);


    document.getElementById("inforss.url").value = gUrl;
    document.getElementById("inforss.html.regexp").value = window.arguments[2];
    gOldRegExpr = window.arguments[2];
    document.getElementById("inforss.html.headline").value = window.arguments[3];
    document.getElementById("inforss.html.article").value = window.arguments[4];
    document.getElementById("inforss.html.publisheddate").value = window.arguments[5];
    document.getElementById("inforss.html.link").value = window.arguments[6];
    document.getElementById("inforss.html.category").value = window.arguments[7];
    document.getElementById("inforss.html.startafter").value = window.arguments[8];
    document.getElementById("inforss.html.stopbefore").value = window.arguments[9];
    document.getElementById("inforss.html.direction").selectedIndex = (window.arguments[10] == "asc") ? 0 : 1;
    gEncoding = window.arguments[11];
    if (gEncoding == "")
    {
      document.getElementById("inforss.html.encoding").selectedIndex = 0;
    }
    else
    {
      document.getElementById("inforss.html.encoding").selectedIndex = 1;
      document.getElementById("inforss.encoding.man").value = gEncoding;
    }
    gTest = window.arguments[12] == "true";
    document.getElementById("inforss.iframe").setAttribute("src", document.getElementById("inforss.url").value);

    if (gEncoding == "")
    {
      fetchHtml();
    }
    else
    {
      getHtml();
    }
  }
  catch (e)
  {
    inforssDebug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function getHtml()
{
  try
  {
    var uri = make_URI(document.getElementById("inforss.url").value);
    gDownload = new inforssFTPDownload();
    gDownload.start(uri, null, fetchHtmlCallback, fetchHtmlCallback);
  }
  catch (e)
  {
    inforssDebug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function fetchHtml()
{
  try
  {
    if (document.getElementById("inforss.html.encoding").selectedIndex == 0)
    {
      if (gRssTimeout != null)
      {
        window.clearTimeout(gRssTimeout);
        gRssTimeout = null;
      }
      if (gRssXmlHttpRequest != null)
      {
        gRssXmlHttpRequest.abort();
      }
      //gRssTimeout = window.setTimeout(window.opener.rssTimeout, 10000);
      gRssTimeout = window.setTimeout("window.opener.rssTimeout()", 10000);
      gRssXmlHttpRequest = new XMLHttpRequest();
      gRssXmlHttpRequest.open("GET", document.getElementById("inforss.url").value, true, gUser, gPassword);
      gRssXmlHttpRequest.onload = fetchHtml1;
      gRssXmlHttpRequest.onerror = fetchHtml1;
      gRssXmlHttpRequest.send(null);
    }
    else
    {
      if (document.getElementById("inforss.encoding.man").value != "")
      {
        getHtml();
      }
    }
  }
  catch (e)
  {
    inforssDebug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function fetchHtmlCallback(step, status, headline, callback)
{
  inforssTraceIn();
  try
  {
    if (step != "send")
    {
      var uConv = Components.classes['@mozilla.org/intl/utf8converterservice;1'].createInstance(Components.interfaces.nsIUTF8ConverterService);
      var str = uConv.convertStringToUTF8(gDownload.data, document.getElementById("inforss.encoding.man").value, false);
      document.getElementById("inforss.html.code").value = str;
      document.getElementById("inforss.html.code").setAttribute("realSrc", str);
    }
  }
  catch (e)
  {
    inforssDebug(e);
  }
  inforssTraceOut();
}

//-----------------------------------------------------------------------------------------------------
function fetchHtml1()
{
  try
  {
    window.clearTimeout(gRssTimeout);
    gRssTimeout = null;
    if ((gRssXmlHttpRequest.readyState == 4) && (gRssXmlHttpRequest.status == 200))
    {
      try
      {
        //FIXME This is wrong. content encoding refers to compression used.
        document.getElementById("inforss.encoding.man").value = gRssXmlHttpRequest.getResponseHeader("Content-Encoding");
/**/console.log(gRssXmlHttpRequest.getAllResponseHeaders())
//should probably be decoding content-type and looking for charset=
      }
      catch (e)
      {}
      document.getElementById("inforss.html.code").value = gRssXmlHttpRequest.responseText;
      document.getElementById("inforss.html.code").setAttribute("realSrc", gRssXmlHttpRequest.responseText);
      document.getElementById("inforss.iframe").setAttribute("src", document.getElementById("inforss.url").value);
    }
  }
  catch (e)
  {
    inforssDebug(e);
  }
}

//------------------------------------------------------------------------------
//called when 'test' button is clicked
/* exported testRegExp */
function testRegExp()
{
  try
  {
    gTest = false;
    if (validDialog(false))
    {
      if (document.getElementById("inforss.html.code").value == null ||
          document.getElementById("inforss.html.code").value.length == 0)
      {
        alert(document.getElementById("bundle_inforss").getString("inforss.html.nosource"));
        return;
      }
      document.getElementById("inforss.tabbox").selectedIndex = 2;

      const feedxml = document.createElement("RSS");
      let add_optional = function(name, element)
      {
        const val = document.getElementById("inforss.html." + element).value;
        if (val != null)
        {
          feedxml.setAttribute(name, val);
        }
      };
      let add_required = function(name, element)
      {
        feedxml.setAttribute(name,
                   document.getElementById("inforss.html." + element).value);
      };
      add_required("regexp", "regexp");
      add_optional("regexpStartAfter", "startafter");
      add_optional("regexpStopBefore", "stopbefore");
      add_required("regexpTitle", "headline");
      add_optional("regexpDescription", "article");
      add_optional("regexpPubDate", "publisheddate");
      add_required("regexpLink", "link");
      add_optional("regexpCategory", "category");
      feedxml.setAttribute("htmlDirection",
        document.getElementById("inforss.html.direction").selectedIndex == 0 ? "asc" : "des");

      const feed = new inforssFeedHtml(feedxml);
      const headlines = feed.read_headlines(
        {
          'responseText':
            document.getElementById("inforss.html.code").getAttribute("realSrc")
        });
      let rows = replace_without_children(document.getElementById("inforss.rows"));

      addRow(rows, document.getElementById("inforss.label1").getAttribute("value"),
        document.getElementById("inforss.label2").getAttribute("value"),
        document.getElementById("inforss.label3").getAttribute("value"),
        document.getElementById("inforss.label4").getAttribute("value"),
        document.getElementById("inforss.label5").getAttribute("value"));

      for (let headline of headlines)
      {
        addRow(rows,
               headline.title,
               headline.description == null ?
                null : headline.description.substring(0, 30),
               headline.publisheddate == null ?
                null : headline.publisheddate.toLocaleDateString(),
               headline.link,
               headline.category);
      }
      gTest = true;
      gOldRegExpr = document.getElementById("inforss.html.regexp").value;
    }
  }
  catch (e)
  {
    alert(e);
    alert(document.getElementById("bundle_inforss").getString("inforss.html.issue"));
  }
}

//------------------------------------------------------------------------------
function addRow(rows, text1, text2, text3, text4, text5)
{
  try
  {
    let row = document.createElement("row");
    rows.appendChild(row);

    let label = document.createElement("label");
    label.setAttribute("value", text1);
    row.appendChild(label);

    label = document.createElement("label");
    label.setAttribute("value", text2);
    row.appendChild(label);

    label = document.createElement("label");
    label.setAttribute("value", text3);
    row.appendChild(label);

    label = document.createElement("label");
    label.setAttribute("value", text4);
    row.appendChild(label);

    label = document.createElement("label");
    label.setAttribute("value", text5);
    row.appendChild(label);
  }
  catch (e)
  {
    inforssDebug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function validDialog(testFlag)
{
  var valid = true;
  try
  {
    //FIXME If any of these are null, it probably means the whole program
    //is broken.
    if ((document.getElementById("inforss.url").value == null) ||
      (document.getElementById("inforss.url").value.length == 0) ||
      (document.getElementById("inforss.html.regexp").value == null) ||
      (document.getElementById("inforss.html.regexp").value.length == 0) ||
      (document.getElementById("inforss.html.headline").value == null) ||
      (document.getElementById("inforss.html.headline").value.length == 0) ||
      (document.getElementById("inforss.html.link").value == null) ||
      (document.getElementById("inforss.html.link").value.length == 0))
    {
      valid = false;
      alert(document.getElementById("bundle_inforss").getString("inforss.html.mandatory"));
    }
    else
    {
      if (testFlag)
      {
        if (!gTest || (gOldRegExpr != document.getElementById("inforss.html.regexp").value))
        {
          valid = false;
          alert(document.getElementById("bundle_inforss").getString("inforss.html.test"));
        }
      }
      if (valid)
      {
        if ((document.getElementById("inforss.html.encoding").selectedIndex == 1) &&
          (document.getElementById("inforss.encoding.man").value == ""))
        {
          valid = false;
          alert(document.getElementById("bundle_inforss").getString("inforss.html.encoding"));
        }
      }
    }
  }
  catch (e)
  {
    inforssDebug(e);
  }
  return valid;
}

//------------------------------------------------------------------------------
/* OK button */
/* exported userAccept */
function userAccept()
{
  var valid = false;
  try
  {
    window.opener.setHtmlFeed(document.getElementById("inforss.url").value,
      document.getElementById("inforss.html.regexp").value,
      document.getElementById("inforss.html.headline").value,
      document.getElementById("inforss.html.article").value,
      document.getElementById("inforss.html.publisheddate").value,
      document.getElementById("inforss.html.link").value,
      document.getElementById("inforss.html.category").value,
      document.getElementById("inforss.html.startafter").value,
      document.getElementById("inforss.html.stopbefore").value,
      (document.getElementById("inforss.html.direction").selectedIndex == 0) ? "asc" : "des",
      (document.getElementById("inforss.html.encoding").selectedIndex == 0) ? "" : document.getElementById("inforss.encoding.man").value,
      gTest ? "true" : "false");
    valid = validDialog(true);
  }
  catch (e)
  {
    inforssDebug(e);
  }
  return valid;
}

//------------------------------------------------------------------------------
//build button
/* exported build */
function build()
{
  try
  {
    if (document.getElementById("inforss.html.code").selectionStart ==
      document.getElementById("inforss.html.code").selectionEnd)
    {
      alert(document.getElementById("bundle_inforss").getString("inforss.html.selectfirst"));
    }
    else
    {
      var str = document.getElementById("inforss.html.code").getAttribute("realSrc").substring(document.getElementById("inforss.html.code").selectionStart, document.getElementById("inforss.html.code").selectionEnd);
      var reNl = new RegExp("\n", "gi");
      reNl.multiline = true;
      var reS = new RegExp("\s", "gi");
      reS.multiline = true;
      var re = new RegExp(">([^<$]*)([<$])", "gi");
      re.multiline = true;
      str = str.replace(/\s/gi, "");
      str = str.replace(/>([^<$]*)([<$])/gi, ">\(\[\^<\]*\)$2");
      document.getElementById("inforss.html.regexp").value = str;
    }
  }
  catch (e)
  {
    inforssDebug(e);
  }
}
