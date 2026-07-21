// =============================================================
// 成長（§3.1） — 活動経験値（レッスン対応パラメータ）と経験系パラメータの確率成長
// 実プレイフィードバックを受け、愛嬌/アイデア/カリスマ/交渉/メンタルにも専用レッスンを新設した（lessons.ts参照）。
// 「専用レッスンがあるか」がLESSON_BACKED_PARAMS/EXPERIENCE_PARAMSの分類基準そのものなので、
// この5種はLESSON_BACKED_PARAMS側へ移動し、ラックのみ経験系（専用レッスンなし・確率成長）として残る
// =============================================================

import { BALANCE } from "./balance";
import type { Params, ParamKey, Rng, RollOutcome } from "./types";

/** 専用レッスンがあるパラメータ。行動成功時に活動経験値(activityGain)が確定で加算される */
export const LESSON_BACKED_PARAMS: ReadonlySet<ParamKey> = new Set([
    "vocalTechnique",
    "vocalExpression",
    "danceTechnique",
    "danceExpression",
    "editTechnique",
    "editComposition",
    "lyrics",
    "composition",
    "talk",
    "reaction",
    "staminaParam",
    "gameSkill",
    "charm",
    "idea",
    "charisma",
    "negotiation",
    "mentalParam",
]);

/** 専用レッスンがない経験系パラメータ。対応アクション成功時に確率で上昇する。ラックのみキャラメイクのダイスロールで決まる特別枠として残す */
export const EXPERIENCE_PARAMS: ReadonlySet<ParamKey> = new Set(["luck"]);

/** ロール結果から活動経験値（レッスン対応パラメータ、確定加算）によるパラメータ上昇分を集計する */
export function activityParamGains(outcomes: RollOutcome[]): Partial<Params> {
    const gains: Partial<Params> = {};
    for (const outcome of outcomes) {
        if (!outcome.success || !LESSON_BACKED_PARAMS.has(outcome.param)) continue;
        gains[outcome.param] = (gains[outcome.param] ?? 0) + BALANCE.activityGain;
    }
    return gains;
}

/**
 * 経験系パラメータ（アイデア/カリスマ/愛嬌/交渉/メンタル/ラック）の確率成長（§3.1）。
 * §3.1の文言は「対応"アクション"成功時に確率で上昇」であり「ロール成功時」ではない。
 * そのロール自身の成否ではなく、行動全体のスコア帯が標準成功以上かどうかだけで判定する
 * （バグ修正: ロール成功を条件にすると、専用レッスンを持たないこれらのパラメータは
 * 一度requirementに置いていかれると自力では二度と追いつけない詰み状態になっていた。
 * ファンブルしたロールだけは経験にならないので除外する）
 */
export function experienceParamGains(outcomes: RollOutcome[], isSuccessBand: boolean, rng: Rng): Partial<Params> {
    if (!isSuccessBand) return {};
    const gains: Partial<Params> = {};
    for (const outcome of outcomes) {
        if (outcome.fumble || !EXPERIENCE_PARAMS.has(outcome.param)) continue;
        if (rng.random() < BALANCE.experienceGrowthChance) {
            gains[outcome.param] = (gains[outcome.param] ?? 0) + BALANCE.activityGain;
        }
    }
    return gains;
}

/** 複数のパラメータ上昇分をマージして合算する */
export function mergeParamGains(...sources: Partial<Params>[]): Partial<Params> {
    const merged: Partial<Params> = {};
    for (const source of sources) {
        for (const key of Object.keys(source) as ParamKey[]) {
            merged[key] = (merged[key] ?? 0) + (source[key] ?? 0);
        }
    }
    return merged;
}
