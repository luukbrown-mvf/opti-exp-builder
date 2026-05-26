# QA Status Check

Shows the current state of the most recently pushed experiment in Optimizely. Use this right before `/golive` to confirm Optimizely actually has what you tested locally.

`$ARGUMENTS` is optional. If non-empty, it's used as the experiment ID (otherwise reads from `.experiment-id`).

## Steps

1. **Resolve the experiment ID.**
   - If `$ARGUMENTS` is a numeric string, use it as the experiment ID.
   - Otherwise, read `.experiment-id` from the repo root. If it doesn't exist, tell the user to run `/push` first (or pass an experiment ID directly), and stop.

2. **Read the config** (`.claude/optimizely.json`) — you need `project_id` and `qa_audience_id` to render the report.

3. **Query the experiment from MCP.** Use `mcp__optimizely-experimentation__exp_execute_query` with:

   ```json
   {
     "steps": [{
       "entity": "experiment",
       "filters": [
         { "field": "project_id", "operator": "equals", "value": "<project_id>" },
         { "field": "id", "operator": "equals", "value": "<experiment_id>" }
       ],
       "return_fields": ["id", "name", "status", "audience_conditions", "page_ids", "url_targeting", "variations", "metrics", "last_modified", "earliest"],
       "limit": 1
     }]
   }
   ```

   If you need to call `exp_get_schemas` for `experiment` first (per the MCP's rules), do so.

4. **Interpret the response.** From the single experiment result, extract:

   - **Name** and **ID**
   - **Status**: `running`, `paused`, `not_started`, `archived`, `concluded`
   - **Audience**: parse `audience_conditions` — if it contains the `qa_audience_id` from config, label as "QA-gated"; if it equals `"everyone"`, label as "Live (everyone)". Anything else, show the raw value.
   - **URL targeting**: from `url_targeting.edit_url` (and `url_targeting.conditions` if present)
   - **Variations**: list each with its name, weight (as percentage), and a count of changes. Don't print the full JS/CSS — just confirm the change count.
   - **Metrics**: list each by name (resolve via secondary `exp_execute_query` on `event` entity if needed) in order — note that the first metric is the **primary**.
   - **Earliest** (first activated) and **last_modified**.

5. **Report.** Render as:

   ```
   Experiment: <name>
     ID:           <id>
     Status:       <status>
     Audience:     <QA-gated | Live (everyone) | other>
     URL:          <edit_url>
     Started:      <earliest>
     Last modified: <last_modified>

   Variations:
     1. Original — 50%, 0 changes
     2. Variation 1 — 50%, 2 changes (1 CSS, 1 JS)

   Metrics (in order):
     1. <name>  [primary]
     2. <name>
     ...

   QA URL: <edit_url>?optly_qa=true&optimizely_x=<id>&optimizely_log=debug
   ```

   At the bottom, if status is `running` and audience is `QA-gated`, add: `Ready to /golive when you're happy.`
   If audience is `Live (everyone)`, add: `Already live.`
   If status is `paused` or `not_started`, flag it: `Not running — investigate before going live.`

## Notes

- Read-only — this command never mutates state in Optimizely.
- The "change count" is a sanity check, not a code review. Use the Optimizely deep link if you need to inspect the actual JS/CSS Optimizely has.
