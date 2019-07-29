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
/* exported inforssCopyRemoteToLocal */
function inforssCopyRemoteToLocal(
  { protocol, server, directory, user, password },
  upload_callback,
  progress_callback = null)
{
  if (progress_callback == null)
  {
    progress_callback = () => {}; //eslint-disable-line
  }

  const path = inforss_get_remote_path(protocol,
                                       server,
                                       directory,
                                       user,
                                       password);
  progress_callback(25);

  //FIXME should use es7 in jshintrc but the version on codacy. sigh.
  /* jshint ignore:start */

  //FIXME Could do both these in //lel

  (async () =>
  {
    try
    {
      const files = [
        inforss.Config.get_filepath(),
        inforss.Headline_Cache.get_filepath()
      ];

      //This would make some sense as a for loop, creating two promises and
      //then await Promise.all
      const config_file = inforss.Config.get_filepath();
      const config_target = config_file.clone();
      config_target.leafName += ".new";
      let ftp = new inforssFTPDownload(config_target,
                                       path + config_file.leafName);
      progress_callback(50);
      await ftp.start();

      const cache_file = inforss.Headline_Cache.get_filepath();
      const cache_target = cache_file.clone();
      cache_target.leafName += ".new";
      ftp = new inforssFTPDownload(cache_target,
                                   path + cache_file.leafName);
      progress_callback(75);
      await ftp.start();

      //At this point, we rename both the orig file to <thing>.bak
      //and both the <thing>.new files to <thing>. This gives us the opportunity
      //to cancel (even if the UI currently doesn't)
      for (let file of files)
      {
        const backup = file.clone();
        backup.leafName += ".backup";
        if (backup.exists())
        {
          backup.remove(false);
        }
        file.renameTo(null, backup.leafName);
        const target = file.clone();
        target.leafName += ".new";
        target.renameTo(null, file.leafName);
      }

      const notifier = new inforss.Notifier();
      notifier.notify("chrome://global/skin/icons/alert-exclam.png",
                      inforss.get_string("synchronization"),
                      inforss.get_string("remote.success"));

      upload_callback(true);
    }
    catch (err)
    {
/**/console.log(err)
      inforss.alert(inforss.get_string("remote.error") + "\n" + err);

      //err. why don't we make this whole thing a promise
      upload_callback(false);
    }
  })();
  /* jshint ignore:end */
}

/** Constructs a File_Download object to download specified file from specified
 * directory on server
 *
 * @param {string} target - path to source file
 * @param {string} path - location from which to fetch file (as a url)
 */
function inforssFTPDownload(target, path)
{
  this._target = target;
  this._url = inforss.make_URI(path);
  this._scheme = this._url.scheme;
  this._resolve = null;
  this._reject = null;
  this._channel = null;
}

Object.assign(inforssFTPDownload.prototype, {

  /** Start the transfer
   *
   * @returns {Promise} - A promise which will resolve once the file is
   *                      transferred succesfully or be rejected if there was an
   *                      error.
   */
  start()
  {
    return new Promise((resolve, reject) =>
    {
      //These don't belong here
      const IoService = Components.classes[
        "@mozilla.org/network/io-service;1"].getService(
        Components.interfaces.nsIIOService);

      const ScriptSecurityManager = Components.classes[
        "@mozilla.org/scriptsecuritymanager;1"].getService(
        Components.interfaces.nsIScriptSecurityManager);

      const StreamLoader = Components.Constructor(
        "@mozilla.org/network/stream-loader;1",
        "nsIStreamLoader",
        "init"
      );

      this._resolve = resolve;
      this._reject = reject;
      this._channel = IoService.newChannelFromURI2(
        this._url,
        null,
        ScriptSecurityManager.getSystemPrincipal(),
        null,
        Components.interfaces.nsILoadInfo.SEC_FORCE_INHERIT_PRINCIPAL,
        Components.interfaces.nsIContentPolicy.TYPE_OTHER
      );


      //FIXME Why cant we get the data as it arrives and write it to the file
      const loader = new StreamLoader(this);
      this._channel.asyncOpen(loader, this._channel);
    });
  },

  cancel()
  {
    if (this._channel != null)
    {
      this._channel.cancel(Components.results.NS_BINDING_ABORTED);
    }
  },

  onStreamComplete(loader, ctxt, status, resultLength, result)
  {
    try
    {
      if (status != 0)
      {
        for (let key in Components.results)
        {
          if (Components.results[key] == status)
          {
            throw new Error(key);
          }
        }
        throw new Error("Bad status " + status);
      }

      //You can't do String.fromCharCode.apply as it can blow up the stack due
      //to the potentially huge number of arguments, so we iterate like this.
      //It seems messy TBH
      let data = "";
      while (result.length > 256 * 192)
      {
        data += String.fromCharCode.apply(null, result.splice(0, 256 * 192));
      }
      data += String.fromCharCode.apply(null, result);

      const FileOutputStream = Components.Constructor(
        "@mozilla.org/network/file-output-stream;1",
        "nsIFileOutputStream",
        "init");

      const outputStream = new FileOutputStream(this._target, -1, -1, 0);
      outputStream.write(data, data.length);
      outputStream.close();

      this._resolve();
    }
    catch (err)
    {
      inforss.debug(err);
      this._reject(err);
    }
  },

});

//-------------------------------------------------------------------------------------------------------------
/* exported inforssCopyLocalToRemote */
//FIXME I don't think either callback makes sense unless async
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

  //FIXME rewrite upload to be
  //source file -> full target path.
  (async () =>
  {
    try
    {
      let ftp = new inforss.File_Upload(
        inforss.Config.get_filepath(),
        path + inforss.Config.get_filepath().leafName
      );
      progress_callback(50);
      if (asyncFlag)
      {
        await ftp.start(asyncFlag);
      }
      else
      {
        ftp.start(asyncFlag);
      }

      ftp = new inforss.File_Upload(
        inforss.Headline_Cache.get_filepath(),
        path + inforss.Headline_Cache.get_filepath().leafName);
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
