# Create Experiment in Optimizely

Creates a new A/B experiment in Optimizely (MVF Global - Capture Edge) using the current `page/changes.js` and `page/changes.css`. Attaches the QA Audience, picks a metric pack based on page type (advertorial or STF), and starts the experiment as QA-gated. After creating, also reports the current Optimizely state of the experiment (same info as `/qa`). The team QAs by visiting the page URL with `?optly_qa=true`.

`$ARGUMENTS` is optional. If non-empty, it's used as the experiment URL.

## Prerequisites

- `page/index.html` exists (i.e. user has run `/fetch <url>`)
- `page/changes.js` and `page/changes.css` exist
- `.claude/optimizely.json` exists
- `.env` exists at repo root with `TEAM_NAME`, `EXPERIMENTER_INITIALS`, `AUDIENCE_SEGMENT` set. If `.env` is missing or any of the three is absent/empty, `/create` will prompt for them and write the file itself — no manual setup required.
- The Optimizely Experimentation MCP (`optimizely-experimentation`) is authenticated. If not, tell the user to run `/mcp` and authenticate, then re-run `/create`.
- **`.experiment-id` does NOT exist** (or is empty). If it already points at an experiment, stop and tell the user: *"An experiment is already tracked (`.experiment-id` = `<id>`). Run `/republish` to push changes to it, or delete `.experiment-id` first if you really want a fresh experiment."* Do NOT silently overwrite.

## Steps

1. **Validate prerequisites.** If anything in the list above is missing, report what's missing and stop. Do NOT proceed with partial state.

2. **Read config and env.**
   - Load `.claude/optimizely.json`. You'll need `project_id`, `qa_audience_id`, `metric_packs.advertorial`, `metric_packs.stf`.
   - Load `.env` if it exists (parse each non-comment `KEY=VALUE` line, trim surrounding whitespace; values may contain spaces and are NOT quoted). Read `TEAM_NAME`, `EXPERIMENTER_INITIALS`, `AUDIENCE_SEGMENT`.
   - **For each of those three that is missing or empty, prompt the user via `AskUserQuestion` with realistic example options so they don't have to invent values from scratch. Ask all the missing ones in a SINGLE `AskUserQuestion` call (it accepts up to 4 questions per call) — do NOT prompt one at a time.** Suggested option lists:
     - `TEAM_NAME` (`header: "Team"`): `Websites Team`, `Brand Team`, `Performance Team`.
     - `EXPERIMENTER_INITIALS` (`header: "Initials"`): two- or three-letter combos based on the user's name if known (e.g. for "Luuk Brown": `LB`); otherwise leave it to the "Other" free-text option.
     - `AUDIENCE_SEGMENT` (`header: "Audience"`): `B2C RoW`, `B2C US`, `AME B2B`, `EMEA B2B`.
   - After collecting answers, **write `.env`** at the repo root with the resolved values, one `KEY=VALUE` per line, no quotes. If the file already exists with partial values, rewrite it with the complete set. (`.env` is gitignored — safe to overwrite.) Don't re-prompt the user on subsequent `/create` runs as long as all three are populated.

3. **Gather remaining inputs from the user using `AskUserQuestion`.** Collect these in as few `AskUserQuestion` calls as possible — each call accepts up to 4 questions, so do NOT prompt one field at a time. Before prompting, read `page/changes.js` and `page/changes.css` once (you'll reuse those exact contents in step 5) so the hypothesis draft below is ready to offer. Suggested batching: one call for URL + page type + vertical + change name (drop the URL question if `$ARGUMENTS` already supplied it), then a second call for the hypothesis (it needs its own AI-drafted option plus a "Skip" sibling). The fields:

   - **URL of the page.** If `$ARGUMENTS` is empty, prompt for the URL. Tell the user: "Paste the full URL of the page this experiment targets." Do NOT try to recover the URL from `page/index.html` — the `<base>` tag only stores the origin, not the path.
   - **Page type.** Single-select: `Advertorial` or `STF (Straight to Form)`. This determines which metric pack to attach.
   - **Vertical / Subcat.** Free text (e.g. "Hearing Aids UK", "Telephone Systems US").
   - **Change name (required).** Free text — short label for the experiment that goes into the name (e.g. "CTA Updates", "Direct Response V2", "Simplify Overlay"). This is NOT optional — without it the experiment name is meaningless to the team.
   - **Hypothesis / description (optional).** This is the Optimizely experiment `description` field. Pre-generate a draft from the actual edits in `page/changes.js` and `page/changes.css` (read them and infer what behaviour or framing changed). The draft **MUST** follow this exact three-clause structure with the literal words `If`, `then`, and `A win would be` present verbatim:

     > **If** [the change we made], **then** [the predicted user behaviour]. **A win would be** [the plain-language CRO outcome].

     Example: `If we reframe the grid CTAs from "explore your options" to "see what you qualify for", then users will perceive the form as a personal qualification check and start it more often. A win would be an increase in conversion rate.`

     Frame the "win" in plain CRO language — "an increase in conversion rate", "more form starts", "higher lead volume". **Do NOT reference Optimizely metric names** (no "Custom - Final Conversion", no "Custom - Completed First Question" etc.) — keep the hypothesis readable to non-technical stakeholders. Offer the draft as the suggested option in the prompt, with "Skip" as a sibling option so the user can leave the description blank. If the user picks the AI draft, send that as the description; if they skip, send an empty string.
   - Audience, team, and initials come from `.env` — do NOT ask unless missing from env.

4. **Construct the experiment name.** Pattern: `{change name} - {audience} - {vertical} - {team} - {initials}` — e.g. `CTA Updates - B2C RoW - Hearing Aids UK - Websites Team - LB`. The team's reporting depends on this pattern. Don't reorder fields.

5. **Load the variant code** from `page/changes.js` and `page/changes.css`. If you already read them in step 3 to draft the hypothesis, reuse those exact contents — don't re-read. Otherwise read them with the `Read` tool. Keep both as exact strings — do NOT trim, reformat, or transform.

6. **Build the metric pack array.** Take the chosen pack from config (`metric_packs.advertorial` or `metric_packs.stf`). For each entry, convert to the MCP shape:

   ```
   { "event_id": <integer>, "aggregator": "<aggregator>", "scope": "<scope>", "winning_direction": "<winning_direction>" }
   ```

   Note: `event_id` must be an **integer** (not string) when passed to the MCP, even though the config stores it as a string for readability.

7. **Call the MCP to create the experiment.**

   Use `mcp__optimizely-experimentation__exp_manage_entity_lifecycle` with:

   - `operation`: `"create"`
   - `entity_type`: `"experiment"`
   - `mode`: `"template"` (direct mode is not implemented for experiments — the MCP returns `"Creation not yet implemented for entity type: 'experiment'"`)
   - `template_id`: `"experiment"`
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
           "name": "Variation #1",
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

   - If the MCP returns success, extract the new experiment's `id` from `data.createdEntities[]` where `entityType === "experiment"`.
   - If it returns an error, surface the full error message and stop. Do NOT write any local state.

9. **Save the experiment ID.** Write the experiment ID (as a plain string with no whitespace or quotes) to `.experiment-id` in the repo root.

9a. **Convert to UI-shaped `url_targeting` (CRITICAL for the experiment to actually run).** The MCP's `page.ref.auto_create` path creates a top-level Page entity referenced via `page_ids`, with no `url_targeting` block. UI-created experiments use a per-experiment `url_targeting` block (which auto-creates a dedicated "URL Targeting for …" Page on the fly). Without `url_targeting`, the experiment can fail to activate even when the page has conditions — and the structure won't match anything else in the project.

    Run two follow-up updates against the experiment (`exp_manage_entity_lifecycle`, `operation="update"`, `entity_type="experiment"`, `mode="direct"`):

    **Update A — set `url_targeting`** (omit the `key` field; the API rejects long keys, and Optimizely auto-generates one from the experiment name):

    ```json
    {
      "url_targeting": {
        "page_id": <ignored on first set; the API will auto-create a per-experiment URL-targeting page>,
        "edit_url": "<the URL>",
        "activation_type": "immediate",
        "conditions": "[\"and\", [\"or\", {\"match_type\": \"simple\", \"type\": \"url\", \"value\": \"<the URL>\"}]]"
      },
      "variations": [
        { "variation_id": <Original variation_id>, "name": "Original",     "weight": 5000 },
        { "variation_id": <Variation #1 variation_id>, "name": "Variation #1", "weight": 5000 }
      ]
    }
    ```

    The response will contain `url_targeting.page_id` — that's the NEW per-experiment page Optimizely just created. **Capture this `new_page_id`.** The setting of `url_targeting` wipes `variations[*].actions`, which is why update B follows.

    **Update B — re-attach variation actions** using `new_page_id`:

    ```json
    {
      "variations": [
        { "variation_id": <Original variation_id>,     "name": "Original",     "weight": 5000, "actions": [{"page_id": <new_page_id>, "changes": []}] },
        { "variation_id": <Variation #1 variation_id>, "name": "Variation #1", "weight": 5000, "actions": [{"page_id": <new_page_id>, "changes": [
          {"type": "custom_css",  "value": "<changes.css contents>"},
          {"type": "custom_code", "value": "<changes.js contents>"}
        ]}] }
      ]
    }
    ```

    After this, the experiment matches UI-created experiments structurally: inline `url_targeting`, dedicated URL-targeting page, `Variation #1` naming, variation actions wired to the URL-targeting page.

    Note: this leaves the original auto-created page (the one referenced by `page_ids` from the initial create) orphaned. It's harmless — leave it.

9b. **Start the experiment.** The `status: "running"` field in `template_data` is **ignored on create** — the experiment comes back as `not_started`. Immediately follow up with an update call to flip it to `running`:

    ```
    mcp__optimizely-experimentation__exp_manage_entity_lifecycle(
      operation="update",
      entity_type="experiment",
      entity_id=<experiment_id>,
      mode="direct",
      project_id=<project_id>,
      template_data='{"status":"running"}'
    )
    ```

    The update response returns the full experiment state — use it for the verification step below instead of re-querying.

9c. **Launch the propagation poller (background, detached).** Initial `/create` auto-publishes because `not_started → running` is the publish-trigger code path. The snippet then takes ~3 minutes to roll the new variation code through Optimizely's CDN. Launch `app/wait-for-live.sh` (Playwright-based real-browser check that opens Chrome incognito on detection) **fully detached** with `nohup … & disown` so it outlives the Claude session AND so the chat isn't blocked / spammed with poll lines. The user just wants Chrome to pop — they don't want to watch a Claude spinner.

    Pick a `marker`: a unique substring from `page/changes.css` or `page/changes.js` guaranteed to appear in the rendered page after Optimizely applies the variation. In order of preference:
    1. First hex color in `page/changes.css` (e.g. `#ff0066`)
    2. Any unique CSS selector + property combination unlikely to be on the original page
    3. A distinctive string literal from `page/changes.js` (e.g. the new headline text)

    Launch via Bash (do NOT use `run_in_background: true` — that ties the job to the Claude harness which kills it on session end). Build a QA URL per **non-Original** variation — each of shape `<the URL>?optly_qa=true&optimizely_x=<that variation_id>&optimizely_log=debug`. Arg 1 is the **gate** URL the poller polls for the marker (use the variation that carries the marker — normally Variation #1). After the marker, list **every** variation's QA URL — `wait-for-live.sh` opens them as tabs in ONE incognito window. For a standard single-variant `/create` the gate and the lone tab are the same Variation #1 URL (one tab — unchanged from before):

    ```
    nohup ./app/wait-for-live.sh \
      "<gate QA URL — the variation carrying the marker, normally Variation #1>" \
      "<marker>" \
      "<QA URL for Variation #1>" \
      > /tmp/optly-wait-<experiment_id>.out 2>&1 < /dev/null &
    disown
    ```

    For an A/B/n test, append one more QA URL line per extra variation (`"<QA URL for Variation #2>" \`, etc.) before the redirect — they all open as tabs in the single window. Don't add the Original/control unless you specifically want to eyeball it.

    In the report tell the user: "Chrome incognito will pop in ~3 min. If it doesn't, `tail /tmp/optly-wait.log`."

10. **Verify what was actually persisted — reuse the step 9b response, don't re-query by default.** The `status`-flip update in step 9b returns the full experiment state (variations with their `variation_id`s, `url_targeting`, `metrics`, `status`, `audience_conditions`). Use that response directly for the report below — it's authoritative and saves a round-trip. **Only** fall back to the `mcp__optimizely-experimentation__exp_execute_query` call below if the 9b response is missing any of those fields:

    ```json
    {
      "steps": [{
        "entity": "experiment",
        "filters": [
          { "field": "project_id", "operator": "equals", "value": "<project_id>" },
          { "field": "id", "operator": "equals", "value": "<experiment_id>" }
        ],
        "return_fields": ["id", "name", "status", "audience_conditions", "url_targeting", "variations", "metrics"],
        "limit": 1
      }]
    }
    ```

    From the result, derive:
    - Audience label: `QA-gated` if `audience_conditions` references `qa_audience_id` from config, else show raw value.
    - Variation summary: name, weight as percentage, count of changes (split by type — CSS vs JS).
    - Metric names: map each `event_id` in the experiment's `metrics` array to its `name` in the metric pack you loaded from `.claude/optimizely.json` in step 2 (every metric you attached came from that pack, so the name is always there — do NOT query the `event` entity). Use the order from the experiment's `metrics` array — the first is **primary**.
    - URL: from `url_targeting.edit_url`.
    - **Variant `variation_id` (NOT the experiment ID).** The QA URL's `optimizely_x` parameter must be the `variation_id` of the variation you want to preview (typically `Variation 1`, not `Original`). Using the experiment ID won't force the variant.

11. **Report.** Print this combined block:

    ```
    Created: <experiment name>
      ID:          <experiment_id>
      Status:      <status>
      Audience:    <QA-gated | other>
      URL:         <edit_url>
      Optimizely:  https://app.optimizely.com/v2/projects/<project_id>/experiments/<experiment_id>
      QA URL:      <edit_url>?optly_qa=true&optimizely_x=<variation_1_variation_id>&optimizely_log=debug

    Variations:
      1. Original — 50%, 0 changes
      2. Variation 1 — 50%, <n> changes (<x> CSS, <y> JS)

    Metrics (in order):
      1. <name>  [primary]
      2. <name>
      ...

    Open the QA URL in your browser to verify. When happy, run /golive.
    ```

    If anything in the verification step looked wrong (audience not QA-gated, metric count mismatch, variation changes empty when they shouldn't be), surface the discrepancy at the bottom of the report so the user can fix it via the Optimizely UI before going live.

## Notes

- This command does NOT modify `page/changes.js` or `page/changes.css` — they stay in git for review and historical record.
- If you've already created an experiment, running `/create` again creates a NEW experiment with a new ID. The old experiment is untouched. `.experiment-id` is overwritten to point at the new one.
- Optimizely auto-creates the Page entity from the URL on first use. Subsequent experiments for the same URL reuse that Page (matched by name).
- The Original (control) variation has empty `actions` — visitors in control see the unmodified page. Only Variation 1 carries the JS/CSS.
- Make sure to JSON-stringify the inner objects when passing `template_data` and `audience_conditions` — those fields expect strings, not nested objects.
- The verification + report step (10–11) is the same data `/qa` returns. `/qa` exists as a standalone command for checking experiments later (e.g. before `/golive` after a break, or to inspect an experiment by ID).
