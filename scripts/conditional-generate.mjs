#!/usr/bin/env node
import { createHash } from 'crypto';
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const HASH_FILE = '.graphql-hashes.json';
const GRAPHQL_DIRS = ['src/graphql', 'src/checkout/graphql'];

function getFileHashes() {
  const hashes = {};
  GRAPHQL_DIRS.forEach(dir => {
    if (existsSync(dir)) {
      readdirSync(dir, { recursive: true })
        .filter(f => f.endsWith('.graphql'))
        .forEach(file => {
          const path = join(dir, file);
          const content = readFileSync(path, 'utf8');
          hashes[path] = createHash('sha256').update(content).digest('hex');
        });
    }
  });
  return hashes;
}

function hasSchemaChanged() {
  const currentHashes = getFileHashes();
  const storedHashes = existsSync(HASH_FILE)
    ? JSON.parse(readFileSync(HASH_FILE, 'utf8'))
    : {};

  const changed = Object.keys(currentHashes).some(
    key => storedHashes[key] !== currentHashes[key]
  ) || Object.keys(storedHashes).some(key => !currentHashes[key]);

  if (changed) {
    writeFileSync(HASH_FILE, JSON.stringify(currentHashes, null, 2));
  }
  return changed;
}

if (hasSchemaChanged()) {
  console.log('[GraphQL] Schema changed, regenerating types...');
  execSync('pnpm run generate:all', { stdio: 'inherit' });
} else {
  console.log('[GraphQL] Schema unchanged, skipping generation');
}
