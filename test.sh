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
  'CLAUDE.md'
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

# manifest.json 的 version 是唯一事实来源，其余位置必须与之一致。
# 漏改任何一处都会让 node --test 或 Chrome 加载出现版本不符，这里提前拦截。
printf '\nVersion consistency\n'
manifest_version="$(sed -n 's/^[[:space:]]*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' manifest.json | head -1)"

check_version() {
  local file="$1"
  local expected="$2"
  local label="$3"

  if [[ ! -f "$file" ]]; then
    fail "$label ($file is missing)"
  elif grep -qF -- "$expected" "$file"; then
    pass "$label"
  else
    fail "$label should contain: $expected"
  fi
}

if [[ -z "$manifest_version" ]]; then
  fail 'manifest.json has no readable version field'
else
  pass "manifest.json version is $manifest_version"
  check_version 'popup/popup.html' ">v${manifest_version}<" 'popup/popup.html version badge'
  check_version 'tests/core.test.js' "assert.equal(manifest.version, '${manifest_version}')" 'tests/core.test.js version assertion'
  check_version 'README.md' "当前版本：\`v${manifest_version}\`" 'README.md version line'
  check_version 'CLAUDE.md' "当前版本 \`v${manifest_version}\`" 'CLAUDE.md version line'
  check_version 'CHANGELOG.md' "## v${manifest_version} (" 'CHANGELOG.md release entry'
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
