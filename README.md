# agent-onboard

CLI for onboarding and managing target repositories.

`agent-onboard` creates a small machine-readable control surface inside a target repo. In the current `0.0.x` line, that surface is a convention/spec plus a reference CLI generator. It is not a sandbox, filesystem wrapper, CI policy engine, or runtime enforcement layer.

The generated files are intended to be read by agents, wrappers, CI hooks, or future runtimes that choose to honor the declared boundaries.

## Install

For the `0.0.x` line, install with `~0.0.2` so target repos can receive later `0.0.x` updates without crossing the `0.1.0` boundary:

```sh
npm install --save-dev agent-onboard@~0.0.2
```

Run without installing:

```sh
npx agent-onboard status
```

## Commands

```sh
npx agent-onboard status
npx agent-onboard target-config --schema
npx agent-onboard target-config --validate-template
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

Dry-run commands write nothing.

`target bootstrap --write` writes:

```text
agent-onboard.target.json
```

`target-instance takeover --write` writes:

```text
.agent-onboard/project.json
.agent-onboard/work-items.json
```

The complete minimal target state is:

```text
agent-onboard.target.json
.agent-onboard/project.json
.agent-onboard/work-items.json
```

## What the boundary file means

`agent-onboard.target.json` declares the target repo's intended operating boundaries, including write policy, dependency-install policy, build/test/deploy policy, publish/push policy, and managed surfaces.

In the current `0.0.x` line, these fields are declarative. They do not block other tools by themselves. A separate agent runtime, wrapper, CI hook, or future `agent-onboard` component must read the file and enforce the declared policy.

The generated config intentionally starts at:

```text
requested_mode: target_dry_run
authority_level: L1_read_only_preview
writes_allowed: false
```

Passing `--write` to this CLI only allows this CLI to write the initial target-state files. It does not raise the generated target authority level.

## Validation

`target-config --schema` prints the embedded target config schema.

`target-config --validate-template` validates the embedded target config template against that schema and returns non-zero if the template is invalid.

## Safety boundaries of this CLI

This version does not:

- install dependencies;
- run builds, tests, deploys, publishes, or pushes;
- modify source files;
- write files unless `--write` is passed;
- enforce filesystem, network, shell, Git, or package-manager policy for other tools.

## File meanings

`agent-onboard.target.json` is the target repo config and boundary declaration.

`.agent-onboard/project.json` is the runtime identity of the target repo.

`.agent-onboard/work-items.json` is the initial empty work-item ledger.

## Version line

`0.0.1` is the first public package version. `0.0.2` adds public repository hygiene and npm/GitHub metadata while staying below the `0.1.0` boundary.

<!-- ## Star History

[![Star History Chart](https://api.star-history.com/chart?repos=glogos-org/agent-onboard&type=date&legend=top-left)](https://www.star-history.com/?repos=glogos-org%2Fagent-onboard&type=date&legend=top-left) -->

## License

Apache-2.0. Copyright 2026 Glogos.
