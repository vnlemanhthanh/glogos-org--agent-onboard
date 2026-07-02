'use strict';

const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const CLI = path.join(ROOT, 'cli', 'agent-onboard.js');
const PACKAGE_JSON = require(path.join(ROOT, 'package.json'));
const EXPECTED_PACK_FILES = Array.from(new Set(PACKAGE_JSON.files.concat(['package.json']))).sort();
const MAX_OUTPUT_BYTES = 20 * 1024 * 1024;
const DEFAULT_CONCURRENCY = 8;
const DEFAULT_FULL_SOURCE_TEST_SHARDS = DEFAULT_CONCURRENCY * 4;
const FULL_SOURCE_TEST = path.join(ROOT, 'test', 'agent-onboard.test.js');
const APPEND_SMOKE_WORK_ITEM_ID = ['P8', 'S8', 'M8', 'W8'].join('');

function nodeTask(name, args, validate) {
  return {
    name,
    command: process.execPath,
    args,
    validate
  };
}

function cliTask(name, args, validate) {
  return nodeTask(name, [CLI, ...args], validate);
}

function npmTask(name, args, validate) {
  if (process.platform === 'win32') {
    return {
      name,
      command: 'cmd.exe',
      args: ['/d', '/s', '/c', ['npm', ...args].join(' ')],
      validate
    };
  }
  return {
    name,
    command: 'npm',
    args,
    validate
  };
}

function parseJson(stdout, taskName) {
  try {
    return JSON.parse(stdout);
  } catch (error) {
    throw new Error(`${taskName} did not print valid JSON: ${error.message}`);
  }
}

function expectStatusOk(stdout, taskName) {
  const output = parseJson(stdout, taskName);
  if (output.status !== 'ok') {
    throw new Error(`${taskName} returned status ${JSON.stringify(output.status)}`);
  }
}

function expectPackFiles(stdout, taskName) {
  const output = parseJson(stdout, taskName);
  if (!Array.isArray(output) || output.length !== 1 || !Array.isArray(output[0].files)) {
    throw new Error(`${taskName} returned an unexpected npm pack shape`);
  }
  const actual = output[0].files.map((file) => file.path).sort();
  if (JSON.stringify(actual) !== JSON.stringify(EXPECTED_PACK_FILES)) {
    throw new Error(`${taskName} packed ${actual.join(', ')} instead of ${EXPECTED_PACK_FILES.join(', ')}`);
  }
}

function commandForDisplay(task) {
  return [path.basename(task.command), ...task.args].join(' ');
}

function trimOutput(output) {
  if (!output) return '';
  const trimmed = output.trim();
  if (trimmed.length <= 2000) return trimmed;
  return `${trimmed.slice(0, 2000)}\n... output truncated ...`;
}

function runTask(task) {
  const startedAt = Date.now();
  return new Promise((resolve) => {
    const child = spawn(task.command, task.args, {
      cwd: ROOT,
      windowsHide: true
    });
    let stdout = '';
    let stderr = '';
    let outputTooLarge = false;

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
      if (stdout.length + stderr.length > MAX_OUTPUT_BYTES) {
        outputTooLarge = true;
        child.kill();
      }
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
      if (stdout.length + stderr.length > MAX_OUTPUT_BYTES) {
        outputTooLarge = true;
        child.kill();
      }
    });
    child.on('error', (error) => {
      resolve({
        task,
        ok: false,
        durationMs: Date.now() - startedAt,
        error: error.message,
        stdout,
        stderr
      });
    });
    child.on('close', (status, signal) => {
      const durationMs = Date.now() - startedAt;
      if (outputTooLarge) {
        resolve({ task, ok: false, durationMs, error: 'output exceeded runner buffer limit', stdout, stderr });
        return;
      }
      if (status !== 0) {
        resolve({
          task,
          ok: false,
          durationMs,
          error: signal ? `terminated by ${signal}` : `exited with ${status}`,
          stdout,
          stderr
        });
        return;
      }
      try {
        if (task.validate) task.validate(stdout, task.name);
        resolve({ task, ok: true, durationMs, stdout, stderr });
      } catch (error) {
        resolve({ task, ok: false, durationMs, error: error.message, stdout, stderr });
      }
    });
  });
}

async function runPool(tasks, concurrency) {
  const pending = tasks.slice();
  const results = [];
  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, async () => {
    while (pending.length > 0) {
      const task = pending.shift();
      const result = await runTask(task);
      results.push(result);
      const seconds = (result.durationMs / 1000).toFixed(1);
      const marker = result.ok ? 'pass' : 'fail';
      process.stdout.write(`[${marker}] ${task.name} (${seconds}s)\n`);
    }
  });
  await Promise.all(workers);
  return results;
}

function syntaxTasks() {
  return [
    nodeTask('syntax: cli/agent-onboard.js', ['-c', CLI]),
    nodeTask('syntax: command-router', ['-c', path.join(ROOT, 'cli', 'agent_onboard', 'command-router.js')]),
    nodeTask('syntax: compatibility-command-port adapter', ['-c', path.join(ROOT, 'cli', 'agent_onboard', 'adapters', 'compatibility-command-port.js')]),
    nodeTask('syntax: compatibility-command-port port', ['-c', path.join(ROOT, 'cli', 'agent_onboard', 'ports', 'compatibility-command-port.js')]),
    nodeTask('syntax: core command adapter', ['-c', path.join(ROOT, 'cli', 'agent_onboard', 'adapters', 'commands', 'core.js')]),
    nodeTask('syntax: release package command adapter', ['-c', path.join(ROOT, 'cli', 'agent_onboard', 'adapters', 'commands', 'release-package.js')]),
    nodeTask('syntax: architecture command adapter', ['-c', path.join(ROOT, 'cli', 'agent_onboard', 'adapters', 'commands', 'architecture.js')]),
    nodeTask('syntax: authority command adapter', ['-c', path.join(ROOT, 'cli', 'agent_onboard', 'adapters', 'commands', 'authority.js')]),
    nodeTask('syntax: target command adapter', ['-c', path.join(ROOT, 'cli', 'agent_onboard', 'adapters', 'commands', 'target.js')]),
    nodeTask('syntax: work-items command adapter', ['-c', path.join(ROOT, 'cli', 'agent_onboard', 'adapters', 'commands', 'work-items.js')]),
    nodeTask('syntax: runtime service partitions', ['-c', path.join(ROOT, 'cli', 'agent_onboard', 'domains', 'service-partitions.js')]),
    nodeTask('syntax: architecture static catalog', ['-c', path.join(ROOT, 'cli', 'agent_onboard', 'domains', 'architecture', 'static-catalog.js')]),
    nodeTask('syntax: target static catalog', ['-c', path.join(ROOT, 'cli', 'agent_onboard', 'domains', 'target', 'static-catalog.js')]),
    nodeTask('syntax: target runtime service', ['-c', path.join(ROOT, 'cli', 'agent_onboard', 'domains', 'target', 'services', 'target-service.js')]),
    nodeTask('syntax: target runtime utilities', ['-c', path.join(ROOT, 'cli', 'agent_onboard', 'domains', 'target', 'services', 'target-runtime-utilities.js')]),
    nodeTask('syntax: work-items runtime domain index', ['-c', path.join(ROOT, 'cli', 'agent_onboard', 'domains', 'work-items', 'index.js')]),
    nodeTask('syntax: work-items runtime service', ['-c', path.join(ROOT, 'cli', 'agent_onboard', 'domains', 'work-items', 'services', 'work-items-service.js')]),
    nodeTask('syntax: public artifact boundary check', ['-c', path.join(ROOT, 'scripts', 'check-public-artifact-boundary.js')]),
    nodeTask('syntax: full source test', ['-c', FULL_SOURCE_TEST]),
    nodeTask('syntax: parallel runner', ['-c', __filename])
  ];
}

function quickTasks() {
  return [
    ...syntaxTasks(),
    cliTask('status', ['status'], expectStatusOk),
    cliTask('architecture thin entrypoint cutover check', ['architecture', '--thin-entrypoint-cutover-check'], expectStatusOk),
    cliTask('architecture router adapter delegation check', ['architecture', '--router-adapter-delegation-check'], expectStatusOk),
    cliTask('architecture check', ['architecture', '--check'], expectStatusOk),
    cliTask('release surface check', ['release', '--surface-check'], expectStatusOk),
    cliTask('release version sprawl check', ['release', '--version-sprawl-check'], expectStatusOk),
    cliTask('release architecture parity smoke', ['release', '--architecture-parity-smoke'], expectStatusOk),
    cliTask('release check', ['release', '--check'], expectStatusOk),
    cliTask('work-items schema through runtime service', ['work-items', '--schema'], expectStatusOk),
    cliTask('work-items template through runtime service', ['work-items', '--template'], expectStatusOk),
    cliTask('work-items validate-template through runtime service', ['work-items', '--validate-template'], expectStatusOk),
    cliTask('work-items list through runtime service', ['work-items', '--list', '.agent-onboard/work-items.json'], expectStatusOk),
    cliTask('work-items validate', ['work-items', '--validate', '.agent-onboard/work-items.json'], expectStatusOk),
    cliTask('work-items init dry-run through runtime service', ['work-items', '--init', '--dry-run', '--force'], expectStatusOk),
    cliTask('work-items append dry-run through runtime service', ['work-items', '--append', '--dry-run', '--id', APPEND_SMOKE_WORK_ITEM_ID, '--title', 'Runtime append dry-run smoke'], expectStatusOk),
    nodeTask('public artifact boundary check', [path.join(ROOT, 'scripts', 'check-public-artifact-boundary.js')], expectStatusOk),
    npmTask('npm pack dry run', ['pack', '--dry-run', '--json'], expectPackFiles)
  ];
}

function fullTasks(shards) {
  return Array.from({ length: shards }, (_, index) => (
    nodeTask(`full source test shard ${index}/${shards}`, [FULL_SOURCE_TEST, `--shard=${index}/${shards}`])
  ));
}

function testConcurrency() {
  return Number.parseInt(process.env.AGENT_ONBOARD_TEST_CONCURRENCY || '', 10) || DEFAULT_CONCURRENCY;
}

async function runQuick() {
  const startedAt = Date.now();
  const concurrency = testConcurrency();
  const tasks = quickTasks();
  process.stdout.write(`agent-onboard quick test suite: ${tasks.length} checks, concurrency ${Math.min(concurrency, tasks.length)}\n`);
  const results = await runPool(tasks, concurrency);
  const failed = results.filter((result) => !result.ok);
  if (failed.length > 0) {
    for (const result of failed) {
      process.stderr.write(`\n[fail] ${result.task.name}\n`);
      process.stderr.write(`command: ${commandForDisplay(result.task)}\n`);
      process.stderr.write(`error: ${result.error}\n`);
      const stdout = trimOutput(result.stdout);
      const stderr = trimOutput(result.stderr);
      if (stdout) process.stderr.write(`stdout:\n${stdout}\n`);
      if (stderr) process.stderr.write(`stderr:\n${stderr}\n`);
    }
    process.exitCode = 1;
    return;
  }
  const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  process.stdout.write(`agent-onboard quick test suite passed in ${seconds}s\n`);
}

async function runSuite(label, tasks, concurrency) {
  const startedAt = Date.now();
  process.stdout.write(`agent-onboard ${label} test suite: ${tasks.length} checks, concurrency ${Math.min(concurrency, tasks.length)}\n`);
  const results = await runPool(tasks, concurrency);
  const failed = results.filter((result) => !result.ok);
  if (failed.length > 0) {
    for (const result of failed) {
      process.stderr.write(`\n[fail] ${result.task.name}\n`);
      process.stderr.write(`command: ${commandForDisplay(result.task)}\n`);
      process.stderr.write(`error: ${result.error}\n`);
      const stdout = trimOutput(result.stdout);
      const stderr = trimOutput(result.stderr);
      if (stdout) process.stderr.write(`stdout:\n${stdout}\n`);
      if (stderr) process.stderr.write(`stderr:\n${stderr}\n`);
    }
    process.exitCode = 1;
    return false;
  }
  const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  process.stdout.write(`agent-onboard ${label} test suite passed in ${seconds}s\n`);
  return true;
}

async function runFull() {
  const concurrency = testConcurrency();
  const shardCount = Number.parseInt(process.env.AGENT_ONBOARD_FULL_TEST_SHARDS || '', 10) || DEFAULT_FULL_SOURCE_TEST_SHARDS;
  const tasks = fullTasks(Math.max(1, shardCount));
  await runSuite('full', tasks, concurrency);
}

async function main() {
  const suite = process.argv[2] || 'quick';
  if (suite === 'quick') {
    await runQuick();
    return;
  }
  if (suite === 'full') {
    await runFull();
    return;
  }
  if (suite === 'all') {
    await runQuick();
    if (process.exitCode) return;
    await runFull();
    return;
  }
  process.stderr.write('usage: node test/run-tests.js [quick|full|all]\n');
  process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
