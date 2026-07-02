'use strict';

const WORK_ITEMS_COMMAND_ADAPTER_EXTRACTION = Object.freeze({
  schema: 'agent-onboard-public-work-items-command-adapter-extraction-module-001',
  package_name: 'agent-onboard',
  role: 'packaged_runtime_work_items_command_adapter',
  planned_adapter_path: 'cli/agent_onboard/adapters/commands/work-items.js',
  compatibility_port_group: 'work_items',
  owned_top_level_commands: Object.freeze(['work-items']),
  extracted_read_only_commands: Object.freeze([
    'work-items --schema',
    'work-items --template',
    'work-items --validate-template',
    'work-items --list',
    'work-items --validate'
  ]),
  extracted_write_boundary_commands: Object.freeze([
    'work-items --init',
    'work-items --append',
    'work-items --claim',
    'work-items --close'
  ]),
  fallback_commands: Object.freeze([]),
  excluded_top_level_commands: Object.freeze(['help', 'version', 'status', 'architecture', 'release', 'authority', 'target', 'target-instance', 'init', 'agents', 'guard', 'target-config']),
  output_contract: Object.freeze({
    schema: 'work-items --schema is served by the packaged work-items runtime service',
    template: 'work-items --template is served by the packaged work-items runtime service',
    validate_template: 'work-items --validate-template is served by the packaged work-items runtime service',
    list: 'work-items --list is served by the packaged work-items runtime service',
    validate: 'work-items --validate is served by the packaged work-items runtime service',
    init: 'work-items --init is served by the packaged work-items runtime service with explicit --write boundary',
    append: 'work-items --append is served by the packaged work-items runtime service with explicit --write boundary',
    claim: 'work-items --claim is served by the packaged work-items runtime service with explicit --write boundary',
    close: 'work-items --close is served by the packaged work-items runtime service with explicit --write boundary',
    fallback: 'no work-items subcommands require bundled CLI fallback in this gate'
  }),
  boundary: Object.freeze({
    used_by_runtime_entrypoint_in_this_gate: true,
    packaged_in_npm_tarball_in_this_gate: true,
    no_side_effect_on_require: true,
    no_file_writes_on_require: true,
    no_network: true,
    no_process_exit: true,
    no_dynamic_eval: true,
    no_child_process: true,
    init_append_commands_use_explicit_write_boundary: true,
    claim_close_commands_use_explicit_write_boundary: true,
    no_legacy_work_items_fallback_commands: true
  })
});

function describeWorkItemsCommandAdapterExtraction() {
  return WORK_ITEMS_COMMAND_ADAPTER_EXTRACTION;
}

function createWorkItemsCommandAdapter(options = Object.freeze({})) {
  const service = options.service && typeof options.service === 'object' ? options.service : null;
  return Object.freeze({
    schema: 'agent-onboard-public-work-items-command-adapter-instance-001',
    adapter: WORK_ITEMS_COMMAND_ADAPTER_EXTRACTION,
    commands: WORK_ITEMS_COMMAND_ADAPTER_EXTRACTION.owned_top_level_commands,
    workItems(argv) {
      const args = Array.isArray(argv) ? argv.slice(3) : [];
      if (args.includes('--init') && service && typeof service.init === 'function') return service.init(args);
      if (args.includes('--append') && service && typeof service.append === 'function') return service.append(args);
      if (args.includes('--claim') && service && typeof service.claim === 'function') return service.claim(args);
      if (args.includes('--close') && service && typeof service.close === 'function') return service.close(args);
      if (args.includes('--schema') && service && typeof service.schema === 'function') return service.schema(args);
      if (args.includes('--template') && service && typeof service.template === 'function') return service.template(args);
      if (args.includes('--validate-template') && service && typeof service.validateTemplate === 'function') return service.validateTemplate(args);
      if (args.includes('--list') && service && typeof service.list === 'function') return service.list(args);
      if (args.includes('--validate') && service && typeof service.validate === 'function') return service.validate(args);
      throw new Error('work-items requires --schema, --template, --validate-template, --init --dry-run|--write [--force], --validate [file], or --list [file], or --append --dry-run|--write --id <public-work-item-id> --title <title>, or --claim --dry-run|--write --id <public-work-item-id> --actor <actor>, or --close --dry-run|--write --id <public-work-item-id> --actor <actor> --summary <summary>');
    },
    run(argv) {
      const command = Array.isArray(argv) ? (argv[2] || 'help') : 'help';
      if (command === 'work-items') return this.workItems(argv);
      return Object.freeze({
        schema: 'agent-onboard-public-work-items-command-adapter-run-result-001',
        status: 'unhandled_source_only_work_items_adapter',
        command,
        writes_files: false,
        publishes_package: false,
        mutates_registry: false
      });
    }
  });
}

module.exports = Object.freeze({
  WORK_ITEMS_COMMAND_ADAPTER_EXTRACTION,
  describeWorkItemsCommandAdapterExtraction,
  createWorkItemsCommandAdapter
});
