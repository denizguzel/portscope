# PortScope Agent Rules

## Scope rule

- PortScope shows only servers whose process working directory is inside a workspace folder of the current VS Code window. Never add a global port list.

## Code style

- Outside classes, define helpers as `function` declarations, not `const` arrow functions.
- Do not use nested ternaries.
- Keep one responsibility per file under `src/`.

## Validation

- Use Bun only; do not add npm or Yarn lockfiles.
- After code or manifest changes, run:

```bash
bun run format
bun run lint
bun run build
```

## Releases

- To write the changelog or prepare a release, use the `release-changelog` skill in `.agents/skills/`.
- Use Conventional Commits (`feat:`, `fix:`, `chore:`) so the history is readable later.
