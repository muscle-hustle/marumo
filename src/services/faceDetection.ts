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

// 手動選択用の閾値（自動選択と同等の値を使用）
const MANUAL_SELECTION_DETECTION_THRESHOLD = CONFIDENCE_THRESHOLD // MediaPipe検出閾値
const MANUAL_SELECTION_MIN_CONFIDENCE = MIN_CONFIDENCE_AFTER_FILTER // 最小信頼度フィルタ
const MANUAL_SELECTION_IOU_THRESHOLD = 0.3 // 重複検出の閾値（IoU）

// タイムアウト時間（ミリ秒）
// 複数人の写真では処理に時間がかかる可能性があるため、少し長めに設定
const TIMEOUT_MS = 10000


class FaceDetectionService {
    private faceDetection: FaceDetection | null = null
    private isInitialized = false
    private initPromise: Promise<void> | null = null
    private isDetecting = false // 検出中のフラグ
    private currentDetectionPromise: Promise<FaceDetectionResult[]> | null = null // 現在の検出Promise
    private originalConfidenceThreshold = CONFIDENCE_THRESHOLD // 元の信頼度閾値を保持

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

            this.originalConfidenceThreshold = CONFIDENCE_THRESHOLD
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
     * 検出処理の準備（初期化チェック、検出中フラグの管理）
     */
    private async prepareDetection(): Promise<void> {
        // 既に検出中の場合は、現在の検出が完了するまで待つ
        if (this.isDetecting && this.currentDetectionPromise) {
            console.log('[顔検出] 既に検出中のため、完了を待機します')
            await this.currentDetectionPromise
        }

        if (!this.isInitialized) {
            await this.initialize()
        }

        if (!this.faceDetection) {
            throw new Error('顔検出モデルが初期化されていません')
        }

        // 検出中フラグを設定（前回の検出が残っている場合はリセット）
        if (this.isDetecting && this.currentDetectionPromise) {
            console.warn('[顔検出] 前回の検出が完了していません。状態をリセットします')
            this.isDetecting = false
            this.currentDetectionPromise = null
        }

        this.isDetecting = true
    }

    /**
     * 画像サイズをMediaPipeの制限に合わせてリサイズ
     */
    private calculateCanvasSize(image: HTMLImageElement): { width: number; height: number } {
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

        return { width: canvasWidth, height: canvasHeight }
    }

    /**
     * MediaPipeの検出結果を画像座標系に変換
     */
    private convertDetectionsToImageCoordinates(
        detections: ExtendedDetection[],
        canvasWidth: number,
        canvasHeight: number,
        imageWidth: number,
        imageHeight: number
    ): FaceDetectionResult[] {
        const scaleX = imageWidth / canvasWidth
        const scaleY = imageHeight / canvasHeight

        return detections.map((detection: ExtendedDetection) => {
            const bbox = detection.boundingBox
            // 正規化座標（0-1）をCanvas座標に変換し、その後元の画像サイズにスケール
            const x = (bbox.xCenter - bbox.width / 2) * canvasWidth * scaleX
            const y = (bbox.yCenter - bbox.height / 2) * canvasHeight * scaleY
            const width = bbox.width * canvasWidth * scaleX
            const height = bbox.height * canvasHeight * scaleY

            // 信頼度を取得
            const score = this.extractConfidence(detection)

            return {
                x: Math.max(0, x),
                y: Math.max(0, y),
                width: Math.min(width, imageWidth - Math.max(0, x)),
                height: Math.min(height, imageHeight - Math.max(0, y)),
                confidence: score,
            }
        })
    }

    /**
     * MediaPipeに画像を送信して検出を実行
     * 基本的な検出処理のみを行い、後処理は呼び出し元で行う
     */
    private sendToMediaPipe(
        canvas: HTMLCanvasElement,
        image: HTMLImageElement,
        canvasWidth: number,
        canvasHeight: number,
        minDetectionConfidence: number,
        startTime: number,
        logPrefix: string = ''
    ): Promise<FaceDetectionResult[]> {
        // 現在の検出Promiseを保存（呼び出し元で管理するため、ここでは保存しない）
        // 一時的に信頼度閾値を設定
        const originalConfidence = this.originalConfidenceThreshold
        this.faceDetection!.setOptions({
            minDetectionConfidence: minDetectionConfidence,
        })

        return new Promise<FaceDetectionResult[]>((resolve, reject) => {
            let isResolved = false

            const timeoutId = setTimeout(() => {
                if (isResolved) return
                isResolved = true
                this.isDetecting = false
                this.currentDetectionPromise = null
                // 元の信頼度閾値に戻す
                this.faceDetection!.setOptions({
                    minDetectionConfidence: originalConfidence,
                })
                reject(new Error('処理に時間がかかりすぎています'))
            }, TIMEOUT_MS)

            // onResultsコールバックを設定
            this.faceDetection!.onResults((results) => {
                const callbackTime = performance.now() - startTime
                const prefix = logPrefix ? `${logPrefix} ` : ''
                console.log(`[顔検出] ${prefix}onResultsコールバック呼び出し - ${callbackTime.toFixed(2)}ms 経過`)

                if (isResolved) {
                    return
                }
                isResolved = true
                clearTimeout(timeoutId)

                try {
                    // 検出結果の詳細をログ出力
                    console.log(`[顔検出] ${prefix}MediaPipe検出結果（生データ）:`, results)
                    console.log(`[顔検出] ${prefix}results.detections:`, results.detections)
                    console.log(`[顔検出] ${prefix}results.detections?.length:`, results.detections?.length)

                    if (!results.detections || results.detections.length === 0) {
                        console.warn(`[顔検出] ${prefix}検出結果が0件です。画像サイズ: ${image.width}x${image.height}, Canvasサイズ: ${canvasWidth}x${canvasHeight}`)
                        console.warn(`[顔検出] ${prefix}現在のminDetectionConfidence: ${minDetectionConfidence}`)
                        // 元の信頼度閾値に戻す
                        this.faceDetection!.setOptions({
                            minDetectionConfidence: originalConfidence,
                        })
                        this.isDetecting = false
                        this.currentDetectionPromise = null
                        resolve([])
                        return
                    }

                    // 検出結果を画像座標系に変換
                    const faces = this.convertDetectionsToImageCoordinates(
                        results.detections,
                        canvasWidth,
                        canvasHeight,
                        image.width,
                        image.height
                    )

                    console.log(`[顔検出] ${prefix}変換後: ${faces.length}個の検出結果`)

                    // 元の信頼度閾値に戻す
                    this.faceDetection!.setOptions({
                        minDetectionConfidence: originalConfidence,
                    })
                    this.isDetecting = false
                    this.currentDetectionPromise = null

                    const elapsedTime = performance.now() - startTime
                    console.log(`[顔検出] ${prefix}基本検出完了: ${elapsedTime.toFixed(2)}ms, ${faces.length}個の顔を検出`)
                    resolve(faces)
                } catch (error) {
                    // 元の信頼度閾値に戻す
                    this.faceDetection!.setOptions({
                        minDetectionConfidence: originalConfidence,
                    })
                    this.isDetecting = false
                    this.currentDetectionPromise = null
                    const elapsedTime = performance.now() - startTime
                    console.error(`[顔検出] ${prefix}処理エラー: ${elapsedTime.toFixed(2)}ms 経過`, error)
                    reject(new Error('顔検出に失敗しました'))
                }
            })

            // MediaPipeに画像を送信
            try {
                const prefix = logPrefix ? `${logPrefix} ` : ''
                console.log(`[顔検出] ${prefix}Canvas作成完了 - サイズ: ${canvas.width}x${canvas.height}, MediaPipeに送信`)
                this.faceDetection!.send({ image: canvas })
                const afterSendTime = performance.now()
                console.log(`[顔検出] ${prefix}MediaPipe.send()完了 - ${(afterSendTime - startTime).toFixed(2)}ms 経過`)
            } catch (error) {
                if (isResolved) return
                isResolved = true
                clearTimeout(timeoutId)
                this.isDetecting = false
                this.currentDetectionPromise = null
                // 元の信頼度閾値に戻す
                this.faceDetection!.setOptions({
                    minDetectionConfidence: originalConfidence,
                })
                const elapsedTime = performance.now() - startTime
                console.error(`[顔検出] 送信エラー: ${elapsedTime.toFixed(2)}ms 経過`, error)
                reject(new Error('顔検出に失敗しました'))
            }
        })
    }

    /**
     * 画像内のすべての顔を検出する
     */
    async detectFaces(image: HTMLImageElement): Promise<FaceDetectionResult[]> {
        await this.prepareDetection()

        const startTime = performance.now()
        console.log(`[顔検出] 検出開始 - 画像サイズ: ${image.width}x${image.height}`)

        // 画像サイズを計算
        const { width: canvasWidth, height: canvasHeight } = this.calculateCanvasSize(image)

        // Canvasを作成して画像を描画
        const canvas = document.createElement('canvas')
        canvas.width = canvasWidth
        canvas.height = canvasHeight
        const ctx = canvas.getContext('2d')
        if (!ctx) {
            this.isDetecting = false
            throw new Error('Canvasの取得に失敗しました')
        }
        ctx.drawImage(image, 0, 0, canvasWidth, canvasHeight)

        // MediaPipeに送信して検出を実行
        const detectionPromise = this.sendToMediaPipe(
            canvas,
            image,
            canvasWidth,
            canvasHeight,
            CONFIDENCE_THRESHOLD,
            startTime,
            ''
        )

        // 現在の検出Promiseを保存
        this.currentDetectionPromise = detectionPromise

        const faces = await detectionPromise

        // 後処理が有効な場合のみ実行
        if (ENABLE_POST_PROCESSING) {
            // サイズフィルタリング
            const imageArea = image.width * image.height
            let filteredFaces = faces.filter((face) => {
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

            console.log(`[顔検出] サイズフィルタ後: ${filteredFaces.length}個`)

            // 信頼度フィルタリング
            const actualMinConfidence = Math.min(MIN_CONFIDENCE_AFTER_FILTER, CONFIDENCE_THRESHOLD - 0.02)
            filteredFaces = filteredFaces.filter((face) => {
                if (face.confidence < actualMinConfidence) {
                    console.log(`[顔検出] 信頼度で除外: ${face.confidence.toFixed(3)} < ${actualMinConfidence}`)
                    return false
                }
                return true
            })

            console.log(`[顔検出] 信頼度フィルタ後: ${filteredFaces.length}個（閾値: ${actualMinConfidence}）`)

            // 重複検出の除去
            const finalFaces = this.removeDuplicateDetections(filteredFaces, IOU_THRESHOLD)
            console.log(`[顔検出] 重複除去後: ${finalFaces.length}個`)

            return finalFaces
        } else {
            console.log(`[顔検出] 後処理は無効化されています（ENABLE_POST_PROCESSING = false）`)
            return faces
        }
    }


    /**
     * MediaPipeの検出結果から信頼度を取得する
     * 様々な可能性のあるプロパティ名を試して信頼度を取得する
     */
    private extractConfidence(detection: ExtendedDetection): number {
        // デフォルト値（minDetectionConfidenceで既にフィルタリングされているため、閾値以上の値として扱う）
        let score: number = CONFIDENCE_THRESHOLD + 0.05

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

        return score
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
     * 重複検出を除去する（IoUベース + 中心点距離ベース）
     * 手動選択時により厳密な重複検出を行う
     */
    private removeDuplicateDetectionsWithCenterDistance(
        faces: FaceDetectionResult[],
        iouThreshold: number,
    ): FaceDetectionResult[] {
        if (faces.length === 0) return []

        // 信頼度の高い順にソート
        const sorted = [...faces].sort((a, b) => b.confidence - a.confidence)
        const result: FaceDetectionResult[] = []

        // 中心点距離の閾値（顔の平均サイズの30%以内なら重複とみなす）
        const getAverageFaceSize = () => {
            if (sorted.length === 0) return 0
            const totalSize = sorted.reduce((sum, face) => sum + Math.sqrt(face.width * face.height), 0)
            return totalSize / sorted.length
        }
        const averageFaceSize = getAverageFaceSize()
        const centerDistanceThreshold = averageFaceSize * 0.3

        for (const face of sorted) {
            let isDuplicate = false

            for (const existing of result) {
                // IoUチェック
                const iou = this.calculateIoU(face, existing)
                if (iou > iouThreshold) {
                    isDuplicate = true
                    break
                }

                // 中心点距離チェック
                const faceCenterX = face.x + face.width / 2
                const faceCenterY = face.y + face.height / 2
                const existingCenterX = existing.x + existing.width / 2
                const existingCenterY = existing.y + existing.height / 2

                const centerDistance = Math.sqrt(
                    Math.pow(faceCenterX - existingCenterX, 2) + Math.pow(faceCenterY - existingCenterY, 2)
                )

                // 中心点が近く、かつサイズが似ている場合は重複とみなす
                if (centerDistance < centerDistanceThreshold) {
                    const faceSize = Math.sqrt(face.width * face.height)
                    const existingSize = Math.sqrt(existing.width * existing.height)
                    const sizeRatio = Math.min(faceSize, existingSize) / Math.max(faceSize, existingSize)

                    // サイズ比が0.7以上（30%以内の差）なら重複とみなす
                    if (sizeRatio > 0.7) {
                        isDuplicate = true
                        break
                    }
                }
            }

            if (!isDuplicate) {
                result.push(face)
            }
        }

        return result
    }

    /**
     * 指定された領域内の顔を検出する
     * 画像全体を検出してから、選択範囲内の顔をフィルタリングする（現在の実装）
     */
    async detectFacesInRegion(
        image: HTMLImageElement,
        region: Path2D,
        onMaskedImageReady?: (imageUrl: string) => void,
        canvasSize?: { width: number; height: number },
    ): Promise<FaceDetectionResult[]> {
        // 選択範囲のみをMediaPipeに渡す方法を試す（実験的実装）
        // 精度向上の可能性があるため、USE_CROPPED_REGIONフラグで切り替え可能にする
        const USE_CROPPED_REGION = true // true: 選択範囲のみを切り抜いて検出, false: 画像全体を検出してフィルタリング

        if (USE_CROPPED_REGION) {
            return this.detectFacesInRegionCropped(image, region, onMaskedImageReady, canvasSize)
        }

        // 1. 画像全体に対して顔検出を実行
        const allFaces = await this.detectFaces(image)

        if (allFaces.length === 0) {
            return []
        }

        // 2. Canvasを作成してPath2Dの判定に使用
        // 画像とCanvasのスケール比を計算（detectFacesと同じロジック）
        const MAX_WIDTH = 2560
        const MAX_HEIGHT = 1440
        let canvasWidth = image.width
        let canvasHeight = image.height

        if (image.width > MAX_WIDTH || image.height > MAX_HEIGHT) {
            const scale = Math.min(MAX_WIDTH / image.width, MAX_HEIGHT / image.height)
            canvasWidth = Math.floor(image.width * scale)
            canvasHeight = Math.floor(image.height * scale)
        }

        // 3. 一時的なCanvasを作成してPath2Dの判定に使用
        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = canvasWidth
        tempCanvas.height = canvasHeight
        const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true })
        if (!tempCtx) {
            return []
        }

        // 4. Path2Dを一時的なCanvasに描画（白で塗りつぶす）
        tempCtx.fillStyle = 'white'
        tempCtx.fill(region)

        // 5. 画像データを取得して判定に使用
        const imageData = tempCtx.getImageData(0, 0, canvasWidth, canvasHeight)
        const data = imageData.data

        // 6. 検出された顔の中心点が選択範囲内にあるか判定
        const scaleX = canvasWidth / image.width
        const scaleY = canvasHeight / image.height

        const facesInRegion: FaceDetectionResult[] = []

        for (const face of allFaces) {
            // 顔の中心座標を計算（元の画像座標系）
            const faceCenterX = face.x + face.width / 2
            const faceCenterY = face.y + face.height / 2

            // Canvas座標系に変換（整数に丸める）
            const canvasX = Math.floor(faceCenterX * scaleX)
            const canvasY = Math.floor(faceCenterY * scaleY)

            // 範囲外チェック
            if (canvasX < 0 || canvasX >= canvasWidth || canvasY < 0 || canvasY >= canvasHeight) {
                continue
            }

            // ピクセルデータから判定（白で塗りつぶされているか）
            const index = (canvasY * canvasWidth + canvasX) * 4
            const r = data[index]
            const g = data[index + 1]
            const b = data[index + 2]
            const a = data[index + 3]

            // 白（255, 255, 255）で塗りつぶされている場合、選択範囲内と判定
            if (r === 255 && g === 255 && b === 255 && a === 255) {
                facesInRegion.push(face)
            }
        }

        return facesInRegion
    }

    /**
     * 選択範囲外をマスクしてMediaPipeに渡す方法（実験的実装）
     * 精度向上の可能性：
     * - 選択範囲に焦点を当てることで、小さな顔や端にある顔の検出精度が上がる可能性
     * - ノイズが減ることで、誤検出が減る可能性
     * 
     * メリット：
     * - 座標変換が不要（元の画像サイズのまま）
     * - 実装がシンプル
     * - 選択範囲の境界で顔が切れていても検出可能
     */
    private async detectFacesInRegionCropped(
        image: HTMLImageElement,
        region: Path2D,
        _onMaskedImageReady?: (imageUrl: string) => void,
        canvasSize?: { width: number; height: number },
    ): Promise<FaceDetectionResult[]> {
        await this.prepareDetection()

        const startTime = performance.now()
        console.log(`[顔検出] 選択範囲マスク方式で検出開始`)

        // 画像サイズを計算
        const { width: canvasWidth, height: canvasHeight } = this.calculateCanvasSize(image)

        // 1. Canvasを作成
        const maskedCanvas = document.createElement('canvas')
        maskedCanvas.width = canvasWidth
        maskedCanvas.height = canvasHeight
        const maskedCtx = maskedCanvas.getContext('2d')
        if (!maskedCtx) {
            return []
        }

        // Path2Dの座標系を確認
        // Path2Dはcanvas座標系で作成されているため、画像座標系に変換する必要がある
        // canvasSizeが指定されている場合、Path2Dはcanvas座標系
        // 指定されていない場合、Path2Dは画像座標系と仮定
        let pathScaleX = 1
        let pathScaleY = 1

        if (canvasSize) {
            // Path2Dはcanvas座標系で作成されている
            // 画像座標系に変換するスケールを計算
            pathScaleX = image.width / canvasSize.width
            pathScaleY = image.height / canvasSize.height
            console.log('[顔検出] Path2D座標変換', {
                canvasSize: { width: canvasSize.width, height: canvasSize.height },
                imageSize: { width: image.width, height: image.height },
                pathScale: { x: pathScaleX, y: pathScaleY },
            })
        }

        // MediaPipe用のcanvasサイズに対するスケール
        const scaleX = canvasWidth / image.width
        const scaleY = canvasHeight / image.height

        // 2. 選択範囲外を黒でマスク
        // まず画像を描画
        maskedCtx.drawImage(image, 0, 0, canvasWidth, canvasHeight)

        // 選択範囲外を黒で塗りつぶす
        // destination-in: 既存の描画と新しい描画の交差部分のみ残す（選択範囲内のみ残す）
        maskedCtx.save()
        maskedCtx.globalCompositeOperation = 'destination-in'
        // Path2Dの座標変換: canvas座標系 → MediaPipe用canvas座標系
        const finalScaleX = scaleX * pathScaleX
        const finalScaleY = scaleY * pathScaleY
        maskedCtx.scale(finalScaleX, finalScaleY)
        maskedCtx.fillStyle = 'white'
        maskedCtx.fill(region)
        maskedCtx.restore()

        // 選択範囲外を黒で塗りつぶす（透明部分を黒にする）
        maskedCtx.save()
        maskedCtx.globalCompositeOperation = 'destination-over'
        maskedCtx.fillStyle = 'black'
        maskedCtx.fillRect(0, 0, canvasWidth, canvasHeight)
        maskedCtx.restore()

        // 3. MediaPipeで検出（自動選択と同等の閾値を使用）

        // MediaPipeに送信して検出を実行
        const faces = await this.sendToMediaPipe(
            maskedCanvas,
            image,
            canvasWidth,
            canvasHeight,
            MANUAL_SELECTION_DETECTION_THRESHOLD,
            startTime,
            '選択範囲マスク方式'
        )

        // マスク画像の表示は無効化

        // 5. 信頼度と選択範囲内の顔のみをフィルタリング（自動選択と同等の閾値を使用）
        const filteredFaces = faces.filter((face) => {
            // 信頼度フィルタリング
            if (face.confidence < MANUAL_SELECTION_MIN_CONFIDENCE) {
                return false
            }

            const faceCenterX = face.x + face.width / 2
            const faceCenterY = face.y + face.height / 2

            // 元の画像座標系でPath2Dの判定
            const checkCanvas = document.createElement('canvas')
            checkCanvas.width = image.width
            checkCanvas.height = image.height
            const checkCtx = checkCanvas.getContext('2d')
            if (!checkCtx) return false

            // Path2Dの座標変換: canvas座標系 → 画像座標系
            checkCtx.save()
            if (canvasSize) {
                const checkScaleX = image.width / canvasSize.width
                const checkScaleY = image.height / canvasSize.height
                checkCtx.scale(checkScaleX, checkScaleY)
            }
            checkCtx.fillStyle = 'white'
            checkCtx.fill(region)
            checkCtx.restore()

            const checkImageData = checkCtx.getImageData(0, 0, image.width, image.height)
            const checkData = checkImageData.data

            const checkX = Math.floor(faceCenterX)
            const checkY = Math.floor(faceCenterY)
            if (checkX < 0 || checkX >= image.width || checkY < 0 || checkY >= image.height) {
                return false
            }

            const index = (checkY * image.width + checkX) * 4
            const r = checkData[index]
            const g = checkData[index + 1]
            const b = checkData[index + 2]
            const a = checkData[index + 3]

            return r === 255 && g === 255 && b === 255 && a === 255
        })

        // 6. 重複検出を除去（IoUベース + 中心点距離ベース）
        const deduplicatedFaces = this.removeDuplicateDetectionsWithCenterDistance(
            filteredFaces,
            MANUAL_SELECTION_IOU_THRESHOLD
        )

        // マスク画像の表示は無効化

        const elapsedTime = performance.now() - startTime
        console.log(`[顔検出] 選択範囲マスク方式で検出完了: ${elapsedTime.toFixed(2)}ms, ${filteredFaces.length}個の顔を検出（重複除去後: ${deduplicatedFaces.length}個）`)
        return deduplicatedFaces
    }
}

// シングルトンインスタンスをエクスポート
export const faceDetectionService = new FaceDetectionService()
