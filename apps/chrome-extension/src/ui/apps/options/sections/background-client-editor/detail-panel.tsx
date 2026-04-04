import { getBackgroundExposeDefinition, type BackgroundExposeAsset } from '#~/shared/config.js'
import { useI18n } from '../../../../i18n/provider.js'
import { ScriptedAssetEditorPanel } from '../scripted-asset-shared.js'

export function BackgroundExposeDetailPanel({
  asset,
  onUpdate
}: {
  asset: BackgroundExposeAsset
  onUpdate: (
    id: BackgroundExposeAsset['id'],
    updater: (asset: BackgroundExposeAsset) => BackgroundExposeAsset
  ) => void
}) {
  const { t } = useI18n()
  const definition = getBackgroundExposeDefinition(asset.id)

  return (
    <ScriptedAssetEditorPanel
      descriptionLabel={t('common.description')}
      descriptionValue={asset.description}
      editorLabel={
        definition?.sourceKind === 'markdown'
          ? t('options.assets.skills.markdown')
          : t('options.clients.defaultPathScript')
      }
      editorLanguage={
        definition?.sourceKind === 'markdown' ? 'markdown' : 'javascript'
      }
      editorModelUri={`inmemory://background-exposes/${asset.id}.${definition?.sourceKind === 'markdown' ? 'md' : 'js'}`}
      editorValue={asset.source}
      onDescriptionChange={(description) =>
        onUpdate(asset.id, (current) => ({
          ...current,
          description
        }))
      }
      onEditorChange={(source) =>
        onUpdate(asset.id, (current) => ({
          ...current,
          source
        }))
      }
    />
  )
}
