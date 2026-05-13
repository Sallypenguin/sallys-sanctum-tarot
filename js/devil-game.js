// Mini game: 悪魔と66の契約.
// Keep the game self-contained so the reading, card library, and history pages
// remain independent of this bonus page.
(() => {
  "use strict";

  const TARGET_SCORE = 66;
  const LOW_EFFORT_TIE_MAX = 49;
  const DEVIL_GAME_BUILD = "v84-low-effort-tie-punish";
  const DEBUG_MODE = new URLSearchParams(window.location.search).get("debug") === "1";

  const DEVIL_AI_PROFILES = {
    mercy: {
      id: "mercy",
      mood: "余裕",
      name: "余裕の悪魔",
      bustLimit: 66,
      description: "悪魔が勝ち越している時の機嫌。勝てる場面でも、低〜中得点なら時々余興の一枚を引く。"
    },
    standard: {
      id: "standard",
      mood: "平静",
      name: "平静な悪魔",
      bustLimit: 66,
      description: "勝敗が拮抗している時の悪魔。負けていれば引き、同点以上なら留まる。"
    },
    serious: {
      id: "serious",
      mood: "本気",
      name: "本気の悪魔",
      bustLimit: 66,
      description: "君が勝ち越している時の悪魔。余興を減らし、勝てる場面では余計な札を引かない。"
    }
  };

  const DEVIL_GAME_ASSETS = {
    opponentImage: {
      fallbackCardId: "major_15_devil",
      variant: "medium",
      dedicatedSrc: "",
      dedicatedLargeSrc: "",
      alt: "対戦相手である悪魔のタロットカード"
    },
    futureDedicatedImages: {
      opponent: "assets/games/devil/devil-opponent.webp",
      opponentLarge: "assets/games/devil/devil-opponent-large.webp",
      chainIcon: "assets/games/devil/chain-icon.webp",
      contractSeal: "assets/games/devil/contract-seal.webp"
    }
  };

  const ENDINGS = {
    "win-clean": "あなたは勝った。\n66の門は、今夜だけあなたに開いた。",
    "loss-clean": "あなたは敗れた。\n悪魔は、残された距離をゆっくり数えた。",
    "loss-reject": "あなたは悪魔の手を拒んだ。\n敗れはしたが、札はあなたの手を離れなかった。",
    "loss-marked": "その札には、すでに悪魔の印があった。\n同じ札で二度救われるほど、契約は甘くない。",
    "loss-perfect-bust": "あなたは敗れた。\n完璧な66から、さらに一枚を望んだ。\n勝利は逃げたのではない。あなたが追い越したのだ。"
  };

  const PERFECT_BUST_DEVIL_LINE = "66。完璧だった。実に完璧だったとも。だからこそ、そこから一枚引いた君を、私はしばらく忘れないだろう。";
  const TARGET_TIE_DEVIL_LINE = "同じ66だ。美しい到達だな。だが、君は客で、私はこの館の主だ。最後に微笑む者まで、規則には書いてある。引き分けは私のものだ。";
  const TARGET_TIE_LOSS_ENDING = "あなたは敗れた。\nあなたも悪魔も、66に辿り着いた。\nだが、この館では同点は悪魔の勝利となる。\n開いた門の向こうで、悪魔だけが微笑んだ。";
  const LOW_EFFORT_TIE_DEVIL_LINE = (total) => `同点だ。だが、拮抗などと思わないことだ。
君は${total}で足を止め、私はそこに立っているだけで勝てる。
余計な一枚など要らない。悪魔の館では、早すぎる諦めにも値が付く。`;
  const LOW_EFFORT_TIE_LOSS_ENDING = "あなたは敗れた。\n同じ数に見えた。だが、それは拮抗ではなかった。\nあなたが早く足を止めた場所に、悪魔はただ立っていた。";
  const CLEAN_STAND_LOSS_ENDINGS = {
    veryLow: "あなたは敗れた。\n勝負の中心は、まだ遠かった。\n安全な場所に見えた足元は、ただの入口だった。",
    low: "あなたは敗れた。\nあなたは早く足を止めた。\n悪魔はその余白を、ゆっくり歩いて埋めた。",
    middle: "あなたは敗れた。\n悪くない数だった。\nだが、この館では悪くないだけでは足りない。",
    narrow: "あなたは敗れた。\n届かなかったのは、大きな距離ではない。\nだが悪魔は、そのわずかな隙間に座って微笑んだ。",
    near: "あなたは敗れた。\n66の影は見えていた。\nあと少しの踏み込みを、悪魔は待っていた。",
    veryNear: "あなたは敗れた。\n66はすぐ近くにあった。\nだが、そのわずかな距離を、悪魔は見逃さなかった。"
  };

  const CLEAN_WIN_ENDINGS = {
    target: "あなたは勝った。\n66に辿り着いたあなたを、悪魔はしばし黙って見つめていた。\n門は開いた。今夜だけ、あなたのために。",
    devilBust: "あなたは勝った。\n悪魔は勝ちへ手を伸ばし、66の向こう側へ落ちた。\n罠を仕掛けた者が、自らその罠に足をかけた。",
    narrow: "あなたは勝った。\n差はわずかだった。\nけれどそのわずかな隙間に、あなたは悪魔の足を掬った。",
    normal: "あなたは勝った。\n悪魔は肩をすくめ、静かに道を空けた。\n勝負は終わった。少なくとも、今夜は。"
  };

  const DEVIL_SURRENDER_LINE = `残った札は、どれも66の向こう側へ落ちる。
勝ち筋のない一枚を引くほど、私は親切ではない。
今夜は君に道を譲ろう。`;
  const DEVIL_SURRENDER_WIN_ENDING = `あなたは勝った。
悪魔は残された札を見つめ、静かに手を引いた。
破滅しか残らない道を、館の主は選ばなかった。`;

  const DEFAULT_DEVIL_LINE = "私の館へようこそ。66に近づく遊びだ。簡単だろう？　……簡単なものほど、人は派手に間違える。";
  const RECORD_RESET_COMPLETE_LINE = `よかろう。帳簿は白紙に戻った。
君の勝利も、私の勝利も、契約の印も消えた。

だが、消したという選択までは消えない。
ふむ。実に人間らしい。`;
  const DEVIL_TURN_OPENING_LINES = [
    "私のターンの開幕といこう。",
    "では、私の番だ。よく見ていたまえ。",
    "よかろう。ここからは私が引く。",
    "ふむ、私の手番だ。館の灯りを少し強くしよう。",
    "さて、私のターンだ。扉の奥を覗いてみるかね？"
  ];
  const OPENING_DEAL_LINES = [
    "では、配ろう。リズムを崩すなよ。",
    "では、配ろう。まずは手札の機嫌を見ようか。",
    "始めよう。札はもう、こちらを向いている。",
    "では、幕を開けよう。最初の二枚で、ずいぶん人は顔を変える。",
    "配るとしよう。まだ何も失っていない顔は、なかなかよい。",
    "よかろう。最初の札ほど、無邪気に人を誘うものはない。",
    "では、始めよう。君の運と、私の退屈を並べてみる。",
    "配ろう。数字は正直だが、正直者が優しいとは限らない。",
    "最初の二枚だ。ここでは、始まりだけは誰にでも平等だ。",
    "では、札を開こう。まだ勝ちも負けも、きれいな顔をしている。",
    "始めよう。66までの道は短い。短い道ほど、踏み外しやすい。",
    "では、二枚。ここから先は、君の欲と相談だ。",
    "札を配ろう。最初だけは、いつも静かだ。",
    "数字を並べよう。そこに意味を見出すのは、たいてい人間の方だ。",
    "よかろう。今夜の形を、まずは二枚で見せてもらおう。"
  ];
  const DEVIL_CARD_DRAW_ASIDES = [
    "ふむ。私のカードだ。",
    "いいカードを引いたようだな。",
    "縁起がよさそうなカードだ。"
  ];
  const MARKED_BUST_DEVIL_LINE = "その札は、すでに私の印を受けている。同じ札で二度救われることはない。";
  const MAX_STAT_COUNT = 666;
  const SETTINGS_STORAGE_KEY = "sallySanctumTarotSettings";
  const STATS_STORAGE_KEY = "sallySanctumTarotDevilStats";
  const DEFAULT_SETTINGS = {
    soundEnabled: true,
    animationEnabled: true
  };
  const DEFAULT_STATS = {
    version: 1,
    wins: 0,
    losses: 0,
    contracts: 0,
    contractedCardIds: []
  };
  const DEAL_DELAY_MS = 210;
  const OPENING_DEAL_DELAY_MS = 500;
  const DEVIL_TURN_DEAL_DELAY_MS = 1600;
  const REDUCED_DEAL_DELAY_MS = 80;
  const REDUCED_DEVIL_TURN_DEAL_DELAY_MS = 80;
  const MODAL_DELAY_MS = 240;
  const OPENING_SCROLL_SETTLE_MS = 520;
  const REDUCED_OPENING_SCROLL_SETTLE_MS = 80;

  const dom = {};
  let imageDialog = null;
  let lastImageDialogTrigger = null;
  let gameSettings = loadGameSettings();
  let gameStats = loadGameStats();
  let isInteractionLocked = false;
  let pendingAnimatedCardKeys = new Set();

  const gameState = {
    deck: [],
    playerCards: [],
    devilCards: [],
    hiddenDevilCardRevealed: false,

    playerTotal: 0,
    devilTotal: 0,
    playerContractAdjustment: 0,

    target: TARGET_SCORE,
    aiProfileId: "standard",

    phase: "intro",
    contractUsed: false,
    lastPlayerCard: null,
    contractedCardThisGame: null,
    bustedAfterPerfect66: false,
    debugScenarioActive: false,
    debugScenarioName: "",
    debugIgnoreStoredContracts: false,
    debugContractedCardIds: [],

    winner: null,
    resultType: null,
    resultModalDismissed: false,
    resultDevilLine: "",
    resultDevilLineLogged: false,
    statsRecorded: false,
    standConfirmationMessage: "",
    devilTurnLine: "",
    devilShowoffDrawUsed: false,
    devilSurrendered: false,
    devilDecisionReason: "",
    log: []
  };

  function getMajorArcanaCards() {
    return (window.TAROT_CARDS || [])
      .filter((card) => card && card.arcana === "major" && Number.isFinite(card.number))
      .slice()
      .sort((a, b) => a.number - b.number);
  }

  function getCardDisplayName(card) {
    if (!card) return "不明なカード";
    if (card.roman && card.names?.ja) return `${card.roman} ${card.names.ja}`;
    return card.names?.label || card.names?.ja || card.id || "不明なカード";
  }

  function getCardImageSrc(card, variant = "thumb") {
    const src = card?.media?.image || "data/decks/sallys-sanctum-tarot/images/medium/back.webp";
    if (window.SallyDevilContracts?.getDisplayImageSrc) {
      return window.SallyDevilContracts.getDisplayImageSrc(src, card?.id, variant);
    }
    if (window.SallyImageAssets?.toCardImageVariant) {
      return window.SallyImageAssets.toCardImageVariant(src, variant);
    }
    const filename = src.split("/").pop()?.replace(/\.(png|jpg|jpeg|webp)$/i, ".webp") || "back.webp";
    return `data/decks/sallys-sanctum-tarot/images/${variant}/${filename}`;
  }

  function getCardBackSrc(variant = "thumb") {
    if (window.SallyImageAssets?.getCardBackImage) {
      return window.SallyImageAssets.getCardBackImage(variant);
    }
    return `data/decks/sallys-sanctum-tarot/images/${variant}/back.webp`;
  }

  function getOpponentImageSrc(cards) {
    if (DEVIL_GAME_ASSETS.opponentImage.dedicatedSrc) {
      return DEVIL_GAME_ASSETS.opponentImage.dedicatedSrc;
    }

    const devilCard = cards.find((card) => card.id === DEVIL_GAME_ASSETS.opponentImage.fallbackCardId);
    return getCardImageSrc(devilCard, DEVIL_GAME_ASSETS.opponentImage.variant);
  }

  function getOpponentImageLargeSrc(cards) {
    if (DEVIL_GAME_ASSETS.opponentImage.dedicatedLargeSrc) {
      return DEVIL_GAME_ASSETS.opponentImage.dedicatedLargeSrc;
    }

    if (DEVIL_GAME_ASSETS.opponentImage.dedicatedSrc) {
      return DEVIL_GAME_ASSETS.opponentImage.dedicatedSrc;
    }

    const devilCard = cards.find((card) => card.id === DEVIL_GAME_ASSETS.opponentImage.fallbackCardId);
    return getCardImageSrc(devilCard, "large");
  }

  function shuffleCards(cards) {
    const shuffled = cards.slice();
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
    }
    return shuffled;
  }

  function drawFromDeck(state) {
    return state.deck.shift() || null;
  }

  function sumCards(cards) {
    return cards.reduce((total, card) => total + (Number(card?.number) || 0), 0);
  }

  function syncTotals(state = gameState) {
    const adjustment = Number(state.playerContractAdjustment) || 0;
    state.playerTotal = sumCards(state.playerCards) + adjustment;
    state.devilTotal = sumCards(state.devilCards);
  }

  function getVisibleDevilCards(state = gameState) {
    if (state.hiddenDevilCardRevealed) return state.devilCards;
    return state.devilCards.slice(0, 1);
  }

  function getVisibleDevilTotal(state = gameState) {
    return sumCards(getVisibleDevilCards(state));
  }

  function isBust(total, limit = TARGET_SCORE) {
    return total > limit;
  }

  function isTargetScore(total) {
    return Number(total) === TARGET_SCORE;
  }

  function getContractOverAmount(total) {
    return Math.max(0, Number(total) - TARGET_SCORE);
  }

  function getReflectedContractTotal(total) {
    const overAmount = getContractOverAmount(total);
    return TARGET_SCORE - overAmount;
  }

  function getCardScore(card) {
    return Number(card?.number) || 0;
  }

  function wouldDevilBustWithCard(state, card, profile = DEVIL_AI_PROFILES.standard) {
    if (!state || !card || !profile) return false;
    return isBust(state.devilTotal + getCardScore(card), profile.bustLimit);
  }

  function hasOnlyBustDrawsForDevil(state, profile = DEVIL_AI_PROFILES.standard) {
    if (!state || !profile || !Array.isArray(state.deck) || state.deck.length === 0) return false;
    return state.deck.every((card) => wouldDevilBustWithCard(state, card, profile));
  }

  function isLowEffortTie(state) {
    if (!state) return false;
    if (state.devilTotal !== state.playerTotal) return false;
    if (isTargetScore(state.playerTotal)) return false;
    return state.playerTotal <= LOW_EFFORT_TIE_MAX;
  }

  function canDevilPunishLowEffortTie(state, profile = DEVIL_AI_PROFILES.standard) {
    if (!isLowEffortTie(state) || !profile) return false;

    const nextCard = Array.isArray(state.deck) ? state.deck[0] : null;
    if (!nextCard) return false;

    return !wouldDevilBustWithCard(state, nextCard, profile);
  }

  function canDevilMakeShowoffDraw(state, profile = DEVIL_AI_PROFILES.standard) {
    if (!state || !profile) return false;
    if (profile.id !== "mercy") return false;
    if (state.devilShowoffDrawUsed) return false;
    if (state.playerTotal >= 63) return false;
    if (state.playerTotal > 56) return false;
    if (state.devilTotal > 55) return false;
    if (state.devilTotal < state.playerTotal) return false;
    return Math.random() < 0.22;
  }

  function shouldDevilDraw(state, profile = DEVIL_AI_PROFILES.standard) {
    if (!state || !profile) return false;
    if (state.phase !== "devil-turn") return false;
    if (isBust(state.devilTotal, profile.bustLimit)) return false;

    if (state.devilTotal < state.playerTotal) {
      if (hasOnlyBustDrawsForDevil(state, profile)) {
        state.devilSurrendered = true;
        state.devilDecisionReason = "forced_surrender";
        return false;
      }

      state.devilDecisionReason = isTargetScore(state.playerTotal) ? "exact_66_chase" : "must_chase";
      return true;
    }

    if (canDevilPunishLowEffortTie(state, profile)) {
      state.devilDecisionReason = "low_effort_tie_punish";
      return true;
    }

    if (isLowEffortTie(state)) {
      state.devilDecisionReason = "low_effort_tie_no_safe_draw";
      return false;
    }

    if (canDevilMakeShowoffDraw(state, profile)) {
      state.devilShowoffDrawUsed = true;
      state.devilDecisionReason = state.playerTotal <= 35 ? "bored_showoff" : "showoff_draw";
      return true;
    }

    if (state.devilTotal === state.playerTotal) {
      state.devilDecisionReason = "tie_is_enough";
    } else {
      state.devilDecisionReason = state.playerTotal >= 63 ? "respect_stay" : "already_winning";
    }
    return false;
  }

  function addLog(message) {
    gameState.log.push(message);
  }

  function chooseLine(lines) {
    if (!Array.isArray(lines) || lines.length === 0) return "";
    return lines[Math.floor(Math.random() * lines.length)];
  }

  function getDevilTurnOpeningLine(profile = DEVIL_AI_PROFILES.standard) {
    const playerTotal = gameState.playerTotal;

    if (isTargetScore(playerTotal)) {
      return chooseLine([
        "君は66。私の道は、ひどく細い。館の主にも、選べることは多くない。",
        "66に辿り着いたか。よかろう。余興はここまでだ。"
      ]);
    }

    if (playerTotal >= 63) {
      return chooseLine([
        `いい場所で止まったな。ここからは、私も手遊びはしない。`,
        `ほとんど届きかけているな。君がそこに立つなら、私も余興を少し控えよう。`
      ]);
    }

    if (profile.id === "serious") {
      return chooseLine([
        "今夜は余興を減らそう。君は少し、勝ちすぎた。",
        "ここからは、規則どおりに進めよう。悪魔が本気を出すと、実につまらなくて強いぞ。"
      ]);
    }

    if (profile.id === "mercy") {
      if (playerTotal <= 35) {
        return chooseLine([
          `そこで足を止めるのか。よかろう。館は広い。こちらが歩く余白はいくらでもある。`,
          `合計は${playerTotal}。勝負の余白は大きい。だが、余白があるほど余計なものを書きたくなる。`
        ]);
      }
      return chooseLine([
        `合計は${playerTotal}。勝負の余白はまだある。だが、余白があるほど余計なものを書きたくなる。`,
        "ふむ、今夜の私は機嫌がいい。よいことかどうかは、まだ分からんがね。"
      ]);
    }

    if (playerTotal <= 35) {
      return chooseLine([
        `君は${playerTotal}で留まった。よかろう。残された距離を、私が数えよう。`,
        "ずいぶん早く足を止めたな。では、こちらはゆっくり歩かせてもらう。"
      ]);
    }

    return chooseLine(DEVIL_TURN_OPENING_LINES);
  }

  function getPlayerSafeDrawReaction(total) {
    if (isTargetScore(total)) {
      return chooseLine([
        "ぴたり66。門は開いた。ここで止まれるなら、君はたいした客だ。",
        "見事だ、66だ。欲を足せば灰、足さねば勝負。実にいい顔になった。",
        "66ちょうど。ふむ、悪魔の館でそこまで届くとは。あとは私がどう踊るかだ。"
      ]);
    }

    const reactionGroups = [
      {
        max: 21,
        lines: [
          "ふむ、まだ序幕だな。火も煙も、これからというところだ。",
          "よかろう。まだ床は冷たい。安心したかね？",
          "小さく始めたな。悪魔を退屈させるには早いぞ。"
        ]
      },
      {
        max: 35,
        lines: [
          "まだ余裕があるな。だが余裕というやつは、人を余計に歩かせる。",
          "悪くない。だが66は、もっと奥で口を開けているぞ。",
          "ふむ、慎ましい足取りだ。似合わんとは言わないがね。"
        ]
      },
      {
        max: 49,
        lines: [
          "いい具合になってきたな。ようやく館の空気が温まってきた。",
          "そのあたりは嫌いではない。安全とも危険とも言えぬ、実に人間らしい場所だ。",
          "ほう、少し欲が出てきたかね。結構。欲はよく燃える。"
        ]
      },
      {
        max: 56,
        lines: [
          "近づいてきたな。まだ燃えてはいないが、匂いはするぞ。",
          "よかろう。66の影が、君の靴先に触れ始めた。",
          "ここからだ。勝負はいつも、少し熱くなってから始まる。"
        ]
      },
      {
        max: 62,
        lines: [
          "ほう、ずいぶん近い。いい顔になってきたではないか。",
          "危ういな。だが危ういものほど、見ていて飽きない。",
          "その距離まで来たか。さて、勇気と無謀の境目はどこだったかね？"
        ]
      },
      {
        max: TARGET_SCORE,
        lines: [
          "見事だ。66のすぐそばまで来たな。次の一枚が祝福か灰か、実に分かりやすい。",
          "ほとんど触れているぞ。66とは、なかなか熱い数字だろう？",
          "いい場所だ。これ以上を望むなら、悪魔としては止める理由がない。"
        ]
      }
    ];

    const group = reactionGroups.find((item) => total <= item.max) || reactionGroups[reactionGroups.length - 1];
    return chooseLine(group.lines);
  }

  function setPhase(phase) {
    gameState.phase = phase;
  }

  function setDevilLine(text) {
    if (!dom.devilLines?.length) return;
    dom.devilLines.forEach((line) => {
      line.textContent = text;
    });
  }

  function resetState() {
    gameState.deck = [];
    gameState.playerCards = [];
    gameState.devilCards = [];
    gameState.hiddenDevilCardRevealed = false;
    gameState.playerTotal = 0;
    gameState.devilTotal = 0;
    gameState.playerContractAdjustment = 0;
    gameState.target = TARGET_SCORE;
    gameState.aiProfileId = getCurrentDevilAiProfile().id;
    gameState.phase = "intro";
    gameState.contractUsed = false;
    gameState.lastPlayerCard = null;
    gameState.contractedCardThisGame = null;
    gameState.bustedAfterPerfect66 = false;
    gameState.debugScenarioActive = false;
    gameState.debugScenarioName = "";
    gameState.debugIgnoreStoredContracts = false;
    gameState.debugContractedCardIds = [];
    gameState.winner = null;
    gameState.resultType = null;
    gameState.resultModalDismissed = false;
    gameState.resultDevilLine = "";
    gameState.resultDevilLineLogged = false;
    gameState.statsRecorded = false;
    gameState.standConfirmationMessage = "";
    gameState.devilTurnLine = "";
    gameState.devilShowoffDrawUsed = false;
    gameState.devilSurrendered = false;
    gameState.devilDecisionReason = "";
    gameState.log = [];
  }

  function loadGameSettings() {
    try {
      const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!raw) return { ...DEFAULT_SETTINGS };
      const parsed = JSON.parse(raw);
      return {
        soundEnabled: typeof parsed.soundEnabled === "boolean" ? parsed.soundEnabled : DEFAULT_SETTINGS.soundEnabled,
        animationEnabled: typeof parsed.animationEnabled === "boolean" ? parsed.animationEnabled : DEFAULT_SETTINGS.animationEnabled
      };
    } catch (error) {
      return { ...DEFAULT_SETTINGS };
    }
  }

  function normalizeStats(stats) {
    if (window.SallyDevilContracts?.normalizeRecord) {
      return window.SallyDevilContracts.normalizeRecord(stats);
    }

    const normalized = { ...DEFAULT_STATS, contractedCardIds: [] };
    ["wins", "losses"].forEach((key) => {
      const value = Number(stats?.[key]);
      normalized[key] = Number.isFinite(value) && value > 0
        ? Math.min(MAX_STAT_COUNT, Math.floor(value))
        : 0;
    });
    if (Array.isArray(stats?.contractedCardIds)) {
      const seen = new Set();
      normalized.contractedCardIds = stats.contractedCardIds
        .map((id) => String(id || "").trim())
        .filter(Boolean)
        .filter((id) => {
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        });
    }
    normalized.contracts = normalized.contractedCardIds.length;
    return normalized;
  }

  function loadGameStats() {
    if (window.SallyDevilContracts?.getRecord) {
      return window.SallyDevilContracts.getRecord();
    }

    try {
      const raw = window.localStorage.getItem(STATS_STORAGE_KEY);
      if (!raw) return { ...DEFAULT_STATS, contractedCardIds: [] };
      return normalizeStats(JSON.parse(raw));
    } catch (error) {
      return { ...DEFAULT_STATS, contractedCardIds: [] };
    }
  }

  function saveGameStats() {
    gameStats = normalizeStats(gameStats);
    if (window.SallyDevilContracts?.setRecord) {
      gameStats = window.SallyDevilContracts.setRecord(gameStats);
      return;
    }

    try {
      window.localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(gameStats));
    } catch (error) {
      // The counter is decorative. The game remains usable without storage.
    }
  }

  function updateContractTriggerState() {
    if (!dom.contractOpenButton) return;

    gameStats = normalizeStats(gameStats);
    const hasActiveContracts = gameStats.contractedCardIds.length > 0;
    dom.contractOpenButton.disabled = !hasActiveContracts;
    dom.contractOpenButton.setAttribute("aria-disabled", String(!hasActiveContracts));
    dom.contractOpenButton.title = hasActiveContracts
      ? "契約中のカードを確認する"
      : "契約中のカードはありません";
  }

  function getDevilMoodProfile(stats = gameStats) {
    const record = normalizeStats(stats);
    const difference = record.wins - record.losses;
    if (difference <= -5) return DEVIL_AI_PROFILES.mercy;
    if (difference >= 5) return DEVIL_AI_PROFILES.serious;
    return DEVIL_AI_PROFILES.standard;
  }

  function getCurrentDevilAiProfile() {
    gameStats = normalizeStats(gameStats);
    return getDevilMoodProfile(gameStats);
  }

  function incrementStat(key) {
    const current = Number(gameStats?.[key]) || 0;
    gameStats[key] = Math.min(MAX_STAT_COUNT, current + 1);
  }

  function renderStats() {
    gameStats = normalizeStats(gameStats);
    const moodProfile = getDevilMoodProfile(gameStats);
    if (dom.statWins) dom.statWins.textContent = String(gameStats.wins);
    if (dom.statLosses) dom.statLosses.textContent = String(gameStats.losses);
    if (dom.statContracts) dom.statContracts.textContent = String(gameStats.contractedCardIds.length);
    if (dom.statMood) {
      dom.statMood.textContent = moodProfile.mood;
      dom.statMood.setAttribute("aria-label", `悪魔の機嫌：${moodProfile.mood}`);
    }
    updateContractTriggerState();
  }

  function getContractedCardIds() {
    gameStats = normalizeStats(gameStats);
    return gameStats.contractedCardIds.slice();
  }

  function isContractedCard(card) {
    const cardId = typeof card === "string" ? card : card?.id;
    if (!cardId) return false;
    const debugContracts = Array.isArray(gameState.debugContractedCardIds) ? gameState.debugContractedCardIds : [];
    if (gameState.debugScenarioActive && gameState.debugIgnoreStoredContracts) {
      return debugContracts.includes(cardId);
    }
    if (debugContracts.includes(cardId)) return true;
    if (window.SallyDevilContracts?.isCardContracted) {
      return window.SallyDevilContracts.isCardContracted(cardId);
    }
    return getContractedCardIds().includes(cardId);
  }

  function addContractedCard(card) {
    const cardId = card?.id;
    if (!cardId) return;
    if (gameState.debugScenarioActive) {
      if (!Array.isArray(gameState.debugContractedCardIds)) gameState.debugContractedCardIds = [];
      if (!gameState.debugContractedCardIds.includes(cardId)) gameState.debugContractedCardIds.push(cardId);
      render();
      return;
    }
    if (window.SallyDevilContracts?.addContractedCard) {
      gameStats = window.SallyDevilContracts.addContractedCard(cardId);
    } else {
      const ids = getContractedCardIds();
      if (!ids.includes(cardId)) ids.push(cardId);
      gameStats = normalizeStats({ ...gameStats, contractedCardIds: ids });
      saveGameStats();
    }
    renderStats();
    renderContractDialog();
  }

  function getCardById(cardId) {
    return getMajorArcanaCards().find((card) => card.id === cardId) || null;
  }

  function recordGameStats() {
    if (gameState.statsRecorded || gameState.phase !== "result") return;
    if (gameState.debugScenarioActive) {
      gameState.statsRecorded = true;
      return;
    }

    gameStats = normalizeStats(gameStats);
    if (gameState.winner === "player") incrementStat("wins");
    else if (gameState.winner === "devil") incrementStat("losses");

    gameStats.contracts = getContractedCardIds().length;
    gameState.statsRecorded = true;
    saveGameStats();
    renderStats();
  }

  function saveGameSettings() {
    try {
      const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({
        ...parsed,
        soundEnabled: !!gameSettings.soundEnabled,
        animationEnabled: !!gameSettings.animationEnabled
      }));
    } catch (error) {
      // The game remains usable even when browser storage is unavailable.
    }
  }

  function applySettingsToControls() {
    if (dom.soundEnabledToggle) dom.soundEnabledToggle.checked = !!gameSettings.soundEnabled;
    if (dom.animationEnabledToggle) dom.animationEnabledToggle.checked = !!gameSettings.animationEnabled;
  }

  function applySoundPreference() {
    if (!dom.flipSound) return;
    dom.flipSound.muted = !isSoundEnabled();
    if (!isSoundEnabled()) {
      try {
        dom.flipSound.pause();
        dom.flipSound.currentTime = 0;
      } catch (error) {}
    }
  }

  function applyAnimationPreference() {
    const disabled = !isAnimationEnabled();
    document.documentElement.classList.toggle("animations-off", disabled);
    document.body.classList.toggle("animations-off", disabled);
  }

  function applySettingsToPage() {
    applySettingsToControls();
    applySoundPreference();
    applyAnimationPreference();
  }

  function isSoundEnabled() {
    return !!gameSettings.soundEnabled;
  }

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function isAnimationEnabled() {
    return !!gameSettings.animationEnabled && !prefersReducedMotion();
  }

  function getDealDelay() {
    return isAnimationEnabled() ? DEAL_DELAY_MS : REDUCED_DEAL_DELAY_MS;
  }

  function getOpeningDealDelay() {
    return isAnimationEnabled() ? OPENING_DEAL_DELAY_MS : REDUCED_DEAL_DELAY_MS;
  }

  function getDevilTurnDealDelay() {
    return isAnimationEnabled() ? DEVIL_TURN_DEAL_DELAY_MS : REDUCED_DEVIL_TURN_DEAL_DELAY_MS;
  }

  function delay(ms) {
    if (!ms) return Promise.resolve();
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  function playFlipSound() {
    if (!dom.flipSound || !isSoundEnabled()) return;
    try {
      const source = dom.flipSound.currentSrc || dom.flipSound.src;
      const sound = source ? new Audio(source) : dom.flipSound.cloneNode(true);
      sound.volume = dom.flipSound.volume;
      sound.muted = dom.flipSound.muted;
      sound.preload = "auto";
      sound.currentTime = 0;
      const playPromise = sound.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {});
      }
      sound.addEventListener("ended", () => {
        sound.remove?.();
      }, { once: true });
    } catch (error) {
      try {
        dom.flipSound.currentTime = 0;
        const playPromise = dom.flipSound.play();
        if (playPromise && typeof playPromise.catch === "function") {
          playPromise.catch(() => {});
        }
      } catch (fallbackError) {
        // Browsers may block audio. The game remains usable without sound.
      }
    }
  }

  function setInteractionLocked(locked) {
    isInteractionLocked = !!locked;
    dom.gamePage?.classList.toggle("is-busy", isInteractionLocked);
    if (isInteractionLocked) dom.gamePage?.setAttribute("aria-busy", "true");
    else dom.gamePage?.removeAttribute("aria-busy");
  }

  function markCardForAnimation(rowName, index, card, hidden = false) {
    pendingAnimatedCardKeys.add(getCardRenderKey(rowName, index, card, hidden));
  }

  function getCardRenderKey(rowName, index, card, hidden = false) {
    const cardKey = hidden ? "hidden" : (card?.id || "unknown");
    return `${rowName}:${index}:${cardKey}`;
  }

  function configureOpponentImage(cards = getMajorArcanaCards()) {
    if (dom.opponentImage) {
      dom.opponentImage.src = getOpponentImageSrc(cards);
      dom.opponentImage.alt = DEVIL_GAME_ASSETS.opponentImage.alt;
    }

    if (dom.opponentImageButton) {
      dom.opponentImageButton.dataset.imageSrc = getOpponentImageLargeSrc(cards);
      dom.opponentImageButton.dataset.imageAlt = DEVIL_GAME_ASSETS.opponentImage.alt;
      dom.opponentImageButton.dataset.imageOrientation = "upright";
      dom.opponentImageButton.setAttribute("aria-label", "悪魔のタロットカードを拡大表示");
    }
  }

  function prepareGameImages(cards, extraImages = []) {
    const assetHelper = window.SallyImageAssets;
    if (!assetHelper || typeof assetHelper.preloadImages !== "function") return Promise.resolve([]);

    const cardImages = (cards || [])
      .map((card) => getCardImageSrc(card, "thumb"))
      .filter(Boolean);
    const backImages = [getCardBackSrc("thumb")];
    const opponentImages = [getOpponentImageSrc(cards), getOpponentImageLargeSrc(cards)];
    return assetHelper.preloadImages([...cardImages, ...backImages, ...opponentImages, ...extraImages], 9000);
  }

  function scheduleGameImageCacheWarmup() {
    const assetHelper = window.SallyImageAssets;
    if (!assetHelper || typeof assetHelper.warmImageCache !== "function") return;

    const startWarmup = () => {
      const cards = getMajorArcanaCards();
      const urls = cards
        .flatMap((card) => [getCardImageSrc(card, "thumb"), getCardImageSrc(card, "large")])
        .filter(Boolean);
      urls.push(getCardBackSrc("thumb"), getCardBackSrc("large"), getOpponentImageSrc(cards), getOpponentImageLargeSrc(cards));
      assetHelper.warmImageCache(urls, { delayMs: 650 });
    };

    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(startWarmup, { timeout: 3500 });
    } else {
      window.setTimeout(startWarmup, 900);
    }
  }

  async function startNewGame() {
    if (isInteractionLocked) return;
    setInteractionLocked(true);
    resetState();
    pendingAnimatedCardKeys.clear();
    setPhase("loading");
    addLog("札を温めている。少しだけ待ちたまえ。冷えたカードは、あまりよく鳴らないのでね。");
    render();

    const cards = getMajorArcanaCards();
    configureOpponentImage(cards);

    if (cards.length < 22) {
      setPhase("result");
      gameState.winner = "devil";
      gameState.resultType = "loss-clean";
      gameState.resultModalDismissed = false;
      addLog("カードデータが読めないな。ふむ、遊戯室の扉は今日は開かないようだ。");
      setInteractionLocked(false);
      render();
      focusElement(dom.startGameButton);
      return;
    }

    gameState.deck = shuffleCards(cards);
    const openingPlayerCards = [drawFromDeck(gameState), drawFromDeck(gameState)].filter(Boolean);
    const openingDevilCards = [drawFromDeck(gameState), drawFromDeck(gameState)].filter(Boolean);

    await Promise.all([prepareGameImages(cards), scrollToOpeningBoardBeforeDeal()]);

    setPhase("dealing");
    addLog(chooseLine(OPENING_DEAL_LINES));
    render();
    await delay(120);

    for (const card of openingPlayerCards) {
      gameState.playerCards.push(card);
      syncTotals();
      markCardForAnimation("player", gameState.playerCards.length - 1, card, false);
      render();
      playFlipSound();
      await delay(getOpeningDealDelay());
    }

    for (const card of openingDevilCards) {
      gameState.devilCards.push(card);
      syncTotals();
      const index = gameState.devilCards.length - 1;
      const hidden = index === 1;
      markCardForAnimation("devil", index, card, hidden);
      render();
      playFlipSound();
      await delay(getOpeningDealDelay());
    }

    syncTotals();
    setPhase("player-turn");
    const playerOpening = gameState.playerCards.map(getCardDisplayName).join("』と『");
    const visibleDevilCard = getVisibleDevilCards()[0];
    addLog(`君の初手は『${playerOpening}』、合計は${gameState.playerTotal}。私の一枚目は『${getCardDisplayName(visibleDevilCard)}』。もう一枚？　見たいかね？`);
    await delay(90);
    setInteractionLocked(false);
    render();
    focusElement(dom.drawButton, { preventScroll: true });
  }

  async function playerDraw() {
    if (isInteractionLocked || gameState.phase !== "player-turn") return;

    setInteractionLocked(true);
    const totalBeforeDraw = gameState.playerTotal;
    const card = drawFromDeck(gameState);
    if (!card) {
      addLog("山札は尽きた。よかろう、君はここで留まるほかない。");
      render();
      await delay(getDealDelay());
      await proceedToDevilTurn();
      return;
    }

    gameState.playerCards.push(card);
    gameState.lastPlayerCard = card;
    syncTotals();

    const devilCardAside = Number(card.number) === 15 ? chooseLine(DEVIL_CARD_DRAW_ASIDES) : "";
    const drawMessage = `君は『${getCardDisplayName(card)}』を引いた。${devilCardAside}+${card.number}、合計は${gameState.playerTotal}。`;
    const playerCardIndex = gameState.playerCards.length - 1;
    markCardForAnimation("player", playerCardIndex, card, false);

    if (isBust(gameState.playerTotal, gameState.target)) {
      const bustedAfterPerfect66 = isTargetScore(totalBeforeDraw);
      if (bustedAfterPerfect66) {
        gameState.bustedAfterPerfect66 = true;
      }

      if (isContractedCard(card)) {
        const markedBustLine = bustedAfterPerfect66
          ? PERFECT_BUST_DEVIL_LINE
          : MARKED_BUST_DEVIL_LINE;
        addLog(`${drawMessage} ${markedBustLine}`);
        render();
        playFlipSound();
        await delay(getDealDelay() + MODAL_DELAY_MS);
        gameState.winner = "devil";
        gameState.resultType = bustedAfterPerfect66 ? "loss-perfect-bust" : "loss-marked";
        gameState.resultModalDismissed = false;
        setPhase("result");
        recordGameStats();
        setInteractionLocked(false);
        render();
        focusElement(dom.viewBoardButton);
        return;
      }

      if (!gameState.contractUsed) {
        const contractOfferLine = bustedAfterPerfect66
          ? `${PERFECT_BUST_DEVIL_LINE} 契約するかね？　越えた分だけ手前へ跳ね返してやろう。代わりに、その札へ私の印を置く。なあに、それだけのことだ。`
          : "66を越えたな。契約するかね？　越えた分だけ手前へ跳ね返してやろう。代わりに、その札へ私の印を置く。なあに、それだけのことだ。";
        addLog(`${drawMessage} ${contractOfferLine}`);
        render();
        playFlipSound();
        await delay(getDealDelay() + 40);
        setPhase("contract-offer");
        setInteractionLocked(false);
        render();
        focusElement(dom.acceptContractButton);
        return;
      }

      addLog(`${drawMessage} ${bustedAfterPerfect66 ? PERFECT_BUST_DEVIL_LINE : "再び66を越えた。二度目の幕引きだ。"}`);
      render();
      playFlipSound();
      await delay(getDealDelay() + MODAL_DELAY_MS);
      finishGame();
      setInteractionLocked(false);
      render();
      focusElement(dom.viewBoardButton);
      return;
    }

    addLog(`${drawMessage} ${getPlayerSafeDrawReaction(gameState.playerTotal)}`);
    render();
    playFlipSound();
    await delay(getDealDelay());
    setInteractionLocked(false);
    render();
  }

  function getContractOfferDetailMessage() {
    const lastCard = gameState.lastPlayerCard;
    if (!lastCard) {
      return "契約の効果と、今回の契約後の合計を確認します。";
    }

    const currentTotal = gameState.playerTotal;
    const overAmount = getContractOverAmount(currentTotal);
    const contractTotal = getReflectedContractTotal(currentTotal);
    const cardName = getCardDisplayName(lastCard);

    return `契約の効果
契約すると、66を越えた分だけ、66から手前に戻ります。
契約後はカードを引けません。
その数で留まり、悪魔のターンに進みます。
最後に引いたカードには悪魔の印が残ります。

今回の契約
現在の合計：${currentTotal}
66を越えた数：${overAmount}
契約後の合計：${contractTotal}

${currentTotal}は66を${overAmount}越えているため、契約すると66から${overAmount}戻った${contractTotal}になります。
対象カード：『${cardName}』`;
  }

  function getStandConfirmationMessage(total) {
    if (isTargetScore(total)) {
      return `もういいのかね？まあ当然そうだろうな。合計は66。そこに辿り着いた。これ以上引くなら酔狂と言うものだ。止めはしないがな。`;
    }

    if (total <= 35) {
      return `もういいのかね？　合計は${total}。まだ随分余裕があるみたいだが。臆病も美徳ではある。いつもではないがね。`;
    }

    if (total <= 49) {
      return `もういいのかね？　合計は${total}。まだ66の匂いは遠い。もう一枚くらい、噛みついてみてもいいのではないかね？`;
    }

    if (total <= 56) {
      return `もういいのかね？　合計は${total}。悪くはない。だが66まではまだ少しある。ここで止まるのも、進むのも、君の見世物だ。`;
    }

    if (total <= 62) {
      return `もういいのかね？　合計は${total}。なかなか良い場所だ。だが、まだ66に近づけるかもしれないぞ？`;
    }

    return `もういいのかね？　合計は${total}。ほとんど届きかけているな。次の一枚は祝福か、転落か。さて、君はどちらを見たい？`;
  }

  function playerStand() {
    if (isInteractionLocked || gameState.phase !== "player-turn") return;

    gameState.standConfirmationMessage = getStandConfirmationMessage(gameState.playerTotal);
    setPhase("stand-confirm");
    addLog(gameState.standConfirmationMessage);
    render();
    focusElement(dom.confirmStandButton);
  }

  async function confirmStand() {
    if (isInteractionLocked || gameState.phase !== "stand-confirm") return;

    setInteractionLocked(true);
    gameState.standConfirmationMessage = "";
    addLog("君はここで留まった。賢明か、臆病か。私が見届けよう。");
    syncModal(dom.standConfirm, false);
    render();
    await delay(120);
    await proceedToDevilTurn();
  }

  function reconsiderStand() {
    if (isInteractionLocked || gameState.phase !== "stand-confirm") return;

    gameState.standConfirmationMessage = "";
    setPhase("player-turn");
    addLog("考えなおすかね？　よかろう。迷いもまた、遊戯の香辛料だ。");
    render();
    focusElement(dom.drawButton);
  }

  async function acceptContract() {
    if (isInteractionLocked || gameState.phase !== "contract-offer" || !gameState.lastPlayerCard) return;

    setInteractionLocked(true);
    syncModal(dom.contractOffer, false);
    const contractedCard = gameState.lastPlayerCard;
    const currentTotal = gameState.playerTotal;
    const contractTotal = getReflectedContractTotal(currentTotal);
    gameState.contractUsed = true;
    gameState.contractedCardThisGame = contractedCard || null;
    gameState.playerContractAdjustment = contractTotal - sumCards(gameState.playerCards);
    gameState.lastPlayerCard = null;
    gameState.bustedAfterPerfect66 = false;
    addContractedCard(contractedCard);
    syncTotals();
    addLog(`よかろう。66を越えた分だけ、君を${gameState.playerTotal}へ跳ね返してやろう。『${getCardDisplayName(contractedCard)}』には私の印を置く。君はここで留まりたまえ。では、こちらの番だ。`);
    render();
    await delay(150);
    await proceedToDevilTurn();
  }

  function rejectContract() {
    if (isInteractionLocked || gameState.phase !== "contract-offer") return;

    const rejectLine = gameState.bustedAfterPerfect66
      ? "契約も拒むか。よろしい。完璧な66から、君自身の足で踏み出したのだ。その結末まで、自分で受け取りたまえ。"
      : "差し出した手を払ったか。よろしい、君の意志は尊重しよう。落ちるところまで、自分の足で行くがいい。";
    addLog(rejectLine);
    gameState.winner = "devil";
    gameState.resultType = gameState.bustedAfterPerfect66 ? "loss-perfect-bust" : "loss-reject";
    gameState.resultModalDismissed = false;
    setPhase("result");
    recordGameStats();
    render();
    focusElement(dom.viewBoardButton);
  }

  function revealDevilHiddenCard() {
    if (gameState.hiddenDevilCardRevealed) return false;
    gameState.hiddenDevilCardRevealed = true;
    return true;
  }

  async function proceedToDevilTurn() {
    setPhase("devil-turn");
    syncTotals();

    const profile = getCurrentDevilAiProfile();
    gameState.aiProfileId = profile.id;
    gameState.devilShowoffDrawUsed = false;
    gameState.devilSurrendered = false;
    gameState.devilDecisionReason = "";
    gameState.devilTurnLine = getDevilTurnOpeningLine(profile);
    addLog(gameState.devilTurnLine);
    render();
    scrollToOpeningBoard();
    await delay(getDevilTurnDealDelay());

    if (gameState.devilCards.length > 1 && revealDevilHiddenCard()) {
      markCardForAnimation("devil", 1, gameState.devilCards[1], false);
      render();
      playFlipSound();
      await delay(getDevilTurnDealDelay());
    }

    while (shouldDevilDraw(gameState, profile)) {
      const card = drawFromDeck(gameState);
      if (!card) {
        render();
        await delay(getDealDelay());
        break;
      }

      gameState.devilCards.push(card);
      syncTotals();
      markCardForAnimation("devil", gameState.devilCards.length - 1, card, false);
      render();
      playFlipSound();
      await delay(getDevilTurnDealDelay());

      if (isBust(gameState.devilTotal, profile.bustLimit)) {
        render();
        await delay(120);
        break;
      }
    }

    if (gameState.devilSurrendered) {
      // 決着の悪魔セリフは、結果モーダルを閉じて盤面を見る時に残す。
    }

    finishGame();
    render();
    await delay(MODAL_DELAY_MS);
    setInteractionLocked(false);
    render();
    focusElement(dom.viewBoardButton);
  }

  function finishGame() {
    syncTotals();

    const playerBust = isBust(gameState.playerTotal, gameState.target);
    const devilBust = isBust(gameState.devilTotal, gameState.target);

    if (playerBust && !devilBust) {
      gameState.winner = "devil";
    } else if (devilBust && !playerBust) {
      gameState.winner = "player";
    } else if (!playerBust && !devilBust && gameState.playerTotal > gameState.devilTotal) {
      gameState.winner = "player";
    } else {
      gameState.winner = "devil";
    }

    const contractKey = gameState.contractUsed ? "contract" : "clean";
    const perfectBustLoss = playerBust && gameState.bustedAfterPerfect66 && gameState.winner === "devil";
    gameState.resultType = gameState.devilSurrendered && gameState.winner === "player"
      ? "win-devil-surrender"
      : (perfectBustLoss ? "loss-perfect-bust" : `${gameState.winner === "player" ? "win" : "loss"}-${contractKey}`);
    gameState.resultModalDismissed = false;
    setPhase("result");
    recordGameStats();

    gameState.resultDevilLine = gameState.winner === "player"
      ? getDevilDefeatLine({ devilBust })
      : getDevilVictoryLine({ playerBust, devilBust, perfectBustLoss });
    gameState.resultDevilLineLogged = false;
  }

  function getContractMarkTail() {
    return `勝負は終わった。だが、${getContractedCardThisGameName()}に残った印は、勝敗より長く残るだろう。`;
  }

  function withContractMarkTail(line) {
    return gameState.contractUsed ? `${line} ${getContractMarkTail()}` : line;
  }

  function getDevilBustDefeatLine() {
    if (gameState.devilShowoffDrawUsed) {
      return "勝ちは見えていた。だが、私がもう一枚を望んだ。ふむ。欲が足を出したのは、今夜は私の方だったな。";
    }

    if (isTargetScore(gameState.playerTotal)) {
      return "君は66、私はその向こう側。見事だ。今夜、踏み越えたのは私の方だったな。";
    }

    if (gameState.playerTotal >= 63) {
      return `君は${gameState.playerTotal}で踏みとどまり、私はそこへ届こうとして66を越えた。どうやら境目を見誤ったのは、私の方だったようだな。`;
    }

    if (gameState.playerTotal >= 57) {
      return `君は${gameState.playerTotal}、私は66の向こう側。門前で息を潜める客を前に、館の主が足を滑らせるとはね。`;
    }

    if (gameState.playerTotal >= 50) {
      return `君は${gameState.playerTotal}で留まり、私は66を越えた。悪くない慎重さだ。私の方が、少々芝居を大きくしすぎた。`;
    }

    return `君は${gameState.playerTotal}で息を潜め、私は66を越えた。ふむ、今夜の見世物は私だったようだな。`;
  }

  function getDevilNonBustDefeatLine() {
    const winningGap = Math.max(0, gameState.playerTotal - gameState.devilTotal);

    if (gameState.devilSurrendered) {
      return DEVIL_SURRENDER_LINE;
    }

    if (isTargetScore(gameState.playerTotal)) {
      return `君は66、私は${gameState.devilTotal}。見事だ。66に辿り着いて、なお声を荒げないとは。今夜は君に道を譲ろう。`;
    }

    if (gameState.playerTotal >= 57 && winningGap > 0 && winningGap <= 2) {
      return `君は${gameState.playerTotal}、私は${gameState.devilTotal}。わずかな差だな。だがそのわずかを君が握った。今夜、足を掬われたのは私の方だったようだ。`;
    }

    return `君は${gameState.playerTotal}、私は${gameState.devilTotal}。君の勝ちだ。ふむ、今夜は君の読みが勝ったようだ。`;
  }

  function getDevilDefeatLine({ devilBust } = {}) {
    const contractedCardName = getContractedCardThisGameName();
    const baseLine = devilBust ? getDevilBustDefeatLine() : getDevilNonBustDefeatLine();

    if (gameState.contractUsed) {
      return `${baseLine} よかろう、${contractedCardName}の印まで含めて、今夜は君のものということにしておこう。`;
    }

    return baseLine;
  }

  function getDevilVictoryLine({ playerBust, devilBust, perfectBustLoss } = {}) {
    const tiedWithoutBust = !playerBust && !devilBust && gameState.playerTotal === gameState.devilTotal;
    const finalGap = Math.max(0, gameState.devilTotal - gameState.playerTotal);
    let line;

    if (perfectBustLoss) {
      line = PERFECT_BUST_DEVIL_LINE;
    } else if (tiedWithoutBust) {
      if (isTargetScore(gameState.playerTotal)) {
        line = TARGET_TIE_DEVIL_LINE;
      } else if (isLowEffortTie(gameState)) {
        line = LOW_EFFORT_TIE_DEVIL_LINE(gameState.playerTotal);
      } else {
        line = `同点だ。君は${gameState.playerTotal}、私は${gameState.devilTotal}。悪魔の館では、引き分けは私のもの。そういう規則なのだよ。`;
      }
    } else if (playerBust) {
      line = "君は66を越えた。実にわかりやすい終わり方だ。欲が足を出し、床がそれに応えた。";
    } else if (gameState.contractUsed) {
      line = `さきほど66を越えた君を、契約は${gameState.playerTotal}まで跳ね返した。だが、戻れたことと勝てることは別の話だ。君は${gameState.playerTotal}、私は${gameState.devilTotal}。私の勝ちだ。`;
    } else if (gameState.playerTotal >= 63) {
      line = "惜しかったな。実に惜しかった。そのわずかな距離を、私は見逃さなかった。";
    } else if (gameState.playerTotal >= 57 && finalGap > 0 && finalGap <= 2) {
      line = "わずかな差だったな。だが勝負というものは、そのわずかを棲み処にする。今夜は私がそこに座った。";
    } else if (gameState.playerTotal <= 35) {
      line = "もう終えるのかね。まだ玄関の灯りも背中にあるというのに。君は勝負ではなく、見学をしていたのかもしれないな。";
    } else if (gameState.playerTotal <= 49) {
      line = "そこで止まるとは、ずいぶん礼儀正しい客だ。私が歩く余白まで残してくれるとはね。";
    } else if (gameState.playerTotal <= 56) {
      line = "悪くない数だ。悪くない判断だ。だが、ここでは悪くないものから順に、悪魔の皿へ載る。";
    } else if (gameState.playerTotal <= 62) {
      line = "66の影は見えていた。だが、君はそこで足を止めた。私はその残り道を、ゆっくり歩かせてもらったよ。";
    } else {
      line = `君は${gameState.playerTotal}、私は${gameState.devilTotal}。私の勝ちだ。館の規則は単純だろう。単純だからこそ、逃げ場がない。`;
    }

    return withContractMarkTail(line);
  }

  function createElement(tagName, attributes = {}, text = "") {
    const element = document.createElement(tagName);
    Object.entries(attributes).forEach(([name, value]) => {
      if (value === null || value === undefined) return;
      element.setAttribute(name, String(value));
    });
    if (text) element.textContent = text;
    return element;
  }

  function renderCard(card, { hidden = false, animate = false } = {}) {
    const contracted = !hidden && isContractedCard(card);
    const figureClass = ["devil-game-card"];
    if (hidden) figureClass.push("is-hidden");
    if (contracted) figureClass.push("is-contracted");
    if (animate && isAnimationEnabled()) figureClass.push("is-dealt");
    const figure = createElement("figure", { class: figureClass.join(" ") });
    const baseAlt = hidden ? "裏向きのタロットカード" : (card?.media?.alt || `${getCardDisplayName(card)}のタロットカード`);
    const imageAlt = contracted ? `${baseAlt}。悪魔の契約の刻印があります。` : baseAlt;
    const imageButton = createElement("button", {
      type: "button",
      class: "devil-game-card__image-button image-zoom-button js-open-image-dialog",
      "data-image-src": hidden ? getCardBackSrc("large") : getCardImageSrc(card, "large"),
      "data-image-alt": imageAlt,
      "data-image-orientation": "upright",
      "aria-label": hidden ? "裏向きのカードを拡大表示" : `${getCardDisplayName(card)}の画像を拡大表示${contracted ? "。契約の刻印あり" : ""}`
    });
    const image = createElement("img", {
      src: hidden ? getCardBackSrc("thumb") : getCardImageSrc(card, "thumb"),
      alt: imageAlt,
      loading: "lazy",
      decoding: "async",
      width: "180",
      height: "270"
    });
    const zoomHint = createElement("span", { class: "image-zoom-hint", "aria-hidden": "true" }, "拡大");
    const badge = contracted ? createElement("span", { class: "contract-seal-badge" }, "契約") : null;
    const caption = createElement("figcaption", { class: "devil-game-card__caption" });
    const name = createElement("span", { class: "devil-game-card__name" }, hidden ? "裏向きのカード" : getCardDisplayName(card));
    const score = createElement("span", { class: "devil-game-card__score" });
    const desktopScore = createElement("span", { class: "desktop-card-score" }, hidden ? "点数：未公開" : `点数：${card.number}`);
    const mobileScore = createElement("span", { class: "mobile-card-score", "aria-hidden": "true" }, hidden ? "?" : String(card.number));

    score.append(desktopScore, mobileScore);
    caption.append(name, score);
    imageButton.append(image);
    if (badge) imageButton.appendChild(badge);
    imageButton.appendChild(zoomHint);
    figure.append(imageButton, caption);
    return figure;
  }

  function renderCardRow(container, cards, options = {}) {
    if (!container) return;
    const rowName = options.rowName || "cards";
    container.replaceChildren();
    cards.forEach((card, index) => {
      const hidden = Boolean(options.hideSecondCard && index === 1);
      const key = getCardRenderKey(rowName, index, card, hidden);
      const animate = pendingAnimatedCardKeys.has(key);
      container.appendChild(renderCard(card, { hidden, animate }));
    });
  }

  function getBoardDevilLine() {
    const latestMessage = gameState.log[gameState.log.length - 1] || DEFAULT_DEVIL_LINE;

    if (gameState.phase === "result" && gameState.resultDevilLine) {
      return gameState.resultModalDismissed ? gameState.resultDevilLine : latestMessage;
    }

    if (gameState.phase === "devil-turn" && gameState.devilTurnLine) {
      return gameState.devilTurnLine;
    }

    return latestMessage;
  }

  function renderLog() {
    setDevilLine(getBoardDevilLine());
  }

  function syncModal(modal, shouldOpen) {
    if (!modal) return;

    if (shouldOpen && !modal.open) {
      try {
        modal.showModal();
      } catch (error) {
        modal.setAttribute("open", "");
      }
      return;
    }

    if (!shouldOpen && modal.open) {
      if (typeof modal.close === "function") {
        modal.close();
      } else {
        modal.removeAttribute("open");
      }
    }
  }

  function setWinnerBoardState() {
    const showResultBoardState = gameState.phase === "result" && gameState.resultModalDismissed;
    const devilWins = showResultBoardState && gameState.winner === "devil";
    const playerWins = showResultBoardState && gameState.winner === "player";

    dom.devilCardArea?.classList.toggle("is-winner", devilWins);
    dom.playerCardArea?.classList.toggle("is-winner", playerWins);

    if (dom.devilWinnerBadge) dom.devilWinnerBadge.hidden = !devilWins;
    if (dom.playerWinnerBadge) dom.playerWinnerBadge.hidden = !playerWins;
  }

  function setBustSummaryState(element, total) {
    if (!element) return;
    element.classList.toggle("is-bust", isBust(total));
  }

  function setBoardSummary(element, text, label) {
    if (!element) return;
    element.textContent = text;
    if (label) {
      element.setAttribute("aria-label", label);
    } else {
      element.removeAttribute("aria-label");
    }
  }

  function getContractedCardThisGameName() {
    const card = gameState.contractedCardThisGame;
    return card ? `『${getCardDisplayName(card)}』` : "その札";
  }

  function getCleanLossEndingText() {
    const playerBust = isBust(gameState.playerTotal, gameState.target);
    const devilBust = isBust(gameState.devilTotal, gameState.target);
    const tiedWithoutBust = !playerBust && !devilBust && gameState.playerTotal === gameState.devilTotal;

    if (playerBust) {
      return gameState.bustedAfterPerfect66
        ? ENDINGS["loss-perfect-bust"]
        : "あなたは敗れた。\nあなたの欲は66の向こう側に落ちた。";
    }

    if (tiedWithoutBust) {
      if (isTargetScore(gameState.playerTotal)) {
        return TARGET_TIE_LOSS_ENDING;
      }
      if (isLowEffortTie(gameState)) {
        return LOW_EFFORT_TIE_LOSS_ENDING;
      }
      return "あなたは敗れた。\n同じ数に辿り着いた。だが、この館では同点は悪魔のものだ。";
    }

    const finalGap = Math.max(0, gameState.devilTotal - gameState.playerTotal);
    if (gameState.playerTotal >= 63) return CLEAN_STAND_LOSS_ENDINGS.veryNear;
    if (gameState.playerTotal >= 57 && finalGap > 0 && finalGap <= 2) return CLEAN_STAND_LOSS_ENDINGS.narrow;
    if (gameState.playerTotal <= 35) return CLEAN_STAND_LOSS_ENDINGS.veryLow;
    if (gameState.playerTotal <= 49) return CLEAN_STAND_LOSS_ENDINGS.low;
    if (gameState.playerTotal <= 56) return CLEAN_STAND_LOSS_ENDINGS.middle;
    if (gameState.playerTotal <= 62) return CLEAN_STAND_LOSS_ENDINGS.near;

    return ENDINGS["loss-clean"];
  }

  function getCleanWinEndingText() {
    const devilBust = isBust(gameState.devilTotal, gameState.target);
    const finalGap = Math.max(0, gameState.playerTotal - gameState.devilTotal);

    if (isTargetScore(gameState.playerTotal)) return CLEAN_WIN_ENDINGS.target;
    if (devilBust) return CLEAN_WIN_ENDINGS.devilBust;
    if (gameState.playerTotal >= 57 && finalGap > 0 && finalGap <= 2) return CLEAN_WIN_ENDINGS.narrow;

    return CLEAN_WIN_ENDINGS.normal;
  }

  function getResultDevilLine() {
    return gameState.resultDevilLine || "";
  }

  function getResultEndingText() {
    if (gameState.resultType === "loss-perfect-bust") {
      return ENDINGS["loss-perfect-bust"];
    }

    if (gameState.resultType === "win-devil-surrender") {
      return gameState.contractUsed
        ? `${DEVIL_SURRENDER_WIN_ENDING}
けれど、${getContractedCardThisGameName()}には悪魔の印が残った。`
        : DEVIL_SURRENDER_WIN_ENDING;
    }

    if (gameState.resultType === "win-clean") {
      return getCleanWinEndingText();
    }

    if (gameState.resultType === "loss-clean") {
      return getCleanLossEndingText();
    }

    if (gameState.resultType === "win-contract") {
      return `あなたは勝った。
けれど、${getContractedCardThisGameName()}だけは以前の姿では戻らなかった。
そのカードには、悪魔の印が残った。`;
    }

    if (gameState.resultType === "loss-contract") {
      const playerBust = isBust(gameState.playerTotal, gameState.target);
      const devilBust = isBust(gameState.devilTotal, gameState.target);
      const tiedAtTarget = !playerBust && !devilBust && isTargetScore(gameState.playerTotal) && isTargetScore(gameState.devilTotal);
      if (tiedAtTarget) {
        return `${TARGET_TIE_LOSS_ENDING}
${getContractedCardThisGameName()}に残った印も、まだ消えてはいない。`;
      }
      return `あなたは敗れた。
勝負は終わった。だが、${getContractedCardThisGameName()}に残った印はまだ終わっていない。`;
    }

    return ENDINGS[gameState.resultType] || "遊戯は終わった。";
  }

  function renderResult() {
    const isResult = gameState.phase === "result";
    const playerWon = isResult && gameState.winner === "player";
    const playerLost = isResult && gameState.winner === "devil";

    dom.resultArea?.classList.toggle("is-win", playerWon);
    dom.resultArea?.classList.toggle("is-loss", playerLost);

    if (isResult) {
      const winnerText = playerWon ? "あなたの勝ち" : "悪魔の勝ち";
      const resultTitle = playerWon ? "勝利" : "敗北";
      const scoreText = `あなた：${gameState.playerTotal} / 悪魔：${gameState.hiddenDevilCardRevealed ? gameState.devilTotal : "未公開"}`;

      if (dom.resultTitle) dom.resultTitle.textContent = resultTitle;
      if (dom.resultSummary) dom.resultSummary.textContent = `${winnerText}。${scoreText}`;
      if (dom.endingText) dom.endingText.textContent = getResultEndingText();
    } else {
      if (dom.resultTitle) dom.resultTitle.textContent = "勝敗";
      if (dom.resultSummary) dom.resultSummary.textContent = "";
      if (dom.endingText) dom.endingText.textContent = "";
    }

    syncModal(dom.resultArea, isResult && !gameState.resultModalDismissed && !isInteractionLocked);
  }

  function render() {
    syncTotals();

    if (dom.gamePage) dom.gamePage.dataset.phase = gameState.phase;
    setWinnerBoardState();

    const visibleDevilTotal = getVisibleDevilTotal();

    const hideSecondDevilCard = !gameState.hiddenDevilCardRevealed && gameState.devilCards.length > 1;
    renderCardRow(dom.devilCards, gameState.devilCards, { hideSecondCard: hideSecondDevilCard, rowName: "devil" });
    renderCardRow(dom.playerCards, gameState.playerCards, { rowName: "player" });

    const isBeforeGame = gameState.phase === "intro" || gameState.phase === "loading";

    if (dom.devilCardsSummary) {
      if (isBeforeGame || !gameState.devilCards.length) {
        setBoardSummary(dom.devilCardsSummary, `0/${TARGET_SCORE}`, `ゲーム開始前。悪魔の合計は0、目標は${TARGET_SCORE}。`);
        dom.devilCardsSummary.classList.remove("is-bust");
      } else {
        const devilSummaryTotal = gameState.hiddenDevilCardRevealed ? gameState.devilTotal : visibleDevilTotal;
        if (gameState.hiddenDevilCardRevealed) {
          setBoardSummary(dom.devilCardsSummary, `${gameState.devilTotal}/${TARGET_SCORE}`, `悪魔の合計は${gameState.devilTotal}、目標は${TARGET_SCORE}。`);
        } else {
          setBoardSummary(dom.devilCardsSummary, `${visibleDevilTotal}+伏/${TARGET_SCORE}`, `悪魔の見えている合計は${visibleDevilTotal}、伏せ札があります。目標は${TARGET_SCORE}。`);
        }
        setBustSummaryState(dom.devilCardsSummary, devilSummaryTotal);
      }
    }

    if (dom.playerCardsSummary) {
      if (isBeforeGame || !gameState.playerCards.length) {
        setBoardSummary(dom.playerCardsSummary, `0/${TARGET_SCORE}`, `ゲーム開始前。あなたの合計は0、目標は${TARGET_SCORE}。`);
        dom.playerCardsSummary.classList.remove("is-bust");
      } else {
        setBoardSummary(dom.playerCardsSummary, `${gameState.playerTotal}/${TARGET_SCORE}`, `あなたの合計は${gameState.playerTotal}、目標は${TARGET_SCORE}。`);
        setBustSummaryState(dom.playerCardsSummary, gameState.playerTotal);
      }
    }

    const locked = isInteractionLocked;
    const playerCanAct = gameState.phase === "player-turn" && !locked;
    const standConfirmCanAct = gameState.phase === "stand-confirm" && !locked;
    const contractCanAct = gameState.phase === "contract-offer" && !locked;
    const isResultWaitingForBoard = gameState.phase === "result" && !gameState.resultModalDismissed;
    const isGameInProgress = !["intro", "result"].includes(gameState.phase) || isResultWaitingForBoard;
    if (dom.startGameButton) {
      dom.startGameButton.hidden = false;
      dom.startGameButton.disabled = isGameInProgress || locked;
      dom.startGameButton.textContent = gameState.phase === "intro"
        ? "ゲームスタート"
        : "もう一度遊ぶ";
    }
    if (dom.drawButton) dom.drawButton.disabled = !playerCanAct;
    if (dom.standButton) dom.standButton.disabled = !playerCanAct;
    if (dom.standConfirmDescription) {
      dom.standConfirmDescription.textContent = gameState.standConfirmationMessage || getStandConfirmationMessage(gameState.playerTotal);
    }
    if (dom.contractOfferDetail) {
      dom.contractOfferDetail.textContent = getContractOfferDetailMessage();
    }
    syncModal(dom.standConfirm, standConfirmCanAct);
    if (dom.confirmStandButton) dom.confirmStandButton.disabled = !standConfirmCanAct;
    if (dom.reconsiderStandButton) dom.reconsiderStandButton.disabled = !standConfirmCanAct;
    syncModal(dom.contractOffer, contractCanAct);
    if (dom.acceptContractButton) {
      dom.acceptContractButton.disabled = !contractCanAct;
      if (contractCanAct && gameState.lastPlayerCard) {
        dom.acceptContractButton.setAttribute("aria-label", `契約して合計を${getReflectedContractTotal(gameState.playerTotal)}に戻す`);
      } else {
        dom.acceptContractButton.removeAttribute("aria-label");
      }
    }
    if (dom.rejectContractButton) dom.rejectContractButton.disabled = !contractCanAct;
    if (dom.contractCloseButton) dom.contractCloseButton.disabled = !contractCanAct;

    renderLog();
    renderResult();
    pendingAnimatedCardKeys.clear();
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

    imageDialog.querySelector(".image-dialog-close")?.addEventListener("click", closeImageDialog);

    imageDialog.addEventListener("click", (event) => {
      if (event.target === imageDialog) closeImageDialog();
    });

    imageDialog.addEventListener("close", () => {
      const img = imageDialog.querySelector(".image-dialog-img");
      if (img) {
        img.removeAttribute("src");
        img.alt = "";
      }
      imageDialog.classList.remove("is-reversed", "is-square");

      if (lastImageDialogTrigger && document.body.contains(lastImageDialogTrigger)) {
        focusElement(lastImageDialogTrigger);
      }
      lastImageDialogTrigger = null;
    });

    return imageDialog;
  }

  function openImageDialog(trigger) {
    const src = trigger?.dataset?.imageSrc;
    if (!src) return;

    const dialog = ensureImageDialog();
    const img = dialog.querySelector(".image-dialog-img");
    if (!img) return;

    const alt = trigger.dataset.imageAlt || "拡大表示した画像";
    const orientation = trigger.dataset.imageOrientation || "upright";
    const shape = trigger.dataset.imageShape || "card";

    lastImageDialogTrigger = trigger;
    img.src = src;
    img.alt = alt;
    dialog.classList.toggle("is-reversed", orientation === "reversed");
    dialog.classList.toggle("is-square", shape === "square");
    dialog.setAttribute("aria-label", alt);

    if (typeof dialog.showModal === "function") {
      try {
        dialog.showModal();
      } catch (error) {
        dialog.setAttribute("open", "");
      }
      dialog.querySelector(".image-dialog-close")?.focus();
    } else {
      dialog.setAttribute("open", "");
    }
  }

  function closeImageDialog() {
    if (!imageDialog) return;

    if (typeof imageDialog.close === "function" && imageDialog.open) {
      imageDialog.close();
      return;
    }

    imageDialog.removeAttribute("open");
    const img = imageDialog.querySelector(".image-dialog-img");
    if (img) {
      img.removeAttribute("src");
      img.alt = "";
    }
    imageDialog.classList.remove("is-reversed", "is-square");

    if (lastImageDialogTrigger && document.body.contains(lastImageDialogTrigger)) {
      focusElement(lastImageDialogTrigger);
    }
    lastImageDialogTrigger = null;
  }

  function handleImageDialogClick(event) {
    const trigger = event.target.closest(".js-open-image-dialog");
    if (!trigger) return;

    event.preventDefault();
    event.stopPropagation();
    openImageDialog(trigger);
  }

  function getOpeningScrollSettleDelay() {
    return isAnimationEnabled() ? OPENING_SCROLL_SETTLE_MS : REDUCED_OPENING_SCROLL_SETTLE_MS;
  }

  async function scrollToOpeningBoardBeforeDeal() {
    scrollToOpeningBoard();
    await delay(getOpeningScrollSettleDelay());
  }

  function scrollToOpeningBoard() {
    const target = dom.devilCardArea || dom.devilCards;
    if (!target || typeof target.scrollIntoView !== "function") return;

    window.setTimeout(() => {
      target.scrollIntoView({
        block: "start",
        inline: "nearest",
        behavior: isAnimationEnabled() ? "smooth" : "auto"
      });
    }, 0);
  }

  function focusElement(element, options = {}) {
    if (!element || element.hidden || element.disabled) return;
    const preventScroll = Boolean(options.preventScroll);
    window.setTimeout(() => {
      try {
        element.focus({ preventScroll });
      } catch (error) {
        try { element.focus(); } catch (innerError) {}
      }
    }, 0);
  }

  function bindDom() {
    dom.gamePage = document.querySelector(".devil-game-page");
    dom.statWins = document.getElementById("devil-stat-wins");
    dom.statLosses = document.getElementById("devil-stat-losses");
    dom.statContracts = document.getElementById("devil-stat-contracts");
    dom.statMood = document.getElementById("devil-stat-mood");
    dom.opponentImage = document.getElementById("devil-opponent-image");
    dom.opponentImageButton = document.getElementById("devil-opponent-image-button");
    dom.devilLines = Array.from(document.querySelectorAll(".devil-line"));
    dom.devilCards = document.getElementById("devil-cards");
    dom.playerCards = document.getElementById("player-cards");
    dom.devilCardsSummary = document.getElementById("devil-cards-summary");
    dom.playerCardsSummary = document.getElementById("player-cards-summary");
    dom.devilCardArea = document.querySelector(".devil-card-area--devil");
    dom.playerCardArea = document.querySelector(".devil-card-area--player");
    dom.devilWinnerBadge = document.getElementById("devil-winner-badge");
    dom.playerWinnerBadge = document.getElementById("player-winner-badge");
    dom.startGameButton = document.getElementById("start-game");
    dom.soundEnabledToggle = document.getElementById("devil-sound-enabled");
    dom.animationEnabledToggle = document.getElementById("devil-animation-enabled");
    dom.flipSound = document.getElementById("devil-flip-sound");
    dom.drawButton = document.getElementById("draw-card");
    dom.standButton = document.getElementById("stand");
    dom.standConfirm = document.getElementById("stand-confirm");
    dom.standConfirmDescription = document.getElementById("stand-confirm-description");
    dom.confirmStandButton = document.getElementById("confirm-stand");
    dom.reconsiderStandButton = document.getElementById("reconsider-stand");
    dom.contractOffer = document.getElementById("contract-offer");
    dom.contractOfferDetail = document.getElementById("contract-offer-detail");
    dom.contractCloseButton = document.getElementById("contract-close");
    dom.acceptContractButton = document.getElementById("accept-contract");
    dom.rejectContractButton = document.getElementById("reject-contract");
    dom.resultArea = document.getElementById("result-area");
    dom.resultTitle = document.getElementById("result-title");
    dom.resultSummary = document.getElementById("result-summary");
    dom.endingText = document.getElementById("ending-text");
    dom.viewBoardButton = document.getElementById("view-board");
    dom.ruleOpenButton = document.getElementById("open-rule-dialog");
    dom.ruleDialog = document.getElementById("rule-dialog");
    dom.ruleCloseButton = document.getElementById("close-rule-dialog");
    dom.contractOpenButton = document.getElementById("open-contract-dialog");
    dom.contractDialog = document.getElementById("contract-dialog");
    dom.contractCloseDialogButton = document.getElementById("close-contract-dialog");
    dom.contractDialogStatus = document.getElementById("contract-dialog-status");
    dom.contractedCardsList = document.getElementById("contracted-cards");
    dom.recordResetOpenButton = document.getElementById("open-record-reset-dialog");
    dom.recordResetDialog = document.getElementById("record-reset-dialog");
    dom.recordResetCloseButton = document.getElementById("close-record-reset-dialog");
    dom.recordResetConfirmButton = document.getElementById("confirm-record-reset");
    dom.recordResetCancelButton = document.getElementById("cancel-record-reset");
    dom.debugPanel = document.getElementById("devil-debug-panel");
    dom.debugStatus = document.getElementById("devil-debug-status");
  }

  function getDebugCardByNumber(number) {
    const card = getMajorArcanaCards().find((item) => Number(item.number) === Number(number));
    if (!card) throw new Error(`大アルカナ ${number} が見つかりません。`);
    return card;
  }

  function getDebugCards(numbers) {
    return numbers.map(getDebugCardByNumber);
  }

  function normalizeDebugCardNumbers(numbers, label) {
    if (!Array.isArray(numbers)) {
      throw new Error(`${label} のカード指定が配列ではありません。`);
    }

    return numbers.map((number) => {
      const value = Number(number);
      if (!Number.isInteger(value) || value < 0 || value > 21) {
        throw new Error(`${label} に不正なカード番号 ${number} があります。`);
      }
      getDebugCardByNumber(value);
      return value;
    });
  }

  function assertDebugUniqueCardNumbers(groups) {
    const seen = new Map();
    groups.forEach(([label, numbers]) => {
      numbers.forEach((number) => {
        if (seen.has(number)) {
          throw new Error(`大アルカナ ${number} が ${seen.get(number)} と ${label} で重複しています。`);
        }
        seen.set(number, label);
      });
    });
  }

  function buildDebugDeck(playerNumbers, devilNumbers, deckNumbers) {
    assertDebugUniqueCardNumbers([
      ["あなたの手札", playerNumbers],
      ["悪魔の手札", devilNumbers],
      ["予約された山札", deckNumbers]
    ]);

    const reservedNumbers = new Set([...playerNumbers, ...devilNumbers, ...deckNumbers]);
    const reservedCards = deckNumbers.map(getDebugCardByNumber);
    const remainingCards = shuffleCards(
      getMajorArcanaCards().filter((card) => !reservedNumbers.has(Number(card.number)))
    );

    return reservedCards.concat(remainingCards);
  }

  function closeDebugInterruptingModals() {
    [dom.standConfirm, dom.contractOffer, dom.resultArea].forEach((modal) => {
      if (!modal) return;
      if (typeof modal.close === "function" && modal.open) {
        try { modal.close(); } catch (error) { modal.removeAttribute("open"); }
      } else {
        modal.removeAttribute("open");
      }
    });
  }

  function setDebugStatus(message) {
    if (dom.debugStatus) dom.debugStatus.textContent = message;
  }

  function setDebugState({ name, player, devil, deck = [], contractUsed = false, contractedCard = null, contractedCards = [], hiddenRevealed = false }) {
    closeDebugInterruptingModals();
    setInteractionLocked(false);
    pendingAnimatedCardKeys.clear();

    const playerNumbers = normalizeDebugCardNumbers(player, "あなたの手札");
    const devilNumbers = normalizeDebugCardNumbers(devil, "悪魔の手札");
    const deckNumbers = normalizeDebugCardNumbers(deck, "予約された山札");
    const contractedNumbers = normalizeDebugCardNumbers(contractedCards, "契約済み札");
    const contractedCardNumber = contractedCard === null || contractedCard === undefined
      ? null
      : normalizeDebugCardNumbers([contractedCard], "この勝負で契約した札")[0];
    const contractedCardObject = contractedCardNumber === null ? null : getDebugCardByNumber(contractedCardNumber);
    const debugContractedCardIds = contractedNumbers
      .map((number) => getDebugCardByNumber(number).id)
      .filter(Boolean);
    if (contractedCardObject?.id && !debugContractedCardIds.includes(contractedCardObject.id)) {
      debugContractedCardIds.push(contractedCardObject.id);
    }

    gameState.playerCards = getDebugCards(playerNumbers);
    gameState.devilCards = getDebugCards(devilNumbers);
    gameState.deck = buildDebugDeck(playerNumbers, devilNumbers, deckNumbers);
    gameState.hiddenDevilCardRevealed = hiddenRevealed;
    gameState.playerContractAdjustment = 0;
    gameState.target = TARGET_SCORE;
    gameState.aiProfileId = getCurrentDevilAiProfile().id;
    gameState.phase = "player-turn";
    gameState.contractUsed = contractUsed;
    gameState.lastPlayerCard = null;
    gameState.contractedCardThisGame = contractedCardObject;
    gameState.bustedAfterPerfect66 = false;
    gameState.debugScenarioActive = true;
    gameState.debugScenarioName = name || "デバッグシナリオ";
    gameState.debugIgnoreStoredContracts = true;
    gameState.debugContractedCardIds = debugContractedCardIds;
    gameState.winner = null;
    gameState.resultType = null;
    gameState.resultModalDismissed = false;
    gameState.resultDevilLine = "";
    gameState.resultDevilLineLogged = false;
    gameState.statsRecorded = false;
    gameState.standConfirmationMessage = "";
    gameState.devilTurnLine = "";
    gameState.devilShowoffDrawUsed = false;
    gameState.devilSurrendered = false;
    gameState.devilDecisionReason = "";
    gameState.log = [`【DEBUG】${gameState.debugScenarioName}。この結果は勝敗記録と契約台帳に保存されない。`];
    syncTotals();
    render();

    const contractedStatus = contractUsed
      ? `、契約済み${contractedCardObject ? `（${getCardDisplayName(contractedCardObject)}）` : ""}`
      : "";
    const markedStatus = debugContractedCardIds.length
      ? `、印付き札 ${debugContractedCardIds.length}枚`
      : "";
    setDebugStatus(`準備完了：${gameState.debugScenarioName} / あなた ${gameState.playerTotal}、悪魔 ${gameState.devilTotal}、次の予約札 ${deckNumbers.join("・") || "なし"}、残り山札 ${gameState.deck.length}枚${contractedStatus}${markedStatus}`);
  }

  async function debugPlayerDraw() {
    await playerDraw();
    if (gameState.phase === "result") render();
  }

  async function debugStandThroughResult() {
    playerStand();
    await delay(160);
    if (gameState.phase === "stand-confirm") {
      await confirmStand();
    }
  }

  function debugFinishCurrentResult() {
    gameState.hiddenDevilCardRevealed = true;
    finishGame();
    render();
  }

  async function runDebugScenario(id) {
    const scenarios = {
      targetStandConfirm: async () => {
        setDebugState({ name: "66ジャストの留まる確認", player: [21, 20, 19, 6], devil: [0, 2], deck: [1], hiddenRevealed: false });
        playerStand();
      },
      perfect66BustReject: async () => {
        setDebugState({ name: "66ジャストから一枚引いてバースト、契約を拒否", player: [21, 20, 19, 6], devil: [0, 2], deck: [1], contractUsed: false });
        await debugPlayerDraw();
        await delay(240);
        if (gameState.phase === "contract-offer") rejectContract();
      },
      perfect66MarkedBustImmediate: async () => {
        setDebugState({ name: "66ジャストから印付き札を引いてバースト即敗北", player: [21, 20, 19, 6], devil: [0, 2], deck: [1], contractUsed: false, contractedCards: [1] });
        await debugPlayerDraw();
      },
      targetTie: async () => {
        setDebugState({ name: "66同士で同点、悪魔勝利", player: [21, 20, 19, 6], devil: [18, 17, 16, 15], deck: [], hiddenRevealed: true });
        debugFinishCurrentResult();
      },
      contractTargetTieLoss: async () => {
        setDebugState({ name: "契約後に66同士で同点、悪魔勝利", player: [21, 20, 19, 6], devil: [18, 17, 16, 15], deck: [], hiddenRevealed: true, contractUsed: true, contractedCard: 7, contractedCards: [7] });
        debugFinishCurrentResult();
      },
      normalBustOffer: async () => {
        setDebugState({ name: "通常バースト、契約提示", player: [21, 20, 19, 5], devil: [0, 1], deck: [2], contractUsed: false });
        await debugPlayerDraw();
      },
      normalBustReject: async () => {
        setDebugState({ name: "通常バースト、契約を拒否", player: [21, 20, 19, 5], devil: [0, 1], deck: [2], contractUsed: false });
        await debugPlayerDraw();
        await delay(240);
        if (gameState.phase === "contract-offer") rejectContract();
      },
      normalBustAcceptDevilWin: async () => {
        setDebugState({ name: "通常バースト→契約受諾→悪魔勝利", player: [21, 20, 19, 5], devil: [18, 17, 16, 15], deck: [2], contractUsed: false });
        await debugPlayerDraw();
        await delay(240);
        if (gameState.phase === "contract-offer") {
          await acceptContract();
        }
      },
      markedCardBust: async () => {
        setDebugState({ name: "印付き札を引いて通常バースト即敗北", player: [21, 20, 19, 5], devil: [0, 1], deck: [2], contractedCards: [2], contractUsed: false });
        await debugPlayerDraw();
      },
      veryLowStandLoss: async () => {
        setDebugState({ name: "35以下で留まって敗北", player: [21, 14], devil: [20, 19, 18], deck: [], hiddenRevealed: true });
        debugFinishCurrentResult();
      },
      lowStandLoss: async () => {
        setDebugState({ name: "36〜49で留まって敗北", player: [21, 20], devil: [19, 18, 17, 4], deck: [], hiddenRevealed: true });
        debugFinishCurrentResult();
      },
      middleStandLoss: async () => {
        setDebugState({ name: "50〜56で留まって敗北", player: [21, 20, 10], devil: [19, 18, 17, 4], deck: [], hiddenRevealed: true });
        debugFinishCurrentResult();
      },
      nearStandLoss: async () => {
        setDebugState({ name: "57〜62で留まって敗北", player: [21, 20, 17], devil: [19, 18, 16, 9], deck: [], hiddenRevealed: true });
        debugFinishCurrentResult();
      },
      veryNearStandLoss: async () => {
        setDebugState({ name: "63〜65で留まって敗北", player: [21, 20, 19, 4], devil: [18, 17, 16, 14], deck: [], hiddenRevealed: true });
        debugFinishCurrentResult();
      },
      narrowStandLoss: async () => {
        setDebugState({ name: "僅差で留まって敗北", player: [21, 20, 18], devil: [19, 18, 17, 7], deck: [], hiddenRevealed: true });
        debugFinishCurrentResult();
      },
      normalTieLoss: async () => {
        setDebugState({ name: "通常同点で悪魔勝利", player: [21, 20, 19], devil: [18, 17, 16, 9], deck: [], hiddenRevealed: true });
        debugFinishCurrentResult();
      },
      lowEffortTiePunish: async () => {
        setDebugState({ name: "低得点同点から悪魔が安全に一枚引いて勝利", player: [21, 14], devil: [20, 15], deck: [1], hiddenRevealed: true });
        await proceedToDevilTurn();
      },
      lowEffortTieNoSafeDraw: async () => {
        setDebugState({ name: "低得点同点だが次札バーストのため悪魔が止まって勝利", player: [21, 20], devil: [19, 18, 4], deck: [21], hiddenRevealed: true });
        await proceedToDevilTurn();
      },
      contractStandLoss: async () => {
        setDebugState({ name: "契約後に留まって敗北", player: [21, 20, 17], devil: [19, 18, 16, 9], deck: [], hiddenRevealed: true, contractUsed: true, contractedCard: 7, contractedCards: [7] });
        debugFinishCurrentResult();
      },
      normalCleanWin: async () => {
        setDebugState({ name: "通常勝利・悪魔通常敗北", player: [21, 20, 14, 6], devil: [19, 18, 16, 2], deck: [], hiddenRevealed: true });
        debugFinishCurrentResult();
      },
      devilSurrenderWin: async () => {
        setDebugState({ name: "悪魔が勝ち筋なしで札を伏せる", player: [21, 20, 19, 3, 2, 1, 0], devil: [18, 17, 16, 12], deck: [], hiddenRevealed: true });
        await proceedToDevilTurn();
      },
      narrowCleanWin: async () => {
        setDebugState({ name: "僅差勝利・悪魔僅差敗北", player: [21, 20, 17], devil: [19, 18, 16, 3], deck: [], hiddenRevealed: true });
        debugFinishCurrentResult();
      },
      cleanTargetWin: async () => {
        setDebugState({ name: "66勝利・悪魔66敗北", player: [21, 20, 19, 6], devil: [18, 17, 16, 9], deck: [], hiddenRevealed: true });
        debugFinishCurrentResult();
      },
      devilBustWinLow: async () => {
        setDebugState({ name: "悪魔バーストで勝利（49以下）", player: [21, 14], devil: [20, 19, 18, 10], deck: [], hiddenRevealed: true });
        debugFinishCurrentResult();
      },
      devilBustWinMiddle: async () => {
        setDebugState({ name: "悪魔バーストで勝利（50〜56）", player: [21, 20, 10], devil: [19, 18, 16, 14], deck: [], hiddenRevealed: true });
        debugFinishCurrentResult();
      },
      devilBustWinNear: async () => {
        setDebugState({ name: "悪魔バーストで勝利（57〜62）", player: [21, 20, 17], devil: [19, 18, 16, 14], deck: [], hiddenRevealed: true });
        debugFinishCurrentResult();
      },
      devilBustWinVeryNear: async () => {
        setDebugState({ name: "悪魔バーストで勝利（63〜65）", player: [21, 20, 19, 4], devil: [18, 17, 16, 15, 1], deck: [], hiddenRevealed: true });
        debugFinishCurrentResult();
      },
      devilBustWinTarget: async () => {
        setDebugState({ name: "悪魔バーストで勝利（66）", player: [21, 20, 19, 6], devil: [18, 17, 16, 15, 1], deck: [], hiddenRevealed: true });
        debugFinishCurrentResult();
      },
      contractWin: async () => {
        setDebugState({ name: "契約札込みで勝利", player: [21, 20, 17], devil: [19, 18, 16, 3], deck: [], hiddenRevealed: true, contractUsed: true, contractedCard: 7, contractedCards: [7] });
        debugFinishCurrentResult();
      },
      contractDevilBustWin: async () => {
        setDebugState({ name: "契約札込み、悪魔バーストで勝利", player: [21, 20, 17], devil: [19, 18, 16, 14], deck: [], hiddenRevealed: true, contractUsed: true, contractedCard: 7, contractedCards: [7] });
        debugFinishCurrentResult();
      }
    };

    const scenario = scenarios[id];
    if (!scenario) return;

    try {
      await scenario();
      setDebugStatus(`実行済み：${gameState.debugScenarioName} / フェーズ：${gameState.phase} / 結果：${gameState.resultType || "未確定"} / JS：${DEVIL_GAME_BUILD} / 最後の悪魔の声：${gameState.log[gameState.log.length - 1] || "なし"}`);
      render();
    } catch (error) {
      console.error(error);
      setDebugStatus(`デバッグシナリオの実行に失敗：${error.message || error}`);
    }
  }

  function createDebugPanel() {
    if (!DEBUG_MODE || !dom.gamePage || dom.debugPanel) return;

    const panel = document.createElement("section");
    panel.id = "devil-debug-panel";
    panel.className = "devil-debug-panel";
    panel.setAttribute("aria-labelledby", "devil-debug-title");
    panel.innerHTML = `
      <div class="devil-debug-panel__header">
        <p class="eyebrow">Debug Room</p>
        <h3 id="devil-debug-title">開発者用操作盤</h3>
        <p>URLに <code>?debug=1</code> がある時だけ表示されます。ここから実行したシナリオは、勝敗記録と契約台帳に保存されません。<br>読み込み中のJS: <code>${DEVIL_GAME_BUILD}</code></p>
      </div>
      <div class="devil-debug-panel__sections" aria-label="デバッグシナリオ">
        <section class="devil-debug-section" aria-labelledby="devil-debug-section-66">
          <h4 id="devil-debug-section-66">66特殊・同点</h4>
          <div class="devil-debug-panel__grid">
            <button type="button" class="button-link secondary devil-debug-button" data-debug-scenario="targetStandConfirm">66留まる確認</button>
            <button type="button" class="button-link secondary devil-debug-button" data-debug-scenario="perfect66BustReject">66→バースト→契約拒否</button>
            <button type="button" class="button-link secondary devil-debug-button" data-debug-scenario="perfect66MarkedBustImmediate">66→印付き札バースト即敗北</button>
            <button type="button" class="button-link secondary devil-debug-button" data-debug-scenario="targetTie">66同士・悪魔勝利</button>
            <button type="button" class="button-link secondary devil-debug-button" data-debug-scenario="contractTargetTieLoss">契約後66同点・悪魔勝利</button>
          </div>
        </section>
        <section class="devil-debug-section" aria-labelledby="devil-debug-section-bust">
          <h4 id="devil-debug-section-bust">バースト・契約敗北</h4>
          <div class="devil-debug-panel__grid">
            <button type="button" class="button-link secondary devil-debug-button" data-debug-scenario="normalBustOffer">通常バースト→契約提示</button>
            <button type="button" class="button-link secondary devil-debug-button" data-debug-scenario="normalBustReject">通常バースト→契約拒否</button>
            <button type="button" class="button-link secondary devil-debug-button" data-debug-scenario="normalBustAcceptDevilWin">通常バースト→契約受諾→悪魔勝利</button>
            <button type="button" class="button-link secondary devil-debug-button" data-debug-scenario="markedCardBust">印付き札→通常バースト敗北</button>
          </div>
        </section>
        <section class="devil-debug-section" aria-labelledby="devil-debug-section-stand-loss">
          <h4 id="devil-debug-section-stand-loss">留まり負け・同点負け</h4>
          <div class="devil-debug-panel__grid">
            <button type="button" class="button-link secondary devil-debug-button" data-debug-scenario="veryLowStandLoss">35以下で留まり負け</button>
            <button type="button" class="button-link secondary devil-debug-button" data-debug-scenario="lowStandLoss">36〜49で留まり負け</button>
            <button type="button" class="button-link secondary devil-debug-button" data-debug-scenario="middleStandLoss">50〜56で留まり負け</button>
            <button type="button" class="button-link secondary devil-debug-button" data-debug-scenario="nearStandLoss">57〜62で留まり負け</button>
            <button type="button" class="button-link secondary devil-debug-button" data-debug-scenario="veryNearStandLoss">63〜65で留まり負け</button>
            <button type="button" class="button-link secondary devil-debug-button" data-debug-scenario="narrowStandLoss">僅差で留まり負け</button>
            <button type="button" class="button-link secondary devil-debug-button" data-debug-scenario="normalTieLoss">通常同点・悪魔勝利</button>
            <button type="button" class="button-link secondary devil-debug-button" data-debug-scenario="lowEffortTiePunish">低得点同点→悪魔追撃</button>
            <button type="button" class="button-link secondary devil-debug-button" data-debug-scenario="lowEffortTieNoSafeDraw">低得点同点→次札バースト停止</button>
            <button type="button" class="button-link secondary devil-debug-button" data-debug-scenario="contractStandLoss">契約後に留まり負け</button>
          </div>
        </section>
        <section class="devil-debug-section" aria-labelledby="devil-debug-section-win">
          <h4 id="devil-debug-section-win">勝利ナレーション・悪魔敗北セリフ</h4>
          <div class="devil-debug-panel__grid">
            <button type="button" class="button-link secondary devil-debug-button" data-debug-scenario="normalCleanWin">通常勝利・悪魔通常敗北</button>
            <button type="button" class="button-link secondary devil-debug-button" data-debug-scenario="devilSurrenderWin">悪魔が札を伏せて勝利</button>
            <button type="button" class="button-link secondary devil-debug-button" data-debug-scenario="narrowCleanWin">僅差勝利・悪魔僅差敗北</button>
            <button type="button" class="button-link secondary devil-debug-button" data-debug-scenario="cleanTargetWin">66勝利・悪魔66敗北</button>
            <button type="button" class="button-link secondary devil-debug-button" data-debug-scenario="devilBustWinLow">悪魔バースト勝利（49以下）</button>
            <button type="button" class="button-link secondary devil-debug-button" data-debug-scenario="devilBustWinMiddle">悪魔バースト勝利（50〜56）</button>
            <button type="button" class="button-link secondary devil-debug-button" data-debug-scenario="devilBustWinNear">悪魔バースト勝利（57〜62）</button>
            <button type="button" class="button-link secondary devil-debug-button" data-debug-scenario="devilBustWinVeryNear">悪魔バースト勝利（63〜65）</button>
            <button type="button" class="button-link secondary devil-debug-button" data-debug-scenario="devilBustWinTarget">悪魔バースト勝利（66）</button>
            <button type="button" class="button-link secondary devil-debug-button" data-debug-scenario="contractWin">契約札込みで勝利</button>
            <button type="button" class="button-link secondary devil-debug-button" data-debug-scenario="contractDevilBustWin">契約札込み・悪魔バースト勝利</button>
          </div>
        </section>
      </div>
      <p id="devil-debug-status" class="devil-debug-panel__status" role="status" aria-live="polite">待機中。悪魔より邪悪な操作盤です。</p>
    `;

    dom.gamePage.appendChild(panel);
    dom.debugPanel = panel;
    dom.debugStatus = panel.querySelector("#devil-debug-status");
    panel.addEventListener("click", (event) => {
      const button = event.target.closest("[data-debug-scenario]");
      if (!button) return;
      event.preventDefault();
      runDebugScenario(button.dataset.debugScenario);
    });
  }

  function openRuleDialog() {
    if (!dom.ruleDialog) return;

    try {
      dom.ruleDialog.showModal();
    } catch (error) {
      dom.ruleDialog.setAttribute("open", "");
    }

    focusElement(dom.ruleCloseButton);
  }

  function closeRuleDialog() {
    if (!dom.ruleDialog) return;

    if (typeof dom.ruleDialog.close === "function" && dom.ruleDialog.open) {
      dom.ruleDialog.close();
      return;
    }

    dom.ruleDialog.removeAttribute("open");
    focusElement(dom.ruleOpenButton);
  }

  function openContractDialog() {
    if (!dom.contractDialog) return;
    gameStats = loadGameStats();
    renderStats();
    if (!getContractedCardIds().length) return;
    renderContractDialog();

    try {
      dom.contractDialog.showModal();
    } catch (error) {
      dom.contractDialog.setAttribute("open", "");
    }

    focusElement(dom.contractCloseDialogButton);
  }

  function closeContractDialog() {
    if (!dom.contractDialog) return;

    if (typeof dom.contractDialog.close === "function" && dom.contractDialog.open) {
      dom.contractDialog.close();
      return;
    }

    dom.contractDialog.removeAttribute("open");
    focusAfterContractDialog();
  }

  function focusAfterContractDialog() {
    updateContractTriggerState();
    focusElement(dom.contractOpenButton?.disabled ? (dom.ruleOpenButton || dom.startGameButton) : dom.contractOpenButton);
  }

  function renderContractDialog(message = "") {
    if (!dom.contractedCardsList) return;

    gameStats = normalizeStats(gameStats);
    const ids = getContractedCardIds();
    const winText = `支払えるあなたの勝利：${gameStats.wins}`;
    if (dom.contractDialogStatus) {
      dom.contractDialogStatus.textContent = message || winText;
    }

    if (!ids.length) {
      dom.contractedCardsList.innerHTML = `<p class="devil-contract-empty">今、悪魔の印を受けているカードはない。ふむ、まだ身軽だな。</p>`;
      return;
    }

    dom.contractedCardsList.innerHTML = ids.map((cardId) => {
      const card = getCardById(cardId);
      const label = card ? getCardDisplayName(card) : cardId;
      const canPay = gameStats.wins > 0;
      const disabled = canPay ? "" : " disabled";
      const note = canPay
        ? "契約を解くなら、君の勝利をひとつ支払いたまえ。支払われた勝利は、私の勝利として数えられる。"
        : "契約を解くには、君の勝利がひとつ必要だ。まだ支払える勝利はない。";
      return `
        <article class="devil-contract-card" data-card-id="${escapeAttribute(cardId)}">
          <div class="devil-contract-card__title">
            <h4>${escapeHtml(label)}</h4>
            <span class="contract-seal-badge">契約</span>
          </div>
          <p>このカードは契約が続く限り、悪魔の印を受けて現れる。</p>
          <p class="devil-contract-card__warning">この札で66を越えた場合、契約による救済は受けられない。</p>
          <div class="devil-contract-card__actions">
            <button type="button" class="button-link secondary devil-action-button js-release-contract" data-card-id="${escapeAttribute(cardId)}"${disabled}>あなたの勝利を1つ支払って契約を解く</button>
            <p class="devil-contract-card__disabled-note">${escapeHtml(note)}</p>
          </div>
        </article>
      `;
    }).join("");
  }

  function releaseContract(cardId) {
    const card = getCardById(cardId);
    const label = card ? getCardDisplayName(card) : cardId;
    gameStats = loadGameStats();

    if (gameStats.wins < 1) {
      renderContractDialog("契約を解くには、君の勝利がひとつ必要だ。まだ支払える勝利はない。");
      return;
    }

    const confirmed = window.confirm(`『${label}』の契約を解きます。あなたの勝利が1つ減り、悪魔の勝利が1つ増えます。この操作を続けますか？`);
    if (!confirmed) return;

    if (window.SallyDevilContracts?.spendWinToRemoveContract) {
      const result = window.SallyDevilContracts.spendWinToRemoveContract(cardId);
      gameStats = normalizeStats(result.record);
      if (!result.ok) {
        const message = result.reason === "no_wins"
          ? "契約を解くには、君の勝利がひとつ必要だ。まだ支払える勝利はない。"
          : "その契約は、すでに台帳から消えているようだ。";
        renderContractDialog(message);
        return;
      }
    } else {
      const ids = getContractedCardIds().filter((id) => id !== cardId);
      gameStats = normalizeStats({
        ...gameStats,
        wins: Math.max(0, gameStats.wins - 1),
        losses: gameStats.losses + 1,
        contractedCardIds: ids
      });
      saveGameStats();
    }

    renderStats();
    render();
    renderContractDialog(`『${label}』の契約を解いた。君の勝利をひとつ、私の勝利として確かに受け取ったよ。`);
  }

  function openRecordResetDialog() {
    if (!dom.recordResetDialog) return;

    try {
      dom.recordResetDialog.showModal();
    } catch (error) {
      dom.recordResetDialog.setAttribute("open", "");
    }

    focusElement(dom.recordResetCancelButton || dom.recordResetCloseButton);
  }

  function closeRecordResetDialog() {
    if (!dom.recordResetDialog) return;

    if (typeof dom.recordResetDialog.close === "function" && dom.recordResetDialog.open) {
      dom.recordResetDialog.close();
      return;
    }

    dom.recordResetDialog.removeAttribute("open");
    focusAfterRecordResetDialog();
  }

  function focusAfterRecordResetDialog() {
    focusElement(dom.recordResetOpenButton || dom.startGameButton);
  }

  function resetDevilRecord() {
    if (window.SallyDevilContracts?.resetRecord) {
      gameStats = window.SallyDevilContracts.resetRecord();
    } else {
      gameStats = normalizeStats({ ...DEFAULT_STATS, contractedCardIds: [] });
      saveGameStats();
    }

    renderStats();
    renderContractDialog();
    render();
    setDevilLine(RECORD_RESET_COMPLETE_LINE);

    if (!gameState.log.length || gameState.log[gameState.log.length - 1] !== RECORD_RESET_COMPLETE_LINE) {
      addLog(RECORD_RESET_COMPLETE_LINE);
    }

    closeRecordResetDialog();
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"]/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;"
    }[char]));
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/'/g, "&#39;");
  }

  function dismissResultModal() {
    if (gameState.phase !== "result") return;

    gameState.resultModalDismissed = true;
    if (gameState.resultDevilLine && !gameState.resultDevilLineLogged) {
      addLog(gameState.resultDevilLine);
      gameState.resultDevilLineLogged = true;
    }
    syncModal(dom.resultArea, false);
    render();
    scrollToOpeningBoard();
    focusElement(dom.devilCardArea || dom.startGameButton, { preventScroll: true });
  }

  function bindEvents() {
    document.addEventListener("click", handleImageDialogClick);
    dom.startGameButton?.addEventListener("click", startNewGame);
    dom.soundEnabledToggle?.addEventListener("change", () => {
      gameSettings.soundEnabled = !!dom.soundEnabledToggle.checked;
      applySoundPreference();
      saveGameSettings();
    });
    dom.animationEnabledToggle?.addEventListener("change", () => {
      gameSettings.animationEnabled = !!dom.animationEnabledToggle.checked;
      applyAnimationPreference();
      saveGameSettings();
    });
    dom.drawButton?.addEventListener("click", playerDraw);
    dom.standButton?.addEventListener("click", playerStand);
    dom.confirmStandButton?.addEventListener("click", confirmStand);
    dom.reconsiderStandButton?.addEventListener("click", reconsiderStand);
    dom.standConfirm?.addEventListener("cancel", (event) => {
      event.preventDefault();
      reconsiderStand();
    });
    dom.acceptContractButton?.addEventListener("click", acceptContract);
    dom.rejectContractButton?.addEventListener("click", rejectContract);
    dom.contractCloseButton?.addEventListener("click", rejectContract);
    dom.contractOffer?.addEventListener("cancel", (event) => {
      event.preventDefault();
      rejectContract();
    });
    dom.resultArea?.addEventListener("cancel", (event) => {
      event.preventDefault();
      dismissResultModal();
    });
    dom.viewBoardButton?.addEventListener("click", dismissResultModal);
    dom.ruleOpenButton?.addEventListener("click", openRuleDialog);
    dom.ruleCloseButton?.addEventListener("click", closeRuleDialog);
    dom.ruleDialog?.addEventListener("click", (event) => {
      if (event.target === dom.ruleDialog) closeRuleDialog();
    });
    dom.ruleDialog?.addEventListener("close", () => {
      focusElement(dom.ruleOpenButton);
    });
    dom.contractOpenButton?.addEventListener("click", openContractDialog);
    dom.contractCloseDialogButton?.addEventListener("click", closeContractDialog);
    dom.contractDialog?.addEventListener("click", (event) => {
      if (event.target === dom.contractDialog) {
        closeContractDialog();
        return;
      }
      const releaseButton = event.target.closest(".js-release-contract[data-card-id]");
      if (releaseButton) {
        releaseContract(releaseButton.dataset.cardId);
      }
    });
    dom.contractDialog?.addEventListener("close", () => {
      focusAfterContractDialog();
    });
    dom.recordResetOpenButton?.addEventListener("click", openRecordResetDialog);
    dom.recordResetCloseButton?.addEventListener("click", closeRecordResetDialog);
    dom.recordResetCancelButton?.addEventListener("click", closeRecordResetDialog);
    dom.recordResetConfirmButton?.addEventListener("click", resetDevilRecord);
    dom.recordResetDialog?.addEventListener("cancel", (event) => {
      event.preventDefault();
      closeRecordResetDialog();
    });
    dom.recordResetDialog?.addEventListener("click", (event) => {
      if (event.target === dom.recordResetDialog) closeRecordResetDialog();
    });
    dom.recordResetDialog?.addEventListener("close", () => {
      focusAfterRecordResetDialog();
    });
    window.addEventListener("sally-devil-contracts-change", (event) => {
      gameStats = normalizeStats(event.detail);
      renderStats();
      renderContractDialog();
      render();
    });
  }

  function init() {
    bindDom();
    createDebugPanel();
    applySettingsToPage();
    configureOpponentImage();
    bindEvents();
    scheduleGameImageCacheWarmup();
    renderStats();
    renderContractDialog();
    render();
  }

  window.SallyDevilGame = {
    DEVIL_GAME_BUILD,
    DEVIL_AI_PROFILES,
    DEVIL_GAME_ASSETS,
    gameState,
    getDevilMoodProfile,
    getCurrentDevilAiProfile,
    shouldDevilDraw,
    canDevilMakeShowoffDraw,
    canDevilPunishLowEffortTie,
    isLowEffortTie,
    getReflectedContractTotal,
    isTargetScore,
    startNewGame,
    runDebugScenario
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
