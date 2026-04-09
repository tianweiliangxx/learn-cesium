<script setup lang="ts">
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-title">Learn Cesium</div>
        <div class="brand-subtitle">Vue + Vite + TypeScript</div>
      </div>

      <nav class="nav">
        <RouterLink class="nav-item" to="/">首页</RouterLink>
        <div class="nav-group-title">示例</div>
        <RouterLink class="nav-item" to="/examples/basic-viewer">01 基础 Viewer</RouterLink>
        <RouterLink class="nav-item" to="/examples/entities-intro">02 Entity 入门</RouterLink>
        <RouterLink class="nav-item" to="/examples/coordinates-pick">03 坐标与拾取</RouterLink>
        <RouterLink class="nav-item" to="/examples/camera-control">04 相机控制</RouterLink>
      </nav>
    </aside>

    <main class="content">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  height: 100svh;
  display: grid;
  grid-template-columns: 280px 1fr;
  background: #0b1020;
  color: #e7eaf0;
}

.sidebar {
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(10px);
  padding: 16px;
  overflow: auto;
}

.brand {
  padding: 12px 12px 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.25);
}
.brand-title {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.2px;
}
.brand-subtitle {
  margin-top: 6px;
  font-size: 12px;
  opacity: 0.8;
}

.nav {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.nav-group-title {
  margin-top: 10px;
  font-size: 12px;
  opacity: 0.75;
  padding: 0 6px;
}
.nav-item {
  display: block;
  padding: 10px 10px;
  border-radius: 10px;
  color: inherit;
  text-decoration: none;
  border: 1px solid transparent;
}
.nav-item:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.08);
}
.nav-item.router-link-active {
  background: rgba(103, 232, 249, 0.12);
  border-color: rgba(103, 232, 249, 0.28);
}

.content {
  min-width: 0;
  overflow: auto;
  background: radial-gradient(1200px 700px at 50% -10%, rgba(59, 130, 246, 0.25), transparent 60%),
    radial-gradient(900px 500px at 90% 10%, rgba(168, 85, 247, 0.20), transparent 60%),
    #050816;
}

@media (max-width: 980px) {
  .app-shell {
    grid-template-columns: 1fr;
  }
  .sidebar {
    position: sticky;
    top: 0;
    z-index: 10;
  }
}
</style>
