/* global _:false, VideoScroller:false, ReactHook:false */
(function twitch(context, window) {
  'use strict';

  let LOGGER;

  function createScrollerOptions(playerApi, playerEvents) {
    return {
      logger: LOGGER,
      color: 'rgb(169, 112, 255)',
      // eslint-disable-next-line no-unused-vars
      getRightOffset(player) {
        return 20;
      },
      // eslint-disable-next-line no-unused-vars
      getBottomOffset(player) {
        return 90;
      },
      // eslint-disable-next-line no-unused-vars
      getVolume(player) {
        return playerApi.isMuted() ? 0 : playerApi.getVolume() * 100;
      },
      changeVolume(player, increase) {
        const step = 0.05;
        const volume = playerApi.isMuted() ? 0 : playerApi.getVolume();
        const newVolume = Math.max(Math.min(increase ? volume + step : volume - step, 1), 0);
        if (newVolume > 0) {
          playerApi.setMuted(false);
        }
        playerApi.setVolume(newVolume);
        return newVolume * 100;
      },
      getSpeedContainerElement(player) {
        return _.get('.video-ref .player-controls__right-control-group', player);
      },
      addSpeedTextElement(container) {
        const div = _.create('div');
        const element = _.create('span.__ext__speed_element_pill', {
          textContent: '1x',
        });
        div.appendChild(element);
        container.insertBefore(div, container.firstElementChild);
        return element;
      },
      getPlaybackRate() {
        if (playerApi) {
          return playerApi.getPlaybackRate();
        }
        return 1;
      },
      changeSpeed(player, increase) {
        if (playerApi) {
          const step = 0.25;
          const speed = playerApi.getPlaybackRate();
          const newSpeed = increase ? speed + step : speed - step;
          if (newSpeed > 0) {
            playerApi.setPlaybackRate(newSpeed);
            return newSpeed;
          }
          return speed;
        }
        return 1;
      },
      getProgressContainerElement(player) {
        return _.get('.video-player__overlay', player);
      },
      getVideoDuration() {
        if (playerApi) {
          return playerApi.getDuration();
        }
        return 0;
      },
      getCurrentTime() {
        if (playerApi) {
          return playerApi.getPosition();
        }
        return 0;
      },
      getCurrentBuffer() {
        if (playerApi) {
          const buffered = playerApi.getBuffered();
          if (buffered.end) {
            return buffered.end;
          }
        }
        return 0;
      },
      isPaused() {
        if (playerApi) {
          return playerApi.isPaused();
        }
        return true;
      },
      playOrPause() {
        if (playerApi) {
          if (playerApi.isPaused()) {
            playerApi.play();
          } else {
            playerApi.pause();
          }
          return true;
        }
        return false;
      },
      seekVideo(player, event) {
        const step = VideoScroller.getStepSizeFromKeyEvent(event);
        if (playerApi && step !== 0) {
          const playerTime = playerApi.getPosition();
          if (playerTime) {
            playerApi.seekTo(playerTime + step);
            return true;
          }
        }
        return false;
      },
      addTimeUpdateEventListener(player, func) {
        if (playerEvents) {
          playerEvents.addEventListener('PlayerTimeUpdate', func);
        }
      },
      removeTimeUpdateEventListener(player, func) {
        if (playerEvents) {
          playerEvents.removeEventListener('PlayerTimeUpdate', func);
        }
      },
    };
  }

  async function twitchHook() {
    const hook = await ReactHook.create('#root');
    LOGGER.log('created react hook', hook);

    // hook
    //   .findComponent(
    //     'videoInfoBar',
    //     (c) => c.props && c.props.video && Object.keys(c.props).length === 1
    //   )
    //   .then((wrappedComponent) => {
    //     LOGGER.log('found component', wrappedComponent.name, wrappedComponent);

    //     wrappedComponent.wrap({
    //       componentDidUpdate() {
    //         // add video publish datetime on vods
    //         if (this.props.video && this.props.video.publishedAt) {
    //           const elem = hook.getDOMElement(this);
    //           const titleElem = _.get(
    //             '.tw-card .tw-card-body p[data-test-selector="date-views"]',
    //             elem
    //           );
    //           if (titleElem) {
    //             const addedElem = _.getOrCreate('span.__ext__vod_date', titleElem);
    //             const time = Date.parse(this.props.video.publishedAt);
    //             addedElem.textContent = _.formatDateTime(time);
    //           }
    //         }
    //       },
    //     });
    //   });

    hook
      .findComponent(
        'highwind-player',
        (c) => c.setPlayerActive && c.props && c.props.playerEvents && c.props.mediaPlayerInstance
      )
      .then((wrappedComponent) => {
        LOGGER.log('found component', wrappedComponent.name, wrappedComponent);

        const scrollers = new WeakMap();
        const observers = new WeakMap();
        wrappedComponent.wrap({
          maybeAttachDomEventListeners() {
            if (this.props.containerRef && this.props.mediaPlayerInstance && !scrollers.has(this)) {
              const vs = new VideoScroller(
                this.props.containerRef,
                createScrollerOptions(this.props.mediaPlayerInstance, this.props.playerEvents)
              );
              scrollers.set(this, vs);
              // prevent auto playing next video
              const x = '.autoplay-vod__content-container button';
              const x2 = '.other-vods__container button';

              // prevent autoplay when video not the main thing (background of banner, or vod autoplay on video list pages)
              const y = '.channel-root__player .home';

              if (document.querySelector(y)) {
                this.props.mediaPlayerInstance.pause();
              }

              observers.set(
                this,
                _.observeAddedElements(document, (element) => {
                  if (element.matches(x) || element.matches(x2)) {
                    element.click();
                  } else {
                    const elem = element.querySelector(x) || element.querySelector(x2);
                    if (elem) {
                      elem.click();
                    }
                  }

                  if (document.querySelector(y)) {
                    if(!this.props.mediaPlayerInstance.isPaused()) {
                      this.props.mediaPlayerInstance.pause();
                    }
                  }
                })
              );
            }
          },
          componentWillUnmount() {
            if (scrollers.has(this)) {
              scrollers.get(this).destroy();
              scrollers.delete(this);
            }
            if (observers.has(this)) {
              observers.get(this).disconnect();
              scrollers.delete(this);
            }
          },
        });

        // eslint-disable-next-line no-underscore-dangle
        wrappedComponent._instances.forEach((instance) => {
          instance.forceUpdate();
        });
      });

    hook
      .findComponent('videoPreviewCard', (c) => c.generateSearchString)
      .then((wrappedComponent) => {
        LOGGER.log('found component', wrappedComponent.name, wrappedComponent);

        // Fix 100% watched vods not being marked as watched
        // eslint-disable-next-line no-underscore-dangle
        const proto = wrappedComponent._component.prototype;
        const origRender = proto.render;
        proto.render = function fixedWatchPercentageRender() {
          if (this.props.video && this.props.video.self && this.props.video.self.viewingHistory) {
            if (this.props.video.self.viewingHistory.position === 0) {
              // this.props.video.self.viewingHistory.position = this.props.video.lengthSeconds;
              this.props.video = {
                ...this.props.video,
                self: {
                  ...this.props.video.self,
                  viewingHistory: {
                    ...this.props.video.self.viewingHistory,
                    position: this.props.video.lengthSeconds,
                  }
                },
              };
            }
          }
          return origRender.call(this);
        };

        // eslint-disable-next-line no-underscore-dangle
        wrappedComponent._instances.forEach((instance) => {
          instance.forceUpdate();
        });
      });
  }

  if (context.vpsSite == null && window.location.host.match(/\.twitch\.tv$/)) {
    context.vpsSite = {
      init(logger) {
        LOGGER = logger.push('twitch');
        LOGGER.log('started');

        _.addCSS(`
          .__ext__speed_element_pill {
            color: #000;
            background-color: hsl(264deg 100% 80% / 75%);
            display: inline-block;
            position: relative;
            line-height: 1;
            text-align: center;
            white-space: nowrap;
            bottom: 0.15em;
            border-radius: 1000px;
            padding: 0.3rem 0.8em;
            font-size: 75%;
            text-transform: uppercase !important;
            font-weight: 600 !important;
            margin-right: 0.5em;
          }
          .ext_progress_bar {
            opacity: 0;
            background-color: hsla(0,0%,100%,.35);
          }
          .ext_progress_bar .ext_progress_bar_fill_buffer {
            background-color: rgba(255, 255, 255, 0.85);
          }
          .video-player__inactive .ext_progress_bar {
            opacity: 1;
          }
          body .tw-media-card-image__cover .tw-progress-bar {
            height: 4rem;
          }
        `);

        twitchHook();
      },
    };
  }
})(this, this.unsafeWindow || window);
