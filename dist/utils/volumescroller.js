/* global _:false, moment:false */
const VolumeScroller = (function createVolumeScroller() {
  'use strict';

  _.addCSS(`
    .ext_volume_bar {
      position: absolute;
      background: rgba(255,255,255,0.4);
      z-index: 2147483647;
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
      z-index: 2147483647;
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
      transition: transform 1s linear;
    }
    .ext_disable_transition {
      transition: none !important;
    }
  `);

  const DEFAULT_OPTIONS = {
    logger: undefined,
    color: '#000',
    getVolumeWheelElement(player) {
      return player;
    },
    getRightOffset(player) { // eslint-disable-line no-unused-vars
      return 0;
    },
    getBottomOffset(player) { // eslint-disable-line no-unused-vars
      return 0;
    },
    changeVolume(player, increase) {
      const step = 0.05;
      const video = _.get('video', player);
      const volume = video.muted ? 0 : video.volume;
      const newVolume = Math.max(Math.min(increase ? (volume + step) : (volume - step), 1), 0);
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
      const newSpeed = increase ? (speed + step) : (speed - step);
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
      const step = VolumeScroller.getStepSizeFromKeyEvent(event);
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
  };

  // eslint-disable-next-line no-shadow
  return class VolumeScroller {
    constructor(player, options = {}) {
      this.player = player;
      this.options = Object.assign({}, DEFAULT_OPTIONS, options);
      this.options.logger = this.options.logger ? this.options.logger.push('scroller') : _.logger('scroller');

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
        this.pollVideoTime = this.pollVideoTime.bind(this);
        this.pollVideoTime();
      }

      // add key shortcuts
      this.onKeyDown = this.onKeyDown.bind(this);
      this.onKeyUp = this.onKeyUp.bind(this);
      document.addEventListener('keydown', this.onKeyDown, true);
      document.addEventListener('keyup', this.onKeyUp, true);

      this.options.logger.log('created scroller');
    }

    destroy() {
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
      this.progressFill = null;

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
            if (typeof this.pollTimeoutID === 'number') {
              clearTimeout(this.pollTimeoutID);
              this.pollTimeoutID = null;
            }
            this.pollVideoTime();
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

    pollVideoTime() {
      if (!this.destroyed && this.progressContainerElement && this.player) {
        if (!this.progressFill) {
          const progress = _.get('.ext_progress_bar', this.progressContainerElement)
            || this.progressContainerElement.appendChild(_.create('.ext_progress_bar'));
          this.progressFill = _.get('.ext_progress_bar_fill', progress)
            || progress.appendChild(_.create('.ext_progress_bar_fill', { style: `background:${this.options.color}` }));
        }

        const duration = this.options.getVideoDuration(this.player);
        const currentTime = this.options.getCurrentTime(this.player);
        if (duration > 0) {
          const percent = (currentTime + 1) / duration;
          this.progressFill.style.transform = `scaleX(${percent})`;
          const hidden = document.hidden || Math.abs(currentTime - this.lastPollCurrentTime) > 2;
          if (this.wasDocumentHidden !== hidden) {
            this.wasDocumentHidden = hidden;
            this.progressFill.classList.toggle('ext_disable_transition', hidden);
          }
        }

        if (this.speedTextElement) {
          const speed = this.options.getPlaybackRate(this.player);
          this.speedTextElement.textContent = `${speed}x`;

          if (duration > 0) {
            const scaledTimeRemaining = (duration - currentTime) / speed;
            const m = moment.duration(scaledTimeRemaining, 'seconds');
            this.speedTextElement.title = moment.utc(m.asMilliseconds()).format('-HH:mm:ss');
          }
        }

        this.lastPollCurrentTime = currentTime;
        this.pollTimeoutID = setTimeout(this.pollVideoTime, 1000);
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
      const volumeBar = _.get('.ext_volume_bar', this.player)
        || this.player.appendChild(_.create('.ext_volume_bar'));
      const volumeBarFill = _.get('.ext_volume_bar_fill', this.player)
        || volumeBar.appendChild(_.create('.ext_volume_bar_fill', { style: `background:${this.options.color}` }));

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
      const step = (noModsDown || isShiftDown) ? 5 : isCtrlDown ? 10 : isAltDown ? 20 : 0;

      const direction = (event.code === 'ArrowRight' || event.code === 'KeyL') ? 1 : -1;
      const multiplier = (event.code === 'ArrowLeft' || event.code === 'ArrowRight') ? 1 : 18;

      return step * multiplier * direction;
    }
  };
}());
