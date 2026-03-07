# ADR-003: データモデル設計

## ステータス: 承認済み

## コンテキスト

福祉相談業務で扱うデータを構造化し、Firestoreに保存する。
茨城県事例の業務フローを参考に設計。

## 決定

### Firestoreコレクション構成

```
/cases/{caseId}                    # ケースファイル（要支援者単位）
  ├── clientName: string           # 氏名
  ├── clientId: string             # 匿名化ID
  ├── dateOfBirth: timestamp       # 生年月日
  ├── householdInfo: map           # 世帯情報
  ├── incomeInfo: map              # 収入情報
  ├── status: string               # active | closed | referred
  ├── assignedStaffId: string      # 担当職員ID
  ├── createdAt: timestamp
  ├── updatedAt: timestamp
  └── /consultations/{consultationId}  # サブコレクション: 相談記録
        ├── staffId: string
        ├── content: string        # 相談内容
        ├── transcript: string     # 文字起こし
        ├── summary: string        # AI生成要約
        ├── suggestedSupports: array  # AI提案の支援メニュー
        ├── consultationType: string  # visit | counter | phone
        ├── createdAt: timestamp
        └── updatedAt: timestamp

/supportMenus/{menuId}             # 支援メニューマスタ
  ├── name: string                 # 制度名
  ├── category: string             # カテゴリ
  ├── eligibility: string          # 対象要件
  ├── description: string          # 概要
  ├── relatedLaws: array           # 関連法令
  └── updatedAt: timestamp

/staff/{staffId}                   # 職員情報
  ├── name: string
  ├── email: string
  ├── role: string                 # admin | staff
  ├── officeId: string             # 所属事務所
  └── createdAt: timestamp
```

### status遷移図（cases）

```
[新規作成] → active → closed
                  ↘ referred → active（差し戻し）
                                  ↘ closed
```

- active: 対応中
- referred: 他機関に紹介済み（戻る可能性あり）
- closed: 対応完了

### インデックス

| コレクション | フィールド | 用途 |
|-------------|-----------|------|
| cases | status, assignedStaffId | 担当者別アクティブケース一覧 |
| cases | status, updatedAt | 最近更新されたケース |
| consultations | createdAt | 相談履歴の時系列表示 |

## 結果

- サブコレクション構造により、ケースと相談記録を自然に関連付け
- statusフィールドで明確な状態遷移を管理（行き止まりなし）
- AI生成データ（summary, suggestedSupports）は相談記録に直接紐付け
