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
 *   Tom Tanner
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
// inforss_Parse_Html_Dialogue
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------

/* jshint globalstrict: true */
/* eslint-disable strict */
"use strict";

/* eslint-disable array-bracket-newline */
/* exported EXPORTED_SYMBOLS */
const EXPORTED_SYMBOLS = [
  "Parse_HTML_Dialogue", /* exported Parse_HTML_Dialogue */
];
/* eslint-enable array-bracket-newline */

const { INFORSS_DEFAULT_FETCH_TIMEOUT } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Constants.jsm",
  {}
);

const { Page_Favicon } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Page_Favicon.jsm",
  {}
);

const { alert } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Prompt.jsm",
  {}
);

const {
  add_event_listeners,
  event_binder,
  read_password,
  remove_event_listeners,
  replace_without_children
} = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Utils.jsm",
  {}
);

const { get_string } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Version.jsm",
  {}
);

const { HTML_Feed } = Components.utils.import(
  "chrome://inforss/content/feed_handlers/inforss_HTML_Feed.jsm",
  {}
);

const Priv_XMLHttpRequest = Components.Constructor(
  "@mozilla.org/xmlextras/xmlhttprequest;1",
  "nsIXMLHttpRequest");

const { console } =
  Components.utils.import("resource://gre/modules/Console.jsm", {});

/** Modal dialogue providing controlling configuration of feeds parsed from
 * HTML pages
 *
 * @param {ChromeWindow} window - the current world
 * @param {Object} feed - Feed config object. Like an RSS config but flattened
 */
function Parse_HTML_Dialogue(window, feed)
{
  this._result = { valid: false };
  this._feed = feed;
  this._request = null;

  //See Capture_New_Feed_Dialogue for comments on the subject of modal windows

  window.openDialog(
    "chrome://inforss/content/windows/inforss_Parse_HTML_Dialogue.xul",
    "_blank",
    "modal,centerscreen,resizable=yes,dialog=yes",
    event_binder(this._on_load, this)
  );
}

Parse_HTML_Dialogue.prototype = {

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
    this._document = event.target;

    //Because window is modal, I have to do it like this. I could use
    //this._document.ownerGlobal but this feels nicer.
    this._dialogue = dialog;

    /* eslint-disable array-bracket-newline */
    this._listeners = add_event_listeners(
      this,
      this._document,
      [ this._dialogue, "dialogaccept", this._on_dialogue_accept ],
      [ this._dialogue, "unload", this._on_unload ],
      [ "html.gethtml", "click", this._fetch_html ],
      [ "html.test", "click", this._test_regexp ],
      [ "html.build", "click", this._build_regexp ]
    );
    /* eslint-enable array-bracket-newline */


    if (! ('password' in this._feed))
    {
      this._feed.password = read_password(this._feed.url, this._feed.user);
    }

    //If anything isn't supplied (which is the case for capture new feed),
    //use a blank string.
    for (const attr of [
      "regexp",
      "regexpTitle",
      "regexpDescription",
      "regexpPubDate",
      "regexpLink",
      "regexpCategory",
      "regexpStartAfter",
      "regexpStopBefore",
      "htmlDirection", //Technically we don't need to do this one, but.
      "encoding"
    ])
    {
      if (! (attr in this._feed))
      {
        this._feed[attr] = "";
      }
    }

    this._validated_regexp = this._feed.regexp;

    //This could have been made a lot easier if the names of the attributes in
    //the feed xml had matched the names of the elements in the xul
    this._document.getElementById("inforss.html.url").value = this._feed.url;

    this._regexp = this._document.getElementById("inforss.html.regexp");
    this._headline = this._document.getElementById("inforss.html.headline");
    this._article = this._document.getElementById("inforss.html.article");
    this._pubdate = this._document.getElementById("inforss.html.publisheddate");
    this._link = this._document.getElementById("inforss.html.link");
    this._category = this._document.getElementById("inforss.html.category");
    this._startafter = this._document.getElementById("inforss.html.startafter");
    this._stopbefore = this._document.getElementById("inforss.html.stopbefore");
    this._direction = this._document.getElementById("inforss.html.direction");
    this._encoding_switch =
      this._document.getElementById("inforss.html.encoding");
    this._encoding = this._document.getElementById("inforss.encoding.man");

    this._regexp.value = this._feed.regexp;
    this._headline.value = this._feed.regexpTitle;
    this._article.value = this._feed.regexpDescription;
    this._pubdate.value = this._feed.regexpPubDate;
    this._link.value = this._feed.regexpLink;
    this._category.value = this._feed.regexpCategory;
    this._startafter.value = this._feed.regexpStartAfter;
    this._stopbefore.value = this._feed.regexpStopBefore;
    this._direction.selectedIndex = this._feed.htmlDirection == "asc" ? 0 : 1;
    this._encoding.value = this._feed.encoding;
    this._encoding_switch.selectedIndex = this._feed.encoding == "" ? 0 : 1;

    this._iframe = this._document.getElementById("inforss.iframe");
    this._iframe.setAttribute("src", this._feed.url);

    this._html_code = this._document.getElementById("inforss.html.code");

    this._favicon = undefined;

    this._fetch_html();
  },

  /** Window closing. Remove all event listeners
   *
   * ignored @param {UnloadEvent} event
   */
  _on_unload(/*event*/)
  {
    remove_event_listeners(this._listeners);
  },

  /** Accept button pressed
   *
   * @param {DialogAcceptEvent} event - accepted event.
   */
  _on_dialogue_accept(event)
  {
    if (! this._validate() || ! this._tested())
    {
      event.preventDefault();
      return;
    }

    this._result.regexp = this._regexp.value;
    this._result.regexpTitle = this._headline.value;
    this._result.regexpDescription = this._article.value;
    this._result.regexpPubDate = this._pubdate.value;
    this._result.regexpLink = this._link.value;
    this._result.regexpCategory = this._category.value;
    this._result.regexpStartAfter = this._startafter.value;
    this._result.regexpStopBefore = this._stopbefore.value;
    this._result.htmlDirection =
      this._direction.selectedIndex == 0 ? "asc" : "des";
    this._result.encoding =
      this._encoding_switch.selectedIndex == 0 ? "" : this._encoding.value;
    this._result.favicon = this._favicon;

    this._result.valid = true;
  },

  /** Check if the regular expression has been tested at least once. This
   * assumes that you've already checked the current regex isn't actually
   * null.
   *
   * @returns {boolean} true if so
   */
  _tested()
  {
    if (this._validated_regexp != this._regexp.value)
    {
      alert(get_string("html.test"));
      return false;
    }
    return true;
  },

  /** Check if the supplied fields are moderately OK
   *
   * @returns {boolean} true if all OK
   */
  _validate()
  {
    if (this._regexp.value.length == 0 || this._headline.value.length == 0 ||
        this._link.value.length == 0)
    {
      alert(get_string("html.mandatory"));
      return false;
    }
    if (this._encoding_switch.selectedIndex == 1 && this._encoding.value == "")
    {
      alert(get_string("html.encoding"));
      return false;
    }
    return true;
  },

  /** Fetch the html from the specified page
   *
   * ignored @param {Event} event - button click
   */
  _fetch_html(/*event*/)
  {
    if (this._request != null)
    {
      console.log("Aborted request", this._request);
      this._request.abort();
      this._request = null;
    }

    const request = new Priv_XMLHttpRequest();
    request.open("GET",
                 this._feed.url,
                 true,
                 this._feed.user,
                 this._feed.password);

    request.onload = event_binder(this._fetched_html, this);
    request.onerror = event_binder(this._fetch_error, this);

    request.timeout = INFORSS_DEFAULT_FETCH_TIMEOUT;
    request.ontimeout = event_binder(this._fetch_error, this);

    if (this._encoding_switch.selectedIndex == 1 && this._encoding.value != "")
    {
      request.overrideMimeType('text/plain; charset=' + this._encoding.value);
    }

    request.responseType = "text";

    request.send();

    this._request = request;
  },

  /** Event errored - log errored
   *
   * @param {Event} event - error event of some sort
   */
  _fetch_error(event)
  {
    console.log("Error fetching", this, this._request, event);
    this._request = null;
  },

  /** HTML finally fetched. Decode and display
   *
   * @param {ProgressEvent} event - load event
   */
  _fetched_html(event)
  {
    this._request = null;
    const request = event.target;
    if (request.status != 200)
    {
      console.log("Error", request);
      //FIXME Alert?
      return;
    }

    this._html_code.value = request.responseText;
    this._html_code.setAttribute("realSrc", request.responseText);
    this._iframe.setAttribute("src", this._feed.url);

    if (this._encoding_switch.selectedIndex == 0)
    {
      //See if it's specifed in the header
      let type = request.getResponseHeader("Content-Type");
      if (type == null)
      {
        type = "";
      }

      if (! type.includes("charset="))
      {
        //I'd get this from the iframe but it apparently hasn't been parsed yet.
        const htmldoc =
          this._document.implementation.createHTMLDocument("example");
        htmldoc.documentElement.innerHTML = request.responseText;
        //const htmldoc = this._iframe.contentWindow.document;
        let node = htmldoc.querySelector('meta[charset]');
        if (node == null)
        {
          node = htmldoc.querySelector('meta[http-equiv="Content-Type"]');
          if (node != null)
          {
            type = node.getAttribute("content");
          }
        }
        else
        {
          type = 'charset=' + node.getAttribute("content");
        }
      }

      //remove up to the charset= if it has it
      const pos = type.indexOf("charset=");
      if (pos != -1)
      {
        this._encoding.value = type.substr(pos + 8);
      }
    }

    //Grab the favicon - don't really care if this completes.
    const icon_request = new Page_Favicon(this._feed.url,
                                          this._feed.user,
                                          this._feed.password,
                                          event);
    this._request = icon_request;
    icon_request.fetch().then(
      icon =>
      {
        this._favicon = icon;
        this._request = null;
      }
    ).catch(
      err =>
      {
        //Threw an exception - log it and pretend nothing happened
        console.log(err);
        this._request = null;
      }
    );
  },

  /** Button click which causes regex to be matched against html and headlines
   * to be displayed
   *
   * ignored @param {Event} event - button event
   */
  _test_regexp(/*event*/)
  {
    if (! this._validate())
    {
      return;
    }

    if (this._html_code.value.length == 0)
    {
      alert(get_string("html.nosource"));
      return;
    }

    this._document.getElementById("inforss.tabbox").selectedIndex = 2;

    const feedxml = this._document.createElement("RSS");
    feedxml.setAttribute("url", this._feed.url);
    feedxml.setAttribute("link", this._feed.url);

    const add_tag = (name, element) =>
    {
      feedxml.setAttribute(
        name,
        this._document.getElementById("inforss.html." + element).value
      );
    };

    add_tag("regexp", "regexp");
    add_tag("regexpStartAfter", "startafter");
    add_tag("regexpStopBefore", "stopbefore");
    add_tag("regexpTitle", "headline");
    add_tag("regexpDescription", "article");
    add_tag("regexpPubDate", "publisheddate");
    add_tag("regexpLink", "link");
    add_tag("regexpCategory", "category");
    feedxml.setAttribute("htmlDirection",
                         this._direction.selectedIndex == 0 ? "asc" : "des");

    const feed = new HTML_Feed(feedxml);

    const rows =
      replace_without_children(this._document.getElementById("inforss.rows"));

    rows.appendChild(
      this._make_row(
        this._document.getElementById("inforss.label1").getAttribute("value"),
        this._document.getElementById("inforss.label2").getAttribute("value"),
        this._document.getElementById("inforss.label3").getAttribute("value"),
        this._document.getElementById("inforss.label4").getAttribute("value"),
        this._document.getElementById("inforss.label5").getAttribute("value")
      )
    );

    const headlines = feed.read_headlines(
      null,
      this._html_code.getAttribute("realSrc"));

    for (const headline of headlines)
    {
      const desc = feed.get_description(headline);
      const date = feed.get_pubdate(headline);
      rows.appendChild(
        this._make_row(feed.get_title(headline),
                       desc == null ? null : desc.substring(0, 30),
                       date == null ? null : date.toLocaleDateString(),
                       feed.get_link(headline),
                       feed.get_category(headline)
        )
      );
    }

    this._validated_regexp = this._regexp.value;
  },

  /** Adds a headline to the displayed headlines
   *
   * @param {string} text1 - title
   * @param {string} text2 - description
   * @param {string} text3 - date
   * @param {string} text4 - link
   * @param {string} text5 - category
   *
   * @returns {Node} a row element
   */
  _make_row(text1, text2, text3, text4, text5)
  {
    const row = this._document.createElement("row");

    let label = this._document.createElement("label");
    label.setAttribute("value", text1);
    row.appendChild(label);

    label = this._document.createElement("label");
    label.setAttribute("value", text2);
    row.appendChild(label);

    label = this._document.createElement("label");
    label.setAttribute("value", text3);
    row.appendChild(label);

    label = this._document.createElement("label");
    label.setAttribute("value", text4);
    row.appendChild(label);

    label = this._document.createElement("label");
    label.setAttribute("value", text5);
    row.appendChild(label);

    return row;
  },

  /** Button click which causes regex to be built from the currently selected
   * html.
   *
   * I'm not sure it produces anything at all useful though.
   *
   * ignored @param {Event} event - button event
   */
  _build_regexp(/*event*/)
  {
    if (this._html_code.selectionStart == this._html_code.selectionEnd)
    {
      alert(get_string("html.selectfirst"));
      return;
    }

    let str = this._html_code.getAttribute("realSrc").substring(
      this._html_code.selectionStart,
      this._html_code.selectionEnd
    );
    str = str.replace(/\s/gi, "");
    str = str.replace(/>([^<$]*)([<$])/gi, ">([^<]*)$2");
    this._regexp.value = str;
  },

};
