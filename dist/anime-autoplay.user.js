// ==UserScript==
// @name         anime autoplay
// @version      1.0.0
// @match        *://*.9anime.is/watch/*
// @match        *://*.rapidvideo.com/*
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  if (window.top !== window) {
    if (window.location.hostname.includes('rapidvideo.com')) {
      const q720p = document.querySelector('a[href$="&q=720p"');
      if (q720p && q720p.children[0].style.color !== 'rgb(255, 255, 255)') {
        q720p.click();
      } else {
        parent.postMessage({ videoUrl: document.querySelector('video').src }, '*');
      }
    }
    return;
  }

  window.addEventListener('message', (event) => {
    if (event.origin.includes('rapidvideo.com') && event.data.videoUrl) {
      const player = document.querySelector('#player');
      player.querySelector('iframe').remove();
      player.insertAdjacentHTML('beforeend', `<video autoplay controls width="100%" height="100%" src="${event.data.videoUrl}"></video>`);
      player.querySelector('video').addEventListener('ended', () => {
        document.querySelector('.prevnext.control[data-value="next"]').click();
      });
    }
  });
})();
