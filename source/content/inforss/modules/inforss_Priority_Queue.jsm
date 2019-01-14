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
// inforss_Priority_Queue
// Author : Tom Tanner 2017
//------------------------------------------------------------------------------
/* jshint globalstrict: true */
/* eslint-disable strict */
"use strict";

/* eslint-disable array-bracket-newline */
/* exported EXPORTED_SYMBOLS */
const EXPORTED_SYMBOLS = [
  "Priority_Queue", /* exported Priority_Queue */
];
/* eslint-enable array-bracket-newline */

/** This provides a very trivial implementation of a priority queue
 * @class
 *
 * Arguably it is inverted back to front as the lowest value in gets popped
 * first, because we're using dates.
*/
function Priority_Queue()
{
  this.data = [];
}

Priority_Queue.prototype = {

  /** Remove all elements in priority queue */
  clear()
  {
    this.data = [];
  },

  /** Returns the top of the queue
   *
   * @returns {object} highest priority element in queue
   */
  get top()
  {
    return this.data[0];
  },

  /** Returns the bottom of the queue
   *
   * @returns {object} lowest priority element in queue
   */
  get bottom()
  {
    return this.data[this.data.length - 1];
  },

  /** Pushes an element into the queue
   *
   * @param {object} element to push
   * @param {integer} priority at which to push
   */
  push(element, priority)
  {
    //FIXME This should take advantage of the array already being sorted to find
    //the correct insertion position with a binary chop. However mostly we
    //insert at the end so this should drop out immediately pretty much every
    //time.
    let i = this.data.length - 1;
    while (i >= 0 && this.data[i][1] > priority)
    {
      i--;
    }
    this.data.splice(i + 1, 0, [element, priority]);
  },

  /** Pops the top element from the queue
   *
   * @returns {object} the late highest priority element
   */
  pop()
  {
    return this.data.shift();
  },

  /** Removes the specified element from the queue
   *
   * @param {object} element to remove
   */
  remove(element)
  {
    const index = this.data.findIndex(elem => elem[0] == element);
    if (index != -1)
    {
      this.data.splice(index, 1);
    }
  },

  /** Find out if an element is in the priority queue
   *
   * @param {object} element to check for
   *
   * @returns {boolean} true if the element is in the queue
   */
  contains(element)
  {
    return this.data.findIndex(elem => elem[0] == element) != -1;
  },

  /** get the length of the queue
   *
   * @returns {integer} length of the queue
   */
  get length()
  {
    return this.data.length;
  }

};
