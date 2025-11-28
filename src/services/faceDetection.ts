import { FaceDetection } from '@mediapipe/face_detection'
import type { FaceDetectionResult } from '../types'
import type { ExtendedDetection } from '../types/mediapipe'

// 信頼度閾値（過剰検出を抑制）
// 複数人の写真や横顔では各顔の信頼度が低くなる可能性があるため、かなり低めに設定
// 後処理でフィルタリングするため、ここでは低めに設定
const CONFIDENCE_THRESHOLD = 0.4

// 後処理の有効/無効を制御するフラグ
const ENABLE_POST_PROCESSING = false // true: 後処理を有効化, false: 後処理を無効化

// 後処理用の閾値
const MIN_FACE_SIZE_RATIO = 0.02 // 画像サイズに対する最小顔サイズ（2%）
const MAX_FACE_SIZE_RATIO = 0.5 // 画像サイズに対する最大顔サイズ（50%）
const MIN_ASPECT_RATIO = 0.6 // 最小アスペクト比（幅/高さ）
const MAX_ASPECT_RATIO = 1.5 // 最大アスペクト比（幅/高さ）
const IOU_THRESHOLD = 0.3 // 重複検出の閾値（IoU）
const MIN_CONFIDENCE_AFTER_FILTER = 0.08 // 後処理後の最小信頼度（信頼度が取得できない場合のフォールバック値より低く設定）

// タイムアウト時間（ミリ秒）
// 複数人の写真では処理に時間がかかる可能性があるため、少し長めに設定
const TIMEOUT_MS = 10000

class FaceDetectionService {
    private faceDetection: FaceDetection | null = null
    private isInitialized = false
    private initPromise: Promise<void> | null = null

    /**
     * 顔検出モデルを初期化する
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) {
            return
        }

        if (this.initPromise) {
            return this.initPromise
        }

        this.initPromise = this._initialize()
        return this.initPromise
    }

    private async _initialize(): Promise<void> {
        try {
            this.faceDetection = new FaceDetection({
                locateFile: (file) => {
                    // MediaPipeのファイルパスを正しく解決
                    // fileには以下のようなパスが渡される可能性がある:
                    // - "third_party/mediapipe/modules/face_detection/face_detection_short_range.tflite" (内部パス)
                    // - "face_detection_short_range.tflite" (直接ファイル名)
                    // - "face_detection_solution_wasm_bin.js"
                    // - "face_detection_solution_simd_wasm_bin.js"

                    // パスからファイル名を抽出
                    let fileName = file
                    if (file.includes('/')) {
                        // パスが含まれている場合、最後の部分（ファイル名）を取得
                        fileName = file.split('/').pop() || file
                    }

                    // CDNのURLを構築
                    const cdnUrl = `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${fileName}`
                    console.log(`[顔検出] locateFile: ${file} -> ${cdnUrl}`)
                    return cdnUrl
                },
            })

            this.faceDetection.setOptions({
                model: 'full', // 'short' または 'full'（'short'は高速、'full'は高精度）
                // 複数人の写真でも検出できるように、閾値を低めに設定
                minDetectionConfidence: CONFIDENCE_THRESHOLD,
            })

            // MediaPipeを初期化（これにより内部でファイルが読み込まれる）
            await this.faceDetection.initialize()

            // 初期化後、MediaPipeの内部パスを上書きする
            // MediaPipeは内部で "third_party/mediapipe/modules/face_detection/..." というパスを使うため、
            // 事前にファイルを読み込んで上書きする必要がある
            const modelFiles = [
                'face_detection_short_range.tflite',
                'face_detection_full_range_sparse.tflite',
            ]

            for (const modelFile of modelFiles) {
                try {
                    const response = await fetch(`https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${modelFile}`)
                    if (response.ok) {
                        const arrayBuffer = await response.arrayBuffer()
                        const internalPath = `third_party/mediapipe/modules/face_detection/${modelFile}`
                        // @ts-ignore - overrideFileは内部APIだが、必要
                        // MediaPipeの内部オブジェクトにアクセス
                        const faceDetectionAny = this.faceDetection as any
                        if (faceDetectionAny.g && typeof faceDetectionAny.g.overrideFile === 'function') {
                            faceDetectionAny.g.overrideFile(internalPath, arrayBuffer)
                            console.log(`[顔検出] モデルファイルを上書き: ${modelFile} (パス: ${internalPath})`)
                        } else {
                            console.warn(`[顔検出] overrideFileが利用できません`)
                        }
                    }
                } catch (error) {
                    console.warn(`[顔検出] モデルファイルの事前読み込みに失敗: ${modelFile}`, error)
                }
            }

            this.isInitialized = true
        } catch (error) {
            throw new Error('顔検出モデルの読み込みに失敗しました')
        }
    }

    /**
     * 画像内のすべての顔を検出する
     */
    async detectFaces(image: HTMLImageElement): Promise<FaceDetectionResult[]> {
        const startTime = performance.now()
        console.log(`[顔検出] 検出開始 - 画像サイズ: ${image.width}x${image.height}`)

        if (!this.isInitialized) {
            await this.initialize()
        }

        if (!this.faceDetection) {
            throw new Error('顔検出モデルが初期化されていません')
        }

        return new Promise((resolve, reject) => {
            let isResolved = false // 一度だけ実行されるようにするフラグ

            const timeoutId = setTimeout(() => {
                if (isResolved) return
                isResolved = true
                const elapsedTime = performance.now() - startTime
                console.error(`[顔検出] タイムアウト: ${elapsedTime.toFixed(2)}ms 経過`)
                reject(new Error('処理に時間がかかりすぎています'))
            }, TIMEOUT_MS)

            try {
                // MediaPipeは大きな画像を処理できない可能性があるため、最大サイズを制限
                // 横顔の検出精度を上げるため、少し大きめのサイズに設定
                const MAX_WIDTH = 2560
                const MAX_HEIGHT = 1440
                let canvasWidth = image.width
                let canvasHeight = image.height

                if (image.width > MAX_WIDTH || image.height > MAX_HEIGHT) {
                    const scale = Math.min(MAX_WIDTH / image.width, MAX_HEIGHT / image.height)
                    canvasWidth = Math.floor(image.width * scale)
                    canvasHeight = Math.floor(image.height * scale)
                    console.log(`[顔検出] 画像をリサイズ: ${image.width}x${image.height} -> ${canvasWidth}x${canvasHeight} (scale: ${scale.toFixed(3)})`)
                }

                // 一時的なCanvasを作成して画像を描画
                const canvas = document.createElement('canvas')
                canvas.width = canvasWidth
                canvas.height = canvasHeight
                const ctx = canvas.getContext('2d')
                if (!ctx) {
                    if (isResolved) return
                    isResolved = true
                    clearTimeout(timeoutId)
                    const elapsedTime = performance.now() - startTime
                    console.error(`[顔検出] Canvas取得失敗: ${elapsedTime.toFixed(2)}ms 経過`)
                    reject(new Error('Canvasの取得に失敗しました'))
                    return
                }
                ctx.drawImage(image, 0, 0, canvasWidth, canvasHeight)

                // MediaPipeに画像を送信
                console.log(`[顔検出] Canvas作成完了 - サイズ: ${canvas.width}x${canvas.height}, MediaPipeに送信`)

                // canvasWidthとcanvasHeightをコールバック内で使えるように保存
                const finalCanvasWidth = canvasWidth
                const finalCanvasHeight = canvasHeight

                this.faceDetection!.onResults((results) => {
                    const callbackTime = performance.now() - startTime
                    console.log(`[顔検出] onResultsコールバック呼び出し - ${callbackTime.toFixed(2)}ms 経過`)

                    if (isResolved) {
                        console.warn('[顔検出] 既に処理済みのためスキップ')
                        return
                    }
                    isResolved = true
                    clearTimeout(timeoutId)
                    const elapsedTime = performance.now() - startTime

                    try {
                        // 検出結果の詳細をログ出力
                        console.log(`[顔検出] MediaPipe検出結果（生データ）:`, results)
                        console.log(`[顔検出] results.detections:`, results.detections)
                        console.log(`[顔検出] results.detections?.length:`, results.detections?.length)
                        console.log(`[顔検出] results.detectionsの型:`, typeof results.detections)
                        console.log(`[顔検出] resultsオブジェクトの全キー:`, Object.keys(results))

                        if (results.detections && results.detections.length > 0) {
                            console.log(`[顔検出] 検出詳細（${results.detections.length}個）:`)
                            results.detections.forEach((det: ExtendedDetection, idx: number) => {
                                // MediaPipeの検出結果から信頼度を取得
                                // 様々な可能性のあるプロパティ名を試す
                                let score: number | string = '不明'

                                // デバッグ用：検出オブジェクトの全プロパティを確認（最初の1つだけ）
                                if (idx === 0) {
                                    console.log(`  [デバッグ] 検出オブジェクトの全プロパティ:`, Object.keys(det))
                                    console.log(`  [デバッグ] 検出オブジェクトの値:`, JSON.stringify(det, null, 2))

                                    // すべてのプロパティを確認して信頼度を探す
                                    for (const key of Object.keys(det)) {
                                        const value = (det as unknown as Record<string, unknown>)[key]
                                        if (typeof value === 'number' && value >= 0 && value <= 1) {
                                            console.log(`  [デバッグ] 信頼度の可能性があるプロパティ: ${key} = ${value}`)
                                        }
                                    }
                                }

                                // 信頼度を取得（複数の可能性を試す）
                                if (typeof det.score === 'number') {
                                    score = det.score
                                } else if (Array.isArray(det.scoreData) && det.scoreData.length > 0) {
                                    score = det.scoreData[0]
                                } else if (typeof det.confidence === 'number') {
                                    score = det.confidence
                                } else if (Array.isArray(det.V) && det.V.length > 0 && typeof det.V[0]?.ga === 'number') {
                                    // Vプロパティが配列で、その中にgaプロパティがある場合
                                    score = det.V[0].ga
                                } else if (typeof det.V === 'number') {
                                    // Vプロパティが数値の場合
                                    score = det.V
                                } else {
                                    // 信頼度が取得できない場合は、minDetectionConfidence以上の値として扱う
                                    score = CONFIDENCE_THRESHOLD + 0.05
                                }

                                const bbox = det.boundingBox
                                console.log(`  [${idx + 1}] 信頼度: ${typeof score === 'number' ? score.toFixed(3) : score}, 位置: (${(bbox.xCenter * 100).toFixed(1)}%, ${(bbox.yCenter * 100).toFixed(1)}%), サイズ: ${(bbox.width * 100).toFixed(1)}% x ${(bbox.height * 100).toFixed(1)}%`)
                            })
                        }

                        if (!results.detections || results.detections.length === 0) {
                            console.warn(`[顔検出] 検出結果が0件です。画像サイズ: ${image.width}x${image.height}, Canvasサイズ: ${finalCanvasWidth}x${finalCanvasHeight}`)
                            console.warn(`[顔検出] 現在のminDetectionConfidence: ${CONFIDENCE_THRESHOLD}`)
                            console.warn(`[顔検出] resultsオブジェクト全体:`, JSON.stringify(results, null, 2))
                            resolve([])
                            return
                        }

                        // 座標はCanvasサイズに基づいて変換し、その後元の画像サイズにスケール
                        const scaleX = image.width / finalCanvasWidth
                        const scaleY = image.height / finalCanvasHeight

                        // 1. 検出結果を画像座標に変換
                        let faces: FaceDetectionResult[] = results.detections.map((detection: ExtendedDetection) => {
                            const bbox = detection.boundingBox
                            // 正規化座標（0-1）をCanvas座標に変換し、その後元の画像サイズにスケール
                            const x = (bbox.xCenter - bbox.width / 2) * finalCanvasWidth * scaleX
                            const y = (bbox.yCenter - bbox.height / 2) * finalCanvasHeight * scaleY
                            const width = bbox.width * finalCanvasWidth * scaleX
                            const height = bbox.height * finalCanvasHeight * scaleY

                            // 信頼度を取得（MediaPipeの検出結果から実際の信頼度を取得）
                            // 様々な可能性のあるプロパティ名を試す
                            let score: number = CONFIDENCE_THRESHOLD + 0.05 // デフォルト値

                            if (typeof detection.score === 'number') {
                                score = detection.score
                            } else if (Array.isArray(detection.scoreData) && detection.scoreData.length > 0) {
                                score = detection.scoreData[0]
                            } else if (typeof detection.confidence === 'number') {
                                score = detection.confidence
                            } else if (Array.isArray(detection.V) && detection.V.length > 0 && typeof detection.V[0]?.ga === 'number') {
                                // Vプロパティが配列で、その中にgaプロパティがある場合
                                score = detection.V[0].ga
                            } else if (typeof detection.V === 'number') {
                                // Vプロパティが数値の場合
                                score = detection.V
                            }

                            // minDetectionConfidenceで既にフィルタリングされているため、
                            // 信頼度が取得できない場合は、閾値以上の値として扱う

                            return {
                                x: Math.max(0, x),
                                y: Math.max(0, y),
                                width: Math.min(width, image.width - Math.max(0, x)),
                                height: Math.min(height, image.height - Math.max(0, y)),
                                confidence: score,
                            }
                        })

                        console.log(`[顔検出] 変換後: ${faces.length}個の検出結果`)

                        // 後処理が有効な場合のみ実行
                        if (ENABLE_POST_PROCESSING) {
                            // 2. サイズフィルタリング（小さすぎる/大きすぎる検出を除外）
                            const imageArea = image.width * image.height
                            faces = faces.filter((face) => {
                                const faceArea = face.width * face.height
                                const areaRatio = faceArea / imageArea
                                const aspectRatio = face.width / face.height

                                const isValidSize = areaRatio >= MIN_FACE_SIZE_RATIO && areaRatio <= MAX_FACE_SIZE_RATIO
                                const isValidAspect = aspectRatio >= MIN_ASPECT_RATIO && aspectRatio <= MAX_ASPECT_RATIO

                                if (!isValidSize || !isValidAspect) {
                                    console.log(`[顔検出] サイズ/アスペクト比で除外: 面積比=${(areaRatio * 100).toFixed(2)}%, アスペクト比=${aspectRatio.toFixed(2)}`)
                                    return false
                                }
                                return true
                            })

                            console.log(`[顔検出] サイズフィルタ後: ${faces.length}個`)

                            // 3. 信頼度フィルタリング（緩めに設定）
                            // minDetectionConfidenceで既にフィルタリングされているため、
                            // 後処理では極端に低い信頼度のみを除外
                            const actualMinConfidence = Math.min(MIN_CONFIDENCE_AFTER_FILTER, CONFIDENCE_THRESHOLD - 0.02)
                            faces = faces.filter((face) => {
                                if (face.confidence < actualMinConfidence) {
                                    console.log(`[顔検出] 信頼度で除外: ${face.confidence.toFixed(3)} < ${actualMinConfidence}`)
                                    return false
                                }
                                return true
                            })

                            console.log(`[顔検出] 信頼度フィルタ後: ${faces.length}個（閾値: ${actualMinConfidence}）`)

                            // 4. 重複検出の除去（IoUベース）
                            faces = this.removeDuplicateDetections(faces, IOU_THRESHOLD)

                            console.log(`[顔検出] 重複除去後: ${faces.length}個`)
                        } else {
                            console.log(`[顔検出] 後処理は無効化されています（ENABLE_POST_PROCESSING = false）`)
                        }

                        console.log(`[顔検出] 検出完了: ${elapsedTime.toFixed(2)}ms, ${faces.length}個の顔を検出（後処理後）`)
                        resolve(faces)
                    } catch (error) {
                        const elapsedTime = performance.now() - startTime
                        console.error(`[顔検出] 処理エラー: ${elapsedTime.toFixed(2)}ms 経過`, error)
                        reject(new Error('顔検出に失敗しました'))
                    }
                })

                const sendTime = performance.now()
                console.log(`[顔検出] MediaPipe.send()呼び出し - ${(sendTime - startTime).toFixed(2)}ms 経過`)
                this.faceDetection!.send({ image: canvas })
                const afterSendTime = performance.now()
                console.log(`[顔検出] MediaPipe.send()完了 - ${(afterSendTime - startTime).toFixed(2)}ms 経過`)
            } catch (error) {
                if (isResolved) return
                isResolved = true
                clearTimeout(timeoutId)
                const elapsedTime = performance.now() - startTime
                console.error(`[顔検出] 送信エラー: ${elapsedTime.toFixed(2)}ms 経過`, error)
                reject(new Error('顔検出に失敗しました'))
            }
        })
    }

    /**
     * 重複検出を除去する（IoUベース）
     */
    private removeDuplicateDetections(
        faces: FaceDetectionResult[],
        iouThreshold: number,
    ): FaceDetectionResult[] {
        if (faces.length === 0) return []

        // 信頼度の高い順にソート
        const sorted = [...faces].sort((a, b) => b.confidence - a.confidence)
        const result: FaceDetectionResult[] = []

        for (const face of sorted) {
            let isDuplicate = false

            for (const existing of result) {
                const iou = this.calculateIoU(face, existing)
                if (iou > iouThreshold) {
                    isDuplicate = true
                    break
                }
            }

            if (!isDuplicate) {
                result.push(face)
            }
        }

        return result
    }

    /**
     * IoU（Intersection over Union）を計算する
     */
    private calculateIoU(face1: FaceDetectionResult, face2: FaceDetectionResult): number {
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

    /**
     * 指定された領域内の顔を検出する（STEP4で実装）
     */
    async detectFacesInRegion(
        _image: HTMLImageElement,
        _region: Path2D,
    ): Promise<FaceDetectionResult[]> {
        // STEP4で実装
        throw new Error('未実装: detectFacesInRegion')
    }
}

// シングルトンインスタンスをエクスポート
export const faceDetectionService = new FaceDetectionService()
