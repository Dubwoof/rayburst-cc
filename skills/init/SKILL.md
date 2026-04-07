---
name: rb:init
description: |
  Initialize Rayburst project config — set API key, project URL, board, and user credentials.
  Triggers: "rb init", "setup rayburst", "configure rayburst", "connect to rayburst".
user-invocable: true
---

# rb:init — Project Config Setup

Initialize `.claude/rb-config.md` with API connection details, project URL, board selection, and user credentials. Other `rb:` skills read this file automatically.

## Prerequisites

The `RAYBURST_API_KEY` environment variable must be set before the plugin's MCP server can connect. If not set, guide the user to set it.

## MCP Tool Prefix

All MCP tools in this skill use the prefix: `mcp__plugin_rayburst_rayburst__`

Example: `mcp__plugin_rayburst_rayburst__rb_ping`

---

## Workflow

### Step 1: Check for Existing Config

Attempt to read `.claude/rb-config.md`.

**If the file exists**, show the user its current contents and ask:

```
A config file already exists at .claude/rb-config.md.

What would you like to do?
  overwrite — Replace the entire file with new values
  update    — Keep existing values, edit specific entries
  cancel    — Exit without changes

Reply with: overwrite / update / cancel
```

- **cancel** → stop immediately, print "No changes made."
- **overwrite** → continue from Step 2 with a fresh config
- **update** → pre-populate prompts with existing values

**If no file exists**, proceed directly to Step 2.

---

### Step 2: Collect API Key

Ask the user for their Rayburst API key:

```
Rayburst API Key
Enter your API key (starts with rb_user_...):
Get one at https://www.rayburst.app/settings/api-keys
```

Validate: non-empty, starts with `rb_`. Store as `api_key`.

Then verify the connection works:

```
mcp__plugin_rayburst_rayburst__rb_ping()
```

**If ping fails**, tell the user the key may be invalid or the API is unreachable. Ask them to double-check and re-enter.

> **Note:** The API key is stored in `.claude/rb-config.md`. If the user prefers, they can set `RAYBURST_API_KEY` as an env var instead — the env var takes priority over the config file.

---

### Step 3: Prompt for Project URL

Ask the user:

```
Project URL
Enter the base URL of the running app (e.g. https://dev.myapp.com or http://localhost:3000):
```

Validate: non-empty, starts with `http://` or `https://`.

Store as `project_url`.

---

### Step 4: Select Board

List available boards:

```
mcp__plugin_rayburst_rayburst__rb_list_boards()
```

Display them numbered and ask the user to pick:

```
Available boards:
  1. Rayburst MVP (23578fa2-...)
  2. Rayburst Business (e07dae77-...)

Select a board number:
```

Store the selected `board_id` and `board_slug`.

---

### Step 5: Identify Projects

Ask the user which projects this workspace maps to. Show any projects associated with the selected board if available, or ask:

```
Project IDs
Enter the frontend project ID (or press Enter to skip):
Enter the backend project ID (or press Enter to skip):
```

Store as `frontend_project_id` and `backend_project_id`.

---

### Step 6: Collect Users (loop)

Initialize an empty `users` list.

**For each user, ask in sequence:**

**6a. Username / email**
```
User <N> — Username or email:
```

**6b. Password or env var**
```
User <N> — Password (or $ENV_VAR_NAME to reference an env variable):
```

If input starts with `$`, store as-is. Otherwise store literal.

**6c. Description**
```
User <N> — Description (e.g. Admin, Viewer, Editor) [User <N>]:
```

**6d. Add another user?**
```
Add another user? (yes / no) [no]:
```

At minimum one user required.

---

### Step 7: Preview & Write

Show formatted preview, then write `.claude/rb-config.md`:

```markdown
# Rayburst Project Config

## API
- API Key: <api_key>
- API URL: https://api.rayburst.app/api/v1/mcp

## Project URL
<project_url>

## Board
- ID: <board_id>
- Slug: <board_slug>

## Projects
- Frontend: <frontend_project_id>
- Backend: <backend_project_id>

## Users

### <description_1>
- username: <username_1>
- password: <password_1>
- description: <description_1>
```

**Important:** Add `.claude/rb-config.md` to `.gitignore` since it contains the API key.

---

### Step 8: Confirmation Summary

```
Config saved to .claude/rb-config.md

  Project URL : <project_url>
  Board       : <board_slug> (<board_id>)
  Projects    : Frontend: <id>, Backend: <id>
  Users       : <N> user(s) configured

Next steps:
  /rb:status                    — Show feature atlas and board status
  /rb:plan <task>               — Plan a feature with board card
  /rb:sync <task>               — Sync a task to the feature atlas
  /rb:implement <cardId>        — Implement a board card
```

---

## Constraints

- **Never resolve env vars at write time** — store `$VAR_NAME` literally
- **At least one user required**
- **URL must start with `http://` or `https://`**
- **`.claude/` directory must exist** — create with `mkdir -p .claude` before writing
