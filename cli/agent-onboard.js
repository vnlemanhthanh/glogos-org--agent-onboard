#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const VERSION = require('../package.json').version;
const TARGET_CONFIG_FILE = 'agent-onboard.target.json';

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

const WORK_ITEMS_SCHEMA = {
  schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'agent-onboard-target-work-items-001',
  type: 'object',
  required: ['schema', 'package_name', 'vocabulary', 'programs', 'stages', 'milestones', 'work_items'],
  additionalProperties: false,
  properties: {
    schema: { const: 'agent-onboard-target-work-items-001' },
    package_name: { const: 'agent-onboard' },
    vocabulary: {
      type: 'object',
      required: ['program', 'stage', 'milestone', 'work_item'],
      additionalProperties: false,
      properties: {
        program: {
          type: 'object',
          required: ['prefix', 'name', 'description'],
          additionalProperties: false,
          properties: {
            prefix: { const: 'P' },
            name: { const: 'Program' },
            description: { type: 'string', minLength: 1 }
          }
        },
        stage: {
          type: 'object',
          required: ['prefix', 'name', 'description'],
          additionalProperties: false,
          properties: {
            prefix: { const: 'S' },
            name: { const: 'Stage' },
            description: { type: 'string', minLength: 1 }
          }
        },
        milestone: {
          type: 'object',
          required: ['prefix', 'name', 'description'],
          additionalProperties: false,
          properties: {
            prefix: { const: 'M' },
            name: { const: 'Milestone' },
            description: { type: 'string', minLength: 1 }
          }
        },
        work_item: {
          type: 'object',
          required: ['prefix', 'name', 'description'],
          additionalProperties: false,
          properties: {
            prefix: { const: 'W' },
            name: { const: 'Work Item' },
            description: { type: 'string', minLength: 1 }
          }
        }
      }
    },
    programs: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'title', 'status'],
        additionalProperties: false,
        properties: {
          id: { type: 'string', pattern: '^P[0-9]+$' },
          title: { type: 'string', minLength: 1 },
          status: { enum: ['open', 'closed'] }
        }
      }
    },
    stages: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'program_id', 'title', 'status'],
        additionalProperties: false,
        properties: {
          id: { type: 'string', pattern: '^P[0-9]+S[0-9]+$' },
          program_id: { type: 'string', pattern: '^P[0-9]+$' },
          title: { type: 'string', minLength: 1 },
          status: { enum: ['open', 'closed'] }
        }
      }
    },
    milestones: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'stage_id', 'title', 'status'],
        additionalProperties: false,
        properties: {
          id: { type: 'string', pattern: '^P[0-9]+S[0-9]+M[0-9]+$' },
          stage_id: { type: 'string', pattern: '^P[0-9]+S[0-9]+$' },
          title: { type: 'string', minLength: 1 },
          status: { enum: ['open', 'closed'] }
        }
      }
    },
    work_items: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'milestone_id', 'title', 'status'],
        additionalProperties: false,
        properties: {
          id: { type: 'string', pattern: '^P[0-9]+S[0-9]+M[0-9]+W[0-9]+$' },
          milestone_id: { type: 'string', pattern: '^P[0-9]+S[0-9]+M[0-9]+$' },
          title: { type: 'string', minLength: 1 },
          status: { enum: ['open', 'claimed', 'closed'] },
          claim: {
            type: 'object',
            required: ['actor', 'claimed_at'],
            additionalProperties: false,
            properties: {
              actor: { type: 'string', minLength: 1 },
              claimed_at: { type: 'string', minLength: 1 },
              note: { type: 'string', minLength: 1 }
            }
          },
          closure: {
            type: 'object',
            required: ['actor', 'closed_at', 'summary', 'changed_files', 'checks_run', 'checks_not_run', 'known_non_pass'],
            additionalProperties: false,
            properties: {
              actor: { type: 'string', minLength: 1 },
              closed_at: { type: 'string', minLength: 1 },
              summary: { type: 'string', minLength: 1 },
              changed_files: { type: 'array', items: { type: 'string', minLength: 1 } },
              checks_run: { type: 'array', items: { type: 'string', minLength: 1 } },
              checks_not_run: { type: 'array', items: { type: 'string', minLength: 1 } },
              known_non_pass: { type: 'array', items: { type: 'string', minLength: 1 } }
            }
          }
        }
      }
    }
  }
};

const BOUNDARY_GUARD_CONTRACT = Object.freeze({
  schema: 'agent-onboard-public-boundary-guard-enforcement-seed-contract-001',
  title: 'Agent-Onboard Public Boundary Guard Enforcement Seed Gate',
  package_name: 'agent-onboard',
  command: 'agent-onboard guard --check-boundary',
  canonical_target_config_file: TARGET_CONFIG_FILE,
  enforcement_mode: 'fail_closed',
  required_target_config_values: Object.freeze({
    schema: 'agent-onboard-target-config-001',
    'control.package_name': 'agent-onboard',
    'control.requested_mode': 'target_dry_run',
    'control.authority_level': 'L1_read_only_preview',
    'boundaries.writes_allowed': false,
    'boundaries.managed_project_commands_allowed': 0,
    'boundaries.create_agent_onboard_runtime_state': false,
    'boundaries.install_dependencies': false,
    'boundaries.run_build_test_deploy': false,
    'boundaries.publish_or_push': false
  }),
  forbidden_true_boundary_fields: Object.freeze([
    'boundaries.writes_allowed',
    'boundaries.create_agent_onboard_runtime_state',
    'boundaries.install_dependencies',
    'boundaries.run_build_test_deploy',
    'boundaries.publish_or_push'
  ])
});


const PUBLIC_RELEASE_CONTRACT = Object.freeze({
  schema: 'agent-onboard-public-release-contract-004',
  title: 'Agent-Onboard Public Release Contract',
  package_name: 'agent-onboard',
  release_line: 'public_installed_package_parity_smoke_gate',
  command: 'agent-onboard release --check',
  contract_command: 'agent-onboard release --contract',
  fixture_command: 'agent-onboard release --fixture',
  parity_smoke_command: 'agent-onboard release --parity-smoke',
  expected_pack_files: Object.freeze(['LICENSE', 'README.md', 'cli/agent-onboard.js', 'package.json']),
  source_context_files: Object.freeze([
    '.agent-onboard/project.json',
    '.agent-onboard/work-items.json',
    'agent-onboard.target.json',
    'AGENTS.md',
    'test/agent-onboard.test.js'
  ]),
  required_package_json: Object.freeze({
    name: 'agent-onboard',
    license: 'Apache-2.0',
    type: 'commonjs',
    node_engine: '>=18',
    bin: Object.freeze({
      'agent-onboard': 'cli/agent-onboard.js',
      aob: 'cli/agent-onboard.js',
      'create-agent-onboard': 'cli/agent-onboard.js'
    }),
    files: Object.freeze(['cli/agent-onboard.js', 'README.md', 'LICENSE'])
  }),
  required_metadata_fields: Object.freeze(['description', 'author', 'repository.url', 'homepage', 'bugs.url', 'keywords']),
  required_keyword_minimum: 5,
  local_pre_publish_commands: Object.freeze([
    'npm test',
    'npm pack --dry-run --json',
    'npm publish --dry-run --json --ignore-scripts',
    'node cli/agent-onboard.js status',
    'node cli/agent-onboard.js release --contract',
    'node cli/agent-onboard.js release --fixture',
    'node cli/agent-onboard.js release --parity-smoke',
    'node cli/agent-onboard.js release --check',
    'node cli/agent-onboard.js work-items --validate .agent-onboard/work-items.json'
  ]),
  post_publish_verification_commands: Object.freeze([
    'npm view agent-onboard version dist-tags',
    'npm view agent-onboard@<version> name version license bin repository',
    'npx agent-onboard@<version> status',
    'npx agent-onboard@<version> release --contract',
    'npx agent-onboard@<version> release --fixture',
    'npx agent-onboard@<version> release --parity-smoke',
    'npx agent-onboard@<version> release --check',
    'npx agent-onboard@<version> init --dry-run'
  ]),
  boundary: Object.freeze({
    release_commands_publish_package: false,
    release_commands_mutate_registry: false,
    release_commands_install_dependencies: false,
    release_commands_run_git: false,
    source_ledger_required_only_when_present: true
  })
});


const PUBLIC_RELEASE_FIXTURE_MATRIX = Object.freeze({
  schema: 'agent-onboard-public-release-fixture-matrix-002',
  title: 'Agent-Onboard Public Package Contract Fixture Matrix',
  package_name: 'agent-onboard',
  release_line: PUBLIC_RELEASE_CONTRACT.release_line,
  contract_schema: PUBLIC_RELEASE_CONTRACT.schema,
  command: 'agent-onboard release --fixture',
  purpose: 'Declare regression fixtures for package/version/content drift before publish handoff.',
  fixtures: Object.freeze([
    Object.freeze({
      id: 'valid_source_repository_contract',
      expected_status: 'ok',
      validates: Object.freeze(['package_metadata', 'projected_pack_allowlist', 'public_artifact_messaging', 'source_work_items_ledger'])
    }),
    Object.freeze({
      id: 'valid_installed_package_contract',
      expected_status: 'ok',
      validates: Object.freeze(['package_metadata', 'projected_pack_allowlist', 'public_artifact_messaging']),
      expected_source_work_items_ledger_status: 'skipped'
    }),
    Object.freeze({
      id: 'stale_package_version_contract',
      expected_status: 'error',
      detects: 'package.json version drift from runtime version'
    }),
    Object.freeze({
      id: 'pack_allowlist_drift_contract',
      expected_status: 'error',
      detects: 'package.json files array drift from public npm tarball allowlist'
    }),
    Object.freeze({
      id: 'missing_bin_entrypoint_contract',
      expected_status: 'error',
      detects: 'missing CLI bin entrypoint referenced by package.json'
    }),
    Object.freeze({
      id: 'public_artifact_messaging_contract',
      expected_status: 'error',
      detects: 'reserved public artifact messaging token in npm-packed files'
    }),
    Object.freeze({
      id: 'projected_installed_package_parity_smoke',
      expected_status: 'ok',
      validates: Object.freeze(['source_candidate_release_check', 'expected_pack_files_present', 'source_context_excluded_from_pack', 'bin_entrypoints_in_pack', 'runtime_version_matches_package_json']),
      boundary: 'no package-manager execution, no registry mutation, no Git mutation, no temp-file writes'
    })
  ]),
  boundary: Object.freeze({
    writes_files: false,
    git_mutation: false,
    installs_dependencies: false,
    runs_build_test_deploy: false,
    publishes_package: false,
    mutates_registry: false
  })
});

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

Before any dependency install, build, test, deploy, publish, push, or broad write operation, run the boundary check when \`agent-onboard.target.json\` is present:

\`\`\`sh
npx agent-onboard@${VERSION} guard --check-boundary
\`\`\`

Treat a blocked guard result as a stop condition until the repository owner explicitly changes the boundary.

Inspect the public work-item ledger when present:

\`\`\`sh
npx agent-onboard@${VERSION} work-items --list
\`\`\`

Follow the public participation lifecycle:

1. Discover: read the operating surface listed above.
2. Inspect: understand the assigned public work item and relevant files before editing.
3. Claim: use \`work-items --claim --dry-run\` first, then \`--write\` only when explicitly authorized.
4. Work: edit only files needed for the claimed work item.
5. Validate: run only checks authorized by the owner or clearly permitted by the task.
6. Handoff: report files changed, checks run, checks not run, and known non-pass states.

If \`agents --write\` reports an existing non-identical \`AGENTS.md\`, treat that as expected overwrite protection. Do not force overwrite unless the repository owner explicitly asks for replacement.

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
    if (schema.pattern !== undefined && !(new RegExp(schema.pattern)).test(value)) {
      errors.push(`${pointer}: expected pattern ${schema.pattern}`);
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

function validateWorkItems(value) {
  return validateWorkItemsDocument(value);
}

function workItemCounts(value) {
  return {
    programs: Array.isArray(value.programs) ? value.programs.length : 0,
    stages: Array.isArray(value.stages) ? value.stages.length : 0,
    milestones: Array.isArray(value.milestones) ? value.milestones.length : 0,
    work_items: Array.isArray(value.work_items) ? value.work_items.length : 0
  };
}

function parseOption(args, name) {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith('-')) throw new Error(`${name} requires a value`);
  return value;
}

function parseRepeatedOption(args, name) {
  const values = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] !== name) continue;
    const value = args[index + 1];
    if (!value || value.startsWith('-')) throw new Error(`${name} requires a value`);
    values.push(value);
  }
  return values;
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function uniqueIdErrors(items, collectionName) {
  if (!Array.isArray(items)) return [];
  const seen = new Set();
  const errors = [];
  for (const item of items) {
    if (!item || typeof item.id !== 'string') continue;
    if (seen.has(item.id)) errors.push(`$.${collectionName}: duplicate id ${item.id}`);
    seen.add(item.id);
  }
  return errors;
}

function validateWorkItemsGraph(value) {
  const errors = [];
  if (!isPlainObject(value)) return errors;

  errors.push(...uniqueIdErrors(value.programs, 'programs'));
  errors.push(...uniqueIdErrors(value.stages, 'stages'));
  errors.push(...uniqueIdErrors(value.milestones, 'milestones'));
  errors.push(...uniqueIdErrors(value.work_items, 'work_items'));

  const programs = new Set(Array.isArray(value.programs) ? value.programs.map((item) => item.id) : []);
  const stages = new Set(Array.isArray(value.stages) ? value.stages.map((item) => item.id) : []);
  const milestones = new Set(Array.isArray(value.milestones) ? value.milestones.map((item) => item.id) : []);

  if (Array.isArray(value.stages)) {
    for (const item of value.stages) {
      if (!item || typeof item.id !== 'string' || typeof item.program_id !== 'string') continue;
      const expected = item.id.replace(/S[0-9]+$/, '');
      if (item.program_id !== expected) errors.push(`$.stages.${item.id}: program_id must be ${expected}`);
      if (!programs.has(item.program_id)) errors.push(`$.stages.${item.id}: missing program ${item.program_id}`);
    }
  }

  if (Array.isArray(value.milestones)) {
    for (const item of value.milestones) {
      if (!item || typeof item.id !== 'string' || typeof item.stage_id !== 'string') continue;
      const expected = item.id.replace(/M[0-9]+$/, '');
      if (item.stage_id !== expected) errors.push(`$.milestones.${item.id}: stage_id must be ${expected}`);
      if (!stages.has(item.stage_id)) errors.push(`$.milestones.${item.id}: missing stage ${item.stage_id}`);
    }
  }

  if (Array.isArray(value.work_items)) {
    for (const item of value.work_items) {
      if (!item || typeof item.id !== 'string' || typeof item.milestone_id !== 'string') continue;
      const expected = item.id.replace(/W[0-9]+$/, '');
      if (item.milestone_id !== expected) errors.push(`$.work_items.${item.id}: milestone_id must be ${expected}`);
      if (!milestones.has(item.milestone_id)) errors.push(`$.work_items.${item.id}: missing milestone ${item.milestone_id}`);
      if (item.status === 'claimed' && !isPlainObject(item.claim)) {
        errors.push(`$.work_items.${item.id}: claimed work item requires claim`);
      }
      if (item.status === 'open' && Object.prototype.hasOwnProperty.call(item, 'claim')) {
        errors.push(`$.work_items.${item.id}: open work item must not include claim`);
      }
      if (item.status !== 'closed' && Object.prototype.hasOwnProperty.call(item, 'closure')) {
        errors.push(`$.work_items.${item.id}: only closed work items may include closure`);
      }
    }
  }

  return errors;
}

function validateWorkItemsDocument(value) {
  return [...validateJsonSchema(value, WORK_ITEMS_SCHEMA), ...validateWorkItemsGraph(value)];
}

function deriveWorkItemIds(workItemId) {
  const match = /^(P[0-9]+)(S[0-9]+)(M[0-9]+)(W[0-9]+)$/.exec(workItemId);
  if (!match) return null;
  return {
    program_id: match[1],
    stage_id: `${match[1]}${match[2]}`,
    milestone_id: `${match[1]}${match[2]}${match[3]}`,
    work_item_id: `${match[1]}${match[2]}${match[3]}${match[4]}`
  };
}

function appendWorkItemDryRun(currentLedger, options) {
  const id = options.id;
  const title = options.title;
  const ids = deriveWorkItemIds(id);
  if (!ids) throw new Error('work-items --append requires --id matching public P/S/M/W format');
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    throw new Error('work-items --append requires --title');
  }

  const ledger = cloneJson(currentLedger);
  const programTitle = options.program_title || `Program ${ids.program_id}`;
  const stageTitle = options.stage_title || `Stage ${ids.stage_id}`;
  const milestoneTitle = options.milestone_title || `Milestone ${ids.milestone_id}`;

  const added = { programs: [], stages: [], milestones: [], work_items: [] };
  if (ledger.work_items.some((item) => item.id === ids.work_item_id)) {
    throw new Error('work-items --append refuses duplicate work item id');
  }

  if (!ledger.programs.some((item) => item.id === ids.program_id)) {
    const item = { id: ids.program_id, title: programTitle, status: 'open' };
    ledger.programs.push(item);
    added.programs.push(item);
  }
  if (!ledger.stages.some((item) => item.id === ids.stage_id)) {
    const item = { id: ids.stage_id, program_id: ids.program_id, title: stageTitle, status: 'open' };
    ledger.stages.push(item);
    added.stages.push(item);
  }
  if (!ledger.milestones.some((item) => item.id === ids.milestone_id)) {
    const item = { id: ids.milestone_id, stage_id: ids.stage_id, title: milestoneTitle, status: 'open' };
    ledger.milestones.push(item);
    added.milestones.push(item);
  }

  const workItem = { id: ids.work_item_id, milestone_id: ids.milestone_id, title: title.trim(), status: 'open' };
  ledger.work_items.push(workItem);
  added.work_items.push(workItem);

  return { proposed_ledger: ledger, added };
}

function participationLifecycleNextSteps() {
  return [
    'discover: read AGENTS.md, agent-onboard.target.json, .agent-onboard/project.json, and .agent-onboard/work-items.json when present',
    'inspect: read the assigned work-item scope and relevant files before editing',
    'claim: use --dry-run first and --write only with explicit authorization',
    'work: modify only files needed for the claimed work item',
    'validate: run only checks authorized by the owner or clearly permitted by the current task',
    'handoff: report changed files, checks run, checks not run, and known non-pass states before closure'
  ];
}

function claimWorkItemDryRun(currentLedger, options) {
  const id = options.id;
  const actor = options.actor;
  const ids = deriveWorkItemIds(id);
  if (!ids) throw new Error('work-items --claim requires --id matching public P/S/M/W format');
  if (!actor || typeof actor !== 'string' || actor.trim().length === 0) {
    throw new Error('work-items --claim requires --actor');
  }

  const ledger = cloneJson(currentLedger);
  const workItem = ledger.work_items.find((item) => item.id === ids.work_item_id);
  if (!workItem) throw new Error('work-items --claim requires an existing work item id');
  if (workItem.status === 'closed') throw new Error('work-items --claim refuses closed work item');
  if (workItem.status === 'claimed' || Object.prototype.hasOwnProperty.call(workItem, 'claim')) {
    throw new Error('work-items --claim refuses already claimed work item');
  }

  const claim = {
    actor: actor.trim(),
    claimed_at: options.claimed_at || new Date().toISOString()
  };
  if (options.note && String(options.note).trim().length > 0) claim.note = String(options.note).trim();
  workItem.status = 'claimed';
  workItem.claim = claim;

  return {
    proposed_ledger: ledger,
    claimed: {
      work_item_id: ids.work_item_id,
      actor: claim.actor,
      claimed_at: claim.claimed_at,
      note: claim.note
    },
    next_steps: participationLifecycleNextSteps()
  };
}

function handoffEvidenceChecklist() {
  return [
    'summary: concise explanation of what was completed',
    'changed_files: files intentionally modified for the work item',
    'checks_run: commands or inspections actually executed in this workspace',
    'checks_not_run: relevant checks intentionally omitted or unavailable',
    'known_non_pass: expected conflicts, failures, caveats, or residual risks'
  ];
}

function closeWorkItemDryRun(currentLedger, options) {
  const id = options.id;
  const actor = options.actor;
  const summary = options.summary;
  const ids = deriveWorkItemIds(id);
  if (!ids) throw new Error('work-items --close requires --id matching public P/S/M/W format');
  if (!actor || typeof actor !== 'string' || actor.trim().length === 0) {
    throw new Error('work-items --close requires --actor');
  }
  if (!summary || typeof summary !== 'string' || summary.trim().length === 0) {
    throw new Error('work-items --close requires --summary');
  }

  const ledger = cloneJson(currentLedger);
  const workItem = ledger.work_items.find((item) => item.id === ids.work_item_id);
  if (!workItem) throw new Error('work-items --close requires an existing work item id');
  if (workItem.status === 'closed') throw new Error('work-items --close refuses already closed work item');

  const closure = {
    actor: actor.trim(),
    closed_at: options.closed_at || new Date().toISOString(),
    summary: summary.trim(),
    changed_files: options.changed_files || [],
    checks_run: options.checks_run || [],
    checks_not_run: options.checks_not_run || [],
    known_non_pass: options.known_non_pass || []
  };

  workItem.status = 'closed';
  workItem.closure = closure;

  return {
    proposed_ledger: ledger,
    closed: {
      work_item_id: ids.work_item_id,
      actor: closure.actor,
      closed_at: closure.closed_at,
      summary: closure.summary
    },
    handoff_evidence: {
      checklist: handoffEvidenceChecklist(),
      closure
    }
  };
}

function getPathValue(value, dottedPath) {
  return dottedPath.split('.').reduce((cursor, part) => {
    if (cursor && Object.prototype.hasOwnProperty.call(cursor, part)) return cursor[part];
    return undefined;
  }, value);
}

function evaluateTargetBoundaryConfig(config, contract = BOUNDARY_GUARD_CONTRACT) {
  const violations = [];
  for (const [fieldPath, expected] of Object.entries(contract.required_target_config_values)) {
    const actual = getPathValue(config, fieldPath);
    if (actual !== expected) violations.push({ path: fieldPath, expected, actual });
  }
  for (const fieldPath of contract.forbidden_true_boundary_fields) {
    const actual = getPathValue(config, fieldPath);
    if (actual === true && !violations.some((item) => item.path === fieldPath)) {
      violations.push({ path: fieldPath, expected: false, actual });
    }
  }
  return violations;
}

function noMutationBoundary() {
  return {
    writes_files: false,
    writes_target_repository_state: false,
    creates_agent_onboard_runtime_state: false,
    installs_dependencies: false,
    runs_build_test_deploy: false,
    runs_managed_project_commands: false,
    managed_project_commands_executed: false,
    publishes_package: false,
    git_mutation: false
  };
}

function guardResultBase() {
  return {
    schema: 'agent-onboard-guard-boundary-check-result-001',
    command_family: 'guard',
    command: 'agent-onboard guard --check-boundary',
    package_name: BOUNDARY_GUARD_CONTRACT.package_name,
    package_version: VERSION,
    config_path: TARGET_CONFIG_FILE,
    enforcement_mode: BOUNDARY_GUARD_CONTRACT.enforcement_mode,
    ...noMutationBoundary()
  };
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
    vocabulary: {
      program: {
        prefix: 'P',
        name: 'Program',
        description: 'A top-level line of coordinated work inside a target repo.'
      },
      stage: {
        prefix: 'S',
        name: 'Stage',
        description: 'A phase within a program.'
      },
      milestone: {
        prefix: 'M',
        name: 'Milestone',
        description: 'A bounded delivery checkpoint within a stage.'
      },
      work_item: {
        prefix: 'W',
        name: 'Work Item',
        description: 'A concrete unit of agent-addressable work within a milestone.'
      }
    },
    programs: [],
    stages: [],
    milestones: [],
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


function packageRoot() {
  return path.resolve(__dirname, '..');
}

function arrayEquals(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right)) return false;
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

function publicReleasePostPublishCommands(version = VERSION) {
  return PUBLIC_RELEASE_CONTRACT.post_publish_verification_commands.map((command) => command.replaceAll('<version>', version));
}

function packageJsonReleaseErrors(pkg, root = packageRoot()) {
  const errors = [];
  const required = PUBLIC_RELEASE_CONTRACT.required_package_json;
  if (pkg.name !== required.name) errors.push(`package.json#name must be ${required.name}`);
  if (pkg.version !== VERSION) errors.push(`package.json#version must match runtime version ${VERSION}`);
  if (pkg.private === true) errors.push('package.json#private must not be true for a public package');
  if (pkg.license !== required.license) errors.push(`package.json#license must be ${required.license}`);
  if (pkg.type !== required.type) errors.push(`package.json#type must be ${required.type}`);
  if (!pkg.engines || pkg.engines.node !== required.node_engine) errors.push(`package.json#engines.node must be ${required.node_engine}`);
  for (const field of PUBLIC_RELEASE_CONTRACT.required_metadata_fields) {
    const value = getPathValue(pkg, field);
    const missing = Array.isArray(value) ? value.length === 0 : value === undefined || value === null || value === '';
    if (missing) errors.push(`package.json#${field} is required`);
  }
  if (!Array.isArray(pkg.keywords) || pkg.keywords.length < 5) errors.push('package.json#keywords must contain at least 5 discovery terms');
  const requiredBin = required.bin;
  for (const [name, rel] of Object.entries(requiredBin)) {
    if (!pkg.bin || pkg.bin[name] !== rel) errors.push(`package.json#bin.${name} must be ${rel}`);
    else if (!fs.existsSync(path.join(root, rel))) errors.push(`package.json#bin.${name} points to missing file ${rel}`);
  }
  const actualFiles = Array.isArray(pkg.files) ? pkg.files.slice().sort() : [];
  const expectedFiles = required.files.slice().sort();
  if (!arrayEquals(actualFiles, expectedFiles)) errors.push(`package.json#files must match ${expectedFiles.join(', ')}`);
  for (const rel of expectedFiles) {
    if (!fs.existsSync(path.join(root, rel))) errors.push(`package.json#files includes missing path ${rel}`);
  }
  return errors;
}

function packageJsonProjectedPackFiles(pkg) {
  const files = new Set(['package.json']);
  if (Array.isArray(pkg.files)) {
    for (const rel of pkg.files) files.add(rel);
  }
  return Array.from(files).sort();
}

function publicArtifactMessagingErrors(root = packageRoot(), files = PUBLIC_RELEASE_CONTRACT.expected_pack_files) {
  const errors = [];
  const forbiddenConcreteWorkItem = /P\d+S\d+M\d+W\d+/;
  const forbiddenKey = ['machine', 'identifier'].join('_');
  const forbiddenNarrativePatterns = [
    /private\s*\/\s*public\s+split/i,
    /internal\s+line/i,
    /research\s+line/i,
    /stripp?ed/i,
    /saniti[sz]ed/i,
    /\bleak(?:age|ed|s|ing)?\b/i
  ];

  for (const rel of files) {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs) || fs.statSync(abs).isDirectory()) continue;
    const text = fs.readFileSync(abs, 'utf8');
    if (text.includes(forbiddenKey)) errors.push(`${rel} contains reserved implementation key token`);
    const workItemMatch = forbiddenConcreteWorkItem.exec(text);
    if (workItemMatch) errors.push(`${rel} contains concrete work-item token ${workItemMatch[0]}`);
    for (let index = 0; index < forbiddenNarrativePatterns.length; index += 1) {
      const match = forbiddenNarrativePatterns[index].exec(text);
      if (match) errors.push(`${rel} violates public artifact messaging rule ${index + 1}: ${match[0]}`);
    }
  }
  return errors;
}

function sourceWorkItemsLedgerCheck(root = packageRoot()) {
  const file = path.join(root, '.agent-onboard', 'work-items.json');
  if (!fs.existsSync(file)) {
    return {
      present: false,
      status: 'skipped',
      reason: 'source work-item ledger is not present in this package context',
      validated: true,
      file: '.agent-onboard/work-items.json',
      counts: null,
      errors: []
    };
  }
  let value;
  try {
    value = readJson(file);
  } catch (error) {
    return {
      present: true,
      status: 'error',
      reason: 'source work-item ledger is not valid JSON',
      validated: false,
      file: '.agent-onboard/work-items.json',
      counts: null,
      errors: [error && error.message ? error.message : String(error)]
    };
  }
  const errors = validateWorkItems(value);
  const counts = workItemCounts(value);
  return {
    present: true,
    status: errors.length === 0 ? 'ok' : 'error',
    reason: errors.length === 0 ? 'source work-item ledger validates' : 'source work-item ledger validation failed',
    validated: errors.length === 0,
    file: '.agent-onboard/work-items.json',
    counts,
    open_work_items: Array.isArray(value.work_items) ? value.work_items.filter((item) => item.status !== 'closed').map((item) => ({ id: item.id, title: item.title, status: item.status })) : [],
    errors
  };
}

function sourceContext(root = packageRoot()) {
  const sourceFiles = PUBLIC_RELEASE_CONTRACT.source_context_files.filter((rel) => fs.existsSync(path.join(root, rel)));
  return {
    package_context: sourceFiles.length > 0 ? 'source_repository' : 'installed_package',
    source_context_files_present: sourceFiles,
    source_context_files_missing: PUBLIC_RELEASE_CONTRACT.source_context_files.filter((rel) => !sourceFiles.includes(rel))
  };
}

function publicReleaseCheck(root = packageRoot()) {
  const pkg = readJson(path.join(root, 'package.json'));
  const metadataErrors = packageJsonReleaseErrors(pkg, root);
  const projectedPackFiles = packageJsonProjectedPackFiles(pkg);
  const expectedPackFiles = PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort();
  const packErrors = arrayEquals(projectedPackFiles, expectedPackFiles) ? [] : [
    `projected npm pack files must match ${expectedPackFiles.join(', ')}`
  ];
  const messagingErrors = publicArtifactMessagingErrors(root, expectedPackFiles);
  const sourceLedger = sourceWorkItemsLedgerCheck(root);
  const sourceLedgerErrors = sourceLedger.present ? sourceLedger.errors.map((error) => `source ledger: ${error}`) : [];
  const errors = [...metadataErrors, ...packErrors, ...messagingErrors, ...sourceLedgerErrors];
  return {
    schema: 'agent-onboard-public-release-check-result-004',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: PUBLIC_RELEASE_CONTRACT.package_name,
    version: VERSION,
    release_line: PUBLIC_RELEASE_CONTRACT.release_line,
    contract_schema: PUBLIC_RELEASE_CONTRACT.schema,
    package_root: root,
    command: PUBLIC_RELEASE_CONTRACT.command,
    contract_command: PUBLIC_RELEASE_CONTRACT.contract_command,
    source_context: sourceContext(root),
    source_work_items_ledger: sourceLedger,
    validated: {
      package_metadata: metadataErrors.length === 0,
      projected_pack_allowlist: packErrors.length === 0,
      public_artifact_messaging: messagingErrors.length === 0,
      bin_entrypoints_exist: metadataErrors.filter((error) => error.includes('points to missing file')).length === 0,
      source_work_items_ledger: sourceLedger.validated
    },
    expected_pack_files: expectedPackFiles,
    projected_pack_files: projectedPackFiles,
    source_context_files: PUBLIC_RELEASE_CONTRACT.source_context_files.slice(),
    local_pre_publish_commands: PUBLIC_RELEASE_CONTRACT.local_pre_publish_commands.slice(),
    post_publish_verification_commands: publicReleasePostPublishCommands(VERSION),
    boundary: {
      writes_files: false,
      git_mutation: false,
      installs_dependencies: false,
      runs_build_test_deploy: false,
      publishes_package: false,
      mutates_registry: false,
      network_registry_publish_required: false
    },
    errors
  };
}

function publicInstalledPackageParitySmoke(root = packageRoot()) {
  const pkg = readJson(path.join(root, 'package.json'));
  const sourceCheck = publicReleaseCheck(root);
  const expectedPackFiles = PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort();
  const projectedPackFiles = packageJsonProjectedPackFiles(pkg);
  const missingExpectedFiles = expectedPackFiles.filter((rel) => !fs.existsSync(path.join(root, rel)));
  const sourceContextFilesInPack = PUBLIC_RELEASE_CONTRACT.source_context_files.filter((rel) => expectedPackFiles.includes(rel));
  const binEntryErrors = [];
  for (const [name, rel] of Object.entries(PUBLIC_RELEASE_CONTRACT.required_package_json.bin)) {
    if (!expectedPackFiles.includes(rel)) binEntryErrors.push(`${name} bin target ${rel} is not in the projected npm package files`);
    if (!fs.existsSync(path.join(root, rel))) binEntryErrors.push(`${name} bin target ${rel} is missing from the candidate root`);
  }

  const parity = {
    source_candidate_release_check: sourceCheck.status === 'ok',
    projected_pack_files_match_contract: arrayEquals(projectedPackFiles, expectedPackFiles),
    expected_pack_files_present: missingExpectedFiles.length === 0,
    source_context_excluded_from_pack: sourceContextFilesInPack.length === 0,
    installed_context_would_skip_source_ledger: !expectedPackFiles.includes('.agent-onboard/work-items.json'),
    bin_entrypoints_in_pack: binEntryErrors.length === 0,
    runtime_version_matches_package_json: pkg.version === VERSION
  };

  const errors = [];
  if (!parity.source_candidate_release_check) errors.push('source candidate release check must pass before installed package parity smoke can pass');
  if (!parity.projected_pack_files_match_contract) errors.push(`projected npm pack files must match ${expectedPackFiles.join(', ')}`);
  for (const rel of missingExpectedFiles) errors.push(`expected npm package file is missing: ${rel}`);
  for (const rel of sourceContextFilesInPack) errors.push(`source-only context file must not be projected into npm package: ${rel}`);
  for (const error of binEntryErrors) errors.push(error);
  if (!parity.runtime_version_matches_package_json) errors.push(`package.json#version must match runtime version ${VERSION}`);

  return {
    schema: 'agent-onboard-public-installed-package-parity-smoke-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: PUBLIC_RELEASE_CONTRACT.package_name,
    version: VERSION,
    release_line: PUBLIC_RELEASE_CONTRACT.release_line,
    contract_schema: PUBLIC_RELEASE_CONTRACT.schema,
    command: PUBLIC_RELEASE_CONTRACT.parity_smoke_command,
    package_root: root,
    source_context: sourceContext(root),
    source_release_check: {
      status: sourceCheck.status,
      validated: sourceCheck.validated,
      errors: sourceCheck.errors
    },
    projected_installed_package: {
      expected_pack_files: expectedPackFiles,
      projected_pack_files: projectedPackFiles,
      missing_expected_files: missingExpectedFiles,
      source_context_files_excluded: PUBLIC_RELEASE_CONTRACT.source_context_files.filter((rel) => !expectedPackFiles.includes(rel)),
      source_context_files_in_pack: sourceContextFilesInPack,
      source_work_items_ledger_status_after_install: 'skipped'
    },
    parity,
    boundary: {
      writes_files: false,
      creates_temp_files: false,
      git_mutation: false,
      installs_dependencies: false,
      runs_package_manager: false,
      runs_build_test_deploy: false,
      publishes_package: false,
      mutates_registry: false,
      network_registry_publish_required: false
    },
    errors
  };
}

function runRelease(args) {
  if (args.length === 1 && args[0] === '--plan') {
    json({
      schema: 'agent-onboard-public-release-plan-004',
      status: 'ok',
      package_name: PUBLIC_RELEASE_CONTRACT.package_name,
      version: VERSION,
      release_line: PUBLIC_RELEASE_CONTRACT.release_line,
      contract_schema: PUBLIC_RELEASE_CONTRACT.schema,
      contract_command: PUBLIC_RELEASE_CONTRACT.contract_command,
      fixture_command: PUBLIC_RELEASE_CONTRACT.fixture_command,
      parity_smoke_command: PUBLIC_RELEASE_CONTRACT.parity_smoke_command,
      check_command: PUBLIC_RELEASE_CONTRACT.command,
      contract: PUBLIC_RELEASE_CONTRACT,
      fixture_matrix: PUBLIC_RELEASE_FIXTURE_MATRIX,
      source_context: sourceContext(),
      post_publish_verification_commands: publicReleasePostPublishCommands(VERSION),
      boundary: {
        writes_files: false,
        git_mutation: false,
        installs_dependencies: false,
        runs_build_test_deploy: false,
        publishes_package: false,
        mutates_registry: false
      }
    });
    return 0;
  }
  if (args.length === 1 && args[0] === '--contract') {
    json({
      schema: 'agent-onboard-public-release-contract-response-001',
      status: 'ok',
      package_name: PUBLIC_RELEASE_CONTRACT.package_name,
      version: VERSION,
      release_line: PUBLIC_RELEASE_CONTRACT.release_line,
      contract: PUBLIC_RELEASE_CONTRACT,
      fixture_matrix: PUBLIC_RELEASE_FIXTURE_MATRIX,
      source_context: sourceContext(),
      writes_files: false,
      publishes_package: false,
      mutates_registry: false
    });
    return 0;
  }
  if (args.length === 1 && args[0] === '--fixture') {
    json({
      schema: 'agent-onboard-public-release-fixture-response-001',
      status: 'ok',
      package_name: PUBLIC_RELEASE_CONTRACT.package_name,
      version: VERSION,
      release_line: PUBLIC_RELEASE_CONTRACT.release_line,
      contract_schema: PUBLIC_RELEASE_CONTRACT.schema,
      fixture_matrix: PUBLIC_RELEASE_FIXTURE_MATRIX,
      source_context: sourceContext(),
      writes_files: false,
      publishes_package: false,
      mutates_registry: false
    });
    return 0;
  }
  if (args.length === 1 && args[0] === '--parity-smoke') {
    const result = publicInstalledPackageParitySmoke();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--check') {
    const result = publicReleaseCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  json({
    schema: 'agent-onboard-release-command-error-001',
    status: 'error',
    command_family: 'release',
    message: 'release requires --plan, --contract, --fixture, --parity-smoke, or --check',
    writes_files: false,
    publishes_package: false
  });
  return 1;
}

function runGuard(args) {
  if (args.length === 1 && args[0] === '--plan') {
    json({
      schema: 'agent-onboard-guard-plan-001',
      status: 'ok',
      command_family: 'guard',
      command: 'agent-onboard guard --plan',
      admitted_command: 'agent-onboard guard --check-boundary',
      canonical_config_file: TARGET_CONFIG_FILE,
        enforcement_mode: BOUNDARY_GUARD_CONTRACT.enforcement_mode,
      required_target_config_values: BOUNDARY_GUARD_CONTRACT.required_target_config_values,
      forbidden_true_boundary_fields: BOUNDARY_GUARD_CONTRACT.forbidden_true_boundary_fields,
      reads_target_config: false,
      ...noMutationBoundary()
    });
    return 0;
  }
  if (args.length !== 1 || args[0] !== '--check-boundary') {
    json({
      schema: 'agent-onboard-guard-command-error-001',
      status: 'error',
      command_family: 'guard',
      message: 'guard requires --plan or --check-boundary',
      ...noMutationBoundary()
    });
    return 1;
  }

  const configPath = path.join(process.cwd(), TARGET_CONFIG_FILE);
  if (!fs.existsSync(configPath)) {
    json({
      ...guardResultBase(),
      status: 'blocked',
      reason: 'missing agent-onboard.target.json in current target repo root',
      reads_target_config: false,
      blocked_violation_count: 1,
      violations: [{ path: TARGET_CONFIG_FILE, expected: 'present', actual: 'missing' }],
      blocks_declared_violation: true
    });
    return 2;
  }

  let config;
  try {
    config = readJson(configPath);
  } catch (error) {
    json({
      ...guardResultBase(),
      status: 'blocked',
      reason: 'invalid JSON in agent-onboard.target.json',
      detail: error && error.message ? error.message : String(error),
      reads_target_config: true,
      blocked_violation_count: 1,
      violations: [{ path: TARGET_CONFIG_FILE, expected: 'valid JSON', actual: 'invalid JSON' }],
      blocks_declared_violation: true
    });
    return 2;
  }

  const schemaErrors = validateTargetConfig(config);
  const schemaViolations = schemaErrors.map((message) => ({ path: 'schema-validation', expected: 'valid agent-onboard-target-config-001', actual: message }));
  const boundaryViolations = evaluateTargetBoundaryConfig(config);
  const violations = [...schemaViolations, ...boundaryViolations];
  const passed = violations.length === 0;
  json({
    ...guardResultBase(),
    status: passed ? 'pass' : 'blocked',
    reason: passed ? 'target boundary is read-only and dry-run' : 'target boundary declaration permits an operation this public guard blocks',
    reads_target_config: true,
    validates_target_config_schema: true,
    blocked_violation_count: violations.length,
    violations,
    blocks_declared_violation: !passed,
    managed_project_commands_allowed_now: 0
  });
  return passed ? 0 : 2;
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

function runWorkItems(args) {
  if (args.includes('--close')) {
    const dry = args.includes('--dry-run');
    const write = args.includes('--write');
    if (!write && !dry) throw new Error('work-items --close requires --dry-run or --write');
    if (write && dry) throw new Error('work-items --close accepts only one of --dry-run or --write');

    const mode = write ? 'write' : 'dry-run';
    const command = `agent-onboard work-items --close --${mode}`;
    const file = parseOption(args, '--file') || '.agent-onboard/work-items.json';
    const absolutePath = path.resolve(process.cwd(), file);
    if (!fs.existsSync(absolutePath)) {
      json({
        schema: 'agent-onboard-work-items-close-result-001',
        status: 'error',
        command_family: 'work-items',
        command,
        file,
        mode,
        reason: 'missing .agent-onboard/work-items.json in current target repo root',
        writes_performed: false
      });
      return 1;
    }

    const current = readJson(absolutePath);
    const currentErrors = validateWorkItems(current);
    if (currentErrors.length > 0) {
      json({
        schema: 'agent-onboard-work-items-close-result-001',
        status: 'error',
        command_family: 'work-items',
        command,
        file,
        mode,
        reason: 'current work-item ledger is invalid',
        writes_performed: false,
        errors: currentErrors
      });
      return 1;
    }

    let proposal;
    try {
      proposal = closeWorkItemDryRun(current, {
        id: parseOption(args, '--id'),
        actor: parseOption(args, '--actor'),
        closed_at: parseOption(args, '--closed-at'),
        summary: parseOption(args, '--summary'),
        changed_files: parseRepeatedOption(args, '--changed-file'),
        checks_run: parseRepeatedOption(args, '--check'),
        checks_not_run: parseRepeatedOption(args, '--check-not-run'),
        known_non_pass: parseRepeatedOption(args, '--known-non-pass')
      });
    } catch (error) {
      json({
        schema: 'agent-onboard-work-items-close-result-001',
        status: 'error',
        command_family: 'work-items',
        command,
        file,
        mode,
        reason: error.message || String(error),
        writes_performed: false
      });
      return 1;
    }

    const proposalErrors = validateWorkItems(proposal.proposed_ledger);
    const ok = proposalErrors.length === 0;
    if (write && ok) writeJson(absolutePath, proposal.proposed_ledger);
    json({
      schema: 'agent-onboard-work-items-close-result-001',
      status: ok ? 'ok' : 'error',
      command_family: 'work-items',
      command,
      file,
      mode,
      writes_performed: write && ok,
      counts_before: workItemCounts(current),
      counts_after: workItemCounts(proposal.proposed_ledger),
      closed: proposal.closed,
      handoff_evidence: proposal.handoff_evidence,
      proposed_ledger: proposal.proposed_ledger,
      errors: proposalErrors,
      boundary: {
        installs_dependencies: false,
        runs_build_test_deploy: false,
        publishes_or_pushes: false,
        modifies_source_files: false,
        modifies_work_items_file: write,
        modifies_only_canonical_work_items_file: write
      }
    });
    return ok ? 0 : 1;
  }
  if (args.includes('--claim')) {
    const dry = args.includes('--dry-run');
    const write = args.includes('--write');
    if (!write && !dry) throw new Error('work-items --claim requires --dry-run or --write');
    if (write && dry) throw new Error('work-items --claim accepts only one of --dry-run or --write');

    const mode = write ? 'write' : 'dry-run';
    const command = `agent-onboard work-items --claim --${mode}`;
    const file = parseOption(args, '--file') || '.agent-onboard/work-items.json';
    const absolutePath = path.resolve(process.cwd(), file);
    if (!fs.existsSync(absolutePath)) {
      json({
        schema: 'agent-onboard-work-items-claim-result-001',
        status: 'error',
        command_family: 'work-items',
        command,
        file,
        mode,
        reason: 'missing .agent-onboard/work-items.json in current target repo root',
        writes_performed: false
      });
      return 1;
    }

    const current = readJson(absolutePath);
    const currentErrors = validateWorkItems(current);
    if (currentErrors.length > 0) {
      json({
        schema: 'agent-onboard-work-items-claim-result-001',
        status: 'error',
        command_family: 'work-items',
        command,
        file,
        mode,
        reason: 'current work-item ledger is invalid',
        writes_performed: false,
        errors: currentErrors
      });
      return 1;
    }

    let proposal;
    try {
      proposal = claimWorkItemDryRun(current, {
        id: parseOption(args, '--id'),
        actor: parseOption(args, '--actor'),
        claimed_at: parseOption(args, '--claimed-at'),
        note: parseOption(args, '--note')
      });
    } catch (error) {
      json({
        schema: 'agent-onboard-work-items-claim-result-001',
        status: 'error',
        command_family: 'work-items',
        command,
        file,
        mode,
        reason: error.message || String(error),
        writes_performed: false
      });
      return 1;
    }

    const proposalErrors = validateWorkItems(proposal.proposed_ledger);
    const ok = proposalErrors.length === 0;
    if (write && ok) writeJson(absolutePath, proposal.proposed_ledger);
    json({
      schema: 'agent-onboard-work-items-claim-result-001',
      status: ok ? 'ok' : 'error',
      command_family: 'work-items',
      command,
      file,
      mode,
      writes_performed: write && ok,
      counts_before: workItemCounts(current),
      counts_after: workItemCounts(proposal.proposed_ledger),
      claimed: proposal.claimed,
      next_steps: proposal.next_steps,
      proposed_ledger: proposal.proposed_ledger,
      errors: proposalErrors,
      boundary: {
        installs_dependencies: false,
        runs_build_test_deploy: false,
        publishes_or_pushes: false,
        modifies_source_files: false,
        modifies_work_items_file: write,
        modifies_only_canonical_work_items_file: write
      }
    });
    return ok ? 0 : 1;
  }
  if (args.includes('--append')) {
    const dry = args.includes('--dry-run');
    const write = args.includes('--write');
    if (!write && !dry) throw new Error('work-items --append requires --dry-run or --write');
    if (write && dry) throw new Error('work-items --append accepts only one of --dry-run or --write');

    const mode = write ? 'write' : 'dry-run';
    const command = `agent-onboard work-items --append --${mode}`;
    const file = parseOption(args, '--file') || '.agent-onboard/work-items.json';
    const absolutePath = path.resolve(process.cwd(), file);
    if (!fs.existsSync(absolutePath)) {
      json({
        schema: 'agent-onboard-work-items-append-result-001',
        status: 'error',
        command_family: 'work-items',
        command,
        file,
        mode,
        reason: 'missing .agent-onboard/work-items.json in current target repo root',
        writes_performed: false
      });
      return 1;
    }

    const current = readJson(absolutePath);
    const currentErrors = validateWorkItems(current);
    if (currentErrors.length > 0) {
      json({
        schema: 'agent-onboard-work-items-append-result-001',
        status: 'error',
        command_family: 'work-items',
        command,
        file,
        mode,
        reason: 'current work-item ledger is invalid',
        writes_performed: false,
        errors: currentErrors
      });
      return 1;
    }

    let proposal;
    try {
      proposal = appendWorkItemDryRun(current, {
        id: parseOption(args, '--id'),
        title: parseOption(args, '--title'),
        program_title: parseOption(args, '--program-title'),
        stage_title: parseOption(args, '--stage-title'),
        milestone_title: parseOption(args, '--milestone-title')
      });
    } catch (error) {
      json({
        schema: 'agent-onboard-work-items-append-result-001',
        status: 'error',
        command_family: 'work-items',
        command,
        file,
        mode,
        reason: error.message || String(error),
        writes_performed: false
      });
      return 1;
    }

    const proposalErrors = validateWorkItems(proposal.proposed_ledger);
    const ok = proposalErrors.length === 0;
    if (write && ok) writeJson(absolutePath, proposal.proposed_ledger);
    json({
      schema: 'agent-onboard-work-items-append-result-001',
      status: ok ? 'ok' : 'error',
      command_family: 'work-items',
      command,
      file,
      mode,
      writes_performed: write && ok,
      counts_before: workItemCounts(current),
      counts_after: workItemCounts(proposal.proposed_ledger),
      added: proposal.added,
      proposed_ledger: proposal.proposed_ledger,
      errors: proposalErrors,
      boundary: {
        installs_dependencies: false,
        runs_build_test_deploy: false,
        publishes_or_pushes: false,
        modifies_source_files: false,
        modifies_work_items_file: write,
        modifies_only_canonical_work_items_file: write
      }
    });
    return ok ? 0 : 1;
  }
  if (args.includes('--init')) {
    const write = args.includes('--write');
    const dry = args.includes('--dry-run');
    const force = args.includes('--force');
    if (!write && !dry) throw new Error('work-items --init requires --dry-run or --write');
    if (write && dry) throw new Error('work-items --init accepts only one of --dry-run or --write');

    const plannedWrites = planWrites([['.agent-onboard/work-items.json', workItemsTemplate()]], { force });
    const conflicts = plannedWrites.filter((item) => item.action === 'conflict');
    const errors = validateWorkItems(workItemsTemplate());
    const ok = conflicts.length === 0 && errors.length === 0;

    if (write && ok) performPlannedWrites(plannedWrites);

    json({
      schema: 'agent-onboard-work-items-init-result-001',
      status: ok ? 'ok' : 'error',
      command_family: 'work-items',
      command: `agent-onboard work-items --init --${write ? 'write' : 'dry-run'}`,
      canonical_file: '.agent-onboard/work-items.json',
      mode: write ? 'write' : 'dry-run',
      force,
      writes_performed: write && ok,
      planned_writes: summarizePlan(plannedWrites),
      conflicts: conflicts.map((item) => item.path),
      validated_template: errors.length === 0,
      counts: workItemCounts(workItemsTemplate()),
      errors,
      boundary: {
        installs_dependencies: false,
        runs_build_test_deploy: false,
        publishes_or_pushes: false,
        modifies_source_files: false,
        modifies_only_canonical_work_items_file: write
      }
    });
    return ok ? 0 : 1;
  }
  if (args.includes('--schema')) {
    json({
      schema: 'agent-onboard-work-items-schema-response-001',
      status: 'ok',
      work_items_schema: WORK_ITEMS_SCHEMA
    });
    return 0;
  }
  if (args.includes('--template')) {
    json({
      schema: 'agent-onboard-work-items-template-response-001',
      status: 'ok',
      canonical_file: '.agent-onboard/work-items.json',
      work_items: workItemsTemplate()
    });
    return 0;
  }
  if (args.includes('--validate-template')) {
    const errors = validateWorkItems(workItemsTemplate());
    const ok = errors.length === 0;
    json({
      schema: 'agent-onboard-work-items-template-validation-001',
      status: ok ? 'ok' : 'error',
      template_source: 'embedded',
      canonical_file: '.agent-onboard/work-items.json',
      validated: true,
      errors
    });
    return ok ? 0 : 1;
  }
  if (args.includes('--validate')) {
    const index = args.indexOf('--validate');
    const file = args[index + 1] && !args[index + 1].startsWith('-') ? args[index + 1] : '.agent-onboard/work-items.json';
    const value = readJson(path.resolve(process.cwd(), file));
    const errors = validateWorkItems(value);
    const ok = errors.length === 0;
    json({
      schema: 'agent-onboard-work-items-file-validation-001',
      status: ok ? 'ok' : 'error',
      file,
      validated: true,
      counts: workItemCounts(value),
      errors
    });
    return ok ? 0 : 1;
  }
  if (args.includes('--list')) {
    const index = args.indexOf('--list');
    const file = args[index + 1] && !args[index + 1].startsWith('-') ? args[index + 1] : '.agent-onboard/work-items.json';
    const absolutePath = path.resolve(process.cwd(), file);
    if (!fs.existsSync(absolutePath)) {
      json({
        schema: 'agent-onboard-work-items-list-response-001',
        status: 'error',
        file,
        reason: 'missing .agent-onboard/work-items.json in current target repo root',
        writes_performed: false
      });
      return 1;
    }
    const value = readJson(absolutePath);
    const errors = validateWorkItems(value);
    const ok = errors.length === 0;
    json({
      schema: 'agent-onboard-work-items-list-response-001',
      status: ok ? 'ok' : 'error',
      file,
      validated: true,
      counts: workItemCounts(value),
      programs: Array.isArray(value.programs) ? value.programs : [],
      stages: Array.isArray(value.stages) ? value.stages : [],
      milestones: Array.isArray(value.milestones) ? value.milestones : [],
      work_items: Array.isArray(value.work_items) ? value.work_items : [],
      errors,
      writes_performed: false
    });
    return ok ? 0 : 1;
  }
  throw new Error('work-items requires --schema, --template, --validate-template, --init --dry-run|--write [--force], --validate [file], or --list [file], or --append --dry-run|--write --id <public-work-item-id> --title <title>, or --claim --dry-run|--write --id <public-work-item-id> --actor <actor>, or --close --dry-run|--write --id <public-work-item-id> --actor <actor> --summary <summary>');
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
  process.stdout.write(`agent-onboard ${VERSION}\n\nagent-onboard status\nagent-onboard init --dry-run|--write [--force]\nagent-onboard agents --preview|--write [--force]\nagent-onboard guard --plan|--check-boundary\nagent-onboard release --plan|--contract|--fixture|--parity-smoke|--check\nagent-onboard target-config --schema\nagent-onboard target-config --template\nagent-onboard target-config --validate-template\nagent-onboard target-config --validate [agent-onboard.target.json]\nagent-onboard work-items --schema\nagent-onboard work-items --template\nagent-onboard work-items --validate-template\nagent-onboard work-items --validate [.agent-onboard/work-items.json]\nagent-onboard work-items --list [.agent-onboard/work-items.json]\nagent-onboard work-items --init --dry-run|--write [--force]\nagent-onboard work-items --append --dry-run|--write --id <public-work-item-id> --title <title>\nagent-onboard work-items --claim --dry-run|--write --id <public-work-item-id> --actor <actor>\nagent-onboard work-items --close --dry-run|--write --id <public-work-item-id> --actor <actor> --summary <summary>\nagent-onboard target bootstrap --dry-run|--write [--force]\nagent-onboard target-instance takeover --dry-run|--write [--force]\n`);
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
    json({ schema: 'agent-onboard-status-001', status: 'ok', version: VERSION, release_line: 'public_installed_package_parity_smoke_gate' });
    return 0;
  }
  if (cmd === 'init') return runInit(args);
  if (cmd === 'agents') return runAgents(args);
  if (cmd === 'guard') return runGuard(args);
  if (cmd === 'release') return runRelease(args);
  if (cmd === 'target-config') return runTargetConfig(args);
  if (cmd === 'work-items') return runWorkItems(args);
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
  validateWorkItems,
  validateWorkItemsGraph,
  appendWorkItemDryRun,
  claimWorkItemDryRun,
  closeWorkItemDryRun,
  handoffEvidenceChecklist,
  participationLifecycleNextSteps,
  workItemsTemplate,
  initWriteSet,
  planWrites,
  agentsMdTemplate,
  evaluateTargetBoundaryConfig,
  sourceWorkItemsLedgerCheck,
  sourceContext,
  publicReleaseCheck,
  publicInstalledPackageParitySmoke,
  PUBLIC_RELEASE_FIXTURE_MATRIX
};
