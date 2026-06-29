#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const VERSION = require('../package.json').version;

process.stdout.on('error', (error) => {
  if (error && error.code === 'EPIPE') process.exit(0);
  throw error;
});

const TARGET_CONFIG_SCHEMA = {
  schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'agent-onboard-target-config-001',
  type: 'object',
  required: ['schema', 'control', 'project', 'boundaries', 'surfaces'],
  additionalProperties: false,
  properties: {
    schema: { const: 'agent-onboard-target-config-001' },
    control: {
      type: 'object',
      required: ['package_name', 'requested_mode', 'authority_level'],
      additionalProperties: false,
      properties: {
        package_name: { const: 'agent-onboard' },
        requested_mode: { enum: ['target_dry_run', 'target_write'] },
        authority_level: { enum: ['L1_read_only_preview', 'L2_explicit_write'] }
      }
    },
    project: {
      type: 'object',
      required: ['name', 'kind'],
      additionalProperties: false,
      properties: {
        name: { type: 'string', minLength: 1 },
        kind: { type: 'string', minLength: 1 }
      }
    },
    boundaries: {
      type: 'object',
      required: [
        'writes_allowed',
        'managed_project_commands_allowed',
        'create_agent_onboard_runtime_state',
        'install_dependencies',
        'run_build_test_deploy',
        'publish_or_push'
      ],
      additionalProperties: false,
      properties: {
        writes_allowed: { type: 'boolean' },
        managed_project_commands_allowed: { type: 'integer', minimum: 0 },
        create_agent_onboard_runtime_state: { type: 'boolean' },
        install_dependencies: { type: 'boolean' },
        run_build_test_deploy: { type: 'boolean' },
        publish_or_push: { type: 'boolean' }
      }
    },
    surfaces: {
      type: 'object',
      required: ['include', 'exclude'],
      additionalProperties: false,
      properties: {
        include: { type: 'array', items: { type: 'string' } },
        exclude: { type: 'array', items: { type: 'string' } }
      }
    }
  }
};

function agentsMdTemplate(cwd = process.cwd()) {
  const [name, kind] = targetName(cwd);
  return `# AGENTS.md

## Agent-Onboard target repository rules

This is a target repository for agent-assisted work. Agents should treat this file as the first human-readable operating guide and treat \`agent-onboard.target.json\` as the machine-readable boundary declaration when it exists.

Target identity:

- name: \`${name}\`
- kind: \`${kind}\`
- control package: \`agent-onboard\`

## Read order

Before proposing or making changes, read these files when present:

1. \`AGENTS.md\`
2. \`agent-onboard.target.json\`
3. \`.agent-onboard/project.json\`
4. \`.agent-onboard/work-items.json\`

If \`node_modules\` is missing, do not assume the package is installed locally. Prefer \`npx agent-onboard@${VERSION} status\` or the package version requested by the repository owner.

## Default boundary

Forbidden by default unless the repository owner explicitly authorizes the action:

- installing, removing, or upgrading dependencies;
- running builds, tests, deploys, publishes, or pushes;
- modifying source files outside the requested scope;
- overwriting non-identical files;
- creating or mutating runtime state under \`.agent-onboard/\` except through an explicit \`agent-onboard\` command or owner request;
- treating declarative boundary files as proof that enforcement already exists.

## Operating mode

Start in read-only preview mode. Prefer a dry-run plan before writes. Use explicit write commands only when the owner requests them.

When reporting work, distinguish clearly between:

- files inspected;
- files changed;
- checks actually run;
- checks not run;
- known non-pass states.

Do not claim a check passed unless it was actually executed in the current workspace.

## Agent-Onboard commands

Preview target initialization:

\`\`\`sh
npx agent-onboard@${VERSION} init --dry-run
\`\`\`

Preview this file:

\`\`\`sh
npx agent-onboard@${VERSION} agents --preview
\`\`\`

Write this file when explicitly requested:

\`\`\`sh
npx agent-onboard@${VERSION} agents --write
\`\`\`

## Scope note

In the current \`0.0.x\` line, \`agent-onboard\` emits conventions and reference files. It does not sandbox other tools by itself and does not enforce filesystem, network, shell, Git, package-manager, CI, deployment, or publication policy for external tools.
`;
}

function json(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, stableJson(value));
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateJsonSchema(value, schema, pointer = '$') {
  const errors = [];

  if (Object.prototype.hasOwnProperty.call(schema, 'const') && value !== schema.const) {
    errors.push(`${pointer}: expected const ${JSON.stringify(schema.const)}`);
  }

  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${pointer}: expected one of ${schema.enum.map((item) => JSON.stringify(item)).join(', ')}`);
  }

  if (schema.type === 'object') {
    if (!isPlainObject(value)) {
      errors.push(`${pointer}: expected object`);
      return errors;
    }
    const properties = schema.properties || {};
    for (const key of schema.required || []) {
      if (!Object.prototype.hasOwnProperty.call(value, key)) errors.push(`${pointer}.${key}: missing required property`);
    }
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!Object.prototype.hasOwnProperty.call(properties, key)) errors.push(`${pointer}.${key}: additional property not allowed`);
      }
    }
    for (const [key, childSchema] of Object.entries(properties)) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        errors.push(...validateJsonSchema(value[key], childSchema, `${pointer}.${key}`));
      }
    }
  }

  if (schema.type === 'array') {
    if (!Array.isArray(value)) {
      errors.push(`${pointer}: expected array`);
      return errors;
    }
    value.forEach((item, index) => {
      errors.push(...validateJsonSchema(item, schema.items || {}, `${pointer}[${index}]`));
    });
  }

  if (schema.type === 'string') {
    if (typeof value !== 'string') {
      errors.push(`${pointer}: expected string`);
      return errors;
    }
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(`${pointer}: expected minLength ${schema.minLength}`);
    }
  }

  if (schema.type === 'boolean' && typeof value !== 'boolean') {
    errors.push(`${pointer}: expected boolean`);
  }

  if (schema.type === 'integer') {
    if (!Number.isInteger(value)) {
      errors.push(`${pointer}: expected integer`);
      return errors;
    }
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(`${pointer}: expected minimum ${schema.minimum}`);
    }
  }

  return errors;
}

function validateTargetConfig(value) {
  return validateJsonSchema(value, TARGET_CONFIG_SCHEMA);
}

function targetName(cwd) {
  try {
    const pkg = readJson(path.join(cwd, 'package.json'));
    return [pkg.name || path.basename(cwd), 'node'];
  } catch {
    return [path.basename(cwd) || 'target-repo', 'generic'];
  }
}

function targetConfigTemplate(cwd = process.cwd()) {
  const [name, kind] = targetName(cwd);
  return {
    schema: 'agent-onboard-target-config-001',
    control: {
      package_name: 'agent-onboard',
      requested_mode: 'target_dry_run',
      authority_level: 'L1_read_only_preview'
    },
    project: { name, kind },
    boundaries: {
      writes_allowed: false,
      managed_project_commands_allowed: 0,
      create_agent_onboard_runtime_state: false,
      install_dependencies: false,
      run_build_test_deploy: false,
      publish_or_push: false
    },
    surfaces: {
      include: [
        'package.json',
        'agent-onboard.target.json',
        '.agent-onboard/project.json',
        '.agent-onboard/work-items.json',
        'AGENTS.md'
      ],
      exclude: ['node_modules', '.git', 'dist', 'build', '.venv', '.lake']
    }
  };
}

function runtimeProjectTemplate(cwd = process.cwd()) {
  const [name, kind] = targetName(cwd);
  return {
    schema: 'agent-onboard-target-runtime-project-001',
    package_name: 'agent-onboard',
    target: { name, root: '.', kind },
    authority: {
      level: 'L1_read_only_preview',
      writes_require_explicit_write_flag: true
    }
  };
}

function workItemsTemplate() {
  return {
    schema: 'agent-onboard-target-work-items-001',
    package_name: 'agent-onboard',
    work_items: []
  };
}

function initWriteSet(cwd = process.cwd()) {
  return [
    ['agent-onboard.target.json', targetConfigTemplate(cwd)],
    ['.agent-onboard/project.json', runtimeProjectTemplate(cwd)],
    ['.agent-onboard/work-items.json', workItemsTemplate()]
  ];
}

function planWrites(writeSet, options = {}) {
  const force = options.force === true;
  return writeSet.map(([relativePath, value]) => {
    const absolutePath = path.join(process.cwd(), relativePath);
    const desired = stableJson(value);
    const exists = fs.existsSync(absolutePath);
    const current = exists ? fs.readFileSync(absolutePath, 'utf8') : null;
    const identical = exists && current === desired;
    const conflict = exists && !identical && !force;
    let action = 'create';
    if (identical) action = 'keep';
    else if (exists && force) action = 'overwrite';
    else if (conflict) action = 'conflict';
    return {
      path: relativePath,
      exists,
      action,
      safe_to_write: action !== 'conflict',
      value
    };
  });
}

function performPlannedWrites(plannedWrites) {
  for (const item of plannedWrites) {
    if (item.action === 'create' || item.action === 'overwrite') {
      writeJson(path.join(process.cwd(), item.path), item.value);
    }
  }
}

function planTextWrites(writeSet, options = {}) {
  const force = options.force === true;
  return writeSet.map(([relativePath, content]) => {
    const absolutePath = path.join(process.cwd(), relativePath);
    const exists = fs.existsSync(absolutePath);
    const current = exists ? fs.readFileSync(absolutePath, 'utf8') : null;
    const identical = exists && current === content;
    const conflict = exists && !identical && !force;
    let action = 'create';
    if (identical) action = 'keep';
    else if (exists && force) action = 'overwrite';
    else if (conflict) action = 'conflict';
    return {
      path: relativePath,
      exists,
      action,
      safe_to_write: action !== 'conflict',
      content
    };
  });
}

function performPlannedTextWrites(plannedWrites) {
  for (const item of plannedWrites) {
    if (item.action === 'create' || item.action === 'overwrite') {
      fs.mkdirSync(path.dirname(path.join(process.cwd(), item.path)), { recursive: true });
      fs.writeFileSync(path.join(process.cwd(), item.path), item.content);
    }
  }
}

function summarizePlan(plannedWrites) {
  return plannedWrites.map((item) => ({
    path: item.path,
    exists: item.exists,
    action: item.action,
    safe_to_write: item.safe_to_write
  }));
}

function runTargetConfig(args) {
  if (args.includes('--schema')) {
    json({
      schema: 'agent-onboard-target-config-schema-response-001',
      status: 'ok',
      target_config_schema: TARGET_CONFIG_SCHEMA
    });
    return 0;
  }
  if (args.includes('--template')) {
    json({
      schema: 'agent-onboard-target-config-template-response-001',
      status: 'ok',
      canonical_config_file: 'agent-onboard.target.json',
      target_config: targetConfigTemplate()
    });
    return 0;
  }
  if (args.includes('--validate-template')) {
    const errors = validateTargetConfig(targetConfigTemplate());
    const ok = errors.length === 0;
    json({
      schema: 'agent-onboard-target-config-template-validation-001',
      status: ok ? 'ok' : 'error',
      template_source: 'embedded',
      canonical_config_file: 'agent-onboard.target.json',
      validated: true,
      errors
    });
    return ok ? 0 : 1;
  }
  if (args.includes('--validate')) {
    const index = args.indexOf('--validate');
    const file = args[index + 1] && !args[index + 1].startsWith('-') ? args[index + 1] : 'agent-onboard.target.json';
    const errors = validateTargetConfig(readJson(path.resolve(process.cwd(), file)));
    const ok = errors.length === 0;
    json({
      schema: 'agent-onboard-target-config-file-validation-001',
      status: ok ? 'ok' : 'error',
      file,
      validated: true,
      errors
    });
    return ok ? 0 : 1;
  }
  throw new Error('target-config requires --schema, --template, --validate-template, or --validate [file]');
}

function runAgents(args) {
  const preview = args.includes('--preview');
  const write = args.includes('--write');
  const force = args.includes('--force');
  if (!preview && !write) throw new Error('agents requires --preview or --write');
  if (preview && write) throw new Error('agents accepts only one of --preview or --write');

  const content = agentsMdTemplate();
  const plannedWrites = planTextWrites([['AGENTS.md', content]], { force });
  const conflicts = plannedWrites.filter((item) => item.action === 'conflict');
  const ok = conflicts.length === 0;
  if (write && ok) performPlannedTextWrites(plannedWrites);

  json({
    schema: 'agent-onboard-agents-result-001',
    status: ok ? 'ok' : 'error',
    command_family: 'agents',
    canonical_file: 'AGENTS.md',
    mode: write ? 'write' : 'preview',
    force,
    writes_performed: write && ok,
    planned_writes: summarizePlan(plannedWrites),
    conflicts: conflicts.map((item) => item.path),
    agents_md: content,
    boundary: {
      installs_dependencies: false,
      runs_build_test_deploy: false,
      publishes_or_pushes: false,
      modifies_source_files: write,
      modifies_only_canonical_agents_file: write
    }
  });
  return ok ? 0 : 1;
}

function runInit(args) {
  const write = args.includes('--write');
  const dry = args.includes('--dry-run');
  const force = args.includes('--force');
  if (!write && !dry) throw new Error('init requires --dry-run or --write');
  if (write && dry) throw new Error('init accepts only one of --dry-run or --write');

  const plannedWrites = planWrites(initWriteSet(), { force });
  const conflicts = plannedWrites.filter((item) => item.action === 'conflict');
  const ok = conflicts.length === 0;

  if (write && ok) performPlannedWrites(plannedWrites);

  json({
    schema: 'agent-onboard-init-result-001',
    status: ok ? 'ok' : 'error',
    command_family: 'init',
    mode: write ? 'write' : 'dry-run',
    force,
    writes_performed: write && ok,
    planned_writes: summarizePlan(plannedWrites),
    conflicts: conflicts.map((item) => item.path),
    boundary: {
      installs_dependencies: false,
      runs_build_test_deploy: false,
      publishes_or_pushes: false,
      modifies_source_files: false
    }
  });
  return ok ? 0 : 1;
}

function runTargetBootstrap(args) {
  const write = args.includes('--write');
  const dry = args.includes('--dry-run');
  const force = args.includes('--force');
  if (!write && !dry) throw new Error('target bootstrap requires --dry-run or --write');
  if (write && dry) throw new Error('target bootstrap accepts only one of --dry-run or --write');

  const plannedWrites = planWrites([['agent-onboard.target.json', targetConfigTemplate()]], { force });
  const conflicts = plannedWrites.filter((item) => item.action === 'conflict');
  const ok = conflicts.length === 0;
  if (write && ok) performPlannedWrites(plannedWrites);

  json({
    schema: 'agent-onboard-target-bootstrap-result-001',
    status: ok ? 'ok' : 'error',
    command_family: 'target',
    mode: write ? 'write' : 'dry-run',
    force,
    writes_performed: write && ok,
    planned_writes: summarizePlan(plannedWrites),
    conflicts: conflicts.map((item) => item.path),
    skipped_optional_writes: ['package.json']
  });
  return ok ? 0 : 1;
}

function runTargetInstance(args) {
  if (args[0] !== 'takeover') throw new Error('target-instance supports only: takeover');
  const write = args.includes('--write');
  const dry = args.includes('--dry-run');
  const force = args.includes('--force');
  if (!write && !dry) throw new Error('target-instance takeover requires --dry-run or --write');
  if (write && dry) throw new Error('target-instance takeover accepts only one of --dry-run or --write');

  const plannedWrites = planWrites([
    ['.agent-onboard/project.json', runtimeProjectTemplate()],
    ['.agent-onboard/work-items.json', workItemsTemplate()]
  ], { force });
  const conflicts = plannedWrites.filter((item) => item.action === 'conflict');
  const ok = conflicts.length === 0;
  if (write && ok) performPlannedWrites(plannedWrites);

  json({
    schema: 'agent-onboard-target-instance-takeover-result-001',
    status: ok ? 'ok' : 'error',
    command_family: 'target-instance',
    mode: write ? 'write' : 'dry-run',
    force,
    writes_performed: write && ok,
    planned_writes: summarizePlan(plannedWrites),
    conflicts: conflicts.map((item) => item.path)
  });
  return ok ? 0 : 1;
}

function help() {
  process.stdout.write(`agent-onboard ${VERSION}\n\nagent-onboard status\nagent-onboard init --dry-run|--write [--force]\nagent-onboard agents --preview|--write [--force]\nagent-onboard target-config --schema\nagent-onboard target-config --template\nagent-onboard target-config --validate-template\nagent-onboard target-config --validate [agent-onboard.target.json]\nagent-onboard target bootstrap --dry-run|--write [--force]\nagent-onboard target-instance takeover --dry-run|--write [--force]\n`);
  return 0;
}

function main(argv = process.argv) {
  const [cmd, ...args] = argv.slice(2);
  if (!cmd || ['help', '--help', '-h'].includes(cmd)) return help();
  if (['version', '--version', '-v'].includes(cmd)) {
    process.stdout.write(`${VERSION}\n`);
    return 0;
  }
  if (cmd === 'status') {
    json({ schema: 'agent-onboard-status-001', status: 'ok', version: VERSION, release_line: 'public_agent_instructions_preview_surface' });
    return 0;
  }
  if (cmd === 'init') return runInit(args);
  if (cmd === 'agents') return runAgents(args);
  if (cmd === 'target-config') return runTargetConfig(args);
  if (cmd === 'target') {
    if (args[0] !== 'bootstrap') throw new Error('target supports only: bootstrap');
    return runTargetBootstrap(args.slice(1));
  }
  if (cmd === 'target-instance') return runTargetInstance(args);
  throw new Error(`unsupported command: ${cmd}`);
}

if (require.main === module) {
  try {
    process.exitCode = main();
  } catch (error) {
    json({ schema: 'agent-onboard-cli-error-001', status: 'error', message: error.message || String(error) });
    process.exitCode = 1;
  }
}

module.exports = {
  main,
  targetConfigTemplate,
  validateTargetConfig,
  initWriteSet,
  planWrites,
  agentsMdTemplate
};
