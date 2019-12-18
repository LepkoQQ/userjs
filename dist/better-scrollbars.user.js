// ==UserScript==
// @name        Better Scrollbars
// @namespace   http://poglej.ga/
// @version     1.0.1
// @run-at      document-start
// @include     *
// @grant       GM_addStyle
// @nocompat    Chrome
// ==/UserScript==

/* global GM_addStyle:false */
GM_addStyle(`
  :root {
    --custom-better-scrollbar-color: rgba(142, 142, 142, 0.65);
    --custom-better-scrollbar-color-hover: rgba(142, 142, 142, 0.85);
  }

  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  ::-webkit-scrollbar-corner {
    background: transparent;
  }

  ::-webkit-scrollbar-thumb {
    background-color: var(--custom-better-scrollbar-color);
  }

  ::-webkit-scrollbar-thumb:hover {
    background-color: var(--custom-better-scrollbar-color-hover);
  }
`);
