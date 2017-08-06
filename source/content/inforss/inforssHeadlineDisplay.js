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
/* globals inforssDebug, inforssTraceIn, inforssTraceOut */
Components.utils.import("chrome://inforss/content/modules/inforssDebug.jsm");

/* globals replace_without_children, remove_all_children */
Components.utils.import("chrome://inforss/content/modules/inforssUtils.jsm");

/* globals inforssNotifier */
/* globals inforssXMLRepository, inforssSave */
/* globals inforssFeed */
/* globals INFORSS_DEFAULT_ICO, gInforssRssBundle */
/* globals gInforssMediator, gInforssCanResize: true, gInforssPreventTooltip */

const INFORSS_TOOLTIP_BROWSER_WIDTH = 600;
const INFORSS_TOOLTIP_BROWSER_HEIGHT = 400;
var gInforssTooltipX = -1;
var gInforssTooltipY = -1;
var gInforssTooltipBrowser = null;
var gInforssLastResize = null;
var gInforssSpacerEnd = null;
var gInforssNewsbox1 = null;
var tabmail = null;

const As_HH_MM_SS = new Intl.DateTimeFormat(
  [],
  { hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false }
);

//FIXME get rid of all the 2 phase initialisation
function inforssHeadlineDisplay(mediator, box)
{
  this.mediator = mediator;
  gInforssNewsbox1 = box;
  return this;
}

inforssHeadlineDisplay.prototype = {
  canScroll: true,
  canScrollSize: true,
  scrollTimeout: null,
  notifier: new inforssNotifier(),
  activeTooltip: false,

  //----------------------------------------------------------------------------
  init: function()
  {
    var news = gInforssNewsbox1.firstChild;
    if ((news != null) && (news.getAttribute("id") != "inforss-spacer-end"))
    {
      if (inforssXMLRepository.headline_bar_style() == inforssXMLRepository.fade_into_next)
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
      inforssXMLRepository.headline_bar_enabled() ? "false" : "true");
  },

  //-------------------------------------------------------------------------------------------------------------
  removeDisplay: function(feed)
  {
    inforssTraceIn(this);
    try
    {
      var oldList = feed.getDisplayedHeadlines();
      if (oldList != null)
      {
        for (let i = 0; i < oldList.length; i++)
        {
          this.removeFromScreen(oldList[i]);
        }
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
      inforssDebug(e, this);
    }
    inforssTraceOut();
  },

  //-------------------------------------------------------------------------------------------------------------
  setActiveTooltip: function()
  {
    try
    {
      this.activeTooltip = true;
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
  },

  //-------------------------------------------------------------------------------------------------------------
  resetActiveTooltip: function()
  {
    try
    {
      this.activeTooltip = false;
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
  },

  //-------------------------------------------------------------------------------------------------------------
  isActiveTooltip: function()
  {
    return this.activeTooltip;
  },

  //-------------------------------------------------------------------------------------------------------------
  stopScrolling: function()
  {
    try
    {
      //The nullity of scrolltimeout is used to stop startScrolling re-kicking
      //the timer.
      window.clearTimeout(this.scrollTimeout);
      this.scrollTimeout = null;
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
  },

  //-------------------------------------------------------------------------------------------------------------
  startScrolling: function()
  {
    try
    {
      if (this.scrollTimeout == null)
      {
        this.scrollTimeout =
          window.setTimeout(this.scroll.bind(this),
            inforssXMLRepository.headline_bar_style() == inforssXMLRepository.fade_into_next? 0 : 1800);
      }
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
  },

  //-------------------------------------------------------------------------------------------------------------
  resetDisplay: function()
  {
    inforssTraceIn();
    try
    {
      remove_all_children(gInforssNewsbox1);
      gInforssSpacerEnd = null;
      this.stopScrolling();
    }
    finally
    {
      inforssTraceOut();
    }
  },

  //----------------------------------------------------------------------------
  removeFromScreen: function(headline)
  {
    inforssTraceIn(this);
    try
    {
      if ((headline.hbox != null) && (headline.hbox.parentNode != null))
      {
        headline.hbox.parentNode.removeChild(headline.hbox);
      }
      headline.resetHbox();
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut();
  },

  //----------------------------------------------------------------------------
  purgeOldHeadlines: function(feed)
  {
    inforssTraceIn(this);
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
      inforssDebug(e, this);
    }
    inforssTraceOut();
  },

  //----------------------------------------------------------------------------
  createHbox: function(feed, headline, hbox, maxTitleLength, lastInserted)
  {
    inforssTraceIn(this);
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
      if (inforssXMLRepository.headline_bar_style() == inforssXMLRepository.fade_into_next)
      {
        container.setAttribute("collapsed", "true");
      }
      container.setAttribute("link", link);
      container.setAttribute("flex", "0");
      container.style.fontFamily = inforssXMLRepository.headline_font_family();
      container.style.fontSize = inforssXMLRepository.headline_font_size();
      container.setAttribute("pack", "end");

      if (inforssXMLRepository.headline_shows_feed_icon())
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
        vbox = null;
        spacer = null;
        image = null;
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
          inforssXMLRepository.headline_shows_enclosure_icon())
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
        description1.setAttribute("value", gInforssRssBundle.getString("inforss.url") + ": " + headline.enclosureUrl);
        vbox1.appendChild(description1);
        description1 = document.createElement("label");
        description1.setAttribute("value", gInforssRssBundle.getString("inforss.enclosure.type") + ": " + headline.enclosureType);
        vbox1.appendChild(description1);
        description1 = document.createElement("label");
        description1.setAttribute("value", gInforssRssBundle.getString("inforss.enclosure.size") + ": " + headline.enclosureSize + " " + gInforssRssBundle.getString("inforss.enclosure.sizeUnit"));
        vbox1.appendChild(description1);

        spacer = document.createElement("spacer");
        vbox.appendChild(spacer);
        spacer.setAttribute("flex", "1");
      }


      if (inforssXMLRepository.headline_shows_ban_icon())
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

      container.addEventListener("mousedown", inforssHeadlineDisplay.headlineEventListener, false);
      headline.setHbox(container);
      if ((inforssXMLRepository.isQuickFilterActif()) && (initialLabel != null) &&
        (initialLabel != "") && (initialLabel.toLowerCase().indexOf(inforssXMLRepository.getQuickFilter().toLowerCase()) == -1))
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
      switch (inforssXMLRepository.headline_tooltip_style())
      {
        case "description":
          {
            let fragment = Components.classes["@mozilla.org/feed-unescapehtml;1"].getService(Components.interfaces.nsIScriptableUnescapeHTML).parseFragment(description, false, null, container);
            this.fillTooltip(itemLabel, headline, fragment.textContent, "text");
            break;
          }
        case "title":
          {
            let fragment = Components.classes["@mozilla.org/feed-unescapehtml;1"].getService(Components.interfaces.nsIScriptableUnescapeHTML).parseFragment(headline.title, false, null, container);
            this.fillTooltip(itemLabel, headline, fragment.textContent, "text");
            break;
          }
        case "allInfo":
          {
            let fragment = Components.classes["@mozilla.org/feed-unescapehtml;1"].getService(Components.interfaces.nsIScriptableUnescapeHTML).parseFragment(description, false, null, container);

            this.fillTooltip(itemLabel, headline, "<TABLE width='100%' style='background-color:#2B60DE; color:white; -moz-border-radius: 10px; padding: 6px'><TR><TD colspan=2 align=center style='border-bottom-style:solid; border-bottom-width:1px '><B><img src='" + feed.getIcon() + "' width=16px height=16px> " + feed.getTitle() + "</B></TD></TR><TR><TD align='right'><B>" + gInforssRssBundle.getString("inforss.title") + ": </B></TD><TD>" + headline.title + "</TD></TR><TR><TD align='right'><B>" + gInforssRssBundle.getString("inforss.date") + ": </B></TD><TD>" + headline.publishedDate + "</TD></TR><TR><TD align='right'><B>" + gInforssRssBundle.getString("inforss.rss") + ": </B></TD><TD>" + headline.url + "</TD></TR><TR><TD align='right'><B>" + gInforssRssBundle.getString("inforss.link") + ": </B></TD><TD>" + headline.link + "</TD></TR></TABLE><br>" + fragment.textContent, "text");
            break;
          }
          //case "article":
        default:
          {
            this.fillTooltip(itemLabel, headline, headline.link, "url");
            break;
          }
      }
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    finally
    {
      inforssTraceOut();
    }

    return container;
  },

  //----------------------------------------------------------------------------
  fillTooltip: function(label, headline, str, type)
  {
    inforssTraceIn(this);
    try
    {
      str = inforssFeed.htmlFormatConvert(str);
      if (! label.hasAttribute("tooltip"))
      {
        this.createTooltip(label, headline);
      }
      //FIXME Is it really necessary to do the getElementsByTagName? won't we
      //always have precisely one?
      let vboxs = document.getElementById(label.getAttribute("tooltip")).firstChild.getElementsByTagName("vbox");
      let vbox = replace_without_children(vboxs[vboxs.length - 1]);
      if (type == "text")
      {
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
            let description = document.createElement("label");
            description.setAttribute("value", str.substring(0, j).trim());
            vbox.appendChild(description);
            str = str.substring(j + 1).trim();
          } while (str != "");
        }
        else if (headline.enclosureUrl != null)
        {
          let image = document.createElement("image");
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
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut();
  },

  //----------------------------------------------------------------------------
  createTooltip: function(itemLabel, headline)
  {
    inforssTraceIn(this);
    try
    {
      var tooltip = document.createElement("tooltip");
      tooltip.setAttribute("id", "inforss.headline.tooltip." + headline.guid);
      tooltip.setAttribute("position", "before_end");
      document.getElementById("inforss.popupset").appendChild(tooltip);
      var nodes = document.getAnonymousNodes(tooltip);
      nodes[0].setAttribute("collapsed", "true");
      itemLabel.setAttribute("tooltip", tooltip.getAttribute("id"));
      var toolHbox = document.createElement("hbox");
      tooltip.appendChild(toolHbox);
      toolHbox.setAttribute("flex", "1");
      if ((headline.enclosureUrl != null) && (inforssXMLRepository.headline_tooltip_style() != "article"))
      {
        var vbox1 = document.createElement("vbox");
        vbox1.setAttribute("flex", "0");
        vbox1.style.backgroundColor = "inherit";
        toolHbox.appendChild(vbox1);
        if (headline.enclosureType.indexOf("image") == 0)
        {
          var img = document.createElement("image");
          img.setAttribute("src", headline.enclosureUrl);
          vbox1.appendChild(img);
        }
        else
        {
          if ((headline.enclosureType.indexOf("audio") == 0) ||
            (headline.enclosureType.indexOf("video") == 0))
          {
            vbox1.setAttribute("enclosureUrl", headline.enclosureUrl);
            vbox1.setAttribute("enclosureType", headline.enclosureType);
            vbox1.headline = headline;
          }
        }
        var spacer4 = document.createElement("spacer");
        spacer4.setAttribute("width", "10");
        vbox1.appendChild(spacer4);
        vbox1 = null;
        spacer4 = null;
      }
      var toolVbox = document.createElement("vbox");
      toolHbox.appendChild(toolVbox);
      toolVbox.setAttribute("flex", "1");
      tooltip.setAttribute("noautohide", true);
      tooltip.addEventListener("popupshown", inforssHeadlineDisplay.manageTooltipOpen, false);
      tooltip.addEventListener("popuphiding", inforssHeadlineDisplay.manageTooltipClose, false);
      tooltip.itemLabel = itemLabel;
      tooltip = null;
      nodes = null;
      toolHbox = null;
      toolVbox = null;
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut();
  },

  //-------------------------------------------------------------------------------------------------------------
  updateDisplay: function(feed)
  {
    let popupFlag = false;
    inforssTraceIn(this);
    this.updateCmdIcon();
    let canScroll = this.canScroll;
    this.canScroll = false;
    try
    {
      document.getElementById('newsbar1').style.visibility = "visible";
      this.purgeOldHeadlines(feed);
      let firstItem = null;
      let lastItem = null;
      let lastInserted = null;

      let hbox = document.getElementById('inforss.newsbox1');
      if (gInforssSpacerEnd == null)
      {
        let spacer = document.createElement("spacer");
        spacer.setAttribute("id", "inforss-spacer-end");
        if (inforssXMLRepository.headline_bar_location() == inforssXMLRepository.in_status_bar)
        {
          spacer.setAttribute("flex", "0");
        }
        else
        {
          spacer.setAttribute("flex", "1");
        }
        if (inforssXMLRepository.headline_bar_style() == inforssXMLRepository.scrolling_display)
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
        let lastHeadline = this.mediator.getLastDisplayedHeadline();
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

            if ((inforssXMLRepository.isQuickFilterActif()) && (initialLabel != null) &&
              (initialLabel != "") && (initialLabel.toLowerCase().indexOf(inforssXMLRepository.getQuickFilter().toLowerCase()) == -1))
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
              if (container.hasAttribute("collapsed"))
              {
                container.removeAttribute("collapsed");
              }
              container.setAttribute("filtered", "false");
            }
            container.addEventListener("mousedown", inforssHeadlineDisplay.headlineEventListener, false);
            lastInserted = container;
          }
          else
          {
            lastInserted = firstItem;
          }
          switch (inforssXMLRepository.headline_tooltip_style())
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
                this.fillTooltip(container.getElementsByTagName("label")[0], newList[i], "<TABLE width='100%' style='background-color:#2B60DE; color:white; -moz-border-radius: 10px; padding: 6px'><TR><TD colspan=2 align=center style='border-bottom-style:solid; border-bottom-width:1px'><B><img src='" + feed.getIcon() + "' width=16px height=16px> " + feed.getTitle() + "</B></TD></TR><TR><TD align='right'><B>" + gInforssRssBundle.getString("inforss.title") + ": </B></TD><TD>" + newList[i].title + "</TD></TR><TR><TD align='right'><B>" + gInforssRssBundle.getString("inforss.date") + ": </B></TD><TD>" + newList[i].publishedDate + "</TD></TR><TR><TD align='right'><B>" + gInforssRssBundle.getString("inforss.rss") + ": </B></TD><TD>" + newList[i].url + "</TD></TR><TR><TD align='right'><B>" + gInforssRssBundle.getString("inforss.link") + ": </B></TD><TD>" + newList[i].link + "</TD></TR></TABLE><br>" + fragment.textContent, "text");
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
        if (t0 - newList[i].receivedDate < inforssXMLRepository.recent_headline_max_age() * 60000)
        {
          inforssHeadlineDisplay.setBackgroundColor(container, true);
          container.style.fontWeight = inforssXMLRepository.recent_headline_font_weight();
          container.style.fontStyle = inforssXMLRepository.recent_headline_font_style();
          if ((popupFlag == false) &&
            (inforssXMLRepository.show_toast_on_new_headline()) &&
            ((feed.getAcknowledgeDate() == null) ||
              (newList[i].receivedDate > feed.getAcknowledgeDate())))
          {
            popupFlag = true;
            if (feed.getPopup() == false)
            {
              let observerService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
              observerService.notifyObservers(null, "popup", feed.getUrl() + "__SEP__" + "true");
              observerService = null;
              this.notifier.notify(feed.getIcon(), gInforssRssBundle.getString("inforss.new.headline"), gInforssRssBundle.getString("inforss.popup.newheadline") + " " + feed.getTitle(), feed.getUrl());
            }
          }
        }
        else
        {
          inforssHeadlineDisplay.setDefaultBackgroundColor(container, true);
          container.style.fontWeight = "normal";
          container.style.fontStyle = "normal";
        }
        if (inforssXMLRepository.headline_bar_style() == inforssXMLRepository.fade_into_next)
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
          if ((inforssXMLRepository.isQuickFilterActif()) && (initialLabel != null) &&
            (initialLabel != "") && (initialLabel.toLowerCase().indexOf(inforssXMLRepository.getQuickFilter().toLowerCase()) == -1))
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
            if (container.hasAttribute("collapsed"))
            {
              container.removeAttribute("collapsed");
            }
            container.setAttribute("filtered", "false");
          }
        }
      }
      feed.updateDisplayedHeadlines();
      this.canScroll = canScroll;
      if (newList.length > 0 &&
          inforssXMLRepository.headline_bar_style() != inforssXMLRepository.static_display)
      {
        if (this.canScroll)
        {
          this.checkCollapseBar();
          this.checkScroll();
        }
        if ((this.canScroll) && (this.canScrollSize))
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
      inforssDebug(e, this);
      this.canScroll = canScroll;
      if ((inforssXMLRepository.headline_bar_style() != inforssXMLRepository.static_display) && (this.canScroll))
      {
        this.checkScroll();
      }
    }
    inforssTraceOut();
  },

  //----------------------------------------------------------------------------
  updateCmdIcon: function()
  {
    try
    {
      var image = document.getElementById("inforss.icon.readall");
      if (inforssXMLRepository.headline_bar_show_mark_all_as_read_button())
      {
        image.setAttribute("collapsed", "false");
      }
      else
      {
        image.setAttribute("collapsed", "true");
      }

      image = document.getElementById("inforss.icon.viewall");
      if (inforssXMLRepository.headline_bar_show_view_all_button())
      {
        image.setAttribute("collapsed", "false");
      }
      else
      {
        image.setAttribute("collapsed", "true");
      }

      image = document.getElementById("inforss.icon.previous");
      if (inforssXMLRepository.headline_bar_show_previous_feed_button())
      {
        image.setAttribute("collapsed", "false");
      }
      else
      {
        image.setAttribute("collapsed", "true");
      }

      image = document.getElementById("inforss.icon.next");
      if (inforssXMLRepository.headline_bar_show_next_feed_button())
      {
        image.setAttribute("collapsed", "false");
      }
      else
      {
        image.setAttribute("collapsed", "true");
      }

      image = document.getElementById("inforss.icon.shuffle");
      if (inforssXMLRepository.headline_bar_show_shuffle_toggle())
      {
        image.setAttribute("collapsed", "false");
        if (inforssXMLRepository.headline_bar_cycle_type() == "next")
        {
          image.setAttribute("src", "chrome://inforss/skin/noshuffle.png");
        }
        else
        {
          image.setAttribute("src", "chrome://inforss/skin/shuffle.png");
        }
      }
      else
      {
        image.setAttribute("collapsed", "true");
      }

      image = document.getElementById("inforss.icon.scrolling");
      if (inforssXMLRepository.headline_bar_show_scrolling_toggle())
      {
        image.setAttribute("collapsed", "false");
        if (inforssXMLRepository.headline_bar_style() == inforssXMLRepository.static_display)
        {
          image.setAttribute("src", "chrome://inforss/skin/scrolling.png");
        }
        else
        {
          image.setAttribute("src", "chrome://inforss/skin/noscrolling.png");
        }
      }
      else
      {
        image.setAttribute("collapsed", "true");
      }

      image = document.getElementById("inforss.icon.direction");
      if (inforssXMLRepository.headline_bar_show_direction_toggle())
      {
        image.setAttribute("collapsed", "false");
        if (inforssXMLRepository.headline_bar_scrolling_direction() == "rtl")
        {
          image.setAttribute("src", "chrome://inforss/skin/rtl.png");
        }
        else
        {
          image.setAttribute("src", "chrome://inforss/skin/ltr.png");
        }
      }
      else
      {
        image.setAttribute("collapsed", "true");
      }

      image = document.getElementById("inforss.icon.pause");
      if (inforssXMLRepository.headline_bar_show_pause_toggle())
      {
        image.setAttribute("collapsed", "false");
        if (this.canScroll)
        {
          image.setAttribute("src", "chrome://inforss/skin/pause.gif");
        }
        else
        {
          image.setAttribute("src", "chrome://inforss/skin/pausing.gif");
        }
      }
      else
      {
        image.setAttribute("collapsed", "true");
      }

      image = document.getElementById("inforss.icon.refresh");
      if (inforssXMLRepository.headline_bar_show_manual_refresh_button())
      {
        image.setAttribute("collapsed", "false");
      }
      else
      {
        image.setAttribute("collapsed", "true");
      }

      image = document.getElementById("inforss.icon.hideold");
      if (inforssXMLRepository.headline_bar_show_hide_old_headlines_toggle())
      {
        image.setAttribute("collapsed", "false");
        if (inforssXMLRepository.hide_old_headlines())
        {
          image.setAttribute("src", "chrome://inforss/skin/hideold.png");
        }
        else
        {
          image.setAttribute("src", "chrome://inforss/skin/nohideold.png");
        }
      }
      else
      {
        image.setAttribute("collapsed", "true");
      }

      image = document.getElementById("inforss.icon.hideviewed");
      if (inforssXMLRepository.headline_bar_show_hide_viewed_headlines_toggle())
      {
        image.setAttribute("collapsed", "false");
        if (inforssXMLRepository.hide_viewed_headlines())
        {
          image.setAttribute("src", "chrome://inforss/skin/hideviewed.png");
        }
        else
        {
          image.setAttribute("src", "chrome://inforss/skin/nohideviewed.png");
        }
      }
      else
      {
        image.setAttribute("collapsed", "true");
      }

      image = document.getElementById("inforss.icon.synchronize");
      if (inforssXMLRepository.headline_bar_show_manual_synchronisation_button())
      {
        image.setAttribute("collapsed", "false");
      }
      else
      {
        image.setAttribute("collapsed", "true");
      }

      image = document.getElementById("inforss.icon.home");
      if (inforssXMLRepository.headline_bar_show_home_button())
      {
        image.setAttribute("collapsed", "false");
      }
      else
      {
        image.setAttribute("collapsed", "true");
      }

      image = document.getElementById("inforss.icon.filter");
      if (inforssXMLRepository.headline_bar_show_quick_filter_button())
      {
        image.setAttribute("collapsed", "false");
        if (inforssXMLRepository.isQuickFilterActif())
        {
          image.setAttribute("src", "chrome://inforss/skin/filter1.png");
        }
        else
        {
          image.setAttribute("src", "chrome://inforss/skin/filter2.png");
        }
      }
      else
      {
        image.setAttribute("collapsed", "true");
      }
      image = null;
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut();
  },

  //-------------------------------------------------------------------------------------------------------------
  updateMenuIcon: function(feed)
  {
    try
    {
      document.getElementById("inforss.popup.mainicon").setAttribute("inforssUrl", feed.feedXML.getAttribute("url"));
      var statuspanel = document.getElementById('inforss-icon');
      if (inforssXMLRepository.icon_shows_current_feed())
      {
        if (this.mediator.getCycleGroup() == null)
        {
          statuspanel.setAttribute("src", feed.getIcon());
          var subElement = document.getAnonymousNodes(statuspanel);

          if ((subElement != null) && (subElement.length > 0) && (subElement[0] != null) && (subElement[0].localName == "image"))
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
      }
      else
      {
        statuspanel.setAttribute("src", "chrome://inforss/skin/inforss.png");
      }

      statuspanel = null;
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut();
  },

  //-------------------------------------------------------------------------------------------------------------
  scroll: function()
  {
    var canScrollSet = false;
    var canScroll = false;
    try
    {
      if ((this.canScroll) && (this.canScrollSize))
      {
        canScroll = this.canScroll;
        this.canScroll = false;
        canScrollSet = true;
        this.scroll1((inforssXMLRepository.headline_bar_scrolling_direction() == "rtl") ? 1 : -1, true);
      }
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    if (canScrollSet)
    {
      this.canScroll = canScroll;
    }
    this.scrollTimeout =
      window.setTimeout(this.scroll.bind(this),
                        (30 - inforssXMLRepository.headline_bar_scroll_speed()) * 10);
  },

  //----------------------------------------------------------------------------
  //FIXME THis is a mess with evals of width but not in all places...
  scroll1: function(direction, forceWidth)
  {
    try
    {
      var getNext = false;
      var news = gInforssNewsbox1.firstChild;
      if ((news != null) && (news.getAttribute("id") != "inforss-spacer-end"))
      {
        var width = null;
        var opacity = null;
        if (inforssXMLRepository.headline_bar_style() == inforssXMLRepository.fade_into_next) // fade in/out mode
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
                width -= inforssXMLRepository.headline_bar_scroll_increment();
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
                width = eval(width) + inforssXMLRepository.headline_bar_scroll_increment();
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
          if (inforssXMLRepository.headline_bar_style() != inforssXMLRepository.fade_into_next)
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
      inforssDebug(e, this);
    }
  },

  //-------------------------------------------------------------------------------------------------------------
  forceScrollInDisplay: function(direction, forceWidth)
  {
    let news = null;
    let spacerEnd = gInforssSpacerEnd;
    if (direction == 1)
    {
      news = gInforssNewsbox1.firstChild;
      let hbox = news.parentNode;
      news.removeEventListener("mousedown", inforssHeadlineDisplay.headlineEventListener, false);
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
      news.removeEventListener("mousedown", inforssHeadlineDisplay.headlineEventListener, false);
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

    news.addEventListener("mousedown", inforssHeadlineDisplay.headlineEventListener, false);
  },

  //-------------------------------------------------------------------------------------------------------------
  handleMouseScroll: function(direction)
  {
    let dir = (direction > 0) ? 1 : -1;
    //FIXME Should be a switch
    if (inforssXMLRepository.headline_bar_mousewheel_scroll() == inforssXMLRepository.by_pixel)
    {
      let end = (direction > 0) ? direction : -direction;
      for (let i = 0; i < end; i++)
      {
        this.scroll1(dir, true);
      }
    }
    else
    {
      if (inforssXMLRepository.headline_bar_mousewheel_scroll() == inforssXMLRepository.by_pixels)
      {
        for (let i = 0; i < 10; i++)
        {
          this.scroll1(dir, true);
        }
      }
      else
      {
        this.forceScrollInDisplay(dir, false);
      }
    }
  },


  //----------------------------------------------------------------------------
  clickRSS: function(event, link)
  {
    inforssTraceIn();
    try
    {
      let observerService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
      var title = null;
      if ((event.button == 0) && (event.ctrlKey == false) && (event.shiftKey == false))
      {
        if (event.target.hasAttribute("inforss"))
        {
          let data = event.target.previousSibling.getAttribute("title") + "__SEP__" + link;
          observerService.notifyObservers(null, "banned", data);
        }
        else
        {
          if (event.target.hasAttribute("playEnclosure"))
          {
            this.openTab(event.target.getAttribute("playEnclosure"));
          }
          else
          {
            if (event.target.hasAttribute("title") == false)
            {
              let p = event.target.parentNode;
              while ((p.getElementsByTagName("label") == null) || (p.getElementsByTagName("label").length == 0))
              {
                p = p.parentNode;
              }
              title = p.getElementsByTagName("label").item(0).getAttribute("title");
            }
            else
            {
              title = event.target.getAttribute("title");
            }
            let data = title + "__SEP__" + link;
            observerService.notifyObservers(null, "viewed", data);

            this.openTab(link);
          }
        }
      }
      else
      {
        if ((event.button == 2) || ((event.button == 0) && (event.ctrlKey) && (event.shiftKey == false)))
        {
          if (event.target.hasAttribute("title") == false)
          {
            let p = event.target.parentNode;
            while ((p.getElementsByTagName("label") == null) || (p.getElementsByTagName("label").length == 0))
            {
              p = p.parentNode;
            }
            title = p.getElementsByTagName("label").item(0).getAttribute("title");
          }
          else
          {
            title = event.target.getAttribute("title");
          }
          let data = title + "__SEP__" + link;
          observerService.notifyObservers(null, "banned", data);
          event.cancelBubble = true;
          event.stopPropagation();
        }
        else
        {
          if ((event.button == 1) || ((event.button == 0) && (event.ctrlKey == false) && (event.shiftKey)))
          {
            this.switchPause();
            var clipboardHelper = Components.classes["@mozilla.org/widget/clipboardhelper;1"].getService(Components.interfaces.nsIClipboardHelper);
            clipboardHelper.copyString(link);
          }
        }
      }
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut();
  },


  //-----------------------------------------------------------------------------------------------------
  testCreateTab: function()
  {
    inforssTraceIn(this);

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
      inforssDebug(e, this);
    }
    inforssTraceOut();
    return returnValue;
  },

  //-------------------------------------------------------------------------------------------------------------
  openTab: function(link)
  {
    inforssTraceIn(this);
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

      let behaviour = inforssXMLRepository.headline_action_on_click();
      switch (behaviour)
      {
        case inforssXMLRepository.new_default_tab:
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

        case inforssXMLRepository.new_background_tab:
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

        case inforssXMLRepository.new_foreground_tab: // in tab, foreground
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

        case inforssXMLRepository.new_window:
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

          case inforssXMLRepository.current_tab:
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
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  },

  //-----------------------------------------------------------------------------------------------------
  checkStartScrolling: function()
  {
    inforssTraceIn(this);
    try
    {
      this.checkScroll();
      if (inforssXMLRepository.headline_bar_style() != inforssXMLRepository.static_display)
      {
        this.startScrolling();
      }
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut();
  },

  //-----------------------------------------------------------------------------------------------------
  checkScroll: function()
  {
    inforssTraceIn(this);
    try
    {
      var hbox = gInforssNewsbox1;
      if (inforssXMLRepository.headline_bar_style() == inforssXMLRepository.scrolling_display &&
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
        this.canScrollSize = (width > eval(hbox.boxObject.width));
        if (this.canScrollSize == false)
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
        news = null;
        width = null;
      }
      this.checkCollapseBar();
      hbox = null;
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut();
  },


  //----------------------------------------------------------------------------
  checkCollapseBar: function()
  {
    inforssTraceIn(this);
    try
    {
      if (inforssXMLRepository.headline_bar_location() == inforssXMLRepository.in_status_bar)
      {
        var hbox = document.getElementById("inforss.newsbox1");
        if ((hbox.childNodes.length == 1) && (inforssXMLRepository.headline_bar_collapsed()))
        {
          if (hbox.hasAttribute("collapsed"))
          {
            if (hbox.getAttribute("collapsed") == "false")
            {
              hbox.setAttribute("collapsed", "true");
              this.canScroll = true;
            }
          }
          else
          {
            hbox.setAttribute("collapsed", "true");
            this.canScroll = true;
          }
        }
        else
        {
          if (hbox.hasAttribute("collapsed"))
          {
            if (hbox.getAttribute("collapsed") == "true")
            {
              hbox.setAttribute("collapsed", "false");
            }
          }
          else
          {
            hbox.setAttribute("collapsed", "false");
          }
        }
      }
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut();
  },

  //-----------------------------------------------------------------------------------------------------
  switchScroll: function()
  {
    inforssTraceIn(this);
    try
    {
      inforssXMLRepository.toggleScrolling();
      this.init();
      if (inforssXMLRepository.headline_bar_style() == inforssXMLRepository.static_display)
      {
        this.stopScrolling();
      }
      else
      {
        this.startScrolling();
      }
      gInforssCanResize = false;
      this.canScroll = true;
      this.mediator.refreshBar();
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    finally
    {
      inforssTraceOut();
    }
  },

  //-----------------------------------------------------------------------------------------------------
  quickFilter: function()
  {
    inforssTraceIn(this);
    try
    {
      var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
      var filter1 = {
        value: inforssXMLRepository.getQuickFilter()
      };
      var actif = {
        value: inforssXMLRepository.isQuickFilterActif()
      };
      var valid = promptService.prompt(window, document.getElementById("bundle_inforss").getString("inforss.quick.filter.title"),
        document.getElementById("bundle_inforss").getString("inforss.quick.filter"),
        filter1, document.getElementById("bundle_inforss").getString("inforss.apply"), actif);
      if (valid)
      {
        inforssXMLRepository.setQuickFilter(actif.value, filter1.value);
        this.updateCmdIcon();
        this.applyQuickFilter(actif.value, filter1.value);
        this.checkScroll();
        this.checkCollapseBar();
      }
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut();
  },

  //----------------------------------------------------------------------------
  applyQuickFilter: function(actif, filter)
  {
    inforssTraceIn(this);
    try
    {
      var hbox = document.getElementById('inforss.newsbox1');
      var labels = hbox.getElementsByTagName("label");
      for (var i = 0; i < labels.length; i++)
      {
        var news = labels[i].parentNode;
        if (actif == false)
        {
          if (news.hasAttribute("collapsed"))
          {
            news.removeAttribute("collapsed");
          }
        }
        else
        {
          if ((labels[i].hasAttribute("title")) && (labels[i].getAttribute("title").toLowerCase().indexOf(filter.toLowerCase()) != -1))
          {
            if (news.hasAttribute("collapsed"))
            {
              news.removeAttribute("collapsed");
            }
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
      inforssDebug(e, this);
    }
    inforssTraceOut();
  },

  //-----------------------------------------------------------------------------------------------------
  switchPause: function()
  {
    inforssTraceIn(this);
    try
    {
      if (inforssXMLRepository.headline_bar_style() != inforssXMLRepository.static_display)
      {
        this.canScroll = !this.canScroll;
        this.updateCmdIcon();
      }
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut();
  },

  //-----------------------------------------------------------------------------------------------------
  switchDirection: function()
  {
    inforssTraceIn(this);
    try
    {
      inforssXMLRepository.switchDirection();
      this.updateCmdIcon();
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut();
  },

  //-------------------------------------------------------------------------------------------------------------
  setScroll: function(flag)
  {
    this.canScroll = flag;
    if (this.canScroll)
    {
      this.checkScroll();
    }
  },

  //----------------------------------------------------------------------------
  resizedWindow: function()
  {
    if ((gInforssLastResize == null) || (new Date() - gInforssLastResize) > 2000)
    {
      if (inforssXMLRepository.is_valid() &&
          inforssXMLRepository.headline_bar_location() == inforssXMLRepository.in_status_bar)
      {
        var hbox = document.getElementById('inforss.newsbox1');
        var width = inforssXMLRepository.getScrollingArea();
        var find = false;
        hbox.setAttribute("width", width);
        hbox.style.width = width + "px";

        var hl = document.getElementById("inforss.headlines");
        var spring = hl.nextSibling;
        if ((spring != null) && (spring.getAttribute("id") == "inforss.toolbar.spring"))
        {
          var toolbar = spring.parentNode;
          toolbar.removeChild(spring);
          toolbar.insertBefore(spring, hl);
        }

        if ((hbox.hasAttribute("collapsed")) && (hbox.getAttribute("collapsed") == "true"))
        {
          find = true;
          width--;
        }
        var oldX = hbox.boxObject.screenX;
        var newX = 0;
        if (find == false)
        {
          while ((width > 0) && (find == false))
          {
            hbox.setAttribute("width", width);
            hbox.style.width = width + "px";
            newX = hbox.boxObject.screenX;
            if (newX == oldX)
            {
              width--;
            }
            else
            {
              find = true;
            }
          }
        }
        width++;
        hbox.setAttribute("width", width);
        hbox.style.width = width + "px";
        gInforssLastResize = new Date();
      }
    }
  },

};

//------------------------------------------------------------------------------
//FIXME These two look pretty much the same.
inforssHeadlineDisplay.setBackgroundColor = function(obj, sizeFlag)
{
  if (obj != null)
  {
    if (inforssXMLRepository.getRed() == "-1")
    {
      obj.style.backgroundColor = "inherit";
    }
    else
    {
      obj.style.backgroundColor = "rgb(" + inforssXMLRepository.getRed() + "," + inforssXMLRepository.getGreen() + "," + inforssXMLRepository.getBlue() + ")";
    }
    var color = inforssXMLRepository.recent_headline_text_colour();
    if (color == "auto")
    {
      if (inforssXMLRepository.getRed() == "-1")
      {
        obj.style.color = "inherit";
      }
      else
      {
        obj.style.color = ((eval(inforssXMLRepository.getRed()) + eval(inforssXMLRepository.getGreen()) + eval(inforssXMLRepository.getBlue())) < (3 * 85)) ? "white" : "black";
      }
    }
    else
    {
      obj.style.color = color;
    }
    if (sizeFlag)
    {
      obj.style.fontFamily = inforssXMLRepository.headline_font_family();
      obj.style.fontSize = inforssXMLRepository.headline_font_size();
    }
  }
};

//-------------------------------------------------------------------------------------------------------------
inforssHeadlineDisplay.setDefaultBackgroundColor = function(obj, sizeFlag)
{
  if (obj != null)
  {
    obj.style.backgroundColor = "";
    var defaultColor = inforssXMLRepository.headline_text_colour();
    if (defaultColor == "default")
    {
      obj.style.color = "black";
    }
    else
    {
      if (defaultColor == "sameas")
      {
        var color = inforssXMLRepository.recent_headline_text_colour();
        if (color == "auto")
        {
          if (inforssXMLRepository.getRed() == "-1")
          {
            obj.style.color = "inherit";
          }
          else
          {
            obj.style.color = ((eval(inforssXMLRepository.getRed()) + eval(inforssXMLRepository.getGreen()) + eval(inforssXMLRepository.getBlue())) < (3 * 85)) ? "white" : "black";
          }
        }
        else
        {
          obj.style.color = color;
        }
      }
      else
      {
        obj.style.color = defaultColor;
      }
    }
    if (sizeFlag)
    {
      obj.style.fontFamily = inforssXMLRepository.headline_font_family();
      obj.style.fontSize = inforssXMLRepository.headline_font_size();
    }
  }
};

//------------------------------------------------------------------------------
inforssHeadlineDisplay.pauseScrolling = function(flag)
{
  if ((gInforssMediator != null) && (inforssXMLRepository.headline_bar_stop_on_mouseover()))
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
    if ((browsers != null) && (browsers.length > 0))
    {
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
    inforssDebug(e);
  }
  return true;
};

//------------------------------------------------------------------------------
inforssHeadlineDisplay.resetPopup = function(url)
{
  try
  {
    if ((typeof(url) == "object") || (url == null))
    {
      var vbox = document.getElementById("inforss.notifier");

      if ((vbox != null) && (vbox.childNodes.length > 1))
      {
        var hbox = vbox.childNodes[1];
        var nextHbox = null;
        while (hbox != null)
        {
          nextHbox = hbox.nextSibling;
          if ((hbox.getAttribute("url") != null) && (hbox.getAttribute("url") != ""))
          {
            inforssHeadlineDisplay.resetPopup(hbox.getAttribute("url"));
          }
          vbox.removeChild(hbox);
          hbox = nextHbox;
        }
      }
    }
    else
    {
      var feed = gInforssMediator.locateFeed(url).info;
      if (feed != null)
      {
        feed.setPopup(false);
        feed.setAcknowledgeDate(new Date());
        inforssSave(); //FIXME - Why?
        var observerService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
        observerService.notifyObservers(null, "ack", url);
      }
    }
  }
  catch (e)
  {
    inforssDebug(e);
  }
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
    inforssDebug(e);
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
    inforssDebug(e);
  }
};

//-------------------------------------------------------------------------------------------------------------
inforssHeadlineDisplay.resizerUp = function(event)
{
  try
  {
    gInforssCanResize = false;
    gInforssMediator.checkStartScrolling();
  }
  catch (e)
  {
    inforssDebug(e);
  }
  return true;
};

//-------------------------------------------------------------------------------------------------------------
inforssHeadlineDisplay.headlineEventListener = function(event)
{
  gInforssMediator.clickRSS(event, this.getAttribute("link"));
  event.cancelBubble = true;
  event.stopPropagation();
  return true;
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
inforssHeadlineDisplay.mainTooltip = function(event)
{
  if (gInforssPreventTooltip)
  {
    return false;
  }

  try
  {
    let tooltip = document.getElementById("inforss.popup.mainicon");
    let rows = replace_without_children(tooltip.firstChild.childNodes[1]);
    if (tooltip.hasAttribute("inforssUrl"))
    {
      let info = gInforssMediator.locateFeed(tooltip.getAttribute("inforssUrl"));
      if (info != null)
      {
        let add_row = function(desc, value)
        {
          let row = document.createElement("row");
          let label = document.createElement("label");
          label.setAttribute("value", gInforssRssBundle.getString(desc) + " : ");
          label.style.width = "70px";
          row.appendChild(label);
          label = document.createElement("label");
          label.setAttribute("value", value);
          label.style.color = "blue";
          row.appendChild(label);
          rows.appendChild(row);
        };

        add_row("inforss.title", info.info.getTitle());

        if (info.info.getType() != "group")
        {
          add_row("inforss.url", info.info.getUrl());
          add_row("inforss.link", info.info.getLinkAddress());
          add_row("inforss.feed.lastrefresh",
                  info.info.lastRefresh == null ?
                                  "" :
                                  As_HH_MM_SS.format(info.info.lastRefresh));

          add_row("inforss.feed.nextrefresh",
                  info.info.lastRefresh == null ?
                    "" :
                    As_HH_MM_SS.format(new Date(eval(info.info.lastRefresh.getTime() + info.info.feedXML.getAttribute("refresh") * 60000))));
        }

        add_row("inforss.report.nbheadlines", info.info.getNbHeadlines());
        add_row("inforss.report.nbunreadheadlines", info.info.getNbUnread());
        add_row("inforss.report.nbnewheadlines", info.info.getNbNew());
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
    inforssDebug(e);
  }
  return true;
};
