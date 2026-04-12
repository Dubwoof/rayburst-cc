---
name: rb:capture-design
description: |
  Capture the visual design of a feature's UI component from source code and save it
  as a TOON-encoded design in the Rayburst feature atlas.
  Triggers: "capture design", "rb capture design", "save design", "snapshot design", "add design to feature".
user-invocable: true
---

# rb:capture-design — Capture Component Design from Code

Reads a UI component's source code, builds a structured design representation in TOON format,
and saves it to the feature's Designs tab via `create_design`.

## MCP Tool Prefix

All MCP tools use: `mcp__plugin_rayburst_rayburst__`

---

## CRITICAL RULES

1. **Never invent visual data** — only encode what is explicitly present in the source code (CSS classes, inline styles, Tailwind classes, CSS variables). If a value is computed at runtime, note it as `"dynamic"`.
2. **Always confirm the feature** before creating the design — ask the user if unsure which feature this component belongs to.
3. **Source is "code-analysis"** — always set `source: "code-analysis"` when calling `rb_create_design`.
4. **TOON encoding** — encode the design data object using `@toon-format/toon`'s `encode()` function before saving as `toonContent`.

---

## Workflow

### Step 1: Identify the feature and component

If the user specified a component file path and/or feature, use those directly.
Otherwise:
1. Ask the user: "Which component or UI area do you want to capture?"
2. Call `rb_list_features` to find the matching feature.
3. Confirm with the user: "I'll capture the design for feature **[title]** from `[file path]`. Proceed?"

---

### Step 2: Read the component source

Read the component file(s). Extract:
- **Element structure**: HTML/JSX element types, nesting, key classNames
- **CSS properties**: All Tailwind classes, inline styles, CSS variables resolved to their values where possible
- **Layout**: flex/grid direction, gap, padding, margin, width, height
- **Typography**: font-size, font-weight, font-family, line-height, color
- **Visual**: background, border, border-radius, box-shadow, opacity
- **States**: hover, focus, active, disabled variants (from Tailwind or CSS)

---

### Step 3: Build the design data object

Construct a JavaScript object with this shape:

```javascript
const designData = {
  name: "<ComponentName> — <FeatureTitle>",  // e.g. "Tab Bar — Page Tab Bar"
  componentTree: {
    type: "div",  // root element type — MUST be a real HTML tag (div, span, button, etc.)
                  // or a PascalCase React component name. Never use Figma types.
    className: "<classes>",
    children: [
      { type: "button", className: "<classes>", variant: "active", children: [] },
      { type: "button", className: "<classes>", variant: "inactive", children: [] },
    ]
  },
  cssProperties: {
    // Styles grouped by selector or variant
    ".tab-active": { background: "rgba(255,255,255,0.15)", color: "#fff", borderRadius: "9999px", padding: "8px 36px" },
    ".tab-inactive": { color: "rgba(255,255,255,0.6)", padding: "8px 36px" },
  },
  designTokens: {
    // CSS variables or design tokens resolved to values
    // e.g. "--color-primary": "#3b82f6"
  }
}
```

Then encode as TOON using the `ctx_execute` MCP tool (context-mode) or equivalent:
```javascript
import { encode } from '@toon-format/toon'
const toonContent = encode(designData)
```

---

### Step 4: Save the design

Call `rb_create_design` with:
```
featureId:      <feature UUID>
name:           "<ComponentName> — <FeatureTitle>"
source:         "code-analysis"
componentTree:  <componentTree object>
cssProperties:  <cssProperties object>
designTokens:   <designTokens object>
toonContent:    <encoded TOON string>
```

---

### Step 4.5: Link centralized design tokens

After saving the design, automatically link any matching centralized tokens:

1. Call `rb_list_design_tokens` to fetch all org-level design tokens.
2. For each centralized token, check if its `value` appears anywhere in the design's `cssProperties` or `designTokens`.
3. For each match, call `rb_link_design_token` with the `designId`, `tokenId`, and the matching `cssProperty` name.
4. Track counts: how many existing tokens were linked, and how many repeated CSS values could become new tokens (values appearing in the design that aren't yet centralized).

---

### Step 5: Confirm

After successful creation, output:
```
✅ Design captured: "<name>"
Feature: <feature title> (<featureId>)
Design ID: <designId>

Linked N centralized tokens.
M CSS values could become new design tokens — run /rb:extract-tokens to review.

The design is now visible in the Designs tab of the feature.
To update it later, run /rb:capture-design again or use rb_update_design.
```

---

## Constraints

- Only extract styles statically present in source — do not hallucinate values.
- If the component uses Tailwind, resolve class names to actual CSS values where known (e.g. `bg-blue-500` → `#3b82f6`).
- If multiple variants exist (e.g. active/inactive tabs), capture all variants in `componentTree` and `cssProperties`.
- `componentTree.type` MUST be a real HTML tag (`div`, `span`, `button`, `img`, `input`, etc.) or a PascalCase React component name — never Figma node types (`frame`, `text`, `group`, `rectangle`).
