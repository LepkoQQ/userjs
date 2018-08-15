/* global _:false, VideoScroller:false, ReactHook:false */
(function twitch(context, window) {
  'use strict';

  let LOGGER;

  function createScrollerOptions(playerApi) {
    return {
      logger: LOGGER,
      color: '#a991d4',
      // eslint-disable-next-line no-unused-vars
      getRightOffset(player) {
        return 10;
      },
      // eslint-disable-next-line no-unused-vars
      getBottomOffset(player) {
        return 88;
      },
      getSpeedContainerElement(player) {
        return _.get('.player-buttons-right', player);
      },
      addSpeedTextElement(container) {
        const element = _.create('button.player-button', {
          style: 'text-align:center;padding-top:5px',
          textContent: '1x',
        });
        container.insertBefore(element, container.firstElementChild);
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
        return _.get('#default-player .player-root', player);
      },
      getVideoDuration() {
        if (playerApi) {
          return playerApi.getDuration();
        }
        return 0;
      },
      getCurrentTime() {
        if (playerApi) {
          return playerApi.getCurrentTime();
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
          const playerTime = playerApi.getCurrentTime();
          if (playerTime) {
            playerApi.setCurrentTime(playerTime + step);
            return true;
          }
        }
        return false;
      },
      addTimeUpdateEventListener(player, func) {
        if (playerApi) {
          playerApi.addEventListener('timeupdate', func);
        }
      },
      removeTimeUpdateEventListener(player, func) {
        if (playerApi) {
          playerApi.removeEventListener('timeupdate', func);
        }
      },
    };
  }

  function ajax(url) {
    return _.ajax(url, {
      attrs: {
        headers: {
          'Client-ID': 'a936j1ucnma1ucntkp2qf8vepul2tnn',
        },
      },
      logger: LOGGER,
    });
  }

  function formatUptime(seconds) {
    const min = Math.floor(Math.floor(seconds / 60) % 60);
    const hrs = Math.floor(Math.floor(seconds / 60) / 60);
    const hoursString = hrs < 1 ? '' : `${hrs} hour${hrs < 2 ? '' : 's'} `;
    const minutesString = `${min} minutes`;
    return `Uptime: ${hoursString}${minutesString}`;
  }

  async function twitchHook() {
    const hook = await ReactHook.create('#root');
    LOGGER.log('created react hook', hook);

    hook
      .findComponent(
        'videoInfoBar',
        c => c.props && c.props.video && Object.keys(c.props).length === 1,
      )
      .then((wrappedComponent) => {
        LOGGER.log('found component', wrappedComponent.name, wrappedComponent);

        wrappedComponent.wrap({
          componentDidUpdate() {
            // add video publish datetime on vods
            if (this.props.video && this.props.video.publishedAt) {
              const elem = hook.getDOMElement(this);
              const titleElem = _.get(
                '.tw-card .tw-card-body p[data-test-selector="date-views"]',
                elem,
              );
              if (titleElem) {
                const addedElem = _.getOrCreate('span.__ext__vod_date', titleElem);
                const time = Date.parse(this.props.video.publishedAt);
                addedElem.textContent = _.formatDateTime(time);
              }
            }
          },
        });
      });

    hook
      .findComponent(
        'channel-info-bar',
        c => c.renderChannelMetadata && c.renderChannelViewersCount,
      )
      .then((wrappedComponent) => {
        LOGGER.log('found component', wrappedComponent.name, wrappedComponent);

        const uptimes = new WeakMap();
        wrappedComponent.wrap({
          componentDidUpdate() {
            // add uptime under live stream
            if (this.props.channelLogin && !this.props.hosting) {
              const elem = hook.getDOMElement(this);
              const actionContainer = _.get('.side-nav-channel-info__info-wrapper', elem);
              if (actionContainer) {
                const addedElem = _.getOrCreate(
                  'span.__ext__uptime.tw-align-center.tw-block.tw-mg-1',
                  actionContainer,
                );
                if (uptimes.has(this) && uptimes.get(this).startedAt) {
                  const uptime = (Date.now() - uptimes.get(this).startedAt) / 1000;
                  addedElem.textContent = formatUptime(uptime);
                } else if (!uptimes.has(this) || !uptimes.get(this).loading) {
                  uptimes.set(this, { loading: true });
                  ajax(`https://api.twitch.tv/helix/streams?user_login=${this.props.channelLogin}`)
                    .send()
                    .then((response) => {
                      if (uptimes.has(this)) {
                        uptimes.set(this, { loading: false });
                        const jsonR = JSON.parse(response);
                        if (jsonR.data && jsonR.data.length) {
                          const startedAt = Date.parse(jsonR.data[0].started_at);
                          uptimes.set(this, { startedAt });
                          const uptime = (Date.now() - startedAt) / 1000;
                          addedElem.textContent = formatUptime(uptime);
                        }
                      }
                    });
                }
              }
            }
          },
          componentWillUnmount() {
            uptimes.delete(this);
          },
        });
      });

    hook.findComponent('player', c => c.onPlayerReady && c.onPlayerPlay).then((wrappedComponent) => {
      LOGGER.log('found component', wrappedComponent.name, wrappedComponent);

      const scrollers = new WeakMap();
      const observers = new WeakMap();
      wrappedComponent.wrap({
        componentDidUpdate() {
          if (this.playerRef && this.player && !scrollers.has(this)) {
            const vs = new VideoScroller(this.playerRef, createScrollerOptions(this.player));
            scrollers.set(this, vs);
            // prevent auto playing next video
            observers.set(
              this,
              _.observeAddedElements(document, (element) => {
                if (element.matches('.pl-rec__cancel')) {
                  element.click();
                } else {
                  const elem = element.querySelector('.pl-rec__cancel');
                  if (elem) {
                    elem.click();
                  }
                }
              }),
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
      .findComponent('videoPreviewCard', c => c.getVideoPreviousWatchPercentage)
      .then((wrappedComponent) => {
        LOGGER.log('found component', wrappedComponent.name, wrappedComponent);

        // Fix 100% watched vods not being marked as watched
        // eslint-disable-next-line no-underscore-dangle
        const proto = wrappedComponent._component.prototype;
        const origWatchPercentage = proto.getVideoPreviousWatchPercentage;
        proto.getVideoPreviousWatchPercentage = function fixedWatchPercentage() {
          if (this.props.video && this.props.video.self && this.props.video.self.viewingHistory) {
            if (this.props.video.self.viewingHistory.position === 0) {
              return 100;
            }
          }
          return origWatchPercentage.call(this);
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
          .ext_progress_bar {
            opacity: 0;
          }
          .hover-display.pl-hover-transition-out + .ext_progress_bar {
            opacity: 1;
          }
          body .pl-stats-list {
            top: 0;
            left: 0;
            padding: 0;
            line-height: 11px;
            width: 175px;
          }
          body .pl-stats-list .pl-stat {
            padding: 0;
            font-size: 10px;
          }
          body .pl-stats-list .pl-stat div {
            padding-left: 0;
          }
          body .preview-card-overlay .tw-progress-bar--sm {
            height: 4rem;
          }
          .__ext__vod_date {
            font-size: 1.2rem;
          }
          .__ext__vod_date::before {
            content: '·';
            margin: 0 5px;
          }
        `);

        twitchHook();
      },
    };
  }
}(this, this.unsafeWindow || window));
