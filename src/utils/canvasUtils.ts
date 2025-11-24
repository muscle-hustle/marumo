export interface FittedSize {
  width: number
  height: number
}

export const fitWithinBounds = (
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number,
): FittedSize => {
  const widthRatio = maxWidth / width
  const heightRatio = maxHeight / height
  const ratio = Math.min(1, widthRatio, heightRatio)

  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  }
}

export const drawImageToCanvas = (
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  maxWidth: number,
  maxHeight: number,
): FittedSize => {
  const { width, height } = fitWithinBounds(image.naturalWidth, image.naturalHeight, maxWidth, maxHeight)

  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Failed to acquire 2D context')
  }

  ctx.clearRect(0, 0, width, height)
  ctx.drawImage(image, 0, 0, width, height)

  return { width, height }
}
