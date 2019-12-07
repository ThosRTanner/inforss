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
 *   Tom Tanner
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

/*jshint browser: true, devel: true */
/*eslint-env browser */

var inforss = inforss || {};

Components.utils.import("chrome://inforss/content/modules/inforss_Backup.jsm",
                        inforss);

Components.utils.import("chrome://inforss/content/modules/inforss_Config.jsm",
                        inforss);

Components.utils.import("chrome://inforss/content/modules/inforss_Debug.jsm",
                        inforss);

Components.utils.import(
  "chrome://inforss/content/modules/inforss_Feed_Page.jsm",
  inforss
);

Components.utils.import("chrome://inforss/content/modules/inforss_Prompt.jsm",
                        inforss);

Components.utils.import("chrome://inforss/content/modules/inforss_Utils.jsm",
                        inforss);

Components.utils.import("chrome://inforss/content/modules/inforss_Version.jsm",
                        inforss);

inforss.mediator = {};
Components.utils.import(
  "chrome://inforss/content/mediator/inforss_Mediator_API.jsm",
  inforss.mediator
);

Components.utils.import(
  "chrome://inforss/content/modules/inforss_NNTP_Handler.jsm",
  inforss
);

Components.utils.import(
  "chrome://inforss/content/windows/inforss_Capture_New_Feed_Dialogue.jsm",
  inforss
);

Components.utils.import(
  "chrome://inforss/content/windows/inforss_Parse_HTML_Dialogue.jsm",
  inforss
);

Components.utils.import(
  "chrome://inforss/content/windows/Options/inforss_Options_Credits.jsm",
  inforss
);

Components.utils.import(
  "chrome://inforss/content/windows/Options/inforss_Options_Help.jsm",
  inforss
);

//From inforssOptionBasic */
/* globals add_feed_to_group_list */

//From inforssOptionAdvanced */
/* globals populate_advanced_tab, update_advanced_tab, add_feed_to_apply_list */
/* globals Advanced__Report__populate, get_feed_info */

/* exported LocalFile */
const LocalFile = Components.Constructor("@mozilla.org/file/local;1",
                                         "nsILocalFile",
                                         "initWithPath");

/* exported inforssXMLRepository */
var inforssXMLRepository = new inforss.Config();
Object.preventExtensions(inforssXMLRepository);

var gRssXmlHttpRequest = null;

//Fixme do we actually need this as it is always the number of items in the
//feed list.
var gNbRss = 0;

var gOldRssIndex = 0;
var gRemovedUrls = [];

//Shared with inforssOptionAdvanced
/* exported theCurrentFeed, gInforssNbFeed, gInforssMediator, currentRSS */
var currentRSS = null; //And inforssOptionBasic
var theCurrentFeed = null;
//FIXME Number of feeds. Get it from repository
var gInforssNbFeed = 0;
var gInforssMediator = null;

var applyScale = false;
var refreshCount = 0;

const options_tabs = [];

//FIXME By rights this is part of the configuration vvv
const INFORSS_DEFAULT_GROUP_ICON = "chrome://inforss/skin/group.png";

const WindowMediator = Components.classes[
  "@mozilla.org/appshell/window-mediator;1"].getService(
  Components.interfaces.nsIWindowMediator);

//I seriously don't think I should need this and it's a bug in palemoon 28
//See Issue #192
/* exported inforssPriv_XMLHttpRequest */
const inforssPriv_XMLHttpRequest = Components.Constructor(
  "@mozilla.org/xmlextras/xmlhttprequest;1",
  "nsIXMLHttpRequest");

//------------------------------------------------------------------------------
/* exported init */
function init()
{
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

    for (const font of FontService.EnumerateAllFonts({ value: null }))
    {
      const element = font_menu.appendItem(font, font);
      element.style.fontFamily = font;
    }

    /* globals inforss_Options_Credits, inforss_Options_Help */
    /* eslint-disable new-cap */
    options_tabs.push(new inforss_Options_Basic(document, inforssXMLRepository));
    options_tabs.push(new inforss.Credits(document, inforssXMLRepository));
    options_tabs.push(new inforss.Help(document, inforssXMLRepository));
    /* eslint-enable new-cap */

    load_and_display_configuration();
  }
  catch (err)
  {
    inforss.debug(err);
  }
}

function load_and_display_configuration()
{
  inforssXMLRepository.read_configuration();
/**/console.log(options_tabs)
  for (const tab of options_tabs)
  {
    tab.config_loaded();
  }
  redisplay_configuration();
}

//------------------------------------------------------------------------------
/* exports redisplay_configuration */
function redisplay_configuration()
{

  try
  {
    //FIXME Really? Why don't we get the selected feed from the config?
    theCurrentFeed = gInforssMediator.get_selected_feed();

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
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
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
      inforss.mediator.remove_feeds(gRemovedUrls);
      gRemovedUrls = [];
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
/* exported dispose */
function dispose()
{
  for (const tab of options_tabs)
  {
    tab.dispose();
  }
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

    update_advanced_tab();

    for (const tab of options_tabs)
    {
  /**/console.log(tab)
      tab.update();
    }

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
          for (const listitem of
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
            for (const item of
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
      let hbox = vbox.childNodes[0]; // first filter
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
    for (const group of inforssXMLRepository.get_groups())
    {
      for (const feed of group.getElementsByTagName("GROUP"))
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
      //FIXME These null tests are insane
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
        var child = vbox.childNodes[0]; // first filter
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
      if (document.getElementById('repoAutoSync').selectedIndex == 0 &&
          ! checkServerInfoValue())
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
          if (! returnValue)
          {
            inforss.alert(inforss.get_string("podcast.location.notfound"));
          }
        }
        if (! returnValue)
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
          if (! returnValue)
          {
            inforss.alert(inforss.get_string("podcast.location.notfound"));
          }
        }
        if (! returnValue)
        {
          document.getElementById('inforss.option.tab').selectedIndex = 0;
          document.getElementById('inforss.listbox1').selectedIndex = 0;
          document.getElementById('inforssTabpanelsBasic').selectedIndex = 3;
          document.getElementById('inforss.gefise').selectedIndex = 2;
        }
      }
    }

    for (const tab of options_tabs)
    {
      if (! tab.validate())
      {
        return false;
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
/* exported newGroup */
function newGroup()
{
  try
  {
    const name = inforss.prompt("group.newgroup", "");
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
        gNbRss += 1;
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
    document.getElementById("inforss.new.feed").disabled = true;
    const capture_dialogue = new inforss.Capture_New_Feed_Dialogue(window);
    document.getElementById("inforss.new.feed").disabled = false;

    const returnValue = capture_dialogue.results();

    if (! returnValue.valid)
    {
      return;
    }

    const type = returnValue.type;
    switch (type)
    {
      default:
        throw new Error("Unexpected feed type " + type);

      case "rss":
        {
          const url = returnValue.url;

          if (nameAlreadyExists(url))
          {
            inforss.alert(inforss.get_string("rss.alreadyexists"));
            return;
          }

          if (gRssXmlHttpRequest != null)
          {
            gRssXmlHttpRequest.abort();
          }

          const user = returnValue.user;
          const password = returnValue.password;
          gRssXmlHttpRequest = new inforss.Feed_Page(
            url,
            { user, password, fetch_icon: true }
          );
          document.getElementById("inforss.new.feed").disabled = true;
          gRssXmlHttpRequest.fetch().then(
            () => processRss(gRssXmlHttpRequest)
          ).catch(
            err =>
            {
              /**/console.log(err)
              rssTimeout();
            }
          ).then(
            () =>
            {
              gRssXmlHttpRequest = null;
              document.getElementById("inforss.new.feed").disabled = false;
            }
          );
        }
        break;

      case "html":
        {
          var url = returnValue.url;
          if (nameAlreadyExists(url))
          {
            inforss.alert(inforss.get_string("rss.alreadyexists"));
            return;
          }

          if (gRssXmlHttpRequest != null)
          {
            gRssXmlHttpRequest.abort();
          }

          var title = returnValue.title;
          var user = returnValue.user;
          var password = returnValue.password;

          gRssXmlHttpRequest = new inforssPriv_XMLHttpRequest();
          gRssXmlHttpRequest.open("GET", url, true, user, password);
          //FIXME This should NOT set fields in the request object
          gRssXmlHttpRequest.url = url;
          gRssXmlHttpRequest.user = user;
          gRssXmlHttpRequest.title = title;
          gRssXmlHttpRequest.password = password;
          gRssXmlHttpRequest.timeout = 10000;
          gRssXmlHttpRequest.ontimeout = rssTimeout;
          gRssXmlHttpRequest.onerror = rssTimeout;
          document.getElementById("inforss.new.feed").disabled = true;
          gRssXmlHttpRequest.feedType = type;
          gRssXmlHttpRequest.onload = processHtml;
          gRssXmlHttpRequest.send();
        }
        break;

      case "nntp":
        if (nameAlreadyExists(returnValue.url))
        {
          inforss.alert(inforss.get_string("nntp.alreadyexists"));
          return;
        }
        newNntp(returnValue);
        break;
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
    const nntp = new inforss.NNTP_Handler(type.url, type.user, type.password);
    document.getElementById("inforss.new.feed").disabled = true;
    nntp.open().then(
      () => createNntpFeed(type, nntp.host, nntp.group)
    ).catch(
      //This blocks which is not ideal.
      status => inforss.alert(inforss.get_string(status))
    ).then(
      () =>
      {
        document.getElementById("inforss.new.feed").disabled = false;
        nntp.close();
      }
    );
  }
  catch (e)
  {
    inforss.alert(inforss.get_string("nntp.malformedurl"));
    console.log(e);
  }
}

function createNntpFeed(type, url, group)
{
  try
  {
    const domain = url.substring(url.indexOf("."));
    const rss = inforssXMLRepository.add_item(
      type.title,
      group,
      type.url,
      "http://www" + domain,
      type.user,
      type.password,
      "nntp");
    rss.setAttribute("icon", "chrome://inforss/skin/nntp.png");

    //FIXME Repeated in processRss and processHTML almost identical
    const element = document.getElementById("rss-select-menu").appendItem(group, "nntp");
    element.setAttribute("class", "menuitem-iconic");
    element.setAttribute("image", rss.getAttribute("icon"));
    element.setAttribute("url", type.url);
    document.getElementById("rss-select-menu").selectedIndex = gNbRss;
    gNbRss += 1;
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
/* exported selectRSS */
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

/** This updates the displayed group list, taking into account the view all/
    view selected state
 *
 * @param {boolean} view_all - If set, use this value.
                               If unset, get from dom
 */
function update_visible_group_list(
  {
    view_all = null,
    update = null
  } = {})
{
  if (view_all == null)
  {
    view_all =
      document.getElementById("viewAllViewSelected").selectedIndex == 0;
  }
  //The first item in the collection is a listcol. We don't want to fiddle
  //with that.
  let item = document.getElementById("group-list-rss").firstChild.nextSibling;
  while (item != null)
  {
    if (update != null)
    {
      item.childNodes[0].setAttribute("checked", update(item));
    }
    item.hidden = ! (view_all ||
                     item.childNodes[0].getAttribute("checked") == "true");
    //browser issue - need to redisplay if we've unhidden
    item.parentNode.insertBefore(item, item.nextSibling);
    item = item.nextSibling;
  }
}

//-----------------------------------------------------------------------------------------------------
function setGroupCheckBox(rss)
{
  const groups = Array.from(rss.getElementsByTagName("GROUP"));
  update_visible_group_list({
    update: item =>
    {
      const url = item.childNodes[1].getAttribute("url");
      return groups.find(elem => elem.getAttribute("url") == url) !== undefined;
    }
  });
}

//-----------------------------------------------------------------------------------------------------
/* exported checkAll */
function checkAll(obj)
{
  try
  {
    const flag = obj.getAttribute("checked") != "true";
    update_visible_group_list({ update: () => flag });
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
    request = new inforss.Feed_Page(
      url,
      { user }
    );
    request.fetch().then(
      () => initListCategories(request.categories)
    ).catch(
      err =>
      {
        /**/console.log("Category fetch error", err)
      }
    ).then(
      () =>
      {
        request = null;
      }
    );
  };
})();

/* exported selectRSS1 */
function selectRSS1(url, user)
{
  try
  {
    document.getElementById("inforss.previous.rss").disabled = true;
    document.getElementById("inforss.next.rss").disabled = true;
    document.getElementById("inforss.new.feed").disabled = true;

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
        var filterCaseSensitive = rss.getAttribute("filterCaseSensitive");
        document.getElementById("filterCaseSensitive").selectedIndex = (filterCaseSensitive == "true") ? 0 : 1;
        var playlist = rss.getAttribute("playlist");
        document.getElementById("playlistoption").selectedIndex = (playlist == "true") ? 0 : 1;
        inforss.replace_without_children(document.getElementById("group-playlist"));
        if (playlist == "true")
        {
          document.getElementById('playListTabPanel').setAttribute("collapsed", "false");
          const playLists = rss.getElementsByTagName("playLists")[0].childNodes;
          for (const playList of playLists)
          {
            const rss1 = inforssXMLRepository.get_item_from_url(
              playList.getAttribute("url"));
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
        const originalFeed = gInforssMediator.find_feed(url);
        if (originalFeed !== undefined)
        {
          document.getElementById("inforss.group.treecell1").parentNode.setAttribute("url", rss.getAttribute("url"));
          document.getElementById("inforss.group.treecell1").setAttribute("properties", (rss.getAttribute("activity") == "true") ? "on" : "off");
          document.getElementById("inforss.group.treecell2").setAttribute("properties", (originalFeed.active) ? "active" : "inactive");
          document.getElementById("inforss.group.treecell3").setAttribute("label", originalFeed.num_headlines);
          document.getElementById("inforss.group.treecell4").setAttribute("label", originalFeed.num_unread_headlines);
          document.getElementById("inforss.group.treecell5").setAttribute("label", originalFeed.num_new_headlines);
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
          row.value -= 1;
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
  var hbox = vbox.childNodes[0].nextSibling; // second filter
  while (hbox != null)
  {
    var next = hbox.nextSibling;
    hbox.parentNode.removeChild(hbox);
    hbox = next;
  }
  hbox = vbox.childNodes[0]; // first filter
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
    const dialog = new inforss.Parse_HTML_Dialogue(
      window,
      {
        url: currentRSS.getAttribute("url"),
        user: currentRSS.getAttribute("user"),
        regexp: currentRSS.getAttribute("regexp"),
        regexpTitle: currentRSS.getAttribute("regexpTitle"),
        regexpDescription: currentRSS.getAttribute("regexpDescription"),
        regexpPubDate: currentRSS.getAttribute("regexpPubDate"),
        regexpLink: currentRSS.getAttribute("regexpLink"),
        regexpCategory: currentRSS.getAttribute("regexpCategory"),
        regexpStartAfter: currentRSS.getAttribute("regexpStartAfter"),
        regexpStopBefore: currentRSS.getAttribute("regexpStopBefore"),
        htmlDirection: currentRSS.getAttribute("htmlDirection"),
        encoding: currentRSS.getAttribute("encoding")
      }
    );
    const results = dialog.results();
    if (results.valid)
    {
      currentRSS.setAttribute("regexp", results.regexp);
      currentRSS.setAttribute("regexpTitle", results.regexpTitle);
      currentRSS.setAttribute("regexpDescription", results.regexpDescription);
      currentRSS.setAttribute("regexpPubDate", results.regexpPubDate);
      currentRSS.setAttribute("regexpLink", results.regexpLink);
      currentRSS.setAttribute("regexpCategory", results.regexpCategory);
      currentRSS.setAttribute("regexpStartAfter", results.regexpStartAfter);
      currentRSS.setAttribute("regexpStopBefore", results.regexpStopBefore);
      currentRSS.setAttribute("htmlDirection", results.htmlDirection);
      currentRSS.setAttribute("encoding", results.encoding);
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function processRss(request)
{
  try
  {
    const rss = inforssXMLRepository.add_item(
      request.title,
      request.description,
      request.url,
      request.link,
      request.user,
      request.password,
      request.type,
      request.icon);

    var element = document.getElementById("rss-select-menu").appendItem(request.title, "newrss");
    element.setAttribute("class", "menuitem-iconic");
    element.setAttribute("image", rss.getAttribute("icon"));
    element.setAttribute("url", request.url);
    document.getElementById("rss-select-menu").selectedIndex = gNbRss;
    gNbRss += 1;
    //FIXME Shouldn't this add it to the menu as well?
    add_feed_to_pick_lists(rss);
    selectRSS(element);
    document.getElementById("inforss.new.feed").disabled = false;


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
    if (gRssXmlHttpRequest.status != 200)
    {
      inforss.alert(inforss.get_string("feed.issue"));
      return;
    }

    const dialogue = new inforss.Parse_HTML_Dialogue(
      window,
      {
        url: gRssXmlHttpRequest.url,
        user: gRssXmlHttpRequest.user,
        password: gRssXmlHttpRequest.password
      }
    );
    const result = dialogue.results();
    if (! result.valid)
    {
      return;
    }

    var rss = inforssXMLRepository.add_item(
      gRssXmlHttpRequest.title,
      null, //description
      gRssXmlHttpRequest.url,
      null, //link
      gRssXmlHttpRequest.user,
      gRssXmlHttpRequest.password,
      "html");

    rss.setAttribute("icon", inforssFindIcon(rss));
    for (const attr in result)
    {
      if (attr != "valid")
      {
        rss.setAttribute(attr, result[attr]);
      }
    }

    const element = document.getElementById("rss-select-menu").appendItem(gRssXmlHttpRequest.title, "newrss");
    element.setAttribute("class", "menuitem-iconic");
    element.setAttribute("image", rss.getAttribute("icon"));
    element.setAttribute("url", gRssXmlHttpRequest.url);
    document.getElementById("rss-select-menu").selectedIndex = gNbRss;
    gNbRss += 1;
    gRssXmlHttpRequest = null;
    add_feed_to_pick_lists(rss);
    selectRSS(element);

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
  finally
  {
    document.getElementById("inforss.new.feed").disabled = false;
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
    const hbox = vbox.childNodes[0]; // first filter
    const menu = hbox.childNodes[2].childNodes[0].childNodes[1]; //text

    inforss.replace_without_children(menu.firstChild);

    for (const category of categories)
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
      //FIXME Belongs in 'filter' panel code
      const vbox = document.getElementById("inforss.filter.vbox");

      for (const filter of currentRSS.getElementsByTagName("FILTER"))
      {
        const hbox = vbox.lastElementChild;

        const type = hbox.childNodes[1];
        type.selectedIndex = filter.getAttribute("type");

        const deck = hbox.childNodes[2];
        deck.selectedIndex =
          type.selectedIndex <= 2 ? 0 :
            type.selectedIndex <= 5 ? 1 :
              2;

        //headline, body, category filter
        const by_text = deck.childNodes[0];
        by_text.childNodes[0].selectedIndex = filter.getAttribute("include");
        by_text.childNodes[1].value = filter.getAttribute("text");

        //published date, received date, read date
        const by_time = deck.childNodes[1];
        by_time.childNodes[0].selectedIndex = filter.getAttribute("compare");
        by_time.childNodes[1].selectedIndex = filter.getAttribute("elapse");
        by_time.childNodes[2].selectedIndex = filter.getAttribute("unit");

        //headline #
        const by_num = deck.childNodes[2];
        by_num.childNodes[0].selectedIndex = filter.getAttribute("hlcompare");
        by_num.childNodes[1].selectedIndex = filter.getAttribute("nb");

        const checkbox = hbox.childNodes[0];
        checkbox.setAttribute("checked", filter.getAttribute("active"));
        if (checkbox.getAttribute("checked") == "false")
        {
          changeStatusFilter1(hbox, "true");
        }
        else
        {
          changeStatusFilter1(hbox, "false");
        }

        //Add another entry to the vbox to populate the next time round.
        vbox.appendChild(hbox.cloneNode(true));
      }

      if (vbox.childElementCount == 1)
      {
        //List was empty - disable (not sure why I have to)
        changeStatusFilter1(vbox.childNodes[0], "true");
      }
      else
      {
        //discard the last one
        vbox.lastElementChild.remove();
      }
    }

    //FIXME: This controls the feed/group left and right arrows and does NOT
    //belong here
    const which = document.getElementById("rss-select-menu").selectedIndex;

    const previous_arrow = document.getElementById("inforss.previous.rss");
    if (which == 0)
    {
      previous_arrow.disabled = true;
      previous_arrow.childNodes[0].hidden = true;
    }
    else
    {
      previous_arrow.disabled = false;
      previous_arrow.childNodes[0].hidden = false;
    }

    const next_arrow = document.getElementById("inforss.next.rss");
    if (which == gNbRss - 1)
    {
      next_arrow.disabled = true;
      next_arrow.childNodes[0].hidden = true;
    }
    else
    {
      next_arrow.disabled = false;
      next_arrow.childNodes[0].hidden = false;
    }

    document.getElementById("inforss.new.feed").disabled = false;

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
    gRssXmlHttpRequest = null;
    document.getElementById("inforss.new.feed").disabled = false;
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
  if (inforss.confirm("reset.repository"))
  {
    inforssXMLRepository.reset_xml_to_default();
    inforss.mediator.remove_all_feeds();
    load_and_display_configuration();
  }
}

//-----------------------------------------------------------------------------------------------------
/* exported clear_headline_cache */
function clear_headline_cache()
{
  if (inforss.confirm("reset.rdf"))
  {
    inforss.mediator.clear_headline_cache();
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
    for (const feed_ of inforssXMLRepository.get_all())
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
      const file = inforss.Config.get_filepath();
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
  try
  {
    const hbox = obj.parentNode.cloneNode(true);
    obj.parentNode.parentNode.appendChild(hbox);
    hbox.childNodes[0].setAttribute("checked", "true");
    changeStatusFilter1(hbox, "false");
  }
  catch (e)
  {
    inforss.debug(e);
  }
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
      if (obj.parentNode.parentNode.childNodes.length == 1)
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
  var status = button.getAttribute("checked");
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
  document.getElementById("inforssOption").cancelDialog();
}

//--------
//-----------------------------------------------------------------------------------------------------
/* exported resetIcon */
function resetIcon()
{
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
}

//-----------------------------------------------------------------------------------------------------
/* exported resetIconGroup */
function resetIconGroup()
{
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
}

//-----------------------------------------------------------------------------------------------------
/* exported resetDefaultIconGroup */
function resetDefaultIconGroup()
{
  try
  {
    document.getElementById('defaultGroupIcon').value = INFORSS_DEFAULT_GROUP_ICON;
    document.getElementById('inforss.defaultgroup.icon').src = document.getElementById('defaultGroupIcon').value;
  }
  catch (e)
  {
    inforss.debug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
/* exported setIcon */
function setIcon()
{
  try
  {
    document.getElementById('inforss.rss.icon').src = document.getElementById('iconurl').value;
  }
  catch (e)
  {
    inforss.debug(e);
  }
}

//------------------------------------------------------------------------------
//This updates the small window for about 10 seconds
function updateCanvas()
{
  try
  {
    var canvas = document.getElementById("inforss.canvas");
    var ctx = canvas.getContext("2d");
    var br = document.getElementById("inforss.canvas.browser");
    ctx.drawWindow(br.contentWindow, 0, 0, 800, 600, "rgb(255,255,255)");
    refreshCount += 1;
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
}

//-----------------------------------------------------------------------------------------------------
/* exported canvasOver */
function canvasOver(event)
{
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
}

//-----------------------------------------------------------------------------------------------------
/* exported canvasMove */
function canvasMove(event)
{
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
}

//-----------------------------------------------------------------------------------------------------
/* exported canvasOut */
function canvasOut()
{
  try
  {
    document.getElementById("inforss.magnify").style.visibility = "hidden";
  }
  catch (e)
  {
    inforss.debug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
/* exported setIconGroup */
function setIconGroup()
{
  try
  {
    document.getElementById('inforss.group.icon').src = document.getElementById('iconurlgroup').value;
  }
  catch (e)
  {
    inforss.debug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
/* exported setDefaultIconGroup */
function setDefaultIconGroup()
{
  try
  {
    document.getElementById('inforss.defaultgroup.icon').src = document.getElementById('defaultGroupIcon').value;
  }
  catch (e)
  {
    inforss.debug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
/* exported copyLocalToRemote */
function copyLocalToRemote()
{
  try
  {
    if (checkServerInfoValue())
    {
      defineVisibilityButton("true", "upload");
      inforss.send_to_server(
        {
          protocol: document.getElementById('inforss.repo.urltype').value,
          server: document.getElementById('ftpServer').value,
          directory: document.getElementById('repoDirectory').value,
          user: document.getElementById('repoLogin').value,
          password: document.getElementById('repoPassword').value
        },
        true,
        ftpUploadCallback,
        inforsssetExportProgressionBar
      );
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
/* exported copyRemoteToLocal */
function copyRemoteToLocal()
{
  try
  {
    if (checkServerInfoValue())
    {
      defineVisibilityButton("true", "download");
      inforss.load_from_server(
        { protocol: document.getElementById('inforss.repo.urltype').value,
          server: document.getElementById('ftpServer').value,
          directory: document.getElementById('repoDirectory').value,
          user: document.getElementById('repoLogin').value,
          password: document.getElementById('repoPassword').value
        },
        ftpDownloadCallback,
        inforsssetImportProgressionBar
      );
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function checkServerInfoValue()
{
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
  return returnValue;
}

//-----------------------------------------------------------------------------------------------------
function ftpUploadCallback(/*status*/)
{
  try
  {
    inforsssetExportProgressionBar(100);
    defineVisibilityButton("false", "upload");
  }
  catch (e)
  {
    inforss.debug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function ftpDownloadCallback(/* status*/)
{
  try
  {
    inforsssetImportProgressionBar(100);
    defineVisibilityButton("false", "download");

    gRemovedUrls = [];

    load_and_display_configuration();

    inforss.mediator.remove_all_feeds();
    inforss.mediator.reload_headline_cache();
  }
  catch (e)
  {
    inforss.debug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function defineVisibilityButton(flag, action)
{
  try
  {
    var accept = document.getElementById('inforssOption').getButton("accept");
    accept.setAttribute("disabled", flag);
    var apply = document.getElementById('inforss.apply');
    apply.setAttribute("disabled", flag);
    if (action == "download")
    {
      document.getElementById("inforss.deck.importfromremote").selectedIndex = (flag == "true") ? 1 : 0;
      inforsssetImportProgressionBar(0);
    }
    else
    {
      document.getElementById("inforss.deck.exporttoremote").selectedIndex = (flag == "true") ? 1 : 0;
      inforsssetExportProgressionBar(0);
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function inforsssetImportProgressionBar(value)
{
  try
  {
    if (document.getElementById("inforss.repo.synchronize.importfromremote.importProgressBar") != null)
    {
      document.getElementById("inforss.repo.synchronize.importfromremote.importProgressBar").value = value;
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function inforsssetExportProgressionBar(value)
{
  try
  {
    if (document.getElementById("inforss.repo.synchronize.exporttoremote.exportProgressBar") != null)
    {
      document.getElementById("inforss.repo.synchronize.exporttoremote.exportProgressBar").value = value;
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
/* exported purgeNow */
function purgeNow()
{
  inforss.mediator.purge_headline_cache();
}

//-----------------------------------------------------------------------------------------------------
/* exported openURL */
//FIXME There are three slightly different versions of this
function openURL(url)
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
function viewAllViewSelected(view_all)
{
  try
  {
    update_visible_group_list({ view_all });
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

//-------------------------------------------------------------------------------------------------------------
/* exported inforssFindIcon */
function inforssFindIcon(rss)
{
  try
  {
    //Get the web page
    var url = rss.getAttribute("link");
    const user = rss.getAttribute("user");
    const password = inforss.read_password(url, user);
    var xmlHttpRequest = new inforssPriv_XMLHttpRequest();
    xmlHttpRequest.open("GET", url, false, user, password);
    xmlHttpRequest.send();
    //Now read the HTML into a doc object
    var doc = document.implementation.createHTMLDocument("");
    doc.documentElement.innerHTML = xmlHttpRequest.responseText;
    //See https://en.wikipedia.org/wiki/Favicon
    //https://www.w3.org/2005/10/howto-favicon
    //https://sympli.io/blog/2017/02/15/heres-everything-you-need-to-know-about-favicons-in-2017/
    //Now find the favicon. Per what spec I can find, it is the last specified
    //<link rel="xxx"> and if there isn't any of those, use favicon.ico in the
    //root of the site.
    var favicon = "/favicon.ico";
    for (var node of doc.head.getElementsByTagName("link"))
    {
      //There is at least one website that uses 'SHORTCUT ICON'
      var rel = node.getAttribute("rel").toLowerCase();
      if (rel == "icon" || rel == "shortcut icon")
      {
        favicon = node.getAttribute("href");
      }
    }
    //possibly try the URL class for this? (new URL(favicon, url))
    //Now make the full URL. If it starts with '/', it's relative to the site.
    //If it starts with (.*:)// it's a url. I assume you fill in the missing
    //protocol with however you got the page.
    url = xmlHttpRequest.responseURL;
    if (favicon.startsWith("//"))
    {
      favicon = url.split(":")[0] + ':' + favicon;
    }
    if (!favicon.includes("://"))
    {
      if (favicon.startsWith("/"))
      {
        var arr = url.split("/");
        favicon = arr[0] + "//" + arr[2] + favicon;
      }
      else
      {
        favicon = url + (url.endsWith("/") ? "" : "/") + favicon;
      }
    }
    //Now we see if it actually exists and isn't null, because null ones are
    //just evil.
    xmlHttpRequest = new inforssPriv_XMLHttpRequest();
    xmlHttpRequest.open("GET", favicon, false, user, password);
    xmlHttpRequest.send();
    if (xmlHttpRequest.status != 404 && xmlHttpRequest.responseText.length != 0)
    {
      return favicon;
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
  return inforssXMLRepository.Default_Feed_Icon;
}

//------------------------------------------------------------------------------
window.addEventListener(
  "load",
  () =>
  {
    document.title += ' ' + inforss.get_version();
  }
);
