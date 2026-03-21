import { useNavigate, Link } from "react-router-dom";

const CURRENT_YEAR = new Date().getFullYear();

export function Terms() {
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
          <h1>利用規約</h1>
          <p className="legal-updated">最終更新日: {CURRENT_YEAR}年3月21日</p>

          <h2>第1条（適用）</h2>
          <p>
            本利用規約（以下「本規約」）は、救護AI（以下「本システム」）の利用に関する条件を定めるものです。
            本システムを利用するすべての職員（以下「利用者」）は、本規約に同意したものとみなします。
          </p>

          <h2>第2条（利用資格）</h2>
          <p>
            本システムは、管理者によりアクセスが許可された自治体職員のみが利用できます。
            利用者は、管理者から付与されたアカウントを用いてログインするものとします。
          </p>

          <h2>第3条（利用目的）</h2>
          <p>
            本システムは、福祉相談業務の支援を目的として提供されます。
            利用者は、業務目的以外での利用を行わないものとします。
          </p>

          <h2>第4条（個人情報の取り扱い）</h2>
          <p>
            本システムにおける個人情報の取り扱いについては、
            <Link to="/privacy">プライバシーポリシー</Link>に定めるところによります。
          </p>

          <h2>第5条（AI分析結果の取り扱い）</h2>
          <ol>
            <li>本システムのAI分析結果は、職員の判断を支援するための参考情報です。</li>
            <li>最終的な支援方針の決定は、必ず担当職員が行うものとします。</li>
            <li>AI分析結果のみに基づいた意思決定は禁止します。</li>
          </ol>

          <h2>第6条（禁止事項）</h2>
          <p>利用者は、以下の行為を行ってはなりません。</p>
          <ol>
            <li>業務目的以外での個人情報の閲覧・取得・利用</li>
            <li>アカウントの共有または第三者への貸与</li>
            <li>システムへの不正アクセスまたは不正アクセスの試み</li>
            <li>システムの改変、リバースエンジニアリング</li>
            <li>本システムから取得したデータの外部への持ち出し（業務上必要な場合を除く）</li>
          </ol>

          <h2>第7条（利用停止）</h2>
          <p>
            管理者は、利用者が本規約に違反した場合、事前の通知なくアカウントを停止できるものとします。
          </p>

          <h2>第8条（免責事項）</h2>
          <ol>
            <li>
              本システムの提供者は、AI分析結果の正確性・完全性を保証するものではありません。
            </li>
            <li>
              システムの一時的な停止、データの遅延、通信障害等により生じた損害について、
              提供者は責任を負わないものとします。
            </li>
            <li>
              天災、法令の改正、その他やむを得ない事由により、
              本システムの提供を中止・終了する場合があります。
            </li>
          </ol>

          <h2>第9条（規約の変更）</h2>
          <p>
            本規約は、利用者への事前通知により変更できるものとします。
            変更後の規約は、本ページへの掲載をもって効力を生じます。
          </p>

          <h2>第10条（準拠法・管轄）</h2>
          <p>
            本規約は日本法に準拠し、本規約に関する紛争については、
            水戸地方裁判所を第一審の専属的合意管轄裁判所とします。
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
