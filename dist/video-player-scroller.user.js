// ==UserScript==
// @name        Video Player Scroller
// @namespace   http://lepko.net/
// @version     3.1.10
// @run-at      document-start
// @match       *://*.youtube.com/*
// @match       *://youtube.googleapis.com/embed/*
// @match       *://*.vimeo.com/*
// @match       *://www.twitch.tv/*
// @match       *://clips.twitch.tv/*
// @match       *://player.twitch.tv/*
// @exclude     *.js
// @exclude     *.html
// @exclude     *.html?*
// @require     https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.19.2/moment.min.js
// @require     https://raw.githubusercontent.com/LepkoQQ/userjs/4b7a890aceca20f409598999ee88501c6a7a611a/dist/utils/utils.js
// @require     https://raw.githubusercontent.com/LepkoQQ/userjs/4b7a890aceca20f409598999ee88501c6a7a611a/dist/utils/volumescroller.js
// @grant       GM_xmlhttpRequest
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       unsafeWindow
// @nocompat    Chrome
// @connect     api.twitch.tv
// @connect     googleapis.com
// ==/UserScript==

/* global _:false, moment:false */
(function main(window) {
  'use strict';

  let LOGGER = _.logger('video player scroller');
  LOGGER.log('starting...');

  const sites = {
    youtube: {
      addRouteChangeListeners() {
        LOGGER.log('adding route change listeners');

        _.addCSS(`
          .ext_progress_bar {
            opacity: 0;
          }
          .ytp-autohide .ext_progress_bar {
            opacity: 1;
          }
          span.ext_pubtime {
            cursor: help;
          }
          span.ext_pubtime:before {
            content: '•';
            margin: 0 5px;
          }
        `);

        document.addEventListener('spfpartprocess', event => this.onSpfPartProcess(event));
        document.addEventListener('spfprocess', () => this.onSpfProcess());
        document.addEventListener('spfdone', () => this.onSpfDone());

        this.addHeaderLinks();

        this.onSpfDone();
      },
      addHeaderLinks() {
        if (!window.location.pathname.startsWith('/embed/')) {
          const button = _.get('#upload-btn');
          if (button && button.parentNode) {
            const myVideos = _.create('a', {
              href: '/my_videos',
              className: 'yt-uix-button yt-uix-button-default yt-uix-button-size-default',
              style: 'margin-right: 5px;',
              innerHTML: '<span class="yt-uix-button-content">My Videos</span>',
            });
            const myChannel = _.create('a', {
              href: '/user',
              className: 'yt-uix-button yt-uix-button-default yt-uix-button-size-default',
              style: 'margin-right: 5px;',
              innerHTML: '<span class="yt-uix-button-content">My Channel</span>',
            });
            button.parentNode.insertBefore(myVideos, button);
            button.parentNode.insertBefore(myChannel, button);
          }
        }
      },
      onSpfDone() {
        this.addChannelLinks();
        this.addPublishListeners('.yt-lockup-video', '.yt-lockup-meta-info');
        this.addPublishListeners('.pl-video', '.pl-video-owner');

        if (!window.location.pathname.startsWith('/feed/')) {
          _.waitFor(() => {
            let selector = '.html5-video-player';
            if (window.location.pathname === '/watch') {
              selector += '#movie_player';
            } else {
              const match = window.location.pathname.match(/^\/(channel|user)\/[\w]*\/?(\w*)$/);
              if (match && match.length === 3 && (match[2] === 'featured' || match[2] === '')) {
                selector += '#c4-player';
              }
            }
            const player = _.get(selector);
            return player;
          }).then((player) => {
            this.playerLoaded(player);
          });
        }
      },
      onPubTimeClick(event) {
        event.stopPropagation();
        let videoID;
        let parent = event.currentTarget;
        while (parent && parent !== document.body && parent !== document.documentElement) {
          if (parent.dataset && (parent.dataset.contextItemId || parent.dataset.videoId)) {
            videoID = parent.dataset.contextItemId || parent.dataset.videoId;
            break;
          }
          parent = parent.parentElement;
        }
        if (videoID) {
          const API_KEY = 'AIzaSyBwHoTOKR5AkZ26jb_ddW309O4U8hFhPeo';
          const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoID}&key=${API_KEY}`;
          _.ajax(url, { logger: LOGGER }).send()
            .then((response) => {
              const jsonR = JSON.parse(response);
              const m = moment(jsonR.items[0].snippet.publishedAt);
              event.target.textContent = m.format('dddd, MMMM D, YYYY @ HH:mm');
            })
            .catch((error) => {
              LOGGER.warn('Publish Date Failed', error);
              event.target.textContent = ':(';
            });
        }
      },
      addPublishListeners(selector, infoSelector) {
        _.all(selector).forEach((element) => {
          const info = _.get(infoSelector, element);
          if (info) {
            const pubTime = _.get('.ext_pubtime', info);
            if (!pubTime) {
              const onClick = (event) => {
                this.onPubTimeClick(event);
                event.currentTarget.removeEventListener('click', onClick, true);
                event.currentTarget.style.cursor = 'inherit';
              };
              info.appendChild(_.create('span', {
                className: 'ext_pubtime',
                textContent: '⏱',
              })).addEventListener('click', onClick, true);
            }
          }
        });
      },
      addChannelLinks() {
        if (location.pathname === '/watch') {
          const header = _.get('#watch-header');
          if (header) {
            const info = _.get('.yt-user-info', header);
            if (info) {
              let url;
              Array.from(_.all('a', header)).some((element) => {
                const href = element.getAttribute('href');
                if (href.startsWith('/user/')) {
                  url = href;
                  return true;
                }
                if (href.startsWith('/channel/')) {
                  url = href;
                }
                return false;
              });
              if (url) {
                url = `${url.split('?')[0]}/videos`;
                info.appendChild(_.create('a', {
                  href: url,
                  style: 'margin-left: 10px',
                  textContent: 'Channel Videos',
                }));
              }
            }
          }
        }
      },
      scrollerOptions: {
        logger: LOGGER,
        color: '#f12b24',
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
          const newSpeed = increase ? (speed + step) : (speed - step);
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
        seekVideo(player, event) { // eslint-disable-line no-unused-vars
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
      },
      playerLoaded(player) {
        this.stopAutoplay(player);
        this.forceWideMode();

        if (this.videoScroller && this.videoScroller.player !== player) {
          this.videoScroller.destroy();
          this.videoScroller = null;
        }
        if (!this.videoScroller) {
          this.videoScroller = new VideoScroller(player, this.scrollerOptions);
        }
      },
      forceWideMode() {
        const page = _.get('#page');
        if (page && page.classList.contains('watch')) {
          if (!page.classList.contains('watch-stage-mode') && !page.classList.contains('watch-wide')) {
            document.cookie = 'wide=1; domain=.youtube.com; path=/;';
            page.classList.add('watch-stage-mode', 'watch-wide');
          }
        }
      },
      stopNextAutoplay: true,
      stopAutoplay(player) {
        const TIMESTAMP_REGEX = /[?#&](?:star)?t(?:ime(?:_continue)?)?=/i;
        const hasTimeStamp = window.location.href.match(TIMESTAMP_REGEX);
        const isGoogleApiEmbed = window.location.hostname === 'youtube.googleapis.com';
        const state = player.getPlayerState();
        LOGGER.log('player found; state =', state);
        if (state === 1) {
          if (this.stopNextAutoplay) {
            LOGGER.log('stopping player');
            this.stopNextAutoplay = false;
            if (hasTimeStamp || isGoogleApiEmbed) {
              player.pauseVideo();
            } else {
              player.stopVideo();
            }
          }
        } else if (state === 3) {
          const onPlayerStateChange = (newState) => {
            LOGGER.log('state changed; state =', newState);
            if (newState === 1) {
              player.removeEventListener('onStateChange', onPlayerStateChange);
              if (this.stopNextAutoplay) {
                LOGGER.log('stopping player');
                this.stopNextAutoplay = false;
                if (hasTimeStamp || isGoogleApiEmbed) {
                  player.pauseVideo();
                } else {
                  player.stopVideo();
                }
              }
            }
          };
          player.addEventListener('onStateChange', onPlayerStateChange);
        }
      },
      onSpfProcess() {
        this.stopNextAutoplay = true;
      },
      onSpfPartProcess(event) {
        const cfg = _.getKey(event, ['detail', 'part', 'data', 'swfcfg']);
        if (cfg) {
          this.stopNextAutoplay = !this.shouldStopAutoplay(cfg);
        }
      },
      shouldStopAutoplay(cfg) {
        const referrer = _.getKey(cfg, ['args', 'referrer']);
        if (referrer) {
          if (cfg.args.list) {
            return referrer.includes(cfg.args.list);
          }
          if (cfg.args.video_id) {
            return referrer.includes(cfg.args.video_id);
          }
        }
        return false;
      },
    },
    vimeo: {
      addRouteChangeListeners() {
        LOGGER.log('adding route change listeners');

        _.addCSS(`
          .ext_progress_bar {
            opacity: 0;
          }
          [tabindex="0"] > .ext_progress_bar {
            opacity: 1;
          }
        `);

        if (window.location.hostname === 'player.vimeo.com') {
          LOGGER.log('embed');
          this.onRouteChange();
        } else {
          const debouncedOnRouteChange = _.debounce(this.onRouteChange, 500).bind(this);
          _.waitFor(() => window.___ClipStore) // eslint-disable-line no-underscore-dangle
            .then((store) => {
              let clipID = 0;
              store.addChangeListener(function onChange() {
                if (clipID !== this.state.clip.id) {
                  clipID = this.state.clip.id;
                  debouncedOnRouteChange();
                }
              });
            });
        }
      },
      onRouteChange() {
        LOGGER.log('route changed');

        _.waitFor(() => {
          const player = _.get('.player');
          if (player) {
            if (player.dataset.player === 'true') {
              return player;
            }
            if (_.get('.password.form', player)) {
              return _.waitFor(() => {
                if (_.get('video', player)) {
                  return player;
                }
                return false;
              }, -1);
            }
            if (_.get('video', player)) {
              return player;
            }
          }
          return false;
        }).then((player) => {
          this.playerLoaded(player);
        });
      },
      playerLoaded(player) {
        if (this.videoScroller) {
          this.videoScroller.destroy();
          this.videoScroller = null;
        }
        if (!this.videoScroller) {
          this.videoScroller = new VideoScroller(player, this.scrollerOptions);
        }
      },
      scrollerOptions: {
        logger: LOGGER,
        color: '#00adef',
        getRightOffset(player) { // eslint-disable-line no-unused-vars
          return 10;
        },
        getBottomOffset(player) { // eslint-disable-line no-unused-vars
          return 64;
        },
        getSpeedContainerElement(player) {
          return _.get('.sidedock', player);
        },
        addSpeedTextElement(container) {
          const box = _.create('.box');
          const element = box.appendChild(_.create('button.rounded-box', {
            textContent: '1x',
            style: 'color:#fff',
          }));
          container.appendChild(box);
          return element;
        },
      },
    },
  };

  const site = Object.entries(sites).find(([key]) => window.location.hostname.includes(key));
  if (site) {
    LOGGER = LOGGER.push(site[0]);

    document.addEventListener('DOMContentLoaded', () => {
      LOGGER.log('ready', window.location.href);
      site[1].addRouteChangeListeners();
    });
  }
}(this.unsafeWindow || window));
