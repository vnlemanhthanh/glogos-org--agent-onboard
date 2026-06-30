# AGENTS.md

## Agent-Onboard source repository rules

This repository dogfoods `agent-onboard` as a target repository for public agent-assisted development.

## Read order

Before proposing or making changes, read:

1. `AGENTS.md`
2. `agent-onboard.target.json`
3. `.agent-onboard/project.json`
4. `.agent-onboard/work-items.json`

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
npx agent-onboard@0.0.26 target onboarding --plan
npx agent-onboard@0.0.26 target onboarding --fixture
```

Use the aggregate onboarding write command only when the repository owner explicitly authorizes canonical target file creation or replacement:

```sh
npx agent-onboard@0.0.26 target onboarding --write
```

Validate the public release contract and source/package surface before any package publish handoff:

```sh
npx agent-onboard@0.0.26 release --check
```

Inspect the normalized release contract:

```sh
npx agent-onboard@0.0.26 release --contract
```

Inspect the release fixture matrix:

```sh
npx agent-onboard@0.0.26 release --fixture
```

Run the installed package parity smoke:

```sh
npx agent-onboard@0.0.26 release --parity-smoke
```

Run the target onboarding installed-package smoke before publish handoff:

```sh
npx agent-onboard@0.0.26 release --target-onboarding-smoke
```

Inspect the post-publish verification handoff before publishing:

```sh
npx agent-onboard@0.0.26 release --post-publish-handoff
```

Run the published package acceptance rehearsal before publish, then the version-pinned acceptance check after publish:

```sh
npx agent-onboard@0.0.26 release --published-acceptance
```

Inspect the public ledger:

```sh
npx agent-onboard@0.0.26 work-items --list
```

Claim an assigned work item only with an explicit write command:

```sh
npx agent-onboard@0.0.26 work-items --claim --write --id <public-work-item-id> --actor <agent-or-human-name>
```

After claiming, follow the `next_steps` returned by the CLI. Claiming is not admission to publish, push, install dependencies, or edit unrelated files.

Preview closure evidence before writing it:

```sh
npx agent-onboard@0.0.26 work-items --close --dry-run --id <public-work-item-id> --actor <agent-or-human-name> --summary <summary>
```

A closure must separate changed files, checks run, checks not run, and known non-pass states.

If a target repo already has a non-identical `AGENTS.md`, treat the conflict as expected overwrite protection. Do not force overwrite unless the repository owner explicitly requests it.

Report changed files, checks run, checks not run, and known non-pass states separately.
