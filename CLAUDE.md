# Optimizely Experiment Builder

This project lets the CRO team at MVF Global build Optimizely A/B test variants by describing them in plain English. They describe the change, you write the JS and CSS, they paste each into Optimizely's separate JS and CSS boxes.

## Business context

MVF Global is a lead-generation company — qualified leads are the product, sold to clients. The CRO funnel is:

**ads → landing page → form steps → submission**

Most of the time the goal is more **form submissions**. Sometimes the priority shifts to **lead quality** instead. Default to optimising for submission volume; switch frame to lead quality only when the user calls it out. Either way, optimise for the active metric, not aesthetics in isolation.

## Terminology

- **Vertical** — a broad category (e.g. hearing aids).
- **Subcat** — a subcategory, usually vertical × market (e.g. hearing aids Australia, hearing aids Spain). The CRO team operates at the **subcat** level, not the vertical level.

## Audience

The team uses this to ship variants quickly without context-switching into code. Lead with the result. Show, don't explain — they're here for the working variant, not a CSS lesson.

## Workflow

The full lifecycle, end to end, is:

```
/fetch <url> → describe changes → /create → /republish (iterate) → /qa → /golive
```

1. User runs `/fetch <url>` — the page is fetched to `page/index.html` (with `changes.css` and `changes.js` already injected), the preview server is started if not running, and a Browser Sync URL is printed. Only `page/index.html` is overwritten — `changes.css` and `changes.js` are untouched.
2. User describes changes in plain English. You edit `page/changes.css` for styling and `page/changes.js` for behaviour.
3. The local server live-reloads on save — user verifies in their browser.
4. When happy, the user runs `/create` — this creates the experiment in Optimizely with the QA Audience attached, the right metric pack (advertorial vs STF), and the variant code from `page/changes.js` + `page/changes.css`. The experiment is `running` but only the QA Audience sees it. A background poller fires Chrome incognito with the QA URL once the snippet propagates (~3 min).
5. If the user wants to tweak the code after `/create`, they edit `page/changes.*` and run `/republish` — pushes the new code to the same experiment, forces a publish via the `pause → running` cycle (the MCP has no native publish op; this is the workaround), and auto-pops Chrome incognito again on propagation.
6. User QAs by opening the QA URL Claude returns (`?optly_qa=true&optimizely_x=<variation_id>`). They can run `/qa` to confirm Optimizely's stored state matches local.
7. When verified, user runs `/golive` — swaps the QA Audience for `everyone`. Real traffic flows.

### When the user reports something broken

Trigger this flow yourself whenever the user says things like *"it's broken"*, *"doesn't work"*, *"I don't see it"*, *"check it for me"*, *"is it working?"* — they shouldn't have to type a slash command for this.

1. **Check active page.** If `page/index.html` doesn't exist, tell them to `/fetch <url>` first and stop.
2. **Capture desktop** via the `chrome-devtools` MCP: `new_page` to `http://localhost:3000` (`background: true` so focus isn't stolen) → `resize_page` to 1280×800 → `wait_for` network idle → `take_screenshot` (full page) → `list_console_messages`.
3. **Analyse.** Compare what you see against the user's intent and the current `page/changes.js` / `page/changes.css`. Look for: places the change didn't apply, layout/spacing bugs the change caused, console errors from `changes.js`. Ignore third-party / analytics / Optimizely Edge mismatches on localhost.
4. **Capture mobile only if warranted.** Skip mobile by default. Resize to 375×812 + reload + screenshot + console only when: the user mentioned mobile/phone/small screen; the desktop bug looks viewport-dependent (`position: fixed`, flex/grid layout, media-query CSS); or the fix you're about to make touches viewport-dependent CSS.
5. **Add temporary `console.log`s only if the screenshot + console didn't reveal the cause** (silent selector, callback never firing, condition unexpectedly false). Reload, read console. **Remove every log you added before finishing** — `changes.js` ships to Optimizely; no production console spam.
6. **Fix what's clearly wrong** in `page/changes.js` / `page/changes.css`. The server live-reloads on save. Stay within the JS rules above (ES2015 ceiling).
7. **`close_page`** so each round runs on a clean lifecycle (open → use → close).
8. **Report in plain English**: what was wrong, what you fixed, what (if anything) you couldn't fix and need them to clarify. If the issue is subjective ("looks weird"), describe what you see and ask one targeted question rather than guessing. Don't redesign things they didn't ask about.

### Project config

`.claude/optimizely.json` holds the project-wide state used by `/create`, `/qa`, and `/golive`:

- `project_id`: MVF Global - Capture Edge (`20610930463`). This is the only project we work in.
- `qa_audience_id`: The QA Audience (`21033421785`) — URL-param-based via `?optly_qa=true`.
- `metric_packs.advertorial` (5 metrics) and `metric_packs.stf` (4 metrics) — the chosen pack gets attached to every new experiment.
- `default_owner_initials`, `default_team` — used when constructing the experiment name.

If metric event IDs change or a new audience is added, update this file (not the command prompts).

### Experiment state

`.experiment-id` in the repo root holds the ID of the last-created experiment. `/qa` and `/golive` default to that ID. Both commands accept an explicit ID as an argument to override.

## Files

**You edit:**
- `page/changes.css` — all styling. Plain CSS, no JS injection.
- `page/changes.js` — DOM manipulation and behaviour only. No CSS here.

**You never edit:**
- `page/index.html` — fetched snapshot of the page, with `changes.css` and `changes.js` injected. Treat as read-only.
- Anything under `app/` — implementation. Read-only.

## Optimizely JS Rules

Optimizely runs custom JS **before DOMContentLoaded**. Its editor parses at an **ES2015 (ES6) ceiling** — anything newer fails at save time with `Unexpected token`.

### Standard pattern

`changes.js` has two sections separated by banner comments. Only edit the **Experiment** section.

**Framework section** — utilities, never touch:
```js
const _cro = (() => {
    // findInAddedNodes + waitForElement defined here
    return { waitForElement };
})();
```
`const _cro` is top-level in the script but NOT on `window` (ES6 block scoping). Do not convert to a `function` declaration — that would pollute `window`.

**Experiment section** — the editing zone:
```js
(() => {
    const { ready, waitForElement } = _cro;

    // Most code goes here — runs when the DOM is ready.
    ready(() => {
        // DOM manipulation here
    });

    // Use waitForElement only for elements injected after page load by JS (e.g. React, lazy loaders).
    // waitForElement('.target').then((el) => {
    //   el.textContent = 'New text';
    // });
})();
```

`ready()` checks `document.readyState` first — safe to call even if DOMContentLoaded has already fired. Use `Promise.all([...])` to wait for multiple async elements in parallel.

### Allowed (verified)

`let`, `const`, `var`, arrow functions, template literals (backticks + `${}`), default parameters, classes, `for...of`, `Promise`, `Map`/`Set`, `querySelector(All)`, `textContent`, `innerHTML`, `setAttribute`, `style`, `classList`, `createElement`, `appendChild`, `setInterval`, `setTimeout`.

Spread / rest forms that work:
- **Array spread** in literals: `[...arr]`
- **Spread in calls**: `fn(...args)`, `Math.max(...arr)`
- **Rest in array destructuring**: `const [first, ...others] = arr`
- **Object destructuring** (no rest): `const { a, b } = obj`

### Forbidden / avoid

- **Object spread** (`{...obj}`) — verified to fail (ES2018).
- **Rest in object destructuring** (`const { a, ...rest } = obj`) — same parser cohort, avoid.
- **async/await** — ES2017, fails to parse.
- **Optional chaining** (`obj?.foo`) — ES2020, fails to parse.
- **Nullish coalescing** (`a ?? b`) — ES2020, fails to parse.
- **Exponentiation** (`a ** b`) — ES2016, untested, avoid.
- `document.write`, external `<script>` loading.

### Long-string gotcha

Optimizely's editor mangles very long single-line string literals on paste (reports "Unterminated string constant" pointing inside the string). **Use template literals (backticks) for any string longer than ~80 chars** — they handle newlines naturally and survive paste cleanly.

### Choosing ready() vs waitForElement()

When writing experiment code, check `page/index.html` to determine which to use:

- **Element found in `page/index.html`** → put the code inside `ready()`. The element is in the static HTML and will be present on DOMContentLoaded.
- **Element NOT found in `page/index.html`** → use `waitForElement()`. The element is injected dynamically by JS after the page loads (React, lazy loaders, Optimizely widgets, etc.).
- **Styling change** → `changes.css` first, not JS at all (see CSS-first rule below).

### CSS-first rule

Many sites (especially WordPress) fire deferred handlers that re-render elements after JS runs. **Write all styling in `changes.css`** (with `!important` where needed) for hides, layout, and visual changes. Reach for `waitForElement` in `changes.js` only for things CSS can't do: text changes, attribute changes, DOM insertion/removal.

### Runtime behaviour to wire up (when inserting elements)

These apply to any inserted/overlay element — not just one shape. Pick whichever apply to the specific change:

- **Space-claiming inserts** at the top or bottom of the viewport: offset `body` padding (or margin) so existing content isn't hidden underneath. Re-measure on `resize` if the inserted element's size varies between viewports.
- **Conflicts with existing fixed/sticky chrome** (cookie bars, sticky navs, floating CTAs): use `waitForElement` to adjust their `top` / `bottom` / `z-index` — CSS alone often can't reach them reliably.
- **Idempotency**: guard every insertion with `if (document.querySelector('.your-class')) return;` so the script is safe under SPA re-mounts, navigation events, or duplicate fires.
- **Animations**: wrap transitions/keyframes in `@media (prefers-reduced-motion: reduce)` and disable them there.
- **Z-index hygiene**: stacking above existing fixed page chrome often needs a very high value (e.g. `2147483000`).

## Communication style

- Direct, terse, no filler. Lead with the answer.
- Brief by default — expand only when asked or when the task genuinely requires it.
- After editing `changes.css` or `changes.js`, one-line report: "Done — http://localhost:3000 will auto-reload."
- Don't auto-screenshot or auto-QA after every edit. The teammate QAs the preview in their own browser.
- Don't summarise the diff. The live preview shows the result.
