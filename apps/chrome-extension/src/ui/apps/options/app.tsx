import { Alert } from '@mui/material'

import { useAppearance } from '../../foundation/appearance.js'
import { useI18n } from '../../i18n/provider.js'
import { OptionsShell } from './shell.js'
import { useOptionsController } from './use-options-controller.js'

export function OptionsApp() {
  const { preference, setPreference, t } = useI18n()
  const {
    preference: appearancePreference,
    setPreference: setAppearancePreference
  } = useAppearance()
  const controller = useOptionsController(t)

  if (controller.loading) {
    return <Alert severity="info">{t('options.loadingWorkspace')}</Alert>
  }
  if (!controller.draft) {
    return (
      <Alert severity="error">
        {controller.error ?? t('options.loadFailed')}
      </Alert>
    )
  }
  const draft = controller.draft

  return (
    <OptionsShell
      appearancePreference={appearancePreference}
      controller={controller}
      draft={draft}
      localePreference={preference}
      setAppearancePreference={setAppearancePreference}
      setLocalePreference={setPreference}
      t={t}
    />
  )
}
