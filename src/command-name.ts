import path from 'node:path';

const RUNTIMES = new Set(['node', 'bun', 'deno', 'python', 'python3', 'ruby', 'php']);

/** Tool names (without extension) mapped to a readable framework label. */
const FRAMEWORKS: ReadonlyArray<readonly [string, string]> = [
  ['vite', 'Vite'],
  ['ng', 'Angular'],
  ['next', 'Next.js'],
  ['nuxt', 'Nuxt'],
  ['astro', 'Astro'],
  ['remix', 'Remix'],
  ['storybook', 'Storybook'],
  ['webpack', 'Webpack'],
  ['react-scripts', 'Create React App'],
  ['nest', 'NestJS'],
  ['uvicorn', 'Uvicorn'],
  ['gunicorn', 'Gunicorn'],
  ['flask', 'Flask'],
  ['dotnet', '.NET'],
  ['rails', 'Rails'],
  ['puma', 'Rails'],
];
const FRAMEWORK_TOKEN_LIMIT = 3;

/**
 * Shortens a full command line to the tool name.
 * `node /app/node_modules/.bin/vite --port 4200` becomes `vite`.
 */
function shortCommandName(command: string): string {
  const [program, script] = command.split(' ');
  if (!program) {
    return command;
  }
  const programName = path.basename(program);
  if (RUNTIMES.has(programName) && script && !script.startsWith('-')) {
    return path.basename(script);
  }
  return programName;
}

function toolName(token: string): string {
  return path.basename(token, path.extname(token));
}

function findFramework(command: string): string | undefined {
  const tokens = command.split(' ').slice(0, FRAMEWORK_TOKEN_LIMIT).map(toolName);
  if (command.includes('spring-boot') || command.includes('org.springframework')) {
    return 'Spring';
  }
  for (const [tool, label] of FRAMEWORKS) {
    if (tokens.some((token) => token === tool || token.startsWith(`${tool}-`))) {
      return label;
    }
  }
  return undefined;
}

/** Returns a readable framework name, or the short tool name when the framework is unknown. */
export function describeCommand(command: string): string {
  return findFramework(command) ?? shortCommandName(command);
}
