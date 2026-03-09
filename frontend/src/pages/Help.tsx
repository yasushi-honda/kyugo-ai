export function Help() {
  return (
    <div className="help-page">
      <div className="help-header">
        <h1>使い方ガイド</h1>
        <p>救護AI — 福祉相談業務支援システムの基本的な操作方法をご案内します。</p>
      </div>

      <nav className="help-toc">
        <h3>目次</h3>
        <ol>
          <li><a href="#dashboard">ダッシュボード（ケース一覧）</a></li>
          <li><a href="#new-case">新規ケースの作成</a></li>
          <li><a href="#case-detail">ケース詳細の確認</a></li>
          <li><a href="#text-consultation">テキストで相談を記録する</a></li>
          <li><a href="#audio-consultation">音声ファイルで相談を記録する</a></li>
          <li><a href="#ai-analysis">AI分析結果の見方</a></li>
        </ol>
      </nav>

      {/* 1. ダッシュボード */}
      <section id="dashboard" className="help-section">
        <div className="help-section-number">1</div>
        <h2>ダッシュボード（ケース一覧）</h2>
        <p>
          ログインすると最初に表示される画面です。担当しているケースの一覧と、ステータスごとの統計が確認できます。
        </p>
        <div className="help-screenshot">
          <img src="/help/dashboard.png" alt="ダッシュボード画面" loading="lazy" />
        </div>
        <div className="help-points">
          <div className="help-point">
            <span className="help-point-icon">a</span>
            <div>
              <strong>統計カード</strong>
              <p>総ケース数・対応中・照会中・終了の件数がひと目で確認できます。</p>
            </div>
          </div>
          <div className="help-point">
            <span className="help-point-icon">b</span>
            <div>
              <strong>ケースカード</strong>
              <p>各ケースの相談者名、ID、ステータス、作成日、担当者が表示されます。クリックするとケース詳細に移動します。</p>
            </div>
          </div>
          <div className="help-point">
            <span className="help-point-icon">c</span>
            <div>
              <strong>サイドバー</strong>
              <p>左側のナビゲーションからケース一覧やヘルプページに移動できます。下部にログアウトボタンがあります。</p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. 新規ケース作成 */}
      <section id="new-case" className="help-section">
        <div className="help-section-number">2</div>
        <h2>新規ケースの作成</h2>
        <p>
          新しい相談者のケースを登録します。ダッシュボードの「＋ 新規ケース」ボタンをクリックしてください。
        </p>
        <div className="help-screenshot">
          <img src="/help/new-case-modal.png" alt="新規ケース作成モーダル" loading="lazy" />
        </div>
        <div className="help-steps">
          <div className="help-step">
            <span className="help-step-number">1</span>
            <p><strong>相談者氏名</strong>を入力します（必須）</p>
          </div>
          <div className="help-step">
            <span className="help-step-number">2</span>
            <p><strong>相談者ID</strong>を入力します（必須。自治体の管理番号など）</p>
          </div>
          <div className="help-step">
            <span className="help-step-number">3</span>
            <p><strong>生年月日</strong>を選択します（必須）</p>
          </div>
          <div className="help-step">
            <span className="help-step-number">4</span>
            <p>「ケースを作成」ボタンをクリックして保存します</p>
          </div>
        </div>
        <div className="help-note">
          担当職員は自動的にログイン中の職員が設定されます。
        </div>
      </section>

      {/* 3. ケース詳細 */}
      <section id="case-detail" className="help-section">
        <div className="help-section-number">3</div>
        <h2>ケース詳細の確認</h2>
        <p>
          ケースカードをクリックすると、詳細画面に移動します。相談記録の一覧とケース基本情報を確認できます。
        </p>
        <div className="help-screenshot">
          <img src="/help/case-detail.png" alt="ケース詳細画面" loading="lazy" />
        </div>
        <div className="help-points">
          <div className="help-point">
            <span className="help-point-icon">a</span>
            <div>
              <strong>相談記録タイムライン</strong>
              <p>日時順に相談記録が表示されます。各記録にはAI分析結果が付随します。</p>
            </div>
          </div>
          <div className="help-point">
            <span className="help-point-icon">b</span>
            <div>
              <strong>ケース情報サイドバー</strong>
              <p>相談者ID、担当職員、生年月日、作成日などの基本情報が表示されます。</p>
            </div>
          </div>
          <div className="help-point">
            <span className="help-point-icon">c</span>
            <div>
              <strong>ステータス変更</strong>
              <p>「照会中に変更」「ケースを終了」ボタンでケースの状態を更新できます。</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. テキスト相談 */}
      <section id="text-consultation" className="help-section">
        <div className="help-section-number">4</div>
        <h2>テキストで相談を記録する</h2>
        <p>
          ケース詳細画面の「＋ 新規相談記録」ボタンをクリックし、テキストで相談内容を入力します。
        </p>
        <div className="help-screenshot">
          <img src="/help/new-consultation-modal.png" alt="テキスト相談入力" loading="lazy" />
        </div>
        <div className="help-steps">
          <div className="help-step">
            <span className="help-step-number">1</span>
            <p>「テキスト入力」タブが選択されていることを確認します</p>
          </div>
          <div className="help-step">
            <span className="help-step-number">2</span>
            <p><strong>相談種別</strong>を選択します（窓口・訪問・電話・オンライン）</p>
          </div>
          <div className="help-step">
            <span className="help-step-number">3</span>
            <p><strong>相談内容</strong>に、相談者の状況や相談内容を記録します</p>
          </div>
          <div className="help-step">
            <span className="help-step-number">4</span>
            <p>「相談を記録」をクリックすると保存され、<strong>AIが自動的に分析</strong>を開始します</p>
          </div>
        </div>
        <div className="help-note">
          AI分析には数秒〜十数秒かかります。完了すると相談記録にAI分析結果が表示されます。
        </div>
      </section>

      {/* 5. 音声相談 */}
      <section id="audio-consultation" className="help-section">
        <div className="help-section-number">5</div>
        <h2>音声ファイルで相談を記録する</h2>
        <p>
          録音した相談音声をアップロードすると、AIが文字起こし・要約・支援メニュー提案を一括で行います。
        </p>
        <div className="help-screenshot">
          <img src="/help/audio-consultation.png" alt="音声ファイル入力" loading="lazy" />
        </div>
        <div className="help-steps">
          <div className="help-step">
            <span className="help-step-number">1</span>
            <p>「音声ファイル」タブに切り替えます</p>
          </div>
          <div className="help-step">
            <span className="help-step-number">2</span>
            <p>必要に応じて<strong>背景情報</strong>を入力します（任意）</p>
          </div>
          <div className="help-step">
            <span className="help-step-number">3</span>
            <p>音声ファイルエリアをクリックしてファイルを選択します</p>
          </div>
          <div className="help-step">
            <span className="help-step-number">4</span>
            <p>「音声を分析・記録」をクリックして送信します</p>
          </div>
        </div>
        <div className="help-note">
          対応フォーマット: WAV, MP3, MP4, M4A, OGG, FLAC, WebM, AAC
        </div>
      </section>

      {/* 6. AI分析結果 */}
      <section id="ai-analysis" className="help-section">
        <div className="help-section-number">6</div>
        <h2>AI分析結果の見方</h2>
        <p>
          相談記録の保存後、AIが自動的に内容を分析し、要約と適切な支援メニューを提案します。
        </p>
        <div className="help-screenshot">
          <img src="/help/ai-analysis.png" alt="AI分析結果" loading="lazy" />
        </div>
        <div className="help-points">
          <div className="help-point">
            <span className="help-point-icon">a</span>
            <div>
              <strong>AI要約</strong>
              <p>相談内容をAIが200文字以内で要約します。相談のポイントが素早く把握できます。</p>
            </div>
          </div>
          <div className="help-point">
            <span className="help-point-icon">b</span>
            <div>
              <strong>提案された支援メニュー</strong>
              <p>関連度スコア（0〜100）付きで、活用可能な公的制度や支援が提案されます。スコアが高いほど、相談内容に適合しています。</p>
            </div>
          </div>
          <div className="help-point">
            <span className="help-point-icon">c</span>
            <div>
              <strong>提案理由</strong>
              <p>各支援メニューがなぜ提案されたのか、AIによる説明が表示されます。相談者への説明にもご活用ください。</p>
            </div>
          </div>
        </div>
        <div className="help-note help-note-important">
          AI分析結果はあくまで参考情報です。最終的な支援方針の判断は、必ず担当職員が行ってください。
        </div>
      </section>

      <footer className="help-footer">
        <p>ご不明な点がありましたら、システム管理者までお問い合わせください。</p>
      </footer>
    </div>
  );
}
