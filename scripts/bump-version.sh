#!/usr/bin/env bash
# 同步更新所有版本号出现位置。manifest.json 是唯一事实来源。
# CHANGELOG.md 需要人工撰写条目，脚本不会代写，test.sh 会拦截遗漏。
set -euo pipefail

REPOSITORY_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPOSITORY_ROOT" || exit 1

if [[ $# -ne 1 ]]; then
  printf 'Usage: bash scripts/bump-version.sh <new-version>\n' >&2
  printf 'Example: bash scripts/bump-version.sh 0.0.7\n' >&2
  exit 1
fi

new_version="$1"

if [[ ! "$new_version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  printf 'Version must look like 1.2.3, got: %s\n' "$new_version" >&2
  exit 1
fi

if command -v python >/dev/null 2>&1; then
  python_bin='python'
elif command -v python3 >/dev/null 2>&1; then
  python_bin='python3'
else
  printf 'Python is required to rewrite version strings.\n' >&2
  exit 1
fi

"$python_bin" - "$new_version" <<'PYEOF'
import pathlib
import re
import sys

new = sys.argv[1]

manifest_path = pathlib.Path('manifest.json')
manifest_text = manifest_path.read_text(encoding='utf-8')
match = re.search(r'"version"\s*:\s*"([^"]+)"', manifest_text)
if not match:
    sys.exit('manifest.json has no readable version field')

old = match.group(1)
if old == new:
    print(f'Version is already {new}, nothing to rewrite.')
    sys.exit(0)

# tests/core.test.js 用正则断言版本徽标，点号在源文件里是转义过的。
old_re = old.replace('.', r'\.')
new_re = new.replace('.', r'\.')

replacements = [
    ('manifest.json', f'"version": "{old}"', f'"version": "{new}"'),
    ('popup/popup.html', f'>v{old}<', f'>v{new}<'),
    ('tests/core.test.js',
     f"assert.equal(manifest.version, '{old}')",
     f"assert.equal(manifest.version, '{new}')"),
    ('tests/core.test.js', f'>v{old_re}<', f'>v{new_re}<'),
    ('README.md', f'当前版本：`v{old}`', f'当前版本：`v{new}`'),
    ('README.md', f'PicSift-v{old}.zip', f'PicSift-v{new}.zip'),
    ('README.md', f'版本显示为 `{old}`', f'版本显示为 `{new}`'),
    ('CLAUDE.md', f'当前版本 `v{old}`', f'当前版本 `v{new}`'),
]

missing = []
for path, needle, _ in replacements:
    if needle not in pathlib.Path(path).read_text(encoding='utf-8'):
        missing.append(f'{path}: {needle}')

if missing:
    print('Aborted, these anchors were not found (update the script or the files):')
    for item in missing:
        print(f'  {item}')
    sys.exit(1)

for path, needle, value in replacements:
    target = pathlib.Path(path)
    text = target.read_text(encoding='utf-8')
    count = text.count(needle)
    target.write_text(text.replace(needle, value), encoding='utf-8')
    print(f'  {path}: {count}x  {needle}  ->  {value}')

print(f'\nRewrote {old} -> {new}.')
PYEOF

printf '\n下一步：\n'
printf '  1. 在 CHANGELOG.md 顶部添加 "## v%s (YYYY-MM-DD)" 条目并写明变更。\n' "$new_version"
printf '  2. 运行 bash test.sh 确认全部检查通过。\n'
printf '  3. 按 CLAUDE.md 的发布章节打包并创建 GitHub Release。\n'
