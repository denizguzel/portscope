import { promises as fs } from 'node:fs';
import * as vscode from 'vscode';
import { findDevServers } from './listening-ports';
import {
  COPY_COMMAND,
  FORCE_STOP_COMMAND,
  OPEN_COMMAND,
  SETTINGS_COMMAND,
  STOP_COMMAND,
  TERMINAL_COMMAND,
} from './commands';
import { applyHealth, type HealthCache } from './health';
import { showNotifications } from './notifications';
import { ServerWatch } from './server-watch';
import { readSettings } from './settings';
import { PortScopeStatusBar } from './status-bar';
import type { DevServer, WorkspaceFolderInfo } from './types';

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

export function activate(context: vscode.ExtensionContext): void {
  const watch = new ServerWatch();
  const statusBar = new PortScopeStatusBar((server: DevServer) => watch.markStoppedByUser(server.pid));
  const healthCache: HealthCache = new Map();
  let timer: NodeJS.Timeout | undefined;
  let disposed = false;

  const refresh = async (): Promise<void> => {
    try {
      const settings = readSettings();
      const found = await findDevServers(await readWorkspaceFolders());
      const servers = found.filter((server) => !settings.ignorePorts.has(server.port));
      const checked = settings.healthCheck
        ? await applyHealth(servers, healthCache, { path: settings.healthPath, recheckMs: settings.healthRecheckMs })
        : servers;
      statusBar.update(checked);
      showNotifications(watch.observe(checked), settings);
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
    }, readSettings().refreshIntervalMs);
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
    vscode.commands.registerCommand(TERMINAL_COMMAND, (port?: number) => statusBar.showTerminal(port)),
    vscode.commands.registerCommand(SETTINGS_COMMAND, () =>
      vscode.commands.executeCommand('workbench.action.openSettings', `@ext:${context.extension.id}`),
    ),
    vscode.window.onDidChangeWindowState(restart),
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      watch.reset();
      restart();
    }),
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
