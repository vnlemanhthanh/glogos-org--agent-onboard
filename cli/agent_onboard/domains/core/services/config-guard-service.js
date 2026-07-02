'use strict';

const CONFIG_GUARD_SERVICE_SEED = Object.freeze({
  schema: 'agent-onboard-public-core-config-guard-service-seed-001',
  package_name: 'agent-onboard',
  domain_id: 'core_config_guard',
  service_id: 'config_guard',
  role: 'packaged_runtime_core_config_guard_service',
  planned_service_path: 'cli/agent_onboard/domains/core/services/config-guard-service.js',
  owned_commands: Object.freeze(['guard --plan', 'guard --check-boundary']),
  consumed_target_contracts: Object.freeze([
    'agent-onboard.target.json',
    'agent-onboard-target-config-001',
    'agent-onboard-public-boundary-guard-enforcement-seed-contract-001'
  ]),
  boundary: Object.freeze({
    packaged_in_npm_tarball_in_this_gate: true,
    no_side_effect_on_require: true,
    no_file_writes: true,
    no_network: true,
    no_process_exit: true,
    no_dynamic_eval: true,
    no_child_process: true,
    target_config_reads_only_for_check_boundary: true
  })
});

function describeConfigGuardServiceSeed() {
  return CONFIG_GUARD_SERVICE_SEED;
}

function createCoreConfigGuardService(options = Object.freeze({})) {
  const emit = typeof options.emit === 'function' ? options.emit : () => {};
  const cwd = typeof options.cwd === 'function' ? options.cwd : () => process.cwd();
  const path = options.path;
  const exists = typeof options.exists === 'function' ? options.exists : () => false;
  const readJson = typeof options.readJson === 'function' ? options.readJson : () => {
    throw new Error('readJson dependency is required for guard --check-boundary');
  };
  const validateTargetConfig = typeof options.validateTargetConfig === 'function' ? options.validateTargetConfig : () => ['missing validateTargetConfig dependency'];
  const evaluateTargetBoundaryConfig = typeof options.evaluateTargetBoundaryConfig === 'function' ? options.evaluateTargetBoundaryConfig : () => [];
  const noMutationBoundary = typeof options.noMutationBoundary === 'function' ? options.noMutationBoundary : () => Object.freeze({ writes_files: false });
  const guardResultBase = typeof options.guardResultBase === 'function' ? options.guardResultBase : () => Object.freeze({});
  const targetConfigFile = typeof options.targetConfigFile === 'string' && options.targetConfigFile ? options.targetConfigFile : 'agent-onboard.target.json';
  const boundaryGuardContract = options.boundaryGuardContract && typeof options.boundaryGuardContract === 'object'
    ? options.boundaryGuardContract
    : Object.freeze({ enforcement_mode: 'read_only_dry_run', required_target_config_values: Object.freeze({}), forbidden_true_boundary_fields: Object.freeze([]) });

  function runGuard(args = []) {
    if (args.length === 1 && args[0] === '--plan') {
      emit({
        schema: 'agent-onboard-guard-plan-001',
        status: 'ok',
        command_family: 'guard',
        command: 'agent-onboard guard --plan',
        admitted_command: 'agent-onboard guard --check-boundary',
        canonical_config_file: targetConfigFile,
        enforcement_mode: boundaryGuardContract.enforcement_mode,
        required_target_config_values: boundaryGuardContract.required_target_config_values,
        forbidden_true_boundary_fields: boundaryGuardContract.forbidden_true_boundary_fields,
        reads_target_config: false,
        ...noMutationBoundary()
      });
      return 0;
    }
    if (args.length !== 1 || args[0] !== '--check-boundary') {
      emit({
        schema: 'agent-onboard-guard-command-error-001',
        status: 'error',
        command_family: 'guard',
        message: 'guard requires --plan or --check-boundary',
        ...noMutationBoundary()
      });
      return 1;
    }

    const configPath = path.join(cwd(), targetConfigFile);
    if (!exists(configPath)) {
      emit({
        ...guardResultBase(),
        status: 'blocked',
        reason: 'missing agent-onboard.target.json in current target repo root',
        reads_target_config: false,
        blocked_violation_count: 1,
        violations: [{ path: targetConfigFile, expected: 'present', actual: 'missing' }],
        blocks_declared_violation: true
      });
      return 2;
    }

    let config;
    try {
      config = readJson(configPath);
    } catch (error) {
      emit({
        ...guardResultBase(),
        status: 'blocked',
        reason: 'invalid JSON in agent-onboard.target.json',
        detail: error && error.message ? error.message : String(error),
        reads_target_config: true,
        blocked_violation_count: 1,
        violations: [{ path: targetConfigFile, expected: 'valid JSON', actual: 'invalid JSON' }],
        blocks_declared_violation: true
      });
      return 2;
    }

    const schemaErrors = validateTargetConfig(config);
    const schemaViolations = schemaErrors.map((message) => ({ path: 'schema-validation', expected: 'valid agent-onboard-target-config-001', actual: message }));
    const boundaryViolations = evaluateTargetBoundaryConfig(config);
    const violations = [...schemaViolations, ...boundaryViolations];
    const passed = violations.length === 0;
    emit({
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

  return Object.freeze({
    schema: 'agent-onboard-public-core-config-guard-service-instance-001',
    seed: CONFIG_GUARD_SERVICE_SEED,
    runGuard
  });
}

module.exports = Object.freeze({
  CONFIG_GUARD_SERVICE_SEED,
  describeConfigGuardServiceSeed,
  createCoreConfigGuardService
});
