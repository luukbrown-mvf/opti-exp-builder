# Republish

Pushes the current `page/changes.css` and `page/changes.js` to the already-created Optimizely experiment, forces a publish via the `pause → running` cycle, and auto-opens the QA URL in Chrome incognito once propagation completes.

Use this whenever you've tweaked the variation code after the initial `/create` and want the changes live for QA. Same experiment, same ID — no new entity is created.

`$ARGUMENTS` is optional. If non-empty, it's used as the experiment ID (otherwise reads from `.experiment-id`).

## Prerequisites

- `page/changes.js` and `page/changes.css` exist
- `.claude/optimizely.json` exists
- `.experiment-id` exists at repo root (or `$ARGUMENTS` is a numeric experiment ID). If neither, stop and tell the user to run `/create` first.
- The Optimizely Experimentation MCP (`optimizely-experimentation`) is authenticated.

## Why the pause → running cycle?

The Optimizely MCP intentionally writes to **draft** for variation updates — it has no `publish` operation. The only way to trigger a real publish via the MCP is a structural state transition that's recognised by Optimizely's publish pipeline. **Pause → Running** is the cheap, safe one to use:

- It bumps the "Last published" timestamp in the UI (verified).
- The new variation code lands in the live snippet within ~3 min (verified).
- It's a no-op to the experiment itself (still running with the same variations + audience after the cycle).

Do NOT skip the cycle — a plain update sits in draft forever.

## Steps

1. **Validate prerequisites.** Read `.experiment-id` (or take `$ARGUMENTS`). Load `.claude/optimizely.json` for `project_id` and `qa_audience_id`.

2. **Fetch the current experiment state.** Need `variation_id` for each variation, `url_targeting.page_id`, `url_targeting.edit_url`, `name`. Use `mcp__optimizely-experimentation__exp_execute_query`:

   ```json
   {
     "steps": [{
       "entity": "experiment",
       "filters": [
         { "field": "project_id", "operator": "equals", "value": "<project_id>" },
         { "field": "id", "operator": "equals", "value": "<experiment_id>" }
       ],
       "return_fields": ["id", "name", "status", "variations", "url_targeting"],
       "limit": 1
     }]
   }
   ```

   Capture: Original `variation_id`, Variation #1 `variation_id`, `url_targeting.page_id`, `url_targeting.edit_url`, AND the full list of all other variation IDs (archived ones included). You'll need them all in the next step.

   If the experiment is `archived` or `concluded`, stop and report — don't republish a finished experiment.

3. **Read the latest variation code** from `page/changes.css` and `page/changes.js` with the `Read` tool. Exact strings, no transformation.

4. **Push the variation update.** `mcp__optimizely-experimentation__exp_manage_entity_lifecycle`, `operation: "update"`, `entity_type: "experiment"`, `entity_id: <experiment_id>`, `mode: "direct"`, with `template_data`:

   ```json
   {
     "variations": [
       { "variation_id": <Original variation_id>,     "name": "Original",     "weight": 5000, "actions": [{"page_id": <url_targeting.page_id>, "changes": []}] },
       { "variation_id": <Variation #1 variation_id>, "name": "Variation #1", "weight": 5000, "actions": [{"page_id": <url_targeting.page_id>, "changes": [
         {"type": "custom_css",  "value": "<changes.css contents>"},
         {"type": "custom_code", "value": "<changes.js contents>"}
       ]}] }
     ]
   }
   ```

   Important: include **every variation that exists on the experiment**, including any archived ones (e.g. legacy `_publish_trigger`) — keep them in the array exactly as fetched in step 2, with `"archived": true` and `"actions": []`. Omitting them causes Optimizely to error with `"You cannot delete a published variation"` (400). Just don't *mutate* their content.

5. **Trigger the publish via pause → running cycle.** Two MCP calls back-to-back:

   ```
   exp_manage_entity_lifecycle(operation="update", entity_type="experiment", entity_id=<id>, mode="direct", project_id=<pid>, template_data='{"status":"paused"}')
   exp_manage_entity_lifecycle(operation="update", entity_type="experiment", entity_id=<id>, mode="direct", project_id=<pid>, template_data='{"status":"running"}')
   ```

   These can be ~10s apart, no wait needed in between. The second call's response confirms `status: "running"` and updates `last_modified` — this is the "Last published" timestamp in the UI.

6. **Pick a detection marker** for the snippet poller. Inspect `page/changes.css` and `page/changes.js`:
   - First preference: first hex color in `changes.css` (e.g. `#ff0066`).
   - Second preference: a unique CSS selector + property (e.g. `transform: rotate(-2deg)`).
   - Third: a distinctive new string literal in `changes.js` (e.g. updated headline text).

   The marker must be a substring guaranteed to appear in `document.documentElement.outerHTML` after Optimizely applies the variation. If the only change is removing/hiding content (no positive marker), use the previously-published positive marker from the last republish — failing that, fall back to a 60s wait + manual check.

7. **Launch the propagation poller (background, detached).** Use `app/wait-for-live.sh` (Playwright-based real-browser check that opens Chrome incognito on detection). Launch **fully detached** with `nohup … & disown` so it outlives the Claude session AND so the chat isn't blocked / spammed with poll lines. The user just wants Chrome to pop — they don't want to watch a Claude spinner.

   ```
   nohup ./app/wait-for-live.sh \
     "<url_targeting.edit_url>?optly_qa=true&optimizely_x=<Variation #1 variation_id>&optimizely_log=debug" \
     "<marker>" \
     > /tmp/optly-wait-<experiment_id>.out 2>&1 < /dev/null &
   disown
   ```

   Do NOT use `run_in_background: true` on the Bash tool — that ties the process to the Claude harness, which kills it when the session ends.

8. **Report.** One block:

   ```
   Republished: <experiment name>
     ID:         <experiment_id>
     Marker:     <marker>
     QA URL:     <edit_url>?optly_qa=true&optimizely_x=<variation_1_variation_id>&optimizely_log=debug
     Optimizely: https://app.optimizely.com/v2/projects/<project_id>/experiments/<experiment_id>

   Chrome incognito will pop open with the QA URL when propagation completes (~3 min).
   If it doesn't pop within 10 min, check /tmp/optly-wait.log to see what's wrong.
   ```

## Notes

- This command is for **updating an existing experiment**, not creating a new one. To start a brand-new experiment, delete `.experiment-id` and run `/create`.
- The pause→running cycle takes ~10 seconds total — the experiment is briefly paused, so any real traffic during that window will see Original. For QA-gated experiments this is invisible; for `everyone` audiences avoid republishing during peak traffic.
- Don't touch the archived `_publish_trigger` or any other archived placeholder variation. Optimizely refuses to delete them; we just leave them alone.
- Audience, metrics, name, URL targeting are unchanged by this command. Edit those in the Optimizely UI if needed (no MCP path for those isn't true, but they're out of scope for `/republish` — this is "push the local code only").
