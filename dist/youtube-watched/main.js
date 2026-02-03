/* global _:false, GM_addStyle:false */
(function main(context, window) {
  'use strict';

  let logger;
  let pageManager;
  let observer;

  const dbName = 'ytWatchedExtDb';
  const storeName = 'hiddenIdsStore';
  let db;

  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, 1);

      request.onupgradeneeded = (event) => {
        db = event.target.result;
        db.createObjectStore(storeName, { keyPath: 'id' });
      };

      request.onsuccess = (event) => {
        db = event.target.result;
        logger.log('database opened');
        resolve(db);
      };

      request.onerror = (event) => {
        logger.log('database error', event.target.errorCode);
        reject(new Error(`Database error: ${event.target.errorCode}`));
      };
    });
  }

  async function cleanUpOldDbEntries() {
    if (!db) {
      await openDatabase();
    }

    {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const countRequest = store.count();
      countRequest.onsuccess = (event) => {
        logger.log('number of entries in store:', event.target.result);
      };
    }

    {
      const timeThreshold = Date.now() - 4 * 7 * 24 * 60 * 60 * 1000; // 4 weeks
      logger.log('cleaning up entries older than', new Date(timeThreshold).toISOString());
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.openCursor();
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (!cursor.value.timestamp || cursor.value.timestamp < timeThreshold) {
            store.delete(cursor.key);
            logger.log('deleted old entry', cursor.key);
          }
          cursor.continue();
        } else {
          logger.log('clean up completed');
        }
      };
    }
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

  async function addIdToHiddenList(videoId) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add({
        id: videoId,
        timestamp: Date.now(),
      });

      request.onsuccess = (event) => {
        logger.log('added to hidden list', videoId);
        resolve(event);
      };

      request.onerror = (event) => {
        logger.log('error adding to hidden list', event.target.errorCode);
        reject(new Error(`Error adding to hidden list: ${event.target.errorCode}`));
      };
    });
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

  async function checkIfHidden(element) {
    return new Promise((resolve, reject) => {
      const videoId = getVideoIdFromElement(element);
      if (!videoId) {
        // logger.log('no video id found', element);
        resolve({ hidden: null });
        return;
      }

      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(videoId);

      request.onsuccess = (event) => {
        const { result } = event.target;
        if (result) {
          resolve({ hidden: true, data: result });
        } else {
          resolve({ hidden: false });
        }
      };

      request.onerror = (event) => {
        logger.log('error checking if hidden', event.target.errorCode);
        reject(new Error(`Error checking if hidden: ${event.target.errorCode}`));
      };
    });
  }

  async function hideVideoElement(element) {
    const parent = element.closest('ytd-item-section-renderer');
    if (parent && parent.querySelectorAll('ytd-video-renderer').length === 1) {
      parent.classList.add('ext--yt-watched-hidden');
    } else {
      element.classList.add('ext--yt-watched-hidden');
    }
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
      await addIdToHiddenList(videoId);

      hideVideoElement(element);
    });
    element.appendChild(button);
  }

  async function onYtPageDataUpdated(event) {
    if (event?.detail?.pageType === 'subscriptions') {
      logger.log('subscriptions page');

      if (!db) {
        await openDatabase();
      }

      onEveryChildAdded(document.body, 'ytd-video-renderer', async (element) => {
        const result = await checkIfHidden(element);
        if (result.hidden != null) {
          if (result.hidden) {
            hideVideoElement(element);
          } else {
            addHideButton(element);
          }
        }
      });

      onEveryChildAdded(document.body, 'ytd-rich-item-renderer', async (element) => {
        const result = await checkIfHidden(element);
        if (result.hidden) {
          hideVideoElement(element);
        } else {
          addHideButton(element);
        }
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

    cleanUpOldDbEntries();

    logger.log('called clean up');
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

      .ext--yt-watched-hidden {
        opacity: 0.1;
        max-height: 50px;
        overflow: hidden;
      }

      ytd-rich-item-renderer.ext--yt-watched-hidden {
        max-height: 88px;
      }

      ytd-rich-item-renderer.ext--yt-watched-hidden .yt-lockup-view-model__content-image {
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
