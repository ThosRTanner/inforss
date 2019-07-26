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

Components.utils.import(
  "chrome://inforss/content/modules/inforss_File_Upload.jsm",
  inforss
);

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

//const IoService = Components.classes[
//  "@mozilla.org/network/io-service;1"].getService(
//  Components.interfaces.nsIIOService);

//const StringInputStream = Components.Constructor(
//  "@mozilla.org/io/string-input-stream;1",
//  "nsIStringInputStream",
//  "setData");

//const ScriptSecurityManager = Components.classes[
//  "@mozilla.org/scriptsecuritymanager;1"].getService(
//  Components.interfaces.nsIScriptSecurityManager);

///* globals inforssPriv_XMLHttpRequest */
/* globals inforssXMLRepository */
/* globals inforsssetImportProgressionBar */
var gInforssFTPDownload = null;

/** Got an invalid status (probably not 200-299) back */
/*
class Invalid_Stream_Status_Error extends Error
{
  /** constructor
   *
   * @param {nsIHttpChannel} channel - channel
   -/
  constructor(channel)
  {
    super(channel.responseStatusText + "(" + channel.responseStatus + ")\n" +
            channel.originalURI.asciiSpec);
    this.channel = channel;
    this.type = this.constructor.name;
  }
}
*/

/** Basically massages supplied URI parts into a URI
 *
 * @param {string} protocol - protocol (e.g. ftp://)
 * @param {string} server - sever name (e.g. mozilla.com)
 * @param {string} directory - directory name on server
 * @param {string} user - user name on server
 * @param {string} password - users password
 *
 * @returns {string} A URL for the directory
 */
function inforss_get_remote_path(protocol,
                                         server,
                                         directory,
                                         user,
                                         password)
{
  if (! directory.startsWith("/"))
  {
    directory = "/" + directory;
  }
  if (! directory.endsWith("/"))
  {
    directory += "/";
  }
  //FIXME If user is blank should we skip the <user>:password@ bit?
  return protocol + user + ":" + password + "@" + server + directory;
}

//-------------------------------------------------------------------------------------------------------------
//FIXME THe progress bar in this is hopelessly broken
/* exported inforssCopyRemoteToLocal */
function inforssCopyRemoteToLocal(protocol,
                                  server,
                                  directory,
                                  user,
                                  password,
                                  ftpDownloadCallback,
                                  progress_callback = null)
{
  if (progress_callback == null)
  {
    progress_callback = () => {}; //eslint-disable-line
  }

  var path = inforss_get_remote_path(protocol, server, directory, user,  password);
  var uri = inforss.make_URI(path + "inforss.xml");
  gInforssFTPDownload = new inforssFTPDownload();

  progress_callback(20);

  gInforssFTPDownload.start(uri, path, inforss_copied_config_from_remote, ftpDownloadCallback, progress_callback);
  progress_callback(30);
/**/console.log(arguments)
/*
//protocol = "http://";
//server = "localhost:8000";
//directory="http";
//asyncFlag = false;

  if (progress_callback == null)
  {
    progress_callback = () => {}; //eslint-disable-line
  }
  if (upload_callback == null)
  {
    upload_callback = () => {}; //eslint-disable-line
  }

  const path = inforss_get_remote_path(protocol,
                                       server,
                                       directory,
                                       user,
                                       password);
  progress_callback(25);
*/
  //FIXME should use es7 in jshintrc but the version on codacy. sigh.
  /* jshint ignore:start */
/*
  //FIXME Could do both these in //lel

  (async () =>
  {
    try
    {
      let ftp = new inforss.File_Upload(inforss.Config.get_filepath(), path);
      progress_callback(50);
      await ftp.start(asyncFlag);
      ftp = new inforss.File_Upload(inforss.Headline_Cache.get_filepath(),
                                    path);
      progress_callback(75);
      await ftp.start(asyncFlag);
      if (asyncFlag)
      {
        const notifier = new inforss.Notifier();
        notifier.notify("chrome://global/skin/icons/alert-exclam.png",
                        inforss.get_string("synchronization"),
                        inforss.get_string("remote.success"));
      }
      upload_callback(true);
    }
    catch (err)
    {
      if (asyncFlag)
      {
        inforss.alert(inforss.get_string("remote.error") + "\n" + err);
      }
      //err. why don't we make this whole thing a promise
      upload_callback(false);
    }
  })();
*/
  /* jshint ignore:end */
}

//-----------------------------------------------------------------------------------------------------
function inforss_copied_config_from_remote(step, status, path, callbackOriginal, progress_callback)
{
  try
  {
    if (step == "send")
    {
      callbackOriginal(step, status);
      progress_callback(40);
    }
    else
    {
      progress_callback(50);
      if (status != 0)
      {
        inforss.alert(inforss.get_string("remote.error") + " : " + status);
        callbackOriginal(step, status);
      }
      else
      {
/**/console.log("Got", gInforssFTPDownload.data)
//        inforssXMLRepository.load_from_string(gInforssFTPDownload.data);
//        inforssXMLRepository.save();
        var uri = inforss.make_URI(path + "inforss.rdf");
        progress_callback(50);
        gInforssFTPDownload.start(uri, path, inforss_copied_cache_from_remote, callbackOriginal, progress_callback);
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
function inforss_copied_cache_from_remote(step, status, path, callbackOriginal, progress_callback)
{
  try
  {
    progress_callback(60);
    if (step != "send")
    {
      if (status != 0)
      {
        inforss.alert(inforss.get_string("remote.error") + " : " + status);
      }
      else
      {
        progress_callback(70);
        var str = gInforssFTPDownload.data;

/**/console.log("Got", gInforssFTPDownload.data)
//        inforss.Headline_Cache.saveRDFFromString(str);
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
  _callbackOriginal: null,

  start(url, path, callback, callbackOriginal, progress_callback)
  {
    this._callback = callback;
    this._callbackOriginal = callbackOriginal;
    this._progress_callback = progress_callback;
    this._path = path;
    var returnValue = true;
    try
    {
      var ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
      this.streamLoader = Components.classes["@mozilla.org/network/stream-loader;1"].createInstance(Components.interfaces.nsIStreamLoader);
      this._channel = ioService.newChannelFromURI(url);
      this.streamLoader.init(this);
      this._channel.asyncOpen(this.streamLoader, this._channel);
      this._callback("send", null, path, callbackOriginal, progress_callback);
    }
    catch (e)
    {
      inforss.debug(e);
      returnValue = false;
    }
    return returnValue;
  },

  cancel()
  {
    if (this._channel)
    {
      this._channel.cancel(0x804b0002);
    }
  },

  onStreamComplete(loader, ctxt, status, resultLength, result)
  {
    this.data = "";
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
      this._callback("done", status, this._path, this._callbackOriginal, this._progress_callback);
    }
  },

};

//-------------------------------------------------------------------------------------------------------------
/* exported inforssCopyLocalToRemote */
function inforssCopyLocalToRemote(
  { protocol, server, directory, user, password },
  asyncFlag,
  upload_callback = null,
  progress_callback = null)
{
  if (progress_callback == null)
  {
    progress_callback = () => {}; //eslint-disable-line
  }
  if (upload_callback == null)
  {
    upload_callback = () => {}; //eslint-disable-line
  }

  const path = inforss_get_remote_path(protocol,
                                       server,
                                       directory,
                                       user,
                                       password);
  progress_callback(25);

  //FIXME should use es7 in jshintrc but the version on codacy. sigh.
  /* jshint ignore:start */

  //FIXME Could do both these in //lel (though progress bar would have to make
  //sure it didn't go backwards if rdf file was smaller than xml file)

  (async () =>
  {
    try
    {
      let ftp = new inforss.File_Upload(inforss.Config.get_filepath(), path);
      progress_callback(50);
      if (asyncFlag)
      {
        await ftp.start(asyncFlag);
      }
      else
      {
        ftp.start(asyncFlag);
      }

      ftp = new inforss.File_Upload(inforss.Headline_Cache.get_filepath(),
                                    path);
      progress_callback(75);
      if (asyncFlag)
      {
        await ftp.start(asyncFlag);
      }
      else
      {
        ftp.start(asyncFlag);
      }

      if (asyncFlag)
      {
        const notifier = new inforss.Notifier();
        notifier.notify("chrome://global/skin/icons/alert-exclam.png",
                        inforss.get_string("synchronization"),
                        inforss.get_string("remote.success"));
      }
      upload_callback(true);
    }
    catch (err)
    {
      if (asyncFlag)
      {
        inforss.alert(inforss.get_string("remote.error") + "\n" + err);
      }
      //err. why don't we make this whole thing a promise
      upload_callback(false);
    }
  })();

  /* jshint ignore:end */
}
