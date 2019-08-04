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
// inforss_Backup
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------

/* jshint globalstrict: true */
/* eslint-disable strict */
"use strict";

/* exported EXPORTED_SYMBOLS */
const EXPORTED_SYMBOLS = [
  "load_from_server", /* exported load_from_server */
  "send_to_server", /* exported send_to_server */
];

const { Config } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Config.jsm",
  {}
);

const { File_Upload } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_File_Upload.jsm",
  {}
);

const { File_Download } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_File_Download.jsm",
  {}
);

const { Headline_Cache } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Headline_Cache.jsm",
  {}
);

const { Notifier } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Notifier.jsm",
  {}
);

const { alert } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Prompt.jsm",
  {}
);

const { get_string } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Version.jsm",
  {}
);

const { console } = Components.utils.import(
  "resource://gre/modules/Console.jsm",
  {}
);

//FIXME Shouldn't we just get the password from the password manager

/** Basically massages supplied URI parts into a URI
 *
 * @param {string} protocol - protocol (e.g. ftp://)
 * @param {string} server - sever name (e.g. mozilla.com)
 * @param {string} directory - directory name on server
 * @param {string} user - user name on server
 * @param {string} password - users password
 *
 * @returns {string} A URL for the directory
 */
function get_remote_path(protocol, server, directory, user, password)
{
  if (! directory.startsWith("/"))
  {
    directory = "/" + directory;
  }
  if (! directory.endsWith("/"))
  {
    directory += "/";
  }
  //FIXME If user is blank should we skip the <user>:password@ bit?
  return protocol + user + ":" + password + "@" + server + directory;
}

/** Pops up a transfer completed toast */
function notify_success()
{
  const notifier = new Notifier();
  notifier.notify("chrome://global/skin/icons/alert-exclam.png",
                  get_string("synchronization"),
                  get_string("remote.success"));
}

//FIXME this should be a promise
/** Load settings from server
 *
 * @param {Object} obj - destructuring parameter
 * @param {string} obj.protocol - protocol (e.g. ftp://)
 * @param {string} obj.server - sever name (e.g. mozilla.com)
 * @param {string} obj.directory - directory name on server
 * @param {string} obj.user - user name on server
 * @param {string} obj.password - users password@
 * @param {Function} upload_callback - function to call once upload is complete
 *                   called with true if OK, otherwise false
 * @param {Function} progress_callback - function to callback to display
 *                   progress. It's pretty meaningless
 */
function load_from_server(
  { protocol, server, directory, user, password },
  upload_callback,
  progress_callback = null)
{
  if (progress_callback == null)
  {
    progress_callback = () => {}; //eslint-disable-line
  }

  const path = get_remote_path(protocol, server, directory, user, password);
  progress_callback(25);

  //FIXME should use es7 in jshintrc but the version on codacy. sigh.
  /* jshint ignore:start */

  //FIXME Could do both these in //lel (though progress bar would have to make
  //sure it didn't go backwards if rdf file was smaller than xml file)

  (async () =>
  {
    try
    {
      const files = [
        Config.get_filepath(),
        Headline_Cache.get_filepath()
      ];

      //This would make some sense as a for loop, creating two promises and
      //then await Promise.all
      const config_file = Config.get_filepath();
      const config_target = config_file.clone();
      config_target.leafName += ".new";
      let ftp = new File_Download(config_target, path + config_file.leafName);
      progress_callback(50);
      await ftp.start();

      const cache_file = Headline_Cache.get_filepath();
      const cache_target = cache_file.clone();
      cache_target.leafName += ".new";
      ftp = new File_Download(cache_target, path + cache_file.leafName);
      progress_callback(75);
      await ftp.start();

      //At this point, we rename both the orig file to <thing>.bak
      //and both the <thing>.new files to <thing>. This gives us the opportunity
      //to cancel (even if the UI currently doesn't)
      for (const file of files)
      {
        const backup = file.clone();
        backup.leafName += ".backup";
        if (backup.exists())
        {
          backup.remove(false);
        }
        file.renameTo(null, backup.leafName);
        const target = file.clone();
        target.leafName += ".new";
        target.renameTo(null, file.leafName);
      }

      notify_success();

      upload_callback(true);
    }
    catch (err)
    {
      console.log(err);
      alert(get_string("remote.error") + "\n" + err);

      //err. why don't we make this whole thing a promise
      upload_callback(false);
    }
  })();
  /* jshint ignore:end */
}

//FIXME I don't think either callback makes sense unless async, so can't we
//deduce it?
//FIXME make this be a promise?
/** Send settings to server
 *
 * @param {Object} obj - destructuring parameter
 * @param {string} obj.protocol - protocol (e.g. ftp://)
 * @param {string} obj.server - sever name (e.g. mozilla.com)
 * @param {string} obj.directory - directory name on server
 * @param {string} obj.user - user name on server
 * @param {string} obj.password - users password
 * @param {boolean} asyncFlag - set to true if doing an async transfer
 * @param {Function} upload_callback - optional function to call once upload is
                     complete. Called with true if OK, otherwise false
 * @param {Function} progress_callback - option function to callback to display
 *                   progress. It's pretty meaningless
 */
function send_to_server(
  { protocol, server, directory, user, password },
  asyncFlag,
  upload_callback = null,
  progress_callback = null)
{
  if (progress_callback == null)
  {
    progress_callback = () => {}; //eslint-disable-line
  }
  if (upload_callback == null)
  {
    upload_callback = () => {}; //eslint-disable-line
  }

  const path = get_remote_path(protocol, server, directory, user, password);
  progress_callback(25);

  //FIXME should use es7 in jshintrc but the version on codacy. sigh.
  /* jshint ignore:start */

  //FIXME Could do both these in //lel (though progress bar would have to make
  //sure it didn't go backwards if rdf file was smaller than xml file) if async

  (async () =>
  {
    try
    {
      let ftp = new File_Upload(Config.get_filepath(),
                                path + Config.get_filepath().leafName);
      progress_callback(50);
      if (asyncFlag)
      {
        await ftp.start(asyncFlag);
      }
      else
      {
        ftp.start(asyncFlag);
      }

      ftp = new File_Upload(Headline_Cache.get_filepath(),
                            path + Headline_Cache.get_filepath().leafName);
      progress_callback(75);
      if (asyncFlag)
      {
        await ftp.start(asyncFlag);
      }
      else
      {
        ftp.start(asyncFlag);
      }

      if (asyncFlag)
      {
        notify_success();
      }
      upload_callback(true);
    }
    catch (err)
    {
      console.log(err);
      if (asyncFlag)
      {
        alert(get_string("remote.error") + "\n" + err);
      }
      //err. why don't we make this whole thing a promise
      upload_callback(false);
    }
  })();

  /* jshint ignore:end */
}
