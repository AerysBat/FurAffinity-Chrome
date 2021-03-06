
var dbg = true;
function DEBUG(str) { if (dbg) { console.log(str); } }


// List of proper nouns.
notifyNames = [ "submission"    , "submissions",
                "comment"       , "comments",
                "journal"       , "journals",
                "favorite"      , "favorites",
                "watcher"       , "watchers",
                "note"          , "notes",
                "trouble ticket", "trouble tickets",
                "keyword match" , "keyword matches" ];



// Size of our global message list.  Contains 
var zeroMsgs = Array.apply(null, new Array(8)).map(Number.prototype.valueOf,0);

// From the options page; these are saved in Chrome storage
var updateInterval = 30 * 1000;
var watchOptions = [ false, true, false, false, true, true, true, false ]; // Last one is set automatically
var notifications_on = true;
var HTML_on  = true;
var keep_ads = false;
var msgCount = zeroMsgs.slice(0);
var lastMsgCount = zeroMsgs.slice(0);  // Messages on last check of any sort
var tagList  = [];
var userList = [];
var UIBeta   = true;

var localVars = ['HTML_on', 'keep_ads', 'notifications_on'];
var syncVars  = ['updateInterval', 'watchOptions', 'tagList', 'msgCount', 'UIBeta'];




//Regular expression to parse strings of the form "55S, 1C, 22J, 9F, 2W, 2N, 1TT"
var REParser = /(\d+S)?(?:\s,)*(\d+C)?(?:\s,)*(\d+J)?(?:\s,)*(\d+F)?(?:\s,)*(\d+W)?(?:\s,)*(\d+N)?(?:\s,)*(\d+TT)?/;
// REParser     = /(\d+)?(?:\sS,)*/;
var REMsg = /No Messages/;

// Regular expression to parse journal items. Not working.
// Should return (1) journal #; (2) journal title; (3) user; (4) date
var journalParser = /[^>]*>"<a href=".?journal.?(\d+)\/">(.*?)<\/a>", posted by <[^>]*>([^<]*)<\/a>[^>]*>on ([^<]*)</;


// Atrociously messy, but what can you do
function loadOptions(callback)
{
    chrome.storage.sync.get(syncVars, function(items) {
        opts = items;

        // msgCount should be initialized even if we've never visitied the options page
        if (!items['msgCount']) {
            resetSavedMessages();
        } else {
            lastMsgCount = items['msgCount'];
        }

        opts['msgCount'] = lastMsgCount;

        chrome.storage.local.get(localVars, function(items) {
            if (items[localVars[1]] !== undefined) {
                opts['HTML_on']  = items['HTML_on'];
                opts['keep_ads'] = items['keep_ads'];
                opts['notifications_on']  = items['notifications_on'];
            }
            callback(opts);
        });
    });
}

// Useful for debugging
function resetSavedMessages() {
    DEBUG('No data stored; initializing messages to zero');
    chrome.storage.sync.set({'msgCount': zeroMsgs});
    msgCount.fill(0);
    lastMsgCount.fill(0);
}

function processOptions(opts)
{
    if (opts[syncVars[1]] !== undefined)
    {
        updateInterval   = opts['updateInterval'];
        watchOptions     = opts['watchOptions'];
        UIBeta           = opts['UIBeta'];
        tagList          = opts['tagList'];
        HTML_on          = opts['HTML_on'];
        keep_ads         = opts['keep_ads'];
        notifications_on = opts['notifications_on'];
    }
}

//Helper functions
Array.prototype.values = function() {
    var ret = [];
    for (var i in this) {
        if (this.hasOwnProperty(i)) { ret.push(this[i]); }
    }
    return ret;
};

Array.prototype.unique = function()
{
	  var n = {},r=[];
	  for(var i = 0; i < this.length; i++)
	  {
		    if (!n[this[i]])
		    {
			      n[this[i]] = true;
			      r.push(this[i]);
		    }
	  }
	  return r;
};



//Checks if str contains any element of keys
function findMatchIn(str, keys) {
    if (keys.length > 0) {
        return keys.reduce(function(previousValue, currentValue, index, array) {
            if (previousValue) {return true;}
            else {
                if (currentValue !== "" & str.includes(currentValue)) {return true;}
                return false;
            }
        }, false);
    }
    else { return false; }
}

function loadScript(url, callback)
{
    // Adding the script tag to the head as suggested before
    var head = document.getElementsByTagName('head')[0];
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = url;

    // Then bind the event to the callback function.
    // There are several events for cross browser compatibility.
    script.onreadystatechange = callback;
    script.onload = callback;

    // Fire the loading
    head.appendChild(script);
}



