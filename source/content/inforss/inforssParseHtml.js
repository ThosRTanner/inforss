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

/*jshint browser: true, devel: true */
/*eslint-env browser */

var inforss = inforss || {};
Components.utils.import("chrome://inforss/content/modules/inforss_Debug.jsm",
                        inforss);

Components.utils.import("chrome://inforss/content/modules/inforss_Utils.jsm",
                        inforss);

Components.utils.import("chrome://inforss/content/modules/inforss_Prompt.jsm",
                        inforss);

Components.utils.import(
  "chrome://inforss/content/feed_handlers/inforss_HTML_Feed.jsm",
  inforss
);

const Priv_XMLHttpRequest = Components.Constructor(
  "@mozilla.org/xmlextras/xmlhttprequest;1",
  "nsIXMLHttpRequest");

/* global inforssXMLRepository */
var gUser = null;
var gUrl = null;
var gPassword = null;
var gTest = false;
var gOldRegExpr = null;
var gEncoding = null;

//------------------------------------------------------------------------------
const fetchHtml = (function ()
{
  let request = null; //Save current request in the enclosure
  return function()
  {
    try
    {
      if (request != null)
      {
        console.log("Aborted request", request);
        request.abort();
      }

      request = new Priv_XMLHttpRequest();
      request.open("GET", document.getElementById("inforss.url").value, true, gUser, gPassword);

      request.onload = function(evt)
      {
        fetchHtml1(evt);
        request = null;
      };

      request.onerror = function(evt)
      {
        console.log("Error fetching", evt);
        //FIXME Alert?
        request = null;
      };

      request.timeout = 10000;
      request.ontimeout = function(evt)
      {
        console.log("Timeout fetching", evt);
        //FIXME Alert?
        request = null;
      };

      if (document.getElementById("inforss.html.encoding").selectedIndex == 1 &&
          document.getElementById("inforss.encoding.man").value != "")
      {
        request.overrideMimeType(
          'text/plain; charset=' +
            document.getElementById("inforss.encoding.man").value);
      }

      request.responseType = "text";

      request.send();
    }
    catch (e)
    {
      inforss.debug(e);
      request = null;
    }
  };
})();

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

    fetchHtml();
  }
  catch (e)
  {
    inforss.debug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function fetchHtml1(evt)
{
  try
  {
    const request = evt.target;
    if (request.status == 200)
    {
      document.getElementById("inforss.html.code").value = request.responseText;
      document.getElementById("inforss.html.code").setAttribute("realSrc", request.responseText);
      document.getElementById("inforss.iframe").setAttribute("src", document.getElementById("inforss.url").value);

      if (document.getElementById("inforss.html.encoding").selectedIndex == 0)
      {
        //See if it's specifed in the header
        let type = request.getResponseHeader("Content-Type");
        if (type == null)
        {
          type = "";
        }

        if (!type.includes("charset="))
        {
          //I'd do this from the iframe but it doesn't seem to be parsed by this point.
          const htmldoc = document.implementation.createHTMLDocument("example");
          htmldoc.documentElement.innerHTML = request.responseText;
//          const htmldoc = document.getElementById("inforss.iframe").contentWindow.document;
          let node = htmldoc.querySelector('meta[charset]');
          if (node == null)
          {
            node = htmldoc.querySelector('meta[http-equiv="Content-Type"]');
            if (node != null)
            {
              type = node.getAttribute("content");
            }
          }
          else
          {
            type = 'charset=' + node.getAttribute("content");
          }
        }

        //remove up to the charset= if it has it
        const pos = type.indexOf("charset=");
        if (pos != -1)
        {
          document.getElementById("inforss.encoding.man").value = type.substr(pos + 8);
        }
      }
    }
    else
    {
      console.log("Error", request);
      //FIXME Alert?
    }
  }
  catch (e)
  {
    inforss.debug(e);
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
        inforss.alert(inforss.get_string("html.nosource"));
        return;
      }
      document.getElementById("inforss.tabbox").selectedIndex = 2;

      const feedxml = document.createElement("RSS");
      feedxml.setAttribute("url", document.getElementById("inforss.url").value);
      feedxml.setAttribute("link", document.getElementById("inforss.url").value);
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

      const feed = new inforss.HTML_Feed(feedxml);
      const headlines = feed.read_headlines(
        null,
        document.getElementById("inforss.html.code").getAttribute("realSrc"));
      let rows = inforss.replace_without_children(document.getElementById("inforss.rows"));

      addRow(rows,
             document.getElementById("inforss.label1").getAttribute("value"),
             document.getElementById("inforss.label2").getAttribute("value"),
             document.getElementById("inforss.label3").getAttribute("value"),
             document.getElementById("inforss.label4").getAttribute("value"),
             document.getElementById("inforss.label5").getAttribute("value"));

      for (let headline of headlines)
      {
        const desc = feed.getDescription(headline);
        const date = feed.get_pubdate(headline);
        addRow(rows,
               feed.get_title(headline),
               desc == null ? null : desc.substring(0, 30),
               date == null ? null : date.toLocaleDateString(),
               feed.get_link(headline),
               feed.getCategory(headline));
      }
      gTest = true;
      gOldRegExpr = document.getElementById("inforss.html.regexp").value;
    }
  }
  catch (e)
  {
    inforss.alert(e);
    inforss.alert(inforss.get_string("html.issue"));
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
    inforss.debug(e);
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
      inforss.alert(inforss.get_string("html.mandatory"));
    }
    else
    {
      if (testFlag)
      {
        if (!gTest || (gOldRegExpr != document.getElementById("inforss.html.regexp").value))
        {
          valid = false;
          inforss.alert(inforss.get_string("html.test"));
        }
      }
      if (valid)
      {
        if ((document.getElementById("inforss.html.encoding").selectedIndex == 1) &&
          (document.getElementById("inforss.encoding.man").value == ""))
        {
          valid = false;
          inforss.alert(inforss.get_string("html.encoding"));
        }
      }
    }
  }
  catch (e)
  {
    inforss.debug(e);
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
    window.opener.setHtmlFeed(
      document.getElementById("inforss.url").value,
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
    inforss.debug(e);
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
      inforss.alert(inforss.get_string("html.selectfirst"));
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
    inforss.debug(e);
  }
}
