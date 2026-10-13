# Repository Guidelines

PicSift is a dependency-free Chrome Manifest V3 extension. There is no build step and no package installation.

**The full contributor and architecture guide lives in [CLAUDE.md](CLAUDE.md)** — read it before changing code. It documents the message protocol between the three execution contexts, the cross-file invariants (adding a site touches three places, the version string is asserted by tests, the aspect-ratio thresholds are duplicated), and the `node:vm` sandbox constraints that forbid converting the sources to ESM or IIFE.

## Quick reference

```bash
bash test.sh          # required files, manifest, version consistency, syntax, unit tests
```

Run it from the repository root; on Windows use Git Bash. See [TESTING.md](TESTING.md) for individual commands and the manual regression matrix.

- **Layout**: `manifest.json` (permissions, hosts, entry points), `popup/` (workbench UI), `content/content.js` (page scanning, URL normalization), `background/background.js` (service worker, downloads), `icons/`.
- **Style**: two-space indent, semicolons, single-quoted strings, `const`/`let`, `camelCase` identifiers, kebab-case CSS classes. Keep the existing Chinese UI copy and comments.
- **Security**: keep `host_permissions` narrow, accept HTTP(S) media URLs only, sanitize download filenames, build DOM with `textContent` rather than `innerHTML`, and return `true` from async message listeners that respond later.
- **Commits**: Conventional Commit prefixes with Chinese subjects, e.g. `fix: 拒绝非 HTTP(S) 媒体地址`. Update [CHANGELOG.md](CHANGELOG.md) and `manifest.json` only as part of a release.
