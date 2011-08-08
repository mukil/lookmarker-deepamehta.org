
// 
var lookmarker = {
  prefManager: undefined,
  serviceHorstPost: undefined,
  dmClient: undefined,
  onLoad: function() {
    // initialization code
    // 
    lookmarker.prefManager = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
    lookmarker.serviceHorstPost = lookmarker.prefManager.getCharPref("extensions.lookmarker.service.horstpost");
    lookmarker.dmClient = lookmarker.serviceHorstPost + "/de.deepamehta.webclient/index.html";
    // 
    this.initialized = true;
    this.strings = document.getElementById("lookmarker-strings");
    this.topicmap_menubar = document.getElementById("topicmap-menubar-popup");
    // this.topicmap_menulist = document.getElementById("topicmap-menulist-popup");
    getTopicsByType("dm4.topicmaps.topicmap", function responseArrived(result){
      var topicmaps = JSON.parse(result);
      for (var i = 0; i < topicmaps.length; i++) {
        var topicmap = topicmaps[i];
        Components.utils.reportError("loaded map (" + topicmap.id + ") " + topicmap.label);
        var menuitem = document.createElement("menuitem");
        menuitem.setAttribute("label", topicmap.label);
        menuitem.setAttribute("value", topicmap.id);
        menuitem.setAttribute("oncommand", lookmarker.onOpenTopicmap(undefined));
        topicmap_menubar.appendChild(menuitem);
        // topicmap_menulist.appendChild(menuitem);
      }
    });
  },
  
  updatePreferences: function(e) { // updates js-client side used variables..
    lookmarker.serviceHorstPost = lookmarker.prefManager.getCharPref("extensions.lookmarker.service.horstpost");
    lookmarker.dmClient = lookmarker.serviceHorstPost + "/de.deepamehta.3.webclient/index.html";
  },

  onMenuItemCommand: function(e) {
    lookmarker.updatePreferences(); // get current service Url of the PreferenceMananger..
    // 
    var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                                  .getService(Components.interfaces.nsIPromptService);
    // createTopicResource(getCurrentURL(), title);
    var selectedText = getSelectedText();
    var currentUrl = getCurrentURL();
    var title = getCurrentTitle();
    Components.utils.reportError("INFO: MenuItem was pressed during visit on: " + currentUrl);
    if (selectedText == "") {
      // just bookmark the page
      lookmarker.onToolbarButtonCommand(e);
    } else {
      // bookmark the resource, take a note and relate both with each other..
      createRelatedTopicNote(currentUrl, title, selectedText);
    }
  },

  onToolbarButtonCommand: function(e) {
    lookmarker.updatePreferences(); // get current service Url of the PreferenceMananger..
    var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                                  .getService(Components.interfaces.nsIPromptService);
    var title = getCurrentTitle();
    var currentUrl = getCurrentURL();
    var check = {value: false};                  // default the checkbox to false
    var input = {value: title};                  // default the edit field to Bob
    var result = promptService.prompt(null, "Bookmark Title", "Mark your resource with a title:", input, null, check);
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
    var dialogSettings = { service: lookmarker.serviceHorstPost };
    window.openDialog("chrome://lookmarker/content/options.xul", "deepamehta-extension-preferences", "chrome,titlebar,toolbar,centerscreen,modal", this, dialogSettings);
  },
  
  onOpenTopicmap: function(e) {
    lookmarker.updatePreferences(); // get current service Url of the PreferenceMananger..
    if (e != undefined) {
      var topicmapId = e.target.getAttribute("value");
      Components.utils.reportError("open map => " + topicmapId);
      navToTopicmap(topicmapId);
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
  sendTopicPost(webtopic, getResultingTopicId);
}

function getResultingTopicId(resultData) {
  var topicId = JSON.parse(resultData).id;
  Components.utils.reportError("TopicResult is available: " + topicId + " but not of interest anymore.. dropping knowledge");
}

/** create a resource and relate the note to it */
var topicToRelate = undefined; // used in the following three methods..
var topicOrigin = undefined; // ^^
// 
function createRelatedTopicNote(url, title, body) {
  // {"id":2541,"uri":"","type_uri":"dm4.notes.note","composite":{"dm4.notes.title":"Test Yea","dm4.notes.text":"<p>asdasd</p>"}}
  var selectedText = cleanUpForJson(body);
  var notetopic = '{"uri":"","type_uri":"dm4.notes.note","composite":{"dm4.notes.title":"'+title+'","dm4.notes.text":"'+body+'"}}';
  var webtopic = '{"uri":"","type_uri":"dm4.contacts.resource","composite":{"dm4.contacts.resource_name":"'+title+'","dm4.webbrowser.url":"'+url+'"}}';
  // 
  // mark down other topic to be able to create it after the result arrived for the first topic..
  topicOrigin = notetopic;
  // send resource (first) topic 
  // ### TODO: look up if URL of webtopic is already known
  sendTopicPost(webtopic, createRelatedTopicHandler);
}


// --
// --- Utilities
// --

function cleanUpForJson(somehtml) {
  var result = "";
  result = somehtml.toString().replace('/"/g", "\\\"');
  result = somehtml.toString().replace('/{/g", "\\\{');
  result = somehtml.toString().replace('/}/g", "\\\}');
  return result;
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
    Components.utils.reportError("associateResultHandler " + topicOrigin.id + " ==> " + topicToRelate.id);
    var association = '{"type_uri":"dm4.core.association","role_1":{"topic_id":'+topicOrigin.id+',"role_type_uri":"dm4.core.default"},"role_2":{"topic_id":'+topicToRelate.id+',"role_type_uri":"dm4.core.default"}}';
    sendAssocPost(association);
    // topicToRelate.id && relatedTopicId..
  }
}

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

function sendAssocPost(body, resultHandler) {
    var req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Components.interfaces.nsIXMLHttpRequest);
    var url = lookmarker.serviceHorstPost + "/core/association";
    Components.utils.reportError("sendAssocPOST => \"" + body + "\"");
    req.open("POST", url);
    req.setRequestHeader('Content-Type', 'application/json');
    req.overrideMimeType("application/json;text/plain");
    req.onreadystatechange = function (aEvt) {
      if (req.readyState == 4) {
         if (req.status != 200)
          Components.utils.reportError("AssocPOST failed: " + req.error + ":url:" + url);
         else
          resultHandler(req.responseText);
      }
    };
    req.send(body);
}

function sendTopicPost(body, resultHandler) {
    var req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Components.interfaces.nsIXMLHttpRequest);
    var url = lookmarker.serviceHorstPost + "/core/topic";
    Components.utils.reportError("sendTopicPOST => \"" + body + "\"");
    req.open("POST", url);
    req.setRequestHeader('Content-Type', 'application/json');
    req.overrideMimeType("application/json;text/plain");
    req.onreadystatechange = function (aEvt) {
      if (req.readyState == 4) {
         if (req.status != 200)
          Components.utils.reportError("TopicPOST failed: " + req.error + ":url:" + url);
         else
          resultHandler(req.responseText);
      }
    };
    req.send(body);
}

function getSelectedText() {

   var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
         .getService(Components.interfaces.nsIWindowMediator);
   var mainWindow = wm.getMostRecentWindow("navigator:browser");
   var tabBrowser = mainWindow.getBrowser();
   
   var selectedText = tabBrowser.contentWindow.getSelection();
   return selectedText;
}

function getCurrentURL() {
    var currentWindow = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator).getMostRecentWindow("navigator:browser");
    var currBrowser = currentWindow.getBrowser();
    var currURL = currBrowser.currentURI.spec;
    return currURL;
}

function navToTopicmap(id) {
    var currentWindow = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator).getMostRecentWindow("navigator:browser");
    var navToUrl = lookmarker.dmClient + "?topicmap=" + id;
    currentWindow.window.content.location.href = navToUrl;
}

function getCurrentTitle() {
    var currentWindow = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator).getMostRecentWindow("navigator:browser");
    var currBrowser = currentWindow.getBrowser();
    var currTitle = currBrowser.contentTitle;
    return currTitle;
}

window.addEventListener("load", lookmarker.onLoad, false);
