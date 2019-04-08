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
// inforss_Constants
// Author : Tom Tanner 2019
//------------------------------------------------------------------------------
/* jshint globalstrict: true */
/* eslint-disable strict */
"use strict";

//This module provides some inforss related constants

/* exported EXPORTED_SYMBOLS */
const EXPORTED_SYMBOLS = [
  "INFORSS_DEFAULT_FETCH_TIMEOUT", /* exported INFORSS_DEFAULT_FETCH_TIMEOUT */
  "INFORSS_MAX_SUBMENU", /* exported INFORSS_MAX_SUBMENU */
  "MIME_feed_type", /* exported MIME_feed_type */
  "MIME_feed_url", /* exported MIME_feed_url */
];

//Sadly, you have to use var for exporting symbols
/*jshint varstmt: false*/
/*eslint-disable no-var*/

//FIXME Most of the INFORSS ones should likely be configurable

/* Timeout for feed fetches */
var INFORSS_DEFAULT_FETCH_TIMEOUT = 5000;

//Maximum number of headlines in headline submenu.
var INFORSS_MAX_SUBMENU = 25;

var MIME_feed_type = "application/x-inforss-feed-type";
var MIME_feed_url = "application/x-inforss-feed-url";
/*eslint-enable no-var*/
/*jshint varstmt: true*/
