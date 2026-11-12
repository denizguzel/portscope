---
name: vscode-screenshots
description: Take real, crisp screenshots of a VS Code extension for the README and Marketplace page. Runs VS Code in the browser on this machine with the built extension and a demo workspace, then captures it with the browse tools. Use when the user asks for screenshots, a README image, or says the Marketplace page needs pictures.
---

# VS Code extension screenshots

Real UI only: never draw a mock-up. The screenshots come from VS Code running the packaged extension, so they show what users get.

## Ground rules

- Use only the demo workspace `acme-shop` that `setup.sh` creates. Never open or show the user's own projects, paths or names.
- Work in the session scratchpad directory, not in the repo. Only the final PNGs go to `docs/images/` of the repo.
- Do not commit unless the user asks. Images reach the Marketplace page only after they are pushed and a new version is published (README images resolve from GitHub).
- `docs/**` must stay in `.vscodeignore` so the pictures do not ship in the package.

## Steps

1. **Build the package:** `bun run package:vsix` (gives an absolute path to the `.vsix`).
2. **Start VS Code in the browser** (work dir in the scratchpad):
   ```bash
   .agents/skills/vscode-screenshots/scripts/setup.sh <work-dir> <abs/path/to/ext.vsix> [-- workspace-settings.json]
   ```
   It prints `READY http://127.0.0.1:8765/?folder=...`. The first run downloads about 270 MB of the VS Code web server (matching the commit of `~/.vscode-server`) into `~/.cache/vscode-web/`; later runs reuse it. The optional JSON is merged into the demo workspace settings (dark theme, no welcome page and no chat panel are already set).
3. **Fake dev servers** (PortScope only): `scripts/servers.sh <work-dir> healthy|mixed|none`. Switch sets any time; it stops the previous set.
4. **Open it with the browse tools.** Load them first with ToolSearch (`select:mcp__browse__session_new,mcp__browse__execute,mcp__browse__session_reset`). Ask the user to keep Chrome's debugging bar open: dismissing it disconnects browse.
   ```
   session_new  id: "shots"  allowedOrigins: ["http://127.0.0.1:8765"]
   ```
   Then in `execute`:
   ```js
   await page.setViewportSize({ width: 1280, height: 800 });
   await page.goto(URL, { waitUntil: 'commit' });
   await new Promise(r => setTimeout(r, 15000));          // extensions need time to start
   await page.locator('.statusbar').getByText('Restricted Mode').first().click();
   await ref(<Trust button ref from snapshot()>).click(); // trust the demo workspace, or extensions stay off
   const cdp = await context.newCDPSession(page);          // 2x pixel density for sharp images
   await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 2, mobile: false });
   ```
   Use `snapshot()` to find refs. Check the status bar text to confirm the extension is active.
5. **Capture each scene** with `page.screenshot({ path: files.path('name.png'), clip: {...} })`. Coordinates are CSS pixels of the 1280x800 viewport; the file is 2x. Then `Read` the PNG to check it, and `cp` it from `/tmp/opencode-browser-files-*/` (the path the result prints) to `docs/images/`.
6. **Clean up always:** `scripts/stop.sh <work-dir>` and `session_reset`. Confirm the ports are closed with `ss -ltn`.
7. **Wire the README:** `<p align="center"><img src="docs/images/x.png" alt="..." width="..."></p>`, widths about 360-640. Add a CHANGELOG note only if the user-visible docs changed meaningfully.

## Pitfalls we hit

- The remote server in `~/.vscode-server/bin/*/bin/code-server` has no web UI (404 on `/`). That is why `setup.sh` fetches `server-linux-x64-web`.
- Pass `.vsix` paths as absolute paths; a relative one is resolved against `C:\Program Files...` and fails.
- Never use `pkill -f <pattern>`: the pattern matches the shell that runs it and kills it. The scripts track PIDs instead.
- Theme: set it in the workspace settings (`workbench.colorTheme`). Emulating `prefers-color-scheme` does not change it.
- Do not use `locator.screenshot()` under the 2x emulation; it returns the wrong region. Use `page.screenshot({ clip })`.
- Hover: move the mouse away first, then `.hover()` the status bar item, wait about 3 s. Hover width varies; crop with margin (about 420-540 CSS px wide) and check the right edge for cut text.
- Quick pick icons cannot take theme colors. Use emoji or text for colored markers.
- Opening the theme picker via the command palette lands on "Marketplace Themes" and floods the console with 403s. Avoid it.
- A click outside a modal editor (for example Settings) closes it. Press Tab after typing in the search box to dismiss the suggestion list.
- The viewport can come out smaller than asked when Chrome has a zoom level for the origin; trust the 2x full screenshot size (2560x1600).

## Scenes for this repository (PortScope)

| File                | How                                                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `hover.png`         | `servers.sh healthy`; hover `:3100 · :5173`; clip about `{x:0,y:500,width:420,height:300}`                                            |
| `health-states.png` | `servers.sh mixed` (red 500, yellow silent, green); wait 9 s; hover `3 servers`; clip about `{x:90,y:376,width:540,height:424}`       |
| `picker.png`        | `mixed`; click the status bar item; clip about `{x:56,y:0,width:790,height:232}`                                                      |
| `settings.png`      | F1 → "Open Settings (UI)", type `@ext:scriptdock.portscope-dev`, press Tab; clip the modal about `{x:120,y:76,width:1040,height:650}` |

Existing images show the target look. Re-take all four when the hover, picker or settings change.
