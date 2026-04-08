---
name: rb:review
description: |
  Audit the Rayburst feature atlas for cleanup and alignment issues — empty wrappers,
  duplicate criteria, stale descriptions — and apply changes one at a time with user approval.
  Triggers: "rb review", "rayburst review", "audit rayburst", "clean up rayburst", "review atlas".
user-invocable: true
---

# rb:review — Atlas Cleanup & Alignment

Audit every feature and criterion in the Rayburst registry. For each proposed change,
show the user a clear before/after diff using AskUserQuestion with icons and color labels,
then apply only the approved ones. Skip any the user declines.

## MCP Tool Prefix

All MCP tools use: `mcp__plugin_rayburst_rayburst__`

---

## CRITICAL RULES

1. **One change per AskUserQuestion prompt** — never batch multiple proposals together.
2. **Never apply a change without user approval** — every write, update, or delete requires an explicit "Apply" answer.
3. **Never delete a feature or criterion** that the user skips — move immediately to the next proposal.
4. **Present proposals in this order**: deletions first (highest impact), then updates, then additions.

---

## Icon & Color Legend (use consistently in every proposal)

| Symbol | Meaning          | Use for                                      |
|--------|------------------|----------------------------------------------|
| 🗑️     | DELETE (red)     | Removing a feature or criterion              |
| ✏️     | UPDATE (yellow)  | Changing description, title, or status       |
| ➕     | ADD (green)      | Adding a new criterion to an existing feature|
| ℹ️     | INFO (blue)      | Context shown to the user, no action needed  |

Always prefix the AskUserQuestion `question` text with the relevant icon and a short action label in CAPS, e.g.:
- `🗑️ DELETE — "Resume / Continue Watching" feature`
- `✏️ UPDATE — criterion in "Watch Progress"`
- `➕ ADD — criterion to "Continue Watching Card"`

---

## Workflow

### Step 1: Fetch the Full Atlas

Call `rb_list_features` with no filters to get all features for the configured project(s).
For each feature, call `rb_get_feature` to load its full acceptance criteria.

While loading, show a status message: "Auditing Rayburst atlas…"

---

### Step 2: Analyse — Build a Change Queue

Scan every feature and criterion for the following issues. Build an ordered list of proposed
changes (the **change queue**). Do NOT apply any changes yet.

#### Issue Types

**🗑️ DELETE — Empty wrapper features**
A feature with 0 acceptance criteria whose sole purpose is grouping via wikilinks.
It adds navigation noise without adding testable behavior — all its linked features
already cross-reference each other. Propose deletion.

*Preview format:*
```
Feature: "<title>"
Criteria: 0
Description: <first 120 chars of description>…
Reason: Empty wrapper — no testable behavior. All child features link to each other directly.
```

**🗑️ DELETE — Duplicate criterion**
Two criteria in the same feature (or across related features) that describe the
same behavior in nearly identical Given/When/Then terms.
Keep the criterion in the feature that owns the behavior; propose deleting the other.

*Preview format:*
```
Feature: "<title>"
Criterion (to remove):
  "<existing description>"

Kept in: "<other feature title>"
Reason: Same behavior already captured there.
```

**✏️ UPDATE — Stale criterion**
A criterion whose description no longer matches the codebase (e.g. it describes
behavior that was changed by a recent implementation). Show the old text and the
proposed new text.

*Preview format:*
```
Feature: "<title>"

BEFORE:
  "<old description>"

AFTER:
  "<new description>"

Reason: <one-line explanation of what changed>
```

**✏️ UPDATE — Thin feature description**
A feature description that is missing key behavioral context (e.g. says nothing about
filtering rules, threshold values, or data sources that the code clearly implements).
Propose an enriched description.

*Preview format:*
```
Feature: "<title>"

BEFORE:
  "<old description>"

AFTER:
  "<new description>"

Reason: Description doesn't capture <what's missing>.
```

**➕ ADD — Missing criterion**
A behavior clearly present in the codebase that has no corresponding criterion in
any feature. Propose adding it to the most appropriate feature.

*Preview format:*
```
Feature: "<title>"

NEW CRITERION:
  "<Given/When/Then text>"

Reason: <one-line explanation of the behavior being captured>
```

---

### Step 3: Present Changes One at a Time

For each item in the change queue, call **AskUserQuestion** with:

- **question**: `<icon> <ACTION> — <short description of the change>`
- **header**: one of `Delete`, `Update`, `Add`
- **options**: always exactly these two:

  | Label | Description |
  |-------|-------------|
  | `Apply` | Apply this change to the Rayburst registry |
  | `Skip` | Leave it as-is and move to the next proposal |

- **preview** on each option: show a formatted before/after or full context block so the
  user can compare without having to remember the details.

**Wait for the user's answer before proceeding.**

- If **Apply** → execute the appropriate MCP call (`rb_update_feature`, `rb_update_criterion`,
  `rb_add_criterion`, `rb_delete_criterion`, `rb_delete_feature`) and confirm success with a
  one-line acknowledgement before presenting the next change.
- If **Skip** → acknowledge with a one-line "Skipped." and immediately present the next change.

---

### Step 4: Summary

After all proposals have been presented, output a compact summary:

```
✅ Atlas review complete.

Applied  : <N> changes
Skipped  : <N> changes

Applied:
  🗑️ Deleted "Resume / Continue Watching" (empty wrapper)
  ✏️ Updated criterion in "Watch Progress" (TV save presence signal)
  …

Skipped:
  ➕ Add criterion to "Continue Watching Card" (next-episode advance)
  …
```

If the change queue was empty, output:

```
ℹ️ Atlas looks clean — no issues found.
```

---

## Constraints

- **One question per turn** — never batch multiple proposals into a single AskUserQuestion call.
- **Read before writing** — always base proposals on the actual fetched atlas data, never on assumptions.
- **Only propose changes for the configured project(s)** — do not touch features from other projects.
- **Preserve criterion IDs** — when updating, always use `rb_update_criterion` with the existing
  `criterionId`; never delete-and-recreate.
