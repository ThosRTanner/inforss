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
// inforssNotifier
// Author : Didier Ernotte 2005
// Inforss extension
//-------------------------------------------------------------------------------------------------------------

/* exported inforssNotifier */

function inforssNotifier()
{
  return this;
}

inforssNotifier.prototype =
{
//-------------------------------------------------------------------------------------------------------------
  onAlertFinished : function (url)
  {
    try
    {
      if (url != null)
      {
        inforssHeadlineDisplay.resetPopup(url);
      }
    }
    catch(e)
    {
//	  alert(e);
    }

  },

//-------------------------------------------------------------------------------------------------------------
  onAlertClickCallback : function (aAlertCookie)
  {
//	alert("callback:" + aAlertCookie);
  },

//-------------------------------------------------------------------------------------------------------------
  notify : function (icon, title, text, url)
  {
    inforssTraceIn();
//dump("notify\n");
    var time = new Date();
    var hour = time.getHours();
    if (hour < 10)
    {
      hour = "0" + hour;
    }
    var minute = time.getMinutes();
    if (minute < 10)
    {
      minute = "0" + minute;
    }
    var second = time.getSeconds();
    if (second < 10)
    {
      second = "0" + second;
    }
    var time_string = hour + ":" + minute + ":" + second;
    if (inforssXMLRepository.isPlaySound() == true)
    {
      var sound = Components.classes["@mozilla.org/sound;1"].getService(Components.interfaces.nsISound);
      sound.init();
//dump("sound\n");
      if (navigator.platform == "Win32")
      {
        sound.playSystemSound("Notify");
      }
      else
      {
        sound.beep();
      }
      sound = null;
    }
    var service = Components.classes["@mozilla.org/alerts-service;1"];
    var notifierExists = false;
    if (service != null)
    {
//dump("alert\n");
//dump("icon: " + icon + "\n");
//dump("title: " + title + "\n");
//dump("time: " + time_string + "\n");
//dump("text: " + text + "\n");
//dump("url: " + url + "\n");
      try
      {
        var alerts = Components.classes["@mozilla.org/alerts-service;1"].getService(Components.interfaces.nsIAlertsService);
//      alerts.showAlertNotification(icon, title, time_string + " " + text, false, url, this);
        alerts.showAlertNotification(icon, title, time_string + " " + text, false, "cookie", null);
        notifierExists = true;
      }
      catch (e2)
      {
		notifierExists = false;
	  }

//dump("done\n");
    }
    if (notifierExists == false)
    {
      var divVbox = document.getElementById("inforss.notifier");
      if (divVbox != null)
      {
        var divHbox = document.createElement("hbox");
        divVbox.appendChild(divHbox);
        divHbox.setAttribute("url", url);
        var divImg = document.createElement("image");
        divImg.setAttribute("src", icon);
        divImg.setAttribute("maxwidth","16");
        divImg.setAttribute("maxheight","16");
        divImg.style.maxWidth = "16px";
        divImg.style.maxHeight = "16px";
        divHbox.appendChild(divImg);
        var divLabel = document.createElement("label");
        divLabel.setAttribute("value", time_string + " " + text);
        divHbox.appendChild(divLabel);
        divVbox.parentNode.showPopup(document.getElementById("toolbar-bar"),-1, -1, "context", "topright","bottomright");
      }
      else
      {
        alert(text);
      }
    }
    inforssTraceOut();
  },
}