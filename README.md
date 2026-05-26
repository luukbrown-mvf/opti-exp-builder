# Optimizely Experiment Builder

Build, QA, and ship Optimizely A/B tests by chatting with Claude. Describe the variant in plain English, Claude writes the JS and CSS, then `/push` creates the experiment in Optimizely directly — no copy-paste, no clicks in the UI.

## First-time setup

1. You should already have Claude Code installed (IT set it up). If you don't, get it from them.
2. Add the `chrome-devtools` MCP (needed for `/debug`). Easiest: open Claude Code and ask it *"install the chrome-devtools MCP"*.
3. Add the **Optimizely Experimentation MCP** (needed for `/push`, `/qa`, `/golive`). In Claude Code, run:
   ```
   /mcp
   ```
   You should see `optimizely-experimentation` already in the list (it's configured at the repo level via `.mcp.json`). Authenticate it via the browser when prompted. One-time setup.
4. That's it — Claude installs the rest the first time you run `/fetch`.

## The whole flow

```
/fetch <url>     →  describe changes  →  /debug (if needed)  →  /push  →  /qa  →  /golive
```

### 1. Fetch the page

```
/fetch https://your-landing-page.com/the-page
```

Claude fetches a copy of the page, starts the local preview server, and prints the preview URL.

### 2. Chat with Claude

Describe changes in plain English:

> Make the headline say "Save 50% today" in red.

> Add a sticky banner at the top saying "Free shipping until Friday".

> Hide the third feature card on the homepage.

Claude edits `page/changes.css` (for styling) and `page/changes.js` (for behaviour). The browser live-reloads each time Claude saves. Keep iterating until you're happy. If something looks off, run `/debug`.

### 3. Push to Optimizely

```
/push
```

Claude will ask:
- The full URL of the page (paste it again — the snapshot only stores the origin).
- **Page type**: Advertorial or STF (straight-to-form). This picks the metric pack.
- The name parts: change description, audience (e.g. "B2C RoW"), vertical/subcat. Team and initials default from `.claude/optimizely.json`.

Claude then creates the experiment in **MVF Global - Capture Edge** with:
- The QA Audience attached (only QA visitors see it — append `?optly_qa=true` to the page URL).
- The right metric pack (5 metrics for advertorial, 4 for STF).
- Original (50%) + Variation 1 (50%) — your CSS and JS go on Variation 1.
- Status: `running`.

You get back the experiment ID, the Optimizely deep link, and a QA URL.

### 4. QA in your browser

Open the QA URL Claude printed (`...?optly_qa=true&optimizely_x=<id>&optimizely_log=debug`). Verify the variant works against the real Optimizely runtime. To see what Optimizely actually has:

```
/qa
```

Shows the experiment's current state: audience, variations, metrics, status. Use it as a sanity check before going live.

### 5. Go live

```
/golive
```

Confirms once, then swaps the QA Audience for `everyone` so real traffic flows. One-way action — to pause or roll back, go to the Optimizely UI.

## Commands

| Command | What it does |
|---------|--------------|
| `/fetch <url>` | Fetches a new page snapshot and ensures the preview server is running. **Leaves your JS and CSS changes untouched.** |
| `/start` | Starts the preview server manually (rarely needed — `/fetch` does it for you). |
| `/stop` | Stops the preview server. |
| `/reset` | Wipes `changes.js` and `changes.css` back to blank stubs. **Keeps the fetched page.** |
| `/debug` | Opens the page in a controlled browser, screenshots it, reads the console, and fixes or reports the issue. |
| `/push` | Creates the experiment in Optimizely with QA Audience attached. |
| `/qa` | Reports the current state of the experiment in Optimizely. |
| `/golive` | Removes the QA Audience so the experiment serves everyone. |

## Re-fetching a page

Running `/fetch` again on the same (or a different) URL updates the page snapshot without touching your JS or CSS work. Safe to do any time — for example if the live page has been updated and you want a fresh copy.

If you want to wipe your changes too, run `/reset` after `/fetch`.

## What lives where

| Path | What it is |
|------|------------|
| `page/changes.js` | **Your variant JS.** Goes onto Variation 1 in Optimizely. |
| `page/changes.css` | **Your variant CSS.** Goes onto Variation 1 in Optimizely. |
| `page/index.html` | Fetched snapshot of the page. Don't edit. Gitignored. |
| `.claude/optimizely.json` | Project config: project ID, QA audience ID, metric packs. **Edit when metrics or audience change.** |
| `.experiment-id` | Last-pushed experiment ID. Used by `/qa` and `/golive`. Gitignored. |
| `app/` | Implementation files. Don't touch. |
| `CLAUDE.md` | Instructions Claude follows when building experiments. |

## Fallback: manual copy-paste

If the Optimizely MCP isn't available or you'd rather create the experiment in the UI:

- `page/changes.js` → paste into Optimizely's **JS** box on your variation.
- `page/changes.css` → paste into Optimizely's **CSS** box on your variation.

(Or ask Claude *"show me the final JS"* / *"show me the final CSS"* and it'll print them in the chat.)

## Optimizely tips

- Paste the **entire contents** of `changes.js` — including the wrapping `(function() { ... })();`.
- Optimizely's Custom Code runs **before** the page loads. Claude follows the right pattern automatically (`waitForElement` handles anything that loads after the initial paint).
- For QA, use Optimizely's standard QA preview flow (`?optly_qa=true&optimizely_x=<experimentId>&optimizely_log=debug`) — `/push` prints the exact URL for you.
