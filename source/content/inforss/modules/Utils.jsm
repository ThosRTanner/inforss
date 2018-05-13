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
// Utils
// Author : Tom Tanner 2017
//------------------------------------------------------------------------------
/* jshint globalstrict: true */
"use strict";

//This module provides assorted utilities

/* exported EXPORTED_SYMBOLS */
var EXPORTED_SYMBOLS = [
    "replace_without_children", /* exported replace_without_children */
    "remove_all_children", /* exported remove_all_children */
    "make_URI", /* exported make_URI */
];

const IoService = Components.classes[
    "@mozilla.org/network/io-service;1"].getService(
    Components.interfaces.nsIIOService);

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
//Makes a URI from a string
function make_URI(url)
{
  return IoService.newURI(url, null, null);
}