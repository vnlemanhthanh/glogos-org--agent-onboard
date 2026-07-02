'use strict';

const INSTALLED_FIRST_READ_CONTRACT_SEED = Object.freeze({
  schema: 'agent-onboard-public-installed-first-read-contract-service-seed-001',
  package_name: 'agent-onboard',
  role: 'packaged_runtime_installed_first_read_contract_service_seed',
  service_path: 'cli/agent_onboard/domains/package/services/installed-first-read-contract.js',
  owned_surface: Object.freeze(['installed package context first-read expectations']),
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

function describeInstalledFirstReadContractSeed() {
  return INSTALLED_FIRST_READ_CONTRACT_SEED;
}

module.exports = Object.freeze({
  INSTALLED_FIRST_READ_CONTRACT_SEED,
  describeInstalledFirstReadContractSeed
});
