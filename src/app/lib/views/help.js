(function (App) {
	'use strict';
	var dyks;

	var Help = Backbone.Marionette.ItemView.extend({
		template: '#help-tpl',
		className: 'help',

		events: {
			'click .close-icon': 'closeHelp',
			'click a': 'links'
		},

		initialize: function () {
			dyks = [
				i18n.__('You can paste magnet links anywhere in Popcorn Time with CTRL+V'),
				i18n.__('You can drag & drop a .torrent file into Popcorn Time'),
				i18n.__('The Popcorn Time project started in February 2014 and has already had 150 people that contributed more than 3000 times to its development in August 2014.'),
				i18n.__('The rule n°10 applies here.'),
				i18n.__('If a subtitle for a TV Show is missing, you can add it on <a class="link" href="http://opensubtitles.org">opensubtitles.org</a>. And the same way for a Movie, but on <a class="link" href="http://yifysubtitles.com">yifysubtitles.com</a>'),
				i18n.__('If you\'re experiencing connection drop issues, try to reduce the DHT Limit in Settings'),
				i18n.__('Search "1998" to see all movies that came out that year'),
				i18n.__('You can login to Trakt.tv to save all your watched items, and synchronize them across multiple devices.'),
				i18n.__('Clicking on the rating stars will display a number instead'),
				i18n.__('This application is entirely written in HTML5, CSS3 and Javascript'),
				i18n.__('Wanna know more about a Movie or a TV Series? Just click the IMDb icon.'),
				i18n.__('Clicking twice on a \"Sort By\" filter reverses the order of the list')
			];
		},

		onShow: function () {
			$('.search input').blur();
			Mousetrap.bind('esc', function (e) {
				App.vent.trigger('help:close');
			});
			var dyk = dyks[_.random(dyks.length - 1)];
			$('.randomized-dyk').html(dyk);
		},

		onClose: function () {},

		closeHelp: function () {
			App.vent.trigger('help:close');
		},

		links: function (e) {
			e.preventDefault();
			gui.Shell.openExternal($(e.currentTarget).attr('href'));
		}

	});

	App.View.Help = Help;
})(window.App);
