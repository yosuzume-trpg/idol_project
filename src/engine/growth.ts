// =============================================================
// 活動経験値（§3.1） — レッスンで鍛えられるパラメータは行動成功時にも副次的に成長する
// アイデア/カリスマ/愛嬌/交渉/メンタル/ラックは専用レッスンがなく確率成長のため対象外
// （成長確率は未確定＝残課題。レッスン実装時に別途扱う）
// =============================================================

import { BALANCE } from "./balance";
import type { Params, ParamKey, RollOutcome } from "./types";

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
]);

/** ロール結果から活動経験値によるパラメータ上昇分を集計する */
export function activityParamGains(outcomes: RollOutcome[]): Partial<Params> {
    const gains: Partial<Params> = {};
    for (const outcome of outcomes) {
        if (!outcome.success || !LESSON_BACKED_PARAMS.has(outcome.param)) continue;
        gains[outcome.param] = (gains[outcome.param] ?? 0) + BALANCE.activityGain;
    }
    return gains;
}
