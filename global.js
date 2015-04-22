/* Debug mode */
var updater = null;
var buttonurl = '';
var msgsSeen = 0;  //Last messages viewed, badge count
var keywordAuthors = []; //array of users who have posted a journal w/ keyword

var cparser = /^(?:From )?([^ ,]*)[ ,]( posted|[^,]*,) on (.*)$/; //Handles shouts and comments
var wparser = /^([^ ]*) /;
var jparser = /posted by ([^ ]*) on/;
var commentAuthors = []; //array of users who have posted comments
var newWatchers = []; // array of users who are watching

//Todo: remove excess chrome.storage.sync nonsense.
/* Message passing interface */
//Todo: update this to the "onMessage" protocol
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {

        switch (request.message) {

        case 'pageData':
            DEBUG('[onMessage] pageData from page view source received');
            msgsSeen = -1;
            updateData(request.data, true);
            return true;

	      case 'getCount':
            DEBUG('[onMessage] getCount request received');
            chrome.storage.sync.get(["msgCount"], function(items) {
              sendResponse({msgCount: items['msgCount']});
            });
            return true;

  	      case 'getTags':
            DEBUG('[onMessage] getTags request received');
            sendResponse({tagList: tagList});
            return true;

        case "settingChanged":
            DEBUG('[onMessage] settingChanged request received');
	          clearInterval(updater);
	          init();
	          return true;

        default:
	          console.log('Received unknown message function: ' + request.message);
        }
    });



//When the message count changes update the badge and decide whether to show a notification
function onStorageChangedHandler(changes, areaName) {
  if (changes['msgCount'] !== undefined) {
      var lastMsgCount = changes['msgCount'].oldValue;
      var msgCount = changes['msgCount'].newValue;
      if (lastMsgCount === undefined) {lastMsgCount = Array.apply(null, new Array(zeroMsgs.length)).map(Number.prototype.valueOf,0);}

      DEBUG("[onStorageChanged] old message count: " + lastMsgCount.toString() + " new message count: " + msgCount.toString());

      //Format a pretty notification
      var message = "";
      for (i = 0; i < watchOptions.length; i++) {
      	var nMsgs =  msgCount[i] - lastMsgCount[i];
        if (watchOptions[i] & nMsgs > 0) {
          msgTxt = nMsgs.toString() + " new " + notifyNames[i*2 + Math.min(1, nMsgs-1)];
          appendTxt = "\r\n";
          if (i == 4) {appendTxt = " (" + newWatchers.slice(0, msgCount[i]-lastMsgCount[i]).unique().join('; ') + ")\r\n";}
          if (i == 1) {appendTxt = " (" + commentAuthors.slice(0, msgCount[i]-lastMsgCount[i]).unique().join('; ') + ")\r\n";}
          if (i == 5) {appendTxt = " (Click here to view)\r\n";}
          if (i == 7) {appendTxt = " (" + keywordAuthors.slice(0, msgCount[i]-lastMsgCount[i]).unique().join('; ') + ")\r\n";}
          msgTxt = msgTxt + appendTxt;
          message = message + msgTxt;
        }
      }


      if (message.length > 0) {
          newMsgNotification("New messages received. \r\n" + message, msgCount[5] - lastMsgCount[5] > 0);
      }
  }
}

chrome.storage.onChanged.addListener( onStorageChangedHandler );

// Go to messages if notification is clicked
chrome.notifications.onClicked.addListener(
    function(notificationID) {
        chrome.windows.getAll(
        function(Windows) {
          if (Windows.length === 0) {
            chrome.windows.create(function(w) {chrome.tabs.create({url: buttonurl});});}
          else {
              chrome.tabs.create({url: buttonurl}, function (T) {
              chrome.windows.update(T["windowId"], {focused: true});
            });
          }
          chrome.notifications.clear(notificationID, function(){} );
        });
    });




// Parsing Code
function parseData(data) {
  DEBUG('[parseData] finding new messages');
  var msgCount = new Array(zeroMsgs.length);
  dom = $(data);

  // Look in header table for message list
  //var notifText = dom.find('.header_bkg li.noblock').text();
  var notifText = dom.find('#messagebar').text();   
  notifText = notifText.replace(/\s/g, '');
  var hasNotifs = false;
  if (notifText !== undefined) {
    var notifData = REParser.exec(notifText);
    if (notifData !== null) {
      hasNotifs = true;
      notifData = notifData.slice(1);
      for (var i =0; i < notifData.length; i++) {
        if (notifData[i] !== undefined) {msgCount[i] = parseInt(notifData[i]);}
        else {msgCount[i] = 0;}
      }
    }
  }


  msgCount[7] = -1;
  if (msgCount[2] === 0) { msgCount[7] = 0; keywordAuthors = [];}
  if (msgCount[1] === 0) {commentAuthors = [];}


  //If we're on the User Control Panel page pull out relevent info
  if (data.indexOf("<title>User control panel") > 0) {
    var authors_obs = [];

    //Search through journals for list of keywords and pull out authors
    var keywordmatch = 0;
    if (msgCount[2] > 0) { //No point hunting otherwise
      var userpos;
      var j_links = dom.find('#messages-journals li').each(function(index, listItem) {
          jdata = $(this).text();
          if ((jdata !== null) & (findMatchIn(jdata.toLowerCase(), tagList))) {
              keywordmatch++;
              jdata = jparser.exec(jdata);
              authors_obs.push(jdata[1]);
            }
          });
      if (j_links.size() === 0) { DEBUG('[parseData] No links on this page.'); }
      else  {msgCount[7] = keywordmatch; keywordAuthors = authors_obs;}
    }

    //Pull names of commenters
    var c_links; 
    if (msgCount[1] > 0) {
      authors_obs = [];
      c_links = dom.find('#messages-shouts li, #messages-comments-submission li, #messages-comments-journal li').each(function(index, listItem) {
          var cdata = cparser.exec($(this).text());
          if (cdata !== null) {
            var d = cdata[3].replace(',','').split(/[,? |:]/); // Pick apart date
            d[1] = d[1].slice(0, -2);
            d[3] = Number(d[3]);
            if (d.pop() == "PM") {d[3] = d[3]+12;}
            d = Date.parse(d.slice(0, 3).join(' '))/1000 + d[3]*3600+Number(d[4])*60; 
            authors_obs.push({name: cdata[1], date: d});
          }
      });
      if (c_links.size() === 0) {DEBUG('[parseData] could not find comments on this page.'); }
      else {
        authors_obs.sort(function(a,b) {return b['date'] - a['date'];});
        commentAuthors = authors_obs.map(function(c){return c['name'];});
      }
    }


    //Pull names of watchers
    if (msgCount[1] > 0) {
      authors_obs = [];
      var w_links = dom.find('.info').each(function(index, listItem) {
          var wdata = wparser.exec($(this).text());
          if (wdata !== null) {authors_obs.push(wdata[1]);}
      });
      if (c_links.size() === 0) {DEBUG('[parseData] could not find watchers on this page.');}
      else {newWatchers = authors_obs;}
    }
  }

  if (hasNotifs | REMsg.test(dom)) { updateNewMessages(msgCount); }
  else { DEBUG("[parseData] No submission data found."); }
}

//Compare current message count with last observed count
function updateNewMessages(msgCount) {
  DEBUG('[updateNewMessages] Found messages: ' + msgCount.toString());

  if (Array.isArray(msgCount) & msgCount.length == zeroMsgs.length) {
    chrome.storage.sync.get(["msgCount"], function(items) {
      var lastMsgCount = items['msgCount'];
      if (msgCount[7] == -1) { msgCount[7] = lastMsgCount[7]; }
      if (msgCount.toString() != lastMsgCount.toString()) {chrome.storage.sync.set({'msgCount': msgCount});}

      //Update badge
      var count = 0;
      var badgenum; 
      for (var i = 0; i < msgCount.length; i++) {count = count + msgCount[i]*watchOptions[i];}

      //Set badge to red for new messages
      if (isNaN(msgsSeen)) { msgsSeen = -1; DEBUG('[updateNewMessages] msgsSeen was NaN.');}
      if (msgsSeen == -1) { msgsSeen = count; }
      if (msgsSeen < count) { chrome.browserAction.setBadgeBackgroundColor({color: [255, 0, 0, 255]}); badgenum = count - msgsSeen; }
      else {chrome.browserAction.setBadgeBackgroundColor({color: [128, 128, 128, 255]}); badgenum = 0; }

      if (badgenum > 0) {
        chrome.browserAction.setBadgeText( {"text": badgenum.toString()});
        DEBUG('[updateNewMessages] Set badge to ' + badgenum.toString());
      }
      else {
        chrome.browserAction.setBadgeText( {"text": ""} );
        DEBUG('[updateNewMessages] Cleared badge.');
      }
    });
  }
  else {chrome.browserAction.setBadgeText({"text": ""});}
}




function newMsgNotification(message, pullNote) {
    DEBUG("[newMsgNotification] Creating notification message: " + message);
    buttonurl = "http://www.furaffinity.net/msg/others/";
    if (pullNote) {
      $.ajax({
        url: 'http://www.furaffinity.net/msg/pms/',
	      success: function (data) {
          var val = $(data).find('a.note-unread.unread').first().attr('href');
	        if (val !== '') { buttonurl = "http://www.furaffinity.net" + val; }
        }
      }).fail(function () { DEBUG('[newMsgNotification] AJAX request failed'); });
    }

    chrome.notifications.clear("Message Notification", function () {
      chrome.notifications.create("Message Notification", {"type": "basic", "iconUrl":"Icon.png", "title": "Update", "message": message}, function() {});
    });
}


function updateCount() {
  DEBUG("[updateCount] Running primary update fetch");
  $.ajax({
    url: "http://sfw.furaffinity.net/msg/others/",
    success: updateData
  }).error(function() {
    DEBUG('[updateCount] Fetch error');
    chrome.browserAction.setBadgeText( {"text": ""} );
  });
}


function resetCount() {chrome.storage.sync.set({'msgCount': zeroMsgs});}

/* Primary update loop */
function updateData(data) {
    parseData(data);
    clearInterval(updater);
    clearTimeout(updater);
    updater = setInterval(updateCount, update);
}

//Initialize variables to zero if not yet set
function init() {
  chrome.storage.sync.get(["update", "msgCount", 'watchOptions', 'tagList'],
    function(items) {
        if (items['update']) {update = items['update'];}
        if (items['watchOptions']) {watchOptions = items['watchOptions'];}
        if (items['tagList']) {tagList = items['tagList'];}
        chrome.storage.local.get(['notifications_on', 'HTML_on'],
          function(items) {
            if (items['notifications_on']) {notifications_on = items['notifications_on'];}
            if (items['HTML_on']) {HTML_on = items['HTML_on'];}
            updater = setTimeout(updateCount, 100);
            if (!items['msgCount']) {DEBUG('No data stored; initializing messages to zero'); resetCount();}
      });
    });
}

init();

