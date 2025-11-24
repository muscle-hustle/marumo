import type { ChangeEvent, DragEvent, FC } from 'react'
import { useId, useState } from 'react'

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp']

export interface ImageUploaderProps {
  onSelect?: (file: File) => void
  selectedFileName?: string | null
  disabled?: boolean
  errorMessage?: string | null
}

const ImageUploader: FC<ImageUploaderProps> = ({
  onSelect,
  selectedFileName,
  disabled,
  errorMessage,
}) => {
  const inputId = useId()
  const [isDragging, setIsDragging] = useState(false)

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    onSelect?.(file)
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
    onSelect?.(file)
  }

  const labelStateClasses = errorMessage
    ? 'border-red-400/70 hover:border-red-300/80'
    : isDragging
      ? 'border-primary-200 bg-white/10'
      : 'border-white/15 hover:border-primary-300/80 hover:bg-black/30'

  return (
    <div
      className="space-y-4"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <label
        htmlFor={inputId}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed bg-black/20 p-8 text-center transition ${labelStateClasses}`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          id={inputId}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          className="hidden"
          disabled={disabled}
          onChange={handleChange}
        />
        <div className="text-primary-100">画像ファイルをドラッグ＆ドロップ</div>
        <p className="mt-2 text-sm text-white/70">またはクリックして選択（PNG / JPEG / WebP、10MBまで）</p>
      </label>
      <div className="text-xs">
        {errorMessage ? (
          <p className="text-red-400">{errorMessage}</p>
        ) : (
          <p className="text-white/60">
            {selectedFileName ? `選択中: ${selectedFileName}` : 'まだ画像は選択されていません'}
          </p>
        )}
      </div>
    </div>
  )
}

export default ImageUploader
