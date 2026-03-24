# Options Sections Agents

- Each section file should own one screen or one editor panel.
- Shared controls belong in `../shared.tsx` or dedicated local helpers, not copied between sections.
- If a section needs nested editors, split them into sibling files instead of keeping one large render function.
