# Debug the Local Preview

Inspects the running variant at http://localhost:3000 using chrome-devtools MCP, reports what's wrong, and fixes obvious issues in `page/changes.js`.

`$ARGUMENTS` is an optional description of what's broken — e.g. "banner isn't showing on mobile". May be empty.

## Steps

1. **Check active page.** If `page/index.html` doesn't exist, tell the user there's no active page (run `/fetch <url>` first) and stop.

2. **Capture desktop.** `new_page` to http://localhost:3000 with `background: true` (avoids stealing focus). Then `resize_page` to 1280×800, `wait_for` network idle, `take_screenshot` (full page) saved to `page/debug-desktop.png`, `list_console_messages`.

3. **Analyse.** Compare what you see against the user's intent (from `$ARGUMENTS` and the current `page/changes.js`). Identify:
   - places the change didn't apply
   - layout / spacing bugs caused by the change
   - console errors from `changes.js` (ignore third-party / analytics / Optimizely Edge mismatches on localhost)

4. **Capture mobile only if warranted.** Skip mobile by default. Resize to 375×812 + reload + screenshot + console only when one of:
   - The user's description mentions mobile / phone / small screen
   - The desktop bug looks viewport-dependent (`position: fixed`, flex/grid layout, media-query-driven CSS)
   - The fix you're about to make touches viewport-dependent CSS

5. **Escalate with temporary `console.log`s only if needed.** If the screenshot + console didn't reveal the cause (silent selector returning nothing, callback never firing, condition unexpectedly false), add `console.log` statements to `page/changes.js`, reload, read the console again. **REMOVE every log you added before finishing this step** — the final `changes.js` gets pasted into Optimizely, and production console spam is a sloppy footprint.

6. **Fix what's clearly wrong** in `page/changes.js`. The server live-reloads on save. Stay within the JS rules in `CLAUDE.md` (ES2015 ceiling — no object spread, async/await, optional chaining, nullish coalescing).

7. **Close the MCP page** with `close_page` so each `/debug` runs on a clean lifecycle (open → use → close).

8. **Report.** Tell the user, in plain English:
   - what was wrong
   - what you fixed
   - what (if anything) you couldn't fix and need them to clarify

## Notes

- If the issue is subjective ("looks weird"), describe what you see and ask one targeted question rather than guessing.
- Don't redesign things the user didn't ask about — only fix the specific issue.
