#!/bin/bash
# Install devsolo git hooks

set -e

HOOKS_DIR="$(dirname "$0")"
GIT_HOOKS_DIR=".git/hooks"

# Check if we're in a git repository
if [ ! -d ".git" ]; then
  echo "❌ Not in a git repository root"
  exit 1
fi

echo "Installing devsolo git hooks..."

# Install pre-commit hook
if [ -f "$HOOKS_DIR/pre-commit" ]; then
  cp "$HOOKS_DIR/pre-commit" "$GIT_HOOKS_DIR/pre-commit"
  chmod +x "$GIT_HOOKS_DIR/pre-commit"
  echo "✅ Installed pre-commit hook"
fi

# Install pre-push hook
if [ -f "$HOOKS_DIR/pre-push" ]; then
  cp "$HOOKS_DIR/pre-push" "$GIT_HOOKS_DIR/pre-push"
  chmod +x "$GIT_HOOKS_DIR/pre-push"
  echo "✅ Installed pre-push hook"
fi

# Install commit-msg hook
if [ -f "$HOOKS_DIR/commit-msg" ]; then
  cp "$HOOKS_DIR/commit-msg" "$GIT_HOOKS_DIR/commit-msg"
  chmod +x "$GIT_HOOKS_DIR/commit-msg"
  echo "✅ Installed commit-msg hook"
fi

echo ""
echo "🎉 devsolo git hooks installed successfully!"
echo ""
echo "The following hooks are now active:"
echo "  • pre-commit: Prevents commits to protected branches"
echo "  • pre-push:   Validates workflow state before pushing"
echo "  • commit-msg: Enforces conventional commit messages"
echo ""
echo "To uninstall, simply remove the hooks from $GIT_HOOKS_DIR"