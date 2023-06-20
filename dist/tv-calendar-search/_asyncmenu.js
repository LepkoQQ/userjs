/* global _:false */
// eslint-disable-next-line no-unused-vars
const AsyncMenu = (function createAsyncMenu() {
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
        table.appendChild(
          _.create('tr.ext_disabled', {
            innerHTML: '<td><div class="ext_spinner"></div></td><td>Loading...</td>',
          })
        );
      } else if (entry.data === 'separator') {
        table.appendChild(
          _.create('tr.ext_separator', {
            innerHTML: '<td colspan="2"><hr></td>',
          })
        );
      } else {
        const row = _.create('tr', {
          innerHTML: `<td>${entry.left || ''}</td><td>${entry.right || ''}</td>`,
        });
        if (entry.data === 'disabled') {
          row.className = 'ext_disabled';
        } else if (entry.click) {
          const onClickFunc =
            typeof entry.click === 'function'
              ? entry.click
              : () => {
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

  // eslint-disable-next-line no-shadow
  return class AsyncMenu {
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
          this.setContent([
            {
              data: 'disabled',
              left: 'Error',
              right: error,
            },
          ]);
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
      let { x, y } = this.pos;
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
})();
