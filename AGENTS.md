# Repository Guidelines

## Project Structure & Module Organization

PicSift is a dependency-free Chrome Manifest V3 extension. `manifest.json` declares permissions, supported hosts, and entry points. `popup/` contains the HTML, CSS, and interaction logic for the extension UI; `content/content.js` scans product pages and normalizes media URLs; `background/background.js` is the service worker responsible for downloads and filenames. Static icon assets and their helper generators live in `icons/`. Contributor and release documentation is kept in root-level Markdown files, especially `TESTING.md`, `CHANGELOG.md`, and `RELEASE.md`.

The primary flow is popup → content script for extraction, then popup → background worker for downloads. Keep message action names and response shapes synchronized across those modules.

## Build, Test, and Development Commands

There is no compilation or package installation step. Run checks from the repository root:

```bash
node --check content/content.js
node --check popup/popup.js
node --check background/background.js
node --test tests/*.test.js
python -m json.tool manifest.json
bash test.sh
```

These commands validate syntax, helpers, and the manifest. `test.sh` also checks required files; run it in Git Bash. To develop, open `chrome://extensions/`, enable Developer mode, choose **Load unpacked**, and select this repository. Reload the extension after every source or manifest change.

## Coding Style & Naming Conventions

Use two-space indentation, semicolons, single-quoted JavaScript strings, and `const`/`let`. Prefer small `async` functions and explicit error handling around Chrome APIs. Use `camelCase` for JavaScript variables and functions, `UPPER_SNAKE_CASE` only for true constants, and kebab-case for CSS classes. Preserve the existing Chinese UI copy and comments unless a change intentionally updates localization. Manifest V3 forbids inline scripts and `eval()`.

## Testing Guidelines

Node's built-in test runner covers core URL, filter, and filename helpers; no coverage threshold is configured. Follow `TESTING.md` for manual regression coverage. Test extraction, filters, selection, and downloads on affected supported sites; inspect the popup, page, and service-worker consoles for errors. Verify empty results, invalid URLs, and large batches when changing extraction or download logic.

## Commit & Pull Request Guidelines

Recent history uses Conventional Commit prefixes such as `fix:` and `chore:`. Write focused subjects like `fix: reject non-http media URLs`. Pull requests should explain user-visible behavior, list affected sites and permissions, link related issues, and record manual checks. Include screenshots for popup UI changes. Update `CHANGELOG.md` and `manifest.json` only when the change is part of a release.

## Security & Configuration Tips

Keep `host_permissions` narrowly scoped. Accept only HTTP(S) media URLs, sanitize generated filenames, and prefer DOM creation plus `textContent` over interpolated `innerHTML`. Asynchronous message listeners must return `true` when responding later.
