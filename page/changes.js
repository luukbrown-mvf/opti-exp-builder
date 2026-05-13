// Optimizely Custom JS — paste this into the JS box in Optimizely when done.
// ES2015 (ES6) syntax only. AVOID: object spread {...x}, async/await, optional chaining ?., nullish ??.
// Optimizely runs this BEFORE DOMContentLoaded — use waitForElement for DOM changes.
(function() {
  // Returns a Promise. Use .then() to run code after. Use Promise.all([...]) for multiple elements.
  const waitForElement = (selector, timeout = 5000) => {
    return new Promise(function(resolve, reject) {
      const el = document.querySelector(selector);
      if (el) { resolve(el); return; }
      const timer = setTimeout(function() { observer.disconnect(); reject(new Error('Timeout: ' + selector)); }, timeout);
      const observer = new MutationObserver(function() {
        const el = document.querySelector(selector);
        if (el) { clearTimeout(timer); observer.disconnect(); resolve(el); }
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
    });
  };

  // waitForElement('.hero h1').then(function(el) {
  //   el.textContent = 'New headline';
  // });
})();
