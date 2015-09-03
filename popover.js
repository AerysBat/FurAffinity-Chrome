function openUrl(event) {
    window.close();
    chrome.tabs.create( { "url": event.data } );
}

$.ajax({ url: "http://sfw.furaffinity.net/controls/messages/",
         error: function() { console.log('[popover.js] Fetch error'); },
         success: pageDataCallback
       });


function pageDataCallback(htmlData) {

    // Prompt for login if necessary
    if (htmlData.indexOf('<b>Please log in!</b>') != -1) {
        $('#data').html('<a id="login" href="#">Click here</a> to log in to your FurAffinity account.');
	      $('#login').click('http://sfw.furaffinity.net/login/', openUrl);
	      chrome.runtime.sendMessage( {message: "setCount", count: ""} );
    }
    else {
        console.log("[popover] Popup received HTML data");
	      chrome.runtime.sendMessage( {message: "popoverData", data: htmlData},
                                    function(response) {msgDataCallback(response.newMsgCount, htmlData);});
    }
}

// We will have a response
function msgDataCallback(newMsgCount, htmlData) {
    console.log('[popover] Received message count ' + newMsgCount);

    $('#data').empty();

    var messages = jQuery(htmlData).find('.alt1.addpad').find('a');
    messages.each(
        function(index)
        {
            if (newMsgCount[index] > 0) {
                var cssClass;
                if (($(this).text().charAt(0) == '0')) {cssClass = 'class="none"';}
                $('#data').append('<a id="link' + index + '" ' + cssClass +
                                  ' href="#">' + $(this).text() + '</a><br>');
                $('#link' + index).click('http://www.furaffinity.net' + $(this).attr('href'), openUrl);
        }
    });

    // Construct the "Keywords" field
    var cssClass;
    if (newMsgCount[7] > 0) {
        $('#data').append('<a id="keywords' + '" ' +
                          cssClass + ' href="#">' +
                          newMsgCount[7] + " New Keywords" + '</a><br>');
        $('#keywords').click('http://www.furaffinity.net/msg/others/' +
                             $(this).attr('href'), openUrl);
    }
}
