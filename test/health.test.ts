import { afterEach, expect, test } from 'bun:test';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { applyHealth, type HealthCache } from '../src/health';
import { makeServer } from './fixtures';

const options = { path: '/', recheckMs: 0 };
const servers: http.Server[] = [];

async function listen(handler: http.RequestListener): Promise<number> {
  const server = http.createServer(handler);
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  return (server.address() as AddressInfo).port;
}

afterEach(() => {
  for (const server of servers.splice(0)) {
    server.close();
    server.closeAllConnections();
  }
});

test('a 2xx reply is serving', async () => {
  const port = await listen((_request, response) => response.writeHead(200).end());
  const [result] = await applyHealth([makeServer({ port })], new Map(), options);
  expect(result?.health).toBe('serving');
  expect(result?.httpStatus).toBe(200);
});

test('a 404 reply is still serving', async () => {
  const port = await listen((_request, response) => response.writeHead(404).end());
  const [result] = await applyHealth([makeServer({ port })], new Map(), options);
  expect(result?.health).toBe('serving');
});

test('a 5xx reply is failing', async () => {
  const port = await listen((_request, response) => response.writeHead(502).end());
  const [result] = await applyHealth([makeServer({ port })], new Map(), options);
  expect(result?.health).toBe('failing');
  expect(result?.httpStatus).toBe(502);
});

test('a silent port is starting', async () => {
  const port = await listen(() => {});
  const [result] = await applyHealth([makeServer({ port })], new Map(), options);
  expect(result?.health).toBe('starting');
});

test('the probe uses the configured path', async () => {
  const seen: string[] = [];
  const port = await listen((request, response) => {
    seen.push(request.url ?? '');
    response.writeHead(200).end();
  });
  await applyHealth([makeServer({ port })], new Map(), { path: '/health', recheckMs: 0 });
  expect(seen).toEqual(['/health']);
});

test('a serving server is not asked again when recheck is off', async () => {
  let requests = 0;
  const port = await listen((_request, response) => {
    requests += 1;
    response.writeHead(200).end();
  });
  const cache: HealthCache = new Map();
  await applyHealth([makeServer({ port })], cache, options);
  await applyHealth([makeServer({ port })], cache, options);
  expect(requests).toBe(1);
});

test('a serving server is asked again after the recheck time', async () => {
  let requests = 0;
  const port = await listen((_request, response) => {
    requests += 1;
    response.writeHead(200).end();
  });
  const cache: HealthCache = new Map();
  const quick = { path: '/', recheckMs: 1 };
  await applyHealth([makeServer({ port })], cache, quick);
  await Bun.sleep(5);
  await applyHealth([makeServer({ port })], cache, quick);
  expect(requests).toBe(2);
});

test('a frozen server turns from serving to starting on recheck', async () => {
  let frozen = false;
  const port = await listen((_request, response) => {
    if (!frozen) {
      response.writeHead(200).end();
    }
  });
  const cache: HealthCache = new Map();
  const quick = { path: '/', recheckMs: 1 };
  const [before] = await applyHealth([makeServer({ port })], cache, quick);
  frozen = true;
  await Bun.sleep(5);
  const [after] = await applyHealth([makeServer({ port })], cache, quick);
  expect(before?.health).toBe('serving');
  expect(after?.health).toBe('starting');
});

test('verdicts of servers that are gone are dropped', async () => {
  const port = await listen((_request, response) => response.writeHead(200).end());
  const cache: HealthCache = new Map();
  await applyHealth([makeServer({ port })], cache, options);
  await applyHealth([], cache, options);
  expect(cache.size).toBe(0);
});
