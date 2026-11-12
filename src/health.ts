import http from 'node:http';
import type { DevServer, ServerHealth } from './types';

const TIMEOUT_MS = 900;
const SERVER_ERROR_STATUS = 500;

export interface HealthOptions {
  /** Request path of the probe, with a leading slash. */
  path: string;
  /** A server that answered is asked again after this long. 0 means never. */
  recheckMs: number;
}

interface Verdict {
  health: ServerHealth;
  httpStatus: number | undefined;
  checkedAtMs: number;
}

export type HealthCache = Map<string, Verdict>;

function cacheKey(server: DevServer): string {
  return `${server.pid}:${server.port}`;
}

function classify(status: number | undefined): ServerHealth {
  return status !== undefined && status >= SERVER_ERROR_STATUS ? 'failing' : 'serving';
}

/**
 * A listening socket always accepts a TCP connection, so only a real HTTP reply
 * shows that the server is serving. `localhost` lets Node try both IPv4 and IPv6.
 */
function probeHttp(port: number, path: string): Promise<Pick<Verdict, 'health' | 'httpStatus'>> {
  return new Promise((resolve) => {
    const request = http.request(
      { host: 'localhost', port, method: 'HEAD', path, timeout: TIMEOUT_MS, agent: false },
      (response) => {
        response.resume();
        resolve({ health: classify(response.statusCode), httpStatus: response.statusCode });
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

function isFresh(hit: Verdict | undefined, nowMs: number, options: HealthOptions): hit is Verdict {
  if (hit?.health !== 'serving') {
    return false;
  }
  return options.recheckMs <= 0 || nowMs - hit.checkedAtMs < options.recheckMs;
}

async function checkServer(
  server: DevServer,
  cache: HealthCache,
  nowMs: number,
  options: HealthOptions,
): Promise<DevServer> {
  const key = cacheKey(server);
  const hit = cache.get(key);
  // A healthy server is trusted until the recheck time. Anything else (silent, 5xx)
  // is asked again on every scan, so a recovery shows up at once.
  if (isFresh(hit, nowMs, options)) {
    return { ...server, health: hit.health, httpStatus: hit.httpStatus };
  }
  const result = await probeHttp(server.port, options.path);
  cache.set(key, { ...result, checkedAtMs: nowMs });
  return { ...server, ...result };
}

/** Adds the HTTP health of each server. Verdicts of servers that are gone are dropped. */
export async function applyHealth(
  servers: DevServer[],
  cache: HealthCache,
  options: HealthOptions,
): Promise<DevServer[]> {
  const alive = new Set(servers.map(cacheKey));
  for (const key of cache.keys()) {
    if (!alive.has(key)) {
      cache.delete(key);
    }
  }
  const nowMs = Date.now();
  return Promise.all(servers.map((server) => checkServer(server, cache, nowMs, options)));
}
