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
// inforss_File_Download
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------

/* jshint globalstrict: true */
/* eslint-disable strict */
"use strict";

/* eslint-disable array-bracket-newline */
/* exported EXPORTED_SYMBOLS */
const EXPORTED_SYMBOLS = [
  "File_Download", /* exported File_Download */
];
/* eslint-enable array-bracket-newline */

const { make_URI } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Utils.jsm",
  {}
);

const FileOutputStream = Components.Constructor(
  "@mozilla.org/network/file-output-stream;1",
  "nsIFileOutputStream",
  "init");

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

/** Constructs a File_Download object to download specified file from specified
 * directory on server
 *
 * @param {string} target - path to source file
 * @param {string} path - location from which to fetch file (as a url)
 */
function File_Download(target, path)
{
  this._target = target;
  this._url = make_URI(path);
  this._scheme = this._url.scheme;
  this._resolve = null;
  this._reject = null;
  this._channel = null;
}

Object.assign(File_Download.prototype, {

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

  /** Cancel the transfer
   *
   * Calling this will cause the transfer to error
   */
  cancel()
  {
    if (this._channel != null)
    {
      this._channel.cancel(Components.results.NS_BINDING_ABORTED);
    }
  },

  /** Stream complete callback
   *
   * @param {nsiChannel} _loader - underlying channel
   * @param {Object} _ctxt - user supplied context
   * @param {integer} status - 0 if OK
   * @param {integer} _resultLength - length of result
   * @param {Array<integer>} result - integer array of characters
   */
  onStreamComplete(_loader, _ctxt, status, _resultLength, result)
  {
    try
    {
      if (status != 0)
      {
        for (const key in Components.results)
        {
          if (status == Components.results[key])
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

      const outputStream = new FileOutputStream(this._target, -1, -1, 0);
      outputStream.write(data, data.length);
      outputStream.close();

      this._resolve();
    }
    catch (err)
    {
      this._reject(err);
    }
  },

});
