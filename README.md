# DevPorts

VS Code extension that shows the dev servers of the current window in the status bar and opens them in one click.

## Behavior

- No server: the status bar item is hidden.
- One server: `🚀 :4200`. A click opens `http://localhost:4200`.
- Two servers: `🚀 :4200 · :8080`. Three or more: `🚀 3 servers`. A click opens a picker.
- The picker groups servers by project. Each row shows the framework (Vite, Angular, Next.js, Spring and others) and the uptime, with copy and stop buttons.
- The hover shows each server as `:4200 project · Vite · 12m` with **Open**, **Copy URL** and **Stop** actions.
- Stop sends SIGTERM and asks no confirmation. Commands: `DevPorts: Open Dev Server`, `DevPorts: Copy Dev Server URL`, `DevPorts: Stop Dev Server`.
- Each window shows only servers started from its own workspace folders. There is no global port list.
- In a monorepo, the item shows the sub-folder of the server, for example `demo-app/apps/web`.

## How it works

The extension runs on the workspace side (WSL or Linux). Every few seconds it reads `/proc/net/tcp` and `/proc/net/tcp6` for listening sockets. It maps each socket to a process and keeps the process only if its working directory is inside a workspace folder. VS Code server processes are ignored. Scanning pauses while the window is not focused.

Windows without a Linux workspace side (plain local Windows or macOS) show nothing.

## Settings

| Setting                           | Default | Description                                |
| --------------------------------- | ------- | ------------------------------------------ |
| `devPorts.refreshIntervalSeconds` | `3`     | Scan interval while the window is focused. |

## Development

```bash
bun install
bun run format
bun run lint
bun run build
```

Press `F5` ("Run Extension") to start an Extension Development Host. Run `bun run package:vsix` to build `dev-ports.vsix`.

Minimum VS Code version: 1.141.2.
