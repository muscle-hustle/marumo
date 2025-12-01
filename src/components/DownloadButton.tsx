import { useCallback, type FC } from 'react'

export interface DownloadButtonProps {
  canvas: HTMLCanvasElement | null
  originalFileName: string | null
  originalMimeType: string | null
  disabled?: boolean
}

/**
 * CanvasからBlobを生成してダウンロードする
 */
const downloadCanvas = (
  canvas: HTMLCanvasElement,
  filename: string,
  mimeType: string,
  quality: number = 0.92
): void => {
  // MIMEタイプが無効な場合はPNGにフォールバック
  const validMimeType = mimeType || 'image/png'

  // JPEGの場合はqualityを指定、それ以外はqualityを無視
  if (validMimeType === 'image/jpeg') {
    canvas.toBlob((blob) => {
      if (!blob) return

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }, validMimeType, quality)
  } else {
    canvas.toBlob((blob) => {
      if (!blob) return

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }, validMimeType)
  }
}

/**
 * ファイル名から拡張子を取得し、MIMEタイプに基づいて適切な拡張子を付与
 */
const getDownloadFilename = (originalFileName: string | null, mimeType: string | null): string => {
  if (!originalFileName) {
    return 'processed-image.png'
  }

  // 元のファイル名から拡張子を取得
  const originalExt = originalFileName.split('.').pop()?.toLowerCase() || ''

  // MIMEタイプに基づいて拡張子を決定
  let extension = originalExt
  if (mimeType) {
    if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
      extension = 'jpg'
    } else if (mimeType === 'image/png') {
      extension = 'png'
    } else if (mimeType === 'image/webp') {
      extension = 'webp'
    }
  }

  // 元のファイル名から拡張子を除いた部分を取得
  const nameWithoutExt = originalFileName.replace(/\.[^/.]+$/, '')

  // 加工済みを示すサフィックスを追加
  return `${nameWithoutExt}_processed.${extension}`
}

const DownloadButton: FC<DownloadButtonProps> = ({
  canvas,
  originalFileName,
  originalMimeType,
  disabled = true
}) => {
  const handleDownload = useCallback(() => {
    if (!canvas) return

    const filename = getDownloadFilename(originalFileName, originalMimeType)
    const mimeType = originalMimeType || 'image/png'

    downloadCanvas(canvas, filename, mimeType)
  }, [canvas, originalFileName, originalMimeType])

  return (
    <button
      type="button"
      className="w-full rounded-full bg-primary-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary-400 focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-dark disabled:cursor-not-allowed disabled:bg-white/15 disabled:opacity-50"
      disabled={disabled || !canvas}
      onClick={handleDownload}
      aria-label="加工済み画像をダウンロード"
    >
      加工済み画像をダウンロード
    </button>
  )
}

export default DownloadButton
