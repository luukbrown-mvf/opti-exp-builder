# Optimizely Experiment Builder

Build, QA, and ship Optimizely A/B tests by chatting with Claude. Describe the variant in plain English, Claude writes the JS and CSS, then `/create` creates the experiment in Optimizely directly — no copy-paste, no clicks in the UI.

## First-time setup

1. You should already have Claude Code installed (IT set it up). If you don't, get it from them.
2. Add the `chrome-devtools` MCP (Claude uses it to screenshot and inspect the live preview when something looks broken). Easiest: open Claude Code and ask it *"install the chrome-devtools MCP"*.
3. Add the **Optimizely Experimentation MCP** (needed for `/create`, `/republish`, `/qa`, `/golive`). In Claude Code, run:
   ```
   /mcp
   ```
   You should see `optimizely-experimentation` already in the list (it's configured at the repo level via `.mcp.json`). Authenticate it via the browser when prompted. One-time setup.
4. Copy `.env.example` to `.env` and fill in your personal defaults (used to build experiment names):
   ```
   TEAM_NAME=Websites Team
   EXPERIMENTER_INITIALS=LB
   AUDIENCE_SEGMENT=B2C RoW
   ```
5. That's it — Claude installs the rest (Node, Playwright, browser-sync) the first time you run `/fetch`.

## The whole flow

```
/fetch <url>  →  describe changes  →  /create  →  /republish (iterate)  →  /qa  →  /golive
```

If something looks off at any point ("the banner isn't showing", "headline looks weird"), just tell Claude — it'll auto-screenshot the page via the chrome-devtools MCP, check the console, and fix it. No command needed.

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

Claude edits `page/changes.css` (for styling) and `page/changes.js` (for behaviour). The browser live-reloads each time Claude saves. Keep iterating until you're happy. If something looks off, just tell Claude — it'll inspect the live preview and fix it.

### 3. Create the experiment in Optimizely

```
/create
```

Claude will ask:
- The full URL of the page (paste it again — the snapshot only stores the origin).
- **Page type**: Advertorial or STF (straight-to-form). This picks the metric pack.
- **Vertical/subcat** (e.g. "Hearing Aids AU").
- **Change name** (required, short label for the experiment name) and **hypothesis** (optional, AI-drafted in If/then/A win would be format).

(Team/initials/audience come from `.env`.)

Claude then creates the experiment in **MVF Global - Capture Edge** with:
- The QA Audience attached (only QA visitors see it — append `?optly_qa=true` to the page URL).
- The right metric pack (5 metrics for advertorial, 4 for STF).
- Original (50%) + Variation #1 (50%) — your CSS and JS go on Variation #1.
- Status: `running`.

Claude prints the experiment ID, Optimizely deep link, and QA URL, then **polls the snippet and pops a Chrome incognito window to the QA URL once Optimizely has propagated** (~2–3 min). You don't have to refresh anything.

### 4. Iterate on the code

Spot something off during QA? Edit `page/changes.css` / `page/changes.js`, then:

```
/republish
```

Pushes the new code to the same experiment, runs the pause→running cycle (forces Optimizely to publish; the MCP has no native publish op so this is the workaround), and again pops Chrome incognito on propagation. Run it as many times as you need.

### 5. QA in your browser

The auto-popped Chrome tab is your QA. To re-check Optimizely's stored state any time:

```
/qa
```

Shows audience, variations, metrics, status. Sanity check before going live. (Note: the QA URL uses the **variation_id** of Variation #1, not the experiment ID — `optimizely_x` forces a specific variant.)

### 6. Go live

```
/golive
```

Immediately swaps the QA Audience for `everyone` — no confirmation prompt, running `/golive` IS the confirmation. One-way action; to pause or roll back, go to the Optimizely UI.

## Commands

| Command | What it does |
|---------|--------------|
| `/fetch <url>` | Fetches a new page snapshot and ensures the preview server is running. **Leaves your JS and CSS changes untouched.** |
| `/start` | Starts the preview server manually (rarely needed — `/fetch` does it for you). |
| `/stop` | Stops the preview server. |
| `/reset` | Wipes `changes.js`, `changes.css`, and `.experiment-id` so you can start over on the same page. **Keeps the fetched page.** Does not archive the experiment in Optimizely. |
| `/create` | Creates the experiment in Optimizely with QA Audience attached. Refuses if `.experiment-id` already exists (use `/republish`). Auto-pops Chrome incognito to the QA URL on propagation. |
| `/republish` | Pushes the current `changes.css`/`changes.js` to the existing experiment, forces a publish via the pause→running cycle, auto-pops Chrome on propagation. Use this for every code tweak after `/create`. |
| `/qa` | Reports the current state of the experiment in Optimizely. |
| `/golive` | Removes the QA Audience so the experiment serves everyone. No confirmation prompt — running it IS the confirmation. |

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
| `.env` | Your personal defaults: `TEAM_NAME`, `EXPERIMENTER_INITIALS`, `AUDIENCE_SEGMENT`. Used to build the experiment name. Gitignored. |
| `.env.example` | Template for `.env`. Copy this on first setup. |
| `.experiment-id` | Last-created experiment ID. Used by `/republish`, `/qa`, `/golive`. Gitignored. |
| `app/` | Implementation files (preview server, Playwright propagation poller). Don't touch. |
| `CLAUDE.md` | Instructions Claude follows when building experiments. |

## Fallback: manual copy-paste

If the Optimizely MCP isn't available or you'd rather create the experiment in the UI:

- `page/changes.js` → paste into Optimizely's **JS** box on your variation.
- `page/changes.css` → paste into Optimizely's **CSS** box on your variation.

(Or ask Claude *"show me the final JS"* / *"show me the final CSS"* and it'll print them in the chat.)

## Optimizely tips

- Paste the **entire contents** of `changes.js` — including the wrapping `(function() { ... })();`.
- Optimizely's Custom Code runs **before** the page loads. Claude follows the right pattern automatically (`waitForElement` handles anything that loads after the initial paint).
- For QA, use Optimizely's standard QA preview flow (`?optly_qa=true&optimizely_x=<variationId>&optimizely_log=debug` — note **variation ID**, not experiment ID; `optimizely_x` is a *variation-forcing* parameter). `/create` and `/republish` print the exact URL for you.
- Variation code changes don't auto-publish via the MCP — `/republish` handles this with a `pause → running` status cycle. Propagation to the live snippet takes ~2–3 min, which is why the commands auto-pop Chrome incognito after polling.
