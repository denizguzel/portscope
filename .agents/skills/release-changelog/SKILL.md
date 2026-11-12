---
name: release-changelog
description: Write the PortScope changelog entry and prepare a release (version bump, Marketplace checks). Use when the user asks for release notes, a changelog update, a version bump or "prepare a release".
---

# Release and changelog

`CHANGELOG.md` follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). The Marketplace shows it as the Changelog tab, so users read it. Write for users of the extension, not for developers.

## 1. Collect what changed

```bash
git describe --tags --abbrev=0        # last release tag; if none, use the root commit
git log <tag>..HEAD --oneline
git diff <tag>..HEAD --stat
git diff <tag>..HEAD -- package.json  # new, changed or removed settings and commands
```

Read the diff of `src/` for anything the log does not explain. Commit messages are not reliable here: some are only `master: ...`.

## 2. Write the entries under `## [Unreleased]`

Groups, in this order, only when they have entries: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`.

- One line per user-visible change. Say what the user sees or can do now, not how it was built.
- Name settings and commands exactly as in `package.json` (`portScope.healthPath`, **Show Dev Server Terminal**).
- Cross-check `package.json`: every new or removed setting or command must appear. A changed default goes under `Changed` with the old value.
- Leave out refactors, tests, formatting, dependency bumps and build changes, unless they change behaviour.
- Do not paste commit messages and do not edit past releases.

## 3. Release

When the user says "release çıkalım", "cut a release" or similar, that is the order to run every step below without asking. Ask only when a step is blocked (see the end of this section).

1. **Commit pending work first.** Run `git status`. Split uncommitted changes into logical Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`), staging files by name. Never one big commit, never `git add -A` blindly. Unstage anything that should not ship.
2. **Pick the version** (SemVer, `0.x`): breaking change or new feature → minor, only fixes → patch. Say why in one line.
3. **Changelog:** write the entries (step 2 above), rename `[Unreleased]` to `[X.Y.Z] - YYYY-MM-DD`, add a fresh empty `[Unreleased]` above it, and update the compare links at the bottom (`https://github.com/denizguzel/portscope/compare/vA...vB`; for the first tag use `releases/tag/vX.Y.Z`).
4. **Version and docs:** set `version` in `package.json`. If settings or commands changed, update the tables in `README.md`.
5. **Verify:** `bun run package:check`, then `bunx vsce ls` and confirm `CHANGELOG.md`, `LICENSE`, `README.md` and the icon are in the package. Stop on any failure.
6. **Release commit and tag:** commit `chore(release): vX.Y.Z`, then tag `vX.Y.Z`.
7. **Push:** `git push origin master vX.Y.Z`.
8. **GitHub Release:** `gh release create vX.Y.Z --title vX.Y.Z --notes <the changelog section of this version>` (if `gh` is missing, say so and continue).
9. **Marketplace:** `bunx vsce publish` (it reuses the `package:check` build; do not bump the version again). Afterwards report the Marketplace URL: `https://marketplace.visualstudio.com/items?itemName=<publisher>.<name>`.

Blocked steps: if `vsce` is not logged in for the publisher (no `VSCE_PAT`, `bunx vsce ls-publishers` is empty) or a push is rejected, finish steps 1-6, then tell the user exactly what is missing. Do not guess credentials.

Report at the end: the version, the commits made, the tag, and which of push, GitHub Release and Marketplace happened.

## Marketplace checklist

README has the current behaviour and settings table, `package.json` has `keywords`, `repository`, `bugs`, `homepage`, `icon` and `license`, and the README screenshot matches the current hover.
