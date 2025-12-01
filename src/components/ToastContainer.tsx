import { type FC } from 'react'
import Toast from './Toast'
import type { ToastMessage } from '../types'

export interface ToastContainerProps {
  toasts: ToastMessage[]
  onClose: (id: string) => void
}

const ToastContainer: FC<ToastContainerProps> = ({ toasts, onClose }) => {
  if (toasts.length === 0) return null

  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-50 flex flex-col gap-2 sm:left-auto sm:right-4 sm:max-w-md"
      role="region"
      aria-label="通知"
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  )
}

export default ToastContainer

