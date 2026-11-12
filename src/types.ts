export interface WorkspaceFolderInfo {
  name: string;
  /** Real path of the folder, with symlinks resolved. */
  path: string;
}

/** `serving` answered an HTTP request, `starting` did not answer, `unknown` was not checked. */
export type ServerHealth = 'serving' | 'starting' | 'unknown';

export interface DevServer {
  port: number;
  pid: number;
  command: string;
  /** Name of the workspace folder that owns the process. */
  folderName: string;
  /** Process directory relative to the workspace folder. Empty at the folder root. */
  relativePath: string;
  /** Wall-clock start time of the process in milliseconds, when it can be read. */
  startedAtMs: number | undefined;
  health: ServerHealth;
  /** Status code of the HTTP reply, when the server answered. */
  httpStatus: number | undefined;
}
