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
// inforssProtocol
// Author : Didier Ernotte 2006
// Inforss extension
//-------------------------------------------------------------------------------------------------------------
// components defined in this file

// components defined in this file
const INFORSS_FEED_PROT_HANDLER_CONTRACTID 	= "@mozilla.org/network/protocol;1?name=rss";
//Another instance of our id apparentlty? Except this is +1?
const INFORSS_FEED_PROT_HANDLER_CID 		= Components.ID("{f65bf62a-5ffc-4317-9612-38907a779584}");

// components used in this file
const NS_IOSERVICE_CID 				= "@mozilla.org/network/io-service;1"
//{9ac9e770-18bc-11d3-9337-00104ba0fd40}";
const NS_PREFSERVICE_CONTRACTID 	= "@mozilla.org/preferences-service;1";
const URI_CONTRACTID 				= "@mozilla.org/network/simple-uri;1";
const NS_WINDOWWATCHER_CONTRACTID 	= "@mozilla.org/embedcomp/window-watcher;1";
const STREAMIOCHANNEL_CONTRACTID 	= "@mozilla.org/network/stream-io-channel;1";

// interfaces used in this file
const nsIProtocolHandler    		= Components.interfaces.nsIProtocolHandler;
const nsIURI                		= Components.interfaces.nsIURI;
const nsISupports           		= Components.interfaces.nsISupports;
const nsIIOService          		= Components.interfaces.nsIIOService;
const nsIPrefService        		= Components.interfaces.nsIPrefService;
const nsIWindowWatcher      		= Components.interfaces.nsIWindowWatcher;
const nsIChannel            		= Components.interfaces.nsIChannel;


//alert("Pret");

/***** ProtocolHandler *****/

function inforssFeedProtocolHandler(scheme)
{
    this.scheme = scheme;
}

// attribute defaults
inforssFeedProtocolHandler.prototype.defaultPort = -1;
inforssFeedProtocolHandler.prototype.protocolFlags = nsIProtocolHandler.URI_NORELATIVE;

inforssFeedProtocolHandler.prototype.allowPort = function(aPort, aScheme)
{
    return false;
}

inforssFeedProtocolHandler.prototype.newURI = function(aSpec, aCharset, aBaseURI)
{
    var uri = Components.classes[URI_CONTRACTID].createInstance(nsIURI);
    uri.spec = aSpec;
    return uri;
}

inforssFeedProtocolHandler.prototype.newChannel = function(aURI)
{
    /**/console.log("calling newchannel with " + aURI);
    var handle;
    var proxy;
    var prot;

alert(aURI.spec);

    var skip = (aURI.spec.indexOf("feed://") == 0)? "feed://".length : ((aURI.spec.indexOf("feed:") == 0)? "feed:".length : 0);

//dump("newChannel=" + aURI.spec + "\n");
    handle = aURI.spec.substr(skip);
/*
    }else{
        // handle looks like hdl:10000.1/1 or doi:10.1570/Ignatius.J.Reilly
        handle = aURI.spec.substr("doi:".length);
    }

    if( this.scheme === "hdl" ){
        proxy = "http://hdl.handle.net/";
    }

    if( this.scheme === "doi" ){
        proxy = "http://dx.doi.org/";
    }

    dump("scheme= " + prot + " \nhandle= " + handle + "\nproxy= " + proxy);
*/
    var ioServ = Components.classesByID[NS_IOSERVICE_CID].getService();
    ioServ = ioServ.QueryInterface(nsIIOService);
/*
    var uri = ioServ.newURI(proxy+handle, null, null);
    var chan = ioServ.newChannelFromURI(uri);
    return chan;
*/
    //FIXME: Why on earth is it doing this?
   if (aURI.spec == "feed:/favicon.ico")
   {
     //FIXME Obsolete
     return ioServ.newChannel("chrome://inforss/skin/inforss.png", null, null);
   }
   else
   {
//alert("didier");
   	 var observerService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
     observerService.notifyObservers(null,"addFeed", unescape(handle));
     //FIXME Obsolete
     return ioServ.newChannel("data:text/html, " + handle + " has been added to InfoRSS.", null, null);
   }
}


/***** INFORSS_FEED_PROTocolHandlerFactory *****/

function inforssFeedProtocolHandlerFactory(scheme)
{
    this.scheme = scheme;
}

inforssFeedProtocolHandlerFactory.prototype.createInstance = function(outer, iid)
{
    if (outer != null)
    {
      throw Components.results.NS_ERROR_NO_AGGREGATION;
    }

    if (!iid.equals(nsIProtocolHandler) && !iid.equals(nsISupports))
    {
        throw Components.results.NS_ERROR_INVALID_ARG;
    }

    return new inforssFeedProtocolHandler(this.scheme);
}

var factory_inforss = new inforssFeedProtocolHandlerFactory("rss");

/***** InforssModule *****/

var InforssModule = new Object();

InforssModule.registerSelf = function(compMgr, fileSpec, location, type)
{
    compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);

    // register protocol handlers
//alert("register");
    compMgr.registerFactoryLocation(INFORSS_FEED_PROT_HANDLER_CID,
                                    "Inforss Feed Protocol Handler",
                                    INFORSS_FEED_PROT_HANDLER_CONTRACTID,
                                    fileSpec, location, type);

}

InforssModule.unregisterSelf = function(compMgr, fileSpec, location)
{
    compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);

    // unregister our components
    compMgr.unregisterFactoryLocation(INFORSS_FEED_PROT_HANDLER_CID, fileSpec);
}

InforssModule.getClassObject = function(compMgr, cid, iid)
{
    if (!iid.equals(Components.interfaces.nsIFactory))
    {
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
    }

    if (cid.equals(INFORSS_FEED_PROT_HANDLER_CID))
    {
      return factory_inforss;
    }

    throw Components.results.NS_ERROR_NO_INTERFACE;
}

InforssModule.canUnload = function(compMgr)
{
    return true;    // our objects can be unloaded
}

/***** Entrypoint *****/

function NSGetModule(compMgr, fileSpec)
{
    return InforssModule;
}

