<script setup lang="ts">
defineProps<{
  title?: string
}>()
</script>

<template>
  <div class="p-4 rounded-lg shadow dark:bg-#252525 bg-white">
    <slot name="title">
      <div class="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">
        {{ title }}
      </div>
    </slot>
    <slot />
  </div>
</template>
