<script setup lang="ts">
import { useData } from 'vitepress'
import { computed } from 'vue'
import CopyOrDownloadAsMarkdownButtons from 'vitepress-plugin-llms/vitepress-components/CopyOrDownloadAsMarkdownButtons.vue'

const { page } = useData()

const isVisible = computed(() => !page.value.isNotFound && page.value.frontmatter.layout !== 'home')
</script>

<template>
  <div v-if="isVisible" class="mdp-markdown-tools">
    <CopyOrDownloadAsMarkdownButtons />
  </div>
</template>
