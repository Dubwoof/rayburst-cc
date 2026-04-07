---
name: rb:init
description: |
  Initialize Rayburst project config — set API key, project URL, board, and user credentials.
  Triggers: "rb init", "setup rayburst", "configure rayburst", "connect to rayburst".
user-invocable: true
---

# rb:init — Project Config Setup

Initialize `.claude/rb-config.md` with API connection details, project URL, board selection, and user credentials. The plugin's MCP server and hooks read this file automatically.

## MCP Tool Prefix

All MCP tools use: `mcp__plugin_rayburst_rayburst__`

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
Get one at https://www.rayburst.app/profile?tab=mcp-agents
```

Validate: non-empty, starts with `rb_`. Store as `api_key`.

---

### Step 3: Write Minimal Config & Verify

**Before continuing with other prompts**, write a minimal config file so the MCP server can connect:

```bash
mkdir -p .claude
```

Write `.claude/rb-config.md` with just the API section:

```markdown
# Rayburst Project Config

## API
- API Key: <api_key>
- API URL: https://api.rayburst.app/api/v1/mcp
```

Now verify the connection works:

```
mcp__plugin_rayburst_rayburst__rb_ping()
```

**If ping fails**, the key may be invalid or the API unreachable. Ask the user to double-check and re-enter. Re-write the config and retry.

**If ping succeeds**, continue to Step 4.

---

### Step 4: Prompt for Project URL

Ask the user:

```
Project URL
Enter the base URL of the running app (e.g. https://dev.myapp.com or http://localhost:3000):
```

Validate: non-empty, starts with `http://` or `https://`.

Store as `project_url`.

---

### Step 5: Select Board

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

### Step 6: Identify Projects

Ask the user which projects this workspace maps to. Show any projects associated with the selected board if available, or ask:

```
Project IDs
Enter the frontend project ID (or press Enter to skip):
Enter the backend project ID (or press Enter to skip):
```

Store as `frontend_project_id` and `backend_project_id`.

---

### Step 7: Collect Users (loop)

Initialize an empty `users` list.

**For each user, ask in sequence:**

**7a. Username / email**
```
User <N> — Username or email:
```

**7b. Password or env var**
```
User <N> — Password (or $ENV_VAR_NAME to reference an env variable):
```

If input starts with `$`, store as-is. Otherwise store literal.

**7c. Description**
```
User <N> — Description (e.g. Admin, Viewer, Editor) [User <N>]:
```

**7d. Add another user?**
```
Add another user? (yes / no) [no]:
```

At minimum one user required.

---

### Step 8: Write Full Config

Write the complete `.claude/rb-config.md` (overwriting the minimal one from Step 3):

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

### Step 9: Confirmation Summary

```
Config saved to .claude/rb-config.md

  API Key     : <first 12 chars>...
  Project URL : <project_url>
  Board       : <board_slug> (<board_id>)
  Projects    : Frontend: <id>, Backend: <id>
  Users       : <N> user(s) configured

Rayburst is now active. On your next session, Claude will automatically
have your feature atlas and board context. No commands needed — just code.
```

---

## Constraints

- **Never resolve env vars at write time** — store `$VAR_NAME` literally
- **At least one user required**
- **URL must start with `http://` or `https://`**
- **`.claude/` directory must exist** — create with `mkdir -p .claude` before writing
- **Write minimal config before pinging** — the MCP server reads from rb-config.md, not env vars
