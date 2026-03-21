# デプロイメント手順

## 概要

kyugo-ai は GitHub Actions による CI/CD で自動デプロイされる。`main` ブランチへのマージで自動的に Cloud Run にデプロイされる。

## アーキテクチャ

```
GitHub (main push)
  → GitHub Actions (CI: build + test)
  → GitHub Actions (CD: Docker build → Artifact Registry → Cloud Run)
```

## 自動デプロイ（推奨）

1. feature ブランチで開発・テスト
2. PR を作成し、CI（build-and-test）通過を確認
3. PR をマージ（squash merge）
4. CD が自動実行され、Cloud Run にデプロイ

### CI/CD パイプライン

| ステップ | 内容 | 所要時間 |
|---------|------|---------|
| build-test | npm ci → tsc → vitest（BE+FE） | ~2分 |
| deploy | Docker build → AR push → Cloud Run deploy | ~3分 |

### GitHub Secrets（必要な設定）

| シークレット | 用途 |
|-------------|------|
| `VITE_FIREBASE_API_KEY` | Firebase Authentication |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth ドメイン |
| `VITE_FIREBASE_PROJECT_ID` | Firebase プロジェクトID |

### GCP Secret Manager

| シークレット | 用途 |
|-------------|------|
| `ai-retry-secret` | AI リトライ API 認証 |

## 手動デプロイ（緊急時）

```bash
# 1. gcloud 設定
gcloud config configurations activate kyugo-ai

# 2. Docker ビルド
docker build \
  --build-arg VITE_FIREBASE_API_KEY=<key> \
  --build-arg VITE_FIREBASE_AUTH_DOMAIN=<domain> \
  --build-arg VITE_FIREBASE_PROJECT_ID=kyugo-ai-dev \
  -t asia-northeast1-docker.pkg.dev/kyugo-ai-dev/kyugo-ai-docker/kyugo-ai:manual .

# 3. プッシュ
docker push asia-northeast1-docker.pkg.dev/kyugo-ai-dev/kyugo-ai-docker/kyugo-ai:manual

# 4. デプロイ
gcloud run deploy kyugo-ai \
  --image=asia-northeast1-docker.pkg.dev/kyugo-ai-dev/kyugo-ai-docker/kyugo-ai:manual \
  --region=asia-northeast1 \
  --platform=managed \
  --quiet
```

## ロールバック

```bash
# 直前のリビジョンにロールバック
gcloud run services update-traffic kyugo-ai \
  --region=asia-northeast1 \
  --to-revisions=<PREVIOUS_REVISION>=100

# リビジョン一覧
gcloud run revisions list --service=kyugo-ai --region=asia-northeast1 --limit=5
```

## Cloud Run 設定

| 項目 | 値 |
|------|-----|
| リージョン | asia-northeast1 |
| メモリ | 512Mi |
| 最小インスタンス | 0 |
| 最大インスタンス | 3 |
| ポート | 8080 |
| SA | kyugo-ai-deployer@kyugo-ai-dev.iam.gserviceaccount.com |

## デプロイ後の確認

```bash
# ヘルスチェック
curl https://kyugo-ai-2knyenyska-an.a.run.app/health

# ログ確認
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=kyugo-ai" \
  --project=kyugo-ai-dev --limit=20 --format=json
```
