/* global _:false, moment:false */
// eslint-disable-next-line no-unused-vars
const API = (function createApi(logger) {
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

  function getToken() {
    if (API_OPTIONS.token) {
      if (API_OPTIONS.token.token) {
        if (Date.now() < API_OPTIONS.token.time + API_OPTIONS.token.maxtime) {
          return Promise.resolve(API_OPTIONS.token.token);
        }
      } else {
        const url = _.toURI(API_OPTIONS.endpoint, API_OPTIONS.token.params);
        return _.ajax(url, { logger: LOGGER })
          .send()
          .then((responseText) => JSON.parse(responseText))
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
        const queryParams = { ...API_OPTIONS.search.params };
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
      .then((url) => _.ajax(url, { logger: LOGGER }).send())
      .then((response) => JSON.parse(response));
  }

  function getResults(query, mustContain) {
    return fetchJSON(query)
      .then((json) => {
        let results = json[API_OPTIONS.results.results_key];
        const numResults = results ? results.length : 0;
        LOGGER.log(`${query} returned ${numResults} results!`);

        if (!numResults) {
          return [
            {
              left: `<b>No results: ${query}</b>`,
            },
          ];
        }

        if (mustContain) {
          const regexString = mustContain.split(' ').join('(?:[ .-])');
          const regex = new RegExp(`\\b${regexString}\\b`, 'i');
          results = results.filter((result) => result[API_OPTIONS.results.name_key].search(regex) !== -1);
          LOGGER.log(`> ${results.length} results contain "${mustContain}"!`);
        }

        if (!results.length) {
          return [
            {
              left: `<b>No results: ${query}</b>`,
            },
          ];
        }

        results.forEach((result) => {
          result.moment = moment(result[API_OPTIONS.results.date_key], API_OPTIONS.results.date_format);
        });

        results.sort((a, b) => b[API_OPTIONS.results.sort_key] - a[API_OPTIONS.results.sort_key]);

        const values = [
          {
            left: `<b>${query}</b>`,
          },
          {
            data: 'separator',
          },
        ];

        results.forEach((result) => {
          values.push({
            left: result[API_OPTIONS.results.name_key],
            right: `${result[API_OPTIONS.results.sort_key]}/${result[API_OPTIONS.results.sort_key2]} @ ${result.moment.format('YYYY-MM-DD HH:mm')}`,
            click: result[API_OPTIONS.results.link_key],
          });
        });

        return values;
      })
      .catch((error) => [
        {
          left: `<b>${error.name}</b>`,
          right: error.message,
        },
      ]);
  }

  return {
    getResults,
  };
})();
