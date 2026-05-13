# Optimizely Experiment Builder

Build Optimizely A/B test variants by chatting with Claude. You don't need to write code — describe what you want, Claude writes the JS and CSS, you paste the results into Optimizely.

## First-time setup

1. You should already have Claude Code installed (IT set it up). If you don't, get it from them.
2. Add the `chrome-devtools` MCP to Claude Code (needed for `/debug`). Easiest: open Claude Code and ask it *"install the chrome-devtools MCP"*.
3. That's it — Claude installs everything else the first time you run `/fetch`.

## Using it

### 1. Fetch the page

In Claude Code, type:

```
/fetch https://your-landing-page.com/the-page
```

Claude fetches a copy of the page and saves it locally.

### 2. Start the preview server

```
/start
```

Opens a local server at **http://localhost:3000**. You'll see the page exactly as Optimizely will render it.

### 3. Chat with Claude

Describe changes in plain English:

> Make the headline say "Save 50% today" in red.

> Add a sticky banner at the top saying "Free shipping until Friday".

> Hide the third feature card on the homepage.

The browser live-reloads each time Claude saves. Keep iterating until you're happy.

### 4. Copy the final code into Optimizely

- `page/changes.js` → paste into Optimizely's **JS** box on your variation.
- `page/changes.css` → paste into Optimizely's **CSS** box on your variation.

(Or ask Claude *"show me the final JS"* / *"show me the final CSS"* and it'll print them in the chat.)

## Commands

| Command | What it does |
|---------|--------------|
| `/fetch <url>` | Fetches a new page snapshot. **Leaves your JS and CSS changes untouched.** |
| `/start` | Starts the local preview server at http://localhost:3000. |
| `/stop` | Stops the preview server. |
| `/reset` | Wipes `changes.js` and `changes.css` back to blank stubs. **Keeps the fetched page.** Use when you want to start the experiment over from scratch. |
| `/debug` | Opens the page in a controlled browser, screenshots it, reads the console, and fixes or reports the issue. |

## Re-fetching a page

Running `/fetch` again on the same (or a different) URL updates the page snapshot without touching your JS or CSS work. This is safe to do any time — for example if the live page has been updated and you want a fresh copy.

If you want to wipe your changes too, run `/reset` after `/fetch`.

## When something looks broken

Type:

```
/debug
```

(optionally with a description: `/debug the banner isn't showing on mobile`)

Claude opens the page in a controlled browser, screenshots it, reads the console, and either fixes the issue or tells you exactly what's wrong.

## What lives where

| Path | What it is |
|------|------------|
| `page/changes.js` | **Your variant JS.** Paste into Optimizely's JS box. |
| `page/changes.css` | **Your variant CSS.** Paste into Optimizely's CSS box. |
| `page/index.html` | Fetched snapshot of the page. Don't edit. |
| `app/` | Implementation files. Don't touch. |
| `CLAUDE.md` | Instructions Claude follows when building experiments. |

## Optimizely tips

- Paste the **entire contents** of `changes.js` — including the wrapping `(function() { ... })();`.
- Optimizely's Custom Code runs **before** the page loads. Claude follows the right pattern automatically (`waitForElement` handles anything that loads after the initial paint).
- For QA, use Optimizely's standard QA preview flow (`?optly_qa=true&optimizely_x=<experimentId>&optimizely_log=debug`).
