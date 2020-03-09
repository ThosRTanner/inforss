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
// inforssOpml
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------

/*jshint browser: true, devel: true */
/*eslint-env browser */

/* globals inforss */
Components.utils.import("chrome://inforss/content/modules/inforss_Debug.jsm",
                        inforss);

Components.utils.import("chrome://inforss/content/modules/inforss_Feed_Page.jsm",
                        inforss);

Components.utils.import("chrome://inforss/content/modules/inforss_Prompt.jsm",
                        inforss);

/* global LocalFile */

const FileOutputStream = Components.Constructor(
  "@mozilla.org/network/file-output-stream;1",
  "nsIFileOutputStream",
  "init");

//----------------------------------------------------------------------------
const opml_attributes = [
  "activity",
  "browserHistory",
  "description",
  "filter",
  "filterCaseSensitive",
  "filterPolicy",
  "group",
  "groupAssociated",
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

//------------------------------------------------------------------------------
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
