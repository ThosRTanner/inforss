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
// inforss_Utils
// Author : Tom Tanner 2017
//------------------------------------------------------------------------------
/* jshint globalstrict: true */
/* eslint-disable strict */
"use strict";

//This module provides assorted utilities

/* exported EXPORTED_SYMBOLS */
const EXPORTED_SYMBOLS = [
  "complete_assign", /* exported complete_assign */
  "format_as_hh_mm_ss", /* exported format_as_hh_mm_ss */
  "htmlFormatConvert", /* exported htmlFormatConvert */
  "make_URI", /* exported make_URI */
  "open_option_window", /* exported open_option_window */
  "option_window_displayed", /* exported option_window_displayed */
  "remove_all_children", /* exported remove_all_children */
  "replace_without_children", /* exported replace_without_children */
  "reverse", /* exported reverse */
  "should_reuse_current_tab", /* exported should_reuse_current_tab */
  //password handling
  "read_password", /* exported read_password */
  "store_password", /* exported store_password */
  //event handling
  "event_binder", /* exported event_binder */
  "add_event_listeners", /* exported add_event_listeners */
  "remove_event_listeners", /* exported remove_event_listeners */
];

const { debug } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Debug.jsm",
  {}
);

//const { console } = Components.utils.import(
//  "resource://gre/modules/Console.jsm",
//  {}
//);

const IoService = Components.classes[
  "@mozilla.org/network/io-service;1"].getService(
  Components.interfaces.nsIIOService);

const FormatConverter = Components.Constructor(
  "@mozilla.org/widget/htmlformatconverter;1",
  "nsIFormatConverter"
);

const WindowMediator = Components.classes[
  "@mozilla.org/appshell/window-mediator;1"].getService(
  Components.interfaces.nsIWindowMediator);

const WindowWatcher = Components.classes[
  "@mozilla.org/embedcomp/window-watcher;1"].getService(
  Components.interfaces.nsIWindowWatcher);

const SupportsString = Components.Constructor(
  "@mozilla.org/supports-string;1",
  "nsISupportsString"
);

const LoginManager = Components.classes[
  "@mozilla.org/login-manager;1"].getService(
  Components.interfaces.nsILoginManager);

const LoginInfo = Components.Constructor(
  "@mozilla.org/login-manager/loginInfo;1",
  Components.interfaces.nsILoginInfo,
  "init");

const As_HH_MM_SS = new Intl.DateTimeFormat(
  [],
  { hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false }
);


/** This is an assign function that copies full descriptors
 *(ripped off from MDN)
 *
 * A note: I can't use Object.assign here as it has getters/setters
 * JS2017 has Object.getOwnPropertyDescriptors() and I could do
 * Config.prototype = Object.create(
 *   Config.prototype,
 *   Object.getOwnPropertyDescriptors({...}));
 * wherever this is used. I think
 *
 * @param {Object} target - object to assign to
 * @param {Object} sources - list of objects to copy properties from
 *
 * @returns {Object} target, for chaining
 */
function complete_assign(target, ...sources)
{
  /* eslint-disable no-shadow */
  sources.forEach(
    source =>
    {
      const descriptors = Object.keys(source).reduce(
        (descriptors, key) =>
        {
          descriptors[key] = Object.getOwnPropertyDescriptor(source, key);
          return descriptors;
        },
        {}
      );
      // by default, Object.assign copies enumerable Symbols too
      Object.getOwnPropertySymbols(source).forEach(
        sym =>
        {
          const descriptor = Object.getOwnPropertyDescriptor(source, sym);
          if (descriptor.enumerable)
          {
            descriptors[sym] = descriptor;
          }
        }
      );
      Object.defineProperties(target, descriptors);
    }
  );
  /* eslint-enable no-shadow */
  return target;
}

/** Convert time to hh:mm:ss string
 *
 * @param {Date} date - time which we want to convert
 *
 * @returns {str} hh:mm:ss string in local time
 */
function format_as_hh_mm_ss(date)
{
  return As_HH_MM_SS.format(date);
}

//FIXME the only place that passes extra parameters is nntp feed. Given that,
//perhaps we should drop all the parameters and give that its own function.
/** HTML string conversion
 *
 * @param {string} str - string to convert
 * @param {boolean} keep - keep < and > if set
 * @param {string} mimeTypeFrom - mime type of string (defaults to text/html)
 * @param {string} mimeTypeTo - mime type to convert to (defaults to
 *                 text/unicode
 *
 * @returns {string} converted string
 *
 */
function htmlFormatConvert(str, keep, mimeTypeFrom, mimeTypeTo)
{
  if (str == null)
  {
    return ""; //Seriously - this happens
  }

  let convertedString = null;

  //This is called from inforssNntp with keep false, converting from plain to
  //html. Arguably it should have its own method.
  if (keep == null)
  {
    keep = true;
  }

  if (mimeTypeFrom == null)
  {
    mimeTypeFrom = "text/html";
  }

  if (mimeTypeTo == null)
  {
    mimeTypeTo = "text/unicode";
  }

  if (keep)
  {
    str = str.replace(/</gi, "__LT__");
    str = str.replace(/>/gi, "__GT__");
  }

  const fromString = new SupportsString();
  fromString.data = str;
  let toString = { value: null };

  //FIXMe do I really need try/catch here?
  try
  {
    //This API is almost completely undocumented, so I've no idea how to rework
    //it it into something useful.
    const converter = new FormatConverter();
    converter.convert(mimeTypeFrom,
                      fromString,
                      fromString.toString().length,
                      mimeTypeTo,
                      toString,
                      {});
    if (toString.value)
    {
      toString = toString.value.QueryInterface(
        Components.interfaces.nsISupportsString);
      convertedString = toString.toString();
      if (keep)
      {
        convertedString = convertedString.replace(/__LT__/gi, "<");
        convertedString = convertedString.replace(/__GT__/gi, ">");
      }
    }
    else
    {
      convertedString = str;
    }
  }
  catch (err)
  {
    convertedString = str;
  }

  return convertedString;
}

/** Make a URI from a string
 *
 * @param {string} url - url to turn into a URI
 *
 * @returns {URI} URI object
 */
function make_URI(url)
{
  return IoService.newURI(url);
}

/** Open or focus the option window */
function open_option_window()
{
  const option_window = WindowMediator.getMostRecentWindow("inforssOption");
  if (option_window == null)
  {
    WindowWatcher.openWindow(
      null,
      "chrome://inforss/content/inforssOption.xul",
      "_blank",
      "chrome,centerscreen,resizable=yes,dialog=no",
      null);
  }
  else
  {
    option_window.focus();
  }
}

/** Check if the option window is currently displayed
 *
 * @returns {boolean} true if the option window is currently displayed
 */
function option_window_displayed()
{
  return WindowMediator.getMostRecentWindow("inforssOption") != null;
}

/** Removes all the children of a node
 *
 * This isn't as performant as the one below, but it doesn't cause problems with
 * displayed items.
 *
 * @param {Object} node - original node
 */
function remove_all_children(node)
{
  while (node.lastChild != null)
  {
    node.removeChild(node.lastChild);
  }
}

/** Removes all the children of a node
 *
 * This is the most performant way of removing all the children of a node.
 * However, it doesn't seem to work well if the GUI already has its hands on the
 * node in question.
 *
 * @param {Object} node - original node
 *
 * @returns {Object} new node
 */
function replace_without_children(node)
{
  const new_node = node.cloneNode(false);
  node.parentNode.replaceChild(new_node, node);
  return new_node;
}

/** This returns an iterator which allows you to iterate in reverse
 *
 * @param {Array} array - thing over which to iterate
 *
 * @returns {Iterator} err. a iterable
 */
function reverse(array)
{
  const iterator = {};
  iterator[Symbol.iterator] = function *() //eslint-disable-line func-names
  {
    for (let pos = array.length; pos != 0; pos -= 1)
    {
      yield array[pos - 1];
    }
  };
  return iterator;
}

/** Check if we should overwrite current tab rather than opening a new one
 *
 * @param {Object} window - the window in which you're interested.
 *
 * @returns {boolean} true if the current window contains a single empty tab
 */
function should_reuse_current_tab(window)
{
  const browser = window.gBrowser;
  return browser.browsers.length == 1 &&
         (browser.currentURI == null ||
          ((browser.currentURI.spec == "" ||
            browser.currentURI.spec == "about:blank") &&
           ! browser.selectedBrowser.webProgress.isLoadingDocument));
}

/** get the password for a user at a website
 *
 * @param {string} url - website url
 * @param {string} user - id of user
 *
 * @returns {string} password - might be an empty string
 */
function read_password(url, user)
{
  // Find users for the given parameters
  const logins = LoginManager.findLogins({}, url, 'User Registration', "", {});
  for (const login of logins)
  {
    if (login.username == user)
    {
      return login.password;
    }
  }
  return "";
}

/** Record username and password for a website
 *
 * @param {string} url - website url
 * @param {string} user - id of user
 * @param {string} password - user's password
 *
 * @returns {string} password - might be an empty string
 */
function store_password(url, user, password)
{
  const loginInfo = new LoginInfo(url,
                                  'User Registration',
                                  null,
                                  user,
                                  password,
                                  "",
                                  "");
  try
  {
    LoginManager.removeLogin(loginInfo);
  }
  catch (err)
  {
    /* Do nothing - it's more than possible an exception will be thrown */
  }
  LoginManager.addLogin(loginInfo);
}

/** A wrapper for event listeners that catches and logs the exception
 * Used mainly because the only information you get in the console is the
 * exception text which is next to useless.
 *
 * @param {Function} func - function to call
 * @param {Object} params - extra params to bind
 *
 * @returns {Function} something that can be called
 */
function event_binder(func, ...params)
{
  if (func === undefined)
  {
    throw new Error("Attempting to bind undefined function");
  }
  return (...args) =>
  {
    try
    {
      func.bind(...params)(...args);
    }
    catch (err)
    {
      debug(err);
    }
  };
}

/** Add event listeners taking care of binding
 *
 * @param {Object} object - the class to which to bind all the listeners
 * @param {Document} document - the dom to which to listen
 * @param {Array} listeners - the listeners to add. This is an array of arrays,
 *                            element 0: The node id
 *                            element 1: The event to listen for
 *                            element 2: method to call. This will be bound to
 *                            the object
 *
 * @returns {Array} A list of event handlers to pass to remove_event_listeners
 */
function add_event_listeners(object, document, ...listeners)
{
  const to_remove = [];
  for (const listener of listeners)
  {
    const node = typeof listener[0] == 'string' ?
      document.getElementById("inforss." + listener[0]) :
      listener[0];
    const event = listener[1];
    /*jshint -W083*/
    const method = event_binder(listener[2], object);
    /*jshint -W083*/
    node.addEventListener(event, method);
    to_remove.push({ node, event, method });
  }
  return to_remove;
}

/** The counterpart to add_event_listeners, which can be called to deregister
 * all the registered event listeners
 *
 * @param {Array} listeners - result of calling add_event_listeners
 */
function remove_event_listeners(listeners)
{
  for (const listener of listeners)
  {
    listener.node.removeEventListener(listener.event, listener.method);
  }
}

