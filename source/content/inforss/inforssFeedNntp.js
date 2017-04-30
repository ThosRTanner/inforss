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
// inforssFeedNntp
// Author : Didier Ernotte 2005
// Inforss extension
//------------------------------------------------------------------------------
/* globals inforssDebug, inforssTraceIn, inforssTraceOut */
Components.utils.import("chrome://inforss/content/modules/inforssDebug.jsm");


// AUTHINFO USER toto => 381
// AUTHINFO PASS toto => 281

function inforssFeedNntp(feedXML, manager, menuItem)
{
  var self = new inforssFeed(feedXML, manager, menuItem);

  //-------------------------------------------------------------------------------------------------------------
  self.start_fetch = function()
  {
    //alert("inforssFeedNntp::readFeed\n");
    inforssTraceIn(this);
    try
    {
      var counter = 0;
      var i = 0;
      var j = 0;
      var max = 0;
      var subjectDate = null;
      var receivedDate = new Date();
      var self1 = this;
      var tempResult = new Array();
      var waitForEOM = false;
      var previousData = "";
      var title = this.getTitle();
      var decode = this.testValidNntpUrl(this.getUrl());
      //alert("url=" + decode.url + " group=" + decode.group + "\n");
      var dataListener = {
        onStartRequest: function(request, context) {},
        onStopRequest: function(request, context, status) {},
        onDataAvailable: function(request, context, inputStream, offset, count)
        {
          var data = previousData + scriptablestream.read(count);
          pump = Components.classes["@mozilla.org/network/input-stream-pump;1"].createInstance(Components.interfaces.nsIInputStreamPump);
          pump.init(instream, -1, -1, 0, 0, false);
          //dump("waitForEOM=" + waitForEOM + "\n");
          //dump("last=" + data.substring(data.length -5, data.length) + "\n");
          if ((data.length > 0) && (data.substring(0, 3) == "423"))
          {
            waitForEOM = false;
          }
          if ((waitForEOM == false) || ((data.length > 0) && (data.substring(data.length - 5, data.length) == "\r\n.\r\n")))
          {
            var res = data.split(" ");
            try
            {
              if (res.length > 0)
              {
                //dump("res=" + res[0] + " i=" + i + " max=" + max + "\n");
                waitForEOM = false;
                switch (res[0])
                {
                  case "200": // WELCOME
                    {
                      if ((self1.feedXML.getAttribute("user") != null) &&
                        (self1.feedXML.getAttribute("user") != ""))
                      {
                        var outputData = "AUTHINFO USER " + self1.feedXML.getAttribute("user") + "\r\n";
                      }
                      else
                      {
                        var outputData = "GROUP " + decode.group + "\r\n";
                      }
                      outstream.write(outputData, outputData.length);
                      //alert("1=" + outputData + "\n");
                      pump.asyncRead(dataListener, null);
                      break;
                    }
                  case "381": // USER
                    {
                      var passwd = inforssXMLRepository.readPassword(self1.getUrl(), self1.feedXML.getAttribute("user"))

                      var outputData = "AUTHINFO PASS " + passwd + "\r\n";
                      //alert("2=" + outputData + "\n");
                      outstream.write(outputData, outputData.length);
                      pump.asyncRead(dataListener, null);
                      break;
                    }
                  case "281": // PASS
                    {
                      var outputData = "GROUP " + decode.group + "\r\n";
                      outstream.write(outputData, outputData.length);
                      pump.asyncRead(dataListener, null);
                      break;
                    }
                  case "211": // GROUP
                    {
                      i = 1;
                      j = eval(res[3]);
                      max = Math.min(eval(res[1]), 30);
                      //alert("max=" + max + "\n");
                      if (max != 0)
                      {
                        //dump("data HEAD de " + j + "\n");
                        var outputData = "HEAD " + j + "\r\n";
                        waitForEOM = true;
                        //dump("output=" + outputData);
                        outstream.write(outputData, outputData.length);
                        pump.asyncRead(dataListener, null);
                      }
                      else
                      {
                        instream.close();
                        outstream.close();
                        self1.manager.signalReadEnd(self1);
                        self1.stopFlashingIcon();
                      }
                      break;
                    }
                  case "221": // HEAD
                    {
                      //alert("data HEAD de " + j +"=" + data + "\n");
                      subjectDate = self1.inforssParseSubjectDate(data);
                      //dump("j=" + j + " date=" + new Date(subjectDate.date) + " suject=" + subjectDate.subject + "\n");
                      var outputData = "BODY " + j + "\r\n";
                      waitForEOM = true;
                      //dump("output=" + outputData);
                      outstream.write(outputData, outputData.length);
                      pump.asyncRead(dataListener, null);
                      delete context;
                      break;
                    }
                  case "222": //BODY
                    {
                      //dump("data BODY de " + j +"=" + data + "\n");
                      if ((self1.findHeadline("news://" + decode.url, subjectDate.subject, self1.getUrl() + "?" + j) == null) && (subjectDate.subject != null))
                      {
                        //dump("read addHeadline\n");
                        data = data.substring(0, data.length - 5);
                        data = data.replace(/^222.*$/m, "");
                        var converter = Components.classes["@mozilla.org/intl/entityconverter;1"].createInstance(Components.interfaces.nsIEntityConverter);
                        //                    data = converter.ConvertToEntities(data, 2);
                        data = inforssFeed.htmlFormatConvert(data, false, "text/plain", "text/html");
                        data = data.replace(/^(>>>>.*)$/gm, "<font color='cyan'>$1</font>");
                        data = data.replace(/^(> > > >.*)$/gm, "<font color='cyan'>$1</font>");
                        data = data.replace(/^(>>>.*)$/gm, "<font color='red'>$1</font>");
                        data = data.replace(/^(> > >.*)$/gm, "<font color='red'>$1</font>");
                        data = data.replace(/^(>>.*)$/gm, "<font color='green'>$1</font>");
                        data = data.replace(/^(> >.*)$/gm, "<font color='green'>$1</font>");
                        data = data.replace(/^(>[^>].*)$/gm, "<font color='blue'>$1</font>");
                        data = data.replace(/\n/gm, "<br>");
                        data = "<div style='background-color:#2B60DE; color: white; border-style: solid; border-width:1px; -moz-border-radius: 10px; padding: 6px'><TABLE WIDTH='100%' style='color:white'><TR><TD align='right'><B>From: </B></TD><TD>" + subjectDate.from + "</TD></TR><TR><TD align='right'><B>Subject: </B></TD><TD>" + subjectDate.subject + "</TD></TR><TR><TD align='right'><B>Date: </B></TD><TD>" + subjectDate.date + "</TD></TR></TABLE></div><BR>" + data + "";
                        //                    subjectDate.subject = inforssFeed.htmlFormatConvert(subjectDate.subject, false, "application/vnd.mozilla.xul+xml", "message/rfc822");
                        //dump("data=" + data);
                        tempResult.unshift(
                        {
                          headline: "(" + title + ") " + subjectDate.subject,
                          article: data,
                          publisheddate: new Date(subjectDate.date),
                          link: self1.getUrl() + "?" + j,
                          category: null
                        });
                      }

                      if (i < max)
                      {

                        var outputData = "HEAD " + (--j) + "\r\n";
                        waitForEOM = true;
                        i++;
                        //dump("data HEAD de " + (j-1) + "   i=" + i + "\n");
                        //dump("output=" + outputData);
                        outstream.write(outputData, outputData.length);
                        pump.asyncRead(dataListener, null);
                        delete context;
                      }
                      else
                      {
                        for (i = 0; i < tempResult.length - 1; i++)
                        {
                          if (tempResult[i].publisheddate > tempResult[i + 1].publisheddate)
                          {
                            var temp = tempResult[i];
                            tempResult[i] = tempResult[i + 1];
                            tempResult[i + 1] = temp;
                            i = -1;
                          }
                        }
                        for (i = 0; i < tempResult.length; i++)
                        {
                          //dump("date=" + tempResult[i].publisheddate + " suject=" + tempResult[i].headline + "\n");
                          self1.addHeadline(receivedDate, tempResult[i].publisheddate, tempResult[i].headline, tempResult[i].link, tempResult[i].link, tempResult[i].article, "news://news.videotron.ca", "http://groups.google.com", null, null, null);
                          tempResult[i] = null;
                        }
                        delete tempResult;
                        instream.close();
                        outstream.close();
                        self1.manager.signalReadEnd(self1);
                        self1.stopFlashingIcon();
                      }
                      break;
                    }
                  case "423": // NO SUCH ARTICLE
                    {
                      var outputData = "HEAD " + (--j) + "\r\n";
                      //dump("(423) data HEAD de " + (j-1) + "\n");
                      waitForEOM = true;
                      //dump("output=" + outputData);
                      outstream.write(outputData, outputData.length);
                      pump.asyncRead(dataListener, null);
                      delete context;
                      break;
                    }
                  default:
                    {
                      instream.close();
                      outstream.close();
                      self1.manager.signalReadEnd(self1);
                      self1.stopFlashingIcon();
                    }
                }
              }
            }
            catch (ee)
            {
              //dump(ee);
            }
            previousData = "";
          }
          else
          {
            previousData = data;
            pump.asyncRead(dataListener, null);
          }
        },
      };

      var transportService = Components.classes["@mozilla.org/network/socket-transport-service;1"].getService(Components.interfaces.nsISocketTransportService);
      var index = decode.url.indexOf(":");
      var newsUrl = decode.url;
      var port = 119;
      if (index != -1)
      {
        newsUrl = decode.url.substring(0, index);
        port = decode.url.substring(index + 1);
      }
      //alert("newsUrl=" + newsUrl + "    port=" + port + "\n");
      var transport = transportService.createTransport(null, 0, newsUrl, port, null);
      var outstream = transport.openOutputStream(0, 0, 0);

      var instream = transport.openInputStream(0, 0, 0);
      var scriptablestream = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance(Components.interfaces.nsIScriptableInputStream);
      scriptablestream.init(instream);
      var pump = Components.classes["@mozilla.org/network/input-stream-pump;1"].createInstance(Components.interfaces.nsIInputStreamPump);
      pump.init(instream, -1, -1, 0, 0, false);
      pump.asyncRead(dataListener, null);

      //dump("end inforssNNTP\n");
    }
    catch (e)
    {
      inforssDebug(e);
    }
  };

  //-------------------------------------------------------------------------------------------------------------
  self.inforssParseSubjectDate = function(data)
  {
    var subject = null;
    var date = null;
    var from = null;
    try
    {
      var subject = /^Subject: (.*)$/m.exec(data);
      if (subject != null)
      {
        //dump("subject=" + subject[1] + "\n");
        subject = this.decodeQuotedPrintable(subject[1]);
        //dump("subject=" + subject + "\n");

      }
      var date = /^Date: (.*)$/m.exec(data);
      if (date != null)
      {
        date = date[1];
      }
      var from = /^From: (.*)$/m.exec(data);
      if (from != null)
      {
        from = from[1];
      }
    }
    catch (e)
    {
      inforssDebug(e);
    }
    //dump("inforssParseSubjectDate date=" + date + "\n");
    //dump("inforssParseSubjectDate subject=" + subject + "\n");
    //dump("inforssParseSubjectDate from=" + from + "\n");
    return {
      date: date,
      subject: subject,
      from: from
    };
  };

  //-----------------------------------------------------------------------------------------------------
  self.testValidNntpUrl = function(url)
  {
    var returnValue = {
      valid: false
    };
    try
    {
      if ((url.indexOf("news://") == 0) && (url.lastIndexOf("/") > 7))
      {
        returnValue = {
          valid: true,
          url: url.substring(7, url.lastIndexOf("/")),
          group: url.substring(url.lastIndexOf("/") + 1)
        };
      }
    }
    catch (e)
    {
      inforssDebug(e);
    }
    return returnValue;
  };

  //-----------------------------------------------------------------------------------------------------
  self.decodeQuotedPrintable = function(str)
  {
    var returnValue = null;
    try
    {
      var tmp = str.match(/^(.*)=\?([^\?]*)\?Q\?(.*)\?=(.*)$/);
      if ((tmp == null) || (tmp.length != 5))
      {
        returnValue = str;
      }
      else
      {
        returnValue = tmp[1] + this.decodeQuotedPrintableWithCharSet(tmp[3], tmp[2]) + tmp[4];
      }
    }
    catch (e)
    {
      inforssDebug(e);
    }
    //dump("subject=" + returnValue + "\n");
    return returnValue;
  };

  //-----------------------------------------------------------------------------------------------------
  self.decodeQuotedPrintableWithCharSet = function(str, charSet)
  {
    //dump("str=" + str + "\n");
    //dump("charSet=" + charSet + "\n");
    var returnValue = null;
    var unicodeConverter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
    unicodeConverter.charset = charSet;
    try
    {
      var tmp = str.match(/^([^=]*)=(..)(.*)$/);
      var code = new Array(1);
      while (tmp != null)
      {
        if (returnValue == null)
        {
          returnValue = unicodeConverter.ConvertToUnicode(tmp[1]) + unicodeConverter.Finish();
        }
        else
        {
          returnValue = returnValue + unicodeConverter.ConvertToUnicode(tmp[1]) + unicodeConverter.Finish();
        }
        //dump("returnValue=" + returnValue + "\n");
        code[0] = eval("0x" + tmp[2]);
        //dump("code[0]=" + code[0] + "\n");
        //dump("tmp[1]=" + tmp[1] + "\n");
        //dump("tmp[2]=" + tmp[2] + "\n");
        //dump("tmp[3]=" + tmp[3] + "\n");
        returnValue = returnValue + unicodeConverter.convertFromByteArray(code, code.length);
        //dump("returnValue=" + returnValue + "\n");
        str = tmp[3];
        tmp = str.match(/^([^=]*)=(..)(.*)$/);
      }
      returnValue = returnValue + unicodeConverter.ConvertToUnicode(str) + unicodeConverter.Finish();
    }
    catch (e)
    {
      inforssDebug(e);
    }
    return returnValue;
  };

  return self;
}
