// ==UserScript==
// @name        New Tab Info Boxes
// @namespace   http://lepko.net/
// @version     2.0.1
// @run-at      document-start
// @match       *://www.google.com/_/chrome/newtab*
// @match       *://www.google.com/_/open/404
// @match       *://lepko.net/twitchauth
// @require     https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.17.1/moment.min.js
// @require     https://cdnjs.cloudflare.com/ajax/libs/moment-timezone/0.5.11/moment-timezone-with-data-2010-2020.min.js
// @require     https://raw.githubusercontent.com/LepkoQQ/userjs/02a2d6a8d5d9dc06e8c2792c49f652164be49eff/dist/utils.js
// @grant       GM_xmlhttpRequest
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_deleteValue
// @grant       GM_listValues
// @grant       unsafeWindow
// @nocompat    Chrome
// @connect     api.twitch.tv
// @connect     chromestatus.com
// @connect     itmejp.com
// @connect     adam-koebel.com
// ==/UserScript==

/* global _:false, moment:false */

(function main(window) {
  'use strict';

  const LOGGER = _.logger('new tab info boxes');
  LOGGER.log('starting...');

  _.addCSS(`
    html,
    iframe {
      background: #1e1e1e !important;
    }
    body {
      display: none !important;
    }
  `);

  if (window.location.pathname.startsWith('/_/chrome/newtab')) {
    _.addCSS(`
      #ext_404container,
      #ext_404container iframe {
        display: block;
        position: absolute;
        top: 0;
        right: 0;
        width: 100%;
        height: 100%;
        border: 0;
        z-index: 2147483647;
      }
      .fadein {
        opacity: 0;
        animation: fadein 500ms 500ms forwards;
      }
      @keyframes fadein {
        from { opacity: 0; }
        to   { opacity: 1; }
      }
    `);

    document.head.parentNode.insertBefore(_.create('#ext_404container', {
      innerHTML: '<iframe class="fadein" src="//www.google.com/_/open/404"></iframe>',
    }), document.head.nextSibling);
  } else {
    _.addCSS(`
      html {
        padding: 0;
        box-sizing: border-box;
      }
      * {
        margin: 0;
        padding: 0;
        cursor: default;
        user-select: none;
      }
      *, *:before, *:after {
        box-sizing: inherit;
      }
      a,
      a:hover,
      a:visited,
      a:active {
        cursor: pointer;
        color: #3F51B5;
        text-decoration: none;
        font-weight: 700;
      }
      a:hover {
        text-decoration: underline;
      }
      #ext_container {
        display: block;
        width: 100%;
        font-family: "Source Sans Pro", sans-serif;
        color: #eee;
        line-height: 1;
      }
      #ext_popbox_container {
        text-align: center;
      }
      .ext_popbox {
        display: inline-block;
        vertical-align: top;
        width: 550px;
        margin: 20px;
        padding: 0 10px 10px 10px;
        background: #fff;
        color: #000;
        transition: opacity 0.5s;
        opacity: 0;
      }
      .ext_popbox .title {
        padding: 10px 0;
        font-size: 14px;
        font-weight: 700;
        text-align: center;
      }
      .ext_popbox table {
        width: 100%;
        table-layout: fixed;
        font-size: 12px;
        border-collapse: collapse;
      }
      .ext_popbox table tr:hover {
        background: #eee;
      }
      .ext_popbox table tr td {
        border: 1px solid #ccc;
        padding: 5px 7px;
        color: #000;
        text-align: left;
        vertical-align: top;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }
      .ext_popbox table tr td:first-of-type {
        font-weight: 600;
      }
      .ext_popbox table tr td:only-of-type {
        text-align: center;
      }
      .ext_popbox table tr:hover td {
        white-space: normal;
      }
    `);

    const CONTAINER = document.head.parentNode.insertBefore(_.create('div#ext_container', {
      innerHTML: '<div id="ext_popbox_container"></div>',
    }), document.head.nextSibling);
    const POPBOX_CONTAINER = _.get('#ext_popbox_container', CONTAINER);

    // CLOCK
    _.addCSS(`
      #ext_clock {
        width: 100%;
        margin: 20px auto;
        text-align: center;
        font-weight: 300;
        font-size: 2em;
      }
      #ext_clock #h,
      #ext_clock #m {
        font-size: 6em;
      }
      #ext_clock #m::before {
        content: ':';
      }
      #ext_clock #sap {
        font-size: 6em;
        display: inline-block;
        position: relative;
        opacity: 0.75;
      }
      #ext_clock #s,
      #ext_clock #ap {
        font-size: 0.4em;
        position: absolute;
        left: 0;
      }
      #ext_clock #s {
        top: 0.35em;
      }
      #ext_clock #ap {
        bottom: 0.25em;
        visibility: hidden;
      }
      #ext_clock #date {
        font-weight: 400;
        opacity: 0.75;
      }
    `);

    const CLOCK = CONTAINER.insertBefore(_.create('#ext_clock', {
      innerHTML: '<div id="time"><span id="h"></span><span id="m"></span><div id="sap">&nbsp;<span id="s"></span><span id="ap"></span></div></div><div id="date"></div>',
    }), POPBOX_CONTAINER);

    const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const elHours = _.get('#h', CLOCK);
    const elMinutes = _.get('#m', CLOCK);
    const elSeconds = _.get('#s', CLOCK);
    const elAmPm = _.get('#ap', CLOCK);
    const elDate = _.get('#date', CLOCK);

    (function setTime() {
      const date = new Date();
      const hour = date.getHours();
      elAmPm.textContent = hour < 12 ? 'am' : 'pm';
      elHours.textContent = hour.toString().padStart(2, '0');
      elMinutes.textContent = date.getMinutes().toString().padStart(2, '0');
      elSeconds.textContent = date.getSeconds().toString().padStart(2, '0');
      elDate.textContent = `${DAYS[date.getDay()]}, ${date.getDate().toString().padStart(2, '0')} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
      setTimeout(setTime, 1000);
    }());

    // SCHEDULES
    _.addCSS(`
      #ext_schedules td:nth-of-type(2) {
        text-align: right;
        width: 190px;
      }
      #ext_schedules td:nth-of-type(3) {
        text-align: right;
        width: 90px;
      }
    `);

    const SCHEDULES = POPBOX_CONTAINER.appendChild(_.create('#ext_schedules.ext_popbox'));

    const SCHEDULE_SITES = {
      itmejp: {
        title: 'itmeJP',
        url: 'http://itmejp.com/schedule/',
        apiUrl: 'http://itmejp.com/api/events-future/',
        ajaxAttrs: {},
        parseResponse(response) {
          return JSON.parse(response);
        },
        getTimeZone(resp) {
          if (resp && resp.length) {
            return resp[0].event_dt_timezone;
          }
          return 'America/New_York';
        },
        getEntries(resp) {
          return resp;
        },
        getName(entry) {
          return entry.event_name;
        },
        getTimestamp(entry, timeZone) {
          const timeStart = entry.event_dt_start;
          return moment.tz(timeStart, 'YYYY-MM-DD HH-mm-ss', timeZone).valueOf();
        },
      },
      adamkoebel: {
        title: 'Adam Koebel',
        url: 'https://www.twitch.tv/adamkoebel/events',
        apiUrl: 'https://api.twitch.tv/kraken/channels/65587647/events',
        ajaxAttrs: {
          headers: {
            Accept: 'application/vnd.twitchtv.v5+json',
            'Client-ID': 'a936j1ucnma1ucntkp2qf8vepul2tnn',
          },
        },
        parseResponse(response) {
          return JSON.parse(response);
        },
        getTimeZone() {
          return 'UTC'; // Twitch events api returs ISO time strings with UTC time
        },
        getEntries(resp) {
          return resp.events;
        },
        getName(entry) {
          return entry.title;
        },
        getTimestamp(entry) { // No timezone needed here because we have ISO time string with UTC
          const timeStart = entry.start_time;
          return moment(timeStart).valueOf();
        },
      },
    };

    const getEntries = (opt, resp) => {
      const obj = {
        entries: [],
        title: opt.title,
        url: opt.url,
      };
      const timeZone = opt.getTimeZone(resp);
      opt.getEntries(resp).forEach((entry) => {
        obj.entries.push({
          title: opt.getName(entry),
          timestamp: opt.getTimestamp(entry, timeZone),
        });
      });
      return obj;
    };

    const addScheduleTable = (obj) => {
      let html = `<div class="title"><a href="${obj.url}" target="_top">${obj.title}</a></div>`;
      html += '<table>';
      if (obj.entries.length > 0) {
        obj.entries.forEach((entry) => {
          const m = moment(entry.timestamp).tz('Europe/Ljubljana');
          html += `<tr><td>${entry.title}</td><td>${m.format('dddd, MMMM D @ HH:mm')}</td><td>${m.fromNow()}</td></tr>`;
        });
      } else {
        html += '<tr><td>No Events :(</td></tr>';
      }
      html += '</table>';
      SCHEDULES.insertAdjacentHTML('beforeend', html);
    };

    Promise.all(Object.keys(SCHEDULE_SITES).map((key) => {
      const opt = SCHEDULE_SITES[key];
      return _.cachedAjax(`schedule-${key}`, opt.apiUrl, {
        attrs: opt.ajaxAttrs,
        parse(response) {
          const resp = opt.parseResponse(response);
          return getEntries(opt, resp);
        },
        logger: LOGGER,
      });
    })).then((results) => {
      results.forEach(addScheduleTable);
    }, (error) => {
      LOGGER.warn('cannot update schedules', error);
    }).then(() => {
      SCHEDULES.style.opacity = 1;
    });

    // TWITCH
    if (window.location.hostname === 'lepko.net') {
      if (window.location.hash) {
        const hash = window.location.hash.substr(1).split('&');
        hash.some((element) => {
          if (element.startsWith('access_token=')) {
            const token = element.split('=')[1];
            _.putJSON('twitch-auth-token', { token });
            window.location.replace('https://www.google.com/_/open/404');
            return true;
          }
          return false;
        });
      }
    } else {
      _.addCSS(`
        #ext_twitch td[rowspan] {
          padding: 0;
          width: 80px;
        }
        #ext_twitch td img {
          display: block;
        }
      `);

      const TWITCH = POPBOX_CONTAINER.appendChild(_.create('#ext_twitch.ext_popbox'));

      const CLIENT_ID = 'a936j1ucnma1ucntkp2qf8vepul2tnn';
      const REDIR_URI = 'http://lepko.net/twitchauth';
      const AUTH_URL = `https://api.twitch.tv/kraken/oauth2/authorize?response_type=token&client_id=${CLIENT_ID}&redirect_uri=${REDIR_URI}&scope=user_read`;
      const AUTH_TOKEN = _.getJSON('twitch-auth-token');

      if (!AUTH_TOKEN || !AUTH_TOKEN.token) {
        window.top.location.replace(AUTH_URL);
        return;
      }

      const STREAMS_URL = `https://api.twitch.tv/kraken/streams/followed?oauth_token=${AUTH_TOKEN.token}&client_id=${CLIENT_ID}`;

      const addTwitchTable = (obj) => {
        let html = `<div class="title"><a href="${obj.url}" target="_top">${obj.title}</a></div>`;
        html += '<table>';
        if (obj.entries.length > 0) {
          obj.entries.forEach((entry) => {
            html += `<tr><td rowspan=2><img src="${entry.preview.small}"></td><td colspan=3><a href="${entry.channel.url}" target="_top">${entry.channel.status}</a></td></tr>`;
            html += `<tr><td>${entry.channel.display_name}</td><td>${entry.channel.game}</td><td>${entry.viewers} viewers</td></tr>`;
          });
        } else {
          html += '<tr><td>No Live Channels :(</td></tr>';
        }
        html += '</table>';
        TWITCH.insertAdjacentHTML('beforeend', html);
      };

      _.cachedAjax('live-twitch', STREAMS_URL, {
        parse(response) {
          const jsonR = JSON.parse(response);
          const obj = {
            title: 'Live Channels - Following',
            url: 'https://www.twitch.tv/directory/following/live',
          };
          obj.entries = jsonR.streams || [];
          return obj;
        },
        cacheLength: (1000 * 60 * 5),
        logger: LOGGER,
      }).then((result) => {
        addTwitchTable(result);
      }, (error) => {
        LOGGER.warn('cannot get twitch live channels', error);
      }).then(() => {
        TWITCH.style.opacity = 1;
      });
    }

    // CHROME STATUS
    _.addCSS(`
      #ext_chrome_status tr.versions td {
        font-weight: 400;
        text-align: center;
      }
    `);

    const CHROME = POPBOX_CONTAINER.appendChild(_.create('#ext_chrome_status.ext_popbox'));

    const getVersions = () => (
      _.cachedAjax('chrome-versions', 'https://www.chromestatus.com/omaha_data', {
        parse(response) {
          const jsonR = JSON.parse(response);

          const win64data = jsonR.find(platform => platform.os === 'win64');
          if (!win64data) {
            throw new Error("Could not find 'win64' version data!");
          }

          const versions = {};
          Object.keys(win64data.versions).forEach((key) => {
            const version = win64data.versions[key];
            if (!version.channel.includes('_asan')) {
              versions[version.channel] = parseInt(version.current_version.split('.')[0], 10);
            }
          });

          return versions;
        },
        logger: LOGGER,
      })
    );

    const getFeatures = () => (
      _.cachedAjax('chrome-features', 'https://www.chromestatus.com/features.json', {
        parse(response) {
          return JSON.parse(response);
        },
        logger: LOGGER,
      })
    );

    const addVersionsTable = (versions) => {
      const lastVersions = _.getJSON('chrome-last-versions', versions);

      const frag = document.createDocumentFragment();
      frag.appendChild(_.create('.title', {
        innerHTML: '<a href="https://www.chromestatus.com/" target="_top">Chrome Versions</a>',
      }));
      const row = frag.appendChild(_.create('table')).appendChild(_.create('tbody')).appendChild(_.create('tr.versions'));

      Object.keys(versions).reverse().forEach((key) => {
        const obj = {
          textContent: `${key.toUpperCase()}: ${versions[key]}`,
        };
        if (versions[key] !== lastVersions[key]) {
          obj.events = {
            click(e) {
              lastVersions[key] = versions[key];
              _.putJSON('chrome-last-versions', lastVersions);
              e.target.style.cssText = '';
            },
          };
          obj.style = 'background-color: #4CAF50; cursor: pointer;';
        }
        row.appendChild(_.create('td', obj));
      });

      CHROME.appendChild(frag);
    };

    const addFeaturesTable = (features) => {
      const lastFeatures = _.getJSON('chrome-last-features', features);

      const comp = {};
      const length = Math.max(features.length, lastFeatures.length);
      for (let i = 0; i < length; i++) {
        if (i < features.length) {
          if (!comp[features[i].id]) comp[features[i].id] = {};
          comp[features[i].id].current = features[i];
        }
        if (i < lastFeatures.length) {
          if (!comp[lastFeatures[i].id]) comp[lastFeatures[i].id] = {};
          comp[lastFeatures[i].id].last = lastFeatures[i];
        }
      }

      const frag = document.createDocumentFragment();
      frag.appendChild(_.create('.title', {
        innerHTML: '<a href="https://www.chromestatus.com/" target="_top">Features</a>',
      }));
      const table = frag.appendChild(_.create('table')).appendChild(_.create('tbody'));

      const sortedKeys = Object.keys(comp).sort((a, b) => {
        const aa = comp[a].current || comp[a].last;
        const bb = comp[b].current || comp[b].last;
        return (new Date(bb.updated)).getTime() - (new Date(aa.updated)).getTime();
      }).sort((a, b) => {
        const aa = comp[a].current || comp[a].last;
        const bb = comp[b].current || comp[b].last;
        return aa.shipped_milestone - bb.shipped_milestone;
      });

      sortedKeys.forEach((key) => {
        const entry = comp[key];
        let color = null;
        if (entry.current && entry.last) {
          if (entry.current.updated !== entry.last.updated) {
            // was updated
            color = '#2196F3';
          }
        } else if (entry.current) {
          // was added
          color = '#4CAF50';
        } else if (entry.last) {
          // was removed
          color = '#F44336';
        }
        if (color || (entry.last && !entry.last.ext_hidden)) {
          const ent = entry.current || entry.last;
          const row = table.appendChild(_.create('tr', {
            innerHTML: `<td title="${ent.updated}" style="width: 30px; text-align: center;">${ent.shipped_milestone}</td>
                        <td title="${_.escapeHTML(ent.summary)}">
                          <a href="https://www.chromestatus.com/feature/${ent.id}" target="_blank">${_.escapeHTML(ent.name)}</a>
                        </td>`,
          }));
          row.style.backgroundColor = color;
          row.appendChild(_.create('td', {
            innerHTML: '&times;',
            style: 'width: 24px; text-align: center; cursor: pointer;',
            events: {
              click(e) {
                const id = entry.current ? entry.current.id : entry.last.id;
                const lastThisFeatIndex = lastFeatures.findIndex(feat => feat.id === id);
                const thisFeat = features.find(feat => feat.id === id);
                if (lastThisFeatIndex === -1 && thisFeat) {
                  thisFeat.ext_hidden = true;
                  lastFeatures.push(thisFeat);
                } else if (!thisFeat && lastThisFeatIndex !== -1) {
                  lastFeatures.splice(lastThisFeatIndex, 1);
                } else if (thisFeat && lastThisFeatIndex !== -1) {
                  thisFeat.ext_hidden = true;
                  lastFeatures[lastThisFeatIndex] = thisFeat;
                }
                e.currentTarget.parentElement.remove();
                _.putJSON('chrome-last-features', lastFeatures);
              },
            },
          }));
        }
      });

      CHROME.appendChild(frag);
    };

    Promise.all([getVersions(), getFeatures()])
      .then(([versions, features]) => {
        addVersionsTable(versions);
        const filterVersions = [versions.stable, (versions.stable + 1)];
        const filteredFeatures = features.filter(e => filterVersions.includes(e.shipped_milestone));
        addFeaturesTable(filteredFeatures);
      }, (error) => {
        LOGGER.warn('cannot get chrome versions/features', error);
      })
      .then(() => {
        CHROME.style.opacity = 1;
      });
  }

  document.addEventListener('DOMContentLoaded', () => {
    LOGGER.log('ready', window.location.href);

    document.head.remove();
    document.body.remove();
    LOGGER.log('removed head and body');
  });
}(this.unsafeWindow || window));
