lookmarker.onFirefoxLoad = function(event) {
  document.getElementById("contentAreaContextMenu")
          .addEventListener("popupshowing", function (e){ lookmarker.showFirefoxContextMenu(e); }, false);
};

lookmarker.showFirefoxContextMenu = function(event) {
  // show or hide the menuitem based on what the context menu is on
  document.getElementById("context-lookmarker").hidden = gContextMenu.onImage;
};

window.addEventListener("load", lookmarker.onFirefoxLoad, false);
// window.openDialog("chrome://lookmarkers/content/options.xul", "modifyheadersDialog", "resizable,dialog,centerscreen,modal", this);
// window.openDialog("chrome://lookmarkers/content/options.xul", "modifyheadersPreferences", "chrome,titlebar,toolbar,centerscreen,modal", this);
