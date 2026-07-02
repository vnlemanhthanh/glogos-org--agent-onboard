#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const PACKAGE_JSON_PATH = path.join(ROOT, 'package.json');
const PACKAGE_JSON = require(PACKAGE_JSON_PATH);
const EXPECTED_PACK_FILES = Array.from(new Set(PACKAGE_JSON.files.concat(['package.json']))).sort();
const TEXT_EXTENSIONS = new Set(['', '.cjs', '.js', '.json', '.md', '.mjs', '.txt', '.yaml', '.yml']);
const MACHINE_IDENTIFIER_TOKEN = ['machine', 'identifier'].join('_');
const FORBIDDEN_PATTERNS = [
  {
    id: 'private_work_item_identifier',
    regex: /\bP\d+S\d+M\d+W\d+\b/g,
    reason: 'research work-item identifiers are source context, not public package API'
  },
  {
    id: ['machine', 'identifier', 'field'].join('_'),
    regex: new RegExp(`\\b${MACHINE_IDENTIFIER_TOKEN}\\b`, 'g'),
    reason: `${MACHINE_IDENTIFIER_TOKEN} is provenance metadata, not public package API`
  }
];

function runNpmPackDryRun() {
  if (process.platform === 'win32') {
    return spawnSync('cmd.exe', ['/d', '/s', '/c', 'npm pack --dry-run --json'], {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 60000,
      maxBuffer: 50 * 1024 * 1024
    });
  }
  return spawnSync('npm', ['pack', '--dry-run', '--json'], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 60000,
    maxBuffer: 50 * 1024 * 1024
  });
}

function parsePackFiles(stdout) {
  const parsed = JSON.parse(stdout);
  if (!Array.isArray(parsed) || parsed.length !== 1 || !Array.isArray(parsed[0].files)) {
    throw new Error('npm pack --dry-run returned an unexpected JSON shape');
  }
  return parsed[0].files.map((file) => file.path).sort();
}

function detectForbidden(text, filePath) {
  const hits = [];
  for (const pattern of FORBIDDEN_PATTERNS) {
    let match;
    pattern.regex.lastIndex = 0;
    while ((match = pattern.regex.exec(text)) !== null) {
      hits.push({
        file: filePath,
        pattern_id: pattern.id,
        match: match[0],
        index: match.index,
        reason: pattern.reason
      });
      if (match[0] === '') pattern.regex.lastIndex += 1;
    }
  }
  return hits;
}

function scanPackedSourceFiles(packFiles) {
  const violations = [];
  for (const rel of packFiles) {
    const ext = path.extname(rel).toLowerCase();
    if (!TEXT_EXTENSIONS.has(ext)) continue;
    const absolute = path.join(ROOT, rel);
    if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) continue;
    violations.push(...detectForbidden(fs.readFileSync(absolute, 'utf8'), rel));
  }
  return violations;
}

function main() {
  const failures = [];
  if (PACKAGE_JSON.private === true) {
    failures.push({
      check: 'package_visibility',
      expected: 'package.json#private is absent or false',
      actual: true
    });
  }

  const pack = runNpmPackDryRun();
  if (pack.status !== 0) {
    failures.push({
      check: 'npm_pack_dry_run',
      expected: 'exit 0',
      actual: { status: pack.status, stderr: pack.stderr, stdout: pack.stdout }
    });
  }

  let actualPackFiles = [];
  if (pack.status === 0) {
    try {
      actualPackFiles = parsePackFiles(pack.stdout);
      if (JSON.stringify(actualPackFiles) !== JSON.stringify(EXPECTED_PACK_FILES)) {
        failures.push({
          check: 'package_file_allowlist',
          expected: EXPECTED_PACK_FILES,
          actual: actualPackFiles
        });
      }
    } catch (error) {
      failures.push({
        check: 'npm_pack_json',
        expected: 'parseable npm pack JSON with one package entry',
        actual: error.message
      });
    }
  }

  const binTargets = Object.values(PACKAGE_JSON.bin || {});
  const missingBinTargets = binTargets.filter((target) => !actualPackFiles.includes(target));
  if (missingBinTargets.length > 0) {
    failures.push({
      check: 'bin_targets_packaged',
      expected: binTargets,
      actual: { missing: missingBinTargets, packed: actualPackFiles }
    });
  }

  const forbiddenHits = scanPackedSourceFiles(actualPackFiles);
  if (forbiddenHits.length > 0) {
    failures.push({
      check: 'packed_artifact_identifier_boundary',
      expected: 'zero forbidden identifier hits in packed text files',
      actual: forbiddenHits
    });
  }

  const payload = {
    schema: 'agent-onboard-public-artifact-boundary-check-result-001',
    status: failures.length === 0 ? 'ok' : 'fail',
    package_name: PACKAGE_JSON.name,
    version: PACKAGE_JSON.version,
    expected_pack_files: EXPECTED_PACK_FILES,
    actual_pack_files: actualPackFiles,
    forbidden_patterns: FORBIDDEN_PATTERNS.map((pattern) => pattern.id),
    failures
  };

  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  if (failures.length > 0) process.exitCode = 1;
}

main();
