import type { CSSProperties, FC, MutableRefObject } from 'react'

export type CanvasStatus = 'idle' | 'loading' | 'ready'

export interface ImageCanvasProps {
  status?: CanvasStatus
  caption?: string
  canvasRef: MutableRefObject<HTMLCanvasElement | null>
  dimensions?: { width: number; height: number } | null
}

const statusMessage: Record<CanvasStatus, string> = {
  idle: '画像を選択するとここにプレビューが表示されます',
  loading: '読み込み中…しばらくお待ちください',
  ready: 'プレビュー準備完了',
}

const ImageCanvas: FC<ImageCanvasProps> = ({ status = 'idle', caption, canvasRef, dimensions }) => {
  const showOverlay = status !== 'ready'
  const containerStyle: CSSProperties =
    status === 'ready' && dimensions
      ? { aspectRatio: `${dimensions.width} / ${dimensions.height}` }
      : { minHeight: '20rem' }

  return (
    <div
      className="relative flex items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/30"
      style={containerStyle}
    >
      <canvas ref={canvasRef} className="h-full w-full bg-black/40" />
      {showOverlay && (
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
    </div>
  )
}

export default ImageCanvas
