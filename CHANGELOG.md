# Changelog

All notable changes to this extension are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.2.1] - 2026-11-12

### Changed

- New extension icon.
- The picker shows the same colored health dots as the hover (the old dots were always grey).

## [0.2.0] - 2026-11-12

### Added

- Red `failing` health state for servers that answer with a 5xx status.
- Settings `healthRecheckSeconds`, `healthPath`, `ignorePorts`, `openPath`, `notifications.ready` and `notifications.stopped`.
- Notifications when a server becomes ready or stops on its own.
- Action and command **Show Dev Server Terminal**. For a server that an extension runs in the background (for example Script Dock), it points to the Output channels.
- Command **Open Settings** and a ⚙ link in the hover.
- Tests, run with `bun test`.

### Changed

- A healthy server is rechecked every 10 s, so a frozen server turns yellow. A silent or failing server is retried on every scan.
- Default scan interval is 2 s (was 3 s).
- Hover: Stop and Force Stop are on their own line, `Force` is now `Force Stop`, and uptime under a minute reads `just started`. With more than three servers the actions show only icons.

## [0.1.0]

### Added

- Status bar item with the dev servers of the current window, a picker, and Open, Copy URL, Stop and Force Stop actions.
- Health dot based on an HTTP `HEAD` request.

[Unreleased]: https://github.com/denizguzel/portscope/compare/v0.2.1...HEAD
[0.2.1]: https://github.com/denizguzel/portscope/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/denizguzel/portscope/releases/tag/v0.2.0
