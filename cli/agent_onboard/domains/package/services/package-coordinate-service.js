'use strict';

const PACKAGE_COORDINATE_SERVICE_SEED = Object.freeze({
  schema: 'agent-onboard-public-package-coordinate-service-seed-001',
  package_name: 'agent-onboard',
  role: 'packaged_runtime_package_coordinate_service_seed',
  service_path: 'cli/agent_onboard/domains/package/services/package-coordinate-service.js',
  owned_surface: Object.freeze(['package name', 'package version', 'post-publish command coordinates']),
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

function describePackageCoordinateServiceSeed() {
  return PACKAGE_COORDINATE_SERVICE_SEED;
}

module.exports = Object.freeze({
  PACKAGE_COORDINATE_SERVICE_SEED,
  describePackageCoordinateServiceSeed
});
