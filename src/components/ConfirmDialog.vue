<script setup lang="ts">
// 通用确认弹层：用于"不可撤销"操作的二次确认（见 §8.2）。
// - 用 <Teleport to="body"> 把 DOM 传送到 <body>，避免父组件 overflow:hidden 裁剪
// - Esc 键、点击遮罩都可关闭
// - 按钮显式 type="button"，避免在表单内被当成 submit（见 §9.1）

defineProps<{
  open: boolean
  title: string
  message: string
  /** 确认按钮文案，默认"确认" */
  confirmText?: string
  /** 取消按钮文案，默认"取消" */
  cancelText?: string
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()
</script>

<template>
  <!-- 传送到 index.html 中 id 为 app 的容器后 -->
  <Teleport to="body">
    <div v-if="open" class="modal-mask" @click.self="emit('cancel')" @keydown.esc="emit('cancel')">
      <div class="modal" role="dialog" aria-modal="true">
        <h3>{{ title }}</h3>
        <p>{{ message }}</p>
        <div class="modal__actions">
          <button type="button" class="btn" @click="emit('cancel')">
            {{ cancelText ?? '取消' }}
          </button>
          <button type="button" class="btn btn--danger" @click="emit('confirm')">
            {{ confirmText ?? '确认' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
