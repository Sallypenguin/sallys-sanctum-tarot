// Rendering helpers for schema-v2 tarot cards.
// v7 layout: cards stay in a compact spread; long readings are shown in a single-column reader below.
(function () {
  const cardBack = () => window.TAROT_CARD_BACK || "images/back.png";

  const SPREAD_TYPE_LABELS = {
    one: "ワンオラクル",
    three: "スリーカード",
    triad: "トライアド"
  };

  function renderEmptyState(message = "まだカードは引かれていません。読み方と相談テーマを選んで、カードを引いてください。") {
    return `<div class="empty-state">${escapeHtml(message)}</div>`;
  }

  function renderReading(reading) {
    const tabItems = [
      { key: "overview", label: "全体" },
      ...reading.cards.map((item) => ({ key: item.position.id, label: item.position.label })),
      ...(reading.pairs.length ? [{ key: "synergy", label: "シナジー" }] : [])
    ];

    return `
      <section class="spread ${reading.cards.length === 1 ? "spread-one" : "spread-three"}" aria-label="引いたカード">
        ${reading.cards.map((item, index) => renderSlot(item, index)).join("")}
      </section>

      ${renderSaveReadingActions("top")}

      <section class="detail-reader" aria-label="リーディング本文">
        <nav class="detail-tabs" role="tablist" aria-label="表示する解説を選択">
          ${tabItems.map((tab, index) => {
            const active = index === 0;
            return `
              <button
                type="button"
                id="${escapeHtml(getDetailTabId(tab.key))}"
                class="detail-tab js-detail-tab ${active ? "is-active" : ""}"
                data-detail-key="${escapeHtml(tab.key)}"
                role="tab"
                aria-selected="${active ? "true" : "false"}"
                aria-controls="${escapeHtml(getDetailPanelId(tab.key))}"
                tabindex="${active ? "0" : "-1"}"
              >${escapeHtml(tab.label)}</button>
            `;
          }).join("")}
        </nav>

        <div class="detail-carousel-shell" aria-label="解説パネルのカルーセル">
          <div class="detail-panels detail-carousel js-detail-carousel">
            ${renderOverviewPanel(reading, true)}
            ${reading.cards.map((item) => renderCardDetailPanel(item, false)).join("")}
            ${reading.pairs.length ? renderSynergyPanel(reading.pairs, false) : ""}
          </div>
        </div>
      </section>

      ${renderSaveReadingActions("bottom")}
    `;
  }

  function getDetailTabId(key) {
    return `detail-tab-${String(key || "panel").replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  }

  function getDetailPanelId(key) {
    return `detail-panel-${String(key || "panel").replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  }

  function getPanelStateAttributes(key, active) {
    const ariaHidden = active ? "false" : "true";
    return `id="${escapeHtml(getDetailPanelId(key))}" aria-labelledby="${escapeHtml(getDetailTabId(key))}" aria-hidden="${ariaHidden}"${active ? "" : " inert"}`;
  }

  function renderSaveReadingActions(position = "bottom") {
    const isTop = position === "top";
    const modifier = isTop ? " reading-actions--top" : " reading-actions--bottom";
    const statusText = "この読みはまだ記録されていません。";
    return `
      <section class="reading-actions${modifier}" aria-label="リーディングの記録と操作">
        <p class="reading-save-status js-save-status" role="status" aria-live="polite">${statusText}</p>
        <div class="reading-action-buttons">
          <button type="button" class="secondary js-save-reading">この読みを記録する</button>
          <button type="button" class="secondary js-reset-reading">リセット</button>
        </div>
      </section>
    `;
  }

  function renderOverviewPanel(reading, active = false) {
    return `
      <article class="detail-panel reading-overview ${active ? "is-active" : ""}" data-detail-panel="overview" role="tabpanel" ${getPanelStateAttributes("overview", active)}>
        <h2>リーディング概要</h2>
        <div class="overview-grid">
          <div><span>スプレッド</span>${escapeHtml(getSpreadTypeLabel(reading.spreadType))}</div>
          <div><span>相談テーマ</span>${escapeHtml(reading.contextLabel)}</div>
          <div><span>逆位置設定</span>${reading.useReversals ? "ON" : "OFF"}</div>
          <div><span>位置とカード</span>${escapeHtml(reading.summary.positionFlow)}</div>
          <div><span>正逆の流れ</span>${escapeHtml(reading.summary.orientationPattern)}</div>
        </div>
        ${renderSpreadSummary(reading.summary)}
        ${reading.pairs.length ? renderPairDigest(reading.pairs) : ""}
      </article>
    `;
  }

  function getSpreadTypeLabel(spreadType) {
    return SPREAD_TYPE_LABELS[spreadType] || spreadType || "スプレッド";
  }

  function renderPairDigest(pairs) {
    const definedCount = pairs.filter((pair) => !pair.inferred).length;
    return `
      <details class="result-section" open>
        <summary>シナジー概要</summary>
        <p>${definedCount ? `カードプール内の既定シナジーが ${definedCount} 件あります。対象カードは順番に黄金色に光ります。` : "今回は既定シナジーはなく、テーマ・関係性からの自動補助読みだけが使われています。"}</p>
        <ul>
          ${pairs.map((pair) => `<li><strong>${escapeHtml(pair.left.position.label)} × ${escapeHtml(pair.right.position.label)}：</strong>${escapeHtml(pair.title)}</li>`).join("")}
        </ul>
      </details>
    `;
  }

  function renderSpreadSummary(summary) {
    return `
      <details class="result-section" open>
        <summary>全体リーディング</summary>
        <p>${escapeHtml(summary.text)}</p>
        ${renderInlineList("主要テーマ", summary.topThemes)}
        ${renderInlineList("動き", summary.movements)}
        ${renderInlineList("トーン", summary.tones)}
        ${renderInlineList("元素", summary.elements)}
        ${renderInlineList("時間感覚", summary.timeSenses)}
        ${summary.averageIntensity ? `<p class="meta-line"><strong>象徴強度：</strong>${escapeHtml(summary.averageIntensity)} / 5</p>` : ""}
      </details>
    `;
  }

  function renderSlot(item, index) {
    const reversedClass = item.orientation === "reversed" ? "reversed" : "";
    const slotLead = getSlotLead(item);
    return `
      <article class="slot ${reversedClass}" data-card-id="${escapeHtml(item.id)}" data-detail-target="${escapeHtml(item.position.id)}" style="--slot-index:${index}">
        <p class="slot-title">${escapeHtml(item.position.label)}</p>
        <button type="button" class="card-stage js-reveal-card" aria-label="${escapeHtml(item.label)}をめくる">
          <span class="card" aria-hidden="true">
            <span class="face back"><img src="${escapeHtml(cardBack())}" alt=""></span>
            <span class="face front"><img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.alt)}"></span>
          </span>
        </button>
        <div class="slot-card-summary">
          <h2 class="card-name">${escapeHtml(item.label)}</h2>
          <p class="orientation">${escapeHtml(item.orientationLabel)}</p>
          ${slotLead ? `<p class="slot-lead">${escapeHtml(slotLead)}</p>` : ""}
          <p class="slot-hint">詳しく読むにはカードか下のタブを選択</p>
        </div>
      </article>
    `;
  }

  function getSlotLead(item) {
    // The spread card is the first sentence the user sees after drawing.
    // Prefer the selected consultation theme, then the spread position,
    // then the generic card short reading.
    return item.contextMeaning || item.positionMeaning || item.meaning?.short || item.core || "";
  }

  function renderCardDetailPanel(item, active = false) {
    const panelKey = item.position.id;
    return `
      <article class="detail-panel card-detail ${active ? "is-active" : ""}" data-detail-panel="${escapeHtml(panelKey)}" role="tabpanel" ${getPanelStateAttributes(panelKey, active)}>
        <header class="card-detail-header">
          <button
            type="button"
            class="detail-card-visual image-zoom-button js-open-image-dialog ${item.orientation === "reversed" ? "reversed" : ""}"
            data-image-src="${escapeHtml(item.image)}"
            data-image-alt="${escapeHtml(item.alt)}"
            data-image-orientation="${escapeHtml(item.orientation)}"
            aria-label="${escapeHtml(item.label)}の画像を拡大表示"
          >
            <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.alt)}">
            <span class="image-zoom-hint" aria-hidden="true">拡大</span>
          </button>
          <div class="detail-card-heading">
            <p class="slot-title">${escapeHtml(item.position.label)}</p>
            <h2 class="card-name">${escapeHtml(item.label)}</h2>
            <p class="orientation">${escapeHtml(item.orientationLabel)}</p>
          </div>
        </header>

        ${renderInlineList("キーワード", item.keywords)}
        ${item.core ? `<p class="core-meaning"><strong>核：</strong>${escapeHtml(item.core)}</p>` : ""}

        <details class="result-section" open>
          <summary>今回の読み</summary>
          ${item.meaning.short ? `<p class="lead">${escapeHtml(item.meaning.short)}</p>` : ""}
          ${item.positionMeaning ? `<p><strong>${escapeHtml(item.position.label)}として：</strong>${escapeHtml(item.positionMeaning)}</p>` : ""}
          ${item.contextMeaning ? `<p><strong>相談テーマとして：</strong>${escapeHtml(item.contextMeaning)}</p>` : ""}
          ${item.meaning.long ? `<p>${escapeHtml(item.meaning.long)}</p>` : ""}
          ${item.meaning.advice ? `<p><strong>助言：</strong>${escapeHtml(item.meaning.advice)}</p>` : ""}
          ${item.meaning.caution ? `<p><strong>注意：</strong>${escapeHtml(item.meaning.caution)}</p>` : ""}
        </details>

        ${renderQuestions(item.questions)}
        ${renderOriginalDeck(item.originalDeck)}
        ${renderSynergy(item.synergy)}
      </article>
    `;
  }

  function renderQuestions(questions) {
    if (!questions?.length) return "";
    return `
      <details class="result-section">
        <summary>問いかけ</summary>
        <ul>${questions.map((q) => `<li>${escapeHtml(q)}</li>`).join("")}</ul>
      </details>
    `;
  }

  function renderOriginalDeck(originalDeck) {
    if (!originalDeck) return "";
    const hasAny = originalDeck.concept || originalDeck.distinction || originalDeck.notes || originalDeck.symbolism?.length;
    if (!hasAny) return "";

    return `
      <details class="result-section">
        <summary>このデッキ固有の解釈</summary>
        ${originalDeck.concept ? `<p><strong>コンセプト：</strong>${escapeHtml(originalDeck.concept)}</p>` : ""}
        ${originalDeck.distinction ? `<p><strong>伝統との差分：</strong>${escapeHtml(originalDeck.distinction)}</p>` : ""}
        ${originalDeck.symbolism?.length ? `<h3>象徴</h3><ul>${originalDeck.symbolism.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul>` : ""}
        ${originalDeck.notes ? `<p><strong>メモ：</strong>${escapeHtml(originalDeck.notes)}</p>` : ""}
      </details>
    `;
  }

  function renderSynergy(synergy) {
    if (!synergy) return "";
    const hasAny = synergy.themes?.length || synergy.movement || synergy.tone || synergy.element || synergy.polarity || synergy.timeSense || synergy.affinities?.length || synergy.tensions?.length;
    if (!hasAny) return "";

    return `
      <details class="result-section">
        <summary>シナジー用データ</summary>
        ${renderInlineList("テーマ", synergy.themes)}
        <div class="data-grid">
          ${renderDataCell("動き", synergy.movement)}
          ${renderDataCell("トーン", synergy.tone)}
          ${renderDataCell("元素", synergy.element)}
          ${renderDataCell("極性", synergy.polarity)}
          ${renderDataCell("時間感覚", synergy.timeSense)}
          ${synergy.intensity ? renderDataCell("強度", `${synergy.intensity} / 5`) : ""}
        </div>
        ${renderInlineList("相性がよいカードID", synergy.affinities)}
        ${renderInlineList("緊張関係のカードID", synergy.tensions)}
      </details>
    `;
  }

  function renderSynergyPanel(pairs, active = false) {
    return `
      <article class="detail-panel pair-section ${active ? "is-active" : ""}" data-detail-panel="synergy" role="tabpanel" ${getPanelStateAttributes("synergy", active)}>
        <h2>カード同士のシナジー</h2>
        <p class="section-lead">既定ペア解釈がある場合はカードプール内の文章を優先し、未登録の組み合わせはテーマ・関係性から補助読みを出します。</p>
        <div class="pair-grid">
          ${pairs.map((pair) => `
            <article class="pair-card ${pair.inferred ? "inferred" : "defined"}" data-left-id="${escapeHtml(pair.left.id)}" data-right-id="${escapeHtml(pair.right.id)}">
              <h3 class="pair-flow">${escapeHtml(pair.left.position.label)} → ${escapeHtml(pair.right.position.label)}</h3>
              <div class="pair-visuals" aria-label="${escapeHtml(pair.left.label)} と ${escapeHtml(pair.right.label)} のシナジー">
                ${renderPairMiniCard(pair.left)}
                <span class="pair-arrow" aria-hidden="true">⇄</span>
                ${renderPairMiniCard(pair.right)}
              </div>
              <p class="pair-title"><strong>${escapeHtml(pair.title)}</strong></p>
              <p>${escapeHtml(pair.text)}</p>
              <p class="pair-source">${pair.inferred ? "テーマ・関係性からの自動補助読み" : "カードプール内のペア解釈"}</p>
            </article>
          `).join("")}
        </div>
      </article>
    `;
  }

  function renderPairMiniCard(item) {
    return `
      <figure class="pair-mini-card ${item.orientation === "reversed" ? "reversed" : ""}">
        <button
          type="button"
          class="pair-mini-image-button image-zoom-button js-open-image-dialog"
          data-image-src="${escapeHtml(item.image)}"
          data-image-alt="${escapeHtml(item.alt)}"
          data-image-orientation="${escapeHtml(item.orientation)}"
          aria-label="${escapeHtml(item.label)}の画像を拡大表示"
        >
          <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.alt)}">
        </button>
        <figcaption>
          <span>${escapeHtml(item.position.label)}</span>
          <strong>${escapeHtml(item.label)}</strong>
          <em>${escapeHtml(item.orientationLabel)}</em>
        </figcaption>
      </figure>
    `;
  }

  function renderLibrary(cards) {
    return cards.map((card) => renderLibraryCard(card)).join("");
  }

  function renderLibraryCard(card) {
    const details = window.TarotEngine.getCardDetails(card);
    return `
      <article class="library-card-full">
        <button
          type="button"
          class="library-image-button image-zoom-button js-open-image-dialog"
          data-image-src="${escapeHtml(details.image)}"
          data-image-alt="${escapeHtml(details.alt)}"
          data-image-orientation="upright"
          aria-label="${escapeHtml(details.label)}の画像を拡大表示"
        >
          <img src="${escapeHtml(details.image)}" alt="${escapeHtml(details.alt)}">
          <span class="image-zoom-hint" aria-hidden="true">拡大</span>
        </button>
        <div class="library-body">
          <h3>${escapeHtml(details.label)}</h3>
          ${details.core ? `<p class="core-meaning"><strong>核：</strong>${escapeHtml(details.core)}</p>` : ""}
          ${renderInlineList("正位置", details.uprightKeywords)}
          ${renderInlineList("逆位置", details.reversedKeywords)}

          <details class="result-section">
            <summary>基本解釈</summary>
            ${renderMeaningPair("正位置", details.upright)}
            ${renderMeaningPair("逆位置", details.reversed)}
          </details>

          ${renderLibraryPositions(details.positions)}
          ${renderLibraryContexts(details.contexts)}
          ${renderQuestions(details.questions)}
          ${renderOriginalDeck(details.originalDeck)}
          ${renderLibraryRelations(details.related)}
        </div>
      </article>
    `;
  }

  function renderMeaningPair(label, meaning) {
    if (!meaning || !(meaning.short || meaning.long || meaning.advice || meaning.caution)) return "";
    return `
      <section class="mini-section">
        <h4>${escapeHtml(label)}</h4>
        ${meaning.short ? `<p>${escapeHtml(meaning.short)}</p>` : ""}
        ${meaning.long ? `<p>${escapeHtml(meaning.long)}</p>` : ""}
        ${meaning.advice ? `<p><strong>助言：</strong>${escapeHtml(meaning.advice)}</p>` : ""}
        ${meaning.caution ? `<p><strong>注意：</strong>${escapeHtml(meaning.caution)}</p>` : ""}
      </section>
    `;
  }

  function renderLibraryPositions(positions) {
    if (!positions?.length) return "";
    return `
      <details class="result-section">
        <summary>位置別解釈</summary>
        ${positions.map((position) => `
          <section class="mini-section">
            <h4>${escapeHtml(position.label)}</h4>
            ${position.upright ? `<p><strong>正：</strong>${escapeHtml(position.upright)}</p>` : ""}
            ${position.reversed ? `<p><strong>逆：</strong>${escapeHtml(position.reversed)}</p>` : ""}
          </section>
        `).join("")}
      </details>
    `;
  }

  function renderLibraryContexts(contexts) {
    if (!contexts?.length) return "";
    return `
      <details class="result-section">
        <summary>相談テーマ別解釈</summary>
        ${contexts.map((context) => `
          <section class="mini-section">
            <h4>${escapeHtml(context.label)}</h4>
            ${context.upright ? `<p><strong>正：</strong>${escapeHtml(context.upright)}</p>` : ""}
            ${context.reversed ? `<p><strong>逆：</strong>${escapeHtml(context.reversed)}</p>` : ""}
          </section>
        `).join("")}
      </details>
    `;
  }

  function renderLibraryRelations(related) {
    if (!related) return "";
    return `
      <details class="result-section">
        <summary>関連カード</summary>
        ${renderInlineList("相性", related.affinities)}
        ${renderInlineList("緊張", related.tensions)}
        ${related.pairs?.length ? `
          <h4>ペア解釈</h4>
          <ul>${related.pairs.map((pair) => `<li><strong>${escapeHtml(pair.label)}：</strong>${escapeHtml(pair.title)} ${pair.text ? `— ${escapeHtml(pair.text)}` : ""}</li>`).join("")}</ul>
        ` : ""}
      </details>
    `;
  }

  function renderInlineList(label, values) {
    const clean = [...new Set((values || []).filter(Boolean))];
    if (!clean.length) return "";
    return `<p class="tag-line"><strong>${escapeHtml(label)}：</strong>${clean.map((value) => `<span>${escapeHtml(value)}</span>`).join("")}</p>`;
  }

  function renderDataCell(label, value) {
    if (!value) return "";
    return `<div><span>${escapeHtml(label)}</span>${escapeHtml(value)}</div>`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  window.TarotRender = {
    renderEmptyState,
    renderReading,
    renderLibrary,
    escapeHtml
  };
})();
