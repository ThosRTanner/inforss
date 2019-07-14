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
Components.utils.import("chrome://inforss/content/modules/inforss_Config.jsm",
                        inforss);

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

/* exported FileInputStream */
const FileInputStream = Components.Constructor(
  "@mozilla.org/network/file-input-stream;1",
  "nsIFileInputStream",
  "init");

///* exported UTF8Converter */
//const UTF8Converter = Components.Constructor(
//  "@mozilla.org/intl/utf8converterservice;1",
//  "nsIUTF8ConverterService");

/* exported ScriptableInputStream */
const ScriptableInputStream = Components.Constructor(
  "@mozilla.org/scriptableinputstream;1",
  "nsIScriptableInputStream",
  "init");

//const UnicodeConverter = Components.Constructor(
//  "@mozilla.org/intl/scriptableunicodeconverter",
//  "nsIScriptableUnicodeConverter");

const IoService = Components.classes["@mozilla.org/network/io-service;1"]
  .getService(Components.interfaces.nsIIOService);

const StringInputStream = Components.Constructor(
  "@mozilla.org/io/string-input-stream;1",
  "nsIStringInputStream",
  "setData");

/* globals inforssPriv_XMLHttpRequest */
/* globals inforssXMLRepository */
/* globals inforsssetImportProgressionBar */
var gInforssFTPDownload = null;

function inforss_create_remote_directory(protocol, server, directory, user, password)
{
  if (! directory.startsWith("/"))
  {
    directory = "/" + directory;
  }
  if (! directory.endsWith("/"))
  {
    directory += "/";
  }
  return protocol + user + ":" + password + "@" + server + directory;
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
  if (! directory.startsWith("/"))
  {
    directory = "/" + directory;
  }
  if (! directory.endsWith("/"))
  {
    directory = directory + "/";
  }
  var path = inforss_create_remote_directory(protocol, server, directory, user,  password);
  var uri = inforss.make_URI(path + "inforss.xml");
  gInforssFTPDownload = new inforssFTPDownload();

  if (typeof inforsssetImportProgressionBar != "undefined")
  {
    inforsssetImportProgressionBar(20);
  }
  gInforssFTPDownload.start(uri, path, inforss_copied_config_from_remote, ftpDownloadCallback);
}

//-----------------------------------------------------------------------------------------------------
function inforss_copied_config_from_remote(step, status, path, callbackOriginal)
{
  try
  {
    if (step == "send")
    {
      callbackOriginal(step, status);
      if (typeof inforsssetImportProgressionBar != "undefined")
      {
        inforsssetImportProgressionBar(40);
      }
    }
    else
    {
      if (typeof inforsssetImportProgressionBar != "undefined")
      {
        inforsssetImportProgressionBar(50);
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
        if (typeof inforsssetImportProgressionBar != "undefined")
        {
          inforsssetImportProgressionBar(50);
        }
        gInforssFTPDownload.start(uri, path, inforss_copied_cache_from_remote, callbackOriginal);
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
function inforss_copied_cache_from_remote(step, status, path, callbackOriginal)
{
  try
  {
    if (typeof inforsssetImportProgressionBar != "undefined")
    {
      inforsssetImportProgressionBar(60);
    }
    if (step != "send")
    {
      if (status != 0)
      {
        inforss.alert(inforss.get_string("remote.error") + " : " + status);
      }
      else
      {
        if (typeof inforsssetImportProgressionBar != "undefined")
        {
          inforsssetImportProgressionBar(70);
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
function inforssCopyLocalToRemote(protocol, server, directory, user, password, ftpUploadCallback, asyncFlag, progress_callback = null)
{
/**/console.log(arguments)
  try
  {
    if (progress_callback == null)
    {
/**/console.log("eek")
      progress_callback = () => {};
    }
    if (ftpUploadCallback == null)
    {
      ftpUploadCallback = () => {};
    }

    var path = inforss_create_remote_directory(protocol, server, directory, user,  password);
    progress_callback(40);
    let thing = new inforssFTPUpload(
      inforss.Config.get_filepath(),
      progress_callback,
      path);
    thing.start(inforss_config_copied_to_remote, ftpUploadCallback, asyncFlag);
    /* This is going to be a lot easier with promises */
    /*
    (async () => {
      try
      {
        let ftp = new inforss_FTP_Upload(inforss.Config.get_filepath(), path);
        progress_callback(60);
        ftpUploadCallback(started);
        await ftp.start(asyncFlag);
        ftp = new inforss_FTP_Upload(inforss.Headline_Cache.get_filepath(),
                                     path);
        progress_callback(80);
        await ftp.start(asyncFlag);
        ftpUploadCallback(done)
      }
      catch (e)
      {
        inforss.alert(inforss.get_string("remote.error"));
        //err. why don't we make this whole thing a promise
        ftpUploadCallback(failed);
      }
    })();
    */
  }
  catch (e)
  {
    inforss.debug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function inforss_config_copied_to_remote(step, status, path, callbackOriginal, asyncFlag, progress_callback)
{
  try
  {
    if (step == "send")
    {
      this._progress_callback(60);
      callbackOriginal(step, status);
    }
    else
    {
      if (status != 0)
      {
        inforss.alert(inforss.get_string("remote.error") + " : " + status);
        callbackOriginal(step, status);
      }
      else
      {
        let thing = new inforssFTPUpload(
          inforss.Headline_Cache.get_filepath(),
          progress_callback,
          path);
        thing.start(inforss_cache_copied_to_remote, callbackOriginal, asyncFlag);
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
function inforss_cache_copied_to_remote(step, status, path, callbackOriginal, asyncFlag, progress_callback)
{
  try
  {
    if (step != "send")
    {
      progress_callback(80);
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
      callbackOriginal(step, status);
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
}

//-------------------------------------------------------------------------------------------------------------
function inforssFTPUpload(source, progress_callback, path)
{
  this._source = source;
  this._path = path;
  this._url = inforss.make_URI(path + source.leafName);
  this._scheme = this._url.scheme;
/**/console.log("path", path, "source", source, source.leafName, this._url)
  this._progress_callback = progress_callback;
  this._callback = null;
  this._callbackOriginal = null;
  this._errorData = "";
  this._input_stream = null;
  this._asyncFlag = null;
}


Object.assign(inforssFTPUpload.prototype, {

  //FIXME The result of this is completely ignored
  //FIXME Passing a string? why not a file?

  start(callback, callbackOriginal, asyncFlag)
  {
    var returnValue = false;
/**/console.log("upload start", this, arguments)

    try
    {
      this._asyncFlag = asyncFlag;
      this._callback = callback;
      this._callbackOriginal = callbackOriginal;

      //Create in input stream from the file.
      //This would be whole loads easier if I didn't have to do a sync version
      //of it, but unfortunately it's necessary so we can dump on shut down

      //It is unclear why I have to read this into a string to send to the
      //upload channel.
      const is = new FileInputStream(this._source, -1, -1, 0);
      const sis = new ScriptableInputStream(is);
      const text = sis.read(-1);
      sis.close();
      is.close();

      this._input_stream = new StringInputStream(text, text.length);
      const channel = IoService.newChannelFromURI(this._url)
        .QueryInterface(Components.interfaces.nsIUploadChannel);

      channel.setUploadStream(this._input_stream, "text/xml; charset=UTF-8", -1);

      if (asyncFlag)
      {
        channel.asyncOpen(this, null);
        this._callback("send", null, null, callbackOriginal, asyncFlag, this._progress_callback);
      }
      else
      {
        channel.open();
        this._input_stream.close();
        this._callback("done", 0, path, callbackOriginal, asyncFlag, this._progress_callback);
      }
      returnValue = true;
    }
    catch (e)
    {
      inforss.debug(e);
    }
    return returnValue;
  },

  cancel()
  {
    //FIXME Why is this here?
  },

  onDataAvailable(channel, ctxt, input, sourceOffset, count)
  {
/**/console.log("avail", this, channel, ctxt, input, sourceOffset, count)
    //If you come through here we're very probably badly broken
    //firstly it's an http request
    //which has apparently had an error.
    const sis = new ScriptableInputStream(input);
    this._errorData += sis.read(count);
    sis.close();
    input.close();
    this._input_stream.close();
  },

  onStartRequest(channel, ctxt)
  {
/**/console.log("start", this, channel, ctxt)
  },

  onStopRequest(channel, ctxt, status)
  {
/**/console.log("stop", this, channel, ctxt, status)
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
      this._input_stream.close();
      this._callback("done", status, this._path, this._callbackOriginal, this._asyncFlag, this._progress_callback);
    }
    catch (e)
    {
      this._input_stream.close();
      inforss.debug(e);
    }
  },
});

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
      if (typeof inforsssetImportProgressionBar != "undefined")
      {
        inforsssetImportProgressionBar(30);
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
