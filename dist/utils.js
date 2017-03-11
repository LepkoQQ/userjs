/* global GM_xmlhttpRequest:false, GM_getValue:false, GM_setValue:false */
const _ = (function utils() {
  'use strict';

  return {
    // DOM
    get(selector, parent) {
      if (arguments.length > 1) {
        return parent && parent.querySelector && parent.querySelector(selector);
      }
      return document.querySelector(selector);
    },
    all(selector, parent) {
      if (arguments.length > 1) {
        return parent && parent.querySelectorAll && parent.querySelectorAll(selector);
      }
      return document.querySelectorAll(selector);
    },
    getStyle(element, rule) {
      const val = getComputedStyle(element)[rule];
      if (val && val.endsWith('px')) {
        return parseFloat(val);
      }
      return val;
    },
    getSize(element) {
      if (element.getBoundingClientRect) {
        const rect = element.getBoundingClientRect();
        return {
          width: rect.width,
          height: rect.height,
        };
      }
      return {
        width: element.innerWidth,
        height: element.innerHeight,
      };
    },
    observeAddedElements(parent, onElementAdded) {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              onElementAdded(node);
            }
          });
        });
      });
      observer.observe(parent, {
        childList: true,
        subtree: true,
      });
      return observer;
    },
    // TODO: check this out: https://stackoverflow.com/questions/17888039/javascript-efficient-parsing-of-css-selector
    // TODO: dont name parameters as blankIn
    create(tagIn, attrs) {
      let tag = 'div';
      let id;
      const classes = new Set();
      if (tagIn.includes('#') || tagIn.includes('.')) {
        const parts = _.replaceAll(_.replaceAll(tagIn, '.', '|.'), '#', '|#').split('|');
        parts.forEach((part) => {
          if (part[0] === '#') {
            id = part.substr(1);
          } else if (part[0] === '.') {
            classes.add(part.substr(1));
          } else if (part.length) {
            tag = part;
          }
        });
      } else {
        tag = tagIn;
      }
      const element = document.createElement(tag);
      if (id) {
        element.id = id;
      }
      if (classes.size) {
        element.className = Array.from(classes).join(' ');
      }
      if (attrs) {
        if (typeof attrs === 'string') {
          element.textContent = attrs;
        } else {
          Object.keys(attrs).forEach((key) => {
            switch (key) {
              case 'events':
                Object.keys(attrs[key]).forEach((event) => {
                  element.addEventListener(event, attrs[key][event]);
                });
                break;
              case 'captureEvents':
                Object.keys(attrs[key]).forEach((event) => {
                  element.addEventListener(event, attrs[key][event], true);
                });
                break;
              case 'class':
                element.className = attrs[key];
                break;
              case 'style':
                element.style.cssText = attrs[key];
                break;
              default:
                element[key] = attrs[key];
            }
          });
        }
      }
      return element;
    },
    addCSS(css) {
      const style = _.get('style#ext_css') || document.head.parentNode.insertBefore(_.create('style#ext_css'), document.head.nextSibling);
      style.insertAdjacentHTML('beforeend', css);
    },
    // UTILS
    toColor(string) {
      let hash = 0;
      for (let i = 0; i < string.length; i += 1) {
        hash = string.charCodeAt(i) + ((hash << 5) - hash); // eslint-disable-line no-bitwise
      }
      const color = Math.floor(Math.abs(((Math.sin(hash) * 10000) % 1) * 0xFFFFFF)).toString(16);
      return `#${color.padStart(6, '0')}`;
    },
    replaceAll(str, find, replace) {
      return str.split(find).join(replace);
    },
    waitFor(predicate, limit = 20, timeout = 500, count = 0) {
      function retry(resolve, reject, counter) {
        const result = predicate();
        if (result) {
          resolve(result);
        } else if (limit > 0 && counter >= limit) {
          console.error('-- _.waitFor TIMEOUT REJECTED --', 'predicate:', predicate.toString()); // eslint-disable-line no-console
          reject(new Error('timeout'));
        } else {
          setTimeout(retry, timeout, resolve, reject, counter + 1);
        }
      }
      return new Promise((resolve, reject) => {
        retry(resolve, reject, count);
      });
    },
    isInputActive() {
      return document.activeElement && (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) || document.activeElement.isContentEditable);
    },
    getKey(object, path, defaultValue) {
      const pathArray = typeof path === 'string' ? [path] : path;
      let value = object;
      const result = pathArray.every((key) => {
        if (value[key] != null) {
          value = value[key];
          return true;
        }
        return false;
      });
      return result ? value : defaultValue;
    },
    debounce(func, wait) {
      const delay = wait || 100;
      let timeout;
      return function debounced(...args) {
        const context = this;
        const later = function later() {
          timeout = null;
          func.apply(context, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, delay);
      };
    },
    safeWindowOpen(url) {
      const newWindow = window.open(null, '_blank');
      newWindow.opener = null;
      newWindow.location = url;
    },
    toURI(url, params) {
      const str = url + (url.includes('?') ? '&' : '?');
      return str + Object.keys(params).map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key]).replace(/%20/g, '+')}`).join('&');
    },
    escapeHTML(string) {
      const entityMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '/': '&#x2F;',
      };
      return String(string).replace(/[&<>"'/]/g, s => entityMap[s]);
    },
    removeHTMLExternals(html) {
      let resp = html;
      resp = resp.replace(/<script(?:.|\n)*?\/script>/gi, '');
      resp = resp.replace(/<iframe(?:.|\n)*?\/iframe>/gi, '');
      resp = resp.replace(/<link(?:.|\n)*?>/gi, '');
      resp = resp.replace(/<img(?:.|\n)*?>/gi, '');
      return resp;
    },
    // STORAGE
    putJSON(key, data) {
      GM_setValue(key, JSON.stringify(data)); // eslint-disable-line new-cap
    },
    getJSON(key, _default) {
      const data = GM_getValue(key); // eslint-disable-line new-cap
      if (data !== undefined) {
        return JSON.parse(data);
      }
      if (_default !== undefined) {
        _.putJSON(key, _default);
      }
      return _default;
    },
    // LOGGER
    logger(prefixes) {
      const prefixArray = typeof prefixes === 'string' ? [prefixes] : prefixes;
      const prefixString = prefixArray ? prefixArray.map(prefix => `%c ${prefix} %c`).join(' ') : null;
      const prefixColors = [];
      if (prefixString) {
        prefixArray.forEach((prefix) => {
          prefixColors.push(`background:${_.toColor(prefix)};color:#000`);
          prefixColors.push('background:transparent');
        });
      }

      const obj = {};
      ['debug', 'info', 'log', 'warn', 'error', 'trace'].forEach((funcName) => {
        obj[funcName] = function log(...args) {
          if (prefixString) {
            args.unshift(...prefixColors);
            args.unshift(prefixString);
          }
          console[funcName](...args); // eslint-disable-line no-console
        };
      });
      obj.push = function push(newPrefix) {
        const newPrefixes = prefixArray ? prefixArray.slice() : [];
        newPrefixes.push(newPrefix);
        return _.logger(newPrefixes);
      };
      return obj;
    },
    ajax(url, attrs, logger) {
      const ajaxLogger = logger ? logger.push('ajax') : _.logger('ajax');
      return {
        send() {
          return new Promise((resolve, reject) => {
            const ajaxObj = {
              method: 'GET',
              timeout: 15000,
              url,
              onload(rsp) {
                if (rsp.status === 200) {
                  ajaxLogger.debug('done', url);
                  resolve(rsp.responseText);
                } else {
                  const err = Error(`${rsp.status} ${rsp.statusText}`);
                  ajaxLogger.warn('failed', url, err, rsp);
                  reject(err);
                }
              },
              onerror(rsp) {
                const err = Error('Network Error');
                ajaxLogger.warn('failed', url, err, rsp);
                reject(err);
              },
              ontimeout(rsp) {
                const err = Error('Timed Out');
                ajaxLogger.warn('failed', url, err, rsp);
                reject(err);
              },
            };
            if (attrs) {
              Object.assign(ajaxObj, attrs);
            }
            ajaxLogger.debug('started', url);
            GM_xmlhttpRequest(ajaxObj); // eslint-disable-line new-cap
          });
        },
      };
    },
    cachedAjax(storeKey, url, {
      attrs = {},
      parse = r => r,
      isStale = () => false,
      storeFormat = r => r,
      cacheLength = 3600000,
      logger,
    } = {}) {
      const ajaxLogger = logger ? logger.push(`cached [${storeKey}]`) : _.logger(`cached [${storeKey}]`);
      return new Promise((resolve, reject) => {
        ajaxLogger.debug('started');
        const stored = _.getJSON(storeKey);
        if (!stored || !stored.data || !stored.cacheTime
          || ((Date.now() - stored.cacheTime) > cacheLength) || isStale(stored)) {
          _.ajax(url, attrs, ajaxLogger).send()
            .then((response) => {
              const parsed = parse(response);
              if (parsed) {
                const toStore = {
                  data: parsed,
                  cacheTime: Date.now(),
                };
                _.putJSON(storeKey, storeFormat(toStore));
                ajaxLogger.debug('done - new data');
                resolve(parsed);
              } else {
                const error = Error('No Data Parsed');
                if (stored && stored.data) {
                  ajaxLogger.debug('error - cached data', error);
                  resolve(stored.data);
                } else {
                  ajaxLogger.debug('error', error);
                  reject(error);
                }
              }
            })
            .catch((error) => {
              if (stored && stored.data) {
                ajaxLogger.debug('error - cached data', error);
                resolve(stored.data);
              } else {
                ajaxLogger.debug('error', error);
                reject(error);
              }
            });
        } else {
          ajaxLogger.debug('done - cached data');
          resolve(stored.data);
        }
      });
    },
  };
}());
