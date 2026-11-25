import { promises as fs } from 'node:fs';
import type { DevServer } from './types';

/** Linux default when the kernel setting cannot be read. */
const DEFAULT_RANGE: PortRange = { low: 32768, high: 60999 };

interface PortRange {
  low: number;
  high: number;
}

/** Reads the range the kernel picks ports from when a program listens on port 0. */
async function readEphemeralRange(): Promise<PortRange> {
  try {
    const raw = await fs.readFile('/proc/sys/net/ipv4/ip_local_port_range', 'utf8');
    const [low, high] = raw.trim().split(/\s+/).map(Number);
    if (low !== undefined && high !== undefined && Number.isInteger(low) && Number.isInteger(high) && low <= high) {
      return { low, high };
    }
  } catch {
    // Fall back to the default range.
  }
  return DEFAULT_RANGE;
}

function isEphemeral(port: number, range: PortRange): boolean {
  return port >= range.low && port <= range.high;
}

/**
 * Drops ports the kernel picked at random, such as an SSH tunnel or an internal socket,
 * when the same process also listens on a chosen port. A process with only random ports keeps them.
 */
export async function hideHelperPorts(servers: DevServer[]): Promise<DevServer[]> {
  const range = await readEphemeralRange();
  const pidsWithMainPort = new Set(
    servers.filter((server) => !isEphemeral(server.port, range)).map((server) => server.pid),
  );
  return servers.filter((server) => !isEphemeral(server.port, range) || !pidsWithMainPort.has(server.pid));
}
