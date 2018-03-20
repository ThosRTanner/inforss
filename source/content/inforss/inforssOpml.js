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
/* globals inforss */
Components.utils.import("chrome://inforss/content/modules/inforssDebug.jsm");

Components.utils.import("chrome://inforss/content/modules/inforssPrompt.jsm", inforss);


/* global inforssXMLRepository */
/* global currentRSS: true */
/* global resetFilter */

const OPML_FILENAME = "inforss.opml";
const MODE_OPEN = 0;
const MODE_SAVE = 1;
const MODE_FILE = 0;
const MODE_URL = 1;

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
    inforss.debug(e);
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
      inforssXMLRepository.export_to_OPML(filePath, function(current, max)
      {
        document.getElementById("exportProgressBar").value = current * 100 / max;
      }).then(function()
      {
        inforss.alert(bundle.getString("inforss.opml.saved"));
      }).catch(function(e)
      {
        inforss.alert(e);
      }).then(function()
      {
        document.getElementById("inforss.exportDeck").selectedIndex = 0;
      });
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
}

//------------------------------------------------------------------------------
/* global LocalFile */
/* global FileInputStream */
/* global ScriptableInputStream */
/* global UTF8Converter */

const PromptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);

function xml_request(opts)
{
  return new Promise(function(resolve, reject)
  {
    var xhr = new XMLHttpRequest();
    xhr.open(opts.method, opts.url, true, opts.user, opts.password);
    xhr.onload = function()
    {
      if (this.status == 200)
      {
        resolve(xhr.response);
      }
      else
      {
        reject(
        {
          status: this.status,
          statusText: xhr.statusText
        });
      }
    };
    xhr.onerror = function()
    {
      reject(
      {
        status: this.status,
        statusText: xhr.statusText
      });
    };
    if (opts.headers)
    {
      Object.keys(opts.headers).forEach(function(key)
      {
        xhr.setRequestHeader(key, opts.headers[key]);
      });
    }
    var params = opts.params;
    // We'll need to stringify if we've been given an object
    // If we have a string, this is skipped.
    if (params && typeof params === 'object')
    {
      params = Object.keys(params).map(function(key)
      {
        return encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
      }).join('&');
    }
    xhr.send(params);
  });
}

/* exported importOpml */
function importOpml(mode, from)
{
  let clear = true;
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
          //FIXME Why would you convert utf-8 to utf-8?
          let uConv = new UTF8Converter();
          opml = uConv.convertStringToUTF8(opml, "UTF-8", true);
          importOpmlFromText(opml, mode);
          clear = false;
        }
      }
    }
    else
    {
      var url1 = {
        value: "http://www."
      };
      var valid = PromptService.prompt(window, document.getElementById("bundle_inforss").getString("inforss.import.url"),
        document.getElementById("bundle_inforss").getString("inforss.import.url"),
        url1, null,
        {
          value: null
        });
      //sample url: http://hosting.opml.org/dave/spec/subscriptionList.opml
      //see also http://scripting.com/2017/02/10/theAclusFeeds.html
      var url = url1.value;
      if (valid && url != null && url != "")
      {
        if (!url.includes("://"))
        {
          url = "http://" + url;
        }
        //Start of a HTTP request. FIXME: We really need to make this die
        //cleanly on window close.
        //FIXME: Set the deck to select a swirly bar
        var req = xml_request(
        {
          method: "GET",
          url: url
        });
        req.then(function(resp)
        {
          importOpmlFromText(resp, mode);
        }, function( /*err*/ )
        {
          inforss.alert(document.getElementById("bundle_inforss").getString("inforss.feed.issue"));
          document.getElementById("inforss.import.deck").selectedIndex = 0;
        });
        clear = false;
      }
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
  if (clear)
  {
    document.getElementById("inforss.import.deck").selectedIndex = 0;
  }
}

//------------------------------------------------------------------------------
//make this inline
function progress(current, max)
{
  document.getElementById("importProgressBar").value = current * 100 / max;
}

function importOpmlFromText(text, mode)
{
  try
  {
    let sequence = inforssXMLRepository.import_from_OPML(text, mode, progress);
    if (sequence == null)
    {
      inforss.alert(document.getElementById("bundle_inforss").getString("inforss.opml.wrongFormat"));
      document.getElementById("inforss.import.deck").selectedIndex = 0;
      return;
    }
    sequence.then(function(count)
    {
      inforss.alert(document.getElementById("bundle_inforss").getString("inforss.opml.read"));
      /* This is all commented out as it seems to result in megadeath, or at
         least continual spewing of errors. Though having seen what happens on
         delete, it may just be that things don't get set up properly on import
         In any case, I think this should operator on the current and not save
         the updates till you click 'ok'
      sendEventToMainWindow();
      load_and_display_configuration(); //from inforssOption::
      if (count != 0)
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
      */
    }).catch(function(e)
    {
      console.log(e);
      inforss.alert(e);
    }).then(function()
    {
      document.getElementById("inforss.import.deck").selectedIndex = 0;
    });
  }
  catch (e)
  {
    inforss.debug(e);
    document.getElementById("inforss.import.deck").selectedIndex = 0;
  }
}
