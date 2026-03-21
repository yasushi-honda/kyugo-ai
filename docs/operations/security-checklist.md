# セキュリティ最終監査チェックリスト

## 実施日: 2026-03-21

## 1. エンドポイント認証チェック

| エンドポイント | 認証 | 認可 | 状態 |
|-------------|------|------|------|
| `GET /health` | なし（公開） | - | ✅ 意図的に公開 |
| `GET /api/me` | requireAuth | - | ✅ |
| `POST /api/cases` | requireAuth | - | ✅ |
| `GET /api/cases` | requireAuth | RBAC（admin: 全件 / staff: 自分のみ） | ✅ |
| `GET /api/cases/export/csv` | requireAuth | RBAC（同上） | ✅ |
| `GET /api/cases/:id` | requireAuth | requireCaseAccess | ✅ |
| `PATCH /api/cases/:id/status` | requireAuth | requireCaseAccess | ✅ |
| `POST /api/cases/:id/consultations` | requireAuth | requireCaseAccess | ✅ |
| `POST /api/cases/:id/consultations/audio` | requireAuth | requireCaseAccess + aiLimiter | ✅ |
| `GET /api/cases/:id/consultations` | requireAuth | requireCaseAccess | ✅ |
| `GET /api/cases/:id/consultations/export/csv` | requireAuth | requireCaseAccess | ✅ |
| `GET /api/cases/:id/consultations/:cid` | requireAuth | requireCaseAccess | ✅ |
| `PATCH /api/cases/:id/consultations/:cid` | requireAuth | requireCaseAccess + 所有者/admin | ✅ |
| `DELETE /api/cases/:id/consultations/:cid` | requireAuth | requireCaseAccess + 所有者/admin | ✅ |
| `POST /api/cases/:id/support-plan` | requireAuth | requireCaseAccess | ✅ |
| `GET /api/cases/:id/support-plan` | requireAuth | requireCaseAccess | ✅ |
| `PATCH /api/cases/:id/support-plan/:pid` | requireAuth | requireCaseAccess | ✅ |
| `POST /api/cases/:id/monitoring` | requireAuth | requireCaseAccess | ✅ |
| `GET /api/cases/:id/monitoring` | requireAuth | requireCaseAccess | ✅ |
| `PATCH /api/cases/:id/monitoring/:mid` | requireAuth | requireCaseAccess | ✅ |
| `POST /api/cases/:id/legal-search` | requireAuth | requireCaseAccess + aiLimiter | ✅ |
| `GET /api/staff` | requireAuth | - | ✅ |
| `GET /api/support-menus` | requireAuth | - | ✅ |
| `POST /api/admin/retry-ai` | requireAdminSecret | X-Retry-Secret | ✅ |
| `GET /api/admin-settings/staff` | requireAuth | requireAdmin | ✅ |
| `PATCH /api/admin-settings/staff/:id` | requireAuth | requireAdmin | ✅ |
| `GET /api/admin-settings/allowed-emails` | requireAuth | requireAdmin | ✅ |
| `PUT /api/admin-settings/allowed-emails` | requireAuth | requireAdmin | ✅ |
| `GET /about` | なし（公開） | - | ✅ 意図的に公開 |
| `GET /terms` | なし（公開） | - | ✅ 意図的に公開 |
| `GET /privacy` | なし（公開） | - | ✅ 意図的に公開 |
| `GET /login` | なし（公開） | - | ✅ 意図的に公開 |
| `GET /*` (SPA) | クライアント側AuthGuard | - | ✅ |

## 2. npm audit 結果

### バックエンド
- **High**: 3件 → `npm audit fix`で3→0に改善（tar依存 → 更新済み）
- **残存**: 10件 Low（upstream依存: google-gax, firebase-tools）
- **判定**: Low のみ残存、直接的な攻撃面なし → **許容**

### フロントエンド
- **修正後**: 0件 → **クリーン**

## 3. セキュリティヘッダー

| ヘッダー | 設定 | 状態 |
|---------|------|------|
| Content-Security-Policy | 設定済み（self + Google APIs） | ✅ |
| X-Content-Type-Options | helmet デフォルト (nosniff) | ✅ |
| X-Frame-Options | helmet デフォルト (SAMEORIGIN) | ✅ |
| Strict-Transport-Security | Cloud Run 自動 | ✅ |
| Cross-Origin-Opener-Policy | unsafe-none（Firebase Auth popup対応） | ✅ |

## 4. データ保護

| 項目 | 状態 |
|------|------|
| 通信暗号化（TLS） | ✅ Cloud Run 自動 |
| 保存時暗号化 | ✅ Firestore デフォルト |
| 日本リージョン限定 | ✅ asia-northeast1 |
| AI学習データ不使用 | ✅ Vertex AI 契約条件 |
| 監査ログ | ✅ audit-log.ts（個人情報非出力） |
| バックアップ | ✅ 日次/7日保持 |
| Secret Manager | ✅ AI_RETRY_SECRET 移行済み |

## 5. Firestore セキュリティルール

```
// 確認済み: ルールファイルの存在と基本構造
// - 認証必須
// - ケースは担当職員 + admin のみアクセス可
// - staff コレクションは認証済みユーザーのみ読み取り可
```

## 6. レート制限

| 対象 | 制限 | 状態 |
|------|------|------|
| 一般API | 100 req/min | ✅ |
| AI分析API | 10 req/min | ✅ |
| /health | 制限なし | ✅ 意図的 |

## 結論

**全エンドポイントで認証・認可が適切に設定されている。** 重大なセキュリティ問題は検出されなかった。
