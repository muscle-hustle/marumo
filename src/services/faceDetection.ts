import { FaceDetection } from '@mediapipe/face_detection'
import type { FaceDetectionResult } from '../types'

// 信頼度閾値（過剰検出を抑制）
const CONFIDENCE_THRESHOLD = 0.7

// タイムアウト時間（ミリ秒）
const TIMEOUT_MS = 30000

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
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`
                },
            })

            this.faceDetection.setOptions({
                model: 'short', // 'short' または 'full'（'short'は高速、'full'は高精度）
                minDetectionConfidence: CONFIDENCE_THRESHOLD,
            })

            this.isInitialized = true
        } catch (error) {
            throw new Error('顔検出モデルの読み込みに失敗しました')
        }
    }

    /**
     * 画像内のすべての顔を検出する
     */
    async detectFaces(image: HTMLImageElement): Promise<FaceDetectionResult[]> {
        if (!this.isInitialized) {
            await this.initialize()
        }

        if (!this.faceDetection) {
            throw new Error('顔検出モデルが初期化されていません')
        }

        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error('処理に時間がかかりすぎています'))
            }, TIMEOUT_MS)

            try {
                // 一時的なCanvasを作成して画像を描画
                const canvas = document.createElement('canvas')
                canvas.width = image.width
                canvas.height = image.height
                const ctx = canvas.getContext('2d')
                if (!ctx) {
                    clearTimeout(timeoutId)
                    reject(new Error('Canvasの取得に失敗しました'))
                    return
                }
                ctx.drawImage(image, 0, 0)

                // MediaPipeに画像を送信
                this.faceDetection!.onResults((results) => {
                    clearTimeout(timeoutId)

                    try {
                        // minDetectionConfidenceで既にフィルタリングされているため、
                        // すべての検出結果を使用（信頼度は閾値以上とみなす）
                        const faces: FaceDetectionResult[] = results.detections.map((detection) => {
                            const bbox = detection.boundingBox
                            // 正規化座標（0-1）を画像座標に変換
                            const x = (bbox.xCenter - bbox.width / 2) * image.width
                            const y = (bbox.yCenter - bbox.height / 2) * image.height
                            const width = bbox.width * image.width
                            const height = bbox.height * image.height

                            return {
                                x: Math.max(0, x), // 負の値にならないように
                                y: Math.max(0, y),
                                width: Math.min(width, image.width - Math.max(0, x)), // 画像範囲内に収める
                                height: Math.min(height, image.height - Math.max(0, y)),
                                confidence: CONFIDENCE_THRESHOLD, // 閾値以上の信頼度とみなす
                            }
                        })

                        resolve(faces)
                    } catch (error) {
                        reject(new Error('顔検出に失敗しました'))
                    }
                })

                this.faceDetection!.send({ image: canvas })
            } catch (error) {
                clearTimeout(timeoutId)
                reject(new Error('顔検出に失敗しました'))
            }
        })
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
