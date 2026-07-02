'use strict';

const fs = require('fs');
const path = require('path');
const { createPublicArchitectureSourceExtractionService } = require('../source-extraction/architecture-source-extraction-service');

function createPublicArchitectureRuntimeService(deps) {
  const {
    version: VERSION,
    publicArchitectureMapContract: PUBLIC_ARCHITECTURE_MAP,
    publicCommandRouter: PUBLIC_COMMAND_ROUTER,
    publicDomainServiceFacades: PUBLIC_DOMAIN_SERVICE_FACADES,
    publicAuthorityFirstReadIndex: PUBLIC_AUTHORITY_FIRST_READ_INDEX,
    publicTargetRuntimeNamespace: PUBLIC_TARGET_RUNTIME_NAMESPACE,
    publicSourceDomainModulePartitionPlan: PUBLIC_SOURCE_DOMAIN_MODULE_PARTITION_PLAN,
    publicSourceDomainExtractionRehearsal: PUBLIC_SOURCE_DOMAIN_EXTRACTION_REHEARSAL,
    publicSourceExtractionGoldenOutputFreeze: PUBLIC_SOURCE_EXTRACTION_GOLDEN_OUTPUT_FREEZE,
    publicVersionReferencePolicy: PUBLIC_VERSION_REFERENCE_POLICY,
    publicSourceModuleExtractionAdapterBoundary: PUBLIC_SOURCE_MODULE_EXTRACTION_ADAPTER_BOUNDARY,
    publicSourceModuleExtractionFirstSlice: PUBLIC_SOURCE_MODULE_EXTRACTION_FIRST_SLICE,
    publicSourceModuleExtractionBundleParity: PUBLIC_SOURCE_MODULE_EXTRACTION_BUNDLE_PARITY,
    publicSourceModuleExtractionRuntimeBridge: PUBLIC_SOURCE_MODULE_EXTRACTION_RUNTIME_BRIDGE,
    publicSourceModuleExtractionAuthorityRuntimeBridge: PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_RUNTIME_BRIDGE,
    publicArchitectureM1ClosureM2Seed: PUBLIC_ARCHITECTURE_M1_CLOSURE_M2_SEED,
    publicReleaseContract: PUBLIC_RELEASE_CONTRACT,
    targetOnboardingSurfacePlan: TARGET_ONBOARDING_SURFACE_PLAN,
    packageRoot,
    sourceContext,
    arrayEquals,
    readJson,
    packageJsonProjectedPackFiles,
    firstReadOrder,
    llmsTxtTemplate,
    authorityPathTemplate,
    targetRuntimeNamespaceTemplate,
    targetOnboardingWriteSet,
    publicArchitectureMap,
    bundledAuthorityDomainForParity,
    publicSourceModuleExtractionAuthorityBundleParityCheck
  } = deps;

  for (const [name, value] of Object.entries({
    VERSION,
    PUBLIC_ARCHITECTURE_MAP,
    PUBLIC_COMMAND_ROUTER,
    PUBLIC_DOMAIN_SERVICE_FACADES,
    PUBLIC_AUTHORITY_FIRST_READ_INDEX,
    PUBLIC_TARGET_RUNTIME_NAMESPACE,
    PUBLIC_SOURCE_DOMAIN_MODULE_PARTITION_PLAN,
    PUBLIC_SOURCE_DOMAIN_EXTRACTION_REHEARSAL,
    PUBLIC_SOURCE_EXTRACTION_GOLDEN_OUTPUT_FREEZE,
    PUBLIC_VERSION_REFERENCE_POLICY,
    PUBLIC_SOURCE_MODULE_EXTRACTION_ADAPTER_BOUNDARY,
    PUBLIC_SOURCE_MODULE_EXTRACTION_FIRST_SLICE,
    PUBLIC_SOURCE_MODULE_EXTRACTION_BUNDLE_PARITY,
    PUBLIC_SOURCE_MODULE_EXTRACTION_RUNTIME_BRIDGE,
    PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_RUNTIME_BRIDGE,
    PUBLIC_ARCHITECTURE_M1_CLOSURE_M2_SEED,
    PUBLIC_RELEASE_CONTRACT,
    TARGET_ONBOARDING_SURFACE_PLAN,
    packageRoot,
    sourceContext,
    arrayEquals,
    readJson,
    packageJsonProjectedPackFiles,
    firstReadOrder,
    llmsTxtTemplate,
    authorityPathTemplate,
    targetRuntimeNamespaceTemplate,
    targetOnboardingWriteSet,
    publicArchitectureMap,
    bundledAuthorityDomainForParity,
    publicSourceModuleExtractionAuthorityBundleParityCheck
  })) {
    if (value === undefined || value === null) throw new Error(`createPublicArchitectureRuntimeService missing dependency: ${name}`);
  }
function publicCommandRouter(root = packageRoot()) {
  const pkg = readJson(path.join(root, 'package.json'));
  const commands = PUBLIC_COMMAND_ROUTER.routes.map((route) => route.command);
  return {
    schema: 'agent-onboard-public-command-router-result-001',
    status: 'ok',
    package_name: PUBLIC_COMMAND_ROUTER.package_name,
    version: VERSION,
    release_line: PUBLIC_COMMAND_ROUTER.release_line,
    command: PUBLIC_COMMAND_ROUTER.command,
    check_command: PUBLIC_COMMAND_ROUTER.check_command,
    package_root: root,
    package_context: sourceContext(root).package_context,
    package_json_version: pkg.version,
    router: PUBLIC_COMMAND_ROUTER,
    route_count: commands.length,
    route_commands: commands,
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

function publicCommandRouterCheck(root = packageRoot()) {
  const router = publicCommandRouter(root);
  const expectedCommands = ['help', 'version', 'status', 'init', 'agents', 'guard', 'authority', 'architecture', 'release', 'target-config', 'work-items', 'target', 'target-instance'];
  const expectedDomains = PUBLIC_ARCHITECTURE_MAP.canonical_domains.map((domain) => domain.id);
  const routeCommands = router.route_commands;
  const routeDomains = router.router.routes.map((route) => route.domain);
  const errors = [];
  if (!arrayEquals(routeCommands, expectedCommands)) errors.push(`command router route order must be ${expectedCommands.join(', ')}`);
  if (new Set(routeCommands).size !== routeCommands.length) errors.push('command router route commands must be unique');
  for (const domain of routeDomains) {
    if (!expectedDomains.includes(domain)) errors.push(`command router route domain is not canonical: ${domain}`);
  }
  if (router.router.dispatch_mode !== 'table_driven_top_level_router') errors.push('command router dispatch_mode must be table_driven_top_level_router');
  if (router.router.dispatcher !== 'dispatchCommand') errors.push('command router dispatcher must be dispatchCommand');
  if (router.router.boundary.router_command_writes_files !== false) errors.push('architecture router command must remain no-write');
  if (router.router.boundary.unsupported_commands_fail_closed !== true) errors.push('unsupported commands must fail closed');
  const targetRoute = router.router.routes.find((route) => route.command === 'target');
  if (!targetRoute || !arrayEquals(targetRoute.nested_commands.slice(), ['runtime', 'onboarding', 'bootstrap'])) errors.push('target nested route boundary must declare runtime, onboarding, and bootstrap');
  return {
    schema: 'agent-onboard-public-command-router-check-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: PUBLIC_COMMAND_ROUTER.package_name,
    version: VERSION,
    release_line: PUBLIC_COMMAND_ROUTER.release_line,
    command: PUBLIC_COMMAND_ROUTER.check_command,
    package_root: root,
    validated: {
      route_count: router.route_count === expectedCommands.length,
      route_order: arrayEquals(routeCommands, expectedCommands),
      route_commands_unique: new Set(routeCommands).size === routeCommands.length,
      canonical_route_domains: routeDomains.every((domain) => expectedDomains.includes(domain)),
      route_facades_declared: router.router.routes.every((route) => typeof route.facade === 'string' && route.facade.length > 0),
      table_driven_dispatch: router.router.dispatch_mode === 'table_driven_top_level_router',
      dispatcher_boundary: router.router.dispatcher === 'dispatchCommand',
      router_command_no_write: router.router.boundary.router_command_writes_files === false,
      unsupported_commands_fail_closed: router.router.boundary.unsupported_commands_fail_closed === true,
      nested_target_routes_explicit: !!targetRoute && arrayEquals(targetRoute.nested_commands.slice(), ['runtime', 'onboarding', 'bootstrap'])
    },
    expected_route_commands: expectedCommands,
    route_commands: routeCommands,
    route_domains: routeDomains,
    route_facades: router.router.routes.map((route) => route.facade),
    boundary: router.boundary,
    errors
  };
}

function publicDomainServiceFacades(root = packageRoot()) {
  const pkg = readJson(path.join(root, 'package.json'));
  const facadeIds = PUBLIC_DOMAIN_SERVICE_FACADES.facades.map((facade) => facade.id);
  return {
    schema: 'agent-onboard-public-domain-service-facades-result-001',
    status: 'ok',
    package_name: PUBLIC_DOMAIN_SERVICE_FACADES.package_name,
    version: VERSION,
    release_line: PUBLIC_DOMAIN_SERVICE_FACADES.release_line,
    command: PUBLIC_DOMAIN_SERVICE_FACADES.command,
    check_command: PUBLIC_DOMAIN_SERVICE_FACADES.check_command,
    package_root: root,
    package_context: sourceContext(root).package_context,
    package_json_version: pkg.version,
    facades: PUBLIC_DOMAIN_SERVICE_FACADES,
    facade_ids: facadeIds,
    service_names: PUBLIC_DOMAIN_SERVICE_FACADES.facades.map((facade) => facade.service),
    router_routes: PUBLIC_COMMAND_ROUTER.routes.map((route) => ({
      command: route.command,
      domain: route.domain,
      facade: route.facade,
      handler: route.handler,
      writes_files: route.writes_files
    })),
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

function publicDomainServiceFacadesCheck(root = packageRoot()) {
  const result = publicDomainServiceFacades(root);
  const expectedDomains = PUBLIC_ARCHITECTURE_MAP.canonical_domains.map((domain) => domain.id);
  const facadeIds = result.facade_ids;
  const serviceNames = result.service_names;
  const serviceByDomain = new Map(PUBLIC_DOMAIN_SERVICE_FACADES.facades.map((facade) => [facade.id, facade.service]));
  const errors = [];
  if (!arrayEquals(facadeIds, expectedDomains)) errors.push(`domain service facade order must be ${expectedDomains.join(', ')}`);
  if (new Set(facadeIds).size !== facadeIds.length) errors.push('domain service facade ids must be unique');
  if (new Set(serviceNames).size !== serviceNames.length) errors.push('domain service names must be unique');
  if (result.facades.boundary.facades_command_writes_files !== false) errors.push('architecture facades command must remain no-write');
  for (const route of result.router_routes) {
    if (!route.facade) errors.push(`route ${route.command} must declare a domain service facade`);
    if (!serviceByDomain.has(route.domain)) errors.push(`route ${route.command} domain is not backed by a public facade: ${route.domain}`);
    if (serviceByDomain.has(route.domain) && route.facade !== serviceByDomain.get(route.domain)) errors.push(`route ${route.command} facade must be ${serviceByDomain.get(route.domain)}`);
  }
  return {
    schema: 'agent-onboard-public-domain-service-facades-check-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: PUBLIC_DOMAIN_SERVICE_FACADES.package_name,
    version: VERSION,
    release_line: PUBLIC_DOMAIN_SERVICE_FACADES.release_line,
    command: PUBLIC_DOMAIN_SERVICE_FACADES.check_command,
    package_root: root,
    validated: {
      facade_count: facadeIds.length === expectedDomains.length,
      facade_order: arrayEquals(facadeIds, expectedDomains),
      facade_ids_unique: new Set(facadeIds).size === facadeIds.length,
      service_names_unique: new Set(serviceNames).size === serviceNames.length,
      facades_command_no_write: result.facades.boundary.facades_command_writes_files === false,
      every_route_declares_facade: result.router_routes.every((route) => typeof route.facade === 'string' && route.facade.length > 0),
      route_facades_match_domains: result.router_routes.every((route) => serviceByDomain.has(route.domain) && route.facade === serviceByDomain.get(route.domain))
    },
    expected_domain_ids: expectedDomains,
    facade_ids: facadeIds,
    service_names: serviceNames,
    router_routes: result.router_routes,
    boundary: result.boundary,
    errors
  };
}


function publicSourceDomainModulePartitionPlan(root = packageRoot()) {
  const pkg = readJson(path.join(root, 'package.json'));
  const context = sourceContext(root);
  const planFile = PUBLIC_SOURCE_DOMAIN_MODULE_PARTITION_PLAN.plan_file;
  const planFilePath = path.join(root, planFile);
  return {
    schema: 'agent-onboard-public-source-domain-module-partition-plan-result-001',
    status: 'ok',
    package_name: PUBLIC_SOURCE_DOMAIN_MODULE_PARTITION_PLAN.package_name,
    version: VERSION,
    release_line: PUBLIC_SOURCE_DOMAIN_MODULE_PARTITION_PLAN.release_line,
    command: PUBLIC_SOURCE_DOMAIN_MODULE_PARTITION_PLAN.command,
    check_command: PUBLIC_SOURCE_DOMAIN_MODULE_PARTITION_PLAN.check_command,
    package_root: root,
    package_context: context.package_context,
    package_json_version: pkg.version,
    plan: PUBLIC_SOURCE_DOMAIN_MODULE_PARTITION_PLAN,
    plan_file: planFile,
    plan_file_present: fs.existsSync(planFilePath),
    canonical_domain_ids: PUBLIC_ARCHITECTURE_MAP.canonical_domains.map((domain) => domain.id),
    facade_ids: PUBLIC_DOMAIN_SERVICE_FACADES.facades.map((facade) => facade.id),
    projected_pack_files: packageJsonProjectedPackFiles(pkg),
    boundary: {
      writes_files: false,
      moves_source_files: false,
      creates_source_modules: false,
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

function plainClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function publicSourceDomainModulePartitionPlanCheck(root = packageRoot()) {
  const result = publicSourceDomainModulePartitionPlan(root);
  const expectedDomains = PUBLIC_ARCHITECTURE_MAP.canonical_domains.map((domain) => domain.id);
  const expectedFacades = new Map(PUBLIC_DOMAIN_SERVICE_FACADES.facades.map((facade) => [facade.id, facade.service]));
  const plannedDomains = result.plan.planned_source_modules.map((module) => module.domain);
  const expectedPackFiles = PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort();
  const errors = [];
  if (!arrayEquals(plannedDomains, expectedDomains)) errors.push(`source partition planned modules must follow canonical domain order ${expectedDomains.join(', ')}`);
  if (new Set(plannedDomains).size !== plannedDomains.length) errors.push('source partition planned module domains must be unique');
  for (const module of result.plan.planned_source_modules) {
    if (!expectedDomains.includes(module.domain)) errors.push(`planned source module is not mapped to a canonical domain: ${module.domain}`);
    if (expectedFacades.has(module.domain) && module.facade !== expectedFacades.get(module.domain)) errors.push(`planned source module ${module.domain} must map to facade ${expectedFacades.get(module.domain)}`);
    if (!String(module.planned_module || '').startsWith('src/domains/')) errors.push(`planned source module path must stay under src/domains/: ${module.planned_module}`);
  }
  if (result.plan.current_shape.physical_module_partition_status !== 'planned_not_applied') errors.push('source partition plan must remain planned_not_applied for this gate');
  if (result.plan.invariants.physical_partition_not_applied_by_this_gate !== true) errors.push('source partition plan must not apply the physical partition in this gate');
  if (result.plan.boundary.moves_source_files !== false) errors.push('architecture partition plan must not move source files');
  if (result.plan.boundary.creates_source_modules !== false) errors.push('architecture partition plan must not create source modules');
  if (result.plan.boundary.partition_plan_command_writes_files !== false) errors.push('architecture partition plan command must remain no-write');
  if (result.plan.boundary.partition_check_command_writes_files !== false) errors.push('architecture partition check command must remain no-write');
  if (!arrayEquals(result.projected_pack_files, expectedPackFiles)) errors.push(`projected npm pack files must remain ${expectedPackFiles.join(', ')}`);

  let sourcePlanFileStatus = 'not_present_installed_context_allowed';
  let sourcePlanFileSchema = null;
  if (result.plan_file_present) {
    try {
      const sourcePlan = readJson(path.join(root, result.plan_file));
      sourcePlanFileSchema = sourcePlan.schema || null;
      if (sourcePlan.schema !== PUBLIC_SOURCE_DOMAIN_MODULE_PARTITION_PLAN.schema) errors.push(`${result.plan_file} schema must be ${PUBLIC_SOURCE_DOMAIN_MODULE_PARTITION_PLAN.schema}`);
      if (!sourcePlan.current_shape || sourcePlan.current_shape.physical_module_partition_status !== 'planned_not_applied') errors.push(`${result.plan_file} must declare planned_not_applied physical module partition status`);
      const fileDomains = Array.isArray(sourcePlan.planned_source_modules) ? sourcePlan.planned_source_modules.map((module) => module.domain) : [];
      if (!arrayEquals(fileDomains, expectedDomains)) errors.push(`${result.plan_file} planned_source_modules must follow canonical domain order ${expectedDomains.join(', ')}`);
      sourcePlanFileStatus = 'present_validated';
    } catch (error) {
      sourcePlanFileStatus = 'present_invalid_json';
      errors.push(`${result.plan_file} is not valid JSON: ${error && error.message ? error.message : String(error)}`);
    }
  } else if (result.package_context === 'source_repository') {
    sourcePlanFileStatus = 'missing_source_context';
    errors.push(`${result.plan_file} must be present in source repository context`);
  }

  return {
    schema: 'agent-onboard-public-source-domain-module-partition-plan-check-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: PUBLIC_SOURCE_DOMAIN_MODULE_PARTITION_PLAN.package_name,
    version: VERSION,
    release_line: PUBLIC_SOURCE_DOMAIN_MODULE_PARTITION_PLAN.release_line,
    command: PUBLIC_SOURCE_DOMAIN_MODULE_PARTITION_PLAN.check_command,
    package_root: root,
    validated: {
      planned_module_count: result.plan.planned_source_modules.length === expectedDomains.length,
      planned_module_domain_order: arrayEquals(plannedDomains, expectedDomains),
      planned_module_domains_unique: new Set(plannedDomains).size === plannedDomains.length,
      planned_modules_map_to_facades: result.plan.planned_source_modules.every((module) => expectedFacades.has(module.domain) && module.facade === expectedFacades.get(module.domain)),
      physical_partition_not_applied: result.plan.current_shape.physical_module_partition_status === 'planned_not_applied' && result.plan.invariants.physical_partition_not_applied_by_this_gate === true,
      partition_commands_no_write: result.plan.boundary.partition_plan_command_writes_files === false && result.plan.boundary.partition_check_command_writes_files === false && result.plan.boundary.moves_source_files === false && result.plan.boundary.creates_source_modules === false,
      package_allowlist_unchanged: arrayEquals(result.projected_pack_files, expectedPackFiles),
      source_plan_file: sourcePlanFileStatus === 'present_validated' || sourcePlanFileStatus === 'not_present_installed_context_allowed'
    },
    expected_domain_ids: expectedDomains,
    planned_module_domains: plannedDomains,
    planned_modules: result.plan.planned_source_modules,
    source_plan_file: {
      path: result.plan_file,
      present: result.plan_file_present,
      status: sourcePlanFileStatus,
      schema: sourcePlanFileSchema,
      source_context_required: result.package_context === 'source_repository'
    },
    expected_pack_files: expectedPackFiles,
    projected_pack_files: result.projected_pack_files,
    boundary: result.boundary,
    errors
  };
}



function publicAuthorityFirstRead(root = packageRoot()) {
  const packageContext = sourceContext(root);
  const sourceFilesPresent = PUBLIC_AUTHORITY_FIRST_READ_INDEX.source_files.filter((rel) => fs.existsSync(path.join(root, rel)));
  const sourceFilesMissing = PUBLIC_AUTHORITY_FIRST_READ_INDEX.source_files.filter((rel) => !sourceFilesPresent.includes(rel));
  return {
    schema: 'agent-onboard-public-authority-first-read-result-001',
    status: 'ok',
    package_name: PUBLIC_AUTHORITY_FIRST_READ_INDEX.package_name,
    version: VERSION,
    release_line: PUBLIC_AUTHORITY_FIRST_READ_INDEX.release_line,
    command: PUBLIC_AUTHORITY_FIRST_READ_INDEX.command,
    check_command: PUBLIC_AUTHORITY_FIRST_READ_INDEX.check_command,
    package_root: root,
    package_context: packageContext.package_context,
    first_read_index: PUBLIC_AUTHORITY_FIRST_READ_INDEX,
    read_order: firstReadOrder(),
    source_files_present: sourceFilesPresent,
    source_files_missing: sourceFilesMissing,
    projected_templates: {
      llms_txt: llmsTxtTemplate(root),
      authority_path: authorityPathTemplate(root)
    },
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

function publicAuthorityFirstReadCheck(root = packageRoot()) {
  const result = publicAuthorityFirstRead(root);
  const expectedOrder = ['AGENTS.md', 'llms.txt', '.agent-onboard/authority-path.json', 'agent-onboard.target.json', '.agent-onboard/runtime-namespace.json', '.agent-onboard/project.json', '.agent-onboard/work-items.json', 'README.md', 'raw evidence/source files'];
  const actualOrder = result.read_order.map((entry) => entry.path);
  const expectedPackFiles = PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort();
  const projectedPackFiles = packageJsonProjectedPackFiles(readJson(path.join(root, 'package.json')));
  const errors = [];
  if (!arrayEquals(actualOrder, expectedOrder)) errors.push(`authority first-read order must be ${expectedOrder.join(', ')}`);
  if (new Set(actualOrder).size !== actualOrder.length) errors.push('authority first-read paths must be unique');
  if (PUBLIC_AUTHORITY_FIRST_READ_INDEX.boundary.first_read_command_writes_files !== false) errors.push('authority --first-read command must remain no-write');
  if (PUBLIC_AUTHORITY_FIRST_READ_INDEX.boundary.check_command_writes_files !== false) errors.push('authority --check command must remain no-write');
  if (!arrayEquals(projectedPackFiles, expectedPackFiles)) errors.push(`projected npm pack files must stay compact: ${expectedPackFiles.join(', ')}`);
  if (result.package_context === 'source_repository') {
    if (result.source_files_missing.length > 0) errors.push(`source authority files missing: ${result.source_files_missing.join(', ')}`);
    const llmsPath = path.join(root, 'llms.txt');
    const authorityPath = path.join(root, '.agent-onboard', 'authority-path.json');
    if (fs.existsSync(llmsPath)) {
      const llms = fs.readFileSync(llmsPath, 'utf8');
      if (!llms.includes('First-read order')) errors.push('llms.txt must contain First-read order');
      if (!llms.includes('.agent-onboard/authority-path.json')) errors.push('llms.txt must reference .agent-onboard/authority-path.json');
    }
    if (fs.existsSync(authorityPath)) {
      try {
        const value = readJson(authorityPath);
        const paths = Array.isArray(value.first_read_order) ? value.first_read_order.map((entry) => entry.path) : [];
        if (value.schema !== 'agent-onboard-authority-path-001') errors.push('authority-path schema must be agent-onboard-authority-path-001');
        if (!arrayEquals(paths, expectedOrder)) errors.push('authority-path first_read_order must match canonical order');
      } catch (error) {
        errors.push(`authority-path is not valid JSON: ${error && error.message ? error.message : String(error)}`);
      }
    }
  }
  return {
    schema: 'agent-onboard-public-authority-first-read-check-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: PUBLIC_AUTHORITY_FIRST_READ_INDEX.package_name,
    version: VERSION,
    release_line: PUBLIC_AUTHORITY_FIRST_READ_INDEX.release_line,
    command: PUBLIC_AUTHORITY_FIRST_READ_INDEX.check_command,
    package_root: root,
    validated: {
      first_read_order: arrayEquals(actualOrder, expectedOrder),
      first_read_paths_unique: new Set(actualOrder).size === actualOrder.length,
      authority_commands_no_write: PUBLIC_AUTHORITY_FIRST_READ_INDEX.boundary.first_read_command_writes_files === false && PUBLIC_AUTHORITY_FIRST_READ_INDEX.boundary.check_command_writes_files === false,
      source_authority_files: result.package_context === 'source_repository' ? result.source_files_missing.length === 0 : true,
      compact_package_boundary: arrayEquals(projectedPackFiles, expectedPackFiles),
      installed_package_context_skips_source_files: result.package_context === 'installed_package' ? result.source_files_present.length === 0 : true
    },
    expected_read_order: expectedOrder,
    read_order: actualOrder,
    source_files_present: result.source_files_present,
    source_files_missing: result.source_files_missing,
    package_context: result.package_context,
    expected_pack_files: expectedPackFiles,
    projected_pack_files: projectedPackFiles,
    boundary: result.boundary,
    errors
  };
}


function publicTargetRuntimeNamespace(root = packageRoot()) {
  const packageContext = sourceContext(root);
  const sourceFile = PUBLIC_TARGET_RUNTIME_NAMESPACE.namespace_file;
  const sourceFilePresent = fs.existsSync(path.join(root, sourceFile));
  return {
    schema: 'agent-onboard-public-target-runtime-namespace-result-001',
    status: 'ok',
    package_name: PUBLIC_TARGET_RUNTIME_NAMESPACE.package_name,
    version: VERSION,
    release_line: PUBLIC_TARGET_RUNTIME_NAMESPACE.release_line,
    command: PUBLIC_TARGET_RUNTIME_NAMESPACE.command,
    check_command: PUBLIC_TARGET_RUNTIME_NAMESPACE.check_command,
    package_root: root,
    package_context: packageContext.package_context,
    namespace: PUBLIC_TARGET_RUNTIME_NAMESPACE,
    namespace_root: PUBLIC_TARGET_RUNTIME_NAMESPACE.namespace_root,
    namespace_file: PUBLIC_TARGET_RUNTIME_NAMESPACE.namespace_file,
    canonical_runtime_files: PUBLIC_TARGET_RUNTIME_NAMESPACE.canonical_runtime_files.map((entry) => ({
      path: entry.path,
      domain: entry.domain,
      role: entry.role,
      kind: entry.kind,
      required: entry.required,
      written_by: entry.written_by
    })),
    top_level_authority_files: PUBLIC_TARGET_RUNTIME_NAMESPACE.top_level_authority_files.slice(),
    reserved_future_files: PUBLIC_TARGET_RUNTIME_NAMESPACE.reserved_future_files.map((entry) => ({
      path: entry.path,
      domain: entry.domain,
      status: entry.status
    })),
    source_file_present: sourceFilePresent,
    source_file_missing: sourceFilePresent ? [] : [sourceFile],
    projected_template: targetRuntimeNamespaceTemplate(root),
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

function publicTargetRuntimeNamespaceCheck(root = packageRoot()) {
  const result = publicTargetRuntimeNamespace(root);
  const expectedRuntimeFiles = ['.agent-onboard/runtime-namespace.json', '.agent-onboard/project.json', '.agent-onboard/work-items.json', '.agent-onboard/authority-path.json'];
  const actualRuntimeFiles = result.canonical_runtime_files.map((entry) => entry.path);
  const targetCanonical = TARGET_ONBOARDING_SURFACE_PLAN.canonical_files.slice();
  const targetWritePaths = targetOnboardingWriteSet(root).map((entry) => entry.path);
  const expectedPackFiles = PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort();
  const projectedPackFiles = packageJsonProjectedPackFiles(readJson(path.join(root, 'package.json')));
  const reservedPaths = PUBLIC_TARGET_RUNTIME_NAMESPACE.reserved_future_files.map((entry) => entry.path);
  const writtenReservedPaths = targetWritePaths.filter((rel) => reservedPaths.includes(rel));
  const errors = [];
  if (PUBLIC_TARGET_RUNTIME_NAMESPACE.namespace_root !== '.agent-onboard') errors.push('target runtime namespace root must be .agent-onboard');
  if (PUBLIC_TARGET_RUNTIME_NAMESPACE.namespace_file !== '.agent-onboard/runtime-namespace.json') errors.push('target runtime namespace file must be .agent-onboard/runtime-namespace.json');
  if (!arrayEquals(actualRuntimeFiles, expectedRuntimeFiles)) errors.push(`target runtime file order must be ${expectedRuntimeFiles.join(', ')}`);
  if (!targetCanonical.includes(PUBLIC_TARGET_RUNTIME_NAMESPACE.namespace_file)) errors.push('target onboarding canonical files must include .agent-onboard/runtime-namespace.json');
  if (!targetWritePaths.includes(PUBLIC_TARGET_RUNTIME_NAMESPACE.namespace_file)) errors.push('target onboarding write set must include .agent-onboard/runtime-namespace.json');
  if (writtenReservedPaths.length > 0) errors.push(`target onboarding must not write reserved runtime files: ${writtenReservedPaths.join(', ')}`);
  if (PUBLIC_TARGET_RUNTIME_NAMESPACE.boundary.namespace_command_writes_files !== false) errors.push('target runtime --namespace command must remain no-write');
  if (PUBLIC_TARGET_RUNTIME_NAMESPACE.boundary.check_command_writes_files !== false) errors.push('target runtime --check command must remain no-write');
  if (!arrayEquals(projectedPackFiles, expectedPackFiles)) errors.push(`projected npm pack files must stay compact: ${expectedPackFiles.join(', ')}`);
  if (result.package_context === 'source_repository') {
    if (!result.source_file_present) errors.push('source runtime namespace file missing: .agent-onboard/runtime-namespace.json');
    const namespacePath = path.join(root, '.agent-onboard', 'runtime-namespace.json');
    if (fs.existsSync(namespacePath)) {
      try {
        const value = readJson(namespacePath);
        const paths = Array.isArray(value.canonical_runtime_files) ? value.canonical_runtime_files.map((entry) => entry.path) : [];
        if (value.schema !== 'agent-onboard-target-runtime-namespace-001') errors.push('runtime-namespace schema must be agent-onboard-target-runtime-namespace-001');
        if (!arrayEquals(paths, expectedRuntimeFiles)) errors.push('runtime-namespace canonical_runtime_files must match canonical runtime order');
        if (value.namespace_root !== '.agent-onboard') errors.push('runtime-namespace namespace_root must be .agent-onboard');
      } catch (error) {
        errors.push(`runtime-namespace is not valid JSON: ${error && error.message ? error.message : String(error)}`);
      }
    }
  }
  return {
    schema: 'agent-onboard-public-target-runtime-namespace-check-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: PUBLIC_TARGET_RUNTIME_NAMESPACE.package_name,
    version: VERSION,
    release_line: PUBLIC_TARGET_RUNTIME_NAMESPACE.release_line,
    command: PUBLIC_TARGET_RUNTIME_NAMESPACE.check_command,
    package_root: root,
    validated: {
      namespace_root: PUBLIC_TARGET_RUNTIME_NAMESPACE.namespace_root === '.agent-onboard',
      namespace_file: PUBLIC_TARGET_RUNTIME_NAMESPACE.namespace_file === '.agent-onboard/runtime-namespace.json',
      runtime_file_order: arrayEquals(actualRuntimeFiles, expectedRuntimeFiles),
      target_onboarding_canonical_file: targetCanonical.includes(PUBLIC_TARGET_RUNTIME_NAMESPACE.namespace_file),
      target_onboarding_write_set: targetWritePaths.includes(PUBLIC_TARGET_RUNTIME_NAMESPACE.namespace_file),
      reserved_future_files_not_written: writtenReservedPaths.length === 0,
      runtime_commands_no_write: PUBLIC_TARGET_RUNTIME_NAMESPACE.boundary.namespace_command_writes_files === false && PUBLIC_TARGET_RUNTIME_NAMESPACE.boundary.check_command_writes_files === false,
      source_runtime_namespace_file: result.package_context === 'source_repository' ? result.source_file_present : true,
      compact_package_boundary: arrayEquals(projectedPackFiles, expectedPackFiles)
    },
    namespace_root: result.namespace_root,
    namespace_file: result.namespace_file,
    expected_runtime_files: expectedRuntimeFiles,
    runtime_files: actualRuntimeFiles,
    target_onboarding_canonical_files: targetCanonical,
    target_onboarding_write_paths: targetWritePaths,
    reserved_future_files: result.reserved_future_files,
    source_file_present: result.source_file_present,
    package_context: result.package_context,
    expected_pack_files: expectedPackFiles,
    projected_pack_files: projectedPackFiles,
    boundary: result.boundary,
    errors
  };
}


function publicSourceDomainExtractionRehearsal(root = packageRoot()) {
  const pkg = readJson(path.join(root, 'package.json'));
  const context = sourceContext(root);
  const rehearsalFile = PUBLIC_SOURCE_DOMAIN_EXTRACTION_REHEARSAL.rehearsal_file;
  const rehearsalFilePath = path.join(root, rehearsalFile);
  const plannedModulePaths = PUBLIC_SOURCE_DOMAIN_EXTRACTION_REHEARSAL.extraction_rehearsal_units.map((unit) => unit.rehearsal_module);
  return {
    schema: 'agent-onboard-public-source-domain-extraction-rehearsal-result-001',
    status: 'ok',
    package_name: PUBLIC_SOURCE_DOMAIN_EXTRACTION_REHEARSAL.package_name,
    version: VERSION,
    release_line: PUBLIC_SOURCE_DOMAIN_EXTRACTION_REHEARSAL.release_line,
    command: PUBLIC_SOURCE_DOMAIN_EXTRACTION_REHEARSAL.command,
    check_command: PUBLIC_SOURCE_DOMAIN_EXTRACTION_REHEARSAL.check_command,
    package_root: root,
    package_context: context.package_context,
    package_json_version: pkg.version,
    rehearsal: PUBLIC_SOURCE_DOMAIN_EXTRACTION_REHEARSAL,
    rehearsal_file: rehearsalFile,
    rehearsal_file_present: fs.existsSync(rehearsalFilePath),
    prerequisite_partition_plan: PUBLIC_SOURCE_DOMAIN_MODULE_PARTITION_PLAN,
    planned_module_paths: plannedModulePaths,
    physical_module_paths_present: plannedModulePaths.filter((rel) => fs.existsSync(path.join(root, rel))),
    projected_pack_files: packageJsonProjectedPackFiles(pkg),
    boundary: {
      writes_files: false,
      moves_source_files: false,
      creates_source_modules: false,
      changes_runtime_outputs: false,
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

function publicSourceDomainExtractionRehearsalCheck(root = packageRoot()) {
  const result = publicSourceDomainExtractionRehearsal(root);
  const partition = publicSourceDomainModulePartitionPlanCheck(root);
  const expectedDomains = PUBLIC_ARCHITECTURE_MAP.canonical_domains.map((domain) => domain.id);
  const expectedFacades = new Map(PUBLIC_DOMAIN_SERVICE_FACADES.facades.map((facade) => [facade.id, facade.service]));
  const expectedPackFiles = PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort();
  const unitDomains = result.rehearsal.extraction_rehearsal_units.map((unit) => unit.domain);
  const errors = [];
  if (partition.status !== 'ok') errors.push(...partition.errors.map((error) => `partition plan: ${error}`));
  if (result.rehearsal.rehearsal_status !== 'rehearsed_not_applied') errors.push('source extraction rehearsal must remain rehearsed_not_applied for this gate');
  if (!arrayEquals(unitDomains, expectedDomains)) errors.push(`source extraction rehearsal units must follow canonical domain order ${expectedDomains.join(', ')}`);
  if (new Set(unitDomains).size !== unitDomains.length) errors.push('source extraction rehearsal unit domains must be unique');
  for (const unit of result.rehearsal.extraction_rehearsal_units) {
    if (!expectedDomains.includes(unit.domain)) errors.push(`source extraction rehearsal unit is not mapped to a canonical domain: ${unit.domain}`);
    if (expectedFacades.has(unit.domain) && unit.facade !== expectedFacades.get(unit.domain)) errors.push(`source extraction rehearsal unit ${unit.domain} must map to facade ${expectedFacades.get(unit.domain)}`);
    if (!String(unit.rehearsal_module || '').startsWith('src/domains/')) errors.push(`source extraction rehearsal module path must stay under src/domains/: ${unit.rehearsal_module}`);
    if (unit.extraction_mode !== 'rehearsal_only_no_file_created') errors.push(`source extraction rehearsal unit ${unit.domain} must be rehearsal_only_no_file_created`);
  }
  const admittedFirstSlicePhysicalModules = ['src/domains/core.js', 'src/domains/authority.js', 'src/domains/work-items.js', 'src/domains/claims.js'];
  const unadmittedPhysicalModules = result.physical_module_paths_present.filter((rel) => !admittedFirstSlicePhysicalModules.includes(rel));
  if (unadmittedPhysicalModules.length > 0) errors.push(`unadmitted physical source modules must not be created by this rehearsal gate: ${unadmittedPhysicalModules.join(', ')}`);
  if (result.rehearsal.entrypoint_preservation.physical_modules_created_by_this_gate !== false) errors.push('source extraction rehearsal must not create physical modules');
  if (result.rehearsal.entrypoint_preservation.runtime_output_change_allowed !== false) errors.push('source extraction rehearsal must not allow runtime output changes');
  if (result.rehearsal.entrypoint_preservation.package_allowlist_change_allowed !== false) errors.push('source extraction rehearsal must not allow package allowlist changes');
  if (result.rehearsal.boundary.extraction_rehearsal_command_writes_files !== false) errors.push('architecture extraction rehearsal command must remain no-write');
  if (result.rehearsal.boundary.extraction_check_command_writes_files !== false) errors.push('architecture extraction check command must remain no-write');
  if (result.rehearsal.boundary.creates_source_modules !== false) errors.push('architecture extraction rehearsal must not create source modules');
  if (result.rehearsal.boundary.moves_source_files !== false) errors.push('architecture extraction rehearsal must not move source files');
  if (result.rehearsal.boundary.changes_runtime_outputs !== false) errors.push('architecture extraction rehearsal must not change runtime outputs');
  if (!arrayEquals(result.projected_pack_files, expectedPackFiles)) errors.push(`projected npm pack files must remain ${expectedPackFiles.join(', ')}`);

  let sourceRehearsalFileStatus = 'not_present_installed_context_allowed';
  let sourceRehearsalFileSchema = null;
  if (result.rehearsal_file_present) {
    try {
      const sourceRehearsal = readJson(path.join(root, result.rehearsal_file));
      sourceRehearsalFileSchema = sourceRehearsal.schema || null;
      if (sourceRehearsal.schema !== PUBLIC_SOURCE_DOMAIN_EXTRACTION_REHEARSAL.schema) errors.push(`${result.rehearsal_file} schema must be ${PUBLIC_SOURCE_DOMAIN_EXTRACTION_REHEARSAL.schema}`);
      if (sourceRehearsal.rehearsal_status !== 'rehearsed_not_applied') errors.push(`${result.rehearsal_file} must declare rehearsed_not_applied rehearsal status`);
      const fileDomains = Array.isArray(sourceRehearsal.extraction_rehearsal_units) ? sourceRehearsal.extraction_rehearsal_units.map((unit) => unit.domain) : [];
      if (!arrayEquals(fileDomains, expectedDomains)) errors.push(`${result.rehearsal_file} extraction_rehearsal_units must follow canonical domain order ${expectedDomains.join(', ')}`);
      sourceRehearsalFileStatus = 'present_validated';
    } catch (error) {
      sourceRehearsalFileStatus = 'present_invalid_json';
      errors.push(`${result.rehearsal_file} is not valid JSON: ${error && error.message ? error.message : String(error)}`);
    }
  } else if (result.package_context === 'source_repository') {
    sourceRehearsalFileStatus = 'missing_source_context';
    errors.push(`${result.rehearsal_file} must be present in source repository context`);
  }

  return {
    schema: 'agent-onboard-public-source-domain-extraction-rehearsal-check-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: PUBLIC_SOURCE_DOMAIN_EXTRACTION_REHEARSAL.package_name,
    version: VERSION,
    release_line: PUBLIC_SOURCE_DOMAIN_EXTRACTION_REHEARSAL.release_line,
    command: PUBLIC_SOURCE_DOMAIN_EXTRACTION_REHEARSAL.check_command,
    package_root: root,
    validated: {
      partition_plan: partition.status === 'ok',
      rehearsal_unit_count: result.rehearsal.extraction_rehearsal_units.length === expectedDomains.length,
      rehearsal_unit_domain_order: arrayEquals(unitDomains, expectedDomains),
      rehearsal_unit_domains_unique: new Set(unitDomains).size === unitDomains.length,
      rehearsal_units_map_to_facades: result.rehearsal.extraction_rehearsal_units.every((unit) => expectedFacades.has(unit.domain) && unit.facade === expectedFacades.get(unit.domain)),
      no_physical_modules_created: unadmittedPhysicalModules.length === 0,
      runtime_output_change_not_allowed: result.rehearsal.entrypoint_preservation.runtime_output_change_allowed === false && result.rehearsal.boundary.changes_runtime_outputs === false,
      extraction_commands_no_write: result.rehearsal.boundary.extraction_rehearsal_command_writes_files === false && result.rehearsal.boundary.extraction_check_command_writes_files === false && result.rehearsal.boundary.moves_source_files === false && result.rehearsal.boundary.creates_source_modules === false,
      package_allowlist_unchanged: arrayEquals(result.projected_pack_files, expectedPackFiles),
      source_rehearsal_file: sourceRehearsalFileStatus === 'present_validated' || sourceRehearsalFileStatus === 'not_present_installed_context_allowed'
    },
    expected_domain_ids: expectedDomains,
    rehearsal_unit_domains: unitDomains,
    extraction_rehearsal_units: result.rehearsal.extraction_rehearsal_units,
    physical_module_paths_present: result.physical_module_paths_present,
    admitted_physical_module_paths: result.physical_module_paths_present.filter((rel) => admittedFirstSlicePhysicalModules.includes(rel)),
    unadmitted_physical_module_paths: unadmittedPhysicalModules,
    prerequisite_partition_plan: {
      status: partition.status,
      errors: partition.errors
    },
    source_rehearsal_file: {
      path: result.rehearsal_file,
      present: result.rehearsal_file_present,
      status: sourceRehearsalFileStatus,
      schema: sourceRehearsalFileSchema,
      source_context_required: result.package_context === 'source_repository'
    },
    projected_pack_files: result.projected_pack_files,
    expected_pack_files: expectedPackFiles,
    boundary: result.boundary,
    errors
  };
}

const publicArchitectureSourceExtractionService = createPublicArchitectureSourceExtractionService({
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
});
const {
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
} = publicArchitectureSourceExtractionService;

function publicArchitectureM1ClosureM2Seed(root = packageRoot()) {
  const pkg = readJson(path.join(root, 'package.json'));
  const context = sourceContext(root);
  const transitionFile = PUBLIC_ARCHITECTURE_M1_CLOSURE_M2_SEED.transition_file;
  const ledgerPath = path.join(root, '.agent-onboard', 'work-items.json');
  let ledger = null;
  if (fs.existsSync(ledgerPath)) {
    try {
      ledger = readJson(ledgerPath);
    } catch {
      ledger = null;
    }
  }
  const milestones = ledger && Array.isArray(ledger.milestones) ? ledger.milestones : [];
  const workItems = ledger && Array.isArray(ledger.work_items) ? ledger.work_items : [];
  const closedMilestone = milestones.find((item) => item.id === PUBLIC_ARCHITECTURE_M1_CLOSURE_M2_SEED.closed_milestone_id) || null;
  const openedMilestone = milestones.find((item) => item.id === PUBLIC_ARCHITECTURE_M1_CLOSURE_M2_SEED.opened_milestone_id) || null;
  const seedWorkItem = workItems.find((item) => item.id === PUBLIC_ARCHITECTURE_M1_CLOSURE_M2_SEED.seed_work_item_id) || null;
  const nextWorkItem = workItems.find((item) => item.id === PUBLIC_ARCHITECTURE_M1_CLOSURE_M2_SEED.next_work_item_id) || null;
  const m1WorkItems = workItems.filter((item) => item.milestone_id === PUBLIC_ARCHITECTURE_M1_CLOSURE_M2_SEED.closed_milestone_id);
  return {
    schema: 'agent-onboard-public-architecture-m1-closure-m2-seed-result-001',
    status: 'ok',
    package_name: PUBLIC_ARCHITECTURE_M1_CLOSURE_M2_SEED.package_name,
    version: VERSION,
    release_line: PUBLIC_ARCHITECTURE_M1_CLOSURE_M2_SEED.release_line,
    command: PUBLIC_ARCHITECTURE_M1_CLOSURE_M2_SEED.command,
    check_command: PUBLIC_ARCHITECTURE_M1_CLOSURE_M2_SEED.check_command,
    package_root: root,
    package_context: context.package_context,
    package_json_version: pkg.version,
    transition_file: transitionFile,
    transition_file_present: fs.existsSync(path.join(root, transitionFile)),
    transition: PUBLIC_ARCHITECTURE_M1_CLOSURE_M2_SEED,
    source_ledger_present: fs.existsSync(ledgerPath),
    milestones: {
      closed: closedMilestone,
      opened: openedMilestone
    },
    work_items: {
      m1_count: m1WorkItems.length,
      m1_non_closed: m1WorkItems.filter((item) => item.status !== 'closed').map((item) => ({ id: item.id, title: item.title, status: item.status })),
      seed: seedWorkItem,
      next: nextWorkItem
    },
    prerequisite_authority_runtime_bridge: publicSourceModuleExtractionAuthorityRuntimeBridgeCheck(root),
    projected_pack_files: packageJsonProjectedPackFiles(pkg),
    boundary: {
      writes_files: false,
      writes_source_state: false,
      writes_target_repository_state: false,
      creates_source_modules: false,
      moves_existing_source_files: false,
      git_mutation: false,
      installs_dependencies: false,
      runs_package_manager: false,
      runs_build_test_deploy: false,
      publishes_package: false,
      mutates_registry: false
    }
  };
}

function workItemIdFromComponents(value) {
  if (!value || !Number.isInteger(value.program) || !Number.isInteger(value.stage) || !Number.isInteger(value.milestone) || !Number.isInteger(value.work_item)) return null;
  return ['P', value.program, 'S', value.stage, 'M', value.milestone, 'W', value.work_item].join('');
}

function workItemIdsFromComponentList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => workItemIdFromComponents(item)).filter(Boolean);
}

function publicArchitectureM1ClosureM2SeedCheck(root = packageRoot()) {
  const result = publicArchitectureM1ClosureM2Seed(root);
  const gate = PUBLIC_ARCHITECTURE_M1_CLOSURE_M2_SEED;
  const expectedPackFiles = PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort();
  const errors = [];

  if (result.prerequisite_authority_runtime_bridge.status !== 'ok') {
    errors.push(...result.prerequisite_authority_runtime_bridge.errors.map((error) => `authority runtime bridge: ${error}`));
  }
  if (!arrayEquals(result.projected_pack_files, expectedPackFiles)) errors.push(`projected npm pack files must remain ${expectedPackFiles.join(', ')}`);
  if (gate.boundary.m2_seed_command_writes_files !== false) errors.push('architecture --m2-seed must remain no-write');
  if (gate.boundary.m2_seed_check_command_writes_files !== false) errors.push('architecture --m2-seed-check must remain no-write');
  if (gate.boundary.package_allowlist_unchanged !== true) errors.push('M2 seed gate must preserve package allowlist');
  if (gate.boundary.creates_source_modules !== false) errors.push('M2 seed gate must not create source modules');

  let transitionFileStatus = 'not_present_installed_context_allowed';
  let transitionFileSchema = null;
  if (result.transition_file_present) {
    try {
      const transitionFile = readJson(path.join(root, result.transition_file));
      transitionFileSchema = transitionFile.schema || null;
      if (transitionFile.schema !== gate.schema) errors.push(`${result.transition_file} schema must be ${gate.schema}`);
      if (!transitionFile.milestone_transition || transitionFile.milestone_transition.closed_milestone_id !== gate.closed_milestone_id) errors.push(`${result.transition_file} must close ${gate.closed_milestone_id}`);
      if (!transitionFile.milestone_transition || transitionFile.milestone_transition.opened_milestone_id !== gate.opened_milestone_id) errors.push(`${result.transition_file} must open ${gate.opened_milestone_id}`);
      const transitionSeedWorkItemId = transitionFile.milestone_transition && (transitionFile.milestone_transition.seed_work_item_id || workItemIdFromComponents(transitionFile.milestone_transition.seed_work_item_components));
      const transitionNextWorkItemId = transitionFile.milestone_transition && (transitionFile.milestone_transition.next_work_item_id || workItemIdFromComponents(transitionFile.milestone_transition.next_work_item_components));
      const transitionPrerequisiteIds = Array.isArray(transitionFile.prerequisite_closed_work_items) ? transitionFile.prerequisite_closed_work_items : workItemIdsFromComponentList(transitionFile.prerequisite_closed_work_item_components);
      if (transitionSeedWorkItemId !== gate.seed_work_item_id) errors.push(`${result.transition_file} seed work item components must resolve to the transition seed work item`);
      if (transitionNextWorkItemId !== gate.next_work_item_id) errors.push(`${result.transition_file} next work item components must resolve to the next executable work item`);
      if (!arrayEquals(transitionPrerequisiteIds, gate.prerequisite_closed_work_items)) errors.push(`${result.transition_file} prerequisite closed work item components must match the M1 closure list`);
      transitionFileStatus = 'present_validated';
    } catch (error) {
      transitionFileStatus = 'present_invalid_json';
      errors.push(`${result.transition_file} is not valid JSON: ${error && error.message ? error.message : String(error)}`);
    }
  } else if (result.package_context === 'source_repository') {
    transitionFileStatus = 'missing_source_context';
    errors.push(`${result.transition_file} must be present in source repository context`);
  }

  const sourceLedgerRequired = result.package_context === 'source_repository';
  const closedMilestone = result.milestones.closed;
  const openedMilestone = result.milestones.opened;
  const seedWorkItem = result.work_items.seed;
  const nextWorkItem = result.work_items.next;
  const prerequisiteClosed = new Set(gate.prerequisite_closed_work_items);
  const m1WorkIds = result.source_ledger_present ? (readJson(path.join(root, '.agent-onboard', 'work-items.json')).work_items || []).filter((item) => item.milestone_id === gate.closed_milestone_id).map((item) => item.id) : [];
  const missingPrerequisites = gate.prerequisite_closed_work_items.filter((id) => !m1WorkIds.includes(id));
  const unexpectedM1WorkItems = m1WorkIds.filter((id) => !prerequisiteClosed.has(id));

  if (sourceLedgerRequired && !result.source_ledger_present) errors.push('.agent-onboard/work-items.json must be present in source repository context');
  if (result.source_ledger_present) {
    if (!closedMilestone) errors.push(`${gate.closed_milestone_id} milestone must exist`);
    else if (closedMilestone.status !== 'closed') errors.push(`${gate.closed_milestone_id} milestone must be closed`);
    if (!openedMilestone) errors.push(`${gate.opened_milestone_id} milestone must exist`);
    else if (!['open', 'closed'].includes(openedMilestone.status)) errors.push(`${gate.opened_milestone_id} milestone must be open or closed`);
    if (result.work_items.m1_non_closed.length > 0) errors.push(`${gate.closed_milestone_id} must have no non-closed work items`);
    if (missingPrerequisites.length > 0) errors.push(`${gate.closed_milestone_id} is missing prerequisite work items: ${missingPrerequisites.join(', ')}`);
    if (unexpectedM1WorkItems.length > 0) errors.push(`${gate.closed_milestone_id} contains unplanned extension work items: ${unexpectedM1WorkItems.join(', ')}`);
    if (!seedWorkItem) errors.push(`${gate.seed_work_item_id} work item must exist`);
    else if (seedWorkItem.status !== 'closed') errors.push(`${gate.seed_work_item_id} transition work item must be closed`);
    if (!nextWorkItem) errors.push(`${gate.next_work_item_id} work item must exist`);
    else if (!['open', 'closed'].includes(nextWorkItem.status)) errors.push(`${gate.next_work_item_id} seeded work item must be open or closed`);
  }

  return {
    schema: 'agent-onboard-public-architecture-m1-closure-m2-seed-check-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: gate.package_name,
    version: VERSION,
    release_line: gate.release_line,
    command: gate.check_command,
    package_root: root,
    validated: {
      prerequisite_authority_runtime_bridge: result.prerequisite_authority_runtime_bridge.status === 'ok',
      m1_milestone_closed_or_installed_context_allowed: !sourceLedgerRequired || (closedMilestone && closedMilestone.status === 'closed'),
      m1_work_items_all_closed_or_installed_context_allowed: !sourceLedgerRequired || result.work_items.m1_non_closed.length === 0,
      m2_milestone_open_or_installed_context_allowed: !sourceLedgerRequired || (openedMilestone && ['open', 'closed'].includes(openedMilestone.status)),
      seed_work_item_closed_or_installed_context_allowed: !sourceLedgerRequired || (seedWorkItem && seedWorkItem.status === 'closed'),
      next_work_item_seeded_or_installed_context_allowed: !sourceLedgerRequired || (nextWorkItem && ['open', 'closed'].includes(nextWorkItem.status)),
      transition_file_present_or_installed_context_allowed: transitionFileStatus === 'present_validated' || transitionFileStatus === 'not_present_installed_context_allowed',
      package_allowlist_unchanged: arrayEquals(result.projected_pack_files, expectedPackFiles),
      m2_seed_commands_no_write: gate.boundary.m2_seed_command_writes_files === false && gate.boundary.m2_seed_check_command_writes_files === false
    },
    milestone_transition: {
      closed_milestone: closedMilestone,
      opened_milestone: openedMilestone,
      seed_work_item: seedWorkItem ? { id: seedWorkItem.id, title: seedWorkItem.title, status: seedWorkItem.status } : null,
      next_work_item: nextWorkItem ? { id: nextWorkItem.id, title: nextWorkItem.title, status: nextWorkItem.status } : null,
      m1_non_closed_work_items: result.work_items.m1_non_closed
    },
    source_transition_file: {
      path: result.transition_file,
      present: result.transition_file_present,
      status: transitionFileStatus,
      schema: transitionFileSchema,
      source_context_required: sourceLedgerRequired
    },
    prerequisite_authority_runtime_bridge: {
      status: result.prerequisite_authority_runtime_bridge.status,
      errors: result.prerequisite_authority_runtime_bridge.errors
    },
    projected_pack_files: result.projected_pack_files,
    expected_pack_files: expectedPackFiles,
    boundary: result.boundary,
    errors
  };
}

  return Object.freeze({
    publicCommandRouter,
    publicCommandRouterCheck,
    publicDomainServiceFacades,
    publicDomainServiceFacadesCheck,
    publicSourceDomainModulePartitionPlan,
    plainClone,
    publicSourceDomainModulePartitionPlanCheck,
    publicAuthorityFirstRead,
    publicAuthorityFirstReadCheck,
    publicTargetRuntimeNamespace,
    publicTargetRuntimeNamespaceCheck,
    publicSourceDomainExtractionRehearsal,
    publicSourceDomainExtractionRehearsalCheck,
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
    publicSourceModuleExtractionAuthorityRuntimeBridgeCheck,
    publicArchitectureM1ClosureM2Seed,
    workItemIdFromComponents,
    workItemIdsFromComponentList,
    publicArchitectureM1ClosureM2SeedCheck
  });
}

module.exports = Object.freeze({
  createPublicArchitectureRuntimeService
});
