import * as vscode from 'vscode';
import { OPEN_COMMAND } from './commands';
import { buildPickEntries, COPY_BUTTON, ICON, isServerEntry, STOP_BUTTON, type PickEntry } from './pick-items';
import { serverDetail, serverUrl } from './server-format';
import { buildTooltip } from './tooltip';
import type { DevServer } from './types';

/** With more servers than this, the item shows a count instead of every port. */
const MAX_INLINE_PORTS = 2;

async function openServer(server: DevServer): Promise<void> {
  await vscode.env.openExternal(vscode.Uri.parse(serverUrl(server)));
}

async function copyServerUrl(server: DevServer): Promise<void> {
  await vscode.env.clipboard.writeText(serverUrl(server));
  void vscode.window.showInformationMessage(`DevPorts: copied ${serverUrl(server)}`);
}

/** Sends SIGTERM to the server process. A process that already exited counts as stopped. */
function terminate(pid: number): void {
  try {
    process.kill(pid, 'SIGTERM');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ESRCH') {
      throw error;
    }
  }
}

function statusText(servers: DevServer[]): string {
  if (servers.length <= MAX_INLINE_PORTS) {
    return `${ICON} ${servers.map((server) => `:${server.port}`).join(' · ')}`;
  }
  return `${ICON} ${servers.length} servers`;
}

/** Changes only when the hover content would change, so an open hover is not reset by each scan. */
function tooltipKey(servers: DevServer[], nowMs: number): string {
  return servers.map((server) => `${server.pid}:${server.port}:${serverDetail(server, nowMs)}`).join('|');
}

/** Shows one status bar item for the dev servers of this window. */
export class DevPortsStatusBar implements vscode.Disposable {
  private readonly item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
  private servers: DevServer[] = [];
  private lastTooltipKey = '';
  private lastText = '';
  private visible = false;

  constructor() {
    this.item.command = OPEN_COMMAND;
    this.item.name = 'DevPorts';
  }

  update(servers: DevServer[]): void {
    this.servers = servers;
    if (servers.length === 0) {
      this.lastTooltipKey = '';
      this.lastText = '';
      this.visible = false;
      this.item.hide();
      return;
    }
    // Write to the item only when a value changes. Each write makes VS Code redraw
    // the item, and a redraw closes and reopens an open hover, which looks like flicker.
    const nowMs = Date.now();
    const text = statusText(servers);
    if (text !== this.lastText) {
      this.lastText = text;
      this.item.text = text;
    }
    const key = tooltipKey(servers, nowMs);
    if (key !== this.lastTooltipKey) {
      this.lastTooltipKey = key;
      this.item.tooltip = buildTooltip(servers, nowMs);
    }
    if (!this.visible) {
      this.visible = true;
      this.item.show();
    }
  }

  /** Opens the given or only server directly, or lets the user pick one. */
  async open(port?: number): Promise<void> {
    if (port === undefined && this.servers.length > 1) {
      this.showOpenPicker();
      return;
    }
    const target = await this.resolveTarget(port, 'Open a dev server');
    if (target) {
      await openServer(target);
    }
  }

  async copyUrl(port?: number): Promise<void> {
    const target = await this.resolveTarget(port, 'Copy the URL of a dev server');
    if (target) {
      await copyServerUrl(target);
    }
  }

  /** Stops the server on the given port, the only server, or the one the user picks. */
  async stop(port?: number): Promise<void> {
    const target = await this.resolveTarget(port, 'Stop a dev server');
    if (target) {
      await this.stopServer(target);
    }
  }

  dispose(): void {
    this.item.dispose();
  }

  private notifyEmpty(): void {
    void vscode.window.showInformationMessage('DevPorts: no dev server is running in this window.');
  }

  /** Uses the given port, else the only server, else asks the user. */
  private async resolveTarget(port: number | undefined, placeHolder: string): Promise<DevServer | undefined> {
    if (port !== undefined) {
      return this.servers.find((server) => server.port === port);
    }
    const [first] = this.servers;
    if (!first) {
      this.notifyEmpty();
      return undefined;
    }
    if (this.servers.length === 1) {
      return first;
    }
    const picked = await vscode.window.showQuickPick<PickEntry>(buildPickEntries(this.servers, Date.now()), {
      placeHolder,
      matchOnDescription: true,
    });
    return picked && isServerEntry(picked) ? picked.server : undefined;
  }

  private showOpenPicker(): void {
    const picker = vscode.window.createQuickPick<PickEntry>();
    picker.placeholder = 'Open a dev server';
    picker.matchOnDescription = true;
    const render = (): void => {
      picker.items = buildPickEntries(this.servers, Date.now());
      if (this.servers.length === 0) {
        picker.hide();
      }
    };
    picker.onDidAccept(() => {
      const [selected] = picker.selectedItems;
      if (selected && isServerEntry(selected)) {
        picker.hide();
        void openServer(selected.server);
      }
    });
    picker.onDidTriggerItemButton((event) => {
      if (!isServerEntry(event.item)) {
        return;
      }
      if (event.button === STOP_BUTTON) {
        void this.stopServer(event.item.server).then(render);
      } else if (event.button === COPY_BUTTON) {
        picker.hide();
        void copyServerUrl(event.item.server);
      }
    });
    picker.onDidHide(() => picker.dispose());
    render();
    picker.show();
  }

  private async stopServer(server: DevServer): Promise<void> {
    try {
      terminate(server.pid);
    } catch (error) {
      void vscode.window.showErrorMessage(`DevPorts: could not stop :${server.port}. ${String(error)}`);
      return;
    }
    // Hide it at once. The next scan shows it again if the process kept running.
    this.update(this.servers.filter((current) => current.pid !== server.pid));
    void vscode.window.showInformationMessage(`DevPorts: stopped :${server.port}.`);
  }
}
