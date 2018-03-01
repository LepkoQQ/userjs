/* eslint-disable no-underscore-dangle */
/* global _:false */

// eslint-disable-next-line no-unused-vars
const ReactHook = (function createReactHook() {
  'use strict';

  const wrappedComponents = new Map();
  const ensureNotWrapped = (Component, wrapped) => {
    if (wrappedComponents.has(Component)) {
      const other = wrappedComponents.get(Component);
      throw new Error(`WrappedComponent(${wrapped.name}) tried to wrap the same Component as WrappedComponent(${other.name})`);
    }
    wrappedComponents.set(Component, wrapped);
    return Component;
  };

  class WrappedComponent {
    constructor(name, Component, instances, hookInstance) {
      this.name = name;
      this._component = ensureNotWrapped(Component, this);
      this._instances = instances;
      this._hookInstance = hookInstance;
    }

    wrap(methods) {
      const proto = this._component.prototype;
      Object.entries(methods).forEach(([key, func]) => {
        if (typeof func === 'function') {
          if (key === 'componentDidMount') {
            this._instances
              .filter(i => this._hookInstance.getDOMElement(i) != null)
              .forEach((instance) => {
                func.apply(instance);
              });
            this._instances = [];
          }
          if (_.has(proto, key)) {
            const origFunc = proto[key];
            proto[key] = function wrapped(...args) {
              func.apply(this, args);
              return origFunc.apply(this, args);
            };
          } else {
            proto[key] = func;
          }
        }
      });
    }
  }

  // eslint-disable-next-line no-shadow
  class ReactHook {
    constructor() {
      this._rootElement = null;
      this._reactKey = null;
      this._reactInstance = null;

      this._mutationObserver = null;
      this._mutationObserverEnabled = false;
      this._mutationObserverPredicates = [];
    }

    async _init(rootSelector) {
      this._rootElement = await _.waitFor(() => _.get(rootSelector));
      const reactRootContainer = await _.waitFor(() => this._rootElement._reactRootContainer);
      this._reactInstance = reactRootContainer.current.child;
    }

    _getReactInstance(object) {
      if (object != null) {
        if (_.has(object, '_reactInternalFiber')) {
          return object._reactInternalFiber;
        }
        if (object instanceof Node) {
          if (this._reactKey == null) {
            this._reactKey = Object.keys(object).find(key => key.startsWith('__reactInternalInstance$'));
          }
          if (this._reactKey != null && _.has(object, this._reactKey)) {
            return object[this._reactKey];
          }
        }
      }
      return object;
    }

    getDOMElement(object) {
      object = this._getReactInstance(object); // eslint-disable-line no-param-reassign

      while (object) {
        if (object.stateNode instanceof Node) {
          return object.stateNode;
        }
        object = object.child; // eslint-disable-line no-param-reassign
      }

      return null;
    }

    _searchForComponent(
      { predicate, parent = this._reactInstance } = {},
      state = { depth: 0, matchedComponent: null, instances: [] },
    ) {
      parent = this._getReactInstance(parent); // eslint-disable-line no-param-reassign

      if (parent == null || state.depth > 2000) {
        return {
          matchedComponent: state.matchedComponent,
          instances: state.instances,
        };
      }

      state.depth++;

      const instance = parent.stateNode;

      if (instance) {
        if (state.matchedComponent == null) {
          if (predicate.call(null, instance)) {
            state.matchedComponent = instance.constructor;
            state.instances.push(instance);
          }
        } else if (state.matchedComponent === instance.constructor) {
          state.instances.push(instance);
        }
      }

      if (parent.child) {
        let child = parent.child;
        while (child) {
          this._searchForComponent({ predicate, parent: child }, state);
          child = child.sibling;
        }
      }

      return {
        matchedComponent: state.matchedComponent,
        instances: state.instances,
      };
    }

    _stopObserver() {
      if (this._mutationObserverEnabled) {
        this._mutationObserver.disconnect();
      }
    }

    _onMutation(node) {
      node = this._getReactInstance(node); // eslint-disable-line no-param-reassign

      if (node == null || this._mutationObserverPredicates.length === 0) {
        return;
      }

      for (let i = this._mutationObserverPredicates.length - 1; i >= 0; i--) {
        const { name, predicate, resolve, reject } = this._mutationObserverPredicates[i];
        try {
          const { instances, matchedComponent } = this._searchForComponent({ predicate });
          if (matchedComponent != null) {
            this._mutationObserverPredicates.splice(i, 1);
            resolve(new WrappedComponent(name, matchedComponent, instances, this));
          }
        } catch (error) {
          reject(error);
        }
      }

      if (this._mutationObserverPredicates.length === 0) {
        this._stopObserver();
      }
    }

    _startObserver() {
      if (this._mutationObserver == null) {
        this._mutationObserver = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            this._onMutation(mutation.target);
          });
        });
      }
      if (!this._mutationObserverEnabled) {
        this._mutationObserver.observe(this._rootElement, {
          childList: true,
          subtree: true,
        });
        this._mutationObserverEnabled = true;
      }
    }

    _addToObserver(predicateObject) {
      this._mutationObserverPredicates.push(predicateObject);
      this._startObserver();
    }

    async findComponent(name, predicate) {
      return new Promise((resolve, reject) => {
        const { matchedComponent, instances } = this._searchForComponent({ predicate });
        if (matchedComponent != null) {
          resolve(new WrappedComponent(name, matchedComponent, instances, this));
        } else {
          this._addToObserver({ name, predicate, resolve, reject });
        }
      });
    }
  }

  return {
    async create(selector) {
      const instance = new ReactHook();
      await instance._init(selector);
      return instance;
    },
  };
}());
