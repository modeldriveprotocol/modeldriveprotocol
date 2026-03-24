import { installInjectedMainWorldBridge } from '#~/page/injected-main.js'

export default defineUnlistedScript(() => {
  installInjectedMainWorldBridge()
})
