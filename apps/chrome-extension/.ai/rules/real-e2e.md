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

Use WXT's normal `dev` runner and give it a gitignored `apps/chrome-extension/web-ext.config.ts` that:

- points `binaries.chrome` at `/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary`
- uses `apps/chrome-extension/.artifacts/chrome-profile` as `chromiumProfile`
- adds `--remote-debugging-port=9227`

Then start the extension:

```bash
pnpm --filter @modeldriveprotocol/chrome-extension dev -- --port 3001
```

Start a real local server on the default extension dev port:

```bash
node packages/server/dist/cli.js --port 47372
```

Do not prefer `dev:manual` plus a hand-built `--load-extension` Chrome launch here unless you are already blocked on the normal WXT runner.
That path looked viable earlier, but in the verified session it often opened Chrome without reliably surfacing the unpacked extension as a debuggable target.

Before starting on a new machine, first confirm a dedicated Chrome debug channel exists.
If the machine only has the regular stable Chrome app, install Canary first; otherwise the WXT-driven debug session can conflict with the user's normal Chrome windows and vanish mid-run.

## Real Caller Rule

Do not stop at helper functions or direct storage writes when the task requires end-to-end proof.

Use a real MCP consumer, for example:

- a short Node script that uses `@ai-sdk/mcp`
- `StdioClientTransport` against `packages/server/dist/cli.js`
- canonical bridge calls such as `listClients` and `callPath`

Wait for `listClients` to return `mdp-chrome-workspace` before starting the scenario.
If the local server started after the extension, open the real `options.html` page and trigger `runtime:refresh` once to force a reconnect; on this machine that was much faster than waiting for background reconnect on its own.

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

On this machine, the most reliable way to reach the page target was:

1. let WXT open Chrome
2. verify `http://127.0.0.1:9227/json/list` shows the extension service worker
3. open `chrome-extension://<extension-id>/options.html#/workspace`
4. re-read `/json/list` and connect to the newly created page target

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
- remove any temporary `web-ext.config.ts` override you created just for validation
- mention any kept screenshots or artifacts explicitly
