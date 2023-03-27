// ==UserScript==
// @name         Better Scrollbars
// @namespace    http://poglej.ga/
// @version      2.0.0
// @run-at       document-start
// @match        *://*/*
// @grant        GM_addStyle
// @nocompat     Chrome
// ==/UserScript==

/* global GM_addStyle:false */
GM_addStyle(`
:root {
  --_cbsb-background: rgba(142, 142, 142, 0.25);
  --_cbsb-color: rgba(142, 142, 142, 0.65);
  --_cbsb-color-hover: rgba(142, 142, 142, 0.85);
}

::-webkit-scrollbar {
  width: 10px !important;
  height: 10px !important;
  background-color: transparent !important;
}

::-webkit-scrollbar-track-piece {
  background-color: var(--_cbsb-background) !important;
}

::-webkit-scrollbar-corner {
  background-color: var(--_cbsb-background) !important;
}

::-webkit-scrollbar-thumb {
  height: 48px !important;
  border: 2px solid transparent !important;
  border-radius: 0 !important;
  background-clip: content-box !important;
  background-color: var(--_cbsb-color) !important;
}

::-webkit-scrollbar-thumb:hover {
  background-color: var(--_cbsb-color-hover) !important;
}
`);
