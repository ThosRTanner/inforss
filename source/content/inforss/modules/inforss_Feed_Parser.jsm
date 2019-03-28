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
// inforss_Feed_Parser
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------

/* jshint globalstrict: true */
/* eslint-disable strict */
"use strict";

/* eslint-disable array-bracket-newline */
/* exported EXPORTED_SYMBOLS */
const EXPORTED_SYMBOLS = [
  "getHref", /* exported getHref */
  "getNodeValue", /* exported getNodeValue */
  "Feed_Parser", /* exported Feed_Parser */
];
/* eslint-enable array-bracket-newline */

const { alert } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Prompt.jsm",
  {});

const { console } =
  Components.utils.import("resource://gre/modules/Console.jsm", {});

const DOMParser = Components.Constructor("@mozilla.org/xmlextras/domparser;1",
                                         "nsIDOMParser");

/* globals URL */
Components.utils.importGlobalProperties(['URL']);

//-----------------------------------------------------------------------------------------------------
function Headline(title, description, link, category)
{
  this.title = title;
  this.description = description;
  this.link = link;
  this.category = category;
}

//-----------------------------------------------------------------------------------------------------
function Feed_Parser()
{
  this.title = null;
  this.description = null;
  this.link = null;
  this.headlines = [];
  this.type = null;
}

Feed_Parser.prototype = {

  //-----------------------------------------------------------------------------------------------------
  _add_headline(title, description, link, category)
  {
    this.headlines.push(new Headline(title, description, link, category));
  },

  //-----------------------------------------------------------------------------------------------------
  //FIXME This function does the same as the factory in inforss.Single_Feed but
  //not as well (and should use the factory) and in inforss.js. This should hand
  //off to the individual feeds
  parse(xmlHttpRequest)
  {
    try
    {
      //Note: Channel is a mozilla extension
      const url = xmlHttpRequest.channel.originalURI.asciiSpec;

      //Note: I've only seen this called when you have 'display as submenu'
      //selected. Also it is iffy as it replicates code from inforssFeedxxx
      if (xmlHttpRequest.status >= 400)
      {
        alert(xmlHttpRequest.statusText + ": " + url);
        return;
      }

      let string = xmlHttpRequest.responseText;

      {
        const pos = string.indexOf("<?xml");
        //Some places return a 404 page with a 200 status for reasons best known
        //to themselves.
        //Other sites get taken over and return a 'for sale' page.
        if (pos == -1)
        {
          throw "Received something that wasn't xml";
        }
        //Some sites have rubbish before the <?xml
        if (pos > 0)
        {
          string = string.substring(pos);
          console.log("Stripping rubbish at start of " + url);
        }
      }
      {
        //TMI comic has unencoded strange character
        const pos1 = string.indexOf("\x0c");
        if (pos1 > 0)
        {
          string = string.substring(0, pos1) + string.substring(pos1 + 1);
          console.log("Stripping rubbish character from " + url);
        }
      }

      var objDOMParser = new DOMParser();
      var objDoc = objDOMParser.parseFromString(string, "text/xml");

      var str_description = null;
      var str_title = null;
      var str_link = null;
      var str_item = null;
      var feed_flag = false;
      if (objDoc.documentElement.nodeName == "feed")
      {
        str_description = "tagline";
        str_title = "title";
        str_link = "link";
        str_item = "entry";
        feed_flag = true;
        this.type = "atom";
      }
      else
      {
        str_description = "description";
        str_title = "title";
        str_link = "link";
        str_item = "item";
        this.type = "rss";
      }

      this.link = feed_flag ?
        getHref(objDoc.getElementsByTagName(str_link)) :
        getNodeValue(objDoc.getElementsByTagName(str_link));
      this.description =
        getNodeValue(objDoc.getElementsByTagName(str_description));
      this.title = getNodeValue(objDoc.getElementsByTagName(str_title));

      for (let item of objDoc.getElementsByTagName(str_item))
      {
        let title = item.getElementsByTagName(str_title);
        title = title.length == 0 ? "" : getNodeValue(title);
        let link = item.getElementsByTagName(str_link);
        link = link.length == 0 ? "" :
                feed_flag ? getHref(link) : getNodeValue(link);
        link = (new URL(link, xmlHttpRequest.channel.name)).href;

        let description = item.getElementsByTagName(str_description);
        description = description.length == 0 ? "" : getNodeValue(description);

        let category = item.getElementsByTagName("category");
        category = category.length == 0 ? "" : getNodeValue(category);

        this._add_headline(title, description, link, category);
      }
    }
    catch (e)
    {
      console.log("Error processing", xmlHttpRequest, e);
      alert("error processing: " + e);
    }
  },

  //------------------------------------------------------------------------------
  getListOfCategories()
  {
    const categories = new Set();
    //FIXME surely I can do this with map or similar
    for (let headline of this.headlines)
    {
      if (headline.category != "")
      {
        categories.add(headline.category);
      }
    }
    return Array.from(categories).sort();
  }
}

//-----------------------------------------------------------------------------------------------------
function getNodeValue(obj)
{
  return obj.length == 0 || obj[0] == null || obj[0].firstChild == null ?
          null :
          obj[0].firstChild.nodeValue;
}

//-----------------------------------------------------------------------------------------------------
function getHref(obj)
{
  //FIXME Wouldn't this be better coded as doc.querySelector(rel == alternate && type == link) on the whole objdoc?
  for (let elem of obj)
  {
    if (elem.getAttribute("rel") == "alternate")
    {
      return elem.getAttribute("href");
    }
  }
  return null;
}
