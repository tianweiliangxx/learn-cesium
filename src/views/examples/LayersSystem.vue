<script setup lang="ts">
import type { Viewer } from 'cesium'
import * as Cesium from 'cesium'
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
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

// 地形（Terrain）
const ionToken = (import.meta as any).env?.VITE_CESIUM_ION_TOKEN as string | undefined
const terrainOn = ref<boolean>(false)
const terrainBusy = ref<boolean>(false)
const terrainHint = ref<string>(
  '地形开关：椭球体地表不需要 token；World Terrain 需要配置 Ion Token（.env.local）。',
)
const terrainError = ref<string>('')
/** 地形垂直夸张倍数，1 为真实比例；>1 拉高起伏便于观察 */
const terrainExaggeration = ref<number>(1)

function applyTerrainExaggeration() {
  const v = viewerRef.value
  if (!v) return
  const ex = Math.max(0, terrainExaggeration.value)
  // Cesium 1.140 使用 Scene.verticalExaggeration（不是 Globe.terrainExaggeration）
  ;(v.scene as unknown as { verticalExaggeration: number; verticalExaggerationRelativeHeight: number })
    .verticalExaggeration = ex
  ;(v.scene as unknown as { verticalExaggeration: number; verticalExaggerationRelativeHeight: number })
    .verticalExaggerationRelativeHeight = 0

  // 若开启了 requestRenderMode，这里保证立即重绘；不开启也无副作用
  v.scene.requestRender?.()
}

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
  applyTerrainExaggeration()
}

async function toggleTerrain() {
  const v = viewerRef.value
  if (!v) return
  if (terrainBusy.value) return
  terrainError.value = ''

  if (!terrainOn.value) {
    if (!ionToken) {
      terrainError.value = '未配置 Ion Token：请在根目录创建 .env.local，设置 VITE_CESIUM_ION_TOKEN=你的token，然后重启 dev。'
      return
    }
    terrainBusy.value = true
    try {
      // 确保 token 生效（CesiumViewer 里也会设置，这里再兜底一次）
      Cesium.Ion.defaultAccessToken = ionToken
      v.terrainProvider = await Cesium.createWorldTerrainAsync()
      terrainOn.value = true
      terrainHint.value = '已开启 World Terrain：建议飞到山区并拉近地表观察起伏。'
      applyTerrainExaggeration()
    } catch (e: any) {
      terrainError.value = `开启 World Terrain 失败：${e?.message ?? String(e)}`
    } finally {
      terrainBusy.value = false
    }
  } else {
    v.terrainProvider = new Cesium.EllipsoidTerrainProvider()
    terrainOn.value = false
    terrainHint.value = '已切回椭球体地表：地形起伏将消失。'
    applyTerrainExaggeration()
  }
}

function flyToTerrainDemo() {
  const v = viewerRef.value
  if (!v) return
  // 珠峰附近（便于观察地形起伏）
  v.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(86.925, 27.9881, 14000),
  })
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

watch(terrainExaggeration, () => applyTerrainExaggeration())

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

      <div class="section-title">地形（Terrain）</div>
      <div class="row">
        <button class="btn" type="button" :disabled="!canOperate || terrainBusy" @click="toggleTerrain">
          World Terrain：{{ terrainOn ? 'ON' : 'OFF' }}
        </button>
        <button class="btn" type="button" :disabled="!canOperate" @click="flyToTerrainDemo">飞到山区示例点</button>
        <label class="slider terrain-slider">
          <span class="k">地形夸张</span>
          <input
            v-model.number="terrainExaggeration"
            type="range"
            min="0"
            max="5"
            step="0.1"
            :disabled="!canOperate"
          />
          <span class="mono val">{{ terrainExaggeration.toFixed(1) }}×</span>
        </label>
        <div class="hint">{{ terrainHint }}</div>
        <div v-if="terrainError" class="err">{{ terrainError }}</div>
      </div>
      <div class="row hint-row">
        <span class="hint subtle">
          <code>scene.verticalExaggeration</code>：影响场景的垂直夸张；椭球地表无起伏时效果不明显，请先开启 World Terrain。
        </span>
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
      <CesiumViewer :ion-token="ionToken" @ready="onReady" />
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
.hint-row {
  margin-top: 0;
  align-items: flex-start;
}
.hint.subtle {
  opacity: 0.72;
}
.terrain-slider input[type='range'] {
  width: 220px;
}
.err {
  margin-top: 8px;
  font-size: 12px;
  color: rgba(248, 113, 113, 0.95);
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

