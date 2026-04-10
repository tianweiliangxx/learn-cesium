<script setup lang="ts">
import type { Viewer } from 'cesium'
import * as Cesium from 'cesium'
import { computed, onBeforeUnmount, ref, shallowRef } from 'vue'
import CesiumViewer from '../../components/CesiumViewer.vue'

type UiLayer = {
  id: string
  name: string
  layer: Cesium.ImageryLayer
  removable: boolean
}

const urlTemplate = ref<string>('https://t{s}.tianditu.gov.cn/DataServer?T=${icon}_w&x={x}&y={y}&l={z}&tk=b3ae45031e93c3a273c73f6e6cd7841')
const credit = ref<string>('© 天地图')

const uiLayers = ref<UiLayer[]>([])
/** 用 shallowRef 只追踪「是否已赋值」，不把 Cesium Viewer 做成深度响应式，避免性能与行为问题 */
const viewerRef = shallowRef<Viewer | null>(null)

const canOperate = computed(() => !!viewerRef.value)

function syncFromCesium() {
  const v = viewerRef.value
  if (!v) return

  // 只同步我们自己添加/登记过的 layer（避免和 baseLayerPicker 的内部状态打架）
  // 同时保证顺序与 Cesium 内部 imageryLayers 一致（底->顶）
  const current = uiLayers.value
  const next: UiLayer[] = []
  const layerCount = v.imageryLayers.length
  for (let i = 0; i < layerCount; i++) {
    const layer = v.imageryLayers.get(i)
    const found = current.find((x) => x.layer === layer)
    if (found) next.push(found)
  }
  uiLayers.value = next
}

function onReady(viewer: Viewer) {
  viewerRef.value = viewer
}

function addXyzLayer() {
  const v = viewerRef.value
  if (!v) return

  const template = urlTemplate.value.trim()
  if (!template) return

  const provider = new Cesium.UrlTemplateImageryProvider({
    url: template,
    credit: credit.value?.trim() || undefined,
  })

  const layer = new Cesium.ImageryLayer(provider, {
    alpha: 1,
    show: true,
  })

  v.imageryLayers.add(layer)

  uiLayers.value.push({
    id: crypto.randomUUID(),
    name: `XYZ: ${template}`,
    layer,
    removable: true,
  })

  syncFromCesium()
}

function removeLayer(item: UiLayer) {
  const v = viewerRef.value
  if (!v) return
  if (!item.removable) return

  v.imageryLayers.remove(item.layer, true)
  uiLayers.value = uiLayers.value.filter((x) => x !== item)
  syncFromCesium()
}

function moveUp(item: UiLayer) {
  const v = viewerRef.value
  if (!v) return
  v.imageryLayers.raise(item.layer) // 往顶层移动一格
  syncFromCesium()
}

function moveDown(item: UiLayer) {
  const v = viewerRef.value
  if (!v) return
  v.imageryLayers.lower(item.layer) // 往底层移动一格
  syncFromCesium()
}

onBeforeUnmount(() => {
  viewerRef.value = null
  uiLayers.value = []
})
</script>

<template>
  <div class="page">
    <div class="topbar">
      <div class="title">05 图层体系（影像）</div>
      <div class="subtitle">
        目标：理解 <code>ImageryLayer</code> 叠加顺序、显示开关、透明度，以及 XYZ 模板的最小用法。
      </div>

      <div class="row">
        <label class="field grow">
          <span class="k">XYZ urlTemplate</span>
          <input
            v-model="urlTemplate"
            class="input"
            type="text"
            placeholder="https://.../{z}/{x}/{y}.png"
          />
        </label>
        <label class="field grow">
          <span class="k">Credit（可选）</span>
          <input v-model="credit" class="input" type="text" placeholder="图层版权信息" />
        </label>
        <button class="btn" type="button" :disabled="!canOperate" @click="addXyzLayer">添加 XYZ 图层</button>
      </div>

      <div class="section-title">已添加图层（底 → 顶）</div>
      <div v-if="uiLayers.length === 0" class="hint">还没有添加图层。先点“添加 XYZ 图层”。</div>

      <div v-else class="layers">
        <div v-for="item in uiLayers" :key="item.id" class="layer-item">
          <div class="layer-main">
            <div class="layer-name">{{ item.name }}</div>
            <div class="controls">
              <label class="toggle">
                <input v-model="item.layer.show" type="checkbox" />
                <span>显示</span>
              </label>
              <label class="slider">
                <span class="k">alpha</span>
                <input v-model.number="item.layer.alpha" type="range" min="0" max="1" step="0.01" />
                <span class="mono val">{{ item.layer.alpha.toFixed(2) }}</span>
              </label>
              <button class="btn" type="button" @click="moveUp(item)">上移</button>
              <button class="btn" type="button" @click="moveDown(item)">下移</button>
              <button class="btn danger" type="button" :disabled="!item.removable" @click="removeLayer(item)">
                移除
              </button>
            </div>
          </div>
          <div class="layer-sub">
            提示：上移=更靠近顶层（更“盖住”下面），下移=更靠近底层（更“被盖住”）。
          </div>
        </div>
      </div>
    </div>

    <div class="viewer">
      <CesiumViewer @ready="onReady" />
    </div>
  </div>
</template>

<style scoped>
.page {
  height: 100%;
  display: grid;
  grid-template-rows: auto 1fr;
}
.topbar {
  padding: 14px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.22);
}
.title {
  font-size: 14px;
  font-weight: 800;
}
.subtitle {
  margin-top: 6px;
  font-size: 12px;
  opacity: 0.82;
  line-height: 1.45;
}
.row {
  margin-top: 10px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: flex-end;
}
.section-title {
  margin-top: 14px;
  font-size: 12px;
  font-weight: 800;
  opacity: 0.85;
}
.hint {
  margin-top: 8px;
  font-size: 12px;
  opacity: 0.78;
  line-height: 1.35;
}
.field {
  display: inline-flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
}
.field.grow {
  flex: 1 1 420px;
  min-width: 260px;
}
.k {
  font-size: 12px;
  opacity: 0.72;
}
.input {
  width: 100%;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(0, 0, 0, 0.2);
  color: inherit;
  outline: none;
  box-sizing: border-box;
}
.btn {
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.06);
  color: inherit;
  cursor: pointer;
  height: 38px;
}
.btn:hover {
  background: rgba(255, 255, 255, 0.1);
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn.danger {
  border-color: rgba(248, 113, 113, 0.3);
  background: rgba(248, 113, 113, 0.08);
}
.layers {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.layer-item {
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  padding: 10px 10px;
}
.layer-main {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
}
.layer-name {
  font-size: 12px;
  font-weight: 800;
  opacity: 0.92;
  max-width: 760px;
  word-break: break-all;
}
.controls {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
}
.toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  font-size: 12px;
  height: 38px;
  box-sizing: border-box;
}
.slider {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  font-size: 12px;
  height: 38px;
  box-sizing: border-box;
}
.slider input[type='range'] {
  width: 180px;
}
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-weight: 650;
}
.val {
  width: 52px;
  text-align: right;
}
.layer-sub {
  margin-top: 8px;
  font-size: 12px;
  opacity: 0.75;
}
.viewer {
  min-height: 0;
}
</style>

