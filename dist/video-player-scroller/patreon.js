/* global _:false, VideoScroller:false */
(function patreon(context, window) {
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

  function widenPosts() {
    if (!document.body) {
      return;
    }

    let treeWalker;
    let currentNode;

    // page container
    treeWalker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_ELEMENT,
      (node) => {
        const cs = window.getComputedStyle(node);
        if (cs['max-width'] === '1152px' || cs['max-width'] === '984px') {
          return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_SKIP;
      },
      false
    );
    while ((currentNode = treeWalker.nextNode())) {
      currentNode.style['max-width'] = '90rem';
    }

    // main post column
    treeWalker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_ELEMENT,
      (node) => {
        const cs = window.getComputedStyle(node);
        if (cs['max-width'] === '66.6667%' && cs['flex-basis'] === '66.6667%') {
          return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_SKIP;
      },
      false
    );
    while ((currentNode = treeWalker.nextNode())) {
      currentNode.style['max-width'] = '100%';
      currentNode.style['flex-basis'] = '100%';
    }
  }

  if (context.vpsSite == null && window.location.host.match(/(?:\.|^)patreon\.com$/)) {
    context.vpsSite = {
      init(logger) {
        LOGGER = logger.push('patreon');
        scrollerOptions.logger = LOGGER;
        LOGGER.log('started', window.location);

        _.waitFor(() => _.get('[data-tag="post-card"] video')).then((video) => {
          videoFound(video);
        });
      },
    };

    widenPosts();
    document.addEventListener('readystatechange', () => {
      widenPosts();
    });
  }
})(this, this.unsafeWindow || window);
