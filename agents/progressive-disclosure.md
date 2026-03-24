# Progressive Disclosure

Use this note when the task is about how `AGENTS.md` files and nearby guide files should be written, organized, or extended anywhere in this repository.

## Meaning Here

In this repository, progressive disclosure is a documentation style first, not a UI style.

It means:

- each `AGENTS.md` should stay short and act as a router
- detailed lessons should live in focused companion files
- readers should only open the next file when the current task actually needs it
- durable guidance should be split by trigger and situation, not accumulated into one long memo

## Rules

When updating agent documentation:

- keep `AGENTS.md` as an index, not a knowledge dump
- add scenario-based routing rules such as:
  - if reviewing screenshots, read `visual-review.md`
  - if deciding validation scope, read `validation.md`
  - if simplifying popup/options UX, read `ui-clarity.md`
- put detailed operational knowledge into the smallest file that matches one recurring job
- avoid mixing unrelated lessons in one file just because they were learned in the same session
- if a note becomes broad, split it by task trigger instead of adding more headings

## Preferred Shape

Use this structure:

1. `AGENTS.md`
   purpose, boundaries, validation, and routing rules
2. `<scope>/agents/<topic>.md`
   detailed guidance for one recurring scenario

## Anti-Patterns

Avoid:

- copying full troubleshooting notes into `AGENTS.md`
- placing validation rules, screenshot workflow, architecture notes, and UX guidance in one long section without routing
- forcing every future reader to scan guidance that is irrelevant to their task

## Test

If a new contributor can answer "which file do I need next?" within a few seconds, the documentation is following progressive disclosure correctly.
