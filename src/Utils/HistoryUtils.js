export default {

  clearHistory(goBackN) {
    return new Promise((resolve) => {
      window.history.go(-goBackN);
      // timeout needed to let window.history.go(-goBackN); finish first
      // timeout needs to be greater than 0 milliseconds
      setTimeout(() => {
        resolve();
      }, 10);
    });
  },

  push (url) {
    return this._push(url);
  },

  _push (url, replace = false) {
    return new Promise((resolve) => {
      // try...catch the pushState call to get around Safari
      // DOM Exception 18 where it limits to 100 pushState calls
      const history = window.history;
      var _key = window.performance.now().toFixed(3);
      try {
        if (replace) {
          history.replaceState({ key: _key }, '', url);
        } else {
          history.pushState({ key: _key }, '', url);
        }
      } catch (e) {
        window.location[replace ? 'replace' : 'assign'](url);
      }
      // setTimeout needed to let pushState() finish first
      setTimeout(() => {
        resolve();
      }, 10);
    });
  },

  replace (url) {
    return this._push(url, true);
  }

};
