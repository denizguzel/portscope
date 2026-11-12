import type { DevServer } from './types';

export interface ServerEvent {
  kind: 'ready' | 'stopped';
  server: DevServer;
}

function serverKey(server: DevServer): string {
  return `${server.pid}:${server.port}`;
}

/** Compares each scan with the previous one and reports servers that became ready or vanished. */
export class ServerWatch {
  private known = new Map<string, DevServer>();
  private readonly stoppedByUser = new Set<number>();

  /** A server stopped from PortScope is not reported as a crash. */
  markStoppedByUser(pid: number): void {
    this.stoppedByUser.add(pid);
  }

  /** Forgets everything, for example when the workspace folders change. */
  reset(): void {
    this.known = new Map();
    this.stoppedByUser.clear();
  }

  observe(servers: DevServer[]): ServerEvent[] {
    const events: ServerEvent[] = [];
    const current = new Map(servers.map((server) => [serverKey(server), server]));
    for (const [key, server] of current) {
      if (this.known.get(key)?.health === 'starting' && server.health === 'serving') {
        events.push({ kind: 'ready', server });
      }
    }
    for (const [key, server] of this.known) {
      if (current.has(key)) {
        continue;
      }
      if (this.stoppedByUser.delete(server.pid)) {
        continue;
      }
      events.push({ kind: 'stopped', server });
    }
    this.known = current;
    return events;
  }
}
