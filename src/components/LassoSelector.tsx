import { useEffect, useRef, useCallback, type FC } from 'react'
import type { FaceDetectionResult } from '../types'

/**
 * 開発モードかどうかを判定する
 */
const isDevelopmentMode = (): boolean => {
  // @ts-expect-error - Viteの環境変数（型定義は vite/client で提供される）
  return import.meta.env.DEV
}

export interface LassoSelectorProps {
  isManualMode: boolean
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  onSelectionComplete: (path: Path2D) => void
  redrawImage: () => void
  faces: FaceDetectionResult[]
  drawFaceHighlights: (faces: FaceDetectionResult[]) => void
  processedCanvas: HTMLCanvasElement | null
}

const LassoSelector: FC<LassoSelectorProps> = ({ isManualMode, canvasRef, onSelectionComplete, redrawImage, faces, drawFaceHighlights, processedCanvas }) => {
  const isDrawingRef = useRef(false)
  const pointsRef = useRef<Array<{ x: number; y: number }>>([])
  const startPointRef = useRef<{ x: number; y: number } | null>(null)
  const currentPointRef = useRef<{ x: number; y: number } | null>(null)
  const pathRef = useRef<Path2D | null>(null)
  const totalDragDistanceRef = useRef(0) // 累積ドラッグ距離
  const animationFrameRef = useRef<number | null>(null) // アニメーションフレームの参照
  const AUTO_CLOSE_DISTANCE_RATIO = 0.05 // 自動で閉じる距離（canvasサイズに対する比率、3%）
  const MIN_DRAG_DISTANCE_RATIO = 0.1 // 自動で閉じるために必要な最小ドラッグ距離（canvasサイズに対する比率、5%）

  // マウス/タッチイベントの座標を取得
  const getEventPoint = useCallback((e: MouseEvent | TouchEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current
    if (!canvas) return null

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    if (e instanceof MouseEvent) {
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      }
    } else if (e.touches && e.touches.length > 0) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      }
    }
    return null
  }, [canvasRef])

  // パスを描画
  const drawPath = useCallback(
    (ctx: CanvasRenderingContext2D, points: Array<{ x: number; y: number }>, startPoint: { x: number; y: number } | null, currentPoint: { x: number; y: number } | null) => {
      if (points.length < 2) return

      ctx.strokeStyle = '#3b82f6' // 青色
      ctx.lineWidth = 8
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.setLineDash([])

      // パスを描画（現在位置と始点を結ぶ線は描画しない）
      ctx.beginPath()
      ctx.moveTo(points[0].x, points[0].y)
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y)
      }
      // 現在位置まで線を描画
      if (currentPoint) {
        ctx.lineTo(currentPoint.x, currentPoint.y)
      }
      ctx.stroke()

      // 始点にマーカーを描画
      if (startPoint) {
        ctx.fillStyle = '#3b82f6' // 青色
        ctx.beginPath()
        ctx.arc(startPoint.x, startPoint.y, 15, 0, Math.PI * 2)
        ctx.fill()

        // マーカーの外側に白い輪郭を描画
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 3
        ctx.stroke()
      }
    },
    [],
  )

  // 描画を更新
  const updateDrawing = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 加工済み画像がある場合はそれを描画、なければ元の画像を再描画
    if (processedCanvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(processedCanvas, 0, 0)
    } else {
      // 画像を再描画
      redrawImage()

      // 顔認識結果を再描画
      if (faces.length > 0) {
        drawFaceHighlights(faces)
      }
    }

    // パスを描画（始点マーカーと現在位置を含む）
    if (pointsRef.current.length > 0) {
      drawPath(ctx, pointsRef.current, startPointRef.current, currentPointRef.current)
    }
  }, [canvasRef, drawPath, redrawImage, faces, drawFaceHighlights, processedCanvas])

  // 選択を完了する（開始点まで線を繋げてからエフェクトを表示）
  const completeSelection = useCallback(() => {
    if (pointsRef.current.length < 3 || !startPointRef.current) return

    // すぐに描画フラグをfalseにして、以降のhandleMove/handleEndを無効化
    isDrawingRef.current = false

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 1. 開始点まで線を繋げる（最後のポイントを開始点に追加）
    const closedPoints = [...pointsRef.current, startPointRef.current]

    // 2. 閉じたパスを描画（エフェクト用）
    const drawClosedPath = (alpha: number = 1.0, lineWidth: number = 8) => {
      // 加工済み画像がある場合はそれを描画、なければ元の画像を再描画
      if (processedCanvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(processedCanvas, 0, 0)
      } else {
        // 画像を再描画
        redrawImage()

        // 顔認識結果を再描画
        if (faces.length > 0) {
          drawFaceHighlights(faces)
        }
      }

      // 閉じたパスを描画
      ctx.strokeStyle = `rgba(59, 130, 246, ${alpha})` // 青色（透明度可変）
      ctx.lineWidth = lineWidth
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.setLineDash([])

      ctx.beginPath()
      ctx.moveTo(closedPoints[0].x, closedPoints[0].y)
      for (let i = 1; i < closedPoints.length; i++) {
        ctx.lineTo(closedPoints[i].x, closedPoints[i].y)
      }
      ctx.closePath()
      ctx.stroke()

      // 開始点にマーカーを描画
      ctx.fillStyle = `rgba(59, 130, 246, ${alpha})`
      ctx.beginPath()
      ctx.arc(startPointRef.current!.x, startPointRef.current!.y, 15, 0, Math.PI * 2)
      ctx.fill()

      // マーカーの外側に白い輪郭を描画
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 3
      ctx.stroke()
    }

    // 3. エフェクトを表示（パルスアニメーション）
    // 既存のアニメーションをキャンセル
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    let startTime = performance.now()
    const EFFECT_DURATION = 300 // エフェクトの表示時間（ミリ秒）

    const animate = () => {
      const elapsed = performance.now() - startTime
      const progress = Math.min(elapsed / EFFECT_DURATION, 1.0)

      if (progress < 1.0) {
        // パルスエフェクト：透明度と線の太さを変化させる
        const pulse = 0.5 + 0.5 * Math.sin(progress * Math.PI * 4) // 4回点滅
        const alpha = 0.7 + 0.3 * (1 - progress) // 徐々に不透明に
        const lineWidth = 8 + 4 * pulse // 線の太さを変化

        drawClosedPath(alpha, lineWidth)
        animationFrameRef.current = requestAnimationFrame(animate)
      } else {
        // エフェクト終了後、最終的な閉じたパスを描画
        drawClosedPath(1.0, 8)

        // Path2Dを生成
        const path = new Path2D()
        path.moveTo(closedPoints[0].x, closedPoints[0].y)
        for (let i = 1; i < closedPoints.length; i++) {
          path.lineTo(closedPoints[i].x, closedPoints[i].y)
        }
        path.closePath()

        pathRef.current = path
        console.log('[LassoSelector] 選択完了、顔検出を開始します', { pointsCount: closedPoints.length })
        onSelectionComplete(path)

        // 選択をクリア（isDrawingRefは既にfalseに設定済み）
        pointsRef.current = []
        startPointRef.current = null
        currentPointRef.current = null
        totalDragDistanceRef.current = 0
        animationFrameRef.current = null

        // 描画をクリア（加工済み画像がある場合はそれを描画）
        if (processedCanvas) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          ctx.drawImage(processedCanvas, 0, 0)
        } else {
          redrawImage()
        }
      }
    }

    // アニメーション開始
    animate()
  }, [onSelectionComplete, redrawImage, faces, drawFaceHighlights, canvasRef, processedCanvas])

  // マウス/タッチ開始
  const handleStart = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (isDevelopmentMode()) {
        console.log('[LassoSelector] handleStart呼び出し', { isManualMode, eventType: e.type })
      }
      if (!isManualMode) {
        if (isDevelopmentMode()) {
          console.log('[LassoSelector] 手動モードではないためスキップ')
        }
        return
      }

      e.preventDefault()
      const point = getEventPoint(e)
      if (!point) {
        if (isDevelopmentMode()) {
          console.log('[LassoSelector] 座標取得失敗')
        }
        return
      }

      if (isDevelopmentMode()) {
        console.log('[LassoSelector] 描画開始', { point })
      }

      // 既存のアニメーションをキャンセル
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }

      isDrawingRef.current = true
      pointsRef.current = [point]
      startPointRef.current = point
      currentPointRef.current = point
      pathRef.current = null
      totalDragDistanceRef.current = 0 // 累積ドラッグ距離をリセット

      // 初期描画
      updateDrawing()
    },
    [isManualMode, getEventPoint, updateDrawing],
  )

  // マウス/タッチ移動
  const handleMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!isManualMode || !isDrawingRef.current) return

      e.preventDefault()
      const point = getEventPoint(e)
      if (!point || !startPointRef.current) return

      const canvas = canvasRef.current
      if (!canvas) return

      // 現在位置を更新
      currentPointRef.current = point

      // ポイントを追加（一定間隔で追加してパフォーマンスを向上）
      const lastPoint = pointsRef.current[pointsRef.current.length - 1]
      const pointDistance = Math.sqrt(
        Math.pow(point.x - lastPoint.x, 2) + Math.pow(point.y - lastPoint.y, 2)
      )

      // 5px以上離れている場合のみ追加し、累積距離を更新
      if (pointDistance >= 5) {
        pointsRef.current.push(point)
        totalDragDistanceRef.current += pointDistance
      }

      // 始点に近づいたかチェック（自動で閉じる）
      // ただし、一定距離以上ドラッグした場合のみ有効
      const canvasSize = Math.max(canvas.width, canvas.height)
      const autoCloseDistance = canvasSize * AUTO_CLOSE_DISTANCE_RATIO
      const minDragDistance = canvasSize * MIN_DRAG_DISTANCE_RATIO
      const distance = Math.sqrt(
        Math.pow(point.x - startPointRef.current.x, 2) + Math.pow(point.y - startPointRef.current.y, 2)
      )

      // 一定距離以上ドラッグしていて、始点に近づいた場合のみ自動で閉じる
      if (
        totalDragDistanceRef.current >= minDragDistance &&
        distance < autoCloseDistance &&
        pointsRef.current.length >= 3
      ) {
        // 自動で閉じる
        completeSelection()
        return
      }

      // 描画を更新
      updateDrawing()
    },
    [isManualMode, getEventPoint, updateDrawing, completeSelection],
  )

  // マウス/タッチ終了
  const handleEnd = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!isManualMode || !isDrawingRef.current) return

      e.preventDefault()

      // 既に自動で閉じられている場合は何もしない
      if (!isDrawingRef.current) return

      // パスが閉じられているか確認（開始点と終了点が近い場合）
      const canvas = canvasRef.current
      if (pointsRef.current.length >= 3 && startPointRef.current && currentPointRef.current && canvas) {
        // canvasサイズに対する比率で判定
        const canvasSize = Math.max(canvas.width, canvas.height)
        const autoCloseDistance = canvasSize * AUTO_CLOSE_DISTANCE_RATIO
        const minDragDistance = canvasSize * MIN_DRAG_DISTANCE_RATIO
        const distance = Math.sqrt(
          Math.pow(currentPointRef.current.x - startPointRef.current.x, 2) +
          Math.pow(currentPointRef.current.y - startPointRef.current.y, 2)
        )

        // 一定距離以上ドラッグしていて、開始点と終了点がautoCloseDistance以内なら閉じた形状とみなす
        if (totalDragDistanceRef.current >= minDragDistance && distance < autoCloseDistance) {
          completeSelection()
          return
        }
      }

      // 閉じていない場合は選択をクリア
      console.log('[LassoSelector] 範囲が閉じられていません。選択をキャンセルします')
      isDrawingRef.current = false
      pointsRef.current = []
      startPointRef.current = null
      currentPointRef.current = null
      totalDragDistanceRef.current = 0 // 累積ドラッグ距離をリセット

      // 加工済み画像がある場合はそれを描画、なければ元の画像を再描画
      if (canvas) {
        const ctx = canvas.getContext('2d')
        if (ctx) {
          if (processedCanvas) {
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            ctx.drawImage(processedCanvas, 0, 0)
          } else {
            redrawImage()
          }
        }
      }
    },
    [isManualMode, completeSelection, redrawImage, processedCanvas, canvasRef],
  )

  // イベントリスナーの設定
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      if (isDevelopmentMode()) {
        console.log('[LassoSelector] Canvasが存在しません')
      }
      return
    }
    if (!isManualMode) {
      if (isDevelopmentMode()) {
        console.log('[LassoSelector] 手動モードではないためイベントリスナーを設定しません', { isManualMode })
      }
      return
    }

    if (isDevelopmentMode()) {
      console.log('[LassoSelector] イベントリスナーを設定します', { isManualMode })
    }
    canvas.addEventListener('mousedown', handleStart)
    canvas.addEventListener('mousemove', handleMove)
    canvas.addEventListener('mouseup', handleEnd)
    canvas.addEventListener('touchstart', handleStart, { passive: false })
    canvas.addEventListener('touchmove', handleMove, { passive: false })
    canvas.addEventListener('touchend', handleEnd, { passive: false })

    return () => {
      // アニメーションをキャンセル
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }

      canvas.removeEventListener('mousedown', handleStart)
      canvas.removeEventListener('mousemove', handleMove)
      canvas.removeEventListener('mouseup', handleEnd)
      canvas.removeEventListener('touchstart', handleStart)
      canvas.removeEventListener('touchmove', handleMove)
      canvas.removeEventListener('touchend', handleEnd)
    }
  }, [isManualMode, canvasRef, handleStart, handleMove, handleEnd])

  // 説明なしで操作のみを提供
  return null
}

export default LassoSelector
