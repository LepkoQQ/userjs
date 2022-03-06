/* global _:false, VideoScroller:false */
(function dropbox(context, window) {
  'use strict';

  let LOGGER;
  let videoScroller;

  const scrollerOptions = {
    color: '#1261fe',
    // eslint-disable-next-line no-unused-vars
    getRightOffset(player) {
      return 10;
    },
    // eslint-disable-next-line no-unused-vars
    getBottomOffset(player) {
      return 10;
    },
    getSpeedContainerElement(player) {
      return null;
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

  if (context.vpsSite == null && window.location.host.match(/(?:\.|^)dropbox\.com$/) && window.location.host !== 'consent.dropbox.com') {
    context.vpsSite = {
      init(logger) {
        LOGGER = logger.push('dropbox');
        scrollerOptions.logger = LOGGER;
        LOGGER.log('started', window.location);

        _.waitFor(() => _.get('.video-js'))
          .then((player) => {
            playerLoaded(player);
          });
      },
    };
  }
}(this, this.unsafeWindow || window));
