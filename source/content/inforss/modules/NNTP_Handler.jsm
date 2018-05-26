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
// NNTP_Handler
// Author : Tom Tanner 2018
// Inforss extension
//------------------------------------------------------------------------------
/* jshint globalstrict: true */
"use strict";

//This module provides a news protocol handler. As a class rather than a
//protocol, currently

/* exported EXPORTED_SYMBOLS */
var EXPORTED_SYMBOLS = [
    "NNTP_Handler", /* exported NNTP_Handler */
];

//Implements a  fairly simple news reader service, per RFC3977
//See RFC 5538 for news: URIs
//See RFC 1342, 2045 for printable quoted decoding/encoding (not implemented yet)
var inforss = inforss || {};

Components.utils.import("chrome://inforss/content/modules/Prompt.jsm", inforss);

Components.utils.import("chrome://inforss/content/modules/Version.jsm", inforss);

const InputStreamPump = Components.Constructor(
  "@mozilla.org/network/input-stream-pump;1",
  "nsIInputStreamPump",
  "init");

const TransportService = Components.classes[
  "@mozilla.org/network/socket-transport-service;1"].getService(
  Components.interfaces.nsISocketTransportService);

const ScriptableInputStream = Components.Constructor(
  "@mozilla.org/scriptableinputstream;1",
  "nsIScriptableInputStream",
  "init");

/** This class basically provides a way of getting information from an NNTP
 * server.
 *
 * Construct with a news url as per RFC5538 (don't currently support article
 * IDs and you must supply a non-wildcarded group, but we allow port numbers).
 *
 * user and password default to null if not supplied.
 *
 */
function NNTP_Handler(url, user, passwd)
{
  if (! url.startsWith("news://") || url.lastIndexOf("/") == 6)
  {
    throw Error("Invalid URL: " + url);
  }

  const newsHost = url.substring(7, url.lastIndexOf("/"));
  this.group = url.substring(url.lastIndexOf("/") + 1);

  const index = newsHost.indexOf(":");
  if (index == -1)
  {
    this.host = newsHost;
    this.port = 119;
  }
  else
  {
    this.host = newsHost.substring(0, index);
    this.port = newsHost.substring(index + 1);
  }

  this.user = user;
  this.passwd = passwd;

  this.opened = false;

  this._promises = [];

  return this;
}

Object.assign(NNTP_Handler.prototype, {

  //Set up the connection and return the group info
  open()
  {
    this.transport = TransportService.createTransport(null, 0, this.host, this.port, null);
    this.transport.setTimeout(0, 3000); //not sure if this is connect or r/w
    this.outstream = this.transport.openOutputStream(0, 0, 0);
    this.instream = this.transport.openInputStream(0, 0, 0);
    this.scriptablestream = new ScriptableInputStream(this.instream);

    const promise = new Promise(this._promise.bind(this));

    this.data = "";
    this.pending_lines = [];
    this.multi_lines = [];
    this.is_multi_line = false;
    this.is_overview = false;
    this.opened = true;

    //Start grabbing datums
    const pump = new InputStreamPump(this.instream, -1, -1, 0, 0, false);
    pump.asyncRead(this, null);

    return promise;
  },

  //Does the over command. There are 3 variants
  //OVER article
  //OVER start-
  //OVER start-end
  //So call either with an article number or an object with start/end keys
  over(article)
  {
    const promise = new Promise(this._promise.bind(this));
    if (typeof(article) == 'object')
    {
      this._write("OVER " + article.start + "-" +
                  ('end' in article ? article.end : ""));
    }
    else
    {
      this._write("OVER " + article);
    }
    return promise;
  },

  //Fetch specified article (headers and body)
  fetch_article(article)
  {
    const promise = new Promise(this._promise.bind(this));
    this._write("ARTICLE " + article);
    return promise;
  },

  //Fetch specified article body
  fetch_body(article)
  {
    const promise = new Promise(this._promise.bind(this));
    this._write("BODY " + article);
    return promise;
  },

  //Fetch specified article headers
  fetch_head(article)
  {
    const promise = new Promise(this._promise.bind(this));
    this._write("HEAD " + article);
    return promise;
  },

  //Close the connection
  close()
  {
    if (this.opened)
    {
      this._write("QUIT");
    }
    this.opened = false;
  },

  //This sends a command to the other end and waits for the response
  _write(s)
  {
    const data = s + "\r\n";
    this.outstream.write(data, data.length);
    this.data = "";
  },

  _close()
  {
    this.scriptablestream.close();
    this.transport.close(0);
    this.opened = false;
    //Abort any pending actions
    while (this._promises.length != 0)
    {
      this._promises.shift().reject("nntp.error");
    }
  },

  //Callback from the transport mechanism when we start fetching data.
  //Currently have no use for it.
  onStartRequest(/*request, context*/)
  {
  },

  //Callback when request is completed, so we clean up
  onStopRequest(request, context, status)
  {
    if (!Components.isSuccessCode(status))
    {
      this._close();
    }
  },

  //Got some data from the server. See what to do with it.
  //Note: inputStream and offset are unused.
  onDataAvailable(request, context, inputStream, offset, count)
  {
    const data = this.data + this.scriptablestream.read(count);
    this.pending_lines = this.pending_lines.concat(data.split("\r\n"));
    this.data = this.pending_lines.pop();
    while (this.pending_lines.length != 0)
    {
      let line = this.pending_lines.shift();
      if (this.is_multi_line)
      {
        if (line != ".")
        {
          if (line.startsWith("."))
          {
            line = line.slice(1);
          }
          this.multi_lines.push(line);
          continue;
        }
        this.is_multi_line = false;
        let lines = this.multi_lines;
        this.multi_lines = [];
        if (this.is_overview)
        {
          lines = lines.map(e => e.split("\t"));
          this.is_overview = false;
        }
        this._promises.shift().resolve(lines);
        continue;
      }

      if (line.length <= 4 || line.charAt(3) != ' ')
      {
/**/console.log("invalid response", line)
        this._promises.shift().reject("nntp.error");
        continue;
      }

      const type = line.substr(0, 3)
      switch (type)
      {
        case "200": // WELCOME
          {
            const outputData = this.user == null || this.user == "" ?
                  "GROUP " + this.group :
                  "AUTHINFO USER " + this.user;
            this._write(outputData);
          }
          break;

        case "205": // BYE
          //We are done here.
          this._close();
          break;

        case "211": // GROUP
          {
            const res = data.split(" ");
            this._promises.shift().resolve({number: parseInt(res[1], 10),
                                            lwm: parseInt(res[2], 10),
                                            hwm: parseInt(res[3], 10)});
          }
          break;

        case "220": // ARTICLE
          this.is_multi_line = true;
          break;

        case "221": // HEAD
          this.is_multi_line = true;
          break;

        case "222": //BODY
          this.is_multi_line = true;
          break;

        case "224": //OVERVIEW
          this.is_multi_line = true;
          this.is_overview = true;
          break;

        case "281": // PASS
          this._write("GROUP " + this.group);
          break;

        case "381": // USER
          this._write("AUTHINFO PASS " + this.passwd);
          break;

        case "411": // BAD GROUP
          this._promises.shift().reject("nntp.badgroup");
          break;

        case "423": // NO SUCH ARTICLE
        case "430": // NO SUCH ARTICLE
          this._promises.shift().reject(type);
          break;

        //FIXME these should have their own error.
        //case 480: authentication required
        //case 482: invalid username/password
        default: // default
          this._promises.shift().reject("nntp.error");
      }
    }
  },

  //Handler for promises
  _promise(resolve, reject)
  {
    this._promises.push({resolve: resolve, reject: reject})
  },

});
