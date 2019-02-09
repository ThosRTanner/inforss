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
// inforss_factory
// Author : Tom Tanner 2018
//------------------------------------------------------------------------------

/* eslint-disable strict */
/* jshint globalstrict: true */
"use strict";

//This module provides a factory for feed handlers.
//Each handler should register with a type and a function to return a new
//instance of the handler.

/* eslint-disable array-bracket-newline */
/* exported EXPORTED_SYMBOLS */
const EXPORTED_SYMBOLS = [
  "factory", /* exported factory */
];
/* eslint-enable array-bracket-newline */

const factory = {};

factory.feeds = {};

//Register a function which creates a new instance of what is being registered.
//The function is passed 3 parameters and is expected to do a new x(p1, p2, p3)
//p1 = feed xml object
//p2 = manager instance
//p3 = menu instance
factory.register = function register(name, func)
{
  factory.feeds[name] = func;
};

factory.create = function create(feedXML, manager, menuItem, mediator, config)
{
  return new factory.feeds[feedXML.getAttribute("type")](feedXML,
                                                         manager,
                                                         menuItem,
                                                         mediator,
                                                         config);
};
