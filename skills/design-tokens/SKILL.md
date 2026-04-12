---
name: rb:extract-tokens
description: |
  Analyze all designs across the organization's feature atlas, discover repeating CSS values,
  and propose centralized design tokens. Creates approved tokens and auto-links them to designs.
  Triggers: "extract tokens", "rb extract tokens", "discover tokens", "find design tokens", "tokenize designs".
user-invocable: true
---

# rb:extract-tokens — Extract Design Tokens from Existing Designs

Scans all feature designs in the organization, identifies repeating CSS values (colors, spacing,
typography, etc.), and proposes them as centralized design tokens. Approved tokens are created
and linked to the designs that use them.

## MCP Tool Prefix

All MCP tools use: `mcp__plugin_rayburst_rayburst__`

---

## CRITICAL RULES

1. **Never create tokens without user approval** — always present the full list of suggestions and wait for the user to confirm which ones to create.
2. **Minimum threshold: 2+ usages** — only propose values that appear in at least 2 different designs.
3. **Don't duplicate existing tokens** — always check `rb_list_design_tokens` first and skip values that already have a centralized token.
4. **Auto-categorize accurately** — use the regex rules in Step 3 to assign the correct category.

---

## Workflow

### Step 1: Gather all designs

1. Call `rb_list_features` with a broad search (empty string) to get all features.
2. For each feature, call `rb_list_designs` to get design metadata.
3. For each design that has `toonContent`, call `rb_get_design` to fetch the full design data.
4. Also call `rb_list_design_tokens` to get existing centralized tokens.

**Rate limit note**: Batch API calls in groups of 4-5 to stay within the 60 req/min limit.

---

### Step 2: Collect all CSS values

For each fetched design, collect values from:
- `designTokens` — all values from the key-value pairs
- `cssProperties` — all values from the CSS rule declarations (decode TOON if needed)

Build a frequency map: `Map<normalizedValue, { count: number, designs: Set<designId>, properties: Set<cssPropertyName> }>`.

Normalize values by:
- Trimming whitespace
- Lowercasing hex colors (e.g. `#3B82F6` → `#3b82f6`)
- Normalizing rgb/rgba spacing (e.g. `rgb( 255, 255, 255 )` → `rgb(255, 255, 255)`)

---

### Step 3: Auto-categorize and name suggestions

For each value appearing 2+ times, auto-categorize:

| Pattern | Category | Name suggestion |
|---------|----------|----------------|
| `#hex`, `rgb(...)`, `rgba(...)`, `hsl(...)`, `oklch(...)` | `color` | `color.<semantic-hint>` |
| `Npx`, `Nrem`, `Nem`, `N%` (for padding, margin, gap) | `spacing` | `spacing.<size>` |
| Font family strings, `Npx`/`Nrem` font-size, font-weight numbers | `typography` | `typography.<role>` |
| `Npx` border-width, border-radius values | `border` | `border.<property>` |
| `box-shadow` values | `shadow` | `shadow.<level>` |
| `0.N` opacity values | `opacity` | `opacity.<level>` |
| Everything else | `other` | `other.<name>` |

For name suggestions, try to infer semantic meaning:
- If the CSS property name gives a clue (e.g. `background-color` → `color.bg`, `font-size` → `typography.size`)
- Use size labels: `xs`, `sm`, `md`, `lg`, `xl` based on relative values
- For colors, try to identify role: `primary`, `secondary`, `surface`, `text`, `border`

---

### Step 4: Filter and present suggestions

1. Remove values that already match an existing centralized token (by exact value match).
2. Sort suggestions by usage count (highest first).
3. Present to the user in a clear table:

```
Found N repeating values across M designs:

 # | Name (suggested)      | Category   | Value        | Used in
---|-----------------------|------------|--------------|--------
 1 | color.primary         | color      | #3b82f6      | 5 designs
 2 | spacing.md            | spacing    | 16px         | 4 designs
 3 | typography.body.size  | typography | 14px         | 3 designs
 ...

Which tokens would you like to create? (e.g. "1,2,3" or "all" or "none")
```

---

### Step 5: Create approved tokens and link designs

For each approved suggestion:

1. Call `rb_create_design_token` with the name, category, value, and a description like "Auto-extracted from N designs".
2. For each design that uses this value, call `rb_link_design_token` with the design ID, token ID, and the CSS property name.

---

### Step 6: Report

Output a summary:

```
✅ Created N design tokens, linked to M designs.

Created tokens:
- color.primary (#3b82f6) — linked to 5 designs
- spacing.md (16px) — linked to 4 designs
- ...

View your design system at: /features/design-system
```

---

## Constraints

- Stay within the 60 req/min MCP rate limit — batch calls in groups of 4-5.
- For large organizations with many features/designs, process in batches and show progress.
- If no repeating values are found, say so: "No repeating CSS values found across designs. Create tokens manually via /features/design-system or rb_create_design_token."
