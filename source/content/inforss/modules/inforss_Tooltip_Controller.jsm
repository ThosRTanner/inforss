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
  "Tooltip_Controller", /* exported Tooltip_Controller */
];
/* eslint-enable array-bracket-newline */

const { debug } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Debug.jsm",
  {}
);

const { event_binder, htmlFormatConvert } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Utils.jsm",
  {}
);

const { get_string } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Version.jsm",
  {}
);

const mediator = {};
Components.utils.import(
  "chrome://inforss/content/mediator/inforss_Mediator_API.jsm",
  mediator);

/**/const { console } =
/**/  Components.utils.import("resource://gre/modules/Console.jsm", {});

const INFORSS_TOOLTIP_BROWSER_WIDTH = 600;
const INFORSS_TOOLTIP_BROWSER_HEIGHT = 400;

const ParserUtils = Components.classes[
  "@mozilla.org/parserutils;1"].getService(
  Components.interfaces.nsIParserUtils);

/** Creates a tooltip and controls the up-poppingness.
 *
 * @class
 *
 * @param {Config} config - Configuration.
 * @param {Document} document - Top level browser document.
 * @param {string} id - To differentiate between different tooltip clients
 */
function Tooltip_Controller(config, document, id)
{
  this._config = config;
  this._document = document;

  this._tooltip_open = event_binder(this.__tooltip_open, this);
  this._tooltip_close = event_binder(this.__tooltip_close, this);
  this._tooltip_mouse_move = event_binder(this.__tooltip_mouse_move, this);
  this._tooltip_X = -1;
  this._tooltip_Y = -1;
  this._tooltip_browser = null;
  this._has_active_tooltip = true;
  this._tooltips = this._document.getElementById("inforss.tooltips");
  this._tooltip_id_base = "inforss.tooltip." + id + ".";
}

Tooltip_Controller.prototype = {

  /** Check if there's a tooltip currently displayed.
   *
   * @returns {boolean} True if a tooltip is currently displayed
   */
  get has_active_tooltip()
  {
    return this._has_active_tooltip;
  },

  /** Create a tooltip for the supplied headline.
   *
   * @param {Headline} headline - Headline to which to add tooltip.
   *
   * @returns {string} The new tooltip id.
   */
  create_tooltip(headline)
  {
    const id = this._tooltip_id_base + headline.guid;

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
    tooltip.append(this._fill_tooltip(headline));

    tooltip.addEventListener("popupshown", this._tooltip_open);
    tooltip.addEventListener("popuphiding", this._tooltip_close);

    this._tooltips.append(tooltip);
    headline.tooltip = tooltip;

    return id;
  },

  /** Get the text for the tooltip.
   *
   * @param {Headline} headline - Headline for which we want a tooltip.
   *
   * @returns {string} Appropriate text.
   */
  _get_tooltip_text(headline)
  {
    switch (this._config.headline_tooltip_style)
    {
      default:
        debug("Unknown tooltip style: " + this._config.headline_tooltip_style);
        /* eslint-disable-next-line lines-around-comment */
        /* fall through */

      case "allInfo":
      {
        const container = this._document.createElement("hbox");
        const fragment = ParserUtils.parseFragment(
          headline.description,
          0,
          false,
          null,
          container);

        const feed = headline.feed;
        return "<TABLE width='100%' \
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
          ": </B></TD><TD>" + feed.getUrl() +
          "</TD></TR><TR><TD align='right'><B>" + get_string("link") +
          ": </B></TD><TD>" + headline.link +
          "</TD></TR></TABLE><br>" + fragment.textContent;
      }

      case "description":
      {
        const container = this._document.createElement("hbox");
        const fragment = ParserUtils.parseFragment(
          headline.description,
          0,
          false,
          null,
          container);
        return fragment.textContent;
      }

      case "title":
      {
        const container = this._document.createElement("hbox");
        const fragment = ParserUtils.parseFragment(
          headline.title,
          0,
          false,
          null,
          container);
        return fragment.textContent;
      }
    }
  },

  /** Create the displayable contents of the tooltip.
   *
   * @param {Headline} headline - Headline for which to create tooltip.
   *
   * @returns {hbox} Box to display.
   */
  _fill_tooltip(headline)
  {
    const tooltip_is_browser =
      this._config.headline_tooltip_style === "article";

    const toolHbox = this._document.createElement("hbox");
    toolHbox.setAttribute("flex", "1");

    if (tooltip_is_browser)
    {
      const vbox = this._document.createElement("vbox");
      vbox.setAttribute("flex", "1");
      const br = this._document.createElement("browser");
      vbox.appendChild(br);
      br.setAttribute("flex", "1");
      br.srcUrl = headline.link;
      toolHbox.appendChild(vbox);
    }
    else
    {
      if (headline.enclosureUrl != null)
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

      const vbox = this._document.createElement("vbox");
      vbox.setAttribute("flex", "1");
      let tooltip_contents = htmlFormatConvert(
        this._get_tooltip_text(headline)
      );
      if (tooltip_contents.includes("<") && tooltip_contents.includes(">"))
      {
        //FIXME Is this actually possible?
/**/console.log("found html")
        const br = this._document.createElement("iframe");
        vbox.appendChild(br);
        br.setAttribute("tooltip_type", "content-targetable");
        br.setAttribute(
          "src",
          "data:text/html;charset=utf-8,<html><body>" +
            encodeURIComponent(tooltip_contents) + "</body></html>"
        );
        br.setAttribute("flex", "1");
        br.style.overflow = "auto";
        br.style.width = INFORSS_TOOLTIP_BROWSER_WIDTH + "px";
        br.style.height = INFORSS_TOOLTIP_BROWSER_HEIGHT + "px";
      }
      else if (tooltip_contents != "")
      {
        //Break this up into lines of 60 characters.
        //FIXME I'm pretty sure this sort of thing occurs elsewhere
        do
        {
          let j = tooltip_contents.length > 60 ? tooltip_contents.lastIndexOf(' ', 60) : -1;
          if (j == -1)
          {
            j = 60;
          }
          const description = this._document.createElement("label");
          description.setAttribute("value", tooltip_contents.substring(0, j).trim());
          vbox.appendChild(description);
          tooltip_contents = tooltip_contents.substring(j + 1).trim();
        } while (tooltip_contents != "");
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
    this._has_active_tooltip = true;

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
      this._tooltip_X = -1;
      this._tooltip_Y = -1;
    }
    tooltip.setAttribute("noautohide", "true");

    if (this._document.tooltipNode != null)
    {
      this._document.tooltipNode.addEventListener("mousemove",
                                                  this._tooltip_mouse_move);
    }
  },

  /** Deal with tooltip hiding.
   *
   * @param {PopupEvent} event - Event details.
   */
  __tooltip_close(event)
  {
    this._has_active_tooltip = false;

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
