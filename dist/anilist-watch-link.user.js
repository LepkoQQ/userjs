// ==UserScript==
// @name        AniList Watch Link
// @namespace   http://lepko.net/
// @version     1.0.0
// @run-at      document-start
// @match       https://anilist.co/anime/*
// @require     https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.0.2/purify.min.js
// @grant       GM_xmlhttpRequest
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       unsafeWindow
// @nocompat    Chrome
// ==/UserScript==

/* global GM_xmlhttpRequest, DOMPurify */
(function main() {
  'use strict';

  const BASE_WATCH_URL = 'https://9anime.pl';

  async function waitForElement(selector) {
    let promiseResolve;
    const promise = new Promise((resolve) => {
      promiseResolve = resolve;
    });

    function checkForElement() {
      const elem = document.querySelector(selector);
      if (elem) {
        promiseResolve();
      } else {
        requestAnimationFrame(checkForElement);
      }
    }

    checkForElement();

    return promise;
  }

  function createButton() {
    const rankings = document.querySelector('.rankings');
    const clone = rankings.firstElementChild.cloneNode(true);
    clone.href = '#';

    const icon = document.createElement('img');
    icon.src = 'https://s2.bunnycdn.ru/assets/sites/9anime/icons/favicon.png';
    icon.className = 'icon svg-inline--fa fa-w-18 fa-xs';
    clone.querySelector('svg').replaceWith(icon);

    const text = clone.querySelector('.rank-text');
    text.style.textTransform = 'none';
    text.innerText = 'Watch on 9anime';

    rankings.insertBefore(clone, rankings.firstElementChild);

    return clone;
  }

  function disableButton(btn) {
    btn.style.pointerEvents = 'none';
    btn.style.opacity = '0.5';
  }

  function enableButton(btn) {
    btn.style.pointerEvents = '';
    btn.style.opacity = '';
  }

  function htmlToDOM(str) {
    const cleanResponse = DOMPurify.sanitize(str, { USE_PROFILES: { html: true } });
    const temp = document.createElement('template');
    temp.innerHTML = cleanResponse;
    return temp.content;
  }

  function getTitleForSearch() {
    const title = document.querySelector('.header h1').innerText;
    return encodeURIComponent(title).replaceAll('%20', '+');
  }

  function getSeasonDataForSearch() {
    const dataSets = document.querySelectorAll('.sidebar .data-set');
    const seasonDataSet = Array.from(dataSets).filter((div) => div.querySelector('.type').innerText === 'Season')[0];
    const seasonSearchParams = new URLSearchParams(seasonDataSet.querySelector('a').search);
    return { season: seasonSearchParams.get('season').trim().toLowerCase(), year: `${Number(seasonSearchParams.get('year'))}` };
  }

  function getSearchResult(responseDOM) {
    const resultLinks = responseDOM.querySelectorAll('a.d-title');
    const results = Array.from(resultLinks).map((a) => ({ href: a.getAttribute('href'), jpTitle: a.dataset.jp }));
    // TODO: maybe use `fuse.js` for fuzzy matching here
    return results[0];
  }

  async function onWatchClick(event) {
    event.preventDefault();

    const btn = event.currentTarget;
    disableButton(btn);

    const baseUrl = `${BASE_WATCH_URL}/filter?country%5B%5D=120822&language%5B%5D=sub&sort=most_relevance`;
    const title = getTitleForSearch();
    const seasonData = getSeasonDataForSearch();

    const response = await new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'GET',
        url: `${baseUrl}&keyword=${title}&season%5B%5D=${seasonData.season}&year%5B%5D=${seasonData.year}`,
        onload: resolve,
        onabort: reject,
        onerror: reject,
        ontimeout: reject,
      });
    });
    const responseDOM = htmlToDOM(response.responseText);
    const result = getSearchResult(responseDOM);

    window.open(`${BASE_WATCH_URL}${result.href}`, '_blank', 'noopener,noreferrer');

    enableButton(btn);
  }

  waitForElement('.rankings').then(() => {
    const button = createButton();
    button.onclick = onWatchClick;
  });
})();
