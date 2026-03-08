# ADR-005: AI分析リトライ機構

## Status
Accepted (2026-03-08)

## Context
相談記録作成時のAI分析はfire-and-forgetで実行され、一時障害（429/503/timeout）時に`retry_pending`状態に遷移する仕組みは実装済みだった。しかし、`retry_pending`レコードを再実行する仕組みがなく、障害発生時にレコードが永久に滞留する問題があった。

## Decision

### リトライエンドポイント
- `POST /api/admin/retry-ai` を新設
- `X-Retry-Secret` ヘッダーで認証（Cloud Scheduler用。環境変数 `AI_RETRY_SECRET` で設定）
- Firebase Auth認証は不要（内部システム間通信のため）

### リトライロジック
- 最大リトライ回数: 3回（`AI_RETRY_CONFIG.maxRetryCount`）
- 指数バックオフ: `baseDelay * 2^retryCount`（5min → 10min → 20min）
- 一時障害の判定: HTTP 429/503、timeout、ECONNRESET等
- 永続エラーは即座に`error`に遷移

### 状態遷移
```
pending → completed (成功)
pending → retry_pending (一時障害, count=0, nextRetryAt=now+5min)
retry_pending → completed (リトライ成功)
retry_pending → retry_pending (リトライ失敗, count++, nextRetryAt更新)
retry_pending → error (count >= maxRetryCount)
```

### 運用
- Cloud Schedulerで5分間隔で`POST /api/admin/retry-ai`を呼び出す（手動設定）
- `nextRetryAt`フィールドにより、バックオフ期間中のレコードはスキップされる

## Consequences
- `retry_pending`レコードの自動再処理が可能になる
- max retry超過で確実に`error`に遷移し、行き止まりがない
- Cloud Scheduler設定は手動（Terraform/IaC化は将来課題）

## Cloud Scheduler設定手順
```bash
gcloud scheduler jobs create http ai-retry-job \
  --schedule="*/5 * * * *" \
  --uri="https://kyugo-ai-2knyenyska-an.a.run.app/api/admin/retry-ai" \
  --http-method=POST \
  --headers="X-Retry-Secret=<SECRET>" \
  --location=asia-northeast1 \
  --project=kyugo-ai-dev
```
