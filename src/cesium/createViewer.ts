import * as Cesium from 'cesium'

export type CreateViewerOptions = {
  ionToken?: string
}

export function createViewer(container: HTMLElement, options: CreateViewerOptions = {}) {
  if (options.ionToken) {
    Cesium.Ion.defaultAccessToken = options.ionToken
  }

  const viewer = new Cesium.Viewer(container, {
    animation: false,
    baseLayerPicker: true,
    fullscreenButton: true,
    geocoder: false,
    homeButton: true,
    infoBox: true,
    navigationHelpButton: false,
    sceneModePicker: true,
    selectionIndicator: true,
    timeline: false,
    shouldAnimate: true,
  })

  // 让默认视角更“地球三维”
  viewer.scene.globe.depthTestAgainstTerrain = true

  return viewer
}

