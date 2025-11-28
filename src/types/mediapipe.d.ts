/**
 * MediaPipe Face Detection の型定義を拡張
 * 実行時に実際に存在するプロパティを型定義に追加
 * 
 * TypeScriptのモジュール拡張（Module Augmentation）を使用して、
 * 既存の Detection インターフェースにプロパティを追加します。
 */

import type { Detection as BaseDetection } from '@mediapipe/face_detection'

/**
 * 信頼度情報を含むオブジェクト
 */
export interface ConfidenceData {
    index: number
    ga: number // 信頼度スコア（0-1の範囲）
}

/**
 * MediaPipeの Detection を拡張した型
 * 元の boundingBox と landmarks に加えて、
 * 実際の実行時に存在する V プロパティ（信頼度配列）を含む
 */
export interface ExtendedDetection extends BaseDetection {
    /**
     * 信頼度情報の配列
     * 通常は1要素で、その ga プロパティが信頼度スコア
     */
    V?: ConfidenceData[]

    /**
     * 他の可能性のある信頼度プロパティ（フォールバック用）
     */
    score?: number
    scoreData?: number[]
    confidence?: number
}

