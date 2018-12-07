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

Components.utils.import("chrome://inforss/content/modules/inforss_Utils.jsm",
                        inforss);

/* globals inforssXMLRepository */
/* globals INFORSS_DEFAULT_ICO */
/* globals gInforssMediator, gInforssPreventTooltip */

//Note: Uses 'document' quite a lot which doesn't help it be in a module.

const INFORSS_TOOLTIP_BROWSER_WIDTH = 600;
const INFORSS_TOOLTIP_BROWSER_HEIGHT = 400;
var gInforssTooltipX = -1;
var gInforssTooltipY = -1;
var gInforssTooltipBrowser = null;
var gInforssSpacerEnd = null;
var gInforssNewsbox1 = null;
var tabmail = null;

const UnescapeHTMLService = Components.classes[
  "@mozilla.org/feed-unescapehtml;1"].getService(
  Components.interfaces.nsIScriptableUnescapeHTML);

//For resizing headline bar
var gInforssX = null;
var gInforssWidth = null;
var gInforssCanResize = false;

//FIXME get rid of all the 2 phase initialisation
function inforssHeadlineDisplay(mediator, config, box)
{
  this._mediator = mediator;
  this._config = config;
  this._can_scroll = true;
  this._scroll_size = true;
  this._scroll_timeout = null;
  this._notifier = new inforss.Notifier();
  this._active_tooltip = false;
  this._mouse_down_handler = this.__mouse_down_handler.bind(this);
  gInforssNewsbox1 = box;
  return this;
}

inforssHeadlineDisplay.prototype = {

  //----------------------------------------------------------------------------
  init()
  {
    var news = gInforssNewsbox1.firstChild;
    //FIXME how can that ever be null?
    if ((news != null) && (news.getAttribute("id") != "inforss-spacer-end"))
    {
      if (this._config.headline_bar_scroll_style == this._config.fade_into_next)
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
    document.getElementById('inforss-hbox').setAttribute(
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
      let hbox = gInforssNewsbox1;
      if (hbox.childNodes.length <= 1)
      {
        this.stopScrolling();
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
  setActiveTooltip()
  {
    this._active_tooltip = true;
  },

  //-------------------------------------------------------------------------------------------------------------
  resetActiveTooltip()
  {
    this._active_tooltip = false;
  },

  //-------------------------------------------------------------------------------------------------------------
  isActiveTooltip()
  {
    return this._active_tooltip;
  },

  //-------------------------------------------------------------------------------------------------------------
  stopScrolling()
  {
    //The nullity of scrolltimeout is used to stop startScrolling re-kicking
    //the timer.
    window.clearTimeout(this._scroll_timeout);
    this._scroll_timeout = null;
  },

  //-------------------------------------------------------------------------------------------------------------
  startScrolling()
  {
    if (this._scroll_timeout == null)
    {
      this._scroll_timeout =
        window.setTimeout(this.scroll.bind(this),
          this._config.headline_bar_scroll_style == this._config.fade_into_next? 0 : 1800);
    }
  },

  //-------------------------------------------------------------------------------------------------------------
  resetDisplay()
  {
    inforss.traceIn();
    try
    {
      inforss.remove_all_children(gInforssNewsbox1);
      gInforssSpacerEnd = null;
      this.stopScrolling();
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

      container = document.createElement("hbox");
      if (this._config.headline_bar_scroll_style == this._config.fade_into_next)
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
        let vbox = document.createElement("vbox");
        container.appendChild(vbox);
        let spacer = document.createElement("spacer");
        vbox.appendChild(spacer);
        spacer.setAttribute("flex", "1");
        let image = document.createElement("image");
        vbox.appendChild(image);
        image.setAttribute("src", rss.getAttribute("icon"));
        image.setAttribute("maxwidth", "16");
        image.setAttribute("maxheight", "16");

        image.style.maxWidth = "16px";
        image.style.maxHeight = "16px";

        spacer = document.createElement("spacer");
        vbox.appendChild(spacer);
        spacer.setAttribute("flex", "1");
      }

      let itemLabel = document.createElement("label");
      itemLabel.setAttribute("title", initialLabel);
      container.appendChild(itemLabel);
      if (label.length > feed.getLengthItem())
      {
        label = label.substring(0, feed.getLengthItem());
      }
      if (rss.getAttribute("icon") == INFORSS_DEFAULT_ICO)
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
        let vbox = document.createElement("vbox");
        container.appendChild(vbox);
        let spacer = document.createElement("spacer");
        vbox.appendChild(spacer);
        spacer.setAttribute("flex", "1");
        let image = document.createElement("image");
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
        let tooltip1 = document.createElement("tooltip");
        vbox.appendChild(tooltip1);
        let vbox1 = document.createElement("vbox");
        tooltip1.appendChild(vbox1);
        let description1 = document.createElement("label");
        description1.setAttribute("value", inforss.get_string("url") + ": " + headline.enclosureUrl);
        vbox1.appendChild(description1);
        description1 = document.createElement("label");
        description1.setAttribute("value", inforss.get_string("enclosure.type") + ": " + headline.enclosureType);
        vbox1.appendChild(description1);
        description1 = document.createElement("label");
        description1.setAttribute("value", inforss.get_string("enclosure.size") + ": " + headline.enclosureSize + " " + inforss.get_string("enclosure.sizeUnit"));
        vbox1.appendChild(description1);

        spacer = document.createElement("spacer");
        vbox.appendChild(spacer);
        spacer.setAttribute("flex", "1");
      }


      if (this._config.headline_shows_ban_icon)
      {
        let vbox = document.createElement("vbox");
        container.appendChild(vbox);
        let spacer = document.createElement("spacer");
        vbox.appendChild(spacer);
        spacer.setAttribute("flex", "1");
        let image = document.createElement("image");
        vbox.appendChild(image);
        image.setAttribute("src", "chrome://inforss/skin/closetab.png");
        image.setAttribute("inforss", "true");
        spacer = document.createElement("spacer");
        vbox.appendChild(spacer);
        spacer.setAttribute("flex", "1");
      }

      let spacer = document.createElement("spacer");
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
    const tooltip = document.getElementById(label.getAttribute("tooltip"));
    const vboxs = tooltip.firstChild.getElementsByTagName("vbox");
    const vbox = inforss.replace_without_children(vboxs[vboxs.length - 1]);
    if (type == "text")
    {
      str = inforss.htmlFormatConvert(str);
      if (str != null && str.indexOf("<") != -1 && str.indexOf(">") != -1)
      {
        let br = document.createElement("iframe");
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
          const description = document.createElement("label");
          description.setAttribute("value", str.substring(0, j).trim());
          vbox.appendChild(description);
          str = str.substring(j + 1).trim();
        } while (str != "");
      }
      else if (headline.enclosureUrl != null)
      {
        const image = document.createElement("image");
        //FIXME What if it's not one of those?
        if (headline.enclosureType.indexOf("image") == 0)
        {
          image.setAttribute("src", "chrome://inforss/skin/image.png");
        }
        else if (headline.enclosureType.indexOf("video") == 0)
        {
          image.setAttribute("src", "chrome://inforss/skin/movie.png");
        }
        else if (headline.enclosureType.indexOf("audio") == 0)
        {
          image.setAttribute("src", "chrome://inforss/skin/speaker.png");
        }
        vbox.appendChild(image);
      }
    }
    else
    {
      //Apparently not text. Do we assume its html?
      let br = document.createElement("browser");
      vbox.appendChild(br);
      br.setAttribute("flex", "1");
      br.srcUrl = str;
    }
    return tooltip;
  },

  //----------------------------------------------------------------------------
  createTooltip(headline)
  {
    var tooltip = document.createElement("tooltip");
    tooltip.setAttribute("id", "inforss.headline.tooltip." + headline.guid);
    tooltip.setAttribute("position", "before_end");
    document.getElementById("inforss.popupset").appendChild(tooltip);
    var nodes = document.getAnonymousNodes(tooltip);
    nodes[0].setAttribute("collapsed", "true");
    const toolHbox = document.createElement("hbox");
    tooltip.appendChild(toolHbox);
    toolHbox.setAttribute("flex", "1");
    if (headline.enclosureUrl != null &&
        this._config.headline_tooltip_style != "article")
    {
      const vbox1 = document.createElement("vbox");
      vbox1.setAttribute("flex", "0");
      vbox1.style.backgroundColor = "inherit";
      toolHbox.appendChild(vbox1);
      if (headline.enclosureType.indexOf("image") == 0)
      {
        const img = document.createElement("image");
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
      const spacer4 = document.createElement("spacer");
      spacer4.setAttribute("width", "10");
      vbox1.appendChild(spacer4);
    }
    const toolVbox = document.createElement("vbox");
    toolHbox.appendChild(toolVbox);
    toolVbox.setAttribute("flex", "1");
    tooltip.setAttribute("noautohide", true);
    tooltip.addEventListener("popupshown",
                             inforssHeadlineDisplay.manageTooltipOpen,
                             false);
    tooltip.addEventListener("popuphiding",
                             inforssHeadlineDisplay.manageTooltipClose,
                             false);
    return tooltip;
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
      document.getElementById('newsbar1').style.visibility = "visible";
      this.purgeOldHeadlines(feed);
      let firstItem = null;
      let lastItem = null;
      let lastInserted = null;

      let hbox = gInforssNewsbox1;
      if (gInforssSpacerEnd == null)
      {
        let spacer = document.createElement("spacer");
        spacer.setAttribute("id", "inforss-spacer-end");
        if (this._config.headline_bar_location == this._config.in_status_bar)
        {
          spacer.setAttribute("flex", "0");
        }
        else
        {
          spacer.setAttribute("flex", "1");
        }
        if (this._config.headline_bar_scroll_style == this._config.scrolling_display)
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
        gInforssSpacerEnd = spacer;
      }

      let oldList = feed.getDisplayedHeadlines();
      if ((oldList != null) && (oldList.length > 0))
      {
        firstItem = oldList[0].hbox;
        lastItem = oldList[oldList.length - 1].hbox;
        lastInserted = lastItem.nextSibling;
        if (lastInserted == null)
        {
          lastInserted = gInforssSpacerEnd;
        }
      }
      else
      {
        let lastHeadline = this._mediator.getLastDisplayedHeadline();
        if (lastHeadline == null)
        {
          firstItem = gInforssSpacerEnd;
          lastItem = gInforssSpacerEnd;
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
              lastInserted = gInforssSpacerEnd;
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
            container.addEventListener("mousedown", this._mouse_down_handler, false);
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
          inforssHeadlineDisplay.apply_recent_headline_style(container);
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
          inforssHeadlineDisplay.apply_default_headline_style(container, true);
        }
        if (this._config.headline_bar_scroll_style == this._config.fade_into_next)
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
          this._config.headline_bar_scroll_style != this._config.static_display)
      {
        if (this._can_scroll)
        {
          this.checkCollapseBar();
          this.checkScroll();
        }
        if ((this._can_scroll) && (this._scroll_size))
        {
          this.startScrolling();
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
      if ((this._config.headline_bar_scroll_style != this._config.static_display) && (this._can_scroll))
      {
        this.checkScroll();
      }
    }
    inforss.traceOut();
  },

  //----------------------------------------------------------------------------
  updateCmdIcon()
  {
    function show_button(element, show, toggle, img1, img2)
    {
      const image = document.getElementById("inforss.icon." + element);
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
    }

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
      this._config.headline_bar_scroll_style == this._config.static_display);

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
      document.getElementById("inforss.popup.mainicon").setAttribute("inforssUrl", feed.feedXML.getAttribute("url"));
      var statuspanel = document.getElementById('inforss-icon');
      if (this._config.icon_shows_current_feed)
      {
        //Why should cycle group affect this?
        statuspanel.setAttribute("src", feed.getIcon());
        var subElement = document.getAnonymousNodes(statuspanel);

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
  scroll()
  {
    var canScrollSet = false;
    var canScroll = false;
    try
    {
      if (this._can_scroll && this._scroll_size)
      {
        canScroll = this._can_scroll;
        this._can_scroll = false;
        canScrollSet = true;
        this.scroll1((this._config.headline_bar_scrolling_direction == "rtl") ? 1 : -1, true);
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
      window.setTimeout(this.scroll.bind(this),
                        (30 - this._config.headline_bar_scroll_speed) * 10);
  },

  //----------------------------------------------------------------------------
  //FIXME THis is a mess with evals of width but not in all places...
  scroll1(direction, forceWidth)
  {
    try
    {
      var getNext = false;
      var news = gInforssNewsbox1.firstChild;
      if ((news != null) && (news.getAttribute("id") != "inforss-spacer-end"))
      {
        var width = null;
        var opacity = null;
        if (this._config.headline_bar_scroll_style == this._config.fade_into_next) // fade in/out mode
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
        else // scroll mode
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
          this.forceScrollInDisplay(direction, forceWidth);
        }
        else
        {
          if (this._config.headline_bar_scroll_style != this._config.fade_into_next)
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
  forceScrollInDisplay(direction, forceWidth)
  {
    let news = null;
    let spacerEnd = gInforssSpacerEnd;
    if (direction == 1)
    {
      news = gInforssNewsbox1.firstChild;
      let hbox = news.parentNode;
      news.removeEventListener("mousedown", this._mouse_down_handler, false);
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
      news.removeEventListener("mousedown", this._mouse_down_handler, false);
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

    news.addEventListener("mousedown", this._mouse_down_handler, false);
  },

  //-------------------------------------------------------------------------------------------------------------
  handleMouseScroll(direction)
  {
    let dir = (direction > 0) ? 1 : -1;
    switch (this._config.headline_bar_mousewheel_scroll)
    {
      case this._config.by_pixel:
      {
        const end = (direction > 0) ? direction : -direction;
        for (let i = 0; i < end; i++)
        {
          this.scroll1(dir, true);
        }
      }
      break;

      case this._config.by_pixels:
      {
        for (let i = 0; i < 10; i++)
        {
          this.scroll1(dir, true);
        }
      }
      break;

      case this._config.by_headline:
      {
        this.forceScrollInDisplay(dir, false);
      }
      break;
    }
  },


  //-----------------------------------------------------------------------------------------------------
  testCreateTab()
  {
    inforss.traceIn(this);

    var returnValue = true;
    try
    {
      if ((navigator.userAgent.indexOf("Thunderbird") == -1) && (gBrowser.browsers.length == 1))
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

      //FIXME can't this be done at startup? Why do we need this?
      if (navigator.userAgent.indexOf("Thunderbird") != -1 && tabmail == null)
      {
        tabmail = document.getElementById("tabmail");
        if (tabmail == null)
        {
          // Try opening new tabs in an existing 3pane window
          let mail3PaneWindow = Components.classes["@mozilla.org/appshell/window-mediator;1"]
            .getService(Components.interfaces.nsIWindowMediator)
            .getMostRecentWindow("mail:3pane");
          if (mail3PaneWindow)
          {
            tabmail = mail3PaneWindow.document.getElementById("tabmail");
            mail3PaneWindow.focus();
          }
        }
      }

      let behaviour = this._config.headline_action_on_click;
      switch (behaviour)
      {
        case this._config.new_default_tab:
          {
            if (tabmail != null)
            {
              tabmail.openTab("contentTab",
              {
                contentPage: link,
                background: false
              });
            }
            else
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
              if (tabmail != null)
              {
                tabmail.openTab("contentTab",
                {
                  contentPage: link,
                  background: true
                });
              }
              else
              {
                gBrowser.addTab(link);
              }
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
              if (tabmail != null)
              {
                tabmail.openTab("contentTab",
                {
                  contentPage: link,
                  background: false
                });
              }
              else
              {
                gBrowser.selectedTab = gBrowser.addTab(link);
              }
            }
          }
          break;

        case this._config.new_window:
          {
            if (tabmail != null)
            {
              window.openDialog("chrome://inforss/content/inforssBrowser.xul", "_blank", "chrome,centerscreen,resizable=yes, dialog=no", link);
            }
            else
            {
              window.open(link, "_blank");
            }
          }
          break;

          case this._config.current_tab:
          {
            if (tabmail != null)
            {
              tabmail.openTab("contentTab",
              {
                contentPage: link,
                background: false
              });
            }
            else
            {
              gBrowser.loadURI(link);
            }
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
      this.checkScroll();
      if (this._config.headline_bar_scroll_style != this._config.static_display)
      {
        this.startScrolling();
      }
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    inforss.traceOut();
  },

  //-----------------------------------------------------------------------------------------------------
  checkScroll()
  {
    inforss.traceIn(this);
    try
    {
      var hbox = gInforssNewsbox1;
      if (this._config.headline_bar_scroll_style == this._config.scrolling_display &&
        (hbox.hasAttribute("collapsed") == false || hbox.getAttribute("collapsed") == "false"))
      {
        var news = hbox.firstChild;
        var width = 0;
        while (news != null)
        {
          if (news.nodeName != "spacer")
          {
            if ((news.hasAttribute("collapsed") == false) || (news.getAttribute("collapsed") == "false"))
            {
              if ((news.hasAttribute("originalWidth")) &&
                (news.getAttribute("originalWidth") != null))
              {
                width += eval(news.getAttribute("originalWidth"));
              }
              else
              {
                if ((news.hasAttribute("width")) && (news.getAttribute("width") != null))
                {
                  width += eval(news.getAttribute("width"));
                }
                else
                {
                  width += eval(news.boxObject.width);
                }
              }
            }
          }
          news = news.nextSibling; //
        }
        this._scroll_size = (width > eval(hbox.boxObject.width));
        if (this._scroll_size == false)
        {
          news = hbox.firstChild;
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
    inforss.traceOut();
  },


  //----------------------------------------------------------------------------
  checkCollapseBar()
  {
    inforss.traceIn(this);
    try
    {
      if (this._config.headline_bar_location == this._config.in_status_bar)
      {
        var hbox = gInforssNewsbox1;
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
  switchScroll()
  {
    inforss.traceIn(this);
    try
    {
      this._config.toggleScrolling();
      this.init();
      if (this._config.headline_bar_scroll_style == this._config.static_display)
      {
        this.stopScrolling();
      }
      else
      {
        this.startScrolling();
      }
      gInforssCanResize = false;
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
  quickFilter()
  {
    inforss.traceIn(this);
    try
    {
      var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
      var filter1 = {
        value: this._config.getQuickFilter()
      };
      var actif = {
        value: this._config.isQuickFilterActif()
      };
      var valid = promptService.prompt(window, inforss.get_string("quick.filter.title"),
        inforss.get_string("quick.filter"),
        filter1, inforss.get_string("apply"), actif);
      if (valid)
      {
        this._config.setQuickFilter(actif.value, filter1.value);
        this.updateCmdIcon();
        this.applyQuickFilter(actif.value, filter1.value);
        this.checkScroll();
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
      var hbox = gInforssNewsbox1;
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
  switchPause()
  {
    inforss.traceIn(this);
    try
    {
      if (this._config.headline_bar_scroll_style != this._config.static_display)
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

  //-------------------------------------------------------------------------------------------------------------
  setScroll(flag)
  {
    this._can_scroll = flag;
    if (this._can_scroll)
    {
      this.checkScroll();
    }
  },

  //----------------------------------------------------------------------------
  resizedWindow()
  {
    if (this._config.is_valid() &&
        this._config.headline_bar_location == this._config.in_status_bar)
    {
      //FIXME Messy
      //What is it actually doing anyway?
      var hbox = gInforssNewsbox1;
      var width = this._config.status_bar_scrolling_area;
      var found = false;
      hbox.width = width;
      hbox.style.width = width + "px";

      var hl = document.getElementById("inforss.headlines");
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

  /** mouse down on headline
   *
   * @param {object} event - mouse down event
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
        var clipboardHelper = Components.classes["@mozilla.org/widget/clipboardhelper;1"].getService(Components.interfaces.nsIClipboardHelper);
        clipboardHelper.copyString(link);
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
    return true;
  },

};

//FIXME huge list of static functions which are not clearly related to the
//above class

//------------------------------------------------------------------------------
inforssHeadlineDisplay.apply_recent_headline_style = function(obj)
{
    const background = inforssXMLRepository.recent_headline_background_colour;
    obj.style.backgroundColor = background;
    const color = inforssXMLRepository.recent_headline_text_colour;
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
      const default_colour = inforssXMLRepository.headline_text_colour;
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
    obj.style.fontFamily = inforssXMLRepository.headline_font_family;
    obj.style.fontSize = inforssXMLRepository.headline_font_size;
    obj.style.fontWeight = inforssXMLRepository.recent_headline_font_weight;
    obj.style.fontStyle = inforssXMLRepository.recent_headline_font_style;
};

//-------------------------------------------------------------------------------------------------------------
inforssHeadlineDisplay.apply_default_headline_style = function(obj)
{
    obj.style.backgroundColor = "inherit";
    const defaultColor = inforssXMLRepository.headline_text_colour;
    if (defaultColor == "default")
    {
      obj.style.color = "inherit";
    }
    else
    {
      obj.style.color = defaultColor;
    }
    obj.style.fontFamily = inforssXMLRepository.headline_font_family;
    obj.style.fontSize = inforssXMLRepository.headline_font_size;
    obj.style.fontWeight = "normal";
    obj.style.fontStyle = "normal";
};

//------------------------------------------------------------------------------
inforssHeadlineDisplay.pauseScrolling = function(flag)
{
  if (gInforssMediator != null && inforssXMLRepository.headline_bar_stop_on_mouseover)
  {
    gInforssMediator.setScroll(flag);
  }
};

//------------------------------------------------------------------------------
inforssHeadlineDisplay.manageTooltipOpen = function(event)
{
  try
  {
    var tooltip = event.target;
    var vboxes = tooltip.getElementsByTagName("vbox");
    var find = false;
    var i = 0;
    gInforssMediator.setActiveTooltip();
    while ((i < vboxes.length) && (find == false))
    {
      if (vboxes[i].hasAttribute("enclosureUrl") &&
          vboxes[i].headline.feed.feedXML.getAttribute("playPodcast") == "true")
      {
        find = true;
        if (vboxes[i].childNodes.length == 1)
        {
          var br = document.createElement("browser");
          br.setAttribute("enclosureUrl", vboxes[i].getAttribute("enclosureUrl"));
          if (vboxes[i].getAttribute("enclosureType").indexOf("video") == 0)
          {
            br.style.width = "200px";
            br.style.height = "200px";
          }
          vboxes[i].appendChild(br);
          if (vboxes[i].getAttribute("enclosureType").indexOf("video") == 0)
          {
            br.setAttribute("src", "data:text/html;charset=utf-8,<HTML><BODY><EMBED src='" + vboxes[i].getAttribute("enclosureUrl") + "' autostart='true' ></EMBED></BODY></HTML>");
          }
          else
          {
            br.setAttribute("src", "data:text/html;charset=utf-8,<HTML><BODY><EMBED src='" + vboxes[i].getAttribute("enclosureUrl") + "' autostart='true' width='1' height='1'></EMBED></BODY></HTML>");
          }
        }
      }
      else
      {
        i++;
      }
    }
    var browsers = tooltip.getElementsByTagName("browser");
    if (browsers.length > 0)
    {
      //Picky note: Why shouldn't we do this anyway?
      gInforssTooltipBrowser = null;
      for (i = 0; i < browsers.length; i++)
      {
        if ((browsers[i].srcUrl != null) && ((browsers[i].getAttribute("src") == null) || (browsers[i].getAttribute("src") == "")))
        {
          browsers[i].style.width = INFORSS_TOOLTIP_BROWSER_WIDTH + "px";
          browsers[i].style.height = INFORSS_TOOLTIP_BROWSER_HEIGHT + "px";
          browsers[i].setAttribute("flex", "1");
          browsers[i].setAttribute("src", browsers[i].srcUrl);
          browsers[i].focus();
        }
        if (gInforssTooltipBrowser == null)
        {
          if (browsers[i].hasAttribute("enclosureUrl") == false)
          {
            gInforssTooltipBrowser = browsers[i];
          }
        }
        browsers[i].contentWindow.scrollTo(0, 0);
      }
    }
    tooltip.setAttribute("noautohide", "true");

    if (document.tooltipNode != null)
    {
      document.tooltipNode.addEventListener("mousemove", inforssHeadlineDisplay.manageTooltipMouseMove, false);
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
  return true;
};

//-------------------------------------------------------------------------------------------------------------
inforssHeadlineDisplay.manageTooltipClose = function(event)
{
  try
  {
    gInforssMediator.resetActiveTooltip();
    if (document.tooltipNode != null)
    {
      document.tooltipNode.removeEventListener("mousemove", inforssHeadlineDisplay.manageTooltipMouseMove, false);
    }

    //Need to set tooltip to beginning of article and enable podcast playing to
    //see one of these...
    let item = event.target.querySelector("browser[enclosureUrl]");
    if (item != null)
    {
      item.parentNode.removeChild(item);
    }
    gInforssTooltipBrowser = null;
  }
  catch (e)
  {
    inforss.debug(e);
  }
  return true;
};

//-------------------------------------------------------------------------------------------------------------
inforssHeadlineDisplay.manageTooltipMouseMove = function(event)
{
  try
  {
    if (gInforssTooltipX == -1)
    {
      gInforssTooltipX = event.screenX;
    }
    if (gInforssTooltipY == -1)
    {
      gInforssTooltipY = event.screenY;
    }
    if (gInforssTooltipBrowser != null)
    {
      gInforssTooltipBrowser.contentWindow.scrollBy((event.screenX - gInforssTooltipX) * 50, (event.screenY - gInforssTooltipY) * 50);
    }
    gInforssTooltipX = event.screenX;
    gInforssTooltipY = event.screenY;

  }
  catch (e)
  {
    inforss.debug(e);
  }
};

//------------------------------------------------------------------------------
//Mouse released over resizer button.
//Stop resizing headline bar and save.
inforssHeadlineDisplay.resizer_mouse_up = function(/*event*/)
{
  inforssXMLRepository.save();
  gInforssCanResize = false;
  gInforssMediator.checkStartScrolling();
  //FIXME remove the onmouseevent handler here
};

//------------------------------------------------------------------------------
//Mouse pressed over resizer button.
//enable resizing
inforssHeadlineDisplay.resizer_mouse_down = function(event)
{
  gInforssX = event.clientX;
  //FIXME For reasons that are unclear, the 'width' appears to be a string.
  gInforssWidth = eval(gInforssNewsbox1.width);
  gInforssCanResize = true;
  //FIXME add the onmouseevent handler here
};

//------------------------------------------------------------------------------
//This is called whenever the mouse moves over the status bar.
//If we come in with the button unclicked, pretend we had an up.
inforssHeadlineDisplay.mouse_move = function(event)
{
  if (gInforssCanResize &&
      inforssXMLRepository.headline_bar_location == inforssXMLRepository.in_status_bar)
  {
  //jshint bitwise: false
    if ((event.buttons & 1) != 0)
  //jshint bitwise: true
    {
      const width = gInforssWidth - (event.clientX - gInforssX);
      if (width > 10)
      {
        inforssXMLRepository.status_bar_scrolling_area = width;
        gInforssMediator.resizedWindow();
      }
    }
    else
    {
      //What probably happened is we drifted off the bar and released the mouse.
      //In that case we dont receive a raised click, so deal with it now
      inforssHeadlineDisplay.resizer_mouse_up(event);
    }
  }
};


//------------------------------------------------------------------------------
//Called from onpopupshowing event on hide old button on addon bar
inforssHeadlineDisplay.hideoldTooltip = function(event)
{
  const tooltip = document.getElementById("inforss.popup.mainicon");
  if (tooltip.hasAttribute("inforssUrl"))
  {
    const info = gInforssMediator.locateFeed(tooltip.getAttribute("inforssUrl"));
    if (info != null && info.info != null)
    {
      const label = event.target.firstChild;
      const value = label.getAttribute("value");
      const index = value.indexOf("(");
      label.setAttribute("value", value.substring(0, index) + "(" + info.info.getNbNew() + ")");
    }
  }
  return true;
};

//------------------------------------------------------------------------------
//Called from onpopupshowing event on main icon on addon bar
inforssHeadlineDisplay.mainTooltip = function(/*event*/)
{
  if (gInforssPreventTooltip)
  {
    return false;
  }

  try
  {
    let tooltip = document.getElementById("inforss.popup.mainicon");
    let rows = inforss.replace_without_children(tooltip.firstChild.childNodes[1]);
    if (tooltip.hasAttribute("inforssUrl"))
    {
      let info = gInforssMediator.locateFeed(tooltip.getAttribute("inforssUrl"));
      if (info != null)
      {
        let add_row = function(desc, value)
        {
          let row = document.createElement("row");
          let label = document.createElement("label");
          label.setAttribute("value", inforss.get_string(desc) + " : ");
          label.style.width = "70px";
          row.appendChild(label);
          label = document.createElement("label");
          label.setAttribute("value", value);
          label.style.color = "blue";
          row.appendChild(label);
          rows.appendChild(row);
        };

        add_row("title", info.info.getTitle());

        if (info.info.getType() != "group")
        {
          add_row("url", info.info.getUrl());
          add_row("link", info.info.getLinkAddress());
          add_row("feed.lastrefresh",
                  info.info.lastRefresh == null ?
                    "" : inforss.format_as_hh_mm_ss(info.info.lastRefresh));

          add_row("feed.nextrefresh",
                  info.info.next_refresh == null ?
                    "" : inforss.format_as_hh_mm_ss(info.info.next_refresh));
        }

        add_row("report.nbheadlines", info.info.getNbHeadlines());
        add_row("report.nbunreadheadlines", info.info.getNbUnread());
        add_row("report.nbnewheadlines", info.info.getNbNew());
      }
    }
    else
    {
      let row = document.createElement("row");
      let label = document.createElement("label");
      label.setAttribute("value", "No info");
      row.appendChild(label);
      rows.appendChild(row);
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
  return true;
};
