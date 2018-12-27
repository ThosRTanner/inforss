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
// inforssOptionBasic
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------
//Contains the code for the 'Basic' tab in the option screen

//FIXME New Feed, New Group and make current buttons all belong here
//as well as the general, filter and settings subtabs (all from feed/group)

/*jshint browser: true, devel: true */
/*eslint-env browser */

var inforss = inforss || {};

Components.utils.import("chrome://inforss/content/modules/inforss_Utils.jsm",
                        inforss);

/* globals inforssXMLRepository */

//shared with inforssOption
/* globals selectRSS1, currentRSS */

/* exported populate_basic_tab */
function populate_basic_tab()
{
  Basic__Feed_Group__General_populate();
  Basic__General__populate();
  Basic__Headlines_area__populate();
  Basic__Headlines_style__populate();
}

/* exported update_basic_tab */
function update_basic_tab()
{
  //Basic__Feed_Group__General_update(); //there is stuff to update here, somehow
  Basic__General__update();
  Basic__Headlines_area__update();
  Basic__Headlines_style__update();
}

//Build the popup menu
function Basic__Feed_Group__General_populate()
{
  //It appears that because xul has already got its fingers on this, we can't
  //dynamically replace
  //This is the list of feeds in a group displayed when a group is selectd
  {
    let list2 = document.getElementById("group-list-rss");
    let listcols = list2.firstChild;
    inforss.remove_all_children(list2);
    list2.appendChild(listcols);
  }

  //If we don't do this here, it seems to screw stuff up for the 1st group.
  for (let feed of inforssXMLRepository.get_feeds())
  {
    add_feed_to_group_list(feed);
  }

  //Now we build the selection menu under basic: feed/group

  const menu = document.getElementById("rss-select-menu");
  menu.removeAllItems();

  {
    const selectFolder = document.createElement("menupopup");
    selectFolder.setAttribute("id", "rss-select-folder");
    menu.appendChild(selectFolder);
  }

  var selected_feed = null;

  //Create the menu from the sorted list of feeds
  let i = 0;
  const feeds = Array.from(inforssXMLRepository.get_all()).sort((a, b) =>
    a.getAttribute("title").toLowerCase() > b.getAttribute("title").toLowerCase());

  for (let feed of feeds)
  {
    const element = menu.appendItem(feed.getAttribute("title"), "rss_" + i);

    element.setAttribute("class", "menuitem-iconic");
    element.setAttribute("image", feed.getAttribute("icon"));

    element.setAttribute("url", feed.getAttribute("url"));

    if (feed.hasAttribute("user"))
    {
      element.setAttribute("user", feed.getAttribute("user"));
    }

    if ('arguments' in window)
    {
      if (feed.getAttribute("url") == window.arguments[0].getAttribute("url"))
      {
        selected_feed = element;
        menu.selectedIndex = i;
      }
    }
    else
    {
      if (feed.getAttribute("selected") == "true")
      {
        selected_feed = element;
        menu.selectedIndex = i;
      }
    }
    ++i;
  }
  if (menu.selectedIndex != -1)
  {
    selectRSS1(selected_feed.getAttribute("url"), selected_feed.getAttribute("user"));
  }
}

//Basic__Feed_Group_update()

//------------------------------------------------------------------------------
//This is the code for the 'make current' button in the basic feed/group page
/* exported makeCurrent */
function makeCurrent()
{
  try
  {
    for (let item of inforssXMLRepository.get_all())
    {
      item.setAttribute("selected", item == currentRSS);
    }
    if (currentRSS != null)
    {
      document.getElementById("inforss.make.current").setAttribute("disabled", "true");
      document.getElementById("inforss.make.current.background").style.backgroundColor = "rgb(192,255,192)";
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
}

function Basic__General__populate()
{
  //----------InfoRSS activity box---------
  document.getElementById("activity").selectedIndex =
    inforssXMLRepository.headline_bar_enabled ? 0 : 1;

  //----------General box---------

  //Hide viewed headlines
  document.getElementById("hideViewed").selectedIndex =
    inforssXMLRepository.hide_viewed_headlines ? 0 : 1;

  //Hide old headlines
  document.getElementById("hideOld").selectedIndex =
    inforssXMLRepository.hide_old_headlines ? 0 : 1;

  //use local history to hide headlines
  document.getElementById("hideHistory").selectedIndex =
    inforssXMLRepository.remember_headlines ? 0 : 1;

  //popup message on new headline
  document.getElementById("popupMessage").selectedIndex =
    inforssXMLRepository.show_toast_on_new_headline ? 0 : 1;

  //play sound on new headline
  document.getElementById("playSound").selectedIndex =
    inforssXMLRepository.play_sound_on_new_headline ? 0 : 1;

  //tooltip on headline
  {
    const tooltip = inforssXMLRepository.headline_tooltip_style;
    document.getElementById("tooltip").selectedIndex =
      tooltip == "description" ? 0 :
      tooltip == "title" ? 1 :
      tooltip == "allInfo" ? 2 : 3;
  }

  //display full article
  document.getElementById("clickHeadline").selectedIndex =
    inforssXMLRepository.headline_action_on_click;

  //cpu utilisation timeslice
  document.getElementById("timeslice").value =
    inforssXMLRepository.headline_processing_backoff;
}

function Basic__General__update()
{
  //----------InfoRSS activity box---------
  inforssXMLRepository.headline_bar_enabled =
    document.getElementById("activity").selectedIndex == 0;

  //----------General box---------

  //Hide viewed headlines
  inforssXMLRepository.hide_viewed_headlines =
    document.getElementById("hideViewed").selectedIndex == 0;

  //Hide old headlines
  inforssXMLRepository.hide_old_headlines =
    document.getElementById("hideOld").selectedIndex == 0;

  //use local history to hide headlines
  inforssXMLRepository.remember_headlines =
    document.getElementById("hideHistory").selectedIndex == 0;

  //popup message on new headline
  inforssXMLRepository.show_toast_on_new_headline =
    document.getElementById("popupMessage").selectedIndex == 0;

  //play sound on new headline
  inforssXMLRepository.play_sound_on_new_headline =
    document.getElementById("playSound").selectedIndex == 0;

  //tooltip on headline
  inforssXMLRepository.headline_tooltip_style =
    document.getElementById('tooltip').selectedIndex == 0 ? "description" :
    document.getElementById('tooltip').selectedIndex == 1 ? "title" :
    document.getElementById('tooltip').selectedIndex == 2 ? "allInfo" : "article";

  //display full article
  inforssXMLRepository.headline_action_on_click =
    document.getElementById("clickHeadline").selectedIndex;

  //cpu utilisation timeslice
  inforssXMLRepository.headline_processing_backoff =
    document.getElementById("timeslice").value;

}

function Basic__Headlines_area__populate()
{
  //----------Headlines Area---------
  //location
  document.getElementById("linePosition").selectedIndex =
    inforssXMLRepository.headline_bar_location;
  //collapse if no headline
  document.getElementById("collapseBar").selectedIndex =
    inforssXMLRepository.headline_bar_collapsed ? 0 : 1;
  //mousewheel scrolling
  document.getElementById("mouseWheelScroll").selectedIndex =
    inforssXMLRepository.headline_bar_mousewheel_scroll;
  //scrolling headlines
  //can be 0 (none), 1 (scroll), 2 (fade)
  document.getElementById("scrolling").selectedIndex =
    inforssXMLRepository.headline_bar_scroll_style;
  //  speed
  document.getElementById("scrollingspeed1").value =
    inforssXMLRepository.headline_bar_scroll_speed;
  //  increment
  document.getElementById("scrollingIncrement1").value =
    inforssXMLRepository.headline_bar_scroll_increment;
  //  stop scrolling when over headline
  document.getElementById("stopscrolling").selectedIndex =
    inforssXMLRepository.headline_bar_stop_on_mouseover ? 0 : 1;
  //  direction
  document.getElementById("scrollingdirection").selectedIndex =
    inforssXMLRepository.headline_bar_scrolling_direction == "rtl" ? 0 : 1;
  //Cycling feed/group
  document.getElementById("cycling").selectedIndex =
    inforssXMLRepository.headline_bar_cycle_feeds ? 0 : 1;
  //  Cycling delay
  document.getElementById("cyclingDelay1").value =
    inforssXMLRepository.headline_bar_cycle_interval;
  //  Next feed/group
  document.getElementById("nextFeed").selectedIndex =
    inforssXMLRepository.headline_bar_cycle_type == "next" ? 0 : 1;
  //  Cycling within group
  document.getElementById("cycleWithinGroup").selectedIndex =
    inforssXMLRepository.headline_bar_cycle_in_group ? 0 : 1;

  //----------Icons in the headline bar---------
  document.getElementById("readAllIcon").checked =
    inforssXMLRepository.headline_bar_show_mark_all_as_read_button;
  document.getElementById("previousIcon").checked =
    inforssXMLRepository.headline_bar_show_previous_feed_button;
  document.getElementById("pauseIcon").checked =
    inforssXMLRepository.headline_bar_show_pause_toggle;
  document.getElementById("nextIcon").checked =
    inforssXMLRepository.headline_bar_show_next_feed_button;
  document.getElementById("viewAllIcon").checked =
    inforssXMLRepository.headline_bar_show_view_all_button;
  document.getElementById("refreshIcon").checked =
    inforssXMLRepository.headline_bar_show_manual_refresh_button;
  document.getElementById("hideOldIcon").checked =
    inforssXMLRepository.headline_bar_show_hide_old_headlines_toggle;
  document.getElementById("hideViewedIcon").checked =
    inforssXMLRepository.headline_bar_show_hide_viewed_headlines_toggle;
  document.getElementById("shuffleIcon").checked =
    inforssXMLRepository.headline_bar_show_shuffle_toggle;
  document.getElementById("directionIcon").checked =
    inforssXMLRepository.headline_bar_show_direction_toggle;
  document.getElementById("scrollingIcon").checked =
    inforssXMLRepository.headline_bar_show_scrolling_toggle;
  document.getElementById("synchronizationIcon").checked =
    inforssXMLRepository.headline_bar_show_manual_synchronisation_button;
  document.getElementById("filterIcon").checked =
    inforssXMLRepository.headline_bar_show_quick_filter_button;
  document.getElementById("homeIcon").checked =
    inforssXMLRepository.headline_bar_show_home_button;
}

function Basic__Headlines_area__update()
{

  inforssXMLRepository.headline_bar_location =
    document.getElementById("linePosition").selectedIndex;
  //collapse if no headline
  inforssXMLRepository.headline_bar_collapsed =
    document.getElementById("collapseBar").selectedIndex == 0;
  inforssXMLRepository.headline_bar_mousewheel_scroll =
    document.getElementById("mouseWheelScroll").selectedIndex;

  //scrolling section
  inforssXMLRepository.headline_bar_scroll_style =
    document.getElementById("scrolling").selectedIndex;
  inforssXMLRepository.headline_bar_scroll_speed =
    document.getElementById("scrollingspeed1").value;
  inforssXMLRepository.headline_bar_scroll_increment =
    document.getElementById("scrollingIncrement1").value;
  inforssXMLRepository.headline_bar_stop_on_mouseover =
    document.getElementById("stopscrolling").selectedIndex == 0;
  //  direction - FIXME This could be done better
  inforssXMLRepository.headline_bar_scrolling_direction =
    document.getElementById("scrollingdirection").selectedIndex == 0 ? "rtl" : "ltr";

  //cycling section
  inforssXMLRepository.headline_bar_cycle_feeds =
    document.getElementById("cycling").selectedIndex == 0;
  inforssXMLRepository.headline_bar_cycle_interval =
    document.getElementById("cyclingDelay1").value;
  inforssXMLRepository.headline_bar_cycle_type =
    document.getElementById("nextFeed").selectedIndex == 0 ? "next" : "random";
  inforssXMLRepository.headline_bar_cycle_in_group =
    document.getElementById("cycleWithinGroup").selectedIndex == 0;

  //Icons in the headline bar
  inforssXMLRepository.headline_bar_show_mark_all_as_read_button =
    document.getElementById("readAllIcon").checked;
  inforssXMLRepository.headline_bar_show_previous_feed_button =
    document.getElementById("previousIcon").checked;
  inforssXMLRepository.headline_bar_show_pause_toggle =
    document.getElementById("pauseIcon").checked;
  inforssXMLRepository.headline_bar_show_next_feed_button =
    document.getElementById("nextIcon").checked;
  inforssXMLRepository.headline_bar_show_view_all_button =
    document.getElementById("viewAllIcon").checked;
  inforssXMLRepository.headline_bar_show_manual_refresh_button =
    document.getElementById("refreshIcon").checked;
  inforssXMLRepository.headline_bar_show_hide_old_headlines_toggle =
    document.getElementById("hideOldIcon").checked;
  inforssXMLRepository.headline_bar_show_hide_viewed_headlines_toggle =
    document.getElementById("hideViewedIcon").checked;
  inforssXMLRepository.headline_bar_show_shuffle_toggle =
    document.getElementById("shuffleIcon").checked;
  inforssXMLRepository.headline_bar_show_direction_toggle =
    document.getElementById("directionIcon").checked;
  inforssXMLRepository.headline_bar_show_scrolling_toggle =
    document.getElementById("scrollingIcon").checked;
  inforssXMLRepository.headline_bar_show_manual_synchronisation_button =
    document.getElementById("synchronizationIcon").checked;
  inforssXMLRepository.headline_bar_show_quick_filter_button =
    document.getElementById("filterIcon").checked;
  inforssXMLRepository.headline_bar_show_home_button =
    document.getElementById("homeIcon").checked;
}

function Basic__Headlines_style__populate()
{
  // ----------- Headlines style -----------

  //Display feed icon
  document.getElementById("favicon").selectedIndex =
    inforssXMLRepository.headline_shows_feed_icon ? 0 : 1;

  //Display enclosure icon
  document.getElementById("displayEnclosure").selectedIndex =
    inforssXMLRepository.headline_shows_enclosure_icon ? 0 : 1;

  //Display banned icon
  document.getElementById("displayBanned").selectedIndex =
    inforssXMLRepository.headline_shows_ban_icon ? 0 : 1;

  //Font
  {
    const headline_font = inforssXMLRepository.headline_font_family;
    const font_menu = document.getElementById("fresh-font");
    font_menu.selectedIndex = 0;
    for (let font of font_menu.childNodes[0].childNodes)
    {
      if (headline_font == font.getAttribute("value"))
      {
        break;
      }
      ++font_menu.selectedIndex;
    }
  }

  //Font size
  {
    const fontSize = inforssXMLRepository.headline_font_size;
    if (fontSize == "inherit")
    {
      document.getElementById("fontSize").selectedIndex = 0;
    }
    else
    {
      document.getElementById("fontSize").selectedIndex = 1;
      //fontsize is in pt so strip that off
      document.getElementById("fontSize1").value = parseInt(fontSize, 10);
    }
  }

  //Foregound colour
  //Sigh magic values again
  {
    const defaultForegroundColor = inforssXMLRepository.headline_text_colour;
    if (defaultForegroundColor == "default")
    {
      document.getElementById("defaultForegroundColor").selectedIndex = 0;
      document.getElementById("defaultManualColor").value = '#000000';
    }
    else
    {
      document.getElementById("defaultForegroundColor").selectedIndex = 1;
      document.getElementById("defaultManualColor").value = defaultForegroundColor;
    }
  }

  // ----------- Recent Headline style -----------

  //Highlight delay (i.e. time after which it is no longer recent)
  document.getElementById("delay1").value = inforssXMLRepository.recent_headline_max_age;

  //Style (italic, bold)
  document.getElementById("inforss.italic").checked =
    inforssXMLRepository.recent_headline_font_style != "normal";
  document.getElementById("inforss.bold").checked =
    inforssXMLRepository.recent_headline_font_weight != "normal";

  //Background colour.
  const background_colour = inforssXMLRepository.recent_headline_background_colour;
  if (background_colour == "inherit")
  {
    document.getElementById("backgroundColor").selectedIndex = 0;
    document.getElementById("backgroundManualColor").value = "#000000";
  }
  else
  {
    document.getElementById("backgroundColor").selectedIndex = 1;
    document.getElementById("backgroundManualColor").value = background_colour;
  }

  //Foreground colour
  const foregroundColor = inforssXMLRepository.recent_headline_text_colour;

  document.getElementById("foregroundColor").selectedIndex =
    foregroundColor == "auto" ? 0 : foregroundColor == "sameas" ? 1 : 2;
  document.getElementById("manualColor").value =
    foregroundColor == "auto" ? "#000000" :
    foregroundColor == "sameas" ?
      document.getElementById("defaultManualColor").value : foregroundColor;

  update_sample_headline_bar();

}

function Basic__Headlines_style__update()
{
  //headlines style

  //display favicon
  inforssXMLRepository.headline_shows_feed_icon =
    document.getElementById('favicon').selectedIndex == 0;

  //display enclosure icon
  inforssXMLRepository.headline_shows_enclosure_icon =
    document.getElementById('displayEnclosure').selectedIndex == 0;

  //display banned icon
  inforssXMLRepository.headline_shows_ban_icon =
    document.getElementById('displayBanned').selectedIndex == 0;

  //font
  inforssXMLRepository.headline_font_family =
    document.getElementById("fresh-font").value;

  //font size
  inforssXMLRepository.headline_font_size =
    document.getElementById('fontSize').selectedIndex == 0 ?
      "inherit" : document.getElementById('fontSize1').value + "pt";

  //foreground colour
  inforssXMLRepository.headline_text_colour =
    document.getElementById('defaultForegroundColor').selectedIndex == 0 ?
      "default" : document.getElementById('defaultManualColor').value;

  //recent headline style

  //highlight delay
  inforssXMLRepository.recent_headline_max_age =
    document.getElementById("delay1").value;

  //style
  inforssXMLRepository.recent_headline_font_weight =
    document.getElementById('inforss.bold').checked ? "bolder" : "normal";
  inforssXMLRepository.recent_headline_font_style =
    document.getElementById('inforss.italic').checked ? "italic" : "normal";

  //bg colour
  inforssXMLRepository.recent_headline_background_colour =
    document.getElementById("backgroundColor").selectedIndex == 0 ?
     "inherit" : document.getElementById("backgroundManualColor").value;

  //fg colour
  inforssXMLRepository.recent_headline_text_colour =
    document.getElementById('foregroundColor').selectedIndex == 0 ? "auto" :
      document.getElementById('foregroundColor').selectedIndex == 1 ? "sameas" :
        document.getElementById('manualColor').value;

}


//------------------------------------------------------------------------------
// This updates the sample headline bar according to the currently selected
// options in the screen
/* exported update_sample_headline_bar */
function update_sample_headline_bar()
{
  //---------------------headline style---------------------

  //Display favicon on/off
  {
    const collapse = document.getElementById("favicon").selectedIndex != 0;
    for (let i = 1; i <= 3; ++i)
    {
      document.getElementById("sample.favicon" + i).collapsed = collapse;
    }
  }

  //Display enclosure icon on/off
  {
    const collapse1 = document.getElementById("displayEnclosure").selectedIndex != 0;
    for (let i = 1; i <= 3; ++i)
    {
      document.getElementById("sample.enclosure" + i).collapsed = collapse1;
    }
  }

  //Display banned icon on/off
  {
    const collapse2 = document.getElementById("displayBanned").selectedIndex != 0;
    for (let i = 1; i <= 3; ++i)
    {
      document.getElementById("sample.banned" + i).collapsed = collapse2;
    }
  }

  //FIXME what one should do is to construct an object containing the colours
  //and pass to something in inforssheadlinedisplay. clearly inforssXMLRepository
  //needs to return a similar object for inforssheadlinedisplay to use.
  const sample = document.getElementById("sample");

  //Font
  sample.style.fontFamily = document.getElementById("fresh-font").value;

  //Font size
  if (document.getElementById("fontSize").selectedIndex == 0)
  {
    sample.style.fontSize = "inherit";
  }
  else
  {
    sample.style.fontSize = document.getElementById("fontSize1").value + "pt";
  }

  {
    const sample_default = document.getElementById("sample.default");
    if (document.getElementById("defaultForegroundColor").selectedIndex == 0)
    {
      sample_default.style.color = "inherit";
      document.getElementById('defaultManualColor').disabled = true;
    }
    else
    {
      sample_default.style.color = document.getElementById('defaultManualColor').value;
      document.getElementById('defaultManualColor').disabled = false;
    }
  }

  //---------------------recent headline style---------------------
  const recent = document.getElementById("sample.recent");

  //headline delay doesn't affect the display

  recent.style.fontWeight =
    document.getElementById("inforss.bold").checked ? "bolder" : "normal";
  recent.style.fontStyle =
    document.getElementById("inforss.italic").checked ? "italic" : "normal";

  const background =
    document.getElementById('backgroundColor').selectedIndex == 0 ?
      "inherit" : document.getElementById('backgroundManualColor').value;
  recent.style.backgroundColor = background;

  const foregroundColor =
    document.getElementById('foregroundColor').selectedIndex == 0 ? "auto" :
    document.getElementById('foregroundColor').selectedIndex == 1 ? sample.style.color :
    document.getElementById('manualColor').value;
  if (foregroundColor == "auto")
  {
    if (background == "inherit")
    {
      recent.style.color = "inherit";
    }
    else
    {
      //Turn the rgb value into HSL and use white (slightly different calc)
      const val = Number("0x" + background.substring(1));
      /*jshint bitwise: false*/
      const red = val >> 16;
      const green = (val >> 8) & 0xff;
      const blue = val & 0xff;
      /*jshint bitwise: true*/
      recent.style.color = (red + green + blue) < 3 * 85 ? "white" : "black";
    }
    document.getElementById('manualColor').value = recent.style.color;
  }
  else
  {
    recent.style.color = foregroundColor;
  }
  document.getElementById('manualColor').disabled =
    document.getElementById('foregroundColor').selectedIndex != 2;
}

//------------------------------------------------------------------------------
// Adds a feed to the 'feed in group' list
/* exported add_feed_to_group_list */
function add_feed_to_group_list(feed)
{
  const listitem = document.createElement("listitem");

  {
    let listcell = document.createElement("listcell");
    listcell.setAttribute("type", "checkbox");
    //Why do we need to do this at all? it's a check box..
    listcell.addEventListener("click", function(event)
      {
        const lc = event.currentTarget;
        if (lc.getAttribute("checked") == "false")
        {
          lc.setAttribute("checked", "true");
        }
        else
        {
          lc.setAttribute("checked", "false");
        }
      }, false);
    listitem.appendChild(listcell);
  }

  {
    //why can't javascript let me make this const
    let listcell = document.createElement("listcell");
    listcell.setAttribute("class", "listcell-iconic");
    listcell.setAttribute("image", feed.getAttribute("icon"));
    listcell.setAttribute("value", feed.getAttribute("title"));
    listcell.setAttribute("label", feed.getAttribute("title"));
    listcell.setAttribute("url", feed.getAttribute("url"));
    listitem.appendChild(listcell);
  }

  listitem.setAttribute("allowevents", "true");

  //Insert into list in alphabetical order
  const listbox = document.getElementById("group-list-rss");
  const title = feed.getAttribute("title").toLowerCase();
  for (let item of listbox.childNodes)
  {
    if (title <= item.childNodes[1].getAttribute("value").toLowerCase())
    {
      listbox.insertBefore(listitem, item);
      return;
    }
  }
  listbox.insertBefore(listitem, null);
}