import { expect, test } from 'bun:test';
import { hideHelperPorts } from '../src/helper-ports';
import { makeServer } from './fixtures';

test('a random port of a process with a main port is hidden', async () => {
  const main = makeServer({ port: 3005, pid: 1 });
  const tunnel = makeServer({ port: 43663, pid: 1 });
  expect(await hideHelperPorts([main, tunnel])).toEqual([main]);
});

test('a process with only a random port keeps it', async () => {
  const only = makeServer({ port: 43663, pid: 2 });
  expect(await hideHelperPorts([makeServer({ port: 3005, pid: 1 }), only])).toContain(only);
});

test('main ports are never hidden', async () => {
  const servers = [makeServer({ port: 3000, pid: 1 }), makeServer({ port: 5173, pid: 1 })];
  expect(await hideHelperPorts(servers)).toEqual(servers);
});
