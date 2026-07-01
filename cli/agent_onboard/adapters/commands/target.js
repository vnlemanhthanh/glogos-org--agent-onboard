'use strict';

const TARGET_COMMAND_ADAPTER_EXTRACTION = Object.freeze({
  schema: 'agent-onboard-public-target-command-adapter-extraction-module-001',
  package_name: 'agent-onboard',
  role: 'packaged_runtime_target_command_adapter',
  planned_adapter_path: 'cli/agent_onboard/adapters/commands/target.js',
  compatibility_port_group: 'target',
  owned_top_level_commands: Object.freeze(['init', 'target-config', 'target', 'target-instance']),
  excluded_top_level_commands: Object.freeze(['help', 'version', 'status', 'architecture', 'release', 'authority', 'work-items', 'agents', 'guard']),
  output_contract: Object.freeze({
    init: 'delegates to packaged CLI init command through injected bundled handler',
    target_config: 'delegates to packaged CLI target-config command through injected bundled handler',
    target: 'delegates to packaged CLI target command family through injected bundled handler',
    target_instance: 'delegates to packaged CLI target-instance command family through injected bundled handler'
  }),
  boundary: Object.freeze({
    used_by_runtime_entrypoint_in_this_gate: true,
    packaged_in_npm_tarball_in_this_gate: true,
    no_side_effect_on_require: true,
    no_file_writes_on_require: true,
    no_network: true,
    no_process_exit: true,
    no_dynamic_eval: true,
    no_child_process: true
  })
});

function describeTargetCommandAdapterExtraction() {
  return TARGET_COMMAND_ADAPTER_EXTRACTION;
}

function createTargetCommandAdapter(options = Object.freeze({})) {
  const handlers = options.handlers && typeof options.handlers === 'object' ? options.handlers : Object.freeze({});
  return Object.freeze({
    schema: 'agent-onboard-public-target-command-adapter-instance-001',
    adapter: TARGET_COMMAND_ADAPTER_EXTRACTION,
    commands: TARGET_COMMAND_ADAPTER_EXTRACTION.owned_top_level_commands,
    target(argv) {
      const command = Array.isArray(argv) ? (argv[2] || 'target') : 'target';
      if (typeof handlers[command] === 'function') return handlers[command](Array.isArray(argv) ? argv.slice(3) : []);
      return Object.freeze({
        schema: 'agent-onboard-public-target-command-adapter-target-result-001',
        status: 'source_only_seed',
        writes_files: false,
        publishes_package: false,
        mutates_registry: false
      });
    },
    run(argv) {
      const command = Array.isArray(argv) ? (argv[2] || 'help') : 'help';
      if (TARGET_COMMAND_ADAPTER_EXTRACTION.owned_top_level_commands.includes(command)) return this.target(argv);
      return Object.freeze({
        schema: 'agent-onboard-public-target-command-adapter-run-result-001',
        status: 'unhandled_source_only_target_adapter',
        command,
        writes_files: false,
        publishes_package: false,
        mutates_registry: false
      });
    }
  });
}

module.exports = Object.freeze({
  TARGET_COMMAND_ADAPTER_EXTRACTION,
  describeTargetCommandAdapterExtraction,
  createTargetCommandAdapter
});
