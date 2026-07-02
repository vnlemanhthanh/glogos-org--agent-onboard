'use strict';

const PACKAGE_COMMAND_ADAPTER_EXTRACTION = Object.freeze({
  schema: 'agent-onboard-public-package-command-adapter-extraction-module-001',
  package_name: 'agent-onboard',
  role: 'packaged_runtime_package_command_adapter',
  planned_adapter_path: 'cli/agent_onboard/adapters/commands/release-package.js',
  compatibility_port_group: 'release_package',
  owned_top_level_commands: Object.freeze(['release']),
  excluded_top_level_commands: Object.freeze(['help', 'version', 'status', 'architecture', 'authority', 'work-items', 'target', 'target-instance', 'init', 'agents', 'guard', 'target-config']),
  output_contract: Object.freeze({
    release: 'delegates to packaged CLI release command family through injected bundled handler',
    plan: 'release --plan remains bundled CLI output behind the command adapter',
    check: 'release --check remains bundled CLI output behind the command adapter'
  }),
  boundary: Object.freeze({
    used_by_runtime_entrypoint_in_this_gate: true,
    packaged_in_npm_tarball_in_this_gate: true,
    no_side_effect_on_require: true,
    no_file_writes: true,
    no_network: true,
    no_process_exit: true,
    no_dynamic_eval: true,
    no_child_process: true
  })
});

function describePackageCommandAdapterExtraction() {
  return PACKAGE_COMMAND_ADAPTER_EXTRACTION;
}

function createPackageCommandAdapter(options = Object.freeze({})) {
  const handlers = options.handlers && typeof options.handlers === 'object' ? options.handlers : Object.freeze({});
  const service = options.service && typeof options.service === 'object' ? options.service : null;
  return Object.freeze({
    schema: 'agent-onboard-public-package-command-adapter-instance-001',
    adapter: PACKAGE_COMMAND_ADAPTER_EXTRACTION,
    commands: PACKAGE_COMMAND_ADAPTER_EXTRACTION.owned_top_level_commands,
    release(argv) {
      if (service && typeof service.release === 'function') return service.release(Array.isArray(argv) ? argv.slice(3) : []);
      if (typeof handlers.release === 'function') return handlers.release(Array.isArray(argv) ? argv.slice(3) : []);
      return Object.freeze({
        schema: 'agent-onboard-public-package-command-adapter-release-result-001',
        status: 'source_only_seed',
        writes_files: false,
        publishes_package: false,
        mutates_registry: false
      });
    },
    run(argv) {
      const command = Array.isArray(argv) ? (argv[2] || 'help') : 'help';
      if (command === 'release') return this.release(argv);
      return Object.freeze({
        schema: 'agent-onboard-public-package-command-adapter-run-result-001',
        status: 'unhandled_source_only_package_adapter',
        command,
        writes_files: false,
        publishes_package: false,
        mutates_registry: false
      });
    }
  });
}

module.exports = Object.freeze({
  PACKAGE_COMMAND_ADAPTER_EXTRACTION,
  describePackageCommandAdapterExtraction,
  createPackageCommandAdapter
});
