import { promises as fs } from 'node:fs';

const MAX_DEPTH = 64;

/** Reads the parent pid from the text of /proc/<pid>/stat. The command name in parentheses may hold spaces. */
export function parseParentPid(stat: string): number | undefined {
  const afterName = stat.slice(stat.lastIndexOf(')') + 2).split(' ');
  const parent = Number(afterName[1]);
  return Number.isInteger(parent) && parent > 0 ? parent : undefined;
}

/** Returns the pid and all of its ancestors, nearest first. */
export async function readAncestorPids(pid: number): Promise<number[]> {
  const chain: number[] = [];
  let current: number | undefined = pid;
  while (current !== undefined && chain.length < MAX_DEPTH) {
    chain.push(current);
    try {
      current = parseParentPid(await fs.readFile(`/proc/${current}/stat`, 'utf8'));
    } catch {
      break;
    }
  }
  return chain;
}

/** True when `ancestor` is a parent, grandparent and so on of `pid`. */
export async function isDescendantOf(pid: number, ancestor: number): Promise<boolean> {
  const chain = await readAncestorPids(pid);
  return chain.slice(1).includes(ancestor);
}
