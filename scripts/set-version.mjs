#!/usr/bin/env node
// Updates the version number from one place: package.json, tauri.conf.json and
// Cargo.toml.
// Usage: node scripts/set-version.mjs 1.0.2
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const version = process.argv[2]?.trim()

if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error(`Invalid version: "${version ?? ''}". Expected format: 1.0.2`)
  process.exit(1)
}

function patch(relPath, transform) {
  const file = resolve(root, relPath)
  const before = readFileSync(file, 'utf8')
  const after = transform(before)
  if (before === after) {
    console.log(`  = ${relPath} (unchanged)`)
    return
  }
  writeFileSync(file, after)
  console.log(`  ✓ ${relPath}`)
}

console.log(`Setting version to ${version}:`)

patch('package.json', (s) => s.replace(/("version"\s*:\s*)"[^"]*"/, `$1"${version}"`))
patch('src-tauri/tauri.conf.json', (s) => s.replace(/("version"\s*:\s*)"[^"]*"/, `$1"${version}"`))
// In Cargo.toml, change only the first version field in the [package] section.
patch('src-tauri/Cargo.toml', (s) => s.replace(/^version\s*=\s*".*"$/m, `version = "${version}"`))

console.log(`Done. To tag it: git tag v${version}`)
