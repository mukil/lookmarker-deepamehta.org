lookmarker.onFirefoxLoad = function(event) {
  document.getElementById("contentAreaContextMenu")
          .addEventListener("popupshowing", function (e){ lookmarker.showFirefoxContextMenu(e); }, false);
};

lookmarker.showFirefoxContextMenu = function(event) {
  // show or hide the menuitem based on what the context menu is on
  document.getElementById("context-lookmarker").hidden = gContextMenu.onImage;
};

window.addEventListener("load", lookmarker.onFirefoxLoad, false);

