#!/usr/bin/env node
/**
 * Patches react-native-google-mobile-ads spec files to replace
 * CodegenTypes.UnsafeObject with Object.
 *
 * RN 0.76's codegen parser doesn't support qualified type names like
 * CodegenTypes.UnsafeObject — it only understands direct type references.
 * RNGMA 16.x uses this pattern in its specs, causing the Android release
 * build to fail at the generateCodegenSchemaFromJavaScript task.
 *
 * Remove this script once RNGMA ships a fix.
 */

const fs = require('fs');
const path = require('path');

const specsDir = path.join(
  __dirname,
  '../node_modules/react-native-google-mobile-ads/src/specs',
);

if (!fs.existsSync(specsDir)) {
  console.log('[patch-rngma] node_modules not yet installed, skipping.');
  process.exit(0);
}

let patched = 0;
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.js')) {
      const original = fs.readFileSync(fullPath, 'utf8');
      const updated = original
        .replace(/^import type \{ CodegenTypes \} from 'react-native';\n?/gm, '')
        .replace(/CodegenTypes\.UnsafeObject/g, 'Object');
      if (updated !== original) {
        fs.writeFileSync(fullPath, updated);
        console.log(`[patch-rngma] Patched ${path.relative(process.cwd(), fullPath)}`);
        patched++;
      }
    }
  }
}

walk(specsDir);
console.log(`[patch-rngma] Done — ${patched} file(s) patched.`);
