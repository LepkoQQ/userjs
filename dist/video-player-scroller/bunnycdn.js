/* global _:false, VideoScroller:false */
(function bunnycdn(context, window) {
  'use strict';

  let LOGGER;
  let videoScroller;

  const scrollerOptions = {
    color: '#ff7755',
    getBottomOffset() {
      return 80;
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

  if (context.vpsSite == null && ['video.bunnycdn.com', 'iframe.mediadelivery.net'].includes(window.location.host)) {
    context.vpsSite = {
      init(logger) {
        LOGGER = logger.push('bunnycdn');
        scrollerOptions.logger = LOGGER;
        LOGGER.log('started', window.location);

        if (window.location.pathname.startsWith('/play/')) {
          _.addCSS(`
            #body #video-wrapper .container {
              position: fixed;
              inset: 0;
              margin: 0;
              padding-top: 0;
            }
          `);
        }

        if (window.location.pathname.startsWith('/embed/')) {
          _.addCSS(`
            #body #video-container {
              background: #000;
            }
          `);

          _.waitFor(() => _.get('.plyr video')).then((player) => {
            playerLoaded(player.parentElement.parentElement);
          });
        }
      },
    };
  }
})(this, this.unsafeWindow || window);
