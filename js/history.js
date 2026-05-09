// Reading history page rendering.
(function () {
  const rootEl = document.querySelector("#history-root");
  const clearButton = document.querySelector("#clear-history");
  const spreadFilter = document.querySelector("#spread-filter");
  const dateFilter = document.querySelector("#date-filter");
  const sortOrder = document.querySelector("#sort-order");
  const resetFiltersButton = document.querySelector("#reset-history-filters");
  const filterStatus = document.querySelector("#history-filter-status");
  const backToTopEl = document.querySelector("#back-to-top");

  if (!rootEl) return;

  function imageFor(card, variant = "medium") {
    const images = card?.images || (window.SallyImageAssets?.getImageSet ? window.SallyImageAssets.getImageSet(card?.image) : null);
    return images?.[variant] || card?.image || "";
  }

  bindBackToTop();
  render();

  clearButton?.addEventListener("click", () => {
    const records = getRecords();
    if (!records.length) return;
    const ok = window.confirm("すべての記録を削除しますか？\nこの操作は元に戻せません。");
    if (!ok) return;
    window.SallyTarotHistory.clearReadings();
    clearFilters();
    render();
  });

  spreadFilter?.addEventListener("change", render);
  dateFilter?.addEventListener("change", render);
  sortOrder?.addEventListener("change", render);
  resetFiltersButton?.addEventListener("click", () => {
    clearFilters();
    render();
  });

  rootEl.addEventListener("click", (event) => {
    const imageButton = event.target.closest(".js-open-image-dialog");
    if (imageButton) {
      event.preventDefault();
      event.stopPropagation();
      openImageDialog(ensureImageDialog(), imageButton);
      return;
    }

    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const entry = button.closest(".history-entry");
    const id = entry?.dataset.historyId;
    if (!id) return;

    if (button.dataset.action === "toggle") {
      const detail = entry.querySelector(".history-detail");
      const expanded = button.getAttribute("aria-expanded") === "true";
      button.setAttribute("aria-expanded", expanded ? "false" : "true");
      button.textContent = expanded ? "もう一度見る" : "閉じる";
      if (detail) detail.hidden = expanded;
    }

    if (button.dataset.action === "delete") {
      const ok = window.confirm("この記録を削除しますか？");
      if (!ok) return;
      window.SallyTarotHistory.removeReading(id);
      render();
    }
  });


  function bindBackToTop() {
    if (!backToTopEl) return;

    const prefersReducedMotion = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let ticking = false;

    const updateVisibility = () => {
      const threshold = Math.max(420, window.innerHeight * 0.65);
      const visible = window.scrollY > threshold;
      backToTopEl.hidden = !visible;
      backToTopEl.tabIndex = visible ? 0 : -1;
      backToTopEl.classList.toggle("is-visible", visible);
      ticking = false;
    };

    window.addEventListener("scroll", () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(updateVisibility);
    }, { passive: true });

    window.addEventListener("resize", () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(updateVisibility);
    }, { passive: true });

    backToTopEl.addEventListener("click", () => {
      window.scrollTo({
        top: 0,
        behavior: prefersReducedMotion() ? "auto" : "smooth"
      });
    });

    updateVisibility();
  }

  function render() {
    const records = getRecords();
    const filteredRecords = sortRecords(filterRecords(records));
    const hasActiveFilters = filtersAreActive();

    if (clearButton) clearButton.disabled = !records.length;
    if (resetFiltersButton) resetFiltersButton.disabled = !hasActiveFilters;
    updateFilterStatus(records.length, filteredRecords.length, hasActiveFilters);

    if (!records.length) {
      rootEl.innerHTML = `
        <div class="empty-state history-empty">
          <p>まだ記録された読みはありません。</p>
          <p>残しておきたい読みが現れたら、結果画面から記録できます。</p>
        </div>
      `;
      return;
    }

    if (!filteredRecords.length) {
      rootEl.innerHTML = `
        <div class="empty-state history-empty">
          <p>条件に合う記録はありません。</p>
          <p>読み方や日付の絞り込みを変えると、他の記録を見られます。</p>
        </div>
      `;
      return;
    }

    rootEl.innerHTML = filteredRecords.map(renderEntry).join("");
  }

  function getRecords() {
    if (!window.SallyTarotHistory || typeof window.SallyTarotHistory.loadReadings !== "function") return [];
    return window.SallyTarotHistory.loadReadings();
  }

  function filterRecords(records) {
    const selectedSpread = spreadFilter?.value || "all";
    const selectedDate = dateFilter?.value || "";

    return records.filter((record) => {
      const spreadType = normalizeSpreadType(record.spreadType);
      const spreadMatches = selectedSpread === "all" || spreadType === selectedSpread;
      const dateMatches = !selectedDate || toDateInputValue(record.savedAt) === selectedDate;
      return spreadMatches && dateMatches;
    });
  }

  function sortRecords(records) {
    const direction = sortOrder?.value === "oldest" ? 1 : -1;
    return records.slice().sort((a, b) => {
      const left = Date.parse(a.savedAt || "");
      const right = Date.parse(b.savedAt || "");
      const safeLeft = Number.isNaN(left) ? 0 : left;
      const safeRight = Number.isNaN(right) ? 0 : right;
      return (safeLeft - safeRight) * direction;
    });
  }

  function normalizeSpreadType(value) {
    if (value === "situationAdvice") return "triad";
    return value || "";
  }

  function filtersAreActive() {
    return (spreadFilter?.value && spreadFilter.value !== "all") || !!dateFilter?.value;
  }

  function clearFilters() {
    if (spreadFilter) spreadFilter.value = "all";
    if (dateFilter) dateFilter.value = "";
  }

  function updateFilterStatus(totalCount, filteredCount, hasActiveFilters) {
    if (!filterStatus) return;

    if (!totalCount) {
      filterStatus.textContent = "";
      return;
    }

    if (!hasActiveFilters) {
      filterStatus.textContent = `${totalCount}件の記録があります。`;
      return;
    }

    filterStatus.textContent = `${totalCount}件中、${filteredCount}件を表示しています。絞り込み中です。`;
  }

  function renderEntry(record) {
    const cards = Array.isArray(record.cards) ? record.cards : [];
    const pairs = Array.isArray(record.pairs) ? record.pairs : [];
    const flow = cards.map((card) => `${card.positionLabel}：${card.label}（${card.orientationLabel}）`).join(" / ");

    return `
      <article class="history-entry" data-history-id="${escapeHtml(record.id)}">
        <header class="history-entry-header">
          <div>
            <p class="history-date">${escapeHtml(formatDate(record.savedAt))}</p>
            <h3>${escapeHtml(record.spreadLabel || "リーディング")}</h3>
            <p class="history-meta">${escapeHtml(record.contextLabel || "総合")} / ${record.useReversals ? "逆位置ON" : "逆位置OFF"}</p>
          </div>
          <div class="history-entry-actions">
            <button type="button" data-action="toggle" aria-expanded="false">もう一度見る</button>
            <button type="button" data-action="delete" class="secondary danger">削除</button>
          </div>
        </header>

        ${renderHistoryThumbnails(cards)}
        ${flow ? `<p class="history-flow">${escapeHtml(flow)}</p>` : ""}
        ${record.summary?.text ? `<p class="history-summary">${escapeHtml(record.summary.text)}</p>` : ""}

        <section class="history-detail" hidden>
          <div class="history-card-list">
            ${cards.map(renderHistoryCard).join("")}
          </div>
          ${pairs.length ? renderPairs(pairs) : ""}
        </section>
      </article>
    `;
  }

  function renderHistoryThumbnails(cards) {
    const cleanCards = Array.isArray(cards) ? cards.filter((card) => card?.image || card?.images?.medium) : [];
    if (!cleanCards.length) return "";

    return `
      <div class="history-thumbnail-strip" aria-label="この記録のカード">
        ${cleanCards.map(renderHistoryThumbnail).join("")}
      </div>
    `;
  }

  function renderHistoryThumbnail(card) {
    const orientation = card.orientation === "reversed" ? "reversed" : "upright";
    const alt = card.alt || `${card.label}のカード画像`;
    const label = `${card.positionLabel ? `${card.positionLabel}：` : ""}${card.label || "カード"}${card.orientationLabel ? `（${card.orientationLabel}）` : ""}`;

    return `
      <button
        type="button"
        class="history-thumbnail-button ${orientation === "reversed" ? "reversed" : ""} js-open-image-dialog"
        data-image-src="${escapeHtml(imageFor(card, "large"))}"
        data-image-alt="${escapeHtml(alt)}"
        data-image-orientation="${escapeHtml(orientation)}"
        aria-label="${escapeHtml(label)}の画像を拡大表示"
        title="${escapeHtml(label)}"
      >
        <img src="${escapeHtml(imageFor(card, "thumb"))}" alt="${escapeHtml(alt)}" width="240" height="360" loading="lazy" decoding="async">
        <span>${escapeHtml(card.positionLabel || card.label || "")}</span>
      </button>
    `;
  }

  function renderHistoryCard(card) {
    const orientation = card.orientation === "reversed" ? "reversed" : "upright";
    const alt = card.alt || `${card.label}のカード画像`;

    return `
      <article class="history-card-item">
        <figure class="history-card-figure ${orientation === "reversed" ? "reversed" : ""}">
          <button
            type="button"
            class="history-card-image-button image-zoom-button js-open-image-dialog"
            data-image-src="${escapeHtml(imageFor(card, "large"))}"
            data-image-alt="${escapeHtml(alt)}"
            data-image-orientation="${escapeHtml(orientation)}"
            aria-label="${escapeHtml(card.label)}の画像を拡大表示"
          >
            <img src="${escapeHtml(imageFor(card, "medium"))}" alt="${escapeHtml(alt)}" width="640" height="960" loading="lazy" decoding="async">
            <span class="image-zoom-hint" aria-hidden="true">拡大</span>
          </button>
        </figure>
        <div class="history-card-body">
          <p class="slot-title">${escapeHtml(card.positionLabel)}</p>
          <h4>${escapeHtml(card.label)}</h4>
          <p class="orientation">${escapeHtml(card.orientationLabel)}</p>
          ${renderInlineList("キーワード", card.keywords)}
          ${card.shortText ? `<p class="lead">${escapeHtml(card.shortText)}</p>` : ""}
          <details class="result-section">
            <summary>今回の読み</summary>
            ${card.meaning?.short ? `<p>${escapeHtml(card.meaning.short)}</p>` : ""}
            ${card.positionMeaning ? `<p><strong>${escapeHtml(card.positionLabel)}として：</strong>${escapeHtml(card.positionMeaning)}</p>` : ""}
            ${card.contextMeaning ? `<p><strong>相談テーマとして：</strong>${escapeHtml(card.contextMeaning)}</p>` : ""}
            ${card.meaning?.long ? `<p>${escapeHtml(card.meaning.long)}</p>` : ""}
            ${card.meaning?.advice ? `<p><strong>助言：</strong>${escapeHtml(card.meaning.advice)}</p>` : ""}
            ${card.meaning?.caution ? `<p><strong>注意：</strong>${escapeHtml(card.meaning.caution)}</p>` : ""}
          </details>
          ${card.questions?.length ? `
            <details class="result-section">
              <summary>問いかけ</summary>
              <ul>${card.questions.map((question) => `<li>${escapeHtml(question)}</li>`).join("")}</ul>
            </details>
          ` : ""}
        </div>
      </article>
    `;
  }


  function ensureImageDialog() {
    let dialog = document.querySelector(".image-dialog");
    if (dialog) return dialog;

    dialog = document.createElement("dialog");
    dialog.className = "image-dialog";
    dialog.innerHTML = `
      <div class="image-dialog-panel" role="document">
        <button type="button" class="image-dialog-close" aria-label="拡大画像を閉じる">×</button>
        <div class="image-dialog-frame">
          <img class="image-dialog-img" alt="">
        </div>
      </div>
    `;

    document.body.appendChild(dialog);

    dialog.querySelector(".image-dialog-close").addEventListener("click", () => {
      closeImageDialog(dialog);
    });

    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) closeImageDialog(dialog);
    });

    dialog.addEventListener("close", () => {
      const img = dialog.querySelector(".image-dialog-img");
      img.removeAttribute("src");
      img.alt = "";
      dialog.classList.remove("is-reversed");
    });

    return dialog;
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

  function closeImageDialog(dialog) {
    if (!dialog) return;

    if (typeof dialog.close === "function" && dialog.open) {
      dialog.close();
      return;
    }

    dialog.removeAttribute("open");
    const img = dialog.querySelector(".image-dialog-img");
    if (img) {
      img.removeAttribute("src");
      img.alt = "";
    }
    dialog.classList.remove("is-reversed");
  }

  function renderPairs(pairs) {
    return `
      <section class="history-pairs">
        <h3>カード同士のシナジー</h3>
        <div class="pair-grid">
          ${pairs.map((pair) => `
            <article class="pair-card ${pair.inferred ? "inferred" : "defined"}">
              <h4 class="pair-flow">${escapeHtml(pair.left?.positionLabel || "")} → ${escapeHtml(pair.right?.positionLabel || "")}</h4>
              <p class="pair-title"><strong>${escapeHtml(pair.title)}</strong></p>
              <p>${escapeHtml(pair.text)}</p>
              <p class="pair-source">${pair.inferred ? "テーマ・関係性からの自動補助読み" : "カードプール内のペア解釈"}</p>
            </article>
          `).join("")}
        </div>
      </section>
    `;
  }

  function renderInlineList(label, values) {
    const clean = Array.isArray(values) ? values.filter(Boolean) : [];
    if (!clean.length) return "";
    return `<p class="tag-line"><strong>${escapeHtml(label)}：</strong>${clean.map((value) => `<span>${escapeHtml(value)}</span>`).join("")}</p>`;
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "日時不明";
    return new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  }

  function toDateInputValue(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
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
