import type { FC } from 'react'

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const LoadingSpinner: FC<LoadingSpinnerProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-4',
  }

  return (
    <div
      className={`inline-block animate-spin rounded-full border-primary-400 border-t-transparent ${sizeClasses[size]} ${className}`}
      role="status"
      aria-label="読み込み中"
    >
      <span className="sr-only">読み込み中</span>
    </div>
  )
}

export default LoadingSpinner

