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
// inforss_Tooltip
// Author : Tom Tanner, 2023
// Inforss extension
//------------------------------------------------------------------------------
/* jshint globalstrict: true */
/* eslint-disable strict */
"use strict";

/* eslint-disable array-bracket-newline */
/* exported EXPORTED_SYMBOLS */
const EXPORTED_SYMBOLS = [
  "Headline_Tooltip", /* exported Headline_Tooltip */
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
  reverse
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

/**/const { console } =
/**/  Components.utils.import("resource://gre/modules/Console.jsm", {});

const { clearTimeout, setTimeout } = Components.utils.import(
  "resource://gre/modules/Timer.jsm",
  {}
);

const INFORSS_TOOLTIP_BROWSER_WIDTH = 600;
const INFORSS_TOOLTIP_BROWSER_HEIGHT = 400;

const ParserUtils = Components.classes[
  "@mozilla.org/parserutils;1"].getService(
  Components.interfaces.nsIParserUtils);

const ClipboardHelper = Components.classes[
  "@mozilla.org/widget/clipboardhelper;1"].getService(
  Components.interfaces.nsIClipboardHelper);

const Sound = Components.classes["@mozilla.org/sound;1"].getService(
  Components.interfaces.nsISound);

const Icon_Size = 16;
const Spacer_Width = 5;

/** Creates a tooltip and controls the up-poppingness.
 *
 * @class
 * @param {Config} config - Configuration.
 * @param {Document} document - Top level browser document.
 */
function Tooltip_Controller(config, document)
{

  //this._mediator = mediator_;
  this._config = config;

  this._document = document;
  /*
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
  */
  this._tooltip_open = event_binder(this.__tooltip_open, this);
  this._tooltip_close = event_binder(this.__tooltip_close, this);
  this._tooltip_mouse_move = event_binder(this.__tooltip_mouse_move, this);
  this._tooltip_X = -1;
  this._tooltip_Y = -1;
  this._tooltip_browser = null;
/*
  const box = document.getElementById("inforss.newsbox1");
  this._headline_box = box;

  this._resize_button = new Resize_Button(config,
                                          this,
                                          document,
                                          box,
                                          addon_bar);

  this._had_addon_bar = addon_bar.id != "inforss-addon-bar";
*/
  /* eslint-disable array-bracket-newline */
  /*
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
  */
  /* eslint-enable array-bracket-newline */
}

Tooltip_Controller.prototype = {

//-------------------------------------------------------------------------------------------------------------
  //FIXME called from Feed_Manager during cycle_feed. is this meaningful?
  //This is needed in the main headline handler to stop cycling feed during
  //a mouseover so we need to die this in somehow
  isActiveTooltip()
  {
    return this._active_tooltip;
  },

  /** Create a tooltip for the supplied headline.
   *
   * @param {Feed} feed - Feed from which headline came.
   * @param {Headline} headline - Headline to which to add tooltip.
   *
   * @returns {string} The new tooltip id.
   */
  create_tooltip(feed, headline)
  {
    let tooltip_contents = "";
    let tooltip_type = "text";

    switch (this._config.headline_tooltip_style)
    {
      default:
        debug("Unknown tooltip style: " + this._config.headline_tooltip_style);
        /* eslint-disable-next-line lines-around-comment */
        /* fall through */

      case "article":
        tooltip_contents = feed.get_link(headline); //headline.link
        tooltip_type = "url";
        break;

      case "description":
        {
          const container = this._document.createElement("hbox");
          const fragment = ParserUtils.parseFragment(
            feed.get_description(headline), //headline.description
            0,
            false,
            null,
            container);
          tooltip_contents = fragment.textContent;
        }
        break;

      case "title":
        {
          const container = this._document.createElement("hbox");
          const fragment = ParserUtils.parseFragment(
            feed.get_title(headline), //headline.title
            0,
            false,
            null,
            container);
          tooltip_contents = fragment.textContent;
        }
        break;

      case "allInfo":
        {
          const container = this._document.createElement("hbox");
          const fragment = ParserUtils.parseFragment(
            feed.get_description(headline), //headline.description
            0,
            false,
            null,
            container);

        //  const feed = headline.feed;

          tooltip_contents = "<TABLE width='100%' \
style='background-color:#2B60DE; color:white; -moz-border-radius: 10px; \
padding: 6px'><TR><TD colspan=2 align=center \
style='border-bottom-style:solid; border-bottom-width:1px '><B><img src='" +
            feed.getIcon() +
            "' width=16px height=16px> " + feed.getTitle() +
            "</B></TD></TR><TR><TD align='right'><B>" + get_string("title") +
            ": </B></TD><TD>" + headline.title +
            "</TD></TR><TR><TD align='right'><B>" + get_string("date") +
            ": </B></TD><TD>" + headline.publishedDate +
            "</TD></TR><TR><TD align='right'><B>" + get_string("rss") +
            ": </B></TD><TD>" + headline.url +
            "</TD></TR><TR><TD align='right'><B>" + get_string("link") +
            ": </B></TD><TD>" + headline.link +
            "</TD></TR></TABLE><br>" + fragment.textContent;
        }
        break;
    }

    const id = "inforss.headline.tooltip." + "magic." + feed.get_guid(headline); //headline.guid;

    {
      const oldtip = this._document.getElementById(id);
      if (oldtip !== null)
      {
        oldtip.remove();
      }
    }

    const tooltip = this._document.createElement("tooltip");
    tooltip.setAttribute("id", id);
    tooltip.setAttribute("position", "before_end");
    tooltip.setAttribute("noautohide", true);
    tooltip.append(
      this._fill_tooltip(headline, tooltip_contents, tooltip_type)
    );

    //FIXME need to remove these somehow?
    tooltip.addEventListener("popupshown", this._tooltip_open);
    tooltip.addEventListener("popuphiding", this._tooltip_close);

    this._document.getElementById("inforss.tooltips").append(tooltip);
    return id;
  },

  //----------------------------------------------------------------------------
  //FIXME this is unnecessarily complex
  _fill_tooltip(headline, str, type)
  {
    const toolHbox = this._document.createElement("hbox");
    toolHbox.setAttribute("flex", "1");
    if (headline.enclosureUrl != null &&
        this._config.headline_tooltip_style != "article")
    {
      const vbox = this._document.createElement("vbox");
      vbox.setAttribute("flex", "0");
      vbox.style.backgroundColor = "inherit";
      if (headline.enclosureType.startsWith("audio/") ||
          headline.enclosureType.startsWith("video/"))
      {
        vbox.setAttribute("enclosureUrl", headline.enclosureUrl);
        vbox.setAttribute("enclosureType", headline.enclosureType);
        vbox.headline = headline;
      }
      else
      {
        const img = this._document.createElement("image");
        img.setAttribute("src", headline.enclosureUrl);
        vbox.appendChild(img);
      }

      const spacer = this._document.createElement("spacer");
      spacer.setAttribute("width", "10");
      vbox.appendChild(spacer);

      toolHbox.appendChild(vbox);
    }

    {
      const vbox = this._document.createElement("vbox");
      vbox.setAttribute("flex", "1");
      if (type == "text")
      {
        str = htmlFormatConvert(str);
        if (str != null && str.indexOf("<") != -1 && str.indexOf(">") != -1)
        {
          let br = this._document.createElement("iframe");
          vbox.appendChild(br);
          br.setAttribute("type", "content-targetable");
          br.setAttribute(
            "src",
            "data:text/html;charset=utf-8,<html><body>" +
              encodeURIComponent(str) + "</body></html>"
          );
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

      toolHbox.appendChild(vbox);
    }

    return toolHbox;
  },

  /** Deal with showing tooltip.
   *
   * @param {PopupEvent} event - Tooltip showing event.
   */
  __tooltip_open(event)
  {
/**/console.log(event)
    this._active_tooltip = true;

    const tooltip = event.target;
    for (const vbox of tooltip.getElementsByTagName("vbox"))
    {
/**/console.log(vbox);
      if (vbox.hasAttribute("enclosureUrl") &&
          vbox.headline.feed.feedXML.getAttribute("playPodcast") == "true")
      {
/**/console.log(vbox);
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
/**/console.log("done")
  },

  /** Deal with tooltip hiding.
   *
   * @param {PopupEvent} event - Event details.
   */
  __tooltip_close(event)
  {
/**/console.log(event)
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

  /** Deal with tooltip mouse movement.
   *
   * @param {MouseEvent} event - Event details.
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

};
