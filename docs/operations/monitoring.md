# Cloud Monitoring 監視設定

## 概要

Cloud Run上のkyugo-aiサービスの正常性を監視し、異常時にアラートを発報する。

## アラートポリシー

### 1. エラー率アラート（5xx > 5%）

**条件**: 5分間の5xxレスポンス率が5%を超えた場合

```bash
# Google Cloud Console → Monitoring → アラートポリシー → 作成
# MQL:
fetch cloud_run_revision
| metric 'run.googleapis.com/request_count'
| filter resource.service_name == 'kyugo-ai'
| group_by [metric.response_code_class]
| align rate(5m)
| condition val(0) > 5 '1/s'
```

### 2. レイテンシアラート（P95 > 10秒）

**条件**: 5分間のP95レイテンシが10秒を超えた場合

```bash
# MQL:
fetch cloud_run_revision
| metric 'run.googleapis.com/request_latencies'
| filter resource.service_name == 'kyugo-ai'
| align percentile(5m, 95)
| condition val(0) > 10000 'ms'
```

### 3. メモリ使用率アラート（> 80%）

**条件**: メモリ使用率が80%を超えた場合

```bash
# MQL:
fetch cloud_run_revision
| metric 'run.googleapis.com/container/memory/utilizations'
| filter resource.service_name == 'kyugo-ai'
| align mean(5m)
| condition val(0) > 0.8
```

## アラート設定手順

### 1. 通知チャネルの作成

```bash
# メール通知チャネル作成
gcloud monitoring channels create \
  --display-name="Kyugo AI Ops Email" \
  --type=email \
  --channel-labels=email_address=hy.unimail.11@gmail.com \
  --project=kyugo-ai-dev
```

### 2. アラートポリシーの作成

Google Cloud Console の Monitoring → アラートポリシー から上記MQLを使用して作成するか、
以下のYAMLファイルをgcloudで適用する。

```yaml
# alert-policies/error-rate.yaml
displayName: "Kyugo AI - エラー率 > 5%"
conditions:
  - displayName: "5xx rate > 5%"
    conditionThreshold:
      filter: >
        resource.type="cloud_run_revision"
        AND resource.labels.service_name="kyugo-ai"
        AND metric.type="run.googleapis.com/request_count"
        AND metric.labels.response_code_class="5xx"
      comparison: COMPARISON_GT
      thresholdValue: 5
      duration: 300s
      aggregations:
        - alignmentPeriod: 300s
          perSeriesAligner: ALIGN_RATE
combiner: OR
```

```bash
gcloud monitoring policies create \
  --policy-from-file=alert-policies/error-rate.yaml \
  --project=kyugo-ai-dev
```

## ダッシュボード

### 推奨メトリクス

| メトリクス | 説明 | 閾値 |
|-----------|------|------|
| `run.googleapis.com/request_count` | リクエスト数（ステータスコード別） | - |
| `run.googleapis.com/request_latencies` | レイテンシ（P50/P95/P99） | P95 < 10s |
| `run.googleapis.com/container/memory/utilizations` | メモリ使用率 | < 80% |
| `run.googleapis.com/container/cpu/utilizations` | CPU使用率 | < 80% |
| `run.googleapis.com/container/instance_count` | インスタンス数 | 0-3 |

### ヘルスチェック

```bash
# ヘルスチェックエンドポイント
curl https://kyugo-ai-2knyenyska-an.a.run.app/health

# レスポンス例
{
  "status": "ok",
  "version": "0.1.0",
  "uptime": 3600,
  "checks": {
    "firestore": "ok"
  }
}
```

## トラブルシューティング

### エラー率が高い場合

1. Cloud Loggingで`severity=ERROR`のログを確認
2. 監査ログで`statusCode >= 500`のリクエストを特定
3. スタックトレースから根本原因を調査

### レイテンシが高い場合

1. Cloud Trace（有効な場合）でスロークエリを特定
2. Vertex AI APIのレイテンシを確認（AI分析系エンドポイント）
3. Firestoreのクエリパフォーマンスを確認

### メモリ使用率が高い場合

1. Cloud Runのメモリ設定を確認（現在512Mi）
2. メモリリークの兆候を確認（uptime増加に伴うメモリ増加）
3. 必要に応じて`--memory=1Gi`に増設
