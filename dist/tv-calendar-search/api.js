/* global _:false, DOMPurify:false */
// eslint-disable-next-line no-unused-vars
const APIFactory = function createApi(logger) {
  'use strict';

  const LOGGER = logger.push('api');

  let API_OPTIONS = _.getJSON('api-options');

  if (!API_OPTIONS) {
    // eslint-disable-next-line no-alert
    const data = window.prompt('API JSON data:');
    if (data) {
      API_OPTIONS = JSON.parse(data);
      _.putJSON('api-options', API_OPTIONS);
    }
  }

  function htmlToDOM(str) {
    return DOMPurify.sanitize(str, {
      USE_PROFILES: { html: true },
      ALLOW_UNKNOWN_PROTOCOLS: true,
      RETURN_DOM_FRAGMENT: true,
    });
  }

  async function getResults(query, mustContain) {
    const values = [
      {
        left: `<b>${query}</b>`,
      },
      {
        data: 'separator',
      },
    ];

    try {
      const url = `${API_OPTIONS.search_host}${API_OPTIONS.search_path.replace('{query}', encodeURIComponent(query))}`;
      const responseText = await _.ajax(url, { logger: LOGGER }).send();
      const responseDOM = htmlToDOM(responseText);

      const resultElements = Array.from(responseDOM.querySelectorAll(API_OPTIONS.results_selector));
      if (!resultElements.length) {
        return [...values, { left: `<b>No results!</b>` }];
      }

      let results = resultElements.map((resultElement) => {
        const name = resultElement.querySelector(API_OPTIONS.result_name_selector).textContent;
        const link = resultElement.querySelector(API_OPTIONS.result_link_selector).getAttribute('href');
        const info1 = resultElement.querySelector(API_OPTIONS.result_info1_selector).textContent;
        const info2 = resultElement.querySelector(API_OPTIONS.result_info2_selector).textContent;
        const info3 = resultElement.querySelector(API_OPTIONS.result_info3_selector).textContent;

        async function onClick() {
          const pageText = await _.ajax(`${API_OPTIONS.search_host}${link}`, { logger: LOGGER }).send();
          const pageDOM = htmlToDOM(pageText);
          const pageLink = pageDOM.querySelector(API_OPTIONS.page_link_selector).getAttribute('href');
          window.location = pageLink;
        }

        return {
          left: name,
          right: `${info1}/${info2} @ ${info3}`,
          click: onClick,
          data: name.toLowerCase().includes(mustContain.toLowerCase()) ? null : 'disabled',
        };
      });

      if (results.length <= 10) {
        return [...values, ...results];
      }

      results = results.slice(0, 10);
      return [...values, ...results, { data: 'separator' }, { left: '<b>More results...</b>', click: url }];
    } catch (error) {
      return [...values, { left: `<b>${error.name}</b>`, right: error.message }];
    }
  }

  return {
    getResults,
  };
};
