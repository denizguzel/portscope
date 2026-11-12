import * as vscode from 'vscode';
import { OPEN_COMMAND } from './commands';
import type { ServerEvent } from './server-watch';
import type { PortScopeSettings } from './settings';

const OPEN_ACTION = 'Open';

async function announceReady(event: ServerEvent): Promise<void> {
  const choice = await vscode.window.showInformationMessage(`PortScope: :${event.server.port} is ready.`, OPEN_ACTION);
  if (choice === OPEN_ACTION) {
    await vscode.commands.executeCommand(OPEN_COMMAND, event.server.port);
  }
}

/** Shows a message for each event, unless its notification setting is off. */
export function showNotifications(events: ServerEvent[], settings: PortScopeSettings): void {
  for (const event of events) {
    if (event.kind === 'ready' && settings.notifyReady) {
      void announceReady(event);
    } else if (event.kind === 'stopped' && settings.notifyStopped) {
      void vscode.window.showWarningMessage(`PortScope: :${event.server.port} stopped.`);
    }
  }
}
