import { useNavigate } from "react-router-dom";

interface ContentItem {
  icon?: string;
  title: string;
  description: string;
}

const CURRENT_YEAR = new Date().getFullYear();

const FEATURES: ContentItem[] = [
  {
    icon: "📝",
    title: "相談記録のデジタル化",
    description:
      "窓口・訪問・電話・オンラインでの相談内容をテキストまたは音声ファイルで記録。手書きメモの転記作業を削減し、記録漏れを防ぎます。",
  },
  {
    icon: "🤖",
    title: "AIによる自動分析・要約",
    description:
      "記録された相談内容をAIが自動で分析し、200文字以内の要約を生成。長文の相談記録を素早く把握でき、引き継ぎ業務が効率化されます。",
  },
  {
    icon: "🎯",
    title: "支援メニューの自動提案",
    description:
      "相談内容に基づき、活用可能な公的制度や支援メニューをAIが関連度スコア付きで提案。制度の見落としを防ぎ、適切な支援につなげます。",
  },
  {
    icon: "🎙️",
    title: "音声からの自動文字起こし",
    description:
      "タブレットやスマートフォン、PCのマイクから直接録音、または録音ファイルのアップロードで、AIが自動で文字起こし。テキスト入力の手間を省き、相談者との対話に集中できます。",
  },
];

const SECURITY_POINTS: ContentItem[] = [
  {
    icon: "🇯🇵",
    title: "データは日本国内のみで保管",
    description:
      "すべてのデータはGoogle Cloudの東京リージョン（asia-northeast1）に保管されます。海外のサーバーにデータが転送されることはありません。",
  },
  {
    icon: "🔒",
    title: "通信・保存データの暗号化",
    description:
      "通信はTLS 1.3で暗号化され、保存データもGoogle管理の暗号化キーで保護されます。第三者がデータを閲覧することはできません。",
  },
  {
    icon: "👤",
    title: "厳格なアクセス制御",
    description:
      "職員は自分の担当ケースのみ閲覧可能です。ロールベースの認可と、ケースごとの所有権チェックの二重構造で不正アクセスを防止します。",
  },
  {
    icon: "🚫",
    title: "AIの学習にデータは使われません",
    description:
      "本システムで使用するGoogle Vertex AIは、入力されたデータをAIモデルの学習（トレーニング）に使用しません。相談内容がAIの改善に利用されることはありません。",
  },
  {
    icon: "📋",
    title: "監査ログの記録",
    description:
      "誰がいつどのデータにアクセスしたかを自動記録。不正なアクセスがあった場合に追跡が可能です。",
  },
];

interface Screenshot extends ContentItem {
  src: string;
  alt: string;
}

const SCREENSHOTS: Screenshot[] = [
  {
    src: "/help/dashboard.png",
    alt: "ダッシュボード画面",
    title: "ダッシュボード",
    description: "担当ケースの一覧とステータス統計をひと目で把握。直感的な操作で業務を開始できます。",
  },
  {
    src: "/help/ai-analysis.png",
    alt: "AI分析結果画面",
    title: "AI分析・支援メニュー提案",
    description: "相談内容をAIが自動要約し、関連度スコア付きで活用可能な公的制度を提案します。",
  },
  {
    src: "/help/audio-recording.png",
    alt: "ブラウザ直接録音画面",
    title: "音声からの記録",
    description: "ブラウザのマイクから直接録音、またはファイルをアップロードするだけで、AIが自動で文字起こし・分析まで実行します。",
  },
];

const AI_POINTS: ContentItem[] = [
  {
    title: "あくまで「参考情報」として提示",
    description:
      "AI分析結果は職員の判断を支援するためのものです。最終的な支援方針の決定は、必ず担当職員が行います。",
  },
  {
    title: "データが外部に出ない仕組み",
    description:
      "AI処理はGoogle Cloud内の閉じた環境で実行されます。相談データがインターネット上の外部サービスに送信されることはありません。",
  },
  {
    title: "最新の大規模言語モデルを活用",
    description:
      "Google Geminiを基盤とした高精度な日本語AI分析により、福祉制度に関する的確な提案が可能です。",
  },
];

function FeatureCard({ feature }: { feature: ContentItem }) {
  return (
    <div className="about-feature-card">
      <div className="about-feature-icon">{feature.icon}</div>
      <h3>{feature.title}</h3>
      <p>{feature.description}</p>
    </div>
  );
}

function SecurityCard({ point }: { point: ContentItem }) {
  return (
    <div className="about-security-card">
      <div className="about-security-icon">{point.icon}</div>
      <div>
        <h4>{point.title}</h4>
        <p>{point.description}</p>
      </div>
    </div>
  );
}

function ScreenshotCard({ item, index }: { item: Screenshot; index: number }) {
  return (
    <div className="about-screenshot-card">
      <div className="about-screenshot-image">
        <img src={item.src} alt={item.alt} loading={index === 0 ? "eager" : "lazy"} />
      </div>
      <div className="about-screenshot-body">
        <h3>{item.title}</h3>
        <p>{item.description}</p>
      </div>
    </div>
  );
}

export function About() {
  const navigate = useNavigate();
  const goToLogin = () => navigate("/login");

  return (
    <div className="about-page">
      {/* ── Navigation Bar ── */}
      <nav className="about-nav">
        <div className="about-nav-inner">
          <div className="about-nav-brand">
            <div className="about-nav-brand-icon">救</div>
            <span>救護AI</span>
          </div>
          <button className="btn btn-primary about-nav-login" onClick={goToLogin}>
            ログイン
          </button>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section className="about-hero">
        <div className="about-hero-inner">
          <div className="about-hero-badge">福祉相談業務AI支援システム</div>
          <h1>
            すべての相談者に、
            <br />
            <em>最適な支援</em>を届けるために。
          </h1>
          <p className="about-hero-lead">
            救護AIは、福祉相談の記録・分析・支援メニュー提案をAIで支援するクラウドシステムです。
            個人情報を安全に取り扱いながら、職員の業務負担を軽減し、支援の質を高めます。
          </p>
          <div className="about-hero-actions">
            <button className="btn btn-primary btn-lg" onClick={goToLogin}>
              システムにログイン
            </button>
            <a href="#features" className="btn btn-outline btn-lg">
              機能を見る
            </a>
          </div>
        </div>
        <div className="about-hero-decoration" aria-hidden="true" />
      </section>

      {/* ── Features Section ── */}
      <section id="features" className="about-section about-features-section">
        <div className="about-section-inner">
          <div className="about-section-header">
            <span className="about-section-label">主な機能</span>
            <h2>救護AIでできること</h2>
            <p>日々の福祉相談業務を4つの柱でサポートします。</p>
          </div>
          <div className="about-features-grid">
            {FEATURES.map((f) => (
              <FeatureCard key={f.title} feature={f} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Screenshots Section ── */}
      <section id="screenshots" className="about-section about-screenshots-section">
        <div className="about-section-inner">
          <div className="about-section-header">
            <span className="about-section-label">画面イメージ</span>
            <h2>実際の操作画面をご覧ください</h2>
            <p>シンプルで直感的なインターフェースで、すぐにお使いいただけます。</p>
          </div>
          <div className="about-screenshots-grid">
            {SCREENSHOTS.map((s, i) => (
              <ScreenshotCard key={s.title} item={s} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Security Section ── */}
      <section id="security" className="about-section about-security-section">
        <div className="about-section-inner">
          <div className="about-section-header">
            <span className="about-section-label">セキュリティ</span>
            <h2>個人情報を安全にお守りします</h2>
            <p>
              福祉相談では生活困窮者の収入・家族構成・健康状態など、
              センシティブな個人情報を扱います。
              <br />
              救護AIは、行政機関のセキュリティ基準に準拠した環境で運用されています。
            </p>
          </div>
          <div className="about-security-grid">
            {SECURITY_POINTS.map((p) => (
              <SecurityCard key={p.title} point={p} />
            ))}
          </div>
          <div className="about-compliance-note">
            <strong>準拠基準:</strong>{" "}
            総務省
            <a
              href="https://www.soumu.go.jp/denshijiti/jyouhou_policy/"
              target="_blank"
              rel="noopener noreferrer"
            >
              「地方公共団体における情報セキュリティポリシーに関するガイドライン」
            </a>
            （2025年3月改定）
          </div>
        </div>
      </section>

      {/* ── AI Section ── */}
      <section id="ai" className="about-section about-ai-section">
        <div className="about-section-inner">
          <div className="about-section-header">
            <span className="about-section-label">AI技術について</span>
            <h2>安心して使えるAI</h2>
            <p>
              AIは職員の判断を「置き換える」ものではなく「支援する」ツールです。
            </p>
          </div>
          <div className="about-ai-grid">
            {AI_POINTS.map((point) => (
              <div key={point.title} className="about-ai-card">
                <h4>{point.title}</h4>
                <p>{point.description}</p>
              </div>
            ))}
          </div>
          <div className="about-ai-diagram">
            <div className="about-ai-diagram-title">データの流れ</div>
            <div className="about-ai-flow">
              <div className="about-ai-flow-step">
                <div className="about-ai-flow-icon">💬</div>
                <span>相談記録を入力</span>
              </div>
              <div className="about-ai-flow-arrow" aria-hidden="true">→</div>
              <div className="about-ai-flow-step about-ai-flow-step--cloud">
                <div className="about-ai-flow-icon">☁️</div>
                <span>Google Cloud<br /><small>東京リージョン内で処理</small></span>
              </div>
              <div className="about-ai-flow-arrow" aria-hidden="true">→</div>
              <div className="about-ai-flow-step">
                <div className="about-ai-flow-icon">📊</div>
                <span>分析結果を表示</span>
              </div>
            </div>
            <p className="about-ai-flow-note">
              ※ データはすべて日本国内（東京）のGoogle Cloudサーバー内で完結します
            </p>
          </div>
        </div>
      </section>

      {/* ── Help Link Section ── */}
      <section className="about-section about-help-section">
        <div className="about-section-inner">
          <div className="about-help-card">
            <div className="about-help-icon">📖</div>
            <div>
              <h3>操作方法を詳しく見る</h3>
              <p>
                ログイン後の画面操作について、スクリーンショット付きの
                詳細なガイドをご用意しています。
              </p>
            </div>
            <button className="btn btn-outline" onClick={goToLogin}>
              ログインしてガイドを見る
            </button>
          </div>
        </div>
      </section>

      {/* ── CTA Section ── */}
      <section className="about-section about-cta-section">
        <div className="about-section-inner">
          <h2>導入をご検討の方へ</h2>
          <p>
            救護AIの導入に関するご質問・ご相談は、システム管理者までお問い合わせください。
          </p>
          <div className="about-cta-actions">
            <button className="btn btn-primary btn-lg" onClick={goToLogin}>
              システムにログイン
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="about-footer">
        <p>
          &copy; {CURRENT_YEAR} 救護AI — 福祉相談業務AI支援システム
        </p>
      </footer>
    </div>
  );
}
