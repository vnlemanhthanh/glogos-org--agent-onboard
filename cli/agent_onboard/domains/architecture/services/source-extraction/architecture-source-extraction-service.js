'use strict';

const fs = require('fs');
const path = require('path');

function createPublicArchitectureSourceExtractionService(deps) {
  const {
    version: VERSION,
    publicArchitectureMapContract: PUBLIC_ARCHITECTURE_MAP,
    publicDomainServiceFacades: PUBLIC_DOMAIN_SERVICE_FACADES,
    publicSourceDomainExtractionRehearsal: PUBLIC_SOURCE_DOMAIN_EXTRACTION_REHEARSAL,
    publicSourceExtractionGoldenOutputFreeze: PUBLIC_SOURCE_EXTRACTION_GOLDEN_OUTPUT_FREEZE,
    publicVersionReferencePolicy: PUBLIC_VERSION_REFERENCE_POLICY,
    publicSourceModuleExtractionAdapterBoundary: PUBLIC_SOURCE_MODULE_EXTRACTION_ADAPTER_BOUNDARY,
    publicSourceModuleExtractionFirstSlice: PUBLIC_SOURCE_MODULE_EXTRACTION_FIRST_SLICE,
    publicSourceModuleExtractionBundleParity: PUBLIC_SOURCE_MODULE_EXTRACTION_BUNDLE_PARITY,
    publicSourceModuleExtractionRuntimeBridge: PUBLIC_SOURCE_MODULE_EXTRACTION_RUNTIME_BRIDGE,
    publicSourceModuleExtractionAuthorityRuntimeBridge: PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_RUNTIME_BRIDGE,
    publicReleaseContract: PUBLIC_RELEASE_CONTRACT,
    packageRoot,
    sourceContext,
    arrayEquals,
    readJson,
    packageJsonProjectedPackFiles,
    publicArchitectureMap,
    publicCommandRouter,
    publicSourceDomainExtractionRehearsalCheck,
    bundledAuthorityDomainForParity,
    publicSourceModuleExtractionAuthorityBundleParityCheck
  } = deps;

  for (const [name, value] of Object.entries({
    VERSION,
    PUBLIC_ARCHITECTURE_MAP,
    PUBLIC_DOMAIN_SERVICE_FACADES,
    PUBLIC_SOURCE_DOMAIN_EXTRACTION_REHEARSAL,
    PUBLIC_SOURCE_EXTRACTION_GOLDEN_OUTPUT_FREEZE,
    PUBLIC_VERSION_REFERENCE_POLICY,
    PUBLIC_SOURCE_MODULE_EXTRACTION_ADAPTER_BOUNDARY,
    PUBLIC_SOURCE_MODULE_EXTRACTION_FIRST_SLICE,
    PUBLIC_SOURCE_MODULE_EXTRACTION_BUNDLE_PARITY,
    PUBLIC_SOURCE_MODULE_EXTRACTION_RUNTIME_BRIDGE,
    PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_RUNTIME_BRIDGE,
    PUBLIC_RELEASE_CONTRACT,
    packageRoot,
    sourceContext,
    arrayEquals,
    readJson,
    packageJsonProjectedPackFiles,
    publicArchitectureMap,
    publicCommandRouter,
    publicSourceDomainExtractionRehearsalCheck,
    bundledAuthorityDomainForParity,
    publicSourceModuleExtractionAuthorityBundleParityCheck
  })) {
    if (value === undefined || value === null) throw new Error(`createPublicArchitectureSourceExtractionService missing dependency: ${name}`);
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

  return Object.freeze({
    publicSourceExtractionGoldenOutputs,
    scanCurrentVersionLiterals,
    publicVersionReferencePolicyCheck,
    publicSourceExtractionGoldenOutputFreezeCheck,
    publicSourceModuleExtractionAdapterBoundary,
    publicSourceModuleExtractionAdapterBoundaryCheck,
    loadCoreFirstSliceModule,
    publicSourceModuleExtractionFirstSlice,
    publicSourceModuleExtractionFirstSliceCheck,
    bundledCoreDomainForParity,
    publicSourceModuleExtractionBundleParity,
    publicSourceModuleExtractionBundleParityCheck,
    resolveCoreDomainRuntimeBridge,
    publicSourceModuleExtractionRuntimeBridge,
    publicSourceModuleExtractionRuntimeBridgeCheck,
    resolveAuthorityDomainRuntimeBridge,
    publicSourceModuleExtractionAuthorityRuntimeBridge,
    publicSourceModuleExtractionAuthorityRuntimeBridgeCheck
  });
}

module.exports = Object.freeze({
  createPublicArchitectureSourceExtractionService
});
