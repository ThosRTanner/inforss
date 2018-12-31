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
// inforss_Prompt
// Author : Tom Tanner 2017
//------------------------------------------------------------------------------
/* jshint globalstrict: true */
/* eslint-disable strict */
"use strict";

const {
  get_name,
  get_string
} = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Version.jsm",
  {}
);

//This module provides alert (& so on) wrappers

/* exported EXPORTED_SYMBOLS */
const EXPORTED_SYMBOLS = [
  "alert", /* exported alert */
  "prompt", /* exported prompt */
  "confirm" /* exported confirm */
];

const PromptService = Components.classes[
  "@mozilla.org/embedcomp/prompt-service;1"].getService(
  Components.interfaces.nsIPromptService);

/** Creates a title for popup boxes, with inforss prefix
 *
 * @param {string} supplied - required title string or null
 *
 * @returns {string} expanded string
 */
function make_title(supplied)
{
  let title = get_name();
  if (supplied != null)
  {
    title = title + " - " + get_string(supplied);
  }
  return title;
}

/** Generates an alert box
 *
 * FIXME make this take a string and possibly an extra param as title is as yet
 * unused
 *
 * @param {string} msg - inforss string
 * @param {string} title - optional title (inforss string) to give to box
 */
function alert(msg, title = null)
{
  PromptService.alert(null, make_title(title), msg);
}

/** Generates a prompt box
 *
 * @param {string} msg - inforss string to label input field
 * @param {string} text - initial value in input field
 * @param {string} title - optional title (inforss string) to give to box
 * @param {string} checkmsg - optional inforss string to label checkbox
 *                            (if null pr unspecified, no box)
 * @param {boolean} checkval - optional state for checkbox
 *
 * @returns {object} either a string or an object containing a string and
 *                   a boolean
 */
function prompt(msg, text, title = null, checkmsg = null, checkval = false)
{
  const input = { value: text };
  const checkbox = { value: checkval };
  const res = PromptService.prompt(null,
                                   make_title(title),
                                   get_string(msg),
                                   input,
                                   checkmsg,
                                   checkbox);
  if (! res)
  {
    return null;
  }
  if (checkmsg == null)
  {
    return input.value;
  }
  return { input: input.value, checkbox: checkbox.value };
}

/** Generates a confirmation dialogue
 *
 * @param {string} msg - inforss string
 * @param {string} title - optional title (inforss string) to give to box
 *
 * @returns {boolean} true if user clicked ok, otherwise false
 */
function confirm(msg, title = null)
{
  return PromptService.confirm(null,
                               make_title(title),
                               get_string(msg));
}
