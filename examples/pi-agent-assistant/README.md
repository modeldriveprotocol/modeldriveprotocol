# Pi Agent Assistant Example

This example shows one practical split:

- `pi-agent-core` runs the agent loop
- MDP bridges runtime-local tools into that loop
- a browser page owns the live inbox state and exposes tools/resources through MDP

## What you get

- a browser runtime with local support tickets
- MDP tools for `listTickets`, `getTicket`, and `saveDraft`
- an MDP resource for the local reply playbook
- a Node runner that starts the MDP server, waits for the browser runtime, and lets a Pi agent draft and save a reply

## Run it

1. Build this repo once from the repo root:

   ```bash
   pnpm build
   ```

2. Install the example-local dependencies:

   ```bash
   cd examples/pi-agent-assistant
   npm install
   ```

3. Serve the browser runtime:

   ```bash
   npm run start:web
   ```

4. Open [http://127.0.0.1:4173](http://127.0.0.1:4173) and keep the tab open.

5. In another shell, provide your model credentials and start the Pi agent:

   ```bash
   export OPENAI_API_KEY=...
   npm run start:agent -- "Review open tickets, read the playbook, and save a calm reply draft for the most urgent unresolved ticket."
   ```

By default the runner uses `openai/gpt-4o-mini`. Override with:

```bash
export PI_MODEL_PROVIDER=anthropic
export PI_MODEL_ID=claude-sonnet-4-20250514
```

## Files

- `index.html`: browser runtime and local inbox UI
- `agent-runner.mjs`: Pi agent host that talks to the MDP bridge over MCP

## Flow

1. `agent-runner.mjs` launches `packages/server/dist/cli.js`
2. the browser page connects to `ws://127.0.0.1:7070` and registers its capabilities
3. the Pi agent uses MCP bridge tools such as `callTools` and `readResource`
4. the browser runtime saves the draft locally so you can see the result immediately
