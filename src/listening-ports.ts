import { promises as fs } from 'node:fs';
import path from 'node:path';
import { readStartedAtMs, readSystemUptimeSeconds } from './process-start';
import type { DevServer, WorkspaceFolderInfo } from './types';

const LISTEN_STATE = '0A';
const SOCKET_PREFIX = 'socket:[';
const EDITOR_SERVER_MARKERS = [
  '.vscode-server',
  '.vscode-remote',
  '.windsurf-server',
  '.devin-server',
  '.cursor-server',
  'vscode-server',
];

/** Returns a map from socket inode to listening port for one /proc/net table. */
function parseListeningTable(table: string): Map<string, number> {
  const sockets = new Map<string, number>();
  for (const line of table.split('\n').slice(1)) {
    const fields = line.trim().split(/\s+/);
    const local = fields[1];
    const state = fields[3];
    const inode = fields[9];
    if (!local || !inode || inode === '0' || state !== LISTEN_STATE) {
      continue;
    }
    const port = Number.parseInt(local.slice(local.lastIndexOf(':') + 1), 16);
    if (Number.isInteger(port) && port > 0) {
      sockets.set(inode, port);
    }
  }
  return sockets;
}

async function readText(file: string): Promise<string> {
  try {
    return await fs.readFile(file, 'utf8');
  } catch {
    return '';
  }
}

async function readListeningSockets(): Promise<Map<string, number>> {
  const tables = await Promise.all([readText('/proc/net/tcp'), readText('/proc/net/tcp6')]);
  const sockets = new Map<string, number>();
  for (const table of tables) {
    for (const [inode, port] of parseListeningTable(table)) {
      sockets.set(inode, port);
    }
  }
  return sockets;
}

function isInside(folder: string, target: string): boolean {
  return target === folder || target.startsWith(folder + path.sep);
}

/** Picks the deepest workspace folder that contains the process directory. */
function findOwner(folders: WorkspaceFolderInfo[], cwd: string): WorkspaceFolderInfo | undefined {
  let owner: WorkspaceFolderInfo | undefined;
  for (const folder of folders) {
    if (isInside(folder.path, cwd) && (!owner || folder.path.length > owner.path.length)) {
      owner = folder;
    }
  }
  return owner;
}

function isEditorProcess(command: string): boolean {
  return EDITOR_SERVER_MARKERS.some((marker) => command.includes(marker));
}

async function readCommand(pid: string): Promise<string> {
  const raw = await readText(`/proc/${pid}/cmdline`);
  return raw.split('\0').join(' ').trim();
}

async function readProcessPorts(pid: string, sockets: Map<string, number>): Promise<number[]> {
  let descriptors: string[];
  try {
    descriptors = await fs.readdir(`/proc/${pid}/fd`);
  } catch {
    return [];
  }
  const ports = new Set<number>();
  await Promise.all(
    descriptors.map(async (descriptor) => {
      try {
        const target = await fs.readlink(`/proc/${pid}/fd/${descriptor}`);
        if (!target.startsWith(SOCKET_PREFIX)) {
          return;
        }
        const port = sockets.get(target.slice(SOCKET_PREFIX.length, -1));
        if (port !== undefined) {
          ports.add(port);
        }
      } catch {
        // The descriptor closed while scanning.
      }
    }),
  );
  return [...ports];
}

async function inspectProcess(
  pid: string,
  folders: WorkspaceFolderInfo[],
  sockets: Map<string, number>,
  systemUptimeSeconds: number | undefined,
): Promise<DevServer[]> {
  let cwd: string;
  try {
    cwd = await fs.readlink(`/proc/${pid}/cwd`);
  } catch {
    return [];
  }
  const owner = findOwner(folders, cwd);
  if (!owner) {
    return [];
  }
  const command = await readCommand(pid);
  if (isEditorProcess(command)) {
    return [];
  }
  const ports = await readProcessPorts(pid, sockets);
  if (ports.length === 0) {
    return [];
  }
  const relativePath = path.relative(owner.path, cwd);
  const startedAtMs = await readStartedAtMs(pid, systemUptimeSeconds);
  return ports.map((port) => ({
    port,
    pid: Number(pid),
    command,
    folderName: owner.name,
    relativePath,
    startedAtMs,
  }));
}

/**
 * Finds listening TCP servers whose process directory is inside one of the
 * given workspace folders. Servers of other windows never match.
 */
export async function findDevServers(folders: WorkspaceFolderInfo[]): Promise<DevServer[]> {
  if (process.platform !== 'linux' || folders.length === 0) {
    return [];
  }
  const sockets = await readListeningSockets();
  if (sockets.size === 0) {
    return [];
  }
  const pids = (await fs.readdir('/proc')).filter((entry) => /^\d+$/.test(entry) && entry !== String(process.pid));
  const systemUptimeSeconds = await readSystemUptimeSeconds();
  const found = (
    await Promise.all(pids.map((pid) => inspectProcess(pid, folders, sockets, systemUptimeSeconds)))
  ).flat();
  const byPort = new Map<number, DevServer>();
  for (const server of found) {
    if (!byPort.has(server.port)) {
      byPort.set(server.port, server);
    }
  }
  return [...byPort.values()].sort((left, right) => left.port - right.port);
}
