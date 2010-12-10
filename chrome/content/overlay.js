// --
// --- DeepaMehta3 Firefox XUL Client ---
// --- @author Malte Reißig (malte@deepamehta.org) - http://github.com/mukil
// --- @created 10122010
// -- 

var dm = "http://localhost:8182/de.deepamehta.3-client/index.html"
var lookmarker = {
  onLoad: function() {
    // initialization code
    this.initialized = true;
    this.strings = document.getElementById("lookmarker-strings");
    this.topicmap_menubar = document.getElementById("topicmap-menubar-popup");
    // this.topicmap_menulist = document.getElementById("topicmap-menulist-popup");
    getTopicsByType("de/deepamehta/core/topictype/Topicmap", function responseArrived(result){
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

  onMenuItemCommand: function(e) {
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
      // also take a note
      createNotedTopicResource(currentUrl, title, selectedText);
    }
  },

  onToolbarButtonCommand: function(e) {
    var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                                  .getService(Components.interfaces.nsIPromptService);
    var title = getCurrentTitle();
    var currentUrl = getCurrentURL();
    var check = {value: false};                  // default the checkbox to false
    var input = {value: title};                  // default the edit field to Bob
    var result = promptService.prompt(null, "Bookmark Title", "Mark your resource with a title:", input, null, check);
    // result is true if OK is pressed, false if Cancel. input.value holds the value of the edit field if "OK" was pressed
    if (result) {
        createSimpleTopicResource(currentUrl, input.value);
        Components.utils.reportError("INFO: Deep Bookmarking saved: " + input.value + " ("+currentUrl+")");
    } else {
        Components.utils.reportError("INFO: Deep Bookmarking Aborted..");
    }
    
  },
  
  onOpenTopicmap: function(e) {
    if (e != undefined) {
      var topicmapId = e.target.getAttribute("value");
      Components.utils.reportError("open map => " + topicmapId);
      navToTopicmap(topicmapId);
    }  
  }
};

// ---
// --- DeepaMehta3 JavaScript XUL Client
// --

function createSimpleTopicResource(url, title) {
    var topic = '{ type_uri: "de/deepamehta/core/topictype/File", properties: { "de/deepamehta/core/property/FileName": "'+title+'", "de/deepamehta/core/property/Path": "'+url+'", "de/deepamehta/core/property/MediaType": "text/html" } }';
    sendTopicPost(topic);
}

function createNotedTopicResource(url, title, note) {
    var topic = '{ type_uri: "de/deepamehta/core/topictype/File", properties: { "de/deepamehta/core/property/FileName": "'+title+'", "de/deepamehta/core/property/Path": "'+url+'", "de/deepamehta/core/property/MediaType": "text/html" } }';
    var note = '{ type_uri: "de/deepamehta/core/topictype/Note", properties: { "de/deepamehta/core/property/Title": "'+title+'", "de/deepamehta/core/property/Text": "<i>&raquo;'+note+'&laquo;<i>"} }';
    sendTopicPost(topic);
    // TODO: relate these two topics
    sendTopicPost(note);
}

function getTopicsByType(type_uri, callback) {
    var req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Components.interfaces.nsIXMLHttpRequest);
    req.open("GET", "http://localhost:8182/core/topic/by_type/"+encodeURIComponent(type_uri, "UTF-8"));
    req.setRequestHeader('Content-Type', 'application/json');
    req.overrideMimeType("application/json;text/plain");
    Components.utils.reportError("INFO: http://localhost:8182/core/topic/by_type/"+encodeURIComponent(type_uri, "UTF-8"));
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

// --
// --- Utilities
// --

function sendTopicPost(body) {
    var req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Components.interfaces.nsIXMLHttpRequest);
    req.open("POST", "http://localhost:8182/core/topic");
    req.setRequestHeader('Content-Type', 'application/json');
    req.overrideMimeType("application/json;text/plain");
    req.onreadystatechange = function (aEvt) {
      if (req.readyState == 4) {
         if(req.status != 200)
          Components.utils.reportError("TopicPOST failed: " + req.error);
         else
          Components.utils.reportError("TopicPOST SAVED: " + body);
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
    currentWindow.window.content.location.href = dm+"?topicmap="+id;
}

function getCurrentTitle() {
    var currentWindow = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator).getMostRecentWindow("navigator:browser");
    var currBrowser = currentWindow.getBrowser();
    var currTitle = currBrowser.contentTitle;
    return currTitle;
}

window.addEventListener("load", lookmarker.onLoad, false);
