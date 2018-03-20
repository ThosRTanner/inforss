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
// inforssDebug
// Author : Didier Ernotte 2005
//------------------------------------------------------------------------------

/* exported EXPORTED_SYMBOLS */
var EXPORTED_SYMBOLS = [
  "debug", /* exported debug */
  "traceIn", /* exported traceIn */
  "traceOut" /* exported traceOut */
];

var inforss = {};

//jslint doesn't like this much
//const { console } = Components.utils.import("resource://gre/modules/devtools/Console.jsm", {});
Components.utils.import("resource://gre/modules/devtools/Console.jsm");

Components.utils.import("chrome://inforss/content/modules/inforssPrompt.jsm", inforss);

const prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("inforss.debug.");

const WindowMediator = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);

const traceInConsole = prefs.getBoolPref("traceinconsole");

let debugLevel = 0;

//------------------------------------------------------------------------------
function inforssInspect(obj, filter, functionFlag)
{
  if (!obj)
  {
    let ret = prompt("Enter object", "document");
    obj = eval(ret);
  }

  let temp = "";
  for (let x in obj)
  {
    if ((filter == null) || (x.indexOf(filter) == 0))
    {
      if (functionFlag == null || functionFlag || typeof(obj[x]) != "function")
      {
        temp += x + ": " + obj[x] + "\n";
        if (temp.length > 500)
        {
          inforss.alert(temp);
          temp = '';
        }
      }
    }
  }
  inforss.alert(temp);
}

//-----------------------------------------------------------------------------------------------------
function inforssInspectDump(obj, filter, functionFlag)
{
  if (!obj)
  {
    let ret = prompt("Enter object", "document");
    obj = eval(ret);
  }

  for (let x in obj)
  {
    if (filter == null || x.indexOf(filter) == 0)
    {
      if (functionFlag == null || functionFlag || typeof(obj[x]) != "function")
      {
        dump(x + ": " + obj[x] + "\n");
      }
    }
  }
}

//-----------------------------------------------------------------------------------------------------
function alert_in_headline(str)
{
  let document = WindowMediator.getMostRecentWindow(null).document;
  if (document.getElementById("statusbar-display") != null)
  {
    document.getElementById("statusbar-display").label = str;
  }
}

//-----------------------------------------------------------------------------------------------------
function inforssBigAlert(str)
{
  while (str.length > 0)
  {
    if (str.length > 500)
    {
      inforss.alert(str.substring(0, 500));
      str = str.substring(500);
    }
    else
    {
      inforss.alert(str);
      str = "";
    }
  }
}

//------------------------------------------------------------------------------
function debug(except, obj)
{
  try
  {
    let meth = function_name(this.caller, obj);

    if (prefs.getBoolPref("alert"))
    {
      inforss.alert(meth + " : " + except);
    }
    if (prefs.getBoolPref("log"))
    {
      console.log("Exception in " + meth, except);
    }
    if (prefs.getBoolPref("statusbar"))
    {
      alert_in_headline(meth + " : " + except);
    }
  }
  catch (e)
  {
    console.log("InfoRSS Debug generated exception", e, "for", except, obj);
  }
}

//------------------------------------------------------------------------------
function traceIn(obj)
{
  debugLevel++;
  try
  {
    if (traceInConsole)
    {
      let caller = (new Error()).stack.split("\n")[1];
      dump("inforss: >>> " + "                ".substring(0, debugLevel) + " " + caller + " " + function_name(this.caller, obj) + "(");
      for (let i = 0; i < this.caller.arguments.length; i++)
      {
        if (i != 0)
        {
          dump(", ");
        }
        dump(this.caller.arguments[i]);
      }
      dump(")\n");
    }
  }
  catch (e)
  {
    dump("inforssTraceIn: " + e + "\n");
  }
}

//------------------------------------------------------------------------------
function traceOut(obj)
{
  try
  {
    if (traceInConsole)
    {
      let caller = (new Error()).stack.split("\n")[1];
      dump("inforss: <<< " + "                ".substring(0, debugLevel) + " " + caller + " " + function_name(this.caller, obj) + "\n");
    }
  }
  catch (e)
  {
    dump("inforssTraceOut: " + e + "\n");
  }
  debugLevel--;
}

//------------------------------------------------------------------------------
function function_name(f, obj)
{
  let s = null;
  try
  {
    s = f.toString().match(/function (\w*)/)[1];
    if (s == null || s.length == 0)
    {
      if (obj != null)
      {
        for (let i in obj)
        {
          if (obj[i] == f)
          {
            s = function_name(obj.constructor) + "::" + i;
          }
        }
      }
      if (s == null || s.length == 0)
      {
        s = "anonymous";
      }
    }
  }
  catch (e)
  {
    dump("funcname: " + e);
  }
  return s;
}
