// Shared storage for the mini game: 悪魔と66の契約.
// Keeps the contract data small and independent from card image assets.
(function () {
  "use strict";

  const STORAGE_KEY = "sallySanctumTarotDevilStats";
  const VERSION = 1;
  const MAX_STAT_COUNT = 666;
  const DECK_IMAGE_ROOT = "data/decks/sallys-sanctum-tarot/images";
  const DEVIL_IMAGE_ROOT = `${DECK_IMAGE_ROOT}/devil`;

  // Add card IDs here when their devilized WebP variants are ready.
  // The file names must match the normal card images, e.g.
  // data/decks/sallys-sanctum-tarot/images/devil/large/16_tower.webp
  const DEVIL_IMAGE_VARIANT_CARD_IDS = [
    "major_00_fool",
    "major_01_magician",
    "major_02_high_priestess",
    "major_03_empress",
    "major_04_emperor",
    "major_05_hierophant",
    "major_06_lovers",
    "major_07_chariot",
    "major_08_strength",
    "major_09_hermit",
    "major_10_wheel_of_fortune",
    "major_11_justice",
    "major_12_hanged_man",
    "major_13_death",
    "major_14_temperance",
    "major_15_devil",
    "major_16_tower",
    "major_17_star",
    "major_18_moon",
    "major_19_sun",
    "major_20_judgement",
    "major_21_world"
  ];
  const DEVIL_IMAGE_VARIANT_CARD_ID_SET = new Set(DEVIL_IMAGE_VARIANT_CARD_IDS);

  const DEFAULT_RECORD = {
    version: VERSION,
    wins: 0,
    losses: 0,
    contracts: 0,
    contractedCardIds: []
  };

  function normalizeCount(value) {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) return 0;
    return Math.min(MAX_STAT_COUNT, Math.floor(number));
  }

  function normalizeContractedIds(value) {
    if (!Array.isArray(value)) return [];
    const seen = new Set();
    return value
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .filter((id) => {
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });
  }

  function normalizeRecord(record) {
    const contractedCardIds = normalizeContractedIds(record?.contractedCardIds);
    return {
      version: VERSION,
      wins: normalizeCount(record?.wins),
      losses: normalizeCount(record?.losses),
      contracts: contractedCardIds.length,
      contractedCardIds
    };
  }

  function readRecord() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_RECORD };
      return normalizeRecord(JSON.parse(raw));
    } catch (error) {
      return { ...DEFAULT_RECORD };
    }
  }

  function writeRecord(record) {
    const normalized = normalizeRecord(record);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      window.dispatchEvent(new CustomEvent("sally-devil-contracts-change", { detail: normalized }));
    } catch (error) {
      // The site remains usable when browser storage is unavailable.
    }
    return normalized;
  }

  function addContractedCard(cardId) {
    const id = String(cardId || "").trim();
    const record = readRecord();
    if (!id) return record;
    if (!record.contractedCardIds.includes(id)) {
      record.contractedCardIds.push(id);
    }
    return writeRecord(record);
  }

  function removeContractedCard(cardId) {
    const id = String(cardId || "").trim();
    const record = readRecord();
    record.contractedCardIds = record.contractedCardIds.filter((item) => item !== id);
    return writeRecord(record);
  }

  function spendWinToRemoveContract(cardId) {
    const id = String(cardId || "").trim();
    const record = readRecord();
    if (!id || !record.contractedCardIds.includes(id)) {
      return { ok: false, reason: "not_found", record };
    }
    if (record.wins < 1) {
      return { ok: false, reason: "no_wins", record };
    }
    record.wins -= 1;
    record.losses += 1;
    record.contractedCardIds = record.contractedCardIds.filter((item) => item !== id);
    return { ok: true, reason: "removed", record: writeRecord(record) };
  }

  function isCardContracted(cardId) {
    const id = String(cardId || "").trim();
    return !!id && readRecord().contractedCardIds.includes(id);
  }

  function resetRecord() {
    return writeRecord({ ...DEFAULT_RECORD, contractedCardIds: [] });
  }

  function normalizePath(src) {
    return String(src || "").trim().replaceAll("\\", "/");
  }

  function normalizeVariant(variant) {
    return ["thumb", "medium", "large", "source"].includes(variant) ? variant : "medium";
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

  function getDevilImageVariantSrc(src, variant = "medium") {
    const safeVariant = normalizeVariant(variant);
    const filename = safeVariant === "source" ? toSourceFilename(src) : toWebpFilename(src);
    if (!filename) return normalizePath(src);
    return `${DEVIL_IMAGE_ROOT}/${safeVariant}/${filename}`;
  }

  function getFallbackImageSet(src) {
    if (window.SallyImageAssets?.getImageSet) return window.SallyImageAssets.getImageSet(src);

    const original = normalizePath(src);
    const filename = toWebpFilename(original);
    return {
      original,
      source: `${DECK_IMAGE_ROOT}/source/${toSourceFilename(original)}`,
      thumb: `${DECK_IMAGE_ROOT}/thumb/${filename}`,
      medium: `${DECK_IMAGE_ROOT}/medium/${filename}`,
      large: `${DECK_IMAGE_ROOT}/large/${filename}`
    };
  }

  function hasDevilImageVariant(cardId) {
    const id = String(cardId || "").trim();
    return !!id && DEVIL_IMAGE_VARIANT_CARD_ID_SET.has(id);
  }

  function shouldUseDevilImageVariant(cardId) {
    return isCardContracted(cardId) && hasDevilImageVariant(cardId);
  }

  function getDisplayImageSet(src, cardId) {
    const fallback = getFallbackImageSet(src);
    if (!shouldUseDevilImageVariant(cardId)) return fallback;

    return {
      original: fallback.original,
      source: getDevilImageVariantSrc(src || fallback.original, "source"),
      thumb: getDevilImageVariantSrc(src || fallback.original, "thumb"),
      medium: getDevilImageVariantSrc(src || fallback.original, "medium"),
      large: getDevilImageVariantSrc(src || fallback.original, "large"),
      fallback,
      variant: "devil"
    };
  }

  function getDisplayImageSrc(src, cardId, variant = "medium") {
    const images = getDisplayImageSet(src, cardId);
    const safeVariant = normalizeVariant(variant);
    return images?.[safeVariant] || images?.medium || normalizePath(src);
  }

  window.SallyDevilContracts = {
    STORAGE_KEY,
    VERSION,
    MAX_STAT_COUNT,
    DECK_IMAGE_ROOT,
    DEVIL_IMAGE_ROOT,
    DEVIL_IMAGE_VARIANT_CARD_IDS: DEVIL_IMAGE_VARIANT_CARD_IDS.slice(),
    DEFAULT_RECORD,
    normalizeRecord,
    getRecord: readRecord,
    setRecord: writeRecord,
    addContractedCard,
    removeContractedCard,
    spendWinToRemoveContract,
    resetRecord,
    isCardContracted,
    hasDevilImageVariant,
    shouldUseDevilImageVariant,
    getDevilImageVariantSrc,
    getDisplayImageSet,
    getDisplayImageSrc,
    getContractedCardIds() {
      return readRecord().contractedCardIds.slice();
    }
  };
})();
