import { useState, useCallback } from 'react'
import type { ToastMessage } from '../types'

export interface UseToastReturn {
  toasts: ToastMessage[]
  showToast: (message: string, type?: ToastMessage['type'], duration?: number) => void
  removeToast: (id: string) => void
  clearAll: () => void
}

export function useToast(): UseToastReturn {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const showToast = useCallback(
    (message: string, type: ToastMessage['type'] = 'info', duration: number = 5000) => {
      const id = `toast-${Date.now()}-${Math.random()}`
      const newToast: ToastMessage = {
        id,
        type,
        message,
        duration,
      }

      setToasts((prev) => [...prev, newToast])
    },
    []
  )

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const clearAll = useCallback(() => {
    setToasts([])
  }, [])

  return {
    toasts,
    showToast,
    removeToast,
    clearAll,
  }
}

