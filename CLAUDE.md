# Kyugo AI - 福祉相談業務AI支援システム

## プロジェクト概要
茨城県の福祉相談業務AI活用事例を参考にした、生活困窮者向け福祉相談支援AIシステム。

## 技術スタック
- **クラウド**: GCP (project: kyugo-ai-dev, region: asia-northeast1)
- **AI**: Vertex AI (gemini-2.5-flash) via Workload Identity
- **DB**: Firestore Native Mode (asia-northeast1)
- **言語**: TypeScript / Node.js 22+
- **認証**: Workload Identity Federation（SAキー禁止）

## GCP設定
- gcloud config: `kyugo-ai`
- アカウント: `hy.unimail.11@gmail.com`
- プロジェクトID: `kyugo-ai-dev`
- プロジェクト番号: `880774580577`

## GitHub
- リポジトリ: `yasushi-honda/kyugo-ai`
- アカウント: `yasushi-honda`

## セキュリティ原則
- サービスアカウントキーのダウンロード禁止
- 個人情報は日本リージョン（asia-northeast1）のみ
- Firestoreセキュリティルールで行レベルアクセス制御
- ADRは docs/adr/ に記録

## コマンド
```bash
npm run dev      # 開発サーバー起動
npm run build    # TypeScriptビルド
npm test         # テスト実行
npm run lint     # Lint実行
```
