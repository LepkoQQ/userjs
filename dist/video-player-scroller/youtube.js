/* global _:false, VideoScroller:false */
(function youtube(context, window) {
  'use strict';

  let LOGGER;
  const scrollers = new WeakMap();
  const YT_PlayerState = {
    UNSTARTED: -1,
    ENDED: 0,
    PLAYING: 1,
    PAUSED: 2,
    BUFFERING: 3,
    CUED: 5,
  };
  const YT_PlayerStateString = (state) => {
    const [key] = Object.entries(YT_PlayerState).find(([key, value]) => value === state);
    return key || `UNKNOWN (${state})`;
  };

  const scrollerOptions = {
    color: '#f00',
    getVolumeWheelElement(player) {
      return player.parentElement;
    },
    getBottomOffset(player) {
      const chromeBottom = _.get('.ytp-chrome-bottom', player);
      return chromeBottom ? _.getStyle(chromeBottom, 'height') + _.getStyle(chromeBottom, 'left') + _.getStyle(chromeBottom, 'paddingTop') : 0;
    },
    getTopOffset(player) {
      const chromeTop = _.get('.ytp-chrome-top', player);
      const chromeBottom = _.get('.ytp-chrome-bottom', player);
      return chromeTop ? _.getStyle(chromeTop, 'height') + _.getStyle(chromeBottom, 'left')  : 0;
    },
    getLeftOffset(player) {
      const chromeBottom = _.get('.ytp-chrome-bottom', player);
      return chromeBottom ? _.getStyle(chromeBottom, 'left') : 0;
    },
    getVolume(player) {
      return player.isMuted() ? 0 : player.getVolume();
    },
    changeVolume(player, increase) {
      const step = increase ? 5 : -5;
      const volume = player.isMuted() ? 0 : player.getVolume();
      const newVolume = Math.max(Math.min(volume + step, 100), 0);
      if (newVolume > 0) {
        player.unMute();
      }
      player.setVolume(newVolume);
      return newVolume;
    },
    setPlaybackRate(player, value) {
      const video = _.get('video', player);
      const rates = player.getAvailablePlaybackRates();
      const index = rates.indexOf(value);
      if (index !== -1) {
        player.setPlaybackRate(value);
      }
      video.playbackRate = value;
    },
    getVideoDuration(player) {
      return player.getDuration();
    },
    getCurrentTime(player) {
      return player.getCurrentTime();
    },
    isPaused(player) {
      return ![YT_PlayerState.PLAYING, YT_PlayerState.BUFFERING].includes(player.getPlayerState());
    },
    playOrPause(player) {
      if ([YT_PlayerState.PLAYING, YT_PlayerState.BUFFERING].includes(player.getPlayerState())) {
        player.pauseVideo();
      } else {
        player.playVideo();
      }
      return true;
    },
    seekVideo(player, event) {
      const step = VideoScroller.getStepSizeFromKeyEvent(event);
      if (step !== 0) {
        const playerTime = player.getCurrentTime();
        if (playerTime) {
          player.seekTo(playerTime + step, true);
          return true;
        }
      }
      return false;
    },
  };

  function stopAutoplay(player) {
    // On first load it sometimes says it's PLAYING, when its actually BUFFERING.
    // If you call pauseVideo at that time, it will change state to PAUSE, however when it stops buffering,
    // it will change to PLAYING again, so we need pause in onStateChange when new state is PLAYING.
    const state = player.getPlayerState();
    LOGGER.log('stop autoplay called; state =', YT_PlayerStateString(state));
    const onStateChange = (newState) => {
      console.log('state changed; state =', YT_PlayerStateString(newState));
      if (newState === YT_PlayerState.PLAYING) {
        console.log('trying to pause');
        player.pauseVideo();
        player.removeEventListener('onStateChange', onStateChange);
      }
    };
    player.addEventListener('onStateChange', onStateChange);
    player.pauseVideo();

    // const onClick = () => {
    //   LOGGER.log('user clicked; removing state change listener');
    //   player.removeEventListener('onStateChange', onPlayerStateChange);
    //   document.removeEventListener('click', onClick);
    // };
    // document.addEventListener('click', onClick);
  }

  async function onNavigateFinish(page, event) {
    if (['watch', 'embed', 'channel'].includes(page)) {
      _.all(playerSelector).forEach((player) => {
        stopAutoplay(player);
      });
    }
  }

  if (context.vpsSite == null && (window.location.host.match(/\.youtube\.com$/) || window.location.host.match(/youtube\.googleapis\.com$/))) {
    context.vpsSite = {
      init(logger) {
        LOGGER = logger.push('youtube');
        scrollerOptions.logger = LOGGER;
        LOGGER.log('started');

        _.addCSS(`
          .ext_progress_bar {
            opacity: 0;
          }
          .ytp-autohide .ext_progress_bar {
            opacity: 1;
          }
          .ytp-pause-overlay {
            display: none;
          }
          .html5-endscreen.ytp-player-content.videowall-endscreen {
            display: none;
          }
          #video-title {
            display: block !important;
            max-height: unset !important;
          }
        `);

        const playerSelector = '#player:not(.skeleton) .html5-video-player, #container .html5-video-player';
        _.observeAddedElements(document, (element) => {
          if (element.matches(playerSelector)) {
            if (!scrollers.has(element)) {
              const vs = new VideoScroller(element, scrollerOptions);
              scrollers.set(element, vs);
              stopAutoplay(element);
            }
          }
        });

        if (window.location.pathname.startsWith('/embed/')) {
          onNavigateFinish('embed', null);
          return;
        }

        document.addEventListener('yt-navigate-finish', (event) => {
          const url = event?.detail?.response?.url;
          let page = event?.detail?.response?.page;
          // Fix page type on first load
          if (page === 'browse' && url && (url.startsWith('/c/') || url.startsWith('/channel/') || url.startsWith('/user/'))) {
            page = 'channel';
          }
          onNavigateFinish(page, event);
        });
      },
    };
  }
})(this, this.unsafeWindow || window);
