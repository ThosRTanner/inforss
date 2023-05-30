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
// inforssOption
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------

/*jshint browser: true, devel: true */
/*eslint-env browser */

/* exported init */
/** Called from XUL on loading options screen. */
function init()
{
  "use strict";

  try
  {
    // We go through this rigmarole so that when generating the status line for
    // a feed we can get hold of the current status. Mediator.find_feed exists
    // purely for this and we have to make it a global variable in the main
    // code.
    let mediator = null;

    //I'd do this at the top level but it goes horribly wrong on Linux
    const WindowMediator = Components.classes[
      "@mozilla.org/appshell/window-mediator;1"].getService(
      Components.interfaces.nsIWindowMediator);

    const enumerator = WindowMediator.getEnumerator(null);
    while (enumerator.hasMoreElements())
    {
      const win = enumerator.getNext();
      if (win.gInforssMediator != null)
      {
        mediator = win.gInforssMediator;
        break;
      }
    }

    const inforss = {};

    //This also fails if done at the top level in linux.
    Components.utils.import(
      "chrome://inforss/content/windows/inforss_Options.jsm",
      inforss
    );

    //Setting it as an object property stops lint warnings, it's not actually
    //useful.
    inforss.options = new inforss.Options(document, mediator);
  }
  catch (err)
  {
    console.error(err);
  }
}
