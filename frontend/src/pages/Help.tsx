interface HelpAnnotation {
  icon: string;
  title: string;
  description: string;
}

interface HelpSection {
  id: string;
  title: string;
  description: string;
  image: { src: string; alt: string };
  annotations: HelpAnnotation[];
  annotationType: "points" | "steps";
  note?: string;
  noteImportant?: boolean;
}

const HELP_SECTIONS: HelpSection[] = [
  {
    id: "dashboard",
    title: "ダッシュボード（ケース一覧）",
    description:
      "ログインすると最初に表示される画面です。担当しているケースの一覧と、ステータスごとの統計が確認できます。",
    image: { src: "/help/dashboard.png", alt: "ダッシュボード画面" },
    annotationType: "points",
    annotations: [
      {
        icon: "a",
        title: "統計カード",
        description:
          "総ケース数・対応中・照会中・終了の件数がひと目で確認できます。",
      },
      {
        icon: "b",
        title: "ケースカード",
        description:
          "各ケースの相談者名、ID、ステータス、作成日、担当者が表示されます。クリックするとケース詳細に移動します。",
      },
      {
        icon: "c",
        title: "サイドバー",
        description:
          "左側のナビゲーションからケース一覧やヘルプページに移動できます。下部にログアウトボタンがあります。",
      },
    ],
  },
  {
    id: "new-case",
    title: "新規ケースの作成",
    description:
      "新しい相談者のケースを登録します。ダッシュボードの「＋ 新規ケース」ボタンをクリックしてください。",
    image: { src: "/help/new-case-modal.png", alt: "新規ケース作成モーダル" },
    annotationType: "steps",
    annotations: [
      {
        icon: "1",
        title: "相談者氏名",
        description: "を入力します（必須）",
      },
      {
        icon: "2",
        title: "相談者ID",
        description: "を入力します（必須。自治体の管理番号など）",
      },
      {
        icon: "3",
        title: "生年月日",
        description: "を選択します（必須）",
      },
      {
        icon: "4",
        title: "",
        description: "「ケースを作成」ボタンをクリックして保存します",
      },
    ],
    note: "担当職員は自動的にログイン中の職員が設定されます。",
  },
  {
    id: "case-detail",
    title: "ケース詳細の確認",
    description:
      "ケースカードをクリックすると、詳細画面に移動します。相談記録の一覧とケース基本情報を確認できます。",
    image: { src: "/help/case-detail.png", alt: "ケース詳細画面" },
    annotationType: "points",
    annotations: [
      {
        icon: "a",
        title: "相談記録タイムライン",
        description:
          "日時順に相談記録が表示されます。各記録にはAI分析結果が付随します。",
      },
      {
        icon: "b",
        title: "ケース情報サイドバー",
        description:
          "相談者ID、担当職員、生年月日、作成日などの基本情報が表示されます。",
      },
      {
        icon: "c",
        title: "ステータス変更",
        description:
          "「照会中に変更」「ケースを終了」ボタンでケースの状態を更新できます。",
      },
    ],
  },
  {
    id: "text-consultation",
    title: "テキストで相談を記録する",
    description:
      "ケース詳細画面の「＋ 新規相談記録」ボタンをクリックし、テキストで相談内容を入力します。",
    image: {
      src: "/help/new-consultation-modal.png",
      alt: "テキスト相談入力",
    },
    annotationType: "steps",
    annotations: [
      {
        icon: "1",
        title: "",
        description: "「テキスト入力」タブが選択されていることを確認します",
      },
      {
        icon: "2",
        title: "相談種別",
        description: "を選択します（窓口・訪問・電話・オンライン）",
      },
      {
        icon: "3",
        title: "相談内容",
        description: "に、相談者の状況や相談内容を記録します",
      },
      {
        icon: "4",
        title: "",
        description:
          "「相談を記録」をクリックすると保存され、AIが自動的に分析を開始します",
      },
    ],
    note: "AI分析には数秒〜十数秒かかります。完了すると相談記録にAI分析結果が表示されます。",
  },
  {
    id: "audio-consultation",
    title: "音声ファイルで相談を記録する",
    description:
      "録音した相談音声をアップロードすると、AIが文字起こし・要約・支援メニュー提案を一括で行います。",
    image: { src: "/help/audio-consultation.png", alt: "音声ファイル入力" },
    annotationType: "steps",
    annotations: [
      {
        icon: "1",
        title: "",
        description: "「音声ファイル」タブに切り替えます",
      },
      {
        icon: "2",
        title: "背景情報",
        description: "を入力します（任意）",
      },
      {
        icon: "3",
        title: "",
        description: "音声ファイルエリアをクリックしてファイルを選択します",
      },
      {
        icon: "4",
        title: "",
        description: "「音声を分析・記録」をクリックして送信します",
      },
    ],
    note: "対応フォーマット: WAV, MP3, MP4, M4A, OGG, FLAC, WebM, AAC",
  },
  {
    id: "ai-analysis",
    title: "AI分析結果の見方",
    description:
      "相談記録の保存後、AIが自動的に内容を分析し、要約と適切な支援メニューを提案します。",
    image: { src: "/help/ai-analysis.png", alt: "AI分析結果" },
    annotationType: "points",
    annotations: [
      {
        icon: "a",
        title: "AI要約",
        description:
          "相談内容をAIが200文字以内で要約します。相談のポイントが素早く把握できます。",
      },
      {
        icon: "b",
        title: "提案された支援メニュー",
        description:
          "関連度スコア（0〜100）付きで、活用可能な公的制度や支援が提案されます。スコアが高いほど、相談内容に適合しています。",
      },
      {
        icon: "c",
        title: "提案理由",
        description:
          "各支援メニューがなぜ提案されたのか、AIによる説明が表示されます。相談者への説明にもご活用ください。",
      },
    ],
    note: "AI分析結果はあくまで参考情報です。最終的な支援方針の判断は、必ず担当職員が行ってください。",
    noteImportant: true,
  },
];

function PointAnnotation({ annotation }: { annotation: HelpAnnotation }) {
  return (
    <div className="help-point">
      <span className="help-badge help-badge--point">{annotation.icon}</span>
      <div>
        <strong>{annotation.title}</strong>
        <p>{annotation.description}</p>
      </div>
    </div>
  );
}

function StepAnnotation({
  annotation,
}: {
  annotation: HelpAnnotation;
}) {
  return (
    <div className="help-step">
      <span className="help-badge help-badge--step">{annotation.icon}</span>
      <p>
        {annotation.title && <strong>{annotation.title}</strong>}
        {annotation.description}
      </p>
    </div>
  );
}

function HelpSectionView({
  section,
  index,
}: {
  section: HelpSection;
  index: number;
}) {
  const isPoints = section.annotationType === "points";
  return (
    <section id={section.id} className="help-section">
      <div className="help-section-number">{index + 1}</div>
      <h2>{section.title}</h2>
      <p>{section.description}</p>
      <div className="help-screenshot">
        <img src={section.image.src} alt={section.image.alt} loading="lazy" />
      </div>
      <div className={isPoints ? "help-points" : "help-steps"}>
        {section.annotations.map((a) =>
          isPoints ? (
            <PointAnnotation key={a.icon} annotation={a} />
          ) : (
            <StepAnnotation key={a.icon} annotation={a} />
          )
        )}
      </div>
      {section.note && (
        <div
          className={`help-note${section.noteImportant ? " help-note-important" : ""}`}
        >
          {section.note}
        </div>
      )}
    </section>
  );
}

export function Help() {
  return (
    <div className="help-page">
      <div className="help-header">
        <h1>使い方ガイド</h1>
        <p>
          救護AI —
          福祉相談業務支援システムの基本的な操作方法をご案内します。
        </p>
      </div>

      <nav className="help-toc">
        <h3>目次</h3>
        <ol>
          {HELP_SECTIONS.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`}>{s.title}</a>
            </li>
          ))}
        </ol>
      </nav>

      {HELP_SECTIONS.map((section, i) => (
        <HelpSectionView key={section.id} section={section} index={i} />
      ))}

      <footer className="help-footer">
        <p>
          ご不明な点がありましたら、システム管理者までお問い合わせください。
        </p>
      </footer>
    </div>
  );
}
