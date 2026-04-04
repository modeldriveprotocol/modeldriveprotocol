# Real End-To-End Validation

Use this note when unit tests and app-scoped builds are not enough, and you need proof that the Chrome extension works in a real browser with a real MCP or agent CLI caller.

## Goal

Prove the full hosted path:

1. the extension is loaded in a real Chrome profile
2. the background client connects to a real MDP server
3. a real MCP or agent CLI caller can reach the exposed paths
4. the expected UI state is visibly rendered in the browser
5. temporary test data is cleaned up afterwards

## Preferred Loop

Start the extension in manual WXT mode on a fixed Vite port:

```bash
MDP_WXT_MANUAL=1 pnpm --filter @modeldriveprotocol/chrome-extension dev -- --port 3001
```

Start a real local server on the default extension dev port:

```bash
node packages/server/dist/cli.js --port 47372
```

On this machine, the most reliable browser launch has been:

```bash
/Applications/Google\ Chrome\ Canary.app/Contents/MacOS/Google\ Chrome\ Canary \
  --user-data-dir=/Users/bytedance/projects/mdp/apps/chrome-extension/.wxt/chrome-data \
  --remote-debugging-port=9227 \
  --enable-unsafe-extension-debugging \
  --unsafely-disable-devtools-self-xss-warnings \
  about:blank
```

Use the persistent WXT profile so the extension id, workspace config, and prior login state are preserved across restarts.

## Real Caller Rule

Do not stop at helper functions or direct storage writes when the task requires end-to-end proof.

Use a real MCP consumer, for example:

- a short Node script that uses `@ai-sdk/mcp`
- `StdioClientTransport` against `packages/server/dist/cli.js`
- canonical bridge calls such as `listClients` and `callPath`

Wait for `listClients` to return `mdp-chrome-workspace` before starting the scenario.

## Known Runtime Behavior

Workspace-management writes trigger an extension runtime refresh.
During that window, the caller can receive transient errors such as:

- `Client "mdp-chrome-workspace" is not connected`
- `Client "mdp-chrome-workspace" was unregistered`

Treat those as reconnect windows, not as final failures.
The reliable loop is:

1. call the path
2. if the client was disconnected, poll `listClients`
3. wait for `mdp-chrome-workspace` to reappear
4. retry the mutating call

Use this retry pattern for `/extension/clients/create`, `/extension/clients/update`, `/extension/clients/delete`, and `/extension/clients/add-expose-rule`.

## Visual Confirmation

Real end-to-end proof requires a rendered browser result, not just CLI success.

Preferred capture flow:

1. open the real extension page in the live browser
2. connect to the page over Chrome DevTools Protocol
3. inspect `document.body.innerText` before taking a screenshot
4. capture the screenshot from the real extension page target

If the page title loads but `document.body.innerText` is empty, the page usually has not loaded its dev assets.
Inspect the page HTML and look for `http://localhost:<port>/...` script tags.
Run WXT on that same port and reload before trusting the screenshot.

Keep disposable evidence under:

- `apps/chrome-extension/.artifacts/`

Treat `.artifacts/**` as local validation output, not product code.

## Cleanup

Always remove temporary route clients, background clients, and route rules after the run.

Cleanup can happen through the same management paths or, if the session is already torn down, by editing `chrome.storage.local` from the extension service worker.

Before handing off:

- verify temporary client ids are gone from `chrome.storage.local`
- stop the local server, WXT dev server, and temporary browser session
- mention any kept screenshots or artifacts explicitly
