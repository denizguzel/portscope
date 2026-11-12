import { expect, test } from 'bun:test';
import { spawn } from 'node:child_process';
import { isDescendantOf, parseParentPid, readAncestorPids } from '../src/process-tree';

test('parses the parent pid', () => {
  expect(parseParentPid('1234 (node) S 987 1234 1234 0 -1')).toBe(987);
});

test('a command name with spaces and parentheses does not confuse the parser', () => {
  expect(parseParentPid('1234 (my (odd) name) S 55 1 1 0')).toBe(55);
});

test('garbage gives undefined', () => {
  expect(parseParentPid('')).toBeUndefined();
});

test('the ancestors of this process start with its own pid', async () => {
  const chain = await readAncestorPids(process.pid);
  expect(chain[0]).toBe(process.pid);
  expect(chain.length).toBeGreaterThan(1);
});

test('a child process is a descendant of this process, but not the other way round', async () => {
  const child = spawn('sleep', ['5']);
  try {
    expect(child.pid).toBeDefined();
    const childPid = child.pid ?? 0;
    expect(await isDescendantOf(childPid, process.pid)).toBe(true);
    expect(await isDescendantOf(process.pid, childPid)).toBe(false);
    expect(await isDescendantOf(process.pid, process.pid)).toBe(false);
  } finally {
    child.kill();
  }
});
