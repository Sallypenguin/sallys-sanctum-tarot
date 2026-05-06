// Rule-based tarot engine.
// It knows how to draw cards, assign orientation, read schema-v2 fields,
// and build pair / spread summaries without using AI.
(function () {
  const ORIENTATION_LABELS = {
    upright: "正位置",
    reversed: "逆位置"
  };

  const POSITION_LABELS = {
    general: "総合",
    single: "一枚引き",
    past: "過去",
    present: "現在",
    future: "未来",
    advice: "助言",
    obstacle: "障害",
    outcome: "結果"
  };

  const CONTEXT_LABELS = {
    general: "総合",
    love: "恋愛・関係性",
    work: "仕事・活動",
    selfCare: "セルフケア",
    creation: "創作",
    creativity: "創作"
  };

  const DEFAULT_SPREADS = {
    one: [
      { id: "single", label: "現在のあなたへの一枚" }
    ],
    three: [
      { id: "past", label: "過去" },
      { id: "present", label: "現在" },
      { id: "future", label: "未来" }
    ],
    triad: [
      { id: "present", label: "状況" },
      { id: "obstacle", label: "障害" },
      { id: "advice", label: "助言" }
    ]
  };

  function getCards() {
    return Array.isArray(window.TAROT_CARDS) ? window.TAROT_CARDS : [];
  }

  function getIndex() {
    if (window.TAROT_CARD_INDEX) return window.TAROT_CARD_INDEX;
    return Object.fromEntries(getCards().map((card) => [card.id, card]));
  }

  function drawSpread(spreadType, options = {}) {
    const cards = getCards();
    const positions = DEFAULT_SPREADS[spreadType] || DEFAULT_SPREADS.one;
    const selected = shuffle([...cards]).slice(0, positions.length);
    const context = options.context || "general";
    const question = String(options.question || "").trim();
    const useReversals = options.useReversals !== false;

    const cardsInReading = selected.map((card, index) => {
      const orientation = useReversals && Math.random() < 0.5 ? "reversed" : "upright";
      const position = positions[index];
      return enrichDrawnCard(card, orientation, position, context);
    });

    return {
      spreadType,
      question,
      context,
      contextLabel: CONTEXT_LABELS[context] || context,
      useReversals,
      positions,
      cards: cardsInReading,
      pairs: getPairReadings(cardsInReading),
      summary: buildSpreadSummary(cardsInReading, context, useReversals)
    };
  }

  function enrichDrawnCard(card, orientation, position, context) {
    return {
      card,
      id: card.id,
      orientation,
      orientationLabel: ORIENTATION_LABELS[orientation] || orientation,
      position,
      label: getCardLabel(card),
      image: getCardImage(card),
      alt: getCardAlt(card),
      keywords: getKeywords(card, orientation),
      core: cleanText(card.meanings?.core),
      meaning: getMeaningObject(card, orientation),
      positionMeaning: getPositionMeaning(card, position.id, orientation),
      contextMeaning: getContextMeaning(card, context, orientation),
      questions: getQuestions(card),
      originalDeck: normalizeOriginalDeck(card.originalDeck),
      synergy: normalizeSynergy(card.synergy)
    };
  }

  function getCardLabel(card) {
    if (card.names?.label) return card.names.label;
    const roman = card.number?.roman || card.roman || card.number?.value || card.number || "";
    const ja = card.names?.ja || card.name || "";
    return `${roman} ${ja}`.trim();
  }

  function getCardImage(card) {
    return card.media?.image || card.image || "";
  }

  function getCardAlt(card) {
    return card.media?.alt || getCardLabel(card);
  }

  function getKeywords(card, orientation) {
    const direct = card.keywords?.[orientation];
    if (Array.isArray(direct) && direct.filter(Boolean).length) return direct.filter(Boolean);
    const upright = card.keywords?.upright;
    if (Array.isArray(upright) && upright.filter(Boolean).length) return upright.filter(Boolean);
    if (Array.isArray(card.keywords)) return card.keywords.filter(Boolean);
    return [];
  }

  function getMeaningObject(card, orientation) {
    const source = card.meanings?.[orientation] || {};
    return {
      short: cleanText(source.short),
      long: cleanText(source.long),
      advice: cleanText(source.advice),
      caution: cleanText(source.caution)
    };
  }

  function getPositionMeaning(card, positionId, orientation) {
    const byPosition = card.readingByPosition || {};
    const candidates = [positionId, positionId === "single" ? "present" : null, "general"]
      .filter(Boolean);

    for (const candidate of candidates) {
      const value = byPosition[candidate]?.[orientation];
      if (cleanText(value)) return cleanText(value);
    }
    return "";
  }

  function getContextMeaning(card, context, orientation) {
    if (!context || context === "general") return "";
    const contexts = card.contexts || {};
    const aliases = (context === "creation" || context === "creativity")
      ? ["creativity", "creation"]
      : [context];

    for (const key of aliases) {
      const value = contexts[key]?.[orientation];
      if (cleanText(value)) return cleanText(value);
    }
    return "";
  }

  function getAllContextMeanings(card) {
    const contexts = card.contexts || {};
    return Object.keys(contexts)
      .filter((key) => contexts[key] && (cleanText(contexts[key].upright) || cleanText(contexts[key].reversed)))
      .map((key) => ({
        key,
        label: CONTEXT_LABELS[key] || key,
        upright: cleanText(contexts[key].upright),
        reversed: cleanText(contexts[key].reversed)
      }));
  }

  function getAllPositionMeanings(card) {
    const positions = card.readingByPosition || {};
    return Object.keys(positions)
      .filter((key) => positions[key] && (cleanText(positions[key].upright) || cleanText(positions[key].reversed)))
      .map((key) => ({
        key,
        label: POSITION_LABELS[key] || key,
        upright: cleanText(positions[key].upright),
        reversed: cleanText(positions[key].reversed)
      }));
  }

  function getQuestions(card) {
    return Array.isArray(card.questions) ? card.questions.filter((item) => cleanText(item)) : [];
  }

  function normalizeOriginalDeck(originalDeck = {}) {
    return {
      concept: cleanText(originalDeck.concept),
      symbolism: Array.isArray(originalDeck.symbolism) ? originalDeck.symbolism.filter((item) => cleanText(item)) : [],
      distinction: cleanText(originalDeck.distinction),
      notes: cleanText(originalDeck.notes),
      status: cleanText(originalDeck.status)
    };
  }

  function normalizeSynergy(synergy = {}) {
    return {
      tags: arrayOrEmpty(synergy.tags),
      themes: arrayOrEmpty(synergy.themes),
      movement: cleanText(synergy.movement),
      tone: cleanText(synergy.tone),
      intensity: typeof synergy.intensity === "number" ? synergy.intensity : null,
      element: cleanText(synergy.element),
      polarity: cleanText(synergy.polarity),
      timeSense: cleanText(synergy.timeSense),
      affinities: arrayOrEmpty(synergy.affinities),
      tensions: arrayOrEmpty(synergy.tensions),
      pairs: synergy.pairs && typeof synergy.pairs === "object" ? synergy.pairs : {}
    };
  }

  function getPairReadings(drawnCards) {
    const pairs = [];

    // Read every pair in the spread, not only adjacent cards.
    // In a three-card spread this checks: 1-2, 1-3, and 2-3.
    // A pair is treated as "defined" only when synergy.pairs contains a usable
    // title or text. This lookup is independent of affinities/tensions.
    // Otherwise it falls back to the inferred keyword/theme reading.
    for (let leftIndex = 0; leftIndex < drawnCards.length; leftIndex++) {
      for (let rightIndex = leftIndex + 1; rightIndex < drawnCards.length; rightIndex++) {
        const left = drawnCards[leftIndex];
        const right = drawnCards[rightIndex];
        const defined = getDefinedPairSource(left, right);

        const source = defined || inferPair(left, right);
        const inferred = !defined;

        pairs.push({
          left,
          right,
          title: cleanText(source.title) || `${left.label} × ${right.label}`,
          text: cleanText(source.text) || "この2枚の関係は、タグやテーマの重なりから読む必要があります。",
          inferred
        });
      }
    }

    return pairs;
  }

  function getDefinedPairSource(left, right) {
    const direct = left.synergy?.pairs?.[right.id] || left.card.synergy?.pairs?.[right.id];
    const reverse = right.synergy?.pairs?.[left.id] || right.card.synergy?.pairs?.[left.id];

    if (hasPairContent(direct)) return direct;
    if (hasPairContent(reverse)) return reverse;
    return null;
  }

  function hasPairContent(pair) {
    return !!(pair && typeof pair === "object" && (cleanText(pair.title) || cleanText(pair.text)));
  }

  function inferPair(left, right) {
    const sharedTags = intersection(getSymbolTags(left), getSymbolTags(right)).slice(0, 5);
    const sharedThemes = intersection(left.synergy.themes, right.synergy.themes).slice(0, 3);
    const tension = left.synergy.tensions.includes(right.id) || right.synergy.tensions.includes(left.id);
    const affinity = left.synergy.affinities.includes(right.id) || right.synergy.affinities.includes(left.id);

    let title = affinity ? "響き合う2枚" : tension ? "緊張を含む2枚" : "並んだ2枚の流れ";
    let text = "";

    if (sharedTags.length) {
      text += `共通する象徴は「${sharedTags.join("・")}」です。`;
    } else if (sharedThemes.length) {
      text += `共通テーマは「${sharedThemes.join("・")}」です。`;
    } else {
      text += `${left.label}の「${left.synergy.movement || "流れ"}」と、${right.label}の「${right.synergy.movement || "流れ"}」をつなげて読みます。`;
    }

    if (affinity) text += " 互いを補強しやすい配置です。";
    if (tension) text += " ただし、両者のあいだには緊張や葛藤もあります。";
    if (!affinity && !tension) text += " 前後の位置関係から、変化の順番を見てください。";

    return { title, text };
  }

  function getSymbolTags(item) {
    // synergy.tags is optional because it often duplicates card keywords.
    // If a future card pool omits it, fall back to the selected-orientation keywords.
    const tags = Array.isArray(item.synergy?.tags) ? item.synergy.tags.filter((tag) => cleanText(tag)) : [];
    if (tags.length) return tags;
    return Array.isArray(item.keywords) ? item.keywords.filter((tag) => cleanText(tag)) : [];
  }

  function buildSpreadSummary(drawnCards, context, useReversals = true) {
    const allTags = drawnCards.flatMap((item) => getSymbolTags(item));
    const allThemes = drawnCards.flatMap((item) => item.synergy.themes);
    const topTags = topValues(allTags, 8);
    const topThemes = topValues(allThemes, 6);
    const movements = drawnCards.map((item) => item.synergy.movement).filter(Boolean);
    const tones = drawnCards.map((item) => item.synergy.tone).filter(Boolean);
    const elements = drawnCards.map((item) => item.synergy.element).filter(Boolean);
    const timeSenses = drawnCards.map((item) => item.synergy.timeSense).filter(Boolean);
    const intensities = drawnCards.map((item) => item.synergy.intensity).filter((value) => typeof value === "number");
    const averageIntensity = intensities.length
      ? Math.round((intensities.reduce((sum, value) => sum + value, 0) / intensities.length) * 10) / 10
      : null;

    const orientationPattern = useReversals
      ? drawnCards.map((item) => item.orientationLabel).join(" → ")
      : "逆位置なし（すべて正位置）";
    const positionFlow = drawnCards
      .map((item) => `${item.position.label}：${item.label}（${item.orientationLabel}）`)
      .join(" / ");

    return {
      context,
      contextLabel: CONTEXT_LABELS[context] || context,
      topTags,
      topThemes,
      movements,
      tones,
      elements,
      timeSenses,
      averageIntensity,
      orientationPattern,
      positionFlow,
      text: createSummaryText(drawnCards, topTags, averageIntensity)
    };
  }

  function createSummaryText(drawnCards, topTags, averageIntensity) {
    if (!drawnCards.length) return "";
    if (drawnCards.length === 1) {
      const item = drawnCards[0];
      return `${item.label}は「${item.keywords.slice(0, 3).join("・") || "象徴"}」を中心に、問いを見つめ直す一枚です。`;
    }

    const first = drawnCards[0];
    const last = drawnCards[drawnCards.length - 1];
    const tagText = topTags.length ? `全体では「${topTags.slice(0, 5).join("・")}」が強く出ています。` : "";
    const intensityText = averageIntensity ? `象徴の強度は ${averageIntensity}/5 程度です。` : "";
    return `${first.position.label}の${first.label}から、${last.position.label}の${last.label}へ向かう流れです。${tagText}${intensityText}`;
  }

  function getCardDetails(card) {
    return {
      label: getCardLabel(card),
      image: getCardImage(card),
      alt: getCardAlt(card),
      uprightKeywords: getKeywords(card, "upright"),
      reversedKeywords: getKeywords(card, "reversed"),
      core: cleanText(card.meanings?.core),
      upright: getMeaningObject(card, "upright"),
      reversed: getMeaningObject(card, "reversed"),
      questions: getQuestions(card),
      originalDeck: normalizeOriginalDeck(card.originalDeck),
      positions: getAllPositionMeanings(card),
      contexts: getAllContextMeanings(card),
      synergy: normalizeSynergy(card.synergy),
      related: getRelatedCards(card)
    };
  }

  function getRelatedCards(card) {
    const index = getIndex();
    const synergy = normalizeSynergy(card.synergy);
    return {
      affinities: synergy.affinities.map((id) => index[id]).filter(Boolean).map(getCardLabel),
      tensions: synergy.tensions.map((id) => index[id]).filter(Boolean).map(getCardLabel),
      pairs: Object.keys(synergy.pairs || {}).map((id) => ({
        id,
        label: index[id] ? getCardLabel(index[id]) : id,
        title: cleanText(synergy.pairs[id]?.title),
        text: cleanText(synergy.pairs[id]?.text)
      }))
    };
  }

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  function cleanText(value) {
    return String(value ?? "").trim();
  }

  function arrayOrEmpty(value) {
    return Array.isArray(value) ? value.filter((item) => cleanText(item)) : [];
  }

  function intersection(a = [], b = []) {
    const bSet = new Set(b);
    return [...new Set(a.filter((item) => bSet.has(item)))];
  }

  function topValues(values, limit) {
    const counts = new Map();
    values.filter(Boolean).forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), "ja"))
      .slice(0, limit)
      .map(([value]) => value);
  }

  function getDefinedPairStats() {
    const cards = getCards();
    const stats = cards.map((card) => {
      const pairs = normalizeSynergy(card.synergy).pairs;
      const definedPairs = Object.entries(pairs)
        .filter(([, pair]) => hasPairContent(pair))
        .map(([id]) => id);
      return { id: card.id, label: getCardLabel(card), definedPairs };
    });

    const total = stats.reduce((sum, item) => sum + item.definedPairs.length, 0);
    return { total, stats };
  }

  window.TarotEngine = {
    ORIENTATION_LABELS,
    POSITION_LABELS,
    CONTEXT_LABELS,
    DEFAULT_SPREADS,
    drawSpread,
    getCards,
    getCardDetails,
    getCardLabel,
    getCardImage,
    getCardAlt,
    getKeywords,
    getAllPositionMeanings,
    getAllContextMeanings,
    getPairReadings,
    buildSpreadSummary,
    getDefinedPairStats
  };
})();
