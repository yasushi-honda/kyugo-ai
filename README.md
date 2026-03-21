# 救護AI - 福祉相談業務AI支援システム

## 概要

茨城県の福祉相談業務AI活用事例を参考にした、生活困窮者向け福祉相談支援AIシステム。
相談記録の自動要約・支援メニュー提案・個別支援計画書の下書き生成・モニタリングシートの自動作成・法令検索を提供。

## 技術スタック

- **バックエンド**: TypeScript / Node.js 22+ / Express 5
- **フロントエンド**: React 19 + React Router DOM 7 + Vite
- **AI**: Vertex AI (gemini-2.5-flash) via Workload Identity
- **データベース**: Firestore Native Mode
- **認証**: Firebase Authentication
- **インフラ**: GCP Cloud Run / asia-northeast1
- **テスト**: Vitest + Testing Library + Playwright (E2E)

## 前提条件

- Node.js 22以上
- GCP プロジェクト（Firestore, Vertex AI, Cloud Run）
- Firebase Authentication プロジェクト
- gcloud CLI

## セットアップ

### 1. リポジトリのクローン

```bash
git clone https://github.com/yasushi-honda/kyugo-ai.git
cd kyugo-ai
```

### 2. 依存関係のインストール

```bash
npm install
cd frontend && npm install && cd ..
```

### 3. GCP認証

```bash
gcloud auth application-default login
gcloud config set project kyugo-ai-dev
```

### 4. 環境変数（必要に応じて .env に設定）

| 変数名 | 説明 | デフォルト |
|--------|------|----------|
| PORT | サーバーポート | 8080 |
| GOOGLE_CLOUD_PROJECT | GCPプロジェクトID | - |
| ALLOWED_EMAIL_DOMAINS | 許可メールドメイン（カンマ区切り） | - |
| ALLOWED_EMAILS | 許可メールアドレス（カンマ区切り） | - |
| AI_RETRY_SECRET | AIリトライAPIシークレット | - |

### 5. 開発サーバー起動

```bash
npm run dev        # バックエンド（tsx watch）
cd frontend && npm run dev  # フロントエンド（Vite）
```

## コマンド一覧

| コマンド | 説明 |
|---------|------|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | TypeScriptビルド |
| `npm test` | テスト実行（BE 241件 + FE 231件） |
| `npm run lint` | ESLint実行 |
| `npm run test:e2e` | E2Eテスト（Firebase Auth Emulator必要） |
| `npm run seed` | 支援メニューシードデータ投入 |

## ディレクトリ構成

```
kyugo-ai/
├── src/                    # バックエンド
│   ├── routes/             # APIエンドポイント
│   ├── services/           # ビジネスロジック（AI, リトライ）
│   ├── repositories/       # Firestoreデータアクセス
│   ├── middleware/          # 認証・認可・レート制限・監査ログ・エラーハンドラ
│   ├── schemas/            # Zodバリデーション
│   ├── utils/              # ユーティリティ（ログ等）
│   └── types.ts            # 型定義
├── frontend/               # フロントエンド（React + Vite）
│   └── src/
│       ├── components/     # UIコンポーネント
│       ├── pages/          # ページコンポーネント
│       ├── contexts/       # React Context（認証）
│       └── hooks/          # カスタムフック
├── e2e/                    # E2Eテスト（Playwright）
├── docs/
│   ├── adr/                # Architecture Decision Records（ADR-001〜007）
│   └── operations/         # 運用マニュアル（デプロイ・バックアップ・監視・障害対応・ユーザー管理）
├── infra/                  # インフラ設定
└── firestore/              # Firestoreセキュリティルール
```

## デプロイ

`main` ブランチへのマージで GitHub Actions CI/CD が自動実行される。
詳細は `docs/operations/deployment.md` を参照。

```bash
# 本番URL
https://kyugo-ai-2knyenyska-an.a.run.app
```

## ADR（Architecture Decision Records）

| ADR | タイトル |
|-----|---------|
| ADR-001 | 技術選定 |
| ADR-002 | セキュリティアーキテクチャ |
| ADR-003 | データモデル |
| ADR-004 | 音声文字起こし |
| ADR-005 | AIリトライ機構 |
| ADR-006 | Firestoreトランザクション導入方針 |
| ADR-007 | 監査ログ設計 |

詳細は `docs/adr/` を参照。

## セキュリティ

- サービスアカウントキーのダウンロード禁止（Workload Identity使用）
- 個人情報は日本リージョン（asia-northeast1）のみに保存
- Firestoreセキュリティルールで行レベルアクセス制御
- Firebase IDトークンによるAPI認証
- Helmetによるセキュリティヘッダー
- 監査ログ（Cloud Logging、個人情報非出力）
- Firestoreトランザクションによるデータ整合性保証
- Secret Managerによるシークレット管理
- Firestore日次自動バックアップ（7日保持）
- 全エンドポイント認証チェック表: `docs/operations/security-checklist.md`

## トラブルシューティング

### Firestore接続エラー

```bash
# ADCの確認
gcloud auth application-default print-access-token
# プロジェクトIDの確認
gcloud config get-value project
```

### Vertex AI エラー

- `maxOutputTokens` 不足: AIレスポンスが途中で切れる場合、設定値を確認
- リトライ機能: 一時的なエラーは自動リトライ（最大3回、指数バックオフ）

### E2Eテスト

```bash
# Firebase Auth Emulatorが必要
npm run test:e2e
```

## ライセンス

MIT
