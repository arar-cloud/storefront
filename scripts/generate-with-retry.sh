#!/bin/bash

# GraphQL Code Generation with Retry Logic
# Implements exponential backoff for transient failures and sequential locking
# Usage: ./scripts/generate-with-retry.sh

set -e

MAX_RETRIES=3
INITIAL_BACKOFF=2
MAX_BACKOFF=30
LOCK_FILE=".graphql-generation.lock"
LOCK_TIMEOUT=30

# Acquire file-based mutex lock to prevent concurrent schema conflicts
acquire_lock() {
  local lock_start=$(date +%s)
  while [ -f "$LOCK_FILE" ]; do
    local current=$(date +%s)
    local elapsed=$((current - lock_start))
    if [ $elapsed -gt $LOCK_TIMEOUT ]; then
      echo "⚠️  Lock timeout. Removing stale lock file."
      rm -f "$LOCK_FILE"
      break
    fi
    echo "Waiting for GraphQL generation lock to be released (${elapsed}s)..."
    sleep 1
  done
  touch "$LOCK_FILE"
}

# Release file-based mutex lock
release_lock() {
  rm -f "$LOCK_FILE"
}

# Ensure lock is released on exit
trap release_lock EXIT

echo "Starting GraphQL code generation with retry support..."
acquire_lock
echo "Lock acquired. Proceeding with code generation..."

for attempt in $(seq 1 $MAX_RETRIES); do
  if [ $attempt -gt 1 ]; then
    # Calculate backoff with exponential increase, capped at MAX_BACKOFF
    backoff=$((INITIAL_BACKOFF * (2 ** (attempt - 2))))
    if [ $backoff -gt $MAX_BACKOFF ]; then
      backoff=$MAX_BACKOFF
    fi
    echo "Retry attempt $attempt/$MAX_RETRIES: waiting ${backoff}s before retry..."
    sleep $backoff
  fi

  echo "[Attempt $attempt/$MAX_RETRIES] Running: pnpm run generate:all"
  if pnpm run generate:all; then
    echo "✓ GraphQL code generation succeeded on attempt $attempt"
    release_lock
    exit 0
  fi

  if [ $attempt -lt $MAX_RETRIES ]; then
    echo "✗ Generation failed on attempt $attempt, will retry..."
  fi
done

echo "✗ GraphQL code generation failed after $MAX_RETRIES attempts"
release_lock
exit 1
