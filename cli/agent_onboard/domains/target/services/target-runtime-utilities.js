'use strict';

const fs = require('fs');
const path = require('path');

function createTargetRuntimeUtilities(deps) {
  const {
    version: VERSION,
    targetConfigFile: TARGET_CONFIG_FILE,
    targetConfigSchema: TARGET_CONFIG_SCHEMA,
    workItemsSchema: WORK_ITEMS_SCHEMA,
    boundaryGuardContract: BOUNDARY_GUARD_CONTRACT
  } = deps;

  for (const [name, value] of Object.entries({
    VERSION,
    TARGET_CONFIG_FILE,
    TARGET_CONFIG_SCHEMA,
    WORK_ITEMS_SCHEMA,
    BOUNDARY_GUARD_CONTRACT
  })) {
    if (value === undefined || value === null) throw new Error(`createTargetRuntimeUtilities missing dependency: ${name}`);
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
    guardResultBase
  });
}

module.exports = {
  createTargetRuntimeUtilities
};