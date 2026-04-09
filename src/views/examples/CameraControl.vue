<script setup lang="ts">
import type { Viewer } from 'cesium'
import * as Cesium from 'cesium'
import { onBeforeUnmount, ref } from 'vue'
import CesiumViewer from '../../components/CesiumViewer.vue'
import { formatLonLatHeight, toLonLatHeight } from '../../cesium/coords'

const lon = ref<number>(116.391)
const lat = ref<number>(39.907)
const height = ref<number>(1200000)
const duration = ref<number>(2.2)

const cameraPosText = ref<string>('—')
const cameraHprText = ref<string>('—')

let viewerRef: Viewer | undefined
let removeChanged: (() => void) | undefined
let rafPending = false

function updateCameraPanel(viewer: Viewer) {
  const p = viewer.camera.positionWC
  const llh = toLonLatHeight(p)
  cameraPosText.value = formatLonLatHeight(llh)

  const h = Cesium.Math.toDegrees(viewer.camera.heading)
  const pi = Cesium.Math.toDegrees(viewer.camera.pitch)
  const r = Cesium.Math.toDegrees(viewer.camera.roll)
  cameraHprText.value = `H ${h.toFixed(1)}° / P ${pi.toFixed(1)}° / R ${r.toFixed(1)}°`
}

function onReady(viewer: Viewer) {
  viewerRef = viewer
  updateCameraPanel(viewer)

  removeChanged?.()
  viewer.camera.changed.addEventListener(() => {
    if (rafPending) return
    rafPending = true
    requestAnimationFrame(() => {
      rafPending = false
      if (!viewerRef) return
      updateCameraPanel(viewerRef)
    })
  })
  removeChanged = () => {
    try {
      viewer.camera.changed.removeEventListener(updateCameraPanel as any)
    } catch {
      // ignore
    }
  }
}

function flyTo() {
  const v = viewerRef
  if (!v) return
  v.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(lon.value, lat.value, height.value),
    duration: Math.max(0, duration.value),
  })
}

function setView() {
  const v = viewerRef
  if (!v) return
  v.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(lon.value, lat.value, height.value),
  })
}

function resetHome() {
  const v = viewerRef
  if (!v) return
  v.camera.flyHome(1.6)
}

onBeforeUnmount(() => {
  removeChanged?.()
  removeChanged = undefined
  viewerRef = undefined
  rafPending = false
})
</script>

<template>
  <div class="page">
    <div class="topbar">
      <div class="title">04 相机控制</div>
      <div class="subtitle">
        对比 <code>camera.flyTo</code>（带动画）与 <code>camera.setView</code>（瞬移）。
      </div>

      <div class="row">
        <label class="field">
          <span class="k">经度</span>
          <input v-model.number="lon" class="input" type="number" step="0.000001" />
        </label>
        <label class="field">
          <span class="k">纬度</span>
          <input v-model.number="lat" class="input" type="number" step="0.000001" />
        </label>
        <label class="field">
          <span class="k">高度(m)</span>
          <input v-model.number="height" class="input" type="number" step="10" />
        </label>
        <label class="field">
          <span class="k">flyTo 时长(s)</span>
          <input v-model.number="duration" class="input" type="number" step="0.1" min="0" />
        </label>
      </div>

      <div class="row">
        <button class="btn" type="button" @click="flyTo">flyTo（飞过去）</button>
        <button class="btn" type="button" @click="setView">setView（瞬移）</button>
        <button class="btn" type="button" @click="resetHome">flyHome</button>
      </div>

      <div class="row">
        <div class="pill">
          <span class="k">相机位置</span>
          <span class="v mono">{{ cameraPosText }}</span>
        </div>
        <div class="pill">
          <span class="k">相机姿态</span>
          <span class="v mono">{{ cameraHprText }}</span>
        </div>
        <div class="hint">
          小贴士：<code>positionWC</code> 是 ECEF 世界坐标；经纬度是把它转成 <code>Cartographic</code>。
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
  align-items: center;
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
.k {
  font-size: 12px;
  opacity: 0.72;
}
.input {
  width: 150px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(0, 0, 0, 0.2);
  color: inherit;
  outline: none;
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
.v {
  font-weight: 800;
}
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-weight: 650;
}
.hint {
  font-size: 12px;
  opacity: 0.78;
  line-height: 1.35;
}
.viewer {
  min-height: 0;
}
</style>

