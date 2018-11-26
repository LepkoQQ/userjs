/* global _:false, VideoScroller:false */
(function vimeo(context, window) {
  'use strict';

  let LOGGER;
  let videoScroller;

  const scrollerOptions = {
    color: '#00adef',
    // eslint-disable-next-line no-unused-vars
    getRightOffset(player) {
      return 10;
    },
    // eslint-disable-next-line no-unused-vars
    getBottomOffset(player) {
      return 64;
    },
    getSpeedContainerElement(player) {
      return _.get('.vp-sidedock', player);
    },
    addSpeedTextElement(container) {
      const box = _.create('.box');
      const element = box.appendChild(
        _.create('button.rounded-box', {
          textContent: '1x',
          style: 'color:#fff',
        })
      );
      container.appendChild(box);
      return element;
    },
  };

  function playerLoaded(player) {
    if (videoScroller) {
      videoScroller.destroy();
      videoScroller = null;
    }
    if (!videoScroller) {
      videoScroller = new VideoScroller(player, scrollerOptions);
    }
  }

  function onRouteChange() {
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
      playerLoaded(player);
    });
  }

  if (context.vpsSite == null && window.location.host.match(/(?:\.|^)vimeo\.com$/)) {
    context.vpsSite = {
      init(logger) {
        LOGGER = logger.push('vimeo');
        scrollerOptions.logger = LOGGER;
        LOGGER.log('started', window.location);

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
          onRouteChange();
        } else {
          const debouncedOnRouteChange = _.debounce(onRouteChange, 500);
          // eslint-disable-next-line no-underscore-dangle
          _.waitFor(() => window.___ClipStore).then((store) => {
            let clipID = 0;
            store.addChangeListener(() => {
              if (clipID !== store.state.clip.id) {
                clipID = store.state.clip.id;
                debouncedOnRouteChange();
              }
            });
          });
        }
      },
    };
  }
}(this, this.unsafeWindow || window));
