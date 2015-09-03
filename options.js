var OPTIONS = {
    save: function() {
        DEBUG('Saving options.');
        var select = document.getElementById("updateInterval");
        var updateInterval = select.children[select.selectedIndex].value;

        tagList = document.getElementById("keywords").value.split(',');
        tagList = tagList.map(function(T) {return T.trim().toLowerCase();});
        watchOptions.forEach(function(v, ind, Arr) {Arr[ind] = document.getElementById("w" + ind.toString()).checked;});
        localVars.forEach(function(v, ind, Arr) {window[v] = document.getElementById(v).checked;});

        //Save current options and send message to extension
        OPTIONS.store(function () {
            var status = document.getElementById("status");
            status.innerHTML = "Options Saved.";
            setTimeout(function() {status.innerHTML = "";}, 750);
            chrome.extension.sendMessage( {message: "settingChanged"});
        });
    },


    store: function(callback)
    {
        chrome.storage.sync.set( { 'updateInterval': updateInterval,
                                   'tagList': tagList,
                                   'watchOptions': watchOptions.concat(tagList.length > 0) //Tack item on
                                 },
                                 function() {OPTIONS.storeLocal(callback);});
    },

    storeLocal: function (callback)
    {
        chrome.storage.local.set({ 'HTML_on': HTML_on,
                                   'notifications_on': notifications_on,
                                   'keep_ads': keep_ads
                                 },
                                 callback);
    },

    populateForm: function (opts)
    {
        processOptions(opts);

        // Synced variables, hard
        children = document.getElementById("updateInterval").children;
        for (i = 0; i < children.length; i++) {
            if (children[i].value == updateInterval) {children[i].selected = "true";}
        }
        watchOptions.pop(); // We save this with an extra item tacked on at the end
        watchOptions.forEach(function(v, ind, Arr) {document.getElementById("w" + ind.toString()).checked = v;});
        document.getElementById("keywords").value = tagList.join(", ");

        // Local variables, easy!
        localVars.forEach(function(v, ind, Arr) {document.getElementById(v).checked = window[v];});
    },

    init: function()
    {
        DEBUG('Initializing page.');
        var save = document.getElementById("save");
        save.onclick = OPTIONS.save;

        // Load previously saved options and set input areas to previous values
        // Defined in parseData.js
        loadOptions(OPTIONS.populateForm);
    }
};

window.onload = OPTIONS.init;
