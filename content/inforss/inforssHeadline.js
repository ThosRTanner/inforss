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
/* globals inforssDebug, inforssTraceIn, inforssTraceOut */
Components.utils.import("chrome://inforss/content/modules/inforssDebug.jsm");


function inforssHeadline(receivedDate, pubDate, title, guid, link, description, url, home, category, enclosureUrl, enclosureType, enclosureSize, feed)
{
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
  if (inforssXMLRepository.isHideHistory())
  {
    try
    {
      //      var globalHistory = Components.classes["@mozilla.org/browser/global-history;1"].createInstance( Components.interfaces.nsIGlobalHistory );
      //dump("inforssHeadline isvisited=" + globalHistory.isVisited(link + "#" + escape(title)) + " link=" + link + "\n");
      //      if (globalHistory.isVisited(link + "#" + escape(title)))
      //alert("link=" + link + " title=" + title);
      if (feed.exists(link, title, feed.getBrowserHistory()) == false)
      {
        //dump("n'existe pas\n");
        feed.createNewRDFEntry(link, title, receivedDate);
      }
      else
      {
        //alert("existe");
        var oldReceivedDate = feed.getAttribute(link, title, "receivedDate");
        var oldReadDate = feed.getAttribute(link, title, "readDate");
        var oldViewed = feed.getAttribute(link, title, "viewed");
        //alert("oldViewed=" + oldViewed);
        var oldBanned = feed.getAttribute(link, title, "banned");
        if (oldReceivedDate != null)
        {
          this.receivedDate = new Date(oldReceivedDate);
        }
        if ((oldReadDate != null) && (oldReadDate != ""))
        {
          this.readDate = new Date(oldReadDate);
        }
        if (oldViewed != null)
        {
          this.viewed = (oldViewed == "true");
        }
        if (oldBanned != null)
        {
          this.banned = (oldBanned == "true");
        }
        oldReceivedDate = null;
        oldReadDate = null;
        oldViewed = null;
        oldBanned = null;
      }
      if ((enclosureUrl != null) && (enclosureUrl != "") &&
        (enclosureType != null) && (enclosureType.indexOf("audio") == 0) &&
        ((feed.getAttribute(link, title, "savedPodcast") == null) || (feed.getAttribute(link, title, "savedPodcast") == "false")) &&
        (feed.getSavePodcastLocation() != ""))
      {
        inforssHeadline.podcastArray.push(
        {
          headline: this,
          enclosureUrl: enclosureUrl,
          feed: feed,
          link: link,
          title: title
        });
        //dump("save lenght=" + inforssHeadline.podcastArray.length + "\n");
        if (inforssHeadline.downloadTimeout == null)
        {
          inforssHeadline.downloadTimeout = window.setTimeout(this.savePodcast, 10);
        }
      }
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
  }
  return this;
}

inforssHeadline.prototype = {
  //-------------------------------------------------------------------------------------------------------------
  setHbox: function(hbox)
  {
    inforssTraceIn(this);
    this.hbox = hbox;
    //dump("setHbox previous=" + hbox.previousSibling + "\n");
    //dump("setHbox next=" + hbox.nextSibling + "\n");
    inforssTraceOut(this);
  },

  //-------------------------------------------------------------------------------------------------------------
  getHbox: function()
  {
    return this.hbox;
  },

  //-------------------------------------------------------------------------------------------------------------
  getFeed: function()
  {
    return this.feed;
  },

  //-------------------------------------------------------------------------------------------------------------
  getLink: function()
  {
    return this.link;
  },

  //-------------------------------------------------------------------------------------------------------------
  getTitle: function()
  {
    return this.title;
  },

  //-------------------------------------------------------------------------------------------------------------
  resetHbox: function()
  {
    inforssTraceIn(this);
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
      if ((labels != null) && (labels.length > 0))
      {
        if (labels[0].hasAttribute("tooltip"))
        {
          var tooltip = document.getElementById(labels[0].getAttribute("tooltip"));
          //          var tooltip = labels[0].getElementsByTagName("tooltip")[0];
          if (tooltip != null)
          {
            tooltip.parentNode.removeChild(tooltip);
            tooltip.removeAttribute("id");
            labels[0].removeAttribute("tooltip");
            var vboxes = tooltip.getElementsByTagName("vbox");
            for (var j = 0; j < vboxes.length; j++)
            {
              if (vboxes[j].hasAttribute("enclosureUrl"))
              {
                vboxes[j].removeAttribute("enclosureUrl");
              }
            }
            delete tooltip;
          }
        }
      }
      if (this.hbox.hasAttribute("link"))
      {
        this.hbox.removeAttribute("link");
      }
      if (this.hbox.hasAttribute("opacity"))
      {
        this.hbox.removeAttribute("opacity");
      }
      if (this.hbox.hasAttribute("originalWidth"))
      {
        this.hbox.removeAttribute("originalWidth");
      }
    }
    this.hbox = null;
    inforssTraceOut(this);
  },

  //-------------------------------------------------------------------------------------------------------------
  savePodcast: function()
  {
    //dump("start savePodcast\n");
    try
    {
      var objet = inforssHeadline.podcastArray.shift();
      var ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
      var uri = ioService.newURI(objet.enclosureUrl, null, null);
      var url = uri.QueryInterface(Components.interfaces.nsIURL);

      var dm = Components.classes["@mozilla.org/download-manager;1"].getService(Components.interfaces.nsIDownloadManager);
      var file = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
      var filePath = objet.headline.getFeed().getSavePodcastLocation();
      file.initWithPath(filePath);
      file.append(url.fileName);
      var fileURI = ioService.newFileURI(file);
      var mimeService = Components.classes["@mozilla.org/uriloader/external-helper-app-service;1"]
        .getService(Components.interfaces.nsIMIMEService);
      var mimeInfo = null;
      try
      {
        mimeInfo = mimeService.getFromTypeAndExtension(null, url.fileExtension);
      }
      catch (e)
      {}
      // Persist
      const nsIWBP = Components.interfaces.nsIWebBrowserPersist;
      var persist = Components.classes['@mozilla.org/embedding/browser/nsWebBrowserPersist;1']
        .createInstance(Components.interfaces.nsIWebBrowserPersist);
      var flags = nsIWBP.PERSIST_FLAGS_NO_CONVERSION |
        nsIWBP.PERSIST_FLAGS_REPLACE_EXISTING_FILES |
        nsIWBP.PERSIST_FLAGS_BYPASS_CACHE;
      persist.persistFlags = flags;
      //  var tr = Components.classes["@mozilla.org/transfer;1"].createInstance(Components.interfaces.nsITransfer);

      //dump("avant addDownload\n");
      var dl = null;
      //      if ((navigator.userAgent.indexOf("rv:1.9") != -1) || (navigator.userAgent.indexOf("rv:2.0") != -1) || (navigator.userAgent.indexOf("rv:5.") != -1))
      //      {
      dl = dm.addDownload(0, uri, fileURI, objet.enclosureUrl, mimeInfo, 0, null, persist);
      //      }
      //      else
      //      {
      //        dl = dm.addDownload ( 0 , uri , fileURI , objet.enclosureUrl , objet.feed.getIcon() , mimeInfo , 0 , null, persist );
      //      }
      //    tr.init(uri, fileURI, "", null, null, null, persist);

      myInforssListener.init(dl, objet.enclosureUrl, filePath + "/" + url.fileName, objet.headline, objet);
      persist.progressListener = myInforssListener;

      //var dpl = Components.classes['@mozilla.org/download-manager/listener;1']
      //                          .createInstance(Components.interfaces.nsIDownloadProgressListener);

      persist.saveURI(uri, null, null, null, null, fileURI);
      //      objet.headline.podcast = new inforssFTPDownload();
      //      objet.headline.podcast.start(uri, objet.headline, objet.headline.savePodcastCallback, objet.headline.savePodcastCallback);
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    //dump("end savePodcast\n");
  },

  //-----------------------------------------------------------------------------------------------------
  savePodcastCallback: function(step, status, headline, callback)
  {
    //dump("savePodcastCallback\n");
    inforssTraceIn();
    var returnValue = true;
    try
    {
      if (step == "send")
      {
        //      alert("send");
      }
      else
      {
        var str = headline.podcast.data;
        var file = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
        var filePath = headline.getFeed().getSavePodcastLocation();
        file.initWithPath(filePath);
        var last = headline.enclosureUrl.match("^.*/(.*)$");
        if (last != null)
        {
          last = last[1];
        }
        else
        {
          last = headline.enclosureUrl.match("^.*\\(.*)$");
          if (last != null)
          {
            last = last[1];
          }
          else
          {
            last = "podcast.mp3";
          }
        }
        if ((last != null) && (last != ""))
        {
          file.append(last);
          if (file.exists())
          {
            file.remove(false);
          }
          file.create(file.NORMAL_FILE_TYPE, 0666);
          var stream = Components.classes['@mozilla.org/network/file-output-stream;1'].createInstance(Components.interfaces.nsIFileOutputStream);
          stream.init(file, 2, 0x200, false);
          stream.write(str, str.length);
          stream.flush();
          stream.close();
          headline.getFeed().setAttribute(headline.getLink(), headline.getTitle(), "savedPodcast", "true");
        }
        headline.podcast = null;
      }
    }
    catch (e)
    {
      inforssDebug(e);
    }
    if (step != "send")
    {
      if (inforssHeadline.podcastArray.length != 0)
      {
        inforssHeadline.downloadTimeout = window.setTimeout(inforssHeadline.podcastArray[0].headline.savePodcast, 2000);
      }
      else
      {
        inforssHeadline.downloadTimeout = null;
        //dump("inforssHeadline.downloadTimeout = null\n");
      }
    }
    inforssTraceOut();
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
      //      var globalHistory = Components.classes["@mozilla.org/browser/global-history;1"].createInstance( Components.interfaces.nsIGlobalHistory );
      //      globalHistory.addPage(this.link + "#" + escape(this.title));
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
  },

  //-------------------------------------------------------------------------------------------------------------
  setBanned: function()
  {
    try
    {
      this.banned = true;
      this.feed.setAttribute(this.link, this.title, "banned", "true");
      //      var globalHistory = Components.classes["@mozilla.org/browser/global-history;1"].createInstance( Components.interfaces.nsIGlobalHistory );
      //      globalHistory.addPage(this.link + "#" + escape(this.title));
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
  },

  //-------------------------------------------------------------------------------------------------------------
  isNew: function()
  {
    var returnValue = false;
    try
    {
      if ((new Date() - this.receivedDate) < (eval(inforssXMLRepository.getDelay()) * 60000))
      {
        returnValue = true;
      }
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    return returnValue;
  },

  //-------------------------------------------------------------------------------------------------------------
  matches: function(target)
  {
    if (this.link == target.link)
    {
      if (this.guid != null || target.guid != null)
      {
        return this.guid == target.guid;
      }
      else
      {
        return this.title == target.title;
      }
    }

    return false;
  },

  //-------------------------------------------------------------------------------------------------------------
  getXmlHeadlines: function()
  {
    inforssTraceIn(this);
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
      delete ser;
    }
    catch (e)
    {
      inforssDebug(e, this);
    }
    inforssTraceOut(this);
    return xml;
  },

};

inforssHeadline.podcastArray = new Array();
inforssHeadline.downloadTimeout = null;

var myInforssListener = {
  dl: null,
  link: null,
  headline: null,
  dest: null,
  objet: null,

  QueryInterface: function(aIID)
  {
    if (aIID.equals(Components.interfaces.nsIWebProgressListener) ||
      aIID.equals(Components.interfaces.nsISupportsWeakReference) ||
      aIID.equals(Components.interfaces.nsISupports))
    {
      return this;
    }
    throw Components.results.NS_NOINTERFACE;
  },

  init: function(aDl, aLink, aDest, aHeadline, aObjet)
  {
    dl = aDl;
    link = aLink;
    dest = aDest;
    headline = aHeadline;
    objet = aObjet;
  },

  onStateChange: function(aProgress, aRequest, aFlag, aStatus)
  {
    if (aFlag & Components.interfaces.nsIWebProgressListener.STATE_START)
    {
      //     dump("debut du download:" + link + "\n");
      // This fires when the load event is initiated
    }
    if (aFlag & Components.interfaces.nsIWebProgressListener.STATE_STOP)
    {
      // This fires when the load finishes
      //     dump("fin du download:" + link + "\n");
      if (inforssHeadline.podcastArray.length != 0)
      {
        inforssHeadline.downloadTimeout = window.setTimeout(inforssHeadline.podcastArray[0].headline.savePodcast, 2000);
      }
      else
      {
        inforssHeadline.downloadTimeout = null;
      }
      headline.getFeed().setAttribute(headline.getLink(), headline.getTitle(), "savedPodcast", "true");
      objet.headline = null;
      objet.title = null;
      objet.enclosureUrl = null;
      objet.feed = null;
      objet.link = null;
      delete objet;
    }
    return dl.onStateChange(aProgress, aRequest, aFlag, aStatus);
  },

  onLocationChange: function(aProgress, aRequest, aURI)
  {
    // This fires when the location bar changes i.e load event is confirmed
    // or when the user switches tabs
    return dl.onLocationChange(aProgress, aRequest, aURI);
  },

  // For definitions of the remaining functions see XulPlanet.com
  onProgressChange: function(webProgress, request, curSelfProgress, maxSelfProgress, curTotalProgress, maxTotalProgress)
  {
    return dl.onProgressChange(webProgress, request, curSelfProgress, maxSelfProgress, curTotalProgress, maxTotalProgress);
  },
  onStatusChange: function(webProgress, request, status, message)
  {
    return dl.onStatusChange(webProgress, request, status, message);
  },
  onSecurityChange: function(webProgress, request, state)
  {
    return dl.onSecurityChange(webProgress, request, state);
  },
  onLinkIconAvailable: function()
  {
    return dl.onLinkIconAvailable();
  }
}
