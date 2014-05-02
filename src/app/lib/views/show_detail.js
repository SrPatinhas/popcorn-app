(function(App) {
    "use strict";
        

    var ShowDetail = Backbone.Marionette.ItemView.extend({
        template: '#show-detail-tpl',
        className: 'shows-container-contain',

        ui: {
            tabsContainer: "#tabs_container div",
            seasonsList: "#tabs_season li"
        },
        events: {
            'click .startStreaming': 'startStreaming',
            'click .tv-container-close': 'closeDetails',
            'click #tabs_season li.seasonSwitch a': 'clickTab'
        },

        onShow: function() {
            this.ui.seasonsList.first().attr("id","current_season"); // Activate first tab
            this.ui.tabsContainer.fadeOut(); // hide all tabs tabs_container
            this.ui.tabsContainer.first().fadeIn(); // Show first tab tabs_container   
            $(".filter-bar").hide();    

             var background = $(".tv-poster-background").attr("data-bgr");
              $('<img/>').attr('src', background).load(function() {
                $(this).remove();
                $(".tv-poster-background").css('background-image', "url(" + background + ")");
                $(".tv-poster-background").fadeIn( 300 );
              });     
        },

        startStreaming: function(e) {
            e.preventDefault();
            var that = this;
            var epInfo = {
                imdbid: that.model.get('imdb_id'), 
                season : $(e.currentTarget).attr('data-season'),
                episode : $(e.currentTarget).attr('data-episode')
            };
            console.log(epInfo);
            App.db.getSubtitles(epInfo, function(err, subs) {
                if(err) console.error("OpenSRT Error: "+ err);
                var torrentStart = new Backbone.Model({
                    torrent: $(e.currentTarget).attr('data-torrent'), 
                    backdrop: that.model.get('images').fanart, 
                    type: "episode", 
                    show_id: that.model.get("_id"),
                    episode: $(e.currentTarget).attr('data-episode'),
                    season: $(e.currentTarget).attr('data-season'),
                    subtitle: subs,
                    title: that.model.get('title')});


                    App.vent.trigger('stream:start', torrentStart);
                    $(".filter-bar").show(); 
            });
        },

        closeDetails: function(e) {
            e.preventDefault();
			App.vent.trigger('show:closeDetail'); 
            $(".filter-bar").show(); 	
        },

        clickTab: function(e) {
            e.preventDefault();
            if ($(e.currentTarget).attr("id") != "current_season"){           
                this.ui.tabsContainer.hide(); //Hide all tabs_container
                this.ui.seasonsList.attr("id",""); //Reset id's
                $(e.currentTarget).parent().attr("id","current_season"); // Activate this
                $( $(e.currentTarget).attr('href')).fadeIn(); // Show tabs_container for current tab
            }
        },



    });

    App.View.ShowDetail = ShowDetail;
})(window.App);
