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
 *   Tom Tanner
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
// inforss_Options_Advanced_Repository
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------

/* exported inforss_Options_Advanced_Repository */

/* eslint-disable array-bracket-newline */
/* exported EXPORTED_SYMBOLS */
//const EXPORTED_SYMBOLS = [
//  "Filter", /* exported Filter */
//];
/* eslint-enable array-bracket-newline */

//Switch off a lot of eslint warnings for now
/* eslint-disable strict */

//This is all indicative of brokenness
/* globals setTimeout */

/* eslint-disable-next-line no-use-before-define, no-var */
var inforss = inforss || {}; // jshint ignore:line

Components.utils.import(
  "chrome://inforss/content/modules/inforss_Headline_Cache.jsm",
  inforss);

Components.utils.import("chrome://inforss/content/modules/inforss_Utils.jsm",
                        inforss);

Components.utils.import("chrome://inforss/content/modules/inforss_Prompt.jsm",
                        inforss);

Components.utils.import("chrome://inforss/content/modules/inforss_Version.jsm",
                        inforss);

Components.utils.import(
  "chrome://inforss/content/windows/Options/" +
    "inforss_Options_Base.jsm",
  inforss
);


const BookmarkService = Components.classes[
  "@mozilla.org/browser/nav-bookmarks-service;1"].getService(
  Components.interfaces.nsINavBookmarksService);

const LivemarkService = Components.classes[
  "@mozilla.org/browser/livemark-service;2"].getService(
  Components.interfaces.mozIAsyncLivemarks);

/* globals LocalFile */
//const LocalFile = Components.Constructor("@mozilla.org/file/local;1",
//                                         "nsILocalFile",
//                                         "initWithPath");

/** Contains the code for the 'Basic' tab in the option screen
 *
 * @param {XMLDocument} document - the options window this._document
 * @param {Options} options - main options window for some common code
 */
function inforss_Options_Advanced_Repository(document, options)
{
  inforss.Base.call(this, document, options);

  document.getElementById("inforss.location3").appendChild(
    document.createTextNode(inforss.Config.get_filepath().path)
  );

  document.getElementById("inforss.location4").appendChild(
    document.createTextNode(inforss.Headline_Cache.get_filepath().path)
  );

  this._listeners = inforss.add_event_listeners(
    this,
    document,
    [ "reset", "click", this._reset_config ],
    [ "clear.rdf", "click", this._clear_headline_cache ],
    [ "purge.rdf", "click", this._purge_headline_cache ],
    [ "livemark", "click", this._export_as_livemark ],
    [ "display", "click", this._show_in_browser ],
    //import opml
    //export opml
    [ "repository.location", "click", this._open_config_location ]
  );
}

inforss_Options_Advanced_Repository.prototype = Object.create(inforss.Base.prototype);
inforss_Options_Advanced_Repository.prototype.constructor = inforss_Options_Advanced_Repository;


Object.assign(inforss_Options_Advanced_Repository.prototype, {

  /** Update configuration from tab */
  update()
  {
    //No configuration to update (possibly - see reset)
  },

  /** Reset the configuration
   *
   * @param {MouseEvent} _event - click event
   */
  _reset_config(_event)
  {
    if (inforss.confirm("reset.repository"))
    {
      this._config.read_configuration_from_file(
        inforss.get_resource_file("inforss.default")
      );
      this._options.reload_configuration(this._config);
    }
  },

  /** Clear the headline cache
   *
   * @param {MouseEvent} _event - click event
   */
  _clear_headline_cache(_event)
  {
    if (inforss.confirm("reset.rdf"))
    {
      inforss.mediator.clear_headline_cache();
    }
  },

  /** Purge the headline cache of old entries
   *
   * @param {MouseEvent} _event - click event
   */
  _purge_headline_cache(_event)
  {
    inforss.mediator.purge_headline_cache();
  },

  /** Export all feeds as a live bookmark
   *
   * @param {MouseEvent} _event - click event
   */
  _export_as_livemark(_event)
  {
    const folder_name = "InfoRSS Feeds";
    //I should find if this exists and use that already. This creates multiple
    //folders with the same name.
    const folder = BookmarkService.createFolder(
      BookmarkService.bookmarksMenuFolder,
      folder_name,
      BookmarkService.DEFAULT_INDEX);

    const progress_bar =
      this._document.getElementById("exportLivemarkProgressBar");

    progress_bar.value = 0;
    this._document.getElementById("inforss.livemarkDeck").selectedIndex = 1;

    //Create a list of promises that add a livemark to the folder and sleep
    //to allow the progress bar to update.
    const max = this._config.get_all().length;
    let sequence = Promise.resolve(1);
    for (const feed of this._config.get_all())
    {
      if (feed.getAttribute("type") == "rss" ||
          feed.getAttribute("type") == "atom")
      {
        sequence = sequence.then(
          count => LivemarkService.addLivemark({
            title: feed.getAttribute("title"),
            feedURI: inforss.make_URI(feed.getAttribute("url")),
            siteURI: inforss.make_URI(feed.getAttribute("link")),
            parentId: folder,
            index: BookmarkService.DEFAULT_INDEX
          }).then(
            () =>
            {
              progress_bar.value = count * 100 / max;
              return new Promise(
                resolve =>
                {
                  setTimeout(count2 => resolve(count2 + 1), 0, count);
                }
              );
            }
          )
        );
      }
    }

    sequence.then(() =>
    {
      progress_bar.value = 100;
      inforss.alert(inforss.get_string("export.livemark"));
    }).catch(err =>
    {
      inforss.alert(err);
    }).finally(() =>
    {
      this._document.getElementById("inforss.livemarkDeck").selectedIndex = 0;
    });
  },

  /** Show configuration in browser
   *
   * @param {MouseEvent} _event - click event
   */
  _show_in_browser(_event)
  {
    this._options.open_url("file:///" + inforss.Config.get_filepath().path);
  },

  /** Open configuration location
   *
   * @param {MouseEvent} _event - click event
   */
  _open_config_location(_event)
  {
    const FilePicker = Components.Constructor("@mozilla.org/filepicker;1",
                                              "nsIFilePicker",
                                              "init");

    const picker = new FilePicker(this._document.defaultView,
                                  "",
                                  Components.interfaces.nsIFilePicker.modeOpen);
    picker.appendFilters(picker.filterXML);
    //FIXME Create a string for this.
    picker.appendFilter("RDF files", "*.rdf");
    picker.displayDirectory = new LocalFile(inforss.get_profile_dir().path);
    picker.defaultString = null;
    picker.appendFilters(picker.filterAll);

    picker.show();
  }
});
