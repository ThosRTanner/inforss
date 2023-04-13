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

const { INFORSS_DEFAULT_FETCH_TIMEOUT } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Constants.jsm",
  {}
);

const { event_binder } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Utils.jsm",
  {}
);

const { read_password } = Components.utils.import(
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

/** This is a Promise wrapper round XMLHttpRequest
 * It uses Priv_XMLHttpRequest because this seems to work better for some sites.
 *
 * It also tracks redirects and flags if the chain involved a temporary redirect
 * somewhere.
 *
 * @param {Object} opts - options, please document
 * @param {string} opts.method - method (GET, PUT) for XMLHttpRequest
 * @param {string} opts.url - url to fetch
 * @param {string} opts.user - username
 * @param {string} opts.password - password
 * @param {Object} opts.params - extra parameters for XMLHttpRequest
 * @param {Object} opts.headers - extra request header fields
 * @param {string} opts.responsType - how to interpret response
 */
function XML_Request(opts)
{
  const xhr = new Priv_XMLHttpRequest();
  let user = opts.user;
  let password = opts.password;
  if (user === undefined)
  {
    user = null;
  }
  else if (user != null && password === undefined)
  {
    password = read_password(opts.url, user);
  }

  xhr.open(opts.method, opts.url, true, user, password);
  // We'll need to stringify if we've been given an object
  // If we have a string, this is skipped.
  let params = opts.params;
  if (params && typeof params === "object")
  {
    params = Object.keys(params).map(
      key => encodeURIComponent(key) + "=" + encodeURIComponent(params[key])
    ).join("&");
  }
  this._params = params;
  xhr.onload = event_binder(this._on_load, this);
  xhr.onerror = event_binder(this._on_error, this);
  xhr.onabort = event_binder(this._on_abort, this);
  xhr.timeout = INFORSS_DEFAULT_FETCH_TIMEOUT;
  xhr.ontimeout = event_binder(this._on_timeout, this);
  if (opts.headers)
  {
    Object.keys(opts.headers).forEach(
      key => xhr.setRequestHeader(key, opts.headers[key])
    );
  }
  if (opts.responseType)
  {
    xhr.responseType = opts.responseType;
  }
  xhr.channel.notificationCallbacks = this;
  this._temporary_redirect = false;
  this._request = xhr;
}

XML_Request.prototype = {

  /** Returns a promise that will fulfill when the request is completed
   *
   * @returns {Promise} A promise. Duh. Which resolves to the target.
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

  /** See if we had a temporary redirecton
   *
   * @returns {boolean} true if a temporary redirection (302/307) was received,
   *                    false otherwise.
   */
  get had_temporary_redirect()
  {
    return this._temporary_redirect;
  },

  /** Get the requested URL
   *
   * @returns {string} The URL that was actually requested
   */
  get requested_url()
  {
    return this._url;
  },

  /** Get the resolved URL
   *
   * If there was a temporary redirect this will be the requested url before
   * the temporary redirect. If all redirects were permanent, this will be
   * the URL that was actually fetched.
   *
   * @returns {string} The last safe-to-use URL?
   *
   */
  get resolved_url()
  {
    return this._temporary_redirect ?
      this._last_url :
      this._request.responseURL;
  },

  /** Get the response URL
   *
   * This is the URL you actually get. It may be the result of a temporary
   * redirect, so use with caution
   *
   * @returns {string} The actually fetched URL
   */
  get response_url()
  {
    return this._request.responseURL;
  },

  /** Received a response
   *
   * @param {ProgressEvent} event - completed request
   */
  _on_load(event)
  {
    if (200 <= event.target.status && event.target.status < 300)
    {
      this._resolve(event.target);
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

  /** get the interface.
   *
   * defined so we can plug this into the HTML request and pick up redirects
   *
   * @interface nsISupports
   *
   * @param {nsIIDRef} uuid - interface id
   *
   * @returns {Object} this if we support the interface, otherwise an exception
   *                  is thrown
   */
  getInterface(uuid)
  {
    return this.QueryInterface(uuid);
  },

  /** Called on redirect to permit/deny redirect.
   *
   * @interface nsIChannelEventSink
   *
   * We use it to log what sort of redirects happened.
   *
   * @param {nsiChannel} oldChannel - current data stream
   * @param {nsiChannel} _newChannel - new data stream
   * @param {integer} flags - bit flags indicating the redirect type
   * @param {nsIAsyncVerifyRedirectCallback} callback - function to call
   *        to indicate success (or optionally failure)
   */
  asyncOnChannelRedirect(oldChannel, _newChannel, flags, callback)
  {
    // eslint-disable-next-line no-bitwise
    if ((flags & callback.REDIRECT_TEMPORARY) != 0)
    {
      if (! this._temporary_redirect)
      {
        this._last_url = oldChannel.name;
        this._temporary_redirect = true;
      }
    }
    callback.onRedirectVerifyCallback(Components.results.NS_SUCCEEDED);
  },

  /** Return this object magicced into an appropriate interace.
   *
   * As we're faking an XPCOM interface, we need to provide this.
   *
   * @param {nsIIDRef} uuid - interface id
   *
   * @returns {Object} this if we support the interface, otherwise an exception
   *                  is thrown
   */
  QueryInterface(uuid)
  {
    if (uuid.equals(Components.interfaces.nsISupports) ||
        uuid.equals(Components.interfaces.nsIChannelEventSink))
    {
      return this;
    }
    throw Components.results.NS_NOINTERFACE;
  }

};
