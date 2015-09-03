// Todo: do not rely on sync API callbacks


/// Check parseData.js for extension-wide definitions

/// Global variables... hooray?
var notificationID = "FA Notification";  // Unique ID for notification (so we can close it again)
var updateTimer    = null;  // Hold instance of background timer
var buttonurl      = '';    // Should latest update send us to notes or the global inbox?
var msgsViewed     = zeroMsgs.slice(0);  // Array of messages on last active view.
var lastMsgCount   = zeroMsgs.slice(0);  // Messages on last check of any sort


var cparser = /^(?:From )?([^ ,]*)[ ,]( posted|[^,]*,) on (.*)$/; //Regex to find shouts and comments
var wparser = /^([^ ]*) /;  // Regex to find watchers
var jparser = /posted by ([^ ]*) on/; // Regex to get names of journal posters
var commentPosters = [];    // Users who have posted comments
var newWatchers    = [];    // New watchers
var keywordPosters = [];    // Users who have posted journals containing keywords


function sum(x,y) {return x+y;}

/* Message passing interface */
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {

        switch (request.message) {

        case 'pageData':
            DEBUG('pageData from page view source received');
            processForegroundData(request.data);
            return true;

	      case 'getCount':
            DEBUG('getCount request received');
            chrome.storage.sync.get(["msgCount"], function(items) {
                sendResponse({msgCount: items['msgCount']});
            });
            return true;

        case 'popoverData':
            // If we have new hotness, just show that.
            var newMsgCount = processBackgroundData(request.data);
            // Otherwise, put up everything.
            if (newMsgCount.reduce(sum) === 0) { newMsgCount = lastMsgCount; }
            DEBUG('Telling popoverData about hot stuff: ' + newMsgCount);
            sendResponse({newMsgCount: newMsgCount});
            return true;

        case 'getTags':
            DEBUG('getTags request received');
            sendResponse({tagList: tagList});
            return true;

        case "settingChanged":
            DEBUG('settingChanged request received');
            clearInterval(updateTimer);
            msgsViewed.fill(0);
            lastMsgCount.fill(0);
	          init();
	          return true;

        default:
            console.log('Received unknown message: ' + request.message);
        }
    });


/// Format a pretty notification, see parseData.js for contents of notifyNames[]
function formatUpdateNotification(newHotness)
{
    var message = "";
    for (i = 0; i < newHotness.length; i++) {
        nMsgs = newHotness[i];
        if (nMsgs > 0) {
            var msgTxt = nMsgs.toString() + " new " + notifyNames[i*2 + Math.min(1, nMsgs-1)];
            var appendTxt = "\r\n";

            // commentPosters[], newWatchers[] and so on could theoretically be indexed in an array
            if (i == 1) {appendTxt = " (" + commentPosters.slice(0, nMsgs).unique().join('; ') + ")\r\n";}
            if (i == 4) {appendTxt = " (" + newWatchers.slice(0, nMsgs).unique().join('; ')    + ")\r\n";}
            if (i == 7) {appendTxt = " (" + keywordPosters.slice(0, nMsgs).unique().join('; ') + ")\r\n";}
            if (i == 5) {appendTxt = " (Click here to view)\r\n";}
            msgTxt = msgTxt + appendTxt;
            message = message + msgTxt;
        }
    }
    return message;
}


// Clears any old notification, then re-sends
function createNotification(msg)
{
 // chrome.notifications.clear( notificationID, function() { 
      chrome.notifications.create( notificationID,
                                 {"type": "basic", "iconUrl":"icon.png", "title": "Update", "message": msg},
                                 function() {});   // Pointless callback becomes optional after Chrome 42...
  //});
}


/// Pop up a new notification, either msg counts or entire note text
function newMsgNotification(message, pullNote)
{
    DEBUG("Creating notification message: " + message);
    buttonurl = "http://www.furaffinity.net/msg/others/";
    // What's going on here exactly?
    if (pullNote) {
        $.ajax({
            url: 'http://www.furaffinity.net/msg/pms/',
            error:   function () { DEBUG('AJAX request failed'); },
            success: function (data) { var val = $(data).find('a.note-unread.unread').first().attr('href');
                                       if (val !== '') { buttonurl = "http://www.furaffinity.net" + val; }
                                     }
        });
    }
    createNotification(message);
}

///When the message count changes show a notification
function sendUpdateNotification(newHotness)
{
    var message = formatUpdateNotification(newHotness);
    var gotNewNote = newHotness[5] > 0;

    if (message.length > 0) {
        newMsgNotification("New messages received. \r\n" + message, gotNewNote);
    }
}


/// Go to messages if notification popup is clicked, creating window if necessary
/// (Is this not implemented in Chrome?!)
function srslyPopUp(ID)
{
    chrome.windows.getAll(
        function(Windows)
        {
            if (Windows.length === 0) {
                chrome.windows.create(function(w) {chrome.tabs.create({url: buttonurl});});}
            else {
                chrome.tabs.create({url: buttonurl}, function (T) {
                    chrome.windows.update(T["windowId"], {focused: true});
                });
            }
            chrome.notifications.clear(ID, function(){} );
        });
}


/// Page parsing Code.  Starts with an HTML page and spits out an array of message counts.
/// Side effectful: fills the keywordPosters, commentPosters, watchers
function parseData(pageHTML)
{
    DEBUG('finding new messages');
    var msgCount = zeroMsgs.slice(0);
    dom = $(pageHTML);

    // Look in header table for message list
    var notifText = dom.find('.header_bkg li.noblock').text(); //Classic UI
    //var notifText = dom.find('#messagebar').text();   //Beta UI
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

    // Don't update the keyword count unless we're on the keyword page OR we know there aren't any journals
    msgCount[7] = undefined;

    // If we got no comments, then no comment posters
    if (msgCount[1] === 0) { commentPosters = [];}
    // If we got no journals, then no journal posters
    if (msgCount[2] === 0) { keywordPosters = []; msgCount[7] = 0;}
    // If we got no watches, then no watchers
    if (msgCount[3] === 0) { newWatchers = [];}


    //If we're on the User Control Panel page pull out relevent info
    if (pageHTML.indexOf("<title>User control panel") > 0) {
        var authors_obs = [];

        //Pull journals containing keywords
        var keywordmatch = 0;
        if (msgCount[2] > 0) { // No point hunting if we know there's no journals
            var userpos;
            var j_links = dom.find('#messages-journals li').each(function(index, listItem) {
                jdata = $(this).text();
                if ((jdata !== null) & (findMatchIn(jdata.toLowerCase(), tagList))) {
                    keywordmatch++;
                    jdata = jparser.exec(jdata);
                    authors_obs.push(jdata[1]);
                }
            });
            if (j_links.size() === 0) { DEBUG('Could not find journals on this page.'); }
            else  {msgCount[7] = keywordmatch; keywordPosters = authors_obs;}
        }

        //Pull comments
        var c_links;
        var msgSelector = '#messages-shouts li, #messages-comments-submission li, #messages-comments-journal li';
        if (msgCount[1] > 0) {
            authors_obs = [];
            c_links = dom.find(msgSelector).each(function(index, listItem) {
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
            if (c_links.size() === 0) {DEBUG('could not find comments on this page.'); }
            else {
                authors_obs.sort(function(a,b) {return b['date'] - a['date'];});
                commentPosters = authors_obs.map(function(c){return c['name'];});
            }
        }


        //Pull watchers
        if (msgCount[1] > 0) {
            authors_obs = [];
            var w_links = dom.find('.info').each(function(index, listItem) {
                var wdata = wparser.exec($(this).text());
                if (wdata !== null) {authors_obs.push(wdata[1]);}
            });
            if (c_links.size() === 0) {DEBUG('could not find watchers on this page.');}
            else {newWatchers  = authors_obs;}
        }
    }

    if (hasNotifs | REMsg.test(dom)) { return msgCount; }

    else {
        DEBUG("No submission data found.");
        return null;
    }
}

/// Helper functionsies
function enreddenBadge()
{
    chrome.browserAction.setBadgeBackgroundColor({color: [255, 0,   0,   255]});
}
function grayatizeBadge()
{
    chrome.browserAction.setBadgeBackgroundColor({color: [128, 128, 128, 255]});
}

/// Do I/O type stuff when comparing current message count with last observed count
/// If passive = false, we are on an "active update", meaning currently browsing FA
/// or just clicked the popup, so reset things.
/// Returns an array of interesting messages to craft popups
function updateNewMessages(msgCount, passive)
{
    if (msgCount[7] === undefined) { msgCount[7] = lastMsgCount[7]; }
    DEBUG('Found messages: ' + msgCount.toString());


    // If this is a passive update, increment badge, do not touch msgsViewed. 
    // If this is an active update, always set badge to 0, reset msgsViewed.
    // lastMsgCount always increases. If it changes, send new notifications.
    // Tracking journal authors would be a small improvement.
    var newHotness = zeroMsgs.slice(0);  // Very latest messages, update quickly
    var allUnread  = zeroMsgs.slice(0);  // Everything we haven't read yet, update slowly

    // Get a count of updates we care about, currently msgsViewed holds the count from the prior update
    for (var i = 0; i < msgCount.length; i++) {
        newHotness[i] = (msgCount[i] - lastMsgCount[i])*watchOptions[i];
        allUnread[i]  = (msgCount[i] - msgsViewed[i])  *watchOptions[i];
    }
    var hotCount     = newHotness.reduce(sum);
    var unreadCount  = allUnread.reduce(sum);

    if (hotCount > 0) { sendUpdateNotification(newHotness); }


    // Set red badge for new & unseen messages, but not if we're currently on FA
    var badgeNum;
    if ((unreadCount > 0) && passive)     { enreddenBadge();  badgeNum = unreadCount;}
    else                                  { grayatizeBadge(); badgeNum = 0; }

    if (badgeNum > 0) {
        chrome.browserAction.setBadgeText( {"text": badgeNum.toString()});
        DEBUG('Set badge to ' + badgeNum.toString());
    }
    else {
        chrome.browserAction.setBadgeText( {"text": ""} );
        DEBUG('[global] Cleared badge.' + ' Passive: ' + passive +
              ' hotCount: ' + hotCount  + ' unreadCount: ' + unreadCount
              );
    }


    // lastMsgCount should always track storage
    chrome.storage.sync.set({'msgCount': msgCount});
    lastMsgCount = msgCount;


    // See earlier
    if (!(passive)) { 
      DEBUG("[global] Active update - resetting msgsViewed");
      msgsViewed = msgCount;
    }

    // Hmm... we could just send notifications for individual posts instead
    return newHotness;
}


/// Fetch new messages, run callback if successful
function backgroundFetch()
{
    DEBUG("Running background fetch");
    $.ajax({
        url: "http://sfw.furaffinity.net/msg/others/",
        fail: function() { DEBUG('Fetch error');
                           chrome.browserAction.setBadgeText( {"text": ""} );
                         },
        success: processBackgroundData
    });
}

/// Handle data loaded from website, incrementing unread count
function processBackgroundData(pageHTML)
{
    var newMsgCount = parseData(pageHTML);
    return updateNewMessages(newMsgCount, true);
}

/// Handle data loaded from website, resetting unread count
function processForegroundData(pageHTML)
{
    var newMsgCount = parseData(pageHTML);
    return updateNewMessages(newMsgCount, false);
}

function startTimer(opts)
{
    processOptions(opts);
    backgroundFetch();
    setInterval(backgroundFetch, 30*1000);
}

/// Program entry point
function init()
{
    chrome.notifications.onClicked.addListener( srslyPopUp );
    DEBUG("\n\nLoading settings and starting monitor.");

    // Load options from storage, defined in parseData.js
    loadOptions(startTimer);
}

init();
