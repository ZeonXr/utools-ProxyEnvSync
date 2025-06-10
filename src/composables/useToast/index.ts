import { createVNode, ref, render } from 'vue'
import Toast from './Toast.vue'

export function useToast() {
  const message = ref('')
  const type = ref<'success' | 'error'>('success')
  const visible = ref(false)
  let timer: number | null = null

  // 创建 Toast 容器
  const container = document.createElement('div')
  document.body.appendChild(container)

  // 创建 Toast 组件实例
  const vnode = createVNode(Toast, {
    message: message.value,
    type: type.value,
    visible: visible.value,
  })
  render(vnode, container)

  // 更新 Toast 状态
  const updateToast = (msg: string, toastType: 'success' | 'error' = 'success') => {
    message.value = msg
    type.value = toastType
    visible.value = true

    // 更新组件属性
    vnode.component!.props.message = msg
    vnode.component!.props.type = toastType
    vnode.component!.props.visible = true

    // 清除之前的定时器
    if (timer) {
      clearTimeout(timer)
    }

    // 设置新的定时器
    timer = window.setTimeout(() => {
      visible.value = false
      vnode.component!.props.visible = false
    }, 3000)
  }

  // 清理函数
  const cleanup = () => {
    if (timer) {
      clearTimeout(timer)
    }
    render(null, container)
    document.body.removeChild(container)
  }

  return {
    showMessage: updateToast,
    cleanup,
  }
}
