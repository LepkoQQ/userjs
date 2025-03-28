// ==UserScript==
// @name        Video Player Scroller
// @description Add more controls to video players
// @namespace   http://poglej.ga/
// @version     4.6.9
// @run-at      document-idle
// @match       *://*/*
// @require     https://raw.githubusercontent.com/LepkoQQ/userjs/4b1c89f5d60207e72dbe463f77001211d51a694e/dist/utils/utils.js
// @require     https://raw.githubusercontent.com/LepkoQQ/userjs/4b1c89f5d60207e72dbe463f77001211d51a694e/dist/utils/reacthook.js
// @require     https://raw.githubusercontent.com/LepkoQQ/userjs/4b1c89f5d60207e72dbe463f77001211d51a694e/dist/video-player-scroller/_videoscroller.js
// @require     https://raw.githubusercontent.com/LepkoQQ/userjs/4b1c89f5d60207e72dbe463f77001211d51a694e/dist/video-player-scroller/bunnycdn.js
// @require     https://raw.githubusercontent.com/LepkoQQ/userjs/4b1c89f5d60207e72dbe463f77001211d51a694e/dist/video-player-scroller/dropbox.js
// @require     https://raw.githubusercontent.com/LepkoQQ/userjs/4b1c89f5d60207e72dbe463f77001211d51a694e/dist/video-player-scroller/patreon.js
// @require     https://raw.githubusercontent.com/LepkoQQ/userjs/4b1c89f5d60207e72dbe463f77001211d51a694e/dist/video-player-scroller/twitch.js
// @require     https://raw.githubusercontent.com/LepkoQQ/userjs/4b1c89f5d60207e72dbe463f77001211d51a694e/dist/video-player-scroller/vidyard.js
// @require     https://raw.githubusercontent.com/LepkoQQ/userjs/4b1c89f5d60207e72dbe463f77001211d51a694e/dist/video-player-scroller/vimeo.js
// @require     https://raw.githubusercontent.com/LepkoQQ/userjs/4b1c89f5d60207e72dbe463f77001211d51a694e/dist/video-player-scroller/youtube.js
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
