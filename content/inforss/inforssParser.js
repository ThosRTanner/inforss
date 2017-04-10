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
//-------------------------------------------------------------------------------------------------------------
// inforssParser
// Author : Didier Ernotte 2005
// Inforss extension
//-------------------------------------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------------------------
/* exported FeedManager */
function FeedManager()
{
  this.title = null;
  this.description = null;
  //  this.url = null;
  this.link = null;
  this.rssFeeds = new Array();
  this.addFeed = addFeed;
  this.parse = parse;
  this.getListOfCategories = getListOfCategories;
  this.type = null;
}

//-----------------------------------------------------------------------------------------------------
function Feed(title, description, link, category)
{
  this.title = title;
  this.description = description;
  this.link = link;
  this.category = category;
}

//-----------------------------------------------------------------------------------------------------
function addFeed(title, description, link, category)
{
  this.rssFeeds[this.rssFeeds.length] = new Feed(title, description, link, category);
}

//-----------------------------------------------------------------------------------------------------
function parse(xmlHttpRequest)
{
  //Note: I've only seen this called when you have 'display as submenu'
  //selected. Also it is iffy as it replicates code from inforssFeedxxx
  if (xmlHttpRequest.status >= 400)
  {
    //responseURL isn't necessarily the one I asked for but it's the best I can
    //do
    alert(xmlHttpRequest.statusText + ": " + xmlHttpRequest.responseURL);
    return;
  }
  var objDOMParser = new DOMParser();
  var objDoc = objDOMParser.parseFromString(xmlHttpRequest.responseText, "text/xml");

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
  this.description = getNodeValue(objDoc.getElementsByTagName(str_description));
  this.title = getNodeValue(objDoc.getElementsByTagName(str_title));

  try
  {
    for (let item of objDoc.getElementsByTagName(str_item))
    {
      let title = item.getElementsByTagName(str_title);
      let link = item.getElementsByTagName(str_link);
      let description = item.getElementsByTagName(str_description);
      let category = item.getElementsByTagName("category");
      title = title.length == 0 ? "" : getNodeValue(title);
      link = link.length == 0 ? "" :
              feed_flag ? getHref(link) : getNodeValue(link);
      description = description.length == 0 ? "" : getNodeValue(description);
      category = category.length == 0 ? "" : getNodeValue(category);
      this.addFeed(title, description, link, category);
    }
  }
  catch (e)
  {
    console.log("Error processing", objDoc, e);
    alert("error processing: " + e);
  }
}

//-----------------------------------------------------------------------------------------------------
function getListOfCategories()
{
  var listCategory = new Array();
  for (var i = 0; i < this.rssFeeds.length; i++)
  {
    if (this.rssFeeds[i].category != "")
    {
      var find = false;
      var j = 0;
      while ((j < listCategory.length) && (find == false))
      {
        if (listCategory[j] == this.rssFeeds[i].category)
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
        listCategory.push(this.rssFeeds[i].category);
      }
    }
  }
  return listCategory;
}

//-----------------------------------------------------------------------------------------------------
/* exported getNodeValue */
function getNodeValue(obj)
{
  //FIXME .textValue?
  return obj == null || obj.length == 0 || obj[0] == null || obj[0].firstChild == null ? null : obj[0].firstChild.nodeValue;
}

/* exported getHref */
//-----------------------------------------------------------------------------------------------------
function getHref(obj)
{
  //FIXME??? Why
  return obj == null || obj.length == 0 || obj[0] == null || obj[0].getAttribute("href") == null ? null : obj[0].getAttribute("href");
}
