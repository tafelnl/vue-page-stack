import history from '../history';
import HistoryUtils from '../Utils/HistoryUtils';
import config from '../config/config';

function isDef(v) {
  return v !== undefined && v !== null;
}

function isAsyncPlaceholder(node) {
  return node.isComment && node.asyncFactory;
}

function getFirstComponentChild(children) {
  if (Array.isArray(children)) {
    for (let i = 0; i < children.length; i++) {
      const c = children[i];
      if (isDef(c) && (isDef(c.componentOptions) || isAsyncPlaceholder(c))) {
        return c;
      }
    }
  }
}

var stack = [];

let preventNavigation = false;
let vnode = null;

function getIndexByKey(key) {
  for (let index = 0; index < stack.length; index++) {
    if (stack[index].key === key) {
      return index;
    }
  }
  return -1;
}

let VuePageStack = keyName => {
  return {
    name: config.componentName,
    abstract: true,
    data() {
      return {};
    },
    props: {
      max: {
        type: [String, Number],
        default() {
          return '';
        }
      }
    },
    render() {
      let key = this.$route.query[keyName];
      const slot = this.$slots.default;
      vnode = getFirstComponentChild(slot);
      window.console.log('[VuePageStack] render', stack, vnode)
      if (!vnode) {
        return vnode;
      }
      let index = getIndexByKey(key);
      if (index !== -1) {
        // went back in browser history to existing route
        window.console.log('[VuePageStack] render - index !== -1')
        if(!stack[index].vnode) {
          stack[index].vnode = vnode;
        } else {
          vnode.componentInstance = stack[index].vnode.componentInstance;
        }
        // destroy the instances that will be spliced
        for (let i = index + 1; i < stack.length; i++) {
          window.console.log('[VuePageStack] render - $destroy')
          stack[i].vnode.componentInstance.$destroy();
          stack[i] = null;
        }
        stack.splice(index + 1);
      } else {
        window.console.log('[VuePageStack] render - index === -1')
        if (history.action === config.replaceName) {
          // route gets replaced
          // replace stack item with new route
          // first destroy the instance
          window.console.log('[VuePageStack] render - $destroy')
          stack[stack.length - 1].vnode.componentInstance.$destroy();
          stack[stack.length - 1] = null;
          // then remove fram stack
          stack.splice(stack.length - 1);
        }
        // add new route to stack
        stack.push({ key, vnode });
      }
      vnode.data.keepAlive = true;
      return vnode;
    }
  };
};

function _getReplaceWithRoute(indexToPreserve, backupRouteObject = {}, shallowCompare = true) {
  if(!stack[indexToPreserve]) {
    // @TOOD(1): still need to decide what to do
    window.console.error('[VuePageStack] check this');
  }
  let currentKey = (vnode && vnode.componentInstance && vnode.componentInstance.$route) ? vnode.componentInstance.$route.query[config.keyName] : null;
  let currentIndex = getIndexByKey(currentKey); // probably always the same as (stack.length - 1)
  // first check if indexToPreserve results in the same vnode as the current vnode
  if(indexToPreserve == currentIndex) {
    // exactly the same
    // nothing to fear
    return vnode.componentInstance.$route.fullPath;
  }
  let componentToPreserve = stack[indexToPreserve].vnode.componentInstance;
  // else check if backupRouteObject is defined and componentToPreserve.fixedRoute is defined
  if ((backupRouteObject.name || backupRouteObject.fullPath) && componentToPreserve.fixedRoute) {
    // first check if backupRouteObject.fullPath equals componentToPreserve.fixedRoute.fullPath
    if (backupRouteObject.fullPath == componentToPreserve.fixedRoute.fullPath) {
      // exactly the same
      // nothing to fear
      return backupRouteObject.fullPath;
    }
    // if shallowCompare is allowed then check if backupRouteObject.name equals componentToPreserve.fixedRoute.name
    if(shallowCompare) {
      if (backupRouteObject.name == componentToPreserve.fixedRoute.name) {
        // the name of the routes are the same
        // PROBABLY nothing to fear
        return componentToPreserve.fixedRoute.fullPath;
      }
    }
  }
  window.console.error('[VuePageStack] _getReplaceWithRoute', stack, indexToPreserve, backupRouteObject, componentToPreserve.fixedRoute, vnode.componentInstance.$route, shallowCompare);
  // if we have come this far, there is no such component known in the stack
  // that is no good
  // therefore we first need to replace the stack[indexToPreserve] with a new item
  // @TODO(1)
  stack[indexToPreserve].vnode.componentInstance.$destroy();
  stack[indexToPreserve].vnode = null;
  // then return the backupRouteObject.fullPath
  window.console.error('[VuePageStack] _getReplaceWithRoute', stack[indexToPreserve].key, backupRouteObject.query[config.keyName]);
  if(stack[indexToPreserve].key == backupRouteObject.query[config.keyName]) {
    return backupRouteObject.fullPath;
  } else {
    return backupRouteObject.fullPath + `?${[config.keyName]}=${stack[indexToPreserve].key}`;
  }
}

function _clearStack(indexToPreserve = 0, replaceWithRoute = null) {
  let goBackN = (stack.length) ? stack.length - 1 : 1;
  _clearStackFinal(indexToPreserve);
  return _clearHistory(goBackN, {
    replaceWithRoute: replaceWithRoute
  });
}
function _clearStackFinal(indexToPreserve = 0) {
  // destroy all the instances in stack
  // except the one that should be preserved
  for (let i = 0; i < stack.length; i++) {
    if (i != indexToPreserve) {
      window.console.log('[VuePageStack] _clearStack - $destroy', i, stack[i]);
      stack[i].vnode.componentInstance.$destroy();
      stack[i] = null;
    }
  }
  if(indexToPreserve < 0) {
    // no item should be preserved
    stack = [];
  } else {
    // only preserve one item in the stack
    stack = [stack[indexToPreserve]];
  }
  window.console.log('[VuePageStack] _clearStack - new stack:', stack)
}
function _clearHistory(goBackN, options = {}) {
  return new Promise((resolve) => {
    // default config
    let defaultOptions = {
      preventNavigation: true
    }
    // merge options with defaultOptions
    Object.assign(defaultOptions, options);
    window.console.log('[VuePageStack] _clearHistory', goBackN);
    if (goBackN <= 0) {
      if (defaultOptions.replaceWithRoute) {
        // if replaceWithRoute is defined, replace current route
        HistoryUtils.replace(defaultOptions.replaceWithRoute).then(() => {
          resolve();
        });
      } else {
        resolve();
      }
      return;
    }
    if (defaultOptions.preventNavigation) {
      // prevents history.go(-goBackN) from triggering VueRouter
      preventNavigation = true;
    }
    // go back in history
    HistoryUtils.clearHistory(goBackN).then(() => {
      if (defaultOptions.replaceWithRoute) {
        // if replaceWithRoute is defined, replace current route
        HistoryUtils.replace(defaultOptions.replaceWithRoute).then(() => {
          resolve();
        });
      } else {
        resolve();
      }
    });
  });
}

/**
 * clearStackToFirst()
 * 1. clearStack completely
 * 2. except the first item (first in stack)
 * 3. window.history.go(-goBackN)
 * 4. HistoryUtils.replace(replaceLeftOverItemWithRoute) (to make sure location.reload() will load correct page)
 */
function clearStackToFirst(route) {
  let indexToPreserve = 0;
  let replaceWithRoute = _getReplaceWithRoute(indexToPreserve, route.route);
  return _clearStack(indexToPreserve, replaceWithRoute);
}

/**
 * clearStackToCurrent()
 * Works as follows:
 * 1. clearStack completely
 * 2. except the current item (last in stack)
 * 3. window.history.go(-goBackN)
 * 4. HistoryUtils.replace(currentRouteFullPath) (to make sure location.reload() will load correct page)
 */
function clearStackToCurrent() {
  let indexToPreserve = stack.length - 1;
  let replaceWithRoute = _getReplaceWithRoute(indexToPreserve, vnode.componentInstance.$route);
  return _clearStack(indexToPreserve, replaceWithRoute);
}

// function _clearStack(replaceLeftOverItemWithRoute = {}, indexToLeave = 0, preventNavigationFlag = true, replaceHistoryPathFlag = false) {
//   return new Promise((resolve, reject) => {
//     let currentRouteFullPath = (currentRoute) ? currentRoute.fullPath : window.location.href;
//     window.console.log('[VuePageStack] _clearStack - check', currentRouteFullPath);
//     let goBackN = (stack.length) ? stack.length - 1 : 1;
//     if (!goBackN) {
//       // @TODO(1): check if current route name is correct
//       if (indexToLeave != 0) {
//         // if current stack item in stack (which can only be index == 0) is not to be leaved, clear whole stack
//         stack = [];
//       }
//       resolve();
//       return;
//     }
//
//
//
//     window.console.log('[VuePageStack] _clearStack - check', replaceLeftOverItemWithRoute, stack[indexToLeave]);
//     // check if currentVnode is the same as this vnode
//     let key = vnode.componentInstance.$route.query[config.keyName];
//     let index = getIndexByKey(key);
//     window.console.log('[VuePageStack] _clearStack - check diff', index, indexToLeave);
//     if (index == indexToLeave) {
//       // exactly the same
//       window.console.log('[VuePageStack] _clearStack - same same', index, indexToLeave);
//     } else if (replaceLeftOverItemWithRoute.name && stack[indexToLeave].vnode.componentInstance.fixedRoute) {
//       // else check if route name is the same
//       if (replaceLeftOverItemWithRoute.name == stack[indexToLeave].vnode.componentInstance.fixedRoute.name) {
//         window.console.log('[VuePageStack] _clearStack - same NAME', replaceLeftOverItemWithRoute.name);
//       } else {
//         window.console.log('[VuePageStack] _clearStack - different NAME', replaceLeftOverItemWithRoute.name);
//         replaceHistoryPathFlag = true;
//         currentRouteFullPath = replaceLeftOverItemWithRoute.path;
//         // @TODO(1): stack item ook vervangen voor de correcte
//       }
//     }
//
//
//     _clearStackFinal(indexToLeave);
//
//     _clearHistory(goBackN, {
//       preventNavigation: preventNavigationFlag,
//       replaceWithRoute: (replaceHistoryPathFlag) ? currentRouteFullPath : null
//     });
//   });
// }

function getStack() {
  return stack;
}
function setStack(value) {
  return stack = value;
}
function getPreventNavigation() {
  return preventNavigation;
}
function setPreventNavigation(value) {
  return preventNavigation = value;
}

export { VuePageStack, getIndexByKey, getStack, setStack, clearStackToCurrent, clearStackToFirst, getPreventNavigation, setPreventNavigation };
