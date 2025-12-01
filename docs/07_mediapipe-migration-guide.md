# MediaPipe新APIへの移行ガイド

## はじめに

このドキュメントでは、[公式ガイド](https://ai.google.dev/edge/mediapipe/solutions/vision/face_detector/web_js?hl=ja)に沿って、新しいAPI（`@mediapipe/tasks-vision`）への移行方法を説明します。

## 現在の実装と新しいAPIの比較

### 現在の実装（@mediapipe/face_detection）

```typescript
// グローバルスコープから取得
const FaceDetection = window.FaceDetection;
const faceDetection = new FaceDetection({
  locateFile: (file) => `https://unpkg.com/@mediapipe/face_detection@0.4.1646425229/${file}`
});
```

**特徴:**
- 古いAPI（レガシー）
- グローバルスコープに依存
- コールバックベースのAPI

### 新しいAPI（@mediapipe/tasks-vision）

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

**特徴:**
- 新しいAPI（公式推奨）
- ESMモジュール対応
- PromiseベースのAPI
- より良い型定義

## 移行のメリット・デメリット

### メリット

1. **公式推奨**: Googleが公式にサポートしている最新API
2. **より良い型定義**: TypeScriptの型定義が充実
3. **シンプルな統合**: ESMモジュールとして直接インポート可能
4. **CDN対応**: 公式CDNから直接読み込める
5. **将来のサポート**: 長期的なサポートが期待できる

### デメリット

1. **既存コードの書き換え**: 現在の実装を大幅に変更する必要がある
2. **動作確認が必要**: 既存の機能が正しく動作するか確認が必要
3. **APIの違い**: コールバックベースからPromiseベースへの変更
4. **学習コスト**: 新しいAPIの学習が必要

## 移行手順

### ステップ1: パッケージのインストール

```bash
bun add @mediapipe/tasks-vision
```

### ステップ2: 実装の変更

#### 現在の実装

```typescript
// src/services/faceDetection.ts
const faceDetection = new FaceDetection({
  locateFile: (file) => `https://unpkg.com/@mediapipe/face_detection@0.4.1646425229/${file}`
});

faceDetection.onResults((results) => {
  // コールバックで結果を処理
});
```

#### 新しい実装

```typescript
// src/services/faceDetection.ts
import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision';

class FaceDetectionService {
  private faceDetector: FaceDetector | null = null;

  async initialize() {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm'
    );
    
    this.faceDetector = await FaceDetector.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
        delegate: 'GPU'
      },
      runningMode: 'IMAGE',
      minDetectionConfidence: 0.4
    });
  }

  async detectFaces(image: HTMLImageElement) {
    if (!this.faceDetector) {
      await this.initialize();
    }
    
    const results = this.faceDetector.detect(image);
    return this.convertResults(results);
  }
}
```

### ステップ3: HTMLの変更

#### 現在の実装

```html
<script src="/mediapipe/face_detection/face_detection.js"></script>
```

#### 新しい実装

```html
<!-- 不要（ESMモジュールとして直接インポート） -->
```

### ステップ4: 型定義の更新

新しいAPIは型定義が充実しているため、`any`型を使う必要がなくなります。

## 移行の判断基準

### 移行を推奨する場合

- ✅ 新しいプロジェクトを開始する場合
- ✅ 既存の実装に問題が発生している場合
- ✅ 公式サポートを優先する場合
- ✅ 型安全性を重視する場合

### 移行を保留する場合

- ⚠️ 既存の実装が正常に動作している場合
- ⚠️ リリースが近い場合
- ⚠️ リソースが限られている場合
- ⚠️ 既存の実装に依存する機能が多い場合

## 現在のプロジェクトでの推奨

### 現時点での推奨

**現在の実装を継続することを推奨します。**

理由：
1. **既に動作している**: 現在の実装は正常に動作している
2. **安定性**: 動作確認済みの実装を維持することが重要
3. **リスク管理**: 移行による不具合のリスクを避ける

### 将来的な移行計画

1. **段階的な移行**: 新しい機能追加時に新しいAPIを検討
2. **並行運用**: 新しいAPIで実装し、既存の実装と比較
3. **公式ガイドの確認**: 定期的に公式ガイドを確認し、最新情報を把握

## 参考資料

- [MediaPipe Web向け顔検出ガイド](https://ai.google.dev/edge/mediapipe/solutions/vision/face_detector/web_js?hl=ja)
- [MediaPipe公式ドキュメント](https://developers.google.com/mediapipe)
- [@mediapipe/tasks-vision npm](https://www.npmjs.com/package/@mediapipe/tasks-vision)

