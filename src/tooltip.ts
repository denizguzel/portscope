import * as vscode from 'vscode';
import { COPY_COMMAND, FORCE_STOP_COMMAND, OPEN_COMMAND, STOP_COMMAND } from './commands';
import { serverDetail, serverLabel } from './server-format';
import type { DevServer, ServerHealth } from './types';

const HEALTH_DOTS: Record<ServerHealth, string> = { serving: '🟢', starting: '🟡', unknown: '⚪' };

function commandLink(label: string, command: string, server: DevServer): string {
  const args = encodeURIComponent(JSON.stringify([server.port]));
  return `[${label}](command:${command}?${args})`;
}

function actionLine(server: DevServer): string {
  return [
    commandLink('$(link-external) Open', OPEN_COMMAND, server),
    commandLink('$(copy) Copy URL', COPY_COMMAND, server),
    commandLink('$(debug-stop) Stop', STOP_COMMAND, server),
    commandLink('$(zap) Force', FORCE_STOP_COMMAND, server),
  ].join(' &nbsp;·&nbsp; ');
}

/** Builds the hover: one block per server with its details and actions. */
export function buildTooltip(servers: DevServer[], nowMs: number): vscode.MarkdownString {
  const tooltip = new vscode.MarkdownString();
  tooltip.isTrusted = { enabledCommands: [OPEN_COMMAND, COPY_COMMAND, STOP_COMMAND, FORCE_STOP_COMMAND] };
  tooltip.supportThemeIcons = true;
  tooltip.appendMarkdown('**PortScope**\n\n');
  for (const server of servers) {
    tooltip.appendMarkdown(`${HEALTH_DOTS[server.health]} **:${server.port}** &nbsp;`);
    tooltip.appendText(`${serverLabel(server)} · ${serverDetail(server, nowMs)}`);
    tooltip.appendMarkdown(`  \n${actionLine(server)}\n\n`);
  }
  return tooltip;
}
