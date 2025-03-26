/* global _:false, VideoScroller:false */
(function dropbox(context, window) {
  'use strict';

  let LOGGER;
  let videoScroller;

  const scrollerOptions = {
    color: '#1261fe',
    getBottomOffset() {
      return 55;
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

  if (context.vpsSite == null && window.location.host.match(/(?:\.|^)vidyard\.com$/)) {
    context.vpsSite = {
      init(logger) {
        LOGGER = logger.push('vidyard');
        scrollerOptions.logger = LOGGER;
        LOGGER.log('started', window.location);

        if (window.location.host === 'share.vidyard.com') {
          _.addCSS(`
            #main-content > header {
              display: none;
            }
            #main-content #sharing-stage {
              margin: 0;
              padding: 0;
            }
            #main-content #sharing-stage #stage {
              width: 100% !important;
              max-width: 100% !important;
            }
            #stage .vidyard-player-container,
            #stage [class^="vidyard-inner-container"] {
              max-width: initial !important;
              max-height: initial !important;
            }
            #stage .vidyard-player-container > [class^="vidyard-div"] {
              padding-bottom: 0 !important;
              height: calc(100vh - 99px) !important;
            }
          `);
        }

        if (window.location.host === 'play.vidyard.com') {
          _.addCSS(`
            .ext_playback_rate_text {
              color: #fff;
            }
          `);

          _.waitFor(() => _.get('video[data-testid="hls-video"]')).then((player) => {
            playerLoaded(player.parentElement);
          });
        }
      },
    };
  }
})(this, this.unsafeWindow || window);
