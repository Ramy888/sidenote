// Boundary (T25): the reusable core must stay domain-free so another "private records in,
// coded facts out" app can reuse it unchanged. Lists are derived from the repo, not hand-kept.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const pkg = join(dirname(fileURLToPath(import.meta.url)), '..');
const repo = join(pkg, '..', '..');

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? walk(join(dir, e.name)) : /\.(ts|tsx|js|json)$/.test(e.name) ? [join(dir, e.name)] : []);

// Strip comments so a note mentioning an app name doesn't count as an import.
const code = (f: string) => readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

const sources = walk(join(pkg, 'src'));
const apps = existsSync(join(repo, 'apps')) ? readdirSync(join(repo, 'apps')) : [];
const appPackageNames = apps
  .map(a => join(repo, 'apps', a, 'package.json'))
  .filter(existsSync)
  .map(p => JSON.parse(readFileSync(p, 'utf8')).name as string);

describe('private-evidence boundary', () => {
  it('has source files to check', () => expect(sources.length).toBeGreaterThan(0));

  it('imports nothing from any app', () => {
    for (const f of sources) {
      const specs = [...code(f).matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)].map(m => m[1]);
      for (const s of specs) {
        expect(s, `${f} imports ${s}`).not.toMatch(/(^|\/)apps\//);
        for (const name of appPackageNames) expect(s, `${f} imports ${s}`).not.toBe(name);
      }
    }
  });

  it('declares no dependency on an app package', () => {
    const p = JSON.parse(readFileSync(join(pkg, 'package.json'), 'utf8'));
    const deps = Object.keys({ ...p.dependencies, ...p.peerDependencies });
    for (const name of appPackageNames) expect(deps).not.toContain(name);
  });
});
