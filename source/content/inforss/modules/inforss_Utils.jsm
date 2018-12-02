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
var EXPORTED_SYMBOLS = [
  "replace_without_children", /* exported replace_without_children */
  "remove_all_children", /* exported remove_all_children */
  "make_URI", /* exported make_URI */
  "htmlFormatConvert", /* exported htmlFormatConvert */
  "format_as_hh_mm_ss", /* exported format_as_hh_mm_ss */
];

const IoService = Components.classes[
    "@mozilla.org/network/io-service;1"].getService(
    Components.interfaces.nsIIOService);

const FormatConverter = Components.classes[
  "@mozilla.org/widget/htmlformatconverter;1"].createInstance(
  Components.interfaces.nsIFormatConverter);

const As_HH_MM_SS = new Intl.DateTimeFormat(
  [],
  { hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false }
);


//------------------------------------------------------------------------------
//This is the most performant way of removing all the children. However,
//it doesn't seem to work well if the GUI already has its hands on the node in
//question.
function replace_without_children(node)
{
    let new_node = node.cloneNode(false);
    node.parentNode.replaceChild(new_node, node);
    return new_node;
}

//------------------------------------------------------------------------------
function remove_all_children(node)
{
  while (node.lastChild != null)
  {
    node.removeChild(node.lastChild);
  }
}

//------------------------------------------------------------------------------
/** Makes a URI from a string */
function make_URI(url)
{
  return IoService.newURI(url, null, null);
}

//------------------------------------------------------------------------------
/** HTML string conversion
 *
 * str - string to convert
 * keep - keep < and > if set
 * mimeTypeFrom - mime type of string (defaults to text/html)
 * mimeTypeTo - mime type to convert to (defaults to text/unicode
 */
function htmlFormatConvert(str, keep, mimeTypeFrom, mimeTypeTo)
{
  if (str == null)
  {
    return null;
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

  let fromString = Components.classes["@mozilla.org/supports-string;1"].createInstance(Components.interfaces.nsISupportsString);
  fromString.data = str;
  let toString = { value: null };

  try
  {
    //This API is almost completely undocumented, so I've no idea how to rework
    //it it into something usefil.
    FormatConverter.convert(mimeTypeFrom,
                            fromString,
                            fromString.toString().length,
                            mimeTypeTo,
                            toString,
                            {});
    if (toString.value)
    {
      toString = toString.value.QueryInterface(Components.interfaces.nsISupportsString);
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
  catch (e)
  {
    convertedString = str;
  }

  return convertedString;
}

//------------------------------------------------------------------------------
/** Convert time to hh:mm:ss string
 *
 * @param {Date} date - time which we want to convert
 *
 * @return {str} hh:mm:ss string in local time
 */
function format_as_hh_mm_ss(date)
{
  return As_HH_MM_SS.format(date);
}
