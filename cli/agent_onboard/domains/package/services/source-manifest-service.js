'use strict';

const SOURCE_MANIFEST_SERVICE_SEED = Object.freeze({
  schema: 'agent-onboard-public-source-manifest-service-seed-001',
  package_name: 'agent-onboard',
  role: 'packaged_runtime_source_manifest_service_seed',
  service_path: 'cli/agent_onboard/domains/package/services/source-manifest-service.js',
  owned_surface: Object.freeze(['release fixture source/package context projection']),
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

function describeSourceManifestServiceSeed() {
  return SOURCE_MANIFEST_SERVICE_SEED;
}

module.exports = Object.freeze({
  SOURCE_MANIFEST_SERVICE_SEED,
  describeSourceManifestServiceSeed
});
