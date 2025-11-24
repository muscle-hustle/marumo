# marumo API仕様書（クライアント側API）

## 1. 概要

本ドキュメントは、**marumo**（まるも）のクライアント側API仕様を定義する。
すべての処理はブラウザ内で完結し、サーバーとの通信は行わない。

## 2. 型定義

### 2.1 基本型

```typescript
// 顔検出結果
interface FaceDetectionResult {
  x: number;        // 左上X座標（ピクセル）
  y: number;        // 左上Y座標（ピクセル）
  width: number;    // 幅（ピクセル）
  height: number;   // 高さ（ピクセル）
  confidence: number; // 信頼度（0.0-1.0）
}

// ファイル検証結果
interface ValidationResult {
  valid: boolean;
  error?: string;
}

// 加工種類
type ProcessingType = 'mosaic' | 'blur' | 'stamp';

// 検出モード
type DetectionMode = 'auto' | 'manual';

// 手動モードの種類
type ManualModeType = 'include' | 'exclude';

// 画像読み込みオプション
interface ImageLoadOptions {
  maxFileSize: number;        // 最大ファイルサイズ（バイト、デフォルト: 10MB）
  maxImageWidth: number;       // 最大画像幅（ピクセル、デフォルト: 3840）
  maxImageHeight: number;      // 最大画像高さ（ピクセル、デフォルト: 2160）
  allowedMimeTypes: string[];  // 許可されるMIMEタイプ（デフォルト: ['image/jpeg', 'image/png', 'image/webp']）
}
```

## 3. FileHandlerService API

### 3.1 validateFile

ファイルの検証を行う。

**シグネチャ**:
```typescript
validateFile(file: File): ValidationResult
```

**パラメータ**:
- `file: File` - 検証するファイルオブジェクト

**戻り値**:
- `ValidationResult` - 検証結果

**検証内容**:
1. **MIMEタイプの検証**: ファイルヘッダー（マジックナンバー）を確認して厳格に検証
   - 許可するMIMEタイプ: `image/jpeg`, `image/png`, `image/webp`
   - 拡張子のみの検証では不十分なため、ファイルヘッダーで検証
2. ファイルサイズが10MB以下か
3. ファイルが画像形式か

**使用例**:
```typescript
const file = event.target.files[0];
const result = FileHandlerService.validateFile(file);
if (!result.valid) {
  console.error(result.error);
  return;
}
```

**エラーケース**:
- `"サポートされていない画像形式です"` - MIMEタイプが不正（許可形式: JPEG、PNG、WebP）
- `"ファイルサイズが10MBを超えています"` - ファイルサイズ超過
- `"ファイルの読み込みに失敗しました"` - ファイル読み込みエラー

**注意**: エラーメッセージはトースト通知（画面下部に一時的に表示）でユーザーに通知されます。

### 3.2 loadImage

画像ファイルを読み込んでHTMLImageElementを返す。

**シグネチャ**:
```typescript
loadImage(file: File): Promise<HTMLImageElement>
```

**パラメータ**:
- `file: File` - 読み込む画像ファイル

**戻り値**:
- `Promise<HTMLImageElement>` - 読み込まれた画像要素

**処理内容**:
1. FileReader APIでファイルを読み込み
2. データURLを生成
3. HTMLImageElementを作成して画像を読み込み
4. 画像サイズを検証（4K以下）

**使用例**:
```typescript
try {
  const image = await FileHandlerService.loadImage(file);
  // 画像を使用
} catch (error) {
  console.error('画像の読み込みに失敗しました', error);
}
```

**エラーケース**:
- `"画像サイズが4Kを超えています"` - 画像サイズ超過
- `"画像の読み込みに失敗しました"` - 読み込みエラー

### 3.3 validateImageSize

画像サイズを検証する。

**シグネチャ**:
```typescript
validateImageSize(
  image: HTMLImageElement,
  maxWidth: number,
  maxHeight: number
): boolean
```

**パラメータ**:
- `image: HTMLImageElement` - 検証する画像
- `maxWidth: number` - 最大幅（デフォルト: 3840）
- `maxHeight: number` - 最大高さ（デフォルト: 2160）

**戻り値**:
- `boolean` - 検証結果（true: 有効、false: 無効）

## 4. FaceDetectionService API

### 4.1 detectFaces

画像内のすべての顔を検出する。

**シグネチャ**:
```typescript
detectFaces(image: HTMLImageElement): Promise<FaceDetectionResult[]>
```

**パラメータ**:
- `image: HTMLImageElement` - 検出対象の画像

**戻り値**:
- `Promise<FaceDetectionResult[]>` - 検出された顔の配列

**処理内容**:
1. MediaPipe Face Detectionを初期化（初回のみ）
2. 画像をモデル用に前処理
3. 顔検出を実行
4. 検出結果をCanvas座標系に変換
5. 信頼度が0.7未満の検出結果を除外（過剰検出の抑制）

**使用例**:
```typescript
const faces = await FaceDetectionService.detectFaces(image);
console.log(`${faces.length}個の顔を検出しました`);
```

**エラーケース**:
- `"顔検出モデルの読み込みに失敗しました"` - モデル読み込みエラー
- `"顔検出に失敗しました"` - 検出処理エラー
- `"処理に時間がかかりすぎています"` - タイムアウト（30秒）

### 4.2 detectFacesInRegion

指定された領域内の顔を検出する。

**シグネチャ**:
```typescript
detectFacesInRegion(
  image: HTMLImageElement,
  region: Path2D
): Promise<FaceDetectionResult[]>
```

**パラメータ**:
- `image: HTMLImageElement` - 検出対象の画像
- `region: Path2D` - 検出範囲（投げ縄選択のパス）

**戻り値**:
- `Promise<FaceDetectionResult[]>` - 検出された顔の配列

**処理内容**:
1. 領域内の画像を抽出
2. 抽出した画像に対して顔検出を実行
3. 検出結果の座標を元の画像座標系に変換

**使用例**:
```typescript
const lassoPath = new Path2D();
// 投げ縄選択のパスを構築
const faces = await FaceDetectionService.detectFacesInRegion(image, lassoPath);
```

### 4.3 initialize

顔検出モデルを初期化する。

**シグネチャ**:
```typescript
initialize(): Promise<void>
```

**戻り値**:
- `Promise<void>` - 初期化完了

**処理内容**:
1. MediaPipe Face Detectionモデルをダウンロード
2. WebAssemblyモジュールを読み込み
3. モデルを初期化

**使用例**:
```typescript
// アプリ起動時に一度だけ実行
await FaceDetectionService.initialize();
```

## 5. ImageProcessorService API

### 5.1 applyMosaic

モザイク処理を適用する。

**シグネチャ**:
```typescript
applyMosaic(
  canvas: HTMLCanvasElement,
  faces: FaceDetectionResult[],
  intensity?: number
): void
```

**パラメータ**:
- `canvas: HTMLCanvasElement` - 加工対象のCanvas
- `faces: FaceDetectionResult[]` - モザイクを適用する顔の配列
- `intensity?: number` - モザイクの強度（1-10、デフォルト: 5）

**処理内容**:
1. 各顔領域をグリッドに分割
   - グリッドサイズ = 顔領域の最小辺 / (10 + intensity)
2. 各グリッドセルの平均色を計算
3. セル全体を平均色で塗りつぶし

**使用例**:
```typescript
ImageProcessorService.applyMosaic(canvas, faces, 7);
```

### 5.2 applyBlur

ぼかし処理を適用する。

**シグネチャ**:
```typescript
applyBlur(
  canvas: HTMLCanvasElement,
  faces: FaceDetectionResult[],
  intensity?: number
): void
```

**パラメータ**:
- `canvas: HTMLCanvasElement` - 加工対象のCanvas
- `faces: FaceDetectionResult[]` - ぼかしを適用する顔の配列
- `intensity?: number` - ぼかしの強度（1-10、デフォルト: 5）

**処理内容**:
1. 各顔領域を一時的なCanvasに切り出し
2. ガウシアンブラーを適用
   - ブラー半径 = intensity * 2px
   - Canvas APIの`filter`プロパティを使用
3. 元のCanvasに合成

**使用例**:
```typescript
ImageProcessorService.applyBlur(canvas, faces, 8);
```

### 5.3 applyStamp

スタンプ処理を適用する。

**シグネチャ**:
```typescript
applyStamp(
  canvas: HTMLCanvasElement,
  faces: FaceDetectionResult[],
  stampImage: HTMLImageElement
): void
```

**パラメータ**:
- `canvas: HTMLCanvasElement` - 加工対象のCanvas
- `faces: FaceDetectionResult[]` - スタンプを適用する顔の配列
- `stampImage: HTMLImageElement` - スタンプ画像

**処理内容**:
1. 各顔領域のサイズに合わせてスタンプをリサイズ
2. 顔領域の中央に配置
3. アスペクト比を維持

**使用例**:
```typescript
const stamp = new Image();
stamp.src = '/assets/stamps/emoji1.png';
stamp.onload = () => {
  ImageProcessorService.applyStamp(canvas, faces, stamp);
};
```

### 5.4 loadStampImage

スタンプ画像を読み込む。

**シグネチャ**:
```typescript
loadStampImage(path: string): Promise<HTMLImageElement>
```

**パラメータ**:
- `path: string` - スタンプ画像のパス

**戻り値**:
- `Promise<HTMLImageElement>` - 読み込まれたスタンプ画像

**スタンプの種類**: 5種類（PNG形式、512×512px、透過対応）
- 😀（にっこり）
- 😊（笑顔）
- 😎（サングラス）
- 😴（眠い）
- 🤔（考える）

**使用例**:
```typescript
const stamp = await ImageProcessorService.loadStampImage('/assets/stamps/emoji1.png');
```

## 6. Canvas Utility API

### 6.1 createCanvasFromImage

画像からCanvasを作成する。

**シグネチャ**:
```typescript
createCanvasFromImage(image: HTMLImageElement): HTMLCanvasElement
```

**パラメータ**:
- `image: HTMLImageElement` - 元となる画像

**戻り値**:
- `HTMLCanvasElement` - 作成されたCanvas

**使用例**:
```typescript
const canvas = createCanvasFromImage(image);
```

### 6.2 downloadCanvas

Canvasの内容を画像ファイルとしてダウンロードする。

**シグネチャ**:
```typescript
downloadCanvas(
  canvas: HTMLCanvasElement,
  filename: string,
  mimeType?: string,
  quality?: number
): void
```

**パラメータ**:
- `canvas: HTMLCanvasElement` - ダウンロードするCanvas
- `filename: string` - ファイル名
- `mimeType?: string` - MIMEタイプ（デフォルト: 元の画像形式）
- `quality?: number` - 品質（0.0-1.0、JPEGのみ、デフォルト: 0.92）

**処理内容**:
1. CanvasからBlobを生成
2. ダウンロードリンクを作成
3. クリックイベントを発火してダウンロード

**使用例**:
```typescript
downloadCanvas(canvas, 'processed-image.jpg', 'image/jpeg', 0.9);
```

### 6.3 resizeCanvas

Canvasを指定サイズにリサイズする。

**シグネチャ**:
```typescript
resizeCanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number
): HTMLCanvasElement
```

**パラメータ**:
- `canvas: HTMLCanvasElement` - リサイズするCanvas
- `width: number` - 新しい幅
- `height: number` - 新しい高さ

**戻り値**:
- `HTMLCanvasElement` - リサイズされたCanvas（新しいCanvas）

**使用例**:
```typescript
const resizedCanvas = resizeCanvas(canvas, 1920, 1080);
```

## 7. React Hooks API

### 7.1 useFaceDetection

顔検出機能を提供するカスタムフック。

**シグネチャ**:
```typescript
function useFaceDetection() {
  return {
    faces: FaceDetectionResult[];
    isDetecting: boolean;
    error: string | null;
    detectFaces: (image: HTMLImageElement) => Promise<void>;
    detectFacesInRegion: (image: HTMLImageElement, region: Path2D) => Promise<void>;
    clearFaces: () => void;
  };
}
```

**戻り値**:
- `faces: FaceDetectionResult[]` - 検出された顔の配列
- `isDetecting: boolean` - 検出中かどうか
- `error: string | null` - エラーメッセージ
- `detectFaces: (image: HTMLImageElement) => Promise<void>` - 自動検出
- `detectFacesInRegion: (image: HTMLImageElement, region: Path2D) => Promise<void>` - 領域検出
- `clearFaces: () => void` - 検出結果をクリア

**使用例**:
```typescript
const { faces, isDetecting, detectFaces } = useFaceDetection();

await detectFaces(image);
console.log(faces);
```

### 7.2 useImageProcessing

画像処理機能を提供するカスタムフック。

**シグネチャ**:
```typescript
function useImageProcessing() {
  return {
    processedCanvas: HTMLCanvasElement | null;
    isProcessing: boolean;
    error: string | null;
    processImage: (
      canvas: HTMLCanvasElement,
      faces: FaceDetectionResult[],
      type: ProcessingType,
      intensity?: number,
      stampImage?: HTMLImageElement
    ) => Promise<void>;
    reset: () => void;
  };
}
```

**戻り値**:
- `processedCanvas: HTMLCanvasElement | null` - 加工済みCanvas
- `isProcessing: boolean` - 処理中かどうか
- `error: string | null` - エラーメッセージ
- `processImage: (...) => Promise<void>` - 画像処理の実行
- `reset: () => void` - 処理結果をリセット

**使用例**:
```typescript
const { processedCanvas, processImage } = useImageProcessing();

await processImage(canvas, faces, 'mosaic', 7);
```

### 7.3 useCanvas

Canvas管理機能を提供するカスタムフック。

**シグネチャ**:
```typescript
function useCanvas(image: HTMLImageElement | null) {
  return {
    canvas: HTMLCanvasElement | null;
    canvasRef: RefObject<HTMLCanvasElement>;
    drawImage: () => void;
    clear: () => void;
  };
}
```

**パラメータ**:
- `image: HTMLImageElement | null` - 描画する画像

**戻り値**:
- `canvas: HTMLCanvasElement | null` - Canvas要素
- `canvasRef: RefObject<HTMLCanvasElement>` - Canvasのref
- `drawImage: () => void` - 画像を描画
- `clear: () => void` - Canvasをクリア

**使用例**:
```typescript
const { canvasRef, drawImage } = useCanvas(image);

useEffect(() => {
  if (image) {
    drawImage();
  }
}, [image]);
```

## 8. エラーハンドリング

### 8.1 エラー型

```typescript
class ImageProcessingError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ImageProcessingError';
  }
}
```

### 8.2 エラーコード

- `FILE_INVALID_FORMAT` - ファイル形式が不正（許可形式: JPEG、PNG、WebP）
- `FILE_SIZE_EXCEEDED` - ファイルサイズ超過（10MB超過）
- `IMAGE_SIZE_EXCEEDED` - 画像サイズ超過（4K超過）
- `FACE_DETECTION_FAILED` - 顔検出失敗
- `FACE_DETECTION_TIMEOUT` - 顔検出タイムアウト（30秒）
- `PROCESSING_FAILED` - 画像処理失敗
- `MEMORY_ERROR` - メモリ不足

### 8.3 エラーハンドリング例

```typescript
try {
  const image = await FileHandlerService.loadImage(file);
  const faces = await FaceDetectionService.detectFaces(image);
  ImageProcessorService.applyMosaic(canvas, faces);
} catch (error) {
  if (error instanceof ImageProcessingError) {
    // エラーメッセージはトースト通知で表示
    switch (error.code) {
      case 'FILE_SIZE_EXCEEDED':
        showToast('ファイルサイズが10MBを超えています');
        break;
      case 'FACE_DETECTION_FAILED':
        showToast('顔を検出できませんでした。手動モードをお試しください');
        break;
      case 'FACE_DETECTION_TIMEOUT':
        showToast('処理に時間がかかりすぎています');
        break;
      default:
        showToast('エラーが発生しました: ' + error.message);
    }
  }
}
```

**エラー表示方法**: すべてのエラーメッセージはトースト通知（画面下部に一時的に表示）でユーザーに通知されます。

## 9. パフォーマンス考慮事項

### 9.1 非同期処理
- すべての重い処理は非同期で実行
- UIスレッドをブロックしない

### 9.2 メモリ管理
- 大きな画像は処理前にリサイズ
- 処理完了後は不要なオブジェクトを解放

### 9.3 最適化
- OffscreenCanvasを使用してバックグラウンド処理
- Web Workersの検討（将来的な拡張）

