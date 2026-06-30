# AGENTS.md

## Agent-Onboard source repository rules

This repository dogfoods `agent-onboard` as a target repository for public agent-assisted development.

## Read order

Before proposing or making changes, read:

1. `AGENTS.md`
2. `llms.txt`
3. `.agent-onboard/authority-path.json`
4. `agent-onboard.target.json`
5. `.agent-onboard/runtime-namespace.json`
6. `.agent-onboard/project.json`
7. `.agent-onboard/work-items.json`

## Default boundary

Forbidden by default unless the repository owner explicitly authorizes the action:

- dependency install, upgrade, or removal;
- build, test, publish, deploy, or Git mutation;
- source edits outside the assigned work item;
- mutation of `.agent-onboard/` files except through an explicit `agent-onboard` command or owner request.

## Work-item participation lifecycle

Use this source-repository lifecycle for public human/agent participation:

1. Discover: read this file and inspect the public ledger.
2. Inspect: read the assigned work-item scope and relevant files before editing.
3. Claim: claim only an assigned open work item with an explicit write command.
4. Work: modify only files needed for that work item.
5. Validate: run only checks authorized by the owner or clearly permitted by the current task.
6. Handoff: report changed files, checks run, checks not run, and known non-pass states.
7. Close: record a closure envelope only after handoff evidence is ready.

Run the target onboarding plan before expanding target-surface behavior:

```sh
node cli/agent-onboard.js target onboarding --plan
node cli/agent-onboard.js target onboarding --fixture
node cli/agent-onboard.js target onboarding --trial
```

Use the aggregate onboarding write command only when the repository owner explicitly authorizes canonical target file creation or replacement:

```sh
node cli/agent-onboard.js target onboarding --write
```


Inspect the public architecture kernel and source partition plan and extraction rehearsal before expanding command or domain behavior:

```sh
node cli/agent-onboard.js architecture --map
node cli/agent-onboard.js architecture --router
node cli/agent-onboard.js architecture --facades
node cli/agent-onboard.js architecture --partition-plan
node cli/agent-onboard.js architecture --partition-check
node cli/agent-onboard.js architecture --extraction-rehearsal
node cli/agent-onboard.js architecture --extraction-check
node cli/agent-onboard.js architecture --golden-outputs
node cli/agent-onboard.js architecture --golden-check
node cli/agent-onboard.js architecture --adapter-boundary
node cli/agent-onboard.js architecture --adapter-check
node cli/agent-onboard.js architecture --first-slice
node cli/agent-onboard.js architecture --first-slice-check
node cli/agent-onboard.js architecture --bundle-parity
node cli/agent-onboard.js architecture --bundle-parity-check
node cli/agent-onboard.js architecture --runtime-bridge
node cli/agent-onboard.js architecture --runtime-bridge-check
node cli/agent-onboard.js architecture --installed-fallback-smoke
node cli/agent-onboard.js architecture --installed-fallback-check
node cli/agent-onboard.js architecture --second-slice-plan
node cli/agent-onboard.js architecture --second-slice-check
node cli/agent-onboard.js architecture --authority-bundle-parity
node cli/agent-onboard.js architecture --authority-bundle-parity-check
node cli/agent-onboard.js architecture --authority-runtime-bridge
node cli/agent-onboard.js architecture --authority-runtime-bridge-check
node cli/agent-onboard.js architecture --m2-seed
node cli/agent-onboard.js architecture --m2-seed-check
node cli/agent-onboard.js architecture --work-items-plan
node cli/agent-onboard.js architecture --work-items-check
node cli/agent-onboard.js architecture --work-items-first-slice
node cli/agent-onboard.js architecture --work-items-first-slice-check
node cli/agent-onboard.js architecture --check
```

Inspect the public authority first-read index before expanding authority or target onboarding behavior:

```sh
node cli/agent-onboard.js authority --first-read
node cli/agent-onboard.js authority --check
```

Inspect the public target runtime namespace before expanding target runtime files:

```sh
node cli/agent-onboard.js target runtime --namespace
node cli/agent-onboard.js target runtime --check
```

Validate the public release contract and source/package surface before any package publish handoff:

```sh
node cli/agent-onboard.js release --check
```

Inspect the normalized release contract:

```sh
node cli/agent-onboard.js release --contract
```

Inspect the release fixture matrix:

```sh
node cli/agent-onboard.js release --fixture
node cli/agent-onboard.js release --surface
node cli/agent-onboard.js release --surface-check
node cli/agent-onboard.js release --version-sprawl-check
```

Run the installed package parity smoke:

```sh
node cli/agent-onboard.js release --parity-smoke
node cli/agent-onboard.js release --architecture-parity-smoke
```

Run the target onboarding installed-package smoke before publish handoff:

```sh
node cli/agent-onboard.js release --target-onboarding-smoke
```

Inspect the post-publish verification handoff before publishing:

```sh
node cli/agent-onboard.js release --post-publish-handoff
```

Run the published package acceptance rehearsal before publish, then the version-pinned acceptance check after publish:

```sh
node cli/agent-onboard.js release --published-acceptance
node cli/agent-onboard.js release --real-target-trial
```

Inspect the public ledger:

```sh
node cli/agent-onboard.js work-items --list
```

Claim an assigned work item only with an explicit write command:

```sh
node cli/agent-onboard.js work-items --claim --write --id <public-work-item-id> --actor <agent-or-human-name>
```

After claiming, follow the `next_steps` returned by the CLI. Claiming is not admission to publish, push, install dependencies, or edit unrelated files.

Preview closure evidence before writing it:

```sh
node cli/agent-onboard.js work-items --close --dry-run --id <public-work-item-id> --actor <agent-or-human-name> --summary <summary>
```

A closure must separate changed files, checks run, checks not run, and known non-pass states.

If a target repo already has a non-identical `AGENTS.md`, treat the conflict as expected overwrite protection. Do not force overwrite unless the repository owner explicitly requests it.

Report changed files, checks run, checks not run, and known non-pass states separately.

## Public source module extraction second slice first-slice gate

Run these source checks before publishing this gate:

```sh
node cli/agent-onboard.js architecture --second-slice-first-slice
node cli/agent-onboard.js architecture --second-slice-first-slice-check
node cli/agent-onboard.js architecture --authority-bundle-parity
node cli/agent-onboard.js architecture --authority-bundle-parity-check
node cli/agent-onboard.js architecture --authority-runtime-bridge
node cli/agent-onboard.js architecture --authority-runtime-bridge-check
```

The authority slice is source-only and is not a public import API.


## Public source module extraction authority bundle parity gate

Run these source checks before publishing this gate:

```sh
node cli/agent-onboard.js architecture --authority-bundle-parity
node cli/agent-onboard.js architecture --authority-bundle-parity-check
node cli/agent-onboard.js architecture --authority-runtime-bridge
node cli/agent-onboard.js architecture --authority-runtime-bridge-check
```

The authority source slice must remain source-only, read-only, outside `package.json#files`, and must exclude write-capable `agents` extraction.


## Architecture milestone transition

The architecture kernel milestone is closed. Before starting the next source-domain extraction task, inspect the milestone transition gate:

```sh
node cli/agent-onboard.js architecture --m2-seed
node cli/agent-onboard.js architecture --m2-seed-check
```

The next architecture milestone remains open. The work-items first slice and bundle parity gates are now closed; the next executable work item is the work-items runtime bridge gate.


## Public work-items domain source extraction bundle parity gate

Run these source checks before publishing this gate:

```sh
node cli/agent-onboard.js architecture --work-items-first-slice
node cli/agent-onboard.js architecture --work-items-first-slice-check
node cli/agent-onboard.js architecture --work-items-bundle-parity
node cli/agent-onboard.js architecture --work-items-bundle-parity-check
node cli/agent-onboard.js architecture --check
node cli/agent-onboard.js release --architecture-parity-smoke
node cli/agent-onboard.js release --check
```

The work-items source slice must remain source-only, outside `package.json#files`, and must keep `work-items --claim` and `work-items --close` reserved for a later claims-domain extraction gate.

## Work-items installed fallback smoke

Use `node cli/agent-onboard.js architecture --work-items-installed-fallback-smoke` and `node cli/agent-onboard.js architecture --work-items-installed-fallback-check` to verify that the source-only work-items module remains outside the npm package while installed context falls back to bundled CLI metadata. Claim and close behavior remain excluded from this slice.

## Public claims domain source extraction first-slice gate

Run these source checks before publishing this gate:

```sh
node cli/agent-onboard.js architecture --claims-plan
node cli/agent-onboard.js architecture --claims-check
node cli/agent-onboard.js architecture --claims-first-slice
node cli/agent-onboard.js architecture --claims-first-slice-check
node cli/agent-onboard.js architecture --check
node cli/agent-onboard.js release --check
```

The first-slice gate may create only `src/domains/claims.js` plus its source-only evidence artifact. It must not move the published `work-items --claim` or `work-items --close` runtime handlers, must keep `.agent-onboard/work-items.json` as the shared canonical ledger, and must keep the npm package allowlist compact.


## Public claims domain source extraction bundle parity gate

For this gate, run:

```bash
node cli/agent-onboard.js architecture --claims-bundle-parity
node cli/agent-onboard.js architecture --claims-bundle-parity-check
node cli/agent-onboard.js architecture --claims-runtime-bridge
node cli/agent-onboard.js architecture --claims-runtime-bridge-check
node cli/agent-onboard.js architecture --claims-installed-fallback-smoke
node cli/agent-onboard.js architecture --claims-installed-fallback-check
node cli/agent-onboard.js architecture --check
node cli/agent-onboard.js release --surface-check
node cli/agent-onboard.js release --check
```

The claims bundle parity gate may add only the source-only parity evidence artifact plus release/test/docs updates. It must not move the published `work-items --claim` or `work-items --close` handlers, must keep `.agent-onboard/work-items.json` as the shared canonical ledger, and must keep the npm package allowlist compact.

Claims installed fallback smoke rule: `src/domains/claims.js` remains source-only and outside `package.json#files`; installed context must resolve claims metadata through bundled fallback while preserving the shared `.agent-onboard/work-items.json` authority and excluding non-claim work-items commands.
