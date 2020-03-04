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

/* global inforssXMLRepository */
/* global inforss_options_this */
/* global LocalFile */

//const PromptService = Components.classes[
//  "@mozilla.org/embedcomp/prompt-service;1"].getService(
//  Components.interfaces.nsIPromptService);

const FEEDS_APPEND = 0;
const FEEDS_REPLACE = 1;

const FileOutputStream = Components.Constructor(
  "@mozilla.org/network/file-output-stream;1",
  "nsIFileOutputStream",
  "init");

//I seriously don't think I should need this and it's a bug in palemoon 28
//See Issue #192
const inforssPriv_XMLHttpRequest = Components.Constructor(
  "@mozilla.org/xmlextras/xmlhttprequest;1",
  "nsIXMLHttpRequest");

//----------------------------------------------------------------------------
const opml_attributes = [
  "activity",
  "browserHistory",
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


/** Shows the current export progress in the export button
 *
 * @param {Integer} current - current number of items processed
 * @param {Integer} max - maximum number of items to process
 */
function show_export_progress(current, max)
{
  document.getElementById("exportProgressBar").value = current * 100 / max;
}

//------------------------------------------------------------------------------
function export_to_OPML(filePath)
{
  //FIXME Should do an atomic write (to a temp file and then rename)
  //Might be better to just generate a string and let the client resolve where
  //to put it.
  const opmlFile = new LocalFile(filePath);
  const stream = new FileOutputStream(opmlFile, -1, -1, 0);
  let sequence = Promise.resolve(1);
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
  const items = inforssXMLRepository.get_feeds();
  for (const item of items)
  {
    sequence = sequence.then(
      counter =>
      {
        const outline = opml.createElement("outline");
        outline.setAttribute("xmlHome", item.getAttribute("link"));
        outline.setAttribute("xmlUrl", item.getAttribute("url"));

        for (const attribute of opml_attributes)
        {
          if (item.hasAttribute(attribute))
          {
            outline.setAttribute(attribute, item.getAttribute(attribute));
          }
        }

        serializer.serializeToStream(outline, stream, "UTF-8");
        stream.write("\n", "\n".length);
        show_export_progress(counter, items.length);
        //Give the javascript machine a chance to display the progress bar.
        return new Promise(
          resolve => setTimeout(counter2 => resolve(counter2 + 1), 0, counter)
        );
      }
    );
  }
  sequence = sequence.then(
    counter =>
    {
      show_export_progress(counter, items.length);
      str = '  </body>\n</opml>';
      stream.write(str, str.length);
      stream.close();
    }
  );
  return sequence;
}

/** Shows the current import progress in the import button
 *
 * @param {Integer} current - current number of items processed
 * @param {Integer} max - maximum number of items to process
 */
function show_import_progress(current, max)
{
  document.getElementById("importProgressBar").value = current * 100 / max;
}

/** Reads one feed from parsed opml file
 *
 * @param {Element} item - feed definition from opml file
 *
 * @returns {RSS} feed configuration or none
 */
async function inforss_read_opml_item(item)
{
  const url = item.getAttribute("xmlUrl");
  if (inforssXMLRepository.get_item_from_url(url) != null)
  {
    console.log(url + " already found - ignored");
    return null;
  }

  const home =
    item.hasAttribute("xmlHome") ? item.getAttribute("xmlHome") :
    item.hasAttribute("htmlUrl") ? item.getAttribute("htmlUrl") :
                                   null;
  const rss = inforssXMLRepository.add_item(item.getAttribute("title"),
                                            item.getAttribute("text"),
                                            url,
                                            home,
                                            //Not entirely clear to me why
                                            //we export username to OPML
                                            null,
                                            null,
                                            item.getAttribute("type"));

  for (const attribute of opml_attributes)
  {
    if (item.hasAttribute(attribute))
    {
      rss.setAttribute(attribute, item.getAttribute(attribute));
    }
  }

  if (! item.hasAttribute("icon") || item.getAttribute("icon") == "")
  {
    const fetcher = new inforss.Feed_Page(url, { fetch_icon: true });
    try
    {
      await fetcher.fetch();
      rss.setAttribute("icon", fetcher.icon);
    }
    catch (err)
    {
      console.log("Unexpected error fetching icon", err);
    }
  }
  return rss;
}

/** Failed to fetch url */
class Not_OPML_File extends Error
{
  /** constructor */
  constructor()
  {
    super(inforss.get_string("opml.wrongFormat"));
    this.type = this.constructor.name;
  }
}

//----------------------------------------------------------------------------
async function import_from_OPML(text, mode)
{
  const domFile = new DOMParser().parseFromString(text, "text/xml");
  if (domFile.documentElement.nodeName != "opml")
  {
    throw new Not_OPML_File();
  }

  if (mode == FEEDS_REPLACE)
  {
    //FIXME ideally we'd do a clone of the repo so if there were any errors we
    //wouldn't lose anything. However, the 'clone' method can't be called on
    //a cloned child which is v. strange.
    inforssXMLRepository.clear_feeds();
  }

  let count = 0;
  const items = domFile.querySelectorAll("outline[type=rss], outline[xmlUrl]");
  for (const item of items)
  {
    //This is meant to be serialised.
    //eslint-disable-next-line no-await-in-loop
    const rss = await inforss_read_opml_item(item);
    if (mode == FEEDS_APPEND && rss != null)
    {
      inforss_options_this.add_feed(rss);
    }
    show_import_progress(count, items.length);
    count += 1;
  }
  show_import_progress(count, items.length);
}
