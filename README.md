# agent-onboard

CLI for onboarding and managing target repositories.

`agent-onboard` creates a small machine-readable and human-readable control surface inside a target repo. In the current `0.0.x` line, that surface is a convention/spec plus a reference CLI generator. It is not a sandbox, filesystem wrapper, CI policy engine, or runtime enforcement layer.

The generated files are intended to be read by agents, wrappers, CI hooks, or future runtimes that choose to honor the declared boundaries.

## Install

For the `0.0.x` line, install with `latest` for the current public line, or pin a specific published version only in release verification evidence:

```sh
npm install --save-dev agent-onboard@latest
```

Run without installing:

```sh
npx agent-onboard status
```

## Minimal target init

Preview the target onboarding sequence before touching files:

```sh
npx agent-onboard target onboarding --plan
npx agent-onboard target onboarding --fixture
```

The plan and fixture are read-only. They declare the canonical target files, the preview commands, the explicit write command, and the guard check that should be run after a read-only target boundary exists.

Write the full canonical onboarding surface only after the target owner explicitly authorizes file creation:

```sh
npx agent-onboard target onboarding --write
```

`target onboarding --write` refuses to overwrite existing non-identical canonical files. To intentionally replace them:

```sh
npx agent-onboard target onboarding --write --force
```

Preview the files that would be created:

```sh
npx agent-onboard init --dry-run
```

Write the minimal target state:

```sh
npx agent-onboard init --write
```

`init --write` refuses to overwrite existing non-identical files. To intentionally replace existing target-state files:

```sh
npx agent-onboard init --write --force
```

## Agent instructions preview

Preview the canonical agent instruction file:

```sh
npx agent-onboard agents --preview
```

Write it to the target repo:

```sh
npx agent-onboard agents --write
```

`agents --write` writes only `AGENTS.md`. The aggregate `target onboarding --write` command writes the broader canonical target surface, including `llms.txt`, `.agent-onboard/authority-path.json`, and `.agent-onboard/runtime-namespace.json`.

It refuses to overwrite an existing non-identical `AGENTS.md` unless `--force` is passed:

```sh
npx agent-onboard agents --write --force
```

## Commands

```sh
npx agent-onboard status
npx agent-onboard init --dry-run
npx agent-onboard init --write
npx agent-onboard agents --preview
npx agent-onboard agents --write
npx agent-onboard guard --plan
npx agent-onboard guard --check-boundary
npx agent-onboard authority --first-read
npx agent-onboard authority --check
npx agent-onboard target runtime --namespace
npx agent-onboard target runtime --check
npx agent-onboard architecture --map
npx agent-onboard architecture --router
npx agent-onboard architecture --facades
npx agent-onboard architecture --partition-plan
npx agent-onboard architecture --partition-check
npx agent-onboard architecture --extraction-rehearsal
npx agent-onboard architecture --extraction-check
npx agent-onboard architecture --check
npx agent-onboard release --plan
npx agent-onboard release --contract
npx agent-onboard release --fixture
npx agent-onboard release --surface
npx agent-onboard release --surface-check
npx agent-onboard release --parity-smoke
npx agent-onboard release --architecture-parity-smoke
npx agent-onboard release --target-onboarding-smoke
npx agent-onboard release --post-publish-handoff
npx agent-onboard release --published-acceptance
npx agent-onboard release --real-target-trial
npx agent-onboard release --check
npx agent-onboard target-config --schema
npx agent-onboard target-config --template
npx agent-onboard target-config --validate-template
npx agent-onboard target-config --validate [agent-onboard.target.json]
npx agent-onboard work-items --schema
npx agent-onboard work-items --template
npx agent-onboard work-items --validate-template
npx agent-onboard work-items --init --dry-run
npx agent-onboard work-items --init --write
npx agent-onboard work-items --validate [.agent-onboard/work-items.json]
npx agent-onboard work-items --list [.agent-onboard/work-items.json]
npx agent-onboard work-items --append --dry-run --id <public-work-item-id> --title <title>
npx agent-onboard work-items --append --write --id <public-work-item-id> --title <title>
npx agent-onboard work-items --claim --dry-run --id <public-work-item-id> --actor <actor>
npx agent-onboard work-items --claim --write --id <public-work-item-id> --actor <actor>
npx agent-onboard work-items --close --dry-run --id <public-work-item-id> --actor <actor> --summary <summary>
npx agent-onboard work-items --close --write --id <public-work-item-id> --actor <actor> --summary <summary>
npx agent-onboard target runtime --namespace
npx agent-onboard target runtime --check
npx agent-onboard target onboarding --plan
npx agent-onboard target onboarding --fixture
npx agent-onboard target onboarding --trial
npx agent-onboard target onboarding --write
npx agent-onboard target bootstrap --dry-run
npx agent-onboard target bootstrap --write
npx agent-onboard target-instance takeover --dry-run
npx agent-onboard target-instance takeover --write
```

## Public architecture map

Print the public architecture kernel without moving files or writing state:

```sh
npx agent-onboard architecture --map
```

Inspect the public command router boundary without moving files or writing state:

```sh
npx agent-onboard architecture --router
```

Validate that the public architecture map still declares the six canonical domains, preserves the compact npm package boundary, admits the command router, domain service facade, authority first-read, target runtime, and source partition planning and source extraction rehearsal boundaries, and keeps architecture/authority inspection commands read-only:

```sh
npx agent-onboard architecture --check
```

The public architecture kernel is: `core`, `authority`, `work_items`, `claims`, `target`, and `release_package`. `0.0.29` adds the public command router boundary gate. `0.0.30` adds the public domain service facade gate: top-level routes declare their owning service facade, and `architecture --facades` reports the admitted facade layer while the published package still uses one compact CLI entrypoint. `0.0.31` adds the public authority first-read index gate: `authority --first-read` reports the canonical read order and `authority --check` validates `llms.txt` plus `.agent-onboard/authority-path.json` in source context while preserving the compact npm package allowlist. `0.0.32` adds the public target runtime namespace gate: `target runtime --namespace` reports the canonical `.agent-onboard/` namespace and `target runtime --check` validates `.agent-onboard/runtime-namespace.json` plus reserved future-file boundaries. `0.0.33` adds the public package surface preservation gate: `release --surface` reports the compact npm package surface and `release --surface-check` validates that source-only context stays out of the npm package allowlist. `0.0.34` adds the public installed parity architecture smoke gate: `release --architecture-parity-smoke` validates that the compact installed package still exposes architecture, source-partition, source-extraction, authority, target-runtime, and package-surface checks. `0.0.35` adds the public source domain module partition planning gate: `architecture --partition-plan` reports the future `src/domains/*` module map and `architecture --partition-check` validates that no physical source move is performed while the npm package remains compact. This release freezes public source-extraction golden outputs and adds version-sprawl protection: `architecture --golden-outputs` reports the frozen command set, `architecture --golden-check` validates it, and `release --version-sprawl-check` keeps `package.json#version` as the only patch-version source of truth. This release also adds the public source module extraction adapter boundary gate: `architecture --adapter-boundary` reports the stable CLI adapter boundary and `architecture --adapter-check` validates that future `src/domains/*` extraction must stay behind `cli/agent-onboard.js` without changing the compact npm package surface. This release adds the public source module extraction first slice gate: `architecture --first-slice` reports the source-only `core` domain slice and `architecture --first-slice-check` validates `src/domains/core.js` against the bundled CLI architecture without making it a published import API. This release adds the public source module extraction bundle parity gate: `architecture --bundle-parity` reports the source-slice versus bundled-CLI view and `architecture --bundle-parity-check` validates that the compact CLI bundle and source-only `core` module stay equivalent without expanding the npm package allowlist. This release adds the public source module extraction runtime bridge gate: `architecture --runtime-bridge` reports the guarded optional runtime bridge and `architecture --runtime-bridge-check` validates that source repository context can load `src/domains/core.js` while installed package context safely falls back to bundled CLI metadata. This release adds the public source module extraction installed fallback smoke gate: `architecture --installed-fallback-smoke` reports the projected installed fallback contract and `architecture --installed-fallback-check` validates that `src/domains/core.js` stays outside the npm package while installed context falls back to bundled CLI metadata. This release adds the public source module extraction second slice planning gate: `architecture --second-slice-plan` selects `authority` as the next planned source slice, `architecture --second-slice-check` validates that `src/domains/authority.js` is planned but not created, and `.gitignore` keeps source-only architecture artifacts trackable without expanding the npm package.

## Public source domain module partition plan

Print the source-domain module partition plan without moving files:

```sh
npx agent-onboard architecture --partition-plan
```

Validate the partition plan and source-only `.agent-onboard/source-partition-plan.json` file when running from the source repo, or validate the embedded plan when running from an installed package:

```sh
npx agent-onboard architecture --partition-check
```

This gate does not create `src/domains/*`, move source code, change `package.json#files`, run package-manager commands, or publish. It only admits the future module boundaries for `core`, `authority`, `work_items`, `claims`, `target`, and `release_package` behind the already admitted service facades.

## Public source domain extraction rehearsal

Print the source-domain extraction rehearsal without creating modules or moving files:

```sh
npx agent-onboard architecture --extraction-rehearsal
```

Validate the rehearsal and source-only `.agent-onboard/source-extraction-rehearsal.json` file when running from the source repo, or validate the embedded rehearsal contract when running from an installed package:

```sh
npx agent-onboard architecture --extraction-check
```

Freeze and validate the command-output contract before physical source extraction:

```sh
npx agent-onboard architecture --golden-outputs
npx agent-onboard architecture --golden-check
npx agent-onboard architecture --adapter-boundary
npx agent-onboard architecture --adapter-check
npx agent-onboard architecture --first-slice
npx agent-onboard architecture --first-slice-check
npx agent-onboard architecture --bundle-parity
npx agent-onboard architecture --bundle-parity-check
npx agent-onboard architecture --runtime-bridge
npx agent-onboard architecture --runtime-bridge-check
npx agent-onboard architecture --installed-fallback-smoke
npx agent-onboard architecture --installed-fallback-check
npx agent-onboard architecture --second-slice-plan
npx agent-onboard architecture --second-slice-check
npx agent-onboard release --version-sprawl-check
```

This release adds the public source module extraction adapter boundary gate. This gate rehearses `src/domains/*` extraction behind the admitted service facades and then declares the stable adapter boundary that future physical modules must use. The next gate adds the first source-only physical slice for `core` while keeping CLI runtime output and the compact npm package surface unchanged.

This release adds the public source module extraction first slice gate. The first slice is `src/domains/core.js`, a source-only shadow module for read-only core metadata. It is checked by `architecture --first-slice-check`, is not included in `package.json#files`, is not a public import API, and is not required by the installed CLI runtime. This release adds bundle parity on top: `architecture --bundle-parity-check` compares the source-only slice with the bundled CLI architecture view and remains installed-package tolerant when `src/domains/core.js` is absent from npm installs. This release adds the public source module extraction runtime bridge gate: `architecture --runtime-bridge-check` validates a guarded optional bridge that loads `src/domains/core.js` in source context and falls back to bundled CLI metadata in installed package context. This release adds the public source module extraction installed fallback smoke gate: `architecture --installed-fallback-check` validates that compact npm installs can omit `src/domains/core.js` and still use bundled fallback metadata. This release adds the public source module extraction second slice planning gate: `architecture --second-slice-check` validates that `authority` is planned as the next source module slice, that `src/domains/authority.js` is not created in this gate, and that `.gitignore` tracks the source-only extraction artifacts.

## Public authority first-read index

Print the public authority read order without writing files:

```sh
npx agent-onboard authority --first-read
```

Validate the source authority files when running from a source repo, or validate the embedded authority contract when running from an installed package:

```sh
npx agent-onboard authority --check
```

The canonical read order is `AGENTS.md`, `llms.txt`, `.agent-onboard/authority-path.json`, `agent-onboard.target.json`, `.agent-onboard/runtime-namespace.json`, `.agent-onboard/project.json`, `.agent-onboard/work-items.json`, then `README.md`; raw evidence/source files are on-demand only after those authority files.

## Public target runtime namespace

Print the public target runtime namespace without writing files:

```sh
npx agent-onboard target runtime --namespace
```

Validate the embedded namespace contract and, in source context, `.agent-onboard/runtime-namespace.json`:

```sh
npx agent-onboard target runtime --check
```

The canonical runtime namespace root is `.agent-onboard/`. The admitted runtime files are `.agent-onboard/runtime-namespace.json`, `.agent-onboard/project.json`, `.agent-onboard/work-items.json`, and `.agent-onboard/authority-path.json`. Reserved future files such as `.agent-onboard/claims.jsonl` and `.agent-onboard/events.jsonl` are declared but not written by this gate.

## Public release verification

For a source release candidate, validate the package-owned release contract before publishing:

```sh
npx agent-onboard release --check
```

The check validates package metadata, bin entrypoints, the projected npm pack allowlist, public artifact messaging, the public architecture map, the public command router, public domain service facades, the public authority first-read index, the public target runtime namespace, the public source domain module partition plan, the public source domain extraction rehearsal, the public package surface preservation gate, the installed parity architecture smoke, and the source work-item ledger when that ledger is present. It does not publish, mutate registry state, install dependencies, or run Git operations. The response reports whether it is running in a source-repository context or an installed-package context, then includes local pre-publish commands and post-publish verification commands for the operator.

Preview the release plan without running validation:

```sh
npx agent-onboard release --plan
```

Print the normalized release contract without running validation:

```sh
npx agent-onboard release --contract
```

Print the release fixture matrix without mutating files, package state, or registry state:

```sh
npx agent-onboard release --fixture
```

The fixture matrix documents the contract regression cases used by the source tests: valid source context, valid installed-package context, stale package version, npm pack allowlist drift, missing bin entrypoint, reserved public artifact messaging tokens, projected installed-package parity smoke, target onboarding installed-package smoke, target onboarding post-publish handoff, published package acceptance rehearsal, real target repo trial, public architecture map, public command router boundary, public domain service facade boundary, public authority first-read index boundary, public target runtime namespace boundary, public source domain module partition planning boundary, public source domain extraction rehearsal boundary, public package surface preservation boundary, and public installed parity architecture smoke boundary.

Run the installed package parity smoke without executing package-manager, registry, Git, build, or temp-file write operations:

```sh
npx agent-onboard release --parity-smoke
```


The package surface check validates that the npm package remains exactly `LICENSE`, `README.md`, `cli/agent-onboard.js`, and `package.json`. Source-only operating files such as `AGENTS.md`, `llms.txt`, `.agent-onboard/*.json`, and tests must stay outside the npm pack projection.

The parity smoke checks that the source candidate release check passes, the projected npm package file set matches the contract, source-only context files stay out of the npm package, bin entrypoints are included in the projected package, and `package.json` version matches the runtime version.

Run the installed parity architecture smoke without executing package-manager, registry, Git, build, or temp-file write operations:

```sh
npx agent-onboard release --architecture-parity-smoke
```

The architecture parity smoke validates that architecture, source-partition, source-extraction, authority, target-runtime, and package-surface checks still pass when the package is evaluated from the compact installed-package context where source-only repository files may be absent.

Run the target onboarding installed-package smoke to exercise the package runtime against a temporary target repo:

```sh
npx agent-onboard release --target-onboarding-smoke
```

The target onboarding smoke creates and removes a temporary target repo, runs the target onboarding plan and fixture, writes only the canonical onboarding files into that temporary target, and verifies the generated read-only boundary config. It does not mutate the package root, Git, registry, dependencies, build, deploy, publish, or push state.

Emit the post-publish verification handoff for the exact package version:

```sh
npx agent-onboard release --post-publish-handoff
```

The post-publish handoff emits the version-pinned npm view and npx commands an operator should run after publishing. It includes metadata verification, installed-package release contract and fixture checks, parity smoke, target onboarding smoke, published acceptance, real target trial, architecture map/router/facades/partition-plan/partition-check/extraction-rehearsal/extraction-check/check, authority first-read/check, release check, and target onboarding plan/fixture/trial checks. The command itself does not query the registry, publish, mutate registry state, install dependencies, run Git, or write target files.

Run the published package acceptance check after publish with a version-pinned package, or locally as a source rehearsal before publish:

```sh
npx agent-onboard release --published-acceptance
```

The published acceptance command composes release check, post-publish handoff validation, parity smoke, target onboarding smoke, target onboarding plan, target onboarding fixture, and real target trial. When run from `npx agent-onboard@<version>` after publish it should report an installed-package context; when run in the source repo before publish it reports source-repository rehearsal. It does not publish, mutate registry state, install dependencies, run Git, or write target files outside its temporary smoke target.

Run the real target trial gate without writing target files:

```sh
npx agent-onboard release --real-target-trial
```

The real target trial command runs a no-write onboarding readiness check against a realistic temporary target repo. It verifies that target onboarding projects only canonical files, reports conflict readiness before writes, avoids package-manager/Git/build/publish operations, and cleans up its temporary target.

After install, these command names are available:

```sh
agent-onboard status
aob status
create-agent-onboard status
```

## Target onboarding plan

Print the public target onboarding sequence without writing files:

```sh
npx agent-onboard target onboarding --plan
npx agent-onboard target onboarding --fixture
```

The plan reports the target identity inferred from the current directory, the canonical files, the read-only preview phases, the aggregate explicit write phase, lower-level write phases, and the no-mutation boundary for the plan command itself. It is the first command to run when deciding how to onboard a target repo.

Print the public target onboarding fixture matrix without writing files:

```sh
npx agent-onboard target onboarding --fixture
```

The fixture matrix covers the read-only plan, target bootstrap dry-run, target instance takeover dry-run, AGENTS.md preview, aggregate explicit-write projection, conflict detection, and force-preview/no-write behavior.

Run a no-write trial against the current target repo before explicit onboarding writes:

```sh
npx agent-onboard target onboarding --trial
```

Run the same trial against an explicit target path from outside that repo:

```sh
npx agent-onboard target onboarding --trial --target <target-repo-path>
```

The trial reports target identity, planned canonical files, conflicts with existing non-identical files, and whether the target is ready for an explicit `target onboarding --write`. It writes nothing.

Write the aggregate canonical onboarding surface with one explicit command:

```sh
npx agent-onboard target onboarding --write
```

This writes only the canonical onboarding files, never installs dependencies, never runs build/test/deploy commands, never publishes or pushes, and never mutates Git state. It refuses divergent existing files unless `--force` is passed.

## Files written

Dry-run and preview commands write nothing.

`target onboarding --write` writes the full canonical onboarding surface:

```text
agent-onboard.target.json
.agent-onboard/project.json
.agent-onboard/work-items.json
AGENTS.md
```

`init --write` writes the complete minimal public target state:

```text
agent-onboard.target.json
.agent-onboard/project.json
.agent-onboard/work-items.json
```

`agents --write` writes the public agent instruction surface:

```text
AGENTS.md
```

`work-items --init --write` writes only the public work-item ledger:

```text
.agent-onboard/work-items.json
```

The older explicit subcommands remain available:

`target bootstrap --write` writes:

```text
agent-onboard.target.json
```

`target-instance takeover --write` writes:

```text
.agent-onboard/project.json
.agent-onboard/work-items.json
```

## Public P/S/M/W work item ledger init

`agent-onboard` now exposes the public vocabulary used by `.agent-onboard/work-items.json`:

```text
P = Program
S = Stage
M = Milestone
W = Work Item
```

The generated work-item ledger is intentionally empty at initialization. It establishes the public JSON shape without importing pre-existing target state, milestone history, or generated provenance.

Initialize only the canonical work-item ledger without writing the rest of the target state:

```sh
npx agent-onboard work-items --init --dry-run
npx agent-onboard work-items --init --write
```

`work-items --init --write` writes only:

```text
.agent-onboard/work-items.json
```

It refuses to overwrite an existing non-identical ledger unless `--force` is passed:

```sh
npx agent-onboard work-items --init --write --force
```

Inspect the embedded schema:

```sh
npx agent-onboard work-items --schema
```

Print the embedded template:

```sh
npx agent-onboard work-items --template
```

Validate the embedded template:

```sh
npx agent-onboard work-items --validate-template
```

Validate or list the target repo ledger after `init --write`, `target-instance takeover --write`, or `work-items --init --write`:

```sh
npx agent-onboard work-items --validate
npx agent-onboard work-items --list
```

Preview a public work-item append without writing the ledger:

```sh
npx agent-onboard work-items --append --dry-run --id <public-work-item-id> --title <title>
```

Optional parent titles can be previewed when the referenced program, stage, or milestone is not already present:

```sh
npx agent-onboard work-items --append --dry-run \
  --id <public-work-item-id> \
  --title <title> \
  --program-title <program-title> \
  --stage-title <stage-title> \
  --milestone-title <milestone-title>
```

The append command returns `counts_before`, `counts_after`, `added`, and `proposed_ledger`. In dry-run mode it writes nothing. In write mode it writes only the canonical work-item ledger:

```text
.agent-onboard/work-items.json
```

Write a public work item into the target repo ledger:

```sh
npx agent-onboard work-items --append --write --id <public-work-item-id> --title <title>
```

The append command refuses missing ledgers, invalid ledgers, duplicate work-item IDs, and IDs outside the public P/S/M/W shape.

Preview a public claim without writing the ledger:

```sh
npx agent-onboard work-items --claim --dry-run --id <public-work-item-id> --actor <actor>
```

Write a public claim into the canonical work-item ledger:

```sh
npx agent-onboard work-items --claim --write --id <public-work-item-id> --actor <actor>
```

The claim command reads the existing ledger, validates it, verifies that the requested work item exists and is still open, and returns `counts_before`, `counts_after`, `claimed`, and `proposed_ledger`. In dry-run mode it writes nothing. In write mode it writes only:

```text
.agent-onboard/work-items.json
```

Optional metadata can be supplied with `--claimed-at <timestamp>` and `--note <note>`. The claim command refuses missing ledgers, invalid ledgers, missing work-item IDs, closed work items, and already claimed work items.

The claim response also returns `next_steps`, a documented lifecycle hint for public participation. It tells the actor to inspect scope, modify only relevant files, validate with authorized checks, and hand off changed files plus pass/non-pass evidence.

Preview a public close without writing the ledger:

```sh
npx agent-onboard work-items --close --dry-run --id <public-work-item-id> --actor <actor> --summary <summary>
```

Write a public close into the canonical work-item ledger:

```sh
npx agent-onboard work-items --close --write --id <public-work-item-id> --actor <actor> --summary <summary>
```

The close command reads the existing ledger, validates it, verifies that the requested work item exists and is not already closed, and returns `counts_before`, `counts_after`, `closed`, `handoff_evidence`, and `proposed_ledger`. In dry-run mode it writes nothing. In write mode it writes only:

```text
.agent-onboard/work-items.json
```

Closure evidence accepts repeated metadata flags:

```sh
--changed-file <path>
--check <check-run>
--check-not-run <check-not-run>
--known-non-pass <known-non-pass-state>
```

Optional timestamp metadata can be supplied with `--closed-at <timestamp>`. The close command refuses missing ledgers, invalid ledgers, missing work-item IDs, and already closed work items.

## Public source participation lifecycle

For public human/agent participation, use this lifecycle:

```text
discover -> inspect -> claim -> work -> validate -> handoff -> close
```

The lifecycle is intentionally conservative:

- `discover`: read `AGENTS.md`, `agent-onboard.target.json`, `.agent-onboard/project.json`, and `.agent-onboard/work-items.json` when present.
- `inspect`: understand the assigned public work item before editing.
- `claim`: use `work-items --claim --dry-run` first, then `--write` only when explicitly authorized.
- `work`: edit only files needed for the claimed work item.
- `validate`: run only checks authorized by the owner or clearly permitted by the current task.
- `handoff`: report files changed, checks run, checks not run, and known non-pass states.
- `close`: record the handoff evidence envelope in the canonical work-item ledger only after the work item is ready to close.

Claiming or closing a work item is not permission to publish, push, install dependencies, overwrite existing instructions, or edit unrelated files.

If `agents --write` finds an existing non-identical `AGENTS.md`, it returns a conflict and writes nothing. That conflict is expected overwrite protection for target repos with their own agent instructions; merge manually or use `--force` only when the repository owner explicitly asks for replacement.

The current release surface keeps work-item closing narrow and adds a release contract check plus installed-package parity smoke for package and source contexts. Admission, conflict detection, and milestone governance remain outside the command surface until documented and exposed by explicit commands.

## Boundary guard seed

`agent-onboard guard --check-boundary` is the first narrow public enforcement seed. It reads `agent-onboard.target.json` from the current target repo root and exits non-zero when that declaration is not the default read-only dry-run boundary.

It passes only when the target config keeps:

```text
requested_mode: target_dry_run
authority_level: L1_read_only_preview
writes_allowed: false
managed_project_commands_allowed: 0
create_agent_onboard_runtime_state: false
install_dependencies: false
run_build_test_deploy: false
publish_or_push: false
```

Run it before dependency installs, build/test/deploy commands, publish/push operations, or broad write operations:

```sh
npx agent-onboard guard --check-boundary
```

This guard does not sandbox other tools and does not wrap shell commands. It only evaluates the declared boundary and fails closed when the target config is missing, invalid, or permissive.

## What the boundary files mean

`agent-onboard.target.json` declares the target repo's intended operating boundaries, including write policy, dependency-install policy, build/test/deploy policy, publish/push policy, and managed surfaces.

`AGENTS.md` gives agents a human-readable read order, default forbidden actions, dry-run-first operating mode, and reporting discipline.

In the current `0.0.x` line, these fields and instructions are declarative. They do not block other tools by themselves. A separate agent runtime, wrapper, CI hook, or future `agent-onboard` component must read the files and enforce the declared policy.

The generated config intentionally starts at:

```text
requested_mode: target_dry_run
authority_level: L1_read_only_preview
writes_allowed: false
```

Passing `--write` to this CLI only allows this CLI to write the requested public surface files. It does not raise the generated target authority level.

## Validation

`target-config --schema` prints the embedded target config schema.

`target-config --template` prints the embedded target config template.

`target-config --validate-template` validates the embedded target config template against that schema and returns non-zero if the template is invalid.

`target-config --validate [file]` validates an existing target config file. When no file is provided, it validates `agent-onboard.target.json` in the current directory.

## Safety boundaries of this CLI

This version does not:

- install dependencies;
- run builds, tests, deploys, publishes, or pushes;
- modify source files except the requested generated public surface files;
- write files unless `--write` is passed;
- overwrite existing non-identical target-state or agent-instruction files unless `--force` is passed;
- enforce filesystem, network, shell, Git, or package-manager policy for other tools.

## File meanings

`agent-onboard.target.json` is the target repo config and boundary declaration.

`.agent-onboard/project.json` is the runtime identity of the target repo.

`.agent-onboard/work-items.json` is the initial empty public P/S/M/W work-item ledger.

`AGENTS.md` is the human-readable agent instruction surface for the target repo.

## Version line

`0.0.1` is the first public package version.

`0.0.2` adds public repository hygiene and npm/GitHub metadata while staying below the `0.1.0` boundary.

`0.0.3` adds the public target config/init surface: top-level `init`, target config template printing, target config file validation, and default overwrite protection.

`0.0.4` adds the public agent instructions / `AGENTS.md` preview surface with guarded write support.

`0.0.6` is the boundary guard hotfix: it keeps the `guard --plan` and `guard --check-boundary` surface while keeping JSON output limited to documented fields.

`0.0.7` adds the P/S/M/W vocabulary and work-item ledger schema/template/list/validation surface with documented JSON output.

`0.0.8` adds the public `work-items --init --dry-run|--write` surface for initializing only `.agent-onboard/work-items.json` with overwrite protection.

`0.0.9` adds public `work-items --append --dry-run` for previewing a new work item and its missing parent chain without writing the ledger.

`0.0.10` adds public `work-items --append --write` for persisting a new work item to the canonical target repo ledger while still refusing missing ledgers, invalid ledgers, duplicate IDs, and non-public ID shapes.

`0.0.11` adds public `work-items --claim --dry-run` for previewing a claim against an existing open public work item without mutating the ledger.

`0.0.12` keeps the npm artifact compact while documenting the source-repository/public-package boundary more explicitly.

`0.0.13` adds source self-dogfood and agent participation support: the source repository can carry `AGENTS.md`, `agent-onboard.target.json`, `.agent-onboard/project.json`, `.agent-onboard/work-items.json`, and public `work-items --claim --write` for explicit participation claims.

`0.0.14` adds the public source participation lifecycle gate: claim responses include `next_steps`, generated `AGENTS.md` documents the discover/inspect/claim/work/validate/handoff loop, and README documents expected `AGENTS.md` conflict handling for target repos.

`0.0.15` adds the public handoff and closure evidence gate: `work-items --close --dry-run|--write` records a closure envelope with summary, changed files, checks run, checks not run, and known non-pass states.

`0.0.16` aligns public source closure tests and closes the fixture evidence gate with the closed handoff evidence state and preserves populated closure evidence for the handoff work item.

`0.0.17` adds public `release --plan` and `release --check` so a source release candidate can validate package metadata, projected npm pack files, bin entrypoints, public artifact messaging, and post-publish verification handoff without mutating the public registry.

`0.0.18` absorbs that release surface into a normalized public release contract: `release --contract` prints the contract, `release --check` reports source-vs-package context, and source-ledger validation runs when the source ledger is present.

`0.0.19` adds a public package contract fixture matrix: `release --fixture` prints the fixture matrix, and source tests now cover installed-package pass, stale package version, npm pack allowlist drift, missing bin entrypoint, and public artifact messaging failure cases.

`0.0.20` adds installed package parity smoke: `release --parity-smoke` validates the source candidate check, projected npm package file set, source-context exclusion, bin entrypoint inclusion, and package/runtime version parity without running package-manager, registry, Git, or build commands.

`0.0.21` adds the public target onboarding surface plan: `target onboarding --plan` prints the target onboarding sequence, canonical files, explicit write boundaries, and next candidate gate without mutating the target repo.
`0.0.22` adds the public target onboarding dry-run fixture matrix: `target onboarding --fixture` declares no-write regression fixtures for target bootstrap dry-run, target instance takeover dry-run, AGENTS.md preview, conflict detection, and force-preview behavior.

`0.0.23` adds the public target onboarding explicit write boundary: `target onboarding --write` writes the aggregate canonical onboarding surface only when explicitly requested and refuses divergent files unless `--force` is provided.

`0.0.24` adds the public target onboarding installed-package smoke: `release --target-onboarding-smoke` exercises target onboarding plan, fixture, and explicit write behavior against a temporary target repo from the package runtime.

`0.0.25` adds the public target onboarding post-publish verification handoff: `release --post-publish-handoff` emits version-pinned npm view and npx commands for operator verification after publish, including target onboarding plan, fixture, smoke, and release check coverage.

`0.0.26` adds the public target onboarding published package acceptance gate: `release --published-acceptance` composes release check, post-publish handoff validation, parity smoke, target onboarding smoke, plan, and fixture validation so the version-pinned published package can be accepted after registry verification.

`0.0.29` adds the public command router boundary gate: `architecture --router` reports the admitted table-driven top-level command router, explicit aliases, nested target route boundary, and no-write router inspection contract.

`0.0.30` adds the public domain service facade gate: `architecture --facades` reports the six admitted service facades, route-to-facade ownership, and the no-write facade inspection contract without requiring a physical source module split.

`0.0.31` adds the public authority first-read index gate: `authority --first-read` reports the canonical read order, `authority --check` validates `llms.txt` and `.agent-onboard/authority-path.json`, and target onboarding now projects those first-read files as canonical target surface files.

`0.0.32` adds the public target runtime namespace gate: `target runtime --namespace` reports the canonical `.agent-onboard/` namespace, `target runtime --check` validates `.agent-onboard/runtime-namespace.json`, and target onboarding projects the namespace file as a canonical target surface file.

`0.0.33` adds the public package surface preservation gate: `release --surface` reports the projected four-file npm package surface, `release --surface-check` validates the package allowlist and source-only exclusions, and `release --check` now includes the package surface preservation result.

`0.0.34` adds the public installed parity architecture smoke gate: `release --architecture-parity-smoke` validates the admitted architecture, authority, target runtime, and package surface checks in installed-package-compatible context, and `release --check` now includes the architecture parity result.

`0.0.35` adds the public source domain module partition planning gate: `architecture --partition-plan` reports the future `src/domains/*` module map and `architecture --partition-check` validates that no physical source move is performed while the npm package remains compact.

This release adds the public source extraction golden output freeze gate: `architecture --golden-outputs` reports the frozen command-output contract, `architecture --golden-check` validates it, and `release --version-sprawl-check` prevents current patch-version literals from spreading through source docs and tests.

<!-- ## Star History

[![Star History Chart](https://api.star-history.com/chart?repos=glogos-org/agent-onboard&type=date&legend=top-left)](https://www.star-history.com/?repos=glogos-org%2Fagent-onboard&type=date&legend=top-left) -->

## Source self-dogfood and agent participation

The source repository can carry its own public Agent-Onboard operating surface:

- `AGENTS.md` gives human-readable rules for agents.
- `agent-onboard.target.json` declares the target-repo boundary.
- `llms.txt` gives the AI-readable first-read entrypoint.
- `.agent-onboard/authority-path.json` records the first-read order.
- `.agent-onboard/runtime-namespace.json` declares the target runtime namespace.
- `.agent-onboard/project.json` records the target identity.
- `.agent-onboard/work-items.json` stores the public work-item ledger.

Agent participation is explicit. An agent should first list the ledger, then claim only an assigned work item:

```sh
npx agent-onboard work-items --list
npx agent-onboard work-items --claim --dry-run --id <public-work-item-id> --actor <agent-or-human-name>
npx agent-onboard work-items --claim --write --id <public-work-item-id> --actor <agent-or-human-name>
```

The npm package surface remains intentionally compact. The self-dogfood files are source-repository operating files and are not included in the public npm tarball.

## License

Apache-2.0. Copyright 2026 Glogos.

### Public source module extraction second slice first-slice gate

```sh
npx agent-onboard architecture --second-slice-first-slice
npx agent-onboard architecture --second-slice-first-slice-check
```

This gate creates `src/domains/authority.js` as a source-only authority slice while preserving the compact published npm package surface.
