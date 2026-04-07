---
name: rb:init
description: |
  Initialize Rayburst project config — set API key, select projects and board.
  Triggers: "rb init", "setup rayburst", "configure rayburst", "connect to rayburst".
user-invocable: true
---

# rb:init — Project Config Setup

Initialize `.claude/rb-config.md` with API connection details, project selection, and board selection. The plugin's MCP server and hooks read this file automatically.

## MCP Tool Prefix

All MCP tools use: `mcp__plugin_rayburst_rayburst__`

---

## CRITICAL RULE

**Each step below is a separate interaction. You MUST use AskUserQuestion to collect the user's answer and WAIT for their response before moving to the next step. Never combine multiple questions in a single message. Complete one step fully before starting the next.**

---

## Workflow

### Step 1: Check for Existing Config

Attempt to read `.claude/rb-config.md`.

**If the file exists**, show the user its current contents and ask via AskUserQuestion:

```
A config file already exists at .claude/rb-config.md.

What would you like to do?
  overwrite — Replace the entire file with new values
  update    — Keep existing values, edit specific entries
  cancel    — Exit without changes
```

- **cancel** → stop immediately, print "No changes made."
- **overwrite** → continue from Step 2 with a fresh config
- **update** → pre-populate prompts with existing values

**If no file exists**, proceed directly to Step 2.

---

### Step 2: Collect API Key

Use AskUserQuestion to ask:

```
Rayburst API Key
Enter your API key (starts with rb_user_...):
Get one at https://www.rayburst.app/profile?tab=mcp-agents
```

Validate: non-empty, starts with `rb_`. Store as `api_key`.

**STOP and wait for user response before continuing.**

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

### Step 4: Select Projects

Fetch available projects:

```
mcp__plugin_rayburst_rayburst__rb_list_projects()
```

Display them as a numbered list, then use AskUserQuestion to ask the user to select. This is a **multi-select** — the user can pick multiple projects by entering comma-separated numbers.

```
Available projects:
  1. My App Frontend (a1b2c3d4-...) — local
  2. My App API (e5f6a7b8-...) — github
  3. Landing Page (c9d0e1f2-...) — manual

Select project(s) for this workspace (comma-separated numbers, or Enter to skip):
```

Store selected project IDs and names as `projects` list.

**STOP and wait for user response before continuing.**

---

### Step 5: Select Board

Fetch available boards:

```
mcp__plugin_rayburst_rayburst__rb_list_boards()
```

Display them as a numbered list, then use AskUserQuestion to ask the user to pick **one** board.

```
Available boards:
  1. My MVP Board (23578fa2-...)
  2. My Business Board (e07dae77-...)

Select a board number:
```

Store the selected `board_id` and `board_slug`.

**STOP and wait for user response before continuing.**

---

### Step 6: Write Full Config

Write the complete `.claude/rb-config.md` (overwriting the minimal one from Step 3):

```markdown
# Rayburst Project Config

## API
- API Key: <api_key>
- API URL: https://api.rayburst.app/api/v1/mcp

## Projects
- <project_name_1>: <project_id_1>
- <project_name_2>: <project_id_2>

## Board
- ID: <board_id>
- Slug: <board_slug>
```

**Important:** Add `.claude/rb-config.md` to `.gitignore` since it contains the API key.

---

### Step 7: Confirmation Summary

```
Config saved to .claude/rb-config.md

  API Key     : <first 12 chars>...
  Projects    : <N> project(s) selected
  Board       : <board_slug> (<board_id>)

Rayburst is now active. On your next session, Claude will automatically
have your feature atlas and board context. No commands needed — just code.
```

---

## Constraints

- **`.claude/` directory must exist** — create with `mkdir -p .claude` before writing
- **Write minimal config before pinging** — the MCP server reads from rb-config.md, not env vars
- **One question per turn** — never batch multiple prompts in a single message
