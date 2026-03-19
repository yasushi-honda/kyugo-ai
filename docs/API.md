# Kyugo AI API ドキュメント

福祉相談業務AI支援システムのAPIリファレンスです。

---

## 認証

`/health` および `/api/admin/*` を除く全エンドポイントは、Firebase IDトークンによる認証が必要です。

```
Authorization: Bearer <Firebase ID Token>
```

---

## レート制限

| 対象 | 制限 |
|------|------|
| `/api/*` 全体 | 100リクエスト/分 |
| AI系エンドポイント（支援計画書・モニタリング・法令検索） | 10リクエスト/分 |

制限超過時は `429 Too Many Requests` が返ります。

---

## エラーレスポンス共通形式

```json
{"error": "エラーメッセージ"}
```

---

## HTTPステータスコード

| コード | 説明 |
|--------|------|
| 200 | 成功 |
| 201 | 作成成功 |
| 400 | リクエスト不正 |
| 401 | 認証エラー（トークン無効/期限切れ）|
| 403 | 権限なし |
| 404 | リソースが見つからない |
| 429 | レート制限超過 |
| 500 | サーバーエラー |

---

## エンドポイント一覧

### ヘルスチェック

#### GET /health

システムの稼働状態を確認します。認証不要。

**レスポンス例（正常時）**

```json
{"status": "ok"}
```

**レスポンス例（Firestore接続異常時）**

```json
{"status": "degraded", "error": "Firestore unreachable"}
```

---

### ユーザー情報

#### GET /api/me

ログイン中のユーザー情報を取得します。

**レスポンス例**

```json
{
  "uid": "abc123",
  "email": "staff@example.com",
  "name": "田中 一郎",
  "role": "staff",
  "staffId": "staff_abc123"
}
```

`role` は `"admin"` または `"staff"` のいずれかです。

---

### ケース管理

#### POST /api/cases

新規ケースを作成します。

**リクエストボディ**

```json
{
  "clientName": "山田太郎",
  "clientId": "C-00123",
  "dateOfBirth": "1990-01-01"
}
```

**レスポンス例（201）**

```json
{
  "id": "case_xyz789",
  "clientName": "山田太郎",
  "clientId": "C-00123",
  "dateOfBirth": "1990-01-01",
  "status": "active",
  "createdAt": "2026-03-20T09:00:00.000Z",
  "updatedAt": "2026-03-20T09:00:00.000Z"
}
```

---

#### GET /api/cases

ケース一覧を取得します。

**レスポンス例（200）**

```json
[
  {
    "id": "case_xyz789",
    "clientName": "山田太郎",
    "clientId": "C-00123",
    "status": "active",
    "createdAt": "2026-03-20T09:00:00.000Z",
    "updatedAt": "2026-03-20T09:00:00.000Z"
  }
]
```

---

#### GET /api/cases/:id

ケース詳細を取得します。

**レスポンス例（200）**

```json
{
  "id": "case_xyz789",
  "clientName": "山田太郎",
  "clientId": "C-00123",
  "dateOfBirth": "1990-01-01",
  "status": "active",
  "createdAt": "2026-03-20T09:00:00.000Z",
  "updatedAt": "2026-03-20T09:00:00.000Z"
}
```

**エラー**
- `404`: 指定IDのケースが存在しない

---

#### PATCH /api/cases/:id/status

ケースのステータスを変更します。

**リクエストボディ**

```json
{"status": "closed"}
```

`status` は `"active"` または `"closed"` のいずれかです。

**レスポンス例（200）**

```json
{
  "id": "case_xyz789",
  "status": "closed",
  "updatedAt": "2026-03-20T10:00:00.000Z"
}
```

---

### 相談記録

#### POST /api/cases/:id/consultations

テキスト形式の相談記録を作成します。作成後、AIによる要約・支援メニュー提案が非同期で実行されます。

**リクエストボディ**

```json
{
  "content": "本日、生活費の不足について相談を受けた。家賃の支払いが困難な状況とのこと。",
  "consultationType": "counter"
}
```

`consultationType` の例: `"counter"`（窓口）、`"phone"`（電話）、`"visit"`（訪問）

**レスポンス例（201）**

```json
{
  "id": "consult_001",
  "caseId": "case_xyz789",
  "content": "本日、生活費の不足について相談を受けた。家賃の支払いが困難な状況とのこと。",
  "consultationType": "counter",
  "status": "pending",
  "createdAt": "2026-03-20T09:30:00.000Z"
}
```

`status` は `"pending"` → `"completed"` または `"failed"` に遷移します。

---

#### POST /api/cases/:id/consultations/audio

音声ファイル形式の相談記録を作成します。作成後、AIによる文字起こし・要約・支援メニュー提案が非同期で実行されます。

**リクエスト形式**

`multipart/form-data`

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `audio` | File | 必須 | 音声ファイル（WAV/MP3等） |
| `consultationType` | string | 必須 | 相談種別 |
| `context` | string | 任意 | 追加コンテキスト情報 |

**レスポンス例（201）**

```json
{
  "id": "consult_002",
  "caseId": "case_xyz789",
  "consultationType": "visit",
  "status": "pending",
  "createdAt": "2026-03-20T09:45:00.000Z"
}
```

---

#### GET /api/cases/:id/consultations

ケースに紐づく相談記録一覧を取得します。

**レスポンス例（200）**

```json
[
  {
    "id": "consult_001",
    "caseId": "case_xyz789",
    "content": "本日、生活費の不足について相談を受けた。",
    "consultationType": "counter",
    "status": "completed",
    "summary": "生活費不足・家賃支払困難。生活保護申請を検討。",
    "suggestedMenus": ["生活保護", "緊急小口資金"],
    "createdAt": "2026-03-20T09:30:00.000Z"
  }
]
```

---

#### GET /api/cases/:id/consultations/:consultationId

相談記録の詳細を取得します。

**レスポンス例（200）**

```json
{
  "id": "consult_001",
  "caseId": "case_xyz789",
  "content": "本日、生活費の不足について相談を受けた。家賃の支払いが困難な状況とのこと。",
  "consultationType": "counter",
  "status": "completed",
  "summary": "生活費不足・家賃支払困難。生活保護申請を検討。",
  "suggestedMenus": ["生活保護", "緊急小口資金"],
  "createdAt": "2026-03-20T09:30:00.000Z",
  "updatedAt": "2026-03-20T09:31:00.000Z"
}
```

---

### 支援計画書

#### POST /api/cases/:id/support-plan/draft

AIを使って支援計画書の下書きを生成します。

> **レート制限**: 10リクエスト/分

**レスポンス例（201）**

```json
{
  "id": "plan_001",
  "caseId": "case_xyz789",
  "overallPolicy": "生活保護申請を支援しつつ、就労意欲を維持する。",
  "goals": [
    {"goal": "生活保護受給開始", "targetDate": "2026-04-30"},
    {"goal": "就労準備支援プログラム参加", "targetDate": "2026-06-30"}
  ],
  "status": "draft",
  "createdAt": "2026-03-20T10:00:00.000Z"
}
```

---

#### GET /api/cases/:id/support-plan

最新の支援計画書を取得します。

**レスポンス例（200）**

```json
{
  "id": "plan_001",
  "caseId": "case_xyz789",
  "overallPolicy": "生活保護申請を支援しつつ、就労意欲を維持する。",
  "goals": [
    {"goal": "生活保護受給開始", "targetDate": "2026-04-30"}
  ],
  "status": "confirmed",
  "createdAt": "2026-03-20T10:00:00.000Z",
  "updatedAt": "2026-03-20T11:00:00.000Z"
}
```

**エラー**
- `404`: 支援計画書が存在しない

---

#### GET /api/cases/:id/support-plan/list

支援計画書の履歴一覧を取得します。

**レスポンス例（200）**

```json
[
  {
    "id": "plan_001",
    "caseId": "case_xyz789",
    "status": "confirmed",
    "createdAt": "2026-03-20T10:00:00.000Z"
  }
]
```

---

#### PATCH /api/cases/:id/support-plan/:planId

支援計画書を編集または確定します。

**リクエストボディ例**

```json
{
  "overallPolicy": "生活保護申請を支援しつつ、就労意欲を維持する。",
  "goals": [
    {"goal": "生活保護受給開始", "targetDate": "2026-04-30"},
    {"goal": "就労準備支援プログラム参加", "targetDate": "2026-06-30"}
  ],
  "status": "confirmed"
}
```

`status` は `"draft"` または `"confirmed"` のいずれかです。

**レスポンス例（200）**

```json
{
  "id": "plan_001",
  "caseId": "case_xyz789",
  "status": "confirmed",
  "updatedAt": "2026-03-20T11:00:00.000Z"
}
```

---

### モニタリングシート

#### POST /api/cases/:id/monitoring/draft

AIを使ってモニタリングシートの下書きを生成します。確定済み支援計画書が存在する必要があります。

> **レート制限**: 10リクエスト/分

**レスポンス例（201）**

```json
{
  "id": "monitor_001",
  "caseId": "case_xyz789",
  "evaluationDate": "2026-04-20",
  "items": [
    {"goal": "生活保護受給開始", "progress": "申請手続き中", "evaluation": "順調"}
  ],
  "status": "draft",
  "createdAt": "2026-04-20T09:00:00.000Z"
}
```

**エラー**
- `400`: 確定済み支援計画書が存在しない

---

#### GET /api/cases/:id/monitoring

最新のモニタリングシートを取得します。

**レスポンス例（200）**

```json
{
  "id": "monitor_001",
  "caseId": "case_xyz789",
  "evaluationDate": "2026-04-20",
  "items": [
    {"goal": "生活保護受給開始", "progress": "申請手続き中", "evaluation": "順調"}
  ],
  "status": "confirmed",
  "createdAt": "2026-04-20T09:00:00.000Z",
  "updatedAt": "2026-04-20T10:00:00.000Z"
}
```

**エラー**
- `404`: モニタリングシートが存在しない

---

#### GET /api/cases/:id/monitoring/list

モニタリングシートの履歴一覧を取得します。

**レスポンス例（200）**

```json
[
  {
    "id": "monitor_001",
    "caseId": "case_xyz789",
    "evaluationDate": "2026-04-20",
    "status": "confirmed",
    "createdAt": "2026-04-20T09:00:00.000Z"
  }
]
```

---

#### PATCH /api/cases/:id/monitoring/:sheetId

モニタリングシートを編集または確定します。

**リクエストボディ例**

```json
{
  "items": [
    {"goal": "生活保護受給開始", "progress": "受給開始", "evaluation": "目標達成"}
  ],
  "status": "confirmed"
}
```

**レスポンス例（200）**

```json
{
  "id": "monitor_001",
  "caseId": "case_xyz789",
  "status": "confirmed",
  "updatedAt": "2026-04-20T10:00:00.000Z"
}
```

---

### 法令・制度検索

#### POST /api/cases/:id/legal-search

法令・制度に関するRAG検索を実行します。

> **レート制限**: 10リクエスト/分

**リクエストボディ**

```json
{"query": "生活保護の申請条件"}
```

**レスポンス例（201）**

```json
{
  "id": "legal_001",
  "caseId": "case_xyz789",
  "query": "生活保護の申請条件",
  "results": [
    {
      "title": "生活保護法 第7条",
      "summary": "保護は、要保護者、その扶養義務者又はその他の同居の親族の申請に基いて開始するものとする。",
      "sourceUrl": "https://..."
    }
  ],
  "createdAt": "2026-03-20T10:00:00.000Z"
}
```

---

#### GET /api/cases/:id/legal-search

法令検索の履歴一覧を取得します。

**レスポンス例（200）**

```json
[
  {
    "id": "legal_001",
    "caseId": "case_xyz789",
    "query": "生活保護の申請条件",
    "createdAt": "2026-03-20T10:00:00.000Z"
  }
]
```

---

### 職員・支援メニュー

#### GET /api/staff

職員一覧（ID・名前）を取得します。

**レスポンス例（200）**

```json
[
  {"id": "staff_001", "name": "田中 一郎"},
  {"id": "staff_002", "name": "鈴木 花子"}
]
```

---

#### GET /api/support-menus

支援メニューの一覧を取得します。

**レスポンス例（200）**

```json
[
  {
    "id": "menu_001",
    "name": "生活保護",
    "category": "経済的支援",
    "description": "最低生活費に満たない場合に給付する制度。"
  }
]
```

---

#### GET /api/support-menus/:id

支援メニューの詳細を取得します。

**レスポンス例（200）**

```json
{
  "id": "menu_001",
  "name": "生活保護",
  "category": "経済的支援",
  "description": "最低生活費に満たない場合に給付する制度。",
  "eligibility": "収入が最低生活費を下回る世帯",
  "applicationMethod": "居住地の福祉事務所に申請",
  "relatedLaws": ["生活保護法"]
}
```

**エラー**
- `404`: 指定IDの支援メニューが存在しない

---

### 管理者向けエンドポイント

#### POST /api/admin/retry-ai

AIによる非同期処理が失敗した相談記録を再実行します。`Authorization` ヘッダーは不要ですが、専用シークレットが必要です。

**ヘッダー**

```
X-Retry-Secret: <secret>
```

**レスポンス例（200）**

```json
{"retried": 3, "message": "3件のAI処理を再実行しました。"}
```

**エラー**
- `401`: シークレットが無効

---

#### GET /api/admin-settings/staff

職員一覧を全フィールド付きで取得します（管理用）。`admin` ロールのみ利用可能。

**レスポンス例（200）**

```json
[
  {
    "id": "staff_001",
    "name": "田中 一郎",
    "email": "tanaka@example.com",
    "role": "staff",
    "disabled": false,
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
]
```

---

#### PATCH /api/admin-settings/staff/:id

職員のロール変更または無効化を行います。`admin` ロールのみ利用可能。

**リクエストボディ例（ロール変更）**

```json
{"role": "admin"}
```

**リクエストボディ例（無効化）**

```json
{"disabled": true}
```

**レスポンス例（200）**

```json
{
  "id": "staff_001",
  "role": "admin",
  "disabled": false,
  "updatedAt": "2026-03-20T12:00:00.000Z"
}
```

---

#### GET /api/admin-settings/allowed-emails

ログイン許可メール・ドメインの設定を取得します。`admin` ロールのみ利用可能。

**レスポンス例（200）**

```json
{
  "emails": ["user@example.com"],
  "domains": ["example.com"]
}
```

---

#### PUT /api/admin-settings/allowed-emails

ログイン許可メール・ドメインの設定を更新します。`admin` ロールのみ利用可能。

**リクエストボディ**

```json
{
  "emails": ["user@example.com"],
  "domains": ["example.com"]
}
```

**レスポンス例（200）**

```json
{
  "emails": ["user@example.com"],
  "domains": ["example.com"],
  "updatedAt": "2026-03-20T12:00:00.000Z"
}
```
