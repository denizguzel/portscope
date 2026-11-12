import { describeCommand } from './command-name';
import type { DevServer, ServerHealth } from './types';

const SECOND_MS = 1000;
const MINUTE_SECONDS = 60;
const HOUR_MINUTES = 60;
const DAY_HOURS = 24;

/** URL of the server. `path` is appended as is, so it must start with a slash or be empty. */
export function serverUrl(server: DevServer, path = ''): string {
  return `http://localhost:${server.port}${path}`;
}

export function serverLabel(server: DevServer): string {
  return server.relativePath ? `${server.folderName}/${server.relativePath}` : server.folderName;
}

/**
 * Formats how long a server has been running, for example `just started`, `12m`, `2h 5m` or `3d`.
 * It never shows seconds: VS Code does not refresh an open hover, so seconds would look frozen.
 */
function formatUptime(startedAtMs: number | undefined, nowMs: number): string {
  if (startedAtMs === undefined) {
    return '';
  }
  const seconds = Math.max(0, Math.floor((nowMs - startedAtMs) / SECOND_MS));
  if (seconds < MINUTE_SECONDS) {
    return 'just started';
  }
  const minutes = Math.floor(seconds / MINUTE_SECONDS);
  if (minutes < HOUR_MINUTES) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / HOUR_MINUTES);
  if (hours < DAY_HOURS) {
    const rest = minutes % HOUR_MINUTES;
    return rest > 0 ? `${hours}h ${rest}m` : `${hours}h`;
  }
  return `${Math.floor(hours / DAY_HOURS)}d`;
}

/** Short health text, for example `HTTP 200` or `not answering`. Empty when health was not checked. */
function healthWord(server: DevServer): string {
  if (server.health === 'starting') {
    return 'not answering';
  }
  if (server.health === 'serving' || server.health === 'failing') {
    return server.httpStatus === undefined ? server.health : `HTTP ${server.httpStatus}`;
  }
  return '';
}

const HEALTH_COLOR_IDS: Record<ServerHealth, string | undefined> = {
  serving: 'charts.green',
  failing: 'charts.red',
  starting: 'charts.yellow',
  unknown: undefined,
};

/** Theme color id of the health dot, or undefined when health was not checked. */
export function healthColorId(health: ServerHealth): string | undefined {
  return HEALTH_COLOR_IDS[health];
}

/** Color for the status bar item: red if any server fails, yellow if any is silent, green if all answer. */
export function overallColorId(servers: DevServer[]): string | undefined {
  if (servers.some((server) => server.health === 'failing')) {
    return healthColorId('failing');
  }
  if (servers.some((server) => server.health === 'starting')) {
    return healthColorId('starting');
  }
  return servers.every((server) => server.health === 'serving') ? healthColorId('serving') : undefined;
}

/** Framework name, uptime and health, for example `Vite · 12m · HTTP 200`. */
export function serverDetail(server: DevServer, nowMs: number): string {
  const parts = [describeCommand(server.command), formatUptime(server.startedAtMs, nowMs), healthWord(server)];
  return parts.filter(Boolean).join(' · ');
}
