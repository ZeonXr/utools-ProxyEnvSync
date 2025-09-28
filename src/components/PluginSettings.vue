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
      <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
        <div class="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div class="text-blue-500 dark:text-blue-400 mt-0.5">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="text-sm text-blue-700 dark:text-blue-300">
            <div class="font-medium mb-1">
              重要提示
            </div>
            <div class="leading-relaxed">
              插件需要保持后台运行，请在插件设置中开启"跟随主程序同时启动运行"
            </div>
          </div>
        </div>
      </div>
    </div>
  </Card>
</template>
