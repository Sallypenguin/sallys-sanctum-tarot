(() => {
  "use strict";

  const BUILD = "v98-records-copy-polish";
  const STATS_STORAGE_KEY = "sallySanctumTarotDevilStats";
  const RECORDS_STORAGE_KEY = "sallySanctumTarotDevilRecordsV1";
  const ACHIEVEMENTS_STORAGE_KEY = "sallySanctumTarotDevilAchievementsV1";
  const RECENT_RESULTS_LIMIT = 50;

  const ACHIEVEMENT_CANDIDATES = [
    { id: "a001", name: "扉を開けた者", category: "進行", kind: "deterministic", fixedTrials: 1, note: "悪魔の遊戯室を初めて開く。" },
    { id: "a002", name: "最初の札", category: "進行", kind: "deterministic", fixedTrials: 1, note: "初めて札を引く。" },
    { id: "a003", name: "ここで留まる者", category: "進行", tag: "player_stood", note: "初めて「ここで留まる」を選ぶ。" },
    { id: "a004", name: "館の客人", category: "進行", kind: "deterministic", fixedTrials: 10, note: "通算10戦遊ぶ。" },
    { id: "a005", name: "戻ってきた客人", category: "進行", kind: "deterministic", fixedTrials: 30, note: "通算30戦遊ぶ。" },
    { id: "a006", name: "常連", category: "進行", kind: "deterministic", fixedTrials: 66, note: "通算66戦遊ぶ。" },
    { id: "a007", name: "悪魔の帳簿に名を刻む者", category: "進行", kind: "deterministic", fixedTrials: 100, note: "通算100戦遊ぶ。" },
    { id: "a008", name: "まだ帰らない者", category: "進行", kind: "deterministic", fixedTrials: 300, note: "通算300戦遊ぶ。" },
    { id: "a009", name: "遊戯室の住人", category: "進行", kind: "deterministic", fixedTrials: 666, note: "通算666戦遊ぶ。" },
    { id: "a010", name: "初めての記録", category: "進行", tag: "game_completed", note: "初めて勝敗結果を見る。" },
    { id: "a011", name: "初めて悪魔を出し抜いた", category: "勝利", tag: "player_win", note: "初めて悪魔に勝利する。" },
    { id: "a012", name: "悪魔を伏せさせた者", category: "勝利", tag: "devil_surrender_win", note: "悪魔がこれ以上引けずに止まり、その勝負に勝利する。" },
    { id: "a013", name: "悪魔を焼いた者", category: "勝利", tag: "devil_bust_win", note: "悪魔が66を超えた勝負で勝利する。" },
    { id: "a014", name: "僅差の客人", category: "勝利", tag: "narrow_win", note: "1点差で勝利する。" },
    { id: "a015", name: "静かな勝利", category: "勝利", tag: "clean_win", note: "契約を使わずに勝利する。" },
    { id: "a016", name: "傷のない手", category: "勝利", kind: "cumulative", tag: "clean_win", targetCount: 5, note: "契約を使わずに5勝する。" },
    { id: "a017", name: "館に傷をつけた者", category: "勝利", kind: "cumulative", tag: "player_win", targetCount: 10, note: "通算10勝する。" },
    { id: "a018", name: "帳簿を汚す者", category: "勝利", kind: "cumulative", tag: "player_win", targetCount: 30, note: "通算30勝する。" },
    { id: "a019", name: "悪魔の眉を動かした者", category: "勝利", kind: "cumulative", tag: "player_win", targetCount: 66, note: "通算66勝する。" },
    { id: "a020", name: "悪魔が言葉を失った", category: "勝利", tag: "serious_exact66_win", note: "本気の悪魔を相手に、66ちょうどで勝利する。" },
    { id: "a021", name: "66の門", category: "点数", tag: "player_exact66_win", note: "66ちょうどで勝利する。" },
    { id: "a022", name: "門前の勝利", category: "点数", tag: "player65_win", note: "65で勝利する。" },
    { id: "a023", name: "一歩手前", category: "点数", tag: "player64_win", note: "64で勝利する。" },
    { id: "a024", name: "まだ遠い勝利", category: "点数", tag: "player55_57_win", note: "55〜57で勝利する。" },
    { id: "a025", name: "低く構えて刺す者", category: "点数", tag: "player57_or_less_win", note: "57以下で悪魔に勝利する。" },
    { id: "a026", name: "高みの罠", category: "点数", tag: "stand_high_loss", note: "63以上で留まり、悪魔に敗北する。" },
    { id: "a027", name: "門の向こうへ手を伸ばす", category: "点数", tag: "target_overdraw_attempt", note: "66に到達したあと、さらに一枚引く。" },
    { id: "a028", name: "66を見た、そして失った", category: "点数", tag: "perfect_bust_loss", note: "66に到達したあとさらに引き、66を超えて敗北する。" },
    { id: "a029", name: "同じ門、違う鍵", category: "点数", tag: "target_tie_loss", note: "66同点で悪魔に敗北する。" },
    { id: "a030", name: "あと一枚の錯覚", category: "点数", tag: "bust_after_65_plus", note: "65以上からさらに引き、66を超えて敗北する。" },
    { id: "a031", name: "最初の敗北", category: "敗北", tag: "devil_win", note: "初めて悪魔に敗北する。" },
    { id: "a032", name: "踏み越えた者", category: "敗北", tag: "player_bust_loss", note: "66を超えて敗北する。" },
    { id: "a033", name: "悪魔の規則", category: "敗北", tag: "tie_loss", note: "同点で悪魔に敗北する。" },
    { id: "a034", name: "拮抗ではなかった", category: "敗北", tag: "low_effort_tie_loss", note: "低い点数で同点になり、悪魔に敗北する。" },
    { id: "a035", name: "追い打ちの一枚", category: "敗北", tag: "low_effort_tie_punished_loss", hidden: true, note: "低い点数の同点から、悪魔がさらに一枚引いて勝利する。" },
    { id: "a036", name: "低すぎる祈り", category: "敗北", tag: "very_low_stand_loss", note: "35以下で留まり、悪魔に敗北する。" },
    { id: "a037", name: "届かない手", category: "敗北", tag: "middle_stand_loss", note: "50〜56で留まり、悪魔に敗北する。" },
    { id: "a038", name: "悪魔の一歩先", category: "敗北", tag: "near_stand_loss", note: "57〜62で留まり、悪魔に敗北する。" },
    { id: "a039", name: "一点の向こう側", category: "敗北", tag: "narrow_loss", note: "1点差で悪魔に敗北する。" },
    { id: "a040", name: "負けを知る者", category: "敗北", kind: "cumulative", tag: "devil_win", targetCount: 66, note: "通算66敗する。" },
    { id: "a041", name: "最初の契約", category: "契約", tag: "contract_accepted", note: "初めて契約を受け入れる。" },
    { id: "a042", name: "契約を拒む者", category: "契約", tag: "contract_rejected", note: "初めて契約を拒む。" },
    { id: "a043", name: "重い札に署名した", category: "契約", tag: "contract_card_high_arcana", note: "塔・星・月・太陽・審判・世界のいずれかを契約する。" },
    { id: "a044", name: "契約後の勝利", category: "契約", tag: "contract_win", note: "契約した勝負で勝利する。" },
    { id: "a045", name: "契約後の敗北", category: "契約", tag: "contract_loss", note: "契約した勝負で敗北する。" },
    { id: "a046", name: "甘い救済", category: "契約", tag: "contract_reflected_60_win", note: "契約後の点数が60以上になり、その勝負で勝利する。" },
    { id: "a047", name: "安すぎた代償", category: "契約", tag: "contract_reflected_under_55_loss", note: "契約後の点数が55未満になり、その勝負で敗北する。" },
    { id: "a048", name: "印付きの破滅", category: "契約", kind: "ledger", note: "契約済みのカードで66を超え、救済されずに敗北する。" },
    { id: "a049", name: "清算", category: "契約", kind: "ledger", note: "初めて契約を解除する。" },
    { id: "a050", name: "帳簿を軽くする者", category: "契約", kind: "ledger", note: "契約を5回解除する。" },
    { id: "a051", name: "すべては戻らない", category: "契約", kind: "ledger", note: "同時に契約中のカードが10枚以上になる。" },
    { id: "a052", name: "二十一の印", category: "契約", kind: "ledger", note: "愚者を除く21枚を、一度は契約する。" },
    { id: "a053", name: "余裕の隙", category: "機嫌", tag: "relaxed_win", note: "余裕の悪魔に勝利する。" },
    { id: "a054", name: "慢心を刺す者", category: "機嫌", tag: "relaxed_risk_bust_win", note: "余裕の悪魔が余計な一枚で66を超え、その勝負に勝利する。" },
    { id: "a055", name: "遊びすぎた悪魔", category: "機嫌", tag: "mood_risk_draw_twice", note: "悪魔が一勝負で2回、余計に札を引く。" },
    { id: "a056", name: "平静のひび", category: "機嫌", tag: "standard_risk_win", note: "平静の悪魔が余計な一枚を引いた勝負で勝利する。" },
    { id: "a057", name: "本気の悪魔を退けた", category: "機嫌", tag: "serious_win", note: "本気の悪魔に勝利する。" },
    { id: "a058", name: "本気にさせた者", category: "機嫌", kind: "cumulative", note: "あなたが悪魔に3勝以上勝ち越し、悪魔を本気にさせる。" },
    { id: "a059", name: "見下された者", category: "機嫌", kind: "cumulative", note: "悪魔があなたに5勝以上勝ち越し、余裕を見せる。" },
    { id: "a060", name: "それでも刺した者", category: "機嫌", tag: "relaxed_deficit_clean_win", note: "悪魔が5勝以上勝ち越して余裕を見せているとき、契約を使わずに勝利する。" },
    { id: "a061", name: "愚者の着地", category: "収集", tag: "last_draw_fool_win", note: "最後に引いたカードが愚者で、その勝負に勝利する。" },
    { id: "a062", name: "悪魔との契約", category: "収集", tag: "contract_card_devil", note: "悪魔カードを契約する。" },
    { id: "a063", name: "世界の終わりに署名した", category: "収集", tag: "contract_card_world", note: "世界カードを契約する。" },
    { id: "a064", name: "大アルカナの傷跡", category: "収集", kind: "ledger", note: "契約済みカードを5種類以上にする。" },
    { id: "a065", name: "敗北の蒐集家", category: "収集", kind: "compound", note: "複数の敗北の形を経験する。" },
    { id: "a066", name: "悪魔の遊戯室", category: "収集", kind: "meta", note: "主要実績を一定数解除する。" }
  ];

  const CATEGORY_ORDER = ["進行", "勝利", "点数", "敗北", "契約", "機嫌", "収集"];
  const MOOD_LABELS = { relaxed: "余裕", standard: "平静", serious: "本気" };
  const RESULT_LABELS = {
    win_clean: "契約なし勝利",
    win_contract: "契約後勝利",
    win_devil_bust: "悪魔バースト勝利",
    win_devil_surrender: "悪魔が止まった勝利",
    loss_clean: "通常敗北",
    loss_bust: "バースト敗北",
    loss_contract: "契約後敗北",
    loss_tie: "同点敗北",
    loss_target_tie: "66同点敗北",
    loss_marked_card_bust: "契約済み札でバースト",
    unknown: "不明"
  };

  const DEFAULT_STATS = { version: 1, wins: 0, losses: 0, contracts: 0, contractedCardIds: [] };

  function nowIsoString() { return new Date().toISOString(); }

  function safeParseJson(raw, fallback) {
    try { return raw ? JSON.parse(raw) : fallback; } catch (error) { return fallback; }
  }

  function normalizeCount(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
  }

  function normalizeStats(stats) {
    const contractedCardIds = Array.isArray(stats?.contractedCardIds)
      ? Array.from(new Set(stats.contractedCardIds.map((id) => String(id || "").trim()).filter(Boolean)))
      : [];
    return {
      version: 1,
      wins: normalizeCount(stats?.wins),
      losses: normalizeCount(stats?.losses),
      contracts: contractedCardIds.length,
      contractedCardIds
    };
  }

  function createDefaultRecords() {
    const now = nowIsoString();
    return {
      schemaVersion: 1,
      createdAt: now,
      updatedAt: now,
      current: {
        games: 0,
        playerWins: 0,
        devilWins: 0,
        currentPlayerStreak: 0,
        currentDevilStreak: 0,
        bestPlayerStreak: 0,
        bestDevilStreak: 0,
        playerTotalSum: 0,
        devilTotalSum: 0,
        resultTypes: {},
        scoreBuckets: {},
        contracts: { offered: 0, accepted: 0, rejected: 0, released: 0, contractWins: 0, contractLosses: 0, currentContractCountMax: 0 },
        moods: {
          relaxed: { games: 0, playerWins: 0, devilWins: 0 },
          standard: { games: 0, playerWins: 0, devilWins: 0 },
          serious: { games: 0, playerWins: 0, devilWins: 0 }
        },
        ai: { moodRiskDrawGames: 0, moodRiskDrawTotal: 0, moodRiskBustWins: 0, devilSurrenders: 0, lowEffortTiePunishes: 0, lowEffortTieNoSafeDraws: 0 },
        lossTypes: {},
        winTypes: {}
      },
      recentResults: []
    };
  }

  function normalizeRecords(records) {
    const defaults = createDefaultRecords();
    const source = records && typeof records === "object" ? records : {};
    const current = source.current && typeof source.current === "object" ? source.current : {};
    return {
      ...defaults,
      ...source,
      current: {
        ...defaults.current,
        ...current,
        resultTypes: { ...(current.resultTypes || {}) },
        scoreBuckets: { ...(current.scoreBuckets || {}) },
        contracts: { ...defaults.current.contracts, ...(current.contracts || {}) },
        moods: {
          relaxed: { ...defaults.current.moods.relaxed, ...(current.moods?.relaxed || {}) },
          standard: { ...defaults.current.moods.standard, ...(current.moods?.standard || {}) },
          serious: { ...defaults.current.moods.serious, ...(current.moods?.serious || {}) }
        },
        ai: { ...defaults.current.ai, ...(current.ai || {}) },
        lossTypes: { ...(current.lossTypes || {}) },
        winTypes: { ...(current.winTypes || {}) }
      },
      recentResults: Array.isArray(source.recentResults) ? source.recentResults.slice(0, RECENT_RESULTS_LIMIT) : []
    };
  }

  function createDefaultAchievements() {
    const now = nowIsoString();
    return {
      schemaVersion: 1,
      createdAt: now,
      updatedAt: now,
      unlocked: {},
      counters: { totalGames: 0, totalPlayerWins: 0, totalDevilWins: 0, cleanWins: 0, contractlessWins: 0, contractReleases: 0, eventTags: {} },
      flags: { lossTypes: {}, winTypes: {}, seenMoods: {}, contractedCardIdsEver: [], maxSimultaneousContracts: 0, hiddenRevealed: [] },
      progress: {}
    };
  }

  function normalizeAchievements(achievements) {
    const defaults = createDefaultAchievements();
    const source = achievements && typeof achievements === "object" ? achievements : {};
    const counters = source.counters && typeof source.counters === "object" ? source.counters : {};
    const flags = source.flags && typeof source.flags === "object" ? source.flags : {};
    return {
      ...defaults,
      ...source,
      unlocked: source.unlocked && typeof source.unlocked === "object" ? { ...source.unlocked } : {},
      counters: { ...defaults.counters, ...counters, eventTags: { ...(counters.eventTags || {}) } },
      flags: {
        ...defaults.flags,
        ...flags,
        lossTypes: { ...(flags.lossTypes || {}) },
        winTypes: { ...(flags.winTypes || {}) },
        seenMoods: { ...(flags.seenMoods || {}) },
        contractedCardIdsEver: Array.isArray(flags.contractedCardIdsEver) ? Array.from(new Set(flags.contractedCardIdsEver.filter(Boolean))) : [],
        hiddenRevealed: Array.isArray(flags.hiddenRevealed) ? Array.from(new Set(flags.hiddenRevealed.filter(Boolean))) : []
      },
      progress: source.progress && typeof source.progress === "object" ? { ...source.progress } : {}
    };
  }

  function loadStats() {
    if (window.SallyDevilContracts?.getRecord) return normalizeStats(window.SallyDevilContracts.getRecord());
    return normalizeStats(safeParseJson(window.localStorage.getItem(STATS_STORAGE_KEY), DEFAULT_STATS));
  }

  function saveStats(stats) {
    const normalized = normalizeStats(stats);
    if (window.SallyDevilContracts?.setRecord) return window.SallyDevilContracts.setRecord(normalized);
    window.localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  }

  function loadRecords() { return normalizeRecords(safeParseJson(window.localStorage.getItem(RECORDS_STORAGE_KEY), null)); }
  function saveRecords(records) { window.localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(normalizeRecords(records))); }
  function loadAchievements() { return normalizeAchievements(safeParseJson(window.localStorage.getItem(ACHIEVEMENTS_STORAGE_KEY), null)); }

  function resetGameRecordOnly() {
    saveStats(DEFAULT_STATS);
    saveRecords(createDefaultRecords());
  }

  function eraseAllDevilData() {
    const keys = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key && key.startsWith("sallySanctumTarotDevil")) keys.push(key);
    }
    keys.forEach((key) => window.localStorage.removeItem(key));
    return keys;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
  }

  function formatNumber(value) { return new Intl.NumberFormat("ja-JP").format(Number(value) || 0); }
  function formatPercent(part, total) { return total ? `${((Number(part) || 0) / total * 100).toFixed(1)}%` : "0.0%"; }
  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeStyle: "short" }).format(date);
  }

  function formatAchievementCode(id) {
    const match = String(id || "").match(/(\d+)$/);
    return match ? `No.${match[1].padStart(2, "0")}` : String(id || "");
  }

  function getMoodFromStats(stats) {
    const diff = (Number(stats.wins) || 0) - (Number(stats.losses) || 0);
    if (diff <= -5) return "relaxed";
    if (diff >= 5) return "serious";
    return "standard";
  }

  function getSummaryStats(records, stats) {
    const current = records.current || {};
    const legacyGames = (Number(stats.wins) || 0) + (Number(stats.losses) || 0);
    const games = Math.max(Number(current.games) || 0, legacyGames);
    const playerWins = Math.max(Number(current.playerWins) || 0, Number(stats.wins) || 0);
    const devilWins = Math.max(Number(current.devilWins) || 0, Number(stats.losses) || 0);
    return { games, playerWins, devilWins, contracts: stats.contractedCardIds.length, mood: getMoodFromStats(stats) };
  }

  function getProgress(candidate, achievements, records, stats) {
    const unlocked = !!achievements.unlocked[candidate.id];
    if (unlocked) return { current: 1, target: 1, label: "解除済み" };
    if (candidate.kind === "deterministic") {
      const target = Number(candidate.fixedTrials) || 1;
      const current = Math.min(Number(achievements.counters.totalGames) || Number(records.current.games) || 0, target);
      return { current, target, label: `${formatNumber(current)} / ${formatNumber(target)}` };
    }
    if (candidate.kind === "cumulative" && candidate.targetCount) {
      const progress = achievements.progress?.[candidate.id];
      const current = Math.min(Number(progress?.current) || Number(achievements.counters.eventTags?.[candidate.tag]) || 0, Number(candidate.targetCount));
      return { current, target: Number(candidate.targetCount), label: `${formatNumber(current)} / ${formatNumber(candidate.targetCount)}` };
    }
    if (candidate.id === "a048") return flagProgress(achievements.flags.lossTypes?.markedCardBust);
    if (candidate.id === "a049") return countProgress(achievements.counters.contractReleases, 1);
    if (candidate.id === "a050") return countProgress(achievements.counters.contractReleases, 5);
    if (candidate.id === "a051") return countProgress(achievements.flags.maxSimultaneousContracts, 10);
    if (candidate.id === "a052") return countProgress((achievements.flags.contractedCardIdsEver || []).length, 21);
    if (candidate.id === "a058") return flagProgress(achievements.flags.seenMoods?.serious);
    if (candidate.id === "a059") return flagProgress(achievements.flags.seenMoods?.relaxed);
    if (candidate.id === "a064") return countProgress((achievements.flags.contractedCardIdsEver || []).length, 5);
    if (candidate.id === "a065") {
      const keys = ["playerBust", "tieLoss", "targetTieLoss", "lowEffortTieLoss", "contractLoss", "markedCardBust"];
      const current = keys.filter((key) => achievements.flags.lossTypes?.[key]).length;
      return { current, target: keys.length, label: `${current} / ${keys.length}` };
    }
    if (candidate.id === "a066") return countProgress(Object.keys(achievements.unlocked || {}).length, 50);
    return { current: 0, target: 1, label: unlocked ? "解除済み" : "未解除" };
  }

  function flagProgress(value) { return { current: value ? 1 : 0, target: 1, label: value ? "解除済み" : "未解除" }; }
  function countProgress(value, target) {
    const current = Math.min(Number(value) || 0, target);
    return { current, target, label: `${formatNumber(current)} / ${formatNumber(target)}` };
  }

  function renderStatCards(container, items) {
    if (!container) return;
    container.innerHTML = items.map((item) => `<div class="devil-records-stat"><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong></div>`).join("");
  }

  function renderAchievements(records, achievements, stats) {
    const list = document.getElementById("achievement-list");
    const summary = document.getElementById("achievement-summary");
    const categorySummary = document.getElementById("achievement-category-summary");
    if (!list || !summary || !categorySummary) return;

    const unlockedIds = new Set(Object.keys(achievements.unlocked || {}));
    const total = ACHIEVEMENT_CANDIDATES.length;
    summary.textContent = `${unlockedIds.size} / ${total} 個の実績を解除済みです。`;

    const categoryCards = CATEGORY_ORDER.map((category) => {
      const candidates = ACHIEVEMENT_CANDIDATES.filter((candidate) => candidate.category === category);
      const unlocked = candidates.filter((candidate) => unlockedIds.has(candidate.id)).length;
      return { label: category, value: `${unlocked} / ${candidates.length}` };
    });
    renderStatCards(categorySummary, categoryCards);

    list.innerHTML = ACHIEVEMENT_CANDIDATES.map((candidate) => {
      const unlocked = unlockedIds.has(candidate.id);
      const hidden = !!candidate.hidden && !unlocked;
      const progress = getProgress(candidate, achievements, records, stats);
      const percent = progress.target ? Math.max(0, Math.min(100, progress.current / progress.target * 100)) : 0;
      const unlockedAt = achievements.unlocked?.[candidate.id]?.unlockedAt;
      const title = hidden ? "？？？" : candidate.name;
      const note = hidden ? "まだ悪魔の帳簿に記されていない。" : candidate.note;
      const statusLabel = unlocked ? "解除済み" : hidden ? "隠し" : "未解除";
      return `
        <article class="devil-achievement-card${unlocked ? " is-unlocked" : ""}${hidden ? " is-hidden" : ""}">
          <div class="devil-achievement-card__meta">
            <span class="devil-badge">${escapeHtml(formatAchievementCode(candidate.id))}</span>
            <span class="devil-badge">${escapeHtml(candidate.category)}</span>
            <span class="devil-badge${unlocked ? " devil-badge--unlocked" : hidden ? " devil-badge--hidden" : ""}">${escapeHtml(statusLabel)}</span>
          </div>
          <h3>${escapeHtml(title)}</h3>
          <p>${escapeHtml(note)}</p>
          <div class="devil-progress" aria-label="${escapeHtml(title)}の進捗">
            <div class="devil-progress__bar" aria-hidden="true"><span style="--progress: ${percent.toFixed(1)}%"></span></div>
            <span class="devil-progress__label">${escapeHtml(progress.label)}${unlockedAt ? ` / ${escapeHtml(formatDate(unlockedAt))}` : ""}</span>
          </div>
        </article>`;
    }).join("");
  }

  function renderScoreboard(records, achievements, stats) {
    const summary = getSummaryStats(records, stats);
    const current = records.current || {};
    renderStatCards(document.getElementById("score-summary"), [
      { label: "総戦数", value: formatNumber(summary.games) },
      { label: "あなたの勝利", value: formatNumber(summary.playerWins) },
      { label: "悪魔の勝利", value: formatNumber(summary.devilWins) },
      { label: "勝率", value: formatPercent(summary.playerWins, summary.games) },
      { label: "契約中", value: formatNumber(summary.contracts) },
      { label: "悪魔の機嫌", value: MOOD_LABELS[summary.mood] || "平静" }
    ]);

    const avgPlayer = current.games ? (current.playerTotalSum / current.games).toFixed(1) : "—";
    const avgDevil = current.games ? (current.devilTotalSum / current.games).toFixed(1) : "—";
    const breakdownRows = [
      ["平均点（あなた）", avgPlayer],
      ["平均点（悪魔）", avgDevil],
      ["あなたの最長連勝", formatNumber(current.bestPlayerStreak)],
      ["悪魔の最長連勝", formatNumber(current.bestDevilStreak)],
      ["契約提示", formatNumber(current.contracts?.offered)],
      ["契約受諾", formatNumber(current.contracts?.accepted)],
      ["契約拒否", formatNumber(current.contracts?.rejected)],
      ["契約解除", formatNumber(current.contracts?.released)],
      ["悪魔が余計に引いた勝負", formatNumber(current.ai?.moodRiskDrawGames)],
      ["余計な一枚による悪魔バースト", formatNumber(current.ai?.moodRiskBustWins)],
      ["低得点同点からの追撃", formatNumber(current.ai?.lowEffortTiePunishes)]
    ];
    document.getElementById("score-breakdown").innerHTML = makeKeyValueTable(breakdownRows);

    const moodRows = ["relaxed", "standard", "serious"].map((mood) => {
      const item = current.moods?.[mood] || {};
      return [MOOD_LABELS[mood], formatNumber(item.games), formatNumber(item.playerWins), formatPercent(item.playerWins, item.games)];
    });
    document.getElementById("mood-breakdown").innerHTML = makeTable(["機嫌", "戦数", "勝利", "勝率"], moodRows);

    renderRecentResults(records.recentResults || []);
  }

  function makeKeyValueTable(rows) { return makeTable(["項目", "値"], rows); }
  function makeTable(headers, rows) {
    return `<table class="devil-records-table"><thead><tr>${headers.map((h) => `<th scope="col">${escapeHtml(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell ?? "—")}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  }

  function renderRecentResults(results) {
    const root = document.getElementById("recent-results");
    if (!root) return;
    if (!results.length) {
      root.innerHTML = `<p class="devil-empty-message">まだ直近の遊戯記録はありません。</p>`;
      return;
    }
    const rows = results.slice(0, 50).map((item) => [
      formatDate(item.playedAt),
      item.winner === "player" ? "あなた" : "悪魔",
      `${item.playerTotal ?? "—"} / ${item.devilTotal ?? "—"}`,
      MOOD_LABELS[item.mood] || item.mood || "—",
      RESULT_LABELS[item.resultType] || item.resultType || "—"
    ]);
    root.innerHTML = makeTable(["日時", "勝者", "点数", "機嫌", "結果"], rows);
  }

  function renderAll() {
    const stats = loadStats();
    const records = loadRecords();
    const achievements = loadAchievements();
    renderAchievements(records, achievements, stats);
    renderScoreboard(records, achievements, stats);
  }

  function activateTab(tab) {
    const tabs = Array.from(document.querySelectorAll("[role='tab'][aria-controls]"));
    tabs.forEach((button) => {
      const active = button === tab;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
      const panel = document.getElementById(button.getAttribute("aria-controls"));
      if (panel) { panel.hidden = !active; panel.classList.toggle("is-active", active); }
    });
  }

  function openDialog(dialog) {
    if (!dialog) return;
    if (typeof dialog.showModal === "function") dialog.showModal(); else dialog.setAttribute("open", "");
  }

  function closeDialog(dialog) {
    if (!dialog) return;
    if (typeof dialog.close === "function" && dialog.open) dialog.close(); else dialog.removeAttribute("open");
  }

  function bindEvents() {
    document.querySelectorAll("[role='tab'][aria-controls]").forEach((tab) => {
      tab.addEventListener("click", () => activateTab(tab));
      tab.addEventListener("keydown", (event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const tabs = Array.from(document.querySelectorAll("[role='tab'][aria-controls]"));
        let index = tabs.indexOf(tab);
        if (event.key === "ArrowRight") index = (index + 1) % tabs.length;
        if (event.key === "ArrowLeft") index = (index - 1 + tabs.length) % tabs.length;
        if (event.key === "Home") index = 0;
        if (event.key === "End") index = tabs.length - 1;
        activateTab(tabs[index]);
        tabs[index].focus();
      });
    });

    const gameDialog = document.getElementById("game-reset-dialog");
    const allDialog = document.getElementById("all-data-dialog");
    document.getElementById("open-game-reset-dialog")?.addEventListener("click", () => openDialog(gameDialog));
    document.getElementById("cancel-game-reset")?.addEventListener("click", () => closeDialog(gameDialog));
    document.getElementById("confirm-game-reset")?.addEventListener("click", () => {
      resetGameRecordOnly();
      closeDialog(gameDialog);
      renderAll();
      announce("ゲーム記録をリセットしました。実績は残っています。");
    });
    gameDialog?.addEventListener("click", (event) => { if (event.target === gameDialog) closeDialog(gameDialog); });

    const confirmInput = document.getElementById("all-data-confirm-text");
    const confirmButton = document.getElementById("confirm-all-data");
    document.getElementById("open-all-data-dialog")?.addEventListener("click", () => {
      if (confirmInput) confirmInput.value = "";
      if (confirmButton) confirmButton.disabled = true;
      openDialog(allDialog);
      setTimeout(() => confirmInput?.focus(), 0);
    });
    document.getElementById("cancel-all-data")?.addEventListener("click", () => closeDialog(allDialog));
    confirmInput?.addEventListener("input", () => { confirmButton.disabled = confirmInput.value.trim() !== "消去"; });
    confirmButton?.addEventListener("click", () => {
      if (confirmInput?.value.trim() !== "消去") return;
      eraseAllDevilData();
      closeDialog(allDialog);
      renderAll();
      announce("悪魔の遊戯室に関する全データを消去しました。");
    });
    allDialog?.addEventListener("click", (event) => { if (event.target === allDialog) closeDialog(allDialog); });
  }

  function announce(message) {
    const status = document.getElementById("devil-records-status");
    if (status) status.textContent = message;
  }

  function init() {
    bindEvents();
    renderAll();
  }

  window.SallyDevilRecordsPage = { BUILD, renderAll, loadRecords, loadAchievements };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
