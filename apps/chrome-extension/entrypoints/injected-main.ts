import { installInjectedMainWorldBridge } from '../src/page/injected-main.js'

export default defineUnlistedScript(() => {
  installInjectedMainWorldBridge()
})
