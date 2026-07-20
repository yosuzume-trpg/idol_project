// =============================================================
// 判定エンジン（§5） — ロール判定・スコア集計・結果テーブル
// 純粋関数のみ。React/DOM/Zustand非依存
// =============================================================

import { BALANCE } from "./balance";
import type { Params, Rng, RollOutcome, RollSpec, ScoreBand } from "./types";

/** 成功率（%）を算出する（§5.2）。penaltyはメンタル低下修正など（負の値）。5〜95にクランプ */
export function successRate(effectiveValue: number, requirement: number, penalty = 0): number {
    const denominator = Math.max(requirement, BALANCE.requirementFloor);
    const raw = BALANCE.successBase + ((effectiveValue - requirement) / denominator) * 100 + penalty;
    const [min, max] = BALANCE.successClamp;
    return Math.min(max, Math.max(min, raw));
}

/** メンタル低下時の全判定マイナス修正（§2.2）。メンタルは0〜mentalMax固定スケール */
export function mentalPenalty(mental: number): number {
    return mental / BALANCE.mentalMax < BALANCE.lowMentalThreshold ? BALANCE.lowMentalPenalty : 0;
}

/** クリティカル閾値（01〜05＋ラック域拡張、§5.3） */
export function criticalThreshold(luck: number): number {
    const luckBonus = Math.min(BALANCE.criticalLuckCap, luck / BALANCE.criticalLuckDivisor);
    return BALANCE.criticalBase + luckBonus;
}

/** d100の出目からクリティカルを判定する */
export function isCritical(die: number, luck: number): boolean {
    return die <= criticalThreshold(luck);
}

/** d100の出目からファンブルを判定する（97〜00） */
export function isFumble(die: number): boolean {
    return die >= BALANCE.fumbleFrom;
}

/**
 * 単一ロールを解決する。
 * クリティカルは自動成功、ファンブルは自動失敗として扱う（CoC系ルール踏襲）
 */
export function resolveRoll(
    spec: RollSpec,
    effectiveValue: number,
    requirement: number,
    luck: number,
    rng: Rng,
    penalty = 0
): RollOutcome {
    const die = rng.d100();
    const critical = isCritical(die, luck);
    const fumble = !critical && isFumble(die);
    const rate = successRate(effectiveValue, requirement, penalty);
    const success = critical || (!fumble && die <= rate);

    return { param: spec.param, weight: spec.weight, die, success, critical, fumble };
}

/** 1ロールのスコア寄与（クリティカルは重み2倍、ファンブルは重みマイナス、通常失敗は0） */
export function rollScoreContribution(outcome: RollOutcome): number {
    if (outcome.critical) return outcome.weight * 2;
    if (outcome.fumble) return -outcome.weight;
    return outcome.success ? outcome.weight : 0;
}

/** ロール構成をまとめて解決し、合計スコアを算出する */
export function resolveRolls(
    specs: RollSpec[],
    effectiveValues: Partial<Params>,
    requirement: number,
    luck: number,
    rng: Rng,
    penalty = 0
): { outcomes: RollOutcome[]; score: number } {
    const outcomes = specs.map((spec) =>
        resolveRoll(spec, effectiveValues[spec.param] ?? 0, requirement, luck, rng, penalty)
    );
    const score = outcomes.reduce((sum, outcome) => sum + rollScoreContribution(outcome), 0);
    return { outcomes, score };
}

/**
 * スコアから結果テーブルを引く（§5.4）。
 * ファンブルを含みスコア3未満の場合は事故（小炎上）として扱う
 */
export function scoreBand(score: number, hasFumble: boolean): { band: ScoreBand; scoreCoef: number } {
    if (hasFumble && score < 3) {
        return { band: "accident", scoreCoef: BALANCE.accidentCoef };
    }
    // scoreTableの最終行は min: -Infinity のため必ずいずれかにヒットする
    const entry = BALANCE.scoreTable.find((row) => score >= row.min)!;
    return { band: entry.band, scoreCoef: entry.coef };
}
