<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
import MermaidDiagram from './MermaidDiagram.vue'
import { resolveMermaidDiagram } from '../mermaid-diagrams'

const props = defineProps<{
  name: string
}>()

const { lang } = useData()
const code = computed(() =>
  encodeURIComponent(resolveMermaidDiagram(props.name, lang.value))
)
</script>

<template>
  <MermaidDiagram :code="code" />
</template>
