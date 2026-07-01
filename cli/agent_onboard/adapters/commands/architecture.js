'use strict';

const ARCHITECTURE_COMMAND_ADAPTER_EXTRACTION = Object.freeze({
  schema: 'agent-onboard-public-architecture-command-adapter-extraction-module-001',
  package_name: 'agent-onboard',
  role: 'source_only_architecture_command_adapter_extraction',
  planned_adapter_path: 'cli/agent_onboard/adapters/commands/architecture.js',
  compatibility_port_group: 'architecture',
  owned_top_level_commands: Object.freeze(['architecture']),
  excluded_top_level_commands: Object.freeze(['help', 'version', 'status', 'release', 'authority', 'work-items', 'target', 'target-instance', 'init', 'agents', 'guard', 'target-config']),
  output_contract: Object.freeze({
    architecture: 'delegates to packaged CLI architecture command family during future runtime cutover; not used by runtime in this gate',
    map: 'architecture --map remains bundled CLI output until controlled source-module inclusion',
    check: 'architecture --check remains bundled CLI output until controlled source-module inclusion'
  }),
  boundary: Object.freeze({
    used_by_runtime_entrypoint_in_this_gate: false,
    packaged_in_npm_tarball_in_this_gate: false,
    no_side_effect_on_require: true,
    no_file_writes: true,
    no_network: true,
    no_process_exit: true,
    no_dynamic_eval: true,
    no_child_process: true
  })
});

function describeArchitectureCommandAdapterExtraction() {
  return ARCHITECTURE_COMMAND_ADAPTER_EXTRACTION;
}

function createArchitectureCommandAdapter() {
  return Object.freeze({
    schema: 'agent-onboard-public-architecture-command-adapter-instance-001',
    adapter: ARCHITECTURE_COMMAND_ADAPTER_EXTRACTION,
    commands: ARCHITECTURE_COMMAND_ADAPTER_EXTRACTION.owned_top_level_commands,
    architecture() {
      return Object.freeze({
        schema: 'agent-onboard-public-architecture-command-adapter-architecture-result-001',
        status: 'source_only_seed',
        writes_files: false,
        publishes_package: false,
        mutates_registry: false
      });
    },
    run(argv) {
      const command = Array.isArray(argv) ? (argv[2] || 'help') : 'help';
      if (command === 'architecture') return this.architecture();
      return Object.freeze({
        schema: 'agent-onboard-public-architecture-command-adapter-run-result-001',
        status: 'unhandled_source_only_architecture_adapter',
        command,
        writes_files: false,
        publishes_package: false,
        mutates_registry: false
      });
    }
  });
}

module.exports = Object.freeze({
  ARCHITECTURE_COMMAND_ADAPTER_EXTRACTION,
  describeArchitectureCommandAdapterExtraction,
  createArchitectureCommandAdapter
});
