import { installContentScript } from '../src/page/content-script.js'

export default defineUnlistedScript(() => {
  installContentScript()
})
