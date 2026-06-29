# agent-onboard

CLI for onboarding and managing target repositories.

`agent-onboard` creates a small machine-readable and human-readable control surface inside a target repo. In the current `0.0.x` line, that surface is a convention/spec plus a reference CLI generator. It is not a sandbox, filesystem wrapper, CI policy engine, or runtime enforcement layer.

The generated files are intended to be read by agents, wrappers, CI hooks, or future runtimes that choose to honor the declared boundaries.

## Install

For the `0.0.x` line, install with `~0.0.9` so target repos can receive later `0.0.x` updates without crossing the `0.1.0` boundary:

```sh
npm install --save-dev agent-onboard@~0.0.9
```

Run without installing:

```sh
npx agent-onboard status
```

## Minimal target init

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

`agents --write` writes only:

```text
AGENTS.md
```

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
npx agent-onboard target bootstrap --dry-run
npx agent-onboard target bootstrap --write
npx agent-onboard target-instance takeover --dry-run
npx agent-onboard target-instance takeover --write
```

After install, these command names are available:

```sh
agent-onboard status
aob status
create-agent-onboard status
```

## Files written

Dry-run and preview commands write nothing.

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

The append command returns `counts_before`, `counts_after`, `added`, and `proposed_ledger`. It never writes in this release. It refuses missing ledgers, invalid ledgers, duplicate work-item IDs, and IDs outside the public P/S/M/W shape.

This release does not add work-item append write, claiming, closing, admission, conflict detection, or milestone governance. Those remain outside the command surface until documented and exposed by explicit commands.

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

<!-- ## Star History

[![Star History Chart](https://api.star-history.com/chart?repos=glogos-org/agent-onboard&type=date&legend=top-left)](https://www.star-history.com/?repos=glogos-org%2Fagent-onboard&type=date&legend=top-left) -->

## License

Apache-2.0. Copyright 2026 Glogos.
