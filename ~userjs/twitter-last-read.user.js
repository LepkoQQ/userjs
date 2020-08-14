// ==UserScript==
// @name        Twitter Last Read
// @namespace   http://lepko.net/
// @version     0.2.8
// @run-at      document-start
// @match       *://twitter.com/
// @require     https://dl.dropboxusercontent.com/u/15280793/userjs/lib/lepko-userjs-lib-4.js
// @grant       GM_getValue
// @grant       GM_setValue
// @nocompat    Chrome
// ==/UserScript==

(function main(window) {
  "use strict";

  const _ = window.lepko_userjs_lib_4;
  const LOGGER = _.logger(["-twitter-last-read-"]);

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
        .ext_newtweet {
            box-shadow: inset 0 0 0 2px #70D18F;
        }
    `);

  let LAST_READ = {
    time: 0,
    latestTweet: 0,
    latestRT: 0,
  };
  const FOUND_LAST_READ = {
    done: false,
    element: null,
  };

  const streamSelector = "#stream-items-id";
  const latestTweetSelector = `${streamSelector} .js-original-tweet:not([data-promoted])`;
  const latestTweetNoRTSelector = `${streamSelector} .js-original-tweet:not([data-promoted]):not([data-retweet-id])`;
  const timestampSelector = "._timestamp";
  const tweetSelector = ".js-stream-tweet";

  function checkLastFound() {
    LOGGER.log("Checking if last found...");

    if (!FOUND_LAST_READ.element) {
      document.scrollingElement.scrollTop = document.scrollingElement.scrollHeight;
    } else {
      FOUND_LAST_READ.done = true;
      const li = FOUND_LAST_READ.element.parentElement;
      setTimeout(() => window.jQuery(li).trigger("uiShortcutSelectPrev"), 0);
      setTimeout(() => window.jQuery(li).trigger("uiSelectItem"), 250);
      setTimeout(() => window.jQuery(li).trigger("uiShortcutSelectPrev"), 500);
    }
  }

  const debouncedCheckedLastFound = _.debounce(checkLastFound, 250);

  function removeTimestampListeners() {
    if (window.jQuery) {
      window.jQuery(document).off("uiWantsToRefreshTimestamps");
    }
  }

  function markAllAsRead() {
    LOGGER.log("Marking all as read!");

    const latestTweet = _(latestTweetSelector);
    const latestTweetNoRT = _(latestTweetNoRTSelector);

    LAST_READ = {
      time: +_(timestampSelector, latestTweetNoRT).dataset.timeMs,
      latestTweet: +latestTweetNoRT.dataset.tweetId,
      latestRT: latestTweet === latestTweetNoRT ? 0 : +latestTweet.dataset.retweetId,
    };
    _.putJSON("lastread", LAST_READ);

    _.all(".ext_newtweet").forEach(element => element.classList.remove("ext_newtweet"));

    removeTimestampListeners();
  }

  function checkTweet(element) {
    if (!element.matches(tweetSelector)) {
      _.all(tweetSelector, element).forEach(child => checkTweet(child));
    } else {
      const timestamp = +_(timestampSelector, element).dataset.timeMs;
      if (timestamp > LAST_READ.time) {
        element.classList.add("ext_newtweet");
      } else if (!FOUND_LAST_READ.element && !element.dataset.promoted && !element.dataset.retweetId) {
        FOUND_LAST_READ.element = element;
      }
    }
    if (!FOUND_LAST_READ.done) {
      debouncedCheckedLastFound();
    }
    removeTimestampListeners();
  }

  function checkTweets() {
    LOGGER.log("Checking tweets...");

    LAST_READ = _.getJSON("lastread", LAST_READ);

    const stream = _(streamSelector);
    _.all(tweetSelector, stream).forEach(element => checkTweet(element));

    LOGGER.log("Adding MutationObserver...");
    _.observeAddedElements(stream, checkTweet);

    const clock = document.body.appendChild(_.create("div#ext_clock", "🕒"));
    clock.addEventListener("click", markAllAsRead);

    removeTimestampListeners();
  }

  function onDomLoaded() {
    checkTweets();
  }

  document.addEventListener("DOMContentLoaded", onDomLoaded);
})(this.unsafeWindow || window);
