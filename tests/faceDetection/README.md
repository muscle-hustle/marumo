# 顔検出テスト用ディレクトリ

このディレクトリは顔検出機能のE2Eテスト（Playwright）に使用します。

## ディレクトリ構造

```
tests/faceDetection/
├── README.md                          # このファイル
├── parseExpectedCount.ts              # ファイル名から期待値をパースするユーティリティ
├── parseExpectedCount.test.ts         # parseExpectedCountのユニットテスト
├── e2e/                               # E2Eテスト（Playwright）
│   └── faceDetection.benchmark.spec.ts # 顔検出のベンチマークテスト
├── scripts/                           # ユーティリティスクリプト
│   ├── compare-results.ts             # ベンチマーク結果を比較するスクリプト
│   └── generate-report.ts             # HTMLレポートを生成するスクリプト
├── benchmark-results/                 # ベンチマーク結果を保存するディレクトリ
│   ├── benchmark-YYYY-MM-DDTHH-MM-SS.json  # タイムスタンプ付きの結果
│   ├── latest.json                    # 最新の結果
│   └── report.html                    # HTMLレポート
└── images/                             # テスト用画像ファイル
```

## テスト用画像のファイル名規則

`images/` ディレクトリの画像ファイル名は以下の規則に従ってください：

- `faces_x.png` - x人の顔が写っている画像
- `faces_x-y.png` - xからy人の顔が写っている画像（範囲）
- `faces_xover.png` - x人以上の顔が写っている画像
- `faces_x_hoge.png` - x人の顔が写っている画像（hogeは条件やバリエーション）

### 例

- `faces_1.png` → 1人
- `faces_1-3.png` → 1〜3人
- `faces_10over.png` → 10人以上
- `faces_1_mt.png` → 1人（mtという条件）

## テストの実行

### E2Eテストの実行

```bash
# すべての顔検出E2Eテストを実行
bun run test:face-detection

# UIモードで実行（デバッグに便利）
bun run test:face-detection:ui

# または直接Playwrightコマンドを使用
playwright test tests/faceDetection/e2e
```

### ベンチマーク結果の比較

```bash
# 最新の結果と指定したファイルを比較
bun run test:face-detection:compare latest.json benchmark-2024-01-15.json

# または直接スクリプトを実行
bun run tests/faceDetection/scripts/compare-results.ts latest.json benchmark-2024-01-15.json
```

### HTMLレポートの生成

```bash
# 最新の結果からHTMLレポートを生成
bun run test:face-detection:report

# または指定したファイルから生成
bun run tests/faceDetection/scripts/generate-report.ts benchmark-2024-01-15.json
```

生成されたHTMLレポートは `tests/faceDetection/benchmark-results/report.html` に保存されます。

## テスト内容

E2Eテストは以下の内容を検証します：

1. 各画像ファイルから期待される検出数をパース
2. ブラウザでアプリを起動
3. 各テスト画像をアップロード
4. 自動モードで顔検出を実行
5. 検出数が期待範囲内かどうかをチェック
6. 検出結果の詳細（処理時間、画像サイズなど）を記録
7. 結果をJSONファイルに保存

## ベンチマーク結果の活用

### 継続的な精度向上のためのワークフロー

1. **テスト実行**: `bun run test:face-detection` でベンチマークを実行
2. **結果確認**: `benchmark-results/latest.json` で結果を確認
3. **実装改善**: 検出精度を向上させるための実装を変更
4. **再テスト**: 再度ベンチマークを実行
5. **結果比較**: `bun run test:face-detection:compare` で改善を確認
6. **レポート生成**: `bun run test:face-detection:report` でHTMLレポートを確認

### 結果ファイルの形式

ベンチマーク結果は以下の形式で保存されます：

```json
{
  "timestamp": "2024-01-15T12:00:00.000Z",
  "totalTests": 15,
  "passedTests": 12,
  "failedTests": 3,
  "successRate": 80.0,
  "results": [
    {
      "filename": "faces_1.png",
      "expected": { "min": 1, "max": 1 },
      "actual": 1,
      "passed": true,
      "processingTime": 1234,
      "timestamp": "2024-01-15T12:00:00.000Z",
      "faces": [],
      "imageSize": { "width": 1920, "height": 1080 }
    }
  ]
}
```

## テスト用画像について

`images/` ディレクトリには以下のようなテスト用画像を配置できます：

- 1人の顔が写った画像
- 複数の顔が写った画像
- 横顔が含まれる画像
- 様々なサイズの画像
- 様々な条件の画像（メガネ、ひげ、子供など）

## 注意事項

- E2Eテストは実際のブラウザで実行されるため、開発サーバーが起動している必要があります
- Playwrightの設定により、テスト実行時に自動的に開発サーバーが起動されます
- テストは順次実行されるため、全画像のテストには時間がかかる場合があります（最大30秒/画像）
- ベンチマーク結果は `benchmark-results/` ディレクトリに保存されます
