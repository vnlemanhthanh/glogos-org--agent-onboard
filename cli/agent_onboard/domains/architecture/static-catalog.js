'use strict';

function createPublicArchitectureCatalog(options = Object.freeze({})) {
  const RELEASE_LINE = options.releaseLine;
  const PUBLIC_PACKAGED_ROUTER_PORT_PACK_FILES = options.publicPackagedRouterPortPackFiles;
  const PUBLIC_PACKAGED_ROUTER_PORT_MODULE_FILES = options.publicPackagedRouterPortModuleFiles;

const PUBLIC_ARCHITECTURE_MAP = Object.freeze({
  schema: 'agent-onboard-public-architecture-map-001',
  title: 'Agent-Onboard Public Architecture Kernel Map',
  package_name: 'agent-onboard',
  release_line: RELEASE_LINE,
  command: 'agent-onboard architecture --map',
  check_command: 'agent-onboard architecture --check',
  purpose: 'Declare the stable public architecture kernel, command-router boundary, domain service facade boundary, and source extraction rehearsal before physical module extraction.',
  canonical_domains: Object.freeze([
    Object.freeze({
      id: 'core',
      title: 'Core command and utility domain',
      owns: Object.freeze(['status output', 'help output', 'JSON response discipline', 'shared no-mutation boundary helpers']),
      public_surface: Object.freeze(['status', 'help', 'version']),
      state_files: Object.freeze([])
    }),
    Object.freeze({
      id: 'authority',
      title: 'Authority and first-read domain',
      owns: Object.freeze(['read order', 'operator boundary language', 'first-read authority index', 'AI-readable repository entrypoint']),
      public_surface: Object.freeze(['authority --first-read', 'authority --check', 'AGENTS.md read order', 'llms.txt', '.agent-onboard/authority-path.json', 'agent-onboard.target.json authority level']),
      state_files: Object.freeze(['AGENTS.md', 'llms.txt', '.agent-onboard/authority-path.json', 'agent-onboard.target.json', '.agent-onboard/runtime-namespace.json'])
    }),
    Object.freeze({
      id: 'work_items',
      title: 'Work item ledger domain',
      owns: Object.freeze(['program/stage/milestone/work-item vocabulary', 'append flow', 'claim flow', 'closure envelope']),
      public_surface: Object.freeze(['work-items --schema', 'work-items --template', 'work-items --list', 'work-items --append', 'work-items --claim', 'work-items --close']),
      state_files: Object.freeze(['.agent-onboard/work-items.json'])
    }),
    Object.freeze({
      id: 'claims',
      title: 'Claim and handoff coordination domain',
      owns: Object.freeze(['claim actor envelope', 'claim next steps', 'handoff evidence checklist', 'future stale-claim and conflict rules']),
      public_surface: Object.freeze(['work-items --claim', 'work-items --close']),
      state_files: Object.freeze(['.agent-onboard/work-items.json'])
    }),
    Object.freeze({
      id: 'target',
      title: 'Target repository onboarding domain',
      owns: Object.freeze(['target config schema', 'target runtime namespace', 'target runtime project file', 'target onboarding plan', 'target write boundary', 'real target trial']),
      public_surface: Object.freeze(['target-config', 'target runtime --namespace', 'target runtime --check', 'target onboarding', 'target bootstrap', 'target-instance takeover', 'guard --check-boundary']),
      state_files: Object.freeze(['agent-onboard.target.json', '.agent-onboard/runtime-namespace.json', '.agent-onboard/project.json', '.agent-onboard/work-items.json', 'AGENTS.md', 'llms.txt', '.agent-onboard/authority-path.json'])
    }),
    Object.freeze({
      id: 'release_package',
      title: 'Release and npm package domain',
      owns: Object.freeze(['release contract', 'fixture matrix', 'npm pack allowlist', 'package parity smoke', 'post-publish handoff']),
      public_surface: Object.freeze(['release --plan', 'release --contract', 'release --fixture', 'release --surface', 'release --surface-check', 'release --parity-smoke', 'release --architecture-parity-smoke', 'release --target-onboarding-smoke', 'release --post-publish-handoff', 'release --published-acceptance', 'release --real-target-trial', 'release --check']),
      state_files: Object.freeze(['package.json', 'README.md', 'LICENSE', 'cli/agent-onboard.js'])
    })
  ]),
  runtime_flow: Object.freeze([
    'CLI command',
    'command adapter boundary',
    'public domain service facade',
    'state reader/writer boundary',
    'canonical JSON or text artifact'
  ]),
  public_source_shape: Object.freeze({
    current_entrypoint: 'cli/agent-onboard.js',
    physical_domain_split_status: 'cli_runtime_de_monolith_planning_applied',
    source_partition_plan_file: '.agent-onboard/source-partition-plan.json',
    source_extraction_rehearsal_file: '.agent-onboard/source-extraction-rehearsal.json',
    source_extraction_golden_outputs_file: '.agent-onboard/source-extraction-golden-outputs.json',
    source_module_extraction_adapter_boundary_file: '.agent-onboard/source-module-extraction-adapter-boundary.json',
    source_module_extraction_first_slice_file: '.agent-onboard/source-module-extraction-first-slice.json',
    source_module_extraction_first_slice_module: 'src/domains/core.js',
    source_module_extraction_bundle_parity_file: '.agent-onboard/source-module-extraction-bundle-parity.json',
    source_module_extraction_runtime_bridge_file: '.agent-onboard/source-module-extraction-runtime-bridge.json',
    source_module_extraction_installed_fallback_smoke_file: '.agent-onboard/source-module-extraction-installed-fallback-smoke.json',
    source_module_extraction_second_slice_plan_file: '.agent-onboard/source-module-extraction-second-slice-plan.json',
    source_module_extraction_second_slice_planned_module: 'src/domains/authority.js',
    source_module_extraction_second_slice_first_slice_file: '.agent-onboard/source-module-extraction-second-slice-first-slice.json',
    source_module_extraction_second_slice_first_slice_module: 'src/domains/authority.js',
    source_module_extraction_authority_bundle_parity_file: '.agent-onboard/source-module-extraction-authority-bundle-parity.json',
    source_module_extraction_authority_bundle_parity_module: 'src/domains/authority.js',
    source_module_extraction_authority_runtime_bridge_file: '.agent-onboard/source-module-extraction-authority-runtime-bridge.json',
    source_module_extraction_authority_runtime_bridge_module: 'src/domains/authority.js',
    public_architecture_m1_closure_m2_seed_file: '.agent-onboard/public-architecture-m1-closure-m2-seed.json',
    work_items_domain_source_extraction_plan_file: '.agent-onboard/source-module-extraction-work-items-plan.json',
    work_items_domain_source_extraction_first_slice_file: '.agent-onboard/source-module-extraction-work-items-first-slice.json',
    work_items_domain_source_extraction_bundle_parity_file: '.agent-onboard/source-module-extraction-work-items-bundle-parity.json',
    work_items_domain_source_extraction_runtime_bridge_file: '.agent-onboard/source-module-extraction-work-items-runtime-bridge.json',
    work_items_domain_source_extraction_installed_fallback_smoke_file: '.agent-onboard/source-module-extraction-work-items-installed-fallback-smoke.json',
    claims_domain_source_extraction_plan_file: '.agent-onboard/source-module-extraction-claims-plan.json',
    claims_domain_source_extraction_first_slice_file: '.agent-onboard/source-module-extraction-claims-first-slice.json',
    claims_domain_source_extraction_bundle_parity_file: '.agent-onboard/source-module-extraction-claims-bundle-parity.json',
    claims_domain_source_extraction_runtime_bridge_file: '.agent-onboard/source-module-extraction-claims-runtime-bridge.json',
    claims_domain_source_extraction_installed_fallback_smoke_file: '.agent-onboard/source-module-extraction-claims-installed-fallback-smoke.json',
    source_domain_extraction_stabilization_closure_review_file: '.agent-onboard/source-domain-extraction-stabilization-closure-review.json',
    cli_runtime_de_monolith_planning_file: '.agent-onboard/cli-runtime-de-monolith-planning.json',
    thin_cli_router_seed_file: '.agent-onboard/thin-cli-router-seed.json',
    thin_cli_router_seed_module: 'cli/agent_onboard/command-router.js',
    compatibility_command_port_seed_file: '.agent-onboard/compatibility-command-port-seed.json',
    core_command_adapter_extraction_file: '.agent-onboard/core-command-adapter-extraction.json',
    core_command_adapter_module: 'cli/agent_onboard/adapters/commands/core.js',
    package_command_adapter_extraction_file: '.agent-onboard/package-command-adapter-extraction.json',
    package_command_adapter_module: 'cli/agent_onboard/adapters/commands/release-package.js',
    architecture_command_adapter_extraction_file: '.agent-onboard/architecture-command-adapter-extraction.json',
    architecture_command_adapter_module: 'cli/agent_onboard/adapters/commands/architecture.js',
    authority_command_adapter_extraction_file: '.agent-onboard/authority-command-adapter-extraction.json',
    authority_command_adapter_module: 'cli/agent_onboard/adapters/commands/authority.js',
    router_command_adapter_delegation_file: '.agent-onboard/router-command-adapter-delegation-expansion.json',
    modular_runtime_package_inclusion_plan_file: '.agent-onboard/modular-runtime-package-inclusion-plan.json',
    claims_domain_source_extraction_module: 'src/domains/claims.js',
    claims_domain_source_extraction_planned_module: 'src/domains/claims.js',
    work_items_domain_source_extraction_module: 'src/domains/work-items.js',
    work_items_domain_source_extraction_planned_module: 'src/domains/work-items.js',
    architecture_milestone_transition_status: 'p1s3m1_closed_p1s3m2_seeded',
    source_can_grow_with_tests: true,
    npm_package_remains_compact: false,
    expected_pack_files: PUBLIC_PACKAGED_ROUTER_PORT_PACK_FILES
  }),
  package_boundary: Object.freeze({
    architecture_map_command_writes_files: false,
    architecture_check_command_writes_files: false,
    architecture_router_command_writes_files: false,
    architecture_facades_command_writes_files: false,
    authority_first_read_command_writes_files: false,
    authority_check_command_writes_files: false,
    target_runtime_namespace_command_writes_files: false,
    target_runtime_check_command_writes_files: false,
    package_surface_command_writes_files: false,
    package_surface_check_command_writes_files: false,
    architecture_parity_smoke_command_writes_files: false,
    architecture_partition_plan_command_writes_files: false,
    architecture_partition_check_command_writes_files: false,
    architecture_extraction_rehearsal_command_writes_files: false,
    architecture_extraction_check_command_writes_files: false,
    architecture_golden_outputs_command_writes_files: false,
    architecture_golden_check_command_writes_files: false,
    architecture_adapter_boundary_command_writes_files: false,
    architecture_adapter_check_command_writes_files: false,
    architecture_first_slice_command_writes_files: false,
    architecture_first_slice_check_command_writes_files: false,
    architecture_bundle_parity_command_writes_files: false,
    architecture_bundle_parity_check_command_writes_files: false,
    architecture_runtime_bridge_command_writes_files: false,
    architecture_runtime_bridge_check_command_writes_files: false,
    architecture_installed_fallback_smoke_command_writes_files: false,
    architecture_installed_fallback_check_command_writes_files: false,
    architecture_second_slice_plan_command_writes_files: false,
    architecture_second_slice_check_command_writes_files: false,
    architecture_second_slice_first_slice_command_writes_files: false,
    architecture_second_slice_first_slice_check_command_writes_files: false,
    architecture_authority_bundle_parity_command_writes_files: false,
    architecture_authority_bundle_parity_check_command_writes_files: false,
    architecture_authority_runtime_bridge_command_writes_files: false,
    architecture_authority_runtime_bridge_check_command_writes_files: false,
    architecture_m2_seed_command_writes_files: false,
    architecture_m2_seed_check_command_writes_files: false,
    architecture_work_items_plan_command_writes_files: false,
    architecture_work_items_check_command_writes_files: false,
    architecture_work_items_first_slice_command_writes_files: false,
    architecture_work_items_first_slice_check_command_writes_files: false,
    architecture_work_items_bundle_parity_command_writes_files: false,
    architecture_work_items_bundle_parity_check_command_writes_files: false,
    architecture_work_items_runtime_bridge_command_writes_files: false,
    architecture_work_items_runtime_bridge_check_command_writes_files: false,
    architecture_work_items_installed_fallback_smoke_command_writes_files: false,
    architecture_work_items_installed_fallback_check_command_writes_files: false,
    architecture_claims_plan_command_writes_files: false,
    architecture_claims_check_command_writes_files: false,
    architecture_claims_first_slice_command_writes_files: false,
    architecture_claims_first_slice_check_command_writes_files: false,
    architecture_claims_bundle_parity_command_writes_files: false,
    architecture_claims_bundle_parity_check_command_writes_files: false,
    architecture_claims_runtime_bridge_command_writes_files: false,
    architecture_claims_runtime_bridge_check_command_writes_files: false,
    architecture_claims_installed_fallback_smoke_command_writes_files: false,
    architecture_claims_installed_fallback_check_command_writes_files: false,
    architecture_source_domain_closure_review_command_writes_files: false,
    architecture_source_domain_closure_check_command_writes_files: false,
    architecture_cli_runtime_plan_command_writes_files: false,
    architecture_cli_runtime_check_command_writes_files: false,
    architecture_thin_router_command_writes_files: false,
    architecture_thin_router_check_command_writes_files: false,
    architecture_compatibility_port_command_writes_files: false,
    architecture_compatibility_port_check_command_writes_files: false,
    architecture_core_adapter_command_writes_files: false,
    architecture_core_adapter_check_command_writes_files: false,
    architecture_package_adapter_command_writes_files: false,
    architecture_package_adapter_check_command_writes_files: false,
    architecture_architecture_adapter_command_writes_files: false,
    architecture_architecture_adapter_check_command_writes_files: false,
    architecture_authority_adapter_command_writes_files: false,
    architecture_authority_adapter_check_command_writes_files: false,
    architecture_module_inclusion_plan_command_writes_files: false,
    architecture_module_inclusion_check_command_writes_files: false,
    architecture_router_adapter_delegation_command_writes_files: false,
    architecture_router_adapter_delegation_check_command_writes_files: false,
    version_sprawl_check_command_writes_files: false,
    published_package_surface_file_count: 11,
    command_router_dispatch_must_be_table_driven: true,
    main_function_delegates_to_command_router: true,
    command_router_delegates_to_domain_service_facades: true,
    package_allowlist_must_stay_compact: true,
    source_context_files_stay_out_of_npm_pack: true,
    physical_partition_not_required_for_this_gate: true,
    source_domain_module_partition_planned_not_applied: true,
    source_domain_extraction_rehearsed_not_applied: true,
    source_module_extraction_adapter_boundary_declared_not_applied: true,
    source_module_extraction_first_slice_applied_for_core_only: true,
    source_module_extraction_bundle_parity_applied: true,
    source_module_extraction_runtime_bridge_applied: true,
    source_module_extraction_installed_fallback_smoke_applied: true,
    source_module_extraction_second_slice_planning_applied: true,
    source_module_extraction_second_slice_first_slice_applied: true,
    source_module_extraction_authority_bundle_parity_applied: true,
    source_module_extraction_authority_runtime_bridge_applied: true,
    architecture_m1_closed_m2_seeded: true,
    work_items_domain_source_extraction_planning_applied: true,
    work_items_domain_source_extraction_first_slice_applied: true,
    work_items_domain_source_extraction_bundle_parity_applied: true,
    work_items_domain_source_extraction_runtime_bridge_applied: true,
    work_items_domain_source_extraction_installed_fallback_smoke_applied: true,
    claims_domain_source_extraction_planning_applied: true,
    claims_domain_source_extraction_first_slice_applied: true,
    claims_domain_source_extraction_bundle_parity_applied: true,
    claims_domain_source_extraction_runtime_bridge_applied: true,
    claims_domain_source_extraction_installed_fallback_smoke_applied: true,
    cli_runtime_de_monolith_planning_applied: true,
    thin_cli_router_seed_applied: true,
    compatibility_command_port_seed_applied: true,
    core_command_adapter_extraction_applied: true,
    package_command_adapter_extraction_applied: true,
    architecture_command_adapter_extraction_applied: true,
    authority_command_adapter_extraction_applied: true,
    modular_runtime_package_inclusion_plan_applied: true
  }),
  next_candidate_gates: Object.freeze([
    Object.freeze({
      title: 'Public source domain extraction rehearsal gate',
      intent: 'Rehearse extracting source modules behind the admitted facades without changing runtime output or npm package surface.'
    }),
    Object.freeze({
      title: 'Public source/bundle parity planning gate',
      intent: 'Decide whether future source modules remain source-only or are bundled back into the compact CLI entrypoint before publish.'
    }),
    Object.freeze({
      title: 'Public module extraction golden output gate',
      intent: 'Freeze golden command outputs before any physical source-domain extraction.'
    })
  ])
});

const PUBLIC_COMMAND_ROUTER = Object.freeze({
  schema: 'agent-onboard-public-command-router-001',
  title: 'Agent-Onboard Public Command Router Boundary',
  package_name: 'agent-onboard',
  release_line: RELEASE_LINE,
  command: 'agent-onboard architecture --router',
  check_command: 'agent-onboard architecture --check',
  dispatch_mode: 'table_driven_top_level_router',
  dispatcher: 'dispatchCommand',
  entrypoint: 'cli/agent-onboard.js',
  aliases: Object.freeze({
    help: Object.freeze(['', 'help', '--help', '-h']),
    version: Object.freeze(['version', '--version', '-v'])
  }),
  routes: Object.freeze([
    Object.freeze({ command: 'help', domain: 'core', facade: 'coreService', handler: 'help', aliases: Object.freeze(['', 'help', '--help', '-h']), nested: false, writes_files: false }),
    Object.freeze({ command: 'version', domain: 'core', facade: 'coreService', handler: 'printVersion', aliases: Object.freeze(['version', '--version', '-v']), nested: false, writes_files: false }),
    Object.freeze({ command: 'status', domain: 'core', facade: 'coreService', handler: 'runStatus', aliases: Object.freeze([]), nested: false, writes_files: false }),
    Object.freeze({ command: 'init', domain: 'target', facade: 'targetService', handler: 'runInit', aliases: Object.freeze([]), nested: false, writes_files: true }),
    Object.freeze({ command: 'agents', domain: 'authority', facade: 'authorityService', handler: 'runAgents', aliases: Object.freeze([]), nested: false, writes_files: true }),
    Object.freeze({ command: 'guard', domain: 'authority', facade: 'authorityService', handler: 'runGuard', aliases: Object.freeze([]), nested: false, writes_files: false }),
    Object.freeze({ command: 'authority', domain: 'authority', facade: 'authorityService', handler: 'runAuthority', aliases: Object.freeze([]), nested: true, nested_commands: Object.freeze(['--first-read', '--check']), writes_files: false }),
    Object.freeze({ command: 'architecture', domain: 'core', facade: 'coreService', handler: 'runArchitecture', aliases: Object.freeze([]), nested: false, writes_files: false }),
    Object.freeze({ command: 'release', domain: 'release_package', facade: 'releasePackageService', handler: 'runRelease', aliases: Object.freeze([]), nested: false, writes_files: false }),
    Object.freeze({ command: 'target-config', domain: 'target', facade: 'targetService', handler: 'runTargetConfig', aliases: Object.freeze([]), nested: false, writes_files: false }),
    Object.freeze({ command: 'work-items', domain: 'work_items', facade: 'workItemsService', handler: 'runWorkItems', aliases: Object.freeze([]), nested: false, writes_files: true }),
    Object.freeze({ command: 'target', domain: 'target', facade: 'targetService', handler: 'runTargetCommand', aliases: Object.freeze([]), nested: true, nested_commands: Object.freeze(['runtime', 'onboarding', 'bootstrap']), writes_files: true }),
    Object.freeze({ command: 'target-instance', domain: 'target', facade: 'targetService', handler: 'runTargetInstance', aliases: Object.freeze([]), nested: true, nested_commands: Object.freeze(['takeover']), writes_files: true })
  ]),
  boundary: Object.freeze({
    router_command_writes_files: false,
    router_command_writes_target_repository_state: false,
    router_command_runs_package_manager: false,
    router_command_publishes_package: false,
    dispatch_table_contains_functions: false,
    dispatch_table_declares_handler_names_only: true,
    routes_declare_domain_service_facades: true,
    no_dynamic_eval: true,
    unsupported_commands_fail_closed: true,
    nested_target_routes_are_explicit: true,
    package_allowlist_unchanged: true
  })
});

const PUBLIC_DOMAIN_SERVICE_FACADES = Object.freeze({
  schema: 'agent-onboard-public-domain-service-facades-001',
  title: 'Agent-Onboard Public Domain Service Facade Boundary',
  package_name: 'agent-onboard',
  release_line: RELEASE_LINE,
  command: 'agent-onboard architecture --facades',
  check_command: 'agent-onboard architecture --check',
  purpose: 'Expose the admitted public domain service facade layer between the command router and state reader/writer boundaries without requiring a physical source module split.',
  dispatch_flow: Object.freeze([
    'dispatchCommand',
    'COMMAND_ROUTE_HANDLERS',
    'DOMAIN_SERVICE_FACADES',
    'domain service method',
    'state reader/writer boundary'
  ]),
  facades: Object.freeze([
    Object.freeze({ id: 'core', service: 'coreService', owns_commands: Object.freeze(['help', 'version', 'status', 'architecture']), writes_files: false, state_writer: false }),
    Object.freeze({ id: 'authority', service: 'authorityService', owns_commands: Object.freeze(['agents', 'guard', 'authority --first-read', 'authority --check']), writes_files: true, state_writer: true }),
    Object.freeze({ id: 'work_items', service: 'workItemsService', owns_commands: Object.freeze(['work-items']), writes_files: true, state_writer: true }),
    Object.freeze({ id: 'claims', service: 'claimsService', owns_commands: Object.freeze(['work-items --claim', 'work-items --close']), writes_files: true, state_writer: true, shares_ledger_with: 'work_items' }),
    Object.freeze({ id: 'target', service: 'targetService', owns_commands: Object.freeze(['init', 'target-config', 'target runtime --namespace', 'target runtime --check', 'target onboarding', 'target bootstrap', 'target-instance takeover']), writes_files: true, state_writer: true }),
    Object.freeze({ id: 'release_package', service: 'releasePackageService', owns_commands: Object.freeze(['release']), writes_files: false, state_writer: false })
  ]),
  boundary: Object.freeze({
    facades_command_writes_files: false,
    facades_command_writes_target_repository_state: false,
    facades_command_runs_package_manager: false,
    facades_command_publishes_package: false,
    every_public_domain_has_one_facade: true,
    every_command_route_declares_facade: true,
    route_facade_ids_must_match_canonical_domains: true,
    physical_partition_not_required_for_this_gate: true,
    package_allowlist_unchanged: true
  })
});


const PUBLIC_AUTHORITY_FIRST_READ_INDEX = Object.freeze({
  schema: 'agent-onboard-public-authority-first-read-index-001',
  title: 'Agent-Onboard Public Authority First-Read Index',
  package_name: 'agent-onboard',
  release_line: RELEASE_LINE,
  command: 'agent-onboard authority --first-read',
  check_command: 'agent-onboard authority --check',
  purpose: 'Declare the canonical first-read order for human and AI operators before target repository writes, package publication, dependency changes, build/test/deploy runs, or Git mutation.',
  source_files: Object.freeze(['AGENTS.md', 'llms.txt', '.agent-onboard/authority-path.json']),
  machine_index_file: '.agent-onboard/authority-path.json',
  ai_entrypoint_file: 'llms.txt',
  human_entrypoint_file: 'AGENTS.md',
  read_order: Object.freeze([
    Object.freeze({ order: 1, path: 'AGENTS.md', role: 'human_and_agent_operating_rules', required_when_present: true }),
    Object.freeze({ order: 2, path: 'llms.txt', role: 'ai_readable_public_entrypoint', required_when_present: true }),
    Object.freeze({ order: 3, path: '.agent-onboard/authority-path.json', role: 'machine_readable_authority_index', required_when_present: true }),
    Object.freeze({ order: 4, path: 'agent-onboard.target.json', role: 'target_boundary_declaration', required_when_present: true }),
    Object.freeze({ order: 5, path: '.agent-onboard/runtime-namespace.json', role: 'target_runtime_namespace_declaration', required_when_present: true }),
    Object.freeze({ order: 6, path: '.agent-onboard/project.json', role: 'target_runtime_project_identity', required_when_present: true }),
    Object.freeze({ order: 7, path: '.agent-onboard/work-items.json', role: 'public_work_item_ledger', required_when_present: true }),
    Object.freeze({ order: 8, path: 'README.md', role: 'public_package_documentation', required_when_present: false }),
    Object.freeze({ order: 9, path: 'raw evidence/source files', role: 'on_demand_only_after_authority_files', required_when_present: false })
  ]),
  boundary: Object.freeze({
    first_read_command_writes_files: false,
    check_command_writes_files: false,
    writes_target_repository_state: false,
    git_mutation: false,
    installs_dependencies: false,
    runs_package_manager: false,
    runs_build_test_deploy: false,
    publishes_package: false,
    mutates_registry: false,
    raw_evidence_is_on_demand_only: true,
    package_allowlist_unchanged: true
  })
});


const PUBLIC_TARGET_RUNTIME_NAMESPACE = Object.freeze({
  schema: 'agent-onboard-public-target-runtime-namespace-001',
  title: 'Agent-Onboard Public Target Runtime Namespace',
  package_name: 'agent-onboard',
  release_line: RELEASE_LINE,
  command: 'agent-onboard target runtime --namespace',
  check_command: 'agent-onboard target runtime --check',
  purpose: 'Declare the canonical public runtime namespace under .agent-onboard/ after the authority first-read index is admitted.',
  namespace_root: '.agent-onboard',
  namespace_file: '.agent-onboard/runtime-namespace.json',
  canonical_runtime_files: Object.freeze([
    Object.freeze({ path: '.agent-onboard/runtime-namespace.json', domain: 'target', role: 'machine_readable_runtime_namespace', kind: 'json', required: true, written_by: 'target onboarding --write' }),
    Object.freeze({ path: '.agent-onboard/project.json', domain: 'target', role: 'target_runtime_project_identity', kind: 'json', required: true, written_by: 'init --write or target onboarding --write or target-instance takeover --write' }),
    Object.freeze({ path: '.agent-onboard/work-items.json', domain: 'work_items', role: 'public_work_item_ledger', kind: 'json', required: true, written_by: 'work-items --init --write or target onboarding --write or target-instance takeover --write' }),
    Object.freeze({ path: '.agent-onboard/authority-path.json', domain: 'authority', role: 'authority_first_read_index', kind: 'json', required: true, written_by: 'target onboarding --write' })
  ]),
  top_level_authority_files: Object.freeze([
    'AGENTS.md',
    'llms.txt',
    'agent-onboard.target.json'
  ]),
  reserved_future_files: Object.freeze([
    Object.freeze({ path: '.agent-onboard/claims.jsonl', domain: 'claims', status: 'reserved_not_written_by_this_gate' }),
    Object.freeze({ path: '.agent-onboard/events.jsonl', domain: 'target', status: 'reserved_not_written_by_this_gate' })
  ]),
  allowed_writers: Object.freeze([
    'target onboarding --write',
    'init --write',
    'work-items --init --write',
    'target-instance takeover --write'
  ]),
  boundary: Object.freeze({
    namespace_command_writes_files: false,
    check_command_writes_files: false,
    writes_target_repository_state: false,
    git_mutation: false,
    installs_dependencies: false,
    runs_package_manager: false,
    runs_build_test_deploy: false,
    publishes_package: false,
    mutates_registry: false,
    reserved_future_files_not_written: true,
    package_allowlist_unchanged: true
  })
});


const PUBLIC_PACKAGE_SURFACE_PRESERVATION = Object.freeze({
  schema: 'agent-onboard-public-package-surface-preservation-001',
  title: 'Agent-Onboard Public Package Surface Preservation',
  package_name: 'agent-onboard',
  release_line: RELEASE_LINE,
  command: 'agent-onboard release --surface',
  check_command: 'agent-onboard release --surface-check',
  purpose: 'Admit the first controlled modular runtime package inclusion slice while keeping cli/agent-onboard.js as the runtime entrypoint.',
  expected_pack_files: PUBLIC_PACKAGED_ROUTER_PORT_PACK_FILES,
  required_package_json_files: Object.freeze(PUBLIC_PACKAGED_ROUTER_PORT_PACK_FILES.filter((rel) => rel !== 'package.json')),
  source_only_files: Object.freeze([
    'AGENTS.md',
    'llms.txt',
    'agent-onboard.target.json',
    '.agent-onboard/project.json',
    '.agent-onboard/work-items.json',
    '.agent-onboard/authority-path.json',
    '.agent-onboard/runtime-namespace.json',
    '.agent-onboard/source-partition-plan.json',
    '.agent-onboard/source-extraction-rehearsal.json',
    '.agent-onboard/source-extraction-golden-outputs.json',
    '.agent-onboard/source-module-extraction-adapter-boundary.json',
    '.agent-onboard/source-module-extraction-first-slice.json',
    '.agent-onboard/source-module-extraction-bundle-parity.json',
    '.agent-onboard/source-module-extraction-runtime-bridge.json',
    '.agent-onboard/source-module-extraction-installed-fallback-smoke.json',
    '.agent-onboard/source-module-extraction-second-slice-plan.json',
    '.agent-onboard/source-module-extraction-second-slice-first-slice.json',
    '.agent-onboard/source-module-extraction-authority-bundle-parity.json',
    '.agent-onboard/source-module-extraction-authority-runtime-bridge.json',
    '.agent-onboard/public-architecture-m1-closure-m2-seed.json',
    '.agent-onboard/source-module-extraction-work-items-plan.json',
    '.agent-onboard/source-module-extraction-work-items-first-slice.json',
    '.agent-onboard/source-module-extraction-work-items-bundle-parity.json',
    '.agent-onboard/source-module-extraction-work-items-runtime-bridge.json',
    '.agent-onboard/source-module-extraction-work-items-installed-fallback-smoke.json',
    '.agent-onboard/source-module-extraction-claims-plan.json',
    '.agent-onboard/source-module-extraction-claims-first-slice.json',
    '.agent-onboard/source-module-extraction-claims-bundle-parity.json',
    '.agent-onboard/source-module-extraction-claims-runtime-bridge.json',
    '.agent-onboard/source-module-extraction-claims-installed-fallback-smoke.json',
    '.agent-onboard/source-domain-extraction-stabilization-closure-review.json',
    '.agent-onboard/cli-runtime-de-monolith-planning.json',
    '.agent-onboard/thin-cli-router-seed.json',
    '.agent-onboard/compatibility-command-port-seed.json',
    '.agent-onboard/core-command-adapter-extraction.json',
    '.agent-onboard/package-command-adapter-extraction.json',
    '.agent-onboard/architecture-command-adapter-extraction.json',
    '.agent-onboard/authority-command-adapter-extraction.json',
    '.agent-onboard/modular-runtime-package-inclusion-plan.json',
    '.agent-onboard/packaged-router-port-inclusion.json',
    '.agent-onboard/thin-entrypoint-router-cutover-rehearsal.json',
    '.agent-onboard/thin-entrypoint-router-cutover-application.json',
    'src/domains/core.js',
    'src/domains/authority.js',
    'src/domains/work-items.js',
    'src/domains/claims.js',
    'test/agent-onboard.test.js'
  ]),
  installed_context_policy: Object.freeze({
    source_context_files_required_in_source_repo: true,
    source_context_files_must_be_absent_from_npm_pack: true,
    source_work_item_ledger_may_be_absent_after_install: true,
    installed_package_release_check_must_skip_missing_source_ledger: true
  }),
  boundary: Object.freeze({
    surface_command_writes_files: false,
    check_command_writes_files: false,
    writes_package_root: false,
    writes_target_repository_state: false,
    git_mutation: false,
    installs_dependencies: false,
    runs_package_manager: false,
    runs_build_test_deploy: false,
    publishes_package: false,
    mutates_registry: false,
    package_allowlist_unchanged: false,
    package_allowlist_expanded: true,
    source_context_files_stay_out_of_npm_pack: true
  })
});


const PUBLIC_INSTALLED_PARITY_ARCHITECTURE_SMOKE = Object.freeze({
  schema: 'agent-onboard-public-installed-parity-architecture-smoke-001',
  title: 'Agent-Onboard Public Installed Parity Architecture Smoke',
  package_name: 'agent-onboard',
  release_line: RELEASE_LINE,
  command: 'agent-onboard release --architecture-parity-smoke',
  check_command: 'agent-onboard release --check',
  purpose: 'Verify that the installed npm package exposes the admitted public architecture, authority, target runtime, package-surface checks, and the first packaged modular router/port slice.',
  validated_surfaces: Object.freeze([
    'release --check',
    'architecture --check',
    'architecture --partition-check',
    'architecture --extraction-check',
    'authority --check',
    'target runtime --check',
    'release --surface-check'
  ]),
  expected_pack_files: PUBLIC_PACKAGED_ROUTER_PORT_PACK_FILES,
  source_only_files_may_be_absent_after_install: true,
  boundary: Object.freeze({
    architecture_parity_smoke_command_writes_files: false,
    writes_package_root: false,
    writes_target_repository_state: false,
    creates_temp_files: false,
    git_mutation: false,
    installs_dependencies: false,
    runs_package_manager: false,
    runs_build_test_deploy: false,
    publishes_package: false,
    mutates_registry: false,
    package_allowlist_unchanged: false,
    package_allowlist_expanded: true,
    source_context_files_stay_out_of_npm_pack: true
  })
});

const PUBLIC_SOURCE_DOMAIN_MODULE_PARTITION_PLAN = Object.freeze({
  schema: 'agent-onboard-public-source-domain-module-partition-plan-001',
  title: 'Agent-Onboard Public Source Domain Module Partition Plan',
  package_name: 'agent-onboard',
  release_line: RELEASE_LINE,
  command: 'agent-onboard architecture --partition-plan',
  check_command: 'agent-onboard architecture --partition-check',
  plan_file: '.agent-onboard/source-partition-plan.json',
  purpose: 'Declare the future public source-domain module partition before moving code out of the compact CLI entrypoint or expanding the npm package surface.',
  current_shape: Object.freeze({
    entrypoint: 'cli/agent-onboard.js',
    physical_module_partition_status: 'planned_not_applied',
    implementation_strategy: 'single_file_runtime_with_declared_domain_boundaries',
    package_surface_status: 'compact_four_file_npm_package_preserved'
  }),
  planned_source_modules: Object.freeze([
    Object.freeze({ domain: 'core', planned_module: 'src/domains/core.js', facade: 'coreService', package_surface: 'bundled_into_cli_entrypoint_before_publish' }),
    Object.freeze({ domain: 'authority', planned_module: 'src/domains/authority.js', facade: 'authorityService', package_surface: 'source_only_or_bundled_before_publish' }),
    Object.freeze({ domain: 'work_items', planned_module: 'src/domains/work-items.js', facade: 'workItemsService', package_surface: 'source_only_or_bundled_before_publish' }),
    Object.freeze({ domain: 'claims', planned_module: 'src/domains/claims.js', facade: 'claimsService', package_surface: 'source_only_or_bundled_before_publish' }),
    Object.freeze({ domain: 'target', planned_module: 'src/domains/target.js', facade: 'targetService', package_surface: 'source_only_or_bundled_before_publish' }),
    Object.freeze({ domain: 'release_package', planned_module: 'src/domains/release-package.js', facade: 'releasePackageService', package_surface: 'source_only_or_bundled_before_publish' })
  ]),
  partition_sequence: Object.freeze([
    Object.freeze({ order: 1, gate: 'plan', action: 'declare module boundaries and checks without moving files' }),
    Object.freeze({ order: 2, gate: 'extract-no-behavior-change', action: 'move pure constants/helpers behind source modules with golden output tests' }),
    Object.freeze({ order: 3, gate: 'adapter-preservation', action: 'keep cli/agent-onboard.js as the only published executable adapter' }),
    Object.freeze({ order: 4, gate: 'bundle-or-allowlist', action: 'either bundle modules into cli/agent-onboard.js before publish or explicitly admit any additional published files' }),
    Object.freeze({ order: 5, gate: 'installed-parity', action: 'prove npx installed package outputs match source architecture checks' })
  ]),
  invariants: Object.freeze({
    command_router_remains_table_driven: true,
    every_canonical_domain_has_one_facade: true,
    every_planned_module_maps_to_canonical_domain: true,
    cli_entrypoint_remains_published_bin_target: true,
    npm_package_allowlist_unchanged_for_this_gate: true,
    physical_partition_not_applied_by_this_gate: true,
    source_plan_file_is_source_only: true
  }),
  boundary: Object.freeze({
    partition_plan_command_writes_files: false,
    partition_check_command_writes_files: false,
    moves_source_files: false,
    creates_source_modules: false,
    writes_package_root: false,
    writes_target_repository_state: false,
    git_mutation: false,
    installs_dependencies: false,
    runs_package_manager: false,
    runs_build_test_deploy: false,
    publishes_package: false,
    mutates_registry: false,
    package_allowlist_unchanged: true
  })
});


const PUBLIC_SOURCE_DOMAIN_EXTRACTION_REHEARSAL = Object.freeze({
  schema: 'agent-onboard-public-source-domain-extraction-rehearsal-001',
  title: 'Agent-Onboard Public Source Domain Extraction Rehearsal',
  package_name: 'agent-onboard',
  release_line: RELEASE_LINE,
  command: 'agent-onboard architecture --extraction-rehearsal',
  check_command: 'agent-onboard architecture --extraction-check',
  rehearsal_file: '.agent-onboard/source-extraction-rehearsal.json',
  purpose: 'Rehearse source-domain extraction behind the admitted facades without moving source files, changing command outputs, or expanding the npm package surface.',
  prerequisite_plan_file: PUBLIC_SOURCE_DOMAIN_MODULE_PARTITION_PLAN.plan_file,
  rehearsal_status: 'rehearsed_not_applied',
  entrypoint_preservation: Object.freeze({
    published_entrypoint: 'cli/agent-onboard.js',
    entrypoint_remains_only_published_bin_target: true,
    physical_modules_created_by_this_gate: false,
    runtime_output_change_allowed: false,
    package_allowlist_change_allowed: false
  }),
  extraction_rehearsal_units: Object.freeze(PUBLIC_SOURCE_DOMAIN_MODULE_PARTITION_PLAN.planned_source_modules.map((module) => Object.freeze({
    domain: module.domain,
    facade: module.facade,
    rehearsal_module: module.planned_module,
    extraction_mode: 'rehearsal_only_no_file_created',
    source_of_truth_before_application: 'cli/agent-onboard.js',
    package_surface: module.package_surface
  }))),
  golden_output_scope: Object.freeze([
    'status',
    'architecture --map',
    'architecture --router',
    'architecture --facades',
    'architecture --partition-check',
    'architecture --extraction-check',
    'authority --check',
    'target runtime --check',
    'release --surface-check',
    'release --check'
  ]),
  application_sequence: Object.freeze([
    Object.freeze({ order: 1, gate: 'rehearsal', action: 'declare extraction units and no-behavior-change checks without creating modules' }),
    Object.freeze({ order: 2, gate: 'golden-output-freeze', action: 'freeze selected command outputs before any physical extraction' }),
    Object.freeze({ order: 3, gate: 'source-module-application', action: 'create source modules behind facades with CLI adapter preserved' }),
    Object.freeze({ order: 4, gate: 'bundle-or-allowlist', action: 'preserve compact npm surface by bundling or explicitly admitting additional files' }),
    Object.freeze({ order: 5, gate: 'installed-parity', action: 'prove source and installed package checks remain equivalent' })
  ]),
  invariants: Object.freeze({
    partition_plan_must_pass: true,
    every_rehearsal_unit_maps_to_canonical_domain: true,
    every_rehearsal_unit_maps_to_facade: true,
    no_physical_module_created_by_this_gate: true,
    no_source_file_moved_by_this_gate: true,
    cli_entrypoint_remains_runtime_source_of_truth: true,
    npm_package_allowlist_unchanged_for_this_gate: true,
    rehearsal_file_is_source_only: true
  }),
  boundary: Object.freeze({
    extraction_rehearsal_command_writes_files: false,
    extraction_check_command_writes_files: false,
    creates_source_modules: false,
    moves_source_files: false,
    changes_runtime_outputs: false,
    writes_package_root: false,
    writes_target_repository_state: false,
    git_mutation: false,
    installs_dependencies: false,
    runs_package_manager: false,
    runs_build_test_deploy: false,
    publishes_package: false,
    mutates_registry: false,
    package_allowlist_unchanged: true
  })
});

const PUBLIC_SOURCE_EXTRACTION_GOLDEN_OUTPUT_FREEZE = Object.freeze({
  schema: 'agent-onboard-public-source-extraction-golden-output-freeze-001',
  title: 'Agent-Onboard Public Source Extraction Golden Output Freeze',
  package_name: 'agent-onboard',
  release_line: RELEASE_LINE,
  command: 'agent-onboard architecture --golden-outputs',
  check_command: 'agent-onboard architecture --golden-check',
  freeze_file: '.agent-onboard/source-extraction-golden-outputs.json',
  purpose: 'Freeze the command-output contract used to compare behavior before any physical source-domain extraction, while avoiding hard-coded package-version sprawl in source docs and tests.',
  prerequisite_rehearsal_file: PUBLIC_SOURCE_DOMAIN_EXTRACTION_REHEARSAL.rehearsal_file,
  freeze_status: 'frozen_before_physical_extraction',
  version_policy: Object.freeze({
    single_source_of_truth: 'package.json#version',
    runtime_constant_source: "require('../package.json').version",
    source_docs_must_not_hardcode_current_patch_version: true,
    tests_must_not_hardcode_current_patch_version: true,
    generated_post_publish_handoff_may_emit_version_pinned_commands: true
  }),
  golden_commands: Object.freeze([
    Object.freeze({ command: 'status', schema: 'agent-onboard-status-001', required_fields: Object.freeze(['schema', 'status', 'version', 'release_line']) }),
    Object.freeze({ command: 'architecture --map', schema: 'agent-onboard-public-architecture-map-result-001', required_fields: Object.freeze(['schema', 'status', 'version', 'release_line', 'map']) }),
    Object.freeze({ command: 'architecture --router', schema: 'agent-onboard-public-command-router-result-001', required_fields: Object.freeze(['schema', 'status', 'version', 'release_line', 'router']) }),
    Object.freeze({ command: 'architecture --facades', schema: 'agent-onboard-public-domain-service-facades-result-001', required_fields: Object.freeze(['schema', 'status', 'version', 'release_line', 'facades']) }),
    Object.freeze({ command: 'architecture --partition-check', schema: 'agent-onboard-public-source-domain-module-partition-plan-check-result-001', required_fields: Object.freeze(['schema', 'status', 'version', 'release_line', 'validated']) }),
    Object.freeze({ command: 'architecture --extraction-check', schema: 'agent-onboard-public-source-domain-extraction-rehearsal-check-result-001', required_fields: Object.freeze(['schema', 'status', 'version', 'release_line', 'validated']) }),
    Object.freeze({ command: 'architecture --golden-check', schema: 'agent-onboard-public-source-extraction-golden-output-freeze-check-result-001', required_fields: Object.freeze(['schema', 'status', 'version', 'release_line', 'validated']) }),
    Object.freeze({ command: 'release --version-sprawl-check', schema: 'agent-onboard-public-version-reference-policy-check-result-001', required_fields: Object.freeze(['schema', 'status', 'version', 'release_line', 'validated']) }),
    Object.freeze({ command: 'authority --check', schema: 'agent-onboard-public-authority-first-read-index-check-result-001', required_fields: Object.freeze(['schema', 'status', 'version', 'release_line', 'validated']) }),
    Object.freeze({ command: 'target runtime --check', schema: 'agent-onboard-public-target-runtime-namespace-check-result-001', required_fields: Object.freeze(['schema', 'status', 'version', 'release_line', 'validated']) }),
    Object.freeze({ command: 'release --surface-check', schema: 'agent-onboard-public-package-surface-preservation-check-result-001', required_fields: Object.freeze(['schema', 'status', 'version', 'release_line', 'validated']) }),
    Object.freeze({ command: 'release --check', schema: 'agent-onboard-public-release-check-result-007', required_fields: Object.freeze(['schema', 'status', 'version', 'release_line', 'validated']) })
  ]),
  boundary: Object.freeze({
    golden_outputs_command_writes_files: false,
    golden_check_command_writes_files: false,
    creates_source_modules: false,
    moves_source_files: false,
    changes_runtime_outputs: false,
    writes_package_root: false,
    writes_target_repository_state: false,
    git_mutation: false,
    installs_dependencies: false,
    runs_package_manager: false,
    runs_build_test_deploy: false,
    publishes_package: false,
    mutates_registry: false,
    package_allowlist_unchanged: true
  })
});


const PUBLIC_SOURCE_MODULE_EXTRACTION_ADAPTER_BOUNDARY = Object.freeze({
  schema: 'agent-onboard-public-source-module-extraction-adapter-boundary-001',
  title: 'Agent-Onboard Public Source Module Extraction Adapter Boundary',
  package_name: 'agent-onboard',
  release_line: RELEASE_LINE,
  command: 'agent-onboard architecture --adapter-boundary',
  check_command: 'agent-onboard architecture --adapter-check',
  boundary_file: '.agent-onboard/source-module-extraction-adapter-boundary.json',
  purpose: 'Declare the stable adapter boundary that preserves cli/agent-onboard.js as the public runtime and npm bin target before physical source-domain modules are extracted.',
  prerequisite_golden_outputs_file: PUBLIC_SOURCE_EXTRACTION_GOLDEN_OUTPUT_FREEZE.freeze_file,
  adapter_status: 'declared_before_physical_extraction',
  published_adapter: Object.freeze({
    path: 'cli/agent-onboard.js',
    role: 'stable published CLI adapter and bundle boundary',
    remains_only_published_bin_target: true,
    delegates_to: Object.freeze(['dispatchCommand', 'COMMAND_ROUTE_HANDLERS', 'DOMAIN_SERVICE_FACADES'])
  }),
  adapter_flow: Object.freeze([
    'published bin entrypoint',
    'CLI adapter boundary',
    'table-driven command router',
    'domain service facade',
    'future source module or current bundled implementation',
    'state reader/writer boundary'
  ]),
  adapter_units: Object.freeze(PUBLIC_SOURCE_DOMAIN_MODULE_PARTITION_PLAN.planned_source_modules.map((module) => Object.freeze({
    domain: module.domain,
    facade: module.facade,
    future_source_module: module.planned_module,
    adapter_entrypoint: 'cli/agent-onboard.js',
    runtime_export_status: 'not_exported_as_public_api',
    extraction_mode: 'adapter_boundary_only_no_module_created'
  }))),
  invariants: Object.freeze({
    golden_outputs_must_pass: true,
    cli_entrypoint_remains_published_bin_target: true,
    every_adapter_unit_maps_to_canonical_domain: true,
    every_adapter_unit_maps_to_facade: true,
    public_api_stays_cli_commands_not_source_imports: true,
    no_physical_module_created_by_this_gate: true,
    no_source_file_moved_by_this_gate: true,
    npm_package_allowlist_unchanged_for_this_gate: true,
    adapter_boundary_file_is_source_only: true
  }),
  boundary: Object.freeze({
    adapter_boundary_command_writes_files: false,
    adapter_check_command_writes_files: false,
    creates_source_modules: false,
    moves_source_files: false,
    changes_runtime_outputs: false,
    publishes_source_modules_as_public_api: false,
    writes_package_root: false,
    writes_target_repository_state: false,
    git_mutation: false,
    installs_dependencies: false,
    runs_package_manager: false,
    runs_build_test_deploy: false,
    publishes_package: false,
    mutates_registry: false,
    package_allowlist_unchanged: true
  })
});


const PUBLIC_SOURCE_MODULE_EXTRACTION_FIRST_SLICE = Object.freeze({
  schema: 'agent-onboard-public-source-module-extraction-first-slice-001',
  title: 'Agent-Onboard Public Source Module Extraction First Slice',
  package_name: 'agent-onboard',
  release_line: RELEASE_LINE,
  command: 'agent-onboard architecture --first-slice',
  check_command: 'agent-onboard architecture --first-slice-check',
  first_slice_file: '.agent-onboard/source-module-extraction-first-slice.json',
  source_module: 'src/domains/core.js',
  purpose: 'Create the first source-only domain module slice for the core domain while preserving the published CLI adapter, runtime output contract, and compact npm package surface.',
  prerequisite_adapter_boundary_file: PUBLIC_SOURCE_MODULE_EXTRACTION_ADAPTER_BOUNDARY.boundary_file,
  first_slice_status: 'source_only_shadow_module_applied',
  extracted_domain: Object.freeze({
    id: 'core',
    facade: 'coreService',
    service: 'coreService',
    planned_module: 'src/domains/core.js',
    runtime_dependency_status: 'not_required_by_published_cli_runtime',
    published_api_status: 'not_public_import_api',
    owns_commands: Object.freeze(['help', 'version', 'status', 'architecture']),
    writes_files: false,
    state_writer: false
  }),
  expected_module_export_names: Object.freeze(['CORE_DOMAIN_FIRST_SLICE', 'getCoreDomainFirstSlice']),
  parity_scope: Object.freeze([
    'domain id matches public architecture map',
    'facade matches public domain service facade',
    'module owns only read-only core commands',
    'module is source-only and absent from npm package allowlist',
    'CLI runtime does not require src/domains/core.js in installed package context'
  ]),
  boundary: Object.freeze({
    first_slice_command_writes_files: false,
    first_slice_check_command_writes_files: false,
    creates_exactly_one_source_module: true,
    created_source_module: 'src/domains/core.js',
    creates_non_core_source_modules: false,
    moves_existing_source_files: false,
    changes_runtime_outputs: false,
    changes_cli_runtime_dependency_graph: false,
    exports_source_module_as_public_api: false,
    writes_package_root: false,
    writes_target_repository_state: false,
    git_mutation: false,
    installs_dependencies: false,
    runs_package_manager: false,
    runs_build_test_deploy: false,
    publishes_package: false,
    mutates_registry: false,
    package_allowlist_unchanged: true
  })
});


const PUBLIC_SOURCE_MODULE_EXTRACTION_BUNDLE_PARITY = Object.freeze({
  schema: 'agent-onboard-public-source-module-extraction-bundle-parity-001',
  title: 'Agent-Onboard Public Source Module Extraction Bundle Parity',
  package_name: 'agent-onboard',
  release_line: RELEASE_LINE,
  command: 'agent-onboard architecture --bundle-parity',
  check_command: 'agent-onboard architecture --bundle-parity-check',
  bundle_parity_file: '.agent-onboard/source-module-extraction-bundle-parity.json',
  source_module: PUBLIC_SOURCE_MODULE_EXTRACTION_FIRST_SLICE.source_module,
  purpose: 'Prove that the source-only core domain slice and the bundled CLI architecture view remain equivalent before deeper physical extraction or bundle generation is admitted.',
  prerequisite_first_slice_file: PUBLIC_SOURCE_MODULE_EXTRACTION_FIRST_SLICE.first_slice_file,
  parity_status: 'source_slice_matches_bundled_cli_view',
  parity_scope: Object.freeze([
    'core domain id and facade match between source slice and bundled architecture map',
    'core-owned command set matches bundled command router routes for the core domain',
    'source module remains source-only and excluded from npm package allowlist',
    'installed package context may omit source-only modules while bundled CLI checks still pass'
  ]),
  bundled_view: Object.freeze({
    source_of_truth: 'cli/agent-onboard.js bundled runtime metadata',
    public_bin_entrypoint: 'cli/agent-onboard.js',
    published_package_file_count: 4
  }),
  boundary: Object.freeze({
    bundle_parity_command_writes_files: false,
    bundle_parity_check_command_writes_files: false,
    creates_bundle_artifact: false,
    creates_source_modules: false,
    moves_existing_source_files: false,
    changes_runtime_outputs: false,
    changes_cli_runtime_dependency_graph: false,
    exports_source_module_as_public_api: false,
    writes_package_root: false,
    writes_target_repository_state: false,
    git_mutation: false,
    installs_dependencies: false,
    runs_package_manager: false,
    runs_build_test_deploy: false,
    publishes_package: false,
    mutates_registry: false,
    package_allowlist_unchanged: true
  })
});


const PUBLIC_SOURCE_MODULE_EXTRACTION_RUNTIME_BRIDGE = Object.freeze({
  schema: 'agent-onboard-public-source-module-extraction-runtime-bridge-001',
  title: 'Agent-Onboard Public Source Module Extraction Runtime Bridge',
  package_name: 'agent-onboard',
  release_line: RELEASE_LINE,
  command: 'agent-onboard architecture --runtime-bridge',
  check_command: 'agent-onboard architecture --runtime-bridge-check',
  runtime_bridge_file: '.agent-onboard/source-module-extraction-runtime-bridge.json',
  source_module: PUBLIC_SOURCE_MODULE_EXTRACTION_FIRST_SLICE.source_module,
  purpose: 'Admit a guarded runtime bridge that may load the source-only core module in source repository context while falling back to bundled CLI metadata in installed package context.',
  prerequisite_bundle_parity_file: PUBLIC_SOURCE_MODULE_EXTRACTION_BUNDLE_PARITY.bundle_parity_file,
  bridge_status: 'source_context_optional_runtime_bridge_applied',
  bridge_resolution_order: Object.freeze([
    'source repository context: try src/domains/core.js through guarded optional require',
    'installed package context: use bundled CLI core metadata fallback',
    'failure mode: fail closed if source module is present but invalid'
  ]),
  runtime_bridge: Object.freeze({
    bridge_function: 'resolveCoreDomainRuntimeBridge',
    source_context_loads_module_when_present: true,
    installed_context_allows_missing_source_module: true,
    fallback: 'bundledCoreDomainForParity',
    public_import_api: false,
    writes_files: false,
    state_writer: false
  }),
  boundary: Object.freeze({
    runtime_bridge_command_writes_files: false,
    runtime_bridge_check_command_writes_files: false,
    creates_source_modules: false,
    moves_existing_source_files: false,
    changes_public_cli_outputs: false,
    exports_source_module_as_public_api: false,
    source_context_optional_require_only: true,
    installed_context_fallback_required: true,
    writes_package_root: false,
    writes_target_repository_state: false,
    git_mutation: false,
    installs_dependencies: false,
    runs_package_manager: false,
    runs_build_test_deploy: false,
    publishes_package: false,
    mutates_registry: false,
    package_allowlist_unchanged: true
  })
});


const PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE = Object.freeze({
  schema: 'agent-onboard-public-source-module-extraction-installed-fallback-smoke-001',
  title: 'Agent-Onboard Public Source Module Extraction Installed Fallback Smoke',
  package_name: 'agent-onboard',
  release_line: RELEASE_LINE,
  command: 'agent-onboard architecture --installed-fallback-smoke',
  check_command: 'agent-onboard architecture --installed-fallback-check',
  installed_fallback_smoke_file: '.agent-onboard/source-module-extraction-installed-fallback-smoke.json',
  source_module: PUBLIC_SOURCE_MODULE_EXTRACTION_RUNTIME_BRIDGE.source_module,
  prerequisite_runtime_bridge_file: PUBLIC_SOURCE_MODULE_EXTRACTION_RUNTIME_BRIDGE.runtime_bridge_file,
  purpose: 'Freeze an installed-package fallback smoke contract proving the compact npm tarball can omit source modules while architecture and release checks still fall back to bundled CLI metadata.',
  smoke_status: 'installed_fallback_smoke_admitted',
  projected_installed_context: Object.freeze({
    package_context: 'installed_package',
    source_module_present: false,
    runtime_bridge_resolution_mode: 'bundled_fallback',
    source_module_must_remain_out_of_pack: true,
    release_check_skips_missing_source_ledger: true,
    architecture_checks_do_not_require_source_context_files: true
  }),
  validated_surfaces: Object.freeze([
    'architecture --runtime-bridge-check',
    'architecture --installed-fallback-check',
    'architecture --check',
    'release --surface-check',
    'release --architecture-parity-smoke',
    'release --check'
  ]),
  boundary: Object.freeze({
    installed_fallback_smoke_command_writes_files: false,
    installed_fallback_check_command_writes_files: false,
    creates_temp_files: false,
    creates_source_modules: false,
    moves_existing_source_files: false,
    changes_public_cli_outputs: false,
    exports_source_module_as_public_api: false,
    source_modules_remain_out_of_npm_pack: true,
    installed_context_fallback_required: true,
    writes_package_root: false,
    writes_target_repository_state: false,
    git_mutation: false,
    installs_dependencies: false,
    runs_package_manager: false,
    runs_build_test_deploy: false,
    publishes_package: false,
    mutates_registry: false,
    package_allowlist_unchanged: true
  })
});


const PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN = Object.freeze({
  schema: 'agent-onboard-public-source-module-extraction-second-slice-plan-001',
  title: 'Agent-Onboard Public Source Module Extraction Second Slice Plan',
  package_name: 'agent-onboard',
  release_line: RELEASE_LINE,
  command: 'agent-onboard architecture --second-slice-plan',
  check_command: 'agent-onboard architecture --second-slice-check',
  second_slice_plan_file: '.agent-onboard/source-module-extraction-second-slice-plan.json',
  prerequisite_installed_fallback_smoke_file: PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.installed_fallback_smoke_file,
  purpose: 'Plan the second source-domain module slice after the core first slice while preserving installed-package fallback, compact npm surface, and source artifact git tracking.',
  second_slice_status: 'planned_not_created',
  planned_second_slice: Object.freeze({
    domain: 'authority',
    facade: 'authorityService',
    service: 'authorityService',
    planned_module: 'src/domains/authority.js',
    extraction_scope: 'authority read-order, first-read, and guard metadata only; write-capable agents command extraction stays out of this slice',
    source_module_created_by_this_gate: false,
    published_import_api: false,
    writes_files: false,
    state_writer: false
  }),
  gitignore_policy: Object.freeze({
    gitignore_file: '.gitignore',
    required_unignore_entries: Object.freeze([
      '!.agent-onboard/source-partition-plan.json',
      '!.agent-onboard/source-extraction-rehearsal.json',
      '!.agent-onboard/source-extraction-golden-outputs.json',
      '!.agent-onboard/source-module-extraction-adapter-boundary.json',
      '!.agent-onboard/source-module-extraction-first-slice.json',
      '!.agent-onboard/source-module-extraction-bundle-parity.json',
      '!.agent-onboard/source-module-extraction-runtime-bridge.json',
      '!.agent-onboard/source-module-extraction-installed-fallback-smoke.json',
      '!.agent-onboard/source-module-extraction-second-slice-plan.json',
      '!.agent-onboard/source-module-extraction-second-slice-first-slice.json',
      '!src/',
      '!src/domains/',
      '!src/domains/*.js'
    ]),
    forbidden_ignore_entries: Object.freeze(['src/', 'src/**', 'src/domains/', 'src/domains/*', 'src/domains/**'])
  }),
  boundary: Object.freeze({
    second_slice_plan_command_writes_files: false,
    second_slice_check_command_writes_files: false,
    creates_source_module: false,
    created_source_module: null,
    planned_module_must_be_absent_in_this_gate: true,
    moves_existing_source_files: false,
    changes_public_cli_outputs: false,
    exports_source_module_as_public_api: false,
    writes_package_root: false,
    writes_target_repository_state: false,
    git_mutation: false,
    installs_dependencies: false,
    runs_package_manager: false,
    runs_build_test_deploy: false,
    publishes_package: false,
    mutates_registry: false,
    package_allowlist_unchanged: true
  })
});


const PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_FIRST_SLICE = Object.freeze({
  schema: 'agent-onboard-public-source-module-extraction-second-slice-first-slice-001',
  title: 'Agent-Onboard Public Source Module Extraction Second Slice First Slice',
  package_name: 'agent-onboard',
  release_line: RELEASE_LINE,
  command: 'agent-onboard architecture --second-slice-first-slice',
  check_command: 'agent-onboard architecture --second-slice-first-slice-check',
  second_slice_first_slice_file: '.agent-onboard/source-module-extraction-second-slice-first-slice.json',
  source_module: 'src/domains/authority.js',
  prerequisite_second_slice_plan_file: PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.second_slice_plan_file,
  purpose: 'Create the authority source-only domain module slice after the second slice plan while preserving installed-package fallback, compact npm surface, and CLI adapter output stability.',
  second_slice_first_slice_status: 'source_only_shadow_module_applied',
  extracted_domain: Object.freeze({
    id: 'authority',
    facade: 'authorityService',
    service: 'authorityService',
    module: 'src/domains/authority.js',
    runtime_dependency_status: 'not_required_by_published_cli_runtime',
    extraction_scope: 'authority read-order, first-read, and guard metadata only; write-capable agents command extraction remains excluded'
  }),
  expected_module_export_names: Object.freeze(['AUTHORITY_DOMAIN_SECOND_SLICE', 'getAuthorityDomainSecondSlice']),
  expected_read_order_paths: Object.freeze(PUBLIC_AUTHORITY_FIRST_READ_INDEX.read_order.map((item) => item.path)),
  expected_owned_commands: Object.freeze(['authority --first-read', 'authority --check', 'guard --plan', 'guard --check-boundary']),
  boundary: Object.freeze({
    second_slice_first_slice_command_writes_files: false,
    second_slice_first_slice_check_command_writes_files: false,
    creates_exactly_one_source_module: true,
    created_source_module: 'src/domains/authority.js',
    moves_existing_source_files: false,
    changes_public_cli_outputs: false,
    changes_cli_runtime_dependency_graph: false,
    exports_source_module_as_public_api: false,
    excludes_write_capable_agents_command: true,
    writes_package_root: false,
    writes_target_repository_state: false,
    git_mutation: false,
    installs_dependencies: false,
    runs_package_manager: false,
    runs_build_test_deploy: false,
    publishes_package: false,
    mutates_registry: false,
    package_allowlist_unchanged: true
  })
});


const PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_BUNDLE_PARITY = Object.freeze({
  schema: 'agent-onboard-public-source-module-extraction-authority-bundle-parity-001',
  title: 'Agent-Onboard Public Source Module Extraction Authority Bundle Parity',
  package_name: 'agent-onboard',
  release_line: RELEASE_LINE,
  command: 'agent-onboard architecture --authority-bundle-parity',
  check_command: 'agent-onboard architecture --authority-bundle-parity-check',
  authority_bundle_parity_file: '.agent-onboard/source-module-extraction-authority-bundle-parity.json',
  source_module: PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_FIRST_SLICE.source_module,
  purpose: 'Prove that the source-only authority domain slice and the bundled CLI architecture/authority view remain equivalent before any authority runtime bridge is admitted.',
  prerequisite_second_slice_first_slice_file: PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_FIRST_SLICE.second_slice_first_slice_file,
  parity_status: 'authority_source_slice_matches_bundled_cli_view',
  parity_scope: Object.freeze([
    'authority domain id and facade match between source slice and bundled architecture map',
    'authority-owned read-only command set matches bundled command router authority and guard routes admitted for this slice',
    'authority read order matches the bundled first-read index',
    'write-capable agents command extraction remains excluded',
    'source module remains source-only and excluded from npm package allowlist',
    'installed package context may omit source-only modules while bundled CLI checks still pass'
  ]),
  bundled_view: Object.freeze({
    source_of_truth: 'cli/agent-onboard.js bundled authority and architecture metadata',
    public_bin_entrypoint: 'cli/agent-onboard.js',
    published_package_file_count: 4
  }),
  boundary: Object.freeze({
    authority_bundle_parity_command_writes_files: false,
    authority_bundle_parity_check_command_writes_files: false,
    creates_bundle_artifact: false,
    creates_source_modules: false,
    moves_existing_source_files: false,
    changes_public_cli_outputs: false,
    changes_cli_runtime_dependency_graph: false,
    exports_source_module_as_public_api: false,
    includes_write_capable_agents_command: false,
    writes_package_root: false,
    writes_target_repository_state: false,
    git_mutation: false,
    installs_dependencies: false,
    runs_package_manager: false,
    runs_build_test_deploy: false,
    publishes_package: false,
    mutates_registry: false,
    package_allowlist_unchanged: true
  })
});


const PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_RUNTIME_BRIDGE = Object.freeze({
  schema: 'agent-onboard-public-source-module-extraction-authority-runtime-bridge-001',
  title: 'Agent-Onboard Public Source Module Extraction Authority Runtime Bridge',
  package_name: 'agent-onboard',
  release_line: RELEASE_LINE,
  command: 'agent-onboard architecture --authority-runtime-bridge',
  check_command: 'agent-onboard architecture --authority-runtime-bridge-check',
  authority_runtime_bridge_file: '.agent-onboard/source-module-extraction-authority-runtime-bridge.json',
  source_module: PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_BUNDLE_PARITY.source_module,
  purpose: 'Admit a guarded runtime bridge that may load the source-only authority module in source repository context while falling back to bundled CLI authority metadata in installed package context.',
  prerequisite_authority_bundle_parity_file: PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_BUNDLE_PARITY.authority_bundle_parity_file,
  bridge_status: 'authority_source_context_optional_runtime_bridge_applied',
  bridge_resolution_order: Object.freeze([
    'source repository context: try src/domains/authority.js through guarded optional require',
    'installed package context: use bundled CLI authority metadata fallback',
    'failure mode: fail closed if source module is present but invalid'
  ]),
  runtime_bridge: Object.freeze({
    bridge_function: 'resolveAuthorityDomainRuntimeBridge',
    source_context_loads_module_when_present: true,
    installed_context_allows_missing_source_module: true,
    fallback: 'bundledAuthorityDomainForParity',
    public_import_api: false,
    writes_files: false,
    state_writer: false,
    includes_write_capable_agents_command: false
  }),
  gitignore_policy: Object.freeze({
    policy: 'track canonical source JSON by default; ignore only local/runtime/cache subtrees',
    forbidden_sprawl: 'do not add one .gitignore unignore line per future .agent-onboard artifact',
    canonical_source_namespace_trackable: '.agent-onboard/*.json',
    local_state_ignored: Object.freeze(['.agent-onboard/tmp/', '.agent-onboard/cache/', '.agent-onboard/local/', '.agent-onboard/*.local.json', '.agent-onboard/*.tmp.json', '.agent-onboard/*.log'])
  }),
  boundary: Object.freeze({
    authority_runtime_bridge_command_writes_files: false,
    authority_runtime_bridge_check_command_writes_files: false,
    creates_source_modules: false,
    moves_existing_source_files: false,
    changes_public_cli_outputs: false,
    exports_source_module_as_public_api: false,
    source_context_optional_require_only: true,
    installed_context_fallback_required: true,
    includes_write_capable_agents_command: false,
    writes_package_root: false,
    writes_target_repository_state: false,
    git_mutation: false,
    installs_dependencies: false,
    runs_package_manager: false,
    runs_build_test_deploy: false,
    publishes_package: false,
    mutates_registry: false,
    package_allowlist_unchanged: true
  })
});


const PUBLIC_ARCHITECTURE_M1_CLOSURE_M2_SEED = Object.freeze({
  schema: 'agent-onboard-public-architecture-m1-closure-m2-seed-001',
  title: 'Agent-Onboard Public Architecture M1 Closure And M2 Seed Gate',
  package_name: 'agent-onboard',
  release_line: RELEASE_LINE,
  command: 'agent-onboard architecture --m2-seed',
  check_command: 'agent-onboard architecture --m2-seed-check',
  transition_file: '.agent-onboard/public-architecture-m1-closure-m2-seed.json',
  stage_id: 'P1S3',
  closed_milestone_id: 'P1S3M1',
  opened_milestone_id: 'P1S3M2',
  seed_work_item_id: ['P', 1, 'S', 3, 'M', 2, 'W', 1].join(''),
  next_work_item_id: ['P', 1, 'S', 3, 'M', 2, 'W', 2].join(''),
  closed_milestone_title: 'Public architecture kernel milestone',
  opened_milestone_title: 'Public source-domain extraction stabilization milestone',
  purpose: 'Close the public architecture kernel milestone after core and authority runtime bridges are admitted, then seed M2 as the stabilization line for the remaining public source-domain extraction work.',
  prerequisite_closed_work_items: Object.freeze(Array.from({ length: 19 }, (_, index) => ['P', 1, 'S', 3, 'M', 1, 'W', index + 1].join(''))),
  m2_initial_scope: Object.freeze([
    Object.freeze({
      id: ['P', 1, 'S', 3, 'M', 2, 'W', 1].join(''),
      title: 'Public architecture M1 closure and M2 seed gate',
      expected_status: 'closed',
      role: 'transition gate'
    }),
    Object.freeze({
      id: ['P', 1, 'S', 3, 'M', 2, 'W', 2].join(''),
      title: 'Public work-items domain source extraction planning gate',
      expected_status: 'open',
      role: 'next executable source-domain extraction gate'
    })
  ]),
  m2_non_goals: Object.freeze([
    'do not create src/domains/work-items.js in the transition gate',
    'do not expand the npm package allowlist',
    'do not change public CLI output contracts beyond this explicit transition surface',
    'do not publish, tag, push, or mutate registry state'
  ]),
  boundary: Object.freeze({
    m2_seed_command_writes_files: false,
    m2_seed_check_command_writes_files: false,
    creates_source_modules: false,
    moves_existing_source_files: false,
    exports_source_module_as_public_api: false,
    changes_command_router: false,
    changes_existing_runtime_outputs: false,
    writes_package_root: false,
    writes_target_repository_state: false,
    git_mutation: false,
    installs_dependencies: false,
    runs_package_manager: false,
    runs_build_test_deploy: false,
    publishes_package: false,
    mutates_registry: false,
    package_allowlist_unchanged: true
  })
});


const PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_PLAN = Object.freeze({
  schema: 'agent-onboard-public-work-items-domain-source-extraction-plan-001',
  title: 'Agent-Onboard Public Work-Items Domain Source Extraction Planning Gate',
  package_name: 'agent-onboard',
  release_line: RELEASE_LINE,
  command: 'agent-onboard architecture --work-items-plan',
  check_command: 'agent-onboard architecture --work-items-check',
  plan_file: '.agent-onboard/source-module-extraction-work-items-plan.json',
  milestone_id: 'P1S3M2',
  work_item_id: ['P', 1, 'S', 3, 'M', 2, 'W', 2].join(''),
  next_work_item_id: ['P', 1, 'S', 3, 'M', 2, 'W', 3].join(''),
  domain: Object.freeze({
    id: 'work_items',
    facade: 'workItemsService',
    command: 'work-items',
    state_file: '.agent-onboard/work-items.json',
    planned_module: 'src/domains/work-items.js',
    planned_contract_schema: 'agent-onboard-public-source-module-work-items-first-slice-001',
    planned_status: 'planned_not_created_by_this_gate'
  }),
  prerequisites: Object.freeze({
    architecture_m1_closure_m2_seed_check: 'agent-onboard architecture --m2-seed-check',
    authority_runtime_bridge_check: 'agent-onboard architecture --authority-runtime-bridge-check',
    package_surface_check: 'agent-onboard release --surface-check'
  }),
  extraction_scope: Object.freeze([
    'work item vocabulary schema and validator metadata',
    'work item list and source ledger read path',
    'work item append/init dry-run and explicit write boundary metadata',
    'claim and close command ownership remains shared with the claims domain until a later claims-domain gate'
  ]),
  excluded_scope: Object.freeze([
    'do not create src/domains/work-items.js in this planning gate',
    'do not move validateWorkItems or work-items command handlers in this planning gate',
    'do not extract claims-domain behavior from work-items --claim or work-items --close yet',
    'do not expand the npm package allowlist',
    'do not change public CLI output contracts'
  ]),
  followup_work_items: Object.freeze([
    Object.freeze({ id: ['P', 1, 'S', 3, 'M', 2, 'W', 3].join(''), title: 'Public work-items domain source extraction first-slice gate', expected_status: 'open' })
  ]),
  boundary: Object.freeze({
    work_items_plan_command_writes_files: false,
    work_items_check_command_writes_files: false,
    creates_source_modules: false,
    moves_existing_source_files: false,
    changes_public_cli_outputs: false,
    exports_source_module_as_public_api: false,
    writes_package_root: false,
    writes_target_repository_state: false,
    git_mutation: false,
    installs_dependencies: false,
    runs_package_manager: false,
    runs_build_test_deploy: false,
    publishes_package: false,
    mutates_registry: false,
    package_allowlist_unchanged: true
  })
});


const PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_FIRST_SLICE = Object.freeze({
  schema: 'agent-onboard-public-source-module-work-items-first-slice-001',
  title: 'Agent-Onboard Public Work-Items Domain Source Extraction First Slice',
  package_name: 'agent-onboard',
  release_line: RELEASE_LINE,
  command: 'agent-onboard architecture --work-items-first-slice',
  check_command: 'agent-onboard architecture --work-items-first-slice-check',
  first_slice_file: '.agent-onboard/source-module-extraction-work-items-first-slice.json',
  source_module: 'src/domains/work-items.js',
  prerequisite_plan_file: PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_PLAN.plan_file,
  first_slice_status: 'source_only_shadow_module_applied',
  extracted_domain: Object.freeze({
    id: 'work_items',
    facade: 'workItemsService',
    service: 'workItemsService',
    module: 'src/domains/work-items.js',
    state_file: '.agent-onboard/work-items.json',
    runtime_dependency_status: 'not_required_by_published_cli_runtime',
    extraction_scope: 'work item vocabulary, schema/view metadata, list/read validation surface, and explicit init/append write-boundary metadata only; claim and close behavior remains excluded'
  }),
  expected_module_export_names: Object.freeze(['WORK_ITEMS_DOMAIN_FIRST_SLICE', 'getWorkItemsDomainFirstSlice']),
  expected_owned_commands: Object.freeze([
    'work-items --schema',
    'work-items --template',
    'work-items --validate-template',
    'work-items --validate',
    'work-items --list',
    'work-items --init',
    'work-items --append'
  ]),
  excluded_commands: Object.freeze(['work-items --claim', 'work-items --close']),
  next_work_item_id: ['P', 1, 'S', 3, 'M', 2, 'W', 4].join(''),
  boundary: Object.freeze({
    work_items_first_slice_command_writes_files: false,
    work_items_first_slice_check_command_writes_files: false,
    creates_exactly_one_source_module: true,
    created_source_module: 'src/domains/work-items.js',
    moves_existing_source_files: false,
    changes_public_cli_outputs: false,
    changes_cli_runtime_dependency_graph: false,
    exports_source_module_as_public_api: false,
    excludes_claim_and_close_commands: true,
    writes_package_root: false,
    writes_target_repository_state: false,
    git_mutation: false,
    installs_dependencies: false,
    runs_package_manager: false,
    runs_build_test_deploy: false,
    publishes_package: false,
    mutates_registry: false,
    package_allowlist_unchanged: true
  })
});


const PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_BUNDLE_PARITY = Object.freeze({
  schema: 'agent-onboard-public-source-module-work-items-bundle-parity-001',
  title: 'Agent-Onboard Public Work-Items Domain Source Extraction Bundle Parity',
  package_name: 'agent-onboard',
  release_line: RELEASE_LINE,
  command: 'agent-onboard architecture --work-items-bundle-parity',
  check_command: 'agent-onboard architecture --work-items-bundle-parity-check',
  bundle_parity_file: '.agent-onboard/source-module-extraction-work-items-bundle-parity.json',
  source_module: PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_FIRST_SLICE.source_module,
  prerequisite_first_slice_file: PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_FIRST_SLICE.first_slice_file,
  parity_status: 'work_items_source_slice_matches_bundled_cli_view',
  purpose: 'Prove that the source-only work_items first slice and the bundled CLI work-items architecture view remain equivalent before admitting a runtime bridge or deeper claims-domain extraction.',
  parity_scope: Object.freeze([
    'work_items domain id, facade, schema id, and state file match between source slice and bundled CLI view',
    'work_items read/list/init/append surface metadata matches the bundled CLI view',
    'claim and close remain excluded for a later claims-domain extraction gate',
    'source module remains source-only and excluded from npm package allowlist',
    'installed package context may omit source-only modules while bundled CLI checks still pass'
  ]),
  bundled_view: Object.freeze({
    source_of_truth: 'cli/agent-onboard.js bundled work-items runtime metadata',
    public_bin_entrypoint: 'cli/agent-onboard.js',
    published_package_file_count: 4
  }),
  next_work_item_id: ['P', 1, 'S', 3, 'M', 2, 'W', 5].join(''),
  boundary: Object.freeze({
    work_items_bundle_parity_command_writes_files: false,
    work_items_bundle_parity_check_command_writes_files: false,
    creates_bundle_artifact: false,
    creates_source_modules: false,
    moves_existing_source_files: false,
    changes_public_cli_outputs: false,
    changes_cli_runtime_dependency_graph: false,
    exports_source_module_as_public_api: false,
    includes_claim_and_close_commands: false,
    writes_package_root: false,
    writes_target_repository_state: false,
    git_mutation: false,
    installs_dependencies: false,
    runs_package_manager: false,
    runs_build_test_deploy: false,
    publishes_package: false,
    mutates_registry: false,
    package_allowlist_unchanged: true
  })
});


const PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_RUNTIME_BRIDGE = Object.freeze({
  schema: 'agent-onboard-public-source-module-work-items-runtime-bridge-001',
  title: 'Agent-Onboard Public Work-Items Domain Source Extraction Runtime Bridge',
  package_name: 'agent-onboard',
  release_line: RELEASE_LINE,
  command: 'agent-onboard architecture --work-items-runtime-bridge',
  check_command: 'agent-onboard architecture --work-items-runtime-bridge-check',
  runtime_bridge_file: '.agent-onboard/source-module-extraction-work-items-runtime-bridge.json',
  source_module: PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_BUNDLE_PARITY.source_module,
  prerequisite_bundle_parity_file: PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_BUNDLE_PARITY.bundle_parity_file,
  bridge_status: 'work_items_source_context_optional_runtime_bridge_applied',
  purpose: 'Admit a guarded runtime bridge that may load the source-only work_items module in source repository context while falling back to bundled CLI work-items metadata in installed package context.',
  bridge_resolution_order: Object.freeze([
    'source repository context: try src/domains/work-items.js through guarded optional require',
    'installed package context: use bundled CLI work-items metadata fallback',
    'failure mode: fail closed if source module is present but invalid'
  ]),
  runtime_bridge: Object.freeze({
    bridge_function: 'resolveWorkItemsDomainRuntimeBridge',
    source_context_loads_module_when_present: true,
    installed_context_allows_missing_source_module: true,
    fallback: 'bundledWorkItemsDomainForParity',
    public_import_api: false,
    writes_files: false,
    state_writer: false,
    includes_claim_and_close_commands: false
  }),
  next_work_item_id: ['P', 1, 'S', 3, 'M', 2, 'W', 6].join(''),
  boundary: Object.freeze({
    work_items_runtime_bridge_command_writes_files: false,
    work_items_runtime_bridge_check_command_writes_files: false,
    creates_source_modules: false,
    moves_existing_source_files: false,
    changes_public_cli_outputs: false,
    changes_cli_runtime_dependency_graph: false,
    exports_source_module_as_public_api: false,
    source_context_optional_require_only: true,
    installed_context_fallback_required: true,
    includes_claim_and_close_commands: false,
    writes_package_root: false,
    writes_target_repository_state: false,
    git_mutation: false,
    installs_dependencies: false,
    runs_package_manager: false,
    runs_build_test_deploy: false,
    publishes_package: false,
    mutates_registry: false,
    package_allowlist_unchanged: true
  })
});

const PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_INSTALLED_FALLBACK_SMOKE = Object.freeze({
  schema: 'agent-onboard-public-source-module-work-items-installed-fallback-smoke-001',
  title: 'Agent-Onboard Public Work-Items Domain Source Extraction Installed Fallback Smoke',
  package_name: 'agent-onboard',
  release_line: RELEASE_LINE,
  command: 'agent-onboard architecture --work-items-installed-fallback-smoke',
  check_command: 'agent-onboard architecture --work-items-installed-fallback-check',
  installed_fallback_smoke_file: '.agent-onboard/source-module-extraction-work-items-installed-fallback-smoke.json',
  source_module: PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_RUNTIME_BRIDGE.source_module,
  prerequisite_runtime_bridge_file: PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_RUNTIME_BRIDGE.runtime_bridge_file,
  purpose: 'Freeze an installed-package fallback smoke contract proving the compact npm tarball can omit the source-only work_items module while architecture and release checks still fall back to bundled CLI metadata.',
  smoke_status: 'work_items_installed_fallback_smoke_admitted',
  projected_installed_context: Object.freeze({
    package_context: 'installed_package',
    source_module_present: false,
    runtime_bridge_resolution_mode: 'bundled_fallback',
    source_module_must_remain_out_of_pack: true,
    claim_and_close_commands_remain_excluded: true,
    architecture_checks_do_not_require_source_context_files: true
  }),
  validated_surfaces: Object.freeze([
    'architecture --work-items-runtime-bridge-check',
    'architecture --work-items-installed-fallback-check',
    'architecture --check',
    'release --surface-check',
    'release --architecture-parity-smoke',
    'release --check'
  ]),
  next_work_item_id: ['P', 1, 'S', 3, 'M', 2, 'W', 7].join(''),
  boundary: Object.freeze({
    work_items_installed_fallback_smoke_command_writes_files: false,
    work_items_installed_fallback_check_command_writes_files: false,
    claims_plan_command_writes_files: false,
    claims_check_command_writes_files: false,
    creates_temp_files: false,
    creates_source_modules: false,
    moves_existing_source_files: false,
    changes_public_cli_outputs: false,
    changes_cli_runtime_dependency_graph: false,
    exports_source_module_as_public_api: false,
    source_modules_remain_out_of_npm_pack: true,
    installed_context_fallback_required: true,
    includes_claim_and_close_commands: false,
    writes_package_root: false,
    writes_target_repository_state: false,
    git_mutation: false,
    installs_dependencies: false,
    runs_package_manager: false,
    runs_build_test_deploy: false,
    publishes_package: false,
    mutates_registry: false,
    package_allowlist_unchanged: true
  })
});


const PUBLIC_CLAIMS_DOMAIN_SOURCE_EXTRACTION_PLAN = Object.freeze({
  schema: 'agent-onboard-public-claims-domain-source-extraction-plan-001',
  title: 'Agent-Onboard Public Claims Domain Source Extraction Planning Gate',
  package_name: 'agent-onboard',
  release_line: RELEASE_LINE,
  command: 'agent-onboard architecture --claims-plan',
  check_command: 'agent-onboard architecture --claims-check',
  plan_file: '.agent-onboard/source-module-extraction-claims-plan.json',
  milestone_id: 'P1S3M2',
  work_item_id: ['P', 1, 'S', 3, 'M', 2, 'W', 7].join(''),
  next_work_item_id: ['P', 1, 'S', 3, 'M', 2, 'W', 8].join(''),
  domain: Object.freeze({
    id: 'claims',
    facade: 'claimsService',
    command_surface: Object.freeze(['work-items --claim', 'work-items --close']),
    state_file: '.agent-onboard/work-items.json',
    planned_module: 'src/domains/claims.js',
    planned_contract_schema: 'agent-onboard-public-source-module-claims-first-slice-001',
    planned_status: 'planned_not_created_by_this_gate'
  }),
  prerequisites: Object.freeze({
    work_items_installed_fallback_check: 'agent-onboard architecture --work-items-installed-fallback-check',
    package_surface_check: 'agent-onboard release --surface-check'
  }),
  extraction_scope: Object.freeze([
    'claim dry-run/write proposal envelope for existing public work items',
    'claim actor, claimed_at, and note metadata transitions',
    'close dry-run/write closure envelope and handoff evidence checklist',
    'claim/close validation boundaries while the canonical state remains .agent-onboard/work-items.json'
  ]),
  excluded_scope: Object.freeze([
    'do not create src/domains/claims.js in this planning gate',
    'do not move work-items --claim or work-items --close handlers in this planning gate',
    'do not change work-items schema, template, init, validate, list, or append behavior',
    'do not expand the npm package allowlist',
    'do not change public CLI output contracts beyond adding this explicit planning/check surface'
  ]),
  followup_work_items: Object.freeze([
    Object.freeze({ id: ['P', 1, 'S', 3, 'M', 2, 'W', 8].join(''), title: 'Public claims domain source extraction first-slice gate', expected_status: 'open' })
  ]),
  boundary: Object.freeze({
    claims_plan_command_writes_files: false,
    claims_check_command_writes_files: false,
    creates_source_modules: false,
    moves_existing_source_files: false,
    changes_work_items_non_claim_runtime: false,
    changes_public_cli_outputs: false,
    exports_source_module_as_public_api: false,
    writes_package_root: false,
    writes_target_repository_state: false,
    git_mutation: false,
    installs_dependencies: false,
    runs_package_manager: false,
    runs_build_test_deploy: false,
    publishes_package: false,
    mutates_registry: false,
    package_allowlist_unchanged: true
  })
});

const PUBLIC_CLAIMS_DOMAIN_SOURCE_EXTRACTION_FIRST_SLICE = Object.freeze({
  schema: 'agent-onboard-public-source-module-claims-first-slice-001',
  title: 'Agent-Onboard Public Claims Domain Source Extraction First Slice',
  package_name: 'agent-onboard',
  release_line: RELEASE_LINE,
  command: 'agent-onboard architecture --claims-first-slice',
  check_command: 'agent-onboard architecture --claims-first-slice-check',
  first_slice_file: '.agent-onboard/source-module-extraction-claims-first-slice.json',
  source_module: 'src/domains/claims.js',
  prerequisite_plan_file: PUBLIC_CLAIMS_DOMAIN_SOURCE_EXTRACTION_PLAN.plan_file,
  first_slice_status: 'source_only_shadow_module_applied',
  extracted_domain: Object.freeze({
    id: 'claims',
    facade: 'claimsService',
    service: 'claimsService',
    module: 'src/domains/claims.js',
    shared_state_file: '.agent-onboard/work-items.json',
    runtime_dependency_status: 'not_required_by_published_cli_runtime',
    extraction_scope: 'claim and close command metadata, shared ledger write-boundary metadata, and closure handoff contract only; non-claim work-items behavior remains excluded'
  }),
  expected_module_export_names: Object.freeze(['CLAIMS_DOMAIN_FIRST_SLICE', 'getClaimsDomainFirstSlice']),
  expected_owned_commands: Object.freeze([
    'work-items --claim',
    'work-items --close'
  ]),
  excluded_commands: Object.freeze([
    'work-items --schema',
    'work-items --template',
    'work-items --validate-template',
    'work-items --validate',
    'work-items --list',
    'work-items --init',
    'work-items --append'
  ]),
  next_work_item_id: ['P', 1, 'S', 3, 'M', 2, 'W', 9].join(''),
  boundary: Object.freeze({
    claims_first_slice_command_writes_files: false,
    claims_first_slice_check_command_writes_files: false,
    creates_exactly_one_source_module: true,
    created_source_module: 'src/domains/claims.js',
    moves_existing_source_files: false,
    changes_public_cli_outputs: false,
    changes_cli_runtime_dependency_graph: false,
    exports_source_module_as_public_api: false,
    keeps_shared_work_items_ledger: true,
    excludes_non_claim_work_items_commands: true,
    writes_package_root: false,
    writes_target_repository_state: false,
    git_mutation: false,
    installs_dependencies: false,
    runs_package_manager: false,
    runs_build_test_deploy: false,
    publishes_package: false,
    mutates_registry: false,
    package_allowlist_unchanged: true
  })
});


const PUBLIC_CLAIMS_DOMAIN_SOURCE_EXTRACTION_BUNDLE_PARITY = Object.freeze({
  schema: 'agent-onboard-public-source-module-claims-bundle-parity-001',
  title: 'Agent-Onboard Public Claims Domain Source Extraction Bundle Parity',
  package_name: 'agent-onboard',
  release_line: RELEASE_LINE,
  command: 'agent-onboard architecture --claims-bundle-parity',
  check_command: 'agent-onboard architecture --claims-bundle-parity-check',
  bundle_parity_file: '.agent-onboard/source-module-extraction-claims-bundle-parity.json',
  source_module: PUBLIC_CLAIMS_DOMAIN_SOURCE_EXTRACTION_FIRST_SLICE.source_module,
  prerequisite_first_slice_file: PUBLIC_CLAIMS_DOMAIN_SOURCE_EXTRACTION_FIRST_SLICE.first_slice_file,
  parity_status: 'claims_source_slice_matches_bundled_cli_view',
  purpose: 'Prove that the source-only claims first slice and the bundled CLI claims architecture view remain equivalent before admitting a runtime bridge.',
  parity_scope: Object.freeze([
    'claims domain id, facade, service, and shared work-items ledger metadata match between source slice and bundled CLI view',
    'claim and close command ownership matches the bundled CLI claims view',
    'non-claim work-items commands remain excluded from the claims slice',
    'claim/close write-boundary metadata remains explicit while the source module itself remains read-only',
    'source module remains source-only and excluded from npm package allowlist'
  ]),
  bundled_view: Object.freeze({
    source_of_truth: 'cli/agent-onboard.js bundled claims runtime metadata',
    public_bin_entrypoint: 'cli/agent-onboard.js',
    published_package_file_count: 4
  }),
  next_work_item_id: ['P', 1, 'S', 3, 'M', 2, 'W', 10].join(''),
  boundary: Object.freeze({
    claims_bundle_parity_command_writes_files: false,
    claims_bundle_parity_check_command_writes_files: false,
    creates_bundle_artifact: false,
    creates_source_modules: false,
    moves_existing_source_files: false,
    changes_public_cli_outputs: false,
    changes_cli_runtime_dependency_graph: false,
    exports_source_module_as_public_api: false,
    keeps_shared_work_items_ledger: true,
    excludes_non_claim_work_items_commands: true,
    writes_package_root: false,
    writes_target_repository_state: false,
    git_mutation: false,
    installs_dependencies: false,
    runs_package_manager: false,
    runs_build_test_deploy: false,
    publishes_package: false,
    mutates_registry: false,
    package_allowlist_unchanged: true
  })
});


const PUBLIC_CLAIMS_DOMAIN_SOURCE_EXTRACTION_RUNTIME_BRIDGE = Object.freeze({
  schema: 'agent-onboard-public-source-module-claims-runtime-bridge-001',
  title: 'Agent-Onboard Public Claims Domain Source Extraction Runtime Bridge',
  package_name: 'agent-onboard',
  release_line: RELEASE_LINE,
  command: 'agent-onboard architecture --claims-runtime-bridge',
  check_command: 'agent-onboard architecture --claims-runtime-bridge-check',
  runtime_bridge_file: '.agent-onboard/source-module-extraction-claims-runtime-bridge.json',
  source_module: PUBLIC_CLAIMS_DOMAIN_SOURCE_EXTRACTION_BUNDLE_PARITY.source_module,
  prerequisite_bundle_parity_file: PUBLIC_CLAIMS_DOMAIN_SOURCE_EXTRACTION_BUNDLE_PARITY.bundle_parity_file,
  bridge_status: 'claims_source_context_optional_runtime_bridge_applied',
  purpose: 'Admit a guarded runtime bridge that may load the source-only claims module in source repository context while falling back to bundled CLI claims metadata in installed package context.',
  bridge_resolution_order: Object.freeze([
    'source repository context: try src/domains/claims.js through guarded optional require',
    'installed package context: use bundled CLI claims metadata fallback',
    'failure mode: fail closed if source module is present but invalid'
  ]),
  runtime_bridge: Object.freeze({
    bridge_function: 'resolveClaimsDomainRuntimeBridge',
    source_context_loads_module_when_present: true,
    installed_context_allows_missing_source_module: true,
    fallback: 'bundledClaimsDomainForParity',
    public_import_api: false,
    writes_files: false,
    state_writer: false,
    keeps_shared_work_items_ledger: true,
    includes_non_claim_work_items_commands: false
  }),
  next_work_item_id: ['P', 1, 'S', 3, 'M', 2, 'W', 11].join(''),
  boundary: Object.freeze({
    claims_runtime_bridge_command_writes_files: false,
    claims_runtime_bridge_check_command_writes_files: false,
    creates_source_modules: false,
    moves_existing_source_files: false,
    changes_public_cli_outputs: false,
    changes_cli_runtime_dependency_graph: false,
    exports_source_module_as_public_api: false,
    source_context_optional_require_only: true,
    installed_context_fallback_required: true,
    keeps_shared_work_items_ledger: true,
    includes_non_claim_work_items_commands: false,
    writes_package_root: false,
    writes_target_repository_state: false,
    git_mutation: false,
    installs_dependencies: false,
    runs_package_manager: false,
    runs_build_test_deploy: false,
    publishes_package: false,
    mutates_registry: false,
    package_allowlist_unchanged: true
  })
});


const PUBLIC_CLAIMS_DOMAIN_SOURCE_EXTRACTION_INSTALLED_FALLBACK_SMOKE = Object.freeze({
  schema: 'agent-onboard-public-source-module-claims-installed-fallback-smoke-001',
  title: 'Agent-Onboard Public Claims Domain Source Extraction Installed Fallback Smoke',
  package_name: 'agent-onboard',
  release_line: RELEASE_LINE,
  command: 'agent-onboard architecture --claims-installed-fallback-smoke',
  check_command: 'agent-onboard architecture --claims-installed-fallback-check',
  installed_fallback_smoke_file: '.agent-onboard/source-module-extraction-claims-installed-fallback-smoke.json',
  source_module: PUBLIC_CLAIMS_DOMAIN_SOURCE_EXTRACTION_RUNTIME_BRIDGE.source_module,
  prerequisite_runtime_bridge_file: PUBLIC_CLAIMS_DOMAIN_SOURCE_EXTRACTION_RUNTIME_BRIDGE.runtime_bridge_file,
  purpose: 'Freeze an installed-package fallback smoke contract proving the compact npm tarball can omit the source-only claims module while claim/close architecture checks still fall back to bundled CLI metadata.',
  smoke_status: 'claims_installed_fallback_smoke_admitted',
  projected_installed_context: Object.freeze({
    package_context: 'installed_package',
    source_module_present: false,
    runtime_bridge_resolution_mode: 'bundled_fallback',
    source_module_must_remain_out_of_pack: true,
    shared_work_items_ledger_remains_canonical: true,
    non_claim_work_items_commands_remain_excluded: true,
    architecture_checks_do_not_require_source_context_files: true
  }),
  validated_surfaces: Object.freeze([
    'architecture --claims-runtime-bridge-check',
    'architecture --claims-installed-fallback-check',
    'architecture --check',
    'release --surface-check',
    'release --architecture-parity-smoke',
    'release --check'
  ]),
  next_work_item_id: ['P', 1, 'S', 3, 'M', 2, 'W', 12].join(''),
  boundary: Object.freeze({
    claims_installed_fallback_smoke_command_writes_files: false,
    claims_installed_fallback_check_command_writes_files: false,
    creates_temp_files: false,
    creates_source_modules: false,
    moves_existing_source_files: false,
    changes_public_cli_outputs: false,
    changes_cli_runtime_dependency_graph: false,
    exports_source_module_as_public_api: false,
    source_modules_remain_out_of_npm_pack: true,
    installed_context_fallback_required: true,
    keeps_shared_work_items_ledger: true,
    includes_non_claim_work_items_commands: false,
    writes_package_root: false,
    writes_target_repository_state: false,
    git_mutation: false,
    installs_dependencies: false,
    runs_package_manager: false,
    runs_build_test_deploy: false,
    publishes_package: false,
    mutates_registry: false,
    package_allowlist_unchanged: true
  })
});



const PUBLIC_SOURCE_DOMAIN_EXTRACTION_STABILIZATION_CLOSURE_REVIEW = Object.freeze({
  schema: 'agent-onboard-public-source-domain-extraction-stabilization-closure-review-001',
  title: 'Agent-Onboard Public Source-Domain Extraction Stabilization Closure Review Gate',
  package_name: 'agent-onboard',
  release_line: RELEASE_LINE,
  command: 'agent-onboard architecture --source-domain-closure-review',
  check_command: 'agent-onboard architecture --source-domain-closure-check',
  closure_review_file: '.agent-onboard/source-domain-extraction-stabilization-closure-review.json',
  milestone_id: 'P1S3M2',
  closed_milestone_id: 'P1S3M2',
  opened_milestone_id: 'P1S3M3',
  closure_work_item_id: ['P', 1, 'S', 3, 'M', 2, 'W', 12].join(''),
  seed_work_item_id: ['P', 1, 'S', 3, 'M', 3, 'W', 1].join(''),
  closure_status: 'p1s3m2_closed_p1s3m3_seeded',
  required_closed_work_items: Object.freeze(Array.from({ length: 12 }, (_, index) => ['P', 1, 'S', 3, 'M', 2, 'W', index + 1].join(''))),
  required_component_checks: Object.freeze([
    'architecture --work-items-check',
    'architecture --work-items-first-slice-check',
    'architecture --work-items-bundle-parity-check',
    'architecture --work-items-runtime-bridge-check',
    'architecture --work-items-installed-fallback-check',
    'architecture --claims-check',
    'architecture --claims-first-slice-check',
    'architecture --claims-bundle-parity-check',
    'architecture --claims-runtime-bridge-check',
    'architecture --claims-installed-fallback-check'
  ]),
  next_scope: Object.freeze([
    Object.freeze({ id: ['P', 1, 'S', 3, 'M', 3, 'W', 1].join(''), title: 'Public CLI runtime de-monolith planning gate', expected_status: 'closed' })
  ]),
  boundary: Object.freeze({
    source_domain_closure_review_command_writes_files: false,
    source_domain_closure_check_command_writes_files: false,
    creates_source_modules: false,
    moves_existing_source_files: false,
    exports_source_module_as_public_api: false,
    changes_public_cli_outputs: false,
    changes_cli_runtime_dependency_graph: false,
    package_allowlist_unchanged: true,
    source_modules_remain_out_of_npm_pack: true,
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
    source_domain_modules_are_not_packaged_yet: true,
    physical_cutover_not_applied_in_this_gate: true
  }),
  selected_package_strategy: Object.freeze({
    id: 'controlled_source_module_inclusion',
    current_gate_keeps_compact_pack_allowlist: true,
    future_include_patterns: Object.freeze(['cli/agent_onboard/**/*.js']),
    rejected_for_now: Object.freeze(['generated_dist_bundle']),
    reason: 'Internal architecture already proves thin CLI plus module tree; public should adopt the same shape under public boundary guards before adding a generated bundle layer.'
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
    Object.freeze({ id: 'work_items_validate', argv: Object.freeze(['node', 'cli/agent-onboard.js', 'work-items', '--validate', '.agent-onboard/work-items.json']), expected_exit_code: 0 })
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

const PUBLIC_VERSION_REFERENCE_POLICY = Object.freeze({
  schema: 'agent-onboard-public-version-reference-policy-001',
  title: 'Agent-Onboard Public Version Reference Policy',
  package_name: 'agent-onboard',
  release_line: RELEASE_LINE,
  command: 'agent-onboard release --version-sprawl-check',
  single_source_of_truth: 'package.json#version',
  disallowed_current_version_scan_files: Object.freeze([
    'README.md',
    'AGENTS.md',
    'llms.txt',
    'agent-onboard.target.json',
    '.agent-onboard/project.json',
    '.agent-onboard/authority-path.json',
    '.agent-onboard/runtime-namespace.json',
    '.agent-onboard/source-partition-plan.json',
    '.agent-onboard/source-extraction-rehearsal.json',
    '.agent-onboard/source-extraction-golden-outputs.json',
    '.agent-onboard/source-module-extraction-adapter-boundary.json',
    '.agent-onboard/source-module-extraction-first-slice.json',
    '.agent-onboard/source-module-extraction-bundle-parity.json',
    '.agent-onboard/source-module-extraction-runtime-bridge.json',
    '.agent-onboard/source-module-extraction-installed-fallback-smoke.json',
    '.agent-onboard/source-module-extraction-second-slice-plan.json',
    '.agent-onboard/source-module-extraction-second-slice-first-slice.json',
    '.agent-onboard/source-module-extraction-authority-bundle-parity.json',
    '.agent-onboard/source-module-extraction-authority-runtime-bridge.json',
    '.agent-onboard/public-architecture-m1-closure-m2-seed.json',
    '.agent-onboard/source-module-extraction-work-items-plan.json',
    '.agent-onboard/source-module-extraction-work-items-first-slice.json',
    '.agent-onboard/source-module-extraction-work-items-bundle-parity.json',
    '.agent-onboard/source-module-extraction-work-items-runtime-bridge.json',
    '.agent-onboard/source-module-extraction-work-items-installed-fallback-smoke.json',
    '.agent-onboard/source-module-extraction-claims-plan.json',
    '.agent-onboard/source-module-extraction-claims-first-slice.json',
    '.agent-onboard/source-module-extraction-claims-bundle-parity.json',
    '.agent-onboard/source-module-extraction-claims-runtime-bridge.json',
    '.agent-onboard/source-module-extraction-claims-installed-fallback-smoke.json',
    '.agent-onboard/source-domain-extraction-stabilization-closure-review.json',
    '.agent-onboard/cli-runtime-de-monolith-planning.json',
    '.agent-onboard/thin-cli-router-seed.json',
    '.agent-onboard/compatibility-command-port-seed.json',
    '.agent-onboard/core-command-adapter-extraction.json',
    '.agent-onboard/package-command-adapter-extraction.json',
    'cli/agent_onboard/command-router.js',
    'cli/agent_onboard/adapters/compatibility-command-port.js',
    'cli/agent_onboard/ports/compatibility-command-port.js',
    'cli/agent_onboard/adapters/commands/core.js',
    'cli/agent_onboard/adapters/commands/release-package.js',
    'src/domains/core.js',
    'src/domains/authority.js',
    'src/domains/work-items.js',
    'src/domains/claims.js',
    'test/agent-onboard.test.js'
  ]),
  allowed_dynamic_version_surfaces: Object.freeze([
    'package.json#version',
    'runtime VERSION constant read from package.json',
    'generated post-publish handoff command output',
    'operator-supplied <version> placeholder in docs'
  ]),
  boundary: Object.freeze({
    version_sprawl_check_writes_files: false,
    reads_source_files_only: true,
    publishes_package: false,
    mutates_registry: false
  })
});

const PUBLIC_RELEASE_CONTRACT = Object.freeze({
  schema: 'agent-onboard-public-release-contract-038',
  title: 'Agent-Onboard Public Release Contract',
  package_name: 'agent-onboard',
  release_line: RELEASE_LINE,
  command: 'agent-onboard release --check',
  contract_command: 'agent-onboard release --contract',
  fixture_command: 'agent-onboard release --fixture',
  parity_smoke_command: 'agent-onboard release --parity-smoke',
  architecture_parity_smoke_command: 'agent-onboard release --architecture-parity-smoke',
  target_onboarding_smoke_command: 'agent-onboard release --target-onboarding-smoke',
  post_publish_handoff_command: 'agent-onboard release --post-publish-handoff',
  published_acceptance_command: 'agent-onboard release --published-acceptance',
  real_target_trial_command: 'agent-onboard release --real-target-trial',
  architecture_map_command: 'agent-onboard architecture --map',
  architecture_router_command: 'agent-onboard architecture --router',
  architecture_facades_command: 'agent-onboard architecture --facades',
  architecture_partition_plan_command: 'agent-onboard architecture --partition-plan',
  architecture_partition_check_command: 'agent-onboard architecture --partition-check',
  architecture_extraction_rehearsal_command: 'agent-onboard architecture --extraction-rehearsal',
  architecture_extraction_check_command: 'agent-onboard architecture --extraction-check',
  architecture_golden_outputs_command: 'agent-onboard architecture --golden-outputs',
  architecture_golden_check_command: 'agent-onboard architecture --golden-check',
  architecture_adapter_boundary_command: 'agent-onboard architecture --adapter-boundary',
  architecture_adapter_check_command: 'agent-onboard architecture --adapter-check',
  architecture_first_slice_command: 'agent-onboard architecture --first-slice',
  architecture_first_slice_check_command: 'agent-onboard architecture --first-slice-check',
  architecture_bundle_parity_command: 'agent-onboard architecture --bundle-parity',
  architecture_bundle_parity_check_command: 'agent-onboard architecture --bundle-parity-check',
  architecture_runtime_bridge_command: 'agent-onboard architecture --runtime-bridge',
  architecture_runtime_bridge_check_command: 'agent-onboard architecture --runtime-bridge-check',
  architecture_installed_fallback_smoke_command: 'agent-onboard architecture --installed-fallback-smoke',
  architecture_installed_fallback_check_command: 'agent-onboard architecture --installed-fallback-check',
  architecture_second_slice_plan_command: 'agent-onboard architecture --second-slice-plan',
  architecture_second_slice_check_command: 'agent-onboard architecture --second-slice-check',
  architecture_second_slice_first_slice_command: 'agent-onboard architecture --second-slice-first-slice',
  architecture_second_slice_first_slice_check_command: 'agent-onboard architecture --second-slice-first-slice-check',
  architecture_authority_bundle_parity_command: 'agent-onboard architecture --authority-bundle-parity',
  architecture_authority_bundle_parity_check_command: 'agent-onboard architecture --authority-bundle-parity-check',
  architecture_authority_runtime_bridge_command: 'agent-onboard architecture --authority-runtime-bridge',
  architecture_authority_runtime_bridge_check_command: 'agent-onboard architecture --authority-runtime-bridge-check',
  architecture_m2_seed_command: 'agent-onboard architecture --m2-seed',
  architecture_m2_seed_check_command: 'agent-onboard architecture --m2-seed-check',
  architecture_work_items_plan_command: 'agent-onboard architecture --work-items-plan',
  architecture_work_items_check_command: 'agent-onboard architecture --work-items-check',
  architecture_work_items_first_slice_command: 'agent-onboard architecture --work-items-first-slice',
  architecture_work_items_first_slice_check_command: 'agent-onboard architecture --work-items-first-slice-check',
  architecture_work_items_bundle_parity_command: 'agent-onboard architecture --work-items-bundle-parity',
  architecture_work_items_bundle_parity_check_command: 'agent-onboard architecture --work-items-bundle-parity-check',
  architecture_work_items_runtime_bridge_command: 'agent-onboard architecture --work-items-runtime-bridge',
  architecture_work_items_runtime_bridge_check_command: 'agent-onboard architecture --work-items-runtime-bridge-check',
  architecture_work_items_installed_fallback_smoke_command: 'agent-onboard architecture --work-items-installed-fallback-smoke',
  architecture_work_items_installed_fallback_check_command: 'agent-onboard architecture --work-items-installed-fallback-check',
  architecture_claims_plan_command: 'agent-onboard architecture --claims-plan',
  architecture_claims_check_command: 'agent-onboard architecture --claims-check',
  architecture_claims_first_slice_command: 'agent-onboard architecture --claims-first-slice',
  architecture_claims_first_slice_check_command: 'agent-onboard architecture --claims-first-slice-check',
  architecture_claims_bundle_parity_command: 'agent-onboard architecture --claims-bundle-parity',
  architecture_claims_bundle_parity_check_command: 'agent-onboard architecture --claims-bundle-parity-check',
  architecture_claims_runtime_bridge_command: 'agent-onboard architecture --claims-runtime-bridge',
  architecture_claims_runtime_bridge_check_command: 'agent-onboard architecture --claims-runtime-bridge-check',
  architecture_claims_installed_fallback_smoke_command: 'agent-onboard architecture --claims-installed-fallback-smoke',
  architecture_claims_installed_fallback_check_command: 'agent-onboard architecture --claims-installed-fallback-check',
  architecture_source_domain_closure_review_command: 'agent-onboard architecture --source-domain-closure-review',
  architecture_source_domain_closure_check_command: 'agent-onboard architecture --source-domain-closure-check',
  architecture_cli_runtime_plan_command: 'agent-onboard architecture --cli-runtime-plan',
  architecture_cli_runtime_check_command: 'agent-onboard architecture --cli-runtime-check',
  architecture_thin_router_command: 'agent-onboard architecture --thin-router',
  architecture_thin_router_check_command: 'agent-onboard architecture --thin-router-check',
  architecture_compatibility_port_command: 'agent-onboard architecture --compatibility-port',
  architecture_compatibility_port_check_command: 'agent-onboard architecture --compatibility-port-check',
  architecture_core_adapter_command: 'agent-onboard architecture --core-adapter',
  architecture_core_adapter_check_command: 'agent-onboard architecture --core-adapter-check',
  architecture_package_adapter_command: 'agent-onboard architecture --package-adapter',
  architecture_package_adapter_check_command: 'agent-onboard architecture --package-adapter-check',
  architecture_architecture_adapter_command: 'agent-onboard architecture --architecture-adapter',
  architecture_architecture_adapter_check_command: 'agent-onboard architecture --architecture-adapter-check',
  architecture_authority_adapter_command: 'agent-onboard architecture --authority-adapter',
  architecture_authority_adapter_check_command: 'agent-onboard architecture --authority-adapter-check',
  architecture_module_inclusion_plan_command: 'agent-onboard architecture --module-inclusion-plan',
  architecture_module_inclusion_check_command: 'agent-onboard architecture --module-inclusion-check',
  architecture_packaged_router_port_command: 'agent-onboard architecture --packaged-router-port',
  architecture_packaged_router_port_check_command: 'agent-onboard architecture --packaged-router-port-check',
  architecture_thin_entrypoint_rehearsal_command: 'agent-onboard architecture --thin-entrypoint-rehearsal',
  architecture_thin_entrypoint_rehearsal_check_command: 'agent-onboard architecture --thin-entrypoint-rehearsal-check',
  architecture_thin_entrypoint_cutover_command: 'agent-onboard architecture --thin-entrypoint-cutover',
  architecture_thin_entrypoint_cutover_check_command: 'agent-onboard architecture --thin-entrypoint-cutover-check',
  architecture_router_adapter_delegation_command: 'agent-onboard architecture --router-adapter-delegation',
  architecture_router_adapter_delegation_check_command: 'agent-onboard architecture --router-adapter-delegation-check',
  version_sprawl_check_command: 'agent-onboard release --version-sprawl-check',
  architecture_check_command: 'agent-onboard architecture --check',
  authority_first_read_command: 'agent-onboard authority --first-read',
  authority_check_command: 'agent-onboard authority --check',
  target_runtime_namespace_command: 'agent-onboard target runtime --namespace',
  target_runtime_check_command: 'agent-onboard target runtime --check',
  package_surface_command: 'agent-onboard release --surface',
  package_surface_check_command: 'agent-onboard release --surface-check',
  expected_pack_files: PUBLIC_PACKAGED_ROUTER_PORT_PACK_FILES,
  source_context_files: Object.freeze([
    '.agent-onboard/project.json',
    '.agent-onboard/work-items.json',
    'agent-onboard.target.json',
    'AGENTS.md',
    'llms.txt',
    '.agent-onboard/authority-path.json',
    '.agent-onboard/runtime-namespace.json',
    '.agent-onboard/source-partition-plan.json',
    '.agent-onboard/source-extraction-rehearsal.json',
    '.agent-onboard/source-extraction-golden-outputs.json',
    '.agent-onboard/source-module-extraction-adapter-boundary.json',
    '.agent-onboard/source-module-extraction-first-slice.json',
    '.agent-onboard/source-module-extraction-bundle-parity.json',
    '.agent-onboard/source-module-extraction-runtime-bridge.json',
    '.agent-onboard/source-module-extraction-installed-fallback-smoke.json',
    '.agent-onboard/source-module-extraction-second-slice-plan.json',
    '.agent-onboard/source-module-extraction-second-slice-first-slice.json',
    '.agent-onboard/source-module-extraction-authority-bundle-parity.json',
    '.agent-onboard/source-module-extraction-authority-runtime-bridge.json',
    '.agent-onboard/public-architecture-m1-closure-m2-seed.json',
    '.agent-onboard/source-module-extraction-work-items-plan.json',
    '.agent-onboard/source-module-extraction-work-items-first-slice.json',
    '.agent-onboard/source-module-extraction-work-items-bundle-parity.json',
    '.agent-onboard/source-module-extraction-work-items-runtime-bridge.json',
    '.agent-onboard/source-module-extraction-work-items-installed-fallback-smoke.json',
    '.agent-onboard/source-module-extraction-claims-plan.json',
    '.agent-onboard/source-module-extraction-claims-first-slice.json',
    '.agent-onboard/source-module-extraction-claims-bundle-parity.json',
    '.agent-onboard/source-module-extraction-claims-runtime-bridge.json',
    '.agent-onboard/source-module-extraction-claims-installed-fallback-smoke.json',
    '.agent-onboard/source-domain-extraction-stabilization-closure-review.json',
    '.agent-onboard/cli-runtime-de-monolith-planning.json',
    '.agent-onboard/thin-cli-router-seed.json',
    '.agent-onboard/compatibility-command-port-seed.json',
    '.agent-onboard/core-command-adapter-extraction.json',
    '.agent-onboard/package-command-adapter-extraction.json',
    '.agent-onboard/architecture-command-adapter-extraction.json',
    '.agent-onboard/authority-command-adapter-extraction.json',
    '.agent-onboard/modular-runtime-package-inclusion-plan.json',
    '.agent-onboard/packaged-router-port-inclusion.json',
    '.agent-onboard/thin-entrypoint-router-cutover-rehearsal.json',
    '.agent-onboard/thin-entrypoint-router-cutover-application.json',
    'src/domains/core.js',
    'src/domains/authority.js',
    'src/domains/work-items.js',
    'src/domains/claims.js',
    'test/agent-onboard.test.js'
  ]),
  required_package_json: Object.freeze({
    name: 'agent-onboard',
    license: 'Apache-2.0',
    type: 'commonjs',
    node_engine: '>=18',
    bin: Object.freeze({
      'agent-onboard': 'cli/agent-onboard.js',
      aob: 'cli/agent-onboard.js',
      'create-agent-onboard': 'cli/agent-onboard.js'
    }),
    files: Object.freeze(PUBLIC_PACKAGED_ROUTER_PORT_PACK_FILES.filter((rel) => rel !== 'package.json'))
  }),
  required_metadata_fields: Object.freeze(['description', 'author', 'repository.url', 'homepage', 'bugs.url', 'keywords']),
  required_keyword_minimum: 5,
  local_pre_publish_commands: Object.freeze([
    'npm test',
    'npm pack --dry-run --json',
    'npm publish --dry-run --json --ignore-scripts',
    'node cli/agent-onboard.js status',
    'node cli/agent-onboard.js target onboarding --plan',
    'node cli/agent-onboard.js target onboarding --fixture',
    'node cli/agent-onboard.js release --contract',
    'node cli/agent-onboard.js release --fixture',
    'node cli/agent-onboard.js release --parity-smoke',
    'node cli/agent-onboard.js release --architecture-parity-smoke',
    'node cli/agent-onboard.js release --target-onboarding-smoke',
    'node cli/agent-onboard.js release --post-publish-handoff',
    'node cli/agent-onboard.js release --published-acceptance',
    'node cli/agent-onboard.js release --real-target-trial',
    'node cli/agent-onboard.js architecture --map',
    'node cli/agent-onboard.js architecture --router',
    'node cli/agent-onboard.js architecture --facades',
    'node cli/agent-onboard.js architecture --partition-plan',
    'node cli/agent-onboard.js architecture --partition-check',
    'node cli/agent-onboard.js architecture --extraction-rehearsal',
    'node cli/agent-onboard.js architecture --extraction-check',
    'node cli/agent-onboard.js architecture --golden-outputs',
    'node cli/agent-onboard.js architecture --golden-check',
    'node cli/agent-onboard.js architecture --adapter-boundary',
    'node cli/agent-onboard.js architecture --adapter-check',
    'node cli/agent-onboard.js architecture --first-slice',
    'node cli/agent-onboard.js architecture --first-slice-check',
    'node cli/agent-onboard.js architecture --bundle-parity',
    'node cli/agent-onboard.js architecture --bundle-parity-check',
    'node cli/agent-onboard.js architecture --runtime-bridge',
    'node cli/agent-onboard.js architecture --runtime-bridge-check',
    'node cli/agent-onboard.js architecture --installed-fallback-smoke',
    'node cli/agent-onboard.js architecture --installed-fallback-check',
    'node cli/agent-onboard.js architecture --second-slice-plan',
    'node cli/agent-onboard.js architecture --second-slice-check',
    'node cli/agent-onboard.js architecture --second-slice-first-slice',
    'node cli/agent-onboard.js architecture --second-slice-first-slice-check',
    'node cli/agent-onboard.js architecture --authority-bundle-parity',
    'node cli/agent-onboard.js architecture --authority-bundle-parity-check',
    'node cli/agent-onboard.js architecture --authority-runtime-bridge',
    'node cli/agent-onboard.js architecture --authority-runtime-bridge-check',
    'node cli/agent-onboard.js architecture --m2-seed',
    'node cli/agent-onboard.js architecture --m2-seed-check',
    'node cli/agent-onboard.js architecture --work-items-plan',
    'node cli/agent-onboard.js architecture --work-items-check',
    'node cli/agent-onboard.js architecture --work-items-first-slice',
    'node cli/agent-onboard.js architecture --work-items-first-slice-check',
    'node cli/agent-onboard.js architecture --work-items-bundle-parity',
    'node cli/agent-onboard.js architecture --work-items-bundle-parity-check',
    'node cli/agent-onboard.js architecture --work-items-runtime-bridge',
    'node cli/agent-onboard.js architecture --work-items-runtime-bridge-check',
    'node cli/agent-onboard.js architecture --work-items-installed-fallback-smoke',
    'node cli/agent-onboard.js architecture --work-items-installed-fallback-check',
    'node cli/agent-onboard.js architecture --claims-plan',
    'node cli/agent-onboard.js architecture --claims-check',
    'node cli/agent-onboard.js architecture --claims-first-slice',
    'node cli/agent-onboard.js architecture --claims-first-slice-check',
    'node cli/agent-onboard.js architecture --claims-bundle-parity',
    'node cli/agent-onboard.js architecture --claims-bundle-parity-check',
    'node cli/agent-onboard.js architecture --claims-runtime-bridge',
    'node cli/agent-onboard.js architecture --claims-runtime-bridge-check',
    'node cli/agent-onboard.js architecture --claims-installed-fallback-smoke',
    'node cli/agent-onboard.js architecture --claims-installed-fallback-check',
    'node cli/agent-onboard.js architecture --cli-runtime-plan',
    'node cli/agent-onboard.js architecture --cli-runtime-check',
    'node cli/agent-onboard.js architecture --thin-router',
    'node cli/agent-onboard.js architecture --thin-router-check',
    'node cli/agent-onboard.js architecture --compatibility-port',
    'node cli/agent-onboard.js architecture --compatibility-port-check',
    'node cli/agent-onboard.js architecture --core-adapter',
    'node cli/agent-onboard.js architecture --core-adapter-check',
    'node cli/agent-onboard.js architecture --package-adapter',
    'node cli/agent-onboard.js architecture --package-adapter-check',
    'node cli/agent-onboard.js architecture --architecture-adapter',
    'node cli/agent-onboard.js architecture --architecture-adapter-check',
    'node cli/agent-onboard.js architecture --authority-adapter',
    'node cli/agent-onboard.js architecture --authority-adapter-check',
    'node cli/agent-onboard.js architecture --module-inclusion-plan',
    'node cli/agent-onboard.js architecture --module-inclusion-check',
    'node cli/agent-onboard.js architecture --packaged-router-port',
    'node cli/agent-onboard.js architecture --packaged-router-port-check',
    'node cli/agent-onboard.js architecture --thin-entrypoint-rehearsal',
    'node cli/agent-onboard.js architecture --thin-entrypoint-rehearsal-check',
    'node cli/agent-onboard.js architecture --thin-entrypoint-cutover',
    'node cli/agent-onboard.js architecture --thin-entrypoint-cutover-check',
    'node cli/agent-onboard.js architecture --router-adapter-delegation',
    'node cli/agent-onboard.js architecture --router-adapter-delegation-check',
    'node cli/agent-onboard.js release --version-sprawl-check',
    'node cli/agent-onboard.js authority --first-read',
    'node cli/agent-onboard.js authority --check',
    'node cli/agent-onboard.js target runtime --namespace',
    'node cli/agent-onboard.js target runtime --check',
    'node cli/agent-onboard.js release --surface',
    'node cli/agent-onboard.js release --surface-check',
    'node cli/agent-onboard.js architecture --check',
    'node cli/agent-onboard.js target onboarding --trial',
    'node cli/agent-onboard.js release --check',
    'node cli/agent-onboard.js work-items --validate .agent-onboard/work-items.json'
  ]),
  post_publish_verification_commands: Object.freeze([
    'npm view agent-onboard version dist-tags',
    'npm view agent-onboard@<version> name version license bin repository',
    'npx agent-onboard@<version> status',
    'npx agent-onboard@<version> release --contract',
    'npx agent-onboard@<version> release --fixture',
    'npx agent-onboard@<version> release --parity-smoke',
    'npx agent-onboard@<version> release --architecture-parity-smoke',
    'npx agent-onboard@<version> release --target-onboarding-smoke',
    'npx agent-onboard@<version> release --post-publish-handoff',
    'npx agent-onboard@<version> release --published-acceptance',
    'npx agent-onboard@<version> release --real-target-trial',
    'npx agent-onboard@<version> architecture --map',
    'npx agent-onboard@<version> architecture --router',
    'npx agent-onboard@<version> architecture --facades',
    'npx agent-onboard@<version> architecture --partition-plan',
    'npx agent-onboard@<version> architecture --partition-check',
    'npx agent-onboard@<version> architecture --extraction-rehearsal',
    'npx agent-onboard@<version> architecture --extraction-check',
    'npx agent-onboard@<version> architecture --golden-outputs',
    'npx agent-onboard@<version> architecture --golden-check',
    'npx agent-onboard@<version> architecture --adapter-boundary',
    'npx agent-onboard@<version> architecture --adapter-check',
    'npx agent-onboard@<version> architecture --first-slice',
    'npx agent-onboard@<version> architecture --first-slice-check',
    'npx agent-onboard@<version> architecture --bundle-parity',
    'npx agent-onboard@<version> architecture --bundle-parity-check',
    'npx agent-onboard@<version> architecture --runtime-bridge',
    'npx agent-onboard@<version> architecture --runtime-bridge-check',
    'npx agent-onboard@<version> architecture --installed-fallback-smoke',
    'npx agent-onboard@<version> architecture --installed-fallback-check',
    'npx agent-onboard@<version> architecture --second-slice-plan',
    'npx agent-onboard@<version> architecture --second-slice-check',
    'npx agent-onboard@<version> architecture --second-slice-first-slice',
    'npx agent-onboard@<version> architecture --second-slice-first-slice-check',
    'npx agent-onboard@<version> architecture --authority-bundle-parity',
    'npx agent-onboard@<version> architecture --authority-bundle-parity-check',
    'npx agent-onboard@<version> architecture --authority-runtime-bridge',
    'npx agent-onboard@<version> architecture --authority-runtime-bridge-check',
    'npx agent-onboard@<version> architecture --m2-seed',
    'npx agent-onboard@<version> architecture --m2-seed-check',
    'npx agent-onboard@<version> architecture --work-items-plan',
    'npx agent-onboard@<version> architecture --work-items-check',
    'npx agent-onboard@<version> architecture --work-items-first-slice',
    'npx agent-onboard@<version> architecture --work-items-first-slice-check',
    'npx agent-onboard@<version> architecture --work-items-bundle-parity',
    'npx agent-onboard@<version> architecture --work-items-bundle-parity-check',
    'npx agent-onboard@<version> architecture --work-items-runtime-bridge',
    'npx agent-onboard@<version> architecture --work-items-runtime-bridge-check',
    'npx agent-onboard@<version> architecture --work-items-installed-fallback-smoke',
    'npx agent-onboard@<version> architecture --work-items-installed-fallback-check',
    'npx agent-onboard@<version> architecture --claims-plan',
    'npx agent-onboard@<version> architecture --claims-check',
    'npx agent-onboard@<version> architecture --claims-first-slice',
    'npx agent-onboard@<version> architecture --claims-first-slice-check',
    'npx agent-onboard@<version> architecture --claims-bundle-parity',
    'npx agent-onboard@<version> architecture --claims-bundle-parity-check',
    'npx agent-onboard@<version> architecture --claims-runtime-bridge',
    'npx agent-onboard@<version> architecture --claims-runtime-bridge-check',
    'npx agent-onboard@<version> architecture --claims-installed-fallback-smoke',
    'npx agent-onboard@<version> architecture --claims-installed-fallback-check',
    'npx agent-onboard@<version> architecture --cli-runtime-plan',
    'npx agent-onboard@<version> architecture --cli-runtime-check',
    'npx agent-onboard@<version> architecture --thin-router',
    'npx agent-onboard@<version> architecture --thin-router-check',
    'npx agent-onboard@<version> architecture --compatibility-port',
    'npx agent-onboard@<version> architecture --compatibility-port-check',
    'npx agent-onboard@<version> architecture --core-adapter',
    'npx agent-onboard@<version> architecture --core-adapter-check',
    'npx agent-onboard@<version> architecture --package-adapter',
    'npx agent-onboard@<version> architecture --package-adapter-check',
    'npx agent-onboard@<version> architecture --architecture-adapter',
    'npx agent-onboard@<version> architecture --architecture-adapter-check',
    'npx agent-onboard@<version> architecture --authority-adapter',
    'npx agent-onboard@<version> architecture --authority-adapter-check',
    'npx agent-onboard@<version> architecture --module-inclusion-plan',
    'npx agent-onboard@<version> architecture --module-inclusion-check',
    'npx agent-onboard@<version> architecture --packaged-router-port',
    'npx agent-onboard@<version> architecture --packaged-router-port-check',
    'npx agent-onboard@<version> architecture --thin-entrypoint-rehearsal',
    'npx agent-onboard@<version> architecture --thin-entrypoint-rehearsal-check',
    'npx agent-onboard@<version> architecture --thin-entrypoint-cutover',
    'npx agent-onboard@<version> architecture --thin-entrypoint-cutover-check',
    'npx agent-onboard@<version> release --version-sprawl-check',
    'npx agent-onboard@<version> authority --first-read',
    'npx agent-onboard@<version> authority --check',
    'npx agent-onboard@<version> target runtime --namespace',
    'npx agent-onboard@<version> target runtime --check',
    'npx agent-onboard@<version> release --surface',
    'npx agent-onboard@<version> release --surface-check',
    'npx agent-onboard@<version> architecture --check',
    'npx agent-onboard@<version> release --check',
    'npx agent-onboard@<version> init --dry-run',
    'npx agent-onboard@<version> target onboarding --plan',
    'npx agent-onboard@<version> target onboarding --fixture',
    'npx agent-onboard@<version> target onboarding --trial'
  ]),
  boundary: Object.freeze({
    release_commands_publish_package: false,
    release_commands_mutate_registry: false,
    release_commands_install_dependencies: false,
    release_commands_run_git: false,
    source_ledger_required_only_when_present: true
  })
});


const PUBLIC_RELEASE_FIXTURE_MATRIX = Object.freeze({
  schema: 'agent-onboard-public-release-fixture-matrix-022',
  title: 'Agent-Onboard Public Package Contract Fixture Matrix',
  package_name: 'agent-onboard',
  release_line: PUBLIC_RELEASE_CONTRACT.release_line,
  contract_schema: PUBLIC_RELEASE_CONTRACT.schema,
  command: 'agent-onboard release --fixture',
  purpose: 'Declare regression fixtures for package/version/content drift before publish handoff.',
  fixtures: Object.freeze([
    Object.freeze({
      id: 'valid_source_repository_contract',
      expected_status: 'ok',
      validates: Object.freeze(['package_metadata', 'projected_pack_allowlist', 'public_artifact_messaging', 'source_work_items_ledger'])
    }),
    Object.freeze({
      id: 'valid_installed_package_contract',
      expected_status: 'ok',
      validates: Object.freeze(['package_metadata', 'projected_pack_allowlist', 'public_artifact_messaging']),
      expected_source_work_items_ledger_status: 'skipped'
    }),
    Object.freeze({
      id: 'stale_package_version_contract',
      expected_status: 'error',
      detects: 'package.json version drift from runtime version'
    }),
    Object.freeze({
      id: 'pack_allowlist_drift_contract',
      expected_status: 'error',
      detects: 'package.json files array drift from public npm tarball allowlist'
    }),
    Object.freeze({
      id: 'missing_bin_entrypoint_contract',
      expected_status: 'error',
      detects: 'missing CLI bin entrypoint referenced by package.json'
    }),
    Object.freeze({
      id: 'public_artifact_messaging_contract',
      expected_status: 'error',
      detects: 'reserved public artifact messaging token in npm-packed files'
    }),
    Object.freeze({
      id: 'projected_installed_package_parity_smoke',
      expected_status: 'ok',
      validates: Object.freeze(['source_candidate_release_check', 'expected_pack_files_present', 'source_context_excluded_from_pack', 'bin_entrypoints_in_pack', 'runtime_version_matches_package_json']),
      boundary: 'no package-manager execution, no registry mutation, no Git mutation, no temp-file writes'
    }),
    Object.freeze({
      id: 'target_onboarding_dry_run_fixture_matrix',
      expected_status: 'ok',
      validates: Object.freeze(['target onboarding plan no-write fixture', 'target bootstrap dry-run fixture', 'target instance takeover dry-run fixture', 'AGENTS.md preview fixture', 'aggregate explicit write projection', 'conflict and force-preview fixtures']),
      boundary: 'fixture writes no files; explicit write command writes only canonical onboarding files when requested'
    }),
    Object.freeze({
      id: 'target_onboarding_installed_package_smoke',
      expected_status: 'ok',
      validates: Object.freeze(['package release check in current package context', 'target onboarding plan from package runtime', 'target onboarding fixture from package runtime', 'explicit write into temporary target', 'canonical target files only']),
      boundary: 'creates and removes a temporary target repository; does not mutate package root, Git, registry, dependencies, build, test, deploy, publish, or push state'
    }),
    Object.freeze({
      id: 'target_onboarding_post_publish_handoff',
      expected_status: 'ok',
      validates: Object.freeze(['published version metadata command', 'version-pinned npx status command', 'release contract command', 'release fixture command', 'installed package parity smoke command', 'target onboarding smoke command', 'release check command', 'target onboarding plan and fixture commands']),
      boundary: 'handoff emits deterministic operator commands only; it does not query the registry, mutate package root, Git, dependencies, build, deploy, publish, push, or target repository state'
    }),
    Object.freeze({
      id: 'target_onboarding_real_target_repo_trial',
      expected_status: 'ok',
      validates: Object.freeze(['real target repo path inspection', 'target onboarding plan projection', 'dry-run fixture projection', 'canonical write readiness report', 'no-write trial boundary']),
      boundary: 'trial inspects an explicit target path or current directory; it writes no target files, installs no dependencies, runs no Git, and reports conflicts before any explicit onboarding write'
    }),
    Object.freeze({
      id: 'public_architecture_map',
      expected_status: 'ok',
      validates: Object.freeze(['six-domain public architecture kernel', 'runtime flow declaration', 'compact npm package boundary', 'no-write architecture command']),
      boundary: 'architecture map, router, and check are read-only; they do not move files, write source state, mutate Git, install dependencies, publish, or touch target repositories'
    }),
    Object.freeze({
      id: 'public_command_router_boundary',
      expected_status: 'ok',
      validates: Object.freeze(['table-driven top-level command router', 'explicit command aliases', 'nested target route boundary', 'no-write router inspection command']),
      boundary: 'architecture --router is read-only; dispatch remains inside the admitted CLI entrypoint and does not create files, install dependencies, publish, or mutate target repositories'
    }),
    Object.freeze({
      id: 'public_domain_service_facades',
      expected_status: 'ok',
      validates: Object.freeze(['one facade per public domain', 'router routes declare service facade ownership', 'facade command is no-write', 'physical module split remains optional for this gate']),
      boundary: 'architecture --facades is read-only; domain service facade admission does not create files, install dependencies, publish, mutate package root, or mutate target repositories'
    }),
    Object.freeze({
      id: 'public_authority_first_read_index',
      expected_status: 'ok',
      validates: Object.freeze(['canonical first-read order', 'AI-readable llms.txt entrypoint', 'machine-readable authority path index', 'source files stay outside npm package allowlist']),
      boundary: 'authority --first-read and authority --check are read-only; target onboarding may write first-read authority files only under explicit --write authorization'
    }),
    Object.freeze({
      id: 'public_target_runtime_namespace',
      expected_status: 'ok',
      validates: Object.freeze(['canonical .agent-onboard namespace root', 'runtime namespace file', 'canonical runtime file order', 'reserved future files not written', 'compact npm package boundary']),
      boundary: 'target runtime --namespace and target runtime --check are read-only; target onboarding writes the namespace file only with explicit --write authorization'
    }),
    Object.freeze({
      id: 'public_package_surface_preservation',
      expected_status: 'ok',
      validates: Object.freeze(['four-file npm package surface', 'package.json files allowlist', 'source-only context excluded from pack', 'bin entrypoints remain in pack', 'public artifact messaging guard']),
      boundary: 'release --surface and release --surface-check are read-only; they do not run npm, mutate the registry, write files, install dependencies, run Git, build, test, deploy, publish, or push'
    }),
    Object.freeze({
      id: 'public_installed_parity_architecture_smoke',
      expected_status: 'ok',
      validates: Object.freeze(['installed-like package context accepts missing source-only files', 'architecture check passes from compact package files', 'authority and runtime checks pass from installed context', 'package surface check remains compact']),
      boundary: 'release --architecture-parity-smoke is read-only; it does not create temp files, run npm, mutate registry, write files, install dependencies, run Git, build, test, deploy, publish, or push'
    }),
    Object.freeze({
      id: 'public_source_domain_module_partition_plan',
      expected_status: 'ok',
      validates: Object.freeze(['planned module map covers all six public domains', 'each planned module maps to the admitted facade', 'physical source movement is explicitly not performed by this gate', 'npm package allowlist remains compact']),
      boundary: 'architecture --partition-plan and --partition-check are read-only; they do not create modules, move files, run npm, mutate Git, publish, or touch target repository state'
    }),
    Object.freeze({
      id: 'public_source_domain_extraction_rehearsal',
      expected_status: 'ok',
      validates: Object.freeze(['rehearsal units cover all six public domains', 'each rehearsal unit maps to the admitted facade', 'no physical module is created by this gate', 'golden output scope is declared before source extraction', 'npm package allowlist remains compact']),
      boundary: 'architecture --extraction-rehearsal and --extraction-check are read-only; they do not create modules, move files, change runtime outputs, run npm, mutate Git, publish, or touch target repository state'
    }),
    Object.freeze({
      id: 'public_source_extraction_golden_output_freeze',
      expected_status: 'ok',
      validates: Object.freeze(['golden command order is frozen', 'source extraction rehearsal still passes', 'no physical module is created', 'runtime output change remains disallowed', 'npm package allowlist remains compact']),
      boundary: 'architecture --golden-outputs and --golden-check are read-only; they do not create modules, move files, change runtime outputs, run npm, mutate Git, publish, or touch target repository state'
    }),
    Object.freeze({
      id: 'public_source_module_extraction_adapter_boundary',
      expected_status: 'ok',
      validates: Object.freeze(['CLI adapter boundary is declared', 'adapter units cover all six public domains', 'each adapter unit maps to the admitted facade', 'no physical module is created', 'npm package allowlist remains compact']),
      boundary: 'architecture --adapter-boundary and --adapter-check are read-only; they do not create modules, move files, export source modules as public API, run npm, mutate Git, publish, or touch target repository state'
    }),
    Object.freeze({
      id: 'public_source_module_extraction_first_slice',
      expected_status: 'ok',
      validates: Object.freeze(['the core source-only module slice exists', 'the first slice exports the admitted core metadata contract', 'the slice is not a public import API', 'the CLI runtime dependency graph remains unchanged', 'npm package allowlist remains compact']),
      boundary: 'architecture --first-slice and --first-slice-check are read-only; they do not move existing source files, change runtime outputs, export source modules as public API, expand the npm package allowlist, run npm, mutate Git, publish, or touch target repository state'
    }),
    Object.freeze({
      id: 'public_source_module_extraction_bundle_parity',
      expected_status: 'ok',
      validates: Object.freeze(['the source-only core module output matches the bundled CLI architecture view', 'the parity check is source-aware but installed-package tolerant', 'the source module remains outside the npm allowlist', 'runtime outputs and command routing stay unchanged']),
      boundary: 'architecture --bundle-parity and --bundle-parity-check are read-only; they do not bundle files, move source, change runtime outputs, expand the npm package allowlist, run npm, mutate Git, publish, or touch target repository state'
    }),
    Object.freeze({
      id: 'public_source_module_extraction_runtime_bridge',
      expected_status: 'ok',
      validates: Object.freeze(['the runtime bridge loads the core source module when present in source context', 'installed/package context can fall back to bundled CLI metadata when source modules are absent', 'the source module remains outside the npm allowlist', 'public CLI outputs and package surface stay unchanged']),
      boundary: 'architecture --runtime-bridge and --runtime-bridge-check are read-only; they do not move source, change public CLI outputs, expose source modules as public API, expand the npm package allowlist, run npm, mutate Git, publish, or touch target repository state'
    }),
    Object.freeze({
      id: 'public_source_module_extraction_installed_fallback_smoke',
      expected_status: 'ok',
      validates: Object.freeze(['compact npm tarball omits source modules', 'installed context can use bundled fallback metadata', 'runtime bridge check passes without source module', 'release and architecture checks remain package-compatible']),
      boundary: 'architecture --installed-fallback-smoke and --installed-fallback-check are read-only; they do not install packages, create temp files, move source, expand the npm package allowlist, mutate Git, publish, or touch target repository state'
    }),
    Object.freeze({
      id: 'public_source_module_extraction_second_slice_plan',
      expected_status: 'ok',
      validates: Object.freeze(['authority is selected as the second source module slice', 'src/domains/authority.js is planned but not created', 'the compact installed package fallback remains valid', '.gitignore tracks source-only extraction artifacts and source modules']),
      boundary: 'architecture --second-slice-plan and --second-slice-check are read-only; they do not create source modules, move source, expand the npm package allowlist, mutate Git, publish, or touch target repository state'
    }),
    Object.freeze({
      id: 'public_source_module_extraction_second_slice_first_slice',
      expected_status: 'ok',
      validates: Object.freeze(['the authority source-only module slice exists', 'the second slice exports the admitted authority metadata contract', 'write-capable agents command extraction remains excluded', 'the slice is not a public import API', 'npm package allowlist remains compact']),
      boundary: 'architecture --second-slice-first-slice and --second-slice-first-slice-check are read-only; they do not move existing source files, change public CLI outputs, export source modules as public API, expand the npm package allowlist, mutate Git, publish, or touch target repository state'
    }),
    Object.freeze({
      id: 'public_source_module_extraction_authority_bundle_parity',
      expected_status: 'ok',
      validates: Object.freeze(['the source-only authority module output matches the bundled CLI authority view', 'the parity check is source-aware but installed-package tolerant', 'write-capable agents command extraction remains excluded', 'the authority source module remains outside the npm allowlist', 'runtime outputs and command routing stay unchanged']),
      boundary: 'architecture --authority-bundle-parity and --authority-bundle-parity-check are read-only; they do not bundle files, move source, change public CLI outputs, expand the npm package allowlist, run npm, mutate Git, publish, or touch target repository state'
    }),
    Object.freeze({
      id: 'public_source_module_extraction_authority_runtime_bridge',
      expected_status: 'ok',
      validates: Object.freeze(['source context loads authority module', 'installed context uses bundled authority fallback', 'write-capable agents command extraction remains excluded', 'npm package allowlist remains compact']),
      command: 'architecture --authority-runtime-bridge',
      boundary: 'architecture --authority-runtime-bridge and --authority-runtime-bridge-check are read-only; they optionally load src/domains/authority.js in source context, fall back to bundled CLI metadata in installed context, do not extract write-capable agents commands, do not expand the npm package allowlist, mutate Git, publish, or touch target repository state'
    }),
    Object.freeze({
      id: 'public_architecture_m1_closure_m2_seed',
      expected_status: 'ok',
      validates: Object.freeze(['the architecture kernel milestone is closed', 'all architecture-kernel work items are closed', 'the next architecture milestone exists and remains open', 'the transition seed work item is closed', 'the next executable work item is open', 'npm package allowlist remains compact']),
      boundary: 'architecture --m2-seed and --m2-seed-check are read-only; they report and validate the source ledger transition without writing files, creating source modules, expanding npm package files, running Git, publishing, or touching target repository state'
    }),
    Object.freeze({
      id: 'public_work_items_domain_source_extraction_plan',
      expected_status: 'ok',
      validates: Object.freeze(['work_items is selected as the first M2 source-domain extraction candidate', 'src/domains/work-items.js is planned but not created', 'claims-domain behavior remains explicitly excluded', 'the next first-slice work item is seeded open', 'npm package allowlist remains compact']),
      boundary: 'architecture --work-items-plan and --work-items-check are read-only; they do not create source modules, move handlers, change public outputs, expand npm package files, run Git, publish, or touch target repository state'
    }),
    Object.freeze({
      id: 'public_work_items_domain_source_extraction_first_slice',
      expected_status: 'ok',
      validates: Object.freeze(['src/domains/work-items.js exists as a source-only first slice', 'work-items metadata excludes claim and close behavior', 'the npm package allowlist remains compact']),
      boundary: 'architecture --work-items-first-slice and --work-items-first-slice-check are read-only; the source slice is not a public import API and is excluded from npm package files'
    }),
    Object.freeze({
      id: 'public_work_items_domain_source_extraction_bundle_parity',
      expected_status: 'ok',
      validates: Object.freeze(['the work-items source slice matches the bundled CLI work-items view', 'schema, state file, command-surface, and explicit write-boundary metadata remain equivalent', 'claim and close remain excluded', 'npm package allowlist remains compact']),
      boundary: 'architecture --work-items-bundle-parity and --work-items-bundle-parity-check are read-only; they do not create bundles, move source, change runtime output, expand npm package files, run npm, mutate Git, publish, or touch target repository state'
    }),
    Object.freeze({
      id: 'public_work_items_domain_source_extraction_runtime_bridge',
      expected_status: 'ok',
      validates: Object.freeze(['source context loads work-items module when present', 'installed context falls back to bundled work-items metadata', 'claim and close remain excluded', 'npm package allowlist remains compact']),
      boundary: 'architecture --work-items-runtime-bridge and --work-items-runtime-bridge-check are read-only; they optionally load src/domains/work-items.js in source context, fall back to bundled CLI metadata in installed context, do not extract claim or close commands, and do not expand the npm package allowlist'
    }),

    Object.freeze({
      id: 'public_work_items_domain_source_extraction_installed_fallback_smoke',
      expected_status: 'ok',
      validates: Object.freeze(['installed package context omits src/domains/work-items.js', 'work-items runtime bridge resolves through bundled_fallback when source module is absent', 'claim and close remain excluded', 'npm package allowlist remains compact']),
      boundary: 'architecture --work-items-installed-fallback-smoke and --work-items-installed-fallback-check are read-only; they do not install packages, create temp files, move source, expand the npm package allowlist, mutate Git, publish, or touch target repository state'
    }),
    Object.freeze({
      id: 'public_version_reference_policy',
      expected_status: 'ok',
      validates: Object.freeze(['package.json is the only patch-version source of truth', 'docs avoid hard-coded current package versions', 'tests derive expected version from package.json', 'post-publish output may still emit explicit version-pinned commands']),
      boundary: 'release --version-sprawl-check is read-only; it scans source files and writes no files, publishes nothing, and mutates no registry state'
    })
  ]),
  boundary: Object.freeze({
    writes_files: false,
    git_mutation: false,
    installs_dependencies: false,
    runs_build_test_deploy: false,
    publishes_package: false,
    mutates_registry: false
  })
});

  return Object.freeze({
    PUBLIC_ARCHITECTURE_MAP,
    PUBLIC_COMMAND_ROUTER,
    PUBLIC_DOMAIN_SERVICE_FACADES,
    PUBLIC_AUTHORITY_FIRST_READ_INDEX,
    PUBLIC_TARGET_RUNTIME_NAMESPACE,
    PUBLIC_PACKAGE_SURFACE_PRESERVATION,
    PUBLIC_INSTALLED_PARITY_ARCHITECTURE_SMOKE,
    PUBLIC_SOURCE_DOMAIN_MODULE_PARTITION_PLAN,
    PUBLIC_SOURCE_DOMAIN_EXTRACTION_REHEARSAL,
    PUBLIC_SOURCE_EXTRACTION_GOLDEN_OUTPUT_FREEZE,
    PUBLIC_SOURCE_MODULE_EXTRACTION_ADAPTER_BOUNDARY,
    PUBLIC_SOURCE_MODULE_EXTRACTION_FIRST_SLICE,
    PUBLIC_SOURCE_MODULE_EXTRACTION_BUNDLE_PARITY,
    PUBLIC_SOURCE_MODULE_EXTRACTION_RUNTIME_BRIDGE,
    PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE,
    PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN,
    PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_FIRST_SLICE,
    PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_BUNDLE_PARITY,
    PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_RUNTIME_BRIDGE,
    PUBLIC_ARCHITECTURE_M1_CLOSURE_M2_SEED,
    PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_PLAN,
    PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_FIRST_SLICE,
    PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_BUNDLE_PARITY,
    PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_RUNTIME_BRIDGE,
    PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_INSTALLED_FALLBACK_SMOKE,
    PUBLIC_CLAIMS_DOMAIN_SOURCE_EXTRACTION_PLAN,
    PUBLIC_CLAIMS_DOMAIN_SOURCE_EXTRACTION_FIRST_SLICE,
    PUBLIC_CLAIMS_DOMAIN_SOURCE_EXTRACTION_BUNDLE_PARITY,
    PUBLIC_CLAIMS_DOMAIN_SOURCE_EXTRACTION_RUNTIME_BRIDGE,
    PUBLIC_CLAIMS_DOMAIN_SOURCE_EXTRACTION_INSTALLED_FALLBACK_SMOKE,
    PUBLIC_SOURCE_DOMAIN_EXTRACTION_STABILIZATION_CLOSURE_REVIEW,
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
    PUBLIC_ROUTER_COMMAND_ADAPTER_DELEGATION_EXPANSION,
    PUBLIC_VERSION_REFERENCE_POLICY,
    PUBLIC_RELEASE_CONTRACT,
    PUBLIC_RELEASE_FIXTURE_MATRIX
  });
}

module.exports = Object.freeze({
  createPublicArchitectureCatalog
});
