/* global _:false, VideoScroller:false */
(function dropbox(context, window) {
  'use strict';

  let LOGGER;
  let videoScroller;

  const scrollerOptions = {
    color: '#ff424d',
    getFullscreenElement(player) {
      return player;
    },
    getBottomOffset(player) {
      return 70;
    },
    getLeftOffset(player) {
      return 16;
    },
  };

  function videoFound(video) {
    const parent = video.parentElement;
    if (videoScroller) {
      videoScroller.destroy();
      videoScroller = null;
    }
    if (!videoScroller) {
      videoScroller = new VideoScroller(parent, scrollerOptions);
    }
  }

  if (context.vpsSite == null && window.location.host.match(/(?:\.|^)patreon\.com$/)) {
    context.vpsSite = {
      init(logger) {
        LOGGER = logger.push('patreon');
        scrollerOptions.logger = LOGGER;
        LOGGER.log('started', window.location);

        _.waitFor(() => _.get('[data-tag="post-card"] video'))
          .then((video) => {
            videoFound(video);
          });
      },
    };
  }
}(this, this.unsafeWindow || window));
