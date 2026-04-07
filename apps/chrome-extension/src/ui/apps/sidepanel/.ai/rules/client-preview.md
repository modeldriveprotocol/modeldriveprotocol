# Sidepanel Client Preview

Use this note when changing the sidepanel client list, client card interactions, or the inline asset preview shown inside expanded client cards.

## Goal

Keep the sidepanel compact and low-friction:

- client cards stay scannable at rest
- actions appear only when needed
- type and status use iconography, not repeated text labels
- expanded content previews real exposed assets, starting from `SKILL.md`

## List Interaction Rules

- do not force sidepanel cards into a single-open accordion; multiple cards can be expanded at once and none should be required to stay open
- keep title clicks navigable to the corresponding `options` detail route even if the card also supports inline expansion
- do not add redundant "open client" or "open client list" buttons when the title already provides navigation
- default the row meta slot to passive information such as creation time; swap to actions only on hover, focus, or menu-open state
- delay the hover swap slightly so actions do not flash when the pointer just passes over the row
- keep search and the filter-toggle affordance as one control: the toggle lives inside the input on the right, and the filter row expands downward below the search field
- use icon-only filter actions with tooltips; do not keep text chips or duplicate labels visible all the time

## Card Visual Rules

- type markers belong immediately to the left of the client name
- connection state belongs as a badge overlaid on the bottom-right of the main client icon, not as a separate text row or right-column label
- remove explanatory filler text once the card already has a direct asset preview; the expanded area should earn its space

## Asset Preview Rules

- expanded cards should render the actual exposed `SKILL.md` content by default, not a hand-written summary block
- above the preview, show the current asset path using the same breadcrumb/path-bar language as the `options` asset workspace
- clicking a path segment or scope node should reveal sibling resources at that same level: folders, files, and leaf endpoints that share the selected parent
- do not present a flat global picker once the preview has hierarchical structure
- preview paths should not show or depend on a synthetic `/extension` prefix; register and render the real root-relative path model
- if a file and a folder share the same label, disambiguate them by full path and make folder labels visibly distinct in menus, for example `clients/` versus `clients`

## Validation Rules

- verify sidepanel changes in the real extension page, not only in `options`
- after a client-preview refactor, prove:
  1. cards can expand independently
  2. title click still navigates to the right `options` route
  3. the default preview opens `SKILL.md`
  4. switching from the path bar updates the preview body correctly
  5. same-named file/folder paths resolve to the intended node
