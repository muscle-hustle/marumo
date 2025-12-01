import { chromium } from 'playwright'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

const SIZE = 512
const OUTPUT_DIR = join(process.cwd(), 'public', 'assets', 'stamps')

// スタンプの定義（絵文字と名前）
const stamps = [
  { emoji: '😀', name: 'emoji1', label: 'にっこり' },
  { emoji: '😊', name: 'emoji2', label: '笑顔' },
  { emoji: '😎', name: 'emoji3', label: 'サングラス' },
  { emoji: '😴', name: 'emoji4', label: '眠い' },
  { emoji: '🤔', name: 'emoji5', label: '考える' },
]

// 出力ディレクトリを作成
mkdirSync(OUTPUT_DIR, { recursive: true })

async function generateStamps() {
  const browser = await chromium.launch()
  const page = await browser.newPage()

  for (const { emoji, name, label } of stamps) {
    // HTMLページを作成
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
      </head>
      <body>
        <canvas id="canvas" width="${SIZE}" height="${SIZE}"></canvas>
        <script>
          const canvas = document.getElementById('canvas');
          const ctx = canvas.getContext('2d');
          
          // 透明な背景
          ctx.clearRect(0, 0, ${SIZE}, ${SIZE});
          
          // フォント設定（ブラウザのデフォルト絵文字フォントを使用）
          ctx.font = '400px system-ui, -apple-system, "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          // 絵文字を中央に描画
          ctx.fillText('${emoji}', ${SIZE / 2}, ${SIZE / 2});
        </script>
      </body>
      </html>
    `

    await page.setContent(html)
    await page.waitForTimeout(100) // 描画を待つ

    // Canvasを画像として取得
    const canvas = await page.$('#canvas')
    if (canvas) {
      const buffer = await canvas.screenshot({ type: 'png' })
      const filePath = join(OUTPUT_DIR, `${name}.png`)
      writeFileSync(filePath, buffer)
      console.log(`✓ ${label} (${emoji}) を ${filePath} に保存しました`)
    }
  }

  await browser.close()
  console.log(`\n全てのスタンプ画像を ${OUTPUT_DIR} に生成しました。`)
}

generateStamps().catch(console.error)

