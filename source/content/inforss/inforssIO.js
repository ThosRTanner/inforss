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
// inforssIO
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------

/*jshint browser: true, devel: true */
/*eslint-env browser */

var inforss = inforss || {};
Components.utils.import("chrome://inforss/content/modules/inforss_Debug.jsm",
                        inforss);

Components.utils.import("chrome://inforss/content/modules/inforss_Notifier.jsm",
                        inforss);

Components.utils.import("chrome://inforss/content/modules/inforss_Prompt.jsm",
                        inforss);

Components.utils.import("chrome://inforss/content/modules/inforss_Utils.jsm",
                        inforss);

Components.utils.import(
  "chrome://inforss/content/modules/inforss_Headline_Cache.jsm",
  inforss);

/* globals Priv_XMLHttpRequest */
/* globals inforssXMLRepository */
/* globals setImportProgressionBar */
/* globals INFORSS_DEFAULT_ICO */
var gInforssFTPDownload = null;

const INFORSS_DEFAULT_ICO = "chrome://inforss/skin/default.ico";

//-------------------------------------------------------------------------------------------------------------
/* exported inforssFindIcon */
function inforssFindIcon(rss)
{
  try
  {
    //Get the web page
    var url = rss.getAttribute("link");
    var xmlHttpRequest = new Priv_XMLHttpRequest();
    xmlHttpRequest.open("GET", url, false, rss.getAttribute("user"), inforss.read_password(url, rss.getAttribute("user")));
    xmlHttpRequest.send();
    //Now read the HTML into a doc object
    var doc = document.implementation.createHTMLDocument("");
    doc.documentElement.innerHTML = xmlHttpRequest.responseText;
    //Now find the favicon. Per what spec I can find, it is the last specified
    //<link rel="xxx"> and if there isn't any of those, use favicon.ico in the
    //root of the site.
    var favicon = "/favicon.ico";
    for (var node of doc.head.getElementsByTagName("link"))
    {
      //There is at least one website that uses 'SHORTCUT ICON'
      var rel = node.getAttribute("rel").toLowerCase();
      if (rel == "icon" || rel == "shortcut icon")
      {
        favicon = node.getAttribute("href");
      }
    }
    //Now make the full URL. If it starts with '/', it's relative to the site.
    //If it starts with (.*:)// it's a url. I assume you fill in the missing
    //protocol with however you got the page.
    url = xmlHttpRequest.responseURL;
    if (favicon.startsWith("//"))
    {
      favicon = url.split(":")[0] + ':' + favicon;
    }
    if (!favicon.includes("://"))
    {
      if (favicon.startsWith("/"))
      {
        var arr = url.split("/");
        favicon = arr[0] + "//" + arr[2] + favicon;
      }
      else
      {
        favicon = url + (url.endsWith("/") ? "" : "/") + favicon;
      }
    }
    //Now we see if it actually exists and isn't null, because null ones are
    //just evil.
    xmlHttpRequest = new Priv_XMLHttpRequest();
    xmlHttpRequest.open("GET", favicon, false, rss.getAttribute("user"), inforss.read_password(url, rss.getAttribute("user")));
    xmlHttpRequest.send();
    if (xmlHttpRequest.status != 404 && xmlHttpRequest.responseText.length != 0)
    {
      return favicon;
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
  return INFORSS_DEFAULT_ICO;
}

//-------------------------------------------------------------------------------------------------------------
/* exported inforssCopyRemoteToLocal */
function inforssCopyRemoteToLocal(protocol,
                                  server,
                                  directory,
                                  user,
                                  password,
                                  ftpDownloadCallback)
{
  if (directory.match(/^\/.*/) == null)
  {
    directory = "/" + directory;
  }
  if (directory.match(/^.*\/$/) == null)
  {
    directory = directory + "/";
  }
  var path = protocol + user + ":" + password + "@" + server + directory;
  var uri = inforss.make_URI(path + "inforss.xml");
  gInforssFTPDownload = new inforssFTPDownload();

  if (typeof setImportProgressionBar != "undefined")
  {
    setImportProgressionBar(20);
  }
  gInforssFTPDownload.start(uri, path, inforssCopyRemoteToLocalCallback, ftpDownloadCallback);
}

//-----------------------------------------------------------------------------------------------------
function inforssCopyRemoteToLocalCallback(step, status, path, callbackOriginal)
{
  try
  {
    if (step == "send")
    {
      callbackOriginal(step, status);
      if (typeof setImportProgressionBar != "undefined")
      {
        setImportProgressionBar(40);
      }
    }
    else
    {
      if (typeof setImportProgressionBar != "undefined")
      {
        setImportProgressionBar(50);
      }
      if (status != 0)
      {
        inforss.alert(inforss.get_string("remote.error") + " : " + status);
        callbackOriginal(step, status);
      }
      else
      {
        inforssXMLRepository.load_from_string(gInforssFTPDownload.data);
        inforssXMLRepository.save();
        var uri = inforss.make_URI(path + "inforss.rdf");
        if (typeof setImportProgressionBar != "undefined")
        {
          setImportProgressionBar(50);
        }
        gInforssFTPDownload.start(uri, path, inforssCopyRemoteToLocal1Callback, callbackOriginal);
      }
    }
  }
  catch (e)
  {
    inforss.debug(e);
    callbackOriginal(-1, null);
  }
}

//-----------------------------------------------------------------------------------------------------
function inforssCopyRemoteToLocal1Callback(step, status, path, callbackOriginal)
{
  try
  {
    if (typeof setImportProgressionBar != "undefined")
    {
      setImportProgressionBar(60);
    }
    if (step != "send")
    {
      if (status != 0)
      {
        inforss.alert(inforss.get_string("remote.error") + " : " + status);
      }
      else
      {
        if (typeof setImportProgressionBar != "undefined")
        {
          setImportProgressionBar(70);
        }
        var str = gInforssFTPDownload.data;

        inforss.Headline_Cache.saveRDFFromString(str);
        var notifier = new inforss.Notifier();
        notifier.notify("chrome://global/skin/icons/alert-exclam.png",
          inforss.get_string("synchronization"),
          inforss.get_string("remote.success"));
      }
      callbackOriginal(step, status);
      gInforssFTPDownload = null;
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
}

//-------------------------------------------------------------------------------------------------------------
/* exported inforssCopyLocalToRemote */
function inforssCopyLocalToRemote(protocol, server, directory, user, password, ftpUploadCallback, asyncFlag)
{
  try
  {
    var str = inforssXMLRepository.to_string();
    var contentType = "application/octet-stream";
    contentType = "text/xml; charset=UTF-8";

    if (directory.match(/^\/.*/) == null)
    {
      directory = "/" + directory;
    }
    if (directory.match(/^.*\/$/) == null)
    {
      directory = directory + "/";
    }
    var path = protocol + user + ":" + password + "@" + server + directory;
    var uri = inforss.make_URI(path + "inforss.xml");
    if (typeof setImportProgressionBar != "undefined")
    {
      setImportProgressionBar(40);
    }
    inforssFTPUpload.start(str, uri, contentType, path, inforssCopyLocalToRemoteCallback, ftpUploadCallback, asyncFlag);
  }
  catch (e)
  {
    inforss.debug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function inforssCopyLocalToRemoteCallback(step, status, path, callbackOriginal, asyncFlag)
{
  try
  {
    if (step == "send")
    {
      if (typeof setImportProgressionBar != "undefined")
      {
        setImportProgressionBar(60);
      }
      if (callbackOriginal != null)
      {
        callbackOriginal(step, status);
      }
    }
    else
    {
      if (status != 0)
      {
        inforss.alert(inforss.get_string("remote.error") + " : " + status);
        if (callbackOriginal != null)
        {
          callbackOriginal(step, status);
        }
      }
      else
      {
        var str = inforss.Headline_Cache.getRDFAsString();
        var contentType = "application/octet-stream";
        contentType = "text/xml; charset=UTF-8";

        var uri = inforss.make_URI(path + "inforss.rdf");
        inforssFTPUpload.start(str, uri, contentType, path, inforssCopyLocalToRemote1Callback, callbackOriginal, asyncFlag);
      }
    }
  }
  catch (e)
  {
    inforss.debug(e);
    if (callbackOriginal != null)
    {
      callbackOriginal(-1, null);
    }
  }
}

//-----------------------------------------------------------------------------------------------------
function inforssCopyLocalToRemote1Callback(step, status, path, callbackOriginal, asyncFlag)
{
  try
  {
    if (step != "send")
    {
      if (typeof setImportProgressionBar != "undefined")
      {
        setImportProgressionBar(80);
      }
      if (asyncFlag)
      {
        if (status != 0)
        {
          inforss.alert(inforss.get_string("remote.error") + " : " + status);
        }
        else
        {
          var notifier = new inforss.Notifier();
          notifier.notify("chrome://global/skin/icons/alert-exclam.png",
            inforss.get_string("synchronization"),
            inforss.get_string("remote.success"));
        }
      }
      if (callbackOriginal != null)
      {
        callbackOriginal(step, status);
      }
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
}

//-------------------------------------------------------------------------------------------------------------
var inforssFTPUpload = {
  _channel: null,
  _callback: null,
  _callbackOriginal: null,
  _data: "",
  _scheme: "",
  _errorData: "",
  _path: null,
  _inputStream: null,
  _asyncFlag: null,

  start: function(text, url, contentType, path, callback, callbackOriginal, asyncFlag)
  {
    var returnValue = false;
    try
    {
      this._asyncFlag = asyncFlag;
      this._callback = callback;
      this._callbackOriginal = callbackOriginal;
      this._path = path;
      this._scheme = url.scheme;
      var ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
      //      this._channel = ioService.newChannelFromURI(url).QueryInterface(Components.interfaces.nsIUploadChannel);
      var channel = ioService.newChannelFromURI(url).QueryInterface(Components.interfaces.nsIUploadChannel);
      this._inputStream = Components.classes["@mozilla.org/io/string-input-stream;1"].createInstance(Components.interfaces.nsIStringInputStream);

      var unicodeConverter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
      unicodeConverter.charset = "UTF-8";
      text = unicodeConverter.ConvertFromUnicode(text) + unicodeConverter.Finish();

      this._inputStream.setData(text, -1);
      channel.setUploadStream(this._inputStream, contentType, -1);
      if (asyncFlag)
      {
        channel.asyncOpen(this, null);
        this._callback("send", null, null, callbackOriginal, asyncFlag);
      }
      else
      {
        channel.open();
        this._inputStream.close();
        this._callback("done", 0, path, callbackOriginal, asyncFlag);
      }
      this._data = text;
      returnValue = true;
    }
    catch (e)
    {
      inforss.debug(e);
    }
    return returnValue;
  },

  cancel: function() {},

  onDataAvailable: function(channel, ctxt, input, sourceOffset, count)
  {
    const sis = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance(Components.interfaces.nsIScriptableInputStream);
    sis.init(input);
    this._errorData += sis.read(count);
    this._inputStream.close();
  },

  onStartRequest: function(/*channel, ctxt*/) {},

  onStopRequest: function(channel, ctxt, status)
  {
    try
    {
      if (this._scheme != "ftp")
      {
        var res = 0;
        try
        {
          res = channel.QueryInterface(Components.interfaces.nsIHttpChannel).responseStatus;
        }
        catch (e)
        {}
        if ((res == 200) || (res == 201) || (res == 204))
        {
          status = 0;
        }
        /*
          200:OK
          201:Created
          204:No Content
          This is an uploading channel, no need to "GET" the file contents.
        */
        if (this._errorData)
        {
          status = res;
        }

        if ((this._errorData) && (res == 200))
        {
          inforss.debug(this._errorData);
        }
      }
      this._inputStream.close();
      this._data = null;
      if (this._callback != null)
      {
        this._callback("done", status, this._path, this._callbackOriginal, this._asyncFlag);
      }
    }
    catch (e)
    {
      inforss.debug(e);
    }
  }
};

//-------------------------------------------------------------------------------------------------------------
function inforssFTPDownload()
{
  return this;
}

inforssFTPDownload.prototype = {
  _channel: null,
  streamLoader: null,
  data: null,
  length: null,

  _path: null,
  _callback: null,
  _startTime: 0,
  _endTime: 0,
  _callbackOriginal: null,

  start: function(url, path, callback, callbackOriginal)
  {
    this._callback = callback;
    this._callbackOriginal = callbackOriginal;
    this._path = path;
    var returnValue = true;
    try
    {
      var appInfo = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo);
      var isOnBranch = appInfo.platformVersion.indexOf("1.8") == 0;
      var ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
      this.streamLoader = Components.classes["@mozilla.org/network/stream-loader;1"].createInstance(Components.interfaces.nsIStreamLoader);
      this._channel = ioService.newChannelFromURI(url);
      if (isOnBranch)
      {
        this.streamLoader.init(this._channel, this, null);
      }
      else
      {
        this.streamLoader.init(this);
        this._channel.asyncOpen(this.streamLoader, this._channel);
      }
      this._startTime = new Date().getTime();
      this._callback("send", null, path, callbackOriginal);
      if (typeof setImportProgressionBar != "undefined")
      {
        setImportProgressionBar(30);
      }
    }
    catch (e)
    {
      inforss.debug(e);
      returnValue = false;
    }
    return returnValue;
  },

  cancel: function()
  {
    if (this._channel)
    {
      this._channel.cancel(0x804b0002);
    }
  },

  onStreamComplete: function(loader, ctxt, status, resultLength, result)
  {
    this.data = "";
    this._endTime = new Date().getTime();
    if (status == 0)
    {
      this.length = resultLength;
      if (typeof(result) == "string")
      {
        this.data = result;
      }
      else
      {
        while (result.length > (256 * 192))
        {
          this.data += String.fromCharCode.apply(this, result.splice(0, 256 * 192));
        }
        this.data += String.fromCharCode.apply(this, result);
      }
    }

    if (this._callback != null)
    {
      this._callback("done", status, this._path, this._callbackOriginal);
    }
  },

};
