# ADR-002: セキュリティアーキテクチャ

## ステータス: 承認済み

## コンテキスト

福祉相談業務では生活困窮者の個人情報（収入・家族構成・健康状態等）を扱う。
2024年10月改正の「地方公共団体における情報セキュリティポリシーに関するガイドライン」に準拠し、
クラウド上での個人情報の安全な取扱いを実現する必要がある。

## 決定

### 1. 認証・認可

| 層 | 方式 | 詳細 |
|---|------|------|
| CI/CD → GCP | Workload Identity Federation | GitHub Actions OIDC。SAキー不使用 |
| ユーザー → アプリ | Firebase Authentication | メール+パスワード or Google SSO |
| アプリ → Firestore | Firestore Security Rules | ロールベースアクセス制御 |
| アプリ → Vertex AI | IAMサービスアカウント | aiplatform.user ロール（最小権限） |

### 2. データ保護

- **転送中**: TLS 1.3（GCPデフォルト）
- **保存時**: Google管理暗号化キー（デフォルト）。将来的にCMEK（顧客管理暗号化キー）を検討
- **リージョン制限**: asia-northeast1のみ。Organization Policyで他リージョンへのデプロイを制限（本番で適用）
- **個人情報**: 紙での持ち出し禁止。タブレット端末経由のクラウドアクセスのみ

### 3. 監査・ログ

- Cloud Audit Logs: 管理アクティビティログ（デフォルト有効）
- データアクセスログ: Firestore読み書き操作を記録（本番で有効化）
- ログの保持期間: 400日（コンプライアンス要件に応じて延長）

### 4. サービスアカウントキー管理

- **禁止**: JSONキーファイルのダウンロード・保存
- **必須**: Workload Identity Federation or Attached Service Account のみ
- **根拠**: キー漏洩は最も一般的なクラウドセキュリティインシデント

### 5. ネットワーク（本番環境で適用）

- VPC Service Controls: Firestore, Vertex AIをサービス境界内に配置
- Private Google Access: 内部ネットワーク経由でのAPI接続
- Cloud Armor: WAFによるDDoS防御

## 結果

- SAキーレス運用によりクレデンシャル漏洩リスクをゼロに
- Firestoreルールによる行レベルのアクセス制御
- 日本リージョン限定によるデータ主権の確保
- 段階的なセキュリティ強化パス（dev → staging → prod）
