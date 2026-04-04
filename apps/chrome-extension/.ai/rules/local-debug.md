# Local Debug

Use this note when you need to launch the extension locally on macOS, inspect the local Chrome profile, or recover from known startup issues.

## Quick Local UI Flow

```bash
pnpm --filter @modeldriveprotocol/chrome-extension paths
mkdir -p apps/chrome-extension/.wxt/chrome-data
pnpm --filter @modeldriveprotocol/chrome-extension dev
```

## Notes From The March 23, 2026 Debug Session

- `paths` confirms the two unpacked build directories and the persistent WXT Chromium profile under `apps/chrome-extension/.wxt/chrome-data`.
- `dev` successfully builds the unpacked development extension into `apps/chrome-extension/dist/chrome-mv3-dev` before attempting to launch the browser.
- On this machine, WXT launches `Google Chrome Canary` with `--user-data-dir=/Users/bytedance/projects/mdp/apps/chrome-extension/.wxt/chrome-data`.
- If `dev` fails with `ENOENT ... chrome-out.log`, the immediate fix is to create `apps/chrome-extension/.wxt/chrome-data` first and rerun `dev`.
- After launch, the extension id can be read from `apps/chrome-extension/.wxt/chrome-data/Default/Secure Preferences` by locating the extension whose `path` ends with `/apps/chrome-extension/dist/chrome-mv3-dev`.
- During the recorded session, that generated id was `jigghlocdbpecagpponmdkfmnhhiobfo`. Treat it as profile-local debug state, not as a stable id to hardcode.
- Once the browser is up, opening `chrome-extension://<extension-id>/sidepanel.html` and `chrome-extension://<extension-id>/options.html` is a reliable way to bring the UI to the foreground for a quick visual check.

## Notes From The April 4, 2026 Real E2E Session

- `dev:manual` is the safer base when you need the extension loaded in your own Chrome session and also need DevTools Protocol access.
- A fixed Vite port avoids confusion. The reliable command in this environment was:

```bash
MDP_WXT_MANUAL=1 pnpm --filter @modeldriveprotocol/chrome-extension dev -- --port 3001
```

- The most reliable manual browser launch on this machine was:

```bash
/Applications/Google\ Chrome\ Canary.app/Contents/MacOS/Google\ Chrome\ Canary \
  --user-data-dir=/Users/bytedance/projects/mdp/apps/chrome-extension/.wxt/chrome-data \
  --remote-debugging-port=9227 \
  --enable-unsafe-extension-debugging \
  --unsafely-disable-devtools-self-xss-warnings \
  about:blank
```

- When you reuse the persistent profile, extension pages can keep pointing at a previous Vite port. If the options page title renders but the body is empty, inspect the page HTML and restart WXT on the same `localhost:<port>` referenced by the injected script tags.
