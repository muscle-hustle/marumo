import { useState, useCallback } from 'react'
import { faceDetectionService } from '../services/faceDetection'
import type { FaceDetectionResult } from '../types'

export interface UseFaceDetectionReturn {
    faces: FaceDetectionResult[]
    isDetecting: boolean
    error: string | null
    detectFaces: (image: HTMLImageElement) => Promise<void>
    detectFacesInRegion: (image: HTMLImageElement, region: Path2D) => Promise<void>
    clearFaces: () => void
}

/**
 * 顔検出機能を提供するカスタムフック
 */
export function useFaceDetection(): UseFaceDetectionReturn {
    const [faces, setFaces] = useState<FaceDetectionResult[]>([])
    const [isDetecting, setIsDetecting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const detectFaces = useCallback(async (image: HTMLImageElement) => {
        setIsDetecting(true)
        setError(null)
        setFaces([])

        try {
            const detectedFaces = await faceDetectionService.detectFaces(image)
            setFaces(detectedFaces)
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : '顔検出に失敗しました'
            setError(errorMessage)
            setFaces([])
        } finally {
            setIsDetecting(false)
        }
    }, [])

    const detectFacesInRegion = useCallback(
        async (image: HTMLImageElement, region: Path2D) => {
            setIsDetecting(true)
            setError(null)
            setFaces([])

            try {
                const detectedFaces = await faceDetectionService.detectFacesInRegion(image, region)
                setFaces(detectedFaces)
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : '顔検出に失敗しました'
                setError(errorMessage)
                setFaces([])
            } finally {
                setIsDetecting(false)
            }
        },
        [],
    )

    const clearFaces = useCallback(() => {
        setFaces([])
        setError(null)
    }, [])

    return {
        faces,
        isDetecting,
        error,
        detectFaces,
        detectFacesInRegion,
        clearFaces,
    }
}
