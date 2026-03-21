# Firestoreバックアップ運用手順

## 概要

Firestore Native Modeの自動バックアップを日次で実行し、7日間保持する。

## 設定

| 項目 | 値 |
|------|-----|
| データベース | `(default)` |
| リージョン | `asia-northeast1` |
| 頻度 | 日次（daily） |
| 保持期間 | 7日間 |
| プロジェクト | `kyugo-ai-dev` |

## バックアップの確認

```bash
# スケジュール確認
gcloud firestore backups schedules list \
  --database='(default)' \
  --project=kyugo-ai-dev

# バックアップ一覧確認
gcloud firestore backups list \
  --project=kyugo-ai-dev
```

## リストア手順

### 1. バックアップの確認

```bash
gcloud firestore backups list --project=kyugo-ai-dev
```

出力例:
```
NAME                                                                          STATE  DATABASE
projects/kyugo-ai-dev/locations/asia-northeast1/backups/2026-03-21T00:00:00Z  READY  (default)
```

### 2. 新しいデータベースへのリストア

Firestoreのリストアは既存データベースへの上書きではなく、新しいデータベースとして復元される。

```bash
gcloud firestore databases restore \
  --source-backup=projects/kyugo-ai-dev/locations/asia-northeast1/backups/<BACKUP_NAME> \
  --destination-database=restored-db \
  --project=kyugo-ai-dev
```

### 3. データ検証

リストアされたデータベースの内容を確認し、問題なければアプリケーションの接続先を切り替える。

### 4. 接続先切り替え

Cloud Runの環境変数`FIRESTORE_DATABASE_ID`を`restored-db`に変更するか、データを元のデータベースにコピーする。

## スケジュールの変更

```bash
# スケジュール削除
gcloud firestore backups schedules delete <SCHEDULE_ID> \
  --database='(default)' \
  --project=kyugo-ai-dev

# 新スケジュール作成（例: 14日保持）
gcloud firestore backups schedules create \
  --database='(default)' \
  --recurrence=daily \
  --retention=14d \
  --project=kyugo-ai-dev
```

## 注意事項

- バックアップはFirestoreのマネージド機能で自動実行される（Cloud Schedulerは不要）
- バックアップの保存先リージョンはデータベースと同じ`asia-northeast1`
- リストアは**新しいデータベースへの復元のみ**対応（既存DBへの上書きは不可）
- バックアップ保持期間を超えたバックアップは自動削除される
