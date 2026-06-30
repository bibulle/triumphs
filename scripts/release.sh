#!/usr/bin/env bash
set -euo pipefail

level="${1:-patch}"

if [[ "$level" != "patch" && "$level" != "minor" && "$level" != "major" ]]; then
  echo "Usage: $0 [patch|minor|major]" >&2
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "Error: working tree is not clean. Commit or stash changes first." >&2
  exit 1
fi

npm version "$level" --workspaces --include-workspace-root --no-git-tag-version

version=$(node -p "require('./package.json').version")

git add package.json frontend/package.json backend/package.json package-lock.json
git commit -m "chore: release v${version}"
git tag -a "v${version}" -m "Release v${version}"

echo "Released v${version} — commit and tag created."
echo "Run 'git push --follow-tags' to publish."
