import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'

import 'cesium/Build/Cesium/Widgets/widgets.css'

// 让 Cesium 在 Vite 下能找到静态资源（Workers/Assets/Widgets）
;(window as any).CESIUM_BASE_URL = '/cesium/'

createApp(App).use(router).mount('#app')
