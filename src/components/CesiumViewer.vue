<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { Viewer } from 'cesium'
import { createViewer } from '../cesium/createViewer'

const props = defineProps<{
  ionToken?: string
}>()

const containerRef = ref<HTMLDivElement | null>(null)
let viewer: Viewer | undefined

const emit = defineEmits<{
  (e: 'ready', viewer: Viewer): void
}>()

onMounted(() => {
  if (!containerRef.value) return
  viewer = createViewer(containerRef.value, { ionToken: props.ionToken })
  emit('ready', viewer)
})

onBeforeUnmount(() => {
  viewer?.destroy()
  viewer = undefined
})
</script>

<template>
  <div ref="containerRef" class="cesium-viewer-container" />
</template>

<style scoped>
.cesium-viewer-container {
  width: 100%;
  height: 100%;
}
</style>

