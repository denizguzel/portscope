import type { DevServer } from '../src/types';

export function makeServer(overrides: Partial<DevServer> = {}): DevServer {
  return {
    port: 3100,
    pid: 1234,
    command: 'node next dev',
    folderName: 'app',
    relativePath: '',
    startedAtMs: undefined,
    health: 'unknown',
    httpStatus: undefined,
    ...overrides,
  };
}
