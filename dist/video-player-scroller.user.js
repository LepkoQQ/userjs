// ==UserScript==
// @name        Video Player Scroller
// @namespace   http://poglej.ga/
// @version     4.1.10
// @run-at      document-start
// @include     *
// @require     https://raw.githubusercontent.com/LepkoQQ/userjs/81b374956ea451f4687d41244b1d14a6d54ccfaf/dist/utils/utils.js
// @require     https://raw.githubusercontent.com/LepkoQQ/userjs/81b374956ea451f4687d41244b1d14a6d54ccfaf/dist/utils/reacthook.js
// @require     https://raw.githubusercontent.com/LepkoQQ/userjs/81b374956ea451f4687d41244b1d14a6d54ccfaf/dist/video-player-scroller/_videoscroller.js
// @require     https://raw.githubusercontent.com/LepkoQQ/userjs/81b374956ea451f4687d41244b1d14a6d54ccfaf/dist/video-player-scroller/vimeo.js
// @require     https://raw.githubusercontent.com/LepkoQQ/userjs/81b374956ea451f4687d41244b1d14a6d54ccfaf/dist/video-player-scroller/twitch.js
// @require     https://raw.githubusercontent.com/LepkoQQ/userjs/81b374956ea451f4687d41244b1d14a6d54ccfaf/dist/video-player-scroller/youtube.js
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
