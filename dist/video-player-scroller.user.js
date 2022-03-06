// ==UserScript==
// @name        Video Player Scroller
// @namespace   http://poglej.ga/
// @version     4.2.4
// @run-at      document-start
// @include     *
// @require     https://raw.githubusercontent.com/LepkoQQ/userjs/9760a01f6d496c276026ccb4462e6b82d2489d18/dist/utils/utils.js
// @require     https://raw.githubusercontent.com/LepkoQQ/userjs/9760a01f6d496c276026ccb4462e6b82d2489d18/dist/utils/reacthook.js
// @require     https://raw.githubusercontent.com/LepkoQQ/userjs/9760a01f6d496c276026ccb4462e6b82d2489d18/dist/video-player-scroller/_videoscroller.js
// @require     https://raw.githubusercontent.com/LepkoQQ/userjs/9760a01f6d496c276026ccb4462e6b82d2489d18/dist/video-player-scroller/vimeo.js
// @require     https://raw.githubusercontent.com/LepkoQQ/userjs/9760a01f6d496c276026ccb4462e6b82d2489d18/dist/video-player-scroller/twitch.js
// @require     https://raw.githubusercontent.com/LepkoQQ/userjs/9760a01f6d496c276026ccb4462e6b82d2489d18/dist/video-player-scroller/youtube.js
// @require     https://raw.githubusercontent.com/LepkoQQ/userjs/9760a01f6d496c276026ccb4462e6b82d2489d18/dist/video-player-scroller/dropbox.js
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
