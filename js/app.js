// App wiring only. Card data, engine logic, and rendering are separated.
(function () {
  const cards = window.TarotEngine.getCards();
  const spreadEl = document.querySelector("#spread");
  const libraryEl = document.querySelector("#library");
  const libraryGridEl = document.querySelector("#library-grid");
  const contextEl = document.querySelector("#context");
  const useReversalsEl = document.querySelector("#use-reversals");
  const flipSoundEl = document.querySelector("#flip-sound");
  const synergySoundEl = document.querySelector("#synergy-sound");
  const backToTopEl = document.querySelector("#back-to-top");
  let imageDialog = null;

  document.querySelector("#draw-one").addEventListener("click", () => draw("one"));
  document.querySelector("#draw-three").addEventListener("click", () => draw("three"));
  document.querySelector("#reset").addEventListener("click", resetSpread);
  document.querySelector("#toggle-library").addEventListener("click", toggleLibrary);
  bindBackToTop();

  spreadEl.innerHTML = window.TarotRender.renderEmptyState();

  function draw(spreadType) {
    const reading = window.TarotEngine.drawSpread(spreadType, {
      question: "",
      context: contextEl.value,
      useReversals: useReversalsEl ? useReversalsEl.checked : true
    });

    spreadEl.innerHTML = window.TarotRender.renderReading(reading);

    scrollToSpread();
    bindDetailReader();
    bindImageDialogButtons(spreadEl);

    const slots = [...spreadEl.querySelectorAll(".slot")];
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

      window.setTimeout(() => revealSlot(slot), 180 + index * 380);
    });

    const glowStart = 180 + Math.max(slots.length - 1, 0) * 380 + 900;
    window.setTimeout(() => runDefinedSynergyGlow(reading), glowStart);
  }

  function scrollToSpread() {
    const target = spreadEl.querySelector(".spread") || spreadEl;
    if (!target) return;

    const prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    window.requestAnimationFrame(() => {
      target.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
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

  function revealSlot(slot) {
    if (!slot || slot.classList.contains("revealed")) return;
    playFlipSound();
    slot.classList.add("revealed");
  }

  function runDefinedSynergyGlow(reading) {
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
    if (!audioEl) return;

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
        behavior: prefersReducedMotion() ? "auto" : "smooth"
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
    spreadEl.innerHTML = window.TarotRender.renderEmptyState();
  }

  function toggleLibrary() {
    libraryEl.hidden = !libraryEl.hidden;

    if (!libraryEl.hidden && libraryGridEl.children.length === 0) {
      libraryGridEl.innerHTML = window.TarotRender.renderLibrary(cards);
      bindImageDialogButtons(libraryGridEl);
    }
  }
})();
