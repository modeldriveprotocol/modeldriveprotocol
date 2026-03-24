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
- Once the browser is up, opening `chrome-extension://<extension-id>/popup.html` and `chrome-extension://<extension-id>/options.html` is a reliable way to bring the UI to the foreground for a quick visual check.
