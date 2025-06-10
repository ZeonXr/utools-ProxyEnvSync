<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

function toggle() {
  if (!props.disabled) {
    emit('update:modelValue', !props.modelValue)
  }
}
</script>

<template>
  <button
    class="switch-button"
    :class="{ 'is-checked': modelValue, 'is-disabled': disabled }"
    type="button"
    role="switch"
    :aria-checked="modelValue"
    :disabled="disabled"
    @click="toggle"
  >
    <div class="switch-track">
      <div class="switch-thumb" />
    </div>
  </button>
</template>

<style scoped>
.switch-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  outline: none;
  transition: all 0.2s ease;
}

.switch-button:focus-visible {
  outline: 2px solid #0078d4;
  outline-offset: 2px;
  border-radius: 12px;
}

.switch-track {
  position: relative;
  width: 40px;
  height: 20px;
  border-radius: 10px;
  background-color: #e0e0e0;
  transition: all 0.2s ease;
}

.switch-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.is-checked .switch-track {
  background-color: #0078d4;
}

.is-checked .switch-thumb {
  transform: translateX(20px);
}

.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 暗色模式适配 */
:root.dark .switch-track {
  background-color: #424242;
}

:root.dark .switch-thumb {
  background-color: #e0e0e0;
}

:root.dark .is-checked .switch-track {
  background-color: #0078d4;
}
</style>
