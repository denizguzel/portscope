import { promises as fs } from 'node:fs';

/** Linux reports process start times in clock ticks. The tick rate is 100 on all common kernels. */
const CLOCK_TICKS_PER_SECOND = 100;
const START_TIME_INDEX_AFTER_COMM = 19;

export async function readSystemUptimeSeconds(): Promise<number | undefined> {
  try {
    const seconds = Number.parseFloat((await fs.readFile('/proc/uptime', 'utf8')).split(' ')[0] ?? '');
    return Number.isFinite(seconds) ? seconds : undefined;
  } catch {
    return undefined;
  }
}

/** Returns the wall-clock start time of a process, or undefined when it cannot be read. */
export async function readStartedAtMs(
  pid: string,
  systemUptimeSeconds: number | undefined,
): Promise<number | undefined> {
  if (systemUptimeSeconds === undefined) {
    return undefined;
  }
  try {
    const stat = await fs.readFile(`/proc/${pid}/stat`, 'utf8');
    // The command name sits in parentheses and may contain spaces, so count fields after the last ")".
    const fields = stat.slice(stat.lastIndexOf(')') + 2).split(' ');
    const startTicks = Number(fields[START_TIME_INDEX_AFTER_COMM]);
    if (!Number.isFinite(startTicks)) {
      return undefined;
    }
    const runningSeconds = systemUptimeSeconds - startTicks / CLOCK_TICKS_PER_SECOND;
    return Date.now() - Math.max(0, runningSeconds) * 1000;
  } catch {
    return undefined;
  }
}
