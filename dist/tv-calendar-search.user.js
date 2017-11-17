// ==UserScript==
// @name        TV Calendar Search
// @namespace   http://lepko.net/
// @version     1.0.4
// @run-at      document-start
// @match       *://*.pogdesign.co.uk/cat/*
// @require     https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.17.1/moment.min.js
// @require     https://cdnjs.cloudflare.com/ajax/libs/moment-timezone/0.5.11/moment-timezone-with-data-2010-2020.min.js
// @require     https://raw.githubusercontent.com/LepkoQQ/userjs/02a2d6a8d5d9dc06e8c2792c49f652164be49eff/dist/utils.js
// @grant       GM_xmlhttpRequest
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       unsafeWindow
// @nocompat    Chrome
// ==/UserScript==

/* global _:false, moment:false */

/* async menu */
const AsyncMenu = (function asyncMenu() {
  'use strict';

  _.addCSS(`
    #ext_asyncmenu,
    #ext_asyncmenu * {
      box-sizing: border-box;
      cursor: default;
      margin: 0;
      padding: 0;
      user-select: none;
    }
    #ext_asyncmenu {
      position: fixed;
      top: 328px;
      display: inline-block;
      border: 1px solid #bababa;
      background-color: #fff;
      box-shadow: 2px 2px 2px 0px rgba(0, 0, 0, 0.5);
      white-space: nowrap;
      z-index: 2147483647;
    }
    #ext_asyncmenu table {
      margin: 2px -1px;
      border: 0;
      border-spacing: 0;
      border-collapse: collapse;
      font-family: "Segoe UI", sans-serif;
    }
    #ext_asyncmenu tr:not(.ext_separator):not(.ext_disabled):hover {
      background-color: #4281f4;
      color: #fff;
    }
    #ext_asyncmenu tr:not(.ext_separator):not(.ext_disabled):hover td {
      color: inherit;
    }
    #ext_asyncmenu td {
      padding-left: 26px;
      font-size: 12px;
      line-height: 2;
      text-align: left;
      color: #000;
    }
    #ext_asyncmenu td:nth-child(2) {
      padding-right: 26px;
      padding-left: 17px;
      text-align: right;
      color: #999;
    }
    #ext_asyncmenu tr.ext_disabled td {
      color: #999;
    }
    #ext_asyncmenu tr.ext_separator td {
      padding: 0;
    }
    #ext_asyncmenu tr.ext_separator td hr {
      height: 1px;
      border: 0;
      background-color: #e9e9e9;
      margin: 5px 1px;
    }
    @keyframes ext_spinner {
      0%   { transform: rotate(0deg);   }
      100% { transform: rotate(360deg); }
    }
    .ext_spinner {
      width: 16px;
      height: 16px;
      border: 4px solid #4281f4;
      border-right-color: transparent;
      border-radius: 50% !important;
      animation: ext_spinner 1s infinite linear;
    }
  `);

  function createTable(values) {
    const table = _.create('table');
    values.forEach((entry) => {
      if (entry.data === 'spinner') {
        table.appendChild(_.create('tr.ext_disabled', {
          innerHTML: '<td><div class="ext_spinner"></div></td><td>Loading...</td>',
        }));
      } else if (entry.data === 'separator') {
        table.appendChild(_.create('tr.ext_separator', {
          innerHTML: '<td colspan="2"><hr></td>',
        }));
      } else {
        const row = _.create('tr', {
          innerHTML: `<td>${entry.left || ''}</td><td>${entry.right || ''}</td>`,
        });
        if (entry.data === 'disabled') {
          row.className = 'ext_disabled';
        } else if (entry.click) {
          const onClickFunc = typeof entry.click === 'function' ? entry.click : () => {
            const url = entry.click;
            if (url.startsWith('http:') || url.startsWith('https:')) {
              _.safeWindowOpen(url);
            } else {
              window.location = url;
            }
          };
          row.addEventListener('click', onClickFunc);
        }
        table.appendChild(row);
      }
    });
    return table;
  }

  return class Menu {
    constructor(event, options = {}) {
      this.options = options;
      this.options.logger = this.options.logger ? this.options.logger.push('menu') : _.logger('menu');
      this.options.values = Promise.resolve(this.options.values);

      this.pos = {
        x: event.clientX,
        y: event.clientY,
      };

      this.closeMenu = this.closeMenu.bind(this);
      document.addEventListener('mousedown', this.closeMenu, true);
      document.addEventListener('scroll', this.closeMenu);

      this.openMenu();

      this.options.logger.log('created menu');
    }

    destroy() {
      document.removeEventListener('mousedown', this.closeMenu, true);
      document.removeEventListener('scroll', this.closeMenu);

      this.menuElement.remove();
      this.menuElement = null;

      this.destroyed = true;
      this.options.logger.log('destroyed menu');
    }

    closeMenu(event) {
      if (this.menuElement && !this.menuElement.contains(event.target)) {
        event.preventDefault();
        event.stopPropagation();
        this.destroy();
      }
    }

    openMenu() {
      this.menuElement = document.body.appendChild(_.create('#ext_asyncmenu'));

      this.setContent([{ data: 'spinner' }]);

      this.options.values
        .then((values) => {
          this.setContent(values);
        })
        .catch((error) => {
          this.setContent([{
            data: 'disabled',
            left: 'Error',
            right: error,
          }]);
          this.options.logger.error(error);
        });
    }

    setContent(values) {
      const table = createTable(values);
      this.menuElement.innerHTML = '';
      this.menuElement.appendChild(table);
      this.reposition();
    }

    reposition() {
      let x = this.pos.x;
      let y = this.pos.y;
      const windowSize = _.getSize(window);
      const menuSize = _.getSize(this.menuElement);
      if (windowSize.width - x < menuSize.width) {
        x = windowSize.width - menuSize.width;
      }
      if (windowSize.height - y < menuSize.height) {
        y -= menuSize.height;
      }
      this.menuElement.style.top = `${y}px`;
      this.menuElement.style.left = `${x}px`;
    }
  };
}());

(function main(window) {
  'use strict';

  const LOGGER = _.logger('tv calendar search');
  LOGGER.log('starting...');

  const ICON = `
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="13">
      <g stroke-width="2" fill="none">
        <path d="M11.29 11.71l-4-4" />
        <circle cx="5" cy="5" r="4" />
      </g>
    </svg>
  `;

  _.addCSS(`
    * {
      border-radius: 0 !important;
    }
    #cal .ep {
      position: relative;
    }
    #cal .ep .ext_searchicon {
      display: flex;
      align-items: center;
      justify-content: center;
      position: absolute;
      top: 0;
      right: 0;
      width: 20px;
      height: 20px;
      margin: 3px;
      padding: 0;
      border: 0;
      background: rgba(255, 255, 255, 0.2);
      opacity: 0.5;
      cursor: pointer;
    }
    #cal .ep .ext_searchicon svg {
      stroke: #fff;
    }
    #cal .ep .ext_searchicon:hover {
      opacity: 0.9;
    }
    #cal .ep p a:nth-of-type(2) {
      text-transform: uppercase;
    }
    #cal.ext_hidewatched .ep.infochecked {
      display: none;
    }
    #ext_buttoncontainer {
      text-align: center;
      padding: 5px;
    }
    button.ext_togglewatched {
      border: 0;
      background: #444;
      color: #fff;
      padding: 4px 7px;
      font-size: 11px;
      opacity: 0.5;
      cursor: pointer;
    }
    button.ext_togglewatched:hover {
      opacity: 0.9;
    }
    #tvcalendar > .newpbutts,
    #tvcalendar > #data > footer,
    #tvcalendar > #data > .replace {
      display: none;
    }
  `);

  const API = (function api() {
    let API_OPTIONS = _.getJSON('api-options');

    if (!API_OPTIONS) {
      const data = window.prompt('API JSON data:');
      if (data) {
        API_OPTIONS = JSON.parse(data);
        _.putJSON('api-options', API_OPTIONS);
      }
    }

    function getToken() {
      if (API_OPTIONS.token) {
        if (API_OPTIONS.token.token) {
          if (Date.now() < API_OPTIONS.token.time + API_OPTIONS.token.maxtime) {
            return Promise.resolve(API_OPTIONS.token.token);
          }
        } else {
          const url = _.toURI(API_OPTIONS.endpoint, API_OPTIONS.token.params);
          return _.ajax(url, { logger: LOGGER }).send()
            .then(responseText => JSON.parse(responseText))
            .then((json) => {
              API_OPTIONS.token.token = json[API_OPTIONS.token.token_key];
              API_OPTIONS.token.time = Date.now();
              return API_OPTIONS.token.token;
            });
        }
      }
      return Promise.resolve();
    }

    function getApiRequestUrl(query) {
      return Promise.resolve()
        .then(() => getToken())
        .then((token) => {
          const queryParams = Object.assign({}, API_OPTIONS.search.params);
          queryParams[API_OPTIONS.search.search_key] = query;
          if (token) {
            queryParams[API_OPTIONS.token.token_key] = token;
          }
          return _.toURI(API_OPTIONS.endpoint, queryParams);
        });
    }

    function fetchJSON(query) {
      return Promise.resolve()
        .then(() => getApiRequestUrl(query))
        .then(url => _.ajax(url, { logger: LOGGER }).send())
        .then(response => JSON.parse(response));
    }

    function getResults(query, mustContain) {
      return fetchJSON(query)
        .then((json) => {
          let results = json[API_OPTIONS.results.results_key];
          const numResults = results ? results.length : 0;
          LOGGER.log(`${query} returned ${numResults} results!`);

          if (!numResults) {
            return [{
              left: `<b>No results: ${query}</b>`,
            }];
          }

          if (mustContain) {
            const regexString = mustContain.split(' ').join('(?:[ .-])');
            const regex = new RegExp(`\\b${regexString}\\b`, 'i');
            results = results.filter(result => (
              result[API_OPTIONS.results.name_key].search(regex) !== -1
            ));
            LOGGER.log(`> ${results.length} results contain "${mustContain}"!`);
          }

          if (!results.length) {
            return [{
              left: `<b>No results: ${query}</b>`,
            }];
          }

          results.forEach((result) => {
            result.moment = moment(
              result[API_OPTIONS.results.date_key],
              API_OPTIONS.results.date_format);
          });

          results.sort((a, b) => b[API_OPTIONS.results.sort_key] - a[API_OPTIONS.results.sort_key]);

          const values = [{
            left: `<b>${query}</b>`,
          },
          {
            data: 'separator',
          }];

          results.forEach((result) => {
            values.push({
              left: result[API_OPTIONS.results.name_key],
              right: `${result[API_OPTIONS.results.sort_key]}/${result[API_OPTIONS.results.sort_key2]} @ ${result.moment.format('YYYY-MM-DD HH:mm')}`,
              click: result[API_OPTIONS.results.link_key],
            });
          });

          return values;
        })
        .catch(error => [{
          left: `<b>${error.name}</b>`,
          right: error.message,
        }]);
    }

    return {
      getResults,
    };
  }());

  function createMenu(event, options = {}) {
    return new AsyncMenu(event, options);
  }

  function getFormattedDate(id) {
    const split = id.split('_');
    const isoDate = `${split[3]}-${split[2].padStart(2, '0')}-${split[1].padStart(2, '0')}`;
    const m = moment(isoDate).tz('America/Los_Angeles');
    return m.format('YYYY MM DD');
  }

  function getShowData(showName) {
    return _.getJSON(`showdata-${showName}`, {
      searchName: showName,
      useDate: false,
    });
  }

  function setShowData(showName, storedData) {
    _.putJSON(`showdata-${showName}`, storedData);
  }

  function getQueryData(element) {
    const links = _.all('a', element);

    // remove text in parenthesis eg. "The Voice (US)" -> "The Voice"
    const showName = links[0].textContent.replace(/\(.+\)/g, '').trim();
    const storedData = getShowData(showName);

    let epString;
    if (storedData.useDate) {
      epString = getFormattedDate(element.parentElement.parentElement.id);
    } else {
      epString = links[1].textContent.toUpperCase().trim();
    }

    return {
      mustContain: epString,
      query: `${storedData.searchName} ${epString}`,
      values: [{
        data: 'separator',
      }, {
        left: 'Change search name...',
        click: () => {
          const newName = window.prompt('Search name:', storedData.searchName);
          if (newName) {
            storedData.searchName = newName;
            setShowData(showName, storedData);
          }
        },
      }, {
        left: `Using ${storedData.useDate ? 'date' : 'episode number'} (click to change)`,
        right: epString,
        click: () => {
          storedData.useDate = !storedData.useDate;
          setShowData(showName, storedData);
        },
      }],
    };
  }

  function addLink(element) {
    element.appendChild(_.create('button.ext_searchicon', {
      innerHTML: ICON,
      events: {
        click(event) {
          event.preventDefault();
          const queryData = getQueryData(event.currentTarget.parentElement);
          const values = Promise.resolve()
            .then(() => API.getResults(queryData.query, queryData.mustContain))
            .then(results => [...results, ...queryData.values]);
          createMenu(event, { logger: LOGGER, values });
        },
      },
    }));
  }

  function onToggleButtonClicked() {
    _.get('#cal').classList.toggle('ext_hidewatched');
  }

  function addToggleWatchedButton(cal) {
    const replaceElem = cal.parentElement.insertBefore(_.create('#ext_buttoncontainer'), cal);
    const button = _.create('button.ext_togglewatched', {
      textContent: 'Toggle Watched',
      events: {
        click: onToggleButtonClicked,
      },
    });
    replaceElem.innerHTML = '';
    replaceElem.appendChild(button);
  }

  document.addEventListener('DOMContentLoaded', () => {
    LOGGER.log('ready', window.location.href);

    const cal = _.get('#cal');
    if (cal) {
      LOGGER.log('calendar detected');
      _.all('.ep > span', cal).forEach(addLink);
      addToggleWatchedButton(cal);
      onToggleButtonClicked();
      const today = _.get('.today', cal);
      if (today) {
        today.classList.add('day');
      }
    }
  });
}(this.unsafeWindow || window));
