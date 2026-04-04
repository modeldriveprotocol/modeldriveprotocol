# UI Clarity

Use this note only when the task is about making the extension easier to understand, reducing information density, or improving popup/options interaction clarity.

## Principle

Do not make popup or options feel like raw control panels.

## Popup

`popup` is the current-page action surface. It should show:

- what page the user is on
- whether anything matches
- one recommended next step
- only the smallest useful set of actions for this moment

## Options

`options` is the workspace and asset management surface. It can be denser, but it should still present:

- a top-level guide or readiness summary first
- route match simulation and search second
- detailed editors after the summary layer

## Summary Before Detail

Prefer:

- checklist or readiness cards before full forms
- route match result before path-rule internals
- asset counts and previews before full JSON-like editors

## Delay Advanced Controls

Hide or delay advanced controls until the user has context:

- execution scripts
- raw serialized previews
- import/export flows
- deep selector metadata

Every advanced section must still answer:

- what this is
- why it matters
- what the user should do next

## Language

Prefer user-goal labels over internal architecture terms when possible. For example:

- "Create automation for this page" is clearer than exposing "route client" first
- "Page elements" is clearer than exposing "selector resources" first
- "Recorded flow" can be introduced before `flow.*` tool naming

## Blocked States

If a state blocks action, surface the reason and the fix in the same area:

- no matching route
- missing permission
- bridge not injected
- unsaved draft

If a new feature adds power but forces every user to read more UI before succeeding, it needs another presentation layer.
