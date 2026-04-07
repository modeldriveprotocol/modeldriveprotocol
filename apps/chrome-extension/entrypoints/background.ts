import {
  clearBackgroundStartupDiagnostics,
  saveBackgroundStartupDiagnostics
} from '#~/shared/storage.js'
import { serializeError } from '#~/shared/utils.js'

function reportBackgroundBootstrapError(stage: string, error: unknown) {
  return saveBackgroundStartupDiagnostics({
    stage,
    updatedAt: new Date().toISOString(),
    ...serializeError(error)
  })
}

export default defineBackground(() => {
  globalThis.addEventListener('error', (event) => {
    void reportBackgroundBootstrapError('entrypoint:error', event.error ?? event.message)
  })
  globalThis.addEventListener('unhandledrejection', (event) => {
    void reportBackgroundBootstrapError('entrypoint:unhandledrejection', event.reason)
  })

  void clearBackgroundStartupDiagnostics()

  void import('#~/background/index.js')
    .then(({ startBackground }) => {
      try {
        startBackground()
      } catch (error) {
        void reportBackgroundBootstrapError('entrypoint:startBackground', error)
      }
    })
    .catch((error) => {
      void reportBackgroundBootstrapError('entrypoint:import', error)
    })
})
