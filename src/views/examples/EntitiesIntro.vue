<script setup lang="ts">
import type { Viewer } from 'cesium'
import * as Cesium from 'cesium'
import { onBeforeUnmount, ref } from 'vue'
import CesiumViewer from '../../components/CesiumViewer.vue'

const pickedName = ref<string>('（未选中）')
let handler: Cesium.ScreenSpaceEventHandler | undefined

function onReady(viewer: Viewer) {
  // 加几个典型 Entity
  const beijing = Cesium.Cartesian3.fromDegrees(116.391, 39.907, 0)
  const shanghai = Cesium.Cartesian3.fromDegrees(121.4737, 31.2304, 0)

  viewer.entities.add({
    id: 'beijing-point',
    name: '北京 - 点',
    position: beijing,
    point: { pixelSize: 10, color: Cesium.Color.CYAN, outlineColor: Cesium.Color.BLACK, outlineWidth: 1 },
    label: {
      text: '北京',
      font: '14px sans-serif',
      fillColor: Cesium.Color.WHITE,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 3,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      pixelOffset: new Cesium.Cartesian2(0, -18),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  })

  viewer.entities.add({
    id: 'bj-sh-line',
    name: '北京 → 上海 - 线',
    polyline: {
      positions: [beijing, shanghai],
      width: 3,
      material: Cesium.Color.YELLOW.withAlpha(0.9),
      clampToGround: false,
    },
  })

  viewer.entities.add({
    id: 'demo-polygon',
    name: '一个简单面',
    polygon: {
      hierarchy: Cesium.Cartesian3.fromDegreesArray([
        116.1, 39.6,
        116.8, 39.6,
        116.8, 40.2,
        116.1, 40.2,
      ]),
      material: Cesium.Color.DEEPSKYBLUE.withAlpha(0.25),
      outline: true,
      outlineColor: Cesium.Color.DEEPSKYBLUE.withAlpha(0.9),
    },
  })

  viewer.zoomTo(viewer.entities)

  // 点击拾取 Entity
  handler?.destroy()
  handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
  handler.setInputAction((movement: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
    const picked = viewer.scene.pick(movement.position)
    const entity = (picked as any)?.id
    if (entity && entity.name) {
      pickedName.value = entity.name
      viewer.selectedEntity = entity
    } else {
      pickedName.value = '（未选中）'
      viewer.selectedEntity = undefined
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
}

onBeforeUnmount(() => {
  handler?.destroy()
  handler = undefined
})
</script>

<template>
  <div class="page">
    <div class="topbar">
      <div class="title">02 Entity 入门</div>
      <div class="subtitle">
        目标：理解 Entity 的常见类型（点/线/面/label），并完成一次点击拾取。
      </div>
      <div class="pill-row">
        <div class="pill"><span class="pill-k">当前选中</span><span class="pill-v">{{ pickedName }}</span></div>
        <div class="pill subtle">提示：点一下点/线/面即可选中</div>
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
  opacity: 0.8;
  line-height: 1.45;
}
.pill-row {
  margin-top: 10px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.10);
  background: rgba(255, 255, 255, 0.04);
  font-size: 12px;
}
.pill.subtle {
  opacity: 0.85;
}
.pill-k {
  opacity: 0.7;
}
.pill-v {
  font-weight: 800;
}
.viewer {
  min-height: 0;
}
</style>

