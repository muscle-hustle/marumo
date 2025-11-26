import { useCallback, useRef } from 'react'
import { drawImageToCanvas } from '../utils/canvasUtils'
import type { FaceDetectionResult } from '../types'

const MAX_CANVAS_WIDTH = 1920
const MAX_CANVAS_HEIGHT = 1080

export const useCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)

  const drawImage = useCallback(async (image: HTMLImageElement) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    imageRef.current = image
    return drawImageToCanvas(canvas, image, MAX_CANVAS_WIDTH, MAX_CANVAS_HEIGHT)
  }, [])

  const clear = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    imageRef.current = null
  }, [])

  const drawFaceHighlights = useCallback((faces: FaceDetectionResult[]) => {
    const canvas = canvasRef.current
    const image = imageRef.current
    if (!canvas || !image) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 画像とCanvasのスケール比を計算
    const scaleX = canvas.width / image.width
    const scaleY = canvas.height / image.height

    // 既存の描画をクリアして画像を再描画
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)

    // 顔領域をハイライト
    ctx.strokeStyle = '#3b82f6' // 青色
    ctx.lineWidth = 3
    ctx.fillStyle = 'rgba(59, 130, 246, 0.1)' // 半透明の青色

    faces.forEach((face) => {
      const x = face.x * scaleX
      const y = face.y * scaleY
      const width = face.width * scaleX
      const height = face.height * scaleY

      // 矩形を描画
      ctx.fillRect(x, y, width, height)
      ctx.strokeRect(x, y, width, height)

      // 信頼度を表示
      ctx.fillStyle = '#ffffff'
      ctx.font = '12px sans-serif'
      ctx.fillText(
        `${Math.round(face.confidence * 100)}%`,
        x + 5,
        y + 15,
      )
      ctx.fillStyle = 'rgba(59, 130, 246, 0.1)'
    })
  }, [])

  return {
    canvasRef,
    drawImage,
    clear,
    drawFaceHighlights,
  }
}
