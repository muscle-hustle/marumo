import { useCallback, useState, useEffect, useRef, type FC } from 'react'
import ImageCanvas, { type CanvasStatus } from './components/ImageCanvas'
import FaceDetectionControls from './components/FaceDetectionControls'
import ProcessingOptions from './components/ProcessingOptions'
import LassoSelector from './components/LassoSelector'
import DownloadButton from './components/DownloadButton'
import { useCanvas } from './hooks/useCanvas'
import { useFaceDetection } from './hooks/useFaceDetection'
import { loadImageFromFile, validateImageFile } from './services/fileHandler'
import { faceDetectionService } from './services/faceDetection'
import type {
  DetectionMode,
  FaceDetectionResult,
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
  const [currentImage, setCurrentImage] = useState<HTMLImageElement | null>(null)
  const { canvasRef, drawImage, clear, drawFaceHighlights, redrawImage } = useCanvas()
  const { faces, isDetecting, error: faceDetectionError, detectFaces, setFaces, clearFaces } = useFaceDetection()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  // 検出済みの画像を追跡して重複検出を防ぐ
  const detectedImageRef = useRef<HTMLImageElement | null>(null)
  // 顔検出結果の履歴管理
  const [facesHistory, setFacesHistory] = useState<FaceDetectionResult[][]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const isNavigatingHistoryRef = useRef(false) // 履歴操作中かどうかのフラグ
  const autoDetectionAddedToHistoryRef = useRef(false) // 自動検出の結果が履歴に追加されたかどうか

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
        setCurrentImage(image)
        setCanvasStatus('ready')
        clearFaces()
        // 新しい画像が読み込まれたので検出済みフラグをリセット
        detectedImageRef.current = null
        // 履歴をリセット
        setFacesHistory([])
        setHistoryIndex(-1)
        autoDetectionAddedToHistoryRef.current = false
      } catch (error) {
        console.error(error)
        setValidationError('LOAD_ERROR')
        setCanvasStatus('idle')
        clear()
        setCurrentImage(null)
      }
    },
    [clear, drawImage, clearFaces],
  )

  // 検出モードが変更されたら検出済みフラグをリセット
  useEffect(() => {
    if (detectionMode === 'auto') {
      detectedImageRef.current = null
    }
  }, [detectionMode])

  // 履歴に追加する関数
  const addToHistory = useCallback((newFaces: FaceDetectionResult[]) => {
    // 顔検出がなければ履歴に追加しない
    if (newFaces.length === 0) {
      return
    }
    if (isNavigatingHistoryRef.current) {
      // 履歴操作中は追加しない
      return
    }
    setFacesHistory((prevHistory) => {
      // 現在位置より後ろの履歴を削除して新しい履歴を追加
      const newHistory = prevHistory.slice(0, historyIndex + 1)
      newHistory.push([...newFaces])
      setHistoryIndex(newHistory.length - 1)
      return newHistory
    })
  }, [historyIndex])

  // 自動モードで画像が読み込まれたら検出を実行
  useEffect(() => {
    if (
      detectionMode === 'auto' &&
      currentImage &&
      canvasStatus === 'ready' &&
      !isDetecting &&
      detectedImageRef.current !== currentImage
    ) {
      console.log('[App] 顔検出を開始します')
      detectedImageRef.current = currentImage
      autoDetectionAddedToHistoryRef.current = false // 新しい画像の検出開始時はリセット
      detectFaces(currentImage)
    }
  }, [detectionMode, currentImage, canvasStatus, isDetecting, detectFaces])

  // 自動検出の結果を履歴に追加（一度だけ）
  useEffect(() => {
    if (
      detectionMode === 'auto' &&
      faces.length > 0 &&
      detectedImageRef.current === currentImage &&
      !isNavigatingHistoryRef.current &&
      !autoDetectionAddedToHistoryRef.current
    ) {
      addToHistory(faces)
      autoDetectionAddedToHistoryRef.current = true // 履歴に追加済みフラグを立てる
    }
  }, [faces, detectionMode, currentImage, addToHistory])

  // 検出結果をCanvasに描画
  useEffect(() => {
    if (faces.length > 0 && currentImage) {
      drawFaceHighlights(faces)
    } else if (faces.length === 0 && currentImage && canvasStatus === 'ready') {
      // 検出結果がない場合は画像のみ再描画
      drawImage(currentImage)
    }
  }, [faces, currentImage, canvasStatus, drawFaceHighlights, drawImage])

  // 検出エラーを表示
  useEffect(() => {
    if (faceDetectionError) {
      console.error('顔検出エラー:', faceDetectionError)
      // TODO: STEP7でトースト通知に置き換え
    }
  }, [faceDetectionError])

  return (
    <div className="bg-surface-dark text-white min-h-screen">
      <header className="relative isolate overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: 'url(/assets/hero-image.png)' }} />
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to right, rgba(0,0,0,1), rgba(0,0,0,0.0))',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary-700 via-primary-500 to-primary-400 opacity-80" />
        <div className="relative px-6 py-16 sm:px-12 lg:px-20">
          <p className="font-display text-primary-200 text-sm tracking-[0.3em]">marumo</p>
          <h1 className="mt-5 text-3xl font-display font-bold sm:text-4xl lg:text-5xl">
            <span className="relative inline-block">
              <span className="absolute top-[-0.7em] left-1/2 -translate-x-1/2 text-white leading-none text-[0.75em]">・</span>
              ま
            </span>
            <span className="relative inline-block">
              <span className="absolute top-[-0.7em] left-1/2 -translate-x-1/2 text-white leading-none text-[0.75em]">・</span>
              る
            </span>
            っと囲んで、すぐ
            <span className="relative inline-block">
              <span className="absolute top-[-0.7em] left-1/2 -translate-x-1/2 text-white leading-none text-[0.75em]">・</span>
              モ
            </span>
            ザイク
          </h1>
          <p className="mt-4 max-w-2xl text-base text-white/85 sm:text-lg">
            marumo（まるも）は、写真をサーバーに送らずにブラウザだけで完結するモザイク加工アプリです。
          </p>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12 sm:px-8 lg:px-12">
        <section>
          <div className="glass-panel p-6 space-y-4">
            <h2 className="text-lg font-display font-semibold">1. 画像を選択</h2>
            <div className="space-y-4">
              <ImageCanvas
                status={canvasStatus}
                caption={
                  canvasStatus !== 'ready' && selectedFileName
                    ? `${selectedFileName} を読み込み中`
                    : undefined
                }
                canvasRef={canvasRef}
                dimensions={imageInfo}
                onFileSelect={handleFileSelect}
                errorMessage={validationMessage(validationError)}
                inputRef={fileInputRef}
              />
              {canvasStatus === 'ready' && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:border-primary-300/80 hover:bg-white/10"
                >
                  画像を再選択
                </button>
              )}
              <p className="text-xs text-white/60">PNG / JPEG / WebP、10MBまで対応しています。</p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="glass-panel p-6">
            <h3 className="text-base font-semibold text-primary-100">2. 検出モード</h3>
            <FaceDetectionControls
              detectionMode={detectionMode}
              manualMode={manualMode}
              isDetecting={isDetecting}
              faceCount={faces.length}
              onDetectionModeChange={setDetectionMode}
              onManualModeChange={setManualMode}
            />
            {/* 顔抽出履歴管理ボタン */}
            {facesHistory.length > 0 && (
              <div className="mt-5 space-y-3 border-t border-white/10 pt-5">
                <p className="text-sm font-semibold text-primary-100">履歴</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      isNavigatingHistoryRef.current = true
                      setFacesHistory([])
                      setHistoryIndex(-1)
                      setFaces([])
                      isNavigatingHistoryRef.current = false
                    }}
                    className="flex-1 rounded-lg bg-red-500/20 px-4 py-2 text-sm text-red-200 transition hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    リセット
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (historyIndex > 0) {
                        isNavigatingHistoryRef.current = true
                        const newIndex = historyIndex - 1
                        setHistoryIndex(newIndex)
                        setFaces([...facesHistory[newIndex]])
                        setTimeout(() => {
                          isNavigatingHistoryRef.current = false
                        }, 0)
                      }
                    }}
                    disabled={historyIndex <= 0}
                    className="flex-1 rounded-lg bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    戻す
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (historyIndex < facesHistory.length - 1) {
                        isNavigatingHistoryRef.current = true
                        const newIndex = historyIndex + 1
                        setHistoryIndex(newIndex)
                        setFaces([...facesHistory[newIndex]])
                        setTimeout(() => {
                          isNavigatingHistoryRef.current = false
                        }, 0)
                      }
                    }}
                    disabled={historyIndex >= facesHistory.length - 1}
                    className="flex-1 rounded-lg bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    進む
                  </button>
                </div>
                <p className="text-xs text-white/50">
                  {historyIndex + 1} / {facesHistory.length} ステップ
                </p>
              </div>
            )}
          </article>

          <LassoSelector
            isManualMode={detectionMode === 'manual'}
            canvasRef={canvasRef}
            faces={faces}
            drawFaceHighlights={drawFaceHighlights}
            onSelectionComplete={async (path) => {
              if (!currentImage) {
                console.warn('[App] 画像が読み込まれていません')
                return
              }
              console.log('[App] 選択完了コールバック呼び出し', { manualMode, currentFacesCount: faces.length })
              try {
                // 選択範囲内の顔を検出
                console.log('[App] 領域内の顔検出を開始します')
                // @ts-expect-error - Viteの環境変数（型定義は vite/client で提供される）
                const isDev = import.meta.env.DEV
                // canvasのサイズを取得（Path2Dの座標系変換に必要）
                const canvasSize = canvasRef.current
                  ? { width: canvasRef.current.width, height: canvasRef.current.height }
                  : undefined
                const facesInRegion = await faceDetectionService.detectFacesInRegion(
                  currentImage,
                  path,
                  undefined, // マスク画像の表示は無効化
                  canvasSize
                )
                console.log('[App] 領域内の顔検出完了', { count: facesInRegion.length })

                // IoU（Intersection over Union）を計算する関数
                const calculateIoU = (
                  face1: { x: number; y: number; width: number; height: number },
                  face2: { x: number; y: number; width: number; height: number }
                ): number => {
                  const x1 = Math.max(face1.x, face2.x)
                  const y1 = Math.max(face1.y, face2.y)
                  const x2 = Math.min(face1.x + face1.width, face2.x + face2.width)
                  const y2 = Math.min(face1.y + face1.height, face2.y + face2.height)

                  if (x2 <= x1 || y2 <= y1) return 0

                  const intersection = (x2 - x1) * (y2 - y1)
                  const area1 = face1.width * face1.height
                  const area2 = face2.width * face2.height
                  const union = area1 + area2 - intersection

                  return union > 0 ? intersection / union : 0
                }

                // include/excludeモードに応じて処理
                if (manualMode === 'include') {
                  // includeモード: 前の顔 + 新しい選択範囲内の顔（重複を除去）
                  // IoUベースで重複を判定（30%以上重複している場合は重複とみなす）
                  const IOU_THRESHOLD = 0.3
                  const newFaces = facesInRegion.filter((newFace) => {
                    // 既存の顔と重複していないかチェック
                    return !faces.some((existingFace) => {
                      const iou = calculateIoU(newFace, existingFace)
                      return iou > IOU_THRESHOLD
                    })
                  })
                  const mergedFaces = [...faces, ...newFaces]
                  console.log('[App] includeモード: 前の顔を維持し、新しい顔を追加', {
                    previousCount: faces.length,
                    newCount: facesInRegion.length,
                    mergedCount: mergedFaces.length,
                  })
                  setFaces(mergedFaces)
                  addToHistory(mergedFaces)
                } else {
                  // excludeモード: 前の顔から、新しい選択範囲内の顔を除外
                  // IoUベースで一致を判定（30%以上重複している場合は同じ顔とみなす）
                  const IOU_THRESHOLD = 0.3
                  const remainingFaces = faces.filter((existingFace) => {
                    // 選択範囲内の顔と重複していないかチェック
                    return !facesInRegion.some((faceInRegion) => {
                      const iou = calculateIoU(existingFace, faceInRegion)
                      return iou > IOU_THRESHOLD
                    })
                  })
                  console.log('[App] excludeモード: 前の顔から除外', {
                    previousCount: faces.length,
                    excludedCount: facesInRegion.length,
                    remainingCount: remainingFaces.length,
                  })
                  setFaces(remainingFaces)
                  addToHistory(remainingFaces)
                }
              } catch (error) {
                console.error('[App] 領域内の顔検出エラー:', error)
              }
            }}
            redrawImage={redrawImage}
          />

          <article className="glass-panel p-6">
            <h3 className="text-base font-semibold text-primary-100">4. 加工オプション</h3>
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
