import { useCallback, useState, useEffect, useRef, type FC } from 'react'
import ImageCanvas, { type CanvasStatus } from './components/ImageCanvas'
import ProcessingOptions from './components/ProcessingOptions'
import LassoSelector from './components/LassoSelector'
import DownloadButton from './components/DownloadButton'
import StampSelector, { type StampType } from './components/StampSelector'
import ToastContainer from './components/ToastContainer'
import LoadingSpinner from './components/LoadingSpinner'
import ManualToolbar from './components/ManualToolbar'
import { useCanvas } from './hooks/useCanvas'
import { useFaceDetection } from './hooks/useFaceDetection'
import { useToast } from './hooks/useToast'
import { loadImageFromFile, validateImageFile } from './services/fileHandler'
import { faceDetectionService } from './services/faceDetection'
import { imageProcessorService } from './services/imageProcessor'
import type {
  DetectionMode,
  FaceDetectionResult,
  ManualModeType,
  ProcessingOption,
  ProcessingType,
} from './types'

const processingOptions: ProcessingOption[] = [
  { label: 'モザイク', value: 'mosaic', description: 'ピクセルを粗くして顔の輪郭をぼかします。', emoji: '🔲' },
  { label: 'ぼかし', value: 'blur', description: 'ガウシアンブラーで柔らかくぼかします。', emoji: '🌫️' },
  { label: 'スタンプ', value: 'stamp', description: '絵文字スタンプで遊び心のあるマスクを適用します。', emoji: '😀' },
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
  const [originalMimeType, setOriginalMimeType] = useState<string | null>(null)
  const [detectionMode, setDetectionMode] = useState<DetectionMode | null>('auto')
  const [manualMode, setManualMode] = useState<ManualModeType>('include')
  const [processingType, setProcessingType] = useState<ProcessingType>('blur')
  const [selectedStamp, setSelectedStamp] = useState<StampType>('emoji1')
  const [canvasStatus, setCanvasStatus] = useState<CanvasStatus>('idle')
  const [processedCanvas, setProcessedCanvas] = useState<HTMLCanvasElement | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [imageInfo, setImageInfo] = useState<{ width: number; height: number } | null>(null)
  const [currentImage, setCurrentImage] = useState<HTMLImageElement | null>(null)
  const [stampError, setStampError] = useState<string | null>(null)
  const { canvasRef, drawImage, clear, drawFaceHighlights, redrawImage } = useCanvas()
  const { faces, isDetecting, error: faceDetectionError, detectFaces, setFaces, clearFaces } = useFaceDetection()
  const { toasts, showToast, removeToast } = useToast()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  // 検出済みの画像を追跡して重複検出を防ぐ
  const detectedImageRef = useRef<HTMLImageElement | null>(null)
  // 顔検出結果の履歴管理
  const [facesHistory, setFacesHistory] = useState<FaceDetectionResult[][]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const isNavigatingHistoryRef = useRef(false) // 履歴操作中かどうかのフラグ
  const autoDetectionAddedToHistoryRef = useRef(false) // 自動検出の結果が履歴に追加されたかどうか

  // 加工処理を適用する共通関数
  const applyImageProcessing = useCallback(
    async (canvas: HTMLCanvasElement, faces: FaceDetectionResult[], image: HTMLImageElement) => {
      // 元の画像を再描画
      redrawImage()

      // 加工処理を適用
      const saveProcessedCanvas = () => {
        // 処理済みCanvasを保存（ダウンロード用）
        const processed = document.createElement('canvas')
        processed.width = canvas.width
        processed.height = canvas.height
        const processedCtx = processed.getContext('2d')
        if (processedCtx) {
          processedCtx.drawImage(canvas, 0, 0)
          setProcessedCanvas(processed)
        }
      }

      try {
        if (processingType === 'mosaic') {
          imageProcessorService.applyMosaic(canvas, faces, image)
          saveProcessedCanvas()
        } else if (processingType === 'blur') {
          imageProcessorService.applyBlur(canvas, faces, image)
          saveProcessedCanvas()
        } else if (processingType === 'stamp') {
          // 選択されたスタンプ画像を読み込む
          const stampPath = `/assets/stamps/${selectedStamp}.png`
          setStampError(null) // エラーをリセット
          try {
            const stampImage = await imageProcessorService.loadStampImage(stampPath)
            imageProcessorService.applyStamp(canvas, faces, stampImage, image)
            saveProcessedCanvas()
            setStampError(null) // 成功時はエラーをクリア
          } catch (error) {
            console.error('スタンプ画像の読み込みエラー:', error)
            const errorMessage = 'スタンプ画像の読み込みに失敗しました。ページを再読み込みしてください。'
            setStampError(errorMessage)
            showToast(errorMessage, 'error')
          }
        } else {
          // 他の処理タイプの場合はエラーをクリア
          setStampError(null)
        }
      } catch (error) {
        console.error('加工処理エラー:', error)
      }
    },
    [processingType, selectedStamp, redrawImage, showToast],
  )

  const handleFileSelect = useCallback(
    async (file: File) => {
      setSelectedFileName(file.name)
      setOriginalMimeType(file.type)
      setValidationError(null)
      setCanvasStatus('loading')
      setImageInfo(null)

      const validation = validateImageFile(file)
      if (!validation.valid) {
        const error = validation.error ?? 'INVALID_TYPE'
        setValidationError(error)
        setCanvasStatus('idle')
        clear()

        // トースト通知を表示
        if (error === 'INVALID_TYPE') {
          showToast('対応していない形式です（PNG / JPEG / WebP が利用できます）', 'error')
        } else if (error === 'FILE_TOO_LARGE') {
          showToast('ファイルサイズが大きすぎます（10MB以下にしてください）', 'error')
        }
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
        showToast('画像の読み込みに失敗しました。別のファイルをお試しください。', 'error')
      }
    },
    [clear, drawImage, clearFaces, showToast],
  )

  // 検出モードが変更されたら検出済みフラグと状態をリセット
  useEffect(() => {
    if (detectionMode !== null) {
      detectedImageRef.current = null
      // モード切り替え時は顔検出結果をクリア
      if (detectionMode === 'manual') {
        // 手動モードに切り替えた場合は、既存の顔検出結果をクリア
        setFaces([])
        setFacesHistory([])
        setHistoryIndex(-1)
        setProcessedCanvas(null)
      }
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

  // 自動モードで顔検出が完了したら自動で加工を適用
  useEffect(() => {
    if (
      detectionMode === 'auto' &&
      faces.length > 0 &&
      currentImage &&
      canvasStatus === 'ready' &&
      !isDetecting &&
      detectedImageRef.current === currentImage
    ) {
      const canvas = canvasRef.current
      if (!canvas) return

      applyImageProcessing(canvas, faces, currentImage)
    }
  }, [detectionMode, faces, currentImage, canvasStatus, isDetecting, canvasRef, applyImageProcessing])

  // 検出結果をCanvasに描画（手動モードのみ、自動モードはモザイクが適用されるため不要）
  useEffect(() => {
    if (detectionMode === 'manual') {
      if (faces.length > 0 && currentImage) {
        drawFaceHighlights(faces)
      } else if (faces.length === 0 && currentImage && canvasStatus === 'ready') {
        // 検出結果がない場合は画像のみ再描画
        drawImage(currentImage)
      }
    }
  }, [detectionMode, faces, currentImage, canvasStatus, drawFaceHighlights, drawImage])

  // 手動モードで加工処理を実行（自動モードは別のuseEffectで処理）
  useEffect(() => {
    // 自動モードの場合はこのuseEffectをスキップ（自動でモザイクが適用される）
    if (detectionMode === 'auto') {
      return
    }

    const canvas = canvasRef.current
    if (!canvas || !currentImage || faces.length === 0 || canvasStatus !== 'ready') {
      setProcessedCanvas(null)
      return
    }

    applyImageProcessing(canvas, faces, currentImage)
  }, [detectionMode, faces, currentImage, canvasStatus, canvasRef, applyImageProcessing])

  // 検出エラーを表示
  useEffect(() => {
    if (faceDetectionError) {
      console.error('顔検出エラー:', faceDetectionError)
      showToast('顔を検出できませんでした。手動モードをお試しください。', 'warning')
    }
  }, [faceDetectionError, showToast])

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
        {/* モード選択（画面上部に常に表示、切り替え可能） */}
        <section>
          <div className="glass-panel p-4">
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDetectionMode('auto')}
                className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-dark ${detectionMode === 'auto'
                  ? 'border-primary-400 bg-primary-400/10 text-white'
                  : 'border-white/10 bg-white/5 text-white/75 hover:border-white/20'
                  }`}
                aria-pressed={detectionMode === 'auto'}
              >
                <span className="text-lg">⚡</span>
                <span>自動モード</span>
              </button>
              <button
                type="button"
                onClick={() => setDetectionMode('manual')}
                className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-dark ${detectionMode === 'manual'
                  ? 'border-primary-400 bg-primary-400/10 text-white'
                  : 'border-white/10 bg-white/5 text-white/75 hover:border-white/20'
                  }`}
                aria-pressed={detectionMode === 'manual'}
              >
                <span className="text-lg">✏️</span>
                <span>手動モード</span>
              </button>
            </div>
          </div>
        </section>

        {/* 画像選択セクション */}
        {detectionMode !== null && (
          <section>
            <div className="glass-panel p-6 space-y-4">
              <div className="flex items-center justify-between">
                {canvasStatus === 'ready' && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:border-primary-300/80 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-dark"
                    aria-label="画像を再選択"
                  >
                    画像を再選択
                  </button>
                )}
              </div>
              <div className="space-y-4">
                <div className="relative">
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
                  {/* 手動モードのツールバーをプレビュー画面の近くに配置（デスクトップは画像の上、スマホは画像の下） */}
                  {detectionMode === 'manual' && canvasStatus === 'ready' && (
                    <div className="mt-4 sm:absolute sm:bottom-4 sm:left-4 sm:right-4 sm:mt-0 sm:z-10">
                      <ManualToolbar
                        manualMode={manualMode}
                        onManualModeChange={setManualMode}
                        onReset={() => {
                          isNavigatingHistoryRef.current = true
                          setFacesHistory([])
                          setHistoryIndex(-1)
                          setFaces([])
                          isNavigatingHistoryRef.current = false
                        }}
                        canUndo={historyIndex > 0}
                        canRedo={historyIndex < facesHistory.length - 1}
                        onUndo={() => {
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
                        onRedo={() => {
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
                        onAutoSelect={async () => {
                          if (!currentImage) {
                            console.warn('[App] 画像が読み込まれていません')
                            return
                          }
                          try {
                            const detectedFaces = await faceDetectionService.detectFaces(currentImage)
                            setFaces(detectedFaces)
                            addToHistory(detectedFaces)
                          } catch (error) {
                            console.error('[App] 自動選択エラー:', error)
                            showToast('顔の自動検出に失敗しました', 'error')
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
                <p className="text-xs text-white/60">PNG / JPEG / WebP、10MBまで対応しています。</p>
              </div>
            </div>
          </section>
        )}

        {/* 手動モードの場合のみLassoSelectorを表示 */}
        {detectionMode === 'manual' && (
          <LassoSelector
            isManualMode={true}
            canvasRef={canvasRef}
            faces={faces}
            drawFaceHighlights={drawFaceHighlights}
            processedCanvas={processedCanvas}
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
        )}

        {/* 加工（自動モードと手動モードの両方で表示） */}
        {detectionMode !== null && (
          <>
            <section>
              <article className="glass-panel p-6">
                <ProcessingOptions
                  options={processingOptions}
                  selected={processingType}
                  onProcessingChange={setProcessingType}
                />
                {processingType === 'stamp' && (
                  <div className="mt-6 border-t border-white/10 pt-6">
                    <StampSelector selected={selectedStamp} onStampChange={setSelectedStamp} />
                  </div>
                )}
              </article>
            </section>

            <section className="glass-panel flex flex-col items-center gap-4 p-6 text-center">
              {stampError ? (
                <p className="text-sm text-red-300">{stampError}</p>
              ) : (
                <p className="text-sm text-white/70">
                  {processedCanvas
                    ? '加工が完了しました。ダウンロードボタンから保存できます。'
                    : '顔を検出して加工種類を選択すると、加工結果が表示されます。'}
                </p>
              )}
              <DownloadButton
                canvas={processedCanvas}
                originalFileName={selectedFileName}
                originalMimeType={originalMimeType}
                disabled={!processedCanvas}
              />
            </section>
          </>
        )}
      </main>

      <footer className="mx-auto w-full max-w-6xl px-6 py-8 sm:px-8 lg:px-12">
        <div className="flex flex-col items-center gap-2">
          <p className="text-center text-sm text-white/60">
            © {new Date().getFullYear()} marumo. All rights reserved.
          </p>
          <a
            href="https://github.com/muscle-hustle/marumo"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-white/60 transition hover:text-white/80 focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-dark"
            aria-label="GitHubリポジトリを開く（新しいタブ）"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-4 w-4"
            >
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            <span>GitHub</span>
          </a>
        </div>
      </footer>

      <ToastContainer toasts={toasts} onClose={removeToast} />
      {isDetecting && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 rounded-lg bg-white/10 px-6 py-4 backdrop-blur-md">
            <LoadingSpinner size="lg" />
            <p className="text-sm text-white">顔を検出しています...</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
