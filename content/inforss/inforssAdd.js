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
//-------------------------------------------------------------------------------------------------------------
// inforssAdd
// Author : Didier Ernotte 2005
// Inforss extension
//-------------------------------------------------------------------------------------------------------------

/* globals inforssDebug, inforssTraceIn, inforssTraceOut */
Components.utils.import("chrome://inforss/content/modules/inforssDebug.jsm");

var popup = null;
var rss = null;
var group = null;
//-----------------------------------------------------------------------------------------------------
 function init()
 {
  inforssTraceIn();
   try
   {
     popup = window.arguments[0];
     rss = window.arguments[1];
     group = window.arguments[2];
     document.getElementById("inforss.add.title").value = rss.getAttribute("title");
     document.getElementById("inforss.add.url").value = rss.getAttribute("url");
     document.getElementById("inforss.add.link").value = rss.getAttribute("link");
     if (rss.getAttribute("description").length < 70)
     {
       document.getElementById("inforss.add.description").value = rss.getAttribute("description");
     }
     else
     {
       document.getElementById("inforss.add.description").value = rss.getAttribute("description").substring(0,70);
     }
     document.getElementById("inforss.add.icone").src = rss.getAttribute("icon");
     //FIXME - this is icky. where is window.opener coming from.
     //also we should ust get the current title and icon and not faff around.
     var currentRSS = window.opener.getCurrentRSS();
     if (currentRSS != null)
     {
       document.getElementById("inforss.add.current").value = currentRSS.getAttribute("title");
       document.getElementById("inforss.add.image").src = currentRSS.getAttribute("icon");
     }
   }
   catch (e)
   {
     inforssDebug(e);
   }
  inforssTraceOut();
}

//-----------------------------------------------------------------------------------------------------
function newSelected()
{
  inforssTraceIn();
  var returnValue = true;
  window.setTimeout(closeAddDialog,2000);
  window.opener.rssSwitchAll(popup, rss.getAttribute("url"), rss.getAttribute("title"), null);
  returnValue = false;
  inforssTraceOut();
  return returnValue;
}

//-----------------------------------------------------------------------------------------------------
function closeAddDialog()
{
  inforssTraceIn();
  document.getElementById("inforssAdd").cancelDialog();
  inforssTraceOut();
}


