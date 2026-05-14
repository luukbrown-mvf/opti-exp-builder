// Optimizely Custom JS — paste this into the JS box in Optimizely when done.
// ES2015 (ES6) syntax only. AVOID: object spread {...x}, async/await, optional chaining (?.), nullish coalescing (??).
// Optimizely runs this BEFORE DOMContentLoaded — use ready() for most code, waitForElement for async elements.

// ── Framework (do not edit) ────────────────────────────────────────────────
// top-level const: NOT on window. Do not convert to a function declaration.
const _cro = (() => {
    const ready = (fn) => {
        if (document.readyState !== "loading") {
            fn();
        } else {
            document.addEventListener("DOMContentLoaded", fn);
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
            if (el) {
                resolve(el);
                return;
            }
            const timer = setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Timeout: ${selector}`));
            }, timeout);
            const observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    const found = findInAddedNodes(
                        mutation.addedNodes,
                        selector
                    );
                    if (found) {
                        clearTimeout(timer);
                        observer.disconnect();
                        resolve(found);
                        return;
                    }
                }
            });
            observer.observe(document.documentElement, {
                childList: true,
                subtree: true
            });
        });
    };

    return { ready, waitForElement };
})();

// ── Experiment (edit here) ─────────────────────────────────────────────────
(() => {
    // set up custom tracking store
    // window.optimizelyEdge = window.optimizelyEdge || [];
    // import optimizely utils ( wait for etc ...)
    // const utils = window.optimizelyEdge.get("utils");

    // import abstracted utilities
    const { ready, waitForElement } = _cro;

    // Most code goes here — runs when the DOM is ready.
    ready(() => {});

    // LOCAL DEVELOPMENT
    // Use waitForElement only for elements injected after page load by JS (e.g. React, lazy loaders).
    // waitForElement('.hero h1').then((el) => {
    //   el.textContent = 'New headline';
    // });

    // PRODUCTION OPTIMISATION
    // In optimizely, wait for element can be replaced by the optimizley utils equivalent
    // utils
    //     .waitForElement(".chameleon-overlay .overlay-subtitle + div + div")
    //     .then(() => {});
})();
