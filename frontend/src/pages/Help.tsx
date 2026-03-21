interface HelpAnnotation {
  icon: string;
  title: string;
  description: string;
}

interface HelpSection {
  id: string;
  title: string;
  description: string;
  image?: { src: string; alt: string };
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
    id: "audio-recording",
    title: "音声で相談を記録する（直接録音）",
    description:
      "ブラウザのマイクから直接録音し、AIが文字起こし・要約・支援メニュー提案を一括で行います。タブレット・スマートフォン・PCで利用できます。",
    image: { src: "/help/audio-recording.png", alt: "ブラウザ直接録音" },
    annotationType: "steps",
    annotations: [
      {
        icon: "1",
        title: "",
        description: "「音声」タブに切り替えます",
      },
      {
        icon: "2",
        title: "",
        description:
          "「🎙️ 録音する」が選択されていることを確認します（デフォルトで選択済み）",
      },
      {
        icon: "3",
        title: "背景情報",
        description: "を入力します（任意。相談の事前情報など）",
      },
      {
        icon: "4",
        title: "",
        description:
          "「録音開始」ボタンをクリックしてマイクからの録音を開始します。初回はブラウザからマイクの許可を求められます",
      },
      {
        icon: "5",
        title: "",
        description:
          "録音中は経過時間が表示されます。「⏸ 一時停止」で中断、「▶ 再開」で再開できます",
      },
      {
        icon: "6",
        title: "",
        description:
          "「⏹ 録音停止」をクリックして録音を完了し、「音声を分析・記録」で送信します",
      },
    ],
    note: "ブラウザがマイク録音に対応していない場合は、自動的にファイルアップロードモードに切り替わります。",
  },
  {
    id: "audio-file-upload",
    title: "音声で相談を記録する（ファイルアップロード）",
    description:
      "録音済みの音声ファイルをアップロードして、AIによる文字起こし・分析を行うこともできます。",
    image: { src: "/help/audio-consultation.png", alt: "音声ファイルアップロード" },
    annotationType: "steps",
    annotations: [
      {
        icon: "1",
        title: "",
        description: "「音声」タブに切り替えます",
      },
      {
        icon: "2",
        title: "",
        description: "「📁 ファイルを選択」ボタンをクリックしてファイルアップロードモードに切り替えます",
      },
      {
        icon: "3",
        title: "背景情報",
        description: "を入力します（任意）",
      },
      {
        icon: "4",
        title: "",
        description: "音声ファイルエリアをクリックしてファイルを選択します",
      },
      {
        icon: "5",
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
  {
    id: "edit-delete-consultation",
    title: "相談記録の編集・削除",
    description:
      "記録した相談内容の修正や、誤って作成した記録の削除ができます。",
    image: { src: "/help/edit-consultation.png", alt: "相談記録の編集・削除" },
    annotationType: "steps",
    annotations: [
      {
        icon: "1",
        title: "",
        description:
          "相談記録カードの右上にある ⋯ ボタンをクリックします。自分が作成した記録、または管理者権限がある場合に表示されます。",
      },
      {
        icon: "2",
        title: "",
        description:
          "「編集」を選ぶと相談内容がテキストエリアに変わります。内容を修正して「保存」をクリックしてください。",
      },
      {
        icon: "3",
        title: "",
        description:
          "保存後、AIが編集後の内容で自動的に再分析を行います。日時の横に編集者名が表示されます。",
      },
    ],
    note: "削除した記録は画面から消えますが、システム内部には保存されています。誤削除の復旧が必要な場合は管理者にお問い合わせください。",
  },
  {
    id: "support-plan",
    title: "支援計画書の作成",
    description:
      "AI分析結果をもとに、個別支援計画書の下書きを自動生成できます。ケース詳細画面の「支援計画書」タブから操作します。",
    image: { src: "/help/support-plan.png", alt: "支援計画書タブ" },
    annotationType: "steps",
    annotations: [
      {
        icon: "1",
        title: "支援計画書タブ",
        description: "を選択します",
      },
      {
        icon: "2",
        title: "",
        description:
          "「AI下書きを生成」ボタンをクリックすると、相談記録のAI分析結果をもとに下書きが自動生成されます",
      },
      {
        icon: "3",
        title: "全体的な支援方針",
        description: "と支援目標（経済的支援・医療支援など）の内容を確認します",
      },
      {
        icon: "4",
        title: "",
        description:
          "「編集」ボタンで方針や目標を修正できます。内容が確定したら「確定」ボタンをクリックします",
      },
    ],
    note: "確定後はモニタリングシートの生成が可能になります。",
  },
  {
    id: "monitoring-sheet",
    title: "モニタリングシートの作成",
    description:
      "支援計画書の進捗を定期的に評価するモニタリングシートを作成します。ケース詳細画面の「モニタリング」タブから操作します。",
    image: { src: "/help/monitoring-sheet.png", alt: "モニタリングシート" },
    annotationType: "steps",
    annotations: [
      {
        icon: "1",
        title: "モニタリングタブ",
        description: "を選択します",
      },
      {
        icon: "2",
        title: "",
        description:
          "「AI下書きを生成」ボタンをクリックすると、支援計画書の目標に基づいた下書きが自動生成されます",
      },
      {
        icon: "3",
        title: "全体評価",
        description:
          "と目標別の進捗（改善・維持・後退・未着手）を確認します",
      },
      {
        icon: "4",
        title: "",
        description:
          "「編集」ボタンで評価内容を修正し、「確定」ボタンで確定します",
      },
    ],
    note: "支援計画書が確定済みである必要があります。",
    noteImportant: true,
  },
  {
    id: "legal-search",
    title: "法令・制度の検索",
    description:
      "支援に関連する法令や制度をAIで検索できます。ケース詳細画面の「法令検索」タブから操作します。",
    image: { src: "/help/legal-search.png", alt: "法令検索タブ" },
    annotationType: "steps",
    annotations: [
      {
        icon: "1",
        title: "法令検索タブ",
        description: "を選択します",
      },
      {
        icon: "2",
        title: "",
        description:
          "検索フォームにキーワード（例:「高齢者の生活保護申請要件」）を入力します",
      },
      {
        icon: "3",
        title: "",
        description: "「関連法令を検索」ボタンをクリックして検索を実行します",
      },
      {
        icon: "4",
        title: "法的根拠",
        description:
          "と関連法令（法律名・条文・概要）を確認します",
      },
    ],
    note: "検索結果はケースに紐づいて保存されます。過去の検索履歴も参照できます。",
  },
  {
    id: "settings-whitelist",
    title: "ログイン許可設定",
    description:
      "システムにログインできるユーザーを制限します。サイドバーの「アクセス設定」から操作します（管理者のみ表示）。",
    image: {
      src: "/help/settings-whitelist.png",
      alt: "ログイン許可設定画面",
    },
    annotationType: "points",
    annotations: [
      {
        icon: "a",
        title: "許可メールアドレス",
        description:
          "個別のメールアドレスを追加・削除して、ログインを許可するユーザーを管理します。",
      },
      {
        icon: "b",
        title: "許可ドメイン",
        description:
          "ドメイン単位でログインを許可します。例: city.ibaraki.example.jp を追加すると、そのドメインの全ユーザーがログイン可能になります。",
      },
      {
        icon: "c",
        title: "変更の保存",
        description:
          "追加・削除した後、「変更を保存」ボタンをクリックして設定を反映します。",
      },
    ],
    note: "管理者ロールのユーザーのみこのページが表示されます。",
  },
  {
    id: "settings-accounts",
    title: "アカウント管理",
    description:
      "登録済み職員のロール変更やアカウントの無効化を管理します。「アクセス設定」の「アカウント管理」タブから操作します。",
    image: {
      src: "/help/settings-accounts.png",
      alt: "アカウント管理画面",
    },
    annotationType: "points",
    annotations: [
      {
        icon: "a",
        title: "職員一覧",
        description:
          "登録済み職員の名前、メールアドレス、ロール、状態が一覧表示されます。",
      },
      {
        icon: "b",
        title: "ロール変更",
        description:
          "ドロップダウンから「管理者」または「職員」を選択してロールを変更します。",
      },
      {
        icon: "c",
        title: "アカウントの無効化",
        description:
          "「無効化」ボタンでアカウントを停止し、「有効化」ボタンで復旧できます。",
      },
    ],
    note: "自分自身のロール降格・無効化は安全のためできません。",
    noteImportant: true,
  },
  {
    id: "csv-export",
    title: "CSVエクスポート",
    description:
      "ケース一覧や相談記録をCSV形式でダウンロードできます。Excelでの集計や報告書作成にご活用ください。",
    annotationType: "steps",
    annotations: [
      {
        icon: "1",
        title: "ケース一覧のCSV出力",
        description:
          "ダッシュボードの「CSV出力」ボタンをクリックすると、表示中の全ケースがCSVファイルとしてダウンロードされます。",
      },
      {
        icon: "2",
        title: "相談記録のCSV出力",
        description:
          "ケース詳細画面の相談記録タブにある「CSV出力」ボタンで、そのケースの全相談記録をダウンロードできます。",
      },
      {
        icon: "3",
        title: "CSVファイルの利用",
        description:
          "ダウンロードしたCSVはExcelで直接開けます（UTF-8 BOM付き）。文字化けする場合はファイルのエンコーディングをUTF-8に設定してください。",
      },
    ],
    note: "CSVには担当ケースのデータのみが含まれます。管理者は全ケースのデータを出力できます。",
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
      {section.image && (
        <div className="help-screenshot">
          <img src={section.image.src} alt={section.image.alt} loading="lazy" />
        </div>
      )}
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
