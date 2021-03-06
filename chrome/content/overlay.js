
/**
 * FIXME`s prepare values (be also aware of the ":") for json properly, 
 * and already existing URLs should not be used directly to get "Notes" associated... 
 * instead one has to query for the corresponding "Web Resources" of the "URL" and use that instead
 **/

var lookmarker = {
  prefManager: undefined,
  serviceHorstPost: undefined,
  dmClient: undefined,
  noteAsHTML: true,
  initialized: false,
  statusLabel: undefined,
  statusloadError: 'DeepaMehta could not load your data. Is your server running? Are your preferences set correctly?',
  statussavedNotice: 'DeepaMehta saved current URL.',
  statusdoubledURL: 'DeepaMehta already knows this URL, added nothing.',
  statusdoubledNotice: 'DeepaMehta already knows this URL, relating your notice to it.',
  statussavedNote: 'DeepaMehta saved your note related to the current web resource.',
  onLoad: function() {
    // onLoad code
    dump("DEBUG: onLoad is called... ");
    dump("DEBUG: checking for Initial run to place Bookmark/Notice-Button... ");
    if (Application.extensions) {
      firstRun(Application.extensions);
    } else {
      Application.getExtensions(firstRun)
    }

    lookmarker.prefManager = Components.classes["@mozilla.org/preferences-service;1"].
      getService(Components.interfaces.nsIPrefBranch);
    lookmarker.updatePreferences();
    // new placement of our toolbarbutton and new statuslabel // credits to mike.kaply.com for "new add-on bar" blogpost
    var addonBar = document.getElementById("addon-bar");
    if (addonBar) {
      lookmarker.statusLabel = document.getElementById("deepaMehtaStatusLabel");
      // also place the button in the addon-bar
      var addonBarCloseButton = document.getElementById("addonbar-closebutton")
      addonBar.insertItem("lookmarker-toolbar-button", addonBarCloseButton.nextSibling);
      addonBar.collapsed = false;
    }
    // 
    this.strings = document.getElementById("lookmarker-strings");
    this.topicmap_menubar = document.getElementById("topicmap-menubar-popup");
    this.bookmark_menubar = document.getElementById("bookmark-menubar-popup");
    // this.topicmap_menulist = document.getElementById("topicmap-menulist-popup");
    if ( !lookmarker.initialized ) {
      dump("DEBUG: initialization starts ... \n");
      // bookmarks
      lookmarker.populateBookmarks();
      dump("DEBUG: loaded web resources, populated popup-menu ... \n");
      // maps
      lookmarker.populateTopicmaps();
      dump("DEBUG: loaded topic maps, populated popup-menu ... \n");
      dump("DEBUG: initialization ended! \n");
    }
    // make sure this is called just once..
    lookmarker.initialized = true;
  },
  
  // Helper to let this scrip operate on the very latest preference settings
  updatePreferences: function(e) { // updates js-client side used variables..
    lookmarker.serviceHorstPost = lookmarker.prefManager.getCharPref("extensions.lookmarker.service.horstpost");
    lookmarker.dmClient = lookmarker.serviceHorstPost;
    lookmarker.noteAsHTML = lookmarker.prefManager.getBoolPref("extensions.lookmarker.notedown.html");
  },
  
  populateBookmarks: function(e) {
    getTopicsByType("dm4.webbrowser.web_resource", function responseArrived(result) {
      var bookmarks = JSON.parse(result);
      if (bookmark_menubar.childNodes.length > 0) {
        // see the following iterative interesting code snippet (https://developer.mozilla.org/en/DOM/Node.childNodes)
        while (bookmark_menubar.firstChild) {
          //The list is LIVE so it will re-index each call
          bookmark_menubar.removeChild(bookmark_menubar.firstChild);
        }
      }
      bookmarks.items.sort(sortBy('value', false, function(a){return a.toUpperCase()}));
      for (var i = 0; i < bookmarks.items.length; i++) {
        //
        var bookmark = bookmarks.items[i];
        var somemark = document.createElement("menuitem");
        // 
        somemark.setAttribute("label", bookmark.value);
        somemark.setAttribute("value", bookmark.id);
        somemark.setAttribute("oncommand", lookmarker.onOpenBookmark(undefined));
        // 
        bookmark_menubar.appendChild(somemark);
      }
      dump("INFO: " + bookmarks.items.length + " bookmarks loaded" + "\n");
    });
  },
  
  populateTopicmaps: function (e) {
    getTopicsByType("dm4.topicmaps.topicmap", function responseArrived(result) {
      var topicmaps = JSON.parse(result);
      // dump("DEBUG: loaded " + topicmaps.items.length + " maps");
      if (topicmap_menubar.childNodes.length > 0) {
        // see the following iterative interesting code snippet (https://developer.mozilla.org/en/DOM/Node.childNodes)
        while (topicmap_menubar.firstChild) {
          //The list is LIVE so it will re-index each call
          topicmap_menubar.removeChild(topicmap_menubar.firstChild);
        }
      }
      topicmaps.items.sort(sortBy('value', false, function(a){return a.toUpperCase()}));
      for (var i = 0; i < topicmaps.items.length; i++) {
        var topicmap = topicmaps.items[i];
        var someitem = document.createElement("menuitem");

        someitem.setAttribute("label", topicmap.value);
        someitem.setAttribute("value", topicmap.id);
        someitem.setAttribute("oncommand", lookmarker.onOpenTopicmap(undefined));
        topicmap_menubar.appendChild(someitem);
        // topicmap_menulist.appendChild(menuitem);
      }
      dump("INFO: " + topicmaps.items.length + " topic maps loaded" + "\n");
    });
  },
  
  // Webpage Context Menu  - Notice-Item Handler
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
      // FIXME: noteTitle is defined when i wouldn`t expect it.. method call always returns something..
      var noteTitle = promptService.prompt(null, 
        "Title of this Notice", "Give your selection a proper title: ", input, null, check);
      // result is true if OK is pressed, false if Cancel. 
      // input.value holds the value of the edit field if "OK" was pressed
      if (noteTitle) {
        // bookmark the resource, take a note and relate both with each other..
        // createRelatedWebTopic(currentUrl, title, selectedText);
        createRelatedWebTopic(currentUrl, input.value, selectedText);
        // dump("DEBUG: created relate Note: " + input.value + " and Resource ("+currentUrl+") ");
        if (lookmarker.statusLabel != undefined) lookmarker.statusLabel.value = lookmarker.statussavedNote;
      } else {
        dump("ERROR: associating Note-to-Resource aborted...");
        // lookmarker.statusLabel.value = lookmarker.statusnotsavedNote;
      }
    }
  },
  
  // Main Firefox Toolbar - Notice-Button Handler
  onToolbarButtonCommand: function(e) {
    lookmarker.updatePreferences(); // get current service Url of the PreferenceMananger..
    var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
      .getService(Components.interfaces.nsIPromptService);
    var title = getCurrentPageTitle();
    var currentUrl = getCurrentURL();
    var check = {value: false};                  // default the checkbox to false
    var input = {value: title};                  // default the edit field to Bob
    var result = promptService.prompt(null, 
      "Title of this Bookmark", "Give this web resource a proper title: ", input, null, check);
    // result is true if OK is pressed, false if Cancel.
    // input.value holds the value of the edit field if "OK" was pressed
    if (result) {
      // 
      createTopicResource(currentUrl, input.value);
      // dump("DEBUG: send Info-Note: " + input.value + " ("+currentUrl+") to " + lookmarker.serviceHorstPost);
      if (lookmarker.statusLabel != undefined) lookmarker.statusLabel.value = lookmarker.statussavedNotice;
    } else {
      dump("INFO: sending Info-Note aborted by user...");
    }
    
  },
  
  // Preferences Handler - User wants to adjust add-on settings
  onOpenPreferenceDialog: function(e) {
    lookmarker.serviceHorstPost = lookmarker.prefManager.getCharPref("extensions.lookmarker.service.horstpost");
    var dialogSettings = { service: lookmarker.serviceHorstPost, notedown: lookmarker.noteAsHTML };
    window.openDialog("chrome://lookmarker/content/options.xul", 
      "deepamehta-extension-preferences", "chrome,titlebar,toolbar,centerscreen,modal", this, dialogSettings);
  },
  
  onLoadTopicMaps: function(e) {
    lookmarker.populateTopicmaps();
  },
  
  onLoadWebResources: function(e) {
    lookmarker.populateBookmarks();
  },
  
  // DeepaMehta Toolbar Handler - User clicked on a Topic Map-Item
  onOpenTopicmap: function(e) {
    lookmarker.updatePreferences(); // get current service Url of the PreferenceMananger..
    if (e != undefined) {
      var topicmapId = e.target.getAttribute("value");
      // dump("open map => " + topicmapId);
      var navToUrl = lookmarker.dmClient + "/topicmap/" + topicmapId;
      openUrlInNewTabAndMakeTabActive(navToUrl);
    }
  },
  
  // DeepaMehta Toolbar Handler - User clicked on a Web Resource-Item
  onOpenBookmark: function(e) {
    lookmarker.updatePreferences(); // get current service Url of the PreferenceMananger..
    if (e != undefined) {
      var bookmark = e.target.getAttribute("value");
      getTopic(bookmark, function(response) {
        var url;
        var topic = JSON.parse(response, function (key, value) {
          if (value && typeof value === 'string' && key == 'value') {
            // key == 'dm4.webbrowser.url' 
            if (value.lastIndexOf("http", 0) === 0 || value.lastIndexOf("www", 0) === 0 ) {
              // found an efficient string.startsWith() answer from mark byers on stack overflow
              // if this is somewhat like an url.. we keep the last to open it
              url = value;
            }
          }
        });
        openUrlInNewTabAndMakeTabActive(url);
      });
    }
  }
  
};

// ---
// --- DeepaMehta4 JavaScript XUL Client
// --

/** 
 ** called when toolbar "Notice"-Button was pressed
 ** a new web resource may be created..
 **/

function createTopicResource(url, title) {
  //
  var webpageTitle = cleanUpForJson(title);
  var webtopic = '{"uri":"","type_uri":"dm4.webbrowser.web_resource","composite":'
    + '{"dm4.webbrowser.web_resource_description":"'+webpageTitle+'","dm4.webbrowser.url":"'+url+'"}}';
  // checks if topic with given url already exists
  getTopicByValueAndType('dm4.webbrowser.url', url, function(responseText) {
    //
    if (responseText != undefined) {
      // ### Notify user and load existing Bookmark, may wants to change title/name of URL 
      if (lookmarker.statusLabel != undefined) lookmarker.statusLabel.value = lookmarker.statusdoubledURL;
    } else { // undefined => no topic like this known.. go on create it.
      sendTopicPost(webtopic, getResultingTopicId);
    }
  });
}

function getResultingTopicId(resultData) {
  var topicId = JSON.parse(resultData).id;
  // update gui elements in browser..
  lookmarker.populateTopicmaps();
  lookmarker.populateBookmarks();
}

var topicToRelate = undefined; // used in the createRelatedTopicHandler..
var topicOrigin = undefined; // ^^

/** create a resource and relate the note to it */
function createRelatedWebTopic(url, notetitle, body) {
  // 
  var selectedText = cleanUpForJson(body);
  var givenTitle = cleanUpForJson(notetitle);
  var webpageTitle = cleanUpForJson(getCurrentPageTitle());
  // 
  var notetopic = '{"uri":"","type_uri":"dm4.notes.note","composite":{"dm4.notes.title":"'+givenTitle+'",'
   + '"dm4.notes.text":"'+selectedText+'"}}';
  var webtopic = '{"uri":"","type_uri":"dm4.webbrowser.web_resource","composite":'
    + '{"dm4.webbrowser.web_resource_description":"'+webpageTitle+'","dm4.webbrowser.url":"'+url+'"}}';
  // 
  // mark down other topic to be able to create it after the result arrived for the first topic..
  topicOrigin = notetopic;
  // send resource (first) topic 
  getTopicByValueAndType('dm4.webbrowser.url', url, function(responseText) {
    if (responseText != undefined) {
      // just saving the "Notice" and associating it to the just loaded URL.
      // load the corresponding web resource first
      createRelatedTopicHandler(responseText);
    } else {
      sendTopicPost(webtopic, createRelatedTopicHandler);
    }
  });
}



// --
// --- HTTP POST Requests
// --

function sendAssocPost(body, _resultHandler) {
  dump("DEBUG: POST ASSOC => service: " + lookmarker.serviceHorstPost + " noteAsHTML: " + lookmarker.noteAsHTML + "\n");
  var req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
    .createInstance(Components.interfaces.nsIXMLHttpRequest);
  var url = lookmarker.serviceHorstPost + "/core/association";
  req.open("POST", url);
  req.setRequestHeader('Content-Type', 'application/json');
  req.overrideMimeType("application/json;text/plain");
  req.onreadystatechange = function (aEvt) {
    if (req.readyState == 4) {
      if (req.status != 200) {
        dump("ERROR: saving association failed: " + req.error + " URL:" + url + "\n");
      } else {
        if (_resultHandler != undefined) {
          dump("INFO: saved association : " + body + " URL:" + url + "\n");
          _resultHandler(req.responseText);
        }
      }
    }
  };
  req.send(body);
}

function sendTopicPost(body, _resultHandler) {
  dump("DEBUG: POST TOPIC => service: " + lookmarker.serviceHorstPost + " noteAsHTML: " + lookmarker.noteAsHTML + "\n");
  var req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
    .createInstance(Components.interfaces.nsIXMLHttpRequest);
  var url = lookmarker.serviceHorstPost + "/core/topic";
  req.open("POST", url);
  req.setRequestHeader('Content-Type', 'application/json');
  req.overrideMimeType("application/json;text/plain");
  req.onreadystatechange = function (aEvt) {
    if (req.readyState == 4) {
      if (req.status != 200) {
        dump("ERROR: saving topic failed: " + req.error + " URL:" + url + "\n");
      } else {
        if ( _resultHandler != undefined ) {
          dump("INFO: saved topic : " + body + " URL:" + url + "\n");
          _resultHandler(req.responseText);
        }
      }
    }
  };
  req.send(body);
}



// --
// --- Utilities
// --

function cleanUpForJson(text) {
  text = text.toString().replace(/\\/g, "\\\\");
  text = text.toString().replace(/\r/g, "<br/>");
  text = text.toString().replace(/\n/g, "<br/>");
  text = text.toString().replace(/"/g, "\\\"");
  text = text.toString().replace(/{/g, "\\\{");
  text = text.toString().replace(/}/g, "\\\}");
  return text;
}

/** create the note topic after the talked about resource topic.. */
function createRelatedTopicHandler(resultData) {
  topicToRelate = JSON.parse(resultData); // mark down the dm4.webbrowser.url topic (now with ID) for later usage..
  if (topicToRelate.type_uri == "dm4.webbrowser.url") {
    // we want relate to the web resource, not the webbrowser.url
    getRelatedWebResource(resultData, function(web_resource) {
      // 
      topicToRelate = JSON.parse(web_resource).items[0]
      if (topicOrigin != undefined) {
        // create the to be related topic
        sendTopicPost(topicOrigin, associateResultHandler);
      } else {
        alert("ERROR: no dm4.webbrowser.url " + topicToRelate.id + " found where the note could be related to .. skipping");
      }
    });
  } else {
    // topicToRelate to is already a web resource (initial bookmark of web resource with url x)
    if (topicOrigin != undefined) {
        // create the to be related topic
        sendTopicPost(topicOrigin, associateResultHandler);
    } else {
        alert("ERROR: no dm4.webbrowser.url " + topicToRelate.id + " found where the note could be related to .. skipping");
    }
  }
}

/** note: you have to make sure our global topicOrigin var was set before calling  **/
function associateResultHandler(resultData) {
  // get the formerly cached topicId of the related topic
  topicOrigin = JSON.parse(resultData);
  // 
  if ( topicToRelate.id != undefined && topicOrigin.id != undefined ) {
    // build association..
    var association = '{"type_uri":"dm4.core.association","role_1":'
      + '{"topic_id":' + topicOrigin.id + ',"role_type_uri":"dm4.core.default"},"role_2":{"topic_id":'
      + topicToRelate.id + ',"role_type_uri":"dm4.core.default"}}';
    // create association
    sendAssocPost(association);
  } else {
    dump("ERROR: could not associate \"" + topicOrigin.value + "\"(id:" + topicOrigin.id + ")  with \""
      + topicToRelate.value + "\"(id:" + topicOrigin.id + ")");
  }
}



// --
// --- HTTP GET Requests
// --

function getTopicsByType(type_uri, callback) {
    var req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
      .createInstance(Components.interfaces.nsIXMLHttpRequest);
    var url = lookmarker.serviceHorstPost+"/core/topic/by_type/"+encodeURIComponent(type_uri, "UTF-8");
    req.open("GET", url);
    req.setRequestHeader('Content-Type', 'application/json');
    req.overrideMimeType("application/json;text/plain");
    // dump("DEBUG: " + lookmarker.serviceHorstPost + "/core/topic/by_type/"+encodeURIComponent(type_uri, "UTF-8"));
    req.onreadystatechange = function (aEvt) {
      if (req.readyState == 4) {
        if(req.status != 200) {
          if (lookmarker.statusLabel != undefined) lookmarker.statusLabel.value = lookmarker.statusloadError;
        } else {
          callback(req.responseText);
        }
      }
    };
    req.send(null);
}

function getRelatedWebResource(topic, callback) {
    var topic_id = JSON.parse(topic).id;
    var req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
      .createInstance(Components.interfaces.nsIXMLHttpRequest);
    var relatedUrl = lookmarker.serviceHorstPost+"/core/topic/"+ topic_id
      + "/related_topics?others_topic_type_uri=dm4.webbrowser.web_resource";
    req.open("GET", relatedUrl);
    req.setRequestHeader('Content-Type', 'application/json');
    req.overrideMimeType("application/json;text/plain");
    // dump("DEBUG: " + lookmarker.serviceHorstPost + "/core/topic/by_type/"+encodeURIComponent(type_uri, "UTF-8"));
    req.onreadystatechange = function (aEvt) {
      if (req.readyState == 4) {
        if(req.status != 200) {
          if (lookmarker.statusLabel != undefined) lookmarker.statusLabel.value = "Could not load related Web Resource from: " + relatedUrl;
        } else {
          callback(req.responseText);
        }
      }
    };
    req.send(null);
}

/** if a topic of given type with given value is already known to dm, it is returned.. 
 ** otheriwse call given like: handler(undefined)..
 **/
function getTopicByValueAndType(type_uri, value, callback) {
    var req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
      .createInstance(Components.interfaces.nsIXMLHttpRequest);
    var url = lookmarker.serviceHorstPost+"/core/topic/by_value/" + type_uri + "/" + encodeURIComponent(value, "UTF-8");
    req.open("GET", url);
    req.setRequestHeader('Content-Type', 'application/json');
    req.overrideMimeType("application/json;text/plain");
    req.onreadystatechange = function (aEvt) {
      if (req.readyState == 4) {
        if(req.status == 500) { // AMBIGUITY ERROR
          // internal server error... not saving URL again..
          if (lookmarker.statusLabel != undefined) lookmarker.statusLabel.value = lookmarker.statusloadError;
        } else if (req.status != 200) { // NOTHING FOUND
          callback(undefined); // save URL
        } else if (req.status == 200) { // OK
          callback(req.responseText); // pass identified, loaded topic to firefox ui..
        }
      }
    };
    req.send(null);
}

function getTopic(id, callback) {
    var req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"]
      .createInstance(Components.interfaces.nsIXMLHttpRequest);
    var url = lookmarker.serviceHorstPost+"/core/topic/" + id;
    req.open("GET", url);
    req.setRequestHeader('Content-Type', 'application/json');
    req.overrideMimeType("application/json;text/plain");
    // dump("DEBUG: " + lookmarker.serviceHorstPost + "/core/topic/"+id);
    req.onreadystatechange = function (aEvt) {
      if (req.readyState == 4) {
        if(req.status != 200) {
          if (lookmarker.statusLabel != undefined) lookmarker.statusLabel.value = lookmarker.statusloadError;
        } else {
          callback(req.responseText);
        }
      }
    };
    req.send(null);
}



// --
// --- little xul helpers
// --

function firstRun(extensions) {
  var extension = extensions.get("notetaker@deepamehta.org");
  if (extension.firstRun) {
    dump("DEBUG.Indeed: Notetaker is running for the first time adding Bookmark/Notice-Button to nav-bar..");
    if (!document.getElementById("lookmarker-toolbar-button")) {
      var navBar = document.getElementById("nav-bar");
      navBar.insertItem("lookmarker-toolbar-button", navBar);
      navBar.setAttribute("currentset", navBar.currentSet);
      // document.persist(navBar.id, "currentset");
    }
  }
}

function getCursorSelection() {
// uses getSelectedHTML incl. hyperlinks at level of depth 0 or 1 in the selected dom
// fixme: getSelectedHTML() is currently set out of order
    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
      .getService(Components.interfaces.nsIWindowMediator);
    var mainWindow = wm.getMostRecentWindow("navigator:browser");
    var tabBrowser = mainWindow.getBrowser();
    var selection = tabBrowser.contentWindow.getSelection();
    // check preferences..
    if ( lookmarker.noteAsHTML ) {
      var range = selection.getRangeAt(0);
      var docFrag = range.cloneContents();
      var noteBody = getSelectedHTML(docFrag.childNodes);
      if (noteBody != undefined) return noteBody;
      return selection;
    } else {
      return selection;
    }
}

function getSelectedHTML(collection) {
  var content = "";

  for( var i = 0; i < collection.length; i++ ) {
    if (collection.length > 2) return undefined; // skip saving selection as HTMLElements
    // FIXME: recursive parser for our DocumentFragment 
    // level0 child
    if ( collection[i].nodeName != "#text" ) {
      content += '<' + collection[i].nodeName.toLowerCase() + '';
      if (collection[i].attributes != null) {
        for ( var k = 0; k < collection[i].attributes.length; k++) {
          // thanks to the mozilla add-on forum
          var attribute = XPCNativeWrapper.unwrap(collection[i].attributes[k]); 
          if ( attribute.name == "class" || attribute.name == "style" || 
              attribute.value == "" || attribute.name == "id" ) {
            // ignore these attributes
          } else {
            if (attribute.name == "href") {
              if (docFrag == undefined) getCursorSelection(); // fallback
              attribute.value = autoCompleteHref(attribute.value, docFrag);
            }
            content += ' ' +attribute.name + '="' + attribute.value + '"';
          }
        }
      }
      content += '>';
      // evtl. level 1
      var openEnd = false;
      var childName = "a";
      if (collection[i].childNodes.length >=0) {
        // handle the case if <a>-node- link is directly nested in a let's say <h2>-node..
        var childNode = collection[i].childNodes[0];
        if (childNode.nodeName == "A") {
          content += '<' + childNode.nodeName.toLowerCase() + '';
          // dump("  DEBUG.getSelectedHTML: \"" + content + "\"");
          if (childNode != undefined && childNode.attributes != null) {
            for ( var k = 0; k < childNode.attributes.length; k++) {
              // thanks to mozilla add-on forum
              var childAttribute = XPCNativeWrapper.unwrap(childNode.attributes[k]); 
              if ( childAttribute.name == "class" || childAttribute.name == "style" 
                  || childAttribute.value == "" || attribute.name == "id" ) {
                // ignore attribute in all these cases..
              } else {
                if (childAttribute.name == "href") {
                  if (docFrag == undefined) getCursorSelection(); // fallback
                  childAttribute.value = autoCompleteHref(childAttribute.value, docFrag);
                }
                content += ' ' + childAttribute.name + '="' + childAttribute.value + '"';
              }
            }
            content += '>';
            openEnd = true;
          }
        }
      }
      // in any case add textcontent in between just parsed elements
      content += collection[i].textContent;
      if (openEnd) content += '</' + childName + '>';
      content += '</' + collection[i].nodeName.toLowerCase() + '>';
      // dump("DEBUG.getSelectedHTML: \"" + content + "\"");
    } else {
      // just simple text selected..
      content += collection[i].textContent;
    }
  }
  dump("DEBUG.content: \"" + content + "\"");
  return content;
}

function autoCompleteHref(value, docFrag) {
  // deal properly with a lnk
  if ( value.lastIndexOf("http", 0) === 0 ) {
    // fine
    return value;
  } else  { 
    // substitutng
    value = docFrag.baseURI.slice(0, -1) + value; // FIXME currently assuming all baseURIs end on a slash
    // dump("autocompleting relative URL to " + value);
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

function openUrlInNewTabAndMakeTabActive(url) {
    var currentWindow = Components.classes["@mozilla.org/appshell/window-mediator;1"]
      .getService(Components.interfaces.nsIWindowMediator).getMostRecentWindow("navigator:browser");
    currentWindow.gBrowser.selectedTab = currentWindow.gBrowser.addTab(url);
}

function getCurrentPageTitle() {
    var currentWindow = Components.classes["@mozilla.org/appshell/window-mediator;1"]
      .getService(Components.interfaces.nsIWindowMediator).getMostRecentWindow("navigator:browser"); 
    var currBrowser = currentWindow.getBrowser();
    var currTitle = currBrowser.contentTitle;
    return currTitle;
}

// credits from lazy mukil to stackoverflow user http://stackoverflow.com/users/43089/triptych
function sortBy(field, reverse, primer) {
  reverse = (reverse) ? -1 : 1;
  return function(a,b) {
   a = a[field];
   b = b[field];
   if (typeof(primer) != 'undefined'){
       a = primer(a);
       b = primer(b);
   }
   if (a<b) return reverse * -1;
   if (a>b) return reverse * 1;
   return 0;
  }
}


window.addEventListener("load", lookmarker.onLoad, false);
