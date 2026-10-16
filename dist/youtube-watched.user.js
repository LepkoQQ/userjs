// ==UserScript==
// @name         Youtube Watched Improvements
// @description  Misc improvements to watched videos and subscription list
// @namespace    https://lepko.net/
// @version      0.1.2
// @author       You
// @run-at       document-start
// @match        https://www.youtube.com/*
// @require      https://raw.githubusercontent.com/LepkoQQ/userjs/aedca9ecbf145bacb40e58a54e4170fb0075399f/dist/utils/utils.js
// @require      https://raw.githubusercontent.com/LepkoQQ/userjs/aedca9ecbf145bacb40e58a54e4170fb0075399f/dist/youtube-watched/main.js
// @grant        unsafeWindow
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

/* globals _:false, ytWatchedInit:false */
(function main(window) {
  'use strict';

  const LOGGER = _.logger('yt-watched');
  LOGGER.log('starting', window.location.href);
  ytWatchedInit(LOGGER);
})(this.unsafeWindow || window);
