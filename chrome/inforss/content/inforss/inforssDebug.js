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
// inforssDebug
// Author : Didier Ernotte 2005
// Inforss extension
//-------------------------------------------------------------------------------------------------------------
var gInforssPrefs = null;
var gInforssTrace = null;
var gInforssDebugLevel = 0;
//-----------------------------------------------------------------------------------------------------
function inforssInspect( obj, filter, functionFlag )
{
  if ( ! obj )
  {
    ret = prompt ("Enter object", "document");
    obj = eval(ret);
  }

  var temp = "";
  for (x in obj)
  {
    if (( filter == null) || (x.indexOf(filter) == 0))
    {
      if ((functionFlag == null) || (functionFlag == true) || ((functionFlag == false) && (typeof(obj[x]) != "function")))
      {
        temp += x + ": " + obj[x] + "\n";
        if ( temp.length > 500 )
        {
          alert(temp);temp='';
        }
      }
    }
  }
  alert (temp);
}

//-----------------------------------------------------------------------------------------------------
function inforssInspectDump( obj, filter, functionFlag )
{
  if ( ! obj )
  {
    ret = prompt ("Enter object", "document");
    obj = eval(ret);
  }

  var temp = "";
  for (x in obj)
  {
    if (( filter == null) || (x.indexOf(filter) == 0))
    {
      if ((functionFlag == null) || (functionFlag == true) || ((functionFlag == false) && (typeof(obj[x]) != "function")))
      {
        dump(x + ": " + obj[x] + "\n");
      }
    }
  }
}

//-----------------------------------------------------------------------------------------------------
function inforssAlert(str)
{
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
      alert(str.substring(0,500));
      str = str.substring(500);
    }
    else
    {
      alert(str);
      str = "";
    }
  }
}

//-----------------------------------------------------------------------------------------------------
function inforssDebug(except, obj)
{
  try
  {
  // browser.dom.window.dump.enabled
    var meth = inforssFunctionName(inforssDebug.caller, obj);
    prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("browser.");
    prefs.setBoolPref("dom.window.dump.enabled",true);

    var repository = inforssGetRepositoryAsDom();
    if (repository.firstChild.getAttribute("debug") == "true")
    {
      alert(meth + " : " + except);
    }

    if (repository.firstChild.getAttribute("log") == "true")
    {
      var time = new Date();
      var time_string = time.getHours() + ":" + time.getMinutes() + ":" + time.getSeconds();

      window.dump("[infoRSS " + time_string + "]: " + meth + "/" + except + "\n");
    }

    if (repository.firstChild.getAttribute("statusbar") == "true")
    {
      inforssAlert(meth + " : " + except);
    }
  }
  catch(e)
  {
    dump("Debug: " + e);
  }
}

//-----------------------------------------------------------------------------------------------------
function inforssTraceIn(obj)
{
  gInforssDebugLevel++;
  try
  {
    if (gInforssPrefs == null)
    {
      gInforssPrefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch(null);
      gInforssTrace = (gInforssPrefs.prefHasUserValue("inforss.traceinconsole") == false)? false : gInforssPrefs.getBoolPref("inforss.traceinconsole");
    }
    if (gInforssTrace == true)
    {
      dump(">>> " + "                ".substring(0, gInforssDebugLevel) + inforssFunctionName(inforssTraceIn.caller, obj) + "(");
      for (var i = 0; i < inforssTraceIn.caller.arguments.length; i++)
      {
        if (i != 0)
        {
          dump(", ");
        }
        dump(inforssTraceIn.caller.arguments[i]);
      }
      dump(")\n");
    }
  }
  catch(e)
  {
    dump("inforssTraceIn: " + e + "\n");
  }
}

//-----------------------------------------------------------------------------------------------------
function inforssTraceOut(obj)
{
  try
  {
    if (gInforssPrefs == null)
    {
      gInforssPrefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch(null);
      gInforssTrace = (gInforssPrefs.prefHasUserValue("inforss.traceinconsole") == false)? false : gInforssPrefs.getBoolPref("inforss.traceinconsole");
    }
    if (gInforssTrace == true)
    {
      dump("<<< " + "                ".substring(0,gInforssDebugLevel) + inforssFunctionName(inforssTraceOut.caller, obj) + "\n");
    }
  }
  catch(e)
  {
    dump("inforssTraceOut: " + e + "\n");
  }
  gInforssDebugLevel--;
}

//-----------------------------------------------------------------------------------------------------
function inforssFunctionName(f, obj)
{
  var s = null;
  try
  {
    s = f.toString().match(/function (\w*)/)[1];
    if ((s == null) || (s.length==0))
    {
      if (obj != null)
      {
        for (var i in obj)
        {
          if (obj[i] == f)
          {
            s = inforssFunctionName(obj.constructor) + "::" + i;
          }
        }
      }
      if ((s == null) || (s.length==0))
      {
        s = "annonymous";
      }
    }
  }
  catch(e)
  {
    dump("funcname: " + e);
  }
  return s;
}

//-----------------------------------------------------------------------------------------------------
function inforssStackTrace()
{
  var s = "";
//alert(inforssFunctionName(stacktrace.caller.caller));
  for (var a = arguments.caller; a !=null; a = a.caller)
  {
    s += "->"+inforssFunctionName(a.callee) + "\n";
    if (a.caller == a)
    {
      s += "*";
      break;
    }
  }
  return s;
}