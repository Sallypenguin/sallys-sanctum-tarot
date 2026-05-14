// Mini game: 悪魔と66の契約.
// Keep the game self-contained so the reading, card library, and history pages
// remain independent of this bonus page.
(() => {
  "use strict";

  const TARGET_SCORE = 66;
  const LOW_EFFORT_TIE_MAX = 49;
  const DEVIL_GAME_BUILD = "v138_achievement-mood-thresholds";
  const LEDGER_LONGRUN_MAX_TOTAL_GAMES = 6000000;
  const DEBUG_MODE = new URLSearchParams(window.location.search).get("debug") === "1";

  const DEVIL_AI_PROFILES = {
    relaxed: {
      id: "relaxed",
      mood: "余裕",
      name: "余裕の悪魔",
      description: "悪魔が5勝以上勝ち越している時の機嫌。勝てる場面でもかなり慢心し、勝利より余興の一枚を優先することがある。",
      riskDraw: {
        maxDraws: 3,
        baseChance: 0.82,
        boredBonus: 0.10,
        tieBonus: 0.18,
        playerTotalMax: 64,
        devilTotalMax: 65,
        leadMax: 12
      }
    },
    standard: {
      id: "standard",
      mood: "平静",
      name: "平静な悪魔",
      description: "勝敗差が、悪魔4勝勝ち越しからあなた2勝勝ち越しまでの時の機嫌。基本は堅実だが、まだ勝負を楽しむ余地を残している。",
      riskDraw: {
        maxDraws: 1,
        baseChance: 0.34,
        boredBonus: 0.06,
        tieBonus: 0.08,
        playerTotalMax: 62,
        devilTotalMax: 64,
        leadMax: 5
      }
    },
    serious: {
      id: "serious",
      mood: "本気",
      name: "本気の悪魔",
      description: "あなたが3勝以上勝ち越している時の機嫌。勝てる場面では余計な札を引かず、契約込みでも容赦しない。",
      riskDraw: {
        maxDraws: 0,
        baseChance: 0,
        boredBonus: 0,
        tieBonus: 0,
        playerTotalMax: 0,
        devilTotalMax: 0,
        leadMax: 0
      }
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
  const CONTRACT_OFFER_LINE = "66を越えたな。契約するかね？　越えた分だけ手前へ跳ね返してやろう。代わりに、その札へ私の印を置く。なあに、それだけのことだ。";
  const PERFECT_BUST_CONTRACT_OFFER_LINE = `${PERFECT_BUST_DEVIL_LINE} 契約するかね？　越えた分だけ手前へ跳ね返してやろう。代わりに、その札へ私の印を置く。なあに、それだけのことだ。`;
  const CONTRACT_MODAL_DESCRIPTION_HTML = "66を越えたな。<br>契約するなら、越えた分だけ手前へ跳ね返してやろう。<br>代わりに、最後に引いた札には私の印が残る。<br>なあに、それだけのことだ。";
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


  const BASE_DEVIL_VICTORY_LINE_LAYER = {
    perfectBust: () => PERFECT_BUST_DEVIL_LINE,
    targetTie: () => TARGET_TIE_DEVIL_LINE,
    lowEffortTie: () => LOW_EFFORT_TIE_DEVIL_LINE(gameState.playerTotal),
    normalTie: () => `同点だ。君は${gameState.playerTotal}、私は${gameState.devilTotal}。悪魔の館では、引き分けは私のもの。そういう規則なのだよ。`,
    playerBust: () => "君は66を越えた。実にわかりやすい終わり方だ。欲が足を出し、床がそれに応えた。",
    contractLoss: () => `さきほど66を越えた君を、契約は${gameState.playerTotal}まで跳ね返した。だが、戻れたことと勝てることは別の話だ。君は${gameState.playerTotal}、私は${gameState.devilTotal}。私の勝ちだ。`,
    nearTarget: () => "惜しかったな。実に惜しかった。そのわずかな距離を、私は見逃さなかった。",
    narrowGap: () => "わずかな差だったな。だが勝負というものは、そのわずかを棲み処にする。今夜は私がそこに座った。",
    veryLowScore: () => "もう終えるのかね。まだ玄関の灯りも背中にあるというのに。君は勝負ではなく、見学をしていたのかもしれないな。",
    lowScore: () => "そこで止まるとは、ずいぶん礼儀正しい客だ。私が歩く余白まで残してくれるとはね。",
    middleScore: () => "悪くない数だ。悪くない判断だ。だが、ここでは悪くないものから順に、悪魔の皿へ載る。",
    highScore: () => "66の影は見えていた。だが、君はそこで足を止めた。私はその残り道を、ゆっくり歩かせてもらったよ。",
    defaultLine: () => `君は${gameState.playerTotal}、私は${gameState.devilTotal}。私の勝ちだ。館の規則は単純だろう。単純だからこそ、逃げ場がない。`
  };

  const DEVIL_VICTORY_LINE_LAYERS = {
    relaxed: {
      ...BASE_DEVIL_VICTORY_LINE_LAYER,
      perfectBust: () => "66は完成していた。そこからもう一枚を望んだのは君だ。完璧の向こう側まで見せてもらって、なお私の勝ちとは、実に贅沢な幕切れだ。",
      targetTie: () => "同じ66だ。見事だよ。ここまで辿り着く道は、確かに君にも見えていた。だが、この館の規則まで譲るほど、私は気前よくない。",
      lowEffortTie: () => `同点だ。君は${gameState.playerTotal}、私は${gameState.devilTotal}。並んだように見えるだろう。だが、規則を先に見せた上で、私はここに立っている。`,
      normalTie: () => `同点だ。君は${gameState.playerTotal}、私は${gameState.devilTotal}。ここまで並べたのは悪くない。だが、館の規則まで君に譲るほど、私は親切ではない。`,
      playerBust: () => "破滅の気配は見えていたはずだ。私は隠していない。君はそれでも手を伸ばし、66の向こう側へ歩み出た。",
      contractLoss: () => `さきほど66を越えた君を、契約は${gameState.playerTotal}まで跳ね返した。救った上で、なお届かない。君は${gameState.playerTotal}、私は${gameState.devilTotal}。これも契約の味だよ。`,
      nearTarget: () => "66の影は見えていた。危険も、届きそうな距離も、君の前に置いてあった。そのわずかな距離ごと、私は見逃さなかった。",
      narrowGap: () => "わずかな差だったな。私はその隙間を隠してはいない。見えていたものを、君が掴み損ねた。ただそれだけだ。",
      veryLowScore: () => "そこはまだ入口だ。安全に見える場所を選んだね。悪くない。だが私は、安全な場所ごと君を見下ろしている。",
      lowScore: () => "君は余白を残した。慎重と言ってもいい。だが、その余白を私が歩くところまで、少しは想像しておくべきだったな。",
      middleScore: () => "悪くない数だ。悪くない判断だ。だからこそ面白い。悪くないものを、見せた上でなお越えるのが余裕というものだ。",
      highScore: () => "見えていただろう。破滅の札も、66の影も。君は止まった。私はその判断ごと、ゆっくり越えさせてもらったよ。",
      defaultLine: () => `君は${gameState.playerTotal}、私は${gameState.devilTotal}。数字は最初からここへ向かっていた。示した上で、私の勝ちだ。`
    },
    standard: {
      ...BASE_DEVIL_VICTORY_LINE_LAYER,
      perfectBust: () => "66は完成していた。そこから踏み出したのは君だ。結末も、自分で受け取りたまえ。",
      targetTie: () => "同じ66だ。到達としては見事だ。だが、この館では引き分けは私のもの。規則は最後まで動かない。",
      lowEffortTie: () => `同点だ。君は${gameState.playerTotal}、私は${gameState.devilTotal}。拮抗ではある。だが、この館の規則では私の勝ちだ。`,
      normalTie: () => `同点だ。君は${gameState.playerTotal}、私は${gameState.devilTotal}。判断は並んだ。だが、引き分けは私のものだ。`,
      playerBust: () => "危険は見えていた。そこを越えたなら、結末は明白だ。君は66の向こう側へ落ちた。",
      contractLoss: () => `契約は君を${gameState.playerTotal}まで戻した。だが、戻れたことと勝てることは別だ。君は${gameState.playerTotal}、私は${gameState.devilTotal}。結果は私の勝ちだ。`,
      nearTarget: () => "66は近かった。判断も悪くない。だが、近さは到達ではない。今夜はその差が勝敗になった。",
      narrowGap: () => "差はわずかだった。判断は悪くない。だが、勝負はそのわずかを逃さない。今夜は私が取った。",
      veryLowScore: () => "そこで留まる判断は安全だった。だが、安全であることと、勝ちに届くことは同じではない。",
      lowScore: () => "慎重な足取りだった。臆病とは呼ばない。だが、その慎重さだけで私が退くとは思わないことだ。",
      middleScore: () => "悪くない位置だ。悪くない判断だ。だが、悪くないものが必ず勝つわけではない。",
      highScore: () => "留まる判断は間違いではない。だが、私を越えるには届かなかった。結果は、ここで閉じるとしよう。",
      defaultLine: () => `君は${gameState.playerTotal}、私は${gameState.devilTotal}。判断は終わった。結果は、私の勝ちとして閉じるとしよう。`
    },
    serious: {
      perfectBust: () => "66は完成していた。そこから踏み出したのは君だ。私は、その選択まで勝負として受け取る。結果は私の勝ちだ。",
      targetTie: () => "同じ66だ。ここまで来たことは認めよう。だが、規則は動かない。引き分けは私のものだ。",
      lowEffortTie: () => `同点だ。君は${gameState.playerTotal}、私は${gameState.devilTotal}。数は並んだ。だが、この館では私が勝つ。`,
      normalTie: () => `同点だ。君は${gameState.playerTotal}、私は${gameState.devilTotal}。並んだことは認める。だが、勝ちは譲らない。`,
      playerBust: () => "66を越えた。勝負は終わりだ。君の選択として受け取るとしよう。",
      contractLoss: () => `契約は君を${gameState.playerTotal}まで戻した。そこまでは認めよう。だが、君は私を越えなかった。結果は私の勝ちだ。`,
      nearTarget: () => "よく来た。だが、ここから先は通さない。",
      narrowGap: () => "差はわずかだった。だからこそ、私は逃さない。",
      veryLowScore: () => "その数で来たのだな。受け取るとしよう。だが、届かない。",
      lowScore: () => "慎重だった。だが、慎重さだけでは私を越えられない。",
      middleScore: () => "勝負の形にはなった。だが、形だけでは足りない。",
      highScore: () => "君は崩れなかった。だが、私を越えなかった。",
      defaultLine: () => `君は${gameState.playerTotal}、私は${gameState.devilTotal}。判断は済んだ。結果は私の勝ちだ。`
    }
  };

  const DEVIL_SURRENDER_LINE = `残った札は、どれも66の向こう側へ落ちる。
勝ち筋のない一枚を引くほど、私は親切ではない。
今夜は君に道を譲ろう。`;
  const DEVIL_SURRENDER_WIN_ENDING = `あなたは勝った。
悪魔は残された札を見つめ、静かに手を引いた。
破滅しか残らない道を、館の主は選ばなかった。`;


  const BASE_STAND_CONFIRMATION_LINE_LAYER = {
    veryLow: ({ total }) => `ここで留まるのか。合計は${total}。次の破滅はまだ遠い。だが、遠いことと無いことは別だ。`,
    low: ({ total }) => `ここで留まるのか。合計は${total}。まだ進む余地はある。だが、余地と安全は同じではない。`,
    medium: ({ total }) => `ここで手を引くか。合計は${total}。危険の気配は見え始めている。悪くない判断だ。`,
    high: ({ total }) => `ここで留まるのか。合計は${total}。半分ほどの破滅を前に、君は足を止める。`,
    veryHigh: ({ total }) => `止まるか。合計は${total}。その先は勝負というより落下に近い。`,
    fatal: ({ total }) => `手を引くのだな。合計は${total}。ほとんど破滅だった。では、その数で私に届くか、見せてもらおう。`
  };

  const STAND_CONFIRMATION_LINE_LAYERS = {
    relaxed: {
      veryLow: ({ total }) => `ここで留まるのか。合計は${total}。破滅はまだ遠い。にもかかわらず、君は足を止める。慎重さか、恐れか。まあ、答えはすぐに出る。`,
      low: ({ total }) => `その数で止まるか。合計は${total}。まだ道は残っている。だが、迷う顔を見るには十分だった。では、その慎重さがどこまで届くか、見せてもらおう。`,
      medium: ({ total }) => `ここで手を引くか。合計は${total}。破滅の気配は見えていた。悪くない判断だ。だが、見えている危険を避けることと、私に勝つことは別だ。`,
      high: ({ total }) => `ここで留まるのか。合計は${total}。半分ほどの破滅を前にして、君は足を止めた。賢いとも言える。面白いとも、少し言いにくいがね。`,
      veryHigh: ({ total }) => `止まるか。よろしい。合計は${total}。その先は勝負というより落下に近かった。だが、落ちないことと勝つことは別だ。`,
      fatal: ({ total }) => `手を引くのだな。合計は${total}。ほとんど破滅だった。さすがに、それは君にも見えたようだね。では、砕けずに残ったその数で、私に届くか試してみたまえ。`
    },
    standard: {
      veryLow: ({ total }) => `ここで留まるのか。合計は${total}。まだ進む余地はあった。だが、早く止まる判断も誤りとは限らない。その数が勝負になるか、見届けるとしよう。`,
      low: ({ total }) => `その数で留まるのだな。合計は${total}。まだ道は残っている。だが、無理に進むだけが勝負ではない。では、その判断を受け取るとしよう。`,
      medium: ({ total }) => `ここで手を引くか。合計は${total}。危険は近づいていた。悪くない判断だ。だが、悪くない判断が勝利を保証するわけではない。`,
      high: ({ total }) => `ここで留まるのか。合計は${total}。五分に近い危険を前に、君は足を止めた。臆病とは呼ばない。あとは、その数が私に届くか、見せてもらおう。`,
      veryHigh: ({ total }) => `留まる判断か。合計は${total}。危険域を見て、君は踏みとどまった。正しいかどうかは、ここから決まる。`,
      fatal: ({ total }) => `手を引くのだな。合計は${total}。破滅に近い先を避けた。それは妥当な判断だ。だが、妥当さだけで私が退くとは思わないことだ。`
    },
    serious: {
      veryLow: ({ total }) => `ここで留まるのだな。合計は${total}。その数を君の答えとして受け取るとしよう。`,
      low: ({ total }) => `その数で来るのだな。合計は${total}。よろしい。こちらも、そのつもりで受けるとしよう。`,
      medium: ({ total }) => `ここで確定するのだな。合計は${total}。ここからは、私の番だ。`,
      high: ({ total }) => `手を止めるか。合計は${total}。ならば、その数で勝負を受けるとしよう。`,
      veryHigh: ({ total }) => `踏みとどまったな。合計は${total}。それも君の判断だ。こちらも手は抜かない。`,
      fatal: ({ total }) => `手を引くのだな。合計は${total}。よかろう。その数で、私の前に立ちたまえ。`
    }
  };

  const PLAYER_BUST_RISK_HINT_LINES = {
    relaxed: {
      veryLow: [
        "この程度なら、教えてもなお君は迷う。人間らしくて結構だ。",
        "まだ浅い水だ。悪魔が底を示している。",
        "安全に見える数字ほど、人は余計な欲を足す。"
      ],
      low: [
        "危険はある。だが示したところで、私の余裕は減らない。",
        "少し硝子が鳴る。君がそれを音楽と呼ぶなら、止めはしない。",
        "まだ選べる。選べると思わせるのが、いちばん甘い。"
      ],
      medium: [
        "硝子にひびが入る頃合いだ。ここから表情が変わる。",
        "悪魔は数字を隠さない。見えていても、人は手を伸ばす。",
        "危うくなってきたな。私はその顔を見るために、数字を置いている。"
      ],
      high: [
        "半分ほどは割れる。残り半分に名前をつけるなら、希望だろう。",
        "祝福と灰が、ほぼ同じ重さで並んでいる。実に見栄えがいい。",
        "ここからは計算ではなく性格だ。君の方を見せてもらおう。"
      ],
      veryHigh: [
        "かなり高い崖だ。ここまで見せても、足を出す者はいる。",
        "だいたい割れる。だが人は、だいたいを例外で塗りつぶしたがる。",
        "止まれば賢い。進めば面白い。私はどちらでも退屈しない。"
      ],
      fatal: [
        "ほぼ破滅だ。そこまで分かっていて手を伸ばす者を、私は嫌いではない。",
        "灰になる数字だ。だが灰になる瞬間ほど、よく光るものもある。",
        "これは助言ではない。墓標に彫る数字を、先に読ませているだけだ。"
      ]
    },
    standard: {
      veryLow: [
        "崩れる可能性は低い。進む余地はある。だが、余地と安全は同じではない。",
        "まだ道は広い。今なら踏み出せる。だが、足元を確かめない者から落ちる。",
        "危険は小さい。小さい危険を、無いものとして扱わないことだ。"
      ],
      low: [
        "まだ道は残っている。ただし、無傷で渡れるとは限らない。",
        "進む選択は十分に成り立つ。だが、安全圏という名札を掛けるには早い。",
        "危険は低い。低いというだけで、君に味方しているわけではない。"
      ],
      medium: [
        "危険域に近づいている。続けるなら、足元を確かめて進みたまえ。",
        "軽い判断では済まなくなってきた。ここからは、欲にも重さが出る。",
        "まだ勝負にはなる。だが、進む理由と止まる理由を、同じ皿に載せて考えたまえ。"
      ],
      high: [
        "五分に近い。欲と判断が、ここで分かれる。",
        "半ばは崩れ、半ばは残る。進むなら、その両方を引き受けたまえ。",
        "ここで引くなら、判断というより勝負だ。勝負ならば、負けも数に入れておきたまえ。"
      ],
      veryHigh: [
        "危険域だ。ここで留まる判断も、臆病とは呼ばない。",
        "かなり危ない。止まることにも、十分な理がある。",
        "重い判断になる。引くなら、失う覚悟を持ちたまえ。"
      ],
      fatal: [
        "ほぼ破滅に近い。引くなら、勝算ではなく覚悟を連れて行きたまえ。",
        "終幕に近い。まだ手を伸ばすなら、その理由を自分で持ちたまえ。",
        "数字は君に優しくない。進むなら、それでも進む理由を持ちたまえ。"
      ]
    },
    serious: {
      hidden: [
        "もう助言はない。",
        "ここから先は、君だけで決めたまえ。",
        "私は確率を告げない。君を対戦相手として扱っている。"
      ]
    }
  };

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
  const RECORDS_STORAGE_KEY = "sallySanctumTarotDevilRecordsV1";
  const ACHIEVEMENTS_STORAGE_KEY = "sallySanctumTarotDevilAchievementsV1";
  const RECENT_RESULTS_LIMIT = 50;
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
  let achievementUnlockQueue = [];
  let achievementUnlockTimer = null;
  let isAchievementModalActive = false;

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
    debugAiProfileId: "",
    debugForceMoodRiskDraw: false,

    winner: null,
    resultType: null,
    resultModalDismissed: false,
    resultDevilLine: "",
    resultDevilLineLogged: false,
    statsRecorded: false,
    standConfirmationMessage: "",
    devilTurnLine: "",
    devilRiskDrawCount: 0,
    devilSurrendered: false,
    devilDecisionReason: "",
    devilDecisionReasons: [],
    playerStood: false,
    playerTotalBeforeBust: null,
    targetOverdrawAttempt: false,
    lastPlayerDrawnCardNumber: null,
    contractOffered: false,
    contractOfferLine: "",
    contractAccepted: false,
    contractRejected: false,
    contractReflectedTotal: null,
    contractCardNumber: null,
    markedCardBust: false,
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
    return shuffleCardsWithRandom(cards, Math.random);
  }

  function shuffleCardsWithRandom(cards, random = Math.random) {
    const shuffled = cards.slice();
    const nextRandom = typeof random === "function" ? random : Math.random;
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(nextRandom() * (index + 1));
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
    return isBust(state.devilTotal + getCardScore(card));
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

  function canDevilTakeMoodRiskDraw(state, profile = DEVIL_AI_PROFILES.standard) {
    if (!state || !profile?.riskDraw) return false;

    const rules = profile.riskDraw;
    const used = Number(state.devilRiskDrawCount) || 0;

    if (rules.maxDraws <= 0) return false;
    if (used >= rules.maxDraws) return false;
    if (!Array.isArray(state.deck) || state.deck.length === 0) return false;

    // 負けている時の追撃は別処理。ここでは「すでに勝てる状態」だけ扱う。
    if (state.devilTotal < state.playerTotal) return false;

    // 低得点同点の咎めは別処理で優先する。
    if (isLowEffortTie(state)) return false;

    // 66同点・高得点の緊張局面では慢心しない。
    if (isTargetScore(state.playerTotal)) return false;
    if (state.playerTotal > rules.playerTotalMax) return false;
    if (state.devilTotal > rules.devilTotalMax) return false;

    const lead = state.devilTotal - state.playerTotal;
    if (lead > rules.leadMax) return false;

    // 完全な自滅は選ばない。ただし次札そのものの安全確認はしない。
    // つまり、余裕・平静の慢心では本当に足を滑らせることがある。
    if (hasOnlyBustDrawsForDevil(state)) return false;

    if (state.debugForceMoodRiskDraw) return true;

    let chance = rules.baseChance;

    if (state.playerTotal <= 35) chance += rules.boredBonus;
    if (state.devilTotal === state.playerTotal) chance += rules.tieBonus;

    const randomValue = typeof state.random === "function" ? state.random() : Math.random();
    return randomValue < chance;
  }

  function setDevilDecisionReason(state, reason) {
    if (!state || !reason) return;
    state.devilDecisionReason = reason;
    if (!Array.isArray(state.devilDecisionReasons)) state.devilDecisionReasons = [];
    state.devilDecisionReasons.push(reason);
  }

  function shouldDevilDraw(state, profile = DEVIL_AI_PROFILES.standard) {
    if (!state || !profile) return false;
    if (state.phase !== "devil-turn") return false;
    if (isBust(state.devilTotal)) return false;

    if (state.devilTotal < state.playerTotal) {
      if (hasOnlyBustDrawsForDevil(state, profile)) {
        state.devilSurrendered = true;
        setDevilDecisionReason(state, "forced_surrender");
        return false;
      }

      setDevilDecisionReason(state, isTargetScore(state.playerTotal) ? "exact_66_chase" : "must_chase");
      return true;
    }

    if (canDevilPunishLowEffortTie(state, profile)) {
      setDevilDecisionReason(state, "low_effort_tie_punish");
      return true;
    }

    if (isLowEffortTie(state)) {
      setDevilDecisionReason(state, "low_effort_tie_no_safe_draw");
      return false;
    }

    if (canDevilTakeMoodRiskDraw(state, profile)) {
      state.devilRiskDrawCount = (Number(state.devilRiskDrawCount) || 0) + 1;
      setDevilDecisionReason(state, state.playerTotal <= 35 ? "bored_risk_draw" : "mood_risk_draw");
      return true;
    }

    if (state.devilTotal === state.playerTotal) {
      setDevilDecisionReason(state, "tie_is_enough");
    } else {
      setDevilDecisionReason(state, state.playerTotal >= 63 ? "respect_stay" : "already_winning");
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


  function getActiveDevilAiProfile() {
    if (gameState.debugScenarioActive && gameState.debugAiProfileId && DEVIL_AI_PROFILES[gameState.debugAiProfileId]) {
      return DEVIL_AI_PROFILES[gameState.debugAiProfileId];
    }
    if (gameState.aiProfileId && DEVIL_AI_PROFILES[gameState.aiProfileId]) {
      return DEVIL_AI_PROFILES[gameState.aiProfileId];
    }
    return getCurrentDevilAiProfile();
  }

  function getNextPlayerBustRisk(state = gameState) {
    if (!state || !Array.isArray(state.deck) || state.deck.length === 0) {
      return {
        rate: 0,
        bustCount: 0,
        deckCount: 0
      };
    }

    const total = Number(state.playerTotal) || 0;
    const target = Number(state.target) || TARGET_SCORE;
    const bustCount = state.deck.filter((card) => total + getCardScore(card) > target).length;
    const deckCount = state.deck.length;

    return {
      rate: deckCount > 0 ? bustCount / deckCount : 0,
      bustCount,
      deckCount
    };
  }

  function getBustRiskBand(rate) {
    const value = Math.max(0, Math.min(1, Number(rate) || 0));
    if (value < 0.10) return "veryLow";
    if (value < 0.25) return "low";
    if (value < 0.40) return "medium";
    if (value < 0.60) return "high";
    if (value < 0.80) return "veryHigh";
    return "fatal";
  }

  function getPlayerBustRiskHintLine(state = gameState) {
    if (!state || state.phase !== "player-turn") return "";
    if (isBust(state.playerTotal, state.target)) return "";
    if (!Array.isArray(state.deck) || state.deck.length === 0) return "";

    const profile = getActiveDevilAiProfile();
    if (!profile || profile.id === "serious") return "";

    const risk = getNextPlayerBustRisk(state);
    if (risk.deckCount <= 0) return "";

    const band = getBustRiskBand(risk.rate);
    const lines = PLAYER_BUST_RISK_HINT_LINES[profile.id]?.[band]
      || PLAYER_BUST_RISK_HINT_LINES.standard[band]
      || [];
    const line = chooseLine(lines);
    if (!line) return "";

    if (profile.id === "relaxed") {
      const percent = Math.round(risk.rate * 100);
      return `次の一手は、${risk.bustCount}/${risk.deckCount}枚が破滅の札――およそ${percent}%だ。${line}`;
    }

    return `次の一手は――${line}`;
  }

  function appendPlayerBustRiskHint(message) {
    const hint = getPlayerBustRiskHintLine(gameState);
    return hint ? `${message}
${hint}` : message;
  }

  function shouldShowPlayerDrawReaction(profile = getActiveDevilAiProfile()) {
    return profile?.id === "serious";
  }

  function shouldShowPlayerBustRiskHint(profile = getActiveDevilAiProfile()) {
    return profile?.id === "relaxed" || profile?.id === "standard";
  }

  function composePlayerSafeDrawLine(drawMessage, total) {
    const profile = getActiveDevilAiProfile();
    const parts = [drawMessage];

    if (shouldShowPlayerDrawReaction(profile)) {
      const reaction = getPlayerSafeDrawReaction(total);
      if (reaction) parts.push(reaction);
    }

    const line = parts.join(" ");

    if (!shouldShowPlayerBustRiskHint(profile)) {
      return line;
    }

    const hint = getPlayerBustRiskHintLine(gameState);
    return hint ? `${line}
${hint}` : line;
  }

  function getDevilTurnOpeningLine(profile = DEVIL_AI_PROFILES.standard) {
    const playerTotal = gameState.playerTotal;

    if (isTargetScore(playerTotal)) {
      if (profile.id === "serious") {
        return chooseLine([
          "66に届いたな。ならば、こちらも正式に受けよう。",
          "君は66。これ以上の助言はない。私の番だ。"
        ]);
      }
      return chooseLine([
        "君は66。私の道は、ひどく細い。館の主にも、選べることは多くない。",
        "66に辿り着いたか。よかろう。余興はここまでだ。"
      ]);
    }

    if (playerTotal >= 63) {
      if (profile.id === "serious") {
        return chooseLine([
          `その数で来たか。よろしい。ここからは私が受ける。`,
          `ほとんど届いているな。ならば、こちらも手は抜かない。`
        ]);
      }
      return chooseLine([
        `いい場所で止まったな。ここからは、私も手遊びはしない。`,
        `ほとんど届きかけているな。君がそこに立つなら、私も余興を少し控えよう。`
      ]);
    }

    if (profile.id === "serious") {
      return chooseLine([
        "ここからは、言葉ではなく結果で決めよう。",
        "君の数は受け取った。次は私が答える。"
      ]);
    }

    if (profile.id === "relaxed") {
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
        "そこで留まったか。では、その判断が届くか見届けるとしよう。"
      ]);
    }

    return chooseLine(DEVIL_TURN_OPENING_LINES);
  }

  function getPlayerSafeDrawReaction(total) {
    if (isTargetScore(total)) {
      return chooseLine([
        "66。そこまで来たか。",
        "66に届いたな。ここからは、私が答える。",
        "見事だ。66だ。余計な言葉は要らない。"
      ]);
    }

    const reactionGroups = [
      {
        max: 21,
        lines: [
          "まだ遠い。だが、始まってはいる。",
          "合計はまだ浅い。ここからだ。",
          "序盤だ。君の足取りを見せてもらおう。"
        ]
      },
      {
        max: 35,
        lines: [
          "まだ届かない。進むなら、迷いは置いて来たまえ。",
          "その数では遠い。だが、勝負は続いている。",
          "静かな位置だ。油断するには早い。"
        ]
      },
      {
        max: 49,
        lines: [
          "勝負の形にはなった。",
          "悪くない位置だ。ここから重くなる。",
          "中ほどまで来た。判断を続けたまえ。"
        ]
      },
      {
        max: 56,
        lines: [
          "ここから先は軽くない。",
          "66の影が近い。ひとつの判断が響く。",
          "勝負の熱は上がった。ここからだ。"
        ]
      },
      {
        max: 62,
        lines: [
          "近いな。ここからは誤差では済まない。",
          "その距離まで来たか。次の選択を見せてもらおう。",
          "届きかけている。だからこそ、重い。"
        ]
      },
      {
        max: TARGET_SCORE,
        lines: [
          "66は目前だ。ここからは、迷いも札になる。",
          "そこまで来たか。ならば、最後まで見届けるとしよう。",
          "十分に近い。ここから先は、君の答えだ。"
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
    gameState.debugAiProfileId = "";
    gameState.debugForceMoodRiskDraw = false;
    gameState.winner = null;
    gameState.resultType = null;
    gameState.resultModalDismissed = false;
    gameState.resultDevilLine = "";
    gameState.resultDevilLineLogged = false;
    gameState.statsRecorded = false;
    gameState.standConfirmationMessage = "";
    gameState.devilTurnLine = "";
    gameState.devilRiskDrawCount = 0;
    gameState.devilSurrendered = false;
    gameState.devilDecisionReason = "";
    gameState.devilDecisionReasons = [];
    gameState.playerStood = false;
    gameState.playerTotalBeforeBust = null;
    gameState.targetOverdrawAttempt = false;
    gameState.lastPlayerDrawnCardNumber = null;
    gameState.contractOffered = false;
    gameState.contractOfferLine = "";
    gameState.contractAccepted = false;
    gameState.contractRejected = false;
    gameState.contractReflectedTotal = null;
    gameState.contractCardNumber = null;
    gameState.markedCardBust = false;
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

  function safeParseJson(raw, fallback) {
    try {
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function nowIsoString() {
    return new Date().toISOString();
  }

  function createDefaultDevilRecords() {
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
        contracts: {
          offered: 0,
          accepted: 0,
          rejected: 0,
          released: 0,
          contractWins: 0,
          contractLosses: 0,
          currentContractCountMax: 0
        },
        moods: {
          relaxed: { games: 0, playerWins: 0, devilWins: 0 },
          standard: { games: 0, playerWins: 0, devilWins: 0 },
          serious: { games: 0, playerWins: 0, devilWins: 0 }
        },
        ai: {
          moodRiskDrawGames: 0,
          moodRiskDrawTotal: 0,
          moodRiskBustWins: 0,
          devilSurrenders: 0,
          lowEffortTiePunishes: 0,
          lowEffortTieNoSafeDraws: 0
        },
        lossTypes: {},
        winTypes: {}
      },
      recentResults: []
    };
  }

  function normalizeDevilRecords(records) {
    const defaults = createDefaultDevilRecords();
    const source = records && typeof records === "object" ? records : {};
    const current = source.current && typeof source.current === "object" ? source.current : {};
    const normalized = {
      ...defaults,
      ...source,
      schemaVersion: 1,
      createdAt: source.createdAt || defaults.createdAt,
      updatedAt: source.updatedAt || defaults.updatedAt,
      current: {
        ...defaults.current,
        ...current,
        resultTypes: { ...defaults.current.resultTypes, ...(current.resultTypes || {}) },
        scoreBuckets: { ...defaults.current.scoreBuckets, ...(current.scoreBuckets || {}) },
        contracts: { ...defaults.current.contracts, ...(current.contracts || {}) },
        moods: {
          relaxed: { ...defaults.current.moods.relaxed, ...(current.moods?.relaxed || {}) },
          standard: { ...defaults.current.moods.standard, ...(current.moods?.standard || {}) },
          serious: { ...defaults.current.moods.serious, ...(current.moods?.serious || {}) }
        },
        ai: { ...defaults.current.ai, ...(current.ai || {}) },
        lossTypes: { ...defaults.current.lossTypes, ...(current.lossTypes || {}) },
        winTypes: { ...defaults.current.winTypes, ...(current.winTypes || {}) }
      },
      recentResults: Array.isArray(source.recentResults) ? source.recentResults.slice(0, RECENT_RESULTS_LIMIT) : []
    };
    ["games", "playerWins", "devilWins", "currentPlayerStreak", "currentDevilStreak", "bestPlayerStreak", "bestDevilStreak", "playerTotalSum", "devilTotalSum"].forEach((key) => {
      const value = Number(normalized.current[key]);
      normalized.current[key] = Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
    });
    return normalized;
  }

  function loadDevilRecords() {
    try {
      return normalizeDevilRecords(safeParseJson(window.localStorage.getItem(RECORDS_STORAGE_KEY), null));
    } catch (error) {
      return createDefaultDevilRecords();
    }
  }

  function saveDevilRecords(records) {
    const normalized = normalizeDevilRecords(records);
    normalized.updatedAt = nowIsoString();
    try {
      window.localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(normalized));
    } catch (error) {
      // Detailed records are optional; the game remains playable without them.
    }
    return normalized;
  }

  function createDefaultDevilAchievements() {
    const now = nowIsoString();
    return {
      schemaVersion: 1,
      createdAt: now,
      updatedAt: now,
      unlocked: {},
      counters: {
        totalGames: 0,
        totalPlayerWins: 0,
        totalDevilWins: 0,
        cleanWins: 0,
        contractlessWins: 0,
        contractReleases: 0,
        eventTags: {}
      },
      flags: {
        lossTypes: {},
        winTypes: {},
        seenMoods: {},
        contractedCardIdsEver: [],
        maxSimultaneousContracts: 0,
        hiddenRevealed: []
      },
      progress: {}
    };
  }

  function normalizeDevilAchievements(achievements) {
    const defaults = createDefaultDevilAchievements();
    const source = achievements && typeof achievements === "object" ? achievements : {};
    const counters = source.counters && typeof source.counters === "object" ? source.counters : {};
    const flags = source.flags && typeof source.flags === "object" ? source.flags : {};
    const normalized = {
      ...defaults,
      ...source,
      schemaVersion: 1,
      createdAt: source.createdAt || defaults.createdAt,
      updatedAt: source.updatedAt || defaults.updatedAt,
      unlocked: source.unlocked && typeof source.unlocked === "object" ? { ...source.unlocked } : {},
      counters: {
        ...defaults.counters,
        ...counters,
        eventTags: { ...(counters.eventTags || {}) }
      },
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
    ["totalGames", "totalPlayerWins", "totalDevilWins", "cleanWins", "contractlessWins", "contractReleases"].forEach((key) => {
      const value = Number(normalized.counters[key]);
      normalized.counters[key] = Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
    });
    return normalized;
  }

  function loadDevilAchievements() {
    try {
      return normalizeDevilAchievements(safeParseJson(window.localStorage.getItem(ACHIEVEMENTS_STORAGE_KEY), null));
    } catch (error) {
      return createDefaultDevilAchievements();
    }
  }

  function saveDevilAchievements(achievements) {
    const normalized = normalizeDevilAchievements(achievements);
    normalized.updatedAt = nowIsoString();
    try {
      window.localStorage.setItem(ACHIEVEMENTS_STORAGE_KEY, JSON.stringify(normalized));
    } catch (error) {
      // Achievements are optional. Storage failures must not stop the game.
    }
    return normalized;
  }

  function incrementObjectCounter(object, key, amount = 1) {
    if (!object || !key) return;
    object[key] = (Number(object[key]) || 0) + amount;
  }

  function setProgressValue(achievements, achievementId, current, target) {
    if (!achievements?.progress || !achievementId) return;
    achievements.progress[achievementId] = {
      current: Math.max(0, Number(current) || 0),
      target: Math.max(1, Number(target) || 1)
    };
  }

  function getAchievementCandidate(achievementId) {
    if (!Array.isArray(ACHIEVEMENT_CANDIDATES)) return null;
    return ACHIEVEMENT_CANDIDATES.find((candidate) => candidate.id === achievementId) || null;
  }

  function getAchievementNumberLabel(achievementId) {
    const match = String(achievementId || "").match(/a(\d+)/i);
    return match ? `No.${String(Number(match[1])).padStart(2, "0")}` : "No.--";
  }

  function createAchievementUnlockPayload(achievementId, candidate, unlockedAt, context = {}) {
    return {
      id: achievementId,
      numberLabel: getAchievementNumberLabel(achievementId),
      title: candidate?.name || achievementId,
      category: candidate?.category || "",
      hidden: !!candidate?.hidden,
      note: candidate?.note || "実績を解除しました。",
      unlockedAt,
      resultType: context.resultType || "",
      playerTotal: Number.isFinite(Number(context.playerTotal)) ? Number(context.playerTotal) : null,
      devilTotal: Number.isFinite(Number(context.devilTotal)) ? Number(context.devilTotal) : null,
      mood: context.mood || ""
    };
  }

  function unlockDevilAchievement(achievements, achievementId, context = {}) {
    if (!achievements || !achievementId || achievements.unlocked?.[achievementId]) return false;
    const candidate = getAchievementCandidate(achievementId);
    const unlockedAt = nowIsoString();
    achievements.unlocked[achievementId] = {
      unlockedAt,
      title: candidate?.name || achievementId,
      category: candidate?.category || "",
      hidden: !!candidate?.hidden,
      build: DEVIL_GAME_BUILD,
      context: {
        resultType: context.resultType || "",
        playerTotal: Number.isFinite(Number(context.playerTotal)) ? Number(context.playerTotal) : null,
        devilTotal: Number.isFinite(Number(context.devilTotal)) ? Number(context.devilTotal) : null,
        mood: context.mood || ""
      }
    };
    if (candidate?.hidden && !achievements.flags.hiddenRevealed.includes(achievementId)) {
      achievements.flags.hiddenRevealed.push(achievementId);
    }
    if (Array.isArray(context.unlockedAchievements)) {
      context.unlockedAchievements.push(createAchievementUnlockPayload(achievementId, candidate, unlockedAt, context));
    }
    return true;
  }

  function updateDevilAchievementProgress(achievements, context = {}) {
    if (!achievements) return achievements;
    const totalGames = Number(achievements.counters.totalGames) || 0;
    const totalWins = Number(achievements.counters.totalPlayerWins) || 0;
    const totalLosses = Number(achievements.counters.totalDevilWins) || 0;
    const eventTags = achievements.counters.eventTags || {};
    const unlockedCount = Object.keys(achievements.unlocked || {}).length;

    const deterministicTargets = {
      a001: 1,
      a002: 1,
      a004: 10,
      a005: 30,
      a006: 66,
      a007: 100,
      a008: 300,
      a009: 666
    };
    Object.entries(deterministicTargets).forEach(([id, target]) => {
      const current = id === "a001" || id === "a002" ? Math.min(1, totalGames) : totalGames;
      setProgressValue(achievements, id, current, target);
      if (current >= target) unlockDevilAchievement(achievements, id, context);
    });

    const cumulativeTargets = {
      a016: { tag: "clean_win", target: 5 },
      a017: { tag: "player_win", target: 10 },
      a018: { tag: "player_win", target: 30 },
      a019: { tag: "player_win", target: 66 },
      a040: { tag: "devil_win", target: 66 }
    };
    Object.entries(cumulativeTargets).forEach(([id, spec]) => {
      const current = Number(eventTags[spec.tag]) || 0;
      setProgressValue(achievements, id, current, spec.target);
      if (current >= spec.target) unlockDevilAchievement(achievements, id, context);
    });

    setProgressValue(achievements, "a052", achievements.flags.contractedCardIdsEver.length, 21);
    if (achievements.flags.contractedCardIdsEver.length >= 21) unlockDevilAchievement(achievements, "a052", context);
    setProgressValue(achievements, "a064", achievements.flags.maxSimultaneousContracts, 5);
    if (achievements.flags.maxSimultaneousContracts >= 5) unlockDevilAchievement(achievements, "a064", context);
    setProgressValue(achievements, "a050", achievements.counters.contractReleases, 5);
    if ((Number(achievements.counters.contractReleases) || 0) >= 1) unlockDevilAchievement(achievements, "a049", context);
    if ((Number(achievements.counters.contractReleases) || 0) >= 5) unlockDevilAchievement(achievements, "a050", context);
    setProgressValue(achievements, "a051", achievements.flags.maxSimultaneousContracts, 10);
    if (achievements.flags.maxSimultaneousContracts >= 10) unlockDevilAchievement(achievements, "a051", context);

    const defeatTypes = ["playerBust", "tieLoss", "targetTieLoss", "lowEffortTieLoss", "contractLoss", "markedCardBust"];
    const defeatCount = defeatTypes.filter((key) => achievements.flags.lossTypes[key]).length;
    setProgressValue(achievements, "a065", defeatCount, defeatTypes.length);
    if (defeatCount >= defeatTypes.length) unlockDevilAchievement(achievements, "a065", context);

    setProgressValue(achievements, "a066", unlockedCount, 50);
    if (unlockedCount >= 50) unlockDevilAchievement(achievements, "a066", context);

    if (context.moodAfter === "serious") unlockDevilAchievement(achievements, "a058", context);
    if (context.moodAfter === "relaxed") unlockDevilAchievement(achievements, "a059", context);
    return achievements;
  }

  function recordContractReleaseAchievement(cardId) {
    let achievements = loadDevilAchievements();
    achievements.counters.contractReleases = (Number(achievements.counters.contractReleases) || 0) + 1;
    const context = {
      resultType: "contract_release",
      mood: getCurrentDevilAiProfile().id,
      cardId,
      unlockedAchievements: []
    };
    updateDevilAchievementProgress(achievements, context);
    saveDevilAchievements(achievements);
    enqueueAchievementUnlocks(context.unlockedAchievements);

    let records = loadDevilRecords();
    records.current.contracts.released = (Number(records.current.contracts.released) || 0) + 1;
    saveDevilRecords(records);
  }

  function resetDevilRecordsData() {
    saveDevilRecords(createDefaultDevilRecords());
  }

  function resetDevilGameRecordOnly() {
    if (window.SallyDevilContracts?.resetRecord) {
      gameStats = window.SallyDevilContracts.resetRecord();
    } else {
      gameStats = normalizeStats({ ...DEFAULT_STATS, contractedCardIds: [] });
      saveGameStats();
    }
    resetDevilRecordsData();
    return gameStats;
  }

  function eraseAllDevilData() {
    const keysToRemove = [];
    try {
      for (let index = 0; index < window.localStorage.length; index += 1) {
        const key = window.localStorage.key(index);
        if (key && key.startsWith("sallySanctumTarotDevil")) keysToRemove.push(key);
      }
      keysToRemove.forEach((key) => window.localStorage.removeItem(key));
    } catch (error) {
      // Ignore storage failures; caller can still continue.
    }
    gameStats = normalizeStats({ ...DEFAULT_STATS, contractedCardIds: [] });
    return { removedKeys: keysToRemove };
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
    if (difference <= -5) return DEVIL_AI_PROFILES.relaxed;
    if (difference >= 3) return DEVIL_AI_PROFILES.serious;
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

    const achievementTags = buildCurrentGameAchievementTags();
    const unlockedAchievements = updateDevilRecordsAndAchievements(achievementTags);
    enqueueAchievementUnlocks(unlockedAchievements);

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
    const openingLine = `君の初手は『${playerOpening}』、合計は${gameState.playerTotal}。私の一枚目は『${getCardDisplayName(visibleDevilCard)}』。もう一枚？　見たいかね？`;
    addLog(appendPlayerBustRiskHint(openingLine));
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
    gameState.lastPlayerDrawnCardNumber = Number(card?.number);
    if (isTargetScore(totalBeforeDraw)) gameState.targetOverdrawAttempt = true;
    syncTotals();

    const devilCardAside = Number(card.number) === 15 ? chooseLine(DEVIL_CARD_DRAW_ASIDES) : "";
    const drawMessage = `君は『${getCardDisplayName(card)}』を引いた。${devilCardAside}+${card.number}、合計は${gameState.playerTotal}。`;
    const playerCardIndex = gameState.playerCards.length - 1;
    markCardForAnimation("player", playerCardIndex, card, false);

    if (isBust(gameState.playerTotal, gameState.target)) {
      gameState.playerTotalBeforeBust = totalBeforeDraw;
      const bustedAfterPerfect66 = isTargetScore(totalBeforeDraw);
      if (bustedAfterPerfect66) {
        gameState.bustedAfterPerfect66 = true;
      }

      if (isContractedCard(card)) {
        gameState.markedCardBust = true;
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
        gameState.contractOffered = true;
        gameState.contractOfferLine = "";
        // 契約モーダルの直前に盤面側の悪魔セリフを契約口上へ差し替えない。
        // 契約の口上は、モーダル内に用意してあるセリフ欄で読ませる。
        render();
        playFlipSound();
        await delay(getDealDelay() + 40);
        setPhase("contract-offer");
        setInteractionLocked(false);
        syncContractOfferDescription();
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

    const safeDrawLine = composePlayerSafeDrawLine(drawMessage, gameState.playerTotal);
    addLog(safeDrawLine);
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

  function getStandConfirmationLineLayer(profileId = gameState.aiProfileId) {
    return STAND_CONFIRMATION_LINE_LAYERS[profileId]
      || STAND_CONFIRMATION_LINE_LAYERS.standard
      || BASE_STAND_CONFIRMATION_LINE_LAYER;
  }

  function getStandConfirmationContext(state = gameState) {
    const risk = getNextPlayerBustRisk(state);
    const band = getBustRiskBand(risk.rate);
    return {
      total: Number(state?.playerTotal) || 0,
      target: Number(state?.target) || TARGET_SCORE,
      risk,
      band,
      profileId: getActiveDevilAiProfile()?.id || "standard"
    };
  }

  function getStandConfirmationMessage(state = gameState) {
    const context = getStandConfirmationContext(state);
    const layer = getStandConfirmationLineLayer(context.profileId);
    const lineFactory = layer[context.band]
      || BASE_STAND_CONFIRMATION_LINE_LAYER[context.band]
      || BASE_STAND_CONFIRMATION_LINE_LAYER.high;
    return lineFactory(context);
  }

  function playerStand() {
    if (isInteractionLocked || gameState.phase !== "player-turn") return;

    gameState.standConfirmationMessage = getStandConfirmationMessage(gameState);
    setPhase("stand-confirm");
    addLog(gameState.standConfirmationMessage);
    render();
    focusElement(dom.confirmStandButton);
  }

  async function confirmStand() {
    if (isInteractionLocked || gameState.phase !== "stand-confirm") return;

    setInteractionLocked(true);
    gameState.standConfirmationMessage = "";
    gameState.playerStood = true;
    addLog("君はここで留まった。その判断が何を招くか、私が見届けるとしよう。");
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
    gameState.contractAccepted = true;
    gameState.contractReflectedTotal = contractTotal;
    gameState.contractCardNumber = Number(contractedCard?.number);
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
      : "差し出した手を払ったか。よろしい、君の意志は尊重しよう。ならば、その足で結末まで歩みたまえ。";
    addLog(rejectLine);
    gameState.contractRejected = true;
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

    const debugProfile = gameState.debugScenarioActive && gameState.debugAiProfileId
      ? DEVIL_AI_PROFILES[gameState.debugAiProfileId]
      : null;
    const profile = debugProfile || getCurrentDevilAiProfile();
    gameState.aiProfileId = profile.id;
    gameState.devilRiskDrawCount = 0;
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

      if (isBust(gameState.devilTotal)) {
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
    if ((Number(gameState.devilRiskDrawCount) || 0) > 0) {
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

  function getDevilVictoryLineLayer(profileId = gameState.aiProfileId) {
    return DEVIL_VICTORY_LINE_LAYERS[profileId] || DEVIL_VICTORY_LINE_LAYERS.standard || BASE_DEVIL_VICTORY_LINE_LAYER;
  }

  function getDevilVictoryLine({ playerBust, devilBust, perfectBustLoss } = {}) {
    const tiedWithoutBust = !playerBust && !devilBust && gameState.playerTotal === gameState.devilTotal;
    const finalGap = Math.max(0, gameState.devilTotal - gameState.playerTotal);
    const layer = getDevilVictoryLineLayer();
    let line;

    if (perfectBustLoss) {
      line = layer.perfectBust();
    } else if (tiedWithoutBust) {
      if (isTargetScore(gameState.playerTotal)) {
        line = layer.targetTie();
      } else if (isLowEffortTie(gameState)) {
        line = layer.lowEffortTie();
      } else {
        line = layer.normalTie();
      }
    } else if (playerBust) {
      line = layer.playerBust();
    } else if (gameState.contractUsed) {
      line = layer.contractLoss();
    } else if (gameState.playerTotal >= 63) {
      line = layer.nearTarget();
    } else if (gameState.playerTotal >= 57 && finalGap > 0 && finalGap <= 2) {
      line = layer.narrowGap();
    } else if (gameState.playerTotal <= 35) {
      line = layer.veryLowScore();
    } else if (gameState.playerTotal <= 49) {
      line = layer.lowScore();
    } else if (gameState.playerTotal <= 56) {
      line = layer.middleScore();
    } else if (gameState.playerTotal <= 62) {
      line = layer.highScore();
    } else {
      line = layer.defaultLine();
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

  function getContractOfferDescriptionElement() {
    if (dom.contractOfferDescription?.isConnected) return dom.contractOfferDescription;
    const direct = document.getElementById("contract-offer-description");
    if (direct) {
      dom.contractOfferDescription = direct;
      return direct;
    }
    const fallback = dom.contractOffer?.querySelector(".contract-offer__description, [data-contract-offer-description], p");
    if (fallback) dom.contractOfferDescription = fallback;
    return fallback || null;
  }

  function syncContractOfferDescription() {
    const description = getContractOfferDescriptionElement();
    if (!description) return;
    description.innerHTML = CONTRACT_MODAL_DESCRIPTION_HTML;
  }


  function hasBlockingModalOpen() {
    const blockingModals = [
      dom.standConfirm,
      dom.contractOffer,
      dom.resultArea,
      dom.ruleDialog,
      dom.contractDialog,
      dom.recordResetDialog
    ];
    if (imageDialog?.open) return true;
    return blockingModals.some((modal) => !!modal?.open);
  }

  function getAchievementUnlockDetail(item) {
    const details = [];
    if (item.category) details.push(item.category);
    if (item.hidden) details.push("隠し実績");
    if (Number.isFinite(Number(item.playerTotal)) && Number.isFinite(Number(item.devilTotal))) {
      details.push(`あなた ${item.playerTotal} / 悪魔 ${item.devilTotal}`);
    }
    return details.join("・");
  }

  function createAchievementUnlockListItem(item) {
    const li = document.createElement("li");
    li.className = "achievement-unlock__item";

    const title = document.createElement("span");
    title.className = "achievement-unlock__item-title";
    title.textContent = `${item.numberLabel} ${item.title}`;
    li.appendChild(title);

    const description = document.createElement("span");
    description.className = "achievement-unlock__item-description";
    description.textContent = item.note || "新しい実績を解除しました。";
    li.appendChild(description);

    const detail = getAchievementUnlockDetail(item);
    if (detail) {
      const meta = document.createElement("span");
      meta.className = "achievement-unlock__item-meta";
      meta.textContent = detail;
      li.appendChild(meta);
    }

    return li;
  }

  function renderAchievementUnlockDialog(items) {
    const unlocks = Array.isArray(items) ? items.filter(Boolean) : [];
    const count = unlocks.length;
    if (!count) return;

    if (dom.achievementUnlockName) {
      dom.achievementUnlockName.textContent = count === 1
        ? `${unlocks[0].numberLabel} ${unlocks[0].title}`
        : `${count}件の実績を解除しました`;
    }
    if (dom.achievementUnlockDescription) {
      dom.achievementUnlockDescription.textContent = count === 1
        ? (unlocks[0].note || "新しい実績を解除しました。")
        : "今回の遊戯で解除された実績です。";
    }
    if (dom.achievementUnlockDetail) {
      const detail = count === 1 ? getAchievementUnlockDetail(unlocks[0]) : "";
      dom.achievementUnlockDetail.textContent = detail;
      dom.achievementUnlockDetail.hidden = !detail;
    }
    if (dom.achievementUnlockCount) {
      dom.achievementUnlockCount.textContent = count > 1 ? `解除実績：${count}件` : "";
      dom.achievementUnlockCount.hidden = count <= 1;
    }
    if (dom.achievementUnlockList) {
      dom.achievementUnlockList.replaceChildren(...unlocks.map(createAchievementUnlockListItem));
      dom.achievementUnlockList.hidden = count <= 1;
    }
    if (dom.achievementUnlockCloseButton) {
      dom.achievementUnlockCloseButton.textContent = "閉じる";
    }
  }

  function scheduleAchievementUnlockModal(delay = 180) {
    if (!achievementUnlockQueue.length) return;
    if (achievementUnlockTimer) window.clearTimeout(achievementUnlockTimer);
    achievementUnlockTimer = window.setTimeout(() => {
      achievementUnlockTimer = null;
      showNextAchievementUnlockModal();
    }, delay);
  }

  function showNextAchievementUnlockModal() {
    if (isAchievementModalActive || !achievementUnlockQueue.length) return;
    if (isInteractionLocked || hasBlockingModalOpen()) {
      scheduleAchievementUnlockModal(360);
      return;
    }
    if (gameState.phase === "result" && !gameState.resultModalDismissed) {
      scheduleAchievementUnlockModal(360);
      return;
    }
    if (!["intro", "result"].includes(gameState.phase)) {
      scheduleAchievementUnlockModal(800);
      return;
    }

    renderAchievementUnlockDialog(achievementUnlockQueue);
    isAchievementModalActive = true;
    syncModal(dom.achievementUnlockDialog, true);
    focusElement(dom.achievementUnlockCloseButton, { preventScroll: true });
  }

  function enqueueAchievementUnlocks(unlocks) {
    if (!Array.isArray(unlocks) || !unlocks.length || gameState.debugScenarioActive) return;
    achievementUnlockQueue.push(...unlocks.filter(Boolean));
    if (isAchievementModalActive && dom.achievementUnlockDialog?.open) {
      renderAchievementUnlockDialog(achievementUnlockQueue);
      return;
    }
    scheduleAchievementUnlockModal();
  }

  function dismissAchievementUnlockModal() {
    if (!isAchievementModalActive && !dom.achievementUnlockDialog?.open) return;
    syncModal(dom.achievementUnlockDialog, false);
    achievementUnlockQueue = [];
    isAchievementModalActive = false;
    scheduleAchievementUnlockModal(160);
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
      dom.standConfirmDescription.textContent = gameState.standConfirmationMessage || getStandConfirmationMessage(gameState);
    }
    syncContractOfferDescription();
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
    dom.contractOfferDescription = document.getElementById("contract-offer-description");
    dom.contractOfferDetail = document.getElementById("contract-offer-detail");
    dom.contractCloseButton = document.getElementById("contract-close");
    dom.acceptContractButton = document.getElementById("accept-contract");
    dom.rejectContractButton = document.getElementById("reject-contract");
    dom.resultArea = document.getElementById("result-area");
    dom.resultTitle = document.getElementById("result-title");
    dom.resultSummary = document.getElementById("result-summary");
    dom.endingText = document.getElementById("ending-text");
    dom.viewBoardButton = document.getElementById("view-board");
    dom.achievementUnlockDialog = document.getElementById("achievement-unlock-dialog");
    dom.achievementUnlockName = document.getElementById("achievement-unlock-name");
    dom.achievementUnlockDescription = document.getElementById("achievement-unlock-description");
    dom.achievementUnlockDetail = document.getElementById("achievement-unlock-detail");
    dom.achievementUnlockCount = document.getElementById("achievement-unlock-count");
    dom.achievementUnlockList = document.getElementById("achievement-unlock-list");
    dom.achievementUnlockCloseButton = document.getElementById("achievement-unlock-close");
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
    [dom.standConfirm, dom.contractOffer, dom.resultArea, dom.achievementUnlockDialog].forEach((modal) => {
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

  function setDebugState({ name, player, devil, deck = [], contractUsed = false, contractedCard = null, contractedCards = [], hiddenRevealed = false, aiProfileId = "", forceMoodRiskDraw = false }) {
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
    gameState.debugAiProfileId = aiProfileId && DEVIL_AI_PROFILES[aiProfileId] ? aiProfileId : "";
    gameState.debugForceMoodRiskDraw = !!forceMoodRiskDraw;
    gameState.winner = null;
    gameState.resultType = null;
    gameState.resultModalDismissed = false;
    gameState.resultDevilLine = "";
    gameState.resultDevilLineLogged = false;
    gameState.statsRecorded = false;
    gameState.standConfirmationMessage = "";
    gameState.devilTurnLine = "";
    gameState.devilRiskDrawCount = 0;
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
    setDebugStatus(`準備完了：${gameState.debugScenarioName} / あなた ${gameState.playerTotal}、悪魔 ${gameState.devilTotal}、次の予約札 ${deckNumbers.join("・") || "なし"}、残り山札 ${gameState.deck.length}枚${contractedStatus}${markedStatus}${gameState.debugAiProfileId ? `、悪魔の機嫌固定：${DEVIL_AI_PROFILES[gameState.debugAiProfileId].mood}` : ""}${gameState.debugForceMoodRiskDraw ? "、慢心ドロー強制" : ""}`);
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
      relaxedRiskBustWin: async () => {
        setDebugState({ name: "余裕：慢心ドローで悪魔バースト", player: [21, 20, 10], devil: [20, 19, 15], deck: [13, 1], hiddenRevealed: true, aiProfileId: "relaxed", forceMoodRiskDraw: true });
        await proceedToDevilTurn();
      },
      relaxedRiskStillWin: async () => {
        setDebugState({ name: "余裕：慢心ドローしても悪魔勝利", player: [21, 20, 10], devil: [20, 19, 15], deck: [1, 2], hiddenRevealed: true, aiProfileId: "relaxed", forceMoodRiskDraw: true });
        await proceedToDevilTurn();
      },
      standardRiskBustWin: async () => {
        setDebugState({ name: "平静：まれな慢心ドローで悪魔バースト", player: [21, 20, 1], devil: [19, 18, 9], deck: [21, 1], hiddenRevealed: true, aiProfileId: "standard", forceMoodRiskDraw: true });
        await proceedToDevilTurn();
      },
      seriousStableStop: async () => {
        setDebugState({ name: "本気：勝ち確で余計に引かず停止", player: [21, 20, 10], devil: [20, 19, 15], deck: [13, 1], hiddenRevealed: true, aiProfileId: "serious", forceMoodRiskDraw: true });
        await proceedToDevilTurn();
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

  const SIMULATOR_PLAYER_STRATEGIES = {
    stand55: { id: "stand55", label: "55以上で留まる", threshold: 55 },
    stand57: { id: "stand57", label: "57以上で留まる", threshold: 57 },
    stand60: { id: "stand60", label: "60以上で留まる", threshold: 60 },
    stand63: { id: "stand63", label: "63以上で留まる", threshold: 63 },
    stand66: { id: "stand66", label: "66まで攻める", threshold: 66 }
  };

  const ACHIEVEMENT_SIMULATOR_PLAYER_STRATEGIES = {
    stand25: { id: "stand25", label: "25以上で留まる", threshold: 25 },
    stand35: { id: "stand35", label: "35以上で留まる", threshold: 35 },
    stand40: { id: "stand40", label: "40以上で留まる", threshold: 40 },
    stand45: { id: "stand45", label: "45以上で留まる", threshold: 45 },
    stand49: { id: "stand49", label: "49以上で留まる", threshold: 49 },
    ...SIMULATOR_PLAYER_STRATEGIES,
    targetThenDraw: { id: "targetThenDraw", label: "66到達後も一枚引く", threshold: TARGET_SCORE, drawAfterTargetOnce: true }
  };

  const SIMULATOR_CONTRACT_POLICIES = {
    none: { id: "none", label: "契約しない", minReflectedTotal: Infinity },
    always: { id: "always", label: "常に契約する", minReflectedTotal: -Infinity },
    reflected55: { id: "reflected55", label: "契約後55以上なら契約", minReflectedTotal: 55 },
    reflected60: { id: "reflected60", label: "契約後60以上なら契約", minReflectedTotal: 60 }
  };

  function clampSimulatorTrialCount(value) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return 1000;
    return Math.min(100000, Math.max(1, parsed));
  }

  function createSimulatorRandom(seedText = "") {
    const normalizedSeed = String(seedText || `devil-sim-${Date.now()}-${Math.random()}`);
    let hash = 2166136261;
    for (let index = 0; index < normalizedSeed.length; index += 1) {
      hash ^= normalizedSeed.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    let state = hash >>> 0;
    return {
      seed: normalizedSeed,
      random: () => {
        state += 0x6D2B79F5;
        let value = state;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
      }
    };
  }

  function shouldSimulatorAcceptContract(policyId, reflectedTotal) {
    const policy = SIMULATOR_CONTRACT_POLICIES[policyId] || SIMULATOR_CONTRACT_POLICIES.none;
    return reflectedTotal >= policy.minReflectedTotal;
  }

  function getSimulatorSelectValue(id, fallback) {
    const element = document.getElementById(id);
    return element?.value || fallback;
  }

  function getSimulatorInputValue(id, fallback = "") {
    const element = document.getElementById(id);
    return element?.value || fallback;
  }

  function createSimulationState(cards, random) {
    const state = {
      deck: shuffleCardsWithRandom(cards, random),
      playerCards: [],
      devilCards: [],
      hiddenDevilCardRevealed: true,
      playerTotal: 0,
      devilTotal: 0,
      playerContractAdjustment: 0,
      target: TARGET_SCORE,
      phase: "player-turn",
      contractUsed: false,
      lastPlayerCard: null,
      contractedCardThisGame: null,
      bustedAfterPerfect66: false,
      debugScenarioActive: true,
      debugForceMoodRiskDraw: false,
      winner: null,
      resultType: null,
      statsRecorded: false,
      devilRiskDrawCount: 0,
      devilSurrendered: false,
      devilDecisionReason: "",
      random,
      simulatorReasons: [],
      simulatorExtraDrawAfterTargetUsed: false,
      simulatorLastPlayerDrawnCard: null,
      simulatorLastPlayerDrawnCardNumber: null
    };

    state.playerCards.push(drawFromDeck(state));
    state.playerCards.push(drawFromDeck(state));
    state.devilCards.push(drawFromDeck(state));
    state.devilCards.push(drawFromDeck(state));
    state.playerCards = state.playerCards.filter(Boolean);
    state.devilCards = state.devilCards.filter(Boolean);
    syncTotals(state);
    return state;
  }

  function evaluateSimulationResult(state) {
    syncTotals(state);

    const playerBust = isBust(state.playerTotal, state.target);
    const devilBust = isBust(state.devilTotal, state.target);

    if (playerBust && !devilBust) {
      state.winner = "devil";
    } else if (devilBust && !playerBust) {
      state.winner = "player";
    } else if (!playerBust && !devilBust && state.playerTotal > state.devilTotal) {
      state.winner = "player";
    } else {
      state.winner = "devil";
    }

    const contractKey = state.contractUsed ? "contract" : "clean";
    const perfectBustLoss = playerBust && state.bustedAfterPerfect66 && state.winner === "devil";
    state.resultType = state.devilSurrendered && state.winner === "player"
      ? "win-devil-surrender"
      : (perfectBustLoss ? "loss-perfect-bust" : `${state.winner === "player" ? "win" : "loss"}-${contractKey}`);

    return { playerBust, devilBust, perfectBustLoss };
  }

  function simulateSingleDevilGame({ cards, profile, strategy, contractPolicyId, random, contractedCardIds = null }) {
    const state = createSimulationState(cards, random);
    let contractOffered = false;
    let contractAccepted = false;
    let contractRejected = false;
    let playerStoppedByStrategy = false;
    let contractReflectedTotal = null;
    let contractCardNumber = null;
    let contractCardId = null;
    const contractedCardSet = contractedCardIds instanceof Set
      ? contractedCardIds
      : (Array.isArray(contractedCardIds) ? new Set(contractedCardIds.filter(Boolean)) : null);
    const isMarkedContractCard = (card) => Boolean(card?.id && contractedCardSet?.has(card.id));

    while (state.phase === "player-turn") {
      syncTotals(state);

      const shouldDrawAfterExactTarget = Boolean(strategy.drawAfterTargetOnce)
        && isTargetScore(state.playerTotal)
        && !state.simulatorExtraDrawAfterTargetUsed;

      if (state.playerTotal >= strategy.threshold && !shouldDrawAfterExactTarget) {
        playerStoppedByStrategy = true;
        break;
      }

      if (shouldDrawAfterExactTarget) {
        state.simulatorExtraDrawAfterTargetUsed = true;
      }

      const totalBeforeDraw = state.playerTotal;
      const card = drawFromDeck(state);
      if (!card) {
        playerStoppedByStrategy = true;
        break;
      }

      state.playerCards.push(card);
      state.lastPlayerCard = card;
      state.simulatorLastPlayerDrawnCard = card;
      state.simulatorLastPlayerDrawnCardNumber = getCardScore(card);
      syncTotals(state);

      if (isBust(state.playerTotal, state.target)) {
        state.bustedAfterPerfect66 = isTargetScore(totalBeforeDraw);
        state.playerTotalBeforeBust = totalBeforeDraw;
        const markedCardBust = isMarkedContractCard(card);
        const reflectedTotal = getReflectedContractTotal(state.playerTotal);
        contractReflectedTotal = reflectedTotal;
        contractCardNumber = getCardScore(card);
        contractCardId = card?.id || null;

        if (markedCardBust) {
          state.markedCardBust = true;
          state.winner = "devil";
          state.resultType = state.bustedAfterPerfect66 ? "loss-perfect-bust" : "loss-marked";
          return {
            state,
            playerStoppedByStrategy,
            contractOffered: false,
            contractAccepted: false,
            contractRejected: false,
            contractReflectedTotal,
            contractCardNumber,
            contractCardId,
            markedCardBust: true,
            profileId: profile.id,
            strategyId: strategy.id,
            contractPolicyId,
            playerBust: true,
            devilBust: false,
            perfectBustLoss: state.bustedAfterPerfect66,
            immediatePlayerBustLoss: true
          };
        }

        contractOffered = !state.contractUsed;

        if (contractOffered && shouldSimulatorAcceptContract(contractPolicyId, reflectedTotal)) {
          contractAccepted = true;
          state.contractUsed = true;
          state.contractedCardThisGame = card;
          state.playerContractAdjustment = reflectedTotal - sumCards(state.playerCards);
          state.lastPlayerCard = null;
          state.bustedAfterPerfect66 = false;
          syncTotals(state);
          playerStoppedByStrategy = true;
          break;
        }

        contractRejected = contractOffered;
        state.winner = "devil";
        state.resultType = state.bustedAfterPerfect66 ? "loss-perfect-bust" : (contractRejected ? "loss-reject" : "loss-clean");
        return {
          state,
          playerStoppedByStrategy,
          contractOffered,
          contractAccepted,
          contractRejected,
          contractReflectedTotal,
          contractCardNumber,
          contractCardId,
          profileId: profile.id,
          strategyId: strategy.id,
          contractPolicyId,
          playerBust: true,
          devilBust: false,
          markedCardBust: false,
          perfectBustLoss: state.bustedAfterPerfect66,
          immediatePlayerBustLoss: true
        };
      }
    }

    state.phase = "devil-turn";
    state.devilRiskDrawCount = 0;
    state.devilSurrendered = false;
    state.devilDecisionReason = "";

    while (shouldDevilDraw(state, profile)) {
      if (state.devilDecisionReason) state.simulatorReasons.push(state.devilDecisionReason);
      const card = drawFromDeck(state);
      if (!card) break;
      state.devilCards.push(card);
      syncTotals(state);
      if (isBust(state.devilTotal, state.target)) break;
    }

    if (state.devilDecisionReason) state.simulatorReasons.push(state.devilDecisionReason);
    const result = evaluateSimulationResult(state);

    return {
      state,
      playerStoppedByStrategy,
      contractOffered,
      contractAccepted,
      contractRejected,
      contractReflectedTotal,
      contractCardNumber,
      contractCardId,
      profileId: profile.id,
      strategyId: strategy.id,
      contractPolicyId,
      ...result,
      markedCardBust: false,
      immediatePlayerBustLoss: false
    };
  }

  function createEmptySimulationStats(profile, strategy, contractPolicy, trialCount, seed) {
    return {
      profile,
      strategy,
      contractPolicy,
      trialCount,
      seed,
      playerWins: 0,
      devilWins: 0,
      playerTotalSum: 0,
      devilTotalSum: 0,
      playerBusts: 0,
      devilBusts: 0,
      ties: 0,
      targetTies: 0,
      lowEffortTieLosses: 0,
      playerExact66Wins: 0,
      devilExact66Wins: 0,
      contractOffered: 0,
      contractAccepted: 0,
      contractRejected: 0,
      contractWins: 0,
      contractLosses: 0,
      devilRiskDrawGames: 0,
      devilRiskDrawTotal: 0,
      devilRiskBusts: 0,
      devilSurrenders: 0,
      lowEffortTiePunishes: 0,
      lowEffortTieNoSafeDraws: 0,
      forcedSurrenders: 0,
      resultTypes: {},
      decisionReasons: {}
    };
  }

  function incrementSimulationCount(collection, key) {
    if (!key) return;
    collection[key] = (collection[key] || 0) + 1;
  }

  function collectSimulationStats(stats, simulation) {
    const { state } = simulation;
    const playerWon = state.winner === "player";
    const devilWon = state.winner === "devil";
    const tied = !simulation.playerBust && !simulation.devilBust && state.playerTotal === state.devilTotal;
    const targetTie = tied && isTargetScore(state.playerTotal);
    const lowEffortTieLoss = tied && state.playerTotal <= LOW_EFFORT_TIE_MAX && devilWon;
    const riskDrawCount = Number(state.devilRiskDrawCount) || 0;

    if (playerWon) stats.playerWins += 1;
    if (devilWon) stats.devilWins += 1;
    if (simulation.playerBust) stats.playerBusts += 1;
    if (simulation.devilBust) stats.devilBusts += 1;
    if (tied) stats.ties += 1;
    if (targetTie) stats.targetTies += 1;
    if (lowEffortTieLoss) stats.lowEffortTieLosses += 1;
    if (playerWon && isTargetScore(state.playerTotal)) stats.playerExact66Wins += 1;
    if (devilWon && isTargetScore(state.devilTotal)) stats.devilExact66Wins += 1;
    if (simulation.contractOffered) stats.contractOffered += 1;
    if (simulation.contractAccepted) stats.contractAccepted += 1;
    if (simulation.contractRejected) stats.contractRejected += 1;
    if (state.contractUsed && playerWon) stats.contractWins += 1;
    if (state.contractUsed && devilWon) stats.contractLosses += 1;
    if (riskDrawCount > 0) stats.devilRiskDrawGames += 1;
    stats.devilRiskDrawTotal += riskDrawCount;
    if (riskDrawCount > 0 && simulation.devilBust) stats.devilRiskBusts += 1;
    if (state.devilSurrendered) stats.devilSurrenders += 1;

    stats.playerTotalSum += state.playerTotal;
    stats.devilTotalSum += state.devilTotal;
    incrementSimulationCount(stats.resultTypes, state.resultType);

    (state.simulatorReasons || []).forEach((reason) => {
      incrementSimulationCount(stats.decisionReasons, reason);
      if (reason === "low_effort_tie_punish") stats.lowEffortTiePunishes += 1;
      if (reason === "low_effort_tie_no_safe_draw") stats.lowEffortTieNoSafeDraws += 1;
      if (reason === "forced_surrender") stats.forcedSurrenders += 1;
    });
  }

  function runDevilWinrateSimulation(options) {
    const cards = getMajorArcanaCards();
    if (cards.length < 22) {
      throw new Error("大アルカナのカードデータが22枚読めないため、シミュレーターを実行できません。");
    }

    const profile = DEVIL_AI_PROFILES[options.profileId] || DEVIL_AI_PROFILES.standard;
    const strategy = SIMULATOR_PLAYER_STRATEGIES[options.strategyId] || SIMULATOR_PLAYER_STRATEGIES.stand57;
    const contractPolicy = SIMULATOR_CONTRACT_POLICIES[options.contractPolicyId] || SIMULATOR_CONTRACT_POLICIES.none;
    const { seed, random } = createSimulatorRandom(options.seedText);
    const trialCount = clampSimulatorTrialCount(options.trialCount);
    const stats = createEmptySimulationStats(profile, strategy, contractPolicy, trialCount, seed);

    for (let index = 0; index < trialCount; index += 1) {
      const simulation = simulateSingleDevilGame({
        cards,
        profile,
        strategy,
        contractPolicyId: contractPolicy.id,
        random
      });
      collectSimulationStats(stats, simulation);
    }

    return stats;
  }

  function formatSimulationPercent(value, denominator) {
    if (!denominator) return "0.00%";
    return `${((value / denominator) * 100).toFixed(2)}%`;
  }

  function formatSimulationNumber(value) {
    return Number(value || 0).toLocaleString("ja-JP");
  }

  function formatSimulationAverage(value, denominator) {
    if (!denominator) return "0.00";
    return (value / denominator).toFixed(2);
  }

  function getTopSimulationEntries(collection, limit = 8) {
    return Object.entries(collection || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
  }

  function formatTopSimulationEntries(collection, trialCount, limit = 8) {
    const entries = getTopSimulationEntries(collection, limit);
    if (!entries.length) return "なし";
    return entries
      .map(([key, count]) => `- ${key}: ${formatSimulationNumber(count)}回（${formatSimulationPercent(count, trialCount)}）`)
      .join("\n");
  }

  function formatTopSimulationMultiCountEntries(collection, trialCount, limit = 8) {
    const entries = getTopSimulationEntries(collection, limit);
    if (!entries.length) return "なし";
    return entries
      .map(([key, count]) => `- ${key}: ${formatSimulationNumber(count)}回（1ゲーム平均 ${formatSimulationAverage(count, trialCount)}回）`)
      .join("\n");
  }

  function formatSimulationReport(stats) {
    const trialCount = stats.trialCount;
    return `勝率シミュレーター結果 / ${DEVIL_GAME_BUILD}

条件
- 悪魔の機嫌: ${stats.profile.mood}（${stats.profile.id}）
- プレイヤー戦略: ${stats.strategy.label}
- 契約方針: ${stats.contractPolicy.label}
- 試行回数: ${formatSimulationNumber(trialCount)}回
- seed: ${stats.seed}

勝敗
- あなたの勝利: ${formatSimulationNumber(stats.playerWins)}回（${formatSimulationPercent(stats.playerWins, trialCount)}）
- 悪魔の勝利: ${formatSimulationNumber(stats.devilWins)}回（${formatSimulationPercent(stats.devilWins, trialCount)}）

スコア平均
- あなた平均: ${formatSimulationAverage(stats.playerTotalSum, trialCount)}
- 悪魔平均: ${formatSimulationAverage(stats.devilTotalSum, trialCount)}

主な内訳
- あなたバースト: ${formatSimulationNumber(stats.playerBusts)}回（${formatSimulationPercent(stats.playerBusts, trialCount)}）
- 悪魔バースト: ${formatSimulationNumber(stats.devilBusts)}回（${formatSimulationPercent(stats.devilBusts, trialCount)}）
- 同点敗北: ${formatSimulationNumber(stats.ties)}回（${formatSimulationPercent(stats.ties, trialCount)}）
- 66同点敗北: ${formatSimulationNumber(stats.targetTies)}回（${formatSimulationPercent(stats.targetTies, trialCount)}）
- 66到達勝利: ${formatSimulationNumber(stats.playerExact66Wins)}回（${formatSimulationPercent(stats.playerExact66Wins, trialCount)}）
- 低得点同点敗北: ${formatSimulationNumber(stats.lowEffortTieLosses)}回（${formatSimulationPercent(stats.lowEffortTieLosses, trialCount)}）

契約
- 契約提示: ${formatSimulationNumber(stats.contractOffered)}回（${formatSimulationPercent(stats.contractOffered, trialCount)}）
- 契約受諾: ${formatSimulationNumber(stats.contractAccepted)}回（${formatSimulationPercent(stats.contractAccepted, trialCount)}）
- 契約拒否: ${formatSimulationNumber(stats.contractRejected)}回（${formatSimulationPercent(stats.contractRejected, trialCount)}）
- 契約後勝利: ${formatSimulationNumber(stats.contractWins)}回（${formatSimulationPercent(stats.contractWins, trialCount)}）
- 契約後敗北: ${formatSimulationNumber(stats.contractLosses)}回（${formatSimulationPercent(stats.contractLosses, trialCount)}）

悪魔AI
- 慢心ドロー発生ゲーム: ${formatSimulationNumber(stats.devilRiskDrawGames)}回（${formatSimulationPercent(stats.devilRiskDrawGames, trialCount)}）
- 慢心ドロー総回数: ${formatSimulationNumber(stats.devilRiskDrawTotal)}回
- 慢心ドロー由来の悪魔バースト: ${formatSimulationNumber(stats.devilRiskBusts)}回（${formatSimulationPercent(stats.devilRiskBusts, trialCount)}）
- 悪魔が札を伏せた勝利: ${formatSimulationNumber(stats.devilSurrenders)}回（${formatSimulationPercent(stats.devilSurrenders, trialCount)}）
- 低得点同点への追撃: ${formatSimulationNumber(stats.lowEffortTiePunishes)}回（${formatSimulationPercent(stats.lowEffortTiePunishes, trialCount)}）
- 低得点同点・次札バースト停止: ${formatSimulationNumber(stats.lowEffortTieNoSafeDraws)}回（${formatSimulationPercent(stats.lowEffortTieNoSafeDraws, trialCount)}）
- 全残り札バーストによる停止: ${formatSimulationNumber(stats.forcedSurrenders)}回（${formatSimulationPercent(stats.forcedSurrenders, trialCount)}）

結果タイプ上位
${formatTopSimulationEntries(stats.resultTypes, trialCount)}

悪魔判断理由上位
${formatTopSimulationMultiCountEntries(stats.decisionReasons, trialCount)}

※この試算はデバッグ用の仮想遊戯です。勝敗記録、契約台帳、実績には保存されません。`;
  }

  function wrapSimulationReportAsCodeBlock(report) {
    return `\`\`\`txt\n${report}\n\`\`\``;
  }

  function getSimulationRate(value, denominator) {
    if (!denominator) return "0.00";
    return ((value / denominator) * 100).toFixed(2);
  }

  function getSimulationContractWinRate(stats) {
    if (!stats.contractAccepted) return "0.00";
    return getSimulationRate(stats.contractWins, stats.contractAccepted);
  }

  function formatSimulationBatchRow(stats) {
    const trialCount = stats.trialCount;
    return [
      stats.profile.mood,
      stats.profile.id,
      stats.strategy.label,
      stats.strategy.id,
      stats.contractPolicy.label,
      stats.contractPolicy.id,
      formatSimulationNumber(trialCount),
      `${getSimulationRate(stats.playerWins, trialCount)}%`,
      `${getSimulationRate(stats.devilWins, trialCount)}%`,
      `${formatSimulationAverage(stats.playerTotalSum, trialCount)}`,
      `${formatSimulationAverage(stats.devilTotalSum, trialCount)}`,
      `${getSimulationRate(stats.playerBusts, trialCount)}%`,
      `${getSimulationRate(stats.devilBusts, trialCount)}%`,
      `${getSimulationRate(stats.ties, trialCount)}%`,
      `${getSimulationRate(stats.targetTies, trialCount)}%`,
      `${getSimulationRate(stats.playerExact66Wins, trialCount)}%`,
      `${getSimulationRate(stats.contractOffered, trialCount)}%`,
      `${getSimulationRate(stats.contractAccepted, trialCount)}%`,
      `${getSimulationContractWinRate(stats)}%`,
      `${getSimulationRate(stats.contractLosses, trialCount)}%`,
      `${getSimulationRate(stats.devilRiskDrawGames, trialCount)}%`,
      `${getSimulationRate(stats.devilRiskBusts, trialCount)}%`,
      `${getSimulationRate(stats.devilSurrenders, trialCount)}%`,
      stats.seed
    ].join("\t");
  }

  function formatSimulationBatchReport(batch) {
    const header = [
      "悪魔の機嫌",
      "profileId",
      "プレイヤー戦略",
      "strategyId",
      "契約方針",
      "contractPolicyId",
      "試行回数",
      "あなた勝率",
      "悪魔勝率",
      "あなた平均",
      "悪魔平均",
      "あなたバースト率",
      "悪魔バースト率",
      "同点敗北率",
      "66同点敗北率",
      "66到達勝利率",
      "契約提示率",
      "契約受諾率",
      "契約後勝率",
      "契約後敗北率",
      "慢心ドロー発生率",
      "慢心バースト率",
      "全残り札バースト停止率",
      "seed"
    ].join("\t");

    const rows = batch.results.map(formatSimulationBatchRow).join("\n");
    return `勝率シミュレーター一括結果 / ${DEVIL_GAME_BUILD}

条件
- 出力形式: TSV（タブ区切り）
- 組み合わせ: 悪魔の機嫌 3種 × プレイヤー戦略 ${batch.strategyCount}種 × 契約方針 ${batch.contractPolicyCount}種 = ${batch.results.length}条件
- 各条件の試行回数: ${formatSimulationNumber(batch.trialCount)}回
- 総試行回数: ${formatSimulationNumber(batch.trialCount * batch.results.length)}回
- base seed: ${batch.baseSeed}

${header}
${rows}

注記
- この試算はデバッグ用の仮想遊戯です。勝敗記録、契約台帳、実績には保存されません。
- 契約方針は単発試算です。契約台帳の持ち越しは反映していません。
- そのため「常に契約する」は、契約を永続コストなしで使った場合の上限値として読んでください。`;
  }

  function runDevilWinrateBatchSimulation(options) {
    const baseSeed = String(options.seedText || `devil-sim-all-${Date.now()}-${Math.random()}`);
    const trialCount = clampSimulatorTrialCount(options.trialCount);
    const profiles = [DEVIL_AI_PROFILES.relaxed, DEVIL_AI_PROFILES.standard, DEVIL_AI_PROFILES.serious].filter(Boolean);
    const strategies = Object.values(SIMULATOR_PLAYER_STRATEGIES);
    const contractPolicies = Object.values(SIMULATOR_CONTRACT_POLICIES);
    const results = [];

    profiles.forEach((profile) => {
      strategies.forEach((strategy) => {
        contractPolicies.forEach((contractPolicy) => {
          const seedText = `${baseSeed}|${profile.id}|${strategy.id}|${contractPolicy.id}`;
          results.push(runDevilWinrateSimulation({
            profileId: profile.id,
            strategyId: strategy.id,
            contractPolicyId: contractPolicy.id,
            trialCount,
            seedText
          }));
        });
      });
    });

    return {
      baseSeed,
      trialCount,
      strategyCount: strategies.length,
      contractPolicyCount: contractPolicies.length,
      results
    };
  }



  function clampMoodTransitionHorizon(value) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return 100;
    return Math.min(1000, Math.max(1, parsed));
  }

  function clampMoodTransitionCount(value, fallback = 0) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(MAX_STAT_COUNT, Math.max(0, parsed));
  }

  function getLedgerLongRunEffectiveSettings(options, totalCases = 1) {
    const requestedTrialCount = clampSimulatorTrialCount(options.trialCount);
    const horizon = clampMoodTransitionHorizon(options.horizon);
    const safeTotalCases = Math.max(1, Number.parseInt(totalCases, 10) || 1);
    const maxTrialCountByTotal = Math.max(1, Math.floor(LEDGER_LONGRUN_MAX_TOTAL_GAMES / Math.max(1, safeTotalCases * horizon)));
    const trialCount = Math.max(1, Math.min(requestedTrialCount, maxTrialCountByTotal));
    const requestedTotalGames = safeTotalCases * requestedTrialCount * horizon;
    const effectiveTotalGames = safeTotalCases * trialCount * horizon;

    return {
      requestedTrialCount,
      trialCount,
      horizon,
      totalCases: safeTotalCases,
      requestedTotalGames,
      effectiveTotalGames,
      maxTotalGames: LEDGER_LONGRUN_MAX_TOTAL_GAMES,
      wasAutoCapped: trialCount !== requestedTrialCount
    };
  }

  function getMoodIdFromDifference(difference) {
    if (difference <= -5) return "relaxed";
    if (difference >= 3) return "serious";
    return "standard";
  }

  function isDifferenceInMood(difference, moodId) {
    return getMoodIdFromDifference(difference) === moodId;
  }

  function getMoodProfileByDifference(difference) {
    return DEVIL_AI_PROFILES[getMoodIdFromDifference(difference)] || DEVIL_AI_PROFILES.standard;
  }

  function getTransitionCheckpoints(horizon) {
    const defaults = [10, 20, 30, 50, 75, 100, 150, 200, 300, 500, 1000];
    const values = defaults.filter((value) => value <= horizon);
    if (!values.includes(horizon)) values.push(horizon);
    return Array.from(new Set(values)).sort((a, b) => a - b);
  }

  function estimateMoodTransitionWinRates({ strategyId, contractPolicyId, trialCount, baseSeed }) {
    const profiles = [DEVIL_AI_PROFILES.relaxed, DEVIL_AI_PROFILES.standard, DEVIL_AI_PROFILES.serious].filter(Boolean);
    const rates = {};
    const sourceStats = [];

    profiles.forEach((profile) => {
      const stats = runDevilWinrateSimulation({
        profileId: profile.id,
        strategyId,
        contractPolicyId,
        trialCount,
        seedText: `${baseSeed}|winrate|${profile.id}|${strategyId}|${contractPolicyId}`
      });
      const rate = stats.trialCount ? stats.playerWins / stats.trialCount : 0;
      rates[profile.id] = Math.min(1, Math.max(0, rate));
      sourceStats.push(stats);
    });

    return { rates, sourceStats };
  }

  function propagateMoodDistribution(startDifference, horizon, winRates) {
    let states = new Map([[startDifference, 1]]);
    const snapshots = new Map([[0, states]]);

    for (let turn = 1; turn <= horizon; turn += 1) {
      const next = new Map();
      states.forEach((probability, difference) => {
        const profile = getMoodProfileByDifference(difference);
        const winRate = Number.isFinite(winRates[profile.id]) ? winRates[profile.id] : 0.5;
        const winDifference = difference + 1;
        const lossDifference = difference - 1;
        next.set(winDifference, (next.get(winDifference) || 0) + probability * winRate);
        next.set(lossDifference, (next.get(lossDifference) || 0) + probability * (1 - winRate));
      });
      states = next;
      snapshots.set(turn, states);
    }

    return snapshots;
  }

  function summarizeMoodDistribution(states) {
    const summary = { relaxed: 0, standard: 0, serious: 0, expectedDifference: 0 };
    states.forEach((probability, difference) => {
      const moodId = getMoodIdFromDifference(difference);
      summary[moodId] += probability;
      summary.expectedDifference += probability * difference;
    });
    return summary;
  }

  function computeMoodFirstHit(startDifference, horizon, winRates, targetMoodId) {
    const hitByTurn = new Array(horizon + 1).fill(0);
    let states = new Map();

    if (isDifferenceInMood(startDifference, targetMoodId)) hitByTurn[0] = 1;
    else states.set(startDifference, 1);

    for (let turn = 1; turn <= horizon; turn += 1) {
      const next = new Map();
      states.forEach((probability, difference) => {
        const profile = getMoodProfileByDifference(difference);
        const winRate = Number.isFinite(winRates[profile.id]) ? winRates[profile.id] : 0.5;
        [[difference + 1, probability * winRate], [difference - 1, probability * (1 - winRate)]].forEach(([nextDifference, nextProbability]) => {
          if (!nextProbability) return;
          if (isDifferenceInMood(nextDifference, targetMoodId)) hitByTurn[turn] += nextProbability;
          else next.set(nextDifference, (next.get(nextDifference) || 0) + nextProbability);
        });
      });
      states = next;
    }

    const cumulativeByTurn = [];
    let cumulative = 0;
    hitByTurn.forEach((probability, turn) => {
      cumulative += probability;
      cumulativeByTurn[turn] = cumulative;
    });

    const medianTurn = cumulativeByTurn.findIndex((probability) => probability >= 0.5);
    const meanTurnWithinHorizon = hitByTurn.reduce((sum, probability, turn) => sum + probability * turn, 0);
    const hitProbability = cumulativeByTurn[horizon] || 0;
    const conditionalMeanTurn = hitProbability ? meanTurnWithinHorizon / hitProbability : null;

    return { targetMoodId, hitByTurn, cumulativeByTurn, hitProbability, medianTurn: medianTurn >= 0 ? medianTurn : null, conditionalMeanTurn };
  }

  function runDevilMoodTransitionSimulation(options) {
    const strategy = SIMULATOR_PLAYER_STRATEGIES[options.strategyId] || SIMULATOR_PLAYER_STRATEGIES.stand57;
    const contractPolicy = SIMULATOR_CONTRACT_POLICIES[options.contractPolicyId] || SIMULATOR_CONTRACT_POLICIES.none;
    const trialCount = clampSimulatorTrialCount(options.trialCount);
    const horizon = clampMoodTransitionHorizon(options.horizon);
    const startWins = clampMoodTransitionCount(options.startWins, gameStats?.wins || 0);
    const startLosses = clampMoodTransitionCount(options.startLosses, gameStats?.losses || 0);
    const startDifference = startWins - startLosses;
    const baseSeed = String(options.seedText || `devil-mood-transition-${Date.now()}-${Math.random()}`);
    const { rates, sourceStats } = estimateMoodTransitionWinRates({ strategyId: strategy.id, contractPolicyId: contractPolicy.id, trialCount, baseSeed });
    const checkpoints = getTransitionCheckpoints(horizon);
    const snapshots = propagateMoodDistribution(startDifference, horizon, rates);
    const finalSummary = summarizeMoodDistribution(snapshots.get(horizon) || new Map());
    const checkpointSummaries = checkpoints.map((turn) => ({ turn, ...summarizeMoodDistribution(snapshots.get(turn) || new Map()) }));
    const firstHits = {
      relaxed: computeMoodFirstHit(startDifference, horizon, rates, "relaxed"),
      standard: computeMoodFirstHit(startDifference, horizon, rates, "standard"),
      serious: computeMoodFirstHit(startDifference, horizon, rates, "serious")
    };
    return { strategy, contractPolicy, trialCount, horizon, startWins, startLosses, startDifference, startMood: getMoodProfileByDifference(startDifference), baseSeed, rates, sourceStats, checkpoints, checkpointSummaries, finalSummary, firstHits };
  }

  function formatTransitionProbability(value) {
    if (!Number.isFinite(value)) return "0.00%";
    return `${(value * 100).toFixed(2)}%`;
  }

  function formatTransitionTurn(value) {
    if (value === null || value === undefined || !Number.isFinite(value)) return "未到達";
    return `${value.toFixed(1).replace(/\.0$/, "")}戦`;
  }

  function formatMoodTransitionRateRows(result) {
    return result.sourceStats.map((stats) => [stats.profile.mood, stats.profile.id, `${getSimulationRate(stats.playerWins, stats.trialCount)}%`, `${getSimulationRate(stats.devilWins, stats.trialCount)}%`, formatSimulationNumber(stats.trialCount), stats.seed].join("\t")).join("\n");
  }

  function formatMoodTransitionCheckpointRows(result) {
    return result.checkpointSummaries.map((summary) => [`${summary.turn}戦後`, formatTransitionProbability(summary.relaxed), formatTransitionProbability(summary.standard), formatTransitionProbability(summary.serious), summary.expectedDifference.toFixed(2)].join("\t")).join("\n");
  }

  function formatMoodTransitionHitRows(result) {
    return [DEVIL_AI_PROFILES.relaxed, DEVIL_AI_PROFILES.standard, DEVIL_AI_PROFILES.serious].map((profile) => {
      const hit = result.firstHits[profile.id];
      const checkpointValues = result.checkpoints.map((turn) => `${turn}戦以内 ${formatTransitionProbability(hit.cumulativeByTurn[turn] || 0)}`).join(" / ");
      return [profile.mood, profile.id, checkpointValues, formatTransitionTurn(hit.medianTurn), formatTransitionTurn(hit.conditionalMeanTurn), formatTransitionProbability(hit.hitProbability)].join("\t");
    }).join("\n");
  }

  function formatMoodTransitionReport(result) {
    const rateHeader = ["悪魔の機嫌", "profileId", "推定あなた勝率", "推定悪魔勝率", "推定試行回数", "seed"].join("\t");
    const distributionHeader = ["時点", "余裕確率", "平静確率", "本気確率", "期待勝敗差"].join("\t");
    const hitHeader = ["到達対象", "profileId", "累積到達確率", "到達中央値", "到達時の条件付き平均", "追跡期間内の到達確率"].join("\t");
    const seriousHit = result.firstHits.serious;
    const standardHit = result.firstHits.standard;
    const seriousNeeded = Math.max(0, 3 - result.startDifference);
    const standardNeeded = result.startDifference <= -5 ? -4 - result.startDifference : (result.startDifference >= 3 ? result.startDifference - 2 : 0);

    return `悪魔の機嫌遷移試算 / ${DEVIL_GAME_BUILD}

条件
- 出力形式: TSV（タブ区切り）
- 現在記録: あなた ${formatSimulationNumber(result.startWins)}勝 / 悪魔 ${formatSimulationNumber(result.startLosses)}勝
- 現在勝敗差: ${result.startDifference >= 0 ? "+" : ""}${result.startDifference}
- 現在の悪魔の機嫌: ${result.startMood.mood}（${result.startMood.id}）
- プレイヤー戦略: ${result.strategy.label}
- 契約方針: ${result.contractPolicy.label}
- 勝率推定の試行回数: 各機嫌 ${formatSimulationNumber(result.trialCount)}回
- 機嫌推移の追跡対局数: ${formatSimulationNumber(result.horizon)}戦
- base seed: ${result.baseSeed}

要約
- 平静帯へ入るために必要な純勝ち数: ${formatSimulationNumber(standardNeeded)}
- 本気帯へ入るために必要な純勝ち数: ${formatSimulationNumber(seriousNeeded)}
- ${formatSimulationNumber(result.horizon)}戦以内に平静へ初到達する確率: ${formatTransitionProbability(standardHit.hitProbability)}
- ${formatSimulationNumber(result.horizon)}戦以内に本気へ初到達する確率: ${formatTransitionProbability(seriousHit.hitProbability)}
- 本気初到達の中央値: ${formatTransitionTurn(seriousHit.medianTurn)}
- 本気初到達時の条件付き平均: ${formatTransitionTurn(seriousHit.conditionalMeanTurn)}

1局勝率推定
${rateHeader}
${formatMoodTransitionRateRows(result)}

N戦後の機嫌分布
${distributionHeader}
${formatMoodTransitionCheckpointRows(result)}

初到達確率
${hitHeader}
${formatMoodTransitionHitRows(result)}

注記
- この試算はデバッグ用の仮想遊戯です。勝敗記録、契約台帳、実績には保存されません。
- まず選択した戦略・契約方針で各機嫌の1局勝率を推定し、その勝率を使って勝敗差の遷移を動的計画法で計算しています。
- 契約方針は単発試算です。契約台帳の持ち越しは反映していません。`;
  }

  function getMoodTransitionRateLabel(result, profileId) {
    return formatTransitionProbability(result.rates?.[profileId] || 0);
  }

  function formatMoodTransitionBatchSummaryRow(result) {
    const standardHit = result.firstHits.standard;
    const seriousHit = result.firstHits.serious;
    const final = result.finalSummary || {};
    return [
      result.strategy.label,
      result.strategy.id,
      result.contractPolicy.label,
      result.contractPolicy.id,
      `${result.startWins}勝-${result.startLosses}敗`,
      result.startDifference >= 0 ? `+${result.startDifference}` : `${result.startDifference}`,
      result.startMood.mood,
      result.startMood.id,
      formatSimulationNumber(result.trialCount),
      formatSimulationNumber(result.horizon),
      getMoodTransitionRateLabel(result, "relaxed"),
      getMoodTransitionRateLabel(result, "standard"),
      getMoodTransitionRateLabel(result, "serious"),
      formatTransitionProbability(standardHit.hitProbability),
      formatTransitionTurn(standardHit.medianTurn),
      formatTransitionTurn(standardHit.conditionalMeanTurn),
      formatTransitionProbability(seriousHit.hitProbability),
      formatTransitionTurn(seriousHit.medianTurn),
      formatTransitionTurn(seriousHit.conditionalMeanTurn),
      formatTransitionProbability(final.relaxed || 0),
      formatTransitionProbability(final.standard || 0),
      formatTransitionProbability(final.serious || 0),
      Number.isFinite(final.expectedDifference) ? final.expectedDifference.toFixed(2) : "0.00",
      result.baseSeed
    ].join("\t");
  }

  function formatMoodTransitionBatchCheckpointRows(batch) {
    return batch.results.flatMap((result) => result.checkpointSummaries.map((summary) => [
      result.strategy.label,
      result.strategy.id,
      result.contractPolicy.label,
      result.contractPolicy.id,
      `${summary.turn}戦後`,
      formatTransitionProbability(summary.relaxed),
      formatTransitionProbability(summary.standard),
      formatTransitionProbability(summary.serious),
      summary.expectedDifference.toFixed(2),
      result.baseSeed
    ].join("\t"))).join("\n");
  }

  function formatMoodTransitionBatchHitRows(batch) {
    return batch.results.flatMap((result) => [DEVIL_AI_PROFILES.relaxed, DEVIL_AI_PROFILES.standard, DEVIL_AI_PROFILES.serious].map((profile) => {
      const hit = result.firstHits[profile.id];
      const checkpointValues = result.checkpoints.map((turn) => `${turn}戦以内 ${formatTransitionProbability(hit.cumulativeByTurn[turn] || 0)}`).join(" / ");
      return [
        result.strategy.label,
        result.strategy.id,
        result.contractPolicy.label,
        result.contractPolicy.id,
        profile.mood,
        profile.id,
        checkpointValues,
        formatTransitionTurn(hit.medianTurn),
        formatTransitionTurn(hit.conditionalMeanTurn),
        formatTransitionProbability(hit.hitProbability),
        result.baseSeed
      ].join("\t");
    })).join("\n");
  }

  function formatMoodTransitionBatchWinrateRows(batch) {
    return batch.results.flatMap((result) => result.sourceStats.map((stats) => [
      result.strategy.label,
      result.strategy.id,
      result.contractPolicy.label,
      result.contractPolicy.id,
      stats.profile.mood,
      stats.profile.id,
      `${getSimulationRate(stats.playerWins, stats.trialCount)}%`,
      `${getSimulationRate(stats.devilWins, stats.trialCount)}%`,
      formatSimulationNumber(stats.trialCount),
      stats.seed
    ].join("\t"))).join("\n");
  }

  function runDevilMoodTransitionBatchSimulation(options) {
    const baseSeed = String(options.seedText || `devil-mood-transition-all-${Date.now()}-${Math.random()}`);
    const trialCount = clampSimulatorTrialCount(options.trialCount);
    const horizon = clampMoodTransitionHorizon(options.horizon);
    const startWins = clampMoodTransitionCount(options.startWins, gameStats?.wins || 0);
    const startLosses = clampMoodTransitionCount(options.startLosses, gameStats?.losses || 0);
    const strategies = Object.values(SIMULATOR_PLAYER_STRATEGIES);
    const contractPolicies = Object.values(SIMULATOR_CONTRACT_POLICIES);
    const results = [];

    strategies.forEach((strategy) => {
      contractPolicies.forEach((contractPolicy) => {
        results.push(runDevilMoodTransitionSimulation({
          startWins: String(startWins),
          startLosses: String(startLosses),
          horizon,
          strategyId: strategy.id,
          contractPolicyId: contractPolicy.id,
          trialCount,
          seedText: `${baseSeed}|${strategy.id}|${contractPolicy.id}`
        }));
      });
    });

    return {
      baseSeed,
      trialCount,
      horizon,
      startWins,
      startLosses,
      startDifference: startWins - startLosses,
      startMood: getMoodProfileByDifference(startWins - startLosses),
      strategyCount: strategies.length,
      contractPolicyCount: contractPolicies.length,
      results
    };
  }

  function formatMoodTransitionBatchReport(batch) {
    const summaryHeader = [
      "プレイヤー戦略",
      "strategyId",
      "契約方針",
      "contractPolicyId",
      "現在記録",
      "現在勝敗差",
      "現在の機嫌",
      "currentProfileId",
      "勝率推定の試行回数",
      "機嫌推移の追跡対局数",
      "余裕時あなた勝率",
      "平静時あなた勝率",
      "本気時あなた勝率",
      "平静初到達率",
      "平静到達中央値",
      "平静到達時の条件付き平均",
      "本気初到達率",
      "本気到達中央値",
      "本気到達時の条件付き平均",
      "最終余裕確率",
      "最終平静確率",
      "最終本気確率",
      "最終期待勝敗差",
      "seed"
    ].join("\t");
    const winrateHeader = ["プレイヤー戦略", "strategyId", "契約方針", "contractPolicyId", "悪魔の機嫌", "profileId", "推定あなた勝率", "推定悪魔勝率", "推定試行回数", "seed"].join("\t");
    const distributionHeader = ["プレイヤー戦略", "strategyId", "契約方針", "contractPolicyId", "時点", "余裕確率", "平静確率", "本気確率", "期待勝敗差", "seed"].join("\t");
    const hitHeader = ["プレイヤー戦略", "strategyId", "契約方針", "contractPolicyId", "到達対象", "profileId", "累積到達確率", "到達中央値", "到達時の条件付き平均", "追跡期間内の到達確率", "seed"].join("\t");
    const totalWinrateTrials = batch.results.length * 3 * batch.trialCount;

    return `悪魔の機嫌遷移一括試算 / ${DEVIL_GAME_BUILD}

条件
- 出力形式: TSV（タブ区切り）
- 現在記録: あなた ${formatSimulationNumber(batch.startWins)}勝 / 悪魔 ${formatSimulationNumber(batch.startLosses)}勝
- 現在勝敗差: ${batch.startDifference >= 0 ? "+" : ""}${batch.startDifference}
- 現在の悪魔の機嫌: ${batch.startMood.mood}（${batch.startMood.id}）
- 組み合わせ: プレイヤー戦略 ${batch.strategyCount}種 × 契約方針 ${batch.contractPolicyCount}種 = ${batch.results.length}条件
- 勝率推定の試行回数: 各条件・各機嫌 ${formatSimulationNumber(batch.trialCount)}回
- 勝率推定の総試行回数: ${formatSimulationNumber(totalWinrateTrials)}回
- 機嫌推移の追跡対局数: ${formatSimulationNumber(batch.horizon)}戦
- base seed: ${batch.baseSeed}

要約
${summaryHeader}
${batch.results.map(formatMoodTransitionBatchSummaryRow).join("\n")}

1局勝率推定
${winrateHeader}
${formatMoodTransitionBatchWinrateRows(batch)}

N戦後の機嫌分布
${distributionHeader}
${formatMoodTransitionBatchCheckpointRows(batch)}

初到達確率
${hitHeader}
${formatMoodTransitionBatchHitRows(batch)}

注記
- この試算はデバッグ用の仮想遊戯です。勝敗記録、契約台帳、実績には保存されません。
- 各プレイヤー戦略・契約方針について、まず3機嫌それぞれの1局勝率を推定し、その勝率を使って勝敗差の遷移を動的計画法で計算しています。
- 契約方針は単発試算です。契約台帳の持ち越しは反映していません。`;
  }



  function getInitialLedgerContractIds(options = {}) {
    const source = Array.isArray(options.initialContractedCardIds)
      ? options.initialContractedCardIds
      : getContractedCardIds();
    return Array.from(new Set(source.filter(Boolean)));
  }

  function createLedgerLongRunEmptyTally({ strategy, contractPolicy, trialCount, horizon, startWins, startLosses, initialContractedCardIds, baseSeed }) {
    return {
      strategy,
      contractPolicy,
      trialCount,
      horizon,
      startWins,
      startLosses,
      startDifference: startWins - startLosses,
      startMood: getMoodProfileByDifference(startWins - startLosses),
      initialContractedCardIds,
      initialContractCount: initialContractedCardIds.length,
      baseSeed,
      totalGames: 0,
      playerWins: 0,
      devilWins: 0,
      contractOffered: 0,
      contractAccepted: 0,
      contractRejected: 0,
      markedBustLosses: 0,
      contractWins: 0,
      contractLosses: 0,
      finalWinsSum: 0,
      finalLossesSum: 0,
      finalDifferenceSum: 0,
      finalContractCountSum: 0,
      addedContractCountSum: 0,
      finalMoodCounts: { relaxed: 0, standard: 0, serious: 0 },
      standardHitCount: 0,
      seriousHitCount: 0,
      standardHitTurnSum: 0,
      seriousHitTurnSum: 0,
      standardHitTurns: [],
      seriousHitTurns: [],
      checkpointSummaries: new Map()
    };
  }

  function createLedgerLongRunCheckpointAccumulator() {
    return {
      relaxed: 0,
      standard: 0,
      serious: 0,
      winsSum: 0,
      lossesSum: 0,
      differenceSum: 0,
      contractCountSum: 0,
      addedContractCountSum: 0
    };
  }

  function addLedgerLongRunCheckpoint(tally, turn, wins, losses, ledgerSize) {
    const moodId = getMoodIdFromDifference(wins - losses);
    if (!tally.checkpointSummaries.has(turn)) {
      tally.checkpointSummaries.set(turn, createLedgerLongRunCheckpointAccumulator());
    }
    const summary = tally.checkpointSummaries.get(turn);
    summary[moodId] += 1;
    summary.winsSum += wins;
    summary.lossesSum += losses;
    summary.differenceSum += wins - losses;
    summary.contractCountSum += ledgerSize;
    summary.addedContractCountSum += Math.max(0, ledgerSize - tally.initialContractCount);
  }

  function getMedianNumericValue(values) {
    if (!values.length) return null;
    const sorted = values.slice().sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    if (sorted.length % 2) return sorted[middle];
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  function runDevilLedgerLongRunSimulation(options) {
    const cards = getMajorArcanaCards();
    if (cards.length < 22) {
      throw new Error("大アルカナのカードデータが22枚読めないため、契約台帳込みシミュレーターを実行できません。");
    }

    const strategy = SIMULATOR_PLAYER_STRATEGIES[options.strategyId] || SIMULATOR_PLAYER_STRATEGIES.stand57;
    const contractPolicy = SIMULATOR_CONTRACT_POLICIES[options.contractPolicyId] || SIMULATOR_CONTRACT_POLICIES.none;
    const trialCount = clampSimulatorTrialCount(options.trialCount);
    const horizon = clampMoodTransitionHorizon(options.horizon);
    const startWins = clampMoodTransitionCount(options.startWins, gameStats?.wins || 0);
    const startLosses = clampMoodTransitionCount(options.startLosses, gameStats?.losses || 0);
    const initialContractedCardIds = getInitialLedgerContractIds(options);
    const baseSeed = String(options.seedText || `devil-ledger-longrun-${Date.now()}-${Math.random()}`);
    const { random } = createSimulatorRandom(baseSeed);
    const checkpoints = getTransitionCheckpoints(horizon);
    const tally = createLedgerLongRunEmptyTally({ strategy, contractPolicy, trialCount, horizon, startWins, startLosses, initialContractedCardIds, baseSeed });

    for (let runIndex = 0; runIndex < trialCount; runIndex += 1) {
      let wins = startWins;
      let losses = startLosses;
      const ledger = new Set(initialContractedCardIds);
      let standardHitTurn = isDifferenceInMood(wins - losses, "standard") ? 0 : null;
      let seriousHitTurn = isDifferenceInMood(wins - losses, "serious") ? 0 : null;
      const checkpointSet = new Set(checkpoints);

      for (let turn = 1; turn <= horizon; turn += 1) {
        const profile = getMoodProfileByDifference(wins - losses);
        const simulation = simulateSingleDevilGame({
          cards,
          profile,
          strategy,
          contractPolicyId: contractPolicy.id,
          random,
          contractedCardIds: ledger
        });

        tally.totalGames += 1;
        if (simulation.state.winner === "player") {
          wins += 1;
          tally.playerWins += 1;
        } else {
          losses += 1;
          tally.devilWins += 1;
        }

        if (simulation.contractOffered) tally.contractOffered += 1;
        if (simulation.contractAccepted) {
          tally.contractAccepted += 1;
          if (simulation.contractCardId) ledger.add(simulation.contractCardId);
          if (simulation.state.winner === "player") tally.contractWins += 1;
          if (simulation.state.winner === "devil") tally.contractLosses += 1;
        }
        if (simulation.contractRejected) tally.contractRejected += 1;
        if (simulation.markedCardBust) tally.markedBustLosses += 1;

        const difference = wins - losses;
        if (standardHitTurn === null && isDifferenceInMood(difference, "standard")) standardHitTurn = turn;
        if (seriousHitTurn === null && isDifferenceInMood(difference, "serious")) seriousHitTurn = turn;
        if (checkpointSet.has(turn)) addLedgerLongRunCheckpoint(tally, turn, wins, losses, ledger.size);
      }

      const finalDifference = wins - losses;
      const finalMoodId = getMoodIdFromDifference(finalDifference);
      tally.finalMoodCounts[finalMoodId] += 1;
      tally.finalWinsSum += wins;
      tally.finalLossesSum += losses;
      tally.finalDifferenceSum += finalDifference;
      tally.finalContractCountSum += ledger.size;
      tally.addedContractCountSum += Math.max(0, ledger.size - tally.initialContractCount);

      if (standardHitTurn !== null) {
        tally.standardHitCount += 1;
        tally.standardHitTurnSum += standardHitTurn;
        tally.standardHitTurns.push(standardHitTurn);
      }
      if (seriousHitTurn !== null) {
        tally.seriousHitCount += 1;
        tally.seriousHitTurnSum += seriousHitTurn;
        tally.seriousHitTurns.push(seriousHitTurn);
      }
    }

    return tally;
  }

  function getLedgerLongRunHitSummary(tally, moodId) {
    const hitCount = moodId === "serious" ? tally.seriousHitCount : tally.standardHitCount;
    const turnSum = moodId === "serious" ? tally.seriousHitTurnSum : tally.standardHitTurnSum;
    const turns = moodId === "serious" ? tally.seriousHitTurns : tally.standardHitTurns;
    return {
      hitCount,
      hitRate: tally.trialCount ? hitCount / tally.trialCount : 0,
      meanTurn: hitCount ? turnSum / hitCount : null,
      medianTurn: getMedianNumericValue(turns)
    };
  }

  function formatLedgerLongRunSummaryRow(result) {
    const standardHit = getLedgerLongRunHitSummary(result, "standard");
    const seriousHit = getLedgerLongRunHitSummary(result, "serious");
    const totalGames = result.totalGames || 0;
    const finalRuns = result.trialCount || 1;
    return [
      result.strategy.label,
      result.strategy.id,
      result.contractPolicy.label,
      result.contractPolicy.id,
      `${result.startWins}勝-${result.startLosses}敗`,
      result.startDifference >= 0 ? `+${result.startDifference}` : `${result.startDifference}`,
      result.startMood.mood,
      result.startMood.id,
      formatSimulationNumber(result.trialCount),
      formatSimulationNumber(result.horizon),
      formatSimulationNumber(totalGames),
      formatSimulationNumber(result.initialContractCount),
      `${getSimulationRate(result.playerWins, totalGames)}%`,
      `${getSimulationRate(result.devilWins, totalGames)}%`,
      formatSimulationPercent(result.contractOffered, totalGames),
      formatSimulationPercent(result.contractAccepted, totalGames),
      formatSimulationPercent(result.contractRejected, totalGames),
      formatSimulationPercent(result.markedBustLosses, totalGames),
      formatSimulationPercent(result.contractWins, Math.max(1, result.contractAccepted)),
      formatSimulationPercent(result.contractLosses, Math.max(1, result.contractAccepted)),
      formatTransitionProbability(standardHit.hitRate),
      formatTransitionTurn(standardHit.medianTurn),
      formatTransitionTurn(standardHit.meanTurn),
      formatTransitionProbability(seriousHit.hitRate),
      formatTransitionTurn(seriousHit.medianTurn),
      formatTransitionTurn(seriousHit.meanTurn),
      formatTransitionProbability(result.finalMoodCounts.relaxed / finalRuns),
      formatTransitionProbability(result.finalMoodCounts.standard / finalRuns),
      formatTransitionProbability(result.finalMoodCounts.serious / finalRuns),
      (result.finalDifferenceSum / finalRuns).toFixed(2),
      (result.finalContractCountSum / finalRuns).toFixed(2),
      (result.addedContractCountSum / finalRuns).toFixed(2),
      result.baseSeed
    ].join("\t");
  }

  function formatLedgerLongRunCheckpointRows(results) {
    return results.flatMap((result) => {
      const denominator = result.trialCount || 1;
      return Array.from(result.checkpointSummaries.entries()).sort((a, b) => a[0] - b[0]).map(([turn, summary]) => [
        result.strategy.label,
        result.strategy.id,
        result.contractPolicy.label,
        result.contractPolicy.id,
        `${turn}戦後`,
        formatTransitionProbability(summary.relaxed / denominator),
        formatTransitionProbability(summary.standard / denominator),
        formatTransitionProbability(summary.serious / denominator),
        (summary.differenceSum / denominator).toFixed(2),
        (summary.contractCountSum / denominator).toFixed(2),
        (summary.addedContractCountSum / denominator).toFixed(2),
        result.baseSeed
      ].join("\t"));
    }).join("\n");
  }


  function getLedgerLongRunMilestones(horizon) {
    const preferred = [50, 100, 500];
    const milestones = preferred.filter((turn) => turn <= horizon);
    if (!milestones.includes(horizon)) milestones.push(horizon);
    return Array.from(new Set(milestones)).sort((a, b) => a - b);
  }

  function getLedgerLongRunCumulativeHitRate(turns, turn, denominator) {
    if (!denominator || !turns || !turns.length) return 0;
    let count = 0;
    turns.forEach((hitTurn) => {
      if (hitTurn <= turn) count += 1;
    });
    return count / denominator;
  }

  function formatLedgerLongRunMilestoneSummaryRows(results, horizon) {
    const milestones = getLedgerLongRunMilestones(horizon);
    return results.flatMap((result) => {
      const denominator = result.trialCount || 1;
      return milestones.map((turn) => {
        const summary = result.checkpointSummaries.get(turn);
        if (!summary) {
          return [
            result.strategy.label,
            result.strategy.id,
            result.contractPolicy.label,
            result.contractPolicy.id,
            `${turn}戦後`,
            "未集計",
            "未集計",
            "未集計",
            "未集計",
            "未集計",
            "未集計",
            "未集計",
            "未集計",
            "未集計",
            "未集計",
            result.baseSeed
          ].join("\t");
        }
        const addedWins = summary.winsSum - (result.startWins * denominator);
        const addedLosses = summary.lossesSum - (result.startLosses * denominator);
        const simulatedGames = Math.max(1, addedWins + addedLosses);
        return [
          result.strategy.label,
          result.strategy.id,
          result.contractPolicy.label,
          result.contractPolicy.id,
          `${turn}戦後`,
          `${getSimulationRate(addedWins, simulatedGames)}%`,
          `${getSimulationRate(addedLosses, simulatedGames)}%`,
          formatTransitionProbability(summary.relaxed / denominator),
          formatTransitionProbability(summary.standard / denominator),
          formatTransitionProbability(summary.serious / denominator),
          (summary.differenceSum / denominator).toFixed(2),
          (summary.contractCountSum / denominator).toFixed(2),
          (summary.addedContractCountSum / denominator).toFixed(2),
          formatTransitionProbability(getLedgerLongRunCumulativeHitRate(result.standardHitTurns, turn, denominator)),
          formatTransitionProbability(getLedgerLongRunCumulativeHitRate(result.seriousHitTurns, turn, denominator)),
          result.baseSeed
        ].join("\t");
      });
    }).join("\n");
  }

  function runDevilLedgerLongRunBatchSimulation(options) {
    const baseSeed = String(options.seedText || `devil-ledger-longrun-all-${Date.now()}-${Math.random()}`);
    const startWins = clampMoodTransitionCount(options.startWins, gameStats?.wins || 0);
    const startLosses = clampMoodTransitionCount(options.startLosses, gameStats?.losses || 0);
    const initialContractedCardIds = getInitialLedgerContractIds(options);
    const strategies = Object.values(SIMULATOR_PLAYER_STRATEGIES);
    const contractPolicies = Object.values(SIMULATOR_CONTRACT_POLICIES);
    const effectiveSettings = getLedgerLongRunEffectiveSettings(options, strategies.length * contractPolicies.length);
    const trialCount = effectiveSettings.trialCount;
    const horizon = effectiveSettings.horizon;
    const results = [];

    strategies.forEach((strategy) => {
      contractPolicies.forEach((contractPolicy) => {
        results.push(runDevilLedgerLongRunSimulation({
          startWins: String(startWins),
          startLosses: String(startLosses),
          horizon,
          strategyId: strategy.id,
          contractPolicyId: contractPolicy.id,
          trialCount,
          initialContractedCardIds,
          seedText: `${baseSeed}|${strategy.id}|${contractPolicy.id}`
        }));
      });
    });

    return {
      baseSeed,
      requestedTrialCount: effectiveSettings.requestedTrialCount,
      trialCount,
      horizon,
      maxTotalGames: effectiveSettings.maxTotalGames,
      requestedTotalGames: effectiveSettings.requestedTotalGames,
      effectiveTotalGames: effectiveSettings.effectiveTotalGames,
      wasAutoCapped: effectiveSettings.wasAutoCapped,
      startWins,
      startLosses,
      startDifference: startWins - startLosses,
      startMood: getMoodProfileByDifference(startWins - startLosses),
      initialContractedCardIds,
      initialContractCount: initialContractedCardIds.length,
      strategyCount: strategies.length,
      contractPolicyCount: contractPolicies.length,
      results
    };
  }

  function formatLedgerLongRunBatchReport(batch) {
    const summaryHeader = [
      "プレイヤー戦略",
      "strategyId",
      "契約方針",
      "contractPolicyId",
      "現在記録",
      "現在勝敗差",
      "現在の機嫌",
      "currentProfileId",
      "長期シミュレーション周回数",
      "1周あたり追跡対局数",
      "総仮想対局数",
      "初期契約枚数",
      "長期あなた勝率",
      "長期悪魔勝率",
      "契約提示率",
      "契約受諾率",
      "契約拒否率",
      "印付き札バースト敗北率",
      "契約後勝率",
      "契約後敗北率",
      "平静初到達率",
      "平静到達中央値",
      "平静到達時の条件付き平均",
      "本気初到達率",
      "本気到達中央値",
      "本気到達時の条件付き平均",
      "最終余裕確率",
      "最終平静確率",
      "最終本気確率",
      "最終平均勝敗差",
      "最終平均契約枚数",
      "平均追加契約枚数",
      "seed"
    ].join("\t");
    const milestoneSummaryHeader = ["プレイヤー戦略", "strategyId", "契約方針", "contractPolicyId", "時点", "区間あなた勝率", "区間悪魔勝率", "余裕確率", "平静確率", "本気確率", "平均勝敗差", "平均契約枚数", "平均追加契約枚数", "平静累積初到達率", "本気累積初到達率", "seed"].join("\t");
    const checkpointHeader = ["プレイヤー戦略", "strategyId", "契約方針", "contractPolicyId", "時点", "余裕確率", "平静確率", "本気確率", "平均勝敗差", "平均契約枚数", "平均追加契約枚数", "seed"].join("\t");
    const totalRuns = batch.results.length * batch.trialCount;
    const totalGames = totalRuns * batch.horizon;

    return `契約台帳込み・悪魔の機嫌遷移一括試算 / ${DEVIL_GAME_BUILD}

条件
- 出力形式: TSV（タブ区切り）
- 現在記録: あなた ${formatSimulationNumber(batch.startWins)}勝 / 悪魔 ${formatSimulationNumber(batch.startLosses)}勝
- 現在勝敗差: ${batch.startDifference >= 0 ? "+" : ""}${batch.startDifference}
- 現在の悪魔の機嫌: ${batch.startMood.mood}（${batch.startMood.id}）
- 現在の契約枚数: ${formatSimulationNumber(batch.initialContractCount)}枚
- 組み合わせ: プレイヤー戦略 ${batch.strategyCount}種 × 契約方針 ${batch.contractPolicyCount}種 = ${batch.results.length}条件
- 長期シミュレーション周回数: 各条件 ${formatSimulationNumber(batch.trialCount)}周${batch.wasAutoCapped ? `（入力値 ${formatSimulationNumber(batch.requestedTrialCount)}周から自動補正）` : ""}
- 1周あたり追跡対局数: ${formatSimulationNumber(batch.horizon)}戦
- 総周回数: ${formatSimulationNumber(totalRuns)}周
- 総仮想対局数: ${formatSimulationNumber(totalGames)}戦
- 契約台帳込み試算の総仮想対局数上限: ${formatSimulationNumber(batch.maxTotalGames)}戦${batch.wasAutoCapped ? `
- 自動補正理由: 入力条件のままだと総仮想対局数 ${formatSimulationNumber(batch.requestedTotalGames)}戦となり、上限を超えるため。` : ""}
- base seed: ${batch.baseSeed}

要約
${summaryHeader}
${batch.results.map(formatLedgerLongRunSummaryRow).join("\n")}

50戦後・100戦後・500戦後の要約
${milestoneSummaryHeader}
${formatLedgerLongRunMilestoneSummaryRows(batch.results, batch.horizon)}

N戦後の機嫌分布・契約台帳
${checkpointHeader}
${formatLedgerLongRunCheckpointRows(batch.results)}

注記
- この試算はデバッグ用の仮想遊戯です。勝敗記録、契約台帳、実績には保存されません。
- 「50戦後・100戦後・500戦後の要約」は、短期・中期・長期の体感を同じ出力内で比較するための集約です。追跡対局数が500戦未満の場合は、指定された最終戦数も併記します。
- 各周回は、保存済みの現在記録と現在の契約台帳を初期状態として複製し、${formatSimulationNumber(batch.horizon)}戦ぶん実際に勝敗差と契約済みカードを更新しながら進めます。
- すでに契約済みのカードでバーストした場合、その勝負では再契約できず、印付き札バースト敗北として数えます。
- これは単発勝率の上限値ではなく、契約台帳の枯渇・重複・長期持ち越しを含む実プレイ寄りの試算です。`;
  }

  function getAchievementProbabilityLabel(rate) {
    if (!Number.isFinite(rate) || rate <= 0) return "未検出";
    if (rate >= 0.05) return "通常";
    if (rate >= 0.01) return "ややレア";
    if (rate >= 0.001) return "レア";
    if (rate >= 0.0001) return "超レア";
    return "極低確率";
  }

  function getAchievementExpectedTrials(rate) {
    if (!Number.isFinite(rate) || rate <= 0) return "—";
    return formatSimulationNumber(Math.ceil(1 / rate));
  }

  function formatAchievementProbability(rate, attempts) {
    if (!Number.isFinite(rate) || rate <= 0) return "0.00%";
    return `${((1 - Math.pow(1 - rate, attempts)) * 100).toFixed(2)}%`;
  }

  function formatAchievementRateFromCount(count, denominator) {
    if (!denominator) return "0.0000%";
    return `${((count / denominator) * 100).toFixed(4)}%`;
  }

  function formatAchievementRate(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return "0.00%";
    return `${(Math.max(0, Math.min(1, numeric)) * 100).toFixed(2)}%`;
  }

  function describeAchievementCondition(condition) {
    if (!condition) return "—";
    return `${condition.profile.mood}/${condition.strategy.label}/${condition.contractPolicy.label}`;
  }

  function buildSimulationAchievementTags(simulation) {
    const { state } = simulation;
    const tags = new Set();
    const playerWon = state.winner === "player";
    const devilWon = state.winner === "devil";
    const playerBust = Boolean(simulation.playerBust);
    const devilBust = Boolean(simulation.devilBust);
    const tied = !playerBust && !devilBust && state.playerTotal === state.devilTotal;
    const riskDrawCount = Number(state.devilRiskDrawCount) || 0;
    const reasons = new Set(state.simulatorReasons || []);
    const profileId = simulation.profileId || "standard";
    const margin = state.playerTotal - state.devilTotal;

    tags.add("game_completed");
    if (simulation.playerStoppedByStrategy) tags.add("player_stood");
    if (playerWon) tags.add("player_win");
    if (devilWon) tags.add("devil_win");
    if (playerWon && !state.contractUsed) tags.add("clean_win");
    if (devilWon && !state.contractUsed) tags.add("clean_loss");
    if (playerBust && devilWon) tags.add("player_bust_loss");
    if (devilBust && playerWon) tags.add("devil_bust_win");
    if (tied && devilWon) tags.add("tie_loss");
    if (tied && isTargetScore(state.playerTotal) && devilWon) tags.add("target_tie_loss");
    if (tied && state.playerTotal <= LOW_EFFORT_TIE_MAX && devilWon) tags.add("low_effort_tie_loss");
    if (state.simulatorExtraDrawAfterTargetUsed) tags.add("target_overdraw_attempt");
    if (simulation.perfectBustLoss) tags.add("perfect_bust_loss");
    if (simulation.contractOffered) tags.add("contract_offered");
    if (simulation.contractAccepted) tags.add("contract_accepted");
    if (simulation.contractRejected) tags.add("contract_rejected");
    if (state.contractUsed && playerWon) tags.add("contract_win");
    if (state.contractUsed && devilWon) tags.add("contract_loss");
    if (state.contractUsed && playerWon && Number(simulation.contractReflectedTotal) >= 60) tags.add("contract_reflected_60_win");
    if (state.contractUsed && devilWon && Number(simulation.contractReflectedTotal) < 55) tags.add("contract_reflected_under_55_loss");
    const contractCardNumber = Number(simulation.contractCardNumber);
    const hasAcceptedContractCard = Boolean(simulation.contractAccepted) && Number.isFinite(contractCardNumber);
    if (hasAcceptedContractCard && contractCardNumber === 0) tags.add("contract_card_fool");
    if (hasAcceptedContractCard && contractCardNumber === 15) tags.add("contract_card_devil");
    if (hasAcceptedContractCard && contractCardNumber >= 16 && contractCardNumber <= 21) tags.add("contract_card_high_arcana");
    if (hasAcceptedContractCard && contractCardNumber === 21) tags.add("contract_card_world");
    if (state.devilSurrendered && playerWon) tags.add("devil_surrender_win");
    if (playerWon && isTargetScore(state.playerTotal)) tags.add("player_exact66_win");
    if (playerWon && isTargetScore(state.playerTotal) && profileId === "serious") tags.add("serious_exact66_win");
    if (playerWon && state.playerTotal === 65) tags.add("player65_win");
    if (playerWon && state.playerTotal === 64) tags.add("player64_win");
    if (playerWon && state.playerTotal >= 55 && state.playerTotal <= 57) tags.add("player55_57_win");
    if (playerWon && state.playerTotal <= 57) tags.add("player57_or_less_win");
    if (playerWon && Number(state.simulatorLastPlayerDrawnCardNumber) === 0) tags.add("last_draw_fool_win");
    if (playerWon && !playerBust && !devilBust && margin === 1) tags.add("narrow_win");
    if (devilWon && !playerBust && !devilBust && margin === -1) tags.add("narrow_loss");
    if (devilWon && simulation.playerStoppedByStrategy && !playerBust && state.playerTotal <= 35) tags.add("very_low_stand_loss");
    if (devilWon && simulation.playerStoppedByStrategy && !playerBust && state.playerTotal >= 36 && state.playerTotal <= 49) tags.add("low_stand_loss");
    if (devilWon && simulation.playerStoppedByStrategy && !playerBust && state.playerTotal >= 50 && state.playerTotal <= 56) tags.add("middle_stand_loss");
    if (devilWon && simulation.playerStoppedByStrategy && !playerBust && state.playerTotal >= 57 && state.playerTotal <= 62) tags.add("near_stand_loss");
    if (devilWon && simulation.playerStoppedByStrategy && !playerBust && state.playerTotal >= 63 && state.playerTotal <= 65) tags.add("very_near_stand_loss");
    if (devilWon && simulation.playerStoppedByStrategy && !playerBust && state.playerTotal >= 63) tags.add("stand_high_loss");
    if (devilWon && playerBust && Number(state.playerTotalBeforeBust) >= 65) tags.add("bust_after_65_plus");
    if (profileId === "relaxed" && playerWon) tags.add("relaxed_win");
    if (profileId === "relaxed" && playerWon && !state.contractUsed) tags.add("relaxed_clean_win");
    // 実プレイでは「悪魔が5勝以上勝ち越して余裕になっている状態」を追加条件にする。
    // シミュレーターでは profileId === "relaxed" をその勝敗差条件の代替として扱う。
    if (profileId === "relaxed" && playerWon && !state.contractUsed) tags.add("relaxed_deficit_clean_win");
    if (profileId === "standard" && playerWon) tags.add("standard_win");
    if (profileId === "serious" && playerWon) tags.add("serious_win");
    if (profileId === "relaxed") tags.add("mood_relaxed_seen");
    if (profileId === "standard") tags.add("mood_standard_seen");
    if (profileId === "serious") tags.add("mood_serious_seen");
    if (riskDrawCount > 0) tags.add("mood_risk_draw");
    if (riskDrawCount >= 2) tags.add("mood_risk_draw_twice");
    if (riskDrawCount > 0 && devilBust && playerWon) tags.add("mood_risk_bust_win");
    if (profileId === "relaxed" && riskDrawCount > 0 && devilBust && playerWon) tags.add("relaxed_risk_bust_win");
    if (profileId === "standard" && riskDrawCount > 0 && playerWon) tags.add("standard_risk_win");
    if (reasons.has("low_effort_tie_punish")) tags.add("low_effort_tie_punish");
    if (reasons.has("low_effort_tie_punish") && devilWon) tags.add("low_effort_tie_punished_loss");
    if (reasons.has("low_effort_tie_no_safe_draw")) tags.add("low_effort_tie_no_safe_draw");
    if (reasons.has("forced_surrender")) tags.add("forced_surrender");

    return tags;
  }

  function buildCurrentGameAchievementTags() {
    const simulation = {
      state: gameState,
      profileId: gameState.aiProfileId || "standard",
      playerBust: isBust(gameState.playerTotal, gameState.target),
      devilBust: isBust(gameState.devilTotal, gameState.target),
      perfectBustLoss: gameState.resultType === "loss-perfect-bust" || Boolean(gameState.bustedAfterPerfect66 && gameState.winner === "devil"),
      contractOffered: Boolean(gameState.contractOffered),
      contractAccepted: Boolean(gameState.contractAccepted || gameState.contractUsed),
      contractRejected: Boolean(gameState.contractRejected || gameState.resultType === "loss-reject"),
      contractReflectedTotal: gameState.contractReflectedTotal,
      contractCardNumber: gameState.contractCardNumber,
      playerStoppedByStrategy: Boolean(gameState.playerStood)
    };
    const tags = buildSimulationAchievementTags(simulation);
    if (gameState.markedCardBust || gameState.resultType === "loss-marked") tags.add("marked_card_bust");
    return tags;
  }

  function getScoreBucket(total) {
    if (isBust(total)) return "player_bust";
    if (total <= 35) return "player_35_or_less";
    if (total <= 49) return "player_36_49";
    if (total <= 56) return "player_50_56";
    if (total <= 62) return "player_57_62";
    if (total <= 65) return "player_63_65";
    if (isTargetScore(total)) return "player_66";
    return "player_other";
  }

  function createGameResultContext(tags) {
    const tagList = Array.from(tags || []);
    const mood = gameState.aiProfileId || "standard";
    const moodAfter = getDevilMoodProfile(gameStats).id;
    return {
      id: `devil-game-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      playedAt: nowIsoString(),
      build: DEVIL_GAME_BUILD,
      winner: gameState.winner,
      resultType: gameState.resultType || "unknown",
      playerTotal: gameState.playerTotal,
      devilTotal: gameState.devilTotal,
      mood,
      moodAfter,
      contractUsed: Boolean(gameState.contractUsed),
      contractOffered: Boolean(gameState.contractOffered),
      contractAccepted: Boolean(gameState.contractAccepted || gameState.contractUsed),
      contractRejected: Boolean(gameState.contractRejected),
      contractedCardId: gameState.contractedCardThisGame?.id || null,
      contractedCardNumber: Number.isFinite(Number(gameState.contractCardNumber)) ? Number(gameState.contractCardNumber) : null,
      currentContractCount: getContractedCardIds().length,
      devilRiskDrawCount: Number(gameState.devilRiskDrawCount) || 0,
      devilSurrendered: Boolean(gameState.devilSurrendered),
      decisionReasons: Array.isArray(gameState.devilDecisionReasons) ? gameState.devilDecisionReasons.slice() : [],
      tags: tagList,
      unlockedAchievements: []
    };
  }

  function updateDevilRecordsWithResult(context) {
    let records = loadDevilRecords();
    const current = records.current;
    current.games += 1;
    if (context.winner === "player") {
      current.playerWins += 1;
      current.currentPlayerStreak += 1;
      current.currentDevilStreak = 0;
    } else if (context.winner === "devil") {
      current.devilWins += 1;
      current.currentDevilStreak += 1;
      current.currentPlayerStreak = 0;
    }
    current.bestPlayerStreak = Math.max(current.bestPlayerStreak, current.currentPlayerStreak);
    current.bestDevilStreak = Math.max(current.bestDevilStreak, current.currentDevilStreak);
    current.playerTotalSum += Number(context.playerTotal) || 0;
    current.devilTotalSum += Number(context.devilTotal) || 0;
    incrementObjectCounter(current.resultTypes, context.resultType || "unknown");
    incrementObjectCounter(current.scoreBuckets, getScoreBucket(Number(context.playerTotal) || 0));

    if (context.contractOffered) current.contracts.offered += 1;
    if (context.contractAccepted) current.contracts.accepted += 1;
    if (context.contractRejected) current.contracts.rejected += 1;
    if (context.tags.includes("contract_win")) current.contracts.contractWins += 1;
    if (context.tags.includes("contract_loss")) current.contracts.contractLosses += 1;
    current.contracts.currentContractCountMax = Math.max(current.contracts.currentContractCountMax, Number(context.currentContractCount) || 0);

    const moodRecord = current.moods[context.mood] || current.moods.standard;
    moodRecord.games += 1;
    if (context.winner === "player") moodRecord.playerWins += 1;
    if (context.winner === "devil") moodRecord.devilWins += 1;

    if ((Number(context.devilRiskDrawCount) || 0) > 0) current.ai.moodRiskDrawGames += 1;
    current.ai.moodRiskDrawTotal += Number(context.devilRiskDrawCount) || 0;
    if (context.tags.includes("relaxed_risk_bust_win") || context.tags.includes("mood_risk_bust_win")) current.ai.moodRiskBustWins += 1;
    if (context.tags.includes("devil_surrender_win")) current.ai.devilSurrenders += 1;
    if (context.tags.includes("low_effort_tie_punished_loss")) current.ai.lowEffortTiePunishes += 1;
    if (context.tags.includes("low_effort_tie_no_safe_draw")) current.ai.lowEffortTieNoSafeDraws += 1;

    ["player_bust_loss", "tie_loss", "target_tie_loss", "low_effort_tie_loss", "contract_loss", "marked_card_bust"].forEach((tag) => {
      if (context.tags.includes(tag)) incrementObjectCounter(current.lossTypes, tag);
    });
    ["player_win", "clean_win", "contract_win", "devil_bust_win", "devil_surrender_win"].forEach((tag) => {
      if (context.tags.includes(tag)) incrementObjectCounter(current.winTypes, tag);
    });

    records.recentResults.unshift({
      id: context.id,
      playedAt: context.playedAt,
      winner: context.winner,
      resultType: context.resultType,
      playerTotal: context.playerTotal,
      devilTotal: context.devilTotal,
      mood: context.mood,
      contractUsed: context.contractUsed,
      tags: context.tags.slice(0, 12)
    });
    records.recentResults = records.recentResults.slice(0, RECENT_RESULTS_LIMIT);
    saveDevilRecords(records);
  }

  function updateDevilAchievementsWithResult(context) {
    let achievements = loadDevilAchievements();
    achievements.counters.totalGames += 1;
    if (context.winner === "player") achievements.counters.totalPlayerWins += 1;
    if (context.winner === "devil") achievements.counters.totalDevilWins += 1;
    if (context.tags.includes("clean_win")) {
      achievements.counters.cleanWins += 1;
      achievements.counters.contractlessWins += 1;
    }
    achievements.flags.seenMoods[context.mood] = true;

    context.tags.forEach((tag) => {
      incrementObjectCounter(achievements.counters.eventTags, tag);
      const candidates = ACHIEVEMENT_CANDIDATES.filter((candidate) => candidate.tag === tag && !candidate.kind);
      candidates.forEach((candidate) => unlockDevilAchievement(achievements, candidate.id, context));
    });

    if (context.contractedCardId) {
      if (!achievements.flags.contractedCardIdsEver.includes(context.contractedCardId)) {
        achievements.flags.contractedCardIdsEver.push(context.contractedCardId);
      }
    }
    achievements.flags.maxSimultaneousContracts = Math.max(achievements.flags.maxSimultaneousContracts, Number(context.currentContractCount) || 0);

    if (context.tags.includes("player_bust_loss")) achievements.flags.lossTypes.playerBust = true;
    if (context.tags.includes("tie_loss")) achievements.flags.lossTypes.tieLoss = true;
    if (context.tags.includes("target_tie_loss")) achievements.flags.lossTypes.targetTieLoss = true;
    if (context.tags.includes("low_effort_tie_loss")) achievements.flags.lossTypes.lowEffortTieLoss = true;
    if (context.tags.includes("contract_loss")) achievements.flags.lossTypes.contractLoss = true;
    if (context.tags.includes("marked_card_bust")) {
      achievements.flags.lossTypes.markedCardBust = true;
      unlockDevilAchievement(achievements, "a048", context);
    }

    updateDevilAchievementProgress(achievements, context);
    saveDevilAchievements(achievements);
    return Array.isArray(context.unlockedAchievements) ? context.unlockedAchievements.slice() : [];
  }

  function updateDevilRecordsAndAchievements(tags) {
    const context = createGameResultContext(tags);
    updateDevilRecordsWithResult(context);
    return updateDevilAchievementsWithResult(context);
  }

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

  function getAchievementCandidatesByTag() {
    const map = new Map();
    ACHIEVEMENT_CANDIDATES.forEach((candidate) => {
      if (!candidate.tag) return;
      if (!map.has(candidate.tag)) map.set(candidate.tag, []);
      map.get(candidate.tag).push(candidate);
    });
    return map;
  }

  function createEmptyAchievementSummary() {
    const summaries = new Map();
    ACHIEVEMENT_CANDIDATES.forEach((candidate) => {
      summaries.set(candidate.id, {
        candidate,
        bestCount: 0,
        bestRate: 0,
        bestCondition: null,
        totalCount: 0,
        totalTrials: 0
      });
    });
    return summaries;
  }

  function runDevilAchievementProbabilitySimulation(options) {
    const cards = getMajorArcanaCards();
    if (cards.length < 22) {
      throw new Error("大アルカナのカードデータが22枚読めないため、実績判定シミュレーターを実行できません。");
    }

    const baseSeed = String(options.seedText || `devil-achievement-all-${Date.now()}-${Math.random()}`);
    const trialCount = clampSimulatorTrialCount(options.trialCount);
    const profiles = [DEVIL_AI_PROFILES.relaxed, DEVIL_AI_PROFILES.standard, DEVIL_AI_PROFILES.serious].filter(Boolean);
    const strategies = Object.values(ACHIEVEMENT_SIMULATOR_PLAYER_STRATEGIES);
    const contractPolicies = Object.values(SIMULATOR_CONTRACT_POLICIES);
    const candidatesByTag = getAchievementCandidatesByTag();
    const summaries = createEmptyAchievementSummary();
    const conditionCount = profiles.length * strategies.length * contractPolicies.length;

    profiles.forEach((profile) => {
      strategies.forEach((strategy) => {
        contractPolicies.forEach((contractPolicy) => {
          const seedText = `${baseSeed}|achievement|${profile.id}|${strategy.id}|${contractPolicy.id}`;
          const { seed, random } = createSimulatorRandom(seedText);
          const conditionCounts = {};

          for (let index = 0; index < trialCount; index += 1) {
            const simulation = simulateSingleDevilGame({
              cards,
              profile,
              strategy,
              contractPolicyId: contractPolicy.id,
              random
            });
            const tags = buildSimulationAchievementTags(simulation);
            tags.forEach((tag) => {
              conditionCounts[tag] = (conditionCounts[tag] || 0) + 1;
            });
          }

          candidatesByTag.forEach((candidates, tag) => {
            const count = conditionCounts[tag] || 0;
            const rate = trialCount ? count / trialCount : 0;
            candidates.forEach((candidate) => {
              const summary = summaries.get(candidate.id);
              if (!summary) return;
              summary.totalCount += count;
              summary.totalTrials += trialCount;
              if (rate > summary.bestRate) {
                summary.bestCount = count;
                summary.bestRate = rate;
                summary.bestCondition = { profile, strategy, contractPolicy, seed };
              }
            });
          });
        });
      });
    });

    return {
      baseSeed,
      trialCount,
      conditionCount,
      profiles,
      strategies,
      contractPolicies,
      summaries: Array.from(summaries.values())
    };
  }


  function clampAchievementProbability(value) {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(1, value));
  }

  function getAchievementGoalCount(candidate) {
    return Math.max(1, Number.parseInt(candidate.targetCount || 1, 10));
  }

  function getAchievementKind(candidate) {
    return candidate.kind || (candidate.tag ? "event" : "manual");
  }

  function getAchievementSingleRate(summary) {
    const { candidate } = summary;
    const kind = getAchievementKind(candidate);
    if (kind === "deterministic") return 1;
    return summary.bestRate || 0;
  }

  function getAchievementCumulativeProbability(rate, trials, goalCount = 1) {
    const p = clampAchievementProbability(rate);
    const n = Math.max(0, Number.parseInt(trials, 10) || 0);
    const k = Math.max(1, Number.parseInt(goalCount, 10) || 1);
    if (n < k) return 0;
    if (p <= 0) return 0;
    if (p >= 1) return 1;
    if (k === 1) return 1 - Math.pow(1 - p, n);

    const q = 1 - p;
    let term = Math.pow(q, n);
    let cumulativeBelowGoal = term;

    for (let i = 1; i < k; i += 1) {
      if (q === 0) return 1;
      term *= ((n - i + 1) / i) * (p / q);
      cumulativeBelowGoal += term;
      if (!Number.isFinite(cumulativeBelowGoal)) return 1;
    }

    return clampAchievementProbability(1 - cumulativeBelowGoal);
  }

  function getAchievementTrialsForProbability(rate, goalCount, targetProbability) {
    const p = clampAchievementProbability(rate);
    const k = Math.max(1, Number.parseInt(goalCount, 10) || 1);
    const target = clampAchievementProbability(targetProbability);
    if (p <= 0) return "—";
    if (target <= 0) return formatSimulationNumber(k);
    if (p >= 1) return formatSimulationNumber(k);

    let low = k;
    let high = Math.max(k, Math.ceil(k / p));
    const hardLimit = 10000000;

    while (getAchievementCumulativeProbability(p, high, k) < target && high < hardLimit) {
      low = high + 1;
      high = Math.min(hardLimit, high * 2);
    }

    if (getAchievementCumulativeProbability(p, high, k) < target) {
      return `${formatSimulationNumber(hardLimit)}戦超`;
    }

    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (getAchievementCumulativeProbability(p, mid, k) >= target) {
        high = mid;
      } else {
        low = mid + 1;
      }
    }

    return formatSimulationNumber(low);
  }

  function getAchievementEstimatedTrials(summary) {
    const { candidate } = summary;
    const kind = getAchievementKind(candidate);
    if (kind === "deterministic") return formatSimulationNumber(candidate.fixedTrials || 1);
    const p = getAchievementSingleRate(summary);
    if (p <= 0) return "—";
    return formatSimulationNumber(Math.ceil(getAchievementGoalCount(candidate) / p));
  }

  function getAchievementVerdict(summary) {
    const { candidate } = summary;
    const kind = getAchievementKind(candidate);
    if (kind === "deterministic") return "進行確定";
    if (kind === "event") return getAchievementProbabilityLabel(summary.bestRate || 0);
    if (kind === "cumulative" && candidate.tag) {
      return summary.bestRate > 0 ? "累積推定" : "未検出";
    }
    if (kind === "ledger") return "台帳判定";
    if (kind === "compound") return "複合判定";
    if (kind === "meta") return "メタ判定";
    return "別集計";
  }

  function getAchievementBestRateLabel(summary) {
    const { candidate } = summary;
    const kind = getAchievementKind(candidate);
    if (kind === "deterministic") return "100.0000%";
    if (!candidate.tag) return "対象外";
    return formatAchievementRateFromCount(summary.bestCount || 0, summary.bestCondition ? summary.bestCondition.trialCount || 0 : 0);
  }

  function getAchievementBestCountLabel(summary) {
    const { candidate } = summary;
    const kind = getAchievementKind(candidate);
    if (kind === "deterministic") return "—";
    if (!candidate.tag) return "対象外";
    return summary.bestCount ? formatSimulationNumber(summary.bestCount) : "0";
  }

  function getAchievementAverageRateLabel(summary) {
    const { candidate } = summary;
    const kind = getAchievementKind(candidate);
    if (kind === "deterministic") return "100.0000%";
    if (!candidate.tag) return "対象外";
    return summary.totalTrials ? formatAchievementRateFromCount(summary.totalCount, summary.totalTrials) : "—";
  }

  function formatAchievementSummaryRow(summary) {
    const { candidate } = summary;
    const kind = getAchievementKind(candidate);
    const goalCount = kind === "deterministic" ? Number(candidate.fixedTrials || 1) : getAchievementGoalCount(candidate);
    const p = getAchievementSingleRate(summary);
    const probability100 = kind === "deterministic" ? (100 >= goalCount ? 1 : 0) : getAchievementCumulativeProbability(p, 100, goalCount);
    const probability300 = kind === "deterministic" ? (300 >= goalCount ? 1 : 0) : getAchievementCumulativeProbability(p, 300, goalCount);
    const probability1000 = kind === "deterministic" ? (1000 >= goalCount ? 1 : 0) : getAchievementCumulativeProbability(p, 1000, goalCount);

    return [
      candidate.id,
      candidate.name,
      candidate.category,
      kind,
      candidate.tag || "—",
      getAchievementVerdict(summary),
      candidate.hidden ? "隠し" : "公開",
      getAchievementBestRateLabel(summary),
      getAchievementBestCountLabel(summary),
      getAchievementAverageRateLabel(summary),
      goalCount ? formatSimulationNumber(goalCount) : "—",
      getAchievementEstimatedTrials(summary),
      formatAchievementRate(probability100),
      formatAchievementRate(probability300),
      formatAchievementRate(probability1000),
      getAchievementTrialsForProbability(p, goalCount, 0.5),
      getAchievementTrialsForProbability(p, goalCount, 0.9),
      getAchievementTrialsForProbability(p, goalCount, 0.95),
      getAchievementTrialsForProbability(p, goalCount, 0.99),
      describeAchievementCondition(summary.bestCondition),
      candidate.note || ""
    ].join("\t");
  }

  function formatAchievementProbabilityReport(result) {
    const header = [
      "実績ID",
      "実績名",
      "カテゴリ",
      "判定種別",
      "判定タグ",
      "判定",
      "公開区分",
      "最高発生率",
      "最高発生回数",
      "全条件平均発生率",
      "必要回数",
      "期待試行回数",
      "100戦以内",
      "300戦以内",
      "1000戦以内",
      "50%到達目安",
      "90%到達目安",
      "95%到達目安",
      "99%到達目安",
      "最も出やすい条件",
      "注記"
    ].join("\t");

    const rows = result.summaries.map((summary) => {
      if (summary.bestCondition) summary.bestCondition.trialCount = result.trialCount;
      return formatAchievementSummaryRow(summary);
    }).join("\n");

    return `実績候補発生率チェック / ${DEVIL_GAME_BUILD}

条件
- 出力形式: TSV（タブ区切り）
- 探索条件: 悪魔の機嫌 ${result.profiles.length}種 × プレイヤー戦略 ${result.strategies.length}種 × 契約方針 ${result.contractPolicies.length}種 = ${result.conditionCount}条件
- 各条件の試行回数: ${formatSimulationNumber(result.trialCount)}回
- 総試行回数: ${formatSimulationNumber(result.trialCount * result.conditionCount)}回
- base seed: ${result.baseSeed}
- 低得点同点などの探索用に、25/35/40/45/49以上で留まる戦略も追加して試算しています。
- 66到達後バーストの探索用に、「66到達後も一枚引く」戦略も追加して試算しています。

${header}
${rows}

注記
- この試算は実績候補の発生可能性を見るためのデバッグ用仮想遊戯です。勝敗記録、契約台帳、実績には保存されません。
- 判定種別が deterministic のものは、通算プレイ数など到達回数が固定の進行実績です。
- 判定種別が cumulative かつ判定タグを持つものは、単発発生率から累積到達目安を推定しています。
- 判定種別が ledger / compound / meta のものは、契約台帳・複合条件・実績総数など、実プレイの保存データで判定します。
- event / cumulative で最高発生率が0.0000%のものは、現ロジックで構造的に起きないか、探索条件がまだ足りない候補です。
- 契約方針は単発試算です。契約台帳の持ち越しは反映していません。`;
  }

  function ensureDebugSimulatorLayoutStyles() {
    const styleId = "devil-debug-simulator-layout-style";
    if (document.getElementById(styleId)) return;

    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      #devil-debug-panel,
      #devil-debug-panel * {
        box-sizing: border-box;
      }

      #devil-debug-panel,
      #devil-debug-panel .devil-debug-panel__sections,
      #devil-debug-panel .devil-debug-section,
      #devil-debug-panel .devil-debug-panel__grid,
      #devil-debug-panel .devil-debug-field {
        max-width: 100%;
        min-width: 0;
      }

      #devil-debug-section-simulator {
        display: grid;
        gap: 1rem;
      }

      #devil-debug-section-simulator .devil-debug-simulator-block {
        display: grid;
        gap: 0.75rem;
        padding-top: 0.95rem;
        border-top: 1px solid rgba(218, 190, 99, 0.22);
      }

      #devil-debug-section-simulator .devil-debug-simulator-block:first-of-type {
        padding-top: 0;
        border-top: 0;
      }

      #devil-debug-section-simulator .devil-debug-simulator-block h5 {
        margin: 0;
        color: #f4e7ad;
        font-size: clamp(1rem, 1.7vw, 1.12rem);
        letter-spacing: 0.08em;
      }

      #devil-debug-section-simulator .devil-debug-help {
        margin: 0;
        color: rgba(245, 234, 202, 0.76);
        line-height: 1.75;
      }

      #devil-debug-section-simulator .devil-debug-compact-help {
        font-size: 0.94rem;
      }

      #devil-debug-panel .devil-debug-panel__grid {
        grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
        align-items: end;
        overflow: visible;
      }

      #devil-debug-section-simulator .devil-debug-field {
        display: grid;
        gap: 0.42rem;
        color: rgba(236, 226, 255, 0.86);
        letter-spacing: 0.03em;
      }

      #devil-debug-section-simulator .devil-debug-field select,
      #devil-debug-section-simulator .devil-debug-field input {
        appearance: none;
        width: 100%;
        min-width: 0;
        min-height: 2.75rem;
        border-radius: 14px;
        border: 1px solid rgba(218, 190, 99, 0.58);
        background:
          linear-gradient(180deg, rgba(39, 34, 75, 0.98), rgba(17, 13, 42, 0.98));
        color: #fff4c8;
        padding: 0.5rem 0.82rem;
        font: inherit;
        font-size: 0.95rem;
        line-height: 1.2;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
      }

      #devil-debug-section-simulator .devil-debug-field select {
        padding-right: 2.45rem;
        background-image:
          linear-gradient(45deg, transparent 50%, #d8bd5f 50%),
          linear-gradient(135deg, #d8bd5f 50%, transparent 50%),
          linear-gradient(to right, rgba(218, 190, 99, 0.25), rgba(218, 190, 99, 0.25)),
          linear-gradient(180deg, rgba(39, 34, 75, 0.98), rgba(17, 13, 42, 0.98));
        background-position:
          calc(100% - 1.25rem) 50%,
          calc(100% - 0.9rem) 50%,
          calc(100% - 2.95rem) 50%,
          0 0;
        background-size: 0.42rem 0.42rem, 0.42rem 0.42rem, 1px 60%, 100% 100%;
        background-repeat: no-repeat;
      }

      #devil-debug-section-simulator .devil-debug-field input::placeholder {
        color: rgba(255, 244, 200, 0.52);
      }

      #devil-debug-section-simulator .devil-debug-field select:focus-visible,
      #devil-debug-section-simulator .devil-debug-field input:focus-visible,
      #devil-debug-section-simulator .button-link:focus-visible {
        outline: 2px solid rgba(246, 224, 132, 0.92);
        outline-offset: 3px;
      }

      #devil-debug-section-simulator .devil-debug-button {
        width: 100%;
        min-width: 0;
        min-height: 2.55rem;
        padding: 0.48rem 0.9rem;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        line-height: 1.25;
        white-space: normal;
      }

      #devil-debug-section-simulator .devil-debug-output-card {
        gap: 0.42rem;
      }

      #devil-debug-section-simulator .devil-debug-output-head {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.45rem 0.72rem;
        margin-bottom: 0;
        min-width: 0;
      }

      #devil-debug-section-simulator .devil-debug-output-head h5 {
        flex: 0 1 auto;
        min-width: 0;
        margin: 0;
      }

      #devil-debug-section-simulator #devil-debug-sim-copy {
        flex: 0 0 auto;
        width: auto;
        min-width: 0;
        max-width: none;
        min-height: 1.95rem;
        padding: 0.28rem 0.7rem;
        border-radius: 999px;
        font-size: 0.84rem;
        line-height: 1.2;
        white-space: nowrap;
      }

      #devil-debug-sim-output {
        display: block;
        width: 100%;
        margin: 0;
        max-width: 100%;
        min-width: 0;
        max-height: min(70vh, 680px);
        overflow: auto;
        overscroll-behavior: contain;
        white-space: pre;
        word-break: normal;
        overflow-wrap: normal;
        resize: vertical;
      }

      #devil-debug-status {
        width: 100%;
        max-width: 100%;
        overflow-x: auto;
        white-space: normal;
      }

      @media (max-width: 520px) {
        #devil-debug-panel .devil-debug-panel__grid {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function copyDebugSimulatorOutput() {
    const output = document.getElementById("devil-debug-sim-output");
    if (!output) return;
    const text = output.textContent || "";
    if (!text.trim()) {
      setDebugStatus("コピーするシミュレーター結果がありません。");
      return;
    }

    const fallbackCopy = () => {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
        setDebugStatus("シミュレーター結果をコピーしました。");
      } catch (error) {
        console.error(error);
        setDebugStatus("コピーに失敗しました。結果欄を手動で選択してください。");
      } finally {
        textarea.remove();
      }
    };

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => setDebugStatus("シミュレーター結果をコピーしました。"))
        .catch((error) => {
          console.error(error);
          fallbackCopy();
        });
      return;
    }

    fallbackCopy();
  }

  function runDebugSimulatorBatchFromPanel() {
    const output = document.getElementById("devil-debug-sim-output");
    const runButton = document.getElementById("devil-debug-sim-run-all");
    const singleButton = document.getElementById("devil-debug-sim-run");
    if (!output) return;

    const options = {
      trialCount: getSimulatorInputValue("devil-debug-sim-trials", "1000"),
      seedText: getSimulatorInputValue("devil-debug-sim-seed", "")
    };
    const trialCount = clampSimulatorTrialCount(options.trialCount);
    const totalCases = Object.keys(DEVIL_AI_PROFILES).filter((key) => ["relaxed", "standard", "serious"].includes(key)).length
      * Object.keys(SIMULATOR_PLAYER_STRATEGIES).length
      * Object.keys(SIMULATOR_CONTRACT_POLICIES).length;

    if (runButton) runButton.disabled = true;
    if (singleButton) singleButton.disabled = true;
    output.textContent = `悪魔に全条件を計算させています。${totalCases}条件 × ${formatSimulationNumber(trialCount)}回です……`;
    setDebugStatus(`勝率シミュレーター一括試算を実行中：${totalCases}条件 × ${formatSimulationNumber(trialCount)}回。本番記録には保存されません。`);

    window.setTimeout(() => {
      try {
        const batch = runDevilWinrateBatchSimulation(options);
        output.textContent = wrapSimulationReportAsCodeBlock(formatSimulationBatchReport(batch));
        setDebugStatus(`勝率シミュレーター一括試算完了：${batch.results.length}条件 × ${formatSimulationNumber(batch.trialCount)}回。結果欄をコピーできます。`);
      } catch (error) {
        console.error(error);
        output.textContent = wrapSimulationReportAsCodeBlock(`シミュレーターの一括実行に失敗しました。\n${error.message || error}`);
        setDebugStatus(`勝率シミュレーター一括実行に失敗：${error.message || error}`);
      } finally {
        if (runButton) runButton.disabled = false;
        if (singleButton) singleButton.disabled = false;
      }
    }, 20);
  }


  function runDebugMoodTransitionFromPanel() {
    const output = document.getElementById("devil-debug-sim-output");
    const moodButton = document.getElementById("devil-debug-mood-run");
    const moodBatchButton = document.getElementById("devil-debug-mood-run-all");
    const runButton = document.getElementById("devil-debug-sim-run");
    const batchButton = document.getElementById("devil-debug-sim-run-all");
    const achievementButton = document.getElementById("devil-debug-achievement-run");
    if (!output) return;

    const options = {
      startWins: String(gameStats?.wins || 0),
      startLosses: String(gameStats?.losses || 0),
      horizon: getSimulatorSelectValue("devil-debug-mood-horizon", "100"),
      strategyId: getSimulatorSelectValue("devil-debug-sim-strategy", "stand57"),
      contractPolicyId: getSimulatorSelectValue("devil-debug-sim-contract", "none"),
      trialCount: getSimulatorInputValue("devil-debug-sim-trials", "1000"),
      seedText: getSimulatorInputValue("devil-debug-sim-seed", "")
    };
    const trialCount = clampSimulatorTrialCount(options.trialCount);
    const horizon = clampMoodTransitionHorizon(options.horizon);

    if (moodButton) moodButton.disabled = true;
    if (moodBatchButton) moodBatchButton.disabled = true;
    if (runButton) runButton.disabled = true;
    if (batchButton) batchButton.disabled = true;
    if (achievementButton) achievementButton.disabled = true;
    output.textContent = `悪魔の機嫌遷移を計算しています。1局勝率 ${formatSimulationNumber(trialCount)}回 × 3機嫌、その後 ${formatSimulationNumber(horizon)}戦ぶんの勝敗差を展開します……`;
    setDebugStatus("悪魔の機嫌遷移を試算中。これは本番記録には保存されません。");

    window.setTimeout(() => {
      try {
        const result = runDevilMoodTransitionSimulation(options);
        output.textContent = wrapSimulationReportAsCodeBlock(formatMoodTransitionReport(result));
        setDebugStatus(`機嫌遷移試算完了：現在差分 ${result.startDifference >= 0 ? "+" : ""}${result.startDifference} / ${formatSimulationNumber(result.horizon)}戦以内の本気到達 ${formatTransitionProbability(result.firstHits.serious.hitProbability)}`);
      } catch (error) {
        console.error(error);
        output.textContent = wrapSimulationReportAsCodeBlock(`機嫌遷移試算に失敗しました。
${error.message || error}`);
        setDebugStatus(`機嫌遷移試算に失敗：${error.message || error}`);
      } finally {
        if (moodButton) moodButton.disabled = false;
        if (moodBatchButton) moodBatchButton.disabled = false;
        if (runButton) runButton.disabled = false;
        if (batchButton) batchButton.disabled = false;
        if (achievementButton) achievementButton.disabled = false;
      }
    }, 20);
  }


  function runDebugMoodTransitionBatchFromPanel() {
    const output = document.getElementById("devil-debug-sim-output");
    const moodButton = document.getElementById("devil-debug-mood-run");
    const moodBatchButton = document.getElementById("devil-debug-mood-run-all");
    const runButton = document.getElementById("devil-debug-sim-run");
    const batchButton = document.getElementById("devil-debug-sim-run-all");
    const achievementButton = document.getElementById("devil-debug-achievement-run");
    if (!output) return;

    const options = {
      startWins: String(gameStats?.wins || 0),
      startLosses: String(gameStats?.losses || 0),
      horizon: getSimulatorSelectValue("devil-debug-mood-horizon", "100"),
      trialCount: getSimulatorInputValue("devil-debug-sim-trials", "1000"),
      seedText: getSimulatorInputValue("devil-debug-sim-seed", "")
    };
    const trialCount = clampSimulatorTrialCount(options.trialCount);
    const horizon = clampMoodTransitionHorizon(options.horizon);
    const totalCases = Object.keys(SIMULATOR_PLAYER_STRATEGIES).length * Object.keys(SIMULATOR_CONTRACT_POLICIES).length;

    if (moodButton) moodButton.disabled = true;
    if (moodBatchButton) moodBatchButton.disabled = true;
    if (runButton) runButton.disabled = true;
    if (batchButton) batchButton.disabled = true;
    if (achievementButton) achievementButton.disabled = true;
    output.textContent = `悪魔の機嫌遷移を一括計算しています。${totalCases}条件 × 3機嫌 × ${formatSimulationNumber(trialCount)}回で1局勝率を推定し、その後 ${formatSimulationNumber(horizon)}戦ぶんの勝敗差を展開します……`;
    setDebugStatus(`機嫌遷移の一括試算を実行中：${totalCases}条件 × 3機嫌 × ${formatSimulationNumber(trialCount)}回。本番記録には保存されません。`);

    window.setTimeout(() => {
      try {
        const batch = runDevilMoodTransitionBatchSimulation(options);
        output.textContent = wrapSimulationReportAsCodeBlock(formatMoodTransitionBatchReport(batch));
        setDebugStatus(`機嫌遷移一括試算完了：${batch.results.length}条件 / ${formatSimulationNumber(batch.horizon)}戦追跡。結果欄をコピーできます。`);
      } catch (error) {
        console.error(error);
        output.textContent = wrapSimulationReportAsCodeBlock(`機嫌遷移の一括試算に失敗しました。\n${error.message || error}`);
        setDebugStatus(`機嫌遷移一括試算に失敗：${error.message || error}`);
      } finally {
        if (moodButton) moodButton.disabled = false;
        if (moodBatchButton) moodBatchButton.disabled = false;
        if (runButton) runButton.disabled = false;
        if (batchButton) batchButton.disabled = false;
        if (achievementButton) achievementButton.disabled = false;
      }
    }, 20);
  }



  function runDebugLedgerLongRunBatchFromPanel() {
    const output = document.getElementById("devil-debug-sim-output");
    const ledgerButton = document.getElementById("devil-debug-ledger-run-all");
    const moodButton = document.getElementById("devil-debug-mood-run");
    const moodBatchButton = document.getElementById("devil-debug-mood-run-all");
    const runButton = document.getElementById("devil-debug-sim-run");
    const batchButton = document.getElementById("devil-debug-sim-run-all");
    const achievementButton = document.getElementById("devil-debug-achievement-run");
    if (!output) return;

    const options = {
      startWins: String(gameStats?.wins || 0),
      startLosses: String(gameStats?.losses || 0),
      horizon: getSimulatorSelectValue("devil-debug-mood-horizon", "100"),
      trialCount: getSimulatorInputValue("devil-debug-sim-trials", "1000"),
      seedText: getSimulatorInputValue("devil-debug-sim-seed", ""),
      initialContractedCardIds: getContractedCardIds()
    };
    const totalCases = Object.keys(SIMULATOR_PLAYER_STRATEGIES).length * Object.keys(SIMULATOR_CONTRACT_POLICIES).length;
    const effectiveSettings = getLedgerLongRunEffectiveSettings(options, totalCases);
    const trialCount = effectiveSettings.trialCount;
    const horizon = effectiveSettings.horizon;
    const totalGames = effectiveSettings.effectiveTotalGames;
    const buttons = [ledgerButton, moodButton, moodBatchButton, runButton, batchButton, achievementButton].filter(Boolean);
    const autoCapMessage = effectiveSettings.wasAutoCapped
      ? ` 入力条件では総仮想対局 ${formatSimulationNumber(effectiveSettings.requestedTotalGames)}戦になるため、上限 ${formatSimulationNumber(effectiveSettings.maxTotalGames)}戦以内に収まるよう各条件 ${formatSimulationNumber(trialCount)}周へ自動補正しました。`
      : "";

    buttons.forEach((button) => { button.disabled = true; });
    output.textContent = `契約台帳込みで長期シミュレーションしています。${totalCases}条件 × ${formatSimulationNumber(trialCount)}周 × ${formatSimulationNumber(horizon)}戦、総仮想対局 ${formatSimulationNumber(totalGames)}戦です……${autoCapMessage}`;
    setDebugStatus(`契約台帳込み長期試算を実行中：${totalCases}条件 × ${formatSimulationNumber(trialCount)}周 × ${formatSimulationNumber(horizon)}戦。${effectiveSettings.wasAutoCapped ? "入力値を自動補正済み。" : ""}本番記録には保存されません。`);

    window.setTimeout(() => {
      try {
        const batch = runDevilLedgerLongRunBatchSimulation(options);
        output.textContent = wrapSimulationReportAsCodeBlock(formatLedgerLongRunBatchReport(batch));
        setDebugStatus(`契約台帳込み長期試算完了：${batch.results.length}条件 / 各${formatSimulationNumber(batch.trialCount)}周 × ${formatSimulationNumber(batch.horizon)}戦。${batch.wasAutoCapped ? "入力値は自動補正されています。" : ""}結果欄をコピーできます。`);
      } catch (error) {
        console.error(error);
        output.textContent = wrapSimulationReportAsCodeBlock(`契約台帳込み長期試算に失敗しました。\n${error.message || error}`);
        setDebugStatus(`契約台帳込み長期試算に失敗：${error.message || error}`);
      } finally {
        buttons.forEach((button) => { button.disabled = false; });
      }
    }, 20);
  }


  function runDebugAchievementCheckerFromPanel() {
    const output = document.getElementById("devil-debug-sim-output");
    const achievementButton = document.getElementById("devil-debug-achievement-run");
    const runButton = document.getElementById("devil-debug-sim-run");
    const batchButton = document.getElementById("devil-debug-sim-run-all");
    if (!output) return;

    const options = {
      trialCount: getSimulatorInputValue("devil-debug-sim-trials", "1000"),
      seedText: getSimulatorInputValue("devil-debug-sim-seed", "")
    };
    const trialCount = clampSimulatorTrialCount(options.trialCount);
    const totalCases = 3 * Object.keys(ACHIEVEMENT_SIMULATOR_PLAYER_STRATEGIES).length * Object.keys(SIMULATOR_CONTRACT_POLICIES).length;

    if (achievementButton) achievementButton.disabled = true;
    if (runButton) runButton.disabled = true;
    if (batchButton) batchButton.disabled = true;
    output.textContent = `実績候補の発生率を計算しています。${totalCases}条件 × ${formatSimulationNumber(trialCount)}回です……`;
    setDebugStatus(`実績候補判定を実行中：${totalCases}条件 × ${formatSimulationNumber(trialCount)}回。本番記録には保存されません。`);

    window.setTimeout(() => {
      try {
        const result = runDevilAchievementProbabilitySimulation(options);
        output.textContent = wrapSimulationReportAsCodeBlock(formatAchievementProbabilityReport(result));
        setDebugStatus(`実績候補判定完了：${result.conditionCount}条件 × ${formatSimulationNumber(result.trialCount)}回。結果欄をコピーできます。`);
      } catch (error) {
        console.error(error);
        output.textContent = wrapSimulationReportAsCodeBlock(`実績候補判定に失敗しました。\n${error.message || error}`);
        setDebugStatus(`実績候補判定に失敗：${error.message || error}`);
      } finally {
        if (achievementButton) achievementButton.disabled = false;
        if (runButton) runButton.disabled = false;
        if (batchButton) batchButton.disabled = false;
      }
    }, 20);
  }

  function runDebugSimulatorFromPanel() {
    const output = document.getElementById("devil-debug-sim-output");
    const runButton = document.getElementById("devil-debug-sim-run");
    if (!output) return;

    const options = {
      profileId: getSimulatorSelectValue("devil-debug-sim-profile", "standard"),
      strategyId: getSimulatorSelectValue("devil-debug-sim-strategy", "stand57"),
      contractPolicyId: getSimulatorSelectValue("devil-debug-sim-contract", "none"),
      trialCount: getSimulatorInputValue("devil-debug-sim-trials", "1000"),
      seedText: getSimulatorInputValue("devil-debug-sim-seed", "")
    };

    if (runButton) runButton.disabled = true;
    output.textContent = "悪魔に計算させています。帳簿の羽根ペンが走っています……";
    setDebugStatus("勝率シミュレーターを実行中。これは本番記録には保存されません。");

    window.setTimeout(() => {
      try {
        const stats = runDevilWinrateSimulation(options);
        output.textContent = wrapSimulationReportAsCodeBlock(formatSimulationReport(stats));
        setDebugStatus(`勝率シミュレーター完了：${stats.profile.mood} / ${stats.strategy.label} / ${formatSimulationNumber(stats.trialCount)}回 / あなた勝率 ${formatSimulationPercent(stats.playerWins, stats.trialCount)}`);
      } catch (error) {
        console.error(error);
        output.textContent = `シミュレーターの実行に失敗しました。\n${error.message || error}`;
        setDebugStatus(`勝率シミュレーターの実行に失敗：${error.message || error}`);
      } finally {
        if (runButton) runButton.disabled = false;
      }
    }, 20);
  }

  function createDebugPanel() {
    if (!DEBUG_MODE || !dom.gamePage || dom.debugPanel) return;
    ensureDebugSimulatorLayoutStyles();

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
        <section class="devil-debug-section" aria-labelledby="devil-debug-section-mood">
          <h4 id="devil-debug-section-mood">悪魔の機嫌・慢心ドロー</h4>
          <div class="devil-debug-panel__grid">
            <button type="button" class="button-link secondary devil-debug-button" data-debug-scenario="relaxedRiskBustWin">余裕：慢心バースト</button>
            <button type="button" class="button-link secondary devil-debug-button" data-debug-scenario="relaxedRiskStillWin">余裕：慢心しても勝利</button>
            <button type="button" class="button-link secondary devil-debug-button" data-debug-scenario="standardRiskBustWin">平静：微慢心バースト</button>
            <button type="button" class="button-link secondary devil-debug-button" data-debug-scenario="seriousStableStop">本気：堅実停止</button>
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
        <section class="devil-debug-section" aria-labelledby="devil-debug-section-simulator" id="devil-debug-section-simulator">
          <h4 id="devil-debug-section-simulator-title">勝率シミュレーター</h4>
          <p class="devil-debug-help">アニメーションやセリフを出さず、同じ悪魔AIで仮想遊戯を計算します。勝敗記録と契約台帳には保存されません。<br>「全条件を一括試算」は、悪魔の機嫌・プレイヤー戦略・契約方針の全組み合わせをTSV形式のコードブロックで出力します。<br>「実績候補を一括判定」は、候補実績ごとの最高発生率・期待試行回数・未検出候補をTSV形式で出力します。<br>「機嫌遷移を一括試算」は、プレイヤー戦略・契約方針の全組み合わせについて、現在記録からの機嫌推移をTSV形式で出力します。</p>

          <div class="devil-debug-simulator-block" aria-labelledby="devil-debug-winrate-title">
            <h5 id="devil-debug-winrate-title">設定</h5>
            <div class="devil-debug-panel__grid">
              <label class="devil-debug-field">悪魔の機嫌
                <select id="devil-debug-sim-profile">
                  <option value="relaxed">余裕</option>
                  <option value="standard" selected>平静</option>
                  <option value="serious">本気</option>
                </select>
              </label>
              <label class="devil-debug-field">プレイヤー戦略
                <select id="devil-debug-sim-strategy">
                  <option value="stand55">55以上で留まる</option>
                  <option value="stand57" selected>57以上で留まる</option>
                  <option value="stand60">60以上で留まる</option>
                  <option value="stand63">63以上で留まる</option>
                  <option value="stand66">66まで攻める</option>
                </select>
              </label>
              <label class="devil-debug-field">契約方針
                <select id="devil-debug-sim-contract">
                  <option value="none" selected>契約しない</option>
                  <option value="always">常に契約する</option>
                  <option value="reflected55">契約後55以上なら契約</option>
                  <option value="reflected60">契約後60以上なら契約</option>
                </select>
              </label>
              <label class="devil-debug-field">勝率推定の試行回数
                <select id="devil-debug-sim-trials">
                  <option value="100">100回</option>
                  <option value="1000" selected>1,000回</option>
                  <option value="10000">10,000回</option>
                  <option value="100000">100,000回</option>
                </select>
              </label>
              <label class="devil-debug-field">機嫌推移の追跡対局数
                <select id="devil-debug-mood-horizon">
                  <option value="20">20戦</option>
                  <option value="30">30戦</option>
                  <option value="50">50戦</option>
                  <option value="75">75戦</option>
                  <option value="100" selected>100戦</option>
                  <option value="200">200戦</option>
                  <option value="500">500戦</option>
                </select>
              </label>
              <label class="devil-debug-field">seed（空欄なら自動）
                <input id="devil-debug-sim-seed" type="text" inputmode="latin" placeholder="例：v86-test-01">
              </label>
            </div>
          </div>

          <div class="devil-debug-simulator-block" aria-labelledby="devil-debug-actions-title">
            <h5 id="devil-debug-actions-title">実行</h5>
            <div class="devil-debug-panel__grid">
              <button type="button" id="devil-debug-sim-run" class="button-link secondary devil-debug-button">選択条件だけ試算</button>
              <button type="button" id="devil-debug-sim-run-all" class="button-link primary devil-debug-button">全条件を一括試算</button>
              <button type="button" id="devil-debug-achievement-run" class="button-link primary devil-debug-button">実績候補を一括判定</button>
              <button type="button" id="devil-debug-mood-run" class="button-link primary devil-debug-button">機嫌遷移を試算</button>
              <button type="button" id="devil-debug-mood-run-all" class="button-link primary devil-debug-button">機嫌遷移を一括試算</button>
              <button type="button" id="devil-debug-ledger-run-all" class="button-link primary devil-debug-button">契約台帳込みで一括試算</button>
            </div>
          </div>

          <div class="devil-debug-simulator-block" aria-labelledby="devil-debug-mood-transition-title">
            <h5 id="devil-debug-mood-transition-title">機嫌遷移の前提</h5>
            <p class="devil-debug-help devil-debug-compact-help">機嫌遷移試算は、上のプレイヤー戦略・契約方針・勝率推定の試行回数・機嫌推移の追跡対局数・seedを使い、保存済みの現在記録から計算します。現在記録：あなた ${formatSimulationNumber(gameStats?.wins || 0)}勝 / 悪魔 ${formatSimulationNumber(gameStats?.losses || 0)}勝。契約台帳込み試算は、現在の契約済みカード ${formatSimulationNumber(getContractedCardIds().length)}枚も初期状態として複製します。</p>
          </div>

          <div class="devil-debug-simulator-block devil-debug-output-card" aria-labelledby="devil-debug-output-title">
            <div class="devil-debug-output-head">
              <h5 id="devil-debug-output-title">結果</h5>
              <button type="button" id="devil-debug-sim-copy" class="button-link secondary">結果をコピー</button>
            </div>
            <pre id="devil-debug-sim-output" class="devil-debug-panel__status" aria-live="polite">未実行。フィードバック用には「全条件を一括試算」を押してください。結果はコードブロックとして出力されます。</pre>
          </div>
        </section>
      </div>
      <p id="devil-debug-status" class="devil-debug-panel__status" role="status" aria-live="polite">待機中。悪魔より邪悪な操作盤です。</p>
    `;

    dom.gamePage.appendChild(panel);
    dom.debugPanel = panel;
    dom.debugStatus = panel.querySelector("#devil-debug-status");
    panel.addEventListener("click", (event) => {
      const simulatorButton = event.target.closest("#devil-debug-sim-run");
      if (simulatorButton) {
        event.preventDefault();
        runDebugSimulatorFromPanel();
        return;
      }

      const simulatorAllButton = event.target.closest("#devil-debug-sim-run-all");
      if (simulatorAllButton) {
        event.preventDefault();
        runDebugSimulatorBatchFromPanel();
        return;
      }

      const moodTransitionButton = event.target.closest("#devil-debug-mood-run");
      if (moodTransitionButton) {
        event.preventDefault();
        runDebugMoodTransitionFromPanel();
        return;
      }

      const moodTransitionBatchButton = event.target.closest("#devil-debug-mood-run-all");
      if (moodTransitionBatchButton) {
        event.preventDefault();
        runDebugMoodTransitionBatchFromPanel();
        return;
      }

      const ledgerLongRunButton = event.target.closest("#devil-debug-ledger-run-all");
      if (ledgerLongRunButton) {
        event.preventDefault();
        runDebugLedgerLongRunBatchFromPanel();
        return;
      }

      const achievementButton = event.target.closest("#devil-debug-achievement-run");
      if (achievementButton) {
        event.preventDefault();
        runDebugAchievementCheckerFromPanel();
        return;
      }

      const simulatorCopyButton = event.target.closest("#devil-debug-sim-copy");
      if (simulatorCopyButton) {
        event.preventDefault();
        copyDebugSimulatorOutput();
        return;
      }

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

    recordContractReleaseAchievement(cardId);
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
    resetDevilGameRecordOnly();

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
    scheduleAchievementUnlockModal(260);
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
    dom.achievementUnlockCloseButton?.addEventListener("click", dismissAchievementUnlockModal);
    dom.achievementUnlockDialog?.addEventListener("cancel", (event) => {
      event.preventDefault();
      dismissAchievementUnlockModal();
    });
    dom.achievementUnlockDialog?.addEventListener("click", (event) => {
      if (event.target === dom.achievementUnlockDialog) dismissAchievementUnlockModal();
    });
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
    canDevilTakeMoodRiskDraw,
    canDevilPunishLowEffortTie,
    isLowEffortTie,
    getReflectedContractTotal,
    isTargetScore,
    startNewGame,
    runDebugScenario,
    runDevilWinrateSimulation,
    runDevilWinrateBatchSimulation,
    runDevilAchievementProbabilitySimulation,
    formatSimulationReport,
    formatSimulationBatchReport,
    formatAchievementProbabilityReport,
    loadDevilRecords,
    saveDevilRecords,
    loadDevilAchievements,
    saveDevilAchievements,
    resetDevilGameRecordOnly,
    eraseAllDevilData,
    ACHIEVEMENT_CANDIDATES
  };

  window.SallyDevilRecords = {
    RECORDS_STORAGE_KEY,
    ACHIEVEMENTS_STORAGE_KEY,
    STATS_STORAGE_KEY,
    loadRecords: loadDevilRecords,
    saveRecords: saveDevilRecords,
    loadAchievements: loadDevilAchievements,
    saveAchievements: saveDevilAchievements,
    resetGameRecordOnly: resetDevilGameRecordOnly,
    eraseAllDevilData,
    candidates: ACHIEVEMENT_CANDIDATES
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
