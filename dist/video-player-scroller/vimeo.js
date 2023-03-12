/* global _:false, VideoScroller:false */
(function vimeo(context, window) {
  'use strict';

  let LOGGER;
  let videoScroller;

  const scrollerOptions = {
    color: '#00adef',
    getFullscreenElement(player) {
      if (window === window.top) {
        return player;
      }
      return null;
    },
    getBottomOffset() {
      return 64;
    },
    getLeftOffset() {
      return 10;
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
          });
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

  if (context.vpsSite == null && window.location.host.match(/(?:\.|^)vimeo\.com$/) && !window.location.pathname.endsWith('proxy.html')) {
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

          _.waitFor('#__next').then(async () => {
            LOGGER.log('nextjs wait');
            await _.waitFor(3000);
            LOGGER.log('nextjs');
            onRouteChange();
          });
        }
      },
    };
  }
})(this, this.unsafeWindow || window);
