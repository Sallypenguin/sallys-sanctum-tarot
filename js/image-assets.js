// Image path helpers and preload utilities for Sally's Sanctum Tarot.
// Existing card data can keep legacy paths such as images/00_fool.png;
// this layer maps them to generated WebP variants under data/decks/.
(function () {
  const DECK_ID = "sallys-sanctum-tarot";
  const DECK_IMAGE_ROOT = `data/decks/${DECK_ID}/images`;
  const VALID_VARIANTS = new Set(["thumb", "medium", "large", "source"]);
  const DEFAULT_BACK_IMAGE = "images/back.png";

  function normalizePath(src) {
    return String(src || "").trim().replaceAll("\\\\", "/");
  }

  function normalizeVariant(variant) {
    return VALID_VARIANTS.has(variant) ? variant : "medium";
  }

  function getFilename(src) {
    const clean = normalizePath(src).split("#")[0].split("?")[0];
    const parts = clean.split("/").filter(Boolean);
    return parts[parts.length - 1] || "";
  }

  function toWebpFilename(src) {
    const filename = getFilename(src);
    if (!filename) return "";
    return filename.replace(/\.(png|jpg|jpeg|webp)$/i, ".webp");
  }

  function toSourceFilename(src) {
    const filename = getFilename(src);
    if (!filename) return "";
    return filename.replace(/\.(jpg|jpeg|webp)$/i, ".png");
  }

  function toCardImageVariant(src, variant = "medium") {
    const safeVariant = normalizeVariant(variant);
    const filename = toWebpFilename(src || DEFAULT_BACK_IMAGE);
    if (!filename) return normalizePath(src);
    if (safeVariant === "source") return `${DECK_IMAGE_ROOT}/source/${toSourceFilename(src || DEFAULT_BACK_IMAGE)}`;
    return `${DECK_IMAGE_ROOT}/${safeVariant}/${filename}`;
  }

  function getImageSet(src) {
    const original = normalizePath(src || DEFAULT_BACK_IMAGE);
    return {
      original,
      source: toCardImageVariant(original, "source"),
      thumb: toCardImageVariant(original, "thumb"),
      medium: toCardImageVariant(original, "medium"),
      large: toCardImageVariant(original, "large")
    };
  }

  function getCardBackImage(variant = "medium") {
    return toCardImageVariant(DEFAULT_BACK_IMAGE, variant);
  }

  function preloadImage(src) {
    return new Promise((resolve) => {
      const safeSrc = normalizePath(src);
      if (!safeSrc) {
        resolve({ src: safeSrc, ok: false });
        return;
      }

      const img = new Image();
      img.decoding = "async";

      img.onload = async () => {
        if (typeof img.decode === "function") {
          try {
            await img.decode();
          } catch (error) {
            // Some browsers reject decode() after load for non-fatal reasons.
          }
        }
        resolve({ src: safeSrc, ok: true });
      };

      img.onerror = () => resolve({ src: safeSrc, ok: false });
      img.src = safeSrc;
    });
  }

  function preloadImages(srcList, timeoutMs = 8000) {
    const uniqueSrcList = [...new Set((srcList || []).map(normalizePath).filter(Boolean))];
    if (!uniqueSrcList.length) return Promise.resolve([]);

    const loading = Promise.all(uniqueSrcList.map(preloadImage));
    const timeout = new Promise((resolve) => {
      window.setTimeout(() => resolve([]), timeoutMs);
    });

    return Promise.race([loading, timeout]);
  }

  function canWarmImageCache() {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection?.saveData) return false;
    if (connection?.effectiveType && /2g/.test(connection.effectiveType)) return false;
    return true;
  }

  function warmImageCache(srcList, options = {}) {
    if (!canWarmImageCache()) return;

    const urls = [...new Set((srcList || []).map(normalizePath).filter(Boolean))];
    const delayMs = typeof options.delayMs === "number" ? options.delayMs : 450;
    let index = 0;

    const loadNext = async () => {
      if (index >= urls.length) return;
      await preloadImage(urls[index]);
      index += 1;

      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(loadNext, { timeout: 2400 });
      } else {
        window.setTimeout(loadNext, delayMs);
      }
    };

    loadNext();
  }

  window.SallyImageAssets = {
    DECK_ID,
    DECK_IMAGE_ROOT,
    toCardImageVariant,
    getImageSet,
    getCardBackImage,
    preloadImage,
    preloadImages,
    warmImageCache,
    canWarmImageCache
  };
})();
