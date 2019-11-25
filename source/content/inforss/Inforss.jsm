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
// Inforss
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------
/* jshint globalstrict: true */
/* eslint-disable strict */
"use strict";

/* eslint-disable array-bracket-newline */
/* exported EXPORTED_SYMBOLS */
const EXPORTED_SYMBOLS = [
  "Inforss", /* exported Inforss */
];
/* eslint-enable array-bracket-newline */

const { load_from_server, send_to_server } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Backup.jsm",
  {}
);

const { Config } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Config.jsm",
  {}
);

const { alert } = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Prompt.jsm",
  {}
);

const {
  add_event_listeners,
  open_option_window,
  remove_event_listeners
} = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Utils.jsm",
  {}
);

const {
  get_name,
  initialise_extension
} = Components.utils.import(
  "chrome://inforss/content/modules/inforss_Version.jsm",
  {}
);

const { Mediator } = Components.utils.import(
  "chrome://inforss/content/mediator/inforss_Mediator.jsm",
  {}
);

const { console } = Components.utils.import(
  "resource://gre/modules/Console.jsm",
  {}
);

const PrefService = Components.classes[
  "@mozilla.org/preferences-service;1"].getService(
  Components.interfaces.nsIPrefService);

const InforssPrefs = PrefService.getBranch('inforss.');

const PrefLocalizedString = Components.Constructor(
  "@mozilla.org/pref-localizedstring;1",
  Components.interfaces.nsIPrefLocalizedString
);

const WebContentHandlerRegistrar = Components.classes[
  "@mozilla.org/embeddor.implemented/web-content-handler-registrar;1"].
  getService(Components.interfaces.nsIWebContentHandlerRegistrar);

const WindowMediator = Components.classes[
  "@mozilla.org/appshell/window-mediator;1"].getService(
  Components.interfaces.nsIWindowMediator);

const content_handlers_branch = "browser.contentHandlers.types.";

//WARNING: DO NOT EVER CHANGE THIS!
const inforss_feed_handler_uri =
  "chrome://inforss/content/inforssNewFeed.xul?feed=%s";


/** Get the number of open browser windows
 *
 * @returns {integer} Number of windows
 */
function get_window_count()
{
  let count = 0;
  const enumerator = WindowMediator.getEnumerator(null);
  //FIXME No better way of counting these?
  while (enumerator.hasMoreElements())
  {
    count += 1;
    enumerator.getNext();
  }
  return count;
}

/** Checks if the browser is starting (there is just one window)
 *
 * @returns {boolean} true if so
 */
function is_starting_up()
{
  return get_window_count() == 1;
}

/** Checks if the browser is terminating (there are no windows)
 *
 * @returns {boolean} true if so
 */
function is_shutting_down()
{
  return get_window_count() == 0;
}

/** Contains the code for setting up the extension
 *
 * @param {Document} document - the window document
 * @param {Function} callback - called when the mediator is set up.
 */
function Inforss(document, callback)
{
  this._document = document;
  this._callback = callback;
  this._config = null;
  this._mediator = null;

  /* eslint-disable array-bracket-newline */
  this._event_listeners = add_event_listeners(
    this,
    null,
    [ this._document.defaultView, "load", this._window_loaded ]
  );
  /* eslint-enable array-bracket-newline */
}

Object.assign(Inforss.prototype, {

  /** First phase of extension startup. Document has finished loading.
   *
   * ignored @param {LoadEvent} event - window load
   */
  _window_loaded()
  {
    remove_event_listeners(this._event_listeners);

    //At this point we could/should check if the current version is different to
    //the previous version and throw up a web page (or maybe do that in
    //initialise_extension)
    initialise_extension(() => this._addon_info_loaded());
  },

  /** Async callback from Addons Manager - because it totally needs to be
   * asynchronous */
  _addon_info_loaded()
  {
    try
    {
      this._config = new Config();
      Object.preventExtensions(this._config);

      //Load config from ftp server if required
      const serverInfo = this._config.getServerInfo();
      if (is_starting_up())
      {
        //Potentially we might want to do this on updates.
        this._register_content_handlers();

        //FIXME register an observer here for the new feed xul? An issue is that
        //this might disappear

        if (serverInfo.autosync)
        {
          load_from_server(serverInfo, this._start_extension.bind(this));
        }
        else
        {
          this._start_extension();
        }
      }
      else
      {
        this._start_extension();
      }
    }
    catch (err)
    {
      console.log("[InfoRSS] failed to start", err);
      //FIXME get a message
      alert("InfoRSS failed to start: " + err);
    }
  },

  /** Find entry in contentHandlers preference tree and delete duplicates
   *
   * @param {string} type - feed handler type
   * @param {title} title - title to give the handler
   *
   * @returns {boolean} true if the handler was already configured
   */
  _find_content_handler(type, title)
  {
    let found = false;
    const handlers = PrefService.getBranch(
      content_handlers_branch).getChildList("", {});
    //This unfortunately produces a bunch of strings like 0.title, 5.type,
    //3.uri, in no helpful order. I could sort them but why bother.
    for (let handler of handlers)
    {
      if (! handler.endsWith(".uri"))
      {
        continue;
      }

      handler = handler.split(".")[0];
      const branch =
        PrefService.getBranch(content_handlers_branch + handler + ".");
      //TBH I don't know if this is level of paranoia is required.
      if (branch.getPrefType("uri") == branch.PREF_STRING &&
          branch.getCharPref("uri") == inforss_feed_handler_uri &&
          branch.getPrefType("type") == branch.PREF_STRING &&
          branch.getCharPref("type") == type)
      {
        if (found)
        {
          //This is a legacy issue. At one point you could have multiple
          //entries which was definitely confusing and could potentially
          //cause issues.
          branch.deleteBranch("");
        }
        else
        {
          //Change the name to the current name of inforss. This is for
          //people upgrading from v1.4. Note also that these prefs only get
          //read at startup so the name change in options/applications isn't
          //apparent till then. Also there's apparently a bug in basilisk
          //which leaves the title blank.
          const local_title = new PrefLocalizedString();
          local_title.data = title;
          branch.setComplexValue("title",
                                 Components.interfaces.nsIPrefLocalizedString,
                                 local_title);
          found = true;
        }
      }
    }
    return found;
  },

  /** Register content handlers for feeds, podcasts and video podcasts
   *
   * This is basically a mess because the way of doing this is incompatible
   * between browsers for no good reason at all, and the palemoon/basilisk
   * programmers are less than helpful on the subject.
   *
   * In theory this only needs to be done on first install...
   */
  _register_content_handlers()
  {
    const title = get_name();
    const feed_base = "application/vnd.mozilla.maybe";
    for (const feed of [ "", ".audio", ".video" ])
    {
      const type = feed_base + feed + ".feed";

      //Ideally I'd just deregister and then reregister the content handlers,
      //but the deregistration method doesn't seem to work very well, and leaves
      //the prefs lying around (and it doesn't seem to always exist).
      if (this._find_content_handler(type, title))
      {
        continue;
      }

      //We didn't find a preference entry, so register a handler.
      try
      {
        WebContentHandlerRegistrar.registerContentHandler(
          type,
          inforss_feed_handler_uri,
          title,
          null);
      }
      catch (err)
      {
        //For reasons that are unclear, in palemoon, registering the video feed
        //registers the handler, but throws an exception before it manages to
        //write the prefs.
        console.log("Failed to register " + type, err);
      }

      //In basilisk it just doesn't register some prefs at all.
      if (this._find_content_handler(type, title))
      {
        continue;
      }

      //Didn't already find it. Create a new one.
      for (let handler = 0; ; handler += 1)
      {
        const branch =
          PrefService.getBranch(content_handlers_branch + handler + ".");

        if (branch.getPrefType("uri") == branch.PREF_INVALID)
        {
          // Yay. This one is free (or at least as best I can tell it is)
          const local_title = new PrefLocalizedString();
          local_title.data = title;
          branch.setComplexValue(
            "title",
            Components.interfaces.nsIPrefLocalizedString,
            local_title
          );
          branch.setCharPref("uri", inforss_feed_handler_uri);
          branch.setCharPref("type", type);
          break;
        }
      }
    }
  },

  /** gets the option button id for the toolbox pallette
   *
   * @returns {Element} toolbox button elementFromPoint
   */
  _get_toolbox_palette_option_button()
  {
    const button = "inforssBut";
    const node = this._document.getElementById(button);
    if (node != null)
    {
      return node;
    }
    const toolbox = this._document.getElementById("navigator-toolbox");
    for (const item of toolbox.palette.childNodes)
    {
      if (item.id == "inforssBut")
      {
        return item;
      }
    }
    //Note: This might not be applicable in mail client
    throw new Error("Cannot find toolbox palette button");
  },

  /** Config has been loaded from external server, so we can actually start the
   *  extension
   */
  _start_extension()
  {
    try
    {
      this._mediator = new Mediator(this._document, this._config);
      //HACK
      this._callback(this._mediator);

      //Add in event listeners
      /* eslint-disable array-bracket-newline */
      this._event_listeners = add_event_listeners(
        this,
        null,
        [ this._document.defaultView, "unload", this._stop_extension ],
        [ this._get_toolbox_palette_option_button(),
          "click",
          this._display_options ]
      );
      /* eslint-enable array-bracket-newline */
    }
    catch (err)
    {
      console.log("[InfoRSS] failed to start", err);
      //FIXME get a message
      alert("InfoRSS failed to start: " + err);
    }
  },

  /** Shut down the extension. If we're the last instance, save the config on
   * the ftp server
   *
   * ignored @param {UnloadEvent} event - window unload
   */
  _stop_extension()
  {
    remove_event_listeners(this._event_listeners);

    const bartop = this._document.getElementById("inforss-bar-top");
    if (bartop != null)
    {
      InforssPrefs.setBoolPref("toolbar.collapsed", bartop.collapsed);
    }

    this._mediator.dispose();

    if (is_shutting_down())
    {
      const serverInfo = this._config.getServerInfo();
      if (serverInfo.autosync)
      {
        send_to_server(serverInfo, false);
      }
    }
  },

  /** Display the option screen
   *
   * ignored @param {ClickEvent} event - click event
   */
  _display_options()
  {
    open_option_window();
  }
});
