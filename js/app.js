// App wiring only. Card data, engine logic, and rendering are separated.
(function () {
  const cards = window.TarotEngine.getCards();
  const spreadEl = document.querySelector("#spread");
  const contextEl = document.querySelector("#context");
  const useReversalsEl = document.querySelector("#use-reversals");
  const soundEnabledEl = document.querySelector("#sound-enabled");
  const animationEnabledEl = document.querySelector("#animation-enabled");
  const flipSoundEl = document.querySelector("#flip-sound");
  const synergySoundEl = document.querySelector("#synergy-sound");
  const backToTopEl = document.querySelector("#back-to-top");
  let imageDialog = null;
  let currentReading = null;
  let detailPanelResizeObserver = null;
  let hasUnsavedReading = false;
  let allowNavigationWithoutWarning = false;
  const UNSAVED_READING_MESSAGE = "この読みはまだ記録されていません。保存せずにページを離れますか？";
  const SETTINGS_STORAGE_KEY = "sallySanctumTarotSettings";
  const DEFAULT_SETTINGS = {
    useReversals: true,
    soundEnabled: true,
    animationEnabled: true
  };
  let appSettings = loadAppSettings();

  applySettingsToControls();
  applySettingsToPage();
  bindSettingsControls();

  document.querySelector("#draw-one").addEventListener("click", () => draw("one"));
  document.querySelector("#draw-three").addEventListener("click", () => draw("three"));
  document.querySelector("#draw-triad").addEventListener("click", () => draw("triad"));
  bindBackToTop();
  bindUnsavedNavigationWarning();

  spreadEl.innerHTML = window.TarotRender.renderEmptyState();

  function loadAppSettings() {
    try {
      const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!raw) return { ...DEFAULT_SETTINGS };
      const parsed = JSON.parse(raw);
      return {
        useReversals: typeof parsed.useReversals === "boolean" ? parsed.useReversals : DEFAULT_SETTINGS.useReversals,
        soundEnabled: typeof parsed.soundEnabled === "boolean" ? parsed.soundEnabled : DEFAULT_SETTINGS.soundEnabled,
        animationEnabled: typeof parsed.animationEnabled === "boolean" ? parsed.animationEnabled : DEFAULT_SETTINGS.animationEnabled
      };
    } catch (error) {
      return { ...DEFAULT_SETTINGS };
    }
  }

  function saveAppSettings() {
    try {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(appSettings));
    } catch (error) {
      // The app remains usable even when browser storage is unavailable.
    }
  }

  function applySettingsToControls() {
    if (useReversalsEl) useReversalsEl.checked = appSettings.useReversals;
    if (soundEnabledEl) soundEnabledEl.checked = appSettings.soundEnabled;
    if (animationEnabledEl) animationEnabledEl.checked = appSettings.animationEnabled;
  }

  function bindSettingsControls() {
    if (useReversalsEl) {
      useReversalsEl.addEventListener("change", () => {
        appSettings.useReversals = useReversalsEl.checked;
        saveAppSettings();
      });
    }

    if (soundEnabledEl) {
      soundEnabledEl.addEventListener("change", () => {
        appSettings.soundEnabled = soundEnabledEl.checked;
        applySoundPreference();
        saveAppSettings();
      });
    }

    if (animationEnabledEl) {
      animationEnabledEl.addEventListener("change", () => {
        appSettings.animationEnabled = animationEnabledEl.checked;
        applyAnimationPreference();
        saveAppSettings();
      });
    }
  }

  function applySettingsToPage() {
    applySoundPreference();
    applyAnimationPreference();
  }

  function applySoundPreference() {
    [flipSoundEl, synergySoundEl].forEach((audioEl) => {
      if (!audioEl) return;
      audioEl.muted = !isSoundEnabled();
      if (!isSoundEnabled()) {
        try {
          audioEl.pause();
          audioEl.currentTime = 0;
        } catch (error) {}
      }
    });
  }

  function applyAnimationPreference() {
    const disabled = !isAnimationEnabled();
    document.documentElement.classList.toggle("animations-off", disabled);
    document.body.classList.toggle("animations-off", disabled);

    if (disabled) {
      spreadEl.querySelectorAll(".slot").forEach((slot) => {
        slot.classList.add("revealed");
        slot.classList.remove("synergy-glow");
      });
      updateDetailCarouselHeight();
    }
  }

  function isUseReversalsEnabled() {
    return useReversalsEl ? useReversalsEl.checked : appSettings.useReversals;
  }

  function isSoundEnabled() {
    return !!appSettings.soundEnabled;
  }

  function isAnimationEnabled() {
    return !!appSettings.animationEnabled;
  }

  function draw(spreadType) {
    const reading = window.TarotEngine.drawSpread(spreadType, {
      question: "",
      context: contextEl.value,
      useReversals: isUseReversalsEnabled()
    });

    currentReading = reading;
    setUnsavedReading(true);
    spreadEl.innerHTML = window.TarotRender.renderReading(reading);

    scrollToSpread();
    bindDetailReader();
    bindImageDialogButtons(spreadEl);
    bindSaveReading();
    bindResetReadingButtons();

    const slots = [...spreadEl.querySelectorAll(".slot")];
    const animationEnabled = isAnimationEnabled();
    slots.forEach((slot, index) => {
      const button = slot.querySelector(".js-reveal-card");
      if (button) {
        button.addEventListener("click", (event) => {
          event.stopPropagation();
          revealSlot(slot);
          selectDetailPanel(slot.dataset.detailTarget);
        });
      }

      slot.addEventListener("click", () => {
        revealSlot(slot);
        selectDetailPanel(slot.dataset.detailTarget);
      });

      if (animationEnabled) {
        window.setTimeout(() => revealSlot(slot), 180 + index * 380);
      } else {
        revealSlot(slot, { silent: true });
      }
    });

    if (animationEnabled) {
      const glowStart = 180 + Math.max(slots.length - 1, 0) * 380 + 900;
      window.setTimeout(() => runDefinedSynergyGlow(reading), glowStart);
    }
  }


  function bindSaveReading() {
    const buttons = [...spreadEl.querySelectorAll(".js-save-reading")];
    const statuses = [...spreadEl.querySelectorAll(".js-save-status")];
    if (!buttons.length) return;

    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        if (!currentReading) return;

        if (!window.SallyTarotHistory || typeof window.SallyTarotHistory.saveReading !== "function") {
          setSaveStatuses("記録機能を読み込めませんでした。");
          return;
        }

        try {
          window.SallyTarotHistory.saveReading(currentReading);
          setUnsavedReading(false);
          buttons.forEach((saveButton) => {
            saveButton.disabled = true;
            saveButton.textContent = "記録済み";
          });
          setSaveStatuses('この読みを記録しました。<a href="history.html">記録を見る</a>', true);
        } catch (error) {
          console.error(error);
          setSaveStatuses("記録に失敗しました。ブラウザの保存容量や設定を確認してください。");
        }
      });
    });

    function setSaveStatuses(message, asHtml = false) {
      statuses.forEach((status) => {
        if (asHtml) {
          status.innerHTML = message;
        } else {
          status.textContent = message;
        }
      });
    }
  }

  function bindResetReadingButtons() {
    spreadEl.querySelectorAll(".js-reset-reading").forEach((button) => {
      button.addEventListener("click", resetSpread);
    });
  }

  function scrollToSpread() {
    const target = spreadEl.querySelector(".spread") || spreadEl;
    if (!target) return;

    const prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    window.requestAnimationFrame(() => {
      target.scrollIntoView({
        behavior: prefersReducedMotion || !isAnimationEnabled() ? "auto" : "smooth",
        block: "start",
        inline: "nearest"
      });
    });
  }

  function bindDetailReader() {
    const carousel = spreadEl.querySelector(".js-detail-carousel");
    const tabs = [...spreadEl.querySelectorAll(".js-detail-tab")];

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => selectDetailPanel(tab.dataset.detailKey));
    });

    if (carousel) {
      bindSwipeCarousel(carousel);
      bindDetailCarouselHeight(carousel);
      updateDetailCarouselPosition();
    }
  }

  function selectDetailPanel(key) {
    if (!key) return;
    setActiveDetailKey(key);
    updateDetailCarouselPosition();
  }

  function setActiveDetailKey(key) {
    const tabs = [...spreadEl.querySelectorAll(".js-detail-tab")];
    const panels = [...spreadEl.querySelectorAll(".detail-panel[data-detail-panel]")];

    tabs.forEach((tab) => {
      const active = tab.dataset.detailKey === key;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });

    panels.forEach((panel) => {
      const active = panel.dataset.detailPanel === key;
      panel.classList.toggle("is-active", active);
      panel.setAttribute("aria-hidden", active ? "false" : "true");
    });
  }

  function updateDetailCarouselPosition() {
    const carousel = spreadEl.querySelector(".js-detail-carousel");
    const panels = [...spreadEl.querySelectorAll(".detail-panel[data-detail-panel]")];
    if (!carousel || !panels.length) return;

    const activeIndex = Math.max(0, panels.findIndex((panel) => panel.classList.contains("is-active")));
    carousel.style.setProperty("--detail-index", String(activeIndex));
    updateDetailCarouselHeight();
  }

  function bindDetailCarouselHeight(carousel) {
    if (detailPanelResizeObserver) {
      detailPanelResizeObserver.disconnect();
      detailPanelResizeObserver = null;
    }

    const panels = [...carousel.querySelectorAll(".detail-panel[data-detail-panel]")];

    carousel.querySelectorAll("details").forEach((detailsEl) => {
      detailsEl.addEventListener("toggle", () => {
        window.requestAnimationFrame(updateDetailCarouselHeight);
      });
    });

    if (typeof ResizeObserver === "function") {
      detailPanelResizeObserver = new ResizeObserver(() => {
        window.requestAnimationFrame(updateDetailCarouselHeight);
      });
      panels.forEach((panel) => detailPanelResizeObserver.observe(panel));
    }

    window.requestAnimationFrame(updateDetailCarouselHeight);
  }

  function updateDetailCarouselHeight() {
    const carousel = spreadEl.querySelector(".js-detail-carousel");
    const activePanel = spreadEl.querySelector(".detail-panel.is-active[data-detail-panel]");
    if (!carousel || !activePanel) return;

    // The carousel contains all panels in one flex row. Without an explicit height,
    // the tallest inactive panel can create a large blank space under a shorter active panel.
    carousel.style.height = `${Math.ceil(activePanel.scrollHeight)}px`;
  }

  function bindSwipeCarousel(carousel) {
    let startX = 0;
    let startY = 0;
    let tracking = false;

    carousel.addEventListener("touchstart", (event) => {
      if (!event.touches || event.touches.length !== 1) return;
      const touch = event.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      tracking = true;
    }, { passive: true });

    carousel.addEventListener("touchend", (event) => {
      if (!tracking) return;
      tracking = false;
      const touch = event.changedTouches && event.changedTouches[0];
      if (!touch) return;

      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      // Treat only deliberate horizontal swipes as carousel navigation.
      // Vertical gestures remain normal page scrolling.
      if (absX < 42 || absX < absY * 1.25) return;

      moveDetailPanel(deltaX < 0 ? 1 : -1);
    }, { passive: true });

    carousel.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        moveDetailPanel(-1);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        moveDetailPanel(1);
      }
    });
  }

  function moveDetailPanel(direction) {
    const panels = [...spreadEl.querySelectorAll(".detail-panel[data-detail-panel]")];
    if (!panels.length) return;

    const activeIndex = Math.max(0, panels.findIndex((panel) => panel.classList.contains("is-active")));
    const nextIndex = Math.min(Math.max(activeIndex + direction, 0), panels.length - 1);
    const nextKey = panels[nextIndex]?.dataset.detailPanel;
    if (nextKey) selectDetailPanel(nextKey);
  }

  function revealSlot(slot, options = {}) {
    if (!slot || slot.classList.contains("revealed")) return;
    if (!options.silent) playFlipSound();
    slot.classList.add("revealed");
  }

  function runDefinedSynergyGlow(reading) {
    if (!isAnimationEnabled()) return;
    // Use the reading object itself as the source of truth.
    // v7 moved pair explanations into a hidden tab panel; depending on layout/CSS,
    // querying .pair-card in the DOM was too fragile. The engine already marks
    // card-pool-defined pair readings with inferred: false, so we highlight from that.
    const definedPairs = (reading?.pairs || []).filter((pair) => !pair.inferred && pair.left?.id && pair.right?.id);
    if (!definedPairs.length) return;

    definedPairs.forEach((pair, index) => {
      window.setTimeout(() => {
        const left = spreadEl.querySelector(`.slot[data-card-id="${cssEscape(pair.left.id)}"]`);
        const right = spreadEl.querySelector(`.slot[data-card-id="${cssEscape(pair.right.id)}"]`);
        const targets = [left, right].filter(Boolean);
        if (!targets.length) return;
        playSynergySound();
        pulseSlots(targets);
      }, index * 1550);
    });
  }

  function pulseSlots(slots) {
    slots.forEach((slot) => {
      slot.classList.remove("synergy-glow");
      // Force reflow so repeated pair highlights can replay the animation.
      void slot.offsetWidth;
      slot.classList.add("synergy-glow");
      window.setTimeout(() => slot.classList.remove("synergy-glow"), 1350);
    });
  }

  function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === "function") return window.CSS.escape(value);
    return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
  }

  function playFlipSound() {
    playSound(flipSoundEl);
  }

  function playSynergySound() {
    playSound(synergySoundEl);
  }

  function playSound(audioEl) {
    if (!audioEl || !isSoundEnabled()) return;

    try {
      audioEl.currentTime = 0;
      const playPromise = audioEl.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {});
      }
    } catch (error) {
      // Browsers may block audio. The reading remains usable without sound.
    }
  }


  function bindBackToTop() {
    if (!backToTopEl) return;

    const prefersReducedMotion = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let ticking = false;

    const updateVisibility = () => {
      const threshold = Math.max(420, window.innerHeight * 0.65);
      backToTopEl.classList.toggle("is-visible", window.scrollY > threshold);
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
        behavior: prefersReducedMotion() || !isAnimationEnabled() ? "auto" : "smooth"
      });
    });

    updateVisibility();
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

    imageDialog.querySelector(".image-dialog-close").addEventListener("click", () => {
      closeImageDialog();
    });

    imageDialog.addEventListener("click", (event) => {
      // Native <dialog> does not close on backdrop click by default.
      // Close only when the backdrop itself is clicked, not the image panel.
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
      // Fallback for older browsers. ESC support is native only when <dialog> is supported.
      dialog.setAttribute("open", "");
    }
  }

  function resetSpread() {
    currentReading = null;
    setUnsavedReading(false);
    if (detailPanelResizeObserver) {
      detailPanelResizeObserver.disconnect();
      detailPanelResizeObserver = null;
    }
    spreadEl.innerHTML = window.TarotRender.renderEmptyState();
  }

  function setUnsavedReading(value) {
    hasUnsavedReading = !!value;
    if (hasUnsavedReading) {
      allowNavigationWithoutWarning = false;
    }
  }

  function bindUnsavedNavigationWarning() {
    window.addEventListener("beforeunload", (event) => {
      if (!hasUnsavedReading || allowNavigationWithoutWarning) return;

      // Most modern browsers ignore custom text here and show their own wording.
      // Returning a value is still required to trigger the native confirmation UI.
      event.preventDefault();
      event.returnValue = "";
    });

    document.addEventListener("click", (event) => {
      const link = event.target.closest("a[href]");
      if (!link || !shouldConfirmLinkNavigation(event, link)) return;

      const ok = window.confirm(UNSAVED_READING_MESSAGE);
      if (!ok) {
        event.preventDefault();
        return;
      }

      allowNavigationWithoutWarning = true;
    }, true);
  }

  function shouldConfirmLinkNavigation(event, link) {
    if (!hasUnsavedReading || allowNavigationWithoutWarning) return false;
    if (event.defaultPrevented) return false;

    // Opening another tab/window does not discard the current reading.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
    const target = (link.getAttribute("target") || "").toLowerCase();
    if (target && target !== "_self") return false;

    const href = link.getAttribute("href") || "";
    if (!href || href.startsWith("#") || href.startsWith("javascript:") || href.startsWith("mailto:") || href.startsWith("tel:")) return false;

    try {
      const url = new URL(href, window.location.href);
      const currentWithoutHash = `${window.location.origin}${window.location.pathname}${window.location.search}`;
      const nextWithoutHash = `${url.origin}${url.pathname}${url.search}`;

      // Same-document hash movement is not a page transition.
      if (currentWithoutHash === nextWithoutHash && url.hash) return false;
    } catch (error) {
      // If URL parsing fails, keep the safer behavior and ask before leaving.
    }

    return true;
  }

})();
