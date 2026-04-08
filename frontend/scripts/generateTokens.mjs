#!/usr/bin/env node
/**
 * generateTokens.mjs
 *
 * Reads color primitives from src/a2ui/catalog/designTokens.ts and writes
 * the [tokens:start] … [tokens:end] block inside src/app/globals.css.
 *
 * Usage:
 *   node scripts/generateTokens.mjs
 *
 * Run automatically via:
 *   npm run tokens   (manual)
 *   npm run build    (prebuild hook)
 *   npm run dev      (predev hook)
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// ---------------------------------------------------------------------------
// 1. Parse designTokens.ts — extract hex color values from the colors block
// ---------------------------------------------------------------------------

const tokenSrc = readFileSync(join(root, 'src/a2ui/catalog/designTokens.ts'), 'utf-8');

/**
 * Extract a hex color value for a named key from the designTokens source.
 * Matches patterns like:   primary: '#4F46E5',
 */
function extractHex(name) {
  const pattern = new RegExp(`\\b${name}:\\s*'(#[0-9A-Fa-f]{6})'`);
  const match = tokenSrc.match(pattern);
  if (!match) {
    console.error(`❌  Could not find token: colors.${name}`);
    process.exit(1);
  }
  return match[1];
}

const tokens = {
  primary:         extractHex('primary'),
  secondary:       extractHex('secondary'),
  success:         extractHex('success'),
  warning:         extractHex('warning'),
  error:           extractHex('error'),
  neutral:         extractHex('neutral'),
  bg:              extractHex('background'),
  fg:              extractHex('foreground'),
  'header-bg':     extractHex('headerBackground'),
};

// ---------------------------------------------------------------------------
// 2. Build the replacement token block
// ---------------------------------------------------------------------------

const lines = Object.entries(tokens).map(
  ([key, value]) => `  --token-${key.padEnd(14)}: ${value};`
);

const generatedBlock =
  `  /* [tokens:start] */\n` +
  lines.join('\n') +
  `\n  /* [tokens:end] */`;

// ---------------------------------------------------------------------------
// 3. Splice the block into globals.css between the markers
// ---------------------------------------------------------------------------

const cssPath = join(root, 'src/app/globals.css');
const css = readFileSync(cssPath, 'utf-8');

const startMarker = '  /* [tokens:start] */';
const endMarker   = '  /* [tokens:end] */';

const startIdx = css.indexOf(startMarker);
const endIdx   = css.indexOf(endMarker);

if (startIdx === -1 || endIdx === -1) {
  console.error('❌  Marker not found in globals.css. Expected:');
  console.error('    /* [tokens:start] */ ... /* [tokens:end] */');
  process.exit(1);
}

const updated =
  css.slice(0, startIdx) +
  generatedBlock +
  css.slice(endIdx + endMarker.length);

writeFileSync(cssPath, updated, 'utf-8');

// ---------------------------------------------------------------------------
// 4. Report
// ---------------------------------------------------------------------------

console.log('✅  Design tokens → globals.css');
for (const [key, value] of Object.entries(tokens)) {
  console.log(`    --token-${key.padEnd(14)}: ${value}`);
}
