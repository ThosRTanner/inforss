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


const INFORSS_TOOLTIP_BROWSER_WIDTH = 600;
const INFORSS_TOOLTIP_BROWSER_HEIGHT = 400;
var gInforssTooltipX = -1;
var gInforssTooltipY = -1;
var gInforssTooltipBrowser = null;
var gInforssLastResize = null;

function inforssHeadlineDisplay(mediator)
{
  this.mediator = mediator;
  return this;
}

inforssHeadlineDisplay.prototype =
{
  canScroll : true,
  canScrollSize : true,
  scrollTimeout : null,
  restartScrollingTimer : null,
  notifier : new inforssNotifier(),
  activeTooltip : false,

//-------------------------------------------------------------------------------------------------------------
  init : function()
  {
    var news = gInforssNewsbox1.firstChild;
    if ((news != null) && (news.getAttribute("id") != "inforss-spacer-end"))
    {
      if (inforssXMLRepository.isFadeIn() == true)
      {
        var other = news.nextSibling;
        while (other != null)
        {
          if (other.getAttribute("id") != "inforss-spacer-end")
          {
            other.setAttribute("collapsed","true");
          }
          other = other.nextSibling;
        }
      }
      else
      {
        var other = news;
        while (other != null)
        {
          if (other.getAttribute("id") != "inforss-spacer-end")
          {
            if ((other.hasAttribute("filtered") == false) || (other.getAttribute("filtered") == "false"))
            {
              other.setAttribute("collapsed", "false");
              other.style.MozOpacity = "1";
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
    if (inforssXMLRepository.isActive() == false)
    {
//        document.getElementById('newsbar1').style.visibility="hidden";
//        document.getElementById('inforss.newsbox1').setAttribute("collapsed", "true");
      document.getElementById('inforss-hbox').setAttribute("collapsed", "true");
//dump("pas active\n");
    }
    else
    {
      document.getElementById('inforss-hbox').setAttribute("collapsed", "false");
//dump("active\n");
    }
  },

//-------------------------------------------------------------------------------------------------------------
  removeDisplay : function(feed)
  {
    inforssTraceIn(this);
    try
    {
//dump("removeDisplay " + feed.getUrl() + "\n");
      var i = 0;
      var oldList = feed.getDisplayedHeadlines();
      if (oldList != null)
      {
//dump("removeDisplay " + oldList.length + "\n");
        for (var i = 0; i < oldList.length; i++)
        {
          this.removeFromScreen(oldList[i]);
        }
      }
      var hbox = gInforssNewsbox1;
      if (hbox.childNodes.length <= 1)
      {
        this.stopScrolling();
      }
      feed.setDisplayedHeadlines(null);
//dump("fin removeDisplay\n");
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut();
  },

//-------------------------------------------------------------------------------------------------------------
setActiveTooltip : function()
{
  try
  {
    this.activeTooltip = true;
  }
  catch(e)
  {
    inforssDebug(e, this);
  }
},

//-------------------------------------------------------------------------------------------------------------
resetActiveTooltip : function()
{
  try
  {
    this.activeTooltip = false;
  }
  catch(e)
  {
    inforssDebug(e, this);
  }
},

//-------------------------------------------------------------------------------------------------------------
isActiveTooltip : function()
{
  return this.activeTooltip;
},

//-------------------------------------------------------------------------------------------------------------
  stopScrolling : function()
  {
//dump("stopScrolling " + this.scrollTimeout + "\n");
    try
    {
      if (this.scrollTimeout != null)
      {
        window.clearTimeout(this.scrollTimeout);
        inforssClearTimer(this.scrollTimeout);
        this.scrollTimeout = null;
      }
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
  },

//-------------------------------------------------------------------------------------------------------------
  startScrolling : function()
  {
//dump("startScrolling " + this.scrollTimeout + "\n");
    try
    {
      if (this.scrollTimeout == null)
      {
//dump("Nouveau scroll\n");
        if (inforssXMLRepository.isFadeIn() == true)
        {
  	      this.scrollTimeout = inforssSetTimer(this, "scroll", 0);
  	    }
  	    else
        {
  	      this.scrollTimeout = inforssSetTimer(this, "scroll", 1800);
  	    }
  	  }
  	  else
  	  {
//dump("deja en train de scroller\n");
  	  }
  	}
  	catch(e)
    {
      inforssDebug(e, this);
    }
  },

//-------------------------------------------------------------------------------------------------------------
  resetDisplay : function()
  {
    inforssDeleteTree(gInforssNewsbox1);
    gInforssSpacerEnd = null;
    this.stopScrolling();
  },

//-------------------------------------------------------------------------------------------------------------
  removeFromScreen : function(headline)
  {
    inforssTraceIn(this);
    try
    {
//dump("removeFromScreen " + headline.hbox.parentNode + "\n");
      if ((headline.hbox != null) && (headline.hbox.parentNode != null))
      {
        headline.hbox.parentNode.removeChild(headline.hbox);
      }
      headline.resetHbox();
//dump("removeFromScreen " + headline.title + "\n");
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut();
  },

//-------------------------------------------------------------------------------------------------------------
  purgeOldHeadlines : function(feed)
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
            if (oldList[i].compare(newList[j]) == true)
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
            oldList.splice(i,1);
          }
          else
          {
            i++;
          }
        }
      }
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut();
  },

//-------------------------------------------------------------------------------------------------------------
  createHbox : function(feed, headline, hbox, maxTitleLength, lastInserted)
  {
// alert("createHbox");
    inforssTraceIn(this);
    try
    {
  	  var rss = feed.feedXML;
      var label = headline.title;
      var initialLabel = label;
	  var link = headline.link;
	  var description = headline.description;
      if ((label != null) && (label.length > maxTitleLength))
      {
	    label = label.substring(0, maxTitleLength);
	  }

	  var container = document.createElement("hbox");
//	  container.style.borderWidth = "1px";
//	  container.style.borderStyle = "solid";
	  if (inforssXMLRepository.isFadeIn() == true)
	  {
	    container.setAttribute("collapsed","true");
	  }
      var fontSize = inforssXMLRepository.getFontSize();
      if (fontSize != "auto")
      {
        container.style.fontSize = fontSize + "pt";
      }
//dump("createHbox=" + label + " link=" + link + "\n");
	  container.setAttribute("link", link);
	  container.setAttribute("flex","0");
	  container.style.fontFamily = inforssXMLRepository.getFont();
	  container.setAttribute("pack","end");

	  if (inforssXMLRepository.isFavicon() == true)
	  {
	    var vbox = document.createElement("vbox");
	    container.appendChild(vbox);
	    var spacer = document.createElement("spacer");
//	    vbox.setAttribute("flex", "1");
	    vbox.appendChild(spacer);
	    spacer.setAttribute("flex", "1");
	    var image = document.createElement("image");
	    vbox.appendChild(image);
//	dump("url=" + rss.getAttribute("url") + " / icon=" + rss.getAttribute("icon") + "\n");
	    image.setAttribute("src",rss.getAttribute("icon"));
	    image.setAttribute("maxwidth","16");
	    image.setAttribute("maxheight","16");

	    image.style.maxWidth = "16px";
	    image.style.maxHeight = "16px";

	    spacer = document.createElement("spacer");
	    vbox.appendChild(spacer);
	    spacer.setAttribute("flex", "1");
	    vbox = null;
	    spacer = null;
	    image = null;
	  }

	  var itemLabel = document.createElement("label");
//	  itemLabel.setAttribute("flex", "1");
	  itemLabel.setAttribute("title", initialLabel);
	  container.appendChild(itemLabel);
	  if (label.length > feed.getLengthItem())
	  {
	    label = label.substring(0, feed.getLengthItem());
	  }
	  if (rss.getAttribute("icon") == INFORSS_DEFAULT_ICO)
	  {
	    label = "(" + ((rss.getAttribute("title").length > 10)? rss.getAttribute("title").substring(0,10) : rss.getAttribute("title")) + "):" + label;
	  }
	  itemLabel.setAttribute("value", label);
//	  itemLabel.style.MozAppearance = "statusbarpanel";
      if ((headline.enclosureType != null) && (inforssXMLRepository.isDisplayEnclosure() == true))
	  {
	    var vbox = document.createElement("vbox");
	    container.appendChild(vbox);
	    var spacer = document.createElement("spacer");
	    vbox.appendChild(spacer);
	    spacer.setAttribute("flex", "1");
	    var image = document.createElement("image");
	    vbox.appendChild(image);
	    if (headline.enclosureType.indexOf("audio/") != -1)
	    {
	      image.setAttribute("src","chrome://inforss/skin/speaker.png");
	      image.setAttribute("playEnclosure",headline.enclosureUrl);
	    }
	    else
	    {
	      if (headline.enclosureType.indexOf("image/") != -1)
	      {
	        image.setAttribute("src","chrome://inforss/skin/image.png");
	      }
	      else
	      {
	        if (headline.enclosureType.indexOf("video/") != -1)
	        {
	          image.setAttribute("src","chrome://inforss/skin/movie.png");
	          image.setAttribute("playEnclosure",headline.enclosureUrl);
	        }
	      }
	    }
//	    image.setAttribute("tooltiptext", headline.enclosureUrl );
        vbox.setAttribute("tooltip", "_child");
        var tooltip1 = document.createElement("tooltip");
        vbox.appendChild(tooltip1);
        var vbox1 = document.createElement("vbox");
        tooltip1.appendChild(vbox1);
        var description1 = document.createElement("label");
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


	  if (inforssXMLRepository.isDisplayBanned() == true)
	  {
	    var vbox = document.createElement("vbox");
	    container.appendChild(vbox);
	    var spacer = document.createElement("spacer");
	    vbox.appendChild(spacer);
	    spacer.setAttribute("flex", "1");
	    var image = document.createElement("image");
	    vbox.appendChild(image);
//	dump("url=" + rss.getAttribute("url") + " / icon=" + rss.getAttribute("icon") + "\n");
	    image.setAttribute("src","chrome://inforss/skin/closetab.png");
	    image.setAttribute("inforss","true");
	    spacer = document.createElement("spacer");
	    vbox.appendChild(spacer);
	    spacer.setAttribute("flex", "1");
      }

	  spacer = document.createElement("spacer");
	  spacer.setAttribute("width", "5");
	  spacer.setAttribute("flex", "0");
	  container.appendChild(spacer);
	  hbox.insertBefore(container, lastInserted);

	  container.addEventListener("mousedown", inforssHeadlineDisplay.headlineEventListener, false);
	  headline.setHbox(container);
	  if ((inforssXMLRepository.isQuickFilterActif() == true) && (initialLabel != null) &&
	      (initialLabel != "") && (initialLabel.toLowerCase().indexOf(inforssXMLRepository.getQuickFilter().toLowerCase()) == -1))
	  {
        var width = container.boxObject.width;
        container.setAttribute("originalWidth", width);
        container.setAttribute("collapsed", "true");
        container.setAttribute("filtered", "true");
//dump("collapse title=" + initialLabel + "\n");
      }
      else
      {
         container.setAttribute("filtered", "false");
      }
	  switch (inforssXMLRepository.getTooltip())
	  {
	    case "description":
	    {
//	      if (description != null)
	      {
	        var fragment = Components.classes["@mozilla.org/feed-unescapehtml;1"].getService(Components.interfaces.nsIScriptableUnescapeHTML).parseFragment(description, false, null, container);
	        this.fillTooltip(itemLabel, headline, fragment.textContent, "text");
	      }
	      break;
	    }
	    case "title":
	    {
	      var fragment = Components.classes["@mozilla.org/feed-unescapehtml;1"].getService(Components.interfaces.nsIScriptableUnescapeHTML).parseFragment(headline.title, false, null, container);
	      this.fillTooltip(itemLabel, headline, fragment.textContent, "text");
	      break;
	    }
	    case "allInfo":
	    {
//	      this.fillTooltip(itemLabel, headline, "<div style='background-color:#2B60DE; max-width:600px; color: white; border-style: solid; border-width:1px; -moz-border-radius: 10px; padding: 6px'><TABLE width='100%'style='color:white;'><TR><TD align='right'><B>dd" + gInforssRssBundle.getString("inforss.title") + ": </B></TD><TD>" + headline.title + "</TD></TR><TR><TD align='right'><B>" + gInforssRssBundle.getString("inforss.date") + ": </B></TD><TD>" + headline.publishedDate + "</TD></TR><TR><TD align='right'><B>" + gInforssRssBundle.getString("inforss.rss") + ": </B></TD><TD>" + headline.url + "</TD></TR><TR><TD align='right'><B>" + gInforssRssBundle.getString("inforss.link") + ": </B></TD><TD>" + headline.link + "</TD></TR></TABLE></div><br>" + description, "text");
          var fragment = Components.classes["@mozilla.org/feed-unescapehtml;1"].getService(Components.interfaces.nsIScriptableUnescapeHTML).parseFragment(description, false, null, container);

          this.fillTooltip(itemLabel, headline, "<TABLE width='100%' style='background-color:#2B60DE; color:white; -moz-border-radius: 10px; padding: 6px'><TR><TD colspan=2 align=center style='border-bottom-style:solid; border-bottom-width:1px '><B><img src='" +  feed.getIcon() + "' width=16px height=16px> " + feed.getTitle() + "</B></TD></TR><TR><TD align='right'><B>" + gInforssRssBundle.getString("inforss.title") + ": </B></TD><TD>" + headline.title + "</TD></TR><TR><TD align='right'><B>" + gInforssRssBundle.getString("inforss.date") + ": </B></TD><TD>" + headline.publishedDate + "</TD></TR><TR><TD align='right'><B>" + gInforssRssBundle.getString("inforss.rss") + ": </B></TD><TD>" + headline.url + "</TD></TR><TR><TD align='right'><B>" + gInforssRssBundle.getString("inforss.link") + ": </B></TD><TD>" + headline.link + "</TD></TR></TABLE><br>" + fragment.textContent, "text");
	      break;
	    }
	    case "article":
	    default:
	    {
	      this.fillTooltip(itemLabel, headline, headline.link, "url");
	      break;
	    }
	  }

	  spacer = null;
	  hbox = null;
	  image = null;
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut();

	return container;
  },

//-------------------------------------------------------------------------------------------------------------
  fillTooltip : function(label, headline, str, type)
  {
//alert("fillTootip: " + str + "\n");
    inforssTraceIn(this);
    try
    {
      str = inforssFeed.htmlFormatConvert(str);
      if (label.hasAttribute("tooltip") == false)
      {
        this.createTooltip(label, headline);
      }
      var vboxs = document.getElementById(label.getAttribute("tooltip")).firstChild.getElementsByTagName("vbox");
      var vbox = vboxs[vboxs.length - 1];
      while (vbox.firstChild != null)
      {
        vbox.removeChild(vbox.firstChild);
      }
      if (type == "text")
      {
//dump("loop 01 : " + str + "\n");
        if ((str != null) && (str.indexOf("<") != -1) && (str.indexOf(">") != -1))
        {
          var br = document.createElement("iframe");
          vbox.appendChild(br);
//          inforssInspect(br);
//          br.docShell.allowAuth = false;
//          br.docShell.allowImages = false;
//          br.docShell.allowJavascript = false;
//          br.docShell.allowMetaRedirects = false;
//          br.docShell.allowPlugins = false;
//          br.docShell.allowSubframes = false;
          br.setAttribute("type", "content-targetable");
          var fragment = Components.classes["@mozilla.org/feed-unescapehtml;1"].getService(Components.interfaces.nsIScriptableUnescapeHTML).parseFragment(str, false, null, br);
//          inforssInspect(fragment);
          br.setAttribute("src", "data:text/html;charset=utf-8,<html><body>" + encodeURIComponent(str) + "</body></html>");
//          alert(br.docShell);
//dump("src=" + br.getAttribute("src") + "\n");

//          br.srcUrl = "data:text/html;charset=utf-8,<html><body>" + str + "</body></html>";
//          br.setAttribute("src", null);

          br.setAttribute("flex","1");
          br.style.overflow = "auto";
          br.style.width = INFORSS_TOOLTIP_BROWSER_WIDTH + "px";
          br.style.height = INFORSS_TOOLTIP_BROWSER_HEIGHT + "px";
          br = null;
//          var doc = br.contentDocument;
//          var htmlStr = "<html><body>" + str + "</body></html>";
//          var objDOMParser = new DOMParser();
//          var objDoc = objDOMParser.parseFromString(htmlStr, "text/xml");
//          doc.open("text/html");
//          doc.write("<html><body>" + str + "</body></html>");
//doc.body.innerHTML=str;
//          document.getElementById(label.getAttribute("tooltip")).sizeTo(INFORSS_TOOLTIP_BROWSER_WIDTH, INFORSS_TOOLTIP_BROWSER_HEIGHT);
//          document.getElementById(label.getAttribute("tooltip")).sizeTo(30, 30);
//          doc = null;
        }
        else
        {
	      if ((str != null) && (str != ""))
	      {
            var str1 = null;
            var description = null;
            while (str != "")
            {
              if (str.length > 60)
              {
                var j = 59;
                while ((j >= 0) && (str.charAt(j) != " ")) j--;
                if (j < 0)
                {
                  j = 59;
                }
                str1 = str.substring(0,j+1);
                str = str.substring(j+1);
              }
              else
              {
                str1 = str;
                str = "";
              }
              description = document.createElement("label");
              description.setAttribute("value", str1 + "  ");
              vbox.appendChild(description);
            }
            str1 = null;
            description = null;
//description = document.createElement("description");
//description.style.maxWidth = "200px";
//description.appendChild(document.createTextNode(str));
//vbox.appendChild(description);
//return;
	      }
	      else
	      {
			if (headline.enclosureUrl != null)
			{
			  var image = document.createElement("image");
			  if (headline.enclosureType.indexOf("image") == 0)
			  {
				image.setAttribute("src", "chrome://inforss/skin/image.png");
			  }
			  else
			  {
			    if (headline.enclosureType.indexOf("video") == 0)
			    {
				  image.setAttribute("src", "chrome://inforss/skin/movie.png");
			    }
			    else
			    {
			      if (headline.enclosureType.indexOf("audio") == 0)
			      {
				    image.setAttribute("src", "chrome://inforss/skin/speaker.png");
			      }
			    }
			  }
              vbox.appendChild(image);
		    }
		  }
        }
      }
      else
      {
        var br = document.createElement("browser");
        vbox.appendChild(br);
        br.setAttribute("flex","1");
        br.srcUrl = str;
//          var doc = br.contentDocument;
//          doc.write("<html><body>" + "coucou" + "</body></html>");
//        document.getElementById(label.getAttribute("tooltip")).sizeTo(INFORSS_TOOLTIP_BROWSER_WIDTH, INFORSS_TOOLTIP_BROWSER_HEIGHT);
      }
      vbox = null;
      vboxs = null;
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut();
  },

//-------------------------------------------------------------------------------------------------------------
  createTooltip : function(itemLabel, headline)
  {
    inforssTraceIn(this);
    try
    {
      var tooltip = document.createElement("tooltip");
      tooltip.setAttribute("id","inforss.headline.tooltip." + ((headline.guid != null)? headline.guid : headline.title));
      tooltip.setAttribute("position", "before_end");
      document.getElementById("inforss.popupset").appendChild(tooltip);
      var nodes = document.getAnonymousNodes(tooltip);
//inforssInspect(nodes[0]);
      nodes[0].setAttribute("collapsed", "true");
      itemLabel.setAttribute("tooltip", tooltip.getAttribute("id"));
      var toolHbox = document.createElement("hbox");
      tooltip.appendChild(toolHbox);
      toolHbox.setAttribute("flex","1");
      if ((headline.enclosureUrl != null) && (inforssXMLRepository.getTooltip() != "article"))
      {
        var vbox1 = document.createElement("vbox");
        vbox1.setAttribute("flex","0");
        vbox1.style.backgroundColor = "inherit";
        toolHbox.appendChild(vbox1);
        if (headline.enclosureType.indexOf("image") == 0)
        {
          var img = document.createElement("image");
          img.setAttribute("src",headline.enclosureUrl);
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
        spacer4.setAttribute("width","10");
        vbox1.appendChild(spacer4);
        vbox1 = null;
        spacer4 = null;
      }
      var toolVbox = document.createElement("vbox");
      toolHbox.appendChild(toolVbox);
      toolVbox.setAttribute("flex","1");
      tooltip.setAttribute("noautohide", true);
      tooltip.addEventListener("popupshown", inforssHeadlineDisplay.manageTooltipOpen, false);
      tooltip.addEventListener("popuphiding", inforssHeadlineDisplay.manageTooltipClose, false);
      tooltip.itemLabel = itemLabel;
/*
      var resizer = document.createElement("resizer");
      resizer.style.minWidth = "16px";
      resizer.style.minHeight = "16px";
      resizer.style.backgroundColor = "blue";
      resizer.setAttribute("resizerdirection","bottomleft");
      resizer.setAttribute("dir","bottomleft");
      tooltip.appendChild(resizer);

      itemLabel.addEventListener("keypress", inforssHeadlineDisplay.manageTooltipMouseMove, false);
      itemLabel.addEventListener("keydown", inforssHeadlineDisplay.manageTooltipMouseMove, false);
      itemLabel.addEventListener("keyup", inforssHeadlineDisplay.manageTooltipMouseMove, false);
*/
      tooltip = null;
      nodes = null;
      toolHbox = null;
      toolVbox = null;
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut();
  },

//-------------------------------------------------------------------------------------------------------------
  updateDisplay : function(feed)
  {
//dump("updateDisplay\n");
//dump("canScroll=" + this.canScroll + "\n");
    var popupFlag = false;
    inforssTraceIn(this);
    this.updateCmdIcon();
    var canScroll = this.canScroll;
//dump("updateDisplay canScroll=" + canScroll + "\n");
    this.canScroll = false;
    try
    {
//dump("updateDisplay " + feed.getUrl() + "  " + feed.getCandidateHeadlines().length + "\n");
//    this.resetDisplay();
	  document.getElementById('newsbar1').style.visibility = "visible";
      this.purgeOldHeadlines(feed);
      var firstItem = null;
      var lastItem = null;
      var lastInserted = null;
// alert("step 1\n");

      var hbox = document.getElementById('inforss.newsbox1');
      if (gInforssSpacerEnd == null)
      {
        var spacer = document.createElement("spacer");
	    spacer.setAttribute("id","inforss-spacer-end");
	    if (inforssXMLRepository.getSeparateLine() == "true")
	    {
	  	  spacer.setAttribute("flex","1");
	    }
	    else
	    {
	      spacer.setAttribute("flex","0");
	    }
	    if ((inforssXMLRepository.isScrolling() == true) && (inforssXMLRepository.isFadeIn() == false))
	    {
  	      spacer.setAttribute("collapsed","true");
  	      spacer.setAttribute("width","5");
  	      spacer.style.backgroundColor = "black";
  	    }
  	    else
	    {
  	      spacer.setAttribute("collapsed","true");
  	    }
	    hbox.appendChild(spacer);
	    gInforssSpacerEnd = spacer;
	  }

// alert("step 2\n");
      var oldList = feed.getDisplayedHeadlines();
//dump("feed.getDisplayedHeadlines()=" + feed.getDisplayedHeadlines().length + "\n");
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
		var lastHeadline = this.mediator.getLastDisplayedHeadline();
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
// alert("step 3\n");

      var newList = feed.getCandidateHeadlines();
//dump("feed.getCandidateHeadlines()=" + feed.getCandidateHeadlines().length + "\n");
//    this.stopScrolling();

// alert("step 4 list=" + newList.length + "\n");
      var maxTitleLength = feed.feedXML.getAttribute("lengthItem");
      if (feed.isSelected() == true)
      {
        this.updateMenuIcon(feed);
      }

	  var container = null;
	  var t0 = new Date();
	  for (var i = newList.length - 1; i >= 0; i--)
      {
	    if (newList[i].hbox == null)
	    {
	      container = this.createHbox(feed, newList[i], hbox, maxTitleLength, lastInserted);
	      lastInserted = container;
// alert("je cree un hbox\n");
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
            var initialLabel = newList[i].title;

	        if ((inforssXMLRepository.isQuickFilterActif() == true) && (initialLabel != null) &&
	            (initialLabel != "") && (initialLabel.toLowerCase().indexOf(inforssXMLRepository.getQuickFilter().toLowerCase()) == -1))
	        {
//alert("efface");
	          if (container.hasAttribute("originalWidth") == false)
	          {
                var width = container.boxObject.width;
                container.setAttribute("originalWidth", width);
              }
              container.setAttribute("collapsed", "true");
              container.setAttribute("filtered", "true");
            }
            else
            {
//alert("garde");
              if (container.hasAttribute("collapsed") == true)
              {
                container.removeAttribute("collapsed");
              }
              container.setAttribute("filtered", "false");
            }
//alert(container.getAttribute("collapsed"));
            container.addEventListener("mousedown", inforssHeadlineDisplay.headlineEventListener, false);
            lastInserted = container;
          }
          else
          {
            lastInserted = firstItem;
          }
	      switch (inforssXMLRepository.getTooltip())
	      {
	        case "description":
	        {
	          if (newList[i].description != null)
	          {
	  	        var fragment = Components.classes["@mozilla.org/feed-unescapehtml;1"].getService(Components.interfaces.nsIScriptableUnescapeHTML).parseFragment(newList[i].description, false, null, container);
	  	        this.fillTooltip(container.getElementsByTagName("label")[0], newList[i], fragment.textContent, "text");
	          }
	          break;
	        }
	        case "title":
 	        {
	  	      var fragment = Components.classes["@mozilla.org/feed-unescapehtml;1"].getService(Components.interfaces.nsIScriptableUnescapeHTML).parseFragment(newList[i].title, false, null, container);
	          this.fillTooltip(container.getElementsByTagName("label")[0], newList[i], fragment.textContent, "text");
	          break;
	        }
	        case "allInfo":
	        {
//	          this.fillTooltip(container.getElementsByTagName("label")[0], newList[i], "<div style='background-color:#2B60DE; color: white; border-style: solid; border-width:1px; -moz-border-radius: 10px; padding: 6px'><TABLE WIDTH='100%' style='color:white'><TR><TD align='right'><B>Title: </B></TD><TD>" + newList[i].title + "</TD></TR><TR><TD align='right'><B>Date: </B></TD><TD>" + newList[i].publishedDate + "</TD></TR><TR><TD align='right'><B>Rss: </B></TD><TD>" + newList[i].url + "</TD></TR><TR><TD align='right'><B>Link: </B></TD><TD>" + newList[i].link + "</TD></TR></TABLE></div><br>" + newList[i].description, "text");

              var fragment = Components.classes["@mozilla.org/feed-unescapehtml;1"].getService(Components.interfaces.nsIScriptableUnescapeHTML).parseFragment(newList[i].description, false, null, container);
              this.fillTooltip(container.getElementsByTagName("label")[0], newList[i], "<TABLE width='100%' style='background-color:#2B60DE; color:white; -moz-border-radius: 10px; padding: 6px'><TR><TD colspan=2 align=center style='border-bottom-style:solid; border-bottom-width:1px'><B><img src='" +  feed.getIcon() + "' width=16px height=16px> " + feed.getTitle() + "</B></TD></TR><TR><TD align='right'><B>" + gInforssRssBundle.getString("inforss.title") + ": </B></TD><TD>" + newList[i].title + "</TD></TR><TR><TD align='right'><B>" + gInforssRssBundle.getString("inforss.date") + ": </B></TD><TD>" + newList[i].publishedDate + "</TD></TR><TR><TD align='right'><B>" + gInforssRssBundle.getString("inforss.rss") + ": </B></TD><TD>" + newList[i].url + "</TD></TR><TR><TD align='right'><B>" + gInforssRssBundle.getString("inforss.link") + ": </B></TD><TD>" + newList[i].link + "</TD></TR></TABLE><br>" + fragment.textContent, "text");
	          break;
	        }
	        case "article":
	        default:
 	        {
	          this.fillTooltip(container.getElementsByTagName("label")[0], newList[i], newList[i].link, "url");
	          break;
	        }
	      }
// alert("je reutilise un hbox\n");
        }
// alert("date " + t0 + " " + newList[i].readDate + " " + (eval(inforssXMLRepository.getDelay()) * 60000) + "\n");
	    if ((t0 - newList[i].receivedDate) < (eval(inforssXMLRepository.getDelay()) * 60000))
	    {
	      inforssHeadlineDisplay.setBackgroundColor(container, true);
	      container.style.fontWeight = inforssXMLRepository.getBold(); //"bolder";
	      container.style.fontStyle = inforssXMLRepository.getItalic(); //"italic";
	      if ((popupFlag == false) &&
	          (inforssXMLRepository.isPopupMessage() == true) &&
	          ((feed.getAcknowledgeDate() == null) ||
	           (newList[i].receivedDate > feed.getAcknowledgeDate())))
	      {
	        popupFlag = true;
	        if (feed.getPopup() == false)
	        {
              var observerService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
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
        if (inforssXMLRepository.isFadeIn() == true)
        {
//dump("collapsed=true\n");
	          if (container.hasAttribute("originalWidth") == false)
	          {
                var width = container.boxObject.width;
                container.setAttribute("originalWidth", width);
              }
          container.setAttribute("collapsed", "true");
        }
        else
        {
//dump("collapsed=false\n");
            var initialLabel = newList[i].title;
	        if ((inforssXMLRepository.isQuickFilterActif() == true) && (initialLabel != null) &&
	            (initialLabel != "") && (initialLabel.toLowerCase().indexOf(inforssXMLRepository.getQuickFilter().toLowerCase()) == -1))
	        {
	          if (container.hasAttribute("originalWidth") == false)
	          {
                var width = container.boxObject.width;
                container.setAttribute("originalWidth", width);
              }
              container.setAttribute("collapsed", "true");
              container.setAttribute("filtered", "true");
            }
            else
            {
              if (container.hasAttribute("collapsed") == true)
              {
                container.removeAttribute("collapsed");
              }
              container.setAttribute("filtered", "false");
            }
//          container.setAttribute("collapsed", "false");
        }
//alert(container.getAttribute("collapsed"));
	  }
//if (newList.length > 0) alert("aa");
      feed.setDisplayedHeadlines(feed.getCandidateHeadlines());
      this.canScroll = canScroll;
//dump("newList.length=" + newList.length + "\n");
//dump("this.canScroll=" + this.canScroll + "\n");
//dump("inforssXMLRepository.isScrolling()=" + inforssXMLRepository.isScrolling() + "\n");
	  if ((newList.length > 0) && (inforssXMLRepository.isScrolling() == true))
	  {
//dump("updateDisplay startScrolling\n");
	    if ((inforssXMLRepository.isScrolling() == true) && (this.canScroll == true))
	    {
		  this.checkCollapseBar();
           this.checkScroll();
//dump("updateDisplay startScrolling1\n");
	    }
//dump("this.canScrollSize=" + this.canScrollSize + "\n");
        if ((this.canScroll == true) && (this.canScrollSize == true))
        {
	      this.startScrolling();
//dump("updateDisplay startScrolling2\n");
	    }
	  }
	  else
	  {
//		if (newList.length == 0)
		{
//dump("updateDisplay startScrolling3\n");
		  this.checkCollapseBar();
		}
	  }
    }
    catch(e)
    {
      inforssDebug(e, this);
      this.canScroll = canScroll;
	  if ((inforssXMLRepository.isScrolling() == true) && (this.canScroll == true))
	  {
        this.checkScroll();
	  }
    }
//dump("updateDisplay startScrolling " + this.canScroll + "\n");
    inforssTraceOut();
  },

//-------------------------------------------------------------------------------------------------------------
  updateCmdIcon : function()
  {
    try
    {
      var image = document.getElementById("inforss.icon.readall");
      if (inforssXMLRepository.isReadAllIcon() == true)
      {
        image.setAttribute("collapsed","false");
      }
      else
      {
        image.setAttribute("collapsed","true");
      }

      image = document.getElementById("inforss.icon.viewall");
      if (inforssXMLRepository.isViewAllIcon() == true)
      {
        image.setAttribute("collapsed","false");
      }
      else
      {
        image.setAttribute("collapsed","true");
      }

      image = document.getElementById("inforss.icon.previous");
      if (inforssXMLRepository.isPreviousIcon() == true)
      {
        image.setAttribute("collapsed","false");
      }
      else
      {
        image.setAttribute("collapsed","true");
      }

      image = document.getElementById("inforss.icon.next");
      if (inforssXMLRepository.isNextIcon() == true)
      {
        image.setAttribute("collapsed","false");
      }
      else
      {
        image.setAttribute("collapsed","true");
      }

      image = document.getElementById("inforss.icon.shuffle");
      if (inforssXMLRepository.isShuffleIcon() == true)
      {
        image.setAttribute("collapsed","false");
        if (inforssXMLRepository.getNextFeed() == "next")
        {
          image.setAttribute("src","chrome://inforss/skin/noshuffle.png");
        }
        else
        {
          image.setAttribute("src","chrome://inforss/skin/shuffle.png");
        }
      }
      else
      {
        image.setAttribute("collapsed","true");
      }

      image = document.getElementById("inforss.icon.scrolling");
      if (inforssXMLRepository.isScrollingIcon() == true)
      {
        image.setAttribute("collapsed","false");
        if (inforssXMLRepository.isScrolling() == true)
        {
          image.setAttribute("src","chrome://inforss/skin/scrolling.png");
        }
        else
        {
          image.setAttribute("src","chrome://inforss/skin/noscrolling.png");
        }
      }
      else
      {
        image.setAttribute("collapsed","true");
      }

      image = document.getElementById("inforss.icon.direction");
      if (inforssXMLRepository.isDirectionIcon() == true)
      {
        image.setAttribute("collapsed","false");
        if (inforssXMLRepository.getScrollingDirection() == "rtl")
        {
          image.setAttribute("src","chrome://inforss/skin/rtl.png");
        }
        else
        {
          image.setAttribute("src","chrome://inforss/skin/ltr.png");
        }
      }
      else
      {
        image.setAttribute("collapsed","true");
      }

      image = document.getElementById("inforss.icon.pause");
      if (inforssXMLRepository.isPauseIcon() == true)
      {
        image.setAttribute("collapsed","false");
        if (this.canScroll == true)
        {
          image.setAttribute("src","chrome://inforss/skin/pause.gif");
        }
        else
        {
          image.setAttribute("src","chrome://inforss/skin/pausing.gif");
        }
      }
      else
      {
        image.setAttribute("collapsed","true");
      }

      image = document.getElementById("inforss.icon.refresh");
      if (inforssXMLRepository.isRefreshIcon() == true)
      {
        image.setAttribute("collapsed","false");
      }
      else
      {
        image.setAttribute("collapsed","true");
      }

      image = document.getElementById("inforss.icon.hideold");
      if (inforssXMLRepository.isHideOldIcon() == true)
      {
        image.setAttribute("collapsed","false");
        if (inforssXMLRepository.isHideOld() == true)
        {
          image.setAttribute("src","chrome://inforss/skin/hideold.png");
        }
        else
        {
          image.setAttribute("src","chrome://inforss/skin/nohideold.png");
        }
      }
      else
      {
        image.setAttribute("collapsed","true");
      }

      image = document.getElementById("inforss.icon.hideviewed");
      if (inforssXMLRepository.isHideViewedIcon() == true)
      {
        image.setAttribute("collapsed","false");
        if (inforssXMLRepository.isHideViewed() == true)
        {
          image.setAttribute("src","chrome://inforss/skin/hideviewed.png");
        }
        else
        {
          image.setAttribute("src","chrome://inforss/skin/nohideviewed.png");
        }
      }
      else
      {
        image.setAttribute("collapsed","true");
      }

      image = document.getElementById("inforss.icon.synchronize");
      if (inforssXMLRepository.isSynchronizationIcon() == true)
      {
        image.setAttribute("collapsed","false");
      }
      else
      {
        image.setAttribute("collapsed","true");
      }

      image = document.getElementById("inforss.icon.home");
      if (inforssXMLRepository.isHomeIcon() == true)
      {
        image.setAttribute("collapsed","false");
      }
      else
      {
        image.setAttribute("collapsed","true");
      }

      image = document.getElementById("inforss.icon.filter");
      if (inforssXMLRepository.isFilterIcon() == true)
      {
        image.setAttribute("collapsed","false");
        if (inforssXMLRepository.isQuickFilterActif() == true)
        {
          image.setAttribute("src","chrome://inforss/skin/filter1.png");
        }
        else
        {
          image.setAttribute("src","chrome://inforss/skin/filter2.png");
        }
      }
      else
      {
        image.setAttribute("collapsed","true");
      }
      image = null;
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut();
  },

//-------------------------------------------------------------------------------------------------------------
  updateMenuIcon : function(feed)
  {
    try
    {
//      if (feed.feedXML.getAttribute("description").length > 0)
//      {
//        document.getElementById('inforss-icon').setAttribute("tooltiptext", feed.feedXML.getAttribute("description") + " (" + feed.feedXML.getAttribute("url") + ")");
//      }
      document.getElementById("inforss.popup.mainicon").setAttribute("inforssUrl", feed.feedXML.getAttribute("url"));
      var statuspanel = document.getElementById('inforss-icon');
      if (inforssXMLRepository.isSynchronizeIcon() == true)
      {
        if (this.mediator.getCycleGroup() == null)
        {
          statuspanel.setAttribute("src", feed.getIcon());
          var subElement = document.getAnonymousNodes(statuspanel);

// alert("subElement.length=" + subElement.length);
// alert("subElement[0].localName=" + subElement[0].localName);
          if ((subElement != null) && (subElement.length > 0) && (subElement[0] != null) && (subElement[0].localName =="image"))
          {
            subElement[0].setAttribute("maxwidth","16");
            subElement[0].setAttribute("maxheight","16");
            subElement[0].setAttribute("minwidth","16");
            subElement[0].setAttribute("minheight","16");


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
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut();
  },

//-------------------------------------------------------------------------------------------------------------
  scroll : function()
  {
//dump("scroll " + this.canScroll + "\n");
    var canScrollSet = false;
    var canScroll = false
    try
    {
      if ((this.canScroll == true) && (this.canScrollSize == true))
      {
        canScroll = this.canScroll;
        this.canScroll = false;
        canScrollSet = true;
        this.scroll1((inforssXMLRepository.getScrollingDirection() == "rtl")? 1 : -1, true);
      }
      else
      {
//dump("peut pas scroller\n");
      }
      news = null;
//dump("fin scroll:" + width + "\n");
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    if (canScrollSet == true)
    {
      this.canScroll = canScroll;
    }
    this.scrollTimeout = inforssSetTimer(this, "scroll", inforssXMLRepository.getScrollingSpeed());
//dump("scroll relance scroll\n");
  },

//-------------------------------------------------------------------------------------------------------------
  scroll1 : function(direction, forceWidth)
  {
//dump("scroll " + this.canScroll + "\n");
    try
    {
        var getNext = false;
        var news = gInforssNewsbox1.firstChild;
        if ((news != null) && (news.getAttribute("id") != "inforss-spacer-end"))
        {
          var width = null;
          var opacity = null;
          if (inforssXMLRepository.isFadeIn() == true)  // fade in/out mode
          {
            if (news.hasAttribute("opacity") == false)
            {
              news.setAttribute("opacity","0");
            }
            if (news.hasAttribute("collapsed") == false)
            {
              news.setAttribute("collapsed","false");
            }
            else
            {
              if (news.getAttribute("collapsed") == "true")
              {
                news.setAttribute("collapsed","false");
              }
            }
//            news.setAttribute("collapsed","false");
            opacity = eval(news.getAttribute("opacity"));
            news.style.MozOpacity = (opacity < 1.0)? opacity : ((opacity > 3.0)? (4.0-opacity) : 1);
            opacity = eval(opacity) + 0.05;
            news.setAttribute("opacity", opacity);
            width = 1;
            if (opacity > 4)
            {
              news.setAttribute("opacity", "0");
              news.setAttribute("collapsed","true");
            }
          }
          else // scroll mode
          {
            if ((news.hasAttribute("collapsed") == true) && (news.getAttribute("collapsed") == "true"))
            {
              getNext = true;
            }
            else
            {
              width = news.getAttribute("maxwidth");
//dump("scroll width=" + width + "\n");

            opacity = 1;
            if ((width == null) || (width == ""))
            {
//alert(news.boxObject.width + " " + news.boxObject.height + " " + news.boxObject.screenX + " " + news.boxObject.screenY + " " + news.boxObject.x + " " + news.boxObject.y);
              width = news.boxObject.width;
              news.setAttribute("originalWidth",width);
            }
//dump("scroll width=" + width + "\n");
            if (direction == 1)
            {
//dump("scroll width 1=" + width + "\n");
//dump("scroll width 2=" + news.boxObject.width + "\n");
              if (eval(width) >= 0)
              {
                width -= inforssXMLRepository.getScrollingIncrement();
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
//              width = news.boxObject.width;
//              width = news.getAttribute("maxwidth");
//dump("scroll width 1=" + width + "\n");
//dump("scroll width 2=" + news.boxObject.width + "\n");
              if (eval(width) < news.getAttribute("originalWidth"))
              {
                width = eval(width) + inforssXMLRepository.getScrollingIncrement();
                if (width > news.getAttribute("originalWidth"))
                {
                  getNext = true;
                }
              }
              else
              {
                getNext = true;
              }
//    dump("width=" + width + " original=" + news.getAttribute("originalWidth") + " label=" + news.childNodes[1].getAttribute("title") + " getNext=" + getNext + "\n");
            }
          }
          }

          if ((getNext == true) || (opacity > 4))
          {
            this.forceScrollInDisplay(direction, forceWidth);
//dump("je remet " + news.getAttribute("link") + "\n");
          }
          else
          {
            if (inforssXMLRepository.isFadeIn() == false)
            {
//alert(width);

//              news.setAttribute("minwidth", width);
              news.setAttribute("maxwidth", width);
//              news.setAttribute("width", width);


              news.style.minWidth = width + "px";
              news.style.maxWidth = width + "px";
              news.style.width = width + "px";

//              news.setAttribute("flex","1");
            }
          }
        }
        else
        {
          if (news.getAttribute("id") == "inforss-spacer-end")
          {
// dump("first=end ");
          }
        }
      news = null;
//dump("fin scroll:" + width + "\n");
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
//dump("scroll relance scroll\n");
  },

//-------------------------------------------------------------------------------------------------------------
  forceScrollInDisplay : function(direction, forceWidth)
  {
    var news = null;
    var hbox = null;
    var spacerEnd = gInforssSpacerEnd;
    if (direction == 1)
    {
      news = gInforssNewsbox1.firstChild
      hbox = news.parentNode;
      news.removeEventListener("mousedown", inforssHeadlineDisplay.headlineEventListener, false);
//dump("j'enleve " + news.getAttribute("link") + "\n");
      var nextNews = news.nextSibling;
      hbox.removeChild(news);
      hbox.insertBefore(news, spacerEnd);
//                news.setAttribute("minwidth", news.getAttribute("originalWidth"));
      news.setAttribute("maxwidth", news.getAttribute("originalWidth"));
//                news.setAttribute("width", news.getAttribute("originalWidth"));

      news.style.minWidth = news.getAttribute("originalWidth") + "px";
      news.style.maxWidth = news.getAttribute("originalWidth") + "px";
      news.style.width = news.getAttribute("originalWidth") + "px";

      nextNews = null;
    }
    else
    {
      news = spacerEnd.previousSibling;
      hbox = news.parentNode;
      news.removeEventListener("mousedown", inforssHeadlineDisplay.headlineEventListener, false);
//alert("j'enleve " + news.getAttribute("link") + "\n");
      width = news.getAttribute("maxwidth");
      if ((width == null) || (width == ""))
      {
        width = news.boxObject.width;
//dump("width=" + width + "\n");
        news.setAttribute("originalWidth", width);
//dump("originalWidth=" + news.getAttribute("originalWidth") + "\n");
      }

//                news.setAttribute("minwidth", "0");
      if (forceWidth == true)
      {
        news.setAttribute("maxwidth", "1");
//                news.setAttribute("width", "0");

        news.style.minWidth = "1px";
        news.style.maxWidth = "1px";
        news.style.width = "1px";
      }
      hbox.removeChild(news);
      hbox.insertBefore(news, hbox.firstChild);
    }

    news.addEventListener("mousedown", inforssHeadlineDisplay.headlineEventListener, false);
//dump("je remet " + news.getAttribute("link") + "\n");
  },

//-------------------------------------------------------------------------------------------------------------
  handleMouseScroll : function(direction)
  {
//    this.forceScrollInDisplay(direction, false);
    var dir = (direction > 0)? 1 : -1;
    if (inforssXMLRepository.getMouseWheelScroll() == "pixel")
    {
      var end = (direction > 0)? direction : -direction;
      for(var i=0; i < end; i++)
      {
        this.scroll1(dir, true);
      }
    }
    else
    {
      if (inforssXMLRepository.getMouseWheelScroll() == "pixels")
      {
        for(var i=0; i < 10; i++)
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


//-------------------------------------------------------------------------------------------------------------
  clickRSS : function(event, link)
  {
    inforssTraceIn();
    try
    {
	  var title = null;
//dump("event.button=" + event.button + "\n");
      if ((event.button == 0) && (event.ctrlKey == false) && (event.shiftKey == false))
      {
        if (event.target.hasAttribute("inforss") == true)
        {
          var data = event.target.previousSibling.getAttribute("title") + "__SEP__" + link;
          var observerService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
          observerService.notifyObservers(null, "banned", data);
          observerService = null;
        }
        else
        {
          if (event.target.hasAttribute("playEnclosure") == true)
          {
            this.openTab(event.target.getAttribute("playEnclosure"));
          }
          else
          {
		    if (event.target.hasAttribute("title") == false)
		    {
			  var parent = event.target.parentNode;
			  while ((parent.getElementsByTagName("label") == null) || (parent.getElementsByTagName("label").length == 0))
			  {
			    parent = parent.parentNode;
			  }
			  title = parent.getElementsByTagName("label").item(0).getAttribute("title");
	        }
	        else
	        {
			  title = event.target.getAttribute("title");
		    }
            var data = title + "__SEP__" + link;
            var observerService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
            observerService.notifyObservers(null, "viewed", data);
            observerService = null;

            this.openTab(link);
          }
        }
      }
      else
      {
        if ((event.button == 2) || ((event.button == 0) && (event.ctrlKey == true) && (event.shiftKey == false)))
        {
		  if (event.target.hasAttribute("title") == false)
		  {
			var parent = event.target.parentNode;
			while ((parent.getElementsByTagName("label") == null) || (parent.getElementsByTagName("label").length == 0))
			{
			  parent = parent.parentNode;
			}
			title = parent.getElementsByTagName("label").item(0).getAttribute("title");
	      }
	      else
	      {
			title = event.target.getAttribute("title");
		  }
          var data = title + "__SEP__" + link;
          var observerService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
          observerService.notifyObservers(null, "banned", data);
          observerService = null;
          event.cancelBubble = true;
          event.stopPropagation();
//          alert("foo");
        }
        else
        {
          if ((event.button == 1) || ((event.button == 0) && (event.ctrlKey == false) && (event.shiftKey == true)))
          {
            this.switchPause();
            var clipboardHelper = Components.classes["@mozilla.org/widget/clipboardhelper;1"].getService(Components.interfaces.nsIClipboardHelper);
            clipboardHelper.copyString(link);
          }
        }
      }
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut();
  },


//-----------------------------------------------------------------------------------------------------
  testCreateTab : function()
  {
    inforssTraceIn(this);

    var returnValue = true;
    try
    {
      if ((navigator.userAgent.indexOf("Thunderbird") == -1) && (gBrowser.browsers.length == 1))
      {
//dump("gBrowser.currentURI=" + gBrowser.currentURI + "\n");
//dump("gBrowser.currentURI.spec=" + gBrowser.currentURI.spec + "\n");
//dump("gBrowser.selectedBrowser.webProgress.isLoadingDocument=" + gBrowser.selectedBrowser.webProgress.isLoadingDocument + "\n");
        if ((gBrowser.currentURI == null) ||
            (((gBrowser.currentURI.spec == "") || (gBrowser.currentURI.spec == "about:blank")) && (gBrowser.selectedBrowser.webProgress.isLoadingDocument == false))
            )
        {
          returnValue = false;
        }
      }
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut();
    return returnValue;
  },

//-------------------------------------------------------------------------------------------------------------
  openTab : function(link)
  {
    inforssTraceIn(this);
    try
    {
//    alert(navigator.vendor);
      var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("browser.tabs.");
      var behaviour = inforssXMLRepository.getClickHeadline();
//dump("gBrowser=" + gBrowser + "\n");
//      if ( /*(navigator.userAgent.indexOf("Thunderbird") != -1) || */(navigator.vendor == "Linspire Inc.") ||
//          (typeof gBrowser == "undefined"))
//      {
//        behaviour = "99";
//      }
//dump("behaviour=" + behaviour + "\n");
//dump("navigator.vendor=" + navigator.vendor + "\n");
//dump("navigator.userAgent=" + navigator.userAgent + "\n");
//dump("typeof gBrowser=" + typeof gBrowser + "\n");

      if ((navigator.userAgent.indexOf("Thunderbird") != -1) && (typeof tabmail == "undefined"))
      {
    	  tabmail = document.getElementById("tabmail");
//dump("tabmail=" + tabmail + "\n");
    	  if (!tabmail) {
    	    // Try opening new tabs in an existing 3pane window
    	    let mail3PaneWindow = Components.classes["@mozilla.org/appshell/window-mediator;1"]
    	                                    .getService(Components.interfaces.nsIWindowMediator)
    	                                    .getMostRecentWindow("mail:3pane");
    	    if (mail3PaneWindow) {
    	      tabmail = mail3PaneWindow.document.getElementById("tabmail");
    	      mail3PaneWindow.focus();
    	    }
    	  }
      }

      switch (behaviour)
      {
        case "0": // in tab, default behavior
        {
          if (typeof tabmail != "undefined")
          {
//dump("tabmail=YES" + "\n");
        	tabmail.openTab("contentTab", {contentPage: link, background:false});
          }
          else
          {
//dump("tabmail=undefined" + "\n");
            if (prefs.getBoolPref("loadInBackground") == true)
            {
//dump("loadInBackground=YES" + "\n");
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
//dump("loadInBackground=NO" + "\n");
              if (this.testCreateTab() == false)
              {
//dump("testCreateTab=NO" + "\n");
                gBrowser.loadURI(link);
              }
              else
              {
//dump("testCreateTab=YES" + "\n");
                gBrowser.selectedTab = gBrowser.addTab(link);
              }
            }
          }
          break;
        }
        case "1": // in tab, background
        {
          if (this.testCreateTab() == false)
          {
            gBrowser.loadURI(link);
          }
          else
          {
              if (typeof tabmail != "undefined")
              {
          	    tabmail.openTab("contentTab", {contentPage: link, background:true});
              }
              else
              {
                gBrowser.addTab(link);
              }
          }
          break;
        }
        case "2": // in tab, foreground
        {
          if (this.testCreateTab() == false)
          {
            gBrowser.loadURI(link);
          }
          else
          {
            if (typeof tabmail != "undefined")
            {
        	  tabmail.openTab("contentTab", {contentPage: link, background:false});
            }
            else
            {
              gBrowser.selectedTab = gBrowser.addTab(link);
            }
          }
          break;
        }
        case "3":
        {
          if (typeof tabmail != "undefined")
          {
            window.openDialog("chrome://inforss/content/inforssBrowser.xul","_blank","chrome,centerscreen,resizable=yes, dialog=no", link);
          }
          else
          {
            window.open(link,"_blank");
          }
          break;
        }
        case "4":
        {
          if (typeof tabmail != "undefined")
          {
            tabmail.openTab("contentTab", {contentPage: link, background:false});
          }
          else
          {
            gBrowser.loadURI(link);
          }
          break;
        }
        case "99":
        {
          window.openDialog("chrome://inforss/content/inforssBrowser.xul","_blank","chrome,centerscreen,resizable=yes, dialog=no", link);
        }
      }
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
  },

//-----------------------------------------------------------------------------------------------------
  checkStartScrolling : function()
  {
    inforssTraceIn(this);
    try
    {
      this.checkScroll();
      if (inforssXMLRepository.isScrolling() == true)
      {
        this.startScrolling();
      }
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut();
  },

//-----------------------------------------------------------------------------------------------------
  checkScroll : function()
  {
//dump("checkScroll=" + gInforssNewsbox1.hasAttribute("collapsed") + "\n");
//dump("isScrolling=" + inforssXMLRepository.isScrolling() + "\n");
//dump("isFadeIn=" + inforssXMLRepository.isFadeIn() + "\n");
//dump("getAttribute=" + gInforssNewsbox1.getAttribute("collapsed") + "\n");
    inforssTraceIn(this);
    try
    {
      var hbox = gInforssNewsbox1;
      if ((inforssXMLRepository.isScrolling() == true) &&
          (inforssXMLRepository.isFadeIn() == false) &&
          ((hbox.hasAttribute("collapsed") == false) || (hbox.getAttribute("collapsed") == "false")))
      {
//dump("dans if\n");
        var news = hbox.firstChild;
        var width = 0;
        while (news != null)
        {
          if (news.nodeName != "spacer")
          {
            if ((news.hasAttribute("collapsed") == false) || (news.getAttribute("collapsed") == "false"))
            {
              if ((news.hasAttribute("originalWidth") == true) &&
                  (news.getAttribute("originalWidth") != null))
              {
                width += eval(news.getAttribute("originalWidth"));
              }
              else
              {
                if ((news.hasAttribute("width") == true) && (news.getAttribute("width") != null))
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
//   dump(width + " " + eval(hbox.boxObject.width) + " " + this.canScroll + " " + this.canScrollSize + "\n");
        if (this.canScrollSize == false)
        {
          news = hbox.firstChild;
          if (news.hasAttribute("originalWidth") == true)
          {
//dump("checkScroll: " + news.getAttribute("originalWidth") + "\n");
//            news.setAttribute("minwidth", news.getAttribute("originalWidth"));
            news.setAttribute("maxwidth", news.getAttribute("originalWidth"));
//            news.setAttribute("width", news.getAttribute("originalWidth"));


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
//dump("check=" + this.canScrollSize + "\n");
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut();
  },


//-----------------------------------------------------------------------------------------------------
  checkCollapseBar : function()
  {
//dump("checkCollapseBar\n");
    inforssTraceIn(this);
    try
    {
      if (inforssXMLRepository.getSeparateLine() == "false")
      {
        var hbox = document.getElementById("inforss.newsbox1");
//dump("hbox=" + hbox.childNodes.length + "\n");
        if ((hbox.childNodes.length == 1) && (inforssXMLRepository.getCollapseBar() == true))
        {
	  	  if (hbox.hasAttribute("collapsed") == true)
		  {
		    if (hbox.getAttribute("collapsed") == "false")
		    {
			  hbox.setAttribute("collapsed", "true");
			  this.canScroll = true;
//dump("collapsed = true\n");
		    }
		  }
		  else
		  {
		    hbox.setAttribute("collapsed", "true");
		    this.canScroll = true;
//dump("collapsed1 = true\n");
		  }
	    }
	    else
	    {
		  if (hbox.hasAttribute("collapsed") == true)
		  {
		    if (hbox.getAttribute("collapsed") == "true")
		    {
		  	  hbox.setAttribute("collapsed", "false");
//dump("collapsed = false\n");
		    }
		  }
		  else
		  {
		    hbox.setAttribute("collapsed", "false");
//dump("collapsed1 = false\n");
		  }
		}
	  }
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut();
  },

//-----------------------------------------------------------------------------------------------------
  switchScroll : function()
  {
    inforssTraceIn(this);
    try
    {
      RSSList.firstChild.setAttribute("scrolling", ((inforssXMLRepository.isScrolling() == true)? "0" : "1"));
      inforssSave();
      this.init();
      if (inforssXMLRepository.isScrolling() == true)
      {
        this.startScrolling();
      }
      else
      {
        this.stopScrolling();
      }
      gInforssCanResize = false;
      this.canScroll = true;
      this.mediator.refreshBar();
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut();
  },

//-----------------------------------------------------------------------------------------------------
  quickFilter : function()
  {
    inforssTraceIn(this);
    try
    {
      var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
      var filter1 = { value: inforssXMLRepository.getQuickFilter()};
      var actif = { value: inforssXMLRepository.isQuickFilterActif() };
      var valid  = promptService.prompt(window, document.getElementById("bundle_inforss").getString("inforss.quick.filter.title"),
                          document.getElementById("bundle_inforss").getString("inforss.quick.filter"),
                          filter1, document.getElementById("bundle_inforss").getString("inforss.apply"), actif);
      if (valid == true)
      {
        RSSList.firstChild.setAttribute("quickFilterActif", actif.value);
        RSSList.firstChild.setAttribute("quickFilter", filter1.value);
        inforssSave();
        this.updateCmdIcon();
        this.applyQuickFilter(actif.value, filter1.value);
        this.checkScroll();
        this.checkCollapseBar();
//        this.mediator.refreshBar();
      }
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut();
  },

//-----------------------------------------------------------------------------------------------------
  applyQuickFilter : function(actif, filter)
  {
//dump("actif=" + actif + " filter=" + filter + "\n");
    inforssTraceIn(this);
    try
    {
      var hbox = document.getElementById('inforss.newsbox1');
      var labels = hbox.getElementsByTagName("label");
      for (var i=0; i < labels.length; i++)
      {
        var news = labels[i].parentNode;
        if (actif == false)
        {
          if (news.hasAttribute("collapsed") == true)
          {
            news.removeAttribute("collapsed");
          }
        }
        else
        {
          if ((labels[i].hasAttribute("title") == true) && (labels[i].getAttribute("title").toLowerCase().indexOf(filter.toLowerCase()) != -1 ))
          {
            if (news.hasAttribute("collapsed") == true)
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
//dump("type=" + labels[i].parentNode.nodeName + "\n");
//dump("title=" + labels[i].getAttribute("title") + " collapsed=" + labels[i].parentNode.getAttribute("collapsed") + "\n");
        }
      }
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut();
  },

//-----------------------------------------------------------------------------------------------------
  switchPause : function()
  {
    inforssTraceIn(this);
    try
    {
      if (inforssXMLRepository.isScrolling() == true)
      {
        this.canScroll = !this.canScroll;
        this.updateCmdIcon();
      }
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut();
  },

//-----------------------------------------------------------------------------------------------------
  switchDirection : function()
  {
    inforssTraceIn(this);
    try
    {
      inforssXMLRepository.switchDirection();
      this.updateCmdIcon();
    }
    catch(e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut();
  },

//-------------------------------------------------------------------------------------------------------------
  setScroll : function(flag)
  {
    this.canScroll = flag;
    if (this.canScroll == true)
    {
      this.checkScroll();
    }
    if (flag == false)
    {
      if (this.restartScrollingTimer == null)
      {
        if ((navigator.userAgent.indexOf("Firefox/1.0+") == -1) &&
                      (navigator.userAgent.indexOf("Firefox/1.4") == -1) &&
                      (navigator.userAgent.indexOf("Firefox/1.5") == -1) &&
                      (navigator.userAgent.indexOf("Thunderbird/1.5") == -1) &&
                      (navigator.userAgent.indexOf("SeaMonkey") == -1) &&
                      (navigator.userAgent.indexOf("rv:1.9") == -1) &&
                      (navigator.userAgent.indexOf("rv:2.0") == -1) &&
                      (navigator.userAgent.indexOf("rv:5.") == -1) &&
                      (navigator.userAgent.indexOf("rv:1.8") == -1))
        {
//          this.restartScrollingTimer = inforssSetTimer(this, "setScrollTrue", 5000);
        }
      }
    }
    else
    {
      if (this.restartScrollingTimer != null)
      {
        window.clearTimeout(this.restartScrollingTimer);
        inforssClearTimer(this.restartScrollingTimer);
        this.restartScrollingTimer = null;
      }
    }
  },

//-------------------------------------------------------------------------------------------------------------
  setScrollTrue : function()
  {
    this.canScroll = true;
  },

//-------------------------------------------------------------------------------------------------------------
  resizedWindow : function()
  {
//alert("resizedWindow\n");
    if ((gInforssLastResize == null) || (new Date() - gInforssLastResize) > 2000)
    {
      if ((RSSList != null) && (inforssXMLRepository.getSeparateLine() == "false"))
      {
          var nbWindows = inforssGetNbWindow();
//dump("nbWindows=" + nbWindows + "\n");
          var hbox = document.getElementById('inforss.newsbox1');
          var width = inforssXMLRepository.getScrollingArea();
//dump("width=" + width + "\n");
          var find = false;
          hbox.setAttribute("width", width);
          hbox.style.width = width + "px";

var hl = document.getElementById("inforss.headlines")  ;
var spring = hl.nextSibling;
if ((spring != null) && (spring.getAttribute("id") == "inforss.toolbar.spring"))
{
	var toolbar = spring.parentNode;
	toolbar.removeChild(spring);
	toolbar.insertBefore(spring, hl);
//	dump("spring relocalisé\n")
}
//var toolbar = document.getElementById("addon-bar")  ;
//dump(toolbar + "\n");
//dump(toolbar.childNodes + "\n");
//dump(toolbar.childNodes.length + "\n");
//for (var i=0; i< toolbar.childNodes.length; i++)
//{
//	dump(toolbar.childNodes[i].tagName + " " + toolbar.childNodes[i].getAttribute("flex") +  "\n");
//}

          if ((hbox.hasAttribute("collapsed") == true) && (hbox.getAttribute("collapsed") == "true"))
          {
            find = true;
            width--;
          }
          var oldX = hbox.boxObject.screenX;
          var newX = 0;
//dump("oldX=" + oldX + "\n");
          if (find == false)
          {
            while ((width > 0) && (find == false))
            {
/*	          if (nbWindows > 1)
	          {
	            if ((width %2) == 0)
	            {
//	      	      document.getElementById("inforss.newsbox1").setAttribute("collapsed", "true");
	            }
	            else
	            {
//		          document.getElementById("inforss.newsbox1").setAttribute("collapsed", "false");
	            }
	          }
*/	          hbox.setAttribute("width", width);
	          hbox.style.width = width + "px";
	          newX = hbox.boxObject.screenX;
//dump("newX=" + newX + "\n");
//dump("oldX=" + oldX + "\n");
	          if (newX == oldX)
	          {
	            width--;
	          }
	          else
	          {
	            find = true;
	          }
            }
//	        if (nbWindows > 1)
//	        {
//	          document.getElementById("inforss.newsbox1").setAttribute("collapsed", "false");
//	        }
          }
          width++;
	      hbox.setAttribute("width", width);
	      hbox.style.width = width + "px";
	      gInforssLastResize = new Date();
//dump("set width=" + width + "\n");
       }
     }
  },

};

//-------------------------------------------------------------------------------------------------------------
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
    var color = inforssXMLRepository.getForegroundColor();
    if (color == "auto")
    {
      if (inforssXMLRepository.getRed() == "-1")
      {
        obj.style.color = "inherit";
      }
      else
      {
        obj.style.color = ((eval(inforssXMLRepository.getRed())  + eval(inforssXMLRepository.getGreen()) + eval(inforssXMLRepository.getBlue())) < (3 * 85))? "white" : "black";
      }
    }
    else
    {
      obj.style.color = color;
    }
    if (sizeFlag == true)
    {
      var fontSize = inforssXMLRepository.getFontSize();
      if (fontSize == "auto")
      {
        obj.style.fontSize = "inherit";
      }
      else
      {
        obj.style.fontSize = fontSize + "pt";
      }
      obj.style.fontFamily = inforssXMLRepository.getFont();
      fontSize = null;
    }
    color = null;
//dump("setBackgroundColor color=" + color + "\n");
  }
};

//-------------------------------------------------------------------------------------------------------------
inforssHeadlineDisplay.setDefaultBackgroundColor = function(obj, sizeFlag)
{
  if (obj != null)
  {
    obj.style.backgroundColor="";
    var defaultColor = inforssXMLRepository.getDefaultForegroundColor();
    if (defaultColor == "default")
    {
      obj.style.color = "black";
    }
    else
    {
      if (defaultColor == "sameas")
      {
        var color = inforssXMLRepository.getForegroundColor();
        if (color == "auto")
        {
          if (inforssXMLRepository.getRed() == "-1")
          {
            obj.style.color = "inherit";
          }
          else
          {
            obj.style.color = ((eval(inforssXMLRepository.getRed())  + eval(inforssXMLRepository.getGreen()) + eval(inforssXMLRepository.getBlue())) < (3 * 85))? "white" : "black";
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
    if (sizeFlag == true)
    {
      var fontSize = inforssXMLRepository.getFontSize();
      if (fontSize == "auto")
      {
        obj.style.fontSize = "inherit";
      }
      else
      {
        obj.style.fontSize = fontSize + "pt";
      }
      obj.style.fontFamily = inforssXMLRepository.getFont();
      fontSize = null;
    }
  }
};

//-------------------------------------------------------------------------------------------------------------
inforssHeadlineDisplay.pauseScrolling = function(flag)
{
//dump("pauseScrolling=" + flag + "\n");
  if ((gInforssMediator != null) && (inforssXMLRepository.isStopScrolling() == true))
  {
    gInforssMediator.setScroll(flag);
  }
}

//-------------------------------------------------------------------------------------------------------------
inforssHeadlineDisplay.manageTooltipOpen = function(event)
{
//dump("manageTooltipOpen\n");
  try
  {
    var tooltip = event.target;
    var vboxes = tooltip.getElementsByTagName("vbox");
    var find = false;
    var i = 0;
    gInforssMediator.setActiveTooltip();
    while ((i < vboxes.length) && (find == false))
    {
//    alert(vboxes[i].headline.feed.feedXML.getAttribute("playPodcast"));
      if ((vboxes[i].hasAttribute("enclosureUrl") == true) && (vboxes[i].headline.feed.feedXML.getAttribute("playPodcast") == "true"))
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
          var doc = br.contentDocument;
          if (vboxes[i].getAttribute("enclosureType").indexOf("video") == 0)
          {
            br.setAttribute("src","data:text/html;charset=utf-8,<HTML><BODY><EMBED src='" + vboxes[i].getAttribute("enclosureUrl") + "' autostart='true' ></EMBED></BODY></HTML>");
          }
          else
          {
            br.setAttribute("src","data:text/html;charset=utf-8,<HTML><BODY><EMBED src='" + vboxes[i].getAttribute("enclosureUrl") + "' autostart='true' width='1' height='1'></EMBED></BODY></HTML>");
          }
//dump("src=" + br.getAttribute("src") + "\n");
//doc.firstChild.innerHTML = "<BODY><EMBED src=\"" + vboxes[i].getAttribute("enclosureUrl") + "\" autostart=\"true\" width=\"1\" height=\"1\"/></EMBED></BODY>";


//var contentWrapper = new XPCNativeWrapper(br.contentWindow, 'document');
//var docWrapper = new XPCNativeWrapper(contentWrapper.document, '', 'write(str)');
//docWrapper.open();
//docWrapper.write("<HTML><BODY><EMBED src=\"" + vboxes[i].getAttribute("enclosureUrl") + "\" autostart=\"true\" width=\"1\" height=\"1\"/></EMBED></BODY></HTML>");
//docWrapper.write("<HTML><BODY></BODY></HTML>");

//          doc.open("text/html");
//          doc.innerHTML = "<HTML><BODY><EMBED src=\"" + vboxes[i].getAttribute("enclosureUrl") + "\" autostart=\"true\" width=\"1\" height=\"1\"></EMBED></BODY></HTML>";
//          doc.write("<HTML><BODY><EMBED src=\"" + vboxes[i].getAttribute("enclosureUrl") + "\" autostart=\"true\" width=\"1\" height=\"1\"/></EMBED></BODY></HTML>");
//          var a = doc.open();
//          doc.write();//"<HTML>");
//          doc.write("<BODY>");
//          doc.write("<EMBED src=\"" + vboxes[i].getAttribute("enclosureUrl") + "\" autostart=\"true\" width=\"1\" height=\"1\"></EMBED></BODY></HTML>");
/*          doc.clear();

//inforssInspect(doc.childNodes[0], null, false);
//          doc.write("<html><body><EMBED src=\"" + vboxes[i].getAttribute("enclosureUrl") + "\" autostart=\"true\" width=\"1\" height=\"1\"></embed></body></html>");
//doc.body.innerHTML="<html><body><EMBED src=\"" + vboxes[i].getAttribute("enclosureUrl") + "\" autostart=\"true\" width=\"1\" height=\"1\"></embed></body></html>";
*/        }
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
//browsers[i].contentWindow.sizeToContent();
        }
        if (gInforssTooltipBrowser == null)
        {
          if (browsers[i].hasAttribute("enclosureUrl") == false)
          {
            gInforssTooltipBrowser = browsers[i];
          }
        }
        browsers[i].contentWindow.scrollTo(0,0);
      }
    }
    tooltip.setAttribute("noautohide","true");
//dump("userAgent=" + navigator.userAgent + "\n");
    if ((navigator.userAgent.indexOf("Firefox/1.0+") == -1) &&
        (navigator.userAgent.indexOf("Firefox/1.4") == -1) &&
        (navigator.userAgent.indexOf("Firefox/1.5") == -1) &&
        (navigator.userAgent.indexOf("Thunderbird/1.5") == -1) &&
        (navigator.userAgent.indexOf("SeaMonkey") == -1) &&
        (navigator.userAgent.indexOf("rv:1.9") == -1) &&
        (navigator.userAgent.indexOf("rv:2.0") == -1) &&
        (navigator.userAgent.indexOf("rv:5.") == -1) &&
        (navigator.userAgent.indexOf("rv:1.8") == -1))
    {
//      tooltip.popupBoxObject.autoPosition = false;
//      tooltip.setAttribute("noautohide","true");
//      var newX = tooltip.itemLabel.boxObject.screenX;

//      if ((newX + tooltip.boxObject.width) > screen.width)
//      {
//        newX = screen.width - tooltip.boxObject.width - 20;
//      }
//      if (newX < 0)
//      {
//        newX = 10;
//      }

//      if (navigator.platform != "MacPPC")
//      {
//        newX += window.screenX;// + window.outerWidth - window.innerWidth;
//      }

//      var newY = tooltip.itemLabel.boxObject.screenY - tooltip.boxObject.height - 5;


//      if (newY < 0)
//      {
//        newY = tooltip.itemLabel.boxObject.screenY + tooltip.itemLabel.boxObject.height + 5;
//      }

//      if (navigator.platform != "MacPPC")
//      {
//        newY += window.screenY + window.outerHeight - window.innerHeight - 5;
//      }

    //tooltip.popupBoxObject.moveTo(newX, newY);
//      tooltip.moveTo(newX, newY);
    }

    if (document.tooltipNode != null)
    {
      document.tooltipNode.addEventListener("mousemove", inforssHeadlineDisplay.manageTooltipMouseMove, false);
    }
    tooltip = null;
    vboxes = null;
    find = null;
    i = null;
    headlines = null;

  }
  catch(e)
  {
    inforssDebug(e);
  }
  return true;
}

//-------------------------------------------------------------------------------------------------------------
inforssHeadlineDisplay.resetPopup = function(url)
{
  try
  {
//dump("step 01\n");
	if ((typeof(url) == "object") || (url == null))
	{
//dump("step 02\n");
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
//dump("step 03:" + url + "\n");
      var feed = gInforssMediator.locateFeed(url).info;
      if (feed != null)
      {
        feed.setPopup(false);
	    feed.setAcknowledgeDate(new Date());
	    inforssSave();
        var observerService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
        observerService.notifyObservers(null, "ack", url);
        observerService = null;
      }
    }
  }
  catch(e)
  {
    inforssDebug(e);
  }
}

//-------------------------------------------------------------------------------------------------------------
inforssHeadlineDisplay.manageTooltipClose = function(event)
{
//dump("manageTooltipClose\n");
  try
  {
    var tooltip = event.target;
    gInforssMediator.resetActiveTooltip();
    if (document.tooltipNode != null)
    {
      document.tooltipNode.removeEventListener("mousemove", inforssHeadlineDisplay.manageTooltipMouseMove, false);
    }
//    window.removeEventListener("keyup", inforssHeadlineDisplay.manageTooltipMouseMove, false);
//    window.removeEventListener("keypress", inforssHeadlineDisplay.manageTooltipMouseMove, false);

    var brs = tooltip.getElementsByTagName("browser");
    var find = false;
    var i = 0;
    while ((i < brs.length) && (find == false))
    {
      if (brs[i].hasAttribute("enclosureUrl") == true)
      {
        find = true;
        var doc = brs[i].contentDocument;
        while (doc.firstChild != null)
        {
 	      doc.removeChild(doc.firstChild);
	    }
	    var elem = doc.createElement("HTML")
	    doc.appendChild(elem);
	    var elem1 = doc.createElement("HEAD");
	    elem.appendChild(elem1);
	    elem1 = doc.createElement("BODY");
	    elem.appendChild(elem1);

//        doc.write("<html><body></body></html>");
//doc.body.innerHTML="<html><body></body></html>";
        brs[i].parentNode.removeChild(brs[i]);
        delete brs[i];
      }
      else
      {
        i++;
      }
    }
    tooltip = null;
    brs = null;
    gInforssTooltipBrowser = null;
  }
  catch(e)
  {
    inforssDebug(e);
  }
  return true;
}

//-------------------------------------------------------------------------------------------------------------
inforssHeadlineDisplay.manageTooltipMouseMove = function(event)
{
  try
  {
//dump("key=" + event.keyCode + "\n");
//event.cancelBubble = true;event.stopPropagation();
    if (gInforssTooltipX == -1)
    {
      gInforssTooltipX = event.screenX;
    }
    if (gInforssTooltipY == -1)
    {
      gInforssTooltipY = event.screenY;
    }
    var tooltip = document.getElementById(event.target.getAttribute("tooltip"));
    var brs = tooltip.getElementsByTagName("browser");
//dump("brs=" + tooltip.innerHTML + "\n");
    if (gInforssTooltipBrowser != null)
    {
//dump("manageTooltipMouseMove=" + (event.screenX - gInforssTooltipX) * 50 + "\n");
    	gInforssTooltipBrowser.contentWindow.scrollBy((event.screenX - gInforssTooltipX) * 50, (event.screenY - gInforssTooltipY) * 50);
    }
    gInforssTooltipX = event.screenX;
    gInforssTooltipY = event.screenY;

  }
  catch(e)
  {
    inforssDebug(e);
  }
}

//-------------------------------------------------------------------------------------------------------------
inforssHeadlineDisplay.resizerUp = function(event)
{
  try
  {
    gInforssCanResize = false;
    gInforssMediator.checkStartScrolling();
    inforssSave();
  }
  catch(e)
  {
    inforssDebug(e);
  }
  return true;
}

//-------------------------------------------------------------------------------------------------------------
inforssHeadlineDisplay.headlineEventListener = function (event)
{
//dump("link=" + this.getAttribute("link") + "\n") ;
  gInforssMediator.clickRSS(event, this.getAttribute("link"));
  event.cancelBubble = true;
  event.stopPropagation();

  return true;
}

//-------------------------------------------------------------------------------------------------------------
inforssHeadlineDisplay.hideoldTooltip = function (event)
{
  var label = event.target.firstChild;
  var value = label.getAttribute("value");
  var index = value.indexOf("(");
  var tooltip = document.getElementById("inforss.popup.mainicon");
  if (tooltip.hasAttribute("inforssUrl") == true)
  {
	var url = tooltip.getAttribute("inforssUrl");
    var info = gInforssMediator.locateFeed(url);
    if ((info != null) && (info.info != null))
    {
      var nb = info.info.getNbNew();
      label.setAttribute("value", value.substring(0, index) + "(" + nb + ")");
    }
  }
  return true;
}

//-------------------------------------------------------------------------------------------------------------
inforssHeadlineDisplay.mainTooltip = function(event)
{
  var returnValue = true;
//dump(event.target.nodeName);
  try
  {
    if (gInforssPreventTooltip == true)
    {
      returnValue = false;
    }
    else
    {
//dump("step -02\n");
      var tooltip = document.getElementById("inforss.popup.mainicon");
      var rows = tooltip.firstChild.childNodes[1];
      while (rows.firstChild != null)
      {
	    rows.removeChild(rows.firstChild);
	  }
//dump("step -01\n");
	  if (tooltip.hasAttribute("inforssUrl") == false)
	  {
		var row = document.createElement("row");
	    var label = document.createElement("label");
	    label.setAttribute("value", "No info");
	    row.appendChild(label);
	    rows.appendChild(row);
      }
      else
      {
	    var url = tooltip.getAttribute("inforssUrl");
	    var info = gInforssMediator.locateFeed(url);
	    if (info != null)
	    {
//dump("step 00\n");
	      var row = document.createElement("row");
	      var label = document.createElement("label");
	      label.setAttribute("value", gInforssRssBundle.getString("inforss.title") + " : ");
	      label.style.width = "70px";
	      row.appendChild(label);
	      label = document.createElement("label");
	      label.setAttribute("value", info.info.getTitle());
	      label.style.color = "blue";
	      row.appendChild(label);
	      rows.appendChild(row);

	      if (info.info.getType() != "group")
	      {
//dump("step 01\n");
		    row = document.createElement("row");
	        label = document.createElement("label");
	        label.setAttribute("value",gInforssRssBundle.getString("inforss.url") + " : ");
	        label.style.width = "70px";
	        row.appendChild(label);
	        label = document.createElement("label");
	        label.setAttribute("value",info.info.getUrl());
	        label.style.color = "blue";
	        row.appendChild(label);
	        rows.appendChild(row);
//dump("step 02\n");

		    row = document.createElement("row");
	        label = document.createElement("label");
	        label.setAttribute("value", gInforssRssBundle.getString("inforss.link") + " : ");
	        label.style.width = "70px";
	        row.appendChild(label);
	        label = document.createElement("label");
	        label.setAttribute("value", info.info.getLinkAddress());
	        label.style.color = "blue";
	        row.appendChild(label);
	        rows.appendChild(row);

		    row = document.createElement("row");
	        label = document.createElement("label");
	        label.setAttribute("value",gInforssRssBundle.getString("inforss.feed.lastrefresh") + " : ");
	        label.style.width = "70px";
	        row.appendChild(label);
	        label = document.createElement("label");
	        label.setAttribute("value", ((info.info.lastRefresh == null)? "" : inforssGetStringDate(info.info.lastRefresh)));
	        label.style.color = "blue";
	        row.appendChild(label);
	        rows.appendChild(row);
//dump("step 07\n");

	  	    row = document.createElement("row");
	        label = document.createElement("label");
	        label.setAttribute("value",gInforssRssBundle.getString("inforss.feed.nextrefresh") + " : ");
	        label.style.width = "70px";
	        row.appendChild(label);
	        label = document.createElement("label");
	        label.setAttribute("value", (((info.info.lastRefresh == null))? "" : inforssGetStringDate(new Date(eval(info.info.lastRefresh.getTime() + info.info.feedXML.getAttribute("refresh") * 60000)))));
	        label.style.color = "blue";
	        row.appendChild(label);
	        rows.appendChild(row);
//dump("step 08\n");
	      }
//dump("step 03\n");
		  row = document.createElement("row");
	      label = document.createElement("label");
	      label.setAttribute("value", gInforssRssBundle.getString("inforss.report.nbheadlines") + " : ");
	      label.style.width = "70px";
	      row.appendChild(label);
	      label = document.createElement("label");
	      label.setAttribute("value", info.info.getNbHeadlines());
	      label.style.color = "blue";
	      row.appendChild(label);
	      rows.appendChild(row);
//dump("step 04\n");

		  row = document.createElement("row");
	      label = document.createElement("label");
	      label.setAttribute("value",gInforssRssBundle.getString("inforss.report.nbunreadheadlines") + " : ");
	      label.style.width = "70px";
	      row.appendChild(label);
	      label = document.createElement("label");
	      label.setAttribute("value",info.info.getNbUnread());
	      label.style.color = "blue";
	      row.appendChild(label);
	      rows.appendChild(row);
//dump("step 05\n");

		  row = document.createElement("row");
	      label = document.createElement("label");
	      label.setAttribute("value",gInforssRssBundle.getString("inforss.report.nbnewheadlines") + " : ");
	      label.style.width = "70px";
	      row.appendChild(label);
	      label = document.createElement("label");
	      label.setAttribute("value",info.info.getNbNew());
	      label.style.color = "blue";
	      row.appendChild(label);
	      rows.appendChild(row);
//dump("step 06\n");

	    }
	  }
	}
  }
  catch(e)
  {
    inforssDebug(e);
  }
  return returnValue;
}

