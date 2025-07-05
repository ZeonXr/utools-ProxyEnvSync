<script setup lang="ts">
defineProps<{
  title?: string
}>()
</script>

<template>
  <div class="rounded-lg shadow p-4 dark:bg-#252525 bg-white">
    <slot name="title">
      <div class="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">
        {{ title }}
      </div>
    </slot>
    <slot />
  </div>
</template>
