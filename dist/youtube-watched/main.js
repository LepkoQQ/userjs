/* global _:false, GM_addStyle:false, GM_xmlhttpRequest:false, GM_getValue:false, GM_setValue:false */
(function main(context, window) {
  'use strict';

  let logger;
  let pageManager;
  let observer;

  const API_BASE_URL = 'https://api.tuhaz.zip/valstore';
  const API_GROUP = 'youtube-watched';

  let API_TOKEN = GM_getValue('apiToken');
  if (!API_TOKEN) {
    // eslint-disable-next-line no-alert
    API_TOKEN = window.prompt('Enter API token:');
    if (API_TOKEN) {
      GM_setValue('apiToken', API_TOKEN);
    } else {
      throw new Error('API token is required');
    }
  }

  function apiHeaders() {
    return {
      Authorization: `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json',
    };
  }

  function gmFetch({ method, url, body }) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method,
        url,
        headers: apiHeaders(),
        data: body,
        onload(response) {
          if (response.status < 200 || response.status >= 300) {
            reject(new Error(`Request failed: ${response.status} ${response.statusText}`));
            return;
          }
          try {
            resolve(JSON.parse(response.responseText));
          } catch (err) {
            reject(new Error(`Failed to parse response: ${response.responseText}`));
          }
        },
        onerror(response) {
          reject(new Error(`Request failed: ${response.status} ${response.statusText}`));
        },
      });
    });
  }

  async function apiPut(videoId) {
    const url = `${API_BASE_URL}/${API_GROUP}/${encodeURIComponent(videoId)}`;
    const json = await gmFetch({ method: 'PUT', url, body: JSON.stringify({ timestamp: Date.now() }) });
    logger.log('apiPut', videoId, json);
    return json;
  }

  async function apiBatchCheck(videoIds) {
    const CHUNK_SIZE = 50;
    const merged = { found: {}, missing: [] };

    for (let i = 0; i < videoIds.length; i += CHUNK_SIZE) {
      const chunk = videoIds.slice(i, i + CHUNK_SIZE);
      const keys = chunk.map(encodeURIComponent).join(',');
      const url = `${API_BASE_URL}/${API_GROUP}?keys=${keys}`;
      // eslint-disable-next-line no-await-in-loop
      const json = await gmFetch({ method: 'GET', url });
      logger.log('apiBatchCheck chunk', chunk, json);
      Object.assign(merged.found, json.data?.found ?? {});
      merged.missing.push(...(json.data?.missing ?? []));
    }

    return merged; // { found: {...}, missing: [...] }
  }

  const pendingQueue = new Map(); // videoId -> element[]
  let debounceTimer = null;

  async function hideVideoElement(element) {
    const parent = element.closest('ytd-item-section-renderer');
    if (parent && parent.querySelectorAll('ytd-video-renderer').length === 1) {
      parent.classList.add('ext--yt-watched-hidden');
    } else {
      element.classList.add('ext--yt-watched-hidden');
    }
  }

  function getVideoIdFromElement(element) {
    let videoId;

    if (element?.data?.content?.lockupViewModel?.contentType === 'LOCKUP_CONTENT_TYPE_VIDEO') {
      videoId = element.data.content.lockupViewModel?.contentId;
    } else {
      videoId = element?.data?.videoId;
    }

    return videoId;
  }

  function addHideButton(element) {
    const button = document.createElement('button');
    button.classList.add('ext--yt-watched-hide-button');
    button.textContent = 'Hide';
    button.addEventListener('click', async () => {
      const videoId = getVideoIdFromElement(element);
      if (!videoId) {
        logger.log('no video id found', element);
        return;
      }
      await apiPut(videoId);

      hideVideoElement(element);
    });
    element.appendChild(button);
  }

  async function flushPendingQueue() {
    debounceTimer = null;
    if (pendingQueue.size === 0) return;

    const entries = Array.from(pendingQueue.entries());
    pendingQueue.clear();

    const videoIds = entries.map(([id]) => id);
    let result;
    try {
      result = await apiBatchCheck(videoIds);
    } catch (err) {
      logger.log('apiBatchCheck error', err);

      // Replace pending outline with red on failure
      // eslint-disable-next-line no-restricted-syntax
      for (const [, elements] of entries) {
        // eslint-disable-next-line no-restricted-syntax
        for (const element of elements) {
          element.classList.remove('ext--yt-watched-pending');
          element.classList.add('ext--yt-watched-error');
        }
      }
      return;
    }

    const found = result?.found ?? {};

    // eslint-disable-next-line no-restricted-syntax
    for (const [videoId, elements] of entries) {
      // eslint-disable-next-line no-restricted-syntax
      for (const element of elements) {
        element.classList.remove('ext--yt-watched-pending');
        if (found[videoId]) {
          hideVideoElement(element);
        } else {
          addHideButton(element);
        }
      }
    }
  }

  function queueVideoElement(element) {
    const videoId = getVideoIdFromElement(element);
    if (!videoId) return;

    element.classList.add('ext--yt-watched-pending');
    if (pendingQueue.has(videoId)) {
      pendingQueue.get(videoId).push(element);
    } else {
      pendingQueue.set(videoId, [element]);
    }

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(flushPendingQueue, 300);
  }

  function onYtPageTypeChanged(event) {
    observer?.disconnect();
    observer = null;

    logger.log('yt-page-type-changed', event.detail);
  }

  function onEveryChildAdded(parent, selector, callback) {
    observer?.disconnect();
    observer = null;

    parent.querySelectorAll(selector).forEach(callback);

    observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE && node.matches(selector)) {
            callback(node);
          }
        });
      });
    });
    observer.observe(parent, { childList: true, subtree: true });
  }

  async function onYtPageDataUpdated(event) {
    if (event?.detail?.pageType === 'subscriptions') {
      logger.log('subscriptions page');

      onEveryChildAdded(document.body, 'ytd-video-renderer', (element) => {
        queueVideoElement(element);
      });

      onEveryChildAdded(document.body, 'ytd-rich-item-renderer', (element) => {
        queueVideoElement(element);
      });
    } else {
      logger.log('got yt-page-data-updated', event);
    }
  }

  function onYtdPageManagerFound(element) {
    pageManager = element;
    logger.log('page manager found');

    pageManager.addEventListener('yt-page-type-changed', onYtPageTypeChanged);
    pageManager.addEventListener('yt-page-data-updated', onYtPageDataUpdated);

    logger.log('events attached');

    logger.log('page manager ready');
  }

  function init(rootLogger) {
    logger = rootLogger.push('main');
    logger.log('started', window.location.href);

    GM_addStyle(`
      ytd-video-renderer #overlays ytd-thumbnail-overlay-resume-playback-renderer {
        height: 28px;
        z-index: 0;
        background: rgba(0, 0, 0, 0.66);
      }

      ytd-rich-item-renderer yt-thumbnail-bottom-overlay-view-model yt-thumbnail-overlay-progress-bar-view-model .ytThumbnailOverlayProgressBarHostWatchedProgressBar {
        height: 38px;
        z-index: 0;
        background: #000;
        opacity: 0.75;
      }

      ytd-rich-item-renderer yt-thumbnail-bottom-overlay-view-model .ytThumbnailBottomOverlayViewModelBadgeContainer {
        z-index: 1;
      }

      ytd-video-renderer #overlays ytd-thumbnail-overlay-resume-playback-renderer #progress {
        background: rgba(255, 0, 0, 0.66);
      }

      ytd-item-section-renderer #contents ytd-reel-shelf-renderer {
        display: none;
      }

      ytd-rich-section-renderer #content ytd-rich-shelf-renderer[is-shorts] {
        display: none;
      }

      ytd-rich-section-renderer #content ytd-rich-shelf-renderer[has-expansion-button] {
        display: none;
      }

      .ext--yt-watched-hide-button {
        position: absolute;
        top: 0;
        right: 0;
        z-index: 1;
        background-color: rgba(0, 0, 0, 0.66);
        color: white;
        padding: 4px;
        border: none;
        cursor: pointer;
      }

      ytd-rich-item-renderer .ext--yt-watched-hide-button {
        top: auto;
        bottom: 0;
        margin: 8px;
        padding: 1px 4px;
        background-color: rgba(225, 0, 45, 0.9);
        border-radius: 4px;
        font-size: 1.2rem;
        line-height: 1.8rem;
        font-weight: 500;
        text-transform: uppercase;
      }

      .ext--yt-watched-hide-button:hover {
        background-color: rgba(64, 0, 0, 0.66);
      }

      ytd-rich-item-renderer .ext--yt-watched-hide-button:hover {
        background-color: rgba(225, 0, 45, 0.6);
      }

      .ext--yt-watched-pending {
        outline: 2px solid orange;
      }

      .ext--yt-watched-error {
        outline: 2px solid red;
      }

      .ext--yt-watched-hidden {
        opacity: 0.1;
        max-height: 50px;
        overflow: hidden;
      }

      ytd-rich-item-renderer.ext--yt-watched-hidden {
        max-height: 88px;
      }

      ytd-rich-item-renderer.ext--yt-watched-hidden .yt-lockup-view-model__content-image,
      ytd-rich-item-renderer.ext--yt-watched-hidden .ytLockupViewModelContentImage {
        display: none;
      }

      ytd-item-section-renderer.ext--yt-watched-hidden ytd-shelf-renderer .grid-subheader {
        display: none;
      }
    `);

    _.waitFor('YTD-PAGE-MANAGER').then((element) => {
      onYtdPageManagerFound(element);
    });
  }

  context.ytWatchedInit = init;
})(this, this.unsafeWindow || window);
