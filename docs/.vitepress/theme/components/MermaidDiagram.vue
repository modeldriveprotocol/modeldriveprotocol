<script setup lang="ts">
import { useData } from 'vitepress'
import { computed, onMounted, ref, watch } from 'vue'

const props = defineProps<{
  code: string
}>()

const { isDark } = useData()
const container = ref<HTMLElement | null>(null)
const error = ref('')
const source = computed(() => decodeURIComponent(props.code))

let renderVersion = 0

watch(
  [source, () => isDark.value],
  () => {
    void renderDiagram()
  },
  { flush: 'post' }
)

onMounted(() => {
  void renderDiagram()
})

async function renderDiagram() {
  if (!container.value) {
    return
  }

  const activeRender = renderVersion += 1

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
    if (!container.value || activeRender !== renderVersion) {
      return
    }

    container.value.innerHTML = svg
    container.value.querySelector('svg')?.removeAttribute('width')
    error.value = ''
  } catch (cause) {
    if (!container.value || activeRender !== renderVersion) {
      return
    }

    container.value.innerHTML = ''
    error.value = cause instanceof Error
      ? cause.message
      : 'Failed to render diagram.'
  }
}
</script>

<template>
  <figure class="mdp-mermaid">
    <div ref="container" class="mdp-mermaid__diagram" />
    <div v-if="error" class="mdp-mermaid__error">
      {{ error }}
    </div>
  </figure>
</template>
