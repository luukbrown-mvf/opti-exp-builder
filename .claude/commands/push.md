# Push to Optimizely

Creates a new A/B experiment in Optimizely (MVF Global - Capture Edge) using the current `page/changes.js` and `page/changes.css`. Attaches the QA Audience, picks a metric pack based on page type (advertorial or STF), and starts the experiment as QA-gated. The team QAs by visiting the page URL with `?optly_qa=true`.

`$ARGUMENTS` is optional. If non-empty, it's used as the experiment URL.

## Prerequisites

- `page/index.html` exists (i.e. user has run `/fetch <url>`)
- `page/changes.js` and `page/changes.css` exist
- `.claude/optimizely.json` exists
- The Optimizely Experimentation MCP (`optimizely-experimentation`) is authenticated. If not, tell the user to run `/mcp` and authenticate, then re-run `/push`.

## Steps

1. **Validate prerequisites.** If anything in the list above is missing, report what's missing and stop. Do NOT proceed with partial state.

2. **Read the config.** Load `.claude/optimizely.json`. You'll need `project_id`, `qa_audience_id`, `default_owner_initials`, `default_team`, `metric_packs.advertorial`, `metric_packs.stf`.

3. **Gather inputs from the user using `AskUserQuestion`:**

   - **URL of the page.** If `$ARGUMENTS` is empty, prompt for the URL. Tell the user: "Paste the full URL of the page this experiment targets." Do NOT try to recover the URL from `page/index.html` — the `<base>` tag only stores the origin, not the path.
   - **Page type.** Single-select: `Advertorial` or `STF (Straight to Form)`. This determines which metric pack to attach.
   - **Change description.** Free text (e.g. "CTA Updates", "Direct Response V2", "Simplify Overlay").
   - **Audience segment.** Free text (e.g. "B2C RoW", "AME B2B").
   - **Vertical / Subcat.** Free text (e.g. "Hearing Aids UK", "Telephone Systems US").
   - Team and initials default from config — do NOT ask unless the user explicitly wants to override.

4. **Construct the experiment name.** Pattern: `{change} - {audience} - {vertical} - {team} - {initials}`. Example: `CTA Updates - B2C RoW - Hearing Aids UK - Websites Team - LB`. Use this exact pattern — the team's reporting depends on it.

5. **Load the variant code** from `page/changes.js` and `page/changes.css`. Read them with the `Read` tool. Keep both as exact strings — do NOT trim, reformat, or transform.

6. **Build the metric pack array.** Take the chosen pack from config (`metric_packs.advertorial` or `metric_packs.stf`). For each entry, convert to the MCP shape:

   ```
   { "event_id": <integer>, "aggregator": "<aggregator>", "scope": "<scope>", "winning_direction": "<winning_direction>" }
   ```

   Note: `event_id` must be an **integer** (not string) when passed to the MCP, even though the config stores it as a string for readability.

7. **Call the MCP to create the experiment.**

   Use `mcp__optimizely-experimentation__exp_manage_entity_lifecycle` with:

   - `operation`: `"create"`
   - `entity_type`: `"experiment"`
   - `mode`: `"direct"`
   - `project_id`: the project_id from config (as string)
   - `template_data`: a JSON-stringified object with the shape below:

     ```json
     {
       "project_id": <project_id as integer>,
       "name": "<constructed name>",
       "description": "<change description>",
       "type": "a/b",
       "status": "running",
       "audience_conditions": "[\"and\", {\"audience_id\": <qa_audience_id as integer>}]",
       "page": {
         "ref": {
           "auto_create": true,
           "template": {
             "name": "<the URL>",
             "edit_url": "<the URL>",
             "activation_type": "immediate"
           }
         }
       },
       "variations": [
         { "name": "Original", "weight": 5000, "actions": [] },
         {
           "name": "Variation 1",
           "weight": 5000,
           "actions": [{
             "changes": [
               { "type": "custom_css", "value": "<changes.css contents>" },
               { "type": "custom_code", "value": "<changes.js contents>" }
             ]
           }]
         }
       ],
       "metrics": [ <metric pack entries> ]
     }
     ```

   The order of metrics in the array matters — Optimizely treats the first metric as the **primary** metric for the experiment. Preserve the order from `optimizely.json`.

8. **Handle the response.**

   - If the MCP returns success, extract the new experiment's `id`.
   - If it returns an error, surface the full error message and stop. Do NOT write any local state.

9. **Save the experiment ID.** Write the experiment ID (as a plain string with no whitespace or quotes) to `.experiment-id` in the repo root.

10. **Report.** Print a single tight block:

    ```
    Pushed: <experiment name>
      ID:        <experiment_id>
      Optimizely: https://app.optimizely.com/v2/projects/<project_id>/experiments/<experiment_id>
      QA URL:    <page_url>?optly_qa=true&optimizely_x=<experiment_id>&optimizely_log=debug

    Status: running, QA-gated (audience: QA Audience).
    Open the QA URL in your browser to verify. When happy, run /golive.
    ```

## Notes

- This command does NOT modify `page/changes.js` or `page/changes.css` — they stay in git for review and historical record.
- If you've already pushed an experiment, running `/push` again creates a NEW experiment with a new ID. The old experiment is untouched. `.experiment-id` is overwritten to point at the new one.
- Optimizely auto-creates the Page entity from the URL on first use. Subsequent experiments for the same URL reuse that Page (matched by name).
- The Original (control) variation has empty `actions` — visitors in control see the unmodified page. Only Variation 1 carries the JS/CSS.
- Make sure to JSON-stringify the inner objects when passing `template_data` and `audience_conditions` — those fields expect strings, not nested objects.
