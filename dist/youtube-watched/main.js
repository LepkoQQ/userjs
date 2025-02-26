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
      const request = store.add({ id: videoId });

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

  async function checkIfHidden(element) {
    return new Promise((resolve, reject) => {
      const videoId = element?.data?.videoId;
      if (!videoId) {
        logger.log('no video id found');
        resolve(false);
        return;
      }

      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(videoId);

      request.onsuccess = (event) => {
        const { result } = event.target;
        resolve(!!result);
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
      const videoId = element?.data?.videoId;
      if (!videoId) {
        logger.log('no video id found');
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
        const isHidden = await checkIfHidden(element);
        if (isHidden) {
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

      ytd-video-renderer #overlays ytd-thumbnail-overlay-resume-playback-renderer #progress {
        background: rgba(255, 0, 0, 0.66);
      }

      ytd-item-section-renderer #contents ytd-reel-shelf-renderer {
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

      .ext--yt-watched-hide-button:hover {
        background-color: rgba(64, 0, 0, 0.66);
      }

      .ext--yt-watched-hidden {
        opacity: 0.1;
        max-height: 50px;
        overflow: hidden;
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
