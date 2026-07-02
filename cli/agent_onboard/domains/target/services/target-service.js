'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

function createTargetRuntimeService(deps) {
  const {
    version: VERSION,
    publicReleaseContract: PUBLIC_RELEASE_CONTRACT,
    publicAuthorityFirstReadIndex: PUBLIC_AUTHORITY_FIRST_READ_INDEX,
    publicTargetRuntimeNamespace: PUBLIC_TARGET_RUNTIME_NAMESPACE,
    targetOnboardingSurfacePlanContract: TARGET_ONBOARDING_SURFACE_PLAN,
    targetOnboardingDryRunFixtureMatrix: TARGET_ONBOARDING_DRY_RUN_FIXTURE_MATRIX,
    targetConfigFile: TARGET_CONFIG_FILE,
    targetConfigSchema: TARGET_CONFIG_SCHEMA,
    workItemsSchema: WORK_ITEMS_SCHEMA,
    boundaryGuardContract: BOUNDARY_GUARD_CONTRACT,
    packageRoot,
    sourceContext,
    arrayEquals
  } = deps;

  for (const [name, value] of Object.entries({
    VERSION,
    PUBLIC_RELEASE_CONTRACT,
    PUBLIC_AUTHORITY_FIRST_READ_INDEX,
    PUBLIC_TARGET_RUNTIME_NAMESPACE,
    TARGET_ONBOARDING_SURFACE_PLAN,
    TARGET_ONBOARDING_DRY_RUN_FIXTURE_MATRIX,
    TARGET_CONFIG_FILE,
    TARGET_CONFIG_SCHEMA,
    WORK_ITEMS_SCHEMA,
    BOUNDARY_GUARD_CONTRACT,
    packageRoot,
    sourceContext,
    arrayEquals
  })) {
    if (value === undefined || value === null) throw new Error(`createTargetRuntimeService missing dependency: ${name}`);
  }
function targetOnboardingDryRunFixture(cwd = process.cwd()) {
  const [name, kind] = targetName(cwd);
  const bootstrapPlan = planWritesForRoot(cwd, [['agent-onboard.target.json', targetConfigTemplate(cwd)]], { force: false });
  const bootstrapForcePlan = planWritesForRoot(cwd, [['agent-onboard.target.json', targetConfigTemplate(cwd)]], { force: true });
  const instancePlan = planWritesForRoot(cwd, [
    ['.agent-onboard/runtime-namespace.json', targetRuntimeNamespaceTemplate(cwd)],
    ['.agent-onboard/project.json', runtimeProjectTemplate(cwd)],
    ['.agent-onboard/work-items.json', workItemsTemplate()]
  ], { force: false });
  const agentsPlan = planTextWritesForRoot(cwd, [['AGENTS.md', agentsMdTemplate(cwd)]], { force: false });
  const onboardingWritePlan = planTargetOnboardingWritesForRoot(cwd, { force: false });
  return {
    schema: 'agent-onboard-public-target-onboarding-dry-run-fixture-result-001',
    status: 'ok',
    package_name: TARGET_ONBOARDING_DRY_RUN_FIXTURE_MATRIX.package_name,
    version: VERSION,
    release_line: TARGET_ONBOARDING_DRY_RUN_FIXTURE_MATRIX.release_line,
    command: TARGET_ONBOARDING_DRY_RUN_FIXTURE_MATRIX.command,
    contract_schema: TARGET_ONBOARDING_DRY_RUN_FIXTURE_MATRIX.schema,
    target: { name, kind, root: '.' },
    fixture_matrix: TARGET_ONBOARDING_DRY_RUN_FIXTURE_MATRIX,
    observed_target_projection: {
      target_bootstrap_dry_run: {
        command: 'agent-onboard target bootstrap --dry-run',
        writes_performed: false,
        planned_writes: summarizePlan(bootstrapPlan),
        conflicts: bootstrapPlan.filter((item) => item.action === 'conflict').map((item) => item.path)
      },
      target_instance_takeover_dry_run: {
        command: 'agent-onboard target-instance takeover --dry-run',
        writes_performed: false,
        planned_writes: summarizePlan(instancePlan),
        conflicts: instancePlan.filter((item) => item.action === 'conflict').map((item) => item.path)
      },
      agents_preview: {
        command: 'agent-onboard agents --preview',
        writes_performed: false,
        planned_writes: summarizePlan(agentsPlan),
        conflicts: agentsPlan.filter((item) => item.action === 'conflict').map((item) => item.path)
      },
      target_onboarding_explicit_write_projection: {
        command: 'agent-onboard target onboarding --write',
        writes_performed: false,
        planned_writes: summarizePlan(onboardingWritePlan),
        conflicts: onboardingWritePlan.filter((item) => item.action === 'conflict').map((item) => item.path),
        would_write_only_canonical_files: true
      },
      target_bootstrap_force_dry_run: {
        command: 'agent-onboard target bootstrap --dry-run --force',
        writes_performed: false,
        planned_writes: summarizePlan(bootstrapForcePlan),
        conflicts: bootstrapForcePlan.filter((item) => item.action === 'conflict').map((item) => item.path)
      }
    },
    boundary: TARGET_ONBOARDING_DRY_RUN_FIXTURE_MATRIX.boundary,
    next_candidate_gate: TARGET_ONBOARDING_DRY_RUN_FIXTURE_MATRIX.next_candidate_gate
  };
}


function targetOnboardingRealTargetTrial(targetRoot = process.cwd()) {
  const absoluteTargetRoot = path.resolve(targetRoot);
  const errors = [];
  if (!fs.existsSync(absoluteTargetRoot)) errors.push(`target path does not exist: ${absoluteTargetRoot}`);
  else if (!fs.statSync(absoluteTargetRoot).isDirectory()) errors.push(`target path is not a directory: ${absoluteTargetRoot}`);

  let name = path.basename(absoluteTargetRoot) || 'target-repo';
  let kind = 'generic';
  let surfacePlan = null;
  let fixture = null;
  let plannedWrites = [];
  if (errors.length === 0) {
    [name, kind] = targetName(absoluteTargetRoot);
    surfacePlan = targetOnboardingSurfacePlan(absoluteTargetRoot);
    fixture = targetOnboardingDryRunFixture(absoluteTargetRoot);
    plannedWrites = planTargetOnboardingWritesForRoot(absoluteTargetRoot, { force: false });
    if (!surfacePlan || surfacePlan.status !== 'ok') errors.push('target onboarding plan must pass for real target trial');
    if (!fixture || fixture.status !== 'ok') errors.push('target onboarding fixture must pass for real target trial');
  }

  const conflicts = plannedWrites.filter((item) => item.action === 'conflict');
  const nonCanonical = plannedWrites.filter((item) => !TARGET_ONBOARDING_SURFACE_PLAN.canonical_files.includes(item.path));
  const ready = errors.length === 0 && conflicts.length === 0 && nonCanonical.length === 0;
  return {
    schema: 'agent-onboard-public-target-onboarding-real-target-trial-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: 'agent-onboard',
    version: VERSION,
    release_line: PUBLIC_RELEASE_CONTRACT.release_line,
    command: 'agent-onboard target onboarding --trial',
    command_family: 'target onboarding',
    mode: 'trial',
    target: { name, kind, root: absoluteTargetRoot },
    writes_performed: false,
    ready_for_explicit_write: ready,
    trial_outcome: ready ? 'ready_for_explicit_write' : 'blocked_by_existing_non_identical_files',
    planned_writes: summarizePlan(plannedWrites),
    conflicts: conflicts.map((item) => item.path),
    non_canonical_planned_writes: nonCanonical.map((item) => item.path),
    observed: {
      target_exists: fs.existsSync(absoluteTargetRoot),
      target_is_directory: fs.existsSync(absoluteTargetRoot) && fs.statSync(absoluteTargetRoot).isDirectory(),
      surface_plan_status: surfacePlan ? surfacePlan.status : 'not_run',
      dry_run_fixture_status: fixture ? fixture.status : 'not_run',
      planned_canonical_file_count: plannedWrites.length,
      conflict_count: conflicts.length
    },
    validated: {
      target_path_readable: errors.length === 0,
      target_onboarding_plan: surfacePlan ? surfacePlan.status === 'ok' : false,
      target_onboarding_fixture: fixture ? fixture.status === 'ok' : false,
      trial_writes_no_files: true,
      planned_writes_are_canonical_only: nonCanonical.length === 0,
      conflicts_reported_before_write: true
    },
    boundary: {
      writes_files: false,
      writes_target_repository_state: false,
      explicit_write_still_requires_target_onboarding_write: true,
      git_mutation: false,
      installs_dependencies: false,
      runs_package_manager: false,
      runs_build_test_deploy: false,
      publishes_or_pushes: false,
      mutates_registry: false
    },
    next_steps: ready ? [
      'operator may run target onboarding --write only after explicit owner authorization',
      'run guard --check-boundary after canonical onboarding files exist',
      'record changed files and checks in the handoff if the trial proceeds to write'
    ] : [
      'inspect conflicts before writing',
      'merge existing target files manually or rerun the explicit write with --force only when the owner authorizes replacement'
    ],
    errors
  };
}

function publicTargetOnboardingRealTargetRepoTrial(root = packageRoot()) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-onboard-real-target-trial-'));
  let cleanedUp = false;
  const errors = [];
  let trial = null;
  try {
    fs.writeFileSync(path.join(tempRoot, 'package.json'), stableJson({ name: 'real-target-trial-fixture', private: true }));
    fs.writeFileSync(path.join(tempRoot, 'README.md'), '# Real target trial fixture\n');
    fs.mkdirSync(path.join(tempRoot, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tempRoot, 'src', 'index.js'), '\'use strict\';\n');
    trial = targetOnboardingRealTargetTrial(tempRoot);
    if (!trial || trial.status !== 'ok') errors.push('real target trial command must return ok for the realistic fixture target');
    if (!trial || trial.ready_for_explicit_write !== true) errors.push('real target trial fixture must be ready for explicit write');
    if (!trial || trial.writes_performed !== false) errors.push('real target trial must not write files');
    const canonical = TARGET_ONBOARDING_SURFACE_PLAN.canonical_files.slice().sort();
    const planned = trial ? trial.planned_writes.map((item) => item.path).sort() : [];
    if (!arrayEquals(planned, canonical)) errors.push(`real target trial must project canonical files ${canonical.join(', ')}`);
    for (const rel of canonical) {
      if (fs.existsSync(path.join(tempRoot, rel))) errors.push(`real target trial unexpectedly wrote ${rel}`);
    }
  } catch (error) {
    errors.push(error && error.message ? error.message : String(error));
  } finally {
    try {
      fs.rmSync(tempRoot, { recursive: true, force: true });
      cleanedUp = !fs.existsSync(tempRoot);
    } catch (error) {
      cleanedUp = false;
      errors.push(error && error.message ? error.message : String(error));
    }
  }
  if (!cleanedUp) errors.push('temporary real target trial fixture was not cleaned up');

  return {
    schema: 'agent-onboard-public-target-onboarding-real-target-repo-trial-gate-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: PUBLIC_RELEASE_CONTRACT.package_name,
    version: VERSION,
    release_line: PUBLIC_RELEASE_CONTRACT.release_line,
    contract_schema: PUBLIC_RELEASE_CONTRACT.schema,
    command: PUBLIC_RELEASE_CONTRACT.real_target_trial_command,
    package_root: root,
    source_context: sourceContext(root),
    observed: {
      temporary_target_root: tempRoot,
      temporary_target_cleanup: cleanedUp,
      trial_status: trial ? trial.status : 'not_run',
      trial_ready_for_explicit_write: trial ? trial.ready_for_explicit_write : false,
      trial_conflicts: trial ? trial.conflicts : []
    },
    validated: {
      realistic_target_fixture_created: true,
      target_onboarding_trial_status: trial ? trial.status === 'ok' : false,
      target_ready_for_explicit_write: trial ? trial.ready_for_explicit_write === true : false,
      canonical_files_projected_only: trial ? trial.non_canonical_planned_writes.length === 0 : false,
      trial_writes_no_files: trial ? trial.writes_performed === false : false,
      temporary_target_cleanup: cleanedUp
    },
    boundary: {
      writes_package_root: false,
      writes_target_repository_state: false,
      creates_temp_target_repository: true,
      cleans_up_temp_target_repository: cleanedUp,
      git_mutation: false,
      installs_dependencies: false,
      runs_package_manager: false,
      runs_build_test_deploy: false,
      publishes_package: false,
      mutates_registry: false
    },
    target_trial_command: 'agent-onboard target onboarding --trial --target <target-repo-path>',
    next_candidate_gate: {
      title: 'Public architecture map gate',
      intent: 'Declare the public architecture kernel before source code is physically partitioned.'
    },
    errors
  };
}

function targetOnboardingSurfacePlan(cwd = process.cwd()) {
  const [name, kind] = targetName(cwd);
  const plannedFiles = targetOnboardingWriteSet(cwd).map((item) => ({
    path: item.path,
    kind: item.kind,
    already_exists: fs.existsSync(path.join(cwd, item.path)),
    schema: item.schema || null
  }));
  return {
    schema: TARGET_ONBOARDING_SURFACE_PLAN.schema,
    status: 'ok',
    package_name: TARGET_ONBOARDING_SURFACE_PLAN.package_name,
    version: VERSION,
    release_line: TARGET_ONBOARDING_SURFACE_PLAN.release_line,
    command: TARGET_ONBOARDING_SURFACE_PLAN.command,
    target: { name, kind, root: '.' },
    canonical_files: TARGET_ONBOARDING_SURFACE_PLAN.canonical_files.slice(),
    phases: TARGET_ONBOARDING_SURFACE_PLAN.phases,
    planned_files: plannedFiles,
    boundary: TARGET_ONBOARDING_SURFACE_PLAN.boundary,
    next_candidate_gate: TARGET_ONBOARDING_SURFACE_PLAN.next_candidate_gate
  };
}

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
2. \`llms.txt\`
3. \`.agent-onboard/authority-path.json\`
4. \`agent-onboard.target.json\`
5. \`.agent-onboard/project.json\`
6. \`.agent-onboard/work-items.json\`

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
npx agent-onboard@${VERSION} authority --first-read

# then inspect the public work-item ledger
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


function firstReadOrder() {
  return PUBLIC_AUTHORITY_FIRST_READ_INDEX.read_order.map((entry) => ({
    order: entry.order,
    path: entry.path,
    role: entry.role,
    required_when_present: entry.required_when_present
  }));
}

function llmsTxtTemplate(cwd = process.cwd()) {
  const [name, kind] = targetName(cwd);
  return `# ${name} agent-onboard first-read entrypoint

This repository uses agent-onboard public authority ordering for human and AI-assisted work.

Target:

- name: ${name}
- kind: ${kind}
- control package: agent-onboard@${VERSION}

First-read order:

1. AGENTS.md Ã¢â‚¬â€ human and agent operating rules.
2. llms.txt Ã¢â‚¬â€ AI-readable public entrypoint.
3. .agent-onboard/authority-path.json Ã¢â‚¬â€ machine-readable authority path index.
4. agent-onboard.target.json Ã¢â‚¬â€ target boundary declaration.
5. .agent-onboard/runtime-namespace.json Ã¢â‚¬â€ target runtime namespace declaration.
6. .agent-onboard/project.json Ã¢â‚¬â€ target runtime identity.
7. .agent-onboard/work-items.json Ã¢â‚¬â€ public work item ledger.
8. README.md Ã¢â‚¬â€ public package or repository documentation.
9. Raw evidence/source files Ã¢â‚¬â€ on demand only after the authority files above.

Default boundary: start read-only. Do not install dependencies, run builds/tests/deploys, publish, push, or overwrite non-identical files unless the repository owner explicitly authorizes that action.
`;
}

function authorityPathTemplate(cwd = process.cwd()) {
  const [name, kind] = targetName(cwd);
  return {
    schema: 'agent-onboard-authority-path-001',
    package_name: 'agent-onboard',
    package_version: VERSION,
    release_line: PUBLIC_AUTHORITY_FIRST_READ_INDEX.release_line,
    target: { name, root: '.', kind },
    command: PUBLIC_AUTHORITY_FIRST_READ_INDEX.command,
    check_command: PUBLIC_AUTHORITY_FIRST_READ_INDEX.check_command,
    first_read_order: firstReadOrder(),
    canonical_authority_files: PUBLIC_AUTHORITY_FIRST_READ_INDEX.source_files.slice(),
    boundary: {
      start_mode: 'read_only_preview',
      writes_require_explicit_owner_authorization: true,
      dependency_install_requires_owner_authorization: true,
      build_test_deploy_requires_owner_authorization: true,
      publish_push_requires_owner_authorization: true,
      raw_evidence_is_on_demand_only: true
    }
  };
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
        '.agent-onboard/runtime-namespace.json',
        '.agent-onboard/project.json',
        '.agent-onboard/work-items.json',
        'AGENTS.md',
        'llms.txt',
        '.agent-onboard/authority-path.json'
      ],
      exclude: ['node_modules', '.git', 'dist', 'build', '.venv', '.lake']
    }
  };
}

function targetRuntimeNamespaceTemplate(cwd = process.cwd()) {
  const [name, kind] = targetName(cwd);
  return {
    schema: 'agent-onboard-target-runtime-namespace-001',
    package_name: 'agent-onboard',
    package_version: VERSION,
    release_line: PUBLIC_TARGET_RUNTIME_NAMESPACE.release_line,
    target: { name, root: '.', kind },
    command: PUBLIC_TARGET_RUNTIME_NAMESPACE.command,
    check_command: PUBLIC_TARGET_RUNTIME_NAMESPACE.check_command,
    namespace_root: PUBLIC_TARGET_RUNTIME_NAMESPACE.namespace_root,
    namespace_file: PUBLIC_TARGET_RUNTIME_NAMESPACE.namespace_file,
    canonical_runtime_files: PUBLIC_TARGET_RUNTIME_NAMESPACE.canonical_runtime_files.map((entry) => ({
      path: entry.path,
      domain: entry.domain,
      role: entry.role,
      kind: entry.kind,
      required: entry.required,
      written_by: entry.written_by
    })),
    top_level_authority_files: PUBLIC_TARGET_RUNTIME_NAMESPACE.top_level_authority_files.slice(),
    reserved_future_files: PUBLIC_TARGET_RUNTIME_NAMESPACE.reserved_future_files.map((entry) => ({
      path: entry.path,
      domain: entry.domain,
      status: entry.status
    })),
    boundary: {
      writes_require_explicit_write_flag: true,
      reserved_future_files_not_written_by_target_onboarding: true,
      dependency_install_requires_owner_authorization: true,
      build_test_deploy_requires_owner_authorization: true,
      publish_push_requires_owner_authorization: true
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
    ['.agent-onboard/runtime-namespace.json', targetRuntimeNamespaceTemplate(cwd)],
    ['.agent-onboard/project.json', runtimeProjectTemplate(cwd)],
    ['.agent-onboard/work-items.json', workItemsTemplate()]
  ];
}

function targetOnboardingWriteSet(cwd = process.cwd()) {
  return [
    {
      path: 'agent-onboard.target.json',
      kind: 'json',
      schema: 'agent-onboard-target-config-001',
      value: targetConfigTemplate(cwd)
    },
    {
      path: '.agent-onboard/runtime-namespace.json',
      kind: 'json',
      schema: 'agent-onboard-target-runtime-namespace-001',
      value: targetRuntimeNamespaceTemplate(cwd)
    },
    {
      path: '.agent-onboard/project.json',
      kind: 'json',
      schema: 'agent-onboard-target-runtime-project-001',
      value: runtimeProjectTemplate(cwd)
    },
    {
      path: '.agent-onboard/work-items.json',
      kind: 'json',
      schema: 'agent-onboard-target-work-items-001',
      value: workItemsTemplate()
    },
    {
      path: 'AGENTS.md',
      kind: 'text',
      schema: null,
      content: agentsMdTemplate(cwd)
    },
    {
      path: 'llms.txt',
      kind: 'text',
      schema: null,
      content: llmsTxtTemplate(cwd)
    },
    {
      path: '.agent-onboard/authority-path.json',
      kind: 'json',
      schema: 'agent-onboard-authority-path-001',
      value: authorityPathTemplate(cwd)
    }
  ];
}

function planTargetOnboardingWritesForRoot(root, options = {}) {
  const force = options.force === true;
  return targetOnboardingWriteSet(root).map((entry) => {
    const absolutePath = path.join(root, entry.path);
    const desired = entry.kind === 'json' ? stableJson(entry.value) : entry.content;
    const exists = fs.existsSync(absolutePath);
    const current = exists ? fs.readFileSync(absolutePath, 'utf8') : null;
    const identical = exists && current === desired;
    const conflict = exists && !identical && !force;
    let action = 'create';
    if (identical) action = 'keep';
    else if (exists && force) action = 'overwrite';
    else if (conflict) action = 'conflict';
    return {
      path: entry.path,
      kind: entry.kind,
      schema: entry.schema,
      exists,
      action,
      safe_to_write: action !== 'conflict',
      value: entry.value,
      content: entry.content
    };
  });
}

function planTargetOnboardingWrites(options = {}) {
  return planTargetOnboardingWritesForRoot(process.cwd(), options);
}

function performTargetOnboardingWrites(plannedWrites, root = process.cwd()) {
  for (const item of plannedWrites) {
    if (item.action !== 'create' && item.action !== 'overwrite') continue;
    const absolutePath = path.join(root, item.path);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    if (item.kind === 'json') fs.writeFileSync(absolutePath, stableJson(item.value));
    else fs.writeFileSync(absolutePath, item.content);
  }
}

function planWritesForRoot(root, writeSet, options = {}) {
  const force = options.force === true;
  return writeSet.map(([relativePath, value]) => {
    const absolutePath = path.join(root, relativePath);
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

function planWrites(writeSet, options = {}) {
  return planWritesForRoot(process.cwd(), writeSet, options);
}

function performPlannedWrites(plannedWrites) {
  for (const item of plannedWrites) {
    if (item.action === 'create' || item.action === 'overwrite') {
      writeJson(path.join(process.cwd(), item.path), item.value);
    }
  }
}

function planTextWritesForRoot(root, writeSet, options = {}) {
  const force = options.force === true;
  return writeSet.map(([relativePath, content]) => {
    const absolutePath = path.join(root, relativePath);
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

function planTextWrites(writeSet, options = {}) {
  return planTextWritesForRoot(process.cwd(), writeSet, options);
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
  return Object.freeze({
    json,
    readJson,
    stableJson,
    writeJson,
    isPlainObject,
    validateJsonSchema,
    validateTargetConfig,
    validateWorkItems,
    workItemCounts,
    parseOption,
    parseRepeatedOption,
    cloneJson,
    uniqueIdErrors,
    validateWorkItemsGraph,
    validateWorkItemsDocument,
    deriveWorkItemIds,
    appendWorkItemDryRun,
    participationLifecycleNextSteps,
    claimWorkItemDryRun,
    handoffEvidenceChecklist,
    closeWorkItemDryRun,
    getPathValue,
    evaluateTargetBoundaryConfig,
    noMutationBoundary,
    guardResultBase,
    targetOnboardingDryRunFixture,
    targetOnboardingRealTargetTrial,
    publicTargetOnboardingRealTargetRepoTrial,
    targetOnboardingSurfacePlan,
    agentsMdTemplate,
    firstReadOrder,
    llmsTxtTemplate,
    authorityPathTemplate,
    targetName,
    targetConfigTemplate,
    targetRuntimeNamespaceTemplate,
    runtimeProjectTemplate,
    workItemsTemplate,
    initWriteSet,
    targetOnboardingWriteSet,
    planTargetOnboardingWritesForRoot,
    planTargetOnboardingWrites,
    performTargetOnboardingWrites,
    planWritesForRoot,
    planWrites,
    performPlannedWrites,
    planTextWritesForRoot,
    planTextWrites,
    performPlannedTextWrites,
    summarizePlan
  });
}

module.exports = {
  createTargetRuntimeService
};
