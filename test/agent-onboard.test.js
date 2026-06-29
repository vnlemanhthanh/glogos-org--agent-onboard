'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const CLI = path.join(ROOT, 'cli', 'agent-onboard.js');

function run(args, opts = {}) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd: opts.cwd || ROOT,
    encoding: 'utf8'
  });
}

function readJsonOutput(result) {
  assert.strictEqual(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

function tempRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-onboard-test-'));
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'target-fixture' }, null, 2) + '\n');
  return dir;
}

{
  const result = run(['target-config', '--validate-template']);
  const output = readJsonOutput(result);
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.validated, true);
  assert.deepStrictEqual(output.errors, []);
}

{
  const result = run(['target', 'bootstrap', '--dry-run'], { cwd: tempRepo() });
  const output = readJsonOutput(result);
  assert.strictEqual(output.writes_performed, false);
}

{
  const dir = tempRepo();
  const result = run(['target', 'bootstrap', '--write'], { cwd: dir });
  const output = readJsonOutput(result);
  assert.strictEqual(output.writes_performed, true);
  const targetConfig = JSON.parse(fs.readFileSync(path.join(dir, 'agent-onboard.target.json'), 'utf8'));
  assert.strictEqual(targetConfig.project.name, 'target-fixture');
  assert.strictEqual(targetConfig.control.requested_mode, 'target_dry_run');
  assert.strictEqual(targetConfig.control.authority_level, 'L1_read_only_preview');
}

{
  const dir = tempRepo();
  const result = run(['target-instance', 'takeover', '--write'], { cwd: dir });
  const output = readJsonOutput(result);
  assert.strictEqual(output.writes_performed, true);
  assert.ok(fs.existsSync(path.join(dir, '.agent-onboard', 'project.json')));
  assert.ok(fs.existsSync(path.join(dir, '.agent-onboard', 'work-items.json')));
}

{
  const cli = require('../cli/agent-onboard.js');
  const invalid = cli.targetConfigTemplate();
  delete invalid.boundaries.writes_allowed;
  const errors = cli.validateTargetConfig(invalid);
  assert.ok(errors.some((error) => error.includes('writes_allowed')));
}

console.log('agent-onboard tests passed');
