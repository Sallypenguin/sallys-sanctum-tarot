(() => {
  const openButtons = Array.from(document.querySelectorAll('[data-site-menu-open]'));
  if (!openButtons.length) return;

  const focusableSelector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'summary',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  let activeDialog = null;
  let activeOpenButton = null;

  const getDialogForButton = (button) => {
    const id = button.getAttribute('aria-controls');
    if (!id) return null;
    return document.getElementById(id);
  };

  const isVisible = (element) => {
    if (!element || element.disabled) return false;
    if (element.closest('[hidden]')) return false;
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  };

  const getFocusableItems = (container) => {
    if (!container) return [];
    return Array.from(container.querySelectorAll(focusableSelector)).filter(isVisible);
  };

  const focusElement = (element, { immediate = false } = {}) => {
    if (!element) return;
    const applyFocus = () => {
      try {
        element.focus({ preventScroll: true });
      } catch (error) {
        try { element.focus(); } catch (innerError) {}
      }
    };
    if (immediate) {
      applyFocus();
      return;
    }
    window.setTimeout(applyFocus, 0);
  };

  const setBackToTopFocusable = (button, visible) => {
    if (!button) return;
    button.hidden = !visible;
    button.tabIndex = visible ? 0 : -1;
    button.classList.toggle('is-visible', visible);
  };

  const repairFocusability = () => {
    // Defensive cleanup for older patches: natural controls in visible content
    // must never remain tabindex=-1 because of a stale focus-management state.
    const selector = [
      'a[href][tabindex="-1"]',
      'button[tabindex="-1"]',
      'input[tabindex="-1"]',
      'select[tabindex="-1"]',
      'textarea[tabindex="-1"]',
      'summary[tabindex="-1"]'
    ].join(',');

    document.querySelectorAll(selector).forEach((element) => {
      if (element.classList.contains('detail-tab')) return;
      if (element.closest('dialog:not([open])')) return;
      if (element.closest('[hidden]')) return;
      if (element.closest('[aria-hidden="true"]')) return;
      if (element.closest('.detail-panel:not(.is-active)')) return;
      if (element.id === 'back-to-top' && !element.classList.contains('is-visible')) return;
      element.removeAttribute('tabindex');
    });
  };

  const closeDialog = (dialog, { restoreFocus = true } = {}) => {
    if (!dialog) return;
    const opener = activeOpenButton;

    if (typeof dialog.close === 'function' && dialog.open) {
      dialog.close();
    } else {
      dialog.removeAttribute('open');
      dialog.classList.remove('is-open');
    }

    dialog.removeAttribute('data-open');
    document.documentElement.classList.remove('site-menu-open');
    document.body.classList.remove('site-menu-open');

    if (opener) opener.setAttribute('aria-expanded', 'false');
    activeDialog = null;
    activeOpenButton = null;
    if (restoreFocus && opener) focusElement(opener);
  };

  const openDialog = (button) => {
    const dialog = getDialogForButton(button);
    if (!dialog) return;

    if (activeDialog && activeDialog !== dialog) {
      closeDialog(activeDialog, { restoreFocus: false });
    }

    activeDialog = dialog;
    activeOpenButton = button;
    button.setAttribute('aria-expanded', 'true');
    document.documentElement.classList.add('site-menu-open');
    document.body.classList.add('site-menu-open');
    dialog.setAttribute('data-open', 'true');

    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
      dialog.classList.add('is-open');
    }

    const firstMenuLink = dialog.querySelector('.site-menu-dialog__link');
    const firstFocusable = firstMenuLink || getFocusableItems(dialog)[0];
    focusElement(firstFocusable);
  };

  const toggleDialog = (button) => {
    const dialog = getDialogForButton(button);
    if (!dialog) return;
    if (activeDialog === dialog && (dialog.open || dialog.hasAttribute('open'))) {
      closeDialog(dialog, { restoreFocus: true });
    } else {
      openDialog(button);
    }
  };

  openButtons.forEach((button) => {
    button.setAttribute('aria-expanded', 'false');
    button.addEventListener('click', (event) => {
      event.preventDefault();
      toggleDialog(button);
    });
  });

  document.querySelectorAll('[data-site-menu-close]').forEach((button) => {
    button.addEventListener('click', () => {
      const dialog = button.closest('dialog');
      closeDialog(dialog, { restoreFocus: true });
    });
  });

  document.querySelectorAll('.site-menu-dialog').forEach((dialog) => {
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      closeDialog(dialog, { restoreFocus: true });
    });

    dialog.addEventListener('close', () => {
      const opener = activeOpenButton;
      dialog.removeAttribute('data-open');
      dialog.classList.remove('is-open');
      document.documentElement.classList.remove('site-menu-open');
      document.body.classList.remove('site-menu-open');
      if (opener) opener.setAttribute('aria-expanded', 'false');
      if (activeDialog === dialog) {
        activeDialog = null;
        activeOpenButton = null;
      }
    });

    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) closeDialog(dialog, { restoreFocus: true });
    });
  });

  // Fallback focus loop for browsers without native <dialog>. Native modal
  // dialogs already trap focus, so this only activates in the fallback state.
  document.addEventListener('keydown', (event) => {
    if (!activeDialog) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      closeDialog(activeDialog, { restoreFocus: true });
      return;
    }

    if (event.key !== 'Tab') return;

    const items = getFocusableItems(activeDialog);
    if (!items.length) return;

    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    const activeIndex = items.indexOf(active);

    if (activeIndex === -1) {
      event.preventDefault();
      focusElement(event.shiftKey ? last : first, { immediate: true });
      return;
    }

    if (event.shiftKey && active === first) {
      event.preventDefault();
      focusElement(last, { immediate: true });
      return;
    }

    if (!event.shiftKey && active === last) {
      event.preventDefault();
      focusElement(first, { immediate: true });
    }
  });

  // Keep stale tabindex states from older deployments from poisoning the main
  // focus order. This is intentionally narrow and avoids inactive tab panels.
  repairFocusability();
  const observer = new MutationObserver(() => repairFocusability());
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['tabindex', 'hidden', 'aria-hidden', 'class']
  });

  // Shared back-to-top focusability helper. Older implementation made the
  // invisible button tabbable; this keeps it out of the focus order until shown.
  const backToTop = document.getElementById('back-to-top');
  if (backToTop) {
    const syncBackToTop = () => setBackToTopFocusable(backToTop, window.scrollY > 420);
    syncBackToTop();
    window.addEventListener('scroll', syncBackToTop, { passive: true });
  }
})();
