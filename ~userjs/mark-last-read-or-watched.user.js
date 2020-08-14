// ==UserScript==
// @name        Mark Last Read or Watched
// @namespace   http://lepko.net/
// @version     1.0.0
// @run-at      document-start
// @match       *://*.reddit.com/*
// @match       *://twitter.com/*
// @require     https://dl.dropboxusercontent.com/u/15280793/userjs/lib/lepko-userjs-lib-4.js
// @grant       GM_getValue
// @grant       GM_setValue
// @nocompat    Chrome
// ==/UserScript==

(function main(window) {
  "use strict";

  const _ = window.lepko_userjs_lib_4;
  const LOGGER = _.logger(["-mark-last-read-or-watched-"]);

  const OPTS = [
    {
      name: "reddit-user",
      isValidPath() {
        return /^(?:.+\.)?reddit\.com$/i.test(window.location.hostname) && /^\/user\/.+/i.test(window.location.pathname);
      },
    },
  ];

  function getOptions() {
    for (let i = 0; i < OPTS.length; i++) {
      const opt = OPTS[i];
      if (opt.isValidPath()) {
        return opt;
      }
    }
    return null;
  }

  function checkEntries(opt) {
    // TODO: opt;
  }

  function onDomLoaded() {
    const opt = getOptions();
    LOGGER.log(`DOM Loaded: ${window.location} -- ${opt && opt.name}`);

    if (opt) {
      checkEntries(opt);
    }
  }

  document.addEventListener("DOMContentLoaded", onDomLoaded);
})(this.unsafeWindow || window);
