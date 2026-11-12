import * as vscode from 'vscode';
import { isDescendantOf, readAncestorPids } from './process-tree';

/** Finds the integrated terminal whose shell started the given process. */
export async function findTerminal(pid: number): Promise<vscode.Terminal | undefined> {
  const ancestors = new Set(await readAncestorPids(pid));
  for (const terminal of vscode.window.terminals) {
    const shellPid = await terminal.processId;
    if (shellPid !== undefined && ancestors.has(shellPid)) {
      return terminal;
    }
  }
  return undefined;
}

/**
 * True when an extension started the process itself, for example Script Dock in background mode.
 * Such a process is a child of the extension host, which is this process, and has no terminal.
 */
export function isStartedByExtension(pid: number): Promise<boolean> {
  return isDescendantOf(pid, process.pid);
}
