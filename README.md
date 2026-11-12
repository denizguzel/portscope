# PortScope

VS Code extension that shows the dev servers of the current window in the status bar and opens them in one click.

## Behavior

- No server: the status bar item is hidden.
- One server: `🚀 :4200`. A click opens `http://localhost:4200`.
- Two servers: `🚀 :4200 · :8080`. Three or more: `🚀 3 servers`. A click opens a picker.
- The picker groups servers by project. Each row shows the framework (Vite, Angular, Next.js, Spring and others), the uptime and the health, with copy, stop and force stop buttons.
- The hover shows each server as `🟢 :4200 project · Vite · 12m · HTTP 200` with **Open**, **Copy URL**, **Stop** and **Force** actions.
- Stop sends SIGTERM. Force sends SIGKILL. Neither asks for confirmation. Commands: `PortScope: Open Dev Server`, `PortScope: Copy Dev Server URL`, `PortScope: Stop Dev Server`, `PortScope: Force Stop Dev Server (SIGKILL)`.
- Each window shows only servers started from its own workspace folders. There is no global port list.
- In a monorepo, the item shows the sub-folder of the server, for example `demo-app/apps/web`.

## How it works

The extension runs on the workspace side (WSL or Linux). Every few seconds it reads `/proc/net/tcp` and `/proc/net/tcp6` for listening sockets. It maps each socket to a process and keeps the process only if its working directory is inside a workspace folder. VS Code server processes are ignored. Scanning pauses while the window is not focused.

Windows without a Linux workspace side (plain local Windows or macOS) show nothing.

## Health dot

A listening socket always accepts a TCP connection, so a connection proves nothing. PortScope sends one `HEAD /` request to `localhost` on each port:

| Dot    | State    | Meaning                                                                   |
| ------ | -------- | ------------------------------------------------------------------------- |
| green  | serving  | The server answered an HTTP request. The status bar item turns green.     |
| yellow | starting | The port is bound but silent: still compiling, hung, or not an HTTP port. |
| grey   | unknown  | Health check is off.                                                      |

A server that answered is never asked again. A silent one is retried after 6 s, 12 s, 24 s and so on, up to once a minute, so a slow start turns green later. If any server is yellow, the status bar item is yellow.

## Settings

| Setting                            | Default | Description                                               |
| ---------------------------------- | ------- | --------------------------------------------------------- |
| `portScope.refreshIntervalSeconds` | `3`     | Scan interval while the window is focused.                |
| `portScope.healthCheck`            | `true`  | Send one `HEAD /` request per dev server to check health. |

## Development

```bash
bun install
bun run format
bun run lint
bun run build
```

Press `F5` ("Run Extension") to start an Extension Development Host. Run `bun run package:vsix` to build `portscope-dev.vsix`.

Minimum VS Code version: 1.141.2.
