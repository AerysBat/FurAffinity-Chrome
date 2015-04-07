
//TamperMonkey stuffs
auto_load = false;
HTML_on = true;
keep_ads = false;
subparser = /^([^<]*)<[^:]*:<\/b>([^<]*)<[^:]*:<\/b>([^<]*)/;


//<b>Favorites:</b>
//53 <br/>
//&nbsp;&nbsp;&nbsp;&nbsp; <b>Comments:</b> 24<br/>
//&nbsp;&nbsp;&nbsp;&nbsp; <b>Views:</b> 240<br/>

function addGlobalStyle(css) {
    var head, style;
    head = document.getElementsByTagName('head')[0];
    if (!head) { return; }
    style = document.createElement('style');
    style.type = 'text/css';
    style.innerHTML = css;
    head.appendChild(style);
}

stylesheet_addn = "\
#floating_nav {    \
  position: fixed; \
  left: 0px; z-index: 1; \
  align-content: flex-right; \
  background-color: #202225; \
  padding-bottom: 3px; \
  padding-left: 3px; \
  padding-right: 1em; \
  width: 100%;} \
.remove-nuke {\
  background-color: #FFAFAF;\
  font-weight: bold;}\
.more.button {\
  float:none;\
  font-weight: normal; \
  padding: 1px 6px; \
  color: #41526b; \
  display: inline; }\
li#sfw-toggle-enhanced.active {   \
  background-color: #090;}\
.navigation { \
  float: right; \
  padding-right: 10px;} \
.a_note_div { \
  float: left; \
  height: 100%; \
  display: table; \
  padding-right: 10px;} \
.input_note_div { \
  float: left; } \
.t-image { \
  height: 300px; } \
.in { \
  display: flex; \
  justify-content: center; } \
.ads { \
  display: inline; } \
#ad-2, #ad-4 { \
  display: inline; \
  padding-left: 10px; \
  padding-right: 10px;} \
";


function view_enhance() {
    // Enhancements for a submission page.
    var img = $('#submissionImg');
    if (img.length) {
        img.removeAttr('onclick');
        // Download button
        var download = $('.alt1.actions a').not('.prev.button')[1];
        var link = download.getAttribute('href');
        if (!window.location.hash) {
            window.location.hash = 'stay';
            window.location.href = link;
        }
        img.click(function () { window.location.href = link; })
    }
}

// Used for setting cookies. Grabbed from W3Schools.
function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    var expires = "expires="+d.toUTCString();
    document.cookie = cname + "=" + cvalue + "; Domain=.furaffinity.net; Path=/;" + expires;
}

function deleteCookie(cname){
    document.cookie = cname + "=; Domain=.furaffinity.net; Path=/;expires=Thu, 01 Jan 1970 00:00:00 UTC";
}

function flatten_submissions(scope, target) {
    // For pages that have submissions, process said submissions to enhance them.
    $('.date-divider', scope).remove();  // Probably only needed for message center.
    var submissions = $(target, scope);
    var subs = submissions.find('b.t-image');
    var idlist = [];
    subs.each(function (index, val) {
      $("#submissions_container").append(this);

      //Now do an asynchronous info query
      var url = $(val).find('u a').attr('href');
      idlist[index] = "#" + $(this).attr("id");
      $.ajax({
        url: url,
        success: function(data) {
          d = data.indexOf('Favorites:</b>');
          img_info = subparser.exec(data.substring(d+14));
          img_info = '<span>(' + img_info[1].trim() + "F, " + img_info[2].trim() + "C, " + img_info[3].trim() + "V)</span>" ;
          $(idlist[index]).append($(img_info));
        }}).error(function() {
        DEBUG('[flatten_submissions] Fetch error');
      });
    });


    submissions.remove();
}

var scroll_triggered = false;

function scroll_check(task) {
    // Wrapper function for checking for user scrolling to the bottom of the page.
    return function () {
        window_bottom = $(window).scrollTop() + $(window).height();
        document_height = $(document).height();
        if(window_bottom > document_height - 50) {
            if (scroll_triggered) {return;}  // Already running. Don't spam the server.
            if (!auto_load){ return; }
            scroll_triggered = true;
            task();
        }
   }
}

function dommify(data) {
    // Turn text into a jQuery DOM representation.
    var parser = new DOMParser();
    var htmlDoc = parser.parseFromString(data, "text/html");
    return $(htmlDoc);
}

function subs_enhance() {

  // Enhancement for submissions messages.
  function load_new(data){
      var jdoc = dommify(data);
      flatten_submissions(jdoc, ".messagecenter");
      var next_buttons = $('div.navigation a.more', jdoc);
      var next = next_buttons.attr('href');
      if (! (next.indexOf("~") >= 0)){
          // If we reach the end remove all next buttons.
          $(next_buttons.selector).remove();
          return
      }
      $('div.navigation a.more').attr('href', next);
      scroll_triggered = false;
  }

  function watched_subs_loader() {
      console.log('loading more submissions');
      var next = $('div.navigation a.more');
      var next_link = next.attr('href');
      if (!next){return;}
      if (!(next_link.indexOf('~') >= 0)){
          next.remove();
          return;
      }
      $.get(next_link, load_new)
  }

  function move_nav() {
      menuheight = $('.block-menu-top').innerHeight();
      scrolltop = $(window).scrollTop();
      if(scrolltop>menuheight) {$('#floating_nav').css('top', 0);}
      else {$('#floating_nav').css('top', menuheight - scrolltop);}
  }

  // FA's 'Queue' object is used to lazily load functions.
  // We spoof it here so it drops all of their lazily loaded code.
  //unsafeWindow.Queue = {'add': function() {}, 'process': function() {}};
  var actions = $('div.actions');
  if (! actions.length) {return;}

  // Sure, FA, make all your CSS depend on the center tag.
  $('<center class="flow with-checkboxes-titles-usernames">' +
      '<div id="submissions_container"></div></center>').insertAfter(actions);
  flatten_submissions($(document), '.messagecenter');
  $("body").css("overflow", "scroll");
  $(window).on('scroll', scroll_check(watched_subs_loader));
  $(window).scroll(move_nav);
  $(window).resize(move_nav);



  // The buttons break from our shuffling of the DOM. Recode the ones that
  // matter, ditch the rest. Add our own.
  $('.oldest').hide();
  $('.newest').hide();
  $('#toggle-descriptions').hide();
  var next = $('div.navigation a.more');

  if (auto_load) {next.hide();}
  $('<a class="button" id="tab_launcher" href="#" onclick="return false;" ' +
    'style="float: none; font-weight: normal; color: rgb(65, 82, 107); padding: 1px 6px">' +
      'Load checked images in tabs</a>  ').insertBefore(next);

  var last_run = 0




  $("#tab_launcher").click(function () {
      var result = "<html><body>";
      var submissions = $('b.t-image small input[type=checkbox]:checked');
      if (!submissions.length) {return;}
      // Throttle this to avoid a nasty accident.
      if (!Date.now() - last_run > 5000) {return;}
      submissions.each(function () {result += '<a href="' + $(this).parent().prev().find('a').attr('href') +'" target="_blank">'});
      result += "</body></html>";
      var jdoc = dommify(result);
      var delay = 0;
      $('a', jdoc).each(function () {
          delay += 400; //Hopefully enough to prevent server overload.
          var link = $(this);
          setTimeout(function() {window.open($(link).attr('href'))}, delay);
      });
  });


  var invert_selection = $('.invert-selection');
  invert_selection.click(function() {$('b.t-image small input[type=checkbox]').trigger('click');});
  invert_selection.removeClass('hidden');
  var checked = false;
  var check_uncheck = $('.check-uncheck');
  check_uncheck.click(function () {
      checked = !checked;
      $('b.t-image small input[type=checkbox]').prop('checked', checked);
  });
  check_uncheck.removeClass('hidden');
  var nuke = $('.remove-nuke');
  nuke.attr('form', 'messages-form');
  nuke.click(function (event){
      if (! confirm("Are you sure you want to nuke all submissions?")){
          event.stop();
      }
  });

  var remove_checked = $('.remove-checked');
  remove_checked.click(function (event) {
      if (!$('b.t-image small input[type=checkbox]').prop('checked').length) {
          event.stop()
      }
  });
  remove_checked.attr('form', 'messages-form');

  // Remove second set of Nav controls.
  // Break into floating control box.
  var navigation = $('div.navigation');
  navigation.last().remove();

  actions.last().remove();
  navigation = $(navigation.selector);
  actions = $(actions.selector);
  $('<div id="floating_nav"></div><br><br><br>').insertAfter($('.block-menu-top'));
  var floating_nav = $('#floating_nav');

  actions.contents().prependTo(navigation);
  navigation.appendTo(floating_nav);

  $(' <div style="float: left; margin-left: 10px; margin-right: auto; text-align:center"> <label for="auto_load">Auto load more</label><input type="checkbox" ' +
    'name="auto_load" id="auto_load" style="margin: 3px 6px 3px 3px; vertical-align: middle"/></div>').insertBefore(navigation);
  var ne_checkbox = $('#auto_load');
  ne_checkbox.prop('checked', auto_load);
  ne_checkbox.change(function() {
      auto_load = Boolean($(ne_checkbox.selector).is(":checked"));
      if (auto_load) {next.hide();}
      else {next.show(); next.css('display', 'inline');}
      chrome.storage.local.set({'auto_load': auto_load});
  });

  $('.more').addClass('button');
  move_nav(); //Place the nav bar

}


function note_enhance() {

  var divs = $('.subject');
  divs.find('a').css('line-height', '100%');
  divs.find('a').wrap('<div style="display: table-cell; vertical-align: middle;" />');
  divs.find('input').wrap('<div style="display: table-cell; vertical-align: middle;" />');
  divs.wrapInner('<div class="a_note_div" />')
  //divs.find('input').wrap('<div class="input_note_div" />');
}

//Supports arbitrary number of enhancements per page
//var router = {'^/view/': view_enhance, '^/msg/submissions': subs_enhance};
var router = {'^/msg/submissions': subs_enhance, '^/msg/pms/': note_enhance};
function runtmscript() {
    // We know where we are, dammit.
    footerAds = $('.footer .ads');
    headerAds = $('.in');
    $(".block-banners").remove();
    $('.footer').remove();


    if (keep_ads) {
      var mt = $('.content');
      headerAds.insertAfter(mt);
      footerAds.insertAfter(mt);
      footerAds.wrap('<div style="display: flex; justify-content: center; padding-bottom: 20px;" />');
    }
    // Without the header/footer scripts, this variable is never initialized.
    // TODO: Make ads toggleable.
    //unsafeWindow.OA_output = false;
    var path = URI(document.URL).path();
    for (var route in router) {
        if (!router.hasOwnProperty(route)) {
            continue;
        }
        var re = RegExp(route);
        if (re.test(path)) {
            router[route]();
        }
    }
    // Fix SFW button
    var toggler = $('#sfw-toggle a');
    toggler.parent().attr('id', 'sfw-toggle-enhanced');
    // Reload to get new parent.
    toggler = $('#sfw-toggle-enhanced a');
    toggler.click(function (event) {
        var button = $(this).parent();
        if (button.hasClass('active')){
            button.removeClass('active');
            deleteCookie('sfw');
        } else {
            button.addClass('active');
            setCookie('sfw', 1, 365);
        }
        window.location.href = $(this).attr('href');
        event.stop();
    });
};




//Run the GM script plus the
dbg = false;

$(function() {

  chrome.runtime.sendMessage( {message: 'getTags'}, function (response) {

    tagList = response.tagList;
    //tagList = ["commission"];

    //Search through journal links for list of keywords: commissions, conventions, openings, etc.
    $('#messages-journals li').each(function(index, listItem) {
          jdata = $(this).text().toLowerCase();
          if (jdata !== null) {
              matched = findMatchIn(jdata, tagList);
              if (matched) {
                listItem.style.borderColor = "black";
                listItem.style.borderWidth = "thin";
                listItem.style.borderStyle = "solid";
                listItem.style.backgroundColor = "rgb(65, 80, 84)";
              }
          }
    });

    chrome.extension.sendMessage({message: 'pageData',data: document.documentElement.outerHTML});

    chrome.storage.local.get(['auto_load', 'HTML_on', 'keep_ads'],
    function(items) {
      if (items['HTML_on'] !== null) {HTML_on = items['HTML_on'];}
      if (items['auto_load'] !== null) {auto_load = items['auto_load'];}
      if (items['keep_ads'] !== null) {auto_load = items['keep_ads'];}
      //console.log(HTML_on);
      if (HTML_on) {
        runtmscript();
        addGlobalStyle(stylesheet_addn);
      }
    });
  });

});

