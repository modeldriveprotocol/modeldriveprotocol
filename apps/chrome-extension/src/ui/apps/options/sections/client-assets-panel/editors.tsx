import type {
  RouteClientRecording,
  RouteSelectorResource,
  RouteSkillEntry
} from '#~/shared/config.js'
import { useI18n } from '../../../../i18n/provider.js'
import { ScriptedAssetEditorPanel, ScriptedAssetMethodField } from '../scripted-asset-shared.js'

import {
  basename,
  dirname,
  resolveRouteCodeAssetMethod,
  resolveRouteCodeAssetSource,
  updateRouteCodeAssetSource
} from './asset-helpers.js'

export function RouteMarkdownEditor({
  asset,
  onChange
}: {
  asset: RouteSkillEntry
  onChange: (next: RouteSkillEntry) => void
}) {
  const { t } = useI18n()

  return (
    <ScriptedAssetEditorPanel
      descriptionLabel={t('common.description')}
      descriptionValue={asset.metadata.summary}
      editorLabel={t('options.assets.skills.markdown')}
      editorLanguage="markdown"
      editorMinHeight={420}
      editorModelUri={`inmemory://route-assets/${asset.id}.md`}
      editorValue={asset.content}
      onDescriptionChange={(summary) =>
        onChange({
          ...asset,
          metadata: {
            ...asset.metadata,
            summary,
            title: asset.metadata.title || basename(dirname(asset.path) || asset.path)
          }
        })
      }
      onEditorChange={(content) =>
        onChange({
          ...asset,
          content
        })
      }
    />
  )
}

export function RouteCodeEditor({
  asset,
  onChange
}: {
  asset: RouteClientRecording | RouteSelectorResource
  onChange: (next: RouteClientRecording | RouteSelectorResource) => void
}) {
  const { t } = useI18n()
  const method = resolveRouteCodeAssetMethod(asset)
  const source = resolveRouteCodeAssetSource(asset)

  return (
    <ScriptedAssetEditorPanel
      controls={
        <ScriptedAssetMethodField
          label="Method"
          method={method}
          onChange={(nextMethod) =>
            onChange({
              ...asset,
              method: nextMethod
            })
          }
          sx={{ maxWidth: 180 }}
        />
      }
      descriptionLabel={t('common.description')}
      descriptionValue={asset.description}
      editorLabel={t('options.assets.flows.scriptEditor')}
      editorLanguage="javascript"
      editorMinHeight={420}
      editorModelUri={`inmemory://route-assets/${asset.id}.js`}
      editorValue={source}
      onDescriptionChange={(description) =>
        onChange({
          ...asset,
          description
        })
      }
      onEditorChange={(nextValue) =>
        onChange(updateRouteCodeAssetSource(asset, nextValue, method))
      }
    />
  )
}
