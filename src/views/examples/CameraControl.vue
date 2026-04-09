<script setup lang="ts">
import type { Viewer } from 'cesium'
import * as Cesium from 'cesium'
import { onBeforeUnmount, ref, watch } from 'vue'
import CesiumViewer from '../../components/CesiumViewer.vue'
import { formatLonLatHeight, toLonLatHeight } from '../../cesium/coords'

const lon = ref<number>(116.391)
const lat = ref<number>(39.907)
const height = ref<number>(1200000)
const duration = ref<number>(2.2)

// 围绕目标点（lookAt）控制
const targetLon = ref<number>(116.391)
const targetLat = ref<number>(39.907)
const targetHeight = ref<number>(0)
const lookAtEnabled = ref<boolean>(true)
const headingDeg = ref<number>(0)
const pitchDeg = ref<number>(-35)
const rangeM = ref<number>(8000)
const enuEnabled = ref<boolean>(true)

// 相机约束（ScreenSpaceCameraController）
const constraintsEnabled = ref<boolean>(true)
const minZoomM = ref<number>(50)
const maxZoomM = ref<number>(20000000)
const minPitchDeg = ref<number>(-89)
const maxPitchDeg = ref<number>(-5)
const collisionEnabled = ref<boolean>(true)
const preventUnderground = ref<boolean>(true)

const cameraPosText = ref<string>('—')
const cameraHprText = ref<string>('—')

let viewerRef: Viewer | undefined
let removeChanged: (() => void) | undefined
let rafPending = false
let clamping = false

function updateCameraPanel(viewer: Viewer) {
  const p = viewer.camera.positionWC
  const llh = toLonLatHeight(p)
  cameraPosText.value = formatLonLatHeight(llh)

  const h = Cesium.Math.toDegrees(viewer.camera.heading)
  const pi = Cesium.Math.toDegrees(viewer.camera.pitch)
  const r = Cesium.Math.toDegrees(viewer.camera.roll)
  cameraHprText.value = `H ${h.toFixed(1)}° / P ${pi.toFixed(1)}° / R ${r.toFixed(1)}°`
}

function applyLookAt() {
  const v = viewerRef
  if (!v) return
  if (!lookAtEnabled.value) return

  const target = Cesium.Cartesian3.fromDegrees(targetLon.value, targetLat.value, targetHeight.value)
  const h = Cesium.Math.toRadians(headingDeg.value)
  const p = Cesium.Math.toRadians(pitchDeg.value)
  const r = Math.max(1, rangeM.value)
  const offset = new Cesium.HeadingPitchRange(h, p, r)

  if (enuEnabled.value) {
    // ENU：heading 0° 指向北，90° 指向东（相对于目标点的局部 East-North-Up）
    const t = Cesium.Transforms.eastNorthUpToFixedFrame(target)
    v.camera.lookAtTransform(t, offset)
  } else {
    // 默认（世界参考系下的 lookAt）
    v.camera.lookAt(target, offset)
  }
}

function exitLookAt() {
  const v = viewerRef
  if (!v) return
  // 退出 lookAt：恢复到世界参考系
  v.camera.lookAtTransform(Cesium.Matrix4.IDENTITY)
  // 轻微 setView 触发内部状态刷新（避免某些情况下交互“粘住”）
  v.camera.setView({
    destination: v.camera.positionWC,
    orientation: {
      heading: v.camera.heading,
      pitch: v.camera.pitch,
      roll: v.camera.roll,
    },
  })
}

function applyConstraints() {
  const v = viewerRef
  if (!v) return
  const c = v.scene.screenSpaceCameraController

  if (!constraintsEnabled.value) return

  // 缩放距离约束（米）
  c.minimumZoomDistance = Math.max(0, minZoomM.value)
  c.maximumZoomDistance = Math.max(c.minimumZoomDistance + 1, maxZoomM.value)

  // 与地形/椭球碰撞（避免穿透）
  c.enableCollisionDetection = collisionEnabled.value
}

function clampPitch() {
  const v = viewerRef
  if (!v) return
  if (!constraintsEnabled.value) return
  if (clamping) return

  const minP = Cesium.Math.toRadians(Math.min(minPitchDeg.value, maxPitchDeg.value))
  const maxP = Cesium.Math.toRadians(Math.max(minPitchDeg.value, maxPitchDeg.value))

  const pitch = v.camera.pitch
  if (pitch >= minP && pitch <= maxP) return

  const clampedPitch = Cesium.Math.clamp(pitch, minP, maxP)
  clamping = true
  try {
    v.camera.setView({
      destination: v.camera.positionWC,
      orientation: {
        heading: v.camera.heading,
        pitch: clampedPitch,
        roll: v.camera.roll,
      },
    })
  } finally {
    clamping = false
  }
}

function clampAboveSurface() {
  const v = viewerRef
  if (!v) return
  if (!preventUnderground.value) return

  const p = v.camera.positionWC
  const carto = Cesium.Cartographic.fromCartesian(p)
  // 这里用 0 做兜底：即使没开地形，也不会钻进椭球下面
  if (carto.height >= 0) return

  const fixed = Cesium.Cartesian3.fromRadians(carto.longitude, carto.latitude, 1)
  clamping = true
  v.camera.setView({
    destination: fixed,
    orientation: {
      heading: v.camera.heading,
      pitch: v.camera.pitch,
      roll: v.camera.roll,
    },
  })
  clamping = false
}

function onReady(viewer: Viewer) {
  viewerRef = viewer
  updateCameraPanel(viewer)
  applyConstraints()

  removeChanged?.()
  const onCameraChanged = () => {
    if (rafPending) return
    rafPending = true
    requestAnimationFrame(() => {
      rafPending = false
      if (!viewerRef) return
      updateCameraPanel(viewerRef)
      clampPitch()
      clampAboveSurface()
    })
  }
  viewer.camera.changed.addEventListener(onCameraChanged)
  removeChanged = () => {
    try {
      viewer.camera.changed.removeEventListener(onCameraChanged)
    } catch {
      // ignore
    }
  }

  // 初始化 lookAt：让“围绕点”效果立刻可见
  applyLookAt()
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

watch([lookAtEnabled, targetLon, targetLat, targetHeight, headingDeg, pitchDeg, rangeM, enuEnabled], () => {
  if (!viewerRef) return
  if (lookAtEnabled.value) applyLookAt()
  else exitLookAt()
})

watch([constraintsEnabled, minZoomM, maxZoomM, minPitchDeg, maxPitchDeg, collisionEnabled], () => {
  applyConstraints()
})

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

      <div class="section-title">围绕目标点（lookAt）</div>
      <div class="row">
        <label class="toggle">
          <input v-model="lookAtEnabled" type="checkbox" />
          <span>启用 lookAt</span>
        </label>
        <label class="toggle">
          <input v-model="enuEnabled" type="checkbox" />
          <span>使用 ENU 参考系</span>
        </label>
        <label class="field">
          <span class="k">目标经度</span>
          <input v-model.number="targetLon" class="input" type="number" step="0.000001" />
        </label>
        <label class="field">
          <span class="k">目标纬度</span>
          <input v-model.number="targetLat" class="input" type="number" step="0.000001" />
        </label>
        <label class="field">
          <span class="k">目标高程(m)</span>
          <input v-model.number="targetHeight" class="input" type="number" step="1" />
        </label>
      </div>

      <div class="row">
        <label class="slider">
          <span class="k">Heading(°)</span>
          <input v-model.number="headingDeg" type="range" min="-180" max="180" step="1" />
          <span class="mono val">{{ headingDeg.toFixed(0) }}</span>
        </label>
        <label class="slider">
          <span class="k">Pitch(°)</span>
          <input v-model.number="pitchDeg" type="range" min="-89" max="-1" step="1" />
          <span class="mono val">{{ pitchDeg.toFixed(0) }}</span>
        </label>
        <label class="slider">
          <span class="k">Range(m)</span>
          <input v-model.number="rangeM" type="range" min="50" max="30000" step="10" />
          <span class="mono val">{{ rangeM.toFixed(0) }}</span>
        </label>
        <button class="btn" type="button" @click="applyLookAt">应用</button>
        <button class="btn" type="button" @click="exitLookAt">退出 lookAt</button>
      </div>

      <div class="hint">
        关键点：启用 ENU 后，Heading 是以“目标点局部坐标系”为参考（0° 北、90° 东）；关闭 ENU 时，旋转参考更接近世界/ECEF，容易让人觉得“转向不直观”。
      </div>

      <div class="section-title">相机约束（ScreenSpaceCameraController）</div>
      <div class="row">
        <label class="toggle">
          <input v-model="constraintsEnabled" type="checkbox" />
          <span>启用约束</span>
        </label>
        <label class="toggle">
          <input v-model="collisionEnabled" type="checkbox" />
          <span>碰撞检测</span>
        </label>
        <label class="toggle">
          <input v-model="preventUnderground" type="checkbox" />
          <span>禁止地下（兜底）</span>
        </label>
      </div>

      <div class="row">
        <label class="field">
          <span class="k">最小缩放距离(m)</span>
          <input v-model.number="minZoomM" class="input" type="number" step="1" min="0" />
        </label>
        <label class="field">
          <span class="k">最大缩放距离(m)</span>
          <input v-model.number="maxZoomM" class="input" type="number" step="1000" min="1" />
        </label>
        <label class="field">
          <span class="k">最小 Pitch(°)</span>
          <input v-model.number="minPitchDeg" class="input" type="number" step="1" />
        </label>
        <label class="field">
          <span class="k">最大 Pitch(°)</span>
          <input v-model.number="maxPitchDeg" class="input" type="number" step="1" />
        </label>
        <button class="btn" type="button" @click="applyConstraints">应用约束</button>
      </div>

      <div class="hint">
        常见经验：Pitch 通常限制在 \(-89^\circ \sim -5^\circ\) 之间，既能俯视也避免“抬到水平/仰视”；缩放距离配合业务场景（城市/园区/室内）设置更合理。
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
.section-title {
  margin-top: 14px;
  font-size: 12px;
  font-weight: 800;
  opacity: 0.85;
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
}
.slider input[type='range'] {
  width: 220px;
}
.val {
  width: 56px;
  text-align: right;
  opacity: 0.95;
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

