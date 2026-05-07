// Card library page. Uses the completed card-pool as read-only data.
(function () {
  const cards = window.TarotEngine.getCards();
  const gridEl = document.getElementById("cards-grid");
  const statusEl = document.getElementById("cards-status");
  const thumbNavEl = document.getElementById("arcana-thumb-nav");
  const searchEl = document.getElementById("card-search");
  const themeButtons = [...document.querySelectorAll(".theme-chip[data-theme]")];

  const THEME_LABELS = {
    general: "共通",
    love: "恋愛・関係性",
    work: "仕事・活動",
    selfCare: "セルフケア",
    creativity: "創作"
  };

  let selectedTheme = "general";
  let imageDialog = null;

  function imageFor(details, variant = "medium") {
    const images = details?.images || (window.SallyImageAssets?.getImageSet ? window.SallyImageAssets.getImageSet(details?.image) : null);
    return images?.[variant] || details?.image || "";
  }

  bindControls();
  renderThumbNav();
  renderCards();

  function bindControls() {
    searchEl?.addEventListener("input", renderCards);

    thumbNavEl?.addEventListener("click", (event) => {
      const button = event.target.closest(".arcana-thumb-button[data-card-id]");
      if (!button) return;
      event.preventDefault();
      scrollToCard(button.dataset.cardId);
    });

    themeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        selectedTheme = button.dataset.theme || "general";
        themeButtons.forEach((item) => {
          const active = item.dataset.theme === selectedTheme;
          item.classList.toggle("is-active", active);
          item.setAttribute("aria-pressed", active ? "true" : "false");
        });
        renderCards();
      });
    });
  }

  function renderThumbNav() {
    if (!thumbNavEl) return;

    thumbNavEl.innerHTML = `
      <p class="arcana-thumb-nav__label">大アルカナ22枚</p>
      <div class="arcana-thumb-list">
        ${cards.map((card) => {
          const details = window.TarotEngine.getCardDetails(card);
          return `
            <button
              type="button"
              class="arcana-thumb-button"
              data-card-id="${escapeHtml(card.id)}"
              aria-label="${escapeHtml(details.label)}へ移動"
              title="${escapeHtml(details.label)}"
            >
              <img src="${escapeHtml(imageFor(details, "thumb"))}" alt="" aria-hidden="true" width="240" height="360" loading="lazy" decoding="async">
            </button>
          `;
        }).join("")}
      </div>
    `;
  }

  function scrollToCard(cardId) {
    if (!cardId) return;

    // If a search filter hides the target card, clear the search first so every thumbnail can jump reliably.
    if (searchEl && searchEl.value) {
      searchEl.value = "";
      renderCards();
    }

    window.requestAnimationFrame(() => {
      const target = document.getElementById(getCardElementId(cardId));
      if (!target) return;

      target.scrollIntoView({
        behavior: prefersReducedMotion() ? "auto" : "smooth",
        block: "start",
        inline: "nearest"
      });

      target.classList.remove("is-scroll-highlight");
      // Force reflow so repeated taps on the same thumbnail replay the highlight.
      void target.offsetWidth;
      target.classList.add("is-scroll-highlight");
      target.focus({ preventScroll: true });
    });
  }

  function getCardElementId(cardId) {
    return `card-${String(cardId).replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  }

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function renderCards() {
    if (!gridEl || !statusEl) return;

    const query = normalize(searchEl?.value || "");
    const prepared = cards.map((card) => ({ card, details: window.TarotEngine.getCardDetails(card) }));
    const filtered = query
      ? prepared.filter((item) => getSearchText(item.card, item.details).includes(query))
      : prepared;

    statusEl.textContent = createStatusText(filtered.length, prepared.length, query, selectedTheme);

    if (!filtered.length) {
      gridEl.innerHTML = `
        <div class="empty-state cards-empty">
          条件に合うカードはありません。検索語を変えると、他のカードを見られます。
        </div>
      `;
      return;
    }

    gridEl.innerHTML = filtered.map((item) => renderCard(item.card, item.details)).join("");
    bindImageDialogButtons(gridEl);
  }

  function createStatusText(count, total, query, theme) {
    const themeLabel = THEME_LABELS[theme] || theme;
    if (query && count !== total) {
      return `${total}枚中、${count}枚を表示しています。テーマ別の読み：${themeLabel}`;
    }
    return `${count}枚を表示しています。テーマ別の読み：${themeLabel}`;
  }

  function renderCard(card, details) {
    const themeContext = getThemeContext(details, selectedTheme);
    const preview = getPreviewText(details, themeContext);
    const keywords = selectedTheme === "general"
      ? details.uprightKeywords.slice(0, 5)
      : [...details.uprightKeywords.slice(0, 3), ...details.reversedKeywords.slice(0, 2)];

    return `
      <article class="cards-index-card" id="${escapeHtml(getCardElementId(card.id))}" data-card-id="${escapeHtml(card.id)}" tabindex="-1">
        <button
          type="button"
          class="cards-card-image image-zoom-button js-open-image-dialog"
          data-image-src="${escapeHtml(imageFor(details, "large"))}"
          data-image-alt="${escapeHtml(details.alt)}"
          data-image-orientation="upright"
          aria-label="${escapeHtml(details.label)}の画像を拡大表示"
        >
          <img src="${escapeHtml(imageFor(details, "medium"))}" alt="${escapeHtml(details.alt)}" width="640" height="960" loading="lazy" decoding="async">
          <span class="image-zoom-hint" aria-hidden="true">拡大</span>
        </button>

        <div class="cards-index-body">
          <h3>${escapeHtml(details.label)}</h3>
          ${card.names?.en ? `<p class="cards-card-en">${escapeHtml(card.names.en)}</p>` : ""}
          ${details.core ? `<p class="core-meaning"><strong>核：</strong>${escapeHtml(details.core)}</p>` : ""}
          ${preview ? `<p class="cards-preview"><strong>${escapeHtml(getPreviewLabel(themeContext))}：</strong>${escapeHtml(preview)}</p>` : ""}
          ${renderInlineList("キーワード", keywords)}

          <details class="result-section cards-card-detail">
            <summary>詳しく見る</summary>
            <div class="cards-detail-grid">
              <section class="mini-section">
                <h4>正位置</h4>
                ${renderInlineList("キーワード", details.uprightKeywords)}
                ${renderMeaning(details.upright)}
              </section>

              <section class="mini-section">
                <h4>逆位置</h4>
                ${renderInlineList("キーワード", details.reversedKeywords)}
                ${renderMeaning(details.reversed)}
              </section>
            </div>
          </details>
          ${renderSelectedTheme(details, selectedTheme)}
          ${renderQuestions(details.questions)}
          ${renderOriginalDeck(details.originalDeck)}
          ${renderRelations(details.related)}
        </div>
      </article>
    `;
  }

  function getThemeContext(details, theme) {
    if (theme === "general") return null;
    return (details.contexts || []).find((context) => context.key === theme) || null;
  }

  function getPreviewText(details, themeContext) {
    if (themeContext?.upright) return themeContext.upright;
    return details.upright?.short || details.core || "";
  }

  function getPreviewLabel(themeContext) {
    return themeContext?.label || "共通";
  }

  function renderSelectedTheme(details, theme) {
    const contexts = details.contexts || [];
    if (!contexts.length) return "";
    const selected = theme === "general"
      ? contexts
      : contexts.filter((context) => context.key === theme);
    if (!selected.length) return "";

    const summary = theme === "general" ? "テーマ別解釈" : `${THEME_LABELS[theme] || theme}の読み`;
    return `
      <details class="result-section" ${theme !== "general" ? "open" : ""}>
        <summary>${escapeHtml(summary)}</summary>
        ${selected.map((context) => `
          <section class="mini-section ${context.key === theme ? "is-selected-theme" : ""}">
            <h4>${escapeHtml(context.label)}</h4>
            ${context.upright ? `<p><strong>正位置：</strong>${escapeHtml(context.upright)}</p>` : ""}
            ${context.reversed ? `<p><strong>逆位置：</strong>${escapeHtml(context.reversed)}</p>` : ""}
          </section>
        `).join("")}
      </details>
    `;
  }

  function renderMeaning(meaning) {
    if (!meaning) return "";
    return `
      ${meaning.short ? `<p>${escapeHtml(meaning.short)}</p>` : ""}
      ${meaning.long ? `<p>${escapeHtml(meaning.long)}</p>` : ""}
      ${meaning.advice ? `<p><strong>助言：</strong>${escapeHtml(meaning.advice)}</p>` : ""}
      ${meaning.caution ? `<p><strong>注意：</strong>${escapeHtml(meaning.caution)}</p>` : ""}
    `;
  }

  function renderQuestions(questions) {
    if (!questions?.length) return "";
    return `
      <details class="result-section">
        <summary>問いかけ</summary>
        <ul>${questions.map((question) => `<li>${escapeHtml(question)}</li>`).join("")}</ul>
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
        ${originalDeck.symbolism?.length ? `<h4>象徴</h4><ul>${originalDeck.symbolism.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
        ${originalDeck.notes ? `<p><strong>メモ：</strong>${escapeHtml(originalDeck.notes)}</p>` : ""}
      </details>
    `;
  }

  function renderRelations(related) {
    if (!related) return "";
    const hasAny = related.affinities?.length || related.tensions?.length || related.pairs?.length;
    if (!hasAny) return "";

    return `
      <details class="result-section">
        <summary>関連カード</summary>
        ${renderInlineList("相性", related.affinities)}
        ${renderInlineList("緊張", related.tensions)}
        ${related.pairs?.length ? `
          <h4>ペア解釈</h4>
          <ul>${related.pairs.map((pair) => `<li><strong>${escapeHtml(pair.label)}：</strong>${escapeHtml(pair.title)}${pair.text ? ` — ${escapeHtml(pair.text)}` : ""}</li>`).join("")}</ul>
        ` : ""}
      </details>
    `;
  }

  function renderInlineList(label, values) {
    const clean = [...new Set((values || []).filter(Boolean))];
    if (!clean.length) return "";
    return `<p class="tag-line"><strong>${escapeHtml(label)}：</strong>${clean.map((value) => `<span>${escapeHtml(value)}</span>`).join("")}</p>`;
  }

  function getSearchText(card, details) {
    const parts = [
      card.id,
      card.roman,
      card.number,
      card.names?.ja,
      card.names?.en,
      card.names?.label,
      details.label,
      details.core,
      details.uprightKeywords,
      details.reversedKeywords,
      Object.values(details.upright || {}),
      Object.values(details.reversed || {}),
      details.questions,
      details.originalDeck?.concept,
      details.originalDeck?.symbolism,
      details.originalDeck?.distinction,
      details.contexts?.flatMap((context) => [context.label, context.upright, context.reversed]),
      details.positions?.flatMap((position) => [position.label, position.upright, position.reversed])
    ];
    return normalize(flatten(parts).join(" "));
  }

  function flatten(values) {
    return values.flatMap((value) => {
      if (Array.isArray(value)) return flatten(value);
      if (value && typeof value === "object") return flatten(Object.values(value));
      return value == null ? [] : [String(value)];
    });
  }

  function normalize(value) {
    return String(value || "").trim().toLowerCase();
  }

  function bindImageDialogButtons(root = document) {
    const buttons = [...root.querySelectorAll(".js-open-image-dialog")];
    if (!buttons.length) return;

    const dialog = ensureImageDialog();

    buttons.forEach((button) => {
      if (button.dataset.imageDialogBound === "true") return;
      button.dataset.imageDialogBound = "true";
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        openImageDialog(dialog, button);
      });
    });
  }

  function ensureImageDialog() {
    if (imageDialog && document.body.contains(imageDialog)) return imageDialog;

    imageDialog = document.createElement("dialog");
    imageDialog.className = "image-dialog";
    imageDialog.innerHTML = `
      <div class="image-dialog-panel" role="document">
        <button type="button" class="image-dialog-close" aria-label="拡大画像を閉じる">×</button>
        <div class="image-dialog-frame">
          <img class="image-dialog-img" alt="">
        </div>
      </div>
    `;

    document.body.appendChild(imageDialog);

    imageDialog.querySelector(".image-dialog-close").addEventListener("click", closeImageDialog);
    imageDialog.addEventListener("click", (event) => {
      if (event.target === imageDialog) closeImageDialog();
    });
    imageDialog.addEventListener("close", () => {
      const img = imageDialog.querySelector(".image-dialog-img");
      img.removeAttribute("src");
      img.alt = "";
      imageDialog.classList.remove("is-reversed");
    });

    return imageDialog;
  }

  function closeImageDialog() {
    if (!imageDialog) return;
    if (typeof imageDialog.close === "function" && imageDialog.open) {
      imageDialog.close();
    } else {
      imageDialog.removeAttribute("open");
      const img = imageDialog.querySelector(".image-dialog-img");
      if (img) {
        img.removeAttribute("src");
        img.alt = "";
      }
      imageDialog.classList.remove("is-reversed");
    }
  }

  function openImageDialog(dialog, trigger) {
    const src = trigger.dataset.imageSrc;
    if (!src) return;

    const alt = trigger.dataset.imageAlt || "拡大表示したカード画像";
    const orientation = trigger.dataset.imageOrientation || "upright";
    const img = dialog.querySelector(".image-dialog-img");

    img.src = src;
    img.alt = alt;
    dialog.classList.toggle("is-reversed", orientation === "reversed");
    dialog.setAttribute("aria-label", alt);

    if (typeof dialog.showModal === "function") {
      dialog.showModal();
      dialog.querySelector(".image-dialog-close")?.focus();
    } else {
      dialog.setAttribute("open", "");
    }
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();
