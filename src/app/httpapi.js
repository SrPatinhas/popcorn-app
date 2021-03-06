(function (App) {
	'use strict';
	var rpc = require('json-rpc2');
	var server;
	var lang;
	var nativeWindow = require('nw.gui').Window.get();
	var httpServer;

	var initServer = function () {
		server = rpc.Server({
			'headers': { // allow custom headers is empty by default
				'Access-Control-Allow-Origin': '*'
			}
		});

		server.expose('ping', function (args, opt, callback) {
			popcornCallback(callback);
		});

		server.expose('volume', function (args, opt, callback) {
			var volume = 1;
			var view = App.PlayerView;
			if (view !== undefined && view.player !== undefined) {
				if (args.length > 0) {
					volume = parseFloat(args[0]);
					if (volume > 0) {
						if (view.player.muted()) {
							view.player.muted(false);
						}
						view.player.volume(volume);
					} else {
						view.player.muted(true);
					}
				} else {
					volume = view.player.volume();
				}
			}
			popcornCallback(callback, 'Cant change volume, player not open');
		});

		server.expose('toggleplaying', function (args, opt, callback) {
			Mousetrap.trigger('space');
			popcornCallback(callback);
		});

		server.expose('togglemute', function (args, opt, callback) {
			Mousetrap.trigger('m');
			popcornCallback(callback);
		});

		server.expose('togglefullscreen', function (args, opt, callback) {
			Mousetrap.trigger('f');
			popcornCallback(callback, false, {
				'fullscreen': nativeWindow.isFullscreen
			});
		});

		server.expose('togglefavourite', function (args, opt, callback) {
			Mousetrap.trigger('f');
			popcornCallback(callback);
		});

		server.expose('toggletab', function (args, opt, callback) {
			Mousetrap.trigger('tab');
			popcornCallback(callback);
		});

		server.expose('togglewatched', function (args, opt, callback) {
			Mousetrap.trigger('w');
			popcornCallback(callback);
		});

		server.expose('togglequality', function (args, opt, callback) {
			Mousetrap.trigger('q');
			popcornCallback(callback);
		});

		server.expose('showslist', function (args, opt, callback) {
			App.vent.trigger('shows:list');
			popcornCallback(callback);
		});

		server.expose('movieslist', function (args, opt, callback) {
			App.vent.trigger('movies:list');
			popcornCallback(callback);
		});

		server.expose('getplaying', function (args, opt, callback) {
			var view = App.PlayerView;
			var playing = false;
			if (view !== undefined && view.player !== undefined && !view.player.paused()) {
				var result = {
					'playing': true,
					'title': view.model.get('title'),
					'movie': view.isMovie(),
					'quality': view.model.get('quality'),
					'downloadSpeed': view.model.get('downloadSpeed'),
					'uploadSpeed': view.model.get('uploadSpeed'),
					'activePeers': view.model.get('activePeers'),
					'volume': view.player.volume(),
					'currentTime': App.PlayerView.player.currentTime(),
					'duration': App.PlayerView.player.duration()
				};

				if (result.movie) {
					result['imdb_id'] = view.model.get('imdb_id');
				} else {
					result['tvdb_id'] = view.model.get('tvdb_id');
					result['season'] = view.model.get('season');
					result['episode'] = view.model.get('episode');
				}

				popcornCallback(callback, false, result);
			} else {
				popcornCallback(callback, false, {
					'playing': false
				});
			}
		});

		server.expose('getselection', function (args, opt, callback) {
			var movieView = App.Window.currentView.MovieDetail.currentView;
			console.log(args);
			if (movieView === undefined || movieView.model === undefined) {
				var index = $('.item.selected').index();
				if (args.length > 0) {
					index = parseFloat(args[0]);
				} else {
					if (index === -1) {
						index = 0;
					}
				}
				var result = App.Window.currentView.Content.currentView.ItemList.currentView.collection.models[index];
				if (result === undefined) {
					popcornCallback(callback, 'Index not found');
				}

				var type = result.get('type');
				switch (type) {
				case 'movie':
					popcornCallback(callback, false, result);
					break;
				case 'show':
				case 'anime':
					result.set('health', false);
					var provider = App.Providers.get(result.get('provider'));
					var data = provider.detail(result.get('imdb_id'), result.attributes,
						function (err, data) {
							data.provider = provider.name;
							result = new App.Model[type.charAt(0).toUpperCase() + type.slice(1)](data);
							popcornCallback(callback, false, result);
						}
					);
					break;
				}
			} else {
				popcornCallback(callback, false, movieView.model);
			}
		});

		server.expose('getcurrentlist', function (args, opt, callback) {
			var collection = App.Window.currentView.Content.currentView.ItemList.currentView.collection;
			var result = collection.models;
			var page = 0;
			if (args.length > 0) {
				page = parseInt(args[0]);
				var size = page * 50;
				if (result.length < size) {
					collection.on('loaded', function () {
						result = collection.models;
						if (result.length >= size) {
							result = result.slice((page - 1) * 50, size);
							popcornCallback(callback, false, {
								'type': result[0].get('type'),
								'list': result,
								'page': page,
								'max_page': App.Window.currentView.Content.currentView.ItemList.currentView.collection.filter.page
							});
						} else {
							collection.fetchMore();
						}
					});
					collection.fetchMore();
				} else {
					result = result.slice((page - 1) * 50, size);
					popcornCallback(callback, false, {
						'type': result[0].get('type'),
						'list': result,
						'page': page,
						'max_page': App.Window.currentView.Content.currentView.ItemList.currentView.collection.filter.page
					});
				}
			} else {
				page = App.Window.currentView.Content.currentView.ItemList.currentView.collection.filter.page;
				popcornCallback(callback, false, {
					'type': result[0].get('type'),
					'list': result,
					'page': page,
					'max_page': page
				});
			}
		});

		server.expose('getplayers', function (args, opt, callback) {
			var players = App.Device.Collection.models;
			for (var i = 0; i < players.length; i++) {
				players[i].unset('path');
			}

			popcornCallback(callback, false, {
				'players': players
			});
		});

		server.expose('setplayer', function (args, opt, callback) {
			if (args.length > 0) {
				var el = $('.playerchoicemenu li#player-' + args[0] + ' a');
				if (el.length > 0) {
					App.Device.Collection.setDevice(args[0]);
					$('.playerchoicemenu li a.active').removeClass('active');
					el.addClass('active');
					$('.imgplayerchoice').attr('src', el.children('img').attr('src'));
					popcornCallback(callback, false);
				} else {
					popcornCallback(callback, 'Player ID invalid');
				}
			} else {
				popcornCallback(callback, 'Arguments missing');
			}
		});

		server.expose('getviewstack', function (args, opt, callback) {
			popcornCallback(callback, false, {
				'viewstack': App.ViewStack
			});
		});

		server.expose('getfullscreen', function (args, opt, callback) {
			nativeWindow = require('nw.gui').Window.get();
			popcornCallback(callback, false, {
				'fullscreen': nativeWindow.isFullscreen
			});
		});

		server.expose('getcurrenttab', function (args, opt, callback) {
			popcornCallback(callback, false, {
				'tab': App.currentview
			});
		});

		//Filter Bar
		server.expose('getgenres', function (args, opt, callback) {
			switch (App.currentview) {
			case 'shows':
			case 'anime':
				popcornCallback(callback, false, {
					'genres': App.Config.genres_tv
				});
				break;
			case 'movies':
				popcornCallback(callback, false, {
					'genres': App.Config.genres
				});
				break;
			default:
				popcornCallback(callback, false, {
					'genres': []
				});
				break;
			}
		});

		server.expose('getsorters', function (args, opt, callback) {
			switch (App.currentview) {
			case 'shows':
			case 'anime':
				popcornCallback(callback, false, {
					'sorters': App.Config.sorters_tv
				});
				break;
			case 'movies':
				popcornCallback(callback, false, {
					'sorters': App.Config.sorters
				});
				break;
			default:
				popcornCallback(callback, false, {
					'sorters': []
				});
				break;
			}
		});

		server.expose('gettypes', function (args, opt, callback) {
			switch (App.currentview) {
			case 'anime':
				popcornCallback(callback, false, {
					'types': App.Config.types_anime
				});
				break;
			default:
				popcornCallback(callback, false, {
					'types': []
				});
				break;
			}
		});

		server.expose('filtergenre', function (args, opt, callback) {
			if (args.length <= 0) {
				popcornCallback(callback, 'Arguments missing');
				return;
			}

			$('.genres .dropdown-menu a[data-value="' + args[0].toLowerCase() + ']').click();
			popcornCallback(callback);
		});

		server.expose('filtersorter', function (args, opt, callback) {
			if (args.length <= 0) {
				popcornCallback(callback, 'Arguments missing');
				return;
			}

			$('.sorters .dropdown-menu a[data-value="' + args[0].toLowerCase() + '"]').click();
			popcornCallback(callback);
		});

		server.expose('filtertype', function (args, opt, callback) {
			if (args.length <= 0) {
				popcornCallback(callback, 'Arguments missing');
				return;
			}

			$('.types .dropdown-menu a[data-value="' + args[0].toLowerCase() + '"]').click();
			popcornCallback(callback);
		});

		server.expose('filtersearch', function (args, opt, callback) {
			if (args.length <= 0) {
				popcornCallback(callback, 'Arguments missing');
				return;
			}

			$('#searchbox').val(args[0]);
			$('.search form').submit();
			popcornCallback(callback);
		});

		server.expose('clearsearch', function (args, opt, callback) {
			$('.remove-search').click();
			popcornCallback(callback);
		});

		server.expose('startstream', function (args, opt, callback) {
			if (args.imdb_id === undefined || args.torrent_url === undefined || args.backdrop === undefined || args.subtitle === undefined || args.selected_subtitle === undefined || args.title === undefined || args.quality === undefined || args.type === undefined) {
				popcornCallback(callback, 'Arguments missing');
			} else {
				var torrentStart = new Backbone.Model({
					imdb_id: args.imdb_id,
					torrent: args.torrent_url,
					backdrop: args.backdrop,
					subtitle: args.subtitle,
					defaultSubtitle: args.selected_subtitle,
					title: args.title,
					quality: args.quality,
					type: args.type,
					device: App.Device.Collection.selected
				});
				App.vent.trigger('stream:start', torrentStart);
				popcornCallback(callback);
			}
		});

		//Standard controls
		server.expose('seek', function (args, opt, callback) {
			if (args.length <= 0) {
				popcornCallback(callback, 'Arguments missing');
				return;
			}

			var view = App.PlayerView;
			args = parseFloat(args[0]);
			if (view !== undefined && view.player !== undefined && args !== undefined) {
				App.PlayerView.seek(args);
			}
			popcornCallback(callback);
		});

		server.expose('up', function (args, opt, callback) {
			Mousetrap.trigger('up');
			popcornCallback(callback);
		});

		server.expose('down', function (args, opt, callback) {
			Mousetrap.trigger('down');
			popcornCallback(callback);
		});

		server.expose('left', function (args, opt, callback) {
			Mousetrap.trigger('left');
			popcornCallback(callback);
		});

		server.expose('right', function (args, opt, callback) {
			Mousetrap.trigger('right');
			popcornCallback(callback);
		});

		server.expose('enter', function (args, opt, callback) {
			Mousetrap.trigger('enter');
			popcornCallback(callback);
		});

		server.expose('back', function (args, opt, callback) {
			Mousetrap.trigger('backspace');
			popcornCallback(callback);
		});

		server.expose('previousseason', function (args, opt, callback) {
			Mousetrap.trigger('ctrl+up');
			popcornCallback(callback);
		});

		server.expose('nextseason', function (args, opt, callback) {
			Mousetrap.trigger('ctrl+down');
			popcornCallback(callback);
		});

		server.expose('subtitleoffset', function (args, opt, callback) {
			if (args.length <= 0) {
				popcornCallback(callback, 'Arguments missing');
				return;
			}
			App.PlayerView.adjustSubtitleOffset(parseFloat(args[0]));
			popcornCallback(callback);
		});

		server.expose('getsubtitles', function (args, opt, callback) {
			popcornCallback(callback, false, {
				'subtitles': _.keys(App.MovieDetailView.model.get('subtitle'))
			});
		});

		server.expose('setsubtitle', function (args, opt, callback) {
			if (args.length <= 0) {
				popcornCallback(callback, 'Arguments missing');
				return;
			}
			if (App.ViewStack[App.ViewStack.length - 1] === 'player') {
				var tracks = App.PlayerView.player.textTracks();
				var track = null;
				var track_index = null;
				for (var i = 0; i < tracks.length; i++) {
					track = tracks[i];
					if (track.language_ === lang) {
						track_index = i + 1;
					} else {
						track.hide();
						track == null;
					}
				}

				if (track !== null) {
					track.show();
					$('.vjs-subtitles-button li').attr('aria-selected', false).removeChild('vjs-selected');
					$('.vjs-subtitles-button li').removeChild('vjs-selected');
					$('.vjs-subtitles-button li:nth-child(' + track_index + ')').attr('aria-selected', true);
					$('.vjs-subtitles-button li:nth-child(' + track_index + ')').addClass('vjs-selected');
				}
			}
			App.MovieDetailView.switchSubtitle(args[0]);
			popcornCallback(callback);
		});

		server.expose('listennotifications', function (args, opt, callback) {
			var timeout;
			var startTime = (new Date()).getTime();
			var events = {};

			var emitEvents = function () {
				popcornCallback(callback, false, {
					'events': events
				});
			};

			//Do a small delay before sending data in case there are more simultaneous events
			var reinitTimeout = function () {
				win.debug('reinitTimeout');
				//Only do a delay if the request won't time out in the meantime
				if (startTime + 8000 - (new Date()).getTime() > 250) {
					if (timeout) {
						clearTimeout(timeout);
					}
					timeout = setTimeout(emitEvents, 200);
					win.debug('setTimeout');
				}
			};

			//Listen for seek position change
			App.vent.on('seekchange', function () {
				events['seek'] = App.PlayerView.player.currentTime();
				reinitTimeout();
			});

			//Listen for volume change
			App.vent.on('volumechange', function () {
				events['volumechange'] = App.PlayerView.player.volume();
				reinitTimeout();
			});

			//Listen for seek position change
			App.vent.on('fullscreenchange', function () {
				events['fullscreen'] = nativeWindow.isFullscreen;
				reinitTimeout();
			});

			//Listen for playing change
			var playingChange = function () {
				events['playing'] = !App.PlayerView.player.paused();
				reinitTimeout();
			};

			App.vent.on('player:pause', playingChange);
			App.vent.on('player:play', playingChange);

			//Listen for view stack change
			var emitViewChange = function () {
				events['viewstack'] = App.ViewStack;
				reinitTimeout();
			};

			App.vent.on('viewstack:push', emitViewChange);
			App.vent.on('viewstack:pop', emitViewChange);
		});
	};

	var sockets = [];

	function startListening() {
		httpServer = server.listen(Settings.httpApiPort);

		httpServer.on('connection', function (socket) {
			sockets.push(socket);
			socket.setTimeout(4000);
			socket.on('close', function () {
				console.log('socket closed');
				sockets.splice(sockets.indexOf(socket), 1);
			});
		});
	}

	function closeServer(cb) {
		httpServer.close(function () {
			cb();
		});
		for (var i = 0; i < sockets.length; i++) {
			console.log('socket #' + i + ' destroyed');
			sockets[i].destroy();
		}
	}

	function popcornCallback(callback, err, result) {
		if (result === undefined) {
			result = {};
		}
		result['popcornVersion'] = App.settings.version;
		callback(err, result);
	}

	initServer();

	App.vent.on('initHttpApi', function () {
		console.log('Reiniting server');
		server.enableAuth(Settings.httpApiUsername, Settings.httpApiPassword);
		if (httpServer) {
			closeServer(startListening);
		} else {
			startListening();
		}
	});

})(window.App);
