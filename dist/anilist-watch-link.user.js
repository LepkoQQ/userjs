// ==UserScript==
// @name        AniList Watch Link
// @namespace   http://lepko.net/
// @version     1.0.1
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

  const BASE_WATCH_URL = 'https://aniwave.to';
  const FAVICON_URL =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAACCklEQVQ4T6WTX0iTURjGf5+y1VrTtebW2FAztcyt0UVBQTcyJWRUVxHWVXgZlGADC6pJ3WhBEkJ3dWUQCELQ8mJRFEZelDGKapuL2ND5b5aOza3NvrPayGpq9MHh47zP+/wO55znSIBksVg65f9ZeZjlsZ4vIjf1hcPh68J8Xp70CJd6QwXxpen1API9LgEIi5X1mjqarF3cf3H6XwARAVgWjharm3pTMwMjJ5mLhwqQEqmU7HKmKDQH2KTU4Wi8RLnKTHDqCSOB/pxBkko4bL2Gx9e1OuCHKrF/ezv1hhYGRtvkVdMYyho4sucmQ2NnmFn0YyxrRKuq5EPUUwAWtiAqenUdTusNngZ6Cc0+Y6/lFHbzcQLTXp6P93HUdoss33jg6/g7QFSP2fpZSEbx+rtpbehBp64hk00x/P4irbt7eRO5h29isDjAbjrBrgon3oAbR+0VZhNBtqp2sJiKsllp5OFHF1+TIgY/N56/hXxBu7EKR81lEuk5VAodj0NX2WduR6PcxkJqkuHAhRUHuuIM8oqjuhu1wkA6G8cT7KSq/BB2Qxv+2CPezQytDdi5xUmttpmJ+Bivpu5QKiloqnQzOnmbL0uf1wZoFCYOGjt4GxskHH+ZMxhVNqIJ3x95KET5d+WA/hyvY3dJZuaLhkgWclEuPKZfO7WKaubTn1YzC80liQj+z3P+DoMqsFPuTbm4AAAAAElFTkSuQmCC';

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
    icon.src = FAVICON_URL;
    icon.className = 'icon svg-inline--fa fa-w-18 fa-xs';
    clone.querySelector('svg').replaceWith(icon);

    const text = clone.querySelector('.rank-text');
    text.style.textTransform = 'none';
    text.innerText = 'Watch on AniWave';

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
