<script setup lang="ts"></script>

<template>
  <div class="app">
    <header class="app__nav">
      <span class="app__title">表单系统 Demo</span>
      <nav>
        <RouterLink to="/client">客户端</RouterLink>
        <RouterLink to="/admin">后台</RouterLink>
      </nav>
    </header>
    <main class="app__main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app__nav {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 12px 24px;
  background: #1f2937;
  color: #fff;
}

.app__title {
  font-weight: 600;
}

.app__nav nav {
  display: flex;
  gap: 16px;
}

.app__nav a {
  color: #d1d5db;
  text-decoration: none;
  padding: 4px 8px;
  border-radius: 4px;
}

.app__nav a:hover {
  background: #374151;
  color: #fff;
}

.app__nav a.router-link-active {
  background: #2563eb;
  color: #fff;
}

.app__main {
  flex: 1;
  padding: 24px;
  max-width: 960px;
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
}
</style>
