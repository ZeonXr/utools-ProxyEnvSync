<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import { customRef } from 'vue'
import Card from './Card.vue'
import Switch from './Switch.vue'

const { PluginSettings, Monitor } = window.proxyManager

const notificationEnabled = customRef<boolean>((track, trigger) => {
  return {
    get() {
      track()
      return PluginSettings.get('notificationEnabled')
    },
    set(value) {
      PluginSettings.set('notificationEnabled', value)
      trigger()
    },
  }
})

const syncEnabled = customRef<boolean>((track, trigger) => {
  return {
    get() {
      track()
      return PluginSettings.get('syncEnabled')
    },
    set(value) {
      PluginSettings.set('syncEnabled', value)
      Monitor.forceRunCallbacks()
      trigger()
    },
  }
})

const intervalRange = {
  min: 5,
  max: 180,
}

const checkInterval = customRef<number>((track, trigger) => {
  return {
    get() {
      track()
      return PluginSettings.get('checkInterval') / 1000
    },
    set: useDebounceFn((value: number) => {
      if (value < intervalRange.min) {
        value = intervalRange.min
      }
      else if (value > intervalRange.max) {
        value = intervalRange.max
      }
      let newValue = value * 1000
      newValue = PluginSettings.set('checkInterval', newValue)
      Monitor.start(newValue)
      trigger()
    }, 1000),
  }
})

function blockPress(e: KeyboardEvent) {
  const blockKeys = ['e', 'E', '.', '+', '-']
  if (blockKeys.includes(e.key)) {
    e.preventDefault()
  }
}
</script>

<template>
  <Card title="设置">
    <div class="space-y-4">
      <div class="flex items-center justify-between line-height-6">
        <span class="text-gray-700 dark:text-gray-300">变更通知</span>
        <div class="flex items-center gap-2">
          <Switch v-model="notificationEnabled" />
        </div>
      </div>
      <div class="flex items-center justify-between line-height-6">
        <span class="text-gray-700 dark:text-gray-300">同步状态</span>
        <div class="flex items-center gap-2">
          <Switch v-model="syncEnabled" />
        </div>
      </div>
      <div class="flex items-center justify-between line-height-6">
        <span class="text-gray-700 dark:text-gray-300">检查间隔</span>
        <div class="flex items-center gap-2">
          <input
            v-model.number="checkInterval"
            type="number"
            :min="intervalRange.min"
            :max="intervalRange.max"
            class="dark:text-gray-100 w-20 px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
            @keypress="blockPress"
          >
          <span class="text-gray-700 dark:text-gray-300">秒</span>
        </div>
      </div>
    </div>
  </Card>
</template>
