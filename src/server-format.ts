import { describeCommand } from './command-name';
import type { DevServer } from './types';

const SECOND_MS = 1000;
const MINUTE_SECONDS = 60;
const HOUR_MINUTES = 60;
const DAY_HOURS = 24;

export function serverUrl(server: DevServer): string {
  return `http://localhost:${server.port}`;
}

export function serverLabel(server: DevServer): string {
  return server.relativePath ? `${server.folderName}/${server.relativePath}` : server.folderName;
}

/**
 * Formats how long a server has been running, for example `<1m`, `12m`, `2h 5m` or `3d`.
 * It never shows seconds: VS Code does not refresh an open hover, so seconds would look frozen.
 */
function formatUptime(startedAtMs: number | undefined, nowMs: number): string {
  if (startedAtMs === undefined) {
    return '';
  }
  const seconds = Math.max(0, Math.floor((nowMs - startedAtMs) / SECOND_MS));
  if (seconds < MINUTE_SECONDS) {
    return '<1m';
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

/** Framework name and uptime, for example `Vite · 12m`. */
export function serverDetail(server: DevServer, nowMs: number): string {
  const uptime = formatUptime(server.startedAtMs, nowMs);
  const framework = describeCommand(server.command);
  return uptime ? `${framework} · ${uptime}` : framework;
}
