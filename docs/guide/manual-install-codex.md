---
title: Manual Install for Codex
status: MVP
---

# Manual Install for Codex

Use this page when you want to configure MDP in Codex explicitly instead of relying on `mdp setup`.

## Config File

Add this block to `~/.codex/config.toml`:

```toml
[mcp_servers.mdp]
command = "npx"
args = ["-y", "@modeldriveprotocol/server"]
```

After saving, confirm the entry:

```bash
codex mcp list
```

## CLI Alternative

If you prefer using the Codex CLI to write the entry, run:

```bash
codex mcp add mdp -- npx -y @modeldriveprotocol/server
```

## Related Pages

- [Quick Start](/guide/quick-start)
- [CLI Reference](/server/cli)
- [Deployment Modes](/server/deployment)
