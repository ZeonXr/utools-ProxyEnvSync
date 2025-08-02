<script setup lang="ts">
const props = defineProps<{
  disabled?: boolean
}>()

const model = defineModel<boolean>()

function toggle() {
  if (!props.disabled) {
    model.value = !model.value
  }
}
</script>

<template>
  <button
    type="button"
    class="cursor-pointer p-0.6 h-5.5 w-12 rounded-full transition-colors duration-200 ease-in-out focus-visible:outline-blue-500 focus-visible:outline-offset-2 focus-visible:rounded-xl focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-50 outline-none border-none"
    :class="[
      model
        ? 'bg-blue-500 dark:bg-blue-500'
        : 'bg-gray-300 dark:bg-gray-600',
    ]"
    :aria-checked="model"
    :disabled="disabled"
    @click="toggle"
  >
    <div class="relative w-full h-full">
      <div
        class="absolute top-0 h-full aspect-square rounded-full bg-white shadow-sm transition-[transform,left] duration-200 ease-in-out dark:bg-gray-200"
        :class="[
          model ? 'left-100% -translate-x-100%' : 'left-0 -translate-x-0',
        ]"
      />
    </div>
  </button>
</template>
