# MediaPipe統合方法の解説

## はじめに

このドキュメントでは、MediaPipe Face DetectionをViteプロジェクトに統合する際の方法と、今回採用した方法について、WASM初心者にも分かりやすく解説します。

## MediaPipeとWASMの関係

### WASMとは？

**WebAssembly（WASM）**は、ブラウザで高速に実行できるバイナリ形式のコードです。

- **JavaScriptより高速**: 機械語に近い形式で実行されるため、計算処理が高速
- **C/C++/Rustなどで記述可能**: 既存の高性能なライブラリをブラウザで使える
- **セキュリティ**: サンドボックス環境で実行される

### MediaPipeとWASM

MediaPipeは、顔検出などの機械学習処理を実行するために、WASMを使用しています：

```
MediaPipe Face Detection
├── face_detection.js (JavaScriptラッパー)
├── face_detection_solution_wasm_bin.js (WASMローダー)
└── face_detection_solution_wasm_bin.wasm (WASMバイナリ)
```

- **WASMバイナリ**: 実際の機械学習処理を実行
- **JavaScriptラッパー**: WASMを呼び出すためのインターフェース
- **モデルファイル**: 顔検出に使用する機械学習モデル（`.tflite`ファイル）

## 一般的な統合方法とその問題点

### 方法1: npmパッケージとしてバンドルに含める（理想的な方法）

```typescript
// src/services/faceDetection.ts
import { FaceDetection } from '@mediapipe/face_detection'
```

**メリット:**
- TypeScriptの型チェックが効く
- 依存関係が明確
- バンドルサイズの最適化が可能

**問題点:**
- **WASMファイルの扱いが複雑**: ViteなどのバンドラーがWASMを正しく処理できない場合がある
- **動的インポートの問題**: MediaPipeは実行時にWASMファイルを動的に読み込むため、バンドル時に解決できない
- **グローバルスコープへの登録**: MediaPipeはグローバルスコープにクラスを登録する形式で、ESMモジュールと相性が悪い

### 方法2: CDNから読み込む

```html
<script type="module">
  const module = await import('https://cdn.jsdelivr.net/npm/@mediapipe/face_detection@0.4.1646425229/face_detection.js');
</script>
```

**メリット:**
- バンドルサイズに含まれない
- 最新版を簡単に更新できる

**問題点:**
- **ネットワーク依存**: CDNがダウンすると動作しない
- **CORS問題**: 一部の環境でCORSエラーが発生する可能性
- **モジュール解決の問題**: ESMモジュールとして正しく解決されない場合がある
- **オフライン動作不可**: インターネット接続が必要

### 方法3: publicフォルダに配置して直接読み込む（今回採用した方法）

```html
<script src="/mediapipe/face_detection/face_detection.js"></script>
```

**メリット:**
- **シンプル**: バンドル処理を経由しないため、問題が起きにくい
- **確実に動作**: MediaPipeが想定している読み込み方法に近い
- **オフライン対応**: ファイルがローカルにあるため、オフラインでも動作
- **デプロイ時に確実に含まれる**: `public`フォルダのファイルは自動的に`dist`にコピーされる

**デメリット:**
- **型チェックが効かない**: TypeScriptの型定義が使えない
- **バンドル最適化の対象外**: ファイルサイズの最適化ができない
- **手動での更新が必要**: MediaPipeを更新する際は手動でファイルを置き換える必要がある

## 今回の方法の詳細

### 実装の流れ

1. **ファイルの配置**
   ```bash
   public/
   └── mediapipe/
       └── face_detection/
           └── face_detection.js
   ```

2. **HTMLでの読み込み**
   ```html
   <script src="/mediapipe/face_detection/face_detection.js"></script>
   ```

3. **グローバルスコープからの取得**
   ```typescript
   // src/services/faceDetection.ts
   function getFaceDetection(): any {
     if (typeof window !== 'undefined' && (window as any).FaceDetection) {
       return (window as any).FaceDetection
     }
     throw new Error('FaceDetectionがグローバルに定義されていません')
   }
   ```

### なぜこの方法が有効なのか？

1. **MediaPipeの設計思想**
   - MediaPipeは、グローバルスコープにクラスを登録する形式で設計されている
   - `<script>`タグでの読み込みを想定している

2. **WASMの動的読み込み**
   - MediaPipeは実行時にWASMファイルを動的に読み込む
   - バンドル時に解決できないため、バンドルに含めると問題が起きやすい

3. **Viteの制限**
   - ViteはESMモジュールを前提としているが、MediaPipeはCommonJS形式
   - バンドル時に正しく変換できない場合がある

## 一般的なベストプラクティスとの比較

### 一般的なベストプラクティス

通常、JavaScriptライブラリは以下のように統合します：

```typescript
// npmでインストール
npm install some-library

// コードでインポート
import { SomeClass } from 'some-library'
```

### MediaPipeの場合

MediaPipeは以下の理由で、一般的な方法が適用しにくいです：

1. **WASMの動的読み込み**: 実行時にWASMファイルを読み込む必要がある
2. **グローバルスコープへの登録**: モジュールシステムと相性が悪い
3. **複数のファイル依存**: WASMファイル、モデルファイルなど、複数のファイルが必要

### 今回の方法の評価

**良い点:**
- ✅ 確実に動作する
- ✅ シンプルで理解しやすい
- ✅ デプロイ時に問題が起きにくい
- ✅ オフライン対応

**改善の余地:**
- ⚠️ TypeScriptの型定義が使えない（`any`型を使用）
- ⚠️ バンドル最適化の対象外
- ⚠️ 手動での更新が必要

## 代替案と将来の改善

### 代替案1: 型定義ファイルの作成

```typescript
// src/types/mediapipe-global.d.ts
declare global {
  interface Window {
    FaceDetection: typeof import('@mediapipe/face_detection').FaceDetection
  }
}

export {}
```

これにより、TypeScriptの型チェックが効くようになります。

### 代替案2: スクリプト読み込みの自動化

ビルド時に`node_modules`から`public`フォルダに自動コピーするスクリプトを作成：

```json
// package.json
{
  "scripts": {
    "prebuild": "cp -r node_modules/@mediapipe/face_detection/face_detection.js public/mediapipe/face_detection/"
  }
}
```

### 代替案3: Viteプラグインの作成

MediaPipe専用のViteプラグインを作成し、自動的に処理する方法もあります。

## 公式ガイドに沿った改善案

### 新しいAPI（@mediapipe/tasks-vision）への移行

[公式ガイド](https://ai.google.dev/edge/mediapipe/solutions/vision/face_detector/web_js?hl=ja)では、新しいAPI（`@mediapipe/tasks-vision`）の使用が推奨されています。

#### 新しいAPIのメリット

1. **よりシンプルな統合**
   ```typescript
   import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision';
   
   const faceDetector = await FaceDetector.createFromOptions(
     await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm'),
     {
       baseOptions: {
         modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
         delegate: 'GPU'
       },
       runningMode: 'IMAGE'
     }
   );
   ```

2. **より良い型定義**: TypeScriptの型定義が充実している
3. **公式サポート**: Googleが公式にサポートしている最新API
4. **CDNからの読み込み**: 公式CDNから直接読み込める

#### 移行の検討事項

**メリット:**
- ✅ 公式推奨の方法
- ✅ よりシンプルなコード
- ✅ より良い型定義
- ✅ 公式サポート

**デメリット:**
- ⚠️ 既存の実装を大幅に書き換える必要がある
- ⚠️ 動作確認が必要（現在の実装は既に動作している）
- ⚠️ APIの違いによる挙動の違いがある可能性

#### 移行の判断基準

**現時点での推奨:**
- **現在の方法を継続**: 既に動作している実装を維持
- **段階的な移行**: 新しい機能追加時に新しいAPIを検討
- **公式ガイドの確認**: 公式ガイドの最新情報を定期的に確認

**移行を検討するタイミング:**
- 新しい機能を追加する際
- パフォーマンスの問題が発生した際
- 公式サポートが終了する際

## まとめ

### 今回の方法は適切か？

**結論: 現時点では適切な選択です。**

理由：
1. **確実に動作する**: 最も重要な要件を満たしている
2. **シンプル**: 複雑な設定が不要
3. **保守しやすい**: 問題が起きた際の原因特定が容易

### 改善の方向性

将来的には以下の改善が考えられます：

1. **新しいAPIへの移行**: `@mediapipe/tasks-vision`への移行を検討
2. **型定義の追加**: TypeScriptの型安全性を向上
3. **自動化スクリプト**: ファイルコピーを自動化
4. **Viteプラグイン**: より統合的な解決策

### 初心者へのアドバイス

- **まず動作させる**: 今回の方法で確実に動作させることが最優先
- **理解を深める**: WASMやMediaPipeの仕組みを理解してから最適化を検討
- **段階的改善**: 動作確認後、型定義や自動化などの改善を検討
- **公式ガイドの確認**: 定期的に公式ガイドを確認し、最新のベストプラクティスを把握

## 参考資料

- [MediaPipe公式ドキュメント](https://developers.google.com/mediapipe)
- [MediaPipe Web向け顔検出ガイド](https://ai.google.dev/edge/mediapipe/solutions/vision/face_detector/web_js?hl=ja)
- [WebAssembly公式サイト](https://webassembly.org/)
- [Vite公式ドキュメント](https://vitejs.dev/)

