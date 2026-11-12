import http from 'node:http';
import type { DevServer, ServerHealth } from './types';

const TIMEOUT_MS = 900;
const BASE_RETRY_MS = 3000;
const MAX_RETRY_MS = 60_000;

interface Verdict {
  health: ServerHealth;
  httpStatus: number | undefined;
  attempts: number;
  retryAtMs: number;
}

export type HealthCache = Map<string, Verdict>;

function cacheKey(server: DevServer): string {
  return `${server.pid}:${server.port}`;
}

/**
 * A listening socket always accepts a TCP connection, so only a real HTTP reply
 * shows that the server is serving. `localhost` lets Node try both IPv4 and IPv6.
 */
function probeHttp(port: number): Promise<Pick<Verdict, 'health' | 'httpStatus'>> {
  return new Promise((resolve) => {
    const request = http.request(
      { host: 'localhost', port, method: 'HEAD', path: '/', timeout: TIMEOUT_MS, agent: false },
      (response) => {
        response.resume();
        resolve({ health: 'serving', httpStatus: response.statusCode });
      },
    );
    const giveUp = (): void => {
      request.destroy();
      resolve({ health: 'starting', httpStatus: undefined });
    };
    request.on('timeout', giveUp);
    request.on('error', giveUp);
    request.end();
  });
}

async function checkServer(server: DevServer, cache: HealthCache, nowMs: number): Promise<DevServer> {
  const key = cacheKey(server);
  const hit = cache.get(key);
  // A server that answered keeps answering. A silent one is retried with a growing delay,
  // so a slow start turns green later and a non-HTTP port is not asked every scan.
  if (hit && (hit.health === 'serving' || nowMs < hit.retryAtMs)) {
    return { ...server, health: hit.health, httpStatus: hit.httpStatus };
  }
  const result = await probeHttp(server.port);
  const attempts = (hit?.attempts ?? 0) + 1;
  const retryAtMs = nowMs + Math.min(BASE_RETRY_MS * 2 ** attempts, MAX_RETRY_MS);
  cache.set(key, { ...result, attempts, retryAtMs });
  return { ...server, ...result };
}

/** Adds the HTTP health of each server. Verdicts of servers that are gone are dropped. */
export async function applyHealth(servers: DevServer[], cache: HealthCache): Promise<DevServer[]> {
  const alive = new Set(servers.map(cacheKey));
  for (const key of cache.keys()) {
    if (!alive.has(key)) {
      cache.delete(key);
    }
  }
  const nowMs = Date.now();
  return Promise.all(servers.map((server) => checkServer(server, cache, nowMs)));
}
