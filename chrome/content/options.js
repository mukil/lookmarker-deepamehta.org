var dialogSettings = window.arguments[1];
// 
var dialog = {
  onload: function() {
    // alert("coming dialogSettings.serviceURL =>  " + dialogSettings.service);
    var textBox = document.getElementById("service-host-box");
    textBox.setAttribute("value", dialogSettings.service);
  }
}
