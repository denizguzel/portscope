import * as vscode from 'vscode';

const DEFAULT_INTERVAL_SECONDS = 2;
const DEFAULT_RECHECK_SECONDS = 10;
const SECOND_MS = 1000;

export interface PortScopeSettings {
  refreshIntervalMs: number;
  healthCheck: boolean;
  healthRecheckMs: number;
  healthPath: string;
  ignorePorts: Set<number>;
  /** Appended to the URL when opening or copying. Empty or starts with a slash. */
  openPath: string;
  notifyReady: boolean;
  notifyStopped: boolean;
}

/** Turns `admin` into `/admin` and blank text into an empty path. */
function normalizePath(raw: string, fallback: string): string {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return fallback;
  }
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

function readPorts(raw: unknown): Set<number> {
  if (!Array.isArray(raw)) {
    return new Set();
  }
  return new Set(raw.filter((port): port is number => Number.isInteger(port) && port > 0));
}

export function readSettings(): PortScopeSettings {
  const config = vscode.workspace.getConfiguration('portScope');
  const interval = config.get<number>('refreshIntervalSeconds', DEFAULT_INTERVAL_SECONDS);
  const recheck = config.get<number>('healthRecheckSeconds', DEFAULT_RECHECK_SECONDS);
  return {
    refreshIntervalMs: Math.max(1, interval) * SECOND_MS,
    healthCheck: config.get<boolean>('healthCheck', true),
    healthRecheckMs: Math.max(0, recheck) * SECOND_MS,
    healthPath: normalizePath(config.get<string>('healthPath', '/'), '/'),
    ignorePorts: readPorts(config.get<unknown>('ignorePorts', [])),
    openPath: normalizePath(config.get<string>('openPath', ''), ''),
    notifyReady: config.get<boolean>('notifications.ready', true),
    notifyStopped: config.get<boolean>('notifications.stopped', true),
  };
}
