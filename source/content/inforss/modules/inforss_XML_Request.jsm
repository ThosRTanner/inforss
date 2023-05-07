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
  "XML_Request"
];
/* eslint-enable array-bracket-newline */

const { event_binder } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Utils.jsm", {}
);

const { read_password } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Utils.jsm", {}
);

//I'd import these properly but I have to hack round palemoon maintainers really
//disliking the class construct
const { new_Fetch_Abort } = Components.utils.import(
  "chrome://inforss/content/errors/inforss_Fetch_Abort.jsm", {}
);

const { new_Fetch_Error } = Components.utils.import(
  "chrome://inforss/content/errors/inforss_Fetch_Error.jsm", {}
);

const { new_Fetch_Timeout } = Components.utils.import(
  "chrome://inforss/content/errors/inforss_Fetch_Timeout.jsm", {}
);

const { new_Invalid_Status_Error } = Components.utils.import(
  "chrome://inforss/content/errors/inforss_Invalid_Status_Error.jsm", {}
);

const Priv_XMLHttpRequest = Components.Constructor(
  "@mozilla.org/xmlextras/xmlhttprequest;1", "nsIXMLHttpRequest"
);

const { XPCOMUtils } = Components.utils.import(
  "resource://gre/modules/XPCOMUtils.jsm", {}
);

//const { console } =
//  Components.utils.import("resource://gre/modules/Console.jsm", {});

/* Timeout for feed fetches. Maybe should be configurable? */
const INFORSS_DEFAULT_FETCH_TIMEOUT = 5000;

/** This is a Promise wrapper round XMLHttpRequest
 * It uses Priv_XMLHttpRequest because this seems to work better for some sites.
 *
 * It also tracks redirects and flags if the chain involved a temporary redirect
 * somewhere.
 *
 * @param {string} url - URL to fetch.
 * @param {object} opts - Options.
 * @param {string} opts.method - Method (GET, PUT) for XMLHttpRequest.
 * @param {string} opts.user - Optional username.
 * @param {string} opts.password - Password, will be fetched if required.
 * @param {object} opts.params - Extra parameters for XMLHttpRequest.send.
 * @param {object} opts.headers - Extra request header fields.
 * @param {string} opts.overrideMimeType - Override returned mime type.
 * @param {string} opts.responsType - How to interpret response.
 */
function XML_Request(url, opts = {})
{
  const xhr = new Priv_XMLHttpRequest();
  const user = opts.user ?? null;
  let password = opts.password;
  if (user != null && password === undefined)
  {
    password = read_password(url, user);
  }

  this._url = url;

  xhr.open(opts.method ?? "GET", url, true, user, password);
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
  for (const type of [ "responseType", "overrideMimeType" ])
  {
    if (type in opts)
    {
      xhr[type] = opts[type];
    }
  }
  xhr.channel.notificationCallbacks = this;
  this._temporary_redirect = false;
  this._last_url = null;
  this._request = xhr;

  this._resolve = null;
  this._reject = null;

  Object.seal(this);
}

XML_Request.prototype = {

  /** Returns a promise that will fulfill when the request is completed.
   *
   * @returns {XMLHttpRequest} The completed XMLHttpRequest.
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

  /** Abort the current request. */
  abort()
  {
    this._request.abort();
  },

  /** See if we had a temporary redirecton.
   *
   * @returns {boolean} Returns true if a temporary redirection (302/307) was
   *                    received, false otherwise.
   */
  get had_temporary_redirect()
  {
    return this._temporary_redirect;
  },

  /** Get the requested URL.
   *
   * @returns {string} The URL that was actually requested.
   */
  get requested_url()
  {
    return this._url;
  },

  /** Get the resolved URL.
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

  /** Get the response URL.
   *
   * This is the URL you actually get. It may be the result of a temporary
   * redirect, so use with caution.
   *
   * @returns {string} The actually fetched URL.
   */
  get response_url()
  {
    return this._request.responseURL;
  },

  /** Received a response.
   *
   * @param {ProgressEvent} event - Completed request.
   */
  _on_load(event)
  {
    //FIXME Log the request/response here? Lowish level of detail?
    //Also at the error, timeout and abort levels.
    if (200 <= event.target.status && event.target.status < 400)
    {
      this._resolve(event.target);
    }
    else
    {
      this._reject(new_Invalid_Status_Error(event, this.requested_url));
    }
  },

  /** Request got an error.
   *
   * @param {ProgressEvent} event - Errored request.
   */
  _on_error(event)
  {
    this._reject(new_Fetch_Error(event, this.requested_url));
  },

  /** Request was aborted.
   *
   * @param {ProgressEvent} event - Aborted request.
   */
  _on_abort(event)
  {
    this._reject(new_Fetch_Abort(event, this.requested_url));
  },

  /** Request timed out.
   *
   * @param {ProgressEvent} event - Timed out request.
   */
  _on_timeout(event)
  {
    this._reject(new_Fetch_Timeout(event, this.requested_url));
  },

  /** Called on redirect to permit/deny redirect.
   *
   * @interface nsIChannelEventSink
   *
   * We use it to log what sort of redirects happened.
   *
   * @param {nsiChannel} oldChannel - Current data stream.
   * @param {nsiChannel} _newChannel - New data stream.
   * @param {number} flags - Bit flags indicating the redirect type.
   * @param {nsIAsyncVerifyRedirectCallback} callback - Function to call
   *        to indicate success (or optionally failure).
   */
  asyncOnChannelRedirect(oldChannel, _newChannel, flags, callback)
  {
    // eslint-disable-next-line no-bitwise
    if ((flags &
         Components.interfaces.nsIChannelEventSink.REDIRECT_TEMPORARY) != 0)
    {
      if (! this._temporary_redirect)
      {
        this._last_url = oldChannel.name;
        this._temporary_redirect = true;
      }
    }
    callback.onRedirectVerifyCallback(Components.results.NS_OK);
  },

  /** Gets the interface.
   *
   * @interface nsiSupports - Enough said.
   *
   * @param {nsIIDRef} uuid - Interface id.
   *
   * @returns {object} "this" if we support the interface, otherwise an
   *                   exception s thrown.
   */
  getInterface(uuid)
  {
    return this.QueryInterface(uuid);
  },

  /** Return this object magicced into an appropriate interace.
   *
   * As we're faking an XPCOM interface, we need to provide this.
   *
   * @interface nsiSupports - Enough said.
   *
   * @param {nsIIDRef} uuid - Interface id.
   *
   * @returns {object} The this object if we support the interface, otherwise
   *                   an exception is thrown.
   *
   * @throws {Components.results.NS_NOINTERFACE}
   */
  QueryInterface: XPCOMUtils.generateQI(
    [ Components.interfaces.nsIChannelEventSink ]
  )

};
