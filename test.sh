#!/usr/bin/env bash
set -u

REPOSITORY_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPOSITORY_ROOT" || exit 1

failures=0

pass() {
  printf '  PASS  %s\n' "$1"
}

fail() {
  printf '  FAIL  %s\n' "$1"
  failures=$((failures + 1))
}

printf 'PicSift repository checks\n\n'

required_files=(
  'manifest.json'
  'popup/popup.html'
  'popup/popup.css'
  'popup/popup.js'
  'content/content.js'
  'background/background.js'
  'icons/icon16.png'
  'icons/icon32.png'
  'icons/icon48.png'
  'icons/icon128.png'
  'AGENTS.md'
)

printf 'Required files\n'
for file in "${required_files[@]}"; do
  if [[ -f "$file" ]]; then
    pass "$file"
  else
    fail "$file is missing"
  fi
done

printf '\nManifest\n'
if command -v python >/dev/null 2>&1; then
  if python -m json.tool manifest.json >/dev/null; then
    pass 'manifest.json is valid JSON'
  else
    fail 'manifest.json is invalid JSON'
  fi
elif command -v python3 >/dev/null 2>&1; then
  if python3 -m json.tool manifest.json >/dev/null; then
    pass 'manifest.json is valid JSON'
  else
    fail 'manifest.json is invalid JSON'
  fi
else
  fail 'Python is required for manifest validation'
fi

printf '\nJavaScript syntax\n'
if command -v node >/dev/null 2>&1; then
  scripts=(
    'content/content.js'
    'popup/popup.js'
    'background/background.js'
  )

  for script in "${scripts[@]}"; do
    if node --check "$script"; then
      pass "$script"
    else
      fail "$script has syntax errors"
    fi
  done

  printf '\nCore tests\n'
  if node --test tests/*.test.js; then
    pass 'Node tests'
  else
    fail 'Node tests'
  fi
else
  fail 'Node.js is required for JavaScript checks'
fi

printf '\n'
if ((failures > 0)); then
  printf 'Checks failed: %d\n' "$failures"
  exit 1
fi

printf 'All checks passed. Continue with the manual scenarios in TESTING.md.\n'
