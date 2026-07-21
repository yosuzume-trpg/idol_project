// =============================================================
// 経済共通ヘルパー（§8） — 日次バッチや各種収益計算で共有する純粋関数
// =============================================================

import { BALANCE } from "./balance";

/** 飽和補正（§8.1）。ファン数が増えるほど新規流入効率が下がる */
export function saturation(fans: number): number {
    return 1 / (1 + fans / BALANCE.saturationScale);
}

/** ファン自然減衰（§8.4）。1日あたり0.15%減少する */
export function applyFanDecay(fans: number): number {
    return fans * (1 - BALANCE.dailyFanDecay);
}

/**
 * 要求値（配信/制作系、§8.4）。
 * fans=0だとlog10が発散するため、要求値算出に限りファン数を1以上として扱う
 * （成功率側もmax(requirement,100)クランプで吸収されるため、序盤の挙動は破綻しない）
 */
export function requirement(fans: number): number {
    return (
        BALANCE.requirementBase +
        Math.log10(Math.max(fans, 1) / BALANCE.requirementFanBase) * BALANCE.requirementLogSlope
    );
}

/** スタミナ上限（§2.2）。パラメータ「スタミナ」に連動して緩やかに成長する（マイルストーン6で確定） */
export function staminaMax(staminaParam: number): number {
    return BALANCE.staminaMaxBase + staminaParam * BALANCE.staminaMaxGrowthRate;
}
