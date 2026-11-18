import path from 'node:path';

const RUNTIMES = new Set(['node', 'bun', 'deno', 'python', 'python3', 'ruby', 'php']);

function programName(token: string): string {
  return path.basename(token, path.extname(token)).toLowerCase();
}

/**
 * Names a command line can be ignored by: the program, and the script when the program is a runtime.
 * `/opt/bin/browse serve` gives `browse`, `node /tools/browse.js` gives `node` and `browse`.
 */
function commandNames(command: string): string[] {
  const [program, script] = command.split(' ');
  if (!program) {
    return [];
  }
  const name = programName(program);
  if (RUNTIMES.has(name) && script && !script.startsWith('-')) {
    return [name, programName(script)];
  }
  return [name];
}

/** True when the program or script of the command is one of the ignored names. Case does not matter. */
export function isIgnoredCommand(command: string, ignored: ReadonlySet<string>): boolean {
  return commandNames(command).some((name) => ignored.has(name));
}
