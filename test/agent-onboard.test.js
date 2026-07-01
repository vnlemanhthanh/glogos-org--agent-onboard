'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const CLI = path.join(ROOT, 'cli', 'agent-onboard.js');
const PACKAGE_JSON = require(path.join(ROOT, 'package.json'));
const EXPECTED_VERSION = PACKAGE_JSON.version;
const EXPECTED_RELEASE_LINE = 'public_thin_entrypoint_router_cutover_application_gate';
const EXPECTED_VERSIONED_NPX = `npx agent-onboard@${EXPECTED_VERSION}`;
const EXPECTED_PACK_FILES = [
  'LICENSE',
  'README.md',
  'cli/agent-onboard.js',
  'cli/agent_onboard/adapters/commands/architecture.js',
  'cli/agent_onboard/adapters/commands/authority.js',
  'cli/agent_onboard/adapters/commands/core.js',
  'cli/agent_onboard/adapters/commands/release-package.js',
  'cli/agent_onboard/adapters/compatibility-command-port.js',
  'cli/agent_onboard/command-router.js',
  'cli/agent_onboard/ports/compatibility-command-port.js',
  'package.json'
];

function copyExpectedPackFiles(targetRoot) {
  for (const rel of EXPECTED_PACK_FILES) {
    const targetPath = path.join(targetRoot, rel);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.copyFileSync(path.join(ROOT, rel), targetPath);
  }
}

function run(args, opts = {}) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd: opts.cwd || ROOT,
    encoding: 'utf8',
    timeout: 60000,
    maxBuffer: 50 * 1024 * 1024
  });
}

function readJsonOutput(result) {
  assert.strictEqual(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

function readJsonFailure(result) {
  assert.notStrictEqual(result.status, 0, result.stderr || result.stdout || (result.error && result.error.message));
  return JSON.parse(result.stdout);
}

function runNpmPackDryRun() {
  // Avoid child_process shell=true for Node 24 DEP0190, while still handling
  // Windows npm.cmd correctly by invoking cmd.exe explicitly.
  if (process.platform === 'win32') {
    return spawnSync('cmd.exe', ['/d', '/s', '/c', 'npm pack --dry-run --json'], {
      cwd: ROOT,
      encoding: 'utf8',
    timeout: 60000,
    maxBuffer: 50 * 1024 * 1024
    });
  }
  return spawnSync('npm', ['pack', '--dry-run', '--json'], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 60000,
    maxBuffer: 50 * 1024 * 1024
  });
}

function runNpm(args, cwd) {
  if (process.platform === 'win32') {
    return spawnSync('cmd.exe', ['/d', '/s', '/c', ['npm', ...args].join(' ')], {
      cwd,
      encoding: 'utf8',
    timeout: 60000,
    maxBuffer: 50 * 1024 * 1024
    });
  }
  return spawnSync('npm', args, {
    cwd,
    encoding: 'utf8',
    timeout: 60000,
    maxBuffer: 50 * 1024 * 1024
  });
}

function packSourceTarball() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-onboard-pack-'));
  const pack = runNpm(['pack', ROOT, '--json'], dir);
  assert.strictEqual(pack.status, 0, pack.stderr || pack.stdout || (pack.error && pack.error.message));
  const parsed = JSON.parse(pack.stdout);
  assert.strictEqual(parsed.length, 1);
  return path.join(dir, parsed[0].filename);
}

function runNodeScript(script, args, cwd) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd,
    encoding: 'utf8',
    timeout: 60000,
    maxBuffer: 50 * 1024 * 1024
  });
}

function tempRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-onboard-test-'));
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'target-fixture' }, null, 2) + '\n');
  return dir;
}

function cliTargetConfigForTest(dir) {
  const result = run(['target-config', '--template'], { cwd: dir });
  return readJsonOutput(result).target_config;
}

{
  const result = run(['status']);
  const output = readJsonOutput(result);
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.version, EXPECTED_VERSION);
  assert.strictEqual(output.release_line, EXPECTED_RELEASE_LINE);
}

{
  const result = run(['release', '--plan']);
  const output = readJsonOutput(result);
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.schema, 'agent-onboard-public-release-plan-005');
  assert.strictEqual(output.version, EXPECTED_VERSION);
  assert.strictEqual(output.release_line, EXPECTED_RELEASE_LINE);
  assert.strictEqual(output.boundary.publishes_package, false);
  assert.ok(output.post_publish_verification_commands.some((command) => command.includes(`agent-onboard@${EXPECTED_VERSION}`)));
  assert.strictEqual(output.contract_schema, 'agent-onboard-public-release-contract-037');
  assert.strictEqual(output.contract_command, 'agent-onboard release --contract');
  assert.strictEqual(output.fixture_command, 'agent-onboard release --fixture');
  assert.strictEqual(output.parity_smoke_command, 'agent-onboard release --parity-smoke');
  assert.strictEqual(output.architecture_parity_smoke_command, 'agent-onboard release --architecture-parity-smoke');
  assert.strictEqual(output.target_onboarding_smoke_command, 'agent-onboard release --target-onboarding-smoke');
  assert.strictEqual(output.post_publish_handoff_command, 'agent-onboard release --post-publish-handoff');
  assert.strictEqual(output.published_acceptance_command, 'agent-onboard release --published-acceptance');
  assert.strictEqual(output.real_target_trial_command, 'agent-onboard release --real-target-trial');
  assert.strictEqual(output.architecture_map_command, 'agent-onboard architecture --map');
  assert.strictEqual(output.architecture_router_command, 'agent-onboard architecture --router');
  assert.strictEqual(output.architecture_facades_command, 'agent-onboard architecture --facades');
  assert.strictEqual(output.architecture_partition_plan_command, 'agent-onboard architecture --partition-plan');
  assert.strictEqual(output.architecture_partition_check_command, 'agent-onboard architecture --partition-check');
  assert.strictEqual(output.architecture_extraction_rehearsal_command, 'agent-onboard architecture --extraction-rehearsal');
  assert.strictEqual(output.architecture_extraction_check_command, 'agent-onboard architecture --extraction-check');
  assert.strictEqual(output.architecture_first_slice_command, 'agent-onboard architecture --first-slice');
  assert.strictEqual(output.architecture_first_slice_check_command, 'agent-onboard architecture --first-slice-check');
  assert.strictEqual(output.architecture_bundle_parity_command, 'agent-onboard architecture --bundle-parity');
  assert.strictEqual(output.architecture_bundle_parity_check_command, 'agent-onboard architecture --bundle-parity-check');
  assert.strictEqual(output.architecture_runtime_bridge_command, 'agent-onboard architecture --runtime-bridge');
  assert.strictEqual(output.architecture_runtime_bridge_check_command, 'agent-onboard architecture --runtime-bridge-check');
  assert.strictEqual(output.architecture_installed_fallback_smoke_command, 'agent-onboard architecture --installed-fallback-smoke');
  assert.strictEqual(output.architecture_installed_fallback_check_command, 'agent-onboard architecture --installed-fallback-check');
  assert.strictEqual(output.architecture_second_slice_plan_command, 'agent-onboard architecture --second-slice-plan');
  assert.strictEqual(output.architecture_second_slice_check_command, 'agent-onboard architecture --second-slice-check');
  assert.strictEqual(output.architecture_second_slice_first_slice_command, 'agent-onboard architecture --second-slice-first-slice');
  assert.strictEqual(output.architecture_second_slice_first_slice_check_command, 'agent-onboard architecture --second-slice-first-slice-check');
  assert.strictEqual(output.architecture_authority_bundle_parity_command, 'agent-onboard architecture --authority-bundle-parity');
  assert.strictEqual(output.architecture_authority_bundle_parity_check_command, 'agent-onboard architecture --authority-bundle-parity-check');
  assert.strictEqual(output.architecture_authority_runtime_bridge_command, 'agent-onboard architecture --authority-runtime-bridge');
  assert.strictEqual(output.architecture_authority_runtime_bridge_check_command, 'agent-onboard architecture --authority-runtime-bridge-check');
  assert.strictEqual(output.architecture_work_items_plan_command, 'agent-onboard architecture --work-items-plan');
  assert.strictEqual(output.architecture_work_items_check_command, 'agent-onboard architecture --work-items-check');
  assert.strictEqual(output.architecture_work_items_first_slice_command, 'agent-onboard architecture --work-items-first-slice');
  assert.strictEqual(output.architecture_work_items_first_slice_check_command, 'agent-onboard architecture --work-items-first-slice-check');
  assert.strictEqual(output.architecture_work_items_bundle_parity_command, 'agent-onboard architecture --work-items-bundle-parity');
  assert.strictEqual(output.architecture_work_items_bundle_parity_check_command, 'agent-onboard architecture --work-items-bundle-parity-check');
  assert.strictEqual(output.architecture_work_items_runtime_bridge_command, 'agent-onboard architecture --work-items-runtime-bridge');
  assert.strictEqual(output.architecture_work_items_runtime_bridge_check_command, 'agent-onboard architecture --work-items-runtime-bridge-check');
  assert.strictEqual(output.architecture_work_items_installed_fallback_smoke_command, 'agent-onboard architecture --work-items-installed-fallback-smoke');
  assert.strictEqual(output.architecture_work_items_installed_fallback_check_command, 'agent-onboard architecture --work-items-installed-fallback-check');
  assert.strictEqual(output.architecture_claims_plan_command, 'agent-onboard architecture --claims-plan');
  assert.strictEqual(output.architecture_claims_check_command, 'agent-onboard architecture --claims-check');
  assert.strictEqual(output.architecture_claims_first_slice_command, 'agent-onboard architecture --claims-first-slice');
  assert.strictEqual(output.architecture_claims_first_slice_check_command, 'agent-onboard architecture --claims-first-slice-check');
  assert.strictEqual(output.architecture_claims_bundle_parity_command, 'agent-onboard architecture --claims-bundle-parity');
  assert.strictEqual(output.architecture_claims_bundle_parity_check_command, 'agent-onboard architecture --claims-bundle-parity-check');
  assert.strictEqual(output.architecture_claims_runtime_bridge_command, 'agent-onboard architecture --claims-runtime-bridge');
  assert.strictEqual(output.architecture_claims_runtime_bridge_check_command, 'agent-onboard architecture --claims-runtime-bridge-check');
  assert.strictEqual(output.architecture_claims_installed_fallback_smoke_command, 'agent-onboard architecture --claims-installed-fallback-smoke');
  assert.strictEqual(output.architecture_claims_installed_fallback_check_command, 'agent-onboard architecture --claims-installed-fallback-check');
  assert.strictEqual(output.architecture_source_domain_closure_review_command, 'agent-onboard architecture --source-domain-closure-review');
  assert.strictEqual(output.architecture_source_domain_closure_check_command, 'agent-onboard architecture --source-domain-closure-check');
  assert.strictEqual(output.architecture_cli_runtime_plan_command, 'agent-onboard architecture --cli-runtime-plan');
  assert.strictEqual(output.architecture_cli_runtime_check_command, 'agent-onboard architecture --cli-runtime-check');
  assert.strictEqual(output.architecture_compatibility_port_command, 'agent-onboard architecture --compatibility-port');
  assert.strictEqual(output.architecture_compatibility_port_check_command, 'agent-onboard architecture --compatibility-port-check');
  assert.strictEqual(output.architecture_core_adapter_command, 'agent-onboard architecture --core-adapter');
  assert.strictEqual(output.architecture_core_adapter_check_command, 'agent-onboard architecture --core-adapter-check');
  assert.strictEqual(output.architecture_package_adapter_command, 'agent-onboard architecture --package-adapter');
  assert.strictEqual(output.architecture_package_adapter_check_command, 'agent-onboard architecture --package-adapter-check');
  assert.strictEqual(output.architecture_architecture_adapter_command, 'agent-onboard architecture --architecture-adapter');
  assert.strictEqual(output.architecture_architecture_adapter_check_command, 'agent-onboard architecture --architecture-adapter-check');
  assert.strictEqual(output.architecture_authority_adapter_command, 'agent-onboard architecture --authority-adapter');
  assert.strictEqual(output.architecture_authority_adapter_check_command, 'agent-onboard architecture --authority-adapter-check');
  assert.strictEqual(output.architecture_module_inclusion_plan_command, 'agent-onboard architecture --module-inclusion-plan');
  assert.strictEqual(output.architecture_module_inclusion_check_command, 'agent-onboard architecture --module-inclusion-check');
  assert.strictEqual(output.architecture_packaged_router_port_command, 'agent-onboard architecture --packaged-router-port');
  assert.strictEqual(output.architecture_packaged_router_port_check_command, 'agent-onboard architecture --packaged-router-port-check');
  assert.strictEqual(output.architecture_thin_entrypoint_rehearsal_command, 'agent-onboard architecture --thin-entrypoint-rehearsal');
  assert.strictEqual(output.architecture_thin_entrypoint_rehearsal_check_command, 'agent-onboard architecture --thin-entrypoint-rehearsal-check');
  assert.strictEqual(output.architecture_thin_entrypoint_cutover_command, 'agent-onboard architecture --thin-entrypoint-cutover');
  assert.strictEqual(output.architecture_thin_entrypoint_cutover_check_command, 'agent-onboard architecture --thin-entrypoint-cutover-check');
  assert.strictEqual(output.architecture_check_command, 'agent-onboard architecture --check');
  assert.strictEqual(output.authority_first_read_command, 'agent-onboard authority --first-read');
  assert.strictEqual(output.authority_check_command, 'agent-onboard authority --check');
}



{
  const result = run(['release', '--contract']);
  const output = readJsonOutput(result);
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.schema, 'agent-onboard-public-release-contract-response-001');
  assert.strictEqual(output.version, EXPECTED_VERSION);
  assert.strictEqual(output.release_line, EXPECTED_RELEASE_LINE);
  assert.strictEqual(output.contract.schema, 'agent-onboard-public-release-contract-037');
  assert.strictEqual(output.contract.contract_command, 'agent-onboard release --contract');
  assert.strictEqual(output.contract.fixture_command, 'agent-onboard release --fixture');
  assert.strictEqual(output.contract.parity_smoke_command, 'agent-onboard release --parity-smoke');
  assert.strictEqual(output.contract.architecture_parity_smoke_command, 'agent-onboard release --architecture-parity-smoke');
  assert.strictEqual(output.contract.target_onboarding_smoke_command, 'agent-onboard release --target-onboarding-smoke');
  assert.strictEqual(output.contract.post_publish_handoff_command, 'agent-onboard release --post-publish-handoff');
  assert.strictEqual(output.contract.published_acceptance_command, 'agent-onboard release --published-acceptance');
  assert.strictEqual(output.contract.real_target_trial_command, 'agent-onboard release --real-target-trial');
  assert.strictEqual(output.contract.architecture_map_command, 'agent-onboard architecture --map');
  assert.strictEqual(output.contract.architecture_router_command, 'agent-onboard architecture --router');
  assert.strictEqual(output.contract.architecture_facades_command, 'agent-onboard architecture --facades');
  assert.strictEqual(output.contract.architecture_partition_plan_command, 'agent-onboard architecture --partition-plan');
  assert.strictEqual(output.contract.architecture_partition_check_command, 'agent-onboard architecture --partition-check');
  assert.strictEqual(output.contract.architecture_extraction_rehearsal_command, 'agent-onboard architecture --extraction-rehearsal');
  assert.strictEqual(output.contract.architecture_extraction_check_command, 'agent-onboard architecture --extraction-check');
  assert.strictEqual(output.contract.architecture_first_slice_command, 'agent-onboard architecture --first-slice');
  assert.strictEqual(output.contract.architecture_first_slice_check_command, 'agent-onboard architecture --first-slice-check');
  assert.strictEqual(output.contract.architecture_bundle_parity_command, 'agent-onboard architecture --bundle-parity');
  assert.strictEqual(output.contract.architecture_bundle_parity_check_command, 'agent-onboard architecture --bundle-parity-check');
  assert.strictEqual(output.contract.architecture_runtime_bridge_command, 'agent-onboard architecture --runtime-bridge');
  assert.strictEqual(output.contract.architecture_runtime_bridge_check_command, 'agent-onboard architecture --runtime-bridge-check');
  assert.strictEqual(output.contract.architecture_installed_fallback_smoke_command, 'agent-onboard architecture --installed-fallback-smoke');
  assert.strictEqual(output.contract.architecture_installed_fallback_check_command, 'agent-onboard architecture --installed-fallback-check');
  assert.strictEqual(output.contract.architecture_second_slice_plan_command, 'agent-onboard architecture --second-slice-plan');
  assert.strictEqual(output.contract.architecture_second_slice_check_command, 'agent-onboard architecture --second-slice-check');
  assert.strictEqual(output.contract.architecture_second_slice_first_slice_command, 'agent-onboard architecture --second-slice-first-slice');
  assert.strictEqual(output.contract.architecture_second_slice_first_slice_check_command, 'agent-onboard architecture --second-slice-first-slice-check');
  assert.strictEqual(output.contract.architecture_authority_bundle_parity_command, 'agent-onboard architecture --authority-bundle-parity');
  assert.strictEqual(output.contract.architecture_authority_bundle_parity_check_command, 'agent-onboard architecture --authority-bundle-parity-check');
  assert.strictEqual(output.contract.architecture_authority_runtime_bridge_command, 'agent-onboard architecture --authority-runtime-bridge');
  assert.strictEqual(output.contract.architecture_authority_runtime_bridge_check_command, 'agent-onboard architecture --authority-runtime-bridge-check');
  assert.strictEqual(output.contract.architecture_work_items_plan_command, 'agent-onboard architecture --work-items-plan');
  assert.strictEqual(output.contract.architecture_work_items_check_command, 'agent-onboard architecture --work-items-check');
  assert.strictEqual(output.contract.architecture_work_items_first_slice_command, 'agent-onboard architecture --work-items-first-slice');
  assert.strictEqual(output.contract.architecture_work_items_first_slice_check_command, 'agent-onboard architecture --work-items-first-slice-check');
  assert.strictEqual(output.contract.architecture_work_items_bundle_parity_command, 'agent-onboard architecture --work-items-bundle-parity');
  assert.strictEqual(output.contract.architecture_work_items_bundle_parity_check_command, 'agent-onboard architecture --work-items-bundle-parity-check');
  assert.strictEqual(output.contract.architecture_work_items_runtime_bridge_command, 'agent-onboard architecture --work-items-runtime-bridge');
  assert.strictEqual(output.contract.architecture_work_items_runtime_bridge_check_command, 'agent-onboard architecture --work-items-runtime-bridge-check');
  assert.strictEqual(output.contract.architecture_work_items_installed_fallback_smoke_command, 'agent-onboard architecture --work-items-installed-fallback-smoke');
  assert.strictEqual(output.contract.architecture_work_items_installed_fallback_check_command, 'agent-onboard architecture --work-items-installed-fallback-check');
  assert.strictEqual(output.contract.architecture_claims_plan_command, 'agent-onboard architecture --claims-plan');
  assert.strictEqual(output.contract.architecture_claims_check_command, 'agent-onboard architecture --claims-check');
  assert.strictEqual(output.contract.architecture_claims_first_slice_command, 'agent-onboard architecture --claims-first-slice');
  assert.strictEqual(output.contract.architecture_claims_first_slice_check_command, 'agent-onboard architecture --claims-first-slice-check');
  assert.strictEqual(output.contract.architecture_claims_bundle_parity_command, 'agent-onboard architecture --claims-bundle-parity');
  assert.strictEqual(output.contract.architecture_claims_bundle_parity_check_command, 'agent-onboard architecture --claims-bundle-parity-check');
  assert.strictEqual(output.contract.architecture_claims_runtime_bridge_command, 'agent-onboard architecture --claims-runtime-bridge');
  assert.strictEqual(output.contract.architecture_claims_runtime_bridge_check_command, 'agent-onboard architecture --claims-runtime-bridge-check');
  assert.strictEqual(output.contract.architecture_claims_installed_fallback_smoke_command, 'agent-onboard architecture --claims-installed-fallback-smoke');
  assert.strictEqual(output.contract.architecture_claims_installed_fallback_check_command, 'agent-onboard architecture --claims-installed-fallback-check');
  assert.strictEqual(output.contract.architecture_source_domain_closure_review_command, 'agent-onboard architecture --source-domain-closure-review');
  assert.strictEqual(output.contract.architecture_source_domain_closure_check_command, 'agent-onboard architecture --source-domain-closure-check');
  assert.strictEqual(output.contract.architecture_cli_runtime_plan_command, 'agent-onboard architecture --cli-runtime-plan');
  assert.strictEqual(output.contract.architecture_cli_runtime_check_command, 'agent-onboard architecture --cli-runtime-check');
  assert.strictEqual(output.contract.architecture_compatibility_port_command, 'agent-onboard architecture --compatibility-port');
  assert.strictEqual(output.contract.architecture_compatibility_port_check_command, 'agent-onboard architecture --compatibility-port-check');
  assert.strictEqual(output.contract.architecture_core_adapter_command, 'agent-onboard architecture --core-adapter');
  assert.strictEqual(output.contract.architecture_core_adapter_check_command, 'agent-onboard architecture --core-adapter-check');
  assert.strictEqual(output.contract.architecture_package_adapter_command, 'agent-onboard architecture --package-adapter');
  assert.strictEqual(output.contract.architecture_package_adapter_check_command, 'agent-onboard architecture --package-adapter-check');
  assert.strictEqual(output.contract.architecture_architecture_adapter_command, 'agent-onboard architecture --architecture-adapter');
  assert.strictEqual(output.contract.architecture_architecture_adapter_check_command, 'agent-onboard architecture --architecture-adapter-check');
  assert.strictEqual(output.contract.architecture_authority_adapter_command, 'agent-onboard architecture --authority-adapter');
  assert.strictEqual(output.contract.architecture_authority_adapter_check_command, 'agent-onboard architecture --authority-adapter-check');
  assert.strictEqual(output.contract.architecture_module_inclusion_plan_command, 'agent-onboard architecture --module-inclusion-plan');
  assert.strictEqual(output.contract.architecture_module_inclusion_check_command, 'agent-onboard architecture --module-inclusion-check');
  assert.strictEqual(output.contract.architecture_packaged_router_port_command, 'agent-onboard architecture --packaged-router-port');
  assert.strictEqual(output.contract.architecture_packaged_router_port_check_command, 'agent-onboard architecture --packaged-router-port-check');
  assert.strictEqual(output.contract.architecture_thin_entrypoint_rehearsal_command, 'agent-onboard architecture --thin-entrypoint-rehearsal');
  assert.strictEqual(output.contract.architecture_thin_entrypoint_rehearsal_check_command, 'agent-onboard architecture --thin-entrypoint-rehearsal-check');
  assert.strictEqual(output.contract.architecture_thin_entrypoint_cutover_command, 'agent-onboard architecture --thin-entrypoint-cutover');
  assert.strictEqual(output.contract.architecture_thin_entrypoint_cutover_check_command, 'agent-onboard architecture --thin-entrypoint-cutover-check');
  assert.strictEqual(output.contract.architecture_check_command, 'agent-onboard architecture --check');
  assert.strictEqual(output.contract.authority_first_read_command, 'agent-onboard authority --first-read');
  assert.strictEqual(output.contract.authority_check_command, 'agent-onboard authority --check');
  assert.strictEqual(output.contract.target_runtime_namespace_command, 'agent-onboard target runtime --namespace');
  assert.strictEqual(output.contract.target_runtime_check_command, 'agent-onboard target runtime --check');
  assert.strictEqual(output.contract.package_surface_command, 'agent-onboard release --surface');
  assert.strictEqual(output.contract.package_surface_check_command, 'agent-onboard release --surface-check');
  assert.deepStrictEqual(output.contract.expected_pack_files, EXPECTED_PACK_FILES);
  assert.strictEqual(output.publishes_package, false);
}

{
  const result = run(['release', '--fixture']);
  const output = readJsonOutput(result);
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.schema, 'agent-onboard-public-release-fixture-response-001');
  assert.strictEqual(output.version, EXPECTED_VERSION);
  assert.strictEqual(output.release_line, EXPECTED_RELEASE_LINE);
  assert.strictEqual(output.contract_schema, 'agent-onboard-public-release-contract-037');
  assert.strictEqual(output.fixture_matrix.schema, 'agent-onboard-public-release-fixture-matrix-022');
  assert.ok(output.fixture_matrix.fixtures.some((fixture) => fixture.id === 'stale_package_version_contract'));
  assert.ok(output.fixture_matrix.fixtures.some((fixture) => fixture.id === 'pack_allowlist_drift_contract'));
  assert.ok(output.fixture_matrix.fixtures.some((fixture) => fixture.id === 'missing_bin_entrypoint_contract'));
  assert.ok(output.fixture_matrix.fixtures.some((fixture) => fixture.id === 'projected_installed_package_parity_smoke'));
  assert.ok(output.fixture_matrix.fixtures.some((fixture) => fixture.id === 'target_onboarding_installed_package_smoke'));
  assert.ok(output.fixture_matrix.fixtures.some((fixture) => fixture.id === 'target_onboarding_post_publish_handoff'));
  assert.ok(output.fixture_matrix.fixtures.some((fixture) => fixture.id === 'target_onboarding_real_target_repo_trial'));
  assert.ok(output.fixture_matrix.fixtures.some((fixture) => fixture.id === 'public_architecture_map'));
  assert.ok(output.fixture_matrix.fixtures.some((fixture) => fixture.id === 'public_command_router_boundary'));
  assert.ok(output.fixture_matrix.fixtures.some((fixture) => fixture.id === 'public_domain_service_facades'));
  assert.ok(output.fixture_matrix.fixtures.some((fixture) => fixture.id === 'public_authority_first_read_index'));
  assert.ok(output.fixture_matrix.fixtures.some((fixture) => fixture.id === 'public_target_runtime_namespace'));
  assert.ok(output.fixture_matrix.fixtures.some((fixture) => fixture.id === 'public_package_surface_preservation'));
  assert.ok(output.fixture_matrix.fixtures.some((fixture) => fixture.id === 'public_installed_parity_architecture_smoke'));
  assert.ok(output.fixture_matrix.fixtures.some((fixture) => fixture.id === 'public_source_domain_module_partition_plan'));
  assert.ok(output.fixture_matrix.fixtures.some((fixture) => fixture.id === 'public_source_domain_extraction_rehearsal'));
  assert.ok(output.fixture_matrix.fixtures.some((fixture) => fixture.id === 'public_source_extraction_golden_output_freeze'));
  assert.ok(output.fixture_matrix.fixtures.some((fixture) => fixture.id === 'public_source_module_extraction_adapter_boundary'));
  assert.ok(output.fixture_matrix.fixtures.some((fixture) => fixture.id === 'public_source_module_extraction_first_slice'));
  assert.ok(output.fixture_matrix.fixtures.some((fixture) => fixture.id === 'public_source_module_extraction_bundle_parity'));
  assert.ok(output.fixture_matrix.fixtures.some((fixture) => fixture.id === 'public_source_module_extraction_runtime_bridge'));
  assert.ok(output.fixture_matrix.fixtures.some((fixture) => fixture.id === 'public_source_module_extraction_installed_fallback_smoke'));
  assert.ok(output.fixture_matrix.fixtures.some((fixture) => fixture.id === 'public_source_module_extraction_second_slice_plan'));
  assert.ok(output.fixture_matrix.fixtures.some((fixture) => fixture.id === 'public_source_module_extraction_second_slice_first_slice'));
  assert.ok(output.fixture_matrix.fixtures.some((fixture) => fixture.id === 'public_source_module_extraction_authority_bundle_parity'));
  assert.ok(output.fixture_matrix.fixtures.some((fixture) => fixture.id === 'public_source_module_extraction_authority_runtime_bridge'));
  assert.ok(output.fixture_matrix.fixtures.some((fixture) => fixture.id === 'public_work_items_domain_source_extraction_plan'));
  assert.ok(output.fixture_matrix.fixtures.some((fixture) => fixture.id === 'public_work_items_domain_source_extraction_first_slice'));
  assert.ok(output.fixture_matrix.fixtures.some((fixture) => fixture.id === 'public_work_items_domain_source_extraction_bundle_parity'));
  assert.ok(output.fixture_matrix.fixtures.some((fixture) => fixture.id === 'public_work_items_domain_source_extraction_installed_fallback_smoke'));
  assert.ok(output.fixture_matrix.fixtures.some((fixture) => fixture.id === 'public_architecture_m1_closure_m2_seed'));
  assert.ok(output.fixture_matrix.fixtures.some((fixture) => fixture.id === 'public_version_reference_policy'));
  assert.strictEqual(output.writes_files, false);
  assert.strictEqual(output.publishes_package, false);
}


{
  const result = run(['architecture', '--map']);
  const output = readJsonOutput(result);
  assert.strictEqual(output.schema, 'agent-onboard-public-architecture-map-result-001');
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.version, EXPECTED_VERSION);
  assert.strictEqual(output.release_line, EXPECTED_RELEASE_LINE);
  assert.strictEqual(output.command, 'agent-onboard architecture --map');
  assert.strictEqual(output.map.public_source_shape.source_partition_plan_file, '.agent-onboard/source-partition-plan.json');
  assert.strictEqual(output.map.public_source_shape.source_extraction_rehearsal_file, '.agent-onboard/source-extraction-rehearsal.json');
  assert.strictEqual(output.map.public_source_shape.physical_domain_split_status, 'cli_runtime_de_monolith_planning_applied');
  assert.strictEqual(output.map.public_source_shape.source_extraction_golden_outputs_file, '.agent-onboard/source-extraction-golden-outputs.json');
  assert.strictEqual(output.map.public_source_shape.source_module_extraction_adapter_boundary_file, '.agent-onboard/source-module-extraction-adapter-boundary.json');
  assert.strictEqual(output.map.public_source_shape.source_module_extraction_first_slice_file, '.agent-onboard/source-module-extraction-first-slice.json');
  assert.strictEqual(output.map.public_source_shape.source_module_extraction_bundle_parity_file, '.agent-onboard/source-module-extraction-bundle-parity.json');
  assert.strictEqual(output.map.public_source_shape.source_module_extraction_runtime_bridge_file, '.agent-onboard/source-module-extraction-runtime-bridge.json');
  assert.strictEqual(output.map.public_source_shape.source_module_extraction_installed_fallback_smoke_file, '.agent-onboard/source-module-extraction-installed-fallback-smoke.json');
  assert.strictEqual(output.map.public_source_shape.source_module_extraction_second_slice_plan_file, '.agent-onboard/source-module-extraction-second-slice-plan.json');
  assert.strictEqual(output.map.public_source_shape.source_module_extraction_second_slice_first_slice_file, '.agent-onboard/source-module-extraction-second-slice-first-slice.json');
  assert.strictEqual(output.map.public_source_shape.source_module_extraction_second_slice_first_slice_module, 'src/domains/authority.js');
  assert.strictEqual(output.map.public_source_shape.source_module_extraction_authority_bundle_parity_file, '.agent-onboard/source-module-extraction-authority-bundle-parity.json');
  assert.strictEqual(output.map.public_source_shape.source_module_extraction_authority_runtime_bridge_file, '.agent-onboard/source-module-extraction-authority-runtime-bridge.json');
  assert.strictEqual(output.map.public_source_shape.work_items_domain_source_extraction_plan_file, '.agent-onboard/source-module-extraction-work-items-plan.json');
  assert.strictEqual(output.map.public_source_shape.work_items_domain_source_extraction_planned_module, 'src/domains/work-items.js');
  assert.strictEqual(output.map.public_source_shape.work_items_domain_source_extraction_first_slice_file, '.agent-onboard/source-module-extraction-work-items-first-slice.json');
  assert.strictEqual(output.map.public_source_shape.work_items_domain_source_extraction_bundle_parity_file, '.agent-onboard/source-module-extraction-work-items-bundle-parity.json');
  assert.strictEqual(output.map.public_source_shape.work_items_domain_source_extraction_runtime_bridge_file, '.agent-onboard/source-module-extraction-work-items-runtime-bridge.json');
  assert.strictEqual(output.map.public_source_shape.work_items_domain_source_extraction_installed_fallback_smoke_file, '.agent-onboard/source-module-extraction-work-items-installed-fallback-smoke.json');
  assert.strictEqual(output.map.public_source_shape.claims_domain_source_extraction_plan_file, '.agent-onboard/source-module-extraction-claims-plan.json');
  assert.strictEqual(output.map.public_source_shape.claims_domain_source_extraction_first_slice_file, '.agent-onboard/source-module-extraction-claims-first-slice.json');
  assert.strictEqual(output.map.public_source_shape.claims_domain_source_extraction_bundle_parity_file, '.agent-onboard/source-module-extraction-claims-bundle-parity.json');
  assert.strictEqual(output.map.public_source_shape.claims_domain_source_extraction_runtime_bridge_file, '.agent-onboard/source-module-extraction-claims-runtime-bridge.json');
  assert.strictEqual(output.map.public_source_shape.claims_domain_source_extraction_installed_fallback_smoke_file, '.agent-onboard/source-module-extraction-claims-installed-fallback-smoke.json');
  assert.strictEqual(output.map.public_source_shape.source_domain_extraction_stabilization_closure_review_file, '.agent-onboard/source-domain-extraction-stabilization-closure-review.json');
  assert.strictEqual(output.map.public_source_shape.claims_domain_source_extraction_module, 'src/domains/claims.js');
  assert.strictEqual(output.map.public_source_shape.work_items_domain_source_extraction_module, 'src/domains/work-items.js');
  assert.strictEqual(output.map.public_source_shape.source_module_extraction_authority_bundle_parity_module, 'src/domains/authority.js');
  assert.strictEqual(output.map.public_source_shape.source_module_extraction_second_slice_planned_module, 'src/domains/authority.js');
  assert.strictEqual(output.map.public_source_shape.source_module_extraction_first_slice_module, 'src/domains/core.js');
  assert.deepStrictEqual(output.map.canonical_domains.map((domain) => domain.id), ['core', 'authority', 'work_items', 'claims', 'target', 'release_package']);
  assert.deepStrictEqual(output.current_runtime.expected_pack_files, EXPECTED_PACK_FILES);
  assert.strictEqual(output.boundary.writes_files, false);
  assert.strictEqual(output.boundary.writes_target_repository_state, false);
}

{
  const result = run(['architecture', '--router']);
  const output = readJsonOutput(result);
  assert.strictEqual(output.schema, 'agent-onboard-public-command-router-result-001');
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.version, EXPECTED_VERSION);
  assert.strictEqual(output.release_line, EXPECTED_RELEASE_LINE);
  assert.strictEqual(output.command, 'agent-onboard architecture --router');
  assert.strictEqual(output.router.dispatch_mode, 'table_driven_top_level_router');
  assert.strictEqual(output.router.dispatcher, 'dispatchCommand');
  assert.deepStrictEqual(output.route_commands, ['help', 'version', 'status', 'init', 'agents', 'guard', 'authority', 'architecture', 'release', 'target-config', 'work-items', 'target', 'target-instance']);
  assert.strictEqual(output.router.boundary.unsupported_commands_fail_closed, true);
  assert.strictEqual(output.boundary.writes_files, false);
}

{
  const result = run(['architecture', '--facades']);
  const output = readJsonOutput(result);
  assert.strictEqual(output.schema, 'agent-onboard-public-domain-service-facades-result-001');
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.version, EXPECTED_VERSION);
  assert.strictEqual(output.release_line, EXPECTED_RELEASE_LINE);
  assert.strictEqual(output.command, 'agent-onboard architecture --facades');
  assert.deepStrictEqual(output.facade_ids, ['core', 'authority', 'work_items', 'claims', 'target', 'release_package']);
  assert.deepStrictEqual(output.service_names, ['coreService', 'authorityService', 'workItemsService', 'claimsService', 'targetService', 'releasePackageService']);
  assert.ok(output.router_routes.every((route) => route.facade));
  assert.strictEqual(output.boundary.writes_files, false);
}

{
  const result = run(['architecture', '--partition-plan']);
  const output = readJsonOutput(result);
  assert.strictEqual(output.schema, 'agent-onboard-public-source-domain-module-partition-plan-result-001');
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.version, EXPECTED_VERSION);
  assert.strictEqual(output.release_line, EXPECTED_RELEASE_LINE);
  assert.strictEqual(output.command, 'agent-onboard architecture --partition-plan');
  assert.strictEqual(output.plan_file, '.agent-onboard/source-partition-plan.json');
  assert.strictEqual(output.plan.current_shape.physical_module_partition_status, 'planned_not_applied');
  assert.deepStrictEqual(output.plan.planned_source_modules.map((module) => module.domain), ['core', 'authority', 'work_items', 'claims', 'target', 'release_package']);
  assert.strictEqual(output.plan.boundary.moves_source_files, false);
  assert.strictEqual(output.boundary.writes_files, false);
}

{
  const result = run(['architecture', '--partition-check']);
  const output = readJsonOutput(result);
  assert.strictEqual(output.schema, 'agent-onboard-public-source-domain-module-partition-plan-check-result-001');
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.version, EXPECTED_VERSION);
  assert.strictEqual(output.validated.planned_module_count, true);
  assert.strictEqual(output.validated.planned_modules_map_to_facades, true);
  assert.strictEqual(output.validated.physical_partition_not_applied, true);
  assert.strictEqual(output.validated.partition_commands_no_write, true);
  assert.strictEqual(output.validated.package_allowlist_unchanged, true);
  assert.strictEqual(output.validated.source_plan_file, true);
  assert.strictEqual(output.source_plan_file.status, 'present_validated');
  assert.deepStrictEqual(output.errors, []);
}

{
  const result = run(['architecture', '--extraction-rehearsal']);
  const output = readJsonOutput(result);
  assert.strictEqual(output.schema, 'agent-onboard-public-source-domain-extraction-rehearsal-result-001');
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.version, EXPECTED_VERSION);
  assert.strictEqual(output.release_line, EXPECTED_RELEASE_LINE);
  assert.strictEqual(output.command, 'agent-onboard architecture --extraction-rehearsal');
  assert.strictEqual(output.rehearsal_file, '.agent-onboard/source-extraction-rehearsal.json');
  assert.strictEqual(output.rehearsal.rehearsal_status, 'rehearsed_not_applied');
  assert.strictEqual(output.rehearsal.extraction_rehearsal_units.length, 6);
  assert.deepStrictEqual(output.physical_module_paths_present, ['src/domains/core.js', 'src/domains/authority.js', 'src/domains/work-items.js', 'src/domains/claims.js']);
  assert.strictEqual(output.boundary.creates_source_modules, false);
}

{
  const result = run(['architecture', '--extraction-check']);
  const output = readJsonOutput(result);
  assert.strictEqual(output.schema, 'agent-onboard-public-source-domain-extraction-rehearsal-check-result-001');
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.version, EXPECTED_VERSION);
  assert.strictEqual(output.validated.partition_plan, true);
  assert.strictEqual(output.validated.rehearsal_unit_count, true);
  assert.strictEqual(output.validated.no_physical_modules_created, true);
  assert.strictEqual(output.validated.extraction_commands_no_write, true);
  assert.strictEqual(output.validated.package_allowlist_unchanged, true);
  assert.deepStrictEqual(output.errors, []);
}

{
  const result = run(['authority', '--first-read']);
  const output = readJsonOutput(result);
  assert.strictEqual(output.schema, 'agent-onboard-public-authority-first-read-result-001');
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.version, EXPECTED_VERSION);
  assert.strictEqual(output.release_line, EXPECTED_RELEASE_LINE);
  assert.strictEqual(output.command, 'agent-onboard authority --first-read');
  assert.deepStrictEqual(output.read_order.map((entry) => entry.path), ['AGENTS.md', 'llms.txt', '.agent-onboard/authority-path.json', 'agent-onboard.target.json', '.agent-onboard/runtime-namespace.json', '.agent-onboard/project.json', '.agent-onboard/work-items.json', 'README.md', 'raw evidence/source files']);
  assert.strictEqual(output.boundary.writes_files, false);
}

{
  const result = run(['authority', '--check']);
  const output = readJsonOutput(result);
  assert.strictEqual(output.schema, 'agent-onboard-public-authority-first-read-check-result-001');
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.validated.first_read_order, true);
  assert.strictEqual(output.validated.authority_commands_no_write, true);
  assert.strictEqual(output.validated.source_authority_files, true);
  assert.ok(output.source_files_present.includes('llms.txt'));
  assert.ok(output.source_files_present.includes('.agent-onboard/authority-path.json'));
}

{
  const result = run(['target', 'runtime', '--namespace']);
  const output = readJsonOutput(result);
  assert.strictEqual(output.schema, 'agent-onboard-public-target-runtime-namespace-result-001');
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.version, EXPECTED_VERSION);
  assert.strictEqual(output.release_line, EXPECTED_RELEASE_LINE);
  assert.strictEqual(output.command, 'agent-onboard target runtime --namespace');
  assert.strictEqual(output.namespace_root, '.agent-onboard');
  assert.strictEqual(output.namespace_file, '.agent-onboard/runtime-namespace.json');
  assert.deepStrictEqual(output.canonical_runtime_files.map((entry) => entry.path), ['.agent-onboard/runtime-namespace.json', '.agent-onboard/project.json', '.agent-onboard/work-items.json', '.agent-onboard/authority-path.json']);
  assert.strictEqual(output.boundary.writes_files, false);
}

{
  const result = run(['target', 'runtime', '--check']);
  const output = readJsonOutput(result);
  assert.strictEqual(output.schema, 'agent-onboard-public-target-runtime-namespace-check-result-001');
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.validated.namespace_root, true);
  assert.strictEqual(output.validated.namespace_file, true);
  assert.strictEqual(output.validated.runtime_file_order, true);
  assert.strictEqual(output.validated.target_onboarding_canonical_file, true);
  assert.strictEqual(output.validated.target_onboarding_write_set, true);
  assert.strictEqual(output.validated.reserved_future_files_not_written, true);
  assert.strictEqual(output.validated.runtime_commands_no_write, true);
  assert.strictEqual(output.validated.source_runtime_namespace_file, true);
  assert.ok(output.target_onboarding_canonical_files.includes('.agent-onboard/runtime-namespace.json'));
  assert.deepStrictEqual(output.errors, []);
}


{
  const result = run(['release', '--surface']);
  const output = readJsonOutput(result);
  assert.strictEqual(output.schema, 'agent-onboard-public-package-surface-preservation-result-001');
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.version, EXPECTED_VERSION);
  assert.strictEqual(output.release_line, EXPECTED_RELEASE_LINE);
  assert.strictEqual(output.command, 'agent-onboard release --surface');
  assert.deepStrictEqual(output.expected_pack_files, EXPECTED_PACK_FILES);
  assert.deepStrictEqual(output.projected_pack_files, EXPECTED_PACK_FILES);
  assert.ok(output.source_only_files.includes('AGENTS.md'));
  assert.ok(output.source_only_files.includes('.agent-onboard/work-items.json'));
  assert.strictEqual(output.source_only_files_projected_into_pack.length, 0);
  assert.strictEqual(output.boundary.runs_package_manager, false);
}

{
  const result = run(['release', '--surface-check']);
  const output = readJsonOutput(result);
  assert.strictEqual(output.schema, 'agent-onboard-public-package-surface-preservation-check-result-001');
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.version, EXPECTED_VERSION);
  assert.strictEqual(output.validated.controlled_modular_package_surface, true);
  assert.strictEqual(output.validated.package_json_files_allowlist, true);
  assert.strictEqual(output.validated.source_only_context_excluded_from_pack, true);
  assert.strictEqual(output.validated.bin_entrypoints_in_pack, true);
  assert.strictEqual(output.validated.public_artifact_messaging, true);
  assert.strictEqual(output.validated.surface_commands_no_write, true);
  assert.deepStrictEqual(output.errors, []);
}

{
  const result = run(['architecture', '--check']);
  const output = readJsonOutput(result);
  assert.strictEqual(output.schema, 'agent-onboard-public-architecture-check-result-001');
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.version, EXPECTED_VERSION);
  assert.strictEqual(output.validated.domain_count, true);
  assert.strictEqual(output.validated.domain_order, true);
  assert.strictEqual(output.validated.compact_package_boundary, true);
  assert.strictEqual(output.validated.architecture_commands_no_write, true);
  assert.strictEqual(output.validated.command_router_boundary, true);
  assert.strictEqual(output.validated.domain_service_facades, true);
  assert.strictEqual(output.validated.authority_first_read_index, true);
  assert.strictEqual(output.validated.target_runtime_namespace, true);
  assert.strictEqual(output.validated.source_domain_module_partition_plan, true);
  assert.strictEqual(output.validated.source_domain_extraction_rehearsal, true);
  assert.strictEqual(output.command_router.status, 'ok');
  assert.strictEqual(output.domain_service_facades.status, 'ok');
  assert.strictEqual(output.target_runtime_namespace.status, 'ok');
  assert.strictEqual(output.source_domain_module_partition_plan.status, 'ok');
  assert.strictEqual(output.source_domain_extraction_rehearsal.status, 'ok');
  assert.deepStrictEqual(output.errors, []);
}

{
  const result = run(['release', '--parity-smoke']);
  const output = readJsonOutput(result);
  assert.strictEqual(output.schema, 'agent-onboard-public-installed-package-parity-smoke-result-001');
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.version, EXPECTED_VERSION);
  assert.strictEqual(output.release_line, EXPECTED_RELEASE_LINE);
  assert.strictEqual(output.command, 'agent-onboard release --parity-smoke');
  assert.strictEqual(output.parity.source_candidate_release_check, true);
  assert.strictEqual(output.parity.source_context_excluded_from_pack, true);
  assert.strictEqual(output.parity.bin_entrypoints_in_pack, true);
  assert.strictEqual(output.parity.runtime_version_matches_package_json, true);
  assert.strictEqual(output.boundary.runs_package_manager, false);
  assert.strictEqual(output.boundary.creates_temp_files, false);
}

{
  const result = run(['release', '--architecture-parity-smoke']);
  const output = readJsonOutput(result);
  assert.strictEqual(output.schema, 'agent-onboard-public-installed-parity-architecture-smoke-result-001');
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.version, EXPECTED_VERSION);
  assert.strictEqual(output.release_line, EXPECTED_RELEASE_LINE);
  assert.strictEqual(output.command, 'agent-onboard release --architecture-parity-smoke');
  assert.strictEqual(output.parity.architecture_check, true);
  assert.strictEqual(output.parity.authority_first_read_check, true);
  assert.strictEqual(output.parity.target_runtime_namespace_check, true);
  assert.strictEqual(output.parity.package_surface_check, true);
  assert.strictEqual(output.parity.source_domain_module_partition_plan_check, true);
  assert.strictEqual(output.parity.source_domain_extraction_rehearsal_check, true);
  assert.strictEqual(output.boundary.runs_package_manager, false);
  assert.strictEqual(output.boundary.creates_temp_files, false);
}


{
  const result = run(['release', '--target-onboarding-smoke']);
  const output = readJsonOutput(result);
  assert.strictEqual(output.schema, 'agent-onboard-public-target-onboarding-installed-package-smoke-result-001');
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.version, EXPECTED_VERSION);
  assert.strictEqual(output.release_line, EXPECTED_RELEASE_LINE);
  assert.strictEqual(output.command, 'agent-onboard release --target-onboarding-smoke');
  assert.strictEqual(output.observed.package_context, 'source_repository');
  assert.strictEqual(output.validated.package_release_check, true);
  assert.strictEqual(output.validated.target_onboarding_plan, true);
  assert.strictEqual(output.validated.target_onboarding_fixture, true);
  assert.strictEqual(output.validated.explicit_write_performed_in_temporary_target, true);
  assert.strictEqual(output.validated.canonical_target_files_only, true);
  assert.strictEqual(output.validated.target_boundary_config_passes, true);
  assert.strictEqual(output.validated.temporary_target_cleanup, true);
  assert.strictEqual(output.boundary.writes_package_root, false);
  assert.strictEqual(output.boundary.creates_temp_target_repository, true);
  assert.strictEqual(output.boundary.cleans_up_temp_target_repository, true);
  assert.strictEqual(output.boundary.runs_package_manager, false);
}

{
  const result = run(['release', '--post-publish-handoff']);
  const output = readJsonOutput(result);
  assert.strictEqual(output.schema, 'agent-onboard-public-target-onboarding-post-publish-verification-handoff-001');
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.version, EXPECTED_VERSION);
  assert.strictEqual(output.release_line, EXPECTED_RELEASE_LINE);
  assert.strictEqual(output.command, 'agent-onboard release --post-publish-handoff');
  assert.strictEqual(output.source_context.package_context, 'source_repository');
  assert.ok(output.verification_commands.includes('npm view agent-onboard version dist-tags'));
  assert.ok(output.verification_commands.includes(`${EXPECTED_VERSIONED_NPX} release --post-publish-handoff`));
  assert.ok(output.verification_commands.includes(`${EXPECTED_VERSIONED_NPX} release --published-acceptance`));
  assert.ok(output.verification_commands.includes(`${EXPECTED_VERSIONED_NPX} release --real-target-trial`));
  assert.ok(output.verification_commands.includes(`${EXPECTED_VERSIONED_NPX} release --architecture-parity-smoke`));
  assert.ok(output.verification_commands.includes(`${EXPECTED_VERSIONED_NPX} release --target-onboarding-smoke`));
  assert.ok(output.verification_commands.includes(`${EXPECTED_VERSIONED_NPX} architecture --partition-plan`));
  assert.ok(output.verification_commands.includes(`${EXPECTED_VERSIONED_NPX} architecture --partition-check`));
  assert.ok(output.verification_commands.includes(`${EXPECTED_VERSIONED_NPX} architecture --extraction-rehearsal`));
  assert.ok(output.verification_commands.includes(`${EXPECTED_VERSIONED_NPX} architecture --extraction-check`));
  assert.ok(output.verification_commands.includes(`${EXPECTED_VERSIONED_NPX} target runtime --namespace`));
  assert.ok(output.verification_commands.includes(`${EXPECTED_VERSIONED_NPX} target runtime --check`));
  assert.ok(output.verification_commands.includes(`${EXPECTED_VERSIONED_NPX} release --surface`));
  assert.ok(output.verification_commands.includes(`${EXPECTED_VERSIONED_NPX} release --surface-check`));
  assert.ok(output.verification_commands.includes(`${EXPECTED_VERSIONED_NPX} target onboarding --plan`));
  assert.ok(output.verification_commands.includes(`${EXPECTED_VERSIONED_NPX} target onboarding --fixture`));
  assert.ok(output.verification_commands.includes(`${EXPECTED_VERSIONED_NPX} target onboarding --trial`));
  assert.strictEqual(output.acceptance_criteria.latest_dist_tag_matches_version, true);
  assert.strictEqual(output.acceptance_criteria.target_onboarding_plan_and_fixture_pass_from_registry_package, true);
  assert.strictEqual(output.boundary.writes_files, false);
  assert.strictEqual(output.boundary.runs_package_manager, false);
  assert.strictEqual(output.boundary.mutates_registry, false);
  assert.deepStrictEqual(output.errors, []);
}


{
  const result = run(['release', '--published-acceptance']);
  const output = readJsonOutput(result);
  assert.strictEqual(output.schema, 'agent-onboard-public-target-onboarding-published-package-acceptance-result-001');
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.version, EXPECTED_VERSION);
  assert.strictEqual(output.release_line, EXPECTED_RELEASE_LINE);
  assert.strictEqual(output.command, 'agent-onboard release --published-acceptance');
  assert.strictEqual(output.source_context.package_context, 'source_repository');
  assert.strictEqual(output.acceptance_mode, 'source_repository_rehearsal');
  assert.strictEqual(output.validated.release_check, true);
  assert.strictEqual(output.validated.post_publish_handoff, true);
  assert.strictEqual(output.validated.parity_smoke, true);
  assert.strictEqual(output.validated.architecture_parity_smoke, true);
  assert.strictEqual(output.validated.target_onboarding_smoke, true);
  assert.strictEqual(output.validated.target_onboarding_plan, true);
  assert.strictEqual(output.validated.target_onboarding_fixture, true);
  assert.strictEqual(output.validated.real_target_trial, true);
  assert.strictEqual(output.validated.handoff_includes_published_acceptance_command, true);
  assert.strictEqual(output.acceptance_criteria.run_after_publish_with_version_pinned_npx, `${EXPECTED_VERSIONED_NPX} release --published-acceptance`);
  assert.strictEqual(output.boundary.mutates_registry, false);
  assert.strictEqual(output.boundary.installs_dependencies, false);
  assert.deepStrictEqual(output.errors, []);
}

{
  const result = run(['release', '--real-target-trial']);
  const output = readJsonOutput(result);
  assert.strictEqual(output.schema, 'agent-onboard-public-target-onboarding-real-target-repo-trial-gate-result-001');
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.version, EXPECTED_VERSION);
  assert.strictEqual(output.release_line, EXPECTED_RELEASE_LINE);
  assert.strictEqual(output.command, 'agent-onboard release --real-target-trial');
  assert.strictEqual(output.validated.target_onboarding_trial_status, true);
  assert.strictEqual(output.validated.target_ready_for_explicit_write, true);
  assert.strictEqual(output.validated.canonical_files_projected_only, true);
  assert.strictEqual(output.validated.trial_writes_no_files, true);
  assert.strictEqual(output.boundary.writes_target_repository_state, false);
  assert.strictEqual(output.boundary.runs_package_manager, false);
  assert.deepStrictEqual(output.errors, []);
}

{
  const result = run(['release', '--check']);
  const output = readJsonOutput(result);
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.schema, 'agent-onboard-public-release-check-result-014');
  assert.strictEqual(output.version, EXPECTED_VERSION);
  assert.strictEqual(output.validated.package_metadata, true);
  assert.strictEqual(output.validated.projected_pack_allowlist, true);
  assert.strictEqual(output.validated.public_artifact_messaging, true);
  assert.strictEqual(output.validated.source_work_items_ledger, true);
  assert.strictEqual(output.source_context.package_context, 'source_repository');
  assert.strictEqual(output.source_work_items_ledger.present, true);
  assert.ok(!output.source_work_items_ledger.open_work_items.some((item) => item.id === ['P', 1, 'S', 3, 'M', 1, 'W', 19].join(''))); // W19 closed by this gate
  assert.ok(output.validated.public_package_surface_preservation);
  assert.ok(output.validated.public_installed_parity_architecture_smoke);
  assert.ok(output.validated.public_architecture_map);
  assert.ok(output.validated.public_command_router);
  assert.ok(output.validated.public_domain_service_facades);
  assert.ok(output.validated.public_authority_first_read_index);
  assert.ok(output.validated.public_target_runtime_namespace);
  assert.ok(output.validated.public_source_domain_module_partition_plan);
  assert.ok(output.validated.public_source_domain_extraction_rehearsal);
  assert.ok(output.validated.public_source_extraction_golden_output_freeze);
  assert.ok(output.validated.public_source_module_extraction_adapter_boundary);
  assert.ok(output.validated.public_source_module_extraction_first_slice);
  assert.ok(output.validated.public_source_module_extraction_bundle_parity);
  assert.ok(output.validated.public_source_module_extraction_runtime_bridge);
  assert.ok(output.validated.public_source_module_extraction_installed_fallback_smoke);
  assert.ok(output.validated.public_source_module_extraction_second_slice_plan);
  assert.ok(output.validated.public_source_module_extraction_second_slice_first_slice);
  assert.ok(output.validated.public_source_module_extraction_authority_bundle_parity);
  assert.ok(output.validated.public_source_module_extraction_authority_runtime_bridge);
  assert.ok(output.validated.work_items_domain_source_extraction_plan);
  assert.ok(output.validated.work_items_domain_source_extraction_first_slice);
  assert.ok(output.validated.work_items_domain_source_extraction_bundle_parity);
  assert.ok(output.validated.work_items_domain_source_extraction_runtime_bridge);
  assert.ok(output.validated.work_items_domain_source_extraction_installed_fallback_smoke);
  assert.ok(output.validated.claims_domain_source_extraction_plan);
  assert.ok(output.validated.claims_domain_source_extraction_first_slice);
  assert.ok(output.validated.claims_domain_source_extraction_bundle_parity);
  assert.ok(output.validated.public_architecture_m1_closure_m2_seed);
  assert.strictEqual(output.public_architecture_m1_closure_m2_seed.milestone_transition.closed_milestone.status, 'closed');
  assert.ok(['open', 'closed'].includes(output.public_architecture_m1_closure_m2_seed.milestone_transition.opened_milestone.status));
  assert.ok(!output.source_work_items_ledger.open_work_items.some((item) => item.id === ['P', 1, 'S', 3, 'M', 2, 'W', 12].join('')));
  assert.ok(output.validated.public_version_reference_policy);
  assert.strictEqual(output.public_architecture.status, 'ok');
  assert.ok(!output.source_work_items_ledger.open_work_items.some((item) => item.title === 'Public installed parity architecture smoke gate'));
  assert.ok(!output.source_work_items_ledger.open_work_items.some((item) => item.title === 'Public target onboarding real target repo trial gate'));
  assert.ok(!output.source_work_items_ledger.open_work_items.some((item) => item.title === 'Public target onboarding published package acceptance gate'));
  assert.ok(!output.source_work_items_ledger.open_work_items.some((item) => item.title === 'Public target onboarding post-publish verification handoff gate'));
  assert.ok(!output.source_work_items_ledger.open_work_items.some((item) => item.title === 'Public target onboarding installed package smoke gate'));
  assert.ok(!output.source_work_items_ledger.open_work_items.some((item) => item.title === 'Public target onboarding explicit write boundary gate'));
  assert.ok(!output.source_work_items_ledger.open_work_items.some((item) => item.title === 'Public target onboarding surface planning gate'));
  assert.ok(!output.source_work_items_ledger.open_work_items.some((item) => item.title === 'Public installed package parity smoke gate'));
  assert.deepStrictEqual(output.expected_pack_files, EXPECTED_PACK_FILES);
  assert.deepStrictEqual(output.projected_pack_files, EXPECTED_PACK_FILES);
  assert.strictEqual(output.boundary.mutates_registry, false);
  assert.deepStrictEqual(output.errors, []);
}

{
  const dir = tempRepo();
  const result = run(['target', 'onboarding', '--plan'], { cwd: dir });
  const output = readJsonOutput(result);
  assert.strictEqual(output.schema, 'agent-onboard-public-target-onboarding-surface-plan-001');
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.version, EXPECTED_VERSION);
  assert.strictEqual(output.release_line, EXPECTED_RELEASE_LINE);
  assert.strictEqual(output.command, 'agent-onboard target onboarding --plan');
  assert.strictEqual(output.target.name, 'target-fixture');
  assert.ok(output.canonical_files.includes('agent-onboard.target.json'));
  assert.ok(output.canonical_files.includes('.agent-onboard/runtime-namespace.json'));
  assert.ok(output.canonical_files.includes('.agent-onboard/project.json'));
  assert.ok(output.canonical_files.includes('.agent-onboard/work-items.json'));
  assert.ok(output.canonical_files.includes('AGENTS.md'));
  assert.ok(output.phases.some((phase) => phase.id === 'discover_target_surface'));
  assert.ok(output.phases.some((phase) => phase.command === 'agent-onboard init --dry-run'));
  assert.ok(output.phases.some((phase) => phase.command === 'agent-onboard target bootstrap --write'));
  assert.strictEqual(output.boundary.plan_writes_files, false);
  assert.strictEqual(output.boundary.write_commands_require_explicit_write_flag, true);
  assert.ok(output.phases.some((phase) => phase.command === 'agent-onboard target onboarding --write'));
  assert.strictEqual(output.planned_files.length, 7);
  assert.deepStrictEqual(output.planned_files.map((item) => item.path), ['agent-onboard.target.json', '.agent-onboard/runtime-namespace.json', '.agent-onboard/project.json', '.agent-onboard/work-items.json', 'AGENTS.md', 'llms.txt', '.agent-onboard/authority-path.json']);
}

{
  const dir = tempRepo();
  const result = run(['target', 'onboarding', '--fixture'], { cwd: dir });
  const output = readJsonOutput(result);
  assert.strictEqual(output.schema, 'agent-onboard-public-target-onboarding-dry-run-fixture-result-001');
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.version, EXPECTED_VERSION);
  assert.strictEqual(output.release_line, EXPECTED_RELEASE_LINE);
  assert.strictEqual(output.command, 'agent-onboard target onboarding --fixture');
  assert.strictEqual(output.fixture_matrix.schema, 'agent-onboard-public-target-onboarding-fixture-matrix-002');
  assert.ok(output.fixture_matrix.fixtures.some((fixture) => fixture.id === 'target_bootstrap_dry_run_empty_target'));
  assert.ok(output.fixture_matrix.fixtures.some((fixture) => fixture.id === 'target_bootstrap_conflict_dry_run'));
  assert.ok(output.fixture_matrix.fixtures.some((fixture) => fixture.id === 'target_onboarding_explicit_write_empty_target'));
  assert.strictEqual(output.boundary.fixture_writes_files, false);
  assert.strictEqual(output.boundary.validates_force_preview_without_write, true);
  assert.deepStrictEqual(output.observed_target_projection.target_bootstrap_dry_run.planned_writes.map((item) => item.action), ['create']);
  assert.deepStrictEqual(output.observed_target_projection.target_instance_takeover_dry_run.planned_writes.map((item) => item.action), ['create', 'create', 'create']);
  assert.deepStrictEqual(output.observed_target_projection.agents_preview.planned_writes.map((item) => item.action), ['create']);
  assert.deepStrictEqual(output.observed_target_projection.target_onboarding_explicit_write_projection.planned_writes.map((item) => item.action), ['create', 'create', 'create', 'create', 'create', 'create', 'create']);
  assert.strictEqual(output.observed_target_projection.target_onboarding_explicit_write_projection.writes_performed, false);
  assert.deepStrictEqual(output.observed_target_projection.target_bootstrap_force_dry_run.planned_writes.map((item) => item.action), ['create']);
  assert.strictEqual(fs.existsSync(path.join(dir, 'agent-onboard.target.json')), false);
  assert.strictEqual(fs.existsSync(path.join(dir, '.agent-onboard', 'project.json')), false);
  assert.strictEqual(fs.existsSync(path.join(dir, 'AGENTS.md')), false);
}

{
  const dir = tempRepo();
  fs.writeFileSync(path.join(dir, 'agent-onboard.target.json'), '{}\n');
  const conflict = run(['target', 'bootstrap', '--dry-run'], { cwd: dir, expectFailure: true });
  const conflictOutput = readJsonFailure(conflict);
  assert.strictEqual(conflictOutput.status, 'error');
  assert.strictEqual(conflictOutput.writes_performed, false);
  assert.deepStrictEqual(conflictOutput.conflicts, ['agent-onboard.target.json']);
  assert.strictEqual(fs.readFileSync(path.join(dir, 'agent-onboard.target.json'), 'utf8'), '{}\n');

  const force = run(['target', 'bootstrap', '--dry-run', '--force'], { cwd: dir });
  const forceOutput = readJsonOutput(force);
  assert.strictEqual(forceOutput.status, 'ok');
  assert.strictEqual(forceOutput.writes_performed, false);
  assert.deepStrictEqual(forceOutput.planned_writes.map((item) => item.action), ['overwrite']);
  assert.strictEqual(fs.readFileSync(path.join(dir, 'agent-onboard.target.json'), 'utf8'), '{}\n');
}

{
  const dir = tempRepo();
  const bootstrap = run(['target', 'bootstrap', '--dry-run'], { cwd: dir });
  const bootstrapOutput = readJsonOutput(bootstrap);
  assert.strictEqual(bootstrapOutput.status, 'ok');
  assert.strictEqual(bootstrapOutput.writes_performed, false);
  assert.deepStrictEqual(bootstrapOutput.planned_writes.map((item) => item.path), ['agent-onboard.target.json']);
  assert.strictEqual(fs.existsSync(path.join(dir, 'agent-onboard.target.json')), false);

  const takeover = run(['target-instance', 'takeover', '--dry-run'], { cwd: dir });
  const takeoverOutput = readJsonOutput(takeover);
  assert.strictEqual(takeoverOutput.status, 'ok');
  assert.strictEqual(takeoverOutput.writes_performed, false);
  assert.deepStrictEqual(takeoverOutput.planned_writes.map((item) => item.path), ['.agent-onboard/runtime-namespace.json', '.agent-onboard/project.json', '.agent-onboard/work-items.json']);
  assert.strictEqual(fs.existsSync(path.join(dir, '.agent-onboard')), false);

  const agentsPreview = run(['agents', '--preview'], { cwd: dir });
  const agentsOutput = readJsonOutput(agentsPreview);
  assert.strictEqual(agentsOutput.status, 'ok');
  assert.strictEqual(agentsOutput.writes_performed, false);
  assert.deepStrictEqual(agentsOutput.planned_writes.map((item) => item.path), ['AGENTS.md']);
  assert.strictEqual(fs.existsSync(path.join(dir, 'AGENTS.md')), false);
}

{
  const dir = tempRepo();
  const result = run(['target', 'onboarding', '--trial'], { cwd: dir });
  const output = readJsonOutput(result);
  assert.strictEqual(output.schema, 'agent-onboard-public-target-onboarding-real-target-trial-result-001');
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.writes_performed, false);
  assert.strictEqual(output.ready_for_explicit_write, true);
  assert.deepStrictEqual(output.conflicts, []);
  assert.deepStrictEqual(output.planned_writes.map((item) => item.path), ['agent-onboard.target.json', '.agent-onboard/runtime-namespace.json', '.agent-onboard/project.json', '.agent-onboard/work-items.json', 'AGENTS.md', 'llms.txt', '.agent-onboard/authority-path.json']);
  assert.strictEqual(fs.existsSync(path.join(dir, 'AGENTS.md')), false);
}

{
  const dir = tempRepo();
  fs.writeFileSync(path.join(dir, 'AGENTS.md'), '# Existing target instructions\n');
  const result = run(['target', 'onboarding', '--trial', '--target', dir], { cwd: ROOT });
  const output = readJsonOutput(result);
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.writes_performed, false);
  assert.strictEqual(output.ready_for_explicit_write, false);
  assert.deepStrictEqual(output.conflicts, ['AGENTS.md']);
  assert.strictEqual(fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8'), '# Existing target instructions\n');
}

{
  const dir = tempRepo();
  const result = run(['target', 'onboarding', '--write'], { cwd: dir });
  const output = readJsonOutput(result);
  assert.strictEqual(output.schema, 'agent-onboard-public-target-onboarding-explicit-write-result-001');
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.version, EXPECTED_VERSION);
  assert.strictEqual(output.mode, 'write');
  assert.strictEqual(output.force, false);
  assert.strictEqual(output.writes_performed, true);
  assert.deepStrictEqual(output.written_files, ['agent-onboard.target.json', '.agent-onboard/runtime-namespace.json', '.agent-onboard/project.json', '.agent-onboard/work-items.json', 'AGENTS.md', 'llms.txt', '.agent-onboard/authority-path.json']);
  assert.deepStrictEqual(output.planned_writes.map((item) => item.action), ['create', 'create', 'create', 'create', 'create', 'create', 'create']);
  assert.strictEqual(output.boundary.explicit_write_flag_required, true);
  assert.strictEqual(output.boundary.writes_only_canonical_target_onboarding_files, true);
  assert.strictEqual(output.boundary.git_mutation, false);
  assert.strictEqual(fs.existsSync(path.join(dir, 'agent-onboard.target.json')), true);
  assert.strictEqual(fs.existsSync(path.join(dir, '.agent-onboard', 'runtime-namespace.json')), true);
  assert.strictEqual(fs.existsSync(path.join(dir, '.agent-onboard', 'project.json')), true);
  assert.strictEqual(fs.existsSync(path.join(dir, '.agent-onboard', 'work-items.json')), true);
  assert.strictEqual(fs.existsSync(path.join(dir, 'AGENTS.md')), true);
  assert.strictEqual(fs.existsSync(path.join(dir, 'llms.txt')), true);
  assert.strictEqual(fs.existsSync(path.join(dir, '.agent-onboard', 'authority-path.json')), true);
}

{
  const dir = tempRepo();
  fs.writeFileSync(path.join(dir, 'AGENTS.md'), '# custom instructions\n');
  const conflict = run(['target', 'onboarding', '--write'], { cwd: dir });
  const conflictOutput = readJsonFailure(conflict);
  assert.strictEqual(conflictOutput.status, 'error');
  assert.deepStrictEqual(conflictOutput.conflicts, ['AGENTS.md']);
  assert.strictEqual(conflictOutput.writes_performed, false);
  assert.strictEqual(fs.existsSync(path.join(dir, 'agent-onboard.target.json')), false);
  assert.strictEqual(fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8'), '# custom instructions\n');

  const force = run(['target', 'onboarding', '--write', '--force'], { cwd: dir });
  const forceOutput = readJsonOutput(force);
  assert.strictEqual(forceOutput.status, 'ok');
  assert.strictEqual(forceOutput.force, true);
  assert.ok(forceOutput.written_files.includes('AGENTS.md'));
  assert.deepStrictEqual(forceOutput.planned_writes.map((item) => item.action), ['create', 'create', 'create', 'create', 'overwrite', 'create', 'create']);
  assert.ok(fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8').includes('Agent-Onboard target repository rules'));
}

{
  const result = run(['target-config', '--validate-template']);
  const output = readJsonOutput(result);
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.validated, true);
  assert.deepStrictEqual(output.errors, []);
}

{
  const result = run(['work-items', '--schema']);
  const output = readJsonOutput(result);
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.work_items_schema.$id, 'agent-onboard-target-work-items-001');
}

{
  const result = run(['work-items', '--template']);
  const output = readJsonOutput(result);
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.canonical_file, '.agent-onboard/work-items.json');
  assert.strictEqual(output.work_items.vocabulary.program.prefix, 'P');
  assert.deepStrictEqual(output.work_items.programs, []);
  assert.deepStrictEqual(output.work_items.stages, []);
  assert.deepStrictEqual(output.work_items.milestones, []);
  assert.deepStrictEqual(output.work_items.work_items, []);
}

{
  const result = run(['work-items', '--validate-template']);
  const output = readJsonOutput(result);
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.validated, true);
  assert.deepStrictEqual(output.errors, []);
}


{
  const dir = tempRepo();
  const result = run(['work-items', '--init', '--dry-run'], { cwd: dir });
  const output = readJsonOutput(result);
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.mode, 'dry-run');
  assert.strictEqual(output.writes_performed, false);
  assert.strictEqual(output.canonical_file, '.agent-onboard/work-items.json');
  assert.strictEqual(output.planned_writes.length, 1);
  assert.strictEqual(output.planned_writes[0].path, '.agent-onboard/work-items.json');
  assert.strictEqual(output.validated_template, true);
  assert.strictEqual(output.counts.work_items, 0);
  assert.ok(!fs.existsSync(path.join(dir, '.agent-onboard', 'work-items.json')));
}

{
  const dir = tempRepo();
  const result = run(['work-items', '--init', '--write'], { cwd: dir });
  const output = readJsonOutput(result);
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.mode, 'write');
  assert.strictEqual(output.writes_performed, true);
  assert.deepStrictEqual(output.conflicts, []);
  const file = path.join(dir, '.agent-onboard', 'work-items.json');
  assert.ok(fs.existsSync(file));
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.strictEqual(value.schema, 'agent-onboard-target-work-items-001');
  assert.strictEqual(value.package_name, 'agent-onboard');
  assert.deepStrictEqual(value.work_items, []);
  const validate = run(['work-items', '--validate'], { cwd: dir });
  const validation = readJsonOutput(validate);
  assert.strictEqual(validation.status, 'ok');
}

{
  const dir = tempRepo();
  fs.mkdirSync(path.join(dir, '.agent-onboard'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.agent-onboard', 'work-items.json'), '{"foreign":true}\n');
  const result = run(['work-items', '--init', '--write'], { cwd: dir });
  const output = readJsonFailure(result);
  assert.strictEqual(output.status, 'error');
  assert.strictEqual(output.writes_performed, false);
  assert.deepStrictEqual(output.conflicts, ['.agent-onboard/work-items.json']);
  assert.strictEqual(JSON.parse(fs.readFileSync(path.join(dir, '.agent-onboard', 'work-items.json'), 'utf8')).foreign, true);
}

{
  const dir = tempRepo();
  fs.mkdirSync(path.join(dir, '.agent-onboard'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.agent-onboard', 'work-items.json'), '{"foreign":true}\n');
  const result = run(['work-items', '--init', '--write', '--force'], { cwd: dir });
  const output = readJsonOutput(result);
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.writes_performed, true);
  assert.deepStrictEqual(output.conflicts, []);
  const value = JSON.parse(fs.readFileSync(path.join(dir, '.agent-onboard', 'work-items.json'), 'utf8'));
  assert.strictEqual(value.schema, 'agent-onboard-target-work-items-001');
}

{
  const dir = tempRepo();
  readJsonOutput(run(['work-items', '--init', '--write'], { cwd: dir }));
  const id = ['P', 1, 'S', 1, 'M', 1, 'W', 1].join('');
  const result = run([
    'work-items', '--append', '--dry-run',
    '--id', id,
    '--title', 'Public append dry-run seed',
    '--program-title', 'Public program seed',
    '--stage-title', 'Public stage seed',
    '--milestone-title', 'Public milestone seed'
  ], { cwd: dir });
  const output = readJsonOutput(result);
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.mode, 'dry-run');
  assert.strictEqual(output.writes_performed, false);
  assert.strictEqual(output.counts_before.work_items, 0);
  assert.strictEqual(output.counts_after.programs, 1);
  assert.strictEqual(output.counts_after.stages, 1);
  assert.strictEqual(output.counts_after.milestones, 1);
  assert.strictEqual(output.counts_after.work_items, 1);
  assert.strictEqual(output.added.work_items[0].id, id);
  assert.strictEqual(output.proposed_ledger.work_items[0].title, 'Public append dry-run seed');
  const persisted = JSON.parse(fs.readFileSync(path.join(dir, '.agent-onboard', 'work-items.json'), 'utf8'));
  assert.strictEqual(persisted.work_items.length, 0);
}

{
  const dir = tempRepo();
  readJsonOutput(run(['work-items', '--init', '--write'], { cwd: dir }));
  const id = ['P', 1, 'S', 1, 'M', 1, 'W', 1].join('');
  const first = run(['work-items', '--append', '--dry-run', '--id', id, '--title', 'First'], { cwd: dir });
  const proposal = readJsonOutput(first).proposed_ledger;
  fs.writeFileSync(path.join(dir, '.agent-onboard', 'work-items.json'), JSON.stringify(proposal, null, 2) + '\n');
  const second = run(['work-items', '--append', '--dry-run', '--id', id, '--title', 'Duplicate'], { cwd: dir });
  const output = readJsonFailure(second);
  assert.strictEqual(output.status, 'error');
  assert.strictEqual(output.writes_performed, false);
  assert.ok(output.reason.includes('duplicate'));
}

{
  const dir = tempRepo();
  const id = ['P', 1, 'S', 1, 'M', 1, 'W', 1].join('');
  const result = run(['work-items', '--append', '--dry-run', '--id', id, '--title', 'Missing ledger'], { cwd: dir });
  const output = readJsonFailure(result);
  assert.strictEqual(output.status, 'error');
  assert.strictEqual(output.writes_performed, false);
  assert.ok(output.reason.includes('missing'));
}

{
  const dir = tempRepo();
  readJsonOutput(run(['work-items', '--init', '--write'], { cwd: dir }));
  const id = ['P', 1, 'S', 1, 'M', 1, 'W', 1].join('');
  const result = run([
    'work-items', '--append', '--write',
    '--id', id,
    '--title', 'Public append write seed',
    '--program-title', 'Public program write seed',
    '--stage-title', 'Public stage write seed',
    '--milestone-title', 'Public milestone write seed'
  ], { cwd: dir });
  const output = readJsonOutput(result);
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.mode, 'write');
  assert.strictEqual(output.writes_performed, true);
  assert.strictEqual(output.boundary.modifies_work_items_file, true);
  assert.strictEqual(output.boundary.modifies_only_canonical_work_items_file, true);
  assert.strictEqual(output.counts_before.work_items, 0);
  assert.strictEqual(output.counts_after.work_items, 1);
  assert.strictEqual(output.added.work_items[0].id, id);
  const persisted = JSON.parse(fs.readFileSync(path.join(dir, '.agent-onboard', 'work-items.json'), 'utf8'));
  assert.strictEqual(persisted.programs[0].title, 'Public program write seed');
  assert.strictEqual(persisted.stages[0].title, 'Public stage write seed');
  assert.strictEqual(persisted.milestones[0].title, 'Public milestone write seed');
  assert.strictEqual(persisted.work_items[0].title, 'Public append write seed');
  const validate = readJsonOutput(run(['work-items', '--validate'], { cwd: dir }));
  assert.strictEqual(validate.status, 'ok');
  assert.strictEqual(validate.counts.work_items, 1);
}

{
  const dir = tempRepo();
  readJsonOutput(run(['work-items', '--init', '--write'], { cwd: dir }));
  const id = ['P', 1, 'S', 1, 'M', 1, 'W', 1].join('');
  readJsonOutput(run(['work-items', '--append', '--write', '--id', id, '--title', 'First'], { cwd: dir }));
  const duplicate = run(['work-items', '--append', '--write', '--id', id, '--title', 'Duplicate'], { cwd: dir });
  const output = readJsonFailure(duplicate);
  assert.strictEqual(output.status, 'error');
  assert.strictEqual(output.writes_performed, false);
  assert.ok(output.reason.includes('duplicate'));
  const persisted = JSON.parse(fs.readFileSync(path.join(dir, '.agent-onboard', 'work-items.json'), 'utf8'));
  assert.strictEqual(persisted.work_items.length, 1);
  assert.strictEqual(persisted.work_items[0].title, 'First');
}

{
  const dir = tempRepo();
  readJsonOutput(run(['work-items', '--init', '--write'], { cwd: dir }));
  const id = ['P', 1, 'S', 1, 'M', 1, 'W', 1].join('');
  readJsonOutput(run(['work-items', '--append', '--write', '--id', id, '--title', 'Claim seed'], { cwd: dir }));
  const result = run([
    'work-items', '--claim', '--dry-run',
    '--id', id,
    '--actor', 'public-actor',
    '--claimed-at', '2026-01-01T00:00:00.000Z',
    '--note', 'dry-run only'
  ], { cwd: dir });
  const output = readJsonOutput(result);
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.mode, 'dry-run');
  assert.strictEqual(output.writes_performed, false);
  assert.strictEqual(output.boundary.modifies_work_items_file, false);
  assert.strictEqual(output.claimed.work_item_id, id);
  assert.strictEqual(output.claimed.actor, 'public-actor');
  assert.ok(Array.isArray(output.next_steps));
  assert.ok(output.next_steps.some((step) => step.startsWith('handoff:')));
  assert.strictEqual(output.proposed_ledger.work_items[0].status, 'claimed');
  assert.strictEqual(output.proposed_ledger.work_items[0].claim.actor, 'public-actor');
  const persisted = JSON.parse(fs.readFileSync(path.join(dir, '.agent-onboard', 'work-items.json'), 'utf8'));
  assert.strictEqual(persisted.work_items[0].status, 'open');
  assert.ok(!Object.prototype.hasOwnProperty.call(persisted.work_items[0], 'claim'));
}

{
  const dir = tempRepo();
  readJsonOutput(run(['work-items', '--init', '--write'], { cwd: dir }));
  const id = ['P', 1, 'S', 1, 'M', 1, 'W', 1].join('');
  readJsonOutput(run(['work-items', '--append', '--write', '--id', id, '--title', 'Claim seed'], { cwd: dir }));
  const first = readJsonOutput(run(['work-items', '--claim', '--dry-run', '--id', id, '--actor', 'public-actor'], { cwd: dir }));
  fs.writeFileSync(path.join(dir, '.agent-onboard', 'work-items.json'), JSON.stringify(first.proposed_ledger, null, 2) + '\n');
  const second = run(['work-items', '--claim', '--dry-run', '--id', id, '--actor', 'other-actor'], { cwd: dir });
  const output = readJsonFailure(second);
  assert.strictEqual(output.status, 'error');
  assert.strictEqual(output.writes_performed, false);
  assert.ok(output.reason.includes('already claimed'));
}

{
  const dir = tempRepo();
  readJsonOutput(run(['work-items', '--init', '--write'], { cwd: dir }));
  const id = ['P', 1, 'S', 1, 'M', 1, 'W', 1].join('');
  const result = run(['work-items', '--claim', '--dry-run', '--id', id, '--actor', 'public-actor'], { cwd: dir });
  const output = readJsonFailure(result);
  assert.strictEqual(output.status, 'error');
  assert.strictEqual(output.writes_performed, false);
  assert.ok(output.reason.includes('existing'));
}

{
  const dir = tempRepo();
  readJsonOutput(run(['work-items', '--init', '--write'], { cwd: dir }));
  const id = ['P', 1, 'S', 1, 'M', 1, 'W', 1].join('');
  const result = run(['work-items', '--append', '--dry-run', '--write', '--id', id, '--title', 'Invalid mode'], { cwd: dir });
  const output = readJsonFailure(result);
  assert.strictEqual(output.status, 'error');
  assert.ok(output.message.includes('only one'));
}

{
  const result = run(['target-config', '--template'], { cwd: tempRepo() });
  const output = readJsonOutput(result);
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.target_config.project.name, 'target-fixture');
  assert.ok(output.target_config.surfaces.include.includes('AGENTS.md'));
}

{
  const dir = tempRepo();
  const result = run(['agents', '--preview'], { cwd: dir });
  const output = readJsonOutput(result);
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.mode, 'preview');
  assert.strictEqual(output.writes_performed, false);
  assert.strictEqual(output.canonical_file, 'AGENTS.md');
  assert.ok(output.agents_md.includes('Forbidden by default'));
  assert.ok(output.agents_md.includes('guard --check-boundary'));
  assert.ok(output.agents_md.includes('authority --first-read'));
  assert.ok(output.agents_md.includes('llms.txt'));
  assert.ok(output.agents_md.includes('target-fixture'));
  assert.ok(!fs.existsSync(path.join(dir, 'AGENTS.md')));
}

{
  const dir = tempRepo();
  const result = run(['agents', '--write'], { cwd: dir });
  const output = readJsonOutput(result);
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.writes_performed, true);
  assert.deepStrictEqual(output.conflicts, []);
  const agents = fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8');
  assert.ok(agents.includes('Agent-Onboard target repository rules'));
  assert.ok(agents.includes('target-fixture'));
}

{
  const dir = tempRepo();
  fs.writeFileSync(path.join(dir, 'AGENTS.md'), '# Existing instructions\n');
  const result = run(['agents', '--write'], { cwd: dir });
  const output = readJsonFailure(result);
  assert.strictEqual(output.status, 'error');
  assert.deepStrictEqual(output.conflicts, ['AGENTS.md']);
  assert.strictEqual(fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8'), '# Existing instructions\n');
}

{
  const dir = tempRepo();
  fs.writeFileSync(path.join(dir, 'AGENTS.md'), '# Existing instructions\n');
  const result = run(['agents', '--write', '--force'], { cwd: dir });
  const output = readJsonOutput(result);
  assert.strictEqual(output.status, 'ok');
  assert.deepStrictEqual(output.conflicts, []);
  assert.ok(fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8').includes('Agent-Onboard target repository rules'));
}

{
  const dir = tempRepo();
  const result = run(['init', '--dry-run'], { cwd: dir });
  const output = readJsonOutput(result);
  assert.strictEqual(output.writes_performed, false);
  assert.strictEqual(output.planned_writes.length, 4);
  assert.ok(!fs.existsSync(path.join(dir, 'agent-onboard.target.json')));
  assert.ok(!fs.existsSync(path.join(dir, '.agent-onboard', 'runtime-namespace.json')));
  assert.ok(!fs.existsSync(path.join(dir, '.agent-onboard', 'project.json')));
}

{
  const dir = tempRepo();
  const result = run(['init', '--write'], { cwd: dir });
  const output = readJsonOutput(result);
  assert.strictEqual(output.writes_performed, true);
  assert.deepStrictEqual(output.conflicts, []);
  assert.ok(fs.existsSync(path.join(dir, 'agent-onboard.target.json')));
  assert.ok(fs.existsSync(path.join(dir, '.agent-onboard', 'runtime-namespace.json')));
  assert.ok(fs.existsSync(path.join(dir, '.agent-onboard', 'project.json')));
  assert.ok(fs.existsSync(path.join(dir, '.agent-onboard', 'work-items.json')));
  const workItems = JSON.parse(fs.readFileSync(path.join(dir, '.agent-onboard', 'work-items.json'), 'utf8'));
  assert.strictEqual(workItems.schema, 'agent-onboard-target-work-items-001');
  assert.strictEqual(workItems.vocabulary.work_item.prefix, 'W');
  assert.deepStrictEqual(workItems.programs, []);
  assert.deepStrictEqual(workItems.stages, []);
  assert.deepStrictEqual(workItems.milestones, []);
  assert.deepStrictEqual(workItems.work_items, []);
  const targetConfig = JSON.parse(fs.readFileSync(path.join(dir, 'agent-onboard.target.json'), 'utf8'));
  assert.strictEqual(targetConfig.project.name, 'target-fixture');
  assert.strictEqual(targetConfig.control.requested_mode, 'target_dry_run');
  assert.strictEqual(targetConfig.control.authority_level, 'L1_read_only_preview');

  const validate = run(['target-config', '--validate'], { cwd: dir });
  const validation = readJsonOutput(validate);
  assert.strictEqual(validation.status, 'ok');

  const validateWorkItems = run(['work-items', '--validate'], { cwd: dir });
  const workItemsValidation = readJsonOutput(validateWorkItems);
  assert.strictEqual(workItemsValidation.status, 'ok');
  assert.strictEqual(workItemsValidation.counts.work_items, 0);

  const listWorkItems = run(['work-items', '--list'], { cwd: dir });
  const workItemsList = readJsonOutput(listWorkItems);
  assert.strictEqual(workItemsList.status, 'ok');
  assert.strictEqual(workItemsList.counts.programs, 0);
}

{
  const dir = tempRepo();
  fs.writeFileSync(path.join(dir, 'agent-onboard.target.json'), '{"foreign":true}\n');
  const result = run(['init', '--write'], { cwd: dir });
  const output = readJsonFailure(result);
  assert.strictEqual(output.status, 'error');
  assert.deepStrictEqual(output.conflicts, ['agent-onboard.target.json']);
  assert.strictEqual(JSON.parse(fs.readFileSync(path.join(dir, 'agent-onboard.target.json'), 'utf8')).foreign, true);
}

{
  const dir = tempRepo();
  fs.writeFileSync(path.join(dir, 'agent-onboard.target.json'), '{"foreign":true}\n');
  const result = run(['init', '--write', '--force'], { cwd: dir });
  const output = readJsonOutput(result);
  assert.strictEqual(output.writes_performed, true);
  assert.deepStrictEqual(output.conflicts, []);
  const targetConfig = JSON.parse(fs.readFileSync(path.join(dir, 'agent-onboard.target.json'), 'utf8'));
  assert.strictEqual(targetConfig.schema, 'agent-onboard-target-config-001');
}

{
  const result = run(['target', 'bootstrap', '--dry-run'], { cwd: tempRepo() });
  const output = readJsonOutput(result);
  assert.strictEqual(output.writes_performed, false);
  assert.strictEqual(output.planned_writes.length, 1);
}

{
  const dir = tempRepo();
  const result = run(['target', 'bootstrap', '--write'], { cwd: dir });
  const output = readJsonOutput(result);
  assert.strictEqual(output.writes_performed, true);
  const targetConfig = JSON.parse(fs.readFileSync(path.join(dir, 'agent-onboard.target.json'), 'utf8'));
  assert.strictEqual(targetConfig.project.name, 'target-fixture');
  assert.strictEqual(targetConfig.control.requested_mode, 'target_dry_run');
  assert.strictEqual(targetConfig.control.authority_level, 'L1_read_only_preview');
}

{
  const dir = tempRepo();
  const result = run(['target-instance', 'takeover', '--write'], { cwd: dir });
  const output = readJsonOutput(result);
  assert.strictEqual(output.writes_performed, true);
  assert.ok(fs.existsSync(path.join(dir, '.agent-onboard', 'runtime-namespace.json')));
  assert.ok(fs.existsSync(path.join(dir, '.agent-onboard', 'project.json')));
  assert.ok(fs.existsSync(path.join(dir, '.agent-onboard', 'work-items.json')));
}

{
  const dir = tempRepo();
  const missing = run(['work-items', '--list'], { cwd: dir });
  const output = readJsonFailure(missing);
  assert.strictEqual(output.status, 'error');
  assert.strictEqual(output.writes_performed, false);
}

{
  const dir = tempRepo();
  const ledger = require('../cli/agent-onboard.js').workItemsTemplate();
  const validProgramId = ['P', 1].join('');
  const validStageId = [validProgramId, 'S', 1].join('');
  const validMilestoneId = [validStageId, 'M', 1].join('');
  const validWorkItemId = [validMilestoneId, 'W', 1].join('');
  ledger.programs.push({ id: validProgramId, title: 'Program seed', status: 'open' });
  ledger.stages.push({ id: validStageId, program_id: validProgramId, title: 'Stage seed', status: 'open' });
  ledger.milestones.push({ id: validMilestoneId, stage_id: validStageId, title: 'Milestone seed', status: 'open' });
  ledger.work_items.push({ id: validWorkItemId, milestone_id: validMilestoneId, title: 'Work item seed', status: 'open' });
  fs.mkdirSync(path.join(dir, '.agent-onboard'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.agent-onboard', 'work-items.json'), JSON.stringify(ledger, null, 2) + '\n');
  const result = run(['work-items', '--list'], { cwd: dir });
  const output = readJsonOutput(result);
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.counts.work_items, 1);
}

{
  const dir = tempRepo();
  const ledger = require('../cli/agent-onboard.js').workItemsTemplate();
  ledger.work_items.push({ id: ['not', 'valid'].join('-'), milestone_id: ['also', 'bad'].join('-'), title: 'Invalid', status: 'open' });
  fs.mkdirSync(path.join(dir, '.agent-onboard'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.agent-onboard', 'work-items.json'), JSON.stringify(ledger, null, 2) + '\n');
  const result = run(['work-items', '--validate'], { cwd: dir });
  const output = readJsonFailure(result);
  assert.strictEqual(output.status, 'error');
  assert.ok(output.errors.some((error) => error.includes('expected pattern')));
}


{
  const dir = tempRepo();
  readJsonOutput(run(['work-items', '--init', '--write'], { cwd: dir }));
  const id = ['P', 1, 'S', 1, 'M', 1, 'W', 2].join('');
  readJsonOutput(run(['work-items', '--append', '--write', '--id', id, '--title', 'Claim write target'], { cwd: dir }));
  const result = run(['work-items', '--claim', '--write', '--id', id, '--actor', 'test-agent', '--claimed-at', '2026-06-30T00:00:00.000Z'], { cwd: dir });
  const output = readJsonOutput(result);
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.mode, 'write');
  assert.strictEqual(output.writes_performed, true);
  assert.strictEqual(output.boundary.modifies_work_items_file, true);
  assert.ok(output.next_steps.some((step) => step.startsWith('validate:')));
  const persisted = JSON.parse(fs.readFileSync(path.join(dir, '.agent-onboard', 'work-items.json'), 'utf8'));
  assert.strictEqual(persisted.work_items[0].status, 'claimed');
  assert.strictEqual(persisted.work_items[0].claim.actor, 'test-agent');
}

{
  const dir = tempRepo();
  readJsonOutput(run(['work-items', '--init', '--write'], { cwd: dir }));
  const id = ['P', 1, 'S', 1, 'M', 1, 'W', 3].join('');
  readJsonOutput(run(['work-items', '--append', '--write', '--id', id, '--title', 'Close write target'], { cwd: dir }));
  const dry = run([
    'work-items', '--close', '--dry-run',
    '--id', id,
    '--actor', 'test-agent',
    '--closed-at', '2026-06-30T00:00:00.000Z',
    '--summary', 'Completed the close target',
    '--changed-file', 'README.md',
    '--check', 'npm test',
    '--check-not-run', 'npm publish',
    '--known-non-pass', 'none'
  ], { cwd: dir });
  const dryOutput = readJsonOutput(dry);
  assert.strictEqual(dryOutput.status, 'ok');
  assert.strictEqual(dryOutput.writes_performed, false);
  assert.strictEqual(dryOutput.closed.work_item_id, id);
  assert.strictEqual(dryOutput.handoff_evidence.closure.changed_files[0], 'README.md');
  assert.ok(dryOutput.handoff_evidence.checklist.some((step) => step.startsWith('summary:')));

  const write = run([
    'work-items', '--close', '--write',
    '--id', id,
    '--actor', 'test-agent',
    '--closed-at', '2026-06-30T00:00:00.000Z',
    '--summary', 'Completed the close target',
    '--changed-file', 'README.md',
    '--check', 'npm test'
  ], { cwd: dir });
  const writeOutput = readJsonOutput(write);
  assert.strictEqual(writeOutput.status, 'ok');
  assert.strictEqual(writeOutput.writes_performed, true);
  assert.strictEqual(writeOutput.boundary.modifies_work_items_file, true);
  const persisted = JSON.parse(fs.readFileSync(path.join(dir, '.agent-onboard', 'work-items.json'), 'utf8'));
  assert.strictEqual(persisted.work_items[0].status, 'closed');
  assert.strictEqual(persisted.work_items[0].closure.summary, 'Completed the close target');
}

{

  const rootLedger = JSON.parse(fs.readFileSync(path.join(ROOT, '.agent-onboard', 'work-items.json'), 'utf8'));

  const errors = require('../cli/agent-onboard.js').validateWorkItems(rootLedger);

  assert.deepStrictEqual(errors, []);

  const findById = (items, id) => items.find((item) => item.id === id);

  const program = findById(rootLedger.programs, ['P', 1].join(''));

  const stage = findById(rootLedger.stages, ['P', 1, 'S', 1].join(''));

  const milestone = findById(rootLedger.milestones, ['P', 1, 'S', 1, 'M', 1].join(''));

  const releaseMilestone = findById(rootLedger.milestones, ['P', 1, 'S', 1, 'M', 2].join(''));

  const targetStage = findById(rootLedger.stages, ['P', 1, 'S', 2].join(''));

  const targetMilestone = findById(rootLedger.milestones, ['P', 1, 'S', 2, 'M', 1].join(''));

  const w1 = findById(rootLedger.work_items, ['P', 1, 'S', 1, 'M', 1, 'W', 1].join(''));

  const w2 = findById(rootLedger.work_items, ['P', 1, 'S', 1, 'M', 1, 'W', 2].join(''));

  const w3 = findById(rootLedger.work_items, ['P', 1, 'S', 1, 'M', 1, 'W', 3].join(''));

  const w4 = findById(rootLedger.work_items, ['P', 1, 'S', 1, 'M', 1, 'W', 4].join(''));

  const w5 = findById(rootLedger.work_items, ['P', 1, 'S', 1, 'M', 1, 'W', 5].join(''));

  const m2w1 = findById(rootLedger.work_items, ['P', 1, 'S', 1, 'M', 2, 'W', 1].join(''));

  const m2w2 = findById(rootLedger.work_items, ['P', 1, 'S', 1, 'M', 2, 'W', 2].join(''));

  const m2w3 = findById(rootLedger.work_items, ['P', 1, 'S', 1, 'M', 2, 'W', 3].join(''));

  const s2m1w1 = findById(rootLedger.work_items, ['P', 1, 'S', 2, 'M', 1, 'W', 1].join(''));

  const s2m1w2 = findById(rootLedger.work_items, ['P', 1, 'S', 2, 'M', 1, 'W', 2].join(''));

  const s2m1w3 = findById(rootLedger.work_items, ['P', 1, 'S', 2, 'M', 1, 'W', 3].join(''));

  const s2m1w4 = findById(rootLedger.work_items, ['P', 1, 'S', 2, 'M', 1, 'W', 4].join(''));

  const s2m1w5 = findById(rootLedger.work_items, ['P', 1, 'S', 2, 'M', 1, 'W', 5].join(''));
  const s2m1w6 = findById(rootLedger.work_items, ['P', 1, 'S', 2, 'M', 1, 'W', 6].join(''));

  assert.ok(program);

  assert.ok(stage);

  assert.ok(milestone);

  assert.strictEqual(milestone.status, 'closed');

  assert.ok(releaseMilestone);

  assert.strictEqual(releaseMilestone.status, 'closed');

  assert.ok(targetStage);

  assert.strictEqual(targetStage.status, 'closed');

  assert.ok(targetMilestone);

  assert.strictEqual(targetMilestone.status, 'closed');

  assert.ok(w1);

  assert.strictEqual(w1.status, 'closed');

  assert.ok(w2);

  assert.strictEqual(w2.status, 'closed');

  assert.strictEqual(w2.closure.actor, 'release-maintainer');

  assert.ok(w3);

  assert.strictEqual(w3.status, 'closed');

  assert.strictEqual(w3.closure.actor, 'release-maintainer');

  assert.match(w3.closure.summary, /agent-onboard@0\.0\.15/);

  assert.ok(w4);

  assert.strictEqual(w4.title, 'Public source closure test fixture alignment gate');

  assert.strictEqual(w4.status, 'closed');

  assert.strictEqual(w4.closure.actor, 'release-maintainer');

  assert.match(w4.closure.summary, /agent-onboard@0\.0\.16/);

  assert.ok(w5);

  assert.strictEqual(w5.title, 'Public package publish verification gate');

  assert.strictEqual(w5.status, 'closed');

  assert.strictEqual(w5.closure.actor, 'release-maintainer');

  assert.match(w5.closure.summary, /agent-onboard@0\.0\.17/);

  assert.ok(m2w1);

  assert.strictEqual(m2w1.title, 'Public release contract absorption gate');

  assert.strictEqual(m2w1.status, 'closed');

  assert.strictEqual(m2w1.closure.actor, 'release-maintainer');

  assert.match(m2w1.closure.summary, /agent-onboard@0\.0\.18/);

  assert.ok(m2w2);

  assert.strictEqual(m2w2.title, 'Public package contract fixture gate');

  assert.strictEqual(m2w2.status, 'closed');

  assert.strictEqual(m2w2.closure.actor, 'release-maintainer');

  assert.match(m2w2.closure.summary, /agent-onboard@0\.0\.19/);

  assert.ok(m2w3);

  assert.strictEqual(m2w3.title, 'Public installed package parity smoke gate');

  assert.strictEqual(m2w3.status, 'closed');

  assert.strictEqual(m2w3.closure.actor, 'release-maintainer');

  assert.match(m2w3.closure.summary, /agent-onboard@0\.0\.20/);

  assert.ok(s2m1w1);

  assert.strictEqual(s2m1w1.title, 'Public target onboarding surface planning gate');

  assert.strictEqual(s2m1w1.status, 'closed');

  assert.strictEqual(s2m1w1.closure.actor, 'release-maintainer');

  assert.match(s2m1w1.closure.summary, /agent-onboard@0\.0\.21/);

  assert.ok(s2m1w2);

  assert.strictEqual(s2m1w2.title, 'Public target onboarding dry-run fixture gate');

  assert.strictEqual(s2m1w2.status, 'closed');

  assert.strictEqual(s2m1w2.closure.actor, 'release-maintainer');

  assert.match(s2m1w2.closure.summary, /agent-onboard@0\.0\.22/);


  assert.ok(s2m1w3);

  assert.strictEqual(s2m1w3.title, 'Public target onboarding explicit write boundary gate');

  assert.strictEqual(s2m1w3.status, 'closed');

  assert.strictEqual(s2m1w3.closure.actor, 'release-maintainer');

  assert.match(s2m1w3.closure.summary, /agent-onboard@0\.0\.23/);

  assert.ok(s2m1w4);

  assert.strictEqual(s2m1w4.title, 'Public target onboarding installed package smoke gate');

  assert.strictEqual(s2m1w4.status, 'closed');

  assert.strictEqual(s2m1w4.closure.actor, 'release-maintainer');

  assert.match(s2m1w4.closure.summary, /agent-onboard@0\.0\.24/);

  assert.ok(s2m1w5);

  assert.strictEqual(s2m1w5.title, 'Public target onboarding post-publish verification handoff gate');

  assert.strictEqual(s2m1w5.status, 'closed');

  assert.strictEqual(s2m1w5.closure.actor, 'release-maintainer');

  assert.match(s2m1w5.closure.summary, /agent-onboard@0\.0\.25/);

  assert.ok(s2m1w6);

  assert.strictEqual(s2m1w6.title, 'Public target onboarding published package acceptance gate');

  assert.strictEqual(s2m1w6.status, 'closed');

  assert.strictEqual(s2m1w6.closure.actor, 'release-maintainer');

  assert.match(s2m1w6.closure.summary, /agent-onboard@0\.0\.26/);

  const s2m1w7 = findById(rootLedger.work_items, ['P', 1, 'S', 2, 'M', 1, 'W', 7].join(''));
  const s2m1w8 = findById(rootLedger.work_items, ['P', 1, 'S', 2, 'M', 1, 'W', 8].join(''));

  assert.ok(s2m1w7);

  assert.strictEqual(s2m1w7.title, 'Public target onboarding real target repo trial gate');

  assert.strictEqual(s2m1w7.status, 'closed');

  assert.strictEqual(s2m1w7.closure.actor, 'release-maintainer');

  assert.match(s2m1w7.closure.summary, /agent-onboard@0\.0\.27/);

  assert.ok(s2m1w8);

  assert.strictEqual(s2m1w8.title, 'Public target onboarding owner handoff evidence gate');

  assert.strictEqual(s2m1w8.status, 'closed');

  const s3m1w1 = findById(rootLedger.work_items, ['P', 1, 'S', 3, 'M', 1, 'W', 1].join(''));
  const s3m1w2 = findById(rootLedger.work_items, ['P', 1, 'S', 3, 'M', 1, 'W', 2].join(''));

  assert.ok(s3m1w1);

  assert.strictEqual(s3m1w1.title, 'Public architecture map gate');

  assert.strictEqual(s3m1w1.status, 'closed');

  assert.match(s3m1w1.closure.summary, /agent-onboard@0\.0\.28/);

  assert.ok(s3m1w2);

  assert.strictEqual(s3m1w2.title, 'Public command router boundary gate');

  assert.strictEqual(s3m1w2.status, 'closed');

  assert.match(s3m1w2.closure.summary, /agent-onboard@0\.0\.29/);

  const s3m1w3 = findById(rootLedger.work_items, ['P', 1, 'S', 3, 'M', 1, 'W', 3].join(''));

  assert.ok(s3m1w3);

  assert.strictEqual(s3m1w3.title, 'Public domain service facade gate');

  assert.strictEqual(s3m1w3.status, 'closed');

  assert.match(s3m1w3.closure.summary, /agent-onboard@0\.0\.30/);

  const s3m1w4 = findById(rootLedger.work_items, ['P', 1, 'S', 3, 'M', 1, 'W', 4].join(''));

  assert.ok(s3m1w4);

  assert.strictEqual(s3m1w4.title, 'Public authority first-read index gate');

  assert.strictEqual(s3m1w4.status, 'closed');

  assert.match(s3m1w4.closure.summary, /agent-onboard@0\.0\.31/);

  const s3m1w5 = findById(rootLedger.work_items, ['P', 1, 'S', 3, 'M', 1, 'W', 5].join(''));

  assert.ok(s3m1w5);

  assert.strictEqual(s3m1w5.title, 'Public target runtime namespace gate');

  assert.strictEqual(s3m1w5.status, 'closed');

  assert.match(s3m1w5.closure.summary, /agent-onboard@0\.0\.32/);

  const s3m1w6 = findById(rootLedger.work_items, ['P', 1, 'S', 3, 'M', 1, 'W', 6].join(''));

  assert.ok(s3m1w6);

  assert.strictEqual(s3m1w6.title, 'Public package surface preservation gate');

  assert.strictEqual(s3m1w6.status, 'closed');

  assert.match(s3m1w6.closure.summary, /agent-onboard@0\.0\.33/);

  const s3m1w7 = findById(rootLedger.work_items, ['P', 1, 'S', 3, 'M', 1, 'W', 7].join(''));

  assert.ok(s3m1w7);

  assert.strictEqual(s3m1w7.title, 'Public installed parity architecture smoke gate');

  assert.strictEqual(s3m1w7.status, 'closed');

  assert.match(s3m1w7.closure.summary, /agent-onboard@0\.0\.34/);

  const s3m1w8 = findById(rootLedger.work_items, ['P', 1, 'S', 3, 'M', 1, 'W', 8].join(''));

  assert.ok(s3m1w8);

  assert.strictEqual(s3m1w8.title, 'Public source domain module partition planning gate');

  assert.strictEqual(s3m1w8.status, 'closed');

  assert.match(s3m1w8.closure.summary, /agent-onboard@0\.0\.35/);

  const s3m1w9 = findById(rootLedger.work_items, ['P', 1, 'S', 3, 'M', 1, 'W', 9].join(''));

  assert.ok(s3m1w9);

  assert.strictEqual(s3m1w9.title, 'Public source domain extraction rehearsal gate');

  assert.strictEqual(s3m1w9.status, 'closed');

  assert.match(s3m1w9.closure.summary, /agent-onboard@0\.0\.36/);

  const s3m1w10 = findById(rootLedger.work_items, ['P', 1, 'S', 3, 'M', 1, 'W', 10].join(''));

  assert.ok(s3m1w10);

  assert.strictEqual(s3m1w10.title, 'Public source extraction golden output freeze gate');

  assert.strictEqual(s3m1w10.status, 'closed');

  const s3m1w11 = findById(rootLedger.work_items, ['P', 1, 'S', 3, 'M', 1, 'W', 11].join(''));

  assert.ok(s3m1w11);

  assert.strictEqual(s3m1w11.title, 'Public source module extraction adapter boundary gate');

  assert.strictEqual(s3m1w11.status, 'closed');

  const s3m1w12 = findById(rootLedger.work_items, ['P', 1, 'S', 3, 'M', 1, 'W', 12].join(''));

  assert.ok(s3m1w12);

  assert.strictEqual(s3m1w12.title, 'Public source module extraction first slice gate');

  assert.strictEqual(s3m1w12.status, 'closed');

  const s3m1w13 = findById(rootLedger.work_items, ['P', 1, 'S', 3, 'M', 1, 'W', 13].join(''));

  assert.ok(s3m1w13);

  assert.strictEqual(s3m1w13.title, 'Public source module extraction bundle parity gate');

  assert.strictEqual(s3m1w13.status, 'closed');

  const s3m1w14 = findById(rootLedger.work_items, ['P', 1, 'S', 3, 'M', 1, 'W', 14].join(''));

  assert.ok(s3m1w14);

  assert.strictEqual(s3m1w14.title, 'Public source module extraction runtime bridge gate');

  assert.strictEqual(s3m1w14.status, 'closed');

  const s3m1w15 = findById(rootLedger.work_items, ['P', 1, 'S', 3, 'M', 1, 'W', 15].join(''));

  assert.ok(s3m1w15);

  assert.strictEqual(s3m1w15.title, 'Public source module extraction installed fallback smoke gate');

  assert.strictEqual(s3m1w15.status, 'closed');

  const s3m1w16 = findById(rootLedger.work_items, ['P', 1, 'S', 3, 'M', 1, 'W', 16].join(''));

  assert.ok(s3m1w16);

  assert.strictEqual(s3m1w16.title, 'Public source module extraction second slice planning gate');

  assert.strictEqual(s3m1w16.status, 'closed');

  const s3m1w17 = findById(rootLedger.work_items, ['P', 1, 'S', 3, 'M', 1, 'W', 17].join(''));

  assert.ok(s3m1w17);

  assert.strictEqual(s3m1w17.title, 'Public source module extraction second slice first-slice gate');

  assert.strictEqual(s3m1w17.status, 'closed');

  const s3m1w18 = findById(rootLedger.work_items, ['P', 1, 'S', 3, 'M', 1, 'W', 18].join(''));

  assert.ok(s3m1w18);

  assert.strictEqual(s3m1w18.title, 'Public source module extraction authority bundle parity gate');

  assert.strictEqual(s3m1w18.status, 'closed');

  const s3m1w19 = findById(rootLedger.work_items, ['P', 1, 'S', 3, 'M', 1, 'W', 19].join(''));

  assert.ok(s3m1w19);

  assert.strictEqual(s3m1w19.title, 'Public source module extraction authority runtime bridge gate');

  assert.strictEqual(s3m1w19.status, 'closed');
  assert.ok(s3m1w19.closure);
  assert.ok(s3m1w19.closure.summary.includes('authority runtime bridge'));

  assert.ok(fs.existsSync(path.join(ROOT, 'AGENTS.md')));

  assert.ok(fs.existsSync(path.join(ROOT, 'agent-onboard.target.json')));

  assert.ok(fs.existsSync(path.join(ROOT, '.agent-onboard', 'project.json')));

  assert.ok(fs.existsSync(path.join(ROOT, 'llms.txt')));

  assert.ok(fs.existsSync(path.join(ROOT, '.agent-onboard', 'authority-path.json')));

  assert.ok(fs.existsSync(path.join(ROOT, '.agent-onboard', 'source-partition-plan.json')));
  assert.ok(fs.existsSync(path.join(ROOT, '.agent-onboard', 'source-extraction-rehearsal.json')));
  assert.ok(fs.existsSync(path.join(ROOT, '.agent-onboard', 'source-module-extraction-adapter-boundary.json')));
  assert.ok(fs.existsSync(path.join(ROOT, '.agent-onboard', 'source-module-extraction-first-slice.json')));

  assert.ok(fs.existsSync(path.join(ROOT, '.agent-onboard', 'source-module-extraction-bundle-parity.json')));
  assert.ok(fs.existsSync(path.join(ROOT, '.agent-onboard', 'source-module-extraction-runtime-bridge.json')));
  assert.ok(fs.existsSync(path.join(ROOT, '.agent-onboard', 'source-module-extraction-installed-fallback-smoke.json')));
  assert.ok(fs.existsSync(path.join(ROOT, '.agent-onboard', 'source-module-extraction-second-slice-plan.json')));
  assert.ok(fs.existsSync(path.join(ROOT, 'src', 'domains', 'authority.js')));
  assert.ok(fs.existsSync(path.join(ROOT, '.agent-onboard', 'source-module-extraction-second-slice-first-slice.json')));
  assert.ok(fs.existsSync(path.join(ROOT, '.agent-onboard', 'source-module-extraction-authority-bundle-parity.json')));
  assert.ok(fs.existsSync(path.join(ROOT, '.agent-onboard', 'source-module-extraction-authority-runtime-bridge.json')));
  assert.ok(fs.existsSync(path.join(ROOT, '.agent-onboard', 'source-module-extraction-second-slice-plan.json')));
  assert.ok(fs.existsSync(path.join(ROOT, 'src', 'domains', 'core.js')));

  assert.ok(fs.existsSync(path.join(ROOT, '.agent-onboard', 'runtime-namespace.json')));

}

{
  const gitignore = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
  assert.ok(!/^\.agent-onboard\/\s*$/m.test(gitignore));
  assert.ok(!/^\.agent-onboard\/\*\s*$/m.test(gitignore));
  assert.ok(!/^!\.agent-onboard\/source-module-extraction-.*\.json\s*$/m.test(gitignore));
  assert.ok(/^\.agent-onboard\/tmp\/\s*$/m.test(gitignore));
  assert.ok(/^\.agent-onboard\/cache\/\s*$/m.test(gitignore));
  assert.ok(/^\.agent-onboard\/local\/\s*$/m.test(gitignore));
}

{
  const pack = runNpmPackDryRun();
  assert.strictEqual(pack.status, 0, pack.stderr || pack.stdout || (pack.error && pack.error.message));
  const parsed = JSON.parse(pack.stdout);
  assert.strictEqual(parsed.length, 1);
  const files = parsed[0].files.map((item) => item.path).sort();
  assert.deepStrictEqual(files, EXPECTED_PACK_FILES);
  const forbiddenConcreteWorkItem = new RegExp('P\\d+S\\d+M\\d+W\\d+');
  for (const rel of files) {
    const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    assert.strictEqual(forbiddenConcreteWorkItem.test(text), false, `${rel} contains concrete work-item id`);
  }
}


{
  const result = run(['guard', '--plan']);
  const output = readJsonOutput(result);
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.admitted_command, 'agent-onboard guard --check-boundary');
  assert.strictEqual(output.writes_files, false);
}

{
  const dir = tempRepo();
  const init = run(['init', '--write'], { cwd: dir });
  readJsonOutput(init);
  const result = run(['guard', '--check-boundary'], { cwd: dir });
  const output = readJsonOutput(result);
  assert.strictEqual(output.status, 'pass');
  assert.strictEqual(output.reads_target_config, true);
  assert.strictEqual(output.blocked_violation_count, 0);
  assert.strictEqual(output.writes_files, false);
  assert.strictEqual(output.git_mutation, false);
}

{
  const dir = tempRepo();
  const result = run(['guard', '--check-boundary'], { cwd: dir });
  const output = readJsonFailure(result);
  assert.strictEqual(result.status, 2);
  assert.strictEqual(output.status, 'blocked');
  assert.strictEqual(output.reason, 'missing agent-onboard.target.json in current target repo root');
  assert.strictEqual(output.writes_files, false);
}

{
  const dir = tempRepo();
  const config = cliTargetConfigForTest(dir);
  config.control.requested_mode = 'target_write';
  config.boundaries.writes_allowed = true;
  fs.writeFileSync(path.join(dir, 'agent-onboard.target.json'), JSON.stringify(config, null, 2) + '\n');
  const result = run(['guard', '--check-boundary'], { cwd: dir });
  const output = readJsonFailure(result);
  assert.strictEqual(result.status, 2);
  assert.strictEqual(output.status, 'blocked');
  assert.ok(output.violations.some((violation) => violation.path === 'control.requested_mode'));
  assert.ok(output.violations.some((violation) => violation.path === 'boundaries.writes_allowed'));
  assert.strictEqual(output.installs_dependencies, false);
  assert.strictEqual(output.runs_managed_project_commands, false);
}

{
  const dir = tempRepo();
  fs.writeFileSync(path.join(dir, 'agent-onboard.target.json'), '{not-json}\n');
  const result = run(['guard', '--check-boundary'], { cwd: dir });
  const output = readJsonFailure(result);
  assert.strictEqual(result.status, 2);
  assert.strictEqual(output.status, 'blocked');
  assert.strictEqual(output.reads_target_config, true);
}

{
  const cli = require('../cli/agent-onboard.js');
  const invalid = cli.targetConfigTemplate();
  delete invalid.boundaries.writes_allowed;
  const errors = cli.validateTargetConfig(invalid);
  assert.ok(errors.some((error) => error.includes('writes_allowed')));
  const generatedAgents = cli.agentsMdTemplate(tempRepo());
  assert.ok(generatedAgents.includes('AGENTS.md'));
  assert.ok(generatedAgents.includes('Follow the public participation lifecycle'));
  assert.ok(cli.participationLifecycleNextSteps().some((step) => step.startsWith('discover:')));
  assert.ok(cli.handoffEvidenceChecklist().some((step) => step.startsWith('summary:')));
  assert.strictEqual(cli.publicReleaseCheck().status, 'ok');
  assert.strictEqual(cli.sourceContext().package_context, 'source_repository');
  assert.strictEqual(cli.sourceWorkItemsLedgerCheck().present, true);

  const installedLike = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-onboard-installed-like-'));
  copyExpectedPackFiles(installedLike);
  const installedCheck = cli.publicReleaseCheck(installedLike);
  assert.strictEqual(installedCheck.status, 'ok');
  assert.strictEqual(installedCheck.source_context.package_context, 'installed_package');
  assert.strictEqual(installedCheck.source_work_items_ledger.present, false);
  assert.strictEqual(installedCheck.source_work_items_ledger.status, 'skipped');
  const installedParity = cli.publicInstalledPackageParitySmoke(installedLike);
  assert.strictEqual(installedParity.status, 'ok');
  assert.strictEqual(installedParity.source_context.package_context, 'installed_package');
  assert.strictEqual(installedParity.parity.source_context_excluded_from_pack, true);
  assert.strictEqual(installedParity.boundary.runs_package_manager, false);
  const installedArchitectureParity = cli.publicInstalledParityArchitectureSmoke(installedLike);
  assert.strictEqual(installedArchitectureParity.status, 'ok');
  assert.strictEqual(installedArchitectureParity.source_context.package_context, 'installed_package');
  assert.strictEqual(installedArchitectureParity.parity.architecture_check, true);
  assert.strictEqual(installedArchitectureParity.parity.source_context_excluded_from_pack, true);
  assert.strictEqual(cli.PUBLIC_RELEASE_FIXTURE_MATRIX.schema, 'agent-onboard-public-release-fixture-matrix-022');
  assert.ok(cli.PUBLIC_RELEASE_FIXTURE_MATRIX.fixtures.some((fixture) => fixture.id === 'public_work_items_domain_source_extraction_plan'));
  assert.ok(cli.PUBLIC_RELEASE_FIXTURE_MATRIX.fixtures.some((fixture) => fixture.id === 'target_onboarding_dry_run_fixture_matrix'));
  assert.strictEqual(cli.TARGET_ONBOARDING_SURFACE_PLAN.schema, 'agent-onboard-public-target-onboarding-surface-plan-001');
  assert.strictEqual(cli.targetOnboardingSurfacePlan(tempRepo()).status, 'ok');
  assert.strictEqual(cli.TARGET_ONBOARDING_DRY_RUN_FIXTURE_MATRIX.schema, 'agent-onboard-public-target-onboarding-fixture-matrix-002');
  assert.strictEqual(cli.targetOnboardingDryRunFixture(tempRepo()).status, 'ok');
  const trialRepo = tempRepo();
  const trialResult = cli.targetOnboardingRealTargetTrial(trialRepo);
  assert.strictEqual(trialResult.status, 'ok');
  assert.strictEqual(trialResult.ready_for_explicit_write, true);
  assert.strictEqual(trialResult.writes_performed, false);
  assert.strictEqual(cli.publicTargetOnboardingRealTargetRepoTrial().status, 'ok');
  assert.deepStrictEqual(cli.planTargetOnboardingWritesForRoot(tempRepo()).map((item) => item.path), ['agent-onboard.target.json', '.agent-onboard/runtime-namespace.json', '.agent-onboard/project.json', '.agent-onboard/work-items.json', 'AGENTS.md', 'llms.txt', '.agent-onboard/authority-path.json']);

  function installedFixture(mutator) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-onboard-release-fixture-'));
    copyExpectedPackFiles(dir);
    if (mutator) mutator(dir);
    return cli.publicReleaseCheck(dir);
  }

  const staleVersion = installedFixture((dir) => {
    const pkgPath = path.join(dir, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    pkg.version = '0.0.18';
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  });
  assert.strictEqual(staleVersion.status, 'error');
  assert.ok(staleVersion.errors.some((error) => error.includes(`package.json#version must match runtime version ${EXPECTED_VERSION}`)));

  const packDrift = installedFixture((dir) => {
    const pkgPath = path.join(dir, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    pkg.files.push('AGENTS.md');
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  });
  assert.strictEqual(packDrift.status, 'error');
  assert.strictEqual(packDrift.validated.projected_pack_allowlist, false);

  const missingBin = installedFixture((dir) => {
    fs.unlinkSync(path.join(dir, 'cli', 'agent-onboard.js'));
  });
  assert.strictEqual(missingBin.status, 'error');
  assert.strictEqual(missingBin.validated.bin_entrypoints_exist, false);

  const publicArtifactMessage = installedFixture((dir) => {
    const reservedWorkItem = ['P', '1', 'S', '1', 'M', '2', 'W', '2'].join('');
    fs.writeFileSync(path.join(dir, 'README.md'), `Reserved fixture token ${reservedWorkItem}\n`);
  });
  assert.strictEqual(publicArtifactMessage.status, 'error');
  assert.strictEqual(publicArtifactMessage.validated.public_artifact_messaging, false);
}


{
  const tarball = packSourceTarball();
  const installRoot = tempRepo();
  const install = runNpm(['install', tarball, '--no-save', '--ignore-scripts', '--no-audit', '--fund=false'], installRoot);
  assert.strictEqual(install.status, 0, install.stderr || install.stdout || (install.error && install.error.message));
  const installedCli = path.join(installRoot, 'node_modules', 'agent-onboard', 'cli', 'agent-onboard.js');
  assert.ok(fs.existsSync(installedCli));

  const status = runNodeScript(installedCli, ['status'], installRoot);
  const statusOutput = readJsonOutput(status);
  assert.strictEqual(statusOutput.version, EXPECTED_VERSION);
  assert.strictEqual(statusOutput.release_line, EXPECTED_RELEASE_LINE);

  const installedCheck = runNodeScript(installedCli, ['release', '--check'], installRoot);
  const installedCheckOutput = readJsonOutput(installedCheck);
  assert.strictEqual(installedCheckOutput.status, 'ok');
  assert.strictEqual(installedCheckOutput.source_context.package_context, 'installed_package');
  assert.strictEqual(installedCheckOutput.source_work_items_ledger.status, 'skipped');

  const installedHandoff = runNodeScript(installedCli, ['release', '--post-publish-handoff'], installRoot);
  const installedHandoffOutput = readJsonOutput(installedHandoff);
  assert.strictEqual(installedHandoffOutput.status, 'ok');
  assert.strictEqual(installedHandoffOutput.source_context.package_context, 'installed_package');
  assert.ok(installedHandoffOutput.verification_commands.includes(`${EXPECTED_VERSIONED_NPX} release --check`));
  assert.ok(installedHandoffOutput.verification_commands.includes(`${EXPECTED_VERSIONED_NPX} release --published-acceptance`));
  assert.ok(installedHandoffOutput.verification_commands.includes(`${EXPECTED_VERSIONED_NPX} release --real-target-trial`));
  assert.ok(installedHandoffOutput.verification_commands.includes(`${EXPECTED_VERSIONED_NPX} architecture --map`));
  assert.ok(installedHandoffOutput.verification_commands.includes(`${EXPECTED_VERSIONED_NPX} architecture --router`));
  assert.ok(installedHandoffOutput.verification_commands.includes(`${EXPECTED_VERSIONED_NPX} architecture --facades`));
  assert.ok(installedHandoffOutput.verification_commands.includes(`${EXPECTED_VERSIONED_NPX} architecture --partition-plan`));
  assert.ok(installedHandoffOutput.verification_commands.includes(`${EXPECTED_VERSIONED_NPX} architecture --partition-check`));
  assert.ok(installedHandoffOutput.verification_commands.includes(`${EXPECTED_VERSIONED_NPX} architecture --extraction-rehearsal`));
  assert.ok(installedHandoffOutput.verification_commands.includes(`${EXPECTED_VERSIONED_NPX} architecture --extraction-check`));
  assert.ok(installedHandoffOutput.verification_commands.includes(`${EXPECTED_VERSIONED_NPX} authority --first-read`));
  assert.ok(installedHandoffOutput.verification_commands.includes(`${EXPECTED_VERSIONED_NPX} authority --check`));
  assert.ok(installedHandoffOutput.verification_commands.includes(`${EXPECTED_VERSIONED_NPX} target runtime --namespace`));
  assert.ok(installedHandoffOutput.verification_commands.includes(`${EXPECTED_VERSIONED_NPX} target runtime --check`));
  assert.ok(installedHandoffOutput.verification_commands.includes(`${EXPECTED_VERSIONED_NPX} release --surface`));
  assert.ok(installedHandoffOutput.verification_commands.includes(`${EXPECTED_VERSIONED_NPX} release --surface-check`));
  assert.ok(installedHandoffOutput.verification_commands.includes(`${EXPECTED_VERSIONED_NPX} architecture --check`));

  const installedAcceptance = runNodeScript(installedCli, ['release', '--published-acceptance'], installRoot);
  assert.strictEqual(installedAcceptance.status, 0, installedAcceptance.stderr);
  const installedAcceptanceOutput = JSON.parse(installedAcceptance.stdout);
  assert.strictEqual(installedAcceptanceOutput.status, 'ok');
  assert.strictEqual(installedAcceptanceOutput.source_context.package_context, 'installed_package');
  assert.strictEqual(installedAcceptanceOutput.acceptance_mode, 'published_or_installed_package_acceptance');

  const installedRealTrial = runNodeScript(installedCli, ['release', '--real-target-trial'], installRoot);
  const installedRealTrialOutput = readJsonOutput(installedRealTrial);
  assert.strictEqual(installedRealTrialOutput.status, 'ok');
  assert.strictEqual(installedRealTrialOutput.source_context.package_context, 'installed_package');
  assert.strictEqual(installedRealTrialOutput.validated.trial_writes_no_files, true);

  const installedSmoke = runNodeScript(installedCli, ['release', '--target-onboarding-smoke'], installRoot);
  const installedSmokeOutput = readJsonOutput(installedSmoke);
  assert.strictEqual(installedSmokeOutput.status, 'ok');
  assert.strictEqual(installedSmokeOutput.observed.package_context, 'installed_package');
  assert.strictEqual(installedSmokeOutput.validated.explicit_write_performed_in_temporary_target, true);
  assert.strictEqual(installedSmokeOutput.validated.canonical_target_files_only, true);
  assert.strictEqual(installedSmokeOutput.boundary.cleans_up_temp_target_repository, true);

  const targetRoot = tempRepo();
  const installedTargetTrial = runNodeScript(installedCli, ['target', 'onboarding', '--trial'], targetRoot);
  const installedTargetTrialOutput = readJsonOutput(installedTargetTrial);
  assert.strictEqual(installedTargetTrialOutput.status, 'ok');
  assert.strictEqual(installedTargetTrialOutput.ready_for_explicit_write, true);
  assert.strictEqual(fs.existsSync(path.join(targetRoot, 'AGENTS.md')), false);

  const write = runNodeScript(installedCli, ['target', 'onboarding', '--write'], targetRoot);
  const writeOutput = readJsonOutput(write);
  assert.strictEqual(writeOutput.status, 'ok');
  assert.deepStrictEqual(writeOutput.written_files, ['agent-onboard.target.json', '.agent-onboard/runtime-namespace.json', '.agent-onboard/project.json', '.agent-onboard/work-items.json', 'AGENTS.md', 'llms.txt', '.agent-onboard/authority-path.json']);
  assert.strictEqual(fs.existsSync(path.join(targetRoot, 'agent-onboard.target.json')), true);
  assert.strictEqual(fs.existsSync(path.join(targetRoot, '.agent-onboard', 'project.json')), true);
  assert.strictEqual(fs.existsSync(path.join(targetRoot, '.agent-onboard', 'work-items.json')), true);
  assert.strictEqual(fs.existsSync(path.join(targetRoot, 'AGENTS.md')), true);
  assert.strictEqual(fs.existsSync(path.join(targetRoot, 'node_modules')), false);
}


{
  const forbiddenKey = ['machine', 'identifier'].join('_');
  const forbiddenWorkItemPattern = new RegExp('P\\d+S\\d+M\\d+W\\d+');
  const ignoredDirs = new Set(['node_modules', '.git']);
  const textExtensions = new Set(['', '.js', '.json', '.md', '.txt']);

  function walk(dir) {
    const entries = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ignoredDirs.has(entry.name)) continue;
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) entries.push(...walk(abs));
      else entries.push(abs);
    }
    return entries;
  }

  const violations = [];
  for (const abs of walk(ROOT)) {
    const rel = path.relative(ROOT, abs).split(path.sep).join('/');
    const ext = path.extname(rel);
    if (!textExtensions.has(ext) && rel !== 'LICENSE') continue;
    const text = fs.readFileSync(abs, 'utf8');
    if (text.includes(forbiddenKey)) violations.push(`${rel}: reserved implementation key token`);
    const match = forbiddenWorkItemPattern.exec(text);
    const sourceControlArtifact = rel.startsWith('.agent-onboard/') && rel.endsWith('.json');
    if (match && rel !== '.agent-onboard/work-items.json' && !sourceControlArtifact) {
      violations.push(`${rel}: reserved concrete work-item token ${match[0]}`);
    }
  }
  assert.deepStrictEqual(violations, []);
}


{
  const rx = (parts, flags = 'i') => new RegExp(parts.join(''), flags);
  const forbiddenNarrativePatterns = [
    rx(['pri', 'vate\\s*\\/\\s*pub', 'lic\\s+sp', 'lit']),
    rx(['int', 'ernal\\s+li', 'ne']),
    rx(['rese', 'arch\\s+li', 'ne']),
    rx(['str', 'ipp?ed']),
    rx(['sani', 'ti[sz]ed']),
    rx(['\\b', 'le', 'ak(?:age|ed|s|ing)?\\b'])
  ];
  const scannedFiles = ['README.md', 'package.json', 'cli/agent-onboard.js'];
  const violations = [];
  for (const rel of scannedFiles) {
    const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    for (let index = 0; index < forbiddenNarrativePatterns.length; index += 1) {
      const match = forbiddenNarrativePatterns[index].exec(text);
      if (match) violations.push(`${rel}: narrative-rule-${index + 1}: ${match[0]}`);
    }
  }
  assert.deepStrictEqual(violations, []);
}


{
  const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  assert.ok(readme.includes('work-items --claim --write --id <public-work-item-id> --actor <actor>'));
  assert.ok(readme.includes('work-items --close --write --id <public-work-item-id> --actor <actor> --summary <summary>'));
  assert.ok(!readme.includes('This release does not add claim write'));
  assert.ok(readme.includes('`0.0.11` adds public `work-items --claim --dry-run`'));
  assert.ok(readme.includes('`0.0.13` adds source self-dogfood and agent participation support'));
  assert.ok(readme.includes('`0.0.14` adds the public source participation lifecycle gate'));
  assert.ok(readme.includes('`0.0.15` adds the public handoff and closure evidence gate'));

  assert.ok(readme.includes('`0.0.16` aligns public source closure tests'));
  assert.ok(readme.includes('`0.0.17` adds public `release --plan` and `release --check`'));
  assert.ok(readme.includes('`0.0.18` absorbs that release surface into a normalized public release contract'));
  assert.ok(readme.includes('`0.0.19` adds a public package contract fixture matrix'));
  assert.ok(readme.includes('`0.0.20` adds installed package parity smoke'));
  assert.ok(readme.includes('`0.0.21` adds the public target onboarding surface plan'));
  assert.ok(readme.includes('`0.0.22` adds the public target onboarding dry-run fixture matrix'));
  assert.ok(readme.includes('`0.0.23` adds the public target onboarding explicit write boundary'));
  assert.ok(readme.includes('`0.0.24` adds the public target onboarding installed-package smoke'));
  assert.ok(readme.includes('`0.0.25` adds the public target onboarding post-publish verification handoff'));
  assert.ok(readme.includes('`0.0.26` adds the public target onboarding published package acceptance gate'));
  assert.ok(readme.includes('`0.0.29` adds the public command router boundary gate'));
  assert.ok(readme.includes('`0.0.30` adds the public domain service facade gate'));
  assert.ok(readme.includes('`0.0.31` adds the public authority first-read index gate'));
  assert.ok(readme.includes('`0.0.32` adds the public target runtime namespace gate'));
  assert.ok(readme.includes('`0.0.33` adds the public package surface preservation gate'));
  assert.ok(readme.includes('`0.0.34` adds the public installed parity architecture smoke gate'));
  assert.ok(readme.includes('`0.0.35` adds the public source domain module partition planning gate'));
  assert.ok(readme.includes('This release adds the public source module extraction adapter boundary gate'));
  assert.ok(readme.includes('This release adds the public source extraction golden output freeze gate'));
  assert.ok(readme.includes('npx agent-onboard architecture --golden-outputs'));
  assert.ok(readme.includes('npx agent-onboard architecture --golden-check'));
  assert.ok(readme.includes('npx agent-onboard architecture --adapter-boundary'));
  assert.ok(readme.includes('npx agent-onboard architecture --adapter-check'));
  assert.ok(readme.includes('npx agent-onboard architecture --first-slice'));
  assert.ok(readme.includes('npx agent-onboard architecture --first-slice-check'));
  assert.ok(readme.includes('npx agent-onboard architecture --bundle-parity'));
  assert.ok(readme.includes('npx agent-onboard architecture --bundle-parity-check'));
  assert.ok(readme.includes('npx agent-onboard architecture --runtime-bridge'));
  assert.ok(readme.includes('npx agent-onboard architecture --runtime-bridge-check'));
  assert.ok(readme.includes('npx agent-onboard architecture --installed-fallback-smoke'));
  assert.ok(readme.includes('npx agent-onboard architecture --installed-fallback-check'));
  assert.ok(readme.includes('npx agent-onboard architecture --second-slice-plan'));
  assert.ok(readme.includes('npx agent-onboard architecture --second-slice-check'));
  assert.ok(readme.includes('npx agent-onboard architecture --second-slice-first-slice'));
  assert.ok(readme.includes('npx agent-onboard architecture --second-slice-first-slice-check'));
  assert.ok(readme.includes('npx agent-onboard architecture --authority-bundle-parity'));
  assert.ok(readme.includes('npx agent-onboard architecture --authority-bundle-parity-check'));
  assert.ok(readme.includes('npx agent-onboard architecture --authority-runtime-bridge'));
  assert.ok(readme.includes('npx agent-onboard architecture --authority-runtime-bridge-check'));
  assert.ok(readme.includes('This release adds the public source module extraction installed fallback smoke gate'));
  assert.ok(readme.includes('This release adds the public source module extraction runtime bridge gate'));
  assert.ok(readme.includes('This release adds the public source module extraction authority runtime bridge gate'));
  assert.ok(readme.includes('This release adds the public source module extraction first slice gate'));
  assert.ok(readme.includes('npx agent-onboard release --version-sprawl-check'));
  assert.ok(readme.includes('npx agent-onboard architecture --partition-plan'));
  assert.ok(readme.includes('npx agent-onboard architecture --partition-check'));
  assert.ok(readme.includes('npx agent-onboard architecture --extraction-rehearsal'));
  assert.ok(readme.includes('npx agent-onboard architecture --extraction-check'));
  assert.ok(readme.includes('npx agent-onboard release --surface'));
  assert.ok(readme.includes('npx agent-onboard release --surface-check'));
  assert.ok(readme.includes('npx agent-onboard authority --first-read'));
  assert.ok(readme.includes('npx agent-onboard authority --check'));
  assert.ok(readme.includes('npx agent-onboard target onboarding --write'));
  assert.ok(readme.includes('npx agent-onboard target onboarding --fixture'));
  assert.ok(readme.includes('npx agent-onboard target onboarding --trial'));
  assert.ok(readme.includes('npx agent-onboard target onboarding --plan'));
  assert.ok(readme.includes('The plan reports the target identity inferred from the current directory'));
  assert.ok(readme.includes('npx agent-onboard release --parity-smoke'));
  assert.ok(readme.includes('npx agent-onboard release --architecture-parity-smoke'));
  assert.ok(readme.includes('npx agent-onboard release --target-onboarding-smoke'));
  assert.ok(readme.includes('npx agent-onboard release --post-publish-handoff'));
  assert.ok(readme.includes('npx agent-onboard release --published-acceptance'));
  assert.ok(readme.includes('npx agent-onboard release --real-target-trial'));
  assert.ok(readme.includes('npx agent-onboard release --contract'));
  assert.ok(readme.includes('npx agent-onboard release --fixture'));
  assert.ok(readme.includes('npx agent-onboard release --check'));
  assert.ok(readme.includes('The check validates package metadata, bin entrypoints, the projected npm pack allowlist'));
  assert.ok(readme.includes('The parity smoke checks that the source candidate release check passes'));
  assert.ok(readme.includes('The architecture parity smoke validates that architecture, source-partition, source-extraction, authority, target-runtime, and package-surface checks still pass'));
  assert.ok(readme.includes('The target onboarding smoke creates and removes a temporary target repo'));
  assert.ok(readme.includes('The post-publish handoff emits the version-pinned npm view and npx commands'));
  assert.ok(readme.includes('The published acceptance command composes release check'));
  assert.ok(readme.includes('The real target trial command runs a no-write onboarding readiness check'));
  assert.ok(readme.includes('source work-item ledger when that ledger is present'));
  assert.ok(readme.includes('The claim response also returns `next_steps`'));
  assert.ok(readme.includes('The close command reads the existing ledger'));
}


{
  const help = run(['--help']);
  assert.ok(help.stdout.includes('work-items --claim --dry-run|--write --id <public-work-item-id> --actor <actor>'));
  assert.ok(help.stdout.includes('work-items --close --dry-run|--write --id <public-work-item-id> --actor <actor> --summary <summary>'));
  assert.ok(help.stdout.includes('--claims-installed-fallback-smoke|--claims-installed-fallback-check|--source-domain-closure-review|--source-domain-closure-check|--cli-runtime-plan|--cli-runtime-check|--thin-router|--thin-router-check|--compatibility-port|--compatibility-port-check|--core-adapter|--core-adapter-check|--package-adapter|--package-adapter-check|--architecture-adapter|--architecture-adapter-check|--authority-adapter|--authority-adapter-check|--module-inclusion-plan|--module-inclusion-check|--packaged-router-port|--packaged-router-port-check|--thin-entrypoint-rehearsal|--thin-entrypoint-rehearsal-check|--thin-entrypoint-cutover|--thin-entrypoint-cutover-check|--check'));
  assert.ok(help.stdout.includes('release --plan|--contract|--fixture|--surface|--surface-check|--version-sprawl-check|--parity-smoke|--architecture-parity-smoke|--target-onboarding-smoke|--post-publish-handoff|--published-acceptance|--real-target-trial|--check'));
  assert.ok(help.stdout.includes('target runtime --namespace|--check'));
  assert.ok(help.stdout.includes('target onboarding --plan|--fixture|--trial [--target <path>]|--write [--force]'));
}

{
  const agents = fs.readFileSync(path.join(ROOT, 'AGENTS.md'), 'utf8');
  assert.ok(agents.includes('node cli/agent-onboard.js work-items --list'));
  assert.ok(agents.includes('node cli/agent-onboard.js work-items --claim --write --id <public-work-item-id> --actor <agent-or-human-name>'));
  assert.ok(agents.includes('node cli/agent-onboard.js work-items --close --dry-run --id <public-work-item-id> --actor <agent-or-human-name> --summary <summary>'));
  assert.ok(agents.includes('node cli/agent-onboard.js architecture --map'));
  assert.ok(agents.includes('node cli/agent-onboard.js architecture --router'));
  assert.ok(agents.includes('node cli/agent-onboard.js architecture --facades'));
  assert.ok(agents.includes('node cli/agent-onboard.js architecture --partition-plan'));
  assert.ok(agents.includes('node cli/agent-onboard.js architecture --partition-check'));
  assert.ok(agents.includes('node cli/agent-onboard.js architecture --golden-outputs'));
  assert.ok(agents.includes('node cli/agent-onboard.js architecture --golden-check'));
  assert.ok(agents.includes('node cli/agent-onboard.js architecture --adapter-boundary'));
  assert.ok(agents.includes('node cli/agent-onboard.js architecture --adapter-check'));
  assert.ok(agents.includes('node cli/agent-onboard.js architecture --first-slice'));
  assert.ok(agents.includes('node cli/agent-onboard.js architecture --first-slice-check'));
  assert.ok(agents.includes('node cli/agent-onboard.js architecture --bundle-parity'));
  assert.ok(agents.includes('node cli/agent-onboard.js architecture --bundle-parity-check'));
  assert.ok(agents.includes('node cli/agent-onboard.js architecture --runtime-bridge'));
  assert.ok(agents.includes('node cli/agent-onboard.js architecture --runtime-bridge-check'));
  assert.ok(agents.includes('node cli/agent-onboard.js architecture --installed-fallback-smoke'));
  assert.ok(agents.includes('node cli/agent-onboard.js architecture --installed-fallback-check'));
  assert.ok(agents.includes('node cli/agent-onboard.js architecture --second-slice-plan'));
  assert.ok(agents.includes('node cli/agent-onboard.js architecture --second-slice-check'));
  assert.ok(agents.includes('node cli/agent-onboard.js architecture --second-slice-first-slice'));
  assert.ok(agents.includes('node cli/agent-onboard.js architecture --second-slice-first-slice-check'));
  assert.ok(agents.includes('node cli/agent-onboard.js architecture --authority-bundle-parity'));
  assert.ok(agents.includes('node cli/agent-onboard.js architecture --authority-bundle-parity-check'));
  assert.ok(agents.includes('node cli/agent-onboard.js architecture --authority-runtime-bridge'));
  assert.ok(agents.includes('node cli/agent-onboard.js architecture --authority-runtime-bridge-check'));
  assert.ok(agents.includes('node cli/agent-onboard.js architecture --work-items-plan'));
  assert.ok(agents.includes('node cli/agent-onboard.js architecture --work-items-check'));
  assert.ok(agents.includes('node cli/agent-onboard.js architecture --work-items-first-slice'));
  assert.ok(agents.includes('node cli/agent-onboard.js architecture --work-items-first-slice-check'));
  assert.ok(agents.includes('node cli/agent-onboard.js architecture --work-items-installed-fallback-smoke'));
  assert.ok(agents.includes('node cli/agent-onboard.js architecture --work-items-installed-fallback-check'));
  assert.ok(agents.includes('node cli/agent-onboard.js architecture --check'));
assert.ok(agents.includes('node cli/agent-onboard.js target runtime --namespace'));
assert.ok(agents.includes('node cli/agent-onboard.js target runtime --check'));
  assert.ok(agents.includes('node cli/agent-onboard.js release --check'));
  assert.ok(agents.includes('node cli/agent-onboard.js release --contract'));
  assert.ok(agents.includes('node cli/agent-onboard.js release --fixture'));
  assert.ok(agents.includes('node cli/agent-onboard.js release --surface'));
  assert.ok(agents.includes('node cli/agent-onboard.js release --surface-check'));
  assert.ok(agents.includes('node cli/agent-onboard.js release --version-sprawl-check'));
  assert.ok(agents.includes('node cli/agent-onboard.js release --parity-smoke'));
  assert.ok(agents.includes('node cli/agent-onboard.js release --architecture-parity-smoke'));
  assert.ok(agents.includes('node cli/agent-onboard.js release --target-onboarding-smoke'));
  assert.ok(agents.includes('node cli/agent-onboard.js release --post-publish-handoff'));
  assert.ok(agents.includes('node cli/agent-onboard.js release --published-acceptance'));
  assert.ok(agents.includes('node cli/agent-onboard.js release --real-target-trial'));
  assert.ok(agents.includes('node cli/agent-onboard.js target onboarding --plan'));
  assert.ok(agents.includes('node cli/agent-onboard.js target onboarding --fixture'));
  assert.ok(agents.includes('node cli/agent-onboard.js target onboarding --trial'));
  assert.ok(agents.includes('node cli/agent-onboard.js target onboarding --write'));
  assert.ok(!agents.includes('npx agent-onboard@0.0.19'));
  assert.ok(!agents.includes('npx agent-onboard@0.0.18'));
  assert.ok(!agents.includes('npx agent-onboard@0.0.17'));
  assert.ok(!agents.includes('npx agent-onboard@0.0.16'));
  assert.ok(!agents.includes('npx agent-onboard@0.0.29'));
  assert.ok(!agents.includes('npx agent-onboard@0.0.15'));
}

{
  const result = run(['architecture', '--m2-seed-check']);
  const output = readJsonOutput(result);
  assert.strictEqual(output.schema, 'agent-onboard-public-architecture-m1-closure-m2-seed-check-result-001');
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.version, EXPECTED_VERSION);
  assert.strictEqual(output.release_line, EXPECTED_RELEASE_LINE);
  assert.strictEqual(output.command, 'agent-onboard architecture --m2-seed-check');
  assert.ok(output.validated.prerequisite_authority_runtime_bridge);
  assert.ok(output.validated.m1_milestone_closed_or_installed_context_allowed);
  assert.ok(output.validated.m1_work_items_all_closed_or_installed_context_allowed);
  assert.ok(output.validated.m2_milestone_open_or_installed_context_allowed);
  assert.ok(output.validated.seed_work_item_closed_or_installed_context_allowed);
  assert.ok(output.validated.next_work_item_seeded_or_installed_context_allowed);
  assert.strictEqual(output.milestone_transition.closed_milestone.status, 'closed');
  assert.strictEqual(output.milestone_transition.opened_milestone.status, 'closed');
  assert.strictEqual(output.milestone_transition.next_work_item.status, 'closed');
  assert.deepStrictEqual(output.errors, []);
}


{
  const result = run(['architecture', '--work-items-check']);
  const output = readJsonOutput(result);
  assert.strictEqual(output.schema, 'agent-onboard-public-work-items-domain-source-extraction-plan-check-result-001');
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.version, EXPECTED_VERSION);
  assert.strictEqual(output.release_line, EXPECTED_RELEASE_LINE);
  assert.strictEqual(output.command, 'agent-onboard architecture --work-items-check');
  assert.ok(output.validated.prerequisite_m2_seed);
  assert.ok(output.validated.work_items_domain_selected);
  assert.ok(output.validated.planned_module_absent_or_created_by_followup);
  assert.ok(output.validated.current_work_item_closed_or_installed_context_allowed);
  assert.ok(output.validated.next_work_item_seeded_or_installed_context_allowed);
  assert.strictEqual(output.planned_domain.id, 'work_items');
  assert.strictEqual(output.planned_domain.planned_module, 'src/domains/work-items.js');
  assert.strictEqual(output.work_items.current.status, 'closed');
  assert.strictEqual(output.work_items.next.status, 'closed');
  assert.deepStrictEqual(output.errors, []);
}


{
  const result = run(['architecture', '--work-items-first-slice-check']);
  const output = readJsonOutput(result);
  assert.strictEqual(output.schema, 'agent-onboard-public-source-module-work-items-first-slice-check-result-001');
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.version, EXPECTED_VERSION);
  assert.strictEqual(output.release_line, EXPECTED_RELEASE_LINE);
  assert.strictEqual(output.command, 'agent-onboard architecture --work-items-first-slice-check');
  assert.ok(output.validated.extracted_domain_is_work_items);
  assert.ok(output.validated.claim_and_close_commands_excluded);
  assert.ok(output.validated.package_allowlist_unchanged);
  assert.deepStrictEqual(output.errors, []);
}

{
  const result = run(['architecture', '--work-items-bundle-parity-check']);
  const output = readJsonOutput(result);
  assert.strictEqual(output.schema, 'agent-onboard-public-source-module-work-items-bundle-parity-check-result-001');
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.version, EXPECTED_VERSION);
  assert.strictEqual(output.release_line, EXPECTED_RELEASE_LINE);
  assert.strictEqual(output.command, 'agent-onboard architecture --work-items-bundle-parity-check');
  assert.ok(output.validated.first_slice);
  assert.ok(output.validated.bundle_parity_status);
  assert.ok(output.validated.source_slice_domain_matches_bundled_work_items);
  assert.ok(output.validated.source_slice_commands_match_bundled_work_items);
  assert.ok(output.validated.source_slice_exclusions_match_bundled_work_items);
  assert.ok(output.validated.source_slice_write_boundary_matches_bundled_work_items);
  assert.ok(output.validated.claim_and_close_commands_excluded);
  assert.ok(output.validated.package_allowlist_unchanged);
  assert.strictEqual(output.bundled_work_items_view.domain, 'work_items');
  assert.deepStrictEqual(output.errors, []);
}


{
  const result = run(['architecture', '--work-items-runtime-bridge-check']);
  const output = readJsonOutput(result);
  assert.strictEqual(output.schema, 'agent-onboard-public-source-module-work-items-runtime-bridge-check-result-001');
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.version, EXPECTED_VERSION);
  assert.strictEqual(output.release_line, EXPECTED_RELEASE_LINE);
  assert.strictEqual(output.command, 'agent-onboard architecture --work-items-runtime-bridge-check');
  assert.ok(output.validated.work_items_bundle_parity);
  assert.ok(output.validated.installed_context_fallback_allowed);
  assert.ok(output.validated.claim_and_close_commands_excluded);
  assert.ok(output.validated.package_allowlist_unchanged);
  assert.deepStrictEqual(output.errors, []);
}

{
  const result = run(['architecture', '--work-items-installed-fallback-check']);
  const output = readJsonOutput(result);
  assert.strictEqual(output.schema, 'agent-onboard-public-source-module-work-items-installed-fallback-smoke-check-result-001');
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.version, EXPECTED_VERSION);
  assert.strictEqual(output.release_line, EXPECTED_RELEASE_LINE);
  assert.strictEqual(output.command, 'agent-onboard architecture --work-items-installed-fallback-check');
  assert.ok(output.validated.work_items_runtime_bridge_check);
  assert.ok(output.validated.source_module_out_of_pack);
  assert.ok(output.validated.installed_context_uses_bundled_fallback);
  assert.ok(output.validated.claim_and_close_commands_excluded);
  assert.ok(output.validated.package_allowlist_unchanged);
  assert.deepStrictEqual(output.errors, []);
}


{
  const result = run(['architecture', '--claims-check']);
  const output = readJsonOutput(result);
  assert.strictEqual(output.schema, 'agent-onboard-public-claims-domain-source-extraction-plan-check-result-001');
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.version, EXPECTED_VERSION);
  assert.strictEqual(output.release_line, EXPECTED_RELEASE_LINE);
  assert.strictEqual(output.command, 'agent-onboard architecture --claims-check');
  assert.ok(output.validated.prerequisite_work_items_installed_fallback);
  assert.ok(output.validated.claims_domain_selected);
  assert.ok(output.validated.planned_module_absent_or_created_by_followup);
  assert.ok(output.validated.package_allowlist_unchanged);
  assert.strictEqual(output.planned_domain.id, 'claims');
  assert.strictEqual(output.planned_domain.planned_module, 'src/domains/claims.js');
  assert.deepStrictEqual(output.errors, []);
}


{
  const result = run(['architecture', '--claims-first-slice-check']);
  const output = readJsonOutput(result);
  assert.strictEqual(output.schema, 'agent-onboard-public-source-module-claims-first-slice-check-result-001');
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.version, EXPECTED_VERSION);
  assert.strictEqual(output.release_line, EXPECTED_RELEASE_LINE);
  assert.strictEqual(output.command, 'agent-onboard architecture --claims-first-slice-check');
  assert.ok(output.validated.claims_plan);
  assert.ok(output.validated.extracted_domain_is_claims);
  assert.ok(output.validated.shared_work_items_ledger_preserved);
  assert.ok(output.validated.non_claim_work_items_commands_excluded);
  assert.ok(output.validated.package_allowlist_unchanged);
  assert.strictEqual(output.source_module.path, 'src/domains/claims.js');
  assert.strictEqual(output.source_module.status, 'present_validated');
  assert.deepStrictEqual(output.errors, []);
}


{
  const result = run(['architecture', '--claims-bundle-parity-check']);
  const output = readJsonOutput(result);
  assert.strictEqual(output.schema, 'agent-onboard-public-source-module-claims-bundle-parity-check-result-001');
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.version, EXPECTED_VERSION);
  assert.strictEqual(output.release_line, EXPECTED_RELEASE_LINE);
  assert.strictEqual(output.command, 'agent-onboard architecture --claims-bundle-parity-check');
  assert.ok(output.validated.first_slice);
  assert.ok(output.validated.source_slice_domain_matches_bundled_claims);
  assert.ok(output.validated.source_slice_commands_match_bundled_claims);
  assert.ok(output.validated.shared_work_items_ledger_preserved);
  assert.ok(output.validated.claim_contract_matches_bundled_claims);
  assert.ok(output.validated.close_contract_matches_bundled_claims);
  assert.ok(output.validated.non_claim_work_items_commands_excluded);
  assert.ok(output.validated.package_allowlist_unchanged);
  assert.deepStrictEqual(output.errors, []);
}


{
  const result = run(['architecture', '--claims-runtime-bridge-check']);
  const output = readJsonOutput(result);
  assert.strictEqual(output.schema, 'agent-onboard-public-source-module-claims-runtime-bridge-check-result-001');
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.version, EXPECTED_VERSION);
  assert.strictEqual(output.release_line, EXPECTED_RELEASE_LINE);
  assert.strictEqual(output.command, 'agent-onboard architecture --claims-runtime-bridge-check');
  assert.ok(output.validated.claims_bundle_parity);
  assert.ok(output.validated.source_module_loaded_when_present);
  assert.ok(output.validated.installed_context_fallback_allowed);
  assert.ok(output.validated.shared_work_items_ledger_preserved);
  assert.ok(output.validated.non_claim_work_items_commands_excluded);
  assert.ok(output.validated.package_allowlist_unchanged);
  assert.strictEqual(output.source_claims_runtime_bridge_file.path, '.agent-onboard/source-module-extraction-claims-runtime-bridge.json');
  assert.strictEqual(output.source_claims_runtime_bridge_file.status, 'present_validated');
  assert.deepStrictEqual(output.errors, []);
}

{
  const result = run(['architecture', '--claims-installed-fallback-check']);
  const output = readJsonOutput(result);
  assert.strictEqual(output.schema, 'agent-onboard-public-source-module-claims-installed-fallback-smoke-check-result-001');
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.version, EXPECTED_VERSION);
  assert.strictEqual(output.release_line, EXPECTED_RELEASE_LINE);
  assert.strictEqual(output.command, 'agent-onboard architecture --claims-installed-fallback-check');
  assert.ok(output.validated.claims_runtime_bridge_check);
  assert.ok(output.validated.source_module_out_of_pack);
  assert.ok(output.validated.installed_context_uses_bundled_fallback);
  assert.ok(output.validated.shared_work_items_ledger_preserved);
  assert.ok(output.validated.non_claim_work_items_commands_excluded);
  assert.ok(output.validated.package_allowlist_unchanged);
  assert.strictEqual(output.source_claims_installed_fallback_file.path, '.agent-onboard/source-module-extraction-claims-installed-fallback-smoke.json');
  assert.strictEqual(output.source_claims_installed_fallback_file.status, 'present_validated');
  assert.deepStrictEqual(output.errors, []);
}


{
  const result = run(['architecture', '--source-domain-closure-check']);
  const output = readJsonOutput(result);
  assert.strictEqual(output.schema, 'agent-onboard-public-source-domain-extraction-stabilization-closure-review-check-result-001');
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.version, EXPECTED_VERSION);
  assert.strictEqual(output.release_line, EXPECTED_RELEASE_LINE);
  assert.strictEqual(output.command, 'agent-onboard architecture --source-domain-closure-check');
  assert.ok(output.validated.work_items_domain_closed);
  assert.ok(output.validated.claims_domain_closed);
  assert.ok(output.validated.m2_milestone_closed_or_installed_context_allowed);
  assert.ok(output.validated.m2_work_items_all_closed_or_installed_context_allowed);
  assert.ok(output.validated.m3_milestone_seeded_open_or_installed_context_allowed);
  assert.ok(output.validated.m3_seed_work_item_open_or_installed_context_allowed);
  assert.ok(output.validated.closure_review_file_present_or_installed_context_allowed);
  assert.ok(output.validated.package_allowlist_unchanged);
  assert.ok(output.validated.source_modules_remain_out_of_pack);
  assert.ok(output.validated.closure_review_commands_no_write);
  assert.strictEqual(output.source_closure_review_file.path, '.agent-onboard/source-domain-extraction-stabilization-closure-review.json');
  assert.strictEqual(output.source_closure_review_file.status, 'present_validated');
  assert.strictEqual(output.milestone_transition.closed_milestone.status, 'closed');
  assert.strictEqual(output.milestone_transition.opened_milestone.status, 'open');
  assert.strictEqual(output.milestone_transition.seed_work_item.status, 'closed');
  assert.deepStrictEqual(output.errors, []);
}


{
  const result = run(['architecture', '--cli-runtime-check']);
  const output = readJsonOutput(result);
  assert.strictEqual(output.schema, 'agent-onboard-public-cli-runtime-de-monolith-planning-check-result-001');
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.version, EXPECTED_VERSION);
  assert.strictEqual(output.release_line, EXPECTED_RELEASE_LINE);
  assert.strictEqual(output.command, 'agent-onboard architecture --cli-runtime-check');
  assert.ok(output.validated.monolith_debt_declared);
  assert.ok(output.validated.cli_line_count_floor_observed);
  assert.ok(output.validated.controlled_source_module_inclusion_selected);
  assert.ok(output.validated.compact_pack_allowlist_unchanged_for_this_gate);
  assert.ok(output.validated.thin_entrypoint_budget_declared);
  assert.ok(output.validated.monolith_growth_blocked);
  assert.ok(output.validated.planning_file_present_or_installed_context_allowed);
  assert.ok(output.validated.work_item_closed_or_installed_context_allowed);
  assert.ok(output.validated.next_router_gate_open_or_installed_context_allowed);
  assert.strictEqual(output.source_cli_runtime_plan_file.path, '.agent-onboard/cli-runtime-de-monolith-planning.json');
  assert.strictEqual(output.source_cli_runtime_plan_file.status, 'present_validated');
  assert.strictEqual(output.selected_package_strategy.id, 'controlled_source_module_inclusion');
  assert.strictEqual(output.cli_line_budget.target_entrypoint_max_lines, 300);
  assert.deepStrictEqual(output.errors, []);
}


{
  const result = run(['architecture', '--thin-router-check']);
  const output = readJsonOutput(result);
  assert.strictEqual(output.schema, 'agent-onboard-public-thin-cli-router-seed-check-result-001');
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.version, EXPECTED_VERSION);
  assert.strictEqual(output.release_line, EXPECTED_RELEASE_LINE);
  assert.strictEqual(output.command, 'agent-onboard architecture --thin-router-check');
  assert.ok(output.validated.router_seed_status_admitted);
  assert.ok(output.validated.router_module_present_or_installed_context_allowed);
  assert.ok(output.validated.router_module_requireable_when_present);
  assert.ok(output.validated.router_module_under_line_budget);
  assert.ok(output.validated.router_exports_contract);
  assert.ok(output.validated.runtime_cutover_not_applied);
  assert.ok(output.validated.packaged_runtime_dependency_graph_unchanged);
  assert.ok(output.validated.package_allowlist_unchanged);
  assert.ok(output.validated.router_module_out_of_pack_for_this_gate);
  assert.ok(output.validated.seed_file_present_or_installed_context_allowed);
  assert.ok(output.validated.work_item_closed_or_installed_context_allowed);
  assert.ok(output.validated.next_port_gate_open_or_installed_context_allowed);
  assert.ok(output.validated.thin_router_commands_no_write);
  assert.strictEqual(output.router_module.path, 'cli/agent_onboard/command-router.js');
  assert.strictEqual(output.router_module.status, 'present_validated');
  assert.strictEqual(output.source_thin_router_seed_file.path, '.agent-onboard/thin-cli-router-seed.json');
  assert.strictEqual(output.source_thin_router_seed_file.status, 'present_validated');
  assert.deepStrictEqual(output.errors, []);
}


{
  const result = run(['architecture', '--compatibility-port-check']);
  const output = readJsonOutput(result);
  assert.strictEqual(output.schema, 'agent-onboard-public-compatibility-command-port-seed-check-result-001');
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.version, EXPECTED_VERSION);
  assert.strictEqual(output.release_line, EXPECTED_RELEASE_LINE);
  assert.strictEqual(output.command, 'agent-onboard architecture --compatibility-port-check');
  assert.ok(output.validated.compatibility_port_seed_status_admitted);
  assert.ok(output.validated.adapter_module_present_or_installed_context_allowed);
  assert.ok(output.validated.port_module_present_or_installed_context_allowed);
  assert.ok(output.validated.adapter_module_requireable_when_present);
  assert.ok(output.validated.port_module_requireable_when_present);
  assert.ok(output.validated.port_modules_under_line_budget);
  assert.ok(output.validated.adapter_exports_contract);
  assert.ok(output.validated.port_exports_contract);
  assert.ok(output.validated.command_group_contract);
  assert.ok(output.validated.runtime_cutover_not_applied);
  assert.ok(output.validated.packaged_runtime_dependency_graph_unchanged);
  assert.ok(output.validated.package_allowlist_unchanged);
  assert.ok(output.validated.port_modules_out_of_pack_for_this_gate);
  assert.ok(output.validated.seed_file_present_or_installed_context_allowed);
  assert.ok(output.validated.work_item_closed_or_installed_context_allowed);
  assert.ok(output.validated.next_adapter_gate_open_or_installed_context_allowed);
  assert.ok(output.validated.compatibility_port_commands_no_write);
  assert.strictEqual(output.adapter_module.path, 'cli/agent_onboard/adapters/compatibility-command-port.js');
  assert.strictEqual(output.adapter_module.status, 'present_validated');
  assert.strictEqual(output.port_module.path, 'cli/agent_onboard/ports/compatibility-command-port.js');
  assert.strictEqual(output.port_module.status, 'present_validated');
  assert.strictEqual(output.source_compatibility_port_seed_file.path, '.agent-onboard/compatibility-command-port-seed.json');
  assert.strictEqual(output.source_compatibility_port_seed_file.status, 'present_validated');
  assert.deepStrictEqual(output.errors, []);
}


{
  const result = run(['architecture', '--core-adapter-check']);
  const output = readJsonOutput(result);
  assert.strictEqual(output.schema, 'agent-onboard-public-core-command-adapter-extraction-check-result-001');
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.version, EXPECTED_VERSION);
  assert.strictEqual(output.release_line, EXPECTED_RELEASE_LINE);
  assert.strictEqual(output.command, 'agent-onboard architecture --core-adapter-check');
  assert.ok(output.validated.core_adapter_extraction_status_admitted);
  assert.ok(output.validated.adapter_module_present_or_installed_context_allowed);
  assert.ok(output.validated.adapter_module_requireable_when_present);
  assert.ok(output.validated.adapter_module_under_line_budget);
  assert.ok(output.validated.adapter_exports_contract);
  assert.ok(output.validated.owned_core_commands_contract);
  assert.ok(output.validated.non_core_commands_excluded);
  assert.ok(output.validated.runtime_cutover_not_applied);
  assert.ok(output.validated.packaged_runtime_dependency_graph_unchanged);
  assert.ok(output.validated.package_allowlist_unchanged);
  assert.ok(output.validated.core_adapter_module_out_of_pack_for_this_gate);
  assert.ok(output.validated.extraction_file_present_or_installed_context_allowed);
  assert.ok(output.validated.work_item_closed_or_installed_context_allowed);
  assert.ok(output.validated.next_package_adapter_gate_open_or_installed_context_allowed);
  assert.ok(output.validated.core_adapter_commands_no_write);
  assert.strictEqual(output.adapter_module.path, 'cli/agent_onboard/adapters/commands/core.js');
  assert.strictEqual(output.adapter_module.status, 'present_validated');
  assert.strictEqual(output.source_core_adapter_extraction_file.path, '.agent-onboard/core-command-adapter-extraction.json');
  assert.strictEqual(output.source_core_adapter_extraction_file.status, 'present_validated');
  assert.deepStrictEqual(output.errors, []);
}


{
  const result = run(['architecture', '--package-adapter-check']);
  const output = readJsonOutput(result);
  assert.strictEqual(output.schema, 'agent-onboard-public-package-command-adapter-extraction-check-result-001');
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.version, EXPECTED_VERSION);
  assert.strictEqual(output.release_line, EXPECTED_RELEASE_LINE);
  assert.strictEqual(output.command, 'agent-onboard architecture --package-adapter-check');
  assert.ok(output.validated.package_adapter_extraction_status_admitted);
  assert.ok(output.validated.adapter_module_present_or_installed_context_allowed);
  assert.ok(output.validated.adapter_module_requireable_when_present);
  assert.ok(output.validated.adapter_module_under_line_budget);
  assert.ok(output.validated.adapter_exports_contract);
  assert.ok(output.validated.owned_package_commands_contract);
  assert.ok(output.validated.non_package_commands_excluded);
  assert.ok(output.validated.runtime_cutover_not_applied);
  assert.ok(output.validated.packaged_runtime_dependency_graph_unchanged);
  assert.ok(output.validated.package_allowlist_unchanged);
  assert.ok(output.validated.package_adapter_module_out_of_pack_for_this_gate);
  assert.ok(output.validated.extraction_file_present_or_installed_context_allowed);
  assert.ok(output.validated.work_item_closed_or_installed_context_allowed);
  assert.ok(output.validated.next_architecture_adapter_gate_open_or_installed_context_allowed);
  assert.ok(output.validated.package_adapter_commands_no_write);
  assert.strictEqual(output.adapter_module.path, 'cli/agent_onboard/adapters/commands/release-package.js');
  assert.strictEqual(output.adapter_module.status, 'present_validated');
  assert.strictEqual(output.source_package_adapter_extraction_file.path, '.agent-onboard/package-command-adapter-extraction.json');
  assert.strictEqual(output.source_package_adapter_extraction_file.status, 'present_validated');
  assert.deepStrictEqual(output.errors, []);
}

{
  const result = run(['architecture', '--architecture-adapter-check']);
  const output = readJsonOutput(result);
  assert.strictEqual(output.schema, 'agent-onboard-public-architecture-command-adapter-extraction-check-result-001');
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.version, EXPECTED_VERSION);
  assert.strictEqual(output.release_line, EXPECTED_RELEASE_LINE);
  assert.strictEqual(output.command, 'agent-onboard architecture --architecture-adapter-check');
  assert.ok(output.validated.architecture_adapter_extraction_status_admitted);
  assert.ok(output.validated.adapter_module_present_or_installed_context_allowed);
  assert.ok(output.validated.adapter_module_requireable_when_present);
  assert.ok(output.validated.adapter_module_under_line_budget);
  assert.ok(output.validated.adapter_exports_contract);
  assert.ok(output.validated.owned_architecture_commands_contract);
  assert.ok(output.validated.non_architecture_commands_excluded);
  assert.ok(output.validated.runtime_cutover_not_applied);
  assert.ok(output.validated.packaged_runtime_dependency_graph_unchanged);
  assert.ok(output.validated.package_allowlist_unchanged);
  assert.ok(output.validated.architecture_adapter_module_out_of_pack_for_this_gate);
  assert.ok(output.validated.extraction_file_present_or_installed_context_allowed);
  assert.ok(output.validated.work_item_closed_or_installed_context_allowed);
  assert.ok(output.validated.next_authority_adapter_gate_open_or_installed_context_allowed);
  assert.ok(output.validated.architecture_adapter_commands_no_write);
  assert.strictEqual(output.adapter_module.path, 'cli/agent_onboard/adapters/commands/architecture.js');
  assert.strictEqual(output.adapter_module.status, 'present_validated');
  assert.strictEqual(output.source_architecture_adapter_extraction_file.path, '.agent-onboard/architecture-command-adapter-extraction.json');
  assert.strictEqual(output.source_architecture_adapter_extraction_file.status, 'present_validated');
  assert.deepStrictEqual(output.errors, []);
}

{
  const result = run(['architecture', '--authority-adapter-check']);
  const output = readJsonOutput(result);
  assert.strictEqual(output.schema, 'agent-onboard-public-authority-command-adapter-extraction-check-result-001');
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.version, EXPECTED_VERSION);
  assert.strictEqual(output.release_line, EXPECTED_RELEASE_LINE);
  assert.strictEqual(output.command, 'agent-onboard architecture --authority-adapter-check');
  assert.ok(output.validated.authority_adapter_extraction_status_admitted);
  assert.ok(output.validated.adapter_module_present_or_installed_context_allowed);
  assert.ok(output.validated.adapter_module_requireable_when_present);
  assert.ok(output.validated.adapter_module_under_line_budget);
  assert.ok(output.validated.adapter_exports_contract);
  assert.ok(output.validated.owned_authority_commands_contract);
  assert.ok(output.validated.non_authority_commands_excluded);
  assert.ok(output.validated.runtime_cutover_not_applied);
  assert.ok(output.validated.packaged_runtime_dependency_graph_unchanged);
  assert.ok(output.validated.package_allowlist_unchanged);
  assert.ok(output.validated.authority_adapter_module_out_of_pack_for_this_gate);
  assert.ok(output.validated.extraction_file_present_or_installed_context_allowed);
  assert.ok(output.validated.work_item_closed_or_installed_context_allowed);
  assert.ok(output.validated.next_work_items_adapter_gate_open_or_installed_context_allowed);
  assert.ok(output.validated.authority_adapter_commands_no_write);
  assert.strictEqual(output.adapter_module.path, 'cli/agent_onboard/adapters/commands/authority.js');
  assert.strictEqual(output.adapter_module.status, 'present_validated');
  assert.strictEqual(output.source_authority_adapter_extraction_file.path, '.agent-onboard/authority-command-adapter-extraction.json');
  assert.strictEqual(output.source_authority_adapter_extraction_file.status, 'present_validated');
  assert.deepStrictEqual(output.errors, []);
}

{
  const result = run(['architecture', '--module-inclusion-check']);
  const output = readJsonOutput(result);
  assert.strictEqual(output.schema, 'agent-onboard-public-modular-runtime-package-inclusion-plan-check-result-001');
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.version, EXPECTED_VERSION);
  assert.strictEqual(output.release_line, EXPECTED_RELEASE_LINE);
  assert.strictEqual(output.command, 'agent-onboard architecture --module-inclusion-check');
  assert.ok(output.validated.planning_status_admitted);
  assert.ok(output.validated.compact_pack_allowlist_preserved_for_planning_gate_or_superseded_by_admitted_inclusion);
  assert.ok(output.validated.future_package_allowlist_change_planned);
  assert.ok(output.validated.runtime_cutover_not_applied);
  assert.ok(output.validated.public_cli_outputs_unchanged);
  assert.ok(output.validated.packaged_runtime_dependency_graph_unchanged);
  assert.ok(output.validated.planning_commands_no_write);
  assert.ok(output.validated.internal_reference_shape_declared);
  assert.ok(output.validated.first_inclusion_slice_declared);
  assert.ok(output.validated.planning_file_present_or_installed_context_allowed);
  assert.ok(output.validated.work_item_closed_or_installed_context_allowed);
  assert.ok(output.validated.next_packaged_router_inclusion_gate_open_or_installed_context_allowed);
  assert.strictEqual(output.source_modular_runtime_package_inclusion_plan_file.path, '.agent-onboard/modular-runtime-package-inclusion-plan.json');
  assert.strictEqual(output.source_modular_runtime_package_inclusion_plan_file.status, 'present_validated');
  assert.deepStrictEqual(output.errors, []);
}

{
  const result = run(['architecture', '--packaged-router-port-check']);
  const output = readJsonOutput(result);
  assert.strictEqual(output.schema, 'agent-onboard-public-packaged-router-port-inclusion-check-result-001');
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.version, EXPECTED_VERSION);
  assert.strictEqual(output.release_line, EXPECTED_RELEASE_LINE);
  assert.strictEqual(output.command, 'agent-onboard architecture --packaged-router-port-check');
  assert.ok(output.validated.inclusion_status_admitted);
  assert.ok(output.validated.projected_pack_files_match_inclusion_contract);
  assert.ok(output.validated.package_allowlist_expanded);
  assert.ok(output.validated.runtime_cutover_not_applied);
  assert.ok(output.validated.public_cli_outputs_unchanged);
  assert.ok(output.validated.packaged_runtime_dependency_graph_unchanged);
  assert.ok(output.validated.packaged_router_port_commands_no_write);
  assert.ok(output.validated.module_files_present);
  assert.ok(output.validated.module_files_requireable);
  assert.ok(output.validated.module_exports_contract);
  assert.ok(output.validated.module_files_in_projected_pack);
  assert.ok(output.validated.inclusion_file_present_or_installed_context_allowed);
  assert.ok(output.validated.work_item_closed_or_installed_context_allowed);
  assert.ok(output.validated.next_thin_entrypoint_cutover_gate_open_or_installed_context_allowed);
  assert.deepStrictEqual(output.expected_pack_files, EXPECTED_PACK_FILES);
  assert.deepStrictEqual(output.projected_pack_files, EXPECTED_PACK_FILES);
  assert.strictEqual(output.source_packaged_router_port_inclusion_file.path, '.agent-onboard/packaged-router-port-inclusion.json');
  assert.strictEqual(output.source_packaged_router_port_inclusion_file.status, 'present_validated');
  assert.deepStrictEqual(output.errors, []);
}

{
  const result = run(['architecture', '--thin-entrypoint-rehearsal-check']);
  const output = readJsonOutput(result);
  assert.strictEqual(output.schema, 'agent-onboard-public-thin-entrypoint-router-cutover-rehearsal-check-result-001');
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.version, EXPECTED_VERSION);
  assert.strictEqual(output.release_line, EXPECTED_RELEASE_LINE);
  assert.strictEqual(output.command, 'agent-onboard architecture --thin-entrypoint-rehearsal-check');
  assert.ok(output.validated.rehearsal_status_admitted);
  assert.ok(output.validated.projected_pack_files_unchanged);
  assert.ok(output.validated.package_allowlist_unchanged);
  assert.ok(output.validated.runtime_cutover_not_applied);
  assert.ok(output.validated.public_cli_outputs_unchanged);
  assert.ok(output.validated.packaged_runtime_dependency_graph_unchanged);
  assert.ok(output.validated.packaged_router_and_port_present);
  assert.ok(output.validated.packaged_router_and_port_requireable);
  assert.ok(output.validated.module_files_in_projected_pack);
  assert.ok(output.validated.rehearsal_vectors_runnable);
  assert.ok(output.validated.rehearsal_vectors_match_expected_status);
  assert.ok(output.validated.rehearsal_commands_no_write);
  assert.ok(output.validated.rehearsal_file_present_or_installed_context_allowed);
  assert.ok(output.validated.work_item_closed_or_installed_context_allowed);
  assert.ok(output.validated.next_cutover_gate_open_or_installed_context_allowed);
  assert.deepStrictEqual(output.expected_pack_files, EXPECTED_PACK_FILES);
  assert.deepStrictEqual(output.projected_pack_files, EXPECTED_PACK_FILES);
  assert.strictEqual(output.source_thin_entrypoint_rehearsal_file.path, '.agent-onboard/thin-entrypoint-router-cutover-rehearsal.json');
  assert.strictEqual(output.source_thin_entrypoint_rehearsal_file.status, 'present_validated');
  assert.deepStrictEqual(output.rehearsal_vector_reports.map((report) => report.actual_status), ['ok', 'ok', 'unhandled_source_only_seed']);
  assert.deepStrictEqual(output.errors, []);
}

{
  const result = run(['architecture', '--thin-entrypoint-cutover-check']);
  const output = readJsonOutput(result);
  assert.strictEqual(output.schema, 'agent-onboard-public-thin-entrypoint-router-cutover-application-check-result-001');
  assert.strictEqual(output.status, 'ok');
  assert.strictEqual(output.version, EXPECTED_VERSION);
  assert.strictEqual(output.release_line, EXPECTED_RELEASE_LINE);
  assert.strictEqual(output.command, 'agent-onboard architecture --thin-entrypoint-cutover-check');
  assert.ok(output.validated.cutover_status_applied);
  assert.ok(output.validated.runtime_cutover_applied);
  assert.ok(output.validated.entrypoint_imports_packaged_router);
  assert.ok(output.validated.entrypoint_imports_packaged_compatibility_port);
  assert.ok(output.validated.entrypoint_main_delegates_to_router);
  assert.ok(output.validated.projected_pack_files_unchanged);
  assert.ok(output.validated.module_files_in_projected_pack);
  assert.ok(output.validated.main_smoke_status_ok);
  assert.ok(output.validated.main_smoke_version_ok);
  assert.ok(output.validated.cutover_file_present_or_installed_context_allowed);
  assert.ok(output.validated.work_item_closed_or_installed_context_allowed);
  assert.ok(output.validated.next_gate_open_or_installed_context_allowed);
  assert.deepStrictEqual(output.expected_pack_files, EXPECTED_PACK_FILES);
  assert.deepStrictEqual(output.projected_pack_files, EXPECTED_PACK_FILES);
  assert.strictEqual(output.source_thin_entrypoint_cutover_file.path, '.agent-onboard/thin-entrypoint-router-cutover-application.json');
  assert.strictEqual(output.source_thin_entrypoint_cutover_file.status, 'present_validated');
  assert.deepStrictEqual(output.errors, []);
}

console.log('agent-onboard tests passed');
process.exit(0);
