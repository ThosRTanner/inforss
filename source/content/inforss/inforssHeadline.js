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
// inforssHeadline
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------
var inforss = inforss || {};
Components.utils.import("chrome://inforss/content/modules/Debug.jsm", inforss);

Components.utils.import("chrome://inforss/content/modules/Utils.jsm", inforss);

///* globals createDownload, fetch, getList, getSummary */
/* globals Downloads */
Components.utils.import("resource://gre/modules/Downloads.jsm");

/* globals inforssXMLRepository, inforssHeadlineDisplay */

/* globals LocalFile */


function inforssHeadline(receivedDate, pubDate, title, guid, link, description, url, home, category, enclosureUrl, enclosureType, enclosureSize, feed)
{
  //FIXME I don't think this is possible any more but need to check nntp code
  if (link == null || link == "")
  {
    console.log("null link, using home page " + home);
    link = home;
  }
  //FIXME I don't think this is possible though need to check nntp code
  if (pubDate == null)
  {
    pubDate = receivedDate;
  }

  this.readDate = null;
  this.publishedDate = pubDate;
  this.receivedDate = receivedDate;
  this.title = title;
  this.guid = guid;
  this.url = url;
  this.link = link;
  this.description = description;
  this.home = home;
  this.category = category;
  this.feed = feed;
  this.hbox = null;
  this.viewed = false;
  this.banned = false;
  this.enclosureUrl = enclosureUrl;
  this.enclosureType = enclosureType;
  this.enclosureSize = enclosureSize;
  this.podcast = null;

  if (inforssXMLRepository.remember_headlines())
  {
    try
    {
      if (feed.exists(link, title, feed.getBrowserHistory()))
      {
        //Get dates and status from cache
        const oldReceivedDate = feed.getAttribute(link, title, "receivedDate");
        if (oldReceivedDate != null)
        {
          this.receivedDate = new Date(oldReceivedDate);
        }

        const oldReadDate = feed.getAttribute(link, title, "readDate");
        //FIXME Why check against ""?
        if (oldReadDate != null && oldReadDate != "")
        {
          this.readDate = new Date(oldReadDate);
        }

        const oldViewed = feed.getAttribute(link, title, "viewed");
        if (oldViewed != null)
        {
          this.viewed = oldViewed == "true";
        }

        const oldBanned = feed.getAttribute(link, title, "banned");
        if (oldBanned != null)
        {
          this.banned = oldBanned == "true";
        }
      }
      else
      {
        feed.createNewRDFEntry(link, title, receivedDate);
      }

      //Download podcast if we haven't already.
      //FIXME why can the URL be null-or-blank
      if (enclosureUrl != null && enclosureUrl != "" &&
          enclosureType != null &&
          (feed.getAttribute(link, title, "savedPodcast") == null ||
           feed.getAttribute(link, title, "savedPodcast") == "false") &&
          feed.getSavePodcastLocation() != "")
      {
        inforssHeadline.podcastArray.push(this);
        if (inforssHeadline.downloadTimeout == null)
        {
          next_podcast();
        }
      }
    }
    catch (e)
    {
      inforss.debug(e);
    }
  }

  return this;
}

inforssHeadline.prototype = {
  //----------------------------------------------------------------------------
  setHbox: function(hbox)
  {
    this.hbox = hbox;
  },

  //----------------------------------------------------------------------------
  getHbox: function()
  {
    return this.hbox;
  },

  //----------------------------------------------------------------------------
  getFeed: function()
  {
    return this.feed;
  },

  //----------------------------------------------------------------------------
  getLink: function()
  {
    return this.link;
  },

  //----------------------------------------------------------------------------
  getTitle: function()
  {
    return this.title;
  },

  //----------------------------------------------------------------------------
  resetHbox: function()
  {
    inforss.traceIn(this);
    if (this.hbox != null)
    {
      try
      {
        this.hbox.removeEventListener("mousedown", inforssHeadlineDisplay.headlineEventListener, false);
      }
      catch (ex)
      {}
      if (this.hbox.parentNode != null)
      {
        this.hbox.parentNode.removeChild(this.hbox);
      }
      var labels = this.hbox.getElementsByTagName("label");
      if (labels.length > 0)
      {
        if (labels[0].hasAttribute("tooltip"))
        {
          var tooltip = document.getElementById(labels[0].getAttribute("tooltip"));
          if (tooltip != null)
          {
            tooltip.parentNode.removeChild(tooltip);
            //FIXME: doesn't seem much point in this
            //tooltip.removeAttribute("id");
            labels[0].removeAttribute("tooltip");
            var vboxes = tooltip.getElementsByTagName("vbox");
            for (var j = 0; j < vboxes.length; j++)
            {
                vboxes[j].removeAttribute("enclosureUrl");
            }
          }
        }
      }
      this.hbox.removeAttribute("link");
      this.hbox.removeAttribute("opacity");
      this.hbox.removeAttribute("originalWidth");
      this.hbox = null;
    }
    inforss.traceOut(this);
  },

  //----------------------------------------------------------------------------
  //Save podcast. This is kicked off on a timeout and done one at a time.
  save_podcast: function()
  {
    try
    {
      console.log("Saving prodcast " + this.enclosureUrl);
      const uri = inforss.make_URI(this.enclosureUrl);
      const url = uri.QueryInterface(Components.interfaces.nsIURL);
      const file = new LocalFile(this.feed.getSavePodcastLocation());
      file.append(url.fileName);
      const promise = Downloads.fetch(uri, file);
      promise.then(this.podcast_saved.bind(this),
                   this.podcast_not_saved.bind(this));
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
  },

  //----------------------------------------------------------------------------
  //podcast was saved. log it and go to the next one
  podcast_saved: function()
  {
    console.log("Saved prodcast " + this.enclosureUrl);
    this.feed.setAttribute(this.link, this.title, "savedPodcast", "true");
    next_podcast();
  },

  //----------------------------------------------------------------------------
  //podcast was not saved. log the fact and go to the next one
  podcast_not_saved: function(err)
  {
    console.log("Failed to save prodcast " + this.enclosureUrl, err);
    next_podcast();
  },

  //-------------------------------------------------------------------------------------------------------------
  setViewed: function()
  {
    try
    {
      this.viewed = true;
      this.readDate = new Date();
      this.feed.setAttribute(this.link, this.title, "viewed", "true");
      this.feed.setAttribute(this.link, this.title, "readDate", this.readDate);
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
  },

  //-------------------------------------------------------------------------------------------------------------
  setBanned: function()
  {
    try
    {
      this.banned = true;
      this.feed.setAttribute(this.link, this.title, "banned", "true");
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
  },

  //-------------------------------------------------------------------------------------------------------------
  isNew: function()
  {
    return new Date() - this.receivedDate <
            inforssXMLRepository.recent_headline_max_age * 60000;
  },

  //-------------------------------------------------------------------------------------------------------------
  matches: function(target)
  {
    //FIXME Does the check of the link make sense?
    return this.link == target.link && this.guid == target.guid;
  },

  //-------------------------------------------------------------------------------------------------------------
  //FIXME Can this function ever get called? If so,  what about the one in
  //inforssFeed.js?
  getXmlHeadlines: function()
  {
    inforss.traceIn(this);
    var xml = null;
    try
    {
      var headline = document.createElement("headline");
      headline.setAttribute("readDate", this.readDate);
      headline.setAttribute("publishedDate", this.publishedDate);
      headline.setAttribute("receivedDate", this.receivedDate);
      headline.setAttribute("title", this.title);
      headline.setAttribute("url", this.url);
      headline.setAttribute("link", this.link);
      headline.setAttribute("description", this.description);
      headline.setAttribute("home", this.home);
      headline.setAttribute("viewed", this.viewed);
      headline.setAttribute("category", this.category);
      headline.setAttribute("banned", this.banned);
      headline.setAttribute("enclosureUrl", this.enclosureUrl);
      headline.setAttribute("enclosureType", this.enclosureType);
      headline.setAttribute("banned", this.banned);
      headline.setAttribute("enclosureUrl", this.enclosureUrl);
      headline.setAttribute("enclosureType", this.enclosureType);
      var ser = new XMLSerializer();
      xml = ser.serializeToString(headline);
    }
    catch (e)
    {
      inforss.debug(e, this);
    }
    inforss.traceOut(this);
    return xml;
  },

};

//Static variables
inforssHeadline.podcastArray = new Array();
inforssHeadline.downloadTimeout = null;

function next_podcast()
{
  if (inforssHeadline.podcastArray.length != 0)
  {
    const headline = inforssHeadline.podcastArray.shift();
    inforssHeadline.downloadTimeout =
      window.setTimeout(headline.save_podcast.bind(headline), 2000);
  }
  else
  {
    inforssHeadline.downloadTimeout = null;
  }
}
