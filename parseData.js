
var dbg = true;
function DEBUG(str) { if (dbg) { console.log(str); } }

//array of lowercase things
var tagList = new Array();
var userList = new Array();
var update = 30 * 1000;
var watchOptions = [false, true, false, false, true, true, true, true ];
var zeroMsgs = Array.apply(null, new Array(8)).map(Number.prototype.valueOf,0);

//Regular expression to parse strings of the form "55S, 1C, 22J, 9F, 2W, 2N, 1TT"
var REParser = /(\d+S)?(?:,)*(\d+C)?(?:,)*(\d+J)?(?:,)*(\d+F)?(?:,)*(\d+W)?(?:,)*(\d+N)?(?:,)*(\d+TT)?/;
var REMsg = /No Messages/;

//Regular expression to parse journal items.
// Returns (1) journal #, (2) journal title; (3) user; (4) date
//var journalParser = /[^>]*>"<a href=".?journal.?(\d+)\/">(.*?)<\/a>", posted by <[^>]*>([^<]*)<\/a>[^>]*>on ([^<]*)</;

//List of proper nouns
notifyNames = ["submission", "submissions",
"comment", "comments",
"journal", "journals",
"favorite", "favorites",
"watcher", "watchers",
"note", "notes",
"trouble ticket", "trouble tickets",
"keyword match", "keyword matches" ];

//Helper functions
Array.prototype.values = function() {
  var ret = []
  for (i in this) {
    if (this.hasOwnProperty(i)) { ret.push(this[i]); }
  }
  return ret;
}

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
}

//Looks if str contains any element of keys
function findMatchIn(str, keys) {
  if (keys.length > 0) {
    return keys.reduce(function(previousValue, currentValue, index, array) {
        if (previousValue) {return true;}
        else {
            if (currentValue != "" & str.includes(currentValue)) {return true;}
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



