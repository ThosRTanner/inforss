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
// inforss_OPML
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------
/* jshint globalstrict: true */
/* eslint-disable strict */
"use strict";

//This module provides a reader and a writer for OPML files

/* exported EXPORTED_SYMBOLS */
const EXPORTED_SYMBOLS = [
  "decode_opml_text", /* exported decode_opml_text */
  "export_to_OPML", /* exported export_to_OPML */
];

const DOMParser = Components.Constructor("@mozilla.org/xmlextras/domparser;1",
                                         "nsIDOMParser");

const FileOutputStream = Components.Constructor(
  "@mozilla.org/network/file-output-stream;1",
  "nsIFileOutputStream",
  "init");

const LocalFile = Components.Constructor("@mozilla.org/file/local;1",
                                         "nsILocalFile",
                                         "initWithPath");

const XMLSerializer = Components.Constructor(
  "@mozilla.org/xmlextras/xmlserializer;1",
  "nsIDOMSerializer");

//----------------------------------------------------------------------------
const opml_attributes = [
  "activity",
  "browserHistory",
  "description",
  "encoding",
  "filter",
  "filterCaseSensitive",
  "filterPolicy",
  "htmlDirection",
  "icon",
  "lengthItem",
  "nbItem",
  "playPodcast",
  "refresh",
  "regexp",
  "regexpCategory",
  "regexpDescription",
  "regexpLink",
  "regexpPubDate",
  "regexpStartAfter",
  "regexpStopBefore",
  "regexpTitle",
  "selected",
  "title",
  "type",
  "user"
];

/** Exports feeds into an OPML file.
 *
 * Exports in 'standard' opml format (whatever that is).
 *
 * @param {string} filePath - File to export feeds to (will be overwritten).
 * @param {Array<RSS>} items - Feeds to export.
 */
function export_to_OPML(filePath, items)
{
  //FIXME Should do an atomic write (to a temp file and then rename)
  //Might be better to just generate a string and let the client resolve where
  //to put it.
  const opmlFile = new LocalFile(filePath);
  const stream = new FileOutputStream(opmlFile, -1, -1, 0);
  //FIXME Should just create the opml document then stream it, but need an
  //async stream to get the feedback.
  const opml = new DOMParser().parseFromString("<opml/>", "text/xml");
  let str = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<opml version="1.0">\n' +
    '  <head>\n' +
    '    <title>InfoRSS Data</title>\n' +
    '  </head>\n' +
    '  <body>\n';
  stream.write(str, str.length);
  const serializer = new XMLSerializer();
  for (const item of items)
  {
    const outline = opml.createElement("outline");
    outline.setAttribute("xmlHome", item.getAttribute("link"));
    outline.setAttribute("xmlUrl", item.getAttribute("url"));
    outline.setAttribute("text", item.getAttribute("description"));

    for (const attribute of opml_attributes)
    {
      if (item.hasAttribute(attribute))
      {
        outline.setAttribute(attribute, item.getAttribute(attribute));
      }
    }

    serializer.serializeToStream(outline, stream, "UTF-8");
    stream.write("\n", "\n".length);
  }
  str = '  </body>\n</opml>';
  stream.write(str, str.length);
  stream.close();
}

/** Decodes a read in OPML string
 *
 * Ideally this would take a stream
 *
 * @param {string} text - contents of OPML file
 *
 * @returns {Array<Object>} - array of tags which we supported to be converted
 *                            into feeds
 */
function decode_opml_text(text)
{
  const domFile = new DOMParser().parseFromString(text, "text/xml");
  if (domFile.documentElement.nodeName != "opml")
  {
    return null;
  }

  const items = domFile.querySelectorAll("outline[type=rss], outline[xmlUrl]");
  const feeds = [];
  for (const item of items)
  {
    const feed = {
      description: item.getAttribute("text"),
      url: item.getAttribute("xmlUrl"),
      home:
        item.hasAttribute("xmlHome") ? item.getAttribute("xmlHome") :
        item.hasAttribute("htmlUrl") ? item.getAttribute("htmlUrl") :
        null
    };

    for (const attribute of opml_attributes)
    {
      if (item.hasAttribute(attribute))
      {
        feed[attribute] = item.getAttribute(attribute);
      }
    }

    feeds.push(feed);
  }
  return feeds;
}
