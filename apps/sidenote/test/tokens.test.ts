import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// Every colour in DESIGN.md's front matter must appear with the same value in index.css (light in :root,
// dark-* in the dark block), so the spec and the app cannot drift.
const design = readFileSync(new URL('../../../DESIGN.md', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const colors = [...design.split('\ntypography:')[0].matchAll(/^ {2}([\w-]+): "(#[0-9A-Fa-f]{6})"$/gm)].map(m => [m[1], m[2]]);
const [light, dark] = css.split('@media (prefers-color-scheme: dark)');
const value = (block: string, name: string) => block.match(new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`))?.[1]?.toUpperCase();

describe('design tokens', () => {
  it('reads the colours from DESIGN.md', () => expect(colors.length).toBeGreaterThan(40));
  it.each(colors)('%s matches DESIGN.md', (name, hex) => {
    const dk = name.startsWith('dark-');
    expect(value(dk ? dark : light, dk ? name.slice(5) : name)).toBe(hex.toUpperCase());
  });
  it('loads no font from a third-party host', () => expect(css).not.toMatch(/https?:\/\//));
});
