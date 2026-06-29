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

function readJsonFailure(result) {
  assert.notStrictEqual(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

function tempRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-onboard-test-'));
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'target-fixture' }, null, 2) + '\n');
  return dir;
}

function cliTargetConfigForTest(dir) {
  const result = run(['target-config', '--template'], { cwd: dir });
  return readJsonOutput(result).target_config;
}

{
  const result = run(['status']);
  const output = readJsonOutput(result);
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.version, '0.0.5');
  assert.strictEqual(output.release_line, 'public_boundary_guard_enforcement_seed');
}

{
  const result = run(['target-config', '--validate-template']);
  const output = readJsonOutput(result);
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.validated, true);
  assert.deepStrictEqual(output.errors, []);
}

{
  const result = run(['target-config', '--template'], { cwd: tempRepo() });
  const output = readJsonOutput(result);
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.target_config.project.name, 'target-fixture');
  assert.ok(output.target_config.surfaces.include.includes('AGENTS.md'));
}

{
  const dir = tempRepo();
  const result = run(['agents', '--preview'], { cwd: dir });
  const output = readJsonOutput(result);
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.mode, 'preview');
  assert.strictEqual(output.writes_performed, false);
  assert.strictEqual(output.canonical_file, 'AGENTS.md');
  assert.ok(output.agents_md.includes('Forbidden by default'));
  assert.ok(output.agents_md.includes('guard --check-boundary'));
  assert.ok(output.agents_md.includes('target-fixture'));
  assert.ok(!fs.existsSync(path.join(dir, 'AGENTS.md')));
}

{
  const dir = tempRepo();
  const result = run(['agents', '--write'], { cwd: dir });
  const output = readJsonOutput(result);
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.writes_performed, true);
  assert.deepStrictEqual(output.conflicts, []);
  const agents = fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8');
  assert.ok(agents.includes('Agent-Onboard target repository rules'));
  assert.ok(agents.includes('target-fixture'));
}

{
  const dir = tempRepo();
  fs.writeFileSync(path.join(dir, 'AGENTS.md'), '# Existing instructions\n');
  const result = run(['agents', '--write'], { cwd: dir });
  const output = readJsonFailure(result);
  assert.strictEqual(output.status, 'error');
  assert.deepStrictEqual(output.conflicts, ['AGENTS.md']);
  assert.strictEqual(fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8'), '# Existing instructions\n');
}

{
  const dir = tempRepo();
  fs.writeFileSync(path.join(dir, 'AGENTS.md'), '# Existing instructions\n');
  const result = run(['agents', '--write', '--force'], { cwd: dir });
  const output = readJsonOutput(result);
  assert.strictEqual(output.status, 'ok');
  assert.deepStrictEqual(output.conflicts, []);
  assert.ok(fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8').includes('Agent-Onboard target repository rules'));
}

{
  const dir = tempRepo();
  const result = run(['init', '--dry-run'], { cwd: dir });
  const output = readJsonOutput(result);
  assert.strictEqual(output.writes_performed, false);
  assert.strictEqual(output.planned_writes.length, 3);
  assert.ok(!fs.existsSync(path.join(dir, 'agent-onboard.target.json')));
  assert.ok(!fs.existsSync(path.join(dir, '.agent-onboard', 'project.json')));
}

{
  const dir = tempRepo();
  const result = run(['init', '--write'], { cwd: dir });
  const output = readJsonOutput(result);
  assert.strictEqual(output.writes_performed, true);
  assert.deepStrictEqual(output.conflicts, []);
  assert.ok(fs.existsSync(path.join(dir, 'agent-onboard.target.json')));
  assert.ok(fs.existsSync(path.join(dir, '.agent-onboard', 'project.json')));
  assert.ok(fs.existsSync(path.join(dir, '.agent-onboard', 'work-items.json')));
  const targetConfig = JSON.parse(fs.readFileSync(path.join(dir, 'agent-onboard.target.json'), 'utf8'));
  assert.strictEqual(targetConfig.project.name, 'target-fixture');
  assert.strictEqual(targetConfig.control.requested_mode, 'target_dry_run');
  assert.strictEqual(targetConfig.control.authority_level, 'L1_read_only_preview');

  const validate = run(['target-config', '--validate'], { cwd: dir });
  const validation = readJsonOutput(validate);
  assert.strictEqual(validation.status, 'ok');
}

{
  const dir = tempRepo();
  fs.writeFileSync(path.join(dir, 'agent-onboard.target.json'), '{"foreign":true}\n');
  const result = run(['init', '--write'], { cwd: dir });
  const output = readJsonFailure(result);
  assert.strictEqual(output.status, 'error');
  assert.deepStrictEqual(output.conflicts, ['agent-onboard.target.json']);
  assert.strictEqual(JSON.parse(fs.readFileSync(path.join(dir, 'agent-onboard.target.json'), 'utf8')).foreign, true);
}

{
  const dir = tempRepo();
  fs.writeFileSync(path.join(dir, 'agent-onboard.target.json'), '{"foreign":true}\n');
  const result = run(['init', '--write', '--force'], { cwd: dir });
  const output = readJsonOutput(result);
  assert.strictEqual(output.writes_performed, true);
  assert.deepStrictEqual(output.conflicts, []);
  const targetConfig = JSON.parse(fs.readFileSync(path.join(dir, 'agent-onboard.target.json'), 'utf8'));
  assert.strictEqual(targetConfig.schema, 'agent-onboard-target-config-001');
}

{
  const result = run(['target', 'bootstrap', '--dry-run'], { cwd: tempRepo() });
  const output = readJsonOutput(result);
  assert.strictEqual(output.writes_performed, false);
  assert.strictEqual(output.planned_writes.length, 1);
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
  const result = run(['guard', '--plan']);
  const output = readJsonOutput(result);
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.admitted_command, 'agent-onboard guard --check-boundary');
  assert.strictEqual(output.writes_files, false);
}

{
  const dir = tempRepo();
  const init = run(['init', '--write'], { cwd: dir });
  readJsonOutput(init);
  const result = run(['guard', '--check-boundary'], { cwd: dir });
  const output = readJsonOutput(result);
  assert.strictEqual(output.status, 'pass');
  assert.strictEqual(output.reads_target_config, true);
  assert.strictEqual(output.blocked_violation_count, 0);
  assert.strictEqual(output.writes_files, false);
  assert.strictEqual(output.git_mutation, false);
}

{
  const dir = tempRepo();
  const result = run(['guard', '--check-boundary'], { cwd: dir });
  const output = readJsonFailure(result);
  assert.strictEqual(result.status, 2);
  assert.strictEqual(output.status, 'blocked');
  assert.strictEqual(output.reason, 'missing agent-onboard.target.json in current target repo root');
  assert.strictEqual(output.writes_files, false);
}

{
  const dir = tempRepo();
  const config = cliTargetConfigForTest(dir);
  config.control.requested_mode = 'target_write';
  config.boundaries.writes_allowed = true;
  fs.writeFileSync(path.join(dir, 'agent-onboard.target.json'), JSON.stringify(config, null, 2) + '\n');
  const result = run(['guard', '--check-boundary'], { cwd: dir });
  const output = readJsonFailure(result);
  assert.strictEqual(result.status, 2);
  assert.strictEqual(output.status, 'blocked');
  assert.ok(output.violations.some((violation) => violation.path === 'control.requested_mode'));
  assert.ok(output.violations.some((violation) => violation.path === 'boundaries.writes_allowed'));
  assert.strictEqual(output.installs_dependencies, false);
  assert.strictEqual(output.runs_managed_project_commands, false);
}

{
  const dir = tempRepo();
  fs.writeFileSync(path.join(dir, 'agent-onboard.target.json'), '{not-json}\n');
  const result = run(['guard', '--check-boundary'], { cwd: dir });
  const output = readJsonFailure(result);
  assert.strictEqual(result.status, 2);
  assert.strictEqual(output.status, 'blocked');
  assert.strictEqual(output.reads_target_config, true);
}

{
  const cli = require('../cli/agent-onboard.js');
  const invalid = cli.targetConfigTemplate();
  delete invalid.boundaries.writes_allowed;
  const errors = cli.validateTargetConfig(invalid);
  assert.ok(errors.some((error) => error.includes('writes_allowed')));
  assert.ok(cli.agentsMdTemplate(tempRepo()).includes('AGENTS.md'));
}

console.log('agent-onboard tests passed');
