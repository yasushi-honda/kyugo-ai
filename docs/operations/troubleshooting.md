# トラブルシューティング

## よくある問題と対処法

### 1. ログイン不可

**症状**: ログインボタンを押しても画面が進まない

| 確認項目 | コマンド/手順 |
|---------|-------------|
| Firebase Auth の状態 | Google Cloud Console → Firebase → Authentication |
| 許可メール設定 | システム設定画面 → アクセス設定で確認 |
| ブラウザコンソール | F12 → Console タブでエラー確認 |

**対処**:
1. ユーザーのメールアドレスが許可リストに含まれているか確認
2. Firebase Authentication でユーザーが有効か確認
3. ブラウザのキャッシュ/Cookie をクリアして再試行

### 2. AI分析が完了しない

**症状**: 相談記録のAI分析が「分析中」のまま進まない

**確認手順**:
```bash
# Cloud Logging で AI 関連ログを確認
gcloud logging read 'resource.type="cloud_run_revision" AND jsonPayload.message=~"AI"' \
  --project=kyugo-ai-dev --limit=20 --format=json

# Vertex AI API の状態確認
gcloud services list --enabled --filter="name:aiplatform" --project=kyugo-ai-dev
```

**対処**:
1. Vertex AI API のクォータ制限に達していないか確認
2. `aiStatus` が `retry_pending` の場合は自動リトライを待つ（最大3回）
3. `aiStatus` が `error` の場合はログでエラー詳細を確認
4. 管理者APIでリトライ実行: `POST /api/admin/retry-ai`

### 3. ページが表示されない（503エラー）

**確認手順**:
```bash
# Cloud Run の状態確認
gcloud run services describe kyugo-ai --region=asia-northeast1 --project=kyugo-ai-dev

# ヘルスチェック
curl -s https://kyugo-ai-2knyenyska-an.a.run.app/health | python3 -m json.tool
```

**対処**:
1. ヘルスチェックで `firestore: "unreachable"` → Firestore の障害を確認
2. Cloud Run のインスタンスが起動していない → 手動でリクエストを送信してコールドスタート
3. メモリ不足 → `--memory=1Gi` に増設

### 4. CSVエクスポートが空

**確認項目**:
- 表示中のケース/相談データが存在するか
- ブラウザのダウンロード設定がブロックしていないか

### 5. デプロイ失敗

**確認手順**:
```bash
# GitHub Actions のログ
gh run list --limit=5
gh run view <RUN_ID> --log-failed

# Docker ビルドログ
gcloud builds list --project=kyugo-ai-dev --limit=5
```

**よくある原因**:
- TypeScript ビルドエラー → ローカルで `npm run build` を確認
- テスト失敗 → ローカルで `npm test` を確認
- Docker ビルド失敗 → Dockerfile の Node.js バージョン確認
- 権限不足 → デプロイ SA の IAM ロールを確認

### 6. レート制限エラー（429）

**症状**: API呼び出しで `429 Too Many Requests`

**設定値**:
| エンドポイント | 制限 |
|-------------|------|
| 一般API | 100リクエスト/分 |
| AI分析 | 10リクエスト/分 |

**対処**: しばらく待ってから再試行。頻発する場合は `src/middleware/rate-limit.ts` の設定値を調整。

## ログの確認方法

```bash
# エラーログのみ
gcloud logging read 'resource.type="cloud_run_revision" AND severity=ERROR' \
  --project=kyugo-ai-dev --limit=20

# 監査ログ（特定職員の操作）
gcloud logging read 'resource.type="cloud_run_revision" AND jsonPayload.audit.staffId="<STAFF_ID>"' \
  --project=kyugo-ai-dev --limit=20

# 特定時間帯のログ
gcloud logging read 'resource.type="cloud_run_revision" AND timestamp>="2026-03-21T00:00:00Z"' \
  --project=kyugo-ai-dev --limit=50
```
