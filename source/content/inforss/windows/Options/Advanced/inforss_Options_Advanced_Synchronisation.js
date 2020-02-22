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
// inforss_Options_Advanced_Synchronisation
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------

/* exported inforss_Options_Advanced_Synchronisation */

/* eslint-disable array-bracket-newline */
/* exported EXPORTED_SYMBOLS */
//const EXPORTED_SYMBOLS = [
//  "Synchronisation", /* exported Synchronisation */
//];
/* eslint-enable array-bracket-newline */

//Switch off a lot of eslint warnings for now
/* eslint-disable strict, no-empty-function */

//This is all indicative of brokenness

/* eslint-disable-next-line no-use-before-define, no-var */
var inforss = inforss || {}; // jshint ignore: line

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

/*
const { load_from_server, send_to_server } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Backup.jsm",
  {}
);
*/

/** Contains the code for the 'Basic' tab in the option screen
 *
 * @param {XMLDocument} document - the options window this._document
 * @param {Options} options - main options window control
 */
function inforss_Options_Advanced_Synchronisation(document, options)
{
  inforss.Base.call(this, document, options);

  this._export_deck =
    this._document.getElementById("inforss.deck.exporttoremote");
  this._import_deck =
    this._document.getElementById("inforss.deck.importfromremote");

  this._listeners = inforss.add_event_listeners(
    this,
    document,
    [ "repo.synchronize.exporttoremote", "click", this._export_to_remote ],
    [ "repo.synchronize.importfromremote", "click", this._import_from_remote ]
  );
}

inforss_Options_Advanced_Synchronisation.prototype = Object.create(inforss.Base.prototype);
inforss_Options_Advanced_Synchronisation.prototype.constructor = inforss_Options_Advanced_Synchronisation;


Object.assign(inforss_Options_Advanced_Synchronisation.prototype, {

  /** Config has been loaded
   *
   * @param {Config} config - new config
   */
  config_loaded(config)
  {
    //Yechh - use super asap
    inforss.Base.prototype.config_loaded.call(this, config);

    const serverInfo = this._config.getServerInfo();
    this._document.getElementById('inforss.repo.urltype').value =
      serverInfo.protocol;
    this._document.getElementById('ftpServer').value = serverInfo.server;
    this._document.getElementById('repoDirectory').value = serverInfo.directory;
    this._document.getElementById('repoLogin').value = serverInfo.user;
    this._document.getElementById('repoPassword').value = serverInfo.password;
    this._document.getElementById('repoAutoSync').selectedIndex =
      serverInfo.autosync ? 0 : 1;
  },

  /** Validate contents of tab
   *
   * @returns {boolean} true if no invalid filters (i.e. empty text fields)
   */
  validate()
  {
    if (this._document.getElementById('ftpServer').value == "" ||
        this._document.getElementById('repoDirectory').value == "" ||
        this._document.getElementById('repoLogin').value == "" ||
        this._document.getElementById('repoPassword').value == "")
    {
      inforss.alert(inforss.get_string("serverinfo.mandatory"));
      return false;
    }
    return true;
  },

  /** Update configuration from tab */
  update()
  {
    this._config.setServerInfo(
      this._document.getElementById('inforss.repo.urltype').value,
      this._document.getElementById('ftpServer').value,
      this._document.getElementById('repoDirectory').value,
      this._document.getElementById('repoLogin').value,
      this._document.getElementById('repoPassword').value,
      this._document.getElementById('repoAutoSync').selectedIndex == 0
    );
  },

  /** Clicked button to export config and headline cache to remote server
   *
   * @param {MouseEvent} _event - click event
   */
  _export_to_remote(_event)
  {
    if (! this.validate())
    {
      return;
    }
    this._options.disable_updates();
    this._export_deck.selectedIndex = 1;
    this._show_export_progress(0);//FIXME Why not call this as part of send?
    inforss.send_to_server(
      {
        protocol: this._document.getElementById('inforss.repo.urltype').value,
        server: this._document.getElementById('ftpServer').value,
        directory: this._document.getElementById('repoDirectory').value,
        user: this._document.getElementById('repoLogin').value,
        password: this._document.getElementById('repoPassword').value
      },
      true,
      inforss.event_binder(this._export_done, this),
      inforss.event_binder(this._show_export_progress, this)
    );
  },

  /** Show export progress
   *
   * @param {integer} val - progress %
   */
  _show_export_progress(val)
  {
    this._document.getElementById(
      "inforss.repo.synchronize.exporttoremote.exportProgressBar").value = val;
  },

  /** Called when export to server is complete
   *
   * @param {boolean} _status - true if operation completed succesfully
   */
  _export_done(_status)
  {
    this._show_export_progress(100);
    this._export_deck.selectedIndex = 0;
    this._options.disable_updates();
  },

  /** Clicked button to import config and headline cache from remote server
   *
   * @param {MouseEvent} _event - click event
   */
  _import_from_remote(_event)
  {
    if (! this.validate())
    {
      return;
    }
    this._options.disable_updates();
    this._import_deck.selectedIndex = 1;
    this._show_import_progress(0);
    inforss.load_from_server(
      {
        protocol: this._document.getElementById('inforss.repo.urltype').value,
        server: this._document.getElementById('ftpServer').value,
        directory: this._document.getElementById('repoDirectory').value,
        user: this._document.getElementById('repoLogin').value,
        password: this._document.getElementById('repoPassword').value
      },
      inforss.event_binder(this._import_done, this),
      inforss.event_binder(this._show_import_progress, this)
    );
  },

  /** Show import progress
   *
   * @param {integer} val - progress %
   */
  _show_import_progress(val)
  {
    this._document.getElementById(
      "inforss.repo.synchronize.importfromremote.importProgressBar"
    ).value = val;
  },

  /** Called when import from server is complete
   *
   * @param {boolean} _status - true if operation completed succesfully
   */
  _import_done(_status)
  {
    this._show_import_progress(100);
    this._import_deck.selectedIndex = 0;
    this._options.enable_updates();

    //Load our own configuration
    this._options.read_configuration();

    //Kick all windows to reload their configuration.
    inforss.mediator.remove_all_feeds();
    inforss.mediator.reload_headline_cache();
  },

});
