import * as vscode from 'vscode';
import { serverDetail } from './server-format';
import type { DevServer } from './types';

export const ICON = '$(rocket)';

export const COPY_BUTTON: vscode.QuickInputButton = {
  iconPath: new vscode.ThemeIcon('copy'),
  tooltip: 'Copy URL',
};
export const STOP_BUTTON: vscode.QuickInputButton = {
  iconPath: new vscode.ThemeIcon('debug-stop'),
  tooltip: 'Stop server',
};

export interface ServerPickItem extends vscode.QuickPickItem {
  server: DevServer;
}

export type PickEntry = ServerPickItem | vscode.QuickPickItem;

export function isServerEntry(entry: PickEntry): entry is ServerPickItem {
  return 'server' in entry;
}

function toPickItem(server: DevServer, nowMs: number): ServerPickItem {
  return {
    label: `${ICON} :${server.port}`,
    description: server.relativePath,
    detail: serverDetail(server, nowMs),
    buttons: [COPY_BUTTON, STOP_BUTTON],
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
