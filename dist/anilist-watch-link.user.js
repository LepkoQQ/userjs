// ==UserScript==
// @name        AniList Watch Link
// @description Add watch links to anime page
// @namespace   http://lepko.net/
// @version     1.2.2
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
    const button = rankings.querySelector('a.ranking:not(.__watch-link)');
    const clone = button.cloneNode(true);
    clone.href = '#';
    clone.classList.add('__watch-link');

    const icon = document.createElement('img');
    icon.src =
      config.faviconUrl ||
      'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" fill="%23ffbade" viewBox="4 2 18.999 20"><path d="M21.409 9.353a2.998 2.998 0 0 1 0 5.294L8.597 21.614C6.534 22.736 4 21.276 4 18.968V5.033c0-2.31 2.534-3.769 4.597-2.648l12.812 6.968Z"/></svg>';
    icon.className = 'icon svg-inline--fa fa-w-18 fa-xs';
    clone.querySelector('svg').replaceWith(icon);

    const text = clone.querySelector('.rank-text');
    text.style.textTransform = 'none';
    text.innerText = `Watch on ${config.name}`;

    rankings.insertBefore(clone, button);

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
    let title = document.querySelector('.header h1').innerText;
    title = title
      .trim()
      .toLowerCase()
      .replace(/[^a-z\s]/g, '');
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
    return json?.data?.Media?.mediaListEntry?.progress ?? 0;
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
              Origin: this.baseUrl,
              Referer: `${this.baseUrl}/`,
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
    gogoanime: {
      name: 'Gogoanime',
      baseUrl: 'https://anitaku.pe',
      faviconUrl: '',
      async findLink(title, seasonData, animeProgress) {
        const response = await new Promise((resolve, reject) => {
          GM_xmlhttpRequest({
            method: 'GET',
            url: `https://ajax.gogocdn.net/site/loadAjaxSearch?keyword=${title}&id=-1&link_web=${this.baseUrl}/`,
            headers: {
              Accept: 'application/json, text/plain, */*',
              Origin: this.baseUrl,
              Referer: `${this.baseUrl}/`,
            },
            onload: resolve,
            onabort: reject,
            onerror: reject,
            ontimeout: reject,
          });
        });
        const json = JSON.parse(response.responseText);
        if (json.content) {
          const template = document.createElement('template');
          template.innerHTML = json.content;
          const linkEl = template.content.querySelector('a.ss-title');
          if (linkEl) {
            let link = linkEl.href;
            if (animeProgress > 0) {
              link = link.replace('/category/', '/');
              link += `-episode-${animeProgress + 1}`;
            }
            return { ok: true, url: link };
          }
        }
        return { ok: false, error: json };
      },
    },
    hianime: {
      name: 'HiAnime',
      baseUrl: 'https://hianime.to',
      faviconUrl: '',
      async findLink(title, seasonData, animeProgress) {
        const response = await new Promise((resolve, reject) => {
          GM_xmlhttpRequest({
            method: 'GET',
            url: `${this.baseUrl}/ajax/search/suggest?keyword=${title}`,
            headers: {
              Accept: 'application/json, text/plain, */*',
              Origin: this.baseUrl,
              Referer: `${this.baseUrl}/`,
            },
            onload: resolve,
            onabort: reject,
            onerror: reject,
            ontimeout: reject,
          });
        });
        const json = JSON.parse(response.responseText);
        if (json.status && json.html) {
          const template = document.createElement('template');
          template.innerHTML = json.html;
          const linkEl = template.content.querySelector('.nav-item');
          if (linkEl) {
            const hrefPath = linkEl.getAttribute('href').split('?')[0];
            let openUrl = `${this.baseUrl}/watch${hrefPath}`;
            if (animeProgress > 0) {
              const animeId = hrefPath.split('-').at(-1);
              const response2 = await new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                  method: 'GET',
                  url: `${this.baseUrl}/ajax/v2/episode/list/${animeId}`,
                  headers: {
                    Accept: 'application/json, text/plain, */*',
                    Origin: this.baseUrl,
                    Referer: `${openUrl}/`,
                  },
                  onload: resolve,
                  onabort: reject,
                  onerror: reject,
                  ontimeout: reject,
                });
              });
              const json2 = JSON.parse(response2.responseText);
              const template2 = document.createElement('template');
              if (json2.status && json2.html) {
                template2.innerHTML = json2.html;
                const episodeEl = template2.content.querySelector(`.ep-item[data-number="${animeProgress + 1}"]`);
                if (episodeEl) {
                  const episodeId = episodeEl.dataset.id;
                  openUrl += `?ep=${episodeId}`;
                }
              }
            }
            return { ok: true, url: openUrl };
          }
        }
        return { ok: false, error: 'No results found' };
      },
    },
  };

  waitForElement('.rankings').then(() => {
    const button3 = createButton(CONFIG.hianime);
    button3.onclick = onWatchClick(CONFIG.hianime);

    const button = createButton(CONFIG.anicrush);
    button.onclick = onWatchClick(CONFIG.anicrush);

    const button2 = createButton(CONFIG.gogoanime);
    button2.onclick = onWatchClick(CONFIG.gogoanime);
  });
})();
