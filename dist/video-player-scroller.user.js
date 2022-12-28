// ==UserScript==
// @name        Video Player Scroller
// @namespace   http://poglej.ga/
// @version     4.3.0
// @run-at      document-start
// @include     *
// @require     https://raw.githubusercontent.com/LepkoQQ/userjs/87fc4be817c9473d91904a0b028f3c887251225f/dist/utils/utils.js
// @require     https://raw.githubusercontent.com/LepkoQQ/userjs/87fc4be817c9473d91904a0b028f3c887251225f/dist/utils/reacthook.js
// @require     https://raw.githubusercontent.com/LepkoQQ/userjs/87fc4be817c9473d91904a0b028f3c887251225f/dist/video-player-scroller/_videoscroller.js
// @require     https://raw.githubusercontent.com/LepkoQQ/userjs/87fc4be817c9473d91904a0b028f3c887251225f/dist/video-player-scroller/vimeo.js
// @require     https://raw.githubusercontent.com/LepkoQQ/userjs/87fc4be817c9473d91904a0b028f3c887251225f/dist/video-player-scroller/twitch.js
// @require     https://raw.githubusercontent.com/LepkoQQ/userjs/87fc4be817c9473d91904a0b028f3c887251225f/dist/video-player-scroller/youtube.js
// @require     https://raw.githubusercontent.com/LepkoQQ/userjs/87fc4be817c9473d91904a0b028f3c887251225f/dist/video-player-scroller/dropbox.js
// @require     https://raw.githubusercontent.com/LepkoQQ/userjs/87fc4be817c9473d91904a0b028f3c887251225f/dist/video-player-scroller/vidyard.js
// @require     https://raw.githubusercontent.com/LepkoQQ/userjs/87fc4be817c9473d91904a0b028f3c887251225f/dist/video-player-scroller/patreon.js
// @grant       GM_xmlhttpRequest
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       unsafeWindow
// @nocompat    Chrome
// @connect     api.twitch.tv
// @connect     googleapis.com
// ==/UserScript==

if (this.vpsSite == null) {
  return;
}

/* globals _:false, vpsSite:false */
(function main(window) {
  'use strict';

  const LOGGER = _.logger('video player scroller');
  LOGGER.log('starting:', window.location.href);
  vpsSite.init(LOGGER);
})(this.unsafeWindow || window);
