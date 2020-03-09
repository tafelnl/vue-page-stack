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
let currentRoute = null;
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
      currentRoute = this.$route;
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
        vnode.componentInstance = stack[index].vnode.componentInstance;
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

/**
 * clearStackToCurrent()
 * Works as follows:
 * 1. clearStack completely
 * 2. except the current item (last in stack)
 * 3. window.history.go(-goBackN)
 * 4. HistoryUtils.replace(currentRouteFullPath) (to make sure location.reload() will load correct page)
 */
function clearStackToCurrent() {
  return _clearStack(null, stack.length - 1, true, true);
}

/**
 * clearStackToFirst()
 * Works as follows:
 * 1. clearStack completely
 * 2. except the first item (first in stack)
 * 3. window.history.go(-goBackN)
 * 4. HistoryUtils.replace(replaceLeftOverItemWithRoute) (to make sure location.reload() will load correct page)
 */
function clearStackToFirst(route) {
  return _clearStack(route);
}

function _clearStack(replaceLeftOverItemWithRoute = {}, indexToLeave = 0, preventNavigationFlag = true, replaceHistoryPathFlag = false) {
  return new Promise((resolve, reject) => {
    let currentRouteFullPath = (currentRoute) ? currentRoute.fullPath : window.location.href;
    window.console.log('[VuePageStack] _clearStack - check', currentRouteFullPath);
    let goBackN = (stack.length) ? stack.length - 1 : 1;
    if (!goBackN) {
      // @TODO(1): check if current route name is correct
      if (indexToLeave != 0) {
        // if current stack item in stack (which can only be index == 0) is not to be leaved, clear whole stack
        stack = [];
      }
      resolve();
      return;
    }



    window.console.log('[VuePageStack] _clearStack - check', replaceLeftOverItemWithRoute, stack[indexToLeave]);
    // check if currentVnode is the same as this vnode
    let key = vnode.componentInstance.$route.query[config.keyName];
    let index = getIndexByKey(key);
    window.console.log('[VuePageStack] _clearStack - check diff', index, indexToLeave);
    if (index == indexToLeave) {
      // exactly the same
      window.console.log('[VuePageStack] _clearStack - same same', index, indexToLeave);
    } else if (replaceLeftOverItemWithRoute.name && stack[indexToLeave].vnode.componentInstance.fixedRoute) {
      // else check if route name is the same
      if (replaceLeftOverItemWithRoute.name == stack[indexToLeave].vnode.componentInstance.fixedRoute.name) {
        window.console.log('[VuePageStack] _clearStack - same NAME', replaceLeftOverItemWithRoute.name);
      } else {
        window.console.log('[VuePageStack] _clearStack - different NAME', replaceLeftOverItemWithRoute.name);
        replaceHistoryPathFlag = true;
        currentRouteFullPath = replaceLeftOverItemWithRoute.path;
        // @TODO(1): stack item ook vervangen voor de correcte
      }
    }


    // destroy the instances that will be spliced
    for (let i = 0; i < stack.length; i++) {
      if (i != indexToLeave) {
        window.console.log('[VuePageStack] _clearStack - $destroy', stack[i]);
        stack[i].vnode.componentInstance.$destroy();
        stack[i] = null;
      }
    }
    stack = [stack[indexToLeave]];
    window.console.log('[VuePageStack] _clearStack', stack)

    if (preventNavigationFlag) {
      preventNavigation = true;
    }

    window.history.go(-goBackN);

    // timeout needed to let window.history.go(-goBackN); finish first
    setTimeout(() => {
      if (replaceHistoryPathFlag) {
        HistoryUtils.replace(currentRouteFullPath).then(() => {
          window.console.log('[VuePageStack] _clearStack - replaceHistoryPathFlag')
          resolve();
        });
      } else {
        resolve();
      }
    }, 10);
  });
}

function getStack() {
  return stack;
}
function getPreventNavigation() {
  return preventNavigation;
}
function setPreventNavigation(value) {
  return preventNavigation = value;
}

export { VuePageStack, getIndexByKey, getStack, clearStackToCurrent, clearStackToFirst, getPreventNavigation, setPreventNavigation };
