function openUrl(event) {
    window.close();
    chrome.tabs.create( { "url": event.data } );
}

$.ajax({
  url: "http://sfw.furaffinity.net/controls/messages/",
  success: function(data) {
	  if (data.indexOf('<b>Please log in!</b>') == -1) {
	    chrome.runtime.sendMessage( {message: "pageData", data: data});

      console.log('[popover] Updated Page Info ');
      $('#data').empty();
	    var messages = jQuery(data).find('.alt1.addpad').find('a');
	    messages.each(function(index) {
  	    var cssClass;
	      if ($(this).text().charAt(0) == '0')
  	      {cssClass = 'class="none"';}
	      $('#data').append('<a id="link' + index + '" ' + cssClass + ' href="#">' + $(this).text() + '</a><br>');
	      $('#link' + index).click('http://www.furaffinity.net' + $(this).attr('href'), openUrl);
      });

      chrome.runtime.sendMessage({message: 'getCount'},
        function(response) {
          //console.log('[popover] Received msgCount Reply ');
          var cssClass;
          if (response.msgCount[7] === 0) {cssClass = 'class="none"';}
          $('#data').append('<a id="keywords' + '" ' + cssClass + ' href="#">' + response.msgCount[7] + " New Keywords" + '</a><br>');
	        $('#keywords').click('http://www.furaffinity.net/msg/others/' + $(this).attr('href'), openUrl);
      });
	  }

    else {
	    $('#data').html('<a id="login" href="#">Click here</a> to log in to your FurAffinity account.');
	    $('#login').click('http://sfw.furaffinity.net/login/', openUrl);
	    chrome.runtime.sendMessage( {message: "setCount", count: ""} );
    }
  }
}).fail(function() {console.log('[popover.js] Fetch error');});
