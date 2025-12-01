# marumo

**marumo**（まるも）は、サーバーに写真を送信せず、クライアント側で安全にモザイク加工できる画像加工アプリケーションです。

## アプリ名の由来

「**まる**」で囲むだけで簡単に「**モ**」ザイクをかける、というコンセプトから名付けられました。手軽に顔を保護できるツールです。

## 特徴

- **プライバシー保護**: 画像は一切サーバーに送信されません
- **簡単操作**: 直感的なUIで誰でも簡単に使用できます
- **高速処理**: 3秒以内に処理が完了します
- **多様な加工**: モザイク、ぼかし、スタンプの3種類から選択可能

## 技術スタック

- React 18.2.0
- TypeScript 5.2.2
- Vite 5.0.8（ビルドツール）
- Bun（パッケージマネージャー）
- Tailwind CSS（スタイリング）
- MediaPipe Face Detection（予定）

## 開発

```bash
# 依存関係のインストール
bun install

# 開発サーバーの起動
bun run dev

# ビルド
bun run build

# プレビュー
bun run preview
```

**注意**: このプロジェクトはBunをパッケージマネージャーとして使用しています。npm互換のため`npm run`でも動作しますが、Bunの使用を推奨します。

## デプロイ

本アプリケーションはCloudflare Pagesにデプロイされます。

### クイックスタート

1. [Cloudflare Dashboard](https://dash.cloudflare.com/)でプロジェクトを作成
2. GitHubリポジトリを接続
3. ビルド設定：
   - **ビルドコマンド**: `bun run build`
   - **ビルド出力ディレクトリ**: `dist`
4. デプロイ完了

詳細な手順は[デプロイメントガイド](./docs/05_deployment.md)を参照してください。

## ドキュメント

- [要件定義書](./docs/00_requirements.md)
- [技術仕様書](./docs/01_technical-specification.md)
- [API仕様書](./docs/02_api-specification.md)
- [ユーザーガイド](./docs/03_user-guide.md)
- [実装計画](./docs/04_implementation-plan.md)
- [デプロイメントガイド](./docs/05_deployment.md)

## ライセンス

MIT License

商用利用、改変、再配布が可能です。

