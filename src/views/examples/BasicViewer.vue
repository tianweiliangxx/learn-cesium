<script setup lang="ts">
import type { Viewer } from 'cesium'
import * as Cesium from 'cesium'
import { ref } from 'vue'
import CesiumViewer from '../../components/CesiumViewer.vue'

const info = ref('提示：鼠标左键拖拽旋转，滚轮缩放，右键拖拽平移。')

function onReady(viewer: Viewer) {
  // 一个更“明显”的初始视角：北京上空
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(116.391, 39.907, 2500000),
  })
}
</script>

<template>
  <div class="page">
    <div class="topbar">
      <div class="title">01 基础 Viewer</div>
      <div class="subtitle">
        目标：跑通 Viewer、相机飞行、理解 Scene/Camera 的关系。
      </div>
      <div class="tip">{{ info }}</div>
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
  opacity: 0.8;
}
.tip {
  margin-top: 10px;
  font-size: 12px;
  opacity: 0.85;
}
.viewer {
  min-height: 0;
}
</style>

