// ==UserScript==
// @name        Reddit User Last Read
// @namespace   http://lepko.net/
// @version     0.0.3
// @run-at      document-start
// @match       *://*.reddit.com/user/*
// @require     https://dl.dropboxusercontent.com/u/15280793/userjs/lib/lepko-userjs-lib-4.js
// @grant       GM_getValue
// @grant       GM_setValue
// @nocompat    Chrome
// ==/UserScript==

(function main(window) {
  "use strict";

  const _ = window.lepko_userjs_lib_4;
  const LOGGER = _.logger(["-reddit-user-last-read-"]);

  _.addCSS(`
        #ext_clock {
            cursor: pointer;
            position: fixed;
            top: 15px;
            left: 55%;
            color: #66757F;
            font-size: 2em;
            z-index: 1001;
        }
        #ext_clock:hover {
            text-decoration: none;
            color: #12B345;
        }
        .ext_newpost {
            box-shadow: inset 0 0 0 2px #70D18F;
        }
    `);

  let LAST_READ = {
    time: 0,
  };
  let PAGE_NAME;

  const pagenameSelector = ".pagename";
  const siteTableSelector = "#siteTable";
  const postSelector = ".sitetable > .thing";
  const timestampSelector = "time";
  const latestPostSelector = `${siteTableSelector} > .thing`;

  function markAllAsRead() {
    LOGGER.log("Marking all as read!");

    const latestPost = _(latestPostSelector);

    LAST_READ = {
      time: new Date(_(timestampSelector, latestPost).getAttribute("datetime")).getTime(),
    };
    _.putJSON(`lastread-${PAGE_NAME}`, LAST_READ);

    _.all(".ext_newpost").forEach(element => element.classList.remove("ext_newpost"));
  }

  function checkPost(element) {
    if (!element.matches(postSelector)) {
      _.all(postSelector, element).forEach(child => checkPost(child));
    } else {
      const timestamp = new Date(_(timestampSelector, element).getAttribute("datetime")).getTime();
      if (timestamp > LAST_READ.time) {
        element.classList.add("ext_newpost");
      }
    }
  }

  function checkPosts() {
    LOGGER.log("Checking posts...");

    PAGE_NAME = _(pagenameSelector).textContent;
    LAST_READ = _.getJSON(`lastread-${PAGE_NAME}`, LAST_READ);

    const clock = document.body.appendChild(_.create("div#ext_clock", "🕒"));
    clock.addEventListener("click", markAllAsRead);

    if (LAST_READ.time === 0) {
      return;
    }

    const posts = _(siteTableSelector);
    _.all(postSelector).forEach(element => checkPost(element));

    LOGGER.log("Adding MutationObserver...");
    _.observeAddedElements(posts, checkPost);
  }

  function onDomLoaded() {
    checkPosts();
  }

  document.addEventListener("DOMContentLoaded", onDomLoaded);
})(this.unsafeWindow || window);
