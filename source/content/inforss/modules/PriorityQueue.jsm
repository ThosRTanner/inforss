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
// PriorityQueue
// Author : Tom Tanner 2017
//------------------------------------------------------------------------------
"use strict";

/* exported EXPORTED_SYMBOLS */
var EXPORTED_SYMBOLS = [
    "PriorityQueue", /* exported PriorityQueue */
];

Components.utils.import("resource://gre/modules/devtools/Console.jsm");

/** This provides a very trivial implementation of a priority queue */

function PriorityQueue()
{
  this.data = [];
}

PriorityQueue.prototype = {

clear()
{
  this.data = [];
},

//I think I can just drop this.
dump()
{
  let i = 0;
  for (let item of this.data())
  {
    console.log(i, item);
    ++i;
  }
},

get top()
{
  return this.data[0];
},

push(element, priority)
{
  //FIXME This should take advantage of the array already being sorted to find
  //the correct insertion position.
  //Start at the end. This is a bit arbitrary but at least in the case of a
  //grouped feed, we'll generally be reinserting things pretty near the end.
  if (this.data.length == 0)
  {
    this.data.push([element, priority]);
  }
  else
  {
    let i = this.data.length - 1;
    while (i >= 0&& this.data[i][1] > priority)
    {
      i--;
    }
    this.data.splice(i, 0, [element, priority]);
  }
},

pop()
{
  return this.data.shift();
},

get length()
{
  return this.data.length;
}

};
