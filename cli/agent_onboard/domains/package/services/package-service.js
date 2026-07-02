'use strict';

const PACKAGE_SERVICE_SEED = Object.freeze({
  schema: 'agent-onboard-public-package-runtime-service-seed-001',
  package_name: 'agent-onboard',
  role: 'packaged_runtime_release_package_domain_service_seed',
  service_path: 'cli/agent_onboard/domains/package/services/package-service.js',
  domain_id: 'release_package',
  owned_top_level_commands: Object.freeze(['release']),
  owned_release_commands: Object.freeze([
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
  helper_services: Object.freeze([
    'package-surface-service.js',
    'source-manifest-service.js',
    'package-coordinate-service.js',
    'installed-first-read-contract.js'
  ]),
  fallback_commands: Object.freeze([]),
  boundary: Object.freeze({
    packaged_in_npm_tarball_in_this_gate: true,
    no_side_effect_on_require: true,
    no_file_writes_on_require: true,
    no_network: true,
    no_process_exit: true,
    no_dynamic_eval: true,
    no_child_process: true,
    no_legacy_release_package_fallback_commands: true
  })
});

function describePackageServiceSeed() {
  return PACKAGE_SERVICE_SEED;
}

function createPackageService(options = Object.freeze({})) {
  const release = typeof options.release === 'function'
    ? options.release
    : () => Object.freeze({
      schema: 'agent-onboard-public-package-runtime-service-release-result-001',
      status: 'source_only_seed',
      writes_files: false,
      publishes_package: false,
      mutates_registry: false
    });

  return Object.freeze({
    instance_schema: 'agent-onboard-public-package-runtime-service-instance-001',
    seed: PACKAGE_SERVICE_SEED,
    release(args) {
      return release(Array.isArray(args) ? args : []);
    }
  });
}

module.exports = Object.freeze({
  PACKAGE_SERVICE_SEED,
  describePackageServiceSeed,
  createPackageService
});
