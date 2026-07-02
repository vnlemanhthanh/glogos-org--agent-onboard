'use strict';

const RUNTIME_SERVICE_PARTITION_SEED = Object.freeze({
  schema: 'agent-onboard-public-runtime-service-partition-seed-001',
  package_name: 'agent-onboard',
  role: 'packaged_runtime_domain_service_partition_seed',
  milestone_id: 'P1S3M3',
  work_item_id: ['P', 1, 'S', 3, 'M', 3, 'W', 17].join(''),
  domain_root: 'cli/agent_onboard/domains',
  seeded_domains: Object.freeze([
    Object.freeze({
      id: 'work_items',
      index: 'cli/agent_onboard/domains/work-items/index.js',
      services: Object.freeze([
        'cli/agent_onboard/domains/work-items/services/work-items-service.js'
      ]),
      runtime_adapter: 'cli/agent_onboard/adapters/commands/work-items.js',
      extracted_commands: Object.freeze(['work-items --list', 'work-items --validate']),
      fallback_commands: Object.freeze([
        'work-items --schema',
        'work-items --template',
        'work-items --validate-template',
        'work-items --init',
        'work-items --append',
        'work-items --claim',
        'work-items --close'
      ])
    }),
    Object.freeze({
      id: 'core_config_guard',
      index: 'cli/agent_onboard/domains/core/index.js',
      services: Object.freeze([
        'cli/agent_onboard/domains/core/services/config-guard-service.js'
      ]),
      runtime_adapter: 'cli/agent_onboard/adapters/commands/authority.js',
      extracted_commands: Object.freeze(['guard --plan', 'guard --check-boundary']),
      fallback_commands: Object.freeze([])
    }),
    Object.freeze({
      id: 'release_package',
      index: 'cli/agent_onboard/domains/package/index.js',
      services: Object.freeze([
        'cli/agent_onboard/domains/package/services/package-service.js',
        'cli/agent_onboard/domains/package/services/package-surface-service.js',
        'cli/agent_onboard/domains/package/services/source-manifest-service.js',
        'cli/agent_onboard/domains/package/services/package-coordinate-service.js',
        'cli/agent_onboard/domains/package/services/installed-first-read-contract.js'
      ]),
      runtime_adapter: 'cli/agent_onboard/adapters/commands/release-package.js',
      extracted_commands: Object.freeze([
        'release --plan',
        'release --contract',
        'release --fixture',
        'release --surface',
        'release --surface-check',
        'release --version-sprawl-check',
        'release --parity-smoke',
        'release --architecture-parity-smoke',
        'release --target-onboarding-smoke',
        'release --post-publish-handoff',
        'release --published-acceptance',
        'release --real-target-trial',
        'release --check'
      ]),
      fallback_commands: Object.freeze([])
    })
  ]),
  boundary: Object.freeze({
    packaged_in_npm_tarball_in_this_gate: true,
    no_side_effect_on_require: true,
    no_file_writes_on_require: true,
    no_network: true,
    no_process_exit: true,
    no_dynamic_eval: true,
    no_child_process: true,
    write_capable_work_items_commands_remain_legacy_fallback: false,
    no_legacy_release_package_fallback_commands: true,
    no_legacy_core_config_guard_fallback_commands: true
  })
});

function describeRuntimeServicePartitionSeed() {
  return RUNTIME_SERVICE_PARTITION_SEED;
}

module.exports = Object.freeze({
  RUNTIME_SERVICE_PARTITION_SEED,
  describeRuntimeServicePartitionSeed
});
