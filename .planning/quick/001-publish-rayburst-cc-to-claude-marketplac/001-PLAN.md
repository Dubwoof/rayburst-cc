---
phase: quick
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - server.bundle.mjs
  - src/server.ts
  - src/tools/designs.ts
autonomous: true
must_haves:
  truths:
    - "Design tools (rb_create_design, rb_list_designs, etc.) are available in Claude Code after plugin update"
    - "rayburst-cc v3.3.0 is published to GitHub at Dubwoof/rayburst-cc"
    - "Local plugin cache reflects the latest bundle"
  artifacts:
    - path: "server.bundle.mjs"
      provides: "Compiled plugin bundle with design tools"
    - path: "src/tools/designs.ts"
      provides: "Design tool definitions"
  key_links:
    - from: "~/.claude/plugins/cache/rayburst/rayburst/3.3.0/server.bundle.mjs"
      to: "server.bundle.mjs"
      via: "file copy"
      pattern: "cp.*server.bundle.mjs"
---

<objective>
Publish rayburst-cc v3.3.0 with design tools to GitHub and update the local plugin cache.

Purpose: Make the new design tools (rb_create_design, rb_list_designs, rb_get_design, rb_update_design, rb_delete_design, rb_review_design) available to all Claude Code users via the Claude marketplace, and immediately available in the current local installation.

Output: Pushed commit on Dubwoof/rayburst-cc, updated local plugin cache.
</objective>

<execution_context>
@/Users/asattelmaier/.claude/get-shit-done/workflows/execute-plan.md
@/Users/asattelmaier/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
Working directory: /Users/asattelmaier/develop/rayburst-workspace/rayburst-cc/
Git remote: origin -> https://github.com/Dubwoof/rayburst-cc.git
Current version: 3.3.0
Uncommitted files: server.bundle.mjs (M), src/server.ts (M), src/tools/designs.ts (new)
Cache location: ~/.claude/plugins/cache/rayburst/rayburst/3.3.0/
</context>

<tasks>

<task type="auto">
  <name>Task 1: Commit and push design tools to GitHub</name>
  <files>server.bundle.mjs, src/server.ts, src/tools/designs.ts</files>
  <action>
    In /Users/asattelmaier/develop/rayburst-workspace/rayburst-cc/:

    1. Stage the three changed files:
       git add src/tools/designs.ts src/server.ts server.bundle.mjs

    2. Commit with message:
       "feat(3.3.0): add design tools for Claude Code plugin

        Add rb_create_design, rb_list_designs, rb_get_design, rb_update_design,
        rb_delete_design, rb_review_design tools. Register designs module in server.ts.
        Bundle rebuilt."

    3. Push to origin main (or master, whichever is the default branch):
       git push origin HEAD
  </action>
  <verify>
    git log --oneline -1 shows the new commit.
    git status shows clean working tree for these files.
    git push succeeded (check exit code).
  </verify>
  <done>All design tool changes are committed and pushed to Dubwoof/rayburst-cc on GitHub.</done>
</task>

<task type="auto">
  <name>Task 2: Update local plugin cache</name>
  <files>~/.claude/plugins/cache/rayburst/rayburst/3.3.0/server.bundle.mjs</files>
  <action>
    Copy the freshly built bundle to the local plugin cache so the current Claude Code installation picks up design tools without needing to re-download:

    cp /Users/asattelmaier/develop/rayburst-workspace/rayburst-cc/server.bundle.mjs ~/.claude/plugins/cache/rayburst/rayburst/3.3.0/server.bundle.mjs

    If there are other files in the cache directory that need updating (package.json, etc.), copy those too:
    cp /Users/asattelmaier/develop/rayburst-workspace/rayburst-cc/package.json ~/.claude/plugins/cache/rayburst/rayburst/3.3.0/package.json
  </action>
  <verify>
    diff /Users/asattelmaier/develop/rayburst-workspace/rayburst-cc/server.bundle.mjs ~/.claude/plugins/cache/rayburst/rayburst/3.3.0/server.bundle.mjs
    Exit code 0 means files are identical.
  </verify>
  <done>Local plugin cache at ~/.claude/plugins/cache/rayburst/rayburst/3.3.0/ contains the latest bundle with design tools.</done>
</task>

</tasks>

<verification>
1. `git log --oneline -1` in rayburst-cc shows the design tools commit
2. `git status` shows clean working tree
3. `diff` between source and cache bundle returns no differences
4. After restarting Claude Code (or /clear), design tools should appear in tool list
</verification>

<success_criteria>
- Design tools commit pushed to https://github.com/Dubwoof/rayburst-cc
- Local plugin cache updated with identical bundle
- No uncommitted changes remaining in rayburst-cc for the design files
</success_criteria>

<output>
After completion, create `.planning/quick/001-publish-rayburst-cc-to-claude-marketplac/001-SUMMARY.md`
</output>
