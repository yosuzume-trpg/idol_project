// =============================================================
// バランス定数 — 唯一の数値置き場（docs/game_design_doc.md と同期を保つ）
// 変更時は仕様書§該当節も更新し、npm run test で回帰確認すること
// =============================================================

export const BALANCE = {
    // ---- 時間・行動（§2） ----
    totalDays: 1825,
    apPerDay: 3,
    nightlyStaminaRecovery: 30,
    nightlyMentalRecovery: 10,
    restStaminaRatio: 0.6, // 休息: 最大値の60%回復
    restMentalRecovery: 40,
    lowMentalThreshold: 0.3, // メンタル30%以下で
    lowMentalPenalty: -10, //   全判定に-10
    mentalMax: 100, // メンタルは常に0〜100固定（成長パラメータではない）
    staminaMaxBase: 100, // スタミナ上限の基礎値。実際の上限は staminaMaxBase + staminaParam×staminaMaxGrowthRate（economy.ts の staminaMax()）
    staminaMaxGrowthRate: 0.5, // スタミナパラメータ連動の成長式（マイルストーン6で確定。旧「未実装＝残課題」を解消）
    activityStaminaCost: { stream: 20, lesson: 15, production: 15 }, // 配信-20 / レッスン-15 / 制作-15
    activityMentalCost: 5, // 活動-5（ファンブル事故時の追加-15はaccidentMentalDamageで別途加算）

    // ---- 判定（§5） ----
    successBase: 50,
    requirementFloor: 100, // 正規化分母の下限 max(req, 100)
    successClamp: [5, 95] as const,
    criticalBase: 5, // 01〜05
    criticalLuckDivisor: 50, // +min(10, luck/50)
    criticalLuckCap: 10,
    fumbleFrom: 97, // 97〜00
    scoreTable: [
        { min: 8, band: "legendary", coef: 3.0 },
        { min: 7, band: "great", coef: 2.0 },
        { min: 5, band: "good", coef: 1.5 },
        { min: 3, band: "standard", coef: 1.0 },
        { min: 1, band: "weak", coef: 0.4 },
        { min: -Infinity, band: "fail", coef: 0.15 },
    ] as const,
    accidentCoef: 0.1,
    accidentFanRatio: 0.99, // 事故: ファン×0.99
    accidentMentalDamage: 15,

    // ---- 成長（§3） ----
    lessonGainSuccess: 2.2,
    lessonGainFail: 0.7,
    lessonCritMultiplier: 2,
    lessonCostRate: 1.5, // 費用 = 現在値×1.5G
    // レッスンの要求値は配信/制作と異なり、各ロールごとに「そのロールのパラメータ自身の現在値」を使う（lessons.ts参照）。
    // 対象パラメータだけでなく支援ロール（スタミナ/メンタル/ラック等）も自分自身の値と比較するため、
    // 対象パラメータだけ特化して伸ばしても支援ロールが要求値割れで5%floorに張り付く、ということが起きない。
    // 【経緯】当初requirement(fans)を流用→ファン数が伸びるとレッスンも配信と同時に成功率が床(5%)に張り付き進行停止（バグ）。
    // 次に固定値20を試した→初期パラメータ(10)では40%にしかならず「ほとんど失敗」、後半は95%に張り付き逆に頭打ちになる問題が残った。
    // 対象パラメータのみ自己参照にしたが、支援ロールは対象パラメータの値と比較されたままだったため、
    // 特化した対象パラメータに対して支援ロール（メンタル/ラック等の経験系パラメータを含む）が置いていかれ、
    // 依然として失敗が多く成長が遅いという実プレイフィードバックを受け、全ロールを自己参照に修正した。
    // §3.1「レッスン費用は現在値比例→経済的ソフトキャップ」の通り、難易度ではなく費用だけを頭打ち要因にする設計のため、
    // 成功率はやや成功寄り（lessonRequirementBonus分だけ要求値を割り引く）にして、レッスンが「配信の要求値上昇に追いつくための
    // 頼れる手段」として機能するようにする（実プレイフィードバックを受けて調整）
    lessonRequirementBonus: 10,
    activityGain: 0.15, // 活動経験値（0.1〜0.2で調整）
    // 経験系パラメータ（アイデア/カリスマ/愛嬌/交渉/メンタル/ラック）の確率成長（マイルストーン6で確定）
    // 標準成功以上のロールで対象パラメータが成功していれば、この確率でactivityGainと同量(0.15)が加算される
    experienceGrowthChance: 0.2,

    // ---- キャラメイク（§4） ----
    paramBase: 10,
    createPoints: 150,
    createCap: 40,
    luckDice: { count: 3, sides: 6, multiplier: 2 }, // 3d6×2

    // ---- 配信経済（§8.1） ----
    viewerRatio: 0.1, // 同接 = ファン×10%×係数
    moneyPerViewer: 2,
    greatMoneyMultiplier: 1.5, // スコア7で×1.5
    fanInflowRatio: 0.04,
    saturationScale: 1_200_000,
    discoveryBonusHigh: 4, // 標準成功以上
    discoveryBonusLow: 1.5,
    dailyFanDecay: 0.0015,

    // ---- 要求値（§8.4） ----
    requirementBase: 20,
    // 20 + log10(fans/50)×requirementLogSlope。
    // 【経緯】元は240だったが、レッスンが壊れていた時期の検証で60まで下げた。
    // レッスン（全ロール自己参照＋成功寄りボーナス）・アルバイト・装備ショップを実装し終えた状態で再シミュレーションした結果、
    // 60のままだと5年目でも要求値が300程度にしか伸びず、成長した実効値に対して要求値が低すぎて終盤の緊張感が失われる
    // （＝レッスンの種類や配信ジャンルを選ばなくても押し切れてしまい、経験系パラメータの手薄さが問題にならない）ことが判明したため80に引き上げた。
    // 【残課題】この再調整はストリーミング＋レッスン＋バイト＋装備のみを使う簡易botで検証したもので、
    // 動画/楽曲制作（§8.2/§8.3の追加収入源）を組み込んだ「本来のバランス型bot」では未検証。
    // 動画/楽曲を使えばファン数はこの簡易botより伸びるはずなので、CLAUDE.mdの5年終了時ファン数200万〜350万という回帰基準は
    // 満たせる可能性が高いが、動画/楽曲を含めた回帰テストが整備され次第、再検証すること
    requirementLogSlope: 80,
    requirementFanBase: 50,

    // ---- 動画（§8.2） ----
    video: {
        burstReach: 0.4,
        burstTau: 2.5,
        tailRate: 0.0015,
        tailTau: 45,
        fatigueTau: 5, // リーチ補正 = 1-exp(-投稿間隔/5)
        moneyPerView: 0.5,
        fanConversion: 0.05,
        activeDays: 120, // 処理打ち切り→アーカイブ
        scoreToQuality: { base: 0.8, slope: 1.5 / 7 }, // 0.8 + score/7×1.5
    },

    // ---- 楽曲（§8.3） ----
    song: {
        spikeRatio: 0.06,
        spikeTau: 7,
        baselineRate: 0.00012,
        liveBoostRatio: 0.008,
        liveBoostTau: 4,
        moneyPerDl: 20,
        scoreToQuality: { base: 1.0, slope: 1.0 / 7 }, // 1.0 + score/7
        projectGapDays: 0, // プロジェクト着手間隔の制約が必要になったら
    },

    // ---- トレンド（§9） ----
    trend: {
        sizes: {
            L: { peak: 1.0, rampDays: 4, halfLife: 28, intervalDays: 60, price: 8000 },
            M: { peak: 0.6, rampDays: 3, halfLife: 14, intervalDays: 25, price: 4000 },
            S: { peak: 0.35, rampDays: 1.5, halfLife: 5, intervalDays: 10, price: 1500 },
        },
        titleMatchReqReduction: 40, // −40×強度
        genreMatchReqReduction: 15,
        titleMatchDiscovery: 2.0, // ×(1+2.0×強度)
        genreMatchDiscovery: 0.7,
        snsCheckApCost: 1,
    },

    // ---- ライブ（§10） ----
    live: {
        venues: {
            livehouse: {
                capacity: 300,
                fansRequired: 2_000,
                cost: 50_000,
                requirement: 140,
                songCount: 4,
                ticketPrice: 30,
            },
            hall: {
                capacity: 2_000,
                fansRequired: 30_000,
                cost: 800_000,
                requirement: 400,
                songCount: 6,
                ticketPrice: 60,
            },
            arena: {
                capacity: 10_000,
                fansRequired: 300_000,
                cost: 15_000_000,
                requirement: 720,
                songCount: 8,
                ticketPrice: 90,
            },
            budokan: {
                capacity: 14_000,
                fansRequired: 1_500_000,
                cost: 80_000_000,
                requirement: 1000,
                songCount: 10,
                ticketPrice: 120,
            },
        },
        rehearsalBonus: 5,
        rehearsalMax: 5,
        popularityBonusThreshold: 1.5, // 人気度1.5以上で+1
        staminaCostByGenre: { idol: 12, rock: 15, ballad: 6, edm: 18, comedy: 10, rap: 13 },
        fatigueThreshold: 40,
        fatiguePenalty: -10,
        rankThresholds: { S: 0.8, A: 0.6, B: 0.4 }, // 得点率
        retryCooldownDays: 90,
        sRankTicketMultiplier: 1.5,
    },

    // ---- 装備（§12） ----
    equipment: {
        bonusPerLevel: 3,
        baseCost: 200,
        costGrowth: 1.35, // 費用 = 200×1.35^Lv
        practiceEnvBonusPerLevel: 0.02, // レッスン上昇量+2%/Lv
    },

    // ---- アルバイト（§6.6） ----
    jobs: {
        wageVariance: [0.8, 1.2] as const, // スコアによる賃金変動幅
        statGain: 0.3,
        list: {
            liveStaff: {
                label: "ライブスタッフ",
                wage: 150,
                staminaCost: 15,
                param: "vocalExpression",
            },
            warehouse: { label: "倉庫スタッフ", wage: 180, staminaCost: 20, param: "staminaParam" },
            cafe: { label: "カフェ店員", wage: 140, staminaCost: 15, param: "charm" },
            karaoke: { label: "カラオケ店員", wage: 140, staminaCost: 15, param: "talk" },
            eventSetup: { label: "イベント設営", wage: 160, staminaCost: 15, param: "idea" },
            // 交渉・カリスマは専用レッスンが無く、既存の実装ではロールとして一度も出現しない
            // 完全な成長手段ゼロの状態だったため、バイト経由の成長手段として追加（実プレイフィードバックを受けて追加）
            mobileShop: { label: "携帯ショップ店員", wage: 170, staminaCost: 20, param: "negotiation" },
            barker: { label: "呼び込みスタッフ", wage: 150, staminaCost: 15, param: "charisma" },
        },
    },

    // ---- デート（§13） ----
    dating: {
        affectionMax: 100,
        milestones: [25, 50, 75, 100] as const,
        /** デート代の範囲（デート先により変動） */
        costRange: [100, 300] as const,
        /** 好み一致/地雷/通常時の好感度変動 */
        affectionGain: { favorite: 6, normal: 2, taboo: -5 },
        /** 抽選: プールから採用する件数 */
        preferencePickCount: { spots: 2, topics: 3, taboos: 1 },
        /** カレンダーイベント（day % 365、開始日=4月1日基準） */
        calendarEvents: {
            christmas: [267, 268] as const, // 12/24-25
            valentine: 319, // 2/14
        },
        calendarAffectionBonus: 4,
    },

    // ---- 放置（§11） ----
    idle: {
        realHoursPerDay: 3,
        maxDays: 7,
        scoreCoef: 0.65,
        discoveryBonus: 2,
        lessonGain: 1.2,
        activityGainRatio: 0.5,
    },
} as const;

export type Balance = typeof BALANCE;
