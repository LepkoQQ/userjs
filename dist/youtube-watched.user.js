// ==UserScript==
// @name         Youtube Watched Improvements
// @description  Misc improvements to watched videos and subscription list
// @namespace    https://lepko.net/
// @version      0.0.2
// @author       You
// @run-at       document-start
// @match        https://www.youtube.com/*
// @require      https://raw.githubusercontent.com/LepkoQQ/userjs/c96ae2f2f81c5361cb24939c5d82e297156a1ef0/dist/utils/utils.js
// @require      https://raw.githubusercontent.com/LepkoQQ/userjs/c96ae2f2f81c5361cb24939c5d82e297156a1ef0/dist/youtube-watched/main.js
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
