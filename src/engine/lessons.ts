// =============================================================
// レッスン（§6.4） — 現在値に比例した費用で対象パラメータを鍛える
// 技術/表現などのペアも含め、1レッスン=1対象パラメータの固定式とする（選択式UIは廃止）
// =============================================================

import { BALANCE } from "./balance";
import { practiceEnvMultiplier } from "./equipment";
import { activityParamGains, experienceParamGains, mergeParamGains } from "./growth";
import { isSuccessBand, mentalPenalty, resolveRolls, scoreBand } from "./judge";
import type { ActionResult, Character, Equipment, ParamKey, Params, Rng, RollSpec, ScoreBand } from "./types";

export type LessonId =
    | "vocalTechniqueLesson"
    | "vocalExpressionLesson"
    | "danceTechniqueLesson"
    | "danceExpressionLesson"
    | "lyricsLesson"
    | "compositionLesson"
    | "editTechniqueLesson"
    | "editCompositionLesson"
    | "talkLesson"
    | "reactionLesson"
    | "gym"
    | "gameLesson"
    | "makeupLesson"
    | "studyLesson"
    | "charismaLesson"
    | "negotiationLesson"
    | "counselingLesson";

export type LessonDef = {
    id: LessonId;
    label: string;
    target: ParamKey;
    targetWeight: number;
    /** 対象パラメータ以外の固定ロール */
    supportRolls: RollSpec[];
    apCost: number;
    staminaCost: number;
    mentalCost: number;
};

// 専用レッスンが無かった経験系パラメータ（アイデア/カリスマ/愛嬌/交渉/メンタル）向けの新設レッスン共通の支援ロール型。
// 既存のジム/ゲーム練習（対象4+支援3）と同型にする
const GENERIC_SUPPORT: RollSpec[] = [
    { param: "mentalParam", weight: 2 },
    { param: "luck", weight: 1 },
];

export const LESSONS: Record<LessonId, LessonDef> = {
    vocalTechniqueLesson: {
        id: "vocalTechniqueLesson",
        label: "ボーカルレッスン（技術）",
        target: "vocalTechnique",
        targetWeight: 2,
        supportRolls: [
            { param: "staminaParam", weight: 2 },
            { param: "mentalParam", weight: 2 },
            { param: "luck", weight: 1 },
        ],
        apCost: 1,
        staminaCost: BALANCE.activityStaminaCost.lesson,
        mentalCost: BALANCE.activityMentalCost,
    },
    vocalExpressionLesson: {
        id: "vocalExpressionLesson",
        label: "ボーカルレッスン（表現）",
        target: "vocalExpression",
        targetWeight: 2,
        supportRolls: [
            { param: "staminaParam", weight: 2 },
            { param: "mentalParam", weight: 2 },
            { param: "luck", weight: 1 },
        ],
        apCost: 1,
        staminaCost: BALANCE.activityStaminaCost.lesson,
        mentalCost: BALANCE.activityMentalCost,
    },
    danceTechniqueLesson: {
        id: "danceTechniqueLesson",
        label: "ダンスレッスン（技術）",
        target: "danceTechnique",
        targetWeight: 2,
        supportRolls: [
            { param: "staminaParam", weight: 3 },
            { param: "mentalParam", weight: 1 },
            { param: "luck", weight: 1 },
        ],
        apCost: 1,
        staminaCost: BALANCE.activityStaminaCost.lesson,
        mentalCost: BALANCE.activityMentalCost,
    },
    danceExpressionLesson: {
        id: "danceExpressionLesson",
        label: "ダンスレッスン（表現）",
        target: "danceExpression",
        targetWeight: 2,
        supportRolls: [
            { param: "staminaParam", weight: 3 },
            { param: "mentalParam", weight: 1 },
            { param: "luck", weight: 1 },
        ],
        apCost: 1,
        staminaCost: BALANCE.activityStaminaCost.lesson,
        mentalCost: BALANCE.activityMentalCost,
    },
    lyricsLesson: {
        id: "lyricsLesson",
        label: "作曲講座（作詞）",
        target: "lyrics",
        targetWeight: 2,
        supportRolls: [
            { param: "mentalParam", weight: 3 },
            { param: "idea", weight: 1 },
            { param: "luck", weight: 1 },
        ],
        apCost: 1,
        staminaCost: BALANCE.activityStaminaCost.lesson,
        mentalCost: BALANCE.activityMentalCost,
    },
    compositionLesson: {
        id: "compositionLesson",
        label: "作曲講座（作曲）",
        target: "composition",
        targetWeight: 2,
        supportRolls: [
            { param: "mentalParam", weight: 3 },
            { param: "idea", weight: 1 },
            { param: "luck", weight: 1 },
        ],
        apCost: 1,
        staminaCost: BALANCE.activityStaminaCost.lesson,
        mentalCost: BALANCE.activityMentalCost,
    },
    editTechniqueLesson: {
        id: "editTechniqueLesson",
        label: "編集講座（技術）",
        target: "editTechnique",
        targetWeight: 2,
        supportRolls: [
            { param: "mentalParam", weight: 2 },
            { param: "idea", weight: 2 },
            { param: "luck", weight: 1 },
        ],
        apCost: 1,
        staminaCost: BALANCE.activityStaminaCost.lesson,
        mentalCost: BALANCE.activityMentalCost,
    },
    editCompositionLesson: {
        id: "editCompositionLesson",
        label: "編集講座（構成）",
        target: "editComposition",
        targetWeight: 2,
        supportRolls: [
            { param: "mentalParam", weight: 2 },
            { param: "idea", weight: 2 },
            { param: "luck", weight: 1 },
        ],
        apCost: 1,
        staminaCost: BALANCE.activityStaminaCost.lesson,
        mentalCost: BALANCE.activityMentalCost,
    },
    talkLesson: {
        id: "talkLesson",
        label: "話し方教室（トーク）",
        target: "talk",
        targetWeight: 2,
        supportRolls: [
            { param: "charm", weight: 2 },
            { param: "mentalParam", weight: 2 },
            { param: "luck", weight: 1 },
        ],
        apCost: 1,
        staminaCost: BALANCE.activityStaminaCost.lesson,
        mentalCost: BALANCE.activityMentalCost,
    },
    reactionLesson: {
        id: "reactionLesson",
        label: "話し方教室（リアクション）",
        target: "reaction",
        targetWeight: 2,
        supportRolls: [
            { param: "charm", weight: 2 },
            { param: "mentalParam", weight: 2 },
            { param: "luck", weight: 1 },
        ],
        apCost: 1,
        staminaCost: BALANCE.activityStaminaCost.lesson,
        mentalCost: BALANCE.activityMentalCost,
    },
    gym: {
        id: "gym",
        label: "ジム",
        target: "staminaParam",
        targetWeight: 4,
        supportRolls: GENERIC_SUPPORT,
        apCost: 1,
        staminaCost: BALANCE.activityStaminaCost.lesson,
        mentalCost: BALANCE.activityMentalCost,
    },
    gameLesson: {
        id: "gameLesson",
        label: "ゲーム練習",
        target: "gameSkill",
        targetWeight: 4,
        supportRolls: [
            { param: "staminaParam", weight: 1 },
            { param: "mentalParam", weight: 1 },
            { param: "luck", weight: 1 },
        ],
        apCost: 1,
        staminaCost: BALANCE.activityStaminaCost.lesson,
        mentalCost: BALANCE.activityMentalCost,
    },
    // ---- 経験系パラメータ向けの新設レッスン（実プレイフィードバックを受けて追加）----
    // ラック以外の5種（愛嬌/アイデア/カリスマ/交渉/メンタル）に専用レッスンを与え、
    // growth.tsのLESSON_BACKED_PARAMSへ移す（他アクションでの支援ロール成功時も活動経験値が確定加算されるようになる）
    makeupLesson: {
        id: "makeupLesson",
        label: "メイク",
        target: "charm",
        targetWeight: 4,
        supportRolls: GENERIC_SUPPORT,
        apCost: 1,
        staminaCost: BALANCE.activityStaminaCost.lesson,
        mentalCost: BALANCE.activityMentalCost,
    },
    studyLesson: {
        id: "studyLesson",
        label: "勉強会",
        target: "idea",
        targetWeight: 4,
        supportRolls: GENERIC_SUPPORT,
        apCost: 1,
        staminaCost: BALANCE.activityStaminaCost.lesson,
        mentalCost: BALANCE.activityMentalCost,
    },
    charismaLesson: {
        id: "charismaLesson",
        label: "カリスマ塾",
        target: "charisma",
        targetWeight: 4,
        supportRolls: GENERIC_SUPPORT,
        apCost: 1,
        staminaCost: BALANCE.activityStaminaCost.lesson,
        mentalCost: BALANCE.activityMentalCost,
    },
    negotiationLesson: {
        id: "negotiationLesson",
        label: "交渉術セミナー",
        target: "negotiation",
        targetWeight: 4,
        supportRolls: GENERIC_SUPPORT,
        apCost: 1,
        staminaCost: BALANCE.activityStaminaCost.lesson,
        mentalCost: BALANCE.activityMentalCost,
    },
    counselingLesson: {
        id: "counselingLesson",
        label: "カウンセリング",
        target: "mentalParam",
        targetWeight: 4,
        // 対象がmentalParam自身なのでGENERIC_SUPPORTのmentalParam枠をスタミナに差し替える
        supportRolls: [
            { param: "staminaParam", weight: 2 },
            { param: "luck", weight: 1 },
        ],
        apCost: 1,
        staminaCost: BALANCE.activityStaminaCost.lesson,
        mentalCost: BALANCE.activityMentalCost,
    },
};

/** レッスン費用（§3.1）: 対象パラメータの現在値×1.5G */
export function lessonCost(params: Params, targetParam: ParamKey): number {
    return params[targetParam] * BALANCE.lessonCostRate;
}

/**
 * スコア帯からレッスンの成長量を決定する（§3.1）。
 * 全アクション共通の判定エンジン（7点満点・スコア帯）を流用し、
 * 伝説回（クリティカル相当の大成功）は2倍、標準成功以上は+2.2、それ未満は最低保証+0.7とする
 */
export function lessonGainAmount(band: ScoreBand): number {
    if (band === "legendary") return BALANCE.lessonGainSuccess * BALANCE.lessonCritMultiplier;
    if (isSuccessBand(band)) return BALANCE.lessonGainSuccess;
    return BALANCE.lessonGainFail;
}

export type LessonExecution = {
    result: ActionResult;
    targetParam: ParamKey;
    /** 実行前に character.params から計算した費用。store側で資金から減算する */
    cost: number;
    staminaDelta: number;
    mentalDelta: number;
};

/**
 * レッスンを1回実行する（判定→対象パラメータ成長＋経験系パラメータの確率成長）。
 * 要求値はファン数に連動しない、各ロール自身のパラメータの現在値（−lessonRequirementBonus分の成功寄り補正）を使う。
 * 配信/制作と同じrequirement(fans)にすると、ファン数が伸びるほどレッスンも同時に成功率が床へ張り付き、
 * 要求値カーブへの追いつき手段が無くなる（バグ修正、詳細はbalance.tsのコメント参照）。
 * 対象パラメータだけでなく支援ロールも自分自身の値を要求値にするため、特化した対象パラメータに対して
 * 未投資の支援ロール（メンタル/ラック等）が置いていかれて5%floorに張り付く、ということが起きない
 */
export function executeLesson(
    lessonId: LessonId,
    character: Character,
    equipment: Equipment,
    rng: Rng
): LessonExecution {
    const def = LESSONS[lessonId];
    const targetParam = def.target;
    const cost = lessonCost(character.params, targetParam);
    const specs: RollSpec[] = [{ param: targetParam, weight: def.targetWeight }, ...def.supportRolls];
    const penalty = mentalPenalty(character.mental);

    const { outcomes, score } = resolveRolls(
        specs,
        character.params,
        (param) => character.params[param] - BALANCE.lessonRequirementBonus,
        character.params.luck,
        rng,
        penalty
    );
    const hasFumble = outcomes.some((outcome) => outcome.fumble);
    const { band, scoreCoef } = scoreBand(score, hasFumble);

    // 対象ロール以外（スタミナ/メンタル/ラック等の支援ロール）は活動経験値の対象になり得る
    const supportOutcomes = outcomes.filter((outcome) => outcome.param !== targetParam);
    // 練習環境（§12.1）: レッスン上昇量そのものを%ブースト（ロールの成功率ではなく成長量に効かせる）
    const targetGain = lessonGainAmount(band) * practiceEnvMultiplier(equipment.practiceEnv.level);
    const paramGains = mergeParamGains(
        { [targetParam]: targetGain },
        activityParamGains(supportOutcomes),
        experienceParamGains(outcomes, isSuccessBand(band), rng)
    );

    const mentalDelta = -def.mentalCost - (band === "accident" ? BALANCE.accidentMentalDamage : 0);

    const result: ActionResult = {
        actionId: lessonId,
        rolls: outcomes,
        score,
        band,
        scoreCoef,
        effects: { paramGains, mentalDelta },
    };

    return { result, targetParam, cost, staminaDelta: -def.staminaCost, mentalDelta };
}
