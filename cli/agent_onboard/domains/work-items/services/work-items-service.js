'use strict';

const fs = require('fs');
const path = require('path');

const WORK_ITEMS_SERVICE_SEED = Object.freeze({
  schema: 'agent-onboard-public-work-items-runtime-service-seed-001',
  package_name: 'agent-onboard',
  role: 'packaged_runtime_work_items_domain_service_seed',
  service_path: 'cli/agent_onboard/domains/work-items/services/work-items-service.js',
  owned_read_only_commands: Object.freeze([
    'work-items --schema',
    'work-items --template',
    'work-items --validate-template',
    'work-items --list',
    'work-items --validate'
  ]),
  owned_write_boundary_commands: Object.freeze([
    'work-items --init',
    'work-items --append',
    'work-items --claim',
    'work-items --close'
  ]),
  fallback_commands: Object.freeze([]),
  boundary: Object.freeze({
    packaged_in_npm_tarball_in_this_gate: true,
    no_side_effect_on_require: true,
    no_file_writes_on_require: true,
    no_network: true,
    no_process_exit: true,
    no_dynamic_eval: true,
    no_child_process: true,
    init_append_commands_write_only_under_explicit_write: true,
    claim_close_commands_write_only_under_explicit_write: true,
    no_legacy_work_items_fallback_commands: true
  })
});

function describeWorkItemsServiceSeed() {
  return WORK_ITEMS_SERVICE_SEED;
}

function defaultJson(payload) {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

function defaultReadJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function defaultCounts(value) {
  return {
    programs: Array.isArray(value.programs) ? value.programs.length : 0,
    stages: Array.isArray(value.stages) ? value.stages.length : 0,
    milestones: Array.isArray(value.milestones) ? value.milestones.length : 0,
    work_items: Array.isArray(value.work_items) ? value.work_items.length : 0
  };
}

function defaultWorkItemsSchema() {
  return Object.freeze({});
}

function defaultWorkItemsTemplate() {
  return Object.freeze({});
}

function defaultAppendWorkItemDryRun() {
  throw new Error('work-items --append requires an append planner');
}

function defaultClaimWorkItemDryRun() {
  throw new Error('work-items --claim requires a claim planner');
}

function defaultCloseWorkItemDryRun() {
  throw new Error('work-items --close requires a close planner');
}

function fileAfterFlag(args, flag, fallback) {
  const index = args.indexOf(flag);
  const value = args[index + 1];
  return value && !value.startsWith('-') ? value : fallback;
}

function optionAfterFlag(args, flag) {
  const index = args.indexOf(flag);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith('-')) throw new Error(`${flag} requires a value`);
  return value;
}

function repeatedOptionsAfterFlag(args, flag) {
  const values = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] !== flag) continue;
    const value = args[index + 1];
    if (!value || value.startsWith('-')) throw new Error(`${flag} requires a value`);
    values.push(value);
    index += 1;
  }
  return values;
}

function createWorkItemsService(options = Object.freeze({})) {
  const cwd = typeof options.cwd === 'function' ? options.cwd : () => process.cwd();
  const emit = typeof options.emit === 'function' ? options.emit : defaultJson;
  const readJson = typeof options.readJson === 'function' ? options.readJson : defaultReadJson;
  const validateWorkItems = typeof options.validateWorkItems === 'function' ? options.validateWorkItems : () => [];
  const workItemCounts = typeof options.workItemCounts === 'function' ? options.workItemCounts : defaultCounts;
  const workItemsSchema = typeof options.workItemsSchema === 'function' ? options.workItemsSchema : defaultWorkItemsSchema;
  const workItemsTemplate = typeof options.workItemsTemplate === 'function' ? options.workItemsTemplate : defaultWorkItemsTemplate;
  const appendWorkItemDryRun = typeof options.appendWorkItemDryRun === 'function' ? options.appendWorkItemDryRun : defaultAppendWorkItemDryRun;
  const claimWorkItemDryRun = typeof options.claimWorkItemDryRun === 'function' ? options.claimWorkItemDryRun : defaultClaimWorkItemDryRun;
  const closeWorkItemDryRun = typeof options.closeWorkItemDryRun === 'function' ? options.closeWorkItemDryRun : defaultCloseWorkItemDryRun;
  const planWrites = typeof options.planWrites === 'function' ? options.planWrites : () => [];
  const performPlannedWrites = typeof options.performPlannedWrites === 'function' ? options.performPlannedWrites : () => {};
  const summarizePlan = typeof options.summarizePlan === 'function' ? options.summarizePlan : (plannedWrites) => plannedWrites;
  const writeJson = typeof options.writeJson === 'function' ? options.writeJson : (file, value) => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
  };
  const exists = typeof options.exists === 'function' ? options.exists : fs.existsSync;

  function append(args) {
    const dry = args.includes('--dry-run');
    const write = args.includes('--write');
    if (!write && !dry) throw new Error('work-items --append requires --dry-run or --write');
    if (write && dry) throw new Error('work-items --append accepts only one of --dry-run or --write');

    const mode = write ? 'write' : 'dry-run';
    const command = `agent-onboard work-items --append --${mode}`;
    const file = optionAfterFlag(args, '--file') || '.agent-onboard/work-items.json';
    const absolutePath = path.resolve(cwd(), file);
    if (!exists(absolutePath)) {
      emit({
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
      emit({
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
        id: optionAfterFlag(args, '--id'),
        title: optionAfterFlag(args, '--title'),
        program_title: optionAfterFlag(args, '--program-title'),
        stage_title: optionAfterFlag(args, '--stage-title'),
        milestone_title: optionAfterFlag(args, '--milestone-title')
      });
    } catch (error) {
      emit({
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
    emit({
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

  function init(args) {
    const write = args.includes('--write');
    const dry = args.includes('--dry-run');
    const force = args.includes('--force');
    if (!write && !dry) throw new Error('work-items --init requires --dry-run or --write');
    if (write && dry) throw new Error('work-items --init accepts only one of --dry-run or --write');

    const templateValue = workItemsTemplate();
    const plannedWrites = planWrites([['.agent-onboard/work-items.json', templateValue]], { force });
    const conflicts = plannedWrites.filter((item) => item.action === 'conflict');
    const errors = validateWorkItems(templateValue);
    const ok = conflicts.length === 0 && errors.length === 0;

    if (write && ok) performPlannedWrites(plannedWrites);

    emit({
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
      counts: workItemCounts(templateValue),
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

  function claim(args) {
    const dry = args.includes('--dry-run');
    const write = args.includes('--write');
    if (!write && !dry) throw new Error('work-items --claim requires --dry-run or --write');
    if (write && dry) throw new Error('work-items --claim accepts only one of --dry-run or --write');

    const mode = write ? 'write' : 'dry-run';
    const command = `agent-onboard work-items --claim --${mode}`;
    const file = optionAfterFlag(args, '--file') || '.agent-onboard/work-items.json';
    const absolutePath = path.resolve(cwd(), file);
    if (!exists(absolutePath)) {
      emit({
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
      emit({
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
        id: optionAfterFlag(args, '--id'),
        actor: optionAfterFlag(args, '--actor'),
        claimed_at: optionAfterFlag(args, '--claimed-at'),
        note: optionAfterFlag(args, '--note')
      });
    } catch (error) {
      emit({
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
    emit({
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

  function close(args) {
    const dry = args.includes('--dry-run');
    const write = args.includes('--write');
    if (!write && !dry) throw new Error('work-items --close requires --dry-run or --write');
    if (write && dry) throw new Error('work-items --close accepts only one of --dry-run or --write');

    const mode = write ? 'write' : 'dry-run';
    const command = `agent-onboard work-items --close --${mode}`;
    const file = optionAfterFlag(args, '--file') || '.agent-onboard/work-items.json';
    const absolutePath = path.resolve(cwd(), file);
    if (!exists(absolutePath)) {
      emit({
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
      emit({
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
        id: optionAfterFlag(args, '--id'),
        actor: optionAfterFlag(args, '--actor'),
        closed_at: optionAfterFlag(args, '--closed-at'),
        summary: optionAfterFlag(args, '--summary'),
        changed_files: repeatedOptionsAfterFlag(args, '--changed-file'),
        checks_run: repeatedOptionsAfterFlag(args, '--check'),
        checks_not_run: repeatedOptionsAfterFlag(args, '--check-not-run'),
        known_non_pass: repeatedOptionsAfterFlag(args, '--known-non-pass')
      });
    } catch (error) {
      emit({
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
    emit({
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

  function schema() {
    emit({
      schema: 'agent-onboard-work-items-schema-response-001',
      status: 'ok',
      work_items_schema: workItemsSchema()
    });
    return 0;
  }

  function template() {
    emit({
      schema: 'agent-onboard-work-items-template-response-001',
      status: 'ok',
      canonical_file: '.agent-onboard/work-items.json',
      work_items: workItemsTemplate()
    });
    return 0;
  }

  function validateTemplate() {
    const errors = validateWorkItems(workItemsTemplate());
    const ok = errors.length === 0;
    emit({
      schema: 'agent-onboard-work-items-template-validation-001',
      status: ok ? 'ok' : 'error',
      template_source: 'embedded',
      canonical_file: '.agent-onboard/work-items.json',
      validated: true,
      errors
    });
    return ok ? 0 : 1;
  }

  function validate(args) {
    const file = fileAfterFlag(args, '--validate', '.agent-onboard/work-items.json');
    const value = readJson(path.resolve(cwd(), file));
    const errors = validateWorkItems(value);
    const ok = errors.length === 0;
    emit({
      schema: 'agent-onboard-work-items-file-validation-001',
      status: ok ? 'ok' : 'error',
      file,
      validated: true,
      counts: workItemCounts(value),
      errors
    });
    return ok ? 0 : 1;
  }

  function list(args) {
    const file = fileAfterFlag(args, '--list', '.agent-onboard/work-items.json');
    const absolutePath = path.resolve(cwd(), file);
    if (!exists(absolutePath)) {
      emit({
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
    emit({
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

  return Object.freeze({
    instance_schema: 'agent-onboard-public-work-items-runtime-service-instance-001',
    seed: WORK_ITEMS_SERVICE_SEED,
    init,
    append,
    claim,
    close,
    schema: schema,
    template,
    validateTemplate,
    validate,
    list
  });
}

module.exports = Object.freeze({
  WORK_ITEMS_SERVICE_SEED,
  describeWorkItemsServiceSeed,
  createWorkItemsService
});
