import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { symbols, viewBoxes, icon } from '../src/icons.js';
import { tasks } from '../src/state.js';

test('runtime icons stay in sync with all 56 editable Material SVGs', async () => {
  assert.equal(Object.keys(symbols).length, 56);
  for (const [name, paths] of Object.entries(symbols)) {
    const source = await readFile(new URL(`../public/assets/icons/${name}.svg`, import.meta.url), 'utf8');
    assert.equal(source.match(/<svg[^>]*>([\s\S]*)<\/svg>/)[1], paths, name);
    const expectedViewBox = source.match(/viewBox="([^"]+)"/)?.[1] || '0 0 24 24';
    assert.equal(viewBoxes[name], expectedViewBox, name);
    assert.ok(icon(name).includes(`viewBox="${expectedViewBox}"`), name);
  }
});

test('task and navigation icons resolve without a font or image dependency', () => {
  const names = [...tasks.map(task => task.icon), 'home', 'layers', 'calendar', 'list-check', 'award', 'shield', 'check', 'play', 'chevron-right'];
  for (const name of names) {
    assert.ok(Object.hasOwn(symbols, name), name);
    const rendered = icon(name, 'icon');
    assert.ok(rendered.includes(`<svg class="icon icon-${name}"`), name);
    assert.ok(rendered.includes('aria-hidden="true"'), name);
    assert.ok(!/https?:|<image|<use|mask:/.test(rendered), name);
  }
});
