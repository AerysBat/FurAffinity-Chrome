/*jshint multistr: true */
//TamperMonkey stuffs
auto_load = false;
HTML_on = true;
keep_ads = false;
subparser = /^([^<]*)<[^:]*:<\/b>([^<]*)<[^:]*:<\/b>([^<]*)/;
var router; 


var styletxt = " \
  #floating_nav {    \
    position: fixed; \
    left: 0px; z-index: 1; \
    align-content: flex-right; \
    background-color: #202225; \
    padding-bottom: 3px; \
    padding-left: 3px; \
    padding-right: 1em; \
    width: 100%;} \
  .body { \
    font-size: 11px; }\
  .button { \
  font-size: 15px; \
    line-height: 25px;} \
  li.section-controls { \
    margin-top: 0px; } \
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
  div#sitebanner { \
    display: none; } \
  .ads { \
    display: inline; } \
  ul.message-stream { \
    margin: 0px 0px 0px 0px; } \
  center.flow.with-checkboxes-titles-usernames b, center.flow.with-checkboxes-titles-usernames b {  \
    height: 300px;} \
  #ad-2, #ad-4 { \
    display: inline; \
    padding-left: 10px; \
    padding-right: 10px; \
    margin: 0px 0px 0px 0px;} \
  #mainnav { \
    top: -46px; } \
  #mainnav li {\
    padding: 9px 10px 0px 10px;\
  }\
  #furaffinity { \
    overflow: initial; \
    margin-top: 82px;} \
  #nav { \
    top: 0px; \
  } \
  ";
  
  styletxt2 =  " \
  "; 


var EDIT = { 
  addGlobalStyle: function(css) {
    var head, style;
    head = document.getElementsByTagName('head')[0];
    if (!head) { return; }
    style = document.createElement('style');
    style.type = 'text/css';
    style.innerHTML = css;
    //head.getElementsByTagName('link').item(2).onLoad = function() {
      head.appendChild(style);
    //};
  }, 
  
  

  view_enhance: function() {
    // Enhancements for a submission page.
    var img = document.getElementById('#submissionImg');
    if (img.length) {
      img.removeAttr('onclick');
      // Download button
      // var download = $('.alt1.actions a').not('.prev.button')[1];
      var download = document.querySelector('.alt1.actions a'); 
      var link = download.getAttribute('href');
      if (!window.location.hash) {
        window.location.hash = 'stay';
        window.location.href = link;
      }
      img.click(function () { window.location.href = link; });
    }
  },

// Used for setting cookies. Grabbed from W3Schools.
  setCookie: function(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    var expires = "expires="+d.toUTCString();
    document.cookie = cname + "=" + cvalue + "; Domain=.furaffinity.net; Path=/;" + expires;
  }, 

  deleteCookie: function (cname){
      document.cookie = cname + "=; Domain=.furaffinity.net; Path=/;expires=Thu, 01 Jan 1970 00:00:00 UTC";
  }, 
  
  flatten_submissions: function (scope, target) {
      // For pages that have submissions, process said submissions to enhance them.
      DEBUG("Flattening submissions~!"); 
      $('.date-divider', scope).remove();  // Probably only needed for message center.
      var submissions = $(target, scope);
      var subs = submissions.find('b.t-image');
      var idlist = [];
      msgcenter = $("#submissions_container"); 
      //msgcenter = document.getElementsByClassName("messagecenter");
      subs.each(function (index, val) {
        msgcenter.append(this);
  
        //Now do an asynchronous info query.. or don't
        if(false) {
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
        }
      });
      
  
  
      submissions.remove();
      scroll_triggered = false;
  },
  
  scroll_triggered: false,
  
  scroll_check : function (task) {
      // Wrapper function for checking for user scrolling to the bottom of the page.
      return function () {
          window_bottom = $(window).scrollTop() + $(window).height();
          document_height = $(document).height();
          if(window_bottom > document_height - 50) {
              if (EDIT.scroll_triggered) {
                DEBUG('Load in progress. Not loading more.') 
                return;
              }  // Already running. Don't spam the server.
              if (!auto_load){ return; }
              EDIT.scroll_triggered = true;
              task();
          }
     };
  },
  
  dommify: function (data) {
      // Turn text into a jQuery DOM representation.
      var parser = new DOMParser();
      var htmlDoc = parser.parseFromString(data, "text/html");
      return $(htmlDoc);
  },
  
  prepJQuery: function(callback) { 
    loadScript("http://ajax.googleapis.com/ajax/libs/jquery/1.2.6/jquery.js", callback);
  },
  
  subs_enhance: function () {
    // Enhancement for submissions messages.
    function load_new(data){
        var jdoc = EDIT.dommify(data);
        EDIT.flatten_submissions(jdoc, ".messagecenter");
        var next_buttons = $('div.navigation a.more', jdoc);
        var next = next_buttons.attr('href');
        // If we have browsed through all subs remove the next buttons.
        if ((next.indexOf("~") < 0)){
            DEBUG("next_link says we're done: " + next_link);
            $(next_buttons.selector).remove();
            //scroll_triggered = false;
            return;
        }
        $('div.navigation a.more').attr('href', next);
        EDIT.scroll_triggered = false;
    }
  
    function watched_subs_loader() {
        console.log('loading more submissions');
        var next = $('div.navigation a.more');
        var next_link = next.attr('href');
        if (!next){
          DEBUG("Couldn't find navigation to next submissions.");
          return;}
        if ((next_link.indexOf('~') < 0)){
            DEBUG("next_link says we're done: " + next_link);
            //next.remove();
            return;
        }
        $.get(next_link, load_new);
        //EDIT.scroll_triggered = false;
    }
  
    function move_nav() {
        //menuheight = $('.block-menu-top').innerHeight();
        menuheight = $('#messagebar'); 
        menuheight = menuheight.outerHeight() + menuheight.offset()['top'];
        scrolltop = $(window).scrollTop();
        if(scrolltop>menuheight) {$('#floating_nav').css('top', 0);}
        else {$('#floating_nav').css('top', menuheight - scrolltop);}
    }
  
  
  
          DEBUG("Running subs_enhance...");
          
          
    // FA's 'Queue' object is used to lazily load functions.
    // We spoof it here so it drops all of their lazily loaded code.
    //unsafeWindow.Queue = {'add': function() {}, 'process': function() {}};
    var actions = $('div.actions');
    //if (! actions.length) {return false;}
    //actions = actions.first(); 
  
    // Sure, FA, make all your CSS depend on the center tag.
    $('<center class="flow with-checkboxes-titles-usernames">' +
        '<div id="submissions_container"></div></center>').insertAfter(actions.first());
    EDIT.flatten_submissions($(document), '.messagecenter');
    $("body").css("overflow", "scroll");
    $(window).on('scroll', EDIT.scroll_check(watched_subs_loader));
    $(window).scroll(move_nav);
    $(window).resize(move_nav);
  
  
  
    // The buttons break from our shuffling of the DOM. Recode the ones that
    // matter, ditch the rest. Add our own.
    $('.oldest').hide();
    $('.newest').hide();
    $('#toggle-descriptions').hide();
    var next = $('div.navigation a.more');
    next.css('color', 'rgb(228, 228, 228)');
    next.css('display', 'inline-block');
  
    if (auto_load) {next.hide();}
    $('<a class="button" id="tab_launcher" href="#" onclick="return false;" ' +
      // For old UI 
      //'style="float: none; font-weight: normal; color: rgb(65, 82, 107); padding: 1px 6px">' +
    'style="float: none; font-weight: normal; color: rgb(228, 228, 228)">' +
        'Load checked images in tabs</a>  ').insertBefore(next);
  
    var last_run = 0;
  
  
  
  
    $("#tab_launcher").click(function () {
        var result = "<html><body>";
        var submissions = $('b.t-image small input[type=checkbox]:checked');
        if (!submissions.length) {return;}
        // Throttle this to avoid a nasty accident.
        if (!Date.now() - last_run > 5000) {return;}
        submissions.each(function () {result += '<a href="' + $(this).parent().prev().find('a').attr('href') +'" target="_blank">';});
        result += "</body></html>";
        var jdoc = dommify(result);
        var delay = 0;
        $('a', jdoc).each(function () {
            delay += 400; //Hopefully enough to prevent server overload.
            var link = $(this);
            setTimeout(function() {window.open($(link).attr('href'));}, delay);
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
  
    //var remove_checked = $('.remove-checked');
    //remove_checked.click(function (event) {
        //if (!$('b.t-image small input[type=checkbox]').prop('checked').length) {
            //event.stop();
        //}
    //});
    //remove_checked.attr('form', 'messages-form');
  
    // Remove second set of Nav controls.
    // Break into floating control box.
    var navigation = $('div.navigation');
    navigation.last().remove();
  
    actions.last().remove();
    navigation = $(navigation.selector);
    actions = $(actions.selector);
    // For old UI: 
    //$('<div id="floating_nav"></div><br><br><br>').insertAfter($('.block-menu-top'));
    $('<div id="floating_nav"></div><br><br><br>').insertAfter($('#messagebar'));
    var floating_nav = $('#floating_nav');
  
    actions.contents().prependTo(navigation);
    navigation.appendTo(floating_nav);
  
    $(' <div style="float: left; margin-left: 10px; margin-right: auto; text-align:center; padding: 5px 0;"> <label for="auto_load">Auto load more</label><input type="checkbox" ' +
      'name="auto_load" id="auto_load" style="margin: 3px 6px 3px 3px; vertical-align: middle"/></div>').insertBefore(navigation);
    var ne_checkbox = $('#auto_load');
    ne_checkbox.prop('checked', auto_load);
    ne_checkbox.change(function() {
        auto_load = Boolean($(ne_checkbox.selector).is(":checked"));
        if (auto_load) {next.hide();}
        else {next.show(); next.css('display', 'inline-block');}
        chrome.storage.local.set({'auto_load': auto_load});
    });
  
    $('.more').addClass('button');
    move_nav(); //Place the nav bar
  
  },
  
  
  note_enhance: function () {
  
    var divs = css('.subject');
    divs.find('a').css('line-height', '100%');
    divs.find('a').wrap('<div style="display: table-cell; vertical-align: middle;" />');
    divs.find('input').wrap('<div style="display: table-cell; vertical-align: middle;" />');
    divs.wrapInner('<div class="a_note_div" />');
    divs.find('input').wrap('<div class="input_note_div" />');
  },
  
  
  highlightTags: function  () {
      chrome.runtime.sendMessage( {message: 'getTags'}, function (response) { 
        EDIT.doHighlightTags(response);
      });
  },
  
  doHighlightTags: function(response) {
          tagList = response.tagList;
        journallist = $('#messages-journals li');

        //Search through journal links for list of keywords: commissions, conventions, openings, etc.
        journallist.each(function(index, listItem) {
              thisjq = $(this);
              jdata = thisjq.text().toLowerCase();
              if (jdata !== null) {
                  matched = findMatchIn(jdata, tagList);
                  if (matched) {
                    thisjq.addClass('important');
                    listItem.style.borderColor = "rgb(40, 45, 50)";
                    listItem.style.borderWidth = "1px";
                    listItem.style.borderStyle = "solid";
                    listItem.style.backgroundColor = "rgb(67, 72, 75)";
                    // Color for hover: rgb(71, 77, 82)
                    // BG color: rgb(63, 66, 71)
                    // Halfway in between: rgb(67, 72, 75)
                  }
              }
        });
        
        
                        
        // Add a button "select non-highlighted"
        buttons = $('.section-controls').last();
        c = buttons.children().eq(2).after('<input class="button mark-unimportant" type="button" value="Select non-highlighted" style="margin:0 0 0 4px">');
        buttons.children().eq(3).click(function (evt) {
          $('#messages-journals .message-stream').find('li:not(.important) input[type=checkbox]').attr('checked',true);
        });
        

          
  },

  removeStats: function() {
    $('#furaffinity :nth-child(2) .fontsize24:nth-child(1)').remove();
    $('#furaffinity :nth-child(2) .bg3 .content').remove();
  },
  

  
  runtmscript: function() {
      // We know where we are, dammit.
      DEBUG("Running runtmscript"); 
      headerAds = $('.in');
      headerAds.remove(); 
      footerAds = $('.footer .ads');
      $('.footer').remove();
      $('.sitebanner').remove();
  
      // Without the header/footer scripts, this variable is never initialized.
      // TODO: improve this.
      if (keep_ads) {
        var mt = $('.content');
        headerAds.insertAfter(mt);
        footerAds.insertAfter(mt);
        footerAds.wrap('<div style="display: flex; justify-content: center; padding-bottom: 20px;" />');
      } 
      
      //HTML edits depend on which page we're viewing
      var path = document.URL;
      DEBUG("path = " + path);
      for (var route in router) {
          if (!router.hasOwnProperty(route)) {
              continue;
          }
          if (path.indexOf(route) >= 0) {
            DEBUG("matched " + route);
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
              EDIT.deleteCookie('sfw');
          } else {
              button.addClass('active');
              EDIT.setCookie('sfw', 1, 365);
          }
          window.location.href = $(this).attr('href');
          event.stop();
      });
  },
  
  main: function () { 
        //console.log(HTML_on);
        
        DEBUG("Running modifications");
        if (HTML_on) {
          document.getElementById("header").remove(); 
          document.getElementById('ad-2').remove();
          document.getElementById('ad-4').remove();
          document.getElementById('ad-extra-flat').remove();
        
          //Change CSS stylesheet
          EDIT.addGlobalStyle(styletxt);
          
          //Run HTML edits
          EDIT.runtmscript();
        }
      chrome.extension.sendMessage({message: 'pageData',data: document.documentElement.outerHTML});
  }
};


  //Route each page to the correct tweak function
router = {'/msg/submissions': EDIT.subs_enhance, '/msg/pms': function() {}, '/msg/others': EDIT.highlightTags, '/user/': EDIT.removeStats};



//Run the GM script plus the
dbg = true;
chrome.storage.local.get(['auto_load', 'HTML_on', 'keep_ads'], function(items) {

  if (items['HTML_on'] !== null) {HTML_on = items['HTML_on'];}
  if (items['auto_load'] !== null) {auto_load = items['auto_load'];}
  if (items['keep_ads'] !== null) {keep_ads = items['keep_ads'];}


  //DOMReady(EDIT.main);
  //document.addEventListener("DOMContentLoaded", EDIT.main);
  window.onload = EDIT.main; 
});

