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

let $router = null;

function getKey(src) {
  return src.replace(/[xy]/g, function(c) {
    let r = (Math.random() * 16) | 0;
    let v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

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
      $router = this.$router;
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
          if(stack[i].vnode && stack[i].vnode.componentInstance) {
            stack[i].vnode.componentInstance.$destroy();
          }
          stack[i] = null;
        }
        stack.splice(index + 1);
      } else {
        window.console.log('[VuePageStack] render - index === -1', history.action)
        if (history.action === config.replaceName || history.action === config.backName || history.action === config.goName) {
          // got to this route by either replacing the route or going back in history
          // replace stack item with new route
          // first destroy the instance
          window.console.log('[VuePageStack] render - $destroy')
          if(stack[stack.length - 1].vnode && stack[stack.length - 1].vnode.componentInstance) {
            stack[stack.length - 1].vnode.componentInstance.$destroy();
          }
          stack[stack.length - 1] = null;
          // then remove fram stack
          stack.splice(stack.length - 1);
        }
        // add new route to stack
        stack.push({ key, vnode, routeObject: this.$route });
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
  window.console.error('[VuePageStack] _getReplaceWithRoute - currentKey', currentKey, currentIndex);
  if(indexToPreserve == currentIndex) {
    // exactly the same
    // nothing to fear

    // dit is niet betrouwbaar want als je een indexToPreserve == 0 is, en je huidige pagina is, en die bestaat, dan zal dit altijd true zijn
    // uitgeschakeld voor nu, totdat ik een betere optie weet te ontdekken
    // return vnode.componentInstance.$route.fullPath;
  }
  let componentToPreserve = stack[indexToPreserve].vnode.componentInstance;
  window.console.error('[VuePageStack] _getReplaceWithRoute - componentToPreserve', componentToPreserve);
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
  stack[indexToPreserve].vnode.componentInstance.$destroy();
  stack[indexToPreserve].vnode = null;
  // then return the backupRouteObject.fullPath
  window.console.error('[VuePageStack] _getReplaceWithRoute', stack[indexToPreserve].key, backupRouteObject.query[config.keyName]);
  if(stack[indexToPreserve].key == backupRouteObject.query[config.keyName]) {
    stack[indexToPreserve].routeObject = backupRouteObject;
    return backupRouteObject.fullPath;
  } else {
    // @TODO(1): fullpath kan all ?query= achtig iets bevatten, dus dan is dit niet waterdicht
    backupRouteObject.query[config.keyName] = stack[indexToPreserve].key;
    stack[indexToPreserve].routeObject = backupRouteObject;
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
      if(stack[i].vnode && stack[i].vnode.componentInstance) {
        stack[i].vnode.componentInstance.$destroy();
      }
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
    window.console.log('[VuePageStack] _clearHistory', goBackN, defaultOptions);
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

function back(compareToRoute = null, strict = false) {
  let routeObject = compareToRoute && compareToRoute.route ? compareToRoute.route : null;
  return new Promise((resolve, reject) => {
    if(strict) {
      // check if a previous route is known
      if(stack.length <= 1) {
        // no previous route known
        return reject();
      }
      if(routeObject) {
        if(stack[stack.length - 2].routeObject.name != routeObject.name) {
          return reject();
        }
      }
    }
    HistoryUtils.back().then(resolve()).catch(reject());
  });
}

function push(route = {}) {
  return _push(route);
}

function replace(route = {}) {
  return _push(route, true);
}

function _push(route = {}, replace = false) {
  let key;
  if (route && route.query && route.query[config.keyName]) {
    key = route.query[config.keyName];
  } else {
    key = getKey('xxxxxxxx');
    if (!route.query) {
      route.query = {};
    }
    route.query[config.keyName] = key;
  }
  let routeObject = $router.resolve(route);
  let stackObject = { key, vnode: null, routeObject: routeObject };

  if (replace) {
    // remove and destroy last item from stack
    let indexToReplace = stack.length - 1;
    if(stack[indexToReplace] && stack[indexToReplace].vnode && stack[indexToReplace].vnode.componentInstance) {
      stack[indexToReplace].vnode.componentInstance.$destroy();
    }
    stack[indexToReplace] = null;
    stack.splice(indexToReplace);
  }

  // push new item to stack
  stack.push(stackObject);

  // replace or push new route
  if (replace) {
    return HistoryUtils.replace(routeObject.fullPath);
  }
  return HistoryUtils.push(routeObject.fullPath);
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
function getPreventNavigation() {
  return preventNavigation;
}
function setPreventNavigation(value) {
  return preventNavigation = value;
}

export { VuePageStack, getIndexByKey, getStack, clearStackToCurrent, clearStackToFirst, back, push, replace, getPreventNavigation, setPreventNavigation };
