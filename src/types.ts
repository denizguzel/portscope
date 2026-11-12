export interface WorkspaceFolderInfo {
  name: string;
  /** Real path of the folder, with symlinks resolved. */
  path: string;
}

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
}
