var dbg = true;
function DEBUG(str) { if (dbg) { console.log(str); } }


var DEFAULT_UPDATE = 30 * 1000;
var watchOptions = [false, true, false, false, true, true, true]; //Needs an extra "true" for the rest of the code
var update = DEFAULT_UPDATE;
var tagList = [];
var notifications_on = true;
var HTML_on = true;
var keep_ads = false;
localvars = ['HTML_on', 'keep_ads', 'notifications_on'];


var OPTIONS = {

  save: function() {
    DEBUG('Saving options.');
    var select = document.getElementById("update");
    var update = select.children[select.selectedIndex].value;

    tagList = document.getElementById("keywords").value.split(',');
    tagList = tagList.map(function(T) {return T.trim().toLowerCase();});
    watchOptions.forEach(function(v, ind, Arr) {Arr[ind] = document.getElementById("w" + ind.toString()).checked;});
    localvars.forEach(function(v, ind, Arr) {window[v] = document.getElementById(v).checked;});

    //Save current options and send message to extension
    OPTIONS.store(function () {
      var status = document.getElementById("status");
      status.innerHTML = "Options Saved.";
      setTimeout(function() {status.innerHTML = "";}, 750);
      chrome.extension.sendMessage( {message: "settingChanged"});
    });
  },




  init: function() {
    DEBUG('Initializing page.');
    var save = document.getElementById("save");
    save.onclick = OPTIONS.save;

    //Load previously saved options and set input areas to previous values
    OPTIONS.load(function () {
      children = document.getElementById("update").children;
      for (i = 0; i < children.length; i++) {
      	  if (children[i].value == update) {children[i].selected = "true";}
      }
      document.getElementById("keywords").value = tagList.join(", ");
      watchOptions.forEach(function(v, ind, Arr) {document.getElementById("w" + ind.toString()).checked = v;});
      localvars.forEach(function(v, ind, Arr) {document.getElementById(v).checked = window[v];});
    });
  },


  store: function(callback) {
    chrome.storage.sync.set({'update': update, 'tagList': tagList, 'watchOptions': watchOptions.concat(tagList.length > 0)}, function() {
      chrome.storage.local.set({'HTML_on': HTML_on, 'notifications_on': notifications_on, 'keep_ads': keep_ads}, function() {
        callback();
      });
    });
  },


  load: function(callback) {
    chrome.storage.sync.get(["update", 'watchOptions', 'tagList'], function(items) {
      if (items['update']) {
        update = items['update'];
        watchOptions = items['watchOptions'];
        watchOptions.pop();
        tagList = items['tagList'];
      }

      chrome.storage.local.get(localvars, function(items) {
        if (items[localvars[1]] !== null) {
          HTML_on = items['HTML_on'];
          keep_ads = items['keep_ads'];
          notifications_on = items['notifications_on'];
        }
        callback();
      });
    });
  }
};

window.onload = OPTIONS.init;
