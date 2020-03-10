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
// inforss_File_Upload
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------

/* jshint globalstrict: true */
/* eslint-disable strict */
"use strict";

/* eslint-disable array-bracket-newline */
/* exported EXPORTED_SYMBOLS */
const EXPORTED_SYMBOLS = [
  "File_Upload", /* exported File_Upload */
];
/* eslint-enable array-bracket-newline */


const { debug } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Debug.jsm",
  {}
);

const { make_URI } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Utils.jsm",
  {}
);

const FileInputStream = Components.Constructor(
  "@mozilla.org/network/file-input-stream;1",
  "nsIFileInputStream",
  "init");

const ScriptableInputStream = Components.Constructor(
  "@mozilla.org/scriptableinputstream;1",
  "nsIScriptableInputStream",
  "init");

const StringInputStream = Components.Constructor(
  "@mozilla.org/io/string-input-stream;1",
  "nsIStringInputStream",
  "setData");

const IoService = Components.classes[
  "@mozilla.org/network/io-service;1"].getService(
  Components.interfaces.nsIIOService);

const ScriptSecurityManager = Components.classes[
  "@mozilla.org/scriptsecuritymanager;1"].getService(
  Components.interfaces.nsIScriptSecurityManager);

//const { console } =
//  Components.utils.import("resource://gre/modules/Console.jsm", {});

/** Got an invalid status (probably not 200-299) back */
class Invalid_Stream_Status_Error extends Error
{
  /** constructor
   *
   * @param {nsIHttpChannel} channel - channel
   */
  constructor(channel)
  {
    super(channel.responseStatusText + "(" + channel.responseStatus + ")\n" +
            channel.originalURI.asciiSpec);
    this.channel = channel;
    this.type = this.constructor.name;
  }
}

/** Constructs a File_Upload object to upload specified file to specified
 * directory on server
 *
 * @class
 *
 * @param {string} source - path to source file
 * @param {string} path - location to store file (as a url)
 */
function File_Upload(source, path)
{
  this._source = source;
  this._url = make_URI(path);
  this._scheme = this._url.scheme;
  this._errorData = "";
  this._input_stream = null;
  this._resolve = null;
  this._reject = null;
  this._channel = null;
}

Object.assign(File_Upload.prototype, {

  /** Start the transfer
   *
   * @param {boolean} async_transfer - true if asynchronous transfer, false if
   *                                   synchronous
   *
   * @returns {Promise} - A promise which will resolve once the file is
   *                      transferred succesfully or be rejected if there was an
   *                      error.
   */
  start(async_transfer)
  {
    const promise = new Promise((resolve, reject) =>
    {
      this._resolve = resolve;
      this._reject = reject;

      //Create in input stream from the file.
      //This would be whole loads easier if I didn't have to do a sync version
      //of it, but unfortunately it's necessary so we can dump on shut down

      this._channel = IoService.newChannelFromURI2(
        this._url,
        null,
        ScriptSecurityManager.getSystemPrincipal(),
        null,
        Components.interfaces.nsILoadInfo.SEC_FORCE_INHERIT_PRINCIPAL,
        Components.interfaces.nsIContentPolicy.TYPE_OTHER
      ).QueryInterface(Components.interfaces.nsIUploadChannel);

      //It is unclear why I have to read this into a string to send to the
      //upload channel.
      const is = new FileInputStream(this._source, -1, -1, 0);
      const sis = new ScriptableInputStream(is);
      const text = sis.read(-1);
      sis.close();
      is.close();

      this._input_stream = new StringInputStream(text, text.length);

      try
      {
        this._channel.setUploadStream(this._input_stream,
                                      "text/xml; charset=UTF-8",
                                      -1);
        if (async_transfer)
        {
          this._channel.asyncOpen(this, null);
        }
        else
        {
          this._channel.open();
        }
      }
      catch (err)
      {
        //Close the input stream so as not to leave it hanging around till it's
        //garbage collected.
        this._input_stream.close();
        throw err;
      }
    });
    if (! async_transfer)
    {
      this.onStopRequest(this._channel, 0, this._channel.status);
    }
    return promise;
  },

  /** Placeholder because I *should* be able to cancel one of these */
  cancel()
  {
    if (this._channel != null)
    {
      this._channel.cancel(Components.results.NS_BINDING_ABORTED);
    }
  },

  /** Data has been received on a stream
   *
   * This only happens for http streams when trying to return some sort of
   * error information
   *
   * @param {nsiRequest} _channel - source of the data
   * @param {Object} _ctxt - context variable, always null
   * @param {nsIInputStream} input - stream on which data is available
   * @param {integer} _sourceOffset - number of bytes already sent
   * @param {integer} count - number of bytes to read
   */
  onDataAvailable(_channel, _ctxt, input, _sourceOffset, count)
  {
    const sis = new ScriptableInputStream(input);
    this._errorData += sis.read(count);
    sis.close();
  },

  /** System is about to start uploading data
   *
   * We completely ignore this call
   *
   * @param {nsiRequest} _channel - source of the data
   * @param {Object} _ctxt - context variable, always null
   */
  onStartRequest(_channel, _ctxt)
  {
    //Nothing to do
  },

  /** Method called when upload completes
   *
   * This only happens for http streams when trying to return some sort of
   * error information
   *
   * @param {nsiRequest} channel - source of the data
   * @param {Object} _ctxt - context variable, always null
   * @param {integer} status - error code
   */
  onStopRequest(channel, _ctxt, status)
  {
    try
    {
      if (this._scheme == "http" || this._scheme == "https")
      {
        channel = channel.QueryInterface(Components.interfaces.nsIHttpChannel);
        if (! channel.requestSucceeded)
        {
          throw new Invalid_Stream_Status_Error(channel);
        }
        if (this._errorData)
        {
          debug(this._errorData);
        }
      }
      if (status != 0)
      {
        for (const key in Components.results)
        {
          if (Components.results[key] == status)
          {
            throw new Error(key);
          }
        }
        throw new Error("Bad status " + status);
      }

      this._resolve();
    }
    catch (err)
    {
      this._reject(err);
    }
    finally
    {
      this._input_stream.close();
    }
  },
});
