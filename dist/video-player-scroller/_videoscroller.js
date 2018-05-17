/* global _:false */
const VideoScroller = (function createVideoScroller() {
  'use strict';

  _.addCSS(`
    .ext_volume_bar {
      position: absolute;
      background: rgba(255,255,255,0.4);
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
      background: rgba(255,255,255,0.4);
      opacity: 1;
      transition: opacity .1s cubic-bezier(0.4,0,1,1);
    }
    .ext_progress_bar_fill {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 3px;
      transform: scaleX(0);
      transform-origin: left;
    }
  `);

  const DEFAULT_OPTIONS = {
    logger: undefined,
    color: '#000',
    getVolumeWheelElement(player) {
      return player;
    },
    // eslint-disable-next-line no-unused-vars
    getRightOffset(player) {
      return 0;
    },
    // eslint-disable-next-line no-unused-vars
    getBottomOffset(player) {
      return 0;
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
    getSpeedContainerElement(player) {
      return player;
    },
    addSpeedTextElement(container) {
      return container.insertBefore(_.create('button', '1x'), container.firstElementChild);
    },
    getPlaybackRate(player) {
      const video = _.get('video', player);
      return video.playbackRate;
    },
    changeSpeed(player, increase) {
      const step = 0.25;
      const video = _.get('video', player);
      const speed = video.playbackRate;
      const newSpeed = increase ? speed + step : speed - step;
      if (newSpeed > 0) {
        video.playbackRate = newSpeed;
      }
      return video.playbackRate;
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
    },
    removeTimeUpdateEventListener(player, func) {
      const video = _.get('video', player);
      video.removeEventListener('timeupdate', func);
    },
  };

  // eslint-disable-next-line no-shadow
  return class VideoScroller {
    constructor(player, options = {}) {
      this.player = player;
      this.options = Object.assign({}, DEFAULT_OPTIONS, options);
      this.options.logger = this.options.logger
        ? this.options.logger.push('scroller')
        : _.logger('scroller');

      // scroll player area to control volume
      this.volumeWheelElement = this.options.getVolumeWheelElement(this.player);
      if (this.volumeWheelElement) {
        this.onScrollPlayer = this.onScrollPlayer.bind(this);
        this.volumeWheelElement.addEventListener('wheel', this.onScrollPlayer);
      }

      // scroll button/label to control speed
      const speedContainerElement = this.options.getSpeedContainerElement(this.player);
      if (speedContainerElement) {
        this.speedTextElement = this.options.addSpeedTextElement(speedContainerElement);
        this.onScrollSpeed = this.onScrollSpeed.bind(this);
        this.speedTextElement.addEventListener('wheel', this.onScrollSpeed);
      }

      // show player progress bar when controls are hidden
      this.progressContainerElement = this.options.getProgressContainerElement(this.player);
      if (this.progressContainerElement) {
        const progress = this.progressContainerElement.appendChild(_.create('.ext_progress_bar'));
        this.progressFillElement = progress.appendChild(_.create('.ext_progress_bar_fill', { style: `background:${this.options.color}` }));
        this.updateProgress = this.updateProgress.bind(this);
        this.options.addTimeUpdateEventListener(this.player, this.updateProgress);
      }

      // add key shortcuts
      this.onKeyDown = this.onKeyDown.bind(this);
      this.onKeyUp = this.onKeyUp.bind(this);
      document.addEventListener('keydown', this.onKeyDown, true);
      document.addEventListener('keyup', this.onKeyUp, true);

      this.options.logger.log('created scroller');
    }

    destroy() {
      this.options.removeTimeUpdateEventListener(this.player, this.updateProgress);
      this.player = null;

      if (this.volumeWheelElement) {
        this.volumeWheelElement.removeEventListener('wheel', this.onScrollPlayer);
        this.volumeWheelElement = null;
      }

      if (this.speedTextElement) {
        this.speedTextElement.removeEventListener('wheel', this.onScrollSpeed);
        this.speedTextElement.remove();
        this.speedTextElement = null;
      }

      this.progressContainerElement = null;
      this.progressFillElement = null;

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
        if (this.progressContainerElement && this.progressFillElement) {
          const duration = this.options.getVideoDuration(this.player);
          const currentTime = this.options.getCurrentTime(this.player);
          if (duration > 0) {
            const percent = (currentTime + 1) / duration;
            this.progressFillElement.style.transform = `scaleX(${percent})`;
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
      this.changeSpeed(event.deltaY < 0);
    }

    changeSpeed(increase) {
      if (this.player && this.speedTextElement) {
        const newSpeed = this.options.changeSpeed(this.player, increase);
        this.speedTextElement.textContent = `${newSpeed}x`;
      }
    }

    onScrollPlayer(event) {
      if (!this.options.isPaused(this.player)) {
        event.preventDefault();
        this.changeVolume(event.deltaY < 0);
      }
    }

    changeVolume(increase) {
      const rightOffset = this.options.getRightOffset(this.player);
      const bottomOffset = this.options.getBottomOffset(this.player);
      const volumeBar =
        _.get('.ext_volume_bar', this.player) ||
        this.player.appendChild(_.create('.ext_volume_bar'));
      const volumeBarFill =
        _.get('.ext_volume_bar_fill', this.player) ||
        volumeBar.appendChild(_.create('.ext_volume_bar_fill', {
          style: `background:${this.options.color}`,
        }));

      if (this.player.hasAttribute('data-ext_volume_timeout')) {
        const oldTid = this.player.getAttribute('data-ext_volume_timeout');
        if (oldTid) {
          clearTimeout(+oldTid);
          this.player.removeAttribute('data-ext_volume_timeout');
        }
      }

      const newVolume = this.options.changeVolume(this.player, increase);

      volumeBarFill.style.height = `${newVolume}%`;
      volumeBar.style.visibility = 'visible';
      volumeBar.style.opacity = 1;
      volumeBar.style.right = `${rightOffset}px`;
      volumeBar.style.bottom = `${bottomOffset}px`;
      const newTid = setTimeout(() => {
        volumeBar.style.opacity = 0;
        const onTransitionEnd = () => {
          if (!this.player.hasAttribute('data-ext_volume_timeout')) {
            volumeBar.style.visibility = 'hidden';
          }
          volumeBar.removeEventListener('transitionend', onTransitionEnd);
        };
        volumeBar.addEventListener('transitionend', onTransitionEnd);
        this.player.removeAttribute('data-ext_volume_timeout');
      }, 2000);
      this.player.setAttribute('data-ext_volume_timeout', newTid);
    }

    static getStepSizeFromKeyEvent(event) {
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
  };
}());
