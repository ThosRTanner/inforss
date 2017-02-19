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
Components.utils.import("chrome://inforss/content/inforssDebug.jsm");

/* global inforssXMLRepository, inforssFTPDownload, inforssFeed */
var gRssXmlHttpRequest = null;
var gRssTimeout = null;
var gUser = null;
var gUrl = null;
var gPassword = null;
var gTest = null;
var gOldRegExpr = null;
var gEncoding = null;
var gDownload = null;
//-----------------------------------------------------------------------------------------------------
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
    gTest = window.arguments[12];
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
    var ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
    var uri = ioService.newURI(document.getElementById("inforss.url").value, null, null);
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
  var returnValue = true;
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
        document.getElementById("inforss.encoding.man").value = gRssXmlHttpRequest.getResponseHeader("Content-Encoding");
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

//-----------------------------------------------------------------------------------------------------
function testRegExp()
{
  try
  {
    if (validDialog(false))
    {
      if ((document.getElementById("inforss.html.code").value == null) ||
        (document.getElementById("inforss.html.code").value.length == 0))
      {
        alert(document.getElementById("bundle_inforss").getString("inforss.html.nosource"));
      }
      else
      {
        document.getElementById("inforss.tabbox").selectedIndex = 2;
        var re = new RegExp(document.getElementById("inforss.html.regexp").value, "gi");
        re.multiline = true;
        var str = document.getElementById("inforss.html.code").getAttribute("realSrc");
        if ((document.getElementById("inforss.html.startafter").value != null) &&
          (document.getElementById("inforss.html.startafter").value.length > 0))
        {
          var startRE = new RegExp(document.getElementById("inforss.html.startafter").value, "gi");
          var startRes = startRE.exec(str);
          if (startRes != null)
          {
            var index = str.indexOf(startRes);
            str = str.substring(index + startRes.length);
          }
        }
        if ((document.getElementById("inforss.html.stopbefore").value != null) &&
          (document.getElementById("inforss.html.stopbefore").value.length > 0))
        {
          var stopRE = new RegExp(document.getElementById("inforss.html.stopbefore").value, "gi");
          var stopRes = stopRE.exec(str);
          if (stopRes != null)
          {
            var index = str.indexOf(stopRes);
            str = str.substring(0, index);
          }
        }
        var rows = document.getElementById("inforss.rows");
        while (rows.firstChild != null)
        {
          rows.removeChild(rows.firstChild);
        }

        addRow(document.getElementById("inforss.label1").getAttribute("value"),
          document.getElementById("inforss.label2").getAttribute("value"),
          document.getElementById("inforss.label3").getAttribute("value"),
          document.getElementById("inforss.label4").getAttribute("value"),
          document.getElementById("inforss.label5").getAttribute("value"),
          rows);
        var res = re.exec(str);
        var headline = null;
        var article = null;
        var publisheddate = null;
        var link = null;
        var category = null;
        while (res != null)
        {
          headline = regExp(document.getElementById("inforss.html.headline").value, res, rows.childNodes);
          if ((document.getElementById("inforss.html.article").value != null) &&
            (document.getElementById("inforss.html.article").value.length > 0))
          {
            article = regExp(document.getElementById("inforss.html.article").value, res, rows.childNodes);
            if (article.length > 30)
            {
              article = article.substring(0, 30);
            }
          }
          else
          {
            article = null;
          }
          if ((document.getElementById("inforss.html.publisheddate").value != null) &&
            (document.getElementById("inforss.html.publisheddate").value.length > 0))
          {
            publisheddate = regExp(document.getElementById("inforss.html.publisheddate").value, res, rows.childNodes);
          }
          else
          {
            publisheddate = null;
          }
          link = regExp(document.getElementById("inforss.html.link").value, res, rows.childNodes);
          if ((document.getElementById("inforss.html.category").value != null) &&
            (document.getElementById("inforss.html.category").value.length > 0))
          {
            category = regExp(document.getElementById("inforss.html.category").value, res, rows.childNodes);
          }
          else
          {
            category = null;
          }
          addRow(headline, article, publisheddate, link, category, rows,
            document.getElementById("inforss.html.direction").selectedIndex);
          res = re.exec(str);
        }
        gTest = "true";
        gOldRegExpr = document.getElementById("inforss.html.regexp").value;
      }
    }
  }
  catch (e)
  {
    alert(e);
    alert(document.getElementById("bundle_inforss").getString("inforss.html.issue"));
    gTest = "false";
  }
}

//-------------------------------------------------------------------------------------------------------------
function regExp(str, res, list)
{
  var returnValue = null;
  const localRegExp5 = new RegExp('\n', 'gi');
  localRegExp5.multiline = true;
  const localRegExp6 = new RegExp('\r', 'gi');
  localRegExp6.multiline = true;
  const localRegExp7 = new RegExp('\"', 'gi');
  localRegExp7.multiline = true;
  const localRegExp8 = new RegExp('\'', 'gi');
  localRegExp8.multiline = true;

  try
  {
    returnValue = eval("\"" + str.replace(new RegExp("\\$([0-9])", "gi"), "\" + res[$1] + \"") + "\"");
    returnValue = returnValue.replace(localRegExp5, ' ');
    returnValue = returnValue.replace(localRegExp6, ' ');
    returnValue = returnValue.replace(localRegExp7, ' ');
    returnValue = returnValue.replace(localRegExp8, ' ');
    returnValue = eval("\"" + returnValue.replace(new RegExp("\\$\\#", "gi"), "\" + (list.length) + \"") + "\"");
    returnValue = inforssFeed.htmlFormatConvert(returnValue);
  }
  catch (e)
  {
    inforssDebug(e);
  }
  return returnValue;
}

//-----------------------------------------------------------------------------------------------------
function addRow(text1, text2, text3, text4, text5, rows, direction)
{
  try
  {
    var row = document.createElement("row");
    if ((direction == null) || (direction == 0) || (rows.firstChild.nextSibling == null))
    {
      rows.appendChild(row);
    }
    else
    {
      rows.insertBefore(row, rows.firstChild.nextSibling);
    }
    var label = document.createElement("label");
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
        if ((gTest == "false") || (gTest == null) || (gTest == "") || (gOldRegExpr != document.getElementById("inforss.html.regexp").value))
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

//-----------------------------------------------------------------------------------------------------
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
      gTest);
    valid = validDialog(true);
  }
  catch (e)
  {
    inforssDebug(e);
  }
  return valid;
}

//-----------------------------------------------------------------------------------------------------
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

//-------------------------------------------------------------------------------------------------------------
var infoRSSParserObserver = {
  getSupportedFlavours: function()
  {
    var flavours = new FlavourSet();
    flavours.appendFlavour("text/unicode");
    return flavours;
  },
  onDragOver: function(evt, flavour, session) {},
  onDragStart: function(evt, transferData, action)
  {
    evt.stopPropagation();
    var htmlText = "<strong>infoRSS</strong>";
    var plainText = "infoRSS";

    transferData.data = new TransferData();
    transferData.data.addDataForFlavour("text/html", htmlText);
    transferData.data.addDataForFlavour("text/unicode", evt.target.getAttribute("data"));
  },
  onDragExit: function(evt, session) {},
  onDrop: function(evt, dropdata, session)
  {
    var text = dropdata.data;
    evt.cancelBubble = true;
    evt.stopPropagation();
  }
};