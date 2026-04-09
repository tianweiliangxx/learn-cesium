import * as Cesium from 'cesium'

export type LonLatHeight = {
  lon: number
  lat: number
  height: number
}

export function toLonLatHeight(cartesian: Cesium.Cartesian3): LonLatHeight {
  const c = Cesium.Cartographic.fromCartesian(cartesian)
  return {
    lon: Cesium.Math.toDegrees(c.longitude),
    lat: Cesium.Math.toDegrees(c.latitude),
    height: c.height,
  }
}

export function formatLonLatHeight(v: LonLatHeight) {
  const lon = v.lon.toFixed(6)
  const lat = v.lat.toFixed(6)
  const h = v.height.toFixed(2)
  return `${lon}, ${lat}, ${h}m`
}

