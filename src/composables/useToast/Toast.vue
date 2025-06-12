<script setup lang="ts">
defineProps<{
  message: string
  type: 'success' | 'error'
  visible: boolean
}>()
</script>

<template>
  <Transition name="slide">
    <div v-if="visible" class="message" :class="type">
      {{ message }}
    </div>
  </Transition>
</template>

<style scoped>
.message {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 12px 24px;
  border-radius: 8px;
  z-index: 1000;
}

.message.success {
  background-color: #10b981;
  color: white;
}

.message.error {
  background-color: #ef4444;
  color: white;
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease-out;
}

.slide-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.slide-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>
