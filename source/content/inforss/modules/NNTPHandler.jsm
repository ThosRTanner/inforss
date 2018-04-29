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
// NNTPHandler
// Author : Tom Tanner 2018
// Inforss extension
//------------------------------------------------------------------------------
///* jshint globalstrict: true */
//"use strict";

////This module provides assorted utilities

///* exported EXPORTED_SYMBOLS */
//var EXPORTED_SYMBOLS = [
    //"NNTPHandler", /* exported NNTPHandler */
//];

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

//const ScriptableInputStream = Components.Constructor(
//  "@mozilla.org/scriptableinputstream;1",
//  "nsIScriptableInputStream",
//  "init");
/* globals ScriptableInputStream */

/** This class basically provides a way of getting information from an NNTP
 * server.
 *
 * Construct with host, port (should be defaulted to 119), group,
 * username and password (both should be optional)
 *
 * current has a validate_group method. This should probably be a constructor
 * argument.
 *
 * Should probably provide get_article method to get next article and close
 * method to finish up
 */
function NNTPHandler(host, port, group, user, passwd)
{
  this.host = host;
  this.port = port;
  this.group = group;
  this.user = user;
  this.passwd = passwd;
  return this;
}

NNTPHandler.prototype = Object.create(NNTPHandler.prototype);
NNTPHandler.prototype.constructor = NNTPHandler;

Object.assign(NNTPHandler.prototype, {

  //Kick off the fetch
  _start()
  {
    this.status_message = null;
    this.transport = TransportService.createTransport(null, 0, this.host, this.port, null);
    this.transport.setTimeout(0, 3000);
    this.outstream = this.transport.openOutputStream(0, 0, 0);
    this.instream = this.transport.openInputStream(0, 0, 0);
    this.scriptablestream = new ScriptableInputStream(this.instream);
    this._pump();
  },

  //Fetch even more data
  _pump()
  {
    //Why do we have to create a new pump every time?
    const pump = new InputStreamPump(this.instream, -1, -1, 0, 0, false);
    pump.asyncRead(this, null);
  },

  //This sends a command to the other end and waits for the response
  _write(s)
  {
     const data = s + "\r\n";
     this.outstream.write(data, data.length);
     this._pump();
  },

  //Callback from the transport mechanism when we start fetching data.
  //Currently have no use for it.
  onStartRequest(request, context)
  {
    /**/console.log("onStartRequest", this, request, context)
  },

  //Callback when request is completed, so we clean up and resolve or reject the
  //current promise.
  onStopRequest(request, context, status)
  {
    /**/console.log("onStopRequest", this, request, context, status)
    this.scriptablestream.close();
    this.transport.close(0);
    this._resolver(this);
  },

  //Got some data from the server. See what to do with it.
  //Note: inputStream and offset are unused.
  onDataAvailable(request, context, inputStream, offset, count)
  {
    const data = this.scriptablestream.read(count);
    const res = data.split(" ");
/**/console.log("onDataAvailable", res)
    if (res.length > 0)
    {
      switch (res[0])
      {
        case "200": // WELCOME
          {
            const outputData = this.user == null || this.user == "" ?
                  "GROUP " + this.group :
                  "AUTHINFO USER " + this.user;
            this._write(outputData);
          }
          return;

        case "205": // BYE
          return;

        case "281": // PASS
          this._write("GROUP " + this.group);
          return;

        case "211": // GROUP
          if (this.validate_group)
          {
            break; //Done
          }
          //process data
          break;

        case "381": // USER
          this._write("AUTHINFO PASS " + this.passwd);
          return;

        case "411": // BAD GROUP
          this.status_message = "nntp.badgroup";
          break;

        //case 480: authentication required
        //case 482: invalid username/password
        default: // default
          /**/console.log("Unexpected nntp response", data);
          this.status_message = "nntp.error";
      }
    }
    else
    {
      /**/console.log("Empty nntp response");
      this.status_message = "nntp.error";
    }
    //Ciao, adios, I'm done
    this._write("QUIT");
  },

  //Handler for promises
  _promise(resolve, reject)
  {
    this._resolver = () => {
      if (this.status_message == null)
      {
        resolve();
      }
      else
      {
        reject(this.status_message);
      }
    }
  },

  //This method purely validates the group.
  validate()
  {
    const promise = new Promise(this._promise.bind(this));
    this.validate_group = true;
    this._start();
    return promise;
  }

});

