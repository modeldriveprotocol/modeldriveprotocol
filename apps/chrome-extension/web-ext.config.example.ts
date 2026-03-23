import { defineWebExtConfig } from 'wxt'

export default defineWebExtConfig({
  // Set to true if you want to stop auto-launching a dev browser and instead
  // load apps/chrome-extension/dist/chrome-mv3 manually in your own Chrome.
  // disabled: true,

  // Point WXT at a specific Chrome/Chromium binary on your machine.
  // binaries: {
  //   chrome: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  // },

  // Use your own local Chrome profile instead of the repo-scoped default.
  // chromiumProfile: '/absolute/path/to/your/chrome-profile',

  // Keep browser-side changes between WXT dev sessions.
  keepProfileChanges: true,

  // Open useful tabs when the dev browser starts.
  startUrls: [
    'chrome://extensions'
  ],

  // Useful when debugging background or content-script behavior.
  // openDevtools: true,
  // openConsole: true,

  // Extra Chromium flags if you need them locally.
  // chromiumArgs: ['--auto-open-devtools-for-tabs']
})
