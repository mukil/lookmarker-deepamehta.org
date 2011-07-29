
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
    lookmarker.dmClient = lookmarker.serviceHorstPost + "/de.deepamehta.3-client/index.html";
    // 
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
  
  updatePreferences: function(e) { // updates js-client side used variables..
    lookmarker.serviceHorstPost = lookmarker.prefManager.getCharPref("extensions.lookmarker.service.horstpost");
    lookmarker.dmClient = lookmarker.serviceHorstPost + "/de.deepamehta.3-client/index.html";
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
      // also take a note
      createNotedTopicResource(currentUrl, title, selectedText);
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
        createSimpleTopicResource(currentUrl, input.value);
        Components.utils.reportError("INFO: Deep Bookmarking saved: " + input.value + " ("+currentUrl+") to " + lookmarker.serviceHorstPost);
    } else {
        Components.utils.reportError("INFO: Deep Bookmarking Aborted..");
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
// --- DeepaMehta3 JavaScript XUL Client
// --

/** 
  * TODO: Adapt to the changed creation process in DM4 (as monitored with Firebug:)
  * 1.) http://localhost:8080/core/topic - POST {"type_uri":"dm4.contacts.resource"}
  * // http://localhost:8080/topicmap/1484/topic/1545/370/190 - PUT  {empty}
  * // http://localhost:8080/core/association - PUT {"id":1528,"composite":{"dm4.topicmaps.x":205,"dm4.topicmaps.y":43}}
  * // http://localhost:8080/core/association - PUT {"id":1550,"composite":{"dm4.topicmaps.x":770,"dm4.topicmaps.y":63}}
  * 2.) http://localhost:8080/core/topic - PUT {"id":1545,"uri":"","type_uri":"dm4.contacts.resource","composite":{"dm4.contacts.resource_name":"Another Mth REsource","dm4.webbrowser.url":"http://mikromedia.de/mob"}}
  *
  * 
  **/

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

// --
// --- Utilities
// --

function sendTopicPost(body) {
    var req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance(Components.interfaces.nsIXMLHttpRequest);
    var url = lookmarker.serviceHorstPost + "/core/topic";
    req.open("POST", url);
    req.setRequestHeader('Content-Type', 'application/json');
    req.overrideMimeType("application/json;text/plain");
    req.onreadystatechange = function (aEvt) {
      if (req.readyState == 4) {
         if(req.status != 200)
          Components.utils.reportError("TopicPOST failed: " + req.error + ":url:" + url);
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
