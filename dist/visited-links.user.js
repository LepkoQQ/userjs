// ==UserScript==
// @name        Visited Links
// @namespace   http://poglej.ga/
// @version     1.0.0
// @run-at      document-start
// @match       *://*.youtube.com/*
// @require     https://raw.githubusercontent.com/LepkoQQ/userjs/dfd4d948858fcc0084c35ba03b5c8a6fa9072c10/dist/utils/utils.js
// @grant       GM_xmlhttpRequest
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       unsafeWindow
// @nocompat    Chrome
// @connect     memo.poglej.ga
// ==/UserScript==

/* globals _:false */
(function main(window) {
  'use strict';

  const LOGGER = _.logger('visited links');
  LOGGER.log('starting:', window.location.href);

  _.addCSS(`
    ytd-thumbnail-overlay-resume-playback-renderer {
      display: none;
    }
  `);

  const links = Array.from(
    _.all(
      'ytd-video-renderer #video-title, ytd-grid-video-renderer #video-title, ytd-compact-video-renderer #video-title, ytd-playlist-video-renderer #video-title'
    )
  ).map((title) => title.closest('a'));

  const keys = [];
  const fetchVisited = _.debounce(function() {
    console.log(keys.length);
    keys.length = 0;
  }, 1000);

  for (const link of links) {
    const url = new URL(link.href);
    if (
      url.hostname === 'www.youtube.com' &&
      url.pathname === '/watch' &&
      url.searchParams.has('v')
    ) {
      keys.push(url.searchParams.get('v'));
      url.searchParams.delete('t');
      link.href = url.toString();
      link.style.background = 'orange';
      fetchVisited();
    }
  }

  const observer = _.observeAddedElements(document, (element) => {
    if (
      element.matches(
        'ytd-video-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer, ytd-playlist-video-renderer'
      )
    ) {
      const link = _.get('#video-title', element).closest('a');
      const url = new URL(link.href);
      if (
        url.hostname === 'www.youtube.com' &&
        url.pathname === '/watch' &&
        url.searchParams.has('v')
      ) {
        keys.push(url.searchParams.get('v'));
        url.searchParams.delete('t');
        link.href = url.toString();
        link.style.background = 'orange';
        fetchVisited();
      }
    }
  });
})(this.unsafeWindow || window);

document.head.insertAdjacentHTML(
  'afterend',
  `
  <style>
    a#video-title,
    a span#video-title {
      background-color: blue !important;
    }
    a#video-title:visited,
    a:visited span#video-title {
      background-color: red !important;
    }
  </style>
`
);
