# Reset Changes

Resets `changes.css` and `changes.js` to their stubs, leaving `page/index.html` untouched. Use when you want to start the experiment over on the same page without re-fetching.

**Do not ask for confirmation** — just run it.

## Steps

1. Overwrite `page/changes.css` with exactly this content:
   ```
   /* Optimizely Custom CSS — paste this into the CSS box in Optimizely when done. */
   ```

2. Overwrite `page/changes.js` with exactly this content:
   ```js
   // Optimizely Custom JS — paste this into the JS box in Optimizely when done.
   // ES2015 (ES6) syntax only. AVOID: object spread {...x}, async/await, optional chaining (?.), nullish coalescing (??).
   // Optimizely runs this BEFORE DOMContentLoaded — use waitForElement in the experiment section below.

   // ── Framework (do not edit) ────────────────────────────────────────────────
   // top-level const: NOT on window. Do not convert to a function declaration.
   const _cro = (() => {
       const ready = (fn) => {
           if (document.readyState !== 'loading') {
               fn();
           } else {
               document.addEventListener('DOMContentLoaded', fn);
           }
       };

       const findInAddedNodes = (addedNodes, selector) => {
           for (const node of addedNodes) {
               if (node.nodeType !== 1) continue;
               return node.matches(selector) ? node : node.querySelector(selector);
           }
           return null;
       };

       const waitForElement = (selector, timeout = 5000) => {
           return new Promise((resolve, reject) => {
               const el = document.querySelector(selector);
               if (el) { resolve(el); return; }
               const timer = setTimeout(() => {
                   observer.disconnect();
                   reject(new Error(`Timeout: ${selector}`));
               }, timeout);
               const observer = new MutationObserver((mutations) => {
                   for (const mutation of mutations) {
                       const found = findInAddedNodes(mutation.addedNodes, selector);
                       if (found) { clearTimeout(timer); observer.disconnect(); resolve(found); return; }
                   }
               });
               observer.observe(document.documentElement, { childList: true, subtree: true });
           });
       };

       return { ready, waitForElement };
   })();

   // ── Experiment (edit here) ─────────────────────────────────────────────────
   (() => {
       const { ready, waitForElement } = _cro;

       // Most code goes here — runs when the DOM is ready.
       ready(() => {

       });

       // Use waitForElement only for elements injected after page load by JS (e.g. React, lazy loaders).
       // waitForElement('.hero h1').then((el) => {
       //   el.textContent = 'New headline';
       // });
   })();
   ```

3. Delete `.experiment-id` if it exists (`rm -f .experiment-id`). Otherwise `/create` will refuse to run, since it now treats a present `.experiment-id` as "there's already an experiment, use `/republish` instead." A reset implies starting over, so the pointer goes too.

4. Report: "Reset — changes wiped, `.experiment-id` cleared, http://localhost:3000 will auto-reload."

## Notes

- Keeps `page/index.html` intact — the page snapshot is preserved.
- The Optimizely experiment that `.experiment-id` pointed at is **NOT** archived — it still exists in Optimizely. `/reset` only forgets the local pointer to it. Archive it manually in the Optimizely UI if you want it gone.
- To also wipe the page and start completely fresh, run `/fetch <url>` instead.
