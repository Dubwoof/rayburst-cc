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
3. **Always search for existing features first** — call `rb_list_features` before creating a new one. Attach designs to existing features, never create duplicates.
4. **Source is "code-analysis"** — always set `source: "code-analysis"` when calling `rb_create_design`.
5. **TOON encoding** — encode the design data object using `@toon-format/toon`'s `encode()` function before saving as `toonContent`. Raw JSON will NOT render in the sandbox.
6. **Single default component** — capture the component in its default state as it appears in the app. Do NOT create showcase grids or variant galleries.
7. **No wrapper backgrounds** — the sandbox has its own background system. Do not add white containers or wrapper backgrounds around the component.
8. **Read the actual source code** — always read the component's `.tsx` file and extract real Tailwind/CSS values. Never guess styles from screenshots.

---

## How the DesignSandbox Renderer Works

Understanding the renderer is essential to creating designs that render correctly:

1. **TOON string** is decoded via `@toon-format/toon` `decode()` → `{ tokens, cssProperties, componentTree }`
2. **Tokens** become CSS variables on `:root` (dot notation `color.primary` → `--color-primary`)
3. **cssProperties** build CSS rules: key = selector (`.node-class-name`), value = properties object
4. **componentTree** is recursively rendered as HTML:
   - `type` → HTML tag (`div`, `span`, `button`, `kbd`, `svg`, `img`)
   - `name` → generates CSS class via kebab-case conversion (`Feature Name` → `feature-name`)
   - `text`/`content` → text content
   - `style` → **inline styles** (applied directly, highest priority)
   - `tokens` → resolved to inline styles via token references
   - `children` → nested nodes
   - `variant` → `"active"/"inactive"` for interactive toggle groups
5. **Nodes without CSS rules AND without inline styles** collapse to `display:contents` — they become invisible wrappers. This is the #1 cause of rendering issues.

### Key Rendering Insight

**Inline styles are the primary rendering mechanism.** CSS class rules from `cssProperties` provide structure for the inspect panel, but if a node has no inline `style` AND no matching `.class-name` in `cssProperties`, it collapses. Always put visual styles as inline `style` objects on nodes.

---

## Workflow

### Step 1: Identify the feature and component

If the user specified a component file path and/or feature, use those directly.
Otherwise:
1. Ask the user: "Which component or UI area do you want to capture?"
2. Call `rb_list_features` to find the matching feature. **Always search first — never assume a feature doesn't exist.**
3. Confirm with the user: "I'll capture the design for feature **[title]** from `[file path]`. Proceed?"

---

### Step 2: Read the component source

Read the component file(s). Extract:
- **Element structure**: HTML/JSX element types, nesting, key classNames
- **CSS properties**: All Tailwind classes resolved to actual CSS values (e.g. `bg-blue-500` → `#3b82f6`, `rounded-xl` → `12px`, `text-sm` → `14px`)
- **Layout**: flex/grid direction, gap, padding, margin, width, height
- **Typography**: font-size, font-weight, font-family, line-height, color
- **Visual**: background, border, border-radius, box-shadow, opacity
- **States**: hover, focus, active, disabled variants
- **Icons**: Extract SVG path data for Lucide or other icon libraries — embed as real `<svg>` nodes with `<path>` children, never use emoji substitutes

---

### Step 3: Build the design data object

#### 3a: Component Tree (rendering)

Every visual node MUST have its styles as an inline `style` object. This is non-negotiable — without inline styles, nodes collapse to `display:contents`.

```javascript
const componentTree = {
  type: "div",          // Real HTML tag
  name: "Switch",       // Generates CSS class for inspect
  style: {              // INLINE STYLES — primary rendering mechanism
    display: "inline-flex",
    alignItems: "center",
    width: "36px",
    height: "20px",
    borderRadius: "9999px",
    background: "#0a6e7a",
    padding: "2px",
    cursor: "pointer"
  },
  children: [
    {
      type: "div",
      name: "Switch Thumb",
      style: {
        width: "16px",
        height: "16px",
        borderRadius: "9999px",
        background: "#ffffff",
        boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
      }
    }
  ]
}
```

For **interactive components** with toggle states, use variant groups:
- Name nodes with `--active` / `--inactive` suffixes in `cssProperties`
- Set `variant: "active"` or `variant: "inactive"` on the component tree node
- The sandbox will auto-generate click handlers to toggle between states

```javascript
// In cssProperties:
".switch--active": { background: "#0a6e7a", justifyContent: "flex-end" },
".switch--inactive": { background: "#d4d4d8", justifyContent: "flex-start" },

// In componentTree:
{ type: "div", name: "Switch", variant: "active", style: { ... } }
```

For **SVG icons**, embed with real path data:
```javascript
{
  type: "svg",
  name: "SearchIcon",
  xmlns: "http://www.w3.org/2000/svg",
  width: "16",
  height: "16",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2",
  children: [
    { type: "circle", cx: "11", cy: "11", r: "8" },
    { type: "path", d: "m21 21-4.3-4.3" }
  ]
}
```

#### 3b: CSS Properties (inspect panel)

`cssProperties` should **mirror** the inline styles for the inspector panel. They are NOT the primary rendering mechanism — they provide structured data for the inspect mode overlay.

```javascript
const cssProperties = {
  ".switch": {
    display: "inline-flex",
    alignItems: "center",
    width: "36px",
    // ... same values as inline styles
  },
  ".switch--active": { background: "#0a6e7a" },
  ".switch--inactive": { background: "#d4d4d8" },
  ".switch:hover": { /* hover styles for interactive mode */ }
}
```

#### 3c: Design Tokens

Use `--` prefixed CSS variable names matching actual custom properties. Store in the `designTokens` field (top-level in the TOON object):

```javascript
const designTokens = {
  "--switch-checked-bg": "#0a6e7a",
  "--switch-unchecked-bg": "#d4d4d8",
  "--switch-thumb-bg": "#ffffff",
  "--switch-width": "36px",
  "--switch-height": "20px"
}
```

#### 3d: Encode as TOON

Use `@toon-format/toon` to encode. Run via Node.js:

```javascript
const { encode } = require('@toon-format/toon');
const toonContent = encode({
  designTokens,
  cssProperties,
  componentTree
});
```

**Important**: The TOON format is NOT JSON. It's a YAML-like indentation-based format. You MUST use the `encode()` function — do not hand-write TOON strings.

---

### Step 4: Save the design

Call `rb_create_design` with:
```
featureId:      <feature UUID>
name:           "<ComponentName> — <variant or context>"
source:         "code-analysis"
toonContent:    <encoded TOON string>
```

Note: `componentTree`, `cssProperties`, `designTokens` fields in the API are for legacy/non-TOON storage. When providing `toonContent`, the sandbox uses that exclusively for rendering.

---

### Step 4.5: Link centralized design tokens

After saving the design, automatically link any matching centralized tokens:

1. Call `rb_list_design_tokens` to fetch all org-level design tokens.
2. For each centralized token, check if its `value` appears anywhere in the design's `cssProperties` or `designTokens`.
3. For each match, call `rb_link_design_token` with the `designId`, `tokenId`, and the matching `cssProperty` name.

---

### Step 5: Verify in sandbox

**This step is mandatory. Do not skip it.**

1. Navigate to the feature's Designs tab in the browser via Playwright
2. Take a screenshot of the sandbox render
3. Compare against the real component in the app
4. If the render doesn't match:
   - Check if nodes are missing inline `style` objects (they'll collapse)
   - Check if SVG icons are using emoji instead of real paths
   - Check if colors/sizes match the resolved Tailwind values
5. Fix and update the design via `rb_update_design` until it matches

---

### Step 6: Confirm

After successful creation and verification, output:
```
✅ Design captured: "<name>"
Feature: <feature title> (<featureId>)
Design ID: <designId>
Verified: sandbox render matches live component

Linked N centralized tokens.
```

---

## Common Mistakes to Avoid

| Mistake | Why it fails | Fix |
|---------|-------------|-----|
| No inline `style` on nodes | Nodes collapse to `display:contents` — invisible | Always add `style` object with full CSS |
| Using emoji for icons (🔍, ☰) | Looks cheap, doesn't match app | Embed real SVG with path data |
| Variant showcase grid | Not what designs are for | Show single default component |
| White wrapper background | Conflicts with sandbox bg system | Let sandbox handle backgrounds |
| Raw JSON as toonContent | `decode()` fails — "No preview available" | Use `encode()` from `@toon-format/toon` |
| Not reading source code | Guessed styles don't match actual render | Always read `.tsx` and resolve Tailwind |
| Creating duplicate features | Existing feature already has criteria | Always `rb_list_features` first |
| Relying on cssProperties for render | Class matching is fragile | Inline styles are primary render path |

## Reference Design

The **Mode Switcher** design (feature `33eea315-0e68-4b80-bfc3-3ab4d58713f4`) is the quality benchmark. Study its TOON structure for:
- Inline styles on every node
- Real SVG icons with path data
- Interactive `--active`/`--inactive` variant groups
- `designTokens` with `--` prefixed CSS variable names
- `cssProperties` mirroring inline styles for inspect mode
- `canvasBg: "slate"` for dark theme components

---

## Constraints

- Only extract styles statically present in source — do not hallucinate values.
- If the component uses Tailwind, resolve class names to actual CSS values (e.g. `bg-blue-500` → `#3b82f6`, `rounded-xl` → `border-radius: 12px`, `text-sm` → `font-size: 14px`).
- `componentTree.type` MUST be a real HTML tag (`div`, `span`, `button`, `kbd`, `svg`, `img`, `input`, etc.) or a PascalCase React component name — never Figma node types.
- For page-level assemblies: read ALL component files involved (page, table, search, sub-components) and extract actual CSS values from each.
