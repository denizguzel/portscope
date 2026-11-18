import { expect, test } from 'bun:test';
import { isIgnoredCommand } from '../src/process-ignore';

const ignored = new Set(['browse']);

test('matches the program name', () => {
  expect(isIgnoredCommand('/home/me/.local/bin/browse serve', ignored)).toBe(true);
});

test('matches the script of a runtime without its extension', () => {
  expect(isIgnoredCommand('node /tools/browse.js --port 19988', ignored)).toBe(true);
});

test('ignores case', () => {
  expect(isIgnoredCommand('/opt/Browse', ignored)).toBe(true);
});

test('does not match a dev server whose path only contains the name', () => {
  expect(isIgnoredCommand('node /work/browse-app/node_modules/.bin/vite', ignored)).toBe(false);
});

test('does not match arguments', () => {
  expect(isIgnoredCommand('/usr/bin/python3 -m http.server browse', ignored)).toBe(false);
});

test('an empty list ignores nothing', () => {
  expect(isIgnoredCommand('/opt/bin/browse serve', new Set())).toBe(false);
});
