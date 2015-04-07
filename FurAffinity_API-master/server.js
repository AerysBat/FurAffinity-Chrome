// Import the Fur Affinity API module
// Check the ./node_modules/furaffinity/furaffinity.js file for the actual functions and documentation
var fa = require('furaffinity');

// Set the FA API module to verbose (extended logging) output
fa.verbose();


// Function: errorDesc
// Description: Returns a description for a pre-defined error code
// Author: RingoTheFox
// ------------------------------------------------------------------------------------------------------
// Inputs: errorCode (integer) => Error code number
// ------------------------------------------------------------------------------------------------------
// Outputs: return (string) => The description of the error code

function errorDesc(errorCode) {
	var descriptions = {
		0: "",
		1: "Invalid API key",
		2: "Invalid request code",
		3: "Missing required input parameters",
		4: "Fur Affinity username or password is incorrect",
		5: "Invalid session token",
		6: "API failed to connect to Fur Affinity servers",
		7: "API Temporarily disabled",
		8: "Note not found"
	}
	
	return descriptions[errorCode];
}

// Set the requested function
var request = "getNoteList";

if (request == "version") {
	var outputJSON = {
		errorCode: 0,
		name: "Fur Affinity API",
		version: "1.0.0"
	};

	console.log(outputJSON);
} else if (request == "generateToken") {
	var username = "my-FA-username";
	var password = "changeme";

	fa.generateToken(username, password, function(error, sessionToken) {
		if (error == 0) {
			var outputJSON = {
				errorCode: 0,
				token: sessionToken,
				username: username
			};
			
			console.log(outputJSON);		
		} else if (error == 1) {
			var outputJSON = {
				errorCode: 4,
				errorDesc: errorDesc(4)
			};
			
			console.log(outputJSON);				
		} else if (error == 2) {
			var outputJSON = {
				errorCode: 6,
				errorDesc: errorDesc(6)
			};
			
			console.log(outputJSON);				
		}
	});
} else if (request == "getNotifications") {
	var sessionToken = 'my-session-token-here';
	
	fa.getNotifications(sessionToken, function(error, submissionCount, commentCount, journalCount, watchCount, favoriteCount, noteCount) {
		if (error == 0) {
			var outputJSON = {
				errorCode: 0,
				submissionCount: submissionCount,
				commentCount: commentCount,
				journalCount: journalCount,
				watchCount: watchCount,
				favoriteCount: favoriteCount,
				noteCount: noteCount
			};
			
			console.log(outputJSON);	
		} else if (error == 1) {
			var outputJSON = {
				errorCode: 5,
				errorDesc: errorDesc(5)
			};
			
			console.log(outputJSON);	
		} else if (error == 2) {
			var outputJSON = {
				errorCode: 6,
				errorDesc: errorDesc(6)
			};
			
			console.log(outputJSON);			
		}
	});
} else if (request == "getNoteList") {
	var sessionToken = 'my-session-token-here';
	var notePage = 1;
	
	fa.getNoteList(sessionToken, notePage, function(error, noteCount, noteList) {
		if (error == 0) {
			var outputJSON = {
				errorCode: 0,
				noteCount: noteCount,
				noteList: noteList
			};
			
			console.log(outputJSON);	
		} else if (error == 1) {
			var outputJSON = {
				errorCode: 5,
				errorDesc: errorDesc(5)
			};
			
			console.log(outputJSON);	
		} else if (error == 2) {
			var outputJSON = {
				errorCode: 6,
				errorDesc: errorDesc(6)
			};
			
			console.log(outputJSON);			
		}
	});
}