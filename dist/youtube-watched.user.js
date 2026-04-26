// ==UserScript==
// @name         Youtube Watched Improvements
// @description  Misc improvements to watched videos and subscription list
// @namespace    https://lepko.net/
// @version      0.0.4
// @author       You
// @run-at       document-start
// @match        https://www.youtube.com/*
// @require      https://raw.githubusercontent.com/LepkoQQ/userjs/b0d795d9adeab7dce8594a2969a8335e465847c3/dist/utils/utils.js
// @require      https://raw.githubusercontent.com/LepkoQQ/userjs/b0d795d9adeab7dce8594a2969a8335e465847c3/dist/youtube-watched/main.js
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
