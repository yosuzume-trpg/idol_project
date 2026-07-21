// =============================================================
// レッスン（§6.4） — 現在値に比例した費用で技術系パラメータを鍛える
// 経験系パラメータ（アイデア/カリスマ/愛嬌/交渉/メンタル/ラック）の確率成長は growth.ts で扱う
// =============================================================

import { BALANCE } from "./balance";
import { practiceEnvMultiplier } from "./equipment";
import { activityParamGains, experienceParamGains, mergeParamGains } from "./growth";
import { isSuccessBand, mentalPenalty, resolveRolls, scoreBand } from "./judge";
import type { ActionResult, Character, Equipment, ParamKey, Params, Rng, RollSpec, ScoreBand } from "./types";

export type LessonId =
    | "vocalLesson"
    | "danceLesson"
    | "compositionLesson"
    | "editLesson"
    | "speechLesson"
    | "gym"
    | "gameLesson";

export type LessonDef = {
    id: LessonId;
    label: string;
    /** 選択式の対象パラメータ（技術/表現など2択）。単一の場合は fixedTarget を使う */
    targetOptions?: readonly [ParamKey, ParamKey];
    fixedTarget?: ParamKey;
    targetWeight: number;
    /** 対象パラメータ以外の固定ロール */
    supportRolls: RollSpec[];
    apCost: number;
    staminaCost: number;
    mentalCost: number;
};

export const LESSONS: Record<LessonId, LessonDef> = {
    vocalLesson: {
        id: "vocalLesson",
        label: "ボーカルレッスン",
        targetOptions: ["vocalTechnique", "vocalExpression"],
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
    danceLesson: {
        id: "danceLesson",
        label: "ダンスレッスン",
        targetOptions: ["danceTechnique", "danceExpression"],
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
    compositionLesson: {
        id: "compositionLesson",
        label: "作曲講座",
        targetOptions: ["lyrics", "composition"],
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
    editLesson: {
        id: "editLesson",
        label: "編集講座",
        targetOptions: ["editTechnique", "editComposition"],
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
    speechLesson: {
        id: "speechLesson",
        label: "話し方教室",
        targetOptions: ["talk", "reaction"],
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
        fixedTarget: "staminaParam",
        targetWeight: 4,
        supportRolls: [
            { param: "mentalParam", weight: 2 },
            { param: "luck", weight: 1 },
        ],
        apCost: 1,
        staminaCost: BALANCE.activityStaminaCost.lesson,
        mentalCost: BALANCE.activityMentalCost,
    },
    gameLesson: {
        id: "gameLesson",
        label: "ゲーム練習",
        fixedTarget: "gameSkill",
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
};

/** レッスンの対象パラメータを決定する（選択式は引数target、固定式はfixedTargetを使用） */
export function lessonTarget(def: LessonDef, target?: ParamKey): ParamKey {
    if (def.fixedTarget) return def.fixedTarget;
    if (target && def.targetOptions?.includes(target)) return target;
    throw new Error(`レッスン「${def.label}」には対象パラメータの指定が必要です`);
}

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
    target: ParamKey | undefined,
    character: Character,
    equipment: Equipment,
    rng: Rng
): LessonExecution {
    const def = LESSONS[lessonId];
    const targetParam = lessonTarget(def, target);
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
