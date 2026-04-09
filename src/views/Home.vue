<script setup lang="ts">
const cards = [
  {
    title: '01 基础 Viewer',
    desc: '最小可用：创建 Viewer、相机飞行、常见控件开关。',
    to: '/examples/basic-viewer',
  },
  {
    title: '02 Entity 入门',
    desc: '添加点/线/面与 label，并做一次 pick 选中反馈。',
    to: '/examples/entities-intro',
  },
]
</script>

<template>
  <div class="page">
    <header class="hero">
      <div class="hero-title">Cesium 学习框架</div>
      <div class="hero-subtitle">按“示例页”逐步累积：坐标系 → 相机 → Entity → Primitive → 3D Tiles</div>
    </header>

    <section class="grid">
      <RouterLink v-for="c in cards" :key="c.to" class="card" :to="c.to">
        <div class="card-title">{{ c.title }}</div>
        <div class="card-desc">{{ c.desc }}</div>
        <div class="card-cta">打开 →</div>
      </RouterLink>
    </section>
  </div>
</template>

<style scoped>
.page {
  padding: 22px 22px 28px;
}
.hero {
  padding: 18px 18px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
}
.hero-title {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: 0.2px;
}
.hero-subtitle {
  margin-top: 8px;
  font-size: 13px;
  opacity: 0.85;
  line-height: 1.45;
}
.grid {
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}
.card {
  display: block;
  padding: 16px 16px;
  border-radius: 14px;
  text-decoration: none;
  color: inherit;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.25);
  transition:
    transform 0.12s ease,
    border-color 0.12s ease,
    background 0.12s ease;
}
.card:hover {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(103, 232, 249, 0.28);
}
.card-title {
  font-size: 14px;
  font-weight: 800;
}
.card-desc {
  margin-top: 8px;
  font-size: 13px;
  opacity: 0.85;
  line-height: 1.5;
}
.card-cta {
  margin-top: 12px;
  font-size: 12px;
  opacity: 0.9;
}
@media (max-width: 980px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>

