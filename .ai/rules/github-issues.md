# GitHub Issues

Use this note when creating, editing, or reviewing GitHub issues or GitHub issue templates for this repository.

## Current Convention

Use issue titles that encode both type and primary repo area:

- `Feat(<Area>): <summary>`
- `Fix(<Area>): <summary>`
- `Docs(<Area>): <summary>`
- `Question(<Area>): <summary>`

Examples:

- `Feat(Chrome Extension): support TypeScript route scripts in the asset editor and Monaco`
- `Fix(Server): reject duplicate cluster member ids during discovery`
- `Docs(Client SDK): clarify browser bundle usage`
- `Question(Protocol): should path descriptors remain the stable API surface?`

## Before Creating An Issue

- search existing issues first to avoid duplicates
- identify the primary repo area so the title prefix and scope are concrete
- gather code references when the request comes from an implementation gap, not just a product idea

## Issue Type Workflow

This repository now ships issue forms at:

- `.github/ISSUE_TEMPLATE/feature-request.yml`
- `.github/ISSUE_TEMPLATE/bug-report.yml`
- `.github/ISSUE_TEMPLATE/documentation-request.yml`
- `.github/ISSUE_TEMPLATE/question.yml`

Choose the smallest matching form:

1. `feature-request.yml`
   for new capabilities, enhancements, or intentionally expanded behavior
2. `bug-report.yml`
   for incorrect behavior, regressions, broken validation, or runtime defects
3. `documentation-request.yml`
   for missing, outdated, incorrect, or unclear documentation
4. `question.yml`
   for clarification requests when the task is not yet a confirmed feature or bug

When creating any issue:

1. start from the matching form instead of a blank issue
2. replace the title placeholder with a real typed title before submitting
3. fill in the structured fields completely enough for follow-up work to act on them
4. include code paths or issue links in references when the issue is grounded in current implementation

## Writing Standard

Prefer issues that make execution straightforward:

- state the current limitation clearly
- describe the requested behavior, not just the symptom
- define scope boundaries so follow-up work knows which layers are in play
- include acceptance criteria that can be tested
- call out compatibility constraints when existing behavior must keep working
- keep the issue type aligned with the actual ask; do not file open questions as features or bugs prematurely

## Issue Template Changes

If the task is about issue intake rather than one specific issue:

- keep issue forms under `.github/ISSUE_TEMPLATE/`
- keep title guidance explicit in both the form title placeholder and form body
- prefer structured fields over free-form prose when the information is routinely needed to implement work
- if blank issues stay disabled, make sure there is an appropriate form for the expected issue type

## Validation

After editing issue template YAML files, validate them with:

```bash
ruby -e 'require "yaml"; YAML.load_file(ARGV[0])' .github/ISSUE_TEMPLATE/<file>.yml
```

If you add or change template routing behavior, also read:

- `.github/AGENTS.md`
