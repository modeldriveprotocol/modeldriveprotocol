# Codex CLI

Use this note when the task is about the Codex CLI itself, project-level MCP configuration for Codex, or debugging why Codex cannot see or use the local `mdp` MCP server from this repository.

## Quick Diagnosis

Start with Codex's own MCP view instead of guessing:

```bash
codex mcp list
codex mcp get mdp
```

If the server uses a repo-local launcher such as `scripts/run-local-mdp-mcp.mjs`, make sure the MCP entry also sets a working directory:

```toml
[mcp_servers.mdp]
command = "node"
args = ["scripts/run-local-mdp-mcp.mjs"]
cwd = "."
startup_timeout_sec = 20
```

Without `cwd`, Codex may launch from a different directory and fail before `initialize` completes.

## Preferred Verification Loop

Use a real Codex CLI run, not just static inspection:

```bash
codex exec --json --color never --dangerously-bypass-approvals-and-sandbox \
  "Use the mdp MCP server if available. Call its listClients tool once and report whether the call succeeded."
```

This gives the exact event stream:

- whether `mcp_tool_call` was attempted
- whether startup failed before the first tool call
- whether the failure came from launcher config or from the server itself

If you need to test a config fix before editing files, override it inline:

```bash
codex exec --json --color never --dangerously-bypass-approvals-and-sandbox \
  -c 'mcp_servers.mdp.cwd="."' \
  "Use the mdp MCP server if available. Call its listClients tool once and report whether the call succeeded."
```

## Known Repository Lessons

- The local `mdp` launcher is relative-path based. `cwd = "."` is required for reliable Codex CLI startup from this repository.
- The checked-in project example may still lag behind newer Codex CLI validation rules. If Codex reports `invalid transport in mcp_servers.mdp`, do not assume the MDP server is broken first.
- A fast isolation trick is to use a temporary `HOME`, run `codex mcp add mdp -- node /abs/path/to/scripts/run-local-mdp-mcp.mjs`, and test from a directory outside this repository. That bypasses any stale project config while keeping the same local launcher.
- A failure like `handshaking with MCP server failed: connection closed: initialize response` usually points to launcher config, especially missing `cwd`, before it points to an MDP protocol bug.
- If `codex exec` itself is returning OpenAI-side `500` or `401` errors before or during sampling, treat that as Codex transport/auth noise rather than as evidence about the local `mdp` MCP server.
- The `mdp` MCP bridge exposes tools such as `listClients`, `listPaths`, `callPath`, and `callPaths`. It does not expose MCP resources.
- Because of that, an empty `list_mcp_resources` result does not mean the `mdp` MCP server is unavailable.
- The reliable availability check is a real tool call such as `listClients`.

## Noise To Ignore Unless Correlated

Codex CLI may print warnings like:

- `state_5.sqlite ... migration 21 was previously applied but is missing`

Treat those as separate Codex state-db noise unless the MCP call itself also fails. Do not attribute an `mdp` launcher failure to those warnings without a direct causal signal.
