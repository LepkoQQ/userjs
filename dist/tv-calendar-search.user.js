// ==UserScript==
// @name        TV Calendar Search
// @description Add search links to calendar
// @namespace   http://lepko.net/
// @version     2.0.1
// @run-at      document-idle
// @match       *://*.pogdesign.co.uk/cat/*
// @require     https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.0.2/purify.min.js
// @require     https://raw.githubusercontent.com/LepkoQQ/userjs/012db8d2ec041668878722807f9a70e888f9db02/dist/utils/utils.js
// @require     https://raw.githubusercontent.com/LepkoQQ/userjs/012db8d2ec041668878722807f9a70e888f9db02/dist/tv-calendar-search/_asyncmenu.js
// @require     https://raw.githubusercontent.com/LepkoQQ/userjs/012db8d2ec041668878722807f9a70e888f9db02/dist/tv-calendar-search/api.js
// @require     https://raw.githubusercontent.com/LepkoQQ/userjs/012db8d2ec041668878722807f9a70e888f9db02/dist/tv-calendar-search/main.js
// @grant       GM_xmlhttpRequest
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       unsafeWindow
// @nocompat    Chrome
// ==/UserScript==

if (this.catSite == null) {
  return;
}

/* globals _:false, catSite:false */
(function main(window) {
  'use strict';

  const LOGGER = _.logger('tv calendar search');
  LOGGER.log('starting:', window.location.href);
  catSite.init(LOGGER);
})(this.unsafeWindow || window);
