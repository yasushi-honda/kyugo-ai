# ADR-006: Firestoreトランザクション導入方針

## ステータス
承認済み

## コンテキスト
MVP段階ではread-then-writeパターン（読み取り → 条件チェック → 書き込み）を使用していたが、並行リクエスト時に以下のリスクがある：

1. **updateCaseStatus**: 2つのリクエストが同時に同じケースのステータスを変更すると、一方の遷移検証が古いデータに基づいて行われ、不正な遷移が発生する可能性
2. **updateSupportPlan**: 確定済みチェック後・書き込み前に別リクエストが確定を実行すると、確定済み計画が上書きされる
3. **updateMonitoringSheet**: 同上
4. **admin PATCH /staff/:id**: 最後のadmin数カウント後・降格書き込み前に別リクエストが同時に降格すると、adminが0人になる可能性

## 決定

### トランザクション化する4箇所

全て `firestore.runTransaction()` でラップし、楽観的同時実行制御を適用する。

| 関数 | ファイル | 保護する不変条件 |
|------|---------|----------------|
| `updateCaseStatus` | `case-repository.ts` | ステータス遷移ルールの整合性 |
| `updateSupportPlan` | `support-plan-repository.ts` | 確定済み計画の不変性 |
| `updateMonitoringSheet` | `monitoring-repository.ts` | 確定済みシートの不変性 |
| `PATCH /staff/:id` | `admin-settings.ts` | 最低1人のactiveなadminの維持 |

### トランザクション設計パターン

```typescript
await firestore.runTransaction(async (tx) => {
  const doc = await tx.get(ref);         // トランザクション内で読み取り
  // バリデーション（不変条件チェック）
  tx.update(ref, updateData);            // トランザクション内で書き込み
});
```

### admin PATCH /staff/:id の特殊対応

adminカウントのために全adminドキュメントを取得する必要があるが、Firestoreトランザクションではクエリ結果の各ドキュメントにreadロックがかかる。`limit(2)` で最小限のドキュメントのみ取得し、パフォーマンス影響を抑える。

### トランザクション化しないもの

- `createCase`, `createSupportPlan` 等の作成系: サーバー生成IDのため衝突リスクなし
- 読み取り専用エンドポイント: 整合性リスクなし
- `updateConsultation` (編集): editedAt/editedByの記録のみで、不変条件の保護は不要

## 結果

- 並行リクエストによるデータ不整合が防止される
- Firestoreの楽観的ロックにより、競合時は自動リトライ（最大5回）される
- パフォーマンスへの影響は最小限（トランザクション内の読み取り数は1-2ドキュメント）
