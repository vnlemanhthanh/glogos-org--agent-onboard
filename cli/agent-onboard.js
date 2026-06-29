#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const VERSION = require('../package.json').version;

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

function json(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
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
        '.agent-onboard/work-items.json'
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

function runTargetConfig(args) {
  if (args.includes('--schema')) {
    json({
      schema: 'agent-onboard-target-config-schema-response-001',
      status: 'ok',
      target_config_schema: TARGET_CONFIG_SCHEMA
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
  throw new Error('target-config requires --schema or --validate-template');
}

function runTargetBootstrap(args) {
  const write = args.includes('--write');
  const dry = args.includes('--dry-run');
  if (!write && !dry) throw new Error('target bootstrap requires --dry-run or --write');

  const plannedWrites = ['agent-onboard.target.json'];
  if (write) writeJson(path.join(process.cwd(), 'agent-onboard.target.json'), targetConfigTemplate());
  json({
    schema: 'agent-onboard-target-bootstrap-result-001',
    status: 'ok',
    command_family: 'target',
    mode: write ? 'write' : 'dry-run',
    writes_performed: write,
    planned_writes: plannedWrites,
    skipped_optional_writes: ['package.json']
  });
  return 0;
}

function runTargetInstance(args) {
  if (args[0] !== 'takeover') throw new Error('target-instance supports only: takeover');
  const write = args.includes('--write');
  const dry = args.includes('--dry-run');
  if (!write && !dry) throw new Error('target-instance takeover requires --dry-run or --write');

  if (write) {
    writeJson(path.join(process.cwd(), '.agent-onboard/project.json'), runtimeProjectTemplate());
    writeJson(path.join(process.cwd(), '.agent-onboard/work-items.json'), workItemsTemplate());
  }
  json({
    schema: 'agent-onboard-target-instance-takeover-result-001',
    status: 'ok',
    command_family: 'target-instance',
    mode: write ? 'write' : 'dry-run',
    writes_performed: write,
    planned_writes: ['.agent-onboard/project.json', '.agent-onboard/work-items.json']
  });
  return 0;
}

function help() {
  process.stdout.write(`agent-onboard ${VERSION}\n\nagent-onboard target-config --schema\nagent-onboard target-config --validate-template\nagent-onboard target bootstrap --dry-run|--write\nagent-onboard target-instance takeover --dry-run|--write\n`);
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
    json({ schema: 'agent-onboard-status-001', status: 'ok', version: VERSION, release_line: 'public_target_convention_genesis' });
    return 0;
  }
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
  validateTargetConfig
};
