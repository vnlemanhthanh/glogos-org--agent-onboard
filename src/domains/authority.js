'use strict';

const AUTHORITY_DOMAIN_SECOND_SLICE = Object.freeze({
  schema: 'agent-onboard-public-source-module-authority-second-slice-001',
  domain: 'authority',
  facade: 'authorityService',
  service: 'authorityService',
  source_module: 'src/domains/authority.js',
  slice_status: 'source_only_shadow_module',
  runtime_dependency_status: 'not_required_by_published_cli_runtime',
  extraction_scope: 'authority read-order, first-read, and guard metadata only; write-capable agents command extraction remains excluded',
  exports_public_api: false,
  includes_write_capable_agents_command: false,
  owns_commands: Object.freeze(['authority --first-read', 'authority --check', 'guard --plan', 'guard --check-boundary']),
  excluded_commands: Object.freeze(['agents --write', 'agents --preview']),
  writes_files: false,
  state_writer: false,
  state_files: Object.freeze(['AGENTS.md', 'llms.txt', '.agent-onboard/authority-path.json', 'agent-onboard.target.json', '.agent-onboard/runtime-namespace.json']),
  read_order_paths: Object.freeze([
    'AGENTS.md',
    'llms.txt',
    '.agent-onboard/authority-path.json',
    'agent-onboard.target.json',
    '.agent-onboard/runtime-namespace.json',
    '.agent-onboard/project.json',
    '.agent-onboard/work-items.json',
    'README.md',
    'raw evidence/source files'
  ]),
  output_contract: Object.freeze([
    'authority --first-read reports the canonical read order',
    'authority --check validates first-read authority files when present',
    'guard remains read-only unless an explicit write command is separately authorized',
    'agents write-capable extraction stays out of this slice'
  ]),
  boundary: Object.freeze({
    writes_files: false,
    writes_source_state: false,
    writes_target_repository_state: false,
    git_mutation: false,
    installs_dependencies: false,
    runs_package_manager: false,
    runs_build_test_deploy: false,
    publishes_package: false,
    mutates_registry: false,
    public_import_api: false
  })
});

function cloneFrozen(value) {
  return JSON.parse(JSON.stringify(value));
}

function getAuthorityDomainSecondSlice() {
  return cloneFrozen(AUTHORITY_DOMAIN_SECOND_SLICE);
}

module.exports = {
  AUTHORITY_DOMAIN_SECOND_SLICE,
  getAuthorityDomainSecondSlice
};
