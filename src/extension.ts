import { promises as fs } from 'node:fs';
import * as vscode from 'vscode';
import { findDevServers } from './listening-ports';
import { COPY_COMMAND, FORCE_STOP_COMMAND, OPEN_COMMAND, STOP_COMMAND } from './commands';
import { applyHealth, type HealthCache } from './health';
import { PortScopeStatusBar } from './status-bar';
import type { WorkspaceFolderInfo } from './types';

const DEFAULT_INTERVAL_SECONDS = 3;

async function readWorkspaceFolders(): Promise<WorkspaceFolderInfo[]> {
  const folders = vscode.workspace.workspaceFolders ?? [];
  const resolved = await Promise.all(
    folders.map(async (folder) => {
      try {
        return { name: folder.name, path: await fs.realpath(folder.uri.fsPath) };
      } catch {
        return undefined;
      }
    }),
  );
  return resolved.filter((folder): folder is WorkspaceFolderInfo => folder !== undefined);
}

function isHealthCheckEnabled(): boolean {
  return vscode.workspace.getConfiguration('portScope').get<boolean>('healthCheck', true);
}

function readIntervalMs(): number {
  const seconds = vscode.workspace.getConfiguration('portScope').get<number>('refreshIntervalSeconds');
  return Math.max(1, seconds ?? DEFAULT_INTERVAL_SECONDS) * 1000;
}

export function activate(context: vscode.ExtensionContext): void {
  const statusBar = new PortScopeStatusBar();
  const healthCache: HealthCache = new Map();
  let timer: NodeJS.Timeout | undefined;
  let disposed = false;

  const refresh = async (): Promise<void> => {
    try {
      const servers = await findDevServers(await readWorkspaceFolders());
      statusBar.update(isHealthCheckEnabled() ? await applyHealth(servers, healthCache) : servers);
    } catch {
      statusBar.update([]);
    }
  };

  // Scan only while the window is focused, so idle windows cost nothing.
  const schedule = (): void => {
    clearTimeout(timer);
    if (disposed || !vscode.window.state.focused) {
      return;
    }
    timer = setTimeout(() => {
      void refresh().finally(schedule);
    }, readIntervalMs());
  };

  const restart = (): void => {
    void refresh().finally(schedule);
  };

  context.subscriptions.push(
    statusBar,
    vscode.commands.registerCommand(OPEN_COMMAND, (port?: number) => statusBar.open(port)),
    vscode.commands.registerCommand(COPY_COMMAND, (port?: number) => statusBar.copyUrl(port)),
    vscode.commands.registerCommand(STOP_COMMAND, (port?: number) => statusBar.stop(port)),
    vscode.commands.registerCommand(FORCE_STOP_COMMAND, (port?: number) => statusBar.forceStop(port)),
    vscode.window.onDidChangeWindowState(restart),
    vscode.workspace.onDidChangeWorkspaceFolders(restart),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('portScope')) {
        restart();
      }
    }),
    {
      dispose: () => {
        disposed = true;
        clearTimeout(timer);
      },
    },
  );

  restart();
}

export function deactivate(): void {}
