// Local reading history store for Sally's Sanctum Tarot.
// Saves snapshots only; it does not modify or depend on js/card-pool.js.
(function () {
  const STORAGE_KEY = "sallysSanctumTarot.readingHistory.v1";
  const FORMAT_VERSION = 1;
  const MAX_RECORDS = 80;

  function loadReadings() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((item) => item && typeof item === "object" && item.id)
        .sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
    } catch (error) {
      console.warn("Could not load tarot reading history.", error);
      return [];
    }
  }

  function writeReadings(records) {
    const safeRecords = Array.isArray(records) ? records.slice(0, MAX_RECORDS) : [];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(safeRecords));
    return safeRecords;
  }

  function saveReading(reading) {
    const record = createSnapshot(reading);
    const records = loadReadings();
    writeReadings([record, ...records].slice(0, MAX_RECORDS));
    return record;
  }

  function removeReading(id) {
    const records = loadReadings().filter((record) => record.id !== id);
    writeReadings(records);
    return records;
  }

  function clearReadings() {
    window.localStorage.removeItem(STORAGE_KEY);
  }

  function createSnapshot(reading) {
    const savedAt = new Date().toISOString();
    const cards = Array.isArray(reading?.cards) ? reading.cards.map(snapshotCard) : [];

    return {
      version: FORMAT_VERSION,
      id: createId(savedAt),
      savedAt,
      spreadType: text(reading?.spreadType),
      spreadLabel: getSpreadLabel(reading?.spreadType),
      context: text(reading?.context),
      contextLabel: text(reading?.contextLabel),
      useReversals: reading?.useReversals !== false,
      summary: snapshotSummary(reading?.summary),
      cards,
      pairs: Array.isArray(reading?.pairs) ? reading.pairs.map(snapshotPair) : []
    };
  }

  function snapshotCard(item) {
    return {
      cardId: text(item?.id),
      label: text(item?.label),
      image: text(item?.image),
      alt: text(item?.alt),
      orientation: text(item?.orientation),
      orientationLabel: text(item?.orientationLabel),
      positionId: text(item?.position?.id),
      positionLabel: text(item?.position?.label),
      shortText: text(item?.contextMeaning || item?.positionMeaning || item?.meaning?.short || item?.core),
      core: text(item?.core),
      positionMeaning: text(item?.positionMeaning),
      contextMeaning: text(item?.contextMeaning),
      meaning: {
        short: text(item?.meaning?.short),
        long: text(item?.meaning?.long),
        advice: text(item?.meaning?.advice),
        caution: text(item?.meaning?.caution)
      },
      keywords: arrayOfText(item?.keywords),
      questions: arrayOfText(item?.questions)
    };
  }

  function snapshotPair(pair) {
    return {
      inferred: !!pair?.inferred,
      title: text(pair?.title),
      text: text(pair?.text),
      left: snapshotPairCard(pair?.left),
      right: snapshotPairCard(pair?.right)
    };
  }

  function snapshotPairCard(item) {
    return {
      cardId: text(item?.id),
      label: text(item?.label),
      image: text(item?.image),
      alt: text(item?.alt),
      orientation: text(item?.orientation),
      orientationLabel: text(item?.orientationLabel),
      positionLabel: text(item?.position?.label)
    };
  }

  function snapshotSummary(summary) {
    return {
      contextLabel: text(summary?.contextLabel),
      positionFlow: text(summary?.positionFlow),
      orientationPattern: text(summary?.orientationPattern),
      text: text(summary?.text),
      topThemes: arrayOfText(summary?.topThemes),
      movements: arrayOfText(summary?.movements),
      tones: arrayOfText(summary?.tones),
      elements: arrayOfText(summary?.elements),
      timeSenses: arrayOfText(summary?.timeSenses),
      averageIntensity: typeof summary?.averageIntensity === "number" ? summary.averageIntensity : null
    };
  }

  function getSpreadLabel(spreadType) {
    return ({
      one: "ワンオラクル",
      three: "スリーカード",
      triad: "トライアド"
    })[spreadType] || text(spreadType) || "リーディング";
  }

  function createId(savedAt) {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return `reading_${window.crypto.randomUUID()}`;
    }
    return `reading_${savedAt}_${Math.random().toString(36).slice(2, 10)}`;
  }

  function text(value) {
    return String(value ?? "").trim();
  }

  function arrayOfText(value) {
    return Array.isArray(value) ? value.map(text).filter(Boolean) : [];
  }

  window.SallyTarotHistory = {
    STORAGE_KEY,
    FORMAT_VERSION,
    MAX_RECORDS,
    loadReadings,
    saveReading,
    removeReading,
    clearReadings
  };
})();
