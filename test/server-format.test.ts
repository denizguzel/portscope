import { expect, test } from 'bun:test';
import { healthColorId, healthDot, overallColorId, serverDetail, serverUrl } from '../src/server-format';
import { makeServer } from './fixtures';

const NOW = 1_000_000_000;
const MINUTE = 60_000;

test('serverUrl appends the path as given', () => {
  expect(serverUrl(makeServer({ port: 4200 }))).toBe('http://localhost:4200');
  expect(serverUrl(makeServer({ port: 4200 }), '/admin')).toBe('http://localhost:4200/admin');
});

test('uptime under a minute reads just started', () => {
  const detail = serverDetail(makeServer({ startedAtMs: NOW - 5000, health: 'serving', httpStatus: 200 }), NOW);
  expect(detail).toContain('just started');
  expect(detail).toContain('HTTP 200');
});

test('uptime shows minutes, hours and days', () => {
  expect(serverDetail(makeServer({ startedAtMs: NOW - 12 * MINUTE }), NOW)).toContain('12m');
  expect(serverDetail(makeServer({ startedAtMs: NOW - 125 * MINUTE }), NOW)).toContain('2h 5m');
  expect(serverDetail(makeServer({ startedAtMs: NOW - 3 * 24 * 60 * MINUTE }), NOW)).toContain('3d');
});

test('health words', () => {
  expect(serverDetail(makeServer({ health: 'starting' }), NOW)).toContain('not answering');
  expect(serverDetail(makeServer({ health: 'failing', httpStatus: 500 }), NOW)).toContain('HTTP 500');
  expect(serverDetail(makeServer({ health: 'unknown' }), NOW)).not.toContain('HTTP');
});

test('health colors', () => {
  expect(healthColorId('serving')).toBe('charts.green');
  expect(healthColorId('failing')).toBe('charts.red');
  expect(healthColorId('starting')).toBe('charts.yellow');
  expect(healthColorId('unknown')).toBeUndefined();
});

test('overall color: red beats yellow beats green', () => {
  const serving = makeServer({ health: 'serving' });
  const starting = makeServer({ port: 1, health: 'starting' });
  const failing = makeServer({ port: 2, health: 'failing' });
  expect(overallColorId([serving])).toBe('charts.green');
  expect(overallColorId([serving, starting])).toBe('charts.yellow');
  expect(overallColorId([serving, starting, failing])).toBe('charts.red');
  expect(overallColorId([makeServer({ health: 'unknown' })])).toBeUndefined();
});

test('health dots', () => {
  expect(healthDot('serving')).toBe('🟢');
  expect(healthDot('failing')).toBe('🔴');
  expect(healthDot('starting')).toBe('🟡');
  expect(healthDot('unknown')).toBe('⚪');
});
