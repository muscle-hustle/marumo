#!/usr/bin/env bun
/**
 * ベンチマーク結果を比較するスクリプト
 * 
 * 使用方法:
 *   bun run tests/faceDetection/scripts/compare-results.ts [比較元ファイル] [比較先ファイル]
 * 
 * 比較元ファイルを指定しない場合は、latest.jsonと比較します
 */

import { readFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

interface BenchmarkResult {
  filename: string
  expected: { min: number; max: number | null } | null
  actual: number
  passed: boolean
  processingTime: number
  timestamp: string
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

function main() {
  const args = process.argv.slice(2)
  const baseFile = args[0] || 'latest.json'
  const compareFile = args[1]

  if (!compareFile) {
    console.error('使用方法: bun run compare-results.ts [比較元ファイル] [比較先ファイル]')
    console.error('例: bun run compare-results.ts latest.json benchmark-2024-01-15.json')
    process.exit(1)
  }

  Promise.all([loadReport(baseFile), loadReport(compareFile)])
    .then(([baseReport, compareReport]) => {
      console.log('\n=== ベンチマーク結果比較 ===\n')
      console.log(`比較元: ${baseFile} (${formatTimestamp(baseReport.timestamp)})`)
      console.log(`比較先: ${compareFile} (${formatTimestamp(compareReport.timestamp)})`)
      console.log('\n' + '='.repeat(60) + '\n')

      // 成功率の比較
      const baseRate = baseReport.successRate
      const compareRate = compareReport.successRate
      const rateDiff = compareRate - baseRate
      const rateIcon = rateDiff > 0 ? '📈' : rateDiff < 0 ? '📉' : '➡️'

      console.log('成功率:')
      console.log(`  比較元: ${baseRate.toFixed(1)}%`)
      console.log(`  比較先: ${compareRate.toFixed(1)}%`)
      console.log(`  変化: ${rateIcon} ${rateDiff > 0 ? '+' : ''}${rateDiff.toFixed(1)}%`)
      console.log()

      // 各テストケースの比較
      const baseMap = new Map(baseReport.results.map((r) => [r.filename, r]))
      const compareMap = new Map(compareReport.results.map((r) => [r.filename, r]))

      const allFilenames = new Set([...baseMap.keys(), ...compareMap.keys()])

      console.log('テストケース別の比較:')
      console.log('-'.repeat(60))

      for (const filename of Array.from(allFilenames).sort()) {
        const baseResult = baseMap.get(filename)
        const compareResult = compareMap.get(filename)

        if (!baseResult || !compareResult) {
          console.log(`⚠️  ${filename}: 一方のレポートにのみ存在します`)
          continue
        }

        const basePassed = baseResult.passed ? '✅' : '❌'
        const comparePassed = compareResult.passed ? '✅' : '❌'
        const statusChange =
          baseResult.passed === compareResult.passed
            ? '➡️'
            : compareResult.passed
              ? '✨'
              : '⚠️'

        const actualDiff = compareResult.actual - baseResult.actual
        const timeDiff = compareResult.processingTime - baseResult.processingTime

        console.log(`${statusChange} ${filename}:`)
        console.log(`  検出数: ${baseResult.actual} → ${compareResult.actual} (${actualDiff > 0 ? '+' : ''}${actualDiff})`)
        console.log(`  結果: ${basePassed} → ${comparePassed}`)
        console.log(`  処理時間: ${baseResult.processingTime}ms → ${compareResult.processingTime}ms (${timeDiff > 0 ? '+' : ''}${timeDiff}ms)`)
        console.log()
      }

      // サマリー
      console.log('='.repeat(60))
      console.log('サマリー:')
      console.log(`  総テスト数: ${baseReport.totalTests} → ${compareReport.totalTests}`)
      console.log(`  成功数: ${baseReport.passedTests} → ${compareReport.passedTests}`)
      console.log(`  失敗数: ${baseReport.failedTests} → ${compareReport.failedTests}`)
      console.log(`  成功率: ${baseRate.toFixed(1)}% → ${compareRate.toFixed(1)}%`)
    })
    .catch((error) => {
      console.error('エラーが発生しました:', error)
      process.exit(1)
    })
}

main()

