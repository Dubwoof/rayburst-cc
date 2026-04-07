#!/usr/bin/env node
/**
 * Build script: compiles src/hooks/*.ts → hooks/*.mjs
 *
 * Each hook entry point is bundled individually so the output files
 * remain standalone executables that the Claude Code hook runner can
 * invoke directly with `node hooks/<name>.mjs`.
 *
 * Shared modules (rb-cache, product-context-block, types) are inlined
 * into each bundle — no external imports needed at runtime.
 */

import { build } from "esbuild";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const HOOK_ENTRIES = [
  { src: "src/hooks/sessionstart.ts",      out: "hooks/sessionstart.mjs" },
  { src: "src/hooks/userpromptsubmit.ts",  out: "hooks/userpromptsubmit.mjs" },
  { src: "src/hooks/pretooluse.ts",         out: "hooks/pretooluse.mjs" },
  { src: "src/hooks/posttooluse.ts",        out: "hooks/posttooluse.mjs" },
  // product-context-block and rb-cache are internal modules — they are
  // bundled into the entry points above, not compiled as standalone files.
];

for (const { src, out } of HOOK_ENTRIES) {
  await build({
    entryPoints: [resolve(root, src)],
    outfile: resolve(root, out),
    bundle: true,
    platform: "node",
    target: "node18",
    format: "esm",
    // Do not minify hooks — they are read by humans for debugging
    minify: false,
    banner: {
      js: "#!/usr/bin/env node",
    },
  });
  console.log(`  built ${src} → ${out}`);
}

console.log("hooks build complete.");
