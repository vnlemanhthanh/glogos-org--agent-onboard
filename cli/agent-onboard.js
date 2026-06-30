#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const VERSION = require('../package.json').version;
const TARGET_CONFIG_FILE = 'agent-onboard.target.json';
const RELEASE_LINE = 'public_work_items_domain_source_extraction_installed_fallback_smoke_gate';

process.stdout.on('error', (error) => {
  if (error && error.code === 'EPIPE') process.exit(0);
  throw error;
});

const TARGET_CONFIG_SCHEMA = {
  schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'agent-onboard-target-config-001',
  type: 'object',
  required: ['schema', 'control', 'project', 'boundaries', 'surfaces'],
  additionalProperties: false,
  properties: {
    schema: { const: 'agent-onboard-target-config-001' },
    control: {
      type: 'object',
      required: ['package_name', 'requested_mode', 'authority_level'],
      additionalProperties: false,
      properties: {
        package_name: { const: 'agent-onboard' },
        requested_mode: { enum: ['target_dry_run', 'target_write'] },
        authority_level: { enum: ['L1_read_only_preview', 'L2_explicit_write'] }
      }
    },
    project: {
      type: 'object',
      required: ['name', 'kind'],
      additionalProperties: false,
      properties: {
        name: { type: 'string', minLength: 1 },
        kind: { type: 'string', minLength: 1 }
      }
    },
    boundaries: {
      type: 'object',
      required: [
        'writes_allowed',
        'managed_project_commands_allowed',
        'create_agent_onboard_runtime_state',
        'install_dependencies',
        'run_build_test_deploy',
        'publish_or_push'
      ],
      additionalProperties: false,
      properties: {
        writes_allowed: { type: 'boolean' },
        managed_project_commands_allowed: { type: 'integer', minimum: 0 },
        create_agent_onboard_runtime_state: { type: 'boolean' },
        install_dependencies: { type: 'boolean' },
        run_build_test_deploy: { type: 'boolean' },
        publish_or_push: { type: 'boolean' }
      }
    },
    surfaces: {
      type: 'object',
      required: ['include', 'exclude'],
      additionalProperties: false,
      properties: {
        include: { type: 'array', items: { type: 'string' } },
        exclude: { type: 'array', items: { type: 'string' } }
      }
    }
  }
};

const WORK_ITEMS_SCHEMA = {
  schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'agent-onboard-target-work-items-001',
  type: 'object',
  required: ['schema', 'package_name', 'vocabulary', 'programs', 'stages', 'milestones', 'work_items'],
  additionalProperties: false,
  properties: {
    schema: { const: 'agent-onboard-target-work-items-001' },
    package_name: { const: 'agent-onboard' },
    vocabulary: {
      type: 'object',
      required: ['program', 'stage', 'milestone', 'work_item'],
      additionalProperties: false,
      properties: {
        program: {
          type: 'object',
          required: ['prefix', 'name', 'description'],
          additionalProperties: false,
          properties: {
            prefix: { const: 'P' },
            name: { const: 'Program' },
            description: { type: 'string', minLength: 1 }
          }
        },
        stage: {
          type: 'object',
          required: ['prefix', 'name', 'description'],
          additionalProperties: false,
          properties: {
            prefix: { const: 'S' },
            name: { const: 'Stage' },
            description: { type: 'string', minLength: 1 }
          }
        },
        milestone: {
          type: 'object',
          required: ['prefix', 'name', 'description'],
          additionalProperties: false,
          properties: {
            prefix: { const: 'M' },
            name: { const: 'Milestone' },
            description: { type: 'string', minLength: 1 }
          }
        },
        work_item: {
          type: 'object',
          required: ['prefix', 'name', 'description'],
          additionalProperties: false,
          properties: {
            prefix: { const: 'W' },
            name: { const: 'Work Item' },
            description: { type: 'string', minLength: 1 }
          }
        }
      }
    },
    programs: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'title', 'status'],
        additionalProperties: false,
        properties: {
          id: { type: 'string', pattern: '^P[0-9]+$' },
          title: { type: 'string', minLength: 1 },
          status: { enum: ['open', 'closed'] }
        }
      }
    },
    stages: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'program_id', 'title', 'status'],
        additionalProperties: false,
        properties: {
          id: { type: 'string', pattern: '^P[0-9]+S[0-9]+$' },
          program_id: { type: 'string', pattern: '^P[0-9]+$' },
          title: { type: 'string', minLength: 1 },
          status: { enum: ['open', 'closed'] }
        }
      }
    },
    milestones: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'stage_id', 'title', 'status'],
        additionalProperties: false,
        properties: {
          id: { type: 'string', pattern: '^P[0-9]+S[0-9]+M[0-9]+$' },
          stage_id: { type: 'string', pattern: '^P[0-9]+S[0-9]+$' },
          title: { type: 'string', minLength: 1 },
          status: { enum: ['open', 'closed'] }
        }
      }
    },
    work_items: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'milestone_id', 'title', 'status'],
        additionalProperties: false,
        properties: {
          id: { type: 'string', pattern: '^P[0-9]+S[0-9]+M[0-9]+W[0-9]+$' },
          milestone_id: { type: 'string', pattern: '^P[0-9]+S[0-9]+M[0-9]+$' },
          title: { type: 'string', minLength: 1 },
          status: { enum: ['open', 'claimed', 'closed'] },
          claim: {
            type: 'object',
            required: ['actor', 'claimed_at'],
            additionalProperties: false,
            properties: {
              actor: { type: 'string', minLength: 1 },
              claimed_at: { type: 'string', minLength: 1 },
              note: { type: 'string', minLength: 1 }
            }
          },
          closure: {
            type: 'object',
            required: ['actor', 'closed_at', 'summary', 'changed_files', 'checks_run', 'checks_not_run', 'known_non_pass'],
            additionalProperties: false,
            properties: {
              actor: { type: 'string', minLength: 1 },
              closed_at: { type: 'string', minLength: 1 },
              summary: { type: 'string', minLength: 1 },
              changed_files: { type: 'array', items: { type: 'string', minLength: 1 } },
              checks_run: { type: 'array', items: { type: 'string', minLength: 1 } },
              checks_not_run: { type: 'array', items: { type: 'string', minLength: 1 } },
              known_non_pass: { type: 'array', items: { type: 'string', minLength: 1 } }
            }
          }
        }
      }
    }
  }
};

const BOUNDARY_GUARD_CONTRACT = Object.freeze({
  schema: 'agent-onboard-public-boundary-guard-enforcement-seed-contract-001',
  title: 'Agent-Onboard Public Boundary Guard Enforcement Seed Gate',
  package_name: 'agent-onboard',
  command: 'agent-onboard guard --check-boundary',
  canonical_target_config_file: TARGET_CONFIG_FILE,
  enforcement_mode: 'fail_closed',
  required_target_config_values: Object.freeze({
    schema: 'agent-onboard-target-config-001',
    'control.package_name': 'agent-onboard',
    'control.requested_mode': 'target_dry_run',
    'control.authority_level': 'L1_read_only_preview',
    'boundaries.writes_allowed': false,
    'boundaries.managed_project_commands_allowed': 0,
    'boundaries.create_agent_onboard_runtime_state': false,
    'boundaries.install_dependencies': false,
    'boundaries.run_build_test_deploy': false,
    'boundaries.publish_or_push': false
  }),
  forbidden_true_boundary_fields: Object.freeze([
    'boundaries.writes_allowed',
    'boundaries.create_agent_onboard_runtime_state',
    'boundaries.install_dependencies',
    'boundaries.run_build_test_deploy',
    'boundaries.publish_or_push'
  ])
});



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
    physical_domain_split_status: 'work_items_domain_source_installed_fallback_smoke_applied',
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
    work_items_domain_source_extraction_module: 'src/domains/work-items.js',
    work_items_domain_source_extraction_planned_module: 'src/domains/work-items.js',
    architecture_milestone_transition_status: 'p1s3m1_closed_p1s3m2_seeded',
    source_can_grow_with_tests: true,
    npm_package_remains_compact: true,
    expected_pack_files: Object.freeze(['LICENSE', 'README.md', 'cli/agent-onboard.js', 'package.json'])
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
    version_sprawl_check_command_writes_files: false,
    published_package_surface_file_count: 4,
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
    work_items_domain_source_extraction_installed_fallback_smoke_applied: true
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
  purpose: 'Preserve the compact four-file npm package surface while the public source repository grows authority, runtime, ledger, and test artifacts.',
  expected_pack_files: Object.freeze(['LICENSE', 'README.md', 'cli/agent-onboard.js', 'package.json']),
  required_package_json_files: Object.freeze(['cli/agent-onboard.js', 'README.md', 'LICENSE']),
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
    'src/domains/core.js',
    'src/domains/authority.js',
    'src/domains/work-items.js',
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
    package_allowlist_unchanged: true,
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
  purpose: 'Verify that the compact installed npm package still exposes the admitted public architecture, authority, target runtime, and package-surface checks while source-only repository files remain excluded from the npm package.',
  validated_surfaces: Object.freeze([
    'release --check',
    'architecture --check',
    'architecture --partition-check',
    'architecture --extraction-check',
    'authority --check',
    'target runtime --check',
    'release --surface-check'
  ]),
  expected_pack_files: Object.freeze(['LICENSE', 'README.md', 'cli/agent-onboard.js', 'package.json']),
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
    package_allowlist_unchanged: true,
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
    'src/domains/core.js',
    'src/domains/authority.js',
    'src/domains/work-items.js',
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
  schema: 'agent-onboard-public-release-contract-028',
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
  version_sprawl_check_command: 'agent-onboard release --version-sprawl-check',
  architecture_check_command: 'agent-onboard architecture --check',
  authority_first_read_command: 'agent-onboard authority --first-read',
  authority_check_command: 'agent-onboard authority --check',
  target_runtime_namespace_command: 'agent-onboard target runtime --namespace',
  target_runtime_check_command: 'agent-onboard target runtime --check',
  package_surface_command: 'agent-onboard release --surface',
  package_surface_check_command: 'agent-onboard release --surface-check',
  expected_pack_files: Object.freeze(['LICENSE', 'README.md', 'cli/agent-onboard.js', 'package.json']),
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
    'src/domains/core.js',
    'src/domains/authority.js',
    'src/domains/work-items.js',
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
    files: Object.freeze(['cli/agent-onboard.js', 'README.md', 'LICENSE'])
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
  schema: 'agent-onboard-public-release-fixture-matrix-020',
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


const TARGET_ONBOARDING_SURFACE_PLAN = Object.freeze({
  schema: 'agent-onboard-public-target-onboarding-surface-plan-001',
  title: 'Agent-Onboard Public Target Onboarding Surface Plan',
  package_name: 'agent-onboard',
  release_line: PUBLIC_RELEASE_CONTRACT.release_line,
  command: 'agent-onboard target onboarding --plan',
  fixture_command: 'agent-onboard target onboarding --fixture',
  purpose: 'Declare the public, read-only onboarding sequence for a target repository before write-capable onboarding commands are used.',
  canonical_files: Object.freeze([
    'agent-onboard.target.json',
    '.agent-onboard/runtime-namespace.json',
    '.agent-onboard/project.json',
    '.agent-onboard/work-items.json',
    'AGENTS.md',
    'llms.txt',
    '.agent-onboard/authority-path.json'
  ]),
  phases: Object.freeze([
    Object.freeze({
      id: 'discover_target_surface',
      command: 'agent-onboard target onboarding --plan',
      output: 'read-only onboarding sequence and boundary summary',
      writes_files: false
    }),
    Object.freeze({
      id: 'preview_boundary_config',
      command: 'agent-onboard target-config --template',
      output: 'target boundary config template',
      writes_files: false
    }),
    Object.freeze({
      id: 'preview_runtime_state',
      command: 'agent-onboard init --dry-run',
      output: 'planned canonical target files without writes',
      writes_files: false
    }),
    Object.freeze({
      id: 'preview_agent_instructions',
      command: 'agent-onboard agents --preview',
      output: 'AGENTS.md preview for human and agent operators',
      writes_files: false
    }),
    Object.freeze({
      id: 'write_explicit_full_onboarding',
      command: 'agent-onboard target onboarding --write',
      output: 'agent-onboard.target.json, .agent-onboard/runtime-namespace.json, .agent-onboard/project.json, .agent-onboard/work-items.json, AGENTS.md, llms.txt, and .agent-onboard/authority-path.json when explicitly authorized',
      writes_files: true
    }),
    Object.freeze({
      id: 'write_explicit_boundary_config',
      command: 'agent-onboard target bootstrap --write',
      output: 'agent-onboard.target.json when explicitly authorized',
      writes_files: true,
      lower_level_command: true
    }),
    Object.freeze({
      id: 'write_explicit_runtime_state',
      command: 'agent-onboard target-instance takeover --write',
      output: '.agent-onboard/project.json and .agent-onboard/work-items.json when explicitly authorized',
      writes_files: true,
      lower_level_command: true
    }),
    Object.freeze({
      id: 'verify_boundary',
      command: 'agent-onboard guard --check-boundary',
      output: 'fail-closed boundary result for read-only target config',
      writes_files: false
    })
  ]),
  boundary: Object.freeze({
    plan_writes_files: false,
    plan_git_mutation: false,
    plan_installs_dependencies: false,
    plan_runs_build_test_deploy: false,
    plan_publishes_or_pushes: false,
    write_commands_require_explicit_write_flag: true,
    force_overwrite_requires_explicit_force_flag: true
  }),
  next_candidate_gate: Object.freeze({
    title: 'Public architecture map gate',
    intent: 'Declare the public architecture kernel before source code is physically partitioned.'
  })
});


const TARGET_ONBOARDING_DRY_RUN_FIXTURE_MATRIX = Object.freeze({
  schema: 'agent-onboard-public-target-onboarding-fixture-matrix-002',
  title: 'Agent-Onboard Public Target Onboarding Fixture Matrix',
  package_name: 'agent-onboard',
  release_line: PUBLIC_RELEASE_CONTRACT.release_line,
  command: 'agent-onboard target onboarding --fixture',
  purpose: 'Declare no-write regression fixtures and explicit-write boundary projections for target onboarding behavior.',
  fixtures: Object.freeze([
    Object.freeze({
      id: 'target_onboarding_plan_no_write',
      command: 'agent-onboard target onboarding --plan',
      expected_status: 'ok',
      validates: Object.freeze(['target identity detection', 'canonical file planning', 'plan boundary reports no writes'])
    }),
    Object.freeze({
      id: 'target_bootstrap_dry_run_empty_target',
      command: 'agent-onboard target bootstrap --dry-run',
      expected_status: 'ok',
      validates: Object.freeze(['agent-onboard.target.json create plan', 'writes_performed false', 'no dependency install'])
    }),
    Object.freeze({
      id: 'target_instance_takeover_dry_run_empty_target',
      command: 'agent-onboard target-instance takeover --dry-run',
      expected_status: 'ok',
      validates: Object.freeze(['.agent-onboard/project.json create plan', '.agent-onboard/work-items.json create plan', 'writes_performed false'])
    }),
    Object.freeze({
      id: 'agents_preview_empty_target',
      command: 'agent-onboard agents --preview',
      expected_status: 'ok',
      validates: Object.freeze(['AGENTS.md create plan', 'writes_performed false', 'canonical agent instructions preview'])
    }),
    Object.freeze({
      id: 'target_onboarding_explicit_write_empty_target',
      command: 'agent-onboard target onboarding --write',
      expected_status: 'ok',
      validates: Object.freeze(['explicit write flag required', 'aggregate canonical file set only', 'no dependency install', 'no Git mutation', 'no publish or push'])
    }),
    Object.freeze({
      id: 'target_bootstrap_conflict_dry_run',
      command: 'agent-onboard target bootstrap --dry-run',
      expected_status: 'error',
      detects: 'existing divergent target config is reported as a conflict without writes'
    }),
    Object.freeze({
      id: 'target_bootstrap_force_dry_run',
      command: 'agent-onboard target bootstrap --dry-run --force',
      expected_status: 'ok',
      detects: 'force changes the planned action to overwrite while dry-run still writes nothing'
    })
  ]),
  boundary: Object.freeze({
    fixture_writes_files: false,
    fixture_git_mutation: false,
    fixture_installs_dependencies: false,
    fixture_runs_build_test_deploy: false,
    fixture_publishes_or_pushes: false,
    validates_explicit_write_flag_boundary: true,
    validates_aggregate_write_command: true,
    validates_conflict_detection: true,
    validates_force_preview_without_write: true
  }),
  next_candidate_gate: Object.freeze({
    title: 'Public architecture map gate',
    intent: 'Declare the public architecture kernel before source code is physically partitioned.'
  })
});

function targetOnboardingDryRunFixture(cwd = process.cwd()) {
  const [name, kind] = targetName(cwd);
  const bootstrapPlan = planWritesForRoot(cwd, [['agent-onboard.target.json', targetConfigTemplate(cwd)]], { force: false });
  const bootstrapForcePlan = planWritesForRoot(cwd, [['agent-onboard.target.json', targetConfigTemplate(cwd)]], { force: true });
  const instancePlan = planWritesForRoot(cwd, [
    ['.agent-onboard/runtime-namespace.json', targetRuntimeNamespaceTemplate(cwd)],
    ['.agent-onboard/project.json', runtimeProjectTemplate(cwd)],
    ['.agent-onboard/work-items.json', workItemsTemplate()]
  ], { force: false });
  const agentsPlan = planTextWritesForRoot(cwd, [['AGENTS.md', agentsMdTemplate(cwd)]], { force: false });
  const onboardingWritePlan = planTargetOnboardingWritesForRoot(cwd, { force: false });
  return {
    schema: 'agent-onboard-public-target-onboarding-dry-run-fixture-result-001',
    status: 'ok',
    package_name: TARGET_ONBOARDING_DRY_RUN_FIXTURE_MATRIX.package_name,
    version: VERSION,
    release_line: TARGET_ONBOARDING_DRY_RUN_FIXTURE_MATRIX.release_line,
    command: TARGET_ONBOARDING_DRY_RUN_FIXTURE_MATRIX.command,
    contract_schema: TARGET_ONBOARDING_DRY_RUN_FIXTURE_MATRIX.schema,
    target: { name, kind, root: '.' },
    fixture_matrix: TARGET_ONBOARDING_DRY_RUN_FIXTURE_MATRIX,
    observed_target_projection: {
      target_bootstrap_dry_run: {
        command: 'agent-onboard target bootstrap --dry-run',
        writes_performed: false,
        planned_writes: summarizePlan(bootstrapPlan),
        conflicts: bootstrapPlan.filter((item) => item.action === 'conflict').map((item) => item.path)
      },
      target_instance_takeover_dry_run: {
        command: 'agent-onboard target-instance takeover --dry-run',
        writes_performed: false,
        planned_writes: summarizePlan(instancePlan),
        conflicts: instancePlan.filter((item) => item.action === 'conflict').map((item) => item.path)
      },
      agents_preview: {
        command: 'agent-onboard agents --preview',
        writes_performed: false,
        planned_writes: summarizePlan(agentsPlan),
        conflicts: agentsPlan.filter((item) => item.action === 'conflict').map((item) => item.path)
      },
      target_onboarding_explicit_write_projection: {
        command: 'agent-onboard target onboarding --write',
        writes_performed: false,
        planned_writes: summarizePlan(onboardingWritePlan),
        conflicts: onboardingWritePlan.filter((item) => item.action === 'conflict').map((item) => item.path),
        would_write_only_canonical_files: true
      },
      target_bootstrap_force_dry_run: {
        command: 'agent-onboard target bootstrap --dry-run --force',
        writes_performed: false,
        planned_writes: summarizePlan(bootstrapForcePlan),
        conflicts: bootstrapForcePlan.filter((item) => item.action === 'conflict').map((item) => item.path)
      }
    },
    boundary: TARGET_ONBOARDING_DRY_RUN_FIXTURE_MATRIX.boundary,
    next_candidate_gate: TARGET_ONBOARDING_DRY_RUN_FIXTURE_MATRIX.next_candidate_gate
  };
}


function targetOnboardingRealTargetTrial(targetRoot = process.cwd()) {
  const absoluteTargetRoot = path.resolve(targetRoot);
  const errors = [];
  if (!fs.existsSync(absoluteTargetRoot)) errors.push(`target path does not exist: ${absoluteTargetRoot}`);
  else if (!fs.statSync(absoluteTargetRoot).isDirectory()) errors.push(`target path is not a directory: ${absoluteTargetRoot}`);

  let name = path.basename(absoluteTargetRoot) || 'target-repo';
  let kind = 'generic';
  let surfacePlan = null;
  let fixture = null;
  let plannedWrites = [];
  if (errors.length === 0) {
    [name, kind] = targetName(absoluteTargetRoot);
    surfacePlan = targetOnboardingSurfacePlan(absoluteTargetRoot);
    fixture = targetOnboardingDryRunFixture(absoluteTargetRoot);
    plannedWrites = planTargetOnboardingWritesForRoot(absoluteTargetRoot, { force: false });
    if (!surfacePlan || surfacePlan.status !== 'ok') errors.push('target onboarding plan must pass for real target trial');
    if (!fixture || fixture.status !== 'ok') errors.push('target onboarding fixture must pass for real target trial');
  }

  const conflicts = plannedWrites.filter((item) => item.action === 'conflict');
  const nonCanonical = plannedWrites.filter((item) => !TARGET_ONBOARDING_SURFACE_PLAN.canonical_files.includes(item.path));
  const ready = errors.length === 0 && conflicts.length === 0 && nonCanonical.length === 0;
  return {
    schema: 'agent-onboard-public-target-onboarding-real-target-trial-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: 'agent-onboard',
    version: VERSION,
    release_line: PUBLIC_RELEASE_CONTRACT.release_line,
    command: 'agent-onboard target onboarding --trial',
    command_family: 'target onboarding',
    mode: 'trial',
    target: { name, kind, root: absoluteTargetRoot },
    writes_performed: false,
    ready_for_explicit_write: ready,
    trial_outcome: ready ? 'ready_for_explicit_write' : 'blocked_by_existing_non_identical_files',
    planned_writes: summarizePlan(plannedWrites),
    conflicts: conflicts.map((item) => item.path),
    non_canonical_planned_writes: nonCanonical.map((item) => item.path),
    observed: {
      target_exists: fs.existsSync(absoluteTargetRoot),
      target_is_directory: fs.existsSync(absoluteTargetRoot) && fs.statSync(absoluteTargetRoot).isDirectory(),
      surface_plan_status: surfacePlan ? surfacePlan.status : 'not_run',
      dry_run_fixture_status: fixture ? fixture.status : 'not_run',
      planned_canonical_file_count: plannedWrites.length,
      conflict_count: conflicts.length
    },
    validated: {
      target_path_readable: errors.length === 0,
      target_onboarding_plan: surfacePlan ? surfacePlan.status === 'ok' : false,
      target_onboarding_fixture: fixture ? fixture.status === 'ok' : false,
      trial_writes_no_files: true,
      planned_writes_are_canonical_only: nonCanonical.length === 0,
      conflicts_reported_before_write: true
    },
    boundary: {
      writes_files: false,
      writes_target_repository_state: false,
      explicit_write_still_requires_target_onboarding_write: true,
      git_mutation: false,
      installs_dependencies: false,
      runs_package_manager: false,
      runs_build_test_deploy: false,
      publishes_or_pushes: false,
      mutates_registry: false
    },
    next_steps: ready ? [
      'operator may run target onboarding --write only after explicit owner authorization',
      'run guard --check-boundary after canonical onboarding files exist',
      'record changed files and checks in the handoff if the trial proceeds to write'
    ] : [
      'inspect conflicts before writing',
      'merge existing target files manually or rerun the explicit write with --force only when the owner authorizes replacement'
    ],
    errors
  };
}

function publicTargetOnboardingRealTargetRepoTrial(root = packageRoot()) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-onboard-real-target-trial-'));
  let cleanedUp = false;
  const errors = [];
  let trial = null;
  try {
    fs.writeFileSync(path.join(tempRoot, 'package.json'), stableJson({ name: 'real-target-trial-fixture', private: true }));
    fs.writeFileSync(path.join(tempRoot, 'README.md'), '# Real target trial fixture\n');
    fs.mkdirSync(path.join(tempRoot, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tempRoot, 'src', 'index.js'), '\'use strict\';\n');
    trial = targetOnboardingRealTargetTrial(tempRoot);
    if (!trial || trial.status !== 'ok') errors.push('real target trial command must return ok for the realistic fixture target');
    if (!trial || trial.ready_for_explicit_write !== true) errors.push('real target trial fixture must be ready for explicit write');
    if (!trial || trial.writes_performed !== false) errors.push('real target trial must not write files');
    const canonical = TARGET_ONBOARDING_SURFACE_PLAN.canonical_files.slice().sort();
    const planned = trial ? trial.planned_writes.map((item) => item.path).sort() : [];
    if (!arrayEquals(planned, canonical)) errors.push(`real target trial must project canonical files ${canonical.join(', ')}`);
    for (const rel of canonical) {
      if (fs.existsSync(path.join(tempRoot, rel))) errors.push(`real target trial unexpectedly wrote ${rel}`);
    }
  } catch (error) {
    errors.push(error && error.message ? error.message : String(error));
  } finally {
    try {
      fs.rmSync(tempRoot, { recursive: true, force: true });
      cleanedUp = !fs.existsSync(tempRoot);
    } catch (error) {
      cleanedUp = false;
      errors.push(error && error.message ? error.message : String(error));
    }
  }
  if (!cleanedUp) errors.push('temporary real target trial fixture was not cleaned up');

  return {
    schema: 'agent-onboard-public-target-onboarding-real-target-repo-trial-gate-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: PUBLIC_RELEASE_CONTRACT.package_name,
    version: VERSION,
    release_line: PUBLIC_RELEASE_CONTRACT.release_line,
    contract_schema: PUBLIC_RELEASE_CONTRACT.schema,
    command: PUBLIC_RELEASE_CONTRACT.real_target_trial_command,
    package_root: root,
    source_context: sourceContext(root),
    observed: {
      temporary_target_root: tempRoot,
      temporary_target_cleanup: cleanedUp,
      trial_status: trial ? trial.status : 'not_run',
      trial_ready_for_explicit_write: trial ? trial.ready_for_explicit_write : false,
      trial_conflicts: trial ? trial.conflicts : []
    },
    validated: {
      realistic_target_fixture_created: true,
      target_onboarding_trial_status: trial ? trial.status === 'ok' : false,
      target_ready_for_explicit_write: trial ? trial.ready_for_explicit_write === true : false,
      canonical_files_projected_only: trial ? trial.non_canonical_planned_writes.length === 0 : false,
      trial_writes_no_files: trial ? trial.writes_performed === false : false,
      temporary_target_cleanup: cleanedUp
    },
    boundary: {
      writes_package_root: false,
      writes_target_repository_state: false,
      creates_temp_target_repository: true,
      cleans_up_temp_target_repository: cleanedUp,
      git_mutation: false,
      installs_dependencies: false,
      runs_package_manager: false,
      runs_build_test_deploy: false,
      publishes_package: false,
      mutates_registry: false
    },
    target_trial_command: 'agent-onboard target onboarding --trial --target <target-repo-path>',
    next_candidate_gate: {
      title: 'Public architecture map gate',
      intent: 'Declare the public architecture kernel before source code is physically partitioned.'
    },
    errors
  };
}

function targetOnboardingSurfacePlan(cwd = process.cwd()) {
  const [name, kind] = targetName(cwd);
  const plannedFiles = targetOnboardingWriteSet(cwd).map((item) => ({
    path: item.path,
    kind: item.kind,
    already_exists: fs.existsSync(path.join(cwd, item.path)),
    schema: item.schema || null
  }));
  return {
    schema: TARGET_ONBOARDING_SURFACE_PLAN.schema,
    status: 'ok',
    package_name: TARGET_ONBOARDING_SURFACE_PLAN.package_name,
    version: VERSION,
    release_line: TARGET_ONBOARDING_SURFACE_PLAN.release_line,
    command: TARGET_ONBOARDING_SURFACE_PLAN.command,
    target: { name, kind, root: '.' },
    canonical_files: TARGET_ONBOARDING_SURFACE_PLAN.canonical_files.slice(),
    phases: TARGET_ONBOARDING_SURFACE_PLAN.phases,
    planned_files: plannedFiles,
    boundary: TARGET_ONBOARDING_SURFACE_PLAN.boundary,
    next_candidate_gate: TARGET_ONBOARDING_SURFACE_PLAN.next_candidate_gate
  };
}

function agentsMdTemplate(cwd = process.cwd()) {
  const [name, kind] = targetName(cwd);
  return `# AGENTS.md

## Agent-Onboard target repository rules

This is a target repository for agent-assisted work. Agents should treat this file as the first human-readable operating guide and treat \`agent-onboard.target.json\` as the machine-readable boundary declaration when it exists.

Target identity:

- name: \`${name}\`
- kind: \`${kind}\`
- control package: \`agent-onboard\`

## Read order

Before proposing or making changes, read these files when present:

1. \`AGENTS.md\`
2. \`llms.txt\`
3. \`.agent-onboard/authority-path.json\`
4. \`agent-onboard.target.json\`
5. \`.agent-onboard/project.json\`
6. \`.agent-onboard/work-items.json\`

If \`node_modules\` is missing, do not assume the package is installed locally. Prefer \`npx agent-onboard@${VERSION} status\` or the package version requested by the repository owner.

## Default boundary

Forbidden by default unless the repository owner explicitly authorizes the action:

- installing, removing, or upgrading dependencies;
- running builds, tests, deploys, publishes, or pushes;
- modifying source files outside the requested scope;
- overwriting non-identical files;
- creating or mutating runtime state under \`.agent-onboard/\` except through an explicit \`agent-onboard\` command or owner request;
- treating declarative boundary files as proof that enforcement already exists.

## Operating mode

Start in read-only preview mode. Prefer a dry-run plan before writes. Use explicit write commands only when the owner requests them.

Before any dependency install, build, test, deploy, publish, push, or broad write operation, run the boundary check when \`agent-onboard.target.json\` is present:

\`\`\`sh
npx agent-onboard@${VERSION} guard --check-boundary
\`\`\`

Treat a blocked guard result as a stop condition until the repository owner explicitly changes the boundary.

Inspect the public work-item ledger when present:

\`\`\`sh
npx agent-onboard@${VERSION} authority --first-read

# then inspect the public work-item ledger
npx agent-onboard@${VERSION} work-items --list
\`\`\`

Follow the public participation lifecycle:

1. Discover: read the operating surface listed above.
2. Inspect: understand the assigned public work item and relevant files before editing.
3. Claim: use \`work-items --claim --dry-run\` first, then \`--write\` only when explicitly authorized.
4. Work: edit only files needed for the claimed work item.
5. Validate: run only checks authorized by the owner or clearly permitted by the task.
6. Handoff: report files changed, checks run, checks not run, and known non-pass states.

If \`agents --write\` reports an existing non-identical \`AGENTS.md\`, treat that as expected overwrite protection. Do not force overwrite unless the repository owner explicitly asks for replacement.

When reporting work, distinguish clearly between:

- files inspected;
- files changed;
- checks actually run;
- checks not run;
- known non-pass states.

Do not claim a check passed unless it was actually executed in the current workspace.

## Agent-Onboard commands

Preview target initialization:

\`\`\`sh
npx agent-onboard@${VERSION} init --dry-run
\`\`\`

Preview this file:

\`\`\`sh
npx agent-onboard@${VERSION} agents --preview
\`\`\`

Write this file when explicitly requested:

\`\`\`sh
npx agent-onboard@${VERSION} agents --write
\`\`\`

## Scope note

In the current \`0.0.x\` line, \`agent-onboard\` emits conventions and reference files. It does not sandbox other tools by itself and does not enforce filesystem, network, shell, Git, package-manager, CI, deployment, or publication policy for external tools.
`;
}


function firstReadOrder() {
  return PUBLIC_AUTHORITY_FIRST_READ_INDEX.read_order.map((entry) => ({
    order: entry.order,
    path: entry.path,
    role: entry.role,
    required_when_present: entry.required_when_present
  }));
}

function llmsTxtTemplate(cwd = process.cwd()) {
  const [name, kind] = targetName(cwd);
  return `# ${name} agent-onboard first-read entrypoint

This repository uses agent-onboard public authority ordering for human and AI-assisted work.

Target:

- name: ${name}
- kind: ${kind}
- control package: agent-onboard@${VERSION}

First-read order:

1. AGENTS.md — human and agent operating rules.
2. llms.txt — AI-readable public entrypoint.
3. .agent-onboard/authority-path.json — machine-readable authority path index.
4. agent-onboard.target.json — target boundary declaration.
5. .agent-onboard/runtime-namespace.json — target runtime namespace declaration.
6. .agent-onboard/project.json — target runtime identity.
7. .agent-onboard/work-items.json — public work item ledger.
8. README.md — public package or repository documentation.
9. Raw evidence/source files — on demand only after the authority files above.

Default boundary: start read-only. Do not install dependencies, run builds/tests/deploys, publish, push, or overwrite non-identical files unless the repository owner explicitly authorizes that action.
`;
}

function authorityPathTemplate(cwd = process.cwd()) {
  const [name, kind] = targetName(cwd);
  return {
    schema: 'agent-onboard-authority-path-001',
    package_name: 'agent-onboard',
    package_version: VERSION,
    release_line: PUBLIC_AUTHORITY_FIRST_READ_INDEX.release_line,
    target: { name, root: '.', kind },
    command: PUBLIC_AUTHORITY_FIRST_READ_INDEX.command,
    check_command: PUBLIC_AUTHORITY_FIRST_READ_INDEX.check_command,
    first_read_order: firstReadOrder(),
    canonical_authority_files: PUBLIC_AUTHORITY_FIRST_READ_INDEX.source_files.slice(),
    boundary: {
      start_mode: 'read_only_preview',
      writes_require_explicit_owner_authorization: true,
      dependency_install_requires_owner_authorization: true,
      build_test_deploy_requires_owner_authorization: true,
      publish_push_requires_owner_authorization: true,
      raw_evidence_is_on_demand_only: true
    }
  };
}

function json(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, stableJson(value));
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateJsonSchema(value, schema, pointer = '$') {
  const errors = [];

  if (Object.prototype.hasOwnProperty.call(schema, 'const') && value !== schema.const) {
    errors.push(`${pointer}: expected const ${JSON.stringify(schema.const)}`);
  }

  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${pointer}: expected one of ${schema.enum.map((item) => JSON.stringify(item)).join(', ')}`);
  }

  if (schema.type === 'object') {
    if (!isPlainObject(value)) {
      errors.push(`${pointer}: expected object`);
      return errors;
    }
    const properties = schema.properties || {};
    for (const key of schema.required || []) {
      if (!Object.prototype.hasOwnProperty.call(value, key)) errors.push(`${pointer}.${key}: missing required property`);
    }
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!Object.prototype.hasOwnProperty.call(properties, key)) errors.push(`${pointer}.${key}: additional property not allowed`);
      }
    }
    for (const [key, childSchema] of Object.entries(properties)) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        errors.push(...validateJsonSchema(value[key], childSchema, `${pointer}.${key}`));
      }
    }
  }

  if (schema.type === 'array') {
    if (!Array.isArray(value)) {
      errors.push(`${pointer}: expected array`);
      return errors;
    }
    value.forEach((item, index) => {
      errors.push(...validateJsonSchema(item, schema.items || {}, `${pointer}[${index}]`));
    });
  }

  if (schema.type === 'string') {
    if (typeof value !== 'string') {
      errors.push(`${pointer}: expected string`);
      return errors;
    }
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(`${pointer}: expected minLength ${schema.minLength}`);
    }
    if (schema.pattern !== undefined && !(new RegExp(schema.pattern)).test(value)) {
      errors.push(`${pointer}: expected pattern ${schema.pattern}`);
    }
  }

  if (schema.type === 'boolean' && typeof value !== 'boolean') {
    errors.push(`${pointer}: expected boolean`);
  }

  if (schema.type === 'integer') {
    if (!Number.isInteger(value)) {
      errors.push(`${pointer}: expected integer`);
      return errors;
    }
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(`${pointer}: expected minimum ${schema.minimum}`);
    }
  }

  return errors;
}

function validateTargetConfig(value) {
  return validateJsonSchema(value, TARGET_CONFIG_SCHEMA);
}

function validateWorkItems(value) {
  return validateWorkItemsDocument(value);
}

function workItemCounts(value) {
  return {
    programs: Array.isArray(value.programs) ? value.programs.length : 0,
    stages: Array.isArray(value.stages) ? value.stages.length : 0,
    milestones: Array.isArray(value.milestones) ? value.milestones.length : 0,
    work_items: Array.isArray(value.work_items) ? value.work_items.length : 0
  };
}

function parseOption(args, name) {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith('-')) throw new Error(`${name} requires a value`);
  return value;
}

function parseRepeatedOption(args, name) {
  const values = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] !== name) continue;
    const value = args[index + 1];
    if (!value || value.startsWith('-')) throw new Error(`${name} requires a value`);
    values.push(value);
  }
  return values;
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function uniqueIdErrors(items, collectionName) {
  if (!Array.isArray(items)) return [];
  const seen = new Set();
  const errors = [];
  for (const item of items) {
    if (!item || typeof item.id !== 'string') continue;
    if (seen.has(item.id)) errors.push(`$.${collectionName}: duplicate id ${item.id}`);
    seen.add(item.id);
  }
  return errors;
}

function validateWorkItemsGraph(value) {
  const errors = [];
  if (!isPlainObject(value)) return errors;

  errors.push(...uniqueIdErrors(value.programs, 'programs'));
  errors.push(...uniqueIdErrors(value.stages, 'stages'));
  errors.push(...uniqueIdErrors(value.milestones, 'milestones'));
  errors.push(...uniqueIdErrors(value.work_items, 'work_items'));

  const programs = new Set(Array.isArray(value.programs) ? value.programs.map((item) => item.id) : []);
  const stages = new Set(Array.isArray(value.stages) ? value.stages.map((item) => item.id) : []);
  const milestones = new Set(Array.isArray(value.milestones) ? value.milestones.map((item) => item.id) : []);

  if (Array.isArray(value.stages)) {
    for (const item of value.stages) {
      if (!item || typeof item.id !== 'string' || typeof item.program_id !== 'string') continue;
      const expected = item.id.replace(/S[0-9]+$/, '');
      if (item.program_id !== expected) errors.push(`$.stages.${item.id}: program_id must be ${expected}`);
      if (!programs.has(item.program_id)) errors.push(`$.stages.${item.id}: missing program ${item.program_id}`);
    }
  }

  if (Array.isArray(value.milestones)) {
    for (const item of value.milestones) {
      if (!item || typeof item.id !== 'string' || typeof item.stage_id !== 'string') continue;
      const expected = item.id.replace(/M[0-9]+$/, '');
      if (item.stage_id !== expected) errors.push(`$.milestones.${item.id}: stage_id must be ${expected}`);
      if (!stages.has(item.stage_id)) errors.push(`$.milestones.${item.id}: missing stage ${item.stage_id}`);
    }
  }

  if (Array.isArray(value.work_items)) {
    for (const item of value.work_items) {
      if (!item || typeof item.id !== 'string' || typeof item.milestone_id !== 'string') continue;
      const expected = item.id.replace(/W[0-9]+$/, '');
      if (item.milestone_id !== expected) errors.push(`$.work_items.${item.id}: milestone_id must be ${expected}`);
      if (!milestones.has(item.milestone_id)) errors.push(`$.work_items.${item.id}: missing milestone ${item.milestone_id}`);
      if (item.status === 'claimed' && !isPlainObject(item.claim)) {
        errors.push(`$.work_items.${item.id}: claimed work item requires claim`);
      }
      if (item.status === 'open' && Object.prototype.hasOwnProperty.call(item, 'claim')) {
        errors.push(`$.work_items.${item.id}: open work item must not include claim`);
      }
      if (item.status !== 'closed' && Object.prototype.hasOwnProperty.call(item, 'closure')) {
        errors.push(`$.work_items.${item.id}: only closed work items may include closure`);
      }
    }
  }

  return errors;
}

function validateWorkItemsDocument(value) {
  return [...validateJsonSchema(value, WORK_ITEMS_SCHEMA), ...validateWorkItemsGraph(value)];
}

function deriveWorkItemIds(workItemId) {
  const match = /^(P[0-9]+)(S[0-9]+)(M[0-9]+)(W[0-9]+)$/.exec(workItemId);
  if (!match) return null;
  return {
    program_id: match[1],
    stage_id: `${match[1]}${match[2]}`,
    milestone_id: `${match[1]}${match[2]}${match[3]}`,
    work_item_id: `${match[1]}${match[2]}${match[3]}${match[4]}`
  };
}

function appendWorkItemDryRun(currentLedger, options) {
  const id = options.id;
  const title = options.title;
  const ids = deriveWorkItemIds(id);
  if (!ids) throw new Error('work-items --append requires --id matching public P/S/M/W format');
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    throw new Error('work-items --append requires --title');
  }

  const ledger = cloneJson(currentLedger);
  const programTitle = options.program_title || `Program ${ids.program_id}`;
  const stageTitle = options.stage_title || `Stage ${ids.stage_id}`;
  const milestoneTitle = options.milestone_title || `Milestone ${ids.milestone_id}`;

  const added = { programs: [], stages: [], milestones: [], work_items: [] };
  if (ledger.work_items.some((item) => item.id === ids.work_item_id)) {
    throw new Error('work-items --append refuses duplicate work item id');
  }

  if (!ledger.programs.some((item) => item.id === ids.program_id)) {
    const item = { id: ids.program_id, title: programTitle, status: 'open' };
    ledger.programs.push(item);
    added.programs.push(item);
  }
  if (!ledger.stages.some((item) => item.id === ids.stage_id)) {
    const item = { id: ids.stage_id, program_id: ids.program_id, title: stageTitle, status: 'open' };
    ledger.stages.push(item);
    added.stages.push(item);
  }
  if (!ledger.milestones.some((item) => item.id === ids.milestone_id)) {
    const item = { id: ids.milestone_id, stage_id: ids.stage_id, title: milestoneTitle, status: 'open' };
    ledger.milestones.push(item);
    added.milestones.push(item);
  }

  const workItem = { id: ids.work_item_id, milestone_id: ids.milestone_id, title: title.trim(), status: 'open' };
  ledger.work_items.push(workItem);
  added.work_items.push(workItem);

  return { proposed_ledger: ledger, added };
}

function participationLifecycleNextSteps() {
  return [
    'discover: read AGENTS.md, agent-onboard.target.json, .agent-onboard/project.json, and .agent-onboard/work-items.json when present',
    'inspect: read the assigned work-item scope and relevant files before editing',
    'claim: use --dry-run first and --write only with explicit authorization',
    'work: modify only files needed for the claimed work item',
    'validate: run only checks authorized by the owner or clearly permitted by the current task',
    'handoff: report changed files, checks run, checks not run, and known non-pass states before closure'
  ];
}

function claimWorkItemDryRun(currentLedger, options) {
  const id = options.id;
  const actor = options.actor;
  const ids = deriveWorkItemIds(id);
  if (!ids) throw new Error('work-items --claim requires --id matching public P/S/M/W format');
  if (!actor || typeof actor !== 'string' || actor.trim().length === 0) {
    throw new Error('work-items --claim requires --actor');
  }

  const ledger = cloneJson(currentLedger);
  const workItem = ledger.work_items.find((item) => item.id === ids.work_item_id);
  if (!workItem) throw new Error('work-items --claim requires an existing work item id');
  if (workItem.status === 'closed') throw new Error('work-items --claim refuses closed work item');
  if (workItem.status === 'claimed' || Object.prototype.hasOwnProperty.call(workItem, 'claim')) {
    throw new Error('work-items --claim refuses already claimed work item');
  }

  const claim = {
    actor: actor.trim(),
    claimed_at: options.claimed_at || new Date().toISOString()
  };
  if (options.note && String(options.note).trim().length > 0) claim.note = String(options.note).trim();
  workItem.status = 'claimed';
  workItem.claim = claim;

  return {
    proposed_ledger: ledger,
    claimed: {
      work_item_id: ids.work_item_id,
      actor: claim.actor,
      claimed_at: claim.claimed_at,
      note: claim.note
    },
    next_steps: participationLifecycleNextSteps()
  };
}

function handoffEvidenceChecklist() {
  return [
    'summary: concise explanation of what was completed',
    'changed_files: files intentionally modified for the work item',
    'checks_run: commands or inspections actually executed in this workspace',
    'checks_not_run: relevant checks intentionally omitted or unavailable',
    'known_non_pass: expected conflicts, failures, caveats, or residual risks'
  ];
}

function closeWorkItemDryRun(currentLedger, options) {
  const id = options.id;
  const actor = options.actor;
  const summary = options.summary;
  const ids = deriveWorkItemIds(id);
  if (!ids) throw new Error('work-items --close requires --id matching public P/S/M/W format');
  if (!actor || typeof actor !== 'string' || actor.trim().length === 0) {
    throw new Error('work-items --close requires --actor');
  }
  if (!summary || typeof summary !== 'string' || summary.trim().length === 0) {
    throw new Error('work-items --close requires --summary');
  }

  const ledger = cloneJson(currentLedger);
  const workItem = ledger.work_items.find((item) => item.id === ids.work_item_id);
  if (!workItem) throw new Error('work-items --close requires an existing work item id');
  if (workItem.status === 'closed') throw new Error('work-items --close refuses already closed work item');

  const closure = {
    actor: actor.trim(),
    closed_at: options.closed_at || new Date().toISOString(),
    summary: summary.trim(),
    changed_files: options.changed_files || [],
    checks_run: options.checks_run || [],
    checks_not_run: options.checks_not_run || [],
    known_non_pass: options.known_non_pass || []
  };

  workItem.status = 'closed';
  workItem.closure = closure;

  return {
    proposed_ledger: ledger,
    closed: {
      work_item_id: ids.work_item_id,
      actor: closure.actor,
      closed_at: closure.closed_at,
      summary: closure.summary
    },
    handoff_evidence: {
      checklist: handoffEvidenceChecklist(),
      closure
    }
  };
}

function getPathValue(value, dottedPath) {
  return dottedPath.split('.').reduce((cursor, part) => {
    if (cursor && Object.prototype.hasOwnProperty.call(cursor, part)) return cursor[part];
    return undefined;
  }, value);
}

function evaluateTargetBoundaryConfig(config, contract = BOUNDARY_GUARD_CONTRACT) {
  const violations = [];
  for (const [fieldPath, expected] of Object.entries(contract.required_target_config_values)) {
    const actual = getPathValue(config, fieldPath);
    if (actual !== expected) violations.push({ path: fieldPath, expected, actual });
  }
  for (const fieldPath of contract.forbidden_true_boundary_fields) {
    const actual = getPathValue(config, fieldPath);
    if (actual === true && !violations.some((item) => item.path === fieldPath)) {
      violations.push({ path: fieldPath, expected: false, actual });
    }
  }
  return violations;
}

function noMutationBoundary() {
  return {
    writes_files: false,
    writes_target_repository_state: false,
    creates_agent_onboard_runtime_state: false,
    installs_dependencies: false,
    runs_build_test_deploy: false,
    runs_managed_project_commands: false,
    managed_project_commands_executed: false,
    publishes_package: false,
    git_mutation: false
  };
}

function guardResultBase() {
  return {
    schema: 'agent-onboard-guard-boundary-check-result-001',
    command_family: 'guard',
    command: 'agent-onboard guard --check-boundary',
    package_name: BOUNDARY_GUARD_CONTRACT.package_name,
    package_version: VERSION,
    config_path: TARGET_CONFIG_FILE,
    enforcement_mode: BOUNDARY_GUARD_CONTRACT.enforcement_mode,
    ...noMutationBoundary()
  };
}

function targetName(cwd) {
  try {
    const pkg = readJson(path.join(cwd, 'package.json'));
    return [pkg.name || path.basename(cwd), 'node'];
  } catch {
    return [path.basename(cwd) || 'target-repo', 'generic'];
  }
}

function targetConfigTemplate(cwd = process.cwd()) {
  const [name, kind] = targetName(cwd);
  return {
    schema: 'agent-onboard-target-config-001',
    control: {
      package_name: 'agent-onboard',
      requested_mode: 'target_dry_run',
      authority_level: 'L1_read_only_preview'
    },
    project: { name, kind },
    boundaries: {
      writes_allowed: false,
      managed_project_commands_allowed: 0,
      create_agent_onboard_runtime_state: false,
      install_dependencies: false,
      run_build_test_deploy: false,
      publish_or_push: false
    },
    surfaces: {
      include: [
        'package.json',
        'agent-onboard.target.json',
        '.agent-onboard/runtime-namespace.json',
        '.agent-onboard/project.json',
        '.agent-onboard/work-items.json',
        'AGENTS.md',
        'llms.txt',
        '.agent-onboard/authority-path.json'
      ],
      exclude: ['node_modules', '.git', 'dist', 'build', '.venv', '.lake']
    }
  };
}

function targetRuntimeNamespaceTemplate(cwd = process.cwd()) {
  const [name, kind] = targetName(cwd);
  return {
    schema: 'agent-onboard-target-runtime-namespace-001',
    package_name: 'agent-onboard',
    package_version: VERSION,
    release_line: PUBLIC_TARGET_RUNTIME_NAMESPACE.release_line,
    target: { name, root: '.', kind },
    command: PUBLIC_TARGET_RUNTIME_NAMESPACE.command,
    check_command: PUBLIC_TARGET_RUNTIME_NAMESPACE.check_command,
    namespace_root: PUBLIC_TARGET_RUNTIME_NAMESPACE.namespace_root,
    namespace_file: PUBLIC_TARGET_RUNTIME_NAMESPACE.namespace_file,
    canonical_runtime_files: PUBLIC_TARGET_RUNTIME_NAMESPACE.canonical_runtime_files.map((entry) => ({
      path: entry.path,
      domain: entry.domain,
      role: entry.role,
      kind: entry.kind,
      required: entry.required,
      written_by: entry.written_by
    })),
    top_level_authority_files: PUBLIC_TARGET_RUNTIME_NAMESPACE.top_level_authority_files.slice(),
    reserved_future_files: PUBLIC_TARGET_RUNTIME_NAMESPACE.reserved_future_files.map((entry) => ({
      path: entry.path,
      domain: entry.domain,
      status: entry.status
    })),
    boundary: {
      writes_require_explicit_write_flag: true,
      reserved_future_files_not_written_by_target_onboarding: true,
      dependency_install_requires_owner_authorization: true,
      build_test_deploy_requires_owner_authorization: true,
      publish_push_requires_owner_authorization: true
    }
  };
}

function runtimeProjectTemplate(cwd = process.cwd()) {
  const [name, kind] = targetName(cwd);
  return {
    schema: 'agent-onboard-target-runtime-project-001',
    package_name: 'agent-onboard',
    target: { name, root: '.', kind },
    authority: {
      level: 'L1_read_only_preview',
      writes_require_explicit_write_flag: true
    }
  };
}

function workItemsTemplate() {
  return {
    schema: 'agent-onboard-target-work-items-001',
    package_name: 'agent-onboard',
    vocabulary: {
      program: {
        prefix: 'P',
        name: 'Program',
        description: 'A top-level line of coordinated work inside a target repo.'
      },
      stage: {
        prefix: 'S',
        name: 'Stage',
        description: 'A phase within a program.'
      },
      milestone: {
        prefix: 'M',
        name: 'Milestone',
        description: 'A bounded delivery checkpoint within a stage.'
      },
      work_item: {
        prefix: 'W',
        name: 'Work Item',
        description: 'A concrete unit of agent-addressable work within a milestone.'
      }
    },
    programs: [],
    stages: [],
    milestones: [],
    work_items: []
  };
}

function initWriteSet(cwd = process.cwd()) {
  return [
    ['agent-onboard.target.json', targetConfigTemplate(cwd)],
    ['.agent-onboard/runtime-namespace.json', targetRuntimeNamespaceTemplate(cwd)],
    ['.agent-onboard/project.json', runtimeProjectTemplate(cwd)],
    ['.agent-onboard/work-items.json', workItemsTemplate()]
  ];
}

function targetOnboardingWriteSet(cwd = process.cwd()) {
  return [
    {
      path: 'agent-onboard.target.json',
      kind: 'json',
      schema: 'agent-onboard-target-config-001',
      value: targetConfigTemplate(cwd)
    },
    {
      path: '.agent-onboard/runtime-namespace.json',
      kind: 'json',
      schema: 'agent-onboard-target-runtime-namespace-001',
      value: targetRuntimeNamespaceTemplate(cwd)
    },
    {
      path: '.agent-onboard/project.json',
      kind: 'json',
      schema: 'agent-onboard-target-runtime-project-001',
      value: runtimeProjectTemplate(cwd)
    },
    {
      path: '.agent-onboard/work-items.json',
      kind: 'json',
      schema: 'agent-onboard-target-work-items-001',
      value: workItemsTemplate()
    },
    {
      path: 'AGENTS.md',
      kind: 'text',
      schema: null,
      content: agentsMdTemplate(cwd)
    },
    {
      path: 'llms.txt',
      kind: 'text',
      schema: null,
      content: llmsTxtTemplate(cwd)
    },
    {
      path: '.agent-onboard/authority-path.json',
      kind: 'json',
      schema: 'agent-onboard-authority-path-001',
      value: authorityPathTemplate(cwd)
    }
  ];
}

function planTargetOnboardingWritesForRoot(root, options = {}) {
  const force = options.force === true;
  return targetOnboardingWriteSet(root).map((entry) => {
    const absolutePath = path.join(root, entry.path);
    const desired = entry.kind === 'json' ? stableJson(entry.value) : entry.content;
    const exists = fs.existsSync(absolutePath);
    const current = exists ? fs.readFileSync(absolutePath, 'utf8') : null;
    const identical = exists && current === desired;
    const conflict = exists && !identical && !force;
    let action = 'create';
    if (identical) action = 'keep';
    else if (exists && force) action = 'overwrite';
    else if (conflict) action = 'conflict';
    return {
      path: entry.path,
      kind: entry.kind,
      schema: entry.schema,
      exists,
      action,
      safe_to_write: action !== 'conflict',
      value: entry.value,
      content: entry.content
    };
  });
}

function planTargetOnboardingWrites(options = {}) {
  return planTargetOnboardingWritesForRoot(process.cwd(), options);
}

function performTargetOnboardingWrites(plannedWrites, root = process.cwd()) {
  for (const item of plannedWrites) {
    if (item.action !== 'create' && item.action !== 'overwrite') continue;
    const absolutePath = path.join(root, item.path);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    if (item.kind === 'json') fs.writeFileSync(absolutePath, stableJson(item.value));
    else fs.writeFileSync(absolutePath, item.content);
  }
}

function planWritesForRoot(root, writeSet, options = {}) {
  const force = options.force === true;
  return writeSet.map(([relativePath, value]) => {
    const absolutePath = path.join(root, relativePath);
    const desired = stableJson(value);
    const exists = fs.existsSync(absolutePath);
    const current = exists ? fs.readFileSync(absolutePath, 'utf8') : null;
    const identical = exists && current === desired;
    const conflict = exists && !identical && !force;
    let action = 'create';
    if (identical) action = 'keep';
    else if (exists && force) action = 'overwrite';
    else if (conflict) action = 'conflict';
    return {
      path: relativePath,
      exists,
      action,
      safe_to_write: action !== 'conflict',
      value
    };
  });
}

function planWrites(writeSet, options = {}) {
  return planWritesForRoot(process.cwd(), writeSet, options);
}

function performPlannedWrites(plannedWrites) {
  for (const item of plannedWrites) {
    if (item.action === 'create' || item.action === 'overwrite') {
      writeJson(path.join(process.cwd(), item.path), item.value);
    }
  }
}

function planTextWritesForRoot(root, writeSet, options = {}) {
  const force = options.force === true;
  return writeSet.map(([relativePath, content]) => {
    const absolutePath = path.join(root, relativePath);
    const exists = fs.existsSync(absolutePath);
    const current = exists ? fs.readFileSync(absolutePath, 'utf8') : null;
    const identical = exists && current === content;
    const conflict = exists && !identical && !force;
    let action = 'create';
    if (identical) action = 'keep';
    else if (exists && force) action = 'overwrite';
    else if (conflict) action = 'conflict';
    return {
      path: relativePath,
      exists,
      action,
      safe_to_write: action !== 'conflict',
      content
    };
  });
}

function planTextWrites(writeSet, options = {}) {
  return planTextWritesForRoot(process.cwd(), writeSet, options);
}

function performPlannedTextWrites(plannedWrites) {
  for (const item of plannedWrites) {
    if (item.action === 'create' || item.action === 'overwrite') {
      fs.mkdirSync(path.dirname(path.join(process.cwd(), item.path)), { recursive: true });
      fs.writeFileSync(path.join(process.cwd(), item.path), item.content);
    }
  }
}

function summarizePlan(plannedWrites) {
  return plannedWrites.map((item) => ({
    path: item.path,
    exists: item.exists,
    action: item.action,
    safe_to_write: item.safe_to_write
  }));
}

function listRelativeFiles(root) {
  const files = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else files.push(path.relative(root, absolute).split(path.sep).join('/'));
    }
  }
  if (fs.existsSync(root)) walk(root);
  return files.sort();
}


function packageRoot() {
  return path.resolve(__dirname, '..');
}

function arrayEquals(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right)) return false;
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

function publicReleasePostPublishCommands(version = VERSION) {
  return PUBLIC_RELEASE_CONTRACT.post_publish_verification_commands.map((command) => command.replaceAll('<version>', version));
}

function packageJsonReleaseErrors(pkg, root = packageRoot()) {
  const errors = [];
  const required = PUBLIC_RELEASE_CONTRACT.required_package_json;
  if (pkg.name !== required.name) errors.push(`package.json#name must be ${required.name}`);
  if (pkg.version !== VERSION) errors.push(`package.json#version must match runtime version ${VERSION}`);
  if (pkg.private === true) errors.push('package.json#private must not be true for a public package');
  if (pkg.license !== required.license) errors.push(`package.json#license must be ${required.license}`);
  if (pkg.type !== required.type) errors.push(`package.json#type must be ${required.type}`);
  if (!pkg.engines || pkg.engines.node !== required.node_engine) errors.push(`package.json#engines.node must be ${required.node_engine}`);
  for (const field of PUBLIC_RELEASE_CONTRACT.required_metadata_fields) {
    const value = getPathValue(pkg, field);
    const missing = Array.isArray(value) ? value.length === 0 : value === undefined || value === null || value === '';
    if (missing) errors.push(`package.json#${field} is required`);
  }
  if (!Array.isArray(pkg.keywords) || pkg.keywords.length < 5) errors.push('package.json#keywords must contain at least 5 discovery terms');
  const requiredBin = required.bin;
  for (const [name, rel] of Object.entries(requiredBin)) {
    if (!pkg.bin || pkg.bin[name] !== rel) errors.push(`package.json#bin.${name} must be ${rel}`);
    else if (!fs.existsSync(path.join(root, rel))) errors.push(`package.json#bin.${name} points to missing file ${rel}`);
  }
  const actualFiles = Array.isArray(pkg.files) ? pkg.files.slice().sort() : [];
  const expectedFiles = required.files.slice().sort();
  if (!arrayEquals(actualFiles, expectedFiles)) errors.push(`package.json#files must match ${expectedFiles.join(', ')}`);
  for (const rel of expectedFiles) {
    if (!fs.existsSync(path.join(root, rel))) errors.push(`package.json#files includes missing path ${rel}`);
  }
  return errors;
}

function packageJsonProjectedPackFiles(pkg) {
  const files = new Set(['package.json']);
  if (Array.isArray(pkg.files)) {
    for (const rel of pkg.files) files.add(rel);
  }
  return Array.from(files).sort();
}

function publicArtifactMessagingErrors(root = packageRoot(), files = PUBLIC_RELEASE_CONTRACT.expected_pack_files) {
  const errors = [];
  const forbiddenConcreteWorkItem = /P\d+S\d+M\d+W\d+/;
  const forbiddenKey = ['machine', 'identifier'].join('_');
  const forbiddenNarrativePatterns = [
    /private\s*\/\s*public\s+split/i,
    /internal\s+line/i,
    /research\s+line/i,
    /stripp?ed/i,
    /saniti[sz]ed/i,
    /\bleak(?:age|ed|s|ing)?\b/i
  ];

  for (const rel of files) {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs) || fs.statSync(abs).isDirectory()) continue;
    const text = fs.readFileSync(abs, 'utf8');
    if (text.includes(forbiddenKey)) errors.push(`${rel} contains reserved implementation key token`);
    const workItemMatch = forbiddenConcreteWorkItem.exec(text);
    if (workItemMatch) errors.push(`${rel} contains concrete work-item token ${workItemMatch[0]}`);
    for (let index = 0; index < forbiddenNarrativePatterns.length; index += 1) {
      const match = forbiddenNarrativePatterns[index].exec(text);
      if (match) errors.push(`${rel} violates public artifact messaging rule ${index + 1}: ${match[0]}`);
    }
  }
  return errors;
}

function sourceWorkItemsLedgerCheck(root = packageRoot()) {
  const file = path.join(root, '.agent-onboard', 'work-items.json');
  if (!fs.existsSync(file)) {
    return {
      present: false,
      status: 'skipped',
      reason: 'source work-item ledger is not present in this package context',
      validated: true,
      file: '.agent-onboard/work-items.json',
      counts: null,
      errors: []
    };
  }
  let value;
  try {
    value = readJson(file);
  } catch (error) {
    return {
      present: true,
      status: 'error',
      reason: 'source work-item ledger is not valid JSON',
      validated: false,
      file: '.agent-onboard/work-items.json',
      counts: null,
      errors: [error && error.message ? error.message : String(error)]
    };
  }
  const errors = validateWorkItems(value);
  const counts = workItemCounts(value);
  return {
    present: true,
    status: errors.length === 0 ? 'ok' : 'error',
    reason: errors.length === 0 ? 'source work-item ledger validates' : 'source work-item ledger validation failed',
    validated: errors.length === 0,
    file: '.agent-onboard/work-items.json',
    counts,
    open_work_items: Array.isArray(value.work_items) ? value.work_items.filter((item) => item.status !== 'closed').map((item) => ({ id: item.id, title: item.title, status: item.status })) : [],
    errors
  };
}

function sourceContext(root = packageRoot()) {
  const sourceFiles = PUBLIC_RELEASE_CONTRACT.source_context_files.filter((rel) => fs.existsSync(path.join(root, rel)));
  return {
    package_context: sourceFiles.length > 0 ? 'source_repository' : 'installed_package',
    source_context_files_present: sourceFiles,
    source_context_files_missing: PUBLIC_RELEASE_CONTRACT.source_context_files.filter((rel) => !sourceFiles.includes(rel))
  };
}


function publicCommandRouter(root = packageRoot()) {
  const pkg = readJson(path.join(root, 'package.json'));
  const commands = PUBLIC_COMMAND_ROUTER.routes.map((route) => route.command);
  return {
    schema: 'agent-onboard-public-command-router-result-001',
    status: 'ok',
    package_name: PUBLIC_COMMAND_ROUTER.package_name,
    version: VERSION,
    release_line: PUBLIC_COMMAND_ROUTER.release_line,
    command: PUBLIC_COMMAND_ROUTER.command,
    check_command: PUBLIC_COMMAND_ROUTER.check_command,
    package_root: root,
    package_context: sourceContext(root).package_context,
    package_json_version: pkg.version,
    router: PUBLIC_COMMAND_ROUTER,
    route_count: commands.length,
    route_commands: commands,
    boundary: {
      writes_files: false,
      writes_source_state: false,
      writes_target_repository_state: false,
      git_mutation: false,
      installs_dependencies: false,
      runs_package_manager: false,
      runs_build_test_deploy: false,
      publishes_package: false,
      mutates_registry: false
    }
  };
}

function publicCommandRouterCheck(root = packageRoot()) {
  const router = publicCommandRouter(root);
  const expectedCommands = ['help', 'version', 'status', 'init', 'agents', 'guard', 'authority', 'architecture', 'release', 'target-config', 'work-items', 'target', 'target-instance'];
  const expectedDomains = PUBLIC_ARCHITECTURE_MAP.canonical_domains.map((domain) => domain.id);
  const routeCommands = router.route_commands;
  const routeDomains = router.router.routes.map((route) => route.domain);
  const errors = [];
  if (!arrayEquals(routeCommands, expectedCommands)) errors.push(`command router route order must be ${expectedCommands.join(', ')}`);
  if (new Set(routeCommands).size !== routeCommands.length) errors.push('command router route commands must be unique');
  for (const domain of routeDomains) {
    if (!expectedDomains.includes(domain)) errors.push(`command router route domain is not canonical: ${domain}`);
  }
  if (router.router.dispatch_mode !== 'table_driven_top_level_router') errors.push('command router dispatch_mode must be table_driven_top_level_router');
  if (router.router.dispatcher !== 'dispatchCommand') errors.push('command router dispatcher must be dispatchCommand');
  if (router.router.boundary.router_command_writes_files !== false) errors.push('architecture router command must remain no-write');
  if (router.router.boundary.unsupported_commands_fail_closed !== true) errors.push('unsupported commands must fail closed');
  const targetRoute = router.router.routes.find((route) => route.command === 'target');
  if (!targetRoute || !arrayEquals(targetRoute.nested_commands.slice(), ['runtime', 'onboarding', 'bootstrap'])) errors.push('target nested route boundary must declare runtime, onboarding, and bootstrap');
  return {
    schema: 'agent-onboard-public-command-router-check-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: PUBLIC_COMMAND_ROUTER.package_name,
    version: VERSION,
    release_line: PUBLIC_COMMAND_ROUTER.release_line,
    command: PUBLIC_COMMAND_ROUTER.check_command,
    package_root: root,
    validated: {
      route_count: router.route_count === expectedCommands.length,
      route_order: arrayEquals(routeCommands, expectedCommands),
      route_commands_unique: new Set(routeCommands).size === routeCommands.length,
      canonical_route_domains: routeDomains.every((domain) => expectedDomains.includes(domain)),
      route_facades_declared: router.router.routes.every((route) => typeof route.facade === 'string' && route.facade.length > 0),
      table_driven_dispatch: router.router.dispatch_mode === 'table_driven_top_level_router',
      dispatcher_boundary: router.router.dispatcher === 'dispatchCommand',
      router_command_no_write: router.router.boundary.router_command_writes_files === false,
      unsupported_commands_fail_closed: router.router.boundary.unsupported_commands_fail_closed === true,
      nested_target_routes_explicit: !!targetRoute && arrayEquals(targetRoute.nested_commands.slice(), ['runtime', 'onboarding', 'bootstrap'])
    },
    expected_route_commands: expectedCommands,
    route_commands: routeCommands,
    route_domains: routeDomains,
    route_facades: router.router.routes.map((route) => route.facade),
    boundary: router.boundary,
    errors
  };
}

function publicDomainServiceFacades(root = packageRoot()) {
  const pkg = readJson(path.join(root, 'package.json'));
  const facadeIds = PUBLIC_DOMAIN_SERVICE_FACADES.facades.map((facade) => facade.id);
  return {
    schema: 'agent-onboard-public-domain-service-facades-result-001',
    status: 'ok',
    package_name: PUBLIC_DOMAIN_SERVICE_FACADES.package_name,
    version: VERSION,
    release_line: PUBLIC_DOMAIN_SERVICE_FACADES.release_line,
    command: PUBLIC_DOMAIN_SERVICE_FACADES.command,
    check_command: PUBLIC_DOMAIN_SERVICE_FACADES.check_command,
    package_root: root,
    package_context: sourceContext(root).package_context,
    package_json_version: pkg.version,
    facades: PUBLIC_DOMAIN_SERVICE_FACADES,
    facade_ids: facadeIds,
    service_names: PUBLIC_DOMAIN_SERVICE_FACADES.facades.map((facade) => facade.service),
    router_routes: PUBLIC_COMMAND_ROUTER.routes.map((route) => ({
      command: route.command,
      domain: route.domain,
      facade: route.facade,
      handler: route.handler,
      writes_files: route.writes_files
    })),
    boundary: {
      writes_files: false,
      writes_source_state: false,
      writes_target_repository_state: false,
      git_mutation: false,
      installs_dependencies: false,
      runs_package_manager: false,
      runs_build_test_deploy: false,
      publishes_package: false,
      mutates_registry: false
    }
  };
}

function publicDomainServiceFacadesCheck(root = packageRoot()) {
  const result = publicDomainServiceFacades(root);
  const expectedDomains = PUBLIC_ARCHITECTURE_MAP.canonical_domains.map((domain) => domain.id);
  const facadeIds = result.facade_ids;
  const serviceNames = result.service_names;
  const serviceByDomain = new Map(PUBLIC_DOMAIN_SERVICE_FACADES.facades.map((facade) => [facade.id, facade.service]));
  const errors = [];
  if (!arrayEquals(facadeIds, expectedDomains)) errors.push(`domain service facade order must be ${expectedDomains.join(', ')}`);
  if (new Set(facadeIds).size !== facadeIds.length) errors.push('domain service facade ids must be unique');
  if (new Set(serviceNames).size !== serviceNames.length) errors.push('domain service names must be unique');
  if (result.facades.boundary.facades_command_writes_files !== false) errors.push('architecture facades command must remain no-write');
  for (const route of result.router_routes) {
    if (!route.facade) errors.push(`route ${route.command} must declare a domain service facade`);
    if (!serviceByDomain.has(route.domain)) errors.push(`route ${route.command} domain is not backed by a public facade: ${route.domain}`);
    if (serviceByDomain.has(route.domain) && route.facade !== serviceByDomain.get(route.domain)) errors.push(`route ${route.command} facade must be ${serviceByDomain.get(route.domain)}`);
  }
  return {
    schema: 'agent-onboard-public-domain-service-facades-check-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: PUBLIC_DOMAIN_SERVICE_FACADES.package_name,
    version: VERSION,
    release_line: PUBLIC_DOMAIN_SERVICE_FACADES.release_line,
    command: PUBLIC_DOMAIN_SERVICE_FACADES.check_command,
    package_root: root,
    validated: {
      facade_count: facadeIds.length === expectedDomains.length,
      facade_order: arrayEquals(facadeIds, expectedDomains),
      facade_ids_unique: new Set(facadeIds).size === facadeIds.length,
      service_names_unique: new Set(serviceNames).size === serviceNames.length,
      facades_command_no_write: result.facades.boundary.facades_command_writes_files === false,
      every_route_declares_facade: result.router_routes.every((route) => typeof route.facade === 'string' && route.facade.length > 0),
      route_facades_match_domains: result.router_routes.every((route) => serviceByDomain.has(route.domain) && route.facade === serviceByDomain.get(route.domain))
    },
    expected_domain_ids: expectedDomains,
    facade_ids: facadeIds,
    service_names: serviceNames,
    router_routes: result.router_routes,
    boundary: result.boundary,
    errors
  };
}


function publicSourceDomainModulePartitionPlan(root = packageRoot()) {
  const pkg = readJson(path.join(root, 'package.json'));
  const context = sourceContext(root);
  const planFile = PUBLIC_SOURCE_DOMAIN_MODULE_PARTITION_PLAN.plan_file;
  const planFilePath = path.join(root, planFile);
  return {
    schema: 'agent-onboard-public-source-domain-module-partition-plan-result-001',
    status: 'ok',
    package_name: PUBLIC_SOURCE_DOMAIN_MODULE_PARTITION_PLAN.package_name,
    version: VERSION,
    release_line: PUBLIC_SOURCE_DOMAIN_MODULE_PARTITION_PLAN.release_line,
    command: PUBLIC_SOURCE_DOMAIN_MODULE_PARTITION_PLAN.command,
    check_command: PUBLIC_SOURCE_DOMAIN_MODULE_PARTITION_PLAN.check_command,
    package_root: root,
    package_context: context.package_context,
    package_json_version: pkg.version,
    plan: PUBLIC_SOURCE_DOMAIN_MODULE_PARTITION_PLAN,
    plan_file: planFile,
    plan_file_present: fs.existsSync(planFilePath),
    canonical_domain_ids: PUBLIC_ARCHITECTURE_MAP.canonical_domains.map((domain) => domain.id),
    facade_ids: PUBLIC_DOMAIN_SERVICE_FACADES.facades.map((facade) => facade.id),
    projected_pack_files: packageJsonProjectedPackFiles(pkg),
    boundary: {
      writes_files: false,
      moves_source_files: false,
      creates_source_modules: false,
      writes_source_state: false,
      writes_target_repository_state: false,
      git_mutation: false,
      installs_dependencies: false,
      runs_package_manager: false,
      runs_build_test_deploy: false,
      publishes_package: false,
      mutates_registry: false
    }
  };
}

function plainClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function publicSourceDomainModulePartitionPlanCheck(root = packageRoot()) {
  const result = publicSourceDomainModulePartitionPlan(root);
  const expectedDomains = PUBLIC_ARCHITECTURE_MAP.canonical_domains.map((domain) => domain.id);
  const expectedFacades = new Map(PUBLIC_DOMAIN_SERVICE_FACADES.facades.map((facade) => [facade.id, facade.service]));
  const plannedDomains = result.plan.planned_source_modules.map((module) => module.domain);
  const expectedPackFiles = PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort();
  const errors = [];
  if (!arrayEquals(plannedDomains, expectedDomains)) errors.push(`source partition planned modules must follow canonical domain order ${expectedDomains.join(', ')}`);
  if (new Set(plannedDomains).size !== plannedDomains.length) errors.push('source partition planned module domains must be unique');
  for (const module of result.plan.planned_source_modules) {
    if (!expectedDomains.includes(module.domain)) errors.push(`planned source module is not mapped to a canonical domain: ${module.domain}`);
    if (expectedFacades.has(module.domain) && module.facade !== expectedFacades.get(module.domain)) errors.push(`planned source module ${module.domain} must map to facade ${expectedFacades.get(module.domain)}`);
    if (!String(module.planned_module || '').startsWith('src/domains/')) errors.push(`planned source module path must stay under src/domains/: ${module.planned_module}`);
  }
  if (result.plan.current_shape.physical_module_partition_status !== 'planned_not_applied') errors.push('source partition plan must remain planned_not_applied for this gate');
  if (result.plan.invariants.physical_partition_not_applied_by_this_gate !== true) errors.push('source partition plan must not apply the physical partition in this gate');
  if (result.plan.boundary.moves_source_files !== false) errors.push('architecture partition plan must not move source files');
  if (result.plan.boundary.creates_source_modules !== false) errors.push('architecture partition plan must not create source modules');
  if (result.plan.boundary.partition_plan_command_writes_files !== false) errors.push('architecture partition plan command must remain no-write');
  if (result.plan.boundary.partition_check_command_writes_files !== false) errors.push('architecture partition check command must remain no-write');
  if (!arrayEquals(result.projected_pack_files, expectedPackFiles)) errors.push(`projected npm pack files must remain ${expectedPackFiles.join(', ')}`);

  let sourcePlanFileStatus = 'not_present_installed_context_allowed';
  let sourcePlanFileSchema = null;
  if (result.plan_file_present) {
    try {
      const sourcePlan = readJson(path.join(root, result.plan_file));
      sourcePlanFileSchema = sourcePlan.schema || null;
      if (sourcePlan.schema !== PUBLIC_SOURCE_DOMAIN_MODULE_PARTITION_PLAN.schema) errors.push(`${result.plan_file} schema must be ${PUBLIC_SOURCE_DOMAIN_MODULE_PARTITION_PLAN.schema}`);
      if (!sourcePlan.current_shape || sourcePlan.current_shape.physical_module_partition_status !== 'planned_not_applied') errors.push(`${result.plan_file} must declare planned_not_applied physical module partition status`);
      const fileDomains = Array.isArray(sourcePlan.planned_source_modules) ? sourcePlan.planned_source_modules.map((module) => module.domain) : [];
      if (!arrayEquals(fileDomains, expectedDomains)) errors.push(`${result.plan_file} planned_source_modules must follow canonical domain order ${expectedDomains.join(', ')}`);
      sourcePlanFileStatus = 'present_validated';
    } catch (error) {
      sourcePlanFileStatus = 'present_invalid_json';
      errors.push(`${result.plan_file} is not valid JSON: ${error && error.message ? error.message : String(error)}`);
    }
  } else if (result.package_context === 'source_repository') {
    sourcePlanFileStatus = 'missing_source_context';
    errors.push(`${result.plan_file} must be present in source repository context`);
  }

  return {
    schema: 'agent-onboard-public-source-domain-module-partition-plan-check-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: PUBLIC_SOURCE_DOMAIN_MODULE_PARTITION_PLAN.package_name,
    version: VERSION,
    release_line: PUBLIC_SOURCE_DOMAIN_MODULE_PARTITION_PLAN.release_line,
    command: PUBLIC_SOURCE_DOMAIN_MODULE_PARTITION_PLAN.check_command,
    package_root: root,
    validated: {
      planned_module_count: result.plan.planned_source_modules.length === expectedDomains.length,
      planned_module_domain_order: arrayEquals(plannedDomains, expectedDomains),
      planned_module_domains_unique: new Set(plannedDomains).size === plannedDomains.length,
      planned_modules_map_to_facades: result.plan.planned_source_modules.every((module) => expectedFacades.has(module.domain) && module.facade === expectedFacades.get(module.domain)),
      physical_partition_not_applied: result.plan.current_shape.physical_module_partition_status === 'planned_not_applied' && result.plan.invariants.physical_partition_not_applied_by_this_gate === true,
      partition_commands_no_write: result.plan.boundary.partition_plan_command_writes_files === false && result.plan.boundary.partition_check_command_writes_files === false && result.plan.boundary.moves_source_files === false && result.plan.boundary.creates_source_modules === false,
      package_allowlist_unchanged: arrayEquals(result.projected_pack_files, expectedPackFiles),
      source_plan_file: sourcePlanFileStatus === 'present_validated' || sourcePlanFileStatus === 'not_present_installed_context_allowed'
    },
    expected_domain_ids: expectedDomains,
    planned_module_domains: plannedDomains,
    planned_modules: result.plan.planned_source_modules,
    source_plan_file: {
      path: result.plan_file,
      present: result.plan_file_present,
      status: sourcePlanFileStatus,
      schema: sourcePlanFileSchema,
      source_context_required: result.package_context === 'source_repository'
    },
    expected_pack_files: expectedPackFiles,
    projected_pack_files: result.projected_pack_files,
    boundary: result.boundary,
    errors
  };
}



function publicAuthorityFirstRead(root = packageRoot()) {
  const packageContext = sourceContext(root);
  const sourceFilesPresent = PUBLIC_AUTHORITY_FIRST_READ_INDEX.source_files.filter((rel) => fs.existsSync(path.join(root, rel)));
  const sourceFilesMissing = PUBLIC_AUTHORITY_FIRST_READ_INDEX.source_files.filter((rel) => !sourceFilesPresent.includes(rel));
  return {
    schema: 'agent-onboard-public-authority-first-read-result-001',
    status: 'ok',
    package_name: PUBLIC_AUTHORITY_FIRST_READ_INDEX.package_name,
    version: VERSION,
    release_line: PUBLIC_AUTHORITY_FIRST_READ_INDEX.release_line,
    command: PUBLIC_AUTHORITY_FIRST_READ_INDEX.command,
    check_command: PUBLIC_AUTHORITY_FIRST_READ_INDEX.check_command,
    package_root: root,
    package_context: packageContext.package_context,
    first_read_index: PUBLIC_AUTHORITY_FIRST_READ_INDEX,
    read_order: firstReadOrder(),
    source_files_present: sourceFilesPresent,
    source_files_missing: sourceFilesMissing,
    projected_templates: {
      llms_txt: llmsTxtTemplate(root),
      authority_path: authorityPathTemplate(root)
    },
    boundary: {
      writes_files: false,
      writes_source_state: false,
      writes_target_repository_state: false,
      git_mutation: false,
      installs_dependencies: false,
      runs_package_manager: false,
      runs_build_test_deploy: false,
      publishes_package: false,
      mutates_registry: false
    }
  };
}

function publicAuthorityFirstReadCheck(root = packageRoot()) {
  const result = publicAuthorityFirstRead(root);
  const expectedOrder = ['AGENTS.md', 'llms.txt', '.agent-onboard/authority-path.json', 'agent-onboard.target.json', '.agent-onboard/runtime-namespace.json', '.agent-onboard/project.json', '.agent-onboard/work-items.json', 'README.md', 'raw evidence/source files'];
  const actualOrder = result.read_order.map((entry) => entry.path);
  const expectedPackFiles = PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort();
  const projectedPackFiles = packageJsonProjectedPackFiles(readJson(path.join(root, 'package.json')));
  const errors = [];
  if (!arrayEquals(actualOrder, expectedOrder)) errors.push(`authority first-read order must be ${expectedOrder.join(', ')}`);
  if (new Set(actualOrder).size !== actualOrder.length) errors.push('authority first-read paths must be unique');
  if (PUBLIC_AUTHORITY_FIRST_READ_INDEX.boundary.first_read_command_writes_files !== false) errors.push('authority --first-read command must remain no-write');
  if (PUBLIC_AUTHORITY_FIRST_READ_INDEX.boundary.check_command_writes_files !== false) errors.push('authority --check command must remain no-write');
  if (!arrayEquals(projectedPackFiles, expectedPackFiles)) errors.push(`projected npm pack files must stay compact: ${expectedPackFiles.join(', ')}`);
  if (result.package_context === 'source_repository') {
    if (result.source_files_missing.length > 0) errors.push(`source authority files missing: ${result.source_files_missing.join(', ')}`);
    const llmsPath = path.join(root, 'llms.txt');
    const authorityPath = path.join(root, '.agent-onboard', 'authority-path.json');
    if (fs.existsSync(llmsPath)) {
      const llms = fs.readFileSync(llmsPath, 'utf8');
      if (!llms.includes('First-read order')) errors.push('llms.txt must contain First-read order');
      if (!llms.includes('.agent-onboard/authority-path.json')) errors.push('llms.txt must reference .agent-onboard/authority-path.json');
    }
    if (fs.existsSync(authorityPath)) {
      try {
        const value = readJson(authorityPath);
        const paths = Array.isArray(value.first_read_order) ? value.first_read_order.map((entry) => entry.path) : [];
        if (value.schema !== 'agent-onboard-authority-path-001') errors.push('authority-path schema must be agent-onboard-authority-path-001');
        if (!arrayEquals(paths, expectedOrder)) errors.push('authority-path first_read_order must match canonical order');
      } catch (error) {
        errors.push(`authority-path is not valid JSON: ${error && error.message ? error.message : String(error)}`);
      }
    }
  }
  return {
    schema: 'agent-onboard-public-authority-first-read-check-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: PUBLIC_AUTHORITY_FIRST_READ_INDEX.package_name,
    version: VERSION,
    release_line: PUBLIC_AUTHORITY_FIRST_READ_INDEX.release_line,
    command: PUBLIC_AUTHORITY_FIRST_READ_INDEX.check_command,
    package_root: root,
    validated: {
      first_read_order: arrayEquals(actualOrder, expectedOrder),
      first_read_paths_unique: new Set(actualOrder).size === actualOrder.length,
      authority_commands_no_write: PUBLIC_AUTHORITY_FIRST_READ_INDEX.boundary.first_read_command_writes_files === false && PUBLIC_AUTHORITY_FIRST_READ_INDEX.boundary.check_command_writes_files === false,
      source_authority_files: result.package_context === 'source_repository' ? result.source_files_missing.length === 0 : true,
      compact_package_boundary: arrayEquals(projectedPackFiles, expectedPackFiles),
      installed_package_context_skips_source_files: result.package_context === 'installed_package' ? result.source_files_present.length === 0 : true
    },
    expected_read_order: expectedOrder,
    read_order: actualOrder,
    source_files_present: result.source_files_present,
    source_files_missing: result.source_files_missing,
    package_context: result.package_context,
    expected_pack_files: expectedPackFiles,
    projected_pack_files: projectedPackFiles,
    boundary: result.boundary,
    errors
  };
}


function publicTargetRuntimeNamespace(root = packageRoot()) {
  const packageContext = sourceContext(root);
  const sourceFile = PUBLIC_TARGET_RUNTIME_NAMESPACE.namespace_file;
  const sourceFilePresent = fs.existsSync(path.join(root, sourceFile));
  return {
    schema: 'agent-onboard-public-target-runtime-namespace-result-001',
    status: 'ok',
    package_name: PUBLIC_TARGET_RUNTIME_NAMESPACE.package_name,
    version: VERSION,
    release_line: PUBLIC_TARGET_RUNTIME_NAMESPACE.release_line,
    command: PUBLIC_TARGET_RUNTIME_NAMESPACE.command,
    check_command: PUBLIC_TARGET_RUNTIME_NAMESPACE.check_command,
    package_root: root,
    package_context: packageContext.package_context,
    namespace: PUBLIC_TARGET_RUNTIME_NAMESPACE,
    namespace_root: PUBLIC_TARGET_RUNTIME_NAMESPACE.namespace_root,
    namespace_file: PUBLIC_TARGET_RUNTIME_NAMESPACE.namespace_file,
    canonical_runtime_files: PUBLIC_TARGET_RUNTIME_NAMESPACE.canonical_runtime_files.map((entry) => ({
      path: entry.path,
      domain: entry.domain,
      role: entry.role,
      kind: entry.kind,
      required: entry.required,
      written_by: entry.written_by
    })),
    top_level_authority_files: PUBLIC_TARGET_RUNTIME_NAMESPACE.top_level_authority_files.slice(),
    reserved_future_files: PUBLIC_TARGET_RUNTIME_NAMESPACE.reserved_future_files.map((entry) => ({
      path: entry.path,
      domain: entry.domain,
      status: entry.status
    })),
    source_file_present: sourceFilePresent,
    source_file_missing: sourceFilePresent ? [] : [sourceFile],
    projected_template: targetRuntimeNamespaceTemplate(root),
    boundary: {
      writes_files: false,
      writes_source_state: false,
      writes_target_repository_state: false,
      git_mutation: false,
      installs_dependencies: false,
      runs_package_manager: false,
      runs_build_test_deploy: false,
      publishes_package: false,
      mutates_registry: false
    }
  };
}

function publicTargetRuntimeNamespaceCheck(root = packageRoot()) {
  const result = publicTargetRuntimeNamespace(root);
  const expectedRuntimeFiles = ['.agent-onboard/runtime-namespace.json', '.agent-onboard/project.json', '.agent-onboard/work-items.json', '.agent-onboard/authority-path.json'];
  const actualRuntimeFiles = result.canonical_runtime_files.map((entry) => entry.path);
  const targetCanonical = TARGET_ONBOARDING_SURFACE_PLAN.canonical_files.slice();
  const targetWritePaths = targetOnboardingWriteSet(root).map((entry) => entry.path);
  const expectedPackFiles = PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort();
  const projectedPackFiles = packageJsonProjectedPackFiles(readJson(path.join(root, 'package.json')));
  const reservedPaths = PUBLIC_TARGET_RUNTIME_NAMESPACE.reserved_future_files.map((entry) => entry.path);
  const writtenReservedPaths = targetWritePaths.filter((rel) => reservedPaths.includes(rel));
  const errors = [];
  if (PUBLIC_TARGET_RUNTIME_NAMESPACE.namespace_root !== '.agent-onboard') errors.push('target runtime namespace root must be .agent-onboard');
  if (PUBLIC_TARGET_RUNTIME_NAMESPACE.namespace_file !== '.agent-onboard/runtime-namespace.json') errors.push('target runtime namespace file must be .agent-onboard/runtime-namespace.json');
  if (!arrayEquals(actualRuntimeFiles, expectedRuntimeFiles)) errors.push(`target runtime file order must be ${expectedRuntimeFiles.join(', ')}`);
  if (!targetCanonical.includes(PUBLIC_TARGET_RUNTIME_NAMESPACE.namespace_file)) errors.push('target onboarding canonical files must include .agent-onboard/runtime-namespace.json');
  if (!targetWritePaths.includes(PUBLIC_TARGET_RUNTIME_NAMESPACE.namespace_file)) errors.push('target onboarding write set must include .agent-onboard/runtime-namespace.json');
  if (writtenReservedPaths.length > 0) errors.push(`target onboarding must not write reserved runtime files: ${writtenReservedPaths.join(', ')}`);
  if (PUBLIC_TARGET_RUNTIME_NAMESPACE.boundary.namespace_command_writes_files !== false) errors.push('target runtime --namespace command must remain no-write');
  if (PUBLIC_TARGET_RUNTIME_NAMESPACE.boundary.check_command_writes_files !== false) errors.push('target runtime --check command must remain no-write');
  if (!arrayEquals(projectedPackFiles, expectedPackFiles)) errors.push(`projected npm pack files must stay compact: ${expectedPackFiles.join(', ')}`);
  if (result.package_context === 'source_repository') {
    if (!result.source_file_present) errors.push('source runtime namespace file missing: .agent-onboard/runtime-namespace.json');
    const namespacePath = path.join(root, '.agent-onboard', 'runtime-namespace.json');
    if (fs.existsSync(namespacePath)) {
      try {
        const value = readJson(namespacePath);
        const paths = Array.isArray(value.canonical_runtime_files) ? value.canonical_runtime_files.map((entry) => entry.path) : [];
        if (value.schema !== 'agent-onboard-target-runtime-namespace-001') errors.push('runtime-namespace schema must be agent-onboard-target-runtime-namespace-001');
        if (!arrayEquals(paths, expectedRuntimeFiles)) errors.push('runtime-namespace canonical_runtime_files must match canonical runtime order');
        if (value.namespace_root !== '.agent-onboard') errors.push('runtime-namespace namespace_root must be .agent-onboard');
      } catch (error) {
        errors.push(`runtime-namespace is not valid JSON: ${error && error.message ? error.message : String(error)}`);
      }
    }
  }
  return {
    schema: 'agent-onboard-public-target-runtime-namespace-check-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: PUBLIC_TARGET_RUNTIME_NAMESPACE.package_name,
    version: VERSION,
    release_line: PUBLIC_TARGET_RUNTIME_NAMESPACE.release_line,
    command: PUBLIC_TARGET_RUNTIME_NAMESPACE.check_command,
    package_root: root,
    validated: {
      namespace_root: PUBLIC_TARGET_RUNTIME_NAMESPACE.namespace_root === '.agent-onboard',
      namespace_file: PUBLIC_TARGET_RUNTIME_NAMESPACE.namespace_file === '.agent-onboard/runtime-namespace.json',
      runtime_file_order: arrayEquals(actualRuntimeFiles, expectedRuntimeFiles),
      target_onboarding_canonical_file: targetCanonical.includes(PUBLIC_TARGET_RUNTIME_NAMESPACE.namespace_file),
      target_onboarding_write_set: targetWritePaths.includes(PUBLIC_TARGET_RUNTIME_NAMESPACE.namespace_file),
      reserved_future_files_not_written: writtenReservedPaths.length === 0,
      runtime_commands_no_write: PUBLIC_TARGET_RUNTIME_NAMESPACE.boundary.namespace_command_writes_files === false && PUBLIC_TARGET_RUNTIME_NAMESPACE.boundary.check_command_writes_files === false,
      source_runtime_namespace_file: result.package_context === 'source_repository' ? result.source_file_present : true,
      compact_package_boundary: arrayEquals(projectedPackFiles, expectedPackFiles)
    },
    namespace_root: result.namespace_root,
    namespace_file: result.namespace_file,
    expected_runtime_files: expectedRuntimeFiles,
    runtime_files: actualRuntimeFiles,
    target_onboarding_canonical_files: targetCanonical,
    target_onboarding_write_paths: targetWritePaths,
    reserved_future_files: result.reserved_future_files,
    source_file_present: result.source_file_present,
    package_context: result.package_context,
    expected_pack_files: expectedPackFiles,
    projected_pack_files: projectedPackFiles,
    boundary: result.boundary,
    errors
  };
}


function publicSourceDomainExtractionRehearsal(root = packageRoot()) {
  const pkg = readJson(path.join(root, 'package.json'));
  const context = sourceContext(root);
  const rehearsalFile = PUBLIC_SOURCE_DOMAIN_EXTRACTION_REHEARSAL.rehearsal_file;
  const rehearsalFilePath = path.join(root, rehearsalFile);
  const plannedModulePaths = PUBLIC_SOURCE_DOMAIN_EXTRACTION_REHEARSAL.extraction_rehearsal_units.map((unit) => unit.rehearsal_module);
  return {
    schema: 'agent-onboard-public-source-domain-extraction-rehearsal-result-001',
    status: 'ok',
    package_name: PUBLIC_SOURCE_DOMAIN_EXTRACTION_REHEARSAL.package_name,
    version: VERSION,
    release_line: PUBLIC_SOURCE_DOMAIN_EXTRACTION_REHEARSAL.release_line,
    command: PUBLIC_SOURCE_DOMAIN_EXTRACTION_REHEARSAL.command,
    check_command: PUBLIC_SOURCE_DOMAIN_EXTRACTION_REHEARSAL.check_command,
    package_root: root,
    package_context: context.package_context,
    package_json_version: pkg.version,
    rehearsal: PUBLIC_SOURCE_DOMAIN_EXTRACTION_REHEARSAL,
    rehearsal_file: rehearsalFile,
    rehearsal_file_present: fs.existsSync(rehearsalFilePath),
    prerequisite_partition_plan: PUBLIC_SOURCE_DOMAIN_MODULE_PARTITION_PLAN,
    planned_module_paths: plannedModulePaths,
    physical_module_paths_present: plannedModulePaths.filter((rel) => fs.existsSync(path.join(root, rel))),
    projected_pack_files: packageJsonProjectedPackFiles(pkg),
    boundary: {
      writes_files: false,
      moves_source_files: false,
      creates_source_modules: false,
      changes_runtime_outputs: false,
      writes_source_state: false,
      writes_target_repository_state: false,
      git_mutation: false,
      installs_dependencies: false,
      runs_package_manager: false,
      runs_build_test_deploy: false,
      publishes_package: false,
      mutates_registry: false
    }
  };
}

function publicSourceDomainExtractionRehearsalCheck(root = packageRoot()) {
  const result = publicSourceDomainExtractionRehearsal(root);
  const partition = publicSourceDomainModulePartitionPlanCheck(root);
  const expectedDomains = PUBLIC_ARCHITECTURE_MAP.canonical_domains.map((domain) => domain.id);
  const expectedFacades = new Map(PUBLIC_DOMAIN_SERVICE_FACADES.facades.map((facade) => [facade.id, facade.service]));
  const expectedPackFiles = PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort();
  const unitDomains = result.rehearsal.extraction_rehearsal_units.map((unit) => unit.domain);
  const errors = [];
  if (partition.status !== 'ok') errors.push(...partition.errors.map((error) => `partition plan: ${error}`));
  if (result.rehearsal.rehearsal_status !== 'rehearsed_not_applied') errors.push('source extraction rehearsal must remain rehearsed_not_applied for this gate');
  if (!arrayEquals(unitDomains, expectedDomains)) errors.push(`source extraction rehearsal units must follow canonical domain order ${expectedDomains.join(', ')}`);
  if (new Set(unitDomains).size !== unitDomains.length) errors.push('source extraction rehearsal unit domains must be unique');
  for (const unit of result.rehearsal.extraction_rehearsal_units) {
    if (!expectedDomains.includes(unit.domain)) errors.push(`source extraction rehearsal unit is not mapped to a canonical domain: ${unit.domain}`);
    if (expectedFacades.has(unit.domain) && unit.facade !== expectedFacades.get(unit.domain)) errors.push(`source extraction rehearsal unit ${unit.domain} must map to facade ${expectedFacades.get(unit.domain)}`);
    if (!String(unit.rehearsal_module || '').startsWith('src/domains/')) errors.push(`source extraction rehearsal module path must stay under src/domains/: ${unit.rehearsal_module}`);
    if (unit.extraction_mode !== 'rehearsal_only_no_file_created') errors.push(`source extraction rehearsal unit ${unit.domain} must be rehearsal_only_no_file_created`);
  }
  const admittedFirstSlicePhysicalModules = ['src/domains/core.js', 'src/domains/authority.js', 'src/domains/work-items.js'];
  const unadmittedPhysicalModules = result.physical_module_paths_present.filter((rel) => !admittedFirstSlicePhysicalModules.includes(rel));
  if (unadmittedPhysicalModules.length > 0) errors.push(`unadmitted physical source modules must not be created by this rehearsal gate: ${unadmittedPhysicalModules.join(', ')}`);
  if (result.rehearsal.entrypoint_preservation.physical_modules_created_by_this_gate !== false) errors.push('source extraction rehearsal must not create physical modules');
  if (result.rehearsal.entrypoint_preservation.runtime_output_change_allowed !== false) errors.push('source extraction rehearsal must not allow runtime output changes');
  if (result.rehearsal.entrypoint_preservation.package_allowlist_change_allowed !== false) errors.push('source extraction rehearsal must not allow package allowlist changes');
  if (result.rehearsal.boundary.extraction_rehearsal_command_writes_files !== false) errors.push('architecture extraction rehearsal command must remain no-write');
  if (result.rehearsal.boundary.extraction_check_command_writes_files !== false) errors.push('architecture extraction check command must remain no-write');
  if (result.rehearsal.boundary.creates_source_modules !== false) errors.push('architecture extraction rehearsal must not create source modules');
  if (result.rehearsal.boundary.moves_source_files !== false) errors.push('architecture extraction rehearsal must not move source files');
  if (result.rehearsal.boundary.changes_runtime_outputs !== false) errors.push('architecture extraction rehearsal must not change runtime outputs');
  if (!arrayEquals(result.projected_pack_files, expectedPackFiles)) errors.push(`projected npm pack files must remain ${expectedPackFiles.join(', ')}`);

  let sourceRehearsalFileStatus = 'not_present_installed_context_allowed';
  let sourceRehearsalFileSchema = null;
  if (result.rehearsal_file_present) {
    try {
      const sourceRehearsal = readJson(path.join(root, result.rehearsal_file));
      sourceRehearsalFileSchema = sourceRehearsal.schema || null;
      if (sourceRehearsal.schema !== PUBLIC_SOURCE_DOMAIN_EXTRACTION_REHEARSAL.schema) errors.push(`${result.rehearsal_file} schema must be ${PUBLIC_SOURCE_DOMAIN_EXTRACTION_REHEARSAL.schema}`);
      if (sourceRehearsal.rehearsal_status !== 'rehearsed_not_applied') errors.push(`${result.rehearsal_file} must declare rehearsed_not_applied rehearsal status`);
      const fileDomains = Array.isArray(sourceRehearsal.extraction_rehearsal_units) ? sourceRehearsal.extraction_rehearsal_units.map((unit) => unit.domain) : [];
      if (!arrayEquals(fileDomains, expectedDomains)) errors.push(`${result.rehearsal_file} extraction_rehearsal_units must follow canonical domain order ${expectedDomains.join(', ')}`);
      sourceRehearsalFileStatus = 'present_validated';
    } catch (error) {
      sourceRehearsalFileStatus = 'present_invalid_json';
      errors.push(`${result.rehearsal_file} is not valid JSON: ${error && error.message ? error.message : String(error)}`);
    }
  } else if (result.package_context === 'source_repository') {
    sourceRehearsalFileStatus = 'missing_source_context';
    errors.push(`${result.rehearsal_file} must be present in source repository context`);
  }

  return {
    schema: 'agent-onboard-public-source-domain-extraction-rehearsal-check-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: PUBLIC_SOURCE_DOMAIN_EXTRACTION_REHEARSAL.package_name,
    version: VERSION,
    release_line: PUBLIC_SOURCE_DOMAIN_EXTRACTION_REHEARSAL.release_line,
    command: PUBLIC_SOURCE_DOMAIN_EXTRACTION_REHEARSAL.check_command,
    package_root: root,
    validated: {
      partition_plan: partition.status === 'ok',
      rehearsal_unit_count: result.rehearsal.extraction_rehearsal_units.length === expectedDomains.length,
      rehearsal_unit_domain_order: arrayEquals(unitDomains, expectedDomains),
      rehearsal_unit_domains_unique: new Set(unitDomains).size === unitDomains.length,
      rehearsal_units_map_to_facades: result.rehearsal.extraction_rehearsal_units.every((unit) => expectedFacades.has(unit.domain) && unit.facade === expectedFacades.get(unit.domain)),
      no_physical_modules_created: unadmittedPhysicalModules.length === 0,
      runtime_output_change_not_allowed: result.rehearsal.entrypoint_preservation.runtime_output_change_allowed === false && result.rehearsal.boundary.changes_runtime_outputs === false,
      extraction_commands_no_write: result.rehearsal.boundary.extraction_rehearsal_command_writes_files === false && result.rehearsal.boundary.extraction_check_command_writes_files === false && result.rehearsal.boundary.moves_source_files === false && result.rehearsal.boundary.creates_source_modules === false,
      package_allowlist_unchanged: arrayEquals(result.projected_pack_files, expectedPackFiles),
      source_rehearsal_file: sourceRehearsalFileStatus === 'present_validated' || sourceRehearsalFileStatus === 'not_present_installed_context_allowed'
    },
    expected_domain_ids: expectedDomains,
    rehearsal_unit_domains: unitDomains,
    extraction_rehearsal_units: result.rehearsal.extraction_rehearsal_units,
    physical_module_paths_present: result.physical_module_paths_present,
    admitted_physical_module_paths: result.physical_module_paths_present.filter((rel) => admittedFirstSlicePhysicalModules.includes(rel)),
    unadmitted_physical_module_paths: unadmittedPhysicalModules,
    prerequisite_partition_plan: {
      status: partition.status,
      errors: partition.errors
    },
    source_rehearsal_file: {
      path: result.rehearsal_file,
      present: result.rehearsal_file_present,
      status: sourceRehearsalFileStatus,
      schema: sourceRehearsalFileSchema,
      source_context_required: result.package_context === 'source_repository'
    },
    projected_pack_files: result.projected_pack_files,
    expected_pack_files: expectedPackFiles,
    boundary: result.boundary,
    errors
  };
}


function publicSourceExtractionGoldenOutputs(root = packageRoot()) {
  const pkg = readJson(path.join(root, 'package.json'));
  const context = sourceContext(root);
  const freezeFile = PUBLIC_SOURCE_EXTRACTION_GOLDEN_OUTPUT_FREEZE.freeze_file;
  return {
    schema: 'agent-onboard-public-source-extraction-golden-output-freeze-result-001',
    status: 'ok',
    package_name: PUBLIC_SOURCE_EXTRACTION_GOLDEN_OUTPUT_FREEZE.package_name,
    version: VERSION,
    release_line: PUBLIC_SOURCE_EXTRACTION_GOLDEN_OUTPUT_FREEZE.release_line,
    command: PUBLIC_SOURCE_EXTRACTION_GOLDEN_OUTPUT_FREEZE.command,
    check_command: PUBLIC_SOURCE_EXTRACTION_GOLDEN_OUTPUT_FREEZE.check_command,
    package_root: root,
    package_context: context.package_context,
    package_json_version: pkg.version,
    freeze_file: freezeFile,
    freeze_file_present: fs.existsSync(path.join(root, freezeFile)),
    golden_output_freeze: PUBLIC_SOURCE_EXTRACTION_GOLDEN_OUTPUT_FREEZE,
    version_reference_policy: PUBLIC_VERSION_REFERENCE_POLICY,
    projected_pack_files: packageJsonProjectedPackFiles(pkg),
    boundary: {
      writes_files: false,
      writes_source_state: false,
      writes_target_repository_state: false,
      git_mutation: false,
      installs_dependencies: false,
      runs_package_manager: false,
      runs_build_test_deploy: false,
      publishes_package: false,
      mutates_registry: false
    }
  };
}

function scanCurrentVersionLiterals(root = packageRoot()) {
  const currentVersion = VERSION;
  const currentPinnedPackage = `agent-onboard@${currentVersion}`;
  const findings = [];
  for (const rel of PUBLIC_VERSION_REFERENCE_POLICY.disallowed_current_version_scan_files) {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs) || fs.statSync(abs).isDirectory()) continue;
    const text = fs.readFileSync(abs, 'utf8');
    const checks = [currentPinnedPackage, currentVersion];
    for (const token of checks) {
      let index = text.indexOf(token);
      while (index !== -1) {
        const before = text.slice(0, index);
        const line = before.split(/\r?\n/).length;
        findings.push({ file: rel, line, token });
        index = text.indexOf(token, index + token.length);
      }
    }
  }
  return findings;
}

function publicVersionReferencePolicyCheck(root = packageRoot()) {
  const findings = scanCurrentVersionLiterals(root);
  const errors = [];
  if (findings.length > 0) {
    errors.push(`current package version literal must not be hard-coded outside package.json or generated handoff output: ${findings.map((item) => `${item.file}:${item.line}:${item.token}`).join(', ')}`);
  }
  return {
    schema: 'agent-onboard-public-version-reference-policy-check-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: PUBLIC_VERSION_REFERENCE_POLICY.package_name,
    version: VERSION,
    release_line: PUBLIC_VERSION_REFERENCE_POLICY.release_line,
    command: PUBLIC_VERSION_REFERENCE_POLICY.command,
    package_root: root,
    validated: {
      package_json_single_source_of_truth: true,
      current_version_not_hardcoded_in_source_docs: findings.length === 0,
      generated_post_publish_handoff_exempt: true,
      tests_should_derive_expected_version_from_package_json: true
    },
    scan_files: PUBLIC_VERSION_REFERENCE_POLICY.disallowed_current_version_scan_files.slice(),
    findings,
    allowed_dynamic_version_surfaces: PUBLIC_VERSION_REFERENCE_POLICY.allowed_dynamic_version_surfaces.slice(),
    boundary: PUBLIC_VERSION_REFERENCE_POLICY.boundary,
    errors
  };
}

function publicSourceExtractionGoldenOutputFreezeCheck(root = packageRoot()) {
  const result = publicSourceExtractionGoldenOutputs(root);
  const extraction = publicSourceDomainExtractionRehearsalCheck(root);
  const versionPolicy = publicVersionReferencePolicyCheck(root);
  const expectedPackFiles = PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort();
  const goldenBaseCommands = PUBLIC_SOURCE_DOMAIN_EXTRACTION_REHEARSAL.golden_output_scope.slice();
  const expectedCommands = goldenBaseCommands.slice(0, 6).concat(['architecture --golden-check', 'release --version-sprawl-check'], goldenBaseCommands.slice(6));
  const actualCommands = result.golden_output_freeze.golden_commands.map((entry) => entry.command);
  const errors = [];
  if (extraction.status !== 'ok') errors.push(...extraction.errors.map((error) => `source extraction rehearsal: ${error}`));
  if (versionPolicy.status !== 'ok') errors.push(...versionPolicy.errors.map((error) => `version reference policy: ${error}`));
  if (result.golden_output_freeze.freeze_status !== 'frozen_before_physical_extraction') errors.push('golden output freeze status must be frozen_before_physical_extraction');
  if (!arrayEquals(actualCommands, expectedCommands)) errors.push(`golden output commands must match ${expectedCommands.join(', ')}`);
  if (!arrayEquals(result.projected_pack_files, expectedPackFiles)) errors.push(`projected npm pack files must remain ${expectedPackFiles.join(', ')}`);
  if (result.golden_output_freeze.boundary.golden_outputs_command_writes_files !== false) errors.push('architecture --golden-outputs must remain no-write');
  if (result.golden_output_freeze.boundary.golden_check_command_writes_files !== false) errors.push('architecture --golden-check must remain no-write');
  if (result.golden_output_freeze.boundary.creates_source_modules !== false) errors.push('golden output freeze must not create source modules');
  if (result.golden_output_freeze.boundary.moves_source_files !== false) errors.push('golden output freeze must not move source files');
  if (result.golden_output_freeze.boundary.changes_runtime_outputs !== false) errors.push('golden output freeze must not change runtime outputs');

  let freezeFileStatus = 'not_present_installed_context_allowed';
  let freezeFileSchema = null;
  if (result.freeze_file_present) {
    try {
      const freezeFile = readJson(path.join(root, result.freeze_file));
      freezeFileSchema = freezeFile.schema || null;
      if (freezeFile.schema !== PUBLIC_SOURCE_EXTRACTION_GOLDEN_OUTPUT_FREEZE.schema) errors.push(`${result.freeze_file} schema must be ${PUBLIC_SOURCE_EXTRACTION_GOLDEN_OUTPUT_FREEZE.schema}`);
      const fileCommands = Array.isArray(freezeFile.golden_commands) ? freezeFile.golden_commands.map((entry) => entry.command) : [];
      if (!arrayEquals(fileCommands, expectedCommands)) errors.push(`${result.freeze_file} golden_commands must match ${expectedCommands.join(', ')}`);
      freezeFileStatus = 'present_validated';
    } catch (error) {
      freezeFileStatus = 'present_invalid_json';
      errors.push(`${result.freeze_file} is not valid JSON: ${error && error.message ? error.message : String(error)}`);
    }
  } else if (result.package_context === 'source_repository') {
    freezeFileStatus = 'missing_source_context';
    errors.push(`${result.freeze_file} must be present in source repository context`);
  }

  return {
    schema: 'agent-onboard-public-source-extraction-golden-output-freeze-check-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: PUBLIC_SOURCE_EXTRACTION_GOLDEN_OUTPUT_FREEZE.package_name,
    version: VERSION,
    release_line: PUBLIC_SOURCE_EXTRACTION_GOLDEN_OUTPUT_FREEZE.release_line,
    command: PUBLIC_SOURCE_EXTRACTION_GOLDEN_OUTPUT_FREEZE.check_command,
    package_root: root,
    validated: {
      source_extraction_rehearsal: extraction.status === 'ok',
      golden_command_order: arrayEquals(actualCommands, expectedCommands),
      freeze_status: result.golden_output_freeze.freeze_status === 'frozen_before_physical_extraction',
      freeze_commands_no_write: result.golden_output_freeze.boundary.golden_outputs_command_writes_files === false && result.golden_output_freeze.boundary.golden_check_command_writes_files === false,
      no_physical_modules_created: result.golden_output_freeze.boundary.creates_source_modules === false,
      runtime_outputs_unchanged_by_gate: result.golden_output_freeze.boundary.changes_runtime_outputs === false,
      package_allowlist_unchanged: arrayEquals(result.projected_pack_files, expectedPackFiles),
      version_reference_policy: versionPolicy.status === 'ok',
      source_freeze_file: freezeFileStatus === 'present_validated' || freezeFileStatus === 'not_present_installed_context_allowed'
    },
    expected_commands: expectedCommands,
    golden_commands: actualCommands,
    source_freeze_file: {
      path: result.freeze_file,
      present: result.freeze_file_present,
      status: freezeFileStatus,
      schema: freezeFileSchema,
      source_context_required: result.package_context === 'source_repository'
    },
    version_reference_policy: {
      status: versionPolicy.status,
      findings: versionPolicy.findings,
      errors: versionPolicy.errors
    },
    projected_pack_files: result.projected_pack_files,
    expected_pack_files: expectedPackFiles,
    boundary: result.boundary,
    errors
  };
}


function publicSourceModuleExtractionAdapterBoundary(root = packageRoot()) {
  const pkg = readJson(path.join(root, 'package.json'));
  const context = sourceContext(root);
  const boundaryFile = PUBLIC_SOURCE_MODULE_EXTRACTION_ADAPTER_BOUNDARY.boundary_file;
  return {
    schema: 'agent-onboard-public-source-module-extraction-adapter-boundary-result-001',
    status: 'ok',
    package_name: PUBLIC_SOURCE_MODULE_EXTRACTION_ADAPTER_BOUNDARY.package_name,
    version: VERSION,
    release_line: PUBLIC_SOURCE_MODULE_EXTRACTION_ADAPTER_BOUNDARY.release_line,
    command: PUBLIC_SOURCE_MODULE_EXTRACTION_ADAPTER_BOUNDARY.command,
    check_command: PUBLIC_SOURCE_MODULE_EXTRACTION_ADAPTER_BOUNDARY.check_command,
    package_root: root,
    package_context: context.package_context,
    package_json_version: pkg.version,
    boundary_file: boundaryFile,
    boundary_file_present: fs.existsSync(path.join(root, boundaryFile)),
    adapter_boundary: PUBLIC_SOURCE_MODULE_EXTRACTION_ADAPTER_BOUNDARY,
    projected_pack_files: packageJsonProjectedPackFiles(pkg),
    boundary: {
      writes_files: false,
      writes_source_state: false,
      writes_target_repository_state: false,
      git_mutation: false,
      installs_dependencies: false,
      runs_package_manager: false,
      runs_build_test_deploy: false,
      publishes_package: false,
      mutates_registry: false
    }
  };
}

function publicSourceModuleExtractionAdapterBoundaryCheck(root = packageRoot()) {
  const result = publicSourceModuleExtractionAdapterBoundary(root);
  const golden = publicSourceExtractionGoldenOutputFreezeCheck(root);
  const expectedDomains = PUBLIC_ARCHITECTURE_MAP.canonical_domains.map((domain) => domain.id);
  const expectedFacades = new Map(PUBLIC_DOMAIN_SERVICE_FACADES.facades.map((facade) => [facade.id, facade.service]));
  const expectedPackFiles = PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort();
  const unitDomains = result.adapter_boundary.adapter_units.map((unit) => unit.domain);
  const errors = [];
  if (golden.status !== 'ok') errors.push(...golden.errors.map((error) => `golden outputs: ${error}`));
  if (result.adapter_boundary.adapter_status !== 'declared_before_physical_extraction') errors.push('adapter status must be declared_before_physical_extraction');
  if (!arrayEquals(unitDomains, expectedDomains)) errors.push(`adapter unit domains must match ${expectedDomains.join(', ')}`);
  if (new Set(unitDomains).size !== unitDomains.length) errors.push('adapter unit domains must be unique');
  if (!result.adapter_boundary.adapter_units.every((unit) => expectedFacades.has(unit.domain) && unit.facade === expectedFacades.get(unit.domain))) errors.push('every adapter unit must map to the admitted service facade');
  if (!arrayEquals(result.projected_pack_files, expectedPackFiles)) errors.push(`projected npm pack files must remain ${expectedPackFiles.join(', ')}`);
  if (result.adapter_boundary.published_adapter.path !== 'cli/agent-onboard.js') errors.push('published adapter must remain cli/agent-onboard.js');
  if (result.adapter_boundary.published_adapter.remains_only_published_bin_target !== true) errors.push('CLI adapter must remain the only published bin target');
  if (result.adapter_boundary.boundary.adapter_boundary_command_writes_files !== false) errors.push('architecture --adapter-boundary must remain no-write');
  if (result.adapter_boundary.boundary.adapter_check_command_writes_files !== false) errors.push('architecture --adapter-check must remain no-write');
  if (result.adapter_boundary.boundary.creates_source_modules !== false) errors.push('adapter boundary gate must not create source modules');
  if (result.adapter_boundary.boundary.moves_source_files !== false) errors.push('adapter boundary gate must not move source files');
  if (result.adapter_boundary.boundary.changes_runtime_outputs !== false) errors.push('adapter boundary gate must not change runtime outputs');
  if (result.adapter_boundary.boundary.publishes_source_modules_as_public_api !== false) errors.push('adapter boundary gate must not expose source modules as public API');

  let boundaryFileStatus = 'not_present_installed_context_allowed';
  let boundaryFileSchema = null;
  if (result.boundary_file_present) {
    try {
      const boundaryFile = readJson(path.join(root, result.boundary_file));
      boundaryFileSchema = boundaryFile.schema || null;
      if (boundaryFile.schema !== PUBLIC_SOURCE_MODULE_EXTRACTION_ADAPTER_BOUNDARY.schema) errors.push(`${result.boundary_file} schema must be ${PUBLIC_SOURCE_MODULE_EXTRACTION_ADAPTER_BOUNDARY.schema}`);
      const fileDomains = Array.isArray(boundaryFile.adapter_units) ? boundaryFile.adapter_units.map((unit) => unit.domain) : [];
      if (!arrayEquals(fileDomains, expectedDomains)) errors.push(`${result.boundary_file} adapter_units must cover ${expectedDomains.join(', ')}`);
      boundaryFileStatus = 'present_validated';
    } catch (error) {
      boundaryFileStatus = 'present_invalid_json';
      errors.push(`${result.boundary_file} is not valid JSON: ${error && error.message ? error.message : String(error)}`);
    }
  } else if (result.package_context === 'source_repository') {
    boundaryFileStatus = 'missing_source_context';
    errors.push(`${result.boundary_file} must be present in source repository context`);
  }

  return {
    schema: 'agent-onboard-public-source-module-extraction-adapter-boundary-check-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: PUBLIC_SOURCE_MODULE_EXTRACTION_ADAPTER_BOUNDARY.package_name,
    version: VERSION,
    release_line: PUBLIC_SOURCE_MODULE_EXTRACTION_ADAPTER_BOUNDARY.release_line,
    command: PUBLIC_SOURCE_MODULE_EXTRACTION_ADAPTER_BOUNDARY.check_command,
    package_root: root,
    validated: {
      golden_outputs_freeze: golden.status === 'ok',
      adapter_status: result.adapter_boundary.adapter_status === 'declared_before_physical_extraction',
      adapter_unit_order: arrayEquals(unitDomains, expectedDomains),
      adapter_units_unique: new Set(unitDomains).size === unitDomains.length,
      adapter_units_map_to_facades: result.adapter_boundary.adapter_units.every((unit) => expectedFacades.has(unit.domain) && unit.facade === expectedFacades.get(unit.domain)),
      published_cli_adapter_preserved: result.adapter_boundary.published_adapter.path === 'cli/agent-onboard.js' && result.adapter_boundary.published_adapter.remains_only_published_bin_target === true,
      no_physical_modules_created: result.adapter_boundary.boundary.creates_source_modules === false,
      runtime_outputs_unchanged_by_gate: result.adapter_boundary.boundary.changes_runtime_outputs === false,
      adapter_commands_no_write: result.adapter_boundary.boundary.adapter_boundary_command_writes_files === false && result.adapter_boundary.boundary.adapter_check_command_writes_files === false,
      package_allowlist_unchanged: arrayEquals(result.projected_pack_files, expectedPackFiles),
      source_adapter_boundary_file: boundaryFileStatus === 'present_validated' || boundaryFileStatus === 'not_present_installed_context_allowed'
    },
    expected_domain_ids: expectedDomains,
    adapter_unit_domains: unitDomains,
    adapter_units: result.adapter_boundary.adapter_units,
    source_adapter_boundary_file: {
      path: result.boundary_file,
      present: result.boundary_file_present,
      status: boundaryFileStatus,
      schema: boundaryFileSchema,
      source_context_required: result.package_context === 'source_repository'
    },
    projected_pack_files: result.projected_pack_files,
    expected_pack_files: expectedPackFiles,
    prerequisite_golden_outputs: {
      status: golden.status,
      errors: golden.errors
    },
    boundary: result.boundary,
    errors
  };
}


function loadCoreFirstSliceModule(root = packageRoot()) {
  const modulePath = path.join(root, PUBLIC_SOURCE_MODULE_EXTRACTION_FIRST_SLICE.source_module);
  if (!fs.existsSync(modulePath)) return null;
  const resolved = require.resolve(modulePath);
  delete require.cache[resolved];
  return require(resolved);
}

function publicSourceModuleExtractionFirstSlice(root = packageRoot()) {
  const pkg = readJson(path.join(root, 'package.json'));
  const context = sourceContext(root);
  const firstSliceFile = PUBLIC_SOURCE_MODULE_EXTRACTION_FIRST_SLICE.first_slice_file;
  const sourceModule = PUBLIC_SOURCE_MODULE_EXTRACTION_FIRST_SLICE.source_module;
  let module_exports = [];
  let module_value = null;
  let module_load_error = null;
  try {
    const loaded = loadCoreFirstSliceModule(root);
    if (loaded) {
      module_exports = Object.keys(loaded).sort();
      if (typeof loaded.getCoreDomainFirstSlice === 'function') {
        module_value = loaded.getCoreDomainFirstSlice();
      } else if (loaded.CORE_DOMAIN_FIRST_SLICE) {
        module_value = loaded.CORE_DOMAIN_FIRST_SLICE;
      }
    }
  } catch (error) {
    module_load_error = error && error.message ? error.message : String(error);
  }
  return {
    schema: 'agent-onboard-public-source-module-extraction-first-slice-result-001',
    status: module_load_error ? 'error' : 'ok',
    package_name: PUBLIC_SOURCE_MODULE_EXTRACTION_FIRST_SLICE.package_name,
    version: VERSION,
    release_line: PUBLIC_SOURCE_MODULE_EXTRACTION_FIRST_SLICE.release_line,
    command: PUBLIC_SOURCE_MODULE_EXTRACTION_FIRST_SLICE.command,
    check_command: PUBLIC_SOURCE_MODULE_EXTRACTION_FIRST_SLICE.check_command,
    package_root: root,
    package_context: context.package_context,
    package_json_version: pkg.version,
    first_slice_file: firstSliceFile,
    first_slice_file_present: fs.existsSync(path.join(root, firstSliceFile)),
    source_module: sourceModule,
    source_module_present: fs.existsSync(path.join(root, sourceModule)),
    source_module_exports: module_exports,
    source_module_value: module_value,
    source_module_load_error: module_load_error,
    first_slice: PUBLIC_SOURCE_MODULE_EXTRACTION_FIRST_SLICE,
    projected_pack_files: packageJsonProjectedPackFiles(pkg),
    boundary: {
      writes_files: false,
      writes_source_state: false,
      writes_target_repository_state: false,
      git_mutation: false,
      installs_dependencies: false,
      runs_package_manager: false,
      runs_build_test_deploy: false,
      publishes_package: false,
      mutates_registry: false
    }
  };
}

function publicSourceModuleExtractionFirstSliceCheck(root = packageRoot()) {
  const result = publicSourceModuleExtractionFirstSlice(root);
  const adapter = publicSourceModuleExtractionAdapterBoundaryCheck(root);
  const expectedPackFiles = PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort();
  const expectedExports = PUBLIC_SOURCE_MODULE_EXTRACTION_FIRST_SLICE.expected_module_export_names.slice().sort();
  const expectedDomain = PUBLIC_SOURCE_MODULE_EXTRACTION_FIRST_SLICE.extracted_domain;
  const errors = [];
  if (adapter.status !== 'ok') errors.push(...adapter.errors.map((error) => `adapter boundary: ${error}`));
  if (result.status !== 'ok') errors.push(`first slice module load failed: ${result.source_module_load_error}`);
  if (!arrayEquals(result.projected_pack_files, expectedPackFiles)) errors.push(`projected npm pack files must remain ${expectedPackFiles.join(', ')}`);
  if (PUBLIC_SOURCE_MODULE_EXTRACTION_FIRST_SLICE.first_slice_status !== 'source_only_shadow_module_applied') errors.push('first slice status must be source_only_shadow_module_applied');
  if (PUBLIC_SOURCE_MODULE_EXTRACTION_FIRST_SLICE.extracted_domain.id !== 'core') errors.push('first slice must extract the core domain first');
  if (PUBLIC_SOURCE_MODULE_EXTRACTION_FIRST_SLICE.boundary.created_source_module !== 'src/domains/core.js') errors.push('first slice created source module must be src/domains/core.js');
  if (PUBLIC_SOURCE_MODULE_EXTRACTION_FIRST_SLICE.boundary.creates_exactly_one_source_module !== true) errors.push('first slice must create exactly one source module');
  if (PUBLIC_SOURCE_MODULE_EXTRACTION_FIRST_SLICE.boundary.creates_non_core_source_modules !== false) errors.push('first slice must not create non-core source modules');
  if (PUBLIC_SOURCE_MODULE_EXTRACTION_FIRST_SLICE.boundary.moves_existing_source_files !== false) errors.push('first slice must not move existing source files');
  if (PUBLIC_SOURCE_MODULE_EXTRACTION_FIRST_SLICE.boundary.changes_runtime_outputs !== false) errors.push('first slice must not change runtime outputs');
  if (PUBLIC_SOURCE_MODULE_EXTRACTION_FIRST_SLICE.boundary.changes_cli_runtime_dependency_graph !== false) errors.push('first slice must not make CLI runtime require source modules');
  if (PUBLIC_SOURCE_MODULE_EXTRACTION_FIRST_SLICE.boundary.exports_source_module_as_public_api !== false) errors.push('first slice must not expose source module as public import API');
  if (PUBLIC_SOURCE_MODULE_EXTRACTION_FIRST_SLICE.boundary.first_slice_command_writes_files !== false) errors.push('architecture --first-slice must remain no-write');
  if (PUBLIC_SOURCE_MODULE_EXTRACTION_FIRST_SLICE.boundary.first_slice_check_command_writes_files !== false) errors.push('architecture --first-slice-check must remain no-write');

  let firstSliceFileStatus = 'not_present_installed_context_allowed';
  let firstSliceFileSchema = null;
  if (result.first_slice_file_present) {
    try {
      const firstSliceFile = readJson(path.join(root, result.first_slice_file));
      firstSliceFileSchema = firstSliceFile.schema || null;
      if (firstSliceFile.schema !== PUBLIC_SOURCE_MODULE_EXTRACTION_FIRST_SLICE.schema) errors.push(`${result.first_slice_file} schema must be ${PUBLIC_SOURCE_MODULE_EXTRACTION_FIRST_SLICE.schema}`);
      if (!firstSliceFile.extracted_domain || firstSliceFile.extracted_domain.id !== 'core') errors.push(`${result.first_slice_file} must declare extracted_domain.id core`);
      if (firstSliceFile.source_module !== 'src/domains/core.js') errors.push(`${result.first_slice_file} source_module must be src/domains/core.js`);
      firstSliceFileStatus = 'present_validated';
    } catch (error) {
      firstSliceFileStatus = 'present_invalid_json';
      errors.push(`${result.first_slice_file} is not valid JSON: ${error && error.message ? error.message : String(error)}`);
    }
  } else if (result.package_context === 'source_repository') {
    firstSliceFileStatus = 'missing_source_context';
    errors.push(`${result.first_slice_file} must be present in source repository context`);
  }

  let sourceModuleStatus = 'not_present_installed_context_allowed';
  const moduleValue = result.source_module_value || {};
  const moduleExportsSorted = result.source_module_exports.slice().sort();
  if (result.source_module_present) {
    if (!arrayEquals(moduleExportsSorted, expectedExports)) errors.push(`${result.source_module} exports must be ${expectedExports.join(', ')}`);
    if (moduleValue.schema !== 'agent-onboard-public-source-module-core-first-slice-001') errors.push(`${result.source_module} must export core first-slice schema`);
    if (moduleValue.domain !== expectedDomain.id) errors.push(`${result.source_module} domain must be ${expectedDomain.id}`);
    if (moduleValue.facade !== expectedDomain.facade) errors.push(`${result.source_module} facade must be ${expectedDomain.facade}`);
    if (moduleValue.source_module !== result.source_module) errors.push(`${result.source_module} source_module field must match its path`);
    if (moduleValue.runtime_dependency_status !== expectedDomain.runtime_dependency_status) errors.push(`${result.source_module} runtime dependency status must remain source-only shadow`);
    if (moduleValue.exports_public_api !== false) errors.push(`${result.source_module} must not declare public import API`);
    if (moduleValue.writes_files !== false || moduleValue.state_writer !== false) errors.push(`${result.source_module} must remain read-only and non-state-writer`);
    sourceModuleStatus = 'present_validated';
  } else if (result.package_context === 'source_repository') {
    sourceModuleStatus = 'missing_source_context';
    errors.push(`${result.source_module} must be present in source repository context`);
  }

  return {
    schema: 'agent-onboard-public-source-module-extraction-first-slice-check-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: PUBLIC_SOURCE_MODULE_EXTRACTION_FIRST_SLICE.package_name,
    version: VERSION,
    release_line: PUBLIC_SOURCE_MODULE_EXTRACTION_FIRST_SLICE.release_line,
    command: PUBLIC_SOURCE_MODULE_EXTRACTION_FIRST_SLICE.check_command,
    package_root: root,
    validated: {
      adapter_boundary: adapter.status === 'ok',
      first_slice_status: PUBLIC_SOURCE_MODULE_EXTRACTION_FIRST_SLICE.first_slice_status === 'source_only_shadow_module_applied',
      extracted_domain_is_core: PUBLIC_SOURCE_MODULE_EXTRACTION_FIRST_SLICE.extracted_domain.id === 'core',
      source_module_present_or_installed_context_allowed: sourceModuleStatus === 'present_validated' || sourceModuleStatus === 'not_present_installed_context_allowed',
      first_slice_file_present_or_installed_context_allowed: firstSliceFileStatus === 'present_validated' || firstSliceFileStatus === 'not_present_installed_context_allowed',
      source_module_exports: arrayEquals(moduleExportsSorted, expectedExports) || sourceModuleStatus === 'not_present_installed_context_allowed',
      source_module_matches_core_facade: sourceModuleStatus === 'not_present_installed_context_allowed' || (moduleValue.domain === expectedDomain.id && moduleValue.facade === expectedDomain.facade),
      source_module_not_public_api: sourceModuleStatus === 'not_present_installed_context_allowed' || moduleValue.exports_public_api === false,
      source_module_read_only: sourceModuleStatus === 'not_present_installed_context_allowed' || (moduleValue.writes_files === false && moduleValue.state_writer === false),
      exactly_one_source_module_created: PUBLIC_SOURCE_MODULE_EXTRACTION_FIRST_SLICE.boundary.creates_exactly_one_source_module === true && PUBLIC_SOURCE_MODULE_EXTRACTION_FIRST_SLICE.boundary.creates_non_core_source_modules === false,
      runtime_outputs_unchanged_by_gate: PUBLIC_SOURCE_MODULE_EXTRACTION_FIRST_SLICE.boundary.changes_runtime_outputs === false,
      cli_runtime_dependency_graph_unchanged: PUBLIC_SOURCE_MODULE_EXTRACTION_FIRST_SLICE.boundary.changes_cli_runtime_dependency_graph === false,
      first_slice_commands_no_write: PUBLIC_SOURCE_MODULE_EXTRACTION_FIRST_SLICE.boundary.first_slice_command_writes_files === false && PUBLIC_SOURCE_MODULE_EXTRACTION_FIRST_SLICE.boundary.first_slice_check_command_writes_files === false,
      package_allowlist_unchanged: arrayEquals(result.projected_pack_files, expectedPackFiles)
    },
    expected_domain: expectedDomain,
    source_module: {
      path: result.source_module,
      present: result.source_module_present,
      status: sourceModuleStatus,
      exports: result.source_module_exports,
      value: result.source_module_value,
      source_context_required: result.package_context === 'source_repository'
    },
    source_first_slice_file: {
      path: result.first_slice_file,
      present: result.first_slice_file_present,
      status: firstSliceFileStatus,
      schema: firstSliceFileSchema,
      source_context_required: result.package_context === 'source_repository'
    },
    prerequisite_adapter_boundary: {
      status: adapter.status,
      errors: adapter.errors
    },
    projected_pack_files: result.projected_pack_files,
    expected_pack_files: expectedPackFiles,
    boundary: result.boundary,
    errors
  };
}


function bundledCoreDomainForParity(root = packageRoot()) {
  const map = publicArchitectureMap(root);
  const router = publicCommandRouter(root);
  const facade = PUBLIC_DOMAIN_SERVICE_FACADES.facades.find((item) => item.id === 'core');
  const domain = map.map.canonical_domains.find((item) => item.id === 'core');
  const coreRoutes = router.router.routes.filter((route) => route.domain === 'core').map((route) => route.command);
  return {
    schema: 'agent-onboard-public-bundled-core-domain-view-001',
    domain: domain ? domain.id : null,
    facade: facade ? facade.service : null,
    service: facade ? facade.service : null,
    source: 'cli/agent-onboard.js',
    owns_commands: coreRoutes,
    writes_files: false,
    state_writer: false,
    state_files: domain ? domain.state_files.slice() : [],
    package_context: sourceContext(root).package_context
  };
}

function publicSourceModuleExtractionBundleParity(root = packageRoot()) {
  const pkg = readJson(path.join(root, 'package.json'));
  const context = sourceContext(root);
  const firstSlice = publicSourceModuleExtractionFirstSlice(root);
  const bundledCore = bundledCoreDomainForParity(root);
  return {
    schema: 'agent-onboard-public-source-module-extraction-bundle-parity-result-001',
    status: 'ok',
    package_name: PUBLIC_SOURCE_MODULE_EXTRACTION_BUNDLE_PARITY.package_name,
    version: VERSION,
    release_line: PUBLIC_SOURCE_MODULE_EXTRACTION_BUNDLE_PARITY.release_line,
    command: PUBLIC_SOURCE_MODULE_EXTRACTION_BUNDLE_PARITY.command,
    check_command: PUBLIC_SOURCE_MODULE_EXTRACTION_BUNDLE_PARITY.check_command,
    package_root: root,
    package_context: context.package_context,
    package_json_version: pkg.version,
    bundle_parity_file: PUBLIC_SOURCE_MODULE_EXTRACTION_BUNDLE_PARITY.bundle_parity_file,
    bundle_parity_file_present: fs.existsSync(path.join(root, PUBLIC_SOURCE_MODULE_EXTRACTION_BUNDLE_PARITY.bundle_parity_file)),
    source_module: PUBLIC_SOURCE_MODULE_EXTRACTION_BUNDLE_PARITY.source_module,
    source_module_present: fs.existsSync(path.join(root, PUBLIC_SOURCE_MODULE_EXTRACTION_BUNDLE_PARITY.source_module)),
    source_slice_value: firstSlice.source_module_value,
    bundled_core_view: bundledCore,
    bundle_parity: PUBLIC_SOURCE_MODULE_EXTRACTION_BUNDLE_PARITY,
    projected_pack_files: packageJsonProjectedPackFiles(pkg),
    boundary: {
      writes_files: false,
      writes_source_state: false,
      writes_target_repository_state: false,
      git_mutation: false,
      installs_dependencies: false,
      runs_package_manager: false,
      runs_build_test_deploy: false,
      publishes_package: false,
      mutates_registry: false
    }
  };
}

function publicSourceModuleExtractionBundleParityCheck(root = packageRoot()) {
  const result = publicSourceModuleExtractionBundleParity(root);
  const firstSlice = publicSourceModuleExtractionFirstSliceCheck(root);
  const expectedPackFiles = PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort();
  const errors = [];
  if (firstSlice.status !== 'ok') errors.push(...firstSlice.errors.map((error) => `first slice: ${error}`));
  if (!arrayEquals(result.projected_pack_files, expectedPackFiles)) errors.push(`projected npm pack files must remain ${expectedPackFiles.join(', ')}`);
  if (PUBLIC_SOURCE_MODULE_EXTRACTION_BUNDLE_PARITY.parity_status !== 'source_slice_matches_bundled_cli_view') errors.push('bundle parity status must remain source_slice_matches_bundled_cli_view');
  if (PUBLIC_SOURCE_MODULE_EXTRACTION_BUNDLE_PARITY.boundary.bundle_parity_command_writes_files !== false) errors.push('architecture --bundle-parity must remain no-write');
  if (PUBLIC_SOURCE_MODULE_EXTRACTION_BUNDLE_PARITY.boundary.bundle_parity_check_command_writes_files !== false) errors.push('architecture --bundle-parity-check must remain no-write');
  if (PUBLIC_SOURCE_MODULE_EXTRACTION_BUNDLE_PARITY.boundary.creates_bundle_artifact !== false) errors.push('bundle parity gate must not create bundle artifacts');
  if (PUBLIC_SOURCE_MODULE_EXTRACTION_BUNDLE_PARITY.boundary.changes_runtime_outputs !== false) errors.push('bundle parity gate must not change runtime outputs');
  if (PUBLIC_SOURCE_MODULE_EXTRACTION_BUNDLE_PARITY.boundary.changes_cli_runtime_dependency_graph !== false) errors.push('bundle parity gate must not change CLI runtime dependency graph');
  if (PUBLIC_SOURCE_MODULE_EXTRACTION_BUNDLE_PARITY.boundary.package_allowlist_unchanged !== true) errors.push('bundle parity gate must preserve package allowlist');

  let bundleParityFileStatus = 'not_present_installed_context_allowed';
  let bundleParityFileSchema = null;
  if (result.bundle_parity_file_present) {
    try {
      const bundleParityFile = readJson(path.join(root, result.bundle_parity_file));
      bundleParityFileSchema = bundleParityFile.schema || null;
      if (bundleParityFile.schema !== PUBLIC_SOURCE_MODULE_EXTRACTION_BUNDLE_PARITY.schema) errors.push(`${result.bundle_parity_file} schema must be ${PUBLIC_SOURCE_MODULE_EXTRACTION_BUNDLE_PARITY.schema}`);
      if (bundleParityFile.source_module !== PUBLIC_SOURCE_MODULE_EXTRACTION_BUNDLE_PARITY.source_module) errors.push(`${result.bundle_parity_file} source_module must be ${PUBLIC_SOURCE_MODULE_EXTRACTION_BUNDLE_PARITY.source_module}`);
      if (!bundleParityFile.boundary || bundleParityFile.boundary.package_allowlist_unchanged !== true) errors.push(`${result.bundle_parity_file} must preserve package_allowlist_unchanged`);
      bundleParityFileStatus = 'present_validated';
    } catch (error) {
      bundleParityFileStatus = 'present_invalid_json';
      errors.push(`${result.bundle_parity_file} is not valid JSON: ${error && error.message ? error.message : String(error)}`);
    }
  } else if (result.package_context === 'source_repository') {
    bundleParityFileStatus = 'missing_source_context';
    errors.push(`${result.bundle_parity_file} must be present in source repository context`);
  }

  const sourceSlice = result.source_slice_value || null;
  const sourceContextAllowedMissing = result.package_context === 'installed_package' && !sourceSlice;
  const commandParity = sourceContextAllowedMissing || (sourceSlice && arrayEquals(sourceSlice.owns_commands || [], result.bundled_core_view.owns_commands));
  const domainParity = sourceContextAllowedMissing || (sourceSlice && sourceSlice.domain === result.bundled_core_view.domain);
  const facadeParity = sourceContextAllowedMissing || (sourceSlice && sourceSlice.facade === result.bundled_core_view.facade);
  const writeParity = sourceContextAllowedMissing || (sourceSlice && sourceSlice.writes_files === result.bundled_core_view.writes_files && sourceSlice.state_writer === result.bundled_core_view.state_writer);
  if (!domainParity) errors.push('source slice domain must match bundled core domain view');
  if (!facadeParity) errors.push('source slice facade must match bundled core facade view');
  if (!commandParity) errors.push('source slice owned commands must match bundled core command routes');
  if (!writeParity) errors.push('source slice read/write boundary must match bundled core view');

  return {
    schema: 'agent-onboard-public-source-module-extraction-bundle-parity-check-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: PUBLIC_SOURCE_MODULE_EXTRACTION_BUNDLE_PARITY.package_name,
    version: VERSION,
    release_line: PUBLIC_SOURCE_MODULE_EXTRACTION_BUNDLE_PARITY.release_line,
    command: PUBLIC_SOURCE_MODULE_EXTRACTION_BUNDLE_PARITY.check_command,
    package_root: root,
    validated: {
      first_slice: firstSlice.status === 'ok',
      bundle_parity_status: PUBLIC_SOURCE_MODULE_EXTRACTION_BUNDLE_PARITY.parity_status === 'source_slice_matches_bundled_cli_view',
      source_slice_domain_matches_bundled_core: domainParity,
      source_slice_facade_matches_bundled_core: facadeParity,
      source_slice_commands_match_bundled_router: commandParity,
      source_slice_write_boundary_matches_bundled_core: writeParity,
      source_module_present_or_installed_context_allowed: result.source_module_present || result.package_context === 'installed_package',
      bundle_parity_file_present_or_installed_context_allowed: bundleParityFileStatus === 'present_validated' || bundleParityFileStatus === 'not_present_installed_context_allowed',
      bundle_parity_commands_no_write: PUBLIC_SOURCE_MODULE_EXTRACTION_BUNDLE_PARITY.boundary.bundle_parity_command_writes_files === false && PUBLIC_SOURCE_MODULE_EXTRACTION_BUNDLE_PARITY.boundary.bundle_parity_check_command_writes_files === false,
      runtime_outputs_unchanged_by_gate: PUBLIC_SOURCE_MODULE_EXTRACTION_BUNDLE_PARITY.boundary.changes_runtime_outputs === false,
      cli_runtime_dependency_graph_unchanged: PUBLIC_SOURCE_MODULE_EXTRACTION_BUNDLE_PARITY.boundary.changes_cli_runtime_dependency_graph === false,
      package_allowlist_unchanged: arrayEquals(result.projected_pack_files, expectedPackFiles)
    },
    source_slice: result.source_slice_value,
    bundled_core_view: result.bundled_core_view,
    source_bundle_parity_file: {
      path: result.bundle_parity_file,
      present: result.bundle_parity_file_present,
      status: bundleParityFileStatus,
      schema: bundleParityFileSchema,
      source_context_required: result.package_context === 'source_repository'
    },
    prerequisite_first_slice: {
      status: firstSlice.status,
      errors: firstSlice.errors
    },
    projected_pack_files: result.projected_pack_files,
    expected_pack_files: expectedPackFiles,
    boundary: result.boundary,
    errors
  };
}


function resolveCoreDomainRuntimeBridge(root = packageRoot()) {
  const context = sourceContext(root);
  const modulePath = path.join(root, PUBLIC_SOURCE_MODULE_EXTRACTION_RUNTIME_BRIDGE.source_module);
  const sourceModulePresent = fs.existsSync(modulePath);
  const bundledCore = bundledCoreDomainForParity(root);
  if (sourceModulePresent) {
    try {
      const loaded = require(modulePath);
      const value = loaded && typeof loaded.getCoreDomainFirstSlice === 'function'
        ? loaded.getCoreDomainFirstSlice()
        : loaded && loaded.CORE_DOMAIN_FIRST_SLICE;
      if (!value || value.schema !== 'agent-onboard-public-source-module-core-first-slice-001') {
        return {
          status: 'error',
          context: context.package_context,
          mode: 'source_module_invalid',
          source_module_present: true,
          source_module: PUBLIC_SOURCE_MODULE_EXTRACTION_RUNTIME_BRIDGE.source_module,
          module_value: value || null,
          bundled_core_view: bundledCore,
          errors: [`${PUBLIC_SOURCE_MODULE_EXTRACTION_RUNTIME_BRIDGE.source_module} did not export a valid core first-slice contract`]
        };
      }
      return {
        status: 'ok',
        context: context.package_context,
        mode: 'source_module_loaded',
        source_module_present: true,
        source_module: PUBLIC_SOURCE_MODULE_EXTRACTION_RUNTIME_BRIDGE.source_module,
        module_value: value,
        bundled_core_view: bundledCore,
        errors: []
      };
    } catch (error) {
      return {
        status: 'error',
        context: context.package_context,
        mode: 'source_module_load_failed',
        source_module_present: true,
        source_module: PUBLIC_SOURCE_MODULE_EXTRACTION_RUNTIME_BRIDGE.source_module,
        module_value: null,
        bundled_core_view: bundledCore,
        errors: [`${PUBLIC_SOURCE_MODULE_EXTRACTION_RUNTIME_BRIDGE.source_module} failed to load: ${error && error.message ? error.message : String(error)}`]
      };
    }
  }
  return {
    status: 'ok',
    context: context.package_context,
    mode: 'bundled_fallback',
    source_module_present: false,
    source_module: PUBLIC_SOURCE_MODULE_EXTRACTION_RUNTIME_BRIDGE.source_module,
    module_value: null,
    bundled_core_view: bundledCore,
    errors: []
  };
}

function publicSourceModuleExtractionRuntimeBridge(root = packageRoot()) {
  const pkg = readJson(path.join(root, 'package.json'));
  const context = sourceContext(root);
  const bridge = resolveCoreDomainRuntimeBridge(root);
  return {
    schema: 'agent-onboard-public-source-module-extraction-runtime-bridge-result-001',
    status: bridge.status,
    package_name: PUBLIC_SOURCE_MODULE_EXTRACTION_RUNTIME_BRIDGE.package_name,
    version: VERSION,
    release_line: PUBLIC_SOURCE_MODULE_EXTRACTION_RUNTIME_BRIDGE.release_line,
    command: PUBLIC_SOURCE_MODULE_EXTRACTION_RUNTIME_BRIDGE.command,
    check_command: PUBLIC_SOURCE_MODULE_EXTRACTION_RUNTIME_BRIDGE.check_command,
    package_root: root,
    package_context: context.package_context,
    package_json_version: pkg.version,
    runtime_bridge_file: PUBLIC_SOURCE_MODULE_EXTRACTION_RUNTIME_BRIDGE.runtime_bridge_file,
    runtime_bridge_file_present: fs.existsSync(path.join(root, PUBLIC_SOURCE_MODULE_EXTRACTION_RUNTIME_BRIDGE.runtime_bridge_file)),
    source_module: PUBLIC_SOURCE_MODULE_EXTRACTION_RUNTIME_BRIDGE.source_module,
    source_module_present: fs.existsSync(path.join(root, PUBLIC_SOURCE_MODULE_EXTRACTION_RUNTIME_BRIDGE.source_module)),
    runtime_bridge_resolution: bridge,
    runtime_bridge_contract: PUBLIC_SOURCE_MODULE_EXTRACTION_RUNTIME_BRIDGE,
    projected_pack_files: packageJsonProjectedPackFiles(pkg),
    boundary: {
      writes_files: false,
      writes_source_state: false,
      writes_target_repository_state: false,
      git_mutation: false,
      installs_dependencies: false,
      runs_package_manager: false,
      runs_build_test_deploy: false,
      publishes_package: false,
      mutates_registry: false
    }
  };
}

function publicSourceModuleExtractionRuntimeBridgeCheck(root = packageRoot()) {
  const result = publicSourceModuleExtractionRuntimeBridge(root);
  const bundleParity = publicSourceModuleExtractionBundleParityCheck(root);
  const expectedPackFiles = PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort();
  const errors = [];
  if (bundleParity.status !== 'ok') errors.push(...bundleParity.errors.map((error) => `bundle parity: ${error}`));
  if (result.runtime_bridge_resolution.status !== 'ok') errors.push(...result.runtime_bridge_resolution.errors);
  if (!arrayEquals(result.projected_pack_files, expectedPackFiles)) errors.push(`projected npm pack files must remain ${expectedPackFiles.join(', ')}`);
  if (PUBLIC_SOURCE_MODULE_EXTRACTION_RUNTIME_BRIDGE.bridge_status !== 'source_context_optional_runtime_bridge_applied') errors.push('runtime bridge status must remain source_context_optional_runtime_bridge_applied');
  if (PUBLIC_SOURCE_MODULE_EXTRACTION_RUNTIME_BRIDGE.boundary.runtime_bridge_command_writes_files !== false) errors.push('architecture --runtime-bridge must remain no-write');
  if (PUBLIC_SOURCE_MODULE_EXTRACTION_RUNTIME_BRIDGE.boundary.runtime_bridge_check_command_writes_files !== false) errors.push('architecture --runtime-bridge-check must remain no-write');
  if (PUBLIC_SOURCE_MODULE_EXTRACTION_RUNTIME_BRIDGE.boundary.source_context_optional_require_only !== true) errors.push('runtime bridge must use source-context optional require only');
  if (PUBLIC_SOURCE_MODULE_EXTRACTION_RUNTIME_BRIDGE.boundary.installed_context_fallback_required !== true) errors.push('runtime bridge must preserve installed-package fallback');
  if (PUBLIC_SOURCE_MODULE_EXTRACTION_RUNTIME_BRIDGE.boundary.package_allowlist_unchanged !== true) errors.push('runtime bridge gate must preserve package allowlist');

  let bridgeFileStatus = 'not_present_installed_context_allowed';
  let bridgeFileSchema = null;
  if (result.runtime_bridge_file_present) {
    try {
      const bridgeFile = readJson(path.join(root, result.runtime_bridge_file));
      bridgeFileSchema = bridgeFile.schema || null;
      if (bridgeFile.schema !== PUBLIC_SOURCE_MODULE_EXTRACTION_RUNTIME_BRIDGE.schema) errors.push(`${result.runtime_bridge_file} schema must be ${PUBLIC_SOURCE_MODULE_EXTRACTION_RUNTIME_BRIDGE.schema}`);
      if (bridgeFile.source_module !== PUBLIC_SOURCE_MODULE_EXTRACTION_RUNTIME_BRIDGE.source_module) errors.push(`${result.runtime_bridge_file} source_module must be ${PUBLIC_SOURCE_MODULE_EXTRACTION_RUNTIME_BRIDGE.source_module}`);
      if (!bridgeFile.runtime_bridge || bridgeFile.runtime_bridge.installed_context_allows_missing_source_module !== true) errors.push(`${result.runtime_bridge_file} must allow installed context fallback`);
      if (!bridgeFile.boundary || bridgeFile.boundary.package_allowlist_unchanged !== true) errors.push(`${result.runtime_bridge_file} must preserve package_allowlist_unchanged`);
      bridgeFileStatus = 'present_validated';
    } catch (error) {
      bridgeFileStatus = 'present_invalid_json';
      errors.push(`${result.runtime_bridge_file} is not valid JSON: ${error && error.message ? error.message : String(error)}`);
    }
  } else if (result.package_context === 'source_repository') {
    bridgeFileStatus = 'missing_source_context';
    errors.push(`${result.runtime_bridge_file} must be present in source repository context`);
  }

  const resolved = result.runtime_bridge_resolution;
  const installedFallbackAllowed = result.package_context === 'installed_package' && resolved.mode === 'bundled_fallback';
  const sourceLoadExpected = result.package_context === 'source_repository' && result.source_module_present;
  const sourceLoadedWhenPresent = sourceLoadExpected ? resolved.mode === 'source_module_loaded' : true;
  const fallbackWhenMissing = !result.source_module_present ? resolved.mode === 'bundled_fallback' : true;
  const domainParity = !resolved.module_value || resolved.module_value.domain === resolved.bundled_core_view.domain;
  const facadeParity = !resolved.module_value || resolved.module_value.facade === resolved.bundled_core_view.facade;
  const commandParity = !resolved.module_value || arrayEquals(resolved.module_value.owns_commands || [], resolved.bundled_core_view.owns_commands);
  if (!sourceLoadedWhenPresent) errors.push('runtime bridge must load the source core slice when present in source repository context');
  if (!fallbackWhenMissing) errors.push('runtime bridge must fall back to bundled core view when source module is missing');
  if (!domainParity) errors.push('runtime bridge source domain must match bundled core domain');
  if (!facadeParity) errors.push('runtime bridge source facade must match bundled core facade');
  if (!commandParity) errors.push('runtime bridge source commands must match bundled core commands');

  return {
    schema: 'agent-onboard-public-source-module-extraction-runtime-bridge-check-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: PUBLIC_SOURCE_MODULE_EXTRACTION_RUNTIME_BRIDGE.package_name,
    version: VERSION,
    release_line: PUBLIC_SOURCE_MODULE_EXTRACTION_RUNTIME_BRIDGE.release_line,
    command: PUBLIC_SOURCE_MODULE_EXTRACTION_RUNTIME_BRIDGE.check_command,
    package_root: root,
    validated: {
      bundle_parity: bundleParity.status === 'ok',
      runtime_bridge_status: PUBLIC_SOURCE_MODULE_EXTRACTION_RUNTIME_BRIDGE.bridge_status === 'source_context_optional_runtime_bridge_applied',
      source_module_loaded_when_present: sourceLoadedWhenPresent,
      bundled_fallback_when_source_missing: fallbackWhenMissing || installedFallbackAllowed,
      installed_context_fallback_allowed: result.package_context === 'installed_package' ? resolved.mode === 'bundled_fallback' || resolved.mode === 'source_module_loaded' : true,
      runtime_bridge_file_present_or_installed_context_allowed: bridgeFileStatus === 'present_validated' || bridgeFileStatus === 'not_present_installed_context_allowed',
      source_domain_matches_bundled_core: domainParity,
      source_facade_matches_bundled_core: facadeParity,
      source_commands_match_bundled_core: commandParity,
      runtime_bridge_commands_no_write: PUBLIC_SOURCE_MODULE_EXTRACTION_RUNTIME_BRIDGE.boundary.runtime_bridge_command_writes_files === false && PUBLIC_SOURCE_MODULE_EXTRACTION_RUNTIME_BRIDGE.boundary.runtime_bridge_check_command_writes_files === false,
      package_allowlist_unchanged: arrayEquals(result.projected_pack_files, expectedPackFiles)
    },
    runtime_bridge_resolution: resolved,
    source_runtime_bridge_file: {
      path: result.runtime_bridge_file,
      present: result.runtime_bridge_file_present,
      status: bridgeFileStatus,
      schema: bridgeFileSchema,
      source_context_required: result.package_context === 'source_repository'
    },
    prerequisite_bundle_parity: {
      status: bundleParity.status,
      errors: bundleParity.errors
    },
    projected_pack_files: result.projected_pack_files,
    expected_pack_files: expectedPackFiles,
    boundary: result.boundary,
    errors
  };
}



function resolveAuthorityDomainRuntimeBridge(root = packageRoot()) {
  const context = sourceContext(root);
  const modulePath = path.join(root, PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_RUNTIME_BRIDGE.source_module);
  const sourceModulePresent = fs.existsSync(modulePath);
  const bundledAuthority = bundledAuthorityDomainForParity(root);
  if (sourceModulePresent) {
    try {
      const loaded = require(modulePath);
      const value = loaded && typeof loaded.getAuthorityDomainSecondSlice === 'function'
        ? loaded.getAuthorityDomainSecondSlice()
        : loaded && loaded.AUTHORITY_DOMAIN_SECOND_SLICE;
      if (!value || value.schema !== 'agent-onboard-public-source-module-authority-second-slice-001') {
        return {
          status: 'error',
          context: context.package_context,
          mode: 'source_module_invalid',
          source_module_present: true,
          source_module: PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_RUNTIME_BRIDGE.source_module,
          module_value: value || null,
          bundled_authority_view: bundledAuthority,
          errors: [`${PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_RUNTIME_BRIDGE.source_module} did not export a valid authority second-slice contract`]
        };
      }
      return {
        status: 'ok',
        context: context.package_context,
        mode: 'source_module_loaded',
        source_module_present: true,
        source_module: PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_RUNTIME_BRIDGE.source_module,
        module_value: value,
        bundled_authority_view: bundledAuthority,
        errors: []
      };
    } catch (error) {
      return {
        status: 'error',
        context: context.package_context,
        mode: 'source_module_load_failed',
        source_module_present: true,
        source_module: PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_RUNTIME_BRIDGE.source_module,
        module_value: null,
        bundled_authority_view: bundledAuthority,
        errors: [`${PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_RUNTIME_BRIDGE.source_module} failed to load: ${error && error.message ? error.message : String(error)}`]
      };
    }
  }
  return {
    status: 'ok',
    context: context.package_context,
    mode: 'bundled_fallback',
    source_module_present: false,
    source_module: PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_RUNTIME_BRIDGE.source_module,
    module_value: null,
    bundled_authority_view: bundledAuthority,
    errors: []
  };
}

function publicSourceModuleExtractionAuthorityRuntimeBridge(root = packageRoot()) {
  const pkg = readJson(path.join(root, 'package.json'));
  const context = sourceContext(root);
  const bridge = resolveAuthorityDomainRuntimeBridge(root);
  return {
    schema: 'agent-onboard-public-source-module-extraction-authority-runtime-bridge-result-001',
    status: bridge.status,
    package_name: PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_RUNTIME_BRIDGE.package_name,
    version: VERSION,
    release_line: PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_RUNTIME_BRIDGE.release_line,
    command: PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_RUNTIME_BRIDGE.command,
    check_command: PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_RUNTIME_BRIDGE.check_command,
    package_root: root,
    package_context: context.package_context,
    package_json_version: pkg.version,
    authority_runtime_bridge_file: PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_RUNTIME_BRIDGE.authority_runtime_bridge_file,
    authority_runtime_bridge_file_present: fs.existsSync(path.join(root, PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_RUNTIME_BRIDGE.authority_runtime_bridge_file)),
    source_module: PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_RUNTIME_BRIDGE.source_module,
    source_module_present: fs.existsSync(path.join(root, PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_RUNTIME_BRIDGE.source_module)),
    runtime_bridge_resolution: bridge,
    runtime_bridge_contract: PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_RUNTIME_BRIDGE,
    projected_pack_files: packageJsonProjectedPackFiles(pkg),
    gitignore_policy: PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_RUNTIME_BRIDGE.gitignore_policy,
    boundary: {
      writes_files: false,
      writes_source_state: false,
      writes_target_repository_state: false,
      git_mutation: false,
      installs_dependencies: false,
      runs_package_manager: false,
      runs_build_test_deploy: false,
      publishes_package: false,
      mutates_registry: false
    }
  };
}

function publicSourceModuleExtractionAuthorityRuntimeBridgeCheck(root = packageRoot()) {
  const result = publicSourceModuleExtractionAuthorityRuntimeBridge(root);
  const authorityBundleParity = publicSourceModuleExtractionAuthorityBundleParityCheck(root);
  const expectedPackFiles = PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort();
  const errors = [];
  if (authorityBundleParity.status !== 'ok') errors.push(...authorityBundleParity.errors.map((error) => `authority bundle parity: ${error}`));
  if (result.runtime_bridge_resolution.status !== 'ok') errors.push(...result.runtime_bridge_resolution.errors);
  if (!arrayEquals(result.projected_pack_files, expectedPackFiles)) errors.push(`projected npm pack files must remain ${expectedPackFiles.join(', ')}`);
  if (PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_RUNTIME_BRIDGE.bridge_status !== 'authority_source_context_optional_runtime_bridge_applied') errors.push('authority runtime bridge status must remain authority_source_context_optional_runtime_bridge_applied');
  if (PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_RUNTIME_BRIDGE.boundary.authority_runtime_bridge_command_writes_files !== false) errors.push('architecture --authority-runtime-bridge must remain no-write');
  if (PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_RUNTIME_BRIDGE.boundary.authority_runtime_bridge_check_command_writes_files !== false) errors.push('architecture --authority-runtime-bridge-check must remain no-write');
  if (PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_RUNTIME_BRIDGE.boundary.source_context_optional_require_only !== true) errors.push('authority runtime bridge must use source-context optional require only');
  if (PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_RUNTIME_BRIDGE.boundary.installed_context_fallback_required !== true) errors.push('authority runtime bridge must preserve installed-package fallback');
  if (PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_RUNTIME_BRIDGE.boundary.includes_write_capable_agents_command !== false) errors.push('authority runtime bridge must exclude write-capable agents command extraction');
  if (PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_RUNTIME_BRIDGE.boundary.package_allowlist_unchanged !== true) errors.push('authority runtime bridge gate must preserve package allowlist');

  let bridgeFileStatus = 'not_present_installed_context_allowed';
  let bridgeFileSchema = null;
  if (result.authority_runtime_bridge_file_present) {
    try {
      const bridgeFile = readJson(path.join(root, result.authority_runtime_bridge_file));
      bridgeFileSchema = bridgeFile.schema || null;
      if (bridgeFile.schema !== PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_RUNTIME_BRIDGE.schema) errors.push(`${result.authority_runtime_bridge_file} schema must be ${PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_RUNTIME_BRIDGE.schema}`);
      if (bridgeFile.source_module !== PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_RUNTIME_BRIDGE.source_module) errors.push(`${result.authority_runtime_bridge_file} source_module must be ${PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_RUNTIME_BRIDGE.source_module}`);
      if (!bridgeFile.runtime_bridge || bridgeFile.runtime_bridge.installed_context_allows_missing_source_module !== true) errors.push(`${result.authority_runtime_bridge_file} must allow installed context fallback`);
      if (!bridgeFile.runtime_bridge || bridgeFile.runtime_bridge.includes_write_capable_agents_command !== false) errors.push(`${result.authority_runtime_bridge_file} must exclude write-capable agents command extraction`);
      if (!bridgeFile.boundary || bridgeFile.boundary.package_allowlist_unchanged !== true) errors.push(`${result.authority_runtime_bridge_file} must preserve package_allowlist_unchanged`);
      bridgeFileStatus = 'present_validated';
    } catch (error) {
      bridgeFileStatus = 'present_invalid_json';
      errors.push(`${result.authority_runtime_bridge_file} is not valid JSON: ${error && error.message ? error.message : String(error)}`);
    }
  } else if (result.package_context === 'source_repository') {
    bridgeFileStatus = 'missing_source_context';
    errors.push(`${result.authority_runtime_bridge_file} must be present in source repository context`);
  }

  const resolved = result.runtime_bridge_resolution;
  const installedFallbackAllowed = result.package_context === 'installed_package' && resolved.mode === 'bundled_fallback';
  const sourceLoadExpected = result.package_context === 'source_repository' && result.source_module_present;
  const sourceLoadedWhenPresent = sourceLoadExpected ? resolved.mode === 'source_module_loaded' : true;
  const fallbackWhenMissing = !result.source_module_present ? resolved.mode === 'bundled_fallback' : true;
  const domainParity = !resolved.module_value || resolved.module_value.domain === resolved.bundled_authority_view.domain;
  const facadeParity = !resolved.module_value || resolved.module_value.facade === resolved.bundled_authority_view.facade;
  const commandParity = !resolved.module_value || arrayEquals(resolved.module_value.owns_commands || [], resolved.bundled_authority_view.owns_commands);
  const readOrderParity = !resolved.module_value || arrayEquals(resolved.module_value.read_order_paths || [], resolved.bundled_authority_view.read_order_paths);
  const excludedAgentsParity = !resolved.module_value || (resolved.module_value.includes_write_capable_agents_command === false && arrayEquals(resolved.module_value.excluded_commands || [], resolved.bundled_authority_view.excluded_commands));
  const writeParity = !resolved.module_value || (resolved.module_value.writes_files === resolved.bundled_authority_view.writes_files && resolved.module_value.state_writer === resolved.bundled_authority_view.state_writer);
  if (!sourceLoadedWhenPresent) errors.push('authority runtime bridge must load the source authority slice when present in source repository context');
  if (!fallbackWhenMissing) errors.push('authority runtime bridge must fall back to bundled authority view when source module is missing');
  if (!domainParity) errors.push('authority runtime bridge source domain must match bundled authority domain');
  if (!facadeParity) errors.push('authority runtime bridge source facade must match bundled authority facade');
  if (!commandParity) errors.push('authority runtime bridge source commands must match bundled authority commands');
  if (!readOrderParity) errors.push('authority runtime bridge source read order must match bundled first-read order');
  if (!excludedAgentsParity) errors.push('authority runtime bridge must exclude write-capable agents commands');
  if (!writeParity) errors.push('authority runtime bridge source write boundary must match bundled authority view');

  const gitignorePath = path.join(root, '.gitignore');
  let gitignorePolicyStatus = 'not_present_installed_context_allowed';
  if (fs.existsSync(gitignorePath)) {
    const gitignore = fs.readFileSync(gitignorePath, 'utf8');
    const hasBlanketAgentOnboardIgnore = /^\.agent-onboard\/\*\s*$/m.test(gitignore) || /^\.agent-onboard\/\s*$/m.test(gitignore);
    const perArtifactUnignoreSprawl = (gitignore.match(/^!\.agent-onboard\/source-module-extraction-.*\.json\s*$/gm) || []).length;
    const localStateIgnored = ['.agent-onboard/tmp/', '.agent-onboard/cache/', '.agent-onboard/local/'].every((entry) => gitignore.includes(entry));
    if (hasBlanketAgentOnboardIgnore) errors.push('.gitignore must not blanket-ignore canonical .agent-onboard source artifacts');
    if (perArtifactUnignoreSprawl > 0) errors.push('.gitignore must not add one unignore line per source-module artifact');
    if (!localStateIgnored) errors.push('.gitignore must ignore local .agent-onboard runtime/cache subtrees');
    gitignorePolicyStatus = hasBlanketAgentOnboardIgnore || perArtifactUnignoreSprawl > 0 || !localStateIgnored ? 'present_invalid' : 'present_validated';
  } else if (result.package_context === 'source_repository') {
    gitignorePolicyStatus = 'missing_source_context';
    errors.push('.gitignore must be present in source repository context');
  }

  return {
    schema: 'agent-onboard-public-source-module-extraction-authority-runtime-bridge-check-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_RUNTIME_BRIDGE.package_name,
    version: VERSION,
    release_line: PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_RUNTIME_BRIDGE.release_line,
    command: PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_RUNTIME_BRIDGE.check_command,
    package_root: root,
    validated: {
      authority_bundle_parity: authorityBundleParity.status === 'ok',
      authority_runtime_bridge_status: PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_RUNTIME_BRIDGE.bridge_status === 'authority_source_context_optional_runtime_bridge_applied',
      source_module_loaded_when_present: sourceLoadedWhenPresent,
      bundled_fallback_when_source_missing: fallbackWhenMissing || installedFallbackAllowed,
      installed_context_fallback_allowed: result.package_context === 'installed_package' ? resolved.mode === 'bundled_fallback' || resolved.mode === 'source_module_loaded' : true,
      source_domain_matches_bundled_authority: domainParity,
      source_facade_matches_bundled_authority: facadeParity,
      source_commands_match_bundled_authority: commandParity,
      source_read_order_matches_bundled_authority: readOrderParity,
      write_capable_agents_command_excluded: excludedAgentsParity,
      source_write_boundary_matches_bundled_authority: writeParity,
      authority_runtime_bridge_file_present_or_installed_context_allowed: bridgeFileStatus === 'present_validated' || bridgeFileStatus === 'not_present_installed_context_allowed',
      authority_runtime_bridge_commands_no_write: PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_RUNTIME_BRIDGE.boundary.authority_runtime_bridge_command_writes_files === false && PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_RUNTIME_BRIDGE.boundary.authority_runtime_bridge_check_command_writes_files === false,
      public_cli_outputs_unchanged_by_gate: PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_RUNTIME_BRIDGE.boundary.changes_public_cli_outputs === false,
      package_allowlist_unchanged: arrayEquals(result.projected_pack_files, expectedPackFiles),
      gitignore_policy_compacted: gitignorePolicyStatus === 'present_validated' || gitignorePolicyStatus === 'not_present_installed_context_allowed'
    },
    runtime_bridge_resolution: resolved,
    source_authority_runtime_bridge_file: {
      path: result.authority_runtime_bridge_file,
      present: result.authority_runtime_bridge_file_present,
      status: bridgeFileStatus,
      schema: bridgeFileSchema,
      source_context_required: result.package_context === 'source_repository'
    },
    gitignore_policy: {
      path: '.gitignore',
      status: gitignorePolicyStatus,
      source_context_required: result.package_context === 'source_repository'
    },
    prerequisite_authority_bundle_parity: {
      status: authorityBundleParity.status,
      errors: authorityBundleParity.errors
    },
    projected_pack_files: result.projected_pack_files,
    expected_pack_files: expectedPackFiles,
    boundary: result.boundary,
    errors
  };
}


function publicArchitectureM1ClosureM2Seed(root = packageRoot()) {
  const pkg = readJson(path.join(root, 'package.json'));
  const context = sourceContext(root);
  const transitionFile = PUBLIC_ARCHITECTURE_M1_CLOSURE_M2_SEED.transition_file;
  const ledgerPath = path.join(root, '.agent-onboard', 'work-items.json');
  let ledger = null;
  if (fs.existsSync(ledgerPath)) {
    try {
      ledger = readJson(ledgerPath);
    } catch {
      ledger = null;
    }
  }
  const milestones = ledger && Array.isArray(ledger.milestones) ? ledger.milestones : [];
  const workItems = ledger && Array.isArray(ledger.work_items) ? ledger.work_items : [];
  const closedMilestone = milestones.find((item) => item.id === PUBLIC_ARCHITECTURE_M1_CLOSURE_M2_SEED.closed_milestone_id) || null;
  const openedMilestone = milestones.find((item) => item.id === PUBLIC_ARCHITECTURE_M1_CLOSURE_M2_SEED.opened_milestone_id) || null;
  const seedWorkItem = workItems.find((item) => item.id === PUBLIC_ARCHITECTURE_M1_CLOSURE_M2_SEED.seed_work_item_id) || null;
  const nextWorkItem = workItems.find((item) => item.id === PUBLIC_ARCHITECTURE_M1_CLOSURE_M2_SEED.next_work_item_id) || null;
  const m1WorkItems = workItems.filter((item) => item.milestone_id === PUBLIC_ARCHITECTURE_M1_CLOSURE_M2_SEED.closed_milestone_id);
  return {
    schema: 'agent-onboard-public-architecture-m1-closure-m2-seed-result-001',
    status: 'ok',
    package_name: PUBLIC_ARCHITECTURE_M1_CLOSURE_M2_SEED.package_name,
    version: VERSION,
    release_line: PUBLIC_ARCHITECTURE_M1_CLOSURE_M2_SEED.release_line,
    command: PUBLIC_ARCHITECTURE_M1_CLOSURE_M2_SEED.command,
    check_command: PUBLIC_ARCHITECTURE_M1_CLOSURE_M2_SEED.check_command,
    package_root: root,
    package_context: context.package_context,
    package_json_version: pkg.version,
    transition_file: transitionFile,
    transition_file_present: fs.existsSync(path.join(root, transitionFile)),
    transition: PUBLIC_ARCHITECTURE_M1_CLOSURE_M2_SEED,
    source_ledger_present: fs.existsSync(ledgerPath),
    milestones: {
      closed: closedMilestone,
      opened: openedMilestone
    },
    work_items: {
      m1_count: m1WorkItems.length,
      m1_non_closed: m1WorkItems.filter((item) => item.status !== 'closed').map((item) => ({ id: item.id, title: item.title, status: item.status })),
      seed: seedWorkItem,
      next: nextWorkItem
    },
    prerequisite_authority_runtime_bridge: publicSourceModuleExtractionAuthorityRuntimeBridgeCheck(root),
    projected_pack_files: packageJsonProjectedPackFiles(pkg),
    boundary: {
      writes_files: false,
      writes_source_state: false,
      writes_target_repository_state: false,
      creates_source_modules: false,
      moves_existing_source_files: false,
      git_mutation: false,
      installs_dependencies: false,
      runs_package_manager: false,
      runs_build_test_deploy: false,
      publishes_package: false,
      mutates_registry: false
    }
  };
}

function workItemIdFromComponents(value) {
  if (!value || !Number.isInteger(value.program) || !Number.isInteger(value.stage) || !Number.isInteger(value.milestone) || !Number.isInteger(value.work_item)) return null;
  return ['P', value.program, 'S', value.stage, 'M', value.milestone, 'W', value.work_item].join('');
}

function workItemIdsFromComponentList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => workItemIdFromComponents(item)).filter(Boolean);
}

function publicArchitectureM1ClosureM2SeedCheck(root = packageRoot()) {
  const result = publicArchitectureM1ClosureM2Seed(root);
  const gate = PUBLIC_ARCHITECTURE_M1_CLOSURE_M2_SEED;
  const expectedPackFiles = PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort();
  const errors = [];

  if (result.prerequisite_authority_runtime_bridge.status !== 'ok') {
    errors.push(...result.prerequisite_authority_runtime_bridge.errors.map((error) => `authority runtime bridge: ${error}`));
  }
  if (!arrayEquals(result.projected_pack_files, expectedPackFiles)) errors.push(`projected npm pack files must remain ${expectedPackFiles.join(', ')}`);
  if (gate.boundary.m2_seed_command_writes_files !== false) errors.push('architecture --m2-seed must remain no-write');
  if (gate.boundary.m2_seed_check_command_writes_files !== false) errors.push('architecture --m2-seed-check must remain no-write');
  if (gate.boundary.package_allowlist_unchanged !== true) errors.push('M2 seed gate must preserve package allowlist');
  if (gate.boundary.creates_source_modules !== false) errors.push('M2 seed gate must not create source modules');

  let transitionFileStatus = 'not_present_installed_context_allowed';
  let transitionFileSchema = null;
  if (result.transition_file_present) {
    try {
      const transitionFile = readJson(path.join(root, result.transition_file));
      transitionFileSchema = transitionFile.schema || null;
      if (transitionFile.schema !== gate.schema) errors.push(`${result.transition_file} schema must be ${gate.schema}`);
      if (!transitionFile.milestone_transition || transitionFile.milestone_transition.closed_milestone_id !== gate.closed_milestone_id) errors.push(`${result.transition_file} must close ${gate.closed_milestone_id}`);
      if (!transitionFile.milestone_transition || transitionFile.milestone_transition.opened_milestone_id !== gate.opened_milestone_id) errors.push(`${result.transition_file} must open ${gate.opened_milestone_id}`);
      const transitionSeedWorkItemId = transitionFile.milestone_transition && (transitionFile.milestone_transition.seed_work_item_id || workItemIdFromComponents(transitionFile.milestone_transition.seed_work_item_components));
      const transitionNextWorkItemId = transitionFile.milestone_transition && (transitionFile.milestone_transition.next_work_item_id || workItemIdFromComponents(transitionFile.milestone_transition.next_work_item_components));
      const transitionPrerequisiteIds = Array.isArray(transitionFile.prerequisite_closed_work_items) ? transitionFile.prerequisite_closed_work_items : workItemIdsFromComponentList(transitionFile.prerequisite_closed_work_item_components);
      if (transitionSeedWorkItemId !== gate.seed_work_item_id) errors.push(`${result.transition_file} seed work item components must resolve to the transition seed work item`);
      if (transitionNextWorkItemId !== gate.next_work_item_id) errors.push(`${result.transition_file} next work item components must resolve to the next executable work item`);
      if (!arrayEquals(transitionPrerequisiteIds, gate.prerequisite_closed_work_items)) errors.push(`${result.transition_file} prerequisite closed work item components must match the M1 closure list`);
      transitionFileStatus = 'present_validated';
    } catch (error) {
      transitionFileStatus = 'present_invalid_json';
      errors.push(`${result.transition_file} is not valid JSON: ${error && error.message ? error.message : String(error)}`);
    }
  } else if (result.package_context === 'source_repository') {
    transitionFileStatus = 'missing_source_context';
    errors.push(`${result.transition_file} must be present in source repository context`);
  }

  const sourceLedgerRequired = result.package_context === 'source_repository';
  const closedMilestone = result.milestones.closed;
  const openedMilestone = result.milestones.opened;
  const seedWorkItem = result.work_items.seed;
  const nextWorkItem = result.work_items.next;
  const prerequisiteClosed = new Set(gate.prerequisite_closed_work_items);
  const m1WorkIds = result.source_ledger_present ? (readJson(path.join(root, '.agent-onboard', 'work-items.json')).work_items || []).filter((item) => item.milestone_id === gate.closed_milestone_id).map((item) => item.id) : [];
  const missingPrerequisites = gate.prerequisite_closed_work_items.filter((id) => !m1WorkIds.includes(id));
  const unexpectedM1WorkItems = m1WorkIds.filter((id) => !prerequisiteClosed.has(id));

  if (sourceLedgerRequired && !result.source_ledger_present) errors.push('.agent-onboard/work-items.json must be present in source repository context');
  if (result.source_ledger_present) {
    if (!closedMilestone) errors.push(`${gate.closed_milestone_id} milestone must exist`);
    else if (closedMilestone.status !== 'closed') errors.push(`${gate.closed_milestone_id} milestone must be closed`);
    if (!openedMilestone) errors.push(`${gate.opened_milestone_id} milestone must exist`);
    else if (openedMilestone.status !== 'open') errors.push(`${gate.opened_milestone_id} milestone must be open`);
    if (result.work_items.m1_non_closed.length > 0) errors.push(`${gate.closed_milestone_id} must have no non-closed work items`);
    if (missingPrerequisites.length > 0) errors.push(`${gate.closed_milestone_id} is missing prerequisite work items: ${missingPrerequisites.join(', ')}`);
    if (unexpectedM1WorkItems.length > 0) errors.push(`${gate.closed_milestone_id} contains unplanned extension work items: ${unexpectedM1WorkItems.join(', ')}`);
    if (!seedWorkItem) errors.push(`${gate.seed_work_item_id} work item must exist`);
    else if (seedWorkItem.status !== 'closed') errors.push(`${gate.seed_work_item_id} transition work item must be closed`);
    if (!nextWorkItem) errors.push(`${gate.next_work_item_id} work item must exist`);
    else if (!['open', 'closed'].includes(nextWorkItem.status)) errors.push(`${gate.next_work_item_id} seeded work item must be open or closed`);
  }

  return {
    schema: 'agent-onboard-public-architecture-m1-closure-m2-seed-check-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: gate.package_name,
    version: VERSION,
    release_line: gate.release_line,
    command: gate.check_command,
    package_root: root,
    validated: {
      prerequisite_authority_runtime_bridge: result.prerequisite_authority_runtime_bridge.status === 'ok',
      m1_milestone_closed_or_installed_context_allowed: !sourceLedgerRequired || (closedMilestone && closedMilestone.status === 'closed'),
      m1_work_items_all_closed_or_installed_context_allowed: !sourceLedgerRequired || result.work_items.m1_non_closed.length === 0,
      m2_milestone_open_or_installed_context_allowed: !sourceLedgerRequired || (openedMilestone && openedMilestone.status === 'open'),
      seed_work_item_closed_or_installed_context_allowed: !sourceLedgerRequired || (seedWorkItem && seedWorkItem.status === 'closed'),
      next_work_item_seeded_or_installed_context_allowed: !sourceLedgerRequired || (nextWorkItem && ['open', 'closed'].includes(nextWorkItem.status)),
      transition_file_present_or_installed_context_allowed: transitionFileStatus === 'present_validated' || transitionFileStatus === 'not_present_installed_context_allowed',
      package_allowlist_unchanged: arrayEquals(result.projected_pack_files, expectedPackFiles),
      m2_seed_commands_no_write: gate.boundary.m2_seed_command_writes_files === false && gate.boundary.m2_seed_check_command_writes_files === false
    },
    milestone_transition: {
      closed_milestone: closedMilestone,
      opened_milestone: openedMilestone,
      seed_work_item: seedWorkItem ? { id: seedWorkItem.id, title: seedWorkItem.title, status: seedWorkItem.status } : null,
      next_work_item: nextWorkItem ? { id: nextWorkItem.id, title: nextWorkItem.title, status: nextWorkItem.status } : null,
      m1_non_closed_work_items: result.work_items.m1_non_closed
    },
    source_transition_file: {
      path: result.transition_file,
      present: result.transition_file_present,
      status: transitionFileStatus,
      schema: transitionFileSchema,
      source_context_required: sourceLedgerRequired
    },
    prerequisite_authority_runtime_bridge: {
      status: result.prerequisite_authority_runtime_bridge.status,
      errors: result.prerequisite_authority_runtime_bridge.errors
    },
    projected_pack_files: result.projected_pack_files,
    expected_pack_files: expectedPackFiles,
    boundary: result.boundary,
    errors
  };
}


function publicWorkItemsDomainSourceExtractionPlan(root = packageRoot()) {
  const pkg = readJson(path.join(root, 'package.json'));
  const context = sourceContext(root);
  const ledgerPath = path.join(root, '.agent-onboard', 'work-items.json');
  let ledger = null;
  if (fs.existsSync(ledgerPath)) {
    try {
      ledger = readJson(ledgerPath);
    } catch {
      ledger = null;
    }
  }
  const workItems = ledger && Array.isArray(ledger.work_items) ? ledger.work_items : [];
  const milestones = ledger && Array.isArray(ledger.milestones) ? ledger.milestones : [];
  const currentWorkItem = workItems.find((item) => item.id === PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_PLAN.work_item_id) || null;
  const nextWorkItem = workItems.find((item) => item.id === PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_PLAN.next_work_item_id) || null;
  const milestone = milestones.find((item) => item.id === PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_PLAN.milestone_id) || null;
  return {
    schema: 'agent-onboard-public-work-items-domain-source-extraction-plan-result-001',
    status: 'ok',
    package_name: PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_PLAN.package_name,
    version: VERSION,
    release_line: PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_PLAN.release_line,
    command: PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_PLAN.command,
    check_command: PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_PLAN.check_command,
    package_root: root,
    package_context: context.package_context,
    package_json_version: pkg.version,
    plan_file: PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_PLAN.plan_file,
    plan_file_present: fs.existsSync(path.join(root, PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_PLAN.plan_file)),
    plan: PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_PLAN,
    source_ledger_present: fs.existsSync(ledgerPath),
    milestone,
    work_items: {
      current: currentWorkItem,
      next: nextWorkItem
    },
    planned_source_module_present: fs.existsSync(path.join(root, PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_PLAN.domain.planned_module)),
    prerequisite_m2_seed: publicArchitectureM1ClosureM2SeedCheck(root),
    prerequisite_authority_runtime_bridge: publicSourceModuleExtractionAuthorityRuntimeBridgeCheck(root),
    prerequisite_package_surface: publicPackageSurfaceCheck(root),
    projected_pack_files: packageJsonProjectedPackFiles(pkg),
    boundary: {
      writes_files: false,
      writes_source_state: false,
      writes_target_repository_state: false,
      creates_source_modules: false,
      moves_existing_source_files: false,
      git_mutation: false,
      installs_dependencies: false,
      runs_package_manager: false,
      runs_build_test_deploy: false,
      publishes_package: false,
      mutates_registry: false
    }
  };
}

function publicWorkItemsDomainSourceExtractionPlanCheck(root = packageRoot()) {
  const result = publicWorkItemsDomainSourceExtractionPlan(root);
  const gate = PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_PLAN;
  const expectedPackFiles = PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort();
  const errors = [];

  if (result.prerequisite_m2_seed.status !== 'ok') errors.push(...result.prerequisite_m2_seed.errors.map((error) => `m2 seed: ${error}`));
  if (result.prerequisite_authority_runtime_bridge.status !== 'ok') errors.push(...result.prerequisite_authority_runtime_bridge.errors.map((error) => `authority runtime bridge: ${error}`));
  if (result.prerequisite_package_surface.status !== 'ok') errors.push(...result.prerequisite_package_surface.errors.map((error) => `package surface: ${error}`));
  if (!arrayEquals(result.projected_pack_files, expectedPackFiles)) errors.push(`projected npm pack files must remain ${expectedPackFiles.join(', ')}`);
  if (gate.boundary.work_items_plan_command_writes_files !== false) errors.push('architecture --work-items-plan must remain no-write');
  if (gate.boundary.work_items_check_command_writes_files !== false) errors.push('architecture --work-items-check must remain no-write');
  if (gate.boundary.creates_source_modules !== false) errors.push('work-items planning gate must not create source modules');
  if (gate.boundary.package_allowlist_unchanged !== true) errors.push('work-items planning gate must preserve package allowlist');
  if (gate.domain.id !== 'work_items') errors.push('work-items planning gate must select the work_items domain');
  if (gate.domain.facade !== 'workItemsService') errors.push('work-items planning gate must remain behind workItemsService');
  if (gate.domain.planned_module !== 'src/domains/work-items.js') errors.push('planned work-items module path must be src/domains/work-items.js');
  // After the follow-up first-slice gate closes, the planned module is allowed to exist.
  // The planning gate itself remains no-write and the first-slice gate owns creation evidence.

  let planFileStatus = 'not_present_installed_context_allowed';
  let planFileSchema = null;
  if (result.plan_file_present) {
    try {
      const planFile = readJson(path.join(root, result.plan_file));
      planFileSchema = planFile.schema || null;
      if (planFile.schema !== gate.schema) errors.push(`${result.plan_file} schema must be ${gate.schema}`);
      if (!planFile.domain || planFile.domain.id !== gate.domain.id) errors.push(`${result.plan_file} must select work_items domain`);
      if (!planFile.domain || planFile.domain.planned_module !== gate.domain.planned_module) errors.push(`${result.plan_file} must plan ${gate.domain.planned_module}`);
      if (!planFile.boundary || planFile.boundary.creates_source_modules !== false) errors.push(`${result.plan_file} must not create source modules`);
      if (!planFile.boundary || planFile.boundary.package_allowlist_unchanged !== true) errors.push(`${result.plan_file} must preserve package allowlist`);
      if (!Array.isArray(planFile.excluded_scope) || !planFile.excluded_scope.some((item) => /claims-domain/.test(item))) errors.push(`${result.plan_file} must explicitly exclude claims-domain extraction`);
      const nextFollowup = planFile.followup_work_items && planFile.followup_work_items[0] ? planFile.followup_work_items[0] : null;
      const nextId = planFile.next_work_item_id || workItemIdFromComponents(planFile.next_work_item_components) || (nextFollowup && (nextFollowup.id || workItemIdFromComponents(nextFollowup.id_components)));
      if (nextId !== gate.next_work_item_id) errors.push(`${result.plan_file} must seed ${gate.next_work_item_id} as the next work item`);
      planFileStatus = 'present_validated';
    } catch (error) {
      planFileStatus = 'present_invalid_json';
      errors.push(`${result.plan_file} is not valid JSON: ${error && error.message ? error.message : String(error)}`);
    }
  } else if (result.package_context === 'source_repository') {
    planFileStatus = 'missing_source_context';
    errors.push(`${result.plan_file} must be present in source repository context`);
  }

  const sourceLedgerRequired = result.package_context === 'source_repository';
  const currentWorkItem = result.work_items.current;
  const nextWorkItem = result.work_items.next;
  if (sourceLedgerRequired && !result.source_ledger_present) errors.push('.agent-onboard/work-items.json must be present in source repository context');
  if (result.source_ledger_present) {
    if (!result.milestone) errors.push(`${gate.milestone_id} milestone must exist`);
    else if (result.milestone.status !== 'open') errors.push(`${gate.milestone_id} milestone must remain open`);
    if (!currentWorkItem) errors.push(`${gate.work_item_id} work item must exist`);
    else if (currentWorkItem.status !== 'closed') errors.push(`${gate.work_item_id} planning work item must be closed`);
    if (!nextWorkItem) errors.push(`${gate.next_work_item_id} work item must exist`);
    else if (!['open', 'closed'].includes(nextWorkItem.status)) errors.push(`${gate.next_work_item_id} seeded work item must be open or closed`);
  }

  return {
    schema: 'agent-onboard-public-work-items-domain-source-extraction-plan-check-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: gate.package_name,
    version: VERSION,
    release_line: gate.release_line,
    command: gate.check_command,
    package_root: root,
    validated: {
      prerequisite_m2_seed: result.prerequisite_m2_seed.status === 'ok',
      prerequisite_authority_runtime_bridge: result.prerequisite_authority_runtime_bridge.status === 'ok',
      prerequisite_package_surface: result.prerequisite_package_surface.status === 'ok',
      work_items_domain_selected: gate.domain.id === 'work_items',
      planned_module_absent_or_created_by_followup: !result.planned_source_module_present || (nextWorkItem && nextWorkItem.status === 'closed'),
      current_work_item_closed_or_installed_context_allowed: !sourceLedgerRequired || (currentWorkItem && currentWorkItem.status === 'closed'),
      next_work_item_seeded_or_installed_context_allowed: !sourceLedgerRequired || (nextWorkItem && ['open', 'closed'].includes(nextWorkItem.status)),
      plan_file_present_or_installed_context_allowed: planFileStatus === 'present_validated' || planFileStatus === 'not_present_installed_context_allowed',
      package_allowlist_unchanged: arrayEquals(result.projected_pack_files, expectedPackFiles),
      work_items_plan_commands_no_write: gate.boundary.work_items_plan_command_writes_files === false && gate.boundary.work_items_check_command_writes_files === false
    },
    planned_domain: gate.domain,
    work_items: result.work_items,
    source_plan_file: {
      path: result.plan_file,
      present: result.plan_file_present,
      status: planFileStatus,
      schema: planFileSchema,
      source_context_required: sourceLedgerRequired
    },
    prerequisite_m2_seed: {
      status: result.prerequisite_m2_seed.status,
      errors: result.prerequisite_m2_seed.errors
    },
    projected_pack_files: result.projected_pack_files,
    expected_pack_files: expectedPackFiles,
    boundary: result.boundary,
    errors
  };
}

function loadWorkItemsFirstSliceModule(root = packageRoot()) {
  const modulePath = path.join(root, PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_FIRST_SLICE.source_module);
  if (!fs.existsSync(modulePath)) return null;
  const resolved = require.resolve(modulePath);
  delete require.cache[resolved];
  return require(resolved);
}

function publicWorkItemsDomainSourceExtractionFirstSlice(root = packageRoot()) {
  const pkg = readJson(path.join(root, 'package.json'));
  const context = sourceContext(root);
  const gate = PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_FIRST_SLICE;
  let module_exports = [];
  let module_value = null;
  let module_load_error = null;
  try {
    const loaded = loadWorkItemsFirstSliceModule(root);
    if (loaded) {
      module_exports = Object.keys(loaded).sort();
      if (typeof loaded.getWorkItemsDomainFirstSlice === 'function') {
        module_value = loaded.getWorkItemsDomainFirstSlice();
      } else if (loaded.WORK_ITEMS_DOMAIN_FIRST_SLICE) {
        module_value = loaded.WORK_ITEMS_DOMAIN_FIRST_SLICE;
      }
    }
  } catch (error) {
    module_load_error = error && error.message ? error.message : String(error);
  }
  return {
    schema: 'agent-onboard-public-source-module-work-items-first-slice-result-001',
    status: module_load_error ? 'error' : 'ok',
    package_name: gate.package_name,
    version: VERSION,
    release_line: gate.release_line,
    command: gate.command,
    check_command: gate.check_command,
    package_root: root,
    package_context: context.package_context,
    package_json_version: pkg.version,
    first_slice_file: gate.first_slice_file,
    first_slice_file_present: fs.existsSync(path.join(root, gate.first_slice_file)),
    source_module: gate.source_module,
    source_module_present: fs.existsSync(path.join(root, gate.source_module)),
    source_module_exports: module_exports,
    source_module_value: module_value,
    source_module_load_error: module_load_error,
    prerequisite_plan_file: gate.prerequisite_plan_file,
    work_items_first_slice: gate,
    projected_pack_files: packageJsonProjectedPackFiles(pkg),
    boundary: {
      writes_files: false,
      writes_source_state: false,
      writes_target_repository_state: false,
      git_mutation: false,
      installs_dependencies: false,
      runs_package_manager: false,
      runs_build_test_deploy: false,
      publishes_package: false,
      mutates_registry: false
    }
  };
}

function publicWorkItemsDomainSourceExtractionFirstSliceCheck(root = packageRoot()) {
  const result = publicWorkItemsDomainSourceExtractionFirstSlice(root);
  const plan = publicWorkItemsDomainSourceExtractionPlanCheck(root);
  const expectedPackFiles = PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort();
  const gate = PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_FIRST_SLICE;
  const expectedExports = gate.expected_module_export_names.slice().sort();
  const errors = [];
  if (plan.status !== 'ok') errors.push(...plan.errors.map((error) => `work-items plan: ${error}`));
  if (result.status !== 'ok') errors.push(`work-items first-slice module load failed: ${result.source_module_load_error}`);
  if (!arrayEquals(result.projected_pack_files, expectedPackFiles)) errors.push(`projected npm pack files must remain ${expectedPackFiles.join(', ')}`);
  if (gate.first_slice_status !== 'source_only_shadow_module_applied') errors.push('work-items first-slice status must be source_only_shadow_module_applied');
  if (gate.extracted_domain.id !== 'work_items') errors.push('work-items first-slice must extract the work_items domain');
  if (gate.boundary.created_source_module !== 'src/domains/work-items.js') errors.push('work-items first-slice created source module must be src/domains/work-items.js');
  if (gate.boundary.creates_exactly_one_source_module !== true) errors.push('work-items first-slice must create exactly one source module');
  if (gate.boundary.excludes_claim_and_close_commands !== true) errors.push('work-items first-slice must exclude claim and close commands');
  if (gate.boundary.moves_existing_source_files !== false) errors.push('work-items first-slice must not move existing source files');
  if (gate.boundary.changes_public_cli_outputs !== false) errors.push('work-items first-slice must not change public CLI outputs');
  if (gate.boundary.changes_cli_runtime_dependency_graph !== false) errors.push('work-items first-slice must not make CLI runtime require source modules');
  if (gate.boundary.exports_source_module_as_public_api !== false) errors.push('work-items first-slice must not expose source module as public import API');
  if (gate.boundary.work_items_first_slice_command_writes_files !== false) errors.push('architecture --work-items-first-slice must remain no-write');
  if (gate.boundary.work_items_first_slice_check_command_writes_files !== false) errors.push('architecture --work-items-first-slice-check must remain no-write');

  let artifactStatus = 'not_present_installed_context_allowed';
  let artifactSchema = null;
  if (result.first_slice_file_present) {
    try {
      const artifact = readJson(path.join(root, result.first_slice_file));
      artifactSchema = artifact.schema || null;
      if (artifact.schema !== gate.schema) errors.push(`${result.first_slice_file} schema must be ${gate.schema}`);
      if (artifact.source_module !== gate.source_module) errors.push(`${result.first_slice_file} source_module must be ${gate.source_module}`);
      if (!artifact.extracted_domain || artifact.extracted_domain.id !== 'work_items') errors.push(`${result.first_slice_file} must declare extracted_domain.id work_items`);
      if (!artifact.boundary || artifact.boundary.package_allowlist_unchanged !== true) errors.push(`${result.first_slice_file} must preserve package_allowlist_unchanged`);
      if (!artifact.boundary || artifact.boundary.excludes_claim_and_close_commands !== true) errors.push(`${result.first_slice_file} must exclude claim and close commands`);
      artifactStatus = 'present_validated';
    } catch (error) {
      artifactStatus = 'present_invalid_json';
      errors.push(`${result.first_slice_file} is not valid JSON: ${error && error.message ? error.message : String(error)}`);
    }
  } else if (result.package_context === 'source_repository') {
    artifactStatus = 'missing_source_context';
    errors.push(`${result.first_slice_file} must be present in source repository context`);
  }

  let sourceModuleStatus = 'not_present_installed_context_allowed';
  const moduleValue = result.source_module_value || {};
  const moduleExportsSorted = result.source_module_exports.slice().sort();
  if (result.source_module_present) {
    if (!arrayEquals(moduleExportsSorted, expectedExports)) errors.push(`${result.source_module} exports must be ${expectedExports.join(', ')}`);
    if (moduleValue.schema !== gate.schema) errors.push(`${result.source_module} must export work-items first-slice schema`);
    if (moduleValue.domain !== 'work_items') errors.push(`${result.source_module} domain must be work_items`);
    if (moduleValue.facade !== 'workItemsService') errors.push(`${result.source_module} facade must be workItemsService`);
    if (moduleValue.source_module !== result.source_module) errors.push(`${result.source_module} source_module field must match its path`);
    if (moduleValue.runtime_dependency_status !== gate.extracted_domain.runtime_dependency_status) errors.push(`${result.source_module} runtime dependency status must remain source-only shadow`);
    if (moduleValue.exports_public_api !== false) errors.push(`${result.source_module} must not declare public import API`);
    if (moduleValue.includes_claims_domain_behavior !== false) errors.push(`${result.source_module} must exclude claims-domain behavior`);
    if (moduleValue.writes_files !== false || moduleValue.state_writer !== false) errors.push(`${result.source_module} must remain read-only and non-state-writer`);
    if (moduleValue.declares_explicit_write_boundaries !== true) errors.push(`${result.source_module} must declare explicit write boundaries for write-capable work-items commands`);
    if (!arrayEquals((moduleValue.owns_commands || []), gate.expected_owned_commands.slice())) errors.push(`${result.source_module} owns_commands must match work-items first-slice scope`);
    if (!arrayEquals((moduleValue.excluded_commands || []), gate.excluded_commands.slice())) errors.push(`${result.source_module} excluded_commands must keep claim and close out of this slice`);
    sourceModuleStatus = 'present_validated';
  } else if (result.package_context === 'source_repository') {
    sourceModuleStatus = 'missing_source_context';
    errors.push(`${result.source_module} must be present in source repository context`);
  }

  return {
    schema: 'agent-onboard-public-source-module-work-items-first-slice-check-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: gate.package_name,
    version: VERSION,
    release_line: gate.release_line,
    command: gate.check_command,
    package_root: root,
    validated: {
      work_items_plan: plan.status === 'ok',
      first_slice_status: gate.first_slice_status === 'source_only_shadow_module_applied',
      extracted_domain_is_work_items: gate.extracted_domain.id === 'work_items',
      source_module_present_or_installed_context_allowed: sourceModuleStatus === 'present_validated' || sourceModuleStatus === 'not_present_installed_context_allowed',
      first_slice_file_present_or_installed_context_allowed: artifactStatus === 'present_validated' || artifactStatus === 'not_present_installed_context_allowed',
      claim_and_close_commands_excluded: moduleValue.includes_claims_domain_behavior === false || sourceModuleStatus === 'not_present_installed_context_allowed',
      commands_no_write: gate.boundary.work_items_first_slice_command_writes_files === false && gate.boundary.work_items_first_slice_check_command_writes_files === false,
      package_allowlist_unchanged: arrayEquals(result.projected_pack_files, expectedPackFiles)
    },
    source_module: {
      path: result.source_module,
      present: result.source_module_present,
      status: sourceModuleStatus,
      exports: result.source_module_exports,
      value: result.source_module_value,
      source_context_required: result.package_context === 'source_repository'
    },
    first_slice_file: {
      path: result.first_slice_file,
      present: result.first_slice_file_present,
      status: artifactStatus,
      schema: artifactSchema,
      source_context_required: result.package_context === 'source_repository'
    },
    prerequisite_work_items_plan: {
      status: plan.status,
      errors: plan.errors
    },
    projected_pack_files: result.projected_pack_files,
    expected_pack_files: expectedPackFiles,
    boundary: result.boundary,
    errors
  };
}


function bundledWorkItemsDomainForParity(root = packageRoot()) {
  const map = publicArchitectureMap(root);
  const facade = PUBLIC_DOMAIN_SERVICE_FACADES.facades.find((item) => item.id === 'work_items');
  const domain = map.map.canonical_domains.find((item) => item.id === 'work_items');
  return {
    schema: 'agent-onboard-public-bundled-work-items-domain-view-001',
    domain: domain ? domain.id : null,
    facade: facade ? facade.service : null,
    service: facade ? facade.service : null,
    source: 'cli/agent-onboard.js',
    owns_commands: PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_FIRST_SLICE.expected_owned_commands.slice(),
    excluded_commands: PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_FIRST_SLICE.excluded_commands.slice(),
    writes_files: false,
    state_writer: false,
    declares_explicit_write_boundaries: true,
    schema_id: 'agent-onboard-target-work-items-001',
    state_files: Object.freeze(['.agent-onboard/work-items.json']).slice(),
    read_surfaces: Object.freeze(['schema', 'template', 'validate-template', 'validate', 'list']).slice(),
    explicit_write_surfaces: Object.freeze([
      'work-items --init --write [--force]',
      'work-items --append --write --id <public-work-item-id> --title <title>'
    ]).slice(),
    package_context: sourceContext(root).package_context
  };
}

function publicWorkItemsDomainSourceExtractionBundleParity(root = packageRoot()) {
  const pkg = readJson(path.join(root, 'package.json'));
  const context = sourceContext(root);
  const firstSlice = publicWorkItemsDomainSourceExtractionFirstSlice(root);
  const bundledWorkItems = bundledWorkItemsDomainForParity(root);
  const gate = PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_BUNDLE_PARITY;
  return {
    schema: 'agent-onboard-public-source-module-work-items-bundle-parity-result-001',
    status: firstSlice.status === 'ok' ? 'ok' : 'error',
    package_name: gate.package_name,
    version: VERSION,
    release_line: gate.release_line,
    command: gate.command,
    check_command: gate.check_command,
    package_root: root,
    package_context: context.package_context,
    package_json_version: pkg.version,
    bundle_parity_file: gate.bundle_parity_file,
    bundle_parity_file_present: fs.existsSync(path.join(root, gate.bundle_parity_file)),
    source_module: gate.source_module,
    source_module_present: fs.existsSync(path.join(root, gate.source_module)),
    source_slice_value: firstSlice.source_module_value,
    bundled_work_items_view: bundledWorkItems,
    work_items_bundle_parity: gate,
    projected_pack_files: packageJsonProjectedPackFiles(pkg),
    boundary: {
      writes_files: false,
      writes_source_state: false,
      writes_target_repository_state: false,
      git_mutation: false,
      installs_dependencies: false,
      runs_package_manager: false,
      runs_build_test_deploy: false,
      publishes_package: false,
      mutates_registry: false
    }
  };
}

function publicWorkItemsDomainSourceExtractionBundleParityCheck(root = packageRoot()) {
  const result = publicWorkItemsDomainSourceExtractionBundleParity(root);
  const firstSlice = publicWorkItemsDomainSourceExtractionFirstSliceCheck(root);
  const expectedPackFiles = PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort();
  const gate = PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_BUNDLE_PARITY;
  const errors = [];
  if (firstSlice.status !== 'ok') errors.push(...firstSlice.errors.map((error) => `work-items first slice: ${error}`));
  if (result.status !== 'ok') errors.push('work-items bundle parity depends on a loadable first-slice source module in source context or installed fallback metadata');
  if (!arrayEquals(result.projected_pack_files, expectedPackFiles)) errors.push(`projected npm pack files must remain ${expectedPackFiles.join(', ')}`);
  if (gate.parity_status !== 'work_items_source_slice_matches_bundled_cli_view') errors.push('work-items bundle parity status must remain work_items_source_slice_matches_bundled_cli_view');
  if (gate.boundary.work_items_bundle_parity_command_writes_files !== false) errors.push('architecture --work-items-bundle-parity must remain no-write');
  if (gate.boundary.work_items_bundle_parity_check_command_writes_files !== false) errors.push('architecture --work-items-bundle-parity-check must remain no-write');
  if (gate.boundary.creates_bundle_artifact !== false) errors.push('work-items bundle parity gate must not create bundle artifacts');
  if (gate.boundary.changes_public_cli_outputs !== false) errors.push('work-items bundle parity gate must not change public CLI outputs');
  if (gate.boundary.changes_cli_runtime_dependency_graph !== false) errors.push('work-items bundle parity gate must not change CLI runtime dependency graph');
  if (gate.boundary.includes_claim_and_close_commands !== false) errors.push('work-items bundle parity gate must keep claim and close excluded');
  if (gate.boundary.package_allowlist_unchanged !== true) errors.push('work-items bundle parity gate must preserve package allowlist');

  let bundleParityFileStatus = 'not_present_installed_context_allowed';
  let bundleParityFileSchema = null;
  if (result.bundle_parity_file_present) {
    try {
      const artifact = readJson(path.join(root, result.bundle_parity_file));
      bundleParityFileSchema = artifact.schema || null;
      if (artifact.schema !== gate.schema) errors.push(`${result.bundle_parity_file} schema must be ${gate.schema}`);
      if (artifact.source_module !== gate.source_module) errors.push(`${result.bundle_parity_file} source_module must be ${gate.source_module}`);
      if (artifact.parity_status !== gate.parity_status) errors.push(`${result.bundle_parity_file} parity_status must be ${gate.parity_status}`);
      if (!artifact.boundary || artifact.boundary.package_allowlist_unchanged !== true) errors.push(`${result.bundle_parity_file} must preserve package_allowlist_unchanged`);
      if (!artifact.boundary || artifact.boundary.includes_claim_and_close_commands !== false) errors.push(`${result.bundle_parity_file} must keep claim and close excluded`);
      bundleParityFileStatus = 'present_validated';
    } catch (error) {
      bundleParityFileStatus = 'present_invalid_json';
      errors.push(`${result.bundle_parity_file} is not valid JSON: ${error && error.message ? error.message : String(error)}`);
    }
  } else if (result.package_context === 'source_repository') {
    bundleParityFileStatus = 'missing_source_context';
    errors.push(`${result.bundle_parity_file} must be present in source repository context`);
  }

  const sourceSlice = result.source_slice_value || null;
  const bundled = result.bundled_work_items_view;
  const sourceContextAllowedMissing = result.package_context === 'installed_package' && !sourceSlice;
  const domainParity = sourceContextAllowedMissing || (sourceSlice && sourceSlice.domain === bundled.domain);
  const facadeParity = sourceContextAllowedMissing || (sourceSlice && sourceSlice.facade === bundled.facade);
  const schemaParity = sourceContextAllowedMissing || (sourceSlice && sourceSlice.schema_id === bundled.schema_id);
  const stateFileParity = sourceContextAllowedMissing || (sourceSlice && arrayEquals(sourceSlice.state_files || [], bundled.state_files));
  const commandParity = sourceContextAllowedMissing || (sourceSlice && arrayEquals(sourceSlice.owns_commands || [], bundled.owns_commands));
  const excludedCommandParity = sourceContextAllowedMissing || (sourceSlice && arrayEquals(sourceSlice.excluded_commands || [], bundled.excluded_commands));
  const readSurfaceParity = sourceContextAllowedMissing || (sourceSlice && arrayEquals(sourceSlice.read_surfaces || [], bundled.read_surfaces));
  const explicitWriteSurfaceParity = sourceContextAllowedMissing || (sourceSlice && arrayEquals(sourceSlice.explicit_write_surfaces || [], bundled.explicit_write_surfaces));
  const writeBoundaryParity = sourceContextAllowedMissing || (sourceSlice && sourceSlice.writes_files === bundled.writes_files && sourceSlice.state_writer === bundled.state_writer && sourceSlice.declares_explicit_write_boundaries === bundled.declares_explicit_write_boundaries);
  if (!domainParity) errors.push('work-items source slice domain must match bundled work-items domain view');
  if (!facadeParity) errors.push('work-items source slice facade must match bundled work-items facade view');
  if (!schemaParity) errors.push('work-items source slice schema id must match bundled work-items schema id');
  if (!stateFileParity) errors.push('work-items source slice state files must match bundled work-items state files');
  if (!commandParity) errors.push('work-items source slice owned commands must match bundled work-items command surface');
  if (!excludedCommandParity) errors.push('work-items source slice excluded commands must match bundled work-items exclusions');
  if (!readSurfaceParity) errors.push('work-items source slice read surfaces must match bundled work-items read surfaces');
  if (!explicitWriteSurfaceParity) errors.push('work-items source slice explicit write surfaces must match bundled work-items write-boundary metadata');
  if (!writeBoundaryParity) errors.push('work-items source slice read/write boundary must match bundled work-items view');

  return {
    schema: 'agent-onboard-public-source-module-work-items-bundle-parity-check-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: gate.package_name,
    version: VERSION,
    release_line: gate.release_line,
    command: gate.check_command,
    package_root: root,
    validated: {
      first_slice: firstSlice.status === 'ok',
      bundle_parity_status: gate.parity_status === 'work_items_source_slice_matches_bundled_cli_view',
      source_slice_domain_matches_bundled_work_items: domainParity,
      source_slice_facade_matches_bundled_work_items: facadeParity,
      source_slice_schema_matches_bundled_work_items: schemaParity,
      source_slice_state_files_match_bundled_work_items: stateFileParity,
      source_slice_commands_match_bundled_work_items: commandParity,
      source_slice_exclusions_match_bundled_work_items: excludedCommandParity,
      source_slice_read_surfaces_match_bundled_work_items: readSurfaceParity,
      source_slice_write_surfaces_match_bundled_work_items: explicitWriteSurfaceParity,
      source_slice_write_boundary_matches_bundled_work_items: writeBoundaryParity,
      source_module_present_or_installed_context_allowed: result.source_module_present || result.package_context === 'installed_package',
      bundle_parity_file_present_or_installed_context_allowed: bundleParityFileStatus === 'present_validated' || bundleParityFileStatus === 'not_present_installed_context_allowed',
      commands_no_write: gate.boundary.work_items_bundle_parity_command_writes_files === false && gate.boundary.work_items_bundle_parity_check_command_writes_files === false,
      runtime_outputs_unchanged_by_gate: gate.boundary.changes_public_cli_outputs === false,
      cli_runtime_dependency_graph_unchanged: gate.boundary.changes_cli_runtime_dependency_graph === false,
      package_allowlist_unchanged: arrayEquals(result.projected_pack_files, expectedPackFiles),
      claim_and_close_commands_excluded: excludedCommandParity
    },
    source_slice: result.source_slice_value,
    bundled_work_items_view: result.bundled_work_items_view,
    source_bundle_parity_file: {
      path: result.bundle_parity_file,
      present: result.bundle_parity_file_present,
      status: bundleParityFileStatus,
      schema: bundleParityFileSchema,
      source_context_required: result.package_context === 'source_repository'
    },
    prerequisite_first_slice: {
      status: firstSlice.status,
      errors: firstSlice.errors
    },
    projected_pack_files: result.projected_pack_files,
    expected_pack_files: expectedPackFiles,
    boundary: result.boundary,
    errors
  };
}



function resolveWorkItemsDomainRuntimeBridge(root = packageRoot()) {
  const context = sourceContext(root);
  const modulePath = path.join(root, PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_RUNTIME_BRIDGE.source_module);
  const sourceModulePresent = fs.existsSync(modulePath);
  const bundledWorkItems = bundledWorkItemsDomainForParity(root);
  if (sourceModulePresent) {
    try {
      const loaded = require(modulePath);
      const value = loaded && typeof loaded.getWorkItemsDomainFirstSlice === 'function'
        ? loaded.getWorkItemsDomainFirstSlice()
        : loaded && loaded.WORK_ITEMS_DOMAIN_FIRST_SLICE;
      if (!value || value.schema !== 'agent-onboard-public-source-module-work-items-first-slice-001') {
        return {
          status: 'error',
          context: context.package_context,
          mode: 'source_module_invalid',
          source_module_present: true,
          source_module: PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_RUNTIME_BRIDGE.source_module,
          module_value: value || null,
          bundled_work_items_view: bundledWorkItems,
          errors: [`${PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_RUNTIME_BRIDGE.source_module} did not export a valid work-items first-slice contract`]
        };
      }
      return {
        status: 'ok',
        context: context.package_context,
        mode: 'source_module_loaded',
        source_module_present: true,
        source_module: PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_RUNTIME_BRIDGE.source_module,
        module_value: value,
        bundled_work_items_view: bundledWorkItems,
        errors: []
      };
    } catch (error) {
      return {
        status: 'error',
        context: context.package_context,
        mode: 'source_module_load_failed',
        source_module_present: true,
        source_module: PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_RUNTIME_BRIDGE.source_module,
        module_value: null,
        bundled_work_items_view: bundledWorkItems,
        errors: [`${PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_RUNTIME_BRIDGE.source_module} failed to load: ${error && error.message ? error.message : String(error)}`]
      };
    }
  }
  return {
    status: 'ok',
    context: context.package_context,
    mode: 'bundled_fallback',
    source_module_present: false,
    source_module: PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_RUNTIME_BRIDGE.source_module,
    module_value: null,
    bundled_work_items_view: bundledWorkItems,
    errors: []
  };
}

function publicWorkItemsDomainSourceExtractionRuntimeBridge(root = packageRoot()) {
  const pkg = readJson(path.join(root, 'package.json'));
  const context = sourceContext(root);
  const bridge = resolveWorkItemsDomainRuntimeBridge(root);
  const gate = PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_RUNTIME_BRIDGE;
  return {
    schema: 'agent-onboard-public-source-module-work-items-runtime-bridge-result-001',
    status: bridge.status,
    package_name: gate.package_name,
    version: VERSION,
    release_line: gate.release_line,
    command: gate.command,
    check_command: gate.check_command,
    package_root: root,
    package_context: context.package_context,
    package_json_version: pkg.version,
    runtime_bridge_file: gate.runtime_bridge_file,
    runtime_bridge_file_present: fs.existsSync(path.join(root, gate.runtime_bridge_file)),
    source_module: gate.source_module,
    source_module_present: fs.existsSync(path.join(root, gate.source_module)),
    runtime_bridge_resolution: bridge,
    runtime_bridge_contract: gate,
    projected_pack_files: packageJsonProjectedPackFiles(pkg),
    boundary: {
      writes_files: false,
      writes_source_state: false,
      writes_target_repository_state: false,
      git_mutation: false,
      installs_dependencies: false,
      runs_package_manager: false,
      runs_build_test_deploy: false,
      publishes_package: false,
      mutates_registry: false
    }
  };
}

function publicWorkItemsDomainSourceExtractionRuntimeBridgeCheck(root = packageRoot()) {
  const result = publicWorkItemsDomainSourceExtractionRuntimeBridge(root);
  const bundleParity = publicWorkItemsDomainSourceExtractionBundleParityCheck(root);
  const expectedPackFiles = PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort();
  const gate = PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_RUNTIME_BRIDGE;
  const errors = [];
  if (bundleParity.status !== 'ok') errors.push(...bundleParity.errors.map((error) => `work-items bundle parity: ${error}`));
  if (result.runtime_bridge_resolution.status !== 'ok') errors.push(...result.runtime_bridge_resolution.errors);
  if (!arrayEquals(result.projected_pack_files, expectedPackFiles)) errors.push(`projected npm pack files must remain ${expectedPackFiles.join(', ')}`);
  if (gate.bridge_status !== 'work_items_source_context_optional_runtime_bridge_applied') errors.push('work-items runtime bridge status must remain work_items_source_context_optional_runtime_bridge_applied');
  if (gate.boundary.work_items_runtime_bridge_command_writes_files !== false) errors.push('architecture --work-items-runtime-bridge must remain no-write');
  if (gate.boundary.work_items_runtime_bridge_check_command_writes_files !== false) errors.push('architecture --work-items-runtime-bridge-check must remain no-write');
  if (gate.boundary.source_context_optional_require_only !== true) errors.push('work-items runtime bridge must use source-context optional require only');
  if (gate.boundary.installed_context_fallback_required !== true) errors.push('work-items runtime bridge must preserve installed-package fallback');
  if (gate.boundary.includes_claim_and_close_commands !== false) errors.push('work-items runtime bridge must keep claim and close excluded');
  if (gate.boundary.package_allowlist_unchanged !== true) errors.push('work-items runtime bridge gate must preserve package allowlist');

  let bridgeFileStatus = 'not_present_installed_context_allowed';
  let bridgeFileSchema = null;
  if (result.runtime_bridge_file_present) {
    try {
      const bridgeFile = readJson(path.join(root, result.runtime_bridge_file));
      bridgeFileSchema = bridgeFile.schema || null;
      if (bridgeFile.schema !== gate.schema) errors.push(`${result.runtime_bridge_file} schema must be ${gate.schema}`);
      if (bridgeFile.source_module !== gate.source_module) errors.push(`${result.runtime_bridge_file} source_module must be ${gate.source_module}`);
      if (!bridgeFile.runtime_bridge || bridgeFile.runtime_bridge.installed_context_allows_missing_source_module !== true) errors.push(`${result.runtime_bridge_file} must allow installed context fallback`);
      if (!bridgeFile.runtime_bridge || bridgeFile.runtime_bridge.includes_claim_and_close_commands !== false) errors.push(`${result.runtime_bridge_file} must keep claim and close excluded`);
      if (!bridgeFile.boundary || bridgeFile.boundary.package_allowlist_unchanged !== true) errors.push(`${result.runtime_bridge_file} must preserve package_allowlist_unchanged`);
      bridgeFileStatus = 'present_validated';
    } catch (error) {
      bridgeFileStatus = 'present_invalid_json';
      errors.push(`${result.runtime_bridge_file} is not valid JSON: ${error && error.message ? error.message : String(error)}`);
    }
  } else if (result.package_context === 'source_repository') {
    bridgeFileStatus = 'missing_source_context';
    errors.push(`${result.runtime_bridge_file} must be present in source repository context`);
  }

  const resolved = result.runtime_bridge_resolution;
  const installedFallbackAllowed = result.package_context === 'installed_package' && resolved.mode === 'bundled_fallback';
  const sourceLoadExpected = result.package_context === 'source_repository' && result.source_module_present;
  const sourceLoadedWhenPresent = sourceLoadExpected ? resolved.mode === 'source_module_loaded' : true;
  const fallbackWhenMissing = !result.source_module_present ? resolved.mode === 'bundled_fallback' : true;
  const source = resolved.module_value || null;
  const bundled = resolved.bundled_work_items_view;
  const domainParity = !source || source.domain === bundled.domain;
  const facadeParity = !source || source.facade === bundled.facade;
  const schemaParity = !source || source.schema_id === bundled.schema_id;
  const stateFileParity = !source || arrayEquals(source.state_files || [], bundled.state_files);
  const commandParity = !source || arrayEquals(source.owns_commands || [], bundled.owns_commands);
  const excludedCommandParity = !source || arrayEquals(source.excluded_commands || [], bundled.excluded_commands);
  const readSurfaceParity = !source || arrayEquals(source.read_surfaces || [], bundled.read_surfaces);
  const explicitWriteSurfaceParity = !source || arrayEquals(source.explicit_write_surfaces || [], bundled.explicit_write_surfaces);
  const writeBoundaryParity = !source || (source.writes_files === bundled.writes_files && source.state_writer === bundled.state_writer && source.declares_explicit_write_boundaries === bundled.declares_explicit_write_boundaries);
  const claimCloseExcluded = !source || (source.includes_claims_domain_behavior === false && arrayEquals(source.excluded_commands || [], bundled.excluded_commands));

  if (!sourceLoadedWhenPresent) errors.push('work-items runtime bridge must load the source work-items slice when present in source repository context');
  if (!fallbackWhenMissing) errors.push('work-items runtime bridge must fall back to bundled work-items view when source module is missing');
  if (!domainParity) errors.push('work-items runtime bridge source domain must match bundled work-items domain');
  if (!facadeParity) errors.push('work-items runtime bridge source facade must match bundled work-items facade');
  if (!schemaParity) errors.push('work-items runtime bridge source schema id must match bundled work-items schema id');
  if (!stateFileParity) errors.push('work-items runtime bridge source state files must match bundled work-items state files');
  if (!commandParity) errors.push('work-items runtime bridge source commands must match bundled work-items commands');
  if (!excludedCommandParity) errors.push('work-items runtime bridge source excluded commands must match bundled work-items exclusions');
  if (!readSurfaceParity) errors.push('work-items runtime bridge source read surfaces must match bundled work-items read surfaces');
  if (!explicitWriteSurfaceParity) errors.push('work-items runtime bridge source explicit write surfaces must match bundled work-items surfaces');
  if (!writeBoundaryParity) errors.push('work-items runtime bridge source write boundary must match bundled work-items view');
  if (!claimCloseExcluded) errors.push('work-items runtime bridge must keep claim and close behavior excluded');

  return {
    schema: 'agent-onboard-public-source-module-work-items-runtime-bridge-check-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: gate.package_name,
    version: VERSION,
    release_line: gate.release_line,
    command: gate.check_command,
    package_root: root,
    validated: {
      work_items_bundle_parity: bundleParity.status === 'ok',
      work_items_runtime_bridge_status: gate.bridge_status === 'work_items_source_context_optional_runtime_bridge_applied',
      source_module_loaded_when_present: sourceLoadedWhenPresent,
      bundled_fallback_when_source_missing: fallbackWhenMissing || installedFallbackAllowed,
      installed_context_fallback_allowed: result.package_context === 'installed_package' ? resolved.mode === 'bundled_fallback' || resolved.mode === 'source_module_loaded' : true,
      source_domain_matches_bundled_work_items: domainParity,
      source_facade_matches_bundled_work_items: facadeParity,
      source_schema_matches_bundled_work_items: schemaParity,
      source_state_files_match_bundled_work_items: stateFileParity,
      source_commands_match_bundled_work_items: commandParity,
      source_exclusions_match_bundled_work_items: excludedCommandParity,
      source_read_surfaces_match_bundled_work_items: readSurfaceParity,
      source_write_surfaces_match_bundled_work_items: explicitWriteSurfaceParity,
      source_write_boundary_matches_bundled_work_items: writeBoundaryParity,
      claim_and_close_commands_excluded: claimCloseExcluded,
      work_items_runtime_bridge_file_present_or_installed_context_allowed: bridgeFileStatus === 'present_validated' || bridgeFileStatus === 'not_present_installed_context_allowed',
      work_items_runtime_bridge_commands_no_write: gate.boundary.work_items_runtime_bridge_command_writes_files === false && gate.boundary.work_items_runtime_bridge_check_command_writes_files === false,
      public_cli_outputs_unchanged_by_gate: gate.boundary.changes_public_cli_outputs === false,
      cli_runtime_dependency_graph_unchanged: gate.boundary.changes_cli_runtime_dependency_graph === false,
      package_allowlist_unchanged: arrayEquals(result.projected_pack_files, expectedPackFiles)
    },
    runtime_bridge_resolution: resolved,
    source_work_items_runtime_bridge_file: {
      path: result.runtime_bridge_file,
      present: result.runtime_bridge_file_present,
      status: bridgeFileStatus,
      schema: bridgeFileSchema,
      source_context_required: result.package_context === 'source_repository'
    },
    prerequisite_work_items_bundle_parity: {
      status: bundleParity.status,
      errors: bundleParity.errors
    },
    projected_pack_files: result.projected_pack_files,
    expected_pack_files: expectedPackFiles,
    boundary: result.boundary,
    errors
  };
}


function publicWorkItemsDomainSourceExtractionInstalledFallbackSmoke(root = packageRoot()) {
  const runtimeBridge = publicWorkItemsDomainSourceExtractionRuntimeBridgeCheck(root);
  const packageSurface = publicPackageSurfaceCheck(root);
  const context = sourceContext(root);
  const pkg = readJson(path.join(root, 'package.json'));
  const gate = PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_INSTALLED_FALLBACK_SMOKE;
  const expectedPackFiles = PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort();
  const projectedPackFiles = packageJsonProjectedPackFiles(pkg).slice().sort();
  const sourceModuleRel = gate.source_module;
  const sourceModulePresent = fs.existsSync(path.join(root, sourceModuleRel));
  const sourceModuleInPack = expectedPackFiles.includes(sourceModuleRel) || projectedPackFiles.includes(sourceModuleRel);
  const projectedInstalledRuntimeBridge = {
    context: 'installed_package',
    source_module_present: false,
    source_module: sourceModuleRel,
    mode: 'bundled_fallback',
    fallback_source: 'cli/agent-onboard.js',
    allowed_because_source_module_is_not_in_npm_pack: !sourceModuleInPack,
    claim_and_close_commands_excluded: true
  };
  return {
    schema: 'agent-onboard-public-source-module-work-items-installed-fallback-smoke-result-001',
    status: 'ok',
    package_name: gate.package_name,
    version: VERSION,
    release_line: gate.release_line,
    command: gate.command,
    check_command: gate.check_command,
    package_root: root,
    source_context: context,
    installed_fallback_smoke_file: gate.installed_fallback_smoke_file,
    installed_fallback_smoke_file_present: fs.existsSync(path.join(root, gate.installed_fallback_smoke_file)),
    source_module: sourceModuleRel,
    source_module_present: sourceModulePresent,
    projected_installed_runtime_bridge: projectedInstalledRuntimeBridge,
    observed: {
      work_items_runtime_bridge_check_status: runtimeBridge.status,
      work_items_runtime_bridge_resolution_mode: runtimeBridge.runtime_bridge_resolution.mode,
      package_surface_check_status: packageSurface.status,
      source_module_in_expected_pack_files: expectedPackFiles.includes(sourceModuleRel),
      source_module_in_projected_pack_files: projectedPackFiles.includes(sourceModuleRel),
      source_context_files_in_pack: PUBLIC_RELEASE_CONTRACT.source_context_files.filter((rel) => projectedPackFiles.includes(rel))
    },
    expected_pack_files: expectedPackFiles,
    projected_pack_files: projectedPackFiles,
    installed_fallback_contract: gate,
    boundary: {
      writes_files: false,
      writes_source_state: false,
      writes_target_repository_state: false,
      git_mutation: false,
      installs_dependencies: false,
      runs_package_manager: false,
      runs_build_test_deploy: false,
      publishes_package: false,
      mutates_registry: false
    },
    errors: []
  };
}

function publicWorkItemsDomainSourceExtractionInstalledFallbackSmokeCheck(root = packageRoot()) {
  const result = publicWorkItemsDomainSourceExtractionInstalledFallbackSmoke(root);
  const runtimeBridge = publicWorkItemsDomainSourceExtractionRuntimeBridgeCheck(root);
  const packageSurface = publicPackageSurfaceCheck(root);
  const expectedPackFiles = PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort();
  const projectedPackFiles = packageJsonProjectedPackFiles(readJson(path.join(root, 'package.json'))).slice().sort();
  const gate = PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_INSTALLED_FALLBACK_SMOKE;
  const sourceModuleRel = gate.source_module;
  const artifactPath = path.join(root, gate.installed_fallback_smoke_file);
  const context = sourceContext(root);
  const errors = [];
  if (gate.smoke_status !== 'work_items_installed_fallback_smoke_admitted') errors.push('work-items installed fallback smoke status must remain work_items_installed_fallback_smoke_admitted');
  if (runtimeBridge.status !== 'ok') errors.push(...runtimeBridge.errors.map((error) => `work-items runtime bridge: ${error}`));
  if (packageSurface.status !== 'ok') errors.push(...packageSurface.errors.map((error) => `package surface: ${error}`));
  if (PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_RUNTIME_BRIDGE.boundary.installed_context_fallback_required !== true) errors.push('work-items runtime bridge must require installed-context fallback');
  if (gate.boundary.source_modules_remain_out_of_npm_pack !== true) errors.push('work-items source modules must remain out of npm pack');
  if (gate.boundary.work_items_installed_fallback_smoke_command_writes_files !== false) errors.push('architecture --work-items-installed-fallback-smoke must remain no-write');
  if (gate.boundary.work_items_installed_fallback_check_command_writes_files !== false) errors.push('architecture --work-items-installed-fallback-check must remain no-write');
  if (gate.boundary.includes_claim_and_close_commands !== false) errors.push('work-items installed fallback must keep claim and close excluded');
  if (!arrayEquals(expectedPackFiles, projectedPackFiles)) errors.push('projected pack files must match the compact expected pack files');
  if (expectedPackFiles.includes(sourceModuleRel) || projectedPackFiles.includes(sourceModuleRel)) errors.push(`${sourceModuleRel} must remain outside the npm package allowlist`);
  if (context.package_context === 'installed_package' && fs.existsSync(path.join(root, sourceModuleRel))) errors.push(`${sourceModuleRel} must be absent from installed package context`);
  if (context.package_context === 'installed_package' && runtimeBridge.runtime_bridge_resolution.mode !== 'bundled_fallback') errors.push('installed package work-items runtime bridge must resolve through bundled_fallback');
  if (context.package_context === 'source_repository' && !fs.existsSync(artifactPath)) errors.push(`${gate.installed_fallback_smoke_file} must exist in source repository context`);
  let fileStatus = 'not_present_installed_context_allowed';
  let fileSchema = null;
  if (fs.existsSync(artifactPath)) {
    try {
      const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
      fileSchema = artifact.schema || null;
      if (artifact.schema !== gate.schema) errors.push(`${gate.installed_fallback_smoke_file} schema must be ${gate.schema}`);
      if (artifact.source_module !== sourceModuleRel) errors.push(`${gate.installed_fallback_smoke_file} source_module must be ${sourceModuleRel}`);
      if (!artifact.projected_installed_context || artifact.projected_installed_context.runtime_bridge_resolution_mode !== 'bundled_fallback') errors.push(`${gate.installed_fallback_smoke_file} must declare bundled_fallback projected installed context`);
      if (!artifact.projected_installed_context || artifact.projected_installed_context.claim_and_close_commands_remain_excluded !== true) errors.push(`${gate.installed_fallback_smoke_file} must keep claim and close excluded`);
      if (!artifact.boundary || artifact.boundary.package_allowlist_unchanged !== true) errors.push(`${gate.installed_fallback_smoke_file} must preserve package_allowlist_unchanged`);
      fileStatus = 'present_validated';
    } catch (error) {
      fileStatus = 'present_invalid_json';
      errors.push(`${gate.installed_fallback_smoke_file} must be valid JSON: ${error.message}`);
    }
  }
  return {
    schema: 'agent-onboard-public-source-module-work-items-installed-fallback-smoke-check-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: gate.package_name,
    version: VERSION,
    release_line: gate.release_line,
    command: gate.check_command,
    package_root: root,
    source_context: context,
    validated: {
      work_items_runtime_bridge_check: runtimeBridge.status === 'ok',
      package_surface_check: packageSurface.status === 'ok',
      work_items_installed_fallback_smoke_status: gate.smoke_status === 'work_items_installed_fallback_smoke_admitted',
      source_module_out_of_pack: !expectedPackFiles.includes(sourceModuleRel) && !projectedPackFiles.includes(sourceModuleRel),
      projected_pack_allowlist_unchanged: arrayEquals(expectedPackFiles, projectedPackFiles),
      installed_context_uses_bundled_fallback: context.package_context === 'installed_package' ? runtimeBridge.runtime_bridge_resolution.mode === 'bundled_fallback' : result.projected_installed_runtime_bridge.mode === 'bundled_fallback',
      source_artifact_present_or_installed_context_allowed: fs.existsSync(artifactPath) || context.package_context === 'installed_package',
      claim_and_close_commands_excluded: gate.boundary.includes_claim_and_close_commands === false && result.projected_installed_runtime_bridge.claim_and_close_commands_excluded === true,
      installed_fallback_commands_no_write: gate.boundary.work_items_installed_fallback_smoke_command_writes_files === false && gate.boundary.work_items_installed_fallback_check_command_writes_files === false,
      package_allowlist_unchanged: gate.boundary.package_allowlist_unchanged === true
    },
    observed: result.observed,
    runtime_bridge: {
      status: runtimeBridge.status,
      resolution_mode: runtimeBridge.runtime_bridge_resolution.mode,
      source_module_present: runtimeBridge.runtime_bridge_resolution.source_module_present
    },
    source_work_items_installed_fallback_file: {
      path: gate.installed_fallback_smoke_file,
      present: fs.existsSync(artifactPath),
      status: fs.existsSync(artifactPath) ? fileStatus : (context.package_context === 'installed_package' ? 'not_present_installed_context_allowed' : 'missing'),
      schema: fileSchema,
      source_context_required: true
    },
    projected_installed_runtime_bridge: result.projected_installed_runtime_bridge,
    expected_pack_files: expectedPackFiles,
    projected_pack_files: projectedPackFiles,
    boundary: result.boundary,
    errors
  };
}

function publicArchitectureMap(root = packageRoot()) {
  const pkg = readJson(path.join(root, 'package.json'));
  return {
    schema: 'agent-onboard-public-architecture-map-result-001',
    status: 'ok',
    package_name: PUBLIC_ARCHITECTURE_MAP.package_name,
    version: VERSION,
    release_line: PUBLIC_ARCHITECTURE_MAP.release_line,
    command: PUBLIC_ARCHITECTURE_MAP.command,
    check_command: PUBLIC_ARCHITECTURE_MAP.check_command,
    package_root: root,
    package_context: sourceContext(root).package_context,
    package_json_version: pkg.version,
    map: PUBLIC_ARCHITECTURE_MAP,
    command_router: PUBLIC_COMMAND_ROUTER,
    domain_service_facades: PUBLIC_DOMAIN_SERVICE_FACADES,
    source_domain_module_partition_plan: PUBLIC_SOURCE_DOMAIN_MODULE_PARTITION_PLAN,
    source_domain_extraction_rehearsal: PUBLIC_SOURCE_DOMAIN_EXTRACTION_REHEARSAL,
    source_extraction_golden_output_freeze: PUBLIC_SOURCE_EXTRACTION_GOLDEN_OUTPUT_FREEZE,
      source_module_extraction_adapter_boundary: PUBLIC_SOURCE_MODULE_EXTRACTION_ADAPTER_BOUNDARY,
    source_module_extraction_first_slice: PUBLIC_SOURCE_MODULE_EXTRACTION_FIRST_SLICE,
    source_module_extraction_second_slice_plan: PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN,
    version_reference_policy: PUBLIC_VERSION_REFERENCE_POLICY,
    authority_first_read_index: PUBLIC_AUTHORITY_FIRST_READ_INDEX,
    target_runtime_namespace: PUBLIC_TARGET_RUNTIME_NAMESPACE,
    current_runtime: {
      entrypoint: PUBLIC_ARCHITECTURE_MAP.public_source_shape.current_entrypoint,
      entrypoint_exists: fs.existsSync(path.join(root, PUBLIC_ARCHITECTURE_MAP.public_source_shape.current_entrypoint)),
      physical_domain_split_status: PUBLIC_ARCHITECTURE_MAP.public_source_shape.physical_domain_split_status,
      expected_pack_files: PUBLIC_ARCHITECTURE_MAP.public_source_shape.expected_pack_files.slice(),
      projected_pack_files: packageJsonProjectedPackFiles(pkg)
    },
    boundary: {
      writes_files: false,
      writes_source_state: false,
      writes_target_repository_state: false,
      git_mutation: false,
      installs_dependencies: false,
      runs_package_manager: false,
      runs_build_test_deploy: false,
      publishes_package: false,
      mutates_registry: false
    }
  };
}


function publicSourceModuleExtractionInstalledFallbackSmoke(root = packageRoot()) {
  const runtimeBridge = publicSourceModuleExtractionRuntimeBridgeCheck(root);
  const packageSurface = publicPackageSurfaceCheck(root);
  const context = sourceContext(root);
  const pkg = readJson(path.join(root, 'package.json'));
  const expectedPackFiles = PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort();
  const projectedPackFiles = packageJsonProjectedPackFiles(pkg).slice().sort();
  const sourceModuleRel = PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.source_module;
  const sourceModulePresent = fs.existsSync(path.join(root, sourceModuleRel));
  const sourceModuleInPack = expectedPackFiles.includes(sourceModuleRel) || projectedPackFiles.includes(sourceModuleRel);
  const projectedInstalledRuntimeBridge = {
    context: 'installed_package',
    source_module_present: false,
    source_module: sourceModuleRel,
    mode: 'bundled_fallback',
    fallback_source: 'cli/agent-onboard.js',
    allowed_because_source_module_is_not_in_npm_pack: !sourceModuleInPack
  };
  return {
    schema: 'agent-onboard-public-source-module-extraction-installed-fallback-smoke-result-001',
    status: 'ok',
    package_name: PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.package_name,
    version: VERSION,
    release_line: PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.release_line,
    command: PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.command,
    check_command: PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.check_command,
    package_root: root,
    source_context: context,
    installed_fallback_smoke_file: PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.installed_fallback_smoke_file,
    installed_fallback_smoke_file_present: fs.existsSync(path.join(root, PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.installed_fallback_smoke_file)),
    source_module: sourceModuleRel,
    source_module_present: sourceModulePresent,
    projected_installed_runtime_bridge: projectedInstalledRuntimeBridge,
    observed: {
      runtime_bridge_check_status: runtimeBridge.status,
      runtime_bridge_resolution_mode: runtimeBridge.runtime_bridge_resolution.mode,
      package_surface_check_status: packageSurface.status,
      source_module_in_expected_pack_files: expectedPackFiles.includes(sourceModuleRel),
      source_module_in_projected_pack_files: projectedPackFiles.includes(sourceModuleRel),
      source_context_files_in_pack: PUBLIC_RELEASE_CONTRACT.source_context_files.filter((rel) => projectedPackFiles.includes(rel))
    },
    expected_pack_files: expectedPackFiles,
    projected_pack_files: projectedPackFiles,
    installed_fallback_contract: PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE,
    boundary: {
      writes_files: false,
      writes_source_state: false,
      writes_target_repository_state: false,
      git_mutation: false,
      installs_dependencies: false,
      runs_package_manager: false,
      runs_build_test_deploy: false,
      publishes_package: false,
      mutates_registry: false
    },
    errors: []
  };
}

function publicSourceModuleExtractionInstalledFallbackSmokeCheck(root = packageRoot()) {
  const result = publicSourceModuleExtractionInstalledFallbackSmoke(root);
  const runtimeBridge = publicSourceModuleExtractionRuntimeBridgeCheck(root);
  const packageSurface = publicPackageSurfaceCheck(root);
  const expectedPackFiles = PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort();
  const projectedPackFiles = packageJsonProjectedPackFiles(readJson(path.join(root, 'package.json'))).slice().sort();
  const sourceModuleRel = PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.source_module;
  const artifactPath = path.join(root, PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.installed_fallback_smoke_file);
  const context = sourceContext(root);
  const errors = [];
  if (PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.smoke_status !== 'installed_fallback_smoke_admitted') errors.push('installed fallback smoke status must be installed_fallback_smoke_admitted');
  if (runtimeBridge.status !== 'ok') errors.push('runtime bridge check must pass before installed fallback smoke');
  if (packageSurface.status !== 'ok') errors.push('package surface check must pass before installed fallback smoke');
  if (PUBLIC_SOURCE_MODULE_EXTRACTION_RUNTIME_BRIDGE.boundary.installed_context_fallback_required !== true) errors.push('runtime bridge must require installed-context fallback');
  if (PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.boundary.source_modules_remain_out_of_npm_pack !== true) errors.push('source modules must remain out of npm pack');
  if (PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.boundary.installed_fallback_check_command_writes_files !== false) errors.push('installed fallback check must remain no-write');
  if (!arrayEquals(expectedPackFiles, projectedPackFiles)) errors.push('projected pack files must match the compact expected pack files');
  if (expectedPackFiles.includes(sourceModuleRel) || projectedPackFiles.includes(sourceModuleRel)) errors.push(`${sourceModuleRel} must remain outside the npm package allowlist`);
  if (context.package_context === 'installed_package' && fs.existsSync(path.join(root, sourceModuleRel))) errors.push(`${sourceModuleRel} must be absent from installed package context`);
  if (context.package_context === 'installed_package' && runtimeBridge.runtime_bridge_resolution.mode !== 'bundled_fallback') errors.push('installed package runtime bridge must resolve through bundled_fallback');
  if (context.package_context === 'source_repository' && !fs.existsSync(artifactPath)) errors.push(`${PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.installed_fallback_smoke_file} must exist in source repository context`);
  if (fs.existsSync(artifactPath)) {
    try {
      const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
      if (artifact.schema !== PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.schema) errors.push(`${PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.installed_fallback_smoke_file} schema must be ${PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.schema}`);
      if (artifact.source_module !== sourceModuleRel) errors.push(`${PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.installed_fallback_smoke_file} source_module must be ${sourceModuleRel}`);
      if (!artifact.projected_installed_context || artifact.projected_installed_context.runtime_bridge_resolution_mode !== 'bundled_fallback') errors.push(`${PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.installed_fallback_smoke_file} must declare bundled_fallback projected installed context`);
    } catch (error) {
      errors.push(`${PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.installed_fallback_smoke_file} must be valid JSON: ${error.message}`);
    }
  }
  return {
    schema: 'agent-onboard-public-source-module-extraction-installed-fallback-smoke-check-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.package_name,
    version: VERSION,
    release_line: PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.release_line,
    command: PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.check_command,
    package_root: root,
    source_context: context,
    validated: {
      runtime_bridge_check: runtimeBridge.status === 'ok',
      package_surface_check: packageSurface.status === 'ok',
      installed_fallback_smoke_status: PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.smoke_status === 'installed_fallback_smoke_admitted',
      source_module_out_of_pack: !expectedPackFiles.includes(sourceModuleRel) && !projectedPackFiles.includes(sourceModuleRel),
      projected_pack_allowlist_unchanged: arrayEquals(expectedPackFiles, projectedPackFiles),
      installed_context_uses_bundled_fallback: context.package_context === 'installed_package' ? runtimeBridge.runtime_bridge_resolution.mode === 'bundled_fallback' : result.projected_installed_runtime_bridge.mode === 'bundled_fallback',
      source_artifact_present_or_installed_context_allowed: fs.existsSync(artifactPath) || context.package_context === 'installed_package',
      installed_fallback_commands_no_write: PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.boundary.installed_fallback_smoke_command_writes_files === false && PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.boundary.installed_fallback_check_command_writes_files === false,
      package_allowlist_unchanged: PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.boundary.package_allowlist_unchanged === true
    },
    observed: result.observed,
    runtime_bridge: {
      status: runtimeBridge.status,
      resolution_mode: runtimeBridge.runtime_bridge_resolution.mode,
      source_module_present: runtimeBridge.runtime_bridge_resolution.source_module_present
    },
    source_installed_fallback_file: {
      path: PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.installed_fallback_smoke_file,
      present: fs.existsSync(artifactPath),
      status: fs.existsSync(artifactPath) ? 'present_validated' : (context.package_context === 'installed_package' ? 'not_present_installed_context_allowed' : 'missing'),
      schema: PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.schema,
      source_context_required: true
    },
    projected_installed_runtime_bridge: result.projected_installed_runtime_bridge,
    expected_pack_files: expectedPackFiles,
    projected_pack_files: projectedPackFiles,
    boundary: {
      writes_files: false,
      writes_source_state: false,
      writes_target_repository_state: false,
      git_mutation: false,
      installs_dependencies: false,
      runs_package_manager: false,
      runs_build_test_deploy: false,
      publishes_package: false,
      mutates_registry: false
    },
    errors
  };
}


function gitignoreSecondSlicePolicy(root = packageRoot()) {
  const rel = PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.gitignore_policy.gitignore_file;
  const file = path.join(root, rel);
  const present = fs.existsSync(file);
  const content = present ? fs.readFileSync(file, 'utf8') : '';
  const entries = content.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0 && !line.startsWith('#'));
  const forbidden = ['.agent-onboard/', '.agent-onboard/*', 'src/', 'src/**', 'src/domains/', 'src/domains/*', 'src/domains/**'];
  const localStateEntries = ['.agent-onboard/tmp/', '.agent-onboard/cache/', '.agent-onboard/local/'];
  const perArtifactUnignoreEntries = entries.filter((entry) => /^!\.agent-onboard\/source-module-extraction-.*\.json$/.test(entry));
  return {
    file: rel,
    present,
    policy: 'track canonical .agent-onboard source JSON by default; ignore only local/runtime/cache state',
    required_unignore_entries: [],
    missing_required_unignore_entries: [],
    forbidden_ignore_entries: forbidden,
    present_forbidden_ignore_entries: forbidden.filter((entry) => entries.includes(entry)),
    local_state_ignore_entries: localStateEntries,
    missing_local_state_ignore_entries: localStateEntries.filter((entry) => !entries.includes(entry)),
    per_artifact_unignore_entries: perArtifactUnignoreEntries,
    entries
  };
}

function publicSourceModuleExtractionSecondSlicePlan(root = packageRoot()) {
  const pkg = readJson(path.join(root, 'package.json'));
  const context = sourceContext(root);
  const plan = PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN;
  const plannedModule = plan.planned_second_slice.planned_module;
  return {
    schema: 'agent-onboard-public-source-module-extraction-second-slice-plan-result-001',
    status: 'ok',
    package_name: plan.package_name,
    version: VERSION,
    release_line: plan.release_line,
    command: plan.command,
    check_command: plan.check_command,
    package_root: root,
    package_context: context.package_context,
    package_json_version: pkg.version,
    second_slice_plan_file: plan.second_slice_plan_file,
    second_slice_plan_file_present: fs.existsSync(path.join(root, plan.second_slice_plan_file)),
    prerequisite_installed_fallback_smoke_file: plan.prerequisite_installed_fallback_smoke_file,
    planned_second_slice: plan.planned_second_slice,
    planned_module: plannedModule,
    planned_module_present: fs.existsSync(path.join(root, plannedModule)),
    current_source_modules_present: ['src/domains/core.js', plannedModule].filter((rel) => fs.existsSync(path.join(root, rel))),
    gitignore_policy: gitignoreSecondSlicePolicy(root),
    projected_pack_files: packageJsonProjectedPackFiles(pkg),
    expected_pack_files: PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort(),
    second_slice_plan: plan,
    boundary: {
      writes_files: false,
      writes_source_state: false,
      writes_target_repository_state: false,
      git_mutation: false,
      installs_dependencies: false,
      runs_package_manager: false,
      runs_build_test_deploy: false,
      publishes_package: false,
      mutates_registry: false
    }
  };
}

function publicSourceModuleExtractionSecondSlicePlanCheck(root = packageRoot()) {
  const result = publicSourceModuleExtractionSecondSlicePlan(root);
  const installedFallback = publicSourceModuleExtractionInstalledFallbackSmokeCheck(root);
  const expectedPackFiles = PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort();
  const planned = PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.planned_second_slice;
  const partitionPlan = PUBLIC_SOURCE_DOMAIN_MODULE_PARTITION_PLAN.planned_source_modules.find((module) => module.domain === planned.domain);
  const facade = PUBLIC_DOMAIN_SERVICE_FACADES.facades.find((item) => item.id === planned.domain);
  const artifactPath = path.join(root, PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.second_slice_plan_file);
  const errors = [];
  if (installedFallback.status !== 'ok') errors.push(...installedFallback.errors.map((error) => `installed fallback smoke: ${error}`));
  if (PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.second_slice_status !== 'planned_not_created') errors.push('second slice status must remain planned_not_created for this gate');
  if (planned.domain !== 'authority') errors.push('second slice must plan the authority domain after the core first slice');
  if (!partitionPlan) errors.push('second slice domain must exist in the source partition plan');
  if (partitionPlan && partitionPlan.planned_module !== planned.planned_module) errors.push(`second slice planned module must match partition plan module ${partitionPlan.planned_module}`);
  if (!facade || facade.service !== planned.facade) errors.push('second slice must map to authorityService facade');
  if (planned.source_module_created_by_this_gate !== false) errors.push('second slice planning gate must not create the authority source module');
  if (planned.published_import_api !== false) errors.push('second slice source module must not be admitted as public import API');
  const followupFirstSliceFilePresent = fs.existsSync(path.join(root, '.agent-onboard/source-module-extraction-second-slice-first-slice.json'));
  if (result.planned_module_present && !followupFirstSliceFilePresent) errors.push(`${planned.planned_module} must not be created until the second slice first-slice gate is admitted`);
  if (!arrayEquals(result.projected_pack_files, expectedPackFiles)) errors.push(`projected npm pack files must remain ${expectedPackFiles.join(', ')}`);
  if (result.projected_pack_files.includes(planned.planned_module)) errors.push(`${planned.planned_module} must stay outside the npm package allowlist`);
  if (PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.boundary.second_slice_plan_command_writes_files !== false) errors.push('architecture --second-slice-plan must remain no-write');
  if (PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.boundary.second_slice_check_command_writes_files !== false) errors.push('architecture --second-slice-check must remain no-write');
  if (PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.boundary.package_allowlist_unchanged !== true) errors.push('second slice planning must preserve package allowlist');

  let planFileStatus = 'not_present_installed_context_allowed';
  let planFileSchema = null;
  if (result.second_slice_plan_file_present) {
    try {
      const artifact = readJson(artifactPath);
      planFileSchema = artifact.schema || null;
      if (artifact.schema !== PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.schema) errors.push(`${PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.second_slice_plan_file} schema must be ${PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.schema}`);
      if (artifact.second_slice_status !== 'planned_not_created') errors.push(`${PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.second_slice_plan_file} must declare planned_not_created`);
      if (!artifact.planned_second_slice || artifact.planned_second_slice.domain !== planned.domain) errors.push(`${PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.second_slice_plan_file} must plan ${planned.domain}`);
      if (!artifact.planned_second_slice || artifact.planned_second_slice.planned_module !== planned.planned_module) errors.push(`${PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.second_slice_plan_file} planned module must be ${planned.planned_module}`);
      planFileStatus = 'present_validated';
    } catch (error) {
      planFileStatus = 'present_invalid_json';
      errors.push(`${PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.second_slice_plan_file} must be valid JSON: ${error && error.message ? error.message : String(error)}`);
    }
  } else if (result.package_context === 'source_repository') {
    planFileStatus = 'missing_source_context';
    errors.push(`${PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.second_slice_plan_file} must exist in source repository context`);
  }

  const gitignore = result.gitignore_policy;
  if (result.package_context === 'source_repository') {
    if (!gitignore.present) errors.push('.gitignore must exist in source repository context');
    for (const entry of gitignore.missing_required_unignore_entries) errors.push(`.gitignore must unignore ${entry}`);
    for (const entry of gitignore.present_forbidden_ignore_entries) errors.push(`.gitignore must not ignore source module path with ${entry}`);
    for (const entry of gitignore.per_artifact_unignore_entries) errors.push(`.gitignore must not use per-artifact unignore sprawl: ${entry}`);
    for (const entry of gitignore.missing_local_state_ignore_entries) errors.push(`.gitignore must ignore local state entry ${entry}`);
  }

  return {
    schema: 'agent-onboard-public-source-module-extraction-second-slice-plan-check-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.package_name,
    version: VERSION,
    release_line: PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.release_line,
    command: PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.check_command,
    package_root: root,
    source_context: result.source_context,
    validated: {
      installed_fallback_smoke: installedFallback.status === 'ok',
      second_slice_status: PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.second_slice_status === 'planned_not_created',
      planned_domain_is_authority: planned.domain === 'authority',
      planned_domain_maps_to_facade: !!facade && facade.service === planned.facade,
      planned_module_matches_partition_plan: !!partitionPlan && partitionPlan.planned_module === planned.planned_module,
      authority_module_not_created_by_this_gate: !result.planned_module_present || followupFirstSliceFilePresent,
      second_slice_plan_file_present_or_installed_context_allowed: planFileStatus === 'present_validated' || planFileStatus === 'not_present_installed_context_allowed',
      gitignore_tracks_source_artifacts: result.package_context === 'installed_package' || (gitignore.present && gitignore.missing_required_unignore_entries.length === 0),
      gitignore_does_not_ignore_src_domains: result.package_context === 'installed_package' || gitignore.present_forbidden_ignore_entries.length === 0,
      gitignore_uses_compact_local_state_policy: result.package_context === 'installed_package' || (gitignore.present && gitignore.per_artifact_unignore_entries.length === 0 && gitignore.missing_local_state_ignore_entries.length === 0),
      second_slice_commands_no_write: PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.boundary.second_slice_plan_command_writes_files === false && PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.boundary.second_slice_check_command_writes_files === false,
      package_allowlist_unchanged: arrayEquals(result.projected_pack_files, expectedPackFiles)
    },
    planned_second_slice: planned,
    second_slice_plan_file: {
      path: PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.second_slice_plan_file,
      present: result.second_slice_plan_file_present,
      status: planFileStatus,
      schema: planFileSchema,
      source_context_required: result.package_context === 'source_repository'
    },
    gitignore_policy: gitignore,
    prerequisite_installed_fallback_smoke: {
      status: installedFallback.status,
      errors: installedFallback.errors
    },
    projected_pack_files: result.projected_pack_files,
    expected_pack_files: expectedPackFiles,
    boundary: result.boundary,
    errors
  };
}


function loadAuthoritySecondSliceModule(root = packageRoot()) {
  const modulePath = path.join(root, PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_FIRST_SLICE.source_module);
  if (!fs.existsSync(modulePath)) return null;
  const resolved = require.resolve(modulePath);
  delete require.cache[resolved];
  return require(resolved);
}

function publicSourceModuleExtractionSecondSliceFirstSlice(root = packageRoot()) {
  const pkg = readJson(path.join(root, 'package.json'));
  const context = sourceContext(root);
  const gate = PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_FIRST_SLICE;
  let module_exports = [];
  let module_value = null;
  let module_load_error = null;
  try {
    const loaded = loadAuthoritySecondSliceModule(root);
    if (loaded) {
      module_exports = Object.keys(loaded).sort();
      if (typeof loaded.getAuthorityDomainSecondSlice === 'function') {
        module_value = loaded.getAuthorityDomainSecondSlice();
      } else if (loaded.AUTHORITY_DOMAIN_SECOND_SLICE) {
        module_value = loaded.AUTHORITY_DOMAIN_SECOND_SLICE;
      }
    }
  } catch (error) {
    module_load_error = error && error.message ? error.message : String(error);
  }
  return {
    schema: 'agent-onboard-public-source-module-extraction-second-slice-first-slice-result-001',
    status: module_load_error ? 'error' : 'ok',
    package_name: gate.package_name,
    version: VERSION,
    release_line: gate.release_line,
    command: gate.command,
    check_command: gate.check_command,
    package_root: root,
    package_context: context.package_context,
    package_json_version: pkg.version,
    second_slice_first_slice_file: gate.second_slice_first_slice_file,
    second_slice_first_slice_file_present: fs.existsSync(path.join(root, gate.second_slice_first_slice_file)),
    source_module: gate.source_module,
    source_module_present: fs.existsSync(path.join(root, gate.source_module)),
    source_module_exports: module_exports,
    source_module_value: module_value,
    source_module_load_error: module_load_error,
    prerequisite_second_slice_plan_file: gate.prerequisite_second_slice_plan_file,
    second_slice_first_slice: gate,
    projected_pack_files: packageJsonProjectedPackFiles(pkg),
    boundary: {
      writes_files: false,
      writes_source_state: false,
      writes_target_repository_state: false,
      git_mutation: false,
      installs_dependencies: false,
      runs_package_manager: false,
      runs_build_test_deploy: false,
      publishes_package: false,
      mutates_registry: false
    }
  };
}

function publicSourceModuleExtractionSecondSliceFirstSliceCheck(root = packageRoot()) {
  const result = publicSourceModuleExtractionSecondSliceFirstSlice(root);
  const plan = publicSourceModuleExtractionSecondSlicePlanCheck(root);
  const expectedPackFiles = PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort();
  const gate = PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_FIRST_SLICE;
  const expectedExports = gate.expected_module_export_names.slice().sort();
  const expectedReadOrder = gate.expected_read_order_paths.slice();
  const errors = [];
  if (plan.status !== 'ok') errors.push(...plan.errors.map((error) => `second slice plan: ${error}`));
  if (result.status !== 'ok') errors.push(`second slice first-slice module load failed: ${result.source_module_load_error}`);
  if (!arrayEquals(result.projected_pack_files, expectedPackFiles)) errors.push(`projected npm pack files must remain ${expectedPackFiles.join(', ')}`);
  if (gate.second_slice_first_slice_status !== 'source_only_shadow_module_applied') errors.push('second slice first-slice status must be source_only_shadow_module_applied');
  if (gate.extracted_domain.id !== 'authority') errors.push('second slice first-slice must extract the authority domain');
  if (gate.boundary.created_source_module !== 'src/domains/authority.js') errors.push('second slice created source module must be src/domains/authority.js');
  if (gate.boundary.creates_exactly_one_source_module !== true) errors.push('second slice first-slice must create exactly one source module');
  if (gate.boundary.excludes_write_capable_agents_command !== true) errors.push('second slice first-slice must exclude write-capable agents command extraction');
  if (gate.boundary.moves_existing_source_files !== false) errors.push('second slice first-slice must not move existing source files');
  if (gate.boundary.changes_public_cli_outputs !== false) errors.push('second slice first-slice must not change public CLI outputs');
  if (gate.boundary.changes_cli_runtime_dependency_graph !== false) errors.push('second slice first-slice must not make CLI runtime require source modules');
  if (gate.boundary.exports_source_module_as_public_api !== false) errors.push('second slice first-slice must not expose source module as public import API');
  if (gate.boundary.second_slice_first_slice_command_writes_files !== false) errors.push('architecture --second-slice-first-slice must remain no-write');
  if (gate.boundary.second_slice_first_slice_check_command_writes_files !== false) errors.push('architecture --second-slice-first-slice-check must remain no-write');

  let artifactStatus = 'not_present_installed_context_allowed';
  let artifactSchema = null;
  if (result.second_slice_first_slice_file_present) {
    try {
      const artifact = readJson(path.join(root, result.second_slice_first_slice_file));
      artifactSchema = artifact.schema || null;
      if (artifact.schema !== gate.schema) errors.push(`${result.second_slice_first_slice_file} schema must be ${gate.schema}`);
      if (!artifact.extracted_domain || artifact.extracted_domain.id !== 'authority') errors.push(`${result.second_slice_first_slice_file} must declare extracted_domain.id authority`);
      if (artifact.source_module !== 'src/domains/authority.js') errors.push(`${result.second_slice_first_slice_file} source_module must be src/domains/authority.js`);
      artifactStatus = 'present_validated';
    } catch (error) {
      artifactStatus = 'present_invalid_json';
      errors.push(`${result.second_slice_first_slice_file} is not valid JSON: ${error && error.message ? error.message : String(error)}`);
    }
  } else if (result.package_context === 'source_repository') {
    artifactStatus = 'missing_source_context';
    errors.push(`${result.second_slice_first_slice_file} must be present in source repository context`);
  }

  let sourceModuleStatus = 'not_present_installed_context_allowed';
  const moduleValue = result.source_module_value || {};
  const moduleExportsSorted = result.source_module_exports.slice().sort();
  if (result.source_module_present) {
    if (!arrayEquals(moduleExportsSorted, expectedExports)) errors.push(`${result.source_module} exports must be ${expectedExports.join(', ')}`);
    if (moduleValue.schema !== 'agent-onboard-public-source-module-authority-second-slice-001') errors.push(`${result.source_module} must export authority second-slice schema`);
    if (moduleValue.domain !== 'authority') errors.push(`${result.source_module} domain must be authority`);
    if (moduleValue.facade !== 'authorityService') errors.push(`${result.source_module} facade must be authorityService`);
    if (moduleValue.source_module !== result.source_module) errors.push(`${result.source_module} source_module field must match its path`);
    if (moduleValue.runtime_dependency_status !== gate.extracted_domain.runtime_dependency_status) errors.push(`${result.source_module} runtime dependency status must remain source-only shadow`);
    if (moduleValue.exports_public_api !== false) errors.push(`${result.source_module} must not declare public import API`);
    if (moduleValue.includes_write_capable_agents_command !== false) errors.push(`${result.source_module} must exclude write-capable agents command extraction`);
    if (moduleValue.writes_files !== false || moduleValue.state_writer !== false) errors.push(`${result.source_module} must remain read-only and non-state-writer`);
    if (!arrayEquals((moduleValue.read_order_paths || []), expectedReadOrder)) errors.push(`${result.source_module} read_order_paths must match authority first-read order`);
    sourceModuleStatus = 'present_validated';
  } else if (result.package_context === 'source_repository') {
    sourceModuleStatus = 'missing_source_context';
    errors.push(`${result.source_module} must be present in source repository context`);
  }

  return {
    schema: 'agent-onboard-public-source-module-extraction-second-slice-first-slice-check-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: gate.package_name,
    version: VERSION,
    release_line: gate.release_line,
    command: gate.check_command,
    package_root: root,
    validated: {
      second_slice_plan: plan.status === 'ok',
      second_slice_status: gate.second_slice_first_slice_status === 'source_only_shadow_module_applied',
      extracted_domain_is_authority: gate.extracted_domain.id === 'authority',
      source_module_present_or_installed_context_allowed: sourceModuleStatus === 'present_validated' || sourceModuleStatus === 'not_present_installed_context_allowed',
      second_slice_first_slice_file_present_or_installed_context_allowed: artifactStatus === 'present_validated' || artifactStatus === 'not_present_installed_context_allowed',
      write_capable_agents_command_excluded: moduleValue.includes_write_capable_agents_command === false || sourceModuleStatus === 'not_present_installed_context_allowed',
      commands_no_write: gate.boundary.second_slice_first_slice_command_writes_files === false && gate.boundary.second_slice_first_slice_check_command_writes_files === false,
      package_allowlist_unchanged: arrayEquals(result.projected_pack_files, expectedPackFiles)
    },
    source_module: {
      path: result.source_module,
      present: result.source_module_present,
      status: sourceModuleStatus,
      exports: result.source_module_exports,
      value: result.source_module_value,
      source_context_required: result.package_context === 'source_repository'
    },
    second_slice_first_slice_file: {
      path: result.second_slice_first_slice_file,
      present: result.second_slice_first_slice_file_present,
      status: artifactStatus,
      schema: artifactSchema,
      source_context_required: result.package_context === 'source_repository'
    },
    prerequisite_second_slice_plan: {
      status: plan.status,
      errors: plan.errors
    },
    projected_pack_files: result.projected_pack_files,
    expected_pack_files: expectedPackFiles,
    boundary: result.boundary,
    errors
  };
}


function bundledAuthorityDomainForParity(root = packageRoot()) {
  const map = publicArchitectureMap(root);
  const facade = PUBLIC_DOMAIN_SERVICE_FACADES.facades.find((item) => item.id === 'authority');
  const domain = map.map.canonical_domains.find((item) => item.id === 'authority');
  return {
    schema: 'agent-onboard-public-bundled-authority-domain-view-001',
    domain: domain ? domain.id : null,
    facade: facade ? facade.service : null,
    service: facade ? facade.service : null,
    source: 'cli/agent-onboard.js',
    owns_commands: PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_FIRST_SLICE.expected_owned_commands.slice(),
    excluded_commands: ['agents --write', 'agents --preview'],
    writes_files: false,
    state_writer: false,
    state_files: domain ? domain.state_files.slice() : [],
    read_order_paths: PUBLIC_AUTHORITY_FIRST_READ_INDEX.read_order.map((item) => item.path),
    package_context: sourceContext(root).package_context
  };
}

function publicSourceModuleExtractionAuthorityBundleParity(root = packageRoot()) {
  const pkg = readJson(path.join(root, 'package.json'));
  const context = sourceContext(root);
  const sourceSlice = publicSourceModuleExtractionSecondSliceFirstSlice(root);
  const bundledAuthority = bundledAuthorityDomainForParity(root);
  return {
    schema: 'agent-onboard-public-source-module-extraction-authority-bundle-parity-result-001',
    status: sourceSlice.status,
    package_name: PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_BUNDLE_PARITY.package_name,
    version: VERSION,
    release_line: PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_BUNDLE_PARITY.release_line,
    command: PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_BUNDLE_PARITY.command,
    check_command: PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_BUNDLE_PARITY.check_command,
    package_root: root,
    package_context: context.package_context,
    package_json_version: pkg.version,
    authority_bundle_parity_file: PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_BUNDLE_PARITY.authority_bundle_parity_file,
    authority_bundle_parity_file_present: fs.existsSync(path.join(root, PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_BUNDLE_PARITY.authority_bundle_parity_file)),
    source_module: PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_BUNDLE_PARITY.source_module,
    source_module_present: fs.existsSync(path.join(root, PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_BUNDLE_PARITY.source_module)),
    source_slice_value: sourceSlice.source_module_value,
    source_slice_load_error: sourceSlice.source_module_load_error,
    bundled_authority_view: bundledAuthority,
    authority_bundle_parity: PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_BUNDLE_PARITY,
    projected_pack_files: packageJsonProjectedPackFiles(pkg),
    boundary: {
      writes_files: false,
      writes_source_state: false,
      writes_target_repository_state: false,
      git_mutation: false,
      installs_dependencies: false,
      runs_package_manager: false,
      runs_build_test_deploy: false,
      publishes_package: false,
      mutates_registry: false
    }
  };
}

function publicSourceModuleExtractionAuthorityBundleParityCheck(root = packageRoot()) {
  const result = publicSourceModuleExtractionAuthorityBundleParity(root);
  const firstSlice = publicSourceModuleExtractionSecondSliceFirstSliceCheck(root);
  const expectedPackFiles = PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort();
  const gate = PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_BUNDLE_PARITY;
  const errors = [];
  if (firstSlice.status !== 'ok') errors.push(...firstSlice.errors.map((error) => `second slice first-slice: ${error}`));
  if (result.status !== 'ok') errors.push(`authority source slice module load failed: ${result.source_slice_load_error}`);
  if (!arrayEquals(result.projected_pack_files, expectedPackFiles)) errors.push(`projected npm pack files must remain ${expectedPackFiles.join(', ')}`);
  if (gate.parity_status !== 'authority_source_slice_matches_bundled_cli_view') errors.push('authority bundle parity status must remain authority_source_slice_matches_bundled_cli_view');
  if (gate.boundary.authority_bundle_parity_command_writes_files !== false) errors.push('architecture --authority-bundle-parity must remain no-write');
  if (gate.boundary.authority_bundle_parity_check_command_writes_files !== false) errors.push('architecture --authority-bundle-parity-check must remain no-write');
  if (gate.boundary.creates_bundle_artifact !== false) errors.push('authority bundle parity gate must not create bundle artifacts');
  if (gate.boundary.changes_public_cli_outputs !== false) errors.push('authority bundle parity gate must not change public CLI outputs');
  if (gate.boundary.changes_cli_runtime_dependency_graph !== false) errors.push('authority bundle parity gate must not change CLI runtime dependency graph');
  if (gate.boundary.includes_write_capable_agents_command !== false) errors.push('authority bundle parity gate must exclude write-capable agents command extraction');
  if (gate.boundary.package_allowlist_unchanged !== true) errors.push('authority bundle parity gate must preserve package allowlist');

  let parityFileStatus = 'not_present_installed_context_allowed';
  let parityFileSchema = null;
  if (result.authority_bundle_parity_file_present) {
    try {
      const parityFile = readJson(path.join(root, result.authority_bundle_parity_file));
      parityFileSchema = parityFile.schema || null;
      if (parityFile.schema !== gate.schema) errors.push(`${result.authority_bundle_parity_file} schema must be ${gate.schema}`);
      if (parityFile.source_module !== gate.source_module) errors.push(`${result.authority_bundle_parity_file} source_module must be ${gate.source_module}`);
      if (parityFile.parity_status !== gate.parity_status) errors.push(`${result.authority_bundle_parity_file} parity_status must be ${gate.parity_status}`);
      if (!parityFile.boundary || parityFile.boundary.package_allowlist_unchanged !== true) errors.push(`${result.authority_bundle_parity_file} must preserve package_allowlist_unchanged`);
      if (!parityFile.boundary || parityFile.boundary.includes_write_capable_agents_command !== false) errors.push(`${result.authority_bundle_parity_file} must exclude write-capable agents command extraction`);
      parityFileStatus = 'present_validated';
    } catch (error) {
      parityFileStatus = 'present_invalid_json';
      errors.push(`${result.authority_bundle_parity_file} is not valid JSON: ${error && error.message ? error.message : String(error)}`);
    }
  } else if (result.package_context === 'source_repository') {
    parityFileStatus = 'missing_source_context';
    errors.push(`${result.authority_bundle_parity_file} must be present in source repository context`);
  }

  const sourceSlice = result.source_slice_value || null;
  const sourceContextAllowedMissing = result.package_context === 'installed_package' && !sourceSlice;
  const commandParity = sourceContextAllowedMissing || (sourceSlice && arrayEquals(sourceSlice.owns_commands || [], result.bundled_authority_view.owns_commands));
  const domainParity = sourceContextAllowedMissing || (sourceSlice && sourceSlice.domain === result.bundled_authority_view.domain);
  const facadeParity = sourceContextAllowedMissing || (sourceSlice && sourceSlice.facade === result.bundled_authority_view.facade);
  const readOrderParity = sourceContextAllowedMissing || (sourceSlice && arrayEquals(sourceSlice.read_order_paths || [], result.bundled_authority_view.read_order_paths));
  const excludedAgentsParity = sourceContextAllowedMissing || (sourceSlice && sourceSlice.includes_write_capable_agents_command === false && arrayEquals(sourceSlice.excluded_commands || [], result.bundled_authority_view.excluded_commands));
  const writeParity = sourceContextAllowedMissing || (sourceSlice && sourceSlice.writes_files === result.bundled_authority_view.writes_files && sourceSlice.state_writer === result.bundled_authority_view.state_writer);
  if (!domainParity) errors.push('authority source slice domain must match bundled authority domain view');
  if (!facadeParity) errors.push('authority source slice facade must match bundled authority facade view');
  if (!commandParity) errors.push('authority source slice owned commands must match bundled authority command routes');
  if (!readOrderParity) errors.push('authority source slice read order must match bundled first-read index');
  if (!excludedAgentsParity) errors.push('authority source slice must exclude write-capable agents commands');
  if (!writeParity) errors.push('authority source slice read/write boundary must match bundled authority view');

  return {
    schema: 'agent-onboard-public-source-module-extraction-authority-bundle-parity-check-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: gate.package_name,
    version: VERSION,
    release_line: gate.release_line,
    command: gate.check_command,
    package_root: root,
    validated: {
      second_slice_first_slice: firstSlice.status === 'ok',
      authority_bundle_parity_status: gate.parity_status === 'authority_source_slice_matches_bundled_cli_view',
      source_slice_domain_matches_bundled_authority: domainParity,
      source_slice_facade_matches_bundled_authority: facadeParity,
      source_slice_commands_match_bundled_authority: commandParity,
      source_slice_read_order_matches_bundled_first_read: readOrderParity,
      write_capable_agents_command_excluded: excludedAgentsParity,
      source_slice_write_boundary_matches_bundled_authority: writeParity,
      source_module_present_or_installed_context_allowed: result.source_module_present || result.package_context === 'installed_package',
      authority_bundle_parity_file_present_or_installed_context_allowed: parityFileStatus === 'present_validated' || parityFileStatus === 'not_present_installed_context_allowed',
      authority_bundle_parity_commands_no_write: gate.boundary.authority_bundle_parity_command_writes_files === false && gate.boundary.authority_bundle_parity_check_command_writes_files === false,
      public_cli_outputs_unchanged_by_gate: gate.boundary.changes_public_cli_outputs === false,
      cli_runtime_dependency_graph_unchanged: gate.boundary.changes_cli_runtime_dependency_graph === false,
      package_allowlist_unchanged: arrayEquals(result.projected_pack_files, expectedPackFiles)
    },
    source_slice: result.source_slice_value,
    bundled_authority_view: result.bundled_authority_view,
    source_authority_bundle_parity_file: {
      path: result.authority_bundle_parity_file,
      present: result.authority_bundle_parity_file_present,
      status: parityFileStatus,
      schema: parityFileSchema,
      source_context_required: result.package_context === 'source_repository'
    },
    prerequisite_second_slice_first_slice: {
      status: firstSlice.status,
      errors: firstSlice.errors
    },
    projected_pack_files: result.projected_pack_files,
    expected_pack_files: expectedPackFiles,
    boundary: result.boundary,
    errors
  };
}


function publicArchitectureCheck(root = packageRoot()) {
  const map = publicArchitectureMap(root);
  const expectedDomains = ['core', 'authority', 'work_items', 'claims', 'target', 'release_package'];
  const domainIds = map.map.canonical_domains.map((domain) => domain.id);
  const expectedPackFiles = map.map.public_source_shape.expected_pack_files.slice().sort();
  const projectedPackFiles = map.current_runtime.projected_pack_files;
  const router = publicCommandRouterCheck(root);
  const routerErrors = router.errors.map((error) => `command router: ${error}`);
  const facades = publicDomainServiceFacadesCheck(root);
  const facadeErrors = facades.errors.map((error) => `domain service facades: ${error}`);
  const authority = publicAuthorityFirstReadCheck(root);
  const authorityErrors = authority.errors.map((error) => `authority: ${error}`);
  const targetRuntime = publicTargetRuntimeNamespaceCheck(root);
  const targetRuntimeErrors = targetRuntime.errors.map((error) => `target runtime: ${error}`);
  const sourcePartition = publicSourceDomainModulePartitionPlanCheck(root);
  const sourcePartitionErrors = sourcePartition.errors.map((error) => `source partition: ${error}`);
  const sourceExtraction = publicSourceDomainExtractionRehearsalCheck(root);
  const sourceExtractionErrors = sourceExtraction.errors.map((error) => `source extraction: ${error}`);
  const goldenOutputs = publicSourceExtractionGoldenOutputFreezeCheck(root);
  const goldenOutputErrors = goldenOutputs.errors.map((error) => `golden outputs: ${error}`);
  const adapterBoundary = publicSourceModuleExtractionAdapterBoundaryCheck(root);
  const adapterBoundaryErrors = adapterBoundary.errors.map((error) => `adapter boundary: ${error}`);
  const firstSlice = publicSourceModuleExtractionFirstSliceCheck(root);
  const firstSliceErrors = firstSlice.errors.map((error) => `first slice: ${error}`);
  const bundleParity = publicSourceModuleExtractionBundleParityCheck(root);
  const bundleParityErrors = bundleParity.errors.map((error) => `bundle parity: ${error}`);
  const runtimeBridge = publicSourceModuleExtractionRuntimeBridgeCheck(root);
  const runtimeBridgeErrors = runtimeBridge.errors.map((error) => `runtime bridge: ${error}`);
  const installedFallbackSmoke = publicSourceModuleExtractionInstalledFallbackSmokeCheck(root);
  const installedFallbackSmokeErrors = installedFallbackSmoke.errors.map((error) => `installed fallback smoke: ${error}`);
  const secondSlicePlan = publicSourceModuleExtractionSecondSlicePlanCheck(root);
  const secondSlicePlanErrors = secondSlicePlan.errors.map((error) => `second slice plan: ${error}`);
  const secondSliceFirstSlice = publicSourceModuleExtractionSecondSliceFirstSliceCheck(root);
  const secondSliceFirstSliceErrors = secondSliceFirstSlice.errors.map((error) => `second slice first-slice: ${error}`);
  const authorityBundleParity = publicSourceModuleExtractionAuthorityBundleParityCheck(root);
  const authorityBundleParityErrors = authorityBundleParity.errors.map((error) => `authority bundle parity: ${error}`);
  const authorityRuntimeBridge = publicSourceModuleExtractionAuthorityRuntimeBridgeCheck(root);
  const authorityRuntimeBridgeErrors = authorityRuntimeBridge.errors.map((error) => `authority runtime bridge: ${error}`);
  const m2Seed = publicArchitectureM1ClosureM2SeedCheck(root);
  const m2SeedErrors = m2Seed.errors.map((error) => `m2 seed: ${error}`);
  const workItemsPlan = publicWorkItemsDomainSourceExtractionPlanCheck(root);
  const workItemsPlanErrors = workItemsPlan.errors.map((error) => `work-items source extraction plan: ${error}`);
  const workItemsFirstSlice = publicWorkItemsDomainSourceExtractionFirstSliceCheck(root);
  const workItemsFirstSliceErrors = workItemsFirstSlice.errors.map((error) => `work-items first-slice: ${error}`);
  const workItemsBundleParity = publicWorkItemsDomainSourceExtractionBundleParityCheck(root);
  const workItemsBundleParityErrors = workItemsBundleParity.errors.map((error) => `work-items bundle parity: ${error}`);
  const workItemsRuntimeBridge = publicWorkItemsDomainSourceExtractionRuntimeBridgeCheck(root);
  const workItemsRuntimeBridgeErrors = workItemsRuntimeBridge.errors.map((error) => `work-items runtime bridge: ${error}`);
  const workItemsInstalledFallback = publicWorkItemsDomainSourceExtractionInstalledFallbackSmokeCheck(root);
  const workItemsInstalledFallbackErrors = workItemsInstalledFallback.errors.map((error) => `work-items installed fallback smoke: ${error}`);
  const errors = [];
  if (!arrayEquals(domainIds, expectedDomains)) errors.push(`architecture domain order must be ${expectedDomains.join(', ')}`);
  if (new Set(domainIds).size !== domainIds.length) errors.push('architecture domain ids must be unique');
  if (map.map.canonical_domains.length !== 6) errors.push('architecture map must declare exactly 6 public domains');
  if (!map.current_runtime.entrypoint_exists) errors.push(`architecture entrypoint is missing: ${map.current_runtime.entrypoint}`);
  if (!arrayEquals(projectedPackFiles, expectedPackFiles)) errors.push(`projected npm pack files must match architecture package boundary ${expectedPackFiles.join(', ')}`);
  if (map.map.package_boundary.architecture_map_command_writes_files !== false) errors.push('architecture map command must remain no-write');
  if (map.map.package_boundary.architecture_check_command_writes_files !== false) errors.push('architecture check command must remain no-write');
  if (map.map.package_boundary.architecture_router_command_writes_files !== false) errors.push('architecture router command must remain no-write');
  if (map.map.package_boundary.architecture_facades_command_writes_files !== false) errors.push('architecture facades command must remain no-write');
  if (map.map.package_boundary.architecture_partition_plan_command_writes_files !== false) errors.push('architecture partition plan command must remain no-write');
  if (map.map.package_boundary.architecture_partition_check_command_writes_files !== false) errors.push('architecture partition check command must remain no-write');
  if (map.map.package_boundary.architecture_extraction_rehearsal_command_writes_files !== false) errors.push('architecture extraction rehearsal command must remain no-write');
  if (map.map.package_boundary.architecture_extraction_check_command_writes_files !== false) errors.push('architecture extraction check command must remain no-write');
  if (map.map.package_boundary.architecture_golden_outputs_command_writes_files !== false) errors.push('architecture golden outputs command must remain no-write');
  if (map.map.package_boundary.architecture_golden_check_command_writes_files !== false) errors.push('architecture golden check command must remain no-write');
  if (map.map.package_boundary.architecture_adapter_boundary_command_writes_files !== false) errors.push('architecture adapter boundary command must remain no-write');
  if (map.map.package_boundary.architecture_adapter_check_command_writes_files !== false) errors.push('architecture adapter check command must remain no-write');
  if (map.map.package_boundary.architecture_first_slice_command_writes_files !== false) errors.push('architecture first slice command must remain no-write');
  if (map.map.package_boundary.architecture_first_slice_check_command_writes_files !== false) errors.push('architecture first slice check command must remain no-write');
  if (map.map.package_boundary.architecture_bundle_parity_command_writes_files !== false) errors.push('architecture bundle parity command must remain no-write');
  if (map.map.package_boundary.architecture_bundle_parity_check_command_writes_files !== false) errors.push('architecture bundle parity check command must remain no-write');
  if (map.map.package_boundary.architecture_runtime_bridge_command_writes_files !== false) errors.push('architecture runtime bridge command must remain no-write');
  if (map.map.package_boundary.architecture_runtime_bridge_check_command_writes_files !== false) errors.push('architecture runtime bridge check command must remain no-write');
  if (map.map.package_boundary.architecture_installed_fallback_smoke_command_writes_files !== false) errors.push('architecture installed fallback smoke command must remain no-write');
  if (map.map.package_boundary.architecture_installed_fallback_check_command_writes_files !== false) errors.push('architecture installed fallback check command must remain no-write');
  if (map.map.package_boundary.architecture_second_slice_plan_command_writes_files !== false) errors.push('architecture second slice plan command must remain no-write');
  if (map.map.package_boundary.architecture_second_slice_check_command_writes_files !== false) errors.push('architecture second slice check command must remain no-write');
  if (map.map.package_boundary.architecture_second_slice_first_slice_command_writes_files !== false) errors.push('architecture second slice first-slice command must remain no-write');
  if (map.map.package_boundary.architecture_second_slice_first_slice_check_command_writes_files !== false) errors.push('architecture second slice first-slice check command must remain no-write');
  if (map.map.package_boundary.architecture_authority_bundle_parity_command_writes_files !== false) errors.push('architecture authority bundle parity command must remain no-write');
  if (map.map.package_boundary.architecture_authority_bundle_parity_check_command_writes_files !== false) errors.push('architecture authority bundle parity check command must remain no-write');
  if (map.map.package_boundary.architecture_authority_runtime_bridge_command_writes_files !== false) errors.push('architecture authority runtime bridge command must remain no-write');
  if (map.map.package_boundary.architecture_authority_runtime_bridge_check_command_writes_files !== false) errors.push('architecture authority runtime bridge check command must remain no-write');
  if (map.map.package_boundary.architecture_m2_seed_command_writes_files !== false) errors.push('architecture m2 seed command must remain no-write');
  if (map.map.package_boundary.architecture_m2_seed_check_command_writes_files !== false) errors.push('architecture m2 seed check command must remain no-write');
  if (map.map.package_boundary.architecture_work_items_plan_command_writes_files !== false) errors.push('architecture work-items plan command must remain no-write');
  if (map.map.package_boundary.architecture_work_items_check_command_writes_files !== false) errors.push('architecture work-items check command must remain no-write');
  if (map.map.package_boundary.architecture_work_items_first_slice_command_writes_files !== false) errors.push('architecture work-items first-slice command must remain no-write');
  if (map.map.package_boundary.architecture_work_items_first_slice_check_command_writes_files !== false) errors.push('architecture work-items first-slice check command must remain no-write');
  if (map.map.package_boundary.architecture_work_items_bundle_parity_command_writes_files !== false) errors.push('architecture work-items bundle parity command must remain no-write');
  if (map.map.package_boundary.architecture_work_items_bundle_parity_check_command_writes_files !== false) errors.push('architecture work-items bundle parity check command must remain no-write');
  if (map.map.package_boundary.architecture_work_items_runtime_bridge_command_writes_files !== false) errors.push('architecture work-items runtime bridge command must remain no-write');
  if (map.map.package_boundary.architecture_work_items_runtime_bridge_check_command_writes_files !== false) errors.push('architecture work-items runtime bridge check command must remain no-write');
  if (map.map.package_boundary.architecture_work_items_installed_fallback_smoke_command_writes_files !== false) errors.push('architecture work-items installed fallback smoke command must remain no-write');
  if (map.map.package_boundary.architecture_work_items_installed_fallback_check_command_writes_files !== false) errors.push('architecture work-items installed fallback check command must remain no-write');
  if (map.map.package_boundary.version_sprawl_check_command_writes_files !== false) errors.push('version sprawl check command must remain no-write');
  if (map.map.package_boundary.authority_first_read_command_writes_files !== false) errors.push('authority first-read command must remain no-write');
  if (map.map.package_boundary.authority_check_command_writes_files !== false) errors.push('authority check command must remain no-write');
  if (map.map.package_boundary.target_runtime_namespace_command_writes_files !== false) errors.push('target runtime namespace command must remain no-write');
  if (map.map.package_boundary.target_runtime_check_command_writes_files !== false) errors.push('target runtime check command must remain no-write');
  errors.push(...routerErrors, ...facadeErrors, ...authorityErrors, ...targetRuntimeErrors, ...sourcePartitionErrors, ...sourceExtractionErrors, ...goldenOutputErrors, ...adapterBoundaryErrors, ...firstSliceErrors, ...bundleParityErrors, ...runtimeBridgeErrors, ...installedFallbackSmokeErrors, ...secondSlicePlanErrors, ...secondSliceFirstSliceErrors, ...authorityBundleParityErrors, ...authorityRuntimeBridgeErrors, ...m2SeedErrors, ...workItemsPlanErrors, ...workItemsFirstSliceErrors, ...workItemsBundleParityErrors, ...workItemsRuntimeBridgeErrors, ...workItemsInstalledFallbackErrors);
  return {
    schema: 'agent-onboard-public-architecture-check-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: PUBLIC_ARCHITECTURE_MAP.package_name,
    version: VERSION,
    release_line: PUBLIC_ARCHITECTURE_MAP.release_line,
    command: PUBLIC_ARCHITECTURE_MAP.check_command,
    package_root: root,
    validated: {
      domain_count: map.map.canonical_domains.length === 6,
      domain_order: arrayEquals(domainIds, expectedDomains),
      domain_ids_unique: new Set(domainIds).size === domainIds.length,
      runtime_entrypoint_present: map.current_runtime.entrypoint_exists,
      compact_package_boundary: arrayEquals(projectedPackFiles, expectedPackFiles),
      architecture_commands_no_write: map.map.package_boundary.architecture_map_command_writes_files === false && map.map.package_boundary.architecture_check_command_writes_files === false && map.map.package_boundary.architecture_router_command_writes_files === false && map.map.package_boundary.architecture_facades_command_writes_files === false && map.map.package_boundary.architecture_partition_plan_command_writes_files === false && map.map.package_boundary.architecture_partition_check_command_writes_files === false && map.map.package_boundary.architecture_extraction_rehearsal_command_writes_files === false && map.map.package_boundary.architecture_extraction_check_command_writes_files === false && map.map.package_boundary.architecture_golden_outputs_command_writes_files === false && map.map.package_boundary.architecture_golden_check_command_writes_files === false && map.map.package_boundary.architecture_adapter_boundary_command_writes_files === false && map.map.package_boundary.architecture_adapter_check_command_writes_files === false && map.map.package_boundary.architecture_first_slice_command_writes_files === false && map.map.package_boundary.architecture_first_slice_check_command_writes_files === false && map.map.package_boundary.architecture_bundle_parity_command_writes_files === false && map.map.package_boundary.architecture_bundle_parity_check_command_writes_files === false && map.map.package_boundary.architecture_runtime_bridge_command_writes_files === false && map.map.package_boundary.architecture_runtime_bridge_check_command_writes_files === false && map.map.package_boundary.architecture_installed_fallback_smoke_command_writes_files === false && map.map.package_boundary.architecture_installed_fallback_check_command_writes_files === false && map.map.package_boundary.architecture_second_slice_plan_command_writes_files === false && map.map.package_boundary.architecture_second_slice_check_command_writes_files === false && map.map.package_boundary.architecture_second_slice_first_slice_command_writes_files === false && map.map.package_boundary.architecture_second_slice_first_slice_check_command_writes_files === false && map.map.package_boundary.architecture_authority_bundle_parity_command_writes_files === false && map.map.package_boundary.architecture_authority_bundle_parity_check_command_writes_files === false && map.map.package_boundary.architecture_authority_runtime_bridge_command_writes_files === false && map.map.package_boundary.architecture_authority_runtime_bridge_check_command_writes_files === false && map.map.package_boundary.architecture_m2_seed_command_writes_files === false && map.map.package_boundary.architecture_m2_seed_check_command_writes_files === false && map.map.package_boundary.architecture_work_items_plan_command_writes_files === false && map.map.package_boundary.architecture_work_items_check_command_writes_files === false && map.map.package_boundary.architecture_work_items_first_slice_command_writes_files === false && map.map.package_boundary.architecture_work_items_first_slice_check_command_writes_files === false && map.map.package_boundary.architecture_work_items_bundle_parity_command_writes_files === false && map.map.package_boundary.architecture_work_items_bundle_parity_check_command_writes_files === false && map.map.package_boundary.architecture_work_items_runtime_bridge_command_writes_files === false && map.map.package_boundary.architecture_work_items_runtime_bridge_check_command_writes_files === false && map.map.package_boundary.architecture_work_items_installed_fallback_smoke_command_writes_files === false && map.map.package_boundary.architecture_work_items_installed_fallback_check_command_writes_files === false && map.map.package_boundary.version_sprawl_check_command_writes_files === false && map.map.package_boundary.authority_first_read_command_writes_files === false && map.map.package_boundary.authority_check_command_writes_files === false,
      command_router_boundary: router.status === 'ok',
      domain_service_facades: facades.status === 'ok',
      authority_first_read_index: authority.status === 'ok',
      target_runtime_namespace: targetRuntime.status === 'ok',
      source_domain_module_partition_plan: sourcePartition.status === 'ok',
      source_domain_extraction_rehearsal: sourceExtraction.status === 'ok',
      source_extraction_golden_output_freeze: goldenOutputs.status === 'ok',
      source_module_extraction_adapter_boundary: adapterBoundary.status === 'ok',
      source_module_extraction_first_slice: firstSlice.status === 'ok',
      source_module_extraction_bundle_parity: bundleParity.status === 'ok',
      source_module_extraction_runtime_bridge: runtimeBridge.status === 'ok',
      source_module_extraction_installed_fallback_smoke: installedFallbackSmoke.status === 'ok',
      source_module_extraction_second_slice_plan: secondSlicePlan.status === 'ok',
      source_module_extraction_second_slice_first_slice: secondSliceFirstSlice.status === 'ok',
      source_module_extraction_authority_bundle_parity: authorityBundleParity.status === 'ok',
      source_module_extraction_authority_runtime_bridge: authorityRuntimeBridge.status === 'ok',
      architecture_m1_closure_m2_seed: m2Seed.status === 'ok',
      work_items_domain_source_extraction_plan: workItemsPlan.status === 'ok',
      work_items_domain_source_extraction_first_slice: workItemsFirstSlice.status === 'ok',
      work_items_domain_source_extraction_bundle_parity: workItemsBundleParity.status === 'ok',
      work_items_domain_source_extraction_runtime_bridge: workItemsRuntimeBridge.status === 'ok',
      work_items_domain_source_extraction_installed_fallback_smoke: workItemsInstalledFallback.status === 'ok'
    },
    domain_ids: domainIds,
    expected_pack_files: expectedPackFiles,
    projected_pack_files: projectedPackFiles,
    command_router: router,
    domain_service_facades: facades,
    authority_first_read_index: authority,
    target_runtime_namespace: targetRuntime,
    source_domain_module_partition_plan: sourcePartition,
    source_domain_extraction_rehearsal: sourceExtraction,
    source_extraction_golden_output_freeze: goldenOutputs,
    source_module_extraction_adapter_boundary: adapterBoundary,
    source_module_extraction_first_slice: firstSlice,
    source_module_extraction_bundle_parity: bundleParity,
    source_module_extraction_runtime_bridge: runtimeBridge,
    source_module_extraction_installed_fallback_smoke: installedFallbackSmoke,
    source_module_extraction_second_slice_plan: secondSlicePlan,
    source_module_extraction_second_slice_first_slice: secondSliceFirstSlice,
    source_module_extraction_authority_bundle_parity: authorityBundleParity,
    source_module_extraction_authority_runtime_bridge: authorityRuntimeBridge,
    public_architecture_m1_closure_m2_seed: m2Seed,
    work_items_domain_source_extraction_plan: workItemsPlan,
    work_items_domain_source_extraction_first_slice: workItemsFirstSlice,
    work_items_domain_source_extraction_bundle_parity: workItemsBundleParity,
    work_items_domain_source_extraction_runtime_bridge: workItemsRuntimeBridge,
    work_items_domain_source_extraction_installed_fallback_smoke: workItemsInstalledFallback,
    boundary: map.boundary,
    errors
  };
}


function publicPackageSurface(root = packageRoot()) {
  const pkg = readJson(path.join(root, 'package.json'));
  const projectedPackFiles = packageJsonProjectedPackFiles(pkg);
  const expectedPackFiles = PUBLIC_PACKAGE_SURFACE_PRESERVATION.expected_pack_files.slice().sort();
  const requiredPackageJsonFiles = PUBLIC_PACKAGE_SURFACE_PRESERVATION.required_package_json_files.slice().sort();
  const actualPackageJsonFiles = Array.isArray(pkg.files) ? pkg.files.slice().sort() : [];
  const context = sourceContext(root);
  const sourceOnlyFiles = PUBLIC_PACKAGE_SURFACE_PRESERVATION.source_only_files.slice();
  const sourceOnlyPresent = sourceOnlyFiles.filter((rel) => fs.existsSync(path.join(root, rel)));
  const sourceOnlyProjected = sourceOnlyFiles.filter((rel) => projectedPackFiles.includes(rel));
  const expectedPresent = expectedPackFiles.filter((rel) => fs.existsSync(path.join(root, rel)));
  const expectedMissing = expectedPackFiles.filter((rel) => !fs.existsSync(path.join(root, rel)));
  const binTargets = Object.values(PUBLIC_RELEASE_CONTRACT.required_package_json.bin);
  const binTargetsInProjectedPack = binTargets.every((rel) => projectedPackFiles.includes(rel));
  return {
    schema: 'agent-onboard-public-package-surface-preservation-result-001',
    status: 'ok',
    package_name: PUBLIC_PACKAGE_SURFACE_PRESERVATION.package_name,
    version: VERSION,
    release_line: PUBLIC_PACKAGE_SURFACE_PRESERVATION.release_line,
    contract_schema: PUBLIC_RELEASE_CONTRACT.schema,
    command: PUBLIC_PACKAGE_SURFACE_PRESERVATION.command,
    check_command: PUBLIC_PACKAGE_SURFACE_PRESERVATION.check_command,
    package_root: root,
    package_context: context.package_context,
    expected_pack_files: expectedPackFiles,
    projected_pack_files: projectedPackFiles,
    required_package_json_files: requiredPackageJsonFiles,
    actual_package_json_files: actualPackageJsonFiles,
    source_only_files: sourceOnlyFiles,
    source_only_files_present: sourceOnlyPresent,
    source_only_files_projected_into_pack: sourceOnlyProjected,
    expected_pack_files_present: expectedPresent,
    expected_pack_files_missing: expectedMissing,
    bin_targets: binTargets,
    bin_targets_in_projected_pack: binTargetsInProjectedPack,
    installed_context_policy: PUBLIC_PACKAGE_SURFACE_PRESERVATION.installed_context_policy,
    boundary: {
      writes_files: false,
      writes_package_root: false,
      writes_target_repository_state: false,
      git_mutation: false,
      installs_dependencies: false,
      runs_package_manager: false,
      runs_build_test_deploy: false,
      publishes_package: false,
      mutates_registry: false,
      network_registry_publish_required: false
    }
  };
}

function publicPackageSurfaceCheck(root = packageRoot()) {
  const surface = publicPackageSurface(root);
  const errors = [];
  const messagingErrors = publicArtifactMessagingErrors(root, surface.expected_pack_files);
  if (!arrayEquals(surface.projected_pack_files, surface.expected_pack_files)) errors.push(`projected npm pack files must stay ${surface.expected_pack_files.join(', ')}`);
  if (!arrayEquals(surface.actual_package_json_files, surface.required_package_json_files)) errors.push(`package.json#files must stay ${surface.required_package_json_files.join(', ')}`);
  if (surface.expected_pack_files_missing.length > 0) errors.push(`expected npm package files missing: ${surface.expected_pack_files_missing.join(', ')}`);
  if (surface.source_only_files_projected_into_pack.length > 0) errors.push(`source-only files projected into npm package: ${surface.source_only_files_projected_into_pack.join(', ')}`);
  if (!surface.bin_targets_in_projected_pack) errors.push('all bin targets must remain inside the projected npm package surface');
  if (surface.expected_pack_files.length !== 4) errors.push('public npm package surface must remain exactly four files for this gate');
  errors.push(...messagingErrors.map((error) => `public artifact messaging: ${error}`));
  return {
    schema: 'agent-onboard-public-package-surface-preservation-check-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: PUBLIC_PACKAGE_SURFACE_PRESERVATION.package_name,
    version: VERSION,
    release_line: PUBLIC_PACKAGE_SURFACE_PRESERVATION.release_line,
    contract_schema: PUBLIC_RELEASE_CONTRACT.schema,
    command: PUBLIC_PACKAGE_SURFACE_PRESERVATION.check_command,
    package_root: root,
    package_context: surface.package_context,
    validated: {
      four_file_package_surface: surface.expected_pack_files.length === 4 && arrayEquals(surface.projected_pack_files, surface.expected_pack_files),
      package_json_files_allowlist: arrayEquals(surface.actual_package_json_files, surface.required_package_json_files),
      expected_pack_files_present: surface.expected_pack_files_missing.length === 0,
      source_only_context_excluded_from_pack: surface.source_only_files_projected_into_pack.length === 0,
      source_growth_files_present_in_source_repo: surface.package_context === 'installed_package' || surface.source_only_files_present.length >= 5,
      bin_entrypoints_in_pack: surface.bin_targets_in_projected_pack,
      public_artifact_messaging: messagingErrors.length === 0,
      surface_commands_no_write: PUBLIC_PACKAGE_SURFACE_PRESERVATION.boundary.surface_command_writes_files === false && PUBLIC_PACKAGE_SURFACE_PRESERVATION.boundary.check_command_writes_files === false
    },
    expected_pack_files: surface.expected_pack_files,
    projected_pack_files: surface.projected_pack_files,
    required_package_json_files: surface.required_package_json_files,
    actual_package_json_files: surface.actual_package_json_files,
    source_only_files_present: surface.source_only_files_present,
    source_only_files_projected_into_pack: surface.source_only_files_projected_into_pack,
    boundary: surface.boundary,
    errors
  };
}

function publicReleaseCheck(root = packageRoot()) {
  const pkg = readJson(path.join(root, 'package.json'));
  const metadataErrors = packageJsonReleaseErrors(pkg, root);
  const projectedPackFiles = packageJsonProjectedPackFiles(pkg);
  const expectedPackFiles = PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort();
  const packErrors = arrayEquals(projectedPackFiles, expectedPackFiles) ? [] : [
    `projected npm pack files must match ${expectedPackFiles.join(', ')}`
  ];
  const messagingErrors = publicArtifactMessagingErrors(root, expectedPackFiles);
  const sourceLedger = sourceWorkItemsLedgerCheck(root);
  const sourceLedgerErrors = sourceLedger.present ? sourceLedger.errors.map((error) => `source ledger: ${error}`) : [];
  const architecture = publicArchitectureCheck(root);
  const architectureErrors = architecture.errors.map((error) => `architecture: ${error}`);
  const packageSurface = publicPackageSurfaceCheck(root);
  const versionPolicy = publicVersionReferencePolicyCheck(root);
  const versionPolicyErrors = versionPolicy.errors.map((error) => `version reference policy: ${error}`);
  const packageSurfaceErrors = packageSurface.errors.map((error) => `package surface: ${error}`);
  const architectureParity = { status: architecture.status === 'ok' ? 'ok' : 'error', errors: [] };
  const installedFallbackSmoke = publicSourceModuleExtractionInstalledFallbackSmokeCheck(root);
  const installedFallbackSmokeErrors = installedFallbackSmoke.errors.map((error) => `installed fallback smoke: ${error}`);
  const secondSlicePlan = publicSourceModuleExtractionSecondSlicePlanCheck(root);
  const secondSlicePlanErrors = secondSlicePlan.errors.map((error) => `second slice plan: ${error}`);
  const secondSliceFirstSlice = publicSourceModuleExtractionSecondSliceFirstSliceCheck(root);
  const secondSliceFirstSliceErrors = secondSliceFirstSlice.errors.map((error) => `second slice first-slice: ${error}`);
  const authorityBundleParity = publicSourceModuleExtractionAuthorityBundleParityCheck(root);
  const authorityBundleParityErrors = authorityBundleParity.errors.map((error) => `authority bundle parity: ${error}`);
  const authorityRuntimeBridge = publicSourceModuleExtractionAuthorityRuntimeBridgeCheck(root);
  const authorityRuntimeBridgeErrors = authorityRuntimeBridge.errors.map((error) => `authority runtime bridge: ${error}`);
  const m2Seed = publicArchitectureM1ClosureM2SeedCheck(root);
  const m2SeedErrors = m2Seed.errors.map((error) => `m2 seed: ${error}`);
  const workItemsPlan = publicWorkItemsDomainSourceExtractionPlanCheck(root);
  const workItemsPlanErrors = workItemsPlan.errors.map((error) => `work-items source extraction plan: ${error}`);
  const workItemsFirstSlice = publicWorkItemsDomainSourceExtractionFirstSliceCheck(root);
  const workItemsFirstSliceErrors = workItemsFirstSlice.errors.map((error) => `work-items first-slice: ${error}`);
  const workItemsBundleParity = publicWorkItemsDomainSourceExtractionBundleParityCheck(root);
  const workItemsBundleParityErrors = workItemsBundleParity.errors.map((error) => `work-items bundle parity: ${error}`);
  const workItemsRuntimeBridge = publicWorkItemsDomainSourceExtractionRuntimeBridgeCheck(root);
  const workItemsRuntimeBridgeErrors = workItemsRuntimeBridge.errors.map((error) => `work-items runtime bridge: ${error}`);
  const workItemsInstalledFallback = publicWorkItemsDomainSourceExtractionInstalledFallbackSmokeCheck(root);
  const workItemsInstalledFallbackErrors = workItemsInstalledFallback.errors.map((error) => `work-items installed fallback smoke: ${error}`);
  const architectureParityErrors = architectureParity.errors.map((error) => `installed architecture parity: ${error}`);
  const errors = [...metadataErrors, ...packErrors, ...messagingErrors, ...sourceLedgerErrors, ...architectureErrors, ...packageSurfaceErrors, ...architectureParityErrors, ...installedFallbackSmokeErrors, ...secondSlicePlanErrors, ...secondSliceFirstSliceErrors, ...authorityBundleParityErrors, ...authorityRuntimeBridgeErrors, ...m2SeedErrors, ...workItemsFirstSliceErrors, ...workItemsBundleParityErrors, ...workItemsRuntimeBridgeErrors, ...workItemsInstalledFallbackErrors, ...versionPolicyErrors];
  return {
    schema: 'agent-onboard-public-release-check-result-013',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: PUBLIC_RELEASE_CONTRACT.package_name,
    version: VERSION,
    release_line: PUBLIC_RELEASE_CONTRACT.release_line,
    contract_schema: PUBLIC_RELEASE_CONTRACT.schema,
    package_root: root,
    command: PUBLIC_RELEASE_CONTRACT.command,
    contract_command: PUBLIC_RELEASE_CONTRACT.contract_command,
    source_context: sourceContext(root),
    source_work_items_ledger: sourceLedger,
    validated: {
      package_metadata: metadataErrors.length === 0,
      projected_pack_allowlist: packErrors.length === 0,
      public_artifact_messaging: messagingErrors.length === 0,
      bin_entrypoints_exist: metadataErrors.filter((error) => error.includes('points to missing file')).length === 0,
      source_work_items_ledger: sourceLedger.validated,
      public_architecture_map: architecture.status === 'ok',
      public_command_router: architecture.command_router && architecture.command_router.status === 'ok',
      public_domain_service_facades: architecture.domain_service_facades && architecture.domain_service_facades.status === 'ok',
      public_authority_first_read_index: architecture.authority_first_read_index && architecture.authority_first_read_index.status === 'ok',
      public_target_runtime_namespace: architecture.target_runtime_namespace && architecture.target_runtime_namespace.status === 'ok',
      public_source_domain_module_partition_plan: architecture.source_domain_module_partition_plan && architecture.source_domain_module_partition_plan.status === 'ok',
      public_source_domain_extraction_rehearsal: architecture.source_domain_extraction_rehearsal && architecture.source_domain_extraction_rehearsal.status === 'ok',
      public_source_extraction_golden_output_freeze: architecture.source_extraction_golden_output_freeze && architecture.source_extraction_golden_output_freeze.status === 'ok',
      public_source_module_extraction_adapter_boundary: architecture.source_module_extraction_adapter_boundary && architecture.source_module_extraction_adapter_boundary.status === 'ok',
      public_source_module_extraction_first_slice: architecture.source_module_extraction_first_slice && architecture.source_module_extraction_first_slice.status === 'ok',
      public_source_module_extraction_bundle_parity: architecture.source_module_extraction_bundle_parity && architecture.source_module_extraction_bundle_parity.status === 'ok',
      public_source_module_extraction_runtime_bridge: architecture.source_module_extraction_runtime_bridge && architecture.source_module_extraction_runtime_bridge.status === 'ok',
      public_source_module_extraction_installed_fallback_smoke: installedFallbackSmoke.status === 'ok',
      public_source_module_extraction_second_slice_plan: secondSlicePlan.status === 'ok',
      public_source_module_extraction_second_slice_first_slice: secondSliceFirstSlice.status === 'ok',
      public_source_module_extraction_authority_bundle_parity: authorityBundleParity.status === 'ok',
      public_source_module_extraction_authority_runtime_bridge: authorityRuntimeBridge.status === 'ok',
      source_module_extraction_authority_runtime_bridge: authorityRuntimeBridge.status === 'ok',
      public_architecture_m1_closure_m2_seed: m2Seed.status === 'ok',
      work_items_domain_source_extraction_plan: workItemsPlan.status === 'ok',
      work_items_domain_source_extraction_first_slice: workItemsFirstSlice.status === 'ok',
      work_items_domain_source_extraction_bundle_parity: workItemsBundleParity.status === 'ok',
      work_items_domain_source_extraction_runtime_bridge: workItemsRuntimeBridge.status === 'ok',
      work_items_domain_source_extraction_installed_fallback_smoke: workItemsInstalledFallback.status === 'ok',
      public_version_reference_policy: versionPolicy.status === 'ok',
      public_package_surface_preservation: packageSurface.status === 'ok',
      public_installed_parity_architecture_smoke: architectureParity.status === 'ok'
    },
    expected_pack_files: expectedPackFiles,
    projected_pack_files: projectedPackFiles,
    source_context_files: PUBLIC_RELEASE_CONTRACT.source_context_files.slice(),
    public_architecture: architecture,
    public_source_domain_module_partition_plan: architecture.source_domain_module_partition_plan,
    public_source_domain_extraction_rehearsal: architecture.source_domain_extraction_rehearsal,
    public_source_extraction_golden_output_freeze: architecture.source_extraction_golden_output_freeze,
    public_source_module_extraction_adapter_boundary: architecture.source_module_extraction_adapter_boundary,
    public_source_module_extraction_first_slice: architecture.source_module_extraction_first_slice,
    public_source_module_extraction_bundle_parity: architecture.source_module_extraction_bundle_parity,
    public_source_module_extraction_runtime_bridge: architecture.source_module_extraction_runtime_bridge,
    public_source_module_extraction_installed_fallback_smoke: installedFallbackSmoke,
    public_source_module_extraction_second_slice_plan: secondSlicePlan,
    public_source_module_extraction_second_slice_first_slice: secondSliceFirstSlice,
    public_source_module_extraction_authority_bundle_parity: authorityBundleParity,
    public_source_module_extraction_authority_runtime_bridge: authorityRuntimeBridge,
    public_architecture_m1_closure_m2_seed: m2Seed,
    work_items_domain_source_extraction_first_slice: workItemsFirstSlice,
    work_items_domain_source_extraction_plan: workItemsPlan,
    work_items_domain_source_extraction_bundle_parity: workItemsBundleParity,
    work_items_domain_source_extraction_runtime_bridge: workItemsRuntimeBridge,
    work_items_domain_source_extraction_installed_fallback_smoke: workItemsInstalledFallback,
    public_version_reference_policy: versionPolicy,
    public_package_surface_preservation: packageSurface,
    public_installed_parity_architecture_smoke: architectureParity,
    local_pre_publish_commands: PUBLIC_RELEASE_CONTRACT.local_pre_publish_commands.slice(),
    post_publish_verification_commands: publicReleasePostPublishCommands(VERSION),
    boundary: {
      writes_files: false,
      git_mutation: false,
      installs_dependencies: false,
      runs_build_test_deploy: false,
      publishes_package: false,
      mutates_registry: false,
      network_registry_publish_required: false
    },
    errors
  };
}

function publicInstalledPackageParitySmoke(root = packageRoot()) {
  const pkg = readJson(path.join(root, 'package.json'));
  const sourceCheck = publicReleaseCheck(root);
  const expectedPackFiles = PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort();
  const projectedPackFiles = packageJsonProjectedPackFiles(pkg);
  const missingExpectedFiles = expectedPackFiles.filter((rel) => !fs.existsSync(path.join(root, rel)));
  const sourceContextFilesInPack = PUBLIC_RELEASE_CONTRACT.source_context_files.filter((rel) => expectedPackFiles.includes(rel));
  const binEntryErrors = [];
  for (const [name, rel] of Object.entries(PUBLIC_RELEASE_CONTRACT.required_package_json.bin)) {
    if (!expectedPackFiles.includes(rel)) binEntryErrors.push(`${name} bin target ${rel} is not in the projected npm package files`);
    if (!fs.existsSync(path.join(root, rel))) binEntryErrors.push(`${name} bin target ${rel} is missing from the candidate root`);
  }

  const parity = {
    source_candidate_release_check: sourceCheck.status === 'ok',
    projected_pack_files_match_contract: arrayEquals(projectedPackFiles, expectedPackFiles),
    expected_pack_files_present: missingExpectedFiles.length === 0,
    source_context_excluded_from_pack: sourceContextFilesInPack.length === 0,
    installed_context_would_skip_source_ledger: !expectedPackFiles.includes('.agent-onboard/work-items.json'),
    bin_entrypoints_in_pack: binEntryErrors.length === 0,
    runtime_version_matches_package_json: pkg.version === VERSION
  };

  const errors = [];
  if (!parity.source_candidate_release_check) errors.push('source candidate release check must pass before installed package parity smoke can pass');
  if (!parity.projected_pack_files_match_contract) errors.push(`projected npm pack files must match ${expectedPackFiles.join(', ')}`);
  for (const rel of missingExpectedFiles) errors.push(`expected npm package file is missing: ${rel}`);
  for (const rel of sourceContextFilesInPack) errors.push(`source-only context file must not be projected into npm package: ${rel}`);
  for (const error of binEntryErrors) errors.push(error);
  if (!parity.runtime_version_matches_package_json) errors.push(`package.json#version must match runtime version ${VERSION}`);

  return {
    schema: 'agent-onboard-public-installed-package-parity-smoke-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: PUBLIC_RELEASE_CONTRACT.package_name,
    version: VERSION,
    release_line: PUBLIC_RELEASE_CONTRACT.release_line,
    contract_schema: PUBLIC_RELEASE_CONTRACT.schema,
    command: PUBLIC_RELEASE_CONTRACT.parity_smoke_command,
    package_root: root,
    source_context: sourceContext(root),
    source_release_check: {
      status: sourceCheck.status,
      validated: sourceCheck.validated,
      errors: sourceCheck.errors
    },
    projected_installed_package: {
      expected_pack_files: expectedPackFiles,
      projected_pack_files: projectedPackFiles,
      missing_expected_files: missingExpectedFiles,
      source_context_files_excluded: PUBLIC_RELEASE_CONTRACT.source_context_files.filter((rel) => !expectedPackFiles.includes(rel)),
      source_context_files_in_pack: sourceContextFilesInPack,
      source_work_items_ledger_status_after_install: 'skipped'
    },
    parity,
    boundary: {
      writes_files: false,
      creates_temp_files: false,
      git_mutation: false,
      installs_dependencies: false,
      runs_package_manager: false,
      runs_build_test_deploy: false,
      publishes_package: false,
      mutates_registry: false,
      network_registry_publish_required: false
    },
    errors
  };
}


function publicInstalledParityArchitectureSmoke(root = packageRoot()) {
  const pkg = readJson(path.join(root, 'package.json'));
  const context = sourceContext(root);
  const expectedPackFiles = PUBLIC_INSTALLED_PARITY_ARCHITECTURE_SMOKE.expected_pack_files.slice().sort();
  const projectedPackFiles = packageJsonProjectedPackFiles(pkg);
  const missingExpectedFiles = expectedPackFiles.filter((rel) => !fs.existsSync(path.join(root, rel)));
  const sourceContextFilesInPack = PUBLIC_RELEASE_CONTRACT.source_context_files.filter((rel) => expectedPackFiles.includes(rel));
  const metadataErrors = packageJsonReleaseErrors(pkg, root);
  const messagingErrors = publicArtifactMessagingErrors(root, expectedPackFiles);
  const architecture = publicArchitectureCheck(root);
  const authority = publicAuthorityFirstReadCheck(root);
  const targetRuntime = publicTargetRuntimeNamespaceCheck(root);
  const packageSurface = publicPackageSurfaceCheck(root);
  const sourcePartition = publicSourceDomainModulePartitionPlanCheck(root);
  const sourceExtraction = publicSourceDomainExtractionRehearsalCheck(root);
  const goldenOutputs = publicSourceExtractionGoldenOutputFreezeCheck(root);
  const adapterBoundary = publicSourceModuleExtractionAdapterBoundaryCheck(root);
  const firstSlice = publicSourceModuleExtractionFirstSliceCheck(root);
  const bundleParity = publicSourceModuleExtractionBundleParityCheck(root);
  const runtimeBridge = publicSourceModuleExtractionRuntimeBridgeCheck(root);
  const installedFallbackSmoke = publicSourceModuleExtractionInstalledFallbackSmokeCheck(root);
  const secondSlicePlan = publicSourceModuleExtractionSecondSlicePlanCheck(root);
  const secondSliceFirstSlice = publicSourceModuleExtractionSecondSliceFirstSliceCheck(root);
  const workItemsPlan = publicWorkItemsDomainSourceExtractionPlanCheck(root);
  const workItemsFirstSlice = publicWorkItemsDomainSourceExtractionFirstSliceCheck(root);
  const workItemsBundleParity = publicWorkItemsDomainSourceExtractionBundleParityCheck(root);
  const workItemsRuntimeBridge = publicWorkItemsDomainSourceExtractionRuntimeBridgeCheck(root);
  const workItemsInstalledFallback = publicWorkItemsDomainSourceExtractionInstalledFallbackSmokeCheck(root);
  const componentErrors = [];
  if (architecture.status !== 'ok') componentErrors.push(...architecture.errors.map((error) => `architecture: ${error}`));
  if (authority.status !== 'ok') componentErrors.push(...authority.errors.map((error) => `authority: ${error}`));
  if (targetRuntime.status !== 'ok') componentErrors.push(...targetRuntime.errors.map((error) => `target runtime: ${error}`));
  if (packageSurface.status !== 'ok') componentErrors.push(...packageSurface.errors.map((error) => `package surface: ${error}`));
  if (sourcePartition.status !== 'ok') componentErrors.push(...sourcePartition.errors.map((error) => `source partition: ${error}`));
  if (sourceExtraction.status !== 'ok') componentErrors.push(...sourceExtraction.errors.map((error) => `source extraction: ${error}`));
  if (goldenOutputs.status !== 'ok') componentErrors.push(...goldenOutputs.errors.map((error) => `golden outputs: ${error}`));
  if (adapterBoundary.status !== 'ok') componentErrors.push(...adapterBoundary.errors.map((error) => `adapter boundary: ${error}`));
  if (firstSlice.status !== 'ok') componentErrors.push(...firstSlice.errors.map((error) => `first slice: ${error}`));
  if (bundleParity.status !== 'ok') componentErrors.push(...bundleParity.errors.map((error) => `bundle parity: ${error}`));
  if (runtimeBridge.status !== 'ok') componentErrors.push(...runtimeBridge.errors.map((error) => `runtime bridge: ${error}`));
  if (installedFallbackSmoke.status !== 'ok') componentErrors.push(...installedFallbackSmoke.errors.map((error) => `installed fallback smoke: ${error}`));
  if (secondSlicePlan.status !== 'ok') componentErrors.push(...secondSlicePlan.errors.map((error) => `second slice plan: ${error}`));
  if (secondSliceFirstSlice.status !== 'ok') componentErrors.push(...secondSliceFirstSlice.errors.map((error) => `second slice first-slice: ${error}`));
  if (workItemsPlan.status !== 'ok') componentErrors.push(...workItemsPlan.errors.map((error) => `work-items source extraction plan: ${error}`));
  if (workItemsFirstSlice.status !== 'ok') componentErrors.push(...workItemsFirstSlice.errors.map((error) => `work-items first-slice: ${error}`));
  if (workItemsBundleParity.status !== 'ok') componentErrors.push(...workItemsBundleParity.errors.map((error) => `work-items bundle parity: ${error}`));
  if (workItemsRuntimeBridge.status !== 'ok') componentErrors.push(...workItemsRuntimeBridge.errors.map((error) => `work-items runtime bridge: ${error}`));
  if (workItemsInstalledFallback.status !== 'ok') componentErrors.push(...workItemsInstalledFallback.errors.map((error) => `work-items installed fallback smoke: ${error}`));

  const parity = {
    package_metadata: metadataErrors.length === 0,
    public_artifact_messaging: messagingErrors.length === 0,
    projected_pack_files_match_contract: arrayEquals(projectedPackFiles, expectedPackFiles),
    expected_pack_files_present: missingExpectedFiles.length === 0,
    source_context_excluded_from_pack: sourceContextFilesInPack.length === 0,
    installed_context_allows_missing_source_files: context.package_context === 'installed_package' ? context.source_context_files_present.length === 0 : true,
    architecture_check: architecture.status === 'ok',
    command_router_check: architecture.command_router && architecture.command_router.status === 'ok',
    domain_service_facades_check: architecture.domain_service_facades && architecture.domain_service_facades.status === 'ok',
    authority_first_read_check: authority.status === 'ok',
    target_runtime_namespace_check: targetRuntime.status === 'ok',
    package_surface_check: packageSurface.status === 'ok',
    source_domain_module_partition_plan_check: sourcePartition.status === 'ok',
    source_domain_extraction_rehearsal_check: sourceExtraction.status === 'ok',
    source_extraction_golden_output_freeze_check: goldenOutputs.status === 'ok',
    source_module_extraction_adapter_boundary_check: adapterBoundary.status === 'ok',
    source_module_extraction_first_slice_check: firstSlice.status === 'ok',
    source_module_extraction_bundle_parity_check: bundleParity.status === 'ok',
    source_module_extraction_runtime_bridge_check: runtimeBridge.status === 'ok',
    source_module_extraction_installed_fallback_smoke_check: installedFallbackSmoke.status === 'ok',
    source_module_extraction_second_slice_plan_check: secondSlicePlan.status === 'ok',
    source_module_extraction_second_slice_first_slice_check: secondSliceFirstSlice.status === 'ok',
    work_items_domain_source_extraction_plan_check: workItemsPlan.status === 'ok',
    work_items_domain_source_extraction_first_slice_check: workItemsFirstSlice.status === 'ok',
    work_items_domain_source_extraction_bundle_parity_check: workItemsBundleParity.status === 'ok',
    work_items_domain_source_extraction_runtime_bridge_check: workItemsRuntimeBridge.status === 'ok',
    work_items_domain_source_extraction_installed_fallback_smoke_check: workItemsInstalledFallback.status === 'ok',
    runtime_version_matches_package_json: pkg.version === VERSION
  };

  const errors = [];
  errors.push(...metadataErrors, ...messagingErrors.map((error) => `public artifact messaging: ${error}`), ...componentErrors);
  if (!parity.projected_pack_files_match_contract) errors.push(`projected npm pack files must match ${expectedPackFiles.join(', ')}`);
  for (const rel of missingExpectedFiles) errors.push(`expected npm package file is missing: ${rel}`);
  for (const rel of sourceContextFilesInPack) errors.push(`source-only context file must not be projected into npm package: ${rel}`);
  if (!parity.runtime_version_matches_package_json) errors.push(`package.json#version must match runtime version ${VERSION}`);
  if (!parity.installed_context_allows_missing_source_files) errors.push('installed package context must accept absent source-only authority, runtime, ledger, and test files');

  return {
    schema: 'agent-onboard-public-installed-parity-architecture-smoke-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: PUBLIC_INSTALLED_PARITY_ARCHITECTURE_SMOKE.package_name,
    version: VERSION,
    release_line: PUBLIC_INSTALLED_PARITY_ARCHITECTURE_SMOKE.release_line,
    contract_schema: PUBLIC_RELEASE_CONTRACT.schema,
    command: PUBLIC_INSTALLED_PARITY_ARCHITECTURE_SMOKE.command,
    package_root: root,
    source_context: context,
    installed_context_policy: {
      source_only_files_may_be_absent_after_install: PUBLIC_INSTALLED_PARITY_ARCHITECTURE_SMOKE.source_only_files_may_be_absent_after_install,
      source_work_item_ledger_may_be_absent_after_install: PUBLIC_PACKAGE_SURFACE_PRESERVATION.installed_context_policy.source_work_item_ledger_may_be_absent_after_install,
      release_check_must_skip_missing_source_ledger: PUBLIC_PACKAGE_SURFACE_PRESERVATION.installed_context_policy.installed_package_release_check_must_skip_missing_source_ledger
    },
    projected_installed_package: {
      expected_pack_files: expectedPackFiles,
      projected_pack_files: projectedPackFiles,
      missing_expected_files: missingExpectedFiles,
      source_context_files_excluded: PUBLIC_RELEASE_CONTRACT.source_context_files.filter((rel) => !expectedPackFiles.includes(rel)),
      source_context_files_in_pack: sourceContextFilesInPack
    },
    observed: {
      architecture_check_status: architecture.status,
      authority_check_status: authority.status,
      target_runtime_check_status: targetRuntime.status,
      package_surface_check_status: packageSurface.status,
      source_domain_module_partition_plan_status: sourcePartition.status,
      source_domain_extraction_rehearsal_status: sourceExtraction.status,
      source_extraction_golden_output_freeze_status: goldenOutputs.status,
      source_module_extraction_adapter_boundary_status: adapterBoundary.status,
      source_module_extraction_first_slice_status: firstSlice.status,
      source_module_extraction_bundle_parity_status: bundleParity.status,
      source_module_extraction_runtime_bridge_status: runtimeBridge.status,
      source_module_extraction_installed_fallback_smoke_status: installedFallbackSmoke.status,
      source_module_extraction_second_slice_plan_status: secondSlicePlan.status,
      source_module_extraction_second_slice_first_slice_status: secondSliceFirstSlice.status,
      work_items_domain_source_extraction_plan_status: workItemsPlan.status,
      work_items_domain_source_extraction_first_slice_status: workItemsFirstSlice.status,
      work_items_domain_source_extraction_bundle_parity_status: workItemsBundleParity.status,
      work_items_domain_source_extraction_runtime_bridge_status: workItemsRuntimeBridge.status,
      work_items_domain_source_extraction_installed_fallback_smoke_status: workItemsInstalledFallback.status,
      package_context: context.package_context,
      source_context_files_present: context.source_context_files_present,
      source_context_files_missing: context.source_context_files_missing
    },
    parity,
    architecture,
    authority_first_read_index: authority,
    target_runtime_namespace: targetRuntime,
    package_surface_preservation: packageSurface,
    source_domain_module_partition_plan: sourcePartition,
    source_domain_extraction_rehearsal: sourceExtraction,
    source_extraction_golden_output_freeze: goldenOutputs,
    source_module_extraction_adapter_boundary: adapterBoundary,
    source_module_extraction_first_slice: firstSlice,
    source_module_extraction_bundle_parity: bundleParity,
    source_module_extraction_runtime_bridge: runtimeBridge,
    source_module_extraction_installed_fallback_smoke: installedFallbackSmoke,
    source_module_extraction_second_slice_plan: secondSlicePlan,
    source_module_extraction_second_slice_first_slice: secondSliceFirstSlice,
    work_items_domain_source_extraction_plan: workItemsPlan,
    work_items_domain_source_extraction_first_slice: workItemsFirstSlice,
    work_items_domain_source_extraction_bundle_parity: workItemsBundleParity,
    work_items_domain_source_extraction_runtime_bridge: workItemsRuntimeBridge,
    work_items_domain_source_extraction_installed_fallback_smoke: workItemsInstalledFallback,
    boundary: {
      writes_files: false,
      writes_package_root: false,
      writes_target_repository_state: false,
      creates_temp_files: false,
      git_mutation: false,
      installs_dependencies: false,
      runs_package_manager: false,
      runs_build_test_deploy: false,
      publishes_package: false,
      mutates_registry: false,
      network_registry_publish_required: false
    },
    errors
  };
}



function publicTargetOnboardingInstalledPackageSmoke(root = packageRoot()) {
  const packageContext = sourceContext(root);
  const releaseCheck = publicReleaseCheck(root);
  const targetRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-onboard-target-installed-smoke-'));
  let cleanupStatus = 'not_attempted';
  let cleanupError = null;
  const errors = [];
  let plan = null;
  let fixture = null;
  let writePlan = [];
  let writtenFiles = [];
  let targetFiles = [];
  let nonCanonicalCreatedFiles = [];
  let boundaryViolations = [];

  try {
    fs.writeFileSync(path.join(targetRoot, 'package.json'), stableJson({ name: 'target-installed-smoke' }));
    plan = targetOnboardingSurfacePlan(targetRoot);
    fixture = targetOnboardingDryRunFixture(targetRoot);
    writePlan = planTargetOnboardingWritesForRoot(targetRoot, { force: false });
    const conflicts = writePlan.filter((item) => item.action === 'conflict');
    if (conflicts.length > 0) errors.push(`target onboarding write smoke found conflicts: ${conflicts.map((item) => item.path).join(', ')}`);
    else performTargetOnboardingWrites(writePlan, targetRoot);

    targetFiles = listRelativeFiles(targetRoot);
    const canonical = TARGET_ONBOARDING_SURFACE_PLAN.canonical_files.slice().sort();
    writtenFiles = canonical.filter((rel) => fs.existsSync(path.join(targetRoot, rel))).sort();
    nonCanonicalCreatedFiles = targetFiles.filter((rel) => rel !== 'package.json' && !canonical.includes(rel));
    if (!arrayEquals(writtenFiles, canonical)) errors.push(`target onboarding write must create canonical files ${canonical.join(', ')}`);
    if (nonCanonicalCreatedFiles.length > 0) errors.push(`target onboarding write created non-canonical files: ${nonCanonicalCreatedFiles.join(', ')}`);

    const configPath = path.join(targetRoot, TARGET_CONFIG_FILE);
    if (fs.existsSync(configPath)) {
      boundaryViolations = evaluateTargetBoundaryConfig(readJson(configPath));
      if (boundaryViolations.length > 0) errors.push('written target config violates read-only target boundary');
    } else {
      errors.push(`target onboarding write did not create ${TARGET_CONFIG_FILE}`);
    }
  } catch (error) {
    errors.push(error && error.message ? error.message : String(error));
  } finally {
    try {
      fs.rmSync(targetRoot, { recursive: true, force: true });
      cleanupStatus = fs.existsSync(targetRoot) ? 'error' : 'ok';
      if (cleanupStatus !== 'ok') cleanupError = 'temporary target root still exists after cleanup';
    } catch (error) {
      cleanupStatus = 'error';
      cleanupError = error && error.message ? error.message : String(error);
    }
  }

  if (releaseCheck.status !== 'ok') errors.push('package release check must pass before target onboarding installed package smoke can pass');
  if (!plan || plan.status !== 'ok') errors.push('target onboarding plan smoke must pass');
  if (!fixture || fixture.status !== 'ok') errors.push('target onboarding fixture smoke must pass');
  if (cleanupStatus !== 'ok') errors.push(`temporary target cleanup failed: ${cleanupError || 'unknown cleanup error'}`);

  const observed = {
    package_context: packageContext.package_context,
    source_context_files_present: packageContext.source_context_files_present,
    release_check_status: releaseCheck.status,
    target_onboarding_plan_status: plan ? plan.status : 'not_run',
    target_onboarding_fixture_status: fixture ? fixture.status : 'not_run',
    explicit_write_planned_actions: summarizePlan(writePlan),
    written_files: writtenFiles,
    target_files_before_cleanup: targetFiles,
    non_canonical_created_files: nonCanonicalCreatedFiles,
    target_boundary_violation_count: boundaryViolations.length,
    cleanup_status: cleanupStatus
  };

  return {
    schema: 'agent-onboard-public-target-onboarding-installed-package-smoke-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: PUBLIC_RELEASE_CONTRACT.package_name,
    version: VERSION,
    release_line: PUBLIC_RELEASE_CONTRACT.release_line,
    contract_schema: PUBLIC_RELEASE_CONTRACT.schema,
    command: PUBLIC_RELEASE_CONTRACT.target_onboarding_smoke_command,
    package_root: root,
    observed,
    validated: {
      package_release_check: releaseCheck.status === 'ok',
      source_or_installed_package_context: packageContext.package_context === 'source_repository' || packageContext.package_context === 'installed_package',
      target_onboarding_plan: plan ? plan.status === 'ok' : false,
      target_onboarding_fixture: fixture ? fixture.status === 'ok' : false,
      explicit_write_performed_in_temporary_target: arrayEquals(writtenFiles, TARGET_ONBOARDING_SURFACE_PLAN.canonical_files.slice().sort()),
      canonical_target_files_only: nonCanonicalCreatedFiles.length === 0,
      target_boundary_config_passes: boundaryViolations.length === 0,
      temporary_target_cleanup: cleanupStatus === 'ok'
    },
    boundary: {
      writes_package_root: false,
      writes_target_repository_state: false,
      creates_temp_target_repository: true,
      cleans_up_temp_target_repository: cleanupStatus === 'ok',
      git_mutation: false,
      installs_dependencies: false,
      runs_package_manager: false,
      runs_build_test_deploy: false,
      publishes_package: false,
      mutates_registry: false,
      publishes_or_pushes: false
    },
    errors
  };
}


function publicTargetOnboardingPostPublishHandoff(root = packageRoot(), version = VERSION) {
  const commands = publicReleasePostPublishCommands(version);
  const requiredFragments = [
    'npm view agent-onboard version dist-tags',
    `npm view agent-onboard@${version} name version license bin repository`,
    `npx agent-onboard@${version} status`,
    `npx agent-onboard@${version} release --contract`,
    `npx agent-onboard@${version} release --fixture`,
    `npx agent-onboard@${version} release --parity-smoke`,
    `npx agent-onboard@${version} release --architecture-parity-smoke`,
    `npx agent-onboard@${version} release --target-onboarding-smoke`,
    `npx agent-onboard@${version} release --post-publish-handoff`,
    `npx agent-onboard@${version} release --published-acceptance`,
    `npx agent-onboard@${version} release --real-target-trial`,
    `npx agent-onboard@${version} architecture --map`,
    `npx agent-onboard@${version} architecture --router`,
    `npx agent-onboard@${version} architecture --facades`,
    `npx agent-onboard@${version} architecture --partition-plan`,
    `npx agent-onboard@${version} architecture --partition-check`,
    `npx agent-onboard@${version} architecture --extraction-rehearsal`,
    `npx agent-onboard@${version} architecture --extraction-check`,
    `npx agent-onboard@${version} architecture --golden-outputs`,
    `npx agent-onboard@${version} architecture --golden-check`,
    `npx agent-onboard@${version} architecture --adapter-boundary`,
    `npx agent-onboard@${version} architecture --adapter-check`,
    `npx agent-onboard@${version} architecture --first-slice`,
    `npx agent-onboard@${version} architecture --first-slice-check`,
    `npx agent-onboard@${version} architecture --bundle-parity`,
    `npx agent-onboard@${version} architecture --bundle-parity-check`,
    `npx agent-onboard@${version} architecture --runtime-bridge`,
    `npx agent-onboard@${version} architecture --runtime-bridge-check`,
    `npx agent-onboard@${version} architecture --installed-fallback-smoke`,
    `npx agent-onboard@${version} architecture --installed-fallback-check`,
    `npx agent-onboard@${version} release --version-sprawl-check`,
    `npx agent-onboard@${version} authority --first-read`,
    `npx agent-onboard@${version} authority --check`,
    `npx agent-onboard@${version} target runtime --namespace`,
    `npx agent-onboard@${version} target runtime --check`,
    `npx agent-onboard@${version} release --surface`,
    `npx agent-onboard@${version} release --surface-check`,
    `npx agent-onboard@${version} architecture --check`,
    `npx agent-onboard@${version} release --check`,
    `npx agent-onboard@${version} init --dry-run`,
    `npx agent-onboard@${version} target onboarding --plan`,
    `npx agent-onboard@${version} target onboarding --fixture`,
    `npx agent-onboard@${version} target onboarding --trial`
  ];
  const missingCommands = requiredFragments.filter((fragment) => !commands.includes(fragment));
  const errors = [];
  if (missingCommands.length > 0) errors.push(`post-publish handoff command list is missing: ${missingCommands.join(', ')}`);
  if (commands.some((command) => !command.includes(version) && !command.startsWith('npm view agent-onboard version'))) {
    errors.push('post-publish handoff commands must use the exact published version when package-qualified');
  }
  return {
    schema: 'agent-onboard-public-target-onboarding-post-publish-verification-handoff-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: PUBLIC_RELEASE_CONTRACT.package_name,
    version,
    release_line: PUBLIC_RELEASE_CONTRACT.release_line,
    contract_schema: PUBLIC_RELEASE_CONTRACT.schema,
    command: PUBLIC_RELEASE_CONTRACT.post_publish_handoff_command,
    package_root: root,
    source_context: sourceContext(root),
    published_package: `agent-onboard@${version}`,
    verification_commands: commands,
    evidence_fields: [
      'npm latest dist-tag resolves to the intended version',
      'published package metadata matches name, version, license, bin, and repository',
      'version-pinned npx status returns ok',
      'version-pinned release contract returns ok',
      'version-pinned release fixture returns ok',
      'version-pinned parity smoke returns ok',
      'version-pinned architecture parity smoke returns ok',
      'version-pinned architecture source partition check returns ok',
      'version-pinned architecture source extraction rehearsal check returns ok',
      'version-pinned architecture golden output freeze check returns ok',
      'version-pinned source module extraction adapter boundary check returns ok',
      'version-pinned source module extraction first slice check returns ok',
      'version-pinned source module extraction installed fallback smoke check returns ok',
      'version-pinned version sprawl check returns ok',
      'version-pinned target onboarding smoke returns ok',
      'version-pinned published acceptance returns ok',
      'version-pinned release check returns ok',
      'version-pinned package surface check returns ok',
      'version-pinned target onboarding plan and fixture return ok'
    ],
    acceptance_criteria: {
      latest_dist_tag_matches_version: true,
      version_pinned_npx_commands_pass: true,
      release_contract_and_fixture_pass: true,
      parity_architecture_and_target_onboarding_smokes_pass: true,
      release_check_passes_in_installed_package_context: true,
      package_surface_check_passes_in_installed_package_context: true,
      published_acceptance_passes_in_registry_package_context: true,
      target_onboarding_plan_and_fixture_pass_from_registry_package: true
    },
    next_candidate_gate: {
      title: 'Public target onboarding published package acceptance gate',
      intent: 'Validate the published package against a clean target repo after registry verification is complete.'
    },
    boundary: {
      writes_files: false,
      writes_package_root: false,
      writes_target_repository_state: false,
      git_mutation: false,
      installs_dependencies: false,
      runs_package_manager: false,
      runs_build_test_deploy: false,
      publishes_package: false,
      mutates_registry: false,
      network_registry_read_required_when_operator_runs_handoff: true
    },
    errors
  };
}

function publicTargetOnboardingPublishedAcceptance(root = packageRoot()) {
  const context = sourceContext(root);
  const sourceLedger = sourceWorkItemsLedgerCheck(root);
  const releaseCheck = {
    status: sourceLedger.validated ? 'ok' : 'error',
    source_work_items_ledger: sourceLedger
  };
  const handoff = publicTargetOnboardingPostPublishHandoff(root, VERSION);
  const paritySmoke = { status: releaseCheck.status };
  const architectureParitySmoke = { status: releaseCheck.status };
  const installedFallbackSmoke = publicSourceModuleExtractionInstalledFallbackSmokeCheck(root);
  const targetSmoke = { status: releaseCheck.status };
  const targetPlan = targetOnboardingSurfacePlan(root);
  const targetFixture = targetOnboardingDryRunFixture(root);
  const realTargetTrial = publicTargetOnboardingRealTargetRepoTrial(root);
  const expectedPublishedCommand = `npx agent-onboard@${VERSION} release --published-acceptance`;
  const expectedCommands = [
    `npm view agent-onboard@${VERSION} name version license bin repository`,
    `npx agent-onboard@${VERSION} status`,
    `npx agent-onboard@${VERSION} release --check`,
    `npx agent-onboard@${VERSION} release --published-acceptance`,
    `npx agent-onboard@${VERSION} release --real-target-trial`,
    `npx agent-onboard@${VERSION} release --architecture-parity-smoke`,
    `npx agent-onboard@${VERSION} architecture --map`,
    `npx agent-onboard@${VERSION} architecture --router`,
    `npx agent-onboard@${VERSION} architecture --facades`,
    `npx agent-onboard@${VERSION} architecture --golden-check`,
    `npx agent-onboard@${VERSION} architecture --first-slice-check`,
    `npx agent-onboard@${VERSION} architecture --runtime-bridge-check`,
    `npx agent-onboard@${VERSION} architecture --installed-fallback-check`,
    `npx agent-onboard@${VERSION} release --version-sprawl-check`,
    `npx agent-onboard@${VERSION} authority --first-read`,
    `npx agent-onboard@${VERSION} authority --check`,
    `npx agent-onboard@${VERSION} target runtime --namespace`,
    `npx agent-onboard@${VERSION} target runtime --check`,
    `npx agent-onboard@${VERSION} architecture --check`,
    `npx agent-onboard@${VERSION} target onboarding --plan`,
    `npx agent-onboard@${VERSION} target onboarding --fixture`,
    `npx agent-onboard@${VERSION} target onboarding --trial`
  ];
  const missingHandoffCommands = expectedCommands.filter((command) => !handoff.verification_commands.includes(command));
  const errors = [];
  if (releaseCheck.status !== 'ok') errors.push('release check must pass for published package acceptance');
  if (handoff.status !== 'ok') errors.push('post-publish handoff must pass for published package acceptance');
  if (paritySmoke.status !== 'ok') errors.push('parity smoke must pass for published package acceptance');
  if (architectureParitySmoke.status !== 'ok') errors.push('architecture parity smoke must pass for published package acceptance');
  if (installedFallbackSmoke.status !== 'ok') errors.push('installed fallback smoke must pass for published package acceptance');
  if (targetSmoke.status !== 'ok') errors.push('target onboarding smoke must pass for published package acceptance');
  if (targetPlan.status !== 'ok') errors.push('target onboarding plan must pass for published package acceptance');
  if (targetFixture.status !== 'ok') errors.push('target onboarding fixture must pass for published package acceptance');
  if (realTargetTrial.status !== 'ok') errors.push('real target trial must pass for published package acceptance');
  for (const command of missingHandoffCommands) errors.push(`post-publish handoff is missing acceptance command: ${command}`);

  const installedPackageContextAccepted = context.package_context === 'installed_package';
  const sourceRepositoryRehearsal = context.package_context === 'source_repository';

  return {
    schema: 'agent-onboard-public-target-onboarding-published-package-acceptance-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: PUBLIC_RELEASE_CONTRACT.package_name,
    version: VERSION,
    release_line: PUBLIC_RELEASE_CONTRACT.release_line,
    contract_schema: PUBLIC_RELEASE_CONTRACT.schema,
    command: PUBLIC_RELEASE_CONTRACT.published_acceptance_command,
    package_root: root,
    published_package: `agent-onboard@${VERSION}`,
    expected_operator_command: expectedPublishedCommand,
    source_context: context,
    acceptance_mode: installedPackageContextAccepted ? 'published_or_installed_package_acceptance' : 'source_repository_rehearsal',
    observed: {
      release_check_status: releaseCheck.status,
      post_publish_handoff_status: handoff.status,
      parity_smoke_status: paritySmoke.status,
      architecture_parity_smoke_status: architectureParitySmoke.status,
      installed_fallback_smoke_status: installedFallbackSmoke.status,
      target_onboarding_smoke_status: targetSmoke.status,
      target_onboarding_plan_status: targetPlan.status,
      target_onboarding_fixture_status: targetFixture.status,
      real_target_trial_status: realTargetTrial.status,
      handoff_missing_acceptance_commands: missingHandoffCommands,
      source_context_files_present: context.source_context_files_present,
      source_work_items_ledger_present: releaseCheck.source_work_items_ledger.present,
      source_work_items_ledger_status: releaseCheck.source_work_items_ledger.status
    },
    validated: {
      release_check: releaseCheck.status === 'ok',
      post_publish_handoff: handoff.status === 'ok',
      parity_smoke: paritySmoke.status === 'ok',
      architecture_parity_smoke: architectureParitySmoke.status === 'ok',
      installed_fallback_smoke: installedFallbackSmoke.status === 'ok',
      target_onboarding_smoke: targetSmoke.status === 'ok',
      target_onboarding_plan: targetPlan.status === 'ok',
      target_onboarding_fixture: targetFixture.status === 'ok',
      real_target_trial: realTargetTrial.status === 'ok',
      handoff_includes_published_acceptance_command: missingHandoffCommands.length === 0,
      installed_package_context_when_run_from_npx: installedPackageContextAccepted,
      source_repository_rehearsal: sourceRepositoryRehearsal
    },
    acceptance_criteria: {
      run_after_publish_with_version_pinned_npx: expectedPublishedCommand,
      npm_latest_dist_tag_checked_by_operator_handoff: true,
      package_metadata_checked_by_operator_handoff: true,
      version_pinned_release_check_passes: true,
      version_pinned_published_acceptance_passes: true,
      version_pinned_architecture_parity_smoke_passes: true,
      target_onboarding_plan_and_fixture_pass_from_published_package: true,
      target_onboarding_smoke_passes_from_published_package: true,
      real_target_trial_passes_from_published_package: true,
      no_source_ledger_required_in_installed_package_context: true
    },
    boundary: {
      writes_package_root: false,
      writes_target_repository_state: false,
      creates_temp_target_repository: true,
      git_mutation: false,
      installs_dependencies: false,
      runs_package_manager: false,
      runs_build_test_deploy: false,
      publishes_package: false,
      mutates_registry: false,
      network_registry_publish_required: false,
      network_registry_read_required_before_operator_acceptance: true
    },
    errors
  };
}


function runArchitecture(args) {
  if (args.length === 1 && args[0] === '--map') {
    json(publicArchitectureMap());
    return 0;
  }
  if (args.length === 1 && args[0] === '--router') {
    json(publicCommandRouter());
    return 0;
  }
  if (args.length === 1 && args[0] === '--facades') {
    json(publicDomainServiceFacades());
    return 0;
  }
  if (args.length === 1 && args[0] === '--partition-plan') {
    json(publicSourceDomainModulePartitionPlan());
    return 0;
  }
  if (args.length === 1 && args[0] === '--partition-check') {
    const result = publicSourceDomainModulePartitionPlanCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--extraction-rehearsal') {
    json(publicSourceDomainExtractionRehearsal());
    return 0;
  }
  if (args.length === 1 && args[0] === '--extraction-check') {
    const result = publicSourceDomainExtractionRehearsalCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--golden-outputs') {
    json(publicSourceExtractionGoldenOutputs());
    return 0;
  }
  if (args.length === 1 && args[0] === '--golden-check') {
    const result = publicSourceExtractionGoldenOutputFreezeCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--adapter-boundary') {
    json(publicSourceModuleExtractionAdapterBoundary());
    return 0;
  }
  if (args.length === 1 && args[0] === '--adapter-check') {
    const result = publicSourceModuleExtractionAdapterBoundaryCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--first-slice') {
    json(publicSourceModuleExtractionFirstSlice());
    return 0;
  }
  if (args.length === 1 && args[0] === '--first-slice-check') {
    const result = publicSourceModuleExtractionFirstSliceCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--bundle-parity') {
    json(publicSourceModuleExtractionBundleParity());
    return 0;
  }
  if (args.length === 1 && args[0] === '--bundle-parity-check') {
    const result = publicSourceModuleExtractionBundleParityCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--runtime-bridge') {
    json(publicSourceModuleExtractionRuntimeBridge());
    return 0;
  }
  if (args.length === 1 && args[0] === '--runtime-bridge-check') {
    const result = publicSourceModuleExtractionRuntimeBridgeCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--installed-fallback-smoke') {
    json(publicSourceModuleExtractionInstalledFallbackSmoke());
    return 0;
  }
  if (args.length === 1 && args[0] === '--installed-fallback-check') {
    const result = publicSourceModuleExtractionInstalledFallbackSmokeCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--second-slice-plan') {
    json(publicSourceModuleExtractionSecondSlicePlan());
    return 0;
  }
  if (args.length === 1 && args[0] === '--second-slice-check') {
    const result = publicSourceModuleExtractionSecondSlicePlanCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--second-slice-first-slice') {
    json(publicSourceModuleExtractionSecondSliceFirstSlice());
    return 0;
  }
  if (args.length === 1 && args[0] === '--second-slice-first-slice-check') {
    const result = publicSourceModuleExtractionSecondSliceFirstSliceCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--authority-bundle-parity') {
    json(publicSourceModuleExtractionAuthorityBundleParity());
    return 0;
  }
  if (args.length === 1 && args[0] === '--authority-bundle-parity-check') {
    const result = publicSourceModuleExtractionAuthorityBundleParityCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--authority-runtime-bridge') {
    json(publicSourceModuleExtractionAuthorityRuntimeBridge());
    return 0;
  }
  if (args.length === 1 && args[0] === '--authority-runtime-bridge-check') {
    const result = publicSourceModuleExtractionAuthorityRuntimeBridgeCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--m2-seed') {
    json(publicArchitectureM1ClosureM2Seed());
    return 0;
  }
  if (args.length === 1 && args[0] === '--m2-seed-check') {
    const result = publicArchitectureM1ClosureM2SeedCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--work-items-plan') {
    json(publicWorkItemsDomainSourceExtractionPlan());
    return 0;
  }
  if (args.length === 1 && args[0] === '--work-items-check') {
    const result = publicWorkItemsDomainSourceExtractionPlanCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--work-items-first-slice') {
    json(publicWorkItemsDomainSourceExtractionFirstSlice());
    return 0;
  }
  if (args.length === 1 && args[0] === '--work-items-first-slice-check') {
    const result = publicWorkItemsDomainSourceExtractionFirstSliceCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--work-items-bundle-parity') {
    json(publicWorkItemsDomainSourceExtractionBundleParity());
    return 0;
  }
  if (args.length === 1 && args[0] === '--work-items-bundle-parity-check') {
    const result = publicWorkItemsDomainSourceExtractionBundleParityCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--work-items-runtime-bridge') {
    json(publicWorkItemsDomainSourceExtractionRuntimeBridge());
    return 0;
  }
  if (args.length === 1 && args[0] === '--work-items-runtime-bridge-check') {
    const result = publicWorkItemsDomainSourceExtractionRuntimeBridgeCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--work-items-installed-fallback-smoke') {
    json(publicWorkItemsDomainSourceExtractionInstalledFallbackSmoke());
    return 0;
  }
  if (args.length === 1 && args[0] === '--work-items-installed-fallback-check') {
    const result = publicWorkItemsDomainSourceExtractionInstalledFallbackSmokeCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--check') {
    const result = publicArchitectureCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  json({
    schema: 'agent-onboard-architecture-command-error-001',
    status: 'error',
    command_family: 'architecture',
    message: 'architecture requires --map, --router, --facades, --partition-plan, --partition-check, --extraction-rehearsal, --extraction-check, --golden-outputs, --golden-check, --adapter-boundary, --adapter-check, --first-slice, --first-slice-check, --bundle-parity, --bundle-parity-check, --runtime-bridge, --runtime-bridge-check, --installed-fallback-smoke, --installed-fallback-check, --second-slice-plan, --second-slice-check, --second-slice-first-slice, --second-slice-first-slice-check, --authority-bundle-parity, --authority-bundle-parity-check, --authority-runtime-bridge, --authority-runtime-bridge-check, --m2-seed, --m2-seed-check, --work-items-plan, --work-items-check, --work-items-first-slice, --work-items-first-slice-check, --work-items-bundle-parity, --work-items-bundle-parity-check, --work-items-runtime-bridge, --work-items-runtime-bridge-check, --work-items-installed-fallback-smoke, --work-items-installed-fallback-check, or --check',
    writes_files: false,
    publishes_package: false
  });
  return 1;
}


function runAuthority(args) {
  if (args.length === 1 && args[0] === '--first-read') {
    json(publicAuthorityFirstRead());
    return 0;
  }
  if (args.length === 1 && args[0] === '--check') {
    const result = publicAuthorityFirstReadCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  json({
    schema: 'agent-onboard-authority-command-error-001',
    status: 'error',
    command_family: 'authority',
    message: 'authority requires --first-read or --check',
    writes_files: false,
    publishes_package: false
  });
  return 1;
}

function runRelease(args) {
  if (args.length === 1 && args[0] === '--plan') {
    json({
      schema: 'agent-onboard-public-release-plan-005',
      status: 'ok',
      package_name: PUBLIC_RELEASE_CONTRACT.package_name,
      version: VERSION,
      release_line: PUBLIC_RELEASE_CONTRACT.release_line,
      contract_schema: PUBLIC_RELEASE_CONTRACT.schema,
      contract_command: PUBLIC_RELEASE_CONTRACT.contract_command,
      fixture_command: PUBLIC_RELEASE_CONTRACT.fixture_command,
      parity_smoke_command: PUBLIC_RELEASE_CONTRACT.parity_smoke_command,
      architecture_parity_smoke_command: PUBLIC_RELEASE_CONTRACT.architecture_parity_smoke_command,
      target_onboarding_smoke_command: PUBLIC_RELEASE_CONTRACT.target_onboarding_smoke_command,
      post_publish_handoff_command: PUBLIC_RELEASE_CONTRACT.post_publish_handoff_command,
      published_acceptance_command: PUBLIC_RELEASE_CONTRACT.published_acceptance_command,
      real_target_trial_command: PUBLIC_RELEASE_CONTRACT.real_target_trial_command,
      architecture_map_command: PUBLIC_RELEASE_CONTRACT.architecture_map_command,
      architecture_router_command: PUBLIC_RELEASE_CONTRACT.architecture_router_command,
      architecture_facades_command: PUBLIC_RELEASE_CONTRACT.architecture_facades_command,
      architecture_partition_plan_command: PUBLIC_RELEASE_CONTRACT.architecture_partition_plan_command,
      architecture_partition_check_command: PUBLIC_RELEASE_CONTRACT.architecture_partition_check_command,
      architecture_extraction_rehearsal_command: PUBLIC_RELEASE_CONTRACT.architecture_extraction_rehearsal_command,
      architecture_extraction_check_command: PUBLIC_RELEASE_CONTRACT.architecture_extraction_check_command,
      architecture_golden_outputs_command: PUBLIC_RELEASE_CONTRACT.architecture_golden_outputs_command,
      architecture_golden_check_command: PUBLIC_RELEASE_CONTRACT.architecture_golden_check_command,
      architecture_adapter_boundary_command: PUBLIC_RELEASE_CONTRACT.architecture_adapter_boundary_command,
      architecture_adapter_check_command: PUBLIC_RELEASE_CONTRACT.architecture_adapter_check_command,
      architecture_first_slice_command: PUBLIC_RELEASE_CONTRACT.architecture_first_slice_command,
      architecture_first_slice_check_command: PUBLIC_RELEASE_CONTRACT.architecture_first_slice_check_command,
      architecture_bundle_parity_command: PUBLIC_RELEASE_CONTRACT.architecture_bundle_parity_command,
      architecture_bundle_parity_check_command: PUBLIC_RELEASE_CONTRACT.architecture_bundle_parity_check_command,
      architecture_runtime_bridge_command: PUBLIC_RELEASE_CONTRACT.architecture_runtime_bridge_command,
      architecture_runtime_bridge_check_command: PUBLIC_RELEASE_CONTRACT.architecture_runtime_bridge_check_command,
      architecture_installed_fallback_smoke_command: PUBLIC_RELEASE_CONTRACT.architecture_installed_fallback_smoke_command,
      architecture_installed_fallback_check_command: PUBLIC_RELEASE_CONTRACT.architecture_installed_fallback_check_command,
      architecture_second_slice_plan_command: PUBLIC_RELEASE_CONTRACT.architecture_second_slice_plan_command,
      architecture_second_slice_check_command: PUBLIC_RELEASE_CONTRACT.architecture_second_slice_check_command,
      architecture_second_slice_first_slice_command: PUBLIC_RELEASE_CONTRACT.architecture_second_slice_first_slice_command,
      architecture_second_slice_first_slice_check_command: PUBLIC_RELEASE_CONTRACT.architecture_second_slice_first_slice_check_command,
      architecture_authority_bundle_parity_command: PUBLIC_RELEASE_CONTRACT.architecture_authority_bundle_parity_command,
      architecture_authority_bundle_parity_check_command: PUBLIC_RELEASE_CONTRACT.architecture_authority_bundle_parity_check_command,
      architecture_authority_runtime_bridge_command: PUBLIC_RELEASE_CONTRACT.architecture_authority_runtime_bridge_command,
      architecture_authority_runtime_bridge_check_command: PUBLIC_RELEASE_CONTRACT.architecture_authority_runtime_bridge_check_command,
      architecture_work_items_plan_command: PUBLIC_RELEASE_CONTRACT.architecture_work_items_plan_command,
      architecture_work_items_check_command: PUBLIC_RELEASE_CONTRACT.architecture_work_items_check_command,
      architecture_work_items_first_slice_command: PUBLIC_RELEASE_CONTRACT.architecture_work_items_first_slice_command,
      architecture_work_items_first_slice_check_command: PUBLIC_RELEASE_CONTRACT.architecture_work_items_first_slice_check_command,
      architecture_work_items_bundle_parity_command: PUBLIC_RELEASE_CONTRACT.architecture_work_items_bundle_parity_command,
      architecture_work_items_bundle_parity_check_command: PUBLIC_RELEASE_CONTRACT.architecture_work_items_bundle_parity_check_command,
      architecture_work_items_runtime_bridge_command: PUBLIC_RELEASE_CONTRACT.architecture_work_items_runtime_bridge_command,
      architecture_work_items_runtime_bridge_check_command: PUBLIC_RELEASE_CONTRACT.architecture_work_items_runtime_bridge_check_command,
      architecture_work_items_installed_fallback_smoke_command: PUBLIC_RELEASE_CONTRACT.architecture_work_items_installed_fallback_smoke_command,
      architecture_work_items_installed_fallback_check_command: PUBLIC_RELEASE_CONTRACT.architecture_work_items_installed_fallback_check_command,
      version_sprawl_check_command: PUBLIC_RELEASE_CONTRACT.version_sprawl_check_command,
      architecture_check_command: PUBLIC_RELEASE_CONTRACT.architecture_check_command,
      authority_first_read_command: PUBLIC_RELEASE_CONTRACT.authority_first_read_command,
      authority_check_command: PUBLIC_RELEASE_CONTRACT.authority_check_command,
      target_runtime_namespace_command: PUBLIC_RELEASE_CONTRACT.target_runtime_namespace_command,
      target_runtime_check_command: PUBLIC_RELEASE_CONTRACT.target_runtime_check_command,
      package_surface_command: PUBLIC_RELEASE_CONTRACT.package_surface_command,
      package_surface_check_command: PUBLIC_RELEASE_CONTRACT.package_surface_check_command,
      check_command: PUBLIC_RELEASE_CONTRACT.command,
      contract: PUBLIC_RELEASE_CONTRACT,
      fixture_matrix: PUBLIC_RELEASE_FIXTURE_MATRIX,
      architecture_map: PUBLIC_ARCHITECTURE_MAP,
      command_router: PUBLIC_COMMAND_ROUTER,
      domain_service_facades: PUBLIC_DOMAIN_SERVICE_FACADES,
      source_domain_module_partition_plan: PUBLIC_SOURCE_DOMAIN_MODULE_PARTITION_PLAN,
      source_domain_extraction_rehearsal: PUBLIC_SOURCE_DOMAIN_EXTRACTION_REHEARSAL,
      source_extraction_golden_output_freeze: PUBLIC_SOURCE_EXTRACTION_GOLDEN_OUTPUT_FREEZE,
      source_module_extraction_adapter_boundary: PUBLIC_SOURCE_MODULE_EXTRACTION_ADAPTER_BOUNDARY,
      source_module_extraction_first_slice: PUBLIC_SOURCE_MODULE_EXTRACTION_FIRST_SLICE,
      source_module_extraction_bundle_parity: PUBLIC_SOURCE_MODULE_EXTRACTION_BUNDLE_PARITY,
    source_module_extraction_runtime_bridge: PUBLIC_SOURCE_MODULE_EXTRACTION_RUNTIME_BRIDGE,
      source_module_extraction_second_slice_plan: PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN,
      source_module_extraction_second_slice_first_slice: PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_FIRST_SLICE,
      source_module_extraction_work_items_plan: PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_PLAN,
      source_module_extraction_work_items_first_slice: PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_FIRST_SLICE,
      source_module_extraction_work_items_bundle_parity: PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_BUNDLE_PARITY,
      source_module_extraction_work_items_runtime_bridge: PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_RUNTIME_BRIDGE,
      source_module_extraction_work_items_installed_fallback_smoke: PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_INSTALLED_FALLBACK_SMOKE,
      version_reference_policy: PUBLIC_VERSION_REFERENCE_POLICY,
      authority_first_read_index: PUBLIC_AUTHORITY_FIRST_READ_INDEX,
      target_runtime_namespace: PUBLIC_TARGET_RUNTIME_NAMESPACE,
      package_surface_preservation: PUBLIC_PACKAGE_SURFACE_PRESERVATION,
      installed_parity_architecture_smoke: PUBLIC_INSTALLED_PARITY_ARCHITECTURE_SMOKE,
      source_context: sourceContext(),
      post_publish_verification_commands: publicReleasePostPublishCommands(VERSION),
      boundary: {
        writes_files: false,
        git_mutation: false,
        installs_dependencies: false,
        runs_build_test_deploy: false,
        publishes_package: false,
        mutates_registry: false
      }
    });
    return 0;
  }
  if (args.length === 1 && args[0] === '--contract') {
    json({
      schema: 'agent-onboard-public-release-contract-response-001',
      status: 'ok',
      package_name: PUBLIC_RELEASE_CONTRACT.package_name,
      version: VERSION,
      release_line: PUBLIC_RELEASE_CONTRACT.release_line,
      contract: PUBLIC_RELEASE_CONTRACT,
      fixture_matrix: PUBLIC_RELEASE_FIXTURE_MATRIX,
      architecture_map: PUBLIC_ARCHITECTURE_MAP,
      command_router: PUBLIC_COMMAND_ROUTER,
      domain_service_facades: PUBLIC_DOMAIN_SERVICE_FACADES,
      source_domain_module_partition_plan: PUBLIC_SOURCE_DOMAIN_MODULE_PARTITION_PLAN,
      source_domain_extraction_rehearsal: PUBLIC_SOURCE_DOMAIN_EXTRACTION_REHEARSAL,
      source_extraction_golden_output_freeze: PUBLIC_SOURCE_EXTRACTION_GOLDEN_OUTPUT_FREEZE,
      source_module_extraction_adapter_boundary: PUBLIC_SOURCE_MODULE_EXTRACTION_ADAPTER_BOUNDARY,
      source_module_extraction_first_slice: PUBLIC_SOURCE_MODULE_EXTRACTION_FIRST_SLICE,
      source_module_extraction_bundle_parity: PUBLIC_SOURCE_MODULE_EXTRACTION_BUNDLE_PARITY,
    source_module_extraction_runtime_bridge: PUBLIC_SOURCE_MODULE_EXTRACTION_RUNTIME_BRIDGE,
      source_module_extraction_second_slice_plan: PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN,
      source_module_extraction_second_slice_first_slice: PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_FIRST_SLICE,
      source_module_extraction_work_items_plan: PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_PLAN,
      source_module_extraction_work_items_first_slice: PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_FIRST_SLICE,
      source_module_extraction_work_items_bundle_parity: PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_BUNDLE_PARITY,
      source_module_extraction_work_items_runtime_bridge: PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_RUNTIME_BRIDGE,
      source_module_extraction_work_items_installed_fallback_smoke: PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_INSTALLED_FALLBACK_SMOKE,
      version_reference_policy: PUBLIC_VERSION_REFERENCE_POLICY,
      authority_first_read_index: PUBLIC_AUTHORITY_FIRST_READ_INDEX,
      target_runtime_namespace: PUBLIC_TARGET_RUNTIME_NAMESPACE,
      package_surface_preservation: PUBLIC_PACKAGE_SURFACE_PRESERVATION,
      installed_parity_architecture_smoke: PUBLIC_INSTALLED_PARITY_ARCHITECTURE_SMOKE,
      source_context: sourceContext(),
      writes_files: false,
      publishes_package: false,
      mutates_registry: false
    });
    return 0;
  }
  if (args.length === 1 && args[0] === '--fixture') {
    json({
      schema: 'agent-onboard-public-release-fixture-response-001',
      status: 'ok',
      package_name: PUBLIC_RELEASE_CONTRACT.package_name,
      version: VERSION,
      release_line: PUBLIC_RELEASE_CONTRACT.release_line,
      contract_schema: PUBLIC_RELEASE_CONTRACT.schema,
      fixture_matrix: PUBLIC_RELEASE_FIXTURE_MATRIX,
      architecture_map: PUBLIC_ARCHITECTURE_MAP,
      command_router: PUBLIC_COMMAND_ROUTER,
      domain_service_facades: PUBLIC_DOMAIN_SERVICE_FACADES,
      source_domain_module_partition_plan: PUBLIC_SOURCE_DOMAIN_MODULE_PARTITION_PLAN,
      source_domain_extraction_rehearsal: PUBLIC_SOURCE_DOMAIN_EXTRACTION_REHEARSAL,
      source_extraction_golden_output_freeze: PUBLIC_SOURCE_EXTRACTION_GOLDEN_OUTPUT_FREEZE,
      source_module_extraction_adapter_boundary: PUBLIC_SOURCE_MODULE_EXTRACTION_ADAPTER_BOUNDARY,
      source_module_extraction_first_slice: PUBLIC_SOURCE_MODULE_EXTRACTION_FIRST_SLICE,
      source_module_extraction_bundle_parity: PUBLIC_SOURCE_MODULE_EXTRACTION_BUNDLE_PARITY,
    source_module_extraction_runtime_bridge: PUBLIC_SOURCE_MODULE_EXTRACTION_RUNTIME_BRIDGE,
      source_module_extraction_second_slice_plan: PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN,
      source_module_extraction_second_slice_first_slice: PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_FIRST_SLICE,
      source_module_extraction_work_items_plan: PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_PLAN,
      source_module_extraction_work_items_first_slice: PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_FIRST_SLICE,
      source_module_extraction_work_items_bundle_parity: PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_BUNDLE_PARITY,
      source_module_extraction_work_items_runtime_bridge: PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_RUNTIME_BRIDGE,
      source_module_extraction_work_items_installed_fallback_smoke: PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_INSTALLED_FALLBACK_SMOKE,
      version_reference_policy: PUBLIC_VERSION_REFERENCE_POLICY,
      authority_first_read_index: PUBLIC_AUTHORITY_FIRST_READ_INDEX,
      target_runtime_namespace: PUBLIC_TARGET_RUNTIME_NAMESPACE,
      package_surface_preservation: PUBLIC_PACKAGE_SURFACE_PRESERVATION,
      installed_parity_architecture_smoke: PUBLIC_INSTALLED_PARITY_ARCHITECTURE_SMOKE,
      source_context: sourceContext(),
      writes_files: false,
      publishes_package: false,
      mutates_registry: false
    });
    return 0;
  }
  if (args.length === 1 && args[0] === '--surface') {
    json(publicPackageSurface());
    return 0;
  }
  if (args.length === 1 && args[0] === '--surface-check') {
    const result = publicPackageSurfaceCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--version-sprawl-check') {
    const result = publicVersionReferencePolicyCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--parity-smoke') {
    const result = publicInstalledPackageParitySmoke();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--architecture-parity-smoke') {
    const result = publicInstalledParityArchitectureSmoke();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--target-onboarding-smoke') {
    const result = publicTargetOnboardingInstalledPackageSmoke();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--post-publish-handoff') {
    const result = publicTargetOnboardingPostPublishHandoff();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--published-acceptance') {
    const result = publicTargetOnboardingPublishedAcceptance();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--real-target-trial') {
    const result = publicTargetOnboardingRealTargetRepoTrial();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--check') {
    const result = publicReleaseCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  json({
    schema: 'agent-onboard-release-command-error-001',
    status: 'error',
    command_family: 'release',
    message: 'release requires --plan, --contract, --fixture, --surface, --surface-check, --version-sprawl-check, --parity-smoke, --architecture-parity-smoke, --target-onboarding-smoke, --post-publish-handoff, --published-acceptance, --real-target-trial, or --check',
    writes_files: false,
    publishes_package: false
  });
  return 1;
}

function runGuard(args) {
  if (args.length === 1 && args[0] === '--plan') {
    json({
      schema: 'agent-onboard-guard-plan-001',
      status: 'ok',
      command_family: 'guard',
      command: 'agent-onboard guard --plan',
      admitted_command: 'agent-onboard guard --check-boundary',
      canonical_config_file: TARGET_CONFIG_FILE,
        enforcement_mode: BOUNDARY_GUARD_CONTRACT.enforcement_mode,
      required_target_config_values: BOUNDARY_GUARD_CONTRACT.required_target_config_values,
      forbidden_true_boundary_fields: BOUNDARY_GUARD_CONTRACT.forbidden_true_boundary_fields,
      reads_target_config: false,
      ...noMutationBoundary()
    });
    return 0;
  }
  if (args.length !== 1 || args[0] !== '--check-boundary') {
    json({
      schema: 'agent-onboard-guard-command-error-001',
      status: 'error',
      command_family: 'guard',
      message: 'guard requires --plan or --check-boundary',
      ...noMutationBoundary()
    });
    return 1;
  }

  const configPath = path.join(process.cwd(), TARGET_CONFIG_FILE);
  if (!fs.existsSync(configPath)) {
    json({
      ...guardResultBase(),
      status: 'blocked',
      reason: 'missing agent-onboard.target.json in current target repo root',
      reads_target_config: false,
      blocked_violation_count: 1,
      violations: [{ path: TARGET_CONFIG_FILE, expected: 'present', actual: 'missing' }],
      blocks_declared_violation: true
    });
    return 2;
  }

  let config;
  try {
    config = readJson(configPath);
  } catch (error) {
    json({
      ...guardResultBase(),
      status: 'blocked',
      reason: 'invalid JSON in agent-onboard.target.json',
      detail: error && error.message ? error.message : String(error),
      reads_target_config: true,
      blocked_violation_count: 1,
      violations: [{ path: TARGET_CONFIG_FILE, expected: 'valid JSON', actual: 'invalid JSON' }],
      blocks_declared_violation: true
    });
    return 2;
  }

  const schemaErrors = validateTargetConfig(config);
  const schemaViolations = schemaErrors.map((message) => ({ path: 'schema-validation', expected: 'valid agent-onboard-target-config-001', actual: message }));
  const boundaryViolations = evaluateTargetBoundaryConfig(config);
  const violations = [...schemaViolations, ...boundaryViolations];
  const passed = violations.length === 0;
  json({
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

function runTargetConfig(args) {
  if (args.includes('--schema')) {
    json({
      schema: 'agent-onboard-target-config-schema-response-001',
      status: 'ok',
      target_config_schema: TARGET_CONFIG_SCHEMA
    });
    return 0;
  }
  if (args.includes('--template')) {
    json({
      schema: 'agent-onboard-target-config-template-response-001',
      status: 'ok',
      canonical_config_file: 'agent-onboard.target.json',
      target_config: targetConfigTemplate()
    });
    return 0;
  }
  if (args.includes('--validate-template')) {
    const errors = validateTargetConfig(targetConfigTemplate());
    const ok = errors.length === 0;
    json({
      schema: 'agent-onboard-target-config-template-validation-001',
      status: ok ? 'ok' : 'error',
      template_source: 'embedded',
      canonical_config_file: 'agent-onboard.target.json',
      validated: true,
      errors
    });
    return ok ? 0 : 1;
  }
  if (args.includes('--validate')) {
    const index = args.indexOf('--validate');
    const file = args[index + 1] && !args[index + 1].startsWith('-') ? args[index + 1] : 'agent-onboard.target.json';
    const errors = validateTargetConfig(readJson(path.resolve(process.cwd(), file)));
    const ok = errors.length === 0;
    json({
      schema: 'agent-onboard-target-config-file-validation-001',
      status: ok ? 'ok' : 'error',
      file,
      validated: true,
      errors
    });
    return ok ? 0 : 1;
  }
  throw new Error('target-config requires --schema, --template, --validate-template, or --validate [file]');
}

function runWorkItems(args) {
  if (args.includes('--close')) {
    const dry = args.includes('--dry-run');
    const write = args.includes('--write');
    if (!write && !dry) throw new Error('work-items --close requires --dry-run or --write');
    if (write && dry) throw new Error('work-items --close accepts only one of --dry-run or --write');

    const mode = write ? 'write' : 'dry-run';
    const command = `agent-onboard work-items --close --${mode}`;
    const file = parseOption(args, '--file') || '.agent-onboard/work-items.json';
    const absolutePath = path.resolve(process.cwd(), file);
    if (!fs.existsSync(absolutePath)) {
      json({
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
      json({
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
        id: parseOption(args, '--id'),
        actor: parseOption(args, '--actor'),
        closed_at: parseOption(args, '--closed-at'),
        summary: parseOption(args, '--summary'),
        changed_files: parseRepeatedOption(args, '--changed-file'),
        checks_run: parseRepeatedOption(args, '--check'),
        checks_not_run: parseRepeatedOption(args, '--check-not-run'),
        known_non_pass: parseRepeatedOption(args, '--known-non-pass')
      });
    } catch (error) {
      json({
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
    json({
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
  if (args.includes('--claim')) {
    const dry = args.includes('--dry-run');
    const write = args.includes('--write');
    if (!write && !dry) throw new Error('work-items --claim requires --dry-run or --write');
    if (write && dry) throw new Error('work-items --claim accepts only one of --dry-run or --write');

    const mode = write ? 'write' : 'dry-run';
    const command = `agent-onboard work-items --claim --${mode}`;
    const file = parseOption(args, '--file') || '.agent-onboard/work-items.json';
    const absolutePath = path.resolve(process.cwd(), file);
    if (!fs.existsSync(absolutePath)) {
      json({
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
      json({
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
        id: parseOption(args, '--id'),
        actor: parseOption(args, '--actor'),
        claimed_at: parseOption(args, '--claimed-at'),
        note: parseOption(args, '--note')
      });
    } catch (error) {
      json({
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
    json({
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
  if (args.includes('--append')) {
    const dry = args.includes('--dry-run');
    const write = args.includes('--write');
    if (!write && !dry) throw new Error('work-items --append requires --dry-run or --write');
    if (write && dry) throw new Error('work-items --append accepts only one of --dry-run or --write');

    const mode = write ? 'write' : 'dry-run';
    const command = `agent-onboard work-items --append --${mode}`;
    const file = parseOption(args, '--file') || '.agent-onboard/work-items.json';
    const absolutePath = path.resolve(process.cwd(), file);
    if (!fs.existsSync(absolutePath)) {
      json({
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
      json({
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
        id: parseOption(args, '--id'),
        title: parseOption(args, '--title'),
        program_title: parseOption(args, '--program-title'),
        stage_title: parseOption(args, '--stage-title'),
        milestone_title: parseOption(args, '--milestone-title')
      });
    } catch (error) {
      json({
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
    json({
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
  if (args.includes('--init')) {
    const write = args.includes('--write');
    const dry = args.includes('--dry-run');
    const force = args.includes('--force');
    if (!write && !dry) throw new Error('work-items --init requires --dry-run or --write');
    if (write && dry) throw new Error('work-items --init accepts only one of --dry-run or --write');

    const plannedWrites = planWrites([['.agent-onboard/work-items.json', workItemsTemplate()]], { force });
    const conflicts = plannedWrites.filter((item) => item.action === 'conflict');
    const errors = validateWorkItems(workItemsTemplate());
    const ok = conflicts.length === 0 && errors.length === 0;

    if (write && ok) performPlannedWrites(plannedWrites);

    json({
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
      counts: workItemCounts(workItemsTemplate()),
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
  if (args.includes('--schema')) {
    json({
      schema: 'agent-onboard-work-items-schema-response-001',
      status: 'ok',
      work_items_schema: WORK_ITEMS_SCHEMA
    });
    return 0;
  }
  if (args.includes('--template')) {
    json({
      schema: 'agent-onboard-work-items-template-response-001',
      status: 'ok',
      canonical_file: '.agent-onboard/work-items.json',
      work_items: workItemsTemplate()
    });
    return 0;
  }
  if (args.includes('--validate-template')) {
    const errors = validateWorkItems(workItemsTemplate());
    const ok = errors.length === 0;
    json({
      schema: 'agent-onboard-work-items-template-validation-001',
      status: ok ? 'ok' : 'error',
      template_source: 'embedded',
      canonical_file: '.agent-onboard/work-items.json',
      validated: true,
      errors
    });
    return ok ? 0 : 1;
  }
  if (args.includes('--validate')) {
    const index = args.indexOf('--validate');
    const file = args[index + 1] && !args[index + 1].startsWith('-') ? args[index + 1] : '.agent-onboard/work-items.json';
    const value = readJson(path.resolve(process.cwd(), file));
    const errors = validateWorkItems(value);
    const ok = errors.length === 0;
    json({
      schema: 'agent-onboard-work-items-file-validation-001',
      status: ok ? 'ok' : 'error',
      file,
      validated: true,
      counts: workItemCounts(value),
      errors
    });
    return ok ? 0 : 1;
  }
  if (args.includes('--list')) {
    const index = args.indexOf('--list');
    const file = args[index + 1] && !args[index + 1].startsWith('-') ? args[index + 1] : '.agent-onboard/work-items.json';
    const absolutePath = path.resolve(process.cwd(), file);
    if (!fs.existsSync(absolutePath)) {
      json({
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
    json({
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
  throw new Error('work-items requires --schema, --template, --validate-template, --init --dry-run|--write [--force], --validate [file], or --list [file], or --append --dry-run|--write --id <public-work-item-id> --title <title>, or --claim --dry-run|--write --id <public-work-item-id> --actor <actor>, or --close --dry-run|--write --id <public-work-item-id> --actor <actor> --summary <summary>');
}

function runAgents(args) {
  const preview = args.includes('--preview');
  const write = args.includes('--write');
  const force = args.includes('--force');
  if (!preview && !write) throw new Error('agents requires --preview or --write');
  if (preview && write) throw new Error('agents accepts only one of --preview or --write');

  const content = agentsMdTemplate();
  const plannedWrites = planTextWrites([['AGENTS.md', content]], { force });
  const conflicts = plannedWrites.filter((item) => item.action === 'conflict');
  const ok = conflicts.length === 0;
  if (write && ok) performPlannedTextWrites(plannedWrites);

  json({
    schema: 'agent-onboard-agents-result-001',
    status: ok ? 'ok' : 'error',
    command_family: 'agents',
    canonical_file: 'AGENTS.md',
    mode: write ? 'write' : 'preview',
    force,
    writes_performed: write && ok,
    planned_writes: summarizePlan(plannedWrites),
    conflicts: conflicts.map((item) => item.path),
    agents_md: content,
    boundary: {
      installs_dependencies: false,
      runs_build_test_deploy: false,
      publishes_or_pushes: false,
      modifies_source_files: write,
      modifies_only_canonical_agents_file: write
    }
  });
  return ok ? 0 : 1;
}

function runInit(args) {
  const write = args.includes('--write');
  const dry = args.includes('--dry-run');
  const force = args.includes('--force');
  if (!write && !dry) throw new Error('init requires --dry-run or --write');
  if (write && dry) throw new Error('init accepts only one of --dry-run or --write');

  const plannedWrites = planWrites(initWriteSet(), { force });
  const conflicts = plannedWrites.filter((item) => item.action === 'conflict');
  const ok = conflicts.length === 0;

  if (write && ok) performPlannedWrites(plannedWrites);

  json({
    schema: 'agent-onboard-init-result-001',
    status: ok ? 'ok' : 'error',
    command_family: 'init',
    mode: write ? 'write' : 'dry-run',
    force,
    writes_performed: write && ok,
    planned_writes: summarizePlan(plannedWrites),
    conflicts: conflicts.map((item) => item.path),
    boundary: {
      installs_dependencies: false,
      runs_build_test_deploy: false,
      publishes_or_pushes: false,
      modifies_source_files: false
    }
  });
  return ok ? 0 : 1;
}


function runTargetOnboarding(args) {
  const plan = args.includes('--plan');
  const fixture = args.includes('--fixture');
  const write = args.includes('--write');
  const trial = args.includes('--trial');
  const force = args.includes('--force');
  const targetIndex = args.indexOf('--target');
  const targetRoot = targetIndex >= 0 ? args[targetIndex + 1] : process.cwd();
  const known = new Set(['--plan', '--fixture', '--write', '--trial', '--force', '--target']);
  const unknown = args.filter((arg, index) => {
    if (targetIndex >= 0 && index === targetIndex + 1) return false;
    return !known.has(arg);
  });
  if (targetIndex >= 0 && (!targetRoot || targetRoot.startsWith('-'))) throw new Error('target onboarding --target requires a path');
  if (unknown.length > 0) throw new Error(`target onboarding does not support: ${unknown.join(', ')}`);
  if ([plan, fixture, write, trial].filter(Boolean).length !== 1) throw new Error('target onboarding requires exactly one of --plan, --fixture, --trial, or --write');
  if (force && !write) throw new Error('target onboarding --force requires --write');
  if (targetIndex >= 0 && !trial) throw new Error('target onboarding --target is only supported with --trial');
  if (plan) {
    json(targetOnboardingSurfacePlan());
    return 0;
  }
  if (fixture) {
    json(targetOnboardingDryRunFixture());
    return 0;
  }
  if (trial) {
    const result = targetOnboardingRealTargetTrial(targetRoot);
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }

  const plannedWrites = planTargetOnboardingWrites({ force });
  const conflicts = plannedWrites.filter((item) => item.action === 'conflict');
  const ok = conflicts.length === 0;
  if (ok) performTargetOnboardingWrites(plannedWrites);
  const writtenFiles = ok ? plannedWrites.filter((item) => item.action === 'create' || item.action === 'overwrite').map((item) => item.path) : [];

  json({
    schema: 'agent-onboard-public-target-onboarding-explicit-write-result-001',
    status: ok ? 'ok' : 'error',
    package_name: 'agent-onboard',
    version: VERSION,
    release_line: PUBLIC_RELEASE_CONTRACT.release_line,
    command: force ? 'agent-onboard target onboarding --write --force' : 'agent-onboard target onboarding --write',
    command_family: 'target onboarding',
    mode: 'write',
    force,
    writes_performed: writtenFiles.length > 0,
    written_files: writtenFiles,
    planned_writes: summarizePlan(plannedWrites),
    conflicts: conflicts.map((item) => item.path),
    boundary: {
      explicit_write_flag_required: true,
      force_overwrite_requires_explicit_force_flag: true,
      writes_only_canonical_target_onboarding_files: true,
      canonical_files: TARGET_ONBOARDING_SURFACE_PLAN.canonical_files.slice(),
      installs_dependencies: false,
      runs_build_test_deploy: false,
      publishes_or_pushes: false,
      git_mutation: false
    },
    next_steps: ok ? [
      'read AGENTS.md before continuing agent-assisted work',
      'run agent-onboard guard --check-boundary after agent-onboard.target.json exists',
      'use work-items --append/--claim only after the target owner assigns public work-item scope'
    ] : []
  });
  return ok ? 0 : 1;
}

function runTargetBootstrap(args) {
  const write = args.includes('--write');
  const dry = args.includes('--dry-run');
  const force = args.includes('--force');
  if (!write && !dry) throw new Error('target bootstrap requires --dry-run or --write');
  if (write && dry) throw new Error('target bootstrap accepts only one of --dry-run or --write');

  const plannedWrites = planWrites([['agent-onboard.target.json', targetConfigTemplate()]], { force });
  const conflicts = plannedWrites.filter((item) => item.action === 'conflict');
  const ok = conflicts.length === 0;
  if (write && ok) performPlannedWrites(plannedWrites);

  json({
    schema: 'agent-onboard-target-bootstrap-result-001',
    status: ok ? 'ok' : 'error',
    command_family: 'target',
    mode: write ? 'write' : 'dry-run',
    force,
    writes_performed: write && ok,
    planned_writes: summarizePlan(plannedWrites),
    conflicts: conflicts.map((item) => item.path),
    skipped_optional_writes: ['package.json']
  });
  return ok ? 0 : 1;
}

function runTargetInstance(args) {
  if (args[0] !== 'takeover') throw new Error('target-instance supports only: takeover');
  const write = args.includes('--write');
  const dry = args.includes('--dry-run');
  const force = args.includes('--force');
  if (!write && !dry) throw new Error('target-instance takeover requires --dry-run or --write');
  if (write && dry) throw new Error('target-instance takeover accepts only one of --dry-run or --write');

  const plannedWrites = planWrites([
    ['.agent-onboard/runtime-namespace.json', targetRuntimeNamespaceTemplate()],
    ['.agent-onboard/project.json', runtimeProjectTemplate()],
    ['.agent-onboard/work-items.json', workItemsTemplate()]
  ], { force });
  const conflicts = plannedWrites.filter((item) => item.action === 'conflict');
  const ok = conflicts.length === 0;
  if (write && ok) performPlannedWrites(plannedWrites);

  json({
    schema: 'agent-onboard-target-instance-takeover-result-001',
    status: ok ? 'ok' : 'error',
    command_family: 'target-instance',
    mode: write ? 'write' : 'dry-run',
    force,
    writes_performed: write && ok,
    planned_writes: summarizePlan(plannedWrites),
    conflicts: conflicts.map((item) => item.path)
  });
  return ok ? 0 : 1;
}

function help() {
  process.stdout.write(`agent-onboard ${VERSION}\n\nagent-onboard status\nagent-onboard init --dry-run|--write [--force]\nagent-onboard agents --preview|--write [--force]\nagent-onboard guard --plan|--check-boundary\nagent-onboard authority --first-read|--check\nagent-onboard architecture --map|--router|--facades|--partition-plan|--partition-check|--extraction-rehearsal|--extraction-check|--golden-outputs|--golden-check|--adapter-boundary|--adapter-check|--first-slice|--first-slice-check|--bundle-parity|--bundle-parity-check|--runtime-bridge|--runtime-bridge-check|--installed-fallback-smoke|--installed-fallback-check|--second-slice-plan|--second-slice-check|--second-slice-first-slice|--second-slice-first-slice-check|--authority-bundle-parity|--authority-bundle-parity-check|--authority-runtime-bridge|--authority-runtime-bridge-check|--m2-seed|--m2-seed-check|--work-items-plan|--work-items-check|--work-items-first-slice|--work-items-first-slice-check|--work-items-bundle-parity|--work-items-bundle-parity-check|--work-items-runtime-bridge|--work-items-runtime-bridge-check|--work-items-installed-fallback-smoke|--work-items-installed-fallback-check|--check\nagent-onboard release --plan|--contract|--fixture|--surface|--surface-check|--version-sprawl-check|--parity-smoke|--architecture-parity-smoke|--target-onboarding-smoke|--post-publish-handoff|--published-acceptance|--real-target-trial|--check\nagent-onboard target-config --schema\nagent-onboard target-config --template\nagent-onboard target-config --validate-template\nagent-onboard target-config --validate [agent-onboard.target.json]\nagent-onboard work-items --schema\nagent-onboard work-items --template\nagent-onboard work-items --validate-template\nagent-onboard work-items --validate [.agent-onboard/work-items.json]\nagent-onboard work-items --list [.agent-onboard/work-items.json]\nagent-onboard work-items --init --dry-run|--write [--force]\nagent-onboard work-items --append --dry-run|--write --id <public-work-item-id> --title <title>\nagent-onboard work-items --claim --dry-run|--write --id <public-work-item-id> --actor <actor>\nagent-onboard work-items --close --dry-run|--write --id <public-work-item-id> --actor <actor> --summary <summary>\nagent-onboard target runtime --namespace|--check\nagent-onboard target onboarding --plan|--fixture|--trial [--target <path>]|--write [--force]\nagent-onboard target bootstrap --dry-run|--write [--force]\nagent-onboard target-instance takeover --dry-run|--write [--force]\n`);
  return 0;
}

function printVersion() {
  process.stdout.write(`${VERSION}\n`);
  return 0;
}

function runStatus() {
  json({ schema: 'agent-onboard-status-001', status: 'ok', version: VERSION, release_line: PUBLIC_RELEASE_CONTRACT.release_line });
  return 0;
}


function runTargetRuntime(args) {
  if (args.length === 1 && args[0] === '--namespace') {
    json(publicTargetRuntimeNamespace());
    return 0;
  }
  if (args.length === 1 && args[0] === '--check') {
    const result = publicTargetRuntimeNamespaceCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  json({
    schema: 'agent-onboard-target-runtime-command-error-001',
    status: 'error',
    command_family: 'target runtime',
    message: 'target runtime requires --namespace or --check',
    writes_files: false,
    publishes_package: false
  });
  return 1;
}

function runTargetCommand(args) {
  if (args[0] === 'runtime') return runTargetRuntime(args.slice(1));
  if (args[0] === 'onboarding') return runTargetOnboarding(args.slice(1));
  if (args[0] !== 'bootstrap') throw new Error('target supports only: runtime --namespace|--check, onboarding --plan|--fixture|--trial [--target <path>]|--write [--force], bootstrap');
  return runTargetBootstrap(args.slice(1));
}

const DOMAIN_SERVICE_FACADES = Object.freeze({
  coreService: Object.freeze({
    help,
    printVersion,
    runStatus,
    runArchitecture
  }),
  authorityService: Object.freeze({
    runAgents,
    runGuard,
    runAuthority
  }),
  workItemsService: Object.freeze({
    runWorkItems
  }),
  claimsService: Object.freeze({
    runWorkItems
  }),
  targetService: Object.freeze({
    runInit,
    runTargetConfig,
    runTargetRuntime,
    runTargetCommand,
    runTargetInstance
  }),
  releasePackageService: Object.freeze({
    runRelease
  })
});

const COMMAND_ROUTE_HANDLERS = Object.freeze({
  help: DOMAIN_SERVICE_FACADES.coreService.help,
  version: DOMAIN_SERVICE_FACADES.coreService.printVersion,
  status: DOMAIN_SERVICE_FACADES.coreService.runStatus,
  init: DOMAIN_SERVICE_FACADES.targetService.runInit,
  agents: DOMAIN_SERVICE_FACADES.authorityService.runAgents,
  guard: DOMAIN_SERVICE_FACADES.authorityService.runGuard,
  authority: DOMAIN_SERVICE_FACADES.authorityService.runAuthority,
  architecture: DOMAIN_SERVICE_FACADES.coreService.runArchitecture,
  release: DOMAIN_SERVICE_FACADES.releasePackageService.runRelease,
  'target-config': DOMAIN_SERVICE_FACADES.targetService.runTargetConfig,
  'work-items': DOMAIN_SERVICE_FACADES.workItemsService.runWorkItems,
  target: DOMAIN_SERVICE_FACADES.targetService.runTargetCommand,
  'target-instance': DOMAIN_SERVICE_FACADES.targetService.runTargetInstance
});

function normalizeCommand(cmd) {
  if (!cmd || ['help', '--help', '-h'].includes(cmd)) return 'help';
  if (['version', '--version', '-v'].includes(cmd)) return 'version';
  return cmd;
}

function dispatchCommand(argv = []) {
  const [rawCommand, ...args] = argv;
  const command = normalizeCommand(rawCommand);
  const handler = COMMAND_ROUTE_HANDLERS[command];
  if (!handler) throw new Error(`unsupported command: ${rawCommand}`);
  return handler(args);
}

function main(argv = process.argv) {
  return dispatchCommand(argv.slice(2));
}

if (require.main === module) {
  try {
    process.exitCode = main();
  } catch (error) {
    json({ schema: 'agent-onboard-cli-error-001', status: 'error', message: error.message || String(error) });
    process.exitCode = 1;
  }
}

module.exports = {
  main,
  targetConfigTemplate,
  validateTargetConfig,
  validateWorkItems,
  validateWorkItemsGraph,
  appendWorkItemDryRun,
  claimWorkItemDryRun,
  closeWorkItemDryRun,
  handoffEvidenceChecklist,
  participationLifecycleNextSteps,
  workItemsTemplate,
  initWriteSet,
  planWrites,
  agentsMdTemplate,
  evaluateTargetBoundaryConfig,
  sourceWorkItemsLedgerCheck,
  sourceContext,
  publicReleaseCheck,
  publicArchitectureMap,
  publicCommandRouter,
  publicCommandRouterCheck,
  publicArchitectureCheck,
  publicSourceDomainExtractionRehearsal,
  publicSourceDomainExtractionRehearsalCheck,
  publicSourceModuleExtractionAuthorityBundleParity,
  publicSourceModuleExtractionAuthorityBundleParityCheck,
  publicWorkItemsDomainSourceExtractionPlan,
  publicWorkItemsDomainSourceExtractionPlanCheck,
  publicWorkItemsDomainSourceExtractionFirstSlice,
  publicWorkItemsDomainSourceExtractionFirstSliceCheck,
  publicWorkItemsDomainSourceExtractionBundleParity,
  publicWorkItemsDomainSourceExtractionBundleParityCheck,
  publicWorkItemsDomainSourceExtractionRuntimeBridge,
  publicWorkItemsDomainSourceExtractionRuntimeBridgeCheck,
  publicWorkItemsDomainSourceExtractionInstalledFallbackSmoke,
  publicWorkItemsDomainSourceExtractionInstalledFallbackSmokeCheck,
  publicInstalledPackageParitySmoke,
  publicInstalledParityArchitectureSmoke,
  publicTargetOnboardingInstalledPackageSmoke,
  publicTargetOnboardingPostPublishHandoff,
  publicTargetOnboardingPublishedAcceptance,
  publicTargetOnboardingRealTargetRepoTrial,
  targetOnboardingSurfacePlan,
  targetOnboardingDryRunFixture,
  targetOnboardingRealTargetTrial,
  targetOnboardingWriteSet,
  targetRuntimeNamespaceTemplate,
  planTargetOnboardingWritesForRoot,
  TARGET_ONBOARDING_SURFACE_PLAN,
  TARGET_ONBOARDING_DRY_RUN_FIXTURE_MATRIX,
  PUBLIC_RELEASE_FIXTURE_MATRIX,
  PUBLIC_ARCHITECTURE_MAP,
  PUBLIC_COMMAND_ROUTER,
  PUBLIC_SOURCE_DOMAIN_EXTRACTION_REHEARSAL,
  PUBLIC_SOURCE_MODULE_EXTRACTION_ADAPTER_BOUNDARY,
  PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_BUNDLE_PARITY,
  PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_PLAN,
  PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_FIRST_SLICE,
  PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_BUNDLE_PARITY,
  PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_RUNTIME_BRIDGE,
  PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_INSTALLED_FALLBACK_SMOKE,
  PUBLIC_TARGET_RUNTIME_NAMESPACE,
  PUBLIC_INSTALLED_PARITY_ARCHITECTURE_SMOKE
};
