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
//  "Repository", /* exported Repository */
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

Components.utils.import("chrome://inforss/content/modules/inforss_XML_Request.jsm",
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

const FilePicker = Components.Constructor("@mozilla.org/filepicker;1",
                                          "nsIFilePicker",
                                          "init");

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
    [ "importopml", "click", this._import_opml ],
    [ "exportopml", "click", this._export_opml ],
    [ "repository.location", "click", this._open_config_location ]
  );

  this._aborting = false;
  this._request = null;
}

inforss_Options_Advanced_Repository.prototype = Object.create(inforss.Base.prototype);
inforss_Options_Advanced_Repository.prototype.constructor = inforss_Options_Advanced_Repository;


Object.assign(inforss_Options_Advanced_Repository.prototype, {

  /** Update configuration from tab */
  update()
  {
    //No configuration to update (possibly - see reset)
  },

  /** Close off any in flight requests */
  dispose()
  {
    if (this._request != null)
    {
      this._aborting = true;
      this._request.abort();
    }
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
  async _export_as_livemark(_event)
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
    try
    {
      const max = this._config.get_all().length;
      let count = 0;
      for (const feed of this._config.get_all())
      {
        if (feed.getAttribute("type") == "rss" ||
            feed.getAttribute("type") == "atom")
        {
          LivemarkService.addLivemark({
            title: feed.getAttribute("title"),
            feedURI: inforss.make_URI(feed.getAttribute("url")),
            siteURI: inforss.make_URI(feed.getAttribute("link")),
            parentId: folder,
            index: BookmarkService.DEFAULT_INDEX
          });
          count += 1;
          progress_bar.value = count * 100 / max;
          //This is a small hack to ensure the display updates as we go round
          //the for loop.
          //eslint-disable-next-line no-await-in-loop
          await new Promise(resolve => setTimeout(() => resolve(), 0));
        }
      }
      progress_bar.value = 100;
      inforss.alert(inforss.get_string("export.livemark"));
    }
    catch (err)
    {
      inforss.alert(err);
    }
    finally
    {
      this._document.getElementById("inforss.livemarkDeck").selectedIndex = 0;
    }
  },

  /** Show configuration in browser
   *
   * @param {MouseEvent} _event - click event
   */
  _show_in_browser(_event)
  {
    this._options.open_url("file:///" + inforss.Config.get_filepath().path);
  },

  /** Import OPML file
   *
   * @param {MouseEvent} _event - click event
   */
  async _import_opml(_event)
  {
    const source = this._select_opml_source();
    if (source == null)
    {
      return;
    }
    this._document.getElementById("importProgressBar").value = 0;
    this._document.getElementById("inforss.import.deck").selectedIndex = 1;
    try
    {
      this._request = new inforss.XML_Request(
        {
          method: "GET",
          url: source
        }
      );
      const mode =
        this._document.getElementById('inforss.importopml.mode').selectedIndex;
      await import_from_OPML(await this._request.fetch(), mode);
      inforss.alert(inforss.get_string("opml.read"));
      if (mode == 1)
      {
        //Replace current config with new one and recalculate menu
        this._options.reload_configuration(this._config);
      }
    }
    catch (err)
    {
      console.log(err);
      if (! this._aborting)
      {
        inforss.alert(inforss.get_string("feed.issue"));
      }
    }
    finally
    {
      this._request = null;
      this._document.getElementById("inforss.import.deck").selectedIndex = 0;
    }
  },

  /** Export OPML file
   *
   * @param {MouseEvent} _event - click event
   */
  async _export_opml(_event)
  {
    const filePath = this._select_file(
      Components.interfaces.nsIFilePicker.modeSave,
      inforss.get_string("opml.select.export"));
    if (filePath == null)
    {
      return;
    }
    try
    {
      this._document.getElementById("exportProgressBar").value = 0;
      this._document.getElementById("inforss.exportDeck").selectedIndex = 1;
      await export_to_OPML(filePath);
      inforss.alert(inforss.get_string("opml.saved"));
    }
    catch (err)
    {
      inforss.alert(err);
    }
    finally
    {
      this._document.getElementById("inforss.exportDeck").selectedIndex = 0;
    }
  },

  /** Open configuration location
   *
   * @param {MouseEvent} _event - click event
   */
  _open_config_location(_event)
  {
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
  },

  /** Select an OPML file to load / save
   *
   * @param {integer} mode - filepicker mode
   * @param {string} title - filepicker title
   *
   * @returns {string} file to use or null if user cancelled
   */
  _select_file(mode, title)
  {
    const picker = new FilePicker(this._document.defaultView, title, mode);
    picker.defaultString = "inforss.opml";
    picker.appendFilter(
      inforss.get_string("opml.opmlfile") + " (*xml; *.opml)", "*.xml;*.opml"
    );
    picker.appendFilters(picker.filterXML);
    picker.appendFilters(picker.filterAll);

    const response = picker.show();
    if (response == picker.returnOK || response == picker.returnReplace)
    {
      return picker.file.path;
    }
    return null;
  },

  /** Select input file or location
   *
   * @returns {string} url, or none if user cancelled
   */
  _select_opml_source()
  {
    if (this._document.getElementById('inforss.importopml.from').selectedIndex == 0)
    {
      const file = this._select_file(
        Components.interfaces.nsIFilePicker.modeOpen,
        inforss.get_string("opml.select.import"));
      return file == null ? null : "file:///" + file;
    }
    //sample url: http://hosting.opml.org/dave/spec/subscriptionList.opml
    //see also http://scripting.com/2017/02/10/theAclusFeeds.html
    let url = inforss.prompt("import.url", "http://www.");
    if (url == null || url.value == "")
    {
      return null;
    }
    if (! url.includes("://"))
    {
      url = "http://" + url;
    }
    return url;
  },

});