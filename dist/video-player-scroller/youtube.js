/* global _:false, VideoScroller:false */
(function youtube(context, window) {
  'use strict';

  let LOGGER;
  let stopNextAutoplay = true;
  let videoScroller;

  const scrollerOptions = {
    color: '#f00',
    getVolumeWheelElement(player) {
      return player.parentElement;
    },
    getRightOffset(player) {
      const chromeBottom = _.get('.ytp-chrome-bottom', player);
      return chromeBottom ? _.getStyle(chromeBottom, 'left') : 0;
    },
    getBottomOffset(player) {
      const chromeBottom = _.get('.ytp-chrome-bottom', player);
      return chromeBottom ? _.getStyle(chromeBottom, 'height') * 1.5 : 0;
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
    getSpeedContainerElement(player) {
      return _.get('.ytp-right-controls', player);
    },
    addSpeedTextElement(container) {
      const element = _.create('button.ytp-button', {
        style: 'position:relative',
        innerHTML: '<div style="position:absolute;top:0;width:100%;text-align:center">1x</div>',
      });
      container.insertBefore(element, container.firstChild);
      return element.firstChild;
    },
    changeSpeed(player, increase) {
      const step = 0.25;
      const video = _.get('video', player);
      const speed = video.playbackRate;
      const newSpeed = increase ? speed + step : speed - step;
      if (newSpeed > 0) {
        const rates = player.getAvailablePlaybackRates();
        const index = rates.indexOf(newSpeed);
        if (index !== -1) {
          player.setPlaybackRate(newSpeed);
        } else {
          video.playbackRate = newSpeed;
        }
        video.playbackRate = newSpeed;
      }
      return video.playbackRate;
    },
    getVideoDuration(player) {
      return player.getDuration();
    },
    getCurrentTime(player) {
      return player.getCurrentTime();
    },
    isPaused(player) {
      // 1 = playing, 3 = buffering
      return ![1, 3].includes(player.getPlayerState());
    },
    playOrPause(player) {
      // 1 = playing, 3 = buffering
      if ([1, 3].includes(player.getPlayerState())) {
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

  function shouldStopAutoplay(event) {
    // TODO: dont stop if same playlist or same video (youtube mix link)
    return true;
  }

  function stopAutoplay(player) {
    const state = player.getPlayerState();
    LOGGER.log('player found; state =', state);
    // on first load sometimes it says it's paused, but it's not so do it again
    // 1 = playing, 2 = paused
    if ([1, 2].includes(state)) {
      if (stopNextAutoplay) {
        LOGGER.log('stopping player');
        stopNextAutoplay = false;
        player.pauseVideo();
      }
    } else {
      const onPlayerStateChange = (newState) => {
        LOGGER.log('state changed; state =', newState);
        if (newState === 1) {
          player.removeEventListener('onStateChange', onPlayerStateChange);
          if (stopNextAutoplay) {
            LOGGER.log('stopping player');
            stopNextAutoplay = false;
            player.pauseVideo();
          }
        }
      };
      player.addEventListener('onStateChange', onPlayerStateChange);
      document.addEventListener('click', () => {
        LOGGER.log('user clicked; removing state change listener');
        player.removeEventListener('onStateChange', onPlayerStateChange);
      });
    }
  }

  async function onNavigateFinish(page, event) {
    if (['watch', 'embed'].includes(page)) {
      stopNextAutoplay = shouldStopAutoplay(event);
      const player = await _.waitFor('.html5-video-player');
      stopAutoplay(player);
      if (videoScroller && videoScroller.player !== player) {
        videoScroller.destroy();
        videoScroller = null;
      }
      if (!videoScroller) {
        videoScroller = new VideoScroller(player, scrollerOptions);
      }
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
          span.__ext__pubtime {
            cursor: help;
          }
        `);

        if (window.location.pathname.startsWith('/embed/')) {
          onNavigateFinish('embed', null);
          return;
        }

        document.addEventListener('yt-navigate-finish', (event) => {
          onNavigateFinish(event?.detail?.response?.page, event);
        });
      },
    };
  }
})(this, this.unsafeWindow || window);
