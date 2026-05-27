# Go Live

Removes the QA Audience from the experiment so it serves the whole audience matching the URL. **One-way action** — once live, traffic flows.

`$ARGUMENTS` is optional. If non-empty, it's used as the experiment ID (otherwise reads from `.experiment-id`).

## Steps

1. **Resolve the experiment ID.**
   - If `$ARGUMENTS` is a numeric string, use it as the experiment ID.
   - Otherwise, read `.experiment-id` from the repo root. If it doesn't exist, tell the user to run `/create` first (or pass an experiment ID directly), and stop.

2. **Read the config** (`.claude/optimizely.json`) — you need `project_id` and `qa_audience_id`.

3. **Query the experiment's current state** to confirm what we're about to change. Use `mcp__optimizely-experimentation__exp_execute_query` with the same shape as `/qa` but minimal fields:

   ```json
   {
     "steps": [{
       "entity": "experiment",
       "filters": [
         { "field": "project_id", "operator": "equals", "value": "<project_id>" },
         { "field": "id", "operator": "equals", "value": "<experiment_id>" }
       ],
       "return_fields": ["id", "name", "status", "audience_conditions"],
       "limit": 1
     }]
   }
   ```

4. **Check the current state.** Based on the response:

   - If the experiment is already targeting `"everyone"` (or doesn't have the QA audience): tell the user it's already live and stop. Don't write to Optimizely.
   - If `status` is not `running`: warn that the experiment isn't running and ask if they want to also flip it to running. If they say no, stop.
   - Otherwise, proceed.

5. **Do NOT prompt for confirmation.** Running `/golive` IS the confirmation — proceed straight to the update without an `AskUserQuestion` step.

6. **Call the MCP to update the experiment.** Use `mcp__optimizely-experimentation__exp_manage_entity_lifecycle` with:

   - `operation`: `"update"`
   - `entity_type`: `"experiment"`
   - `mode`: `"direct"`
   - `project_id`: from config (as string)
   - `entity_id`: the experiment ID (as string) — required top-level parameter
   - `template_data`: a JSON-stringified object:

     ```json
     {
       "audience_conditions": "everyone",
       "status": "running"
     }
     ```

   The string `"everyone"` (not a JSON-stringified condition) is what Optimizely uses for "target all visitors."

7. **Verify the response.** If the MCP returns an error, surface the full error and stop — do NOT report success.

8. **Report.** Single block:

   ```
   Live: <experiment name>
     ID:          <experiment_id>
     Audience:    everyone
     Status:      running
     URL:         <page_url>
     Optimizely:  https://app.optimizely.com/v2/projects/<project_id>/experiments/<experiment_id>
   ```

## Notes

- This is a one-way action. To pause or roll back, the user should go to the Optimizely UI and pause/archive the experiment directly.
- This command does NOT delete the experiment or touch the variant code. Going live just swaps which audience can see it.
- `.experiment-id` stays pointing at this experiment. The user can run `/qa` post-launch to monitor.
