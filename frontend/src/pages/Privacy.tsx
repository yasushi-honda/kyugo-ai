import { useNavigate, Link } from "react-router-dom";

const CURRENT_YEAR = new Date().getFullYear();

export function Privacy() {
  const navigate = useNavigate();

  return (
    <div className="about-page">
      <nav className="about-nav">
        <div className="about-nav-inner">
          <div className="about-nav-brand" style={{ cursor: "pointer" }} onClick={() => navigate("/about")}>
            <div className="about-nav-brand-icon">救</div>
            <span>救護AI</span>
          </div>
          <button className="btn btn-primary about-nav-login" onClick={() => navigate("/login")}>
            ログイン
          </button>
        </div>
      </nav>

      <section className="about-section" style={{ paddingTop: "6rem" }}>
        <div className="about-section-inner legal-content">
          <h1>プライバシーポリシー</h1>
          <p className="legal-updated">最終更新日: {CURRENT_YEAR}年3月21日</p>

          <h2>1. 基本方針</h2>
          <p>
            救護AI（以下「本システム」）は、福祉相談業務において取り扱う個人情報の重要性を認識し、
            個人情報の保護に関する法律（個人情報保護法）および関連法令を遵守して、
            個人情報の適切な取り扱いと保護に努めます。
          </p>

          <h2>2. 収集する情報</h2>
          <p>本システムでは、以下の情報を収集・保存します。</p>

          <h3>2.1 利用者（職員）の情報</h3>
          <ul>
            <li>氏名、メールアドレス</li>
            <li>ログイン日時、操作ログ</li>
          </ul>

          <h3>2.2 相談者の情報</h3>
          <ul>
            <li>氏名、年齢、性別</li>
            <li>住所（市区町村まで）</li>
            <li>家族構成、世帯収入</li>
            <li>相談内容（テキストまたは音声データから変換したテキスト）</li>
            <li>健康状態、障害の有無</li>
            <li>支援履歴、利用中の公的制度</li>
          </ul>

          <h2>3. 利用目的</h2>
          <p>収集した個人情報は、以下の目的にのみ利用します。</p>
          <ol>
            <li>福祉相談の記録・管理</li>
            <li>AI による相談内容の要約・分析・支援メニュー提案</li>
            <li>支援計画書・モニタリングシートの作成支援</li>
            <li>法令・制度の検索支援</li>
            <li>システムの運用・保守・改善</li>
          </ol>

          <h2>4. データの保管場所と安全管理</h2>
          <h3>4.1 保管場所</h3>
          <p>
            すべてのデータは、Google Cloud Platform の東京リージョン（asia-northeast1）に保管されます。
            日本国外のサーバーにデータが転送されることはありません。
          </p>

          <h3>4.2 技術的安全管理措置</h3>
          <ul>
            <li>通信の暗号化（TLS 1.3）</li>
            <li>保存データの暗号化（Google 管理の暗号化キー）</li>
            <li>ロールベースアクセス制御（RBAC）</li>
            <li>ケースごとの所有権チェック</li>
            <li>操作ログの自動記録</li>
          </ul>

          <h3>4.3 組織的安全管理措置</h3>
          <ul>
            <li>アクセス権限の定期見直し</li>
            <li>管理者による職員アカウントの管理</li>
            <li>退職者のアカウント速やかな無効化</li>
          </ul>

          <h2>5. AI処理に関する方針</h2>
          <ol>
            <li>
              本システムで使用する Google Vertex AI（Gemini）は、
              入力されたデータをAIモデルの学習（トレーニング）に使用しません。
            </li>
            <li>
              AI処理はGoogle Cloud 内の閉じた環境で実行され、
              外部サービスにデータが送信されることはありません。
            </li>
            <li>
              AI分析結果は参考情報であり、最終的な判断は担当職員が行います。
            </li>
          </ol>

          <h2>6. 第三者提供</h2>
          <p>
            本システムで収集した個人情報は、以下の場合を除き第三者に提供しません。
          </p>
          <ol>
            <li>本人の同意がある場合</li>
            <li>法令に基づく場合</li>
            <li>人の生命・身体・財産の保護に必要な場合</li>
          </ol>

          <h2>7. 個人情報の開示・訂正・削除</h2>
          <p>
            相談者本人から個人情報の開示・訂正・削除の請求があった場合、
            個人情報保護法に基づき、合理的な期間内に対応します。
            請求は、担当窓口の職員を通じて行ってください。
          </p>

          <h2>8. データの保持期間</h2>
          <p>
            ケースデータは、ケースのクローズ後、自治体の文書管理規程に定める期間保持した後、
            適切な方法で削除します。
            操作ログは、保持期間経過後に自動的に削除されます。
          </p>

          <h2>9. ポリシーの変更</h2>
          <p>
            本ポリシーは、法令の改正やシステムの変更に伴い更新する場合があります。
            重要な変更がある場合は、本ページおよびシステム内で通知します。
          </p>

          <h2>10. お問い合わせ</h2>
          <p>
            個人情報の取り扱いに関するお問い合わせは、所属自治体のシステム管理者までご連絡ください。
          </p>
        </div>
      </section>

      <footer className="about-footer">
        <div className="legal-footer-links">
          <Link to="/about">救護AIについて</Link>
          <Link to="/terms">利用規約</Link>
          <Link to="/privacy">プライバシーポリシー</Link>
        </div>
        <p>&copy; {CURRENT_YEAR} 救護AI — 福祉相談業務AI支援システム</p>
      </footer>
    </div>
  );
}
