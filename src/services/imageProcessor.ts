import type { FaceDetectionResult } from '../types'

/**
 * 画像処理サービスの実装
 * モザイク、ぼかし、スタンプの各処理を提供
 */
class ImageProcessorService {
  // 顔領域のマージン（顔領域の10%）
  private readonly FACE_MARGIN_RATIO = 0.10

  /**
   * モザイク処理を適用する
   * @param canvas 加工対象のCanvas
   * @param faces モザイクを適用する顔の配列（元画像座標系）
   * @param originalImage 元の画像（座標変換に使用）
   * @param intensity モザイクの強度（1-5、デフォルト: 3）
   *   強度が低いほど細かいモザイク（元の顔が見えやすい）
   *   強度が高いほど粗いモザイク（元の顔が見えにくい）
   */
  applyMosaic(
    canvas: HTMLCanvasElement,
    faces: FaceDetectionResult[],
    originalImage: HTMLImageElement,
    intensity: number = 3
  ): void {
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 元画像とCanvasのスケール比を計算
    const scaleX = canvas.width / originalImage.width
    const scaleY = canvas.height / originalImage.height

    faces.forEach((face) => {
      // 元画像座標系からCanvas座標系に変換
      const faceX = Math.floor(face.x * scaleX)
      const faceY = Math.floor(face.y * scaleY)
      const faceWidth = Math.floor(face.width * scaleX)
      const faceHeight = Math.floor(face.height * scaleY)

      if (faceWidth <= 0 || faceHeight <= 0) return

      // モザイク範囲を広げるためのマージン
      const marginX = Math.floor(faceWidth * this.FACE_MARGIN_RATIO)
      const marginY = Math.floor(faceHeight * this.FACE_MARGIN_RATIO)

      // マージンを考慮した範囲を計算
      const x = Math.max(0, faceX - marginX)
      const y = Math.max(0, faceY - marginY)
      const width = Math.min(canvas.width - x, faceWidth + marginX * 2)
      const height = Math.min(canvas.height - y, faceHeight + marginY * 2)

      if (width <= 0 || height <= 0) return

      // 顔領域の画像データを取得
      const imageData = ctx.getImageData(x, y, width, height)

      // グリッドサイズを計算（強度が低いほど細かいモザイク）
      // 計算式: グリッドサイズ = 顔領域の最小辺 / (15 - intensity * 係数)
      const minSide = Math.min(width, height)
      const gridSize = Math.max(2, Math.floor(minSide / (15 - intensity * 1.5)))

      // グリッドに分割してモザイク処理
      for (let gy = 0; gy < height; gy += gridSize) {
        for (let gx = 0; gx < width; gx += gridSize) {
          const cellWidth = Math.min(gridSize, width - gx)
          const cellHeight = Math.min(gridSize, height - gy)

          // セル内の平均色を計算
          let r = 0
          let g = 0
          let b = 0
          let a = 0
          let pixelCount = 0

          for (let py = 0; py < cellHeight; py++) {
            for (let px = 0; px < cellWidth; px++) {
              const pixelIndex = ((gy + py) * width + (gx + px)) * 4
              r += imageData.data[pixelIndex]
              g += imageData.data[pixelIndex + 1]
              b += imageData.data[pixelIndex + 2]
              a += imageData.data[pixelIndex + 3]
              pixelCount++
            }
          }

          if (pixelCount === 0) continue

          const avgR = Math.floor(r / pixelCount)
          const avgG = Math.floor(g / pixelCount)
          const avgB = Math.floor(b / pixelCount)
          const avgA = Math.floor(a / pixelCount)

          // セル全体を平均色で塗りつぶし
          ctx.fillStyle = `rgba(${avgR}, ${avgG}, ${avgB}, ${avgA / 255})`
          ctx.fillRect(x + gx, y + gy, cellWidth, cellHeight)
        }
      }
    })
  }

  /**
   * ぼかし処理を適用する
   * @param canvas 加工対象のCanvas
   * @param faces ぼかしを適用する顔の配列（元画像座標系）
   * @param originalImage 元の画像（座標変換に使用）
   * @param intensity ぼかしの強度（1-5、デフォルト: 3）
   *   強度が高いほど強くぼかす
   */
  applyBlur(
    canvas: HTMLCanvasElement,
    faces: FaceDetectionResult[],
    originalImage: HTMLImageElement,
    intensity: number = 3
  ): void {
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 元画像とCanvasのスケール比を計算
    const scaleX = canvas.width / originalImage.width
    const scaleY = canvas.height / originalImage.height

    faces.forEach((face) => {
      // 元画像座標系からCanvas座標系に変換
      const faceX = Math.floor(face.x * scaleX)
      const faceY = Math.floor(face.y * scaleY)
      const faceWidth = Math.floor(face.width * scaleX)
      const faceHeight = Math.floor(face.height * scaleY)

      if (faceWidth <= 0 || faceHeight <= 0) return

      // ぼかし範囲を広げるためのマージン
      const marginX = Math.floor(faceWidth * this.FACE_MARGIN_RATIO)
      const marginY = Math.floor(faceHeight * this.FACE_MARGIN_RATIO)

      // マージンを考慮した範囲を計算
      const x = Math.max(0, faceX - marginX)
      const y = Math.max(0, faceY - marginY)
      const width = Math.min(canvas.width - x, faceWidth + marginX * 2)
      const height = Math.min(canvas.height - y, faceHeight + marginY * 2)

      if (width <= 0 || height <= 0) return

      // 一時的なCanvasを作成して顔領域を切り出し
      const sourceCanvas = document.createElement('canvas')
      sourceCanvas.width = width
      sourceCanvas.height = height
      const sourceCtx = sourceCanvas.getContext('2d')
      if (!sourceCtx) return

      // 元のCanvasから顔領域をコピー
      sourceCtx.drawImage(canvas, x, y, width, height, 0, 0, width, height)

      // ぼかし用のCanvasを作成
      const blurCanvas = document.createElement('canvas')
      blurCanvas.width = width
      blurCanvas.height = height
      const blurCtx = blurCanvas.getContext('2d')
      if (!blurCtx) return

      // ガウシアンブラーを適用
      // 強度1: ブラー半径 = 3.5px
      // 強度5: ブラー半径 = 9.5px
      // ブラー半径 = 2 + intensity * 係数
      const blurRadius = 2 + intensity * 1.5
      blurCtx.filter = `blur(${blurRadius}px)`

      // ぼかした画像を描画（filterを適用するために再描画）
      blurCtx.drawImage(sourceCanvas, 0, 0)

      // フィルターをリセット
      blurCtx.filter = 'none'

      // 元のCanvasに合成
      ctx.drawImage(blurCanvas, x, y)
    })
  }

  /**
   * スタンプ処理を適用する
   * @param canvas 加工対象のCanvas
   * @param faces スタンプを適用する顔の配列（元画像座標系）
   * @param stampImage スタンプ画像
   * @param originalImage 元の画像（座標変換に使用）
   */
  applyStamp(
    canvas: HTMLCanvasElement,
    faces: FaceDetectionResult[],
    stampImage: HTMLImageElement,
    originalImage: HTMLImageElement
  ): void {
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 元画像とCanvasのスケール比を計算
    const scaleX = canvas.width / originalImage.width
    const scaleY = canvas.height / originalImage.height

    faces.forEach((face) => {
      // 元画像座標系からCanvas座標系に変換
      const x = Math.max(0, Math.floor(face.x * scaleX))
      const y = Math.max(0, Math.floor(face.y * scaleY))
      const width = Math.min(canvas.width - x, Math.floor(face.width * scaleX))
      const height = Math.min(canvas.height - y, Math.floor(face.height * scaleY))

      if (width <= 0 || height <= 0) return

      // スタンプを顔領域より大きく表示するためのスケールファクター
      // 顔領域の対角線の長さに合わせて、スタンプが顔領域を完全に覆うようにする
      const faceDiagonal = Math.sqrt(width * width + height * height)
      const stampDiagonal = Math.sqrt(stampImage.width * stampImage.height)
      const scale = (faceDiagonal / stampDiagonal) * 1.1

      let drawWidth = stampImage.width * scale
      let drawHeight = stampImage.height * scale
      let drawX = x + (width - drawWidth) / 2
      let drawY = y + (height - drawHeight) / 2

      // スタンプを描画
      ctx.drawImage(stampImage, drawX, drawY, drawWidth, drawHeight)
    })
  }

  /**
   * スタンプ画像を読み込む
   * @param path スタンプ画像のパス
   * @returns 読み込まれたスタンプ画像
   */
  async loadStampImage(path: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error(`スタンプ画像の読み込みに失敗しました: ${path}`))
      img.src = path
    })
  }
}

export const imageProcessorService = new ImageProcessorService()
