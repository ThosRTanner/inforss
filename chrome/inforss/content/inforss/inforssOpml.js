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
//-------------------------------------------------------------------------------------------------------------
// inforssOpml
// Author : Didier Ernotte 2005
// Inforss extension
//-------------------------------------------------------------------------------------------------------------
const OPML_FILENAME="inforss.opml";
const MODE_OPEN = 0;
const MODE_SAVE = 1;
const MODE_APPEND = 0;
const MODE_REPLACE = 1;
const MODE_FILE = 0;
const MODE_URL = 1;

var gItems = null;
var gIndex = -1;
var gNewRssList = null;

//-------------------------------------------------------------------------------------------------------------
function selectFile(mode, title)
{
  var filePath = null;
  try
  {
    var filePicker = Components.classes["@mozilla.org/filepicker;1"].createInstance(Components.interfaces.nsIFilePicker);
    var openMode = (mode == MODE_OPEN)? filePicker.modeOpen : filePicker.modeSave;
    filePicker.init(window, title, openMode);
    filePicker.defaultString = OPML_FILENAME;
    filePicker.appendFilter(document.getElementById("bundle_inforss").getString("inforss.opml.opmlfile") + " (*xml; *.opml)", "*.xml;*.opml");
    filePicker.appendFilters(filePicker.filterXML);
    filePicker.appendFilters(filePicker.filterAll);

    var response = filePicker.show();
    if ((response == filePicker.returnOK) || (response == filePicker.returnReplace))
    {
	  filePath = filePicker.file.path;
    }
  }
  catch(e)
  {
    inforssDebug(e);
  }
  return filePath;
}

//-------------------------------------------------------------------------------------------------------------
function exportOpml()
{
  window.setTimeout(exportOpml1,0);
}

//-------------------------------------------------------------------------------------------------------------
function exportOpml1()
{
  try
  {
    document.getElementById("inforss.exportDeck").selectedIndex = 1;
    var filePath = selectFile(MODE_SAVE, document.getElementById("bundle_inforss").getString("inforss.opml.select.export"));
    if (filePath != null)
    {
	  var opmlFile = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
      opmlFile.initWithPath(filePath);
	  if (opmlFile.exists() == true)
	  {
		opmlFile.remove(true);
	  }
	  opmlFile.create(opmlFile.NORMAL_FILE_TYPE, 0666);
	  var stream = Components.classes['@mozilla.org/network/file-output-stream;1'].createInstance(Components.interfaces.nsIFileOutputStream);
      stream.init(opmlFile, 2, 0x200, false);
      var opmlAsStr = getOpmlAsString(stream);
//      var uConv = Components.classes['@mozilla.org/intl/utf8converterservice;1'].createInstance(Components.interfaces.nsIUTF8ConverterService);
//      opmlAsStr = uConv.convertStringToUTF8(opmlAsStr, "UTF-8", true);
//	  stream.write(opmlAsStr, opmlAsStr.length);
	  stream.flush();
	  stream.close();
	  alert(document.getElementById("bundle_inforss").getString("inforss.opml.saved"));
    }
  }
  catch(e)
  {
    inforssDebug(e);
  }
  document.getElementById("inforss.exportDeck").selectedIndex = 0;
  document.getElementById("exportProgressBar").value = 0;
}

//-------------------------------------------------------------------------------------------------------------
function getOpmlAsString(stream)
{
  var str = null;
  try
  {
    str =  '<?xml version="1.0" encoding="UTF-8"?>\n' +
	       '<opml version="1.0">\n' +
	       '  <head>\n' +
	       '    <title>InfoRSS Data</title>\n' +
	       '  </head>\n' +
	       '  <body>\n';
	stream.write(str, str.length);
    var items = RSSList.getElementsByTagName("RSS");
    var outline = null;
    var serializer = new XMLSerializer();
	for (var i=0; i<items.length; i++)
	{
	  if (items[i].getAttribute("type") != "group")
	  {
        document.getElementById("exportProgressBar").value = eval( (i * 100 /(items.length -1)));
	    outline = document.createElement("outline");
	    outline.setAttribute("type", items[i].getAttribute("type"));
	    outline.setAttribute("title", items[i].getAttribute("title"));
	    outline.setAttribute("xmlHome", items[i].getAttribute("link"));
	    outline.setAttribute("text", items[i].getAttribute("description"));
	    outline.setAttribute("xmlUrl", items[i].getAttribute("url"));
	    outline.setAttribute("user", items[i].getAttribute("user"));
	    outline.setAttribute("icon", items[i].getAttribute("icon"));
	    outline.setAttribute("selected", items[i].getAttribute("selected"));
	    outline.setAttribute("nbItem", items[i].getAttribute("nbItem"));
	    outline.setAttribute("lengthItem", items[i].getAttribute("lengthItem"));
	    outline.setAttribute("refresh", items[i].getAttribute("refresh"));
	    outline.setAttribute("filter", items[i].getAttribute("filter"));
	    outline.setAttribute("infoType", items[i].getAttribute("type"));
	    outline.setAttribute("filterPolicy", items[i].getAttribute("filterPolicy"));
	    outline.setAttribute("playPodcast", items[i].getAttribute("playPodcast"));
	    outline.setAttribute("browserHistory", items[i].getAttribute("browserHistory"));
	    outline.setAttribute("filterCaseSensitive", items[i].getAttribute("filterCaseSensitive"));
	    outline.setAttribute("activity", items[i].getAttribute("activity"));
	    outline.setAttribute("regexp", items[i].getAttribute("regexp"));
	    outline.setAttribute("regexpTitle", items[i].getAttribute("regexpTitle"));
	    outline.setAttribute("regexpDescription", items[i].getAttribute("regexpDescription"));
	    outline.setAttribute("regexpPubDate", items[i].getAttribute("regexpPubDate"));
	    outline.setAttribute("regexpLink", items[i].getAttribute("regexpLink"));
	    outline.setAttribute("regexpCategory", items[i].getAttribute("regexpCategory"));
	    outline.setAttribute("regexpStartAfter", items[i].getAttribute("regexpStartAfter"));
	    outline.setAttribute("regexpStopBefore", items[i].getAttribute("regexpStopBefore"));
	    outline.setAttribute("htmlDirection", items[i].getAttribute("htmlDirection"));
	    outline.setAttribute("htmlTest", items[i].getAttribute("htmlTest"));
	    outline.setAttribute("group", items[i].getAttribute("group"));
	    outline.setAttribute("groupAssociated", items[i].getAttribute("groupAssociated"));
	    outline.setAttribute("acknowledgeDate", items[i].getAttribute("acknowledgeDate"));

	    serializer.serializeToStream(outline, stream, "UTF-8");
	    stream.write("\n", "\n".length);
      }
    }
    str = '  </body>\n' +
          '</opml>';
	stream.write(str, str.length);
  }
  catch(e)
  {
    inforssDebug(e);
  }
  return str;
}

//-------------------------------------------------------------------------------------------------------------
function importOpml(mode, from)
{
  var keep = false;
  try
  {
    document.getElementById("inforss.import.deck").selectedIndex = 1;
    if (from == MODE_FILE)
    {
      var filePath = selectFile(MODE_OPEN, document.getElementById("bundle_inforss").getString("inforss.opml.select.import"));
      if (filePath != null)
      {
        var opmlAsStr = null;
	    var opmlFile = Components.classes['@mozilla.org/file/local;1'].createInstance(Components.interfaces.nsILocalFile);
        opmlFile.initWithPath(filePath);
	    if (opmlFile.exists() == true)
	    {
          var is = Components.classes["@mozilla.org/network/file-input-stream;1"].createInstance( Components.interfaces.nsIFileInputStream );
          is.init( opmlFile, 0x01, 00004, null);
          var sis = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance( Components.interfaces.nsIScriptableInputStream );
          sis.init( is );
          var opml = sis.read(-1);
          is.close();
          sis.close();
          var uConv = Components.classes['@mozilla.org/intl/utf8converterservice;1'].createInstance(Components.interfaces.nsIUTF8ConverterService);
          opml = uConv.convertStringToUTF8(opml, "UTF-8", true);
          keep = importOpmlFromText(opml, mode);
        }
      }
    }
    else
    {
      var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
      var url1 = { value: "http://www."};
      var valid  = promptService.prompt(window,document.getElementById("bundle_inforss").getString("inforss.import.url"),
                          document.getElementById("bundle_inforss").getString("inforss.import.url"),
                          url1, null, {value: null});
      var url = url1.value;
      if ((valid == true) && (url != null) && (url != ""))
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
        gRssXmlHttpRequest.setRequestHeader("User-Agent", "Mozilla/5.0");
        try
        {
          gRssXmlHttpRequest.send(null);
        }
        catch(e)
        {
        }
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
  catch(e)
  {
    inforssDebug(e);
  }
  if (keep == false)
  {
    restoreButton();
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
        node = gNewRssList.firstChild;
        while (node.firstChild != null)
        {
          node.removeChild(node.firstChild);
        }
      }
      var rss = null;
//  alert("domFile=" + domFile);
//  alert("format=" + inforssGetFormat(domFile));
//  var ser = new XMLSerializer();
//  alert(ser.serializeToString(domFile));

      if ((domFile != null) && (inforssGetFormat(domFile) == "opml"))
      {
        gItems = domFile.getElementsByTagName("outline");
        gIndex = 0;
        var id = "importProgressBar";
        window.setTimeout("opmlParseItems('" + id + "'," + mode + ")", 0);
        keep = true;
      }
      else
      {
        alert(document.getElementById("bundle_inforss").getString("inforss.opml.wrongFormat"));
      }
    }
  }
  catch(e)
  {
    inforssDebug(e);
  }
  return keep;
}

//-------------------------------------------------------------------------------------------------------------
function restoreButton()
{
  document.getElementById("inforss.import.deck").selectedIndex = 0;
  document.getElementById("importProgressBar").value = 0;
}

//-------------------------------------------------------------------------------------------------------------
function opmlParseItems(id, mode)
{
  inforssTraceIn();
  try
  {
    if (gIndex < gItems.length)
    {
// alert(gIndex);
      document.getElementById(id).value = eval( (gIndex * 100 /(gItems.length -1)));
      document.getElementById(id).focus();
      if (((gItems[gIndex].hasAttribute("type") == true) && (gItems[gIndex].getAttribute("type").toLowerCase() == "rss")) ||
           (gItems[gIndex].hasAttribute("xmlUrl") == true))
      {
// alert("ok");
        rss = gNewRssList.createElement("RSS");
        if (gItems[gIndex].hasAttribute("title") == true)
        {
          rss.setAttribute("title", gItems[gIndex].getAttribute("title"));
        }
        if (gItems[gIndex].hasAttribute("xmlHome") == true)
        {
          rss.setAttribute("link", gItems[gIndex].getAttribute("xmlHome"));
        }
        else
        {
          if (gItems[gIndex].hasAttribute("htmlurl") == true)
          {
            rss.setAttribute("link", gItems[gIndex].getAttribute("htmlurl"));
          }
        }
        if (gItems[gIndex].hasAttribute("text") == true)
        {
          rss.setAttribute("description", gItems[gIndex].getAttribute("text"));
        }
        else
        {
          if (gItems[gIndex].hasAttribute("title") == true)
          {
            rss.setAttribute("description", gItems[gIndex].getAttribute("title"));
          }
        }
        if (gItems[gIndex].hasAttribute("xmlUrl") == true)
        {
          rss.setAttribute("url", gItems[gIndex].getAttribute("xmlUrl"));
        }
        if (gItems[gIndex].hasAttribute("user") == true)
        {
          rss.setAttribute("user", gItems[gIndex].getAttribute("user"));
        }
        if (gItems[gIndex].hasAttribute("icon") == true)
        {
          rss.setAttribute("icon", gItems[gIndex].getAttribute("icon"));
        }
        if (gItems[gIndex].hasAttribute("selected") == true)
        {
          rss.setAttribute("selected", gItems[gIndex].getAttribute("selected"));
        }
        if (gItems[gIndex].hasAttribute("nbItem") == true)
        {
          rss.setAttribute("nbItem", gItems[gIndex].getAttribute("nbItem"));
        }
        if (gItems[gIndex].hasAttribute("lengthItem") == true)
        {
          rss.setAttribute("lengthItem", gItems[gIndex].getAttribute("lengthItem"));
        }
        if (gItems[gIndex].hasAttribute("refresh") == true)
        {
          rss.setAttribute("refresh", gItems[gIndex].getAttribute("refresh"));
        }
        if (gItems[gIndex].hasAttribute("filter") == true)
        {
          rss.setAttribute("filter", gItems[gIndex].getAttribute("filter"));
        }
        if (gItems[gIndex].hasAttribute("infoType") == true)
        {
          rss.setAttribute("type", gItems[gIndex].getAttribute("infoType"));
        }
        if (gItems[gIndex].hasAttribute("filterPolicy") == true)
        {
          rss.setAttribute("filterPolicy", gItems[gIndex].getAttribute("filterPolicy"));
        }
        if (gItems[gIndex].hasAttribute("playPodcast") == true)
        {
          rss.setAttribute("playPodcast", gItems[gIndex].getAttribute("playPodcast"));
        }
        if (gItems[gIndex].hasAttribute("browserHistory") == true)
        {
          rss.setAttribute("browserHistory", gItems[gIndex].getAttribute("browserHistory"));
        }
        if (gItems[gIndex].hasAttribute("filterCaseSensitive") == true)
        {
          rss.setAttribute("filterCaseSensitive", gItems[gIndex].getAttribute("filterCaseSensitive"));
        }
        if (gItems[gIndex].hasAttribute("activity") == true)
        {
          rss.setAttribute("activity", gItems[gIndex].getAttribute("activity"));
        }
        if (gItems[gIndex].hasAttribute("regexp") == true)
        {
          rss.setAttribute("regexp", gItems[gIndex].getAttribute("regexp"));
        }
        if (gItems[gIndex].hasAttribute("regexpTitle") == true)
        {
          rss.setAttribute("regexpTitle", gItems[gIndex].getAttribute("regexpTitle"));
        }
        if (gItems[gIndex].hasAttribute("regexpDescription") == true)
        {
          rss.setAttribute("regexpDescription", gItems[gIndex].getAttribute("regexpDescription"));
        }
        if (gItems[gIndex].hasAttribute("regexpPubDate") == true)
        {
          rss.setAttribute("regexpPubDate", gItems[gIndex].getAttribute("regexpPubDate"));
        }
        if (gItems[gIndex].hasAttribute("regexpLink") == true)
        {
          rss.setAttribute("regexpLink", gItems[gIndex].getAttribute("regexpLink"));
        }
        if (gItems[gIndex].hasAttribute("regexpCategory") == true)
        {
          rss.setAttribute("regexpCategory", gItems[gIndex].getAttribute("regexpCategory"));
        }
        if (gItems[gIndex].hasAttribute("regexpStartAfter") == true)
        {
          rss.setAttribute("regexpStartAfter", gItems[gIndex].getAttribute("regexpStartAfter"));
        }
        if (gItems[gIndex].hasAttribute("regexpStopBefore") == true)
        {
          rss.setAttribute("regexpStopBefore", gItems[gIndex].getAttribute("regexpStopBefore"));
        }
        if (gItems[gIndex].hasAttribute("htmlDirection") == true)
        {
          rss.setAttribute("htmlDirection", gItems[gIndex].getAttribute("htmlDirection"));
        }
        if (gItems[gIndex].hasAttribute("htmlTest") == true)
        {
          rss.setAttribute("htmlTest", gItems[gIndex].getAttribute("htmlTest"));
        }
        if (gItems[gIndex].hasAttribute("group") == true)
        {
          rss.setAttribute("group", gItems[gIndex].getAttribute("group"));
        }
        if (gItems[gIndex].hasAttribute("groupAssociated") == true)
        {
          rss.setAttribute("groupAssociated", gItems[gIndex].getAttribute("groupAssociated"));
        }
        if (gItems[gIndex].hasAttribute("acknowledgeDate") == true)
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
      window.setTimeout("opmlParseItems('" + id + "'," + mode + ")", 100);
    }
    else
    {
      RSSList = gNewRssList;
      inforssBackup();
      inforssSave();
      init();
      sendEventToMainWindow();
	  alert(document.getElementById("bundle_inforss").getString("inforss.opml.read"));
	  restoreButton();
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
  catch(e)
  {
    inforssDebug(e);
    gIndex++;
    window.setTimeout("opmlParseItems('" + id + "'," + mode + ")", 100);
  }
  inforssTraceOut();
}
