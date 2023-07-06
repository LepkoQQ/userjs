/* global _:false, AsyncMenu:false, APIFactory:false */
(function main(context, window) {
  'use strict';

  let LOGGER;
  let API;

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

  const ICON = `
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="13">
      <g stroke-width="2" fill="none">
        <path d="M11.29 11.71l-4-4" />
        <circle cx="5" cy="5" r="4" />
      </g>
    </svg>
  `;

  function getFormattedDate(id) {
    // this is a hack to get the previous days date for daily shows
    const split = id.split('_');
    const isoDateString = `${split[3]}-${split[2].padStart(2, '0')}-${split[1].padStart(2, '0')}`;
    const date = new Date(isoDateString);
    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' });
    return formatter.format(date).replace(/-/g, ' '); // returns YYYY MM DD
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
      values: [
        {
          data: 'separator',
        },
        {
          left: 'Change search name...',
          click: () => {
            const newName = window.prompt('Search name:', storedData.searchName);
            if (newName) {
              storedData.searchName = newName;
              setShowData(showName, storedData);
            }
          },
        },
        {
          left: `Using ${storedData.useDate ? 'date' : 'episode number'} (click to change)`,
          right: epString,
          click: () => {
            storedData.useDate = !storedData.useDate;
            setShowData(showName, storedData);
          },
        },
      ],
    };
  }

  function createMenu(event, options = {}) {
    return new AsyncMenu(event, options);
  }

  function addLink(element) {
    element.appendChild(
      _.create('button.ext_searchicon', {
        innerHTML: ICON,
        events: {
          click(event) {
            event.preventDefault();
            const queryData = getQueryData(event.currentTarget.parentElement);
            const values = (async () => {
              const results = await API.getResults(queryData.query, queryData.mustContain);
              return [...results, ...queryData.values];
            })();
            createMenu(event, { logger: LOGGER, values });
          },
        },
      })
    );
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

  context.catSite = {
    init(logger) {
      LOGGER = logger.push('main');
      LOGGER.log('started', window.location.href);
      API = APIFactory(LOGGER);

      _.waitFor(() => _.get('#cal')).then((cal) => {
        LOGGER.log('calendar detected');
        _.all('.ep > span', cal).forEach(addLink);
        addToggleWatchedButton(cal);
        onToggleButtonClicked();
        const today = _.get('.today', cal);
        if (today) {
          today.classList.add('day');
        }
      });
    },
  };
})(this, this.unsafeWindow || window);
