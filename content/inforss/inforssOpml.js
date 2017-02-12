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
// inforssOpml
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------
/* globals inforssDebug, inforssTraceIn, inforssTraceOut */
Components.utils.import("chrome://inforss/content/inforssDebug.jsm");

/* global inforssXMLRepository */
/* global gRssTimeout: true */
/* global gRssXmlHttpRequest: true */
/* global currentRSS: true */
/* global resetFilter */

const OPML_FILENAME = "inforss.opml";
const MODE_OPEN = 0;
const MODE_SAVE = 1;
const MODE_APPEND = 0;
const MODE_REPLACE = 1;
const MODE_FILE = 0;
const MODE_URL = 1;

var gItems = null;
var gIndex = -1;
var gNewRssList = null;

const FilePicker = Components.Constructor("@mozilla.org/filepicker;1",
                                          "nsIFilePicker",
                                          "init");

//------------------------------------------------------------------------------
function selectFile(mode, title)
{
  var filePath = null;
  try
  {
    var openMode = mode == MODE_OPEN ? Components.interfaces.nsIFilePicker.modeOpen : Components.interfaces.nsIFilePicker.modeSave;
    let filePicker = new FilePicker(window, title, openMode);
    filePicker.defaultString = OPML_FILENAME;
    filePicker.appendFilter(document.getElementById("bundle_inforss").getString("inforss.opml.opmlfile") + " (*xml; *.opml)", "*.xml;*.opml");
    filePicker.appendFilters(filePicker.filterXML);
    filePicker.appendFilters(filePicker.filterAll);

    var response = filePicker.show();
    if (response == filePicker.returnOK || response == filePicker.returnReplace)
    {
      filePath = filePicker.file.path;
    }
  }
  catch (e)
  {
    inforssDebug(e);
  }
  return filePath;
}

//------------------------------------------------------------------------------
/* exported exportOpml */
function exportOpml()
{
  try
  {
    let bundle = document.getElementById("bundle_inforss");
    let filePath = selectFile(MODE_SAVE, bundle.getString("inforss.opml.select.export"));
    if (filePath != null)
    {
      document.getElementById("exportProgressBar").value = 0;
      document.getElementById("inforss.exportDeck").selectedIndex = 1;
      inforssXMLRepository.outputAsOPML(filePath, function(current, max)
      {
        document.getElementById("exportProgressBar").value = current * 100 / max;
      }).then(function()
      {
        alert(bundle.getString("inforss.opml.saved"));
      }).catch(function(e)
      {
        alert(e);
      }).then(function()
      {
        document.getElementById("inforss.exportDeck").selectedIndex = 0;
      });
    }
  }
  catch (e)
  {
    inforssDebug(e);
  }
}

//------------------------------------------------------------------------------
/* global LocalFile */
/* global FileInputStream */
const ScriptableInputStream = Components.Constructor("@mozilla.org/scriptableinputstream;1",
                                                     "nsIScriptableInputStream",
                                                     "init");
const UTF8Converter = Components.Constructor("@mozilla.org/intl/utf8converterservice;1",
                                             "nsIUTF8ConverterService");

/* exported importOpml */
//FIXME Needs considerable refactoring.
function importOpml(mode, from)
{
  var keep = false;
  try
  {
    document.getElementById("importProgressBar").value = 0;
    document.getElementById("inforss.import.deck").selectedIndex = 1;
    if (from == MODE_FILE)
    {
      var filePath = selectFile(MODE_OPEN, document.getElementById("bundle_inforss").getString("inforss.opml.select.import"));
      if (filePath != null)
      {
        let opmlFile = new LocalFile(filePath);
        if (opmlFile.exists())
        {
          var is = new FileInputStream(opmlFile, -1, -1, 0);
          let sis = new ScriptableInputStream(is);
          var opml = sis.read(-1);
          sis.close();
          is.close();
          let uConv = new UTF8Converter();
          opml = uConv.convertStringToUTF8(opml, "UTF-8", true);
          keep = importOpmlFromText(opml, mode);
        }
      }
    }
    else
    {
      var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
      var url1 = {
        value: "http://www."
      };
      var valid = promptService.prompt(window, document.getElementById("bundle_inforss").getString("inforss.import.url"),
        document.getElementById("bundle_inforss").getString("inforss.import.url"),
        url1, null,
        {
          value: null
        });
      var url = url1.value;
      if ((valid) && (url != null) && (url != ""))
      {
        if (url.indexOf("http") == -1)
        {
          url = "http://" + url;
        }
        if (gRssTimeout != null)
        {
          window.clearTimeout(gRssTimeout);
          gRssTimeout = null;
        }
        if (gRssXmlHttpRequest != null)
        {
          gRssXmlHttpRequest.abort();
        }
        gRssXmlHttpRequest = new XMLHttpRequest();
        gRssXmlHttpRequest.open("GET", url, false);
        gRssXmlHttpRequest.onload = null;
        gRssXmlHttpRequest.onerror = null;
        try
        {
          gRssXmlHttpRequest.send(null);
        }
        catch (e)
        {}
        if ((gRssXmlHttpRequest.readyState == 4) && (gRssXmlHttpRequest.status == 200))
        {
          keep = importOpmlFromText(gRssXmlHttpRequest.responseText, mode);
        }
        else
        {
          alert(document.getElementById("bundle_inforss").getString("inforss.feed.issue"));
        }
      }
    }
  }
  catch (e)
  {
    inforssDebug(e);
  }
  if (keep == false)
  {
    document.getElementById("inforss.import.deck").selectedIndex = 0;
  }
}

//-------------------------------------------------------------------------------------------------------------
function importOpmlFromText(text, mode)
{
  var keep = false;
  try
  {
    if (text.length > 0)
    {
      var domFile = new DOMParser().parseFromString(text, "text/xml");
      gNewRssList = RSSList.cloneNode(true);
      if (mode == MODE_REPLACE)
      {
        let node = gNewRssList.firstChild;
        while (node.firstChild != null)
        {
          node.removeChild(node.firstChild);
        }
      }

      if (inforssGetFormat(domFile) == "opml")
      {
        gItems = domFile.getElementsByTagName("outline");
        gIndex = 0;
        var id = "importProgressBar";
        window.setTimeout(opmlParseItems, 0, id, mode);
        keep = true;
      }
      else
      {
        alert(document.getElementById("bundle_inforss").getString("inforss.opml.wrongFormat"));
      }
    }
  }
  catch (e)
  {
    inforssDebug(e);
  }
  return keep;
}

//------------------------------------------------------------------------------
function opmlParseItems(id, mode)
{
  inforssTraceIn();
  try
  {
    if (gIndex < gItems.length)
    {
      document.getElementById(id).value = eval((gIndex * 100 / (gItems.length - 1)));
      document.getElementById(id).focus();
      if (((gItems[gIndex].hasAttribute("type")) && (gItems[gIndex].getAttribute("type").toLowerCase() == "rss")) ||
        (gItems[gIndex].hasAttribute("xmlUrl")))
      {
        let rss = gNewRssList.createElement("RSS");
        if (gItems[gIndex].hasAttribute("title"))
        {
          rss.setAttribute("title", gItems[gIndex].getAttribute("title"));
        }
        if (gItems[gIndex].hasAttribute("xmlHome"))
        {
          rss.setAttribute("link", gItems[gIndex].getAttribute("xmlHome"));
        }
        else
        {
          if (gItems[gIndex].hasAttribute("htmlurl"))
          {
            rss.setAttribute("link", gItems[gIndex].getAttribute("htmlurl"));
          }
        }
        if (gItems[gIndex].hasAttribute("text"))
        {
          rss.setAttribute("description", gItems[gIndex].getAttribute("text"));
        }
        else
        {
          if (gItems[gIndex].hasAttribute("title"))
          {
            rss.setAttribute("description", gItems[gIndex].getAttribute("title"));
          }
        }
        if (gItems[gIndex].hasAttribute("xmlUrl"))
        {
          rss.setAttribute("url", gItems[gIndex].getAttribute("xmlUrl"));
        }
        if (gItems[gIndex].hasAttribute("user"))
        {
          rss.setAttribute("user", gItems[gIndex].getAttribute("user"));
        }
        if (gItems[gIndex].hasAttribute("icon"))
        {
          rss.setAttribute("icon", gItems[gIndex].getAttribute("icon"));
        }
        if (gItems[gIndex].hasAttribute("selected"))
        {
          rss.setAttribute("selected", gItems[gIndex].getAttribute("selected"));
        }
        if (gItems[gIndex].hasAttribute("nbItem"))
        {
          rss.setAttribute("nbItem", gItems[gIndex].getAttribute("nbItem"));
        }
        if (gItems[gIndex].hasAttribute("lengthItem"))
        {
          rss.setAttribute("lengthItem", gItems[gIndex].getAttribute("lengthItem"));
        }
        if (gItems[gIndex].hasAttribute("refresh"))
        {
          rss.setAttribute("refresh", gItems[gIndex].getAttribute("refresh"));
        }
        if (gItems[gIndex].hasAttribute("filter"))
        {
          rss.setAttribute("filter", gItems[gIndex].getAttribute("filter"));
        }
        if (gItems[gIndex].hasAttribute("infoType"))
        {
          rss.setAttribute("type", gItems[gIndex].getAttribute("infoType"));
        }
        if (gItems[gIndex].hasAttribute("filterPolicy"))
        {
          rss.setAttribute("filterPolicy", gItems[gIndex].getAttribute("filterPolicy"));
        }
        if (gItems[gIndex].hasAttribute("playPodcast"))
        {
          rss.setAttribute("playPodcast", gItems[gIndex].getAttribute("playPodcast"));
        }
        if (gItems[gIndex].hasAttribute("browserHistory"))
        {
          rss.setAttribute("browserHistory", gItems[gIndex].getAttribute("browserHistory"));
        }
        if (gItems[gIndex].hasAttribute("filterCaseSensitive"))
        {
          rss.setAttribute("filterCaseSensitive", gItems[gIndex].getAttribute("filterCaseSensitive"));
        }
        if (gItems[gIndex].hasAttribute("activity"))
        {
          rss.setAttribute("activity", gItems[gIndex].getAttribute("activity"));
        }
        if (gItems[gIndex].hasAttribute("regexp"))
        {
          rss.setAttribute("regexp", gItems[gIndex].getAttribute("regexp"));
        }
        if (gItems[gIndex].hasAttribute("regexpTitle"))
        {
          rss.setAttribute("regexpTitle", gItems[gIndex].getAttribute("regexpTitle"));
        }
        if (gItems[gIndex].hasAttribute("regexpDescription"))
        {
          rss.setAttribute("regexpDescription", gItems[gIndex].getAttribute("regexpDescription"));
        }
        if (gItems[gIndex].hasAttribute("regexpPubDate"))
        {
          rss.setAttribute("regexpPubDate", gItems[gIndex].getAttribute("regexpPubDate"));
        }
        if (gItems[gIndex].hasAttribute("regexpLink"))
        {
          rss.setAttribute("regexpLink", gItems[gIndex].getAttribute("regexpLink"));
        }
        if (gItems[gIndex].hasAttribute("regexpCategory"))
        {
          rss.setAttribute("regexpCategory", gItems[gIndex].getAttribute("regexpCategory"));
        }
        if (gItems[gIndex].hasAttribute("regexpStartAfter"))
        {
          rss.setAttribute("regexpStartAfter", gItems[gIndex].getAttribute("regexpStartAfter"));
        }
        if (gItems[gIndex].hasAttribute("regexpStopBefore"))
        {
          rss.setAttribute("regexpStopBefore", gItems[gIndex].getAttribute("regexpStopBefore"));
        }
        if (gItems[gIndex].hasAttribute("htmlDirection"))
        {
          rss.setAttribute("htmlDirection", gItems[gIndex].getAttribute("htmlDirection"));
        }
        if (gItems[gIndex].hasAttribute("htmlTest"))
        {
          rss.setAttribute("htmlTest", gItems[gIndex].getAttribute("htmlTest"));
        }
        if (gItems[gIndex].hasAttribute("group"))
        {
          rss.setAttribute("group", gItems[gIndex].getAttribute("group"));
        }
        if (gItems[gIndex].hasAttribute("groupAssociated"))
        {
          rss.setAttribute("groupAssociated", gItems[gIndex].getAttribute("groupAssociated"));
        }
        if (gItems[gIndex].hasAttribute("acknowledgeDate"))
        {
          rss.setAttribute("acknowledgeDate", gItems[gIndex].getAttribute("acknowledgeDate"));
        }

        gNewRssList.firstChild.appendChild(rss);
        if ((rss.hasAttribute("icon") == false) || (rss.getAttribute("icon") == ""))
        {
          rss.setAttribute("icon", inforssFindIcon(rss));
        }
        if (rss.hasAttribute("link") == false)
        {
          rss.setAttribute("link", rss.getAttribute("url"));
        }
        if (rss.hasAttribute("description") == false)
        {
          rss.setAttribute("description", rss.getAttribute("title"));
        }
      }
      gIndex++;
      window.setTimeout(opmlParseItems, 100, id, mode);
    }
    else
    {
      //----------hack
      //RSSList = gNewRssList;
      //------restore later
      inforssBackup();
      inforssSave();
      //init(); //OMG WTF is this calling? - looks like inforssOptions::init()
      //it certainly causes things to self destruct
      sendEventToMainWindow();
      alert(document.getElementById("bundle_inforss").getString("inforss.opml.read"));
      document.getElementById("inforss.import.deck").selectedIndex = 0;
      if (RSSList.firstChild.childNodes.length > 0)
      {
        selectRSS(document.getElementById("rss-select-menu").firstChild.firstChild);
        document.getElementById("rss-select-menu").selectedIndex = 0;
      }
      else
      {
        document.getElementById("rss-select-menu").selectedIndex = -1;
        document.getElementById('optionTitle').value = "";
        document.getElementById('optionUrl').value = "";
        document.getElementById('optionLink').value = "";
        document.getElementById('optionDescription').value = "";
        resetFilter();
        currentRSS = null;
      }
    }
  }
  catch (e)
  {
    inforssDebug(e);
    gIndex++;
    window.setTimeout(opmlParseItems, 100, id, mode);
  }
  inforssTraceOut();
}