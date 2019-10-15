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
// inforss_Headline_Display
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------
/* jshint globalstrict: true */
/* eslint-disable strict */
"use strict";

/* eslint-disable array-bracket-newline */
/* exported EXPORTED_SYMBOLS */
const EXPORTED_SYMBOLS = [
  "Headline_Display", /* exported Headline_Display */
];
/* eslint-enable array-bracket-newline */

const { MIME_feed_type, MIME_feed_url } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Constants.jsm",
  {}
);

const { debug } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Debug.jsm",
  {}
);

const { Notifier } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Notifier.jsm",
  {}
);

const { alert, prompt } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Prompt.jsm",
  {}
);

const {
  add_event_listeners,
  event_binder,
  htmlFormatConvert,
  option_window_displayed,
  remove_all_children,
  remove_event_listeners,
  replace_without_children,
  should_reuse_current_tab,
} = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Utils.jsm",
  {}
);

const { get_string } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Version.jsm",
  {}
);

const { Resize_Button } = Components.utils.import(
  "chrome://inforss/content/toolbar/inforss_Resize_Button.jsm",
  {}
);

const mediator = {};
Components.utils.import(
  "chrome://inforss/content/mediator/inforss_Mediator_API.jsm",
  mediator);

const { console } =
  Components.utils.import("resource://gre/modules/Console.jsm", {});

const { clearTimeout, setTimeout } = Components.utils.import(
  "resource://gre/modules/Timer.jsm",
  {}
);

const INFORSS_TOOLTIP_BROWSER_WIDTH = 600;
const INFORSS_TOOLTIP_BROWSER_HEIGHT = 400;

const UnescapeHTMLService = Components.classes[
  "@mozilla.org/feed-unescapehtml;1"].getService(
  Components.interfaces.nsIScriptableUnescapeHTML);

const ClipboardHelper = Components.classes[
  "@mozilla.org/widget/clipboardhelper;1"].getService(
  Components.interfaces.nsIClipboardHelper);

const Browser_Tab_Prefs = Components.classes[
  "@mozilla.org/preferences-service;1"].getService(
  Components.interfaces.nsIPrefService).getBranch("browser.tabs.");

/** Controls scrolling of the headline display.
 *
 * @class
 *
 * @param {Mediator} mediator_ - class which allows communication to feed
 *                               manager and the box containing the display
 * @param {Config} config - inforss configuration
 * @param {Document} document - top level document
 * @param {Element} addon_bar - whichever addon bar we are using
 * @param {Feed_Manager} feed_manager - the manager of displayed feeds &c
 */
function Headline_Display(mediator_, config, document, addon_bar, feed_manager)
{
  this._mediator = mediator_;
  this._config = config;
  this._document = document;
  this._feed_manager = feed_manager;

  //Scrolling is complicated by the fact we have three things to control it:
  //1) The global config control (disabled, fade, scroll)
  //2) the 'pause scrolling button'
  //3) the 'pause on mouse over' config.
  this._scrolling = {
    _paused_toggle: false,
    _paused_mouse: false
  };
  this._scroll_needed = true;
  this._scroll_timeout = null;
  this._resize_timeout = null;
  this._notifier = new Notifier();
  this._active_tooltip = false;
  this._mouse_down_handler = event_binder(this.__mouse_down_handler, this);
  this._tooltip_open = event_binder(this.__tooltip_open, this);
  this._tooltip_close = event_binder(this.__tooltip_close, this);
  this._tooltip_mouse_move = event_binder(this.__tooltip_mouse_move, this);
  this._tooltip_X = -1;
  this._tooltip_Y = -1;
  this._tooltip_browser = null;

  const box = document.getElementById("inforss.newsbox1");
  this._headline_box = box;

  this._resize_button = new Resize_Button(config,
                                          this,
                                          document,
                                          box,
                                          addon_bar);

  this._had_addon_bar = addon_bar.id != "inforss-addon-bar";

  /* eslint-disable array-bracket-spacing, array-bracket-newline */
  this._listeners = add_event_listeners(
    this,
    document,
    [ box, "DOMMouseScroll", this._mouse_scroll ], //FIXME use the wheel event?
    [ box, "mouseover", this._pause_scrolling ],
    [ box, "mouseout", this._resume_scrolling ],
    [ box, "dragover", this._on_drag_over ],
    [ box, "drop", this._on_drop ],
    [ "icon.pause", "click", this._toggle_pause ],
    [ "icon.shuffle", "click", this._switch_shuffle_style ],
    [ "icon.direction", "click", this._switch_scroll_direction ],
    [ "icon.scrolling", "click", this._toggle_scrolling ],
    [ "icon.filter", "click", this._quick_filter ],
    [ document.defaultView, "resize", this._resize_window ]
  );
  /* eslint-enable array-bracket-spacing, array-bracket-newline */
}

//On the subject of calculating the width:
//the mark all read button is at 765, 972, width 16
//newsbox1 is at 231, 970 width 534
//231 + 534 = 765 so this matches.
//what I don't understand is how the 3 boxes adding up to 533 width aren't fully
//visible.
//it appears that the calculation of width is somewhat erratic

Headline_Display.prototype = {

  //----------------------------------------------------------------------------
  init()
  {
    var news = this._headline_box.firstChild;
    //FIXME how can that ever be null?
    //FIXME this is a mess
    if ((news != null))
    {
      if (this._config.headline_bar_scroll_style == this._config.Fade_Into_Next)
      {
        let other = news.nextSibling;
        while (other != null)
        {
          other.collapsed = true;
          other = other.nextSibling;
        }
      }
      else
      {
        let other = news;
        while (other != null)
        {
          if (other.hasAttribute("data-filtered"))
          {
            other.collapsed = true;
          }
          else
          {
            other.collapsed = false;
            other.style.opacity = "1";
          }
          other = other.nextSibling;
        }
      }
    }
    this._document.getElementById('inforss-hbox').setAttribute(
      "collapsed",
      ! this._config.headline_bar_enabled);

    clearTimeout(this._resize_timeout);

    if (this._config.headline_bar_scroll_style == this._config.Static_Display)
    {
      this._stop_scrolling();
    }
    else
    {
      this.start_scrolling();
    }
  },

  /** Called to deregister event handlers */
  dispose()
  {
    this._stop_scrolling();
    clearTimeout(this._resize_timeout);
    this._resize_button.dispose();
    remove_event_listeners(this._listeners);
  },

  /** Drag over the headline display. Allows dropping if the currently selected
   *  feed is a group
   *
   * @param {DragEvent} event - a drag event
   */
  _on_drag_over(event)
  {
    const selected_feed = this._feed_manager.get_selected_feed();
    if (selected_feed == null ||
        selected_feed.getType() != "group" ||
        option_window_displayed())
    {
      return;
    }
    if (event.dataTransfer.types.includes(MIME_feed_type) &&
        event.dataTransfer.getData(MIME_feed_type) != "group")
    {
      //It's a feed and not a group. Allow it to be moved/copied
      event.dataTransfer.dropEffect =
        this._config.menu_show_feeds_from_groups ? "copy" : "move";
      event.preventDefault();
    }
  },

  /** Drop onto the headline display. Adds the selected feed to the currently
   *  selected group.
   *
   * @param {DropEvent} event - a drop event
   */
  _on_drop(event)
  {
    //Close the main menu
    //FIXME Does this actually belong here? that object is owned by the main
    //icon so should probably be a call to that.
    this._document.getElementById("inforss.menupopup").hidePopup();
    const url = event.dataTransfer.getData(MIME_feed_url);
    const selected_feed = this._feed_manager.get_selected_feed();
    if (! selected_feed.containsFeed(url))
    {
      selected_feed.addNewFeed(url);
      mediator.reload();
    }
    event.stopPropagation();
  },

  //-------------------------------------------------------------------------------------------------------------
  removeDisplay(feed)
  {
    try
    {
      for (const headline of feed.getDisplayedHeadlines())
      {
        this.removeFromScreen(headline);
      }
      if (this._headline_box.childNodes.length <= 1)
      {
        this._stop_scrolling();
      }
      feed.clearDisplayedHeadlines();
    }
    catch (err)
    {
      debug(err);
    }
  },
  //-------------------------------------------------------------------------------------------------------------
  isActiveTooltip()
  {
    return this._active_tooltip;
  },

  /** Stop any scrolling */
  _stop_scrolling()
  {
    //The nullity of scrolltimeout is used to stop _start_scrolling re-kicking
    //the timer.
    clearTimeout(this._scroll_timeout);
    this._scroll_timeout = null;
  },


  /** start scrolling
   *
   * kicks of a timer to either fade into the next headline or scroll
   * out the current headline
   */
  _start_scrolling()
  {
    if (this._scroll_timeout == null)
    {
      this._scroll_timeout = setTimeout(
        event_binder(this._perform_scroll, this),
        this._config.headline_bar_scroll_style == this._config.Fade_Into_Next ?
          0 :
          1800
      );
    }
  },

  /** Pause scrolling because mouse is over headline bar
   *
   * ignored @param {MouseEventEvent} event details
   */
  _pause_scrolling(/*event*/)
  {
    if (this._config.headline_bar_stop_on_mouseover)
    {
      this._scrolling._paused_mouse = true;
    }
  },

  /** Resume scrolling - mouse no longer over headline bar
   *
   * ignored @param {MouseEvent} event details
   */
  _resume_scrolling(/*event*/)
  {
    if (this._config.headline_bar_stop_on_mouseover)
    {
      this._scrolling._paused_mouse = false;
    }
  },

  //----------------------------------------------------------------------------
  resetDisplay()
  {
    remove_all_children(this._headline_box);
    this._stop_scrolling();
  },

  //----------------------------------------------------------------------------
  removeFromScreen(headline)
  {
    try
    {
      headline.resetHbox();
    }
    catch (err)
    {
      debug(err);
    }
  },

  //----------------------------------------------------------------------------
  purgeOldHeadlines(feed)
  {
    try
    {
      var i = 0;
      var oldList = feed.getDisplayedHeadlines();
      var newList = feed.getCandidateHeadlines();
      if (oldList != null)
      {
        while (i < oldList.length)
        {
          var find = false;
          var j = 0;
          while ((j < newList.length) && (find == false))
          {
            if (oldList[i].matches(newList[j]))
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
            this.removeFromScreen(oldList[i]);
            oldList.splice(i, 1);
          }
          else
          {
            i++;
          }
        }
      }
    }
    catch (err)
    {
      debug(err);
    }
  },

  /** Creates an icon box to add to the headline
   *
   * @param {string} icon - name of icon to display
   * @param {string} enclosure - optional. enclosure to be played on hover.
   *
   * @returns {Element} a vbox
   */
  _create_icon(icon, enclosure)
  {
    const vbox = this._document.createElement("vbox");

    {
      const spacer = this._document.createElement("spacer");
      spacer.setAttribute("flex", "1");
      vbox.appendChild(spacer);
    }

    const image = this._document.createElement("image");
    image.setAttribute("src", icon);
    image.setAttribute("maxwidth", "16");
    image.setAttribute("maxheight", "16");
    image.style.maxWidth = "16px";
    image.style.maxHeight = "16px";

    //FIXME Shouldn't set private attributes on the DOM. Should give each of
    //these their own event handlers.
    if (enclosure !== undefined)
    {
      image.setAttribute("data-playEnclosure", enclosure);
    }
    if (icon == "chrome://inforss/skin/closetab.png")
    {
      image.setAttribute("inforss", true);
    }

    vbox.appendChild(image);

    {
      const spacer = this._document.createElement("spacer");
      spacer.setAttribute("flex", "1");
      vbox.appendChild(spacer);
    }

    return vbox;
  },

  //----------------------------------------------------------------------------
  _create_display_headline(feed, headline)
  {
    const container = this._document.createElement("hbox");

    container.setAttribute("link", headline.link);
    container.setAttribute("flex", "0");
    container.style.fontFamily = this._config.headline_font_family;
    container.style.fontSize = this._config.headline_font_size;
    container.setAttribute("pack", "end");

    if (this._config.headline_shows_feed_icon)
    {
      container.appendChild(this._create_icon(feed.getIcon()));
    }

    const itemLabel = this._document.createElement("label");
    {
      itemLabel.setAttribute("data-title", headline.title);
      container.appendChild(itemLabel);

      let label = headline.title;

      if (label == "")
      {
        label = "(no title)";
      }

      //truncate to max permitted
      label = label.substring(0, feed.getLengthItem());

      //Prefix with feed name if there's no icon and we're meant to be
      //displaying one.
      if (feed.getIcon() == this._config.Default_Feed_Icon &&
          this._config.headline_shows_feed_icon)
      {
        label = "(" + feed.getTitle().substring(0, 10) + "):" + label;
      }

      itemLabel.setAttribute("value", label);
    }

    if (headline.enclosureType != null &&
        this._config.headline_shows_enclosure_icon)
    {
      let vbox = null;
      if (headline.enclosureType.startsWith("audio/"))
      {
        vbox = this._create_icon("chrome://inforss/skin/speaker.png",
                                 headline.enclosureUrl);
      }
      else if (headline.enclosureType.startsWith("video/"))
      {
        vbox = this._create_icon("chrome://inforss/skin/movie.png",
                                 headline.enclosureUrl);
      }
      else
      {
        //Assume this is an image
        vbox = this._create_icon("chrome://inforss/skin/image.png");
      }
      container.appendChild(vbox);

      vbox.setAttribute("tooltip", "_child");

      const tooltip1 = this._document.createElement("tooltip");
      vbox.appendChild(tooltip1);

      const vbox1 = this._document.createElement("vbox");
      tooltip1.appendChild(vbox1);

      let description1 = this._document.createElement("label");
      description1.setAttribute(
        "value",
        get_string("url") + ": " + headline.enclosureUrl
      );
      vbox1.appendChild(description1);

      description1 = this._document.createElement("label");
      description1.setAttribute(
        "value",
        get_string("enclosure.type") + ": " + headline.enclosureType
      );
      vbox1.appendChild(description1);

      description1 = this._document.createElement("label");
      description1.setAttribute(
        "value",
        get_string("enclosure.size") + ": " + headline.enclosureSize + " " + get_string("enclosure.sizeUnit")
      );
      vbox1.appendChild(description1);
    }

    if (this._config.headline_shows_ban_icon)
    {
      container.appendChild(
        this._create_icon("chrome://inforss/skin/closetab.png")
      );
    }

    {
      const spacer = this._document.createElement("spacer");
      spacer.setAttribute("width", "5");
      spacer.setAttribute("flex", "0");
      container.appendChild(spacer);
    }

    container.addEventListener("mousedown", this._mouse_down_handler);

    let tooltip_contents = "";
    let tooltip_type = "text";

    switch (this._config.headline_tooltip_style)
    {
      case "description":
        {
          let fragment = UnescapeHTMLService.parseFragment(
            headline.description,
            false,
            null,
            container);
          tooltip_contents = fragment.textContent;
        }
        break;

      case "title":
        {
          let fragment = UnescapeHTMLService.parseFragment(headline.title,
                                                           false,
                                                           null,
                                                           container);
          tooltip_contents = fragment.textContent;
        }
        break;

      case "allInfo":
        {
          let fragment = UnescapeHTMLService.parseFragment(
            headline.description,
            false,
            null,
            container
          );

          tooltip_contents = "<TABLE width='100%' style='background-color:#2B60DE; color:white; -moz-border-radius: 10px; padding: 6px'><TR><TD colspan=2 align=center style='border-bottom-style:solid; border-bottom-width:1px '><B><img src='" + feed.getIcon() + "' width=16px height=16px> " + feed.getTitle() + "</B></TD></TR><TR><TD align='right'><B>" + get_string("title") + ": </B></TD><TD>" + headline.title + "</TD></TR><TR><TD align='right'><B>" + get_string("date") + ": </B></TD><TD>" + headline.publishedDate + "</TD></TR><TR><TD align='right'><B>" + get_string("rss") + ": </B></TD><TD>" + headline.url + "</TD></TR><TR><TD align='right'><B>" + get_string("link") + ": </B></TD><TD>" + headline.link + "</TD></TR></TABLE><br>" + fragment.textContent;
        }
        break;

      //case "article":
      default:
        tooltip_contents = headline.link;
        tooltip_type = "url";
        break;
    }

    const tooltip = this.fillTooltip(itemLabel,
                                     headline,
                                     tooltip_contents,
                                     tooltip_type);
    headline.setHbox(container, tooltip);
/*
    if (this._config.headline_bar_scroll_style == this._config.Fade_Into_Next)
    {
      container.setAttribute("collapsed", "true");
    }
*/
    return container;
  },

  //----------------------------------------------------------------------------
  fillTooltip(label, headline, str, type)
  {
    if (! label.hasAttribute("tooltip"))
    {
      //This is moderately contorted.
      //Note that we use the tooltip attribute in the code called from
      //inforssHeadlineBar.resetHeadlineBar
      label.setAttribute("tooltip", this.createTooltip(headline).getAttribute("id"));
    }
    const tooltip = this._document.getElementById(label.getAttribute("tooltip"));
    const vboxs = tooltip.firstChild.getElementsByTagName("vbox");
    const vbox = replace_without_children(vboxs[vboxs.length - 1]);
    if (type == "text")
    {
      str = htmlFormatConvert(str);
      if (str != null && str.indexOf("<") != -1 && str.indexOf(">") != -1)
      {
        let br = this._document.createElement("iframe");
        vbox.appendChild(br);
        br.setAttribute("type", "content-targetable");
        br.setAttribute("src", "data:text/html;charset=utf-8,<html><body>" + encodeURIComponent(str) + "</body></html>");
        br.setAttribute("flex", "1");
        br.style.overflow = "auto";
        br.style.width = INFORSS_TOOLTIP_BROWSER_WIDTH + "px";
        br.style.height = INFORSS_TOOLTIP_BROWSER_HEIGHT + "px";
      }
      else if (str != null && str != "")
      {
        //Break this up into lines of 60 characters.
        //FIXME I'm pretty sure this sort of thing occurs elsewhere
        do
        {
          let j = str.length > 60 ? str.lastIndexOf(' ', 60) : -1;
          if (j == -1)
          {
            j = 60;
          }
          const description = this._document.createElement("label");
          description.setAttribute("value", str.substring(0, j).trim());
          vbox.appendChild(description);
          str = str.substring(j + 1).trim();
        } while (str != "");
      }
      else if (headline.enclosureUrl != null)
      {
        const image = this._document.createElement("image");
        //FIXME What if it's not one of those?
        if (headline.enclosureType.startsWith("image"))
        {
          image.setAttribute("src", "chrome://inforss/skin/image.png");
        }
        else if (headline.enclosureType.startsWith("video"))
        {
          image.setAttribute("src", "chrome://inforss/skin/movie.png");
        }
        else if (headline.enclosureType.startsWith("audio"))
        {
          image.setAttribute("src", "chrome://inforss/skin/speaker.png");
        }
        vbox.appendChild(image);
      }
    }
    else
    {
      //Apparently not text. Do we assume its html?
      let br = this._document.createElement("browser");
      vbox.appendChild(br);
      br.setAttribute("flex", "1");
      br.srcUrl = str;
    }
    return tooltip;
  },

  //----------------------------------------------------------------------------
  createTooltip(headline)
  {
    var tooltip = this._document.createElement("tooltip");
    tooltip.setAttribute("id", "inforss.headline.tooltip." + headline.guid);
    tooltip.setAttribute("position", "before_end");
    this._document.getElementById("inforss.popupset").appendChild(tooltip);
    var nodes = this._document.getAnonymousNodes(tooltip);
    nodes[0].setAttribute("collapsed", "true");
    const toolHbox = this._document.createElement("hbox");
    tooltip.appendChild(toolHbox);
    toolHbox.setAttribute("flex", "1");
    if (headline.enclosureUrl != null &&
        this._config.headline_tooltip_style != "article")
    {
      const vbox1 = this._document.createElement("vbox");
      vbox1.setAttribute("flex", "0");
      vbox1.style.backgroundColor = "inherit";
      toolHbox.appendChild(vbox1);
      if (headline.enclosureType.startsWith("audio/") ||
          headline.enclosureType.startsWith("video/"))
      {
        vbox1.setAttribute("enclosureUrl", headline.enclosureUrl);
        vbox1.setAttribute("enclosureType", headline.enclosureType);
        vbox1.headline = headline;
      }
      else
      {
        const img = this._document.createElement("image");
        img.setAttribute("src", headline.enclosureUrl);
        vbox1.appendChild(img);
      }
      const spacer4 = this._document.createElement("spacer");
      spacer4.setAttribute("width", "10");
      vbox1.appendChild(spacer4);
    }
    const toolVbox = this._document.createElement("vbox");
    toolHbox.appendChild(toolVbox);
    toolVbox.setAttribute("flex", "1");
    tooltip.setAttribute("noautohide", true);
    //FIXME need to remove these somehow?
    tooltip.addEventListener("popupshown", this._tooltip_open);
    tooltip.addEventListener("popuphiding", this._tooltip_close);
    return tooltip;
  },

  /** Deal with showing tooltip
   *
   * @param {PopupEvent} event - tooltip showing event
   */
  __tooltip_open(event)
  {
    this._active_tooltip = true;

    const tooltip = event.target;
    for (const vbox of tooltip.getElementsByTagName("vbox"))
    {
      if (vbox.hasAttribute("enclosureUrl") &&
          vbox.headline.feed.feedXML.getAttribute("playPodcast") == "true")
      {
        if (vbox.childNodes.length == 1)
        {
          const br = this._document.createElement("browser");
          br.setAttribute("enclosureUrl", vbox.getAttribute("enclosureUrl"));
          const size =
            vbox.getAttribute("enclosureType").startsWith("video") ? 200 : 1;
          br.setAttribute("width", size);
          br.setAttribute("height", size);
          br.setAttribute(
            "src",
            "data:text/html;charset=utf-8,<HTML><BODY><EMBED src='" +
              vbox.getAttribute("enclosureUrl") +
              "' autostart='true' ></EMBED></BODY></HTML>"
          );
          vbox.appendChild(br);
        }
        break;
      }
    }
    this._tooltip_browser = null;
    for (const browser of tooltip.getElementsByTagName("browser"))
    {
      if (browser.srcUrl != null && ! browser.hasAttribute("src"))
      {
        browser.style.width = INFORSS_TOOLTIP_BROWSER_WIDTH + "px";
        browser.style.height = INFORSS_TOOLTIP_BROWSER_HEIGHT + "px";
        browser.setAttribute("flex", "1");
        browser.setAttribute("src", browser.srcUrl);
        browser.focus();
      }
      if (this._tooltip_browser == null &&
          ! browser.hasAttribute("enclosureUrl"))
      {
        this._tooltip_browser = browser;
      }
      browser.contentWindow.scrollTo(0, 0);
    }
    tooltip.setAttribute("noautohide", "true");

    if (this._document.tooltipNode != null)
    {
      this._document.tooltipNode.addEventListener("mousemove",
                                                  this._tooltip_mouse_move);
    }
  },

  /** Deal with tooltip hiding
   *
   * @param {PopupEvent} event - event details
   */
  __tooltip_close(event)
  {
    this._active_tooltip = false;

    if (this._document.tooltipNode != null)
    {
      this._document.tooltipNode.removeEventListener(
        "mousemove",
        this._tooltip_mouse_move
      );
    }

    //Need to set tooltip to beginning of article and enable podcast playing
    //to see one of these...
    const item = event.target.querySelector("browser[enclosureUrl]");
    if (item != null)
    {
      item.remove();
    }
    this._tooltip_browser = null;
  },

  /** Deal with tooltip mouse movement
   *
   * @param {MouseEvent} event - event details
   */
  __tooltip_mouse_move(event)
  {
    //It is not clear to me why these are only initialised once and not
    //(say) when the browser window is created.
    if (this._tooltip_X == -1)
    {
      this._tooltip_X = event.screenX;
    }
    if (this._tooltip_Y == -1)
    {
      this._tooltip_Y = event.screenY;
    }
    if (this._tooltip_browser != null)
    {
      this._tooltip_browser.contentWindow.scrollBy(
        (event.screenX - this._tooltip_X) * 50,
        (event.screenY - this._tooltip_Y) * 50
      );
    }
    this._tooltip_X = event.screenX;
    this._tooltip_Y = event.screenY;
  },

//-------------------------------------------------------------------------------------------------------------
  updateDisplay(feed)
  {
    let shown_toast = false;
    this._update_command_buttons();
    try
    {
      this.purgeOldHeadlines(feed);
      let firstItem = null;
      let lastItem = null;
      let lastInserted = null;

      let hbox = this._headline_box;

      let oldList = feed.getDisplayedHeadlines();
      if (oldList.length > 0)
      {
        firstItem = oldList[0].hbox;
        lastItem = oldList[oldList.length - 1].hbox;
        lastInserted = lastItem.nextSibling;
      }
      else
      {
        let lastHeadline = this._mediator.getLastDisplayedHeadline(); //headline_bar
        if (lastHeadline == null)
        {
          firstItem = null;
          lastItem = null;
        }
        else
        {
          firstItem = lastHeadline.hbox.nextSibling;
          lastItem = lastHeadline.hbox.nextSibling;
        }
        lastInserted = firstItem;
      }

      let newList = feed.getCandidateHeadlines();

      if (feed.isSelected())
      {
        this._mediator.show_selected_feed(feed); //headline_bar
      }

      let t0 = new Date();
      for (let i = newList.length - 1; i >= 0; i--)
      {
        let container = null;
        if (newList[i].hbox == null)
        {
          container = this._create_display_headline(feed, newList[i]);
          hbox.insertBefore(container, lastInserted);
/**/console.log(container.boxObject.width, container, container.boxObject)
          if (this._config.headline_bar_scroll_style == this._config.Fade_Into_Next)
          {
            container.setAttribute("collapsed", "true");
          }
          lastInserted = container;
        }
        else
        {
          container = newList[i].hbox;
          if (container.parentNode == null)
          {
            hbox.insertBefore(container, lastInserted);

            container.addEventListener("mousedown", this._mouse_down_handler);
            lastInserted = container;
          }
          else
          {
            lastInserted = firstItem;
          }
          switch (this._config.headline_tooltip_style)
          {
            case "description":
              {
                if (newList[i].description != null)
                {
                  let fragment = Components.classes["@mozilla.org/feed-unescapehtml;1"].getService(Components.interfaces.nsIScriptableUnescapeHTML).parseFragment(newList[i].description, false, null, container);
                  this.fillTooltip(container.getElementsByTagName("label")[0], newList[i], fragment.textContent, "text");
                }
                break;
              }
            case "title":
              {
                let fragment = Components.classes["@mozilla.org/feed-unescapehtml;1"].getService(Components.interfaces.nsIScriptableUnescapeHTML).parseFragment(newList[i].title, false, null, container);
                this.fillTooltip(container.getElementsByTagName("label")[0], newList[i], fragment.textContent, "text");
                break;
              }
            case "allInfo":
              {
                let fragment = Components.classes["@mozilla.org/feed-unescapehtml;1"].getService(Components.interfaces.nsIScriptableUnescapeHTML).parseFragment(newList[i].description, false, null, container);
                this.fillTooltip(container.getElementsByTagName("label")[0], newList[i], "<TABLE width='100%' style='background-color:#2B60DE; color:white; -moz-border-radius: 10px; padding: 6px'><TR><TD colspan=2 align=center style='border-bottom-style:solid; border-bottom-width:1px'><B><img src='" + feed.getIcon() + "' width=16px height=16px> " + feed.getTitle() + "</B></TD></TR><TR><TD align='right'><B>" + get_string("title") + ": </B></TD><TD>" + newList[i].title + "</TD></TR><TR><TD align='right'><B>" + get_string("date") + ": </B></TD><TD>" + newList[i].publishedDate + "</TD></TR><TR><TD align='right'><B>" + get_string("rss") + ": </B></TD><TD>" + newList[i].url + "</TD></TR><TR><TD align='right'><B>" + get_string("link") + ": </B></TD><TD>" + newList[i].link + "</TD></TR></TABLE><br>" + fragment.textContent, "text");
                break;
              }
              //case "article":
            default:
              {
                this.fillTooltip(container.getElementsByTagName("label")[0], newList[i], newList[i].link, "url");
                break;
              }
          }
        }
        //FIXME why not use newList[i].isNew()?
        if (t0 - newList[i].receivedDate < this._config.recent_headline_max_age * 60000)
        {
          this._apply_recent_headline_style(container);
          if (!shown_toast)
          {
            shown_toast = true;
            if (this._config.show_toast_on_new_headline)
            {
              this._notifier.notify(
                feed.getIcon(),
                get_string("new.headline"),
                get_string("popup.newheadline") + " " + feed.getTitle()
              );
            }
            if (this._config.play_sound_on_new_headline)
            {
              //FIXME why not at startup?
              var sound = Components.classes["@mozilla.org/sound;1"].getService(Components.interfaces.nsISound);
              sound.init();
              if (this._document.defaultView.navigator.platform == "Win32")
              {
                //FIXME This should be configurable
                sound.playSystemSound("SystemNotification");
              }
              else
              {
                sound.beep();
              }
            }
          }
        }
        else
        {
          this._apply_default_headline_style(container);
        }
        this._apply_quick_filter(container, newList[i].title);
      }
      feed.updateDisplayedHeadlines();
      this.start_scrolling();
    }
    catch (err)
    {
      debug(err);
    }
  },

  /** hide headline if filtered
   *
   * @param {Element} hbox - an hbox
   * @param {string} title - headline title
   *                         which should generally be the title of the label
   *                         enclosed in the hbox so I'm not sure why I pass it
   *                         (though the code is obscure to say the least)
   */
  _apply_quick_filter(hbox, title)
  {
    //FIXME I can't help feeling there's a better way of carrying around the
    //data-original-width and filtered attributes
    if (this._config.quick_filter_active &&
        ! title.toLowerCase().includes(
          this._config.quick_filter_text.toLowerCase()))
    {
      //FIXME Just set data-original-width to the correct value when creating
      //the headline object and stop all this faffing around.
      //this seems to do something screwy and ends up with wrong widths
      if (! hbox.hasAttribute("data-original-width") &&
          hbox.boxObject.width != 0)
      {
        hbox.setAttribute("data-original-width", hbox.boxObject.width);
      }
      hbox.collapsed = true;
      hbox.setAttribute("data-filtered", "true");
    }
    else
    {
      hbox.collapsed = false;
      hbox.removeAttribute("data-filtered");
    }
  },

  /** Apply recent headline style to headline
   *
   * @param {Element} obj - dom object to which to apply style
   */
  _apply_recent_headline_style(obj)
  {
    const background = this._config.recent_headline_background_colour;
    obj.style.backgroundColor = background;
    const color = this._config.recent_headline_text_colour;
    if (color == "auto")
    {
      if (background == "inherit")
      {
        obj.style.color = "inherit";
      }
      else
      {
        const val = Number("0x" + background.substring(1));
        /*eslint-disable no-extra-parens*/
        /*jshint bitwise: false*/
        /*eslint-disable no-bitwise*/
        const red = val >> 16;
        const green = (val >> 8) & 0xff;
        const blue = val & 0xff;
        /*eslint-enable no-bitwise*/
        /*jshint bitwise: true*/
        obj.style.color = (red + green + blue) < 3 * 85 ? "white" : "black";
        /*eslint-enable no-extra-parens*/
      }
    }
    else if (color == "sameas")
    {
      const default_colour = this._config.headline_text_colour;
      //FIXME make the default 'inherit'
      if (default_colour == "default")
      {
        obj.style.color = "inherit";
      }
      else
      {
        obj.style.color = default_colour;
      }
    }
    else
    {
      obj.style.color = color;
    }
    obj.style.fontFamily = this._config.headline_font_family;
    obj.style.fontSize = this._config.headline_font_size;
    obj.style.fontWeight = this._config.recent_headline_font_weight;
    obj.style.fontStyle = this._config.recent_headline_font_style;
  },

  /** Apply default headline style to headline
   *
   * @param {Object} obj - dom object to which to apply style
   */
  _apply_default_headline_style(obj)
  {
    obj.style.backgroundColor = "inherit";
    const defaultColor = this._config.headline_text_colour;
    if (defaultColor == "default")
    {
      obj.style.color = "inherit";
    }
    else
    {
      obj.style.color = defaultColor;
    }
    obj.style.fontFamily = this._config.headline_font_family;
    obj.style.fontSize = this._config.headline_font_size;
    obj.style.fontWeight = "normal";
    obj.style.fontStyle = "normal";
  },

  /** Update all the command buttons
   *
   * Hides or shows according to the configuration and selects the appropriate
   * on/off variant according to clicks
   */
  _update_command_buttons()
  {
    const show_button = (element, show, toggle, img1, img2) =>
    {
      const image = this._document.getElementById("inforss.icon." + element);
      image.collapsed = ! show;
      if (show && toggle !== undefined)
      {
        if (img1 === undefined)
        {
          img1 = element;
        }
        if (img2 === undefined)
        {
          img2 = "no" + element;
        }
        image.setAttribute(
          "src",
          "chrome://inforss/skin/" + (toggle ? img1 : img2) + ".png");
      }
    };

    show_button("readall",
                this._config.headline_bar_show_mark_all_as_read_button);

    show_button("previous",
                this._config.headline_bar_show_previous_feed_button);

    show_button("pause",
                this._config.headline_bar_show_pause_toggle,
                this._scrolling._paused_toggle,
                "pause",
                "pausing");

    show_button("next",
                this._config.headline_bar_show_next_feed_button);

    show_button("viewall",
                this._config.headline_bar_show_view_all_button);

    show_button("refresh",
                this._config.headline_bar_show_manual_refresh_button);

    show_button("hideold",
                this._config.headline_bar_show_hide_old_headlines_toggle,
                this._config.hide_old_headlines);

    show_button("hideviewed",
                this._config.headline_bar_show_hide_viewed_headlines_toggle,
                this._config.hide_viewed_headlines);

    show_button("shuffle",
                this._config.headline_bar_show_shuffle_toggle,
                this._config.headline_bar_cycle_type != "next");

    show_button("direction",
                this._config.headline_bar_show_direction_toggle,
                this._config.headline_bar_scrolling_direction == "rtl",
                "rtl",
                "ltr");

    show_button(
      "scrolling",
      this._config.headline_bar_show_scrolling_toggle,
      this._config.headline_bar_scroll_style == this._config.Static_Display
    );

    show_button("filter",
                this._config.headline_bar_show_quick_filter_button,
                this._config.quick_filter_active);

    show_button("home",
                this._config.headline_bar_show_home_button);
  },

  /** Perform scrolling
   * This is called on a timeout. Arguably it should be called regularly
   */
  _perform_scroll()
  {
    if (this._scroll_needed &&
        ! this._scrolling._paused_toggle &&
        ! this._scrolling._paused_mouse)
    {
      this._scroll_1_pixel(
        this._config.headline_bar_scrolling_direction == "rtl" ? 1 : -1
      );
    }
    this._scroll_timeout = setTimeout(
      event_binder(this._perform_scroll, this),
      (30 - this._config.headline_bar_scroll_speed) * 10
    );
  },

  /** Fade the current headline in and out.
   *
   * Note: static method
   *
   * @param {hbox} news - displayed headline
   * @param {Integer} direction - makes things a little more sensible with
   *                              mousewheel scrolling
   *
   * @returns {boolean} true if completed fade in/out (so show next headline)
   */
  _fade_headline(news, direction)
  {
    news.collapsed = false;

    //To get this to fade in/out we set the opacity from 0 to 1 in 20 steps,
    //then leave as is for 40 steps, then fade out again for 20 steps.
    let opacity = 0;
    if (news.hasAttribute("data-opacity"))
    {
      opacity = parseInt(news.getAttribute("data-opacity"), 10);
    }

    news.style.opacity = (opacity < 20 ? opacity :
                          opacity > 60 ? 80 - opacity : 20) / 20;
    opacity += direction;
    if (opacity < 0 || opacity > 80)
    {
      news.removeAttribute("data-opacity");
      news.collapsed = true;
      return true;
    }

    news.setAttribute("data-opacity", opacity);
    return false;
  },

  /** Scroll the current headline lef or right
   *
   * Note: static method
   *
   * @param {hbox} news - displayed headline
   * @param {Integer} direction - +1 for left, -1 for right
   *
   * @returns {boolean} true if completed scroll (so show next headline)
   */
  _scroll_headline(news, direction)
  {
    let width = news.getAttribute("maxwidth");
    if (width == null || width == "")
    {
      width = news.boxObject.width;
      if (width != 0)
      {
        news.setAttribute("data-original-width", width);
      }
/**/if (width == 0) { console.log("help: bad width", news, new Error()) }
    }
    width = parseInt(width, 10);

    if (direction == 1)
    {
      width -= this._config.headline_bar_scroll_increment;
      if (width <= 0)
      {
        return true;
      }
    }
    else
    {
      width += this._config.headline_bar_scroll_increment;
      if (width > news.getAttribute("data-original-width"))
      {
        return true;
      }
    }

    news.setAttribute("maxwidth", width);
    news.style.minWidth = width + "px";
    news.style.maxWidth = width + "px";
    news.style.width = width + "px";
    return false;
  },

  /** Scroll the current headline by one pixel in the specified direction,
   * fade in/out
   *
   * @param {Integer} direction - -1 to scroll to right, +1 to scroll to left
   */
  _scroll_1_pixel(direction)
  {
    const news = this._headline_box.firstChild;
    if (news == null)
    {
      return;
    }

    let get_next_headline = false;
    if (this._config.headline_bar_scroll_style == this._config.Fade_Into_Next)
    {
      get_next_headline = this._fade_headline(news, direction);
    }
    else
    {
      get_next_headline = this._scroll_headline(news, direction);
    }

    if (get_next_headline)
    {
/**/console.log("next", this, news, new Error())
      this._scroll_1_headline(direction, true);
    }
  },

  /** scroll a complete headline
   *
   * @param {integer} direction - 1 for right to left, 0 for left to right
   * @param {boolean} smooth_scrolling - if set to false, will display the whole
   *                                     headline, otherwise displays enough to
   *                                     scroll.
   */
  _scroll_1_headline(direction, smooth_scrolling)
  {
    const hbox = this._headline_box;
    if (direction == 1)
    {
      //Scroll right to left
      //Take the first headline and move it at the end, restoring the size
      {
        const news = this._headline_box.firstChild;
        hbox.appendChild(news);

        const width = news.getAttribute("data-original-width");
        news.setAttribute("maxwidth", width);
        news.style.minWidth = width + "px";
        news.style.maxWidth = width + "px";
        news.style.width = width + "px";
      }

      //Now move any filtered headlines
      for (let news = this._headline_box.firstChild;
           news.hasAttribute("data-filtered");
           news = this._headline_box.firstChild)
      {
        hbox.appendChild(news);
      }
    }
    else
    {
      //Scroll left to right

      //Take the last headline and chuck it at the start, until we get one there
      //that isn't filtered
      for (let news = hbox.lastElementChild;
           news.hasAttribute("data-filtered");
           news = hbox.lastElementChild)
      {
        hbox.insertBefore(news, hbox.firstChild);
      }

      const news = hbox.lastElementChild;

      {
        let width = news.getAttribute("maxwidth");
        if ((width == null) || (width == ""))
        {
/**/console.log("Seriously?", news, width, news.getAttribute("data-original-width"))
          news.setAttribute("data-original-width", news.boxObject.width);
        }
      }

      if (smooth_scrolling)
      {
        news.setAttribute("maxwidth", "1");
        news.style.minWidth = "1px";
        news.style.maxWidth = "1px";
        news.style.width = "1px";
      }

      hbox.insertBefore(news, hbox.firstChild);
    }
  },

  /** Handle the 'DOMMouseScroll' event
   *
   * When the mouse wheel is rotated, the headline bar will be scrolled
   * left or right (amount depending on configuration).
   *
   * @param {MouseScrollEvent} event - event to handle
   */
  _mouse_scroll(event)
  {
    const direction = event.detail;
    const dir = Math.sign(direction);
    const scroll = this._config.headline_bar_mousewheel_scroll;
    switch (scroll)
    {
      default:
        debug(new Error("Unknown scroll behaviour: " + scroll));
        break;

      case this._config.By_Pixel:
        {
          const end = Math.abs(direction);
          for (let pixno = 0; pixno < end; pixno++)
          {
            this._scroll_1_pixel(dir);
          }
        }
        break;

      case this._config.By_Pixels:
        for (let pixno = 0; pixno < 10; pixno++)
        {
          this._scroll_1_pixel(dir);
        }
        break;

      case this._config.By_Headline:
        this._scroll_1_headline(dir, false);
        break;
    }
  },

  /** mouse down on headline will generally display or ignore the news page
   *
   * @param {MouseEvent} event - mouse down event
   */
  __mouse_down_handler(event)
  {
    const link = event.currentTarget.getAttribute("link");
    const title = event.currentTarget.getElementsByTagName(
      "label")[0].getAttribute("data-title");
    if (event.button == 0 && ! event.ctrlKey && ! event.shiftKey)
    {
      //normal click
      if (event.target.hasAttribute("inforss"))
      {
        //Clicked on banned icon
        mediator.set_headline_banned(title, link);
      }
      else if (event.target.hasAttribute("data-playEnclosure"))
      {
        //clicked on enclosure icon
        this.open_link(event.target.getAttribute("data-playEnclosure"));
      }
      else
      {
        //clicked on icon or headline
        mediator.set_headline_viewed(title, link);
        this.open_link(link);
      }
    }
    else if (event.button == 1 ||
             //eslint-disable-next-line no-extra-parens
             (event.button == 0 && ! event.ctrlKey && event.shiftKey))
    {
      //shift click or middle button
      this._toggle_pause(/*event*/); //FIXME Why? Also document.
      ClipboardHelper.copyString(link);
    }
    else if (event.button == 2 ||
             //eslint-disable-next-line no-extra-parens
             (event.button == 0 && event.ctrlKey && ! event.shiftKey))
    {
      //control click or right button
      mediator.set_headline_banned(title, link);
    }
  },

  //FIXME This should be a utility function. Possibly in mediator? It does need
  //config repo so that seems best.
  /** open headline in browser
   *
   * @param {string} link - url to open
   */
  open_link(link)
  {
    let behaviour = this._config.headline_action_on_click;

    if (behaviour == this._config.New_Default_Tab)
    {
      behaviour = Browser_Tab_Prefs.getBoolPref("loadInBackground") ?
        this._config.New_Background_Tab :
        this._config.New_Foreground_Tab;
    }

    const window = this._document.defaultView;
    switch (behaviour)
    {
      default:
        debug(new Error("Unknown behaviour: " + behaviour));
        break;

      case this._config.New_Background_Tab:
        if (should_reuse_current_tab(window))
        {
          window.gBrowser.loadURI(link);
        }
        else
        {
          window.gBrowser.addTab(link);
        }
        break;

      case this._config.New_Foreground_Tab: // in tab, foreground
        if (should_reuse_current_tab(window))
        {
          window.gBrowser.loadURI(link);
        }
        else
        {
          window.gBrowser.selectedTab = window.gBrowser.addTab(link);
        }
        break;

      case this._config.New_Window:
        window.open(link, "_blank");
        break;

      case this._config.Current_Tab:
        window.gBrowser.loadURI(link);
        break;
    }
  },

  /** Starts scrolling the headline bar (or collapses if necessary */
  start_scrolling()
  {
    const hbox = this._headline_box;
    hbox.collapsed = false;
    if (this._prepare_for_scrolling())
    {
      if (this._scroll_needed)
      {
        this._start_scrolling();
      }
    }
    else
    {
      //eslint-disable-next-line no-lonely-if
      if (this._config.headline_bar_location == this._config.in_status_bar &&
          this._had_addon_bar &&
          this._config.headline_bar_collapsed)
      {
        hbox.collapsed = true;
      }
    }
  },

  /** Prepare for scrolling
   *
   * Works out required width of headlines to see if we need to scroll
   * Sets this._scroll_needed as appropriate.
   *
   * @returns {boolean} true if there are any non filtered headlines
   */
  _prepare_for_scrolling()
  {
    const scroll_style = this._config.headline_bar_scroll_style;
    const hbox = this._headline_box;

    let width = 0;
    let count = 0;
    for (const news of Array.from(hbox.childNodes))
    {
      if (news.hasAttribute("data-filtered"))
      {
        hbox.appendChild(news);
        continue;
      }

      ++count;
      if (news.hasAttribute("data-original-width"))
      {
        width += parseInt(news.getAttribute("data-original-width"), 10);
      }
      else if (news.hasAttribute("width"))
      {
        width += parseInt(news.getAttribute("width"), 10);
      }
      else
      {
        width += news.boxObject.width;
      }

      news.collapsed = scroll_style == this._config.Fade_Into_Next &&
                       ! news.hasAttribute("data-opacity");
    }

    if (count == 0)
    {
      this._scroll_needed = false;
      return false;
    }

    switch (scroll_style)
    {
      default:
        debug(new Error("Unknown scroll style: " + scroll_style));
        //eslint-disable-next-line lines-around-comment
        /* falls through */

      case this._config.Static_Display:
        this._scroll_needed = false;
        break;

      case this._config.Scrolling_Display:
        this._scroll_needed = width > hbox.boxObject.width;
/**/console.log("needed", width, hbox.boxObject.width)
        if (! this._scroll_needed)
        {
          const first_news = hbox.firstChild;
          if (first_news.hasAttribute("data-original-width"))
          {
            const orig_width = first_news.getAttribute("data-original-width");
            first_news.setAttribute("maxwidth", orig_width);
            first_news.style.minWidth = orig_width + "px";
            first_news.style.maxWidth = orig_width + "px";
            first_news.style.width = orig_width + "px";
          }
        }
        break;

      case this._config.Fade_Into_Next:
        this._scroll_needed = true;
    }

    return true;
  },

  /** Toggle scrolling
   *
   * unused @param {Event} event - event causing the state change
   */
  _toggle_scrolling(/*event*/)
  {
    this._config.toggleScrolling();
    this.init();

    //FIXME It's not entirely clear to me how we can get to a situation
    //where this button is pressed while we're trying to resize.
    this._resize_button.disable_resize();
    this._mediator.refreshBar(); //headline_bar
  },

  /** Control quick filter. Pops up the quick filter prompt and filters
   * displayed headlines accordingly
   *
   * unused @param {Event} event - event causing the state change
   */
  _quick_filter(/* event*/)
  {
    if (option_window_displayed())
    {
      alert(get_string("option.dialogue.open"));
      return;
    }

    const res = prompt("quick.filter",
                       this._config.quick_filter_text,
                       "quick.filter.title",
                       "apply",
                       this._config.quick_filter_active);
    if (res != null)
    {
      this._config.quick_filter_text = res.input;
      this._config.quick_filter_active = res.checkbox;
      this._config.save();
      this._update_command_buttons();
      for (const label of this._headline_box.getElementsByTagName("label"))
      {
        if (label.hasAttribute("data-title"))
        {
          const news = label.parentNode;
          this._apply_quick_filter(news, label.getAttribute("data-title"));
        }
      }
      this.start_scrolling();
    }
  },

  /** toggle pause state
   *
   * unused @param {Event} event - event causing the state change
   */
  _toggle_pause(/*event*/)
  {
    if (this._config.headline_bar_scroll_style != this._config.Static_Display)
    {
      this._scrolling._paused_toggle = ! this._scrolling._paused_toggle;
      this._update_command_buttons();
      this.start_scrolling();
    }
  },

  /** Switch shuffle style between 'next' and 'random'
   *
   * unused @param {Event} event - event causing the state change
   */
  _switch_shuffle_style(/*event*/)
  {
    if (option_window_displayed())
    {
      alert(get_string("option.dialogue.open"));
      return;
    }
    this._config.switchShuffle();
    this._update_command_buttons();
  },

  /** Switch scroll direction
   *
   * unused @param {Event} event - event causing the state change
   */
  _switch_scroll_direction(/*event*/)
  {
    if (option_window_displayed())
    {
      alert(get_string("option.dialogue.open"));
      return;
    }
    this._config.switchDirection();
    this._update_command_buttons();
  },

  /** Resize window event - this waits for 1 second for size to stabilise
   *
   * unused @param {ResizeEvent} event - window resize event
   */
  _resize_window(/*event*/)
  {
    clearTimeout(this._resize_timeout);

    // Arguably we could switch the event handler on/off during init, but this
    // is probably easier.
    if (this._config.headline_bar_location == this._config.in_status_bar)
    {
      this._resize_timeout = setTimeout(event_binder(this.resizedWindow, this),
                                        1000);
    }
  },

  //----------------------------------------------------------------------------
  //note this is called both the main window via the mediator and from
  //the resize icon code on mouse release
  resizedWindow()
  {
    //FIXME Messy
    //What is it actually doing anyway?
    var hbox = this._headline_box;
    var width = this._config.status_bar_scrolling_area;
    var found = false;
    hbox.width = width;
    hbox.style.width = width + "px";

    var hl = this._document.getElementById("inforss.headlines");

    if (hbox.collapsed)
    {
      found = true;
      width--;
    }
    var oldX = hbox.boxObject.screenX;
    if (!found)
    {
      while (width > 0)
      {
        hbox.width = width;
        hbox.style.width = width + "px";
        const newX = hbox.boxObject.screenX;
        if (newX == oldX)
        {
          width--;
        }
        else
        {
          break;
        }
      }
    }
    width++;
    hbox.width = width;
    hbox.style.width = width + "px";
  },

};
