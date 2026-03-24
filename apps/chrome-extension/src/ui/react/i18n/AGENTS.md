# I18n Agents

- Keep provider/hooks in `index.tsx` and message dictionaries in small topic files.
- Add new messages to the smallest topic file that matches the surface instead of expanding one global dictionary.
- Do not mix storage access, UI rendering, or feature logic into locale/message modules.
- If a dictionary file grows near 300 lines, split by page section or feature area before adding more keys.
