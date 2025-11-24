import { useCallback, useRef } from 'react'
import { drawImageToCanvas } from '../utils/canvasUtils'

const MAX_CANVAS_WIDTH = 1920
const MAX_CANVAS_HEIGHT = 1080

export const useCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const drawImage = useCallback(async (image: HTMLImageElement) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    return drawImageToCanvas(canvas, image, MAX_CANVAS_WIDTH, MAX_CANVAS_HEIGHT)
  }, [])

  const clear = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }, [])

  return {
    canvasRef,
    drawImage,
    clear,
  }
}
