import { useCallback, useState, type FC } from 'react'
import ImageUploader from './components/ImageUploader'
import ImageCanvas, { type CanvasStatus } from './components/ImageCanvas'
import FaceDetectionControls from './components/FaceDetectionControls'
import ProcessingOptions from './components/ProcessingOptions'
import LassoSelector from './components/LassoSelector'
import DownloadButton from './components/DownloadButton'
import { useCanvas } from './hooks/useCanvas'
import { loadImageFromFile, validateImageFile } from './services/fileHandler'
import type {
  DetectionMode,
  ManualModeType,
  ProcessingOption,
  ProcessingType,
} from './types'

const processingOptions: ProcessingOption[] = [
  { label: 'モザイク', value: 'mosaic', description: 'ピクセルを粗くして顔の輪郭をぼかします。' },
  { label: 'ぼかし', value: 'blur', description: 'ガウシアンブラーで柔らかくぼかします。' },
  { label: 'スタンプ', value: 'stamp', description: '絵文字スタンプで遊び心のあるマスクを適用します。' },
]

const validationMessage = (error: string | null) => {
  switch (error) {
    case 'INVALID_TYPE':
      return '対応していない形式です（PNG / JPEG / WebP が利用できます）'
    case 'FILE_TOO_LARGE':
      return 'ファイルサイズが大きすぎます（10MB以下にしてください）'
    case 'LOAD_ERROR':
      return '画像の読み込みに失敗しました。別のファイルをお試しください。'
    default:
      return null
  }
}

const App: FC = () => {
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null)
  const [detectionMode, setDetectionMode] = useState<DetectionMode>('auto')
  const [manualMode, setManualMode] = useState<ManualModeType>('include')
  const [processingType, setProcessingType] = useState<ProcessingType>('mosaic')
  const [intensity, setIntensity] = useState(5)
  const [canvasStatus, setCanvasStatus] = useState<CanvasStatus>('idle')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [imageInfo, setImageInfo] = useState<{ width: number; height: number } | null>(null)
  const { canvasRef, drawImage, clear } = useCanvas()

  const handleFileSelect = useCallback(
    async (file: File) => {
      setSelectedFileName(file.name)
      setValidationError(null)
      setCanvasStatus('loading')
      setImageInfo(null)

      const validation = validateImageFile(file)
      if (!validation.valid) {
        setValidationError(validation.error ?? 'INVALID_TYPE')
        setCanvasStatus('idle')
        clear()
        return
      }

      try {
        const image = await loadImageFromFile(file)
        const size = await drawImage(image)
        if (size) {
          setImageInfo(size)
        }
        setCanvasStatus('ready')
      } catch (error) {
        console.error(error)
        setValidationError('LOAD_ERROR')
        setCanvasStatus('idle')
        clear()
      }
    },
    [clear, drawImage],
  )

  return (
    <div className="bg-surface-dark text-white min-h-screen">
      <header className="relative isolate overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary-700 via-primary-500 to-primary-400 opacity-80" />
        <div className="relative px-6 py-16 sm:px-12 lg:px-20">
          <p className="font-display text-primary-200 text-sm tracking-[0.3em] uppercase">marumo</p>
          <h1 className="mt-4 text-3xl font-display font-bold sm:text-4xl lg:text-5xl">まるっと囲んで、すぐモザイク</h1>
          <p className="mt-4 max-w-2xl text-base text-white/85 sm:text-lg">
            marumo（まるも）は、写真をサーバーに送らずにブラウザだけで完結するモザイク加工アプリです。
            まずは骨格となるUIを整え、今後のSTEPで機能を注ぎ込んでいきます。
          </p>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12 sm:px-8 lg:px-12">
        <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="glass-panel p-6 space-y-4">
            <h2 className="text-lg font-display font-semibold">1. 画像を選択</h2>
            <ImageUploader
              selectedFileName={selectedFileName}
              onSelect={handleFileSelect}
              errorMessage={validationMessage(validationError)}
            />
            <p className="text-xs text-white/60">PNG / JPEG / WebP、10MBまで対応しています。</p>
          </div>

          <div className="glass-panel p-6 space-y-4">
            <h2 className="text-lg font-display font-semibold">2. プレビュー</h2>
            <ImageCanvas
              status={canvasStatus}
              caption={
                canvasStatus === 'ready' && imageInfo
                  ? `${imageInfo.width}×${imageInfo.height}px`
                  : selectedFileName
                    ? `${selectedFileName} を読み込み中`
                    : undefined
              }
              canvasRef={canvasRef}
            />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <article className="glass-panel p-6">
            <h3 className="text-base font-semibold text-primary-100">3. 検出モード</h3>
            <FaceDetectionControls
              detectionMode={detectionMode}
              manualMode={manualMode}
              onDetectionModeChange={setDetectionMode}
              onManualModeChange={setManualMode}
            />
          </article>

          <article className="glass-panel p-6">
            <h3 className="text-base font-semibold text-primary-100">4. 投げ縄ツール</h3>
            <LassoSelector isManualMode={detectionMode === 'manual'} />
          </article>

          <article className="glass-panel p-6">
            <h3 className="text-base font-semibold text-primary-100">5. 加工オプション</h3>
            <ProcessingOptions
              options={processingOptions}
              selected={processingType}
              intensity={intensity}
              onProcessingChange={setProcessingType}
              onIntensityChange={setIntensity}
            />
          </article>
        </section>

        <section className="glass-panel flex flex-col items-center gap-4 p-6 text-center">
          <p className="text-sm text-white/70">
            STEP6で加工結果をエクスポートできるようになります。それまではUIのみでの操作確認となります。
          </p>
          <DownloadButton disabled />
        </section>
      </main>
    </div>
  )
}

export default App
