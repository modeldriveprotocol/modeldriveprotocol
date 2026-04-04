# Visual Review

Use this note only when the task is about seeing the actual UI, generating screenshots, or reviewing the rendered effect.

## Goal

Prefer a reproducible screenshot workflow over describing the UI from code.

Use this order:

1. run `pnpm --filter @modeldriveprotocol/chrome-extension build`
2. try a real extension preview in a local browser session when interactive Chrome is available
3. if headless extension pages fail, fall back to a high-fidelity local preview page that loads the built `chunks/**` and `assets/**` with mocked `chrome.*` data

## Known Environment Behavior

Notes from the March 24, 2026 preview session:

- In this environment, headless Chrome with `--load-extension=apps/chrome-extension/dist/chrome-mv3` exposed extension targets over DevTools, but the actual `popup.html` and `options.html` pages resolved to `chrome-error://chromewebdata/` with `ERR_FILE_NOT_FOUND`.
- Chrome logs also reported `content_verify_job` failures for `popup.html` and `options.html`.
- Do not assume that a visible DevTools target means the extension page rendered correctly.

Notes from the April 4, 2026 real-browser session:

- In manual WXT mode, the live extension pages load dev assets from `http://localhost:<port>/...`.
- A page can have the correct title and URL while still rendering an empty body when that Vite port is not serving the expected assets.
- Before trusting a screenshot, inspect `document.body.innerText` or `document.documentElement.outerHTML` over CDP and make sure the live page is not just an empty shell.
- Once the matching Vite port was serving, direct CDP screenshots of the real extension page worked and were more reliable than blind desktop crops.

## Stable Fallback

For stable visual review, a local preview root worked better:

- keep disposable preview assets under `apps/chrome-extension/.artifacts/`
- symlink built `dist/chrome-mv3/chunks` and `dist/chrome-mv3/assets` into the preview root
- create `popup-preview.html` / `options-preview.html` that inject realistic mocked `chrome.storage`, `chrome.runtime.sendMessage`, and `chrome.permissions` behavior before loading the built JS chunks
- serve with `python3 -m http.server`
- capture screenshots with headless Chrome against the local HTTP URL

Treat `.artifacts/**` as disposable local review helpers, not product code or durable fixtures.

## Real-Page Checklist

When the task requires proof in the real extension page instead of a fallback preview:

- make sure WXT is serving the same `localhost:<port>` referenced by the page HTML
- verify `document.body.innerText` contains the expected client or route labels before capture
- prefer screenshots from the real extension page target over desktop region captures
- keep the final image plus a short text summary of what was visually confirmed

## Review Checklist

When reviewing screenshots, explicitly check:

- whether the first-use path is obvious within 3 to 5 seconds
- whether the page shows the current state and the next recommended action
- whether empty, disabled, or mismatch states explain why
- whether popup is focused on current-page tasks and options is focused on workspace management
- whether important actions are visible without exposing all advanced controls at once
