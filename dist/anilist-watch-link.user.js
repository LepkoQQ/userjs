// ==UserScript==
// @name        AniList Watch Link
// @namespace   http://lepko.net/
// @version     1.1.0
// @run-at      document-start
// @match       https://anilist.co/anime/*
// @grant       GM_xmlhttpRequest
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       unsafeWindow
// @nocompat    Chrome
// ==/UserScript==

/* global GM_xmlhttpRequest, unsafeWindow */
(function main() {
  'use strict';

  const WATCH_NAME = 'Anicrush';
  const BASE_WATCH_URL = 'https://anicrush.to';
  const BASE_API_URL = 'https://api.anicrush.to';
  const FAVICON_URL =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAAXNSR0IB2cksfwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAiVQTFRFAAAAfFrNf1zRhF/UhWHZiGPdi2XfjmfjkWnolWvqlm7vmm/ymnDzdVTEeFbHe1nKflvOf1zSf1nTgFnXg1vbiGHfj2fkkWrolGzrl27vmW/xbU65cFG8c1PAdlXEc0/Ee1rLs57i0sbv0sTwsZjnhV7biWHgj2jlkmrplW3slm7uaEuya022bk+6ZkS5sZ/c////sJfniGDejWfikGnmkmvpZEesZkmwYkOvrp3X9/T7+fj99/T8nIDdhF7XiGPci2XgjmfjX0OlX0OoZ0uu+/r9e2DBZkO6bEi/c07Ie1fNe1bQgFvUhmHZiWTdWkCfVzugp5nOcla2Z0ezbk+5cFG9clLAdlTEcUzEybrqpYzdflrShGDWVDyZTzOWzsfi7+32VjakZkmvZUevaUqyaUe63dXwwLDmd1PKf1zQVTyZTDGTy8Xg8O32TzGdWz+hnH3jlHXcY0WtYUCxva7ick/DeljKTzWVn5DFaFKjm3zlt5b/uJf/k3Lce2S4ln/Ob0+/dlXDVDuYVDuZxKn9rIb7rIj6q4b80Lr9YUKxcVG9VTyZTjSVmYzAxaf/n3n2pYD5nHftoHrypYD4nnf20br/i3a+YkStaUuzbE22VTyZTTSTbE65oXn6i2feTjWPUDeRlW7pnnb2aEm0WT2hYUWpZEesZ0mwVTyZUzqWUjmVUTmUUjiUUTmVVTuYWT+fXEGiX0SmYkaqVTyZVTyYVz6cWkCgtQnzJwAAALd0Uk5TADHI+/////////vIMYL///////////////+CMf//////////////////Mcj////////////I+//////////////7//////////////////////////////////////////////////////////////////////////////////////////////////v/////////////////+8j////////////////IMf///////////zGC//+C14DaKQAAAKdJREFUeJxjZGBgRAJfGBgZeJEFGJ8xSjOiAW0wyQACEAEzIP7OwMDF+JUHIuDEyPiGQRTIOGYNEfBnZLzPoIRkRiwj40UDEOOkBeMpcyCdxch4xBYit5fBBSTAy7iDwRMssInBHyQgwbiWIQRoMSPjCobI02aM3feRTQSCWRcYDFEEVhxiYLBnZNzP4AQVYNi8nQEGvBgZvYC+WPHp430wX5GfL4IBAOpjIDeNvUQpAAAAAElFTkSuQmCC';

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
    text.innerText = `Watch on ${WATCH_NAME}`;

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

  async function onWatchClick(event) {
    event.preventDefault();

    const btn = event.currentTarget;
    disableButton(btn);

    const baseUrl = `${BASE_API_URL}/shared/v2/movie/list?limit=24&page=1`;
    const title = getTitleForSearch();
    const seasonData = getSeasonDataForSearch();

    const response = await new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'GET',
        url: `${baseUrl}&keyword=${title}&years=${seasonData.year}`,
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
      let openUrl = `${BASE_WATCH_URL}/watch/${result.slug}.${result.id}`;
      const progress = await getAnimeProgress();
      if (progress > 0) {
        openUrl += `?ep=${progress + 1}`;
      }
      window.open(openUrl, '_blank', 'noopener,noreferrer');
    } else {
      console.error('Watch Link Error', json);
    }

    enableButton(btn);
  }

  waitForElement('.rankings').then(() => {
    const button = createButton();
    button.onclick = onWatchClick;
  });
})();
