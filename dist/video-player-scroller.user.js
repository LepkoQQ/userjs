// ==UserScript==
// @name        Video Player Scroller
// @namespace   http://poglej.ga/
// @version     4.2.7
// @run-at      document-start
// @include     *
// @require     https://raw.githubusercontent.com/LepkoQQ/userjs/fa89987daa39fba2e5d5cb6bb68bacf7827713e7/dist/utils/utils.js
// @require     https://raw.githubusercontent.com/LepkoQQ/userjs/fa89987daa39fba2e5d5cb6bb68bacf7827713e7/dist/utils/reacthook.js
// @require     https://raw.githubusercontent.com/LepkoQQ/userjs/fa89987daa39fba2e5d5cb6bb68bacf7827713e7/dist/video-player-scroller/_videoscroller.js
// @require     https://raw.githubusercontent.com/LepkoQQ/userjs/fa89987daa39fba2e5d5cb6bb68bacf7827713e7/dist/video-player-scroller/vimeo.js
// @require     https://raw.githubusercontent.com/LepkoQQ/userjs/fa89987daa39fba2e5d5cb6bb68bacf7827713e7/dist/video-player-scroller/twitch.js
// @require     https://raw.githubusercontent.com/LepkoQQ/userjs/fa89987daa39fba2e5d5cb6bb68bacf7827713e7/dist/video-player-scroller/youtube.js
// @require     https://raw.githubusercontent.com/LepkoQQ/userjs/fa89987daa39fba2e5d5cb6bb68bacf7827713e7/dist/video-player-scroller/dropbox.js
// @require     https://raw.githubusercontent.com/LepkoQQ/userjs/fa89987daa39fba2e5d5cb6bb68bacf7827713e7/dist/video-player-scroller/vidyard.js
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
