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

const { XML_Request } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_XML_Request.jsm",
  {}
);

const { HTML_Feed } = Components.utils.import(
  "chrome://inforss/content/feed_handlers/inforss_HTML_Feed.jsm",
  {}
);

const { console } =
  Components.utils.import("resource://gre/modules/Console.jsm", {});

/** Modal dialogue providing controlling configuration of feeds parsed from
 * HTML pages
 *
 * @param {ChromeWindow} window - The current world.
 * @param {object} feed - Feed config object. Like an RSS config but flattened.
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

  /** Fetch the html from the specified page.
   *
   * Note that this is also used as an event handler, but we don't use the
   * passed in MouseEvent.
   */
  async _fetch_html()
  {
    let aborted = false;
    if (this._request != null)
    {
      console.log("Aborted request", this._request);
      this._request.abort();
      this._request = null;
    }

    try
    {
      {
        const params = {
          user: this._feed.user,
          password: this._feed.password,
          responseType: "text"
        };
        if (this._encoding_switch.selectedIndex == 1 &&
            this._encoding.value != "")
        {
          params.overrideMimeType = "text/plain; charset=" +
                                    this._encoding.value;
        }
        this._request = new XML_Request(this._feed.url, params);
      }
      const response = await this._request.fetch();

      this._html_code.value = response.responseText;
      this._html_code.setAttribute("realSrc", response.responseText);
      this._iframe.setAttribute("src", this._feed.url);

      if (this._encoding_switch.selectedIndex == 0)
      {
        const type = this._get_type(response);
        const pos = type.indexOf("charset=");
        if (pos != -1)
        {
          this._encoding.value = type.substr(pos + 8);
        }
      }

      //Grab the favicon - don't really care if this completes.
      this._request = new Page_Favicon(this._feed.url,
                                       this._feed.user,
                                       this._feed.password);
      this._favicon = await this._request.fetch_from_page(response);
    }
    catch (err)
    {
      if ("event" in err && "url" in err)
      {
        //One of my fetch aborts. Stack trace isn't terribly helpful.
        console.log(err.message);
      }
      else
      {
        //Something whacky happened.
        //FIXME Should this be debug()?
        console.log(err);
      }
      if (err.name === "Fetch_Abort")
      {
        aborted = true;
      }
    }
    finally
    {
      if (! aborted)
      {
        this._request = null;
      }
    }
  },

  /** Get document type from XML response.
   *
   * @param {XMLHttpRequest} response - XML document.
   *
   * @returns {string} Document type.
   */
  _get_type(response)
  {
    let type = response.getResponseHeader("Content-Type") ?? "";
    if (! type.includes("charset="))
    {
      //I'd get this from the iframe but it apparently hasn't been parsed
      //yet.
      const htmldoc =
        this._document.implementation.createHTMLDocument("example");
      htmldoc.documentElement.innerHTML = response.responseText;
      //const htmldoc = this._iframe.contentWindow.document;
      let node = htmldoc.querySelector("meta[charset]");
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
        type = "charset=" + node.getAttribute("content");
      }
    }

    return type;
  },

  /** Button click which causes regex to be matched against html and headlines
   * to be displayed.
   *
   * @param {MouseEvent} _event - Click event.
   */
  _test_regexp(_event)
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

    rows.append(
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
      rows.append(
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

  /** Adds a headline to the displayed headlines.
   *
   * @param {string} title - title
   * @param {string} description - description
   * @param {string} date - date
   * @param {string} link - link
   * @param {string} category - category
   *
   * @returns {Node} a row element
   */
  _make_row(title, description, date, link, category)
  {
    const row = this._document.createElement("row");
    const make_label = text =>
    {
      const label = this._document.createElement("label");
      label.setAttribute("value", text);
      return label;
    };

    row.append(
      make_label(title),
      make_label(description),
      make_label(date),
      make_label(link),
      make_label(category),
    );

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
