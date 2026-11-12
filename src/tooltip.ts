import * as vscode from 'vscode';
import {
  COPY_COMMAND,
  FORCE_STOP_COMMAND,
  OPEN_COMMAND,
  SETTINGS_COMMAND,
  STOP_COMMAND,
  TERMINAL_COMMAND,
} from './commands';
import { serverDetail, serverLabel } from './server-format';
import type { DevServer, ServerHealth } from './types';

const HEALTH_DOTS: Record<ServerHealth, string> = { serving: '🟢', failing: '🔴', starting: '🟡', unknown: '⚪' };

/** With more servers than this, action links show only icons so the hover stays short. */
const MAX_LABELED_SERVERS = 3;

function commandLink(icon: string, label: string, command: string, server: DevServer, compact: boolean): string {
  const args = encodeURIComponent(JSON.stringify([server.port]));
  const text = compact ? icon : `${icon} ${label}`;
  return `[${text}](command:${command}?${args} "${label}")`;
}

/** Safe actions on one line, destructive ones on the next, so Force Stop is not hit by accident. */
function actionLines(server: DevServer, compact: boolean): string {
  const safe = [
    commandLink('$(link-external)', 'Open', OPEN_COMMAND, server, compact),
    commandLink('$(copy)', 'Copy URL', COPY_COMMAND, server, compact),
    commandLink('$(terminal)', 'Terminal', TERMINAL_COMMAND, server, compact),
  ];
  const destructive = [
    commandLink('$(debug-stop)', 'Stop', STOP_COMMAND, server, compact),
    commandLink('$(zap)', 'Force Stop', FORCE_STOP_COMMAND, server, compact),
  ];
  const separator = ' &nbsp;·&nbsp; ';
  return `${safe.join(separator)}  \n${destructive.join(' &nbsp;&nbsp;&nbsp;&nbsp; ')}`;
}

/** Builds the hover: one block per server with its details and actions. */
export function buildTooltip(servers: DevServer[], nowMs: number): vscode.MarkdownString {
  const tooltip = new vscode.MarkdownString();
  tooltip.isTrusted = {
    enabledCommands: [OPEN_COMMAND, COPY_COMMAND, STOP_COMMAND, FORCE_STOP_COMMAND, TERMINAL_COMMAND, SETTINGS_COMMAND],
  };
  tooltip.supportThemeIcons = true;
  tooltip.appendMarkdown(`**PortScope** &nbsp; [$(gear)](command:${SETTINGS_COMMAND} "PortScope settings")\n\n`);
  const compact = servers.length > MAX_LABELED_SERVERS;
  for (const server of servers) {
    tooltip.appendMarkdown(`${HEALTH_DOTS[server.health]} **:${server.port}** &nbsp;`);
    tooltip.appendText(`${serverLabel(server)} · ${serverDetail(server, nowMs)}`);
    tooltip.appendMarkdown(`  \n${actionLines(server, compact)}\n\n`);
  }
  return tooltip;
}
