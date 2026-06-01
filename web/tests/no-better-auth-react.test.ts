// Regression — BUG #1 (part a): the layout-wide SSR 500 was caused by a client
// module importing `better-auth/react`. `better-auth` is externalized for webpack
// (its kysely adapter can't be bundled), so the externalized ESM resolved to
// `undefined` during SSR, making every consuming component an invalid element.
//
// This is a SOURCE GUARDRAIL: no file under web/ may import `better-auth/react`,
// and the fetch-based auth-client must stay free of ANY `better-auth` import.

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB_ROOT = dirname(dirname(fileURLToPath(import.meta.url))); // web/tests -> web
const SKIP_DIRS = new Set(['node_modules', '.next', 'tests', 'coverage', 'dist', '.git']);
const BETTER_AUTH_REACT = /['"]better-auth\/react['"]/;

function collectSources(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (!SKIP_DIRS.has(entry)) collectSources(full, acc);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

describe('better-auth/react guardrail', () => {
  it('no source file imports better-auth/react', () => {
    const offenders = collectSources(WEB_ROOT)
      .filter((f) => BETTER_AUTH_REACT.test(readFileSync(f, 'utf8')))
      .map((f) => relative(WEB_ROOT, f));
    expect(offenders).toEqual([]);
  });

  it('auth-client.ts has no better-auth import (comment references are fine)', () => {
    const src = readFileSync(join(WEB_ROOT, 'lib', 'auth-client.ts'), 'utf8');
    // Match an actual module specifier (quoted), not prose: `import x from
    // 'better-auth/...'`, `import('better-auth')`, `require('better-auth')`.
    const BETTER_AUTH_IMPORT = /(?:from|import|require)\s*\(?\s*['"]better-auth(?:\/[^'"]*)?['"]/;
    expect(BETTER_AUTH_IMPORT.test(src)).toBe(false);
  });
});
