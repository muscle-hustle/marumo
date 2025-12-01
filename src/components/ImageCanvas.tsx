import type { ChangeEvent, CSSProperties, DragEvent, FC, MutableRefObject } from 'react'
import { useId, useState, useRef } from 'react'

export type CanvasStatus = 'idle' | 'loading' | 'ready'

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp']

export interface ImageCanvasProps {
  status?: CanvasStatus
  caption?: string
  canvasRef: MutableRefObject<HTMLCanvasElement | null>
  dimensions?: { width: number; height: number } | null
  onFileSelect?: (file: File) => void
  errorMessage?: string | null
  disabled?: boolean
  inputRef?: React.RefObject<HTMLInputElement>
}

const statusMessage: Record<CanvasStatus, string> = {
  idle: '画像を選択するとここにプレビューが表示されます',
  loading: '読み込み中…しばらくお待ちください',
  ready: 'プレビュー準備完了',
}

const ImageCanvas: FC<ImageCanvasProps> = ({
  status = 'idle',
  caption,
  canvasRef,
  dimensions,
  onFileSelect,
  errorMessage,
  disabled,
  inputRef,
}) => {
  const inputId = useId()
  const internalInputRef = useRef<HTMLInputElement | null>(null)
  const fileInputRef = inputRef || internalInputRef
  const [isDragging, setIsDragging] = useState(false)
  const showOverlay = status !== 'ready'
  const isIdle = status === 'idle'
  const isReady = status === 'ready'

  const containerStyle: CSSProperties =
    status === 'ready' && dimensions
      ? { aspectRatio: `${dimensions.width} / ${dimensions.height}` }
      : { minHeight: '20rem' }

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    onFileSelect?.(file)
    // 同じファイルを再度選択できるようにリセット
    event.target.value = ''
  }

  const preventAndStop = (event: DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
  }

  const handleDragEnter = (event: DragEvent<HTMLDivElement | HTMLLabelElement>) => {
    preventAndStop(event)
    if (disabled) return
    setIsDragging(true)
  }

  const handleDragLeave = (event: DragEvent<HTMLDivElement | HTMLLabelElement>) => {
    preventAndStop(event)
    setIsDragging(false)
  }

  const handleDrop = (event: DragEvent<HTMLDivElement | HTMLLabelElement>) => {
    preventAndStop(event)
    setIsDragging(false)
    if (disabled) return
    const file = event.dataTransfer.files?.[0]
    if (!file) return
    onFileSelect?.(file)
  }

  const labelStateClasses = errorMessage
    ? 'border-red-400/70 hover:border-red-300/80'
    : isDragging
      ? 'border-primary-200 bg-white/10'
      : 'border-white/15 hover:border-primary-300/80 hover:bg-black/30'

  return (
    <div
      className="relative flex items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/30"
      style={containerStyle}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <canvas ref={canvasRef} className="h-full w-full bg-black/40" />
      {isIdle && (
        <label
          htmlFor={inputId}
          className={`absolute inset-0 flex cursor-pointer flex-col items-center justify-center p-8 text-center transition ${labelStateClasses}`}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            id={inputId}
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            className="hidden"
            disabled={disabled}
            onChange={handleChange}
          />
          <div className="text-primary-100">画像ファイルをドラッグ＆ドロップ</div>
          <p className="mt-2 text-sm text-white/70">またはクリックして選択（PNG / JPEG / WebP、10MBまで）</p>
          {errorMessage && (
            <p className="mt-4 text-xs text-red-400">{errorMessage}</p>
          )}
        </label>
      )}
      {isReady && (
        <>
          <input
            ref={fileInputRef}
            id={inputId}
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            className="hidden"
            disabled={disabled}
            onChange={handleChange}
          />
          {isDragging && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-center bg-primary-500/20">
              <div className="text-primary-100 text-lg font-medium">画像をドロップして変更</div>
              <p className="text-sm text-white/80">PNG / JPEG / WebP、10MBまで</p>
            </div>
          )}
        </>
      )}
      {showOverlay && !isIdle && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
          <p className="text-sm font-medium text-white/85">{caption ?? statusMessage[status]}</p>
          <p className="text-xs text-white/60">PNG / JPEG / WebP の画像を読み込みできます</p>
        </div>
      )}
      {!showOverlay && dimensions && (
        <div className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1 text-xs text-white/85">
          {dimensions.width}×{dimensions.height}px
        </div>
      )}
      {isReady && !isDragging && (
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-xs text-white/70">
          ドラッグ&ドロップで画像を変更
        </div>
      )}
    </div>
  )
}

export default ImageCanvas
