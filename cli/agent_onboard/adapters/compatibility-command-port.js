'use strict';

const COMPATIBILITY_COMMAND_PORT_SEED = Object.freeze({
  schema: 'agent-onboard-public-compatibility-command-port-seed-module-001',
  package_name: 'agent-onboard',
  role: 'packaged_compatibility_command_port_seed',
  planned_adapter_path: 'cli/agent_onboard/adapters/compatibility-command-port.js',
  planned_port_path: 'cli/agent_onboard/ports/compatibility-command-port.js',
  dispatch_contract: 'router_calls_port_run_with_argv',
  group_contract: 'lazy_command_group_boundary_without_runtime_cutover',
  command_groups: Object.freeze({
    core: Object.freeze(['help', 'version', 'status']),
    architecture: Object.freeze(['architecture']),
    release_package: Object.freeze(['release']),
    onboarding: Object.freeze(['agents', 'guard']),
    target: Object.freeze(['init', 'target-config', 'target', 'target-instance']),
    work_items: Object.freeze(['work-items']),
    coordination: Object.freeze(['authority', 'work-items'])
  }),
  boundary: Object.freeze({
    used_by_runtime_entrypoint_in_this_gate: true,
    packaged_in_npm_tarball_in_this_gate: true,
    command_adapters_required_in_this_gate: true,
    adapter_delegation_expanded_in_this_gate: true,
    no_side_effect_on_require: true,
    no_file_writes: true,
    no_network: true,
    no_process_exit: true,
    no_dynamic_eval: true,
    no_child_process: true
  })
});

function describeCompatibilityCommandPortSeed() {
  return COMPATIBILITY_COMMAND_PORT_SEED;
}

function normalizeHandlers(handlers) {
  return handlers && typeof handlers === 'object' ? handlers : Object.freeze({});
}

function createCompatibilityCommandPort(handlers = Object.freeze({}), options = Object.freeze({})) {
  const registry = normalizeHandlers(handlers);
  const adapters = normalizeHandlers(options.adapters);
  return Object.freeze({
    schema: 'agent-onboard-public-compatibility-command-port-instance-001',
    seed: COMPATIBILITY_COMMAND_PORT_SEED,
    adapter_groups: Object.freeze({
      core: Object.freeze(['help', '--help', '-h', 'version', '--version', '-v', 'status']),
      architecture: Object.freeze(['architecture']),
      release_package: Object.freeze(['release']),
      authority: Object.freeze(['authority', 'agents', 'guard']),
      target: Object.freeze(['init', 'target-config', 'target', 'target-instance']),
      work_items: Object.freeze(['work-items'])
    }),
    delegated_commands: Object.freeze(Object.keys(adapters).sort()),
    run(argv) {
      if (!Array.isArray(argv)) {
        return Object.freeze({
          schema: 'agent-onboard-public-compatibility-command-port-run-result-001',
          status: 'error',
          reason: 'argv must be an array',
          writes_files: false
        });
      }
      const command = argv[2] || 'help';
      const adapter = adapters[command];
      if (adapter && typeof adapter.run === 'function') return adapter.run(argv);
      const handler = registry[command] || registry.default;
      if (typeof handler !== 'function') {
        return Object.freeze({
          schema: 'agent-onboard-public-compatibility-command-port-run-result-001',
          status: 'unhandled_source_only_seed',
          command,
          writes_files: false
        });
      }
      return handler(argv);
    }
  });
}

module.exports = Object.freeze({
  COMPATIBILITY_COMMAND_PORT_SEED,
  describeCompatibilityCommandPortSeed,
  createCompatibilityCommandPort
});
