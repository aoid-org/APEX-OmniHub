#!/bin/sh

# APEX Resilience Pre-Commit Verification
# This hook performs quick verification checks before allowing a commit

echo "🔍 APEX Resilience: Verifying changes..."

# Get modified files
MODIFIED_FILES=$(git diff --cached --name-only | tr '\n' ' ')

if [ -z "$MODIFIED_FILES" ]; then
  echo "✅ No files to verify"
  exit 0
fi

echo "📝 Modified files: $MODIFIED_FILES"

# Check for critical files
CRITICAL_FILES=$(git diff --cached --name-only | grep -E '(\/auth\/|\/security\/|\/payment\/|\.env|config\/production)' || true)

if [ -n "$CRITICAL_FILES" ]; then
  echo "⚠️  Critical files modified:"
  echo "$CRITICAL_FILES" | sed 's/^/  - /'
  echo "⚠️  Ensure human review before merging"
fi

# Run quick TypeScript check (if TypeScript files were modified)
TS_FILES=$(git diff --cached --name-only | grep -E '\.tsx?$' || true)

if [ -n "$TS_FILES" ]; then
  echo "🔍 Running TypeScript check..."
  npm run typecheck || {
    echo "❌ TypeScript check failed"
    exit 1
  }
fi

echo "✅ Pre-commit verification passed"
exit 0
