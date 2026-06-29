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
  assert.notStrictEqual(result.status, 0, result.stderr || result.stdout || (result.error && result.error.message));
  return JSON.parse(result.stdout);
}

function runNpmPackDryRun() {
  // Avoid child_process shell=true for Node 24 DEP0190, while still handling
  // Windows npm.cmd correctly by invoking cmd.exe explicitly.
  if (process.platform === 'win32') {
    return spawnSync('cmd.exe', ['/d', '/s', '/c', 'npm pack --dry-run --json'], {
      cwd: ROOT,
      encoding: 'utf8'
    });
  }
  return spawnSync('npm', ['pack', '--dry-run', '--json'], {
    cwd: ROOT,
    encoding: 'utf8'
  });
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
  assert.strictEqual(output.version, '0.0.14');
  assert.strictEqual(output.release_line, 'public_source_participation_lifecycle_gate');
}

{
  const result = run(['target-config', '--validate-template']);
  const output = readJsonOutput(result);
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.validated, true);
  assert.deepStrictEqual(output.errors, []);
}

{
  const result = run(['work-items', '--schema']);
  const output = readJsonOutput(result);
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.work_items_schema.$id, 'agent-onboard-target-work-items-001');
}

{
  const result = run(['work-items', '--template']);
  const output = readJsonOutput(result);
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.canonical_file, '.agent-onboard/work-items.json');
  assert.strictEqual(output.work_items.vocabulary.program.prefix, 'P');
  assert.deepStrictEqual(output.work_items.programs, []);
  assert.deepStrictEqual(output.work_items.stages, []);
  assert.deepStrictEqual(output.work_items.milestones, []);
  assert.deepStrictEqual(output.work_items.work_items, []);
}

{
  const result = run(['work-items', '--validate-template']);
  const output = readJsonOutput(result);
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.validated, true);
  assert.deepStrictEqual(output.errors, []);
}


{
  const dir = tempRepo();
  const result = run(['work-items', '--init', '--dry-run'], { cwd: dir });
  const output = readJsonOutput(result);
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.mode, 'dry-run');
  assert.strictEqual(output.writes_performed, false);
  assert.strictEqual(output.canonical_file, '.agent-onboard/work-items.json');
  assert.strictEqual(output.planned_writes.length, 1);
  assert.strictEqual(output.planned_writes[0].path, '.agent-onboard/work-items.json');
  assert.strictEqual(output.validated_template, true);
  assert.strictEqual(output.counts.work_items, 0);
  assert.ok(!fs.existsSync(path.join(dir, '.agent-onboard', 'work-items.json')));
}

{
  const dir = tempRepo();
  const result = run(['work-items', '--init', '--write'], { cwd: dir });
  const output = readJsonOutput(result);
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.mode, 'write');
  assert.strictEqual(output.writes_performed, true);
  assert.deepStrictEqual(output.conflicts, []);
  const file = path.join(dir, '.agent-onboard', 'work-items.json');
  assert.ok(fs.existsSync(file));
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.strictEqual(value.schema, 'agent-onboard-target-work-items-001');
  assert.strictEqual(value.package_name, 'agent-onboard');
  assert.deepStrictEqual(value.work_items, []);
  const validate = run(['work-items', '--validate'], { cwd: dir });
  const validation = readJsonOutput(validate);
  assert.strictEqual(validation.status, 'ok');
}

{
  const dir = tempRepo();
  fs.mkdirSync(path.join(dir, '.agent-onboard'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.agent-onboard', 'work-items.json'), '{"foreign":true}\n');
  const result = run(['work-items', '--init', '--write'], { cwd: dir });
  const output = readJsonFailure(result);
  assert.strictEqual(output.status, 'error');
  assert.strictEqual(output.writes_performed, false);
  assert.deepStrictEqual(output.conflicts, ['.agent-onboard/work-items.json']);
  assert.strictEqual(JSON.parse(fs.readFileSync(path.join(dir, '.agent-onboard', 'work-items.json'), 'utf8')).foreign, true);
}

{
  const dir = tempRepo();
  fs.mkdirSync(path.join(dir, '.agent-onboard'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.agent-onboard', 'work-items.json'), '{"foreign":true}\n');
  const result = run(['work-items', '--init', '--write', '--force'], { cwd: dir });
  const output = readJsonOutput(result);
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.writes_performed, true);
  assert.deepStrictEqual(output.conflicts, []);
  const value = JSON.parse(fs.readFileSync(path.join(dir, '.agent-onboard', 'work-items.json'), 'utf8'));
  assert.strictEqual(value.schema, 'agent-onboard-target-work-items-001');
}

{
  const dir = tempRepo();
  readJsonOutput(run(['work-items', '--init', '--write'], { cwd: dir }));
  const id = ['P', 1, 'S', 1, 'M', 1, 'W', 1].join('');
  const result = run([
    'work-items', '--append', '--dry-run',
    '--id', id,
    '--title', 'Public append dry-run seed',
    '--program-title', 'Public program seed',
    '--stage-title', 'Public stage seed',
    '--milestone-title', 'Public milestone seed'
  ], { cwd: dir });
  const output = readJsonOutput(result);
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.mode, 'dry-run');
  assert.strictEqual(output.writes_performed, false);
  assert.strictEqual(output.counts_before.work_items, 0);
  assert.strictEqual(output.counts_after.programs, 1);
  assert.strictEqual(output.counts_after.stages, 1);
  assert.strictEqual(output.counts_after.milestones, 1);
  assert.strictEqual(output.counts_after.work_items, 1);
  assert.strictEqual(output.added.work_items[0].id, id);
  assert.strictEqual(output.proposed_ledger.work_items[0].title, 'Public append dry-run seed');
  const persisted = JSON.parse(fs.readFileSync(path.join(dir, '.agent-onboard', 'work-items.json'), 'utf8'));
  assert.strictEqual(persisted.work_items.length, 0);
}

{
  const dir = tempRepo();
  readJsonOutput(run(['work-items', '--init', '--write'], { cwd: dir }));
  const id = ['P', 1, 'S', 1, 'M', 1, 'W', 1].join('');
  const first = run(['work-items', '--append', '--dry-run', '--id', id, '--title', 'First'], { cwd: dir });
  const proposal = readJsonOutput(first).proposed_ledger;
  fs.writeFileSync(path.join(dir, '.agent-onboard', 'work-items.json'), JSON.stringify(proposal, null, 2) + '\n');
  const second = run(['work-items', '--append', '--dry-run', '--id', id, '--title', 'Duplicate'], { cwd: dir });
  const output = readJsonFailure(second);
  assert.strictEqual(output.status, 'error');
  assert.strictEqual(output.writes_performed, false);
  assert.ok(output.reason.includes('duplicate'));
}

{
  const dir = tempRepo();
  const id = ['P', 1, 'S', 1, 'M', 1, 'W', 1].join('');
  const result = run(['work-items', '--append', '--dry-run', '--id', id, '--title', 'Missing ledger'], { cwd: dir });
  const output = readJsonFailure(result);
  assert.strictEqual(output.status, 'error');
  assert.strictEqual(output.writes_performed, false);
  assert.ok(output.reason.includes('missing'));
}

{
  const dir = tempRepo();
  readJsonOutput(run(['work-items', '--init', '--write'], { cwd: dir }));
  const id = ['P', 1, 'S', 1, 'M', 1, 'W', 1].join('');
  const result = run([
    'work-items', '--append', '--write',
    '--id', id,
    '--title', 'Public append write seed',
    '--program-title', 'Public program write seed',
    '--stage-title', 'Public stage write seed',
    '--milestone-title', 'Public milestone write seed'
  ], { cwd: dir });
  const output = readJsonOutput(result);
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.mode, 'write');
  assert.strictEqual(output.writes_performed, true);
  assert.strictEqual(output.boundary.modifies_work_items_file, true);
  assert.strictEqual(output.boundary.modifies_only_canonical_work_items_file, true);
  assert.strictEqual(output.counts_before.work_items, 0);
  assert.strictEqual(output.counts_after.work_items, 1);
  assert.strictEqual(output.added.work_items[0].id, id);
  const persisted = JSON.parse(fs.readFileSync(path.join(dir, '.agent-onboard', 'work-items.json'), 'utf8'));
  assert.strictEqual(persisted.programs[0].title, 'Public program write seed');
  assert.strictEqual(persisted.stages[0].title, 'Public stage write seed');
  assert.strictEqual(persisted.milestones[0].title, 'Public milestone write seed');
  assert.strictEqual(persisted.work_items[0].title, 'Public append write seed');
  const validate = readJsonOutput(run(['work-items', '--validate'], { cwd: dir }));
  assert.strictEqual(validate.status, 'ok');
  assert.strictEqual(validate.counts.work_items, 1);
}

{
  const dir = tempRepo();
  readJsonOutput(run(['work-items', '--init', '--write'], { cwd: dir }));
  const id = ['P', 1, 'S', 1, 'M', 1, 'W', 1].join('');
  readJsonOutput(run(['work-items', '--append', '--write', '--id', id, '--title', 'First'], { cwd: dir }));
  const duplicate = run(['work-items', '--append', '--write', '--id', id, '--title', 'Duplicate'], { cwd: dir });
  const output = readJsonFailure(duplicate);
  assert.strictEqual(output.status, 'error');
  assert.strictEqual(output.writes_performed, false);
  assert.ok(output.reason.includes('duplicate'));
  const persisted = JSON.parse(fs.readFileSync(path.join(dir, '.agent-onboard', 'work-items.json'), 'utf8'));
  assert.strictEqual(persisted.work_items.length, 1);
  assert.strictEqual(persisted.work_items[0].title, 'First');
}

{
  const dir = tempRepo();
  readJsonOutput(run(['work-items', '--init', '--write'], { cwd: dir }));
  const id = ['P', 1, 'S', 1, 'M', 1, 'W', 1].join('');
  readJsonOutput(run(['work-items', '--append', '--write', '--id', id, '--title', 'Claim seed'], { cwd: dir }));
  const result = run([
    'work-items', '--claim', '--dry-run',
    '--id', id,
    '--actor', 'public-actor',
    '--claimed-at', '2026-01-01T00:00:00.000Z',
    '--note', 'dry-run only'
  ], { cwd: dir });
  const output = readJsonOutput(result);
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.mode, 'dry-run');
  assert.strictEqual(output.writes_performed, false);
  assert.strictEqual(output.boundary.modifies_work_items_file, false);
  assert.strictEqual(output.claimed.work_item_id, id);
  assert.strictEqual(output.claimed.actor, 'public-actor');
  assert.ok(Array.isArray(output.next_steps));
  assert.ok(output.next_steps.some((step) => step.startsWith('handoff:')));
  assert.strictEqual(output.proposed_ledger.work_items[0].status, 'claimed');
  assert.strictEqual(output.proposed_ledger.work_items[0].claim.actor, 'public-actor');
  const persisted = JSON.parse(fs.readFileSync(path.join(dir, '.agent-onboard', 'work-items.json'), 'utf8'));
  assert.strictEqual(persisted.work_items[0].status, 'open');
  assert.ok(!Object.prototype.hasOwnProperty.call(persisted.work_items[0], 'claim'));
}

{
  const dir = tempRepo();
  readJsonOutput(run(['work-items', '--init', '--write'], { cwd: dir }));
  const id = ['P', 1, 'S', 1, 'M', 1, 'W', 1].join('');
  readJsonOutput(run(['work-items', '--append', '--write', '--id', id, '--title', 'Claim seed'], { cwd: dir }));
  const first = readJsonOutput(run(['work-items', '--claim', '--dry-run', '--id', id, '--actor', 'public-actor'], { cwd: dir }));
  fs.writeFileSync(path.join(dir, '.agent-onboard', 'work-items.json'), JSON.stringify(first.proposed_ledger, null, 2) + '\n');
  const second = run(['work-items', '--claim', '--dry-run', '--id', id, '--actor', 'other-actor'], { cwd: dir });
  const output = readJsonFailure(second);
  assert.strictEqual(output.status, 'error');
  assert.strictEqual(output.writes_performed, false);
  assert.ok(output.reason.includes('already claimed'));
}

{
  const dir = tempRepo();
  readJsonOutput(run(['work-items', '--init', '--write'], { cwd: dir }));
  const id = ['P', 1, 'S', 1, 'M', 1, 'W', 1].join('');
  const result = run(['work-items', '--claim', '--dry-run', '--id', id, '--actor', 'public-actor'], { cwd: dir });
  const output = readJsonFailure(result);
  assert.strictEqual(output.status, 'error');
  assert.strictEqual(output.writes_performed, false);
  assert.ok(output.reason.includes('existing'));
}

{
  const dir = tempRepo();
  readJsonOutput(run(['work-items', '--init', '--write'], { cwd: dir }));
  const id = ['P', 1, 'S', 1, 'M', 1, 'W', 1].join('');
  const result = run(['work-items', '--append', '--dry-run', '--write', '--id', id, '--title', 'Invalid mode'], { cwd: dir });
  const output = readJsonFailure(result);
  assert.strictEqual(output.status, 'error');
  assert.ok(output.message.includes('only one'));
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
  const workItems = JSON.parse(fs.readFileSync(path.join(dir, '.agent-onboard', 'work-items.json'), 'utf8'));
  assert.strictEqual(workItems.schema, 'agent-onboard-target-work-items-001');
  assert.strictEqual(workItems.vocabulary.work_item.prefix, 'W');
  assert.deepStrictEqual(workItems.programs, []);
  assert.deepStrictEqual(workItems.stages, []);
  assert.deepStrictEqual(workItems.milestones, []);
  assert.deepStrictEqual(workItems.work_items, []);
  const targetConfig = JSON.parse(fs.readFileSync(path.join(dir, 'agent-onboard.target.json'), 'utf8'));
  assert.strictEqual(targetConfig.project.name, 'target-fixture');
  assert.strictEqual(targetConfig.control.requested_mode, 'target_dry_run');
  assert.strictEqual(targetConfig.control.authority_level, 'L1_read_only_preview');

  const validate = run(['target-config', '--validate'], { cwd: dir });
  const validation = readJsonOutput(validate);
  assert.strictEqual(validation.status, 'ok');

  const validateWorkItems = run(['work-items', '--validate'], { cwd: dir });
  const workItemsValidation = readJsonOutput(validateWorkItems);
  assert.strictEqual(workItemsValidation.status, 'ok');
  assert.strictEqual(workItemsValidation.counts.work_items, 0);

  const listWorkItems = run(['work-items', '--list'], { cwd: dir });
  const workItemsList = readJsonOutput(listWorkItems);
  assert.strictEqual(workItemsList.status, 'ok');
  assert.strictEqual(workItemsList.counts.programs, 0);
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
  const dir = tempRepo();
  const missing = run(['work-items', '--list'], { cwd: dir });
  const output = readJsonFailure(missing);
  assert.strictEqual(output.status, 'error');
  assert.strictEqual(output.writes_performed, false);
}

{
  const dir = tempRepo();
  const ledger = require('../cli/agent-onboard.js').workItemsTemplate();
  const validProgramId = ['P', 1].join('');
  const validStageId = [validProgramId, 'S', 1].join('');
  const validMilestoneId = [validStageId, 'M', 1].join('');
  const validWorkItemId = [validMilestoneId, 'W', 1].join('');
  ledger.programs.push({ id: validProgramId, title: 'Program seed', status: 'open' });
  ledger.stages.push({ id: validStageId, program_id: validProgramId, title: 'Stage seed', status: 'open' });
  ledger.milestones.push({ id: validMilestoneId, stage_id: validStageId, title: 'Milestone seed', status: 'open' });
  ledger.work_items.push({ id: validWorkItemId, milestone_id: validMilestoneId, title: 'Work item seed', status: 'open' });
  fs.mkdirSync(path.join(dir, '.agent-onboard'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.agent-onboard', 'work-items.json'), JSON.stringify(ledger, null, 2) + '\n');
  const result = run(['work-items', '--list'], { cwd: dir });
  const output = readJsonOutput(result);
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.counts.work_items, 1);
}

{
  const dir = tempRepo();
  const ledger = require('../cli/agent-onboard.js').workItemsTemplate();
  ledger.work_items.push({ id: ['not', 'valid'].join('-'), milestone_id: ['also', 'bad'].join('-'), title: 'Invalid', status: 'open' });
  fs.mkdirSync(path.join(dir, '.agent-onboard'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.agent-onboard', 'work-items.json'), JSON.stringify(ledger, null, 2) + '\n');
  const result = run(['work-items', '--validate'], { cwd: dir });
  const output = readJsonFailure(result);
  assert.strictEqual(output.status, 'error');
  assert.ok(output.errors.some((error) => error.includes('expected pattern')));
}


{
  const dir = tempRepo();
  readJsonOutput(run(['work-items', '--init', '--write'], { cwd: dir }));
  const id = ['P', 1, 'S', 1, 'M', 1, 'W', 2].join('');
  readJsonOutput(run(['work-items', '--append', '--write', '--id', id, '--title', 'Claim write target'], { cwd: dir }));
  const result = run(['work-items', '--claim', '--write', '--id', id, '--actor', 'test-agent', '--claimed-at', '2026-06-30T00:00:00.000Z'], { cwd: dir });
  const output = readJsonOutput(result);
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.mode, 'write');
  assert.strictEqual(output.writes_performed, true);
  assert.strictEqual(output.boundary.modifies_work_items_file, true);
  assert.ok(output.next_steps.some((step) => step.startsWith('validate:')));
  const persisted = JSON.parse(fs.readFileSync(path.join(dir, '.agent-onboard', 'work-items.json'), 'utf8'));
  assert.strictEqual(persisted.work_items[0].status, 'claimed');
  assert.strictEqual(persisted.work_items[0].claim.actor, 'test-agent');
}

{
  const rootLedger = JSON.parse(fs.readFileSync(path.join(ROOT, '.agent-onboard', 'work-items.json'), 'utf8'));
  const errors = require('../cli/agent-onboard.js').validateWorkItems(rootLedger);
  assert.deepStrictEqual(errors, []);
  assert.strictEqual(rootLedger.work_items.length, 2);
  assert.strictEqual(rootLedger.programs[0].id, ['P', 1].join(''));
  assert.strictEqual(rootLedger.stages[0].id, ['P', 1, 'S', 1].join(''));
  assert.strictEqual(rootLedger.milestones[0].id, ['P', 1, 'S', 1, 'M', 1].join(''));
  assert.strictEqual(rootLedger.work_items[0].id, ['P', 1, 'S', 1, 'M', 1, 'W', 1].join(''));
  assert.strictEqual(rootLedger.work_items[0].status, 'closed');
  assert.strictEqual(rootLedger.work_items[1].id, ['P', 1, 'S', 1, 'M', 1, 'W', 2].join(''));
  assert.strictEqual(rootLedger.work_items[1].status, 'open');
  assert.ok(fs.existsSync(path.join(ROOT, 'AGENTS.md')));
  assert.ok(fs.existsSync(path.join(ROOT, 'agent-onboard.target.json')));
  assert.ok(fs.existsSync(path.join(ROOT, '.agent-onboard', 'project.json')));
}

{
  const gitignore = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
  assert.ok(!/^\.agent-onboard\/\s*$/m.test(gitignore));
  assert.ok(/^!\.agent-onboard\/project\.json\s*$/m.test(gitignore));
  assert.ok(/^!\.agent-onboard\/work-items\.json\s*$/m.test(gitignore));
}

{
  const pack = runNpmPackDryRun();
  assert.strictEqual(pack.status, 0, pack.stderr || pack.stdout || (pack.error && pack.error.message));
  const parsed = JSON.parse(pack.stdout);
  assert.strictEqual(parsed.length, 1);
  const files = parsed[0].files.map((item) => item.path).sort();
  assert.deepStrictEqual(files, ['LICENSE', 'README.md', 'cli/agent-onboard.js', 'package.json']);
  const forbiddenConcreteWorkItem = new RegExp('P\\d+S\\d+M\\d+W\\d+');
  for (const rel of files) {
    const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    assert.strictEqual(forbiddenConcreteWorkItem.test(text), false, `${rel} contains concrete work-item id`);
  }
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
  const generatedAgents = cli.agentsMdTemplate(tempRepo());
  assert.ok(generatedAgents.includes('AGENTS.md'));
  assert.ok(generatedAgents.includes('Follow the public participation lifecycle'));
  assert.ok(cli.participationLifecycleNextSteps().some((step) => step.startsWith('discover:')));
}


{
  const forbiddenKey = ['machine', 'identifier'].join('_');
  const forbiddenWorkItemPattern = new RegExp('P\\d+S\\d+M\\d+W\\d+');
  const ignoredDirs = new Set(['node_modules', '.git']);
  const textExtensions = new Set(['', '.js', '.json', '.md', '.txt']);

  function walk(dir) {
    const entries = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ignoredDirs.has(entry.name)) continue;
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) entries.push(...walk(abs));
      else entries.push(abs);
    }
    return entries;
  }

  const violations = [];
  for (const abs of walk(ROOT)) {
    const rel = path.relative(ROOT, abs).split(path.sep).join('/');
    const ext = path.extname(rel);
    if (!textExtensions.has(ext) && rel !== 'LICENSE') continue;
    const text = fs.readFileSync(abs, 'utf8');
    if (text.includes(forbiddenKey)) violations.push(`${rel}: reserved implementation key token`);
    const match = forbiddenWorkItemPattern.exec(text);
    if (match && rel !== '.agent-onboard/work-items.json') {
      violations.push(`${rel}: reserved concrete work-item token ${match[0]}`);
    }
  }
  assert.deepStrictEqual(violations, []);
}


{
  const rx = (parts, flags = 'i') => new RegExp(parts.join(''), flags);
  const forbiddenNarrativePatterns = [
    rx(['pri', 'vate\\s*\\/\\s*pub', 'lic\\s+sp', 'lit']),
    rx(['int', 'ernal\\s+li', 'ne']),
    rx(['rese', 'arch\\s+li', 'ne']),
    rx(['str', 'ipp?ed']),
    rx(['sani', 'ti[sz]ed']),
    rx(['\\b', 'le', 'ak(?:age|ed|s|ing)?\\b'])
  ];
  const scannedFiles = ['README.md', 'package.json', 'cli/agent-onboard.js'];
  const violations = [];
  for (const rel of scannedFiles) {
    const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    for (let index = 0; index < forbiddenNarrativePatterns.length; index += 1) {
      const match = forbiddenNarrativePatterns[index].exec(text);
      if (match) violations.push(`${rel}: narrative-rule-${index + 1}: ${match[0]}`);
    }
  }
  assert.deepStrictEqual(violations, []);
}


{
  const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  assert.ok(readme.includes('work-items --claim --write --id <public-work-item-id> --actor <actor>'));
  assert.ok(!readme.includes('This release does not add claim write'));
  assert.ok(readme.includes('`0.0.11` adds public `work-items --claim --dry-run`'));
  assert.ok(readme.includes('`0.0.13` adds source self-dogfood and agent participation support'));
  assert.ok(readme.includes('`0.0.14` adds the public source participation lifecycle gate'));
  assert.ok(readme.includes('The claim response also returns `next_steps`'));
}

console.log('agent-onboard tests passed');
