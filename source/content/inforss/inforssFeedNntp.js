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
var inforss = inforss || {};
Components.utils.import("chrome://inforss/content/modules/Debug.jsm", inforss);

/* globals inforssFeed, inforssXMLRepository */
/* globals ScriptableInputStream, InputStreamPump, TransportService */
/* globals inforssNNTPHandler */
/* exported inforssFeedNntp */
function inforssFeedNntp(feedXML, manager, menuItem)
{
  inforssFeed.call(this, feedXML, manager, menuItem);
  return this;
}

inforssFeedNntp.prototype = Object.create(inforssFeed.prototype);
inforssFeedNntp.prototype.constructor = inforssFeedNntp;

Object.assign(inforssFeedNntp.prototype, {

  get_title(item)
  {
    return item.title;
  },

  getCategory(item)
  {
    return "";
  },

  getDescription(item)
  {
    return item.description;
  },

  //starts the nntp fetch - note once it is finished, we should call
  //this.read_headlines with the array of headlines
  start_fetch()
  {
    const url = this.getUrl();
    const user = this.feedXML.getAttribute("user");
    const nntp = new inforssNNTPHandler(
      url, user, inforssXMLRepository.readPassword(url, user));
    nntp.open().then(
      //FIXME I should store the latest article somewhere.
      //Then I could do 'over' from that article, rather than
      //guessing.
      groupinfo => this.read_articles(nntp, groupinfo)
    ).catch(
      e => {
/**/console.log("Error reading feed", url, e)
        this.error = true;
      }
    ).then(
      () => {
/**/console.log("done", this)
        nntp.close();
        this.end_processing();
      }
    );
  },

  read_articles(nntp, group_info)
  {
/**/console.log("read articles", this, nntp, group_info)
    const feed_url = "news://" + nntp.host;
    if (group_info.number == 0)
    {
      return;
    }
    const start = group_info.number > 100 ? group_info.hwm - 100 : group_info.lwm;
    return nntp.over({ start: start, end: group_info.hwm}).then(
      articles => {
      const headlines = [];
      for (let article of articles)
      {
        const headline = {};
        headline.guid = article[4];
        headline.link = feed_url + "/" +
                          encodeURIComponent(article[4].slice(1, -1));
        headline.pubdate = new Date(article[3]);
        headline.title = article[1];
        headline.description = article[1];
        headlines.push(headline);
        //Sort of crapness: if we don't already have the headline in the feed,
        //go fetch the body.
        if (this.findHeadline(feed_url, headline.guid) == null)
        {
          /**/console.log("fetch headline for", feed_url, headline.guid)
          //add promise to array
        }
        else
        {
          /**/console.log("have headline for", feed_url, headline.guid)
        }
        //return all promise
      } //make this bit the .then
      try
      {
/**/console.log(this, nntp, articles, headlines)
        this.process_headlines(headlines);
      }
      catch (e)
      {
        inforss.debug(e);
      }
    });
  },

 //-------------------------------------------------------------------------------------------------------------
  old_start_fetch()
  {
    try
    {
      var i = 0;
      var j = 0;
      var max = 0;
      var subjectData = null;
      var receivedDate = new Date();
      var self = this;
      var tempResult = [];
      var waitForEOM = false;
      var previousData = "";
      var title = this.getTitle();
      var decode = inforssFeedNntp.testValidNntpUrl(this.getUrl());
      var dataListener = {
        onStartRequest: function (/*request, context*/) {},
        onStopRequest: function (/*request, context, status*/) {},
        onDataAvailable: function (request, context, inputStream, offset,
          count)
        {
          var data = previousData + scriptablestream.read(count);
          //Apparently it's necessary to keep recreating the stream, but the
          //documentation on this is somewhat lacking
          var pump = new InputStreamPump(instream, -1, -1, 0, 0, false);
          if ((data.length > 0) && (data.substring(0, 3) == "423"))
          {
            waitForEOM = false;
          }
          if ((waitForEOM == false) || ((data.length > 0) && (data.substring(
              data.length - 5, data.length) == "\r\n.\r\n")))
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
                    if ((self.feedXML.getAttribute("user") != null) &&
                      (self.feedXML.getAttribute("user") != ""))
                    {
                      var outputData = "AUTHINFO USER " + self.feedXML.getAttribute(
                        "user") + "\r\n";
                    }
                    else
                    {
                      var outputData = "GROUP " + decode.group + "\r\n";
                    }
                    outstream.write(outputData, outputData.length);
                    pump.asyncRead(dataListener, null);
                    break;
                  }
                case "381": // USER
                  {
                    var passwd = inforssXMLRepository.readPassword(self.getUrl(),
                      self.feedXML.getAttribute("user"));

                    var outputData = "AUTHINFO PASS " + passwd + "\r\n";
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
                    j = eval(res[3]); //high water
                    max = Math.min(eval(res[1]), 30); //min articles, 30
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
                      scriptablestream.close();
                      instream.close();
                      outstream.close();
                      self.manager.signalReadEnd(self);
                      self.stopFlashingIcon();
                    }
                    break;
                  }
                case "221": // HEAD
                  {
                    subjectData = inforssFeedNntp.inforssParseSubjectDate(data);
                    //dump("j=" + j + " date=" + new Date(subjectData.date) + " suject=" + subjectData.subject + "\n");
                    var outputData = "BODY " + j + "\r\n";
                    waitForEOM = true;
                    //dump("output=" + outputData);
                    outstream.write(outputData, outputData.length);
                    pump.asyncRead(dataListener, null);
                    break;
                  }
                case "222": //BODY
                  {
                    //dump("data BODY de " + j +"=" + data + "\n");
                    var guid = subjectData.subject + self.getUrl() + "?" + j;
                    if (self.findHeadline("news://" + decode.url, guid) == null)
                    {
                      //dump("read addHeadline\n");
                      data = data.substring(0, data.length - 5);
                      data = data.replace(/^222.*$/m, "");
                      //var converter = Components.classes[
                      //  "@mozilla.org/intl/entityconverter;1"].createInstance(
                      //  Components.interfaces.nsIEntityConverter);
                      //                    data = converter.ConvertToEntities(data, 2);
                      data = inforssFeed.htmlFormatConvert(data, false,
                        "text/plain", "text/html");
                      data = data.replace(/^(>>>>.*)$/gm,
                        "<font color='cyan'>$1</font>");
                      data = data.replace(/^(> > > >.*)$/gm,
                        "<font color='cyan'>$1</font>");
                      data = data.replace(/^(>>>.*)$/gm,
                        "<font color='red'>$1</font>");
                      data = data.replace(/^(> > >.*)$/gm,
                        "<font color='red'>$1</font>");
                      data = data.replace(/^(>>.*)$/gm,
                        "<font color='green'>$1</font>");
                      data = data.replace(/^(> >.*)$/gm,
                        "<font color='green'>$1</font>");
                      data = data.replace(/^(>[^>].*)$/gm,
                        "<font color='blue'>$1</font>");
                      data = data.replace(/\n/gm, "<br>");
                      data =
                        "<div style='background-color:#2B60DE; color: white; border-style: solid; border-width:1px; -moz-border-radius: 10px; padding: 6px'><TABLE WIDTH='100%' style='color:white'><TR><TD align='right'><B>From: </B></TD><TD>" +
                        subjectData.from +
                        "</TD></TR><TR><TD align='right'><B>Subject: </B></TD><TD>" +
                        subjectData.subject +
                        "</TD></TR><TR><TD align='right'><B>Date: </B></TD><TD>" +
                        subjectData.date + "</TD></TR></TABLE></div><BR>" +
                        data + "";
                      //                    subjectData.subject = inforssFeed.htmlFormatConvert(subjectData.subject, false, "application/vnd.mozilla.xul+xml", "message/rfc822");
                      //dump("data=" + data);
                      tempResult.unshift(
                      {
                        headline: "(" + title + ") " + subjectData.subject,
                        article: data,
                        publisheddate: new Date(subjectData.date),
                        link: self.getUrl() + "?" + j,
                        category: null
                      });
                    }

                    if (i < max)
                    {
                      var outputData = "HEAD " + (--j) + "\r\n";
                      waitForEOM = true;
                      i++;
                      outstream.write(outputData, outputData.length);
                      pump.asyncRead(dataListener, null);
                    }
                    else
                    {
                      for (i = 0; i < tempResult.length - 1; i++)
                      {
                        if (tempResult[i].publisheddate > tempResult[i +
                            1].publisheddate)
                        {
                          var temp = tempResult[i];
                          tempResult[i] = tempResult[i + 1];
                          tempResult[i + 1] = temp;
                          i = -1;
                        }
                      }
                      for (i = 0; i < tempResult.length; i++)
                      {
                        self.addHeadline(receivedDate,
                          tempResult[i].publisheddate,
                          tempResult[i].headline,
                          tempResult[i].link, //guid
                          tempResult[i].link, //link
                          tempResult[i].article, //description
                          "news://news.videotron.ca", //feed url ???
                          "http://groups.google.com", //feed homepage ???
                          null, //category
                          null, //enclosure url
                          null //enclosure type
                          );
                        tempResult[i] = null;
                      }
                      scriptablestream.close();
                      instream.close();
                      outstream.close();
                      self.manager.signalReadEnd(self);
                      self.stopFlashingIcon();
                    }
                    break;
                  }
                case "423": // NO SUCH ARTICLE
                  {
                    var outputData = "HEAD " + (--j) + "\r\n";
                    waitForEOM = true;
                    outstream.write(outputData, outputData.length);
                    pump.asyncRead(dataListener, null);
                    break;
                  }
                default:
                  {
                    scriptablestream.close();
                    instream.close();
                    outstream.close();
                    self.manager.signalReadEnd(self);
                    self.stopFlashingIcon();
                  }
                }
              }
            }
            catch (ee)
            {
              inforss.debug(ee);
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

      var newsUrl = decode.url;
      var port = 119;
      var index = decode.url.indexOf(":");
      if (index != -1)
      {
        newsUrl = decode.url.substring(0, index);
        port = decode.url.substring(index + 1);
      }

      var transport = TransportService.createTransport(null, 0, newsUrl, port,
        null);

      var outstream = transport.openOutputStream(0, 0, 0);
      var instream = transport.openInputStream(0, 0, 0);
      var scriptablestream = new ScriptableInputStream(instream);
      var pump = new InputStreamPump(instream, -1, -1, 0, 0, false);
      pump.asyncRead(dataListener, null);
    }
    catch (e)
    {
      inforss.debug(e);
    }
  }
});

//Static methods

//-------------------------------------------------------------------------------------------------------------
inforssFeedNntp.inforssParseSubjectDate = function(data)
{
  let subject = null;
  let date = null;
  let from = null;
  try
  {
    subject = /^Subject: (.*)$/m.exec(data);
    if (subject != null)
    {
      subject = inforssFeedNntp.decodeQuotedPrintable(subject[1]);

    }
    date = /^Date: (.*)$/m.exec(data);
    if (date != null)
    {
      date = date[1];
    }
    from = /^From: (.*)$/m.exec(data);
    if (from != null)
    {
      from = from[1];
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
  return {
    date: date,
    subject: subject,
    from: from
  };
};

//-----------------------------------------------------------------------------------------------------
inforssFeedNntp.testValidNntpUrl = function(url)
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
    inforss.debug(e);
  }
  return returnValue;
};

//-----------------------------------------------------------------------------------------------------
inforssFeedNntp.decodeQuotedPrintable = function(str)
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
      returnValue = tmp[1] +
        inforssFeedNntp.decodeQuotedPrintableWithCharSet(tmp[3], tmp[2]) +
        tmp[4];
    }
  }
  catch (e)
  {
    inforss.debug(e);
  }
  //dump("subject=" + returnValue + "\n");
  return returnValue;
};

//-----------------------------------------------------------------------------------------------------
inforssFeedNntp.decodeQuotedPrintableWithCharSet = function(str, charSet)
{
  //dump("str=" + str + "\n");
  //dump("charSet=" + charSet + "\n");
  var returnValue = null;
  var unicodeConverter = Components.classes[
    "@mozilla.org/intl/scriptableunicodeconverter"].createInstance(
    Components.interfaces.nsIScriptableUnicodeConverter);
  unicodeConverter.charset = charSet;
  try
  {
    var tmp = str.match(/^([^=]*)=(..)(.*)$/);
    var code = new Array(1);
    while (tmp != null)
    {
      if (returnValue == null)
      {
        returnValue = unicodeConverter.ConvertToUnicode(tmp[1]) +
          unicodeConverter.Finish();
      }
      else
      {
        returnValue = returnValue + unicodeConverter.ConvertToUnicode(tmp[1]) +
          unicodeConverter.Finish();
      }
      //dump("returnValue=" + returnValue + "\n");
      code[0] = eval("0x" + tmp[2]);
      //dump("code[0]=" + code[0] + "\n");
      //dump("tmp[1]=" + tmp[1] + "\n");
      //dump("tmp[2]=" + tmp[2] + "\n");
      //dump("tmp[3]=" + tmp[3] + "\n");
      returnValue = returnValue + unicodeConverter.convertFromByteArray(
        code, code.length);
      //dump("returnValue=" + returnValue + "\n");
      str = tmp[3];
      tmp = str.match(/^([^=]*)=(..)(.*)$/);
    }
    returnValue = returnValue + unicodeConverter.ConvertToUnicode(str) +
      unicodeConverter.Finish();
  }
  catch (e)
  {
    inforss.debug(e);
  }
  return returnValue;
};
