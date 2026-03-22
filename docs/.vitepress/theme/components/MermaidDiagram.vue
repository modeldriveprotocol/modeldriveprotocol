<script setup lang="ts">
import { useData } from 'vitepress'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps<{
  code: string
}>()

const { isDark, lang } = useData()
const inlineContainer = ref<HTMLElement | null>(null)
const previewContainer = ref<HTMLElement | null>(null)
const renderError = ref('')
const actionError = ref('')
const svgMarkup = ref('')
const isPreviewOpen = ref(false)
const isRendering = ref(false)
const source = computed(() => decodeURIComponent(props.code))
const isChinese = computed(() =>
  (lang.value || '').toLowerCase().startsWith('zh')
)
const labels = computed(() => {
  if (isChinese.value) {
    return {
      closePreview: '关闭预览',
      downloadPng: '下载 PNG',
      downloadSvg: '下载 SVG',
      exportFailed: '导出图片失败，请稍后重试。',
      fullscreen: '全屏查看',
      previewTitle: 'Mermaid 图预览'
    }
  }

  return {
    closePreview: 'Close preview',
    downloadPng: 'Download PNG',
    downloadSvg: 'Download SVG',
    exportFailed: 'Failed to export image. Please try again.',
    fullscreen: 'Open fullscreen',
    previewTitle: 'Mermaid diagram preview'
  }
})

const canInteract = computed(
  () => !isRendering.value && !renderError.value && Boolean(svgMarkup.value)
)

const diagramToken = Math.random().toString(36).slice(2, 8)

let renderVersion = 0

watch(
  [source, () => isDark.value],
  () => {
    void renderDiagram()
  },
  { flush: 'post' }
)

watch(
  svgMarkup,
  async () => {
    await nextTick()
    normalizeSvgContainers()
  },
  { flush: 'post' }
)

watch(isPreviewOpen, async enabled => {
  updatePreviewPageState(enabled)
  await nextTick()
  normalizeSvgContainers()
})

onMounted(() => {
  window.addEventListener('keydown', onWindowKeydown)
  void renderDiagram()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onWindowKeydown)
  updatePreviewPageState(false)
})

async function renderDiagram() {
  const activeRender = renderVersion += 1

  isRendering.value = true
  actionError.value = ''

  try {
    const mermaid = (await import('mermaid')).default
    const diagramId = `mdp-mermaid-${Date.now()}-${
      Math.random().toString(36).slice(2)
    }`

    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: isDark.value ? 'dark' : 'default',
      fontFamily: 'inherit',
      flowchart: {
        htmlLabels: true,
        useMaxWidth: true
      }
    })

    const { svg } = await mermaid.render(diagramId, source.value)
    if (activeRender !== renderVersion) {
      return
    }

    svgMarkup.value = svg
    renderError.value = ''
  } catch (cause) {
    if (activeRender !== renderVersion) {
      return
    }

    svgMarkup.value = ''
    renderError.value = cause instanceof Error
      ? cause.message
      : 'Failed to render diagram.'
    isPreviewOpen.value = false
  } finally {
    if (activeRender === renderVersion) {
      isRendering.value = false
    }
  }
}

function normalizeSvgContainers() {
  for (const target of [inlineContainer.value, previewContainer.value]) {
    const svg = target?.querySelector('svg')
    if (!svg) {
      continue
    }

    svg.removeAttribute('width')
    svg.removeAttribute('height')
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')
  }
}

function updatePreviewPageState(enabled: boolean) {
  if (typeof document === 'undefined') {
    return
  }

  document.documentElement.classList.toggle('mdp-mermaid-preview-open', enabled)
  document.body.classList.toggle('mdp-mermaid-preview-open', enabled)
}

function onWindowKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && isPreviewOpen.value) {
    isPreviewOpen.value = false
  }
}

function openPreview() {
  if (!canInteract.value) {
    return
  }

  actionError.value = ''
  isPreviewOpen.value = true
}

function closePreview() {
  isPreviewOpen.value = false
}

function onBackdropClick(event: MouseEvent) {
  if (event.target === event.currentTarget) {
    closePreview()
  }
}

function getActiveSvgElement() {
  return previewContainer.value?.querySelector('svg') ??
    inlineContainer.value?.querySelector('svg') ??
    null
}

function getPageSlug() {
  if (typeof window === 'undefined') {
    return 'diagram'
  }

  const segments = window.location.pathname
    .split('/')
    .filter(Boolean)
    .map(segment => segment.replace(/\.html$/u, ''))

  const lastSegment = segments.at(-1) ?? 'index'
  const normalized = lastSegment
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/gu, '-')
    .replace(/^-+|-+$/gu, '')

  return normalized || 'diagram'
}

function createDownloadName(extension: 'png' | 'svg') {
  return `${getPageSlug()}-mermaid-${diagramToken}.${extension}`
}

function getSvgDimensions(svgElement: SVGSVGElement) {
  const viewBox = svgElement.viewBox.baseVal
  if (viewBox?.width && viewBox?.height) {
    return {
      height: Math.max(1, Math.ceil(viewBox.height)),
      width: Math.max(1, Math.ceil(viewBox.width))
    }
  }

  const widthAttribute = Number.parseFloat(
    svgElement.getAttribute('width') ?? ''
  )
  const heightAttribute = Number.parseFloat(
    svgElement.getAttribute('height') ?? ''
  )

  if (
    Number.isFinite(widthAttribute) &&
    Number.isFinite(heightAttribute) &&
    widthAttribute > 0 &&
    heightAttribute > 0
  ) {
    return {
      height: Math.max(1, Math.ceil(heightAttribute)),
      width: Math.max(1, Math.ceil(widthAttribute))
    }
  }

  const rect = svgElement.getBoundingClientRect()

  return {
    height: Math.max(1, Math.ceil(rect.height || 600)),
    width: Math.max(1, Math.ceil(rect.width || 800))
  }
}

function createSerializedSvg(svgElement: SVGSVGElement) {
  const clone = svgElement.cloneNode(true) as SVGSVGElement
  const { height, width } = getSvgDimensions(svgElement)

  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')
  clone.setAttribute('width', `${width}`)
  clone.setAttribute('height', `${height}`)

  return new XMLSerializer().serializeToString(clone)
}

function getCanvasBackground() {
  const surface =
    previewContainer.value?.closest('.mdp-mermaid-preview__diagram') ??
      inlineContainer.value?.closest('.mdp-mermaid')
  if (!surface) {
    return isDark.value ? '#111827' : '#ffffff'
  }

  const backgroundColor = getComputedStyle(surface).backgroundColor
  return backgroundColor || (isDark.value ? '#111827' : '#ffffff')
}

function triggerBlobDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = fileName
  anchor.rel = 'noopener'
  anchor.click()

  setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 0)
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) {
        resolve(blob)
        return
      }

      reject(new Error(labels.value.exportFailed))
    }, 'image/png')
  })
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()

    image.decoding = 'async'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(labels.value.exportFailed))
    image.src = url
  })
}

async function downloadSvg() {
  const svgElement = getActiveSvgElement()
  if (!svgElement) {
    return
  }

  actionError.value = ''

  const svgMarkup = createSerializedSvg(svgElement)
  const blob = new Blob([svgMarkup], {
    type: 'image/svg+xml;charset=utf-8'
  })

  triggerBlobDownload(blob, createDownloadName('svg'))
}

async function downloadPng() {
  const svgElement = getActiveSvgElement()
  if (!svgElement) {
    return
  }

  actionError.value = ''

  const svgMarkup = createSerializedSvg(svgElement)
  const svgBlob = new Blob([svgMarkup], {
    type: 'image/svg+xml;charset=utf-8'
  })
  const svgUrl = URL.createObjectURL(svgBlob)

  try {
    const image = await loadImage(svgUrl)
    const { height, width } = getSvgDimensions(svgElement)
    const scale = Math.min(window.devicePixelRatio || 1, 2)
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')

    if (!context) {
      throw new Error(labels.value.exportFailed)
    }

    canvas.width = Math.max(1, Math.round(width * scale))
    canvas.height = Math.max(1, Math.round(height * scale))

    context.scale(scale, scale)
    context.fillStyle = getCanvasBackground()
    context.fillRect(0, 0, width, height)
    context.drawImage(image, 0, 0, width, height)

    const blob = await canvasToBlob(canvas)
    triggerBlobDownload(blob, createDownloadName('png'))
  } catch (cause) {
    actionError.value = cause instanceof Error
      ? cause.message
      : labels.value.exportFailed
  } finally {
    URL.revokeObjectURL(svgUrl)
  }
}
</script>

<template>
  <figure
    class="mdp-mermaid"
    :class="{ 'mdp-mermaid--previewing': isPreviewOpen }"
  >
    <div v-if="canInteract" class="mdp-mermaid__toolbar">
      <button
        class="mdp-mermaid__action"
        type="button"
        :aria-label="labels.fullscreen"
        :title="labels.fullscreen"
        @click="openPreview"
      >
        <span class="material-symbols-rounded" aria-hidden="true"
        >fullscreen</span>
      </button>
      <button
        class="mdp-mermaid__action"
        type="button"
        :aria-label="labels.downloadPng"
        :title="labels.downloadPng"
        @click="downloadPng"
      >
        <span class="material-symbols-rounded" aria-hidden="true">image</span>
      </button>
      <button
        class="mdp-mermaid__action"
        type="button"
        :aria-label="labels.downloadSvg"
        :title="labels.downloadSvg"
        @click="downloadSvg"
      >
        <span class="material-symbols-rounded" aria-hidden="true"
        >download</span>
      </button>
    </div>

    <div
      v-if="!isPreviewOpen"
      ref="inlineContainer"
      class="mdp-mermaid__diagram"
      :aria-busy="isRendering ? 'true' : 'false'"
      v-html="svgMarkup"
    />

    <div v-if="renderError" class="mdp-mermaid__error">
      {{ renderError }}
    </div>
    <div v-else-if="actionError" class="mdp-mermaid__hint">
      {{ actionError }}
    </div>
  </figure>

  <Teleport to="body">
    <div
      v-if="isPreviewOpen"
      class="mdp-mermaid-preview"
      role="dialog"
      aria-modal="true"
      :aria-label="labels.previewTitle"
      @click="onBackdropClick"
    >
      <div class="mdp-mermaid-preview__surface">
        <div class="mdp-mermaid-preview__toolbar">
          <button
            class="mdp-mermaid-preview__action"
            type="button"
            :title="labels.downloadPng"
            @click="downloadPng"
          >
            <span class="material-symbols-rounded" aria-hidden="true"
            >image</span>
            <span>{{ labels.downloadPng }}</span>
          </button>
          <button
            class="mdp-mermaid-preview__action"
            type="button"
            :title="labels.downloadSvg"
            @click="downloadSvg"
          >
            <span class="material-symbols-rounded" aria-hidden="true"
            >download</span>
            <span>{{ labels.downloadSvg }}</span>
          </button>
          <button
            class="mdp-mermaid-preview__action mdp-mermaid-preview__action--close"
            type="button"
            :title="labels.closePreview"
            @click="closePreview"
          >
            <span class="material-symbols-rounded" aria-hidden="true"
            >close</span>
            <span>{{ labels.closePreview }}</span>
          </button>
        </div>

        <div
          ref="previewContainer"
          class="mdp-mermaid-preview__diagram"
          v-html="svgMarkup"
        />

        <div v-if="actionError" class="mdp-mermaid-preview__hint">
          {{ actionError }}
        </div>
      </div>
    </div>
  </Teleport>
</template>
