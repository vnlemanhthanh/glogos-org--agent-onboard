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

## Work-item participation

Agents may inspect the public ledger:

```sh
npx agent-onboard@0.0.13 work-items --list
```

Agents may claim an assigned work item only with an explicit write command:

```sh
npx agent-onboard@0.0.13 work-items --claim --write --id <public-work-item-id> --actor <agent-or-human-name>
```

Report changed files, checks run, checks not run, and known non-pass states separately.
