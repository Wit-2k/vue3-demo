// 路由配置：两个页面之间跳转。
// /          → 重定向到 /client
// /client    → 客户端表单填写
// /admin     → 后台查看与编辑

import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/client' },
    {
      path: '/client',
      name: 'client',
      component: () => import('@/views/ClientView.vue'),
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('@/views/AdminView.vue'),
    },
  ],
})

export default router
