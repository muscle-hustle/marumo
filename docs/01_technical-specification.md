# marumo 技術仕様書

## 1. プロジェクト概要

### 1.1 アプリ名とコンセプト
- **アプリ名**: marumo（まるも）
- **コンセプト**: 「まる」で囲むだけで簡単に「モ」ザイクをかける
- 手軽に顔を保護できるツールを目指す

## 2. アーキテクチャ概要

### 1.1 システム構成
```
┌─────────────────────────────────────┐
│        静的ファイル配信サーバー        │
│       (Cloudflare Pages)             │
└─────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│         クライアント（ブラウザ）       │
│  ┌───────────────────────────────┐  │
│  │      React アプリケーション      │  │
│  │  ┌─────────────────────────┐  │  │
│  │  │   画像選択・UI管理       │  │  │
│  │  └─────────────────────────┘  │  │
│  │  ┌─────────────────────────┐  │  │
│  │  │   顔検出エンジン         │  │  │
│  │  │  (MediaPipe Face Detection)│  │
│  │  └─────────────────────────┘  │  │
│  │  ┌─────────────────────────┐  │  │
│  │  │   画像処理エンジン       │  │  │
│  │  │  (Canvas API)           │  │  │
│  │  └─────────────────────────┘  │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### 1.2 データフロー
1. ユーザーが画像ファイルを選択
2. FileReader APIで画像を読み込み（メモリ上のみ）
3. Canvas要素に画像を描画
4. 顔検出ライブラリで顔を検出
5. 検出結果に基づき画像処理を実行
6. 加工済み画像をCanvasに描画
7. ダウンロード用にBlobを生成

### 1.3 プライバシー設計
- **画像データの保存場所**: メモリ（JavaScript変数）のみ
- **サーバー通信**: 一切なし（静的ファイル取得のみ）
- **ローカルストレージ**: 使用しない
- **IndexedDB**: 使用しない
- **Cookie**: 使用しない

## 3. 技術スタック

### 2.1 フロントエンドフレームワーク
- **React**: 18.2.0
- **TypeScript**: 5.2.2
- **ビルドツール**: Vite 5.0.8（高速な開発サーバー、HMR、豊富なプラグインエコシステム）

### 2.2 顔検出ライブラリ
**候補と選定理由**:

1. **MediaPipe Face Detection**
   - Google製、メジャーでモダン
   - WebAssemblyベースで高速
   - 精度が高く、過剰検出が少ない
   - **推奨**

2. **face-api.js**
   - TensorFlow.jsベース
   - 軽量で実装が容易
   - ただし、MediaPipeより精度が劣る可能性

**選定**: **MediaPipe Face Detectionを採用**。パフォーマンス要件（3秒以内）を満たすため。

**信頼度閾値**: 0.7（過剰検出を抑制するため）

### 2.3 画像処理
- **Canvas API**: 画像の描画・加工処理
- **ImageData API**: ピクセル単位の操作
- **OffscreenCanvas**: バックグラウンド処理（パフォーマンス向上）

### 2.4 UIライブラリ
- **スタイリング**: Tailwind CSS（ユーティリティファースト、レスポンシブ対応が容易、開発速度が高い）
- **アイコン**: React Icons
- **レスポンシブ**: Tailwind CSSのブレークポイント機能を使用
- **ブレークポイント**（Tailwind CSSデフォルト）:
  - スマートフォン: < 640px (sm)
  - タブレット: 640px - 1024px (md, lg)
  - PC: > 1024px (xl, 2xl)
- **カスタムブレークポイント**: 必要に応じて`tailwind.config.js`でカスタマイズ可能

### 2.5 開発ツール
- **パッケージマネージャー**: Bun（高速なインストール、TypeScriptビルトインサポート、npm互換）
- **ビルドツール**: Vite 5.0.8（高速な開発サーバー、HMR、豊富なプラグインエコシステム）
- **リンター**: ESLint
- **フォーマッター**: Prettier
- **型チェック**: TypeScript（Bunのビルトインサポートも活用可能）

## 4. ディレクトリ構造

```
marumo/
├── public/
│   ├── index.html
│   └── assets/
│       └── stamps/          # スタンプ画像（絵文字）
├── src/
│   ├── components/
│   │   ├── ImageUploader.tsx
│   │   ├── ImageCanvas.tsx
│   │   ├── FaceDetectionControls.tsx
│   │   ├── ProcessingOptions.tsx
│   │   ├── LassoSelector.tsx
│   │   └── DownloadButton.tsx
│   ├── hooks/
│   │   ├── useFaceDetection.ts
│   │   ├── useImageProcessing.ts
│   │   └── useCanvas.ts
│   ├── services/
│   │   ├── faceDetection.ts
│   │   ├── imageProcessor.ts
│   │   └── fileHandler.ts
│   ├── types/
│   │   └── index.ts
│   ├── utils/
│   │   ├── imageValidation.ts
│   │   └── canvasUtils.ts
│   ├── App.tsx
│   └── main.tsx
├── docs/
│   ├── 00_requirements.md
│   ├── 01_technical-specification.md
│   ├── 02_api-specification.md
│   ├── 03_user-guide.md
│   └── 04_implementation-plan.md
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
└── README.md
```

## 5. 主要コンポーネント仕様

### 4.1 ImageUploader
**責務**: 画像ファイルの選択と読み込み

**Props**:
```typescript
interface ImageUploaderProps {
  onImageLoad: (image: HTMLImageElement) => void;
  maxFileSize: number; // 10MB
  maxImageSize: { width: number; height: number }; // 4K
}
```

**機能**:
- ファイル選択ダイアログの表示
- ファイル形式の検証（JPEG、PNG、WebP、GIF等）
- ファイルサイズの検証（10MB以下）
- 画像サイズの検証（4K以下）
- FileReader APIで画像を読み込み
- エラーハンドリング（形式不正、サイズ超過等）

### 4.2 ImageCanvas
**責務**: 画像の表示と加工結果の描画

**Props**:
```typescript
interface ImageCanvasProps {
  image: HTMLImageElement | null;
  faces: FaceDetectionResult[];
  processingType: 'mosaic' | 'blur' | 'stamp';
  processingIntensity?: number; // デフォルト: 5
  selectedRegion?: Path2D;
  mode: 'auto' | 'manual';
  manualModeType?: 'include' | 'exclude';
}
```

**機能**:
- Canvas要素の管理
- 画像の描画（アスペクト比維持）
- レスポンシブ対応（Tailwind CSSのブレークポイントを使用）
  - スマートフォン: < 640px (sm未満)
  - タブレット: 640px - 1024px (md, lg)
  - PC: > 1024px (xl, 2xl)
- 加工結果のリアルタイムプレビュー
- ローディングインジケーターの表示

### 4.3 FaceDetectionControls
**責務**: 顔検出モードの選択と制御

**Props**:
```typescript
interface FaceDetectionControlsProps {
  mode: 'auto' | 'manual';
  manualModeType: 'include' | 'exclude';
  onModeChange: (mode: 'auto' | 'manual') => void;
  onManualModeTypeChange: (type: 'include' | 'exclude') => void;
  onDetect: () => void;
  isProcessing: boolean;
}
```

**機能**:
- 自動/手動モードの切り替え
- 手動モード時の「モザイクする/しない」選択
- 顔検出の実行トリガー

### 4.4 LassoSelector
**責務**: 投げ縄ツールによる範囲選択

**Props**:
```typescript
interface LassoSelectorProps {
  canvas: HTMLCanvasElement;
  onSelectionComplete: (path: Path2D) => void;
  enabled: boolean;
}
```

**機能**:
- マウス/タッチによる自由形状の描画
- 選択範囲の可視化
- 選択完了時のPath2D生成
- タッチデバイス対応

### 4.5 ProcessingOptions
**責務**: 加工種類と強度の選択

**Props**:
```typescript
interface ProcessingOptionsProps {
  type: 'mosaic' | 'blur' | 'stamp';
  intensity?: number;
  onTypeChange: (type: 'mosaic' | 'blur' | 'stamp') => void;
  onIntensityChange?: (intensity: number) => void;
  showAdvanced: boolean;
  onShowAdvancedToggle: () => void;
}
```

**機能**:
- 加工種類の選択（モザイク/ぼかし/スタンプ）
- 高度設定の表示/非表示
- 強度調整スライダー（高度設定時）

### 4.6 DownloadButton
**責務**: 加工済み画像のダウンロード

**Props**:
```typescript
interface DownloadButtonProps {
  canvas: HTMLCanvasElement;
  originalFileName: string;
  originalMimeType: string;
  disabled: boolean;
}
```

**機能**:
- CanvasからBlobを生成
- 元の画像形式を維持
- ダウンロードリンクの生成
- ファイル名の設定

## 6. サービス層仕様

### 5.1 FaceDetectionService
**責務**: 顔検出の実行

**主要メソッド**:
```typescript
class FaceDetectionService {
  async detectFaces(
    image: HTMLImageElement
  ): Promise<FaceDetectionResult[]>;
  
  async detectFacesInRegion(
    image: HTMLImageElement,
    region: Path2D
  ): Promise<FaceDetectionResult[]>;
}
```

**実装詳細**:
- MediaPipe Face Detectionの初期化
- 画像の前処理（リサイズ、正規化等）
- 顔検出の実行
- 検出結果の座標変換（Canvas座標系に変換）
- 過剰検出の抑制（信頼度閾値: 0.7）

**FaceDetectionResult型**:
```typescript
interface FaceDetectionResult {
  x: number;        // 左上X座標
  y: number;        // 左上Y座標
  width: number;    // 幅
  height: number;   // 高さ
  confidence: number; // 信頼度（0-1）
}
```

### 5.2 ImageProcessorService
**責務**: 画像加工処理の実行

**主要メソッド**:
```typescript
class ImageProcessorService {
  applyMosaic(
    canvas: HTMLCanvasElement,
    faces: FaceDetectionResult[],
    intensity?: number
  ): void;
  
  applyBlur(
    canvas: HTMLCanvasElement,
    faces: FaceDetectionResult[],
    intensity?: number
  ): void;
  
  applyStamp(
    canvas: HTMLCanvasElement,
    faces: FaceDetectionResult[],
    stampImage: HTMLImageElement
  ): void;
}
```

**実装詳細**:

#### モザイク処理
1. 各顔領域をグリッドに分割
2. 各グリッドセルの平均色を計算
3. セル全体を平均色で塗りつぶし
4. 強度（intensity: 1-10、デフォルト: 5）に応じてグリッドサイズを調整
   - グリッドサイズ = 顔領域の最小辺 / (10 + intensity)

#### ぼかし処理
1. 各顔領域に対してガウシアンブラーを適用
2. Canvas APIの`filter`プロパティを使用（互換性確認済み）
3. 強度（intensity: 1-10、デフォルト: 5）に応じてブラー半径を調整
   - ブラー半径 = intensity * 2px

#### スタンプ処理
1. スタンプ画像を読み込み（PNG形式、512×512px、透過対応）
2. 各顔領域のサイズに合わせてスタンプをリサイズ
3. 顔領域の中央に配置
4. アスペクト比を維持

**スタンプの種類**: 5種類
- 😀（にっこり）
- 😊（笑顔）
- 😎（サングラス）
- 😴（眠い）
- 🤔（考える）

### 5.3 FileHandlerService
**責務**: ファイルの読み込みと検証

**主要メソッド**:
```typescript
class FileHandlerService {
  validateFile(file: File): ValidationResult;
  loadImage(file: File): Promise<HTMLImageElement>;
  validateImageSize(image: HTMLImageElement): boolean;
}
```

**実装詳細**:
- **MIMEタイプの検証**: ファイルヘッダー（マジックナンバー）を確認して検証
  - 許可するMIMEタイプ: `image/jpeg`, `image/png`, `image/webp`
  - 拡張子のみの検証では不十分なため、ファイルヘッダーで厳格に検証
  - 写真用途に特化するため、GIFは除外
- ファイルサイズの検証（10MB以下）
- 画像サイズの検証（4K以下）
- FileReader APIによる非同期読み込み
- エラーメッセージの生成

## 7. パフォーマンス最適化

### 6.1 画像処理の最適化
- **OffscreenCanvas**: メインスレッドをブロックしない
- **Web Workers**: 現時点では使用しない（将来の拡張として検討）
- **画像リサイズ**: 4K（3840×2160）を超える画像は処理前にリサイズ
- **メモリ管理**: 
  - 処理完了後は不要なオブジェクトを明示的に解放
  - メモリ使用量の上限値は設定しない（デバイスによって異なるため）
  - 画像サイズチェックとエラーハンドリングでメモリ不足を防止
  - メモリ不足エラーをキャッチして適切に処理

### 6.2 顔検出の最適化
- **モデルの軽量化**: 必要最小限の精度で動作
- **検出範囲の制限**: 手動モード時は選択範囲のみ検出
- **キャッシュ**: 同じ画像の再検出を避ける

### 6.3 UIの最適化
- **React.memo**: 不要な再レンダリングを防止
- **useMemo/useCallback**: 計算結果と関数のメモ化
- **仮想化**: 大量のスタンプ選択時（将来の拡張）

## 8. エラーハンドリング

### 7.1 ファイル読み込みエラー
- **表示方法**: トースト通知（画面下部に一時的に表示）
- 形式不正: "サポートされていない画像形式です"
- サイズ超過: "ファイルサイズが10MBを超えています"
- 画像サイズ超過: "画像サイズが4Kを超えています"

### 7.2 顔検出エラー
- **表示方法**: トースト通知
- 検出失敗: "顔を検出できませんでした。手動モードをお試しください"
- 処理タイムアウト: "処理に時間がかかりすぎています"（タイムアウト: 30秒）

### 7.3 画像処理エラー
- **表示方法**: トースト通知
- メモリ不足: "画像が大きすぎます。サイズを小さくしてください"
- 処理失敗: "画像処理に失敗しました"

### 7.4 ローディング表示
- 顔検出中、画像処理中にローディングスピナーを表示
- 処理の進捗状況を視覚的に示す

## 9. ブラウザ互換性

### 8.1 必須機能
- **Canvas API**: 全対応ブラウザでサポート
- **FileReader API**: 全対応ブラウザでサポート
- **ES6+**: モダンブラウザでサポート
- **WebAssembly**: MediaPipe使用のため必須

### 8.2 対応ブラウザ
- **Chrome**: 最新版（WebAssembly対応）
- **Safari**: 最新版（WebAssembly対応）
- **Edge**: 最新版（WebAssembly対応）

### 8.3 ポリフィル
- **基本的に導入しない**: 対応ブラウザ（Chrome、Safari、Edge最新版）はモダンなため、ポリフィルは不要
- 特定の機能で必要になった場合のみ個別に対応

## 10. セキュリティ考慮事項

### 9.1 XSS対策
- Reactのデフォルトエスケープ機能を活用
- ユーザー入力のサニタイズ

### 9.2 ファイル検証
- **MIMEタイプの検証**: ファイルヘッダー（マジックナンバー）を確認して厳格に検証
  - 拡張子のみの検証では不十分（偽装可能なため）
  - 許可するMIMEタイプ: `image/jpeg`, `image/png`, `image/webp`
  - 写真用途に特化するため、GIFは除外
- ファイルサイズの厳格な検証（10MB以下）
- 画像サイズの検証（4K以下）

### 9.3 メモリリーク対策
- イベントリスナーの適切なクリーンアップ
- 大きなオブジェクトの適切な解放
- コンポーネントのアンマウント時の処理

## 11. テスト戦略

### 10.1 単体テスト
- **フレームワーク**: Vitest（Viteと統合、高速）
- 各サービスの主要メソッド
- ユーティリティ関数
- バリデーション関数

### 10.2 統合テスト
- **フレームワーク**: Vitest
- 画像読み込みからダウンロードまでのフロー
- 顔検出と画像処理の連携

### 10.3 E2Eテスト
- **フレームワーク**: Playwright（モダンで高速、複数ブラウザ対応）
- 主要なユーザーフローの自動化

### 10.4 テストカバレッジ
- **初期リリース**: カバレッジ目標値は設定しない
- **重点的にテストする機能**:
  - 顔検出機能
  - 画像処理機能（モザイク、ぼかし、スタンプ）
  - ファイル検証機能
- **将来的な目標**: 80%以上を目指す

## 12. デプロイメント

### 11.1 ビルド
- `bun run build`で本番用ビルドを生成（Viteを使用）
- 静的ファイルを`dist/`に出力

### 11.2 ホスティング
- **Cloudflare Pages**を使用（無料、高速なCDN配信、GitHub連携、プレビュー機能）
- グローバルCDN経由での配信で高速化
- プルリクエストごとのプレビュー環境を自動生成

### 11.3 環境変数
- 現時点では環境変数は使用しない
- 将来的に必要に応じて設定値の外部化を検討

## 13. ライセンス

- **ライセンス**: MIT License
- **商用利用**: 可能
- **改変**: 可能
- **再配布**: 可能

