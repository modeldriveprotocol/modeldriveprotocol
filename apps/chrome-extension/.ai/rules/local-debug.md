# Local Debug

Use this note when you need to launch the extension locally on macOS, inspect the local Chrome profile, or recover from known startup issues.

## Quick Local UI Flow

```bash
pnpm --filter @modeldriveprotocol/chrome-extension paths
mkdir -p apps/chrome-extension/.wxt/chrome-data
pnpm --filter @modeldriveprotocol/chrome-extension dev
```

## First Check On A New Machine

- Before trusting any Chrome-extension debug flow on a new machine, confirm whether you have a dedicated Chrome channel for debugging such as `Google Chrome Canary`.
- If the machine only has the regular `Google Chrome.app`, treat that as a setup risk immediately.
- On this machine, using the only installed stable Chrome for WXT debug caused a recurring conflict: opening or reusing the normal Chrome app could tear down the WXT-managed debug session or steal the app instance.
- The safest first move on a new machine is:
  1. check for `/Applications/Google Chrome Canary.app`
  2. if it does not exist, install it before starting extension E2E work
  3. point local `web-ext.config.ts` at Canary instead of stable Chrome
- Homebrew install command:

```bash
brew install --cask google-chrome@canary
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

- The previous recommendation to prefer `dev:manual` plus a hand-written `--load-extension` Chrome launch was too optimistic for this machine.
- In this environment, the reliable path for DevTools Protocol access is:
  1. create a gitignored `apps/chrome-extension/web-ext.config.ts`
  2. point it at `/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary`
  3. set `chromiumProfile` to `apps/chrome-extension/.artifacts/chrome-profile`
  4. set `chromiumArgs` to include `--remote-debugging-port=9227`
  5. run plain `pnpm --filter @modeldriveprotocol/chrome-extension dev`
- A working local override looked like:

```ts
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineWebExtConfig } from 'wxt'

const appRoot = fileURLToPath(new URL('.', import.meta.url))

export default defineWebExtConfig({
  binaries: {
    chrome: '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary'
  },
  chromiumProfile: resolve(appRoot, '.artifacts/chrome-profile'),
  keepProfileChanges: true,
  startUrls: ['about:blank'],
  chromiumArgs: [
    '--remote-debugging-port=9227',
    '--enable-unsafe-extension-debugging',
    '--unsafely-disable-devtools-self-xss-warnings',
    '--no-first-run',
    '--no-default-browser-check'
  ]
})
```

- With that override in place, `dev` reliably loaded the unpacked extension and exposed both the extension service worker target and the extension page targets over CDP.
- A fixed Vite port still helps avoid stale asset confusion. In the verified session, WXT served on `http://localhost:3001`.

```bash
pnpm --filter @modeldriveprotocol/chrome-extension dev
```

- If you need a fixed port explicitly, still pass it through:

```bash
pnpm --filter @modeldriveprotocol/chrome-extension dev -- --port 3001
```

- Do not assume a raw Chrome launch like this is enough:

```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --user-data-dir=/path/to/profile \
  --remote-debugging-port=9227 \
  --enable-unsafe-extension-debugging \
  --unsafely-disable-devtools-self-xss-warnings \
  --disable-extensions-except=/path/to/dist/chrome-mv3-dev \
  --load-extension=/path/to/dist/chrome-mv3-dev \
  about:blank
```

- On this machine that direct launch often left Chrome running without the unpacked extension actually appearing as a debuggable target, even though the browser itself opened.
- After WXT opens the browser, use `curl --noproxy '*' http://127.0.0.1:9227/json/list` and verify you can see:
  - a `service_worker` target for `chrome-extension://<id>/background.js`
  - at least one extension page target after opening `options.html` or `sidepanel.html`
- If `dev` is pointed at the only installed stable Chrome channel, opening a normal Chrome window can collapse or steal the debug session. Prefer Canary specifically to avoid that app-instance collision.
- When the local server is restarted, the extension may stay open but not reconnect immediately. The fastest recovery is to open `options.html` and send `runtime:refresh` from that page, or reload the extension service worker.
- When you reuse a profile, extension pages can keep pointing at a previous Vite port. If the options page title renders but the body is empty, inspect the page HTML and restart WXT on the same `localhost:<port>` referenced by the injected script tags.
