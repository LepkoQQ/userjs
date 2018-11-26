/* eslint-disable no-underscore-dangle */
/* global _:false */

// eslint-disable-next-line no-unused-vars
const ReactHook = (function createReactHook() {
  'use strict';

  const wrappedComponents = new Map();
  const ensureNotWrapped = (Component, wrapped) => {
    if (wrappedComponents.has(Component)) {
      const other = wrappedComponents.get(Component);
      throw new Error(
        `WrappedComponent(${wrapped.name}) tried to wrap the same Component as WrappedComponent(${
          other.name
        })`
      );
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
              const ret = func.apply(this, args);
              if (ret === undefined) {
                return origFunc.apply(this, args);
              }
              return ret;
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
      let reactRootContainer = await _.waitFor(() => this._rootElement._reactRootContainer);
      if (reactRootContainer._internalRoot && reactRootContainer._internalRoot.current) {
        reactRootContainer = reactRootContainer._internalRoot;
      }
      this._reactInstance = reactRootContainer.current.child;
    }

    _getReactInstance(object) {
      if (object != null) {
        if (object._reactInternalFiber) {
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
      // eslint-disable-next-line no-param-reassign
      object = this._getReactInstance(object);

      while (object) {
        if (object.stateNode instanceof Node) {
          return object.stateNode;
        }
        // eslint-disable-next-line no-param-reassign
        object = object.child;
      }

      return null;
    }

    _searchForComponent(
      { predicate, parent = this._reactInstance } = {},
      state = { depth: 0, matchedComponent: null, instances: [] }
    ) {
      // eslint-disable-next-line no-param-reassign
      parent = this._getReactInstance(parent);

      if (parent == null || state.depth > 20000) {
        // console.log('scoller - bailed search for component at depth', state.depth);
        return {
          matchedComponent: state.matchedComponent,
          instances: state.instances,
        };
      }

      state.depth++;

      const instance = parent.stateNode;

      if (instance && !(instance instanceof Node)) {
        if (state.matchedComponent == null) {
          if (predicate.call(null, instance)) {
            // console.log('found component at depth', state.depth);
            state.matchedComponent = instance.constructor;
            state.instances.push(instance);
          }
        } else if (state.matchedComponent === instance.constructor) {
          // console.log('found instance at depth', state.depth);
          state.instances.push(instance);
        }
      }

      if (parent.child) {
        let { child } = parent;
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
      // eslint-disable-next-line no-param-reassign
      node = this._getReactInstance(node);

      if (node == null || this._mutationObserverPredicates.length === 0) {
        return;
      }

      for (let i = this._mutationObserverPredicates.length - 1; i >= 0; i--) {
        const {
          name, predicate, resolve, reject,
        } = this._mutationObserverPredicates[i];
        try {
          const { instances, matchedComponent } = this._searchForComponent({
            predicate,
            parent: node,
          });
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
            if (mutation.addedNodes && mutation.addedNodes.length) {
              mutation.addedNodes.forEach((node) => {
                this._onMutation(node.parentElement);
              });
            }
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
          this._addToObserver({
            name,
            predicate,
            resolve,
            reject,
          });
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
