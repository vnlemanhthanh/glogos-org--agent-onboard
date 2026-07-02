'use strict';

function createPublicCliRuntimeDeMonolithCatalog(options = Object.freeze({})) {
  const RELEASE_LINE = options.releaseLine;
  const PUBLIC_PACKAGED_ROUTER_PORT_PACK_FILES = options.publicPackagedRouterPortPackFiles;
  const PUBLIC_PACKAGED_ROUTER_PORT_MODULE_FILES = options.publicPackagedRouterPortModuleFiles;

const PUBLIC_CLI_RUNTIME_DE_MONOLITH_PLANNING = Object.freeze({
  schema: 'agent-onboard-public-cli-runtime-de-monolith-planning-001',
  title: 'Agent-Onboard Public CLI Runtime De-Monolith Planning Gate',
  package_name: 'agent-onboard',
  release_line: RELEASE_LINE,
  command: 'agent-onboard architecture --cli-runtime-plan',
  check_command: 'agent-onboard architecture --cli-runtime-check',
  planning_file: '.agent-onboard/cli-runtime-de-monolith-planning.json',
  milestone_id: 'P1S3M3',
  work_item_id: ['P', 1, 'S', 3, 'M', 3, 'W', 1].join(''),
  next_work_item_id: ['P', 1, 'S', 3, 'M', 3, 'W', 2].join(''),
  planning_status: 'cli_runtime_de_monolith_plan_admitted',
  current_runtime_observation: Object.freeze({
    entrypoint: 'cli/agent-onboard.js',
    monolith_debt_declared: true,
    observed_cli_line_count_floor: 10000,
    extracted_service_line_count_ceiling: 9000,
    source_domain_modules_are_not_packaged_yet: true,
    physical_cutover_not_applied_in_this_gate: true
  }),
  selected_package_strategy: Object.freeze({
    id: 'controlled_source_module_inclusion',
    current_gate_keeps_compact_pack_allowlist: true,
    future_include_patterns: Object.freeze(['cli/agent_onboard/**/*.js']),
    rejected_for_now: Object.freeze(['generated_dist_bundle']),
    reason: 'Admitted architecture work proves thin CLI plus module tree; public should keep adopting the shape under public boundary guards before adding a generated bundle layer.'
  }),
  target_runtime_shape: Object.freeze([
    'thin CLI entrypoint',
    'command router',
    'compatibility command port',
    'command adapter groups',
    'domain facades',
    'domain services'
  ]),
  cli_line_budget: Object.freeze({
    target_entrypoint_max_lines: 300,
    router_seed_max_lines: 500,
    current_monolith_growth_allowed: false,
    no_new_domain_logic_in_monolith: true
  }),
  acceptance_criteria: Object.freeze([
    'Declare cli/agent-onboard.js monolith debt with measured line-count evidence.',
    'Select controlled source-module inclusion as the public package strategy for future physical runtime cutover.',
    'Keep the current npm package allowlist unchanged in this planning gate.',
    'Set thin-entrypoint and router-seed line budgets before moving runtime code.',
    'Seed the next router cutover gate instead of starting with the large target domain.'
  ]),
  boundary: Object.freeze({
    cli_runtime_plan_command_writes_files: false,
    cli_runtime_check_command_writes_files: false,
    moves_existing_source_files: false,
    creates_runtime_modules: false,
    changes_public_cli_outputs: false,
    changes_cli_runtime_dependency_graph: false,
    package_allowlist_unchanged: true,
    source_modules_remain_out_of_npm_pack_for_this_gate: true,
    writes_package_root: false,
    writes_target_repository_state: false,
    git_mutation: false,
    installs_dependencies: false,
    runs_package_manager: false,
    runs_build_test_deploy: false,
    publishes_package: false,
    mutates_registry: false
  })
});


const PUBLIC_THIN_CLI_ROUTER_SEED = Object.freeze({
  schema: 'agent-onboard-public-thin-cli-router-seed-001',
  title: 'Agent-Onboard Public Thin CLI Router Seed Gate',
  package_name: 'agent-onboard',
  release_line: RELEASE_LINE,
  command: 'agent-onboard architecture --thin-router',
  check_command: 'agent-onboard architecture --thin-router-check',
  seed_file: '.agent-onboard/thin-cli-router-seed.json',
  router_module: 'cli/agent_onboard/command-router.js',
  milestone_id: 'P1S3M3',
  work_item_id: ['P', 1, 'S', 3, 'M', 3, 'W', 2].join(''),
  next_work_item_id: ['P', 1, 'S', 3, 'M', 3, 'W', 3].join(''),
  seed_status: 'thin_cli_router_seed_admitted',
  runtime_cutover_applied: false,
  package_strategy: 'controlled_source_module_inclusion',
  entrypoint: 'cli/agent-onboard.js',
  router_seed_max_lines: 500,
  expected_router_export_names: Object.freeze(['ROUTER_SEED', 'describeRouterSeed', 'route']),
  expected_top_level_commands: Object.freeze(['help', 'version', 'status', 'init', 'agents', 'guard', 'authority', 'architecture', 'release', 'target-config', 'work-items', 'target', 'target-instance']),
  acceptance_criteria: Object.freeze([
    'Create the public source-only command router module at cli/agent_onboard/command-router.js.',
    'Keep cli/agent-onboard.js as the packaged runtime entrypoint for this seed gate.',
    'Keep the compact npm package allowlist unchanged until the controlled source-module inclusion gate.',
    'Require the router module to be side-effect-free on require and under the router seed line budget.',
    'Seed the next compatibility command port gate.'
  ]),
  boundary: Object.freeze({
    thin_router_command_writes_files: false,
    thin_router_check_command_writes_files: false,
    changes_public_cli_outputs: false,
    changes_cli_runtime_dependency_graph: false,
    uses_router_module_as_runtime_entrypoint: false,
    source_router_module_remains_out_of_pack: true,
    package_allowlist_unchanged: true,
    creates_runtime_module: true,
    writes_target_repository_state: false,
    git_mutation: false,
    installs_dependencies: false,
    runs_package_manager: false,
    runs_build_test_deploy: false,
    publishes_package: false,
    mutates_registry: false
  })
});


const PUBLIC_COMPATIBILITY_COMMAND_PORT_SEED = Object.freeze({
  schema: 'agent-onboard-public-compatibility-command-port-seed-001',
  title: 'Agent-Onboard Public Compatibility Command Port Seed Gate',
  package_name: 'agent-onboard',
  release_line: RELEASE_LINE,
  command: 'agent-onboard architecture --compatibility-port',
  check_command: 'agent-onboard architecture --compatibility-port-check',
  seed_file: '.agent-onboard/compatibility-command-port-seed.json',
  adapter_module: 'cli/agent_onboard/adapters/compatibility-command-port.js',
  port_module: 'cli/agent_onboard/ports/compatibility-command-port.js',
  router_module: 'cli/agent_onboard/command-router.js',
  milestone_id: 'P1S3M3',
  work_item_id: ['P', 1, 'S', 3, 'M', 3, 'W', 3].join(''),
  next_work_item_id: ['P', 1, 'S', 3, 'M', 3, 'W', 4].join(''),
  seed_status: 'compatibility_command_port_seed_admitted',
  runtime_cutover_applied: false,
  package_strategy: 'controlled_source_module_inclusion',
  port_seed_max_lines: 250,
  expected_adapter_export_names: Object.freeze(['COMPATIBILITY_COMMAND_PORT_SEED', 'describeCompatibilityCommandPortSeed', 'createCompatibilityCommandPort']),
  expected_port_export_names: Object.freeze(['createCompatibilityCommandPort']),
  expected_command_groups: Object.freeze(['architecture', 'coordination', 'core', 'onboarding', 'release_package', 'target']),
  acceptance_criteria: Object.freeze([
    'Create the public source-only compatibility command port adapter module at cli/agent_onboard/adapters/compatibility-command-port.js.',
    'Create the public source-only port facade module at cli/agent_onboard/ports/compatibility-command-port.js.',
    'Keep cli/agent-onboard.js as the packaged runtime entrypoint for this seed gate.',
    'Keep the compact npm package allowlist unchanged until controlled source-module inclusion.',
    'Require the compatibility command port modules to be side-effect-free on require and under the port seed line budget.',
    'Seed the next command adapter extraction gate.'
  ]),
  boundary: Object.freeze({
    compatibility_port_command_writes_files: false,
    compatibility_port_check_command_writes_files: false,
    changes_public_cli_outputs: false,
    changes_cli_runtime_dependency_graph: false,
    uses_compatibility_port_as_runtime_entrypoint: false,
    source_port_modules_remain_out_of_pack: true,
    package_allowlist_unchanged: true,
    creates_runtime_modules: true,
    writes_target_repository_state: false,
    git_mutation: false,
    installs_dependencies: false,
    runs_package_manager: false,
    runs_build_test_deploy: false,
    publishes_package: false,
    mutates_registry: false
  })
});


const PUBLIC_CORE_COMMAND_ADAPTER_EXTRACTION = Object.freeze({
  schema: 'agent-onboard-public-core-command-adapter-extraction-001',
  title: 'Agent-Onboard Public Core Command Adapter Extraction Gate',
  package_name: 'agent-onboard',
  release_line: RELEASE_LINE,
  command: 'agent-onboard architecture --core-adapter',
  check_command: 'agent-onboard architecture --core-adapter-check',
  extraction_file: '.agent-onboard/core-command-adapter-extraction.json',
  adapter_module: 'cli/agent_onboard/adapters/commands/core.js',
  compatibility_port_module: 'cli/agent_onboard/adapters/compatibility-command-port.js',
  router_module: 'cli/agent_onboard/command-router.js',
  milestone_id: 'P1S3M3',
  work_item_id: ['P', 1, 'S', 3, 'M', 3, 'W', 4].join(''),
  next_work_item_id: ['P', 1, 'S', 3, 'M', 3, 'W', 5].join(''),
  extraction_status: 'core_command_adapter_extraction_admitted',
  runtime_cutover_applied: false,
  package_strategy: 'controlled_source_module_inclusion',
  adapter_seed_max_lines: 220,
  expected_adapter_export_names: Object.freeze(['CORE_COMMAND_ADAPTER_EXTRACTION', 'describeCoreCommandAdapterExtraction', 'createCoreCommandAdapter']),
  owned_top_level_commands: Object.freeze(['help', 'version', 'status']),
  excluded_top_level_commands: Object.freeze(['architecture', 'release', 'authority', 'work-items', 'target', 'target-instance', 'init', 'agents', 'guard', 'target-config']),
  acceptance_criteria: Object.freeze([
    'Create the public source-only core command adapter module at cli/agent_onboard/adapters/commands/core.js.',
    'Bind the core adapter contract to the compatibility port group without changing the packaged runtime entrypoint.',
    'Keep cli/agent-onboard.js as the packaged runtime entrypoint for this extraction gate.',
    'Keep the compact npm package allowlist unchanged until controlled source-module inclusion.',
    'Require the core command adapter module to be side-effect-free on require and under the adapter seed line budget.',
    'Seed the next package command adapter extraction gate.'
  ]),
  boundary: Object.freeze({
    core_adapter_command_writes_files: false,
    core_adapter_check_command_writes_files: false,
    changes_public_cli_outputs: false,
    changes_cli_runtime_dependency_graph: false,
    uses_core_adapter_as_runtime_entrypoint: false,
    source_core_adapter_module_remains_out_of_pack: true,
    package_allowlist_unchanged: true,
    creates_runtime_modules: true,
    writes_target_repository_state: false,
    git_mutation: false,
    installs_dependencies: false,
    runs_package_manager: false,
    runs_build_test_deploy: false,
    publishes_package: false,
    mutates_registry: false
  })
});


const PUBLIC_PACKAGE_COMMAND_ADAPTER_EXTRACTION = Object.freeze({
  schema: 'agent-onboard-public-package-command-adapter-extraction-001',
  title: 'Agent-Onboard Public Package Command Adapter Extraction Gate',
  package_name: 'agent-onboard',
  release_line: RELEASE_LINE,
  command: 'agent-onboard architecture --package-adapter',
  check_command: 'agent-onboard architecture --package-adapter-check',
  extraction_file: '.agent-onboard/package-command-adapter-extraction.json',
  adapter_module: 'cli/agent_onboard/adapters/commands/release-package.js',
  compatibility_port_module: 'cli/agent_onboard/adapters/compatibility-command-port.js',
  router_module: 'cli/agent_onboard/command-router.js',
  milestone_id: 'P1S3M3',
  work_item_id: ['P', 1, 'S', 3, 'M', 3, 'W', 5].join(''),
  next_work_item_id: ['P', 1, 'S', 3, 'M', 3, 'W', 6].join(''),
  extraction_status: 'package_command_adapter_extraction_admitted',
  runtime_cutover_applied: false,
  package_strategy: 'controlled_source_module_inclusion',
  adapter_seed_max_lines: 220,
  expected_adapter_export_names: Object.freeze(['PACKAGE_COMMAND_ADAPTER_EXTRACTION', 'describePackageCommandAdapterExtraction', 'createPackageCommandAdapter']),
  owned_top_level_commands: Object.freeze(['release']),
  excluded_top_level_commands: Object.freeze(['help', 'version', 'status', 'architecture', 'authority', 'work-items', 'target', 'target-instance', 'init', 'agents', 'guard', 'target-config']),
  acceptance_criteria: Object.freeze([
    'Create the public source-only package command adapter module at cli/agent_onboard/adapters/commands/release-package.js.',
    'Bind the release package adapter contract to the compatibility port group without changing the packaged runtime entrypoint.',
    'Keep cli/agent-onboard.js as the packaged runtime entrypoint for this extraction gate.',
    'Keep the compact npm package allowlist unchanged until controlled source-module inclusion.',
    'Require the package command adapter module to be side-effect-free on require and under the adapter seed line budget.',
    'Seed the next architecture command adapter extraction gate.'
  ]),
  boundary: Object.freeze({
    package_adapter_command_writes_files: false,
    package_adapter_check_command_writes_files: false,
    changes_public_cli_outputs: false,
    changes_cli_runtime_dependency_graph: false,
    uses_package_adapter_as_runtime_entrypoint: false,
    source_package_adapter_module_remains_out_of_pack: true,
    package_allowlist_unchanged: true,
    creates_runtime_modules: true,
    writes_target_repository_state: false,
    git_mutation: false,
    installs_dependencies: false,
    runs_package_manager: false,
    runs_build_test_deploy: false,
    publishes_package: false,
    mutates_registry: false
  })
});

const PUBLIC_ARCHITECTURE_COMMAND_ADAPTER_EXTRACTION = Object.freeze({
  schema: 'agent-onboard-public-architecture-command-adapter-extraction-001',
  title: 'Agent-Onboard Public Architecture Command Adapter Extraction Gate',
  package_name: 'agent-onboard',
  release_line: RELEASE_LINE,
  command: 'agent-onboard architecture --architecture-adapter',
  check_command: 'agent-onboard architecture --architecture-adapter-check',
  extraction_file: '.agent-onboard/architecture-command-adapter-extraction.json',
  adapter_module: 'cli/agent_onboard/adapters/commands/architecture.js',
  compatibility_port_module: 'cli/agent_onboard/adapters/compatibility-command-port.js',
  router_module: 'cli/agent_onboard/command-router.js',
  milestone_id: 'P1S3M3',
  work_item_id: ['P', 1, 'S', 3, 'M', 3, 'W', 6].join(''),
  next_work_item_id: ['P', 1, 'S', 3, 'M', 3, 'W', 7].join(''),
  extraction_status: 'architecture_command_adapter_extraction_admitted',
  runtime_cutover_applied: false,
  package_strategy: 'controlled_source_module_inclusion',
  adapter_seed_max_lines: 220,
  expected_adapter_export_names: Object.freeze(['ARCHITECTURE_COMMAND_ADAPTER_EXTRACTION', 'describeArchitectureCommandAdapterExtraction', 'createArchitectureCommandAdapter']),
  owned_top_level_commands: Object.freeze(['architecture']),
  excluded_top_level_commands: Object.freeze(['help', 'version', 'status', 'release', 'authority', 'work-items', 'target', 'target-instance', 'init', 'agents', 'guard', 'target-config']),
  acceptance_criteria: Object.freeze([
    'Create the public source-only architecture command adapter module at cli/agent_onboard/adapters/commands/architecture.js.',
    'Bind the architecture adapter contract to the compatibility port group without changing the packaged runtime entrypoint.',
    'Keep cli/agent-onboard.js as the packaged runtime entrypoint for this extraction gate.',
    'Keep the compact npm package allowlist unchanged until controlled source-module inclusion.',
    'Require the architecture command adapter module to be side-effect-free on require and under the adapter seed line budget.',
    'Seed the next authority command adapter extraction gate.'
  ]),
  boundary: Object.freeze({
    architecture_adapter_command_writes_files: false,
    architecture_adapter_check_command_writes_files: false,
    changes_public_cli_outputs: false,
    changes_cli_runtime_dependency_graph: false,
    uses_architecture_adapter_as_runtime_entrypoint: false,
    source_architecture_adapter_module_remains_out_of_pack: true,
    package_allowlist_unchanged: true,
    creates_runtime_modules: true,
    writes_target_repository_state: false,
    git_mutation: false,
    installs_dependencies: false,
    runs_package_manager: false,
    runs_build_test_deploy: false,
    publishes_package: false,
    mutates_registry: false
  })
});

const PUBLIC_AUTHORITY_COMMAND_ADAPTER_EXTRACTION = Object.freeze({
  schema: 'agent-onboard-public-authority-command-adapter-extraction-001',
  title: 'Agent-Onboard Public Authority Command Adapter Extraction Gate',
  package_name: 'agent-onboard',
  release_line: RELEASE_LINE,
  command: 'agent-onboard architecture --authority-adapter',
  check_command: 'agent-onboard architecture --authority-adapter-check',
  extraction_file: '.agent-onboard/authority-command-adapter-extraction.json',
  adapter_module: 'cli/agent_onboard/adapters/commands/authority.js',
  compatibility_port_module: 'cli/agent_onboard/adapters/compatibility-command-port.js',
  router_module: 'cli/agent_onboard/command-router.js',
  milestone_id: 'P1S3M3',
  work_item_id: ['P', 1, 'S', 3, 'M', 3, 'W', 7].join(''),
  next_work_item_id: ['P', 1, 'S', 3, 'M', 3, 'W', 8].join(''),
  extraction_status: 'authority_command_adapter_extraction_admitted',
  runtime_cutover_applied: false,
  package_strategy: 'controlled_source_module_inclusion',
  adapter_seed_max_lines: 220,
  expected_adapter_export_names: Object.freeze(['AUTHORITY_COMMAND_ADAPTER_EXTRACTION', 'describeAuthorityCommandAdapterExtraction', 'createAuthorityCommandAdapter']),
  owned_top_level_commands: Object.freeze(['authority', 'agents', 'guard']),
  excluded_top_level_commands: Object.freeze(['help', 'version', 'status', 'architecture', 'release', 'work-items', 'target', 'target-instance', 'init', 'target-config']),
  acceptance_criteria: Object.freeze([
    'Create the public source-only authority command adapter module at cli/agent_onboard/adapters/commands/authority.js.',
    'Bind the authority adapter contract to the compatibility port group without changing the packaged runtime entrypoint.',
    'Keep cli/agent-onboard.js as the packaged runtime entrypoint for this extraction gate.',
    'Keep the compact npm package allowlist unchanged until controlled source-module inclusion.',
    'Require the authority command adapter module to be side-effect-free on require and under the adapter seed line budget.',
    'Seed the next modular runtime package inclusion planning gate.'
  ]),
  boundary: Object.freeze({
    authority_adapter_command_writes_files: false,
    authority_adapter_check_command_writes_files: false,
    changes_public_cli_outputs: false,
    changes_cli_runtime_dependency_graph: false,
    uses_authority_adapter_as_runtime_entrypoint: false,
    source_authority_adapter_module_remains_out_of_pack: true,
    package_allowlist_unchanged: true,
    creates_runtime_modules: true,
    writes_target_repository_state: false,
    git_mutation: false,
    installs_dependencies: false,
    runs_package_manager: false,
    runs_build_test_deploy: false,
    publishes_package: false,
    mutates_registry: false
  })
});

const PUBLIC_MODULAR_RUNTIME_PACKAGE_INCLUSION_PLAN = Object.freeze({
  schema: 'agent-onboard-public-modular-runtime-package-inclusion-plan-001',
  title: 'Agent-Onboard Public Modular Runtime Package Inclusion Planning Gate',
  package_name: 'agent-onboard',
  release_line: RELEASE_LINE,
  command: 'agent-onboard architecture --module-inclusion-plan',
  check_command: 'agent-onboard architecture --module-inclusion-check',
  planning_file: '.agent-onboard/modular-runtime-package-inclusion-plan.json',
  milestone_id: 'P1S3M3',
  work_item_id: ['P', 1, 'S', 3, 'M', 3, 'W', 8].join(''),
  next_work_item_id: ['P', 1, 'S', 3, 'M', 3, 'W', 9].join(''),
  planning_status: 'modular_runtime_package_inclusion_plan_admitted',
  current_public_package_files: Object.freeze(['LICENSE', 'README.md', 'cli/agent-onboard.js', 'package.json']),
  runtime_reference_shape: Object.freeze({
    thin_entrypoint: 'cli/agent-onboard.js',
    router_module: 'cli/agent_onboard/command-router.js',
    compatibility_port_module: 'cli/agent_onboard/adapters/compatibility-command-port.js',
    command_adapter_directory: 'cli/agent_onboard/adapters/commands',
    domain_service_directory: 'cli/agent_onboard/domains'
  }),
  future_include_candidates: Object.freeze([
    'cli/agent_onboard/command-router.js',
    'cli/agent_onboard/adapters/compatibility-command-port.js',
    'cli/agent_onboard/ports/compatibility-command-port.js',
    'cli/agent_onboard/adapters/commands/core.js',
    'cli/agent_onboard/adapters/commands/release-package.js',
    'cli/agent_onboard/adapters/commands/architecture.js',
    'cli/agent_onboard/adapters/commands/authority.js'
  ]),
  first_inclusion_slice: Object.freeze({
    id: 'packaged_router_port_core_adapters',
    runtime_cutover_allowed: false,
    package_files_change_allowed: true,
    requires_pack_surface_budget: true,
    requires_installed_package_parity: true
  }),
  acceptance_criteria: Object.freeze([
    'Admit that public should move toward a thin-entrypoint plus packaged module tree shape.',
    'Keep the compact four-file package allowlist unchanged in this planning gate.',
    'Identify the first future package inclusion slice before any runtime cutover.',
    'Require package surface budget and installed package parity checks before adding cli/agent_onboard modules to npm.',
    'Seed the next packaged router/port inclusion gate instead of adding more source-only command adapters.'
  ]),
  boundary: Object.freeze({
    module_inclusion_plan_command_writes_files: false,
    module_inclusion_check_command_writes_files: false,
    changes_public_cli_outputs: false,
    changes_cli_runtime_dependency_graph: false,
    package_allowlist_unchanged_for_this_gate: true,
    future_package_allowlist_change_planned: true,
    runtime_cutover_applied: false,
    writes_target_repository_state: false,
    git_mutation: false,
    installs_dependencies: false,
    runs_package_manager: false,
    runs_build_test_deploy: false,
    publishes_package: false,
    mutates_registry: false
  })
});

const PUBLIC_PACKAGED_ROUTER_PORT_INCLUSION = Object.freeze({
  schema: 'agent-onboard-public-packaged-router-port-inclusion-001',
  title: 'Agent-Onboard Public Packaged Router Port Inclusion Gate',
  package_name: 'agent-onboard',
  release_line: RELEASE_LINE,
  command: 'agent-onboard architecture --packaged-router-port',
  check_command: 'agent-onboard architecture --packaged-router-port-check',
  inclusion_file: '.agent-onboard/packaged-router-port-inclusion.json',
  milestone_id: 'P1S3M3',
  work_item_id: ['P', 1, 'S', 3, 'M', 3, 'W', 9].join(''),
  next_work_item_id: ['P', 1, 'S', 3, 'M', 3, 'W', 10].join(''),
  inclusion_status: 'packaged_router_port_inclusion_admitted',
  runtime_cutover_applied: false,
  entrypoint: 'cli/agent-onboard.js',
  included_package_files: PUBLIC_PACKAGED_ROUTER_PORT_PACK_FILES,
  included_module_files: PUBLIC_PACKAGED_ROUTER_PORT_MODULE_FILES,
  expected_module_exports: Object.freeze({
    'cli/agent_onboard/command-router.js': Object.freeze(['ROUTER_SEED', 'describeRouterSeed', 'route']),
    'cli/agent_onboard/adapters/compatibility-command-port.js': Object.freeze(['COMPATIBILITY_COMMAND_PORT_SEED', 'createCompatibilityCommandPort', 'describeCompatibilityCommandPortSeed']),
    'cli/agent_onboard/ports/compatibility-command-port.js': Object.freeze(['createCompatibilityCommandPort']),
    'cli/agent_onboard/adapters/commands/core.js': Object.freeze(['CORE_COMMAND_ADAPTER_EXTRACTION', 'createCoreCommandAdapter', 'describeCoreCommandAdapterExtraction']),
    'cli/agent_onboard/adapters/commands/release-package.js': Object.freeze(['PACKAGE_COMMAND_ADAPTER_EXTRACTION', 'createPackageCommandAdapter', 'describePackageCommandAdapterExtraction']),
    'cli/agent_onboard/adapters/commands/architecture.js': Object.freeze(['ARCHITECTURE_COMMAND_ADAPTER_EXTRACTION', 'createArchitectureCommandAdapter', 'describeArchitectureCommandAdapterExtraction']),
    'cli/agent_onboard/adapters/commands/authority.js': Object.freeze(['AUTHORITY_COMMAND_ADAPTER_EXTRACTION', 'createAuthorityCommandAdapter', 'describeAuthorityCommandAdapterExtraction']),
    'cli/agent_onboard/adapters/commands/target.js': Object.freeze(['TARGET_COMMAND_ADAPTER_EXTRACTION', 'createTargetCommandAdapter', 'describeTargetCommandAdapterExtraction'])
  }),
  acceptance_criteria: Object.freeze([
    'Expand package.json#files to include the router, compatibility command port, port facade, and admitted command adapter modules.',
    'Keep cli/agent-onboard.js as the runtime entrypoint for this gate; do not apply thin-entrypoint cutover yet.',
    'Require every newly packaged module to be side-effect-free on require and to expose its admitted source contract.',
    'Update package surface checks from four-file compact preservation to controlled modular inclusion.',
    'Seed the next thin-entrypoint router cutover rehearsal gate.'
  ]),
  boundary: Object.freeze({
    packaged_router_port_command_writes_files: false,
    packaged_router_port_check_command_writes_files: false,
    changes_public_cli_outputs: false,
    changes_cli_runtime_dependency_graph: false,
    runtime_cutover_applied: false,
    package_allowlist_expanded: true,
    package_file_count: PUBLIC_PACKAGED_ROUTER_PORT_PACK_FILES.length,
    writes_target_repository_state: false,
    git_mutation: false,
    installs_dependencies: false,
    runs_package_manager: false,
    runs_build_test_deploy: false,
    publishes_package: false,
    mutates_registry: false
  })
});

const PUBLIC_THIN_ENTRYPOINT_ROUTER_CUTOVER_REHEARSAL = Object.freeze({
  schema: 'agent-onboard-public-thin-entrypoint-router-cutover-rehearsal-001',
  title: 'Agent-Onboard Public Thin Entrypoint Router Cutover Rehearsal Gate',
  package_name: 'agent-onboard',
  release_line: RELEASE_LINE,
  command: 'agent-onboard architecture --thin-entrypoint-rehearsal',
  check_command: 'agent-onboard architecture --thin-entrypoint-rehearsal-check',
  rehearsal_file: '.agent-onboard/thin-entrypoint-router-cutover-rehearsal.json',
  milestone_id: 'P1S3M3',
  work_item_id: ['P', 1, 'S', 3, 'M', 3, 'W', 10].join(''),
  next_work_item_id: ['P', 1, 'S', 3, 'M', 3, 'W', 11].join(''),
  rehearsal_status: 'thin_entrypoint_router_cutover_rehearsed_not_applied',
  runtime_cutover_applied: false,
  current_entrypoint: 'cli/agent-onboard.js',
  router_module: 'cli/agent_onboard/command-router.js',
  compatibility_port_module: 'cli/agent_onboard/adapters/compatibility-command-port.js',
  target_entrypoint_max_lines: 25,
  rehearsal_vectors: Object.freeze([
    Object.freeze({ id: 'status', argv: Object.freeze(['node', 'cli/agent-onboard.js', 'status']), expected_status: 'ok' }),
    Object.freeze({ id: 'help_default', argv: Object.freeze(['node', 'cli/agent-onboard.js']), expected_status: 'ok' }),
    Object.freeze({ id: 'unhandled_closed', argv: Object.freeze(['node', 'cli/agent-onboard.js', 'unknown']), expected_status: 'unhandled_source_only_seed' })
  ]),
  expected_pack_files: PUBLIC_PACKAGED_ROUTER_PORT_PACK_FILES,
  acceptance_criteria: Object.freeze([
    'Rehearse the future thin entrypoint delegation through the packaged router and compatibility command port.',
    'Keep cli/agent-onboard.js as the current runtime entrypoint for this rehearsal gate.',
    'Keep the 11-file modular npm package allowlist unchanged.',
    'Require the router rehearsal vectors to return deterministic no-write results.',
    'Seed the next gate that may apply the actual thin entrypoint cutover.'
  ]),
  boundary: Object.freeze({
    thin_entrypoint_rehearsal_command_writes_files: false,
    thin_entrypoint_rehearsal_check_command_writes_files: false,
    changes_public_cli_outputs: false,
    changes_cli_runtime_dependency_graph: false,
    runtime_cutover_applied: false,
    package_allowlist_unchanged: true,
    package_file_count: PUBLIC_PACKAGED_ROUTER_PORT_PACK_FILES.length,
    writes_target_repository_state: false,
    git_mutation: false,
    installs_dependencies: false,
    runs_package_manager: false,
    runs_build_test_deploy: false,
    publishes_package: false,
    mutates_registry: false
  })
});

const PUBLIC_THIN_ENTRYPOINT_ROUTER_CUTOVER_APPLICATION = Object.freeze({
  schema: 'agent-onboard-public-thin-entrypoint-router-cutover-application-001',
  title: 'Agent-Onboard Public Thin Entrypoint Router Cutover Application Gate',
  package_name: 'agent-onboard',
  release_line: RELEASE_LINE,
  command: 'agent-onboard architecture --thin-entrypoint-cutover',
  check_command: 'agent-onboard architecture --thin-entrypoint-cutover-check',
  cutover_file: '.agent-onboard/thin-entrypoint-router-cutover-application.json',
  milestone_id: 'P1S3M3',
  work_item_id: ['P', 1, 'S', 3, 'M', 3, 'W', 11].join(''),
  next_work_item_id: ['P', 1, 'S', 3, 'M', 3, 'W', 12].join(''),
  cutover_status: 'thin_entrypoint_router_cutover_applied',
  runtime_cutover_applied: true,
  entrypoint: 'cli/agent-onboard.js',
  router_module: 'cli/agent_onboard/command-router.js',
  compatibility_port_module: 'cli/agent_onboard/adapters/compatibility-command-port.js',
  expected_pack_files: PUBLIC_PACKAGED_ROUTER_PORT_PACK_FILES,
  boundary: Object.freeze({
    thin_entrypoint_cutover_command_writes_files: false,
    thin_entrypoint_cutover_check_command_writes_files: false,
    changes_public_cli_outputs: false,
    runtime_uses_packaged_router: true,
    runtime_uses_packaged_compatibility_port: true,
    package_allowlist_unchanged: true,
    package_file_count: PUBLIC_PACKAGED_ROUTER_PORT_PACK_FILES.length,
    writes_target_repository_state: false,
    git_mutation: false,
    installs_dependencies: false,
    runs_package_manager: false,
    runs_build_test_deploy: false,
    publishes_package: false,
    mutates_registry: false
  })
});

const PUBLIC_ROUTER_COMMAND_ADAPTER_DELEGATION_EXPANSION = Object.freeze({
  schema: 'agent-onboard-public-router-command-adapter-delegation-expansion-001',
  title: 'Agent-Onboard Public Router Command Adapter Delegation Expansion Gate',
  package_name: 'agent-onboard',
  release_line: RELEASE_LINE,
  command: 'agent-onboard architecture --router-adapter-delegation',
  check_command: 'agent-onboard architecture --router-adapter-delegation-check',
  delegation_file: '.agent-onboard/router-command-adapter-delegation-expansion.json',
  milestone_id: 'P1S3M3',
  work_item_id: ['P', 1, 'S', 3, 'M', 3, 'W', 12].join(''),
  next_work_item_id: ['P', 1, 'S', 3, 'M', 3, 'W', 14].join(''),
  delegation_status: 'router_command_adapter_delegation_expanded',
  runtime_cutover_applied: true,
  entrypoint: 'cli/agent-onboard.js',
  compatibility_port_module: 'cli/agent_onboard/adapters/compatibility-command-port.js',
  expected_pack_files: PUBLIC_PACKAGED_ROUTER_PORT_PACK_FILES,
  adapter_modules: Object.freeze([
    Object.freeze({
      group: 'core',
      path: 'cli/agent_onboard/adapters/commands/core.js',
      factory: 'createCoreCommandAdapter',
      describe: 'describeCoreCommandAdapterExtraction',
      commands: Object.freeze(['help', '--help', '-h', 'version', '--version', '-v', 'status'])
    }),
    Object.freeze({
      group: 'release_package',
      path: 'cli/agent_onboard/adapters/commands/release-package.js',
      factory: 'createPackageCommandAdapter',
      describe: 'describePackageCommandAdapterExtraction',
      commands: Object.freeze(['release'])
    }),
    Object.freeze({
      group: 'architecture',
      path: 'cli/agent_onboard/adapters/commands/architecture.js',
      factory: 'createArchitectureCommandAdapter',
      describe: 'describeArchitectureCommandAdapterExtraction',
      commands: Object.freeze(['architecture'])
    }),
    Object.freeze({
      group: 'authority',
      path: 'cli/agent_onboard/adapters/commands/authority.js',
      factory: 'createAuthorityCommandAdapter',
      describe: 'describeAuthorityCommandAdapterExtraction',
      commands: Object.freeze(['authority', 'agents', 'guard'])
    }),
    Object.freeze({
      group: 'target',
      path: 'cli/agent_onboard/adapters/commands/target.js',
      factory: 'createTargetCommandAdapter',
      describe: 'describeTargetCommandAdapterExtraction',
      commands: Object.freeze(['init', 'target-config', 'target', 'target-instance'])
    }),
    Object.freeze({
      group: 'work_items',
      path: 'cli/agent_onboard/adapters/commands/work-items.js',
      factory: 'createWorkItemsCommandAdapter',
      describe: 'describeWorkItemsCommandAdapterExtraction',
      commands: Object.freeze(['work-items'])
    })
  ]),
  delegated_commands: Object.freeze(['--help', '--version', '-h', '-v', 'agents', 'architecture', 'authority', 'guard', 'help', 'init', 'release', 'status', 'target', 'target-config', 'target-instance', 'version', 'work-items']),
  legacy_fallback_commands: Object.freeze([]),
  smoke_vectors: Object.freeze([
    Object.freeze({ id: 'status', argv: Object.freeze(['node', 'cli/agent-onboard.js', 'status']), expected_exit_code: 0 }),
    Object.freeze({ id: 'version_alias', argv: Object.freeze(['node', 'cli/agent-onboard.js', '--version']), expected_exit_code: 0 }),
    Object.freeze({ id: 'architecture_router', argv: Object.freeze(['node', 'cli/agent-onboard.js', 'architecture', '--router']), expected_exit_code: 0 }),
    Object.freeze({ id: 'release_surface_check', argv: Object.freeze(['node', 'cli/agent-onboard.js', 'release', '--surface-check']), expected_exit_code: 0 }),
    Object.freeze({ id: 'authority_first_read', argv: Object.freeze(['node', 'cli/agent-onboard.js', 'authority', '--first-read']), expected_exit_code: 0 }),
    Object.freeze({ id: 'work_items_validate_template', argv: Object.freeze(['node', 'cli/agent-onboard.js', 'work-items', '--validate-template']), expected_exit_code: 0 })
  ]),
  boundary: Object.freeze({
    router_adapter_delegation_command_writes_files: false,
    router_adapter_delegation_check_command_writes_files: false,
    changes_public_cli_outputs: false,
    runtime_uses_packaged_router: true,
    runtime_uses_packaged_compatibility_port: true,
    runtime_uses_packaged_command_adapters: true,
    no_legacy_work_items_fallback_commands: true,
    package_allowlist_expanded_for_work_items_runtime_service_seed: true,
    package_file_count: PUBLIC_PACKAGED_ROUTER_PORT_PACK_FILES.length,
    writes_target_repository_state: false,
    git_mutation: false,
    installs_dependencies: false,
    runs_package_manager: false,
    runs_build_test_deploy: false,
    publishes_package: false,
    mutates_registry: false
  })
});

  return Object.freeze({
    PUBLIC_CLI_RUNTIME_DE_MONOLITH_PLANNING,
    PUBLIC_THIN_CLI_ROUTER_SEED,
    PUBLIC_COMPATIBILITY_COMMAND_PORT_SEED,
    PUBLIC_CORE_COMMAND_ADAPTER_EXTRACTION,
    PUBLIC_PACKAGE_COMMAND_ADAPTER_EXTRACTION,
    PUBLIC_ARCHITECTURE_COMMAND_ADAPTER_EXTRACTION,
    PUBLIC_AUTHORITY_COMMAND_ADAPTER_EXTRACTION,
    PUBLIC_MODULAR_RUNTIME_PACKAGE_INCLUSION_PLAN,
    PUBLIC_PACKAGED_ROUTER_PORT_INCLUSION,
    PUBLIC_THIN_ENTRYPOINT_ROUTER_CUTOVER_REHEARSAL,
    PUBLIC_THIN_ENTRYPOINT_ROUTER_CUTOVER_APPLICATION,
    PUBLIC_ROUTER_COMMAND_ADAPTER_DELEGATION_EXPANSION
  });
}

module.exports = Object.freeze({
  createPublicCliRuntimeDeMonolithCatalog
});
