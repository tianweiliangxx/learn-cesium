import { createRouter, createWebHistory } from 'vue-router'

import Home from '../views/Home.vue'
import BasicViewer from '../views/examples/BasicViewer.vue'
import EntitiesIntro from '../views/examples/EntitiesIntro.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: Home },
    { path: '/examples/basic-viewer', name: 'basic-viewer', component: BasicViewer },
    { path: '/examples/entities-intro', name: 'entities-intro', component: EntitiesIntro },
  ],
})

export default router

