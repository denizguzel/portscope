import * as vscode from 'vscode';
import { healthColorId, serverDetail } from './server-format';
import type { DevServer } from './types';

export const ICON = '$(rocket)';

export const COPY_BUTTON: vscode.QuickInputButton = {
  iconPath: new vscode.ThemeIcon('copy'),
  tooltip: 'Copy URL',
};
export const TERMINAL_BUTTON: vscode.QuickInputButton = {
  iconPath: new vscode.ThemeIcon('terminal'),
  tooltip: 'Show terminal',
};
export const STOP_BUTTON: vscode.QuickInputButton = {
  iconPath: new vscode.ThemeIcon('debug-stop'),
  tooltip: 'Stop server',
};

export const FORCE_BUTTON: vscode.QuickInputButton = {
  iconPath: new vscode.ThemeIcon('zap'),
  tooltip: 'Force Stop (SIGKILL)',
};

export interface ServerPickItem extends vscode.QuickPickItem {
  server: DevServer;
}

export type PickEntry = ServerPickItem | vscode.QuickPickItem;

export function isServerEntry(entry: PickEntry): entry is ServerPickItem {
  return 'server' in entry;
}

function healthIcon(server: DevServer): vscode.ThemeIcon {
  const colorId = healthColorId(server.health);
  if (!colorId) {
    return new vscode.ThemeIcon('circle-outline');
  }
  return new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor(colorId));
}

function toPickItem(server: DevServer, nowMs: number): ServerPickItem {
  return {
    iconPath: healthIcon(server),
    label: `:${server.port}`,
    description: server.relativePath,
    detail: serverDetail(server, nowMs),
    buttons: [COPY_BUTTON, TERMINAL_BUTTON, STOP_BUTTON, FORCE_BUTTON],
    server,
  };
}

/** Groups the servers under one separator per workspace folder. */
export function buildPickEntries(servers: DevServer[], nowMs: number): PickEntry[] {
  const folders = [...new Set(servers.map((server) => server.folderName))].sort();
  return folders.flatMap((folderName): PickEntry[] => [
    { label: folderName, kind: vscode.QuickPickItemKind.Separator },
    ...servers.filter((server) => server.folderName === folderName).map((server) => toPickItem(server, nowMs)),
  ]);
}
