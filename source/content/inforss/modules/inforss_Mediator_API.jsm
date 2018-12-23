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
// inforss_Mediator_API
// Author : Tom Tanner 2018
//------------------------------------------------------------------------------
/* jshint globalstrict: true */
/* eslint-disable strict */
"use strict";

//This module provides a way of calling mediator class methods from other
//screens. Note you cannot get return values.
//Ideally this'll become part of the Mediator module so all code dealing with
//it is in one place

/* exported EXPORTED_SYMBOLS */
const EXPORTED_SYMBOLS = [
  "reload", /* exported reload */
  "add_new_feed", /* exported add_new_feed */
  "remove_feeds", /* exported remove_feeds */
  "remote_all_feeds", /* exported remove_all_feeds */
  "clear_headline_cache", /* exported clear_headline_cache */
  "reload_headline_cache", /* exported reload_headline_cache */
  "purge_headline_cache", /* exported purge_headline_cache */
  "start_headline_dump", /* exported start_headline_dump */
  "send_headline_data", /* exported send_headline_data */
  "set_headline_banned", /* exported set_headline_banned */
  "set_headline_viewed", /* exported set_headline_viewed */
];

const ObserverService = Components.classes[
  "@mozilla.org/observer-service;1"].getService(
  Components.interfaces.nsIObserverService);

/** reload
 *
 * Called after new feed has been dragged onto main icon. A bit like adding
 * a new feed but without a feed...
 */
function reload()
{
  ObserverService.notifyObservers(null, "inforss.reload");
}

/** Add a new feed
 *
 * @param {string} feed url
 */
function add_new_feed(feed)
{
  ObserverService.notifyObservers(null, "inforss.add_new_feed", feed);
}

/** Remove specified feeds from headline display
 *
 * @param {array} feeds (as urls)
 */
function remove_feeds(feeds)
{
  ObserverService.notifyObservers(null,
                                  "inforss.remove_feeds",
                                  feeds.join("|"));
}

/** Remove all feeds from headline display */
function remove_all_feeds()
{
  ObserverService.notifyObservers(null,
                                  "inforss.remove_all_feeds",
                                  null);
}

/** clear the headline cache
 *
 * This removes the headline cache entirely
 */
function clear_headline_cache()
{
  ObserverService.notifyObservers(null,
                                  "inforss.clear_headline_cache",
                                  null);
}

/** reload the headline cache from disk */
function reload_headline_cache()
{
  ObserverService.notifyObservers(null,
                                  "inforss.reload_headline_cache",
                                  null);
}

/** purge old entries in the headline cache */
function purge_headline_cache()
{
  ObserverService.notifyObservers(null,
                                  "inforss.purge_headline_cache",
                                  null);
}

/** This requests a dump of all headlines between windows
 *
 * This message is sent to all windows which will then dump all the headline
 * contents for this feed with send_headline_data. This data will then be
 * loaded in each window.
 *
 * @param {string} url of feed
 */
function start_headline_dump(url)
{
  ObserverService.notifyObservers(null,
                                  "inforss.start_headline_dump",
                                  url);
}

/** Response to start_headline_dump
 *
 * @param {string} data - a huge dump of all the headlines
 */
function send_headline_data(data)
{
  ObserverService.notifyObservers(null,
                                  "inforss.send_headline_data",
                                  data);
}

/** Mark a headline banned
 *
 * @param {string} title of headline
 * @param {string} url of headline
 */
function set_headline_banned(title, url)
{
  ObserverService.notifyObservers(null,
                                  "inforss.set_headline_banned",
                                  title.length + "/" + title + url);
}

/** Mark a headline viewed
 *
 * @param {string} title of headline
 * @param {string} url of headline
 */
function set_headline_viewed(title, url)
{
  ObserverService.notifyObservers(null,
                                  "inforss.set_headline_viewed",
                                  title.length + "/" + title + url);
}
