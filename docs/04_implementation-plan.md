# marumo 実装計画

## STEP 0: セットアップと共通基盤
- [x] `bun install`で依存関係導入、`bun run dev`で起動確認
- [x] Tailwind CSS設定（`tailwind.config.js` / `postcss.config.js` / `src/index.css`）
- [x] 型定義（`src/types/index.ts`）とユーティリティ雛形整備
- [x] 簡易レイアウトと共通スタイルの適用
- 動作確認: 画面が表示され、スタイルが反映される

## STEP 1: 画面骨格・UIコンポーネント
- [x] `App.tsx`にヘッダー・画像選択エリア・プレビュー・操作パネルを配置
- [x] `ImageUploader`/`ImageCanvas`/`ProcessingOptions`などのレイアウトを作成
- [x] Tailwindでレスポンシブレイアウトを整備
- 動作確認: 主要UIが表示され、スマホ/PCで崩れない

## STEP 2: 画像選択とCanvas描画
- [ ] `ImageUploader`で`FileHandlerService.validateFile/loadImage`を呼び出す
- [ ] `useCanvas`でCanvas描画、4K超過のリサイズと検証を実装
- 動作確認: 対応形式の画像を選択するとCanvasに表示される
- 動作確認: 不正形式や10MB超過でトースト通知が出る

## STEP 3: 自動顔検出
- [ ] `useFaceDetection`と`FaceDetectionService`を実装（MediaPipe初期化、信頼度0.7フィルタ）
- [ ] 自動モードUIから検出を実行し、Canvas上でハイライト表示
- 動作確認: 顔がハイライトされる、検出エラー時にトースト通知

## STEP 4: 手動モード（投げ縄選択）
- [ ] `LassoSelector`で自由形状選択→`detectFacesInRegion`に渡す
- [ ] include/excludeモード切り替えと1セット処理（選択→検出→加工）を実装
- 動作確認: 指定範囲の顔のみ処理される

## STEP 5: 画像加工（モザイク/ぼかし/スタンプ）
- [ ] `ImageProcessorService`で各処理（グリッド計算式、ブラー半径、スタンプ5種）を実装
- [ ] `ProcessingOptions`で加工種別・高度設定スライダーを制御
- 動作確認: 各加工が適用でき、強度変更が反映される

## STEP 6: ダウンロード機能
- [ ] `DownloadButton`でCanvas→Blob生成し元形式でダウンロード
- 動作確認: 加工済み画像が元形式・適切なファイル名で保存される

## STEP 7: エラーハンドリングとUX
- [ ] トースト通知コンポーネント、ローディングスピナーを導入
- [ ] アクセシビリティ（フォーカス、コントラスト）とレスポンシブ最終調整
- 動作確認: すべてのエラーで適切に通知され、操作不能にならない

## STEP 8: ドキュメント整合と最終確認
- [ ] 実装と要件定義/技術仕様/API仕様/ユーザーガイドの整合性を確認
- [ ] `bun run build` → `bun run preview`で最終動作確認
- 動作確認: 仕様書通りのフローで全機能が動作する
