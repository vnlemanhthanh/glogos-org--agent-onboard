'use strict';

const CLAIMS_DOMAIN_FIRST_SLICE = Object.freeze({
  schema: 'agent-onboard-public-source-module-claims-first-slice-001',
  domain: 'claims',
  facade: 'claimsService',
  service: 'claimsService',
  source_module: 'src/domains/claims.js',
  slice_status: 'source_only_shadow_module_applied',
  runtime_dependency_status: 'not_required_by_published_cli_runtime',
  extraction_scope: 'claim and close command metadata, shared ledger write-boundary metadata, and closure handoff contract only; non-claim work-items behavior remains excluded',
  exports_public_api: false,
  includes_work_items_non_claim_behavior: false,
  declares_shared_work_items_ledger: true,
  owns_commands: Object.freeze([
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
  writes_files: false,
  state_writer: false,
  declares_explicit_write_boundaries: true,
  shared_state_files: Object.freeze(['.agent-onboard/work-items.json']),
  claim_contract: Object.freeze({
    command: 'work-items --claim',
    required_identity: Object.freeze(['id', 'actor']),
    optional_metadata: Object.freeze(['note']),
    writes_only_under_explicit_write: true,
    dry_run_is_default_boundary: true
  }),
  close_contract: Object.freeze({
    command: 'work-items --close',
    required_identity: Object.freeze(['id', 'actor', 'summary']),
    closure_fields: Object.freeze(['actor', 'closed_at', 'summary', 'changed_files', 'checks_run', 'checks_not_run', 'known_non_pass']),
    writes_only_under_explicit_write: true,
    dry_run_is_default_boundary: true
  }),
  output_contract: Object.freeze([
    'claim and close remain routed through the published CLI adapter',
    'source module is a shadow metadata slice, not a public import API',
    'canonical claim and closure state remains in .agent-onboard/work-items.json',
    'published CLI runtime may omit this source module and use bundled metadata fallback'
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
    public_import_api: false,
    package_allowlist_unchanged: true
  })
});

function cloneFrozen(value) {
  return JSON.parse(JSON.stringify(value));
}

function getClaimsDomainFirstSlice() {
  return cloneFrozen(CLAIMS_DOMAIN_FIRST_SLICE);
}

module.exports = {
  CLAIMS_DOMAIN_FIRST_SLICE,
  getClaimsDomainFirstSlice
};
