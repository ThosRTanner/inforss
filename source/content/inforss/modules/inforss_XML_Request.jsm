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
// inforss_XML_Request
// Author : Tom Tanner 2020
//------------------------------------------------------------------------------
/* jshint globalstrict: true */
/* eslint-disable strict */
"use strict";

/* eslint-disable array-bracket-newline */
/* exported EXPORTED_SYMBOLS */
const EXPORTED_SYMBOLS = [
  "XML_Request" /* exported XML_Request */
];
/* eslint-enable array-bracket-newline */

const { event_binder } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Utils.jsm",
  {}
);

//I'd import these properly but I have to hack round palemoon maintainers really
//disliking the class construct
const { new_Fetch_Abort } = Components.utils.import(
  "chrome://inforss/content/errors/inforss_Fetch_Abort.jsm",
  {}
);

const { new_Fetch_Error } = Components.utils.import(
  "chrome://inforss/content/errors/inforss_Fetch_Error.jsm",
  {}
);

const { new_Fetch_Timeout } = Components.utils.import(
  "chrome://inforss/content/errors/inforss_Fetch_Timeout.jsm",
  {}
);

const { new_Invalid_Status_Error } = Components.utils.import(
  "chrome://inforss/content/errors/inforss_Invalid_Status_Error.jsm",
  {}
);

const Priv_XMLHttpRequest = Components.Constructor(
  "@mozilla.org/xmlextras/xmlhttprequest;1",
  "nsIXMLHttpRequest");

//const { console } =
//  Components.utils.import("resource://gre/modules/Console.jsm", {});

//FIXME Better documentation
/** This is a Promise wrapper round XMLHttpRequest
 * It uses Priv_XMLHttpRequest because this seems to work better for some sites.
 *
 * @param {Object} opts - options, please document
 * @param {string} opts.method - method for XMLHttpRequest
 * @param {string} opts.url - url to fetch
 * @param {string} opts.user - username
 * @param {string} opts.password - password
 * @param {Object} opts.params - what?
 * @param {Object} opts.headers - what?
 */
function XML_Request(opts)
{
  const xhr = new Priv_XMLHttpRequest();
  xhr.open(opts.method, opts.url, true, opts.user, opts.password);
  // We'll need to stringify if we've been given an object
  // If we have a string, this is skipped.
  let params = opts.params;
  if (params && typeof params === 'object')
  {
    params = Object.keys(params).map(
      key => encodeURIComponent(key) + '=' + encodeURIComponent(params[key])
    ).join('&');
  }
  this._params = params;
  xhr.onload = event_binder(this._on_load, this);
  xhr.onerror = event_binder(this._on_error, this);
  xhr.onabort = event_binder(this._on_abort, this);
  xhr.ontimeout = event_binder(this._on_timeout, this);
  if (opts.headers)
  {
    Object.keys(opts.headers).forEach(
      key => xhr.setRequestHeader(key, opts.headers[key])
    );
  }
  this._request = xhr;
}

XML_Request.prototype = {

  /** Returns a promise that will fulfill when the request is completed
   *
   * @returns {Promise} A promise. Duh.
   */
  fetch()
  {
    return new Promise(
      (resolve, reject) =>
      {
        this._resolve = resolve;
        this._reject = reject;
        this._request.send(this._params);
      }
    );
  },

  /** Abort the current request */
  abort()
  {
    this._request.abort();
  },

  /** Received a response
   *
   * @param {ProgressEvent} event - completed request
   */
  _on_load(event)
  {
    if (200 <= event.target.status && event.target.status < 300)
    {
      this._resolve(event.target.response);
    }
    else
    {
      this._reject(new_Invalid_Status_Error(event, this._url));
    }
  },

  /** Request got an error
   *
   * @param {ProgressEvent} event - errored request
   */
  _on_error(event)
  {
    this._reject(new_Fetch_Error(event, this._url));
  },

  /** Request was aborted
   *
   * @param {ProgressEvent} event - aborted request
   */
  _on_abort(event)
  {
    this._reject(new_Fetch_Abort(event, this._url));
  },

  /** Request timed out
   *
   * @param {ProgressEvent} event - timed out request
   */
  _on_timeout(event)
  {
    this._reject(new_Fetch_Timeout(event, this._url));
  },

};

