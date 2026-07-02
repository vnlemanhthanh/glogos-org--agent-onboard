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
  fallback_commands: Object.freeze([
    'work-items --init',
    'work-items --append',
    'work-items --claim',
    'work-items --close'
  ]),
  boundary: Object.freeze({
    packaged_in_npm_tarball_in_this_gate: true,
    no_side_effect_on_require: true,
    no_file_writes: true,
    no_network: true,
    no_process_exit: true,
    no_dynamic_eval: true,
    no_child_process: true,
    write_capable_work_items_commands_remain_legacy_fallback: true
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

function fileAfterFlag(args, flag, fallback) {
  const index = args.indexOf(flag);
  const value = args[index + 1];
  return value && !value.startsWith('-') ? value : fallback;
}

function createWorkItemsService(options = Object.freeze({})) {
  const cwd = typeof options.cwd === 'function' ? options.cwd : () => process.cwd();
  const emit = typeof options.emit === 'function' ? options.emit : defaultJson;
  const readJson = typeof options.readJson === 'function' ? options.readJson : defaultReadJson;
  const validateWorkItems = typeof options.validateWorkItems === 'function' ? options.validateWorkItems : () => [];
  const workItemCounts = typeof options.workItemCounts === 'function' ? options.workItemCounts : defaultCounts;
  const workItemsSchema = typeof options.workItemsSchema === 'function' ? options.workItemsSchema : defaultWorkItemsSchema;
  const workItemsTemplate = typeof options.workItemsTemplate === 'function' ? options.workItemsTemplate : defaultWorkItemsTemplate;
  const exists = typeof options.exists === 'function' ? options.exists : fs.existsSync;

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
