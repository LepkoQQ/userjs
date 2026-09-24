// ==UserScript==
// @name         Youtube Watched Improvements
// @description  Misc improvements to watched videos and subscription list
// @namespace    https://lepko.net/
// @version      0.1.1
// @author       You
// @run-at       document-start
// @match        https://www.youtube.com/*
// @require      https://raw.githubusercontent.com/LepkoQQ/userjs/94e6984be0a18a73fd63c54eb4aaf015f4548fb0/dist/utils/utils.js
// @require      https://raw.githubusercontent.com/LepkoQQ/userjs/94e6984be0a18a73fd63c54eb4aaf015f4548fb0/dist/youtube-watched/main.js
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
