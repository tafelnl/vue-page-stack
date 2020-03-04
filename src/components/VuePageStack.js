import history from '../history';
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

const stack = [];

let preventNavigation = false;

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
      const vnode = getFirstComponentChild(slot);
      window.console.log('[VuePageStack] render', stack, vnode)
      if (!vnode) {
        return vnode;
      }
      if(preventNavigation) {
        window.console.log('[VuePageStack] preventNavigation')
        preventNavigation = false;
        return vnode;
      }
      let index = getIndexByKey(key);
      if (index !== -1) {
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
          // destroy the instance
          window.console.log('[VuePageStack] render - $destroy')
          stack[stack.length - 1].vnode.componentInstance.$destroy();
          stack[stack.length - 1] = null;
          stack.splice(stack.length - 1);
        }
        stack.push({ key, vnode });
      }
      vnode.data.keepAlive = true;
      return vnode;
    }
  };
};

function getStack() {
  return stack;
}

function clearStack() {
  let goBackN = (stack.length) ? stack.length - 1 : 1;
  if(!goBackN)
  {
    return;
  }
  preventNavigation = true;

  // destroy the instances that will be spliced
  for (let i = 1; i < stack.length; i++) {
    window.console.log('[VuePageStack] render - $destroy')
    stack[i].vnode.componentInstance.$destroy();
    stack[i] = null;
  }
  stack.splice(1);
  window.console.log('[VuePageStack] clearStack', stack)

  window.history.go(-goBackN);
}

function getPreventNavigation() {
  return preventNavigation;
}
function setPreventNavigation(value) {
  return preventNavigation = value;
}

export { VuePageStack, getIndexByKey, getStack, clearStack, getPreventNavigation, setPreventNavigation };
