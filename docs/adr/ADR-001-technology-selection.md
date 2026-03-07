# ADR-001: 技術選定

## ステータス: 承認済み

## コンテキスト

茨城県の福祉相談業務における生成AI活用事例を参考に、福祉相談支援AIシステムを構築する。
個人情報を含む相談業務でクラウドサービスを利用するため、ISMAP準拠のセキュリティが必要。

## 決定

### クラウド基盤: Google Cloud Platform (GCP)
- **理由**: 茨城県事例でGoogle Workspace + Geminiが採用済み。ISMAPに登録済みサービス。
- **リージョン**: asia-northeast1（東京）に限定。個人情報の国内保管を保証。

### 生成AI: Vertex AI (gemini-2.5-flash)
- **理由**: 低レイテンシ・高速推論。福祉相談の即座の応答に適する。
- **認証**: Workload Identity Federation（サービスアカウントキー不使用）

### データストア: Firestore (Native Mode)
- **理由**: スキーマレスで相談データの多様な構造に対応。リアルタイム同期でタブレット端末と連携可能。
- **リージョン**: asia-northeast1

### 言語・ランタイム: TypeScript / Node.js
- **理由**: Firestore・Vertex AI SDKの充実したサポート。型安全性。

## 結果

- GCPの日本リージョンサービスのみを使用し、データ主権を確保
- Workload Identityにより認証キーの漏洩リスクを排除
- Firestoreのセキュリティルールで細粒度のアクセス制御を実現
