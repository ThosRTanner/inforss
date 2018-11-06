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
// inforssOption
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------
var inforss = inforss || {};
Components.utils.import("chrome://inforss/content/modules/Debug.jsm", inforss);

Components.utils.import("chrome://inforss/content/modules/Utils.jsm", inforss);

Components.utils.import("chrome://inforss/content/modules/Prompt.jsm", inforss);

Components.utils.import("chrome://inforss/content/modules/Version.jsm", inforss);

Components.utils.import("chrome://inforss/content/modules/NNTP_Handler.jsm", inforss);

/* globals inforssRead, inforssXMLRepository */
/* globals inforssFindIcon */
/* globals inforssCopyLocalToRemote, inforssCopyRemoteToLocal */
/* globals FeedManager */

//From inforssOptionBasic */
/* globals populate_basic_tab, update_basic_tab, add_feed_to_group_list */

//From inforssOptionAdvanced */
/* globals populate_advanced_tab, update_advanced_tab, add_feed_to_apply_list */
/* globals Advanced__Report__populate, get_feed_info */

/* globals LocalFile */

var gRssXmlHttpRequest = null;

//Fixme do we actually need this as it is always the number of items in the
//feed list.
var gNbRss = 0;

var gOldRssIndex = 0;
var gRemovedUrl = null;

//Shared with inforssOptionAdvanced
/* exported theCurrentFeed, gInforssNbFeed, gInforssMediator, currentRSS */
var currentRSS = null; //And inforssOptionBasic
var theCurrentFeed = null;
//FIXME Number of feeds. Get it from repository
var gInforssNbFeed = 0;
var gInforssMediator = null;

var applyScale = false;
var refreshCount = 0;

//FIXME By rights this is part of the configuration vvv
const INFORSS_DEFAULT_GROUP_ICON = "chrome://inforss/skin/group.png";

const WindowMediator = Components.classes[
    "@mozilla.org/appshell/window-mediator;1"].getService(
    Components.interfaces.nsIWindowMediator);

const ObserverService = Components.classes[
  "@mozilla.org/observer-service;1"].getService(
  Components.interfaces.nsIObserverService);

//I seriously don't think I should need this and it's a bug in palemoon 28
//See Issue #192
const privXMLHttpRequest = Components.Constructor(
  "@mozilla.org/xmlextras/xmlhttprequest;1",
  "nsIXMLHttpRequest");

//------------------------------------------------------------------------------
/* exported init */
function init()
{
  inforss.traceIn();

  try
  {
    const enumerator = WindowMediator.getEnumerator(null);
    while (enumerator.hasMoreElements())
    {
      const win = enumerator.getNext();
      if (win.gInforssMediator != null)
      {
        gInforssMediator = win.gInforssMediator;
        break;
      }
    }

    //Populate the font menu.
    //Note: Whilst arguably we should respond to font add/removal events and
    //display the current font list whenever clicked, the old code didn't,
    //and I still think this is the best place to deal with this.
    //this API is almost completely undocumented.
    const FontService = Components.classes[
      "@mozilla.org/gfx/fontenumerator;1"].getService(
      Components.interfaces.nsIFontEnumerator);

    const font_menu = document.getElementById("fresh-font");

    let count = { value: null };
    for (let font of FontService.EnumerateAllFonts(count))
    {
      let element = font_menu.appendItem(font, font);
      element.style.fontFamily = font;
    }

    load_and_display_configuration();
  }
  catch (e)
  {
    inforss.debug(e);
  }
  inforss.traceOut();
}

function load_and_display_configuration()
{
  inforssRead();
  redisplay_configuration();
}

//------------------------------------------------------------------------------

function redisplay_configuration()
{
  inforss.traceIn();

  try
  {
    //FIXME Really? Why don't we get the selected feed from the config?
    theCurrentFeed = gInforssMediator.getSelectedInfo(true);

    populate_basic_tab();
    populate_advanced_tab();

    gNbRss = inforssXMLRepository.get_all().length;

    if (gNbRss > 0)
    {
      document.getElementById("inforss.next.rss").setAttribute("disabled", false);
    }

    //not entirely sure what this bit of code is doing. It appears to be using
    //the apply button not existing to create the apply button.
    if (document.getElementById("inforss.apply") == null)
    {
      var cancel = document.getElementById('inforssOption').getButton("cancel");
      var apply = document.getElementById('inforssOption').getButton("extra1");
      apply.parentNode.removeChild(apply);
      apply.label = inforss.get_string("apply");
      apply.setAttribute("label", apply.label);
      apply.setAttribute("accesskey", "");
      apply.setAttribute("id", "inforss.apply");
      apply.addEventListener("click", function()
      {
        return _apply();
      }, false);
      cancel.parentNode.insertBefore(apply, cancel);

      document.getElementById("rss.filter.number").removeAllItems();
      let selectFolder = document.createElement("menupopup");
      selectFolder.setAttribute("id", "rss.filter.number.1");
      document.getElementById("rss.filter.number").appendChild(selectFolder);
      for (var i = 0; i < 100; i++)
      {
        document.getElementById("rss.filter.number").appendItem(i, i);
        if (i < 51)
        {
          document.getElementById("rss.filter.hlnumber").appendItem(i, i);
        }
      }
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
  inforss.traceOut();
}

//------------------------------------------------------------------------------
// Adds a feed to the two tickable lists
function add_feed_to_pick_lists(feed)
{
  add_feed_to_group_list(feed);
  add_feed_to_apply_list(feed);
}

//-----------------------------------------------------------------------------------------------------
/* exported accept */
function accept()
{
  var returnValue = false;
  try
  {
    returnValue = _apply();
    if (returnValue)
    {
      returnValue = false;
      var acceptButton = document.getElementById('inforssOption').getButton("accept");
      acceptButton.setAttribute("disabled", "true");
      window.setTimeout(closeOptionDialog, 2300);
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
  return returnValue;
}

//-----------------------------------------------------------------------------------------------------
function _apply()
{
  var returnValue = false;
  try
  {
    returnValue = storeValue();
    if (returnValue)
    {
      inforssXMLRepository.save();
      ObserverService.notifyObservers(null, "reload", gRemovedUrl);
      returnValue = true;
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
  return returnValue;
}

//-----------------------------------------------------------------------------------------------------
//basically returns the value from validDialog, which seems odd
function storeValue()
{
  try
  {
    if (!validDialog())
    {
      return false;
    }

    update_basic_tab();
    update_advanced_tab();

    //this should be part of bits of the advanced tab. I think.
    //arguably most of this should be in inforssXMLRepository
    if (currentRSS != null)
    {
      var rss = currentRSS;
      switch (rss.getAttribute("type"))
      {
        case "rss":
        case "atom":
        case "html":
        case "nntp":
        {
          //Duplicated code from setting default.
          rss.setAttribute(
            "nbItem",
            document.getElementById('nbitem').selectedIndex == 0 ?
              "9999" : document.getElementById('nbitem1').value);
          rss.setAttribute(
            "lengthItem",
            document.getElementById('lengthitem').selectedIndex == 0 ?
              "9999" : document.getElementById('lengthitem1').value);
          rss.setAttribute("title", document.getElementById('optionTitle').value);
          if (rss.getAttribute("url") != document.getElementById('optionUrl').value)
          {
            replace_url_in_groups(rss.getAttribute("url"),
                                  document.getElementById('optionUrl').value);
            Advanced__Report__populate();
          }
          rss.setAttribute("url", document.getElementById('optionUrl').value);
          rss.setAttribute("link", document.getElementById('optionLink').value);
          rss.setAttribute("description",
                           document.getElementById('optionDescription').value);
          var refresh1 = document.getElementById('inforss.refresh').selectedIndex;
          rss.setAttribute("refresh", refresh1 == 0 ? 60 * 24 :
                                      refresh1 == 1 ? 60 :
                                        document.getElementById('refresh1').value);
          rss.setAttribute("filter",
                           document.getElementById("inforss.filter.anyall").selectedIndex == 0 ? "all" : "any");
          rss.setAttribute("icon", document.getElementById('iconurl').value);
          rss.setAttribute(
            "playPodcast",
            document.getElementById('playPodcast').selectedIndex == 0);
          rss.setAttribute(
            "savePodcastLocation",
            document.getElementById('savePodcastLocation2').selectedIndex == 1 ?
              "" : document.getElementById('savePodcastLocation3').value);
          rss.setAttribute(
            "browserHistory",
            document.getElementById('browserHistory').selectedIndex == 0);
          rss.setAttribute(
            "filterCaseSensitive",
            document.getElementById('filterCaseSensitive').selectedIndex == 0);
          rss.setAttribute("purgeHistory",
                           document.getElementById('purgeHistory').value);
          break;
        }

        case "group":
        {
          //Duplicated code from setting default.
          rss.setAttribute("url", document.getElementById('groupName').value);
          rss.setAttribute("title", document.getElementById('groupName').value);
          rss.setAttribute("description",
                           document.getElementById('groupName').value);
          rss.setAttribute(
            "filterPolicy",
            document.getElementById("inforss.filter.policy").selectedIndex);
          rss.setAttribute("icon", document.getElementById('iconurlgroup').value);
          rss.setAttribute(
            "filterCaseSensitive",
            document.getElementById('filterCaseSensitive').selectedIndex == 0);
          rss.setAttribute(
            "filter",
            document.getElementById("inforss.filter.anyall").selectedIndex == 0 ?
              "all" : "any");
          rss.setAttribute(
            "playlist",
            document.getElementById('playlistoption').selectedIndex == 0);

          //Remove every feed in the group
          inforssXMLRepository.feed_group_clear_groups(rss);

          //Get all the ticked children in the list and add them to this group
          for (let listitem of
                      document.getElementById("group-list-rss").childNodes)
          {
            if (listitem.childNodes[0].getAttribute("checked") == "true")
            {
              inforssXMLRepository.feed_group_add(
                rss, listitem.childNodes[1].getAttribute("url"));
            }
          }

          if (document.getElementById('playlistoption').selectedIndex == 0)
          {
            //And add in each playlist in the box. Note that it is possible
            //to create an empty playlist. Not sure this serves any great
            //purpose, but it is possible.
            var playlist = [];
            for (let item of
                  document.getElementById("group-playlist").childNodes)
            {
              playlist.push({
                url: item.getAttribute("url"),
                delay: parseInt(item.firstChild.firstChild.value, 10)
              });
            }
            inforssXMLRepository.feed_group_set_playlist(rss, playlist);
          }
          else
          {
            inforssXMLRepository.feed_group_clear_playlist(rss);
          }
          break;
        }
      }

      //Now remove all the filters
      inforssXMLRepository.feed_clear_filters(rss);

      //And add in the selected filters. Note that there is always one filter in
      //a group. This isn't really necessary but it's easier for the UI so you
      //can enable or disable even a single filter easily.
      const vbox = document.getElementById("inforss.filter.vbox");
      let hbox = vbox.childNodes[3]; // first filter
      while (hbox != null)
      {
        const checkbox = hbox.childNodes[0];
        const type = hbox.childNodes[1];
        const deck = hbox.childNodes[2];
        //What is stored here is messy
        //active: true/false
        //type: headline, body, category: include/exclude, string
        const string_match = deck.childNodes[0];
        //      published date, received date, read date:
        //          less than/more than/equals,
        //          0-99
        //          seconds, minutes, hours, days, weeks, months, years
        const time_match = deck.childNodes[1];
        //      headline #: less than/more than/equals 0-50
        const head_match = deck.childNodes[2];
        //FIXME It'd be more sensible to abstract the filter calculation and
        //make lots of little filter classes each with own comparison.
        //Which could then drive the UI dynamically.
        //Another note: THe filter list doesn't expand to fit the window width
        //so as soon as it needs scrolling vertically, you get a horizontal
        //scroll bar which looks naff.
        inforssXMLRepository.feed_add_filter(rss, {
          active: checkbox.checked,
          type: type.selectedIndex,
          include: string_match.childNodes[0].selectedIndex, //include/exclude
          text: string_match.childNodes[1].value, //text
          compare: time_match.childNodes[0].selectedIndex, //<, >, =
          elapse: time_match.childNodes[1].selectedIndex, //0-99
          unit: time_match.childNodes[2].selectedIndex, //s---y
          hlcompare: head_match.childNodes[0].selectedIndex, //<, >, =
          nb: head_match.childNodes[1].selectedIndex //0-50
        });
        hbox = hbox.nextSibling;
      }
      return true;
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
  return false;
}

//-----------------------------------------------------------------------------------------------------
function replace_url_in_groups(oldUrl, newUrl)
{
  try
  {
    for (let group of inforssXMLRepository.get_groups())
    {
      for (let feed of group.getElementsByTagName("GROUP"))
      {
        //FIXME Do this with selector[tag=Group, url=url]?
        if (feed.getAttribute("url") == oldUrl)
        {
          feed.setAttribute("url", newUrl);
        }
      }
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
}
//-----------------------------------------------------------------------------------------------------
function resetSettingDisabled(flag)
{
  var radio = document.getElementById('nbitem');
  radio.setAttribute("disabled", flag);
  radio.childNodes[0].setAttribute("disabled", flag);
  radio.childNodes[1].setAttribute("disabled", flag);
  var slider = document.getElementById('nbitem1');
  slider.disabled = flag;

  radio = document.getElementById('lengthitem');
  radio.setAttribute("disabled", flag);
  radio.childNodes[0].setAttribute("disabled", flag);
  radio.childNodes[1].setAttribute("disabled", flag);
  slider = document.getElementById('lengthitem1');
  slider.disabled = flag;

  radio = document.getElementById('inforss.refresh');
  radio.setAttribute("disabled", flag);
  radio.childNodes[0].setAttribute("disabled", flag);
  radio.childNodes[1].setAttribute("disabled", flag);
  radio.childNodes[2].setAttribute("disabled", flag);
  slider = document.getElementById('refresh1');
  slider.disabled = flag;

  slider = document.getElementById('purgeHistory');
  slider.disabled = flag;
  var button = document.getElementById('purgeHistory.button');
  button.disabled = flag;

  radio = document.getElementById('playPodcast');
  radio.setAttribute("disabled", flag);
  radio.childNodes[0].setAttribute("disabled", flag);
  radio.childNodes[1].setAttribute("disabled", flag);

  radio = document.getElementById('savePodcastLocation2');
  radio.setAttribute("disabled", flag);
  radio.childNodes[0].setAttribute("disabled", flag);
  radio.childNodes[1].setAttribute("disabled", flag);
  radio.nextSibling.childNodes[1].setAttribute("disabled", flag);
  var textbox = document.getElementById('savePodcastLocation3');
  textbox.disabled = flag;
  textbox.nextSibling.setAttribute("disabled", flag);

  radio = document.getElementById('browserHistory');
  radio.setAttribute("disabled", flag);
  radio.childNodes[0].setAttribute("disabled", flag);
  radio.childNodes[1].setAttribute("disabled", flag);
}

//-----------------------------------------------------------------------------------------------------
function validDialog()
{
  var returnValue = true;
  try
  {
    if (currentRSS != null)
    {
      switch (currentRSS.getAttribute("type"))
      {
        case "rss":
        case "atom":
        case "html":
        case "html":
          {
            if ((document.getElementById('optionTitle').value == null) ||
              (document.getElementById('optionTitle').value == "") ||
              (document.getElementById('optionUrl').value == null) ||
              (document.getElementById('optionUrl').value == "") ||
              (document.getElementById('optionLink').value == null) ||
              (document.getElementById('optionLink').value == "") ||
              (document.getElementById('optionDescription').value == null) ||
              (document.getElementById('optionDescription').value == "") ||
              (document.getElementById('iconurl').value == null) ||
              (document.getElementById('iconurl').value == ""))
            {
              returnValue = false;
              inforss.alert(inforss.get_string("pref.mandatory"));
            }
            if ((currentRSS.getAttribute("type") == "html") && (returnValue))
            {
              if ((currentRSS.getAttribute("regexp") == null) || (currentRSS.getAttribute("regexp") == ""))
              {
                returnValue = false;
                inforss.alert(inforss.get_string("html.mandatory"));
              }
              else
              {
                if ((currentRSS.getAttribute("htmlTest") == null) || (currentRSS.getAttribute("htmlTest") == "") || (currentRSS.getAttribute("htmlTest") == "false"))
                {
                  returnValue = false;
                  inforss.alert(inforss.get_string("html.test"));
                }
              }
            }
            break;
          }
        case "group":
          {
            if ((document.getElementById("groupName").value == null) ||
              (document.getElementById("groupName").value == "") ||
              (document.getElementById('iconurlgroup').value == null) ||
              (document.getElementById('iconurlgroup').value == ""))
            {
              returnValue = false;
              inforss.alert(inforss.get_string("pref.mandatory"));
            }
            else
            {
              if (document.getElementById('playlistoption').selectedIndex == 0) // playlist = true
              {
                var listbox = document.getElementById("group-playlist");
                var richListItem = listbox.firstChild;
                while ((richListItem != null) && (returnValue))
                {
                  if ((richListItem.firstChild.firstChild.value == null) ||
                    (richListItem.firstChild.firstChild.value == ""))
                  {
                    returnValue = false;
                    inforss.alert(inforss.get_string("delay.mandatory"));
                  }
                  else
                  {
                    richListItem = richListItem.nextSibling;
                  }
                }
              }
            }
            break;
          }
      }
      if (returnValue)
      {
        var vbox = document.getElementById("inforss.filter.vbox");
        var child = vbox.childNodes[3]; // first filter
        while ((child != null) && (returnValue))
        {
          var checkbox = child.childNodes[0];
          var type = child.childNodes[1];
          var deck = child.childNodes[2];
          if ((checkbox.getAttribute("checked") == "true") && (type.selectedIndex <= 2)) // headline/body/category
          {
            var text = deck.firstChild.childNodes[1];
            if ((text.value == "") || (text.value == null))
            {
              inforss.alert(inforss.get_string("pref.mandatory"));
              returnValue = false;
            }
          }
          child = child.nextSibling;
        }
      }
    }
    if (returnValue)
    {
      if ((document.getElementById('defaultGroupIcon').value == null) ||
        (document.getElementById('defaultGroupIcon').value == ""))
      {
        returnValue = false;
        inforss.alert(inforss.get_string("icongroup.mandatory"));
      }
    }

    if (returnValue)
    {
      if ((document.getElementById('repoAutoSync').selectedIndex == 0) &&
        (checkServerInfoValue() == false))
      {
        returnValue = false;
        document.getElementById('inforss.option.tab').selectedIndex = 1;
        document.getElementById('inforss.listbox2').selectedIndex = 4;
        document.getElementById('inforssTabpanelsAdvance').selectedIndex = 3;
      }
    }

    if (returnValue)
    {
      if (document.getElementById('savePodcastLocation').selectedIndex == 0)
      {
        if ((document.getElementById('savePodcastLocation1').value == null) ||
          (document.getElementById('savePodcastLocation1').value == ""))
        {
          returnValue = false;
          inforss.alert(inforss.get_string("podcast.mandatory"));
        }
        else
        {
          try
          {
            //var dir = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
            //dir.initWithPath(document.getElementById('savePodcastLocation1').value);
            let dir = new LocalFile(
              document.getElementById('savePodcastLocation1').value);
            if (!dir.exists() || !dir.isDirectory())
            {
              returnValue = false;
            }
          }
          catch (ex)
          {
            returnValue = false;
          }
          if (returnValue == false)
          {
            inforss.alert(inforss.get_string("podcast.location.notfound"));
          }
        }
        if (returnValue == false)
        {
          document.getElementById('inforss.option.tab').selectedIndex = 1;
          document.getElementById('inforss.listbox2').selectedIndex = 0;
          document.getElementById('inforssTabpanelsAdvance').selectedIndex = 0;
        }
      }
    }

    if (returnValue)
    {
      if (document.getElementById('savePodcastLocation2').selectedIndex == 0)
      {
        if ((document.getElementById('savePodcastLocation3').value == null) ||
          (document.getElementById('savePodcastLocation3').value == ""))
        {
          returnValue = false;
          inforss.alert(inforss.get_string("podcast.mandatory"));
        }
        else
        {
          try
          {
            //var dir = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
            //dir.initWithPath(document.getElementById('savePodcastLocation3').value);
            let dir = new LocalFile(
              document.getElementById('savePodcastLocation3').value);
            if (!dir.exists() || !dir.isDirectory())
            {
              returnValue = false;
            }
          }
          catch (ex)
          {
            returnValue = false;
          }
          if (returnValue == false)
          {
            inforss.alert(inforss.get_string("podcast.location.notfound"));
          }
        }
        if (returnValue == false)
        {
          document.getElementById('inforss.option.tab').selectedIndex = 0;
          document.getElementById('inforss.listbox1').selectedIndex = 0;
          document.getElementById('inforssTabpanelsBasic').selectedIndex = 3;
          document.getElementById('inforss.gefise').selectedIndex = 2;
        }
      }
    }

  }
  catch (e)
  {
    inforss.debug(e);
  }
  return returnValue;
}

//-----------------------------------------------------------------------------------------------------
/* exported remove_feed */
function remove_feed()
{
  try
  {
    if (currentRSS == null)
    {
      inforss.alert(inforss.get_string("group.selectfirst"));
      return;
    }

    var menuItem = document.getElementById("rss-select-menu").selectedItem;
    var key = null;
    if (currentRSS.getAttribute("type") == "group")
    {
      key = "group.removeconfirm";
    }
    else
    {
      key = "rss.removeconfirm";
    }
    if (inforss.confirm(inforss.get_string(key)))
    {
      gRemovedUrl = ((gRemovedUrl == null) ? "" : gRemovedUrl) + currentRSS.getAttribute("url") + "|";
      var parent = menuItem.parentNode;
      menuItem.parentNode.removeChild(menuItem);
      //FIXME This is mixing the UI and config. Should have something like
      //inforssXMLRepository.remove(feed) to do this removal and the for loop
      currentRSS.parentNode.removeChild(currentRSS);
      if (currentRSS.getAttribute("type") != "group")
      {
        const listbox = document.getElementById("group-list-rss");
        var listitem = listbox.firstChild.nextSibling;
        while (listitem != null)
        {
          const label = listitem.childNodes[1];
          if (label.getAttribute("value") == currentRSS.getAttribute("title"))
          {
            listbox.removeChild(listitem);
          }
          listitem = listitem.nextSibling;
        }
        for (let group of inforssXMLRepository.get_groups())
        {
          for (let feed of group.getElementsByTagName("GROUP"))
          {
            if (feed.getAttribute("url") == currentRSS.getAttribute("url"))
            {
              group.removeChild(feed);
              break;
            }
          }
        }
      }
      gNbRss--;
      if (gNbRss > 0)
      {
        currentRSS = null;
        parent.parentNode.selectedIndex = 0;
        selectRSS(parent.firstChild);
      }
      else
      {
        currentRSS = null;
      }
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
/* exported newGroup */
function newGroup()
{
  try
  {
    const name = inforss.prompt(inforss.get_string("group.newgroup"), "");
    if (name != null && name != "")
    {
      if (nameAlreadyExists(name))
      {
        inforss.alert(inforss.get_string("group.alreadyexists"));
      }
      else
      {
        const rss = inforssXMLRepository.add_group(name);

        var element = document.getElementById("rss-select-menu").appendItem(name, "newgroup");
        element.setAttribute("class", "menuitem-iconic");
        element.setAttribute("image", rss.getAttribute("icon"));
        element.setAttribute("url", name);
        document.getElementById("rss-select-menu").selectedIndex = gNbRss;
        gNbRss++;
        selectRSS(element);

        document.getElementById("inforss.group.treecell1").parentNode.setAttribute("url", rss.getAttribute("url"));
        document.getElementById("inforss.group.treecell1").setAttribute("properties", "on");
        document.getElementById("inforss.group.treecell2").setAttribute("properties", "inactive");
        document.getElementById("inforss.group.treecell3").setAttribute("label", "");
        document.getElementById("inforss.group.treecell4").setAttribute("label", "");
        document.getElementById("inforss.group.treecell5").setAttribute("label", "");

      }
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
/* exported newRss */
function newRss()
{
  try
  {
    var returnValue = {
      title: null,
      type: null,
      search: null,
      keyword: null,
      url: null,
      user: null,
      password: null,
      valid: false,
      regexp: null,
      regexpTitle: null,
      regexpDescription: null,
      regexpLink: null,
      regexpStartAfter: null,
      htmlDirection: null,
      htmlTest: null
    };
    window.openDialog("chrome://inforss/content/inforssCaptureNewFeed.xul", "_blank", "modal,centerscreen,resizable=yes, dialog=yes", returnValue);
    var type = returnValue.type;
    if (returnValue.valid)
    {
      switch (type)
      {
        case "rss":
        case "html":
        case "search":
        case "twitter":
          {
            var url = returnValue.url;
            if (nameAlreadyExists(url))
            {
              inforss.alert(inforss.get_string("rss.alreadyexists"));
            }
            else
            {
              var title = returnValue.title;
              var user = returnValue.user;
              var password = returnValue.password;
              if (gRssXmlHttpRequest != null)
              {
                gRssXmlHttpRequest.abort();
              }
              gRssXmlHttpRequest = new privXMLHttpRequest();
              gRssXmlHttpRequest.open("GET", url, true, user, password);
              //FIXME This should NOT set fields in the request object
              gRssXmlHttpRequest.url = url;
              gRssXmlHttpRequest.user = user;
              gRssXmlHttpRequest.title = title;
              gRssXmlHttpRequest.password = password;
              gRssXmlHttpRequest.timeout = 10000;
              gRssXmlHttpRequest.ontimeout = rssTimeout;
              gRssXmlHttpRequest.onerror = rssTimeout;
              document.getElementById("inforss.new.feed").setAttribute("disabled", "true");
              if ((type == "rss") || (type == "twitter")) // rss
              {
                gRssXmlHttpRequest.onload = processRss;
              }
              else
              {
                gRssXmlHttpRequest.feedType = type;
                gRssXmlHttpRequest.onload = processHtml;
                if (type == "search")
                {
                  gRssXmlHttpRequest.regexp = returnValue.regexp;
                  gRssXmlHttpRequest.regexpTitle = returnValue.regexpTitle;
                  gRssXmlHttpRequest.regexpDescription = returnValue.regexpDescription;
                  gRssXmlHttpRequest.regexpLink = returnValue.regexpLink;
                  gRssXmlHttpRequest.regexpStartAfter = returnValue.regexpStartAfter;
                  gRssXmlHttpRequest.htmlDirection = returnValue.htmlDirection;
                  gRssXmlHttpRequest.htmlTest = returnValue.htmlTest;
                }
              }
              gRssXmlHttpRequest.send(null);
            }
            break;
          }
        case "nntp":
          {
            newNntp(returnValue);
            break;
          }
      }
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function newNntp(type)
{
  try
  {
    if (nameAlreadyExists(type.url))
    {
      inforss.alert(inforss.get_string("nntp.alreadyexists"));
      return;
    }
    const nntp = new inforss.NNTP_Handler(type.url, type.user, type.password);
    nntp.open().then(
      () => createNntpFeed(type, {url: nntp.host, group: nntp.group})
    ).catch(
      //This blocks which is not ideal.
      status => inforss.alert(inforss.get_string(status))
    ).then(
      () => nntp.close()
    );
  }
  catch (e)
  {
    inforss.alert(inforss.get_string("nntp.malformedurl"));
    inforss.debug(e);
  }
}

function createNntpFeed(type, test)
{
  try
  {
    const domain = test.url.substring(test.url.indexOf("."));
    const rss = inforssXMLRepository.add_item(
      type.title,
      test.group,
      type.url,
      "http://www" + domain,
      type.user,
      type.password,
      "nntp");
    rss.setAttribute("icon", "chrome://inforss/skin/nntp.png");

    const element = document.getElementById("rss-select-menu").appendItem(test.group, "nntp");
    element.setAttribute("class", "menuitem-iconic");
    element.setAttribute("image", rss.getAttribute("icon"));
    element.setAttribute("url", type.url);
    document.getElementById("rss-select-menu").selectedIndex = gNbRss;
    gNbRss++;
    selectRSS(element);

    document.getElementById("inforss.group.treecell1").parentNode.setAttribute("url", rss.getAttribute("url"));
    document.getElementById("inforss.group.treecell1").setAttribute("properties", "on");
    document.getElementById("inforss.group.treecell2").setAttribute("properties", "inactive");
    document.getElementById("inforss.group.treecell3").setAttribute("label", "");
    document.getElementById("inforss.group.treecell4").setAttribute("label", "");
    document.getElementById("inforss.group.treecell5").setAttribute("label", "");
  }
  catch (e)
  {
    inforss.debug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function nameAlreadyExists(url)
{
  return inforssXMLRepository.get_item_from_url(url) != null;
}


//-----------------------------------------------------------------------------------------------------
function selectRSS(menuitem)
{
  try
  {
    if ((currentRSS == null) || (validDialog()))
    {
      selectRSS1(menuitem.getAttribute("url"), menuitem.getAttribute("user"));
      gOldRssIndex = document.getElementById("rss-select-menu").selectedIndex;
    }
    else
    {
      document.getElementById("rss-select-menu").selectedIndex = gOldRssIndex;
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
/* exported getNext */
function getNext()
{
  try
  {
    if (validDialog())
    {
      if (document.getElementById("rss-select-menu").selectedIndex != gNbRss - 1)
      {
        document.getElementById("rss-select-menu").selectedIndex = document.getElementById("rss-select-menu").selectedIndex + 1;
        selectRSS(document.getElementById("rss-select-menu").selectedItem);
      }
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
/* exported getPrevious */
function getPrevious()
{
  try
  {
    if (validDialog())
    {
      if (document.getElementById("rss-select-menu").selectedIndex > 0)
      {
        document.getElementById("rss-select-menu").selectedIndex = document.getElementById("rss-select-menu").selectedIndex - 1;
        selectRSS(document.getElementById("rss-select-menu").selectedItem);
      }
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
}


//-----------------------------------------------------------------------------------------------------
function setGroupCheckBox(rss)
{
  try
  {
    var listbox = document.getElementById("group-list-rss");
    var listitem = null;
    var checkbox = null;
    var label = null;
    var flag = document.getElementById("viewAllViewSelected").selectedIndex;
    for (var i = 1; i < listbox.childNodes.length; i++)
    {
      listitem = listbox.childNodes[i];
      checkbox = listitem.childNodes[0];
      label = listitem.childNodes[1];
      var selectedList = rss.getElementsByTagName("GROUP");
      var find = false;
      var j = 0;
      if (selectedList != null)
      {
        while ((j < selectedList.length) && (find == false))
        {
          if (selectedList[j].getAttribute("url") == label.getAttribute("url"))
          {
            find = true;
          }
          else
          {
            j++;
          }
        }
      }
      checkbox.setAttribute("checked", (find) ? "true" : "false");
      if (flag == 0)
      {
        listitem.setAttribute("collapsed", "false");
      }
      else
      {
        if (find)
        {
          listitem.setAttribute("collapsed", "false");
        }
        else
        {
          listitem.setAttribute("collapsed", "true");
        }
      }
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
/* exported checkAll */
function checkAll(obj)
{
  try
  {
    var flag = (obj.getAttribute("checked") == "true") ? "false" : "true";
    var listbox = document.getElementById("group-list-rss");
    for (var i = 1; i < listbox.childNodes.length; i++)
    {
      var listitem = listbox.childNodes[i];
      var checkbox = listitem.childNodes[0];
      checkbox.setAttribute("checked", flag);
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
const fetch_categories = (function()
{
  let request = null;
  return function(url, user)
  {
    if (request != null)
    {
      console.log("Aborting category fetch", request);
      request.abort();
    }
    request = new privXMLHttpRequest();
    const password = inforssXMLRepository.readPassword(url, user);
    request.open("GET", url, true, user, password);
    request.timeout = 5000;
    request.ontimeout = function(evt)
    {
      console.log("Category fetch timeout", evt);
      request = null;
    };
    request.onerror = function(evt)
    {
      console.log("Category fetch error", evt);
      request = null;
    };
    request.onload = function(evt)
    {
      request = null;
      processCategories(evt);
    };
    request.send();
  };
})();

/* exported selectRSS1 */
function selectRSS1(url, user)
{
  try
  {
    document.getElementById("inforss.previous.rss").setAttribute("disabled", "true");
    document.getElementById("inforss.next.rss").setAttribute("disabled", "true");
    document.getElementById("inforss.new.feed").setAttribute("disabled", "true");

    if (currentRSS != null)
    {
      storeValue();
    }

    const rss = inforssXMLRepository.get_item_from_url(url);
    selectRSS2(rss);

    currentRSS = rss;
    document.getElementById("inforss.filter.anyall").selectedIndex = (rss.getAttribute("filter") == "all") ? 0 : 1;

    resetFilter();

    initListCategories([]);
    if (rss.getAttribute("type") == "rss" || rss.getAttribute("type") == "atom")
    {
      fetch_categories(url, user);
    }

    document.getElementById("inforss.make.current").setAttribute("disabled", rss.getAttribute("selected") == "true");
    document.getElementById("inforss.make.current.background").style.backgroundColor = (rss.getAttribute("selected") == "true") ? "rgb(192,255,192)" : "inherit";

  }
  catch (e)
  {
    inforss.debug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
//shared with inforssOptionAdvanced
/* exported selectRSS2 */
function selectRSS2(rss)
{
  try
  {
    var url = rss.getAttribute("url");
    switch (rss.getAttribute("type"))
    {
      case "rss":
      case "atom":
      case "html":
      case "nntp":
      case "twitter":
        {
          var br = document.getElementById("inforss.canvas.browser");
          br.setAttribute("collapsed", "false");

          br.docShell.allowAuth = false;
          br.docShell.allowImages = false;
          br.docShell.allowJavascript = false;
          br.docShell.allowMetaRedirects = false;
          br.docShell.allowPlugins = false;
          br.docShell.allowSubframes = false;

          if (rss.getAttribute("link").toLowerCase().indexOf("http") == 0)
          {
            br.setAttribute("src", rss.getAttribute("link"));
          }

          document.getElementById("inforss.rsstype").selectedIndex = 0;
          document.getElementById('optionTitle').value = rss.getAttribute("title");
          document.getElementById('optionUrl').value = rss.getAttribute("url");
          document.getElementById('optionLink').value = rss.getAttribute("link");
          document.getElementById('inforss.homeLink').setAttribute("link", rss.getAttribute("link"));
          document.getElementById('optionDescription').value = rss.getAttribute("description");
          document.getElementById('inforss.filter.forgroup').setAttribute("collapsed", "true");
          document.getElementById('playListTabPanel').setAttribute("collapsed", "true");

          var canvas = document.getElementById("inforss.canvas");
          canvas.setAttribute("link", rss.getAttribute("link"));

          var ctx = canvas.getContext("2d");
          //FIXME why don't we do this at startup?
          if (! applyScale)
          {
            ctx.scale(0.5, 0.3);
            applyScale = true;
          }
          ctx.clearRect(0, 0, 133, 100);
          ctx.drawWindow(br.contentWindow, 0, 0, 800, 600, "rgb(255,255,255)");
          if (refreshCount == 0)
          {
            window.setTimeout(updateCanvas, 2000);
          }
          else
          {
            refreshCount = 0;
          }


          var nbitem = rss.getAttribute("nbItem");
          document.getElementById("nbitem").selectedIndex = (nbitem == "9999") ? 0 : 1;
          if (nbitem != "9999")
          {
            document.getElementById("nbitem1").value = nbitem;
          }
          var lengthitem = rss.getAttribute("lengthItem");
          document.getElementById("lengthitem").selectedIndex = (lengthitem == "9999") ? 0 : 1;
          if (lengthitem != "9999")
          {
            document.getElementById('lengthitem1').value = lengthitem;
          }
          var refresh = rss.getAttribute("refresh");
          if (refresh == 60 * 24)
          {
            document.getElementById("inforss.refresh").selectedIndex = 0;
            document.getElementById("refresh1").value = 1;
          }
          else
          {
            document.getElementById("refresh1").value = refresh;
            document.getElementById("inforss.refresh").selectedIndex = (refresh == 60) ? 1 : 2;
          }
          document.getElementById("inforss.rss.icon").src = rss.getAttribute("icon");
          document.getElementById("iconurl").value = rss.getAttribute("icon");
          document.getElementById("inforss.rss.fetch").style.visibility = (rss.getAttribute("type") == "html") ? "visible" : "hidden";
          var playPodcast = rss.getAttribute("playPodcast");
          document.getElementById("playPodcast").selectedIndex = (playPodcast == "true") ? 0 : 1;
          var savePodcastLocation = rss.getAttribute("savePodcastLocation");
          document.getElementById("savePodcastLocation2").selectedIndex = (savePodcastLocation == "") ? 1 : 0;
          document.getElementById("savePodcastLocation3").value = savePodcastLocation;
          var browserHistory = rss.getAttribute("browserHistory");
          document.getElementById("browserHistory").selectedIndex = (browserHistory == "true") ? 0 : 1;
          var filterCaseSensitive = rss.getAttribute("filterCaseSensitive");
          document.getElementById("filterCaseSensitive").selectedIndex = (filterCaseSensitive == "true") ? 0 : 1;
          document.getElementById("purgeHistory").value = rss.getAttribute("purgeHistory");

          const obj = get_feed_info(rss);
          if (obj != null)
          {
            document.getElementById("inforss.feed.row1").setAttribute("selected", "false");
            document.getElementById("inforss.feed.row1").setAttribute("url", rss.getAttribute("url"));
            document.getElementById("inforss.feed.treecell1").setAttribute("properties", obj.enabled ? "on" : "off");
            document.getElementById("inforss.feed.treecell2").setAttribute("properties", obj.status);
            document.getElementById("inforss.feed.treecell3").setAttribute("label", obj.last_refresh);
            document.getElementById("inforss.feed.treecell4").setAttribute("label", obj.next_refresh);
            document.getElementById("inforss.feed.treecell5").setAttribute("label", obj.headlines);
            document.getElementById("inforss.feed.treecell6").setAttribute("label", obj.unread_headlines);
            document.getElementById("inforss.feed.treecell7").setAttribute("label", obj.new_headlines);
            document.getElementById("inforss.feed.treecell8").setAttribute("label", obj.in_group ? "Y" : "N");
          }
          resetSettingDisabled(false);
          break;
        }
      case "group":
        {
          document.getElementById("inforss.rsstype").selectedIndex = 1;
          document.getElementById("groupName").value = rss.getAttribute("url");
          document.getElementById("inforss.filter.policy").selectedIndex = rss.getAttribute("filterPolicy");
          document.getElementById("inforss.group.icon").src = rss.getAttribute("icon");
          document.getElementById("iconurlgroup").value = rss.getAttribute("icon");
          document.getElementById('inforss.filter.forgroup').setAttribute("collapsed", "false");
          //?????
          //var filterCaseSensitive = rss.getAttribute("filterCaseSensitive");
          document.getElementById("filterCaseSensitive").selectedIndex = (browserHistory == "true") ? 0 : 1;
          var playlist = rss.getAttribute("playlist");
          document.getElementById("playlistoption").selectedIndex = (playlist == "true") ? 0 : 1;
          inforss.replace_without_children(document.getElementById("group-playlist"));
          if (playlist == "true")
          {
            document.getElementById('playListTabPanel').setAttribute("collapsed", "false");
            var playLists = rss.getElementsByTagName("playLists");
            for (var i = 0; i < playLists[0].childNodes.length; i++)
            {
              var playList = playLists[0].childNodes[i];
              var rss1 = inforssXMLRepository.get_item_from_url(playList.getAttribute("url"));
              if (rss1 != null)
              {
                addToPlayList1(playList.getAttribute("delay"),
                  rss1.getAttribute("icon"),
                  rss1.getAttribute("title"),
                  playList.getAttribute("url"));
              }
            }
          }
          else
          {
            document.getElementById('playListTabPanel').setAttribute("collapsed", "true");
          }
          setGroupCheckBox(rss);
          var originalFeed = gInforssMediator.locateFeed(url);
          if (originalFeed != null)
          {
            originalFeed = originalFeed.info;
            if (originalFeed != null)
            {
              document.getElementById("inforss.group.treecell1").parentNode.setAttribute("url", rss.getAttribute("url"));
              document.getElementById("inforss.group.treecell1").setAttribute("properties", (rss.getAttribute("activity") == "true") ? "on" : "off");
              document.getElementById("inforss.group.treecell2").setAttribute("properties", (originalFeed.active) ? "active" : "inactive");
              document.getElementById("inforss.group.treecell3").setAttribute("label", originalFeed.getNbHeadlines());
              document.getElementById("inforss.group.treecell4").setAttribute("label", originalFeed.getNbUnread());
              document.getElementById("inforss.group.treecell5").setAttribute("label", originalFeed.getNbNew());
            }
          }
          document.getElementById("inforss.checkall").removeAttribute("checked");
          document.getElementById("nbitem").selectedIndex = 0;
          document.getElementById("nbitem1").value = 1;
          document.getElementById("lengthitem").selectedIndex = 0;
          document.getElementById('lengthitem1').value = 5;
          document.getElementById("inforss.refresh").selectedIndex = 0;
          document.getElementById("refresh1").value = 1;
          document.getElementById("purgeHistory").value = 1;
          document.getElementById("savePodcastLocation2").selectedIndex = 1;
          resetSettingDisabled(true);
          break;
        }
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
}

//------------------------------------------------------------------------------
//Got the categories. Parse and process the list
function processCategories(evt)
{
  try
  {
    if (evt.target.status == 200)
    {
      var fm = new FeedManager();
      fm.parse(evt.target);
      initListCategories(fm.getListOfCategories());
    }
    else
    {
      console.log("Didn't get OK status", evt);
      inforss.debug(evt.target.statusText);
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
}


//-----------------------------------------------------------------------------------------------------
//This is triggered from 3 places in the xul:
//selecting the report line in Basic feed/group for a feed
//selecting the report line in Basic feed/group for a group
//selecting the report line in Advanced / report (for all feeds/groups)
/* exported selectFeedReport */
function selectFeedReport(tree, event)
{
  var row = {},
    colID = {},
    type = {};
  try
  {
    tree.treeBoxObject.getCellAt(event.clientX, event.clientY, row, colID, type);
    if (colID.value != null)
    {
      if (typeof(colID.value) == "object") //patch for firefox 1.1
      {
        colID.value = colID.value.id;
      }
      if ((colID.value.indexOf(".report.activity") != -1) && (type.value == "image"))
      {
        if (row.value >= gInforssNbFeed)
        {
          row.value--;
        }
        row = tree.getElementsByTagName("treerow").item(row.value);
        var cell = row.firstChild;
        var treecols = tree.getElementsByTagName("treecols").item(0);
        var cell1 = treecols.firstChild;
        while (cell1.getAttribute("id").indexOf(".report.activity") == -1)
        {
          cell1 = cell1.nextSibling;
          if (cell1.nodeName != "splitter")
          {
            cell = cell.nextSibling;
          }
        }
        cell.setAttribute("properties", (cell.getAttribute("properties").indexOf("on") != -1) ? "off" : "on");
        var rss = inforssXMLRepository.get_item_from_url(cell.parentNode.getAttribute("url"));
        rss.setAttribute("activity", (rss.getAttribute("activity") == "true") ? "false" : "true");
        if (tree.getAttribute("id") != "inforss.tree3")
        {
          Advanced__Report__populate();
        }
        else
        {
          if (rss.getAttribute("url") == currentRSS.getAttribute("url"))
          {
            if (rss.getAttribute("type") != "group")
            {
              document.getElementById("inforss.feed.treecell1").setAttribute("properties", (rss.getAttribute("activity") == "true") ? "on" : "off");
            }
            else
            {
              document.getElementById("inforss.group.treecell1").setAttribute("properties", (rss.getAttribute("activity") == "true") ? "on" : "off");
            }
          }
        }
      }
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
}


//------------------------------------------------------------------------------
/* exported resetFilter */
function resetFilter()
{
  var vbox = document.getElementById("inforss.filter.vbox");
  var hbox = vbox.childNodes[3].nextSibling; // second filter
  while (hbox != null)
  {
    var next = hbox.nextSibling;
    hbox.parentNode.removeChild(hbox);
    hbox = next;
  }
  hbox = vbox.childNodes[3]; // first filter
  changeStatusFilter1(hbox, "false");

  hbox.childNodes[0].setAttribute("checked", "false"); // checkbox
  hbox.childNodes[1].selectedIndex = 0; //type
  hbox.childNodes[2].selectedIndex = 0; //deck
  hbox.childNodes[2].childNodes[0].childNodes[0].selectedIndex = 0; //include/exclude
  hbox.childNodes[2].childNodes[0].childNodes[1].removeAllItems(); //text
  var selectFolder = document.createElement("menupopup");
  selectFolder.setAttribute("id", "rss.filter.number.1");
  hbox.childNodes[2].childNodes[0].childNodes[1].appendChild(selectFolder);
  hbox.childNodes[2].childNodes[0].childNodes[1].value = ""; //text
  hbox.childNodes[2].childNodes[1].childNodes[0].selectedIndex = 0; //more/less
  hbox.childNodes[2].childNodes[1].childNodes[1].selectedIndex = 0; //1-100
  hbox.childNodes[2].childNodes[1].childNodes[2].selectedIndex = 0; //sec, min,...
  hbox.childNodes[2].childNodes[2].childNodes[0].selectedIndex = 0; //more/less
  hbox.childNodes[2].childNodes[2].childNodes[1].selectedIndex = 0; //1-50
}

//-----------------------------------------------------------------------------------------------------
/* exported parseHtml */
function parseHtml()
{
  try
  {
    window.openDialog("chrome://inforss/content/inforssParseHtml.xul", "_blank", "chrome,centerscreen,resizable=yes,dialog=yes,modal",
      currentRSS.getAttribute("url"),
      currentRSS.getAttribute("user"),
      currentRSS.getAttribute("regexp"),
      currentRSS.getAttribute("regexpTitle"),
      currentRSS.getAttribute("regexpDescription"),
      currentRSS.getAttribute("regexpPubDate"),
      currentRSS.getAttribute("regexpLink"),
      currentRSS.getAttribute("regexpCategory"),
      currentRSS.getAttribute("regexpStartAfter"),
      currentRSS.getAttribute("regexpStopBefore"),
      currentRSS.getAttribute("htmlDirection"),
      currentRSS.getAttribute("encoding"),
      currentRSS.getAttribute("htmlTest"));
  }
  catch (e)
  {
    inforss.debug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function processRss()
{
  try
  {
    var fm = new FeedManager();
    fm.parse(gRssXmlHttpRequest);
    const rss = inforssXMLRepository.add_item(
      fm.title,
      fm.description,
      gRssXmlHttpRequest.url,
      fm.link,
      gRssXmlHttpRequest.user,
      gRssXmlHttpRequest.password,
      fm.type);
    rss.setAttribute("icon", inforssFindIcon(rss));

    var element = document.getElementById("rss-select-menu").appendItem(fm.title, "newrss");
    element.setAttribute("class", "menuitem-iconic");
    element.setAttribute("image", rss.getAttribute("icon"));
    element.setAttribute("url", gRssXmlHttpRequest.url);
    document.getElementById("rss-select-menu").selectedIndex = gNbRss;
    gNbRss++;
    gRssXmlHttpRequest = null;
    //FIXME Shouldn't this add it to the menu as well?
    add_feed_to_pick_lists(rss);
    selectRSS(element);
    document.getElementById("inforss.new.feed").setAttribute("disabled", "false");


    document.getElementById("inforss.feed.row1").setAttribute("selected", "false");
    document.getElementById("inforss.feed.row1").setAttribute("url", rss.getAttribute("url"));
    document.getElementById("inforss.feed.treecell1").setAttribute("properties", (rss.getAttribute("activity") == "true") ? "on" : "off");
    document.getElementById("inforss.feed.treecell2").setAttribute("properties", "inactive");
    document.getElementById("inforss.feed.treecell3").setAttribute("label", "");
    document.getElementById("inforss.feed.treecell4").setAttribute("label", "");
    document.getElementById("inforss.feed.treecell5").setAttribute("label", "");
    document.getElementById("inforss.feed.treecell6").setAttribute("label", "");
    document.getElementById("inforss.feed.treecell7").setAttribute("label", "");
    document.getElementById("inforss.feed.treecell8").setAttribute("label", "N");

  }
  catch (e)
  {
    inforss.debug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function processHtml()
{
  try
  {
    if (gRssXmlHttpRequest.status == 200)
    {
      var rss = inforssXMLRepository.add_item(
        gRssXmlHttpRequest.title,
        null,
        gRssXmlHttpRequest.url,
        null,
        gRssXmlHttpRequest.user,
        gRssXmlHttpRequest.password,
        "html");

      rss.setAttribute("icon", inforssFindIcon(rss));

      if (gRssXmlHttpRequest.feedType == "search")
      {
        rss.setAttribute("regexp", gRssXmlHttpRequest.regexp);
        rss.setAttribute("regexpTitle", gRssXmlHttpRequest.regexpTitle);
        rss.setAttribute("regexpDescription", gRssXmlHttpRequest.regexpDescription);
        rss.setAttribute("regexpLink", gRssXmlHttpRequest.regexpLink);
        rss.setAttribute("regexpStartAfter", gRssXmlHttpRequest.regexpStartAfter);
        rss.setAttribute("htmlDirection", gRssXmlHttpRequest.htmlDirection);
        rss.setAttribute("htmlTest", gRssXmlHttpRequest.htmlTest);
      }

      const element = document.getElementById("rss-select-menu").appendItem(gRssXmlHttpRequest.title, "newrss");
      element.setAttribute("class", "menuitem-iconic");
      element.setAttribute("image", rss.getAttribute("icon"));
      element.setAttribute("url", gRssXmlHttpRequest.url);
      document.getElementById("rss-select-menu").selectedIndex = gNbRss;
      gNbRss++;
      gRssXmlHttpRequest = null;
      add_feed_to_pick_lists(rss);
      selectRSS(element);
    }
    else
    {
      inforss.alert(inforss.get_string("feed.issue"));
    }
    document.getElementById("inforss.new.feed").setAttribute("disabled", "false");


    document.getElementById("inforss.feed.row1").setAttribute("selected", "false");
    document.getElementById("inforss.feed.row1").setAttribute("url", rss.getAttribute("url"));
    document.getElementById("inforss.feed.treecell1").setAttribute("properties", (rss.getAttribute("activity") == "true") ? "on" : "off");
    document.getElementById("inforss.feed.treecell2").setAttribute("properties", "inactive");
    document.getElementById("inforss.feed.treecell3").setAttribute("label", "");
    document.getElementById("inforss.feed.treecell4").setAttribute("label", "");
    document.getElementById("inforss.feed.treecell5").setAttribute("label", "");
    document.getElementById("inforss.feed.treecell6").setAttribute("label", "");
    document.getElementById("inforss.feed.treecell7").setAttribute("label", "");
    document.getElementById("inforss.feed.treecell8").setAttribute("label", "N");

  }
  catch (e)
  {
    inforss.debug(e);
  }
}

//------------------------------------------------------------------------------
//Set up the list of categories
function initListCategories(categories)
{
  try
  {
    if (categories.length == 0)
    {
      categories.push(inforss.get_string("nocategory"));
    }
    const vbox = document.getElementById("inforss.filter.vbox");
    const hbox = vbox.childNodes[3]; // first filter
    const menu = hbox.childNodes[2].childNodes[0].childNodes[1]; //text

    inforss.replace_without_children(menu.firstChild);

    for (let category of categories)
    {
      const newElem = document.createElement("menuitem");
      newElem.setAttribute("label", category);
      menu.firstChild.appendChild(newElem);
    }
    initFilter();
  }
  catch (e)
  {
    inforss.debug(e);
  }
}


//-----------------------------------------------------------------------------------------------------
function initFilter()
{
  try
  {
    if (currentRSS != null)
    {
      var items = currentRSS.getElementsByTagName("FILTER");
      var vbox = document.getElementById("inforss.filter.vbox");
      var hbox = vbox.childNodes[3]; // first filter
      for (var i = 0; i < items.length; i++)
      {
        var checkbox = hbox.childNodes[0];
        var type = hbox.childNodes[1];
        var deck = hbox.childNodes[2];

        checkbox.setAttribute("checked", items[i].getAttribute("active"));
        type.selectedIndex = items[i].getAttribute("type");
        deck.selectedIndex = (type.selectedIndex <= 2) ? 0 : ((type.selectedIndex <= 5) ? 1 : 2);
        deck.childNodes[0].childNodes[0].selectedIndex = items[i].getAttribute("include");
        deck.childNodes[0].childNodes[1].value = items[i].getAttribute("text");
        deck.childNodes[1].childNodes[0].selectedIndex = items[i].getAttribute("compare");
        deck.childNodes[1].childNodes[1].selectedIndex = items[i].getAttribute("elapse");
        deck.childNodes[1].childNodes[2].selectedIndex = items[i].getAttribute("unit");
        deck.childNodes[2].childNodes[0].selectedIndex = items[i].getAttribute("hlcompare");
        deck.childNodes[2].childNodes[1].selectedIndex = items[i].getAttribute("nb");
        if (checkbox.getAttribute("checked") == "false")
        {
          changeStatusFilter1(hbox, "true");
        }
        if (i != (items.length - 1))
        {
          hbox = addFilter(checkbox);
        }
      }
      var max = gNbRss - 1;
      if (document.getElementById("rss-select-menu").selectedIndex == 0)
      {
        document.getElementById("inforss.previous.rss").setAttribute("disabled", true);
      }
      else
      {
        document.getElementById("inforss.previous.rss").setAttribute("disabled", false);
      }
      if (document.getElementById("rss-select-menu").selectedIndex == max)
      {
        document.getElementById("inforss.next.rss").setAttribute("disabled", true);
      }
      else
      {
        document.getElementById("inforss.next.rss").setAttribute("disabled", false);
      }
      document.getElementById("inforss.new.feed").setAttribute("disabled", "false");
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function rssTimeout()
{
  try
  {
    document.getElementById("inforss.new.feed").setAttribute("disabled", "false");
    inforss.alert(inforss.get_string("feed.issue"));
  }
  catch (e)
  {
    inforss.debug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
/* exported resetRepository */
function resetRepository()
{
  if (inforss.confirm(inforss.get_string("reset.repository")))
  {
    inforssXMLRepository.reset_xml_to_default();
    sendEventToMainWindow();
    load_and_display_configuration();
  }
}

//-----------------------------------------------------------------------------------------------------
/* exported sendEventToMainWindow */
function sendEventToMainWindow()
{
  ObserverService.notifyObservers(null, "rssChanged", "total");
}


//-----------------------------------------------------------------------------------------------------
/* exported clear_headline_cache */
function clear_headline_cache()
{
  if (inforss.confirm(inforss.get_string("reset.rdf")))
  {
    ObserverService.notifyObservers(null, "clear_headline_cache", "");
  }
}

//------------------------------------------------------------------------------
/* exported exportLivemark */
//This will create a bookmark folder called "InfoRSS Feeds". Any previous
//content of this folder will be nuked.
function exportLivemark()
{
  //Create a bookmark
  try
  {
    const folder_name = "InfoRSS Feeds";
    const BookmarkService = Components.classes[
      "@mozilla.org/browser/nav-bookmarks-service;1"].getService(
      Components.interfaces.nsINavBookmarksService);
    //I should find if this exists and use that already. This creates multiple
    //folders with the same name.
    const folder = BookmarkService.createFolder(
      BookmarkService.bookmarksMenuFolder,
      folder_name,
      BookmarkService.DEFAULT_INDEX);
    const LivemarkService = Components.classes[
      "@mozilla.org/browser/livemark-service;2"].getService(
      Components.interfaces.mozIAsyncLivemarks);

    document.getElementById("exportLivemarkProgressBar").value = 0;
    document.getElementById("inforss.livemarkDeck").selectedIndex = 1;

    const max = inforssXMLRepository.get_all().length;
    let sequence = Promise.resolve(1);
    for (let feed_ of inforssXMLRepository.get_all())
    {
      const feed = feed_; //I don't think this should be required with es6
      if (feed.getAttribute("type") == "rss" || feed.getAttribute("type") == "atom")
      {
        sequence = sequence.then(function(i)
        {
          return LivemarkService.addLivemark({
            title: feed.getAttribute("title"),
            feedURI: inforss.make_URI(feed.getAttribute("url")),
            siteURI: inforss.make_URI(feed.getAttribute("link")),
            parentId: folder,
            index: BookmarkService.DEFAULT_INDEX
          }).then(function()
          {
            document.getElementById("exportLivemarkProgressBar").value = i * 100 / max;
            return new Promise((resolve /*, reject*/ ) =>
            {
              setTimeout(i => resolve(i + 1), 0, i);
            });
          });
        });
      }
    }

    sequence.then(function()
    {
      document.getElementById("exportLivemarkProgressBar").value = 100;
      inforss.alert(inforss.get_string("export.livemark"));
    }).catch(function(e)
    {
      inforss.alert(e);
    }).then(function()
    {
      document.getElementById("inforss.livemarkDeck").selectedIndex = 0;
    });
  }
  catch (e)
  {
    inforss.debug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
/* exported exportBrowser */
function exportBrowser()
{
  try
  {
    var topMostBrowser = getTopMostBrowser();
    if (topMostBrowser != null)
    {
      const file = inforssXMLRepository.get_filepath();
      if (file.exists())
      {
        topMostBrowser.addTab("file:///" + file.path);
      }
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function getTopMostBrowser()
{
  var topMostBrowser = null;
  var windowManager = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator);
  var topMostWindow = windowManager.getMostRecentWindow("navigator:browser");
  if (topMostWindow)
  {
    topMostBrowser = topMostWindow.document.getElementById('content');
  }
  return topMostBrowser;
}

//-----------------------------------------------------------------------------------------------------
/* exported changeFilterType */
function changeFilterType(obj)
{
  obj.nextSibling.selectedIndex = ((obj.selectedIndex <= 2) ? 0 : ((obj.selectedIndex <= 5) ? 1 : 2));
}

//-----------------------------------------------------------------------------------------------------
/* exported addFilter */
function addFilter(obj)
{
  var hbox = null;
  try
  {
    if (currentRSS == null)
    {
      inforss.alert(inforss.get_string("rss.selectfirst"));
    }
    else
    {
      hbox = obj.parentNode.cloneNode(true);
      obj.parentNode.parentNode.appendChild(hbox);
      hbox.childNodes[0].setAttribute("checked", "true");
      hbox.childNodes[2].childNodes[0].childNodes[1].value = ""; //text
      changeStatusFilter1(hbox, "false");
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
  return hbox;
}

//-----------------------------------------------------------------------------------------------------
/* exported removeFilter */
function removeFilter(obj)
{
  try
  {
    if (currentRSS == null)
    {
      inforss.alert(inforss.get_string("rss.selectfirst"));
    }
    else
    {
      if (obj.parentNode.parentNode.childNodes.length == 4)
      {
        inforss.alert(inforss.get_string("remove.last"));
      }
      else
      {
        obj.parentNode.parentNode.removeChild(obj.parentNode);
      }
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
/* exported changeStatusFilter */
function changeStatusFilter(button)
{
  var hbox = button.parentNode;
  var status = (button.getAttribute("checked") == "true") ? "true" : "false";
  changeStatusFilter1(hbox, status);
}

//-----------------------------------------------------------------------------------------------------
function changeStatusFilter1(hbox, status)
{
  hbox.childNodes[1].setAttribute("disabled", status); //type
  hbox.childNodes[2].setAttribute("disabled", status); //deck
  hbox.childNodes[2].childNodes[0].childNodes[0].setAttribute("disabled", status); //include/exclude
  if (status == "true")
  {
    hbox.childNodes[2].childNodes[0].childNodes[1].setAttribute("disabled", status); //text
  }
  else
  {
    hbox.childNodes[2].childNodes[0].childNodes[1].removeAttribute("disabled");
  }
  hbox.childNodes[2].childNodes[1].childNodes[0].setAttribute("disabled", status); //more/less
  hbox.childNodes[2].childNodes[1].childNodes[1].setAttribute("disabled", status); //1-100
  hbox.childNodes[2].childNodes[1].childNodes[2].setAttribute("disabled", status); //sec, min,...
  hbox.childNodes[2].childNodes[2].childNodes[0].setAttribute("disabled", status); //more/less
  hbox.childNodes[2].childNodes[2].childNodes[1].setAttribute("disabled", status); //1-50
}

//-----------------------------------------------------------------------------------------------------
function closeOptionDialog()
{
  inforss.traceIn();
  document.getElementById("inforssOption").cancelDialog();
  inforss.traceOut();
}

//-----------------------------------------------------------------------------------------------------
//FIXME it is not at all clear where this gets used from.
//Reference at line 438 in inforssParseHtml via window.opener.
/* exported setHtmlFeed*/
function setHtmlFeed(url, regexp, headline, article, pubdate, link, category, startafter, stopbefore, direction, encoding, htmlTest)
{
  inforss.traceIn();
  try
  {
    currentRSS.setAttribute("url", url);
    currentRSS.setAttribute("regexp", regexp);
    currentRSS.setAttribute("regexpTitle", headline);
    currentRSS.setAttribute("regexpDescription", article);
    currentRSS.setAttribute("regexpPubDate", pubdate);
    currentRSS.setAttribute("regexpLink", link);
    currentRSS.setAttribute("regexpCategory", category);
    currentRSS.setAttribute("regexpStartAfter", startafter);
    currentRSS.setAttribute("regexpStopBefore", stopbefore);
    currentRSS.setAttribute("htmlDirection", direction);
    currentRSS.setAttribute("encoding", encoding);
    currentRSS.setAttribute("htmlTest", htmlTest);
    document.getElementById('optionUrl').value = url;
  }
  catch (e)
  {
    inforss.debug(e);
  }
  inforss.traceOut();
}

//-----------------------------------------------------------------------------------------------------
/* exported resetIcon */
function resetIcon()
{
  inforss.traceIn();
  try
  {
    if (currentRSS != null)
    {
      document.getElementById('iconurl').value = inforssFindIcon(currentRSS);
      document.getElementById('inforss.rss.icon').src = document.getElementById('iconurl').value;
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
  inforss.traceOut();
}

//-----------------------------------------------------------------------------------------------------
/* exported resetIconGroup */
function resetIconGroup()
{
  inforss.traceIn();
  try
  {
    if (currentRSS != null)
    {
      const icon = inforssXMLRepository.feeds_default_group_icon;
      document.getElementById('iconurlgroup').value = icon;
      document.getElementById('inforss.group.icon').src = icon;
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
  inforss.traceOut();
}

//-----------------------------------------------------------------------------------------------------
/* exported resetDefaultIconGroup */
function resetDefaultIconGroup()
{
  inforss.traceIn();
  try
  {
    document.getElementById('defaultGroupIcon').value = INFORSS_DEFAULT_GROUP_ICON;
    document.getElementById('inforss.defaultgroup.icon').src = document.getElementById('defaultGroupIcon').value;
  }
  catch (e)
  {
    inforss.debug(e);
  }
  inforss.traceOut();
}

//-----------------------------------------------------------------------------------------------------
/* exported setIcon */
function setIcon()
{
  inforss.traceIn();
  try
  {
    document.getElementById('inforss.rss.icon').src = document.getElementById('iconurl').value;
  }
  catch (e)
  {
    inforss.debug(e);
  }
  inforss.traceOut();
}

//------------------------------------------------------------------------------
//This updates the small window for about 10 seconds
function updateCanvas()
{
  inforss.traceIn();
  try
  {
    var canvas = document.getElementById("inforss.canvas");
    var ctx = canvas.getContext("2d");
    var br = document.getElementById("inforss.canvas.browser");
    ctx.drawWindow(br.contentWindow, 0, 0, 800, 600, "rgb(255,255,255)");
    refreshCount++;
    if (refreshCount != 5)
    {
      window.setTimeout(updateCanvas, 2000);
    }
    else
    {
      refreshCount = 0;
    }

  }
  catch (e)
  {
    inforss.debug(e);
  }
  inforss.traceOut();
}

//-----------------------------------------------------------------------------------------------------
/* exported canvasOver */
function canvasOver(event)
{
  inforss.traceIn();
  try
  {
    const canvas1 = document.getElementById("inforss.canvas");
    const canvas = document.getElementById("inforss.magnify.canvas");
    const newx = Math.min(
                  event.clientX - canvas1.offsetLeft + 12,
                  parseInt(canvas1.style.width, 10) - canvas.width - 2);
    const newy = Math.min(
                  event.clientY - canvas1.offsetTop + 18,
                  parseInt(canvas1.style.height, 10) - canvas.height - 5);

    document.getElementById("inforss.magnify").setAttribute("left", newx + "px");
    document.getElementById("inforss.magnify").setAttribute("top", newy + "px");
    document.getElementById("inforss.magnify").style.left = newx + "px";
    document.getElementById("inforss.magnify").style.top = newy + "px";

    const ctx = canvas.getContext("2d");
    const br = document.getElementById("inforss.canvas.browser");
    ctx.drawWindow(br.contentWindow, 0, 0, 800, 600, "rgb(255,255,255)");
    document.getElementById("inforss.magnify").style.visibility = "visible";
  }
  catch (e)
  {
    inforss.debug(e);
  }
  inforss.traceOut();
}

//-----------------------------------------------------------------------------------------------------
/* exported canvasMove */
function canvasMove(event)
{
  inforss.traceIn();
  try
  {
    const canvas = document.getElementById("inforss.magnify.canvas");
    const canvas1 = document.getElementById("inforss.canvas");
    const newx1 = event.clientX - canvas1.offsetLeft;
    const newx = Math.min(
                  newx1 + 12,
                  parseInt(canvas1.style.width, 10) - canvas.width - 2);

    const newy1 = event.clientY - canvas1.offsetTop;
    const newy = Math.min(
                  newy1 + 18,
                  parseInt(canvas1.style.height, 10) - canvas.height - 5);

    const ctx = canvas.getContext("2d");
    document.getElementById("inforss.magnify").setAttribute("left", newx + "px");
    document.getElementById("inforss.magnify").setAttribute("top", newy + "px");
    document.getElementById("inforss.magnify").style.left = newx + "px";
    document.getElementById("inforss.magnify").style.top = newy + "px";
    ctx.save();
    ctx.translate(-((newx1 * 4.5) - 15), -((newy1 * 5.0) - 15));
    const br = document.getElementById("inforss.canvas.browser");
    ctx.drawWindow(br.contentWindow, 0, 0, 800, 600, "rgb(255,255,255)");
    ctx.restore();
  }
  catch (e)
  {
    inforss.debug(e);
  }
  inforss.traceOut();
}

//-----------------------------------------------------------------------------------------------------
/* exported canvasOut */
function canvasOut()
{
  inforss.traceIn();
  try
  {
    document.getElementById("inforss.magnify").style.visibility = "hidden";
  }
  catch (e)
  {
    inforss.debug(e);
  }
  inforss.traceOut();
}

//-----------------------------------------------------------------------------------------------------
/* exported setIconGroup */
function setIconGroup()
{
  inforss.traceIn();
  try
  {
    document.getElementById('inforss.group.icon').src = document.getElementById('iconurlgroup').value;
  }
  catch (e)
  {
    inforss.debug(e);
  }
  inforss.traceOut();
}

//-----------------------------------------------------------------------------------------------------
/* exported setDefaultIconGroup */
function setDefaultIconGroup()
{
  inforss.traceIn();
  try
  {
    document.getElementById('inforss.defaultgroup.icon').src = document.getElementById('defaultGroupIcon').value;
  }
  catch (e)
  {
    inforss.debug(e);
  }
  inforss.traceOut();
}

//-----------------------------------------------------------------------------------------------------
/* exported copyLocalToRemote */
function copyLocalToRemote()
{
  inforss.traceIn();
  try
  {
    if (checkServerInfoValue())
    {
      var protocol = document.getElementById('inforss.repo.urltype').value;
      var server = document.getElementById('ftpServer').value;
      var directory = document.getElementById('repoDirectory').value;
      var user = document.getElementById('repoLogin').value;
      var password = document.getElementById('repoPassword').value;
      setImportProgressionBar(20);
      window.setTimeout(inforssCopyLocalToRemote, 100, protocol, server, directory, user, password, ftpUploadCallback, true);
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
  inforss.traceOut();
}

//-----------------------------------------------------------------------------------------------------
/* exported copyRemoteToLocal */
function copyRemoteToLocal()
{
  inforss.traceIn();
  try
  {
    if (checkServerInfoValue())
    {
      var protocol = document.getElementById('inforss.repo.urltype').value;
      var server = document.getElementById('ftpServer').value;
      var directory = document.getElementById('repoDirectory').value;
      var user = document.getElementById('repoLogin').value;
      var password = document.getElementById('repoPassword').value;
      setImportProgressionBar(10);
      window.setTimeout(inforssCopyRemoteToLocal, 100, protocol, server, directory, user, password, ftpDownloadCallback);
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
  inforss.traceOut();
}

//-----------------------------------------------------------------------------------------------------
function checkServerInfoValue()
{
  inforss.traceIn();
  var returnValue = true;
  try
  {
    if ((document.getElementById('ftpServer').value == null) ||
      (document.getElementById('ftpServer').value == "") ||
      (document.getElementById('repoDirectory').value == null) ||
      (document.getElementById('repoDirectory').value == "") ||
      (document.getElementById('repoLogin').value == null) ||
      (document.getElementById('repoLogin').value == "") ||
      (document.getElementById('repoPassword').value == null) ||
      (document.getElementById('repoPassword').value == ""))
    {
      returnValue = false;
      inforss.alert(inforss.get_string("serverinfo.mandatory"));
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
  inforss.traceOut();
  return returnValue;
}

//-----------------------------------------------------------------------------------------------------
function ftpUploadCallback(step/*, status*/)
{
  inforss.traceIn();
  try
  {
    if (step == "send")
    {
      defineVisibilityButton("true", "upload");
    }
    else
    {
      setImportProgressionBar(100);
      defineVisibilityButton("false", "upload");
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
  inforss.traceOut();
}

//-----------------------------------------------------------------------------------------------------
function ftpDownloadCallback(step/*, status*/)
{
  inforss.traceIn();
  try
  {
    if (step == "send")
    {
      defineVisibilityButton("true", "download");
    }
    else
    {
      setImportProgressionBar(80);
      defineVisibilityButton("false", "download");
      redisplay_configuration();
      ObserverService.notifyObservers(null, "reload_headline_cache", null);
      setImportProgressionBar(100);
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
  inforss.traceOut();
}

//-----------------------------------------------------------------------------------------------------
function defineVisibilityButton(flag, action)
{
  inforss.traceIn();
  try
  {
    var accept = document.getElementById('inforssOption').getButton("accept");
    accept.setAttribute("disabled", flag);
    var apply = document.getElementById('inforss.apply');
    apply.setAttribute("disabled", flag);
    if (action == "download")
    {
      document.getElementById("inforss.deck.importfromremote").selectedIndex = (flag == "true") ? 1 : 0;
    }
    else
    {
      document.getElementById("inforss.deck.exporttoremote").selectedIndex = (flag == "true") ? 1 : 0;
    }
    setImportProgressionBar(0);
  }
  catch (e)
  {
    inforss.debug(e);
  }
  inforss.traceOut();
}

//-----------------------------------------------------------------------------------------------------
function setImportProgressionBar(value)
{
  inforss.traceIn();
  try
  {
    if (document.getElementById("inforss.repo.synchronize.importfromremote.importProgressBar") != null)
    {
      document.getElementById("inforss.repo.synchronize.importfromremote.importProgressBar").value = value;
    }
    if (document.getElementById("inforss.repo.synchronize.exporttoremote.exportProgressBar") != null)
    {
      document.getElementById("inforss.repo.synchronize.exporttoremote.exportProgressBar").value = value;
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
  inforss.traceOut();
}

//-----------------------------------------------------------------------------------------------------
/* exported purgeNow */
function purgeNow()
{
  inforss.traceIn();
  try
  {
    ObserverService.notifyObservers(null, "purge_headline_cache", null);
  }
  catch (e)
  {
    inforss.debug(e);
  }
  inforss.traceOut();
}

//-----------------------------------------------------------------------------------------------------
/* exported openURL */
//FIXME There are three slightly different versions of this
function openURL(url)
{
  if (navigator.vendor == "Thunderbird")
  {
    window.openDialog("chrome://inforss/content/inforssBrowser.xul", "_blank", "chrome,centerscreen,resizable=yes, dialog=no", url);
  }
  else
  {
    if (window.opener.getBrowser)
    {
      if (testCreateTab())
      {
        var newTab = window.opener.getBrowser().addTab(url);
        window.opener.getBrowser().selectedTab = newTab;
      }
      else
      {
        window.opener.getBrowser().loadURI(url);
      }
    }
    else
    {
      window.opener.open(url);
    }
  }
}

//-----------------------------------------------------------------------------------------------------
function testCreateTab()
{
  var returnValue = true;
  if (window.opener.getBrowser().browsers.length == 1)
  {
    if ((window.opener.getBrowser().currentURI == null) ||
      ((window.opener.getBrowser().currentURI.spec == "") && (window.opener.getBrowser().selectedBrowser.webProgress.isLoadingDocument)) ||
      (window.opener.getBrowser().currentURI.spec == "about:blank"))
    {
      returnValue = false;
    }
  }
  return returnValue;
}

//-----------------------------------------------------------------------------------------------------
/* exported locateExportEnclosure */
function locateExportEnclosure(suf1, suf2)
{
  var dirPath = null;
  try
  {
    var dirPicker = Components.classes["@mozilla.org/filepicker;1"].createInstance(Components.interfaces.nsIFilePicker);
    dirPicker.init(window, inforss.get_string("podcast.location"), dirPicker.modeGetFolder);

    var response = dirPicker.show();
    if ((response == dirPicker.returnOK) || (response == dirPicker.returnReplace))
    {
      dirPath = dirPicker.file.path;
      document.getElementById("savePodcastLocation" + suf2).value = dirPath;
      document.getElementById("savePodcastLocation" + suf1).selectedIndex = 0;
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
/* exported viewAllViewSelected */
function viewAllViewSelected(flag)
{
  try
  {
    var listbox = document.getElementById("group-list-rss");
    var listitem = null;
    var checkbox = null;
    for (var i = 1; i < listbox.childNodes.length; i++)
    {
      listitem = listbox.childNodes[i];
      if (flag)
      {
        listitem.setAttribute("collapsed", "false");
      }
      else
      {
        checkbox = listitem.childNodes[0];
        if (checkbox.getAttribute("checked") == "true")
        {
          listitem.setAttribute("collapsed", "false");
        }
        else
        {
          listitem.setAttribute("collapsed", "true");
        }
      }
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
/* exported addToPlayList */
function addToPlayList()
{
  try
  {
    var listbox = document.getElementById("group-list-rss");
    if (listbox.selectedItem != null)
    {
      if (listbox.selectedItem.childNodes[0].getAttribute("checked") == "false")
      {
        listbox.selectedItem.childNodes[0].setAttribute("checked", "true");
      }
      addToPlayList1("5",
        listbox.selectedItem.childNodes[1].getAttribute("image"),
        listbox.selectedItem.childNodes[1].getAttribute("label"),
        listbox.selectedItem.childNodes[1].getAttribute("url"));
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function addToPlayList1(value, image, label, url)
{
  try
  {
    var richlistitem = document.createElement("richlistitem");
    var hbox = document.createElement("hbox");
    var input = document.createElement("textbox");
    input.setAttribute("value", value);
    input.style.maxWidth = "30px";
    hbox.appendChild(input);
    var vbox = document.createElement("vbox");
    var spacer = document.createElement("spacer");
    spacer.setAttribute("flex", "1");
    vbox.appendChild(spacer);
    var image1 = document.createElement("image");
    image1.setAttribute("src", image);
    image1.style.maxWidth = "16px";
    image1.style.maxHeight = "16px";
    vbox.appendChild(image1);
    spacer = document.createElement("spacer");
    spacer.setAttribute("flex", "1");
    vbox.appendChild(spacer);
    hbox.appendChild(vbox);

    vbox = document.createElement("vbox");
    spacer = document.createElement("spacer");
    spacer.setAttribute("flex", "1");
    vbox.appendChild(spacer);
    var label1 = document.createElement("label");
    label1.setAttribute("value", label);
    vbox.appendChild(label1);
    spacer = document.createElement("spacer");
    spacer.setAttribute("flex", "1");
    vbox.appendChild(spacer);
    hbox.appendChild(vbox);
    richlistitem.appendChild(hbox);
    richlistitem.setAttribute("value", value);
    richlistitem.setAttribute("label", label);
    richlistitem.setAttribute("url", url);

    document.getElementById("group-playlist").appendChild(richlistitem);
  }
  catch (e)
  {
    inforss.debug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
/* exported removeFromPlayList */
function removeFromPlayList()
{
  try
  {
    var listbox = document.getElementById("group-playlist");
    if (listbox.selectedItem != null)
    {
      listbox.removeChild(listbox.selectedItem);
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
/* exported moveUpInPlayList */
function moveUpInPlayList()
{
  try
  {
    var listbox = document.getElementById("group-playlist");
    var richListitem = listbox.selectedItem;
    if ((richListitem != null) && (richListitem.previousSibling != null))
    {
      var oldValue = richListitem.childNodes[0].childNodes[0].value;
      var previous = richListitem.previousSibling;
      listbox.removeChild(listbox.selectedItem);
      listbox.insertBefore(richListitem, previous);
      richListitem.childNodes[0].childNodes[0].setAttribute("value", oldValue);
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
/* exported moveDownInPlayList */
function moveDownInPlayList()
{
  try
  {
    var listbox = document.getElementById("group-playlist");
    var richListitem = listbox.selectedItem;
    if ((richListitem != null) && (richListitem.nextSibling != null))
    {
      var oldValue = richListitem.childNodes[0].childNodes[0].value;
      var next = richListitem.nextSibling.nextSibling;
      listbox.removeChild(listbox.selectedItem);
      if (next != null)
      {
        listbox.insertBefore(richListitem, next);
      }
      else
      {
        listbox.appendChild(richListitem);
      }
      richListitem.childNodes[0].childNodes[0].setAttribute("value", oldValue);
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
/* exported locateRepository */
function locateRepository()
{
  try
  {
    var dir = inforss.get_profile_dir();
    //var localFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
    //localFile.initWithPath(dir.path);
    const localFile = new LocalFile(dir.path);
    var filePicker = Components.classes["@mozilla.org/filepicker;1"].createInstance(Components.interfaces.nsIFilePicker);
    filePicker.appendFilters(Components.interfaces.nsIFilePicker.filterXML);
    filePicker.appendFilter("", "*.rdf");
    filePicker.init(window, "", Components.interfaces.nsIFilePicker.modeOpen);
    filePicker.displayDirectory = localFile;
    filePicker.defaultString = null;
    filePicker.appendFilters(filePicker.filterAll);

    /*var response =*/
    filePicker.show();
  }
  catch (e)
  {
    inforss.debug(e);
  }
}
