// ==UserScript==
// @name        AniList Watch Link
// @description Add watch links to anime page
// @namespace   http://lepko.net/
// @version     1.2.0
// @run-at      document-start
// @match       https://anilist.co/anime/*
// @grant       GM_xmlhttpRequest
// @grant       unsafeWindow
// @nocompat    Chrome
// ==/UserScript==

/* global GM_xmlhttpRequest, unsafeWindow */
(function main() {
  'use strict';

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

  function createButton(config) {
    const rankings = document.querySelector('.rankings');
    const clone = rankings.firstElementChild.cloneNode(true);
    clone.href = '#';

    const icon = document.createElement('img');
    icon.src = config.faviconUrl;
    icon.className = 'icon svg-inline--fa fa-w-18 fa-xs';
    clone.querySelector('svg').replaceWith(icon);

    const text = clone.querySelector('.rank-text');
    text.style.textTransform = 'none';
    text.innerText = `Watch on ${config.name}`;

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

  function getTitleForSearch() {
    const title = document.querySelector('.header h1').innerText;
    return encodeURIComponent(title).replaceAll('%20', '+');
  }

  function getSeasonDataForSearch() {
    const dataSets = document.querySelectorAll('.sidebar .data-set');
    const seasonDataSet = Array.from(dataSets).filter((div) => div.querySelector('.type').innerText === 'Season')[0];
    const seasonSearchParams = new URLSearchParams(seasonDataSet.querySelector('a').search);
    return { season: seasonSearchParams.get('season').trim().toLowerCase(), year: `${parseInt(seasonSearchParams.get('year'), 10)}` };
  }

  async function getAnimeProgress() {
    const response = await fetch('https://anilist.co/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': unsafeWindow.al_token,
        schema: 'default',
      },
      body: JSON.stringify({
        query: `query($mediaId:Int){Media(id:$mediaId){id mediaListEntry{progress}}}`,
        variables: {
          mediaId: parseInt(window.location.pathname.split('/')[2], 10),
        },
      }),
    });
    const json = await response.json();
    return json.data.Media.mediaListEntry.progress;
  }

  function onWatchClick(config) {
    return async (event) => {
      event.preventDefault();

      const btn = event.currentTarget;
      disableButton(btn);

      const title = getTitleForSearch();
      const seasonData = getSeasonDataForSearch();
      const animeProgress = await getAnimeProgress();

      const { ok, url, error } = await config.findLink(title, seasonData, animeProgress);
      if (ok) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        console.error('Watch Link Error', error);
      }

      enableButton(btn);
    };
  }

  const CONFIG = {
    anicrush: {
      name: 'Anicrush',
      baseUrl: 'https://anicrush.to',
      faviconUrl: '',
      async findLink(title, seasonData, animeProgress) {
        const response = await new Promise((resolve, reject) => {
          GM_xmlhttpRequest({
            method: 'GET',
            url: `https://api.anicrush.to/shared/v2/movie/list?limit=24&page=1&keyword=${title}&years=${seasonData.year}`,
            headers: {
              Accept: 'application/json, text/plain, */*',
              Origin: 'https://anicrush.to',
              Referer: 'https://anicrush.to/',
              'x-site': 'anicrush',
            },
            onload: resolve,
            onabort: reject,
            onerror: reject,
            ontimeout: reject,
          });
        });
        const json = JSON.parse(response.responseText);
        if (json.status === true) {
          const result = json.result.movies[0];
          let openUrl = `${this.baseUrl}/watch/${result.slug}.${result.id}`;
          if (animeProgress > 0) {
            openUrl += `?ep=${animeProgress + 1}`;
          }
          return { ok: true, url: openUrl };
        }
        return { ok: false, error: json };
      },
    },
  };

  waitForElement('.rankings').then(() => {
    const button = createButton(CONFIG.anicrush);
    button.onclick = onWatchClick(CONFIG.anicrush);
  });
})();
