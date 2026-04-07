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
      breadcrumbPath={asset.path}
      descriptionLabel={t('common.description')}
      descriptionPlaceholder={t('options.assets.editor.descriptionPlaceholder')}
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
      editorPlaceholder={t(
        definition?.sourceKind === 'markdown'
          ? 'options.assets.editor.markdownPlaceholder'
          : 'options.assets.editor.codePlaceholder'
      )}
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
