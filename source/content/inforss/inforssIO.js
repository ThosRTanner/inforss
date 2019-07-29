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
// inforssIO
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------

/*jshint browser: true, devel: true */
/*eslint-env browser */

var inforss = inforss || {};
Components.utils.import("chrome://inforss/content/modules/inforss_Config.jsm",
                        inforss);

Components.utils.import("chrome://inforss/content/modules/inforss_Debug.jsm",
                        inforss);

Components.utils.import(
  "chrome://inforss/content/modules/inforss_File_Upload.jsm",
  inforss
);

Components.utils.import(
  "chrome://inforss/content/modules/inforss_File_Download.jsm",
  inforss
);

Components.utils.import("chrome://inforss/content/modules/inforss_Notifier.jsm",
                        inforss);

Components.utils.import("chrome://inforss/content/modules/inforss_Prompt.jsm",
                        inforss);

Components.utils.import("chrome://inforss/content/modules/inforss_Utils.jsm",
                        inforss);

Components.utils.import(
  "chrome://inforss/content/modules/inforss_Headline_Cache.jsm",
  inforss);

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
function inforss_get_remote_path(protocol,
                                 server,
                                 directory,
                                 user,
                                 password)
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

//-------------------------------------------------------------------------------------------------------------
/* exported inforssCopyRemoteToLocal */
function inforssCopyRemoteToLocal(
  { protocol, server, directory, user, password },
  upload_callback,
  progress_callback = null)
{
  if (progress_callback == null)
  {
    progress_callback = () => {}; //eslint-disable-line
  }

  const path = inforss_get_remote_path(protocol,
                                       server,
                                       directory,
                                       user,
                                       password);
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
        inforss.Config.get_filepath(),
        inforss.Headline_Cache.get_filepath()
      ];

      //This would make some sense as a for loop, creating two promises and
      //then await Promise.all
      const config_file = inforss.Config.get_filepath();
      const config_target = config_file.clone();
      config_target.leafName += ".new";
      let ftp = new inforss.File_Download(config_target,
                                          path + config_file.leafName);
      progress_callback(50);
      await ftp.start();

      const cache_file = inforss.Headline_Cache.get_filepath();
      const cache_target = cache_file.clone();
      cache_target.leafName += ".new";
      ftp = new inforss.File_Download(cache_target,
                                      path + cache_file.leafName);
      progress_callback(75);
      await ftp.start();

      //At this point, we rename both the orig file to <thing>.bak
      //and both the <thing>.new files to <thing>. This gives us the opportunity
      //to cancel (even if the UI currently doesn't)
      for (let file of files)
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

      const notifier = new inforss.Notifier();
      notifier.notify("chrome://global/skin/icons/alert-exclam.png",
                      inforss.get_string("synchronization"),
                      inforss.get_string("remote.success"));

      upload_callback(true);
    }
    catch (err)
    {
/**/console.log(err)
      inforss.alert(inforss.get_string("remote.error") + "\n" + err);

      //err. why don't we make this whole thing a promise
      upload_callback(false);
    }
  })();
  /* jshint ignore:end */
}

//-------------------------------------------------------------------------------------------------------------
/* exported inforssCopyLocalToRemote */
//FIXME I don't think either callback makes sense unless async
function inforssCopyLocalToRemote(
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

  const path = inforss_get_remote_path(protocol,
                                       server,
                                       directory,
                                       user,
                                       password);
  progress_callback(25);

  //FIXME should use es7 in jshintrc but the version on codacy. sigh.
  /* jshint ignore:start */

  //FIXME Could do both these in //lel (though progress bar would have to make
  //sure it didn't go backwards if rdf file was smaller than xml file) if async

  (async () =>
  {
    try
    {
      let ftp = new inforss.File_Upload(
        inforss.Config.get_filepath(),
        path + inforss.Config.get_filepath().leafName
      );
      progress_callback(50);
      if (asyncFlag)
      {
        await ftp.start(asyncFlag);
      }
      else
      {
        ftp.start(asyncFlag);
      }

      ftp = new inforss.File_Upload(
        inforss.Headline_Cache.get_filepath(),
        path + inforss.Headline_Cache.get_filepath().leafName);
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
        const notifier = new inforss.Notifier();
        notifier.notify("chrome://global/skin/icons/alert-exclam.png",
                        inforss.get_string("synchronization"),
                        inforss.get_string("remote.success"));
      }
      upload_callback(true);
    }
    catch (err)
    {
      if (asyncFlag)
      {
        inforss.alert(inforss.get_string("remote.error") + "\n" + err);
      }
      //err. why don't we make this whole thing a promise
      upload_callback(false);
    }
  })();

  /* jshint ignore:end */
}
