/* global _:false */
const VideoScroller = (function createVideoScroller() {
  'use strict';

  _.addCSS(`
    .ext_volume_bar {
      position: absolute;
      background: rgba(0,0,0,0.4);
      z-index: 2000;
      width: 13px;
      height: 200px;
      opacity: 0;
      visibility: hidden;
      transition: opacity .1s cubic-bezier(0.4,0,1,1);
    }
    .ext_volume_bar_fill {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 100%;
    }
    .ext_progress_bar {
      position: absolute;
      bottom: 0;
      z-index: 2000;
      width: 100%;
      height: 3px;
      opacity: 1;
      transition: opacity .1s cubic-bezier(0.4,0,1,1);
    }
    .ext_progress_bar_fill,
    .ext_progress_bar_fill_buffer {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 3px;
      transform: scaleX(0);
      transform-origin: left;
    }
    .ext_progress_bar_fill_buffer {
      background: rgba(255,255,255,0.4);
    }
    .ext_extra_data_container {
      all: initial;
      position: absolute;
      top: 0;
      right: 0;
      z-index: 2000;
      width: 100px;
      height: 100px;
      background: rgba(0,0,0,0.5);
      box-shadow: 0 0 1px 0 #fff;
      display: grid;
      padding: 4px;
      gap: 4px;
      grid-template-columns: repeat(2, 1fr);
      grid-template-rows: repeat(2, 1fr);
      opacity: 1;
      transition: opacity .1s cubic-bezier(0.4,0,1,1);
    }
    .ext_extra_data_container > div {
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: row-resize;
      color: #fff;
      font-family: "Segoe UI", Arial;
      font-size: 11px;
      line-height: 1.2;
    }
    .ext_extra_data_container > .ext_toggle_fullscreen {
      cursor: pointer;
    }
    .ext_extra_data_container > div:hover {
      background: rgba(25,25,0,0.5);
    }
    .ext_expand_to_fullscreen {
      position: fixed !important;
      inset: 0 !important;
      z-index: 2147483647 !important;
      background: black !important;
    }
    .ext_expand_to_fullscreen video {
      background: black !important;
    }
  `);

  const DEFAULT_OPTIONS = {
    logger: undefined,
    color: '#000',
    getVolumeWheelElement(player) {
      return player;
    },
    // eslint-disable-next-line no-unused-vars
    getFullscreenElement(player) {
      return null;
    },
    // eslint-disable-next-line no-unused-vars
    getBottomOffset(player) {
      return 0;
    },
    getLeftOffset(player) {
      return this.getBottomOffset(player);
    },
    getTopOffset(player) {
      return this.getLeftOffset(player);
    },
    getRightOffset(player) {
      return this.getLeftOffset(player);
    },
    getVolume(player) {
      const video = _.get('video', player);
      return video.muted ? 0 : video.volume * 100;
    },
    changeVolume(player, increase) {
      const step = 0.05;
      const video = _.get('video', player);
      const volume = video.muted ? 0 : video.volume;
      const newVolume = Math.max(Math.min(increase ? volume + step : volume - step, 1), 0);
      if (newVolume > 0) {
        video.muted = false;
      }
      video.volume = newVolume;
      return newVolume * 100;
    },
    getPlaybackRate(player) {
      const video = _.get('video', player);
      return video.playbackRate;
    },
    setPlaybackRate(player, value) {
      const video = _.get('video', player);
      video.playbackRate = value;
    },
    getProgressContainerElement(player) {
      return player;
    },
    getVideoDuration(player) {
      const video = _.get('video', player);
      return video.duration;
    },
    getCurrentTime(player) {
      const video = _.get('video', player);
      return video.currentTime;
    },
    getCurrentBuffer(player) {
      const video = _.get('video', player);
      for (let i = 0; i < video.buffered.length; i += 1) {
        const start = video.buffered.start(i);
        const end = video.buffered.end(i);
        if (video.currentTime >= start && video.currentTime <= end) {
          return end;
        }
      }
      return 0;
    },
    isPaused(player) {
      const video = _.get('video', player);
      return video.paused;
    },
    playOrPause(player) {
      const video = _.get('video', player);
      if (video.paused) {
        video.play();
      } else {
        video.pause();
      }
      return true;
    },
    seekVideo(player, event) {
      const step = VideoScroller.getStepSizeFromKeyEvent(event);
      if (step !== 0) {
        const video = _.get('video', player);
        const playerTime = video.currentTime;
        if (playerTime) {
          video.currentTime = playerTime + step;
          return true;
        }
      }
      return false;
    },
    addTimeUpdateEventListener(player, func) {
      const video = _.get('video', player);
      video.addEventListener('timeupdate', func);
      video.addEventListener('progress', func);
    },
    removeTimeUpdateEventListener(player, func) {
      const video = _.get('video', player);
      video.removeEventListener('timeupdate', func);
      video.removeEventListener('progress', func);
    },
  };

  // eslint-disable-next-line no-shadow
  return class VideoScroller {
    constructor(player, options = {}) {
      this.player = player;
      this.options = { ...DEFAULT_OPTIONS, ...options };
      this.options.logger = this.options.logger ? this.options.logger.push('scroller') : _.logger('scroller');

      // scroll player area to control volume
      this.volumeWheelElement = this.options.getVolumeWheelElement(this.player);
      if (this.volumeWheelElement) {
        this.onScrollPlayer = this.onScrollPlayer.bind(this);
        this.onMouseMovePlayer = this.onMouseMovePlayer.bind(this);
        this.volumeWheelElement.addEventListener('wheel', this.onScrollPlayer);
        this.volumeWheelElement.addEventListener('mousemove', this.onMouseMovePlayer);
      }

      // show player progress bar when controls are hidden
      this.progressContainerElement = this.options.getProgressContainerElement(this.player);
      if (this.progressContainerElement) {
        const progress = this.progressContainerElement.appendChild(_.create('.ext_progress_bar'));
        this.progressFillBufferElement = progress.appendChild(_.create('.ext_progress_bar_fill_buffer'));
        this.progressFillElement = progress.appendChild(_.create('.ext_progress_bar_fill', { style: `background:${this.options.color}` }));
        this.updateProgress = this.updateProgress.bind(this);
        this.options.addTimeUpdateEventListener(this.player, this.updateProgress);
      }

      // add key shortcuts
      this.onKeyDown = this.onKeyDown.bind(this);
      this.onKeyUp = this.onKeyUp.bind(this);
      window.addEventListener('keydown', this.onKeyDown, true);
      window.addEventListener('keyup', this.onKeyUp, true);

      this.options.logger.log('created scroller');
    }

    destroy() {
      this.options.removeTimeUpdateEventListener(this.player, this.updateProgress);
      this.player = null;

      if (this.volumeWheelElement) {
        this.volumeWheelElement.removeEventListener('wheel', this.onScrollPlayer);
        this.volumeWheelElement.removeEventListener('mousemove', this.onMouseMovePlayer);
        this.volumeWheelElement = null;
      }

      if (this.speedTextElement) {
        this.speedTextElement.removeEventListener('wheel', this.onScrollSpeed);
        this.speedTextElement.removeEventListener('click', this.onClickSpeed);
        this.speedTextElement.remove();
        this.speedTextElement = null;
      }

      if (this.fullscreenElement) {
        this.fullscreenElement.removeEventListener('click', this.onClickFullscreen);
        this.fullscreenElement.remove();
        this.fullscreenElement = null;
      }

      if (this.zoomTextElement) {
        this.zoomTextElement.removeEventListener('wheel', this.onScrollZoom);
        this.zoomTextElement.removeEventListener('click', this.onClickZoom);
        this.zoomTextElement.remove();
        this.zoomTextElement = null;
      }

      if (this.panTextElement) {
        this.panTextElement.removeEventListener('wheel', this.onScrollPan);
        this.panTextElement.removeEventListener('click', this.onClickPan);
        this.panTextElement.remove();
        this.panTextElement = null;
      }

      this.progressContainerElement = null;
      this.progressFillElement = null;
      this.progressFillBufferElement = null;

      document.removeEventListener('keydown', this.onKeyDown, true);
      document.removeEventListener('keyup', this.onKeyUp, true);

      this.destroyed = true;

      this.options.logger.log('destroyed scroller');
    }

    onKeyDown(event) {
      if (_.isInputActive()) return;

      switch (event.code) {
        case 'Space':
        case 'KeyK': {
          if (this.options.playOrPause(this.player)) {
            event.preventDefault();
            event.stopPropagation();
            if (event.code === 'KeyK') {
              this.wasKeyKDown = true;
            }
          }
          break;
        }
        case 'KeyV':
        case 'KeyJ':
        case 'KeyL':
        case 'ArrowLeft':
        case 'ArrowRight': {
          if (this.options.seekVideo(this.player, event)) {
            event.preventDefault();
            event.stopPropagation();
          }
          break;
        }
        case 'ArrowUp':
        case 'ArrowDown': {
          event.preventDefault();
          event.stopPropagation();
          this.changeVolume(event.code === 'ArrowUp');
          break;
        }
        case 'Period':
        case 'Comma': {
          if (event.shiftKey && !event.ctrlKey && !event.altKey) {
            event.preventDefault();
            event.stopPropagation();
            this.changeSpeed({ increase: event.code === 'Period' });
          } else if (!event.shiftKey && event.ctrlKey && !event.altKey) {
            event.preventDefault();
            event.stopPropagation();
            this.changeZoom({ increase: event.code === 'Period' });
          }
          break;
        }
        case 'KeyF': {
          const fsElement = this.options.getFullscreenElement(this.player);
          if (fsElement) {
            event.preventDefault();
            event.stopPropagation();
            this.toggleFullscreen();
          }
          break;
        }
        case 'KeyX': {
          event.preventDefault();
          event.stopPropagation();
          setTimeout(() => this.showVideoOverlayElements(), 0);
          break;
        }
        default:
          break;
      }
    }

    onKeyUp(event) {
      if (event.code === 'KeyK' && this.wasKeyKDown) {
        event.preventDefault();
        event.stopPropagation();
        this.wasKeyKDown = false;
      }
    }

    updateProgress() {
      if (!this.destroyed && this.player) {
        if (this.progressContainerElement && this.progressFillElement && this.progressFillBufferElement) {
          const duration = this.options.getVideoDuration(this.player);
          const currentTime = this.options.getCurrentTime(this.player);
          const currentBuffer = this.options.getCurrentBuffer(this.player);
          if (duration > 0) {
            const percent = currentTime / duration;
            this.progressFillElement.style.transform = `scaleX(${percent})`;
            const percentBuffered = currentBuffer / duration;
            this.progressFillBufferElement.style.transform = `scaleX(${percentBuffered})`;
          }

          if (this.speedTextElement) {
            const speed = this.options.getPlaybackRate(this.player);
            this.speedTextElement.textContent = `${speed}x`;

            if (duration > 0) {
              const scaledTimeRemaining = (duration - currentTime) / speed;
              this.speedTextElement.title = `-${_.formatDuration(scaledTimeRemaining)}`;
            }
          }
        }
      }
    }

    onScrollSpeed(event) {
      event.preventDefault();
      event.stopPropagation();
      this.changeSpeed({ increase: event.deltaY < 0 });
    }

    onClickSpeed(event) {
      event.preventDefault();
      event.stopPropagation();
      this.changeSpeed({ reset: true });
    }

    onClickFullscreen(event) {
      event.preventDefault();
      event.stopPropagation();
      this.toggleFullscreen();
    }

    onScrollZoom(event) {
      event.preventDefault();
      event.stopPropagation();
      this.changeZoom({ increase: event.deltaY < 0 });
    }

    onClickZoom(event) {
      event.preventDefault();
      event.stopPropagation();
      this.changeZoom({ reset: true });
    }

    onScrollPan(event) {
      event.preventDefault();
      event.stopPropagation();
      this.changePan({
        negative: event.deltaY < 0,
        direction: event.shiftKey ? 'horizontal' : 'vertical',
      });
    }

    onClickPan(event) {
      event.preventDefault();
      event.stopPropagation();
      this.changePan({ reset: true });
    }

    toggleFullscreen() {
      const fsElement = this.options.getFullscreenElement(this.player);
      if (!fsElement) {
        return;
      }
      fsElement.classList.toggle('ext_expand_to_fullscreen');

      // Fix "position: fixed" inside 3d transformed elements
      let el = fsElement;
      while (el) {
        if (getComputedStyle(el).transformStyle !== 'flat') {
          el.style.transformStyle = 'flat';
        }
        if (getComputedStyle(el).transform !== 'none') {
          el.style.transform = 'none';
        }
        el = el.parentElement;
      }
    }

    changeSpeed({ reset = false, increase = true } = {}) {
      if (this.player) {
        const step = 0.25;
        const speed = this.options.getPlaybackRate(this.player);
        let newSpeed = speed;
        if (reset) {
          newSpeed = 1;
        } else {
          newSpeed = increase ? speed + step : speed - step;
        }
        if (newSpeed > 0) {
          this.options.setPlaybackRate(this.player, newSpeed);
        }
        if (this.speedTextElement) {
          this.speedTextElement.textContent = `${newSpeed}x`;
        }
        setTimeout(() => this.showVideoOverlayElements(), 0);
      }
    }

    changeZoom({ reset = false, increase = true } = {}) {
      if (this.player) {
        const step = 0.05;
        const video = _.get('video', this.player);
        const zoom = this.currentZoom || 1;
        let newZoom = zoom;
        if (reset) {
          newZoom = 1;
        } else {
          newZoom = increase ? newZoom + step : newZoom - step;
        }
        if (newZoom > 0) {
          this.currentZoom = newZoom;
        }
        if (this.zoomTextElement) {
          this.zoomTextElement.textContent = `${newZoom.toFixed(2)}`;
        }
        this.setVideoTransform(video);
        setTimeout(() => this.showVideoOverlayElements(), 0);
      }
    }

    changePan({ reset = false, negative = true, direction = 'vertical' } = {}) {
      if (this.player) {
        const video = _.get('video', this.player);
        const step = 1;
        const pan = this.currentPan || '0 / 0';
        const [panX, panY] = pan.split(' / ');
        let newPanX = Number(panX);
        let newPanY = Number(panY);
        if (reset) {
          newPanX = 0;
          newPanY = 0;
        } else if (direction === 'horizontal') {
          newPanX = negative ? newPanX - step : newPanX + step;
        } else {
          newPanY = negative ? newPanY - step : newPanY + step;
        }
        this.currentPan = `${newPanX.toFixed(0)} / ${newPanY.toFixed(0)}`;
        if (this.panTextElement) {
          this.panTextElement.textContent = this.currentPan;
        }
        this.setVideoTransform(video);
        setTimeout(() => this.showVideoOverlayElements(), 0);
      }
    }

    setVideoTransform(video) {
      const zoom = this.currentZoom || 1;
      const pan = this.currentPan || '0 / 0';
      const [panX, panY] = pan.split(' / ');

      function getGoodClasses(element) {
        return _.getValidElementClasses(element).filter((c) => !c.includes('plyr--'));
      }

      let selector = 'video';
      const videoId = _.getValidElementId(video);
      if (videoId) {
        selector += `#${video.id}`;
      }
      const videoClasses = getGoodClasses(video);
      if (videoClasses.length) {
        selector += `.${videoClasses.join('.')}`;
      }

      let parent = video.parentElement;
      while (parent && parent !== document.body) {
        const parentId = _.getValidElementId(parent);
        const parentClasses = getGoodClasses(parent);
        if (parentId || parentClasses.length) {
          const parentSelector = parent.id ? `#${parentId}` : `.${parentClasses.join('.')}`;
          selector = `${parentSelector} ${selector}`;
        }
        parent = parent.parentElement;
      }

      const css = `
        ${selector} {
          transform: translate(${panX}%, ${panY}%) scale(${zoom}) !important;
        }
      `;

      const style = _.getOrCreateStyle('video_transform');
      style.textContent = css;
    }

    onScrollPlayer(event) {
      if (!this.options.isPaused(this.player)) {
        event.preventDefault();
        this.changeVolume(event.deltaY < 0);
      }
    }

    // eslint-disable-next-line no-unused-vars
    onMouseMovePlayer(event) {
      setTimeout(() => this.showVideoOverlayElements(), 0);
    }

    changeVolume(increase) {
      this.options.changeVolume(this.player, increase);
      setTimeout(() => this.showVideoOverlayElements(), 0);
    }

    showVideoOverlayElements() {
      const container = this.progressContainerElement || this.player;
      const rightOffset = this.options.getRightOffset(this.player);
      const bottomOffset = this.options.getBottomOffset(this.player);
      const topOffset = this.options.getTopOffset(this.player);
      const volumeBar = _.get('.ext_volume_bar', container) || container.appendChild(_.create('.ext_volume_bar'));
      const volumeBarFill =
        _.get('.ext_volume_bar_fill', container) ||
        volumeBar.appendChild(
          _.create('.ext_volume_bar_fill', {
            style: `background:${this.options.color}`,
          })
        );
      const extraDataContainer = this.getOrCreateExtraDataContainer(container);

      if (this.player.hasAttribute('data-ext_overlay_timeout')) {
        const oldTid = this.player.getAttribute('data-ext_overlay_timeout');
        if (oldTid) {
          clearTimeout(+oldTid);
          this.player.removeAttribute('data-ext_overlay_timeout');
        }
      }

      volumeBarFill.style.height = `${this.options.getVolume(this.player)}%`;
      volumeBar.style.visibility = 'visible';
      volumeBar.style.opacity = 1;
      volumeBar.style.right = `${rightOffset}px`;
      volumeBar.style.bottom = `${bottomOffset}px`;

      extraDataContainer.style.visibility = 'visible';
      extraDataContainer.style.opacity = 1;
      extraDataContainer.style.right = `${rightOffset}px`;
      extraDataContainer.style.top = `${topOffset}px`;

      const newTid = setTimeout(() => {
        volumeBar.style.opacity = 0;
        extraDataContainer.style.opacity = 0;
        const onTransitionEnd = () => {
          if (!this.player.hasAttribute('data-ext_overlay_timeout')) {
            volumeBar.style.visibility = 'hidden';
            extraDataContainer.style.visibility = 'hidden';
          }
          volumeBar.removeEventListener('transitionend', onTransitionEnd);
        };
        volumeBar.addEventListener('transitionend', onTransitionEnd);
        this.player.removeAttribute('data-ext_overlay_timeout');
      }, 2000);
      this.player.setAttribute('data-ext_overlay_timeout', newTid);
    }

    static getStepSizeFromKeyEvent(event) {
      if (event.code === 'KeyV') {
        return 600;
      }

      if (!['KeyJ', 'KeyL', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
        return 0;
      }

      const noModsDown = !event.ctrlKey && !event.altKey && !event.shiftKey;
      const isCtrlDown = event.ctrlKey && !event.altKey && !event.shiftKey;
      const isAltDown = !event.ctrlKey && event.altKey && !event.shiftKey;
      const isShiftDown = !event.ctrlKey && !event.altKey && event.shiftKey;

      // eslint-disable-next-line no-nested-ternary
      const step = noModsDown || isShiftDown ? 5 : isCtrlDown ? 10 : isAltDown ? 20 : 0;

      const direction = event.code === 'ArrowRight' || event.code === 'KeyL' ? 1 : -1;
      const multiplier = event.code === 'ArrowLeft' || event.code === 'ArrowRight' ? 1 : 18;

      return step * multiplier * direction;
    }

    getOrCreateExtraDataContainer(container) {
      const extraDataContainer = _.get('.ext_extra_data_container', container) || container.appendChild(_.create('.ext_extra_data_container'));

      if (!this.speedTextElement) {
        this.speedTextElement = extraDataContainer.appendChild(_.create('div', '1x'));
        this.speedTextElement.style.gridRow = '1';
        this.speedTextElement.style.gridColumn = '1';
        this.onScrollSpeed = this.onScrollSpeed.bind(this);
        this.onClickSpeed = this.onClickSpeed.bind(this);
        this.speedTextElement.addEventListener('wheel', this.onScrollSpeed);
        this.speedTextElement.addEventListener('click', this.onClickSpeed);
      }

      const fsElement = this.options.getFullscreenElement(this.player);
      if (!this.fullscreenElement && fsElement) {
        this.fullscreenElement = extraDataContainer.appendChild(_.create('div.ext_toggle_fullscreen', '⛶'));
        this.fullscreenElement.style.gridRow = '1';
        this.fullscreenElement.style.gridColumn = '2';
        this.onClickFullscreen = this.onClickFullscreen.bind(this);
        this.fullscreenElement.addEventListener('click', this.onClickFullscreen);
      }

      if (!this.zoomTextElement) {
        this.zoomTextElement = extraDataContainer.appendChild(_.create('div', '1.00'));
        this.zoomTextElement.style.gridRow = '2';
        this.zoomTextElement.style.gridColumn = '1';
        this.onScrollZoom = this.onScrollZoom.bind(this);
        this.onClickZoom = this.onClickZoom.bind(this);
        this.zoomTextElement.addEventListener('wheel', this.onScrollZoom);
        this.zoomTextElement.addEventListener('click', this.onClickZoom);
      }

      if (!this.panTextElement) {
        this.panTextElement = extraDataContainer.appendChild(_.create('div', '0 / 0'));
        this.panTextElement.style.gridRow = '2';
        this.panTextElement.style.gridColumn = '2';
        this.onScrollPan = this.onScrollPan.bind(this);
        this.onClickPan = this.onClickPan.bind(this);
        this.panTextElement.addEventListener('wheel', this.onScrollPan);
        this.panTextElement.addEventListener('click', this.onClickPan);
      }

      return extraDataContainer;
    }
  };
})();
