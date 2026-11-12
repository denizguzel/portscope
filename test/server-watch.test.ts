import { expect, test } from 'bun:test';
import { ServerWatch } from '../src/server-watch';
import { makeServer } from './fixtures';

test('the first scan reports nothing, even for a serving server', () => {
  const watch = new ServerWatch();
  expect(watch.observe([makeServer({ health: 'serving' })])).toEqual([]);
});

test('starting then serving is ready', () => {
  const watch = new ServerWatch();
  watch.observe([makeServer({ health: 'starting' })]);
  const events = watch.observe([makeServer({ health: 'serving' })]);
  expect(events.map((event) => event.kind)).toEqual(['ready']);
  expect(watch.observe([makeServer({ health: 'serving' })])).toEqual([]);
});

test('a vanished server is reported as stopped', () => {
  const watch = new ServerWatch();
  watch.observe([makeServer({ health: 'serving' })]);
  const events = watch.observe([]);
  expect(events.map((event) => event.kind)).toEqual(['stopped']);
  expect(events[0]?.server.port).toBe(3100);
});

test('a server stopped from PortScope is not reported', () => {
  const watch = new ServerWatch();
  watch.observe([makeServer({ pid: 7, health: 'serving' })]);
  watch.markStoppedByUser(7);
  expect(watch.observe([])).toEqual([]);
});

test('reset forgets earlier servers', () => {
  const watch = new ServerWatch();
  watch.observe([makeServer({ health: 'serving' })]);
  watch.reset();
  expect(watch.observe([])).toEqual([]);
});
