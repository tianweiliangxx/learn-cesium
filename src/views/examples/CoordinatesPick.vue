<script setup lang="ts">
import type { Viewer } from 'cesium'
import * as Cesium from 'cesium'
import { onBeforeUnmount, ref } from 'vue'
import CesiumViewer from '../../components/CesiumViewer.vue'
import { formatLonLatHeight, toLonLatHeight } from '../../cesium/coords'

const pickedObject = ref<string>('（未选中）')
const pickPositionText = ref<string>('（未点击）')
const lastError = ref<string>('')
const depthTestOn = ref<boolean>(true)
const terrainOn = ref<boolean>(false)
const terrainHint = ref<string>('提示：默认椭球体地表，depthTestAgainstTerrain 变化不明显。开启世界地形后更容易观察遮挡差异。')

const ionToken = (import.meta as any).env?.VITE_CESIUM_ION_TOKEN as string | undefined

let handler: Cesium.ScreenSpaceEventHandler | undefined
let lastViewer: Viewer | undefined

function describePicked(picked: unknown) {
  const p: any = picked
  const id = p?.id
  if (id?.name) return String(id.name)
  if (typeof id === 'string') return id
  if (id?.id) return String(id.id)
  if (p?.primitive) return '（primitive）'
  return '（未选中）'
}

function onReady(viewer: Viewer) {
  lastViewer = viewer
  depthTestOn.value = viewer.scene.globe.depthTestAgainstTerrain
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(116.391, 39.907, 1200000),
  })

  // 放一个点用于 pick 练习
  viewer.entities.add({
    id: 'pick-demo-point',
    name: '可拾取点（Entity）',
    position: Cesium.Cartesian3.fromDegrees(116.391, 39.907, 0),
    point: { pixelSize: 10, color: Cesium.Color.LIME, outlineColor: Cesium.Color.BLACK, outlineWidth: 1 },
    label: {
      text: '点我试试',
      font: '14px sans-serif',
      fillColor: Cesium.Color.WHITE,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 3,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      pixelOffset: new Cesium.Cartesian2(0, -18),
    },
  })

  handler?.destroy()
  handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
  handler.setInputAction((movement: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
    lastError.value = ''

    // 1) scene.pick：拾取对象（Entity/Primitive）
    const picked = viewer.scene.pick(movement.position)
    pickedObject.value = describePicked(picked)
    ;(viewer as any).selectedEntity = (picked as any)?.id

    // 2) pickPosition：屏幕点 → 世界坐标 → 经度纬度高程
    const world = viewer.scene.pickPosition(movement.position)
    if (!world) {
      pickPositionText.value = '（pickPosition 无结果：可能未开启深度/点到天空/或该位置无深度）'
      return
    }
    const llh = toLonLatHeight(world)
    pickPositionText.value = formatLonLatHeight(llh)
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
}

function toggleDepthTestAgainstTerrain() {
  const v = lastViewer
  if (!v) return
  v.scene.globe.depthTestAgainstTerrain = !v.scene.globe.depthTestAgainstTerrain
  depthTestOn.value = v.scene.globe.depthTestAgainstTerrain
}

async function toggleTerrain() {
  const v = lastViewer
  if (!v) return
  lastError.value = ''

  if (!terrainOn.value) {
    if (!ionToken) {
      lastError.value = '未配置 Ion Token：请在根目录创建 .env.local，设置 VITE_CESIUM_ION_TOKEN=你的token，然后重启 dev。'
      return
    }
    try {
      v.terrainProvider = await Cesium.createWorldTerrainAsync()
      terrainOn.value = true
      terrainHint.value = '已开启世界地形：把相机拉近地表，尝试让点被山体遮挡后切换 depthTestAgainstTerrain。'
      v.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(86.925, 27.9881, 12000),
      })
    } catch (e: any) {
      lastError.value = `开启世界地形失败：${e?.message ?? String(e)}`
    }
  } else {
    v.terrainProvider = new Cesium.EllipsoidTerrainProvider()
    terrainOn.value = false
    terrainHint.value = '已切回椭球体地表：此时 depthTestAgainstTerrain 差异通常不明显。'
  }
}

onBeforeUnmount(() => {
  handler?.destroy()
  handler = undefined
  lastViewer = undefined
})
</script>

<template>
  <div class="page">
    <div class="topbar">
      <div class="title">03 坐标与拾取</div>
      <div class="subtitle">
        左键点击：对比 <code>scene.pick</code>（选中对象）与 <code>pickPosition</code>（屏幕点→经纬度/高程）。
      </div>

      <div class="row">
        <div class="pill">
          <span class="k">scene.pick</span>
          <span class="v">{{ pickedObject }}</span>
        </div>
        <div class="pill">
          <span class="k">pickPosition</span>
          <span class="v mono">{{ pickPositionText }}</span>
        </div>
      </div>

      <div class="row">
        <button class="btn" type="button" @click="toggleDepthTestAgainstTerrain">
          depthTestAgainstTerrain：{{ depthTestOn ? 'ON' : 'OFF' }}
        </button>
        <button class="btn" type="button" @click="toggleTerrain">
          世界地形：{{ terrainOn ? 'ON' : 'OFF' }}
        </button>
        <div class="hint">{{ terrainHint }}</div>
        <div v-if="lastError" class="err">{{ lastError }}</div>
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
  align-items: center;
}
.pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  font-size: 12px;
}
.k {
  opacity: 0.72;
}
.v {
  font-weight: 800;
}
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-weight: 650;
}
.btn {
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.06);
  color: inherit;
  cursor: pointer;
}
.btn:hover {
  background: rgba(255, 255, 255, 0.1);
}
.hint {
  font-size: 12px;
  opacity: 0.78;
  line-height: 1.35;
}
.err {
  font-size: 12px;
  color: rgba(248, 113, 113, 0.95);
}
.viewer {
  min-height: 0;
}
</style>

