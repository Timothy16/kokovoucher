// app/composables/useToast.ts
export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: number
  type: ToastType
  title: string
  message?: string
}

let seq = 0

export function useToast() {
  const toasts = useState<Toast[]>('kokovoucher-toasts', () => [])

  function dismiss(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  function push(type: ToastType, title: string, message?: string, duration = 4200) {
    const id = ++seq
    toasts.value = [...toasts.value, { id, type, title, message }]
    if (import.meta.client) {
      window.setTimeout(() => dismiss(id), duration)
    }
    return id
  }

  return {
    toasts,
    dismiss,
    success: (title: string, message?: string) => push('success', title, message),
    error: (title: string, message?: string) => push('error', title, message),
    warning: (title: string, message?: string) => push('warning', title, message),
    info: (title: string, message?: string) => push('info', title, message)
  }
}
