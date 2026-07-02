'use strict';

const fs = require('fs');
const path = require('path');

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
