import { useEffect, type FC } from 'react'
import type { ToastMessage } from '../types'

export interface ToastProps {
  toast: ToastMessage
  onClose: (id: string) => void
}

const Toast: FC<ToastProps> = ({ toast, onClose }) => {
  useEffect(() => {
    const duration = toast.duration || 5000
    const timer = setTimeout(() => {
      onClose(toast.id)
    }, duration)

    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, onClose])

  const getToastStyles = () => {
    const baseStyles = 'flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg backdrop-blur-sm'
    switch (toast.type) {
      case 'success':
        return `${baseStyles} border-green-500/30 bg-green-500/20 text-green-100`
      case 'error':
        return `${baseStyles} border-red-500/30 bg-red-500/20 text-red-100`
      case 'warning':
        return `${baseStyles} border-yellow-500/30 bg-yellow-500/20 text-yellow-100`
      case 'info':
      default:
        return `${baseStyles} border-blue-500/30 bg-blue-500/20 text-blue-100`
    }
  }

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return '✓'
      case 'error':
        return '✕'
      case 'warning':
        return '⚠'
      case 'info':
      default:
        return 'ℹ'
    }
  }

  return (
    <div
      className={getToastStyles()}
      role="alert"
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
    >
      <span className="flex-shrink-0 text-lg font-bold">{getIcon()}</span>
      <span className="flex-1 text-sm font-medium">{toast.message}</span>
      <button
        type="button"
        onClick={() => onClose(toast.id)}
        className="flex-shrink-0 text-white/70 transition hover:text-white"
        aria-label="通知を閉じる"
      >
        <span className="text-lg">×</span>
      </button>
    </div>
  )
}

export default Toast

