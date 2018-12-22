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
// inforssHeadlineDisplay
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------
var inforss = inforss || {};
Components.utils.import("chrome://inforss/content/modules/inforss_Debug.jsm",
                        inforss);

Components.utils.import("chrome://inforss/content/modules/inforss_Notifier.jsm",
                        inforss);

Components.utils.import("chrome://inforss/content/modules/inforss_Timeout.jsm",
                        inforss);

Components.utils.import("chrome://inforss/content/modules/inforss_Utils.jsm",
                        inforss);

Components.utils.import(
  "chrome://inforss/content/toolbar/inforss_Resize_Button.jsm",
  inforss);

//FIXME Only thing which stops this being a module is uses of 'window' and 'gBrowser'
//window appears to be gBrowser.ownerglobal
//so we could probably implement that in utils (Main_Icon could use it to)
//or better document.defaultView for window and document.defaultView.gBrowser
//for gBrowser

//A LOT hacky. Hopefully this will be a module soon
/* eslint strict: "off" */

const INFORSS_TOOLTIP_BROWSER_WIDTH = 600;
const INFORSS_TOOLTIP_BROWSER_HEIGHT = 400;


const UnescapeHTMLService = Components.classes[
  "@mozilla.org/feed-unescapehtml;1"].getService(
  Components.interfaces.nsIScriptableUnescapeHTML);

const ClipboardHelper = Components.classes[
  "@mozilla.org/widget/clipboardhelper;1"].getService(
  Components.interfaces.nsIClipboardHelper);

/** Headline display class.
 *
 * Controls scrolling of the headline display.
 *
 * @param {object} mediator - class which allows communication to feed manager
 *                            and the box containing the display
 * @param {object} config   - inforss configuration
 * @param {object} document - top level document
 *
 * @returns {object} this
 */
function inforssHeadlineDisplay(mediator, config, document)
{
  this._mediator = mediator;
  this._config = config;
  this._document = document;

  this._can_scroll = true;
  this._scroll_needed = true;
  this._scroll_timeout = null;
  this._notifier = new inforss.Notifier();
  this._active_tooltip = false;
  this._mouse_down_handler = this.__mouse_down_handler.bind(this);
  this._tooltip_open = this.__tooltip_open.bind(this);
  this._tooltip_close = this.__tooltip_close.bind(this);
  this._tooltip_mouse_move = this.__tooltip_mouse_move.bind(this);
  this._tooltip_X = -1;
  this._tooltip_Y = -1;
  this._tooltip_browser = null;
  this._spacer_end = null;

  const box = document.getElementById("inforss.newsbox1");
  this._headline_box = box;
  this._resize_button = new inforss.Resize_Button(config, this, document, box);

  this._mouse_scroll = this.__mouse_scroll.bind(this);
  //FIXME Should probably use the 'wheel' event
  box.addEventListener("DOMMouseScroll", this._mouse_scroll);

  this._pause_scrolling = this.__pause_scrolling.bind(this);
  box.addEventListener("mouseover", this._pause_scrolling);
  this._resume_scrolling = this.__resume_scrolling.bind(this);
  box.addEventListener("mouseout", this._resume_scrolling);

  return this;
}

inforssHeadlineDisplay.prototype = {

  //FIXME get rid of all the 2 phase initialisation
  //----------------------------------------------------------------------------
  init()
  {
    var news = this._headline_box.firstChild;
    //FIXME how can that ever be null?
    if ((news != null) && (news.getAttribute("id") != "inforss-spacer-end"))
    {
      if (this._config.headline_bar_scroll_style == this._config.Fade_Into_Next)
      {
        let other = news.nextSibling;
        while (other != null)
        {
          if (other.getAttribute("id") != "inforss-spacer-end")
          {
            other.setAttribute("collapsed", "true");
          }
          other = other.nextSibling;
        }
      }
      else
      {
        let other = news;
        while (other != null)
        {
          if (other.getAttribute("id") != "inforss-spacer-end")
          {
            if ((other.hasAttribute("filtered") == false) || (other.getAttribute("filtered") == "false"))
            {
              other.setAttribute("collapsed", "false");
              other.style.opacity = "1";
            }
            else
            {
              other.setAttribute("collapsed", "true");
            }
          }
          other = other.nextSibling;
        }
      }
    }
    this._document.getElementById('inforss-hbox').setAttribute(
      "collapsed",
      this._config.headline_bar_enabled ? "false" : "true");
  },

  //-------------------------------------------------------------------------------------------------------------
  removeDisplay(feed)
  {
    inforss.traceIn(this);
    try
    {
      for (let headline of feed.getDisplayedHeadlines())
      {
        this.removeFromScreen(headline);
      }
      if (this._headline_box.childNodes.length <= 1)
      {
        this._stop_scrolling();
      }
      feed.clearDisplayedHeadlines();
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    inforss.traceOut();
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
    inforss.clearTimeout(this._scroll_timeout);
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
      this._scroll_timeout = inforss.setTimeout(
        this._scroll.bind(this),
        this._config.headline_bar_scroll_style == this._config.Fade_Into_Next ?
          0 :
          1800
      );
    }
  },

  /** Pause scrolling
   *
   * ignored param {MouseEventEvent} event details
   */
  __pause_scrolling()
  {
    if (this._config.headline_bar_stop_on_mouseover)
    {
      this._can_scroll = false;
    }
  },

  /** Resume scrolling
   *
   * ignored param {MouseEventEvent} event details
   */
  __resume_scrolling()
  {
    if (this._config.headline_bar_stop_on_mouseover)
    {
      this._can_scroll = true;
      this._prepare_for_scrolling();
    }
  },
  //-------------------------------------------------------------------------------------------------------------
  resetDisplay()
  {
    inforss.traceIn();
    try
    {
      inforss.remove_all_children(this._headline_box);
      this._spacer_end = null;
      this._stop_scrolling();
    }
    finally
    {
      inforss.traceOut();
    }
  },

  //----------------------------------------------------------------------------
  removeFromScreen(headline)
  {
    inforss.traceIn(this);
    try
    {
      headline.resetHbox();
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    inforss.traceOut();
  },

  //----------------------------------------------------------------------------
  purgeOldHeadlines(feed)
  {
    inforss.traceIn(this);
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
    catch (e)
    {
      inforss.debug(e, this);
    }
    inforss.traceOut();
  },

  //----------------------------------------------------------------------------
  createHbox(feed, headline, hbox, maxTitleLength, lastInserted)
  {
    inforss.traceIn(this);
    let container = null;
    try
    {
      let rss = feed.feedXML;
      let label = headline.title;
      let initialLabel = label;
      let link = headline.link;
      let description = headline.description;
      if ((label != null) && (label.length > maxTitleLength))
      {
        label = label.substring(0, maxTitleLength);
      }

      container = this._document.createElement("hbox");
      if (this._config.headline_bar_scroll_style == this._config.Fade_Into_Next)
      {
        container.setAttribute("collapsed", "true");
      }
      container.setAttribute("link", link);
      container.setAttribute("flex", "0");
      container.style.fontFamily = this._config.headline_font_family;
      container.style.fontSize = this._config.headline_font_size;
      container.setAttribute("pack", "end");

      if (this._config.headline_shows_feed_icon)
      {
        let vbox = this._document.createElement("vbox");
        container.appendChild(vbox);
        let spacer = this._document.createElement("spacer");
        vbox.appendChild(spacer);
        spacer.setAttribute("flex", "1");
        let image = this._document.createElement("image");
        vbox.appendChild(image);
        image.setAttribute("src", rss.getAttribute("icon"));
        image.setAttribute("maxwidth", "16");
        image.setAttribute("maxheight", "16");

        image.style.maxWidth = "16px";
        image.style.maxHeight = "16px";

        spacer = this._document.createElement("spacer");
        vbox.appendChild(spacer);
        spacer.setAttribute("flex", "1");
      }

      const itemLabel = this._document.createElement("label");
      itemLabel.setAttribute("title", initialLabel);
      container.appendChild(itemLabel);
      if (label.length > feed.getLengthItem())
      {
        label = label.substring(0, feed.getLengthItem());
      }
      if (rss.getAttribute("icon") == this._config.Default_Feed_Icon)
      {
        label = "(" + ((rss.getAttribute("title").length > 10) ? rss.getAttribute("title").substring(0, 10) : rss.getAttribute("title")) + "):" + label;
      }
      else if (label == "")
      {
        label = "(no title)";
      }
      itemLabel.setAttribute("value", label);
      if (headline.enclosureType != null &&
          this._config.headline_shows_enclosure_icon)
      {
        let vbox = this._document.createElement("vbox");
        container.appendChild(vbox);
        let spacer = this._document.createElement("spacer");
        vbox.appendChild(spacer);
        spacer.setAttribute("flex", "1");
        let image = this._document.createElement("image");
        vbox.appendChild(image);
        if (headline.enclosureType.indexOf("audio/") != -1)
        {
          image.setAttribute("src", "chrome://inforss/skin/speaker.png");
          image.setAttribute("playEnclosure", headline.enclosureUrl);
        }
        else
        {
          if (headline.enclosureType.indexOf("image/") != -1)
          {
            image.setAttribute("src", "chrome://inforss/skin/image.png");
          }
          else
          {
            if (headline.enclosureType.indexOf("video/") != -1)
            {
              image.setAttribute("src", "chrome://inforss/skin/movie.png");
              image.setAttribute("playEnclosure", headline.enclosureUrl);
            }
          }
        }
        vbox.setAttribute("tooltip", "_child");
        const tooltip1 = this._document.createElement("tooltip");
        vbox.appendChild(tooltip1);
        const vbox1 = this._document.createElement("vbox");
        tooltip1.appendChild(vbox1);
        let description1 = this._document.createElement("label");
        description1.setAttribute("value", inforss.get_string("url") + ": " + headline.enclosureUrl);
        vbox1.appendChild(description1);
        description1 = this._document.createElement("label");
        description1.setAttribute("value", inforss.get_string("enclosure.type") + ": " + headline.enclosureType);
        vbox1.appendChild(description1);
        description1 = this._document.createElement("label");
        description1.setAttribute("value", inforss.get_string("enclosure.size") + ": " + headline.enclosureSize + " " + inforss.get_string("enclosure.sizeUnit"));
        vbox1.appendChild(description1);

        spacer = this._document.createElement("spacer");
        vbox.appendChild(spacer);
        spacer.setAttribute("flex", "1");
      }


      if (this._config.headline_shows_ban_icon)
      {
        const vbox = this._document.createElement("vbox");
        container.appendChild(vbox);
        let spacer = this._document.createElement("spacer");
        vbox.appendChild(spacer);
        spacer.setAttribute("flex", "1");
        const image = this._document.createElement("image");
        vbox.appendChild(image);
        image.setAttribute("src", "chrome://inforss/skin/closetab.png");
        image.setAttribute("inforss", "true");
        spacer = this._document.createElement("spacer");
        vbox.appendChild(spacer);
        spacer.setAttribute("flex", "1");
      }

      let spacer = this._document.createElement("spacer");
      spacer.setAttribute("width", "5");
      spacer.setAttribute("flex", "0");
      container.appendChild(spacer);
      hbox.insertBefore(container, lastInserted);

      container.addEventListener("mousedown", this._mouse_down_handler, false);
      if ((this._config.isQuickFilterActif()) && (initialLabel != null) &&
        (initialLabel != "") && (initialLabel.toLowerCase().indexOf(this._config.getQuickFilter().toLowerCase()) == -1))
      {
        let width = container.boxObject.width;
        container.setAttribute("originalWidth", width);
        container.setAttribute("collapsed", "true");
        container.setAttribute("filtered", "true");
      }
      else
      {
        container.setAttribute("filtered", "false");
      }
      let tooltip_contents = "";
      let tooltip_type = "text";

      switch (this._config.headline_tooltip_style)
      {
        case "description":
          {
            let fragment = UnescapeHTMLService.parseFragment(description, false, null, container);
            tooltip_contents = fragment.textContent;
            break;
          }
        case "title":
          {
            let fragment = UnescapeHTMLService.parseFragment(headline.title, false, null, container);
            tooltip_contents = fragment.textContent;
            break;
          }
        case "allInfo":
          {
            let fragment = UnescapeHTMLService.parseFragment(description, false, null, container);

            tooltip_contents = "<TABLE width='100%' style='background-color:#2B60DE; color:white; -moz-border-radius: 10px; padding: 6px'><TR><TD colspan=2 align=center style='border-bottom-style:solid; border-bottom-width:1px '><B><img src='" + feed.getIcon() + "' width=16px height=16px> " + feed.getTitle() + "</B></TD></TR><TR><TD align='right'><B>" + inforss.get_string("title") + ": </B></TD><TD>" + headline.title + "</TD></TR><TR><TD align='right'><B>" + inforss.get_string("date") + ": </B></TD><TD>" + headline.publishedDate + "</TD></TR><TR><TD align='right'><B>" + inforss.get_string("rss") + ": </B></TD><TD>" + headline.url + "</TD></TR><TR><TD align='right'><B>" + inforss.get_string("link") + ": </B></TD><TD>" + headline.link + "</TD></TR></TABLE><br>" + fragment.textContent;
            break;
          }
        //case "article":
        default:
          {
            tooltip_contents = headline.link;
            tooltip_type = "url";
            break;
          }
      }
      const tooltip = this.fillTooltip(itemLabel, headline, tooltip_contents, tooltip_type);
      headline.setHbox(container, tooltip);
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    finally
    {
      inforss.traceOut();
    }

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
    const vbox = inforss.replace_without_children(vboxs[vboxs.length - 1]);
    if (type == "text")
    {
      str = inforss.htmlFormatConvert(str);
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
      if (headline.enclosureType.indexOf("image") == 0)
      {
        const img = this._document.createElement("image");
        img.setAttribute("src", headline.enclosureUrl);
        vbox1.appendChild(img);
      }
      else
      {
        if (headline.enclosureType.indexOf("audio") == 0 ||
            headline.enclosureType.indexOf("video") == 0)
        {
          vbox1.setAttribute("enclosureUrl", headline.enclosureUrl);
          vbox1.setAttribute("enclosureType", headline.enclosureType);
          vbox1.headline = headline;
        }
      }
      const spacer4 = this._document.createElement("spacer");
      spacer4.setAttribute("width", "10");
      vbox1.appendChild(spacer4);
    }
    const toolVbox = this._document.createElement("vbox");
    toolHbox.appendChild(toolVbox);
    toolVbox.setAttribute("flex", "1");
    tooltip.setAttribute("noautohide", true);
    tooltip.addEventListener("popupshown", this._tooltip_open);
    tooltip.addEventListener("popuphiding",this._tooltip_close);
    return tooltip;
  },

  /** Deal with showing tooltip
   *
   * @param {PopupEvent} event details
   */
  __tooltip_open(event)
  {
    try
    {
      this._active_tooltip = true;

      const tooltip = event.target;
      for (let vbox of tooltip.getElementsByTagName("vbox"))
      {
        if (vbox.hasAttribute("enclosureUrl") &&
            vbox.headline.feed.feedXML.getAttribute("playPodcast") == "true")
        {
          if (vbox.childNodes.length == 1)
          {
            var br = this._document.createElement("browser");
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
      for (let browser of tooltip.getElementsByTagName("browser"))
      {
        if (browser.srcUrl != null && !browser.hasAttribute("src"))
        {
          browser.style.width = INFORSS_TOOLTIP_BROWSER_WIDTH + "px";
          browser.style.height = INFORSS_TOOLTIP_BROWSER_HEIGHT + "px";
          browser.setAttribute("flex", "1");
          browser.setAttribute("src", browser.srcUrl);
          browser.focus();
        }
        if (this._tooltip_browser == null &&
            !browser.hasAttribute("enclosureUrl"))
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
    }
    catch (e)
    {
      inforss.debug(e);
    }
  },

  /** Deal with tooltip hiding
   *
   * @param {PopupEvent} event details
   */
  __tooltip_close(event)
  {
    try
    {
      this._active_tooltip = false;

      if (this._document.tooltipNode != null)
      {
        this._document.tooltipNode.removeEventListener("mousemove",
                                                 this._tooltip_mouse_move);
      }

      //Need to set tooltip to beginning of article and enable podcast playing
      //to see one of these...
      let item = event.target.querySelector("browser[enclosureUrl]");
      if (item != null)
      {
        item.parentNode.removeChild(item);
      }
      this._tooltip_browser = null;
    }
    catch (e)
    {
      inforss.debug(e);
    }
  },

  /** Deal with tooltip mouse movement
   *
   * @param {MouseEvent} event details
   */
  __tooltip_mouse_move(event)
  {
    try
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
    }
    catch (e)
    {
      inforss.debug(e);
    }
  },

 //-------------------------------------------------------------------------------------------------------------
  updateDisplay(feed)
  {
    let shown_toast = false;
    inforss.traceIn(this);
    this.updateCmdIcon();
    let canScroll = this._can_scroll;
    this._can_scroll = false;
    try
    {
      this._document.getElementById('newsbar1').style.visibility = "visible";
      this.purgeOldHeadlines(feed);
      let firstItem = null;
      let lastItem = null;
      let lastInserted = null;

      let hbox = this._headline_box;
      if (this._spacer_end == null)
      {
        let spacer = this._document.createElement("spacer");
        spacer.setAttribute("id", "inforss-spacer-end");
        if (this._config.headline_bar_location == this._config.in_status_bar)
        {
          spacer.setAttribute("flex", "0");
        }
        else
        {
          spacer.setAttribute("flex", "1");
        }
        if (this._config.headline_bar_scroll_style == this._config.Scrolling_Display)
        {
          spacer.setAttribute("collapsed", "true");
          spacer.setAttribute("width", "5");
          spacer.style.backgroundColor = "black";
        }
        else
        {
          spacer.setAttribute("collapsed", "true");
        }
        hbox.appendChild(spacer);
        this._spacer_end = spacer;
      }

      let oldList = feed.getDisplayedHeadlines();
      if ((oldList != null) && (oldList.length > 0))
      {
        firstItem = oldList[0].hbox;
        lastItem = oldList[oldList.length - 1].hbox;
        lastInserted = lastItem.nextSibling;
        if (lastInserted == null)
        {
          lastInserted = this._spacer_end;
        }
      }
      else
      {
        let lastHeadline = this._mediator.getLastDisplayedHeadline();
        if (lastHeadline == null)
        {
          firstItem = this._spacer_end;
          lastItem = this._spacer_end;
        }
        else
        {
          firstItem = lastHeadline.hbox.nextSibling;
          lastItem = lastHeadline.hbox.nextSibling;
        }
        lastInserted = firstItem;
      }

      let newList = feed.getCandidateHeadlines();

      let maxTitleLength = feed.feedXML.getAttribute("lengthItem");
      if (feed.isSelected())
      {
        this.updateMenuIcon(feed);
      }

      let container = null;
      let t0 = new Date();
      for (let i = newList.length - 1; i >= 0; i--)
      {
        if (newList[i].hbox == null)
        {
          container = this.createHbox(feed, newList[i], hbox, maxTitleLength, lastInserted);
          lastInserted = container;
        }
        else
        {
          container = newList[i].hbox;
          if (container.parentNode == null)
          {
            if (lastInserted == null)
            {
              lastInserted = this._spacer_end;
            }
            hbox.insertBefore(container, lastInserted);
            let initialLabel = newList[i].title;

            if ((this._config.isQuickFilterActif()) && (initialLabel != null) &&
              (initialLabel != "") && (initialLabel.toLowerCase().indexOf(this._config.getQuickFilter().toLowerCase()) == -1))
            {
              if (container.hasAttribute("originalWidth") == false)
              {
                let width = container.boxObject.width;
                container.setAttribute("originalWidth", width);
              }
              container.setAttribute("collapsed", "true");
              container.setAttribute("filtered", "true");
            }
            else
            {
              container.removeAttribute("collapsed");
              container.setAttribute("filtered", "false");
            }
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
                this.fillTooltip(container.getElementsByTagName("label")[0], newList[i], "<TABLE width='100%' style='background-color:#2B60DE; color:white; -moz-border-radius: 10px; padding: 6px'><TR><TD colspan=2 align=center style='border-bottom-style:solid; border-bottom-width:1px'><B><img src='" + feed.getIcon() + "' width=16px height=16px> " + feed.getTitle() + "</B></TD></TR><TR><TD align='right'><B>" + inforss.get_string("title") + ": </B></TD><TD>" + newList[i].title + "</TD></TR><TR><TD align='right'><B>" + inforss.get_string("date") + ": </B></TD><TD>" + newList[i].publishedDate + "</TD></TR><TR><TD align='right'><B>" + inforss.get_string("rss") + ": </B></TD><TD>" + newList[i].url + "</TD></TR><TR><TD align='right'><B>" + inforss.get_string("link") + ": </B></TD><TD>" + newList[i].link + "</TD></TR></TABLE><br>" + fragment.textContent, "text");
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
                inforss.get_string("new.headline"),
                inforss.get_string("popup.newheadline") + " " + feed.getTitle()
              );
            }
            if (this._config.play_sound_on_new_headline)
            {
              var sound = Components.classes["@mozilla.org/sound;1"].getService(Components.interfaces.nsISound);
              sound.init();
              if (navigator.platform == "Win32")
              {
                //This should be configurable
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
        if (this._config.headline_bar_scroll_style == this._config.Fade_Into_Next)
        {
          if (container.hasAttribute("originalWidth") == false)
          {
            let width = container.boxObject.width;
            container.setAttribute("originalWidth", width);
          }
          container.setAttribute("collapsed", "true");
        }
        else
        {
          let initialLabel = newList[i].title;
          if ((this._config.isQuickFilterActif()) && (initialLabel != null) &&
            (initialLabel != "") && (initialLabel.toLowerCase().indexOf(this._config.getQuickFilter().toLowerCase()) == -1))
          {
            if (container.hasAttribute("originalWidth") == false)
            {
              let width = container.boxObject.width;
              container.setAttribute("originalWidth", width);
            }
            container.setAttribute("collapsed", "true");
            container.setAttribute("filtered", "true");
          }
          else
          {
            container.removeAttribute("collapsed");
            container.setAttribute("filtered", "false");
          }
        }
      }
      feed.updateDisplayedHeadlines();
      this._can_scroll = canScroll;
      if (newList.length > 0 &&
          this._config.headline_bar_scroll_style != this._config.Static_Display)
      {
        if (this._can_scroll)
        {
          //FIXME _prepare_for_scrolling calls checkCollapseBar
          this.checkCollapseBar();
          this._prepare_for_scrolling();
          if (this._scroll_needed)
          {
            this._start_scrolling();
          }
        }
      }
      else
      {
        this.checkCollapseBar();
      }
    }
    catch (e)
    {
      inforss.debug(e, this);
      this._can_scroll = canScroll;
      if ((this._config.headline_bar_scroll_style != this._config.Static_Display) && (this._can_scroll))
      {
        this._prepare_for_scrolling();
      }
    }
    inforss.traceOut();
  },

  /** Apply recent headline style to headline
   *
   * @param {object} obj dom object to which to apply style
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
          /*jshint bitwise: false*/
          const red = val >> 16;
          const green = (val >> 8) & 0xff;
          const blue = val & 0xff;
          /*jshint bitwise: true*/
          obj.style.color = (red + green + blue) < 3 * 85 ? "white" : "black";
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
   * @param {object} obj dom object to which to apply style
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

  //----------------------------------------------------------------------------
  updateCmdIcon()
  {
    const show_button = (element, show, toggle, img1, img2) =>
    {
      const image = this._document.getElementById("inforss.icon." + element);
      image.collapsed = !show;
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

    show_button(
      "readall",
      this._config.headline_bar_show_mark_all_as_read_button);

    show_button(
      "previous",
      this._config.headline_bar_show_previous_feed_button);

    show_button(
      "pause",
      this._config.headline_bar_show_pause_toggle,
      this._can_scroll,
      "pause",
      "pausing");

    show_button(
      "next",
      this._config.headline_bar_show_next_feed_button);

    show_button(
      "viewall",
      this._config.headline_bar_show_view_all_button);

    show_button(
      "refresh",
      this._config.headline_bar_show_manual_refresh_button);

    show_button(
      "hideold",
      this._config.headline_bar_show_hide_old_headlines_toggle,
      this._config.hide_old_headlines);

    show_button(
      "hideviewed",
      this._config.headline_bar_show_hide_viewed_headlines_toggle,
      this._config.hide_viewed_headlines);

    show_button(
      "shuffle",
      this._config.headline_bar_show_shuffle_toggle,
      this._config.headline_bar_cycle_type != "next");

    show_button(
      "direction",
      this._config.headline_bar_show_direction_toggle,
      this._config.headline_bar_scrolling_direction == "rtl",
      "rtl",
      "ltr");

    show_button(
      "scrolling",
      this._config.headline_bar_show_scrolling_toggle,
      this._config.headline_bar_scroll_style == this._config.Static_Display);

    show_button(
      "synchronize",
      this._config.headline_bar_show_manual_synchronisation_button);

    show_button(
      "filter",
      this._config.headline_bar_show_quick_filter_button,
      this._config.isQuickFilterActif());

    show_button(
      "home",
      this._config.headline_bar_show_home_button);
  },

  //-------------------------------------------------------------------------------------------------------------
  updateMenuIcon(feed)
  {
    try
    {
      this._document.getElementById("inforss.popup.mainicon").setAttribute("inforssUrl", feed.feedXML.getAttribute("url"));
      var statuspanel = this._document.getElementById('inforss-icon');
      if (this._config.icon_shows_current_feed)
      {
        //Why should cycle group affect this?
        statuspanel.setAttribute("src", feed.getIcon());
        var subElement = this._document.getAnonymousNodes(statuspanel);

        //Why this huge test? and why isn't it set anyway
        if (subElement != null && subElement.length > 0 &&
            subElement[0] != null && subElement[0].localName == "image")
        {
          subElement[0].setAttribute("maxwidth", "16");
          subElement[0].setAttribute("maxheight", "16");
          subElement[0].setAttribute("minwidth", "16");
          subElement[0].setAttribute("minheight", "16");


          subElement[0].style.maxWidth = "16px";
          subElement[0].style.maxHeight = "16px";
          subElement[0].style.minWidth = "16px";
          subElement[0].style.minHeight = "16px";
        }
      }
      else
      {
        statuspanel.setAttribute("src", "chrome://inforss/skin/inforss.png");
      }
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    inforss.traceOut();
  },

  //-------------------------------------------------------------------------------------------------------------
  _scroll()
  {
    var canScrollSet = false;
    var canScroll = false;
    try
    {
      if (this._can_scroll && this._scroll_needed)
      {
        canScroll = this._can_scroll;
        this._can_scroll = false;
        canScrollSet = true;
        this._scroll_1_pixel((this._config.headline_bar_scrolling_direction == "rtl") ? 1 : -1);
      }
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    if (canScrollSet)
    {
      this._can_scroll = canScroll;
    }
    this._scroll_timeout =
      inforss.setTimeout(this._scroll.bind(this),
                         (30 - this._config.headline_bar_scroll_speed) * 10);
  },

  //----------------------------------------------------------------------------
  //FIXME THis is a mess with evals of width but not in all places...
  _scroll_1_pixel(direction)
  {
    try
    {
      var getNext = false;
      var news = this._headline_box.firstChild;
      if ((news != null) && (news.getAttribute("id") != "inforss-spacer-end"))
      {
        var width = null;
        var opacity = null;
        if (this._config.headline_bar_scroll_style == this._config.Fade_Into_Next) // fade in/out mode
        {
          if (news.hasAttribute("opacity") == false)
          {
            news.setAttribute("opacity", "0");
          }
          if (news.hasAttribute("collapsed") == false)
          {
            news.setAttribute("collapsed", "false");
          }
          else
          {
            if (news.getAttribute("collapsed") == "true")
            {
              news.setAttribute("collapsed", "false");
            }
          }

          opacity = eval(news.getAttribute("opacity"));
          //WTF is this doing?
          news.style.opacity = opacity < 1.0 ? opacity :
                               opacity > 3.0 ? 4.0 - opacity : 1;
          opacity = opacity + 0.05;
          news.setAttribute("opacity", opacity);
          width = 1;
          if (opacity > 4)
          {
            news.setAttribute("opacity", "0");
            news.setAttribute("collapsed", "true");
          }
        }
        else // _scroll mode
        {
          if ((news.hasAttribute("collapsed")) && (news.getAttribute("collapsed") == "true"))
          {
            getNext = true;
          }
          else
          {
            width = news.getAttribute("maxwidth");

            opacity = 1;
            if ((width == null) || (width == ""))
            {
              width = news.boxObject.width;
              news.setAttribute("originalWidth", width);
            }
            if (direction == 1)
            {
              if (eval(width) >= 0)
              {
                width -= this._config.headline_bar_scroll_increment;
                if (width <= 0)
                {
                  getNext = true;
                }
              }
              else
              {
                getNext = true;
              }
            }
            else
            {
              if (eval(width) < news.getAttribute("originalWidth"))
              {
                width = eval(width) + this._config.headline_bar_scroll_increment;
                if (width > news.getAttribute("originalWidth"))
                {
                  getNext = true;
                }
              }
              else
              {
                getNext = true;
              }
            }
          }
        }

        if ((getNext) || (opacity > 4))
        {
          this._scroll_1_headline(direction, true);
        }
        else
        {
          if (this._config.headline_bar_scroll_style != this._config.Fade_Into_Next)
          {
            news.setAttribute("maxwidth", width);
            news.style.minWidth = width + "px";
            news.style.maxWidth = width + "px";
            news.style.width = width + "px";
          }
        }
      }
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
  },

  //-------------------------------------------------------------------------------------------------------------
  _scroll_1_headline(direction, forceWidth)
  {
    let news = null;
    let spacerEnd = this._spacer_end;
    if (direction == 1)
    {
      news = this._headline_box.firstChild;
      let hbox = news.parentNode;
      news.removeEventListener("mousedown", this._mouse_down_handler);
      hbox.removeChild(news);
      hbox.insertBefore(news, spacerEnd);
      news.setAttribute("maxwidth", news.getAttribute("originalWidth"));

      news.style.minWidth = news.getAttribute("originalWidth") + "px";
      news.style.maxWidth = news.getAttribute("originalWidth") + "px";
      news.style.width = news.getAttribute("originalWidth") + "px";
    }
    else
    {
      news = spacerEnd.previousSibling;
      let hbox = news.parentNode;
      news.removeEventListener("mousedown", this._mouse_down_handler);
      let width = news.getAttribute("maxwidth");
      if ((width == null) || (width == ""))
      {
        width = news.boxObject.width;
        news.setAttribute("originalWidth", width);
      }

      if (forceWidth)
      {
        news.setAttribute("maxwidth", "1");
        news.style.minWidth = "1px";
        news.style.maxWidth = "1px";
        news.style.width = "1px";
      }
      hbox.removeChild(news);
      hbox.insertBefore(news, hbox.firstChild);
    }

    news.addEventListener("mousedown", this._mouse_down_handler);
  },

  /** Handle the 'DOMMouseScroll' event
   *
   * When the mouse wheel is rotated, the headline bar will be scrolled
   * left or right (amount depending on configuration).
   *
   * @param {MouseScrollEvent} event
   */
  __mouse_scroll(event)
  {
    const direction = event.detail;
    const dir = (direction > 0) ? 1 : -1;
    switch (this._config.headline_bar_mousewheel_scroll)
    {
      case this._config.By_Pixel:
      {
        const end = (direction > 0) ? direction : -direction;
        for (let i = 0; i < end; i++)
        {
          this._scroll_1_pixel(dir);
        }
      }
      break;

      case this._config.By_Pixels:
      {
        for (let i = 0; i < 10; i++)
        {
          this._scroll_1_pixel(dir);
        }
      }
      break;

      case this._config.By_Headline:
      {
        this._scroll_1_headline(dir, false);
      }
      break;
    }
  },

  /** mouse down on headline will generally display or ignore the news page
   *
   * @param {MouseEvent} event - mouse down event
   */
  __mouse_down_handler(event)
  {
    try
    {
      const link = event.currentTarget.getAttribute("link");
      const title = event.currentTarget.getElementsByTagName(
        "label")[0].getAttribute("title");
      if ((event.button == 0) && (event.ctrlKey == false) && (event.shiftKey == false))
      {
        //normal click
        if (event.target.hasAttribute("inforss"))
        {
          //Clicked on banned icon
          this._mediator.set_banned(title, link);
        }
        else if (event.target.hasAttribute("playEnclosure"))
        {
          //clicked on enclosure icon
          this.openTab(event.target.getAttribute("playEnclosure"));
        }
        else
        {
          //clicked on icon or headline
          this._mediator.set_viewed(title, link);
          this.openTab(link);
        }
      }
      else if ((event.button == 1) || ((event.button == 0) && (event.ctrlKey == false) && (event.shiftKey)))
      {
        //shift click or middle button
        this.switchPause();
        ClipboardHelper.copyString(link);
      }
      else if ((event.button == 2) || ((event.button == 0) && (event.ctrlKey) && (event.shiftKey == false)))
      {
        //control click or right button
        this._mediator.set_banned(title, link);
      }
    }
    catch (e)
    {
      inforss.debug(e, this);
    }

    event.cancelBubble = true;
    event.stopPropagation();
  },
  //-----------------------------------------------------------------------------------------------------
  testCreateTab()
  {
    inforss.traceIn(this);

    var returnValue = true;
    try
    {
      if ((gBrowser.browsers.length == 1))
      {
        if ((gBrowser.currentURI == null) ||
          (((gBrowser.currentURI.spec == "") || (gBrowser.currentURI.spec == "about:blank")) && (gBrowser.selectedBrowser.webProgress.isLoadingDocument == false))
        )
        {
          returnValue = false;
        }
      }
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    inforss.traceOut();
    return returnValue;
  },

  //-------------------------------------------------------------------------------------------------------------
  openTab(link)
  {
    inforss.traceIn(this);
    try
    {
      let prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("browser.tabs.");

      let behaviour = this._config.headline_action_on_click;
      switch (behaviour)
      {
        case this._config.new_default_tab:
          {
              if (prefs.getBoolPref("loadInBackground"))
              {
                if (this.testCreateTab() == false)
                {
                  gBrowser.loadURI(link);
                }
                else
                {
                  gBrowser.addTab(link);
                }
              }
              else
              {
                if (this.testCreateTab() == false)
                {
                  gBrowser.loadURI(link);
                }
                else
                {
                  gBrowser.selectedTab = gBrowser.addTab(link);
                }
              }
            }
          break;

        case this._config.new_background_tab:
          {
            if (this.testCreateTab() == false)
            {
              gBrowser.loadURI(link);
            }
            else
            {
              gBrowser.addTab(link);
            }
          }
          break;

        case this._config.new_foreground_tab: // in tab, foreground
          {
            if (this.testCreateTab() == false)
            {
              gBrowser.loadURI(link);
            }
            else
            {
              gBrowser.selectedTab = gBrowser.addTab(link);
            }
          }
          break;

        case this._config.new_window:
          {
            //fixme window
            window.open(link, "_blank");
          }
          break;

        case this._config.current_tab:
          {
            gBrowser.loadURI(link);
          }
          break;

      }
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    inforss.traceOut(this);
  },

  //-----------------------------------------------------------------------------------------------------
  checkStartScrolling()
  {
    inforss.traceIn(this);
    try
    {
      this._prepare_for_scrolling();
      if (this._config.headline_bar_scroll_style != this._config.Static_Display)
      {
        this._start_scrolling();
      }
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    inforss.traceOut();
  },

  /* Prepare for scrolling
   *
   * Works out required width of headlines to see if we need to scroll,
   * then checks if the bar should be collapsed.
   */
  _prepare_for_scrolling()
  {
    try
    {
      const hbox = this._headline_box;
      if (this._config.headline_bar_scroll_style == this._config.Scrolling_Display &&
          !hbox.collapsed)
      {
        let width = 0;
        for (let news of hbox.childNodes)
        {
          if (news.nodeName == "spacer")
          {
            //Why doesn't this count to the width?
            continue;
          }
          if (news.collapsed)
          {
            //Hidden - presumably by clicking 'view' or 'ban' button.
            continue;
          }
          if (news.hasAttribute("originalWidth"))
          {
            width += parseInt(news.getAttribute("originalWidth"), 10);
          }
          else if (news.hasAttribute("width"))
          {
            width += parseInt(news.getAttribute("width"), 10);
          }
          else
          {
            width += news.boxObject.width;
          }
        }
        this._scroll_needed = width > hbox.boxObject.width;
        if (!this._scroll_needed)
        {
          let news = hbox.firstChild;
          if (news.hasAttribute("originalWidth"))
          {
            news.setAttribute("maxwidth", news.getAttribute("originalWidth"));
            news.style.minWidth = news.getAttribute("originalWidth") + "px";
            news.style.maxWidth = news.getAttribute("originalWidth") + "px";
            news.style.width = news.getAttribute("originalWidth") + "px";
          }
        }
      }
      this.checkCollapseBar();
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
  },


  //----------------------------------------------------------------------------
  checkCollapseBar()
  {
    inforss.traceIn(this);
    try
    {
      if (this._config.headline_bar_location == this._config.in_status_bar)
      {
        var hbox = this._headline_box;
        if (hbox.childNodes.length == 1 && this._config.headline_bar_collapsed)
        {
          hbox.collapsed = true;
          this._can_scroll = true;
        }
        else
        {
          hbox.collapsed = false;
        }
      }
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    inforss.traceOut();
  },

  //-----------------------------------------------------------------------------------------------------
  //button handler.
  switchScroll()
  {
    inforss.traceIn(this);
    try
    {
      this._config.toggleScrolling();
      this.init();
      if (this._config.headline_bar_scroll_style == this._config.Static_Display)
      {
        this._stop_scrolling();
      }
      else
      {
        this._start_scrolling();
      }
      //FIXME It's not entirely clear to me how we can get to a situation
      //where this button is pressed while we're trying to resize.
      this._resize_button.disable_resize();
      this._can_scroll = true;
      this._mediator.refreshBar();
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    finally
    {
      inforss.traceOut();
    }
  },

  //-----------------------------------------------------------------------------------------------------
  //button handler
  quickFilter()
  {
    inforss.traceIn(this);
    try
    {
      const res = inforss.prompt("quick.filter",
                                 this._config.getQuickFilter(),
                                 "quick.filter.title",
                                 "apply",
                                 this._config.isQuickFilterActif());
      if (res != 0)
      {
        this._config.setQuickFilter(res.checkbox, res.input);
        this.updateCmdIcon();
        this.applyQuickFilter(res.checkbox, res.input);
        this._prepare_for_scrolling();
        this.checkCollapseBar();
      }
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    inforss.traceOut();
  },

  //----------------------------------------------------------------------------
  applyQuickFilter(actif, filter)
  {
    inforss.traceIn(this);
    try
    {
      var hbox = this._headline_box;
      var labels = hbox.getElementsByTagName("label");
      for (var i = 0; i < labels.length; i++)
      {
        var news = labels[i].parentNode;
        if (actif == false)
        {
          news.removeAttribute("collapsed");
        }
        else
        {
          if ((labels[i].hasAttribute("title")) && (labels[i].getAttribute("title").toLowerCase().indexOf(filter.toLowerCase()) != -1))
          {
            news.removeAttribute("collapsed");
          }
          else
          {
            if (news.hasAttribute("originalWidth") == false)
            {
              var width = news.boxObject.width;
              news.setAttribute("originalWidth", width);
            }
            news.setAttribute("collapsed", "true");
          }
        }
      }
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    inforss.traceOut();
  },

  //-----------------------------------------------------------------------------------------------------
  //button handler
  switchPause()
  {
    inforss.traceIn(this);
    try
    {
      if (this._config.headline_bar_scroll_style != this._config.Static_Display)
      {
        this._can_scroll = !this._can_scroll;
        this.updateCmdIcon();
      }
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    inforss.traceOut();
  },

  //-----------------------------------------------------------------------------------------------------
  //button handler
  switchDirection()
  {
    inforss.traceIn(this);
    try
    {
      this._config.switchDirection();
      this.updateCmdIcon();
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    inforss.traceOut();
  },

  //----------------------------------------------------------------------------
  //note this is called both the mainicon window via the mediator and from
  //the resize icon code on mouse release
  resizedWindow()
  {
    if (this._config.is_valid() &&
        this._config.headline_bar_location == this._config.in_status_bar)
    {
      //FIXME Messy
      //What is it actually doing anyway?
      var hbox = this._headline_box;
      var width = this._config.status_bar_scrolling_area;
      var found = false;
      hbox.width = width;
      hbox.style.width = width + "px";

      var hl = this._document.getElementById("inforss.headlines");
      var spring = hl.nextSibling;
      if (spring != null && spring.getAttribute("id") == "inforss.toolbar.spring")
      {
        var toolbar = spring.parentNode;
        toolbar.removeChild(spring);
        toolbar.insertBefore(spring, hl);
      }

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
    }
  },

};
