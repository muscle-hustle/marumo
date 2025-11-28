#!/usr/bin/env bun
/**
 * ベンチマーク結果からHTMLレポートを生成するスクリプト
 * 
 * 使用方法:
 *   bun run tests/faceDetection/scripts/generate-report.ts [結果ファイル]
 * 
 * 結果ファイルを指定しない場合は、latest.jsonを使用します
 */

import { readFile, writeFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

interface BenchmarkResult {
  filename: string
  expected: { min: number; max: number | null } | null
  actual: number
  passed: boolean
  processingTime: number
  timestamp: string
  imageSize: { width: number; height: number }
}

interface BenchmarkReport {
  timestamp: string
  totalTests: number
  passedTests: number
  failedTests: number
  successRate: number
  results: BenchmarkResult[]
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const RESULTS_DIR = join(__dirname, '../benchmark-results')

async function loadReport(filename: string): Promise<BenchmarkReport> {
  const filePath = filename.startsWith('/') ? filename : join(RESULTS_DIR, filename)
  const content = await readFile(filePath, 'utf-8')
  return JSON.parse(content)
}

function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString('ja-JP')
}

function formatExpected(expected: { min: number; max: number | null } | null): string {
  if (!expected) return 'N/A'
  if (expected.max === null) return `${expected.min}以上`
  if (expected.min === expected.max) return `${expected.min}`
  return `${expected.min}〜${expected.max}`
}

function generateHTML(report: BenchmarkReport): string {
  const timestamp = formatTimestamp(report.timestamp)
  const successRate = report.successRate.toFixed(1)

  const resultsHTML = report.results
    .map((result) => {
      const status = result.passed ? '✅' : '❌'
      const statusClass = result.passed ? 'text-green-400' : 'text-red-400'
      const expected = formatExpected(result.expected)

      return `
      <tr class="border-b border-gray-700">
        <td class="px-4 py-3">${status}</td>
        <td class="px-4 py-3 font-mono text-sm">${result.filename}</td>
        <td class="px-4 py-3">${expected}</td>
        <td class="px-4 py-3 ${statusClass} font-semibold">${result.actual}</td>
        <td class="px-4 py-3">${result.processingTime}ms</td>
        <td class="px-4 py-3 text-sm text-gray-400">${result.imageSize.width}×${result.imageSize.height}</td>
      </tr>
    `
    })
    .join('')

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>顔検出ベンチマーク結果 - ${timestamp}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-900 text-white">
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold mb-2">顔検出ベンチマーク結果</h1>
    <p class="text-gray-400 mb-8">実行日時: ${timestamp}</p>

    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      <div class="bg-gray-800 rounded-lg p-4">
        <div class="text-sm text-gray-400">総テスト数</div>
        <div class="text-2xl font-bold">${report.totalTests}</div>
      </div>
      <div class="bg-green-900/30 rounded-lg p-4">
        <div class="text-sm text-green-400">成功</div>
        <div class="text-2xl font-bold text-green-400">${report.passedTests}</div>
      </div>
      <div class="bg-red-900/30 rounded-lg p-4">
        <div class="text-sm text-red-400">失敗</div>
        <div class="text-2xl font-bold text-red-400">${report.failedTests}</div>
      </div>
      <div class="bg-blue-900/30 rounded-lg p-4">
        <div class="text-sm text-blue-400">成功率</div>
        <div class="text-2xl font-bold text-blue-400">${successRate}%</div>
      </div>
    </div>

    <div class="bg-gray-800 rounded-lg overflow-hidden">
      <table class="w-full">
        <thead class="bg-gray-700">
          <tr>
            <th class="px-4 py-3 text-left">結果</th>
            <th class="px-4 py-3 text-left">ファイル名</th>
            <th class="px-4 py-3 text-left">期待値</th>
            <th class="px-4 py-3 text-left">検出数</th>
            <th class="px-4 py-3 text-left">処理時間</th>
            <th class="px-4 py-3 text-left">画像サイズ</th>
          </tr>
        </thead>
        <tbody>
          ${resultsHTML}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>
`
}

async function main() {
  const args = process.argv.slice(2)
  const reportFile = args[0] || 'latest.json'

  try {
    const report = await loadReport(reportFile)
    const html = generateHTML(report)

    const outputPath = join(RESULTS_DIR, 'report.html')
    await writeFile(outputPath, html, 'utf-8')

    console.log(`✅ HTMLレポートを生成しました: ${outputPath}`)
  } catch (error) {
    console.error('エラーが発生しました:', error)
    process.exit(1)
  }
}

main()

