// ==UserScript==
// @name         Youtube Watched Improvements
// @description  Misc improvements to watched videos and subscription list
// @namespace    https://lepko.net/
// @version      0.0.3
// @author       You
// @run-at       document-start
// @match        https://www.youtube.com/*
// @require      https://raw.githubusercontent.com/LepkoQQ/userjs/5ad3aa6c7354a47b110a66a66e6b6a57ddc4af52/dist/utils/utils.js
// @require      https://raw.githubusercontent.com/LepkoQQ/userjs/5ad3aa6c7354a47b110a66a66e6b6a57ddc4af52/dist/youtube-watched/main.js
// @grant        unsafeWindow
// @grant        GM_addStyle
// ==/UserScript==

/* globals _:false, ytWatchedInit:false */
(function main(window) {
  'use strict';

  const LOGGER = _.logger('yt-watched');
  LOGGER.log('starting', window.location.href);
  ytWatchedInit(LOGGER);
})(this.unsafeWindow || window);
