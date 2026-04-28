import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';

const HASH_FILE = '.graphql-state.json';

function getFileHash(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  return crypto.createHash('sha256').update(content).digest('hex');
}

function getAllGraphQLFiles() {
  return globSync(['src/graphql/**/*.graphql', 'src/checkout/graphql/**/*.graphql']);
}

function getCurrentHashes() {
  const files = getAllGraphQLFiles();
  const hashes = {};
  files.forEach((file) => {
    hashes[file] = getFileHash(file);
  });
  return hashes;
}

function getPreviousHashes() {
  if (!fs.existsSync(HASH_FILE)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(HASH_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function hasGraphQLChanged() {
  const current = getCurrentHashes();
  const previous = getPreviousHashes();
  
  const currentKeys = Object.keys(current);
  const previousKeys = Object.keys(previous);
  
  if (currentKeys.length !== previousKeys.length) {
    return true;
  }
  
  return currentKeys.some(key => current[key] !== previous[key]);
}

function updateHashFile() {
  const hashes = getCurrentHashes();
  fs.writeFileSync(HASH_FILE, JSON.stringify(hashes, null, 2));
}

if (hasGraphQLChanged()) {
  console.log('[graphql-codegen] GraphQL files changed, running generation...');
  updateHashFile();
  process.exit(0);
} else {
  console.log('[graphql-codegen] No GraphQL changes detected, skipping generation.');
  process.exit(1);
}
