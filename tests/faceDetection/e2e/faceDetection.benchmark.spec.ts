import { test, expect } from '@playwright/test'
import { readdir } from 'fs/promises'
import { join, dirname } from 'path'
import { writeFile } from 'fs/promises'
import { fileURLToPath } from 'url'
import { parseExpectedCount, isCountInRange, type ExpectedCount } from '../parseExpectedCount'

// Playwrightのテスト環境ではimport.meta.dirが使えないため、import.meta.urlから取得
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const IMAGES_DIR = join(__dirname, '../images')
const RESULTS_DIR = join(__dirname, '../benchmark-results')

/**
 * ベンチマーク結果の型定義
 */
interface BenchmarkResult {
  filename: string
  expected: ExpectedCount | null
  actual: number
  passed: boolean
  processingTime: number
  timestamp: string
  faces: Array<{
    x: number
    y: number
    width: number
    height: number
    confidence: number
  }>
  imageSize: {
    width: number
    height: number
  }
}

interface BenchmarkReport {
  timestamp: string
  totalTests: number
  passedTests: number
  failedTests: number
  successRate: number
  results: BenchmarkResult[]
}

/**
 * 顔検出のベンチマークテスト
 */
test.describe('顔検出精度ベンチマーク', () => {
  let imageFiles: string[] = []
  let results: BenchmarkResult[] = []

  test.beforeAll(async () => {
    // テスト用画像ファイルの一覧を取得
    const files = await readdir(IMAGES_DIR)
    imageFiles = files.filter((file) => file.endsWith('.png') && file !== '.gitkeep')
    console.log(`テスト対象の画像ファイル: ${imageFiles.length}個`)
  })

  test('全画像で検出精度を測定', async ({ page }) => {
    test.setTimeout(600000) // 10分（全画像のテストに時間がかかるため）
    // 各画像をテスト
    for (const filename of imageFiles) {
      // 各画像のテスト前にページをリロード（クリーンな状態で開始）
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      // アプリが完全にレンダリングされるまで待つ
      // "marumo"というテキストまたはファイル入力が表示されるまで待つ
      try {
        await Promise.race([
          page.waitForSelector('input[type="file"]', { state: 'attached', timeout: 15000 }),
          page.waitForSelector('text=marumo', { timeout: 15000 }),
          page.waitForSelector('text=画像ファイルをドラッグ', { timeout: 15000 }),
        ])
      } catch (error) {
        // デバッグ情報を出力
        const pageTitle = await page.title()
        const pageUrl = page.url()
        const bodyText = await page.locator('body').textContent() || ''
        console.error(`  エラー: ページが正しく読み込まれていません`)
        console.error(`    URL: ${pageUrl}`)
        console.error(`    タイトル: ${pageTitle}`)
        console.error(`    ボディテキストの最初の200文字: ${bodyText.substring(0, 200)}`)

        // タイトルが"Neon Tetris"の場合は、間違ったアプリが表示されている
        if (pageTitle.includes('Tetris')) {
          throw new Error('間違ったアプリが表示されています。marumoの開発サーバーが正しく起動していない可能性があります。')
        }

        throw error
      }
      const expected = parseExpectedCount(filename)
      if (!expected) {
        console.warn(`[スキップ] ファイル名から期待値をパースできません: ${filename}`)
        continue
      }

      console.log(`\n[テスト開始] ${filename}`)
      console.log(`  期待値: ${expected.min}${expected.max !== null ? `〜${expected.max}` : '以上'}人`)

      try {
        // 画像をアップロード
        const imagePath = join(IMAGES_DIR, filename)

        // ファイル入力を探す
        // まず、ファイル入力が存在するか確認
        const fileInputCount = await page.locator('input[type="file"]').count()
        if (fileInputCount === 0) {
          // デバッグ情報を出力
          const html = await page.content()
          console.error(`  エラー: ファイル入力が見つかりません`)
          console.error(`    HTMLの最初の500文字: ${html.substring(0, 500)}`)
          throw new Error('ファイル入力が見つかりません。ページが正しく読み込まれていない可能性があります。')
        }

        const fileInput = page.locator('input[type="file"]').first()

        // ファイル入力が存在することを確認（hiddenでもOK、attached状態であればOK）
        await fileInput.waitFor({ state: 'attached', timeout: 10000 })

        // ファイルをアップロード
        await fileInput.setInputFiles(imagePath)

        // 画像が読み込まれるまで待つ
        await page.waitForSelector('canvas', { state: 'visible', timeout: 10000 })

        // 画像サイズを取得（Canvasから）
        const imageSize = await page.evaluate(() => {
          const canvas = document.querySelector('canvas')
          if (!canvas) return null
          return {
            width: canvas.width,
            height: canvas.height,
          }
        })

        // 顔検出が開始されるまで少し待つ
        await page.waitForTimeout(500)

        // 顔検出が完了するまで待つ
        const startTime = Date.now()
        let faceCount = 0
        let faces: Array<{ x: number; y: number; width: number; height: number; confidence: number }> = []

        // "顔を検出中..." のテキストが消えるまで待つ
        // または "X個の顔を検出しました" のテキストが表示されるまで待つ
        try {
          // 検出中のテキストが消えるまで待つ（最大30秒）
          await page.waitForFunction(
            () => {
              const text = document.body.textContent || ''
              return !text.includes('顔を検出中')
            },
            { timeout: 30000 },
          )

          // 検出結果のテキストから検出数を取得
          const detectionText = await page
            .locator('text=/個の顔を検出しました/')
            .first()
            .textContent()
            .catch(() => null)

          if (detectionText) {
            const match = detectionText.match(/(\d+)個の顔を検出しました/)
            faceCount = match ? parseInt(match[1], 10) : 0
          }

          // 検出結果の詳細を取得（アプリの内部状態から）
          // Canvasに描画された顔のハイライトから座標を取得するのは難しいため、
          // ここでは検出数と処理時間のみを記録
          // 将来的には、アプリに検出結果を取得するAPIを追加することを検討
        } catch (error) {
          console.warn(`  顔検出の完了を待機中にタイムアウト: ${error}`)
          // タイムアウトした場合でも、現在の状態を記録
          const detectionText = await page
            .locator('text=/個の顔を検出しました|顔を検出中/')
            .first()
            .textContent()
            .catch(() => null)
          if (detectionText && detectionText.includes('個の顔を検出しました')) {
            const match = detectionText.match(/(\d+)個の顔を検出しました/)
            faceCount = match ? parseInt(match[1], 10) : 0
          }
        }

        const processingTime = Date.now() - startTime

        const passed = isCountInRange(faceCount, expected)

        const result: BenchmarkResult = {
          filename,
          expected,
          actual: faceCount,
          passed,
          processingTime,
          timestamp: new Date().toISOString(),
          faces, // 詳細は後で実装可能
          imageSize: imageSize || { width: 0, height: 0 },
        }

        results.push(result)

        if (passed) {
          console.log(`  ✅ 検出数が期待範囲内です (${faceCount}人, ${processingTime}ms)`)
        } else {
          console.error(`  ❌ 検出数が期待範囲外です`)
          console.error(`     期待: ${expected.min}${expected.max !== null ? `〜${expected.max}` : '以上'}人`)
          console.error(`     実際: ${faceCount}人`)
        }

        // 次のテストのために少し待つ（不要になったが、念のため残す）
        // 次のループでページをリロードするため、ここでは待機不要
      } catch (error) {
        console.error(`  ❌ エラーが発生しました:`, error)
        const result: BenchmarkResult = {
          filename,
          expected,
          actual: 0,
          passed: false,
          processingTime: 0,
          timestamp: new Date().toISOString(),
          faces: [],
          imageSize: { width: 0, height: 0 },
        }
        results.push(result)
      }
    }

    // 結果をJSONファイルに保存
    const totalTests = results.length
    const passedTests = results.filter((r) => r.passed).length
    const failedTests = totalTests - passedTests
    const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0

    const report: BenchmarkReport = {
      timestamp: new Date().toISOString(),
      totalTests,
      passedTests,
      failedTests,
      successRate,
      results,
    }

    // タイムスタンプ付きのファイル名とlatest.jsonの両方に保存
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
    const timestampedFile = join(RESULTS_DIR, `benchmark-${timestamp}.json`)
    const latestFile = join(RESULTS_DIR, 'latest.json')

    await writeFile(timestampedFile, JSON.stringify(report, null, 2))
    await writeFile(latestFile, JSON.stringify(report, null, 2))

    console.log('\n=== テスト結果サマリー ===')
    console.log(`総テスト数: ${totalTests}`)
    console.log(`成功: ${passedTests}`)
    console.log(`失敗: ${failedTests}`)
    console.log(`成功率: ${successRate.toFixed(1)}%`)
    console.log(`\n結果を保存しました:`)
    console.log(`  - ${timestampedFile}`)
    console.log(`  - ${latestFile}`)

    // 詳細結果を表示
    console.log('\n詳細結果:')
    results.forEach(({ filename, expected, actual, passed }) => {
      const status = passed ? '✅' : '❌'
      const expectedStr = expected
        ? `${expected.min}${expected.max !== null ? `〜${expected.max}` : '以上'}人`
        : 'N/A'
      console.log(`  ${status} ${filename}: 期待 ${expectedStr}, 実際 ${actual}人`)
    })

    // 最低限の成功を期待（全テストが失敗する場合は問題）
    expect(passedTests).toBeGreaterThan(0)
  })
})

