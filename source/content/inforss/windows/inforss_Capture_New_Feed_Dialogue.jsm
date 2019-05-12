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
// inforss_Capture_New_Feed_Dialogue
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------

/* jshint globalstrict: true */
/* eslint-disable strict */
"use strict";

/* eslint-disable array-bracket-newline */
/* exported EXPORTED_SYMBOLS */
const EXPORTED_SYMBOLS = [
  "Capture_New_Feed_Dialogue", /* exported Capture_New_Feed_Dialogue */
];
/* eslint-enable array-bracket-newline */

const {
  add_event_listeners,
  event_binder,
  remove_event_listeners
} = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Utils.jsm",
  {}
);


const { debug } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Debug.jsm",
  {}
);

const { alert } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Prompt.jsm",
  {}
);

const { get_string } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Version.jsm",
  {}
);

const PromptService = Components.classes[
  "@mozilla.org/embedcomp/prompt-service;1"].getService(
  Components.interfaces.nsIPromptService);

//var openerValue = window.arguments[0];

const { console } =
  Components.utils.import("resource://gre/modules/Console.jsm", {});


/** Brings up a dialogue for user to connect to a new feed
 *
 * @param {ChromeWindow} window - the current world
 */
function Capture_New_Feed_Dialogue(window)
{
  /* This'd be much nicer but it's not possible to turn a window into a dialog
     window

  this._dialogue = window.openDialog(
    "chrome://inforss/content/windows/inforss_Capture_New_Feed_Dialogue.xul",
    "_blank",
    "modal,centerscreen,resizable=yes, dialog=yes",
    this.returnValue);

  // eslint-disable array-bracket-spacing, array-bracket-newline
  this._listeners = add_event_listeners(
    this,
    null,
    [ this._dialogue, "load", this._on_load ]
  );
  // eslint-enable array-bracket-spacing, array-bracket-newline

  */
  this._result = { valid: false };

  window.openDialog(
    "chrome://inforss/content/windows/inforss_Capture_New_Feed_Dialogue.xul",
    "_blank",
    "modal,centerscreen,resizable=yes, dialog=yes",
    event_binder(this._on_load, this)
  );
}


Capture_New_Feed_Dialogue.prototype = {

  /** Captures the results of the dialogue
   *
   * @returns {Object} magic stuff
   */
  results()
  {
    return this._result;
  },

  /** Window loaded. Fill in any necessary details
   *
   * @param {LoadEvent} event - window loading event
   * @param {ChromeWindow} dialog - the window
   */
  _on_load(event, dialog)
  {
    /* Cant remove this as it doesn't get set up
    remove_event_listeners(this._listeners);
    */

    /**/console.log(event, dialog)
    const document = event.target;
    this._document = document;

    //Because window is modal, I have to do it like this. I could use
    //document.ownerGlobal but this feels nicer.
    this._dialogue = dialog;

    this._rss_search = document.getElementById("inforss-new-rss-select-search");

    /* eslint-disable array-bracket-spacing, array-bracket-newline */
    this._listeners = add_event_listeners(
      this,
      null,
      [ this._dialogue, "dialogaccept", this._on_dialogue_accept ],
      [ this._dialogue, "unload", this._on_unload ],
      [ "new.rss", "click", this._select_rss ],
      [ "new.html", "click", this._select_html ]
    );
    /* eslint-enable array-bracket-spacing, array-bracket-newline */

    document.getElementById("inforss-new-url").focus();

    const type = document.getElementById("inforss-new-type");
    type.value = type.selectedItem.getAttribute("value");
    document.getElementById("inforss-new-title").disabled = true;
    this._rss_search.value = this._rss_search.selectedItem.getAttribute("value");
    this.require_username_and_password();
    this._set_search_state(true);
  },

  //FIXME Is there any circumstance where these are not enabled?
  /** Enables user/password boxes. */
  require_username_and_password()
  {
    this._document.getElementById("inforss-new-user").disabled = false;
    this._document.getElementById("inforss-new-password").disabled = false;
  },

  /** Set state of search boxes
   *
   * @param {boolean} state - whether box should be enabled or disabled
   */
  _set_search_state(state)
  {
    this._rss_search.disabled = state;
    this._document.getElementById("inforss-new-keyword").disabled = state;
    if (state)
    {
      this._document.getElementById("inforss-new-keyword").value = "";
    }
  },

  /** Check the user input
   *
   * @returns {boolean} true if ok, else false
   */
  _check()
  {
    const url = this._document.getElementById("inforss-new-url").value;
    if (! url.startsWith("http://") &&
        ! url.startsWith("https://") &&
        ! url.startsWith("news://"))
    {
      return false;
    }

    const type = this._document.getElementById("inforss-new-type").value;
    const keyword = this._document.getElementById("inforss-new-keyword").value;

    if (type == "search" && keyword == "")
    {
      return false;
    }

    const title = this._document.getElementById("inforss-new-title").value;

    //Not entirely sure why rss feeds don't need a title.
    if (type != "rss" && title == "")
    {
      return false;
    }

    const user = this._document.getElementById("inforss-new-user").value;
    const password = this._document.getElementById("inforss-new-password").value;

    //Sanity check if they've supplied a username then they've supplied a
    //password and vice versa.
    if ((user != "") != (password != ""))
    {
      return false;
    }

    this._result.title = title;
    this._result.url = url;
    this._result.user = user;
    this._result.password = password;
    this._result.keyword = keyword;
    this._result.type = type;

    this._result.valid = true;

    return true;
  },

  /** Handle OK button
   *
   * ignored @param {DialogAcceptEvent} event
   */
  _on_dialogue_accept(/*event*/)
  {
    const ok = this._check();
    if (! ok)
    {
      //FIXME Seriously?
      //(a) the message sucks. Should be one for each failure above.
      //(b) why not use our own service
      //PromptService.alert(window,
        //                  inforss.get_string("new.mandatory.titlebox"),
          //                inforss.get_string("new.mandatory.msg"));
      alert(get_string("new.mandatory.message"),  "new.mandatory.titlebox");
    }
  },

  /** Window closing. Remove all event listeners
   *
   * ignored @param {UnloadEvent} event
   */
  _on_unload(/*event*/)
  {
    remove_event_listeners(this._listeners);
  },

  /** Click on 'rss' button
   *
   * ignored @param {DialogAcceptEvent} event
   */
  _select_rss(event)
  {
    console.log(event)
    this._select_rss_or_html(true);
  },

  /** Click on 'html' button
   *
   * ignored @param {DialogAcceptEvent} event
   */
  _select_html(event)
  {
    console.log(event)
    this._select_rss_or_html(false);
  },

  /** Set up for html or rss selection
   *
   * @param {boolean} flag - true is rss, false is html
   */
  _select_html_or_rss(flag)
  {
    this._document.getElementById("inforss-new-title").disabled = flag;
    if (flag)
    {
      this._document.getElementById("inforss-new-title").value = "";
    }
    this._document.getElementById("inforss-new-url").disabled = false;
    const url = this._document.getElementById('inforss-new-url').value;
    if (url != "")
    {
      if (url.indexOf("http") != 0)
      {
        this._document.getElementById('inforss-new-url').value = 'http://www.';
        this._document.getElementById("inforss-new-url").focus();
        checkUrl();
      }
    }
    this._set_search_state(true);
  },

};

//-----------------------------------------------------------------------------------------------------
function clickNntp()
{
  try
  {
    document.getElementById("inforss-new-title").disabled = false;
    document.getElementById("url").disabled = false;
    var url = document.getElementById('url').value;
    if ((url != null) && (url != ""))
    {
      if (url.indexOf("news://") != 0)
      {
        document.getElementById('url').value = 'news://news.acme.com/netscape.mozilla.dev.xul';
        document.getElementById("url").focus();
        checkUrl();
      }
    }
    document.getElementById("inforss-new-user").disabled = false;
    document.getElementById("inforss-new-password").disabled = false;
    checkSearch(true);
  }
  catch (e)
  {
    inforss.debug(e);
  }
}

//-----------------------------------------------------------------------------------------------------
function clickSearch()
{
  try
  {
    document.getElementById("inforss-new-title").disabled = false;
    document.getElementById("inforss-new-url").disabled = true;
    var url = null;
    var keyword = document.getElementById("inforss-new-keyword").value;
    var search = this._rss_search.value;
    switch (search)
    {
      case "technorati":
        {
          url = "http://www.technorati.com/search/";
          //        openerValue.regexp = '<li id="[^"]*">[\\n\\r\\s]*<h3>[\\n\\r\\s]*<a href="([^"]*)">([^<]*)</a>[\\n\\r\\s]*</h2>[\\u0001-\\uffff]*?<blockquote[^>]*>([\\u0001-\\uFFFF]*?)</blockquote';
          //        openerValue.regexp = '<li class="hentry"[^>]*>[\\u0001-\\uffff]*?<img[^>]*>[\\u0001-\\uffff]*?<a href="([^"]*)"[^>]*>([^<]*)</a></h2>[\\u0001-\\uffff]*?<blockquote[^>]*>([\\u0001-\\uFFFF]*?)</blockquote';
          openerValue.regexp = '<li>[\\u0001-\\uffff]*?<h3><a[\\u0001-\\uffff]*?class="offsite"[\\u0001-\\uffff]*?href="([^"]*)"[^>]*>([^<]*)</a></h3><br />[\\u0001-\\uffff]*?</a><br />[\\s]*([^^]*?)</li>';
          openerValue.regexpTitle = "$2";
          openerValue.regexpDescription = "$3";
          openerValue.regexpLink = "$1";
          openerValue.regexpStartAfter = null;
          openerValue.htmlDirection = "asc";
          openerValue.htmlTest = "true";
          break;
        }
      case "blogger":
        {
          url = "http://search.blogger.com/?ui=blg&num=20&q=";
          openerValue.regexp = '<a[\\s\\S]*?href="([^"]*)"[\\s\\S]*?id="p-[^"]*"[\\s\\S]*?>([\\s\\S]*?)</a>[\\s\\S]*?<font size=-1>([\\s\\S]*?)</font>';
          openerValue.regexpTitle = "$2";
          openerValue.regexpDescription = "$3";
          openerValue.regexpLink = "$1";
          openerValue.regexpStartAfter = null;
          openerValue.htmlDirection = "asc";
          openerValue.htmlTest = "true";
          break;
        }
      case "bloglines":
        {
          url = "http://www.bloglines.com/search?ql=en&s=f&pop=l&news=m&f=10&q=";
          openerValue.regexp = '<div class=.match. [\\u0001-\\uffff]*?<a href="([^"]*)"[\\u0001-\\uffff]*?>([\\u0001-\\uffff]*?)</a>[\\u0001-\\uffff]*?<div class=.shorty.>([\\u0001-\\uffff]*?)</div>';
          openerValue.regexpTitle = "$2";
          openerValue.regexpDescription = "$3";
          openerValue.regexpLink = "$1";
          openerValue.regexpStartAfter = null;
          openerValue.htmlDirection = "asc";
          openerValue.htmlTest = "true";
          break;
        }
      case "blogSearchEngine":
        {
          url = "http://www.blogsearchengine.com/search.php?tab=blog&q=";
          openerValue.regexp = '<span class=t>[\\u0001-\\uffff]*?<a href="([^"]*)"[^>]*>([\\u0001-\\uffff]*?)</a>[\\u0001-\\uffff]*?<table[\\u0001-\\uffff]*?<tr[\\u0001-\\uffff]*?<td[^>]*>([\\u0001-\\uffff]*?)</td';
          openerValue.regexpTitle = "$2";
          openerValue.regexpDescription = "$3";
          openerValue.regexpLink = "$1";
          openerValue.regexpStartAfter = null;
          openerValue.htmlDirection = "asc";
          openerValue.htmlTest = "true";
          break;
        }
      case "ask":
        {
          url = "http://www.ask.com/blogsearch?t=a&qsrc=28&o=0&q=";
          openerValue.regexp = '<a class=.L4. href="([^"]*)"[\\u0001-\\uffff]*?>([\\u0001-\\uffff]*?)</a>[\\u0001-\\uffff]*?<div>[\\n\\r\\s\\t]*<div>[\\n\\r\\s\\t]*<span[^>]*>([\\u0001-\\uffff]*?)</span>';
          openerValue.regexpTitle = "$2";
          openerValue.regexpDescription = "$3";
          openerValue.regexpLink = "$1";
          openerValue.regexpStartAfter = "viewlink";
          openerValue.htmlDirection = "asc";
          openerValue.htmlTest = "true";
          break;
        }
      case "delicious":
        {
          url = "http://del.icio.us/search/?all=";
          openerValue.regexp = '<li class=.post.[\\s\\S]*?<a href="([^"]*)"[^>]*>([^<]*)';
          openerValue.regexpTitle = "$2";
          openerValue.regexpDescription = "$2";
          openerValue.regexpLink = "$1";
          openerValue.regexpStartAfter = null;
          openerValue.htmlDirection = "asc";
          openerValue.htmlTest = "true";
          break;
        }
    }
    url += window.escape(keyword);
    document.getElementById('inforss-new-url').value = url;
    checkUrl();
    checkSearch(false);
  }
  catch (e)
  {
    inforss.debug(e);
  }
}

