'use strict';

const PACKAGE_SURFACE_SERVICE_SEED = Object.freeze({
  schema: 'agent-onboard-public-package-surface-service-seed-001',
  package_name: 'agent-onboard',
  role: 'packaged_runtime_package_surface_service_seed',
  service_path: 'cli/agent_onboard/domains/package/services/package-surface-service.js',
  owned_release_commands: Object.freeze(['release --surface', 'release --surface-check']),
  boundary: Object.freeze({
    packaged_in_npm_tarball_in_this_gate: true,
    no_side_effect_on_require: true,
    no_file_writes_on_require: true,
    no_network: true,
    no_process_exit: true,
    no_dynamic_eval: true,
    no_child_process: true
  })
});

function describePackageSurfaceServiceSeed() {
  return PACKAGE_SURFACE_SERVICE_SEED;
}

function createPackageSurfaceService(options = Object.freeze({})) {
  const surface = typeof options.surface === 'function' ? options.surface : () => PACKAGE_SURFACE_SERVICE_SEED;
  const surfaceCheck = typeof options.surfaceCheck === 'function' ? options.surfaceCheck : () => PACKAGE_SURFACE_SERVICE_SEED;
  return Object.freeze({
    instance_schema: 'agent-onboard-public-package-surface-service-instance-001',
    seed: PACKAGE_SURFACE_SERVICE_SEED,
    surface,
    surfaceCheck
  });
}

module.exports = Object.freeze({
  PACKAGE_SURFACE_SERVICE_SEED,
  describePackageSurfaceServiceSeed,
  createPackageSurfaceService
});
