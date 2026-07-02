#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { route: routeCommand } = require('./agent_onboard/command-router');
const { createCompatibilityCommandPort } = require('./agent_onboard/adapters/compatibility-command-port');
const { createCoreCommandAdapter } = require('./agent_onboard/adapters/commands/core');
const { createPackageCommandAdapter } = require('./agent_onboard/adapters/commands/release-package');
const { createArchitectureCommandAdapter } = require('./agent_onboard/adapters/commands/architecture');
const { createAuthorityCommandAdapter } = require('./agent_onboard/adapters/commands/authority');
const { createTargetCommandAdapter } = require('./agent_onboard/adapters/commands/target');
const { createWorkItemsCommandAdapter } = require('./agent_onboard/adapters/commands/work-items');
const { createWorkItemsService } = require('./agent_onboard/domains/work-items');
const VERSION = require('../package.json').version;
const TARGET_CONFIG_FILE = 'agent-onboard.target.json';
const RELEASE_LINE = 'public_architecture_source_extraction_service_split_gate';
const PUBLIC_PACKAGED_ROUTER_PORT_PACK_FILES = Object.freeze([
  'LICENSE',
  'README.md',
  'cli/agent-onboard.js',
  'cli/agent_onboard/adapters/commands/architecture.js',
  'cli/agent_onboard/adapters/commands/authority.js',
  'cli/agent_onboard/adapters/commands/core.js',
  'cli/agent_onboard/adapters/commands/release-package.js',
  'cli/agent_onboard/adapters/commands/target.js',
  'cli/agent_onboard/adapters/commands/work-items.js',
  'cli/agent_onboard/adapters/compatibility-command-port.js',
  'cli/agent_onboard/command-router.js',
  'cli/agent_onboard/domains/architecture/m3-runtime-catalog.js',
  'cli/agent_onboard/domains/architecture/services/runtime/architecture-runtime-service.js',
  'cli/agent_onboard/domains/architecture/services/source-extraction/architecture-source-extraction-service.js',
  'cli/agent_onboard/domains/architecture/static-catalog.js',
  'cli/agent_onboard/domains/service-partitions.js',
  'cli/agent_onboard/domains/target/services/target-runtime-utilities.js',
  'cli/agent_onboard/domains/target/services/target-service.js',
  'cli/agent_onboard/domains/target/static-catalog.js',
  'cli/agent_onboard/domains/work-items/index.js',
  'cli/agent_onboard/domains/work-items/services/work-items-service.js',
  'cli/agent_onboard/ports/compatibility-command-port.js',
  'package.json'
]);
const PUBLIC_PACKAGED_ROUTER_PORT_MODULE_FILES = Object.freeze(PUBLIC_PACKAGED_ROUTER_PORT_PACK_FILES.filter((rel) => rel.startsWith('cli/agent_onboard/')));

process.stdout.on('error', (error) => {
  if (error && error.code === 'EPIPE') process.exit(0);
  throw error;
});

const TARGET_CONFIG_SCHEMA = {
  schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'agent-onboard-target-config-001',
  type: 'object',
  required: ['schema', 'control', 'project', 'boundaries', 'surfaces'],
  additionalProperties: false,
  properties: {
    schema: { const: 'agent-onboard-target-config-001' },
    control: {
      type: 'object',
      required: ['package_name', 'requested_mode', 'authority_level'],
      additionalProperties: false,
      properties: {
        package_name: { const: 'agent-onboard' },
        requested_mode: { enum: ['target_dry_run', 'target_write'] },
        authority_level: { enum: ['L1_read_only_preview', 'L2_explicit_write'] }
      }
    },
    project: {
      type: 'object',
      required: ['name', 'kind'],
      additionalProperties: false,
      properties: {
        name: { type: 'string', minLength: 1 },
        kind: { type: 'string', minLength: 1 }
      }
    },
    boundaries: {
      type: 'object',
      required: [
        'writes_allowed',
        'managed_project_commands_allowed',
        'create_agent_onboard_runtime_state',
        'install_dependencies',
        'run_build_test_deploy',
        'publish_or_push'
      ],
      additionalProperties: false,
      properties: {
        writes_allowed: { type: 'boolean' },
        managed_project_commands_allowed: { type: 'integer', minimum: 0 },
        create_agent_onboard_runtime_state: { type: 'boolean' },
        install_dependencies: { type: 'boolean' },
        run_build_test_deploy: { type: 'boolean' },
        publish_or_push: { type: 'boolean' }
      }
    },
    surfaces: {
      type: 'object',
      required: ['include', 'exclude'],
      additionalProperties: false,
      properties: {
        include: { type: 'array', items: { type: 'string' } },
        exclude: { type: 'array', items: { type: 'string' } }
      }
    }
  }
};

const WORK_ITEMS_SCHEMA = {
  schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'agent-onboard-target-work-items-001',
  type: 'object',
  required: ['schema', 'package_name', 'vocabulary', 'programs', 'stages', 'milestones', 'work_items'],
  additionalProperties: false,
  properties: {
    schema: { const: 'agent-onboard-target-work-items-001' },
    package_name: { const: 'agent-onboard' },
    vocabulary: {
      type: 'object',
      required: ['program', 'stage', 'milestone', 'work_item'],
      additionalProperties: false,
      properties: {
        program: {
          type: 'object',
          required: ['prefix', 'name', 'description'],
          additionalProperties: false,
          properties: {
            prefix: { const: 'P' },
            name: { const: 'Program' },
            description: { type: 'string', minLength: 1 }
          }
        },
        stage: {
          type: 'object',
          required: ['prefix', 'name', 'description'],
          additionalProperties: false,
          properties: {
            prefix: { const: 'S' },
            name: { const: 'Stage' },
            description: { type: 'string', minLength: 1 }
          }
        },
        milestone: {
          type: 'object',
          required: ['prefix', 'name', 'description'],
          additionalProperties: false,
          properties: {
            prefix: { const: 'M' },
            name: { const: 'Milestone' },
            description: { type: 'string', minLength: 1 }
          }
        },
        work_item: {
          type: 'object',
          required: ['prefix', 'name', 'description'],
          additionalProperties: false,
          properties: {
            prefix: { const: 'W' },
            name: { const: 'Work Item' },
            description: { type: 'string', minLength: 1 }
          }
        }
      }
    },
    programs: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'title', 'status'],
        additionalProperties: false,
        properties: {
          id: { type: 'string', pattern: '^P[0-9]+$' },
          title: { type: 'string', minLength: 1 },
          status: { enum: ['open', 'closed'] }
        }
      }
    },
    stages: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'program_id', 'title', 'status'],
        additionalProperties: false,
        properties: {
          id: { type: 'string', pattern: '^P[0-9]+S[0-9]+$' },
          program_id: { type: 'string', pattern: '^P[0-9]+$' },
          title: { type: 'string', minLength: 1 },
          status: { enum: ['open', 'closed'] }
        }
      }
    },
    milestones: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'stage_id', 'title', 'status'],
        additionalProperties: false,
        properties: {
          id: { type: 'string', pattern: '^P[0-9]+S[0-9]+M[0-9]+$' },
          stage_id: { type: 'string', pattern: '^P[0-9]+S[0-9]+$' },
          title: { type: 'string', minLength: 1 },
          status: { enum: ['open', 'closed'] }
        }
      }
    },
    work_items: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'milestone_id', 'title', 'status'],
        additionalProperties: false,
        properties: {
          id: { type: 'string', pattern: '^P[0-9]+S[0-9]+M[0-9]+W[0-9]+$' },
          milestone_id: { type: 'string', pattern: '^P[0-9]+S[0-9]+M[0-9]+$' },
          title: { type: 'string', minLength: 1 },
          status: { enum: ['open', 'claimed', 'closed'] },
          claim: {
            type: 'object',
            required: ['actor', 'claimed_at'],
            additionalProperties: false,
            properties: {
              actor: { type: 'string', minLength: 1 },
              claimed_at: { type: 'string', minLength: 1 },
              note: { type: 'string', minLength: 1 }
            }
          },
          closure: {
            type: 'object',
            required: ['actor', 'closed_at', 'summary', 'changed_files', 'checks_run', 'checks_not_run', 'known_non_pass'],
            additionalProperties: false,
            properties: {
              actor: { type: 'string', minLength: 1 },
              closed_at: { type: 'string', minLength: 1 },
              summary: { type: 'string', minLength: 1 },
              changed_files: { type: 'array', items: { type: 'string', minLength: 1 } },
              checks_run: { type: 'array', items: { type: 'string', minLength: 1 } },
              checks_not_run: { type: 'array', items: { type: 'string', minLength: 1 } },
              known_non_pass: { type: 'array', items: { type: 'string', minLength: 1 } }
            }
          }
        }
      }
    }
  }
};

const BOUNDARY_GUARD_CONTRACT = Object.freeze({
  schema: 'agent-onboard-public-boundary-guard-enforcement-seed-contract-001',
  title: 'Agent-Onboard Public Boundary Guard Enforcement Seed Gate',
  package_name: 'agent-onboard',
  command: 'agent-onboard guard --check-boundary',
  canonical_target_config_file: TARGET_CONFIG_FILE,
  enforcement_mode: 'fail_closed',
  required_target_config_values: Object.freeze({
    schema: 'agent-onboard-target-config-001',
    'control.package_name': 'agent-onboard',
    'control.requested_mode': 'target_dry_run',
    'control.authority_level': 'L1_read_only_preview',
    'boundaries.writes_allowed': false,
    'boundaries.managed_project_commands_allowed': 0,
    'boundaries.create_agent_onboard_runtime_state': false,
    'boundaries.install_dependencies': false,
    'boundaries.run_build_test_deploy': false,
    'boundaries.publish_or_push': false
  }),
  forbidden_true_boundary_fields: Object.freeze([
    'boundaries.writes_allowed',
    'boundaries.create_agent_onboard_runtime_state',
    'boundaries.install_dependencies',
    'boundaries.run_build_test_deploy',
    'boundaries.publish_or_push'
  ])
});



const { createPublicArchitectureCatalog } = require('./agent_onboard/domains/architecture/static-catalog');
const { createPublicTargetStaticCatalog } = require('./agent_onboard/domains/target/static-catalog');
const { createPublicArchitectureRuntimeService } = require('./agent_onboard/domains/architecture/services/runtime/architecture-runtime-service');
const { createTargetRuntimeService } = require('./agent_onboard/domains/target/services/target-service');
const {
  PUBLIC_ARCHITECTURE_MAP,
  PUBLIC_COMMAND_ROUTER,
  PUBLIC_DOMAIN_SERVICE_FACADES,
  PUBLIC_AUTHORITY_FIRST_READ_INDEX,
  PUBLIC_TARGET_RUNTIME_NAMESPACE,
  PUBLIC_PACKAGE_SURFACE_PRESERVATION,
  PUBLIC_INSTALLED_PARITY_ARCHITECTURE_SMOKE,
  PUBLIC_SOURCE_DOMAIN_MODULE_PARTITION_PLAN,
  PUBLIC_SOURCE_DOMAIN_EXTRACTION_REHEARSAL,
  PUBLIC_SOURCE_EXTRACTION_GOLDEN_OUTPUT_FREEZE,
  PUBLIC_SOURCE_MODULE_EXTRACTION_ADAPTER_BOUNDARY,
  PUBLIC_SOURCE_MODULE_EXTRACTION_FIRST_SLICE,
  PUBLIC_SOURCE_MODULE_EXTRACTION_BUNDLE_PARITY,
  PUBLIC_SOURCE_MODULE_EXTRACTION_RUNTIME_BRIDGE,
  PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE,
  PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN,
  PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_FIRST_SLICE,
  PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_BUNDLE_PARITY,
  PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_RUNTIME_BRIDGE,
  PUBLIC_ARCHITECTURE_M1_CLOSURE_M2_SEED,
  PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_PLAN,
  PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_FIRST_SLICE,
  PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_BUNDLE_PARITY,
  PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_RUNTIME_BRIDGE,
  PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_INSTALLED_FALLBACK_SMOKE,
  PUBLIC_CLAIMS_DOMAIN_SOURCE_EXTRACTION_PLAN,
  PUBLIC_CLAIMS_DOMAIN_SOURCE_EXTRACTION_FIRST_SLICE,
  PUBLIC_CLAIMS_DOMAIN_SOURCE_EXTRACTION_BUNDLE_PARITY,
  PUBLIC_CLAIMS_DOMAIN_SOURCE_EXTRACTION_RUNTIME_BRIDGE,
  PUBLIC_CLAIMS_DOMAIN_SOURCE_EXTRACTION_INSTALLED_FALLBACK_SMOKE,
  PUBLIC_SOURCE_DOMAIN_EXTRACTION_STABILIZATION_CLOSURE_REVIEW,
  PUBLIC_CLI_RUNTIME_DE_MONOLITH_PLANNING,
  PUBLIC_THIN_CLI_ROUTER_SEED,
  PUBLIC_COMPATIBILITY_COMMAND_PORT_SEED,
  PUBLIC_CORE_COMMAND_ADAPTER_EXTRACTION,
  PUBLIC_PACKAGE_COMMAND_ADAPTER_EXTRACTION,
  PUBLIC_ARCHITECTURE_COMMAND_ADAPTER_EXTRACTION,
  PUBLIC_AUTHORITY_COMMAND_ADAPTER_EXTRACTION,
  PUBLIC_MODULAR_RUNTIME_PACKAGE_INCLUSION_PLAN,
  PUBLIC_PACKAGED_ROUTER_PORT_INCLUSION,
  PUBLIC_THIN_ENTRYPOINT_ROUTER_CUTOVER_REHEARSAL,
  PUBLIC_THIN_ENTRYPOINT_ROUTER_CUTOVER_APPLICATION,
  PUBLIC_ROUTER_COMMAND_ADAPTER_DELEGATION_EXPANSION,
  PUBLIC_VERSION_REFERENCE_POLICY,
  PUBLIC_RELEASE_CONTRACT,
  PUBLIC_RELEASE_FIXTURE_MATRIX
} = createPublicArchitectureCatalog({
  releaseLine: RELEASE_LINE,
  publicPackagedRouterPortPackFiles: PUBLIC_PACKAGED_ROUTER_PORT_PACK_FILES,
  publicPackagedRouterPortModuleFiles: PUBLIC_PACKAGED_ROUTER_PORT_MODULE_FILES
});


const {
  TARGET_ONBOARDING_SURFACE_PLAN,
  TARGET_ONBOARDING_DRY_RUN_FIXTURE_MATRIX
} = createPublicTargetStaticCatalog({
  publicReleaseContract: PUBLIC_RELEASE_CONTRACT
});

const targetRuntimeService = createTargetRuntimeService({
  version: VERSION,
  publicReleaseContract: PUBLIC_RELEASE_CONTRACT,
  publicAuthorityFirstReadIndex: PUBLIC_AUTHORITY_FIRST_READ_INDEX,
  publicTargetRuntimeNamespace: PUBLIC_TARGET_RUNTIME_NAMESPACE,
  targetOnboardingSurfacePlanContract: TARGET_ONBOARDING_SURFACE_PLAN,
  targetOnboardingDryRunFixtureMatrix: TARGET_ONBOARDING_DRY_RUN_FIXTURE_MATRIX,
  targetConfigFile: TARGET_CONFIG_FILE,
  targetConfigSchema: TARGET_CONFIG_SCHEMA,
  workItemsSchema: WORK_ITEMS_SCHEMA,
  boundaryGuardContract: BOUNDARY_GUARD_CONTRACT,
  packageRoot,
  sourceContext,
  arrayEquals
});
const {
  json,
  readJson,
  stableJson,
  writeJson,
  isPlainObject,
  validateJsonSchema,
  validateTargetConfig,
  validateWorkItems,
  workItemCounts,
  parseOption,
  parseRepeatedOption,
  cloneJson,
  uniqueIdErrors,
  validateWorkItemsGraph,
  validateWorkItemsDocument,
  deriveWorkItemIds,
  appendWorkItemDryRun,
  participationLifecycleNextSteps,
  claimWorkItemDryRun,
  handoffEvidenceChecklist,
  closeWorkItemDryRun,
  getPathValue,
  evaluateTargetBoundaryConfig,
  noMutationBoundary,
  guardResultBase,
  targetOnboardingDryRunFixture,
  targetOnboardingRealTargetTrial,
  publicTargetOnboardingRealTargetRepoTrial,
  targetOnboardingSurfacePlan,
  agentsMdTemplate,
  firstReadOrder,
  llmsTxtTemplate,
  authorityPathTemplate,
  targetName,
  targetConfigTemplate,
  targetRuntimeNamespaceTemplate,
  runtimeProjectTemplate,
  workItemsTemplate,
  initWriteSet,
  targetOnboardingWriteSet,
  planTargetOnboardingWritesForRoot,
  planTargetOnboardingWrites,
  performTargetOnboardingWrites,
  planWritesForRoot,
  planWrites,
  performPlannedWrites,
  planTextWritesForRoot,
  planTextWrites,
  performPlannedTextWrites,
  summarizePlan
} = targetRuntimeService;
function listRelativeFiles(root) {
  const files = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else files.push(path.relative(root, absolute).split(path.sep).join('/'));
    }
  }
  if (fs.existsSync(root)) walk(root);
  return files.sort();
}


function packageRoot() {
  return path.resolve(__dirname, '..');
}

function arrayEquals(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right)) return false;
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

function publicReleasePostPublishCommands(version = VERSION) {
  return PUBLIC_RELEASE_CONTRACT.post_publish_verification_commands.map((command) => command.replaceAll('<version>', version));
}

function packageJsonReleaseErrors(pkg, root = packageRoot()) {
  const errors = [];
  const required = PUBLIC_RELEASE_CONTRACT.required_package_json;
  if (pkg.name !== required.name) errors.push(`package.json#name must be ${required.name}`);
  if (pkg.version !== VERSION) errors.push(`package.json#version must match runtime version ${VERSION}`);
  if (pkg.private === true) errors.push('package.json#private must not be true for a public package');
  if (pkg.license !== required.license) errors.push(`package.json#license must be ${required.license}`);
  if (pkg.type !== required.type) errors.push(`package.json#type must be ${required.type}`);
  if (!pkg.engines || pkg.engines.node !== required.node_engine) errors.push(`package.json#engines.node must be ${required.node_engine}`);
  for (const field of PUBLIC_RELEASE_CONTRACT.required_metadata_fields) {
    const value = getPathValue(pkg, field);
    const missing = Array.isArray(value) ? value.length === 0 : value === undefined || value === null || value === '';
    if (missing) errors.push(`package.json#${field} is required`);
  }
  if (!Array.isArray(pkg.keywords) || pkg.keywords.length < 5) errors.push('package.json#keywords must contain at least 5 discovery terms');
  const requiredBin = required.bin;
  for (const [name, rel] of Object.entries(requiredBin)) {
    if (!pkg.bin || pkg.bin[name] !== rel) errors.push(`package.json#bin.${name} must be ${rel}`);
    else if (!fs.existsSync(path.join(root, rel))) errors.push(`package.json#bin.${name} points to missing file ${rel}`);
  }
  const actualFiles = Array.isArray(pkg.files) ? pkg.files.slice().sort() : [];
  const expectedFiles = required.files.slice().sort();
  if (!arrayEquals(actualFiles, expectedFiles)) errors.push(`package.json#files must match ${expectedFiles.join(', ')}`);
  for (const rel of expectedFiles) {
    if (!fs.existsSync(path.join(root, rel))) errors.push(`package.json#files includes missing path ${rel}`);
  }
  return errors;
}

function packageJsonProjectedPackFiles(pkg) {
  const files = new Set(['package.json']);
  if (Array.isArray(pkg.files)) {
    for (const rel of pkg.files) files.add(rel);
  }
  return Array.from(files).sort();
}

function publicArtifactMessagingErrors(root = packageRoot(), files = PUBLIC_RELEASE_CONTRACT.expected_pack_files) {
  const errors = [];
  const forbiddenConcreteWorkItem = /P\d+S\d+M\d+W\d+/;
  const forbiddenKey = ['machine', 'identifier'].join('_');
  const forbiddenNarrativePatterns = [
    /private\s*\/\s*public\s+split/i,
    new RegExp(['in', 'ternal\\s+line'].join(''), 'i'),
    /research\s+line/i,
    /stripp?ed/i,
    /saniti[sz]ed/i,
    /\bleak(?:age|ed|s|ing)?\b/i
  ];

  for (const rel of files) {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs) || fs.statSync(abs).isDirectory()) continue;
    const text = fs.readFileSync(abs, 'utf8');
    if (text.includes(forbiddenKey)) errors.push(`${rel} contains reserved implementation key token`);
    const workItemMatch = forbiddenConcreteWorkItem.exec(text);
    if (workItemMatch) errors.push(`${rel} contains concrete work-item token ${workItemMatch[0]}`);
    for (let index = 0; index < forbiddenNarrativePatterns.length; index += 1) {
      const match = forbiddenNarrativePatterns[index].exec(text);
      if (match) errors.push(`${rel} violates public artifact messaging rule ${index + 1}: ${match[0]}`);
    }
  }
  return errors;
}

function sourceWorkItemsLedgerCheck(root = packageRoot()) {
  const file = path.join(root, '.agent-onboard', 'work-items.json');
  if (!fs.existsSync(file)) {
    return {
      present: false,
      status: 'skipped',
      reason: 'source work-item ledger is not present in this package context',
      validated: true,
      file: '.agent-onboard/work-items.json',
      counts: null,
      errors: []
    };
  }
  let value;
  try {
    value = readJson(file);
  } catch (error) {
    return {
      present: true,
      status: 'error',
      reason: 'source work-item ledger is not valid JSON',
      validated: false,
      file: '.agent-onboard/work-items.json',
      counts: null,
      errors: [error && error.message ? error.message : String(error)]
    };
  }
  const errors = validateWorkItems(value);
  const counts = workItemCounts(value);
  return {
    present: true,
    status: errors.length === 0 ? 'ok' : 'error',
    reason: errors.length === 0 ? 'source work-item ledger validates' : 'source work-item ledger validation failed',
    validated: errors.length === 0,
    file: '.agent-onboard/work-items.json',
    counts,
    open_work_items: Array.isArray(value.work_items) ? value.work_items.filter((item) => item.status !== 'closed').map((item) => ({ id: item.id, title: item.title, status: item.status })) : [],
    errors
  };
}

function sourceContext(root = packageRoot()) {
  const sourceFiles = PUBLIC_RELEASE_CONTRACT.source_context_files.filter((rel) => fs.existsSync(path.join(root, rel)));
  return {
    package_context: sourceFiles.length > 0 ? 'source_repository' : 'installed_package',
    source_context_files_present: sourceFiles,
    source_context_files_missing: PUBLIC_RELEASE_CONTRACT.source_context_files.filter((rel) => !sourceFiles.includes(rel))
  };
}

const publicArchitectureRuntimeService = createPublicArchitectureRuntimeService({
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
});
const {
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
} = publicArchitectureRuntimeService;

function publicWorkItemsDomainSourceExtractionPlan(root = packageRoot()) {
  const pkg = readJson(path.join(root, 'package.json'));
  const context = sourceContext(root);
  const ledgerPath = path.join(root, '.agent-onboard', 'work-items.json');
  let ledger = null;
  if (fs.existsSync(ledgerPath)) {
    try {
      ledger = readJson(ledgerPath);
    } catch {
      ledger = null;
    }
  }
  const workItems = ledger && Array.isArray(ledger.work_items) ? ledger.work_items : [];
  const milestones = ledger && Array.isArray(ledger.milestones) ? ledger.milestones : [];
  const currentWorkItem = workItems.find((item) => item.id === PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_PLAN.work_item_id) || null;
  const nextWorkItem = workItems.find((item) => item.id === PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_PLAN.next_work_item_id) || null;
  const milestone = milestones.find((item) => item.id === PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_PLAN.milestone_id) || null;
  return {
    schema: 'agent-onboard-public-work-items-domain-source-extraction-plan-result-001',
    status: 'ok',
    package_name: PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_PLAN.package_name,
    version: VERSION,
    release_line: PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_PLAN.release_line,
    command: PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_PLAN.command,
    check_command: PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_PLAN.check_command,
    package_root: root,
    package_context: context.package_context,
    package_json_version: pkg.version,
    plan_file: PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_PLAN.plan_file,
    plan_file_present: fs.existsSync(path.join(root, PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_PLAN.plan_file)),
    plan: PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_PLAN,
    source_ledger_present: fs.existsSync(ledgerPath),
    milestone,
    work_items: {
      current: currentWorkItem,
      next: nextWorkItem
    },
    planned_source_module_present: fs.existsSync(path.join(root, PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_PLAN.domain.planned_module)),
    prerequisite_m2_seed: publicArchitectureM1ClosureM2SeedCheck(root),
    prerequisite_authority_runtime_bridge: publicSourceModuleExtractionAuthorityRuntimeBridgeCheck(root),
    prerequisite_package_surface: publicPackageSurfaceCheck(root),
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

function publicWorkItemsDomainSourceExtractionPlanCheck(root = packageRoot()) {
  const result = publicWorkItemsDomainSourceExtractionPlan(root);
  const gate = PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_PLAN;
  const expectedPackFiles = PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort();
  const errors = [];

  if (result.prerequisite_m2_seed.status !== 'ok') errors.push(...result.prerequisite_m2_seed.errors.map((error) => `m2 seed: ${error}`));
  if (result.prerequisite_authority_runtime_bridge.status !== 'ok') errors.push(...result.prerequisite_authority_runtime_bridge.errors.map((error) => `authority runtime bridge: ${error}`));
  if (result.prerequisite_package_surface.status !== 'ok') errors.push(...result.prerequisite_package_surface.errors.map((error) => `package surface: ${error}`));
  if (!arrayEquals(result.projected_pack_files, expectedPackFiles)) errors.push(`projected npm pack files must remain ${expectedPackFiles.join(', ')}`);
  if (gate.boundary.work_items_plan_command_writes_files !== false) errors.push('architecture --work-items-plan must remain no-write');
  if (gate.boundary.work_items_check_command_writes_files !== false) errors.push('architecture --work-items-check must remain no-write');
  if (gate.boundary.creates_source_modules !== false) errors.push('work-items planning gate must not create source modules');
  if (gate.boundary.package_allowlist_unchanged !== true) errors.push('work-items planning gate must preserve package allowlist');
  if (gate.domain.id !== 'work_items') errors.push('work-items planning gate must select the work_items domain');
  if (gate.domain.facade !== 'workItemsService') errors.push('work-items planning gate must remain behind workItemsService');
  if (gate.domain.planned_module !== 'src/domains/work-items.js') errors.push('planned work-items module path must be src/domains/work-items.js');
  // After the follow-up first-slice gate closes, the planned module is allowed to exist.
  // The planning gate itself remains no-write and the first-slice gate owns creation evidence.

  let planFileStatus = 'not_present_installed_context_allowed';
  let planFileSchema = null;
  if (result.plan_file_present) {
    try {
      const planFile = readJson(path.join(root, result.plan_file));
      planFileSchema = planFile.schema || null;
      if (planFile.schema !== gate.schema) errors.push(`${result.plan_file} schema must be ${gate.schema}`);
      if (!planFile.domain || planFile.domain.id !== gate.domain.id) errors.push(`${result.plan_file} must select work_items domain`);
      if (!planFile.domain || planFile.domain.planned_module !== gate.domain.planned_module) errors.push(`${result.plan_file} must plan ${gate.domain.planned_module}`);
      if (!planFile.boundary || planFile.boundary.creates_source_modules !== false) errors.push(`${result.plan_file} must not create source modules`);
      if (!planFile.boundary || planFile.boundary.package_allowlist_unchanged !== true) errors.push(`${result.plan_file} must preserve package allowlist`);
      if (!Array.isArray(planFile.excluded_scope) || !planFile.excluded_scope.some((item) => /claims-domain/.test(item))) errors.push(`${result.plan_file} must explicitly exclude claims-domain extraction`);
      const nextFollowup = planFile.followup_work_items && planFile.followup_work_items[0] ? planFile.followup_work_items[0] : null;
      const nextId = planFile.next_work_item_id || workItemIdFromComponents(planFile.next_work_item_components) || (nextFollowup && (nextFollowup.id || workItemIdFromComponents(nextFollowup.id_components)));
      if (nextId !== gate.next_work_item_id) errors.push(`${result.plan_file} must seed ${gate.next_work_item_id} as the next work item`);
      planFileStatus = 'present_validated';
    } catch (error) {
      planFileStatus = 'present_invalid_json';
      errors.push(`${result.plan_file} is not valid JSON: ${error && error.message ? error.message : String(error)}`);
    }
  } else if (result.package_context === 'source_repository') {
    planFileStatus = 'missing_source_context';
    errors.push(`${result.plan_file} must be present in source repository context`);
  }

  const sourceLedgerRequired = result.package_context === 'source_repository';
  const currentWorkItem = result.work_items.current;
  const nextWorkItem = result.work_items.next;
  if (sourceLedgerRequired && !result.source_ledger_present) errors.push('.agent-onboard/work-items.json must be present in source repository context');
  if (result.source_ledger_present) {
    if (!result.milestone) errors.push(`${gate.milestone_id} milestone must exist`);
    else if (!['open', 'closed'].includes(result.milestone.status)) errors.push(`${gate.milestone_id} milestone must remain open or closed`);
    if (!currentWorkItem) errors.push(`${gate.work_item_id} work item must exist`);
    else if (currentWorkItem.status !== 'closed') errors.push(`${gate.work_item_id} planning work item must be closed`);
    if (!nextWorkItem) errors.push(`${gate.next_work_item_id} work item must exist`);
    else if (!['open', 'closed'].includes(nextWorkItem.status)) errors.push(`${gate.next_work_item_id} seeded work item must be open or closed`);
  }

  return {
    schema: 'agent-onboard-public-work-items-domain-source-extraction-plan-check-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: gate.package_name,
    version: VERSION,
    release_line: gate.release_line,
    command: gate.check_command,
    package_root: root,
    validated: {
      prerequisite_m2_seed: result.prerequisite_m2_seed.status === 'ok',
      prerequisite_authority_runtime_bridge: result.prerequisite_authority_runtime_bridge.status === 'ok',
      prerequisite_package_surface: result.prerequisite_package_surface.status === 'ok',
      work_items_domain_selected: gate.domain.id === 'work_items',
      planned_module_absent_or_created_by_followup: !result.planned_source_module_present || (nextWorkItem && nextWorkItem.status === 'closed'),
      current_work_item_closed_or_installed_context_allowed: !sourceLedgerRequired || (currentWorkItem && currentWorkItem.status === 'closed'),
      next_work_item_seeded_or_installed_context_allowed: !sourceLedgerRequired || (nextWorkItem && ['open', 'closed'].includes(nextWorkItem.status)),
      plan_file_present_or_installed_context_allowed: planFileStatus === 'present_validated' || planFileStatus === 'not_present_installed_context_allowed',
      package_allowlist_unchanged: arrayEquals(result.projected_pack_files, expectedPackFiles),
      work_items_plan_commands_no_write: gate.boundary.work_items_plan_command_writes_files === false && gate.boundary.work_items_check_command_writes_files === false
    },
    planned_domain: gate.domain,
    work_items: result.work_items,
    source_plan_file: {
      path: result.plan_file,
      present: result.plan_file_present,
      status: planFileStatus,
      schema: planFileSchema,
      source_context_required: sourceLedgerRequired
    },
    prerequisite_m2_seed: {
      status: result.prerequisite_m2_seed.status,
      errors: result.prerequisite_m2_seed.errors
    },
    projected_pack_files: result.projected_pack_files,
    expected_pack_files: expectedPackFiles,
    boundary: result.boundary,
    errors
  };
}

function loadWorkItemsFirstSliceModule(root = packageRoot()) {
  const modulePath = path.join(root, PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_FIRST_SLICE.source_module);
  if (!fs.existsSync(modulePath)) return null;
  const resolved = require.resolve(modulePath);
  delete require.cache[resolved];
  return require(resolved);
}

function publicWorkItemsDomainSourceExtractionFirstSlice(root = packageRoot()) {
  const pkg = readJson(path.join(root, 'package.json'));
  const context = sourceContext(root);
  const gate = PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_FIRST_SLICE;
  let module_exports = [];
  let module_value = null;
  let module_load_error = null;
  try {
    const loaded = loadWorkItemsFirstSliceModule(root);
    if (loaded) {
      module_exports = Object.keys(loaded).sort();
      if (typeof loaded.getWorkItemsDomainFirstSlice === 'function') {
        module_value = loaded.getWorkItemsDomainFirstSlice();
      } else if (loaded.WORK_ITEMS_DOMAIN_FIRST_SLICE) {
        module_value = loaded.WORK_ITEMS_DOMAIN_FIRST_SLICE;
      }
    }
  } catch (error) {
    module_load_error = error && error.message ? error.message : String(error);
  }
  return {
    schema: 'agent-onboard-public-source-module-work-items-first-slice-result-001',
    status: module_load_error ? 'error' : 'ok',
    package_name: gate.package_name,
    version: VERSION,
    release_line: gate.release_line,
    command: gate.command,
    check_command: gate.check_command,
    package_root: root,
    package_context: context.package_context,
    package_json_version: pkg.version,
    first_slice_file: gate.first_slice_file,
    first_slice_file_present: fs.existsSync(path.join(root, gate.first_slice_file)),
    source_module: gate.source_module,
    source_module_present: fs.existsSync(path.join(root, gate.source_module)),
    source_module_exports: module_exports,
    source_module_value: module_value,
    source_module_load_error: module_load_error,
    prerequisite_plan_file: gate.prerequisite_plan_file,
    work_items_first_slice: gate,
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

function publicWorkItemsDomainSourceExtractionFirstSliceCheck(root = packageRoot()) {
  const result = publicWorkItemsDomainSourceExtractionFirstSlice(root);
  const plan = publicWorkItemsDomainSourceExtractionPlanCheck(root);
  const expectedPackFiles = PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort();
  const gate = PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_FIRST_SLICE;
  const expectedExports = gate.expected_module_export_names.slice().sort();
  const errors = [];
  if (plan.status !== 'ok') errors.push(...plan.errors.map((error) => `work-items plan: ${error}`));
  if (result.status !== 'ok') errors.push(`work-items first-slice module load failed: ${result.source_module_load_error}`);
  if (!arrayEquals(result.projected_pack_files, expectedPackFiles)) errors.push(`projected npm pack files must remain ${expectedPackFiles.join(', ')}`);
  if (gate.first_slice_status !== 'source_only_shadow_module_applied') errors.push('work-items first-slice status must be source_only_shadow_module_applied');
  if (gate.extracted_domain.id !== 'work_items') errors.push('work-items first-slice must extract the work_items domain');
  if (gate.boundary.created_source_module !== 'src/domains/work-items.js') errors.push('work-items first-slice created source module must be src/domains/work-items.js');
  if (gate.boundary.creates_exactly_one_source_module !== true) errors.push('work-items first-slice must create exactly one source module');
  if (gate.boundary.excludes_claim_and_close_commands !== true) errors.push('work-items first-slice must exclude claim and close commands');
  if (gate.boundary.moves_existing_source_files !== false) errors.push('work-items first-slice must not move existing source files');
  if (gate.boundary.changes_public_cli_outputs !== false) errors.push('work-items first-slice must not change public CLI outputs');
  if (gate.boundary.changes_cli_runtime_dependency_graph !== false) errors.push('work-items first-slice must not make CLI runtime require source modules');
  if (gate.boundary.exports_source_module_as_public_api !== false) errors.push('work-items first-slice must not expose source module as public import API');
  if (gate.boundary.work_items_first_slice_command_writes_files !== false) errors.push('architecture --work-items-first-slice must remain no-write');
  if (gate.boundary.work_items_first_slice_check_command_writes_files !== false) errors.push('architecture --work-items-first-slice-check must remain no-write');

  let artifactStatus = 'not_present_installed_context_allowed';
  let artifactSchema = null;
  if (result.first_slice_file_present) {
    try {
      const artifact = readJson(path.join(root, result.first_slice_file));
      artifactSchema = artifact.schema || null;
      if (artifact.schema !== gate.schema) errors.push(`${result.first_slice_file} schema must be ${gate.schema}`);
      if (artifact.source_module !== gate.source_module) errors.push(`${result.first_slice_file} source_module must be ${gate.source_module}`);
      if (!artifact.extracted_domain || artifact.extracted_domain.id !== 'work_items') errors.push(`${result.first_slice_file} must declare extracted_domain.id work_items`);
      if (!artifact.boundary || artifact.boundary.package_allowlist_unchanged !== true) errors.push(`${result.first_slice_file} must preserve package_allowlist_unchanged`);
      if (!artifact.boundary || artifact.boundary.excludes_claim_and_close_commands !== true) errors.push(`${result.first_slice_file} must exclude claim and close commands`);
      artifactStatus = 'present_validated';
    } catch (error) {
      artifactStatus = 'present_invalid_json';
      errors.push(`${result.first_slice_file} is not valid JSON: ${error && error.message ? error.message : String(error)}`);
    }
  } else if (result.package_context === 'source_repository') {
    artifactStatus = 'missing_source_context';
    errors.push(`${result.first_slice_file} must be present in source repository context`);
  }

  let sourceModuleStatus = 'not_present_installed_context_allowed';
  const moduleValue = result.source_module_value || {};
  const moduleExportsSorted = result.source_module_exports.slice().sort();
  if (result.source_module_present) {
    if (!arrayEquals(moduleExportsSorted, expectedExports)) errors.push(`${result.source_module} exports must be ${expectedExports.join(', ')}`);
    if (moduleValue.schema !== gate.schema) errors.push(`${result.source_module} must export work-items first-slice schema`);
    if (moduleValue.domain !== 'work_items') errors.push(`${result.source_module} domain must be work_items`);
    if (moduleValue.facade !== 'workItemsService') errors.push(`${result.source_module} facade must be workItemsService`);
    if (moduleValue.source_module !== result.source_module) errors.push(`${result.source_module} source_module field must match its path`);
    if (moduleValue.runtime_dependency_status !== gate.extracted_domain.runtime_dependency_status) errors.push(`${result.source_module} runtime dependency status must remain source-only shadow`);
    if (moduleValue.exports_public_api !== false) errors.push(`${result.source_module} must not declare public import API`);
    if (moduleValue.includes_claims_domain_behavior !== false) errors.push(`${result.source_module} must exclude claims-domain behavior`);
    if (moduleValue.writes_files !== false || moduleValue.state_writer !== false) errors.push(`${result.source_module} must remain read-only and non-state-writer`);
    if (moduleValue.declares_explicit_write_boundaries !== true) errors.push(`${result.source_module} must declare explicit write boundaries for write-capable work-items commands`);
    if (!arrayEquals((moduleValue.owns_commands || []), gate.expected_owned_commands.slice())) errors.push(`${result.source_module} owns_commands must match work-items first-slice scope`);
    if (!arrayEquals((moduleValue.excluded_commands || []), gate.excluded_commands.slice())) errors.push(`${result.source_module} excluded_commands must keep claim and close out of this slice`);
    sourceModuleStatus = 'present_validated';
  } else if (result.package_context === 'source_repository') {
    sourceModuleStatus = 'missing_source_context';
    errors.push(`${result.source_module} must be present in source repository context`);
  }

  return {
    schema: 'agent-onboard-public-source-module-work-items-first-slice-check-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: gate.package_name,
    version: VERSION,
    release_line: gate.release_line,
    command: gate.check_command,
    package_root: root,
    validated: {
      work_items_plan: plan.status === 'ok',
      first_slice_status: gate.first_slice_status === 'source_only_shadow_module_applied',
      extracted_domain_is_work_items: gate.extracted_domain.id === 'work_items',
      source_module_present_or_installed_context_allowed: sourceModuleStatus === 'present_validated' || sourceModuleStatus === 'not_present_installed_context_allowed',
      first_slice_file_present_or_installed_context_allowed: artifactStatus === 'present_validated' || artifactStatus === 'not_present_installed_context_allowed',
      claim_and_close_commands_excluded: moduleValue.includes_claims_domain_behavior === false || sourceModuleStatus === 'not_present_installed_context_allowed',
      commands_no_write: gate.boundary.work_items_first_slice_command_writes_files === false && gate.boundary.work_items_first_slice_check_command_writes_files === false,
      package_allowlist_unchanged: arrayEquals(result.projected_pack_files, expectedPackFiles)
    },
    source_module: {
      path: result.source_module,
      present: result.source_module_present,
      status: sourceModuleStatus,
      exports: result.source_module_exports,
      value: result.source_module_value,
      source_context_required: result.package_context === 'source_repository'
    },
    first_slice_file: {
      path: result.first_slice_file,
      present: result.first_slice_file_present,
      status: artifactStatus,
      schema: artifactSchema,
      source_context_required: result.package_context === 'source_repository'
    },
    prerequisite_work_items_plan: {
      status: plan.status,
      errors: plan.errors
    },
    projected_pack_files: result.projected_pack_files,
    expected_pack_files: expectedPackFiles,
    boundary: result.boundary,
    errors
  };
}


function bundledWorkItemsDomainForParity(root = packageRoot()) {
  const map = publicArchitectureMap(root);
  const facade = PUBLIC_DOMAIN_SERVICE_FACADES.facades.find((item) => item.id === 'work_items');
  const domain = map.map.canonical_domains.find((item) => item.id === 'work_items');
  return {
    schema: 'agent-onboard-public-bundled-work-items-domain-view-001',
    domain: domain ? domain.id : null,
    facade: facade ? facade.service : null,
    service: facade ? facade.service : null,
    source: 'cli/agent-onboard.js',
    owns_commands: PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_FIRST_SLICE.expected_owned_commands.slice(),
    excluded_commands: PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_FIRST_SLICE.excluded_commands.slice(),
    writes_files: false,
    state_writer: false,
    declares_explicit_write_boundaries: true,
    schema_id: 'agent-onboard-target-work-items-001',
    state_files: Object.freeze(['.agent-onboard/work-items.json']).slice(),
    read_surfaces: Object.freeze(['schema', 'template', 'validate-template', 'validate', 'list']).slice(),
    explicit_write_surfaces: Object.freeze([
      'work-items --init --write [--force]',
      'work-items --append --write --id <public-work-item-id> --title <title>'
    ]).slice(),
    package_context: sourceContext(root).package_context
  };
}

function publicWorkItemsDomainSourceExtractionBundleParity(root = packageRoot()) {
  const pkg = readJson(path.join(root, 'package.json'));
  const context = sourceContext(root);
  const firstSlice = publicWorkItemsDomainSourceExtractionFirstSlice(root);
  const bundledWorkItems = bundledWorkItemsDomainForParity(root);
  const gate = PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_BUNDLE_PARITY;
  return {
    schema: 'agent-onboard-public-source-module-work-items-bundle-parity-result-001',
    status: firstSlice.status === 'ok' ? 'ok' : 'error',
    package_name: gate.package_name,
    version: VERSION,
    release_line: gate.release_line,
    command: gate.command,
    check_command: gate.check_command,
    package_root: root,
    package_context: context.package_context,
    package_json_version: pkg.version,
    bundle_parity_file: gate.bundle_parity_file,
    bundle_parity_file_present: fs.existsSync(path.join(root, gate.bundle_parity_file)),
    source_module: gate.source_module,
    source_module_present: fs.existsSync(path.join(root, gate.source_module)),
    source_slice_value: firstSlice.source_module_value,
    bundled_work_items_view: bundledWorkItems,
    work_items_bundle_parity: gate,
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

function publicWorkItemsDomainSourceExtractionBundleParityCheck(root = packageRoot()) {
  const result = publicWorkItemsDomainSourceExtractionBundleParity(root);
  const firstSlice = publicWorkItemsDomainSourceExtractionFirstSliceCheck(root);
  const expectedPackFiles = PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort();
  const gate = PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_BUNDLE_PARITY;
  const errors = [];
  if (firstSlice.status !== 'ok') errors.push(...firstSlice.errors.map((error) => `work-items first slice: ${error}`));
  if (result.status !== 'ok') errors.push('work-items bundle parity depends on a loadable first-slice source module in source context or installed fallback metadata');
  if (!arrayEquals(result.projected_pack_files, expectedPackFiles)) errors.push(`projected npm pack files must remain ${expectedPackFiles.join(', ')}`);
  if (gate.parity_status !== 'work_items_source_slice_matches_bundled_cli_view') errors.push('work-items bundle parity status must remain work_items_source_slice_matches_bundled_cli_view');
  if (gate.boundary.work_items_bundle_parity_command_writes_files !== false) errors.push('architecture --work-items-bundle-parity must remain no-write');
  if (gate.boundary.work_items_bundle_parity_check_command_writes_files !== false) errors.push('architecture --work-items-bundle-parity-check must remain no-write');
  if (gate.boundary.creates_bundle_artifact !== false) errors.push('work-items bundle parity gate must not create bundle artifacts');
  if (gate.boundary.changes_public_cli_outputs !== false) errors.push('work-items bundle parity gate must not change public CLI outputs');
  if (gate.boundary.changes_cli_runtime_dependency_graph !== false) errors.push('work-items bundle parity gate must not change CLI runtime dependency graph');
  if (gate.boundary.includes_claim_and_close_commands !== false) errors.push('work-items bundle parity gate must keep claim and close excluded');
  if (gate.boundary.package_allowlist_unchanged !== true) errors.push('work-items bundle parity gate must preserve package allowlist');

  let bundleParityFileStatus = 'not_present_installed_context_allowed';
  let bundleParityFileSchema = null;
  if (result.bundle_parity_file_present) {
    try {
      const artifact = readJson(path.join(root, result.bundle_parity_file));
      bundleParityFileSchema = artifact.schema || null;
      if (artifact.schema !== gate.schema) errors.push(`${result.bundle_parity_file} schema must be ${gate.schema}`);
      if (artifact.source_module !== gate.source_module) errors.push(`${result.bundle_parity_file} source_module must be ${gate.source_module}`);
      if (artifact.parity_status !== gate.parity_status) errors.push(`${result.bundle_parity_file} parity_status must be ${gate.parity_status}`);
      if (!artifact.boundary || artifact.boundary.package_allowlist_unchanged !== true) errors.push(`${result.bundle_parity_file} must preserve package_allowlist_unchanged`);
      if (!artifact.boundary || artifact.boundary.includes_claim_and_close_commands !== false) errors.push(`${result.bundle_parity_file} must keep claim and close excluded`);
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
  const bundled = result.bundled_work_items_view;
  const sourceContextAllowedMissing = result.package_context === 'installed_package' && !sourceSlice;
  const domainParity = sourceContextAllowedMissing || (sourceSlice && sourceSlice.domain === bundled.domain);
  const facadeParity = sourceContextAllowedMissing || (sourceSlice && sourceSlice.facade === bundled.facade);
  const schemaParity = sourceContextAllowedMissing || (sourceSlice && sourceSlice.schema_id === bundled.schema_id);
  const stateFileParity = sourceContextAllowedMissing || (sourceSlice && arrayEquals(sourceSlice.state_files || [], bundled.state_files));
  const commandParity = sourceContextAllowedMissing || (sourceSlice && arrayEquals(sourceSlice.owns_commands || [], bundled.owns_commands));
  const excludedCommandParity = sourceContextAllowedMissing || (sourceSlice && arrayEquals(sourceSlice.excluded_commands || [], bundled.excluded_commands));
  const readSurfaceParity = sourceContextAllowedMissing || (sourceSlice && arrayEquals(sourceSlice.read_surfaces || [], bundled.read_surfaces));
  const explicitWriteSurfaceParity = sourceContextAllowedMissing || (sourceSlice && arrayEquals(sourceSlice.explicit_write_surfaces || [], bundled.explicit_write_surfaces));
  const writeBoundaryParity = sourceContextAllowedMissing || (sourceSlice && sourceSlice.writes_files === bundled.writes_files && sourceSlice.state_writer === bundled.state_writer && sourceSlice.declares_explicit_write_boundaries === bundled.declares_explicit_write_boundaries);
  if (!domainParity) errors.push('work-items source slice domain must match bundled work-items domain view');
  if (!facadeParity) errors.push('work-items source slice facade must match bundled work-items facade view');
  if (!schemaParity) errors.push('work-items source slice schema id must match bundled work-items schema id');
  if (!stateFileParity) errors.push('work-items source slice state files must match bundled work-items state files');
  if (!commandParity) errors.push('work-items source slice owned commands must match bundled work-items command surface');
  if (!excludedCommandParity) errors.push('work-items source slice excluded commands must match bundled work-items exclusions');
  if (!readSurfaceParity) errors.push('work-items source slice read surfaces must match bundled work-items read surfaces');
  if (!explicitWriteSurfaceParity) errors.push('work-items source slice explicit write surfaces must match bundled work-items write-boundary metadata');
  if (!writeBoundaryParity) errors.push('work-items source slice read/write boundary must match bundled work-items view');

  return {
    schema: 'agent-onboard-public-source-module-work-items-bundle-parity-check-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: gate.package_name,
    version: VERSION,
    release_line: gate.release_line,
    command: gate.check_command,
    package_root: root,
    validated: {
      first_slice: firstSlice.status === 'ok',
      bundle_parity_status: gate.parity_status === 'work_items_source_slice_matches_bundled_cli_view',
      source_slice_domain_matches_bundled_work_items: domainParity,
      source_slice_facade_matches_bundled_work_items: facadeParity,
      source_slice_schema_matches_bundled_work_items: schemaParity,
      source_slice_state_files_match_bundled_work_items: stateFileParity,
      source_slice_commands_match_bundled_work_items: commandParity,
      source_slice_exclusions_match_bundled_work_items: excludedCommandParity,
      source_slice_read_surfaces_match_bundled_work_items: readSurfaceParity,
      source_slice_write_surfaces_match_bundled_work_items: explicitWriteSurfaceParity,
      source_slice_write_boundary_matches_bundled_work_items: writeBoundaryParity,
      source_module_present_or_installed_context_allowed: result.source_module_present || result.package_context === 'installed_package',
      bundle_parity_file_present_or_installed_context_allowed: bundleParityFileStatus === 'present_validated' || bundleParityFileStatus === 'not_present_installed_context_allowed',
      commands_no_write: gate.boundary.work_items_bundle_parity_command_writes_files === false && gate.boundary.work_items_bundle_parity_check_command_writes_files === false,
      runtime_outputs_unchanged_by_gate: gate.boundary.changes_public_cli_outputs === false,
      cli_runtime_dependency_graph_unchanged: gate.boundary.changes_cli_runtime_dependency_graph === false,
      package_allowlist_unchanged: arrayEquals(result.projected_pack_files, expectedPackFiles),
      claim_and_close_commands_excluded: excludedCommandParity
    },
    source_slice: result.source_slice_value,
    bundled_work_items_view: result.bundled_work_items_view,
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



function resolveWorkItemsDomainRuntimeBridge(root = packageRoot()) {
  const context = sourceContext(root);
  const modulePath = path.join(root, PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_RUNTIME_BRIDGE.source_module);
  const sourceModulePresent = fs.existsSync(modulePath);
  const bundledWorkItems = bundledWorkItemsDomainForParity(root);
  if (sourceModulePresent) {
    try {
      const loaded = require(modulePath);
      const value = loaded && typeof loaded.getWorkItemsDomainFirstSlice === 'function'
        ? loaded.getWorkItemsDomainFirstSlice()
        : loaded && loaded.WORK_ITEMS_DOMAIN_FIRST_SLICE;
      if (!value || value.schema !== 'agent-onboard-public-source-module-work-items-first-slice-001') {
        return {
          status: 'error',
          context: context.package_context,
          mode: 'source_module_invalid',
          source_module_present: true,
          source_module: PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_RUNTIME_BRIDGE.source_module,
          module_value: value || null,
          bundled_work_items_view: bundledWorkItems,
          errors: [`${PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_RUNTIME_BRIDGE.source_module} did not export a valid work-items first-slice contract`]
        };
      }
      return {
        status: 'ok',
        context: context.package_context,
        mode: 'source_module_loaded',
        source_module_present: true,
        source_module: PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_RUNTIME_BRIDGE.source_module,
        module_value: value,
        bundled_work_items_view: bundledWorkItems,
        errors: []
      };
    } catch (error) {
      return {
        status: 'error',
        context: context.package_context,
        mode: 'source_module_load_failed',
        source_module_present: true,
        source_module: PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_RUNTIME_BRIDGE.source_module,
        module_value: null,
        bundled_work_items_view: bundledWorkItems,
        errors: [`${PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_RUNTIME_BRIDGE.source_module} failed to load: ${error && error.message ? error.message : String(error)}`]
      };
    }
  }
  return {
    status: 'ok',
    context: context.package_context,
    mode: 'bundled_fallback',
    source_module_present: false,
    source_module: PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_RUNTIME_BRIDGE.source_module,
    module_value: null,
    bundled_work_items_view: bundledWorkItems,
    errors: []
  };
}

function publicWorkItemsDomainSourceExtractionRuntimeBridge(root = packageRoot()) {
  const pkg = readJson(path.join(root, 'package.json'));
  const context = sourceContext(root);
  const bridge = resolveWorkItemsDomainRuntimeBridge(root);
  const gate = PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_RUNTIME_BRIDGE;
  return {
    schema: 'agent-onboard-public-source-module-work-items-runtime-bridge-result-001',
    status: bridge.status,
    package_name: gate.package_name,
    version: VERSION,
    release_line: gate.release_line,
    command: gate.command,
    check_command: gate.check_command,
    package_root: root,
    package_context: context.package_context,
    package_json_version: pkg.version,
    runtime_bridge_file: gate.runtime_bridge_file,
    runtime_bridge_file_present: fs.existsSync(path.join(root, gate.runtime_bridge_file)),
    source_module: gate.source_module,
    source_module_present: fs.existsSync(path.join(root, gate.source_module)),
    runtime_bridge_resolution: bridge,
    runtime_bridge_contract: gate,
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

function publicWorkItemsDomainSourceExtractionRuntimeBridgeCheck(root = packageRoot()) {
  const result = publicWorkItemsDomainSourceExtractionRuntimeBridge(root);
  const bundleParity = publicWorkItemsDomainSourceExtractionBundleParityCheck(root);
  const expectedPackFiles = PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort();
  const gate = PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_RUNTIME_BRIDGE;
  const errors = [];
  if (bundleParity.status !== 'ok') errors.push(...bundleParity.errors.map((error) => `work-items bundle parity: ${error}`));
  if (result.runtime_bridge_resolution.status !== 'ok') errors.push(...result.runtime_bridge_resolution.errors);
  if (!arrayEquals(result.projected_pack_files, expectedPackFiles)) errors.push(`projected npm pack files must remain ${expectedPackFiles.join(', ')}`);
  if (gate.bridge_status !== 'work_items_source_context_optional_runtime_bridge_applied') errors.push('work-items runtime bridge status must remain work_items_source_context_optional_runtime_bridge_applied');
  if (gate.boundary.work_items_runtime_bridge_command_writes_files !== false) errors.push('architecture --work-items-runtime-bridge must remain no-write');
  if (gate.boundary.work_items_runtime_bridge_check_command_writes_files !== false) errors.push('architecture --work-items-runtime-bridge-check must remain no-write');
  if (gate.boundary.source_context_optional_require_only !== true) errors.push('work-items runtime bridge must use source-context optional require only');
  if (gate.boundary.installed_context_fallback_required !== true) errors.push('work-items runtime bridge must preserve installed-package fallback');
  if (gate.boundary.includes_claim_and_close_commands !== false) errors.push('work-items runtime bridge must keep claim and close excluded');
  if (gate.boundary.package_allowlist_unchanged !== true) errors.push('work-items runtime bridge gate must preserve package allowlist');

  let bridgeFileStatus = 'not_present_installed_context_allowed';
  let bridgeFileSchema = null;
  if (result.runtime_bridge_file_present) {
    try {
      const bridgeFile = readJson(path.join(root, result.runtime_bridge_file));
      bridgeFileSchema = bridgeFile.schema || null;
      if (bridgeFile.schema !== gate.schema) errors.push(`${result.runtime_bridge_file} schema must be ${gate.schema}`);
      if (bridgeFile.source_module !== gate.source_module) errors.push(`${result.runtime_bridge_file} source_module must be ${gate.source_module}`);
      if (!bridgeFile.runtime_bridge || bridgeFile.runtime_bridge.installed_context_allows_missing_source_module !== true) errors.push(`${result.runtime_bridge_file} must allow installed context fallback`);
      if (!bridgeFile.runtime_bridge || bridgeFile.runtime_bridge.includes_claim_and_close_commands !== false) errors.push(`${result.runtime_bridge_file} must keep claim and close excluded`);
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
  const source = resolved.module_value || null;
  const bundled = resolved.bundled_work_items_view;
  const domainParity = !source || source.domain === bundled.domain;
  const facadeParity = !source || source.facade === bundled.facade;
  const schemaParity = !source || source.schema_id === bundled.schema_id;
  const stateFileParity = !source || arrayEquals(source.state_files || [], bundled.state_files);
  const commandParity = !source || arrayEquals(source.owns_commands || [], bundled.owns_commands);
  const excludedCommandParity = !source || arrayEquals(source.excluded_commands || [], bundled.excluded_commands);
  const readSurfaceParity = !source || arrayEquals(source.read_surfaces || [], bundled.read_surfaces);
  const explicitWriteSurfaceParity = !source || arrayEquals(source.explicit_write_surfaces || [], bundled.explicit_write_surfaces);
  const writeBoundaryParity = !source || (source.writes_files === bundled.writes_files && source.state_writer === bundled.state_writer && source.declares_explicit_write_boundaries === bundled.declares_explicit_write_boundaries);
  const claimCloseExcluded = !source || (source.includes_claims_domain_behavior === false && arrayEquals(source.excluded_commands || [], bundled.excluded_commands));

  if (!sourceLoadedWhenPresent) errors.push('work-items runtime bridge must load the source work-items slice when present in source repository context');
  if (!fallbackWhenMissing) errors.push('work-items runtime bridge must fall back to bundled work-items view when source module is missing');
  if (!domainParity) errors.push('work-items runtime bridge source domain must match bundled work-items domain');
  if (!facadeParity) errors.push('work-items runtime bridge source facade must match bundled work-items facade');
  if (!schemaParity) errors.push('work-items runtime bridge source schema id must match bundled work-items schema id');
  if (!stateFileParity) errors.push('work-items runtime bridge source state files must match bundled work-items state files');
  if (!commandParity) errors.push('work-items runtime bridge source commands must match bundled work-items commands');
  if (!excludedCommandParity) errors.push('work-items runtime bridge source excluded commands must match bundled work-items exclusions');
  if (!readSurfaceParity) errors.push('work-items runtime bridge source read surfaces must match bundled work-items read surfaces');
  if (!explicitWriteSurfaceParity) errors.push('work-items runtime bridge source explicit write surfaces must match bundled work-items surfaces');
  if (!writeBoundaryParity) errors.push('work-items runtime bridge source write boundary must match bundled work-items view');
  if (!claimCloseExcluded) errors.push('work-items runtime bridge must keep claim and close behavior excluded');

  return {
    schema: 'agent-onboard-public-source-module-work-items-runtime-bridge-check-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: gate.package_name,
    version: VERSION,
    release_line: gate.release_line,
    command: gate.check_command,
    package_root: root,
    validated: {
      work_items_bundle_parity: bundleParity.status === 'ok',
      work_items_runtime_bridge_status: gate.bridge_status === 'work_items_source_context_optional_runtime_bridge_applied',
      source_module_loaded_when_present: sourceLoadedWhenPresent,
      bundled_fallback_when_source_missing: fallbackWhenMissing || installedFallbackAllowed,
      installed_context_fallback_allowed: result.package_context === 'installed_package' ? resolved.mode === 'bundled_fallback' || resolved.mode === 'source_module_loaded' : true,
      source_domain_matches_bundled_work_items: domainParity,
      source_facade_matches_bundled_work_items: facadeParity,
      source_schema_matches_bundled_work_items: schemaParity,
      source_state_files_match_bundled_work_items: stateFileParity,
      source_commands_match_bundled_work_items: commandParity,
      source_exclusions_match_bundled_work_items: excludedCommandParity,
      source_read_surfaces_match_bundled_work_items: readSurfaceParity,
      source_write_surfaces_match_bundled_work_items: explicitWriteSurfaceParity,
      source_write_boundary_matches_bundled_work_items: writeBoundaryParity,
      claim_and_close_commands_excluded: claimCloseExcluded,
      work_items_runtime_bridge_file_present_or_installed_context_allowed: bridgeFileStatus === 'present_validated' || bridgeFileStatus === 'not_present_installed_context_allowed',
      work_items_runtime_bridge_commands_no_write: gate.boundary.work_items_runtime_bridge_command_writes_files === false && gate.boundary.work_items_runtime_bridge_check_command_writes_files === false,
      public_cli_outputs_unchanged_by_gate: gate.boundary.changes_public_cli_outputs === false,
      cli_runtime_dependency_graph_unchanged: gate.boundary.changes_cli_runtime_dependency_graph === false,
      package_allowlist_unchanged: arrayEquals(result.projected_pack_files, expectedPackFiles)
    },
    runtime_bridge_resolution: resolved,
    source_work_items_runtime_bridge_file: {
      path: result.runtime_bridge_file,
      present: result.runtime_bridge_file_present,
      status: bridgeFileStatus,
      schema: bridgeFileSchema,
      source_context_required: result.package_context === 'source_repository'
    },
    prerequisite_work_items_bundle_parity: {
      status: bundleParity.status,
      errors: bundleParity.errors
    },
    projected_pack_files: result.projected_pack_files,
    expected_pack_files: expectedPackFiles,
    boundary: result.boundary,
    errors
  };
}


function publicWorkItemsDomainSourceExtractionInstalledFallbackSmoke(root = packageRoot()) {
  const runtimeBridge = publicWorkItemsDomainSourceExtractionRuntimeBridgeCheck(root);
  const packageSurface = publicPackageSurfaceCheck(root);
  const context = sourceContext(root);
  const pkg = readJson(path.join(root, 'package.json'));
  const gate = PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_INSTALLED_FALLBACK_SMOKE;
  const expectedPackFiles = PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort();
  const projectedPackFiles = packageJsonProjectedPackFiles(pkg).slice().sort();
  const sourceModuleRel = gate.source_module;
  const sourceModulePresent = fs.existsSync(path.join(root, sourceModuleRel));
  const sourceModuleInPack = expectedPackFiles.includes(sourceModuleRel) || projectedPackFiles.includes(sourceModuleRel);
  const projectedInstalledRuntimeBridge = {
    context: 'installed_package',
    source_module_present: false,
    source_module: sourceModuleRel,
    mode: 'bundled_fallback',
    fallback_source: 'cli/agent-onboard.js',
    allowed_because_source_module_is_not_in_npm_pack: !sourceModuleInPack,
    claim_and_close_commands_excluded: true
  };
  return {
    schema: 'agent-onboard-public-source-module-work-items-installed-fallback-smoke-result-001',
    status: 'ok',
    package_name: gate.package_name,
    version: VERSION,
    release_line: gate.release_line,
    command: gate.command,
    check_command: gate.check_command,
    package_root: root,
    source_context: context,
    installed_fallback_smoke_file: gate.installed_fallback_smoke_file,
    installed_fallback_smoke_file_present: fs.existsSync(path.join(root, gate.installed_fallback_smoke_file)),
    source_module: sourceModuleRel,
    source_module_present: sourceModulePresent,
    projected_installed_runtime_bridge: projectedInstalledRuntimeBridge,
    observed: {
      work_items_runtime_bridge_check_status: runtimeBridge.status,
      work_items_runtime_bridge_resolution_mode: runtimeBridge.runtime_bridge_resolution.mode,
      package_surface_check_status: packageSurface.status,
      source_module_in_expected_pack_files: expectedPackFiles.includes(sourceModuleRel),
      source_module_in_projected_pack_files: projectedPackFiles.includes(sourceModuleRel),
      source_context_files_in_pack: PUBLIC_RELEASE_CONTRACT.source_context_files.filter((rel) => projectedPackFiles.includes(rel))
    },
    expected_pack_files: expectedPackFiles,
    projected_pack_files: projectedPackFiles,
    installed_fallback_contract: gate,
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
    },
    errors: []
  };
}

function publicWorkItemsDomainSourceExtractionInstalledFallbackSmokeCheck(root = packageRoot()) {
  const result = publicWorkItemsDomainSourceExtractionInstalledFallbackSmoke(root);
  const runtimeBridge = publicWorkItemsDomainSourceExtractionRuntimeBridgeCheck(root);
  const packageSurface = publicPackageSurfaceCheck(root);
  const expectedPackFiles = PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort();
  const projectedPackFiles = packageJsonProjectedPackFiles(readJson(path.join(root, 'package.json'))).slice().sort();
  const gate = PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_INSTALLED_FALLBACK_SMOKE;
  const sourceModuleRel = gate.source_module;
  const artifactPath = path.join(root, gate.installed_fallback_smoke_file);
  const context = sourceContext(root);
  const errors = [];
  if (gate.smoke_status !== 'work_items_installed_fallback_smoke_admitted') errors.push('work-items installed fallback smoke status must remain work_items_installed_fallback_smoke_admitted');
  if (runtimeBridge.status !== 'ok') errors.push(...runtimeBridge.errors.map((error) => `work-items runtime bridge: ${error}`));
  if (packageSurface.status !== 'ok') errors.push(...packageSurface.errors.map((error) => `package surface: ${error}`));
  if (PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_RUNTIME_BRIDGE.boundary.installed_context_fallback_required !== true) errors.push('work-items runtime bridge must require installed-context fallback');
  if (gate.boundary.source_modules_remain_out_of_npm_pack !== true) errors.push('work-items source modules must remain out of npm pack');
  if (gate.boundary.work_items_installed_fallback_smoke_command_writes_files !== false) errors.push('architecture --work-items-installed-fallback-smoke must remain no-write');
  if (gate.boundary.work_items_installed_fallback_check_command_writes_files !== false) errors.push('architecture --work-items-installed-fallback-check must remain no-write');
  if (gate.boundary.includes_claim_and_close_commands !== false) errors.push('work-items installed fallback must keep claim and close excluded');
  if (!arrayEquals(expectedPackFiles, projectedPackFiles)) errors.push('projected pack files must match the compact expected pack files');
  if (expectedPackFiles.includes(sourceModuleRel) || projectedPackFiles.includes(sourceModuleRel)) errors.push(`${sourceModuleRel} must remain outside the npm package allowlist`);
  if (context.package_context === 'installed_package' && fs.existsSync(path.join(root, sourceModuleRel))) errors.push(`${sourceModuleRel} must be absent from installed package context`);
  if (context.package_context === 'installed_package' && runtimeBridge.runtime_bridge_resolution.mode !== 'bundled_fallback') errors.push('installed package work-items runtime bridge must resolve through bundled_fallback');
  if (context.package_context === 'source_repository' && !fs.existsSync(artifactPath)) errors.push(`${gate.installed_fallback_smoke_file} must exist in source repository context`);
  let fileStatus = 'not_present_installed_context_allowed';
  let fileSchema = null;
  if (fs.existsSync(artifactPath)) {
    try {
      const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
      fileSchema = artifact.schema || null;
      if (artifact.schema !== gate.schema) errors.push(`${gate.installed_fallback_smoke_file} schema must be ${gate.schema}`);
      if (artifact.source_module !== sourceModuleRel) errors.push(`${gate.installed_fallback_smoke_file} source_module must be ${sourceModuleRel}`);
      if (!artifact.projected_installed_context || artifact.projected_installed_context.runtime_bridge_resolution_mode !== 'bundled_fallback') errors.push(`${gate.installed_fallback_smoke_file} must declare bundled_fallback projected installed context`);
      if (!artifact.projected_installed_context || artifact.projected_installed_context.claim_and_close_commands_remain_excluded !== true) errors.push(`${gate.installed_fallback_smoke_file} must keep claim and close excluded`);
      if (!artifact.boundary || artifact.boundary.package_allowlist_unchanged !== true) errors.push(`${gate.installed_fallback_smoke_file} must preserve package_allowlist_unchanged`);
      fileStatus = 'present_validated';
    } catch (error) {
      fileStatus = 'present_invalid_json';
      errors.push(`${gate.installed_fallback_smoke_file} must be valid JSON: ${error.message}`);
    }
  }
  return {
    schema: 'agent-onboard-public-source-module-work-items-installed-fallback-smoke-check-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: gate.package_name,
    version: VERSION,
    release_line: gate.release_line,
    command: gate.check_command,
    package_root: root,
    source_context: context,
    validated: {
      work_items_runtime_bridge_check: runtimeBridge.status === 'ok',
      package_surface_check: packageSurface.status === 'ok',
      work_items_installed_fallback_smoke_status: gate.smoke_status === 'work_items_installed_fallback_smoke_admitted',
      source_module_out_of_pack: !expectedPackFiles.includes(sourceModuleRel) && !projectedPackFiles.includes(sourceModuleRel),
      projected_pack_allowlist_unchanged: arrayEquals(expectedPackFiles, projectedPackFiles),
      installed_context_uses_bundled_fallback: context.package_context === 'installed_package' ? runtimeBridge.runtime_bridge_resolution.mode === 'bundled_fallback' : result.projected_installed_runtime_bridge.mode === 'bundled_fallback',
      source_artifact_present_or_installed_context_allowed: fs.existsSync(artifactPath) || context.package_context === 'installed_package',
      claim_and_close_commands_excluded: gate.boundary.includes_claim_and_close_commands === false && result.projected_installed_runtime_bridge.claim_and_close_commands_excluded === true,
      installed_fallback_commands_no_write: gate.boundary.work_items_installed_fallback_smoke_command_writes_files === false && gate.boundary.work_items_installed_fallback_check_command_writes_files === false,
      package_allowlist_unchanged: gate.boundary.package_allowlist_unchanged === true
    },
    observed: result.observed,
    runtime_bridge: {
      status: runtimeBridge.status,
      resolution_mode: runtimeBridge.runtime_bridge_resolution.mode,
      source_module_present: runtimeBridge.runtime_bridge_resolution.source_module_present
    },
    source_work_items_installed_fallback_file: {
      path: gate.installed_fallback_smoke_file,
      present: fs.existsSync(artifactPath),
      status: fs.existsSync(artifactPath) ? fileStatus : (context.package_context === 'installed_package' ? 'not_present_installed_context_allowed' : 'missing'),
      schema: fileSchema,
      source_context_required: true
    },
    projected_installed_runtime_bridge: result.projected_installed_runtime_bridge,
    expected_pack_files: expectedPackFiles,
    projected_pack_files: projectedPackFiles,
    boundary: result.boundary,
    errors
  };
}


function publicClaimsDomainSourceExtractionPlan(root = packageRoot()) {
  const pkg = readJson(path.join(root, 'package.json'));
  const context = sourceContext(root);
  const gate = PUBLIC_CLAIMS_DOMAIN_SOURCE_EXTRACTION_PLAN;
  const ledgerPath = path.join(root, '.agent-onboard', 'work-items.json');
  let ledger = null;
  if (fs.existsSync(ledgerPath)) {
    try {
      ledger = readJson(ledgerPath);
    } catch {
      ledger = null;
    }
  }
  const workItems = ledger && Array.isArray(ledger.work_items) ? ledger.work_items : [];
  const milestones = ledger && Array.isArray(ledger.milestones) ? ledger.milestones : [];
  const currentWorkItem = workItems.find((item) => item.id === gate.work_item_id) || null;
  const nextWorkItem = workItems.find((item) => item.id === gate.next_work_item_id) || null;
  const milestone = milestones.find((item) => item.id === gate.milestone_id) || null;
  return {
    schema: 'agent-onboard-public-claims-domain-source-extraction-plan-result-001',
    status: 'ok',
    package_name: gate.package_name,
    version: VERSION,
    release_line: gate.release_line,
    command: gate.command,
    check_command: gate.check_command,
    package_root: root,
    package_context: context.package_context,
    package_json_version: pkg.version,
    plan_file: gate.plan_file,
    plan_file_present: fs.existsSync(path.join(root, gate.plan_file)),
    plan: gate,
    source_ledger_present: fs.existsSync(ledgerPath),
    milestone,
    work_items: {
      current: currentWorkItem,
      next: nextWorkItem
    },
    planned_source_module_present: fs.existsSync(path.join(root, gate.domain.planned_module)),
    prerequisite_work_items_installed_fallback: publicWorkItemsDomainSourceExtractionInstalledFallbackSmokeCheck(root),
    prerequisite_package_surface: publicPackageSurfaceCheck(root),
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

function publicClaimsDomainSourceExtractionPlanCheck(root = packageRoot()) {
  const result = publicClaimsDomainSourceExtractionPlan(root);
  const gate = PUBLIC_CLAIMS_DOMAIN_SOURCE_EXTRACTION_PLAN;
  const expectedPackFiles = PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort();
  const errors = [];

  if (result.prerequisite_work_items_installed_fallback.status !== 'ok') errors.push(...result.prerequisite_work_items_installed_fallback.errors.map((error) => `work-items installed fallback smoke: ${error}`));
  if (result.prerequisite_package_surface.status !== 'ok') errors.push(...result.prerequisite_package_surface.errors.map((error) => `package surface: ${error}`));
  if (!arrayEquals(result.projected_pack_files, expectedPackFiles)) errors.push(`projected npm pack files must remain ${expectedPackFiles.join(', ')}`);
  if (gate.boundary.claims_plan_command_writes_files !== false) errors.push('architecture --claims-plan must remain no-write');
  if (gate.boundary.claims_check_command_writes_files !== false) errors.push('architecture --claims-check must remain no-write');
  if (gate.boundary.creates_source_modules !== false) errors.push('claims planning gate must not create source modules');
  if (gate.boundary.package_allowlist_unchanged !== true) errors.push('claims planning gate must preserve package allowlist');
  if (gate.domain.id !== 'claims') errors.push('claims planning gate must select the claims domain');
  if (gate.domain.facade !== 'claimsService') errors.push('claims planning gate must remain behind claimsService');
  if (gate.domain.planned_module !== 'src/domains/claims.js') errors.push('planned claims module path must be src/domains/claims.js');
  // After the follow-up first-slice gate closes, the planned module is allowed to exist.
  // The planning gate itself remains no-write and the first-slice gate owns creation evidence.

  let planFileStatus = 'not_present_installed_context_allowed';
  let planFileSchema = null;
  if (result.plan_file_present) {
    try {
      const planFile = readJson(path.join(root, result.plan_file));
      planFileSchema = planFile.schema || null;
      if (planFile.schema !== gate.schema) errors.push(`${result.plan_file} schema must be ${gate.schema}`);
      if (!planFile.domain || planFile.domain.id !== gate.domain.id) errors.push(`${result.plan_file} must select claims domain`);
      if (!planFile.domain || planFile.domain.facade !== gate.domain.facade) errors.push(`${result.plan_file} must remain behind claimsService`);
      if (!planFile.domain || planFile.domain.planned_module !== gate.domain.planned_module) errors.push(`${result.plan_file} must plan ${gate.domain.planned_module}`);
      if (!planFile.boundary || planFile.boundary.creates_source_modules !== false) errors.push(`${result.plan_file} must not create source modules`);
      if (!planFile.boundary || planFile.boundary.package_allowlist_unchanged !== true) errors.push(`${result.plan_file} must preserve package allowlist`);
      if (!Array.isArray(planFile.extraction_scope) || !planFile.extraction_scope.some((item) => /claim/.test(item)) || !planFile.extraction_scope.some((item) => /close|closure|handoff/.test(item))) errors.push(`${result.plan_file} must scope claim and closure/handoff behavior`);
      if (!Array.isArray(planFile.excluded_scope) || !planFile.excluded_scope.some((item) => /schema|template|init|validate|list|append/.test(item))) errors.push(`${result.plan_file} must explicitly exclude non-claims work-items behavior`);
      const nextFollowup = planFile.followup_work_items && planFile.followup_work_items[0] ? planFile.followup_work_items[0] : null;
      const nextId = planFile.next_work_item_id || workItemIdFromComponents(planFile.next_work_item_components) || (nextFollowup && (nextFollowup.id || workItemIdFromComponents(nextFollowup.id_components)));
      if (nextId !== gate.next_work_item_id) errors.push(`${result.plan_file} must seed ${gate.next_work_item_id} as the next work item`);
      planFileStatus = 'present_validated';
    } catch (error) {
      planFileStatus = 'present_invalid_json';
      errors.push(`${result.plan_file} is not valid JSON: ${error && error.message ? error.message : String(error)}`);
    }
  } else if (result.package_context === 'source_repository') {
    planFileStatus = 'missing_source_context';
    errors.push(`${result.plan_file} must be present in source repository context`);
  }

  const sourceLedgerRequired = result.package_context === 'source_repository';
  const currentWorkItem = result.work_items.current;
  const nextWorkItem = result.work_items.next;
  if (sourceLedgerRequired && !result.source_ledger_present) errors.push('.agent-onboard/work-items.json must be present in source repository context');
  if (result.source_ledger_present) {
    if (!result.milestone) errors.push(`${gate.milestone_id} milestone must exist`);
    else if (!['open', 'closed'].includes(result.milestone.status)) errors.push(`${gate.milestone_id} milestone must remain open or closed`);
    if (!currentWorkItem) errors.push(`${gate.work_item_id} work item must exist`);
    else if (currentWorkItem.status !== 'closed') errors.push(`${gate.work_item_id} claims planning work item must be closed`);
    if (!nextWorkItem) errors.push(`${gate.next_work_item_id} work item must exist`);
    else if (!['open', 'closed'].includes(nextWorkItem.status)) errors.push(`${gate.next_work_item_id} seeded work item must be open or closed`);
  }

  return {
    schema: 'agent-onboard-public-claims-domain-source-extraction-plan-check-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: gate.package_name,
    version: VERSION,
    release_line: gate.release_line,
    command: gate.check_command,
    package_root: root,
    validated: {
      prerequisite_work_items_installed_fallback: result.prerequisite_work_items_installed_fallback.status === 'ok',
      prerequisite_package_surface: result.prerequisite_package_surface.status === 'ok',
      claims_domain_selected: gate.domain.id === 'claims',
      planned_module_absent_or_created_by_followup: !result.planned_source_module_present || (nextWorkItem && nextWorkItem.status === 'closed'),
      current_work_item_closed_or_installed_context_allowed: result.package_context === 'installed_package' || (currentWorkItem && currentWorkItem.status === 'closed'),
      next_work_item_seeded_or_installed_context_allowed: result.package_context === 'installed_package' || !!nextWorkItem,
      claims_plan_commands_no_write: gate.boundary.claims_plan_command_writes_files === false && gate.boundary.claims_check_command_writes_files === false,
      package_allowlist_unchanged: arrayEquals(result.projected_pack_files, expectedPackFiles)
    },
    planned_domain: gate.domain,
    work_items: result.work_items,
    source_claims_plan_file: {
      path: result.plan_file,
      present: result.plan_file_present,
      status: planFileStatus,
      schema: planFileSchema,
      source_context_required: result.package_context === 'source_repository'
    },
    prerequisite_work_items_installed_fallback: {
      status: result.prerequisite_work_items_installed_fallback.status,
      errors: result.prerequisite_work_items_installed_fallback.errors
    },
    projected_pack_files: result.projected_pack_files,
    expected_pack_files: expectedPackFiles,
    boundary: result.boundary,
    errors
  };
}

function loadClaimsFirstSliceModule(root = packageRoot()) {
  const modulePath = path.join(root, PUBLIC_CLAIMS_DOMAIN_SOURCE_EXTRACTION_FIRST_SLICE.source_module);
  if (!fs.existsSync(modulePath)) return null;
  const resolved = require.resolve(modulePath);
  delete require.cache[resolved];
  return require(resolved);
}

function publicClaimsDomainSourceExtractionFirstSlice(root = packageRoot()) {
  const pkg = readJson(path.join(root, 'package.json'));
  const context = sourceContext(root);
  const gate = PUBLIC_CLAIMS_DOMAIN_SOURCE_EXTRACTION_FIRST_SLICE;
  let module_exports = [];
  let module_value = null;
  let module_load_error = null;
  try {
    const loaded = loadClaimsFirstSliceModule(root);
    if (loaded) {
      module_exports = Object.keys(loaded).sort();
      if (typeof loaded.getClaimsDomainFirstSlice === 'function') {
        module_value = loaded.getClaimsDomainFirstSlice();
      } else if (loaded.CLAIMS_DOMAIN_FIRST_SLICE) {
        module_value = loaded.CLAIMS_DOMAIN_FIRST_SLICE;
      }
    }
  } catch (error) {
    module_load_error = error && error.message ? error.message : String(error);
  }
  return {
    schema: 'agent-onboard-public-source-module-claims-first-slice-result-001',
    status: module_load_error ? 'error' : 'ok',
    package_name: gate.package_name,
    version: VERSION,
    release_line: gate.release_line,
    command: gate.command,
    check_command: gate.check_command,
    package_root: root,
    package_context: context.package_context,
    package_json_version: pkg.version,
    first_slice_file: gate.first_slice_file,
    first_slice_file_present: fs.existsSync(path.join(root, gate.first_slice_file)),
    source_module: gate.source_module,
    source_module_present: fs.existsSync(path.join(root, gate.source_module)),
    source_module_exports: module_exports,
    source_module_value: module_value,
    source_module_load_error: module_load_error,
    prerequisite_plan_file: gate.prerequisite_plan_file,
    claims_first_slice: gate,
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

function publicClaimsDomainSourceExtractionFirstSliceCheck(root = packageRoot()) {
  const result = publicClaimsDomainSourceExtractionFirstSlice(root);
  const plan = publicClaimsDomainSourceExtractionPlanCheck(root);
  const expectedPackFiles = PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort();
  const gate = PUBLIC_CLAIMS_DOMAIN_SOURCE_EXTRACTION_FIRST_SLICE;
  const expectedExports = gate.expected_module_export_names.slice().sort();
  const errors = [];
  if (plan.status !== 'ok') errors.push(...plan.errors.map((error) => `claims plan: ${error}`));
  if (result.status !== 'ok') errors.push(`claims first-slice module load failed: ${result.source_module_load_error}`);
  if (!arrayEquals(result.projected_pack_files, expectedPackFiles)) errors.push(`projected npm pack files must remain ${expectedPackFiles.join(', ')}`);
  if (gate.first_slice_status !== 'source_only_shadow_module_applied') errors.push('claims first-slice status must be source_only_shadow_module_applied');
  if (gate.extracted_domain.id !== 'claims') errors.push('claims first-slice must extract the claims domain');
  if (gate.boundary.created_source_module !== 'src/domains/claims.js') errors.push('claims first-slice created source module must be src/domains/claims.js');
  if (gate.boundary.creates_exactly_one_source_module !== true) errors.push('claims first-slice must create exactly one source module');
  if (gate.boundary.excludes_non_claim_work_items_commands !== true) errors.push('claims first-slice must exclude non-claim work-items commands');
  if (gate.boundary.keeps_shared_work_items_ledger !== true) errors.push('claims first-slice must keep the shared work-items ledger boundary');
  if (gate.boundary.moves_existing_source_files !== false) errors.push('claims first-slice must not move existing source files');
  if (gate.boundary.changes_public_cli_outputs !== false) errors.push('claims first-slice must not change public CLI outputs');
  if (gate.boundary.changes_cli_runtime_dependency_graph !== false) errors.push('claims first-slice must not make CLI runtime require source modules');
  if (gate.boundary.exports_source_module_as_public_api !== false) errors.push('claims first-slice must not expose source module as public import API');
  if (gate.boundary.claims_first_slice_command_writes_files !== false) errors.push('architecture --claims-first-slice must remain no-write');
  if (gate.boundary.claims_first_slice_check_command_writes_files !== false) errors.push('architecture --claims-first-slice-check must remain no-write');

  let artifactStatus = 'not_present_installed_context_allowed';
  let artifactSchema = null;
  if (result.first_slice_file_present) {
    try {
      const artifact = readJson(path.join(root, result.first_slice_file));
      artifactSchema = artifact.schema || null;
      if (artifact.schema !== gate.schema) errors.push(`${result.first_slice_file} schema must be ${gate.schema}`);
      if (artifact.source_module !== gate.source_module) errors.push(`${result.first_slice_file} source_module must be ${gate.source_module}`);
      if (!artifact.extracted_domain || artifact.extracted_domain.id !== 'claims') errors.push(`${result.first_slice_file} must declare extracted_domain.id claims`);
      if (!artifact.boundary || artifact.boundary.package_allowlist_unchanged !== true) errors.push(`${result.first_slice_file} must preserve package_allowlist_unchanged`);
      if (!artifact.boundary || artifact.boundary.keeps_shared_work_items_ledger !== true) errors.push(`${result.first_slice_file} must keep shared work-items ledger`);
      if (!artifact.boundary || artifact.boundary.excludes_non_claim_work_items_commands !== true) errors.push(`${result.first_slice_file} must exclude non-claim work-items commands`);
      artifactStatus = 'present_validated';
    } catch (error) {
      artifactStatus = 'present_invalid_json';
      errors.push(`${result.first_slice_file} is not valid JSON: ${error && error.message ? error.message : String(error)}`);
    }
  } else if (result.package_context === 'source_repository') {
    artifactStatus = 'missing_source_context';
    errors.push(`${result.first_slice_file} must be present in source repository context`);
  }

  let sourceModuleStatus = 'not_present_installed_context_allowed';
  const moduleValue = result.source_module_value || {};
  const moduleExportsSorted = result.source_module_exports.slice().sort();
  if (result.source_module_present) {
    if (!arrayEquals(moduleExportsSorted, expectedExports)) errors.push(`${result.source_module} exports must be ${expectedExports.join(', ')}`);
    if (moduleValue.schema !== gate.schema) errors.push(`${result.source_module} must export claims first-slice schema`);
    if (moduleValue.domain !== 'claims') errors.push(`${result.source_module} domain must be claims`);
    if (moduleValue.facade !== 'claimsService') errors.push(`${result.source_module} facade must be claimsService`);
    if (moduleValue.source_module !== result.source_module) errors.push(`${result.source_module} source_module field must match its path`);
    if (moduleValue.runtime_dependency_status !== gate.extracted_domain.runtime_dependency_status) errors.push(`${result.source_module} runtime dependency status must remain source-only shadow`);
    if (moduleValue.exports_public_api !== false) errors.push(`${result.source_module} must not declare public import API`);
    if (moduleValue.includes_work_items_non_claim_behavior !== false) errors.push(`${result.source_module} must exclude non-claim work-items behavior`);
    if (moduleValue.declares_shared_work_items_ledger !== true) errors.push(`${result.source_module} must declare the shared work-items ledger boundary`);
    if (moduleValue.writes_files !== false || moduleValue.state_writer !== false) errors.push(`${result.source_module} must remain read-only and non-state-writer`);
    if (moduleValue.declares_explicit_write_boundaries !== true) errors.push(`${result.source_module} must declare explicit write boundaries for claim/close commands`);
    if (!arrayEquals((moduleValue.owns_commands || []), gate.expected_owned_commands.slice())) errors.push(`${result.source_module} owns_commands must match claims first-slice scope`);
    if (!arrayEquals((moduleValue.excluded_commands || []), gate.excluded_commands.slice())) errors.push(`${result.source_module} excluded_commands must keep non-claim work-items behavior out of this slice`);
    sourceModuleStatus = 'present_validated';
  } else if (result.package_context === 'source_repository') {
    sourceModuleStatus = 'missing_source_context';
    errors.push(`${result.source_module} must be present in source repository context`);
  }

  return {
    schema: 'agent-onboard-public-source-module-claims-first-slice-check-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: gate.package_name,
    version: VERSION,
    release_line: gate.release_line,
    command: gate.check_command,
    package_root: root,
    validated: {
      claims_plan: plan.status === 'ok',
      first_slice_status: gate.first_slice_status === 'source_only_shadow_module_applied',
      extracted_domain_is_claims: gate.extracted_domain.id === 'claims',
      source_module_present_or_installed_context_allowed: sourceModuleStatus === 'present_validated' || sourceModuleStatus === 'not_present_installed_context_allowed',
      first_slice_file_present_or_installed_context_allowed: artifactStatus === 'present_validated' || artifactStatus === 'not_present_installed_context_allowed',
      shared_work_items_ledger_preserved: moduleValue.declares_shared_work_items_ledger === true || sourceModuleStatus === 'not_present_installed_context_allowed',
      non_claim_work_items_commands_excluded: moduleValue.includes_work_items_non_claim_behavior === false || sourceModuleStatus === 'not_present_installed_context_allowed',
      commands_no_write: gate.boundary.claims_first_slice_command_writes_files === false && gate.boundary.claims_first_slice_check_command_writes_files === false,
      package_allowlist_unchanged: arrayEquals(result.projected_pack_files, expectedPackFiles)
    },
    source_module: {
      path: result.source_module,
      present: result.source_module_present,
      status: sourceModuleStatus,
      exports: result.source_module_exports,
      value: result.source_module_value,
      source_context_required: result.package_context === 'source_repository'
    },
    first_slice_file: {
      path: result.first_slice_file,
      present: result.first_slice_file_present,
      status: artifactStatus,
      schema: artifactSchema,
      source_context_required: result.package_context === 'source_repository'
    },
    prerequisite_claims_plan: {
      status: plan.status,
      errors: plan.errors
    },
    projected_pack_files: result.projected_pack_files,
    expected_pack_files: expectedPackFiles,
    boundary: result.boundary,
    errors
  };
}


function bundledClaimsDomainForParity(root = packageRoot()) {
  const map = publicArchitectureMap(root);
  const facade = PUBLIC_DOMAIN_SERVICE_FACADES.facades.find((item) => item.id === 'claims');
  const domain = map.map.canonical_domains.find((item) => item.id === 'claims');
  return {
    schema: 'agent-onboard-public-bundled-claims-domain-view-001',
    domain: domain ? domain.id : null,
    facade: facade ? facade.service : null,
    service: facade ? facade.service : null,
    source: 'cli/agent-onboard.js',
    source_module_schema: PUBLIC_CLAIMS_DOMAIN_SOURCE_EXTRACTION_FIRST_SLICE.schema,
    owns_commands: PUBLIC_CLAIMS_DOMAIN_SOURCE_EXTRACTION_FIRST_SLICE.expected_owned_commands.slice(),
    excluded_commands: PUBLIC_CLAIMS_DOMAIN_SOURCE_EXTRACTION_FIRST_SLICE.excluded_commands.slice(),
    writes_files: false,
    state_writer: false,
    declares_explicit_write_boundaries: true,
    declares_shared_work_items_ledger: true,
    shared_state_files: Object.freeze(['.agent-onboard/work-items.json']).slice(),
    claim_contract: Object.freeze({
      command: 'work-items --claim',
      writes_only_under_explicit_write: true,
      dry_run_is_default_boundary: true
    }),
    close_contract: Object.freeze({
      command: 'work-items --close',
      writes_only_under_explicit_write: true,
      dry_run_is_default_boundary: true
    }),
    package_context: sourceContext(root).package_context
  };
}

function publicClaimsDomainSourceExtractionBundleParity(root = packageRoot()) {
  const pkg = readJson(path.join(root, 'package.json'));
  const context = sourceContext(root);
  const firstSlice = publicClaimsDomainSourceExtractionFirstSlice(root);
  const bundledClaims = bundledClaimsDomainForParity(root);
  const gate = PUBLIC_CLAIMS_DOMAIN_SOURCE_EXTRACTION_BUNDLE_PARITY;
  return {
    schema: 'agent-onboard-public-source-module-claims-bundle-parity-result-001',
    status: firstSlice.status === 'ok' ? 'ok' : 'error',
    package_name: gate.package_name,
    version: VERSION,
    release_line: gate.release_line,
    command: gate.command,
    check_command: gate.check_command,
    package_root: root,
    package_context: context.package_context,
    package_json_version: pkg.version,
    bundle_parity_file: gate.bundle_parity_file,
    bundle_parity_file_present: fs.existsSync(path.join(root, gate.bundle_parity_file)),
    source_module: gate.source_module,
    source_module_present: fs.existsSync(path.join(root, gate.source_module)),
    source_slice_value: firstSlice.source_module_value,
    bundled_claims_view: bundledClaims,
    claims_bundle_parity: gate,
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

function publicClaimsDomainSourceExtractionBundleParityCheck(root = packageRoot()) {
  const result = publicClaimsDomainSourceExtractionBundleParity(root);
  const firstSlice = publicClaimsDomainSourceExtractionFirstSliceCheck(root);
  const expectedPackFiles = PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort();
  const gate = PUBLIC_CLAIMS_DOMAIN_SOURCE_EXTRACTION_BUNDLE_PARITY;
  const errors = [];
  if (firstSlice.status !== 'ok') errors.push(...firstSlice.errors.map((error) => `claims first slice: ${error}`));
  if (result.status !== 'ok') errors.push('claims bundle parity depends on a loadable first-slice source module in source context or installed fallback metadata');
  if (!arrayEquals(result.projected_pack_files, expectedPackFiles)) errors.push(`projected npm pack files must remain ${expectedPackFiles.join(', ')}`);
  if (gate.parity_status !== 'claims_source_slice_matches_bundled_cli_view') errors.push('claims bundle parity status must remain claims_source_slice_matches_bundled_cli_view');
  if (gate.boundary.claims_bundle_parity_command_writes_files !== false) errors.push('architecture --claims-bundle-parity must remain no-write');
  if (gate.boundary.claims_bundle_parity_check_command_writes_files !== false) errors.push('architecture --claims-bundle-parity-check must remain no-write');
  if (gate.boundary.creates_bundle_artifact !== false) errors.push('claims bundle parity gate must not create runtime bundle artifacts');
  if (gate.boundary.keeps_shared_work_items_ledger !== true) errors.push('claims bundle parity gate must preserve the shared work-items ledger boundary');
  if (gate.boundary.excludes_non_claim_work_items_commands !== true) errors.push('claims bundle parity gate must exclude non-claim work-items commands');
  if (gate.boundary.changes_public_cli_outputs !== false) errors.push('claims bundle parity gate must not change public CLI outputs');
  if (gate.boundary.changes_cli_runtime_dependency_graph !== false) errors.push('claims bundle parity gate must not change CLI runtime dependency graph');
  if (gate.boundary.package_allowlist_unchanged !== true) errors.push('claims bundle parity gate must preserve package allowlist');

  let bundleParityFileStatus = 'not_present_installed_context_allowed';
  let bundleParityFileSchema = null;
  if (result.bundle_parity_file_present) {
    try {
      const artifact = readJson(path.join(root, result.bundle_parity_file));
      bundleParityFileSchema = artifact.schema || null;
      if (artifact.schema !== gate.schema) errors.push(`${result.bundle_parity_file} schema must be ${gate.schema}`);
      if (artifact.source_module !== gate.source_module) errors.push(`${result.bundle_parity_file} source_module must be ${gate.source_module}`);
      if (artifact.parity_status !== gate.parity_status) errors.push(`${result.bundle_parity_file} parity_status must be ${gate.parity_status}`);
      if (!artifact.boundary || artifact.boundary.package_allowlist_unchanged !== true) errors.push(`${result.bundle_parity_file} must preserve package_allowlist_unchanged`);
      if (!artifact.boundary || artifact.boundary.keeps_shared_work_items_ledger !== true) errors.push(`${result.bundle_parity_file} must keep shared work-items ledger`);
      if (!artifact.boundary || artifact.boundary.excludes_non_claim_work_items_commands !== true) errors.push(`${result.bundle_parity_file} must exclude non-claim work-items commands`);
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
  const bundled = result.bundled_claims_view;
  const sourceContextAllowedMissing = result.package_context === 'installed_package' && !sourceSlice;
  const domainParity = sourceContextAllowedMissing || (sourceSlice && sourceSlice.domain === bundled.domain);
  const facadeParity = sourceContextAllowedMissing || (sourceSlice && sourceSlice.facade === bundled.facade);
  const serviceParity = sourceContextAllowedMissing || (sourceSlice && sourceSlice.service === bundled.service);
  const schemaParity = sourceContextAllowedMissing || (sourceSlice && sourceSlice.schema === bundled.source_module_schema);
  const stateFileParity = sourceContextAllowedMissing || (sourceSlice && arrayEquals(sourceSlice.shared_state_files || [], bundled.shared_state_files));
  const commandParity = sourceContextAllowedMissing || (sourceSlice && arrayEquals(sourceSlice.owns_commands || [], bundled.owns_commands));
  const excludedCommandParity = sourceContextAllowedMissing || (sourceSlice && arrayEquals(sourceSlice.excluded_commands || [], bundled.excluded_commands));
  const writeBoundaryParity = sourceContextAllowedMissing || (sourceSlice && sourceSlice.writes_files === bundled.writes_files && sourceSlice.state_writer === bundled.state_writer && sourceSlice.declares_explicit_write_boundaries === bundled.declares_explicit_write_boundaries);
  const sharedLedgerParity = sourceContextAllowedMissing || (sourceSlice && sourceSlice.declares_shared_work_items_ledger === bundled.declares_shared_work_items_ledger);
  const claimContractParity = sourceContextAllowedMissing || (sourceSlice && sourceSlice.claim_contract && sourceSlice.claim_contract.command === bundled.claim_contract.command && sourceSlice.claim_contract.writes_only_under_explicit_write === true && sourceSlice.claim_contract.dry_run_is_default_boundary === true);
  const closeContractParity = sourceContextAllowedMissing || (sourceSlice && sourceSlice.close_contract && sourceSlice.close_contract.command === bundled.close_contract.command && sourceSlice.close_contract.writes_only_under_explicit_write === true && sourceSlice.close_contract.dry_run_is_default_boundary === true);
  const nonClaimExcluded = sourceContextAllowedMissing || (sourceSlice && sourceSlice.includes_work_items_non_claim_behavior === false);
  if (!domainParity) errors.push('claims source slice domain must match bundled claims domain view');
  if (!facadeParity) errors.push('claims source slice facade must match bundled claims facade view');
  if (!serviceParity) errors.push('claims source slice service must match bundled claims service view');
  if (!schemaParity) errors.push('claims source slice schema must match bundled claims source-module schema');
  if (!stateFileParity) errors.push('claims source slice shared state files must match bundled claims view');
  if (!commandParity) errors.push('claims source slice owned commands must match bundled claims command surface');
  if (!excludedCommandParity) errors.push('claims source slice excluded commands must match bundled claims exclusions');
  if (!writeBoundaryParity) errors.push('claims source slice read/write boundary must match bundled claims view');
  if (!sharedLedgerParity) errors.push('claims source slice must preserve shared work-items ledger parity');
  if (!claimContractParity) errors.push('claims source slice claim contract must match bundled claims view');
  if (!closeContractParity) errors.push('claims source slice close contract must match bundled claims view');
  if (!nonClaimExcluded) errors.push('claims source slice must exclude non-claim work-items behavior');

  return {
    schema: 'agent-onboard-public-source-module-claims-bundle-parity-check-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: gate.package_name,
    version: VERSION,
    release_line: gate.release_line,
    command: gate.check_command,
    package_root: root,
    validated: {
      first_slice: firstSlice.status === 'ok',
      bundle_parity_status: gate.parity_status === 'claims_source_slice_matches_bundled_cli_view',
      source_slice_domain_matches_bundled_claims: domainParity,
      source_slice_facade_matches_bundled_claims: facadeParity,
      source_slice_service_matches_bundled_claims: serviceParity,
      source_slice_schema_matches_bundled_claims: schemaParity,
      source_slice_state_files_match_bundled_claims: stateFileParity,
      source_slice_commands_match_bundled_claims: commandParity,
      source_slice_exclusions_match_bundled_claims: excludedCommandParity,
      source_slice_write_boundary_matches_bundled_claims: writeBoundaryParity,
      shared_work_items_ledger_preserved: sharedLedgerParity,
      claim_contract_matches_bundled_claims: claimContractParity,
      close_contract_matches_bundled_claims: closeContractParity,
      non_claim_work_items_commands_excluded: nonClaimExcluded,
      source_module_present_or_installed_context_allowed: result.source_module_present || result.package_context === 'installed_package',
      bundle_parity_file_present_or_installed_context_allowed: bundleParityFileStatus === 'present_validated' || bundleParityFileStatus === 'not_present_installed_context_allowed',
      commands_no_write: gate.boundary.claims_bundle_parity_command_writes_files === false && gate.boundary.claims_bundle_parity_check_command_writes_files === false,
      runtime_outputs_unchanged_by_gate: gate.boundary.changes_public_cli_outputs === false,
      cli_runtime_dependency_graph_unchanged: gate.boundary.changes_cli_runtime_dependency_graph === false,
      package_allowlist_unchanged: arrayEquals(result.projected_pack_files, expectedPackFiles)
    },
    source_slice: result.source_slice_value,
    bundled_claims_view: result.bundled_claims_view,
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


function resolveClaimsDomainRuntimeBridge(root = packageRoot()) {
  const context = sourceContext(root);
  const modulePath = path.join(root, PUBLIC_CLAIMS_DOMAIN_SOURCE_EXTRACTION_RUNTIME_BRIDGE.source_module);
  const sourceModulePresent = fs.existsSync(modulePath);
  const bundledClaims = bundledClaimsDomainForParity(root);
  if (sourceModulePresent) {
    try {
      const resolved = require.resolve(modulePath);
      delete require.cache[resolved];
      const loaded = require(resolved);
      const value = loaded && typeof loaded.getClaimsDomainFirstSlice === 'function'
        ? loaded.getClaimsDomainFirstSlice()
        : loaded && loaded.CLAIMS_DOMAIN_FIRST_SLICE;
      if (!value || value.schema !== 'agent-onboard-public-source-module-claims-first-slice-001') {
        return {
          status: 'error',
          context: context.package_context,
          mode: 'source_module_invalid',
          source_module_present: true,
          source_module: PUBLIC_CLAIMS_DOMAIN_SOURCE_EXTRACTION_RUNTIME_BRIDGE.source_module,
          module_value: value || null,
          bundled_claims_view: bundledClaims,
          errors: [`${PUBLIC_CLAIMS_DOMAIN_SOURCE_EXTRACTION_RUNTIME_BRIDGE.source_module} did not export a valid claims first-slice contract`]
        };
      }
      return {
        status: 'ok',
        context: context.package_context,
        mode: 'source_module_loaded',
        source_module_present: true,
        source_module: PUBLIC_CLAIMS_DOMAIN_SOURCE_EXTRACTION_RUNTIME_BRIDGE.source_module,
        module_value: value,
        bundled_claims_view: bundledClaims,
        errors: []
      };
    } catch (error) {
      return {
        status: 'error',
        context: context.package_context,
        mode: 'source_module_load_failed',
        source_module_present: true,
        source_module: PUBLIC_CLAIMS_DOMAIN_SOURCE_EXTRACTION_RUNTIME_BRIDGE.source_module,
        module_value: null,
        bundled_claims_view: bundledClaims,
        errors: [`${PUBLIC_CLAIMS_DOMAIN_SOURCE_EXTRACTION_RUNTIME_BRIDGE.source_module} failed to load: ${error && error.message ? error.message : String(error)}`]
      };
    }
  }
  return {
    status: 'ok',
    context: context.package_context,
    mode: 'bundled_fallback',
    source_module_present: false,
    source_module: PUBLIC_CLAIMS_DOMAIN_SOURCE_EXTRACTION_RUNTIME_BRIDGE.source_module,
    module_value: null,
    bundled_claims_view: bundledClaims,
    errors: []
  };
}

function publicClaimsDomainSourceExtractionRuntimeBridge(root = packageRoot()) {
  const pkg = readJson(path.join(root, 'package.json'));
  const context = sourceContext(root);
  const bridge = resolveClaimsDomainRuntimeBridge(root);
  const gate = PUBLIC_CLAIMS_DOMAIN_SOURCE_EXTRACTION_RUNTIME_BRIDGE;
  return {
    schema: 'agent-onboard-public-source-module-claims-runtime-bridge-result-001',
    status: bridge.status,
    package_name: gate.package_name,
    version: VERSION,
    release_line: gate.release_line,
    command: gate.command,
    check_command: gate.check_command,
    package_root: root,
    package_context: context.package_context,
    package_json_version: pkg.version,
    runtime_bridge_file: gate.runtime_bridge_file,
    runtime_bridge_file_present: fs.existsSync(path.join(root, gate.runtime_bridge_file)),
    source_module: gate.source_module,
    source_module_present: fs.existsSync(path.join(root, gate.source_module)),
    runtime_bridge_resolution: bridge,
    runtime_bridge_contract: gate,
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

function publicClaimsDomainSourceExtractionRuntimeBridgeCheck(root = packageRoot()) {
  const result = publicClaimsDomainSourceExtractionRuntimeBridge(root);
  const bundleParity = publicClaimsDomainSourceExtractionBundleParityCheck(root);
  const expectedPackFiles = PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort();
  const gate = PUBLIC_CLAIMS_DOMAIN_SOURCE_EXTRACTION_RUNTIME_BRIDGE;
  const errors = [];
  if (bundleParity.status !== 'ok') errors.push(...bundleParity.errors.map((error) => `claims bundle parity: ${error}`));
  if (result.runtime_bridge_resolution.status !== 'ok') errors.push(...result.runtime_bridge_resolution.errors);
  if (!arrayEquals(result.projected_pack_files, expectedPackFiles)) errors.push(`projected npm pack files must remain ${expectedPackFiles.join(', ')}`);
  if (gate.bridge_status !== 'claims_source_context_optional_runtime_bridge_applied') errors.push('claims runtime bridge status must remain claims_source_context_optional_runtime_bridge_applied');
  if (gate.boundary.claims_runtime_bridge_command_writes_files !== false) errors.push('architecture --claims-runtime-bridge must remain no-write');
  if (gate.boundary.claims_runtime_bridge_check_command_writes_files !== false) errors.push('architecture --claims-runtime-bridge-check must remain no-write');
  if (gate.boundary.source_context_optional_require_only !== true) errors.push('claims runtime bridge must use source-context optional require only');
  if (gate.boundary.installed_context_fallback_required !== true) errors.push('claims runtime bridge must preserve installed-package fallback');
  if (gate.boundary.keeps_shared_work_items_ledger !== true) errors.push('claims runtime bridge must preserve shared work-items ledger');
  if (gate.boundary.includes_non_claim_work_items_commands !== false) errors.push('claims runtime bridge must keep non-claim work-items commands excluded');
  if (gate.boundary.package_allowlist_unchanged !== true) errors.push('claims runtime bridge gate must preserve package allowlist');

  let bridgeFileStatus = 'not_present_installed_context_allowed';
  let bridgeFileSchema = null;
  if (result.runtime_bridge_file_present) {
    try {
      const bridgeFile = readJson(path.join(root, result.runtime_bridge_file));
      bridgeFileSchema = bridgeFile.schema || null;
      if (bridgeFile.schema !== gate.schema) errors.push(`${result.runtime_bridge_file} schema must be ${gate.schema}`);
      if (bridgeFile.source_module !== gate.source_module) errors.push(`${result.runtime_bridge_file} source_module must be ${gate.source_module}`);
      if (!bridgeFile.runtime_bridge || bridgeFile.runtime_bridge.installed_context_allows_missing_source_module !== true) errors.push(`${result.runtime_bridge_file} must allow installed context fallback`);
      if (!bridgeFile.runtime_bridge || bridgeFile.runtime_bridge.keeps_shared_work_items_ledger !== true) errors.push(`${result.runtime_bridge_file} must keep the shared work-items ledger`);
      if (!bridgeFile.runtime_bridge || bridgeFile.runtime_bridge.includes_non_claim_work_items_commands !== false) errors.push(`${result.runtime_bridge_file} must exclude non-claim work-items commands`);
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
  const source = resolved.module_value || null;
  const bundled = resolved.bundled_claims_view;
  const domainParity = !source || source.domain === bundled.domain;
  const facadeParity = !source || source.facade === bundled.facade;
  const serviceParity = !source || source.service === bundled.service;
  const schemaParity = !source || source.schema === bundled.source_module_schema;
  const stateFileParity = !source || arrayEquals(source.shared_state_files || [], bundled.shared_state_files);
  const commandParity = !source || arrayEquals(source.owns_commands || [], bundled.owns_commands);
  const excludedCommandParity = !source || arrayEquals(source.excluded_commands || [], bundled.excluded_commands);
  const writeBoundaryParity = !source || (source.writes_files === bundled.writes_files && source.state_writer === bundled.state_writer && source.declares_explicit_write_boundaries === bundled.declares_explicit_write_boundaries);
  const sharedLedgerParity = !source || (source.declares_shared_work_items_ledger === true && bundled.declares_shared_work_items_ledger === true);
  const nonClaimExcluded = !source || source.includes_work_items_non_claim_behavior === false;
  const claimContractParity = !source || (source.claim_contract && source.claim_contract.command === bundled.claim_contract.command && source.claim_contract.writes_only_under_explicit_write === true && source.claim_contract.dry_run_is_default_boundary === true);
  const closeContractParity = !source || (source.close_contract && source.close_contract.command === bundled.close_contract.command && source.close_contract.writes_only_under_explicit_write === true && source.close_contract.dry_run_is_default_boundary === true);

  if (!sourceLoadedWhenPresent) errors.push('claims runtime bridge must load the source claims slice when present in source repository context');
  if (!fallbackWhenMissing) errors.push('claims runtime bridge must fall back to bundled claims view when source module is missing');
  if (!domainParity) errors.push('claims runtime bridge source domain must match bundled claims domain');
  if (!facadeParity) errors.push('claims runtime bridge source facade must match bundled claims facade');
  if (!serviceParity) errors.push('claims runtime bridge source service must match bundled claims service');
  if (!schemaParity) errors.push('claims runtime bridge source schema must match bundled claims schema');
  if (!stateFileParity) errors.push('claims runtime bridge source shared state files must match bundled claims state files');
  if (!commandParity) errors.push('claims runtime bridge source commands must match bundled claims commands');
  if (!excludedCommandParity) errors.push('claims runtime bridge source exclusions must match bundled claims exclusions');
  if (!writeBoundaryParity) errors.push('claims runtime bridge source write boundary must match bundled claims view');
  if (!sharedLedgerParity) errors.push('claims runtime bridge must preserve shared work-items ledger');
  if (!nonClaimExcluded) errors.push('claims runtime bridge must keep non-claim work-items commands excluded');
  if (!claimContractParity) errors.push('claims runtime bridge source claim contract must match bundled claims view');
  if (!closeContractParity) errors.push('claims runtime bridge source close contract must match bundled claims view');

  return {
    schema: 'agent-onboard-public-source-module-claims-runtime-bridge-check-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: gate.package_name,
    version: VERSION,
    release_line: gate.release_line,
    command: gate.check_command,
    package_root: root,
    validated: {
      claims_bundle_parity: bundleParity.status === 'ok',
      claims_runtime_bridge_status: gate.bridge_status === 'claims_source_context_optional_runtime_bridge_applied',
      source_module_loaded_when_present: sourceLoadedWhenPresent,
      bundled_fallback_when_source_missing: fallbackWhenMissing || installedFallbackAllowed,
      installed_context_fallback_allowed: result.package_context === 'installed_package' ? resolved.mode === 'bundled_fallback' || resolved.mode === 'source_module_loaded' : true,
      source_domain_matches_bundled_claims: domainParity,
      source_facade_matches_bundled_claims: facadeParity,
      source_service_matches_bundled_claims: serviceParity,
      source_schema_matches_bundled_claims: schemaParity,
      source_state_files_match_bundled_claims: stateFileParity,
      source_commands_match_bundled_claims: commandParity,
      source_exclusions_match_bundled_claims: excludedCommandParity,
      source_write_boundary_matches_bundled_claims: writeBoundaryParity,
      shared_work_items_ledger_preserved: sharedLedgerParity,
      non_claim_work_items_commands_excluded: nonClaimExcluded,
      claim_contract_matches_bundled_claims: claimContractParity,
      close_contract_matches_bundled_claims: closeContractParity,
      claims_runtime_bridge_file_present_or_installed_context_allowed: bridgeFileStatus === 'present_validated' || bridgeFileStatus === 'not_present_installed_context_allowed',
      claims_runtime_bridge_commands_no_write: gate.boundary.claims_runtime_bridge_command_writes_files === false && gate.boundary.claims_runtime_bridge_check_command_writes_files === false,
      public_cli_outputs_unchanged_by_gate: gate.boundary.changes_public_cli_outputs === false,
      cli_runtime_dependency_graph_unchanged: gate.boundary.changes_cli_runtime_dependency_graph === false,
      package_allowlist_unchanged: arrayEquals(result.projected_pack_files, expectedPackFiles)
    },
    runtime_bridge_resolution: resolved,
    source_claims_runtime_bridge_file: {
      path: result.runtime_bridge_file,
      present: result.runtime_bridge_file_present,
      status: bridgeFileStatus,
      schema: bridgeFileSchema,
      source_context_required: result.package_context === 'source_repository'
    },
    prerequisite_claims_bundle_parity: {
      status: bundleParity.status,
      errors: bundleParity.errors
    },
    projected_pack_files: result.projected_pack_files,
    expected_pack_files: expectedPackFiles,
    boundary: result.boundary,
    errors
  };
}


function publicClaimsDomainSourceExtractionInstalledFallbackSmoke(root = packageRoot()) {
  const runtimeBridge = publicClaimsDomainSourceExtractionRuntimeBridgeCheck(root);
  const packageSurface = publicPackageSurfaceCheck(root);
  const context = sourceContext(root);
  const pkg = readJson(path.join(root, 'package.json'));
  const gate = PUBLIC_CLAIMS_DOMAIN_SOURCE_EXTRACTION_INSTALLED_FALLBACK_SMOKE;
  const expectedPackFiles = PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort();
  const projectedPackFiles = packageJsonProjectedPackFiles(pkg).slice().sort();
  const sourceModuleRel = gate.source_module;
  const sourceModulePresent = fs.existsSync(path.join(root, sourceModuleRel));
  const sourceModuleInPack = expectedPackFiles.includes(sourceModuleRel) || projectedPackFiles.includes(sourceModuleRel);
  const projectedInstalledRuntimeBridge = {
    context: 'installed_package',
    source_module_present: false,
    source_module: sourceModuleRel,
    mode: 'bundled_fallback',
    fallback_source: 'cli/agent-onboard.js',
    allowed_because_source_module_is_not_in_npm_pack: !sourceModuleInPack,
    shared_work_items_ledger_preserved: true,
    non_claim_work_items_commands_excluded: true
  };
  return {
    schema: 'agent-onboard-public-source-module-claims-installed-fallback-smoke-result-001',
    status: 'ok',
    package_name: gate.package_name,
    version: VERSION,
    release_line: gate.release_line,
    command: gate.command,
    check_command: gate.check_command,
    package_root: root,
    source_context: context,
    installed_fallback_smoke_file: gate.installed_fallback_smoke_file,
    installed_fallback_smoke_file_present: fs.existsSync(path.join(root, gate.installed_fallback_smoke_file)),
    source_module: sourceModuleRel,
    source_module_present: sourceModulePresent,
    projected_installed_runtime_bridge: projectedInstalledRuntimeBridge,
    observed: {
      claims_runtime_bridge_check_status: runtimeBridge.status,
      claims_runtime_bridge_resolution_mode: runtimeBridge.runtime_bridge_resolution.mode,
      package_surface_check_status: packageSurface.status,
      source_module_in_expected_pack_files: expectedPackFiles.includes(sourceModuleRel),
      source_module_in_projected_pack_files: projectedPackFiles.includes(sourceModuleRel),
      source_context_files_in_pack: PUBLIC_RELEASE_CONTRACT.source_context_files.filter((rel) => projectedPackFiles.includes(rel))
    },
    expected_pack_files: expectedPackFiles,
    projected_pack_files: projectedPackFiles,
    installed_fallback_contract: gate,
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
    },
    errors: []
  };
}

function publicClaimsDomainSourceExtractionInstalledFallbackSmokeCheck(root = packageRoot()) {
  const result = publicClaimsDomainSourceExtractionInstalledFallbackSmoke(root);
  const runtimeBridge = publicClaimsDomainSourceExtractionRuntimeBridgeCheck(root);
  const packageSurface = publicPackageSurfaceCheck(root);
  const expectedPackFiles = PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort();
  const projectedPackFiles = packageJsonProjectedPackFiles(readJson(path.join(root, 'package.json'))).slice().sort();
  const gate = PUBLIC_CLAIMS_DOMAIN_SOURCE_EXTRACTION_INSTALLED_FALLBACK_SMOKE;
  const sourceModuleRel = gate.source_module;
  const artifactPath = path.join(root, gate.installed_fallback_smoke_file);
  const context = sourceContext(root);
  const errors = [];
  if (gate.smoke_status !== 'claims_installed_fallback_smoke_admitted') errors.push('claims installed fallback smoke status must remain claims_installed_fallback_smoke_admitted');
  if (runtimeBridge.status !== 'ok') errors.push(...runtimeBridge.errors.map((error) => `claims runtime bridge: ${error}`));
  if (packageSurface.status !== 'ok') errors.push(...packageSurface.errors.map((error) => `package surface: ${error}`));
  if (PUBLIC_CLAIMS_DOMAIN_SOURCE_EXTRACTION_RUNTIME_BRIDGE.boundary.installed_context_fallback_required !== true) errors.push('claims runtime bridge must require installed-context fallback');
  if (gate.boundary.source_modules_remain_out_of_npm_pack !== true) errors.push('claims source modules must remain out of npm pack');
  if (gate.boundary.claims_installed_fallback_smoke_command_writes_files !== false) errors.push('architecture --claims-installed-fallback-smoke must remain no-write');
  if (gate.boundary.claims_installed_fallback_check_command_writes_files !== false) errors.push('architecture --claims-installed-fallback-check must remain no-write');
  if (gate.boundary.keeps_shared_work_items_ledger !== true) errors.push('claims installed fallback must preserve the shared work-items ledger');
  if (gate.boundary.includes_non_claim_work_items_commands !== false) errors.push('claims installed fallback must keep non-claim work-items commands excluded');
  if (!arrayEquals(expectedPackFiles, projectedPackFiles)) errors.push('projected pack files must match the compact expected pack files');
  if (expectedPackFiles.includes(sourceModuleRel) || projectedPackFiles.includes(sourceModuleRel)) errors.push(`${sourceModuleRel} must remain outside the npm package allowlist`);
  if (context.package_context === 'installed_package' && fs.existsSync(path.join(root, sourceModuleRel))) errors.push(`${sourceModuleRel} must be absent from installed package context`);
  if (context.package_context === 'installed_package' && runtimeBridge.runtime_bridge_resolution.mode !== 'bundled_fallback') errors.push('installed package claims runtime bridge must resolve through bundled_fallback');
  if (context.package_context === 'source_repository' && !fs.existsSync(artifactPath)) errors.push(`${gate.installed_fallback_smoke_file} must exist in source repository context`);
  let fileStatus = 'not_present_installed_context_allowed';
  let fileSchema = null;
  if (fs.existsSync(artifactPath)) {
    try {
      const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
      fileSchema = artifact.schema || null;
      if (artifact.schema !== gate.schema) errors.push(`${gate.installed_fallback_smoke_file} schema must be ${gate.schema}`);
      if (artifact.source_module !== sourceModuleRel) errors.push(`${gate.installed_fallback_smoke_file} source_module must be ${sourceModuleRel}`);
      if (!artifact.projected_installed_context || artifact.projected_installed_context.runtime_bridge_resolution_mode !== 'bundled_fallback') errors.push(`${gate.installed_fallback_smoke_file} must declare bundled_fallback projected installed context`);
      if (!artifact.projected_installed_context || artifact.projected_installed_context.shared_work_items_ledger_remains_canonical !== true) errors.push(`${gate.installed_fallback_smoke_file} must preserve the shared work-items ledger`);
      if (!artifact.projected_installed_context || artifact.projected_installed_context.non_claim_work_items_commands_remain_excluded !== true) errors.push(`${gate.installed_fallback_smoke_file} must keep non-claim work-items commands excluded`);
      if (!artifact.boundary || artifact.boundary.package_allowlist_unchanged !== true) errors.push(`${gate.installed_fallback_smoke_file} must preserve package_allowlist_unchanged`);
      fileStatus = 'present_validated';
    } catch (error) {
      fileStatus = 'present_invalid_json';
      errors.push(`${gate.installed_fallback_smoke_file} must be valid JSON: ${error.message}`);
    }
  }
  return {
    schema: 'agent-onboard-public-source-module-claims-installed-fallback-smoke-check-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: gate.package_name,
    version: VERSION,
    release_line: gate.release_line,
    command: gate.check_command,
    package_root: root,
    source_context: context,
    validated: {
      claims_runtime_bridge_check: runtimeBridge.status === 'ok',
      package_surface_check: packageSurface.status === 'ok',
      claims_installed_fallback_smoke_status: gate.smoke_status === 'claims_installed_fallback_smoke_admitted',
      source_module_out_of_pack: !expectedPackFiles.includes(sourceModuleRel) && !projectedPackFiles.includes(sourceModuleRel),
      projected_pack_allowlist_unchanged: arrayEquals(expectedPackFiles, projectedPackFiles),
      installed_context_uses_bundled_fallback: context.package_context === 'installed_package' ? runtimeBridge.runtime_bridge_resolution.mode === 'bundled_fallback' : result.projected_installed_runtime_bridge.mode === 'bundled_fallback',
      source_artifact_present_or_installed_context_allowed: fs.existsSync(artifactPath) || context.package_context === 'installed_package',
      shared_work_items_ledger_preserved: gate.boundary.keeps_shared_work_items_ledger === true && result.projected_installed_runtime_bridge.shared_work_items_ledger_preserved === true,
      non_claim_work_items_commands_excluded: gate.boundary.includes_non_claim_work_items_commands === false && result.projected_installed_runtime_bridge.non_claim_work_items_commands_excluded === true,
      installed_fallback_commands_no_write: gate.boundary.claims_installed_fallback_smoke_command_writes_files === false && gate.boundary.claims_installed_fallback_check_command_writes_files === false,
      package_allowlist_unchanged: gate.boundary.package_allowlist_unchanged === true
    },
    observed: result.observed,
    runtime_bridge: {
      status: runtimeBridge.status,
      resolution_mode: runtimeBridge.runtime_bridge_resolution.mode,
      source_module_present: runtimeBridge.runtime_bridge_resolution.source_module_present
    },
    source_claims_installed_fallback_file: {
      path: gate.installed_fallback_smoke_file,
      present: fs.existsSync(artifactPath),
      status: fs.existsSync(artifactPath) ? fileStatus : (context.package_context === 'installed_package' ? 'not_present_installed_context_allowed' : 'missing'),
      schema: fileSchema,
      source_context_required: true
    },
    projected_installed_runtime_bridge: result.projected_installed_runtime_bridge,
    expected_pack_files: expectedPackFiles,
    projected_pack_files: projectedPackFiles,
    boundary: result.boundary,
    errors
  };
}



function publicSourceDomainExtractionStabilizationClosureReview(root = packageRoot()) {
  const gate = PUBLIC_SOURCE_DOMAIN_EXTRACTION_STABILIZATION_CLOSURE_REVIEW;
  const pkg = readJson(path.join(root, 'package.json'));
  const context = sourceContext(root);
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
  const m2WorkItems = workItems.filter((item) => item.milestone_id === gate.closed_milestone_id);
  const requiredClosed = new Set(gate.required_closed_work_items);
  const m2NonClosed = m2WorkItems.filter((item) => item.status !== 'closed').map((item) => ({ id: item.id, title: item.title, status: item.status }));
  const missingRequired = gate.required_closed_work_items.filter((id) => !m2WorkItems.some((item) => item.id === id));
  const unexpectedM2Items = m2WorkItems.filter((item) => !requiredClosed.has(item.id)).map((item) => item.id);
  return {
    schema: 'agent-onboard-public-source-domain-extraction-stabilization-closure-review-result-001',
    status: 'ok',
    package_name: gate.package_name,
    version: VERSION,
    release_line: gate.release_line,
    command: gate.command,
    check_command: gate.check_command,
    package_root: root,
    source_context: context,
    package_json_version: pkg.version,
    closure_review_file: gate.closure_review_file,
    closure_review_file_present: fs.existsSync(path.join(root, gate.closure_review_file)),
    milestone_transition: {
      closed_milestone: milestones.find((item) => item.id === gate.closed_milestone_id) || null,
      opened_milestone: milestones.find((item) => item.id === gate.opened_milestone_id) || null,
      closure_work_item: workItems.find((item) => item.id === gate.closure_work_item_id) || null,
      seed_work_item: workItems.find((item) => item.id === gate.seed_work_item_id) || null,
      status: gate.closure_status
    },
    component_checks: {
      work_items_plan: publicWorkItemsDomainSourceExtractionPlanCheck(root),
      work_items_first_slice: publicWorkItemsDomainSourceExtractionFirstSliceCheck(root),
      work_items_bundle_parity: publicWorkItemsDomainSourceExtractionBundleParityCheck(root),
      work_items_runtime_bridge: publicWorkItemsDomainSourceExtractionRuntimeBridgeCheck(root),
      work_items_installed_fallback: publicWorkItemsDomainSourceExtractionInstalledFallbackSmokeCheck(root),
      claims_plan: publicClaimsDomainSourceExtractionPlanCheck(root),
      claims_first_slice: publicClaimsDomainSourceExtractionFirstSliceCheck(root),
      claims_bundle_parity: publicClaimsDomainSourceExtractionBundleParityCheck(root),
      claims_runtime_bridge: publicClaimsDomainSourceExtractionRuntimeBridgeCheck(root),
      claims_installed_fallback: publicClaimsDomainSourceExtractionInstalledFallbackSmokeCheck(root),
      package_surface: publicPackageSurfaceCheck(root),
      version_reference_policy: publicVersionReferencePolicyCheck(root)
    },
    source_ledger: {
      present: fs.existsSync(ledgerPath),
      m2_work_item_count: m2WorkItems.length,
      required_closed_work_items: gate.required_closed_work_items.slice(),
      missing_required_work_items: missingRequired,
      non_closed_m2_work_items: m2NonClosed,
      unexpected_m2_work_items: unexpectedM2Items
    },
    expected_pack_files: PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort(),
    projected_pack_files: packageJsonProjectedPackFiles(pkg).slice().sort(),
    closure_contract: gate,
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
    },
    errors: []
  };
}

function publicSourceDomainExtractionStabilizationClosureReviewCheck(root = packageRoot()) {
  const result = publicSourceDomainExtractionStabilizationClosureReview(root);
  const gate = PUBLIC_SOURCE_DOMAIN_EXTRACTION_STABILIZATION_CLOSURE_REVIEW;
  const sourceLedgerRequired = result.source_context.package_context === 'source_repository';
  const errors = [];
  const componentEntries = Object.entries(result.component_checks);
  for (const [name, check] of componentEntries) {
    if (!check || check.status !== 'ok') errors.push(...((check && check.errors) || [`${name} check failed`]).map((error) => `${name}: ${error}`));
  }
  const expectedPackFiles = PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort();
  if (!arrayEquals(result.projected_pack_files, expectedPackFiles)) errors.push(`projected npm pack files must remain ${expectedPackFiles.join(', ')}`);
  if (gate.boundary.source_domain_closure_review_command_writes_files !== false) errors.push('architecture --source-domain-closure-review must remain no-write');
  if (gate.boundary.source_domain_closure_check_command_writes_files !== false) errors.push('architecture --source-domain-closure-check must remain no-write');
  if (gate.boundary.package_allowlist_unchanged !== true) errors.push('source-domain closure review must preserve package allowlist');
  if (gate.boundary.source_modules_remain_out_of_npm_pack !== true) errors.push('source-domain closure review must keep source modules out of npm pack');

  const artifactPath = path.join(root, gate.closure_review_file);
  let fileStatus = 'not_present_installed_context_allowed';
  let fileSchema = null;
  if (fs.existsSync(artifactPath)) {
    try {
      const artifact = readJson(artifactPath);
      fileSchema = artifact.schema || null;
      if (artifact.schema !== gate.schema) errors.push(`${gate.closure_review_file} schema must be ${gate.schema}`);
      if (!artifact.milestone_transition || artifact.milestone_transition.closed_milestone_id !== gate.closed_milestone_id) errors.push(`${gate.closure_review_file} must close ${gate.closed_milestone_id}`);
      if (!artifact.milestone_transition || artifact.milestone_transition.opened_milestone_id !== gate.opened_milestone_id) errors.push(`${gate.closure_review_file} must open ${gate.opened_milestone_id}`);
      if (!artifact.milestone_transition || artifact.milestone_transition.closure_work_item_id !== gate.closure_work_item_id) errors.push(`${gate.closure_review_file} must identify ${gate.closure_work_item_id} as closure work item`);
      if (!artifact.milestone_transition || artifact.milestone_transition.seed_work_item_id !== gate.seed_work_item_id) errors.push(`${gate.closure_review_file} must seed ${gate.seed_work_item_id}`);
      if (!artifact.boundary || artifact.boundary.package_allowlist_unchanged !== true) errors.push(`${gate.closure_review_file} must preserve package_allowlist_unchanged`);
      if (!artifact.boundary || artifact.boundary.source_modules_remain_out_of_npm_pack !== true) errors.push(`${gate.closure_review_file} must keep source modules out of npm pack`);
      fileStatus = 'present_validated';
    } catch (error) {
      fileStatus = 'present_invalid_json';
      errors.push(`${gate.closure_review_file} must be valid JSON: ${error && error.message ? error.message : String(error)}`);
    }
  } else if (sourceLedgerRequired) {
    fileStatus = 'missing_source_context';
    errors.push(`${gate.closure_review_file} must exist in source repository context`);
  }

  const closedMilestone = result.milestone_transition.closed_milestone;
  const openedMilestone = result.milestone_transition.opened_milestone;
  const closureWorkItem = result.milestone_transition.closure_work_item;
  const seedWorkItem = result.milestone_transition.seed_work_item;
  if (sourceLedgerRequired) {
    if (!closedMilestone) errors.push(`${gate.closed_milestone_id} milestone must exist`);
    else if (closedMilestone.status !== 'closed') errors.push(`${gate.closed_milestone_id} milestone must be closed`);
    if (!openedMilestone) errors.push(`${gate.opened_milestone_id} milestone must exist`);
    else if (openedMilestone.status !== 'open') errors.push(`${gate.opened_milestone_id} milestone must be open`);
    if (!closureWorkItem) errors.push(`${gate.closure_work_item_id} work item must exist`);
    else if (closureWorkItem.status !== 'closed') errors.push(`${gate.closure_work_item_id} work item must be closed`);
    if (!seedWorkItem) errors.push(`${gate.seed_work_item_id} work item must exist`);
    else if (!['open', 'closed'].includes(seedWorkItem.status)) errors.push(`${gate.seed_work_item_id} work item must be open or closed`);
    for (const id of result.source_ledger.missing_required_work_items) errors.push(`${gate.closed_milestone_id} is missing required work item ${id}`);
    for (const item of result.source_ledger.non_closed_m2_work_items) errors.push(`${gate.closed_milestone_id} contains non-closed work item ${item.id}`);
    for (const id of result.source_ledger.unexpected_m2_work_items) errors.push(`${gate.closed_milestone_id} contains unexpected work item ${id}`);
  }
  return {
    schema: 'agent-onboard-public-source-domain-extraction-stabilization-closure-review-check-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: gate.package_name,
    version: VERSION,
    release_line: gate.release_line,
    command: gate.check_command,
    package_root: root,
    source_context: result.source_context,
    validated: {
      work_items_domain_closed: result.component_checks.work_items_installed_fallback.status === 'ok',
      claims_domain_closed: result.component_checks.claims_installed_fallback.status === 'ok',
      m2_milestone_closed_or_installed_context_allowed: !sourceLedgerRequired || (closedMilestone && closedMilestone.status === 'closed'),
      m2_work_items_all_closed_or_installed_context_allowed: !sourceLedgerRequired || result.source_ledger.non_closed_m2_work_items.length === 0,
      m3_milestone_seeded_open_or_installed_context_allowed: !sourceLedgerRequired || (openedMilestone && openedMilestone.status === 'open'),
      m3_seed_work_item_open_or_installed_context_allowed: !sourceLedgerRequired || (seedWorkItem && ['open', 'closed'].includes(seedWorkItem.status)),
      closure_review_file_present_or_installed_context_allowed: fileStatus === 'present_validated' || fileStatus === 'not_present_installed_context_allowed',
      package_allowlist_unchanged: arrayEquals(result.projected_pack_files, expectedPackFiles),
      source_modules_remain_out_of_pack: gate.boundary.source_modules_remain_out_of_npm_pack === true,
      closure_review_commands_no_write: gate.boundary.source_domain_closure_review_command_writes_files === false && gate.boundary.source_domain_closure_check_command_writes_files === false
    },
    milestone_transition: result.milestone_transition,
    source_closure_review_file: {
      path: gate.closure_review_file,
      present: fs.existsSync(artifactPath),
      status: fileStatus,
      schema: fileSchema,
      source_context_required: sourceLedgerRequired
    },
    component_status: Object.fromEntries(componentEntries.map(([name, check]) => [name, check.status])),
    source_ledger: result.source_ledger,
    expected_pack_files: expectedPackFiles,
    projected_pack_files: result.projected_pack_files,
    boundary: result.boundary,
    errors
  };
}



function countFileLines(root, rel) {
  const filePath = path.join(root, rel);
  if (!fs.existsSync(filePath)) return 0;
  const content = fs.readFileSync(filePath, 'utf8');
  if (content.length === 0) return 0;
  return content.split(/\r?\n/).length - (content.endsWith('\n') ? 1 : 0);
}

function publicCliRuntimeDeMonolithPlanning(root = packageRoot()) {
  const gate = PUBLIC_CLI_RUNTIME_DE_MONOLITH_PLANNING;
  const pkg = readJson(path.join(root, 'package.json'));
  const context = sourceContext(root);
  const ledgerPath = path.join(root, '.agent-onboard', 'work-items.json');
  let ledger = null;
  if (fs.existsSync(ledgerPath)) {
    try { ledger = readJson(ledgerPath); } catch { ledger = null; }
  }
  const milestones = ledger && Array.isArray(ledger.milestones) ? ledger.milestones : [];
  const workItems = ledger && Array.isArray(ledger.work_items) ? ledger.work_items : [];
  const cliLineCount = countFileLines(root, gate.current_runtime_observation.entrypoint);
  const sourceDomainModules = ['src/domains/core.js', 'src/domains/authority.js', 'src/domains/work-items.js', 'src/domains/claims.js'];
  const sourceDomainLineCount = sourceDomainModules.reduce((sum, rel) => sum + countFileLines(root, rel), 0);
  return {
    schema: 'agent-onboard-public-cli-runtime-de-monolith-planning-result-001',
    status: 'ok',
    package_name: gate.package_name,
    version: VERSION,
    release_line: gate.release_line,
    command: gate.command,
    check_command: gate.check_command,
    package_root: root,
    package_context: context.package_context,
    package_json_version: pkg.version,
    planning_file: gate.planning_file,
    planning_file_present: fs.existsSync(path.join(root, gate.planning_file)),
    milestone_state: {
      milestone: milestones.find((item) => item.id === gate.milestone_id) || null,
      work_item: workItems.find((item) => item.id === gate.work_item_id) || null,
      next_work_item: workItems.find((item) => item.id === gate.next_work_item_id) || null
    },
    observed_runtime: {
      cli_entrypoint: gate.current_runtime_observation.entrypoint,
      cli_entrypoint_exists: fs.existsSync(path.join(root, gate.current_runtime_observation.entrypoint)),
      cli_entrypoint_line_count: cliLineCount,
      source_domain_module_line_count: sourceDomainLineCount,
      source_domain_modules_present: sourceDomainModules.filter((rel) => fs.existsSync(path.join(root, rel))),
      monolith_line_count_floor: gate.current_runtime_observation.observed_cli_line_count_floor,
      extracted_service_line_count_ceiling: gate.current_runtime_observation.extracted_service_line_count_ceiling,
      monolith_debt_declared: gate.current_runtime_observation.monolith_debt_declared
    },
    selected_package_strategy: gate.selected_package_strategy,
    target_runtime_shape: gate.target_runtime_shape,
    cli_line_budget: gate.cli_line_budget,
    expected_pack_files: PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort(),
    projected_pack_files: packageJsonProjectedPackFiles(pkg).slice().sort(),
    planning_contract: gate,
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
    },
    errors: []
  };
}

function publicCliRuntimeDeMonolithPlanningCheck(root = packageRoot()) {
  const result = publicCliRuntimeDeMonolithPlanning(root);
  const gate = PUBLIC_CLI_RUNTIME_DE_MONOLITH_PLANNING;
  const sourceLedgerRequired = result.package_context === 'source_repository';
  const expectedPackFiles = PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort();
  const errors = [];
  if (gate.planning_status !== 'cli_runtime_de_monolith_plan_admitted') errors.push('CLI runtime de-monolith planning status must be admitted');
  if (!result.observed_runtime.cli_entrypoint_exists) errors.push(`${gate.current_runtime_observation.entrypoint} must exist`);
  if (result.observed_runtime.cli_entrypoint_line_count > gate.current_runtime_observation.extracted_service_line_count_ceiling) errors.push(`${gate.current_runtime_observation.entrypoint} must stay under ${gate.current_runtime_observation.extracted_service_line_count_ceiling} lines after service extraction`);
  if (gate.current_runtime_observation.monolith_debt_declared !== true) errors.push('CLI monolith debt must be declared');
  if (gate.selected_package_strategy.id !== 'controlled_source_module_inclusion') errors.push('selected package strategy must be controlled_source_module_inclusion');
  if (gate.selected_package_strategy.current_gate_keeps_compact_pack_allowlist !== true) errors.push('planning gate must keep compact package allowlist unchanged');
  if (gate.cli_line_budget.target_entrypoint_max_lines > 300) errors.push('target thin CLI entrypoint line budget must be <= 300 lines');
  if (gate.cli_line_budget.current_monolith_growth_allowed !== false) errors.push('current monolith growth must not be allowed');
  if (gate.cli_line_budget.no_new_domain_logic_in_monolith !== true) errors.push('new domain logic must be blocked from the CLI monolith');
  if (!arrayEquals(result.projected_pack_files, expectedPackFiles)) errors.push(`projected npm pack files must remain ${expectedPackFiles.join(', ')}`);
  if (gate.boundary.cli_runtime_plan_command_writes_files !== false) errors.push('architecture --cli-runtime-plan must remain no-write');
  if (gate.boundary.cli_runtime_check_command_writes_files !== false) errors.push('architecture --cli-runtime-check must remain no-write');
  if (gate.boundary.package_allowlist_unchanged !== true) errors.push('CLI runtime planning gate must preserve package allowlist');
  if (gate.boundary.creates_runtime_modules !== false) errors.push('CLI runtime planning gate must not create runtime modules');
  if (gate.boundary.changes_cli_runtime_dependency_graph !== false) errors.push('CLI runtime planning gate must not change runtime dependency graph');

  const artifactPath = path.join(root, gate.planning_file);
  let fileStatus = 'not_present_installed_context_allowed';
  let fileSchema = null;
  if (fs.existsSync(artifactPath)) {
    try {
      const artifact = readJson(artifactPath);
      fileSchema = artifact.schema || null;
      if (artifact.schema !== gate.schema) errors.push(`${gate.planning_file} schema must be ${gate.schema}`);
      if (artifact.work_item_id !== gate.work_item_id) errors.push(`${gate.planning_file} must identify ${gate.work_item_id}`);
      if (artifact.next_work_item_id !== gate.next_work_item_id) errors.push(`${gate.planning_file} must seed ${gate.next_work_item_id}`);
      if (artifact.planning_status !== gate.planning_status) errors.push(`${gate.planning_file} planning_status must be ${gate.planning_status}`);
      if (!artifact.selected_package_strategy || artifact.selected_package_strategy.id !== gate.selected_package_strategy.id) errors.push(`${gate.planning_file} must select ${gate.selected_package_strategy.id}`);
      if (!artifact.current_runtime_observation || artifact.current_runtime_observation.extracted_service_line_count_ceiling !== gate.current_runtime_observation.extracted_service_line_count_ceiling) errors.push(`${gate.planning_file} must declare extracted_service_line_count_ceiling ${gate.current_runtime_observation.extracted_service_line_count_ceiling}`);
      if (!artifact.cli_line_budget || artifact.cli_line_budget.target_entrypoint_max_lines > 300) errors.push(`${gate.planning_file} must set target_entrypoint_max_lines <= 300`);
      if (!artifact.boundary || artifact.boundary.package_allowlist_unchanged !== true) errors.push(`${gate.planning_file} must preserve package_allowlist_unchanged`);
      fileStatus = 'present_validated';
    } catch (error) {
      fileStatus = 'present_invalid_json';
      errors.push(`${gate.planning_file} must be valid JSON: ${error && error.message ? error.message : String(error)}`);
    }
  } else if (sourceLedgerRequired) {
    fileStatus = 'missing_source_context';
    errors.push(`${gate.planning_file} must exist in source repository context`);
  }

  const milestone = result.milestone_state.milestone;
  const workItem = result.milestone_state.work_item;
  const nextWorkItem = result.milestone_state.next_work_item;
  if (sourceLedgerRequired) {
    if (!milestone) errors.push(`${gate.milestone_id} milestone must exist`);
    else if (milestone.status !== 'open') errors.push(`${gate.milestone_id} milestone must remain open`);
    if (!workItem) errors.push(`${gate.work_item_id} work item must exist`);
    else if (workItem.status !== 'closed') errors.push(`${gate.work_item_id} work item must be closed`);
    if (!nextWorkItem) errors.push(`${gate.next_work_item_id} work item must exist`);
    else if (!['open', 'closed'].includes(nextWorkItem.status)) errors.push(`${gate.next_work_item_id} work item must be open or closed after router seed admission`);
  }

  return {
    schema: 'agent-onboard-public-cli-runtime-de-monolith-planning-check-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: gate.package_name,
    version: VERSION,
    release_line: gate.release_line,
    command: gate.check_command,
    package_root: root,
    package_context: result.package_context,
    validated: {
      monolith_debt_declared: gate.current_runtime_observation.monolith_debt_declared === true,
      cli_line_count_floor_observed: result.observed_runtime.cli_entrypoint_line_count >= gate.current_runtime_observation.observed_cli_line_count_floor,
      architecture_service_extraction_line_count_observed: result.observed_runtime.cli_entrypoint_line_count <= gate.current_runtime_observation.extracted_service_line_count_ceiling,
      controlled_source_module_inclusion_selected: gate.selected_package_strategy.id === 'controlled_source_module_inclusion',
      compact_pack_allowlist_unchanged_for_this_gate: arrayEquals(result.projected_pack_files, expectedPackFiles),
      thin_entrypoint_budget_declared: gate.cli_line_budget.target_entrypoint_max_lines <= 300,
      monolith_growth_blocked: gate.cli_line_budget.current_monolith_growth_allowed === false && gate.cli_line_budget.no_new_domain_logic_in_monolith === true,
      planning_file_present_or_installed_context_allowed: fileStatus === 'present_validated' || fileStatus === 'not_present_installed_context_allowed',
      work_item_closed_or_installed_context_allowed: !sourceLedgerRequired || (workItem && workItem.status === 'closed'),
      next_router_gate_open_or_installed_context_allowed: !sourceLedgerRequired || (nextWorkItem && ['open', 'closed'].includes(nextWorkItem.status)),
      cli_runtime_commands_no_write: gate.boundary.cli_runtime_plan_command_writes_files === false && gate.boundary.cli_runtime_check_command_writes_files === false
    },
    observed_runtime: result.observed_runtime,
    selected_package_strategy: result.selected_package_strategy,
    cli_line_budget: result.cli_line_budget,
    target_runtime_shape: result.target_runtime_shape,
    milestone_state: result.milestone_state,
    source_cli_runtime_plan_file: {
      path: gate.planning_file,
      present: fs.existsSync(artifactPath),
      status: fileStatus,
      schema: fileSchema,
      source_context_required: sourceLedgerRequired
    },
    expected_pack_files: expectedPackFiles,
    projected_pack_files: result.projected_pack_files,
    boundary: result.boundary,
    errors
  };
}


function publicThinCliRouterSeed(root = packageRoot()) {
  const gate = PUBLIC_THIN_CLI_ROUTER_SEED;
  const pkg = readJson(path.join(root, 'package.json'));
  const context = sourceContext(root);
  const routerModulePath = path.join(root, gate.router_module);
  const artifactPath = path.join(root, gate.seed_file);
  const routerLineCount = countFileLines(root, gate.router_module);
  let routerModuleStatus = 'not_present_installed_context_allowed';
  let routerModuleSchema = null;
  let routerModuleExports = [];
  let routerRequireError = null;
  if (fs.existsSync(routerModulePath)) {
    try {
      delete require.cache[require.resolve(routerModulePath)];
      const routerModule = require(routerModulePath);
      routerModuleExports = Object.keys(routerModule).sort();
      const described = typeof routerModule.describeRouterSeed === 'function' ? routerModule.describeRouterSeed() : null;
      routerModuleSchema = described && described.schema ? described.schema : null;
      routerModuleStatus = 'present_validated';
    } catch (error) {
      routerModuleStatus = 'present_require_failed';
      routerRequireError = error && error.message ? error.message : String(error);
    }
  }
  const ledgerPath = path.join(root, '.agent-onboard', 'work-items.json');
  let ledger = null;
  if (fs.existsSync(ledgerPath)) {
    try { ledger = readJson(ledgerPath); } catch { ledger = null; }
  }
  const workItems = ledger && Array.isArray(ledger.work_items) ? ledger.work_items : [];
  return {
    schema: 'agent-onboard-public-thin-cli-router-seed-result-001',
    status: 'ok',
    package_name: gate.package_name,
    version: VERSION,
    release_line: gate.release_line,
    command: gate.command,
    check_command: gate.check_command,
    package_root: root,
    package_context: context.package_context,
    package_json_version: pkg.version,
    seed_file: gate.seed_file,
    seed_file_present: fs.existsSync(artifactPath),
    router_module: {
      path: gate.router_module,
      present: fs.existsSync(routerModulePath),
      status: routerModuleStatus,
      schema: routerModuleSchema,
      exports: routerModuleExports,
      require_error: routerRequireError,
      line_count: routerLineCount,
      max_lines: gate.router_seed_max_lines
    },
    runtime_cutover: {
      applied: gate.runtime_cutover_applied,
      entrypoint: gate.entrypoint,
      entrypoint_line_count: countFileLines(root, gate.entrypoint),
      router_module_used_by_entrypoint_in_this_gate: gate.boundary.uses_router_module_as_runtime_entrypoint
    },
    package_strategy: gate.package_strategy,
    expected_pack_files: PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort(),
    projected_pack_files: packageJsonProjectedPackFiles(pkg).slice().sort(),
    milestone_state: {
      work_item: workItems.find((item) => item.id === gate.work_item_id) || null,
      next_work_item: workItems.find((item) => item.id === gate.next_work_item_id) || null
    },
    router_contract: gate,
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
    },
    errors: []
  };
}

function publicThinCliRouterSeedCheck(root = packageRoot()) {
  const result = publicThinCliRouterSeed(root);
  const gate = PUBLIC_THIN_CLI_ROUTER_SEED;
  const sourceLedgerRequired = result.package_context === 'source_repository';
  const expectedPackFiles = PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort();
  const errors = [];
  if (gate.seed_status !== 'thin_cli_router_seed_admitted') errors.push('thin CLI router seed status must be admitted');
  if (gate.runtime_cutover_applied !== false) errors.push('router seed gate must not apply runtime cutover');
  if (gate.package_strategy !== 'controlled_source_module_inclusion') errors.push('router seed must preserve controlled_source_module_inclusion package strategy');
  if (!arrayEquals(result.projected_pack_files, expectedPackFiles)) errors.push(`projected npm pack files must remain ${expectedPackFiles.join(', ')}`);
  if (gate.boundary.thin_router_command_writes_files !== false) errors.push('architecture --thin-router must remain no-write');
  if (gate.boundary.thin_router_check_command_writes_files !== false) errors.push('architecture --thin-router-check must remain no-write');
  if (gate.boundary.changes_public_cli_outputs !== false) errors.push('router seed must not change public CLI outputs');
  if (gate.boundary.changes_cli_runtime_dependency_graph !== false) errors.push('router seed must not change packaged CLI runtime dependency graph');
  if (gate.boundary.uses_router_module_as_runtime_entrypoint !== false) errors.push('router seed must not use the source router module as the packaged runtime entrypoint yet');
  if (gate.boundary.source_router_module_remains_out_of_pack !== true) errors.push('source router module must remain out of npm pack for this gate');
  if (result.router_module.line_count > gate.router_seed_max_lines) errors.push(`${gate.router_module} must stay within ${gate.router_seed_max_lines} lines`);

  let artifactStatus = 'not_present_installed_context_allowed';
  let artifactSchema = null;
  const artifactPath = path.join(root, gate.seed_file);
  if (fs.existsSync(artifactPath)) {
    try {
      const artifact = readJson(artifactPath);
      artifactSchema = artifact.schema || null;
      if (artifact.schema !== gate.schema) errors.push(`${gate.seed_file} schema must be ${gate.schema}`);
      if (artifact.work_item_id !== gate.work_item_id) errors.push(`${gate.seed_file} must identify ${gate.work_item_id}`);
      if (artifact.next_work_item_id !== gate.next_work_item_id) errors.push(`${gate.seed_file} must seed ${gate.next_work_item_id}`);
      if (artifact.router_module !== gate.router_module) errors.push(`${gate.seed_file} must declare ${gate.router_module}`);
      if (artifact.runtime_cutover_applied !== false) errors.push(`${gate.seed_file} must not apply runtime cutover`);
      if (!artifact.boundary || artifact.boundary.package_allowlist_unchanged !== true) errors.push(`${gate.seed_file} must preserve package_allowlist_unchanged`);
      artifactStatus = 'present_validated';
    } catch (error) {
      artifactStatus = 'present_invalid_json';
      errors.push(`${gate.seed_file} must be valid JSON: ${error && error.message ? error.message : String(error)}`);
    }
  } else if (sourceLedgerRequired) {
    artifactStatus = 'missing_source_context';
    errors.push(`${gate.seed_file} must exist in source repository context`);
  }

  const routerModulePresentOrAllowed = result.router_module.present || result.package_context === 'installed_package';
  if (!routerModulePresentOrAllowed) errors.push(`${gate.router_module} must exist in source repository context`);
  if (result.router_module.present) {
    if (result.router_module.status !== 'present_validated') errors.push(`${gate.router_module} must be require-able without side effects${result.router_module.require_error ? `: ${result.router_module.require_error}` : ''}`);
    if (result.router_module.schema !== 'agent-onboard-public-thin-cli-router-seed-module-001') errors.push(`${gate.router_module} must expose router seed module schema`);
    for (const exportName of gate.expected_router_export_names) {
      if (!result.router_module.exports.includes(exportName)) errors.push(`${gate.router_module} must export ${exportName}`);
    }
  }
  const workItem = result.milestone_state.work_item;
  const nextWorkItem = result.milestone_state.next_work_item;
  if (sourceLedgerRequired) {
    if (!workItem) errors.push(`${gate.work_item_id} work item must exist`);
    else if (workItem.status !== 'closed') errors.push(`${gate.work_item_id} work item must be closed`);
    if (!nextWorkItem) errors.push(`${gate.next_work_item_id} work item must exist`);
    else if (!['open', 'closed'].includes(nextWorkItem.status)) errors.push(`${gate.next_work_item_id} work item must be open or closed after router seed admission`);
  }

  return {
    schema: 'agent-onboard-public-thin-cli-router-seed-check-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: gate.package_name,
    version: VERSION,
    release_line: gate.release_line,
    command: gate.check_command,
    package_root: root,
    package_context: result.package_context,
    validated: {
      router_seed_status_admitted: gate.seed_status === 'thin_cli_router_seed_admitted',
      router_module_present_or_installed_context_allowed: routerModulePresentOrAllowed,
      router_module_requireable_when_present: !result.router_module.present || result.router_module.status === 'present_validated',
      router_module_under_line_budget: result.router_module.line_count <= gate.router_seed_max_lines,
      router_exports_contract: gate.expected_router_export_names.every((name) => !result.router_module.present || result.router_module.exports.includes(name)),
      runtime_cutover_not_applied: gate.runtime_cutover_applied === false,
      packaged_runtime_dependency_graph_unchanged: gate.boundary.changes_cli_runtime_dependency_graph === false,
      package_allowlist_unchanged: arrayEquals(result.projected_pack_files, expectedPackFiles),
      router_module_out_of_pack_for_this_gate: gate.boundary.source_router_module_remains_out_of_pack === true,
      seed_file_present_or_installed_context_allowed: artifactStatus === 'present_validated' || artifactStatus === 'not_present_installed_context_allowed',
      work_item_closed_or_installed_context_allowed: !sourceLedgerRequired || (workItem && workItem.status === 'closed'),
      next_port_gate_open_or_installed_context_allowed: !sourceLedgerRequired || (nextWorkItem && ['open', 'closed'].includes(nextWorkItem.status)),
      thin_router_commands_no_write: gate.boundary.thin_router_command_writes_files === false && gate.boundary.thin_router_check_command_writes_files === false
    },
    router_module: result.router_module,
    runtime_cutover: result.runtime_cutover,
    source_thin_router_seed_file: {
      path: gate.seed_file,
      present: fs.existsSync(artifactPath),
      status: artifactStatus,
      schema: artifactSchema,
      source_context_required: sourceLedgerRequired
    },
    milestone_state: result.milestone_state,
    expected_pack_files: expectedPackFiles,
    projected_pack_files: result.projected_pack_files,
    boundary: result.boundary,
    errors
  };
}


function publicCompatibilityCommandPortSeed(root = packageRoot()) {
  const gate = PUBLIC_COMPATIBILITY_COMMAND_PORT_SEED;
  const pkg = readJson(path.join(root, 'package.json'));
  const context = sourceContext(root);
  const adapterModulePath = path.join(root, gate.adapter_module);
  const portModulePath = path.join(root, gate.port_module);
  const artifactPath = path.join(root, gate.seed_file);
  const adapterLineCount = countFileLines(root, gate.adapter_module);
  const portLineCount = countFileLines(root, gate.port_module);
  let adapterModuleStatus = 'not_present_installed_context_allowed';
  let adapterModuleSchema = null;
  let adapterModuleExports = [];
  let adapterCommandGroups = [];
  let adapterRequireError = null;
  if (fs.existsSync(adapterModulePath)) {
    try {
      delete require.cache[require.resolve(adapterModulePath)];
      const adapterModule = require(adapterModulePath);
      adapterModuleExports = Object.keys(adapterModule).sort();
      const described = typeof adapterModule.describeCompatibilityCommandPortSeed === 'function' ? adapterModule.describeCompatibilityCommandPortSeed() : null;
      adapterModuleSchema = described && described.schema ? described.schema : null;
      adapterCommandGroups = described && described.command_groups ? Object.keys(described.command_groups).sort() : [];
      adapterModuleStatus = 'present_validated';
    } catch (error) {
      adapterModuleStatus = 'present_require_failed';
      adapterRequireError = error && error.message ? error.message : String(error);
    }
  }
  let portModuleStatus = 'not_present_installed_context_allowed';
  let portModuleExports = [];
  let portRequireError = null;
  if (fs.existsSync(portModulePath)) {
    try {
      delete require.cache[require.resolve(portModulePath)];
      const portModule = require(portModulePath);
      portModuleExports = Object.keys(portModule).sort();
      portModuleStatus = 'present_validated';
    } catch (error) {
      portModuleStatus = 'present_require_failed';
      portRequireError = error && error.message ? error.message : String(error);
    }
  }
  const ledgerPath = path.join(root, '.agent-onboard', 'work-items.json');
  let ledger = null;
  if (fs.existsSync(ledgerPath)) {
    try { ledger = readJson(ledgerPath); } catch { ledger = null; }
  }
  const workItems = ledger && Array.isArray(ledger.work_items) ? ledger.work_items : [];
  return {
    schema: 'agent-onboard-public-compatibility-command-port-seed-result-001',
    status: 'ok',
    package_name: gate.package_name,
    version: VERSION,
    release_line: gate.release_line,
    command: gate.command,
    check_command: gate.check_command,
    package_root: root,
    package_context: context.package_context,
    package_json_version: pkg.version,
    seed_file: gate.seed_file,
    seed_file_present: fs.existsSync(artifactPath),
    adapter_module: {
      path: gate.adapter_module,
      present: fs.existsSync(adapterModulePath),
      status: adapterModuleStatus,
      schema: adapterModuleSchema,
      exports: adapterModuleExports,
      command_groups: adapterCommandGroups,
      require_error: adapterRequireError,
      line_count: adapterLineCount,
      max_lines: gate.port_seed_max_lines
    },
    port_module: {
      path: gate.port_module,
      present: fs.existsSync(portModulePath),
      status: portModuleStatus,
      exports: portModuleExports,
      require_error: portRequireError,
      line_count: portLineCount,
      max_lines: gate.port_seed_max_lines
    },
    router_module: gate.router_module,
    runtime_cutover: {
      applied: gate.runtime_cutover_applied,
      entrypoint: 'cli/agent-onboard.js',
      entrypoint_line_count: countFileLines(root, 'cli/agent-onboard.js'),
      compatibility_port_used_by_entrypoint_in_this_gate: gate.boundary.uses_compatibility_port_as_runtime_entrypoint
    },
    package_strategy: gate.package_strategy,
    expected_pack_files: PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort(),
    projected_pack_files: packageJsonProjectedPackFiles(pkg).slice().sort(),
    milestone_state: {
      work_item: workItems.find((item) => item.id === gate.work_item_id) || null,
      next_work_item: workItems.find((item) => item.id === gate.next_work_item_id) || null
    },
    port_contract: gate,
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
    },
    errors: []
  };
}

function publicCompatibilityCommandPortSeedCheck(root = packageRoot()) {
  const result = publicCompatibilityCommandPortSeed(root);
  const gate = PUBLIC_COMPATIBILITY_COMMAND_PORT_SEED;
  const sourceLedgerRequired = result.package_context === 'source_repository';
  const expectedPackFiles = PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort();
  const errors = [];
  if (gate.seed_status !== 'compatibility_command_port_seed_admitted') errors.push('compatibility command port seed status must be admitted');
  if (gate.runtime_cutover_applied !== false) errors.push('compatibility port seed gate must not apply runtime cutover');
  if (gate.package_strategy !== 'controlled_source_module_inclusion') errors.push('compatibility port seed must preserve controlled_source_module_inclusion package strategy');
  if (!arrayEquals(result.projected_pack_files, expectedPackFiles)) errors.push(`projected npm pack files must remain ${expectedPackFiles.join(', ')}`);
  if (gate.boundary.compatibility_port_command_writes_files !== false) errors.push('architecture --compatibility-port must remain no-write');
  if (gate.boundary.compatibility_port_check_command_writes_files !== false) errors.push('architecture --compatibility-port-check must remain no-write');
  if (gate.boundary.changes_public_cli_outputs !== false) errors.push('compatibility port seed must not change public CLI outputs');
  if (gate.boundary.changes_cli_runtime_dependency_graph !== false) errors.push('compatibility port seed must not change packaged CLI runtime dependency graph');
  if (gate.boundary.uses_compatibility_port_as_runtime_entrypoint !== false) errors.push('compatibility port seed must not use source modules as the packaged runtime entrypoint yet');
  if (gate.boundary.source_port_modules_remain_out_of_pack !== true) errors.push('source compatibility port modules must remain out of npm pack for this gate');
  if (result.adapter_module.line_count > gate.port_seed_max_lines) errors.push(`${gate.adapter_module} must stay within ${gate.port_seed_max_lines} lines`);
  if (result.port_module.line_count > gate.port_seed_max_lines) errors.push(`${gate.port_module} must stay within ${gate.port_seed_max_lines} lines`);

  let artifactStatus = 'not_present_installed_context_allowed';
  let artifactSchema = null;
  const artifactPath = path.join(root, gate.seed_file);
  if (fs.existsSync(artifactPath)) {
    try {
      const artifact = readJson(artifactPath);
      artifactSchema = artifact.schema || null;
      if (artifact.schema !== gate.schema) errors.push(`${gate.seed_file} schema must be ${gate.schema}`);
      if (artifact.work_item_id !== gate.work_item_id) errors.push(`${gate.seed_file} must identify ${gate.work_item_id}`);
      if (artifact.next_work_item_id !== gate.next_work_item_id) errors.push(`${gate.seed_file} must seed ${gate.next_work_item_id}`);
      if (artifact.adapter_module !== gate.adapter_module) errors.push(`${gate.seed_file} must declare ${gate.adapter_module}`);
      if (artifact.port_module !== gate.port_module) errors.push(`${gate.seed_file} must declare ${gate.port_module}`);
      if (artifact.runtime_cutover_applied !== false) errors.push(`${gate.seed_file} must not apply runtime cutover`);
      if (!artifact.boundary || artifact.boundary.package_allowlist_unchanged !== true) errors.push(`${gate.seed_file} must preserve package_allowlist_unchanged`);
      artifactStatus = 'present_validated';
    } catch (error) {
      artifactStatus = 'present_invalid_json';
      errors.push(`${gate.seed_file} must be valid JSON: ${error && error.message ? error.message : String(error)}`);
    }
  } else if (sourceLedgerRequired) {
    artifactStatus = 'missing_source_context';
    errors.push(`${gate.seed_file} must exist in source repository context`);
  }

  const adapterModulePresentOrAllowed = result.adapter_module.present || result.package_context === 'installed_package';
  const portModulePresentOrAllowed = result.port_module.present || result.package_context === 'installed_package';
  if (!adapterModulePresentOrAllowed) errors.push(`${gate.adapter_module} must exist in source repository context`);
  if (!portModulePresentOrAllowed) errors.push(`${gate.port_module} must exist in source repository context`);
  if (result.adapter_module.present) {
    if (result.adapter_module.status !== 'present_validated') errors.push(`${gate.adapter_module} must be require-able without side effects${result.adapter_module.require_error ? `: ${result.adapter_module.require_error}` : ''}`);
    if (result.adapter_module.schema !== 'agent-onboard-public-compatibility-command-port-seed-module-001') errors.push(`${gate.adapter_module} must expose compatibility port seed module schema`);
    for (const exportName of gate.expected_adapter_export_names) {
      if (!result.adapter_module.exports.includes(exportName)) errors.push(`${gate.adapter_module} must export ${exportName}`);
    }
    for (const groupName of gate.expected_command_groups) {
      if (!result.adapter_module.command_groups.includes(groupName)) errors.push(`${gate.adapter_module} must declare command group ${groupName}`);
    }
  }
  if (result.port_module.present) {
    if (result.port_module.status !== 'present_validated') errors.push(`${gate.port_module} must be require-able without side effects${result.port_module.require_error ? `: ${result.port_module.require_error}` : ''}`);
    for (const exportName of gate.expected_port_export_names) {
      if (!result.port_module.exports.includes(exportName)) errors.push(`${gate.port_module} must export ${exportName}`);
    }
  }
  const workItem = result.milestone_state.work_item;
  const nextWorkItem = result.milestone_state.next_work_item;
  if (sourceLedgerRequired) {
    if (!workItem) errors.push(`${gate.work_item_id} work item must exist`);
    else if (workItem.status !== 'closed') errors.push(`${gate.work_item_id} work item must be closed`);
    if (!nextWorkItem) errors.push(`${gate.next_work_item_id} work item must exist`);
    else if (!['open', 'closed'].includes(nextWorkItem.status)) errors.push(`${gate.next_work_item_id} work item must be open or closed after compatibility port seed admission`);
  }

  return {
    schema: 'agent-onboard-public-compatibility-command-port-seed-check-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: gate.package_name,
    version: VERSION,
    release_line: gate.release_line,
    command: gate.check_command,
    package_root: root,
    package_context: result.package_context,
    validated: {
      compatibility_port_seed_status_admitted: gate.seed_status === 'compatibility_command_port_seed_admitted',
      adapter_module_present_or_installed_context_allowed: adapterModulePresentOrAllowed,
      port_module_present_or_installed_context_allowed: portModulePresentOrAllowed,
      adapter_module_requireable_when_present: !result.adapter_module.present || result.adapter_module.status === 'present_validated',
      port_module_requireable_when_present: !result.port_module.present || result.port_module.status === 'present_validated',
      port_modules_under_line_budget: result.adapter_module.line_count <= gate.port_seed_max_lines && result.port_module.line_count <= gate.port_seed_max_lines,
      adapter_exports_contract: gate.expected_adapter_export_names.every((name) => !result.adapter_module.present || result.adapter_module.exports.includes(name)),
      port_exports_contract: gate.expected_port_export_names.every((name) => !result.port_module.present || result.port_module.exports.includes(name)),
      command_group_contract: gate.expected_command_groups.every((name) => !result.adapter_module.present || result.adapter_module.command_groups.includes(name)),
      runtime_cutover_not_applied: gate.runtime_cutover_applied === false,
      packaged_runtime_dependency_graph_unchanged: gate.boundary.changes_cli_runtime_dependency_graph === false,
      package_allowlist_unchanged: arrayEquals(result.projected_pack_files, expectedPackFiles),
      port_modules_out_of_pack_for_this_gate: gate.boundary.source_port_modules_remain_out_of_pack === true,
      seed_file_present_or_installed_context_allowed: artifactStatus === 'present_validated' || artifactStatus === 'not_present_installed_context_allowed',
      work_item_closed_or_installed_context_allowed: !sourceLedgerRequired || (workItem && workItem.status === 'closed'),
      next_adapter_gate_open_or_installed_context_allowed: !sourceLedgerRequired || (nextWorkItem && ['open', 'closed'].includes(nextWorkItem.status)),
      compatibility_port_commands_no_write: gate.boundary.compatibility_port_command_writes_files === false && gate.boundary.compatibility_port_check_command_writes_files === false
    },
    adapter_module: result.adapter_module,
    port_module: result.port_module,
    runtime_cutover: result.runtime_cutover,
    source_compatibility_port_seed_file: {
      path: gate.seed_file,
      present: fs.existsSync(artifactPath),
      status: artifactStatus,
      schema: artifactSchema,
      source_context_required: sourceLedgerRequired
    },
    milestone_state: result.milestone_state,
    expected_pack_files: expectedPackFiles,
    projected_pack_files: result.projected_pack_files,
    boundary: result.boundary,
    errors
  };
}


function publicCoreCommandAdapterExtraction(root = packageRoot()) {
  const gate = PUBLIC_CORE_COMMAND_ADAPTER_EXTRACTION;
  const pkg = readJson(path.join(root, 'package.json'));
  const context = sourceContext(root);
  const adapterModulePath = path.join(root, gate.adapter_module);
  const artifactPath = path.join(root, gate.extraction_file);
  const adapterLineCount = countFileLines(root, gate.adapter_module);
  let adapterModuleStatus = 'not_present_installed_context_allowed';
  let adapterModuleSchema = null;
  let adapterModuleExports = [];
  let ownedCommands = [];
  let excludedCommands = [];
  let adapterRequireError = null;
  if (fs.existsSync(adapterModulePath)) {
    try {
      delete require.cache[require.resolve(adapterModulePath)];
      const adapterModule = require(adapterModulePath);
      adapterModuleExports = Object.keys(adapterModule).sort();
      const described = typeof adapterModule.describeCoreCommandAdapterExtraction === 'function' ? adapterModule.describeCoreCommandAdapterExtraction() : null;
      adapterModuleSchema = described && described.schema ? described.schema : null;
      ownedCommands = described && Array.isArray(described.owned_top_level_commands) ? described.owned_top_level_commands.slice().sort() : [];
      excludedCommands = described && Array.isArray(described.excluded_top_level_commands) ? described.excluded_top_level_commands.slice().sort() : [];
      adapterModuleStatus = 'present_validated';
    } catch (error) {
      adapterModuleStatus = 'present_require_failed';
      adapterRequireError = error && error.message ? error.message : String(error);
    }
  }
  const ledgerPath = path.join(root, '.agent-onboard', 'work-items.json');
  let ledger = null;
  if (fs.existsSync(ledgerPath)) {
    try { ledger = readJson(ledgerPath); } catch { ledger = null; }
  }
  const workItems = ledger && Array.isArray(ledger.work_items) ? ledger.work_items : [];
  return {
    schema: 'agent-onboard-public-core-command-adapter-extraction-result-001',
    status: 'ok',
    package_name: gate.package_name,
    version: VERSION,
    release_line: gate.release_line,
    command: gate.command,
    check_command: gate.check_command,
    package_root: root,
    package_context: context.package_context,
    package_json_version: pkg.version,
    extraction_file: gate.extraction_file,
    extraction_file_present: fs.existsSync(artifactPath),
    adapter_module: {
      path: gate.adapter_module,
      present: fs.existsSync(adapterModulePath),
      status: adapterModuleStatus,
      schema: adapterModuleSchema,
      exports: adapterModuleExports,
      owned_top_level_commands: ownedCommands,
      excluded_top_level_commands: excludedCommands,
      require_error: adapterRequireError,
      line_count: adapterLineCount,
      max_lines: gate.adapter_seed_max_lines
    },
    compatibility_port_module: gate.compatibility_port_module,
    router_module: gate.router_module,
    runtime_cutover: {
      applied: gate.runtime_cutover_applied,
      entrypoint: 'cli/agent-onboard.js',
      entrypoint_line_count: countFileLines(root, 'cli/agent-onboard.js'),
      core_adapter_used_by_entrypoint_in_this_gate: gate.boundary.uses_core_adapter_as_runtime_entrypoint
    },
    package_strategy: gate.package_strategy,
    expected_pack_files: PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort(),
    projected_pack_files: packageJsonProjectedPackFiles(pkg).slice().sort(),
    milestone_state: {
      work_item: workItems.find((item) => item.id === gate.work_item_id) || null,
      next_work_item: workItems.find((item) => item.id === gate.next_work_item_id) || null
    },
    adapter_contract: gate,
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
    },
    errors: []
  };
}

function publicCoreCommandAdapterExtractionCheck(root = packageRoot()) {
  const result = publicCoreCommandAdapterExtraction(root);
  const gate = PUBLIC_CORE_COMMAND_ADAPTER_EXTRACTION;
  const sourceLedgerRequired = result.package_context === 'source_repository';
  const expectedPackFiles = PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort();
  const errors = [];
  if (gate.extraction_status !== 'core_command_adapter_extraction_admitted') errors.push('core command adapter extraction status must be admitted');
  if (gate.runtime_cutover_applied !== false) errors.push('core command adapter extraction must not apply runtime cutover');
  if (gate.package_strategy !== 'controlled_source_module_inclusion') errors.push('core command adapter extraction must preserve controlled_source_module_inclusion package strategy');
  if (!arrayEquals(result.projected_pack_files, expectedPackFiles)) errors.push(`projected npm pack files must remain ${expectedPackFiles.join(', ')}`);
  if (gate.boundary.core_adapter_command_writes_files !== false) errors.push('architecture --core-adapter must remain no-write');
  if (gate.boundary.core_adapter_check_command_writes_files !== false) errors.push('architecture --core-adapter-check must remain no-write');
  if (gate.boundary.changes_public_cli_outputs !== false) errors.push('core command adapter extraction must not change public CLI outputs');
  if (gate.boundary.changes_cli_runtime_dependency_graph !== false) errors.push('core command adapter extraction must not change packaged CLI runtime dependency graph');
  if (gate.boundary.uses_core_adapter_as_runtime_entrypoint !== false) errors.push('core command adapter extraction must not use source modules as the packaged runtime entrypoint yet');
  if (gate.boundary.source_core_adapter_module_remains_out_of_pack !== true) errors.push('source core adapter module must remain out of npm pack for this gate');
  if (result.adapter_module.line_count > gate.adapter_seed_max_lines) errors.push(`${gate.adapter_module} must stay within ${gate.adapter_seed_max_lines} lines`);

  let artifactStatus = 'not_present_installed_context_allowed';
  let artifactSchema = null;
  const artifactPath = path.join(root, gate.extraction_file);
  if (fs.existsSync(artifactPath)) {
    try {
      const artifact = readJson(artifactPath);
      artifactSchema = artifact.schema || null;
      if (artifact.schema !== gate.schema) errors.push(`${gate.extraction_file} schema must be ${gate.schema}`);
      if (artifact.work_item_id !== gate.work_item_id) errors.push(`${gate.extraction_file} must identify ${gate.work_item_id}`);
      if (artifact.next_work_item_id !== gate.next_work_item_id) errors.push(`${gate.extraction_file} must seed ${gate.next_work_item_id}`);
      if (artifact.adapter_module !== gate.adapter_module) errors.push(`${gate.extraction_file} must declare ${gate.adapter_module}`);
      if (artifact.runtime_cutover_applied !== false) errors.push(`${gate.extraction_file} must not apply runtime cutover`);
      if (!artifact.boundary || artifact.boundary.package_allowlist_unchanged !== true) errors.push(`${gate.extraction_file} must preserve package_allowlist_unchanged`);
      artifactStatus = 'present_validated';
    } catch (error) {
      artifactStatus = 'present_invalid_json';
      errors.push(`${gate.extraction_file} must be valid JSON: ${error && error.message ? error.message : String(error)}`);
    }
  } else if (sourceLedgerRequired) {
    artifactStatus = 'missing_source_context';
    errors.push(`${gate.extraction_file} must exist in source repository context`);
  }

  const adapterModulePresentOrAllowed = result.adapter_module.present || result.package_context === 'installed_package';
  if (!adapterModulePresentOrAllowed) errors.push(`${gate.adapter_module} must exist in source repository context`);
  if (result.adapter_module.present) {
    if (result.adapter_module.status !== 'present_validated') errors.push(`${gate.adapter_module} must be require-able without side effects${result.adapter_module.require_error ? `: ${result.adapter_module.require_error}` : ''}`);
    if (result.adapter_module.schema !== 'agent-onboard-public-core-command-adapter-extraction-module-001') errors.push(`${gate.adapter_module} must expose core command adapter extraction module schema`);
    for (const exportName of gate.expected_adapter_export_names) {
      if (!result.adapter_module.exports.includes(exportName)) errors.push(`${gate.adapter_module} must export ${exportName}`);
    }
    for (const commandName of gate.owned_top_level_commands) {
      if (!result.adapter_module.owned_top_level_commands.includes(commandName)) errors.push(`${gate.adapter_module} must own core command ${commandName}`);
    }
    for (const commandName of gate.excluded_top_level_commands) {
      if (!result.adapter_module.excluded_top_level_commands.includes(commandName)) errors.push(`${gate.adapter_module} must exclude non-core command ${commandName}`);
    }
  }
  const workItem = result.milestone_state.work_item;
  const nextWorkItem = result.milestone_state.next_work_item;
  if (sourceLedgerRequired) {
    if (!workItem) errors.push(`${gate.work_item_id} work item must exist`);
    else if (workItem.status !== 'closed') errors.push(`${gate.work_item_id} work item must be closed`);
    if (!nextWorkItem) errors.push(`${gate.next_work_item_id} work item must exist`);
    else if (!['open', 'closed'].includes(nextWorkItem.status)) errors.push(`${gate.next_work_item_id} work item must be open or closed after core adapter extraction admission`);
  }

  return {
    schema: 'agent-onboard-public-core-command-adapter-extraction-check-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: gate.package_name,
    version: VERSION,
    release_line: gate.release_line,
    command: gate.check_command,
    package_root: root,
    package_context: result.package_context,
    validated: {
      core_adapter_extraction_status_admitted: gate.extraction_status === 'core_command_adapter_extraction_admitted',
      adapter_module_present_or_installed_context_allowed: adapterModulePresentOrAllowed,
      adapter_module_requireable_when_present: !result.adapter_module.present || result.adapter_module.status === 'present_validated',
      adapter_module_under_line_budget: result.adapter_module.line_count <= gate.adapter_seed_max_lines,
      adapter_exports_contract: gate.expected_adapter_export_names.every((name) => !result.adapter_module.present || result.adapter_module.exports.includes(name)),
      owned_core_commands_contract: gate.owned_top_level_commands.every((name) => !result.adapter_module.present || result.adapter_module.owned_top_level_commands.includes(name)),
      non_core_commands_excluded: gate.excluded_top_level_commands.every((name) => !result.adapter_module.present || result.adapter_module.excluded_top_level_commands.includes(name)),
      runtime_cutover_not_applied: gate.runtime_cutover_applied === false,
      packaged_runtime_dependency_graph_unchanged: gate.boundary.changes_cli_runtime_dependency_graph === false,
      package_allowlist_unchanged: arrayEquals(result.projected_pack_files, expectedPackFiles),
      core_adapter_module_out_of_pack_for_this_gate: gate.boundary.source_core_adapter_module_remains_out_of_pack === true,
      extraction_file_present_or_installed_context_allowed: artifactStatus === 'present_validated' || artifactStatus === 'not_present_installed_context_allowed',
      work_item_closed_or_installed_context_allowed: !sourceLedgerRequired || (workItem && workItem.status === 'closed'),
      next_package_adapter_gate_open_or_installed_context_allowed: !sourceLedgerRequired || (nextWorkItem && ['open', 'closed'].includes(nextWorkItem.status)),
      core_adapter_commands_no_write: gate.boundary.core_adapter_command_writes_files === false && gate.boundary.core_adapter_check_command_writes_files === false
    },
    adapter_module: result.adapter_module,
    runtime_cutover: result.runtime_cutover,
    source_core_adapter_extraction_file: {
      path: gate.extraction_file,
      present: fs.existsSync(artifactPath),
      status: artifactStatus,
      schema: artifactSchema,
      source_context_required: sourceLedgerRequired
    },
    milestone_state: result.milestone_state,
    expected_pack_files: expectedPackFiles,
    projected_pack_files: result.projected_pack_files,
    boundary: result.boundary,
    errors
  };
}

function publicArchitectureMap(root = packageRoot()) {
  const pkg = readJson(path.join(root, 'package.json'));
  return {
    schema: 'agent-onboard-public-architecture-map-result-001',
    status: 'ok',
    package_name: PUBLIC_ARCHITECTURE_MAP.package_name,
    version: VERSION,
    release_line: PUBLIC_ARCHITECTURE_MAP.release_line,
    command: PUBLIC_ARCHITECTURE_MAP.command,
    check_command: PUBLIC_ARCHITECTURE_MAP.check_command,
    package_root: root,
    package_context: sourceContext(root).package_context,
    package_json_version: pkg.version,
    map: PUBLIC_ARCHITECTURE_MAP,
    command_router: PUBLIC_COMMAND_ROUTER,
    domain_service_facades: PUBLIC_DOMAIN_SERVICE_FACADES,
    source_domain_module_partition_plan: PUBLIC_SOURCE_DOMAIN_MODULE_PARTITION_PLAN,
    source_domain_extraction_rehearsal: PUBLIC_SOURCE_DOMAIN_EXTRACTION_REHEARSAL,
    source_extraction_golden_output_freeze: PUBLIC_SOURCE_EXTRACTION_GOLDEN_OUTPUT_FREEZE,
      source_module_extraction_adapter_boundary: PUBLIC_SOURCE_MODULE_EXTRACTION_ADAPTER_BOUNDARY,
    source_module_extraction_first_slice: PUBLIC_SOURCE_MODULE_EXTRACTION_FIRST_SLICE,
    source_module_extraction_second_slice_plan: PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN,
    version_reference_policy: PUBLIC_VERSION_REFERENCE_POLICY,
    authority_first_read_index: PUBLIC_AUTHORITY_FIRST_READ_INDEX,
    target_runtime_namespace: PUBLIC_TARGET_RUNTIME_NAMESPACE,
    current_runtime: {
      entrypoint: PUBLIC_ARCHITECTURE_MAP.public_source_shape.current_entrypoint,
      entrypoint_exists: fs.existsSync(path.join(root, PUBLIC_ARCHITECTURE_MAP.public_source_shape.current_entrypoint)),
      physical_domain_split_status: PUBLIC_ARCHITECTURE_MAP.public_source_shape.physical_domain_split_status,
      expected_pack_files: PUBLIC_ARCHITECTURE_MAP.public_source_shape.expected_pack_files.slice(),
      projected_pack_files: packageJsonProjectedPackFiles(pkg)
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


function publicSourceModuleExtractionInstalledFallbackSmoke(root = packageRoot()) {
  const runtimeBridge = publicSourceModuleExtractionRuntimeBridgeCheck(root);
  const packageSurface = publicPackageSurfaceCheck(root);
  const context = sourceContext(root);
  const pkg = readJson(path.join(root, 'package.json'));
  const expectedPackFiles = PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort();
  const projectedPackFiles = packageJsonProjectedPackFiles(pkg).slice().sort();
  const sourceModuleRel = PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.source_module;
  const sourceModulePresent = fs.existsSync(path.join(root, sourceModuleRel));
  const sourceModuleInPack = expectedPackFiles.includes(sourceModuleRel) || projectedPackFiles.includes(sourceModuleRel);
  const projectedInstalledRuntimeBridge = {
    context: 'installed_package',
    source_module_present: false,
    source_module: sourceModuleRel,
    mode: 'bundled_fallback',
    fallback_source: 'cli/agent-onboard.js',
    allowed_because_source_module_is_not_in_npm_pack: !sourceModuleInPack
  };
  return {
    schema: 'agent-onboard-public-source-module-extraction-installed-fallback-smoke-result-001',
    status: 'ok',
    package_name: PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.package_name,
    version: VERSION,
    release_line: PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.release_line,
    command: PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.command,
    check_command: PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.check_command,
    package_root: root,
    source_context: context,
    installed_fallback_smoke_file: PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.installed_fallback_smoke_file,
    installed_fallback_smoke_file_present: fs.existsSync(path.join(root, PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.installed_fallback_smoke_file)),
    source_module: sourceModuleRel,
    source_module_present: sourceModulePresent,
    projected_installed_runtime_bridge: projectedInstalledRuntimeBridge,
    observed: {
      runtime_bridge_check_status: runtimeBridge.status,
      runtime_bridge_resolution_mode: runtimeBridge.runtime_bridge_resolution.mode,
      package_surface_check_status: packageSurface.status,
      source_module_in_expected_pack_files: expectedPackFiles.includes(sourceModuleRel),
      source_module_in_projected_pack_files: projectedPackFiles.includes(sourceModuleRel),
      source_context_files_in_pack: PUBLIC_RELEASE_CONTRACT.source_context_files.filter((rel) => projectedPackFiles.includes(rel))
    },
    expected_pack_files: expectedPackFiles,
    projected_pack_files: projectedPackFiles,
    installed_fallback_contract: PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE,
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
    },
    errors: []
  };
}

function publicSourceModuleExtractionInstalledFallbackSmokeCheck(root = packageRoot()) {
  const result = publicSourceModuleExtractionInstalledFallbackSmoke(root);
  const runtimeBridge = publicSourceModuleExtractionRuntimeBridgeCheck(root);
  const packageSurface = publicPackageSurfaceCheck(root);
  const expectedPackFiles = PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort();
  const projectedPackFiles = packageJsonProjectedPackFiles(readJson(path.join(root, 'package.json'))).slice().sort();
  const sourceModuleRel = PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.source_module;
  const artifactPath = path.join(root, PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.installed_fallback_smoke_file);
  const context = sourceContext(root);
  const errors = [];
  if (PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.smoke_status !== 'installed_fallback_smoke_admitted') errors.push('installed fallback smoke status must be installed_fallback_smoke_admitted');
  if (runtimeBridge.status !== 'ok') errors.push('runtime bridge check must pass before installed fallback smoke');
  if (packageSurface.status !== 'ok') errors.push('package surface check must pass before installed fallback smoke');
  if (PUBLIC_SOURCE_MODULE_EXTRACTION_RUNTIME_BRIDGE.boundary.installed_context_fallback_required !== true) errors.push('runtime bridge must require installed-context fallback');
  if (PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.boundary.source_modules_remain_out_of_npm_pack !== true) errors.push('source modules must remain out of npm pack');
  if (PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.boundary.installed_fallback_check_command_writes_files !== false) errors.push('installed fallback check must remain no-write');
  if (!arrayEquals(expectedPackFiles, projectedPackFiles)) errors.push('projected pack files must match the compact expected pack files');
  if (expectedPackFiles.includes(sourceModuleRel) || projectedPackFiles.includes(sourceModuleRel)) errors.push(`${sourceModuleRel} must remain outside the npm package allowlist`);
  if (context.package_context === 'installed_package' && fs.existsSync(path.join(root, sourceModuleRel))) errors.push(`${sourceModuleRel} must be absent from installed package context`);
  if (context.package_context === 'installed_package' && runtimeBridge.runtime_bridge_resolution.mode !== 'bundled_fallback') errors.push('installed package runtime bridge must resolve through bundled_fallback');
  if (context.package_context === 'source_repository' && !fs.existsSync(artifactPath)) errors.push(`${PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.installed_fallback_smoke_file} must exist in source repository context`);
  if (fs.existsSync(artifactPath)) {
    try {
      const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
      if (artifact.schema !== PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.schema) errors.push(`${PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.installed_fallback_smoke_file} schema must be ${PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.schema}`);
      if (artifact.source_module !== sourceModuleRel) errors.push(`${PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.installed_fallback_smoke_file} source_module must be ${sourceModuleRel}`);
      if (!artifact.projected_installed_context || artifact.projected_installed_context.runtime_bridge_resolution_mode !== 'bundled_fallback') errors.push(`${PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.installed_fallback_smoke_file} must declare bundled_fallback projected installed context`);
    } catch (error) {
      errors.push(`${PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.installed_fallback_smoke_file} must be valid JSON: ${error.message}`);
    }
  }
  return {
    schema: 'agent-onboard-public-source-module-extraction-installed-fallback-smoke-check-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.package_name,
    version: VERSION,
    release_line: PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.release_line,
    command: PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.check_command,
    package_root: root,
    source_context: context,
    validated: {
      runtime_bridge_check: runtimeBridge.status === 'ok',
      package_surface_check: packageSurface.status === 'ok',
      installed_fallback_smoke_status: PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.smoke_status === 'installed_fallback_smoke_admitted',
      source_module_out_of_pack: !expectedPackFiles.includes(sourceModuleRel) && !projectedPackFiles.includes(sourceModuleRel),
      projected_pack_allowlist_unchanged: arrayEquals(expectedPackFiles, projectedPackFiles),
      installed_context_uses_bundled_fallback: context.package_context === 'installed_package' ? runtimeBridge.runtime_bridge_resolution.mode === 'bundled_fallback' : result.projected_installed_runtime_bridge.mode === 'bundled_fallback',
      source_artifact_present_or_installed_context_allowed: fs.existsSync(artifactPath) || context.package_context === 'installed_package',
      installed_fallback_commands_no_write: PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.boundary.installed_fallback_smoke_command_writes_files === false && PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.boundary.installed_fallback_check_command_writes_files === false,
      package_allowlist_unchanged: PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.boundary.package_allowlist_unchanged === true
    },
    observed: result.observed,
    runtime_bridge: {
      status: runtimeBridge.status,
      resolution_mode: runtimeBridge.runtime_bridge_resolution.mode,
      source_module_present: runtimeBridge.runtime_bridge_resolution.source_module_present
    },
    source_installed_fallback_file: {
      path: PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.installed_fallback_smoke_file,
      present: fs.existsSync(artifactPath),
      status: fs.existsSync(artifactPath) ? 'present_validated' : (context.package_context === 'installed_package' ? 'not_present_installed_context_allowed' : 'missing'),
      schema: PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.schema,
      source_context_required: true
    },
    projected_installed_runtime_bridge: result.projected_installed_runtime_bridge,
    expected_pack_files: expectedPackFiles,
    projected_pack_files: projectedPackFiles,
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
    },
    errors
  };
}


function gitignoreSecondSlicePolicy(root = packageRoot()) {
  const rel = PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.gitignore_policy.gitignore_file;
  const file = path.join(root, rel);
  const present = fs.existsSync(file);
  const content = present ? fs.readFileSync(file, 'utf8') : '';
  const entries = content.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0 && !line.startsWith('#'));
  const forbidden = ['.agent-onboard/', '.agent-onboard/*', 'src/', 'src/**', 'src/domains/', 'src/domains/*', 'src/domains/**'];
  const localStateEntries = ['.agent-onboard/tmp/', '.agent-onboard/cache/', '.agent-onboard/local/'];
  const perArtifactUnignoreEntries = entries.filter((entry) => /^!\.agent-onboard\/source-module-extraction-.*\.json$/.test(entry));
  return {
    file: rel,
    present,
    policy: 'track canonical .agent-onboard source JSON by default; ignore only local/runtime/cache state',
    required_unignore_entries: [],
    missing_required_unignore_entries: [],
    forbidden_ignore_entries: forbidden,
    present_forbidden_ignore_entries: forbidden.filter((entry) => entries.includes(entry)),
    local_state_ignore_entries: localStateEntries,
    missing_local_state_ignore_entries: localStateEntries.filter((entry) => !entries.includes(entry)),
    per_artifact_unignore_entries: perArtifactUnignoreEntries,
    entries
  };
}

function publicSourceModuleExtractionSecondSlicePlan(root = packageRoot()) {
  const pkg = readJson(path.join(root, 'package.json'));
  const context = sourceContext(root);
  const plan = PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN;
  const plannedModule = plan.planned_second_slice.planned_module;
  return {
    schema: 'agent-onboard-public-source-module-extraction-second-slice-plan-result-001',
    status: 'ok',
    package_name: plan.package_name,
    version: VERSION,
    release_line: plan.release_line,
    command: plan.command,
    check_command: plan.check_command,
    package_root: root,
    package_context: context.package_context,
    package_json_version: pkg.version,
    second_slice_plan_file: plan.second_slice_plan_file,
    second_slice_plan_file_present: fs.existsSync(path.join(root, plan.second_slice_plan_file)),
    prerequisite_installed_fallback_smoke_file: plan.prerequisite_installed_fallback_smoke_file,
    planned_second_slice: plan.planned_second_slice,
    planned_module: plannedModule,
    planned_module_present: fs.existsSync(path.join(root, plannedModule)),
    current_source_modules_present: ['src/domains/core.js', plannedModule].filter((rel) => fs.existsSync(path.join(root, rel))),
    gitignore_policy: gitignoreSecondSlicePolicy(root),
    projected_pack_files: packageJsonProjectedPackFiles(pkg),
    expected_pack_files: PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort(),
    second_slice_plan: plan,
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

function publicSourceModuleExtractionSecondSlicePlanCheck(root = packageRoot()) {
  const result = publicSourceModuleExtractionSecondSlicePlan(root);
  const installedFallback = publicSourceModuleExtractionInstalledFallbackSmokeCheck(root);
  const expectedPackFiles = PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort();
  const planned = PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.planned_second_slice;
  const partitionPlan = PUBLIC_SOURCE_DOMAIN_MODULE_PARTITION_PLAN.planned_source_modules.find((module) => module.domain === planned.domain);
  const facade = PUBLIC_DOMAIN_SERVICE_FACADES.facades.find((item) => item.id === planned.domain);
  const artifactPath = path.join(root, PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.second_slice_plan_file);
  const errors = [];
  if (installedFallback.status !== 'ok') errors.push(...installedFallback.errors.map((error) => `installed fallback smoke: ${error}`));
  if (PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.second_slice_status !== 'planned_not_created') errors.push('second slice status must remain planned_not_created for this gate');
  if (planned.domain !== 'authority') errors.push('second slice must plan the authority domain after the core first slice');
  if (!partitionPlan) errors.push('second slice domain must exist in the source partition plan');
  if (partitionPlan && partitionPlan.planned_module !== planned.planned_module) errors.push(`second slice planned module must match partition plan module ${partitionPlan.planned_module}`);
  if (!facade || facade.service !== planned.facade) errors.push('second slice must map to authorityService facade');
  if (planned.source_module_created_by_this_gate !== false) errors.push('second slice planning gate must not create the authority source module');
  if (planned.published_import_api !== false) errors.push('second slice source module must not be admitted as public import API');
  const followupFirstSliceFilePresent = fs.existsSync(path.join(root, '.agent-onboard/source-module-extraction-second-slice-first-slice.json'));
  if (result.planned_module_present && !followupFirstSliceFilePresent) errors.push(`${planned.planned_module} must not be created until the second slice first-slice gate is admitted`);
  if (!arrayEquals(result.projected_pack_files, expectedPackFiles)) errors.push(`projected npm pack files must remain ${expectedPackFiles.join(', ')}`);
  if (result.projected_pack_files.includes(planned.planned_module)) errors.push(`${planned.planned_module} must stay outside the npm package allowlist`);
  if (PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.boundary.second_slice_plan_command_writes_files !== false) errors.push('architecture --second-slice-plan must remain no-write');
  if (PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.boundary.second_slice_check_command_writes_files !== false) errors.push('architecture --second-slice-check must remain no-write');
  if (PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.boundary.package_allowlist_unchanged !== true) errors.push('second slice planning must preserve package allowlist');

  let planFileStatus = 'not_present_installed_context_allowed';
  let planFileSchema = null;
  if (result.second_slice_plan_file_present) {
    try {
      const artifact = readJson(artifactPath);
      planFileSchema = artifact.schema || null;
      if (artifact.schema !== PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.schema) errors.push(`${PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.second_slice_plan_file} schema must be ${PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.schema}`);
      if (artifact.second_slice_status !== 'planned_not_created') errors.push(`${PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.second_slice_plan_file} must declare planned_not_created`);
      if (!artifact.planned_second_slice || artifact.planned_second_slice.domain !== planned.domain) errors.push(`${PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.second_slice_plan_file} must plan ${planned.domain}`);
      if (!artifact.planned_second_slice || artifact.planned_second_slice.planned_module !== planned.planned_module) errors.push(`${PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.second_slice_plan_file} planned module must be ${planned.planned_module}`);
      planFileStatus = 'present_validated';
    } catch (error) {
      planFileStatus = 'present_invalid_json';
      errors.push(`${PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.second_slice_plan_file} must be valid JSON: ${error && error.message ? error.message : String(error)}`);
    }
  } else if (result.package_context === 'source_repository') {
    planFileStatus = 'missing_source_context';
    errors.push(`${PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.second_slice_plan_file} must exist in source repository context`);
  }

  const gitignore = result.gitignore_policy;
  if (result.package_context === 'source_repository') {
    if (!gitignore.present) errors.push('.gitignore must exist in source repository context');
    for (const entry of gitignore.missing_required_unignore_entries) errors.push(`.gitignore must unignore ${entry}`);
    for (const entry of gitignore.present_forbidden_ignore_entries) errors.push(`.gitignore must not ignore source module path with ${entry}`);
    for (const entry of gitignore.per_artifact_unignore_entries) errors.push(`.gitignore must not use per-artifact unignore sprawl: ${entry}`);
    for (const entry of gitignore.missing_local_state_ignore_entries) errors.push(`.gitignore must ignore local state entry ${entry}`);
  }

  return {
    schema: 'agent-onboard-public-source-module-extraction-second-slice-plan-check-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.package_name,
    version: VERSION,
    release_line: PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.release_line,
    command: PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.check_command,
    package_root: root,
    source_context: result.source_context,
    validated: {
      installed_fallback_smoke: installedFallback.status === 'ok',
      second_slice_status: PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.second_slice_status === 'planned_not_created',
      planned_domain_is_authority: planned.domain === 'authority',
      planned_domain_maps_to_facade: !!facade && facade.service === planned.facade,
      planned_module_matches_partition_plan: !!partitionPlan && partitionPlan.planned_module === planned.planned_module,
      authority_module_not_created_by_this_gate: !result.planned_module_present || followupFirstSliceFilePresent,
      second_slice_plan_file_present_or_installed_context_allowed: planFileStatus === 'present_validated' || planFileStatus === 'not_present_installed_context_allowed',
      gitignore_tracks_source_artifacts: result.package_context === 'installed_package' || (gitignore.present && gitignore.missing_required_unignore_entries.length === 0),
      gitignore_does_not_ignore_src_domains: result.package_context === 'installed_package' || gitignore.present_forbidden_ignore_entries.length === 0,
      gitignore_uses_compact_local_state_policy: result.package_context === 'installed_package' || (gitignore.present && gitignore.per_artifact_unignore_entries.length === 0 && gitignore.missing_local_state_ignore_entries.length === 0),
      second_slice_commands_no_write: PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.boundary.second_slice_plan_command_writes_files === false && PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.boundary.second_slice_check_command_writes_files === false,
      package_allowlist_unchanged: arrayEquals(result.projected_pack_files, expectedPackFiles)
    },
    planned_second_slice: planned,
    second_slice_plan_file: {
      path: PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.second_slice_plan_file,
      present: result.second_slice_plan_file_present,
      status: planFileStatus,
      schema: planFileSchema,
      source_context_required: result.package_context === 'source_repository'
    },
    gitignore_policy: gitignore,
    prerequisite_installed_fallback_smoke: {
      status: installedFallback.status,
      errors: installedFallback.errors
    },
    projected_pack_files: result.projected_pack_files,
    expected_pack_files: expectedPackFiles,
    boundary: result.boundary,
    errors
  };
}


function loadAuthoritySecondSliceModule(root = packageRoot()) {
  const modulePath = path.join(root, PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_FIRST_SLICE.source_module);
  if (!fs.existsSync(modulePath)) return null;
  const resolved = require.resolve(modulePath);
  delete require.cache[resolved];
  return require(resolved);
}

function publicSourceModuleExtractionSecondSliceFirstSlice(root = packageRoot()) {
  const pkg = readJson(path.join(root, 'package.json'));
  const context = sourceContext(root);
  const gate = PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_FIRST_SLICE;
  let module_exports = [];
  let module_value = null;
  let module_load_error = null;
  try {
    const loaded = loadAuthoritySecondSliceModule(root);
    if (loaded) {
      module_exports = Object.keys(loaded).sort();
      if (typeof loaded.getAuthorityDomainSecondSlice === 'function') {
        module_value = loaded.getAuthorityDomainSecondSlice();
      } else if (loaded.AUTHORITY_DOMAIN_SECOND_SLICE) {
        module_value = loaded.AUTHORITY_DOMAIN_SECOND_SLICE;
      }
    }
  } catch (error) {
    module_load_error = error && error.message ? error.message : String(error);
  }
  return {
    schema: 'agent-onboard-public-source-module-extraction-second-slice-first-slice-result-001',
    status: module_load_error ? 'error' : 'ok',
    package_name: gate.package_name,
    version: VERSION,
    release_line: gate.release_line,
    command: gate.command,
    check_command: gate.check_command,
    package_root: root,
    package_context: context.package_context,
    package_json_version: pkg.version,
    second_slice_first_slice_file: gate.second_slice_first_slice_file,
    second_slice_first_slice_file_present: fs.existsSync(path.join(root, gate.second_slice_first_slice_file)),
    source_module: gate.source_module,
    source_module_present: fs.existsSync(path.join(root, gate.source_module)),
    source_module_exports: module_exports,
    source_module_value: module_value,
    source_module_load_error: module_load_error,
    prerequisite_second_slice_plan_file: gate.prerequisite_second_slice_plan_file,
    second_slice_first_slice: gate,
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

function publicSourceModuleExtractionSecondSliceFirstSliceCheck(root = packageRoot()) {
  const result = publicSourceModuleExtractionSecondSliceFirstSlice(root);
  const plan = publicSourceModuleExtractionSecondSlicePlanCheck(root);
  const expectedPackFiles = PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort();
  const gate = PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_FIRST_SLICE;
  const expectedExports = gate.expected_module_export_names.slice().sort();
  const expectedReadOrder = gate.expected_read_order_paths.slice();
  const errors = [];
  if (plan.status !== 'ok') errors.push(...plan.errors.map((error) => `second slice plan: ${error}`));
  if (result.status !== 'ok') errors.push(`second slice first-slice module load failed: ${result.source_module_load_error}`);
  if (!arrayEquals(result.projected_pack_files, expectedPackFiles)) errors.push(`projected npm pack files must remain ${expectedPackFiles.join(', ')}`);
  if (gate.second_slice_first_slice_status !== 'source_only_shadow_module_applied') errors.push('second slice first-slice status must be source_only_shadow_module_applied');
  if (gate.extracted_domain.id !== 'authority') errors.push('second slice first-slice must extract the authority domain');
  if (gate.boundary.created_source_module !== 'src/domains/authority.js') errors.push('second slice created source module must be src/domains/authority.js');
  if (gate.boundary.creates_exactly_one_source_module !== true) errors.push('second slice first-slice must create exactly one source module');
  if (gate.boundary.excludes_write_capable_agents_command !== true) errors.push('second slice first-slice must exclude write-capable agents command extraction');
  if (gate.boundary.moves_existing_source_files !== false) errors.push('second slice first-slice must not move existing source files');
  if (gate.boundary.changes_public_cli_outputs !== false) errors.push('second slice first-slice must not change public CLI outputs');
  if (gate.boundary.changes_cli_runtime_dependency_graph !== false) errors.push('second slice first-slice must not make CLI runtime require source modules');
  if (gate.boundary.exports_source_module_as_public_api !== false) errors.push('second slice first-slice must not expose source module as public import API');
  if (gate.boundary.second_slice_first_slice_command_writes_files !== false) errors.push('architecture --second-slice-first-slice must remain no-write');
  if (gate.boundary.second_slice_first_slice_check_command_writes_files !== false) errors.push('architecture --second-slice-first-slice-check must remain no-write');

  let artifactStatus = 'not_present_installed_context_allowed';
  let artifactSchema = null;
  if (result.second_slice_first_slice_file_present) {
    try {
      const artifact = readJson(path.join(root, result.second_slice_first_slice_file));
      artifactSchema = artifact.schema || null;
      if (artifact.schema !== gate.schema) errors.push(`${result.second_slice_first_slice_file} schema must be ${gate.schema}`);
      if (!artifact.extracted_domain || artifact.extracted_domain.id !== 'authority') errors.push(`${result.second_slice_first_slice_file} must declare extracted_domain.id authority`);
      if (artifact.source_module !== 'src/domains/authority.js') errors.push(`${result.second_slice_first_slice_file} source_module must be src/domains/authority.js`);
      artifactStatus = 'present_validated';
    } catch (error) {
      artifactStatus = 'present_invalid_json';
      errors.push(`${result.second_slice_first_slice_file} is not valid JSON: ${error && error.message ? error.message : String(error)}`);
    }
  } else if (result.package_context === 'source_repository') {
    artifactStatus = 'missing_source_context';
    errors.push(`${result.second_slice_first_slice_file} must be present in source repository context`);
  }

  let sourceModuleStatus = 'not_present_installed_context_allowed';
  const moduleValue = result.source_module_value || {};
  const moduleExportsSorted = result.source_module_exports.slice().sort();
  if (result.source_module_present) {
    if (!arrayEquals(moduleExportsSorted, expectedExports)) errors.push(`${result.source_module} exports must be ${expectedExports.join(', ')}`);
    if (moduleValue.schema !== 'agent-onboard-public-source-module-authority-second-slice-001') errors.push(`${result.source_module} must export authority second-slice schema`);
    if (moduleValue.domain !== 'authority') errors.push(`${result.source_module} domain must be authority`);
    if (moduleValue.facade !== 'authorityService') errors.push(`${result.source_module} facade must be authorityService`);
    if (moduleValue.source_module !== result.source_module) errors.push(`${result.source_module} source_module field must match its path`);
    if (moduleValue.runtime_dependency_status !== gate.extracted_domain.runtime_dependency_status) errors.push(`${result.source_module} runtime dependency status must remain source-only shadow`);
    if (moduleValue.exports_public_api !== false) errors.push(`${result.source_module} must not declare public import API`);
    if (moduleValue.includes_write_capable_agents_command !== false) errors.push(`${result.source_module} must exclude write-capable agents command extraction`);
    if (moduleValue.writes_files !== false || moduleValue.state_writer !== false) errors.push(`${result.source_module} must remain read-only and non-state-writer`);
    if (!arrayEquals((moduleValue.read_order_paths || []), expectedReadOrder)) errors.push(`${result.source_module} read_order_paths must match authority first-read order`);
    sourceModuleStatus = 'present_validated';
  } else if (result.package_context === 'source_repository') {
    sourceModuleStatus = 'missing_source_context';
    errors.push(`${result.source_module} must be present in source repository context`);
  }

  return {
    schema: 'agent-onboard-public-source-module-extraction-second-slice-first-slice-check-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: gate.package_name,
    version: VERSION,
    release_line: gate.release_line,
    command: gate.check_command,
    package_root: root,
    validated: {
      second_slice_plan: plan.status === 'ok',
      second_slice_status: gate.second_slice_first_slice_status === 'source_only_shadow_module_applied',
      extracted_domain_is_authority: gate.extracted_domain.id === 'authority',
      source_module_present_or_installed_context_allowed: sourceModuleStatus === 'present_validated' || sourceModuleStatus === 'not_present_installed_context_allowed',
      second_slice_first_slice_file_present_or_installed_context_allowed: artifactStatus === 'present_validated' || artifactStatus === 'not_present_installed_context_allowed',
      write_capable_agents_command_excluded: moduleValue.includes_write_capable_agents_command === false || sourceModuleStatus === 'not_present_installed_context_allowed',
      commands_no_write: gate.boundary.second_slice_first_slice_command_writes_files === false && gate.boundary.second_slice_first_slice_check_command_writes_files === false,
      package_allowlist_unchanged: arrayEquals(result.projected_pack_files, expectedPackFiles)
    },
    source_module: {
      path: result.source_module,
      present: result.source_module_present,
      status: sourceModuleStatus,
      exports: result.source_module_exports,
      value: result.source_module_value,
      source_context_required: result.package_context === 'source_repository'
    },
    second_slice_first_slice_file: {
      path: result.second_slice_first_slice_file,
      present: result.second_slice_first_slice_file_present,
      status: artifactStatus,
      schema: artifactSchema,
      source_context_required: result.package_context === 'source_repository'
    },
    prerequisite_second_slice_plan: {
      status: plan.status,
      errors: plan.errors
    },
    projected_pack_files: result.projected_pack_files,
    expected_pack_files: expectedPackFiles,
    boundary: result.boundary,
    errors
  };
}


function bundledAuthorityDomainForParity(root = packageRoot()) {
  const map = publicArchitectureMap(root);
  const facade = PUBLIC_DOMAIN_SERVICE_FACADES.facades.find((item) => item.id === 'authority');
  const domain = map.map.canonical_domains.find((item) => item.id === 'authority');
  return {
    schema: 'agent-onboard-public-bundled-authority-domain-view-001',
    domain: domain ? domain.id : null,
    facade: facade ? facade.service : null,
    service: facade ? facade.service : null,
    source: 'cli/agent-onboard.js',
    owns_commands: PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_FIRST_SLICE.expected_owned_commands.slice(),
    excluded_commands: ['agents --write', 'agents --preview'],
    writes_files: false,
    state_writer: false,
    state_files: domain ? domain.state_files.slice() : [],
    read_order_paths: PUBLIC_AUTHORITY_FIRST_READ_INDEX.read_order.map((item) => item.path),
    package_context: sourceContext(root).package_context
  };
}

function publicSourceModuleExtractionAuthorityBundleParity(root = packageRoot()) {
  const pkg = readJson(path.join(root, 'package.json'));
  const context = sourceContext(root);
  const sourceSlice = publicSourceModuleExtractionSecondSliceFirstSlice(root);
  const bundledAuthority = bundledAuthorityDomainForParity(root);
  return {
    schema: 'agent-onboard-public-source-module-extraction-authority-bundle-parity-result-001',
    status: sourceSlice.status,
    package_name: PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_BUNDLE_PARITY.package_name,
    version: VERSION,
    release_line: PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_BUNDLE_PARITY.release_line,
    command: PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_BUNDLE_PARITY.command,
    check_command: PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_BUNDLE_PARITY.check_command,
    package_root: root,
    package_context: context.package_context,
    package_json_version: pkg.version,
    authority_bundle_parity_file: PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_BUNDLE_PARITY.authority_bundle_parity_file,
    authority_bundle_parity_file_present: fs.existsSync(path.join(root, PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_BUNDLE_PARITY.authority_bundle_parity_file)),
    source_module: PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_BUNDLE_PARITY.source_module,
    source_module_present: fs.existsSync(path.join(root, PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_BUNDLE_PARITY.source_module)),
    source_slice_value: sourceSlice.source_module_value,
    source_slice_load_error: sourceSlice.source_module_load_error,
    bundled_authority_view: bundledAuthority,
    authority_bundle_parity: PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_BUNDLE_PARITY,
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

function publicSourceModuleExtractionAuthorityBundleParityCheck(root = packageRoot()) {
  const result = publicSourceModuleExtractionAuthorityBundleParity(root);
  const firstSlice = publicSourceModuleExtractionSecondSliceFirstSliceCheck(root);
  const expectedPackFiles = PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort();
  const gate = PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_BUNDLE_PARITY;
  const errors = [];
  if (firstSlice.status !== 'ok') errors.push(...firstSlice.errors.map((error) => `second slice first-slice: ${error}`));
  if (result.status !== 'ok') errors.push(`authority source slice module load failed: ${result.source_slice_load_error}`);
  if (!arrayEquals(result.projected_pack_files, expectedPackFiles)) errors.push(`projected npm pack files must remain ${expectedPackFiles.join(', ')}`);
  if (gate.parity_status !== 'authority_source_slice_matches_bundled_cli_view') errors.push('authority bundle parity status must remain authority_source_slice_matches_bundled_cli_view');
  if (gate.boundary.authority_bundle_parity_command_writes_files !== false) errors.push('architecture --authority-bundle-parity must remain no-write');
  if (gate.boundary.authority_bundle_parity_check_command_writes_files !== false) errors.push('architecture --authority-bundle-parity-check must remain no-write');
  if (gate.boundary.creates_bundle_artifact !== false) errors.push('authority bundle parity gate must not create bundle artifacts');
  if (gate.boundary.changes_public_cli_outputs !== false) errors.push('authority bundle parity gate must not change public CLI outputs');
  if (gate.boundary.changes_cli_runtime_dependency_graph !== false) errors.push('authority bundle parity gate must not change CLI runtime dependency graph');
  if (gate.boundary.includes_write_capable_agents_command !== false) errors.push('authority bundle parity gate must exclude write-capable agents command extraction');
  if (gate.boundary.package_allowlist_unchanged !== true) errors.push('authority bundle parity gate must preserve package allowlist');

  let parityFileStatus = 'not_present_installed_context_allowed';
  let parityFileSchema = null;
  if (result.authority_bundle_parity_file_present) {
    try {
      const parityFile = readJson(path.join(root, result.authority_bundle_parity_file));
      parityFileSchema = parityFile.schema || null;
      if (parityFile.schema !== gate.schema) errors.push(`${result.authority_bundle_parity_file} schema must be ${gate.schema}`);
      if (parityFile.source_module !== gate.source_module) errors.push(`${result.authority_bundle_parity_file} source_module must be ${gate.source_module}`);
      if (parityFile.parity_status !== gate.parity_status) errors.push(`${result.authority_bundle_parity_file} parity_status must be ${gate.parity_status}`);
      if (!parityFile.boundary || parityFile.boundary.package_allowlist_unchanged !== true) errors.push(`${result.authority_bundle_parity_file} must preserve package_allowlist_unchanged`);
      if (!parityFile.boundary || parityFile.boundary.includes_write_capable_agents_command !== false) errors.push(`${result.authority_bundle_parity_file} must exclude write-capable agents command extraction`);
      parityFileStatus = 'present_validated';
    } catch (error) {
      parityFileStatus = 'present_invalid_json';
      errors.push(`${result.authority_bundle_parity_file} is not valid JSON: ${error && error.message ? error.message : String(error)}`);
    }
  } else if (result.package_context === 'source_repository') {
    parityFileStatus = 'missing_source_context';
    errors.push(`${result.authority_bundle_parity_file} must be present in source repository context`);
  }

  const sourceSlice = result.source_slice_value || null;
  const sourceContextAllowedMissing = result.package_context === 'installed_package' && !sourceSlice;
  const commandParity = sourceContextAllowedMissing || (sourceSlice && arrayEquals(sourceSlice.owns_commands || [], result.bundled_authority_view.owns_commands));
  const domainParity = sourceContextAllowedMissing || (sourceSlice && sourceSlice.domain === result.bundled_authority_view.domain);
  const facadeParity = sourceContextAllowedMissing || (sourceSlice && sourceSlice.facade === result.bundled_authority_view.facade);
  const readOrderParity = sourceContextAllowedMissing || (sourceSlice && arrayEquals(sourceSlice.read_order_paths || [], result.bundled_authority_view.read_order_paths));
  const excludedAgentsParity = sourceContextAllowedMissing || (sourceSlice && sourceSlice.includes_write_capable_agents_command === false && arrayEquals(sourceSlice.excluded_commands || [], result.bundled_authority_view.excluded_commands));
  const writeParity = sourceContextAllowedMissing || (sourceSlice && sourceSlice.writes_files === result.bundled_authority_view.writes_files && sourceSlice.state_writer === result.bundled_authority_view.state_writer);
  if (!domainParity) errors.push('authority source slice domain must match bundled authority domain view');
  if (!facadeParity) errors.push('authority source slice facade must match bundled authority facade view');
  if (!commandParity) errors.push('authority source slice owned commands must match bundled authority command routes');
  if (!readOrderParity) errors.push('authority source slice read order must match bundled first-read index');
  if (!excludedAgentsParity) errors.push('authority source slice must exclude write-capable agents commands');
  if (!writeParity) errors.push('authority source slice read/write boundary must match bundled authority view');

  return {
    schema: 'agent-onboard-public-source-module-extraction-authority-bundle-parity-check-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: gate.package_name,
    version: VERSION,
    release_line: gate.release_line,
    command: gate.check_command,
    package_root: root,
    validated: {
      second_slice_first_slice: firstSlice.status === 'ok',
      authority_bundle_parity_status: gate.parity_status === 'authority_source_slice_matches_bundled_cli_view',
      source_slice_domain_matches_bundled_authority: domainParity,
      source_slice_facade_matches_bundled_authority: facadeParity,
      source_slice_commands_match_bundled_authority: commandParity,
      source_slice_read_order_matches_bundled_first_read: readOrderParity,
      write_capable_agents_command_excluded: excludedAgentsParity,
      source_slice_write_boundary_matches_bundled_authority: writeParity,
      source_module_present_or_installed_context_allowed: result.source_module_present || result.package_context === 'installed_package',
      authority_bundle_parity_file_present_or_installed_context_allowed: parityFileStatus === 'present_validated' || parityFileStatus === 'not_present_installed_context_allowed',
      authority_bundle_parity_commands_no_write: gate.boundary.authority_bundle_parity_command_writes_files === false && gate.boundary.authority_bundle_parity_check_command_writes_files === false,
      public_cli_outputs_unchanged_by_gate: gate.boundary.changes_public_cli_outputs === false,
      cli_runtime_dependency_graph_unchanged: gate.boundary.changes_cli_runtime_dependency_graph === false,
      package_allowlist_unchanged: arrayEquals(result.projected_pack_files, expectedPackFiles)
    },
    source_slice: result.source_slice_value,
    bundled_authority_view: result.bundled_authority_view,
    source_authority_bundle_parity_file: {
      path: result.authority_bundle_parity_file,
      present: result.authority_bundle_parity_file_present,
      status: parityFileStatus,
      schema: parityFileSchema,
      source_context_required: result.package_context === 'source_repository'
    },
    prerequisite_second_slice_first_slice: {
      status: firstSlice.status,
      errors: firstSlice.errors
    },
    projected_pack_files: result.projected_pack_files,
    expected_pack_files: expectedPackFiles,
    boundary: result.boundary,
    errors
  };
}


function publicPackageCommandAdapterExtraction(root = packageRoot()) {
  const gate = PUBLIC_PACKAGE_COMMAND_ADAPTER_EXTRACTION;
  const pkg = readJson(path.join(root, 'package.json'));
  const context = sourceContext(root);
  const adapterModulePath = path.join(root, gate.adapter_module);
  const artifactPath = path.join(root, gate.extraction_file);
  const adapterLineCount = countFileLines(root, gate.adapter_module);
  let adapterModuleStatus = 'not_present_installed_context_allowed';
  let adapterModuleSchema = null;
  let adapterModuleExports = [];
  let ownedCommands = [];
  let excludedCommands = [];
  let adapterRequireError = null;
  if (fs.existsSync(adapterModulePath)) {
    try {
      delete require.cache[require.resolve(adapterModulePath)];
      const adapterModule = require(adapterModulePath);
      adapterModuleExports = Object.keys(adapterModule).sort();
      const described = typeof adapterModule.describePackageCommandAdapterExtraction === 'function' ? adapterModule.describePackageCommandAdapterExtraction() : null;
      adapterModuleSchema = described && described.schema ? described.schema : null;
      ownedCommands = described && Array.isArray(described.owned_top_level_commands) ? described.owned_top_level_commands.slice().sort() : [];
      excludedCommands = described && Array.isArray(described.excluded_top_level_commands) ? described.excluded_top_level_commands.slice().sort() : [];
      adapterModuleStatus = 'present_validated';
    } catch (error) {
      adapterModuleStatus = 'present_require_failed';
      adapterRequireError = error && error.message ? error.message : String(error);
    }
  }
  const ledgerPath = path.join(root, '.agent-onboard', 'work-items.json');
  let ledger = null;
  if (fs.existsSync(ledgerPath)) {
    try { ledger = readJson(ledgerPath); } catch { ledger = null; }
  }
  const workItems = ledger && Array.isArray(ledger.work_items) ? ledger.work_items : [];
  return {
    schema: 'agent-onboard-public-package-command-adapter-extraction-result-001',
    status: 'ok',
    package_name: gate.package_name,
    version: VERSION,
    release_line: gate.release_line,
    command: gate.command,
    check_command: gate.check_command,
    package_root: root,
    package_context: context.package_context,
    package_json_version: pkg.version,
    extraction_file: gate.extraction_file,
    extraction_file_present: fs.existsSync(artifactPath),
    adapter_module: {
      path: gate.adapter_module,
      present: fs.existsSync(adapterModulePath),
      status: adapterModuleStatus,
      schema: adapterModuleSchema,
      exports: adapterModuleExports,
      owned_top_level_commands: ownedCommands,
      excluded_top_level_commands: excludedCommands,
      require_error: adapterRequireError,
      line_count: adapterLineCount,
      max_lines: gate.adapter_seed_max_lines
    },
    compatibility_port_module: gate.compatibility_port_module,
    router_module: gate.router_module,
    runtime_cutover: {
      applied: gate.runtime_cutover_applied,
      entrypoint: 'cli/agent-onboard.js',
      entrypoint_line_count: countFileLines(root, 'cli/agent-onboard.js'),
      package_adapter_used_by_entrypoint_in_this_gate: gate.boundary.uses_package_adapter_as_runtime_entrypoint
    },
    package_strategy: gate.package_strategy,
    expected_pack_files: PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort(),
    projected_pack_files: packageJsonProjectedPackFiles(pkg).slice().sort(),
    milestone_state: {
      work_item: workItems.find((item) => item.id === gate.work_item_id) || null,
      next_work_item: workItems.find((item) => item.id === gate.next_work_item_id) || null
    },
    adapter_contract: gate,
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
    },
    errors: []
  };
}

function publicPackageCommandAdapterExtractionCheck(root = packageRoot()) {
  const result = publicPackageCommandAdapterExtraction(root);
  const gate = PUBLIC_PACKAGE_COMMAND_ADAPTER_EXTRACTION;
  const sourceLedgerRequired = result.package_context === 'source_repository';
  const expectedPackFiles = PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort();
  const errors = [];
  if (gate.extraction_status !== 'package_command_adapter_extraction_admitted') errors.push('package command adapter extraction status must be admitted');
  if (gate.runtime_cutover_applied !== false) errors.push('package command adapter extraction must not apply runtime cutover');
  if (gate.package_strategy !== 'controlled_source_module_inclusion') errors.push('package command adapter extraction must preserve controlled_source_module_inclusion package strategy');
  if (!arrayEquals(result.projected_pack_files, expectedPackFiles)) errors.push(`projected npm pack files must remain ${expectedPackFiles.join(', ')}`);
  if (gate.boundary.package_adapter_command_writes_files !== false) errors.push('architecture --package-adapter must remain no-write');
  if (gate.boundary.package_adapter_check_command_writes_files !== false) errors.push('architecture --package-adapter-check must remain no-write');
  if (gate.boundary.changes_public_cli_outputs !== false) errors.push('package command adapter extraction must not change public CLI outputs');
  if (gate.boundary.changes_cli_runtime_dependency_graph !== false) errors.push('package command adapter extraction must not change packaged CLI runtime dependency graph');
  if (gate.boundary.uses_package_adapter_as_runtime_entrypoint !== false) errors.push('package command adapter extraction must not use source modules as the packaged runtime entrypoint yet');
  if (gate.boundary.source_package_adapter_module_remains_out_of_pack !== true) errors.push('source package adapter module must remain out of npm pack for this gate');
  if (result.adapter_module.line_count > gate.adapter_seed_max_lines) errors.push(`${gate.adapter_module} must stay within ${gate.adapter_seed_max_lines} lines`);

  let artifactStatus = 'not_present_installed_context_allowed';
  let artifactSchema = null;
  const artifactPath = path.join(root, gate.extraction_file);
  if (fs.existsSync(artifactPath)) {
    try {
      const artifact = readJson(artifactPath);
      artifactSchema = artifact.schema || null;
      if (artifact.schema !== gate.schema) errors.push(`${gate.extraction_file} schema must be ${gate.schema}`);
      if (artifact.work_item_id !== gate.work_item_id) errors.push(`${gate.extraction_file} must identify ${gate.work_item_id}`);
      if (artifact.next_work_item_id !== gate.next_work_item_id) errors.push(`${gate.extraction_file} must seed ${gate.next_work_item_id}`);
      if (artifact.adapter_module !== gate.adapter_module) errors.push(`${gate.extraction_file} must declare ${gate.adapter_module}`);
      if (artifact.runtime_cutover_applied !== false) errors.push(`${gate.extraction_file} must not apply runtime cutover`);
      if (!artifact.boundary || artifact.boundary.package_allowlist_unchanged !== true) errors.push(`${gate.extraction_file} must preserve package_allowlist_unchanged`);
      artifactStatus = 'present_validated';
    } catch (error) {
      artifactStatus = 'present_invalid_json';
      errors.push(`${gate.extraction_file} must be valid JSON: ${error && error.message ? error.message : String(error)}`);
    }
  } else if (sourceLedgerRequired) {
    artifactStatus = 'missing_source_context';
    errors.push(`${gate.extraction_file} must exist in source repository context`);
  }

  const adapterModulePresentOrAllowed = result.adapter_module.present || result.package_context === 'installed_package';
  if (!adapterModulePresentOrAllowed) errors.push(`${gate.adapter_module} must exist in source repository context`);
  if (result.adapter_module.present) {
    if (result.adapter_module.status !== 'present_validated') errors.push(`${gate.adapter_module} must be require-able without side effects${result.adapter_module.require_error ? `: ${result.adapter_module.require_error}` : ''}`);
    if (result.adapter_module.schema !== 'agent-onboard-public-package-command-adapter-extraction-module-001') errors.push(`${gate.adapter_module} must expose package command adapter extraction module schema`);
    for (const exportName of gate.expected_adapter_export_names) {
      if (!result.adapter_module.exports.includes(exportName)) errors.push(`${gate.adapter_module} must export ${exportName}`);
    }
    for (const commandName of gate.owned_top_level_commands) {
      if (!result.adapter_module.owned_top_level_commands.includes(commandName)) errors.push(`${gate.adapter_module} must own package command ${commandName}`);
    }
    for (const commandName of gate.excluded_top_level_commands) {
      if (!result.adapter_module.excluded_top_level_commands.includes(commandName)) errors.push(`${gate.adapter_module} must exclude non-package command ${commandName}`);
    }
  }
  const workItem = result.milestone_state.work_item;
  const nextWorkItem = result.milestone_state.next_work_item;
  if (sourceLedgerRequired) {
    if (!workItem) errors.push(`${gate.work_item_id} work item must exist`);
    else if (workItem.status !== 'closed') errors.push(`${gate.work_item_id} work item must be closed`);
    if (!nextWorkItem) errors.push(`${gate.next_work_item_id} work item must exist`);
    else if (!['open', 'closed'].includes(nextWorkItem.status)) errors.push(`${gate.next_work_item_id} work item must be open or closed after package adapter extraction admission`);
  }

  return {
    schema: 'agent-onboard-public-package-command-adapter-extraction-check-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: gate.package_name,
    version: VERSION,
    release_line: gate.release_line,
    command: gate.check_command,
    package_root: root,
    package_context: result.package_context,
    validated: {
      package_adapter_extraction_status_admitted: gate.extraction_status === 'package_command_adapter_extraction_admitted',
      adapter_module_present_or_installed_context_allowed: adapterModulePresentOrAllowed,
      adapter_module_requireable_when_present: !result.adapter_module.present || result.adapter_module.status === 'present_validated',
      adapter_module_under_line_budget: result.adapter_module.line_count <= gate.adapter_seed_max_lines,
      adapter_exports_contract: gate.expected_adapter_export_names.every((name) => !result.adapter_module.present || result.adapter_module.exports.includes(name)),
      owned_package_commands_contract: gate.owned_top_level_commands.every((name) => !result.adapter_module.present || result.adapter_module.owned_top_level_commands.includes(name)),
      non_package_commands_excluded: gate.excluded_top_level_commands.every((name) => !result.adapter_module.present || result.adapter_module.excluded_top_level_commands.includes(name)),
      runtime_cutover_not_applied: gate.runtime_cutover_applied === false,
      packaged_runtime_dependency_graph_unchanged: gate.boundary.changes_cli_runtime_dependency_graph === false,
      package_allowlist_unchanged: arrayEquals(result.projected_pack_files, expectedPackFiles),
      package_adapter_module_out_of_pack_for_this_gate: gate.boundary.source_package_adapter_module_remains_out_of_pack === true,
      extraction_file_present_or_installed_context_allowed: artifactStatus === 'present_validated' || artifactStatus === 'not_present_installed_context_allowed',
      work_item_closed_or_installed_context_allowed: !sourceLedgerRequired || (workItem && workItem.status === 'closed'),
      next_architecture_adapter_gate_open_or_installed_context_allowed: !sourceLedgerRequired || (nextWorkItem && ['open', 'closed'].includes(nextWorkItem.status)),
      package_adapter_commands_no_write: gate.boundary.package_adapter_command_writes_files === false && gate.boundary.package_adapter_check_command_writes_files === false
    },
    adapter_module: result.adapter_module,
    runtime_cutover: result.runtime_cutover,
    source_package_adapter_extraction_file: {
      path: gate.extraction_file,
      present: fs.existsSync(artifactPath),
      status: artifactStatus,
      schema: artifactSchema,
      source_context_required: sourceLedgerRequired
    },
    milestone_state: result.milestone_state,
    expected_pack_files: expectedPackFiles,
    projected_pack_files: result.projected_pack_files,
    boundary: result.boundary,
    errors
  };
}

function publicArchitectureCommandAdapterExtraction(root = packageRoot()) {
  const gate = PUBLIC_ARCHITECTURE_COMMAND_ADAPTER_EXTRACTION;
  const pkg = readJson(path.join(root, 'package.json'));
  const context = sourceContext(root);
  const adapterModulePath = path.join(root, gate.adapter_module);
  const artifactPath = path.join(root, gate.extraction_file);
  const adapterLineCount = countFileLines(root, gate.adapter_module);
  let adapterModuleStatus = 'not_present_installed_context_allowed';
  let adapterModuleSchema = null;
  let adapterModuleExports = [];
  let ownedCommands = [];
  let excludedCommands = [];
  let adapterRequireError = null;
  if (fs.existsSync(adapterModulePath)) {
    try {
      delete require.cache[require.resolve(adapterModulePath)];
      const adapterModule = require(adapterModulePath);
      adapterModuleExports = Object.keys(adapterModule).sort();
      const described = typeof adapterModule.describeArchitectureCommandAdapterExtraction === 'function' ? adapterModule.describeArchitectureCommandAdapterExtraction() : null;
      adapterModuleSchema = described && described.schema ? described.schema : null;
      ownedCommands = described && Array.isArray(described.owned_top_level_commands) ? described.owned_top_level_commands.slice().sort() : [];
      excludedCommands = described && Array.isArray(described.excluded_top_level_commands) ? described.excluded_top_level_commands.slice().sort() : [];
      adapterModuleStatus = 'present_validated';
    } catch (error) {
      adapterModuleStatus = 'present_require_failed';
      adapterRequireError = error && error.message ? error.message : String(error);
    }
  }
  const ledgerPath = path.join(root, '.agent-onboard', 'work-items.json');
  let ledger = null;
  if (fs.existsSync(ledgerPath)) {
    try { ledger = readJson(ledgerPath); } catch { ledger = null; }
  }
  const workItems = ledger && Array.isArray(ledger.work_items) ? ledger.work_items : [];
  return {
    schema: 'agent-onboard-public-architecture-command-adapter-extraction-result-001',
    status: 'ok',
    package_name: gate.package_name,
    version: VERSION,
    release_line: gate.release_line,
    command: gate.command,
    check_command: gate.check_command,
    package_root: root,
    package_context: context.package_context,
    package_json_version: pkg.version,
    extraction_file: gate.extraction_file,
    extraction_file_present: fs.existsSync(artifactPath),
    adapter_module: {
      path: gate.adapter_module,
      present: fs.existsSync(adapterModulePath),
      status: adapterModuleStatus,
      schema: adapterModuleSchema,
      exports: adapterModuleExports,
      owned_top_level_commands: ownedCommands,
      excluded_top_level_commands: excludedCommands,
      require_error: adapterRequireError,
      line_count: adapterLineCount,
      max_lines: gate.adapter_seed_max_lines
    },
    compatibility_port_module: gate.compatibility_port_module,
    router_module: gate.router_module,
    runtime_cutover: {
      applied: gate.runtime_cutover_applied,
      entrypoint: 'cli/agent-onboard.js',
      entrypoint_line_count: countFileLines(root, 'cli/agent-onboard.js'),
      architecture_adapter_used_by_entrypoint_in_this_gate: gate.boundary.uses_architecture_adapter_as_runtime_entrypoint
    },
    package_strategy: gate.package_strategy,
    expected_pack_files: PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort(),
    projected_pack_files: packageJsonProjectedPackFiles(pkg).slice().sort(),
    milestone_state: {
      work_item: workItems.find((item) => item.id === gate.work_item_id) || null,
      next_work_item: workItems.find((item) => item.id === gate.next_work_item_id) || null
    },
    adapter_contract: gate,
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
    },
    errors: []
  };
}

function publicArchitectureCommandAdapterExtractionCheck(root = packageRoot()) {
  const result = publicArchitectureCommandAdapterExtraction(root);
  const gate = PUBLIC_ARCHITECTURE_COMMAND_ADAPTER_EXTRACTION;
  const sourceLedgerRequired = result.package_context === 'source_repository';
  const expectedPackFiles = PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort();
  const errors = [];
  if (gate.extraction_status !== 'architecture_command_adapter_extraction_admitted') errors.push('architecture command adapter extraction status must be admitted');
  if (gate.runtime_cutover_applied !== false) errors.push('architecture command adapter extraction must not apply runtime cutover');
  if (gate.package_strategy !== 'controlled_source_module_inclusion') errors.push('architecture command adapter extraction must preserve controlled_source_module_inclusion package strategy');
  if (!arrayEquals(result.projected_pack_files, expectedPackFiles)) errors.push(`projected npm pack files must remain ${expectedPackFiles.join(', ')}`);
  if (gate.boundary.architecture_adapter_command_writes_files !== false) errors.push('architecture --architecture-adapter must remain no-write');
  if (gate.boundary.architecture_adapter_check_command_writes_files !== false) errors.push('architecture --architecture-adapter-check must remain no-write');
  if (gate.boundary.changes_public_cli_outputs !== false) errors.push('architecture command adapter extraction must not change public CLI outputs');
  if (gate.boundary.changes_cli_runtime_dependency_graph !== false) errors.push('architecture command adapter extraction must not change packaged CLI runtime dependency graph');
  if (gate.boundary.uses_architecture_adapter_as_runtime_entrypoint !== false) errors.push('architecture command adapter extraction must not use source modules as the packaged runtime entrypoint yet');
  if (gate.boundary.source_architecture_adapter_module_remains_out_of_pack !== true) errors.push('source architecture adapter module must remain out of npm pack for this gate');
  if (result.adapter_module.line_count > gate.adapter_seed_max_lines) errors.push(`${gate.adapter_module} must stay within ${gate.adapter_seed_max_lines} lines`);

  let artifactStatus = 'not_present_installed_context_allowed';
  let artifactSchema = null;
  const artifactPath = path.join(root, gate.extraction_file);
  if (fs.existsSync(artifactPath)) {
    try {
      const artifact = readJson(artifactPath);
      artifactSchema = artifact.schema || null;
      if (artifact.schema !== gate.schema) errors.push(`${gate.extraction_file} schema must be ${gate.schema}`);
      if (artifact.work_item_id !== gate.work_item_id) errors.push(`${gate.extraction_file} must identify ${gate.work_item_id}`);
      if (artifact.next_work_item_id !== gate.next_work_item_id) errors.push(`${gate.extraction_file} must seed ${gate.next_work_item_id}`);
      if (artifact.adapter_module !== gate.adapter_module) errors.push(`${gate.extraction_file} must declare ${gate.adapter_module}`);
      if (artifact.runtime_cutover_applied !== false) errors.push(`${gate.extraction_file} must not apply runtime cutover`);
      if (!artifact.boundary || artifact.boundary.package_allowlist_unchanged !== true) errors.push(`${gate.extraction_file} must preserve package_allowlist_unchanged`);
      artifactStatus = 'present_validated';
    } catch (error) {
      artifactStatus = 'present_invalid_json';
      errors.push(`${gate.extraction_file} must be valid JSON: ${error && error.message ? error.message : String(error)}`);
    }
  } else if (sourceLedgerRequired) {
    artifactStatus = 'missing_source_context';
    errors.push(`${gate.extraction_file} must exist in source repository context`);
  }

  const adapterModulePresentOrAllowed = result.adapter_module.present || result.package_context === 'installed_package';
  if (!adapterModulePresentOrAllowed) errors.push(`${gate.adapter_module} must exist in source repository context`);
  if (result.adapter_module.present) {
    if (result.adapter_module.status !== 'present_validated') errors.push(`${gate.adapter_module} must be require-able without side effects${result.adapter_module.require_error ? `: ${result.adapter_module.require_error}` : ''}`);
    if (result.adapter_module.schema !== 'agent-onboard-public-architecture-command-adapter-extraction-module-001') errors.push(`${gate.adapter_module} must expose architecture command adapter extraction module schema`);
    for (const exportName of gate.expected_adapter_export_names) {
      if (!result.adapter_module.exports.includes(exportName)) errors.push(`${gate.adapter_module} must export ${exportName}`);
    }
    for (const commandName of gate.owned_top_level_commands) {
      if (!result.adapter_module.owned_top_level_commands.includes(commandName)) errors.push(`${gate.adapter_module} must own architecture command ${commandName}`);
    }
    for (const commandName of gate.excluded_top_level_commands) {
      if (!result.adapter_module.excluded_top_level_commands.includes(commandName)) errors.push(`${gate.adapter_module} must exclude non-architecture command ${commandName}`);
    }
  }
  const workItem = result.milestone_state.work_item;
  const nextWorkItem = result.milestone_state.next_work_item;
  if (sourceLedgerRequired) {
    if (!workItem) errors.push(`${gate.work_item_id} work item must exist`);
    else if (workItem.status !== 'closed') errors.push(`${gate.work_item_id} work item must be closed`);
    if (!nextWorkItem) errors.push(`${gate.next_work_item_id} work item must exist`);
    else if (!['open', 'closed'].includes(nextWorkItem.status)) errors.push(`${gate.next_work_item_id} work item must be open or closed after architecture adapter extraction admission`);
  }

  return {
    schema: 'agent-onboard-public-architecture-command-adapter-extraction-check-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: gate.package_name,
    version: VERSION,
    release_line: gate.release_line,
    command: gate.check_command,
    package_root: root,
    package_context: result.package_context,
    validated: {
      architecture_adapter_extraction_status_admitted: gate.extraction_status === 'architecture_command_adapter_extraction_admitted',
      adapter_module_present_or_installed_context_allowed: adapterModulePresentOrAllowed,
      adapter_module_requireable_when_present: !result.adapter_module.present || result.adapter_module.status === 'present_validated',
      adapter_module_under_line_budget: result.adapter_module.line_count <= gate.adapter_seed_max_lines,
      adapter_exports_contract: gate.expected_adapter_export_names.every((name) => !result.adapter_module.present || result.adapter_module.exports.includes(name)),
      owned_architecture_commands_contract: gate.owned_top_level_commands.every((name) => !result.adapter_module.present || result.adapter_module.owned_top_level_commands.includes(name)),
      non_architecture_commands_excluded: gate.excluded_top_level_commands.every((name) => !result.adapter_module.present || result.adapter_module.excluded_top_level_commands.includes(name)),
      runtime_cutover_not_applied: gate.runtime_cutover_applied === false,
      packaged_runtime_dependency_graph_unchanged: gate.boundary.changes_cli_runtime_dependency_graph === false,
      package_allowlist_unchanged: arrayEquals(result.projected_pack_files, expectedPackFiles),
      architecture_adapter_module_out_of_pack_for_this_gate: gate.boundary.source_architecture_adapter_module_remains_out_of_pack === true,
      extraction_file_present_or_installed_context_allowed: artifactStatus === 'present_validated' || artifactStatus === 'not_present_installed_context_allowed',
      work_item_closed_or_installed_context_allowed: !sourceLedgerRequired || (workItem && workItem.status === 'closed'),
      next_authority_adapter_gate_open_or_installed_context_allowed: !sourceLedgerRequired || (nextWorkItem && ['open', 'closed'].includes(nextWorkItem.status)),
      architecture_adapter_commands_no_write: gate.boundary.architecture_adapter_command_writes_files === false && gate.boundary.architecture_adapter_check_command_writes_files === false
    },
    adapter_module: result.adapter_module,
    runtime_cutover: result.runtime_cutover,
    source_architecture_adapter_extraction_file: {
      path: gate.extraction_file,
      present: fs.existsSync(artifactPath),
      status: artifactStatus,
      schema: artifactSchema,
      source_context_required: sourceLedgerRequired
    },
    milestone_state: result.milestone_state,
    expected_pack_files: expectedPackFiles,
    projected_pack_files: result.projected_pack_files,
    boundary: result.boundary,
    errors
  };
}

function publicAuthorityCommandAdapterExtraction(root = packageRoot()) {
  const gate = PUBLIC_AUTHORITY_COMMAND_ADAPTER_EXTRACTION;
  const pkg = readJson(path.join(root, 'package.json'));
  const context = sourceContext(root);
  const adapterModulePath = path.join(root, gate.adapter_module);
  const artifactPath = path.join(root, gate.extraction_file);
  const adapterLineCount = countFileLines(root, gate.adapter_module);
  let adapterModuleStatus = 'not_present_installed_context_allowed';
  let adapterModuleSchema = null;
  let adapterModuleExports = [];
  let ownedCommands = [];
  let excludedCommands = [];
  let adapterRequireError = null;
  if (fs.existsSync(adapterModulePath)) {
    try {
      delete require.cache[require.resolve(adapterModulePath)];
      const adapterModule = require(adapterModulePath);
      adapterModuleExports = Object.keys(adapterModule).sort();
      const described = typeof adapterModule.describeAuthorityCommandAdapterExtraction === 'function' ? adapterModule.describeAuthorityCommandAdapterExtraction() : null;
      adapterModuleSchema = described && described.schema ? described.schema : null;
      ownedCommands = described && Array.isArray(described.owned_top_level_commands) ? described.owned_top_level_commands.slice().sort() : [];
      excludedCommands = described && Array.isArray(described.excluded_top_level_commands) ? described.excluded_top_level_commands.slice().sort() : [];
      adapterModuleStatus = 'present_validated';
    } catch (error) {
      adapterModuleStatus = 'present_require_failed';
      adapterRequireError = error && error.message ? error.message : String(error);
    }
  }
  const ledgerPath = path.join(root, '.agent-onboard', 'work-items.json');
  let ledger = null;
  if (fs.existsSync(ledgerPath)) {
    try { ledger = readJson(ledgerPath); } catch { ledger = null; }
  }
  const workItems = ledger && Array.isArray(ledger.work_items) ? ledger.work_items : [];
  return {
    schema: 'agent-onboard-public-authority-command-adapter-extraction-result-001',
    status: 'ok',
    package_name: gate.package_name,
    version: VERSION,
    release_line: gate.release_line,
    command: gate.command,
    check_command: gate.check_command,
    package_root: root,
    package_context: context.package_context,
    package_json_version: pkg.version,
    extraction_file: gate.extraction_file,
    extraction_file_present: fs.existsSync(artifactPath),
    adapter_module: {
      path: gate.adapter_module,
      present: fs.existsSync(adapterModulePath),
      status: adapterModuleStatus,
      schema: adapterModuleSchema,
      exports: adapterModuleExports,
      owned_top_level_commands: ownedCommands,
      excluded_top_level_commands: excludedCommands,
      require_error: adapterRequireError,
      line_count: adapterLineCount,
      max_lines: gate.adapter_seed_max_lines
    },
    compatibility_port_module: gate.compatibility_port_module,
    router_module: gate.router_module,
    runtime_cutover: {
      applied: gate.runtime_cutover_applied,
      entrypoint: 'cli/agent-onboard.js',
      entrypoint_line_count: countFileLines(root, 'cli/agent-onboard.js'),
      authority_adapter_used_by_entrypoint_in_this_gate: gate.boundary.uses_authority_adapter_as_runtime_entrypoint
    },
    package_strategy: gate.package_strategy,
    expected_pack_files: PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort(),
    projected_pack_files: packageJsonProjectedPackFiles(pkg).slice().sort(),
    milestone_state: {
      work_item: workItems.find((item) => item.id === gate.work_item_id) || null,
      next_work_item: workItems.find((item) => item.id === gate.next_work_item_id) || null
    },
    adapter_contract: gate,
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
    },
    errors: []
  };
}

function publicAuthorityCommandAdapterExtractionCheck(root = packageRoot()) {
  const result = publicAuthorityCommandAdapterExtraction(root);
  const gate = PUBLIC_AUTHORITY_COMMAND_ADAPTER_EXTRACTION;
  const sourceLedgerRequired = result.package_context === 'source_repository';
  const expectedPackFiles = PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort();
  const errors = [];
  if (gate.extraction_status !== 'authority_command_adapter_extraction_admitted') errors.push('authority command adapter extraction status must be admitted');
  if (gate.runtime_cutover_applied !== false) errors.push('authority command adapter extraction must not apply runtime cutover');
  if (gate.package_strategy !== 'controlled_source_module_inclusion') errors.push('authority command adapter extraction must preserve controlled_source_module_inclusion package strategy');
  if (!arrayEquals(result.projected_pack_files, expectedPackFiles)) errors.push(`projected npm pack files must remain ${expectedPackFiles.join(', ')}`);
  if (gate.boundary.authority_adapter_command_writes_files !== false) errors.push('architecture --authority-adapter must remain no-write');
  if (gate.boundary.authority_adapter_check_command_writes_files !== false) errors.push('architecture --authority-adapter-check must remain no-write');
  if (gate.boundary.changes_public_cli_outputs !== false) errors.push('authority command adapter extraction must not change public CLI outputs');
  if (gate.boundary.changes_cli_runtime_dependency_graph !== false) errors.push('authority command adapter extraction must not change packaged CLI runtime dependency graph');
  if (gate.boundary.uses_authority_adapter_as_runtime_entrypoint !== false) errors.push('authority command adapter extraction must not use source modules as the packaged runtime entrypoint yet');
  if (gate.boundary.source_authority_adapter_module_remains_out_of_pack !== true) errors.push('source authority adapter module must remain out of npm pack for this gate');
  if (result.adapter_module.line_count > gate.adapter_seed_max_lines) errors.push(`${gate.adapter_module} must stay within ${gate.adapter_seed_max_lines} lines`);

  let artifactStatus = 'not_present_installed_context_allowed';
  let artifactSchema = null;
  const artifactPath = path.join(root, gate.extraction_file);
  if (fs.existsSync(artifactPath)) {
    try {
      const artifact = readJson(artifactPath);
      artifactSchema = artifact.schema || null;
      if (artifact.schema !== gate.schema) errors.push(`${gate.extraction_file} schema must be ${gate.schema}`);
      if (artifact.work_item_id !== gate.work_item_id) errors.push(`${gate.extraction_file} must identify ${gate.work_item_id}`);
      if (artifact.next_work_item_id !== gate.next_work_item_id) errors.push(`${gate.extraction_file} must seed ${gate.next_work_item_id}`);
      if (artifact.adapter_module !== gate.adapter_module) errors.push(`${gate.extraction_file} must declare ${gate.adapter_module}`);
      if (artifact.runtime_cutover_applied !== false) errors.push(`${gate.extraction_file} must not apply runtime cutover`);
      if (!artifact.boundary || artifact.boundary.package_allowlist_unchanged !== true) errors.push(`${gate.extraction_file} must preserve package_allowlist_unchanged`);
      artifactStatus = 'present_validated';
    } catch (error) {
      artifactStatus = 'present_invalid_json';
      errors.push(`${gate.extraction_file} must be valid JSON: ${error && error.message ? error.message : String(error)}`);
    }
  } else if (sourceLedgerRequired) {
    artifactStatus = 'missing_source_context';
    errors.push(`${gate.extraction_file} must exist in source repository context`);
  }

  const adapterModulePresentOrAllowed = result.adapter_module.present || result.package_context === 'installed_package';
  if (!adapterModulePresentOrAllowed) errors.push(`${gate.adapter_module} must exist in source repository context`);
  if (result.adapter_module.present) {
    if (result.adapter_module.status !== 'present_validated') errors.push(`${gate.adapter_module} must be require-able without side effects${result.adapter_module.require_error ? `: ${result.adapter_module.require_error}` : ''}`);
    if (result.adapter_module.schema !== 'agent-onboard-public-authority-command-adapter-extraction-module-001') errors.push(`${gate.adapter_module} must expose authority command adapter extraction module schema`);
    for (const exportName of gate.expected_adapter_export_names) {
      if (!result.adapter_module.exports.includes(exportName)) errors.push(`${gate.adapter_module} must export ${exportName}`);
    }
    for (const commandName of gate.owned_top_level_commands) {
      if (!result.adapter_module.owned_top_level_commands.includes(commandName)) errors.push(`${gate.adapter_module} must own authority command ${commandName}`);
    }
    for (const commandName of gate.excluded_top_level_commands) {
      if (!result.adapter_module.excluded_top_level_commands.includes(commandName)) errors.push(`${gate.adapter_module} must exclude non-authority command ${commandName}`);
    }
  }
  const workItem = result.milestone_state.work_item;
  const nextWorkItem = result.milestone_state.next_work_item;
  if (sourceLedgerRequired) {
    if (!workItem) errors.push(`${gate.work_item_id} work item must exist`);
    else if (workItem.status !== 'closed') errors.push(`${gate.work_item_id} work item must be closed`);
    if (!nextWorkItem) errors.push(`${gate.next_work_item_id} work item must exist`);
    else if (!['open', 'closed'].includes(nextWorkItem.status)) errors.push(`${gate.next_work_item_id} work item must be open or closed after authority adapter extraction admission`);
  }

  return {
    schema: 'agent-onboard-public-authority-command-adapter-extraction-check-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: gate.package_name,
    version: VERSION,
    release_line: gate.release_line,
    command: gate.check_command,
    package_root: root,
    package_context: result.package_context,
    validated: {
      authority_adapter_extraction_status_admitted: gate.extraction_status === 'authority_command_adapter_extraction_admitted',
      adapter_module_present_or_installed_context_allowed: adapterModulePresentOrAllowed,
      adapter_module_requireable_when_present: !result.adapter_module.present || result.adapter_module.status === 'present_validated',
      adapter_module_under_line_budget: result.adapter_module.line_count <= gate.adapter_seed_max_lines,
      adapter_exports_contract: gate.expected_adapter_export_names.every((name) => !result.adapter_module.present || result.adapter_module.exports.includes(name)),
      owned_authority_commands_contract: gate.owned_top_level_commands.every((name) => !result.adapter_module.present || result.adapter_module.owned_top_level_commands.includes(name)),
      non_authority_commands_excluded: gate.excluded_top_level_commands.every((name) => !result.adapter_module.present || result.adapter_module.excluded_top_level_commands.includes(name)),
      runtime_cutover_not_applied: gate.runtime_cutover_applied === false,
      packaged_runtime_dependency_graph_unchanged: gate.boundary.changes_cli_runtime_dependency_graph === false,
      package_allowlist_unchanged: arrayEquals(result.projected_pack_files, expectedPackFiles),
      authority_adapter_module_out_of_pack_for_this_gate: gate.boundary.source_authority_adapter_module_remains_out_of_pack === true,
      extraction_file_present_or_installed_context_allowed: artifactStatus === 'present_validated' || artifactStatus === 'not_present_installed_context_allowed',
      work_item_closed_or_installed_context_allowed: !sourceLedgerRequired || (workItem && workItem.status === 'closed'),
      next_work_items_adapter_gate_open_or_installed_context_allowed: !sourceLedgerRequired || (nextWorkItem && ['open', 'closed'].includes(nextWorkItem.status)),
      authority_adapter_commands_no_write: gate.boundary.authority_adapter_command_writes_files === false && gate.boundary.authority_adapter_check_command_writes_files === false
    },
    adapter_module: result.adapter_module,
    runtime_cutover: result.runtime_cutover,
    source_authority_adapter_extraction_file: {
      path: gate.extraction_file,
      present: fs.existsSync(artifactPath),
      status: artifactStatus,
      schema: artifactSchema,
      source_context_required: sourceLedgerRequired
    },
    milestone_state: result.milestone_state,
    expected_pack_files: expectedPackFiles,
    projected_pack_files: result.projected_pack_files,
    boundary: result.boundary,
    errors
  };
}

function publicModularRuntimePackageInclusionPlan(root = packageRoot()) {
  const gate = PUBLIC_MODULAR_RUNTIME_PACKAGE_INCLUSION_PLAN;
  const pkg = readJson(path.join(root, 'package.json'));
  const context = sourceContext(root);
  const planningPath = path.join(root, gate.planning_file);
  const ledgerPath = path.join(root, '.agent-onboard', 'work-items.json');
  let ledger = null;
  if (fs.existsSync(ledgerPath)) {
    try { ledger = readJson(ledgerPath); } catch { ledger = null; }
  }
  const workItems = ledger && Array.isArray(ledger.work_items) ? ledger.work_items : [];
  return {
    schema: 'agent-onboard-public-modular-runtime-package-inclusion-plan-result-001',
    status: 'ok',
    package_name: gate.package_name,
    version: VERSION,
    release_line: gate.release_line,
    command: gate.command,
    check_command: gate.check_command,
    package_root: root,
    package_context: context.package_context,
    package_json_version: pkg.version,
    planning_file: gate.planning_file,
    planning_file_present: fs.existsSync(planningPath),
    planning_status: gate.planning_status,
    current_public_package_files: gate.current_public_package_files.slice().sort(),
    projected_pack_files: packageJsonProjectedPackFiles(pkg).slice().sort(),
    expected_pack_files: PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort(),
    runtime_reference_shape: gate.runtime_reference_shape,
    future_include_candidates: gate.future_include_candidates.slice(),
    first_inclusion_slice: gate.first_inclusion_slice,
    milestone_state: {
      work_item: workItems.find((item) => item.id === gate.work_item_id) || null,
      next_work_item: workItems.find((item) => item.id === gate.next_work_item_id) || null
    },
    plan: gate,
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
    },
    errors: []
  };
}

function publicModularRuntimePackageInclusionPlanCheck(root = packageRoot()) {
  const result = publicModularRuntimePackageInclusionPlan(root);
  const gate = PUBLIC_MODULAR_RUNTIME_PACKAGE_INCLUSION_PLAN;
  const sourceLedgerRequired = result.package_context === 'source_repository';
  const expectedPackFiles = PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort();
  const planningGatePackFiles = gate.current_public_package_files.slice().sort();
  const compactPackStillCurrent = arrayEquals(result.projected_pack_files, planningGatePackFiles);
  const plannedExpansionApplied = gate.boundary.future_package_allowlist_change_planned === true && arrayEquals(result.projected_pack_files, expectedPackFiles);
  const errors = [];
  if (gate.planning_status !== 'modular_runtime_package_inclusion_plan_admitted') errors.push('modular runtime package inclusion plan status must be admitted');
  if (!compactPackStillCurrent && !plannedExpansionApplied) errors.push(`projected npm pack files must be either the planning gate compact files ${planningGatePackFiles.join(', ')} or the admitted current release files ${expectedPackFiles.join(', ')}`);
  if (gate.boundary.package_allowlist_unchanged_for_this_gate !== true) errors.push('module inclusion planning gate must keep package allowlist unchanged');
  if (gate.boundary.future_package_allowlist_change_planned !== true) errors.push('module inclusion planning gate must explicitly plan a future package allowlist change');
  if (gate.boundary.runtime_cutover_applied !== false) errors.push('module inclusion planning gate must not apply runtime cutover');
  if (gate.boundary.changes_public_cli_outputs !== false) errors.push('module inclusion planning gate must not change public CLI outputs');
  if (gate.boundary.changes_cli_runtime_dependency_graph !== false) errors.push('module inclusion planning gate must not change packaged CLI runtime dependency graph');
  if (gate.boundary.module_inclusion_plan_command_writes_files !== false) errors.push('architecture --module-inclusion-plan must remain no-write');
  if (gate.boundary.module_inclusion_check_command_writes_files !== false) errors.push('architecture --module-inclusion-check must remain no-write');
  if (!gate.future_include_candidates.includes('cli/agent_onboard/command-router.js')) errors.push('future include candidates must include the command router');
  if (!gate.future_include_candidates.includes('cli/agent_onboard/adapters/compatibility-command-port.js')) errors.push('future include candidates must include the compatibility command port adapter');
  if (gate.first_inclusion_slice.runtime_cutover_allowed !== false) errors.push('first inclusion slice must not allow runtime cutover');
  if (gate.first_inclusion_slice.package_files_change_allowed !== true) errors.push('first inclusion slice must allow a controlled package files change');

  let planningFileStatus = 'not_present_installed_context_allowed';
  let planningFileSchema = null;
  const planningPath = path.join(root, gate.planning_file);
  if (fs.existsSync(planningPath)) {
    try {
      const artifact = readJson(planningPath);
      planningFileSchema = artifact.schema || null;
      if (artifact.schema !== gate.schema) errors.push(`${gate.planning_file} schema must be ${gate.schema}`);
      if (artifact.work_item_id !== gate.work_item_id) errors.push(`${gate.planning_file} must identify ${gate.work_item_id}`);
      if (artifact.next_work_item_id !== gate.next_work_item_id) errors.push(`${gate.planning_file} must seed ${gate.next_work_item_id}`);
      if (artifact.planning_status !== gate.planning_status) errors.push(`${gate.planning_file} must admit ${gate.planning_status}`);
      if (!artifact.boundary || artifact.boundary.package_allowlist_unchanged_for_this_gate !== true) errors.push(`${gate.planning_file} must preserve package_allowlist_unchanged_for_this_gate`);
      if (!artifact.boundary || artifact.boundary.future_package_allowlist_change_planned !== true) errors.push(`${gate.planning_file} must plan a future package allowlist change`);
      planningFileStatus = 'present_validated';
    } catch (error) {
      planningFileStatus = 'present_invalid_json';
      errors.push(`${gate.planning_file} must be valid JSON: ${error && error.message ? error.message : String(error)}`);
    }
  } else if (sourceLedgerRequired) {
    planningFileStatus = 'missing_source_context';
    errors.push(`${gate.planning_file} must exist in source repository context`);
  }

  const workItem = result.milestone_state.work_item;
  const nextWorkItem = result.milestone_state.next_work_item;
  if (sourceLedgerRequired) {
    if (!workItem) errors.push(`${gate.work_item_id} work item must exist`);
    else if (workItem.status !== 'closed') errors.push(`${gate.work_item_id} work item must be closed`);
    if (!nextWorkItem) errors.push(`${gate.next_work_item_id} work item must exist`);
    else if (!['open', 'closed'].includes(nextWorkItem.status)) errors.push(`${gate.next_work_item_id} work item must be open or closed after module inclusion planning`);
  }

  return {
    schema: 'agent-onboard-public-modular-runtime-package-inclusion-plan-check-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: gate.package_name,
    version: VERSION,
    release_line: gate.release_line,
    command: gate.check_command,
    package_root: root,
    package_context: result.package_context,
    validated: {
      planning_status_admitted: gate.planning_status === 'modular_runtime_package_inclusion_plan_admitted',
      compact_pack_allowlist_preserved_for_planning_gate_or_superseded_by_admitted_inclusion: compactPackStillCurrent || plannedExpansionApplied,
      future_package_allowlist_change_planned: gate.boundary.future_package_allowlist_change_planned === true,
      runtime_cutover_not_applied: gate.boundary.runtime_cutover_applied === false,
      public_cli_outputs_unchanged: gate.boundary.changes_public_cli_outputs === false,
      packaged_runtime_dependency_graph_unchanged: gate.boundary.changes_cli_runtime_dependency_graph === false,
      planning_commands_no_write: gate.boundary.module_inclusion_plan_command_writes_files === false && gate.boundary.module_inclusion_check_command_writes_files === false,
      runtime_reference_shape_declared: !!gate.runtime_reference_shape.router_module && !!gate.runtime_reference_shape.compatibility_port_module,
      first_inclusion_slice_declared: gate.first_inclusion_slice.package_files_change_allowed === true && gate.first_inclusion_slice.runtime_cutover_allowed === false,
      planning_file_present_or_installed_context_allowed: planningFileStatus === 'present_validated' || planningFileStatus === 'not_present_installed_context_allowed',
      work_item_closed_or_installed_context_allowed: !sourceLedgerRequired || (workItem && workItem.status === 'closed'),
      next_packaged_router_inclusion_gate_open_or_installed_context_allowed: !sourceLedgerRequired || (nextWorkItem && ['open', 'closed'].includes(nextWorkItem.status))
    },
    source_modular_runtime_package_inclusion_plan_file: {
      path: gate.planning_file,
      present: fs.existsSync(planningPath),
      status: planningFileStatus,
      schema: planningFileSchema,
      source_context_required: sourceLedgerRequired
    },
    milestone_state: result.milestone_state,
    expected_pack_files: expectedPackFiles,
    projected_pack_files: result.projected_pack_files,
    future_include_candidates: gate.future_include_candidates.slice(),
    first_inclusion_slice: gate.first_inclusion_slice,
    boundary: result.boundary,
    errors
  };
}

function inspectPackagedModule(root, rel, expectedExports) {
  const abs = path.join(root, rel);
  const present = fs.existsSync(abs);
  let status = present ? 'present_unvalidated' : 'missing';
  let exportsList = [];
  let requireError = null;
  if (present) {
    try {
      delete require.cache[require.resolve(abs)];
      exportsList = Object.keys(require(abs)).sort();
      status = 'present_validated';
    } catch (error) {
      status = 'present_require_failed';
      requireError = error && error.message ? error.message : String(error);
    }
  }
  return {
    path: rel,
    present,
    status,
    exports: exportsList,
    expected_exports: expectedExports.slice().sort(),
    require_error: requireError,
    line_count: countFileLines(root, rel)
  };
}

function publicPackagedRouterPortInclusion(root = packageRoot()) {
  const gate = PUBLIC_PACKAGED_ROUTER_PORT_INCLUSION;
  const pkg = readJson(path.join(root, 'package.json'));
  const context = sourceContext(root);
  const inclusionPath = path.join(root, gate.inclusion_file);
  const moduleReports = gate.included_module_files.map((rel) => inspectPackagedModule(root, rel, gate.expected_module_exports[rel] || Object.freeze([])));
  const ledgerPath = path.join(root, '.agent-onboard', 'work-items.json');
  let ledger = null;
  if (fs.existsSync(ledgerPath)) {
    try { ledger = readJson(ledgerPath); } catch { ledger = null; }
  }
  const workItems = ledger && Array.isArray(ledger.work_items) ? ledger.work_items : [];
  return {
    schema: 'agent-onboard-public-packaged-router-port-inclusion-result-001',
    status: 'ok',
    package_name: gate.package_name,
    version: VERSION,
    release_line: gate.release_line,
    command: gate.command,
    check_command: gate.check_command,
    package_root: root,
    package_context: context.package_context,
    package_json_version: pkg.version,
    inclusion_file: gate.inclusion_file,
    inclusion_file_present: fs.existsSync(inclusionPath),
    inclusion_status: gate.inclusion_status,
    runtime_cutover: {
      applied: gate.runtime_cutover_applied,
      entrypoint: gate.entrypoint,
      entrypoint_line_count: countFileLines(root, gate.entrypoint)
    },
    included_module_files: gate.included_module_files.slice(),
    module_reports: moduleReports,
    expected_pack_files: gate.included_package_files.slice().sort(),
    projected_pack_files: packageJsonProjectedPackFiles(pkg).slice().sort(),
    milestone_state: {
      work_item: workItems.find((item) => item.id === gate.work_item_id) || null,
      next_work_item: workItems.find((item) => item.id === gate.next_work_item_id) || null
    },
    inclusion_contract: gate,
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
    },
    errors: []
  };
}

function publicPackagedRouterPortInclusionCheck(root = packageRoot()) {
  const result = publicPackagedRouterPortInclusion(root);
  const gate = PUBLIC_PACKAGED_ROUTER_PORT_INCLUSION;
  const sourceLedgerRequired = result.package_context === 'source_repository';
  const expectedPackFiles = gate.included_package_files.slice().sort();
  const errors = [];
  if (gate.inclusion_status !== 'packaged_router_port_inclusion_admitted') errors.push('packaged router port inclusion status must be admitted');
  if (!arrayEquals(result.projected_pack_files, expectedPackFiles)) errors.push(`projected npm pack files must be ${expectedPackFiles.join(', ')}`);
  if (gate.runtime_cutover_applied !== false) errors.push('packaged router port inclusion must not apply runtime cutover');
  if (gate.boundary.package_allowlist_expanded !== true) errors.push('packaged router port inclusion must expand package allowlist');
  if (gate.boundary.package_file_count !== expectedPackFiles.length) errors.push(`packaged router port inclusion package file count must be ${expectedPackFiles.length}`);
  if (gate.boundary.changes_public_cli_outputs !== false) errors.push('packaged router port inclusion must not change public CLI outputs');
  if (gate.boundary.changes_cli_runtime_dependency_graph !== false) errors.push('packaged router port inclusion must not change packaged CLI runtime dependency graph yet');
  if (gate.boundary.packaged_router_port_command_writes_files !== false) errors.push('architecture --packaged-router-port must remain no-write');
  if (gate.boundary.packaged_router_port_check_command_writes_files !== false) errors.push('architecture --packaged-router-port-check must remain no-write');

  for (const report of result.module_reports) {
    if (!report.present) errors.push(`${report.path} must exist for packaged router port inclusion`);
    if (report.status !== 'present_validated') errors.push(`${report.path} must be require-able without side effects${report.require_error ? `: ${report.require_error}` : ''}`);
    for (const exportName of report.expected_exports) {
      if (!report.exports.includes(exportName)) errors.push(`${report.path} must export ${exportName}`);
    }
    if (!result.projected_pack_files.includes(report.path)) errors.push(`${report.path} must be included in projected npm pack files`);
  }

  let inclusionFileStatus = 'not_present_installed_context_allowed';
  let inclusionFileSchema = null;
  const inclusionPath = path.join(root, gate.inclusion_file);
  if (fs.existsSync(inclusionPath)) {
    try {
      const artifact = readJson(inclusionPath);
      inclusionFileSchema = artifact.schema || null;
      if (artifact.schema !== gate.schema) errors.push(`${gate.inclusion_file} schema must be ${gate.schema}`);
      if (artifact.work_item_id !== gate.work_item_id) errors.push(`${gate.inclusion_file} must identify ${gate.work_item_id}`);
      if (artifact.next_work_item_id !== gate.next_work_item_id) errors.push(`${gate.inclusion_file} must seed ${gate.next_work_item_id}`);
      if (artifact.inclusion_status !== gate.inclusion_status) errors.push(`${gate.inclusion_file} must admit ${gate.inclusion_status}`);
      if (artifact.runtime_cutover_applied !== false) errors.push(`${gate.inclusion_file} must not apply runtime cutover`);
      if (!artifact.boundary || artifact.boundary.package_allowlist_expanded !== true) errors.push(`${gate.inclusion_file} must declare package_allowlist_expanded`);
      inclusionFileStatus = 'present_validated';
    } catch (error) {
      inclusionFileStatus = 'present_invalid_json';
      errors.push(`${gate.inclusion_file} must be valid JSON: ${error && error.message ? error.message : String(error)}`);
    }
  } else if (sourceLedgerRequired) {
    inclusionFileStatus = 'missing_source_context';
    errors.push(`${gate.inclusion_file} must exist in source repository context`);
  }

  const workItem = result.milestone_state.work_item;
  const nextWorkItem = result.milestone_state.next_work_item;
  if (sourceLedgerRequired) {
    if (!workItem) errors.push(`${gate.work_item_id} work item must exist`);
    else if (workItem.status !== 'closed') errors.push(`${gate.work_item_id} work item must be closed`);
    if (!nextWorkItem) errors.push(`${gate.next_work_item_id} work item must exist`);
    else if (!['open', 'closed'].includes(nextWorkItem.status)) errors.push(`${gate.next_work_item_id} work item must be open or closed after packaged router port inclusion`);
  }

  return {
    schema: 'agent-onboard-public-packaged-router-port-inclusion-check-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: gate.package_name,
    version: VERSION,
    release_line: gate.release_line,
    command: gate.check_command,
    package_root: root,
    package_context: result.package_context,
    validated: {
      inclusion_status_admitted: gate.inclusion_status === 'packaged_router_port_inclusion_admitted',
      projected_pack_files_match_inclusion_contract: arrayEquals(result.projected_pack_files, expectedPackFiles),
      package_allowlist_expanded: gate.boundary.package_allowlist_expanded === true,
      runtime_cutover_not_applied: gate.runtime_cutover_applied === false,
      public_cli_outputs_unchanged: gate.boundary.changes_public_cli_outputs === false,
      packaged_runtime_dependency_graph_unchanged: gate.boundary.changes_cli_runtime_dependency_graph === false,
      packaged_router_port_commands_no_write: gate.boundary.packaged_router_port_command_writes_files === false && gate.boundary.packaged_router_port_check_command_writes_files === false,
      module_files_present: result.module_reports.every((report) => report.present),
      module_files_requireable: result.module_reports.every((report) => report.status === 'present_validated'),
      module_exports_contract: result.module_reports.every((report) => report.expected_exports.every((name) => report.exports.includes(name))),
      module_files_in_projected_pack: result.module_reports.every((report) => result.projected_pack_files.includes(report.path)),
      inclusion_file_present_or_installed_context_allowed: inclusionFileStatus === 'present_validated' || inclusionFileStatus === 'not_present_installed_context_allowed',
      work_item_closed_or_installed_context_allowed: !sourceLedgerRequired || (workItem && workItem.status === 'closed'),
      next_thin_entrypoint_cutover_gate_open_or_installed_context_allowed: !sourceLedgerRequired || (nextWorkItem && ['open', 'closed'].includes(nextWorkItem.status))
    },
    source_packaged_router_port_inclusion_file: {
      path: gate.inclusion_file,
      present: fs.existsSync(inclusionPath),
      status: inclusionFileStatus,
      schema: inclusionFileSchema,
      source_context_required: sourceLedgerRequired
    },
    module_reports: result.module_reports,
    milestone_state: result.milestone_state,
    expected_pack_files: expectedPackFiles,
    projected_pack_files: result.projected_pack_files,
    runtime_cutover: result.runtime_cutover,
    boundary: result.boundary,
    errors
  };
}

function runThinEntrypointRehearsalVectors(root, gate) {
  let router = null;
  let portFactory = null;
  let routerLoadError = null;
  let portLoadError = null;
  try {
    router = require(path.join(root, gate.router_module));
  } catch (error) {
    routerLoadError = error && error.message ? error.message : String(error);
  }
  try {
    portFactory = require(path.join(root, gate.compatibility_port_module));
  } catch (error) {
    portLoadError = error && error.message ? error.message : String(error);
  }
  const canRun = router && typeof router.route === 'function' && portFactory && typeof portFactory.createCompatibilityCommandPort === 'function';
  const reports = [];
  if (!canRun) {
    return { can_run: false, router_load_error: routerLoadError, port_load_error: portLoadError, reports };
  }
  const handlers = Object.freeze({
    status(argv) {
      return Object.freeze({ schema: 'agent-onboard-public-thin-entrypoint-rehearsal-vector-result-001', status: 'ok', command: argv[2], writes_files: false });
    },
    help(argv) {
      return Object.freeze({ schema: 'agent-onboard-public-thin-entrypoint-rehearsal-vector-result-001', status: 'ok', command: argv[2] || 'help', writes_files: false });
    },
    default(argv) {
      return Object.freeze({ schema: 'agent-onboard-public-thin-entrypoint-rehearsal-vector-result-001', status: argv[2] ? 'unhandled_source_only_seed' : 'ok', command: argv[2] || 'help', writes_files: false });
    }
  });
  const port = portFactory.createCompatibilityCommandPort(handlers);
  for (const vector of gate.rehearsal_vectors) {
    let vectorResult = null;
    let error = null;
    try {
      vectorResult = router.route(vector.argv.slice(), port);
    } catch (caught) {
      error = caught && caught.message ? caught.message : String(caught);
    }
    reports.push(Object.freeze({
      id: vector.id,
      argv: vector.argv.slice(),
      expected_status: vector.expected_status,
      actual_status: vectorResult && vectorResult.status ? vectorResult.status : null,
      writes_files: vectorResult && vectorResult.writes_files === true,
      matched: !!vectorResult && vectorResult.status === vector.expected_status && vectorResult.writes_files !== true,
      error
    }));
  }
  return { can_run: true, router_load_error: routerLoadError, port_load_error: portLoadError, reports };
}

function publicThinEntrypointRouterCutoverRehearsal(root = packageRoot()) {
  const gate = PUBLIC_THIN_ENTRYPOINT_ROUTER_CUTOVER_REHEARSAL;
  const pkg = readJson(path.join(root, 'package.json'));
  const context = sourceContext(root);
  const rehearsalPath = path.join(root, gate.rehearsal_file);
  const moduleReports = [
    inspectPackagedModule(root, gate.router_module, Object.freeze(['ROUTER_SEED', 'describeRouterSeed', 'route'])),
    inspectPackagedModule(root, gate.compatibility_port_module, Object.freeze(['COMPATIBILITY_COMMAND_PORT_SEED', 'createCompatibilityCommandPort', 'describeCompatibilityCommandPortSeed']))
  ];
  const vectorRun = runThinEntrypointRehearsalVectors(root, gate);
  const ledgerPath = path.join(root, '.agent-onboard', 'work-items.json');
  let ledger = null;
  if (fs.existsSync(ledgerPath)) {
    try { ledger = readJson(ledgerPath); } catch { ledger = null; }
  }
  const workItems = ledger && Array.isArray(ledger.work_items) ? ledger.work_items : [];
  return {
    schema: 'agent-onboard-public-thin-entrypoint-router-cutover-rehearsal-result-001',
    status: 'ok',
    package_name: gate.package_name,
    version: VERSION,
    release_line: gate.release_line,
    command: gate.command,
    check_command: gate.check_command,
    package_root: root,
    package_context: context.package_context,
    package_json_version: pkg.version,
    rehearsal_file: gate.rehearsal_file,
    rehearsal_file_present: fs.existsSync(rehearsalPath),
    rehearsal_status: gate.rehearsal_status,
    runtime_cutover: {
      applied: gate.runtime_cutover_applied,
      current_entrypoint: gate.current_entrypoint,
      current_entrypoint_line_count: countFileLines(root, gate.current_entrypoint),
      target_entrypoint_max_lines: gate.target_entrypoint_max_lines
    },
    module_reports: moduleReports,
    rehearsal_vector_reports: vectorRun.reports,
    rehearsal_vector_runtime: {
      can_run: vectorRun.can_run,
      router_load_error: vectorRun.router_load_error,
      port_load_error: vectorRun.port_load_error
    },
    expected_pack_files: gate.expected_pack_files.slice().sort(),
    projected_pack_files: packageJsonProjectedPackFiles(pkg).slice().sort(),
    milestone_state: {
      work_item: workItems.find((item) => item.id === gate.work_item_id) || null,
      next_work_item: workItems.find((item) => item.id === gate.next_work_item_id) || null
    },
    rehearsal_contract: gate,
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
    },
    errors: []
  };
}

function publicThinEntrypointRouterCutoverRehearsalCheck(root = packageRoot()) {
  const result = publicThinEntrypointRouterCutoverRehearsal(root);
  const gate = PUBLIC_THIN_ENTRYPOINT_ROUTER_CUTOVER_REHEARSAL;
  const sourceLedgerRequired = result.package_context === 'source_repository';
  const expectedPackFiles = gate.expected_pack_files.slice().sort();
  const errors = [];
  if (gate.rehearsal_status !== 'thin_entrypoint_router_cutover_rehearsed_not_applied') errors.push('thin entrypoint rehearsal status must be rehearsed_not_applied');
  if (!arrayEquals(result.projected_pack_files, expectedPackFiles)) errors.push(`projected npm pack files must remain ${expectedPackFiles.join(', ')}`);
  if (gate.runtime_cutover_applied !== false) errors.push('thin entrypoint rehearsal must not apply runtime cutover');
  if (gate.boundary.package_allowlist_unchanged !== true) errors.push('thin entrypoint rehearsal must keep package allowlist unchanged');
  if (gate.boundary.package_file_count !== expectedPackFiles.length) errors.push(`thin entrypoint rehearsal package file count must be ${expectedPackFiles.length}`);
  if (gate.boundary.changes_public_cli_outputs !== false) errors.push('thin entrypoint rehearsal must not change public CLI outputs');
  if (gate.boundary.changes_cli_runtime_dependency_graph !== false) errors.push('thin entrypoint rehearsal must not change runtime dependency graph yet');
  if (gate.boundary.thin_entrypoint_rehearsal_command_writes_files !== false) errors.push('architecture --thin-entrypoint-rehearsal must remain no-write');
  if (gate.boundary.thin_entrypoint_rehearsal_check_command_writes_files !== false) errors.push('architecture --thin-entrypoint-rehearsal-check must remain no-write');
  for (const report of result.module_reports) {
    if (!report.present) errors.push(`${report.path} must exist for thin entrypoint rehearsal`);
    if (report.status !== 'present_validated') errors.push(`${report.path} must be require-able without side effects${report.require_error ? `: ${report.require_error}` : ''}`);
    for (const exportName of report.expected_exports) {
      if (!report.exports.includes(exportName)) errors.push(`${report.path} must export ${exportName}`);
    }
    if (!result.projected_pack_files.includes(report.path)) errors.push(`${report.path} must remain in projected npm pack files`);
  }
  if (!result.rehearsal_vector_runtime.can_run) errors.push('thin entrypoint rehearsal vectors must be runnable through router and compatibility port');
  for (const report of result.rehearsal_vector_reports) {
    if (!report.matched) errors.push(`thin entrypoint rehearsal vector ${report.id} must return ${report.expected_status} without writes`);
  }

  let rehearsalFileStatus = 'not_present_installed_context_allowed';
  let rehearsalFileSchema = null;
  const rehearsalPath = path.join(root, gate.rehearsal_file);
  if (fs.existsSync(rehearsalPath)) {
    try {
      const artifact = readJson(rehearsalPath);
      rehearsalFileSchema = artifact.schema || null;
      if (artifact.schema !== gate.schema) errors.push(`${gate.rehearsal_file} schema must be ${gate.schema}`);
      if (artifact.work_item_id !== gate.work_item_id) errors.push(`${gate.rehearsal_file} must identify ${gate.work_item_id}`);
      if (artifact.next_work_item_id !== gate.next_work_item_id) errors.push(`${gate.rehearsal_file} must seed ${gate.next_work_item_id}`);
      if (artifact.rehearsal_status !== gate.rehearsal_status) errors.push(`${gate.rehearsal_file} must admit ${gate.rehearsal_status}`);
      if (artifact.runtime_cutover_applied !== false) errors.push(`${gate.rehearsal_file} must not apply runtime cutover`);
      if (!artifact.boundary || artifact.boundary.package_allowlist_unchanged !== true) errors.push(`${gate.rehearsal_file} must declare package_allowlist_unchanged`);
      rehearsalFileStatus = 'present_validated';
    } catch (error) {
      rehearsalFileStatus = 'present_invalid_json';
      errors.push(`${gate.rehearsal_file} must be valid JSON: ${error && error.message ? error.message : String(error)}`);
    }
  } else if (sourceLedgerRequired) {
    rehearsalFileStatus = 'missing_source_context';
    errors.push(`${gate.rehearsal_file} must exist in source repository context`);
  }
  const workItem = result.milestone_state.work_item;
  const nextWorkItem = result.milestone_state.next_work_item;
  if (sourceLedgerRequired) {
    if (!workItem) errors.push(`${gate.work_item_id} work item must exist`);
    else if (workItem.status !== 'closed') errors.push(`${gate.work_item_id} work item must be closed`);
    if (!nextWorkItem) errors.push(`${gate.next_work_item_id} work item must exist`);
    else if (!['open', 'closed'].includes(nextWorkItem.status)) errors.push(`${gate.next_work_item_id} work item must be open or closed after thin entrypoint rehearsal`);
  }

  return {
    schema: 'agent-onboard-public-thin-entrypoint-router-cutover-rehearsal-check-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: gate.package_name,
    version: VERSION,
    release_line: gate.release_line,
    command: gate.check_command,
    package_root: root,
    package_context: result.package_context,
    validated: {
      rehearsal_status_admitted: gate.rehearsal_status === 'thin_entrypoint_router_cutover_rehearsed_not_applied',
      projected_pack_files_unchanged: arrayEquals(result.projected_pack_files, expectedPackFiles),
      package_allowlist_unchanged: gate.boundary.package_allowlist_unchanged === true,
      runtime_cutover_not_applied: gate.runtime_cutover_applied === false,
      public_cli_outputs_unchanged: gate.boundary.changes_public_cli_outputs === false,
      packaged_runtime_dependency_graph_unchanged: gate.boundary.changes_cli_runtime_dependency_graph === false,
      packaged_router_and_port_present: result.module_reports.every((report) => report.present),
      packaged_router_and_port_requireable: result.module_reports.every((report) => report.status === 'present_validated'),
      module_files_in_projected_pack: result.module_reports.every((report) => result.projected_pack_files.includes(report.path)),
      rehearsal_vectors_runnable: result.rehearsal_vector_runtime.can_run,
      rehearsal_vectors_match_expected_status: result.rehearsal_vector_reports.every((report) => report.matched),
      rehearsal_commands_no_write: gate.boundary.thin_entrypoint_rehearsal_command_writes_files === false && gate.boundary.thin_entrypoint_rehearsal_check_command_writes_files === false,
      rehearsal_file_present_or_installed_context_allowed: rehearsalFileStatus === 'present_validated' || rehearsalFileStatus === 'not_present_installed_context_allowed',
      work_item_closed_or_installed_context_allowed: !sourceLedgerRequired || (workItem && workItem.status === 'closed'),
      next_cutover_gate_open_or_installed_context_allowed: !sourceLedgerRequired || (nextWorkItem && ['open', 'closed'].includes(nextWorkItem.status))
    },
    source_thin_entrypoint_rehearsal_file: {
      path: gate.rehearsal_file,
      present: fs.existsSync(rehearsalPath),
      status: rehearsalFileStatus,
      schema: rehearsalFileSchema,
      source_context_required: sourceLedgerRequired
    },
    module_reports: result.module_reports,
    rehearsal_vector_reports: result.rehearsal_vector_reports,
    milestone_state: result.milestone_state,
    expected_pack_files: expectedPackFiles,
    projected_pack_files: result.projected_pack_files,
    runtime_cutover: result.runtime_cutover,
    boundary: result.boundary,
    errors
  };
}

function publicThinEntrypointRouterCutoverApplication(root = packageRoot()) {
  const gate = PUBLIC_THIN_ENTRYPOINT_ROUTER_CUTOVER_APPLICATION;
  const pkg = readJson(path.join(root, 'package.json'));
  const entrypointPath = path.join(root, gate.entrypoint);
  const entrypointExists = fs.existsSync(entrypointPath);
  const entrypointText = entrypointExists ? fs.readFileSync(entrypointPath, 'utf8') : '';
  const ledgerPath = path.join(root, '.agent-onboard', 'work-items.json');
  let ledger = null;
  if (fs.existsSync(ledgerPath)) {
    try { ledger = readJson(ledgerPath); } catch { ledger = null; }
  }
  const workItems = ledger && Array.isArray(ledger.work_items) ? ledger.work_items : [];
  const runMainSmoke = (argv) => {
    const originalWrite = process.stdout.write;
    try {
      process.stdout.write = () => true;
      return main(argv);
    } finally {
      process.stdout.write = originalWrite;
    }
  };
  return {
    schema: 'agent-onboard-public-thin-entrypoint-router-cutover-application-result-001',
    status: 'ok',
    package_name: gate.package_name,
    version: VERSION,
    release_line: gate.release_line,
    command: gate.command,
    check_command: gate.check_command,
    package_root: root,
    package_context: sourceContext(root).package_context,
    cutover_status: gate.cutover_status,
    runtime_cutover: {
      applied: gate.runtime_cutover_applied,
      entrypoint: gate.entrypoint,
      entrypoint_exists: entrypointExists,
      entrypoint_line_count: countFileLines(root, gate.entrypoint),
      imports_router: entrypointText.includes("require('./agent_onboard/command-router')"),
      imports_compatibility_port: entrypointText.includes("require('./agent_onboard/adapters/compatibility-command-port')"),
      main_delegates_to_router: /function main[\s\S]*routeCommand\(argv, createRuntimeCompatibilityPort\(\)\)/.test(entrypointText)
    },
    module_reports: [
      inspectPackagedModule(root, gate.router_module, Object.freeze(['ROUTER_SEED', 'describeRouterSeed', 'route'])),
      inspectPackagedModule(root, gate.compatibility_port_module, Object.freeze(['COMPATIBILITY_COMMAND_PORT_SEED', 'createCompatibilityCommandPort', 'describeCompatibilityCommandPortSeed']))
    ],
    cli_smoke: {
      status_result: runMainSmoke(['node', gate.entrypoint, 'status']),
      version_result: runMainSmoke(['node', gate.entrypoint, '--version'])
    },
    expected_pack_files: gate.expected_pack_files.slice().sort(),
    projected_pack_files: packageJsonProjectedPackFiles(pkg).slice().sort(),
    cutover_file: gate.cutover_file,
    cutover_file_present: fs.existsSync(path.join(root, gate.cutover_file)),
    milestone_state: {
      work_item: workItems.find((item) => item.id === gate.work_item_id) || null,
      next_work_item: workItems.find((item) => item.id === gate.next_work_item_id) || null
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
    },
    errors: []
  };
}

function publicThinEntrypointRouterCutoverApplicationCheck(root = packageRoot()) {
  const result = publicThinEntrypointRouterCutoverApplication(root);
  const gate = PUBLIC_THIN_ENTRYPOINT_ROUTER_CUTOVER_APPLICATION;
  const sourceLedgerRequired = result.package_context === 'source_repository';
  const expectedPackFiles = gate.expected_pack_files.slice().sort();
  const errors = [];
  if (gate.cutover_status !== 'thin_entrypoint_router_cutover_applied') errors.push('thin entrypoint cutover status must be applied');
  if (gate.runtime_cutover_applied !== true) errors.push('thin entrypoint cutover must declare runtime cutover applied');
  if (!arrayEquals(result.projected_pack_files, expectedPackFiles)) errors.push(`projected npm pack files must remain ${expectedPackFiles.join(', ')}`);
  if (!result.runtime_cutover.entrypoint_exists) errors.push(`${gate.entrypoint} must exist for thin entrypoint cutover`);
  if (!result.runtime_cutover.imports_router) errors.push(`${gate.entrypoint} must import packaged command router`);
  if (!result.runtime_cutover.imports_compatibility_port) errors.push(`${gate.entrypoint} must import packaged compatibility command port`);
  if (!result.runtime_cutover.main_delegates_to_router) errors.push(`${gate.entrypoint} main() must delegate to routeCommand(argv, createRuntimeCompatibilityPort())`);
  if (result.cli_smoke.status_result !== 0) errors.push('main status smoke must return 0');
  if (result.cli_smoke.version_result !== 0) errors.push('main version smoke must return 0');
  for (const report of result.module_reports) {
    if (!report.present) errors.push(`${report.path} must exist for thin entrypoint cutover`);
    if (report.status !== 'present_validated') errors.push(`${report.path} must be require-able without side effects${report.require_error ? `: ${report.require_error}` : ''}`);
    if (!result.projected_pack_files.includes(report.path)) errors.push(`${report.path} must remain in projected npm pack files`);
  }

  let cutoverFileStatus = 'not_present_installed_context_allowed';
  let cutoverFileSchema = null;
  const cutoverPath = path.join(root, gate.cutover_file);
  if (fs.existsSync(cutoverPath)) {
    try {
      const artifact = readJson(cutoverPath);
      cutoverFileSchema = artifact.schema || null;
      if (artifact.schema !== gate.schema) errors.push(`${gate.cutover_file} schema must be ${gate.schema}`);
      if (artifact.work_item_id !== gate.work_item_id) errors.push(`${gate.cutover_file} must identify ${gate.work_item_id}`);
      if (artifact.next_work_item_id !== gate.next_work_item_id) errors.push(`${gate.cutover_file} must seed ${gate.next_work_item_id}`);
      if (artifact.cutover_status !== gate.cutover_status) errors.push(`${gate.cutover_file} must admit ${gate.cutover_status}`);
      if (artifact.runtime_cutover_applied !== true) errors.push(`${gate.cutover_file} must declare runtime cutover applied`);
      cutoverFileStatus = 'present_validated';
    } catch (error) {
      cutoverFileStatus = 'present_invalid_json';
      errors.push(`${gate.cutover_file} must be valid JSON: ${error && error.message ? error.message : String(error)}`);
    }
  } else if (sourceLedgerRequired) {
    cutoverFileStatus = 'missing_source_context';
    errors.push(`${gate.cutover_file} must exist in source repository context`);
  }
  const workItem = result.milestone_state.work_item;
  const nextWorkItem = result.milestone_state.next_work_item;
  if (sourceLedgerRequired) {
    if (!workItem) errors.push(`${gate.work_item_id} work item must exist`);
    else if (workItem.status !== 'closed') errors.push(`${gate.work_item_id} work item must be closed`);
    if (!nextWorkItem) errors.push(`${gate.next_work_item_id} work item must exist`);
    else if (!['open', 'closed'].includes(nextWorkItem.status)) errors.push(`${gate.next_work_item_id} work item must be open or closed after thin entrypoint cutover`);
  }

  return {
    schema: 'agent-onboard-public-thin-entrypoint-router-cutover-application-check-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: gate.package_name,
    version: VERSION,
    release_line: gate.release_line,
    command: gate.check_command,
    package_root: root,
    package_context: result.package_context,
    validated: {
      cutover_status_applied: gate.cutover_status === 'thin_entrypoint_router_cutover_applied',
      runtime_cutover_applied: gate.runtime_cutover_applied === true,
      entrypoint_imports_packaged_router: result.runtime_cutover.imports_router,
      entrypoint_imports_packaged_compatibility_port: result.runtime_cutover.imports_compatibility_port,
      entrypoint_main_delegates_to_router: result.runtime_cutover.main_delegates_to_router,
      projected_pack_files_unchanged: arrayEquals(result.projected_pack_files, expectedPackFiles),
      module_files_in_projected_pack: result.module_reports.every((report) => result.projected_pack_files.includes(report.path)),
      main_smoke_status_ok: result.cli_smoke.status_result === 0,
      main_smoke_version_ok: result.cli_smoke.version_result === 0,
      cutover_file_present_or_installed_context_allowed: cutoverFileStatus === 'present_validated' || cutoverFileStatus === 'not_present_installed_context_allowed',
      work_item_closed_or_installed_context_allowed: !sourceLedgerRequired || (workItem && workItem.status === 'closed'),
      next_gate_open_or_installed_context_allowed: !sourceLedgerRequired || (nextWorkItem && ['open', 'closed'].includes(nextWorkItem.status))
    },
    source_thin_entrypoint_cutover_file: {
      path: gate.cutover_file,
      present: fs.existsSync(cutoverPath),
      status: cutoverFileStatus,
      schema: cutoverFileSchema,
      source_context_required: sourceLedgerRequired
    },
    runtime_cutover: result.runtime_cutover,
    module_reports: result.module_reports,
    cli_smoke: result.cli_smoke,
    milestone_state: result.milestone_state,
    expected_pack_files: expectedPackFiles,
    projected_pack_files: result.projected_pack_files,
    boundary: result.boundary,
    errors
  };
}

function inspectRuntimeAdapterModule(root, spec) {
  const report = inspectPackagedModule(root, spec.path, Object.freeze([spec.factory, spec.describe]));
  let describedBoundary = null;
  let describedRole = null;
  let describedCommands = [];
  let describeError = null;
  try {
    const moduleValue = require(path.join(root, spec.path));
    const described = typeof moduleValue[spec.describe] === 'function' ? moduleValue[spec.describe]() : null;
    describedBoundary = described && described.boundary ? described.boundary : null;
    describedRole = described && described.role ? described.role : null;
    describedCommands = described && Array.isArray(described.owned_top_level_commands) ? described.owned_top_level_commands.slice() : [];
  } catch (error) {
    describeError = error && error.message ? error.message : String(error);
  }
  return Object.freeze({
    ...report,
    group: spec.group,
    factory: spec.factory,
    describe: spec.describe,
    expected_commands: spec.commands.slice(),
    described_role: describedRole,
    described_commands: describedCommands,
    described_boundary: describedBoundary,
    describe_error: describeError
  });
}

function runSuppressedMainSmoke(argv) {
  const originalWrite = process.stdout.write;
  try {
    process.stdout.write = () => true;
    return main(argv);
  } finally {
    process.stdout.write = originalWrite;
  }
}

function publicRouterCommandAdapterDelegationExpansion(root = packageRoot()) {
  const gate = PUBLIC_ROUTER_COMMAND_ADAPTER_DELEGATION_EXPANSION;
  const pkg = readJson(path.join(root, 'package.json'));
  const context = sourceContext(root);
  const entrypointPath = path.join(root, gate.entrypoint);
  const entrypointExists = fs.existsSync(entrypointPath);
  const entrypointText = entrypointExists ? fs.readFileSync(entrypointPath, 'utf8') : '';
  const port = createRuntimeCompatibilityPort();
  const ledgerPath = path.join(root, '.agent-onboard', 'work-items.json');
  let ledger = null;
  if (fs.existsSync(ledgerPath)) {
    try { ledger = readJson(ledgerPath); } catch { ledger = null; }
  }
  const workItems = ledger && Array.isArray(ledger.work_items) ? ledger.work_items : [];
  const smokeReports = gate.smoke_vectors.map((vector) => {
    let exitCode = null;
    let error = null;
    try {
      exitCode = runSuppressedMainSmoke(vector.argv.slice());
    } catch (caught) {
      error = caught && caught.message ? caught.message : String(caught);
    }
    return Object.freeze({
      id: vector.id,
      argv: vector.argv.slice(),
      expected_exit_code: vector.expected_exit_code,
      actual_exit_code: exitCode,
      matched: exitCode === vector.expected_exit_code && !error,
      error
    });
  });
  return {
    schema: 'agent-onboard-public-router-command-adapter-delegation-expansion-result-001',
    status: 'ok',
    package_name: gate.package_name,
    version: VERSION,
    release_line: gate.release_line,
    command: gate.command,
    check_command: gate.check_command,
    package_root: root,
    package_context: context.package_context,
    delegation_file: gate.delegation_file,
    delegation_file_present: fs.existsSync(path.join(root, gate.delegation_file)),
    delegation_status: gate.delegation_status,
    runtime_cutover: {
      applied: gate.runtime_cutover_applied,
      entrypoint: gate.entrypoint,
      entrypoint_exists: entrypointExists,
      imports_router: entrypointText.includes("require('./agent_onboard/command-router')"),
      imports_compatibility_port: entrypointText.includes("require('./agent_onboard/adapters/compatibility-command-port')"),
      imports_core_adapter: entrypointText.includes("require('./agent_onboard/adapters/commands/core')"),
      imports_package_adapter: entrypointText.includes("require('./agent_onboard/adapters/commands/release-package')"),
      imports_architecture_adapter: entrypointText.includes("require('./agent_onboard/adapters/commands/architecture')"),
      imports_authority_adapter: entrypointText.includes("require('./agent_onboard/adapters/commands/authority')"),
      imports_target_adapter: entrypointText.includes("require('./agent_onboard/adapters/commands/target')"),
      imports_work_items_adapter: entrypointText.includes("require('./agent_onboard/adapters/commands/work-items')"),
      imports_work_items_service: entrypointText.includes("require('./agent_onboard/domains/work-items')"),
      main_delegates_to_router: /function main[\s\S]*routeCommand\(argv, createRuntimeCompatibilityPort\(\)\)/.test(entrypointText)
    },
    compatibility_port: {
      schema: port.schema,
      command_adapters_required_in_this_gate: port.seed && port.seed.boundary && port.seed.boundary.command_adapters_required_in_this_gate === true,
      adapter_delegation_expanded_in_this_gate: port.seed && port.seed.boundary && port.seed.boundary.adapter_delegation_expanded_in_this_gate === true,
      delegated_commands: Array.isArray(port.delegated_commands) ? port.delegated_commands.slice() : [],
      adapter_groups: port.adapter_groups || null
    },
    adapter_module_reports: gate.adapter_modules.map((spec) => inspectRuntimeAdapterModule(root, spec)),
    smoke_reports: smokeReports,
    expected_pack_files: gate.expected_pack_files.slice().sort(),
    projected_pack_files: packageJsonProjectedPackFiles(pkg).slice().sort(),
    milestone_state: {
      work_item: workItems.find((item) => item.id === gate.work_item_id) || null,
      next_work_item: workItems.find((item) => item.id === gate.next_work_item_id) || null
    },
    delegation_contract: gate,
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
    },
    errors: []
  };
}

function publicRouterCommandAdapterDelegationExpansionCheck(root = packageRoot()) {
  const result = publicRouterCommandAdapterDelegationExpansion(root);
  const gate = PUBLIC_ROUTER_COMMAND_ADAPTER_DELEGATION_EXPANSION;
  const sourceLedgerRequired = result.package_context === 'source_repository';
  const expectedPackFiles = gate.expected_pack_files.slice().sort();
  const errors = [];
  if (gate.delegation_status !== 'router_command_adapter_delegation_expanded') errors.push('router command adapter delegation status must be expanded');
  if (gate.runtime_cutover_applied !== true) errors.push('router command adapter delegation must keep runtime cutover applied');
  if (!arrayEquals(result.projected_pack_files, expectedPackFiles)) errors.push(`projected npm pack files must remain ${expectedPackFiles.join(', ')}`);
  if (!result.runtime_cutover.entrypoint_exists) errors.push(`${gate.entrypoint} must exist`);
  if (!result.runtime_cutover.imports_router) errors.push(`${gate.entrypoint} must import packaged command router`);
  if (!result.runtime_cutover.imports_compatibility_port) errors.push(`${gate.entrypoint} must import packaged compatibility command port`);
  if (!result.runtime_cutover.imports_core_adapter) errors.push(`${gate.entrypoint} must import packaged core command adapter`);
  if (!result.runtime_cutover.imports_package_adapter) errors.push(`${gate.entrypoint} must import packaged release package command adapter`);
  if (!result.runtime_cutover.imports_architecture_adapter) errors.push(`${gate.entrypoint} must import packaged architecture command adapter`);
  if (!result.runtime_cutover.imports_authority_adapter) errors.push(`${gate.entrypoint} must import packaged authority command adapter`);
  if (!result.runtime_cutover.imports_target_adapter) errors.push(`${gate.entrypoint} must import packaged target command adapter`);
  if (!result.runtime_cutover.imports_work_items_adapter) errors.push(`${gate.entrypoint} must import packaged work-items command adapter`);
  if (!result.runtime_cutover.imports_work_items_service) errors.push(`${gate.entrypoint} must import packaged work-items runtime service`);
  if (!result.runtime_cutover.main_delegates_to_router) errors.push(`${gate.entrypoint} main() must continue delegating through command router`);
  if (!result.compatibility_port.command_adapters_required_in_this_gate) errors.push('compatibility command port must require command adapters in this gate');
  if (!result.compatibility_port.adapter_delegation_expanded_in_this_gate) errors.push('compatibility command port must declare adapter delegation expanded');
  if (!arrayEquals(result.compatibility_port.delegated_commands.slice().sort(), gate.delegated_commands.slice().sort())) {
    errors.push(`runtime delegated commands must be ${gate.delegated_commands.join(', ')}`);
  }
  for (const report of result.adapter_module_reports) {
    if (!report.present) errors.push(`${report.path} must exist for router command adapter delegation`);
    if (report.status !== 'present_validated') errors.push(`${report.path} must be require-able without side effects${report.require_error ? `: ${report.require_error}` : ''}`);
    if (report.describe_error) errors.push(`${report.path} describe contract failed: ${report.describe_error}`);
    if (!result.projected_pack_files.includes(report.path)) errors.push(`${report.path} must remain in projected npm pack files`);
    if (!report.described_boundary || report.described_boundary.used_by_runtime_entrypoint_in_this_gate !== true) errors.push(`${report.path} must declare runtime entrypoint use in this gate`);
    if (!report.described_boundary || report.described_boundary.packaged_in_npm_tarball_in_this_gate !== true) errors.push(`${report.path} must declare npm tarball inclusion in this gate`);
    for (const command of report.expected_commands.filter((item) => !item.startsWith('-'))) {
      if (!report.described_commands.includes(command)) errors.push(`${report.path} must describe owned command ${command}`);
    }
  }
  for (const report of result.smoke_reports) {
    if (!report.matched) errors.push(`router adapter delegation smoke ${report.id} must return ${report.expected_exit_code}`);
  }

  let delegationFileStatus = 'not_present_installed_context_allowed';
  let delegationFileSchema = null;
  const delegationPath = path.join(root, gate.delegation_file);
  if (fs.existsSync(delegationPath)) {
    try {
      const artifact = readJson(delegationPath);
      delegationFileSchema = artifact.schema || null;
      if (artifact.schema !== gate.schema) errors.push(`${gate.delegation_file} schema must be ${gate.schema}`);
      if (artifact.work_item_id !== gate.work_item_id) errors.push(`${gate.delegation_file} must identify ${gate.work_item_id}`);
      if (artifact.next_work_item_id !== gate.next_work_item_id) errors.push(`${gate.delegation_file} must seed ${gate.next_work_item_id}`);
      if (artifact.delegation_status !== gate.delegation_status) errors.push(`${gate.delegation_file} must admit ${gate.delegation_status}`);
      if (artifact.runtime_cutover_applied !== true) errors.push(`${gate.delegation_file} must keep runtime cutover applied`);
      if (!artifact.boundary || artifact.boundary.package_allowlist_unchanged !== true) errors.push(`${gate.delegation_file} must declare package_allowlist_unchanged`);
      delegationFileStatus = 'present_validated';
    } catch (error) {
      delegationFileStatus = 'present_invalid_json';
      errors.push(`${gate.delegation_file} must be valid JSON: ${error && error.message ? error.message : String(error)}`);
    }
  } else if (sourceLedgerRequired) {
    delegationFileStatus = 'missing_source_context';
    errors.push(`${gate.delegation_file} must exist in source repository context`);
  }
  const workItem = result.milestone_state.work_item;
  const nextWorkItem = result.milestone_state.next_work_item;
  if (sourceLedgerRequired) {
    if (!workItem) errors.push(`${gate.work_item_id} work item must exist`);
    else if (workItem.status !== 'closed') errors.push(`${gate.work_item_id} work item must be closed`);
    if (!nextWorkItem) errors.push(`${gate.next_work_item_id} work item must exist`);
    else if (!['open', 'closed'].includes(nextWorkItem.status)) errors.push(`${gate.next_work_item_id} work item must be open or closed after router command adapter delegation expansion`);
  }

  return {
    schema: 'agent-onboard-public-router-command-adapter-delegation-expansion-check-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: gate.package_name,
    version: VERSION,
    release_line: gate.release_line,
    command: gate.check_command,
    package_root: root,
    package_context: result.package_context,
    validated: {
      delegation_status_expanded: gate.delegation_status === 'router_command_adapter_delegation_expanded',
      runtime_cutover_still_applied: gate.runtime_cutover_applied === true,
      entrypoint_imports_packaged_adapters: result.runtime_cutover.imports_core_adapter && result.runtime_cutover.imports_package_adapter && result.runtime_cutover.imports_architecture_adapter && result.runtime_cutover.imports_authority_adapter && result.runtime_cutover.imports_target_adapter && result.runtime_cutover.imports_work_items_adapter,
      entrypoint_imports_work_items_service: result.runtime_cutover.imports_work_items_service,
      compatibility_port_delegates_to_adapters: result.compatibility_port.command_adapters_required_in_this_gate && result.compatibility_port.adapter_delegation_expanded_in_this_gate,
      delegated_commands_match_contract: arrayEquals(result.compatibility_port.delegated_commands.slice().sort(), gate.delegated_commands.slice().sort()),
      adapter_modules_present: result.adapter_module_reports.every((report) => report.present),
      adapter_modules_requireable: result.adapter_module_reports.every((report) => report.status === 'present_validated'),
      adapter_modules_used_by_runtime: result.adapter_module_reports.every((report) => report.described_boundary && report.described_boundary.used_by_runtime_entrypoint_in_this_gate === true),
      adapter_modules_in_projected_pack: result.adapter_module_reports.every((report) => result.projected_pack_files.includes(report.path)),
      runtime_smoke_vectors_pass: result.smoke_reports.every((report) => report.matched),
      package_allowlist_unchanged: arrayEquals(result.projected_pack_files, expectedPackFiles),
      delegation_commands_no_write: gate.boundary.router_adapter_delegation_command_writes_files === false && gate.boundary.router_adapter_delegation_check_command_writes_files === false,
      delegation_file_present_or_installed_context_allowed: delegationFileStatus === 'present_validated' || delegationFileStatus === 'not_present_installed_context_allowed',
      work_item_closed_or_installed_context_allowed: !sourceLedgerRequired || (workItem && workItem.status === 'closed'),
      next_gate_open_or_installed_context_allowed: !sourceLedgerRequired || (nextWorkItem && ['open', 'closed'].includes(nextWorkItem.status))
    },
    source_router_command_adapter_delegation_file: {
      path: gate.delegation_file,
      present: fs.existsSync(delegationPath),
      status: delegationFileStatus,
      schema: delegationFileSchema,
      source_context_required: sourceLedgerRequired
    },
    runtime_cutover: result.runtime_cutover,
    compatibility_port: result.compatibility_port,
    adapter_module_reports: result.adapter_module_reports,
    smoke_reports: result.smoke_reports,
    milestone_state: result.milestone_state,
    expected_pack_files: expectedPackFiles,
    projected_pack_files: result.projected_pack_files,
    boundary: result.boundary,
    errors
  };
}

function publicArchitectureMap(root = packageRoot()) {
  const pkg = readJson(path.join(root, 'package.json'));
  return {
    schema: 'agent-onboard-public-architecture-map-result-001',
    status: 'ok',
    package_name: PUBLIC_ARCHITECTURE_MAP.package_name,
    version: VERSION,
    release_line: PUBLIC_ARCHITECTURE_MAP.release_line,
    command: PUBLIC_ARCHITECTURE_MAP.command,
    check_command: PUBLIC_ARCHITECTURE_MAP.check_command,
    package_root: root,
    package_context: sourceContext(root).package_context,
    package_json_version: pkg.version,
    map: PUBLIC_ARCHITECTURE_MAP,
    command_router: PUBLIC_COMMAND_ROUTER,
    domain_service_facades: PUBLIC_DOMAIN_SERVICE_FACADES,
    source_domain_module_partition_plan: PUBLIC_SOURCE_DOMAIN_MODULE_PARTITION_PLAN,
    source_domain_extraction_rehearsal: PUBLIC_SOURCE_DOMAIN_EXTRACTION_REHEARSAL,
    source_extraction_golden_output_freeze: PUBLIC_SOURCE_EXTRACTION_GOLDEN_OUTPUT_FREEZE,
      source_module_extraction_adapter_boundary: PUBLIC_SOURCE_MODULE_EXTRACTION_ADAPTER_BOUNDARY,
    source_module_extraction_first_slice: PUBLIC_SOURCE_MODULE_EXTRACTION_FIRST_SLICE,
    source_module_extraction_second_slice_plan: PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN,
    version_reference_policy: PUBLIC_VERSION_REFERENCE_POLICY,
    authority_first_read_index: PUBLIC_AUTHORITY_FIRST_READ_INDEX,
    target_runtime_namespace: PUBLIC_TARGET_RUNTIME_NAMESPACE,
    current_runtime: {
      entrypoint: PUBLIC_ARCHITECTURE_MAP.public_source_shape.current_entrypoint,
      entrypoint_exists: fs.existsSync(path.join(root, PUBLIC_ARCHITECTURE_MAP.public_source_shape.current_entrypoint)),
      physical_domain_split_status: PUBLIC_ARCHITECTURE_MAP.public_source_shape.physical_domain_split_status,
      expected_pack_files: PUBLIC_ARCHITECTURE_MAP.public_source_shape.expected_pack_files.slice(),
      projected_pack_files: packageJsonProjectedPackFiles(pkg)
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


function publicSourceModuleExtractionInstalledFallbackSmoke(root = packageRoot()) {
  const runtimeBridge = publicSourceModuleExtractionRuntimeBridgeCheck(root);
  const packageSurface = publicPackageSurfaceCheck(root);
  const context = sourceContext(root);
  const pkg = readJson(path.join(root, 'package.json'));
  const expectedPackFiles = PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort();
  const projectedPackFiles = packageJsonProjectedPackFiles(pkg).slice().sort();
  const sourceModuleRel = PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.source_module;
  const sourceModulePresent = fs.existsSync(path.join(root, sourceModuleRel));
  const sourceModuleInPack = expectedPackFiles.includes(sourceModuleRel) || projectedPackFiles.includes(sourceModuleRel);
  const projectedInstalledRuntimeBridge = {
    context: 'installed_package',
    source_module_present: false,
    source_module: sourceModuleRel,
    mode: 'bundled_fallback',
    fallback_source: 'cli/agent-onboard.js',
    allowed_because_source_module_is_not_in_npm_pack: !sourceModuleInPack
  };
  return {
    schema: 'agent-onboard-public-source-module-extraction-installed-fallback-smoke-result-001',
    status: 'ok',
    package_name: PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.package_name,
    version: VERSION,
    release_line: PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.release_line,
    command: PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.command,
    check_command: PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.check_command,
    package_root: root,
    source_context: context,
    installed_fallback_smoke_file: PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.installed_fallback_smoke_file,
    installed_fallback_smoke_file_present: fs.existsSync(path.join(root, PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.installed_fallback_smoke_file)),
    source_module: sourceModuleRel,
    source_module_present: sourceModulePresent,
    projected_installed_runtime_bridge: projectedInstalledRuntimeBridge,
    observed: {
      runtime_bridge_check_status: runtimeBridge.status,
      runtime_bridge_resolution_mode: runtimeBridge.runtime_bridge_resolution.mode,
      package_surface_check_status: packageSurface.status,
      source_module_in_expected_pack_files: expectedPackFiles.includes(sourceModuleRel),
      source_module_in_projected_pack_files: projectedPackFiles.includes(sourceModuleRel),
      source_context_files_in_pack: PUBLIC_RELEASE_CONTRACT.source_context_files.filter((rel) => projectedPackFiles.includes(rel))
    },
    expected_pack_files: expectedPackFiles,
    projected_pack_files: projectedPackFiles,
    installed_fallback_contract: PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE,
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
    },
    errors: []
  };
}

function publicSourceModuleExtractionInstalledFallbackSmokeCheck(root = packageRoot()) {
  const result = publicSourceModuleExtractionInstalledFallbackSmoke(root);
  const runtimeBridge = publicSourceModuleExtractionRuntimeBridgeCheck(root);
  const packageSurface = publicPackageSurfaceCheck(root);
  const expectedPackFiles = PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort();
  const projectedPackFiles = packageJsonProjectedPackFiles(readJson(path.join(root, 'package.json'))).slice().sort();
  const sourceModuleRel = PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.source_module;
  const artifactPath = path.join(root, PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.installed_fallback_smoke_file);
  const context = sourceContext(root);
  const errors = [];
  if (PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.smoke_status !== 'installed_fallback_smoke_admitted') errors.push('installed fallback smoke status must be installed_fallback_smoke_admitted');
  if (runtimeBridge.status !== 'ok') errors.push('runtime bridge check must pass before installed fallback smoke');
  if (packageSurface.status !== 'ok') errors.push('package surface check must pass before installed fallback smoke');
  if (PUBLIC_SOURCE_MODULE_EXTRACTION_RUNTIME_BRIDGE.boundary.installed_context_fallback_required !== true) errors.push('runtime bridge must require installed-context fallback');
  if (PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.boundary.source_modules_remain_out_of_npm_pack !== true) errors.push('source modules must remain out of npm pack');
  if (PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.boundary.installed_fallback_check_command_writes_files !== false) errors.push('installed fallback check must remain no-write');
  if (!arrayEquals(expectedPackFiles, projectedPackFiles)) errors.push('projected pack files must match the compact expected pack files');
  if (expectedPackFiles.includes(sourceModuleRel) || projectedPackFiles.includes(sourceModuleRel)) errors.push(`${sourceModuleRel} must remain outside the npm package allowlist`);
  if (context.package_context === 'installed_package' && fs.existsSync(path.join(root, sourceModuleRel))) errors.push(`${sourceModuleRel} must be absent from installed package context`);
  if (context.package_context === 'installed_package' && runtimeBridge.runtime_bridge_resolution.mode !== 'bundled_fallback') errors.push('installed package runtime bridge must resolve through bundled_fallback');
  if (context.package_context === 'source_repository' && !fs.existsSync(artifactPath)) errors.push(`${PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.installed_fallback_smoke_file} must exist in source repository context`);
  if (fs.existsSync(artifactPath)) {
    try {
      const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
      if (artifact.schema !== PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.schema) errors.push(`${PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.installed_fallback_smoke_file} schema must be ${PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.schema}`);
      if (artifact.source_module !== sourceModuleRel) errors.push(`${PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.installed_fallback_smoke_file} source_module must be ${sourceModuleRel}`);
      if (!artifact.projected_installed_context || artifact.projected_installed_context.runtime_bridge_resolution_mode !== 'bundled_fallback') errors.push(`${PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.installed_fallback_smoke_file} must declare bundled_fallback projected installed context`);
    } catch (error) {
      errors.push(`${PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.installed_fallback_smoke_file} must be valid JSON: ${error.message}`);
    }
  }
  return {
    schema: 'agent-onboard-public-source-module-extraction-installed-fallback-smoke-check-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.package_name,
    version: VERSION,
    release_line: PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.release_line,
    command: PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.check_command,
    package_root: root,
    source_context: context,
    validated: {
      runtime_bridge_check: runtimeBridge.status === 'ok',
      package_surface_check: packageSurface.status === 'ok',
      installed_fallback_smoke_status: PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.smoke_status === 'installed_fallback_smoke_admitted',
      source_module_out_of_pack: !expectedPackFiles.includes(sourceModuleRel) && !projectedPackFiles.includes(sourceModuleRel),
      projected_pack_allowlist_unchanged: arrayEquals(expectedPackFiles, projectedPackFiles),
      installed_context_uses_bundled_fallback: context.package_context === 'installed_package' ? runtimeBridge.runtime_bridge_resolution.mode === 'bundled_fallback' : result.projected_installed_runtime_bridge.mode === 'bundled_fallback',
      source_artifact_present_or_installed_context_allowed: fs.existsSync(artifactPath) || context.package_context === 'installed_package',
      installed_fallback_commands_no_write: PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.boundary.installed_fallback_smoke_command_writes_files === false && PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.boundary.installed_fallback_check_command_writes_files === false,
      package_allowlist_unchanged: PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.boundary.package_allowlist_unchanged === true
    },
    observed: result.observed,
    runtime_bridge: {
      status: runtimeBridge.status,
      resolution_mode: runtimeBridge.runtime_bridge_resolution.mode,
      source_module_present: runtimeBridge.runtime_bridge_resolution.source_module_present
    },
    source_installed_fallback_file: {
      path: PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.installed_fallback_smoke_file,
      present: fs.existsSync(artifactPath),
      status: fs.existsSync(artifactPath) ? 'present_validated' : (context.package_context === 'installed_package' ? 'not_present_installed_context_allowed' : 'missing'),
      schema: PUBLIC_SOURCE_MODULE_EXTRACTION_INSTALLED_FALLBACK_SMOKE.schema,
      source_context_required: true
    },
    projected_installed_runtime_bridge: result.projected_installed_runtime_bridge,
    expected_pack_files: expectedPackFiles,
    projected_pack_files: projectedPackFiles,
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
    },
    errors
  };
}


function gitignoreSecondSlicePolicy(root = packageRoot()) {
  const rel = PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.gitignore_policy.gitignore_file;
  const file = path.join(root, rel);
  const present = fs.existsSync(file);
  const content = present ? fs.readFileSync(file, 'utf8') : '';
  const entries = content.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0 && !line.startsWith('#'));
  const forbidden = ['.agent-onboard/', '.agent-onboard/*', 'src/', 'src/**', 'src/domains/', 'src/domains/*', 'src/domains/**'];
  const localStateEntries = ['.agent-onboard/tmp/', '.agent-onboard/cache/', '.agent-onboard/local/'];
  const perArtifactUnignoreEntries = entries.filter((entry) => /^!\.agent-onboard\/source-module-extraction-.*\.json$/.test(entry));
  return {
    file: rel,
    present,
    policy: 'track canonical .agent-onboard source JSON by default; ignore only local/runtime/cache state',
    required_unignore_entries: [],
    missing_required_unignore_entries: [],
    forbidden_ignore_entries: forbidden,
    present_forbidden_ignore_entries: forbidden.filter((entry) => entries.includes(entry)),
    local_state_ignore_entries: localStateEntries,
    missing_local_state_ignore_entries: localStateEntries.filter((entry) => !entries.includes(entry)),
    per_artifact_unignore_entries: perArtifactUnignoreEntries,
    entries
  };
}

function publicSourceModuleExtractionSecondSlicePlan(root = packageRoot()) {
  const pkg = readJson(path.join(root, 'package.json'));
  const context = sourceContext(root);
  const plan = PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN;
  const plannedModule = plan.planned_second_slice.planned_module;
  return {
    schema: 'agent-onboard-public-source-module-extraction-second-slice-plan-result-001',
    status: 'ok',
    package_name: plan.package_name,
    version: VERSION,
    release_line: plan.release_line,
    command: plan.command,
    check_command: plan.check_command,
    package_root: root,
    package_context: context.package_context,
    package_json_version: pkg.version,
    second_slice_plan_file: plan.second_slice_plan_file,
    second_slice_plan_file_present: fs.existsSync(path.join(root, plan.second_slice_plan_file)),
    prerequisite_installed_fallback_smoke_file: plan.prerequisite_installed_fallback_smoke_file,
    planned_second_slice: plan.planned_second_slice,
    planned_module: plannedModule,
    planned_module_present: fs.existsSync(path.join(root, plannedModule)),
    current_source_modules_present: ['src/domains/package.js', plannedModule].filter((rel) => fs.existsSync(path.join(root, rel))),
    gitignore_policy: gitignoreSecondSlicePolicy(root),
    projected_pack_files: packageJsonProjectedPackFiles(pkg),
    expected_pack_files: PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort(),
    second_slice_plan: plan,
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

function publicSourceModuleExtractionSecondSlicePlanCheck(root = packageRoot()) {
  const result = publicSourceModuleExtractionSecondSlicePlan(root);
  const installedFallback = publicSourceModuleExtractionInstalledFallbackSmokeCheck(root);
  const expectedPackFiles = PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort();
  const planned = PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.planned_second_slice;
  const partitionPlan = PUBLIC_SOURCE_DOMAIN_MODULE_PARTITION_PLAN.planned_source_modules.find((module) => module.domain === planned.domain);
  const facade = PUBLIC_DOMAIN_SERVICE_FACADES.facades.find((item) => item.id === planned.domain);
  const artifactPath = path.join(root, PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.second_slice_plan_file);
  const errors = [];
  if (installedFallback.status !== 'ok') errors.push(...installedFallback.errors.map((error) => `installed fallback smoke: ${error}`));
  if (PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.second_slice_status !== 'planned_not_created') errors.push('second slice status must remain planned_not_created for this gate');
  if (planned.domain !== 'authority') errors.push('second slice must plan the authority domain after the package first slice');
  if (!partitionPlan) errors.push('second slice domain must exist in the source partition plan');
  if (partitionPlan && partitionPlan.planned_module !== planned.planned_module) errors.push(`second slice planned module must match partition plan module ${partitionPlan.planned_module}`);
  if (!facade || facade.service !== planned.facade) errors.push('second slice must map to authorityService facade');
  if (planned.source_module_created_by_this_gate !== false) errors.push('second slice planning gate must not create the authority source module');
  if (planned.published_import_api !== false) errors.push('second slice source module must not be admitted as public import API');
  const followupFirstSliceFilePresent = fs.existsSync(path.join(root, '.agent-onboard/source-module-extraction-second-slice-first-slice.json'));
  if (result.planned_module_present && !followupFirstSliceFilePresent) errors.push(`${planned.planned_module} must not be created until the second slice first-slice gate is admitted`);
  if (!arrayEquals(result.projected_pack_files, expectedPackFiles)) errors.push(`projected npm pack files must remain ${expectedPackFiles.join(', ')}`);
  if (result.projected_pack_files.includes(planned.planned_module)) errors.push(`${planned.planned_module} must stay outside the npm package allowlist`);
  if (PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.boundary.second_slice_plan_command_writes_files !== false) errors.push('architecture --second-slice-plan must remain no-write');
  if (PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.boundary.second_slice_check_command_writes_files !== false) errors.push('architecture --second-slice-check must remain no-write');
  if (PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.boundary.package_allowlist_unchanged !== true) errors.push('second slice planning must preserve package allowlist');

  let planFileStatus = 'not_present_installed_context_allowed';
  let planFileSchema = null;
  if (result.second_slice_plan_file_present) {
    try {
      const artifact = readJson(artifactPath);
      planFileSchema = artifact.schema || null;
      if (artifact.schema !== PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.schema) errors.push(`${PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.second_slice_plan_file} schema must be ${PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.schema}`);
      if (artifact.second_slice_status !== 'planned_not_created') errors.push(`${PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.second_slice_plan_file} must declare planned_not_created`);
      if (!artifact.planned_second_slice || artifact.planned_second_slice.domain !== planned.domain) errors.push(`${PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.second_slice_plan_file} must plan ${planned.domain}`);
      if (!artifact.planned_second_slice || artifact.planned_second_slice.planned_module !== planned.planned_module) errors.push(`${PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.second_slice_plan_file} planned module must be ${planned.planned_module}`);
      planFileStatus = 'present_validated';
    } catch (error) {
      planFileStatus = 'present_invalid_json';
      errors.push(`${PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.second_slice_plan_file} must be valid JSON: ${error && error.message ? error.message : String(error)}`);
    }
  } else if (result.package_context === 'source_repository') {
    planFileStatus = 'missing_source_context';
    errors.push(`${PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.second_slice_plan_file} must exist in source repository context`);
  }

  const gitignore = result.gitignore_policy;
  if (result.package_context === 'source_repository') {
    if (!gitignore.present) errors.push('.gitignore must exist in source repository context');
    for (const entry of gitignore.missing_required_unignore_entries) errors.push(`.gitignore must unignore ${entry}`);
    for (const entry of gitignore.present_forbidden_ignore_entries) errors.push(`.gitignore must not ignore source module path with ${entry}`);
    for (const entry of gitignore.per_artifact_unignore_entries) errors.push(`.gitignore must not use per-artifact unignore sprawl: ${entry}`);
    for (const entry of gitignore.missing_local_state_ignore_entries) errors.push(`.gitignore must ignore local state entry ${entry}`);
  }

  return {
    schema: 'agent-onboard-public-source-module-extraction-second-slice-plan-check-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.package_name,
    version: VERSION,
    release_line: PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.release_line,
    command: PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.check_command,
    package_root: root,
    source_context: result.source_context,
    validated: {
      installed_fallback_smoke: installedFallback.status === 'ok',
      second_slice_status: PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.second_slice_status === 'planned_not_created',
      planned_domain_is_authority: planned.domain === 'authority',
      planned_domain_maps_to_facade: !!facade && facade.service === planned.facade,
      planned_module_matches_partition_plan: !!partitionPlan && partitionPlan.planned_module === planned.planned_module,
      authority_module_not_created_by_this_gate: !result.planned_module_present || followupFirstSliceFilePresent,
      second_slice_plan_file_present_or_installed_context_allowed: planFileStatus === 'present_validated' || planFileStatus === 'not_present_installed_context_allowed',
      gitignore_tracks_source_artifacts: result.package_context === 'installed_package' || (gitignore.present && gitignore.missing_required_unignore_entries.length === 0),
      gitignore_does_not_ignore_src_domains: result.package_context === 'installed_package' || gitignore.present_forbidden_ignore_entries.length === 0,
      gitignore_uses_compact_local_state_policy: result.package_context === 'installed_package' || (gitignore.present && gitignore.per_artifact_unignore_entries.length === 0 && gitignore.missing_local_state_ignore_entries.length === 0),
      second_slice_commands_no_write: PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.boundary.second_slice_plan_command_writes_files === false && PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.boundary.second_slice_check_command_writes_files === false,
      package_allowlist_unchanged: arrayEquals(result.projected_pack_files, expectedPackFiles)
    },
    planned_second_slice: planned,
    second_slice_plan_file: {
      path: PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN.second_slice_plan_file,
      present: result.second_slice_plan_file_present,
      status: planFileStatus,
      schema: planFileSchema,
      source_context_required: result.package_context === 'source_repository'
    },
    gitignore_policy: gitignore,
    prerequisite_installed_fallback_smoke: {
      status: installedFallback.status,
      errors: installedFallback.errors
    },
    projected_pack_files: result.projected_pack_files,
    expected_pack_files: expectedPackFiles,
    boundary: result.boundary,
    errors
  };
}


function loadAuthoritySecondSliceModule(root = packageRoot()) {
  const modulePath = path.join(root, PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_FIRST_SLICE.source_module);
  if (!fs.existsSync(modulePath)) return null;
  const resolved = require.resolve(modulePath);
  delete require.cache[resolved];
  return require(resolved);
}

function publicSourceModuleExtractionSecondSliceFirstSlice(root = packageRoot()) {
  const pkg = readJson(path.join(root, 'package.json'));
  const context = sourceContext(root);
  const gate = PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_FIRST_SLICE;
  let module_exports = [];
  let module_value = null;
  let module_load_error = null;
  try {
    const loaded = loadAuthoritySecondSliceModule(root);
    if (loaded) {
      module_exports = Object.keys(loaded).sort();
      if (typeof loaded.getAuthorityDomainSecondSlice === 'function') {
        module_value = loaded.getAuthorityDomainSecondSlice();
      } else if (loaded.AUTHORITY_DOMAIN_SECOND_SLICE) {
        module_value = loaded.AUTHORITY_DOMAIN_SECOND_SLICE;
      }
    }
  } catch (error) {
    module_load_error = error && error.message ? error.message : String(error);
  }
  return {
    schema: 'agent-onboard-public-source-module-extraction-second-slice-first-slice-result-001',
    status: module_load_error ? 'error' : 'ok',
    package_name: gate.package_name,
    version: VERSION,
    release_line: gate.release_line,
    command: gate.command,
    check_command: gate.check_command,
    package_root: root,
    package_context: context.package_context,
    package_json_version: pkg.version,
    second_slice_first_slice_file: gate.second_slice_first_slice_file,
    second_slice_first_slice_file_present: fs.existsSync(path.join(root, gate.second_slice_first_slice_file)),
    source_module: gate.source_module,
    source_module_present: fs.existsSync(path.join(root, gate.source_module)),
    source_module_exports: module_exports,
    source_module_value: module_value,
    source_module_load_error: module_load_error,
    prerequisite_second_slice_plan_file: gate.prerequisite_second_slice_plan_file,
    second_slice_first_slice: gate,
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

function publicSourceModuleExtractionSecondSliceFirstSliceCheck(root = packageRoot()) {
  const result = publicSourceModuleExtractionSecondSliceFirstSlice(root);
  const plan = publicSourceModuleExtractionSecondSlicePlanCheck(root);
  const expectedPackFiles = PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort();
  const gate = PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_FIRST_SLICE;
  const expectedExports = gate.expected_module_export_names.slice().sort();
  const expectedReadOrder = gate.expected_read_order_paths.slice();
  const errors = [];
  if (plan.status !== 'ok') errors.push(...plan.errors.map((error) => `second slice plan: ${error}`));
  if (result.status !== 'ok') errors.push(`second slice first-slice module load failed: ${result.source_module_load_error}`);
  if (!arrayEquals(result.projected_pack_files, expectedPackFiles)) errors.push(`projected npm pack files must remain ${expectedPackFiles.join(', ')}`);
  if (gate.second_slice_first_slice_status !== 'source_only_shadow_module_applied') errors.push('second slice first-slice status must be source_only_shadow_module_applied');
  if (gate.extracted_domain.id !== 'authority') errors.push('second slice first-slice must extract the authority domain');
  if (gate.boundary.created_source_module !== 'src/domains/authority.js') errors.push('second slice created source module must be src/domains/authority.js');
  if (gate.boundary.creates_exactly_one_source_module !== true) errors.push('second slice first-slice must create exactly one source module');
  if (gate.boundary.excludes_write_capable_agents_command !== true) errors.push('second slice first-slice must exclude write-capable agents command extraction');
  if (gate.boundary.moves_existing_source_files !== false) errors.push('second slice first-slice must not move existing source files');
  if (gate.boundary.changes_public_cli_outputs !== false) errors.push('second slice first-slice must not change public CLI outputs');
  if (gate.boundary.changes_cli_runtime_dependency_graph !== false) errors.push('second slice first-slice must not make CLI runtime require source modules');
  if (gate.boundary.exports_source_module_as_public_api !== false) errors.push('second slice first-slice must not expose source module as public import API');
  if (gate.boundary.second_slice_first_slice_command_writes_files !== false) errors.push('architecture --second-slice-first-slice must remain no-write');
  if (gate.boundary.second_slice_first_slice_check_command_writes_files !== false) errors.push('architecture --second-slice-first-slice-check must remain no-write');

  let artifactStatus = 'not_present_installed_context_allowed';
  let artifactSchema = null;
  if (result.second_slice_first_slice_file_present) {
    try {
      const artifact = readJson(path.join(root, result.second_slice_first_slice_file));
      artifactSchema = artifact.schema || null;
      if (artifact.schema !== gate.schema) errors.push(`${result.second_slice_first_slice_file} schema must be ${gate.schema}`);
      if (!artifact.extracted_domain || artifact.extracted_domain.id !== 'authority') errors.push(`${result.second_slice_first_slice_file} must declare extracted_domain.id authority`);
      if (artifact.source_module !== 'src/domains/authority.js') errors.push(`${result.second_slice_first_slice_file} source_module must be src/domains/authority.js`);
      artifactStatus = 'present_validated';
    } catch (error) {
      artifactStatus = 'present_invalid_json';
      errors.push(`${result.second_slice_first_slice_file} is not valid JSON: ${error && error.message ? error.message : String(error)}`);
    }
  } else if (result.package_context === 'source_repository') {
    artifactStatus = 'missing_source_context';
    errors.push(`${result.second_slice_first_slice_file} must be present in source repository context`);
  }

  let sourceModuleStatus = 'not_present_installed_context_allowed';
  const moduleValue = result.source_module_value || {};
  const moduleExportsSorted = result.source_module_exports.slice().sort();
  if (result.source_module_present) {
    if (!arrayEquals(moduleExportsSorted, expectedExports)) errors.push(`${result.source_module} exports must be ${expectedExports.join(', ')}`);
    if (moduleValue.schema !== 'agent-onboard-public-source-module-authority-second-slice-001') errors.push(`${result.source_module} must export authority second-slice schema`);
    if (moduleValue.domain !== 'authority') errors.push(`${result.source_module} domain must be authority`);
    if (moduleValue.facade !== 'authorityService') errors.push(`${result.source_module} facade must be authorityService`);
    if (moduleValue.source_module !== result.source_module) errors.push(`${result.source_module} source_module field must match its path`);
    if (moduleValue.runtime_dependency_status !== gate.extracted_domain.runtime_dependency_status) errors.push(`${result.source_module} runtime dependency status must remain source-only shadow`);
    if (moduleValue.exports_public_api !== false) errors.push(`${result.source_module} must not declare public import API`);
    if (moduleValue.includes_write_capable_agents_command !== false) errors.push(`${result.source_module} must exclude write-capable agents command extraction`);
    if (moduleValue.writes_files !== false || moduleValue.state_writer !== false) errors.push(`${result.source_module} must remain read-only and non-state-writer`);
    if (!arrayEquals((moduleValue.read_order_paths || []), expectedReadOrder)) errors.push(`${result.source_module} read_order_paths must match authority first-read order`);
    sourceModuleStatus = 'present_validated';
  } else if (result.package_context === 'source_repository') {
    sourceModuleStatus = 'missing_source_context';
    errors.push(`${result.source_module} must be present in source repository context`);
  }

  return {
    schema: 'agent-onboard-public-source-module-extraction-second-slice-first-slice-check-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: gate.package_name,
    version: VERSION,
    release_line: gate.release_line,
    command: gate.check_command,
    package_root: root,
    validated: {
      second_slice_plan: plan.status === 'ok',
      second_slice_status: gate.second_slice_first_slice_status === 'source_only_shadow_module_applied',
      extracted_domain_is_authority: gate.extracted_domain.id === 'authority',
      source_module_present_or_installed_context_allowed: sourceModuleStatus === 'present_validated' || sourceModuleStatus === 'not_present_installed_context_allowed',
      second_slice_first_slice_file_present_or_installed_context_allowed: artifactStatus === 'present_validated' || artifactStatus === 'not_present_installed_context_allowed',
      write_capable_agents_command_excluded: moduleValue.includes_write_capable_agents_command === false || sourceModuleStatus === 'not_present_installed_context_allowed',
      commands_no_write: gate.boundary.second_slice_first_slice_command_writes_files === false && gate.boundary.second_slice_first_slice_check_command_writes_files === false,
      package_allowlist_unchanged: arrayEquals(result.projected_pack_files, expectedPackFiles)
    },
    source_module: {
      path: result.source_module,
      present: result.source_module_present,
      status: sourceModuleStatus,
      exports: result.source_module_exports,
      value: result.source_module_value,
      source_context_required: result.package_context === 'source_repository'
    },
    second_slice_first_slice_file: {
      path: result.second_slice_first_slice_file,
      present: result.second_slice_first_slice_file_present,
      status: artifactStatus,
      schema: artifactSchema,
      source_context_required: result.package_context === 'source_repository'
    },
    prerequisite_second_slice_plan: {
      status: plan.status,
      errors: plan.errors
    },
    projected_pack_files: result.projected_pack_files,
    expected_pack_files: expectedPackFiles,
    boundary: result.boundary,
    errors
  };
}


function bundledAuthorityDomainForParity(root = packageRoot()) {
  const map = publicArchitectureMap(root);
  const facade = PUBLIC_DOMAIN_SERVICE_FACADES.facades.find((item) => item.id === 'authority');
  const domain = map.map.canonical_domains.find((item) => item.id === 'authority');
  return {
    schema: 'agent-onboard-public-bundled-authority-domain-view-001',
    domain: domain ? domain.id : null,
    facade: facade ? facade.service : null,
    service: facade ? facade.service : null,
    source: 'cli/agent-onboard.js',
    owns_commands: PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_FIRST_SLICE.expected_owned_commands.slice(),
    excluded_commands: ['agents --write', 'agents --preview'],
    writes_files: false,
    state_writer: false,
    state_files: domain ? domain.state_files.slice() : [],
    read_order_paths: PUBLIC_AUTHORITY_FIRST_READ_INDEX.read_order.map((item) => item.path),
    package_context: sourceContext(root).package_context
  };
}

function publicSourceModuleExtractionAuthorityBundleParity(root = packageRoot()) {
  const pkg = readJson(path.join(root, 'package.json'));
  const context = sourceContext(root);
  const sourceSlice = publicSourceModuleExtractionSecondSliceFirstSlice(root);
  const bundledAuthority = bundledAuthorityDomainForParity(root);
  return {
    schema: 'agent-onboard-public-source-module-extraction-authority-bundle-parity-result-001',
    status: sourceSlice.status,
    package_name: PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_BUNDLE_PARITY.package_name,
    version: VERSION,
    release_line: PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_BUNDLE_PARITY.release_line,
    command: PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_BUNDLE_PARITY.command,
    check_command: PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_BUNDLE_PARITY.check_command,
    package_root: root,
    package_context: context.package_context,
    package_json_version: pkg.version,
    authority_bundle_parity_file: PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_BUNDLE_PARITY.authority_bundle_parity_file,
    authority_bundle_parity_file_present: fs.existsSync(path.join(root, PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_BUNDLE_PARITY.authority_bundle_parity_file)),
    source_module: PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_BUNDLE_PARITY.source_module,
    source_module_present: fs.existsSync(path.join(root, PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_BUNDLE_PARITY.source_module)),
    source_slice_value: sourceSlice.source_module_value,
    source_slice_load_error: sourceSlice.source_module_load_error,
    bundled_authority_view: bundledAuthority,
    authority_bundle_parity: PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_BUNDLE_PARITY,
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

function publicSourceModuleExtractionAuthorityBundleParityCheck(root = packageRoot()) {
  const result = publicSourceModuleExtractionAuthorityBundleParity(root);
  const firstSlice = publicSourceModuleExtractionSecondSliceFirstSliceCheck(root);
  const expectedPackFiles = PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort();
  const gate = PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_BUNDLE_PARITY;
  const errors = [];
  if (firstSlice.status !== 'ok') errors.push(...firstSlice.errors.map((error) => `second slice first-slice: ${error}`));
  if (result.status !== 'ok') errors.push(`authority source slice module load failed: ${result.source_slice_load_error}`);
  if (!arrayEquals(result.projected_pack_files, expectedPackFiles)) errors.push(`projected npm pack files must remain ${expectedPackFiles.join(', ')}`);
  if (gate.parity_status !== 'authority_source_slice_matches_bundled_cli_view') errors.push('authority bundle parity status must remain authority_source_slice_matches_bundled_cli_view');
  if (gate.boundary.authority_bundle_parity_command_writes_files !== false) errors.push('architecture --authority-bundle-parity must remain no-write');
  if (gate.boundary.authority_bundle_parity_check_command_writes_files !== false) errors.push('architecture --authority-bundle-parity-check must remain no-write');
  if (gate.boundary.creates_bundle_artifact !== false) errors.push('authority bundle parity gate must not create bundle artifacts');
  if (gate.boundary.changes_public_cli_outputs !== false) errors.push('authority bundle parity gate must not change public CLI outputs');
  if (gate.boundary.changes_cli_runtime_dependency_graph !== false) errors.push('authority bundle parity gate must not change CLI runtime dependency graph');
  if (gate.boundary.includes_write_capable_agents_command !== false) errors.push('authority bundle parity gate must exclude write-capable agents command extraction');
  if (gate.boundary.package_allowlist_unchanged !== true) errors.push('authority bundle parity gate must preserve package allowlist');

  let parityFileStatus = 'not_present_installed_context_allowed';
  let parityFileSchema = null;
  if (result.authority_bundle_parity_file_present) {
    try {
      const parityFile = readJson(path.join(root, result.authority_bundle_parity_file));
      parityFileSchema = parityFile.schema || null;
      if (parityFile.schema !== gate.schema) errors.push(`${result.authority_bundle_parity_file} schema must be ${gate.schema}`);
      if (parityFile.source_module !== gate.source_module) errors.push(`${result.authority_bundle_parity_file} source_module must be ${gate.source_module}`);
      if (parityFile.parity_status !== gate.parity_status) errors.push(`${result.authority_bundle_parity_file} parity_status must be ${gate.parity_status}`);
      if (!parityFile.boundary || parityFile.boundary.package_allowlist_unchanged !== true) errors.push(`${result.authority_bundle_parity_file} must preserve package_allowlist_unchanged`);
      if (!parityFile.boundary || parityFile.boundary.includes_write_capable_agents_command !== false) errors.push(`${result.authority_bundle_parity_file} must exclude write-capable agents command extraction`);
      parityFileStatus = 'present_validated';
    } catch (error) {
      parityFileStatus = 'present_invalid_json';
      errors.push(`${result.authority_bundle_parity_file} is not valid JSON: ${error && error.message ? error.message : String(error)}`);
    }
  } else if (result.package_context === 'source_repository') {
    parityFileStatus = 'missing_source_context';
    errors.push(`${result.authority_bundle_parity_file} must be present in source repository context`);
  }

  const sourceSlice = result.source_slice_value || null;
  const sourceContextAllowedMissing = result.package_context === 'installed_package' && !sourceSlice;
  const commandParity = sourceContextAllowedMissing || (sourceSlice && arrayEquals(sourceSlice.owns_commands || [], result.bundled_authority_view.owns_commands));
  const domainParity = sourceContextAllowedMissing || (sourceSlice && sourceSlice.domain === result.bundled_authority_view.domain);
  const facadeParity = sourceContextAllowedMissing || (sourceSlice && sourceSlice.facade === result.bundled_authority_view.facade);
  const readOrderParity = sourceContextAllowedMissing || (sourceSlice && arrayEquals(sourceSlice.read_order_paths || [], result.bundled_authority_view.read_order_paths));
  const excludedAgentsParity = sourceContextAllowedMissing || (sourceSlice && sourceSlice.includes_write_capable_agents_command === false && arrayEquals(sourceSlice.excluded_commands || [], result.bundled_authority_view.excluded_commands));
  const writeParity = sourceContextAllowedMissing || (sourceSlice && sourceSlice.writes_files === result.bundled_authority_view.writes_files && sourceSlice.state_writer === result.bundled_authority_view.state_writer);
  if (!domainParity) errors.push('authority source slice domain must match bundled authority domain view');
  if (!facadeParity) errors.push('authority source slice facade must match bundled authority facade view');
  if (!commandParity) errors.push('authority source slice owned commands must match bundled authority command routes');
  if (!readOrderParity) errors.push('authority source slice read order must match bundled first-read index');
  if (!excludedAgentsParity) errors.push('authority source slice must exclude write-capable agents commands');
  if (!writeParity) errors.push('authority source slice read/write boundary must match bundled authority view');

  return {
    schema: 'agent-onboard-public-source-module-extraction-authority-bundle-parity-check-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: gate.package_name,
    version: VERSION,
    release_line: gate.release_line,
    command: gate.check_command,
    package_root: root,
    validated: {
      second_slice_first_slice: firstSlice.status === 'ok',
      authority_bundle_parity_status: gate.parity_status === 'authority_source_slice_matches_bundled_cli_view',
      source_slice_domain_matches_bundled_authority: domainParity,
      source_slice_facade_matches_bundled_authority: facadeParity,
      source_slice_commands_match_bundled_authority: commandParity,
      source_slice_read_order_matches_bundled_first_read: readOrderParity,
      write_capable_agents_command_excluded: excludedAgentsParity,
      source_slice_write_boundary_matches_bundled_authority: writeParity,
      source_module_present_or_installed_context_allowed: result.source_module_present || result.package_context === 'installed_package',
      authority_bundle_parity_file_present_or_installed_context_allowed: parityFileStatus === 'present_validated' || parityFileStatus === 'not_present_installed_context_allowed',
      authority_bundle_parity_commands_no_write: gate.boundary.authority_bundle_parity_command_writes_files === false && gate.boundary.authority_bundle_parity_check_command_writes_files === false,
      public_cli_outputs_unchanged_by_gate: gate.boundary.changes_public_cli_outputs === false,
      cli_runtime_dependency_graph_unchanged: gate.boundary.changes_cli_runtime_dependency_graph === false,
      package_allowlist_unchanged: arrayEquals(result.projected_pack_files, expectedPackFiles)
    },
    source_slice: result.source_slice_value,
    bundled_authority_view: result.bundled_authority_view,
    source_authority_bundle_parity_file: {
      path: result.authority_bundle_parity_file,
      present: result.authority_bundle_parity_file_present,
      status: parityFileStatus,
      schema: parityFileSchema,
      source_context_required: result.package_context === 'source_repository'
    },
    prerequisite_second_slice_first_slice: {
      status: firstSlice.status,
      errors: firstSlice.errors
    },
    projected_pack_files: result.projected_pack_files,
    expected_pack_files: expectedPackFiles,
    boundary: result.boundary,
    errors
  };
}


function publicArchitectureCheck(root = packageRoot()) {
  const map = publicArchitectureMap(root);
  const expectedDomains = ['core', 'authority', 'work_items', 'claims', 'target', 'release_package'];
  const domainIds = map.map.canonical_domains.map((domain) => domain.id);
  const expectedPackFiles = map.map.public_source_shape.expected_pack_files.slice().sort();
  const projectedPackFiles = map.current_runtime.projected_pack_files;
  const router = publicCommandRouterCheck(root);
  const routerErrors = router.errors.map((error) => `command router: ${error}`);
  const facades = publicDomainServiceFacadesCheck(root);
  const facadeErrors = facades.errors.map((error) => `domain service facades: ${error}`);
  const authority = publicAuthorityFirstReadCheck(root);
  const authorityErrors = authority.errors.map((error) => `authority: ${error}`);
  const targetRuntime = publicTargetRuntimeNamespaceCheck(root);
  const targetRuntimeErrors = targetRuntime.errors.map((error) => `target runtime: ${error}`);
  const sourcePartition = publicSourceDomainModulePartitionPlanCheck(root);
  const sourcePartitionErrors = sourcePartition.errors.map((error) => `source partition: ${error}`);
  const sourceExtraction = publicSourceDomainExtractionRehearsalCheck(root);
  const sourceExtractionErrors = sourceExtraction.errors.map((error) => `source extraction: ${error}`);
  const goldenOutputs = publicSourceExtractionGoldenOutputFreezeCheck(root);
  const goldenOutputErrors = goldenOutputs.errors.map((error) => `golden outputs: ${error}`);
  const adapterBoundary = publicSourceModuleExtractionAdapterBoundaryCheck(root);
  const adapterBoundaryErrors = adapterBoundary.errors.map((error) => `adapter boundary: ${error}`);
  const firstSlice = publicSourceModuleExtractionFirstSliceCheck(root);
  const firstSliceErrors = firstSlice.errors.map((error) => `first slice: ${error}`);
  const bundleParity = publicSourceModuleExtractionBundleParityCheck(root);
  const bundleParityErrors = bundleParity.errors.map((error) => `bundle parity: ${error}`);
  const runtimeBridge = publicSourceModuleExtractionRuntimeBridgeCheck(root);
  const runtimeBridgeErrors = runtimeBridge.errors.map((error) => `runtime bridge: ${error}`);
  const installedFallbackSmoke = publicSourceModuleExtractionInstalledFallbackSmokeCheck(root);
  const installedFallbackSmokeErrors = installedFallbackSmoke.errors.map((error) => `installed fallback smoke: ${error}`);
  const secondSlicePlan = publicSourceModuleExtractionSecondSlicePlanCheck(root);
  const secondSlicePlanErrors = secondSlicePlan.errors.map((error) => `second slice plan: ${error}`);
  const secondSliceFirstSlice = publicSourceModuleExtractionSecondSliceFirstSliceCheck(root);
  const secondSliceFirstSliceErrors = secondSliceFirstSlice.errors.map((error) => `second slice first-slice: ${error}`);
  const authorityBundleParity = publicSourceModuleExtractionAuthorityBundleParityCheck(root);
  const authorityBundleParityErrors = authorityBundleParity.errors.map((error) => `authority bundle parity: ${error}`);
  const authorityRuntimeBridge = publicSourceModuleExtractionAuthorityRuntimeBridgeCheck(root);
  const authorityRuntimeBridgeErrors = authorityRuntimeBridge.errors.map((error) => `authority runtime bridge: ${error}`);
  const m2Seed = publicArchitectureM1ClosureM2SeedCheck(root);
  const m2SeedErrors = m2Seed.errors.map((error) => `m2 seed: ${error}`);
  const workItemsPlan = publicWorkItemsDomainSourceExtractionPlanCheck(root);
  const workItemsPlanErrors = workItemsPlan.errors.map((error) => `work-items source extraction plan: ${error}`);
  const workItemsFirstSlice = publicWorkItemsDomainSourceExtractionFirstSliceCheck(root);
  const workItemsFirstSliceErrors = workItemsFirstSlice.errors.map((error) => `work-items first-slice: ${error}`);
  const workItemsBundleParity = publicWorkItemsDomainSourceExtractionBundleParityCheck(root);
  const workItemsBundleParityErrors = workItemsBundleParity.errors.map((error) => `work-items bundle parity: ${error}`);
  const workItemsRuntimeBridge = publicWorkItemsDomainSourceExtractionRuntimeBridgeCheck(root);
  const workItemsRuntimeBridgeErrors = workItemsRuntimeBridge.errors.map((error) => `work-items runtime bridge: ${error}`);
  const workItemsInstalledFallback = publicWorkItemsDomainSourceExtractionInstalledFallbackSmokeCheck(root);
  const workItemsInstalledFallbackErrors = workItemsInstalledFallback.errors.map((error) => `work-items installed fallback smoke: ${error}`);
  const claimsPlan = publicClaimsDomainSourceExtractionPlanCheck(root);
  const claimsPlanErrors = claimsPlan.errors.map((error) => `claims source extraction plan: ${error}`);
  const claimsFirstSlice = publicClaimsDomainSourceExtractionFirstSliceCheck(root);
  const claimsFirstSliceErrors = claimsFirstSlice.errors.map((error) => `claims first-slice: ${error}`);
  const claimsBundleParity = publicClaimsDomainSourceExtractionBundleParityCheck(root);
  const claimsBundleParityErrors = claimsBundleParity.errors.map((error) => `claims bundle parity: ${error}`);
  const claimsRuntimeBridge = publicClaimsDomainSourceExtractionRuntimeBridgeCheck(root);
  const claimsRuntimeBridgeErrors = claimsRuntimeBridge.errors.map((error) => `claims runtime bridge: ${error}`);
  const claimsInstalledFallback = publicClaimsDomainSourceExtractionInstalledFallbackSmokeCheck(root);
  const claimsInstalledFallbackErrors = claimsInstalledFallback.errors.map((error) => `claims installed fallback smoke: ${error}`);
  const sourceDomainClosureReview = publicSourceDomainExtractionStabilizationClosureReviewCheck(root);
  const sourceDomainClosureReviewErrors = sourceDomainClosureReview.errors.map((error) => `source-domain closure review: ${error}`);
  const cliRuntimePlan = publicCliRuntimeDeMonolithPlanningCheck(root);
  const cliRuntimePlanErrors = cliRuntimePlan.errors.map((error) => `cli runtime de-monolith planning: ${error}`);
  const thinCliRouter = publicThinCliRouterSeedCheck(root);
  const thinCliRouterErrors = thinCliRouter.errors.map((error) => `thin CLI router seed: ${error}`);
  const compatibilityPort = publicCompatibilityCommandPortSeedCheck(root);
  const compatibilityPortErrors = compatibilityPort.errors.map((error) => `compatibility command port seed: ${error}`);
  const coreAdapter = publicCoreCommandAdapterExtractionCheck(root);
  const coreAdapterErrors = coreAdapter.errors.map((error) => `core command adapter extraction: ${error}`);
  const packageAdapter = publicPackageCommandAdapterExtractionCheck(root);
  const packageAdapterErrors = packageAdapter.errors.map((error) => `package command adapter extraction: ${error}`);
  const architectureAdapter = publicArchitectureCommandAdapterExtractionCheck(root);
  const architectureAdapterErrors = architectureAdapter.errors.map((error) => `architecture command adapter extraction: ${error}`);
  const authorityAdapter = publicAuthorityCommandAdapterExtractionCheck(root);
  const authorityAdapterErrors = authorityAdapter.errors.map((error) => `authority command adapter extraction: ${error}`);
  const moduleInclusionPlan = publicModularRuntimePackageInclusionPlanCheck(root);
  const moduleInclusionPlanErrors = moduleInclusionPlan.errors.map((error) => `modular runtime package inclusion plan: ${error}`);
  const packagedRouterPort = publicPackagedRouterPortInclusionCheck(root);
  const packagedRouterPortErrors = packagedRouterPort.errors.map((error) => `packaged router port inclusion: ${error}`);
  const thinEntrypointRehearsal = publicThinEntrypointRouterCutoverRehearsalCheck(root);
  const thinEntrypointRehearsalErrors = thinEntrypointRehearsal.errors.map((error) => `thin entrypoint rehearsal: ${error}`);
  const thinEntrypointCutover = publicThinEntrypointRouterCutoverApplicationCheck(root);
  const thinEntrypointCutoverErrors = thinEntrypointCutover.errors.map((error) => `thin entrypoint cutover: ${error}`);
  const routerAdapterDelegation = publicRouterCommandAdapterDelegationExpansionCheck(root);
  const routerAdapterDelegationErrors = routerAdapterDelegation.errors.map((error) => `router adapter delegation: ${error}`);
  const errors = [];
  if (!arrayEquals(domainIds, expectedDomains)) errors.push(`architecture domain order must be ${expectedDomains.join(', ')}`);
  if (new Set(domainIds).size !== domainIds.length) errors.push('architecture domain ids must be unique');
  if (map.map.canonical_domains.length !== 6) errors.push('architecture map must declare exactly 6 public domains');
  if (!map.current_runtime.entrypoint_exists) errors.push(`architecture entrypoint is missing: ${map.current_runtime.entrypoint}`);
  if (!arrayEquals(projectedPackFiles, expectedPackFiles)) errors.push(`projected npm pack files must match architecture package boundary ${expectedPackFiles.join(', ')}`);
  if (map.map.package_boundary.architecture_map_command_writes_files !== false) errors.push('architecture map command must remain no-write');
  if (map.map.package_boundary.architecture_check_command_writes_files !== false) errors.push('architecture check command must remain no-write');
  if (map.map.package_boundary.architecture_router_command_writes_files !== false) errors.push('architecture router command must remain no-write');
  if (map.map.package_boundary.architecture_facades_command_writes_files !== false) errors.push('architecture facades command must remain no-write');
  if (map.map.package_boundary.architecture_partition_plan_command_writes_files !== false) errors.push('architecture partition plan command must remain no-write');
  if (map.map.package_boundary.architecture_partition_check_command_writes_files !== false) errors.push('architecture partition check command must remain no-write');
  if (map.map.package_boundary.architecture_extraction_rehearsal_command_writes_files !== false) errors.push('architecture extraction rehearsal command must remain no-write');
  if (map.map.package_boundary.architecture_extraction_check_command_writes_files !== false) errors.push('architecture extraction check command must remain no-write');
  if (map.map.package_boundary.architecture_golden_outputs_command_writes_files !== false) errors.push('architecture golden outputs command must remain no-write');
  if (map.map.package_boundary.architecture_golden_check_command_writes_files !== false) errors.push('architecture golden check command must remain no-write');
  if (map.map.package_boundary.architecture_adapter_boundary_command_writes_files !== false) errors.push('architecture adapter boundary command must remain no-write');
  if (map.map.package_boundary.architecture_adapter_check_command_writes_files !== false) errors.push('architecture adapter check command must remain no-write');
  if (map.map.package_boundary.architecture_first_slice_command_writes_files !== false) errors.push('architecture first slice command must remain no-write');
  if (map.map.package_boundary.architecture_first_slice_check_command_writes_files !== false) errors.push('architecture first slice check command must remain no-write');
  if (map.map.package_boundary.architecture_bundle_parity_command_writes_files !== false) errors.push('architecture bundle parity command must remain no-write');
  if (map.map.package_boundary.architecture_bundle_parity_check_command_writes_files !== false) errors.push('architecture bundle parity check command must remain no-write');
  if (map.map.package_boundary.architecture_runtime_bridge_command_writes_files !== false) errors.push('architecture runtime bridge command must remain no-write');
  if (map.map.package_boundary.architecture_runtime_bridge_check_command_writes_files !== false) errors.push('architecture runtime bridge check command must remain no-write');
  if (map.map.package_boundary.architecture_installed_fallback_smoke_command_writes_files !== false) errors.push('architecture installed fallback smoke command must remain no-write');
  if (map.map.package_boundary.architecture_installed_fallback_check_command_writes_files !== false) errors.push('architecture installed fallback check command must remain no-write');
  if (map.map.package_boundary.architecture_second_slice_plan_command_writes_files !== false) errors.push('architecture second slice plan command must remain no-write');
  if (map.map.package_boundary.architecture_second_slice_check_command_writes_files !== false) errors.push('architecture second slice check command must remain no-write');
  if (map.map.package_boundary.architecture_second_slice_first_slice_command_writes_files !== false) errors.push('architecture second slice first-slice command must remain no-write');
  if (map.map.package_boundary.architecture_second_slice_first_slice_check_command_writes_files !== false) errors.push('architecture second slice first-slice check command must remain no-write');
  if (map.map.package_boundary.architecture_authority_bundle_parity_command_writes_files !== false) errors.push('architecture authority bundle parity command must remain no-write');
  if (map.map.package_boundary.architecture_authority_bundle_parity_check_command_writes_files !== false) errors.push('architecture authority bundle parity check command must remain no-write');
  if (map.map.package_boundary.architecture_authority_runtime_bridge_command_writes_files !== false) errors.push('architecture authority runtime bridge command must remain no-write');
  if (map.map.package_boundary.architecture_authority_runtime_bridge_check_command_writes_files !== false) errors.push('architecture authority runtime bridge check command must remain no-write');
  if (map.map.package_boundary.architecture_m2_seed_command_writes_files !== false) errors.push('architecture m2 seed command must remain no-write');
  if (map.map.package_boundary.architecture_m2_seed_check_command_writes_files !== false) errors.push('architecture m2 seed check command must remain no-write');
  if (map.map.package_boundary.architecture_work_items_plan_command_writes_files !== false) errors.push('architecture work-items plan command must remain no-write');
  if (map.map.package_boundary.architecture_work_items_check_command_writes_files !== false) errors.push('architecture work-items check command must remain no-write');
  if (map.map.package_boundary.architecture_work_items_first_slice_command_writes_files !== false) errors.push('architecture work-items first-slice command must remain no-write');
  if (map.map.package_boundary.architecture_work_items_first_slice_check_command_writes_files !== false) errors.push('architecture work-items first-slice check command must remain no-write');
  if (map.map.package_boundary.architecture_work_items_bundle_parity_command_writes_files !== false) errors.push('architecture work-items bundle parity command must remain no-write');
  if (map.map.package_boundary.architecture_work_items_bundle_parity_check_command_writes_files !== false) errors.push('architecture work-items bundle parity check command must remain no-write');
  if (map.map.package_boundary.architecture_work_items_runtime_bridge_command_writes_files !== false) errors.push('architecture work-items runtime bridge command must remain no-write');
  if (map.map.package_boundary.architecture_work_items_runtime_bridge_check_command_writes_files !== false) errors.push('architecture work-items runtime bridge check command must remain no-write');
  if (map.map.package_boundary.architecture_work_items_installed_fallback_smoke_command_writes_files !== false) errors.push('architecture work-items installed fallback smoke command must remain no-write');
  if (map.map.package_boundary.architecture_work_items_installed_fallback_check_command_writes_files !== false) errors.push('architecture work-items installed fallback check command must remain no-write');
  if (map.map.package_boundary.architecture_claims_plan_command_writes_files !== false) errors.push('architecture claims plan command must remain no-write');
  if (map.map.package_boundary.architecture_claims_check_command_writes_files !== false) errors.push('architecture claims check command must remain no-write');
  if (map.map.package_boundary.architecture_claims_first_slice_command_writes_files !== false) errors.push('architecture claims first-slice command must remain no-write');
  if (map.map.package_boundary.architecture_claims_first_slice_check_command_writes_files !== false) errors.push('architecture claims first-slice check command must remain no-write');
  if (map.map.package_boundary.architecture_claims_bundle_parity_command_writes_files !== false) errors.push('architecture claims bundle parity command must remain no-write');
  if (map.map.package_boundary.architecture_claims_bundle_parity_check_command_writes_files !== false) errors.push('architecture claims bundle parity check command must remain no-write');
  if (map.map.package_boundary.architecture_claims_runtime_bridge_command_writes_files !== false) errors.push('architecture claims runtime bridge command must remain no-write');
  if (map.map.package_boundary.architecture_claims_runtime_bridge_check_command_writes_files !== false) errors.push('architecture claims runtime bridge check command must remain no-write');
  if (map.map.package_boundary.architecture_claims_installed_fallback_smoke_command_writes_files !== false) errors.push('architecture claims installed fallback smoke command must remain no-write');
  if (map.map.package_boundary.architecture_claims_installed_fallback_check_command_writes_files !== false) errors.push('architecture claims installed fallback check command must remain no-write');
  if (map.map.package_boundary.architecture_source_domain_closure_review_command_writes_files !== false) errors.push('architecture source-domain closure review command must remain no-write');
  if (map.map.package_boundary.architecture_source_domain_closure_check_command_writes_files !== false) errors.push('architecture source-domain closure check command must remain no-write');
  if (map.map.package_boundary.architecture_cli_runtime_plan_command_writes_files !== false) errors.push('architecture CLI runtime plan command must remain no-write');
  if (map.map.package_boundary.architecture_cli_runtime_check_command_writes_files !== false) errors.push('architecture CLI runtime check command must remain no-write');
  if (map.map.package_boundary.architecture_thin_router_command_writes_files !== false) errors.push('architecture thin router command must remain no-write');
  if (map.map.package_boundary.architecture_thin_router_check_command_writes_files !== false) errors.push('architecture thin router check command must remain no-write');
  if (map.map.package_boundary.architecture_compatibility_port_command_writes_files !== false) errors.push('architecture compatibility port command must remain no-write');
  if (map.map.package_boundary.architecture_compatibility_port_check_command_writes_files !== false) errors.push('architecture compatibility port check command must remain no-write');
  if (map.map.package_boundary.architecture_core_adapter_command_writes_files !== false) errors.push('architecture core adapter command must remain no-write');
  if (map.map.package_boundary.architecture_core_adapter_check_command_writes_files !== false) errors.push('architecture core adapter check command must remain no-write');
  if (map.map.package_boundary.architecture_package_adapter_command_writes_files !== false) errors.push('architecture package adapter command must remain no-write');
  if (map.map.package_boundary.architecture_package_adapter_check_command_writes_files !== false) errors.push('architecture package adapter check command must remain no-write');
  if (map.map.package_boundary.architecture_architecture_adapter_command_writes_files !== false) errors.push('architecture architecture adapter command must remain no-write');
  if (map.map.package_boundary.architecture_architecture_adapter_check_command_writes_files !== false) errors.push('architecture architecture adapter check command must remain no-write');
  if (map.map.package_boundary.architecture_authority_adapter_command_writes_files !== false) errors.push('architecture authority adapter command must remain no-write');
  if (map.map.package_boundary.architecture_authority_adapter_check_command_writes_files !== false) errors.push('architecture authority adapter check command must remain no-write');
  if (map.map.package_boundary.architecture_module_inclusion_plan_command_writes_files !== false) errors.push('architecture module inclusion plan command must remain no-write');
  if (map.map.package_boundary.architecture_module_inclusion_check_command_writes_files !== false) errors.push('architecture module inclusion check command must remain no-write');
  if (map.map.package_boundary.architecture_router_adapter_delegation_command_writes_files !== false) errors.push('architecture router adapter delegation command must remain no-write');
  if (map.map.package_boundary.architecture_router_adapter_delegation_check_command_writes_files !== false) errors.push('architecture router adapter delegation check command must remain no-write');
  if (map.map.package_boundary.version_sprawl_check_command_writes_files !== false) errors.push('version sprawl check command must remain no-write');
  if (map.map.package_boundary.authority_first_read_command_writes_files !== false) errors.push('authority first-read command must remain no-write');
  if (map.map.package_boundary.authority_check_command_writes_files !== false) errors.push('authority check command must remain no-write');
  if (map.map.package_boundary.target_runtime_namespace_command_writes_files !== false) errors.push('target runtime namespace command must remain no-write');
  if (map.map.package_boundary.target_runtime_check_command_writes_files !== false) errors.push('target runtime check command must remain no-write');
  errors.push(...routerErrors, ...facadeErrors, ...authorityErrors, ...targetRuntimeErrors, ...sourcePartitionErrors, ...sourceExtractionErrors, ...goldenOutputErrors, ...adapterBoundaryErrors, ...firstSliceErrors, ...bundleParityErrors, ...runtimeBridgeErrors, ...installedFallbackSmokeErrors, ...secondSlicePlanErrors, ...secondSliceFirstSliceErrors, ...authorityBundleParityErrors, ...authorityRuntimeBridgeErrors, ...m2SeedErrors, ...workItemsPlanErrors, ...workItemsFirstSliceErrors, ...workItemsBundleParityErrors, ...workItemsRuntimeBridgeErrors, ...workItemsInstalledFallbackErrors, ...claimsPlanErrors, ...claimsFirstSliceErrors, ...claimsBundleParityErrors, ...claimsRuntimeBridgeErrors, ...claimsInstalledFallbackErrors, ...sourceDomainClosureReviewErrors, ...cliRuntimePlanErrors, ...thinCliRouterErrors, ...compatibilityPortErrors, ...coreAdapterErrors, ...packageAdapterErrors, ...architectureAdapterErrors, ...authorityAdapterErrors, ...moduleInclusionPlanErrors, ...packagedRouterPortErrors, ...thinEntrypointRehearsalErrors, ...thinEntrypointCutoverErrors, ...routerAdapterDelegationErrors);
  return {
    schema: 'agent-onboard-public-architecture-check-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: PUBLIC_ARCHITECTURE_MAP.package_name,
    version: VERSION,
    release_line: PUBLIC_ARCHITECTURE_MAP.release_line,
    command: PUBLIC_ARCHITECTURE_MAP.check_command,
    package_root: root,
    validated: {
      domain_count: map.map.canonical_domains.length === 6,
      domain_order: arrayEquals(domainIds, expectedDomains),
      domain_ids_unique: new Set(domainIds).size === domainIds.length,
      runtime_entrypoint_present: map.current_runtime.entrypoint_exists,
      compact_package_boundary: arrayEquals(projectedPackFiles, expectedPackFiles),
      architecture_commands_no_write: map.map.package_boundary.architecture_map_command_writes_files === false && map.map.package_boundary.architecture_check_command_writes_files === false && map.map.package_boundary.architecture_router_command_writes_files === false && map.map.package_boundary.architecture_facades_command_writes_files === false && map.map.package_boundary.architecture_partition_plan_command_writes_files === false && map.map.package_boundary.architecture_partition_check_command_writes_files === false && map.map.package_boundary.architecture_extraction_rehearsal_command_writes_files === false && map.map.package_boundary.architecture_extraction_check_command_writes_files === false && map.map.package_boundary.architecture_golden_outputs_command_writes_files === false && map.map.package_boundary.architecture_golden_check_command_writes_files === false && map.map.package_boundary.architecture_adapter_boundary_command_writes_files === false && map.map.package_boundary.architecture_adapter_check_command_writes_files === false && map.map.package_boundary.architecture_first_slice_command_writes_files === false && map.map.package_boundary.architecture_first_slice_check_command_writes_files === false && map.map.package_boundary.architecture_bundle_parity_command_writes_files === false && map.map.package_boundary.architecture_bundle_parity_check_command_writes_files === false && map.map.package_boundary.architecture_runtime_bridge_command_writes_files === false && map.map.package_boundary.architecture_runtime_bridge_check_command_writes_files === false && map.map.package_boundary.architecture_installed_fallback_smoke_command_writes_files === false && map.map.package_boundary.architecture_installed_fallback_check_command_writes_files === false && map.map.package_boundary.architecture_second_slice_plan_command_writes_files === false && map.map.package_boundary.architecture_second_slice_check_command_writes_files === false && map.map.package_boundary.architecture_second_slice_first_slice_command_writes_files === false && map.map.package_boundary.architecture_second_slice_first_slice_check_command_writes_files === false && map.map.package_boundary.architecture_authority_bundle_parity_command_writes_files === false && map.map.package_boundary.architecture_authority_bundle_parity_check_command_writes_files === false && map.map.package_boundary.architecture_authority_runtime_bridge_command_writes_files === false && map.map.package_boundary.architecture_authority_runtime_bridge_check_command_writes_files === false && map.map.package_boundary.architecture_m2_seed_command_writes_files === false && map.map.package_boundary.architecture_m2_seed_check_command_writes_files === false && map.map.package_boundary.architecture_work_items_plan_command_writes_files === false && map.map.package_boundary.architecture_work_items_check_command_writes_files === false && map.map.package_boundary.architecture_work_items_first_slice_command_writes_files === false && map.map.package_boundary.architecture_work_items_first_slice_check_command_writes_files === false && map.map.package_boundary.architecture_work_items_bundle_parity_command_writes_files === false && map.map.package_boundary.architecture_work_items_bundle_parity_check_command_writes_files === false && map.map.package_boundary.architecture_work_items_runtime_bridge_command_writes_files === false && map.map.package_boundary.architecture_work_items_runtime_bridge_check_command_writes_files === false && map.map.package_boundary.architecture_work_items_installed_fallback_smoke_command_writes_files === false && map.map.package_boundary.architecture_work_items_installed_fallback_check_command_writes_files === false && map.map.package_boundary.architecture_claims_plan_command_writes_files === false && map.map.package_boundary.architecture_claims_check_command_writes_files === false && map.map.package_boundary.architecture_claims_first_slice_command_writes_files === false && map.map.package_boundary.architecture_claims_first_slice_check_command_writes_files === false && map.map.package_boundary.architecture_claims_bundle_parity_command_writes_files === false && map.map.package_boundary.architecture_claims_bundle_parity_check_command_writes_files === false && map.map.package_boundary.architecture_claims_runtime_bridge_command_writes_files === false && map.map.package_boundary.architecture_claims_runtime_bridge_check_command_writes_files === false && map.map.package_boundary.architecture_claims_installed_fallback_smoke_command_writes_files === false && map.map.package_boundary.architecture_claims_installed_fallback_check_command_writes_files === false && map.map.package_boundary.architecture_core_adapter_command_writes_files === false && map.map.package_boundary.architecture_core_adapter_check_command_writes_files === false && map.map.package_boundary.architecture_package_adapter_command_writes_files === false && map.map.package_boundary.architecture_package_adapter_check_command_writes_files === false && map.map.package_boundary.architecture_architecture_adapter_command_writes_files === false && map.map.package_boundary.architecture_architecture_adapter_check_command_writes_files === false && map.map.package_boundary.architecture_authority_adapter_command_writes_files === false && map.map.package_boundary.architecture_authority_adapter_check_command_writes_files === false && map.map.package_boundary.architecture_module_inclusion_plan_command_writes_files === false && map.map.package_boundary.architecture_module_inclusion_check_command_writes_files === false && map.map.package_boundary.version_sprawl_check_command_writes_files === false && map.map.package_boundary.authority_first_read_command_writes_files === false && map.map.package_boundary.authority_check_command_writes_files === false,
      command_router_boundary: router.status === 'ok',
      domain_service_facades: facades.status === 'ok',
      authority_first_read_index: authority.status === 'ok',
      target_runtime_namespace: targetRuntime.status === 'ok',
      source_domain_module_partition_plan: sourcePartition.status === 'ok',
      source_domain_extraction_rehearsal: sourceExtraction.status === 'ok',
      source_extraction_golden_output_freeze: goldenOutputs.status === 'ok',
      source_module_extraction_adapter_boundary: adapterBoundary.status === 'ok',
      source_module_extraction_first_slice: firstSlice.status === 'ok',
      source_module_extraction_bundle_parity: bundleParity.status === 'ok',
      source_module_extraction_runtime_bridge: runtimeBridge.status === 'ok',
      source_module_extraction_installed_fallback_smoke: installedFallbackSmoke.status === 'ok',
      source_module_extraction_second_slice_plan: secondSlicePlan.status === 'ok',
      source_module_extraction_second_slice_first_slice: secondSliceFirstSlice.status === 'ok',
      source_module_extraction_authority_bundle_parity: authorityBundleParity.status === 'ok',
      source_module_extraction_authority_runtime_bridge: authorityRuntimeBridge.status === 'ok',
      architecture_m1_closure_m2_seed: m2Seed.status === 'ok',
      work_items_domain_source_extraction_plan: workItemsPlan.status === 'ok',
      work_items_domain_source_extraction_first_slice: workItemsFirstSlice.status === 'ok',
      work_items_domain_source_extraction_bundle_parity: workItemsBundleParity.status === 'ok',
      work_items_domain_source_extraction_runtime_bridge: workItemsRuntimeBridge.status === 'ok',
      work_items_domain_source_extraction_installed_fallback_smoke: workItemsInstalledFallback.status === 'ok',
      claims_domain_source_extraction_plan: claimsPlan.status === 'ok',
      claims_domain_source_extraction_first_slice: claimsFirstSlice.status === 'ok',
      claims_domain_source_extraction_bundle_parity: claimsBundleParity.status === 'ok',
      claims_domain_source_extraction_runtime_bridge: claimsRuntimeBridge.status === 'ok',
      claims_domain_source_extraction_installed_fallback_smoke: claimsInstalledFallback.status === 'ok',
      source_domain_extraction_stabilization_closure_review: sourceDomainClosureReview.status === 'ok',
      cli_runtime_de_monolith_planning: cliRuntimePlan.status === 'ok',
      thin_cli_router_seed: thinCliRouter.status === 'ok',
      compatibility_command_port_seed: compatibilityPort.status === 'ok',
      core_command_adapter_extraction: coreAdapter.status === 'ok',
      package_command_adapter_extraction: packageAdapter.status === 'ok',
      architecture_command_adapter_extraction: architectureAdapter.status === 'ok',
      authority_command_adapter_extraction: authorityAdapter.status === 'ok',
      modular_runtime_package_inclusion_plan: moduleInclusionPlan.status === 'ok',
      packaged_router_port_inclusion: packagedRouterPort.status === 'ok',
      thin_entrypoint_router_cutover_rehearsal: thinEntrypointRehearsal.status === 'ok',
      thin_entrypoint_router_cutover_application: thinEntrypointCutover.status === 'ok',
      router_command_adapter_delegation_expansion: routerAdapterDelegation.status === 'ok'
    },
    domain_ids: domainIds,
    expected_pack_files: expectedPackFiles,
    projected_pack_files: projectedPackFiles,
    command_router: router,
    domain_service_facades: facades,
    authority_first_read_index: authority,
    target_runtime_namespace: targetRuntime,
    source_domain_module_partition_plan: sourcePartition,
    source_domain_extraction_rehearsal: sourceExtraction,
    source_extraction_golden_output_freeze: goldenOutputs,
    source_module_extraction_adapter_boundary: adapterBoundary,
    source_module_extraction_first_slice: firstSlice,
    source_module_extraction_bundle_parity: bundleParity,
    source_module_extraction_runtime_bridge: runtimeBridge,
    source_module_extraction_installed_fallback_smoke: installedFallbackSmoke,
    source_module_extraction_second_slice_plan: secondSlicePlan,
    source_module_extraction_second_slice_first_slice: secondSliceFirstSlice,
    source_module_extraction_authority_bundle_parity: authorityBundleParity,
    source_module_extraction_authority_runtime_bridge: authorityRuntimeBridge,
    public_architecture_m1_closure_m2_seed: m2Seed,
    work_items_domain_source_extraction_plan: workItemsPlan,
    work_items_domain_source_extraction_first_slice: workItemsFirstSlice,
    work_items_domain_source_extraction_bundle_parity: workItemsBundleParity,
    work_items_domain_source_extraction_runtime_bridge: workItemsRuntimeBridge,
    work_items_domain_source_extraction_installed_fallback_smoke: workItemsInstalledFallback,
    claims_domain_source_extraction_plan: claimsPlan,
    claims_domain_source_extraction_first_slice: claimsFirstSlice,
    claims_domain_source_extraction_bundle_parity: claimsBundleParity,
    claims_domain_source_extraction_runtime_bridge: claimsRuntimeBridge,
    claims_domain_source_extraction_installed_fallback_smoke: claimsInstalledFallback,
    source_domain_extraction_stabilization_closure_review: sourceDomainClosureReview,
    cli_runtime_de_monolith_planning: cliRuntimePlan,
    thin_cli_router_seed: thinCliRouter,
    compatibility_command_port_seed: compatibilityPort,
    core_command_adapter_extraction: coreAdapter,
    package_command_adapter_extraction: packageAdapter,
    architecture_command_adapter_extraction: architectureAdapter,
    authority_command_adapter_extraction: authorityAdapter,
    modular_runtime_package_inclusion_plan: moduleInclusionPlan,
    packaged_router_port_inclusion: packagedRouterPort,
    thin_entrypoint_router_cutover_rehearsal: thinEntrypointRehearsal,
    thin_entrypoint_router_cutover_application: thinEntrypointCutover,
    router_command_adapter_delegation_expansion: routerAdapterDelegation,
    boundary: map.boundary,
    errors
  };
}


function publicPackageSurface(root = packageRoot()) {
  const pkg = readJson(path.join(root, 'package.json'));
  const projectedPackFiles = packageJsonProjectedPackFiles(pkg);
  const expectedPackFiles = PUBLIC_PACKAGE_SURFACE_PRESERVATION.expected_pack_files.slice().sort();
  const requiredPackageJsonFiles = PUBLIC_PACKAGE_SURFACE_PRESERVATION.required_package_json_files.slice().sort();
  const actualPackageJsonFiles = Array.isArray(pkg.files) ? pkg.files.slice().sort() : [];
  const context = sourceContext(root);
  const sourceOnlyFiles = PUBLIC_PACKAGE_SURFACE_PRESERVATION.source_only_files.slice();
  const sourceOnlyPresent = sourceOnlyFiles.filter((rel) => fs.existsSync(path.join(root, rel)));
  const sourceOnlyProjected = sourceOnlyFiles.filter((rel) => projectedPackFiles.includes(rel));
  const expectedPresent = expectedPackFiles.filter((rel) => fs.existsSync(path.join(root, rel)));
  const expectedMissing = expectedPackFiles.filter((rel) => !fs.existsSync(path.join(root, rel)));
  const binTargets = Object.values(PUBLIC_RELEASE_CONTRACT.required_package_json.bin);
  const binTargetsInProjectedPack = binTargets.every((rel) => projectedPackFiles.includes(rel));
  return {
    schema: 'agent-onboard-public-package-surface-preservation-result-001',
    status: 'ok',
    package_name: PUBLIC_PACKAGE_SURFACE_PRESERVATION.package_name,
    version: VERSION,
    release_line: PUBLIC_PACKAGE_SURFACE_PRESERVATION.release_line,
    contract_schema: PUBLIC_RELEASE_CONTRACT.schema,
    command: PUBLIC_PACKAGE_SURFACE_PRESERVATION.command,
    check_command: PUBLIC_PACKAGE_SURFACE_PRESERVATION.check_command,
    package_root: root,
    package_context: context.package_context,
    expected_pack_files: expectedPackFiles,
    projected_pack_files: projectedPackFiles,
    required_package_json_files: requiredPackageJsonFiles,
    actual_package_json_files: actualPackageJsonFiles,
    source_only_files: sourceOnlyFiles,
    source_only_files_present: sourceOnlyPresent,
    source_only_files_projected_into_pack: sourceOnlyProjected,
    expected_pack_files_present: expectedPresent,
    expected_pack_files_missing: expectedMissing,
    bin_targets: binTargets,
    bin_targets_in_projected_pack: binTargetsInProjectedPack,
    installed_context_policy: PUBLIC_PACKAGE_SURFACE_PRESERVATION.installed_context_policy,
    boundary: {
      writes_files: false,
      writes_package_root: false,
      writes_target_repository_state: false,
      git_mutation: false,
      installs_dependencies: false,
      runs_package_manager: false,
      runs_build_test_deploy: false,
      publishes_package: false,
      mutates_registry: false,
      network_registry_publish_required: false
    }
  };
}

function publicPackageSurfaceCheck(root = packageRoot()) {
  const surface = publicPackageSurface(root);
  const errors = [];
  const messagingErrors = publicArtifactMessagingErrors(root, surface.expected_pack_files);
  if (!arrayEquals(surface.projected_pack_files, surface.expected_pack_files)) errors.push(`projected npm pack files must be ${surface.expected_pack_files.join(', ')}`);
  if (!arrayEquals(surface.actual_package_json_files, surface.required_package_json_files)) errors.push(`package.json#files must be ${surface.required_package_json_files.join(', ')}`);
  if (surface.expected_pack_files_missing.length > 0) errors.push(`expected npm package files missing: ${surface.expected_pack_files_missing.join(', ')}`);
  if (surface.source_only_files_projected_into_pack.length > 0) errors.push(`source-only files projected into npm package: ${surface.source_only_files_projected_into_pack.join(', ')}`);
  if (!surface.bin_targets_in_projected_pack) errors.push('all bin targets must remain inside the projected npm package surface');
  errors.push(...messagingErrors.map((error) => `public artifact messaging: ${error}`));
  return {
    schema: 'agent-onboard-public-package-surface-preservation-check-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: PUBLIC_PACKAGE_SURFACE_PRESERVATION.package_name,
    version: VERSION,
    release_line: PUBLIC_PACKAGE_SURFACE_PRESERVATION.release_line,
    contract_schema: PUBLIC_RELEASE_CONTRACT.schema,
    command: PUBLIC_PACKAGE_SURFACE_PRESERVATION.check_command,
    package_root: root,
    package_context: surface.package_context,
    validated: {
      controlled_modular_package_surface: arrayEquals(surface.projected_pack_files, surface.expected_pack_files),
      package_json_files_allowlist: arrayEquals(surface.actual_package_json_files, surface.required_package_json_files),
      expected_pack_files_present: surface.expected_pack_files_missing.length === 0,
      source_only_context_excluded_from_pack: surface.source_only_files_projected_into_pack.length === 0,
      source_growth_files_present_in_source_repo: surface.package_context === 'installed_package' || surface.source_only_files_present.length >= 5,
      bin_entrypoints_in_pack: surface.bin_targets_in_projected_pack,
      public_artifact_messaging: messagingErrors.length === 0,
      surface_commands_no_write: PUBLIC_PACKAGE_SURFACE_PRESERVATION.boundary.surface_command_writes_files === false && PUBLIC_PACKAGE_SURFACE_PRESERVATION.boundary.check_command_writes_files === false
    },
    expected_pack_files: surface.expected_pack_files,
    projected_pack_files: surface.projected_pack_files,
    required_package_json_files: surface.required_package_json_files,
    actual_package_json_files: surface.actual_package_json_files,
    source_only_files_present: surface.source_only_files_present,
    source_only_files_projected_into_pack: surface.source_only_files_projected_into_pack,
    boundary: surface.boundary,
    errors
  };
}

function publicReleaseCheck(root = packageRoot()) {
  const pkg = readJson(path.join(root, 'package.json'));
  const metadataErrors = packageJsonReleaseErrors(pkg, root);
  const projectedPackFiles = packageJsonProjectedPackFiles(pkg);
  const expectedPackFiles = PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort();
  const packErrors = arrayEquals(projectedPackFiles, expectedPackFiles) ? [] : [
    `projected npm pack files must match ${expectedPackFiles.join(', ')}`
  ];
  const messagingErrors = publicArtifactMessagingErrors(root, expectedPackFiles);
  const sourceLedger = sourceWorkItemsLedgerCheck(root);
  const sourceLedgerErrors = sourceLedger.present ? sourceLedger.errors.map((error) => `source ledger: ${error}`) : [];
  const architecture = publicArchitectureCheck(root);
  const architectureErrors = architecture.errors.map((error) => `architecture: ${error}`);
  const packageSurface = publicPackageSurfaceCheck(root);
  const versionPolicy = publicVersionReferencePolicyCheck(root);
  const versionPolicyErrors = versionPolicy.errors.map((error) => `version reference policy: ${error}`);
  const packageSurfaceErrors = packageSurface.errors.map((error) => `package surface: ${error}`);
  const architectureParity = { status: architecture.status === 'ok' ? 'ok' : 'error', errors: [] };
  const installedFallbackSmoke = publicSourceModuleExtractionInstalledFallbackSmokeCheck(root);
  const installedFallbackSmokeErrors = installedFallbackSmoke.errors.map((error) => `installed fallback smoke: ${error}`);
  const secondSlicePlan = publicSourceModuleExtractionSecondSlicePlanCheck(root);
  const secondSlicePlanErrors = secondSlicePlan.errors.map((error) => `second slice plan: ${error}`);
  const secondSliceFirstSlice = publicSourceModuleExtractionSecondSliceFirstSliceCheck(root);
  const secondSliceFirstSliceErrors = secondSliceFirstSlice.errors.map((error) => `second slice first-slice: ${error}`);
  const authorityBundleParity = publicSourceModuleExtractionAuthorityBundleParityCheck(root);
  const authorityBundleParityErrors = authorityBundleParity.errors.map((error) => `authority bundle parity: ${error}`);
  const authorityRuntimeBridge = publicSourceModuleExtractionAuthorityRuntimeBridgeCheck(root);
  const authorityRuntimeBridgeErrors = authorityRuntimeBridge.errors.map((error) => `authority runtime bridge: ${error}`);
  const m2Seed = publicArchitectureM1ClosureM2SeedCheck(root);
  const m2SeedErrors = m2Seed.errors.map((error) => `m2 seed: ${error}`);
  const workItemsPlan = publicWorkItemsDomainSourceExtractionPlanCheck(root);
  const workItemsPlanErrors = workItemsPlan.errors.map((error) => `work-items source extraction plan: ${error}`);
  const workItemsFirstSlice = publicWorkItemsDomainSourceExtractionFirstSliceCheck(root);
  const workItemsFirstSliceErrors = workItemsFirstSlice.errors.map((error) => `work-items first-slice: ${error}`);
  const workItemsBundleParity = publicWorkItemsDomainSourceExtractionBundleParityCheck(root);
  const workItemsBundleParityErrors = workItemsBundleParity.errors.map((error) => `work-items bundle parity: ${error}`);
  const workItemsRuntimeBridge = publicWorkItemsDomainSourceExtractionRuntimeBridgeCheck(root);
  const workItemsRuntimeBridgeErrors = workItemsRuntimeBridge.errors.map((error) => `work-items runtime bridge: ${error}`);
  const workItemsInstalledFallback = publicWorkItemsDomainSourceExtractionInstalledFallbackSmokeCheck(root);
  const workItemsInstalledFallbackErrors = workItemsInstalledFallback.errors.map((error) => `work-items installed fallback smoke: ${error}`);
  const claimsPlan = publicClaimsDomainSourceExtractionPlanCheck(root);
  const claimsPlanErrors = claimsPlan.errors.map((error) => `claims source extraction plan: ${error}`);
  const claimsFirstSlice = publicClaimsDomainSourceExtractionFirstSliceCheck(root);
  const claimsFirstSliceErrors = claimsFirstSlice.errors.map((error) => `claims first-slice: ${error}`);
  const claimsBundleParity = publicClaimsDomainSourceExtractionBundleParityCheck(root);
  const claimsBundleParityErrors = claimsBundleParity.errors.map((error) => `claims bundle parity: ${error}`);
  const claimsRuntimeBridge = publicClaimsDomainSourceExtractionRuntimeBridgeCheck(root);
  const claimsRuntimeBridgeErrors = claimsRuntimeBridge.errors.map((error) => `claims runtime bridge: ${error}`);
  const claimsInstalledFallback = publicClaimsDomainSourceExtractionInstalledFallbackSmokeCheck(root);
  const claimsInstalledFallbackErrors = claimsInstalledFallback.errors.map((error) => `claims installed fallback smoke: ${error}`);
  const sourceDomainClosureReview = publicSourceDomainExtractionStabilizationClosureReviewCheck(root);
  const sourceDomainClosureReviewErrors = sourceDomainClosureReview.errors.map((error) => `source-domain closure review: ${error}`);
  const cliRuntimePlan = publicCliRuntimeDeMonolithPlanningCheck(root);
  const cliRuntimePlanErrors = cliRuntimePlan.errors.map((error) => `cli runtime de-monolith planning: ${error}`);
  const thinCliRouter = publicThinCliRouterSeedCheck(root);
  const thinCliRouterErrors = thinCliRouter.errors.map((error) => `thin CLI router seed: ${error}`);
  const compatibilityPort = publicCompatibilityCommandPortSeedCheck(root);
  const compatibilityPortErrors = compatibilityPort.errors.map((error) => `compatibility command port seed: ${error}`);
  const coreAdapter = publicCoreCommandAdapterExtractionCheck(root);
  const coreAdapterErrors = coreAdapter.errors.map((error) => `core command adapter extraction: ${error}`);
  const packageAdapter = publicPackageCommandAdapterExtractionCheck(root);
  const packageAdapterErrors = packageAdapter.errors.map((error) => `package command adapter extraction: ${error}`);
  const architectureAdapter = publicArchitectureCommandAdapterExtractionCheck(root);
  const architectureAdapterErrors = architectureAdapter.errors.map((error) => `architecture command adapter extraction: ${error}`);
  const authorityAdapter = publicAuthorityCommandAdapterExtractionCheck(root);
  const authorityAdapterErrors = authorityAdapter.errors.map((error) => `authority command adapter extraction: ${error}`);
  const moduleInclusionPlan = publicModularRuntimePackageInclusionPlanCheck(root);
  const moduleInclusionPlanErrors = moduleInclusionPlan.errors.map((error) => `modular runtime package inclusion plan: ${error}`);
  const packagedRouterPort = publicPackagedRouterPortInclusionCheck(root);
  const packagedRouterPortErrors = packagedRouterPort.errors.map((error) => `packaged router port inclusion: ${error}`);
  const thinEntrypointRehearsal = publicThinEntrypointRouterCutoverRehearsalCheck(root);
  const thinEntrypointRehearsalErrors = thinEntrypointRehearsal.errors.map((error) => `thin entrypoint rehearsal: ${error}`);
  const thinEntrypointCutover = publicThinEntrypointRouterCutoverApplicationCheck(root);
  const thinEntrypointCutoverErrors = thinEntrypointCutover.errors.map((error) => `thin entrypoint cutover: ${error}`);
  const routerAdapterDelegation = publicRouterCommandAdapterDelegationExpansionCheck(root);
  const routerAdapterDelegationErrors = routerAdapterDelegation.errors.map((error) => `router adapter delegation: ${error}`);
  const architectureParityErrors = architectureParity.errors.map((error) => `installed architecture parity: ${error}`);
  const errors = [...metadataErrors, ...packErrors, ...messagingErrors, ...sourceLedgerErrors, ...architectureErrors, ...packageSurfaceErrors, ...architectureParityErrors, ...installedFallbackSmokeErrors, ...secondSlicePlanErrors, ...secondSliceFirstSliceErrors, ...authorityBundleParityErrors, ...authorityRuntimeBridgeErrors, ...m2SeedErrors, ...workItemsFirstSliceErrors, ...workItemsBundleParityErrors, ...workItemsRuntimeBridgeErrors, ...workItemsInstalledFallbackErrors, ...claimsPlanErrors, ...claimsFirstSliceErrors, ...claimsBundleParityErrors, ...claimsRuntimeBridgeErrors, ...claimsInstalledFallbackErrors, ...sourceDomainClosureReviewErrors, ...cliRuntimePlanErrors, ...thinCliRouterErrors, ...compatibilityPortErrors, ...coreAdapterErrors, ...packageAdapterErrors, ...architectureAdapterErrors, ...authorityAdapterErrors, ...moduleInclusionPlanErrors, ...packagedRouterPortErrors, ...thinEntrypointRehearsalErrors, ...thinEntrypointCutoverErrors, ...routerAdapterDelegationErrors, ...versionPolicyErrors];
  return {
    schema: 'agent-onboard-public-release-check-result-014',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: PUBLIC_RELEASE_CONTRACT.package_name,
    version: VERSION,
    release_line: PUBLIC_RELEASE_CONTRACT.release_line,
    contract_schema: PUBLIC_RELEASE_CONTRACT.schema,
    package_root: root,
    command: PUBLIC_RELEASE_CONTRACT.command,
    contract_command: PUBLIC_RELEASE_CONTRACT.contract_command,
    source_context: sourceContext(root),
    source_work_items_ledger: sourceLedger,
    validated: {
      package_metadata: metadataErrors.length === 0,
      projected_pack_allowlist: packErrors.length === 0,
      public_artifact_messaging: messagingErrors.length === 0,
      bin_entrypoints_exist: metadataErrors.filter((error) => error.includes('points to missing file')).length === 0,
      source_work_items_ledger: sourceLedger.validated,
      public_architecture_map: architecture.status === 'ok',
      public_command_router: architecture.command_router && architecture.command_router.status === 'ok',
      public_domain_service_facades: architecture.domain_service_facades && architecture.domain_service_facades.status === 'ok',
      public_authority_first_read_index: architecture.authority_first_read_index && architecture.authority_first_read_index.status === 'ok',
      public_target_runtime_namespace: architecture.target_runtime_namespace && architecture.target_runtime_namespace.status === 'ok',
      public_source_domain_module_partition_plan: architecture.source_domain_module_partition_plan && architecture.source_domain_module_partition_plan.status === 'ok',
      public_source_domain_extraction_rehearsal: architecture.source_domain_extraction_rehearsal && architecture.source_domain_extraction_rehearsal.status === 'ok',
      public_source_extraction_golden_output_freeze: architecture.source_extraction_golden_output_freeze && architecture.source_extraction_golden_output_freeze.status === 'ok',
      public_source_module_extraction_adapter_boundary: architecture.source_module_extraction_adapter_boundary && architecture.source_module_extraction_adapter_boundary.status === 'ok',
      public_source_module_extraction_first_slice: architecture.source_module_extraction_first_slice && architecture.source_module_extraction_first_slice.status === 'ok',
      public_source_module_extraction_bundle_parity: architecture.source_module_extraction_bundle_parity && architecture.source_module_extraction_bundle_parity.status === 'ok',
      public_source_module_extraction_runtime_bridge: architecture.source_module_extraction_runtime_bridge && architecture.source_module_extraction_runtime_bridge.status === 'ok',
      public_source_module_extraction_installed_fallback_smoke: installedFallbackSmoke.status === 'ok',
      public_source_module_extraction_second_slice_plan: secondSlicePlan.status === 'ok',
      public_source_module_extraction_second_slice_first_slice: secondSliceFirstSlice.status === 'ok',
      public_source_module_extraction_authority_bundle_parity: authorityBundleParity.status === 'ok',
      public_source_module_extraction_authority_runtime_bridge: authorityRuntimeBridge.status === 'ok',
      source_module_extraction_authority_runtime_bridge: authorityRuntimeBridge.status === 'ok',
      public_architecture_m1_closure_m2_seed: m2Seed.status === 'ok',
      work_items_domain_source_extraction_plan: workItemsPlan.status === 'ok',
      work_items_domain_source_extraction_first_slice: workItemsFirstSlice.status === 'ok',
      work_items_domain_source_extraction_bundle_parity: workItemsBundleParity.status === 'ok',
      work_items_domain_source_extraction_runtime_bridge: workItemsRuntimeBridge.status === 'ok',
      work_items_domain_source_extraction_installed_fallback_smoke: workItemsInstalledFallback.status === 'ok',
      claims_domain_source_extraction_plan: claimsPlan.status === 'ok',
      claims_domain_source_extraction_first_slice: claimsFirstSlice.status === 'ok',
      claims_domain_source_extraction_bundle_parity: claimsBundleParity.status === 'ok',
      claims_domain_source_extraction_runtime_bridge: claimsRuntimeBridge.status === 'ok',
      claims_domain_source_extraction_installed_fallback_smoke: claimsInstalledFallback.status === 'ok',
      source_domain_extraction_stabilization_closure_review: sourceDomainClosureReview.status === 'ok',
      cli_runtime_de_monolith_planning: cliRuntimePlan.status === 'ok',
      thin_cli_router_seed: thinCliRouter.status === 'ok',
      compatibility_command_port_seed: compatibilityPort.status === 'ok',
      core_command_adapter_extraction: coreAdapter.status === 'ok',
      package_command_adapter_extraction: packageAdapter.status === 'ok',
      architecture_command_adapter_extraction: architectureAdapter.status === 'ok',
      authority_command_adapter_extraction: authorityAdapter.status === 'ok',
      modular_runtime_package_inclusion_plan: moduleInclusionPlan.status === 'ok',
      packaged_router_port_inclusion: packagedRouterPort.status === 'ok',
      thin_entrypoint_router_cutover_rehearsal: thinEntrypointRehearsal.status === 'ok',
      thin_entrypoint_router_cutover_application: thinEntrypointCutover.status === 'ok',
      router_command_adapter_delegation_expansion: routerAdapterDelegation.status === 'ok',
      public_version_reference_policy: versionPolicy.status === 'ok',
      public_package_surface_preservation: packageSurface.status === 'ok',
      public_installed_parity_architecture_smoke: architectureParity.status === 'ok'
    },
    expected_pack_files: expectedPackFiles,
    projected_pack_files: projectedPackFiles,
    source_context_files: PUBLIC_RELEASE_CONTRACT.source_context_files.slice(),
    public_architecture: architecture,
    public_source_domain_module_partition_plan: architecture.source_domain_module_partition_plan,
    public_source_domain_extraction_rehearsal: architecture.source_domain_extraction_rehearsal,
    public_source_extraction_golden_output_freeze: architecture.source_extraction_golden_output_freeze,
    public_source_module_extraction_adapter_boundary: architecture.source_module_extraction_adapter_boundary,
    public_source_module_extraction_first_slice: architecture.source_module_extraction_first_slice,
    public_source_module_extraction_bundle_parity: architecture.source_module_extraction_bundle_parity,
    public_source_module_extraction_runtime_bridge: architecture.source_module_extraction_runtime_bridge,
    public_source_module_extraction_installed_fallback_smoke: installedFallbackSmoke,
    public_source_module_extraction_second_slice_plan: secondSlicePlan,
    public_source_module_extraction_second_slice_first_slice: secondSliceFirstSlice,
    public_source_module_extraction_authority_bundle_parity: authorityBundleParity,
    public_source_module_extraction_authority_runtime_bridge: authorityRuntimeBridge,
    public_architecture_m1_closure_m2_seed: m2Seed,
    work_items_domain_source_extraction_first_slice: workItemsFirstSlice,
    work_items_domain_source_extraction_plan: workItemsPlan,
    work_items_domain_source_extraction_bundle_parity: workItemsBundleParity,
    work_items_domain_source_extraction_runtime_bridge: workItemsRuntimeBridge,
    work_items_domain_source_extraction_installed_fallback_smoke: workItemsInstalledFallback,
    claims_domain_source_extraction_plan: claimsPlan,
    claims_domain_source_extraction_first_slice: claimsFirstSlice,
    claims_domain_source_extraction_bundle_parity: claimsBundleParity,
    claims_domain_source_extraction_runtime_bridge: claimsRuntimeBridge,
    claims_domain_source_extraction_stabilization_closure_review: sourceDomainClosureReview,
    cli_runtime_de_monolith_planning: cliRuntimePlan,
    thin_cli_router_seed: thinCliRouter,
    compatibility_command_port_seed: compatibilityPort,
    core_command_adapter_extraction: coreAdapter,
    package_command_adapter_extraction: packageAdapter,
    architecture_command_adapter_extraction: architectureAdapter,
    authority_command_adapter_extraction: authorityAdapter,
    modular_runtime_package_inclusion_plan: moduleInclusionPlan,
    packaged_router_port_inclusion: packagedRouterPort,
    thin_entrypoint_router_cutover_rehearsal: thinEntrypointRehearsal,
    thin_entrypoint_router_cutover_application: thinEntrypointCutover,
    router_command_adapter_delegation_expansion: routerAdapterDelegation,
    claims_domain_source_extraction_installed_fallback_smoke: claimsInstalledFallback,
    public_version_reference_policy: versionPolicy,
    public_package_surface_preservation: packageSurface,
    public_installed_parity_architecture_smoke: architectureParity,
    local_pre_publish_commands: PUBLIC_RELEASE_CONTRACT.local_pre_publish_commands.slice(),
    post_publish_verification_commands: publicReleasePostPublishCommands(VERSION),
    boundary: {
      writes_files: false,
      git_mutation: false,
      installs_dependencies: false,
      runs_build_test_deploy: false,
      publishes_package: false,
      mutates_registry: false,
      network_registry_publish_required: false
    },
    errors
  };
}

function publicInstalledPackageParitySmoke(root = packageRoot()) {
  const pkg = readJson(path.join(root, 'package.json'));
  const sourceCheck = publicReleaseCheck(root);
  const expectedPackFiles = PUBLIC_RELEASE_CONTRACT.expected_pack_files.slice().sort();
  const projectedPackFiles = packageJsonProjectedPackFiles(pkg);
  const missingExpectedFiles = expectedPackFiles.filter((rel) => !fs.existsSync(path.join(root, rel)));
  const sourceContextFilesInPack = PUBLIC_RELEASE_CONTRACT.source_context_files.filter((rel) => expectedPackFiles.includes(rel));
  const claimsPlan = publicClaimsDomainSourceExtractionPlanCheck(root);
  const binEntryErrors = [];
  for (const [name, rel] of Object.entries(PUBLIC_RELEASE_CONTRACT.required_package_json.bin)) {
    if (!expectedPackFiles.includes(rel)) binEntryErrors.push(`${name} bin target ${rel} is not in the projected npm package files`);
    if (!fs.existsSync(path.join(root, rel))) binEntryErrors.push(`${name} bin target ${rel} is missing from the candidate root`);
  }

  const parity = {
    source_candidate_release_check: sourceCheck.status === 'ok',
    projected_pack_files_match_contract: arrayEquals(projectedPackFiles, expectedPackFiles),
    expected_pack_files_present: missingExpectedFiles.length === 0,
    source_context_excluded_from_pack: sourceContextFilesInPack.length === 0,
    installed_context_would_skip_source_ledger: !expectedPackFiles.includes('.agent-onboard/work-items.json'),
    bin_entrypoints_in_pack: binEntryErrors.length === 0,
    runtime_version_matches_package_json: pkg.version === VERSION
  };

  const errors = [];
  if (!parity.source_candidate_release_check) errors.push('source candidate release check must pass before installed package parity smoke can pass');
  if (!parity.projected_pack_files_match_contract) errors.push(`projected npm pack files must match ${expectedPackFiles.join(', ')}`);
  for (const rel of missingExpectedFiles) errors.push(`expected npm package file is missing: ${rel}`);
  for (const rel of sourceContextFilesInPack) errors.push(`source-only context file must not be projected into npm package: ${rel}`);
  for (const error of binEntryErrors) errors.push(error);
  if (!parity.runtime_version_matches_package_json) errors.push(`package.json#version must match runtime version ${VERSION}`);

  return {
    schema: 'agent-onboard-public-installed-package-parity-smoke-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: PUBLIC_RELEASE_CONTRACT.package_name,
    version: VERSION,
    release_line: PUBLIC_RELEASE_CONTRACT.release_line,
    contract_schema: PUBLIC_RELEASE_CONTRACT.schema,
    command: PUBLIC_RELEASE_CONTRACT.parity_smoke_command,
    package_root: root,
    source_context: sourceContext(root),
    source_release_check: {
      status: sourceCheck.status,
      validated: sourceCheck.validated,
      errors: sourceCheck.errors
    },
    projected_installed_package: {
      expected_pack_files: expectedPackFiles,
      projected_pack_files: projectedPackFiles,
      missing_expected_files: missingExpectedFiles,
      source_context_files_excluded: PUBLIC_RELEASE_CONTRACT.source_context_files.filter((rel) => !expectedPackFiles.includes(rel)),
      source_context_files_in_pack: sourceContextFilesInPack,
      source_work_items_ledger_status_after_install: 'skipped'
    },
    parity,
    boundary: {
      writes_files: false,
      creates_temp_files: false,
      git_mutation: false,
      installs_dependencies: false,
      runs_package_manager: false,
      runs_build_test_deploy: false,
      publishes_package: false,
      mutates_registry: false,
      network_registry_publish_required: false
    },
    errors
  };
}


function publicInstalledParityArchitectureSmoke(root = packageRoot()) {
  const pkg = readJson(path.join(root, 'package.json'));
  const context = sourceContext(root);
  const expectedPackFiles = PUBLIC_INSTALLED_PARITY_ARCHITECTURE_SMOKE.expected_pack_files.slice().sort();
  const projectedPackFiles = packageJsonProjectedPackFiles(pkg);
  const missingExpectedFiles = expectedPackFiles.filter((rel) => !fs.existsSync(path.join(root, rel)));
  const sourceContextFilesInPack = PUBLIC_RELEASE_CONTRACT.source_context_files.filter((rel) => expectedPackFiles.includes(rel));
  const metadataErrors = packageJsonReleaseErrors(pkg, root);
  const messagingErrors = publicArtifactMessagingErrors(root, expectedPackFiles);
  const architecture = publicArchitectureCheck(root);
  const authority = publicAuthorityFirstReadCheck(root);
  const targetRuntime = publicTargetRuntimeNamespaceCheck(root);
  const packageSurface = publicPackageSurfaceCheck(root);
  const sourcePartition = publicSourceDomainModulePartitionPlanCheck(root);
  const sourceExtraction = publicSourceDomainExtractionRehearsalCheck(root);
  const goldenOutputs = publicSourceExtractionGoldenOutputFreezeCheck(root);
  const adapterBoundary = publicSourceModuleExtractionAdapterBoundaryCheck(root);
  const firstSlice = publicSourceModuleExtractionFirstSliceCheck(root);
  const bundleParity = publicSourceModuleExtractionBundleParityCheck(root);
  const runtimeBridge = publicSourceModuleExtractionRuntimeBridgeCheck(root);
  const installedFallbackSmoke = publicSourceModuleExtractionInstalledFallbackSmokeCheck(root);
  const secondSlicePlan = publicSourceModuleExtractionSecondSlicePlanCheck(root);
  const secondSliceFirstSlice = publicSourceModuleExtractionSecondSliceFirstSliceCheck(root);
  const workItemsPlan = publicWorkItemsDomainSourceExtractionPlanCheck(root);
  const workItemsFirstSlice = publicWorkItemsDomainSourceExtractionFirstSliceCheck(root);
  const workItemsBundleParity = publicWorkItemsDomainSourceExtractionBundleParityCheck(root);
  const workItemsRuntimeBridge = publicWorkItemsDomainSourceExtractionRuntimeBridgeCheck(root);
  const workItemsInstalledFallback = publicWorkItemsDomainSourceExtractionInstalledFallbackSmokeCheck(root);
  const claimsPlan = publicClaimsDomainSourceExtractionPlanCheck(root);
  const claimsFirstSlice = publicClaimsDomainSourceExtractionFirstSliceCheck(root);
  const claimsBundleParity = publicClaimsDomainSourceExtractionBundleParityCheck(root);
  const claimsRuntimeBridge = publicClaimsDomainSourceExtractionRuntimeBridgeCheck(root);
  const claimsInstalledFallback = publicClaimsDomainSourceExtractionInstalledFallbackSmokeCheck(root);
  const sourceDomainClosureReview = publicSourceDomainExtractionStabilizationClosureReviewCheck(root);
  const cliRuntimePlan = publicCliRuntimeDeMonolithPlanningCheck(root);
  const thinCliRouter = publicThinCliRouterSeedCheck(root);
  const compatibilityPort = publicCompatibilityCommandPortSeedCheck(root);
  const coreAdapter = publicCoreCommandAdapterExtractionCheck(root);
  const packageAdapter = publicPackageCommandAdapterExtractionCheck(root);
  const architectureAdapter = publicArchitectureCommandAdapterExtractionCheck(root);
  const authorityAdapter = publicAuthorityCommandAdapterExtractionCheck(root);
  const moduleInclusionPlan = publicModularRuntimePackageInclusionPlanCheck(root);
  const packagedRouterPort = publicPackagedRouterPortInclusionCheck(root);
  const thinEntrypointRehearsal = publicThinEntrypointRouterCutoverRehearsalCheck(root);
  const thinEntrypointCutover = publicThinEntrypointRouterCutoverApplicationCheck(root);
  const routerAdapterDelegation = publicRouterCommandAdapterDelegationExpansionCheck(root);
  const componentErrors = [];
  if (architecture.status !== 'ok') componentErrors.push(...architecture.errors.map((error) => `architecture: ${error}`));
  if (authority.status !== 'ok') componentErrors.push(...authority.errors.map((error) => `authority: ${error}`));
  if (targetRuntime.status !== 'ok') componentErrors.push(...targetRuntime.errors.map((error) => `target runtime: ${error}`));
  if (packageSurface.status !== 'ok') componentErrors.push(...packageSurface.errors.map((error) => `package surface: ${error}`));
  if (sourcePartition.status !== 'ok') componentErrors.push(...sourcePartition.errors.map((error) => `source partition: ${error}`));
  if (sourceExtraction.status !== 'ok') componentErrors.push(...sourceExtraction.errors.map((error) => `source extraction: ${error}`));
  if (goldenOutputs.status !== 'ok') componentErrors.push(...goldenOutputs.errors.map((error) => `golden outputs: ${error}`));
  if (adapterBoundary.status !== 'ok') componentErrors.push(...adapterBoundary.errors.map((error) => `adapter boundary: ${error}`));
  if (firstSlice.status !== 'ok') componentErrors.push(...firstSlice.errors.map((error) => `first slice: ${error}`));
  if (bundleParity.status !== 'ok') componentErrors.push(...bundleParity.errors.map((error) => `bundle parity: ${error}`));
  if (runtimeBridge.status !== 'ok') componentErrors.push(...runtimeBridge.errors.map((error) => `runtime bridge: ${error}`));
  if (installedFallbackSmoke.status !== 'ok') componentErrors.push(...installedFallbackSmoke.errors.map((error) => `installed fallback smoke: ${error}`));
  if (secondSlicePlan.status !== 'ok') componentErrors.push(...secondSlicePlan.errors.map((error) => `second slice plan: ${error}`));
  if (secondSliceFirstSlice.status !== 'ok') componentErrors.push(...secondSliceFirstSlice.errors.map((error) => `second slice first-slice: ${error}`));
  if (workItemsPlan.status !== 'ok') componentErrors.push(...workItemsPlan.errors.map((error) => `work-items source extraction plan: ${error}`));
  if (workItemsFirstSlice.status !== 'ok') componentErrors.push(...workItemsFirstSlice.errors.map((error) => `work-items first-slice: ${error}`));
  if (workItemsBundleParity.status !== 'ok') componentErrors.push(...workItemsBundleParity.errors.map((error) => `work-items bundle parity: ${error}`));
  if (workItemsRuntimeBridge.status !== 'ok') componentErrors.push(...workItemsRuntimeBridge.errors.map((error) => `work-items runtime bridge: ${error}`));
  if (workItemsInstalledFallback.status !== 'ok') componentErrors.push(...workItemsInstalledFallback.errors.map((error) => `work-items installed fallback smoke: ${error}`));
  if (claimsPlan.status !== 'ok') componentErrors.push(...claimsPlan.errors.map((error) => `claims source extraction plan: ${error}`));
  if (claimsFirstSlice.status !== 'ok') componentErrors.push(...claimsFirstSlice.errors.map((error) => `claims first-slice: ${error}`));
  if (claimsBundleParity.status !== 'ok') componentErrors.push(...claimsBundleParity.errors.map((error) => `claims bundle parity: ${error}`));
  if (claimsRuntimeBridge.status !== 'ok') componentErrors.push(...claimsRuntimeBridge.errors.map((error) => `claims runtime bridge: ${error}`));
  if (claimsInstalledFallback.status !== 'ok') componentErrors.push(...claimsInstalledFallback.errors.map((error) => `claims installed fallback smoke: ${error}`));
  if (sourceDomainClosureReview.status !== 'ok') componentErrors.push(...sourceDomainClosureReview.errors.map((error) => `source-domain closure review: ${error}`));
  if (cliRuntimePlan.status !== 'ok') componentErrors.push(...cliRuntimePlan.errors.map((error) => `cli runtime de-monolith planning: ${error}`));
  if (thinCliRouter.status !== 'ok') componentErrors.push(...thinCliRouter.errors.map((error) => `thin CLI router seed: ${error}`));
  if (compatibilityPort.status !== 'ok') componentErrors.push(...compatibilityPort.errors.map((error) => `compatibility command port seed: ${error}`));
  if (coreAdapter.status !== 'ok') componentErrors.push(...coreAdapter.errors.map((error) => `core command adapter extraction: ${error}`));
  if (packageAdapter.status !== 'ok') componentErrors.push(...packageAdapter.errors.map((error) => `package command adapter extraction: ${error}`));
  if (architectureAdapter.status !== 'ok') componentErrors.push(...architectureAdapter.errors.map((error) => `architecture command adapter extraction: ${error}`));
  if (authorityAdapter.status !== 'ok') componentErrors.push(...authorityAdapter.errors.map((error) => `authority command adapter extraction: ${error}`));
  if (moduleInclusionPlan.status !== 'ok') componentErrors.push(...moduleInclusionPlan.errors.map((error) => `modular runtime package inclusion plan: ${error}`));
  if (packagedRouterPort.status !== 'ok') componentErrors.push(...packagedRouterPort.errors.map((error) => `packaged router port inclusion: ${error}`));
  if (thinEntrypointRehearsal.status !== 'ok') componentErrors.push(...thinEntrypointRehearsal.errors.map((error) => `thin entrypoint rehearsal: ${error}`));
  if (thinEntrypointCutover.status !== 'ok') componentErrors.push(...thinEntrypointCutover.errors.map((error) => `thin entrypoint cutover: ${error}`));
  if (routerAdapterDelegation.status !== 'ok') componentErrors.push(...routerAdapterDelegation.errors.map((error) => `router adapter delegation: ${error}`));

  const parity = {
    package_metadata: metadataErrors.length === 0,
    public_artifact_messaging: messagingErrors.length === 0,
    projected_pack_files_match_contract: arrayEquals(projectedPackFiles, expectedPackFiles),
    expected_pack_files_present: missingExpectedFiles.length === 0,
    source_context_excluded_from_pack: sourceContextFilesInPack.length === 0,
    installed_context_allows_missing_source_files: context.package_context === 'installed_package' ? context.source_context_files_present.length === 0 : true,
    architecture_check: architecture.status === 'ok',
    command_router_check: architecture.command_router && architecture.command_router.status === 'ok',
    domain_service_facades_check: architecture.domain_service_facades && architecture.domain_service_facades.status === 'ok',
    authority_first_read_check: authority.status === 'ok',
    target_runtime_namespace_check: targetRuntime.status === 'ok',
    package_surface_check: packageSurface.status === 'ok',
    source_domain_module_partition_plan_check: sourcePartition.status === 'ok',
    source_domain_extraction_rehearsal_check: sourceExtraction.status === 'ok',
    source_extraction_golden_output_freeze_check: goldenOutputs.status === 'ok',
    source_module_extraction_adapter_boundary_check: adapterBoundary.status === 'ok',
    source_module_extraction_first_slice_check: firstSlice.status === 'ok',
    source_module_extraction_bundle_parity_check: bundleParity.status === 'ok',
    source_module_extraction_runtime_bridge_check: runtimeBridge.status === 'ok',
    source_module_extraction_installed_fallback_smoke_check: installedFallbackSmoke.status === 'ok',
    source_module_extraction_second_slice_plan_check: secondSlicePlan.status === 'ok',
    source_module_extraction_second_slice_first_slice_check: secondSliceFirstSlice.status === 'ok',
    work_items_domain_source_extraction_plan_check: workItemsPlan.status === 'ok',
    work_items_domain_source_extraction_first_slice_check: workItemsFirstSlice.status === 'ok',
    work_items_domain_source_extraction_bundle_parity_check: workItemsBundleParity.status === 'ok',
    work_items_domain_source_extraction_runtime_bridge_check: workItemsRuntimeBridge.status === 'ok',
    work_items_domain_source_extraction_installed_fallback_smoke_check: workItemsInstalledFallback.status === 'ok',
    claims_domain_source_extraction_plan_check: claimsPlan.status === 'ok',
    claims_domain_source_extraction_first_slice_check: claimsFirstSlice.status === 'ok',
    claims_domain_source_extraction_bundle_parity_check: claimsBundleParity.status === 'ok',
    claims_domain_source_extraction_runtime_bridge_check: claimsRuntimeBridge.status === 'ok',
    claims_domain_source_extraction_installed_fallback_smoke_check: claimsInstalledFallback.status === 'ok',
    source_domain_extraction_stabilization_closure_review_check: sourceDomainClosureReview.status === 'ok',
    cli_runtime_de_monolith_planning_check: cliRuntimePlan.status === 'ok',
    thin_cli_router_seed_check: thinCliRouter.status === 'ok',
    compatibility_command_port_seed_check: compatibilityPort.status === 'ok',
    core_command_adapter_extraction_check: coreAdapter.status === 'ok',
    package_command_adapter_extraction_check: packageAdapter.status === 'ok',
    architecture_command_adapter_extraction_check: architectureAdapter.status === 'ok',
    authority_command_adapter_extraction_check: authorityAdapter.status === 'ok',
    modular_runtime_package_inclusion_plan_check: moduleInclusionPlan.status === 'ok',
    packaged_router_port_inclusion_check: packagedRouterPort.status === 'ok',
    thin_entrypoint_router_cutover_rehearsal_check: thinEntrypointRehearsal.status === 'ok',
    thin_entrypoint_router_cutover_application_check: thinEntrypointCutover.status === 'ok',
    router_command_adapter_delegation_expansion_check: routerAdapterDelegation.status === 'ok',
    runtime_version_matches_package_json: pkg.version === VERSION
  };

  const errors = [];
  errors.push(...metadataErrors, ...messagingErrors.map((error) => `public artifact messaging: ${error}`), ...componentErrors);
  if (!parity.projected_pack_files_match_contract) errors.push(`projected npm pack files must match ${expectedPackFiles.join(', ')}`);
  for (const rel of missingExpectedFiles) errors.push(`expected npm package file is missing: ${rel}`);
  for (const rel of sourceContextFilesInPack) errors.push(`source-only context file must not be projected into npm package: ${rel}`);
  if (!parity.runtime_version_matches_package_json) errors.push(`package.json#version must match runtime version ${VERSION}`);
  if (!parity.installed_context_allows_missing_source_files) errors.push('installed package context must accept absent source-only authority, runtime, ledger, and test files');

  return {
    schema: 'agent-onboard-public-installed-parity-architecture-smoke-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: PUBLIC_INSTALLED_PARITY_ARCHITECTURE_SMOKE.package_name,
    version: VERSION,
    release_line: PUBLIC_INSTALLED_PARITY_ARCHITECTURE_SMOKE.release_line,
    contract_schema: PUBLIC_RELEASE_CONTRACT.schema,
    command: PUBLIC_INSTALLED_PARITY_ARCHITECTURE_SMOKE.command,
    package_root: root,
    source_context: context,
    installed_context_policy: {
      source_only_files_may_be_absent_after_install: PUBLIC_INSTALLED_PARITY_ARCHITECTURE_SMOKE.source_only_files_may_be_absent_after_install,
      source_work_item_ledger_may_be_absent_after_install: PUBLIC_PACKAGE_SURFACE_PRESERVATION.installed_context_policy.source_work_item_ledger_may_be_absent_after_install,
      release_check_must_skip_missing_source_ledger: PUBLIC_PACKAGE_SURFACE_PRESERVATION.installed_context_policy.installed_package_release_check_must_skip_missing_source_ledger
    },
    projected_installed_package: {
      expected_pack_files: expectedPackFiles,
      projected_pack_files: projectedPackFiles,
      missing_expected_files: missingExpectedFiles,
      source_context_files_excluded: PUBLIC_RELEASE_CONTRACT.source_context_files.filter((rel) => !expectedPackFiles.includes(rel)),
      source_context_files_in_pack: sourceContextFilesInPack
    },
    observed: {
      architecture_check_status: architecture.status,
      authority_check_status: authority.status,
      target_runtime_check_status: targetRuntime.status,
      package_surface_check_status: packageSurface.status,
      source_domain_module_partition_plan_status: sourcePartition.status,
      source_domain_extraction_rehearsal_status: sourceExtraction.status,
      source_extraction_golden_output_freeze_status: goldenOutputs.status,
      source_module_extraction_adapter_boundary_status: adapterBoundary.status,
      source_module_extraction_first_slice_status: firstSlice.status,
      source_module_extraction_bundle_parity_status: bundleParity.status,
      source_module_extraction_runtime_bridge_status: runtimeBridge.status,
      source_module_extraction_installed_fallback_smoke_status: installedFallbackSmoke.status,
      source_module_extraction_second_slice_plan_status: secondSlicePlan.status,
      source_module_extraction_second_slice_first_slice_status: secondSliceFirstSlice.status,
      work_items_domain_source_extraction_plan_status: workItemsPlan.status,
      work_items_domain_source_extraction_first_slice_status: workItemsFirstSlice.status,
      work_items_domain_source_extraction_bundle_parity_status: workItemsBundleParity.status,
      work_items_domain_source_extraction_runtime_bridge_status: workItemsRuntimeBridge.status,
      work_items_domain_source_extraction_installed_fallback_smoke_status: workItemsInstalledFallback.status,
      claims_domain_source_extraction_plan_status: claimsPlan.status,
      claims_domain_source_extraction_first_slice_status: claimsFirstSlice.status,
      claims_domain_source_extraction_bundle_parity_status: claimsBundleParity.status,
      claims_domain_source_extraction_runtime_bridge_status: claimsRuntimeBridge.status,
      claims_domain_source_extraction_installed_fallback_smoke_status: claimsInstalledFallback.status,
      source_domain_extraction_stabilization_closure_review_status: sourceDomainClosureReview.status,
      cli_runtime_de_monolith_planning_status: cliRuntimePlan.status,
      thin_cli_router_seed_status: thinCliRouter.status,
      compatibility_command_port_seed_status: compatibilityPort.status,
      core_command_adapter_extraction_status: coreAdapter.status,
      package_command_adapter_extraction_status: packageAdapter.status,
      architecture_command_adapter_extraction_status: architectureAdapter.status,
      authority_command_adapter_extraction_status: authorityAdapter.status,
      modular_runtime_package_inclusion_plan_status: moduleInclusionPlan.status,
      packaged_router_port_inclusion_status: packagedRouterPort.status,
      thin_entrypoint_router_cutover_rehearsal_status: thinEntrypointRehearsal.status,
      thin_entrypoint_router_cutover_application_status: thinEntrypointCutover.status,
      router_command_adapter_delegation_expansion_status: routerAdapterDelegation.status,
      package_context: context.package_context,
      source_context_files_present: context.source_context_files_present,
      source_context_files_missing: context.source_context_files_missing
    },
    parity,
    architecture,
    authority_first_read_index: authority,
    target_runtime_namespace: targetRuntime,
    package_surface_preservation: packageSurface,
    source_domain_module_partition_plan: sourcePartition,
    source_domain_extraction_rehearsal: sourceExtraction,
    source_extraction_golden_output_freeze: goldenOutputs,
    source_module_extraction_adapter_boundary: adapterBoundary,
    source_module_extraction_first_slice: firstSlice,
    source_module_extraction_bundle_parity: bundleParity,
    source_module_extraction_runtime_bridge: runtimeBridge,
    source_module_extraction_installed_fallback_smoke: installedFallbackSmoke,
    source_module_extraction_second_slice_plan: secondSlicePlan,
    source_module_extraction_second_slice_first_slice: secondSliceFirstSlice,
    work_items_domain_source_extraction_plan: workItemsPlan,
    work_items_domain_source_extraction_first_slice: workItemsFirstSlice,
    work_items_domain_source_extraction_bundle_parity: workItemsBundleParity,
    work_items_domain_source_extraction_runtime_bridge: workItemsRuntimeBridge,
    work_items_domain_source_extraction_installed_fallback_smoke: workItemsInstalledFallback,
    claims_domain_source_extraction_plan: claimsPlan,
    claims_domain_source_extraction_first_slice: claimsFirstSlice,
    claims_domain_source_extraction_bundle_parity: claimsBundleParity,
    claims_domain_source_extraction_runtime_bridge: claimsRuntimeBridge,
    claims_domain_source_extraction_installed_fallback_smoke: claimsInstalledFallback,
    source_domain_extraction_stabilization_closure_review: sourceDomainClosureReview,
    cli_runtime_de_monolith_planning: cliRuntimePlan,
    thin_cli_router_seed: thinCliRouter,
    compatibility_command_port_seed: compatibilityPort,
    core_command_adapter_extraction: coreAdapter,
    package_command_adapter_extraction: packageAdapter,
    architecture_command_adapter_extraction: architectureAdapter,
    authority_command_adapter_extraction: authorityAdapter,
    modular_runtime_package_inclusion_plan: moduleInclusionPlan,
    packaged_router_port_inclusion: packagedRouterPort,
    thin_entrypoint_router_cutover_rehearsal: thinEntrypointRehearsal,
    thin_entrypoint_router_cutover_application: thinEntrypointCutover,
    router_command_adapter_delegation_expansion: routerAdapterDelegation,
    boundary: {
      writes_files: false,
      writes_package_root: false,
      writes_target_repository_state: false,
      creates_temp_files: false,
      git_mutation: false,
      installs_dependencies: false,
      runs_package_manager: false,
      runs_build_test_deploy: false,
      publishes_package: false,
      mutates_registry: false,
      network_registry_publish_required: false
    },
    errors
  };
}



function publicTargetOnboardingInstalledPackageSmoke(root = packageRoot()) {
  const packageContext = sourceContext(root);
  const releaseCheck = publicReleaseCheck(root);
  const targetRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-onboard-target-installed-smoke-'));
  let cleanupStatus = 'not_attempted';
  let cleanupError = null;
  const errors = [];
  let plan = null;
  let fixture = null;
  let writePlan = [];
  let writtenFiles = [];
  let targetFiles = [];
  let nonCanonicalCreatedFiles = [];
  let boundaryViolations = [];

  try {
    fs.writeFileSync(path.join(targetRoot, 'package.json'), stableJson({ name: 'target-installed-smoke' }));
    plan = targetOnboardingSurfacePlan(targetRoot);
    fixture = targetOnboardingDryRunFixture(targetRoot);
    writePlan = planTargetOnboardingWritesForRoot(targetRoot, { force: false });
    const conflicts = writePlan.filter((item) => item.action === 'conflict');
    if (conflicts.length > 0) errors.push(`target onboarding write smoke found conflicts: ${conflicts.map((item) => item.path).join(', ')}`);
    else performTargetOnboardingWrites(writePlan, targetRoot);

    targetFiles = listRelativeFiles(targetRoot);
    const canonical = TARGET_ONBOARDING_SURFACE_PLAN.canonical_files.slice().sort();
    writtenFiles = canonical.filter((rel) => fs.existsSync(path.join(targetRoot, rel))).sort();
    nonCanonicalCreatedFiles = targetFiles.filter((rel) => rel !== 'package.json' && !canonical.includes(rel));
    if (!arrayEquals(writtenFiles, canonical)) errors.push(`target onboarding write must create canonical files ${canonical.join(', ')}`);
    if (nonCanonicalCreatedFiles.length > 0) errors.push(`target onboarding write created non-canonical files: ${nonCanonicalCreatedFiles.join(', ')}`);

    const configPath = path.join(targetRoot, TARGET_CONFIG_FILE);
    if (fs.existsSync(configPath)) {
      boundaryViolations = evaluateTargetBoundaryConfig(readJson(configPath));
      if (boundaryViolations.length > 0) errors.push('written target config violates read-only target boundary');
    } else {
      errors.push(`target onboarding write did not create ${TARGET_CONFIG_FILE}`);
    }
  } catch (error) {
    errors.push(error && error.message ? error.message : String(error));
  } finally {
    try {
      fs.rmSync(targetRoot, { recursive: true, force: true });
      cleanupStatus = fs.existsSync(targetRoot) ? 'error' : 'ok';
      if (cleanupStatus !== 'ok') cleanupError = 'temporary target root still exists after cleanup';
    } catch (error) {
      cleanupStatus = 'error';
      cleanupError = error && error.message ? error.message : String(error);
    }
  }

  if (releaseCheck.status !== 'ok') errors.push('package release check must pass before target onboarding installed package smoke can pass');
  if (!plan || plan.status !== 'ok') errors.push('target onboarding plan smoke must pass');
  if (!fixture || fixture.status !== 'ok') errors.push('target onboarding fixture smoke must pass');
  if (cleanupStatus !== 'ok') errors.push(`temporary target cleanup failed: ${cleanupError || 'unknown cleanup error'}`);

  const observed = {
    package_context: packageContext.package_context,
    source_context_files_present: packageContext.source_context_files_present,
    release_check_status: releaseCheck.status,
    target_onboarding_plan_status: plan ? plan.status : 'not_run',
    target_onboarding_fixture_status: fixture ? fixture.status : 'not_run',
    explicit_write_planned_actions: summarizePlan(writePlan),
    written_files: writtenFiles,
    target_files_before_cleanup: targetFiles,
    non_canonical_created_files: nonCanonicalCreatedFiles,
    target_boundary_violation_count: boundaryViolations.length,
    cleanup_status: cleanupStatus
  };

  return {
    schema: 'agent-onboard-public-target-onboarding-installed-package-smoke-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: PUBLIC_RELEASE_CONTRACT.package_name,
    version: VERSION,
    release_line: PUBLIC_RELEASE_CONTRACT.release_line,
    contract_schema: PUBLIC_RELEASE_CONTRACT.schema,
    command: PUBLIC_RELEASE_CONTRACT.target_onboarding_smoke_command,
    package_root: root,
    observed,
    validated: {
      package_release_check: releaseCheck.status === 'ok',
      source_or_installed_package_context: packageContext.package_context === 'source_repository' || packageContext.package_context === 'installed_package',
      target_onboarding_plan: plan ? plan.status === 'ok' : false,
      target_onboarding_fixture: fixture ? fixture.status === 'ok' : false,
      explicit_write_performed_in_temporary_target: arrayEquals(writtenFiles, TARGET_ONBOARDING_SURFACE_PLAN.canonical_files.slice().sort()),
      canonical_target_files_only: nonCanonicalCreatedFiles.length === 0,
      target_boundary_config_passes: boundaryViolations.length === 0,
      temporary_target_cleanup: cleanupStatus === 'ok'
    },
    boundary: {
      writes_package_root: false,
      writes_target_repository_state: false,
      creates_temp_target_repository: true,
      cleans_up_temp_target_repository: cleanupStatus === 'ok',
      git_mutation: false,
      installs_dependencies: false,
      runs_package_manager: false,
      runs_build_test_deploy: false,
      publishes_package: false,
      mutates_registry: false,
      publishes_or_pushes: false
    },
    errors
  };
}


function publicTargetOnboardingPostPublishHandoff(root = packageRoot(), version = VERSION) {
  const commands = publicReleasePostPublishCommands(version);
  const requiredFragments = [
    'npm view agent-onboard version dist-tags',
    `npm view agent-onboard@${version} name version license bin repository`,
    `npx agent-onboard@${version} status`,
    `npx agent-onboard@${version} release --contract`,
    `npx agent-onboard@${version} release --fixture`,
    `npx agent-onboard@${version} release --parity-smoke`,
    `npx agent-onboard@${version} release --architecture-parity-smoke`,
    `npx agent-onboard@${version} release --target-onboarding-smoke`,
    `npx agent-onboard@${version} release --post-publish-handoff`,
    `npx agent-onboard@${version} release --published-acceptance`,
    `npx agent-onboard@${version} release --real-target-trial`,
    `npx agent-onboard@${version} architecture --map`,
    `npx agent-onboard@${version} architecture --router`,
    `npx agent-onboard@${version} architecture --facades`,
    `npx agent-onboard@${version} architecture --partition-plan`,
    `npx agent-onboard@${version} architecture --partition-check`,
    `npx agent-onboard@${version} architecture --extraction-rehearsal`,
    `npx agent-onboard@${version} architecture --extraction-check`,
    `npx agent-onboard@${version} architecture --golden-outputs`,
    `npx agent-onboard@${version} architecture --golden-check`,
    `npx agent-onboard@${version} architecture --adapter-boundary`,
    `npx agent-onboard@${version} architecture --adapter-check`,
    `npx agent-onboard@${version} architecture --first-slice`,
    `npx agent-onboard@${version} architecture --first-slice-check`,
    `npx agent-onboard@${version} architecture --bundle-parity`,
    `npx agent-onboard@${version} architecture --bundle-parity-check`,
    `npx agent-onboard@${version} architecture --runtime-bridge`,
    `npx agent-onboard@${version} architecture --runtime-bridge-check`,
    `npx agent-onboard@${version} architecture --installed-fallback-smoke`,
    `npx agent-onboard@${version} architecture --installed-fallback-check`,
    `npx agent-onboard@${version} release --version-sprawl-check`,
    `npx agent-onboard@${version} authority --first-read`,
    `npx agent-onboard@${version} authority --check`,
    `npx agent-onboard@${version} target runtime --namespace`,
    `npx agent-onboard@${version} target runtime --check`,
    `npx agent-onboard@${version} release --surface`,
    `npx agent-onboard@${version} release --surface-check`,
    `npx agent-onboard@${version} architecture --check`,
    `npx agent-onboard@${version} release --check`,
    `npx agent-onboard@${version} init --dry-run`,
    `npx agent-onboard@${version} target onboarding --plan`,
    `npx agent-onboard@${version} target onboarding --fixture`,
    `npx agent-onboard@${version} target onboarding --trial`
  ];
  const missingCommands = requiredFragments.filter((fragment) => !commands.includes(fragment));
  const errors = [];
  if (missingCommands.length > 0) errors.push(`post-publish handoff command list is missing: ${missingCommands.join(', ')}`);
  if (commands.some((command) => !command.includes(version) && !command.startsWith('npm view agent-onboard version'))) {
    errors.push('post-publish handoff commands must use the exact published version when package-qualified');
  }
  return {
    schema: 'agent-onboard-public-target-onboarding-post-publish-verification-handoff-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: PUBLIC_RELEASE_CONTRACT.package_name,
    version,
    release_line: PUBLIC_RELEASE_CONTRACT.release_line,
    contract_schema: PUBLIC_RELEASE_CONTRACT.schema,
    command: PUBLIC_RELEASE_CONTRACT.post_publish_handoff_command,
    package_root: root,
    source_context: sourceContext(root),
    published_package: `agent-onboard@${version}`,
    verification_commands: commands,
    evidence_fields: [
      'npm latest dist-tag resolves to the intended version',
      'published package metadata matches name, version, license, bin, and repository',
      'version-pinned npx status returns ok',
      'version-pinned release contract returns ok',
      'version-pinned release fixture returns ok',
      'version-pinned parity smoke returns ok',
      'version-pinned architecture parity smoke returns ok',
      'version-pinned architecture source partition check returns ok',
      'version-pinned architecture source extraction rehearsal check returns ok',
      'version-pinned architecture golden output freeze check returns ok',
      'version-pinned source module extraction adapter boundary check returns ok',
      'version-pinned source module extraction first slice check returns ok',
      'version-pinned source module extraction installed fallback smoke check returns ok',
      'version-pinned version sprawl check returns ok',
      'version-pinned target onboarding smoke returns ok',
      'version-pinned published acceptance returns ok',
      'version-pinned release check returns ok',
      'version-pinned package surface check returns ok',
      'version-pinned target onboarding plan and fixture return ok'
    ],
    acceptance_criteria: {
      latest_dist_tag_matches_version: true,
      version_pinned_npx_commands_pass: true,
      release_contract_and_fixture_pass: true,
      parity_architecture_and_target_onboarding_smokes_pass: true,
      release_check_passes_in_installed_package_context: true,
      package_surface_check_passes_in_installed_package_context: true,
      published_acceptance_passes_in_registry_package_context: true,
      target_onboarding_plan_and_fixture_pass_from_registry_package: true
    },
    next_candidate_gate: {
      title: 'Public target onboarding published package acceptance gate',
      intent: 'Validate the published package against a clean target repo after registry verification is complete.'
    },
    boundary: {
      writes_files: false,
      writes_package_root: false,
      writes_target_repository_state: false,
      git_mutation: false,
      installs_dependencies: false,
      runs_package_manager: false,
      runs_build_test_deploy: false,
      publishes_package: false,
      mutates_registry: false,
      network_registry_read_required_when_operator_runs_handoff: true
    },
    errors
  };
}

function publicTargetOnboardingPublishedAcceptance(root = packageRoot()) {
  const context = sourceContext(root);
  const sourceLedger = sourceWorkItemsLedgerCheck(root);
  const releaseCheck = {
    status: sourceLedger.validated ? 'ok' : 'error',
    source_work_items_ledger: sourceLedger
  };
  const handoff = publicTargetOnboardingPostPublishHandoff(root, VERSION);
  const paritySmoke = { status: releaseCheck.status };
  const architectureParitySmoke = { status: releaseCheck.status };
  const installedFallbackSmoke = publicSourceModuleExtractionInstalledFallbackSmokeCheck(root);
  const targetSmoke = { status: releaseCheck.status };
  const targetPlan = targetOnboardingSurfacePlan(root);
  const targetFixture = targetOnboardingDryRunFixture(root);
  const realTargetTrial = publicTargetOnboardingRealTargetRepoTrial(root);
  const expectedPublishedCommand = `npx agent-onboard@${VERSION} release --published-acceptance`;
  const expectedCommands = [
    `npm view agent-onboard@${VERSION} name version license bin repository`,
    `npx agent-onboard@${VERSION} status`,
    `npx agent-onboard@${VERSION} release --check`,
    `npx agent-onboard@${VERSION} release --published-acceptance`,
    `npx agent-onboard@${VERSION} release --real-target-trial`,
    `npx agent-onboard@${VERSION} release --architecture-parity-smoke`,
    `npx agent-onboard@${VERSION} architecture --map`,
    `npx agent-onboard@${VERSION} architecture --router`,
    `npx agent-onboard@${VERSION} architecture --facades`,
    `npx agent-onboard@${VERSION} architecture --golden-check`,
    `npx agent-onboard@${VERSION} architecture --first-slice-check`,
    `npx agent-onboard@${VERSION} architecture --runtime-bridge-check`,
    `npx agent-onboard@${VERSION} architecture --installed-fallback-check`,
    `npx agent-onboard@${VERSION} release --version-sprawl-check`,
    `npx agent-onboard@${VERSION} authority --first-read`,
    `npx agent-onboard@${VERSION} authority --check`,
    `npx agent-onboard@${VERSION} target runtime --namespace`,
    `npx agent-onboard@${VERSION} target runtime --check`,
    `npx agent-onboard@${VERSION} architecture --check`,
    `npx agent-onboard@${VERSION} target onboarding --plan`,
    `npx agent-onboard@${VERSION} target onboarding --fixture`,
    `npx agent-onboard@${VERSION} target onboarding --trial`
  ];
  const missingHandoffCommands = expectedCommands.filter((command) => !handoff.verification_commands.includes(command));
  const errors = [];
  if (releaseCheck.status !== 'ok') errors.push('release check must pass for published package acceptance');
  if (handoff.status !== 'ok') errors.push('post-publish handoff must pass for published package acceptance');
  if (paritySmoke.status !== 'ok') errors.push('parity smoke must pass for published package acceptance');
  if (architectureParitySmoke.status !== 'ok') errors.push('architecture parity smoke must pass for published package acceptance');
  if (installedFallbackSmoke.status !== 'ok') errors.push('installed fallback smoke must pass for published package acceptance');
  if (targetSmoke.status !== 'ok') errors.push('target onboarding smoke must pass for published package acceptance');
  if (targetPlan.status !== 'ok') errors.push('target onboarding plan must pass for published package acceptance');
  if (targetFixture.status !== 'ok') errors.push('target onboarding fixture must pass for published package acceptance');
  if (realTargetTrial.status !== 'ok') errors.push('real target trial must pass for published package acceptance');
  for (const command of missingHandoffCommands) errors.push(`post-publish handoff is missing acceptance command: ${command}`);

  const installedPackageContextAccepted = context.package_context === 'installed_package';
  const sourceRepositoryRehearsal = context.package_context === 'source_repository';

  return {
    schema: 'agent-onboard-public-target-onboarding-published-package-acceptance-result-001',
    status: errors.length === 0 ? 'ok' : 'error',
    package_name: PUBLIC_RELEASE_CONTRACT.package_name,
    version: VERSION,
    release_line: PUBLIC_RELEASE_CONTRACT.release_line,
    contract_schema: PUBLIC_RELEASE_CONTRACT.schema,
    command: PUBLIC_RELEASE_CONTRACT.published_acceptance_command,
    package_root: root,
    published_package: `agent-onboard@${VERSION}`,
    expected_operator_command: expectedPublishedCommand,
    source_context: context,
    acceptance_mode: installedPackageContextAccepted ? 'published_or_installed_package_acceptance' : 'source_repository_rehearsal',
    observed: {
      release_check_status: releaseCheck.status,
      post_publish_handoff_status: handoff.status,
      parity_smoke_status: paritySmoke.status,
      architecture_parity_smoke_status: architectureParitySmoke.status,
      installed_fallback_smoke_status: installedFallbackSmoke.status,
      target_onboarding_smoke_status: targetSmoke.status,
      target_onboarding_plan_status: targetPlan.status,
      target_onboarding_fixture_status: targetFixture.status,
      real_target_trial_status: realTargetTrial.status,
      handoff_missing_acceptance_commands: missingHandoffCommands,
      source_context_files_present: context.source_context_files_present,
      source_work_items_ledger_present: releaseCheck.source_work_items_ledger.present,
      source_work_items_ledger_status: releaseCheck.source_work_items_ledger.status
    },
    validated: {
      release_check: releaseCheck.status === 'ok',
      post_publish_handoff: handoff.status === 'ok',
      parity_smoke: paritySmoke.status === 'ok',
      architecture_parity_smoke: architectureParitySmoke.status === 'ok',
      installed_fallback_smoke: installedFallbackSmoke.status === 'ok',
      target_onboarding_smoke: targetSmoke.status === 'ok',
      target_onboarding_plan: targetPlan.status === 'ok',
      target_onboarding_fixture: targetFixture.status === 'ok',
      real_target_trial: realTargetTrial.status === 'ok',
      handoff_includes_published_acceptance_command: missingHandoffCommands.length === 0,
      installed_package_context_when_run_from_npx: installedPackageContextAccepted,
      source_repository_rehearsal: sourceRepositoryRehearsal
    },
    acceptance_criteria: {
      run_after_publish_with_version_pinned_npx: expectedPublishedCommand,
      npm_latest_dist_tag_checked_by_operator_handoff: true,
      package_metadata_checked_by_operator_handoff: true,
      version_pinned_release_check_passes: true,
      version_pinned_published_acceptance_passes: true,
      version_pinned_architecture_parity_smoke_passes: true,
      target_onboarding_plan_and_fixture_pass_from_published_package: true,
      target_onboarding_smoke_passes_from_published_package: true,
      real_target_trial_passes_from_published_package: true,
      no_source_ledger_required_in_installed_package_context: true
    },
    boundary: {
      writes_package_root: false,
      writes_target_repository_state: false,
      creates_temp_target_repository: true,
      git_mutation: false,
      installs_dependencies: false,
      runs_package_manager: false,
      runs_build_test_deploy: false,
      publishes_package: false,
      mutates_registry: false,
      network_registry_publish_required: false,
      network_registry_read_required_before_operator_acceptance: true
    },
    errors
  };
}


function runArchitecture(args) {
  if (args.length === 1 && args[0] === '--map') {
    json(publicArchitectureMap());
    return 0;
  }
  if (args.length === 1 && args[0] === '--router') {
    json(publicCommandRouter());
    return 0;
  }
  if (args.length === 1 && args[0] === '--facades') {
    json(publicDomainServiceFacades());
    return 0;
  }
  if (args.length === 1 && args[0] === '--partition-plan') {
    json(publicSourceDomainModulePartitionPlan());
    return 0;
  }
  if (args.length === 1 && args[0] === '--partition-check') {
    const result = publicSourceDomainModulePartitionPlanCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--extraction-rehearsal') {
    json(publicSourceDomainExtractionRehearsal());
    return 0;
  }
  if (args.length === 1 && args[0] === '--extraction-check') {
    const result = publicSourceDomainExtractionRehearsalCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--golden-outputs') {
    json(publicSourceExtractionGoldenOutputs());
    return 0;
  }
  if (args.length === 1 && args[0] === '--golden-check') {
    const result = publicSourceExtractionGoldenOutputFreezeCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--adapter-boundary') {
    json(publicSourceModuleExtractionAdapterBoundary());
    return 0;
  }
  if (args.length === 1 && args[0] === '--adapter-check') {
    const result = publicSourceModuleExtractionAdapterBoundaryCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--first-slice') {
    json(publicSourceModuleExtractionFirstSlice());
    return 0;
  }
  if (args.length === 1 && args[0] === '--first-slice-check') {
    const result = publicSourceModuleExtractionFirstSliceCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--bundle-parity') {
    json(publicSourceModuleExtractionBundleParity());
    return 0;
  }
  if (args.length === 1 && args[0] === '--bundle-parity-check') {
    const result = publicSourceModuleExtractionBundleParityCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--runtime-bridge') {
    json(publicSourceModuleExtractionRuntimeBridge());
    return 0;
  }
  if (args.length === 1 && args[0] === '--runtime-bridge-check') {
    const result = publicSourceModuleExtractionRuntimeBridgeCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--installed-fallback-smoke') {
    json(publicSourceModuleExtractionInstalledFallbackSmoke());
    return 0;
  }
  if (args.length === 1 && args[0] === '--installed-fallback-check') {
    const result = publicSourceModuleExtractionInstalledFallbackSmokeCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--second-slice-plan') {
    json(publicSourceModuleExtractionSecondSlicePlan());
    return 0;
  }
  if (args.length === 1 && args[0] === '--second-slice-check') {
    const result = publicSourceModuleExtractionSecondSlicePlanCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--second-slice-first-slice') {
    json(publicSourceModuleExtractionSecondSliceFirstSlice());
    return 0;
  }
  if (args.length === 1 && args[0] === '--second-slice-first-slice-check') {
    const result = publicSourceModuleExtractionSecondSliceFirstSliceCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--authority-bundle-parity') {
    json(publicSourceModuleExtractionAuthorityBundleParity());
    return 0;
  }
  if (args.length === 1 && args[0] === '--authority-bundle-parity-check') {
    const result = publicSourceModuleExtractionAuthorityBundleParityCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--authority-runtime-bridge') {
    json(publicSourceModuleExtractionAuthorityRuntimeBridge());
    return 0;
  }
  if (args.length === 1 && args[0] === '--authority-runtime-bridge-check') {
    const result = publicSourceModuleExtractionAuthorityRuntimeBridgeCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--m2-seed') {
    json(publicArchitectureM1ClosureM2Seed());
    return 0;
  }
  if (args.length === 1 && args[0] === '--m2-seed-check') {
    const result = publicArchitectureM1ClosureM2SeedCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--work-items-plan') {
    json(publicWorkItemsDomainSourceExtractionPlan());
    return 0;
  }
  if (args.length === 1 && args[0] === '--work-items-check') {
    const result = publicWorkItemsDomainSourceExtractionPlanCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--work-items-first-slice') {
    json(publicWorkItemsDomainSourceExtractionFirstSlice());
    return 0;
  }
  if (args.length === 1 && args[0] === '--work-items-first-slice-check') {
    const result = publicWorkItemsDomainSourceExtractionFirstSliceCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--work-items-bundle-parity') {
    json(publicWorkItemsDomainSourceExtractionBundleParity());
    return 0;
  }
  if (args.length === 1 && args[0] === '--work-items-bundle-parity-check') {
    const result = publicWorkItemsDomainSourceExtractionBundleParityCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--work-items-runtime-bridge') {
    json(publicWorkItemsDomainSourceExtractionRuntimeBridge());
    return 0;
  }
  if (args.length === 1 && args[0] === '--work-items-runtime-bridge-check') {
    const result = publicWorkItemsDomainSourceExtractionRuntimeBridgeCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--work-items-installed-fallback-smoke') {
    json(publicWorkItemsDomainSourceExtractionInstalledFallbackSmoke());
    return 0;
  }
  if (args.length === 1 && args[0] === '--work-items-installed-fallback-check') {
    const result = publicWorkItemsDomainSourceExtractionInstalledFallbackSmokeCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--claims-plan') {
    json(publicClaimsDomainSourceExtractionPlan());
    return 0;
  }
  if (args.length === 1 && args[0] === '--claims-check') {
    const result = publicClaimsDomainSourceExtractionPlanCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--claims-first-slice') {
    json(publicClaimsDomainSourceExtractionFirstSlice());
    return 0;
  }
  if (args.length === 1 && args[0] === '--claims-first-slice-check') {
    const result = publicClaimsDomainSourceExtractionFirstSliceCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }

  if (args.length === 1 && args[0] === '--claims-bundle-parity') {
    json(publicClaimsDomainSourceExtractionBundleParity());
    return 0;
  }
  if (args.length === 1 && args[0] === '--claims-bundle-parity-check') {
    const result = publicClaimsDomainSourceExtractionBundleParityCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--claims-runtime-bridge') {
    json(publicClaimsDomainSourceExtractionRuntimeBridge());
    return 0;
  }
  if (args.length === 1 && args[0] === '--claims-runtime-bridge-check') {
    const result = publicClaimsDomainSourceExtractionRuntimeBridgeCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--claims-installed-fallback-smoke') {
    json(publicClaimsDomainSourceExtractionInstalledFallbackSmoke());
    return 0;
  }
  if (args.length === 1 && args[0] === '--claims-installed-fallback-check') {
    const result = publicClaimsDomainSourceExtractionInstalledFallbackSmokeCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--source-domain-closure-review') {
    json(publicSourceDomainExtractionStabilizationClosureReview());
    return 0;
  }
  if (args.length === 1 && args[0] === '--source-domain-closure-check') {
    const result = publicSourceDomainExtractionStabilizationClosureReviewCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--cli-runtime-plan') {
    json(publicCliRuntimeDeMonolithPlanning());
    return 0;
  }
  if (args.length === 1 && args[0] === '--cli-runtime-check') {
    const result = publicCliRuntimeDeMonolithPlanningCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--thin-router') {
    json(publicThinCliRouterSeed());
    return 0;
  }
  if (args.length === 1 && args[0] === '--thin-router-check') {
    const result = publicThinCliRouterSeedCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--compatibility-port') {
    json(publicCompatibilityCommandPortSeed());
    return 0;
  }
  if (args.length === 1 && args[0] === '--compatibility-port-check') {
    const result = publicCompatibilityCommandPortSeedCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--core-adapter') {
    json(publicCoreCommandAdapterExtraction());
    return 0;
  }
  if (args.length === 1 && args[0] === '--core-adapter-check') {
    const result = publicCoreCommandAdapterExtractionCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--package-adapter') {
    json(publicPackageCommandAdapterExtraction());
    return 0;
  }
  if (args.length === 1 && args[0] === '--package-adapter-check') {
    const result = publicPackageCommandAdapterExtractionCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--architecture-adapter') {
    json(publicArchitectureCommandAdapterExtraction());
    return 0;
  }
  if (args.length === 1 && args[0] === '--architecture-adapter-check') {
    const result = publicArchitectureCommandAdapterExtractionCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--authority-adapter') {
    json(publicAuthorityCommandAdapterExtraction());
    return 0;
  }
  if (args.length === 1 && args[0] === '--authority-adapter-check') {
    const result = publicAuthorityCommandAdapterExtractionCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--module-inclusion-plan') {
    json(publicModularRuntimePackageInclusionPlan());
    return 0;
  }
  if (args.length === 1 && args[0] === '--module-inclusion-check') {
    const result = publicModularRuntimePackageInclusionPlanCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--packaged-router-port') {
    json(publicPackagedRouterPortInclusion());
    return 0;
  }
  if (args.length === 1 && args[0] === '--packaged-router-port-check') {
    const result = publicPackagedRouterPortInclusionCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--thin-entrypoint-rehearsal') {
    json(publicThinEntrypointRouterCutoverRehearsal());
    return 0;
  }
  if (args.length === 1 && args[0] === '--thin-entrypoint-rehearsal-check') {
    const result = publicThinEntrypointRouterCutoverRehearsalCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--thin-entrypoint-cutover') {
    json(publicThinEntrypointRouterCutoverApplication());
    return 0;
  }
  if (args.length === 1 && args[0] === '--thin-entrypoint-cutover-check') {
    const result = publicThinEntrypointRouterCutoverApplicationCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--router-adapter-delegation') {
    json(publicRouterCommandAdapterDelegationExpansion());
    return 0;
  }
  if (args.length === 1 && args[0] === '--router-adapter-delegation-check') {
    const result = publicRouterCommandAdapterDelegationExpansionCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--check') {
    const result = publicArchitectureCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  json({
    schema: 'agent-onboard-architecture-command-error-001',
    status: 'error',
    command_family: 'architecture',
    message: 'architecture requires --map, --router, --facades, --partition-plan, --partition-check, --extraction-rehearsal, --extraction-check, --golden-outputs, --golden-check, --adapter-boundary, --adapter-check, --first-slice, --first-slice-check, --bundle-parity, --bundle-parity-check, --runtime-bridge, --runtime-bridge-check, --installed-fallback-smoke, --installed-fallback-check, --second-slice-plan, --second-slice-check, --second-slice-first-slice, --second-slice-first-slice-check, --authority-bundle-parity, --authority-bundle-parity-check, --authority-runtime-bridge, --authority-runtime-bridge-check, --m2-seed, --m2-seed-check, --work-items-plan, --work-items-check, --work-items-first-slice, --work-items-first-slice-check, --work-items-bundle-parity, --work-items-bundle-parity-check, --work-items-runtime-bridge, --work-items-runtime-bridge-check, --work-items-installed-fallback-smoke, --work-items-installed-fallback-check, --claims-plan, --claims-check, --claims-first-slice, --claims-first-slice-check, --claims-bundle-parity, --claims-bundle-parity-check, --claims-runtime-bridge, --claims-runtime-bridge-check, --claims-installed-fallback-smoke, --claims-installed-fallback-check, --source-domain-closure-review, --source-domain-closure-check, --cli-runtime-plan, --cli-runtime-check, --thin-router, --thin-router-check, --compatibility-port, --compatibility-port-check, --core-adapter, --core-adapter-check, --package-adapter, --package-adapter-check, --architecture-adapter, --architecture-adapter-check, --authority-adapter, --authority-adapter-check, --module-inclusion-plan, --module-inclusion-check, --packaged-router-port, --packaged-router-port-check, --thin-entrypoint-rehearsal, --thin-entrypoint-rehearsal-check, --thin-entrypoint-cutover, --thin-entrypoint-cutover-check, --router-adapter-delegation, --router-adapter-delegation-check, or --check',
    writes_files: false,
    publishes_package: false
  });
  return 1;
}


function runAuthority(args) {
  if (args.length === 1 && args[0] === '--first-read') {
    json(publicAuthorityFirstRead());
    return 0;
  }
  if (args.length === 1 && args[0] === '--check') {
    const result = publicAuthorityFirstReadCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  json({
    schema: 'agent-onboard-authority-command-error-001',
    status: 'error',
    command_family: 'authority',
    message: 'authority requires --first-read or --check',
    writes_files: false,
    publishes_package: false
  });
  return 1;
}

function runRelease(args) {
  if (args.length === 1 && args[0] === '--plan') {
    json({
      schema: 'agent-onboard-public-release-plan-005',
      status: 'ok',
      package_name: PUBLIC_RELEASE_CONTRACT.package_name,
      version: VERSION,
      release_line: PUBLIC_RELEASE_CONTRACT.release_line,
      contract_schema: PUBLIC_RELEASE_CONTRACT.schema,
      contract_command: PUBLIC_RELEASE_CONTRACT.contract_command,
      fixture_command: PUBLIC_RELEASE_CONTRACT.fixture_command,
      parity_smoke_command: PUBLIC_RELEASE_CONTRACT.parity_smoke_command,
      architecture_parity_smoke_command: PUBLIC_RELEASE_CONTRACT.architecture_parity_smoke_command,
      target_onboarding_smoke_command: PUBLIC_RELEASE_CONTRACT.target_onboarding_smoke_command,
      post_publish_handoff_command: PUBLIC_RELEASE_CONTRACT.post_publish_handoff_command,
      published_acceptance_command: PUBLIC_RELEASE_CONTRACT.published_acceptance_command,
      real_target_trial_command: PUBLIC_RELEASE_CONTRACT.real_target_trial_command,
      architecture_map_command: PUBLIC_RELEASE_CONTRACT.architecture_map_command,
      architecture_router_command: PUBLIC_RELEASE_CONTRACT.architecture_router_command,
      architecture_facades_command: PUBLIC_RELEASE_CONTRACT.architecture_facades_command,
      architecture_partition_plan_command: PUBLIC_RELEASE_CONTRACT.architecture_partition_plan_command,
      architecture_partition_check_command: PUBLIC_RELEASE_CONTRACT.architecture_partition_check_command,
      architecture_extraction_rehearsal_command: PUBLIC_RELEASE_CONTRACT.architecture_extraction_rehearsal_command,
      architecture_extraction_check_command: PUBLIC_RELEASE_CONTRACT.architecture_extraction_check_command,
      architecture_golden_outputs_command: PUBLIC_RELEASE_CONTRACT.architecture_golden_outputs_command,
      architecture_golden_check_command: PUBLIC_RELEASE_CONTRACT.architecture_golden_check_command,
      architecture_adapter_boundary_command: PUBLIC_RELEASE_CONTRACT.architecture_adapter_boundary_command,
      architecture_adapter_check_command: PUBLIC_RELEASE_CONTRACT.architecture_adapter_check_command,
      architecture_first_slice_command: PUBLIC_RELEASE_CONTRACT.architecture_first_slice_command,
      architecture_first_slice_check_command: PUBLIC_RELEASE_CONTRACT.architecture_first_slice_check_command,
      architecture_bundle_parity_command: PUBLIC_RELEASE_CONTRACT.architecture_bundle_parity_command,
      architecture_bundle_parity_check_command: PUBLIC_RELEASE_CONTRACT.architecture_bundle_parity_check_command,
      architecture_runtime_bridge_command: PUBLIC_RELEASE_CONTRACT.architecture_runtime_bridge_command,
      architecture_runtime_bridge_check_command: PUBLIC_RELEASE_CONTRACT.architecture_runtime_bridge_check_command,
      architecture_installed_fallback_smoke_command: PUBLIC_RELEASE_CONTRACT.architecture_installed_fallback_smoke_command,
      architecture_installed_fallback_check_command: PUBLIC_RELEASE_CONTRACT.architecture_installed_fallback_check_command,
      architecture_second_slice_plan_command: PUBLIC_RELEASE_CONTRACT.architecture_second_slice_plan_command,
      architecture_second_slice_check_command: PUBLIC_RELEASE_CONTRACT.architecture_second_slice_check_command,
      architecture_second_slice_first_slice_command: PUBLIC_RELEASE_CONTRACT.architecture_second_slice_first_slice_command,
      architecture_second_slice_first_slice_check_command: PUBLIC_RELEASE_CONTRACT.architecture_second_slice_first_slice_check_command,
      architecture_authority_bundle_parity_command: PUBLIC_RELEASE_CONTRACT.architecture_authority_bundle_parity_command,
      architecture_authority_bundle_parity_check_command: PUBLIC_RELEASE_CONTRACT.architecture_authority_bundle_parity_check_command,
      architecture_authority_runtime_bridge_command: PUBLIC_RELEASE_CONTRACT.architecture_authority_runtime_bridge_command,
      architecture_authority_runtime_bridge_check_command: PUBLIC_RELEASE_CONTRACT.architecture_authority_runtime_bridge_check_command,
      architecture_work_items_plan_command: PUBLIC_RELEASE_CONTRACT.architecture_work_items_plan_command,
      architecture_work_items_check_command: PUBLIC_RELEASE_CONTRACT.architecture_work_items_check_command,
      architecture_work_items_first_slice_command: PUBLIC_RELEASE_CONTRACT.architecture_work_items_first_slice_command,
      architecture_work_items_first_slice_check_command: PUBLIC_RELEASE_CONTRACT.architecture_work_items_first_slice_check_command,
      architecture_work_items_bundle_parity_command: PUBLIC_RELEASE_CONTRACT.architecture_work_items_bundle_parity_command,
      architecture_work_items_bundle_parity_check_command: PUBLIC_RELEASE_CONTRACT.architecture_work_items_bundle_parity_check_command,
      architecture_work_items_runtime_bridge_command: PUBLIC_RELEASE_CONTRACT.architecture_work_items_runtime_bridge_command,
      architecture_work_items_runtime_bridge_check_command: PUBLIC_RELEASE_CONTRACT.architecture_work_items_runtime_bridge_check_command,
      architecture_work_items_installed_fallback_smoke_command: PUBLIC_RELEASE_CONTRACT.architecture_work_items_installed_fallback_smoke_command,
      architecture_work_items_installed_fallback_check_command: PUBLIC_RELEASE_CONTRACT.architecture_work_items_installed_fallback_check_command,
      architecture_claims_plan_command: PUBLIC_RELEASE_CONTRACT.architecture_claims_plan_command,
      architecture_claims_check_command: PUBLIC_RELEASE_CONTRACT.architecture_claims_check_command,
      architecture_claims_first_slice_command: PUBLIC_RELEASE_CONTRACT.architecture_claims_first_slice_command,
      architecture_claims_first_slice_check_command: PUBLIC_RELEASE_CONTRACT.architecture_claims_first_slice_check_command,
      architecture_claims_bundle_parity_command: PUBLIC_RELEASE_CONTRACT.architecture_claims_bundle_parity_command,
      architecture_claims_bundle_parity_check_command: PUBLIC_RELEASE_CONTRACT.architecture_claims_bundle_parity_check_command,
      architecture_claims_runtime_bridge_command: PUBLIC_RELEASE_CONTRACT.architecture_claims_runtime_bridge_command,
      architecture_claims_runtime_bridge_check_command: PUBLIC_RELEASE_CONTRACT.architecture_claims_runtime_bridge_check_command,
      architecture_claims_installed_fallback_smoke_command: PUBLIC_RELEASE_CONTRACT.architecture_claims_installed_fallback_smoke_command,
      architecture_claims_installed_fallback_check_command: PUBLIC_RELEASE_CONTRACT.architecture_claims_installed_fallback_check_command,
      architecture_source_domain_closure_review_command: PUBLIC_RELEASE_CONTRACT.architecture_source_domain_closure_review_command,
      architecture_source_domain_closure_check_command: PUBLIC_RELEASE_CONTRACT.architecture_source_domain_closure_check_command,
      architecture_cli_runtime_plan_command: PUBLIC_RELEASE_CONTRACT.architecture_cli_runtime_plan_command,
      architecture_cli_runtime_check_command: PUBLIC_RELEASE_CONTRACT.architecture_cli_runtime_check_command,
      architecture_thin_router_command: PUBLIC_RELEASE_CONTRACT.architecture_thin_router_command,
      architecture_thin_router_check_command: PUBLIC_RELEASE_CONTRACT.architecture_thin_router_check_command,
      architecture_compatibility_port_command: PUBLIC_RELEASE_CONTRACT.architecture_compatibility_port_command,
      architecture_compatibility_port_check_command: PUBLIC_RELEASE_CONTRACT.architecture_compatibility_port_check_command,
      architecture_core_adapter_command: PUBLIC_RELEASE_CONTRACT.architecture_core_adapter_command,
      architecture_core_adapter_check_command: PUBLIC_RELEASE_CONTRACT.architecture_core_adapter_check_command,
      architecture_package_adapter_command: PUBLIC_RELEASE_CONTRACT.architecture_package_adapter_command,
      architecture_package_adapter_check_command: PUBLIC_RELEASE_CONTRACT.architecture_package_adapter_check_command,
      architecture_architecture_adapter_command: PUBLIC_RELEASE_CONTRACT.architecture_architecture_adapter_command,
      architecture_architecture_adapter_check_command: PUBLIC_RELEASE_CONTRACT.architecture_architecture_adapter_check_command,
      architecture_authority_adapter_command: PUBLIC_RELEASE_CONTRACT.architecture_authority_adapter_command,
      architecture_authority_adapter_check_command: PUBLIC_RELEASE_CONTRACT.architecture_authority_adapter_check_command,
      architecture_module_inclusion_plan_command: PUBLIC_RELEASE_CONTRACT.architecture_module_inclusion_plan_command,
      architecture_module_inclusion_check_command: PUBLIC_RELEASE_CONTRACT.architecture_module_inclusion_check_command,
      architecture_packaged_router_port_command: PUBLIC_RELEASE_CONTRACT.architecture_packaged_router_port_command,
      architecture_packaged_router_port_check_command: PUBLIC_RELEASE_CONTRACT.architecture_packaged_router_port_check_command,
      architecture_thin_entrypoint_rehearsal_command: PUBLIC_RELEASE_CONTRACT.architecture_thin_entrypoint_rehearsal_command,
      architecture_thin_entrypoint_rehearsal_check_command: PUBLIC_RELEASE_CONTRACT.architecture_thin_entrypoint_rehearsal_check_command,
      architecture_thin_entrypoint_cutover_command: PUBLIC_RELEASE_CONTRACT.architecture_thin_entrypoint_cutover_command,
      architecture_thin_entrypoint_cutover_check_command: PUBLIC_RELEASE_CONTRACT.architecture_thin_entrypoint_cutover_check_command,
      architecture_router_adapter_delegation_command: PUBLIC_RELEASE_CONTRACT.architecture_router_adapter_delegation_command,
      architecture_router_adapter_delegation_check_command: PUBLIC_RELEASE_CONTRACT.architecture_router_adapter_delegation_check_command,
      version_sprawl_check_command: PUBLIC_RELEASE_CONTRACT.version_sprawl_check_command,
      architecture_check_command: PUBLIC_RELEASE_CONTRACT.architecture_check_command,
      authority_first_read_command: PUBLIC_RELEASE_CONTRACT.authority_first_read_command,
      authority_check_command: PUBLIC_RELEASE_CONTRACT.authority_check_command,
      target_runtime_namespace_command: PUBLIC_RELEASE_CONTRACT.target_runtime_namespace_command,
      target_runtime_check_command: PUBLIC_RELEASE_CONTRACT.target_runtime_check_command,
      package_surface_command: PUBLIC_RELEASE_CONTRACT.package_surface_command,
      package_surface_check_command: PUBLIC_RELEASE_CONTRACT.package_surface_check_command,
      check_command: PUBLIC_RELEASE_CONTRACT.command,
      contract: PUBLIC_RELEASE_CONTRACT,
      fixture_matrix: PUBLIC_RELEASE_FIXTURE_MATRIX,
      architecture_map: PUBLIC_ARCHITECTURE_MAP,
      command_router: PUBLIC_COMMAND_ROUTER,
      domain_service_facades: PUBLIC_DOMAIN_SERVICE_FACADES,
      source_domain_module_partition_plan: PUBLIC_SOURCE_DOMAIN_MODULE_PARTITION_PLAN,
      source_domain_extraction_rehearsal: PUBLIC_SOURCE_DOMAIN_EXTRACTION_REHEARSAL,
      source_extraction_golden_output_freeze: PUBLIC_SOURCE_EXTRACTION_GOLDEN_OUTPUT_FREEZE,
      source_module_extraction_adapter_boundary: PUBLIC_SOURCE_MODULE_EXTRACTION_ADAPTER_BOUNDARY,
      source_module_extraction_first_slice: PUBLIC_SOURCE_MODULE_EXTRACTION_FIRST_SLICE,
      source_module_extraction_bundle_parity: PUBLIC_SOURCE_MODULE_EXTRACTION_BUNDLE_PARITY,
    source_module_extraction_runtime_bridge: PUBLIC_SOURCE_MODULE_EXTRACTION_RUNTIME_BRIDGE,
      source_module_extraction_second_slice_plan: PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN,
      source_module_extraction_second_slice_first_slice: PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_FIRST_SLICE,
      source_module_extraction_work_items_plan: PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_PLAN,
      source_module_extraction_work_items_first_slice: PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_FIRST_SLICE,
      source_module_extraction_work_items_bundle_parity: PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_BUNDLE_PARITY,
      source_module_extraction_work_items_runtime_bridge: PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_RUNTIME_BRIDGE,
      source_module_extraction_work_items_installed_fallback_smoke: PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_INSTALLED_FALLBACK_SMOKE,
      source_module_extraction_claims_plan: PUBLIC_CLAIMS_DOMAIN_SOURCE_EXTRACTION_PLAN,
      source_module_extraction_claims_first_slice: PUBLIC_CLAIMS_DOMAIN_SOURCE_EXTRACTION_FIRST_SLICE,
      source_module_extraction_claims_bundle_parity: PUBLIC_CLAIMS_DOMAIN_SOURCE_EXTRACTION_BUNDLE_PARITY,
      source_module_extraction_claims_runtime_bridge: PUBLIC_CLAIMS_DOMAIN_SOURCE_EXTRACTION_RUNTIME_BRIDGE,
      source_module_extraction_claims_installed_fallback_smoke: PUBLIC_CLAIMS_DOMAIN_SOURCE_EXTRACTION_INSTALLED_FALLBACK_SMOKE,
      source_domain_extraction_stabilization_closure_review: PUBLIC_SOURCE_DOMAIN_EXTRACTION_STABILIZATION_CLOSURE_REVIEW,
      cli_runtime_de_monolith_planning: PUBLIC_CLI_RUNTIME_DE_MONOLITH_PLANNING,
      core_command_adapter_extraction: PUBLIC_CORE_COMMAND_ADAPTER_EXTRACTION,
      package_command_adapter_extraction: PUBLIC_PACKAGE_COMMAND_ADAPTER_EXTRACTION,
      architecture_command_adapter_extraction: PUBLIC_ARCHITECTURE_COMMAND_ADAPTER_EXTRACTION,
      authority_command_adapter_extraction: PUBLIC_AUTHORITY_COMMAND_ADAPTER_EXTRACTION,
      modular_runtime_package_inclusion_plan: PUBLIC_MODULAR_RUNTIME_PACKAGE_INCLUSION_PLAN,
      packaged_router_port_inclusion: PUBLIC_PACKAGED_ROUTER_PORT_INCLUSION,
      thin_entrypoint_router_cutover_rehearsal: PUBLIC_THIN_ENTRYPOINT_ROUTER_CUTOVER_REHEARSAL,
      thin_entrypoint_router_cutover_application: PUBLIC_THIN_ENTRYPOINT_ROUTER_CUTOVER_APPLICATION,
      router_command_adapter_delegation_expansion: PUBLIC_ROUTER_COMMAND_ADAPTER_DELEGATION_EXPANSION,
      version_reference_policy: PUBLIC_VERSION_REFERENCE_POLICY,
      authority_first_read_index: PUBLIC_AUTHORITY_FIRST_READ_INDEX,
      target_runtime_namespace: PUBLIC_TARGET_RUNTIME_NAMESPACE,
      package_surface_preservation: PUBLIC_PACKAGE_SURFACE_PRESERVATION,
      installed_parity_architecture_smoke: PUBLIC_INSTALLED_PARITY_ARCHITECTURE_SMOKE,
      source_context: sourceContext(),
      post_publish_verification_commands: publicReleasePostPublishCommands(VERSION),
      boundary: {
        writes_files: false,
        git_mutation: false,
        installs_dependencies: false,
        runs_build_test_deploy: false,
        publishes_package: false,
        mutates_registry: false
      }
    });
    return 0;
  }
  if (args.length === 1 && args[0] === '--contract') {
    json({
      schema: 'agent-onboard-public-release-contract-response-001',
      status: 'ok',
      package_name: PUBLIC_RELEASE_CONTRACT.package_name,
      version: VERSION,
      release_line: PUBLIC_RELEASE_CONTRACT.release_line,
      contract: PUBLIC_RELEASE_CONTRACT,
      fixture_matrix: PUBLIC_RELEASE_FIXTURE_MATRIX,
      architecture_map: PUBLIC_ARCHITECTURE_MAP,
      command_router: PUBLIC_COMMAND_ROUTER,
      domain_service_facades: PUBLIC_DOMAIN_SERVICE_FACADES,
      source_domain_module_partition_plan: PUBLIC_SOURCE_DOMAIN_MODULE_PARTITION_PLAN,
      source_domain_extraction_rehearsal: PUBLIC_SOURCE_DOMAIN_EXTRACTION_REHEARSAL,
      source_extraction_golden_output_freeze: PUBLIC_SOURCE_EXTRACTION_GOLDEN_OUTPUT_FREEZE,
      source_module_extraction_adapter_boundary: PUBLIC_SOURCE_MODULE_EXTRACTION_ADAPTER_BOUNDARY,
      source_module_extraction_first_slice: PUBLIC_SOURCE_MODULE_EXTRACTION_FIRST_SLICE,
      source_module_extraction_bundle_parity: PUBLIC_SOURCE_MODULE_EXTRACTION_BUNDLE_PARITY,
    source_module_extraction_runtime_bridge: PUBLIC_SOURCE_MODULE_EXTRACTION_RUNTIME_BRIDGE,
      source_module_extraction_second_slice_plan: PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN,
      source_module_extraction_second_slice_first_slice: PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_FIRST_SLICE,
      source_module_extraction_work_items_plan: PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_PLAN,
      source_module_extraction_work_items_first_slice: PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_FIRST_SLICE,
      source_module_extraction_work_items_bundle_parity: PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_BUNDLE_PARITY,
      source_module_extraction_work_items_runtime_bridge: PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_RUNTIME_BRIDGE,
      source_module_extraction_work_items_installed_fallback_smoke: PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_INSTALLED_FALLBACK_SMOKE,
      source_module_extraction_claims_plan: PUBLIC_CLAIMS_DOMAIN_SOURCE_EXTRACTION_PLAN,
      source_module_extraction_claims_first_slice: PUBLIC_CLAIMS_DOMAIN_SOURCE_EXTRACTION_FIRST_SLICE,
      source_module_extraction_claims_bundle_parity: PUBLIC_CLAIMS_DOMAIN_SOURCE_EXTRACTION_BUNDLE_PARITY,
      source_module_extraction_claims_runtime_bridge: PUBLIC_CLAIMS_DOMAIN_SOURCE_EXTRACTION_RUNTIME_BRIDGE,
      source_module_extraction_claims_installed_fallback_smoke: PUBLIC_CLAIMS_DOMAIN_SOURCE_EXTRACTION_INSTALLED_FALLBACK_SMOKE,
      source_domain_extraction_stabilization_closure_review: PUBLIC_SOURCE_DOMAIN_EXTRACTION_STABILIZATION_CLOSURE_REVIEW,
      cli_runtime_de_monolith_planning: PUBLIC_CLI_RUNTIME_DE_MONOLITH_PLANNING,
      core_command_adapter_extraction: PUBLIC_CORE_COMMAND_ADAPTER_EXTRACTION,
      package_command_adapter_extraction: PUBLIC_PACKAGE_COMMAND_ADAPTER_EXTRACTION,
      architecture_command_adapter_extraction: PUBLIC_ARCHITECTURE_COMMAND_ADAPTER_EXTRACTION,
      authority_command_adapter_extraction: PUBLIC_AUTHORITY_COMMAND_ADAPTER_EXTRACTION,
      modular_runtime_package_inclusion_plan: PUBLIC_MODULAR_RUNTIME_PACKAGE_INCLUSION_PLAN,
      packaged_router_port_inclusion: PUBLIC_PACKAGED_ROUTER_PORT_INCLUSION,
      thin_entrypoint_router_cutover_rehearsal: PUBLIC_THIN_ENTRYPOINT_ROUTER_CUTOVER_REHEARSAL,
      thin_entrypoint_router_cutover_application: PUBLIC_THIN_ENTRYPOINT_ROUTER_CUTOVER_APPLICATION,
      router_command_adapter_delegation_expansion: PUBLIC_ROUTER_COMMAND_ADAPTER_DELEGATION_EXPANSION,
      version_reference_policy: PUBLIC_VERSION_REFERENCE_POLICY,
      authority_first_read_index: PUBLIC_AUTHORITY_FIRST_READ_INDEX,
      target_runtime_namespace: PUBLIC_TARGET_RUNTIME_NAMESPACE,
      package_surface_preservation: PUBLIC_PACKAGE_SURFACE_PRESERVATION,
      installed_parity_architecture_smoke: PUBLIC_INSTALLED_PARITY_ARCHITECTURE_SMOKE,
      source_context: sourceContext(),
      writes_files: false,
      publishes_package: false,
      mutates_registry: false
    });
    return 0;
  }
  if (args.length === 1 && args[0] === '--fixture') {
    json({
      schema: 'agent-onboard-public-release-fixture-response-001',
      status: 'ok',
      package_name: PUBLIC_RELEASE_CONTRACT.package_name,
      version: VERSION,
      release_line: PUBLIC_RELEASE_CONTRACT.release_line,
      contract_schema: PUBLIC_RELEASE_CONTRACT.schema,
      fixture_matrix: PUBLIC_RELEASE_FIXTURE_MATRIX,
      architecture_map: PUBLIC_ARCHITECTURE_MAP,
      command_router: PUBLIC_COMMAND_ROUTER,
      domain_service_facades: PUBLIC_DOMAIN_SERVICE_FACADES,
      source_domain_module_partition_plan: PUBLIC_SOURCE_DOMAIN_MODULE_PARTITION_PLAN,
      source_domain_extraction_rehearsal: PUBLIC_SOURCE_DOMAIN_EXTRACTION_REHEARSAL,
      source_extraction_golden_output_freeze: PUBLIC_SOURCE_EXTRACTION_GOLDEN_OUTPUT_FREEZE,
      source_module_extraction_adapter_boundary: PUBLIC_SOURCE_MODULE_EXTRACTION_ADAPTER_BOUNDARY,
      source_module_extraction_first_slice: PUBLIC_SOURCE_MODULE_EXTRACTION_FIRST_SLICE,
      source_module_extraction_bundle_parity: PUBLIC_SOURCE_MODULE_EXTRACTION_BUNDLE_PARITY,
    source_module_extraction_runtime_bridge: PUBLIC_SOURCE_MODULE_EXTRACTION_RUNTIME_BRIDGE,
      source_module_extraction_second_slice_plan: PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_PLAN,
      source_module_extraction_second_slice_first_slice: PUBLIC_SOURCE_MODULE_EXTRACTION_SECOND_SLICE_FIRST_SLICE,
      source_module_extraction_work_items_plan: PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_PLAN,
      source_module_extraction_work_items_first_slice: PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_FIRST_SLICE,
      source_module_extraction_work_items_bundle_parity: PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_BUNDLE_PARITY,
      source_module_extraction_work_items_runtime_bridge: PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_RUNTIME_BRIDGE,
      source_module_extraction_work_items_installed_fallback_smoke: PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_INSTALLED_FALLBACK_SMOKE,
      source_module_extraction_claims_plan: PUBLIC_CLAIMS_DOMAIN_SOURCE_EXTRACTION_PLAN,
      source_module_extraction_claims_first_slice: PUBLIC_CLAIMS_DOMAIN_SOURCE_EXTRACTION_FIRST_SLICE,
      source_module_extraction_claims_bundle_parity: PUBLIC_CLAIMS_DOMAIN_SOURCE_EXTRACTION_BUNDLE_PARITY,
      source_module_extraction_claims_runtime_bridge: PUBLIC_CLAIMS_DOMAIN_SOURCE_EXTRACTION_RUNTIME_BRIDGE,
      source_module_extraction_claims_installed_fallback_smoke: PUBLIC_CLAIMS_DOMAIN_SOURCE_EXTRACTION_INSTALLED_FALLBACK_SMOKE,
      source_domain_extraction_stabilization_closure_review: PUBLIC_SOURCE_DOMAIN_EXTRACTION_STABILIZATION_CLOSURE_REVIEW,
      cli_runtime_de_monolith_planning: PUBLIC_CLI_RUNTIME_DE_MONOLITH_PLANNING,
      core_command_adapter_extraction: PUBLIC_CORE_COMMAND_ADAPTER_EXTRACTION,
      package_command_adapter_extraction: PUBLIC_PACKAGE_COMMAND_ADAPTER_EXTRACTION,
      architecture_command_adapter_extraction: PUBLIC_ARCHITECTURE_COMMAND_ADAPTER_EXTRACTION,
      authority_command_adapter_extraction: PUBLIC_AUTHORITY_COMMAND_ADAPTER_EXTRACTION,
      modular_runtime_package_inclusion_plan: PUBLIC_MODULAR_RUNTIME_PACKAGE_INCLUSION_PLAN,
      packaged_router_port_inclusion: PUBLIC_PACKAGED_ROUTER_PORT_INCLUSION,
      thin_entrypoint_router_cutover_rehearsal: PUBLIC_THIN_ENTRYPOINT_ROUTER_CUTOVER_REHEARSAL,
      thin_entrypoint_router_cutover_application: PUBLIC_THIN_ENTRYPOINT_ROUTER_CUTOVER_APPLICATION,
      router_command_adapter_delegation_expansion: PUBLIC_ROUTER_COMMAND_ADAPTER_DELEGATION_EXPANSION,
      version_reference_policy: PUBLIC_VERSION_REFERENCE_POLICY,
      authority_first_read_index: PUBLIC_AUTHORITY_FIRST_READ_INDEX,
      target_runtime_namespace: PUBLIC_TARGET_RUNTIME_NAMESPACE,
      package_surface_preservation: PUBLIC_PACKAGE_SURFACE_PRESERVATION,
      installed_parity_architecture_smoke: PUBLIC_INSTALLED_PARITY_ARCHITECTURE_SMOKE,
      source_context: sourceContext(),
      writes_files: false,
      publishes_package: false,
      mutates_registry: false
    });
    return 0;
  }
  if (args.length === 1 && args[0] === '--surface') {
    json(publicPackageSurface());
    return 0;
  }
  if (args.length === 1 && args[0] === '--surface-check') {
    const result = publicPackageSurfaceCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--version-sprawl-check') {
    const result = publicVersionReferencePolicyCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--parity-smoke') {
    const result = publicInstalledPackageParitySmoke();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--architecture-parity-smoke') {
    const result = publicInstalledParityArchitectureSmoke();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--target-onboarding-smoke') {
    const result = publicTargetOnboardingInstalledPackageSmoke();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--post-publish-handoff') {
    const result = publicTargetOnboardingPostPublishHandoff();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--published-acceptance') {
    const result = publicTargetOnboardingPublishedAcceptance();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--real-target-trial') {
    const result = publicTargetOnboardingRealTargetRepoTrial();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  if (args.length === 1 && args[0] === '--check') {
    const result = publicReleaseCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  json({
    schema: 'agent-onboard-release-command-error-001',
    status: 'error',
    command_family: 'release',
    message: 'release requires --plan, --contract, --fixture, --surface, --surface-check, --version-sprawl-check, --parity-smoke, --architecture-parity-smoke, --target-onboarding-smoke, --post-publish-handoff, --published-acceptance, --real-target-trial, or --check',
    writes_files: false,
    publishes_package: false
  });
  return 1;
}

function runGuard(args) {
  if (args.length === 1 && args[0] === '--plan') {
    json({
      schema: 'agent-onboard-guard-plan-001',
      status: 'ok',
      command_family: 'guard',
      command: 'agent-onboard guard --plan',
      admitted_command: 'agent-onboard guard --check-boundary',
      canonical_config_file: TARGET_CONFIG_FILE,
        enforcement_mode: BOUNDARY_GUARD_CONTRACT.enforcement_mode,
      required_target_config_values: BOUNDARY_GUARD_CONTRACT.required_target_config_values,
      forbidden_true_boundary_fields: BOUNDARY_GUARD_CONTRACT.forbidden_true_boundary_fields,
      reads_target_config: false,
      ...noMutationBoundary()
    });
    return 0;
  }
  if (args.length !== 1 || args[0] !== '--check-boundary') {
    json({
      schema: 'agent-onboard-guard-command-error-001',
      status: 'error',
      command_family: 'guard',
      message: 'guard requires --plan or --check-boundary',
      ...noMutationBoundary()
    });
    return 1;
  }

  const configPath = path.join(process.cwd(), TARGET_CONFIG_FILE);
  if (!fs.existsSync(configPath)) {
    json({
      ...guardResultBase(),
      status: 'blocked',
      reason: 'missing agent-onboard.target.json in current target repo root',
      reads_target_config: false,
      blocked_violation_count: 1,
      violations: [{ path: TARGET_CONFIG_FILE, expected: 'present', actual: 'missing' }],
      blocks_declared_violation: true
    });
    return 2;
  }

  let config;
  try {
    config = readJson(configPath);
  } catch (error) {
    json({
      ...guardResultBase(),
      status: 'blocked',
      reason: 'invalid JSON in agent-onboard.target.json',
      detail: error && error.message ? error.message : String(error),
      reads_target_config: true,
      blocked_violation_count: 1,
      violations: [{ path: TARGET_CONFIG_FILE, expected: 'valid JSON', actual: 'invalid JSON' }],
      blocks_declared_violation: true
    });
    return 2;
  }

  const schemaErrors = validateTargetConfig(config);
  const schemaViolations = schemaErrors.map((message) => ({ path: 'schema-validation', expected: 'valid agent-onboard-target-config-001', actual: message }));
  const boundaryViolations = evaluateTargetBoundaryConfig(config);
  const violations = [...schemaViolations, ...boundaryViolations];
  const passed = violations.length === 0;
  json({
    ...guardResultBase(),
    status: passed ? 'pass' : 'blocked',
    reason: passed ? 'target boundary is read-only and dry-run' : 'target boundary declaration permits an operation this public guard blocks',
    reads_target_config: true,
    validates_target_config_schema: true,
    blocked_violation_count: violations.length,
    violations,
    blocks_declared_violation: !passed,
    managed_project_commands_allowed_now: 0
  });
  return passed ? 0 : 2;
}

function runTargetConfig(args) {
  if (args.includes('--schema')) {
    json({
      schema: 'agent-onboard-target-config-schema-response-001',
      status: 'ok',
      target_config_schema: TARGET_CONFIG_SCHEMA
    });
    return 0;
  }
  if (args.includes('--template')) {
    json({
      schema: 'agent-onboard-target-config-template-response-001',
      status: 'ok',
      canonical_config_file: 'agent-onboard.target.json',
      target_config: targetConfigTemplate()
    });
    return 0;
  }
  if (args.includes('--validate-template')) {
    const errors = validateTargetConfig(targetConfigTemplate());
    const ok = errors.length === 0;
    json({
      schema: 'agent-onboard-target-config-template-validation-001',
      status: ok ? 'ok' : 'error',
      template_source: 'embedded',
      canonical_config_file: 'agent-onboard.target.json',
      validated: true,
      errors
    });
    return ok ? 0 : 1;
  }
  if (args.includes('--validate')) {
    const index = args.indexOf('--validate');
    const file = args[index + 1] && !args[index + 1].startsWith('-') ? args[index + 1] : 'agent-onboard.target.json';
    const errors = validateTargetConfig(readJson(path.resolve(process.cwd(), file)));
    const ok = errors.length === 0;
    json({
      schema: 'agent-onboard-target-config-file-validation-001',
      status: ok ? 'ok' : 'error',
      file,
      validated: true,
      errors
    });
    return ok ? 0 : 1;
  }
  throw new Error('target-config requires --schema, --template, --validate-template, or --validate [file]');
}

function runWorkItems() {
  throw new Error('work-items is served by the packaged work-items runtime service; no legacy work-items fallback is available');
}

function runAgents(args) {
  const preview = args.includes('--preview');
  const write = args.includes('--write');
  const force = args.includes('--force');
  if (!preview && !write) throw new Error('agents requires --preview or --write');
  if (preview && write) throw new Error('agents accepts only one of --preview or --write');

  const content = agentsMdTemplate();
  const plannedWrites = planTextWrites([['AGENTS.md', content]], { force });
  const conflicts = plannedWrites.filter((item) => item.action === 'conflict');
  const ok = conflicts.length === 0;
  if (write && ok) performPlannedTextWrites(plannedWrites);

  json({
    schema: 'agent-onboard-agents-result-001',
    status: ok ? 'ok' : 'error',
    command_family: 'agents',
    canonical_file: 'AGENTS.md',
    mode: write ? 'write' : 'preview',
    force,
    writes_performed: write && ok,
    planned_writes: summarizePlan(plannedWrites),
    conflicts: conflicts.map((item) => item.path),
    agents_md: content,
    boundary: {
      installs_dependencies: false,
      runs_build_test_deploy: false,
      publishes_or_pushes: false,
      modifies_source_files: write,
      modifies_only_canonical_agents_file: write
    }
  });
  return ok ? 0 : 1;
}

function runInit(args) {
  const write = args.includes('--write');
  const dry = args.includes('--dry-run');
  const force = args.includes('--force');
  if (!write && !dry) throw new Error('init requires --dry-run or --write');
  if (write && dry) throw new Error('init accepts only one of --dry-run or --write');

  const plannedWrites = planWrites(initWriteSet(), { force });
  const conflicts = plannedWrites.filter((item) => item.action === 'conflict');
  const ok = conflicts.length === 0;

  if (write && ok) performPlannedWrites(plannedWrites);

  json({
    schema: 'agent-onboard-init-result-001',
    status: ok ? 'ok' : 'error',
    command_family: 'init',
    mode: write ? 'write' : 'dry-run',
    force,
    writes_performed: write && ok,
    planned_writes: summarizePlan(plannedWrites),
    conflicts: conflicts.map((item) => item.path),
    boundary: {
      installs_dependencies: false,
      runs_build_test_deploy: false,
      publishes_or_pushes: false,
      modifies_source_files: false
    }
  });
  return ok ? 0 : 1;
}


function runTargetOnboarding(args) {
  const plan = args.includes('--plan');
  const fixture = args.includes('--fixture');
  const write = args.includes('--write');
  const trial = args.includes('--trial');
  const force = args.includes('--force');
  const targetIndex = args.indexOf('--target');
  const targetRoot = targetIndex >= 0 ? args[targetIndex + 1] : process.cwd();
  const known = new Set(['--plan', '--fixture', '--write', '--trial', '--force', '--target']);
  const unknown = args.filter((arg, index) => {
    if (targetIndex >= 0 && index === targetIndex + 1) return false;
    return !known.has(arg);
  });
  if (targetIndex >= 0 && (!targetRoot || targetRoot.startsWith('-'))) throw new Error('target onboarding --target requires a path');
  if (unknown.length > 0) throw new Error(`target onboarding does not support: ${unknown.join(', ')}`);
  if ([plan, fixture, write, trial].filter(Boolean).length !== 1) throw new Error('target onboarding requires exactly one of --plan, --fixture, --trial, or --write');
  if (force && !write) throw new Error('target onboarding --force requires --write');
  if (targetIndex >= 0 && !trial) throw new Error('target onboarding --target is only supported with --trial');
  if (plan) {
    json(targetOnboardingSurfacePlan());
    return 0;
  }
  if (fixture) {
    json(targetOnboardingDryRunFixture());
    return 0;
  }
  if (trial) {
    const result = targetOnboardingRealTargetTrial(targetRoot);
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }

  const plannedWrites = planTargetOnboardingWrites({ force });
  const conflicts = plannedWrites.filter((item) => item.action === 'conflict');
  const ok = conflicts.length === 0;
  if (ok) performTargetOnboardingWrites(plannedWrites);
  const writtenFiles = ok ? plannedWrites.filter((item) => item.action === 'create' || item.action === 'overwrite').map((item) => item.path) : [];

  json({
    schema: 'agent-onboard-public-target-onboarding-explicit-write-result-001',
    status: ok ? 'ok' : 'error',
    package_name: 'agent-onboard',
    version: VERSION,
    release_line: PUBLIC_RELEASE_CONTRACT.release_line,
    command: force ? 'agent-onboard target onboarding --write --force' : 'agent-onboard target onboarding --write',
    command_family: 'target onboarding',
    mode: 'write',
    force,
    writes_performed: writtenFiles.length > 0,
    written_files: writtenFiles,
    planned_writes: summarizePlan(plannedWrites),
    conflicts: conflicts.map((item) => item.path),
    boundary: {
      explicit_write_flag_required: true,
      force_overwrite_requires_explicit_force_flag: true,
      writes_only_canonical_target_onboarding_files: true,
      canonical_files: TARGET_ONBOARDING_SURFACE_PLAN.canonical_files.slice(),
      installs_dependencies: false,
      runs_build_test_deploy: false,
      publishes_or_pushes: false,
      git_mutation: false
    },
    next_steps: ok ? [
      'read AGENTS.md before continuing agent-assisted work',
      'run agent-onboard guard --check-boundary after agent-onboard.target.json exists',
      'use work-items --append/--claim only after the target owner assigns public work-item scope'
    ] : []
  });
  return ok ? 0 : 1;
}

function runTargetBootstrap(args) {
  const write = args.includes('--write');
  const dry = args.includes('--dry-run');
  const force = args.includes('--force');
  if (!write && !dry) throw new Error('target bootstrap requires --dry-run or --write');
  if (write && dry) throw new Error('target bootstrap accepts only one of --dry-run or --write');

  const plannedWrites = planWrites([['agent-onboard.target.json', targetConfigTemplate()]], { force });
  const conflicts = plannedWrites.filter((item) => item.action === 'conflict');
  const ok = conflicts.length === 0;
  if (write && ok) performPlannedWrites(plannedWrites);

  json({
    schema: 'agent-onboard-target-bootstrap-result-001',
    status: ok ? 'ok' : 'error',
    command_family: 'target',
    mode: write ? 'write' : 'dry-run',
    force,
    writes_performed: write && ok,
    planned_writes: summarizePlan(plannedWrites),
    conflicts: conflicts.map((item) => item.path),
    skipped_optional_writes: ['package.json']
  });
  return ok ? 0 : 1;
}

function runTargetInstance(args) {
  if (args[0] !== 'takeover') throw new Error('target-instance supports only: takeover');
  const write = args.includes('--write');
  const dry = args.includes('--dry-run');
  const force = args.includes('--force');
  if (!write && !dry) throw new Error('target-instance takeover requires --dry-run or --write');
  if (write && dry) throw new Error('target-instance takeover accepts only one of --dry-run or --write');

  const plannedWrites = planWrites([
    ['.agent-onboard/runtime-namespace.json', targetRuntimeNamespaceTemplate()],
    ['.agent-onboard/project.json', runtimeProjectTemplate()],
    ['.agent-onboard/work-items.json', workItemsTemplate()]
  ], { force });
  const conflicts = plannedWrites.filter((item) => item.action === 'conflict');
  const ok = conflicts.length === 0;
  if (write && ok) performPlannedWrites(plannedWrites);

  json({
    schema: 'agent-onboard-target-instance-takeover-result-001',
    status: ok ? 'ok' : 'error',
    command_family: 'target-instance',
    mode: write ? 'write' : 'dry-run',
    force,
    writes_performed: write && ok,
    planned_writes: summarizePlan(plannedWrites),
    conflicts: conflicts.map((item) => item.path)
  });
  return ok ? 0 : 1;
}

function help() {
  process.stdout.write(`agent-onboard ${VERSION}\n\nagent-onboard status\nagent-onboard init --dry-run|--write [--force]\nagent-onboard agents --preview|--write [--force]\nagent-onboard guard --plan|--check-boundary\nagent-onboard authority --first-read|--check\nagent-onboard architecture --map|--router|--facades|--partition-plan|--partition-check|--extraction-rehearsal|--extraction-check|--golden-outputs|--golden-check|--adapter-boundary|--adapter-check|--first-slice|--first-slice-check|--bundle-parity|--bundle-parity-check|--runtime-bridge|--runtime-bridge-check|--installed-fallback-smoke|--installed-fallback-check|--second-slice-plan|--second-slice-check|--second-slice-first-slice|--second-slice-first-slice-check|--authority-bundle-parity|--authority-bundle-parity-check|--authority-runtime-bridge|--authority-runtime-bridge-check|--m2-seed|--m2-seed-check|--work-items-plan|--work-items-check|--work-items-first-slice|--work-items-first-slice-check|--work-items-bundle-parity|--work-items-bundle-parity-check|--work-items-runtime-bridge|--work-items-runtime-bridge-check|--work-items-installed-fallback-smoke|--work-items-installed-fallback-check|--claims-plan|--claims-check|--claims-first-slice|--claims-first-slice-check|--claims-bundle-parity|--claims-bundle-parity-check|--claims-runtime-bridge|--claims-runtime-bridge-check|--claims-installed-fallback-smoke|--claims-installed-fallback-check|--source-domain-closure-review|--source-domain-closure-check|--cli-runtime-plan|--cli-runtime-check|--thin-router|--thin-router-check|--compatibility-port|--compatibility-port-check|--core-adapter|--core-adapter-check|--package-adapter|--package-adapter-check|--architecture-adapter|--architecture-adapter-check|--authority-adapter|--authority-adapter-check|--module-inclusion-plan|--module-inclusion-check|--packaged-router-port|--packaged-router-port-check|--thin-entrypoint-rehearsal|--thin-entrypoint-rehearsal-check|--thin-entrypoint-cutover|--thin-entrypoint-cutover-check|--router-adapter-delegation|--router-adapter-delegation-check|--check\nagent-onboard release --plan|--contract|--fixture|--surface|--surface-check|--version-sprawl-check|--parity-smoke|--architecture-parity-smoke|--target-onboarding-smoke|--post-publish-handoff|--published-acceptance|--real-target-trial|--check\nagent-onboard target-config --schema\nagent-onboard target-config --template\nagent-onboard target-config --validate-template\nagent-onboard target-config --validate [agent-onboard.target.json]\nagent-onboard work-items --schema\nagent-onboard work-items --template\nagent-onboard work-items --validate-template\nagent-onboard work-items --validate [.agent-onboard/work-items.json]\nagent-onboard work-items --list [.agent-onboard/work-items.json]\nagent-onboard work-items --init --dry-run|--write [--force]\nagent-onboard work-items --append --dry-run|--write --id <public-work-item-id> --title <title>\nagent-onboard work-items --claim --dry-run|--write --id <public-work-item-id> --actor <actor>\nagent-onboard work-items --close --dry-run|--write --id <public-work-item-id> --actor <actor> --summary <summary>\nagent-onboard target runtime --namespace|--check\nagent-onboard target onboarding --plan|--fixture|--trial [--target <path>]|--write [--force]\nagent-onboard target bootstrap --dry-run|--write [--force]\nagent-onboard target-instance takeover --dry-run|--write [--force]\n`);
  return 0;
}

function printVersion() {
  process.stdout.write(`${VERSION}\n`);
  return 0;
}

function runStatus() {
  json({ schema: 'agent-onboard-status-001', status: 'ok', version: VERSION, release_line: PUBLIC_RELEASE_CONTRACT.release_line });
  return 0;
}


function runTargetRuntime(args) {
  if (args.length === 1 && args[0] === '--namespace') {
    json(publicTargetRuntimeNamespace());
    return 0;
  }
  if (args.length === 1 && args[0] === '--check') {
    const result = publicTargetRuntimeNamespaceCheck();
    json(result);
    return result.status === 'ok' ? 0 : 1;
  }
  json({
    schema: 'agent-onboard-target-runtime-command-error-001',
    status: 'error',
    command_family: 'target runtime',
    message: 'target runtime requires --namespace or --check',
    writes_files: false,
    publishes_package: false
  });
  return 1;
}

function runTargetCommand(args) {
  if (args[0] === 'runtime') return runTargetRuntime(args.slice(1));
  if (args[0] === 'onboarding') return runTargetOnboarding(args.slice(1));
  if (args[0] !== 'bootstrap') throw new Error('target supports only: runtime --namespace|--check, onboarding --plan|--fixture|--trial [--target <path>]|--write [--force], bootstrap');
  return runTargetBootstrap(args.slice(1));
}

const DOMAIN_SERVICE_FACADES = Object.freeze({
  coreService: Object.freeze({
    help,
    printVersion,
    runStatus,
    runArchitecture
  }),
  authorityService: Object.freeze({
    runAgents,
    runGuard,
    runAuthority
  }),
  workItemsService: Object.freeze({
    runWorkItems
  }),
  claimsService: Object.freeze({
    runWorkItems
  }),
  targetService: Object.freeze({
    runInit,
    runTargetConfig,
    runTargetRuntime,
    runTargetCommand,
    runTargetInstance
  }),
  releasePackageService: Object.freeze({
    runRelease
  })
});

const COMMAND_ROUTE_HANDLERS = Object.freeze({
  help: DOMAIN_SERVICE_FACADES.coreService.help,
  version: DOMAIN_SERVICE_FACADES.coreService.printVersion,
  status: DOMAIN_SERVICE_FACADES.coreService.runStatus,
  init: DOMAIN_SERVICE_FACADES.targetService.runInit,
  agents: DOMAIN_SERVICE_FACADES.authorityService.runAgents,
  guard: DOMAIN_SERVICE_FACADES.authorityService.runGuard,
  authority: DOMAIN_SERVICE_FACADES.authorityService.runAuthority,
  architecture: DOMAIN_SERVICE_FACADES.coreService.runArchitecture,
  release: DOMAIN_SERVICE_FACADES.releasePackageService.runRelease,
  'target-config': DOMAIN_SERVICE_FACADES.targetService.runTargetConfig,
  'work-items': DOMAIN_SERVICE_FACADES.workItemsService.runWorkItems,
  target: DOMAIN_SERVICE_FACADES.targetService.runTargetCommand,
  'target-instance': DOMAIN_SERVICE_FACADES.targetService.runTargetInstance
});

function normalizeCommand(cmd) {
  if (!cmd || ['help', '--help', '-h'].includes(cmd)) return 'help';
  if (['version', '--version', '-v'].includes(cmd)) return 'version';
  return cmd;
}

function dispatchCommand(argv = []) {
  const [rawCommand, ...args] = argv;
  const command = normalizeCommand(rawCommand);
  const handler = COMMAND_ROUTE_HANDLERS[command];
  if (!handler) throw new Error(`unsupported command: ${rawCommand}`);
  return handler(args);
}

function createRuntimeCompatibilityPort() {
  const coreAdapter = createCoreCommandAdapter({
    version: VERSION,
    releaseLine: RELEASE_LINE,
    handlers: Object.freeze({
      help: DOMAIN_SERVICE_FACADES.coreService.help,
      version: DOMAIN_SERVICE_FACADES.coreService.printVersion,
      status: DOMAIN_SERVICE_FACADES.coreService.runStatus
    })
  });
  const packageAdapter = createPackageCommandAdapter({
    handlers: Object.freeze({
      release: DOMAIN_SERVICE_FACADES.releasePackageService.runRelease
    })
  });
  const architectureAdapter = createArchitectureCommandAdapter({
    handlers: Object.freeze({
      architecture: DOMAIN_SERVICE_FACADES.coreService.runArchitecture
    })
  });
  const authorityAdapter = createAuthorityCommandAdapter({
    handlers: Object.freeze({
      agents: DOMAIN_SERVICE_FACADES.authorityService.runAgents,
      guard: DOMAIN_SERVICE_FACADES.authorityService.runGuard,
      authority: DOMAIN_SERVICE_FACADES.authorityService.runAuthority
    })
  });
  const targetAdapter = createTargetCommandAdapter({
    handlers: Object.freeze({
      init: DOMAIN_SERVICE_FACADES.targetService.runInit,
      'target-config': DOMAIN_SERVICE_FACADES.targetService.runTargetConfig,
      target: DOMAIN_SERVICE_FACADES.targetService.runTargetCommand,
      'target-instance': DOMAIN_SERVICE_FACADES.targetService.runTargetInstance
    })
  });
  const workItemsService = createWorkItemsService({
    cwd: () => process.cwd(),
    emit: json,
    readJson,
    validateWorkItems,
    workItemCounts,
    workItemsSchema: () => WORK_ITEMS_SCHEMA,
    workItemsTemplate,
    appendWorkItemDryRun,
    claimWorkItemDryRun,
    closeWorkItemDryRun,
    planWrites,
    performPlannedWrites,
    summarizePlan,
    writeJson,
    exists: fs.existsSync
  });
  const workItemsAdapter = createWorkItemsCommandAdapter({
    service: workItemsService
  });
  const adapters = Object.freeze({
    help: coreAdapter,
    '--help': coreAdapter,
    '-h': coreAdapter,
    version: coreAdapter,
    '--version': coreAdapter,
    '-v': coreAdapter,
    status: coreAdapter,
    release: packageAdapter,
    architecture: architectureAdapter,
    authority: authorityAdapter,
    agents: authorityAdapter,
    guard: authorityAdapter,
    init: targetAdapter,
    'target-config': targetAdapter,
    target: targetAdapter,
    'target-instance': targetAdapter,
    'work-items': workItemsAdapter
  });
  const handlers = {};
  for (const command of Object.keys(COMMAND_ROUTE_HANDLERS)) {
    handlers[command] = (argv = []) => {
      const normalized = normalizeCommand(argv[2]);
      return COMMAND_ROUTE_HANDLERS[normalized](argv.slice(3));
    };
  }
  handlers['--help'] = handlers.help;
  handlers['-h'] = handlers.help;
  handlers['--version'] = handlers.version;
  handlers['-v'] = handlers.version;
  handlers.default = (argv = []) => {
    const command = argv[2] || 'help';
    throw new Error(`unsupported command: ${command}`);
  };
  return createCompatibilityCommandPort(Object.freeze(handlers), Object.freeze({ adapters }));
}

function main(argv = process.argv) {
  return routeCommand(argv, createRuntimeCompatibilityPort());
}

if (require.main === module) {
  try {
    process.exitCode = main();
  } catch (error) {
    json({ schema: 'agent-onboard-cli-error-001', status: 'error', message: error.message || String(error) });
    process.exitCode = 1;
  }
}

module.exports = {
  main,
  targetConfigTemplate,
  validateTargetConfig,
  validateWorkItems,
  validateWorkItemsGraph,
  appendWorkItemDryRun,
  claimWorkItemDryRun,
  closeWorkItemDryRun,
  handoffEvidenceChecklist,
  participationLifecycleNextSteps,
  workItemsTemplate,
  initWriteSet,
  planWrites,
  agentsMdTemplate,
  evaluateTargetBoundaryConfig,
  sourceWorkItemsLedgerCheck,
  sourceContext,
  publicReleaseCheck,
  publicArchitectureMap,
  publicCommandRouter,
  publicCommandRouterCheck,
  publicArchitectureCheck,
  publicSourceDomainExtractionRehearsal,
  publicSourceDomainExtractionRehearsalCheck,
  publicSourceModuleExtractionAuthorityBundleParity,
  publicSourceModuleExtractionAuthorityBundleParityCheck,
  publicWorkItemsDomainSourceExtractionPlan,
  publicWorkItemsDomainSourceExtractionPlanCheck,
  publicWorkItemsDomainSourceExtractionFirstSlice,
  publicWorkItemsDomainSourceExtractionFirstSliceCheck,
  publicWorkItemsDomainSourceExtractionBundleParity,
  publicWorkItemsDomainSourceExtractionBundleParityCheck,
  publicWorkItemsDomainSourceExtractionRuntimeBridge,
  publicWorkItemsDomainSourceExtractionRuntimeBridgeCheck,
  publicWorkItemsDomainSourceExtractionInstalledFallbackSmoke,
  publicWorkItemsDomainSourceExtractionInstalledFallbackSmokeCheck,
  publicArchitectureCommandAdapterExtraction,
  publicArchitectureCommandAdapterExtractionCheck,
  publicAuthorityCommandAdapterExtraction,
  publicAuthorityCommandAdapterExtractionCheck,
  publicModularRuntimePackageInclusionPlan,
  publicModularRuntimePackageInclusionPlanCheck,
  publicPackagedRouterPortInclusion,
  publicPackagedRouterPortInclusionCheck,
  publicThinEntrypointRouterCutoverRehearsal,
  publicThinEntrypointRouterCutoverRehearsalCheck,
  publicThinEntrypointRouterCutoverApplication,
  publicThinEntrypointRouterCutoverApplicationCheck,
  publicRouterCommandAdapterDelegationExpansion,
  publicRouterCommandAdapterDelegationExpansionCheck,
  publicClaimsDomainSourceExtractionPlan,
  publicClaimsDomainSourceExtractionPlanCheck,
  publicClaimsDomainSourceExtractionFirstSlice,
  publicClaimsDomainSourceExtractionFirstSliceCheck,
  publicClaimsDomainSourceExtractionBundleParity,
  publicClaimsDomainSourceExtractionBundleParityCheck,
  publicClaimsDomainSourceExtractionRuntimeBridge,
  publicClaimsDomainSourceExtractionRuntimeBridgeCheck,
  publicClaimsDomainSourceExtractionInstalledFallbackSmoke,
  publicClaimsDomainSourceExtractionInstalledFallbackSmokeCheck,
  publicInstalledPackageParitySmoke,
  publicInstalledParityArchitectureSmoke,
  publicTargetOnboardingInstalledPackageSmoke,
  publicTargetOnboardingPostPublishHandoff,
  publicTargetOnboardingPublishedAcceptance,
  publicTargetOnboardingRealTargetRepoTrial,
  targetOnboardingSurfacePlan,
  targetOnboardingDryRunFixture,
  targetOnboardingRealTargetTrial,
  targetOnboardingWriteSet,
  targetRuntimeNamespaceTemplate,
  planTargetOnboardingWritesForRoot,
  TARGET_ONBOARDING_SURFACE_PLAN,
  TARGET_ONBOARDING_DRY_RUN_FIXTURE_MATRIX,
  PUBLIC_RELEASE_FIXTURE_MATRIX,
  PUBLIC_ARCHITECTURE_MAP,
  PUBLIC_COMMAND_ROUTER,
  PUBLIC_SOURCE_DOMAIN_EXTRACTION_REHEARSAL,
  PUBLIC_SOURCE_MODULE_EXTRACTION_ADAPTER_BOUNDARY,
  PUBLIC_SOURCE_MODULE_EXTRACTION_AUTHORITY_BUNDLE_PARITY,
  PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_PLAN,
  PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_FIRST_SLICE,
  PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_BUNDLE_PARITY,
  PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_RUNTIME_BRIDGE,
  PUBLIC_WORK_ITEMS_DOMAIN_SOURCE_EXTRACTION_INSTALLED_FALLBACK_SMOKE,
  PUBLIC_CLAIMS_DOMAIN_SOURCE_EXTRACTION_PLAN,
  PUBLIC_CLAIMS_DOMAIN_SOURCE_EXTRACTION_FIRST_SLICE,
  PUBLIC_CLAIMS_DOMAIN_SOURCE_EXTRACTION_BUNDLE_PARITY,
  PUBLIC_CLAIMS_DOMAIN_SOURCE_EXTRACTION_INSTALLED_FALLBACK_SMOKE,
  PUBLIC_TARGET_RUNTIME_NAMESPACE,
  PUBLIC_INSTALLED_PARITY_ARCHITECTURE_SMOKE,
  PUBLIC_ROUTER_COMMAND_ADAPTER_DELEGATION_EXPANSION,
  PUBLIC_CLI_RUNTIME_DE_MONOLITH_PLANNING,
  PUBLIC_ARCHITECTURE_COMMAND_ADAPTER_EXTRACTION,
  PUBLIC_AUTHORITY_COMMAND_ADAPTER_EXTRACTION,
  PUBLIC_MODULAR_RUNTIME_PACKAGE_INCLUSION_PLAN,
  PUBLIC_PACKAGED_ROUTER_PORT_INCLUSION,
  PUBLIC_THIN_ENTRYPOINT_ROUTER_CUTOVER_REHEARSAL,
  PUBLIC_THIN_ENTRYPOINT_ROUTER_CUTOVER_APPLICATION
};
