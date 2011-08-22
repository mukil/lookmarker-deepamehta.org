
/**
 * todo's: match url's, new notification dialog
 * fixme's: prepare values (e.g. resource titles, ) be aware of ":" and """ for properly for being a valid json entity
**/
var lookmarker = {
  prefManager: undefined,
  serviceHorstPost: undefined,
  dmClient: undefined,
  noteAsHTML: true,
  initialized: false,
  onLoad: function() {
    // initialization code
    // 
    lookmarker.prefManager = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
    lookmarker.serviceHorstPost = lookmarker.prefManager.getCharPref("extensions.lookmarker.service.horstpost");
    lookmarker.noteAsHTML = lookmarker.prefManager.getBoolPref("extensions.lookmarker.notedown.html");
    lookmarker.dmClient = lookmarker.serviceHorstPost + "/index.html";
    // 
    this.strings = document.getElementById("lookmarker-strings");
    this.topicmap_menubar = document.getElementById("topicmap-menubar-popup");
    this.bookmark_menubar = document.getElementById("bookmark-menubar-popup");
    // this.topicmap_menulist = document.getElementById("topicmap-menulist-popup");
    if ( !lookmarker.initialized ) {
      // bookmarks
      getTopicsByType("dm4.contacts.resource", function responseArrived(result) {
        var bookmarks = JSON.parse(result);
        Components.utils.reportError("INFO: loaded " + bookmarks.length + " bookmarks");
        if (bookmark_menubar.childNodes.length > 0) {
          // see the following iterative, interesting code snippet (https://developer.mozilla.org/en/DOM/Node.childNodes)
          while (bookmark_menubar.firstChild) {
            //The list is LIVE so it will re-index each call
            bookmark_menubar.removeChild(bookmark_menubar.firstChild);
          }
          Components.utils.reportError("INFO: bookmarks reloaded, so we just cleaned up the bookmark-menubar");
        }
        for (var i = 0; i < bookmarks.length; i++) {
          //
          var bookmark = bookmarks[i];
          var somemark = document.createElement("menuitem");
          // 
          somemark.setAttribute("label", bookmark.value);
          somemark.setAttribute("value", bookmark.id);
          somemark.setAttribute("oncommand", lookmarker.onOpenBookmark(undefined));
          // 
          bookmark_menubar.appendChild(somemark);
          // });
        }
      });
      // 
      // maps
      getTopicsByType("dm4.topicmaps.topicmap", function responseArrived(result) {
        var topicmaps = JSON.parse(result);
        Components.utils.reportError("INFO: loaded " + topicmaps.length + " maps");
        if (topicmap_menubar.childNodes.length > 0) {
          // see the following iterative, interesting code snippet (https://developer.mozilla.org/en/DOM/Node.childNodes)
          while (topicmap_menubar.firstChild) {
            //The list is LIVE so it will re-index each call
            topicmap_menubar.removeChild(topicmap_menubar.firstChild);
          }
          Components.utils.reportError("INFO: topicmaps reloaded, so we just cleaned up the topicmap-menubar");
        }
        for (var i = 0; i < topicmaps.length; i++) {
          var topicmap = topicmaps[i];
          var someitem = document.createElement("menuitem");
          someitem.setAttribute("label", topicmap.value);
          someitem.setAttribute("value", topicmap.id);
          someitem.setAttribute("oncommand", lookmarker.onOpenTopicmap(undefined));
          topicmap_menubar.appendChild(someitem);
          // topicmap_menulist.appendChild(menuitem);
        }
      });
    }
    // make sure this is called just once..
    lookmarker.initialized = true;
  },
  
  updatePreferences: function(e) { // updates js-client side used variables..
    lookmarker.serviceHorstPost = lookmarker.prefManager.getCharPref("extensions.lookmarker.service.horstpost");
    lookmarker.dmClient = lookmarker.serviceHorstPost + "/index.html";
    lookmarker.noteAsHTML = lookmarker.prefManager.getBoolPref("extensions.lookmarker.notedown.html");
  },

  onMenuItemCommand: function(e) {
    lookmarker.updatePreferences(); // get current service Url of the PreferenceMananger..
    // 
    var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                                  .getService(Components.interfaces.nsIPromptService);
    var selectedText = getCursorSelection();
    var currentUrl = getCurrentURL();
    var title = getCurrentPageTitle();
    if (selectedText == "") {
      // just bookmark this page as a web resource for me..
      lookmarker.onToolbarButtonCommand(e);
    } else {
      var title = getCurrentPageTitle();
      var check = {value: false};                  // default the checkbox to false
      var input = {value: title};                  // default the edit field to Bob
      var noteTitle = promptService.prompt(null, "Title of this Notice", "Give your selection a proper title: ", input, null, check);
      // result is true if OK is pressed, false if Cancel. input.value holds the value of the edit field if "OK" was pressed
      if (noteTitle) {
        // bookmark the resource, take a note and relate both with each other..
        // createRelatedTopicNote(currentUrl, title, selectedText);
        createRelatedTopicNote(currentUrl, input.value, selectedText);
        Components.utils.reportError("INFO: created relate Note: " + input.value + " and Resource ("+currentUrl+") ");
      } else {
        Components.utils.reportError("INFO: associating Note-to-Resource aborted...");
      }
    }
  },

  onToolbarButtonCommand: function(e) {
    lookmarker.updatePreferences(); // get current service Url of the PreferenceMananger..
    var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                                  .getService(Components.interfaces.nsIPromptService);
    var title = getCurrentPageTitle();
    var currentUrl = getCurrentURL();
    var check = {value: false};                  // default the checkbox to false
    var input = {value: title};                  // default the edit field to Bob
    var result = promptService.prompt(null, "Title of this Bookmark", "Give this web resource a proper title: ", input, null, check);
    // result is true if OK is pressed, false if Cancel. input.value holds the value of the edit field if "OK" was pressed
    if (result) {
      // 
      createTopicResource(currentUrl, input.value);
      Components.utils.reportError("INFO: send Info-Note: " + input.value + " ("+currentUrl+") to " + lookmarker.serviceHorstPost);
    } else {
      Components.utils.reportError("INFO: sending Info-Note aborted...");
    }
    
  },
  
  onOpenPreferenceDialog: function(e) {
    lookmarker.serviceHorstPost = lookmarker.prefManager.getCharPref("extensions.lookmarker.service.horstpost");
    var dialogSettings = { service: lookmarker.serviceHorstPost, notedown: lookmarker.noteAsHTML };
    window.openDialog("chrome://lookmarker/content/options.xul", "deepamehta-extension-preferences", "chrome,titlebar,toolbar,centerscreen,modal", this, dialogSettings);
  },
  
  onOpenTopicmap: function(e) {
    lookmarker.updatePreferences(); // get current service Url of the PreferenceMananger..
    if (e != undefined) {
      var topicmapId = e.target.getAttribute("value");
      Components.utils.reportError("open map => " + topicmapId);
      navToTopicmap(topicmapId);
    }  
  },
  
  onOpenBookmark: function(e) {
    lookmarker.updatePreferences(); // get current service Url of the PreferenceMananger..
    if (e != undefined) {
      var bookmark = e.target.getAttribute("value");
      getTopic(bookmark, function(response) {
        var topic = JSON.parse(response, function (key, value) {
          if (value && typeof value === 'string' && key == 'dm4.webbrowser.url') {
            var currentWindow = Components.classes["@mozilla.org/appshell/window-mediator;1"]
              .getService(Components.interfaces.nsIWindowMediator).getMostRecentWindow("navigator:browser");
            currentWindow.window.content.location.href = value;
          }
        });
      });
    }
  }
  
};

// ---
// --- DeepaMehta4 JavaScript XUL Client
// --

/** 
  * 
  **/

function createTopicResource(url, title) {
  //
  var webtopic = '{"uri":"","type_uri":"dm4.contacts.resource","composite":{"dm4.contacts.resource_name":"'+title+'","dm4.webbrowser.url":"'+url+'"}}';
  getTopicByValueAndType('dm4.webbrowser.url', url, function(responseText) {
    //
    if (responseText != undefined) {
      // ### Notify user and load existing Bookmark, may wants to change title/name of URL 
      Components.utils.reportError("URL KNOWN...doing nothing by now => " + responseText);
    } else {
      sendTopicPost(webtopic, getResultingTopicId);
    }
  });
  
  // sendTopicPost(webtopic, getResultingTopicId);
}

function getResultingTopicId(resultData) {
  var topicId = JSON.parse(resultData).id;
  // Components.utils.reportError("TopicResult is available: " + topicId + " but not of interest anymore..);
  lookmarker.initialized = false;
  lookmarker.onLoad(); // reload all bookmarks.
}

/** create a resource and relate the note to it */
var topicToRelate = undefined; // used in the createRelatedTopicHandler..
var topicOrigin = undefined; // ^^
// 
function createRelatedTopicNote(url, notetitle, body) {
  // {"id":2541,"uri":"","type_uri":"dm4.notes.note","composite":{"dm4.notes.title":"Test Yea","dm4.notes.text":"<p>asdasd</p>"}}
  var selectedText = cleanUpForJson(body);
  var notetopic = '{"uri":"","type_uri":"dm4.notes.note","composite":{"dm4.notes.title":"'+notetitle+'","dm4.notes.text":"'+selectedText+'"}}';
  var webtopic = '{"uri":"","type_uri":"dm4.contacts.resource","composite":{"dm4.contacts.resource_name":"'+getCurrentPageTitle()+'","dm4.webbrowser.url":"'+url+'"}}';
  // 
  // mark down other topic to be able to create it after the result arrived for the first topic..
  topicOrigin = notetopic;
  // send resource (first) topic 
  getTopicByValueAndType('dm4.webbrowser.url', url, function(responseText) {
    //
    if (responseText != undefined) {
      Components.utils.reportError("URL-Topic Match!... " + responseText);
      // ### TODO reuse WEBPAGE-Topic instead of URL-Topic
      sendTopicPost(responseText, createRelatedTopicHandler);
    } else {
      sendTopicPost(webtopic, createRelatedTopicHandler);
    }
  });
}



// --
// --- HTTP POST Requests
// --

function sendAssocPost(body, resultHandler) {
    var req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Components.interfaces.nsIXMLHttpRequest);
    var url = lookmarker.serviceHorstPost + "/core/association";
    // ### TODO Components.utils.reportError("sendAssocPOST => \"" + body + "\"");
    req.open("POST", url);
    req.setRequestHeader('Content-Type', 'application/json');
    req.overrideMimeType("application/json;text/plain");
    req.onreadystatechange = function (aEvt) {
      if (req.readyState == 4) {
         if (req.status != 200)
          Components.utils.reportError("AssocPOST failed: " + req.error + ":url:" + url);
         else
          if (resultHandler != undefined) {
            resultHandler(req.responseText);
          }
      }
    };
    req.send(body);
}

function sendTopicPost(body, resultHandler) {
    var req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Components.interfaces.nsIXMLHttpRequest);
    var url = lookmarker.serviceHorstPost + "/core/topic";
    req.open("POST", url);
    req.setRequestHeader('Content-Type', 'application/json');
    req.overrideMimeType("application/json;text/plain");
    req.onreadystatechange = function (aEvt) {
      if (req.readyState == 4) {
         if (req.status != 200)
          Components.utils.reportError("TopicPOST failed: " + req.error + ":url:" + url);
         else
          if ( resultHandler != undefined ) resultHandler(req.responseText);
      }
    };
    req.send(body);
}



// --
// --- Utilities
// --

function cleanUpForJson(text) {
  text = text.toString().replace(/\\/g, "\\\\");
  text = text.toString().replace(/\r/g, "\\r");
  text = text.toString().replace(/\n/g, "\\n");
  text = text.toString().replace(/"/g, "\\\"");
  text = text.toString().replace(/{/g, "\\\{");
  text = text.toString().replace(/}/g, "\\\}");
  return text;
}

/** create the note topic after the talked about resource topic.. */
function createRelatedTopicHandler(resultData) {
  topicToRelate = JSON.parse(resultData); // mark down the resource topic (now with ID) for later usage..
  // 
  if (topicOrigin != undefined) {
    // create the somehow to be related topic
    sendTopicPost(topicOrigin, associateResultHandler);
  } else {
    Components.utils.reportError("*** createRelatedTopicHandler has no topic ("+topicOrigin+") to relate to origin (" + topicToRelate.id + ")");
  }
}

function associateResultHandler(resultData) {
  // topicId of the related topic
  topicOrigin = JSON.parse(resultData);
  // 
  if ( topicToRelate.id != undefined && topicOrigin.id != undefined ) {
    // createAssociation.. between 
    var association = '{"type_uri":"dm4.core.association","role_1":{"topic_id":'+topicOrigin.id+',"role_type_uri":"dm4.core.default"},"role_2":{"topic_id":'+topicToRelate.id+',"role_type_uri":"dm4.core.default"}}';
    sendAssocPost(association);
    Components.utils.reportError("Associating \"" + topicOrigin.value + "\"(id:" + topicOrigin.id + ")  with \"" + topicToRelate.value + "\"(id:" + topicOrigin.id + ")");
    // topicToRelate.id && relatedTopicId..
  }
}



// --
// --- HTTP GET Requests
// --

function getTopicsByType(type_uri, callback) {
    var req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Components.interfaces.nsIXMLHttpRequest);
    var url = lookmarker.serviceHorstPost+"/core/topic/by_type/"+encodeURIComponent(type_uri, "UTF-8");
    req.open("GET", url);
    req.setRequestHeader('Content-Type', 'application/json');
    req.overrideMimeType("application/json;text/plain");
    Components.utils.reportError("INFO: " + lookmarker.serviceHorstPost + "/core/topic/by_type/"+encodeURIComponent(type_uri, "UTF-8"));
    req.onreadystatechange = function (aEvt) {
      if (req.readyState == 4) {
         if(req.status != 200)
          Components.utils.reportError("GET TopicsByType failed: " + req.error);
         else
          callback(req.responseText);
      }
    };
    req.send(null);
}

function getTopicByValueAndType(type_uri, value, callback) {
    var req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Components.interfaces.nsIXMLHttpRequest);
    Components.utils.reportError("DEBUG: url is " + value + " and " + encodeURIComponent(value, "UTF-8"));
    var url = lookmarker.serviceHorstPost+"/core/topic/by_value/" + type_uri + "/" + encodeURIComponent(value, "UTF-8");
    req.open("GET", url);
    req.setRequestHeader('Content-Type', 'application/json');
    req.overrideMimeType("application/json;text/plain");
    Components.utils.reportError("INFO: " + lookmarker.serviceHorstPost + "/core/topic/"+type_uri+"/value/"+encodeURIComponent(value, "UTF-8"));
    req.onreadystatechange = function (aEvt) {
      if (req.readyState == 4) {
        if(req.status != 200) {
          Components.utils.reportError("GET TopicsByTypeAndValue NULL: " + req.status);
          callback(undefined);
        } else {
          callback(req.responseText);
        }
      }
    };
    req.send(null);
}

function getTopic(id, callback) {
    var req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Components.interfaces.nsIXMLHttpRequest);
    var url = lookmarker.serviceHorstPost+"/core/topic/" + id;
    req.open("GET", url);
    req.setRequestHeader('Content-Type', 'application/json');
    req.overrideMimeType("application/json;text/plain");
    Components.utils.reportError("INFO: " + lookmarker.serviceHorstPost + "/core/topic/"+id);
    req.onreadystatechange = function (aEvt) {
      if (req.readyState == 4) {
         if(req.status != 200)
          Components.utils.reportError("GET Topic " + id + " => " + req.error);
         else
          callback(req.responseText);
      }
    };
    req.send(null);
}



// --
// --- little xul handlers
// --

/** getSelectedHTML incl. hyperlinks at level of depth 0 or 1 in the selected dom.. */
function getCursorSelection() {

    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
      .getService(Components.interfaces.nsIWindowMediator);
    var mainWindow = wm.getMostRecentWindow("navigator:browser");
    var tabBrowser = mainWindow.getBrowser();
    var selection = tabBrowser.contentWindow.getSelection();
    // check preferences..
    if ( lookmarker.noteAsHTML ) {
      var range = selection.getRangeAt(0);
      var docFrag = range.cloneContents();
      var noteBody = "";
      // 
      var collection = docFrag.childNodes;
      for( var i = 0; i < collection.length; i++ ) {
        // FIXME: recursive parser for our DocumentFragment 
        // level0 child
        if ( collection[i].nodeName != "#text" ) {
          noteBody += '<' + collection[i].nodeName.toLowerCase() + '';
          if (collection[i].attributes != null) {
            for ( var k = 0; k < collection[i].attributes.length; k++) {
              var attribute = XPCNativeWrapper.unwrap(collection[i].attributes[k]); // thanks to the mozilla add-on forum
              if ( attribute.name == "class" || attribute.name == "style" || 
                  attribute.value == "" || attribute.name == "id" ) {
                // ignore these attributes
              } else {
                if (attribute.name == "href") {
                  attribute.value = autoCompleteHref(attribute.value, docFrag);
                }
                noteBody += ' ' +attribute.name + '="' + attribute.value + '"';
              }
            }
          }
          noteBody += '>';
          // evtl. level 1
          var openEnd = false;
          var childName = "a";
          if (collection[i].childNodes.length >=0) {
            // handle the case if <a>-node- link is directly nested in a let's say <h2>-node..
            var childNode = collection[i].childNodes[0];
            if (childNode.nodeName == "A") {
              noteBody += '<' + childNode.nodeName.toLowerCase() + '';
              if (childNode.attributes != null) {
                for ( var k = 0; k < childNode.attributes.length; k++) {
                  var childAttribute = XPCNativeWrapper.unwrap(childNode.attributes[k]); // thanks to mozilla add-on forum
                  if ( childAttribute.name == "class" || childAttribute.name == "style" 
                      || childAttribute.value == "" || attribute.name == "id" ) {
                    // ignore attribute in all these cases..
                  } else {
                    if (childAttribute.name == "href") {
                      childAttribute.value = autoCompleteHref(childAttribute.value, docFrag);
                    }
                    noteBody += ' ' + childAttribute.name + '="' + childAttribute.value + '"';
                  }
                }
                noteBody += '>';
                openEnd = true;
              }
            }
          }
          noteBody += collection[i].textContent;
          if (openEnd) noteBody += '</' + childName + '>';
          noteBody += '</' + collection[i].nodeName.toLowerCase() + '>';
        } else {
          // just simple text selected..
          noteBody += collection[i].textContent;
        }
      }
      return noteBody;
    } else {
      return selection;
    }
}

function autoCompleteHref(value, docFrag) {
  // deal properly with a lnk
  if ( value.lastIndexOf("http", 0) === 0 ) {
    // fine
    return value;
  } else  { 
    // substitutng
    value = docFrag.baseURI.slice(0, -1) + value; // FIXME currently assuming all baseURIs end on a slash
    // Components.utils.reportError("autocompleting relative URL to " + value);
    return value;
  }
}

function getCurrentURL() {
    var currentWindow = Components.classes["@mozilla.org/appshell/window-mediator;1"]
      .getService(Components.interfaces.nsIWindowMediator).getMostRecentWindow("navigator:browser");
    var currBrowser = currentWindow.getBrowser();
    var currURL = currBrowser.currentURI.spec;
    return currURL;
}

function navToTopicmap(id) {
    var currentWindow = Components.classes["@mozilla.org/appshell/window-mediator;1"]
      .getService(Components.interfaces.nsIWindowMediator).getMostRecentWindow("navigator:browser");
    var navToUrl = lookmarker.dmClient + "?topicmap=" + id;
    currentWindow.window.content.location.href = navToUrl;
}

function getCurrentPageTitle() {
    var currentWindow = Components.classes["@mozilla.org/appshell/window-mediator;1"]
      .getService(Components.interfaces.nsIWindowMediator).getMostRecentWindow("navigator:browser");
    var currBrowser = currentWindow.getBrowser();
    var currTitle = currBrowser.contentTitle;
    return currTitle;
}

window.addEventListener("load", lookmarker.onLoad, false);
